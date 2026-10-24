/**
 * Ductions — Backend Express + SQLite
 *
 * Zona waktu: Asia/Jakarta (WIB)
 * Sesi: 8 jam, token 32+ karakter
 */
'use strict';

const express = require('express');
const Database = require('better-sqlite3');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs');

/* Muat .env bila ada — tanpa dependensi tambahan. */
function muatEnv() {
  const berkas = path.join(__dirname, '.env');
  if (!fs.existsSync(berkas)) return;
  for (const baris of fs.readFileSync(berkas, 'utf8').split('\n')) {
    const isi = baris.trim();
    if (!isi || isi.startsWith('#')) continue;
    const pisah = isi.indexOf('=');
    if (pisah < 1) continue;
    const kunci = isi.slice(0, pisah).trim();
    let nilai = isi.slice(pisah + 1).trim();
    if ((nilai.startsWith('"') && nilai.endsWith('"')) ||
        (nilai.startsWith("'") && nilai.endsWith("'"))) nilai = nilai.slice(1, -1);
    if (process.env[kunci] === undefined) process.env[kunci] = nilai;
  }
}
muatEnv();

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';
const SESSION_DURATION_HOURS = 8;
const MAX_FAILED_LOGIN = 5;
const LOCK_MINUTES = 15;

/* ==========================================================================
   0. DATABASE — skema 8 tabel setara 8 sheet
   ========================================================================== */

const DATA_DIR = path.join(__dirname, 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const DB_PATH = process.env.DB_PATH || path.join(DATA_DIR, 'ductions.db');
const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  salt TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'worker',
  hourly_rate REAL DEFAULT 0,
  avatar_url TEXT DEFAULT '',
  is_active INTEGER DEFAULT 1,
  failed_login INTEGER DEFAULT 0,
  locked_until TEXT DEFAULT '',
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
  token TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  role TEXT NOT NULL,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  client_name TEXT DEFAULT '',
  client_email TEXT DEFAULT '',
  description TEXT DEFAULT '',
  color TEXT DEFAULT '#FFDE00',
  start_date TEXT DEFAULT '',
  end_date TEXT DEFAULT '',
  status TEXT DEFAULT 'Berjalan',
  progress_mode TEXT DEFAULT 'count',
  created_by TEXT DEFAULT '',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  is_deleted INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  parent_id TEXT DEFAULT '',
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  assignee_id TEXT DEFAULT '',
  start_date TEXT DEFAULT '',
  due_date TEXT DEFAULT '',
  priority TEXT DEFAULT 'medium',
  status TEXT DEFAULT 'todo',
  estimate_hours REAL DEFAULT 2,
  sort_order INTEGER DEFAULT 1,
  is_milestone INTEGER DEFAULT 0,
  visible_to_client INTEGER DEFAULT 1,
  subtasks_json TEXT DEFAULT '[]',
  created_by TEXT DEFAULT '',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  completed_at TEXT DEFAULT '',
  is_deleted INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS time_logs (
  id TEXT PRIMARY KEY,
  task_id TEXT DEFAULT '',
  project_id TEXT DEFAULT '',
  user_id TEXT NOT NULL,
  start_time TEXT NOT NULL,
  end_time TEXT DEFAULT '',
  duration_minutes REAL DEFAULT 0,
  is_manual INTEGER DEFAULT 0,
  note TEXT DEFAULT '',
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS share_links (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  token TEXT NOT NULL UNIQUE,
  pin_hash TEXT DEFAULT '',
  show_hours INTEGER DEFAULT 0,
  show_workers INTEGER DEFAULT 0,
  show_notes INTEGER DEFAULT 0,
  expires_at TEXT DEFAULT '',
  is_active INTEGER DEFAULT 1,
  view_count INTEGER DEFAULT 0,
  last_viewed_at TEXT DEFAULT '',
  created_by TEXT DEFAULT '',
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS comments (
  id TEXT PRIMARY KEY,
  task_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  body TEXT NOT NULL,
  attachment_url TEXT DEFAULT '',
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS activity_log (
  id TEXT PRIMARY KEY,
  user_id TEXT DEFAULT '',
  entity TEXT DEFAULT '',
  entity_id TEXT DEFAULT '',
  action TEXT DEFAULT '',
  detail_json TEXT DEFAULT '{}',
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_tasks_project ON tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assignee ON tasks(assignee_id);
CREATE INDEX IF NOT EXISTS idx_logs_user ON time_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
`);

/* ==========================================================================
   1. UTILITAS
   ========================================================================== */

/** Waktu ISO dengan offset +07:00, sama seperti getIsoNow_() di Apps Script. */
function isoNow(d = new Date()) {
  const wib = new Date(d.getTime() + 7 * 3600000);
  const p = (n, w = 2) => String(n).padStart(w, '0');
  return `${wib.getUTCFullYear()}-${p(wib.getUTCMonth() + 1)}-${p(wib.getUTCDate())}` +
    `T${p(wib.getUTCHours())}:${p(wib.getUTCMinutes())}:${p(wib.getUTCSeconds())}+07:00`;
}

/** SHA-256 dari "password::salt", identik dengan hashPassword_() Apps Script. */
function hashPassword(plain, salt) {
  return crypto.createHash('sha256').update(`${plain}::${salt}`, 'utf8').digest('hex');
}

function token32() {
  return crypto.randomBytes(24).toString('hex').substring(0, 32);
}

function uuidShort() {
  return crypto.randomUUID().replace(/-/g, '').substring(0, 8);
}

/** true hanya untuk 1 / '1' / true — mencegah bug "0" truthy di JS. */
function flag(v) {
  return v === 1 || v === '1' || v === true;
}

function logActivity(userId, entity, entityId, action, detail = {}) {
  db.prepare(
    `INSERT INTO activity_log (id,user_id,entity,entity_id,action,detail_json,created_at)
     VALUES (?,?,?,?,?,?,?)`
  ).run(crypto.randomUUID(), userId || '', entity, entityId, action, JSON.stringify(detail), isoNow());
}

/* ==========================================================================
   2. AUTENTIKASI
   ========================================================================== */

class ApiError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
}

/** Validasi token sesi + peran. Ekuivalen requireAuth_() di Apps Script. */
function requireAuth(token, allowedRoles) {
  if (!token) throw new ApiError('Token sesi tidak ditemukan. Silakan login kembali.', 401);

  const session = db.prepare(
    'SELECT * FROM sessions WHERE token = ? AND expires_at > ?'
  ).get(token, isoNow());

  if (!session) throw new ApiError('Sesi telah berakhir (8 jam) atau tidak valid. Silakan login ulang.', 401);

  const user = db.prepare('SELECT * FROM users WHERE id = ? AND is_active = 1').get(session.user_id);
  if (!user) throw new ApiError('Akun pengguna tidak aktif.', 401);

  if (allowedRoles && allowedRoles.length && !allowedRoles.includes(user.role)) {
    throw new ApiError('Akses ditolak: Peran Anda tidak diizinkan untuk aksi ini.', 403);
  }
  return user;
}

function publicUser(u) {
  return {
    id: u.id, name: u.name, email: u.email, role: u.role,
    hourly_rate: u.hourly_rate, is_active: flag(u.is_active),
    failed_login: u.failed_login
  };
}

/* ==========================================================================
   3. SEED — akun admin & pekerja awal (setara setupDatabase())
   ========================================================================== */

function seed() {
  const count = db.prepare('SELECT COUNT(*) c FROM users').get().c;
  if (count > 0) return;

  const now = isoNow();
  const ins = db.prepare(
    `INSERT INTO users (id,name,email,password_hash,salt,role,hourly_rate,avatar_url,is_active,failed_login,locked_until,created_at)
     VALUES (?,?,?,?,?,?,?,'',1,0,'',?)`
  );

  const adminSalt = crypto.randomUUID();
  ins.run('usr-admin-1', 'Admin Demo', 'admin@example.com',
    hashPassword('admin123', adminSalt), adminSalt, 'admin', 150000, now);

  const workerSalt = crypto.randomUUID();
  ins.run('usr-worker-1', 'Pekerja Demo', 'worker@example.com',
    hashPassword('worker123', workerSalt), workerSalt, 'worker', 85000, now);

  console.log('[seed] akun awal dibuat: admin@example.com / admin123');
}

/* ==========================================================================
   4. HANDLER API — 1:1 dengan fungsi backend.js
   ========================================================================== */

const api = {};

/* --- FR-1: login ------------------------------------------------------- */
api.login = (token, email, password) => {
  const user = db.prepare('SELECT * FROM users WHERE lower(email) = lower(?)').get(String(email || ''));
  if (!user) throw new ApiError('Email tidak terdaftar.');
  if (!flag(user.is_active)) throw new ApiError('Akun telah dinonaktifkan oleh Admin.');

  if (user.locked_until && new Date(user.locked_until) > new Date()) {
    throw new ApiError('Akun terkunci selama 15 menit karena 5x gagal login.', 423);
  }

  if (hashPassword(password, user.salt) !== user.password_hash) {
    const failCount = (Number(user.failed_login) || 0) + 1;
    if (failCount >= MAX_FAILED_LOGIN) {
      const lockUntil = isoNow(new Date(Date.now() + LOCK_MINUTES * 60000));
      db.prepare('UPDATE users SET failed_login=?, locked_until=? WHERE id=?').run(failCount, lockUntil, user.id);
      throw new ApiError('Gagal login 5 kali! Akun dikunci selama 15 menit (FR-1.6).', 423);
    }
    db.prepare('UPDATE users SET failed_login=? WHERE id=?').run(failCount, user.id);
    throw new ApiError(`Password salah! Percobaan gagal ke-${failCount} dari 5.`, 401);
  }

  db.prepare('UPDATE users SET failed_login=0, locked_until=? WHERE id=?').run('', user.id);

  const sessionToken = crypto.randomUUID() + '-' + crypto.randomUUID();
  const createdAt = isoNow();
  const expiresAt = isoNow(new Date(Date.now() + SESSION_DURATION_HOURS * 3600000));
  db.prepare('INSERT INTO sessions (token,user_id,role,created_at,expires_at) VALUES (?,?,?,?,?)')
    .run(sessionToken, user.id, user.role, createdAt, expiresAt);

  return {
    token: sessionToken,
    user: { id: user.id, name: user.name, email: user.email, role: user.role, hourly_rate: user.hourly_rate }
  };
};

/* --- Bootstrap --------------------------------------------------------- */
api.getBootstrapData = (token) => {
  requireAuth(token, ['admin', 'worker']);

  const users = db.prepare('SELECT * FROM users').all().map(publicUser);
  const projects = db.prepare('SELECT * FROM projects WHERE is_deleted = 0').all();
  const tasks = db.prepare('SELECT * FROM tasks WHERE is_deleted = 0').all().map(t => ({
    ...t,
    subtasks: t.subtasks_json ? JSON.parse(t.subtasks_json) : []
  }));
  const timeLogs = db.prepare('SELECT * FROM time_logs').all();
  const shareLinks = db.prepare('SELECT * FROM share_links').all();
  const comments = db.prepare('SELECT * FROM comments').all();

  return { users, projects, tasks, timeLogs, shareLinks, comments };
};

/* --- FR-2: proyek ------------------------------------------------------ */
api.createProject = (token, payload) => {
  const user = requireAuth(token, ['admin']);
  const id = 'prj-' + uuidShort();
  const now = isoNow();

  db.prepare(
    `INSERT INTO projects (id,name,client_name,client_email,description,color,start_date,end_date,status,progress_mode,created_by,created_at,updated_at,is_deleted)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,0)`
  ).run(id, payload.name, payload.client_name || '', payload.client_email || '',
    payload.description || '', payload.color || '#FFDE00',
    payload.start_date || '', payload.end_date || '', payload.status || 'Berjalan',
    payload.progress_mode || 'count', user.id, now, now);

  logActivity(user.id, 'project', id, 'create', { name: payload.name });
  return { id };
};

api.updateProject = (token, payload) => {
  const user = requireAuth(token, ['admin']);
  const p = db.prepare('SELECT * FROM projects WHERE id = ? AND is_deleted = 0').get(payload.id);
  if (!p) throw new ApiError('Proyek tidak ditemukan.', 404);

  db.prepare(
    `UPDATE projects SET name=?, client_name=?, client_email=?, description=?, color=?,
     start_date=?, end_date=?, status=?, progress_mode=?, updated_at=? WHERE id=?`
  ).run(payload.name, payload.client_name || '', payload.client_email || p.client_email || '',
    payload.description || '', payload.color || '#FFDE00', payload.start_date || '',
    payload.end_date || '', payload.status || 'Berjalan', payload.progress_mode || 'count',
    isoNow(), p.id);

  logActivity(user.id, 'project', p.id, 'update', { name: payload.name });
  return { id: p.id };
};

api.deleteProject = (token, projectId) => {
  const user = requireAuth(token, ['admin']);
  const p = db.prepare('SELECT * FROM projects WHERE id = ?').get(projectId);
  if (!p) throw new ApiError('Proyek tidak ditemukan.', 404);

  const now = isoNow();
  const tx = db.transaction(() => {
    db.prepare('UPDATE projects SET updated_at=?, is_deleted=1 WHERE id=?').run(now, projectId);
    db.prepare('UPDATE tasks SET updated_at=?, is_deleted=1 WHERE project_id=? AND is_deleted=0').run(now, projectId);
  });
  tx();

  logActivity(user.id, 'project', projectId, 'soft_delete', { name: p.name });
  return { id: projectId };
};

/* --- FR-3: tugas ------------------------------------------------------- */
api.createTask = (token, payload) => {
  const user = requireAuth(token, ['admin', 'worker']);
  const id = 'tsk-' + uuidShort();
  const now = isoNow();

  // Checklist awal (opsional) — disimpan sebagai JSON.
  const subsAwal = Array.isArray(payload.subtasks)
    ? payload.subtasks
        .filter(s => s && String(s.title || '').trim())
        .map(s => ({ id: s.id || 'sub-' + uuidShort(), title: String(s.title).trim(), done: !!s.done }))
    : [];

  db.prepare(
    `INSERT INTO tasks (id,project_id,parent_id,title,description,assignee_id,start_date,due_date,
     priority,status,estimate_hours,sort_order,is_milestone,visible_to_client,subtasks_json,
     created_by,created_at,updated_at,completed_at,is_deleted)
     VALUES (?,?,?,?,?,?,?,?,?,'todo',?,1,?,?,?,?,?,?,'',0)`
  ).run(id, payload.project_id, payload.parent_id || '', payload.title,
    payload.description || '', payload.assignee_id || user.id,
    payload.start_date || '', payload.due_date || '', payload.priority || 'medium',
    Number(payload.estimate_hours) || 2,
    payload.is_milestone ? 1 : 0,
    payload.visible_to_client === false ? 0 : 1,
    JSON.stringify(subsAwal),
    user.id, now, now);

  logActivity(user.id, 'task', id, 'create', { title: payload.title });
  return { id };
};

api.updateTask = (token, payload) => {
  const user = requireAuth(token, ['admin', 'worker']);
  const t = db.prepare('SELECT * FROM tasks WHERE id = ? AND is_deleted = 0').get(payload.id);
  if (!t) throw new ApiError('Tugas tidak ditemukan.', 404);

  if (user.role === 'worker' && t.assignee_id !== user.id) {
    throw new ApiError('Pekerja hanya dapat mengubah tugas miliknya sendiri.', 403);
  }
  if (payload.status && user.role === 'worker' && payload.status === 'done') {
    throw new ApiError('Pekerja hanya dapat memindahkan status sampai Review (FR-3.2).', 403);
  }

  // Checklist: hanya ditulis bila payload menyertakannya, agar
  // update parsial (ganti tanggal/status) tidak menghapus checklist.
  let subsJson = null;
  if (Array.isArray(payload.subtasks)) {
    const bersih = payload.subtasks
      .filter(s => s && String(s.title || '').trim())
      .map(s => ({ id: s.id || 'sub-' + uuidShort(), title: String(s.title).trim(), done: !!s.done }));
    subsJson = JSON.stringify(bersih);
  }

  db.prepare(
    `UPDATE tasks SET project_id=?, title=?, description=?, assignee_id=?, start_date=?,
     due_date=?, priority=?, status=?, estimate_hours=?, is_milestone=?, visible_to_client=?,
     subtasks_json=COALESCE(?, subtasks_json), updated_at=? WHERE id=?`
  ).run(
    payload.project_id || t.project_id, payload.title || t.title,
    payload.description || '', payload.assignee_id || t.assignee_id,
    payload.start_date || t.start_date, payload.due_date || t.due_date,
    payload.priority || 'medium', payload.status || t.status,
    Number(payload.estimate_hours) || 2,
    payload.is_milestone ? 1 : 0,
    payload.visible_to_client === false ? 0 : 1,
    subsJson,
    isoNow(), t.id);

  logActivity(user.id, 'task', t.id, 'update', { title: payload.title });
  return { id: t.id };
};

api.deleteTask = (token, taskId) => {
  const user = requireAuth(token, ['admin', 'worker']);
  const t = db.prepare('SELECT * FROM tasks WHERE id = ?').get(taskId);
  if (!t) throw new ApiError('Tugas tidak ditemukan.', 404);

  if (user.role === 'worker' && t.assignee_id !== user.id) {
    throw new ApiError('Pekerja hanya dapat menghapus tugas miliknya sendiri.', 403);
  }

  db.prepare('UPDATE tasks SET updated_at=?, is_deleted=1 WHERE id=?').run(isoNow(), taskId);
  logActivity(user.id, 'task', taskId, 'soft_delete', { title: t.title });
  return { id: taskId };
};

/* Hapus satu sub-tugas (checklist) dari sebuah tugas. */
api.deleteSubtask = (token, payload) => {
  const user = requireAuth(token, ['admin', 'worker']);
  /* callServer mengirim {payload: {...}} untuk argumen bernama 'payload',
     sedangkan pemanggil langsung mengirim {taskId, subtaskId}. Terima keduanya. */
  const p = (payload && payload.payload) ? payload.payload : (payload || {});
  const taskId = p.taskId;
  const subtaskId = p.subtaskId;
  const t = db.prepare('SELECT * FROM tasks WHERE id = ? AND is_deleted = 0').get(taskId);
  if (!t) throw new ApiError('Tugas tidak ditemukan.', 404);

  if (user.role === 'worker' && t.assignee_id !== user.id) {
    throw new ApiError('Pekerja hanya dapat mengubah tugas miliknya sendiri.', 403);
  }

  let subs = [];
  try { subs = t.subtasks_json ? JSON.parse(t.subtasks_json) : []; } catch (e) { subs = []; }
  const jumlahAwal = subs.length;
  subs = subs.filter(s => s && s.id !== subtaskId);

  if (subs.length === jumlahAwal) {
    throw new ApiError('Sub-tugas tidak ditemukan.', 404);
  }

  db.prepare('UPDATE tasks SET subtasks_json=?, updated_at=? WHERE id=?')
    .run(JSON.stringify(subs), isoNow(), taskId);

  logActivity(user.id, 'task', taskId, 'delete_subtask', { subtaskId });
  return { taskId, subtasks: subs };
};

/* Buat pengguna baru. Tanpa ini, pengguna hanya hidup di memori browser
   dan hilang begitu halaman di-refresh. */
api.createUser = (token, payload) => {
  const user = requireAuth(token, ['admin']);
  const p = payload || {};
  if (!p.name && p.payload) return api.createUser(token, p.payload);

  const nama = String(p.name || '').trim();
  const email = String(p.email || '').trim().toLowerCase();
  const sandi = String(p.password || '');
  const role = ['admin', 'worker'].includes(p.role) ? p.role : 'worker';

  if (!nama) throw new ApiError('Nama pengguna wajib diisi.', 400);
  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    throw new ApiError('Alamat email tidak valid.', 400);
  }
  if (sandi.length < 6) throw new ApiError('Password minimal 6 karakter.', 400);

  const sudahAda = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (sudahAda) throw new ApiError('Email sudah dipakai pengguna lain.', 409);

  const id = 'usr-' + uuidShort();
  const salt = uuidShort();
  const hash = hashPassword(sandi, salt);

  db.prepare(
    `INSERT INTO users (id, name, email, password_hash, salt, role, hourly_rate, avatar_url, is_active, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, '', 1, ?)`
  ).run(id, nama, email, hash, salt, role, Number(p.hourly_rate) || 0, isoNow());

  logActivity(user.id, 'user', id, 'create', { name: nama, role });
  return { id, name: nama, email, role, hourly_rate: Number(p.hourly_rate) || 0, is_active: 1 };
};

/* Hapus pengguna (soft delete). Tidak boleh menghapus diri sendiri,
   dan tidak boleh menyisakan nol admin aktif. */
api.deleteUser = (token, userId) => {
  const user = requireAuth(token, ['admin']);

  if (userId === user.id) {
    throw new ApiError('Anda tidak dapat menghapus akun Anda sendiri.', 400);
  }

  const target = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
  if (!target) throw new ApiError('Pengguna tidak ditemukan.', 404);

  if (target.role === 'admin') {
    const adminAktif = db.prepare(
      "SELECT COUNT(*) AS n FROM users WHERE role='admin' AND is_active=1 AND id<>?"
    ).get(userId).n;
    if (adminAktif < 1) {
      throw new ApiError('Tidak dapat menghapus admin terakhir.', 400);
    }
  }

  /* Hapus permanen. Tombolnya berlabel "Hapus", jadi baris harus benar-benar
     hilang dari daftar — soft delete membuat pengguna tetap tampil dan
     membingungkan admin. */
  const jumlahTugas = db.prepare('SELECT COUNT(*) AS n FROM tasks WHERE assignee_id = ?').get(userId).n;
  db.prepare('UPDATE tasks SET assignee_id = NULL WHERE assignee_id = ?').run(userId);
  db.prepare('DELETE FROM users WHERE id = ?').run(userId);

  logActivity(user.id, 'user', userId, 'delete', { name: target.name, tugas_dilepas: jumlahTugas });
  return { id: userId, dihapus: true, tugas_dilepas: jumlahTugas };
};

api.updateTaskDates = (token, payload) => {
  const user = requireAuth(token, ['admin']);
  const t = db.prepare('SELECT * FROM tasks WHERE id = ?').get(payload.taskId);
  if (!t) throw new ApiError('Tugas tidak ditemukan.', 404);

  db.prepare('UPDATE tasks SET start_date=?, due_date=?, updated_at=? WHERE id=?')
    .run(payload.startDate || '', payload.dueDate || '', isoNow(), t.id);

  logActivity(user.id, 'task', t.id, 'reschedule', { start: payload.startDate, due: payload.dueDate });
  return { id: t.id };
};

api.updateTaskStatus = (token, payload) => {
  const user = requireAuth(token, ['admin', 'worker']);
  if (user.role === 'worker' && payload.newStatus === 'done') {
    throw new ApiError('Pekerja hanya dapat memindahkan status sampai Review (FR-3.2).', 403);
  }

  const t = db.prepare('SELECT * FROM tasks WHERE id = ?').get(payload.taskId);
  if (!t) throw new ApiError('Tugas tidak ditemukan.', 404);

  const now = isoNow();
  const completedAt = payload.newStatus === 'done' ? now : t.completed_at || '';
  db.prepare('UPDATE tasks SET status=?, updated_at=?, completed_at=? WHERE id=?')
    .run(payload.newStatus, now, completedAt, t.id);

  logActivity(user.id, 'task', t.id, 'status_change', { status: payload.newStatus });
  return { id: t.id, status: payload.newStatus };
};

/* --- FR-4: timer ------------------------------------------------------- */
api.startTimer = (token, taskId) => {
  const user = requireAuth(token, ['admin', 'worker']);
  const nowIso = isoNow();

  // Hentikan timer aktif lain milik user ini (FR-4.2)
  const aktif = db.prepare(`SELECT * FROM time_logs WHERE user_id = ? AND (end_time = '' OR end_time IS NULL)`).all(user.id);
  for (const l of aktif) {
    const dur = Math.max(1, Math.round((new Date() - new Date(l.start_time)) / 60000));
    db.prepare('UPDATE time_logs SET end_time=?, duration_minutes=? WHERE id=?').run(nowIso, dur, l.id);
  }

  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(taskId);
  const id = 'log-' + uuidShort();

  db.prepare(
    `INSERT INTO time_logs (id,task_id,project_id,user_id,start_time,end_time,duration_minutes,is_manual,note,created_at)
     VALUES (?,?,?,?,?,'',0,0,'Timer otomatis',?)`
  ).run(id, taskId, task ? task.project_id : '', user.id, nowIso, nowIso);

  return { id, start_time: nowIso };
};

api.stopTimer = (token) => {
  const user = requireAuth(token, ['admin', 'worker']);
  const active = db.prepare(`SELECT * FROM time_logs WHERE user_id = ? AND (end_time = '' OR end_time IS NULL) ORDER BY start_time DESC LIMIT 1`).get(user.id);
  if (!active) throw new ApiError('Tidak ada timer yang sedang berjalan.', 404);

  const nowIso = isoNow();
  const dur = Math.max(1, Math.round((new Date() - new Date(active.start_time)) / 60000));
  db.prepare('UPDATE time_logs SET end_time=?, duration_minutes=? WHERE id=?').run(nowIso, dur, active.id);

  return { id: active.id, duration_minutes: dur };
};

/* --- FR-5: share link publik ------------------------------------------- */
api.createOrUpdateShareLink = (token, payload) => {
  const user = requireAuth(token, ['admin']);
  const existing = db.prepare('SELECT * FROM share_links WHERE project_id = ?').get(payload.project_id);
  const nowIso = isoNow();

  if (existing) {
    const newToken = payload.regenerate ? token32() : existing.token;
    db.prepare(
      `UPDATE share_links SET token=?, pin_hash=?, show_hours=?, show_workers=?, show_notes=?,
       expires_at=?, is_active=? WHERE id=?`
    ).run(newToken, payload.pin || '', flag(payload.show_hours) ? 1 : 0,
      flag(payload.show_workers) ? 1 : 0, flag(payload.show_notes) ? 1 : 0,
      payload.expires_at || '', payload.is_active === false ? 0 : 1, existing.id);
    return { token: newToken };
  }

  const id = 'sh-' + uuidShort();
  const newToken = token32();
  db.prepare(
    `INSERT INTO share_links (id,project_id,token,pin_hash,show_hours,show_workers,show_notes,
     expires_at,is_active,view_count,last_viewed_at,created_by,created_at)
     VALUES (?,?,?,?,?,?,?,?,1,0,?,?,?)`
  ).run(id, payload.project_id, newToken, payload.pin || '',
    flag(payload.show_hours) ? 1 : 0, flag(payload.show_workers) ? 1 : 0,
    flag(payload.show_notes) ? 1 : 0, payload.expires_at || '', nowIso, user.id, nowIso);

  return { token: newToken };
};

api.getTrackingData = (token, shareToken, pin) => {
  const link = db.prepare('SELECT * FROM share_links WHERE token = ? AND is_active = 1').get(shareToken);
  if (!link) throw new ApiError('Link tracking tidak ditemukan atau sudah dicabut.', 404);
  if (link.expires_at && new Date(link.expires_at) < new Date()) {
    throw new ApiError('Link tracking sudah kedaluwarsa.', 410);
  }
  if (link.pin_hash && String(link.pin_hash) !== String(pin || '')) {
    return { requirePin: true, token: shareToken };
  }

  db.prepare('UPDATE share_links SET view_count=?, last_viewed_at=? WHERE id=?')
    .run((Number(link.view_count) || 0) + 1, isoNow(), link.id);

  const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(link.project_id);
  const tasks = db.prepare(
    'SELECT * FROM tasks WHERE project_id = ? AND is_deleted = 0 AND visible_to_client = 1'
  ).all(link.project_id).map(t => ({ ...t, subtasks: t.subtasks_json ? JSON.parse(t.subtasks_json) : [] }));

  // Jam kerja aktual per tugas (dipakai portal klien bila show_hours aktif).
  const timeLogs = db.prepare(
    'SELECT task_id, duration_minutes, end_time FROM time_logs WHERE project_id = ?'
  ).all(link.project_id);

  return { requirePin: false, link, project, tasks, timeLogs };
};

/* --- Tambahan: log manual & hapus log (dipakai UI) --------------------- */
api.addManualLog = (token, payload) => {
  const user = requireAuth(token, ['admin', 'worker']);
  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(payload.task_id);
  if (!task) throw new ApiError('Tugas tidak ditemukan.', 404);

  const id = 'log-' + uuidShort();
  const nowIso = isoNow();
  const dur = Math.max(1, Number(payload.duration_minutes) || 1);

  db.prepare(
    `INSERT INTO time_logs (id,task_id,project_id,user_id,start_time,end_time,duration_minutes,is_manual,note,created_at)
     VALUES (?,?,?,?,?,?,?,1,?,?)`
  ).run(id, payload.task_id, task.project_id, user.id,
    payload.start_time || nowIso, payload.end_time || nowIso, dur, payload.note || '', nowIso);

  return { id };
};

api.deleteLog = (token, logId) => {
  const user = requireAuth(token, ['admin', 'worker']);
  const log = db.prepare('SELECT * FROM time_logs WHERE id = ?').get(logId);
  if (!log) throw new ApiError('Log tidak ditemukan.', 404);
  if (user.role === 'worker' && log.user_id !== user.id) {
    throw new ApiError('Pekerja hanya dapat menghapus log miliknya sendiri.', 403);
  }
  db.prepare('DELETE FROM time_logs WHERE id=?').run(logId);
  return { id: logId };
};

/* ==========================================================================
   5. EXPRESS
   ========================================================================== */

const app = express();
app.use(express.json({ limit: '5mb' }));
app.set('trust proxy', true);

/** Setiap respons: { ok: true, data } atau { ok: false, error } — sama seperti Apps Script. */
function jalankan(fn) {
  return (req, res) => {
    try {
      const token = req.get('X-Ductions-Token') || req.body?.token || req.query?.token || '';
      const data = fn(token, req.body || {}, req.query || {});
      res.json({ ok: true, data });
    } catch (e) {
      const status = e instanceof ApiError ? e.status : 400;
      res.status(status).json({ ok: false, error: e.message || 'Terjadi kesalahan server' });
    }
  };
}

/* Auth */
app.post('/api/login', jalankan((t, b) => api.login(t, b.email, b.password)));

/* Bootstrap */
app.post('/api/getBootstrapData', jalankan((t) => api.getBootstrapData(t)));

/* Proyek */
app.post('/api/createProject', jalankan((t, b) => api.createProject(t, b.payload || b)));
app.post('/api/updateProject', jalankan((t, b) => api.updateProject(t, b.payload || b)));
app.post('/api/deleteProject', jalankan((t, b) => api.deleteProject(t, b.projectId)));

/* Tugas */
app.post('/api/createTask', jalankan((t, b) => api.createTask(t, b.payload || b)));
app.post('/api/updateTask', jalankan((t, b) => api.updateTask(t, b.payload || b)));
app.post('/api/deleteTask', jalankan((t, b) => api.deleteTask(t, b.taskId)));
app.post('/api/deleteSubtask', jalankan((t, b) => api.deleteSubtask(t, b)));
app.post('/api/deleteUser', jalankan((t, b) => api.deleteUser(t, b.userId)));
app.post('/api/createUser', jalankan((t, b) => api.createUser(t, b)));
app.post('/api/updateTaskDates', jalankan((t, b) => api.updateTaskDates(t, b.payload || b)));
app.post('/api/updateTaskStatus', jalankan((t, b) => api.updateTaskStatus(t, b.payload || b)));

/* Timer */
app.post('/api/startTimer', jalankan((t, b) => api.startTimer(t, b.taskId)));
app.post('/api/stopTimer', jalankan((t) => api.stopTimer(t)));
app.post('/api/addManualLog', jalankan((t, b) => api.addManualLog(t, b.payload || b)));
app.post('/api/deleteLog', jalankan((t, b) => api.deleteLog(t, b.logId)));

/* Share link */
app.post('/api/createOrUpdateShareLink', jalankan((t, b) => api.createOrUpdateShareLink(t, b.payload || b)));
app.post('/api/getTrackingData', jalankan((t, b) => api.getTrackingData(t, b.shareToken, b.pin)));

/* Health */
app.get('/api/health', (req, res) => {
  const stat = fs.statSync(path.join(DATA_DIR, 'ductions.db'));
  res.json({
    ok: true, app: 'Ductions', uptime: Math.round(process.uptime()),
    node: process.version, db_bytes: stat.size,
    counts: {
      users: db.prepare('SELECT COUNT(*) c FROM users').get().c,
      projects: db.prepare('SELECT COUNT(*) c FROM projects WHERE is_deleted=0').get().c,
      tasks: db.prepare('SELECT COUNT(*) c FROM tasks WHERE is_deleted=0').get().c,
      logs: db.prepare('SELECT COUNT(*) c FROM time_logs').get().c
    }
  });
});

/* Halaman .php harus dikirim sebagai text/html — kalau tidak, browser mengunduhnya. */
function kirimHalaman(res, file, status = 200) {
  const full = path.join(__dirname, 'public', file);
  res.status(status).type('text/html; charset=utf-8');
  res.sendFile(full, (err) => {
    if (err && !res.headersSent) {
      res.status(500).type('text/html; charset=utf-8').send('<h1>500</h1>');
    }
  });
}

/* Halaman tracking publik: /share/<token> (dan /track/<token> untuk URL lama) */
function kirimPortalKlien(req, res) {
  kirimHalaman(res, 'share/index.php');
}
app.get('/share/:token', kirimPortalKlien);
app.get('/share', kirimPortalKlien);
app.get('/track/:token', kirimPortalKlien);

/* Halaman aplikasi (landing, login, app/*) */
app.use(express.static(path.join(__dirname, 'public'), {
  extensions: ['php'],
  setHeaders(res, filePath) {
    if (filePath.endsWith('.php')) {
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
    }
  }
}));

/* Fallback: hanya rute halaman yang dikenal. URL lain = 404 nyata. */
const HALAMAN_APP = new Set(['dashboard', 'timeline', 'todo', 'projects', 'timesheet', 'users']);

app.get('*', (req, res) => {
  const p = req.path.replace(/\/+$/, '') || '/';
  // Hanya URL tanpa ekstensi atau berakhiran .php yang dilayani.
  if (/\.(?!php$)[a-z0-9]+$/i.test(p)) {
    return kirimHalaman(res, '404.php', 404);
  }
  const bersih = p.replace(/\.php$/, '');

  // Beranda langsung ke login (halaman sampul dihapus)
  if (bersih === '/' || bersih === '') {
    return res.redirect(301, '/login.php');
  }
  if (bersih === '/login') {
    return kirimHalaman(res, 'login.php');
  }
  // /app/<fitur>
  const cocok = bersih.match(/^\/app\/([a-z-]+)$/);
  if (cocok && HALAMAN_APP.has(cocok[1])) {
    return kirimHalaman(res, 'app/' + cocok[1] + '.php');
  }
  kirimHalaman(res, '404.php', 404);
});

/* Pembersih sesi kedaluwarsa (setara dailyCleanup) */
function dailyCleanup() {
  const info = db.prepare('DELETE FROM sessions WHERE expires_at < ?').run(isoNow());
  if (info.changes) console.log(`[cleanup] ${info.changes} sesi kedaluwarsa dihapus`);
}
setInterval(dailyCleanup, 3600000);

/* ==========================================================================
   6. START
   ========================================================================== */

seed();

app.listen(PORT, HOST, () => {
  console.log(`Ductions jalan di http://${HOST}:${PORT}`);
  console.log(`Database: ${path.join(DATA_DIR, 'ductions.db')}`);
});

process.on('SIGINT', () => { db.close(); process.exit(0); });
process.on('SIGTERM', () => { db.close(); process.exit(0); });
