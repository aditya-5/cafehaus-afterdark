import process from "node:process";

export function jsonError(message: string, status = 400) {
  return Response.json({ error: message }, { status });
}

export function now() {
  return new Date().toISOString();
}

export function normalizePhone(value: string) {
  const digits = value.replace(/[^\d+]/g, "").replace(/^\+/, "");
  if (!digits) return "";
  if (digits.startsWith("00")) return normalizePhone(digits.slice(2));
  if (digits.startsWith("440")) return `+44${digits.slice(3)}`;
  if (digits.startsWith("44")) return `+44${digits.slice(2).replace(/^0/, "")}`;
  if (digits.startsWith("0")) return `+44${digits.slice(1)}`;
  if (digits.startsWith("7")) return `+44${digits}`;
  return `+${digits}`;
}

export function randomToken() {
  return `${crypto.randomUUID().replaceAll("-", "")}${crypto.randomUUID().replaceAll("-", "")}`;
}

export async function sha256(value: string) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function requireAdmin(request: Request) {
  const configured = process.env.ADMIN_API_KEY;
  const provided = request.headers.get("x-admin-key");
  if (!configured) return jsonError("Admin API is not configured yet. Set ADMIN_API_KEY before enabling host mutations.", 503);
  if (!provided || provided !== configured) return jsonError("Admin authentication required.", 401);
  return null;
}

export function routeError(error: unknown) {
  const message = error instanceof Error ? error.message : "Unexpected server error";
  if (message.includes("relation") && message.includes("does not exist")) return "Database migration is not applied yet. Run the database migration before using this endpoint.";
  return message;
}
