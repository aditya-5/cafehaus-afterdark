import { neon } from "@neondatabase/serverless";

function readRuntimeEnvironment(name) {
  const processValue = process.env[name]?.trim();
  if (processValue) return processValue;

  const netlifyValue = globalThis.Netlify?.env?.get?.(name)?.trim();
  return netlifyValue || undefined;
}

function errorDetails(error) {
  const details = [];
  let current = error;

  for (let depth = 0; depth < 4 && current && typeof current === "object"; depth += 1) {
    const redact = (value) => typeof value === "string"
      ? value.replace(/postgres(?:ql)?:\/\/\S+/gi, "[database URL redacted]")
      : value;

    details.push({
      name: redact(current.name),
      message: redact(current.message),
      code: redact(current.code),
      detail: redact(current.detail),
      hint: redact(current.hint),
    });
    current = current.cause;
  }

  return details;
}

export default async (request) => {
  const adminKey = readRuntimeEnvironment("ADMIN_API_KEY");
  if (!adminKey || request.headers.get("x-admin-key") !== adminKey) {
    return Response.json({ error: "Admin authentication required." }, { status: 401 });
  }

  const databaseUrl = readRuntimeEnvironment("DATABASE_URL") ?? readRuntimeEnvironment("NETLIFY_DB_URL");
  const status = {
    runtime: "netlify-function",
    databaseUrlPresent: Boolean(databaseUrl),
    databaseUrlLooksLikePostgres: /^postgres(?:ql)?:\/\//i.test(databaseUrl ?? ""),
    adminKeyPresent: Boolean(adminKey),
    databaseReachable: false,
    eventsTablePresent: false,
  };

  if (databaseUrl) {
    try {
      const sql = neon(databaseUrl);
      const [result] = await sql.query("select to_regclass('public.events') is not null as events_table_present", []);
      status.databaseReachable = true;
      status.eventsTablePresent = result?.events_table_present === true;
    } catch (error) {
      return Response.json(
        { ...status, databaseError: errorDetails(error) },
        { status: 503, headers: { "cache-control": "no-store" } },
      );
    }
  }

  return Response.json(
    status,
    {
      headers: {
        "cache-control": "no-store",
      },
    },
  );
};

export const config = {
  path: "/api/runtime-health",
};
