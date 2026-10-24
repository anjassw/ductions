<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="theme-color" content="#FFFDF5">
  <title>Kelola Pengguna — Ductions</title>
  <meta name="description" content="Ductions — Lightweight Work Management System for Freelancers &amp; Agencies. Timeline Gantt, to do, timesheet, dan portal share progres untuk klien.">
  <meta property="og:type" content="website">
  <meta property="og:title" content="Ductions — Lightweight Work Management System">
  <meta property="og:description" content="Timeline Gantt, to do, timesheet, dan portal share progres untuk klien. Express + SQLite, tanpa build step.">
  <meta name="twitter:card" content="summary">
  <link rel="stylesheet" href="../assets/app.css">
  <script src="../assets/tema.js"></script>
  <script src="../assets/i18n.js"></script>
  <script src="https://cdn.tailwindcss.com"></script>
  <script>
    tailwind.config = {
      theme: { extend: {
        fontFamily: {
          sans: ['"Plus Jakarta Sans"', 'sans-serif'],
          display: ['"Space Grotesk"', 'sans-serif'],
          mono: ['"JetBrains Mono"', 'monospace'],
        },
        colors: { brut: { bg: '#FFFDF5', yellow: '#FFDE00', lime: '#A3E635', cyan: '#22D3EE',
          pink: '#FF6B9E', purple: '#A855F7', orange: '#FB923C', red: '#FF4D4D', indigo: '#6366F1' } }
      } }
    }
  </script>
  <script src="https://cdn.jsdelivr.net/npm/fullcalendar@6.1.11/index.global.min.js"></script>
  <script src="https://unpkg.com/lucide@latest"></script>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@500;700;800&family=Plus+Jakarta+Sans:wght@500;600;700;800&family=Space+Grotesk:wght@700;800&display=swap" rel="stylesheet">
</head>
<body class="min-h-screen flex flex-col selection:bg-brut-pink selection:text-black">
  <div id="toastContainer" class="fixed bottom-5 right-5 z-50 flex flex-col gap-3 max-w-sm w-full pointer-events-none"></div>

  <div id="appView" class="min-h-screen flex flex-col lg:flex-row">

    <aside id="sidebar" class="w-full lg:w-64 bg-white border-b-4 lg:border-b-0 lg:border-r-4 border-black flex-shrink-0 flex flex-col justify-between z-30">
      <div>
        <!-- Brand Header -->
        <div class="p-4 border-b-4 border-black bg-brut-yellow flex items-center justify-between">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 bg-white brut-border brut-shadow-sm flex items-center justify-center font-display font-extrabold text-xl">
              D.
            </div>
            <div>
              <h2 class="font-display font-extrabold text-xl leading-none uppercase">Ductions</h2>
              <p class="text-[9px] font-mono leading-tight text-zinc-600 mt-0.5">Lightweight Work<br>Management System</p>
              <span id="sidebarRoleBadge" class="font-mono text-[10px] font-bold uppercase bg-black text-white px-1.5 py-0.5">ADMIN</span>
            </div>
          </div>
          <div class="flex items-center gap-2">
                        <div class="relative" data-bahasa-picker>
              <button type="button" onclick="document.getElementById('bahasaMenu').classList.toggle('hidden')"
                class="brut-btn bg-white px-2 py-2 flex items-center gap-1" data-i18n-title="umum.bahasa" title="Bahasa">
                <i data-lucide="languages" class="w-5 h-5"></i>
                <span class="font-mono text-[10px] font-bold uppercase" data-bahasa-label>ID</span>
              </button>
              <div id="bahasaMenu" class="hidden absolute right-0 top-full mt-1 w-52 bg-white brut-border brut-shadow z-50 p-1.5 space-y-1" data-bahasa-target></div>
            </div>
            <button type="button" data-aksi="tema" class="tombol-tema" aria-label="Ganti tema" title="Tema gelap"></button>
            <button onclick="toggleMobileMenu()" class="lg:hidden brut-btn bg-white p-2">
              <i data-lucide="menu" class="w-5 h-5"></i>
            </button>
          </div>
        </div>

        <!-- Navigation Menu (Disembunyikan/ditampilkan sesuai peran - PRD 10.1) -->
        <nav id="navMenu" class="hidden lg:flex flex-col p-3 gap-2">
          <button data-nav="dashboard" onclick="navigate('dashboard')" class="nav-item brut-btn justify-start px-3 py-2.5 text-sm bg-white">
            <i data-lucide="layout-dashboard" class="w-4 h-4"></i> <span data-i18n="nav.dashboard">Dasbor Ringkasan</span>
          </button>
          <button data-nav="timeline" onclick="navigate('timeline')" class="nav-item brut-btn justify-start px-3 py-2.5 text-sm bg-white">
            <i data-lucide="calendar-range" class="w-4 h-4"></i> <span data-i18n="nav.timeline">Timeline Proyek</span>
          </button>
          <button data-nav="todo" onclick="navigate('todo')" class="nav-item brut-btn justify-start px-3 py-2.5 text-sm bg-white">
            <i data-lucide="check-square" class="w-4 h-4"></i> <span data-i18n="nav.todo">Tugas Saya (To Do)</span>
          </button>
          <button data-nav="projects" onclick="navigate('projects')" class="nav-item admin-only brut-btn justify-start px-3 py-2.5 text-sm bg-white">
            <i data-lucide="folder-kanban" class="w-4 h-4"></i> <span data-i18n="nav.projects">Proyek &amp; Link Klien</span>
          </button>
          <button data-nav="timesheet" onclick="navigate('timesheet')" class="nav-item brut-btn justify-start px-3 py-2.5 text-sm bg-white">
            <i data-lucide="clock" class="w-4 h-4"></i> <span data-i18n="nav.timesheet">Timesheet &amp; Laporan</span>
          </button>
          <button data-nav="users" onclick="navigate('users')" class="nav-item admin-only brut-btn justify-start px-3 py-2.5 text-sm bg-white">
            <i data-lucide="users" class="w-4 h-4"></i> <span data-i18n="nav.users">Kelola Pengguna</span>
          </button>
        </nav>
      </div>

      <!-- User Profile Footer -->
      <div class="hidden lg:block p-3 border-t-4 border-black bg-amber-50">
        <div class="p-2.5 bg-white brut-border brut-shadow-sm mb-2">
          <div class="flex items-center gap-2.5">
            <div id="userAvatar" class="w-9 h-9 bg-brut-pink brut-border-sm flex items-center justify-center font-display font-extrabold text-sm">
              AD
            </div>
            <div class="overflow-hidden">
              <div id="userNameDisplay" class="font-extrabold text-sm truncate" data-i18n="umum.memuat">Memuat…</div>
              <div id="userEmailDisplay" class="text-xs font-mono text-zinc-600 truncate"></div>
            </div>
          </div>
        </div>
        <div class="grid grid-cols-2 gap-2">
          <button onclick="openPasswordModal()" class="brut-btn bg-white py-1.5 px-2 text-xs">
            <i data-lucide="key-round" class="w-3.5 h-3.5"></i> <span data-i18n="umum.sandi">Sandi</span>
          </button>
          <button onclick="handleLogout()" class="brut-btn bg-brut-red text-white py-1.5 px-2 text-xs">
            <i data-lucide="log-out" class="w-3.5 h-3.5"></i> <span data-i18n="umum.keluar">Keluar</span>
          </button>
        </div>
      </div>
      <div id="sidebarCredit" class="px-3 py-2 border-t-2 border-black font-mono text-[10px] text-zinc-600 leading-snug">
        <span data-i18n="umum.madeby">Made by</span> <a href="https://github.com/anjassw" target="_blank" rel="noopener" class="underline underline-offset-2">Anjas S</a>
      </div>
    </aside>


    <div class="flex-1 flex flex-col min-w-0">

        <!-- PERINGATAN TIMER > 10 JAM (FR-4.6) -->
      <div id="overtimeBanner" class="hidden bg-brut-red text-white border-b-4 border-black px-6 py-2.5 font-bold text-sm flex items-center justify-between">
        <div class="flex items-center gap-2">
          <i data-lucide="alert-triangle" class="w-5 h-5"></i>
          <span>PERINGATAN: Timer Anda sudah berjalan lebih dari 10 jam tanpa henti! Pastikan Anda tidak lupa menghentikannya.</span>
        </div>
        <button onclick="handleStopTimer()" class="brut-btn bg-white text-black px-3 py-1 text-xs uppercase">Hentikan Sekarang</button>
      </div>

      <!-- HEADER: judul + WIDGET TIMER HEADER REAL-TIME (FR-4.1 - FR-4.6) -->
      <header class="bg-white border-b-4 border-black px-4 sm:px-6 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div class="min-w-0">
          <h1 class="font-display font-extrabold text-xl sm:text-2xl uppercase leading-tight"><span data-i18n="halaman.users.judul">Kelola Pengguna</span></h1>
          <p class="text-xs font-mono text-zinc-600 mt-0.5" id="headerTanggal"></p>
        </div>
        <div class="flex items-center gap-2 flex-wrap">
          <div id="headerTimerWidget" class="brut-border brut-shadow-sm bg-zinc-100 px-3 py-1.5 flex items-center gap-3">
            <span id="timerPulse" class="w-3 h-3 rounded-full bg-zinc-400 border border-black flex-shrink-0"></span>
            <div class="leading-tight min-w-0">
              <div id="timerTaskTitle" class="text-[11px] font-extrabold uppercase truncate max-w-[9rem]" data-i18n="umum.tidakaktif" data-i18n="umum.tidakaktif">Tidak ada timer aktif</div>
              <div id="timerDisplay" class="font-mono font-extrabold text-sm tabular-nums">00:00:00</div>
            </div>
            <button id="headerStopTimerBtn" onclick="handleStopTimer()"
                    class="brut-btn bg-brut-red text-white px-2 py-1 text-[10px] uppercase hidden">
              Stop
            </button>
          </div>
          <button onclick="openManualLogModal()" class="brut-btn bg-white px-3 py-2 text-xs uppercase flex items-center gap-1.5">
            <i data-lucide="plus-circle" class="w-4 h-4"></i> Manual
          </button>
          <button onclick="openTaskModal()" class="brut-btn bg-brut-yellow px-3 py-2 text-xs uppercase flex items-center gap-1.5">
            <i data-lucide="plus" class="w-4 h-4"></i> <span data-i18n="umum.tugasbaru">Tugas Baru</span>
          </button>
        </div>
      </header>

  <main class="p-4 sm:p-6 flex-1 overflow-x-hidden space-y-6" data-page="users">
        <!-- ==========================================================
             PAGE 6: KELOLA PENGGUNA (ADMIN - FR-1.4)
             ========================================================== -->
        <section id="page-users" class="space-y-5">
          <div class="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 class="font-display font-extrabold text-lg uppercase" data-i18n="halaman.pengguna.sub">Manajemen Pengguna & Hak Akses</h2>
              <p class="text-xs font-semibold text-zinc-600" data-i18n="halaman.pengguna.deskripsi">Tambah staf/pekerja, atur tarif per jam, kunci/aktifkan akun, atau reset password.</p>
            </div>
            <button onclick="openUserModal()" class="brut-btn bg-brut-lime px-4 py-2 text-xs sm:text-sm uppercase">
              <i data-lucide="user-plus" class="w-4 h-4"></i> <span data-i18n="halaman.pengguna.tambah">Tambah Pengguna</span>
            </button>
          </div>

          <div class="brut-card overflow-hidden">
            <div class="overflow-x-auto">
              <table class="w-full text-left border-collapse text-xs sm:text-sm">
                <thead>
                  <tr class="bg-brut-yellow border-b-3 border-black font-extrabold uppercase text-xs">
                    <th class="p-3 border-r-2 border-black">Nama & Email</th>
                    <th class="p-3 border-r-2 border-black">Peran</th>
                    <th class="p-3 border-r-2 border-black" data-i18n="halaman.pengguna.tarif">Tarif / Jam</th>
                    <th class="p-3 border-r-2 border-black">Status Akun</th>
                    <th class="p-3 border-r-2 border-black">Keamanan Login</th>
                    <th class="p-3">Aksi Admin</th>
                  </tr>
                </thead>
                <tbody id="usersTableBody"></tbody>
              </table>
            </div>
          </div>
        </section>
  </main>
    </div>
  </div>


  <!-- ==========================================================
       DRAWER / PANEL SAMPING: DETAIL TUGAS, SUB-TUGAS & KOMENTAR (PRD 10.1)
       ========================================================== -->
  <div id="taskDrawerBackdrop" onclick="closeTaskDrawer()" class="fixed inset-0 bg-black/50 z-40 hidden"></div>
  <aside id="taskDrawer" class="fixed top-0 right-0 h-full w-full max-w-lg bg-white border-l-4 border-black z-50 transform translate-x-full transition-transform duration-200 flex flex-col">
    <div class="p-4 bg-brut-yellow border-b-4 border-black flex items-center justify-between">
      <div class="flex items-center gap-2">
        <span id="drawerTaskBadge" class="brut-badge bg-white">TASK</span>
        <h3 class="font-display font-extrabold text-lg uppercase"><span data-i18n="detail.judul">Detail Pekerjaan</span></h3>
      </div>
      <button onclick="closeTaskDrawer()" class="brut-btn bg-white p-1.5">
        <i data-lucide="x" class="w-5 h-5"></i>
      </button>
    </div>
    <div id="taskDrawerBody" class="p-5 flex-1 overflow-y-auto space-y-5"></div>
  </aside>

  <!-- ==========================================================
       MODAL DIALOG REUSABLE (TAMBAH PROYEK, TUGAS, SHARE LINK, DLL)
       ========================================================== -->
  <div id="modalBackdrop" class="fixed inset-0 bg-black/60 z-50 hidden flex items-center justify-center p-4">
    <div class="brut-card bg-white w-full max-w-lg max-h-[90vh] flex flex-col">
      <div id="modalHeader" class="p-4 bg-brut-cyan border-b-3 border-black flex items-center justify-between">
        <h3 id="modalTitle" class="font-display font-extrabold text-lg uppercase">Judul Modal</h3>
        <button onclick="closeModal()" class="brut-btn bg-white p-1">
          <i data-lucide="x" class="w-4 h-4"></i>
        </button>
      </div>
      <div id="modalBody" class="p-5 overflow-y-auto space-y-4"></div>
    </div>
  </div>
  <script src="../assets/core.js"></script>
  <script src="../assets/api.js"></script>
  <script src="../assets/boot.js"></script>
  <script src="../assets/app.js"></script>
  <script>bootPage('users');</script>
</body>
</html>
