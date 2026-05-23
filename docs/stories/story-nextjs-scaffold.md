# Story — nextjs-scaffold

**Epic:** Epic 2 — Frontend #1 (Human freelance flow)
**Depends on:** `story-hardhat-foundry-scaffold` (workspace root exists)
**Estimated:** 0.5 day
**Story slug:** `story-nextjs-scaffold`

## Goal

Stand up `app/` workspace as a Next.js 15 App Router project with Tailwind v4 + shadcn/ui + Geist + the DESIGN.md tokens wired. Smoke render at `/` should show a Geist-rendered heading on the `#070D14` background with `#E9C46A` accent button. No business logic.

## Acceptance criteria (BDD)

```
Given the app workspace
When I run `pnpm -F app dev` and visit http://localhost:3000
Then a page renders with no console errors
And the background is exactly `#070D14`
And the body font computed style is Geist Sans
And a primary button on screen has background `#E9C46A`

Given the app workspace
When I run `pnpm -F app build`
Then exit code is 0

Given the app workspace
When I run `pnpm -F app typecheck`
Then exit code is 0 (TypeScript strict mode enabled)

Given the app workspace
When I run `pnpm -F app lint`
Then exit code is 0 and no `any` types are present (eslint rule: `@typescript-eslint/no-explicit-any: error`)

Given tailwind.config.ts
When I read it
Then `theme.extend.colors` contains every token from ux-spec §2 (bg, surface, surface-elevated, border, border-strong, text-primary, text-secondary, text-muted, accent, success, destructive, info, warning) mapped to exact hex values
And `theme.extend.fontFamily.sans` references the Geist Sans CSS variable
And `theme.extend.fontFamily.mono` references the Geist Mono CSS variable

Given app/styles/globals.css
When I read it
Then it imports both Geist font variables
And declares every CSS variable from ux-spec §2 at `:root`
And the body element uses `bg-bg text-text-primary font-sans`
```

## File modification map

- `app/package.json` — NEW — Next 15, React 19, TS 5, Tailwind v4, shadcn deps
- `app/next.config.ts` — NEW — App Router enabled, output: 'standalone'
- `app/tsconfig.json` — NEW — strict mode, paths alias `@/*` → `./`
- `app/tailwind.config.ts` — NEW — DESIGN.md tokens
- `app/postcss.config.mjs` — NEW — Tailwind v4 PostCSS plugin
- `app/eslint.config.mjs` — NEW — Next + TS rules, no-explicit-any error
- `app/app/layout.tsx` — NEW — root layout with Geist font loaders + provider stub
- `app/app/page.tsx` — NEW — placeholder home (redirect to `/jobs` happens in a later story)
- `app/styles/globals.css` — NEW — Tailwind directives + DESIGN.md CSS variables
- `app/components/ui/button.tsx` — NEW — shadcn Button restyled to DESIGN.md
- `app/lib/utils.ts` — NEW — `cn()` helper (clsx + tailwind-merge)
- `app/.env.example` — NEW — copy of root .env.example for the app subset

## Shell verification

```bash
cd app
pnpm install
pnpm typecheck    # exit 0
pnpm lint         # exit 0
pnpm build        # exit 0
pnpm dev &
sleep 5
curl -s http://localhost:3000 | grep -q "bg-bg"   # confirm token classes rendered (or check for "background:#070D14" in CSS)
kill %1
```

All commands must exit 0.

## Out of scope

- ❌ Routing to /jobs (next story)
- ❌ Wallet connect (next story)
- ❌ Any signature components (later)
- ❌ Server actions / route handlers
