"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import {
  useAccount,
  useBalance,
  useWaitForTransactionReceipt,
  useWriteContract,
} from "wagmi";
import { formatEther, isAddress, parseEther, parseEventLogs } from "viem";
import type { Address, Hex } from "viem";

import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ESCROW_FACTORY_ADDRESS, escrowFactoryAbi } from "@/lib/contracts";
import { isUserRejection } from "@/lib/auspex";
import { BRIEF_MAX_CHARS, validateBrief } from "@/lib/briefs";

/** Resolution costs 3 × 0.12 STT, pulled from the escrow balance by Escrow.resolve().
 *  We add it on top of the payout so the winner can still claim the full amount. */
const RESOLUTION_FEE_WEI = parseEther("1.5");
const RESOLUTION_FEE_LABEL = "1.5 STT (3 × 0.5)";

type Phase = "idle" | "submitting" | "mining";
type Banner = { kind: "error" | "success"; message: string };
type Errors = Partial<Record<"brief" | "deliverer" | "amount" | "deadline", string>>;

/** "0x…ab12" — the short brief-hash shown on success. */
function shortHash(hash: Hex | null): string {
  return hash ? `0x…${hash.slice(-4)}` : "0x…";
}

export function PostJobForm() {
  const router = useRouter();
  const { address, isConnected } = useAccount();
  const { data: balance } = useBalance({ address });
  const { writeContractAsync } = useWriteContract();

  const [brief, setBrief] = useState("");
  const [deliverer, setDeliverer] = useState("");
  const [amount, setAmount] = useState("");
  const [deadline, setDeadline] = useState("");

  const [errors, setErrors] = useState<Errors>({});
  const [phase, setPhase] = useState<Phase>("idle");
  const [banner, setBanner] = useState<Banner | null>(null);
  const [txHash, setTxHash] = useState<Hex | undefined>();
  const [briefHash, setBriefHash] = useState<Hex | null>(null);

  const { data: receipt, isError: receiptError } = useWaitForTransactionReceipt({
    hash: txHash,
    query: { enabled: Boolean(txHash) },
  });

  // Once the tx is mined, pull the new escrow address out of JobCreated and redirect.
  // The setState calls here react to async receipt arrival (external wagmi state),
  // which is the intended use of an effect — not derivable during render.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (phase !== "mining") return;
    if (receiptError) {
      setBanner({ kind: "error", message: "Couldn't confirm the transaction. Check the Jobs feed." });
      setPhase("idle");
      return;
    }
    if (!receipt) return;
    if (receipt.status !== "success") {
      setBanner({ kind: "error", message: "Transaction reverted on-chain." });
      setPhase("idle");
      return;
    }
    try {
      const logs = parseEventLogs({
        abi: escrowFactoryAbi,
        eventName: "JobCreated",
        logs: receipt.logs,
      });
      const escrow = (logs[0]?.args as { escrow?: Address } | undefined)?.escrow;
      if (!escrow) throw new Error("no escrow in receipt");
      setBanner({
        kind: "success",
        message: `Job posted. Brief hash ${shortHash(briefHash)}. Awaiting delivery.`,
      });
      router.push(`/jobs/${escrow}`);
    } catch {
      setBanner({ kind: "error", message: "Job posted, but couldn't read the new address. Check the Jobs feed." });
      setPhase("idle");
    }
  }, [phase, receipt, receiptError, briefHash, router]);
  /* eslint-enable react-hooks/set-state-in-effect */

  function validate(): Errors {
    const next: Errors = {};

    const briefErr = validateBrief(brief);
    if (briefErr) next.brief = briefErr;

    if (!isAddress(deliverer)) next.deliverer = "Invalid address";
    else if (address && deliverer.toLowerCase() === address.toLowerCase()) {
      next.deliverer = "Deliverer can't be your own address";
    }

    const amt = Number(amount);
    if (!amount || Number.isNaN(amt) || amt <= 0) {
      next.amount = "Amount must be greater than 0";
    } else if (balance) {
      const needed = parseEther(amount) + RESOLUTION_FEE_WEI;
      if (needed > balance.value) {
        next.amount = "Amount + 1.5 STT resolution exceeds your balance";
      }
    }

    if (!deadline) next.deadline = "Pick a deadline";
    else if (new Date(deadline).getTime() <= Date.now()) {
      next.deadline = "Deadline must be in the future";
    }

    return next;
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setPhase("submitting");
    setBanner(null);

    try {
      // 1. Turn the brief into its on-chain (uri, hash) pair.
      const res = await fetch("/api/briefs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: brief }),
      });
      if (!res.ok) {
        const { error } = await res.json().catch(() => ({ error: "Brief upload failed" }));
        throw new Error(error ?? "Brief upload failed");
      }
      const { uri, hash } = (await res.json()) as { uri: string; hash: Hex };

      // 2. Lock payout + resolution budget into a fresh escrow.
      const value = parseEther(amount) + RESOLUTION_FEE_WEI;
      const deadlineUnix = BigInt(Math.floor(new Date(deadline).getTime() / 1000));

      const hashTx = await writeContractAsync({
        address: ESCROW_FACTORY_ADDRESS,
        abi: escrowFactoryAbi,
        functionName: "createJob",
        args: [hash, uri, deliverer as Address, deadlineUnix],
        value,
      });

      setBriefHash(hash);
      setTxHash(hashTx);
      setPhase("mining");
    } catch (err) {
      setBanner({
        kind: "error",
        message: isUserRejection(err)
          ? "Wallet rejected the transaction."
          : err instanceof Error && err.message
            ? err.message
            : "Something went wrong. Please try again.",
      });
      setPhase("idle"); // form stays populated
    }
  }

  // ── wallet gate ──
  if (!isConnected) {
    return (
      <main className="mx-auto flex w-full max-w-3xl flex-1 items-center justify-center px-4 py-20">
        <div className="flex flex-col items-center gap-4 rounded-xl border border-border bg-surface px-8 py-12 text-center">
          <h1 className="text-lg font-semibold text-text-primary">
            Connect your wallet to post a job
          </h1>
          <p className="max-w-sm text-sm text-text-secondary">
            Posting locks STT into a fresh on-chain escrow, so you&apos;ll need a connected wallet on Somnia Shannon.
          </p>
          <ConnectButton />
        </div>
      </main>
    );
  }

  const busy = phase !== "idle";
  const lockedDisplay = amount && Number(amount) > 0 ? Number(amount).toFixed(2) : "0.00";

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-10 sm:px-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-text-primary">Post a job</h1>
        <p className="mt-1 text-sm text-text-secondary">
          Lock STT into escrow. A Somnia agent judges the delivery and releases funds.
        </p>
      </div>

      {banner && (
        <div
          role="status"
          aria-live="polite"
          className={`mb-5 rounded-md border px-4 py-3 text-sm ${
            banner.kind === "success"
              ? "border-success/30 bg-success/10 text-success"
              : "border-danger/30 bg-danger/10 text-danger"
          }`}
        >
          {banner.message}
        </div>
      )}

      <form onSubmit={onSubmit} noValidate className="space-y-5">
        <div>
          <Label htmlFor="brief">Brief</Label>
          <Textarea
            id="brief"
            rows={5}
            placeholder="Describe the deliverable precisely — the agent judges against exactly what you write here."
            value={brief}
            maxLength={BRIEF_MAX_CHARS}
            disabled={busy}
            onChange={(e) => setBrief(e.target.value)}
          />
          <div className="mt-1 flex items-center justify-between">
            <span className="text-xs text-danger">{errors.brief ?? ""}</span>
            <span className="text-xs text-text-muted">
              {brief.length}/{BRIEF_MAX_CHARS}
            </span>
          </div>
        </div>

        <div>
          <Label htmlFor="deliverer">Deliverer wallet</Label>
          <Input
            id="deliverer"
            placeholder="0x…"
            value={deliverer}
            disabled={busy}
            spellCheck={false}
            onChange={(e) => setDeliverer(e.target.value.trim())}
          />
          {errors.deliverer && <p className="mt-1 text-xs text-danger">{errors.deliverer}</p>}
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <div>
            <Label htmlFor="amount">Amount (STT)</Label>
            <Input
              id="amount"
              type="number"
              inputMode="decimal"
              min="0"
              step="0.01"
              placeholder="5.00"
              value={amount}
              disabled={busy}
              onChange={(e) => setAmount(e.target.value)}
            />
            {errors.amount && <p className="mt-1 text-xs text-danger">{errors.amount}</p>}
          </div>

          <div>
            <Label htmlFor="deadline">Deadline</Label>
            <Input
              id="deadline"
              type="datetime-local"
              value={deadline}
              disabled={busy}
              onChange={(e) => setDeadline(e.target.value)}
            />
            {errors.deadline && <p className="mt-1 text-xs text-danger">{errors.deadline}</p>}
          </div>
        </div>

        <div className="rounded-md border border-border bg-surface-hi px-4 py-3 text-sm text-text-secondary">
          <span className="text-text-primary">Total locked: {lockedDisplay} STT</span>
          {" · "}
          Resolution budget: {RESOLUTION_FEE_LABEL}
          <p className="mt-1 text-xs text-text-muted">
            Your wallet sends {(Number(lockedDisplay) + 1.5).toFixed(2)} STT in total
            {balance ? ` · balance ${Number(formatEther(balance.value)).toFixed(2)} ${balance.symbol}` : ""}.
          </p>
        </div>

        <button
          type="submit"
          disabled={busy}
          className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-accent px-4 py-2.5 text-sm font-medium text-white transition hover:bg-accent-light disabled:cursor-not-allowed disabled:opacity-60"
        >
          {busy && (
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
          )}
          {busy ? "Posting…" : "Post job"}
        </button>
      </form>
    </main>
  );
}
