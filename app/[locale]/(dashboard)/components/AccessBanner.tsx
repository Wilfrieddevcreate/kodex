"use client";

import { Link } from "@/app/i18n/navigation";
import { usePathname } from "next/navigation";

interface Props {
  status: "trial" | "subscribed" | "expiring" | "expired" | "none";
  trialEndsAt?: string | null;
  subscriptionEndsAt?: string | null;
  subscriptionType?: string | null;
  daysLeft?: number;
}

// Pages allowed even when expired
const ALLOWED_PATHS = ["/subscribe", "/subscription", "/invoices", "/settings", "/affiliation"];

export default function AccessBanner({ status, trialEndsAt, subscriptionEndsAt, subscriptionType, daysLeft }: Props) {
  const pathname = usePathname();
  if (status === "trial" && trialEndsAt) {
    const endDate = new Date(trialEndsAt).toLocaleDateString("en-GB");
    return (
      <div className="mb-4 rounded-xl bg-amber-500/10 border border-amber-500/20 px-4 py-3 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2.5">
          <span className="flex h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
          <span className="text-sm text-amber-400 font-medium">
            Free trial — expires {endDate} ({daysLeft} day{daysLeft !== 1 ? "s" : ""} left)
          </span>
        </div>
        <Link href="/subscribe" className="rounded-lg bg-primary px-4 py-1.5 text-xs font-semibold text-white hover:bg-primary-hover transition-colors">
          Subscribe now
        </Link>
      </div>
    );
  }

  if (status === "expiring" && subscriptionEndsAt) {
    const endDate = new Date(subscriptionEndsAt).toLocaleDateString("en-GB");
    return (
      <div className="mb-4 rounded-xl bg-amber-500/10 border border-amber-500/20 px-4 py-3 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2.5">
          <span className="flex h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
          <span className="text-sm text-amber-400 font-medium">
            Your {subscriptionType === "MANAGED" ? "Managed Trading" : "Signals"} subscription expires on {endDate} ({daysLeft} day{daysLeft !== 1 ? "s" : ""} left)
          </span>
        </div>
        <Link href="/subscribe" className="rounded-lg bg-primary px-4 py-1.5 text-xs font-semibold text-white hover:bg-primary-hover transition-colors">
          Renew
        </Link>
      </div>
    );
  }

  if (status === "subscribed") {
    return null; // No banner needed when subscription is active and not expiring
  }

  if (status === "expired" || status === "none") {
    // Check if current page is allowed
    const isAllowed = ALLOWED_PATHS.some((p) => pathname.includes(p));

    if (!isAllowed) {
      // Full blocking overlay
      return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-sm">
          <div className="text-center max-w-md px-6">
            <div className="mb-6 flex h-20 w-20 mx-auto items-center justify-center rounded-2xl bg-red-500/10">
              <svg className="h-10 w-10 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-white mb-3">
              {status === "expired" ? "Subscription expired" : "Subscription required"}
            </h2>
            <p className="text-sm text-white/40 mb-8 leading-relaxed">
              {status === "expired"
                ? "Your subscription has expired. Renew now to continue accessing trading signals and features."
                : "Subscribe to access trading signals, market news, and all Kodex features."}
            </p>
            <Link
              href="/subscribe"
              className="btn-glow inline-block rounded-xl bg-primary px-8 py-3.5 text-sm font-semibold text-white hover:bg-primary-hover transition-all"
            >
              Subscribe now
            </Link>
            <div className="mt-4 flex justify-center gap-4">
              <Link href="/dashboard/invoices" className="text-xs text-white/30 hover:text-white/50 transition-colors">
                View invoices
              </Link>
              <Link href="/dashboard/settings" className="text-xs text-white/30 hover:text-white/50 transition-colors">
                Settings
              </Link>
            </div>
          </div>
        </div>
      );
    }

    // On allowed pages, show banner only
    return (
      <div className="mb-4 rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-3 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2.5">
          <span className="flex h-2 w-2 rounded-full bg-red-400" />
          <span className="text-sm text-red-400 font-medium">
            Your access has expired. Subscribe to continue using Kodex.
          </span>
        </div>
        <Link href="/subscribe" className="rounded-lg bg-primary px-4 py-1.5 text-xs font-semibold text-white hover:bg-primary-hover transition-colors">
          Subscribe
        </Link>
      </div>
    );
  }

  return null;
}
