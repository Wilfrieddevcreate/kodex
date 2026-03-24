"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import { showSuccess, showError, confirmDelete } from "@/app/lib/swal";
import { useRouter } from "@/app/i18n/navigation";
import TelegramLoginWidget from "@/app/[locale]/components/TelegramLoginWidget";

interface UserData { id: string; firstName: string; lastName: string; email: string; phone: string; telegramChatId: string | null; }

export default function SettingsClient({ user, telegramBotUsername }: { user: UserData; telegramBotUsername: string | null }) {
  const router = useRouter();
  const [profile, setProfile] = useState(user);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [disconnectingTg, setDisconnectingTg] = useState(false);

  const inputClass = "w-full rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-sm text-white outline-none focus:border-primary transition-colors placeholder:text-white/20";

  async function handleProfile(e: React.FormEvent) {
    e.preventDefault();
    setSavingProfile(true);
    const res = await fetch("/api/user/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(profile),
    });
    setSavingProfile(false);
    if (res.ok) {
      showSuccess("Profile updated");
      router.refresh();
    } else {
      const data = await res.json();
      toast.error(data.error || "Failed to update");
    }
  }

  async function handlePassword(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSavingPassword(true);
    const fd = new FormData(e.currentTarget);
    const newPass = fd.get("newPassword") as string;
    const confirmPass = fd.get("confirmPassword") as string;

    if (newPass !== confirmPass) {
      toast.error("Passwords do not match");
      setSavingPassword(false);
      return;
    }

    const res = await fetch("/api/user/password", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword: fd.get("currentPassword"), newPassword: newPass }),
    });
    setSavingPassword(false);
    if (res.ok) {
      showSuccess("Password changed");
      e.currentTarget.reset();
    } else {
      const data = await res.json();
      showError("Error", data.error || "Failed to change password");
    }
  }

  async function handleDisconnectTelegram() {
    const confirmed = await confirmDelete("your Telegram connection");
    if (!confirmed) return;
    setDisconnectingTg(true);
    const res = await fetch("/api/user/telegram", { method: "DELETE" });
    setDisconnectingTg(false);
    if (res.ok) {
      showSuccess("Telegram disconnected");
      router.refresh();
    } else {
      toast.error("Failed to disconnect");
    }
  }

  async function handleDeleteAccount() {
    const confirmed = await confirmDelete("your entire account");
    if (!confirmed) return;
    toast.error("Contact support to delete your account");
  }

  return (
    <div className="pt-8 lg:pt-0 max-w-3xl">
      <h1 className="text-2xl font-bold text-white mb-6">Settings</h1>

      {/* Profile */}
      <form onSubmit={handleProfile} className="card-dark p-6 mb-4">
        <h2 className="text-sm font-semibold text-white mb-5">Profile</h2>
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
          <div>
            <label className="block text-xs font-medium text-white/30 uppercase tracking-wider mb-2">Last name</label>
            <input value={profile.lastName} onChange={(e) => setProfile({ ...profile, lastName: e.target.value })} className={inputClass} />
          </div>
          <div>
            <label className="block text-xs font-medium text-white/30 uppercase tracking-wider mb-2">First name</label>
            <input value={profile.firstName} onChange={(e) => setProfile({ ...profile, firstName: e.target.value })} className={inputClass} />
          </div>
          <div>
            <label className="block text-xs font-medium text-white/30 uppercase tracking-wider mb-2">Email</label>
            <input value={profile.email} disabled className={`${inputClass} cursor-not-allowed text-white/30`} />
          </div>
          <div>
            <label className="block text-xs font-medium text-white/30 uppercase tracking-wider mb-2">Phone</label>
            <input value={profile.phone} onChange={(e) => setProfile({ ...profile, phone: e.target.value })} className={inputClass} />
          </div>
        </div>
        <button type="submit" disabled={savingProfile} className="btn-glow mt-5 rounded-xl bg-primary px-6 py-2.5 text-sm font-semibold text-white hover:bg-primary-hover disabled:opacity-50">
          {savingProfile ? "Saving..." : "Save changes"}
        </button>
      </form>

      {/* Telegram */}
      <div className="card-dark p-6 mb-4">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#2AABEE]/15">
            <svg className="h-5 w-5 text-[#2AABEE]" viewBox="0 0 24 24" fill="currentColor">
              <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
            </svg>
          </div>
          <div>
            <h2 className="text-sm font-semibold text-white">Telegram Notifications</h2>
            <p className="text-xs text-white/30">Receive calls and news directly on Telegram</p>
          </div>
        </div>

        {user.telegramChatId ? (
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-emerald-400" />
                <span className="text-sm text-emerald-400 font-medium">Connected</span>
              </div>
              <button
                onClick={handleDisconnectTelegram}
                disabled={disconnectingTg}
                className="text-xs text-red-400/60 hover:text-red-400 transition-colors"
              >
                {disconnectingTg ? "Disconnecting..." : "Disconnect"}
              </button>
            </div>
            {telegramBotUsername && (
              <div className="rounded-xl bg-[#2AABEE]/5 border border-[#2AABEE]/10 p-3">
                <p className="text-xs text-white/40 mb-2">Make sure you have started the bot to receive messages:</p>
                <a
                  href={`https://t.me/${telegramBotUsername}?start=connected`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-lg bg-[#2AABEE] px-4 py-2 text-xs font-semibold text-white hover:bg-[#229ED9] transition-colors"
                >
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
                  </svg>
                  Open @{telegramBotUsername} on Telegram
                </a>
              </div>
            )}
          </div>
        ) : telegramBotUsername ? (
          <div>
            <p className="text-xs text-white/30 mb-3">Click the button below to connect your Telegram account.</p>
            <TelegramLoginWidget
              botUsername={telegramBotUsername}
              onSuccess={() => router.refresh()}
            />
          </div>
        ) : (
          <p className="text-xs text-white/30">Telegram bot not configured. Contact admin.</p>
        )}
      </div>

      {/* Password */}
      <form onSubmit={handlePassword} className="card-dark p-6 mb-4">
        <h2 className="text-sm font-semibold text-white mb-5">Change password</h2>
        <div className="space-y-4 w-full sm:max-w-sm">
          <div>
            <label className="block text-xs font-medium text-white/30 uppercase tracking-wider mb-2">Current password</label>
            <input name="currentPassword" type="password" required placeholder="••••••••" className={inputClass} />
          </div>
          <div>
            <label className="block text-xs font-medium text-white/30 uppercase tracking-wider mb-2">New password</label>
            <input name="newPassword" type="password" required minLength={8} placeholder="Min. 8 chars, upper, lower, number" className={inputClass} />
          </div>
          <div>
            <label className="block text-xs font-medium text-white/30 uppercase tracking-wider mb-2">Confirm new password</label>
            <input name="confirmPassword" type="password" required minLength={8} placeholder="••••••••" className={inputClass} />
          </div>
        </div>
        <button type="submit" disabled={savingPassword} className="btn-glow mt-5 rounded-xl bg-primary px-6 py-2.5 text-sm font-semibold text-white hover:bg-primary-hover disabled:opacity-50">
          {savingPassword ? "Updating..." : "Update password"}
        </button>
      </form>

      {/* Danger */}
      <div className="card-dark p-6 border-red-500/20">
        <h2 className="text-sm font-semibold text-red-400 mb-2">Danger zone</h2>
        <p className="text-sm text-white/30 mb-4">Once you delete your account, there is no going back.</p>
        <button onClick={handleDeleteAccount} className="rounded-xl border border-red-500/30 bg-red-500/10 px-6 py-2.5 text-sm font-semibold text-red-400 hover:bg-red-500/20 transition-all">
          Delete account
        </button>
      </div>
    </div>
  );
}
