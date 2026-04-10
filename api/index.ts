import type { IncomingMessage, ServerResponse, RequestListener } from "http";
import app, { initializeApp } from "../artifacts/api-server/src/app.js";

const ready = initializeApp();
const handler = app as unknown as RequestListener;

export default async function vercelHandler(req: IncomingMessage, res: ServerResponse) {
  try {
    await ready;
  } catch {
    res.writeHead(503, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Service temporarily unavailable" }));
    return;
  }
  handler(req, res);
}
