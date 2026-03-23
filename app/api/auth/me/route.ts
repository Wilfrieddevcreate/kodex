import { NextResponse } from "next/server";
import { getSession } from "@/app/lib/auth";
import { prisma } from "@/app/lib/prisma";

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        country: true,
        language: true,
        role: true,
        emailVerified: true,
        trialEndsAt: true,
        createdAt: true,
        subscriptions: {
          where: { status: "ACTIVE" },
          select: {
            id: true,
            type: true,
            status: true,
            currentPeriodEnd: true,
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });
    }

    // Compute access status
    const now = new Date();
    const hasActiveSubscription = user.subscriptions.length > 0;
    const isTrialActive = user.trialEndsAt ? user.trialEndsAt > now : false;
    const hasAccess = hasActiveSubscription || isTrialActive;

    return NextResponse.json({
      user,
      access: {
        hasAccess,
        hasActiveSubscription,
        isTrialActive,
        trialEndsAt: user.trialEndsAt,
      },
    });
  } catch (error) {
    console.error("Me error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
