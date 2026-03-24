import { NextResponse } from "next/server";
import { getSession } from "@/app/lib/auth";
import { prisma } from "@/app/lib/prisma";
import crypto from "crypto";

// ─── VERIFY TELEGRAM AUTH HASH ──────────────────────────
function verifyTelegramAuth(data: Record<string, unknown>, botToken: string): boolean {
  const { hash, ...rest } = data;
  if (!hash || typeof hash !== "string") return false;

  // Build data-check-string: key=value pairs sorted alphabetically, joined by \n
  const checkString = Object.keys(rest)
    .sort()
    .map((key) => `${key}=${rest[key]}`)
    .join("\n");

  // Secret key = SHA256(bot_token)
  const secretKey = crypto.createHash("sha256").update(botToken).digest();

  // HMAC-SHA256(data-check-string, secret_key)
  const hmac = crypto.createHmac("sha256", secretKey).update(checkString).digest("hex");

  return hmac === hash;
}

// ─── POST: Connect Telegram via Login Widget ────────────
export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  try {
    const body = await request.json();
    const { id, first_name, last_name, username, photo_url, auth_date, hash } = body;

    if (!id || !auth_date || !hash) {
      return NextResponse.json({ error: "Invalid Telegram data" }, { status: 400 });
    }

    // Get bot token
    const settings = await prisma.appSettings.findFirst();
    if (!settings?.telegramBotToken) {
      return NextResponse.json({ error: "Telegram bot not configured" }, { status: 500 });
    }

    // Verify the hash
    const isValid = verifyTelegramAuth(
      { id, first_name, last_name, username, photo_url, auth_date, hash },
      settings.telegramBotToken
    );

    if (!isValid) {
      return NextResponse.json({ error: "Invalid authentication" }, { status: 403 });
    }

    // Check auth_date is not too old (max 1 hour)
    const now = Math.floor(Date.now() / 1000);
    if (now - auth_date > 3600) {
      return NextResponse.json({ error: "Authentication expired" }, { status: 403 });
    }

    // Check if this Telegram ID is already linked to another account
    const existingUser = await prisma.user.findFirst({
      where: { telegramChatId: String(id), id: { not: session.userId } },
    });
    if (existingUser) {
      return NextResponse.json({ error: "This Telegram account is already linked to another user" }, { status: 400 });
    }

    // Save the Telegram chat ID
    await prisma.user.update({
      where: { id: session.userId },
      data: { telegramChatId: String(id) },
    });

    return NextResponse.json({ message: "Telegram connected" });
  } catch (error) {
    console.error("Telegram connect error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// ─── DELETE: Disconnect Telegram ────────────────────────
export async function DELETE() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  await prisma.user.update({
    where: { id: session.userId },
    data: { telegramChatId: null },
  });

  return NextResponse.json({ message: "Telegram disconnected" });
}
