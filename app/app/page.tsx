import Link from "next/link";
import { TraceTimeline } from "@/components/TraceTimeline";
import type { TraceNode } from "@/components/TraceTimeline.types";

// The same three-step pipeline the resolver runs, shown complete on the landing.
const PIPELINE: TraceNode[] = [
  { step: "json-api", status: "success" },
  { step: "parse-website", status: "success" },
  { step: "llm-judge", status: "success" },
];

const STEPS = [
  {
    n: "01",
    title: "Client posts a job",
    body: "Locks STT in an escrow naming the deliverer and a plain-text brief — the spec the work is judged against.",
  },
  {
    n: "02",
    title: "Freelancer delivers",
    body: "Submits a public URL on-chain. No invoices, no middleman — the escrow holds the payment until the work is judged.",
  },
  {
    n: "03",
    title: "Agents judge, validators sign",
    body: "Three composed Somnia agents score the delivery against the brief. The verdict releases or refunds in the same block, reasoning emitted on-chain.",
  },
];

export default function Home() {
  return (
    <main className="relative flex flex-1 flex-col">
      {/* Hero */}
      <section className="relative flex flex-col items-center overflow-hidden px-6 pb-20 pt-24 text-center sm:pt-32">
        <div className="grid-bg pointer-events-none absolute inset-0" />

        <div className="relative flex flex-col items-center">
          <span className="mb-7 flex h-10 w-10 items-center justify-center rounded-lg bg-linear-to-br from-accent-light to-accent text-lg font-bold text-white">
            A
          </span>

          <div className="mb-5 flex items-center gap-2 text-[11px] uppercase tracking-[0.14em] text-text-muted">
            <span className="text-accent-light">Somnia Shannon</span>
            <span>·</span>
            <span>Agentathon 2026</span>
          </div>

          <h1 className="max-w-xl text-4xl font-bold leading-tight tracking-tight sm:text-5xl">
            Agent-arbitrated <span className="grad">escrow</span>, on-chain.
          </h1>

          <p className="mt-5 max-w-md text-[15px] leading-relaxed text-text-secondary">
            Clients lock STT, freelancers deliver a URL, and three composed
            on-chain agents judge the work. Validators sign the verdict.
          </p>

          <div className="mt-8 flex items-center gap-3">
            <Link
              href="/jobs"
              className="rounded-md bg-accent px-4 py-2.5 text-sm font-medium text-white transition hover:bg-accent-light"
            >
              View jobs →
            </Link>

            <Link
              href="/bots"
              className="rounded-md border border-border-strong px-4 py-2.5 text-sm font-medium text-text-secondary transition hover:bg-surface"
            >
              Watch the agents ↗
            </Link>
          </div>

          <div className="mt-7 flex items-center gap-2 text-xs text-text-muted">
            <span className="h-1.5 w-1.5 animate-judging rounded-full bg-success" />
            Live on Somnia Shannon testnet · contracts verified
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="border-t border-border px-6 py-16">
        <div className="mx-auto max-w-4xl">
          <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-text-muted">
            How it works
          </h2>

          <div className="mt-5 grid gap-4 sm:grid-cols-3">
            {STEPS.map((s) => (
              <div key={s.n} className="rounded-xl border border-border bg-surface p-5 text-left">
                <div className="font-mono text-sm text-accent-light">{s.n}</div>
                <h3 className="mt-2 font-semibold tracking-tight">{s.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-text-secondary">{s.body}</p>
              </div>
            ))}
          </div>

          {/* The verdict pipeline — the same component the dashboard uses. */}
          <div className="mt-8 flex flex-col items-start gap-5 rounded-xl border border-border bg-surface-hi p-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-left">
              <p className="text-sm font-medium text-text-primary">One composed agent call</p>
              <p className="mt-1 max-w-sm text-sm text-text-secondary">
                JSON API verifies, Parse Website reads the delivery, an LLM renders
                the verdict — all in a single on-chain resolution.
              </p>
            </div>
            <TraceTimeline steps={PIPELINE} />
          </div>
        </div>
      </section>
    </main>
  );
}
