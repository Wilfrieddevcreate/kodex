import webPush from "web-push";
import { prisma } from "./prisma";

webPush.setVapidDetails(
  "mailto:noreply@kodex.com",
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

export async function sendPushToUser(userId: string, payload: { title: string; message: string; url?: string }) {
  const subscriptions = await prisma.pushSubscription.findMany({
    where: { userId },
  });

  for (const sub of subscriptions) {
    try {
      await webPush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: { p256dh: sub.p256dh, auth: sub.auth },
        },
        JSON.stringify(payload)
      );
    } catch (error: unknown) {
      if (error && typeof error === "object" && "statusCode" in error && (error as { statusCode: number }).statusCode === 410) {
        await prisma.pushSubscription.delete({ where: { id: sub.id } });
      }
    }
  }
}

export async function sendPushToAll(payload: { title: string; message: string; url?: string }) {
  const now = new Date();

  // Only send to users with active access (subscribed or trial)
  const activeUsers = await prisma.user.findMany({
    where: {
      role: "CLIENT",
      OR: [
        { subscriptions: { some: { status: "ACTIVE" } } },
        { trialEndsAt: { gt: now } },
      ],
    },
    select: { id: true },
  });

  const activeUserIds = activeUsers.map((u) => u.id);

  // Also include admins
  const admins = await prisma.user.findMany({
    where: { role: "ADMIN" },
    select: { id: true },
  });
  const allIds = [...activeUserIds, ...admins.map((a) => a.id)];

  const subscriptions = await prisma.pushSubscription.findMany({
    where: { userId: { in: allIds } },
  });

  for (const sub of subscriptions) {
    try {
      await webPush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: { p256dh: sub.p256dh, auth: sub.auth },
        },
        JSON.stringify(payload)
      );
    } catch (error: unknown) {
      if (error && typeof error === "object" && "statusCode" in error && (error as { statusCode: number }).statusCode === 410) {
        await prisma.pushSubscription.delete({ where: { id: sub.id } });
      }
    }
  }
}
