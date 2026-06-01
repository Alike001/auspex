"use client";

import Link from "next/link";
import { useAccount, usePublicClient, useWatchContractEvent } from "wagmi";
import { useQuery } from "@tanstack/react-query";
import type { Address } from "viem";

import { JobCard, JobsEmpty } from "@/components/JobCard";
import { Skeleton } from "@/components/ui/skeleton";
import type { Status } from "@/components/StatusPill";
import {
  ESCROW_FACTORY_ADDRESS,
  escrowAbi,
  escrowFactoryAbi,
} from "@/lib/contracts";
import { decodeBrief, formatAmount, formatRelativeTime, toStatus } from "@/lib/auspex";
import { fetchJobMeta } from "@/lib/explorer";

type JobRow = {
  id: Address;
  brief: string;
  status: Status;
  client: Address;
  freelancer: Address;
  amount: string;
  timestamp: string;
  sortKey: number;
};

export function JobsFeed() {
  const publicClient = usePublicClient();
  const { isConnected } = useAccount();

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["jobs", ESCROW_FACTORY_ADDRESS],
    enabled: Boolean(publicClient),
    refetchInterval: 5000, // pick up state/verdict flips (Delivered → Resolved → Claimed)
    queryFn: async (): Promise<JobRow[]> => {
      const client = publicClient!;

      // 1. Canonical job list (single RPC call, no range limits).
      const addresses = (await client.readContract({
        address: ESCROW_FACTORY_ADDRESS,
        abi: escrowFactoryAbi,
        functionName: "allJobs",
      })) as Address[];

      if (addresses.length === 0) return [];

      // 2. Best-effort enrichment: amount + creation time from the explorer.
      const meta = await fetchJobMeta().catch(() => new Map());
      const nowSec = Math.floor(Date.now() / 1000);

      // 3. Live per-escrow reads for the fields that change over a job's life.
      const rows = await Promise.all(
        addresses.map(async (addr): Promise<JobRow> => {
          const read = (
            functionName: "client" | "deliverer" | "state" | "verdict" | "briefURI",
          ) => client.readContract({ address: addr, abi: escrowAbi, functionName });

          const [clientAddr, deliverer, state, verdict, briefURI] = await Promise.all([
            read("client"),
            read("deliverer"),
            read("state"),
            read("verdict"),
            read("briefURI"),
          ]);

          const m = meta.get(addr.toLowerCase());
          return {
            id: addr,
            brief: decodeBrief(briefURI as string),
            status: toStatus(Number(state), verdict as string),
            client: clientAddr as Address,
            freelancer: deliverer as Address,
            amount: m ? formatAmount(m.amount) : "—",
            timestamp: m ? formatRelativeTime(m.timestamp, nowSec) : "",
            sortKey: m?.timestamp ?? 0,
          };
        }),
      );

      // Newest first.
      return rows.sort((a, b) => b.sortKey - a.sortKey);
    },
  });

  // A new job posted on-chain re-runs the query, sliding the card into the top.
  useWatchContractEvent({
    address: ESCROW_FACTORY_ADDRESS,
    abi: escrowFactoryAbi,
    eventName: "JobCreated",
    onLogs: () => refetch(),
  });

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10 sm:px-6">
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-text-primary">
            Jobs
          </h1>
          <p className="mt-1 text-sm text-text-secondary">
            Escrowed work, judged on-chain by composed Somnia agents.
          </p>
        </div>

        {isConnected ? (
          <Link
            href="/jobs/new"
            className="shrink-0 rounded-md bg-accent px-3.5 py-2 text-sm font-medium text-white transition hover:bg-accent-light"
          >
            + Post a job
          </Link>
        ) : (
          <button
            type="button"
            disabled
            title="Connect wallet to post"
            className="shrink-0 cursor-not-allowed rounded-md border border-border-strong px-3.5 py-2 text-sm font-medium text-text-muted opacity-60"
          >
            + Post a job
          </button>
        )}
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-surface">
        {isLoading ? (
          <FeedSkeleton />
        ) : isError ? (
          <FeedError onRetry={() => refetch()} />
        ) : !data || data.length === 0 ? (
          <div className="p-5">
            <JobsEmpty />
          </div>
        ) : (
          data.map((job) => (
            <JobCard
              key={job.id}
              id={job.id}
              brief={job.brief}
              status={job.status}
              client={{ address: job.client }}
              freelancer={{ address: job.freelancer }}
              amount={job.amount}
              timestamp={job.timestamp}
            />
          ))
        )}
      </div>
    </main>
  );
}

function FeedSkeleton() {
  return (
    <div>
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex items-start gap-4 border-b border-border px-5 py-4">
          <Skeleton className="mt-1.5 h-2 w-2 shrink-0" />
          <div className="min-w-0 flex-1">
            <Skeleton className="h-4 w-2/3" />
            <div className="mt-2 flex items-center gap-2">
              <Skeleton className="h-5 w-24" />
              <Skeleton className="h-5 w-24" />
              <Skeleton className="h-5 w-16" />
            </div>
          </div>
          <Skeleton className="h-4 w-16 shrink-0" />
        </div>
      ))}
    </div>
  );
}

function FeedError({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center gap-3 p-10 text-center">
      <p className="text-sm text-text-secondary">
        Couldn&apos;t reach the chain. Check your connection and retry.
      </p>
      <button
        type="button"
        onClick={onRetry}
        className="rounded-md border border-border-strong px-3 py-1.5 text-xs font-medium text-text-secondary transition hover:bg-surface-hi"
      >
        Retry
      </button>
    </div>
  );
}
