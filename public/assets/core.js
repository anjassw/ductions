/* ==========================================================================
   DUCTIONS — CORE.JS
   Deteksi lingkungan + data contoh (mockDB). Dimuat paling awal.
   Di mode server, mockDB ditimpa data SQLite lewat api.getBootstrapData().
   ========================================================================== */
    /**************************************************************
     * 1. DETEKSI LINGKUNGAN (GEMINI CANVAS vs GOOGLE APPS SCRIPT)
     **************************************************************/
    const IS_GAS = typeof google !== 'undefined' && google.script && google.script.run;
    // Mode Server: backend Express + SQLite (bukan Google Apps Script)
    const IS_SERVER = !IS_GAS && /^https?:$/.test(location.protocol);
    const ENV_LABEL = IS_GAS ? 'MODE: APPS SCRIPT' : (IS_SERVER ? 'MODE: SERVER' : 'MODE: CANVAS PREVIEW');

    /**************************************************************
     * 2. DATABASE SIMULASI DI MEMORI (SESUAI SKEMA 8 SHEET BAB 7 PRD)
     *    Otomatis dipakai saat preview di Canvas; saat di Apps Script
     *    akan memanggil fungsi di Code.gs
     **************************************************************/
    var mockDB = {
      users: [
        { id: 'usr-1', name: 'Admin Demo', email: 'admin@example.com', password_hash: 'admin123', role: 'admin', hourly_rate: 150000, is_active: true, failed_login: 0, locked_until: null },
        { id: 'usr-2', name: 'Pekerja Demo', email: 'worker@example.com', password_hash: 'worker123', role: 'worker', hourly_rate: 85000, is_active: true, failed_login: 0, locked_until: null },
        { id: 'usr-3', name: 'Desainer Demo', email: 'designer@example.com', password_hash: 'worker123', role: 'worker', hourly_rate: 90000, is_active: true, failed_login: 0, locked_until: null }
      ],
      projects: [
        {
          id: 'prj-1', name: 'Revamp Website Toko Online', client_name: 'PT Contoh Sejahtera',
          client_email: 'kontak@contoh.co.id', description: 'Pembuatan ulang UI/UX dan integrasi katalog produk.',
          color: '#FFDE00', start_date: '2026-10-15', end_date: '2026-11-05', status: 'Berjalan', progress_mode: 'count', is_deleted: false
        },
        {
          id: 'prj-2', name: 'Sistem Inventaris Gudang', client_name: 'CV Contoh Logistik',
          client_email: 'ops@contohlogistik.id', description: 'Aplikasi pencatatan keluar-masuk barang berbasis barcode.',
          color: '#22D3EE', start_date: '2026-10-18', end_date: '2026-11-15', status: 'Berjalan', progress_mode: 'weighted', is_deleted: false
        }
      ],
      tasks: [
        {
          id: 'tsk-1', project_id: 'prj-1', parent_id: '', title: 'Riset & Wireframe Halaman Utama',
          description: 'Menyusun layout wireframe desktop dan mobile dengan gaya BrutX.', assignee_id: 'usr-3',
          start_date: '2026-10-18', due_date: '2026-10-21', priority: 'high', status: 'done',
          estimate_hours: 6, is_milestone: true, visible_to_client: true, is_deleted: false,
          subtasks: [
            { id: 'sub-1', title: 'Sketsa Hero Section & Katalog', done: true },
            { id: 'sub-2', title: 'Persetujuan desain dari klien', done: true }
          ]
        },
        {
          id: 'tsk-2', project_id: 'prj-1', parent_id: '', title: 'Implementasi Komponen Keranjang Belanja',
          description: 'Membuat state keranjang belanja dan kalkulasi ongkir.', assignee_id: 'usr-2',
          start_date: '2026-10-22', due_date: '2026-10-24', priority: 'urgent', status: 'in_progress',
          estimate_hours: 8, is_milestone: true, visible_to_client: true, is_deleted: false,
          subtasks: [
            { id: 'sub-3', title: 'Fungsi tambah/kurang kuantitas item', done: true },
            { id: 'sub-4', title: 'Validasi stok minimum', done: false }
          ]
        },
        {
          id: 'tsk-3', project_id: 'prj-1', parent_id: '', title: 'Optimasi Kecepatan Muat <= 3 Detik',
          description: 'Kompresi aset gambar dan lazy loading halaman produk.', assignee_id: 'usr-2',
          start_date: '2026-10-20', due_date: '2026-10-22', priority: 'high', status: 'review',
          estimate_hours: 4, is_milestone: false, visible_to_client: true, is_deleted: false,
          subtasks: [
            { id: 'sub-5', title: 'Audit Lighthouse performa mobile', done: true }
          ]
        },
        {
          id: 'tsk-4', project_id: 'prj-2', parent_id: '', title: 'Desain Skema Database Spreadsheet (8 Sheet)',
          description: 'Menyiapkan struktur Users, Sessions, Projects, Tasks, TimeLogs, ShareLinks.', assignee_id: 'usr-3',
          start_date: '2026-10-19', due_date: '2026-10-23', priority: 'medium', status: 'todo',
          estimate_hours: 5, is_milestone: true, visible_to_client: true, is_deleted: false,
          subtasks: []
        },
        {
          id: 'tsk-5', project_id: 'prj-2', parent_id: '', title: 'Integrasi Scanner Barcode Kamera HP',
          description: 'Testing modul kamera HTML5 pada perangkat Android.', assignee_id: 'usr-2',
          start_date: '2026-10-25', due_date: '2026-10-29', priority: 'medium', status: 'todo',
          estimate_hours: 10, is_milestone: true, visible_to_client: true, is_deleted: false,
          subtasks: []
        }
      ],
      timeLogs: [
        { id: 'log-1', task_id: 'tsk-1', project_id: 'prj-1', user_id: 'usr-3', start_time: '2026-10-20T09:00:00+07:00', end_time: '2026-10-20T14:30:00+07:00', duration_minutes: 330, is_manual: false, note: 'Selesai wireframe v1', created_at: '2026-10-20T14:30:00+07:00' },
        { id: 'log-2', task_id: 'tsk-3', project_id: 'prj-1', user_id: 'usr-2', start_time: '2026-10-22T10:00:00+07:00', end_time: '2026-10-22T13:45:00+07:00', duration_minutes: 225, is_manual: false, note: 'Kompresi WebP selesai', created_at: '2026-10-22T13:45:00+07:00' },
        { id: 'log-3', task_id: 'tsk-2', project_id: 'prj-1', user_id: 'usr-2', start_time: '2026-10-23T13:00:00+07:00', end_time: '2026-10-23T16:00:00+07:00', duration_minutes: 180, is_manual: true, note: 'Rapat koordinasi skema ongkir bersama tim (lupa nyalakan timer)', created_at: '2026-10-23T16:05:00+07:00' },
        // Satu timer sedang berjalan
        { id: 'log-active-1', task_id: 'tsk-2', project_id: 'prj-1', user_id: 'usr-2', start_time: new Date(Date.now() - 42 * 60000).toISOString(), end_time: '', duration_minutes: 0, is_manual: false, note: 'Mengerjakan state keranjang', created_at: new Date().toISOString() }
      ],
      shareLinks: [
        {
          id: 'sh-1', project_id: 'prj-1', token: 'trk_demo_32chars_token_9988776655',
          pin_hash: '', show_hours: true, show_workers: true, show_notes: true,
          expires_at: '2026-12-31', is_active: true, view_count: 14, last_viewed_at: '2026-10-24T07:45:00+07:00'
        },
        {
          id: 'sh-2', project_id: 'prj-2', token: 'trk_protected_pin_token_11223344',
          pin_hash: '1234', show_hours: false, show_workers: true, show_notes: false,
          expires_at: '2026-12-31', is_active: true, view_count: 5, last_viewed_at: '2026-10-23T19:12:00+07:00'
        }
      ],
      comments: [
        { id: 'cm-1', task_id: 'tsk-2', user_id: 'usr-1', body: 'Pastikan diskon voucher juga terhitung otomatis ya.', created_at: '2026-10-23T15:20:00+07:00' }
      ]
    };
