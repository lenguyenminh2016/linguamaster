"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const { createServer, resolveFrontendFile } = require("../src/server");

test("frontend assets referenced by index.html exist", () => {
  const frontendRoot = path.resolve(__dirname, "../../frontend");
  const html = fs.readFileSync(path.join(frontendRoot, "index.html"), "utf8");
  const localReferences = [...html.matchAll(/(?:href|src)="([^"]+)"/g)]
    .map((match) => match[1])
    .filter((reference) => !reference.startsWith("http"));

  for (const reference of localReferences) {
    assert.equal(
      fs.existsSync(path.join(frontendRoot, reference)),
      true,
      `Missing frontend asset: ${reference}`
    );
  }
});

test("server exposes health and frontend endpoints", async (context) => {
  const server = createServer();
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  context.after(() => new Promise((resolve) => server.close(resolve)));

  const address = server.address();
  const baseUrl = `http://127.0.0.1:${address.port}`;

  const healthResponse = await fetch(`${baseUrl}/api/health`);
  assert.equal(healthResponse.status, 200);
  assert.equal((await healthResponse.json()).status, "ok");

  const indexResponse = await fetch(`${baseUrl}/`);
  assert.equal(indexResponse.status, 200);
  assert.match(indexResponse.headers.get("content-type"), /^text\/html/);
  assert.match(await indexResponse.text(), /LinguaMaster/);
});

test("tutor endpoint validates requests and returns an AI reply", async (context) => {
  const calls = [];
  const server = createServer({
    generateTutorReply: async (message, history, language) => {
      calls.push({ message, history, language });
      return { text: "Hello from Gemini", usage: { totalTokenCount: 12 } };
    }
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  context.after(() => new Promise((resolve) => server.close(resolve)));

  const address = server.address();
  const baseUrl = `http://127.0.0.1:${address.port}`;
  const response = await fetch(`${baseUrl}/api/tutor`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      message: "Teach me present perfect",
      history: [{ role: "assistant", text: "What would you like to learn?" }],
      language: "en"
    })
  });

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    reply: "Hello from Gemini",
    usage: { totalTokenCount: 12 }
  });
  assert.deepEqual(calls, [{
    message: "Teach me present perfect",
    history: [{ role: "assistant", text: "What would you like to learn?" }],
    language: "en"
  }]);

  const invalidResponse = await fetch(`${baseUrl}/api/tutor`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message: "  " })
  });
  assert.equal(invalidResponse.status, 400);
});

test("server blocks paths outside the frontend root", () => {
  assert.equal(resolveFrontendFile("/../../.env"), null);
});
