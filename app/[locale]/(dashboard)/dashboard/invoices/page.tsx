"use client";

import { useState, useCallback, useEffect, useRef } from "react";

const PAGE_SIZE = 20;

interface Invoice { id: string; date: string; amount: string; plan: string; status: string; downloadId: string; stripeReceiptUrl: string | null; }

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const pageRef = useRef(0);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const initialLoaded = useRef(false);

  const fetchInvoices = useCallback(async (page: number, append: boolean) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/user/invoices?skip=${page * PAGE_SIZE}&take=${PAGE_SIZE}`);
      const data = await res.json();
      const items: Invoice[] = data.items || [];
      if (append) setInvoices((prev) => [...prev, ...items]);
      else setInvoices(items);
      setHasMore(items.length === PAGE_SIZE);
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!initialLoaded.current) { initialLoaded.current = true; fetchInvoices(0, false); }
  }, [fetchInvoices]);

  useEffect(() => {
    if (observerRef.current) observerRef.current.disconnect();
    observerRef.current = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && hasMore && !loading) {
        pageRef.current += 1;
        fetchInvoices(pageRef.current, true);
      }
    }, { threshold: 0.1 });
    if (sentinelRef.current) observerRef.current.observe(sentinelRef.current);
    return () => observerRef.current?.disconnect();
  }, [hasMore, loading, fetchInvoices]);

  if (!loading && invoices.length === 0 && !hasMore) {
    return (
      <div className="pt-8 lg:pt-0">
        <h1 className="text-2xl font-bold text-white mb-6">Invoices</h1>
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/5">
            <svg className="h-7 w-7 text-white/20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
            </svg>
          </div>
          <p className="text-sm text-white/30">No invoices yet. They will appear here once you subscribe.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="pt-8 lg:pt-0">
      <h1 className="text-2xl font-bold text-white mb-6">Invoices</h1>

      {/* Desktop table */}
      <div className="hidden sm:block card-dark overflow-hidden overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/5">
              <th className="px-5 py-4 text-left text-xs font-medium text-white/30 uppercase tracking-wider">Invoice</th>
              <th className="px-5 py-4 text-left text-xs font-medium text-white/30 uppercase tracking-wider">Date</th>
              <th className="px-5 py-4 text-left text-xs font-medium text-white/30 uppercase tracking-wider">Plan</th>
              <th className="px-5 py-4 text-right text-xs font-medium text-white/30 uppercase tracking-wider">Amount</th>
              <th className="px-5 py-4 text-right text-xs font-medium text-white/30 uppercase tracking-wider">Status</th>
              <th className="px-5 py-4" />
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {invoices.map((inv) => (
              <tr key={inv.id} className="hover:bg-white/[0.02] transition-colors">
                <td className="px-5 py-4 text-sm font-mono font-medium text-primary">{inv.id}</td>
                <td className="px-5 py-4 text-sm text-white/50">{inv.date}</td>
                <td className="px-5 py-4 text-sm text-white/70">{inv.plan}</td>
                <td className="px-5 py-4 text-sm font-semibold text-white text-right">{inv.amount}</td>
                <td className="px-5 py-4 text-right">
                  <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase ${
                    inv.status === "paid" ? "bg-emerald-500/10 text-emerald-400" : "bg-amber-500/10 text-amber-400"
                  }`}>{inv.status}</span>
                </td>
                <td className="px-5 py-4 text-right">
                  <div className="flex items-center gap-2 justify-end">
                    {inv.stripeReceiptUrl && (
                      <a href={inv.stripeReceiptUrl} target="_blank" rel="noopener noreferrer" className="rounded-lg bg-primary/10 px-2.5 py-1 text-[10px] font-semibold text-primary hover:bg-primary/20 transition-colors cursor-pointer" title="Stripe receipt">
                        Receipt
                      </a>
                    )}
                    <a href={`/api/user/invoices/${inv.downloadId}`} className="text-white/20 hover:text-primary transition-colors" title="Download PDF">
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                      </svg>
                    </a>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="sm:hidden space-y-3">
        {invoices.map((inv) => (
          <div key={inv.id} className="card-dark p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-mono font-medium text-primary">{inv.id}</span>
              <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase ${
                inv.status === "paid" ? "bg-emerald-500/10 text-emerald-400" : "bg-amber-500/10 text-amber-400"
              }`}>{inv.status}</span>
            </div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm text-white/70">{inv.plan}</span>
              <span className="text-sm font-semibold text-white">{inv.amount}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-white/30">{inv.date}</span>
              <div className="flex items-center gap-3">
                {inv.stripeReceiptUrl && (
                  <a href={inv.stripeReceiptUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline">Receipt</a>
                )}
                <a href={`/api/user/invoices/${inv.downloadId}`} className="text-xs text-primary hover:underline">PDF</a>
              </div>
            </div>
          </div>
        ))}
      </div>

      {hasMore && (
        <div ref={sentinelRef} className="flex justify-center py-6">
          {loading && <div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />}
        </div>
      )}
      {!hasMore && invoices.length > 0 && <p className="text-center text-xs text-white/20 py-4">All invoices loaded</p>}
    </div>
  );
}
