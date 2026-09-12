"use client";

import { useMemo, useState } from "react";

type GuestTab = "home" | "menu" | "orders" | "more";
type Surface = "guest" | "host";
type OrderStatus = "queued" | "making" | "ready" | "archived";

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

const categories = ["All drinks", "House favourites", "Essentials", "Specialty drinks", "Dessert style", "Light & refreshing"];

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
    if (!selectedDrink) return;
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

  const changeHostStatus = (orderId: string, status: OrderStatus) => {
    setHostOrders((current) => current.map((order) => order.id === orderId ? { ...order, status } : order));
    showToast(status === "ready" ? "Order moved to the collection tray" : `Order marked ${status}`);
  };

  const archiveHostOrder = (orderId: string) => {
    setHostOrders((current) => current.map((order) => order.id === orderId ? { ...order, status: "archived" } : order));
    showToast("Ready order archived");
  };

  const addToken = (name: string) => showToast(`Added 1 token to ${name}`);
  const toggleAvailability = (id: string) => setDrinks((current) => current.map((drink) => drink.id === id ? { ...drink, available: !drink.available } : drink));
  const sendInvite = () => { if (!invitePhone.trim()) return; showToast(`Invitation SMS queued for ${invitePhone}`); setInvitePhone(""); };

  return (
    <main className="event-app">
      <div className="grain" aria-hidden="true" />
      <header className="topbar">
        <div className="brand-lockup" onClick={() => { setSurface("guest"); setTab("home"); }} role="button" tabIndex={0}>
          <span className="brand-mark">A</span>
          <span><span className="brand-name">Adityo&apos;s Caféhaus</span><span className="brand-subtitle">Rooftop service · 2026</span></span>
        </div>
        <div className="topbar-actions"><span className="live-chip"><span className="live-dot" /> Live event</span>{surface === "guest" && <button className="mode-button subtle" onClick={() => setRsvpOpen(true)}>RSVP details</button>}<button className="mode-button" onClick={() => setSurface(surface === "guest" ? "host" : "guest")}>{surface === "guest" ? "Open host portal" : "Back to guest view"}</button></div>
      </header>

      {surface === "guest" ? <section className="guest-shell"><div className="guest-main">
        {tab === "home" && <GuestHome tokens={tokens} orders={guestOrders} onOrder={() => setTab("menu")} onMore={() => setTab("more")} onCancel={cancelGuestOrder} />}
        {tab === "menu" && <MenuView drinks={filteredDrinks} categories={categories} category={category} query={query} tokens={tokens} onCategory={setCategory} onQuery={setQuery} onOpenDrink={openDrink} />}
        {tab === "orders" && <OrdersView orders={guestOrders} tokens={tokens} onCancel={cancelGuestOrder} onOrderAgain={() => setTab("menu")} />}
        {tab === "more" && <MoreView onMusic={() => showToast("Opening your YouTube collaborative playlist")} />}
      </div><GuestAside tokens={tokens} orders={guestOrders} /><GuestNav tab={tab} setTab={setTab} /></section> : <HostView drinks={drinks} orders={hostOrders} invitePhone={invitePhone} onInvitePhone={setInvitePhone} onSendInvite={sendInvite} onStatus={changeHostStatus} onArchive={archiveHostOrder} onRecipe={setRecipeDrink} onAddToken={addToken} onToggleAvailability={toggleAvailability} />}

      {selectedDrink && <DrinkSheet drink={selectedDrink} milk={milk} sweetness={sweetness} caffeine={caffeine} tokens={tokens} onMilk={setMilk} onSweetness={setSweetness} onCaffeine={setCaffeine} onClose={() => setSelectedDrink(null)} onAdd={addToOrder} />}
      {recipeDrink && <RecipeSheet drink={recipeDrink} onClose={() => setRecipeDrink(null)} />}
      {rsvpOpen && <RsvpSheet onClose={() => setRsvpOpen(false)} onSaved={() => { setRsvpOpen(false); showToast("RSVP details saved"); }} />}
      {toast && <div className="toast" role="status">{toast}</div>}
    </main>
  );
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

function MenuView({ drinks, categories, category, query, tokens, onCategory, onQuery, onOpenDrink }: { drinks: Drink[]; categories: string[]; category: string; query: string; tokens: number; onCategory: (value: string) => void; onQuery: (value: string) => void; onOpenDrink: (drink: Drink) => void }) {
  return <><div className="eyebrow"><span>Adityo&apos;s Caféhaus</span><span>{tokens} token{tokens === 1 ? "" : "s"} left</span></div><section className="menu-heading"><p className="kicker">Tonight&apos;s menu</p><h1>Find your<br /><em>usual.</em></h1><p className="intro">Every drink is made to order. Select your milk, sweetness and caffeine preference at the next step.</p></section><div className="search-field"><span>⌕</span><input aria-label="Search drinks" placeholder="Search drinks, syrups, flavours..." value={query} onChange={(event) => onQuery(event.target.value)} /><kbd>/</kbd></div><div className="category-scroller" role="tablist" aria-label="Drink categories">{categories.map((item) => <button key={item} className={category === item ? "active" : ""} onClick={() => onCategory(item)}>{item}</button>)}</div><div className="menu-list">{drinks.map((drink, index) => <DrinkCard key={drink.id} drink={drink} index={index} onOpen={() => onOpenDrink(drink)} />)}</div>{drinks.length === 0 && <div className="empty-state"><span>◌</span><h2>No drinks found</h2><p>Try another flavour or category.</p></div>}</>;
}

function DrinkCard({ drink, index, onOpen }: { drink: Drink; index: number; onOpen: () => void }) {
  return <article className={`drink-card ${!drink.available ? "unavailable" : ""}`} style={{ animationDelay: `${index * 45}ms` }}><button className="drink-main" onClick={onOpen} disabled={!drink.available}><span className="drink-number">{String(index + 1).padStart(2, "0")}</span><span className="drink-copy"><span className="drink-topline">{drink.category} {drink.tags.includes("House favourite") && <span className="tiny-star">★ house favourite</span>}</span><strong>{drink.name}</strong><small>{drink.description}</small><span className="drink-tags">{drink.tags.filter((tag) => tag !== "House favourite").map((tag) => <span key={tag}>{tag}</span>)}</span></span><span className="drink-action">{drink.available ? "+" : "Off"}</span></button></article>;
}

function GuestAside({ tokens, orders }: { tokens: number; orders: Order[] }) {
  const active = orders.find((order) => order.status !== "archived");
  return <aside className="guest-aside"><div className="aside-rule" /><p className="aside-kicker">Caféhaus After Dark</p><p className="aside-copy">An evening of small-batch coffee, rooftop air and good records.</p><div className="aside-date"><span>18</span><span>SEP<br />2026</span></div><div className="aside-bottom"><p><strong>{tokens}</strong> coffee token{tokens === 1 ? "" : "s"}<br /><span>remaining in your pass</span></p>{active && <p><strong>{active.id}</strong><br /><span>latest order</span></p>}</div></aside>;
}

function GuestNav({ tab, setTab }: { tab: GuestTab; setTab: (tab: GuestTab) => void }) {
  const items: { id: GuestTab; label: string; icon: string }[] = [{ id: "home", label: "Home", icon: "⌂" }, { id: "menu", label: "Menu", icon: "✦" }, { id: "orders", label: "Orders", icon: "◷" }, { id: "more", label: "More", icon: "•••" }];
  return <nav className="guest-nav" aria-label="Guest navigation">{items.map((item) => <button key={item.id} className={tab === item.id ? "active" : ""} onClick={() => setTab(item.id)}><span>{item.icon}</span>{item.label}</button>)}</nav>;
}

function OrdersView({ orders, tokens, onCancel, onOrderAgain }: { orders: Order[]; tokens: number; onCancel: (id: string) => void; onOrderAgain: () => void }) {
  return <><div className="eyebrow"><span>My Caféhaus</span><span>{tokens} token{tokens === 1 ? "" : "s"} remaining</span></div><section className="menu-heading compact"><p className="kicker">Your orders</p><h1>Keep an eye<br /><em>on the bar.</em></h1></section><div className="orders-stack">{orders.map((order) => <article className={`order-row ${order.status}`} key={order.id}><div className="order-row-top"><span className="order-number">{order.id}</span><span className="order-time">Placed {order.created}</span></div><div className="order-row-main"><div><h2>{order.drink}</h2><p>{order.mods}</p></div><span className={`status-pill ${order.status}`}>{order.status}</span></div>{order.status === "queued" && <div className="order-row-actions"><span>7 ahead · estimated {order.prep + 14} min</span><button onClick={() => onCancel(order.id)}>Cancel</button></div>}{order.status === "ready" && <div className="ready-note">Show <strong>{order.id}</strong> at the collection tray.</div>}</article>)}</div><button className="secondary-button wide" onClick={onOrderAgain}>Order another coffee <span>→</span></button></>;
}

function MoreView({ onMusic }: { onMusic: () => void }) {
  return <><div className="eyebrow"><span>Tonight&apos;s extras</span><span>Private event</span></div><section className="menu-heading compact"><p className="kicker">Make yourself at home</p><h1>The night,<br /><em>together.</em></h1></section><div className="extras-grid"><button className="extra-card photo-card"><span className="extra-mark">▣</span><span><strong>Add to the shared album</strong><small>Post a photo to Apple Shared Albums</small></span><span>↗</span></button><button className="extra-card photo-card" onClick={() => showExternalToast("Opening tonight's photos")}><span className="extra-mark">▤</span><span><strong>View tonight&apos;s photos</strong><small>See what everyone has been capturing</small></span><span>↗</span></button><button className="extra-card music-card" onClick={onMusic}><span className="extra-mark">♪</span><span><strong>Add to the playlist</strong><small>Open the Caféhaus YouTube playlist</small></span><span>↗</span></button></div><section className="info-panel"><div className="section-row"><span className="section-label">The house notes</span><span className="muted">Canning Town · E16</span></div><div className="info-lines"><p><strong>Wi-Fi</strong><span>Caféhaus Guest · beansbrews</span></p><p><strong>House rules</strong><span>Roof terrace after 21:30 · mind the neighbours · help yourself to water</span></p><p><strong>What to bring</strong><span>Yourself, a warm layer and a song for the playlist.</span></p></div></section><section className="home-section"><div className="section-row"><span className="section-label">Guest list</span><span className="muted">12 confirmed</span></div><div className="guest-list-full"><span>Maya</span><span>Arjun</span><span>Priya</span><span>Daniel</span><span>Leo</span><span>Sam</span><span>Leila</span><span>Rohan</span><span>Chloe</span><span>Amir</span><span>Ines</span><span>Tom</span></div></section></>;
}

function DrinkSheet({ drink, milk, sweetness, caffeine, tokens, onMilk, onSweetness, onCaffeine, onClose, onAdd }: { drink: Drink; milk: string; sweetness: string; caffeine: string; tokens: number; onMilk: (value: string) => void; onSweetness: (value: string) => void; onCaffeine: (value: string) => void; onClose: () => void; onAdd: () => void }) { return <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><section className="drink-sheet" role="dialog" aria-modal="true" aria-label={`${drink.name} details`}><button className="close-button" onClick={onClose} aria-label="Close drink details">×</button><p className="kicker">{drink.category}</p><h2>{drink.name}</h2><p className="sheet-description">{drink.description}</p><div className="sheet-tags">{drink.tags.map((tag) => <span key={tag}>{tag}</span>)}</div><OptionGroup label="Milk" options={["Oat milk", "Whole milk", "Coconut milk"]} value={milk} onChange={onMilk} /><OptionGroup label="Sweetness" options={["No sugar", "Less sweet", "Normal sweetness"]} value={sweetness} onChange={onSweetness} /><OptionGroup label="Caffeine" options={["Caffeinated", "Decaf"]} value={caffeine} onChange={onCaffeine} /><div className="sheet-footer"><div><span className="token-price">1 token</span><small>{drink.prep} min preparation</small></div><button className="primary-button" onClick={onAdd} disabled={tokens < 1}>Add to order <span>→</span></button></div></section></div>; }

function OptionGroup({ label, options, value, onChange }: { label: string; options: string[]; value: string; onChange: (value: string) => void }) { return <div className="option-section"><p className="option-label">{label}</p><div className="option-row">{options.map((option) => <button className={value === option ? "selected" : ""} key={option} onClick={() => onChange(option)}>{option}</button>)}</div></div>; }

function RecipeSheet({ drink, onClose }: { drink: Drink; onClose: () => void }) { return <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><section className="recipe-sheet" role="dialog" aria-modal="true" aria-label={`${drink.name} recipe`}><div className="recipe-head"><div><p className="kicker">Bar recipe · {drink.prep} min</p><h2>{drink.name}</h2></div><button className="close-button" onClick={onClose} aria-label="Close recipe">×</button></div><p className="recipe-note">Tailor the base to the order card, then follow the service sequence.</p><ol>{drink.recipe.map((step) => <li key={step}><span className="step-dot" />{step}</li>)}</ol><div className="recipe-footer"><span>Allergen notes live with the final recipe.</span><button className="secondary-button" onClick={onClose}>Back to queue</button></div></section></div>; }

function HostView({ drinks, orders, invitePhone, onInvitePhone, onSendInvite, onStatus, onArchive, onRecipe, onAddToken, onToggleAvailability }: { drinks: Drink[]; orders: Order[]; invitePhone: string; onInvitePhone: (value: string) => void; onSendInvite: () => void; onStatus: (id: string, status: OrderStatus) => void; onArchive: (id: string) => void; onRecipe: (drink: Drink) => void; onAddToken: (name: string) => void; onToggleAvailability: (id: string) => void }) { const columns: { status: OrderStatus; label: string; note: string }[] = [{ status: "queued", label: "Queued", note: "FIFO · unlimited" }, { status: "making", label: "Making", note: "Your bar now" }, { status: "ready", label: "Ready / collection tray", note: "Auto-archive after 5 min" }]; return <section className="host-shell"><div className="host-heading"><div><p className="kicker">Host portal · service control</p><h1>Good evening,<br /><em>barista.</em></h1></div><div className="host-actions"><span className="service-status"><span className="live-dot" /> Service live</span><button className="secondary-button" onClick={() => showExternalToast("Ordering paused for guests")}>Pause ordering</button></div></div><div className="host-stat-grid"><div><span>Guests</span><strong>12</strong><small>confirmed · 10 arrived</small></div><div><span>Orders live</span><strong>{orders.filter((order) => order.status !== "archived").length + 8}</strong><small>queue estimates active</small></div><div><span>Tokens served</span><strong>16</strong><small>8 remaining across guests</small></div><div><span>Wait warning</span><strong>18<span> min</span></strong><small>showing to new orders</small></div></div><div className="queue-board">{columns.map((column) => <section className="queue-column" key={column.status}><div className="queue-column-head"><div><h2>{column.label}</h2><p>{column.note}</p></div><span>{orders.filter((order) => order.status === column.status).length}</span></div><div className="queue-cards">{orders.filter((order) => order.status === column.status).map((order) => <HostOrderCard key={order.id} order={order} drinks={drinks} onStatus={onStatus} onArchive={onArchive} onRecipe={onRecipe} />)}</div></section>)}</div><div className="host-lower"><section className="host-panel"><div className="panel-head"><div><p className="kicker">Guest tokens</p><h2>Add a token in one tap</h2></div><span className="muted">Per guest wallet</span></div><div className="token-guest-list">{["Maya", "Arjun", "Priya", "Daniel", "Leo"].map((name, index) => <div key={name}><span className="avatar">{name[0]}</span><span><strong>{name}</strong><small>{index === 0 ? "1 token left" : index === 1 ? "0 tokens left" : "2 tokens left"}</small></span><button onClick={() => onAddToken(name)}>+ 1 token</button></div>)}</div></section><section className="host-panel"><div className="panel-head"><div><p className="kicker">Menu control</p><h2>Availability tonight</h2></div><span className="muted">{drinks.filter((drink) => drink.available).length} active</span></div><div className="availability-list">{drinks.slice(0, 6).map((drink) => <button key={drink.id} className={drink.available ? "on" : "off"} onClick={() => onToggleAvailability(drink.id)}><span>{drink.name}</span><span className="toggle"><i /></span></button>)}</div></section><section className="host-panel invite-panel"><div className="panel-head"><div><p className="kicker">Invite someone</p><h2>Send an SMS immediately</h2></div></div><div className="invite-form"><input aria-label="Guest phone number" placeholder="+44 7..." value={invitePhone} onChange={(event) => onInvitePhone(event.target.value)} /><button className="primary-button" onClick={onSendInvite}>Send invite</button></div><small>They verify their number, enter a first name and receive two tokens.</small></section></div></section>; }

function HostOrderCard({ order, drinks, onStatus, onArchive, onRecipe }: { order: Order; drinks: Drink[]; onStatus: (id: string, status: OrderStatus) => void; onArchive: (id: string) => void; onRecipe: (drink: Drink) => void }) { const drink = drinks.find((item) => item.name === order.drink); return <article className="host-order-card"><div className="host-order-top"><span className="order-number">{order.id}</span><span className="order-time">{order.created}</span></div><h3>{order.guest}</h3><p className="host-drink-name">{order.drink}</p><p className="host-mods">{order.mods}</p><div className="host-card-actions">{drink && <button className="recipe-button" onClick={() => onRecipe(drink)}>Recipe ↗</button>}{order.status === "queued" && <button className="small-action" onClick={() => onStatus(order.id, "making")}>Start making</button>}{order.status === "making" && <button className="small-action ready" onClick={() => onStatus(order.id, "ready")}>Mark ready</button>}{order.status === "ready" && <button className="small-action" onClick={() => onArchive(order.id)}>Archive</button>}</div>{order.status === "ready" && <div className="archive-timer"><span /> Auto-archives in 04:32</div>}</article>; }

function RsvpSheet({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [firstName, setFirstName] = useState("Maya");
  const [phone, setPhone] = useState("+44 7700 900 123");
  const [plusOne, setPlusOne] = useState(true);
  return <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><section className="rsvp-sheet" role="dialog" aria-modal="true" aria-label="RSVP details"><button className="close-button" onClick={onClose} aria-label="Close RSVP details">×</button><p className="kicker">Your invitation</p><h2>See you on<br /><em>the roof.</em></h2><p className="sheet-description">Your first name is your guest identity tonight. We use your phone number only for your invite and order updates.</p><label className="field-label">First name<input value={firstName} onChange={(event) => setFirstName(event.target.value)} /></label><label className="field-label">Mobile number<input value={phone} onChange={(event) => setPhone(event.target.value)} /></label><div className="rsvp-address"><span className="section-label">Address</span><strong>Flat 4B, 21 Silvertown Way</strong><small>Canning Town · London E16</small></div><div className="plus-one-row"><span><strong>Bringing a plus-one?</strong><small>They get their own phone verification and two tokens.</small></span><button className={`switch ${plusOne ? "on" : ""}`} onClick={() => setPlusOne((value) => !value)} aria-label="Toggle plus-one"><i /></button></div><button className="primary-button wide" onClick={onSaved} disabled={!firstName.trim() || !phone.trim()}>Save RSVP <span>→</span></button><p className="form-footnote">Only RSVPed first names appear on the guest list.</p></section></div>;
}

function showExternalToast(message: string) { window.dispatchEvent(new CustomEvent("cafehaus-toast", { detail: message })); }
