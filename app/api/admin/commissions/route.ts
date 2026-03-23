import { NextResponse } from "next/server";
import { requireAdmin } from "@/app/lib/admin-auth";
import { prisma } from "@/app/lib/prisma";

export async function GET(request: Request) {
  const { error } = await requireAdmin();
  if (error) return error;

  const url = new URL(request.url);
  const skip = parseInt(url.searchParams.get("skip") || "0");
  const take = parseInt(url.searchParams.get("take") || "20");
  const status = url.searchParams.get("status") || "";

  const where = status ? { status } : {};

  const [items, total, stats] = await Promise.all([
    prisma.commission.findMany({
      where, skip, take,
      orderBy: { createdAt: "desc" },
      include: {
        affiliate: { include: { user: { select: { firstName: true, lastName: true, email: true } } } },
        referral: { include: { referredUser: { select: { firstName: true, lastName: true, email: true } } } },
        subscription: { select: { type: true, status: true } },
      },
    }),
    prisma.commission.count({ where }),
    prisma.commission.groupBy({
      by: ["status"],
      _sum: { commissionAmount: true },
      _count: true,
    }),
  ]);

  return NextResponse.json({
    items: items.map((c) => ({
      id: c.id,
      affiliateName: `${c.affiliate.user.firstName} ${c.affiliate.user.lastName}`,
      affiliateEmail: c.affiliate.user.email,
      referredName: `${c.referral.referredUser.firstName} ${c.referral.referredUser.lastName}`,
      referredEmail: c.referral.referredUser.email,
      subscriptionType: c.subscription.type,
      subscriptionStatus: c.subscription.status,
      grossAmount: c.grossAmount,
      stripeFeesAmount: c.stripeFeesAmount,
      netAmount: c.netAmount,
      commissionRate: c.commissionRate,
      commissionAmount: c.commissionAmount,
      status: c.status,
      flagged: c.flagged,
      flagReason: c.flagReason,
      reviewedByAdmin: c.reviewedByAdmin,
      maturesAt: c.maturesAt.toISOString(),
      cancelReason: c.cancelReason,
      createdAt: c.createdAt.toISOString(),
    })),
    total,
    stats: stats.reduce((acc, s) => {
      acc[s.status] = { count: s._count, total: s._sum.commissionAmount || 0 };
      return acc;
    }, {} as Record<string, { count: number; total: number }>),
  });
}

// Admin can approve (REVIEW → PENDING), cancel, or force-available
export async function PATCH(request: Request) {
  const { error } = await requireAdmin();
  if (error) return error;

  try {
    const { id, action } = await request.json();

    const commission = await prisma.commission.findUnique({ where: { id } });
    if (!commission) return NextResponse.json({ error: "Not found" }, { status: 404 });

    switch (action) {
      case "approve":
        // Move from REVIEW to PENDING (start security period)
        if (commission.status !== "REVIEW") return NextResponse.json({ error: "Can only approve commissions under review" }, { status: 400 });
        await prisma.commission.update({
          where: { id },
          data: { status: "PENDING", reviewedByAdmin: true, flagged: false },
        });
        break;

      case "reject":
        // Cancel a flagged commission
        if (!["REVIEW", "PENDING"].includes(commission.status)) return NextResponse.json({ error: "Cannot reject" }, { status: 400 });
        await prisma.commission.update({
          where: { id },
          data: { status: "CANCELLED", cancelledAt: new Date(), cancelReason: "admin", reviewedByAdmin: true },
        });
        break;

      case "force_available":
        // Skip security period
        if (commission.status !== "PENDING") return NextResponse.json({ error: "Can only force-available pending commissions" }, { status: 400 });
        await prisma.commission.update({
          where: { id },
          data: { status: "AVAILABLE", reviewedByAdmin: true },
        });
        break;

      case "cancel":
        // Cancel any non-paid commission
        if (commission.status === "PAID" || commission.status === "CANCELLED") return NextResponse.json({ error: "Cannot cancel" }, { status: 400 });
        await prisma.commission.update({
          where: { id },
          data: { status: "CANCELLED", cancelledAt: new Date(), cancelReason: "admin", reviewedByAdmin: true },
        });
        break;

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    return NextResponse.json({ message: "Updated" });
  } catch (err) {
    console.error("Commission PATCH error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
