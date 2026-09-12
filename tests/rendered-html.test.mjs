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

test("server-renders the Caféhaus event shell", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>Caféhaus After Dark<\/title>/i);
  assert.match(html, /You&apos;re on|You&#x27;re on/);
  assert.match(html, /Your response/);
  assert.match(html, /RSVP yes/);
});

test("ships the core guest and host controls", async () => {
  const page = await (await import("node:fs/promises")).readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  assert.match(page, /Tonight's menu|Tonight&apos;s menu/);
  assert.match(page, /Add to order/);
  assert.match(page, /Start making/);
  assert.match(page, /Mark ready/);
  assert.match(page, /Auto-archive/);
  assert.match(page, /RsvpSheet/);
  assert.match(page, /YouTube playlist/);
});
