"use client";

import { useEffect, useState } from "react";
import { useWaitForTransactionReceipt, useWriteContract } from "wagmi";
import type { Address, Hex } from "viem";

import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { escrowAbi } from "@/lib/contracts";
import { isUserRejection } from "@/lib/auspex";

function isHttpUrl(value: string): boolean {
  try {
    const u = new URL(value);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

export function SubmitDeliveryModal({
  open,
  escrow,
  onClose,
  onSubmitted,
}: {
  open: boolean;
  escrow: Address;
  onClose: () => void;
  /** Called once the delivery tx is mined — parent refetches + shows the banner. */
  onSubmitted: () => void;
}) {
  const [url, setUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [txHash, setTxHash] = useState<Hex | undefined>();

  const { writeContractAsync } = useWriteContract();
  const { data: receipt, isError } = useWaitForTransactionReceipt({
    hash: txHash,
    query: { enabled: Boolean(txHash) },
  });

  // Reacts to async receipt arrival — the intended use of an effect.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!txHash) return;
    if (isError) {
      setError("Couldn't confirm the transaction.");
      setPending(false);
      setTxHash(undefined);
      return;
    }
    if (!receipt) return;
    if (receipt.status === "success") {
      onSubmitted();
    } else {
      setError("Transaction reverted on-chain.");
      setPending(false);
      setTxHash(undefined);
    }
  }, [receipt, isError, txHash, onSubmitted]);
  /* eslint-enable react-hooks/set-state-in-effect */

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isHttpUrl(url)) {
      setError("Enter a valid http(s) URL");
      return;
    }
    setError(null);
    setPending(true);
    try {
      const hash = await writeContractAsync({
        address: escrow,
        abi: escrowAbi,
        functionName: "submitDelivery",
        args: [url],
      });
      setTxHash(hash);
    } catch (err) {
      setError(isUserRejection(err) ? "Wallet rejected the transaction." : "Submit failed. Try again.");
      setPending(false);
    }
  }

  return (
    <Dialog open={open} onClose={pending ? () => {} : onClose} title="Submit delivery">
      <form onSubmit={onSubmit} noValidate className="space-y-4">
        <div>
          <Label htmlFor="delivery-url">Delivery URL</Label>
          <Input
            id="delivery-url"
            placeholder="https://…"
            value={url}
            disabled={pending}
            spellCheck={false}
            autoFocus
            onChange={(e) => setUrl(e.target.value.trim())}
          />
          {error && <p className="mt-1 text-xs text-danger">{error}</p>}
        </div>

        <p className="text-xs text-text-muted">
          Resolution fires once a keeper triggers it — 3 agent calls (~0.36 STT) run against your URL.
        </p>

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={pending}
            className="rounded-md border border-border-strong px-3.5 py-2 text-sm font-medium text-text-secondary transition hover:bg-surface-hi disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={pending}
            className="inline-flex items-center justify-center gap-2 rounded-md bg-accent px-3.5 py-2 text-sm font-medium text-white transition hover:bg-accent-light disabled:cursor-not-allowed disabled:opacity-60"
          >
            {pending && (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
            )}
            {pending ? "Submitting…" : "Submit"}
          </button>
        </div>
      </form>
    </Dialog>
  );
}
