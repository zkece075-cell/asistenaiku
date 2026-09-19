# GROQ AI BOT - Telegram Edition

Bot Telegram canggih dengan AI Groq yang dilengkapi dual API key, dual model, fallback otomatis, sistem limit premium/free/owner, riwayat obrolan tersimpan, dan statistik real-time.

---

## FITUR UTAMA

- **Dual API Key Groq** - 2 API key untuk fallback otomatis jika yang pertama error
- **Dual Model** - Model `llama-3.3-70b-versatile` & `llama-3.1-8b-instant` (bisa ganti)
- **Sistem Limit** - Free (800 chat/hari) | Premium (9000 chat/hari) | Owner (tanpa batas)
- **Riwayat Obrolan** - Setiap percakapan disimpan per user (max 20 pesan per history)
- **Statistik Bot** - Uptime, RAM, CPU, total chat, total user, jumlah premium
- **Setup Wizard** - Wizard interaktif di console saat pertama kali jalankan
- **Multi-Platform** - Bisa jalan di VPS, Termux, Pterodactyl Panel
- **Environment Variable Support** - Dukungan deploy via panel (BOT_TOKEN, OWNER_ID, AI_NAME, AI_PROMPT)

---

## REQUIREMENT

- **Node.js** v16.0.0 atau lebih baru
- **Telegram Bot Token** (buat di [@BotFather](https://t.me/botfather))
- **2x Groq API Key** (gratis dari [console.groq.com](https://console.groq.com/keys))

---

## INSTALASI

### Opsi 1: VPS / Localhost

```bash
# Clone atau download project
git clone https://github.com/zkece075-cell/asistenaiku
cd asistenaiku 

# Install dependencies
npm install

# Jalankan bot
node index.js
```

Saat pertama kali dijalankan, bot akan meminta:
- **Token Bot Telegram** - Dapatkan dari [@BotFather](https://t.me/botfather)
- **ID Owner** - User ID Telegram kamu (cek dengan [@userinfobot](https://t.me/userinfobot))
- **Nama AI** - Nama bot/AI yang kamu inginkan
- **Prompt AI** - Instruksi/karakter AI (bisa kosong untuk pakai default)

### Opsi 2: Termux

```bash
# Update & install Node.js (jika belum ada)
apt update && apt upgrade
apt install nodejs

# Clone repository
git clone https://github.com/zkece075-cell/asistenaiku
cd asistenaiku

# Install dependencies
npm install

# Jalankan bot
node index.js
```

Lihat `tutorialtermux.md` untuk panduan lengkap Termux.

### Opsi 3: Pterodactyl Panel / Deployment Panel

1. Upload semua file ke panel (atau clone via Git)
2. Edit `index.js` dan isi 2 Groq API Key
3. Jalankan `npm install && npm start`
4. Ikuti wizard di console panel untuk input token bot, owner ID, dll

---

## SETUP API KEY GROQ

**PENTING: Isi API key SEBELUM jalankan bot!**

### Langkah 1: Dapatkan 2 Groq API Key

1. Buka https://console.groq.com/keys
2. Login dengan akun Groq (daftar gratis jika belum)
3. Klik **"Create API Key"** (buat 2 kali untuk 2 key)
4. Copy kedua API key

### Langkah 2: Edit `index.js`

Buka file `index.js` dengan text editor, cari bagian ini (sekitar line 20-21):

```javascript
const GROQ_API_KEY_1 = 'gsk_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX'; // <- Ganti ini
const GROQ_API_KEY_2 = 'gsk_YYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYY'; // <- Ganti ini juga
```

Ganti `gsk_XXX...` dan `gsk_YYY...` dengan 2 API key Groq kamu yang sudah di-copy.

**Contoh:**
```javascript
const GROQ_API_KEY_1 = 'gsk_n123456789abcdefghijklmnopqrstuvwxyz';
const GROQ_API_KEY_2 = 'gsk_m987654321zyxwvutsrqponmlkjihgfedcba';
```

**PENTING:** Jangan share API key kamu ke orang lain!

---

## PERINTAH BOT

Setelah bot running, gunakan perintah berikut:

| Perintah | Deskripsi | Contoh |
|----------|-----------|--------|
| `/start` | Mulai bot & lihat bantuan | `/start` |
| `/stats` | Lihat statistik bot (uptime, RAM, CPU, user) | `/stats` |
| `/premium` | Cek status & limit premium kamu | `/premium` |
| `/reset` | Hapus riwayat obrolan kamu | `/reset` |
| `/addprem` | **[OWNER ONLY]** Berikan premium ke user | `/addprem 123456 30` (30 hari) |
| `/delprem` | **[OWNER ONLY]** Cabut premium user | `/delprem 123456` |
| `/cekuser` | **[OWNER ONLY]** Cek data user | `/cekuser 123456` |

**Pesan biasa (bukan command)** → Bot akan merespon dengan AI Groq.

---

## STRUKTUR FILE & FOLDER

```
groq-ai-bot/
├── index.js                  # File utama bot
├── package.json              # Dependencies
├── README.md                 # Dokumentasi ini
├── tutorialtermux.md         # Panduan Termux
├── config.json               # Config bot (auto-generate)
├── owners/
│   └── ownerid.json          # Daftar owner (auto-generate)
└── database/
    ├── users.json            # Database user & limit (auto-generate)
    └── history/
        ├── 123456789.json    # Riwayat chat user (auto-generate)
        └── 987654321.json    # Riwayat chat user (auto-generate)
```

---

## SISTEM LIMIT & PREMIUM

### Limit Harian

- **Free User** - 800 chat/hari
- **Premium User** - 9000 chat/hari
- **Owner** - Tanpa batas (unlimited)

Limit direset otomatis setiap hari pukul 00:00 UTC.

### Manajemen Premium (Owner Only)

```bash
# Berikan premium 30 hari ke user 123456
/addprem 123456 30

# Cabut premium user 123456
/delprem 123456

# Cek data user (termasuk status premium & limit hari ini)
/cekuser 123456
```

---

## RIWAYAT OBROLAN

Setiap percakapan user disimpan otomatis di folder `database/history/`.

- **Lokasi:** `database/history/{user_id}.json`
- **Max History:** 20 pesan (user + AI) per user
- **Reset:** Gunakan `/reset` untuk menghapus riwayat kamu

Riwayat ini memungkinkan AI memahami konteks percakapan sebelumnya.

---

## STATISTIK BOT (Real-Time)

Gunakan `/stats` untuk melihat:

- **Total Chat Diproses** - Jumlah pesan yang sudah diproses AI
- **Total User Terdaftar** - Jumlah user yang sudah chat dengan bot
- **Total User Premium** - Jumlah user dengan status premium aktif
- **Uptime** - Berapa lama bot berjalan
- **Penggunaan RAM** - Memory yang terpakai (MB)
- **Penggunaan CPU** - Persentase CPU yang terpakai (%)
- **Model Aktif** - Model Groq yang sedang digunakan

---

## FALLBACK OTOMATIS

Bot dilengkapi fallback otomatis untuk kedua Groq API:

1. **Request ke Groq API #1 (Model: llama-3.3-70b-versatile)**
2. **Jika gagal** → Coba Groq API #2 (Model: llama-3.1-8b-instant)
3. **Jika kedua gagal** → Kirim pesan error ke user

Log error akan ditampilkan di console dengan warna merah.

---

## BUTTON STYLE (No Emoji)

Saat ini bot hanya menggunakan text reply. Jika ingin menambah inline button, bisa pakai style:

- **danger** - Tombol merah (Telegram native)
- **primary** - Tombol biru (Telegram native)
- **success** - Tombol hijau (Telegram native)
- **secondary** - Tombol abu-abu (Telegram native)

Contoh implementasi:

```javascript
ctx.reply('Pilih aksi:', {
  reply_markup: {
    inline_keyboard: [
      [{ text: 'Hapus Riwayat', callback_data: 'reset', style: 'danger' }],
      [{ text: 'Cek Premium', callback_data: 'premium', style: 'primary' }],
    ],
  },
});
```

---



## TROUBLESHOOT

### Bot tidak merespon

- Cek **Token Bot Telegram** di `config.json` (pastikan valid)
- Cek **Groq API Key** di `index.js` (pastikan tidak kosong & valid)
- Cek **Koneksi Internet** (Groq perlu internet stabil)
- Lihat **console log** untuk error message lebih detail

### Limit sudah habis

- Tunggu hingga hari berikutnya (limit reset pukul 00:00 UTC)
- Minta owner untuk `/addprem` kamu

### Riwayat obrolan tidak tersimpan

- Cek folder `database/history/` sudah ada atau belum
- Cek permission folder (harus writable)
- Cek disk space (pastikan cukup)

### Model Groq tidak ditemukan

- Cek model name di `index.js` (ganti dengan model yang valid)
- Cek daftar model terbaru di https://console.groq.com/docs/models

---

## DEVELOPMENT & KONTRIBUSI

Silakan fork & pull request untuk improvement:

1. Fork repository
2. Buat branch fitur (`git checkout -b feature/nama-fitur`)
3. Commit changes (`git commit -m 'Add fitur baru'`)
4. Push ke branch (`git push origin feature/nama-fitur`)
5. Buat Pull Request

---

## LICENSE

MIT License - Bebas digunakan untuk keperluan apapun.

---

## CREDIT

- **Apit** - https://telegram.me/apitaja1
- **Telegraf** - Telegram Bot Framework untuk Node.js
- **Chalk & Figlet** - Styling & ASCII art

---

## DUKUNGAN

Punya pertanyaan atau issue? Buka **GitHub Issues** atau hubungi owner bot kamu.

**Selamat menikmati bot Groq AI kamu!** 🚀

# asistenaiku
