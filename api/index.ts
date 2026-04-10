import type { IncomingMessage, ServerResponse } from "http";
import app, { initializeApp } from "../artifacts/api-server/src/app.js";

const ready = initializeApp();

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  try {
    await ready;
  } catch {
    res.writeHead(503, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Service temporarily unavailable" }));
    return;
  }
  app(req as Parameters<typeof app>[0], res as Parameters<typeof app>[1]);
}
