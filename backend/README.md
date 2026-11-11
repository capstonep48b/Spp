Backend Midtrans Payment Gateway (Sandbox & Production)

Seluruh alamat API, mode (Sandbox / Production), endpoint backend, serta konfigurasi Supabase dikendalikan terpusat dari file `.env` (atau `.env.local` dan `backend/.dev.vars` untuk menyimpan kunci rahasia secara lokal tanpa ikut ter-commit ke Git).

## 1. Struktur File Backend (SOP Modular)
- [`backend/config/env.js`](config/env.js) — Parser `.env`, resolver konfigurasi URL API Midtrans & Supabase, serta generator `env.js` aman tanpa kebocoran kunci rahasia.
- [`backend/utils/crypto.js`](utils/crypto.js) — Utilitas kriptografi SHA-512, constant-time comparison, dan Base64 UTF-8.
- [`backend/utils/midtrans.js`](utils/midtrans.js) — Mapping status transaksi Midtrans, label metode bayar, helper CORS, dan format respons JSON.
- [`backend/services/supabaseService.js`](services/supabaseService.js) — Operasi Supabase REST API (lookup settings & sinkronisasi status transaksi / tunggakan).
- [`backend/services/midtransService.js`](services/midtransService.js) — Layanan integrasi Midtrans Snap API (pembuatan transaksi) & Core API (pengecekan status).
- [`backend/routes/apiRouter.js`](routes/apiRouter.js) — Router endpoint `/api/health`, `/api/midtrans/config`, `/api/midtrans/create-transaction`, `/api/midtrans/status`, dan `/api/midtrans/webhook`.
- [`backend/midtrans-core.js`](midtrans-core.js) — Barrel module kompatibilitas yang menggabungkan modul backend untuk Node.js & Cloudflare Workers.
- [`server.js`](../server.js) — Server lokal Node.js (`npm start`) yang otomatis memuat `.env` & `.env.local`, menyajikan `/env.js`, serta melayani seluruh endpoint `/api/...`.
- [`backend/cloudflare-worker.mjs`](cloudflare-worker.mjs) — Entry point serverless Cloudflare Worker siap deploy untuk domain live (`https://e-sppsetiabhakti.my.id`).

## 2. Cara Testing Lokal (Midtrans Sandbox)
1. Pastikan file `.env.local` (dan `backend/.dev.vars` jika menjalankan Wrangler) sudah terisi kunci Sandbox asli dari Dashboard Midtrans (`Settings -> Access Keys`):
   ```env
   MIDTRANS_IS_PRODUCTION=false
   MIDTRANS_CLIENT_KEY=SB-Mid-client-YOUR_SANDBOX_CLIENT_KEY
   MIDTRANS_SERVER_KEY=SB-Mid-server-YOUR_SANDBOX_SERVER_KEY
   ```
2. Jalankan backend + frontend lokal:
   ```bash
   npm start
   ```
3. Uji health endpoint: `http://localhost:3000/api/health` dan `http://localhost:3000/api/midtrans/config`.

## 3. Deploy Backend Live (Cloudflare Worker)
```bash
cd backend
cp wrangler.example.toml wrangler.toml
npx wrangler secret put MIDTRANS_SERVER_KEY
npx wrangler deploy
```
Setelah mendapat URL Worker (mis. `https://aplikasi-spp-midtrans-api.<user>.workers.dev`), isi ke `.env` (`BACKEND_API_URL=...`), jalankan `npm run build`, lalu deploy frontend.

## 4. Pengaturan Webhook di Dashboard Midtrans Sandbox
- Notification URL: `<BACKEND_API_URL>/api/midtrans/webhook`
- Untuk testing di `localhost:3000` tanpa tunnel/ngrok, frontend otomatis memanggil `GET /api/midtrans/status?order_id=...` setelah popup Snap selesai.
