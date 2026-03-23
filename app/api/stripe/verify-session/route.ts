import { NextResponse } from "next/server";
import { getSession } from "@/app/lib/auth";
import { prisma } from "@/app/lib/prisma";
import { stripe } from "@/app/lib/stripe";
import { notifyUser, notifyAdmins } from "@/app/lib/notifications";

/**
 * This endpoint verifies the Stripe checkout session after redirect.
 * It creates the subscription if the webhook hasn't fired yet (common in local dev).
 * In production, the webhook handles this, but this is a safety net.
 */
export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  try {
    const { sessionId } = await request.json();
    if (!sessionId) return NextResponse.json({ error: "Missing session ID" }, { status: 400 });

    // Check if subscription already exists (webhook already processed it)
    const existingSub = await prisma.subscription.findFirst({
      where: { stripeSubscriptionId: sessionId },
    });
    if (existingSub) {
      return NextResponse.json({ status: "already_processed", subscription: existingSub });
    }

    // Retrieve the checkout session from Stripe
    const checkoutSession = await stripe.checkout.sessions.retrieve(sessionId);
    if (checkoutSession.payment_status !== "paid") {
      return NextResponse.json({ error: "Payment not completed" }, { status: 400 });
    }

    const { userId, plan, months } = checkoutSession.metadata || {};
    if (!userId || userId !== session.userId || !plan || !months) {
      return NextResponse.json({ error: "Invalid session" }, { status: 400 });
    }

    const monthsNum = parseInt(months);
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { firstName: true, lastName: true, email: true, trialEndsAt: true },
    });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    // Period calculation: starts after trial if trial is still active
    const now = new Date();
    const periodStart = user.trialEndsAt && user.trialEndsAt > now ? new Date(user.trialEndsAt) : now;
    const periodEnd = new Date(periodStart);
    periodEnd.setMonth(periodEnd.getMonth() + monthsNum);

    const subscriptionType = plan === "managed" ? "MANAGED" as const : "SIGNALS" as const;
    const planLabel = `${plan === "managed" ? "Managed Trading" : "Signals"} — ${monthsNum} month${monthsNum > 1 ? "s" : ""}`;
    const amount = (checkoutSession.amount_total || 0) / 100;

    // Create subscription
    const subscription = await prisma.subscription.create({
      data: {
        userId,
        type: subscriptionType,
        status: "ACTIVE",
        stripeSubscriptionId: sessionId,
        stripePriceId: checkoutSession.metadata?.priceId || null,
        currentPeriodStart: periodStart,
        currentPeriodEnd: periodEnd,
      },
    });

    // Create invoice
    const crypto = require("crypto");
    const year = new Date().getFullYear();
    const count = await prisma.invoice.count({
      where: { createdAt: { gte: new Date(`${year}-01-01`) } },
    });
    const suffix = crypto.randomBytes(2).toString("hex");
    const invoiceNumber = `KDX-${year}-${String(count + 1).padStart(4, "0")}-${suffix}`;

    await prisma.invoice.create({
      data: {
        userId,
        subscriptionId: subscription.id,
        invoiceNumber,
        amount,
        plan: planLabel,
        status: "paid",
        stripePaymentId: checkoutSession.payment_intent as string || null,
      },
    });

    // Notifications
    await notifyUser(userId, "Subscription activated", `Your ${planLabel} subscription is now active. Valid until ${periodEnd.toLocaleDateString("en-US")}.`, "system");
    await notifyAdmins("New subscription", `${user.firstName} ${user.lastName} (${user.email}) subscribed to ${planLabel} for ${amount.toFixed(2)}€.`, "system");

    return NextResponse.json({ status: "created", subscription });
  } catch (error) {
    console.error("Verify session error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
