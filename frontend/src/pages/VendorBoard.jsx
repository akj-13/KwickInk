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
import { api, connectSocket, fetchVendorPdfBlob } from "../api";

export default function VendorBoard() {
  const [board, setBoard] = useState({ express: [], standard: [], printing: [], ready: [], completed: [] });
  const [otp, setOtp] = useState({});
  const [error, setError] = useState("");
  const [activePrintJob, setActivePrintJob] = useState(null);
  const [pdfViewerJob, setPdfViewerJob] = useState(null);
  const [pdfUrl, setPdfUrl] = useState("");

  async function refresh() {
    setBoard(await api.vendorBoard());
  }

  useEffect(() => {
    refresh().catch((e) => setError(e.message));
    const ws = connectSocket(() => refresh());
    return () => ws?.close();
  }, []);

  async function start(job) {
    setActivePrintJob(job);
    try {
      await api.startJob(job.id);
      await refresh();
    } catch (e) {
      setError(e.message);
    }
  }

  async function doneJob(job) {
    setError("");
    try {
      await api.doneJob(job.id);
      await refresh();
    } catch (e) {
      setError(e.message);
    }
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

  async function removeRequest(job) {
    setError("");
    if (!job || job.id == null) {
      setError("This request does not have a valid job id.");
      return;
    }
    try {
      await api.cancelJob(job.id);
      await refresh();
    } catch (e) {
      setError(e.message);
    }
  }

  async function openViewer(job) {
    try {
      const url = await fetchVendorPdfBlob(job.id);
      setPdfUrl(url);
      setPdfViewerJob(job);
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
                  {job.student_name && (
                    <div className="muted" style={{ marginTop: 4, fontSize: 12, lineHeight: 1.4 }}>
                      <div><strong>{job.student_name}</strong></div>
                      {job.student_email && <div>{job.student_email}</div>}
                    </div>
                  )}
                  <div>{job.filename}</div>
                  <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>
                    <div>{job.page_count}p × {job.copies} · {job.duplex ? "Double-sided" : "Single-sided"} · ₹{job.amount}</div>
                  </div>
                  {job.notes && (
                    <div style={{ fontSize: 11, marginTop: 6, padding: 6, background: "rgba(34, 211, 238, 0.1)", borderRadius: 4, borderLeft: "2px solid #22d3ee" }}>
                      <strong>Instructions:</strong> {job.notes}
                    </div>
                  )}

                  {job.file_url && job.state !== "OTP_VERIFIED" && (
                    <>
                      <button
                        type="button"
                        className="btn-outline"
                        style={{ marginTop: 8, width: "100%" }}
                        onClick={() => openViewer(job)}
                      >
                        View PDF
                      </button>
                    </>
                  )}

                  {job.state === "QUEUED" && (
                    <>
                      <button className="btn-solid" style={{ marginTop: 8, width: "100%" }} onClick={() => start(job)}>
                        Start & Print
                      </button>
                      <button
                        type="button"
                        className="btn-outline"
                        style={{ marginTop: 8, width: "100%", borderColor: "#f87171" }}
                        onClick={() => removeRequest(job)}
                      >
                        Remove Request
                      </button>
                    </>
                  )}

                  {job.state === "PRINTING" && (
                    <button className="btn-solid" style={{ marginTop: 8, width: "100%" }} onClick={() => doneJob(job)}>
                      Done
                    </button>
                  )}

                  {job.state === "OTP_VERIFIED" && (
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

      {pdfViewerJob && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(5, 10, 16, 0.82)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: 20,
          }}
          onClick={() => setPdfViewerJob(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            onContextMenu={(e) => e.preventDefault()}
            onKeyDown={(e) => {
              if ((e.ctrlKey || e.metaKey) && (e.key === "s" || e.key === "S" || e.key === "p" || e.key === "P")) {
                e.preventDefault();
              }
            }}
            tabIndex={0}
            style={{
              width: "min(92vw, 1100px)",
              height: "90vh",
              background: "#0d1726",
              border: "1px solid rgba(103, 232, 249, 0.3)",
              borderRadius: 10,
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "10px 14px",
                borderBottom: "1px solid rgba(103, 232, 249, 0.2)",
              }}
            >
              <strong>{pdfViewerJob.filename}</strong>
              <button type="button" className="btn-outline" onClick={() => { setPdfViewerJob(null); setPdfUrl(""); }}>
                Close
              </button>
            </div>
            {pdfUrl && (
              <iframe
                title="Vendor PDF Viewer"
                src={pdfUrl}
                onContextMenu={(e) => e.preventDefault()}
                style={{ border: 0, width: "100%", flex: 1, background: "white" }}
              />
            )}
          </div>
        </div>
      )}

      {activePrintJob && (
        <div style={{ display: "none" }}>
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
        </div>
      )}
    </div>
  );
}
