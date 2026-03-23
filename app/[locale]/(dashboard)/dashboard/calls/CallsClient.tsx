"use client";

import { useState, useCallback, useEffect, useRef } from "react";

const PAGE_SIZE = 20;

interface CallData {
  id: string; pair: string; entryMin: number; entryMax: number;
  stopLoss: number; active: boolean; date: string;
  targets: { rank: number; price: number; reached: boolean }[];
}

export default function CallsClient() {
  const [calls, setCalls] = useState<CallData[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const pageRef = useRef(0);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const initialLoaded = useRef(false);

  const fetchCalls = useCallback(async (page: number, append: boolean) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/user/calls?skip=${page * PAGE_SIZE}&take=${PAGE_SIZE}`);
      const data = await res.json();
      const items = (data.items || []).map((c: { id: string; tradingPair: { base: string; quote: string }; entryMin: number; entryMax: number; stopLoss: number; active: boolean; createdAt: string; targets: { rank: number; price: number; reached: boolean }[] }) => ({
        id: c.id, pair: `${c.tradingPair.base}/${c.tradingPair.quote}`,
        entryMin: c.entryMin, entryMax: c.entryMax, stopLoss: c.stopLoss,
        active: c.active, date: c.createdAt.split("T")[0],
        targets: c.targets.map((t: { rank: number; price: number; reached: boolean }) => ({ rank: t.rank, price: t.price, reached: t.reached })),
      }));
      if (append) setCalls((prev) => [...prev, ...items]);
      else setCalls(items);
      setHasMore(items.length === PAGE_SIZE);
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!initialLoaded.current) { initialLoaded.current = true; fetchCalls(0, false); }
  }, [fetchCalls]);

  useEffect(() => {
    if (observerRef.current) observerRef.current.disconnect();
    observerRef.current = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && hasMore && !loading) {
        pageRef.current += 1;
        fetchCalls(pageRef.current, true);
      }
    }, { threshold: 0.1 });
    if (sentinelRef.current) observerRef.current.observe(sentinelRef.current);
    return () => observerRef.current?.disconnect();
  }, [hasMore, loading, fetchCalls]);

  return (
    <div className="pt-8 lg:pt-0">
      <h1 className="text-2xl font-bold text-white mb-6">Calls</h1>

      {!loading && calls.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/5">
            <svg className="h-7 w-7 text-white/20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22" />
            </svg>
          </div>
          <p className="text-sm text-white/30">No calls available.</p>
        </div>
      ) : (
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-3">
          {calls.map((call) => (
            <div key={call.id} className="card-dark p-5 relative">
              {!call.active && (
                <div className="absolute top-3 right-3 rounded-full bg-white/10 px-2.5 py-0.5 text-[10px] font-semibold text-white/40 uppercase">Closed</div>
              )}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${call.active ? "bg-primary/10" : "bg-white/5"}`}>
                    <svg className={`h-4 w-4 ${call.active ? "text-primary" : "text-white/20"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22" />
                    </svg>
                  </div>
                  <span className="text-base font-bold text-white">{call.pair}</span>
                </div>
                <span className="text-xs text-white/25">{call.date}</span>
              </div>
              <div className="mb-4 rounded-xl bg-white/5 p-3.5">
                <div className="text-xs font-medium text-white/30 uppercase tracking-wider mb-1">Entry</div>
                <div className="text-sm font-bold text-white">{call.entryMin} — {call.entryMax}</div>
              </div>
              <div className="space-y-2 mb-4">
                {call.targets.map((tp) => (
                  <div key={tp.rank} className={`flex items-center justify-between rounded-lg px-3 py-2 text-sm ${tp.reached ? "bg-emerald-500/10" : "bg-white/[0.02]"}`}>
                    <span className={`font-semibold ${tp.reached ? "text-emerald-400" : "text-white/40"}`}>TP{tp.rank}</span>
                    <div className="flex items-center gap-2">
                      <span className={`font-medium ${tp.reached ? "text-emerald-400" : "text-white/70"}`}>{tp.price}</span>
                      {tp.reached && (
                        <div className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500">
                          <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                          </svg>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-between rounded-xl bg-red-500/10 px-3.5 py-2.5 text-sm">
                <span className="font-semibold text-red-400">Stop Loss</span>
                <span className="font-bold text-red-400">{call.stopLoss}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {hasMore && (
        <div ref={sentinelRef} className="flex justify-center py-6">
          {loading && <div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />}
        </div>
      )}
      {!hasMore && calls.length > 0 && <p className="text-center text-xs text-white/20 py-4">All calls loaded</p>}
    </div>
  );
}
