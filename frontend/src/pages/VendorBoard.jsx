/* import { useEffect, useState } from "react";
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
} */



/* added version 1

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
} */

import { useEffect, useState } from "react";
import { api, connectSocket } from "../api";

export default function VendorBoard() {
  const [board, setBoard] = useState({ express: [], standard: [], printing: [], ready: [], completed: [] });
  const [otp, setOtp] = useState({});
  const [error, setError] = useState("");
  const [activePrintJob, setActivePrintJob] = useState(null);

  async function refresh() {
    setBoard(await api.vendorBoard());
  }

  useEffect(() => {
    refresh().catch((e) => setError(e.message));
    const ws = connectSocket(() => refresh());
    return () => ws?.close();
  }, []);

  async function start(job) {
    // 1. Set job as active print job for the printable ticket overlay
    setActivePrintJob(job);
    
    // 2. Call backend API to move job state to PRINTING
    try {
      await api.startJob(job.id);
      await refresh();
    } catch (e) {
      setError(e.message);
    }

    // 3. Trigger native OS browser print dialog
    setTimeout(() => {
      window.print();
    }, 100);
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
      <div className="no-print">
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
                    <button className="btn-solid" style={{ marginTop: 8, width: "100%" }} onClick={() => start(job)}>
                      Start & Print
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

      {/* Hardware Print Spool Ticket (Visible only during window.print()) */}
      {activePrintJob && (
        <div id="print-spool-ticket" className="print-ticket print-only">
          <h2>HARDWARE PRINT SPOOL TICKET</h2>
          <hr />
          <div className="ticket-details">
            <p><strong>Document Title:</strong> {activePrintJob.filename || "Untitled Document"}</p>
            <p><strong>Queue ID:</strong> {activePrintJob.id || "N/A"}</p>
            <p>
              <strong>Page Specs:</strong> {activePrintJob.color ? "Color" : "B&W"}, {activePrintJob.gsm || 75} GSM
              {activePrintJob.page_count ? ` (${activePrintJob.page_count} pages)` : ""}
            </p>
            <p>
              <strong>4-Digit OTP:</strong>{" "}
              <span className="otp-text">{activePrintJob.otp || otp[activePrintJob.id] || "----"}</span>
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
