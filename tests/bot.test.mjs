import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { loadBot } from "../web/runtime/bridge.mjs";

const turn = await loadBot(readFile);
const cli = fileURLToPath(new URL("../cli.mjs", import.meta.url));

test("introductions, persisted names and independent conversations", async () => {
  const intro = await turn("Hi, I’m Mira.");
  assert.match(intro.reply, /Mira/);
  assert.equal((await turn("What's my name?", intro.state)).reply, "You're Mira.");
  assert.equal((await turn("What's my name?")).reply, "You haven't told me your name yet.");
  const forgot = await turn("Please forget my name.", intro.state);
  assert.equal((await turn("What's my name?", forgot.state)).reply, "You haven't told me your name yet.");
  assert.match((await turn("My name is Zoë.")).reply, /Zoë/);
  assert.match((await turn("What's my name?", JSON.stringify({ user: { name: "Anya" } }))).reply, /Anya/);
  assert.match((await turn("What is your name?")).reply, /BlyxBot/);
});

test("longest matching country, aliases and whole words", async () => {
  const cases = [
    ["What is the capital of Peru?", /^Lima\./],
    ["Canada's capital?", /^Ottawa/],
    ["Capital of the Democratic Republic of the Congo?", /^Kinshasa/],
    ["What is the capital of New Zealand?", /^Wellington/],
    ["What is the capital of the Roman Empire?", /don't know/],
    ["How long should I roast a turkey?", /^(?!Ankara)/],
  ];
  for (const [text, expected] of cases) assert.match((await turn(text)).reply, expected, text);
});

test("arithmetic applies sign, grouping and precedence", async () => {
  const cases = [
    ["What is 17 times 24?", "That's 408."], ["2 × (3 + 4)", "That's 14."],
    ["4 + 3 * 2", "That's 10."], ["1,200 + 3", "That's 1203."],
    ["-2 * -(1 + 2)", "That's 6."], ["What is 12 percent of 250?", "That's 30."],
    ["1 divided by 3", "That's 0.33."], ["0.1 + 0.2", "That's 0.3."],
    ["1 / 0", "Division by zero is undefined."],
  ];
  for (const [text, expected] of cases) assert.equal((await turn(text)).reply, expected, text);
  for (const text of ["2 * (3 + 4", "2 +", "2 ^ 3"]) assert.equal((await turn(text)).module, "fallback", text);
});

test("calendar answers use the Gregorian century rules and computus", async () => {
  assert.equal((await turn("How many days in February 1900?")).reply, "28 days.");
  assert.equal((await turn("How many days in February 2000?")).reply, "29 days.");
  assert.equal((await turn("Is 2025 a leap year?")).reply, "2025 is not a leap year.");
  assert.equal((await turn("When is Easter in 2026?")).reply, "Easter Sunday is April 5, 2026.");
});

test("everyday replies and context-specific follow-ups", async () => {
  assert.match((await turn("Why do onions make you cry?")).reply, /tears/i);
  assert.match((await turn("How do I care for a houseplant?")).reply, /water/i);
  assert.match((await turn("Why is the sky blue?")).reply, /scatt/i);
  const kettle = await turn("How do I descale a kettle?");
  assert.match(kettle.reply, /vinegar|citric/i);
  assert.equal((await turn("How long does that take?", kettle.state)).reply, "Half an hour.");
  assert.notEqual((await turn("How long does that take?")).reply, "Half an hour.");
});

test("unusual text and overlong messages preserve a usable chat", async () => {
  for (const text of ['A quote " and a backslash \\', "🌱", "hello\nthere"]) {
    assert.ok((await turn(text)).reply.length);
  }
  const long = await turn("sun ".repeat(220));
  assert.match(long.reply, /shorter messages/);
  assert.equal((await turn("2 + 2", long.state)).reply, "That's 4.");
});

test("CLI pipes turns, resets memory and runs one-shot prompts", () => {
  const one = spawnSync(process.execPath, [cli, "-p", "17 * 24"], { encoding: "utf8" });
  assert.equal(one.status, 0, one.stderr);
  assert.equal(one.stdout.trim(), "That's 408.");
  const pipe = spawnSync(process.execPath, [cli], {
    input: "My name is Mira\nWhat is my name?\n/reset\nWhat is my name?\n/exit\n", encoding: "utf8",
  });
  assert.equal(pipe.status, 0, pipe.stderr);
  assert.deepEqual(pipe.stdout.trim().split("\n").slice(1), ["You're Mira.", "You haven't told me your name yet."]);
});
