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

export function withoutTokenHash<T extends { tokenHash: string }>(value: T): Omit<T, "tokenHash"> {
  const safe = { ...value } as Partial<T>;
  delete safe.tokenHash;
  return safe as Omit<T, "tokenHash">;
}

export function requireAdmin(request: Request) {
  const configured = process.env.ADMIN_API_KEY;
  const provided = request.headers.get("x-admin-key");
  if (!configured) return jsonError("Admin API is not configured yet. Set ADMIN_API_KEY before enabling host mutations.", 503);
  if (!provided || provided !== configured) return jsonError("Admin authentication required.", 401);
  return null;
}

export function routeError(error: unknown) {
  const diagnosticChain = [];
  let current: unknown = error;

  for (let depth = 0; depth < 4 && current && typeof current === "object"; depth += 1) {
    const candidate = current as {
      name?: unknown;
      message?: unknown;
      code?: unknown;
      detail?: unknown;
      hint?: unknown;
      cause?: unknown;
    };
    const redact = (value: unknown) => typeof value === "string"
      ? value.replace(/postgres(?:ql)?:\/\/\S+/gi, "[database URL redacted]")
      : value;

    diagnosticChain.push({
      name: redact(candidate.name),
      message: redact(candidate.message),
      code: redact(candidate.code),
      detail: redact(candidate.detail),
      hint: redact(candidate.hint),
    });
    current = candidate.cause;
  }

  console.error("API route failure", diagnosticChain);

  const message = error instanceof Error ? error.message : "Unexpected server error";
  if (message.includes("relation") && message.includes("does not exist")) return "Database migration is not applied yet. Run the database migration before using this endpoint.";
  return message;
}
