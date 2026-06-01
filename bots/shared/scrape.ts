/**
 * Minimal scrape helper — HTTP GET + naive HTML text/heading extraction.
 * v1 deliberately avoids a headless browser (Playwright is v2): the briefs in
 * the catalogue target static pages whose content is in the initial HTML.
 */
import dns from "node:dns";

// Prefer IPv4. On networks with broken IPv6 routing, undici/fetch tries the AAAA
// record first and hangs until ETIMEDOUT (e.g. example.org timed out while
// httpbin succeeded). ipv4first makes fetch reach the A record directly.
dns.setDefaultResultOrder("ipv4first");

export type ScrapeResult = {
  ok: boolean;
  status: number;
  /** First <h1> (or <title> fallback) text, trimmed. */
  heading: string;
  /** Tag-stripped visible-ish content, truncated for logging/hosting. */
  content: string;
  error?: string;
};

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractHeading(html: string): string {
  const h1 = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  if (h1) return stripHtml(h1[1]);
  const title = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return title ? stripHtml(title[1]) : "";
}

async function attempt(url: string, timeoutMs: number): Promise<ScrapeResult> {
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(timeoutMs),
      headers: { "user-agent": "AuspexScraperBot/1.0 (+https://github.com/Alike001/auspex)" },
    });
    if (!res.ok) {
      return { ok: false, status: res.status, heading: "", content: "", error: `HTTP ${res.status}` };
    }
    const html = await res.text();
    return {
      ok: true,
      status: res.status,
      heading: extractHeading(html),
      content: stripHtml(html).slice(0, 2000),
    };
  } catch (err) {
    // undici wraps the real reason in `cause` — surface its code (ETIMEDOUT,
    // ENOTFOUND, …) so a failed scrape is diagnosable from the log line alone.
    const code = (err as { cause?: { code?: string } })?.cause?.code;
    const message = err instanceof Error ? err.message : String(err);
    return { ok: false, status: 0, heading: "", content: "", error: code ? `${message} (${code})` : message };
  }
}

/**
 * GET the URL with a timeout, retrying transient failures. Never throws —
 * failures come back as `{ ok: false }`. Retries matter because the bots may run
 * on flaky connections where the same host times out once, then succeeds.
 */
export async function scrapeUrl(url: string, timeoutMs = 12_000, retries = 2): Promise<ScrapeResult> {
  let last: ScrapeResult = { ok: false, status: 0, heading: "", content: "", error: "not attempted" };
  for (let i = 0; i <= retries; i++) {
    last = await attempt(url, timeoutMs);
    if (last.ok) return last;
    if (i < retries) await new Promise((r) => setTimeout(r, 800 * (i + 1)));
  }
  return last;
}
