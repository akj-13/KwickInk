import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, getUser, openRazorpayCheckout } from "../api";

export default function ScanFlow() {
  const nav = useNavigate();
  const [pages, setPages] = useState(5);
  const [slots, setSlots] = useState([]);
  const [slot, setSlot] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.slots().then(setSlots).catch(() => {});
  }, []);

  async function book() {
    setBusy(true);
    setError("");
    try {
      const job = await api.bookScan({ pages, slot_start: slot.start, notes: "counter scan" });
      const order = await api.createOrder(job.id);
      if (order.gateway === "razorpay") {
        const user = getUser();
        const result = await openRazorpayCheckout(order, { name: user?.name, email: user?.email });
        await api.verifyPayment(result);
      } else {
        await api.simulatePay(order.order_id);
      }
      nav(`/job/${job.id}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  const rate = 1; // ₹1 per page, flat
  const base = Math.max(1, pages) * rate;
  const offpeakSelected = !!slot?.offpeak;
  const total = offpeakSelected ? +(base * 0.8).toFixed(2) : base;

  return (
    <div>
      <h2>SCAN DOCUMENT</h2>
      <p className="muted">Reserve a scan window. Completed scans appear in History when the shop uploads them.</p>
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
      <div className="price-display">
        {offpeakSelected && <span className="original">₹{base.toFixed(2)}</span>}
        <span>₹{total.toFixed(2)}</span>
      </div>
      <p className="muted" style={{ marginTop: -6, marginBottom: 16 }}>
        ₹1 per page{offpeakSelected ? " · 20% off-peak applied" : ""}
      </p>
      <div className="slot-grid">
        {slots.filter((s) => s.available).slice(0, 24).map((s) => (
          <button key={s.start} className={`slot ${slot?.start === s.start ? "on" : ""}`} onClick={() => setSlot(s)}>
            {s.label}
          </button>
        ))}
      </div>
      {error && <p className="error">{error}</p>}
      <button className="btn-solid" style={{ width: "100%" }} disabled={!slot || busy} onClick={book}>
        Book scan & pay
      </button>
    </div>
  );
}
