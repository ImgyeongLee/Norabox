import { EventEmitter } from "node:events";
import { createServer } from "node:http";
import nextEnv from "@next/env";
import next from "next";

// Prisma 7 needs a recent Node (20.19+ / 22.12+); we standardise on 22 (see .nvmrc).
if (Number(process.versions.node.split(".")[0]) < 22) {
  console.error(`Norabox needs Node.js 22+ (running ${process.version}). Run \`nvm use\` and try again.`);
  process.exit(1);
}

const dev = process.env.NODE_ENV !== "production";
const port = parseInt(process.env.PORT || "3000", 10);
const hostname = process.env.HOSTNAME || "localhost";

// Load .env files before any module that reads process.env (e.g. Prisma).
nextEnv.loadEnvConfig(process.cwd(), dev);
const { attachSocketServer } = await import("./src/server/socket");

const httpServer = createServer();

// Next.js attaches its own 'upgrade' listener (dev HMR) to the server it is given.
// Give it a stand-in and forward only non-Socket.IO upgrades, so the two never
// fight over the same websocket.
const nextUpgrades = new EventEmitter();
const app = next({ dev, hostname, port, httpServer: nextUpgrades as unknown as typeof httpServer });
const handle = app.getRequestHandler();

await app.prepare();
httpServer.on("request", (req, res) => handle(req, res));
httpServer.on("upgrade", (req, socket, head) => {
  if (!req.url?.startsWith("/socket.io/")) nextUpgrades.emit("upgrade", req, socket, head);
});
attachSocketServer(httpServer);

httpServer.listen(port, () => {
  console.log(`> Norabox ready on http://${hostname}:${port} (${dev ? "development" : "production"})`);
});
