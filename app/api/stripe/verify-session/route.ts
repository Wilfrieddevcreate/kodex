import { NextResponse } from "next/server";
import { getSession } from "@/app/lib/auth";
import { prisma } from "@/app/lib/prisma";
import { stripe } from "@/app/lib/stripe";
import { notifyUser, notifyAdmins } from "@/app/lib/notifications";

/**
 * Verifies Stripe checkout session after redirect.
 * Creates subscription if webhook hasn't fired yet (safety net for local dev).
 */
export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  try {
    const { sessionId } = await request.json();
    if (!sessionId) return NextResponse.json({ error: "Missing session ID" }, { status: 400 });

    // Retrieve checkout session from Stripe
    const checkoutSession = await stripe.checkout.sessions.retrieve(sessionId);
    if (checkoutSession.payment_status !== "paid") {
      return NextResponse.json({ error: "Payment not completed" }, { status: 400 });
    }

    const stripeSubId = checkoutSession.subscription as string;
    if (!stripeSubId) return NextResponse.json({ error: "No subscription" }, { status: 400 });

    // Check if already processed
    const existingSub = await prisma.subscription.findFirst({
      where: { stripeSubscriptionId: stripeSubId },
    });
    if (existingSub) {
      return NextResponse.json({ status: "already_processed", subscription: existingSub });
    }

    const { userId, type } = checkoutSession.metadata || {};
    if (!userId || userId !== session.userId || !type) {
      return NextResponse.json({ error: "Invalid session" }, { status: 400 });
    }

    // Get subscription details from Stripe
    const stripeSub = await stripe.subscriptions.retrieve(stripeSubId) as unknown as { current_period_start: number; current_period_end: number };
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { firstName: true, lastName: true, email: true },
    });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const subscriptionType = type === "MANAGED" ? "MANAGED" as const : "SIGNALS" as const;
    const planLabel = subscriptionType === "MANAGED" ? "Managed Trading" : "Signals";
    const periodStart = new Date(stripeSub.current_period_start * 1000);
    const periodEnd = new Date(stripeSub.current_period_end * 1000);
    const amount = (checkoutSession.amount_total || 0) / 100;

    // Create subscription
    const subscription = await prisma.subscription.create({
      data: {
        userId,
        type: subscriptionType,
        status: "ACTIVE",
        stripeSubscriptionId: stripeSubId,
        stripePriceId: checkoutSession.metadata?.planId || null,
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
    await notifyUser(userId, "Subscription activated",
      `Your ${planLabel} subscription is now active. Next billing: ${periodEnd.toLocaleDateString("en-US")}.`,
      "system"
    );
    await notifyAdmins("New subscription",
      `${user.firstName} ${user.lastName} (${user.email}) subscribed to ${planLabel} for ${amount.toFixed(2)}€.`,
      "system"
    );

    return NextResponse.json({ status: "created", subscription });
  } catch (error) {
    console.error("Verify session error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
