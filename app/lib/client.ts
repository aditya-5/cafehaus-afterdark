import type { DrinkRecord, EventRecord } from "../types";

export async function requestJson<T>(input: RequestInfo | URL, init?: RequestInit): Promise<T> {
  const response = await fetch(input, init);
  const body = await response.json().catch(() => ({})) as { error?: string } & T;
  if (!response.ok) throw new Error(body.error || `Request failed (${response.status})`);
  return body;
}

export function oneWordTitleCase(value: string) {
  const firstWord = value.trimStart().split(/\s+/)[0]?.toLocaleLowerCase("en-GB") ?? "";
  return firstWord.replace(/(^|[-'])\p{L}/gu, (letter) => letter.toLocaleUpperCase("en-GB"));
}

export function phoneInput(value: string) {
  const hasLeadingPlus = value.trimStart().startsWith("+");
  const digits = value.replace(/\D/g, "").slice(0, 15);
  return `${hasLeadingPlus ? "+" : ""}${digits}`;
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

export function maskPhone(value: string) {
  const visible = value.replace(/\D/g, "").slice(-4);
  return `•••• ${visible}`;
}

export function recipeItems(drink: DrinkRecord) {
  try {
    const parsed = JSON.parse(drink.recipeJson);
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}

export function drinkAllergens(drink: DrinkRecord) {
  const ingredients = recipeItems(drink).join(" ").toLocaleLowerCase("en-GB");
  const allergens: string[] = [];
  if (/milk|cream|butter|condensed|nutella|cheesecake/.test(ingredients)) allergens.push("Milk");
  if (/pistachio|hazelnut|nutella|almond|mixed nuts|chopped nuts/.test(ingredients)) allergens.push("Tree nuts");
  if (/oreo|biscoff|biscuit|cookie|oat/.test(ingredients)) allergens.push("Cereals containing gluten");
  return allergens;
}

export function customizedRecipe(drink: DrinkRecord, customizations: Record<string, string>) {
  const milk = customizations.milk || "Chosen milk";
  const caffeine = customizations.caffeine || "Caffeinated";
  const sweetness = customizations.sweetness || "Normal sweetness";
  const items = recipeItems(drink).map((item) => {
    let tailored = item;
    if (/espresso/i.test(tailored)) tailored = tailored.replace(/espresso/gi, caffeine === "Decaf" ? "decaf espresso" : "espresso");
    if (/^cold milk$/i.test(tailored)) tailored = `${milk}, cold`;
    else if (/^frothed milk$/i.test(tailored)) tailored = `${milk}, frothed`;
    else if (/^milk$/i.test(tailored)) tailored = milk;
    else if (/^oat milk$/i.test(tailored)) tailored = milk;
    return tailored;
  });
  const sweetnessInstruction = sweetness === "No added sweetness"
    ? "Skip optional sugar and finishing sweetener"
    : sweetness === "Less sweet"
      ? "Use half the optional sugar or finishing syrup"
      : "Use the standard sweetness in the base recipe";
  return {
    items,
    instructions: [`Coffee · ${caffeine}`, `Milk · ${milk}`, `Sweetness · ${sweetnessInstruction}`],
  };
}

export function espressoShots(drink: DrinkRecord) {
  const ingredients = recipeItems(drink);
  return ingredients.reduce((total, ingredient) => total + (/double espresso/i.test(ingredient) ? 2 : /espresso/i.test(ingredient) ? 1 : 0), 0);
}

function calendarTimestamp(value: Date) {
  return value.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

function calendarEscape(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/,/g, "\\,").replace(/;/g, "\\;");
}

export function downloadCalendar(event: EventRecord) {
  const start = new Date(event.startsAt);
  const end = event.endsAt ? new Date(event.endsAt) : new Date(start.getTime() + 4 * 60 * 60_000);
  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Cafehaus After Dark//Event//EN",
    "BEGIN:VEVENT",
    `UID:${event.id}@afterdark.adityagarwal.com`,
    `DTSTAMP:${calendarTimestamp(new Date())}`,
    `DTSTART:${calendarTimestamp(start)}`,
    `DTEND:${calendarTimestamp(end)}`,
    `SUMMARY:${calendarEscape(event.title)}`,
    `LOCATION:${calendarEscape(event.address)}`,
    "DESCRIPTION:Coffee made to order on Aditya’s rooftop.",
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
  const url = URL.createObjectURL(new Blob([ics], { type: "text/calendar;charset=utf-8" }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "adityas-rooftop-party.ics";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
}
