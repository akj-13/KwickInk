import { api, getUser } from "./api";

function loadCheckout() {
  if (window.Razorpay) return Promise.resolve(window.Razorpay);
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(window.Razorpay);
    script.onerror = () => reject(new Error("Could not load Razorpay Checkout"));
    document.body.appendChild(script);
  });
}

export async function demoPay(jobId) {
  const order = await api.createOrder(jobId, "demo");
  return api.simulatePay(order.order_id);
}

export async function razorpayPay(jobId) {
  const order = await api.createOrder(jobId, "razorpay");
  const keyId = order.key_id || import.meta.env.VITE_RAZORPAY_KEY_ID;
  if (order.gateway !== "razorpay" || !keyId) {
    throw new Error("Razorpay keys are not set. Use Demo pay, or configure VITE_RAZORPAY_KEY_ID / backend.env keys.");
  }
  const Razorpay = await loadCheckout();
  const user = getUser();
  return new Promise((resolve, reject) => {
    const checkout = new Razorpay({
      key: keyId,
      amount: order.amount_paise,
      currency: order.currency || "INR",
      name: "KwickInk",
      description: "Campus print / scan",
      order_id: order.order_id,
      prefill: { name: user?.name || "", email: user?.email || "" },
      theme: { color: "#0891b2" },
      handler: async (response) => {
        try {
          resolve(await api.verifyRazorpay(response));
        } catch (err) {
          reject(err);
        }
      },
      modal: {
        ondismiss: () => reject(new Error("Payment cancelled")),
      },
    });
    checkout.on("payment.failed", (resp) => {
      reject(new Error(resp.error?.description || "Razorpay payment failed"));
    });
    checkout.open();
  });
}
