import { useEffect, useState } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { connectSocket, getToken, getUser } from "./api";
import Shell from "./Shell.jsx";
import Landing from "./pages/Landing.jsx";
import Auth from "./pages/Auth.jsx";
import Home from "./pages/Home.jsx";
import PrintFlow from "./pages/PrintFlow.jsx";
import ScanFlow from "./pages/ScanFlow.jsx";
import JobsList from "./pages/JobsList.jsx";
import JobStatus from "./pages/JobStatus.jsx";
import VendorBoard from "./pages/VendorBoard.jsx";

function PageFade({ children }) {
  return <div className="page-fade">{children}</div>;
}

export default function App() {
  const [user, setUser] = useState(getUser());
  const [theme, setTheme] = useState(() => localStorage.getItem("kwickink-theme") || "light");
  const [showHelp, setShowHelp] = useState(false);
  const token = getToken();
  const location = useLocation();

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("kwickink-theme", theme);
  }, [theme]);

  useEffect(() => {
    if (!token) return;
    const ws = connectSocket((msg) => {
      // Show notification when job is ready for pickup
      if (msg.type === "job" && msg.job) {
        console.log("📨 Job update received:", msg.job);
        if (msg.job.state === "OTP_VERIFIED" && "Notification" in window) {
          if (Notification.permission === "granted") {
            const label = msg.job.kind === "scan" ? "Scan ready" : "Print ready";
            const personFile = msg.job.student_name ? `${msg.job.student_name}'s ${msg.job.filename}` : msg.job.filename;
            new Notification(label, {
              body: `${personFile} is ready for pickup. Please visit the counter.`,
            });
            console.log("🔔 Notification sent");
          } else {
            console.log("ℹ️ Notification permission not granted:", Notification.permission);
          }
        }
      }
    });
    return () => ws?.close();
  }, [token]);

  return (
    <>
      <div className="floating-controls">
        <button
          type="button"
          className="icon-button"
          aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          onClick={() => setTheme((current) => (current === "dark" ? "light" : "dark"))}
        >
          {theme === "dark" ? "☀" : "☾"}
        </button>
      </div>

      <button
        type="button"
        className="icon-button help-button"
        aria-label="Open usage help"
        onClick={() => setShowHelp((value) => !value)}
      >
        ?
      </button>

      {showHelp && (
        <div className="help-panel" role="dialog" aria-live="polite">
          <h4>How it works</h4>
          <ul>
            <li>Choose Print or Scan to start.</li>
            <li>Upload a PDF or select a scan slot.</li>
            <li>Choose your pickup time and pay.</li>
            <li>Use the job OTP to collect your order.</li>
          </ul>
        </div>
      )}

      <div key={location.pathname} className="page-fade-shell">
        <Routes>
      <Route path="/" element={<PageFade><Landing /></PageFade>} />
      <Route path="/login" element={<PageFade><Auth mode="login" onAuth={setUser} /></PageFade>} />
      <Route path="/signup" element={<PageFade><Auth mode="signup" onAuth={setUser} /></PageFade>} />
      <Route
        path="/*"
        element={
          token && user ? (
            <Shell user={user}>
              <Routes>
                <Route path="/home" element={<Home />} />
                <Route path="/print" element={<PrintFlow />} />
                <Route path="/print/:id" element={<PrintFlow />} />
                <Route path="/scan" element={<ScanFlow />} />
                <Route path="/scheduled" element={<JobsList filter="scheduled" />} />
                <Route path="/history" element={<JobsList filter="history" />} />
                <Route path="/job/:id" element={<JobStatus />} />
                <Route path="/vendor" element={<VendorBoard />} />
                <Route path="*" element={<Navigate to={user.role === "vendor" ? "/vendor" : "/home"} />} />
              </Routes>
            </Shell>
          ) : (
            <Navigate to="/login" />
          )
        }
      />
        </Routes>
      </div>
    </>
  );
}
