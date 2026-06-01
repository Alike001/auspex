/**
 * Minimal scrape helper — HTTP GET + naive HTML text/heading extraction.
 * v1 deliberately avoids a headless browser (Playwright is v2): the briefs in
 * the catalogue target static pages whose content is in the initial HTML.
 */
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

/** GET the URL with a timeout. Never throws — failures come back as `{ ok: false }`. */
export async function scrapeUrl(url: string, timeoutMs = 15_000): Promise<ScrapeResult> {
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
    return {
      ok: false,
      status: 0,
      heading: "",
      content: "",
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
