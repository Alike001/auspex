# Story — rainbowkit-wallet

**Epic:** Epic 2
**Depends on:** `story-nextjs-scaffold`
**Estimated:** 0.5 day
**Story slug:** `story-rainbowkit-wallet`

## Goal

Wire RainbowKit + wagmi v2 + viem into the app. Wallet connect works against the Somnia Shannon chain. The chain is defined once in `app/lib/chain.ts` and reused everywhere. The Connect button lives in the app shell header.

## Acceptance criteria (BDD)

```
Given app/lib/chain.ts
When I read the file
Then it exports `somniaShannon` as a viem `defineChain` result with id 50312, RPC `https://api.infra.testnet.somnia.network`, native STT 18 decimals

Given the app shell
When I open the dev server and view any page
Then a "Connect Wallet" button is visible top right
And clicking it opens the RainbowKit modal
And Shannon is the only chain listed

Given a connected wallet
When I view any page
Then the button label shows my address shortform (e.g. "0x7a…3f")
And clicking it opens the disconnect modal

Given app/app/layout.tsx
When I read it
Then it wraps children in `WagmiProvider` and `RainbowKitProvider`
And `RainbowKitProvider` uses a custom theme matching DESIGN.md tokens (dark, accent #E9C46A)

Given app/.env.example
When I read it
Then it contains placeholders for `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID`, `NEXT_PUBLIC_SOMNIA_RPC`, `NEXT_PUBLIC_SOMNIA_WS`, `NEXT_PUBLIC_CHAIN_ID`
```

## File modification map

- `app/lib/chain.ts` — NEW — `somniaShannon` viem chain
- `app/lib/wagmi.ts` — NEW — wagmi config with RainbowKit defaultConfig
- `app/app/providers.tsx` — NEW — client component with WagmiProvider + QueryClientProvider + RainbowKitProvider
- `app/app/layout.tsx` — UPDATE — wrap children in `<Providers>`
- `app/components/app-shell/Header.tsx` — NEW — sticky header with logo + nav + ConnectButton
- `app/components/app-shell/Nav.tsx` — NEW — "Jobs" + "Bots" nav links
- `app/.env.example` — UPDATE — add wallet vars
- `app/package.json` — UPDATE — add `@rainbow-me/rainbowkit`, `wagmi`, `viem`, `@tanstack/react-query`

## Shell verification

```bash
cd app
pnpm install
pnpm typecheck
pnpm build
pnpm dev &
sleep 5
curl -s http://localhost:3000 | grep -q "Connect Wallet"   # button rendered
kill %1
```

## Out of scope

- ❌ Reading from any Auspex contract (next story onward)
- ❌ Tx writes (`/jobs/new` story)
- ❌ Live event subscriptions (later)
