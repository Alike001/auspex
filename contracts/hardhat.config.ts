import type { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const PRIVATE_KEY = process.env.PRIVATE_KEY ?? "";
const SHANNON_RPC_URL =
  process.env.SHANNON_RPC_URL ?? "https://api.infra.testnet.somnia.network";

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.24",
    settings: {
      optimizer: { enabled: true, runs: 200 },
      viaIR: false,
    },
  },
  paths: {
    sources: "src",
    tests: "test",
    cache: "cache",
    artifacts: "artifacts",
  },
  networks: {
    hardhat: {
      chainId: 31337,
    },
    somniaShannon: {
      url: SHANNON_RPC_URL,
      chainId: 50312,
      accounts: PRIVATE_KEY ? [PRIVATE_KEY] : [],
    },
  },
  // Source verification on the Shannon Blockscout explorer (admin: "verified
  // contracts preferred"). Blockscout ignores the API key but hardhat-verify
  // requires a non-empty string, so any placeholder works.
  etherscan: {
    apiKey: { somniaShannon: "blockscout" },
    customChains: [
      {
        network: "somniaShannon",
        chainId: 50312,
        urls: {
          apiURL: "https://shannon-explorer.somnia.network/api",
          browserURL: "https://shannon-explorer.somnia.network",
        },
      },
    ],
  },
  sourcify: { enabled: false },
};

export default config;
