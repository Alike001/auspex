/**
 * Deployed addresses + minimal ABIs the bots transact against.
 *
 * Addresses are imported from the single source of truth written by the deploy
 * step: contracts/deployments/shannon.json. ABIs are hand-written fragments
 * (same approach as app/lib/contracts.ts) — only the functions/events the bots
 * actually call, so the surface is obvious and reviewable.
 */
import type { Abi, Address } from "viem";
import deployments from "../../contracts/deployments/shannon.json";

export const ESCROW_FACTORY_ADDRESS = deployments.EscrowFactory as Address;
export const AUSPEX_RESOLVER_ADDRESS = deployments.AuspexResolver as Address;

export const escrowFactoryAbi = [
  {
    type: "function",
    name: "createJob",
    stateMutability: "payable",
    inputs: [
      { name: "_briefHash", type: "bytes32" },
      { name: "_briefURI", type: "string" },
      { name: "_deliverer", type: "address" },
      { name: "_deadline", type: "uint256" },
    ],
    outputs: [{ name: "escrow", type: "address" }],
  },
  {
    type: "event",
    name: "JobCreated",
    inputs: [
      { name: "escrow", type: "address", indexed: true },
      { name: "client", type: "address", indexed: true },
      { name: "deliverer", type: "address", indexed: true },
      { name: "amount", type: "uint256", indexed: false },
      { name: "briefHash", type: "bytes32", indexed: false },
    ],
  },
] as const satisfies Abi;

/** Escrow fragments the scraper bot (story-scraper-bot) will use to deliver,
 *  trigger resolution, and claim. Included here so the shared module is stable
 *  across Epic 3 stories. */
export const escrowAbi = [
  { type: "function", name: "state", stateMutability: "view", inputs: [], outputs: [{ type: "uint8" }] },
  { type: "function", name: "verdict", stateMutability: "view", inputs: [], outputs: [{ type: "string" }] },
  { type: "function", name: "deliveryUrl", stateMutability: "view", inputs: [], outputs: [{ type: "string" }] },
  { type: "function", name: "reasoning", stateMutability: "view", inputs: [], outputs: [{ type: "string" }] },
  { type: "function", name: "client", stateMutability: "view", inputs: [], outputs: [{ type: "address" }] },
  { type: "function", name: "deliverer", stateMutability: "view", inputs: [], outputs: [{ type: "address" }] },
  {
    type: "function",
    name: "submitDelivery",
    stateMutability: "nonpayable",
    inputs: [{ name: "url", type: "string" }],
    outputs: [],
  },
  { type: "function", name: "resolve", stateMutability: "nonpayable", inputs: [], outputs: [] },
  { type: "function", name: "claim", stateMutability: "nonpayable", inputs: [], outputs: [] },
  {
    type: "event",
    name: "JobResolved",
    inputs: [
      { name: "verdict", type: "string", indexed: false },
      { name: "reasoning", type: "string", indexed: false },
    ],
  },
] as const satisfies Abi;
