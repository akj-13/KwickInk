import { useEffect, useState } from "react";
import { api, connectSocket } from "../api";

export default function VendorBoard() {
  const [board, setBoard] = useState({ express: [], standard: [], printing: [], ready: [], completed: [] });
  const [otp, setOtp] = useState({});
  const [error, setError] = useState("");

  async function refresh() {
    setBoard(await api.vendorBoard());
  }

  useEffect(() => {
    refresh().catch((e) => setError(e.message));
    const ws = connectSocket(() => refresh());
    return () => ws?.close();
  }, []);

  async function start(id) {
    await api.startJob(id);
    await refresh();
  }

  async function verify(id) {
    setError("");
    try {
      await api.verifyOtp(id, otp[id] || "");
      setOtp((o) => ({ ...o, [id]: "" }));
      await refresh();
    } catch (e) {
      setError(e.message);
    }
  }

  const cols = [
    ["express", "Express <5pg"],
    ["standard", "Standard"],
    ["printing", "Printing"],
    ["ready", "OTP / Ready"],
    ["completed", "Completed"],
  ];

  return (
    <div>
      <h2>VENDOR COMMAND CENTER</h2>
      <p className="muted">Kanban dispatch · magenta = color · cyan = B&W · OTP handshake then atomic purge.</p>
      {error && <p className="error">{error}</p>}
      <div className="kanban">
        {cols.map(([key, label]) => (
          <div className="kanban-col" key={key}>
            <strong>{label}</strong>
            {(board[key] || []).map((job) => (
              <div className="job-chip" key={job.id}>
                <div>
                  <span className={`badge ${job.color ? "color" : "bw"}`}>{job.color ? "Color" : "B&W"}</span>
                  {job.lane === "EXPRESS" && <span className="badge express">Express</span>}
                </div>
                <div>{job.filename}</div>
                <div className="muted">
                  {job.page_count}p × {job.copies} · ₹{job.amount}
                </div>
                {job.state === "QUEUED" && (
                  <button className="btn-solid" style={{ marginTop: 8, width: "100%" }} onClick={() => start(job.id)}>
                    Start
                  </button>
                )}
                {job.state === "PRINTING" && (
                  <div style={{ marginTop: 8 }}>
                    <input
                      maxLength={4}
                      placeholder="OTP"
                      value={otp[job.id] || ""}
                      onChange={(e) => setOtp((o) => ({ ...o, [job.id]: e.target.value.replace(/\D/g, "").slice(0, 4) }))}
                      style={{ width: "100%", marginBottom: 6, background: "#0b1528", color: "white", border: "1px solid #22d3ee", padding: 8 }}
                    />
                    <button className="btn-outline" style={{ width: "100%" }} onClick={() => verify(job.id)}>
                      VERIFY CODE
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
