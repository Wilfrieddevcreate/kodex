import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { stripe } from "@/app/lib/stripe";
import { prisma } from "@/app/lib/prisma";
import type Stripe from "stripe";
import { notifyUser, notifyAdmins } from "@/app/lib/notifications";
import { createCommission, cancelCommissions } from "@/app/lib/commission";

async function generateInvoiceNumber(): Promise<string> {
  const crypto = require("crypto");
  const year = new Date().getFullYear();
  const count = await prisma.invoice.count({
    where: { createdAt: { gte: new Date(`${year}-01-01`) } },
  });
  const suffix = crypto.randomBytes(2).toString("hex");
  return `KDX-${year}-${String(count + 1).padStart(4, "0")}-${suffix}`;
}

export async function POST(request: Request) {
  const body = await request.text();
  const headersList = await headers();
  const signature = headersList.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "No signature" }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      // ─── CHECKOUT COMPLETED ─────────────────────────────
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const { userId, plan, months } = session.metadata || {};

        if (!userId || !plan || !months) break;

        // Idempotency check
        const existingSub = await prisma.subscription.findFirst({
          where: { stripeSubscriptionId: session.id },
        });
        if (existingSub) {
          console.log(`Subscription already exists for session ${session.id}, skipping`);
          break;
        }

        const monthsNum = parseInt(months);
        const user = await prisma.user.findUnique({
          where: { id: userId },
          select: { id: true, firstName: true, lastName: true, email: true, trialEndsAt: true },
        });

        if (!user) break;

        // Period calculation
        const now = new Date();
        let periodStart: Date;
        if (user.trialEndsAt && user.trialEndsAt > now) {
          periodStart = new Date(user.trialEndsAt);
        } else {
          periodStart = now;
        }

        const periodEnd = new Date(periodStart);
        periodEnd.setMonth(periodEnd.getMonth() + monthsNum);

        const subscriptionType = plan === "managed" ? "MANAGED" as const : "SIGNALS" as const;
        const planLabel = `${plan === "managed" ? "Managed Trading" : "Signals"} — ${monthsNum} month${monthsNum > 1 ? "s" : ""}`;
        const amount = (session.amount_total || 0) / 100;

        // Create subscription
        const subscription = await prisma.subscription.create({
          data: {
            userId,
            type: subscriptionType,
            status: "ACTIVE",
            stripeSubscriptionId: session.id,
            stripePriceId: session.metadata?.priceId || null,
            currentPeriodStart: periodStart,
            currentPeriodEnd: periodEnd,
          },
        });

        // Get Stripe receipt URL
        let stripeReceiptUrl: string | null = null;
        if (session.payment_intent) {
          try {
            const pi = await stripe.paymentIntents.retrieve(session.payment_intent as string);
            if (pi.latest_charge) {
              const charge = await stripe.charges.retrieve(pi.latest_charge as string);
              stripeReceiptUrl = charge.receipt_url || null;
            }
          } catch (e) {
            console.error("Failed to get receipt URL:", e);
          }
        }

        // Create invoice
        const invoiceNumber = await generateInvoiceNumber();
        const invoice = await prisma.invoice.create({
          data: {
            userId,
            subscriptionId: subscription.id,
            invoiceNumber,
            amount,
            plan: planLabel,
            status: "paid",
            stripePaymentId: session.payment_intent as string || null,
            stripeReceiptUrl,
          },
        });

        // Notify client
        await notifyUser(
          userId,
          "Subscription activated",
          `Your ${planLabel} subscription is now active. Valid until ${periodEnd.toLocaleDateString("en-US")}.`,
          "system"
        );

        // Notify admins
        await notifyAdmins(
          "New subscription",
          `${user.firstName} ${user.lastName} (${user.email}) subscribed to ${planLabel} for ${amount.toFixed(2)}€.`,
          "system"
        );

        // ─── COMMISSION: create if user was referred ───
        try {
          await createCommission({
            subscriptionId: subscription.id,
            grossAmount: amount,
            stripePaymentId: session.payment_intent as string || undefined,
            referredUserId: userId,
          });
        } catch (err) {
          console.error("Commission creation error (non-blocking):", err);
        }

        console.log(`Subscription + invoice + commission created for ${user.email}: ${planLabel} (${invoiceNumber})`);
        break;
      }

      // ─── CHECKOUT EXPIRED ───────────────────────────────
      case "checkout.session.expired": {
        const session = event.data.object as Stripe.Checkout.Session;
        console.log(`Checkout session expired: ${session.id}`);
        break;
      }

      // ─── CHARGE REFUNDED ───────────────────────────────
      case "charge.refunded": {
        const charge = event.data.object as Stripe.Charge;
        const paymentIntentId = typeof charge.payment_intent === "string" ? charge.payment_intent : charge.payment_intent?.id;

        if (paymentIntentId) {
          const invoice = await prisma.invoice.findFirst({
            where: { stripePaymentId: paymentIntentId },
            include: { user: { select: { firstName: true, lastName: true } } },
          });

          if (invoice) {
            await prisma.invoice.update({
              where: { id: invoice.id },
              data: { status: "refunded" },
            });

            await prisma.subscription.update({
              where: { id: invoice.subscriptionId },
              data: { status: "EXPIRED", cancelledAt: new Date() },
            });

            // Cancel associated commissions
            await cancelCommissions({
              subscriptionId: invoice.subscriptionId,
              reason: "refund",
            });

            await notifyUser(
              invoice.userId,
              "Subscription cancelled",
              "Your subscription has been refunded and cancelled."
            );

            await notifyAdmins(
              "Refund processed",
              `Refund for ${invoice.user.firstName} ${invoice.user.lastName} — Invoice ${invoice.invoiceNumber} (${invoice.amount.toFixed(2)}€).`,
              "system"
            );

            console.log(`Refund + commission cancel for invoice ${invoice.invoiceNumber}`);
          }
        }
        break;
      }

      // ─── CHARGE DISPUTED ──────────────────────────────
      case "charge.dispute.created": {
        const dispute = event.data.object as Stripe.Dispute;
        const chargeId = typeof dispute.charge === "string" ? dispute.charge : dispute.charge?.id;

        if (chargeId) {
          // Get the charge to find the payment intent
          const charge = await stripe.charges.retrieve(chargeId);
          const paymentIntentId = typeof charge.payment_intent === "string" ? charge.payment_intent : null;

          if (paymentIntentId) {
            const invoice = await prisma.invoice.findFirst({
              where: { stripePaymentId: paymentIntentId },
              include: { user: { select: { id: true, firstName: true, lastName: true, email: true } } },
            });

            if (invoice) {
              // Cancel subscription immediately
              await prisma.subscription.update({
                where: { id: invoice.subscriptionId },
                data: { status: "EXPIRED", cancelledAt: new Date() },
              });

              // Cancel ALL commissions for this subscription
              await cancelCommissions({
                subscriptionId: invoice.subscriptionId,
                reason: "dispute",
              });

              // Mark invoice
              await prisma.invoice.update({
                where: { id: invoice.id },
                data: { status: "disputed" },
              });

              // Notify
              await notifyUser(
                invoice.userId,
                "Account suspended",
                "Your account has been suspended due to a payment dispute. Contact support.",
                "system"
              );

              await notifyAdmins(
                "DISPUTE ALERT",
                `Payment dispute from ${invoice.user.firstName} ${invoice.user.lastName} (${invoice.user.email}) — Invoice ${invoice.invoiceNumber} (${invoice.amount.toFixed(2)}€). Subscription cancelled, commissions revoked.`,
                "system"
              );

              console.log(`DISPUTE: subscription cancelled + commissions revoked for ${invoice.user.email}`);
            }
          }
        }
        break;
      }

      // ─── SUBSCRIPTION CANCELLED (Stripe recurring) ────
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const existingSub = await prisma.subscription.findFirst({
          where: { stripeSubscriptionId: sub.id },
        });

        if (existingSub) {
          await prisma.subscription.update({
            where: { id: existingSub.id },
            data: { status: "CANCELLED", cancelledAt: new Date() },
          });

          await cancelCommissions({
            subscriptionId: existingSub.id,
            reason: "subscription_cancelled",
          });

          await notifyUser(
            existingSub.userId,
            "Subscription cancelled",
            "Your subscription has been cancelled.",
            "system"
          );

          console.log(`Subscription ${sub.id} cancelled via Stripe`);
        }
        break;
      }
    }
  } catch (error) {
    console.error("Webhook handler error:", error);
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
