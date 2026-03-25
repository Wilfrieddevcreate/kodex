"use client";

import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { confirmDelete, showSuccess } from "@/app/lib/swal";
import CustomSelect from "@/app/[locale]/components/CustomSelect";

const PLATFORMS = ["Binance", "Bybit", "OKX", "Bitget", "Kraken", "KuCoin"];

interface TutorialVideo { id: string; title: string; videoUrl: string; description: string | null; }

export default function ManagedPage() {
  const [account, setAccount] = useState<{ platformName: string; apiKey: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedPlatform, setSelectedPlatform] = useState<string>(PLATFORMS[0]);
  const [videoWatched, setVideoWatched] = useState(false);
  const [guideVideo, setGuideVideo] = useState<TutorialVideo | null>(null);

  useEffect(() => {
    Promise.all([
      fetch("/api/user/managed").then((r) => r.json()),
      fetch("/api/user/managed/guide").then((r) => r.json()).catch(() => ({ video: null })),
    ]).then(([managed, guide]) => {
      setAccount(managed.account);
      setGuideVideo(guide.video || null);
      // If already connected, skip video
      if (managed.account) setVideoWatched(true);
      setLoading(false);
    });
  }, []);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    const fd = new FormData(e.currentTarget);
    const res = await fetch("/api/user/managed", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ platformName: fd.get("platform"), apiKey: fd.get("apiKey"), apiSecret: fd.get("apiSecret") }),
    });
    setSaving(false);
    if (res.ok) {
      showSuccess("Saved", "Your exchange account has been connected.");
      const d = await fetch("/api/user/managed").then((r) => r.json());
      setAccount(d.account);
    } else {
      toast.error("Failed to save");
    }
  }

  async function handleDelete() {
    const confirmed = await confirmDelete("your exchange connection");
    if (!confirmed) return;
    await fetch("/api/user/managed", { method: "DELETE" });
    setAccount(null);
    toast.success("Exchange disconnected");
  }

  const inputClass = "w-full rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-sm text-white outline-none focus:border-primary transition-colors placeholder:text-white/20";

  if (loading) return <div className="pt-8 lg:pt-0 text-white/30 text-sm">Loading...</div>;

  // Step 1: Show tutorial video first (if exists and account not connected)
  if (guideVideo && !videoWatched && !account) {
    return (
      <div className="pt-8 lg:pt-0 max-w-3xl">
        <h1 className="text-2xl font-bold text-white mb-2">Managed Trading</h1>
        <p className="text-sm text-white/40 mb-6">Before connecting your exchange, watch this quick guide to find your API keys.</p>

        <div className="card-dark overflow-hidden mb-6">
          {/* Video embed */}
          <div className="aspect-video bg-black relative">
            {guideVideo.videoUrl.includes("youtube.com") || guideVideo.videoUrl.includes("youtu.be") ? (
              <iframe
                src={guideVideo.videoUrl.replace("watch?v=", "embed/").replace("youtu.be/", "youtube.com/embed/")}
                className="w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            ) : (
              <video src={guideVideo.videoUrl} controls className="w-full h-full object-contain" />
            )}
          </div>
          <div className="p-5">
            <h2 className="text-base font-semibold text-white mb-1">{guideVideo.title}</h2>
            {guideVideo.description && <p className="text-sm text-white/40">{guideVideo.description}</p>}
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => setVideoWatched(true)}
            className="btn-glow rounded-xl bg-primary px-8 py-3 text-sm font-semibold text-white hover:bg-primary-hover"
          >
            I&apos;ve watched the video — Continue
          </button>
        </div>
      </div>
    );
  }

  // Step 2: API keys form
  return (
    <div className="pt-8 lg:pt-0 max-w-2xl">
      <h1 className="text-2xl font-bold text-white mb-2">Managed Trading</h1>
      <p className="text-sm text-white/40 mb-8">Connect your exchange account and let our experts trade for you.</p>

      {/* Security banner */}
      <div className="card-dark p-5 mb-6 flex items-start gap-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/15">
          <svg className="h-5 w-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
          </svg>
        </div>
        <div>
          <p className="text-sm font-medium text-white mb-1">Your keys are encrypted</p>
          <p className="text-xs text-white/30 leading-relaxed">We use AES-256-GCM encryption to store your API keys. We only need trading permissions — never enable withdrawal.</p>
        </div>
      </div>

      {/* Connected account */}
      {account && (
        <div className="card-dark p-5 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/15">
                <svg className="h-5 w-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
                </svg>
              </div>
              <div>
                <div className="text-sm font-semibold text-white">{account.platformName}</div>
                <div className="text-xs text-white/30 font-mono">{account.apiKey}</div>
              </div>
            </div>
            <span className="rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 text-[10px] font-semibold text-emerald-400 uppercase">Connected</span>
          </div>
          <button onClick={handleDelete} className="mt-4 text-xs text-red-400/60 hover:text-red-400 transition-colors">Disconnect account</button>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="card-dark p-6 space-y-5">
        <h2 className="text-sm font-semibold text-white">{account ? "Update connection" : "Connect your exchange"}</h2>

        <div>
          <label className="block text-xs text-white/30 uppercase tracking-wider mb-2">Platform</label>
          <input type="hidden" name="platform" value={selectedPlatform} />
          <CustomSelect
            options={PLATFORMS.map((p) => ({ value: p, label: p }))}
            value={{ value: selectedPlatform, label: selectedPlatform }}
            onChange={(opt) => setSelectedPlatform(opt?.value || PLATFORMS[0])}
            isSearchable={false}
          />
        </div>

        <div>
          <label className="block text-xs text-white/30 uppercase tracking-wider mb-2">API Key</label>
          <input name="apiKey" required placeholder="Enter your API key" className={inputClass} />
        </div>

        <div>
          <label className="block text-xs text-white/30 uppercase tracking-wider mb-2">API Secret</label>
          <input name="apiSecret" type="password" required placeholder="Enter your API secret" className={inputClass} />
        </div>

        <button type="submit" disabled={saving} className="btn-glow w-full rounded-xl bg-primary py-3 text-sm font-semibold text-white transition-all hover:bg-primary-hover disabled:opacity-50">
          {saving ? "Saving..." : account ? "Update connection" : "Connect exchange"}
        </button>
      </form>

      {/* Watch video again */}
      {guideVideo && (
        <button
          onClick={() => setVideoWatched(false)}
          className="mt-4 text-xs text-white/20 hover:text-white/40 transition-colors"
        >
          Watch setup guide again
        </button>
      )}
    </div>
  );
}
