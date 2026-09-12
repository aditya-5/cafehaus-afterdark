function readRuntimeEnvironment(name) {
  const processValue = process.env[name]?.trim();
  if (processValue) return processValue;

  const netlifyValue = globalThis.Netlify?.env?.get?.(name)?.trim();
  return netlifyValue || undefined;
}

export default async () => {
  const databaseUrl = readRuntimeEnvironment("DATABASE_URL") ?? readRuntimeEnvironment("NETLIFY_DB_URL");

  return Response.json(
    {
      runtime: "netlify-function",
      databaseUrlPresent: Boolean(databaseUrl),
      databaseUrlLooksLikePostgres: /^postgres(?:ql)?:\/\//i.test(databaseUrl ?? ""),
      adminKeyPresent: Boolean(readRuntimeEnvironment("ADMIN_API_KEY")),
    },
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
