/**
 * Reads one authentication frame and cleans up bounded handshake listeners.
 */
import type WebSocket from "ws";

/** Await the next frame without retaining timers or listeners after a failure. */
export async function waitForWebSocketMessage<T>(socket: WebSocket | null, timeout: number, signal?: AbortSignal): Promise<T> {
  signal?.throwIfAborted();
  if (!socket) throw new Error("WebSocket not initialized");
  return new Promise<T>((resolve, reject) => {
    const cleanup = () => {
      clearTimeout(timer);
      socket.removeListener("message", onMessage);
      socket.removeListener("error", onError);
      socket.removeListener("close", onClose);
      signal?.removeEventListener("abort", onAbort);
    };
    const onError = (error: Error) => { cleanup(); reject(error); };
    const onAbort = () => onError(signal!.reason as Error);
    const onClose = () => onError(new Error("WebSocket closed during authentication"));
    const onMessage = (raw: WebSocket.RawData) => {
      cleanup();
      try {
        resolve(JSON.parse(raw.toString()) as T);
      } catch (error) {
        reject(error);
      }
    };
    const timer = setTimeout(() => onError(new Error("WebSocket handshake timed out")), timeout);
    socket.once("message", onMessage);
    socket.once("error", onError);
    socket.once("close", onClose);
    signal?.addEventListener("abort", onAbort, { once: true });
  });
}
