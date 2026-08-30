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
    <div className="hero">
      <form className="hero-inner card" onSubmit={submit}>
        <div className="logo-row" style={{ justifyContent: "center" }}>
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
        <p className="muted">Zero-trust campus printing · {mode === "signup" ? "Create student ID" : "Secure login"}</p>
        {mode === "signup" && (
          <label className="field">
            Name
            <input value={name} onChange={(e) => setName(e.target.value)} required />
          </label>
        )}
        <label className="field">
          Campus email
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="username" />
        </label>
        <label className="field">
          Password
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete={mode === "signup" ? "new-password" : "current-password"} />
        </label>
        {mode === "login" && (
          <div className="pill-row">
            <button
              type="button"
              className="btn-outline"
              onClick={() => {
                setEmail("student@campus.edu");
                setPassword("student123");
              }}
            >
              Demo student
            </button>
            <button
              type="button"
              className="btn-outline"
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
        <button className="btn-solid" style={{ width: "100%", marginTop: 16 }} type="submit">
          {mode === "signup" ? "Create account" : "Enter"}
        </button>
        <p className="muted" style={{ marginTop: 16 }}>
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
