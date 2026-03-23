"use client";

import { useState } from "react";

interface Tier { id: string; minReferrals: number; maxReferrals: number | null; amount: number; }

export default function SettingsAdmin({ settings, tiers: initialTiers }: {
  settings: {
    trialDurationDays: number; telegramBotToken: string; telegramChannelId: string; telegramBotUsername: string;
    commissionRate: number; commissionSecurityDays: number; commissionMonthlyCap: number;
  };
  tiers: Tier[];
}) {
  const [trialDays, setTrialDays] = useState(settings.trialDurationDays);
  const [telegramBot, setTelegramBot] = useState(settings.telegramBotToken);
  const [telegramBotUsername, setTelegramBotUsername] = useState(settings.telegramBotUsername);
  const [telegramChannel, setTelegramChannel] = useState(settings.telegramChannelId);
  const [commissionRate, setCommissionRate] = useState(settings.commissionRate * 100); // Display as %
  const [securityDays, setSecurityDays] = useState(settings.commissionSecurityDays);
  const [monthlyCap, setMonthlyCap] = useState(settings.commissionMonthlyCap);
  const [tiers, setTiers] = useState(initialTiers.map((t) => ({ min: t.minReferrals, max: t.maxReferrals, amount: t.amount })));
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function handleSave() {
    setSaving(true);
    await fetch("/api/admin/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        trialDurationDays: trialDays,
        telegramBotToken: telegramBot || null,
        telegramBotUsername: telegramBotUsername || null,
        telegramChannelId: telegramChannel || null,
        commissionRate: commissionRate / 100, // Store as decimal
        commissionSecurityDays: securityDays,
        commissionMonthlyCap: monthlyCap,
        tiers: tiers.map((t) => ({ minReferrals: t.min, maxReferrals: t.max, amount: t.amount })),
      }),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  const inputClass = "w-full rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-sm text-white outline-none focus:border-primary";

  return (
    <div className="pt-8 lg:pt-0 max-w-3xl">
      <h1 className="text-2xl font-bold text-white mb-8">Settings</h1>

      {/* Trial */}
      <div className="card-dark p-6 mb-4">
        <h2 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
          <svg className="h-4 w-4 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          Free Trial
        </h2>
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <label className="block text-xs text-white/30 uppercase tracking-wider mb-2">Duration (days)</label>
            <input type="number" value={trialDays} onChange={(e) => setTrialDays(parseInt(e.target.value) || 0)} min={0} max={365} className={inputClass} />
          </div>
          <div className="flex-1">
            <label className="block text-xs text-white/30 uppercase tracking-wider mb-2">&nbsp;</label>
            <p className="text-sm text-white/30 py-3">New users get {trialDays} day{trialDays !== 1 ? "s" : ""} of free access</p>
          </div>
        </div>
      </div>

      {/* Telegram */}
      <div className="card-dark p-6 mb-4">
        <h2 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
          <svg className="h-4 w-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" /></svg>
          Telegram Notifications
        </h2>
        <div className="space-y-4">
          <div>
            <label className="block text-xs text-white/30 uppercase tracking-wider mb-2">Bot Token</label>
            <input type="password" value={telegramBot} onChange={(e) => setTelegramBot(e.target.value)} placeholder="123456:ABC-DEF..." className={inputClass} />
          </div>
          <div>
            <label className="block text-xs text-white/30 uppercase tracking-wider mb-2">Bot Username</label>
            <input value={telegramBotUsername} onChange={(e) => setTelegramBotUsername(e.target.value)} placeholder="KodexBot (without @)" className={inputClass} />
            <p className="text-xs text-white/15 mt-1">Used to generate connect links for users</p>
          </div>
          <div>
            <label className="block text-xs text-white/30 uppercase tracking-wider mb-2">Channel ID <span className="text-white/15 normal-case">— optional, for public channel</span></label>
            <input value={telegramChannel} onChange={(e) => setTelegramChannel(e.target.value)} placeholder="@kodex_signals or -1001234..." className={inputClass} />
          </div>
        </div>
      </div>

      {/* Commission Settings */}
      <div className="card-dark p-6 mb-4">
        <h2 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
          <svg className="h-4 w-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          Affiliate Commissions
        </h2>
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
          <div>
            <label className="block text-xs text-white/30 uppercase tracking-wider mb-2">Rate (%)</label>
            <input type="number" value={commissionRate} onChange={(e) => setCommissionRate(parseFloat(e.target.value) || 0)} min={0} max={100} step={0.5} className={inputClass} />
            <p className="text-xs text-white/15 mt-1">% on net payment (after Stripe fees)</p>
          </div>
          <div>
            <label className="block text-xs text-white/30 uppercase tracking-wider mb-2">Security period (days)</label>
            <input type="number" value={securityDays} onChange={(e) => setSecurityDays(parseInt(e.target.value) || 0)} min={0} max={180} className={inputClass} />
            <p className="text-xs text-white/15 mt-1">Hold before commission becomes available</p>
          </div>
          <div>
            <label className="block text-xs text-white/30 uppercase tracking-wider mb-2">Monthly cap (€) <span className="text-white/15 normal-case">— optional</span></label>
            <input type="number" value={monthlyCap || ""} onChange={(e) => setMonthlyCap(e.target.value ? parseFloat(e.target.value) : 0)} min={0} step={100} placeholder="No limit" className={inputClass} />
            <p className="text-xs text-white/15 mt-1">{monthlyCap > 0 ? `Limited to ${monthlyCap}€/month per affiliate` : "No limit — affiliates can earn unlimited commissions"}</p>
          </div>
        </div>
      </div>

      {/* Commission Tiers */}
      <div className="card-dark p-6 mb-6">
        <h2 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
          <svg className="h-4 w-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          Commission Tiers
        </h2>
        <div className="space-y-3 mb-4">
          {tiers.map((tier, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="flex-1">
                <input type="number" value={tier.min} onChange={(e) => { const n = [...tiers]; n[i].min = parseInt(e.target.value) || 0; setTiers(n); }} placeholder="Min" className={inputClass} />
              </div>
              <span className="text-white/20">to</span>
              <div className="flex-1">
                <input type="number" value={tier.max ?? ""} onChange={(e) => { const n = [...tiers]; n[i].max = e.target.value ? parseInt(e.target.value) : null; setTiers(n); }} placeholder="Max (empty=∞)" className={inputClass} />
              </div>
              <span className="text-white/20">=</span>
              <div className="flex-1">
                <input type="number" step="0.01" value={tier.amount} onChange={(e) => { const n = [...tiers]; n[i].amount = parseFloat(e.target.value) || 0; setTiers(n); }} placeholder="€" className={inputClass} />
              </div>
              <button onClick={() => setTiers(tiers.filter((_, j) => j !== i))} className="text-red-400/50 hover:text-red-400 text-xs">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
          ))}
        </div>
        <button onClick={() => setTiers([...tiers, { min: (tiers[tiers.length - 1]?.max ?? 0) + 1, max: null, amount: 0 }])} className="text-xs text-primary hover:text-primary-hover">+ Add tier</button>
      </div>

      {/* Save */}
      <div className="flex items-center gap-4">
        <button onClick={handleSave} disabled={saving} className="btn-glow rounded-xl bg-primary px-8 py-3 text-sm font-semibold text-white hover:bg-primary-hover disabled:opacity-50">
          {saving ? "Saving..." : "Save Settings"}
        </button>
        {saved && <span className="text-sm text-emerald-400">Settings saved!</span>}
      </div>
    </div>
  );
}
