"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import toast from "react-hot-toast";

const PLANS = [
  {
    id: "signals_monthly",
    name: "Signals",
    period: "Monthly",
    price: "29.99",
    interval: "month",
    features: ["Real-time crypto calls", "News & market updates", "All trading pairs", "Telegram alerts"],
    popular: true,
  },
  {
    id: "signals_quarterly",
    name: "Signals",
    period: "Quarterly",
    price: "79.99",
    interval: "3 months",
    monthlyPrice: "26.66",
    save: "11%",
    features: ["Everything in monthly", "Save 11%", "Priority support"],
    popular: false,
  },
  {
    id: "managed_monthly",
    name: "Managed Trading",
    period: "Monthly",
    price: "99.99",
    interval: "month",
    features: ["Expert traders manage your account", "Real-time calls & news", "API-connected trading", "Dedicated support", "Telegram alerts"],
    popular: false,
  },
];

export default function SubscribePage() {
  const searchParams = useSearchParams();
  const canceled = searchParams.get("canceled");
  const [loading, setLoading] = useState<string | null>(null);

  async function handleCheckout(planId: string) {
    setLoading(planId);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        toast.error(data.error || "Failed to start checkout");
        setLoading(null);
      }
    } catch {
      toast.error("An error occurred");
      setLoading(null);
    }
  }

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center pt-8 lg:pt-0 px-2">
      {canceled && (
        <div className="mb-6 w-full max-w-4xl rounded-xl bg-amber-500/10 border border-amber-500/20 px-4 py-3 text-sm text-amber-400 text-center">
          Payment canceled. You can try again.
        </div>
      )}

      <div className="text-center mb-10">
        <h1 className="text-3xl font-bold text-white mb-3">Choose your plan</h1>
        <p className="text-base text-white/40 max-w-md mx-auto">Subscribe to access crypto signals, market news, and expert trading services.</p>
      </div>

      <div className="grid gap-6 grid-cols-1 md:grid-cols-3 max-w-5xl w-full">
        {PLANS.map((plan) => (
          <div key={plan.id} className={`relative rounded-2xl border p-6 transition-all ${plan.popular ? "border-primary/40 bg-primary/5 shadow-lg shadow-primary/10" : "border-white/10 bg-white/[0.02]"}`}>
            {plan.popular && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-4 py-1 text-[10px] font-bold text-white uppercase tracking-wider shadow-lg shadow-primary/30">
                Most Popular
              </div>
            )}

            <div className="mb-6">
              <h3 className="text-lg font-bold text-white">{plan.name}</h3>
              <p className="text-xs text-white/30 mt-0.5">{plan.period}</p>
            </div>

            <div className="mb-2">
              <span className="text-4xl font-bold text-white">{plan.price}</span>
              <span className="text-base text-white/30 ml-1">€</span>
              <span className="text-sm text-white/20 ml-1">/ {plan.interval}</span>
            </div>

            {plan.monthlyPrice && (
              <p className="text-xs text-primary mb-4">{plan.monthlyPrice}€/month — Save {plan.save}</p>
            )}
            {!plan.monthlyPrice && <div className="mb-4" />}

            <ul className="space-y-3 mb-8">
              {plan.features.map((f, i) => (
                <li key={i} className="flex items-center gap-2.5 text-sm text-white/60">
                  <svg className="h-4 w-4 text-primary shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                  {f}
                </li>
              ))}
            </ul>

            <button
              onClick={() => handleCheckout(plan.id)}
              disabled={loading !== null}
              className={`w-full rounded-xl py-3 text-sm font-semibold transition-all disabled:opacity-50 cursor-pointer ${
                plan.popular
                  ? "btn-glow bg-primary text-white hover:bg-primary-hover"
                  : "border border-white/10 text-white/70 hover:bg-white/5 hover:text-white"
              }`}
            >
              {loading === plan.id ? "Redirecting to Stripe..." : "Subscribe"}
            </button>

            <p className="text-[10px] text-white/20 text-center mt-3">Cancel anytime. Billed automatically.</p>
          </div>
        ))}
      </div>
    </div>
  );
}
