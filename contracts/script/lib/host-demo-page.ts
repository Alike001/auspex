import { createServer, type Server } from "node:http";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

export type DemoServer = {
  url: string;
  close: () => Promise<void>;
};

/// Tiny inline HTTP server. Useful for local-mock test runs; agent validators on Shannon
/// cannot reach localhost so the LIVE demo uses publicly hosted URLs from .env.local.
export async function startDemoServer(opts: { port?: number; htmlFile: string }): Promise<DemoServer> {
  const port = opts.port ?? 8787;
  const filePath = resolve(opts.htmlFile);
  const html = readFileSync(filePath, "utf-8");

  const server: Server = createServer((_req, res) => {
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(html);
  });

  await new Promise<void>((resolveListen) => server.listen(port, () => resolveListen()));

  return {
    url: `http://localhost:${port}/`,
    close: () =>
      new Promise<void>((resolveClose) => {
        server.close(() => resolveClose());
      }),
  };
}
