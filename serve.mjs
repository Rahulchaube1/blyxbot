import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { createServer } from "node:http";
import { extname, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("./web/", import.meta.url));
const port = Number(process.env.PORT || 8080);
const types = { ".html": "text/html", ".css": "text/css", ".js": "text/javascript", ".mjs": "text/javascript",
  ".blyx": "text/plain", ".wasm": "application/wasm", ".woff2": "font/woff2", ".png": "image/png", ".webp": "image/webp" };
const server = createServer(async (request, response) => {
  if (request.method !== "GET" && request.method !== "HEAD") { response.writeHead(405, { Allow: "GET, HEAD" }).end(); return; }
  try {
    const pathname = decodeURIComponent(new URL(request.url, "http://localhost").pathname);
    const file = resolve(root, "." + (pathname === "/" ? "/index.html" : pathname));
    if (!file.startsWith(resolve(root) + sep) || !(await stat(file)).isFile()) { response.writeHead(404).end(); return; }
    response.writeHead(200, { "Content-Type": types[extname(file)] || "application/octet-stream" });
    if (request.method === "HEAD") response.end();
    else createReadStream(file).on("error", () => response.destroy()).pipe(response);
  } catch { response.writeHead(404).end(); }
});
server.listen(port, "127.0.0.1", () => console.log("BlyxBot is running at http://127.0.0.1:" + server.address().port));
