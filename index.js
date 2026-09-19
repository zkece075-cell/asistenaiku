/**
 * =============================================================
 *  GROQ DUAL AI - TELEGRAM BOT
 * =============================================================
 *  Bot Telegram dengan AI Groq (2 API Key + 2 Model + fallback
 *  otomatis), riwayat obrolan tersimpan per user, sistem limit
 *  harian (free / premium / owner), dan statistik real-time.
 *
 *  SETUP SINGKAT:
 *   1. npm install
 *   2. EDIT GROQ_API_KEY_1 & GROQ_API_KEY_2 di bawah (copy-paste saja)
 *   3. node index.js  -> ikuti wizard di console
 *
 *  DOKUMENTASI: README.md & tutorialtermux.md
 * =============================================================
 */

const fs = require('fs');
const os = require('os');
const path = require('path');
const readline = require('readline');
const chalk = require('chalk');
const figlet = require('figlet');
const { Telegraf } = require('telegraf');
const Groq = require('groq-sdk');

// ================================================================
//  GROQ API KEYS - WAJIB DIISI MANUAL DI SINI
//  Dapatkan gratis di: https://console.groq.com/keys
//  Ganti string di bawah dengan 2 API key Groq kamu
// ================================================================
const GROQ_API_KEY_1 = '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'; // <- Ganti ini
const GROQ_API_KEY_2 = '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'; // <- Ganti ini juga

// Model untuk masing-masing API Key.
// Cek daftar model terbaru di: https://console.groq.com/docs/models
// (model bisa berubah sewaktu-waktu mengikuti update dari Groq)
const GROQ_MODEL_1 = 'gemma-7b-it';
const GROQ_MODEL_2 = 'mixtral-8x7b-32768';

// ================================================================
//  KONSTANTA LIMIT & PENYIMPANAN
// ================================================================
const LIMIT_FREE = 800; // chat/hari untuk user biasa
const LIMIT_PREMIUM = 9000; // chat/hari untuk user premium
const MAX_HISTORY = 20; // jumlah pesan (user + ai) disimpan per user

const ROOT_DIR = __dirname;
const CONFIG_PATH = path.join(ROOT_DIR, 'config.json');
const OWNER_PATH = path.join(ROOT_DIR, 'owners', 'ownerid.json');
const DB_PATH = path.join(ROOT_DIR, 'database', 'users.json');
const HISTORY_DIR = path.join(ROOT_DIR, 'database', 'history');

// ================================================================
//  HELPER FILE & FORMAT
// ================================================================
function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function readJSON(p, fallback = {}) {
  try {
    return JSON.parse(fs.readFileSync(p, 'utf-8'));
  } catch (e) {
    return fallback;
  }
}

function writeJSON(p, data) {
  ensureDir(path.dirname(p));
  fs.writeFileSync(p, JSON.stringify(data, null, 2));
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function formatUptime(ms) {
  const sec = Math.floor(ms / 1000);
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  return `${h}j ${m}m ${s}d`;
}

function formatBytes(bytes) {
  return (bytes / 1024 / 1024).toFixed(2) + ' MB';
}

function getCpuUsagePercent() {
  const cpus = os.cpus();
  let totalIdle = 0;
  let totalTick = 0;
  cpus.forEach((cpu) => {
    for (const type in cpu.times) totalTick += cpu.times[type];
    totalIdle += cpu.times.idle;
  });
  const idle = totalIdle / cpus.length;
  const total = totalTick / cpus.length;
  return (100 - (100 * idle) / total).toFixed(2);
}

function defaultPrompt(aiName) {
  return `Kamu adalah ${aiName}, sebuah kecerdasan buatan yang dibuat oleh Apit dari perusahaan Einstein. Jawab setiap pertanyaan dengan jelas, ramah, dan sesuai konteks percakapan yang sedang berlangsung.`;
}

// ================================================================
//  SETUP WIZARD (dijalankan otomatis saat config.json belum ada)
// ================================================================
function askQuestion(rl, query) {
  return new Promise((resolve) => rl.question(query, resolve));
}

async function runSetupWizard() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  console.log(chalk.yellow.bold('\n=== SETUP AWAL BOT AI GROQ ===\n'));

  const telegramToken = await askQuestion(rl, chalk.cyan('Masukkan Token Bot Telegram: '));
  const ownerId = await askQuestion(rl, chalk.cyan('Masukkan ID Owner (Telegram User ID): '));
  const aiName = await askQuestion(rl, chalk.cyan('Masukkan Nama AI: '));
  let aiPrompt = await askQuestion(
    rl,
    chalk.cyan('Masukkan Prompt AI (kosongkan untuk pakai default): '),
  );

  rl.close();

  const cleanName = aiName.trim() || 'AI Assistant';
  if (!aiPrompt || aiPrompt.trim() === '') {
    aiPrompt = defaultPrompt(cleanName);
  }

  const config = {
    telegramToken: telegramToken.trim(),
    ownerId: ownerId.trim(),
    aiName: cleanName,
    aiPrompt: aiPrompt.trim(),
    createdAt: new Date().toISOString(),
  };

  writeJSON(CONFIG_PATH, config);
  console.log(chalk.green('\nKonfigurasi berhasil disimpan ke config.json\n'));
  return config;
}

function loadConfig() {
  if (fs.existsSync(CONFIG_PATH)) return readJSON(CONFIG_PATH);
  return null; // akan memicu wizard interaktif di console
}

// ================================================================
//  DATABASE USER & RIWAYAT OBROLAN
// ================================================================
function getUser(db, id) {
  id = String(id);
  if (!db[id]) {
    db[id] = {
      id,
      isPremium: false,
      premiumExpiry: null,
      dailyCount: 0,
      lastReset: todayStr(),
      totalChat: 0,
      joinedAt: new Date().toISOString(),
    };
  }
  return db[id];
}

function checkAndResetLimit(user) {
  const today = todayStr();
  if (user.lastReset !== today) {
    user.dailyCount = 0;
    user.lastReset = today;
  }
  if (user.isPremium && user.premiumExpiry && new Date(user.premiumExpiry) < new Date()) {
    user.isPremium = false;
    user.premiumExpiry = null;
  }
}

function getLimitFor(user, isOwnerFlag) {
  if (isOwnerFlag) return Infinity;
  if (user.isPremium) return LIMIT_PREMIUM;
  return LIMIT_FREE;
}

function historyPath(id) {
  return path.join(HISTORY_DIR, `${id}.json`);
}

function loadHistory(id) {
  const p = historyPath(id);
  if (fs.existsSync(p)) return readJSON(p, []);
  return [];
}

function saveHistory(id, history) {
  if (history.length > MAX_HISTORY) {
    history = history.slice(history.length - MAX_HISTORY);
  }
  writeJSON(historyPath(id), history);
}

// ================================================================
//  GROQ CLIENT (2 API KEY) + FALLBACK OTOMATIS
// ================================================================
const groqPrimary = new Groq({ apiKey: GROQ_API_KEY_1 });
const groqSecondary = new Groq({ apiKey: GROQ_API_KEY_2 });

async function askAI(config, userId, userMessage, stats) {
  const history = loadHistory(userId);
  history.push({ role: 'user', content: userMessage });

  const messages = [{ role: 'system', content: config.aiPrompt }, ...history];

  let replyText;
  let usedModel;

  try {
    const completion = await groqPrimary.chat.completions.create({
      model: GROQ_MODEL_1,
      messages,
    });
    replyText = completion.choices[0].message.content;
    usedModel = GROQ_MODEL_1;
  } catch (err1) {
    console.log(chalk.red(`[GROQ API 1 GAGAL] ${err1.message}`));
    try {
      const completion2 = await groqSecondary.chat.completions.create({
        model: GROQ_MODEL_2,
        messages,
      });
      replyText = completion2.choices[0].message.content;
      usedModel = GROQ_MODEL_2;
    } catch (err2) {
      console.log(chalk.red(`[GROQ API 2 GAGAL] ${err2.message}`));
      throw new Error('Kedua API Groq gagal merespon. Coba lagi beberapa saat lagi.');
    }
  }

  history.push({ role: 'assistant', content: replyText });
  saveHistory(userId, history);

  stats.totalRun += 1;

  return { replyText, usedModel };
}

// ================================================================
//  BOT TELEGRAM
// ================================================================
function startBot(config, ownersData) {
  const bot = new Telegraf(config.telegramToken);
  const db = fs.existsSync(DB_PATH) ? readJSON(DB_PATH, {}) : {};
  const stats = { totalRun: 0, startTime: Date.now() };

  function persistDB() {
    writeJSON(DB_PATH, db);
  }

  function isOwner(id) {
    return ownersData.owners.includes(String(id));
  }

  // ------------------- BANNER START -------------------
  console.clear();
  console.log(
    chalk.magentaBright(
      figlet.textSync(config.aiName.toUpperCase().slice(0, 16), { font: 'Small' }),
    ),
  );
  console.log(chalk.gray('═'.repeat(55)));
  console.log(chalk.greenBright('✓ Status             : ONLINE'));
  console.log(chalk.greenBright('✓ Nama AI            : ') + chalk.white(config.aiName));
  console.log(chalk.greenBright('✓ Owner ID           : ') + chalk.white(config.ownerId));
  console.log(chalk.greenBright('✓ Model Primary      : ') + chalk.cyan(GROQ_MODEL_1));
  console.log(chalk.greenBright('✓ Model Fallback     : ') + chalk.cyan(GROQ_MODEL_2));
  console.log(chalk.greenBright('✓ API Keys Loaded    : 2x Groq API'));
  console.log(chalk.greenBright('✓ Node Version       : ') + chalk.white(process.version));
  console.log(chalk.yellowBright('→ Limit Free/Premium : ') + chalk.white(`${LIMIT_FREE}/${LIMIT_PREMIUM} chat/hari`));
  console.log(chalk.gray('═'.repeat(55)) + '\n');
  // ------------------- BANNER END -------------------

  bot.start((ctx) => {
    const nama = ctx.from.first_name || 'Kawan';
    ctx.reply(
      `Halo ${nama}! Aku ${config.aiName}, siap membantu obrolanmu kapan saja.\n\n` +
        `Ketik pesan apa saja untuk mulai ngobrol denganku.\n\n` +
        `Perintah yang tersedia:\n` +
        `/stats - Lihat statistik bot\n` +
        `/premium - Cek status & limit harianmu\n` +
        `/reset - Hapus riwayat obrolanmu`,
    );
  });

  bot.command('stats', (ctx) => {
    const uptime = formatUptime(Date.now() - stats.startTime);
    const mem = formatBytes(process.memoryUsage().rss);
    const cpu = getCpuUsagePercent();
    const totalUser = Object.keys(db).length;
    const totalPremium = Object.values(db).filter((u) => u.isPremium).length;

    ctx.reply(
      `STATISTIK BOT\n` +
        `─────────────────────\n` +
        `Total Chat Diproses  : ${stats.totalRun}\n` +
        `Total User Terdaftar : ${totalUser}\n` +
        `Total User Premium   : ${totalPremium}\n` +
        `Uptime               : ${uptime}\n` +
        `Penggunaan RAM       : ${mem}\n` +
        `Penggunaan CPU       : ${cpu}%\n` +
        `Model Aktif          : ${GROQ_MODEL_1} / ${GROQ_MODEL_2}`,
    );
  });

  bot.command('reset', (ctx) => {
    saveHistory(ctx.from.id, []);
    ctx.reply('Riwayat obrolan kamu sudah dihapus.');
  });

  bot.command('premium', (ctx) => {
    const user = getUser(db, ctx.from.id);
    checkAndResetLimit(user);
    persistDB();
    const limit = getLimitFor(user, isOwner(ctx.from.id));
    ctx.reply(
      `Status Premium : ${user.isPremium ? 'AKTIF' : 'TIDAK AKTIF'}\n` +
        `Berlaku Hingga : ${
          user.premiumExpiry ? new Date(user.premiumExpiry).toLocaleString('id-ID') : '-'
        }\n` +
        `Limit Harian   : ${limit === Infinity ? 'TANPA BATAS' : limit}\n` +
        `Sudah Dipakai  : ${user.dailyCount}`,
    );
  });

  bot.command('addprem', (ctx) => {
    if (!isOwner(ctx.from.id)) return ctx.reply('Perintah ini khusus owner.');
    const args = ctx.message.text.split(' ').slice(1);
    if (args.length < 2) return ctx.reply('Format: /addprem <user_id> <jumlah_hari>');

    const [targetId, daysRaw] = args;
    const days = parseInt(daysRaw, 10);
    if (Number.isNaN(days) || days <= 0) return ctx.reply('Jumlah hari tidak valid.');

    const user = getUser(db, targetId);
    const base =
      user.isPremium && user.premiumExpiry && new Date(user.premiumExpiry) > new Date()
        ? new Date(user.premiumExpiry)
        : new Date();
    base.setDate(base.getDate() + days);

    user.isPremium = true;
    user.premiumExpiry = base.toISOString();
    persistDB();
    ctx.reply(`User ${targetId} berhasil dijadikan premium selama ${days} hari.`);
  });

  bot.command('delprem', (ctx) => {
    if (!isOwner(ctx.from.id)) return ctx.reply('Perintah ini khusus owner.');
    const args = ctx.message.text.split(' ').slice(1);
    if (args.length < 1) return ctx.reply('Format: /delprem <user_id>');

    const targetId = args[0];
    const user = getUser(db, targetId);
    user.isPremium = false;
    user.premiumExpiry = null;
    persistDB();
    ctx.reply(`Premium user ${targetId} sudah dicabut.`);
  });

  bot.command('cekuser', (ctx) => {
    if (!isOwner(ctx.from.id)) return ctx.reply('Perintah ini khusus owner.');
    const args = ctx.message.text.split(' ').slice(1);
    if (args.length < 1) return ctx.reply('Format: /cekuser <user_id>');

    const targetId = args[0];
    const user = getUser(db, targetId);
    checkAndResetLimit(user);
    persistDB();
    ctx.reply(
      `Data user ${targetId}\n` +
        `Premium   : ${user.isPremium ? 'AKTIF' : 'TIDAK'}\n` +
        `Expired   : ${user.premiumExpiry || '-'}\n` +
        `Chat hari ini: ${user.dailyCount}\n` +
        `Total chat: ${user.totalChat}`,
    );
  });

  bot.on('text', async (ctx) => {
    if (ctx.message.text.startsWith('/')) return; // command sudah ditangani di atas

    const userId = ctx.from.id;
    const user = getUser(db, userId);
    checkAndResetLimit(user);

    const ownerFlag = isOwner(userId);
    const limit = getLimitFor(user, ownerFlag);

    if (user.dailyCount >= limit) {
      persistDB();
      return ctx.reply(
        `Limit harian kamu sudah habis (${limit} chat/hari).\n` +
          `Limit akan direset otomatis besok, atau upgrade ke premium untuk limit lebih besar.`,
      );
    }

    await ctx.sendChatAction('typing');

    try {
      const { replyText } = await askAI(config, userId, ctx.message.text, stats);
      user.dailyCount += 1;
      user.totalChat += 1;
      persistDB();
      await ctx.reply(replyText);
    } catch (err) {
      console.log(chalk.red(`[ERROR AI] ${err.message}`));
      ctx.reply('Maaf, terjadi kendala saat menghubungi AI. Coba lagi beberapa saat lagi.');
    }
  });

  bot.catch((err) => {
    console.log(chalk.red(`[BOT ERROR] ${err.message}`));
  });

  bot.launch();
  console.log(chalk.green('Bot berhasil berjalan dan siap menerima pesan.\n'));

  process.once('SIGINT', () => bot.stop('SIGINT'));
  process.once('SIGTERM', () => bot.stop('SIGTERM'));
}

// ================================================================
//  ENTRY POINT
// ================================================================
(async () => {
  // Cek API key sudah diisi
  if (
    GROQ_API_KEY_1.includes('XXXXXXXX') ||
    GROQ_API_KEY_2.includes('YYYYYYYY') ||
    GROQ_API_KEY_1.includes('gsk_XXXXX') ||
    GROQ_API_KEY_2.includes('gsk_YYYYY')
  ) {
    console.clear();
    console.log(chalk.red('\n❌ ERROR: GROQ API KEY BELUM DIISI!\n'));
    console.log(chalk.yellow('LANGKAH 1: Edit file index.js'));
    console.log(chalk.yellow('LANGKAH 2: Cari line 20-21 (GROQ_API_KEY_1 & GROQ_API_KEY_2)'));
    console.log(chalk.yellow('LANGKAH 3: Ganti dengan 2 API key Groq kamu dari https://console.groq.com/keys'));
    console.log(chalk.yellow('LANGKAH 4: Simpan file & jalankan node index.js lagi\n'));
    process.exit(1);
  }

  ensureDir(path.dirname(OWNER_PATH));
  ensureDir(path.dirname(DB_PATH));
  ensureDir(HISTORY_DIR);

  let config = loadConfig();
  if (!config) {
    config = await runSetupWizard();
  }

  let ownersData = fs.existsSync(OWNER_PATH) ? readJSON(OWNER_PATH, { owners: [] }) : { owners: [] };
  if (!Array.isArray(ownersData.owners)) ownersData.owners = [];
  if (!ownersData.owners.includes(String(config.ownerId))) {
    ownersData.owners.push(String(config.ownerId));
    writeJSON(OWNER_PATH, ownersData);
  }

  startBot(config, ownersData);
})();
