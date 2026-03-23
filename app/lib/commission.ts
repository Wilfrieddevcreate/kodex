import { prisma } from "./prisma";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", { apiVersion: "2025-04-30.basil" as Stripe.LatestApiVersion });

// ─── CONSTANTS ──────────────────────────────────────────
const STRIPE_FEE_PERCENT = 0.029; // 2.9%
const STRIPE_FEE_FIXED = 0.30;    // 0.30€

// ─── CREATE COMMISSION ──────────────────────────────────
// Called when a referred user completes a subscription payment
export async function createCommission({
  subscriptionId,
  grossAmount,
  stripePaymentId,
  referredUserId,
  referredIp,
}: {
  subscriptionId: string;
  grossAmount: number;
  stripePaymentId?: string;
  referredUserId: string;
  referredIp?: string;
}) {
  // 1. Find the referral (who referred this user?)
  const referral = await prisma.referral.findUnique({
    where: { referredUserId },
    include: {
      referrer: {
        include: { affiliate: true },
      },
    },
  });

  if (!referral || !referral.referrer.affiliate) return null;
  if (referral.referrer.affiliate.status !== "APPROVED") return null;

  // 2. Get commission settings
  const settings = await prisma.appSettings.findFirst();
  if (!settings) return null;

  const commissionRate = settings.commissionRate;
  const securityDays = settings.commissionSecurityDays;
  const monthlyCap = settings.commissionMonthlyCap;

  // 3. Check monthly cap
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const monthlyTotal = await prisma.commission.aggregate({
    where: {
      affiliateId: referral.referrer.affiliate.id,
      status: { in: ["PENDING", "AVAILABLE", "PAID"] },
      createdAt: { gte: startOfMonth },
    },
    _sum: { commissionAmount: true },
  });

  const currentMonthly = monthlyTotal._sum.commissionAmount || 0;
  if (monthlyCap > 0 && currentMonthly >= monthlyCap) {
    console.log(`Commission cap reached for affiliate ${referral.referrer.affiliate.id}`);
    return null;
  }

  // 4. Calculate amounts
  const stripeFees = (grossAmount * STRIPE_FEE_PERCENT) + STRIPE_FEE_FIXED;
  const netAmount = grossAmount - stripeFees;
  let commissionAmount = Math.round(netAmount * commissionRate * 100) / 100;

  // Respect monthly cap (only if set)
  if (monthlyCap > 0 && currentMonthly + commissionAmount > monthlyCap) {
    commissionAmount = Math.round((monthlyCap - currentMonthly) * 100) / 100;
  }

  // 5. Anti-fraud checks
  const { flagged, flagReason } = await detectFraud({
    referrerId: referral.referrerId,
    referredUserId,
    referrerIp: referral.referrerIp,
    referredIp: referredIp || referral.referredIp,
  });

  // 6. Calculate maturity date
  const maturesAt = new Date();
  maturesAt.setDate(maturesAt.getDate() + securityDays);

  // 7. Create the commission
  const commission = await prisma.commission.create({
    data: {
      affiliateId: referral.referrer.affiliate.id,
      referralId: referral.id,
      subscriptionId,
      grossAmount,
      stripeFeesAmount: Math.round(stripeFees * 100) / 100,
      netAmount: Math.round(netAmount * 100) / 100,
      commissionRate,
      commissionAmount,
      status: flagged ? "REVIEW" : "PENDING",
      flagged,
      flagReason,
      maturesAt,
      stripePaymentId,
    },
  });

  // 8. Notify the affiliate
  await prisma.notification.create({
    data: {
      userId: referral.referrerId,
      title: "New commission",
      message: `You earned a ${commissionAmount.toFixed(2)}€ commission from a referral subscription.`,
      type: "system",
    },
  });

  return commission;
}

// ─── ANTI-FRAUD DETECTION ───────────────────────────────
async function detectFraud({
  referrerId,
  referredUserId,
  referrerIp,
  referredIp,
}: {
  referrerId: string;
  referredUserId: string;
  referrerIp?: string | null;
  referredIp?: string | null;
}): Promise<{ flagged: boolean; flagReason: string | null }> {
  const flags: string[] = [];

  // 1. Same IP check — disabled (allowed per business rules)
  // if (referrerIp && referredIp && referrerIp === referredIp) {
  //   flags.push("same_ip");
  // }

  // 2. Similar email check
  const [referrer, referred] = await Promise.all([
    prisma.user.findUnique({ where: { id: referrerId }, select: { email: true, country: true, createdAt: true } }),
    prisma.user.findUnique({ where: { id: referredUserId }, select: { email: true, country: true, createdAt: true } }),
  ]);

  if (referrer && referred) {
    // Check email domain similarity + base name similarity
    const referrerBase = referrer.email.split("@")[0].replace(/[0-9]/g, "").toLowerCase();
    const referredBase = referred.email.split("@")[0].replace(/[0-9]/g, "").toLowerCase();
    const referrerDomain = referrer.email.split("@")[1];
    const referredDomain = referred.email.split("@")[1];

    if (referrerBase === referredBase && referrerDomain === referredDomain) {
      flags.push("similar_email");
    }

    // 3. Same country + registration within 5 minutes
    if (referrer.country === referred.country) {
      const timeDiff = Math.abs(referred.createdAt.getTime() - referrer.createdAt.getTime());
      if (timeDiff < 5 * 60 * 1000) { // 5 minutes
        flags.push("same_country_short_delay");
      }
    }
  }

  // 4. Check if referrer has too many flagged commissions
  const referrerAffiliate = await prisma.affiliate.findUnique({
    where: { userId: referrerId },
  });

  if (referrerAffiliate) {
    const flaggedCount = await prisma.commission.count({
      where: { affiliateId: referrerAffiliate.id, flagged: true },
    });
    if (flaggedCount >= 3) {
      flags.push("multiple_flags_history");
    }
  }

  return {
    flagged: flags.length > 0,
    flagReason: flags.length > 0 ? flags.join(", ") : null,
  };
}

// ─── CANCEL COMMISSION ──────────────────────────────────
// Called when a subscription is cancelled, refunded, or disputed
export async function cancelCommissions({
  subscriptionId,
  reason,
}: {
  subscriptionId: string;
  reason: "refund" | "dispute" | "admin" | "subscription_cancelled";
}) {
  const commissions = await prisma.commission.findMany({
    where: {
      subscriptionId,
      status: { in: ["PENDING", "REVIEW", "AVAILABLE"] },
    },
  });

  for (const commission of commissions) {
    await prisma.commission.update({
      where: { id: commission.id },
      data: {
        status: "CANCELLED",
        cancelledAt: new Date(),
        cancelReason: reason,
      },
    });

    // Notify the affiliate
    await prisma.notification.create({
      data: {
        userId: (await prisma.affiliate.findUnique({ where: { id: commission.affiliateId } }))?.userId,
        title: "Commission cancelled",
        message: `A commission of ${commission.commissionAmount.toFixed(2)}€ has been cancelled (${reason}).`,
        type: "system",
      },
    });
  }

  return commissions.length;
}

// ─── MATURE COMMISSIONS ────────────────────────────────
// Called periodically (cron or on page load) to mature pending commissions
export async function matureCommissions() {
  const now = new Date();

  // Find all PENDING commissions past their maturity date
  const pendingCommissions = await prisma.commission.findMany({
    where: {
      status: "PENDING",
      maturesAt: { lte: now },
      flagged: false,
    },
    include: {
      subscription: true,
    },
  });

  let matured = 0;

  for (const commission of pendingCommissions) {
    // Double-check: verify Stripe payment is still valid
    if (commission.stripePaymentId) {
      try {
        const paymentIntent = await stripe.paymentIntents.retrieve(commission.stripePaymentId);
        if (paymentIntent.status !== "succeeded") {
          // Payment not valid anymore — cancel
          await prisma.commission.update({
            where: { id: commission.id },
            data: { status: "CANCELLED", cancelledAt: now, cancelReason: "payment_invalid" },
          });
          continue;
        }

        // Check for disputes
        if (paymentIntent.latest_charge) {
          const charge = await stripe.charges.retrieve(paymentIntent.latest_charge as string);
          if (charge.disputed) {
            await prisma.commission.update({
              where: { id: commission.id },
              data: { status: "CANCELLED", cancelledAt: now, cancelReason: "dispute" },
            });
            continue;
          }
        }
      } catch {
        // If Stripe check fails, keep as PENDING (will retry next time)
        console.error(`Failed to verify payment for commission ${commission.id}`);
        continue;
      }
    }

    // Check subscription is still active
    if (commission.subscription.status !== "ACTIVE") {
      await prisma.commission.update({
        where: { id: commission.id },
        data: { status: "CANCELLED", cancelledAt: now, cancelReason: "subscription_cancelled" },
      });
      continue;
    }

    // All checks passed — mature the commission
    await prisma.commission.update({
      where: { id: commission.id },
      data: { status: "AVAILABLE" },
    });
    matured++;
  }

  return { matured, checked: pendingCommissions.length };
}

// ─── GET AFFILIATE STATS ────────────────────────────────
export async function getAffiliateStats(userId: string) {
  const affiliate = await prisma.affiliate.findUnique({
    where: { userId },
    include: {
      commissions: {
        orderBy: { createdAt: "desc" },
        include: {
          referral: {
            include: {
              referredUser: {
                select: { firstName: true, lastName: true },
              },
            },
          },
          subscription: {
            select: { type: true, status: true },
          },
        },
      },
    },
  });

  if (!affiliate) return null;

  const totalEarned = affiliate.commissions
    .filter((c) => c.status === "AVAILABLE" || c.status === "PAID")
    .reduce((sum, c) => sum + c.commissionAmount, 0);

  const pendingAmount = affiliate.commissions
    .filter((c) => c.status === "PENDING")
    .reduce((sum, c) => sum + c.commissionAmount, 0);

  const reviewAmount = affiliate.commissions
    .filter((c) => c.status === "REVIEW")
    .reduce((sum, c) => sum + c.commissionAmount, 0);

  const availableCommissions = affiliate.commissions
    .filter((c) => c.status === "AVAILABLE")
    .reduce((sum, c) => sum + c.commissionAmount, 0);

  // Subtract pending/approved withdrawal requests from available
  const pendingWithdrawals = await prisma.withdrawalRequest.aggregate({
    where: { affiliateId: affiliate.id, status: { in: ["PENDING", "APPROVED"] } },
    _sum: { amount: true },
  });
  const pendingWithdrawalAmount = pendingWithdrawals._sum.amount || 0;

  // Total withdrawn (completed)
  const completedWithdrawals = await prisma.withdrawalRequest.aggregate({
    where: { affiliateId: affiliate.id, status: "COMPLETED" },
    _sum: { amount: true },
  });
  const withdrawnAmount = completedWithdrawals._sum.amount || 0;

  const availableAmount = Math.max(0, availableCommissions - pendingWithdrawalAmount);

  return {
    totalEarned: Math.round(totalEarned * 100) / 100,
    pendingAmount: Math.round(pendingAmount * 100) / 100,
    reviewAmount: Math.round(reviewAmount * 100) / 100,
    availableAmount: Math.round(availableAmount * 100) / 100,
    withdrawnAmount: Math.round(withdrawnAmount * 100) / 100,
    pendingWithdrawalAmount: Math.round(pendingWithdrawalAmount * 100) / 100,
    commissions: affiliate.commissions.map((c) => ({
      id: c.id,
      referredName: `${c.referral.referredUser.firstName} ${c.referral.referredUser.lastName.charAt(0)}.`,
      subscriptionType: c.subscription.type,
      grossAmount: c.grossAmount,
      commissionAmount: c.commissionAmount,
      commissionRate: c.commissionRate,
      status: c.status,
      flagged: c.flagged,
      flagReason: c.flagReason,
      maturesAt: c.maturesAt.toISOString(),
      cancelReason: c.cancelReason,
      createdAt: c.createdAt.toISOString(),
    })),
  };
}
