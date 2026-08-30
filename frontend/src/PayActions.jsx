import { useEffect, useState } from "react";
import { api } from "./api";
import { demoPay, razorpayPay } from "./pay";

export default function PayActions({ jobId, disabled, onPaid, onError, busy, setBusy, amount }) {
  const [cfg, setCfg] = useState({ demo_mode: true, razorpay: false });

  useEffect(() => {
    api.paymentConfig().then(setCfg).catch(() => {});
  }, []);

  async function run(kind) {
    setBusy(true);
    onError("");
    try {
      const paid = kind === "razorpay" ? await razorpayPay(jobId) : await demoPay(jobId);
      onPaid(paid.job);
    } catch (err) {
      onError(err.message);
    } finally {
      setBusy(false);
    }
  }

  const rupees = typeof amount === "number" ? `₹${amount.toFixed(2)}` : "";

  return (
    <div style={{ display: "grid", gap: 10, marginTop: 8 }}>
      {cfg.razorpay && (
        <button className="btn-solid" style={{ width: "100%" }} disabled={disabled || busy} onClick={() => run("razorpay")}>
          {busy ? "Opening Razorpay…" : `Pay ${rupees} with Razorpay`}
        </button>
      )}
      {cfg.demo_mode && (
        <button
          className={cfg.razorpay ? "btn-outline" : "btn-solid"}
          style={{ width: "100%" }}
          disabled={disabled || busy}
          onClick={() => run("demo")}
        >
          {busy ? "Verifying HMAC…" : `Demo pay ${rupees} (no charge)`}
        </button>
      )}
      {!cfg.razorpay && cfg.demo_mode && (
        <p className="muted">Hackathon mode: no card required. Add Razorpay keys to enable the real gateway.</p>
      )}
      {cfg.razorpay && cfg.demo_mode && (
        <p className="muted">Judges: use Demo pay for a free walkthrough, or Razorpay test cards for a live checkout.</p>
      )}
      {!cfg.demo_mode && !cfg.razorpay && (
        <p className="error">Payments are not configured. Set DEMO_MODE=true or Razorpay keys.</p>
      )}
    </div>
  );
}
