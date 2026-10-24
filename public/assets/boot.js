/* ==========================================================================
   DUCTIONS — BOOT.JS
   Routing antar-halaman. Setiap app/<fitur>.php memanggil bootPage('<fitur>').
   ========================================================================== */

const HALAMAN_ADMIN = ['projects', 'users'];
const HALAMAN_PEKERJA = ['dashboard', 'timeline', 'todo', 'timesheet'];

const JUDUL_HALAMAN = {
  dashboard: 'Dasbor Ringkasan Eksekutif',
  timeline: 'Timeline Pekerjaan (Kalender & List)',
  todo: 'Tugas Saya (To Do & Kanban)',
  projects: 'Kelola Proyek & Link Tracking Klien',
  timesheet: 'Laporan Timesheet & Produktivitas',
  users: 'Manajemen Pengguna & Peran'
};

function urlHalaman(page) {
  return '/app/' + page + '.php';
}

function keLogin() {
  sessionStorage.removeItem('ductions_token');
  location.replace('/login.php');
}

/** Bootstrap satu halaman fitur. */
async function bootPage(page) {
  state.currentPage = page;

  /* 1. Token wajib ada. */
  if (!sessionStorage.getItem('ductions_token')) return keLogin();

  /* 2. Ambil data server; sekaligus validasi token ke backend. */
  try {
    await api.getBootstrapData();
  } catch (err) {
    showToast('Sesi berakhir. Silakan masuk lagi.', 'error');
    return setTimeout(keLogin, 800);
  }

  /* 3. Identitas dari sesi. */
  try {
    state.currentUser = JSON.parse(sessionStorage.getItem('ductions_user') || 'null');
  } catch (e) {
    state.currentUser = null;
  }
  if (!state.currentUser) return keLogin();

  /* 4. Penjaga peran. */
  const peran = state.currentUser.role;
  if (HALAMAN_ADMIN.includes(page) && peran !== 'admin') {
    showToast('Halaman ini khusus admin.', 'error');
    return location.replace(urlHalaman('todo'));
  }
  if (peran === 'admin' && HALAMAN_PEKERJA.includes(page) && page === 'todo') {
    /* admin boleh lihat todo, tidak dipaksa pindah */
  }

  /* 5. Pasang sidebar + judul + menu aktif. */
  pasangIdentitas();
  populateFilterDropdowns();
  startHeaderTimerTicker();

  const judul = document.getElementById('pageTitle');
  if (judul) judul.textContent = JUDUL_HALAMAN[page] || 'Ductions';

  document.querySelectorAll('.nav-item').forEach(btn => {
    const aktif = btn.getAttribute('data-nav') === page;
    btn.classList.toggle('bg-brut-yellow', aktif);
    btn.classList.toggle('bg-white', !aktif);
  });

  /* 6. Render isi halaman. */
  if (page === 'dashboard') renderDashboard();
  if (page === 'timeline') renderTimeline();
  if (page === 'todo') renderTodo();
  if (page === 'projects') renderProjects();
  if (page === 'timesheet') renderTimesheet();
  if (page === 'users') renderUsers();

  /* 7. Deep link ke drawer tugas: ?task=<id>. */
  const idTugas = new URLSearchParams(location.search).get('task');
  if (idTugas) openTaskDrawer(idTugas);

  lucide.createIcons();
}

/** Tulis identitas pengguna ke elemen sidebar. */
function pasangIdentitas() {
  const u = state.currentUser;
  if (!u) return;
  const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
  set('userNameDisplay', u.name);
  set('userEmailDisplay', u.email);
  set('userAvatar', (u.name || '?').split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase());
  set('sidebarRoleBadge', u.role === 'admin' ? 'ADMIN / PM' : 'PEKERJA');

  document.querySelectorAll('.admin-only').forEach(el => {
    el.classList.toggle('hidden', u.role !== 'admin');
  });
}
