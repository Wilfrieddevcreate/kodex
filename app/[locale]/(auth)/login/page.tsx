"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/app/i18n/navigation";

export default function LoginPage() {
  const t = useTranslations("auth.login");
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const formData = new FormData(e.currentTarget);
    const data = {
      email: formData.get("email") as string,
      password: formData.get("password") as string,
    };

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const result = await res.json();

      if (!res.ok) {
        setError(result.error || t("error"));
        setLoading(false);
        return;
      }

      if (!result.emailVerified) {
        router.push(`/verify-email?email=${encodeURIComponent(data.email)}`);
        return;
      }

      router.push(result.user?.role === "ADMIN" ? "/admin" : "/dashboard");
    } catch {
      setError(t("error"));
      setLoading(false);
    }
  }

  return (
    <div className="text-center">
      <h1 className="mb-2 text-3xl font-bold text-white">{t("title")}</h1>
      <p className="mb-8 text-sm text-white/50">{t("subtitle")}</p>

      {error && (
        <div className="mb-5 rounded-xl bg-red-500/20 border border-red-500/30 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      <form method="POST" onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-left text-xs font-medium text-white/60 mb-2 uppercase tracking-wider">
            {t("email")}
          </label>
          <div className="relative">
            <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
            </svg>
            <input name="email" type="email" placeholder="name@example.com" required className="input-glass" />
          </div>
        </div>

        <div>
          <label className="block text-left text-xs font-medium text-white/60 mb-2 uppercase tracking-wider">
            {t("password")}
          </label>
          <div className="relative">
            <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
            </svg>
            <input name="password" type="password" placeholder="••••••••" required className="input-glass" />
          </div>
        </div>

        <div className="text-right">
          <Link href="/forgot-password" className="text-xs text-primary hover:text-primary-hover transition-colors">
            {t("forgotPassword")}
          </Link>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="btn-glow w-full rounded-xl bg-primary py-3.5 text-sm font-semibold text-white transition-all hover:bg-primary-hover disabled:opacity-50"
        >
          {loading ? t("submitting") : t("submit")}
        </button>
      </form>

      <div className="mt-8 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />

      <p className="mt-6 text-sm text-white/40">
        {t("noAccount")}{" "}
        <Link href="/register" className="font-medium text-primary hover:text-primary-hover transition-colors">
          {t("registerLink")}
        </Link>
      </p>
    </div>
  );
}
