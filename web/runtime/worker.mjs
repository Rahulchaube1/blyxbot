import { loadBot } from "./bridge.mjs";

async function readBytes(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error("Could not load " + url.pathname);
  return new Uint8Array(await response.arrayBuffer());
}

const ready = loadBot(readBytes).then((turn) => {
  self.postMessage({ type: "ready" });
  return turn;
}).catch((error) => {
  console.error(error);
  self.postMessage({ type: "error", message: "BlyxBot could not load. Retry the engine." });
  return null;
});

self.onmessage = async ({ data }) => {
  if (data?.type !== "turn") return;
  const turn = await ready;
  if (!turn) return;
  try {
    const result = await turn(data.text, data.state);
    self.postMessage({ type: "reply", id: data.id, ...result });
  } catch (error) {
    console.error(error);
    self.postMessage({ type: "error", id: data.id, message: "BlyxBot could not finish this reply." });
  }
};
