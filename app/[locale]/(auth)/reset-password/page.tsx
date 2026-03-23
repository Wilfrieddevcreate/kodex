"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/app/i18n/navigation";

function ResetPasswordForm() {
  const t = useTranslations("auth.resetPassword");
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get("email") || "";

  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (password !== confirmPassword) {
      setError(t("passwordMismatch"));
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code, password }),
      });

      const result = await res.json();

      if (!res.ok) {
        setError(result.error || t("error"));
        setLoading(false);
        return;
      }

      router.push("/login");
    } catch {
      setError(t("error"));
      setLoading(false);
    }
  }

  return (
    <div className="text-center">
      <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-primary/20">
        <svg className="h-8 w-8 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z" />
        </svg>
      </div>

      <h1 className="mb-2 text-3xl font-bold text-white">{t("title")}</h1>
      <p className="mb-8 text-sm text-white/50">{t("subtitle")}</p>

      {error && (
        <div className="mb-5 rounded-xl bg-red-500/20 border border-red-500/30 px-4 py-3 text-sm text-red-300">{error}</div>
      )}

      <form method="POST" onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-left text-xs font-medium text-white/60 mb-2 uppercase tracking-wider">{t("code")}</label>
          <input type="text" value={code} onChange={(e) => setCode(e.target.value)} placeholder="000000" required maxLength={6} className="input-glass input-glass-noicon text-center text-2xl font-bold tracking-[0.5em]" />
        </div>
        <div>
          <label className="block text-left text-xs font-medium text-white/60 mb-2 uppercase tracking-wider">{t("newPassword")}</label>
          <div className="relative">
            <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
            </svg>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required minLength={8} className="input-glass" />
          </div>
        </div>
        <div>
          <label className="block text-left text-xs font-medium text-white/60 mb-2 uppercase tracking-wider">{t("confirm")}</label>
          <div className="relative">
            <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
            </svg>
            <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="••••••••" required minLength={8} className="input-glass" />
          </div>
        </div>
        <button type="submit" disabled={loading || code.length < 6} className="btn-glow w-full rounded-xl bg-primary py-3.5 text-sm font-semibold text-white transition-all hover:bg-primary-hover disabled:opacity-50">
          {loading ? t("submitting") : t("submit")}
        </button>
      </form>

      <div className="mt-8 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />

      <p className="mt-6 text-sm text-white/40">
        <Link href="/login" className="font-medium text-primary hover:text-primary-hover transition-colors">{t("backToLogin")}</Link>
      </p>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="text-center text-sm text-white/40">...</div>}>
      <ResetPasswordForm />
    </Suspense>
  );
}
