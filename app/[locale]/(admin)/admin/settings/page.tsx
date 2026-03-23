import { prisma } from "@/app/lib/prisma";
import SettingsAdmin from "./SettingsAdmin";

export default async function AdminSettingsPage() {
  const settings = await prisma.appSettings.findFirst();
  const tiers = await prisma.commissionTier.findMany({ orderBy: { minReferrals: "asc" } });

  return (
    <SettingsAdmin
      settings={{
        trialDurationDays: settings?.trialDurationDays ?? 7,
        telegramBotToken: settings?.telegramBotToken || "",
        telegramBotUsername: settings?.telegramBotUsername || "",
        telegramChannelId: settings?.telegramChannelId || "",
        commissionRate: settings?.commissionRate ?? 0.10,
        commissionSecurityDays: settings?.commissionSecurityDays ?? 30,
        commissionMonthlyCap: settings?.commissionMonthlyCap ?? 5000,
      }}
      tiers={tiers.map((t) => ({ id: t.id, minReferrals: t.minReferrals, maxReferrals: t.maxReferrals, amount: t.amount }))}
    />
  );
}
