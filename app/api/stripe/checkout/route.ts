import { NextResponse } from "next/server";
import { getSession } from "@/app/lib/auth";
import { prisma } from "@/app/lib/prisma";
import { stripe, STRIPE_PRICES } from "@/app/lib/stripe";
import { checkoutLimiter, rateLimit } from "@/app/lib/security";

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Rate limit per user
    const allowed = await rateLimit(checkoutLimiter, `checkout:${session.userId}`);
    if (!allowed) {
      return NextResponse.json({ error: "Too many attempts. Please wait." }, { status: 429 });
    }

    const { plan, months } = await request.json();

    // Validate plan and duration
    if (!["signals", "managed"].includes(plan) || ![1, 3, 6, 12].includes(months)) {
      return NextResponse.json({ error: "Plan ou durée invalide" }, { status: 400 });
    }

    const priceConfig = STRIPE_PRICES[plan]?.[months];
    if (!priceConfig) {
      return NextResponse.json({ error: "Configuration de prix introuvable" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { id: true, email: true, stripeCustomerId: true },
    });

    if (!user) {
      return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });
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

    // Create checkout session
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    const checkoutSession = await stripe.checkout.sessions.create({
      customer: stripeCustomerId,
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "eur",
            product_data: {
              name: `Kodex ${plan === "signals" ? "Signals" : "Managed Trading"} — ${months} month${months > 1 ? "s" : ""}`,
            },
            unit_amount: priceConfig.amount,
          },
          quantity: 1,
        },
      ],
      metadata: {
        userId: user.id,
        plan,
        months: months.toString(),
      },
      success_url: `${appUrl}/en/dashboard/subscription?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/en/subscribe?canceled=true`,
    });

    return NextResponse.json({ url: checkoutSession.url });
  } catch (error) {
    console.error("Checkout error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
