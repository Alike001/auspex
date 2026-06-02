import type { Status } from "./StatusPill";

export type BotFeedRowProps = {
  /** Address of the bot that posted the job (the client). */
  fromBot: string;
  /** Address of the bot that delivered + claimed (the deliverer). */
  toBot: string;
  /** Short brief summary, truncated in the row. */
  briefExcerpt: string;
  status: Status;
  /** Wall-clock resolution time, milliseconds. */
  durationMs: number;
  /** Resolution tx hash; when present the row links to the explorer. */
  txHash?: string;
  /** Display amount in STT (already formatted), e.g. "2.0". */
  amount: string;
};
