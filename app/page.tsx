"use client";

import { useEffect, useMemo, useState } from "react";

type GuestTab = "home" | "menu" | "orders";
type Surface = "guest" | "host";
type OrderStatus = "queued" | "making" | "ready" | "archived";
type RsvpResponse = "yes" | "maybe" | "no";

type Drink = {
  id: string;
  name: string;
  category: string;
  description: string;
  prep: number;
  caffeine: "Caffeinated" | "Decaf available";
  tags: string[];
  available: boolean;
  recipe: string[];
};

type Order = {
  id: string;
  guest: string;
  drink: string;
  mods: string;
  status: OrderStatus;
  prep: number;
  created: string;
};

type Invitation = {
  id: string;
  name: string;
  phone: string;
  status: "sent" | "delivered" | "opened" | "rsvped" | "rescinded";
  sentAt: string;
};

const initialDrinks: Drink[] = [
  { id: "iced-mocha", name: "Iced Mocha", category: "Dessert style", description: "Rich espresso and chocolate syrup blended with cold milk, crowned with whipped cream.", prep: 4, caffeine: "Caffeinated", tags: ["Chocolate", "Cold", "House favourite"], available: true, recipe: ["Double espresso", "Chocolate syrup", "Cold milk", "Ice", "Whipped cream"] },
  { id: "greek-frappe", name: "Greek Frappé", category: "Specialty drinks", description: "A classic blended coffee with espresso, milk and ice, sweetened to your liking.", prep: 5, caffeine: "Caffeinated", tags: ["Blended", "Cold", "Custom sweetness"], available: true, recipe: ["Espresso", "Milk", "Ice", "Sugar syrup"] },
  { id: "iced-americano", name: "Iced Americano", category: "Essentials", description: "A double shot of rich espresso, chilled with water and served over ice.", prep: 2, caffeine: "Caffeinated", tags: ["Bright", "Cold", "Dairy-free"], available: true, recipe: ["Double espresso", "Chilled water", "Ice"] },
  { id: "iced-latte", name: "Iced Latte", category: "Essentials", description: "Smooth espresso and cold milk served over ice: a creamy Caféhaus classic.", prep: 3, caffeine: "Caffeinated", tags: ["Classic", "Cold", "Smooth"], available: true, recipe: ["Double espresso", "Cold milk", "Ice"] },
  { id: "espresso-tonic", name: "Espresso Tonic", category: "Light & refreshing", description: "A bright, bubbly mix of bold espresso and crisp tonic water over ice.", prep: 2, caffeine: "Caffeinated", tags: ["Bubbly", "Bright", "Dairy-free"], available: true, recipe: ["Double espresso", "Premium tonic", "Ice", "Citrus peel"] },
  { id: "iced-caramel-macchiato", name: "Iced Caramel Macchiato", category: "Specialty drinks", description: "Vanilla-infused milk and ice, marked with espresso and a caramel drizzle.", prep: 4, caffeine: "Caffeinated", tags: ["Vanilla", "Caramel", "Cold"], available: true, recipe: ["Vanilla syrup", "Cold milk", "Double espresso", "Ice", "Caramel drizzle"] },
  { id: "honey-vanilla", name: "Honey Vanilla Espresso Cream", category: "Specialty drinks", description: "Honey-sweetened espresso and vanilla cream, lightened with coconut water.", prep: 5, caffeine: "Caffeinated", tags: ["House favourite", "Honey", "Coconut"], available: true, recipe: ["Espresso", "Honey syrup", "Vanilla cream", "Coconut water", "Ice"] },
  { id: "iced-strawberry", name: "Iced Strawberry Espresso", category: "Light & refreshing", description: "A bright and bubbly espresso tonic infused with sweet strawberry and coconut.", prep: 4, caffeine: "Caffeinated", tags: ["Strawberry", "Bubbly", "Cold"], available: true, recipe: ["Strawberry syrup", "Espresso", "Coconut water", "Ice", "Soda"] },
  { id: "brown-sugar-butter", name: "Brown Sugar Butter Latte", category: "Specialty drinks", description: "A rich and comforting latte with deep caramelised flavour and a touch of butter.", prep: 5, caffeine: "Caffeinated", tags: ["Warm", "Brown sugar", "New"], available: true, recipe: ["Espresso", "Brown sugar", "Steamed milk", "Butter foam"] },
  { id: "coconut-cloud", name: "Coconut Condensed Cloud Espresso", category: "Specialty drinks", description: "A light espresso cloud sweetened with condensed milk and vanilla over coconut water.", prep: 5, caffeine: "Caffeinated", tags: ["Coconut", "Cloud", "New"], available: true, recipe: ["Espresso", "Condensed milk", "Vanilla", "Coconut water", "Cold foam"] },
  { id: "nespresso-latte", name: "Nespresso Latte", category: "Essentials", description: "Espresso and honey, topped with frothed milk, vanilla and a dusting of cinnamon.", prep: 3, caffeine: "Caffeinated", tags: ["Warm", "Honey", "Cinnamon"], available: true, recipe: ["Nespresso shot", "Honey", "Frothed milk", "Vanilla", "Cinnamon"] },
  { id: "peach-iced-cream", name: "Peach Iced Cream Coffee", category: "Light & refreshing", description: "Refreshing iced coffee with sweet peach syrup and a luxurious vanilla cream topping.", prep: 4, caffeine: "Decaf available", tags: ["Peach", "Vanilla", "Cold"], available: true, recipe: ["Espresso", "Peach syrup", "Cold milk", "Ice", "Vanilla cream"] },
];

const initialGuestOrders: Order[] = [
  { id: "A12", guest: "Maya", drink: "Iced Mocha", mods: "Oat milk · Less sweet · Caffeinated", status: "making", prep: 4, created: "19:42" },
  { id: "A17", guest: "Maya", drink: "Espresso Tonic", mods: "Regular · Caffeinated", status: "queued", prep: 2, created: "19:47" },
];

const initialHostOrders: Order[] = [
  { id: "A18", guest: "Arjun", drink: "Greek Frappé", mods: "Whole milk · Normal sweetness", status: "queued", prep: 5, created: "19:49" },
  { id: "A19", guest: "Priya", drink: "Iced Latte", mods: "Oat milk · Less sweet", status: "queued", prep: 3, created: "19:50" },
  { id: "A20", guest: "Daniel", drink: "Honey Vanilla Espresso Cream", mods: "Coconut milk · Normal sweetness", status: "making", prep: 5, created: "19:51" },
  { id: "A16", guest: "Leo", drink: "Espresso Tonic", mods: "Regular · Caffeinated", status: "ready", prep: 2, created: "19:38" },
];

const initialInvitations: Invitation[] = [
  { id: "invite-1", name: "Nina", phone: "+44 7700 900 221", status: "rsvped", sentAt: "18:12" },
  { id: "invite-2", name: "Tom", phone: "+44 7700 900 314", status: "delivered", sentAt: "18:16" },
  { id: "invite-3", name: "Leila", phone: "+44 7700 900 409", status: "opened", sentAt: "18:23" },
];

const categories = ["All drinks", "House favourites", "Essentials", "Specialty drinks", "Dessert style", "Light & refreshing"];

function normalizePhone(value: string) {
  const digits = value.replace(/[^\d+]/g, "").replace(/^\+/, "");
  if (!digits) return "";
  if (digits.startsWith("00")) return normalizePhone(digits.slice(2));
  if (digits.startsWith("440")) return `+44${digits.slice(3)}`;
  if (digits.startsWith("44")) return `+44${digits.slice(2).replace(/^0/, "")}`;
  if (digits.startsWith("0")) return `+44${digits.slice(1)}`;
  if (digits.startsWith("7")) return `+44${digits}`;
  return `+${digits}`;
}

function titleCaseName(value: string) {
  return value.trim().split(/\s+/)[0]?.replace(/(^|[-'])\p{L}/gu, (letter) => letter.toUpperCase()) ?? "";
}

function formatInviteStatus(status: Invitation["status"]) {
  return status === "rsvped" ? "RSVP’d" : status.charAt(0).toUpperCase() + status.slice(1);
}

export default function Home() {
  const [surface, setSurface] = useState<Surface>("guest");
  const [tab, setTab] = useState<GuestTab>("home");
  const [drinks, setDrinks] = useState(initialDrinks);
  const [guestOrders, setGuestOrders] = useState(initialGuestOrders);
  const [hostOrders, setHostOrders] = useState(initialHostOrders);
  const [tokens, setTokens] = useState(1);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All drinks");
  const [selectedDrink, setSelectedDrink] = useState<Drink | null>(null);
  const [milk, setMilk] = useState("Oat milk");
  const [sweetness, setSweetness] = useState("Normal sweetness");
  const [caffeine, setCaffeine] = useState("Caffeinated");
  const [toast, setToast] = useState("");
  const [recipeDrink, setRecipeDrink] = useState<Drink | null>(null);
  const [invitePhone, setInvitePhone] = useState("");
  const [rsvpOpen, setRsvpOpen] = useState(false);
  const [rsvpComplete, setRsvpComplete] = useState(false);
  const [adminPreview, setAdminPreview] = useState(false);
  const [invitations, setInvitations] = useState(initialInvitations);
  const [inviteName, setInviteName] = useState("");
  const [guestTokenBalances, setGuestTokenBalances] = useState<Record<string, number>>({ Maya: 1, Arjun: 0, Priya: 2, Daniel: 2, Leo: 2 });
  const [guestPlusOnePhone, setGuestPlusOnePhone] = useState("");
  const [guestPlusOneName, setGuestPlusOneName] = useState("");
  const [tokenRequests, setTokenRequests] = useState<Record<string, boolean>>({});
  const [eventEnded, setEventEnded] = useState(false);
  const orderingEnabled = !eventEnded && false;

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("admin") === "1") {
      setAdminPreview(true);
      setSurface("host");
    }
    if (params.get("guest") === "1") setRsvpComplete(true);
    if (params.get("ended") === "1") setEventEnded(true);
  }, []);

  const filteredDrinks = useMemo(() => {
    const normalized = query.toLowerCase().trim();
    return drinks.filter((drink) => {
      const inSearch = !normalized || `${drink.name} ${drink.description} ${drink.tags.join(" ")}`.toLowerCase().includes(normalized);
      const inCategory = category === "All drinks" || (category === "House favourites" && drink.tags.includes("House favourite")) || drink.category === category;
      return inSearch && inCategory;
    });
  }, [category, drinks, query]);

  const showToast = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 3200);
  };

  const openDrink = (drink: Drink) => {
    if (!drink.available) return;
    setSelectedDrink(drink);
    setMilk("Oat milk");
    setSweetness("Normal sweetness");
    setCaffeine("Caffeinated");
  };

  const addToOrder = () => {
    if (!selectedDrink || !orderingEnabled) return;
    const drink = selectedDrink;
    setGuestOrders((current) => [...current, { id: `A${18 + current.length}`, guest: "Maya", drink: drink.name, mods: `${milk} · ${sweetness} · ${caffeine}`, status: "queued", prep: drink.prep, created: "19:54" }]);
    setTokens((current) => Math.max(0, current - 1));
    setSelectedDrink(null);
    setTab("orders");
    showToast(`${drink.name} is in the queue · 1 token used`);
  };

  const cancelGuestOrder = (orderId: string) => {
    setGuestOrders((current) => current.filter((order) => order.id !== orderId));
    setTokens((current) => Math.min(2, current + 1));
    showToast("Order cancelled · token returned");
  };
  const editGuestOrder = (orderId: string, mods: string) => { setGuestOrders((current) => current.map((order) => order.id === orderId ? { ...order, mods } : order)); showToast("Order customizations updated"); };

  const changeHostStatus = (orderId: string, status: OrderStatus) => {
    setHostOrders((current) => current.map((order) => order.id === orderId ? { ...order, status } : order));
    showToast(status === "ready" ? "Order moved to the collection tray" : `Order marked ${status}`);
  };

  const archiveHostOrder = (orderId: string) => {
    setHostOrders((current) => current.map((order) => order.id === orderId ? { ...order, status: "archived" } : order));
    showToast("Ready order archived");
  };

  const addToken = (name: string) => { setGuestTokenBalances((current) => ({ ...current, [name]: (current[name] ?? 0) + 1 })); showToast(`Added 1 token to ${name}`); };
  const addTokenToAll = () => { setGuestTokenBalances((current) => Object.fromEntries(Object.entries(current).map(([name, balance]) => [name, balance + 1]))); showToast("Added 1 token to every guest"); };
  const resetTokensForAll = () => { setGuestTokenBalances((current) => Object.fromEntries(Object.keys(current).map((name) => [name, 2]))); showToast("Reset every guest to 2 tokens"); };
  const requestMoreTokens = () => { setTokenRequests((current) => ({ ...current, Maya: true })); showToast("Request sent to the host"); };
  const promptInstall = () => showToast("On iPhone: Share → Add to Home Screen for one-tap live updates");
  const toggleAvailability = (id: string) => setDrinks((current) => current.map((drink) => drink.id === id ? { ...drink, available: !drink.available } : drink));
  const sendInvite = () => { const phone = normalizePhone(invitePhone); if (!phone) return; const name = inviteName.trim() || "Guest"; setInvitations((current) => [...current, { id: `invite-${current.length + 1}`, name, phone, status: "sent", sentAt: "now" }]); showToast(`Invitation created for ${name} · SMS ready to send`); setInviteName(""); setInvitePhone(""); };
  const rescindInvite = (id: string) => { setInvitations((current) => current.map((invite) => invite.id === id ? { ...invite, status: "rescinded" } : invite)); showToast("Invitation rescinded · its link is now expired"); };

  if (!rsvpComplete && !adminPreview) return <main className="event-app"><div className="grain" aria-hidden="true" /><RsvpLanding onComplete={() => setRsvpComplete(true)} /><GuestListBlock /></main>;

  return (
    <main className="event-app">
      <div className="grain" aria-hidden="true" />
      <header className="topbar">
        <div className="brand-lockup" onClick={() => { setSurface("guest"); setTab("home"); }} role="button" tabIndex={0}>
          <span className="brand-mark">A</span>
          <span><span className="brand-name">Adityo&apos;s Caféhaus</span><span className="brand-subtitle">Rooftop service · 2026</span></span>
        </div>
        <div className="topbar-actions"><span className="live-chip"><span className="live-dot" /> Live event</span>{surface === "guest" && <button className="mode-button subtle" onClick={() => setRsvpOpen(true)}>RSVP details</button>}</div>
      </header>

      {surface === "guest" ? <section className="guest-shell"><div className="guest-main">
        {tab === "home" && <><GuestHomeLanding tokens={tokens} eventEnded={eventEnded} onRequestMore={requestMoreTokens} requested={!!tokenRequests.Maya} /><MoreView eventEnded={eventEnded} onMusic={() => showToast("Add the final YouTube playlist URL in event settings")} /></>}
        {tab === "menu" && <><div className={`ordering-locked-banner ${eventEnded ? "ended" : ""}`}><span className="live-dot" /><span><strong>{eventEnded ? "The evening has ended" : "Menu preview"}</strong><small>{eventEnded ? "Ordering is closed, but your pass and event album remain available." : "Browse every drink now. Ordering opens when the host starts service."}</small></span></div><MenuView drinks={filteredDrinks} categories={categories} category={category} query={query} tokens={tokens} onCategory={setCategory} onQuery={setQuery} onOpenDrink={openDrink} onRequestMore={requestMoreTokens} requested={!!tokenRequests.Maya} eventEnded={eventEnded} /></>}
        {tab === "orders" && <OrdersViewRefined orders={guestOrders} tokens={tokens} eventEnded={eventEnded} onInstall={promptInstall} onCancel={cancelGuestOrder} onEdit={editGuestOrder} onOrderAgain={() => setTab("menu")} orderingEnabled={orderingEnabled} />}
      </div><GuestAside tokens={tokens} orders={guestOrders} /><GuestNav tab={tab} setTab={setTab} /></section> : <><HostView drinks={drinks} orders={hostOrders} invitePhone={invitePhone} onInvitePhone={setInvitePhone} onSendInvite={sendInvite} onStatus={changeHostStatus} onArchive={archiveHostOrder} onRecipe={setRecipeDrink} onAddToken={addToken} onToggleAvailability={toggleAvailability} /><HostTokenTools onAddAll={addTokenToAll} onAddOne={addToken} onResetAll={resetTokensForAll} balances={guestTokenBalances} requests={tokenRequests} /><InvitationManager invitations={invitations} inviteName={inviteName} invitePhone={invitePhone} onName={setInviteName} onPhone={setInvitePhone} onSend={sendInvite} onRescind={rescindInvite} /></>}

      {selectedDrink && <DrinkSheet drink={selectedDrink} milk={milk} sweetness={sweetness} caffeine={caffeine} tokens={tokens} orderingEnabled={orderingEnabled} onMilk={setMilk} onSweetness={setSweetness} onCaffeine={setCaffeine} onClose={() => setSelectedDrink(null)} onAdd={addToOrder} />}
      {recipeDrink && <RecipeSheet drink={recipeDrink} onClose={() => setRecipeDrink(null)} />}
      {rsvpOpen && <RsvpSheet onClose={() => setRsvpOpen(false)} onSaved={(details) => {
        if (details.plusOneName && details.plusOnePhone && details.response !== "no") {
          const plusOnePhone = normalizePhone(details.plusOnePhone);
          setInvitations((current) => {
            const withoutPrevious = guestPlusOnePhone && guestPlusOnePhone !== plusOnePhone ? current.filter((invite) => invite.phone !== guestPlusOnePhone) : current;
            return withoutPrevious.some((invite) => invite.phone === plusOnePhone)
              ? withoutPrevious.map((invite) => invite.phone === plusOnePhone ? { ...invite, name: details.plusOneName!, status: "rsvped" } : invite)
              : [...withoutPrevious, { id: `invite-plus-one-${Date.now()}`, name: details.plusOneName, phone: plusOnePhone, status: "rsvped", sentAt: "now" }];
          });
          setGuestPlusOnePhone(plusOnePhone);
          setGuestPlusOneName(details.plusOneName);
          setGuestTokenBalances((current) => {
            const next = { ...current };
            if (guestPlusOneName && guestPlusOneName !== details.plusOneName) delete next[guestPlusOneName];
            next[details.plusOneName!] = !guestPlusOnePhone || guestPlusOneName !== details.plusOneName ? 2 : (next[details.plusOneName!] ?? 2);
            return next;
          });
        } else if (guestPlusOnePhone) {
          setInvitations((current) => current.filter((invite) => invite.phone !== guestPlusOnePhone));
          setGuestTokenBalances((current) => Object.fromEntries(Object.entries(current).filter(([name]) => name !== guestPlusOneName)));
          setGuestPlusOnePhone("");
          setGuestPlusOneName("");
        }
        setRsvpOpen(false);
        showToast("RSVP details saved");
      }} />}
      {toast && <div className="toast" role="status">{toast}</div>}
    </main>
  );
}

function GuestHomeLanding({ tokens, eventEnded, onRequestMore, requested }: { tokens: number; eventEnded: boolean; onRequestMore: () => void; requested: boolean }) {
  return <><div className="eyebrow"><span>Friday, 18 September</span><span>{eventEnded ? "Event ended" : "19:00 — late"}</span></div><section className="welcome-block"><p className="kicker">{eventEnded ? "Thank you for coming · Canning Town" : "RSVP confirmed · Canning Town"}</p><h1>{eventEnded ? <>Thanks for<br /><em>coming.</em></> : <>Good evening,<br /><em>Maya.</em></>}</h1><p className="intro">{eventEnded ? "The coffee bar is closed, but your memories, photos and the evening details stay here." : "Welcome to Caféhaus After Dark. Your table is the rooftop, your first stop is the bar."}</p></section><CoffeePass tokens={tokens} eventEnded={eventEnded} onRequestMore={onRequestMore} requested={requested} /></>;
}

function CoffeePass({ tokens, compact = false, eventEnded = false, onRequestMore, requested = false }: { tokens: number; compact?: boolean; eventEnded?: boolean; onRequestMore?: () => void; requested?: boolean }) {
  const percentage = Math.max(0, Math.min(100, (tokens / 2) * 100));
  return <section className={`pass-card ${compact ? "compact" : ""} ${eventEnded ? "ended" : ""}`}><div className="pass-copy"><p className="card-label">Your coffee pass</p><p className="pass-name">Maya Agarwal</p><p className="pass-detail">{eventEnded ? "Event ended · album remains open" : "Two drinks, made to order"}</p><div className="pass-progress"><span style={{ width: `${percentage}%` }} /></div><div className="pass-meta"><span>2-token pass</span><span>{eventEnded ? "Archive available" : `${tokens} available`}</span></div>{onRequestMore && !eventEnded && <button className={`request-token-button ${requested ? "requested" : ""}`} onClick={onRequestMore} disabled={requested}>{requested ? "Request sent to host" : "Request more tokens"}</button>}</div><div className="pass-balance"><strong>{tokens}</strong><span>{eventEnded ? "archive" : "left"}</span></div></section>;
}

function OrdersViewRefined({ orders, tokens, eventEnded, onInstall, onCancel, onEdit, onOrderAgain, orderingEnabled }: { orders: Order[]; tokens: number; eventEnded: boolean; onInstall: () => void; onCancel: (id: string) => void; onEdit: (id: string, mods: string) => void; onOrderAgain: () => void; orderingEnabled: boolean }) {
  const active = orders.find((order) => order.status !== "archived");
  const [editing, setEditing] = useState<Order | null>(null);
  return <><div className="eyebrow"><span>My Caféhaus</span><span>{eventEnded ? "Event archive" : "Order history"}</span></div><section className="menu-heading compact"><p className="kicker">{eventEnded ? "The evening is complete" : "Your orders"}</p><h1>{eventEnded ? <>A lovely night,<br /><em>remembered.</em></> : <>Keep an eye<br /><em>on the bar.</em></>}</h1></section><QueueRail orders={orders} activeId={active?.id} eventEnded={eventEnded} />{!eventEnded && <LiveUpdatesPrompt onInstall={onInstall} />}{active && <section className="current-order-card"><div className="section-row"><span className="section-label">{eventEnded ? "Final order list" : "Your live order"}</span><span className="order-number">{active.id}</span></div><h2>{active.drink}</h2><p>{active.mods}</p><div className="status-line"><span className={`status-orb ${active.status}`} /><strong>{eventEnded ? "Event ended" : active.status === "making" ? "Making now" : active.status === "ready" ? "Ready on the collection tray" : "In the queue"}</strong><span className="status-meta">{eventEnded ? "Your order history remains available" : active.status === "making" ? "3 ahead · about 8 min" : active.status === "queued" ? "7 ahead · about 18 min" : "Show this number at the bar"}</span></div>{!eventEnded && active.status === "queued" && <div className="order-actions-inline"><button className="text-button" onClick={() => setEditing(active)}>Edit customizations</button><button className="text-button" onClick={() => onCancel(active.id)}>Cancel order <span>↗</span></button></div>}</section>}<div className="orders-stack">{orders.filter((order) => order.id !== active?.id).map((order) => <article className={`order-row ${order.status}`} key={order.id}><div className="order-row-top"><span className="order-number">{order.id}</span><span className="order-time">Placed {order.created}</span></div><div className="order-row-main"><div><h2>{order.drink}</h2><p>{order.mods}</p></div><span className={`status-pill ${order.status}`}>{eventEnded ? "archived" : order.status}</span></div>{!eventEnded && order.status === "queued" && <div className="order-row-actions"><span>7 ahead · estimated {order.prep + 14} min</span><span className="order-actions-inline"><button onClick={() => setEditing(order)}>Edit</button><button onClick={() => onCancel(order.id)}>Cancel</button></span></div>}{order.status === "ready" && <div className="ready-note">Show <strong>{order.id}</strong> at the collection tray.</div>}</article>)}</div><button className="secondary-button wide" onClick={onOrderAgain} disabled={!orderingEnabled}>{eventEnded ? "Ordering closed" : orderingEnabled ? "Order another coffee →" : "Ordering opens when the bar is live"}</button>{editing && !eventEnded && <OrderEditSheet order={editing} onClose={() => setEditing(null)} onSave={(mods) => { onEdit(editing.id, mods); setEditing(null); }} />}</>;
}

function QueueRail({ orders, activeId, eventEnded = false }: { orders: Order[]; activeId?: string; eventEnded?: boolean }) {
  const liveOrders = orders.filter((order) => order.status !== "archived");
  return <section className={`queue-rail ${eventEnded ? "ended" : ""}`} aria-label="Global order list"><div className="queue-rail-head"><div><p className="section-label">The global order list</p><strong>{eventEnded ? "Every order from tonight" : "Every order in flight"}</strong></div><span>{eventEnded ? "Event archive" : `${liveOrders.length} drinks moving`}</span></div><div className="queue-track"><div className="queue-line" /><div className="queue-train">{liveOrders.map((order) => <div className={`queue-carriage ${order.status} ${order.id === activeId ? "mine" : ""}`} key={order.id} title={`${order.id} · ${order.drink}`}><span>{order.id === activeId ? "YOU" : order.id}</span><small>{order.drink}</small></div>)}</div></div><div className="queue-stations"><span>Earlier</span><span>{eventEnded ? "Final list" : "Now"}</span><span>Later</span></div></section>;
}

function LiveUpdatesPrompt({ onInstall }: { onInstall: () => void }) {
  return <section className="live-updates-prompt"><div><p className="section-label">Keep it close</p><strong>Live updates, one tap away</strong><small>Add Caféhaus to your home screen to check your order without hunting for the link.</small></div><button className="secondary-button" onClick={onInstall}>Add to home screen</button></section>;
}

function OrderEditSheet({ order, onClose, onSave }: { order: Order; onClose: () => void; onSave: (mods: string) => void }) {
  const [milk, setMilk] = useState("Oat milk");
  const [sweetness, setSweetness] = useState("Less sweet");
  const [caffeine, setCaffeine] = useState("Caffeinated");
  return <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><section className="drink-sheet" role="dialog" aria-modal="true" aria-label={`Edit ${order.drink}`}><button className="close-button" onClick={onClose} aria-label="Close edit order">×</button><p className="kicker">Queued order · {order.id}</p><h2>Edit your {order.drink}</h2><p className="sheet-description">You can change these details until the barista starts making it.</p><OptionGroup label="Milk" options={["Oat milk", "Whole milk", "Coconut milk"]} value={milk} onChange={setMilk} /><OptionGroup label="Sweetness" options={["No sugar", "Less sweet", "Normal sweetness"]} value={sweetness} onChange={setSweetness} /><OptionGroup label="Caffeine" options={["Caffeinated", "Decaf"]} value={caffeine} onChange={setCaffeine} /><div className="sheet-footer"><button className="secondary-button" onClick={onClose}>Keep current</button><button className="primary-button" onClick={() => onSave(`${milk} · ${sweetness} · ${caffeine}`)}>Save changes <span>→</span></button></div></section></div>;
}

function RsvpLanding({ onComplete }: { onComplete: () => void }) {
  const [firstName, setFirstName] = useState("");
  const [phone, setPhone] = useState("");
  const [response, setResponse] = useState<RsvpResponse>("yes");
  const [plusOne, setPlusOne] = useState(false);
  const [plusOneName, setPlusOneName] = useState("");
  const [plusOnePhone, setPlusOnePhone] = useState("");
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { const next = titleCaseName(firstName); if (next !== firstName) setFirstName(next); }, [firstName]);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { const next = titleCaseName(plusOneName); if (next !== plusOneName) setPlusOneName(next); }, [plusOneName]);
  return <section className="rsvp-landing"><div className="rsvp-landing-top"><span className="brand-mark">A</span><span><span className="brand-name">Adityo&apos;s Caféhaus</span><span className="brand-subtitle">Private rooftop invitation</span></span></div><div className="rsvp-landing-grid"><div><p className="kicker">Friday · 18 September 2026</p><h1>You&apos;re on<br /><em>the list.</em></h1><p className="intro">A rooftop evening of small-batch coffee, good records and a few excellent people.</p><div className="rsvp-event-details"><span>19:00 — late</span><span>Canning Town · London E16</span></div></div><form className="rsvp-form" onSubmit={(event) => { event.preventDefault(); if (firstName.trim() && phone.trim() && (!plusOne || response === "no" || (plusOneName.trim() && plusOnePhone.trim()))) onComplete(); }}><p className="section-label">Your response</p><div className="rsvp-choice-row" role="radiogroup" aria-label="RSVP response">{(["yes", "maybe", "no"] as RsvpResponse[]).map((choice) => <button type="button" key={choice} className={response === choice ? "selected" : ""} onClick={() => { setResponse(choice); if (choice === "no") setPlusOne(false); }}><strong>{choice === "yes" ? "Yes" : choice === "maybe" ? "Maybe" : "No"}</strong><small>{choice === "yes" ? "I’m coming" : choice === "maybe" ? "Let you know" : "Can’t make it"}</small></button>)}</div><label className="field-label">First name<input autoFocus required value={firstName} onChange={(event) => setFirstName(event.target.value)} placeholder="How should we greet you?" /></label><label className="field-label">Mobile number<input required value={phone} onChange={(event) => setPhone(event.target.value)} onBlur={() => setPhone(normalizePhone(phone))} placeholder="For your invite and order updates" /></label><div className="rsvp-address"><span className="section-label">The address</span><strong>Flat 4B, 21 Silvertown Way</strong><small>Canning Town · London E16</small></div>{response !== "no" && <><div className="plus-one-row"><span><strong>Bringing a plus-one?</strong><small>They receive their own phone verification and two coffee tokens.</small></span><button type="button" className={`switch ${plusOne ? "on" : ""}`} onClick={() => setPlusOne((value) => !value)} aria-label="Toggle plus-one"><i /></button></div>{plusOne && <div className="plus-one-fields"><label className="field-label">Plus-one first name<input required value={plusOneName} onChange={(event) => setPlusOneName(event.target.value)} placeholder="Their first name" /></label><label className="field-label">Plus-one mobile<input required value={plusOnePhone} onChange={(event) => setPlusOnePhone(event.target.value)} onBlur={() => setPlusOnePhone(normalizePhone(plusOnePhone))} placeholder="Their number for a separate invite" /></label></div>}</>}<button className="primary-button wide" type="submit">{response === "yes" ? "RSVP yes" : response === "maybe" ? "Save maybe" : "Save response"} <span>→</span></button></form></div></section>;
}

function GuestHome({ tokens, orders, onOrder, onMore, onCancel }: { tokens: number; orders: Order[]; onOrder: () => void; onMore: () => void; onCancel: (id: string) => void }) {
  const active = orders.find((order) => order.status !== "archived");
  return <>
    <div className="eyebrow"><span>Friday, 18 September</span><span>19:00 — late</span></div>
    <section className="welcome-block"><p className="kicker">RSVP confirmed · Canning Town</p><h1>Good evening,<br /><em>Maya.</em></h1><p className="intro">Welcome to Caféhaus After Dark. Your table is the rooftop, your first stop is the bar.</p></section>
    <section className="pass-card"><div><p className="card-label">Your coffee pass</p><p className="pass-name">Maya Agarwal</p><p className="pass-detail">Two drinks, made to order</p></div><div className="token-stack" aria-label={`${tokens} tokens remaining`}><span className={`bean ${tokens < 1 ? "spent" : ""}`}>☕</span><span className={`bean ${tokens < 2 ? "spent" : ""}`}>☕</span></div></section>
    {active ? <section className="current-order-card"><div className="section-row"><span className="section-label">Your live order</span><span className="order-number">{active.id}</span></div><h2>{active.drink}</h2><p>{active.mods}</p><div className="status-line"><span className={`status-orb ${active.status}`} /><strong>{active.status === "making" ? "Making now" : active.status === "ready" ? "Ready on the collection tray" : "In the queue"}</strong><span className="status-meta">{active.status === "making" ? "3 ahead · about 8 min" : active.status === "queued" ? "7 ahead · about 18 min" : "Show this number at the bar"}</span></div>{active.status === "queued" && <button className="text-button" onClick={() => onCancel(active.id)}>Cancel order <span>↗</span></button>}</section> : <section className="order-cta-card"><div><p className="section-label">The bar is open</p><h2>What are you drinking?</h2><p>One token per checkout. Order again whenever you&apos;re ready.</p></div><button className="primary-button" onClick={onOrder}>Browse drinks <span>→</span></button></section>}
    <section className="quick-grid"><button className="quick-card" onClick={onOrder}><span className="quick-icon">✦</span><span><strong>Order a coffee</strong><small>Browse the full menu</small></span><span>→</span></button><button className="quick-card" onClick={onMore}><span className="quick-icon">◌</span><span><strong>Tonight&apos;s extras</strong><small>Photos, music and house notes</small></span><span>→</span></button></section>
    <section className="home-section"><div className="section-row"><span className="section-label">The room tonight</span><span className="muted">12 going</span></div><div className="mini-guest-list"><span>Arjun</span><span>Priya</span><span>Daniel</span><span>Leo</span><span>+ 8</span></div></section>
  </>;
}

function MenuView({ drinks, categories, category, query, tokens, onCategory, onQuery, onOpenDrink, onRequestMore, requested, eventEnded }: { drinks: Drink[]; categories: string[]; category: string; query: string; tokens: number; onCategory: (value: string) => void; onQuery: (value: string) => void; onOpenDrink: (drink: Drink) => void; onRequestMore: () => void; requested: boolean; eventEnded: boolean }) {
  return <><CoffeePass tokens={tokens} compact eventEnded={eventEnded} onRequestMore={onRequestMore} requested={requested} /><div className="eyebrow"><span>Adityo&apos;s Caféhaus</span><span>{eventEnded ? "Event archive" : "Browse the menu"}</span></div><section className="menu-heading"><p className="kicker">{eventEnded ? "Tonight&apos;s archive" : "Tonight&apos;s menu"}</p><h1>{eventEnded ? <>Keep the<br /><em>memories.</em></> : <>Find your<br /><em>usual.</em></>}</h1><p className="intro">{eventEnded ? "The menu is closed, but the evening, recipes and shared album remain available." : "Every drink is made to order. Select your milk, sweetness and caffeine preference at the next step."}</p></section><div className="search-field"><span>⌕</span><input aria-label="Search drinks" placeholder="Search drinks, syrups, flavours..." value={query} onChange={(event) => onQuery(event.target.value)} /><kbd>/</kbd></div><div className="category-scroller" role="tablist" aria-label="Drink categories">{categories.map((item) => <button key={item} className={category === item ? "active" : ""} onClick={() => onCategory(item)}>{item}</button>)}</div><div className="menu-list">{drinks.map((drink, index) => <DrinkCard key={drink.id} drink={drink} index={index} onOpen={() => onOpenDrink(drink)} />)}</div>{drinks.length === 0 && <div className="empty-state"><span>◌</span><h2>No drinks found</h2><p>Try another flavour or category.</p></div>}</>;
}

function DrinkCard({ drink, index, onOpen }: { drink: Drink; index: number; onOpen: () => void }) {
  return <article className={`drink-card ${!drink.available ? "unavailable" : ""}`} style={{ animationDelay: `${index * 45}ms` }}><button className="drink-main" onClick={onOpen} disabled={!drink.available}><span className="drink-number">{String(index + 1).padStart(2, "0")}</span><span className="drink-copy"><span className="drink-topline">{drink.category} {drink.tags.includes("House favourite") && <span className="tiny-star">★ house favourite</span>}</span><strong>{drink.name}</strong><small>{drink.description}</small><span className="drink-tags">{drink.tags.filter((tag) => tag !== "House favourite").map((tag) => <span key={tag}>{tag}</span>)}</span></span><span className="drink-action">{drink.available ? "+" : "Off"}</span></button></article>;
}

function GuestAside({ tokens, orders }: { tokens: number; orders: Order[] }) {
  const active = orders.find((order) => order.status !== "archived");
  return <aside className="guest-aside"><div className="aside-rule" /><p className="aside-kicker">Caféhaus After Dark</p><p className="aside-copy">An evening of small-batch coffee, rooftop air and good records.</p><div className="aside-date"><span>18</span><span>SEP<br />2026</span></div><div className="aside-bottom">{active ? <p><strong>{active.id}</strong><br /><span>latest order</span></p> : <p><strong>19:00</strong><br /><span>bar opens</span></p>}</div></aside>;
}

function GuestNav({ tab, setTab }: { tab: GuestTab; setTab: (tab: GuestTab) => void }) {
  const items: { id: GuestTab; label: string; icon: string }[] = [{ id: "home", label: "Home", icon: "⌂" }, { id: "menu", label: "Menu", icon: "✦" }, { id: "orders", label: "Orders", icon: "◷" }];
  return <nav className="guest-nav" aria-label="Guest navigation">{items.map((item) => <button key={item.id} className={tab === item.id ? "active" : ""} onClick={() => setTab(item.id)}><span>{item.icon}</span>{item.label}</button>)}</nav>;
}

function OrdersView({ orders, tokens, onCancel, onOrderAgain }: { orders: Order[]; tokens: number; onCancel: (id: string) => void; onOrderAgain: () => void }) {
  return <><div className="eyebrow"><span>My Caféhaus</span><span>{tokens} token{tokens === 1 ? "" : "s"} remaining</span></div><section className="menu-heading compact"><p className="kicker">Your orders</p><h1>Keep an eye<br /><em>on the bar.</em></h1></section><div className="orders-stack">{orders.map((order) => <article className={`order-row ${order.status}`} key={order.id}><div className="order-row-top"><span className="order-number">{order.id}</span><span className="order-time">Placed {order.created}</span></div><div className="order-row-main"><div><h2>{order.drink}</h2><p>{order.mods}</p></div><span className={`status-pill ${order.status}`}>{order.status}</span></div>{order.status === "queued" && <div className="order-row-actions"><span>7 ahead · estimated {order.prep + 14} min</span><button onClick={() => onCancel(order.id)}>Cancel</button></div>}{order.status === "ready" && <div className="ready-note">Show <strong>{order.id}</strong> at the collection tray.</div>}</article>)}</div><button className="secondary-button wide" onClick={onOrderAgain}>Order another coffee <span>→</span></button></>;
}

function MoreView({ onMusic }: { onMusic: () => void }) {
  return <><div className="eyebrow"><span>Tonight&apos;s extras</span><span>Private event</span></div><section className="menu-heading compact"><p className="kicker">Make yourself at home</p><h1>The night,<br /><em>together.</em></h1></section><div className="extras-grid"><button className="extra-card photo-card"><span className="extra-mark">▣</span><span><strong>Add to the shared album</strong><small>Post a photo to Apple Shared Albums</small></span><span>↗</span></button><button className="extra-card photo-card" onClick={() => showExternalToast("Opening tonight's photos")}><span className="extra-mark">▤</span><span><strong>View tonight&apos;s photos</strong><small>See what everyone has been capturing</small></span><span>↗</span></button><button className="extra-card music-card" onClick={onMusic}><span className="extra-mark">♪</span><span><strong>Add to the playlist</strong><small>Open the Caféhaus YouTube playlist</small></span><span>↗</span></button></div><section className="info-panel"><div className="section-row"><span className="section-label">The house notes</span><span className="muted">Canning Town · E16</span></div><div className="info-lines"><p><strong>Wi-Fi</strong><span>Caféhaus Guest · beansbrews</span></p><p><strong>House rules</strong><span>Roof terrace after 21:30 · mind the neighbours · help yourself to water</span></p><p><strong>What to bring</strong><span>Yourself, a warm layer and a song for the playlist.</span></p></div></section><section className="home-section"><div className="section-row"><span className="section-label">Guest list</span><span className="muted">12 confirmed</span></div><div className="guest-list-full"><span>Maya</span><span>Arjun</span><span>Priya</span><span>Daniel</span><span>Leo</span><span>Sam</span><span>Leila</span><span>Rohan</span><span>Chloe</span><span>Amir</span><span>Ines</span><span>Tom</span></div></section></>;
}

function DrinkSheet({ drink, milk, sweetness, caffeine, tokens, orderingEnabled, onMilk, onSweetness, onCaffeine, onClose, onAdd }: { drink: Drink; milk: string; sweetness: string; caffeine: string; tokens: number; orderingEnabled: boolean; onMilk: (value: string) => void; onSweetness: (value: string) => void; onCaffeine: (value: string) => void; onClose: () => void; onAdd: () => void }) { return <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><section className="drink-sheet" role="dialog" aria-modal="true" aria-label={`${drink.name} details`}><button className="close-button" onClick={onClose} aria-label="Close drink details">×</button><p className="kicker">{drink.category}</p><h2>{drink.name}</h2><p className="sheet-description">{drink.description}</p><div className="sheet-tags">{drink.tags.map((tag) => <span key={tag}>{tag}</span>)}</div><OptionGroup label="Milk" options={["Oat milk", "Whole milk", "Coconut milk"]} value={milk} onChange={onMilk} /><OptionGroup label="Sweetness" options={["No sugar", "Less sweet", "Normal sweetness"]} value={sweetness} onChange={onSweetness} /><OptionGroup label="Caffeine" options={["Caffeinated", "Decaf"]} value={caffeine} onChange={onCaffeine} /><div className="sheet-footer"><div><span className="token-price">1 token</span><small>{drink.prep} min preparation</small></div><button className="primary-button" onClick={onAdd} disabled={tokens < 1 || !orderingEnabled}>{orderingEnabled ? "Add to order →" : "Ordering opens at the bar"}</button></div></section></div>; }

function OptionGroup({ label, options, value, onChange }: { label: string; options: string[]; value: string; onChange: (value: string) => void }) { return <div className="option-section"><p className="option-label">{label}</p><div className="option-row">{options.map((option) => <button className={value === option ? "selected" : ""} key={option} onClick={() => onChange(option)}>{option}</button>)}</div></div>; }

function RecipeSheet({ drink, onClose }: { drink: Drink; onClose: () => void }) { return <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><section className="recipe-sheet" role="dialog" aria-modal="true" aria-label={`${drink.name} recipe`}><div className="recipe-head"><div><p className="kicker">Bar recipe · {drink.prep} min</p><h2>{drink.name}</h2></div><button className="close-button" onClick={onClose} aria-label="Close recipe">×</button></div><p className="recipe-note">Tailor the base to the order card, then follow the service sequence.</p><ol>{drink.recipe.map((step) => <li key={step}><span className="step-dot" />{step}</li>)}</ol><div className="recipe-footer"><span>Allergen notes live with the final recipe.</span><button className="secondary-button" onClick={onClose}>Back to queue</button></div></section></div>; }

function HostView({ drinks, orders, invitePhone, onInvitePhone, onSendInvite, onStatus, onArchive, onRecipe, onAddToken, onToggleAvailability }: { drinks: Drink[]; orders: Order[]; invitePhone: string; onInvitePhone: (value: string) => void; onSendInvite: () => void; onStatus: (id: string, status: OrderStatus) => void; onArchive: (id: string) => void; onRecipe: (drink: Drink) => void; onAddToken: (name: string) => void; onToggleAvailability: (id: string) => void }) { const columns: { status: OrderStatus; label: string; note: string }[] = [{ status: "queued", label: "Queued", note: "FIFO · unlimited" }, { status: "making", label: "Making", note: "Your bar now" }, { status: "ready", label: "Ready / collection tray", note: "Auto-archive after 5 min" }]; return <section className="host-shell"><div className="host-heading"><div><p className="kicker">Host portal · service control</p><h1>Good evening,<br /><em>barista.</em></h1></div><div className="host-actions"><span className="service-status"><span className="live-dot" /> Service live</span><button className="secondary-button" onClick={() => showExternalToast("Ordering paused for guests")}>Pause ordering</button></div></div><div className="host-stat-grid"><div><span>Guests</span><strong>12</strong><small>confirmed · 10 arrived</small></div><div><span>Orders live</span><strong>{orders.filter((order) => order.status !== "archived").length + 8}</strong><small>queue estimates active</small></div><div><span>Tokens served</span><strong>16</strong><small>8 remaining across guests</small></div><div><span>Wait warning</span><strong>18<span> min</span></strong><small>showing to new orders</small></div></div><div className="queue-board">{columns.map((column) => <section className="queue-column" key={column.status}><div className="queue-column-head"><div><h2>{column.label}</h2><p>{column.note}</p></div><span>{orders.filter((order) => order.status === column.status).length}</span></div><div className="queue-cards">{orders.filter((order) => order.status === column.status).map((order) => <HostOrderCard key={order.id} order={order} drinks={drinks} onStatus={onStatus} onArchive={onArchive} onRecipe={onRecipe} />)}</div></section>)}</div><div className="host-lower"><section className="host-panel"><div className="panel-head"><div><p className="kicker">Guest tokens</p><h2>Add a token in one tap</h2></div><span className="muted">Per guest wallet</span></div><div className="token-guest-list">{["Maya", "Arjun", "Priya", "Daniel", "Leo"].map((name, index) => <div key={name}><span className="avatar">{name[0]}</span><span><strong>{name}</strong><small>{index === 0 ? "1 token left" : index === 1 ? "0 tokens left" : "2 tokens left"}</small></span><button onClick={() => onAddToken(name)}>+ 1 token</button></div>)}</div></section><section className="host-panel"><div className="panel-head"><div><p className="kicker">Menu control</p><h2>Availability tonight</h2></div><span className="muted">{drinks.filter((drink) => drink.available).length} active</span></div><div className="availability-list">{drinks.slice(0, 6).map((drink) => <button key={drink.id} className={drink.available ? "on" : "off"} onClick={() => onToggleAvailability(drink.id)}><span>{drink.name}</span><span className="toggle"><i /></span></button>)}</div></section><section className="host-panel invite-panel"><div className="panel-head"><div><p className="kicker">Invite someone</p><h2>Send an SMS immediately</h2></div></div><div className="invite-form"><input aria-label="Guest phone number" placeholder="+44 7..." value={invitePhone} onChange={(event) => onInvitePhone(event.target.value)} /><button className="primary-button" onClick={onSendInvite}>Send invite</button></div><small>They verify their number, enter a first name and receive two tokens.</small></section></div></section>; }

function HostOrderCard({ order, drinks, onStatus, onArchive, onRecipe }: { order: Order; drinks: Drink[]; onStatus: (id: string, status: OrderStatus) => void; onArchive: (id: string) => void; onRecipe: (drink: Drink) => void }) { const drink = drinks.find((item) => item.name === order.drink); return <article className="host-order-card"><div className="host-order-top"><span className="order-number">{order.id}</span><span className="order-time">{order.created}</span></div><h3>{order.guest}</h3><p className="host-drink-name">{order.drink}</p><p className="host-mods">{order.mods}</p><div className="host-card-actions">{drink && <button className="recipe-button" onClick={() => onRecipe(drink)}>Recipe ↗</button>}{order.status === "queued" && <button className="small-action" onClick={() => onStatus(order.id, "making")}>Start making</button>}{order.status === "making" && <button className="small-action ready" onClick={() => onStatus(order.id, "ready")}>Mark ready</button>}{order.status === "ready" && <button className="small-action" onClick={() => onArchive(order.id)}>Archive</button>}</div>{order.status === "ready" && <div className="archive-timer"><span /> Auto-archives in 04:32</div>}</article>; }

function HostTokenTools({ balances, requests, onAddAll, onAddOne, onResetAll }: { balances: Record<string, number>; requests: Record<string, boolean>; onAddAll: () => void; onAddOne: (name: string) => void; onResetAll: () => void }) { return <section className="host-tools host-token-tools"><div><p className="kicker">Token controls</p><h2>Top up the room</h2><p>Use these for a late arrival, or reset every guest to the standard two-token pass.</p></div><div className="host-tool-actions"><button className="secondary-button" onClick={onAddAll}>+1 for everyone</button><button className="primary-button" onClick={onResetAll}>Reset all to 2</button></div><div className="balance-strip">{Object.entries(balances).map(([name, balance]) => <button className={`balance-chip ${requests[name] ? "requested" : ""}`} key={name} onClick={() => onAddOne(name)}><strong>{name}</strong><span>{balance} left</span><small>{requests[name] ? "Needs tokens" : "+1"}</small></button>)}</div></section>; }

function InvitationManager({ invitations, inviteName, invitePhone, onName, onPhone, onSend, onRescind }: { invitations: Invitation[]; inviteName: string; invitePhone: string; onName: (value: string) => void; onPhone: (value: string) => void; onSend: () => void; onRescind: (id: string) => void }) { return <section className="host-tools invite-manager"><div className="panel-head"><div><p className="kicker">Invitation desk</p><h2>Know who has the link</h2></div><span className="muted">{invitations.filter((invite) => invite.status !== "rescinded").length} active invites</span></div><div className="invite-create"><input aria-label="Invitee name" placeholder="First name" value={inviteName} onChange={(event) => onName(event.target.value)} /><input aria-label="Invitee phone number" placeholder="Guest mobile number" value={invitePhone} onChange={(event) => onPhone(event.target.value)} onBlur={() => onPhone(normalizePhone(invitePhone))} /><button className="primary-button" onClick={onSend}>Create invite</button></div><div className="invitation-list">{invitations.map((invite) => <div className={`invitation-row ${invite.status}`} key={invite.id}><div><strong>{invite.name}</strong><small>{invite.phone} · sent {invite.sentAt}</small></div><span className={`invite-status ${invite.status}`}>{formatInviteStatus(invite.status)}</span>{invite.status !== "rescinded" && invite.status !== "rsvped" && <button className="text-button" onClick={() => onRescind(invite.id)}>Rescind</button>}</div>)}</div></section>; }

function GuestListBlock() { return <section className="rsvp-guest-list"><div className="section-row"><span className="section-label">Already on the list</span><span className="muted">12 confirmed</span></div><div className="guest-list-full"><span>Maya</span><span>Arjun</span><span>Priya</span><span>Daniel</span><span>Leo</span><span>Sam</span><span>Leila</span><span>Rohan</span><span>Chloe</span><span>Amir</span><span>Ines</span><span>Tom</span></div></section>; }

function RsvpSheet({ onClose, onSaved }: { onClose: () => void; onSaved: (details: { firstName: string; phone: string; response: RsvpResponse; plusOneName?: string; plusOnePhone?: string }) => void }) {
  const [firstName, setFirstName] = useState("Maya");
  const [phone, setPhone] = useState("+44 7700 900 123");
  const [response, setResponse] = useState<RsvpResponse>("yes");
  const [plusOne, setPlusOne] = useState(true);
  const [plusOneName, setPlusOneName] = useState("Arjun");
  const [plusOnePhone, setPlusOnePhone] = useState("+44 7700 900 456");
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { const next = titleCaseName(firstName); if (next !== firstName) setFirstName(next); }, [firstName]);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { const next = titleCaseName(plusOneName); if (next !== plusOneName) setPlusOneName(next); }, [plusOneName]);
  return <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><section className="rsvp-sheet" role="dialog" aria-modal="true" aria-label="RSVP details"><button className="close-button" onClick={onClose} aria-label="Close RSVP details">×</button><p className="kicker">Your invitation</p><h2>See you on<br /><em>the roof.</em></h2><p className="sheet-description">Update your response, your phone number or the plus-one attached to your invitation.</p><div className="rsvp-choice-row" role="radiogroup" aria-label="RSVP response">{(["yes", "maybe", "no"] as RsvpResponse[]).map((choice) => <button type="button" key={choice} className={response === choice ? "selected" : ""} onClick={() => { setResponse(choice); if (choice === "no") setPlusOne(false); }}><strong>{choice === "yes" ? "Yes" : choice === "maybe" ? "Maybe" : "No"}</strong><small>{choice === "yes" ? "I’m coming" : choice === "maybe" ? "Let you know" : "Can’t make it"}</small></button>)}</div><label className="field-label">First name<input value={firstName} onChange={(event) => setFirstName(event.target.value)} /></label><label className="field-label">Mobile number<input value={phone} onChange={(event) => setPhone(event.target.value)} onBlur={() => setPhone(normalizePhone(phone))} /></label><div className="rsvp-address"><span className="section-label">Address</span><strong>Flat 4B, 21 Silvertown Way</strong><small>Canning Town · London E16</small></div>{response !== "no" && <><div className="plus-one-row"><span><strong>Bringing a plus-one?</strong><small>They get their own phone verification and two tokens.</small></span><button className={`switch ${plusOne ? "on" : ""}`} onClick={() => setPlusOne((value) => !value)} aria-label="Toggle plus-one"><i /></button></div>{plusOne && <div className="plus-one-fields"><label className="field-label">Plus-one first name<input value={plusOneName} onChange={(event) => setPlusOneName(event.target.value)} /></label><label className="field-label">Plus-one mobile<input value={plusOnePhone} onChange={(event) => setPlusOnePhone(event.target.value)} onBlur={() => setPlusOnePhone(normalizePhone(plusOnePhone))} /></label><button className="text-button remove-plus-one" onClick={() => { setPlusOne(false); setPlusOneName(""); setPlusOnePhone(""); }}>Remove plus-one</button></div>}</>}<GuestListBlock /><button className="primary-button wide" onClick={() => onSaved({ firstName, phone, response, plusOneName: plusOne ? plusOneName : undefined, plusOnePhone: plusOne ? plusOnePhone : undefined })} disabled={!firstName.trim() || !phone.trim()}>Save RSVP changes <span>→</span></button><p className="form-footnote">Only RSVPed first names appear on the guest list.</p></section></div>;
}

function showExternalToast(message: string) { window.dispatchEvent(new CustomEvent("cafehaus-toast", { detail: message })); }
