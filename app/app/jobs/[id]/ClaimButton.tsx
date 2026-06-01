"use client";

import { useEffect, useState } from "react";
import { useWaitForTransactionReceipt, useWriteContract } from "wagmi";
import type { Address, Hex } from "viem";

import { escrowAbi } from "@/lib/contracts";
import { isUserRejection } from "@/lib/auspex";

export function ClaimButton({
  escrow,
  verdict,
  onClaimed,
}: {
  escrow: Address;
  verdict: string;
  /** Called with the success message once the claim tx is mined. */
  onClaimed: (message: string) => void;
}) {
  const isRefund = verdict === "refunded";
  const label = isRefund ? "Claim refund" : "Claim payout";

  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
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
      onClaimed(isRefund ? "Refund claimed." : "Payout claimed.");
    } else {
      setError("Transaction reverted on-chain.");
      setPending(false);
      setTxHash(undefined);
    }
  }, [receipt, isError, txHash, isRefund, onClaimed]);
  /* eslint-enable react-hooks/set-state-in-effect */

  async function onClick() {
    setError(null);
    setPending(true);
    try {
      const hash = await writeContractAsync({
        address: escrow,
        abi: escrowAbi,
        functionName: "claim",
      });
      setTxHash(hash);
    } catch (err) {
      setError(isUserRejection(err) ? "Wallet rejected the transaction." : "Claim failed. Try again.");
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={onClick}
        disabled={pending}
        className="inline-flex items-center justify-center gap-2 rounded-md bg-accent px-4 py-2 text-sm font-medium text-white transition hover:bg-accent-light disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending && (
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
        )}
        {pending ? "Claiming…" : `${label} ▶`}
      </button>
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  );
}
