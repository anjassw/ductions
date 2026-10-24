<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="theme-color" content="#FFFDF5">
  <title>Halaman Tidak Ditemukan — Ductions</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link rel="stylesheet" href="/assets/app.css">
  <script src="https://unpkg.com/lucide@latest"></script>
  <script>
    tailwind.config = {
      theme: {
        extend: {
          colors: {
            'brut-yellow': '#FACC15',
            'brut-cyan': '#22D3EE',
            'brut-lime': '#A3E635',
            'brut-pink': '#F472B6',
            'brut-orange': '#FB923C'
          },
          fontFamily: {
            display: ['"Archivo Black"', 'system-ui', 'sans-serif'],
            body: ['"Space Grotesk"', 'system-ui', 'sans-serif']
          }
        }
      }
    };
  </script>
  <script src="assets/tema.js"></script>
  <script src="assets/i18n.js"></script>
</head>
<body class="min-h-screen bg-zinc-100 font-body flex items-center justify-center p-4">

  <div class="fixed top-4 right-4 z-40 flex items-center gap-2">
    <div class="relative" data-bahasa-picker>
      <button type="button" onclick="document.getElementById('bahasaMenu').classList.toggle('hidden')"
        class="brut-btn bg-white px-2 py-1.5 flex items-center gap-1" data-i18n-title="umum.bahasa" title="Bahasa">
        <i data-lucide="languages" class="w-4 h-4"></i>
        <span class="font-mono text-[10px] font-bold uppercase" data-bahasa-label>ID</span>
      </button>
      <div id="bahasaMenu" class="hidden absolute right-0 top-full mt-1 w-52 bg-white brut-border brut-shadow z-50 p-1.5 space-y-1" data-bahasa-target></div>
    </div>
    <button type="button" data-aksi="tema" class="tombol-tema" aria-label="Ganti tema" title="Tema gelap"></button>
  </div>

  <div class="w-full max-w-md">
    <div class="bg-white brut-border brut-shadow p-8 text-center">

      <div class="w-16 h-16 mx-auto mb-4 bg-brut-pink brut-border brut-shadow-sm flex items-center justify-center">
        <i data-lucide="unlink" class="w-8 h-8"></i>
      </div>

      <p class="font-display font-extrabold text-6xl tracking-tight">404</p>
      <p class="text-xs font-extrabold uppercase tracking-widest bg-black text-white px-2 py-0.5 inline-block mb-4" data-i18n="galat404.judul">
        Halaman Tidak Ditemukan
      </p>

      <p class="text-sm font-semibold text-zinc-700 mb-6" data-i18n="galat404.pesan">
        Alamat yang kamu buka tidak tersedia. Mungkin salah ketik atau tautannya sudah dipindahkan.
      </p>

      <div class="flex flex-col gap-2">
        <a href="/" class="brut-btn bg-brut-yellow py-3 text-sm uppercase tracking-wider">
          <i data-lucide="home" class="w-4 h-4"></i> <span data-i18n="galat404.beranda">Ke Beranda</span>
        </a>
        <a href="/login.php" class="brut-btn bg-white py-3 text-sm uppercase tracking-wider">
          <i data-lucide="log-in" class="w-4 h-4"></i> <span data-i18n="login.masuk">Masuk ke Aplikasi</span>
        </a>
      </div>
    </div>
    <p class="text-center text-[11px] font-mono mt-3 text-zinc-500">DUCTIONS • V1.0 MVP • by <a href="https://github.com/anjassw" target="_blank" rel="noopener" class="underline underline-offset-2">Anjas S</a></p>
  </div>

  <script>lucide.createIcons();</script>
</body>
</html>
