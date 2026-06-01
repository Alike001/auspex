import type { Address } from "viem";

/**
 * Live Auspex deployment on Somnia Shannon testnet.
 * Source of truth: contracts/deployments/shannon.json
 */
export const ESCROW_FACTORY_ADDRESS =
  "0x00730838086b6f3c7a6d5443a17D021FA714FD93" as Address;

/**
 * Minimal hand-written ABIs — only the fragments the frontend reads.
 * (Full compiled ABIs live in contracts/out/*.json; we keep these lean on
 * purpose so the surface the UI depends on is obvious and reviewable.)
 */
export const escrowFactoryAbi = [
  {
    type: "function",
    name: "allJobs",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "address[]" }],
  },
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
] as const;

export const escrowAbi = [
  {
    type: "function",
    name: "client",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "address" }],
  },
  {
    type: "function",
    name: "deliverer",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "address" }],
  },
  {
    type: "function",
    name: "briefHash",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "bytes32" }],
  },
  {
    type: "function",
    name: "state",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint8" }],
  },
  {
    type: "function",
    name: "verdict",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "string" }],
  },
  {
    type: "function",
    name: "briefURI",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "string" }],
  },
  {
    type: "function",
    name: "deliveryUrl",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "string" }],
  },
  {
    type: "function",
    name: "reasoning",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "string" }],
  },
  {
    type: "function",
    name: "submitDelivery",
    stateMutability: "nonpayable",
    inputs: [{ name: "url", type: "string" }],
    outputs: [],
  },
  {
    type: "function",
    name: "claim",
    stateMutability: "nonpayable",
    inputs: [],
    outputs: [],
  },
  {
    type: "event",
    name: "JobResolved",
    inputs: [
      { name: "verdict", type: "string", indexed: false },
      { name: "reasoning", type: "string", indexed: false },
    ],
  },
] as const;
