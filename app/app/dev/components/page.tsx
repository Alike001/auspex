  import { notFound } from "next/navigation";
  import { AgentChip } from "@/components/AgentChip";
  import { StatusPill, type Status } from "@/components/StatusPill";
  import { JobCard, JobsEmpty } from "@/components/JobCard";
  import { DeliveryPreview } from "@/components/DeliveryPreview";
  import { ReasoningTrace } from "@/components/ReasoningTrace";
  import type { Step } from "@/components/ReasoningTrace.types";
  import { TraceTimeline } from "@/components/TraceTimeline";
  import type { TraceNode } from "@/components/TraceTimeline.types";
  import { BotFeedRow } from "@/components/BotFeedRow";
  import type { BotFeedRowProps } from "@/components/BotFeedRow.types";


  const STATUSES: Status[] = ["open", "judging", "released", "refunded", "claimed"];

  const PARTY_A = { address: "0x7a8f9c2b4e1d6a3f" };
  const PARTY_B = { address: "0x9d1c4b7e2a8f0021" };

    const TRACE_DONE: Step[] = [
    { status: "success", label: "JSON API verified URL", detail: "200 OK · landing.example.com" },
    { status: "success", label: "Parsed page content", detail: "Extracted 1,240 chars of visible text", tone: "info" },
    { status: "success", label: "Verdict: released", detail: "Delivery satisfies the brief", tone: "accent", txHash: "0xabc123def456ff21" },
  ];

  const TRACE_LIVE: Step[] = [
    { status: "success", label: "JSON API verified URL", detail: "200 OK" },
    { status: "inProgress", label: "Parsing page content…", detail: "LLM extracting visible text" },
    { status: "pending", label: "Run verdict" },
  ];

  const TRACE_ERROR: Step[] = [
    { status: "success", label: "JSON API verified URL", detail: "200 OK" },
    { status: "error", label: "Parse page content", error: "Could not parse delivered page" },
  ];

  const TRACE_REFUNDED: Step[] = [
    { status: "success", label: "JSON API verified URL", detail: "200 OK" },
    { status: "success", label: "Parsed page content", tone: "info" },
    { status: "success", label: "Verdict: refunded", detail: "Delivery does not satisfy the brief", tone: "danger", txHash: "0xdead000000beef21" },
  ];

  // TraceTimeline pipelines — collectively exercise every (step, status) fill rule.
  const TL_JUDGING: TraceNode[] = [
    { step: "json-api", status: "success" },
    { step: "parse-website", status: "success" },
    { step: "llm-judge", status: "inProgress" },
  ];
  const TL_RELEASED: TraceNode[] = [
    { step: "json-api", status: "success" },
    { step: "parse-website", status: "success" },
    { step: "llm-judge", status: "success" }, // success on llm-judge → bg-accent, not bg-success
  ];
  const TL_PARSING: TraceNode[] = [
    { step: "json-api", status: "success" },
    { step: "parse-website", status: "inProgress" },
    { step: "llm-judge", status: "pending" },
  ];
  const TL_ERROR: TraceNode[] = [
    { step: "json-api", status: "success" },
    { step: "parse-website", status: "error" },
    { step: "llm-judge", status: "pending" },
  ];
  const TL_IDLE: TraceNode[] = [
    { step: "json-api", status: "pending" },
    { step: "parse-website", status: "pending" },
    { step: "llm-judge", status: "pending" },
  ];

  const FEED_ROWS: BotFeedRowProps[] = [
    { fromBot: PARTY_A.address, toBot: PARTY_B.address, briefExcerpt: "H1 must read 'Hello Auspex'", status: "claimed", durationMs: 2600, txHash: "0xabc123def456ff21", amount: "2.0" },
    { fromBot: PARTY_A.address, toBot: PARTY_B.address, briefExcerpt: "Welcome the reader with a 'Hello Auspex' heading", status: "released", durationMs: 3100, txHash: "0xfeed00112233aa44", amount: "2.2" },
    { fromBot: PARTY_B.address, toBot: PARTY_A.address, briefExcerpt: "Page heading does not match the brief", status: "refunded", durationMs: 2400, txHash: "0xdead000000beef21", amount: "1.8" },
    { fromBot: PARTY_A.address, toBot: PARTY_B.address, briefExcerpt: "H1 must read 'Hello Auspex'", status: "judging", durationMs: 1200, amount: "2.0" },
    { fromBot: PARTY_A.address, toBot: PARTY_B.address, briefExcerpt: "Awaiting delivery from freelancer bot", status: "open", durationMs: 0, amount: "1.8" },
  ];


  function Section({ title, children }: { title: string; children: React.ReactNode }) {
    return (
      <section className="border-b border-border py-8">
        <h2 className="mb-4 text-xs font-semibold uppercase tracking-[0.14em] text-text-muted">
          {title}
        </h2>
        {children}
      </section>
    );
  }

  export default function ComponentsDemo() {
    if (process.env.NODE_ENV === "production") notFound();

    return (
      <main className="mx-auto max-w-3xl px-6 py-10">
        <h1 className="mb-2 text-2xl font-bold tracking-tight">Component gallery</h1>
        <p className="mb-6 text-sm text-text-secondary">
          Dev-only visual QA for Auspex signature components.
        </p>

        <Section title="AgentChip">
          <div className="flex flex-wrap items-center gap-8">
            <AgentChip address={PARTY_A.address} name="data-fetcher" />
            <AgentChip address={PARTY_B.address} />
            <AgentChip address={PARTY_A.address} name="loading" loading />
          </div>
        </Section>

        <Section title="StatusPill">
          <div className="flex flex-wrap items-center gap-3">
            {STATUSES.map((s) => (
              <StatusPill key={s} status={s} />
            ))}
          </div>
        </Section>

        <Section title="JobCard">
          <div className="overflow-hidden rounded-lg border border-border">
            <JobCard
              id="1"
              brief="Fix the H1 typo on landing.example.com"
              status="released"
              client={PARTY_A}
              freelancer={PARTY_B}
              amount="5.00 STT"
              timestamp="12s ago"
            />
            <JobCard
              id="2"
              brief="Make the hero section responsive at < 768px"
              status="judging"
              client={PARTY_B}
              freelancer={PARTY_A}
              amount="12.00 STT"
              timestamp="2s ago"
            />
            <JobCard
              id="3"
              brief="Match this Figma frame for the pricing block"
              status="open"
              client={PARTY_A}
              freelancer={PARTY_B}
              amount="20.00 STT"
              timestamp="5m ago"
            />
          </div>
        </Section>

        <Section title="JobsEmpty">
          <JobsEmpty />
        </Section>

        <Section title="DeliveryPreview">
          <div className="grid gap-6 sm:grid-cols-2">
            <DeliveryPreview url="https://example.com" />
            <DeliveryPreview url="https://example.com" error />
            <DeliveryPreview />
          </div>
        </Section>

           <Section title="ReasoningTrace">
          <div className="grid gap-6 sm:grid-cols-2">
            <div className="rounded-lg border border-border bg-surface p-5">
              <ReasoningTrace steps={TRACE_DONE} />
            </div>
            <div className="rounded-lg border border-border bg-surface p-5">
              <ReasoningTrace steps={TRACE_LIVE} />
            </div>
            <div className="rounded-lg border border-border bg-surface p-5">
              <ReasoningTrace steps={TRACE_ERROR} />
            </div>
            <div className="rounded-lg border border-border bg-surface p-5">
              <ReasoningTrace steps={TRACE_REFUNDED} />
            </div>
            <div className="rounded-lg border border-border bg-surface p-5">
              <ReasoningTrace steps={[]} />
            </div>
          </div>
        </Section>

        <Section title="TraceTimeline">
          <div className="grid gap-6 sm:grid-cols-2">
            {([
              ["Judging (llm-judge in progress)", TL_JUDGING],
              ["Released (llm-judge success → accent)", TL_RELEASED],
              ["Parsing (parse-website in progress)", TL_PARSING],
              ["Error (parse-website failed)", TL_ERROR],
              ["Idle (all pending)", TL_IDLE],
            ] as const).map(([label, steps]) => (
              <div key={label} className="rounded-lg border border-border bg-surface p-5">
                <p className="mb-4 text-[11px] uppercase tracking-[0.04em] text-text-muted">{label}</p>
                <TraceTimeline steps={steps} />
              </div>
            ))}
          </div>
        </Section>

        <Section title="BotFeedRow">
          <div className="divide-y divide-border rounded-lg border border-border bg-surface p-2">
            {FEED_ROWS.map((row, i) => (
              <BotFeedRow key={`${row.txHash ?? "pending"}-${i}`} {...row} />
            ))}
          </div>
        </Section>

      </main>
    );
  }
