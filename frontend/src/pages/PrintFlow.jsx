import { CloudUpload, Lock } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "../api";

export default function PrintFlow() {
  const { id } = useParams();
  const nav = useNavigate();
  const [job, setJob] = useState(null);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const [slots, setSlots] = useState([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (id) api.job(id).then(setJob).catch((e) => setError(e.message));
    api.slots().then(setSlots).catch(() => {});
  }, [id]);

  async function onFile(file) {
    if (!file) return;
    setError("");
    setProgress(35);
    try {
      const created = await api.upload(file, { color: false, duplex: false, copies: 1 });
      setProgress(100);
      setJob(created);
      nav(`/print/${created.id}`, { replace: true });
    } catch (err) {
      setError(err.message);
      setProgress(0);
    }
  }

  async function patch(partial) {
    const next = await api.settings(job.id, partial);
    setJob(next);
  }

  async function pickSlot(slot) {
    const next = await api.setSlot(job.id, slot.start);
    setJob(next);
  }

  async function pay() {
    setBusy(true);
    setError("");
    try {
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
        description: `Payment for job #${job.id}`,
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
      <h2>UPLOAD</h2>
      <p className="muted">Zero-trust security from upload to physical collection.</p>
      {!job && (
        <label className="drop tech-card" style={{ display: "block", cursor: "pointer" }}>
          <CloudUpload className="action-icon" />
          <p>Drag and Drop or Tap to Browse</p>
          <input type="file" accept="application/pdf" hidden onChange={(e) => onFile(e.target.files[0])} />
          {progress > 0 && (
            <div className="progress">
              <span style={{ width: `${progress}%` }} />
            </div>
          )}
        </label>
      )}
      {job && (
        <>
          <div className="tech-card" style={{ marginBottom: 16 }}>
            <strong>{job.filename}</strong>
            <p className="muted">
              {job.page_count} pages · {job.lane || "lane pending"} · ₹{job.amount.toFixed(2)}
              {job.offpeak ? " · 20% off-peak" : ""}
            </p>
          </div>
          <div className="toggles card" style={{ marginBottom: 16 }}>
            <div className="toggle">
              Single side / Double side
              <button className={`switch ${job.duplex ? "on" : ""}`} onClick={() => patch({ duplex: !job.duplex })}>
                <i />
              </button>
            </div>
            <div className="toggle">
              Color / Black & White
              <button className={`switch ${job.color ? "on" : ""}`} onClick={() => patch({ color: !job.color })}>
                <i />
              </button>
            </div>
            <div className="toggle">
              Copies: {job.copies}
              <div className="stepper">
                <button onClick={() => patch({ copies: Math.max(1, job.copies - 1) })}>-</button>
                <span>{job.copies}</span>
                <button onClick={() => patch({ copies: job.copies + 1 })}>+</button>
              </div>
            </div>
          </div>
          <h3>Pickup slot</h3>
          <div className="slot-grid">
            {slots.filter((s) => s.available).slice(0, 24).map((s) => (
              <button
                key={s.start}
                className={`slot ${(job.slot_start || "").startsWith(s.start.slice(0, 16)) ? "on" : ""} ${s.offpeak ? "offpeak" : ""}`}
                onClick={() => pickSlot(s)}
              >
                {s.label}
              </button>
            ))}
          </div>
          <button className="btn-solid" style={{ width: "100%" }} disabled={busy || !job.slot_start} onClick={pay}>
            {busy ? "Verifying HMAC…" : "CALCULATE & CONFIRM"}
          </button>
        </>
      )}
      {error && <p className="error">{error}</p>}
    </div>
  );
}
