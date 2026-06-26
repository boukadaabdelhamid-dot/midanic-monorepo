import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import url from "node:url";

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const DIST = path.resolve(__dirname, "..", "dist");
const INDEX = path.join(DIST, "index.html");
const BASE = "/mobile";
const PORT = Number(process.env.PORT) || 8000;
const HOST = "0.0.0.0";

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".map": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".webp": "image/webp",
  ".ttf": "font/ttf",
  ".otf": "font/otf",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".txt": "text/plain; charset=utf-8",
};

function send(res, status, file) {
  const ext = path.extname(file).toLowerCase();
  res.writeHead(status, {
    "Content-Type": MIME[ext] || "application/octet-stream",
    "Cache-Control": "no-cache",
  });
  fs.createReadStream(file).pipe(res);
}

const server = http.createServer((req, res) => {
  let pathname;
  try {
    pathname = decodeURIComponent((req.url || "/").split("?")[0]);
  } catch {
    pathname = "/";
  }

  // Normalize bare base and root to the app entry under /mobile/
  if (pathname === BASE || pathname === "/") {
    res.writeHead(302, { Location: BASE + "/" });
    return res.end();
  }

  if (!pathname.startsWith(BASE + "/")) {
    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    return res.end("Not found");
  }

  let rel = pathname.slice(BASE.length); // keeps leading slash
  if (rel === "/" || rel === "") rel = "/index.html";

  const filePath = path.normalize(path.join(DIST, rel));
  if (filePath !== DIST && !filePath.startsWith(DIST + path.sep)) {
    res.writeHead(403, { "Content-Type": "text/plain; charset=utf-8" });
    return res.end("Forbidden");
  }

  fs.stat(filePath, (err, st) => {
    if (!err && st.isFile()) return send(res, 200, filePath);
    // Missing asset (has extension) => 404; otherwise SPA fallback to index.html
    if (path.extname(rel)) {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      return res.end("Not found");
    }
    return send(res, 200, INDEX);
  });
});

server.listen(PORT, HOST, () => {
  console.log(
    `Midanic Mobile static preview at http://${HOST}:${PORT}${BASE}/ (serving ${DIST})`,
  );
});
