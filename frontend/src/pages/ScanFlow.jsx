import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api";

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
      const keyId = import.meta.env.VITE_RAZORPAY_KEY_ID;
      if (!keyId || !window.Razorpay) {
        throw new Error("Razorpay is not configured for this app yet.");
      }

      const razorpay = new window.Razorpay({
        key: keyId,
        amount: order.amount,
        currency: order.currency,
        name: "KwickInk",
        description: `Payment for scan #${job.id}`,
        order_id: order.order_id,
        handler: async function (response) {
          const result = await api.verifyPayment({
            order_id: response.razorpay_order_id,
            payment_id: response.razorpay_payment_id,
            signature: response.razorpay_signature,
          });
          nav(`/job/${result.job_id}`);
        },
        theme: { color: "#0f172a" },
        modal: {
          ondismiss: () => {
            setError("Payment cancelled. No charge was made.");
            setBusy(false);
          },
        },
      });

      razorpay.on("payment.failed", function (response) {
        setError(response.error?.description || "Payment failed. Please try again.");
        setBusy(false);
      });

      razorpay.open();
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

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
