import { buildBriefURI, hashBrief, validateBrief } from "@/lib/briefs";

/**
 * POST /api/briefs
 *
 * Canonical place that turns brief text into the (uri, hash) pair the post-job
 * form commits on-chain. We return a `data:` URI rather than persisting to a
 * store: the brief is then permanent and recoverable from chain alone (no
 * ephemeral storage to lose on redeploy, and `briefURI` is immutable once set).
 */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const text = (body as { text?: unknown })?.text;
  if (typeof text !== "string") {
    return Response.json({ error: "Missing brief text" }, { status: 400 });
  }

  const invalid = validateBrief(text);
  if (invalid) {
    return Response.json({ error: invalid }, { status: 400 });
  }

  return Response.json({ uri: buildBriefURI(text), hash: hashBrief(text) });
}
