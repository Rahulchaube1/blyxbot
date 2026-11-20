#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import { createInterface } from "node:readline";
import { parseArgs } from "node:util";
import { loadBot, loadRules, programForTurn } from "./web/runtime/bridge.mjs";

async function main() {
  const { values } = parseArgs({ options: {
    prompt: { type: "string", short: "p" }, verbose: { type: "boolean", short: "v" },
    "emit-blyx": { type: "string" }, help: { type: "boolean", short: "h" }
  } });
  if (values.help) {
    console.log("Usage: node cli.mjs [-v] [-p MESSAGE | --emit-blyx MESSAGE]\nChat commands: /reset, /help, /exit");
    return;
  }
  if (values["emit-blyx"] !== undefined) {
    console.log(programForTurn(await loadRules(readFile), values["emit-blyx"], null));
    return;
  }
  const turn = await loadBot(readFile);
  let state = null;
  async function reply(text, interactive) {
    const result = await turn(text, state);
    state = result.state;
    console.log((interactive ? "BlyxBot: " : "") + result.reply);
    if (values.verbose) console.error("[" + result.module + " | " + result.elapsedMs + " ms]");
  }
  if (values.prompt !== undefined) {
    await reply(values.prompt, false);
    return;
  }
  const interactive = Boolean(process.stdin.isTTY && process.stdout.isTTY);
  if (interactive) console.log("BlyxBot\nType a message, /reset for a fresh chat, or /exit to quit.\n");
  const lines = createInterface({ input: process.stdin, output: interactive ? process.stdout : undefined,
    terminal: interactive, prompt: "You: ", crlfDelay: Infinity });
  if (interactive) lines.prompt();
  try {
    for await (const line of lines) {
      const text = line.trim();
      const command = text.toLowerCase();
      if (command === "/exit" || command === "/quit") break;
      if (command === "/reset") {
        state = null;
        if (interactive) console.log("New conversation.");
      } else if (command === "/help") {
        console.log("/reset starts a new chat. /exit quits.");
      } else if (text) await reply(text, interactive);
      if (interactive) lines.prompt();
    }
  } finally { lines.close(); }
}

main().catch((error) => { console.error("BlyxBot:", error.message); process.exitCode = 1; });
