import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { http } from "wagmi";
import { somniaShannon } from "@/lib/chain";

  export const wagmiConfig = getDefaultConfig({
    appName: "Auspex",
    projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ?? "",
    chains: [somniaShannon],
    transports: {
      [somniaShannon.id]: http(),
    },
    ssr: true,
  });
