import { useNavigate } from "react-router-dom";

export default function Landing() {
  const nav = useNavigate();
  return (
    <div className="hero">
      <div className="hero-inner">
        <div className="logo-row" style={{ justifyContent: "center" }}>
          <div className="brand-mark">
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
          <h1>KWICKINK</h1>
        </div>
        <div className="pill-row">
          <button className="btn-outline" onClick={() => nav("/login")}>Login</button>
          <button className="btn-solid" onClick={() => nav("/signup")}>Sign Up</button>
        </div>
        <button className="start-orb" onClick={() => nav("/login")}>
          Start
          <br />
          Printing
          <div style={{ fontSize: 22, marginTop: 8 }}>›</div>
        </button>
        <p className="tagline">Welcome to the Future of Campus Printing</p>
      </div>
    </div>
  );
}
