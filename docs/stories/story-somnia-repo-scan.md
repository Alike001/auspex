# Story — somnia-repo-scan

**Epic:** Epic 6 — Side-channel hire signal (optional, non-blocking)
**Depends on:** None
**Estimated:** 0.25 day
**Story slug:** `story-somnia-repo-scan`

## Goal

Scan `Somnia-Network/*` GitHub org for low-friction PR opportunities (typos, broken links, missing test coverage, doc improvements). Produce a shortlist of 3-5 candidate PRs with effort estimates. This is bench work — does NOT block hackathon submission.

## Acceptance criteria (BDD)

```
Given access to github.com/Somnia-Network
When I scan top 10 public repos by recent activity
Then I produce a shortlist file at `docs/somnia-contrib-shortlist.md`
And the file contains ≥ 3 candidate PRs

Given the shortlist
When I read each candidate
Then it has: repo URL, file path, what's wrong (1 line), proposed fix (1 line), effort estimate in minutes

Given the candidates
When I prioritize them
Then they are sorted by (a) least effort and (b) most signal — typo in a docs README beats refactoring a contract

Given the shortlist
When the build is in Week 1
Then I have time to open at least 1 PR; if blocked, drop this epic without guilt
```

## File modification map

- `docs/somnia-contrib-shortlist.md` — NEW — the candidate list

## Shell verification

```bash
test -f docs/somnia-contrib-shortlist.md
grep -c "^### " docs/somnia-contrib-shortlist.md   # ≥ 3 candidates (one per H3)
grep -cE "github.com/Somnia-Network" docs/somnia-contrib-shortlist.md   # ≥ 3 repo links
```

## Out of scope

- ❌ Opening the PRs (that's the next story)
- ❌ Becoming a top contributor (one merged PR is enough)
- ❌ Contributing to non-Somnia ecosystem repos
