"use client";

import { useState } from "react";
import Link from "next/link";
import { isAddress } from "viem";
import type { Address } from "viem";
import { useAccount, usePublicClient } from "wagmi";
import { useQuery } from "@tanstack/react-query";

import { AgentChip } from "@/components/AgentChip";
import { DeliveryPreview } from "@/components/DeliveryPreview";
import { ReasoningTrace } from "@/components/ReasoningTrace";
import { StatusPill } from "@/components/StatusPill";
import { Skeleton } from "@/components/ui/skeleton";
import {
  EscrowState,
  buildReasoningSteps,
  formatAmount,
  formatRelativeTime,
  readEscrowState,
  toStatus,
} from "@/lib/auspex";
import { fetchBriefByURI } from "@/lib/briefs";
import { fetchJobMeta } from "@/lib/explorer";
import { SubmitDeliveryModal } from "./SubmitDeliveryModal";
import { ClaimButton } from "./ClaimButton";

type Banner = { kind: "success" | "error"; message: string };

function shortHash(hash: string): string {
  return hash.length > 12 ? `${hash.slice(0, 6)}…${hash.slice(-4)}` : hash;
}

export function JobDetail({ id }: { id: string }) {
  const publicClient = usePublicClient();
  const { address } = useAccount();
  const valid = isAddress(id);
  const escrow = id as Address;

  const [modalOpen, setModalOpen] = useState(false);
  const [banner, setBanner] = useState<Banner | null>(null);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["job", id],
    enabled: valid && Boolean(publicClient),
    refetchInterval: 5000, // pick up state/verdict flips while judging
    queryFn: async () => {
      const snap = await readEscrowState(publicClient!, escrow);
      const [brief, meta] = await Promise.all([
        fetchBriefByURI(snap.briefURI),
        fetchJobMeta().catch(() => new Map()),
      ]);
      const m = meta.get(escrow.toLowerCase());
      const nowSec = Math.floor(Date.now() / 1000);
      return {
        snap,
        brief,
        amount: m ? formatAmount(m.amount) : "—",
        timestamp: m ? formatRelativeTime(m.timestamp, nowSec) : "",
      };
    },
  });

  if (!valid || isError) return <NotFound />;
  if (isLoading || !data) return <DetailSkeleton />;

  const { snap, brief, amount, timestamp } = data;
  const status = toStatus(snap.state, snap.verdict);
  const steps = buildReasoningSteps(snap.state, snap.verdict, snap.reasoning);

  const me = address?.toLowerCase();
  const isDeliverer = Boolean(me) && me === snap.deliverer.toLowerCase();
  const isClient = Boolean(me) && me === snap.client.toLowerCase();

  const canSubmit = snap.state === EscrowState.Open && isDeliverer;
  const canClaim =
    snap.state === EscrowState.Resolved &&
    ((snap.verdict === "released" && isDeliverer) || (snap.verdict === "refunded" && isClient));
  const hasDelivery = snap.state >= EscrowState.Delivered && Boolean(snap.deliveryUrl);

  const title = brief.length > 80 ? `${brief.slice(0, 80)}…` : brief;

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:px-6">
      <Link href="/jobs" className="text-sm text-text-secondary transition hover:text-text-primary">
        ← Jobs
      </Link>

      <h1 className="mt-4 text-xl font-semibold tracking-tight text-text-primary">{title}</h1>

      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-text-secondary">
        <span className="text-text-primary">{amount} locked</span>
        <span className="text-text-muted">·</span>
        <AgentChip address={snap.client} />
        <span className="text-text-muted">→</span>
        <AgentChip address={snap.deliverer} />
        {timestamp && (
          <>
            <span className="text-text-muted">·</span>
            <span className="text-text-muted">{timestamp}</span>
          </>
        )}
      </div>

      <div className="mt-5 flex items-center justify-between gap-4">
        <StatusPill status={status} />
        {canClaim && (
          <ClaimButton
            escrow={escrow}
            verdict={snap.verdict}
            onClaimed={(message) => {
              setBanner({ kind: "success", message });
              refetch();
            }}
          />
        )}
      </div>

      {banner && (
        <div
          role="status"
          aria-live="polite"
          className={`mt-4 rounded-md border px-4 py-3 text-sm ${
            banner.kind === "success"
              ? "border-success/30 bg-success/10 text-success"
              : "border-danger/30 bg-danger/10 text-danger"
          }`}
        >
          {banner.message}
        </div>
      )}

      <div className="mt-6 grid grid-cols-1 gap-px overflow-hidden rounded-xl border border-border bg-border lg:grid-cols-2">
        {/* LEFT — brief + delivery */}
        <div className="space-y-6 bg-surface p-5">
          <section>
            <PanelHeading>Brief</PanelHeading>
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-text-primary">{brief}</p>
            <div className="mt-3 space-y-0.5 text-xs text-text-muted">
              <p>
                Posted by <span className="font-mono">{shortHash(snap.client)}</span>
                {timestamp ? ` · ${timestamp}` : ""}
              </p>
              <p>
                Hash: <span className="font-mono">{shortHash(snap.briefHash)}</span>
              </p>
            </div>
          </section>

          <section>
            <PanelHeading>Delivered URL</PanelHeading>
            {hasDelivery ? (
              <DeliveryPreview url={snap.deliveryUrl} />
            ) : canSubmit ? (
              <div className="flex flex-col items-start gap-3 rounded-lg border border-border bg-surface-hi p-5">
                <p className="text-sm text-text-secondary">
                  You&apos;re the deliverer. Submit the URL that fulfils this brief.
                </p>
                <button
                  type="button"
                  onClick={() => setModalOpen(true)}
                  className="rounded-md bg-accent px-3.5 py-2 text-sm font-medium text-white transition hover:bg-accent-light"
                >
                  Submit delivery
                </button>
              </div>
            ) : (
              <div className="flex h-24 items-center justify-center rounded-lg border border-border bg-surface text-sm text-text-muted">
                No delivery yet.
              </div>
            )}
          </section>
        </div>

        {/* RIGHT — reasoning */}
        <div className="bg-surface p-5">
          <PanelHeading>Reasoning</PanelHeading>
          {steps.length === 0 ? (
            <p className="text-sm text-text-muted">Awaiting delivery before judging.</p>
          ) : (
            <ReasoningTrace steps={steps} />
          )}
        </div>
      </div>

      <SubmitDeliveryModal
        open={modalOpen}
        escrow={escrow}
        onClose={() => setModalOpen(false)}
        onSubmitted={() => {
          setModalOpen(false);
          setBanner({ kind: "success", message: "Delivery submitted — judging now." });
          refetch();
        }}
      />
    </main>
  );
}

function PanelHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mb-3 border-b border-border pb-2 text-xs font-semibold uppercase tracking-[0.08em] text-text-muted">
      {children}
    </h2>
  );
}

function NotFound() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 items-center justify-center px-4 py-20">
      <div className="flex flex-col items-center gap-4 rounded-xl border border-border bg-surface px-8 py-12 text-center">
        <h1 className="text-lg font-semibold text-text-primary">Job not found</h1>
        <p className="max-w-sm text-sm text-text-secondary">
          No escrow lives at this address on Somnia Shannon.
        </p>
        <Link
          href="/jobs"
          className="rounded-md bg-accent px-3.5 py-2 text-sm font-medium text-white transition hover:bg-accent-light"
        >
          Back to feed
        </Link>
      </div>
    </main>
  );
}

function DetailSkeleton() {
  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:px-6">
      <Skeleton className="h-4 w-16" />
      <Skeleton className="mt-4 h-6 w-2/3" />
      <Skeleton className="mt-3 h-4 w-1/2" />
      <Skeleton className="mt-5 h-6 w-28" />
      <div className="mt-6 grid grid-cols-1 gap-px overflow-hidden rounded-xl border border-border bg-border lg:grid-cols-2">
        <div className="space-y-6 bg-surface p-5">
          <div>
            <Skeleton className="h-3 w-16" />
            <Skeleton className="mt-3 h-20 w-full" />
          </div>
          <div>
            <Skeleton className="h-3 w-24" />
            <Skeleton className="mt-3 h-24 w-full" />
          </div>
        </div>
        <div className="bg-surface p-5">
          <Skeleton className="h-3 w-20" />
          <div className="mt-4 space-y-4">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        </div>
      </div>
    </main>
  );
}
