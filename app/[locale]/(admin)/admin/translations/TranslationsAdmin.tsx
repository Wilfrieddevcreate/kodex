"use client";

import { useState, useEffect, useRef } from "react";
import toast from "react-hot-toast";

interface Row {
  key: string;
  section: string;
  en: string;
  fr: string;
  es: string;
  tr: string;
}

const LANGS = [
  { code: "fr", label: "FR", flag: "fr" },
  { code: "en", label: "EN", flag: "gb" },
  { code: "es", label: "ES", flag: "es" },
  { code: "tr", label: "TR", flag: "tr" },
];

export default function TranslationsAdmin() {
  const [rows, setRows] = useState<Row[]>([]);
  const [sections, setSections] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sectionFilter, setSectionFilter] = useState("");
  const [editingCell, setEditingCell] = useState<{ key: string; locale: string } | null>(null);
  const [editValue, setEditValue] = useState("");
  const [saving, setSaving] = useState(false);
  const [missingOnly, setMissingOnly] = useState(false);
  const [visibleCount, setVisibleCount] = useState(20);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    fetch("/api/admin/translations").then((r) => r.json()).then((d) => {
      setRows(d.rows || []);
      setSections(d.sections || []);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    if (editingCell && inputRef.current) inputRef.current.focus();
  }, [editingCell]);

  function startEdit(key: string, locale: string, currentValue: string) {
    setEditingCell({ key, locale });
    setEditValue(currentValue);
  }

  async function saveEdit() {
    if (!editingCell) return;
    setSaving(true);

    const res = await fetch("/api/admin/translations", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key: editingCell.key, locale: editingCell.locale, value: editValue }),
    });

    if (res.ok) {
      // Update local state
      setRows((prev) =>
        prev.map((r) =>
          r.key === editingCell.key
            ? { ...r, [editingCell.locale]: editValue }
            : r
        )
      );
      toast.success("Saved");
    } else {
      toast.error("Failed to save");
    }

    setEditingCell(null);
    setSaving(false);
  }

  function cancelEdit() {
    setEditingCell(null);
    setEditValue("");
  }

  // Filter rows
  const filtered = rows.filter((r) => {
    if (sectionFilter && r.section !== sectionFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!r.key.toLowerCase().includes(q) && !r.en.toLowerCase().includes(q) && !r.fr.toLowerCase().includes(q) && !r.es.toLowerCase().includes(q) && !r.tr.toLowerCase().includes(q)) return false;
    }
    if (missingOnly) {
      if (r.en && r.fr && r.es && r.tr) return false;
    }
    return true;
  });

  const missingCount = rows.filter((r) => !r.en || !r.fr || !r.es || !r.tr).length;
  const visibleRows = filtered.slice(0, visibleCount);
  const hasMore = visibleCount < filtered.length;

  // Reset visible count when filters change
  useEffect(() => { setVisibleCount(20); }, [search, sectionFilter, missingOnly]);

  // Infinite scroll observer
  useEffect(() => {
    if (observerRef.current) observerRef.current.disconnect();
    observerRef.current = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && hasMore) {
        setVisibleCount((prev) => prev + 20);
      }
    }, { threshold: 0.1 });
    if (sentinelRef.current) observerRef.current.observe(sentinelRef.current);
    return () => observerRef.current?.disconnect();
  }, [hasMore]);

  if (loading) return <div className="pt-8 lg:pt-0 text-white/30 text-sm">Loading translations...</div>;

  return (
    <div className="pt-8 lg:pt-0">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Translations</h1>
          <p className="text-sm text-white/30 mt-1">{rows.length} keys · {missingCount > 0 && <span className="text-amber-400">{missingCount} missing</span>}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        {/* Search */}
        <div className="flex-1">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by key or text..."
            className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-2.5 text-sm text-white outline-none focus:border-primary placeholder:text-white/20"
          />
        </div>

        {/* Section filter */}
        <div className="flex gap-2 flex-wrap">
          <button onClick={() => setSectionFilter("")} className={`rounded-lg px-3 py-2 text-xs font-medium transition-all ${!sectionFilter ? "bg-primary text-white" : "bg-white/5 text-white/40 hover:text-white/60"}`}>
            All
          </button>
          {sections.map((s) => (
            <button key={s} onClick={() => setSectionFilter(sectionFilter === s ? "" : s)} className={`rounded-lg px-3 py-2 text-xs font-medium transition-all ${sectionFilter === s ? "bg-primary text-white" : "bg-white/5 text-white/40 hover:text-white/60"}`}>
              {s}
            </button>
          ))}
        </div>

        {/* Missing toggle */}
        <button onClick={() => setMissingOnly(!missingOnly)} className={`rounded-lg px-3 py-2 text-xs font-medium transition-all whitespace-nowrap ${missingOnly ? "bg-amber-500/20 text-amber-400" : "bg-white/5 text-white/40 hover:text-white/60"}`}>
          Missing only
        </button>
      </div>

      {/* Results count */}
      <p className="text-xs text-white/20 mb-3">{filtered.length} results</p>

      {/* Table */}
      <div className="card-dark overflow-hidden overflow-x-auto">
        <table className="w-full text-sm min-w-[800px]">
          <thead>
            <tr className="border-b border-white/5">
              <th className="px-4 py-3 text-left text-[10px] font-medium text-white/25 uppercase tracking-wider w-[25%]">Key</th>
              {LANGS.map((l) => (
                <th key={l.code} className="px-4 py-3 text-left text-[10px] font-medium text-white/25 uppercase tracking-wider">
                  <div className="flex items-center gap-1.5">
                    <img src={`https://flagcdn.com/w20/${l.flag}.png`} alt={l.label} className="w-4 h-3 rounded-sm object-cover" />
                    {l.label}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {visibleRows.map((row) => (
              <tr key={row.key} className="hover:bg-white/[0.02] transition-colors">
                {/* Key */}
                <td className="px-4 py-3">
                  <div className="text-xs font-mono text-primary/70 truncate max-w-[200px]" title={row.key}>{row.key}</div>
                  <div className="text-[10px] text-white/15 mt-0.5">{row.section}</div>
                </td>

                {/* Language columns */}
                {LANGS.map((l) => {
                  const value = row[l.code as keyof Row] as string;
                  const isEditing = editingCell?.key === row.key && editingCell?.locale === l.code;
                  const isEmpty = !value;

                  return (
                    <td key={l.code} className="px-4 py-3">
                      {isEditing ? (
                        <div className="space-y-2">
                          <textarea
                            ref={inputRef}
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            rows={3}
                            className="w-full rounded-lg bg-white/10 border border-primary px-3 py-2 text-sm text-white outline-none resize-none"
                            onKeyDown={(e) => {
                              if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); saveEdit(); }
                              if (e.key === "Escape") cancelEdit();
                            }}
                          />
                          <div className="flex gap-1.5">
                            <button onClick={saveEdit} disabled={saving} className="rounded bg-primary px-2.5 py-1 text-[10px] font-semibold text-white hover:bg-primary-hover disabled:opacity-50">
                              {saving ? "..." : "Save"}
                            </button>
                            <button onClick={cancelEdit} className="rounded bg-white/5 px-2.5 py-1 text-[10px] font-medium text-white/40 hover:text-white/60">
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div
                          onClick={() => startEdit(row.key, l.code, value)}
                          className={`cursor-pointer rounded-lg px-2.5 py-1.5 text-xs transition-all hover:bg-white/5 min-h-[28px] ${isEmpty ? "border border-dashed border-amber-500/30 text-amber-500/40 italic" : "text-white/60"}`}
                        >
                          {isEmpty ? "missing" : value.length > 80 ? value.slice(0, 80) + "..." : value}
                        </div>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {hasMore && (
        <div ref={sentinelRef} className="flex justify-center py-6">
          <div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      )}
      {!hasMore && visibleRows.length > 0 && <p className="text-center text-xs text-white/20 py-4">All translations loaded</p>}

      {filtered.length === 0 && (
        <div className="card-dark p-12 text-center mt-4">
          <p className="text-sm text-white/30">No translations match your filters.</p>
        </div>
      )}
    </div>
  );
}
