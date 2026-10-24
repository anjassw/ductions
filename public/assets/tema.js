/* ==========================================================
   TEMA TERANG / GELAP — Ductions
   Dimuat di <head> (blocking) supaya tema terpasang sebelum
   halaman digambar → tidak ada kedip putih.
   ========================================================== */
(function () {
  var KUNCI = 'ductions_tema';
  var AKAR = document.documentElement;

  function temaTersimpan() {
    try {
      return localStorage.getItem(KUNCI) || 'terang';
    } catch (e) {
      return 'terang';
    }
  }

  function pasang(tema) {
    AKAR.setAttribute('data-tema', tema === 'gelap' ? 'gelap' : 'terang');
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', tema === 'gelap' ? '#0B0B0E' : '#FFFDF5');
  }

  // 1. Langsung pasang sebelum render
  pasang(temaTersimpan());

  var IKON_TERANG = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>';
  var IKON_GELAP = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M6.3 17.7l-1.4 1.4M19.1 4.9l-1.4 1.4"/></svg>';

  function perbaruiIkon() {
    var gelap = (AKAR.getAttribute('data-tema') === 'gelap');
    var tombol = document.querySelectorAll('[data-aksi="tema"]');
    for (var i = 0; i < tombol.length; i++) {
      // Tampilkan ikon tujuan: mode gelap aktif → ikon matahari (untuk kembali terang)
      tombol[i].innerHTML = gelap ? IKON_GELAP : IKON_TERANG;
      tombol[i].setAttribute('aria-label', gelap ? 'Ganti ke tema terang' : 'Ganti ke tema gelap');
      tombol[i].setAttribute('title', gelap ? 'Tema terang' : 'Tema gelap');
    }
  }

  function ganti() {
    var baru = (AKAR.getAttribute('data-tema') === 'gelap') ? 'terang' : 'gelap';
    try {
      localStorage.setItem(KUNCI, baru);
    } catch (e) { /* mode privat — tema tetap jalan per halaman */ }
    pasang(baru);
    perbaruiIkon();
    // Segarkan ikon lucide kalau sudah dimuat
    if (window.lucide && typeof window.lucide.createIcons === 'function') {
      try { window.lucide.createIcons(); } catch (e) { }
    }
  }

  window.DuctionsTema = {
    ganti: ganti,
    aktif: function () { return AKAR.getAttribute('data-tema') || 'terang'; }
  };

  document.addEventListener('click', function (ev) {
    var el = ev.target.closest ? ev.target.closest('[data-aksi="tema"]') : null;
    if (el) {
      ev.preventDefault();
      ganti();
    }
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', perbaruiIkon);
  } else {
    perbaruiIkon();
  }
})();
