import TelegramBot from 'node-telegram-bot-api';
import { config } from '../config.js';

let bot = null;
function getBot() {
  if (!config.telegramBotToken) return null;
  if (!bot) bot = new TelegramBot(config.telegramBotToken, { polling: false });
  return bot;
}

export async function sendTelegramMessage(text) {
  const b = getBot();
  if (!b || !config.telegramChatId) {
    console.warn('[telegram] Not configured, skipping message:', text.slice(0, 80));
    return;
  }
  await b.sendMessage(config.telegramChatId, text, { parse_mode: 'Markdown' });
}

export async function sendDailyReport({ counts, prospectsAdded, pauses, capsRemaining, reviewList }) {
  const lines = [
    `*Zack.ai — Daily Report*`,
    ``,
    `*Actions taken:*`,
    `Comments: ${counts.comment || 0}`,
    `Connections sent: ${counts.connect || 0}`,
    `DMs sent: ${counts.dm || 0}`,
    ``,
    `*New prospects added:* ${prospectsAdded}`,
    ``,
    `*Caps remaining today:*`,
    `Comments: ${capsRemaining.comment}, Connects: ${capsRemaining.connect}, DMs: ${capsRemaining.dm}`,
  ];

  if (pauses?.length) {
    lines.push(``, `*⚠️ Pauses/failures:*`, ...pauses.map((p) => `- ${p}`));
  }

  if (reviewList?.length) {
    lines.push(``, `*Connection requests due for review (no response):*`);
    reviewList.forEach((r) => lines.push(`- ${r.name} — ${r.daysWaiting}d — ${r.profileUrl}`));
  }

  await sendTelegramMessage(lines.join('\n'));
}

export async function sendAlert(message) {
  await sendTelegramMessage(`*⚠️ Zack.ai Alert*\n${message}`);
}
