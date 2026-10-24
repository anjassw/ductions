#!/usr/bin/env node
/**
 * Isi data contoh Ductions — supaya repo bisa langsung dicoba orang lain.
 *
 * Aman dijalankan berulang: baris yang sudah ada (berdasarkan ID) dilewati.
 * TIDAK menyentuh data pengguna yang sudah ada — hanya menambah.
 *
 *   node scripts/seed-demo.js
 */
'use strict';

const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const Database = require('better-sqlite3');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '..', 'data', 'ductions.db');
if (!fs.existsSync(path.dirname(DB_PATH))) fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

const now = new Date().toISOString();

function hashPassword(plain, salt) {
  return crypto.createHash('sha256').update(`${plain}::${salt}`, 'utf8').digest('hex');
}

function uid(prefix) {
  return `${prefix}-${crypto.randomUUID().slice(0, 8)}`;
}

/* Skema dibuat oleh server.js; kalau belum pernah jalan, hentikan dengan pesan jelas. */
const adaUsers = db.prepare(
  "SELECT name FROM sqlite_master WHERE type='table' AND name='users'"
).get();
if (!adaUsers) {
  console.error('Tabel belum ada. Jalankan `npm start` sekali dulu, lalu ulangi.');
  process.exit(1);
}

const jumlahUser = db.prepare('SELECT COUNT(*) c FROM users').get().c;

/* --- Akun demo (hanya bila belum ada) --------------------------------- */
if (jumlahUser === 0) {
  const ins = db.prepare(
    `INSERT INTO users (id,name,email,password_hash,salt,role,hourly_rate,avatar_url,is_active,failed_login,locked_until,created_at)
     VALUES (?,?,?,?,?,?,?,'',1,0,'',?)`
  );
  const saltAdmin = crypto.randomUUID();
  ins.run('usr-admin-1', 'Admin Demo', 'admin@example.com',
    hashPassword('admin123', saltAdmin), saltAdmin, 'admin', 150000, now);
  const saltWorker = crypto.randomUUID();
  ins.run('usr-worker-1', 'Pekerja Demo', 'worker@example.com',
    hashPassword('worker123', saltWorker), saltWorker, 'worker', 85000, now);
  console.log('  akun demo dibuat: admin@example.com / admin123, worker@example.com / worker123');
} else {
  console.log(`  ${jumlahUser} pengguna sudah ada — akun demo tidak dibuat ulang.`);
}

/* --- Proyek contoh ---------------------------------------------------- */
const proyek = [
  {
    id: 'prj-demo-1',
    name: 'Redesign Website Perusahaan',
    client_name: 'PT Contoh Sejahtera',
    client_email: 'kontak@contoh.co.id',
    description: 'Perombakan tampilan situs perusahaan: beranda, profil, dan halaman kontak.',
    color: '#3B82F6',
    start_date: '2026-01-05',
    end_date: '2026-02-28',
    status: 'Berjalan',
    progress_mode: 'count'
  },
  {
    id: 'prj-demo-2',
    name: 'Aplikasi Kasir Toko',
    client_name: 'Toko Berkah Jaya',
    client_email: 'owner@berkahjaya.id',
    description: 'Aplikasi kasir sederhana: transaksi, stok, dan laporan harian.',
    color: '#10B981',
    start_date: '2026-02-01',
    end_date: '2026-04-30',
    status: 'Berjalan',
    progress_mode: 'hours'
  },
  {
    id: 'prj-demo-3',
    name: 'Kampanye Media Sosial',
    client_name: 'Klinik Sehat Bersama',
    client_email: 'marketing@sehatbersama.id',
    description: 'Konten 30 hari untuk Instagram dan TikTok.',
    color: '#F59E0B',
    start_date: '2026-03-01',
    end_date: '2026-03-31',
    status: 'Selesai',
    progress_mode: 'count'
  }
];

const insProyek = db.prepare(
  `INSERT OR IGNORE INTO projects
   (id,name,client_name,client_email,description,color,start_date,end_date,status,progress_mode,created_by,created_at,updated_at,is_deleted)
   VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,0)`
);
for (const p of proyek) {
  insProyek.run(p.id, p.name, p.client_name, p.client_email, p.description, p.color,
    p.start_date, p.end_date, p.status, p.progress_mode, 'usr-admin-1', now, now);
}

/* --- Tugas contoh ----------------------------------------------------- */
const tugas = [
  ['prj-demo-1', 'Riset kompetitor & moodboard', 'done', 'high', '2026-01-05', '2026-01-12', 8, 1],
  ['prj-demo-1', 'Desain beranda', 'in_progress', 'high', '2026-01-12', '2026-01-26', 16, 2],
  ['prj-demo-1', 'Potong desain & serah ke developer', 'todo', 'medium', '2026-01-26', '2026-02-05', 6, 3],
  ['prj-demo-1', 'Rilis & uji produksi', 'todo', 'high', '2026-02-20', '2026-02-28', 4, 4],
  ['prj-demo-2', 'Rancang alur transaksi', 'in_progress', 'high', '2026-02-01', '2026-02-15', 12, 1]
];

const insTugas = db.prepare(
  `INSERT OR IGNORE INTO tasks
   (id,project_id,parent_id,title,description,assignee_id,start_date,due_date,priority,status,estimate_hours,sort_order,is_milestone,visible_to_client,subtasks_json,created_by,created_at,updated_at,completed_at,is_deleted)
   VALUES (?,?,'',?,'','usr-worker-1',?,?,?,?,?,?,0,1,?,?,?,?,'',0)`
);
tugas.forEach((t, idx) => {
  const [pid, judul, status, priority, mulai, selesai, jam, urutan] = t;
  const subtask = JSON.stringify([
    { id: `sub-${idx}-1`, title: 'Bagian pertama', done: true },
    { id: `sub-${idx}-2`, title: 'Bagian kedua', done: false }
  ]);
  insTugas.run(`tsk-demo-${idx + 1}`, pid, judul, mulai, selesai, priority, status, jam, urutan,
    subtask, 'usr-admin-1', now, now);
});

/* --- Share link contoh ------------------------------------------------ */
const tokenDemo = crypto.randomBytes(16).toString('hex');
db.prepare(
  `INSERT OR IGNORE INTO share_links
   (id,project_id,token,pin_hash,show_hours,show_workers,show_notes,expires_at,is_active,view_count,last_viewed_at,created_by,created_at)
   VALUES (?,?,?,'',1,1,1,'',1,0,'',?,?)`
).run('shr-demo-1', 'prj-demo-1', tokenDemo, 'usr-admin-1', now);

console.log('');
console.log('Data demo siap:');
console.log(`  ${db.prepare('SELECT COUNT(*) c FROM projects').get().c} proyek`);
console.log(`  ${db.prepare('SELECT COUNT(*) c FROM tasks').get().c} tugas`);
console.log(`  share link demo: /share/${tokenDemo}`);
console.log('');
console.log('Jalankan `npm start`, lalu buka http://localhost:3000/login.php');

db.close();
