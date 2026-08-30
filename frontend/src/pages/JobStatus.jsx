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
}