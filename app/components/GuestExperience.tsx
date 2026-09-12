"use client";

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { DrinkRecord, GuestSnapshot, OrderStatus, OrderView, RsvpResponse } from "../types";
import { customizationLine, formatClock, formatEventDate, formatEventTime, oneWordTitleCase, requestJson } from "../lib/client";
import { Brand } from "./Brand";

type GuestTab = "home" | "menu" | "orders";
type AlertMode = "off" | "in-page" | "system";

export function GuestExperience({ token }: { token: string }) {
  const [snapshot, setSnapshot] = useState<GuestSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<GuestTab>("home");
  const [rsvpOpen, setRsvpOpen] = useState(false);
  const [selectedDrink, setSelectedDrink] = useState<DrinkRecord | null>(null);
  const [editingOrder, setEditingOrder] = useState<OrderView | null>(null);
  const [shareUrl, setShareUrl] = useState("");
  const [toast, setToast] = useState("");
  const [alertMode, setAlertMode] = useState<AlertMode>(() => {
    if (typeof window === "undefined") return "off";
    const savedMode = window.localStorage.getItem(`cafehaus-alerts-${token}`);
    return savedMode === "system" || savedMode === "in-page" ? savedMode : "off";
  });
  const previousOrderStatuses = useRef<Record<string, OrderStatus> | null>(null);

  const load = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true);
    try {
      const data = await requestJson<GuestSnapshot>(`/api/invitations/token/${encodeURIComponent(token)}`, { cache: "no-store" });
      setSnapshot(data);
      setError("");
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "This invitation could not be opened.");
    } finally {
      if (!quiet) setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  useEffect(() => {
    if (!snapshot?.guest) return;
    const timer = window.setInterval(() => void load(true), 10_000);
    return () => window.clearInterval(timer);
  }, [load, snapshot?.guest]);

  const notify = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 3200);
  };

  const showOrderAlert = useCallback((title: string, body: string) => {
    setToast(`${title} · ${body}`);
    window.setTimeout(() => setToast(""), 4200);
    if (alertMode === "system" && "Notification" in window && Notification.permission === "granted") {
      void (async () => {
        try {
          const registration = "serviceWorker" in navigator ? await navigator.serviceWorker.getRegistration() : undefined;
          const options = { body, tag: "cafehaus-order", data: { url: window.location.href } };
          if (registration) await registration.showNotification(title, options);
          else new Notification(title, options);
        } catch {
          // The in-page toast above remains the fallback on restricted mobile browsers.
        }
      })();
    }
  }, [alertMode]);

  useEffect(() => {
    if (!snapshot?.guest) return;
    const mine = snapshot.orders.filter((order) => order.guestId === snapshot.guest?.id);
    const nextStatuses = Object.fromEntries(mine.map((order) => [order.id, order.status])) as Record<string, OrderStatus>;
    if (previousOrderStatuses.current) {
      for (const order of mine) {
        const previous = previousOrderStatuses.current[order.id];
        if (previous && previous !== order.status && order.status === "making") showOrderAlert(`${order.orderNumber} is being made`, order.drinkName);
        if (previous && previous !== order.status && order.status === "ready") showOrderAlert(`${order.orderNumber} is ready`, `Your ${order.drinkName} is on the collection tray.`);
      }
    }
    previousOrderStatuses.current = nextStatuses;
  }, [showOrderAlert, snapshot]);

  const toggleAlerts = async () => {
    if (alertMode !== "off") {
      setAlertMode("off");
      window.localStorage.removeItem(`cafehaus-alerts-${token}`);
      notify("Order alerts turned off");
      return;
    }

    let nextMode: AlertMode = "in-page";
    if ("Notification" in window) {
      try {
        if ("serviceWorker" in navigator) await navigator.serviceWorker.register("/sw.js");
        const permission = Notification.permission === "default" ? await Notification.requestPermission() : Notification.permission;
        if (permission === "granted") nextMode = "system";
      } catch {
        nextMode = "in-page";
      }
    }
    setAlertMode(nextMode);
    window.localStorage.setItem(`cafehaus-alerts-${token}`, nextMode);
    notify(nextMode === "system" ? "System order alerts are on" : "Order alerts are on while this page remains open");
  };

  const saveRsvp = async (details: { firstName: string; phone: string; response: RsvpResponse; plusOne: { firstName: string; phone: string } | null }) => {
    const result = await requestJson<{ plusOneInviteUrl?: string }>(`/api/invitations/token/${encodeURIComponent(token)}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(details),
    });
    if (result.plusOneInviteUrl) setShareUrl(result.plusOneInviteUrl);
    await load(true);
    setRsvpOpen(false);
    notify(snapshot?.guest ? "RSVP details updated" : "You’re on the list");
  };

  const resharePlusOne = async () => {
    try {
      const result = await requestJson<{ inviteUrl: string }>(`/api/invitations/token/${encodeURIComponent(token)}/plus-one-link`, { method: "POST" });
      setShareUrl(result.inviteUrl);
    } catch (shareError) {
      notify(shareError instanceof Error ? shareError.message : "Could not create a fresh guest link");
    }
  };

  const placeOrder = async (customizations: Record<string, string>) => {
    if (!selectedDrink) return;
    await requestJson(`/api/orders`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ token, drinkId: selectedDrink.id, customizations }),
    });
    setSelectedDrink(null);
    setTab("orders");
    await load(true);
    showOrderAlert("Order received", `${selectedDrink.name} joined the line.`);
  };

  const updateOrder = async (order: OrderView, action: "edit" | "cancel", customizations?: Record<string, string>) => {
    await requestJson(`/api/orders/${order.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ token, action, customizations }),
    });
    setEditingOrder(null);
    await load(true);
    notify(action === "cancel" ? "Order cancelled · token returned" : "Customisations updated");
  };

  const requestTokens = async () => {
    await requestJson(`/api/invitations/token/${encodeURIComponent(token)}/request-tokens`, { method: "POST" });
    await load(true);
    notify("Your request is with the host");
  };

  if (loading) return <LoadingScreen />;
  if (error || !snapshot) return <InvitationError message={error} />;
  if (!snapshot.guest || snapshot.guest.rsvpResponse === "no") {
    return (
      <main className="event-app">
        <div className="grain" aria-hidden="true" />
        <RsvpForm snapshot={snapshot} onSave={saveRsvp} onResharePlusOne={resharePlusOne} />
        {shareUrl && <ShareCard url={shareUrl} onClose={() => setShareUrl("")} onToast={notify} />}
        {toast && <div className="toast" role="status">{toast}</div>}
      </main>
    );
  }

  const eventEnded = snapshot.event.status === "ended";
  const orderingAllowed = snapshot.event.orderingEnabled && !eventEnded && snapshot.guest.rsvpResponse === "yes" && snapshot.guest.tokenBalance > 0;

  return (
    <main className="event-app">
      <div className="grain" aria-hidden="true" />
      <header className="topbar">
        <Brand />
        <div className="topbar-actions">
          <span className={`event-state ${snapshot.event.status}`}><i />{snapshot.event.status === "live" ? "Service live" : snapshot.event.status === "ended" ? "Evening ended" : "Before the night"}</span>
          <button className="mode-button subtle" onClick={() => setRsvpOpen(true)}>Invitation & RSVP</button>
        </div>
      </header>

      <section className="guest-shell live-guest-shell">
        <div className="guest-main">
          {tab === "home" && <GuestHome snapshot={snapshot} eventEnded={eventEnded} onRequestTokens={requestTokens} onOpenInvitation={() => setRsvpOpen(true)} />}
          {tab === "menu" && <Menu snapshot={snapshot} orderingAllowed={orderingAllowed} eventEnded={eventEnded} onSelect={setSelectedDrink} onRequestTokens={requestTokens} />}
          {tab === "orders" && <Orders snapshot={snapshot} eventEnded={eventEnded} alertMode={alertMode} onToggleAlerts={() => void toggleAlerts()} onEdit={setEditingOrder} onCancel={(order) => void updateOrder(order, "cancel")} />}
        </div>
        <EventAside snapshot={snapshot} />
      </section>

      <nav className="guest-nav always" aria-label="Guest navigation">
        {(["home", "menu", "orders"] as GuestTab[]).map((item) => (
          <button key={item} className={tab === item ? "active" : ""} onClick={() => setTab(item)}>
            <span>{item === "home" ? "⌂" : item === "menu" ? "☕" : "≋"}</span>{item}
          </button>
        ))}
      </nav>

      {rsvpOpen && <div className="modal-backdrop"><div className="rsvp-sheet"><button className="close-button" onClick={() => setRsvpOpen(false)} aria-label="Close">×</button><RsvpForm snapshot={snapshot} compact onSave={saveRsvp} onResharePlusOne={resharePlusOne} /></div></div>}
      {selectedDrink && <DrinkCheckout drink={selectedDrink} tokens={snapshot.guest.tokenBalance} enabled={orderingAllowed} onClose={() => setSelectedDrink(null)} onSubmit={placeOrder} />}
      {editingOrder && <DrinkCheckout drink={snapshot.drinks.find((drink) => drink.id === editingOrder.drinkId) ?? null} tokens={snapshot.guest.tokenBalance} enabled existing={editingOrder.customizations} submitLabel="Save changes" onClose={() => setEditingOrder(null)} onSubmit={(customizations) => updateOrder(editingOrder, "edit", customizations)} />}
      {shareUrl && <ShareCard url={shareUrl} onClose={() => setShareUrl("")} onToast={notify} />}
      {toast && <div className="toast" role="status">{toast}</div>}
    </main>
  );
}

function LoadingScreen() {
  return <main className="event-app centered-state"><div className="grain" aria-hidden="true" /><Brand /><span className="loading-cup">☕</span><p>Opening your invitation…</p></main>;
}

function InvitationError({ message }: { message: string }) {
  const rescinded = /rescinded/i.test(message);
  return <main className="event-app centered-state"><div className="grain" aria-hidden="true" /><Brand /><p className="section-label">Private evening</p><h1>{rescinded ? <>This invitation<br /><em>has closed.</em></> : <>That link doesn’t<br /><em>look right.</em></>}</h1><p className="intro">{rescinded ? "The host has withdrawn this invitation. If that seems unexpected, ask Aditya for a new link." : "Invitation links are unique. Open the original message again or ask Aditya to reissue yours."}</p></main>;
}

function RsvpForm({ snapshot, onSave, onResharePlusOne, compact = false }: { snapshot: GuestSnapshot; onSave: (details: { firstName: string; phone: string; response: RsvpResponse; plusOne: { firstName: string; phone: string } | null }) => Promise<void>; onResharePlusOne: () => Promise<void>; compact?: boolean }) {
  const [firstName, setFirstName] = useState(snapshot.guest?.firstName ?? snapshot.invitation.invitedName ?? "");
  const [phone, setPhone] = useState(snapshot.guest?.phoneE164 ?? snapshot.invitation.invitedPhoneE164 ?? "");
  const [response, setResponse] = useState<RsvpResponse>(snapshot.guest?.rsvpResponse ?? "yes");
  const [bringingGuest, setBringingGuest] = useState(Boolean(snapshot.plusOne));
  const [plusOneName, setPlusOneName] = useState(snapshot.plusOne?.firstName ?? "");
  const [plusOnePhone, setPlusOnePhone] = useState(snapshot.plusOne?.phone ?? "");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setFormError("");
    try {
      await onSave({ firstName, phone, response, plusOne: bringingGuest && response !== "no" ? { firstName: plusOneName, phone: plusOnePhone } : null });
    } catch (submitError) {
      setFormError(submitError instanceof Error ? submitError.message : "Could not save your RSVP.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className={compact ? "rsvp-editor" : "rsvp-landing"}>
      {!compact && <div className="rsvp-landing-top"><Brand /></div>}
      <div className={compact ? "" : "rsvp-landing-grid"}>
        <div className="rsvp-invitation-copy">
          {snapshot.guest?.rsvpResponse === "no" && <div className="changed-mind-note"><span>↺</span><p><strong>Changed your mind?</strong><br />Your invitation is still here. Choose Yes or Maybe below and save your response.</p></div>}
          <p className="kicker">A private rooftop invitation</p>
          <h1>{snapshot.guest?.rsvpResponse === "no" ? <>The door stays<br /><em>open.</em></> : snapshot.guest ? <>Your evening,<br /><em>your details.</em></> : <>You’re invited<br /><em>after dark.</em></>}</h1>
          <p className="intro">Coffee made to order, one shared playlist, and Canning Town after sunset.</p>
          <div className="rsvp-event-details"><span>{formatEventDate(snapshot.event.startsAt)}</span><span>{formatEventTime(snapshot.event.startsAt)} — late</span></div>
        </div>
        <form className="rsvp-form real-rsvp-form" onSubmit={submit}>
          <p className="section-label">{snapshot.guest ? "Update RSVP" : "Your invitation"}</p>
          <div className="rsvp-address"><small>The evening is at</small><strong>{snapshot.event.address}</strong></div>
          <label className="field-label">First name<input required value={firstName} onChange={(event) => setFirstName(oneWordTitleCase(event.target.value))} autoComplete="given-name" /></label>
          <label className="field-label">Mobile number<input required value={phone} onChange={(event) => setPhone(event.target.value)} inputMode="tel" autoComplete="tel" /></label>

          {response !== "no" && <div className="plus-one-block">
            <div className="plus-one-row"><span><strong>Bringing one guest?</strong><small>They receive two tokens and their own private link.</small></span><button type="button" className={`switch ${bringingGuest ? "on" : ""}`} aria-pressed={bringingGuest} onClick={() => setBringingGuest((current) => !current)}><i /></button></div>
            {bringingGuest && <div className="plus-one-fields"><label className="field-label">Their first name<input required value={plusOneName} onChange={(event) => setPlusOneName(oneWordTitleCase(event.target.value))} /></label><label className="field-label">Their mobile number<input required value={plusOnePhone} onChange={(event) => setPlusOnePhone(event.target.value)} inputMode="tel" /></label></div>}
            {bringingGuest && snapshot.plusOne && <button type="button" className="reshare-plus-one" onClick={() => void onResharePlusOne()}>Get a fresh share link for {snapshot.plusOne.firstName}</button>}
          </div>}

          <div className="rsvp-choice-row" aria-label="RSVP response">
            {(["yes", "maybe", "no"] as RsvpResponse[]).map((choice) => <button type="button" key={choice} className={response === choice ? "selected" : ""} onClick={() => { setResponse(choice); if (choice === "no") setBringingGuest(false); }}><strong>{choice === "yes" ? "Yes" : choice === "maybe" ? "Maybe" : "No"}</strong><small>{choice === "yes" ? "I’ll be there" : choice === "maybe" ? "Hold my place" : "Can’t make it"}</small></button>)}
          </div>
          {formError && <p className="form-error">{formError}</p>}
          <button className="primary-button wide-submit" disabled={saving}>{saving ? "Saving…" : snapshot.guest ? "Save RSVP changes" : "RSVP for the evening"}</button>
          <p className="form-footnote">Your mobile number stays with the guest list so Aditya can contact you or send a fresh private link.</p>
        </form>
      </div>
    </section>
  );
}

function CoffeePass({ snapshot, onRequestTokens }: { snapshot: GuestSnapshot; onRequestTokens: () => Promise<void> }) {
  const guest = snapshot.guest!;
  const requested = guest.tokenRequestStatus === "requested";
  return <section className="pass-card"><div className="pass-copy"><p className="card-label">Coffee pass · {guest.firstName}</p><h2 className="pass-name">{guest.tokenBalance === 0 ? "Your tab is resting" : guest.tokenBalance === 1 ? "One pour remains" : `${guest.tokenBalance} pours waiting`}</h2><p className="pass-detail">Each checkout uses one token. The host can top you up anytime.</p><div className="pass-progress"><span style={{ width: `${Math.min(100, guest.tokenBalance * 50)}%` }} /></div><button className={`request-token-button ${requested ? "requested" : ""}`} disabled={requested} onClick={() => void onRequestTokens()}>{requested ? "Requested from host" : "Request more"}</button></div><div className="pass-balance"><strong>{guest.tokenBalance}</strong><span>tokens</span></div></section>;
}

function GuestHome({ snapshot, eventEnded, onRequestTokens, onOpenInvitation }: { snapshot: GuestSnapshot; eventEnded: boolean; onRequestTokens: () => Promise<void>; onOpenInvitation: () => void }) {
  const attending = snapshot.guest?.rsvpResponse === "yes";
  const visibleGuests = snapshot.guests.filter((guest) => guest.rsvpResponse === "yes");
  return <><div className="eyebrow"><span>{formatEventDate(snapshot.event.startsAt)}</span><span>{eventEnded ? "Evening complete" : `${formatEventTime(snapshot.event.startsAt)} — late`}</span></div><section className="welcome-block"><p className="kicker">{eventEnded ? "Thank you for coming" : attending ? "RSVP confirmed · Canning Town" : `RSVP ${snapshot.guest?.rsvpResponse}`}</p><h1>{eventEnded ? <>Thanks for<br /><em>coming.</em></> : <>Good evening,<br /><em>{snapshot.guest?.firstName}.</em></>}</h1><p className="intro">{eventEnded ? "The coffee bar has closed, but the album and the evening’s details stay here." : attending ? "Your private pass is ready. Browse now; ordering wakes up when Aditya starts service." : "Your place is saved with your current response. You can update it at any time."}</p></section><section className="invitation-summary"><div><p className="section-label">Your invitation</p><h2>{formatEventDate(snapshot.event.startsAt)} · {formatEventTime(snapshot.event.startsAt)}</h2><p>{snapshot.event.address}</p></div><button className="secondary-button" onClick={onOpenInvitation}>View or change RSVP</button></section><CoffeePass snapshot={snapshot} onRequestTokens={onRequestTokens} /><section className="home-section more-section"><div className="section-row"><p className="section-label">The room tonight</p><span className="muted">{visibleGuests.length} coming</span></div><div className="guest-list-full">{visibleGuests.length ? visibleGuests.map((guest) => <span key={guest.firstName}>{guest.firstName}</span>) : <span>Guest list begins with you</span>}</div></section><section className="home-section"><p className="section-label">More for the evening</p><div className="extras-grid"><EventLink href={snapshot.event.albumUrl} icon="◫" title="Tonight’s photos" empty="Shared album will appear here" /><EventLink href={snapshot.event.playlistUrl} icon="♫" title="Collaborative YouTube playlist" empty="Playlist will appear here" /></div><div className="info-panel"><p className="section-label">House notes</p><div className="info-lines"><p><strong>Wi-Fi</strong><span>Details will be available at the flat.</span></p><p><strong>What to bring</strong><span>Just yourself—and anything you would particularly like to drink.</span></p><p><strong>Rooftop</strong><span>Keep the terrace gentle for the neighbours later in the evening.</span></p></div></div></section></>;
}

function EventLink({ href, icon, title, empty }: { href: string | null; icon: string; title: string; empty: string }) {
  const content = <><span className="extra-mark">{icon}</span><span><strong>{title}</strong><small>{href ? "Open for the evening" : empty}</small></span><span>↗</span></>;
  return href ? <a className="extra-card" href={href} target="_blank" rel="noreferrer">{content}</a> : <div className="extra-card unavailable-link">{content}</div>;
}

function Menu({ snapshot, orderingAllowed, eventEnded, onSelect, onRequestTokens }: { snapshot: GuestSnapshot; orderingAllowed: boolean; eventEnded: boolean; onSelect: (drink: DrinkRecord) => void; onRequestTokens: () => Promise<void> }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All drinks");
  const categories = useMemo(() => ["All drinks", ...Array.from(new Set(snapshot.drinks.map((drink) => drink.category)))], [snapshot.drinks]);
  const filtered = snapshot.drinks.filter((drink) => (category === "All drinks" || drink.category === category) && `${drink.name} ${drink.description}`.toLowerCase().includes(query.toLowerCase()));
  return <><div className={`ordering-locked-banner ${eventEnded ? "ended" : ""}`}><span className="live-dot" /><span><strong>{eventEnded ? "The coffee bar has closed" : orderingAllowed ? "Service is live" : "Menu preview"}</strong><small>{orderingAllowed ? "Choose one drink per checkout." : "Browse everything now. Ordering opens when the host starts service."}</small></span></div><CoffeePass snapshot={snapshot} onRequestTokens={onRequestTokens} /><section className="menu-heading compact"><p className="kicker">No photographs. No filler.</p><h1>Tonight’s<br /><em>menu.</em></h1></section><label className="search-field"><span>⌕</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search the menu" /></label><div className="category-scroller">{categories.map((item) => <button key={item} className={category === item ? "active" : ""} onClick={() => setCategory(item)}>{item}</button>)}</div><div className="menu-list">{filtered.map((drink, index) => <article className={`drink-card ${drink.available ? "" : "unavailable"}`} key={drink.id}><button className="drink-main" onClick={() => onSelect(drink)}><span className="drink-number">{String(index + 1).padStart(2, "0")}</span><span className="drink-copy"><span className="drink-topline">{drink.category} · about {drink.prepMinutes} min</span><strong>{drink.name}</strong><small>{drink.description}</small><span className="drink-tags"><span>Caf or decaf</span>{!drink.available && <span>Unavailable tonight</span>}</span></span><span className="drink-action">{drink.available ? "+" : "—"}</span></button></article>)}</div></>;
}

function Orders({ snapshot, eventEnded, alertMode, onToggleAlerts, onEdit, onCancel }: { snapshot: GuestSnapshot; eventEnded: boolean; alertMode: AlertMode; onToggleAlerts: () => void; onEdit: (order: OrderView) => void; onCancel: (order: OrderView) => void }) {
  const activeGlobal = snapshot.orders.filter((order) => ["queued", "making", "ready"].includes(order.status));
  const mine = snapshot.orders.filter((order) => order.guestId === snapshot.guest?.id && order.status !== "cancelled").slice().reverse();
  return <><section className="menu-heading compact"><p className="kicker">Every cup in the room</p><h1>The coffee<br /><em>line.</em></h1></section><QueueTrain orders={activeGlobal} guestId={snapshot.guest!.id} ended={eventEnded} /><section className={`order-alert-control ${alertMode}`}><span className="alert-mark">{alertMode === "off" ? "○" : "●"}</span><span><span className="section-label">Order alerts</span><strong>{alertMode === "system" ? "System notifications are on" : alertMode === "in-page" ? "In-page alerts are on" : "Know when your cup moves"}</strong><small>{alertMode === "system" ? "We’ll notify you when your coffee starts and when it reaches the tray." : alertMode === "in-page" ? "Keep this page open and we’ll alert you when your order changes." : "Turn on optional alerts for Making and Ready."}</small></span><button className="secondary-button" onClick={onToggleAlerts}>{alertMode === "off" ? "Turn on" : "Turn off"}</button></section><section className="home-section"><div className="section-row"><p className="section-label">Your orders</p><span className="muted">{mine.length || "None yet"}</span></div><div className="orders-stack">{mine.map((order) => <article className={`order-row ${order.status}`} key={order.id}><div className="order-row-top"><span className="order-number">{order.orderNumber}</span><span>{formatClock(order.createdAt)}</span></div><div className="order-row-main"><div><h2>{order.drinkName}</h2><p>{customizationLine(order.customizations)}</p></div><span className={`status-pill ${order.status}`}>{order.status}</span></div>{order.status === "queued" && <div className="order-row-actions"><span>Still waiting in line</span><span className="order-actions-inline"><button onClick={() => onEdit(order)}>Edit</button><button onClick={() => onCancel(order)}>Cancel order</button></span></div>}{order.status === "ready" && <p className="ready-note">Ready on the collection tray</p>}</article>)}{mine.length === 0 && <div className="empty-state"><span>☕</span><h2>No cups in motion</h2><p>Your orders will appear here once service opens.</p></div>}</div></section></>;
}

function QueueTrain({ orders, guestId, ended }: { orders: OrderView[]; guestId: string; ended: boolean }) {
  return <section className={`queue-rail ${ended ? "ended" : ""}`}><div className="queue-rail-head"><div><p className="section-label">Global order line</p><strong>{orders.length ? `${orders.length} cup${orders.length === 1 ? "" : "s"} in flight` : "The line is quiet"}</strong></div><span>Swipe to explore →</span></div><div className="queue-track"><div className="queue-line" /><div className="queue-train">{orders.map((order) => <div key={order.id} className={`queue-carriage ${order.status} ${order.guestId === guestId ? "mine" : ""} ${order.status === "making" ? "in-progress" : ""}`}><span>{order.orderNumber}</span><small>{order.guestName} · {order.drinkName}</small><small>{order.status === "making" ? "In progress" : order.status}</small></div>)}</div></div><div className="queue-stations"><span>Placed</span><span>Making</span><span>Collection tray</span></div></section>;
}

function DrinkCheckout({ drink, tokens, enabled, existing, submitLabel = "Place order", onClose, onSubmit }: { drink: DrinkRecord | null; tokens: number; enabled: boolean; existing?: Record<string, string>; submitLabel?: string; onClose: () => void; onSubmit: (customizations: Record<string, string>) => Promise<void> }) {
  const [milk, setMilk] = useState(existing?.milk ?? "Oat milk");
  const [sweetness, setSweetness] = useState(existing?.sweetness ?? "Normal sweetness");
  const [caffeine, setCaffeine] = useState(existing?.caffeine ?? "Caffeinated");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  if (!drink) return null;
  const submit = async () => { setSaving(true); setError(""); try { await onSubmit({ milk, sweetness, caffeine }); } catch (submitError) { setError(submitError instanceof Error ? submitError.message : "Could not place this order."); } finally { setSaving(false); } };
  const unavailable = !existing && !drink.available;
  return <div className="modal-backdrop"><section className="drink-sheet" role="dialog" aria-modal="true"><button className="close-button" onClick={onClose} aria-label="Close">×</button><p className="section-label">One-drink checkout</p><h2>{drink.name}</h2><p className="sheet-description">{drink.description}</p><Option label="Milk" values={["Whole milk", "Oat milk", "Coconut milk"]} value={milk} onChange={setMilk} /><Option label="Sweetness" values={["No added sweetness", "Less sweet", "Normal sweetness"]} value={sweetness} onChange={setSweetness} /><Option label="Coffee" values={["Caffeinated", "Decaf"]} value={caffeine} onChange={setCaffeine} />{error && <p className="form-error">{error}</p>}<footer className="sheet-footer"><div><span className="token-price">1 token</span><small>{tokens} currently on your pass</small></div><button className="primary-button" disabled={!enabled || saving || unavailable} onClick={() => void submit()}>{saving ? "Saving…" : unavailable ? "Unavailable" : !enabled ? "Ordering closed" : submitLabel}</button></footer></section></div>;
}

function Option({ label, values, value, onChange }: { label: string; values: string[]; value: string; onChange: (value: string) => void }) {
  return <div className="option-section"><p className="option-label">{label}</p><div className="option-row">{values.map((option) => <button type="button" key={option} className={value === option ? "selected" : ""} onClick={() => onChange(option)}>{option}</button>)}</div></div>;
}

function ShareCard({ url, onClose, onToast }: { url: string; onClose: () => void; onToast: (message: string) => void }) {
  const body = `You’re invited to Aditya’s Rooftop Party. Your private guest link: ${url}`;
  const copy = async () => { await navigator.clipboard.writeText(url); onToast("Guest link copied"); };
  const share = async () => { if (navigator.share) await navigator.share({ title: "Aditya’s Rooftop Party", text: body, url }); else await copy(); };
  return <div className="modal-backdrop"><section className="drink-sheet share-sheet"><button className="close-button" onClick={onClose}>×</button><p className="section-label">Your guest is on the list</p><h2>Pass it on.</h2><p className="sheet-description">This is their private event link. Send it directly to them; anyone holding it can open their pass.</p><div className="share-url">{url}</div><div className="share-actions share-grid"><button className="secondary-button" onClick={() => void copy()}>Copy link</button><a className="secondary-button link-button" href={`https://wa.me/?text=${encodeURIComponent(body)}`} target="_blank" rel="noreferrer">WhatsApp</a><a className="secondary-button link-button" href={`sms:?&body=${encodeURIComponent(body)}`}>Messages</a><button className="primary-button" onClick={() => void share()}>Share…</button></div></section></div>;
}

function EventAside({ snapshot }: { snapshot: GuestSnapshot }) {
  const date = new Date(snapshot.event.startsAt);
  return <aside className="guest-aside"><div className="aside-rule" /><p className="aside-kicker">A coffee bar<br />above the city.</p><p className="aside-copy">Your link is your invitation, RSVP editor and coffee pass—all in one place.</p><div className="aside-date"><span>{date.getDate()}</span><span>{date.toLocaleDateString("en-GB", { month: "short" }).toUpperCase()}<br />{date.getFullYear()}</span></div><div className="aside-bottom"><p><strong>{snapshot.guests.filter((guest) => guest.rsvpResponse === "yes").length}</strong><br /><span>coming</span></p><p><strong>{snapshot.drinks.filter((drink) => drink.available).length}</strong><br /><span>drinks</span></p></div></aside>;
}
