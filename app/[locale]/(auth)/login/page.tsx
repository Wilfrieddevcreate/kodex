"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/app/i18n/navigation";
import { HiOutlineMail, HiOutlineLockClosed, HiOutlineEye, HiOutlineEyeOff } from "react-icons/hi";

export default function LoginPage() {
  const t = useTranslations("auth.login");
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

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
            <HiOutlineMail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-primary z-10" />
            <input name="email" type="email" placeholder="name@example.com" required className="input-glass" />
          </div>
        </div>

        <div>
          <label className="block text-left text-xs font-medium text-white/60 mb-2 uppercase tracking-wider">
            {t("password")}
          </label>
          <div className="relative">
            <HiOutlineLockClosed className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-primary z-10" />
            <input name="password" type={showPassword ? "text" : "password"} placeholder="••••••••" required className="input-glass pr-12" />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/50 hover:text-white z-10 transition-colors"
            >
              {showPassword ? <HiOutlineEyeOff className="h-5 w-5" /> : <HiOutlineEye className="h-5 w-5" />}
            </button>
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
