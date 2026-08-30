import { useEffect, useState } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
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

export default function App() {
  const [user, setUser] = useState(getUser());
  const token = getToken();

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
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Auth mode="login" onAuth={setUser} />} />
      <Route path="/signup" element={<Auth mode="signup" onAuth={setUser} />} />
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
  );
}
