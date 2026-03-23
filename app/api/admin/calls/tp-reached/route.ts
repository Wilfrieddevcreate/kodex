import { NextResponse } from "next/server";
import { requireAdmin } from "@/app/lib/admin-auth";
import { prisma } from "@/app/lib/prisma";
import { sendPushToAll } from "@/app/lib/push";
import { notifyBroadcast } from "@/app/lib/notifications";

async function sendTpTelegram(pair: string, rank: number, price: number) {
  const settings = await prisma.appSettings.findFirst();
  if (!settings?.telegramBotToken || !settings?.telegramChannelId) return;

  const text = `🎯 <b>TP${rank} REACHED!</b>\n\n` +
    `📊 <b>${pair}</b>\n` +
    `✅ TP${rank}: <b>${price}</b>\n\n` +
    `⏰ ${new Date().toLocaleString()}\n` +
    `━━━━━━━━━━━━━━━\n` +
    `<b>KODEX</b> — Crypto Signals`;

  await fetch(`https://api.telegram.org/bot${settings.telegramBotToken}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: settings.telegramChannelId,
      text,
      parse_mode: "HTML",
    }),
  });
}

export async function POST(request: Request) {
  const { error } = await requireAdmin();
  if (error) return error;

  try {
    const { targetId } = await request.json();

    if (!targetId) {
      return NextResponse.json({ error: "Target ID is required" }, { status: 400 });
    }

    // Get target with call and pair info
    const target = await prisma.callTarget.findUnique({
      where: { id: targetId },
      include: {
        call: {
          include: { tradingPair: true },
        },
      },
    });

    if (!target) {
      return NextResponse.json({ error: "Target not found" }, { status: 404 });
    }

    if (target.reached) {
      return NextResponse.json({ error: "Target already marked as reached" }, { status: 400 });
    }

    // Mark as reached
    await prisma.callTarget.update({
      where: { id: targetId },
      data: { reached: true },
    });

    const pair = `${target.call.tradingPair.base}/${target.call.tradingPair.quote}`;
    const notifTitle = `TP${target.rank} Reached: ${pair}`;
    const notifMsg = `Take Profit ${target.rank} at ${target.price} has been reached for ${pair}!`;

    // DB notification (bell)
    notifyBroadcast(notifTitle, notifMsg, "call").catch(console.error);

    // Push notification (browser)
    sendPushToAll({
      title: `🎯 ${notifTitle}`,
      message: notifMsg,
      url: "/dashboard",
    }).catch(console.error);

    // Telegram
    sendTpTelegram(pair, target.rank, target.price).catch(console.error);

    return NextResponse.json({ message: `TP${target.rank} marked as reached`, pair, rank: target.rank });
  } catch (err) {
    console.error("TP reached error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
