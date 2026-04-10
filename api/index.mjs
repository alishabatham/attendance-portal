import app, { initializeApp } from "../artifacts/api-server/dist/app.mjs";

const ready = initializeApp();

export default async function handler(req, res) {
  try {
    await ready;
  } catch {
    res.writeHead(503, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Service temporarily unavailable" }));
    return;
  }
  app(req, res);
}
