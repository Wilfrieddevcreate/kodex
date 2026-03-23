"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";

const DURATIONS = [
  { months: 1, key: "1month" },
  { months: 3, key: "3months" },
  { months: 6, key: "6months" },
  { months: 12, key: "12months" },
];

const PRICES = {
  signals: { 1: 29.99, 3: 79.99, 6: 149.99, 12: 269.99 },
  managed: { 1: 99.99, 3: 269.99, 6: 499.99, 12: 899.99 },
} as const;

function getMonthlyPrice(total: number, months: number) {
  return (total / months).toFixed(2);
}

function getSavingPercent(pricePerMonth: number, months: number, total: number) {
  if (months === 1) return 0;
  const fullPrice = pricePerMonth * months;
  return Math.round(((fullPrice - total) / fullPrice) * 100);
}

export default function SubscribePage() {
  const t = useTranslations("dashboard.subscribe");
  const searchParams = useSearchParams();
  const canceled = searchParams.get("canceled");
  const [selectedDuration, setSelectedDuration] = useState(1);
  const [loading, setLoading] = useState<string | null>(null);

  async function handleCheckout(plan: "signals" | "managed") {
    setLoading(plan);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan, months: selectedDuration }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch {
      setLoading(null);
    }
  }

  const signalsTotal = PRICES.signals[selectedDuration as keyof typeof PRICES.signals];
  const managedTotal = PRICES.managed[selectedDuration as keyof typeof PRICES.managed];
  const signalsSaving = getSavingPercent(PRICES.signals[1], selectedDuration, signalsTotal);
  const managedSaving = getSavingPercent(PRICES.managed[1], selectedDuration, managedTotal);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center pt-8 lg:pt-0 px-2">
      {canceled && (
        <div className="mb-6 w-full max-w-3xl rounded-xl bg-amber-500/10 border border-amber-500/20 px-4 py-3 text-sm text-amber-400 text-center">
          Payment canceled. You can try again.
        </div>
      )}

      <div className="mb-8 text-center">
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
          <svg className="h-8 w-8 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
          </svg>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-white">{t("title")}</h1>
        <p className="mt-2 max-w-md mx-auto text-sm sm:text-base text-white/40">{t("subtitle")}</p>
      </div>

      {/* Duration selector */}
      <div className="mb-8 inline-flex rounded-2xl bg-white/5 border border-white/10 p-1.5 gap-1">
        {DURATIONS.map((d) => (
          <button
            key={d.months}
            onClick={() => setSelectedDuration(d.months)}
            className={`relative rounded-xl px-4 sm:px-6 py-2.5 text-sm font-medium transition-all ${
              selectedDuration === d.months
                ? "bg-primary text-white shadow-lg shadow-primary/25"
                : "text-white/40 hover:text-white/70"
            }`}
          >
            {t(d.key)}
            {d.months >= 6 && selectedDuration !== d.months && (
              <span className="absolute -top-2 -right-1 rounded-full bg-emerald-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
                -{getSavingPercent(PRICES.signals[1], d.months, PRICES.signals[d.months as keyof typeof PRICES.signals])}%
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="grid w-full max-w-3xl gap-5 grid-cols-1 sm:grid-cols-2">
        {/* Signals */}
        <div className="card-dark p-7 group hover:border-primary/30 transition-all">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 mb-5">
            <svg className="h-5 w-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22" />
            </svg>
          </div>
          <h2 className="text-lg font-bold text-white">{t("signals")}</h2>
          <p className="mt-2 text-sm text-white/40 leading-relaxed">{t("signalsDesc")}</p>

          <div className="mt-6 mb-2">
            <span className="text-3xl sm:text-4xl font-extrabold text-white">{signalsTotal}€</span>
          </div>
          <div className="mb-6 flex items-center gap-2">
            <span className="text-sm text-white/30">
              {selectedDuration > 1
                ? `${getMonthlyPrice(signalsTotal, selectedDuration)}€${t("perMonth")}`
                : t("perMonth")}
            </span>
            {signalsSaving > 0 && (
              <span className="rounded-full bg-emerald-500/15 border border-emerald-500/20 px-2 py-0.5 text-xs font-semibold text-emerald-400">
                -{signalsSaving}%
              </span>
            )}
          </div>

          <button
            onClick={() => handleCheckout("signals")}
            disabled={loading === "signals"}
            className="btn-glow w-full rounded-xl bg-primary py-3 text-sm font-semibold text-white transition-all hover:bg-primary-hover disabled:opacity-50"
          >
            {loading === "signals" ? "..." : t("choosePlan")}
          </button>
        </div>

        {/* Managed */}
        <div className="card-dark relative p-7 border-primary/20 shadow-lg shadow-primary/5">
          <div className="absolute -top-3 left-1/2 -translate-x-1/2">
            <span className="rounded-full bg-primary px-4 py-1 text-xs font-semibold text-white shadow-md shadow-primary/30">Popular</span>
          </div>
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 mb-5">
            <svg className="h-5 w-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
            </svg>
          </div>
          <h2 className="text-lg font-bold text-white">{t("managed")}</h2>
          <p className="mt-2 text-sm text-white/40 leading-relaxed">{t("managedDesc")}</p>

          <div className="mt-6 mb-2">
            <span className="text-3xl sm:text-4xl font-extrabold text-white">{managedTotal}€</span>
          </div>
          <div className="mb-6 flex items-center gap-2">
            <span className="text-sm text-white/30">
              {selectedDuration > 1
                ? `${getMonthlyPrice(managedTotal, selectedDuration)}€${t("perMonth")}`
                : t("perMonth")}
            </span>
            {managedSaving > 0 && (
              <span className="rounded-full bg-emerald-500/15 border border-emerald-500/20 px-2 py-0.5 text-xs font-semibold text-emerald-400">
                -{managedSaving}%
              </span>
            )}
          </div>

          <button
            onClick={() => handleCheckout("managed")}
            disabled={loading === "managed"}
            className="btn-glow w-full rounded-xl bg-primary py-3 text-sm font-semibold text-white transition-all hover:bg-primary-hover disabled:opacity-50"
          >
            {loading === "managed" ? "..." : t("choosePlan")}
          </button>
        </div>
      </div>
    </div>
  );
}
