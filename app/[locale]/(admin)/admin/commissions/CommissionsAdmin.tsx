"use client";

import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import Swal from "sweetalert2";

interface CommissionItem {
  id: string;
  affiliateName: string;
  affiliateEmail: string;
  referredName: string;
  referredEmail: string;
  subscriptionType: string;
  subscriptionStatus: string;
  grossAmount: number;
  stripeFeesAmount: number;
  netAmount: number;
  commissionRate: number;
  commissionAmount: number;
  status: string;
  flagged: boolean;
  flagReason: string | null;
  reviewedByAdmin: boolean;
  maturesAt: string;
  cancelReason: string | null;
  createdAt: string;
}

interface Stats {
  [key: string]: { count: number; total: number };
}

export default function CommissionsAdmin() {
  const [items, setItems] = useState<CommissionItem[]>([]);
  const [stats, setStats] = useState<Stats>({});
  const [filter, setFilter] = useState("");
  const [loading, setLoading] = useState(true);

  async function load() {
    const params = new URLSearchParams();
    if (filter) params.set("status", filter);
    params.set("take", "50");
    const res = await fetch(`/api/admin/commissions?${params}`);
    const data = await res.json();
    setItems(data.items || []);
    setStats(data.stats || {});
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, [filter]);

  async function handleAction(id: string, action: string, label: string) {
    const result = await Swal.fire({
      title: `${label}?`,
      text: `Are you sure you want to ${label.toLowerCase()} this commission?`,
      icon:
        action === "approve" || action === "force_available"
          ? "question"
          : "warning",
      showCancelButton: true,
      confirmButtonColor:
        action === "reject" || action === "cancel" ? "#ef4444" : "#14708E",
      confirmButtonText: `Yes, ${label.toLowerCase()}`,
      background: "#111",
      color: "#fff",
    });
    if (!result.isConfirmed) return;

    const res = await fetch("/api/admin/commissions", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, action }),
    });
    if (res.ok) {
      toast.success(`Commission ${label.toLowerCase()}d`);
      load();
    } else {
      const data = await res.json();
      toast.error(data.error || "Failed");
    }
  }

  function statusBadge(status: string) {
    const map: Record<string, string> = {
      PENDING: "bg-amber-500/10 text-amber-400",
      REVIEW: "bg-orange-500/10 text-orange-400",
      AVAILABLE: "bg-emerald-500/10 text-emerald-400",
      PAID: "bg-primary/10 text-primary",
      CANCELLED: "bg-red-500/10 text-red-400",
    };
    return (
      <span
        className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase ${map[status] || "bg-white/5 text-white/30"}`}
      >
        {status}
      </span>
    );
  }

  const statCards = [
    { label: "Pending", key: "PENDING", color: "text-amber-400" },
    { label: "Review", key: "REVIEW", color: "text-orange-400" },
    { label: "Available", key: "AVAILABLE", color: "text-emerald-400" },
    { label: "Cancelled", key: "CANCELLED", color: "text-red-400" },
  ];

  if (loading)
    return <div className="pt-8 lg:pt-0 text-white/30 text-sm">Loading...</div>;

  return (
    <div className="pt-8 lg:pt-0">
      <h1 className="text-2xl font-bold text-white mb-6">Commissions</h1>

      {/* Stats */}
      <div className="grid gap-4 grid-cols-2 sm:grid-cols-4 mb-6">
        {statCards.map((s) => (
          <div
            key={s.key}
            className="card-dark p-4 cursor-pointer hover:border-white/20 transition-all"
            onClick={() => setFilter(filter === s.key ? "" : s.key)}
          >
            <div className="text-xs font-medium text-white/30 uppercase tracking-wider mb-1">
              {s.label}
            </div>
            <div className={`text-xl font-bold ${s.color}`}>
              {(stats[s.key]?.total || 0).toFixed(2)}€
              <span className="text-xs text-white/20 font-normal ml-1">
                ({stats[s.key]?.count || 0})
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Filter pills */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {["", "PENDING", "REVIEW", "AVAILABLE", "CANCELLED", "PAID"].map(
          (f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${filter === f ? "bg-primary text-white" : "bg-white/5 text-white/40 hover:text-white/60"}`}
            >
              {f || "All"}
            </button>
          ),
        )}
      </div>

      {/* Table */}
      {items.length > 0 ? (
        <div className="card-dark overflow-hidden overflow-x-auto">
          <table className="w-full text-sm min-w-[700px]">
            <thead>
              <tr className="border-b border-white/5 text-[10px] text-white/25 uppercase tracking-wider">
                <th className="px-4 py-3 text-left font-medium">Affiliate</th>
                <th className="px-4 py-3 text-left font-medium">Referred</th>
                <th className="px-4 py-3 text-right font-medium">Payment</th>
                <th className="px-4 py-3 text-right font-medium">Commission</th>
                <th className="px-4 py-3 text-center font-medium">Status</th>
                <th className="px-4 py-3 text-center font-medium">Flags</th>
                <th className="px-4 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {items.map((c) => (
                <tr
                  key={c.id}
                  className={c.flagged ? "bg-orange-500/[0.03]" : ""}
                >
                  <td className="px-4 py-3">
                    <div className="text-sm text-white">{c.affiliateName}</div>
                    <div className="text-xs text-white/20">
                      {c.affiliateEmail}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-sm text-white">{c.referredName}</div>
                    <div className="text-xs text-white/20">
                      {c.referredEmail}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="text-sm text-white">
                      {c.grossAmount.toFixed(2)}€
                    </div>
                    <div className="text-xs text-white/20">
                      net: {c.netAmount.toFixed(2)}€
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="text-sm font-semibold text-primary">
                      {c.commissionAmount.toFixed(2)}€
                    </div>
                    <div className="text-xs text-white/20">
                      {(c.commissionRate * 100).toFixed(0)}%
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    {statusBadge(c.status)}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {c.flagged ? (
                      <span
                        title={c.flagReason || ""}
                        className="inline-flex items-center gap-1 rounded-full bg-orange-500/10 px-2 py-0.5 text-[10px] font-medium text-orange-400 cursor-help"
                      >
                        <svg
                          className="h-3 w-3"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={2}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126z"
                          />
                        </svg>
                        {c.flagReason}
                      </span>
                    ) : (
                      <span className="text-xs text-white/10">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex gap-1.5 justify-end">
                      {c.status === "REVIEW" && (
                        <>
                          <button
                            onClick={() =>
                              handleAction(c.id, "approve", "Approve")
                            }
                            className="rounded-lg bg-emerald-500/10 px-2.5 py-1 text-[10px] font-semibold text-emerald-400 hover:bg-emerald-500/20 transition-colors"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() =>
                              handleAction(c.id, "reject", "Reject")
                            }
                            className="rounded-lg bg-red-500/10 px-2.5 py-1 text-[10px] font-semibold text-red-400 hover:bg-red-500/20 transition-colors"
                          >
                            Reject
                          </button>
                        </>
                      )}
                      {c.status === "PENDING" && (
                        <>
                          <button
                            onClick={() =>
                              handleAction(
                                c.id,
                                "force_available",
                                "Force Available",
                              )
                            }
                            className="rounded-lg bg-primary/10 px-2.5 py-1 text-[10px] font-semibold text-primary hover:bg-primary/20 transition-colors"
                          >
                            Force
                          </button>
                          <button
                            onClick={() =>
                              handleAction(c.id, "cancel", "Cancel")
                            }
                            className="rounded-lg bg-red-500/10 px-2.5 py-1 text-[10px] font-semibold text-red-400 hover:bg-red-500/20 transition-colors"
                          >
                            Cancel
                          </button>
                        </>
                      )}
                      {c.status === "AVAILABLE" && (
                        <button
                          onClick={() => handleAction(c.id, "cancel", "Cancel")}
                          className="rounded-lg bg-red-500/10 px-2.5 py-1 text-[10px] font-semibold text-red-400 hover:bg-red-500/20 transition-colors"
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="card-dark p-12 text-center">
          <p className="text-sm text-white/30">
            No commissions {filter ? `with status "${filter}"` : "yet"}.
          </p>
        </div>
      )}
    </div>
  );
}
