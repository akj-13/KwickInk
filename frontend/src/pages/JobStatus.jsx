/* import { Lock } from "lucide-react";
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { api, connectSocket } from "../api";

export default function JobStatus() {
  const { id } = useParams();
  const [job, setJob] = useState(null);

  useEffect(() => {
    api.job(id).then(setJob).catch(() => {});
    const ws = connectSocket((msg) => {
      if (msg.job && String(msg.job.id) === String(id)) setJob(msg.job);
    });
    return () => ws?.close();
  }, [id]);

  if (!job) return <p className="muted">Loading job…</p>;

  const states = ["UNPAID", "SLOT_RESERVED", "QUEUED", "PRINTING", "OTP_VERIFIED", "COMPLETED"];

  return (
    <div>
      <h2>{job.kind === "scan" ? "SCAN STATUS" : "QUEUE STATUS"}</h2>
      <div className="card" style={{ textAlign: "center" }}>
        <div className="lock-ring">
          <Lock color="#22d3ee" size={40} />
        </div>
        <p className="muted">LOCKED · Zero-trust until OTP handshake</p>
        <h3>{job.filename}</h3>
        <p>
          State <strong>{job.state}</strong>
          {job.lane ? ` · ${job.lane} lane` : ""}
        </p>
        {job.queue_position != null && job.state === "QUEUED" && (
          <p>
            Your position in line is: <strong>{job.queue_position}</strong>
            <br />
            ETA: {job.eta_minutes} mins
          </p>
        )}
        <p>
          Total fee ₹{job.amount.toFixed(2)} · Payment{" "}
          <span style={{ color: job.state === "UNPAID" ? "#fb7185" : "#4ade80" }}>
            [{job.state === "UNPAID" ? "Pending" : "Successful"}]
          </span>
        </p>
        {job.otp && (
          <>
            <p>Present this 4-digit OTP at the counter</p>
            <div className="otp-dots">
              {job.otp.split("").map((d, i) => (
                <span key={i} className="filled" title={d} />
              ))}
            </div>
            <h1 style={{ letterSpacing: "0.4em" }}>{job.otp}</h1>
          </>
        )}
        {job.purged && <p className="muted">Spool purged the millisecond collection completed.</p>}
      </div>
      <div style={{ display: "flex", gap: 6, marginTop: 18, flexWrap: "wrap" }}>
        {states.map((s) => (
          <span key={s} className="badge bw" style={{ opacity: s === job.state ? 1 : 0.35 }}>
            {s}
          </span>
        ))}
      </div>
    </div>
  );
} */

import { Lock } from "lucide-react";
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { api, connectSocket } from "../api";

export default function JobStatus() {
  const { id } = useParams();
  const [job, setJob] = useState(null);
  const [notificationState, setNotificationState] = useState("idle");

  useEffect(() => {
    api.job(id).then(setJob).catch(() => {});
    const ws = connectSocket((msg) => {
      if (msg.job && String(msg.job.id) === String(id)) setJob(msg.job);
    });
    return () => ws?.close();
  }, [id]);

  async function enableReadyNotifications() {
    if (!("Notification" in window)) {
      setNotificationState("unsupported");
      return;
    }
    const permission = await Notification.requestPermission();
    setNotificationState(permission);
  }

  if (!job) return <p className="muted">Loading job…</p>;

  const states = ["UNPAID", "SLOT_RESERVED", "QUEUED", "PRINTING", "OTP_VERIFIED", "COMPLETED"];
  const showQueueInfo = job.queue_position != null && job.queue_position > 0 && ["QUEUED", "PRINTING", "OTP_VERIFIED"].includes(job.state);

  return (
    <div>
      <h2>{job.kind === "scan" ? "SCAN STATUS" : "QUEUE STATUS"}</h2>
      <div className="card" style={{ textAlign: "center" }}>
        <div className="lock-ring">
          <Lock color="#22d3ee" size={40} />
        </div>
        <p className="muted">LOCKED · Zero-trust until OTP handshake</p>
        {job.student_name && <h3 style={{ marginBottom: 4 }}>{job.student_name}</h3>}
        <h3>{job.filename}</h3>
        <p>
          State <strong>{job.state}</strong>
          {job.lane ? ` · ${job.lane} lane` : ""}
        </p>

        {showQueueInfo && (
          <p>
            Queue number: <strong>{job.queue_position}</strong>
            <br />
            ETA: {job.eta_minutes != null ? `${job.eta_minutes} mins` : "being calculated"}
          </p>
        )}

        {job.state === "PRINTING" && (
          <p className="muted">Your job is currently being printed. The queue number is no longer active while it is in progress.</p>
        )}

        {job.state === "OTP_VERIFIED" && (
          <p style={{ color: "#4ade80", fontWeight: 700 }}>
            Your print is ready for pickup. Please visit the counter and show the OTP when prompted.
          </p>
        )}

        <p>
          Total fee ₹{job.amount.toFixed(2)} · Payment{" "}
          <span style={{ color: job.state === "UNPAID" ? "#fb7185" : "#4ade80" }}>
            [{job.state === "UNPAID" ? "Pending" : "Successful"}]
          </span>
        </p>

        {"Notification" in window && job.state !== "COMPLETED" && job.state !== "CANCELLED" && (
          <button type="button" className="btn-outline" style={{ marginTop: 8, width: "100%" }} onClick={enableReadyNotifications}>
            {Notification.permission === "granted" ? "Ready alerts enabled" : "Enable ready alerts"}
          </button>
        )}

        {notificationState === "denied" && <p className="muted">Browser notifications are blocked. You can still watch this status page for updates.</p>}
        {notificationState === "unsupported" && <p className="muted">This browser does not support desktop notifications.</p>}

        {job.otp && (
          <>
            <p>Present this 4-digit OTP at the counter</p>
            <div className="otp-dots">
              {job.otp.split("").map((d, i) => (
                <span key={i} className="filled" title={d} />
              ))}
            </div>
            <h1 style={{ letterSpacing: "0.4em" }}>{job.otp}</h1>
          </>
        )}
        {job.purged && <p className="muted">Spool purged the millisecond collection completed.</p>}
      </div>
      <div style={{ display: "flex", gap: 6, marginTop: 18, flexWrap: "wrap" }}>
        {states.map((s) => (
          <span key={s} className="badge bw" style={{ opacity: s === job.state ? 1 : 0.35 }}>
            {s}
          </span>
        ))}
      </div>
    </div>
  );
}