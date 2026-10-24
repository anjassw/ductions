/* ==========================================================================
   DUCTIONS — SHARE.JS
   Portal tracking klien publik (/share/ atau /share/<token>).
   Tanpa login. Hanya memanggil endpoint publik getTrackingData.
   ========================================================================== */

(function () {
  /* 1. Ambil token dari path /share/<token> atau ?t=<token>. */
  const m = location.pathname.match(/\/share\/([A-Za-z0-9_-]+)\/?$/);
  const qs = new URLSearchParams(location.search);
  const token = m ? m[1] : (qs.get('t') || qs.get('token') || '');
  const pin = qs.get('pin') || '';

  function galat(pesan) {
    const kotak = document.getElementById('clientTrackContent');
    if (!kotak) return;
    kotak.innerHTML = `
      <div class="brut-card bg-brut-pink p-6 space-y-3">
        <h2 class="font-display font-extrabold text-xl uppercase">Tautan Tidak Valid</h2>
        <p class="text-sm font-semibold">${pesan}</p>
        <p class="text-xs font-mono bg-white brut-border-sm px-2 py-1 inline-block">
          Minta tautan terbaru ke admin proyek Anda.
        </p>
      </div>`;
  }

  /* 2. Tombol "Kembali" di portal klien mengarah ke beranda, bukan ke app. */
  window.exitClientTrackPreview = function () {
    location.href = '/';
  };

  /* 3. Tanpa token: tampilkan panduan. */
  if (!token) {
    galat('Tautan ini tidak memuat kode proyek. Pastikan Anda membuka URL lengkap yang dikirim admin.');
    lucide.createIcons();
    return;
  }

  /* 4. Ambil data dan render. */
  (async () => {
    try {
      await openClientTrackPreview(token, pin);
    } catch (err) {
      galat(err.message || 'Gagal memuat data proyek.');
    }
    lucide.createIcons();
  })();
})();
