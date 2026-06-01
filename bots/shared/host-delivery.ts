/**
 * Embedded Express server that mirrors each scrape result for local inspection
 * (and the Epic 4 dashboard). NOTE: this is NOT the URL judged on-chain — Somnia's
 * agent infra can't reach localhost, so the scraper submits the public targetUrl
 * for judging. This server is a local record + the `/error` sentinel used to force
 * a refund when a scrape fails.
 */
import express from "express";
import type { Server } from "node:http";

export type DeliveryRecord = {
  jobId: string;
  targetUrl: string;
  heading: string;
  content: string;
  scrapedAt: number;
};

export type DeliveryServer = {
  port: number;
  /** Local mirror URL for a job's delivery record. */
  urlFor: (jobId: string) => string;
  /** Unreachable-by-design sentinel — submitting this forces a refund. */
  errorUrl: string;
  record: (rec: DeliveryRecord) => void;
  close: () => Promise<void>;
};

export function startDeliveryServer(port = 8788): Promise<DeliveryServer> {
  const records = new Map<string, DeliveryRecord>();
  const app = express();

  app.get("/delivery/:jobId", (req, res) => {
    const rec = records.get(req.params.jobId.toLowerCase());
    if (!rec) {
      res.status(404).json({ error: "no delivery recorded for job" });
      return;
    }
    res.json(rec);
  });

  app.get("/error", (_req, res) => {
    res.status(500).json({ error: "scrape failed" });
  });

  return new Promise((resolve) => {
    const server: Server = app.listen(port, () => {
      resolve({
        port,
        urlFor: (jobId) => `http://localhost:${port}/delivery/${jobId.toLowerCase()}`,
        errorUrl: `http://localhost:${port}/error`,
        record: (rec) => records.set(rec.jobId.toLowerCase(), rec),
        close: () => new Promise((r) => server.close(() => r())),
      });
    });
  });
}
