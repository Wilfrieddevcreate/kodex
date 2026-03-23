import { prisma } from "@/app/lib/prisma";
import SubsClient from "./SubsClient";

export default async function AdminSubscriptionsPage() {
  const subscriptions = await prisma.subscription.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      user: { select: { firstName: true, lastName: true, email: true } },
      invoices: { select: { invoiceNumber: true, amount: true } },
    },
  });

  const stats = {
    total: subscriptions.length,
    active: subscriptions.filter((s) => s.status === "ACTIVE").length,
    signals: subscriptions.filter((s) => s.type === "SIGNALS" && s.status === "ACTIVE").length,
    managed: subscriptions.filter((s) => s.type === "MANAGED" && s.status === "ACTIVE").length,
    revenue: subscriptions
      .filter((s) => s.status === "ACTIVE")
      .reduce((sum, s) => sum + (s.invoices[0]?.amount || 0), 0),
  };

  return (
    <SubsClient
      stats={stats}
      subscriptions={subscriptions.map((s) => ({
        id: s.id,
        userName: `${s.user.firstName} ${s.user.lastName}`,
        userEmail: s.user.email,
        type: s.type,
        status: s.status,
        periodStart: s.currentPeriodStart.toISOString(),
        periodEnd: s.currentPeriodEnd.toISOString(),
        amount: s.invoices[0]?.amount || 0,
        invoiceNumber: s.invoices[0]?.invoiceNumber || null,
        createdAt: s.createdAt.toISOString(),
      }))}
    />
  );
}
