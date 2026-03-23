import { NextResponse } from "next/server";
import { requireAdmin } from "@/app/lib/admin-auth";
import { prisma } from "@/app/lib/prisma";
import crypto from "crypto";

export async function GET(request: Request) {
  const { error } = await requireAdmin();
  if (error) return error;

  const url = new URL(request.url);
  const skip = parseInt(url.searchParams.get("skip") || "0");
  const take = parseInt(url.searchParams.get("take") || "10");

  const [items, total] = await Promise.all([
    prisma.affiliate.findMany({
      skip, take, orderBy: { createdAt: "desc" },
      include: {
        user: {
          select: {
            firstName: true, lastName: true, email: true,
            referrals: { select: { id: true } },
          },
        },
      },
    }),
    prisma.affiliate.count(),
  ]);

  return NextResponse.json({
    items: items.map((a) => ({
      id: a.id, status: a.status, promoCode: a.promoCode, referralLink: a.referralLink,
      userName: `${a.user.firstName} ${a.user.lastName}`, userEmail: a.user.email,
      referralCount: a.user.referrals?.length || 0, createdAt: a.createdAt.toISOString(),
    })),
    total,
  });
}

export async function PATCH(request: Request) {
  const { error } = await requireAdmin();
  if (error) return error;

  try {
    const { id, status } = await request.json();

    if (!["APPROVED", "REJECTED"].includes(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    const data: Record<string, unknown> = { status, approvedAt: status === "APPROVED" ? new Date() : null };

    if (status === "APPROVED") {
      // Get the user's last name to build the promo code
      const affiliate = await prisma.affiliate.findUnique({ where: { id }, include: { user: { select: { lastName: true } } } });
      if (!affiliate) return NextResponse.json({ error: "Affiliate not found" }, { status: 404 });

      const baseName = affiliate.user.lastName.toUpperCase().replace(/[^A-Z]/g, "");
      let code = `KODEX-${baseName}`;

      // Check if code already exists, if so add a number
      let counter = 1;
      while (await prisma.affiliate.findFirst({ where: { promoCode: code } })) {
        counter++;
        code = `KODEX-${baseName}${counter}`;
      }

      data.promoCode = code;
      data.referralLink = `${process.env.NEXT_PUBLIC_APP_URL}/en/register?ref=${code}`;
    }

    await prisma.affiliate.update({ where: { id }, data });
    return NextResponse.json({ message: "Updated" });
  } catch (err) {
    console.error("Update affiliation error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
