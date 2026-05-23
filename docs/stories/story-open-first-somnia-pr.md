# Story — open-first-somnia-pr

**Epic:** Epic 6 (optional)
**Depends on:** `story-somnia-repo-scan`
**Estimated:** 0.25 day
**Story slug:** `story-open-first-somnia-pr`

## Goal

Open the top candidate PR from the shortlist. Include a 1-line introduction in the PR description mentioning Auspex (with a link). Goal is signal — even an open PR is signal; merge is bonus.

## Acceptance criteria (BDD)

```
Given the shortlist from the previous story
When I pick the top candidate
Then I fork the repo, make the fix on a feature branch named `fix/<short-slug>`, push, and open a PR against upstream main

Given the PR description
When I write it
Then the first paragraph clearly states what's broken and the fix
And the last paragraph contains a 1-line "I'm building Auspex for the Agentathon — link here" with the Vercel URL (if Epic 5 has shipped) or the GitHub repo URL

Given the PR opens
When I review it
Then the diff is < 20 lines (small + atomic)
And there are no formatting drift commits (only the substantive change)
And the PR title follows the upstream repo's conventional commit pattern if one exists

Given the PR is opened
When I log it
Then the URL is appended to `docs/somnia-contribs-log.md`
And the status is recorded ("OPENED", "MERGED", "CLOSED", "STALE")
```

## File modification map

- `docs/somnia-contribs-log.md` — NEW — running log of opened PRs + statuses
- (external) — the actual PR on a Somnia-Network repo
- README — UPDATE (Epic 5) — add a "Somnia ecosystem contributions" line linking the PR(s)

## Shell verification

```bash
test -f docs/somnia-contribs-log.md
grep -cE "https://github.com/Somnia-Network/[^/]+/pull/[0-9]+" docs/somnia-contribs-log.md   # ≥ 1 PR link
```

## Out of scope

- ❌ Following up if no merge — non-blocking
- ❌ Opening more than 2 PRs — diminishing returns
- ❌ Any PR that requires deep Solidity work — keep it docs/typo/links
