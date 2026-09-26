// Standalone realtime (Socket.IO) server, for deployments where the Next.js app
// runs somewhere that can't hold WebSocket connections (e.g. Vercel).
// Locally, `npm run dev` (server.ts) runs both together and this file isn't needed.
import { createServer } from "node:http";
import nextEnv from "@next/env";

if (Number(process.versions.node.split(".")[0]) < 22) {
  console.error(`Norabox needs Node.js 22+ (running ${process.version}).`);
  process.exit(1);
}

nextEnv.loadEnvConfig(process.cwd(), process.env.NODE_ENV !== "production");
const { attachSocketServer } = await import("./src/server/socket");

// Comma-separated list of app origins allowed to connect, e.g. "https://norabox.vercel.app".
const origins = (process.env.CLIENT_ORIGIN ?? "")
  .split(",")
  .map((o) => o.trim().replace(/\/$/, ""))
  .filter(Boolean);
if (origins.length === 0) {
  console.error("Set CLIENT_ORIGIN to the app's URL (e.g. https://your-app.vercel.app).");
  process.exit(1);
}

const server = createServer((req, res) => {
  if (req.url === "/health") {
    res.writeHead(200, { "Content-Type": "text/plain" });
    res.end("ok");
    return;
  }
  res.writeHead(404);
  res.end();
});
attachSocketServer(server, { corsOrigins: origins });

const port = parseInt(process.env.PORT || "4000", 10);
server.listen(port, "0.0.0.0", () => {
  console.log(`> Norabox realtime server on :${port} (allowing ${origins.join(", ")})`);
});
