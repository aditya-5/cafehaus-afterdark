export function Brand({ host = false }: { host?: boolean }) {
  return (
    <div className="brand-lockup">
      <span className="brand-mark">A</span>
      <span>
        <span className="brand-name">Aditya&apos;s Caféhaus</span>
        <span className="brand-subtitle">{host ? "Host console" : "After Dark · rooftop service"}</span>
      </span>
    </div>
  );
}

