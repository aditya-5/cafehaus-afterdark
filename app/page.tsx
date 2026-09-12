import { Brand } from "./components/Brand";

export default function Home() {
  return (
    <main className="event-app private-landing">
      <div className="grain" aria-hidden="true" />
      <header className="topbar"><Brand /><span className="private-chip">Private event</span></header>
      <section className="private-hero">
        <p className="kicker">Aditya’s Rooftop Party · 12 October</p>
        <h1>Coffee upstairs.<br /><em>Invitation only.</em></h1>
        <p className="intro">Each guest receives a personal link by message. That link opens the RSVP, the guest list and—on the night—your coffee pass.</p>
        <div className="private-note"><span>✦</span><p><strong>Already invited?</strong><br />Open the original link Aditya sent you. It remains valid before, during and after the evening.</p></div>
      </section>
      <footer className="private-footer"><span>Canning Town · London</span><span>One rooftop, many coffees</span></footer>
    </main>
  );
}
