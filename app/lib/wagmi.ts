import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { injectedWallet } from "@rainbow-me/rainbowkit/wallets";
import { http } from "wagmi";
import { somniaShannon } from "@/lib/chain";

/**
 * We register ONLY the injected wallet (RainbowKit's wrapper around wagmi's
 * `injected()` connector — a direct `window.ethereum` request). The default
 * `getDefaultConfig` wallet set includes RainbowKit's MetaMask-SDK connector,
 * which hangs on "Opening MetaMask…" under our wagmi version (its wallet-connector
 * module references connectors this wagmi build no longer exports). The injected
 * path is the same one every other dApp uses for the extension, and it connects
 * instantly.
 */
export const wagmiConfig = getDefaultConfig({
  appName: "Auspex",
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ?? "",
  chains: [somniaShannon],
  wallets: [{ groupName: "Recommended", wallets: [injectedWallet] }],
  transports: {
    [somniaShannon.id]: http(),
  },
  ssr: true,
});
