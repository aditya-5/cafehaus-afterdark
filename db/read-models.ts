import { asc, eq } from "drizzle-orm";
import type { getDb } from ".";
import { drinks, guests, orders } from "./schema";

type Database = ReturnType<typeof getDb>;

function parseCustomizations(value: string) {
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

export async function getEventOrderViews(db: Database, eventId: string) {
  const [orderRows, guestRows, drinkRows] = await Promise.all([
    db.select().from(orders).where(eq(orders.eventId, eventId)).orderBy(asc(orders.createdAt)),
    db.select({ id: guests.id, firstName: guests.firstName }).from(guests).where(eq(guests.eventId, eventId)),
    db.select({ id: drinks.id, name: drinks.name, prepMinutes: drinks.prepMinutes }).from(drinks).where(eq(drinks.eventId, eventId)),
  ]);

  const guestNames = new Map(guestRows.map((guest) => [guest.id, guest.firstName]));
  const drinkDetails = new Map(drinkRows.map((drink) => [drink.id, drink]));

  return orderRows.map((order) => ({
    ...order,
    guestName: guestNames.get(order.guestId) ?? "Guest",
    drinkName: drinkDetails.get(order.drinkId)?.name ?? "Coffee",
    prepMinutes: drinkDetails.get(order.drinkId)?.prepMinutes ?? 3,
    customizations: parseCustomizations(order.customizationsJson),
  }));
}

