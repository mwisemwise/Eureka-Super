import http from "http";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const PORT = Number.parseInt(process.env.PORT ?? "4173", 10);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, "..");

const MIME_TYPES = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml; charset=utf-8"
};

function send(response, statusCode, body, contentType = "text/plain; charset=utf-8") {
  response.writeHead(statusCode, {
    "Content-Type": contentType,
    "Cache-Control": "no-cache"
  });
  response.end(body);
}

const server = http.createServer((request, response) => {
  const requestPath = request.url === "/" ? "/index.html" : request.url;
  const safePath = path.normalize(requestPath).replace(/^(\.\.[/\\])+/, "");
  const filePath = path.join(ROOT_DIR, safePath);

  if (!filePath.startsWith(ROOT_DIR)) {
    send(response, 403, "Forbidden");
    return;
  }

  fs.readFile(filePath, (error, content) => {
    if (error) {
      if (error.code === "ENOENT") {
        send(response, 404, "Not found");
        return;
      }
      send(response, 500, "Server error");
      return;
    }

    const extension = path.extname(filePath);
    const contentType = MIME_TYPES[extension] ?? "application/octet-stream";
    send(response, 200, content, contentType);
  });
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`Eureka Super available at http://127.0.0.1:${PORT}`);
});
