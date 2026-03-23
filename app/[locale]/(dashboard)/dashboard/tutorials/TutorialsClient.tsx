"use client";

import { useState } from "react";

interface FaqData { id: string; question: string; answer: string; }
interface TutData { id: string; title: string; videoUrl: string; description: string | null; isManagedGuide: boolean; }

export default function TutorialsClient({ faqs, tutorials }: { faqs: FaqData[]; tutorials: TutData[] }) {
  const [tab, setTab] = useState<"videos" | "faq">("videos");
  const [openFaq, setOpenFaq] = useState<string | null>(null);

  return (
    <div className="pt-8 lg:pt-0">
      <h1 className="text-2xl font-bold text-white mb-6">Tutorials</h1>

      {/* Tabs */}
      <div className="mb-6 flex gap-3">
        <button onClick={() => setTab("videos")}
          className={`flex items-center gap-2.5 rounded-xl px-6 py-3 text-sm font-semibold transition-all duration-200 ${tab === "videos" ? "bg-primary text-white shadow-lg shadow-primary/25" : "bg-white/5 text-white/40 border border-white/10 hover:text-primary"}`}>
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0zM15.91 11.672a.375.375 0 010 .656l-5.603 3.113a.375.375 0 01-.557-.328V8.887c0-.286.307-.466.557-.327l5.603 3.112z" /></svg>
          Videos
          <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${tab === "videos" ? "bg-white/20 text-white" : "bg-white/5 text-white/30"}`}>{tutorials.length}</span>
        </button>
        <button onClick={() => setTab("faq")}
          className={`flex items-center gap-2.5 rounded-xl px-6 py-3 text-sm font-semibold transition-all duration-200 ${tab === "faq" ? "bg-primary text-white shadow-lg shadow-primary/25" : "bg-white/5 text-white/40 border border-white/10 hover:text-primary"}`}>
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z" /></svg>
          FAQ
          <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${tab === "faq" ? "bg-white/20 text-white" : "bg-white/5 text-white/30"}`}>{faqs.length}</span>
        </button>
      </div>

      {/* Videos */}
      {tab === "videos" && (
        tutorials.length > 0 ? (
          <div className="space-y-3">
            {tutorials.map((t) => (
              <a key={t.id} href={t.videoUrl} target="_blank" rel="noopener noreferrer" className="card-dark p-5 flex items-center gap-4 group hover:border-primary/20 transition-all block">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 group-hover:bg-primary/20 transition-colors">
                  <svg className="h-6 w-6 text-primary" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-white flex items-center gap-2">
                    {t.title}
                    {t.isManagedGuide && <span className="rounded-md bg-primary/15 px-1.5 py-0.5 text-[10px] font-bold text-primary">MANAGED</span>}
                  </div>
                  {t.description && <p className="text-xs text-white/30 mt-0.5 truncate">{t.description}</p>}
                </div>
                <svg className="h-5 w-5 text-white/20 group-hover:text-primary shrink-0 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" /></svg>
              </a>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/5">
              <svg className="h-7 w-7 text-white/20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0zM15.91 11.672a.375.375 0 010 .656l-5.603 3.113a.375.375 0 01-.557-.328V8.887c0-.286.307-.466.557-.327l5.603 3.112z" /></svg>
            </div>
            <p className="text-sm text-white/30">No tutorials available yet.</p>
          </div>
        )
      )}

      {/* FAQ */}
      {tab === "faq" && (
        faqs.length > 0 ? (
          <div className="max-w-3xl space-y-3">
            {faqs.map((faq) => (
              <div key={faq.id} className="card-dark overflow-hidden">
                <button onClick={() => setOpenFaq(openFaq === faq.id ? null : faq.id)} className="flex w-full items-center justify-between p-5 text-left">
                  <span className="text-sm font-medium text-white pr-4">{faq.question}</span>
                  <svg className={`h-5 w-5 shrink-0 text-white/30 transition-transform ${openFaq === faq.id ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" /></svg>
                </button>
                {openFaq === faq.id && (
                  <div className="px-5 pb-5 text-sm text-white/40 leading-relaxed border-t border-white/5 pt-4">{faq.answer}</div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/5">
              <svg className="h-7 w-7 text-white/20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712" /></svg>
            </div>
            <p className="text-sm text-white/30">No FAQ available yet.</p>
          </div>
        )
      )}
    </div>
  );
}
