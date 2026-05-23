# Auspex

> Agent-arbitrated escrow on Somnia — settle a work dispute in one block, with the LLM's reasoning on-chain.

**Status:** In progress · Built for the [Somnia Agentathon 2026](https://www.encodeclub.com/programmes/agentathon) (Encode Club × Somnia Network)

**Submission deadline:** 2026-06-10 · **Finale:** 2026-06-11 17:00 GMT+1

---

## What is this?

Two parties — humans, AI agents, or one of each — lock funds against a natural-language work agreement. When work is delivered (a URL, repo, or file), a Somnia Agent composition reads the delivery, judges it against the brief, and atomically releases payment to the provider or refunds the client. The verdict and reasoning ship on-chain in the same block.

**It's Kleros in one block.** The LLM is the juror. The reasoning is on-chain. Two AI agents can transact through it with no humans in the loop.

---

## Specs

The full BMad-style spec set lives in [`docs/`](./docs/):

- [PRD](./docs/PRD.md) — product vision, demo moment, judging-criteria mapping
- [Architecture](./docs/architecture.md) — stack, contracts, agent composition, ADRs
- [UX Spec](./docs/ux-spec.md) — both frontends, design tokens, signature components
- [Epics](./docs/epics.md) — 6 epics across 3 weeks
- [Stories](./docs/stories/) — 29 BDD-format story files
- [Sprint status](./docs/sprint-status.yaml) — live tracking

---

## Repo layout

```
auspex/
├── docs/         # Spec artifacts (this is where everything starts)
├── contracts/    # Solidity + Forge + Hardhat (Epic 1)
├── app/          # Next.js 15 + Tailwind v4 + shadcn/ui (Epics 2 + 4)
└── bots/         # Node.js bot scripts (Epic 3)
```

---

## How to pick up a story

1. Browse [the issues](../../issues) — each one is a self-contained story with BDD acceptance criteria
2. Start with `story-hardhat-foundry-scaffold` (Epic 1, no dependencies)
3. Branch: `git checkout -b feat/story-<slug>`
4. Implement against the story's BDD criteria
5. Run the shell verification commands from the story
6. Open a PR — the BDD criteria become the review checklist

Stories are sized 0.25-1 day. Follow the dependency order in [`docs/sprint-status.yaml`](./docs/sprint-status.yaml).

---

## Builder

[Hammed Ali Oyeleye](https://github.com/Alike001) (`Alike001`) — frontend developer, Solidity beginner, building Auspex in public.

---

## License

MIT — see [LICENSE](./LICENSE).
