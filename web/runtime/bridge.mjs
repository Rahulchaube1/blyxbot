import { evaluate } from "./engine.mjs";

export const sourceFiles = ["chat", "math", "calendar", "capitals", "knowledge"];
const encoder = new TextEncoder();
const maxSourceBytes = 256 * 1024; // prepare() limit in the official WASM runtime.
const lexemes = /[\p{L}\p{M}]+(?:['’\-][\p{L}\p{M}]+)*|(?:[0-9]{1,3}(?:,[0-9]{3})+|[0-9]+)(?:\.[0-9]+)?|\.[0-9]+|[()+*=/%^×÷−\-]/gu;
const safeData = /^[\p{L}\p{M}0-9.,'’()+*=/%^×÷−\-]*$/u;

export async function loadRules(readBytes) {
  const files = await Promise.all(sourceFiles.map((name) =>
    readBytes(new URL("../bot/" + name + ".blyx", import.meta.url))));
  return files.map((data) => new TextDecoder().decode(data)).join("\n");
}

export async function loadBot(readBytes) {
  const [module, rules] = await Promise.all([
    readBytes(new URL("./blyx.wasm", import.meta.url)).then((bytes) => WebAssembly.compile(bytes)),
    loadRules(readBytes),
  ]);
  return createBot(module, rules);
}

// Blyx 0.2 has a parameterless main and no stdin in its portable interpreter.
// Supply the lexical input as data-only functions. All routing, arithmetic,
// state changes and reply wording are implemented by the .blyx source files.
function literal(value) {
  if (!safeData.test(value)) throw new Error("Invalid input token.");
  return '"' + value + '"';
}

function readState(serialized) {
  if (!serialized) return { name: "", topic: "" };
  const state = typeof serialized === "string" ? JSON.parse(serialized) : serialized;
  const name = state?.name || state?.user?.name || "";
  const topic = state?.version === 1 ? state.topic : "";
  return {
    name: typeof name === "string" && safeData.test(name) && name.length <= 128 ? name : "",
    topic: typeof topic === "string" && /^[a-z0-9-]{1,100}$/.test(topic) ? topic : "",
  };
}

// Balanced index lookups keep long messages from making every word access a scan.
function table(name, type, values, fallback) {
  function tree(start, end) {
    if (end - start === 1) return "return " + values[start] + ";";
    const mid = (start + end) >>> 1;
    return "if i < " + mid + " {" + tree(start, mid) + "} else {" + tree(mid, end) + "}";
  }
  const body = values.length ? "if i >= 0 && i < " + values.length + " {" + tree(0, values.length) + "}" : "";
  return "fn " + name + "(i: i64) -> " + type + " {" + body + "return " + fallback + ";}\n";
}

function numericLiteral(raw) {
  raw = raw.replaceAll(",", "");
  if (!/^(?:\d+(?:\.\d+)?|\.\d+)$/.test(raw)) return null;
  const [whole, fraction] = raw.split(".");
  const integer = whole.replace(/^0+/, "") || "0";
  // This lexer reads the integer part into an integer before the decimal.
  // Keep its exact-integer input range and report larger input to the user.
  if (integer.length > 15 || (fraction?.length || 0) > 32) return null;
  return { float: integer + "." + (fraction || "0"), integer: fraction == null ? integer : "-1" };
}

function tokenData(message) {
  const tokens = [];
  for (const match of message.normalize("NFC").matchAll(lexemes)) {
    const raw = match[0].replaceAll("’", "'");
    if (raw.length > 128 || tokens.length >= 192) return null;
    if (raw.length > 2 && raw.toLowerCase().endsWith("'s")) tokens.push(raw.slice(0, -2), "'s");
    else tokens.push(raw);
  }
  return tokens;
}

function turnData(tokens, state, tooLong) {
  const words = tokens.map((token) => token.toLowerCase());
  const numbers = tokens.map(numericLiteral);
  const matches = [...new Set(words)].map((w) => "if key == " + literal(w) + " {return true;}");
  const pairs = new Set();
  for (let i = 1; i < words.length; i++) {
    pairs.add("if a == " + literal(words[i - 1]) + " && b == " + literal(words[i]) + " {return true;}");
  }
  return [
    "fn stored_name() -> str {" + literal(state.name) + "}",
    "fn prior_topic() -> str {" + literal(state.topic) + "}",
    "fn word_count() -> i64 {" + tokens.length + "}",
    "fn oversized() -> bool {" + tooLong + "}",
    "fn has_word(key: str) -> bool {" + matches.join("\n") + "false}",
    "fn has_pair(a: str, b: str) -> bool {" + [...pairs].join("\n") + "false}",
    table("word", "str", words.map(literal), '""'),
    table("raw_word", "str", tokens.map(literal), '""'),
    table("name_token", "bool", tokens.map((w) => String(/^[\p{L}][\p{L}\p{M}'\-]*$/u.test(w))), "false"),
    table("is_titlecase", "bool", tokens.map((w) => String(/^\p{Lu}/u.test(w))), "false"),
    table("is_number", "bool", numbers.map((n) => String(n !== null)), "false"),
    table("number_at", "f64", numbers.map((n) => n?.float || "0.0"), "0.0"),
    table("integer_at", "i64", numbers.map((n) => n?.integer || "-1"), "-1"),
  ].join("\n");
}

export function programForTurn(rules, text, serialized) {
  const state = readState(serialized);
  const tokens = tokenData(text);
  const source = rules + "\n" + turnData(tokens || [], state, tokens === null);
  if (encoder.encode(source).length <= maxSourceBytes) return source;
  return rules + "\n" + turnData([], state, true);
}

export function createBot(compiledRuntime, rules) {
  return async function turn(text, serialized = null) {
    if (typeof text !== "string" || !text.trim()) throw new Error("Enter a message.");
    const source = programForTurn(rules, text, serialized);
    const start = performance.now();
    const execution = await evaluate(compiledRuntime, source, true);
    if (execution.status !== 0) {
      throw new Error(execution.diagnostics.map((d) => d.message).join(" / ") || "Blyx execution failed.");
    }
    const [name, topic, ...lines] = execution.output.split("\n");
    const reply = lines.join("\n").trim();
    if (!topic || !reply) throw new Error("Incomplete BlyxBot output.");
    return { reply, module: topic, elapsedMs: Math.round(performance.now() - start),
      state: JSON.stringify({ version: 1, name, topic }) };
  };
}
