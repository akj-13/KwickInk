import { CloudUpload, Lock } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api, getUser, openRazorpayCheckout } from "../api";

export default function PrintFlow() {
  const { id } = useParams();
  const nav = useNavigate();
  const [job, setJob] = useState(null);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const [slots, setSlots] = useState([]);
  const [busy, setBusy] = useState(false);
  const [notesDraft, setNotesDraft] = useState("");
  const patchSerial = useRef(0);

  useEffect(() => {
    if (id) {
      api
        .job(id)
        .then((nextJob) => {
          setJob(nextJob);
          setNotesDraft(nextJob?.notes || "");
        })
        .catch((e) => setError(e.message));
    }
    api.slots().then(setSlots).catch(() => {});
  }, [id]);

  useEffect(() => {
    if (job) {
      setNotesDraft(job.notes || "");
    }
  }, [job?.id, job?.notes]);

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
    if (!job?.id) return;

    const serial = ++patchSerial.current;
    setJob((current) => (current ? { ...current, ...partial } : current));

    try {
      const next = await api.settings(job.id, partial);
      if (serial === patchSerial.current) {
        setJob(next);
      }
    } catch (err) {
      setError(err.message);
    }
  }

  async function saveNotes() {
    if (!job?.id) return;
    const trimmed = notesDraft.trim();
    const nextValue = trimmed || null;
    if ((job.notes || null) === nextValue) return;
    await patch({ notes: nextValue });
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
            <p className="muted" style={{ marginBottom: 0 }}>
              {job.page_count} pages · {job.lane || "lane pending"}
              {job.offpeak ? " · 20% off-peak applied" : ""}
            </p>
            <div className="price-display">
              {job.offpeak && job.original_amount > job.amount && (
                <span className="original">₹{job.original_amount.toFixed(2)}</span>
              )}
              <span>₹{job.amount.toFixed(2)}</span>
            </div>
          </div>
          <div className="toggles card" style={{ marginBottom: 16 }}>
            <div className="toggle option-row">
              <span>Single side / Double side</span>
              <div className="segmented" aria-label="Paper orientation">
                <button type="button" className={`segmented-btn ${!job.duplex ? "active" : ""}`} onClick={() => patch({ duplex: false })}>
                  Single
                </button>
                <button type="button" className={`segmented-btn ${job.duplex ? "active" : ""}`} onClick={() => patch({ duplex: true })}>
                  Double
                </button>
              </div>
            </div>
            <div className="toggle option-row">
              <span>Color / Black & White</span>
              <div className="segmented" aria-label="Print color mode">
                <button type="button" className={`segmented-btn ${!job.color ? "active" : ""}`} onClick={() => patch({ color: false })}>
                  B&amp;W
                </button>
                <button type="button" className={`segmented-btn ${job.color ? "active" : ""}`} onClick={() => patch({ color: true })}>
                  Color
                </button>
              </div>
            </div>
            <div className="toggle option-row">
              <span>Copies: {job.copies}</span>
              <div className="stepper">
                <button type="button" onClick={() => patch({ copies: Math.max(1, job.copies - 1) })}>-</button>
                <span>{job.copies}</span>
                <button type="button" onClick={() => patch({ copies: job.copies + 1 })}>+</button>
              </div>
            </div>
          </div>
          <h3>Special Instructions</h3>
          <textarea
            placeholder="Add any special instructions for the print staff (e.g., 'Fold along the center', 'Use premium paper')"
            value={notesDraft}
            onChange={(e) => setNotesDraft(e.target.value)}
            onBlur={saveNotes}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                saveNotes();
              }
            }}
            style={{
              width: "100%",
              minHeight: 80,
              padding: 12,
              background: "var(--panel)",
              border: "1px solid var(--line)",
              borderRadius: 6,
              color: "var(--text)",
              fontFamily: "inherit",
              resize: "vertical",
              marginBottom: 16,
            }}
          />
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
