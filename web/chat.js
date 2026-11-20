"use strict";

const byId = (id) => document.getElementById(id);
const historyList = byId("history");
const transcript = byId("transcript");
const scrollArea = byId("scroll-area");
const input = byId("message");
const chats = new Map();
const drafts = new Map();
const flights = new Map();
const submitting = new Set();
const updates = typeof BroadcastChannel === "function" ? new BroadcastChannel("pybot-chat-updates-v1") : null;
let db = null;
let activeId;
let worker;
let engine = "starting";
let startupMessage = "Starting engine";
let storageWarning = "";
let deleteTarget;

function element(tag, className, value) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (value != null) node.textContent = value;
  return node;
}

function icon(name) {
  const span = element("span", "symbol", name);
  span.setAttribute("aria-hidden", "true");
  return span;
}

function id() {
  return crypto.randomUUID ? crypto.randomUUID() : Array.from(crypto.getRandomValues(new Uint32Array(4))).join("-");
}

function emptyChat(chatId = id()) {
  return { id: chatId, title: "New conversation", updated: Date.now(), turns: [], state: null };
}

function notice(message = "") {
  byId("notice").textContent = message || storageWarning;
  byId("notice").hidden = !(message || storageWarning);
}

function openDatabase() {
  return new Promise((resolve, reject) => {
    // Preserve conversations saved before the app was renamed.
    const request = indexedDB.open("pybot-chat", 1);
    request.onupgradeneeded = () => request.result.createObjectStore("chats", { keyPath: "id" });
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function readFromStore(chatId) {
  return new Promise((resolve, reject) => {
    const store = db.transaction("chats").objectStore("chats");
    const request = chatId == null ? store.getAll() : store.get(chatId);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function sessionOnly() {
  if (db) db.close();
  db = null;
  storageWarning = "Browser storage is unavailable. Chats will last for this visit.";
  byId("privacy").lastElementChild.textContent = "This visit only";
  notice();
}

// Each change reads the latest record inside a single write transaction. A
// response can only complete its own pending turn, including across open tabs.
async function changeChat(chatId, change) {
  let updated;
  if (db) {
    try {
      updated = await new Promise((resolve, reject) => {
        const transaction = db.transaction("chats", "readwrite");
        const store = transaction.objectStore("chats");
        const request = store.get(chatId);
        let result;
        request.onsuccess = () => {
          result = change(request.result);
          if (result) store.put(result);
          else store.delete(chatId);
        };
        transaction.oncomplete = () => resolve(result);
        transaction.onabort = () => reject(transaction.error);
        transaction.onerror = () => reject(transaction.error);
      });
    } catch {
      sessionOnly();
    }
  }
  if (!db) updated = change(chats.get(chatId));
  if (updated) chats.set(chatId, updated);
  else chats.delete(chatId);
  if (db) updates?.postMessage(chatId);
  return updated;
}

async function syncChat(chatId) {
  if (!db) return;
  try {
    const record = await readFromStore(chatId);
    if (record) chats.set(chatId, record);
    else chats.delete(chatId);
    if (!chats.has(activeId)) startChat();
    else render();
  } catch { /* The current tab can keep its in-memory copy. */ }
}

function setMenu(open) {
  document.body.classList.toggle("nav-open", open);
  byId("nav-backdrop").hidden = !open;
  byId("open-nav").setAttribute("aria-expanded", String(open));
  byId("main").inert = open;
  if (open) byId("close-nav").focus();
}

function resizeInput() {
  input.style.height = "auto";
  input.style.height = input.scrollHeight + "px";
}

function selectChat(chatId, focus = false) {
  if (activeId) drafts.set(activeId, input.value);
  activeId = chatId;
  try { sessionStorage.setItem("pybot-active", activeId); } catch { /* Optional. */ }
  input.value = drafts.get(activeId) || "";
  resizeInput();
  setMenu(false);
  render(true);
  if (focus) input.focus({ preventScroll: true });
}

function startChat(focus = false) {
  const blank = Array.from(chats.values()).find((chat) => !chat.turns.length) || emptyChat();
  chats.set(blank.id, blank);
  selectChat(blank.id, focus);
}

function drawHistory() {
  const fragment = document.createDocumentFragment();
  const recent = [...chats.values()].sort((one, two) => two.updated - one.updated);
  for (const chat of recent) {
    if (!chat.turns.length && chat.id !== activeId) continue;
    const button = element("button", "history-item");
    button.type = "button";
    button.title = chat.title;
    if (chat.id === activeId) button.setAttribute("aria-current", "page");
    button.append(icon("chat_bubble"), element("span", "", chat.title));
    button.addEventListener("click", () => selectChat(chat.id));
    fragment.append(button);
  }
  historyList.replaceChildren(fragment);
}

function botByline() {
  const row = element("div", "bot-byline");
  const mark = element("span", "brand-mark");
  mark.setAttribute("aria-hidden", "true");
  mark.append(element("i"));
  row.append(mark, element("span", "", "BlyxBot"));
  return row;
}

async function copyReply(button, text, node) {
  try {
    if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(text);
    else {
      const selection = window.getSelection();
      const range = document.createRange();
      range.selectNodeContents(node);
      selection.removeAllRanges();
      selection.addRange(range);
      const copied = document.execCommand("copy");
      if (!copied) throw new Error("Clipboard unavailable");
      selection.removeAllRanges();
    }
    button.replaceChildren(icon("check"));
    button.setAttribute("aria-label", "Copied");
    setTimeout(() => {
      button.replaceChildren(icon("content_copy"));
      button.setAttribute("aria-label", "Copy reply");
    }, 1600);
  } catch {
    notice("Select the reply and use your device’s Copy command.");
  }
}

function botMessage(chat, turn) {
  const row = element("article", "turn bot-turn");
  row.setAttribute("aria-label", "BlyxBot");
  row.append(botByline());
  if (turn.reply != null) {
    const body = element("div", "turn-text", turn.reply);
    body.dir = "auto";
    const tools = element("div", "reply-tools");
    const copy = element("button", "copy icon-button");
    copy.setAttribute("aria-label", "Copy reply");
    copy.title = "Copy reply";
    copy.append(icon("content_copy"));
    copy.addEventListener("click", () => copyReply(copy, turn.reply, body));
    const details = [turn.module?.replaceAll("_", " "), (turn.elapsedMs / 1000).toFixed(1) + " s"].filter(Boolean);
    tools.append(copy, element("span", "", details.join(" · ")));
    row.append(body, tools);
  } else if (flights.has(turn.id)) {
    row.classList.add("pending");
    row.append(element("div", "turn-text", engine === "ready" ? "Thinking…" : "Waiting for the engine…"));
  } else {
    row.classList.add("turn-error");
    row.append(element("div", "turn-text", turn.error || "This reply was interrupted."));
    const retry = element("button", "text-button retry-turn", "Retry reply");
    retry.addEventListener("click", () => retryTurn(chat.id, turn.id));
    row.append(retry);
  }
  return row;
}

function canSend() {
  const chat = chats.get(activeId);
  const last = chat?.turns.at(-1);
  return Boolean(chat && !submitting.has(activeId) && (!last || last.reply != null) && input.value.trim());
}

function render(forceScroll = false) {
  const chat = chats.get(activeId);
  if (!chat) return;
  const hasTurns = chat.turns.length > 0;
  const atBottom = scrollArea.scrollHeight - scrollArea.scrollTop - scrollArea.clientHeight < 90;
  byId("chat-title").textContent = chat.title;
  document.title = hasTurns ? chat.title + " · BlyxBot" : "BlyxBot Chat";
  byId("delete-chat").hidden = !hasTurns;
  byId("welcome").hidden = hasTurns;
  transcript.hidden = !hasTurns;
  drawHistory();
  const fragment = document.createDocumentFragment();
  for (const turn of chat.turns) {
    const user = element("article", "turn user-turn");
    user.setAttribute("aria-label", "You");
    const message = element("div", "turn-text", turn.text);
    message.dir = "auto";
    user.append(message);
    fragment.append(user, botMessage(chat, turn));
  }
  transcript.replaceChildren(fragment);
  byId("send").disabled = !canSend();
  if (forceScroll || atBottom) requestAnimationFrame(() => { scrollArea.scrollTop = hasTurns ? scrollArea.scrollHeight : 0; });
}

function showEngine() {
  const badge = byId("engine-status");
  badge.className = "engine-status " + engine;
  badge.lastElementChild.textContent = engine === "ready" ? "Engine ready" : engine === "error" ? "Engine offline" : "Starting engine";
  badge.title = startupMessage;
  byId("retry-engine").hidden = engine !== "error";
}

function engineFailed() {
  engine = "error";
  startupMessage = "The Blyx engine could not start.";
  flights.clear();
  showEngine();
  notice("BlyxBot couldn’t start. Retry the engine to reconnect.");
  render();
}

function postTurn(job) {
  worker.postMessage({ type: "turn", id: job.turnId, text: job.text, state: job.state });
}

async function completeTurn(data) {
  const job = flights.get(data.id);
  if (!job) return;
  const record = await changeChat(job.chatId, (chat) => {
    const last = chat?.turns.at(-1);
    if (!chat || last?.id !== data.id || last.reply != null) return chat;
    if (data.type === "error") last.error = data.message || "BlyxBot couldn’t finish this reply.";
    else {
      Object.assign(last, { reply: data.reply, module: data.module, elapsedMs: data.elapsedMs, error: null });
      chat.state = data.state;
    }
    chat.updated = Date.now();
    return chat;
  });
  flights.delete(data.id);
  if (record) render();
}

function startEngine() {
  worker?.terminate();
  engine = "starting";
  startupMessage = "Starting engine";
  showEngine();
  notice();
  try {
    worker = new Worker("./runtime/worker.mjs", { type: "module" });
    worker.onerror = () => engineFailed();
    worker.onmessage = ({ data }) => {
      if (data.type === "ready") {
        engine = "ready";
        startupMessage = "Running BlyxBot on this device";
        showEngine();
        for (const job of flights.values()) postTurn(job);
        render();
      } else if (data.type === "status") {
        startupMessage = data.message;
        showEngine();
      } else if (data.type === "error" && data.id == null) engineFailed();
      else if (data.type === "reply" || data.type === "error") completeTurn(data);
    };
  } catch { engineFailed(); }
}

function enqueue(chat, turn) {
  if (flights.has(turn.id)) return;
  const job = { chatId: chat.id, turnId: turn.id, text: turn.text, state: chat.state };
  flights.set(turn.id, job);
  if (engine === "error") startEngine();
  else if (engine === "ready") postTurn(job);
}

function retryTurn(chatId, turnId) {
  const chat = chats.get(chatId);
  const turn = chat?.turns.at(-1);
  if (!turn || turn.id !== turnId || turn.reply != null) return;
  enqueue(chat, turn);
  render(true);
}

async function submit(text) {
  text = text.trim();
  const chatId = activeId;
  if (!text || !chatId || submitting.has(chatId)) return;
  submitting.add(chatId);
  byId("send").disabled = true;
  const turn = { id: id(), text, reply: null };
  try {
    const chat = await changeChat(chatId, (saved) => {
      const next = saved || emptyChat(chatId);
      const last = next.turns.at(-1);
      if (last && last.reply == null) return next;
      if (!next.turns.length) {
        const title = text.replace(/\s+/g, " ");
        next.title = title.length > 56 ? title.slice(0, 55) + "…" : title;
      }
      next.turns.push(turn);
      next.updated = Date.now();
      return next;
    });
    if (chat.turns.at(-1).id === turn.id) {
      drafts.delete(chatId);
      if (chatId === activeId) {
        input.value = "";
        resizeInput();
      }
      enqueue(chat, turn);
      notice();
    }
  } finally {
    submitting.delete(chatId);
    render(true);
  }
}

byId("composer").addEventListener("submit", (event) => {
  event.preventDefault();
  if (canSend()) submit(input.value);
});
input.addEventListener("input", () => {
  resizeInput();
  byId("send").disabled = !canSend();
});
input.addEventListener("keydown", (event) => {
  if (event.key === "Enter" && !event.shiftKey && !event.isComposing && event.keyCode !== 229) {
    event.preventDefault();
    if (canSend()) byId("composer").requestSubmit();
  }
});
document.querySelectorAll("[data-prompt]").forEach((button) => {
  button.addEventListener("click", () => submit(button.dataset.prompt));
});
byId("new-chat").addEventListener("click", () => startChat(true));
byId("open-nav").addEventListener("click", () => setMenu(true));
function closeMenu() { setMenu(false); byId("open-nav").focus(); }
byId("close-nav").addEventListener("click", closeMenu);
byId("nav-backdrop").addEventListener("click", closeMenu);
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && document.body.classList.contains("nav-open")) closeMenu();
});
matchMedia("(max-width:700px)").addEventListener("change", () => setMenu(false));
byId("about").addEventListener("click", () => byId("about-dialog").showModal());
byId("retry-engine").addEventListener("click", startEngine);
byId("delete-chat").addEventListener("click", () => {
  deleteTarget = activeId;
  byId("delete-dialog").showModal();
});
document.querySelectorAll("[data-close]").forEach((button) => button.addEventListener("click", () => button.closest("dialog").close()));
document.querySelectorAll("dialog").forEach((dialog) => dialog.addEventListener("click", (event) => {
  if (event.target === dialog) dialog.close();
}));
byId("confirm-delete").addEventListener("click", async () => {
  const chatId = deleteTarget;
  byId("delete-dialog").close();
  for (const [turnId, job] of flights) if (job.chatId === chatId) flights.delete(turnId);
  await changeChat(chatId, () => null);
  if (activeId === chatId) {
    const latest = [...chats.values()].sort((one, two) => two.updated - one.updated)[0];
    if (latest) selectChat(latest.id);
    else startChat();
  } else render();
  drafts.delete(chatId);
});
updates?.addEventListener("message", (event) => syncChat(event.data));

async function initialize() {
  try {
    db = await openDatabase();
    for (const chat of await readFromStore()) chats.set(chat.id, chat);
  } catch { sessionOnly(); }
  let previous;
  try { previous = sessionStorage.getItem("pybot-active"); } catch { /* Optional. */ }
  if (previous && chats.has(previous)) selectChat(previous);
  else startChat();
  startEngine();
}
initialize();
