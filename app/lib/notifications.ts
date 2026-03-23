import { prisma } from "./prisma";

/**
 * Create a notification for a specific user
 */
export async function notifyUser(userId: string, title: string, message: string, type: string = "info") {
  return prisma.notification.create({
    data: { userId, title, message, type },
  });
}

/**
 * Create a broadcast notification (userId = null, visible to all)
 */
export async function notifyBroadcast(title: string, message: string, type: string = "info") {
  return prisma.notification.create({
    data: { userId: null, title, message, type },
  });
}

/**
 * Notify all admin users
 */
export async function notifyAdmins(title: string, message: string, type: string = "system") {
  const admins = await prisma.user.findMany({ where: { role: "ADMIN" }, select: { id: true } });
  for (const admin of admins) {
    await prisma.notification.create({
      data: { userId: admin.id, title, message, type },
    });
  }
}
