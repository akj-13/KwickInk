const TOKEN_KEY = "kwickink_token";
const USER_KEY = "kwickink_user";

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function getUser() {
  const raw = localStorage.getItem(USER_KEY);
  return raw ? JSON.parse(raw) : null;
}

export function setSession(token, user) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

async function request(path, options = {}) {
  const headers = { ...(options.headers || {}) };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  if (options.body && !(options.body instanceof FormData) && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }
  const res = await fetch(path, { ...options, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const detail = data.detail || data.message || res.statusText;
    throw new Error(typeof detail === "string" ? detail : JSON.stringify(detail));
  }
  return data;
}

export const api = {
  login: (email, password) => request("/api/auth/login", { method: "POST", body: JSON.stringify({ email, password }) }),
  register: (name, email, password) =>
    request("/api/auth/register", { method: "POST", body: JSON.stringify({ name, email, password }) }),
  me: () => request("/api/auth/me"),
  upload: (file, { color, duplex, copies }) => {
    const fd = new FormData();
    fd.append("file", file);
    fd.append("color", color);
    fd.append("duplex", duplex);
    fd.append("copies", copies);
    return request("/api/jobs/upload", { method: "POST", body: fd });
  },
  settings: (id, body) => request(`/api/jobs/${id}/settings`, { method: "PATCH", body: JSON.stringify(body) }),
  slots: (day) => request(`/api/jobs/slots${day ? `?day=${encodeURIComponent(day)}` : ""}`),
  setSlot: (id, slot_start) => request(`/api/jobs/${id}/slot`, { method: "POST", body: JSON.stringify({ slot_start }) }),
  mine: () => request("/api/jobs/mine"),
  job: (id) => request(`/api/jobs/${id}`),
  bookScan: (body) => request("/api/scans", { method: "POST", body: JSON.stringify(body) }),
  createOrder: (jobId) => request(`/api/payments/create-order?job_id=${jobId}`, { method: "POST" }),
  verifyPayment: (body) => request("/api/payments/verify-payment", { method: "POST", body: JSON.stringify(body) }),
  simulatePay: (order_id) => request("/api/payments/simulate", { method: "POST", body: JSON.stringify({ order_id }) }),
  vendorBoard: () => request("/api/vendor/board"),
  startJob: (id) => request(`/api/vendor/jobs/${id}/start`, { method: "POST" }),
  verifyOtp: (id, otp) => request(`/api/vendor/jobs/${id}/otp`, { method: "POST", body: JSON.stringify({ otp }) }),
};

function loadRazorpayScript() {
  return new Promise((resolve, reject) => {
    if (window.Razorpay) {
      resolve();
      return;
    }

    const existing = document.querySelector('script[src="https://checkout.razorpay.com/v1/checkout.js"]');
    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error("Razorpay checkout script failed to load.")), { once: true });
      return;
    }

    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Razorpay checkout script failed to load."));
    document.body.appendChild(script);
  });
}

// Opens the real Razorpay Checkout modal for an order created with live keys
// (order.gateway === "razorpay"). Resolves with the fields /payments/verify-payment
// expects; rejects if the script isn't available, the user cancels, or payment fails.
export async function openRazorpayCheckout(order, prefill = {}) {
  await loadRazorpayScript();

  const key = order?.key_id || import.meta.env.VITE_RAZORPAY_KEY_ID || "";
  if (!key) {
    throw new Error("Razorpay key is missing. Set VITE_RAZORPAY_KEY_ID in frontend/.env.");
  }

  return new Promise((resolve, reject) => {
    const rzp = new window.Razorpay({
      key,
      amount: order.amount,
      currency: order.currency,
      order_id: order.order_id,
      name: "KwickInk",
      description: "Campus print & scan payment",
      prefill: { name: prefill.name, email: prefill.email },
      theme: { color: "#22d3ee" },
      handler: (response) => {
        resolve({
          order_id: response.razorpay_order_id,
          payment_id: response.razorpay_payment_id,
          signature: response.razorpay_signature,
        });
      },
      modal: {
        ondismiss: () => reject(new Error("Payment was cancelled.")),
      },
    });
    rzp.on("payment.failed", (resp) => {
      reject(new Error(resp?.error?.description || "Razorpay payment failed."));
    });
    rzp.open();
  });
}

export function connectSocket(onMessage) {
  const token = getToken();
  if (!token) return null;
  const proto = location.protocol === "https:" ? "wss" : "ws";
  const ws = new WebSocket(`${proto}://${location.host}/ws`);
  ws.onopen = () => {
    ws.send(JSON.stringify({ token }));
  };
  ws.onmessage = (ev) => {
    try {
      onMessage(JSON.parse(ev.data));
    } catch {
      /* ignore */
    }
  };
  return ws;
}
