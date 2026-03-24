import { prisma } from "./prisma";

// ─── CONFIG ─────────────────────────────────────────────
async function getBotToken(): Promise<string | null> {
  const settings = await prisma.appSettings.findFirst();
  return settings?.telegramBotToken || null;
}

// ─── SEND MESSAGE TO ONE USER ───────────────────────────
async function sendMessageToChat(token: string, chatId: string, text: string) {
  const url = `https://api.telegram.org/bot${token}/sendMessage`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: "HTML",
      disable_web_page_preview: false,
    }),
  });

  if (!res.ok) {
    try {
      const err = await res.json();
      console.error(`Telegram send error to ${chatId}:`, err.description || JSON.stringify(err));
      // If user blocked the bot or chat not found, remove their telegramChatId
      if (err.error_code === 403 || err.error_code === 400) {
        try {
          await prisma.user.updateMany({
            where: { telegramChatId: chatId },
            data: { telegramChatId: null },
          });
          console.log(`Removed invalid telegramChatId: ${chatId}`);
        } catch (e) {
          console.error("Failed to remove invalid chatId:", e);
        }
      }
    } catch {
      console.error(`Telegram send failed to ${chatId}: HTTP ${res.status}`);
    }
  }
}

// ─── GET ACTIVE SUBSCRIBERS WITH TELEGRAM LINKED ────────
async function getActiveSubscribersWithTelegram(): Promise<string[]> {
  const now = new Date();

  // Users with active subscription AND telegram linked
  const subscribedUsers = await prisma.user.findMany({
    where: {
      telegramChatId: { not: null },
      role: "CLIENT",
      subscriptions: {
        some: { status: "ACTIVE" },
      },
    },
    select: { telegramChatId: true },
  });

  // Users in trial AND telegram linked
  const trialUsers = await prisma.user.findMany({
    where: {
      telegramChatId: { not: null },
      role: "CLIENT",
      trialEndsAt: { gt: now },
      subscriptions: {
        none: { status: "ACTIVE" },
      },
    },
    select: { telegramChatId: true },
  });

  const chatIds = new Set<string>();
  for (const u of [...subscribedUsers, ...trialUsers]) {
    if (u.telegramChatId) chatIds.add(u.telegramChatId);
  }

  return Array.from(chatIds);
}

// ─── SEND TO ALL ACTIVE SUBSCRIBERS ─────────────────────
async function sendToActiveSubscribers(text: string) {
  const token = await getBotToken();
  if (!token) return;

  const chatIds = await getActiveSubscribersWithTelegram();
  if (chatIds.length === 0) return;

  console.log(`Sending Telegram message to ${chatIds.length} active subscribers`);

  // Send in parallel with concurrency limit
  const BATCH_SIZE = 20; // Telegram rate limit: ~30 messages/sec
  for (let i = 0; i < chatIds.length; i += BATCH_SIZE) {
    const batch = chatIds.slice(i, i + BATCH_SIZE);
    await Promise.all(batch.map((chatId) => sendMessageToChat(token, chatId, text)));

    // Small delay between batches to respect rate limits
    if (i + BATCH_SIZE < chatIds.length) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }
}

// ─── SEND CALL ──────────────────────────────────────────
export async function sendCallToTelegram(call: {
  pair: string;
  entryMin: number;
  entryMax: number;
  stopLoss: number;
  targets: { rank: number; price: number }[];
}) {
  const tps = call.targets.map((t) => `  🎯 TP${t.rank}: <b>${t.price}</b>`).join("\n");

  const text =
    `🚀 <b>NEW SIGNAL</b>\n\n` +
    `📊 <b>${call.pair}</b>\n\n` +
    `💰 Entry: <b>${call.entryMin} — ${call.entryMax}</b>\n\n` +
    `Targets:\n${tps}\n\n` +
    `🛑 Stop Loss: <b>${call.stopLoss}</b>\n\n` +
    `⏰ ${new Date().toLocaleString()}\n` +
    `━━━━━━━━━━━━━━━\n` +
    `<b>KODEX</b> — Crypto Signals`;

  await sendToActiveSubscribers(text);
}

// ─── SEND NEWS ──────────────────────────────────────────
export async function sendNewsToTelegram(news: { title: string; description: string }) {
  const text =
    `📰 <b>NEWS</b>\n\n` +
    `<b>${news.title}</b>\n\n` +
    `${news.description.slice(0, 300)}${news.description.length > 300 ? "..." : ""}\n\n` +
    `━━━━━━━━━━━━━━━\n` +
    `<b>KODEX</b> — Crypto News`;

  await sendToActiveSubscribers(text);
}

// ─── SEND TP REACHED ────────────────────────────────────
export async function sendTpReachedToTelegram(call: {
  pair: string;
  tpRank: number;
  tpPrice: number;
}) {
  const text =
    `✅ <b>TARGET REACHED</b>\n\n` +
    `📊 <b>${call.pair}</b>\n` +
    `🎯 TP${call.tpRank}: <b>${call.tpPrice}</b> ✅\n\n` +
    `━━━━━━━━━━━━━━━\n` +
    `<b>KODEX</b> — Crypto Signals`;

  await sendToActiveSubscribers(text);
}

// ─── SEND TO SINGLE USER ────────────────────────────────
export async function sendToUser(userId: string, text: string) {
  const token = await getBotToken();
  if (!token) return;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { telegramChatId: true },
  });

  if (!user?.telegramChatId) return;

  await sendMessageToChat(token, user.telegramChatId, text);
}
