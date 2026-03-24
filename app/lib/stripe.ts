import Stripe from "stripe";

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-02-25.clover",
});

// Map plan IDs to Stripe Price IDs (recurring)
export const PLAN_CONFIG: Record<string, { priceId: string; type: "SIGNALS" | "MANAGED"; name: string }> = {
  signals_monthly: {
    priceId: process.env.STRIPE_PRICE_SIGNALS_MONTHLY || "",
    type: "SIGNALS",
    name: "Kodex Signals — Monthly",
  },
  signals_quarterly: {
    priceId: process.env.STRIPE_PRICE_SIGNALS_QUARTERLY || "",
    type: "SIGNALS",
    name: "Kodex Signals — Quarterly",
  },
  managed_monthly: {
    priceId: process.env.STRIPE_PRICE_MANAGED_MONTHLY || "",
    type: "MANAGED",
    name: "Kodex Managed Trading — Monthly",
  },
};
