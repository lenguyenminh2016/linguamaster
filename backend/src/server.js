"use strict";

const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");
const { generateTutorReply } = require("./services/gemini.service");

const backendRoot = path.resolve(__dirname, "..");
const projectRoot = path.resolve(backendRoot, "..");
const frontendRoot = path.join(projectRoot, "frontend");
const maxRequestBodyBytes = 64 * 1024;

const mimeTypes = {
  ".css": "text/css; charset=utf-8",
  ".gif": "image/gif",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
  ".woff2": "font/woff2"
};

function loadEnvironment() {
  const envPath = path.join(projectRoot, ".env");
  if (!fs.existsSync(envPath)) return;

  for (const rawLine of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;

    const separator = line.indexOf("=");
    if (separator < 1) continue;

    const key = line.slice(0, separator).trim();
    const value = line.slice(separator + 1).trim();
    if (!(key in process.env)) process.env[key] = value;
  }
}

function sendJson(response, statusCode, payload) {
  const body = JSON.stringify(payload);
  response.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(body),
    "Cache-Control": "no-store"
  });
  response.end(body);
}

async function readJsonBody(request) {
  let body = "";
  let size = 0;

  for await (const chunk of request) {
    size += chunk.length;
    if (size > maxRequestBodyBytes) {
      const error = new Error("Request body is too large");
      error.statusCode = 413;
      throw error;
    }
    body += chunk.toString("utf8");
  }

  if (!body) return {};

  try {
    return JSON.parse(body);
  } catch {
    const error = new Error("Request body must be valid JSON");
    error.statusCode = 400;
    throw error;
  }
}

function validateTutorRequest(payload) {
  const message = typeof payload.message === "string" ? payload.message.trim() : "";
  if (!message) {
    const error = new Error("Message is required");
    error.statusCode = 400;
    throw error;
  }
  if (message.length > 4000) {
    const error = new Error("Message must not exceed 4000 characters");
    error.statusCode = 400;
    throw error;
  }

  const history = Array.isArray(payload.history) ? payload.history.slice(-20) : [];
  const validHistory = history
    .filter((item) =>
      item &&
      (item.role === "user" || item.role === "assistant") &&
      typeof item.text === "string"
    )
    .map((item) => ({ role: item.role, text: item.text.slice(0, 4000) }));

  return {
    message,
    history: validHistory,
    language: payload.language === "zh" ? "zh" : "en"
  };
}

function resolveFrontendFile(urlPath) {
  const decodedPath = decodeURIComponent(urlPath);
  const requestedPath = decodedPath === "/" ? "/index.html" : decodedPath;
  const resolvedPath = path.resolve(frontendRoot, `.${requestedPath}`);
  const frontendPrefix = `${frontendRoot}${path.sep}`;

  if (resolvedPath !== frontendRoot && !resolvedPath.startsWith(frontendPrefix)) {
    return null;
  }

  return resolvedPath;
}

function createServer(options = {}) {
  const tutorReply = options.generateTutorReply || generateTutorReply;

  return http.createServer(async (request, response) => {
    const requestUrl = new URL(request.url, "http://localhost");

    if (request.method === "GET" && requestUrl.pathname === "/api/health") {
      sendJson(response, 200, {
        status: "ok",
        service: "linguamaster-backend",
        environment: process.env.APP_ENV || "development"
      });
      return;
    }

    if (request.method === "POST" && requestUrl.pathname === "/api/tutor") {
      try {
        const payload = validateTutorRequest(await readJsonBody(request));
        const result = await tutorReply(payload.message, payload.history, payload.language);
        sendJson(response, 200, {
          reply: result.text,
          usage: result.usage || null
        });
      } catch (error) {
        const statusCode = error.statusCode ||
          (error.message === "GEMINI_API_KEY is not configured" ? 503 : 502);
        const publicMessage = statusCode < 500
          ? error.message
          : "AI tutor is temporarily unavailable";

        if (statusCode >= 500) {
          console.error("Tutor request failed:", error.message);
        }
        sendJson(response, statusCode, { error: publicMessage });
      }
      return;
    }

    if (request.method !== "GET" && request.method !== "HEAD") {
      sendJson(response, 405, { error: "Method not allowed" });
      return;
    }

    let filePath;
    try {
      filePath = resolveFrontendFile(requestUrl.pathname);
    } catch {
      sendJson(response, 400, { error: "Invalid URL path" });
      return;
    }

    if (!filePath) {
      sendJson(response, 403, { error: "Forbidden path" });
      return;
    }

    fs.stat(filePath, (statError, stats) => {
      if (statError || !stats.isFile()) {
        sendJson(response, 404, { error: "File not found" });
        return;
      }

      const contentType = mimeTypes[path.extname(filePath).toLowerCase()] || "application/octet-stream";
      response.writeHead(200, {
        "Content-Type": contentType,
        "Content-Length": stats.size,
        "X-Content-Type-Options": "nosniff"
      });

      if (request.method === "HEAD") {
        response.end();
        return;
      }

      fs.createReadStream(filePath).pipe(response);
    });
  });
}

loadEnvironment();

if (require.main === module) {
  const port = Number.parseInt(process.env.APP_PORT || "3000", 10);
  const server = createServer();

  server.listen(port, "127.0.0.1", () => {
    console.log(`LinguaMaster running at http://localhost:${port}`);
  });
}

module.exports = { createServer, resolveFrontendFile };
