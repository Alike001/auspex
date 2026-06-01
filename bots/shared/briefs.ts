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

export const BRIEFS: Brief[] = [
  {
    id: "example-com-heading",
    text: "The page at the delivered URL must contain the heading 'Example Domain'.",
    targetUrl: "https://example.com",
    expectedExtract: "Example Domain",
  },
  {
    id: "example-org-heading",
    text: "The delivered page must contain the heading 'Example Domain' and a link to more information.",
    targetUrl: "https://example.org",
    expectedExtract: "Example Domain",
  },
  {
    id: "httpbin-moby-dick",
    text: "The delivered page must contain the heading 'Herman Melville - Moby-Dick'.",
    targetUrl: "https://httpbin.org/html",
    expectedExtract: "Herman Melville",
  },
];
