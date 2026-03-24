import { NextResponse } from "next/server";
import { getSession } from "@/app/lib/auth";
import { prisma } from "@/app/lib/prisma";
import { stripe, PLAN_CONFIG } from "@/app/lib/stripe";
import { checkoutLimiter, rateLimit } from "@/app/lib/security";

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const allowed = await rateLimit(checkoutLimiter, `checkout:${session.userId}`);
    if (!allowed) {
      return NextResponse.json({ error: "Too many attempts. Please wait." }, { status: 429 });
    }

    const { planId } = await request.json();

    const plan = PLAN_CONFIG[planId];
    if (!plan || !plan.priceId) {
      return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { id: true, email: true, stripeCustomerId: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Check for existing active subscription
    const existingSub = await prisma.subscription.findFirst({
      where: { userId: user.id, status: "ACTIVE" },
    });
    if (existingSub) {
      return NextResponse.json({ error: "You already have an active subscription" }, { status: 400 });
    }

    // Create or retrieve Stripe customer
    let stripeCustomerId = user.stripeCustomerId;

    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { userId: user.id },
      });
      stripeCustomerId = customer.id;

      await prisma.user.update({
        where: { id: user.id },
        data: { stripeCustomerId },
      });
    }

    // Create checkout session in SUBSCRIPTION mode
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    const checkoutSession = await stripe.checkout.sessions.create({
      customer: stripeCustomerId,
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [
        {
          price: plan.priceId,
          quantity: 1,
        },
      ],
      metadata: {
        userId: user.id,
        planId,
        type: plan.type,
      },
      subscription_data: {
        metadata: {
          userId: user.id,
          planId,
          type: plan.type,
        },
      },
      success_url: `${appUrl}/en/dashboard/subscription?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/en/subscribe?canceled=true`,
    });

    return NextResponse.json({ url: checkoutSession.url });
  } catch (error) {
    console.error("Checkout error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
