import { Search } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function Landing() {
  const nav = useNavigate();

  return (
    <div className="hero-shell">
      <div className="hero-panel">
        <header className="hero-topbar">
          <div className="brand-lockup" aria-label="KwickInk home">
            <div className="brand-mark brand-mark-large">
              <img
                className="brand-logo"
                src="/logo.svg"
                alt="KwickInk logo"
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                  const fallback = e.currentTarget.parentElement?.querySelector(".logo-mark");
                  if (fallback) fallback.style.display = "block";
                }}
              />
              <div className="logo-mark" style={{ display: "none" }} />
            </div>
          </div>

          <div className="hero-actions">
            <button type="button" className="btn-outline small" onClick={() => nav("/login")}>Login</button>
            <button type="button" className="btn-solid small" onClick={() => nav("/signup")}>Sign Up</button>
          </div>
        </header>

        <main className="hero-content">
          <h1>KWICKINK</h1>
          <p className="hero-subtitle">Modern campus printing made simple, fast and stress-free.</p>
          <button className="start-orb" onClick={() => nav("/login")} aria-label="Start printing">
            <span className="start-orb-text">Start Printing</span>
            <span className="start-orb-arrow">›</span>
          </button>
        </main>
      </div>
    </div>
  );
}
