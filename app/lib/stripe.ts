import Stripe from "stripe";

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-02-25.clover",
});

// Prices config — map plan type + duration to Stripe price IDs
// You'll create these in Stripe Dashboard and paste the IDs here
export const STRIPE_PRICES: Record<string, Record<number, { priceId: string; amount: number }>> = {
  signals: {
    1: { priceId: "price_signals_1m", amount: 2999 },
    3: { priceId: "price_signals_3m", amount: 7999 },
    6: { priceId: "price_signals_6m", amount: 14999 },
    12: { priceId: "price_signals_12m", amount: 26999 },
  },
  managed: {
    1: { priceId: "price_managed_1m", amount: 9999 },
    3: { priceId: "price_managed_3m", amount: 26999 },
    6: { priceId: "price_managed_6m", amount: 49999 },
    12: { priceId: "price_managed_12m", amount: 89999 },
  },
};
