import { NextResponse } from "next/server";
import { getSession } from "@/app/lib/auth";
import { prisma } from "@/app/lib/prisma";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const affiliate = await prisma.affiliate.findUnique({ where: { userId: session.userId } });
  if (!affiliate || affiliate.status !== "APPROVED") {
    return NextResponse.json({ requests: [] });
  }

  const requests = await prisma.withdrawalRequest.findMany({
    where: { affiliateId: affiliate.id },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({
    requests: requests.map((r) => ({
      id: r.id,
      amount: r.amount,
      paymentMethod: r.paymentMethod,
      paymentDetails: r.paymentDetails,
      status: r.status,
      adminNote: r.adminNote,
      processedAt: r.processedAt?.toISOString() || null,
      createdAt: r.createdAt.toISOString(),
    })),
  });
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const affiliate = await prisma.affiliate.findUnique({ where: { userId: session.userId } });
  if (!affiliate || affiliate.status !== "APPROVED") {
    return NextResponse.json({ error: "Not an approved affiliate" }, { status: 403 });
  }

  try {
    const { amount, paymentMethod, paymentDetails } = await request.json();

    if (!amount || amount <= 0) return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
    if (!paymentMethod || !paymentDetails) return NextResponse.json({ error: "Payment info required" }, { status: 400 });

    // Check available balance
    const available = await prisma.commission.aggregate({
      where: { affiliateId: affiliate.id, status: "AVAILABLE" },
      _sum: { commissionAmount: true },
    });
    const availableAmount = available._sum.commissionAmount || 0;

    // Subtract pending withdrawal requests
    const pendingWithdrawals = await prisma.withdrawalRequest.aggregate({
      where: { affiliateId: affiliate.id, status: { in: ["PENDING", "APPROVED"] } },
      _sum: { amount: true },
    });
    const pendingAmount = pendingWithdrawals._sum.amount || 0;

    const realAvailable = Math.round((availableAmount - pendingAmount) * 100) / 100;

    if (amount > realAvailable) {
      return NextResponse.json({ error: `Insufficient balance. Available: ${realAvailable.toFixed(2)}€` }, { status: 400 });
    }

    const withdrawal = await prisma.withdrawalRequest.create({
      data: {
        affiliateId: affiliate.id,
        amount,
        paymentMethod,
        paymentDetails,
      },
    });

    // Notify admins
    const admins = await prisma.user.findMany({ where: { role: "ADMIN" }, select: { id: true } });
    for (const admin of admins) {
      await prisma.notification.create({
        data: {
          userId: admin.id,
          title: "New withdrawal request",
          message: `Affiliate withdrawal request: ${amount.toFixed(2)}€ via ${paymentMethod}`,
          type: "system",
        },
      });
    }

    return NextResponse.json({ withdrawal });
  } catch (err) {
    console.error("Withdrawal request error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
