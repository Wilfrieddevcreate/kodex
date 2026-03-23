import { NextResponse } from "next/server";
import { requireAdmin } from "@/app/lib/admin-auth";
import { prisma } from "@/app/lib/prisma";

export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;

  const requests = await prisma.withdrawalRequest.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      affiliate: {
        include: {
          user: { select: { firstName: true, lastName: true, email: true } },
        },
      },
    },
  });

  return NextResponse.json({
    items: requests.map((r) => ({
      id: r.id,
      amount: r.amount,
      paymentMethod: r.paymentMethod,
      paymentDetails: r.paymentDetails,
      status: r.status,
      adminNote: r.adminNote,
      processedAt: r.processedAt?.toISOString() || null,
      createdAt: r.createdAt.toISOString(),
      userName: `${r.affiliate.user.firstName} ${r.affiliate.user.lastName}`,
      userEmail: r.affiliate.user.email,
    })),
  });
}

export async function PATCH(request: Request) {
  const { error } = await requireAdmin();
  if (error) return error;

  try {
    const { id, status, adminNote } = await request.json();

    if (!["APPROVED", "COMPLETED", "REJECTED"].includes(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    const withdrawal = await prisma.withdrawalRequest.findUnique({
      where: { id },
      include: { affiliate: { select: { userId: true } } },
    });
    if (!withdrawal) return NextResponse.json({ error: "Not found" }, { status: 404 });

    await prisma.withdrawalRequest.update({
      where: { id },
      data: {
        status,
        adminNote: adminNote || null,
        processedAt: status === "COMPLETED" || status === "REJECTED" ? new Date() : null,
      },
    });

    // If completed, mark related commissions as PAID
    if (status === "COMPLETED") {
      await prisma.commission.updateMany({
        where: { affiliateId: withdrawal.affiliateId, status: "AVAILABLE" },
        data: { status: "PAID" },
      });
    }

    // Notify the affiliate
    const messages: Record<string, string> = {
      APPROVED: `Your withdrawal request of ${withdrawal.amount.toFixed(2)}€ has been approved. Payment will be processed shortly.`,
      COMPLETED: `Your withdrawal of ${withdrawal.amount.toFixed(2)}€ has been sent via ${withdrawal.paymentMethod}.`,
      REJECTED: `Your withdrawal request of ${withdrawal.amount.toFixed(2)}€ has been rejected.${adminNote ? ` Reason: ${adminNote}` : ""}`,
    };

    await prisma.notification.create({
      data: {
        userId: withdrawal.affiliate.userId,
        title: `Withdrawal ${status.toLowerCase()}`,
        message: messages[status],
        type: "system",
      },
    });

    return NextResponse.json({ message: "Updated" });
  } catch (err) {
    console.error("Update withdrawal error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
