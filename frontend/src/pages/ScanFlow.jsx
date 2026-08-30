import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api";
import PayActions from "../PayActions.jsx";

export default function ScanFlow() {
  const nav = useNavigate();
  const [pages, setPages] = useState(5);
  const [slots, setSlots] = useState([]);
  const [slot, setSlot] = useState(null);
  const [job, setJob] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.slots().then(setSlots).catch(() => {});
  }, []);

  async function reserve() {
    setBusy(true);
    setError("");
    try {
      const created = await api.bookScan({ pages, slot_start: slot.start, notes: "counter scan" });
      setJob(created);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <h2>SCAN DOCUMENT</h2>
      <p className="muted">Reserve a scan window, then pay. Completed scans appear in History.</p>
      <div className="card">
        <div className="toggle">
          Estimated pages
          <div className="stepper">
            <button onClick={() => setPages((p) => Math.max(1, p - 1))}>-</button>
            <span>{pages}</span>
            <button onClick={() => setPages((p) => p + 1)}>+</button>
          </div>
        </div>
      </div>
      <div className="slot-grid">
        {slots.filter((s) => s.available).slice(0, 24).map((s) => (
          <button key={s.start} className={`slot ${slot?.start === s.start ? "on" : ""}`} onClick={() => setSlot(s)}>
            {s.label}
          </button>
        ))}
      </div>
      {!job && (
        <button className="btn-solid" style={{ width: "100%" }} disabled={!slot || busy} onClick={reserve}>
          {busy ? "Reserving…" : "CALCULATE & CONFIRM"}
        </button>
      )}
      {job && (
        <>
          <p className="muted" style={{ marginTop: 16 }}>
            Slot locked · ₹{job.amount.toFixed(2)}
            {job.offpeak ? " · 20% off-peak" : ""}
          </p>
          <PayActions
            jobId={job.id}
            amount={job.amount}
            disabled={false}
            busy={busy}
            setBusy={setBusy}
            onError={setError}
            onPaid={(paid) => nav(`/job/${paid.id}`)}
          />
        </>
      )}
      {error && <p className="error">{error}</p>}
    </div>
  );
}
