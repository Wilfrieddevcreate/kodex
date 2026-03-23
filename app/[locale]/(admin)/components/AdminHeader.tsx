"use client";

import { useRouter } from "@/app/i18n/navigation";
import LanguageSelector from "../../components/LanguageSelector";
import NotificationBell from "../../components/NotificationBell";

export default function AdminHeader({ userName }: { userName: string }) {
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }

  return (
    <header className="flex h-16 items-center justify-end border-b border-white/5 bg-black px-4 sm:px-8">
      <div className="flex items-center gap-3">
        <LanguageSelector />
        <NotificationBell />
        <div className="hidden sm:flex items-center gap-2.5 rounded-xl border border-white/10 px-3 py-1.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-red-500/15 text-xs font-bold text-red-400">A</div>
          <span className="text-sm font-medium text-white/70">{userName}</span>
        </div>
        <button onClick={handleLogout} className="flex items-center gap-2 rounded-xl border border-white/10 px-3.5 py-2 text-sm text-white/50 transition-all hover:bg-white/5 hover:text-white/80">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" /></svg>
        </button>
      </div>
    </header>
  );
}
