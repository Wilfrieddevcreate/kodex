import { NextResponse } from "next/server";
import { getSession } from "@/app/lib/auth";
import { prisma } from "@/app/lib/prisma";

export async function GET(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const url = new URL(request.url);
  const skip = parseInt(url.searchParams.get("skip") || "0");
  const take = parseInt(url.searchParams.get("take") || "10");

  const where = { userId: session.userId };

  const [invoices, total] = await Promise.all([
    prisma.invoice.findMany({ where, orderBy: { createdAt: "desc" }, skip, take }),
    prisma.invoice.count({ where }),
  ]);

  return NextResponse.json({
    items: invoices.map((inv) => ({
      id: inv.invoiceNumber,
      date: inv.createdAt.toISOString().split("T")[0],
      amount: `${inv.amount.toFixed(2)}€`,
      plan: inv.plan,
      status: inv.status,
      downloadId: inv.id,
      stripeReceiptUrl: inv.stripeReceiptUrl || null,
    })),
    total,
  });
}
