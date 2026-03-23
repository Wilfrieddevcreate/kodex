import { NextResponse } from "next/server";
import { getSession } from "@/app/lib/auth";
import { prisma } from "@/app/lib/prisma";
import { getAffiliateStats, matureCommissions } from "@/app/lib/commission";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const affiliate = await prisma.affiliate.findUnique({ where: { userId: session.userId } });

  if (!affiliate || affiliate.status !== "APPROVED") {
    return NextResponse.json({
      affiliate: affiliate ? { id: affiliate.id, status: affiliate.status, promoCode: affiliate.promoCode, referralLink: affiliate.referralLink } : null,
      referrals: [],
      referralCount: 0,
      stats: null,
    });
  }

  // Auto-mature pending commissions on page load
  try {
    await matureCommissions();
  } catch (e) {
    console.error("Mature commissions error:", e);
  }

  // Get referrals
  const referrals = await prisma.referral.findMany({
    where: { referrerId: session.userId },
    include: {
      referredUser: {
        select: {
          firstName: true, lastName: true, createdAt: true,
          subscriptions: { where: { status: "ACTIVE" }, select: { id: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  // Get commission stats
  const stats = await getAffiliateStats(session.userId);

  // Get commission settings for display
  const settings = await prisma.appSettings.findFirst();

  return NextResponse.json({
    affiliate: {
      id: affiliate.id, status: affiliate.status,
      promoCode: affiliate.promoCode, referralLink: affiliate.referralLink,
    },
    referrals: referrals.map((r) => ({
      id: r.id,
      name: `${r.referredUser.firstName} ${r.referredUser.lastName.charAt(0)}.`,
      date: r.createdAt.toISOString(),
      hasSubscription: r.referredUser.subscriptions.length > 0,
    })),
    referralCount: referrals.length,
    stats,
    commissionRate: settings?.commissionRate || 0.10,
    securityDays: settings?.commissionSecurityDays || 30,
  });
}

// Request to become an affiliate
export async function POST() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const existing = await prisma.affiliate.findUnique({ where: { userId: session.userId } });
  if (existing) return NextResponse.json({ error: "Already requested" }, { status: 400 });

  const affiliate = await prisma.affiliate.create({
    data: { userId: session.userId },
  });

  return NextResponse.json({ affiliate });
}
