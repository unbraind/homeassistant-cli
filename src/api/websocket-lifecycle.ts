/**
 * Disposes one captured WebSocket and proxy agent without touching later connections.
 */
import type WebSocket from "ws";
import type { websocketProxyAgent } from "./websocket-proxy.js";

/** Close gracefully, bound shutdown, and always destroy this connection's proxy agent. */
export async function closeWebSocketResources(
  socket: WebSocket | null, agent: ReturnType<typeof websocketProxyAgent>,
): Promise<void> {
  try {
    if (!socket) return;
    await new Promise<void>((resolve) => {
      const finish = () => {
        clearTimeout(timer);
        socket.removeListener("close", finish);
        socket.removeListener("error", finish);
        resolve();
      };
      const timer = setTimeout(finish, 250);
      socket.once("close", finish);
      socket.once("error", finish);
      socket.close();
    });
  } finally {
    if (agent) agent.destroy();
  }
}
