"use client";

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { AdminInvitationRecord, AdminSnapshot, DrinkRecord, OrderStatus, OrderView, ServiceMode } from "../types";
import { customizationLine, customizedRecipe, espressoShots, formatClock, formatEventDate, oneWordTitleCase, phoneInput, recipeItems, requestJson } from "../lib/client";
import { Brand } from "./Brand";

const EVENT_ID = "afterdark-2026";

type RecipeSelection = { drink: DrinkRecord; order?: OrderView };

export function AdminExperience() {
  const [pin, setPin] = useState("");
  const [snapshot, setSnapshot] = useState<AdminSnapshot | null>(null);
  const [loginError, setLoginError] = useState("");
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState("");
  const [recipe, setRecipe] = useState<RecipeSelection | null>(null);
  const [latestInvite, setLatestInvite] = useState<{ name: string; phone: string; url: string } | null>(null);
  const [clock, setClock] = useState(() => Date.now());
  const notifiedTimers = useRef(new Set<string>());

  const load = useCallback(async (adminPin: string, quiet = false) => {
    if (!quiet) setLoading(true);
    try {
      const data = await requestJson<AdminSnapshot>(`/api/host/dashboard?eventId=${EVENT_ID}`, { headers: { "x-admin-key": adminPin }, cache: "no-store" });
      setSnapshot(data);
      setLoginError("");
      window.sessionStorage.setItem("cafehaus-admin-pin", adminPin);
    } catch (error) {
      if (!quiet) setLoginError(error instanceof Error ? error.message : "Could not open the host console.");
      if (!quiet) setSnapshot(null);
    } finally {
      if (!quiet) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const savedPin = window.sessionStorage.getItem("cafehaus-admin-pin");
    if (!savedPin) return;
    const timer = window.setTimeout(() => { setPin(savedPin); void load(savedPin); }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  useEffect(() => {
    if (!snapshot) return;
    const refresh = window.setInterval(() => void load(pin, true), 8_000);
    return () => window.clearInterval(refresh);
  }, [load, pin, snapshot]);

  useEffect(() => {
    if (!snapshot?.orders.some((order) => order.status === "making")) return;
    const timer = window.setInterval(() => setClock(Date.now()), 1_000);
    return () => window.clearInterval(timer);
  }, [snapshot]);

  useEffect(() => {
    if (!snapshot) return;
    const newlyDue = snapshot.orders.filter((order) => order.status === "making" && order.makingAt && clock >= new Date(order.makingAt).getTime() + order.prepMinutes * 60_000 && !notifiedTimers.current.has(order.id));
    if (!newlyDue.length) return;
    for (const order of newlyDue) notifiedTimers.current.add(order.id);
    const first = newlyDue[0];
    setToast(`${first.orderNumber} timer is due · check ${first.guestName}’s ${first.drinkName}`);
    window.setTimeout(() => setToast(""), 4_200);
    if ("vibrate" in navigator) navigator.vibrate([140, 70, 140]);
  }, [clock, snapshot]);

  useEffect(() => {
    if (!snapshot) return;
    const staleReady = snapshot.orders.filter((order) => order.status === "ready" && order.readyAt && Date.now() - new Date(order.readyAt).getTime() >= 5 * 60_000);
    if (!staleReady.length) return;
    void Promise.all(staleReady.map((order) => adminRequest(pin, `/api/host/orders/${order.id}`, { method: "PATCH", body: JSON.stringify({ status: "archived" }) }))).then(() => load(pin, true));
  }, [load, pin, snapshot]);

  const notify = (message: string) => { setToast(message); window.setTimeout(() => setToast(""), 3_400); };
  const mutate = async (url: string, init: RequestInit, message: string) => {
    await adminRequest(pin, url, init);
    await load(pin, true);
    notify(message);
  };

  if (!snapshot) return <AdminLogin pin={pin} onPin={setPin} loading={loading} error={loginError} onSubmit={(submittedPin) => void load(submittedPin)} />;

  const visibleOrders = snapshot.orders.filter((order) => order.status !== "cancelled");
  const drinksById = new Map(snapshot.drinks.map((drink) => [drink.id, drink]));
  const served = visibleOrders.filter((order) => order.status === "ready" || order.status === "archived").length;
  const sections: Array<{ status: OrderStatus; title: string; note: string }> = [
    { status: "making", title: "Making now", note: "Live recipe timers on your counter" },
    { status: "queued", title: "Up next", note: "Ordered by placement time" },
    { status: "ready", title: "Collection tray", note: "Auto-archives after five minutes" },
    { status: "archived", title: "Earlier tonight", note: "The cups already served" },
  ];

  return (
    <main className="event-app admin-app">
      <div className="grain" aria-hidden="true" />
      <header className="topbar">
        <Brand host />
        <div className="topbar-actions">
          <span className={`event-state ${snapshot.event.status}`}><i />{serviceLabel(snapshot.event.serviceMode, snapshot.event.status)}</span>
          <button className="mode-button subtle" onClick={() => { window.sessionStorage.removeItem("cafehaus-admin-pin"); setSnapshot(null); setPin(""); }}>Lock console</button>
        </div>
      </header>

      <section className="host-shell real-host-shell">
        <div className="host-heading">
          <div><p className="kicker">{formatEventDate(snapshot.event.startsAt)}</p><h1>Behind the<br /><em>bar.</em></h1></div>
          <div className="host-actions"><button className="primary-button" onClick={() => void mutate(`/api/host/events/${snapshot.event.id}`, { method: "PATCH", body: JSON.stringify({ status: snapshot.event.status === "ended" ? "scheduled" : "ended", orderingEnabled: false }) }, snapshot.event.status === "ended" ? "Event reopened" : "Event ended")}>{snapshot.event.status === "ended" ? "Reopen event" : "End event"}</button></div>
        </div>

        <ServiceControl event={snapshot.event} onSave={(settings, message) => void mutate(`/api/host/events/${snapshot.event.id}`, { method: "PATCH", body: JSON.stringify(settings) }, message)} />

        <div className="host-stat-grid">
          <div><span>Making</span><strong>{visibleOrders.filter((order) => order.status === "making").length}</strong></div>
          <div><span>Queued</span><strong>{visibleOrders.filter((order) => order.status === "queued").length}</strong></div>
          <div><span>Served</span><strong>{served}</strong></div>
          <div><span>Guests</span><strong>{snapshot.guests.filter((guest) => guest.rsvpResponse === "yes").length}</strong></div>
        </div>

        <PrepSummary orders={visibleOrders} drinks={snapshot.drinks} />

        <div className="queue-board">
          {sections.map((section) => (
            <HostOrderColumn
              key={section.status}
              section={section}
              orders={visibleOrders.filter((order) => order.status === section.status)}
              nowMs={clock}
              onRecipe={(order) => { const drink = drinksById.get(order.drinkId); if (drink) setRecipe({ drink, order }); }}
              onStatus={(order, status) => void mutate(`/api/host/orders/${order.id}`, { method: "PATCH", body: JSON.stringify({ status }) }, status === "ready" ? `${order.orderNumber} is on the tray` : `${order.orderNumber} moved to ${status}`)}
            />
          ))}
        </div>
      </section>

      <TokenRoom snapshot={snapshot} onAction={(action, guestId) => void mutate("/api/host/tokens", { method: "POST", body: JSON.stringify({ eventId: snapshot.event.id, action, guestId }) }, action === "reset_all" ? "Everyone reset to two tokens" : action === "add_all" ? "One token added to the room" : "Token added")} />
      <InvitationRoom snapshot={snapshot} pin={pin} onRefresh={() => load(pin, true)} onLatest={setLatestInvite} onToast={notify} />
      <DrinkRoom snapshot={snapshot} onRecipe={(drink) => setRecipe({ drink })} onToggle={(drink) => void mutate(`/api/host/drinks/${drink.id}`, { method: "PATCH", body: JSON.stringify({ available: !drink.available }) }, `${drink.name} ${drink.available ? "paused" : "is available"}`)} />
      {recipe && <RecipeSheet selection={recipe} onClose={() => setRecipe(null)} />}
      {latestInvite && <InviteShare invite={latestInvite} onClose={() => setLatestInvite(null)} onToast={notify} />}
      {toast && <div className="toast" role="status">{toast}</div>}
    </main>
  );
}

async function adminRequest<T>(pin: string, url: string, init: RequestInit = {}) {
  return requestJson<T>(url, { ...init, headers: { "content-type": "application/json", "x-admin-key": pin, ...(init.headers ?? {}) } });
}

function serviceLabel(mode: ServiceMode, status: AdminSnapshot["event"]["status"]) {
  if (status === "ended") return "Evening ended";
  if (mode === "open") return "Service open";
  if (mode === "last_orders") return "Last orders";
  if (mode === "paused") return "Service paused";
  return "Service closed";
}

function AdminLogin({ pin, onPin, onSubmit, loading, error }: { pin: string; onPin: (value: string) => void; onSubmit: (pin: string) => void; loading: boolean; error: string }) {
  const submit = (event: FormEvent) => { event.preventDefault(); if (pin.length === 4 && !loading) onSubmit(pin); };
  const changePin = (value: string) => {
    const nextPin = value.replace(/\D/g, "").slice(0, 4);
    onPin(nextPin);
    if (nextPin.length === 4 && !loading) window.setTimeout(() => onSubmit(nextPin), 0);
  };
  return <main className="event-app admin-login"><div className="grain" aria-hidden="true" /><section><Brand host /><p className="kicker">Private host access</p><h1>Your counter,<br /><em>locked.</em></h1><p className="intro">Enter the four-digit host PIN. The console opens as soon as the fourth digit is entered.</p><form onSubmit={submit}><label className="field-label pin-label">Host PIN<input value={pin} onChange={(event) => changePin(event.target.value)} inputMode="numeric" autoComplete="one-time-code" type="password" maxLength={4} placeholder="••••" /></label>{error && <p className="form-error">{error}</p>}<button className="primary-button" disabled={pin.length !== 4 || loading}>{loading ? "Opening…" : "Open host console"}</button></form></section></main>;
}

function ServiceControl({ event, onSave }: { event: AdminSnapshot["event"]; onSave: (settings: Record<string, unknown>, message: string) => void }) {
  const [message, setMessage] = useState(event.serviceMessage ?? "");
  const [deadline, setDeadline] = useState(event.rsvpDeadline ? localDateTime(event.rsvpDeadline) : "");
  const modes: Array<{ value: ServiceMode; label: string; note: string }> = [
    { value: "open", label: "Open", note: "Orders join the line" },
    { value: "paused", label: "Pause", note: "Menu stays visible" },
    { value: "last_orders", label: "Last orders", note: "Final-call banner" },
    { value: "closed", label: "Close", note: "No new orders" },
  ];
  return (
    <section className="service-console">
      <div className="service-console-head"><div><p className="section-label">Service control</p><h2>Set the room’s tempo</h2></div><span className={`service-live-mark ${event.serviceMode}`}>{serviceLabel(event.serviceMode, event.status)}</span></div>
      <div className="service-mode-grid">{modes.map((mode) => <button key={mode.value} className={event.serviceMode === mode.value ? "active" : ""} onClick={() => onSave({ serviceMode: mode.value }, `${mode.label} mode selected`)}><strong>{mode.label}</strong><small>{mode.note}</small></button>)}</div>
      <div className="service-settings-grid">
        <label className="service-message-field"><span>Guest-facing message</span><textarea value={message} maxLength={160} placeholder="Back in ten minutes…" onChange={(change) => setMessage(change.target.value)} /><button className="secondary-button" onClick={() => onSave({ serviceMessage: message }, "Service message saved")}>Save message</button></label>
        <div className="stock-switches"><span>Tonight’s stock</span><button className={event.oatMilkAvailable ? "available" : "sold-out"} onClick={() => onSave({ oatMilkAvailable: !event.oatMilkAvailable }, event.oatMilkAvailable ? "Oat milk marked sold out" : "Oat milk restored")}>Oat milk <strong>{event.oatMilkAvailable ? "Available" : "Sold out"}</strong></button><button className={event.decafAvailable ? "available" : "sold-out"} onClick={() => onSave({ decafAvailable: !event.decafAvailable }, event.decafAvailable ? "Decaf marked sold out" : "Decaf restored")}>Decaf <strong>{event.decafAvailable ? "Available" : "Sold out"}</strong></button></div>
        <label className="deadline-control"><span>RSVP requested by</span><input type="datetime-local" value={deadline} onChange={(change) => setDeadline(change.target.value)} /><button className="secondary-button" onClick={() => onSave({ rsvpDeadline: deadline ? new Date(deadline).toISOString() : null }, "RSVP deadline saved")}>Save deadline</button></label>
      </div>
    </section>
  );
}

function localDateTime(value: string) {
  const date = new Date(value);
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

function PrepSummary({ orders, drinks }: { orders: OrderView[]; drinks: DrinkRecord[] }) {
  const drinksById = new Map(drinks.map((drink) => [drink.id, drink]));
  const next = [...orders.filter((order) => order.status === "making"), ...orders.filter((order) => order.status === "queued")].slice(0, 3);
  const shots = next.reduce((total, order) => total + (drinksById.get(order.drinkId) ? espressoShots(drinksById.get(order.drinkId)!) : 0), 0);
  const decaf = next.filter((order) => order.customizations.caffeine === "Decaf").length;
  const milks = new Map<string, number>();
  for (const order of next) {
    const milk = order.customizations.milk || "No milk selection";
    milks.set(milk, (milks.get(milk) ?? 0) + 1);
  }
  return <section className="prep-summary"><div><p className="section-label">Mise en place · next three</p><h2>{next.length ? `${next.length} cups in the working set` : "The counter is clear"}</h2></div><div className="prep-metrics"><span><strong>{shots}</strong> espresso shots</span><span><strong>{decaf}</strong> decaf</span>{[...milks].map(([milk, count]) => <span key={milk}><strong>{count}</strong> {milk}</span>)}</div></section>;
}

function HostOrderColumn({ section, orders, nowMs, onStatus, onRecipe }: { section: { status: OrderStatus; title: string; note: string }; orders: OrderView[]; nowMs: number; onStatus: (order: OrderView, status: OrderStatus) => void; onRecipe: (order: OrderView) => void }) {
  return <section className={`queue-column ${section.status}`}><div className="panel-head"><div><p className="section-label">{section.title}</p><small>{section.note}</small></div><strong>{orders.length}</strong></div><div className="host-order-list">{orders.map((order) => { const remaining = order.makingAt ? new Date(order.makingAt).getTime() + order.prepMinutes * 60_000 - nowMs : null; const timerDue = remaining !== null && remaining <= 0; return <article className={`host-order-card ${timerDue ? "timer-due" : ""}`} key={order.id}><div className="host-order-top"><span className="order-number">{order.orderNumber}</span><span>{formatClock(order.createdAt)}</span></div><div className="host-order-identity"><h3>{order.guestName}</h3><p className="host-drink-name">{order.drinkName}</p></div><p className="host-mods">{customizationLine(order.customizations)}</p>{remaining !== null && <div className={`recipe-timer ${timerDue ? "due" : ""}`}><span>{timerDue ? "Timer due" : countdown(remaining)}</span><small>{timerDue ? "Check the cup now" : `Recipe target · ${order.prepMinutes} min`}</small></div>}<div className="host-card-actions"><button className="recipe-button" onClick={() => onRecipe(order)}>Exact recipe</button>{order.status === "queued" && <button className="primary-button service-action" onClick={() => onStatus(order, "making")}>Start making</button>}{order.status === "making" && <button className="primary-button ready-action service-action" onClick={() => onStatus(order, "ready")}>Ready on tray</button>}{order.status === "ready" && <button className="secondary-button" onClick={() => onStatus(order, "archived")}>Archive</button>}</div></article>; })}{orders.length === 0 && <p className="column-empty">Nothing here.</p>}</div></section>;
}

function countdown(milliseconds: number) {
  const seconds = Math.max(0, Math.ceil(milliseconds / 1_000));
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

function TokenRoom({ snapshot, onAction }: { snapshot: AdminSnapshot; onAction: (action: "add_one" | "add_all" | "reset_all" | "fulfill_request", guestId?: string) => void }) {
  const activeGuests = snapshot.guests.filter((guest) => guest.rsvpResponse === "yes");
  return <section className="host-tools token-room"><div className="panel-head"><div><p className="section-label">Coffee passes & plus ones</p><h2>Top up the room</h2><p>Every accepted guest has their own +1 token button. Coral cards have requested more.</p></div><div className="host-tool-actions"><button className="secondary-button" onClick={() => onAction("add_all")}>+1 for everyone</button><button className="primary-button" onClick={() => onAction("reset_all")}>Reset all to 2</button></div></div><div className="balance-strip">{activeGuests.map((guest) => { const plusOne = snapshot.invitations.find((invitation) => invitation.guestId === guest.id && invitation.parentGuestId); return <button key={guest.id} aria-label={`Add one token to ${guest.firstName}`} className={`balance-chip ${guest.tokenRequestStatus === "requested" ? "requested" : ""} ${plusOne ? "is-plus-one" : ""}`} onClick={() => onAction(guest.tokenRequestStatus === "requested" ? "fulfill_request" : "add_one", guest.id)}><span className="balance-name"><strong>{guest.firstName}</strong><small className={plusOne ? "plus-one-owner" : "pass-owner"}>{plusOne ? `${plusOne.parentGuestName} +1` : "Coffee pass"}</small>{guest.tokenRequestStatus === "requested" && <small className="request-badge">Requested more</small>}</span><span className="balance-action"><span className="balance-count">{guest.tokenBalance} {guest.tokenBalance === 1 ? "token" : "tokens"}</span><span className="balance-add">+1 token</span></span></button>; })}</div></section>;
}

function invitationLabel(invitation: AdminInvitationRecord) {
  if (invitation.status === "rescinded") return "Rescinded";
  if (invitation.rsvpResponse === "yes") return "Accepted";
  if (invitation.rsvpResponse === "maybe") return "Maybe";
  if (invitation.rsvpResponse === "no") return "Declined";
  return invitation.status.charAt(0).toUpperCase() + invitation.status.slice(1);
}

function invitationTone(invitation: AdminInvitationRecord) {
  if (invitation.status === "rescinded") return "rescinded";
  return invitation.rsvpResponse ? `response-${invitation.rsvpResponse}` : invitation.status;
}

function InvitationRoom({ snapshot, pin, onRefresh, onLatest, onToast }: { snapshot: AdminSnapshot; pin: string; onRefresh: () => Promise<void>; onLatest: (invite: { name: string; phone: string; url: string }) => void; onToast: (message: string) => void }) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [sending, setSending] = useState(false);
  const [editingContact, setEditingContact] = useState<string | null>(null);
  const [editedPhone, setEditedPhone] = useState("");
  const create = async (event: FormEvent) => { event.preventDefault(); setSending(true); try { const result = await adminRequest<{ inviteUrl: string }>(pin, "/api/invitations", { method: "POST", body: JSON.stringify({ eventId: snapshot.event.id, name, phone }) }); onLatest({ name, phone, url: result.inviteUrl }); setName(""); setPhone(""); await onRefresh(); onToast("Invitation created"); } catch (error) { onToast(error instanceof Error ? error.message : "Could not create invitation"); } finally { setSending(false); } };
  const rescind = async (invitation: AdminInvitationRecord) => { try { await adminRequest(pin, `/api/invitations/${invitation.id}`, { method: "PATCH", body: JSON.stringify({ action: "rescind" }) }); await onRefresh(); onToast("Invitation rescinded"); } catch (error) { onToast(error instanceof Error ? error.message : "Could not update invitation"); } };
  const copyLink = async (invitation: AdminInvitationRecord) => { try { await navigator.clipboard.writeText(`${window.location.origin}/rsvp/${invitation.id}`); onToast(`${invitation.invitedName}’s link copied`); } catch { onToast("Could not copy the invitation link"); } };
  const shareLink = async (invitation: AdminInvitationRecord) => { const url = `${window.location.origin}/rsvp/${invitation.id}`; try { if (navigator.share) await navigator.share({ title: snapshot.event.title, text: `Hi ${invitation.invitedName}, here is your private invitation.`, url }); else await copyLink(invitation); } catch (error) { if (error instanceof DOMException && error.name === "AbortError") return; onToast("Could not open the share sheet"); } };
  const saveContact = async (invitation: AdminInvitationRecord) => { try { await adminRequest(pin, `/api/invitations/${invitation.id}`, { method: "PATCH", body: JSON.stringify({ action: "update_contact", phone: editedPhone }) }); setEditingContact(null); await onRefresh(); onToast("Mobile number updated"); } catch (error) { onToast(error instanceof Error ? error.message : "Could not update the number"); } };
  return <section className="host-tools invite-manager"><p className="section-label">Invitation manager</p><h2>Invite someone</h2><p>Create the unique link, then send it through Messages, WhatsApp or the phone’s share sheet. Guests cannot change the number attached to their invitation.</p><form className="invite-create" onSubmit={create}><input value={name} onChange={(event) => setName(oneWordTitleCase(event.target.value))} placeholder="First name" required /><input value={phone} onChange={(event) => setPhone(phoneInput(event.target.value))} placeholder="Mobile number" inputMode="tel" pattern="\+?[0-9]{7,15}" maxLength={16} title="Use 7 to 15 digits, with an optional + at the start" required /><button className="primary-button" disabled={sending}>{sending ? "Creating…" : "Create invite"}</button></form><div className="invitation-list">{snapshot.invitations.map((invitation) => <div className="invitation-row" key={invitation.id}><div><strong>{invitation.invitedName}</strong>{editingContact === invitation.id ? <div className="contact-editor"><input value={editedPhone} onChange={(event) => setEditedPhone(phoneInput(event.target.value))} inputMode="tel" maxLength={16} /><button onClick={() => void saveContact(invitation)}>Save</button><button onClick={() => setEditingContact(null)}>Cancel</button></div> : <small>{invitation.parentGuestName ? `${invitation.parentGuestName}’s +1 · ${invitation.invitedPhoneE164}` : invitation.invitedPhoneE164}</small>}</div><span className={`invite-status ${invitationTone(invitation)}`}>{invitationLabel(invitation)}</span><div className="invitation-actions">{invitation.status !== "rescinded" && <><button onClick={() => void shareLink(invitation)}>Share</button><button onClick={() => void copyLink(invitation)}>Copy link</button><button onClick={() => { setEditingContact(invitation.id); setEditedPhone(invitation.invitedPhoneE164); }}>Change number</button><button onClick={() => void rescind(invitation)}>Rescind</button></>}</div></div>)}</div></section>;
}

function DrinkRoom({ snapshot, onRecipe, onToggle }: { snapshot: AdminSnapshot; onRecipe: (drink: DrinkRecord) => void; onToggle: (drink: DrinkRecord) => void }) {
  const categories = useMemo(() => Array.from(new Set(snapshot.drinks.map((drink) => drink.category))), [snapshot.drinks]);
  return <section className="host-tools drinks-room"><div className="panel-head"><div><p className="section-label">Menu controls</p><h2>{snapshot.drinks.filter((drink) => drink.available).length} drinks available</h2><p>Pause individual drinks here. Global oat and decaf stock lives in Service control.</p></div></div>{categories.map((category) => <div className="admin-drink-group" key={category}><h3>{category}</h3>{snapshot.drinks.filter((drink) => drink.category === category).map((drink) => <div className={`admin-drink-row ${drink.available ? "" : "paused"}`} key={drink.id}><div><strong>{drink.name}</strong><small>About {drink.prepMinutes} min · {drink.caffeine}</small></div><button className="mode-button" onClick={() => onRecipe(drink)}>Base recipe</button><button className={`availability-toggle ${drink.available ? "on" : ""}`} onClick={() => onToggle(drink)}>{drink.available ? "Available" : "Paused"}</button></div>)}</div>)}</section>;
}

function RecipeSheet({ selection, onClose }: { selection: RecipeSelection; onClose: () => void }) {
  const { drink, order } = selection;
  const recipe = order ? customizedRecipe(drink, order.customizations) : { items: recipeItems(drink), instructions: [] };
  return <div className="modal-backdrop"><section className="recipe-sheet order-recipe-sheet"><button className="close-button" onClick={onClose}>×</button><p className="section-label">{order ? `${order.orderNumber} · ${order.guestName} · about ${drink.prepMinutes} min` : `Base recipe · about ${drink.prepMinutes} min`}</p><h2>{drink.name}</h2>{order && <div className="recipe-custom-strip">{recipe.instructions.map((instruction) => <span key={instruction}>{instruction}</span>)}</div>}<p className="recipe-note">{order ? "Build this exact cup from the tailored list below." : "The complete static recipe can replace this ingredient list when you provide it."}</p><ol>{recipe.items.map((step, index) => <li key={`${step}-${index}`}><span className="step-dot" />{step}</li>)}</ol><footer className="recipe-footer"><span>{drink.category}</span><span>{order ? customizationLine(order.customizations) : drink.caffeine}</span></footer></section></div>;
}

function InviteShare({ invite, onClose, onToast }: { invite: { name: string; phone: string; url: string }; onClose: () => void; onToast: (message: string) => void }) {
  const body = `Hi ${invite.name}, you’re invited to Aditya’s Rooftop Party. Your private link: ${invite.url}`;
  const copy = async () => { await navigator.clipboard.writeText(body); onToast("Invitation message copied"); };
  const share = async () => { try { if (navigator.share) await navigator.share({ title: "Aditya’s Rooftop Party", text: body, url: invite.url }); else await copy(); } catch (error) { if (error instanceof DOMException && error.name === "AbortError") return; onToast("Could not open the share sheet"); } };
  return <div className="modal-backdrop"><section className="drink-sheet share-sheet"><button className="close-button" onClick={onClose}>×</button><p className="section-label">Unique invitation ready</p><h2>Send it to {invite.name}.</h2><p className="sheet-description">This is their private event link. It remains the same unless you rescind the invitation.</p><div className="share-url">{invite.url}</div><div className="share-actions share-grid"><button className="secondary-button" onClick={() => void copy()}>Copy message</button><a className="secondary-button link-button" href={`https://wa.me/?text=${encodeURIComponent(body)}`} target="_blank" rel="noreferrer">WhatsApp</a><a className="secondary-button link-button" href={`sms:${invite.phone}?&body=${encodeURIComponent(body)}`}>Messages</a><button className="primary-button" onClick={() => void share()}>Share…</button></div></section></div>;
}
