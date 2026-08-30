import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api";

export default function JobsList({ filter }) {
  const [jobs, setJobs] = useState([]);
  const nav = useNavigate();

  useEffect(() => {
    api.mine().then(setJobs).catch(() => {});
  }, []);

  const scheduledStates = ["UNPAID", "SLOT_RESERVED", "QUEUED", "PRINTING", "OTP_VERIFIED"];
  const rows =
    filter === "history"
      ? jobs.filter((j) => j.state === "COMPLETED" || j.state === "CANCELLED")
      : jobs.filter((j) => scheduledStates.includes(j.state));

  return (
    <div>
      <h2>{filter === "history" ? "HISTORY" : "SCHEDULED JOBS"}</h2>
      <table className="table">
        <thead>
          <tr>
            <th>File</th>
            <th>Kind</th>
            <th>State</th>
            <th>Slot</th>
            <th>ETA</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((j) => (
            <tr key={j.id} style={{ cursor: "pointer" }} onClick={() => nav(`/job/${j.id}`)}>
              <td>{j.filename}</td>
              <td>{j.kind}</td>
              <td>{j.state}</td>
              <td>{j.slot_start ? new Date(j.slot_start).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—"}</td>
              <td>{j.eta_minutes != null ? `${j.eta_minutes} min` : "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {rows.length === 0 && <p className="muted">No jobs yet.</p>}
    </div>
  );
}
