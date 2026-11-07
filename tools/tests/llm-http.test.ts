/**
 * HttpLlmEngine watchdogs, against real local HTTP servers (no mocks of fetch).
 * Regression for: a server that accepted the request and then went silent left the
 * visitor waiting (there was no client-side timeout), and the proxy's whole-request
 * timeout cut slow-but-healthy streams off.
 *   cd tools && npm test
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { createServer, type Server, type ServerResponse } from "node:http";
import type { AddressInfo } from "node:net";
import { HttpLlmEngine } from "../../src/lib/assistant/llm-http.ts";

const sse = (res: ServerResponse) => res.writeHead(200, { "Content-Type": "text/event-stream" });
const token = (res: ServerResponse, t: string) => res.write(`data: ${JSON.stringify({ choices: [{ delta: { content: t } }] })}\n\n`);

async function serve(handler: (res: ServerResponse) => void): Promise<{ url: string; server: Server }> {
  const server = createServer((req, res) => {
    req.resume();
    req.on("end", () => handler(res));
  });
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", () => r()));
  return { url: `http://127.0.0.1:${(server.address() as AddressInfo).port}/v1`, server };
}
const close = (s: Server) => {
  s.closeAllConnections();
  s.close();
};
const msgs = [{ role: "user" as const, content: "hi" }];

test("a server that never answers times out with a plain Error (→ verified-answer fallback)", async () => {
  const { url, server } = await serve(() => {
    /* accept, never respond */
  });
  const engine = new HttpLlmEngine({ baseUrl: url, model: "m", timeouts: { firstTokenMs: 400, stallMs: 400 } });
  const t0 = Date.now();
  await assert.rejects(engine.complete({ messages: msgs, maxTokens: 8 }), (e: Error) => {
    assert.notEqual(e.name, "AbortError", "must not look like a visitor cancellation");
    assert.match(e.message, /timed out \(no first token/);
    return true;
  });
  assert.ok(Date.now() - t0 < 3000);
  close(server);
});

test("a stream that stalls after the first token times out", async () => {
  const { url, server } = await serve((res) => {
    sse(res);
    token(res, "Hello");
    /* then silence */
  });
  const engine = new HttpLlmEngine({ baseUrl: url, model: "m", timeouts: { firstTokenMs: 2000, stallMs: 300 } });
  await assert.rejects(engine.complete({ messages: msgs, maxTokens: 8 }), /timed out \(no token for/);
  close(server);
});

test("a slow but steady stream completes even when it takes longer than the first-token limit", async () => {
  const { url, server } = await serve((res) => {
    sse(res);
    let i = 0;
    const t = setInterval(() => {
      if (i++ < 8) token(res, `w${i} `);
      else {
        clearInterval(t);
        res.end("data: [DONE]\n\n");
      }
    }, 150);
  });
  const engine = new HttpLlmEngine({ baseUrl: url, model: "m", timeouts: { firstTokenMs: 500, stallMs: 500 } });
  const t0 = Date.now();
  const r = await engine.complete({ messages: msgs, maxTokens: 8 });
  assert.equal(r.text, "w1 w2 w3 w4 w5 w6 w7 w8 ");
  assert.ok(Date.now() - t0 > 500, "total time exceeded firstTokenMs, so only per-token gaps are limited");
  close(server);
});

test("a visitor cancellation still surfaces as AbortError", async () => {
  const { url, server } = await serve((res) => {
    sse(res);
    token(res, "Hi");
  });
  const engine = new HttpLlmEngine({ baseUrl: url, model: "m", timeouts: { firstTokenMs: 5000, stallMs: 5000 } });
  const ctrl = new AbortController();
  setTimeout(() => ctrl.abort(), 200);
  await assert.rejects(engine.complete({ messages: msgs, maxTokens: 8, signal: ctrl.signal }), (e: Error) => e.name === "AbortError");
  close(server);
});
