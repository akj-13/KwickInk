import { NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  CalendarClock,
  History,
  Home,
  LayoutGrid,
  LogOut,
  Menu,
  Printer,
  ScanLine,
  Settings,
  UserRound,
  X,
} from "lucide-react";
import { useState } from "react";
import { clearSession } from "./api";

export default function Shell({ user, children }) {
  const [open, setOpen] = useState(false);
  const nav = useNavigate();
  const location = useLocation();
  const vendor = user?.role === "vendor";
  const links = vendor
    ? [
        ["/vendor", "Command Center", LayoutGrid],
      ]
    : [
        ["/home", "Home", Home],
        ["/print", "Print", Printer],
        ["/scan", "Scan", ScanLine],
        ["/scheduled", "Scheduled Jobs", CalendarClock],
        ["/history", "History", History],
      ];

  function logout() {
    clearSession();
    nav("/");
  }

  return (
    <div className="app-shell">
      <aside className={`sidebar ${open ? "open" : ""}`}>
        <div className="logo-row">
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
          <strong className="brand">KWICKINK</strong>
          {open && (
            <button className="btn-outline" style={{ marginLeft: "auto", padding: "6px 10px" }} onClick={() => setOpen(false)}>
              <X size={16} />
            </button>
          )}
        </div>
        {links.map(([to, label, Icon]) => (
          <NavLink key={to} to={to} className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`} onClick={() => setOpen(false)}>
            <Icon size={18} /> {label}
          </NavLink>
        ))}
        <div style={{ marginTop: "auto" }}>
          <div className="nav-link">
            <UserRound size={18} /> {user?.name}
          </div>
          <button className="nav-link" onClick={logout} style={{ width: "100%", background: "none", border: 0, cursor: "pointer" }}>
            <LogOut size={18} /> Sign out
          </button>
        </div>
      </aside>
      <section className="main">
        <div className="topbar">
          <button className="btn-outline" onClick={() => setOpen(true)} aria-label="Menu">
            <Menu size={16} />
          </button>
          <strong className="brand">KWICKINK</strong>
          <UserRound size={20} />
        </div>
        <div key={location.pathname} className="page-fade">
          {children}
        </div>
      </section>
    </div>
  );
}
