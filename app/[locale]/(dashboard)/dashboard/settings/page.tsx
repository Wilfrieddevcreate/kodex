import { redirect } from "next/navigation";
import { getSession } from "@/app/lib/auth";
import { prisma } from "@/app/lib/prisma";
import SettingsClient from "./SettingsClient";

export default async function SettingsPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { id: true, firstName: true, lastName: true, email: true, phone: true, telegramChatId: true },
  });

  if (!user) redirect("/login");

  const settings = await prisma.appSettings.findFirst({ select: { telegramBotUsername: true } });

  return <SettingsClient user={user} telegramBotUsername={settings?.telegramBotUsername || null} />;
}
