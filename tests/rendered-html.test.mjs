import assert from "node:assert/strict";
import test from "node:test";

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request("http://localhost/", { headers: { accept: "text/html" } }),
    { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
    { waitUntil() {}, passThroughOnException() {} },
  );
}

test("server-renders the private Caféhaus landing page", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>Caféhaus After Dark<\/title>/i);
  assert.match(html, /Invitation only/);
  assert.match(html, /Already invited/);
  assert.match(html, /original link/);
});

test("ships the real guest and host controls", async () => {
  const fs = await import("node:fs/promises");
  const guest = await fs.readFile(new URL("../app/components/GuestExperience.tsx", import.meta.url), "utf8");
  const host = await fs.readFile(new URL("../app/components/AdminExperience.tsx", import.meta.url), "utf8");
  assert.match(guest, /Tonight’s/);
  assert.match(guest, /Place order/);
  assert.match(guest, /Global order line/);
  assert.match(guest, /RSVP for the evening/);
  assert.match(host, /Start making/);
  assert.match(host, /Mark ready/);
  assert.match(host, /Auto-archives/);
  assert.match(host, /Invitation manager/);
});
