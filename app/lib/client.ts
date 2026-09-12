export async function requestJson<T>(input: RequestInfo | URL, init?: RequestInit): Promise<T> {
  const response = await fetch(input, init);
  const body = await response.json().catch(() => ({})) as { error?: string } & T;
  if (!response.ok) throw new Error(body.error || `Request failed (${response.status})`);
  return body;
}

export function oneWordTitleCase(value: string) {
  const firstWord = value.trimStart().split(/\s+/)[0] ?? "";
  return firstWord.replace(/(^|[-'])\p{L}/gu, (letter) => letter.toUpperCase());
}

export function formatEventDate(value: string) {
  return new Intl.DateTimeFormat("en-GB", { weekday: "long", day: "numeric", month: "long" }).format(new Date(value));
}

export function formatEventTime(value: string) {
  return new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}

export function formatClock(value: string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}

export function customizationLine(customizations: Record<string, string>) {
  return Object.values(customizations).filter(Boolean).join(" · ");
}
