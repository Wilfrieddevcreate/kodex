"use client";

import { useState } from "react";
import { useRouter } from "@/app/i18n/navigation";
import { confirmDelete, showSuccess } from "@/app/lib/swal";

interface FaqData { id: string; question: string; answer: string; sortOrder: number; }
interface TutData { id: string; title: string; videoUrl: string; description: string | null; isManagedGuide: boolean; sortOrder: number; }

export default function TutorialsAdmin({ faqs, tutorials }: { faqs: FaqData[]; tutorials: TutData[] }) {
  const router = useRouter();
  const [tab, setTab] = useState<"tutorials" | "faq">("tutorials");
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);

  const inputClass = "w-full rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-sm text-white outline-none focus:border-primary";

  async function createTutorial(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    await fetch("/api/admin/tutorials", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: fd.get("title"), videoUrl: fd.get("videoUrl"), description: fd.get("description"), isManagedGuide: fd.get("isManagedGuide") === "on" }),
    });
    setLoading(false); setShowForm(false);
    showSuccess("Added", "Tutorial has been added.");
    router.refresh();
  }

  async function createFaq(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    await fetch("/api/admin/faq", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question: fd.get("question"), answer: fd.get("answer") }),
    });
    setLoading(false); setShowForm(false);
    showSuccess("Added", "FAQ has been added.");
    router.refresh();
  }

  async function deleteItem(type: "tutorials" | "faq", id: string) {
    const confirmed = await confirmDelete(type === "tutorials" ? "this tutorial" : "this FAQ");
    if (!confirmed) return;
    await fetch(`/api/admin/${type}`, { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    showSuccess("Deleted");
    router.refresh();
  }

  return (
    <div className="pt-8 lg:pt-0">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">Tutorials & FAQ</h1>
        <button onClick={() => setShowForm(!showForm)} className="btn-glow rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary-hover">
          {showForm ? "Cancel" : `+ New ${tab === "tutorials" ? "Tutorial" : "FAQ"}`}
        </button>
      </div>

      {/* Tabs */}
      <div className="mb-6 flex gap-3">
        {(["tutorials", "faq"] as const).map((t) => (
          <button key={t} onClick={() => { setTab(t); setShowForm(false); }}
            className={`rounded-xl px-6 py-3 text-sm font-semibold transition-all ${tab === t ? "bg-primary text-white shadow-lg shadow-primary/25" : "bg-white/5 text-white/40 border border-white/10 hover:text-primary"}`}>
            {t === "tutorials" ? `Videos (${tutorials.length})` : `FAQ (${faqs.length})`}
          </button>
        ))}
      </div>

      {/* Forms */}
      {showForm && tab === "tutorials" && (
        <form onSubmit={createTutorial} className="card-dark p-6 mb-6 space-y-4">
          <input name="title" required placeholder="Title" className={inputClass} />
          <input name="videoUrl" required placeholder="Video URL (YouTube, etc.)" className={inputClass} />
          <textarea name="description" placeholder="Description" rows={3} className={`${inputClass} resize-none`} />
          <label className="flex items-center gap-2 text-sm text-white/50 cursor-pointer">
            <input name="isManagedGuide" type="checkbox" className="rounded" />
            Managed Trading guide
          </label>
          <button type="submit" disabled={loading} className="btn-glow rounded-xl bg-primary px-6 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{loading ? "..." : "Add Tutorial"}</button>
        </form>
      )}
      {showForm && tab === "faq" && (
        <form onSubmit={createFaq} className="card-dark p-6 mb-6 space-y-4">
          <input name="question" required placeholder="Question" className={inputClass} />
          <textarea name="answer" required placeholder="Answer" rows={4} className={`${inputClass} resize-none`} />
          <button type="submit" disabled={loading} className="btn-glow rounded-xl bg-primary px-6 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{loading ? "..." : "Add FAQ"}</button>
        </form>
      )}

      {/* Lists */}
      {tab === "tutorials" && (
        <div className="space-y-3">
          {tutorials.map((t) => (
            <div key={t.id} className="card-dark p-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                  <svg className="h-5 w-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0zM15.91 11.672a.375.375 0 010 .656l-5.603 3.113a.375.375 0 01-.557-.328V8.887c0-.286.307-.466.557-.327l5.603 3.112z" /></svg>
                </div>
                <div>
                  <div className="text-sm font-medium text-white flex items-center gap-2">
                    {t.title}
                    {t.isManagedGuide && <span className="rounded-md bg-primary/15 px-1.5 py-0.5 text-[10px] font-bold text-primary">MANAGED</span>}
                  </div>
                  <div className="text-xs text-white/25 truncate max-w-xs">{t.videoUrl}</div>
                </div>
              </div>
              <button onClick={() => deleteItem("tutorials", t.id)} className="text-red-400/50 hover:text-red-400">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" /></svg>
              </button>
            </div>
          ))}
        </div>
      )}

      {tab === "faq" && (
        <div className="space-y-3">
          {faqs.map((f) => (
            <div key={f.id} className="card-dark p-5 flex items-start justify-between gap-4">
              <div>
                <div className="text-sm font-medium text-white mb-1">{f.question}</div>
                <div className="text-xs text-white/30">{f.answer}</div>
              </div>
              <button onClick={() => deleteItem("faq", f.id)} className="shrink-0 text-red-400/50 hover:text-red-400">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" /></svg>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
