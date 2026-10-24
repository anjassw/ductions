<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="theme-color" content="#FFFDF5">
  <title>Masuk — Ductions</title>
  <meta name="description" content="Ductions — Lightweight Work Management System for Freelancers &amp; Agencies. Timeline Gantt, to do, timesheet, dan portal share progres untuk klien.">
  <meta property="og:type" content="website">
  <meta property="og:title" content="Ductions — Lightweight Work Management System">
  <meta property="og:description" content="Timeline Gantt, to do, timesheet, dan portal share progres untuk klien. Express + SQLite, tanpa build step.">
  <meta name="twitter:card" content="summary">
  <link rel="stylesheet" href="assets/app.css">
  <script src="assets/tema.js"></script>
  <script src="assets/i18n.js"></script>
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
  <div class="fixed top-4 right-4 z-40"><button type="button" data-aksi="tema" class="tombol-tema" aria-label="Ganti tema" title="Tema gelap"></button></div>
  <!-- ==========================================================
       VIEW 1: HALAMAN LOGIN (FR-1.1 - FR-1.6)
       ========================================================== -->
  <div id="loginView" class="min-h-screen flex items-center justify-center p-4">
    <div class="w-full max-w-md brut-card bg-white p-6 sm:p-8 relative">
      <!-- Decorative NeoBrutalist Sticker -->
      <div class="absolute -top-5 -right-4 bg-brut-pink brut-border brut-shadow-sm px-3 py-1 rotate-6 font-mono font-extrabold text-xs uppercase">
        v1.0 MVP • Gratis
      </div>

      <!-- Brand Logo -->
      <div class="flex items-center gap-3 mb-6">
        <div class="w-14 h-14 bg-brut-yellow brut-border brut-shadow-sm flex items-center justify-center font-display font-extrabold text-3xl">
          D.
        </div>
        <div>
          <h1 class="font-display font-extrabold text-3xl tracking-tight uppercase">Ductions</h1>
          <p class="text-[10px] font-bold uppercase tracking-wide bg-black text-white px-2 py-1 inline-block mt-1 leading-snug">
            Lightweight Work Management<br>for Freelancers &amp; Agencies
          </p>
        </div>
      </div>

      <p class="text-sm font-semibold mb-6 border-l-4 border-black pl-3 bg-amber-50 py-2" data-i18n="login.deskripsi">
        Satu sumber kebenaran untuk jadwal proyek, timer jam kerja, dan laporan progres real-time klien.
      </p>

      <div class="flex justify-end mb-3">
        <div class="relative" data-bahasa-picker>
          <button type="button" onclick="document.getElementById('bahasaMenu').classList.toggle('hidden')"
            class="brut-btn bg-white px-2 py-1.5 flex items-center gap-1" data-i18n-title="umum.bahasa" title="Bahasa">
            <i data-lucide="languages" class="w-4 h-4"></i>
            <span class="font-mono text-[10px] font-bold uppercase" data-bahasa-label>ID</span>
          </button>
          <div id="bahasaMenu" class="hidden absolute right-0 top-full mt-1 w-52 bg-white brut-border brut-shadow z-50 p-1.5 space-y-1" data-bahasa-target></div>
        </div>
      </div>

      <form id="loginForm" onsubmit="handleLogin(event)" class="space-y-4">
        <div>
          <label class="block text-xs font-extrabold uppercase mb-1" data-i18n="login.email">Email Pengguna</label>
          <input type="email" id="loginEmail" required placeholder="nama@email.com"
            class="w-full brut-input">
        </div>
        <div>
          <label class="block text-xs font-extrabold uppercase mb-1" data-i18n="login.sandi">Kata Sandi</label>
          <input type="password" id="loginPassword" required placeholder="••••••••"
            class="w-full brut-input">
        </div>
        <div class="flex items-center justify-between text-xs font-bold">
          <label class="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" id="rememberMe" class="w-4 h-4 accent-black">
            <span data-i18n="login.ingat">Ingat sesi saya (8 Jam)</span>
          </label>
          <span id="envBadge" class="px-2 py-0.5 bg-brut-lime brut-border-sm font-mono text-[11px]">MODE: CANVAS</span>
        </div>

        <button type="submit" id="loginBtn" class="w-full brut-btn bg-brut-yellow py-3 text-base uppercase tracking-wider">
          <i data-lucide="log-in" class="w-5 h-5"></i> <span data-i18n="login.masuk">Masuk ke Aplikasi</span>
        </button>
      </form>

      <p class="text-center font-mono text-[10px] text-zinc-500 mt-6 pt-4 border-t-2 border-black">
        Ductions v1.0 &mdash; made by
        <a href="https://github.com/anjassw" target="_blank" rel="noopener" class="underline underline-offset-2 font-bold">Anjas S</a>
      </p>

      <script src="assets/core.js"></script>
  <script src="assets/api.js"></script>
  <script src="assets/boot.js"></script>
  <script src="assets/app.js"></script>
  <script>
    document.getElementById('envBadge').textContent = ENV_LABEL;
    lucide.createIcons();
    // Sudah punya sesi? langsung masuk.
    if (sessionStorage.getItem('ductions_token')) location.replace('app/dashboard.php');
  </script>
</body>
</html>
