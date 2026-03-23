import { NextResponse } from "next/server";
import { requireAdmin } from "@/app/lib/admin-auth";
import { prisma } from "@/app/lib/prisma";

export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;

  const settings = await prisma.appSettings.findFirst();
  const tiers = await prisma.commissionTier.findMany({ orderBy: { minReferrals: "asc" } });
  return NextResponse.json({ settings, tiers });
}

export async function PUT(request: Request) {
  const { error } = await requireAdmin();
  if (error) return error;

  try {
    const body = await request.json();

    await prisma.appSettings.upsert({
      where: { id: "singleton" },
      update: {
        trialDurationDays: body.trialDurationDays ?? 7,
        telegramBotToken: body.telegramBotToken || null,
        telegramBotUsername: body.telegramBotUsername || null,
        telegramChannelId: body.telegramChannelId || null,
        commissionRate: body.commissionRate ?? 0.10,
        commissionSecurityDays: body.commissionSecurityDays ?? 30,
        commissionMonthlyCap: body.commissionMonthlyCap ?? 5000,
      },
      create: {
        id: "singleton",
        trialDurationDays: body.trialDurationDays ?? 7,
        telegramBotToken: body.telegramBotToken || null,
        telegramBotUsername: body.telegramBotUsername || null,
        telegramChannelId: body.telegramChannelId || null,
        commissionRate: body.commissionRate ?? 0.10,
        commissionSecurityDays: body.commissionSecurityDays ?? 30,
        commissionMonthlyCap: body.commissionMonthlyCap ?? 5000,
      },
    });

    // Update commission tiers
    if (body.tiers) {
      await prisma.commissionTier.deleteMany();
      for (const tier of body.tiers) {
        await prisma.commissionTier.create({
          data: {
            minReferrals: tier.minReferrals,
            maxReferrals: tier.maxReferrals || null,
            amount: tier.amount,
          },
        });
      }
    }

    return NextResponse.json({ message: "Settings updated" });
  } catch (err) {
    console.error("Update settings error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
