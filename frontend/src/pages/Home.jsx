import { CalendarClock, History, Printer, ScanLine } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function Home() {
  const nav = useNavigate();
  return (
    <div>
      <h2>HOME</h2>
      <p className="muted">Upload, slot, pay, collect with a 4-digit OTP. Short jobs never wait behind a thesis.</p>
      <div className="grid-2" style={{ marginTop: 22 }}>
        <button className="tech-card glow" onClick={() => nav("/print")} style={{ cursor: "pointer", textAlign: "left" }}>
          <Printer className="action-icon" />
          <h3>PRINT DOCUMENT</h3>
          <p className="muted">Magic-byte PDF validation · live ETA · dual-lane queue</p>
        </button>
        <button className="tech-card" onClick={() => nav("/scan")} style={{ cursor: "pointer", textAlign: "left" }}>
          <ScanLine className="action-icon" />
          <h3>SCAN DOCUMENT</h3>
          <p className="muted">Book a scan window. Files land in your cloud history.</p>
        </button>
      </div>
      <div className="mini-row">
        <button className="mini" onClick={() => nav("/scheduled")}>
          <CalendarClock color="#22d3ee" />
          <div>Scheduled Jobs</div>
        </button>
        <button className="mini" onClick={() => nav("/history")}>
          <History color="#22d3ee" />
          <div>History</div>
        </button>
      </div>
    </div>
  );
}
