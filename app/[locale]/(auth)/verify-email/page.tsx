"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useRouter } from "@/app/i18n/navigation";

function VerifyEmailForm() {
  const t = useTranslations("auth.verifyEmail");
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get("email") || "";

  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function handleVerify(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/verify-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code }),
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

  async function handleResend() {
    setResending(true);
    setError("");
    setSuccess("");

    try {
      const res = await fetch("/api/auth/resend-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      if (res.ok) {
        setSuccess(t("resent"));
      } else {
        const result = await res.json();
        setError(result.error || t("error"));
      }
    } catch {
      setError(t("error"));
    } finally {
      setResending(false);
    }
  }

  return (
    <div className="text-center">
      <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-primary/20">
        <svg className="h-8 w-8 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
        </svg>
      </div>

      <h1 className="mb-2 text-3xl font-bold text-white">{t("title")}</h1>
      <p className="mb-8 text-sm text-white/50">
        {t("subtitle")} <span className="text-white/70">{email}</span>
      </p>

      {error && (
        <div className="mb-5 rounded-xl bg-red-500/20 border border-red-500/30 px-4 py-3 text-sm text-red-300">{error}</div>
      )}
      {success && (
        <div className="mb-5 rounded-xl bg-green-500/20 border border-green-500/30 px-4 py-3 text-sm text-green-300">{success}</div>
      )}

      <form method="POST" onSubmit={handleVerify} className="space-y-5">
        <input
          type="text"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="000000"
          required
          maxLength={6}
          className="input-glass input-glass-noicon text-center text-2xl font-bold tracking-[0.5em]"
        />
        <button
          type="submit"
          disabled={loading || code.length < 6}
          className="btn-glow w-full rounded-xl bg-primary py-3.5 text-sm font-semibold text-white transition-all hover:bg-primary-hover disabled:opacity-50"
        >
          {loading ? t("submitting") : t("submit")}
        </button>
      </form>

      <div className="mt-8">
        <button onClick={handleResend} disabled={resending} className="text-sm text-primary hover:text-primary-hover transition-colors disabled:opacity-50">
          {resending ? t("resending") : t("resend")}
        </button>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<div className="text-center text-sm text-white/40">...</div>}>
      <VerifyEmailForm />
    </Suspense>
  );
}
