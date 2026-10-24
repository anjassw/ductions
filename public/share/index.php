<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="theme-color" content="#FFFDF5">
  <title>Tracking Proyek — Ductions</title>
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
  <div id="clientTrackView" class="hidden min-h-screen p-4 sm:p-8">
    <div class="max-w-4xl mx-auto space-y-6">
      <!-- Top Bar Klien -->
      <div class="brut-card bg-brut-yellow p-4 flex flex-wrap items-center justify-between gap-3">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 bg-white brut-border flex items-center justify-center font-display font-extrabold text-xl">D.</div>
          <div>
            <span class="text-[10px] font-mono font-extrabold uppercase bg-black text-white px-2 py-0.5">PORTAL TRACKING KLIEN REAL-TIME</span>
            <h1 class="font-display font-extrabold text-lg sm:text-xl uppercase" data-i18n="share.judul">Laporan Progres Proyek</h1>
          </div>
        </div>
        <button onclick="exitClientTrackPreview()" class="brut-btn bg-white px-3 py-1.5 text-xs uppercase">
          <i data-lucide="arrow-left" class="w-4 h-4"></i> <span data-i18n="share.kembali">Kembali ke App</span>
        </button>
        <div class="relative" data-bahasa-picker>
          <button type="button" onclick="document.getElementById('bahasaMenu').classList.toggle('hidden')"
            class="brut-btn bg-white px-2 py-1.5 flex items-center gap-1" title="Bahasa" data-i18n-title="umum.bahasa">
            <i data-lucide="languages" class="w-4 h-4"></i>
            <span class="font-mono text-[10px] font-bold uppercase" data-bahasa-label>ID</span>
          </button>
          <div id="bahasaMenu" class="hidden absolute right-0 top-full mt-1 w-52 bg-white brut-border brut-shadow z-50 p-1.5 space-y-1" data-bahasa-target></div>
        </div>
        <button type="button" data-aksi="tema" class="tombol-tema" aria-label="Ganti tema" title="Tema gelap"></button>
      </div>

      <!-- Gate PIN Keamanan (Jika Link diproteksi PIN - FR-5.4) -->
      <div id="clientPinGate" class="hidden brut-card bg-white p-8 max-w-md mx-auto text-center space-y-4">
        <div class="w-14 h-14 bg-brut-pink brut-border mx-auto flex items-center justify-center">
          <i data-lucide="lock" class="w-7 h-7"></i>
        </div>
        <h2 class="font-display font-extrabold text-xl uppercase" data-i18n="share.pinjudul">Tautan Dilindungi PIN</h2>
        <p class="text-xs font-semibold text-zinc-600" data-i18n="share.pinpesan">Masukkan 4-6 digit PIN dari Admin proyek untuk melihat progres pekerjaan.</p>
        <div class="flex gap-2 justify-center">
          <input type="password" id="clientPinInput" placeholder="••••" maxlength="6" class="brut-input text-center font-mono text-lg w-40">
          <button onclick="submitClientPin()" class="brut-btn bg-brut-lime px-4 py-2 text-xs uppercase" data-i18n="share.buka">Buka</button>
        </div>
        <p class="text-[11px] font-mono text-zinc-500">Hint Demo PIN: <b>1234</b></p>
      </div>

      <!-- Konten Tracking Klien (FR-5.2) -->
      <div id="clientTrackContent" class="space-y-6"></div>
    </div>
  <script src="../assets/core.js"></script>
  <script src="../assets/api.js"></script>
  <script src="../assets/app.js"></script>
  <script src="../assets/share.js"></script>
</body>
</html>
