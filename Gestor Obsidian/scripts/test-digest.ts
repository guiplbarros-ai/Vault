import { getDailyDigestService } from '../src/services/daily-digest.service.js';

const chatId = Number(process.env.CHAT_ID || process.argv[2] || '1');

const digest = await getDailyDigestService().sendNow(chatId);
// Print raw digest to stdout
process.stdout.write(digest + '\n');

