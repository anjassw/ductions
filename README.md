# Ductions

**Lightweight Work Management System for Freelancers & Agencies**

Aplikasi manajemen pekerjaan ringan: **timeline Gantt**, daftar tugas, pencatatan jam kerja (timesheet), dan **portal berbagi progres untuk klien** lewat satu tautan.

Dibangun dengan **Express + SQLite** — tanpa database server, tanpa build step, tanpa framework frontend. Cukup Node.js.

## Kenapa Ductions

- **Ringan** — satu proses Node, satu file `.db`. Jalan di VPS 512 MB.
- **Tanpa build** — frontend HTML/CSS/JS biasa. Ubah file, refresh, selesai.
- **Portal klien** — kirim satu URL, klien lihat progres tanpa perlu akun.
- **Timesheet bawaan** — catat jam kerja per tugas, otomatis masuk laporan.
- **Mode gelap** — tema terang/gelap, tersimpan per perangkat.

## Fitur

| Fitur | Keterangan |
| --- | --- |
| Timeline | Tampilan Gantt + daftar, geser tanggal tugas langsung dari kalender |
| To Do | Papan tugas per status, dengan sub-tugas (checklist) |
| Timesheet | Timer start/stop di header, tersedia di semua halaman |
| Proyek | Klien, warna, rentang tanggal, mode progres (jumlah tugas / jam) |
| Pengguna | Peran Admin & Pekerja, tarif per jam, reset sandi |
| Share Link | Portal publik per proyek, opsi tampilkan jam/pekerja/catatan |
| Log Aktivitas | Jejak audit perubahan data |

## Menjalankan

Butuh **Node.js 20+**.

```bash
git clone <url-repo-ini>
cd ductions
npm install
npm start
```

Buka <http://localhost:3000/login.php>

Saat database masih kosong, akun awal dibuat otomatis:

| Peran | Email | Password |
| --- | --- | --- |
| Admin | `admin@example.com` | `admin123` |
| Pekerja | `worker@example.com` | `worker123` |

> **Ganti password setelah login pertama.**

Mau data contoh (3 proyek, 5 tugas, 1 share link)?

```bash
npm run seed:demo
```

## Konfigurasi

Semua opsional — ada nilai default.

| Variabel | Default | Keterangan |
| --- | --- | --- |
| `PORT` | `3000` | Port HTTP |
| `HOST` | `0.0.0.0` | Interface binding |
| `DB_PATH` | `./data/ductions.db` | Lokasi file SQLite |

Salin `.env.example` menjadi `.env`, atau set lewat environment langsung.

## Struktur proyek

```
server.js              Backend: skema DB, API, dan static server
scripts/seed-demo.js   Pengisi data contoh
data/                  File SQLite (dibuat otomatis, tidak masuk git)
public/
  login.php            Halaman masuk
  app/                 Halaman aplikasi (dashboard, timeline, to do, timesheet, proyek, pengguna)
  share/index.php      Portal publik untuk klien
  assets/
    api.js             Lapisan pemanggil API
    app.js             Logika antarmuka
    core.js            Utilitas bersama
    tema.js            Pengalih mode gelap
    boot.js            Inisialisasi
    app.css            Gaya (Tailwind hasil build + komponen)
```

## Cara kerja singkat

- **Autentikasi** — login mengembalikan token sesi (berlaku 8 jam) yang dikirim lewat header `X-Ductions-Token`.
- **Hash sandi** — SHA-256 dari `"sandi::salt"`, salt acak per pengguna.
- **Progres proyek** — dihitung dari tugas berstatus selesai, atau dari jam tercatat bila `progress_mode = hours`.
- **Share link** — token acak 32 karakter, opsional PIN, opsional tanggal kedaluwarsa.

## Keamanan

Repo ini menyertakan `.gitignore` yang menolak `data/`, `.env`, dan file backup. **Jangan pernah commit database atau kredensial.**

Untuk produksi:

1. Ganti sandi akun bawaan.
2. Jalankan di belakang reverse proxy (Nginx/Apache) dengan HTTPS.
3. Batasi akses port aplikasi dari luar.
4. Backup `data/ductions.db` secara berkala (file SQLite aman disalin saat mode WAL aktif, gunakan `.backup` untuk konsistensi).

## Lisensi

[MIT](LICENSE) — bebas dipakai, diubah, dan dijual. Atribusi dihargai, tidak diwajibkan.

## Kredit

Dibuat oleh **[Anjas S](https://github.com/anjassw)**.

Kalau proyek ini berguna, tinggalkan bintang di repo — itu membantu.
