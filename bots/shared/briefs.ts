/**
 * Canonical brief catalogue. The data-fetcher bot picks one of these and posts
 * it as a job; the scraper bot fetches `targetUrl` and submits it as the
 * delivery. `expectedExtract` is the substring a correct delivery should contain
 * — used by tests and the scraper's self-check, NOT written on-chain.
 *
 * Targets span three different domains (per the Epic 3 risk register) so a single
 * site going down doesn't sink the whole demo — the orchestrator can skip to the
 * next brief.
 */
export type Brief = {
  /** Stable slug — used for deterministic selection and log correlation. */
  id: string;
  /** The on-chain brief text the agent judges the delivery against. */
  text: string;
  /** The URL the scraper bot will deliver (and the agent will fetch + parse). */
  targetUrl: string;
  /** Substring a correct delivery must contain. Off-chain (tests / scraper only). */
  expectedExtract: string;
};

// Targets are the project's own demo pages on Vercel. They are small, static, and
// purpose-built to be parseable by Somnia's Parse Website agent — generic sites
// (example.org, w3.org, httpbin) return "Could not parse delivered page" from the
// agent even when they scrape fine locally. correct.html satisfies the brief
// (→ released); wrong.html does not (→ a genuine, agent-judged refund).
const DEMO = "https://auspex-demo-pages.vercel.app";

export const BRIEFS: Brief[] = [
  {
    id: "hello-auspex-correct",
    text: "The delivered page's main heading (H1) must read 'Hello Auspex'.",
    targetUrl: `${DEMO}/correct.html`,
    expectedExtract: "Hello Auspex",
  },
  {
    id: "hello-auspex-wrong",
    text: "The delivered page's main heading (H1) must read 'Hello Auspex'.",
    targetUrl: `${DEMO}/wrong.html`,
    expectedExtract: "Hello Auspex",
  },
  {
    id: "welcome-to-auspex",
    text: "The delivered page must welcome the reader with a 'Hello Auspex' heading.",
    targetUrl: `${DEMO}/correct.html`,
    expectedExtract: "Hello Auspex",
  },
];
