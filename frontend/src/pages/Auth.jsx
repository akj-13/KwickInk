import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api, setSession } from "../api";

export default function Auth({ mode, onAuth }) {
  const nav = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  async function submit(e) {
    e.preventDefault();
    setError("");
    try {
      const data =
        mode === "signup"
          ? await api.register(name, email, password)
          : await api.login(email, password);
      setSession(data.token, data.user);
      onAuth(data.user);
      nav(data.user.role === "vendor" ? "/vendor" : "/home");
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="auth-shell">
      <form className="auth-card" onSubmit={submit}>
        <div className="auth-brand-row">
          <div className="brand-mark">
            <img
              className="brand-logo"
              src="/logo.svg"
              alt="KwickInk logo"
              onError={(e) => {
                e.currentTarget.style.display = "none";
                const fallback = e.currentTarget.parentElement?.querySelector(".logo-mark");
                if (fallback) fallback.style.display = "block";
              }}
            />
            <div className="logo-mark" style={{ display: "none" }} />
          </div>
          <h1>KWICKINK</h1>
        </div>

        <p className="auth-subtitle">Zero-trust campus printing · {mode === "signup" ? "Create student ID" : "Secure login"}</p>

        {mode === "signup" && (
          <label className="field">
            <span>Name</span>
            <input value={name} onChange={(e) => setName(e.target.value)} required />
          </label>
        )}

        <label className="field">
          <span>Campus email</span>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="username" />
        </label>

        <label className="field">
          <span>Password</span>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete={mode === "signup" ? "new-password" : "current-password"} />
        </label>

        {mode === "login" && (
          <div className="auth-demo-row">
            <button
              type="button"
              className="auth-demo-btn"
              onClick={() => {
                setEmail("student@campus.edu");
                setPassword("student123");
              }}
            >
              Demo student
            </button>
            <button
              type="button"
              className="auth-demo-btn"
              onClick={() => {
                setEmail("vendor@kwickink.campus");
                setPassword("vendor123");
              }}
            >
              Demo shop
            </button>
          </div>
        )}

        {error && <p className="error">{error}</p>}

        <button className="auth-submit" type="submit">
          {mode === "signup" ? "Create account" : "Enter"}
        </button>

        <p className="auth-meta">
          {mode === "signup" ? (
            <>Already enrolled? <Link to="/login">Login</Link></>
          ) : (
            <>Need an ID? <Link to="/signup">Sign up</Link> (min 8 characters)</>
          )}
        </p>
      </form>
    </div>
  );
}
