import assert from "node:assert/strict";
import test from "node:test";

test("defines the private Caféhaus landing page", async () => {
  const fs = await import("node:fs/promises");
  const page = await fs.readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  const layout = await fs.readFile(new URL("../app/layout.tsx", import.meta.url), "utf8");
  assert.match(layout, /Caféhaus After Dark/);
  assert.match(page, /Invitation only/);
  assert.match(page, /Already invited/);
  assert.match(page, /original link/);
});

test("ships the real guest and host controls", async () => {
  const fs = await import("node:fs/promises");
  const guest = await fs.readFile(new URL("../app/components/GuestExperience.tsx", import.meta.url), "utf8");
  const host = await fs.readFile(new URL("../app/components/AdminExperience.tsx", import.meta.url), "utf8");
  assert.match(guest, /Tonight’s/);
  assert.match(guest, /Place order/);
  assert.match(guest, /Global order line/);
  assert.match(guest, /RSVP for the evening/);
  assert.match(guest, /Changed your mind/);
  assert.match(guest, /Order alerts/);
  assert.match(guest, /Caf or decaf/);
  assert.doesNotMatch(guest, /Add to Home Screen/);
  assert.match(host, /Start making/);
  assert.match(host, /Mark ready/);
  assert.match(host, /Auto-archives/);
  assert.match(host, /Invitation manager/);
  assert.match(host, /Declined/);
  assert.match(host, /parentGuestName/);
});
