/* ==========================================================
   i18n.js — Ductions
   Enam bahasa: English, Español, Português, Nederlands,
   हिन्दी (India), Indonesia (default).

   Cara pakai:
     1. Elemen HTML: <span data-i18n="kunci"></span>
        Atribut:      <input data-i18n-ph="kunci">
                      <button data-i18n-title="kunci">
     2. JavaScript:  t('kunci')  atau  t('kunci', {n: 5})
     3. Ganti bahasa: gantiBahasa('en')

   Dimuat SEBELUM render supaya tidak ada kedip teks
   (blocking, sama pola dengan tema.js).
   ========================================================== */
(function (root) {
  'use strict';

  var KUNCI_SIMPAN = 'ductions_bahasa';

  /* --------------------------------------------------------
     1. DAFTAR BAHASA
     -------------------------------------------------------- */
  var BAHASA = [
    { kode: 'id', label: 'Bahasa Indonesia', singkat: 'ID', bendera: '🇮🇩' },
    { kode: 'en', label: 'English',          singkat: 'EN', bendera: '🇬🇧' },
    { kode: 'es', label: 'Español',          singkat: 'ES', bendera: '🇪🇸' },
    { kode: 'pt', label: 'Português',        singkat: 'PT', bendera: '🇧🇷' },
    { kode: 'nl', label: 'Nederlands',       singkat: 'NL', bendera: '🇳🇱' },
    { kode: 'hi', label: 'हिन्दी (India)',    singkat: 'HI', bendera: '🇮🇳' }
  ];

  /* --------------------------------------------------------
     2. KAMUS. Struktur: kamus[kunci][kodeBahasa]
        Baris pertama (id) adalah acuan; kalau terjemahan
        kosong, otomatis jatuh ke bahasa Inggris lalu ke id.
     -------------------------------------------------------- */
  var kamus = {
    /* ---- Navigasi ---- */
    'nav.dashboard':      { id: 'Dasbor Ringkasan',   en: 'Dashboard',          es: 'Panel',              pt: 'Painel',             nl: 'Dashboard',         hi: 'डैशबोर्ड' },
    'nav.timeline':       { id: 'Timeline Proyek',    en: 'Project Timeline',   es: 'Cronograma',         pt: 'Cronograma',         nl: 'Projecttijdlijn',   hi: 'परियोजना समयरेखा' },
    'nav.todo':           { id: 'Tugas Saya (To Do)', en: 'My Tasks (To Do)',   es: 'Mis Tareas',         pt: 'Minhas Tarefas',     nl: 'Mijn Taken',        hi: 'मेरे कार्य' },
    'nav.projects':       { id: 'Proyek & Link Klien',en: 'Projects & Clients', es: 'Proyectos y Clientes',pt: 'Projetos e Clientes',nl: 'Projecten & Klanten',hi: 'परियोजनाएँ और ग्राहक' },
    'nav.timesheet':      { id: 'Timesheet & Laporan',en: 'Timesheet & Reports',es: 'Horas y Reportes',   pt: 'Horas e Relatórios', nl: 'Uren & Rapporten',  hi: 'टाइमशीट और रिपोर्ट' },
    'nav.users':          { id: 'Kelola Pengguna',    en: 'Manage Users',       es: 'Usuarios',           pt: 'Usuários',           nl: 'Gebruikers',        hi: 'उपयोगकर्ता' },

    /* ---- Header & Profil ---- */
    'umum.memuat':        { id: 'Memuat…',            en: 'Loading…',           es: 'Cargando…',          pt: 'Carregando…',        nl: 'Laden…',            hi: 'लोड हो रहा है…' },
    'umum.sandi':         { id: 'Sandi',              en: 'Password',           es: 'Contraseña',         pt: 'Senha',              nl: 'Wachtwoord',        hi: 'पासवर्ड' },
    'umum.keluar':        { id: 'Keluar',             en: 'Sign out',           es: 'Salir',              pt: 'Sair',               nl: 'Uitloggen',         hi: 'साइन आउट' },
    'umum.batal':         { id: 'Batal',              en: 'Cancel',             es: 'Cancelar',           pt: 'Cancelar',           nl: 'Annuleren',         hi: 'रद्द करें' },
    'umum.simpan':        { id: 'Simpan',             en: 'Save',               es: 'Guardar',            pt: 'Salvar',             nl: 'Opslaan',           hi: 'सहेजें' },
    'umum.hapus':         { id: 'Hapus',              en: 'Delete',             es: 'Eliminar',           pt: 'Excluir',            nl: 'Verwijderen',       hi: 'हटाएँ' },
    'umum.edit':          { id: 'Edit',               en: 'Edit',               es: 'Editar',             pt: 'Editar',             nl: 'Bewerken',          hi: 'संपादित करें' },
    'umum.tutup':         { id: 'Tutup',              en: 'Close',              es: 'Cerrar',             pt: 'Fechar',             nl: 'Sluiten',           hi: 'बंद करें' },
    'umum.tambah':        { id: 'Tambah',             en: 'Add',                es: 'Añadir',             pt: 'Adicionar',          nl: 'Toevoegen',         hi: 'जोड़ें' },
    'umum.cari':          { id: 'Cari',               en: 'Search',             es: 'Buscar',             pt: 'Buscar',             nl: 'Zoeken',            hi: 'खोजें' },
    'umum.semua':         { id: 'Semua',              en: 'All',                es: 'Todos',              pt: 'Todos',              nl: 'Alle',              hi: 'सभी' },
    'umum.manual':        { id: 'Manual',             en: 'Manual',             es: 'Manual',             pt: 'Manual',             nl: 'Handmatig',         hi: 'मैनुअल' },
    'umum.madeby':        { id: 'Made by',            en: 'Made by',            es: 'Hecho por',          pt: 'Feito por',          nl: 'Gemaakt door',      hi: 'निर्माता' },
    'umum.bahasa':        { id: 'Bahasa',             en: 'Language',           es: 'Idioma',             pt: 'Idioma',             nl: 'Taal',              hi: 'भाषा' },
    'umum.tema':          { id: 'Ganti tema',         en: 'Toggle theme',       es: 'Cambiar tema',       pt: 'Alternar tema',      nl: 'Thema wisselen',    hi: 'थीम बदलें' },

    /* ---- Halaman: Dasbor ---- */
    'dasbor.judul':       { id: 'Dasbor Ringkasan Eksekutif', en: 'Executive Dashboard', es: 'Panel Ejecutivo', pt: 'Painel Executivo', nl: 'Directieoverzicht', hi: 'कार्यकारी डैशबोर्ड' },
    'dasbor.prioritas':   { id: 'Prioritas Hari Ini', en: "Today's Priorities", es: 'Prioridades de Hoy', pt: 'Prioridades de Hoje', nl: 'Prioriteiten van Vandaag', hi: 'आज की प्राथमिकताएँ' },
    'dasbor.perhatian':   { id: 'Perlu Perhatian Segera', en: 'Needs Attention', es: 'Requiere Atención', pt: 'Precisa de Atenção', nl: 'Vraagt Aandacht', hi: 'ध्यान दें' },
    'dasbor.timer':       { id: 'Timer Berjalan Tim', en: 'Team Running Timers', es: 'Cronómetros Activos', pt: 'Cronômetros Ativos', nl: 'Actieve Timers', hi: 'चालू टाइमर' },
    'dasbor.tidakadattimer': { id: 'Tidak ada timer aktif', en: 'No active timer', es: 'Sin cronómetro activo', pt: 'Nenhum cronômetro ativo', nl: 'Geen actieve timer', hi: 'कोई सक्रिय टाइमर नहीं' },
    'dasbor.bekerja':     { id: 'Pekerja sedang aktif bekerja', en: 'Worker is actively working', es: 'Trabajador activo', pt: 'Colaborador ativo', nl: 'Medewerker is aan het werk', hi: 'कर्मचारी काम कर रहा है' },
    'dasbor.proyekaktif': { id: 'Proyek Aktif',       en: 'Active Projects',    es: 'Proyectos Activos',  pt: 'Projetos Ativos',    nl: 'Actieve Projecten', hi: 'सक्रिय परियोजनाएँ' },
    'dasbor.statusproyek':{ id: 'Status & Progres Proyek', en: 'Project Status & Progress', es: 'Estado y Progreso', pt: 'Status e Progresso', nl: 'Status & Voortgang', hi: 'स्थिति और प्रगति' },
    'dasbor.jamkerja':    { id: 'Jam Kerja Minggu Ini', en: 'Hours This Week',  es: 'Horas Esta Semana',  pt: 'Horas Esta Semana',  nl: 'Uren Deze Week',    hi: 'इस सप्ताह के घंटे' },
    'dasbor.jatuhTempo':  { id: 'Jatuh Tempo ≤ 2 Hari', en: 'Due ≤ 2 Days',     es: 'Vence ≤ 2 Días',     pt: 'Vence ≤ 2 Dias',     nl: 'Vervalt ≤ 2 Dagen', hi: 'नियत ≤ 2 दिन' },
    'dasbor.terlambat':   { id: 'Tugas Terlambat',    en: 'Overdue Tasks',      es: 'Tareas Atrasadas',   pt: 'Tarefas Atrasadas',  nl: 'Te Late Taken',     hi: 'विलंबित कार्य' },
    'dasbor.hentikan':    { id: 'Hentikan Sekarang',  en: 'Stop Now',           es: 'Detener Ahora',      pt: 'Parar Agora',        nl: 'Nu Stoppen',        hi: 'अभी रोकें' },

    /* ---- Halaman: Timeline ---- */
    'timeline.judul':     { id: 'Timeline Pekerjaan', en: 'Work Timeline',      es: 'Cronograma de Trabajo', pt: 'Cronograma de Trabalho', nl: 'Werktijdlijn', hi: 'कार्य समयरेखा' },
    'timeline.kalender':  { id: 'Tampilan Kalender',  en: 'Calendar View',      es: 'Vista Calendario',   pt: 'Visão Calendário',   nl: 'Kalenderweergave',  hi: 'कैलेंडर दृश्य' },
    'timeline.list':      { id: 'Tampilan List',      en: 'List View',          es: 'Vista Lista',        pt: 'Visão Lista',        nl: 'Lijstweergave',     hi: 'सूची दृश्य' },
    'timeline.semuaproyek':   { id: 'Semua Proyek',   en: 'All Projects',       es: 'Todos los Proyectos',pt: 'Todos os Projetos',  nl: 'Alle Projecten',    hi: 'सभी परियोजनाएँ' },
    'timeline.semuapekerja':  { id: 'Semua Pekerja',  en: 'All Workers',        es: 'Todos los Trabajadores', pt: 'Todos os Colaboradores', nl: 'Alle Medewerkers', hi: 'सभी कर्मचारी' },
    'timeline.semuastatus':   { id: 'Semua Status',   en: 'All Statuses',       es: 'Todos los Estados',  pt: 'Todos os Status',    nl: 'Alle Statussen',    hi: 'सभी स्थितियाँ' },
    'timeline.caritugas':     { id: 'Cari judul tugas...', en: 'Search task title...', es: 'Buscar tarea...', pt: 'Buscar tarefa...', nl: 'Zoek taak...', hi: 'कार्य खोजें...' },
    'timeline.groupby':   { id: 'Kelompokkan Berdasarkan:', en: 'Group by:',     es: 'Agrupar por:',       pt: 'Agrupar por:',       nl: 'Groepeer op:',      hi: 'समूहबद्ध करें:' },
    'header.zona':     { id: 'Zona Waktu WIB (Asia/Jakarta)', en: 'WIB Timezone (Asia/Jakarta)', es: 'Zona Horaria WIB (Asia/Jakarta)', pt: 'Fuso Horário WIB (Asia/Jakarta)', nl: 'WIB-tijdzone (Asia/Jakarta)', hi: 'WIB समय क्षेत्र (एशिया/जकार्ता)' },
    'todo.terlambat':  { id: 'Terlambat (Overdue)', en: 'Overdue', es: 'Vencidas', pt: 'Atrasadas', nl: 'Te laat', hi: 'विलंबित' },
    'todo.hariini':    { id: 'Hari Ini', en: 'Today', es: 'Hoy', pt: 'Hoje', nl: 'Vandaag', hi: 'आज' },
    'todo.mingguini':  { id: 'Minggu Ini & Mendatang', en: 'This Week & Upcoming', es: 'Esta Semana y Próximas', pt: 'Esta Semana e Próximas', nl: 'Deze Week & Aankomend', hi: 'इस सप्ताह और आगामी' },
    'todo.selesai':    { id: 'Selesai (Done)', en: 'Done', es: 'Completadas', pt: 'Concluídas', nl: 'Voltooid', hi: 'पूर्ण' },
    'todo.buatpribadi': { id: 'Buat To Do Pribadi', en: 'Create Personal To Do', es: 'Crear To Do Personal', pt: 'Criar Tarefa Pessoal', nl: 'Persoonlijke To Do Maken', hi: 'व्यक्तिगत कार्य बनाएँ' },
    'todo.kanban':     { id: 'Papan Kanban', en: 'Kanban Board', es: 'Tablero Kanban', pt: 'Quadro Kanban', nl: 'Kanban-bord', hi: 'कानबन बोर्ड' },
    'todo.grupwaktu':  { id: 'Grup Waktu (Hari Ini / Minggu Ini)', en: 'Group by Time (Today / This Week)', es: 'Agrupar por Tiempo (Hoy / Esta Semana)', pt: 'Agrupar por Tempo (Hoje / Esta Semana)', nl: 'Groepeer op Tijd (Vandaag / Deze Week)', hi: 'समय के अनुसार समूह (आज / इस सप्ताह)' },
    'detail.judul':    { id: 'Detail Pekerjaan', en: 'Work Details', es: 'Detalles del Trabajo', pt: 'Detalhes do Trabalho', nl: 'Werkdetails', hi: 'कार्य विवरण' },

    'timeline.perproyek': { id: 'Per Proyek',         en: 'By Project',         es: 'Por Proyecto',       pt: 'Por Projeto',        nl: 'Per Project',       hi: 'परियोजना अनुसार' },
    'timeline.perpekerja':{ id: 'Per Pekerja',        en: 'By Worker',          es: 'Por Trabajador',     pt: 'Por Colaborador',    nl: 'Per Medewerker',    hi: 'कर्मचारी अनुसार' },
    'timeline.perstatus': { id: 'Per Status',         en: 'By Status',          es: 'Por Estado',         pt: 'Por Status',         nl: 'Per Status',        hi: 'स्थिति अनुसार' },
    'timeline.prioritas': { id: 'Prioritas Tertinggi',en: 'Highest Priority',   es: 'Mayor Prioridad',    pt: 'Maior Prioridade',   nl: 'Hoogste Prioriteit',hi: 'उच्चतम प्राथमिकता' },
    'timeline.dragdrop':  { id: 'Drag & Drop',        en: 'Drag & Drop',        es: 'Arrastrar y Soltar', pt: 'Arrastar e Soltar',  nl: 'Slepen',            hi: 'खींचें और छोड़ें' },

    /* ---- Status tugas ---- */
    'status.todo':        { id: 'Belum Mulai',        en: 'To Do',              es: 'Por Hacer',          pt: 'A Fazer',            nl: 'Te Doen',           hi: 'करना है' },
    'status.progress':    { id: 'Dikerjakan',         en: 'In Progress',        es: 'En Progreso',        pt: 'Em Andamento',       nl: 'In Behandeling',    hi: 'प्रगति में' },
    'status.review':      { id: 'Review',             en: 'Review',             es: 'Revisión',           pt: 'Revisão',            nl: 'Beoordeling',       hi: 'समीक्षा' },
    'status.done':        { id: 'Selesai',            en: 'Done',               es: 'Hecho',              pt: 'Concluído',          nl: 'Klaar',             hi: 'पूर्ण' },
    'prioritas.low':      { id: 'Rendah',             en: 'Low',                es: 'Baja',               pt: 'Baixa',              nl: 'Laag',              hi: 'कम' },
    'prioritas.medium':   { id: 'Sedang',             en: 'Medium',             es: 'Media',              pt: 'Média',              nl: 'Gemiddeld',         hi: 'मध्यम' },
    'prioritas.high':     { id: 'Tinggi',             en: 'High',               es: 'Alta',               pt: 'Alta',               nl: 'Hoog',              hi: 'उच्च' },
    'prioritas.urgent':   { id: 'Mendesak',           en: 'Urgent',             es: 'Urgente',            pt: 'Urgente',            nl: 'Urgent',            hi: 'अत्यावश्यक' },

    /* ---- Proyek & Klien ---- */
    'proyek.judul':       { id: 'Daftar Proyek & URL Tracking Klien', en: 'Projects & Client Tracking URLs', es: 'Proyectos y Enlaces de Cliente', pt: 'Projetos e Links de Cliente', nl: 'Projecten & Klantlinks', hi: 'परियोजनाएँ और ग्राहक लिंक' },
    'proyek.baru':        { id: 'Proyek Baru',        en: 'New Project',        es: 'Nuevo Proyecto',     pt: 'Novo Projeto',       nl: 'Nieuw Project',     hi: 'नई परियोजना' },
    'proyek.kelolaproyek':{ id: 'Kelola Proyek',      en: 'Manage Projects',    es: 'Gestionar Proyectos',pt: 'Gerenciar Projetos', nl: 'Projecten Beheren', hi: 'परियोजनाएँ प्रबंधित करें' },
    'tugas.baru':         { id: 'Tugas Baru',         en: 'New Task',           es: 'Nueva Tarea',        pt: 'Nova Tarefa',        nl: 'Nieuwe Taak',       hi: 'नया कार्य' },

    /* ---- Timesheet ---- */
    'timesheet.judul':    { id: 'Timesheet & Laporan',en: 'Timesheet & Reports',es: 'Horas y Reportes',   pt: 'Horas e Relatórios', nl: 'Uren & Rapporten',  hi: 'टाइमशीट और रिपोर्ट' },
    'timesheet.logmanual':{ id: '+ Log Waktu Manual', en: '+ Manual Time Log',  es: '+ Registro Manual',  pt: '+ Registro Manual',  nl: '+ Handmatige Registratie', hi: '+ मैनुअल समय लॉग' },
    'timesheet.eksporcsv':{ id: 'Ekspor CSV',         en: 'Export CSV',         es: 'Exportar CSV',       pt: 'Exportar CSV',       nl: 'CSV Exporteren',    hi: 'CSV निर्यात करें' },
    'timesheet.aksi':     { id: 'Aksi',               en: 'Action',             es: 'Acción',             pt: 'Ação',               nl: 'Actie',             hi: 'क्रिया' },
    'timesheet.durasi':   { id: 'Durasi',             en: 'Duration',           es: 'Duración',           pt: 'Duração',            nl: 'Duur',              hi: 'अवधि' },
    'timesheet.catatan':  { id: 'Catatan / Alasan Manual', en: 'Notes / Manual Reason', es: 'Notas / Motivo', pt: 'Notas / Motivo',  nl: 'Notities / Reden',  hi: 'नोट / कारण' },

    /* ---- Pengguna ---- */
    'pengguna.judul':     { id: 'Kelola Pengguna',    en: 'Manage Users',       es: 'Gestionar Usuarios', pt: 'Gerenciar Usuários', nl: 'Gebruikers Beheren',hi: 'उपयोगकर्ता प्रबंधन' },
    'pengguna.baru':      { id: 'Pengguna Baru',      en: 'New User',           es: 'Nuevo Usuario',      pt: 'Novo Usuário',       nl: 'Nieuwe Gebruiker',  hi: 'नया उपयोगकर्ता' },
    'pengguna.nama':      { id: 'Nama',               en: 'Name',               es: 'Nombre',             pt: 'Nome',               nl: 'Naam',              hi: 'नाम' },
    'pengguna.email':     { id: 'Email',              en: 'Email',              es: 'Correo',             pt: 'E-mail',             nl: 'E-mail',            hi: 'ईमेल' },
    'pengguna.peran':     { id: 'Peran',              en: 'Role',               es: 'Rol',                pt: 'Função',             nl: 'Rol',               hi: 'भूमिका' },
    'peran.admin':        { id: 'Admin',              en: 'Admin',              es: 'Admin',              pt: 'Admin',              nl: 'Beheerder',         hi: 'व्यवस्थापक' },
    'peran.worker':       { id: 'Pekerja',            en: 'Worker',             es: 'Trabajador',         pt: 'Colaborador',        nl: 'Medewerker',        hi: 'कर्मचारी' },

    /* ---- Modal tugas ---- */
    'modal.judul':        { id: 'Judul Modal',        en: 'Task Title',         es: 'Título de Tarea',    pt: 'Título da Tarefa',   nl: 'Taaktitel',         hi: 'कार्य शीर्षक' },
    'modal.detail':       { id: 'Detail Pekerjaan',   en: 'Task Details',       es: 'Detalles',           pt: 'Detalhes',           nl: 'Taakdetails',       hi: 'कार्य विवरण' },
    'modal.deskripsi':    { id: 'Deskripsi',          en: 'Description',        es: 'Descripción',        pt: 'Descrição',          nl: 'Beschrijving',      hi: 'विवरण' },
    'modal.tenggat':      { id: 'Tenggat',            en: 'Due Date',           es: 'Fecha Límite',       pt: 'Prazo',              nl: 'Vervaldatum',       hi: 'नियत तिथि' },
    'modal.mulai':        { id: 'Tanggal Mulai',      en: 'Start Date',         es: 'Fecha Inicio',       pt: 'Data Início',        nl: 'Startdatum',        hi: 'प्रारंभ तिथि' },
    'modal.prioritas':    { id: 'Prioritas',          en: 'Priority',           es: 'Prioridad',          pt: 'Prioridade',         nl: 'Prioriteit',        hi: 'प्राथमिकता' },
    'modal.status':       { id: 'Status',             en: 'Status',             es: 'Estado',             pt: 'Status',             nl: 'Status',            hi: 'स्थिति' },
    'modal.pic':          { id: 'Penanggung Jawab',   en: 'Assignee',           es: 'Asignado',           pt: 'Responsável',        nl: 'Toegewezen aan',    hi: 'सौंपा गया' },
    'modal.milestone':    { id: 'Milestone',          en: 'Milestone',          es: 'Hito',               pt: 'Marco',              nl: 'Mijlpaal',          hi: 'मील का पत्थर' },
    'modal.tampilklien':  { id: 'Tampilkan ke Klien', en: 'Show to Client',     es: 'Mostrar al Cliente', pt: 'Mostrar ao Cliente', nl: 'Toon aan Klant',    hi: 'ग्राहक को दिखाएँ' },

    /* ---- Login ---- */
    'login.judul':        { id: 'Masuk — Ductions',   en: 'Sign in — Ductions', es: 'Iniciar Sesión — Ductions', pt: 'Entrar — Ductions', nl: 'Inloggen — Ductions', hi: 'साइन इन — Ductions' },
    'login.selamat':      { id: 'Selamat Datang',     en: 'Welcome Back',       es: 'Bienvenido',         pt: 'Bem-vindo',          nl: 'Welkom Terug',      hi: 'स्वागत है' },
    'login.email':        { id: 'Email Pengguna',     en: 'User Email',         es: 'Correo del Usuario', pt: 'E-mail do Usuário',  nl: 'E-mailadres',       hi: 'उपयोगकर्ता ईमेल' },
    'login.sandi':        { id: 'Kata Sandi',         en: 'Password',           es: 'Contraseña',         pt: 'Senha',              nl: 'Wachtwoord',        hi: 'पासवर्ड' },
    'login.masuk':        { id: 'Masuk ke Aplikasi',  en: 'Sign In',            es: 'Entrar',             pt: 'Entrar',             nl: 'Inloggen',          hi: 'साइन इन करें' },
    'login.deskripsi':    { id: 'Satu sumber kebenaran untuk jadwal proyek, timer jam kerja, dan laporan progres real-time klien.',
                            en: 'One source of truth for project schedules, work timers, and real-time client progress reports.',
                            es: 'Una única fuente de verdad para cronogramas, cronómetros y reportes de progreso en tiempo real.',
                            pt: 'Uma única fonte de verdade para cronogramas, cronômetros e relatórios de progresso em tempo real.',
                            nl: 'Eén bron van waarheid voor projectschema\'s, werktimers en realtime voortgangsrapporten.',
                            hi: 'परियोजना समय-सारणी, कार्य टाइमर और रीयल-टाइम ग्राहक प्रगति रिपोर्ट के लिए एक ही स्रोत।' },
    'login.ingat':        { id: 'Ingat sesi saya (8 Jam)', en: 'Remember me (8 hours)', es: 'Recordarme (8 horas)', pt: 'Lembrar de mim (8 horas)', nl: 'Onthoud mij (8 uur)', hi: 'मुझे याद रखें (8 घंटे)' },
    'login.tagline':      { id: 'LIGHTWEIGHT WORK MANAGEMENT', en: 'LIGHTWEIGHT WORK MANAGEMENT', es: 'GESTIÓN DE TRABAJO LIGERA', pt: 'GESTÃO DE TRABALHO LEVE', nl: 'LICHT PROJECTBEHEER', hi: 'हल्का कार्य प्रबंधन' },
    'login.tagline2':     { id: 'FOR FREELANCERS & AGENCIES', en: 'FOR FREELANCERS & AGENCIES', es: 'PARA FREELANCERS Y AGENCIAS', pt: 'PARA FREELANCERS E AGÊNCIAS', nl: 'VOOR FREELANCERS & BUREAUS', hi: 'फ्रीलांसर और एजेंसियों के लिए' },

    /* ---- Kesalahan umum ---- */

    /* ---- Halaman & umum ---- */
    'halaman.dasbor.judul': { id: 'Dasbor Ringkasan Eksekutif', en: 'Executive Summary Dashboard', es: 'Panel Resumen Ejecutivo', pt: 'Painel Resumo Executivo', nl: 'Uitvoerend Overzicht', hi: 'कार्यकारी सारांश डैशबोर्ड' },
    'halaman.dasbor.proyekaktif': { id: 'Proyek Aktif', en: 'Active Projects', es: 'Proyectos Activos', pt: 'Projetos Ativos', nl: 'Actieve Projecten', hi: 'सक्रिय परियोजनाएँ' },
    'halaman.dasbor.tugasterlambat': { id: 'Tugas Terlambat', en: 'Overdue Tasks', es: 'Tareas Vencidas', pt: 'Tarefas Atrasadas', nl: 'Achterstallige Taken', hi: 'विलंबित कार्य' },
    'halaman.dasbor.timerberjalan': { id: 'Timer Berjalan Tim', en: 'Team Running Timers', es: 'Cronómetros del Equipo', pt: 'Cronômetros da Equipe', nl: 'Lopende Teamtimers', hi: 'टीम टाइमर चालू' },
    'halaman.dasbor.pekerjaaktif': { id: 'Pekerja sedang aktif bekerja', en: 'Team members are working now', es: 'Miembros del equipo trabajando ahora', pt: 'Membros da equipe trabalhando agora', nl: 'Teamleden werken nu', hi: 'टीम सदस्य अभी काम कर रहे हैं' },
    'halaman.dasbor.jamkerja': { id: 'Jam Kerja Minggu Ini', en: 'Hours This Week', es: 'Horas Esta Semana', pt: 'Horas Esta Semana', nl: 'Uren Deze Week', hi: 'इस सप्ताह के घंटे' },
    'halaman.dasbor.statusprogres': { id: 'Status & Progres Proyek', en: 'Project Status & Progress', es: 'Estado y Progreso del Proyecto', pt: 'Status e Progresso do Projeto', nl: 'Projectstatus & Voortgang', hi: 'परियोजना स्थिति और प्रगति' },
    'halaman.dasbor.kelola': { id: 'Kelola Proyek', en: 'Manage Projects', es: 'Gestionar Proyectos', pt: 'Gerenciar Projetos', nl: 'Projecten Beheren', hi: 'परियोजनाएँ प्रबंधित करें' },
    'halaman.dasbor.perluperhatian': { id: 'Perlu Perhatian Segera', en: 'Needs Immediate Attention', es: 'Requiere Atención Inmediata', pt: 'Precisa de Atenção Imediata', nl: 'Vraagt Direct Aandacht', hi: 'तत्काल ध्यान चाहिए' },
    'halaman.dasbor.detail': { id: 'Detail Pekerjaan', en: 'Work Details', es: 'Detalles del Trabajo', pt: 'Detalhes do Trabalho', nl: 'Werkdetails', hi: 'कार्य विवरण' },
    'halaman.dasbor.manual': { id: 'MANUAL', en: 'MANUAL', es: 'MANUAL', pt: 'MANUAL', nl: 'HANDMATIG', hi: 'मैनुअल' },
    'halaman.dasbor.tugasbaru': { id: 'TUGAS BARU', en: 'NEW TASK', es: 'NUEVA TAREA', pt: 'NOVA TAREA', nl: 'NIEUWE TAAK', hi: 'नया कार्य' },
    'halaman.dasbor.hentikan': { id: 'Hentikan Sekarang', en: 'Stop Now', es: 'Detener Ahora', pt: 'Parar Agora', nl: 'Nu Stoppen', hi: 'अभी रोकें' },
    'halaman.timeline.judul': { id: 'Timeline Proyek', en: 'Project Timeline', es: 'Cronograma del Proyecto', pt: 'Linha do Tempo do Projeto', nl: 'Projecttijdlijn', hi: 'परियोजना समयरेखा' },
    'halaman.todo.judul': { id: 'Tugas Saya', en: 'My Tasks', es: 'Mis Tareas', pt: 'Minhas Tarefas', nl: 'Mijn Taken', hi: 'मेरे कार्य' },
    'halaman.projects.judul': { id: 'Proyek & Link Klien', en: 'Projects & Client Links', es: 'Proyectos y Enlaces de Cliente', pt: 'Projetos e Links de Clientes', nl: 'Projecten & Klantlinks', hi: 'परियोजनाएँ और क्लाइंट लिंक' },
    'halaman.timesheet.judul': { id: 'Timesheet & Laporan', en: 'Timesheet & Reports', es: 'Horas y Reportes', pt: 'Planilha de Horas e Relatórios', nl: 'Urenregistratie & Rapporten', hi: 'टाइमशीट और रिपोर्ट' },
    'halaman.users.judul': { id: 'Kelola Pengguna', en: 'Manage Users', es: 'Gestionar Usuarios', pt: 'Gerenciar Usuários', nl: 'Gebruikers Beheren', hi: 'उपयोगकर्ता प्रबंधित करें' },
    'umum.keluar': { id: 'Keluar', en: 'Log Out', es: 'Salir', pt: 'Sair', nl: 'Uitloggen', hi: 'साइन आउट' },
    'umum.sandi': { id: 'Sandi', en: 'Password', es: 'Contraseña', pt: 'Senha', nl: 'Wachtwoord', hi: 'पासवर्ड' },
    'umum.memuat': { id: 'Memuat…', en: 'Loading…', es: 'Cargando…', pt: 'Carregando…', nl: 'Laden…', hi: 'लोड हो रहा है…' },
    'umum.madeby': { id: 'Dibuat oleh', en: 'Made by', es: 'Hecho por', pt: 'Feito por', nl: 'Gemaakt door', hi: 'द्वारा निर्मित' },
    'umum.bahasa': { id: 'Bahasa', en: 'Language', es: 'Idioma', pt: 'Idioma', nl: 'Taal', hi: 'भाषा' },
    'umum.tema': { id: 'Ganti tema', en: 'Toggle theme', es: 'Cambiar tema', pt: 'Alternar tema', nl: 'Thema wisselen', hi: 'थीम बदलें' },

    'share.status':    { id: 'STATUS', en: 'STATUS', es: 'ESTADO', pt: 'STATUS', nl: 'STATUS', hi: 'स्थिति' },
    'share.klien':     { id: 'Klien', en: 'Client', es: 'Cliente', pt: 'Cliente', nl: 'Klant', hi: 'ग्राहक' },
    'share.update':    { id: 'Update Terakhir', en: 'Last Update', es: 'Última Actualización', pt: 'Última Atualização', nl: 'Laatste Update', hi: 'अंतिम अपडेट' },
    'share.milestone': { id: 'Milestone Utama Proyek', en: 'Key Project Milestones', es: 'Hitos Principales del Proyecto', pt: 'Marcos Principais do Projeto', nl: 'Belangrijkste Projectmijlpalen', hi: 'मुख्य परियोजना माइलस्टोन' },
    'share.rincian':   { id: 'Rincian Progres Pekerjaan', en: 'Work Progress Details', es: 'Detalles del Progreso del Trabajo', pt: 'Detalhes do Progresso do Trabalho', nl: 'Details van de Werkvoortgang', hi: 'कार्य प्रगति विवरण' },
    'share.tanpamilestone': { id: 'Belum ada milestone yang dibagikan ke klien.', en: 'No milestones have been shared with the client yet.', es: 'Aún no se han compartido hitos con el cliente.', pt: 'Nenhum marco foi compartilhado com o cliente ainda.', nl: 'Er zijn nog geen mijlpalen met de klant gedeeld.', hi: 'अभी तक ग्राहक के साथ कोई माइलस्टोन साझा नहीं किया गया।' },

    'share.judul':    { id: 'Laporan Progres Proyek', en: 'Project Progress Report', es: 'Informe de Progreso del Proyecto', pt: 'Relatório de Progresso do Projeto', nl: 'Projectvoortgangsrapport', hi: 'परियोजना प्रगति रिपोर्ट' },
    'share.kembali':  { id: 'Kembali ke App', en: 'Back to App', es: 'Volver a la App', pt: 'Voltar ao App', nl: 'Terug naar App', hi: 'ऐप पर वापस' },
    'share.pinjudul': { id: 'Tautan Dilindungi PIN', en: 'PIN Protected Link', es: 'Enlace Protegido con PIN', pt: 'Link Protegido por PIN', nl: 'PIN-beveiligde Link', hi: 'पिन सुरक्षित लिंक' },
    'share.pinpesan': { id: 'Masukkan 4-6 digit PIN dari Admin proyek untuk melihat progres pekerjaan.',
                        en: 'Enter the 4-6 digit PIN from the project Admin to view work progress.',
                        es: 'Ingresa el PIN de 4-6 dígitos del Administrador para ver el progreso.',
                        pt: 'Digite o PIN de 4-6 dígitos do Administrador para ver o progresso.',
                        nl: 'Voer de 4-6 cijferige PIN van de projectbeheerder in om de voortgang te bekijken.',
                        hi: 'कार्य प्रगति देखने के लिए प्रोजेक्ट एडमिन से 4-6 अंकों का पिन दर्ज करें।' },
    'share.buka':     { id: 'Buka', en: 'Open', es: 'Abrir', pt: 'Abrir', nl: 'Openen', hi: 'खोलें' },

    'galat404.judul':  { id: 'Halaman Tidak Ditemukan', en: 'Page Not Found', es: 'Página No Encontrada', pt: 'Página Não Encontrada', nl: 'Pagina Niet Gevonden', hi: 'पृष्ठ नहीं मिला' },
    'galat404.pesan':  { id: 'Alamat yang kamu buka tidak tersedia. Mungkin salah ketik atau tautannya sudah dipindahkan.',
                         en: 'The address you opened is unavailable. It may be mistyped or the link has moved.',
                         es: 'La dirección que abriste no está disponible. Puede estar mal escrita o el enlace se movió.',
                         pt: 'O endereço que você abriu não está disponível. Pode estar digitado errado ou o link foi movido.',
                         nl: 'Het adres dat je opende is niet beschikbaar. Mogelijk een typefout of de link is verplaatst.',
                         hi: 'आपके द्वारा खोला गया पता उपलब्ध नहीं है। संभवतः गलत टाइप हुआ है या लिंक हट गया है।' },
    'galat404.beranda': { id: 'Ke Beranda', en: 'Go Home', es: 'Ir al Inicio', pt: 'Ir para o Início', nl: 'Naar Start', hi: 'होम पर जाएँ' },

    'umum.tidakaktif':  { id: 'Tidak ada timer aktif', en: 'No active timer', es: 'Sin cronómetro activo', pt: 'Nenhum cronômetro ativo', nl: 'Geen actieve timer', hi: 'कोई सक्रिय टाइमर नहीं' },
    'umum.tugasbaru':   { id: 'Tugas Baru', en: 'New Task', es: 'Nueva Tarea', pt: 'Nova Tarefa', nl: 'Nieuwe Taak', hi: 'नया कार्य' },
    'umum.proyekbaru':  { id: 'Proyek Baru', en: 'New Project', es: 'Nuevo Proyecto', pt: 'Novo Projeto', nl: 'Nieuw Project', hi: 'नई परियोजना' },
    'halaman.proyek.sub':    { id: 'Daftar Proyek & URL Tracking Klien', en: 'Project List & Client Tracking URLs', es: 'Lista de Proyectos y URLs de Seguimiento', pt: 'Lista de Projetos e URLs de Acompanhamento', nl: 'Projectlijst & Klanttracking-URL\'s', hi: 'परियोजना सूची और ग्राहक ट्रैकिंग URL' },
    'halaman.pengguna.sub':  { id: 'Manajemen Pengguna & Hak Akses', en: 'User Management & Access Rights', es: 'Gestión de Usuarios y Permisos', pt: 'Gestão de Usuários e Permissões', nl: 'Gebruikersbeheer & Toegangsrechten', hi: 'उपयोगकर्ता प्रबंधन और पहुँच अधिकार' },
    'halaman.pengguna.tambah': { id: 'Tambah Pengguna', en: 'Add User', es: 'Agregar Usuario', pt: 'Adicionar Usuário', nl: 'Gebruiker Toevoegen', hi: 'उपयोगकर्ता जोड़ें' },
    'halaman.pengguna.tarif':  { id: 'Tarif / Jam', en: 'Rate / Hour', es: 'Tarifa / Hora', pt: 'Tarifa / Hora', nl: 'Tarief / Uur', hi: 'दर / घंटा' },
    'halaman.timesheet.sub':   { id: 'Riwayat Pencatatan Waktu (TimeLogs)', en: 'Time Log History', es: 'Historial de Registro de Tiempo', pt: 'Histórico de Registro de Tempo', nl: 'Tijdregistratiegeschiedenis', hi: 'समय लॉग इतिहास' },
    'halaman.timesheet.tanggal': { id: 'Tanggal & Waktu', en: 'Date & Time', es: 'Fecha y Hora', pt: 'Data e Hora', nl: 'Datum & Tijd', hi: 'तिथि और समय' },
    'halaman.timesheet.proyektugas': { id: 'Proyek & Tugas', en: 'Project & Task', es: 'Proyecto y Tarea', pt: 'Projeto e Tarefa', nl: 'Project & Taak', hi: 'परियोजना और कार्य' },
    'filter.proyek':    { id: 'Proyek:', en: 'Project:', es: 'Proyecto:', pt: 'Projeto:', nl: 'Project:', hi: 'परियोजना:' },

    'filter.semuaproyek':  { id: 'Semua Proyek', en: 'All Projects', es: 'Todos los Proyectos', pt: 'Todos os Projetos', nl: 'Alle Projecten', hi: 'सभी परियोजनाएँ' },
    'filter.semuapekerja': { id: 'Semua Pekerja', en: 'All Workers', es: 'Todos los Trabajadores', pt: 'Todos os Trabalhadores', nl: 'Alle Medewerkers', hi: 'सभी कर्मचारी' },
    'filter.semuastatus':  { id: 'Semua Status', en: 'All Statuses', es: 'Todos los Estados', pt: 'Todos os Status', nl: 'Alle Statussen', hi: 'सभी स्थितियाँ' },
    'filter.caritugas':    { id: 'Cari judul tugas...', en: 'Search task title...', es: 'Buscar título de tarea...', pt: 'Buscar título da tarefa...', nl: 'Zoek taaktitel...', hi: 'कार्य शीर्षक खोजें...' },
    'timeline.tip':        { id: 'Klik tugas untuk membuka detail & sub-tugas. Admin dapat melakukan Drag & Drop tugas di kalender untuk menggeser tanggal.',
                             en: 'Click a task to open details & subtasks. Admins can drag & drop tasks on the calendar to shift dates.',
                             es: 'Haz clic en una tarea para abrir detalles y subtareas. Los administradores pueden arrastrar y soltar tareas en el calendario para cambiar fechas.',
                             pt: 'Clique numa tarefa para abrir detalhes e subtarefas. Admins podem arrastar e soltar tarefas no calendário para mudar datas.',
                             nl: 'Klik op een taak om details en subtaken te openen. Beheerders kunnen taken slepen op de kalender om datums te verschuiven.',
                             hi: 'विवरण और उप-कार्य खोलने के लिए कार्य पर क्लिक करें। एडमिन कैलेंडर पर कार्य खींचकर तारीखें बदल सकते हैं।' },
    'timeline.tampilankalender': { id: 'Tampilan Kalender', en: 'Calendar View', es: 'Vista de Calendario', pt: 'Visualização de Calendário', nl: 'Kalenderweergave', hi: 'कैलेंडर दृश्य' },
    'timeline.tampilanlist':     { id: 'Tampilan List', en: 'List View', es: 'Vista de Lista', pt: 'Visualização em Lista', nl: 'Lijstweergave', hi: 'सूची दृश्य' },
    'timeline.hariini':          { id: 'Hari Ini', en: 'Today', es: 'Hoy', pt: 'Hoje', nl: 'Vandaag', hi: 'आज' },
    'timeline.bulan':            { id: 'Bulan', en: 'Month', es: 'Mes', pt: 'Mês', nl: 'Maand', hi: 'महीना' },
    'timeline.minggu':           { id: 'Minggu', en: 'Week', es: 'Semana', pt: 'Semana', nl: 'Week', hi: 'सप्ताह' },
    'timeline.terlambat':        { id: 'Terlambat', en: 'Overdue', es: 'Vencido', pt: 'Atrasado', nl: 'Te laat', hi: 'विलंबित' },
    'timeline.jatuhTempo':       { id: 'Jatuh Tempo ≤ 2 Hari', en: 'Due ≤ 2 Days', es: 'Vence ≤ 2 Días', pt: 'Vence ≤ 2 Dias', nl: 'Vervalt ≤ 2 Dagen', hi: 'देय ≤ 2 दिन' },
    'timer.tidakaktif':          { id: 'Tidak ada timer aktif', en: 'No active timer', es: 'Sin cronómetro activo', pt: 'Nenhum cronômetro ativo', nl: 'Geen actieve timer', hi: 'कोई सक्रिय टाइमर नहीं' },

    'galat.jaringan':     { id: 'Gagal terhubung ke server.', en: 'Cannot reach the server.', es: 'No se puede conectar al servidor.', pt: 'Não foi possível conectar ao servidor.', nl: 'Kan geen verbinding maken met de server.', hi: 'सर्वर से कनेक्ट नहीं हो सका।' },
    'galat.simpan':       { id: 'Gagal menyimpan data.', en: 'Failed to save.',  es: 'Error al guardar.',  pt: 'Falha ao salvar.',   nl: 'Opslaan mislukt.',  hi: 'सहेजने में विफल।' },

    /* ---- Toast / notifikasi ---- */
    'toast.tugasbaru':    { id: 'Tugas baru berhasil dibuat!', en: 'New task created!', es: '¡Tarea creada!',   pt: 'Tarefa criada!',     nl: 'Nieuwe taak aangemaakt!', hi: 'नया कार्य बनाया गया!' },
    'toast.tugasdihapus': { id: 'Tugas dihapus.',     en: 'Task deleted.',      es: 'Tarea eliminada.',   pt: 'Tarefa excluída.',   nl: 'Taak verwijderd.',  hi: 'कार्य हटाया गया।' },
    'toast.proyekbaru':   { id: 'Proyek baru berhasil ditambahkan!', en: 'New project added!', es: '¡Proyecto añadido!', pt: 'Projeto adicionado!', nl: 'Nieuw project toegevoegd!', hi: 'नई परियोजना जोड़ी गई!' },
    'toast.proyekdihapus':{ id: 'Proyek dihapus.',    en: 'Project deleted.',   es: 'Proyecto eliminado.',pt: 'Projeto excluído.',  nl: 'Project verwijderd.',hi: 'परियोजना हटाई गई।' },
    'toast.timermulai':   { id: 'Timer dimulai! Waktu dicatat oleh server.', en: 'Timer started! Time is tracked by the server.', es: '¡Cronómetro iniciado!', pt: 'Cronômetro iniciado!', nl: 'Timer gestart!', hi: 'टाइमर शुरू!' },
    'toast.logmanual':    { id: 'Log waktu manual berhasil disimpan.', en: 'Manual time log saved.', es: 'Registro manual guardado.', pt: 'Registro manual salvo.', nl: 'Handmatige registratie opgeslagen.', hi: 'मैनुअल लॉग सहेजा गया।' }
  };

  /* --------------------------------------------------------
     3. STATE
     -------------------------------------------------------- */
  var bahasaAktif = 'id';

  function normalisasi(kode) {
    if (!kode) return null;
    kode = String(kode).toLowerCase().split('-')[0];
    for (var i = 0; i < BAHASA.length; i++) {
      if (BAHASA[i].kode === kode) return kode;
    }
    return null;
  }

  function bacaTersimpan() {
    try { return localStorage.getItem(KUNCI_SIMPAN); } catch (e) { return null; }
  }

  function tulisTersimpan(kode) {
    try { localStorage.setItem(KUNCI_SIMPAN, kode); } catch (e) {}
  }

  /* --------------------------------------------------------
     4. FUNGSI TERJEMAHAN
     -------------------------------------------------------- */
  function t(kunci, data) {
    var baris = kamus[kunci];
    if (!baris) return kunci;                       // kunci tidak dikenal → tampilkan apa adanya
    var teks = baris[bahasaAktif] || baris.en || baris.id || kunci;
    if (data) {
      teks = teks.replace(/\{(\w+)\}/g, function (m, k) {
        return data[k] !== undefined ? data[k] : m;
      });
    }
    return teks;
  }

  /* --------------------------------------------------------
     5. TERAPKAN KE DOM
        data-i18n        → textContent
        data-i18n-html   → innerHTML (hati-hati, hanya kamus sendiri)
        data-i18n-ph     → placeholder
        data-i18n-title  → title
        data-i18n-aria   → aria-label
     -------------------------------------------------------- */
  function terapkan(akar) {
    akar = akar || document;

    var el = akar.querySelectorAll('[data-i18n]');
    for (var i = 0; i < el.length; i++) {
      el[i].textContent = t(el[i].getAttribute('data-i18n'));
    }

    el = akar.querySelectorAll('[data-i18n-html]');
    for (var j = 0; j < el.length; j++) {
      el[j].innerHTML = t(el[j].getAttribute('data-i18n-html'));
    }

    el = akar.querySelectorAll('[data-i18n-ph]');
    for (var k = 0; k < el.length; k++) {
      el[k].setAttribute('placeholder', t(el[k].getAttribute('data-i18n-ph')));
    }

    el = akar.querySelectorAll('[data-i18n-title]');
    for (var m = 0; m < el.length; m++) {
      el[m].setAttribute('title', t(el[m].getAttribute('data-i18n-title')));
    }

    el = akar.querySelectorAll('[data-i18n-aria]');
    for (var n = 0; n < el.length; n++) {
      el[n].setAttribute('aria-label', t(el[n].getAttribute('data-i18n-aria')));
    }

    // <title> halaman
    var judul = document.querySelector('[data-i18n-doc-title]');
    if (judul) document.title = t(judul.getAttribute('data-i18n-doc-title'));

    // atribut lang pada <html> (penting untuk SEO & screen reader)
    document.documentElement.setAttribute('lang', bahasaAktif);
  }

  /* --------------------------------------------------------
     6. GANTI BAHASA
     -------------------------------------------------------- */
  function gantiBahasa(kode, tanpaSimpan) {
    var k = normalisasi(kode);
    if (!k) k = 'id';
    bahasaAktif = k;
    if (!tanpaSimpan) tulisTersimpan(k);
    terapkan(document);

    // beri tahu komponen lain (mis. render ulang tabel di app.js)
    try {
      document.dispatchEvent(new CustomEvent('bahasa:berubah', { detail: { kode: k } }));
    } catch (e) {}

    // perbarui label kode bahasa di semua pemilih
    var pemilih = document.querySelectorAll('[data-bahasa-picker]');
    for (var i = 0; i < pemilih.length; i++) labelPemilih(pemilih[i]);

    return k;
  }

  /* --------------------------------------------------------
     7. PEMILIH BAHASA (komponen siap pakai)
     -------------------------------------------------------- */
  function labelPemilih(target) {
    var lbl = target.querySelector('[data-bahasa-label]');
    if (!lbl) return;
    for (var i = 0; i < BAHASA.length; i++) {
      if (BAHASA[i].kode === bahasaAktif) { lbl.textContent = BAHASA[i].singkat; return; }
    }
  }

  function bangunPemilih(target) {
    var tiap = target.querySelector('[data-bahasa-target]');
    if (!tiap) return;

    var html = '';
    for (var i = 0; i < BAHASA.length; i++) {
      html += '<button type="button" class="brut-btn bg-white w-full justify-start px-2 py-1.5 text-xs gap-2'
            + ' bahasa-pil' + (BAHASA[i].kode === bahasaAktif ? ' aktif' : '')
            + '" data-kode="' + BAHASA[i].kode + '"'
            + (BAHASA[i].kode === bahasaAktif ? ' style="background:#E8FF6B"' : '') + '>'
            + '<span class="text-sm leading-none">' + BAHASA[i].bendera + '</span>'
            + '<span class="font-bold">' + BAHASA[i].label + '</span>'
            + '</button>';
    }
    tiap.innerHTML = html;
    labelPemilih(target);

    // Tandai opsi yang sedang aktif
    var opsi = tiap.querySelectorAll('.bahasa-pil');
    for (var o = 0; o < opsi.length; o++) {
      opsi[o].classList.toggle('aktif', opsi[o].getAttribute('data-kode') === bahasaAktif);
    }

    tiap.addEventListener('click', function (ev) {
      var b = ev.target.closest('.bahasa-pil');
      if (!b) return;
      gantiBahasa(b.getAttribute('data-kode'));
      target.classList.add('hidden');
      var semua = tiap.querySelectorAll('.bahasa-pil');
      for (var z = 0; z < semua.length; z++) {
        var aktif = semua[z].getAttribute('data-kode') === bahasaAktif;
        semua[z].classList.toggle('aktif', aktif);
        semua[z].style.background = aktif ? '#E8FF6B' : '';
      }
    });

    // Klik di luar → tutup
    document.addEventListener('click', function (ev) {
      if (!target.contains(ev.target)) target.classList.add('hidden');
    });
  }

  /* --------------------------------------------------------
     8. INISIALISASI
     -------------------------------------------------------- */
  function init() {
    var tersimpan = bacaTersimpan();
    var kode = normalisasi(tersimpan);

    if (!kode) {
      // Pertama kali: ikuti bahasa browser, kalau tidak cocok → Indonesia
      var nav = (navigator.language || navigator.userLanguage || 'id');
      kode = normalisasi(nav) || 'id';
    }

    bahasaAktif = kode;
    terapkan(document);

    // Pasang semua pemilih bahasa yang ada di halaman
    var pemilih = document.querySelectorAll('[data-bahasa-picker]');
    for (var i = 0; i < pemilih.length; i++) bangunPemilih(pemilih[i]);
  }

  /* --------------------------------------------------------
     9. EKSPOR
     -------------------------------------------------------- */
  root.DuctionsI18n = {
    BAHASA: BAHASA,
    t: t,
    gantiBahasa: gantiBahasa,
    bahasaAktif: function () { return bahasaAktif; },
    terapkan: terapkan,
    init: init
  };

  // Biar bisa dipanggil singkat: t('nav.dashboard')
  root.t = t;

  // Jalankan saat DOM siap
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})(typeof window !== 'undefined' ? window : globalThis);
