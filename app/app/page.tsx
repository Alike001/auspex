 import Link from "next/link";

 export default function Home() {
    return (
      <main className="relative flex flex-1 flex-col items-center justify-center overflow-hidden px-6 text-center">
        <div className="grid-bg pointer-events-none absolute inset-0" />

        <div className="relative flex flex-col items-center">
          <span className="mb-7 flex h-10 w-10 items-center justify-center rounded-lg  bg-linear-to-br from-accent-light to-accent text-lg font-bold text-white">
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

            <a
              href="https://github.com/Alike001/auspex"
              className="rounded-md border border-border-strong px-4 py-2.5 text-sm font-medium text-text-secondary transition hover:bg-surface"
            >
              GitHub ↗
            </a>
          </div>
        </div>
      </main>
    );
  }
