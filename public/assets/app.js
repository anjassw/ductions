/* ==========================================================================
   DUCTIONS — APP.JS
   State, utilitas, autentikasi, dan seluruh render UI tiap fitur.
   ========================================================================== */

    /* --------------------------------------------------------------
       i18n — pembungkus aman. Kalau i18n.js gagal dimuat, t() tetap
       mengembalikan teks aslinya sehingga aplikasi tidak ikut rusak.
       -------------------------------------------------------------- */
    const t = (kunci, bawaan, data) => {
      if (window.DuctionsI18n && typeof window.DuctionsI18n.t === 'function') {
        const hasil = window.DuctionsI18n.t(kunci);
        if (hasil !== kunci) return hasil;
      }
      return bawaan !== undefined ? bawaan : kunci;
    };
    /* --------------------------------------------------------------
       i18n — saat bahasa diganti, render ulang konten dinamis
       (tabel, kartu, kalender) supaya ikut bahasa baru.
       -------------------------------------------------------------- */
    document.addEventListener('bahasa:berubah', function () {
      try {
        if (typeof refreshCurrentPage === 'function' && state.currentUser) {
          refreshCurrentPage();
        } else if (state.currentTrackingToken && typeof openClientTrackPreview === 'function') {
          // portal tracking klien publik: render ulang konten
          openClientTrackPreview(state.currentTrackingToken, '');
        }
      } catch (e) {
        console.warn('[i18n] render ulang dilewati:', e.message);
      }
    });

    /**************************************************************
     * 4. STATE GLOBAL APLIKASI
     **************************************************************/
    const state = {
      currentUser: null,
      currentPage: 'dashboard',
      timelineMode: 'calendar',
      todoMode: 'grouped',
      calendarInstance: null,
      timerInterval: null,
      activeTaskDrawerId: null,
      currentTrackingToken: null,
      TODAY_STR: '2026-10-24' // Tanggal referensi sesuai konteks PRD
    };

    /**************************************************************
     * 5. UTILITAS KEAMANAN XSS & FORMATTER (BAB 9 PRD)
     **************************************************************/
    function esc(str) {
      if (str === null || str === undefined) return '';
      return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
    }

    function showToast(msg, type = 'info') {
      const colors = {
        info: 'bg-brut-yellow text-black',
        success: 'bg-brut-lime text-black',
        error: 'bg-brut-red text-white'
      };
      const el = document.createElement('div');
      el.className = `pointer-events-auto brut-border brut-shadow px-4 py-3 font-bold text-xs sm:text-sm flex items-center justify-between gap-3 ${colors[type] || colors.info}`;
      el.innerHTML = `<span>${esc(msg)}</span><button onclick="this.parentElement.remove()" class="font-mono font-extrabold underline">TUTUP</button>`;
      document.getElementById('toastContainer').appendChild(el);
      setTimeout(() => el.remove(), 4500);
    }

    /* Lokal tanggal mengikuti bahasa aktif (id, en, es, pt, nl, hi). */
    function localeAktif() {
      var k = (window.DuctionsI18n && window.DuctionsI18n.bahasaAktif) ? window.DuctionsI18n.bahasaAktif() : 'id';
      var peta = { id: 'id-ID', en: 'en-GB', es: 'es-ES', pt: 'pt-BR', nl: 'nl-NL', hi: 'hi-IN' };
      return peta[k] || 'id-ID';
    }

    function formatDateID(dateStr) {
      if (!dateStr) return '-';
      const d = new Date(dateStr);
      if (isNaN(d)) return dateStr;
      return d.toLocaleDateString(localeAktif(), { day: '2-digit', month: 'short', year: 'numeric' });
    }

    function formatMinutes(mins) {
      const m = Math.round(Number(mins) || 0);
      const h = Math.floor(m / 60);
      const rem = m % 60;
      return h > 0 ? `${h}j ${rem}m` : `${rem}m`;
    }

    function getTaskUrgency(task) {
      if (task.status === 'done') return 'normal';
      const today = new Date(state.TODAY_STR);
      const due = new Date(task.due_date);
      const diffDays = Math.ceil((due - today) / (1000 * 60 * 60 * 24));
      if (diffDays < 0) return 'overdue'; // Merah (FR-2.6)
      if (diffDays <= 2) return 'duesoon'; // Kuning (FR-2.6)
      return 'normal';
    }

    // Perhitungan Progres Proyek Otomatis (FR-2.7: Count vs Weighted)
    /* Bobot penyelesaian sebuah tugas (0..1).
       Tugas dengan checklist: skor = rasio sub-tugas tercentang.
       Tugas tanpa checklist: skor dari status (done = 1, sisanya 0).
       Tugas yang sudah `done` selalu dihitung penuh. */
    function skorTugas(t) {
      if (t.status === 'done') return 1;
      const subs = t.subtasks || [];
      if (!subs.length) return 0;
      return subs.filter(s => s.done).length / subs.length;
    }

    function calculateProjectProgress(projectId) {
      const prj = mockDB.projects.find(p => p.id === projectId);
      const tasks = mockDB.tasks.filter(t => t.project_id === projectId && !t.is_deleted);
      if (!tasks.length) return 0;
      if (prj && prj.progress_mode === 'weighted') {
        const totalEst = tasks.reduce((sum, t) => sum + (Number(t.estimate_hours) || 1), 0);
        const doneEst = tasks.reduce((sum, t) => sum + (Number(t.estimate_hours) || 1) * skorTugas(t), 0);
        return Math.round((doneEst / totalEst) * 100);
      }
      const totalSkor = tasks.reduce((sum, t) => sum + skorTugas(t), 0);
      return Math.round((totalSkor / tasks.length) * 100);
    }

    function getTaskActualHours(taskId) {
      const mins = mockDB.timeLogs
        .filter(l => l.task_id === taskId && l.end_time)
        .reduce((s, l) => s + (Number(l.duration_minutes) || 0), 0);
      return (mins / 60).toFixed(1);
    }

    /**************************************************************
     * 6. AUTENTIKASI & NAVIGASI PERAN (BAB 2 & 3.1)
     **************************************************************/
    function fillDemoLogin(email, pass) {
      document.getElementById('loginEmail').value = email;
      document.getElementById('loginPassword').value = pass;
      handleLogin(new Event('submit'));
    }

    async function handleLogin(e) {
      if (e && e.preventDefault) e.preventDefault();
      const email = document.getElementById('loginEmail').value.trim();
      const pass = document.getElementById('loginPassword').value;
      try {
        const res = await api.login(email, pass);
        sessionStorage.setItem('ductions_token', res.token);
        sessionStorage.setItem('ductions_user', JSON.stringify(res.user));
        sessionStorage.setItem('ductions_email', res.user.email);
        state.currentUser = res.user;
        await api.getBootstrapData();
        showToast(`Selamat datang, ${res.user.name}!`, 'success');
        location.replace(urlHalaman(res.user.role === 'admin' ? 'dashboard' : 'todo'));
      } catch (err) {
        showToast(err.message || String(err), 'error');
      }
    }

    function enterApp() {
      /* Multi-halaman: identitas dipasang oleh pasangIdentitas() di boot.js. */
      pasangIdentitas();
    }

    function handleLogout() {
      sessionStorage.removeItem('ductions_token');
      sessionStorage.removeItem('ductions_user');
      sessionStorage.removeItem('ductions_email');
      state.currentUser = null;
      if (state.timerInterval) clearInterval(state.timerInterval);
      showToast('Sesi Anda telah diakhiri.', 'info');
      setTimeout(() => location.replace('/login.php'), 500);
    }

    function toggleMobileMenu() {
      const nav = document.getElementById('navMenu');
      nav.classList.toggle('hidden');
      nav.classList.toggle('flex');
    }

    function navigate(page) {
      /* Multi-halaman: tiap fitur punya URL sendiri. */
      if (page && page !== state.currentPage) {
        location.href = urlHalaman(page);
        return;
      }
      state.currentPage = page;
      const judul = document.getElementById('pageTitle');
      if (judul) judul.textContent = JUDUL_HALAMAN[page] || 'Ductions';
    }

    function populateFilterDropdowns() {
      const prjOpts = ['<option value="ALL">' + t('filter.semuaproyek', 'Semua Proyek') + '</option>']
        .concat(mockDB.projects.filter(p => !p.is_deleted).map(p => `<option value="${esc(p.id)}">${esc(p.name)}</option>`)).join('');
      const usrOpts = ['<option value="ALL">' + t('filter.semuapekerja', 'Semua Pekerja') + '</option>']
        .concat(mockDB.users.map(u => `<option value="${esc(u.id)}">${esc(u.name)}</option>`)).join('');

      /* Elemen filter hanya ada di halaman tertentu (multi-halaman). */
      const isi = (id, opsi) => { const el = document.getElementById(id); if (el) el.innerHTML = opsi; };
      isi('filterProject', prjOpts);
      isi('tsProjectFilter', prjOpts);
      isi('filterAssignee', usrOpts);
      isi('tsUserFilter', usrOpts);
    }

    /**************************************************************
     * 7. WIDGET TIMER HEADER REAL-TIME (FR-4.1 - FR-4.6)
     **************************************************************/
    function startHeaderTimerTicker() {
      /* Tanggal header — diisi sekali, memakai zona waktu Asia/Jakarta. */
      const elTanggal = document.getElementById('headerTanggal');
      if (elTanggal) {
        /* Selalu diisi ulang agar ikut bahasa aktif saat bahasa diganti. */
        const now = new Date();
        const hari = now.toLocaleDateString(localeAktif(), { weekday: 'long', timeZone: 'Asia/Jakarta' });
        const tgl = now.toLocaleDateString(localeAktif(), { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Jakarta' });
        const zona = t('header.zona', 'Zona Waktu WIB (Asia/Jakarta)');
        elTanggal.textContent = `${hari}, ${tgl} • ${zona}`;
      }
      if (state.timerInterval) clearInterval(state.timerInterval);
      const tick = () => {
        if (!state.currentUser) return;
        const activeLog = mockDB.timeLogs.find(l => l.user_id === state.currentUser.id && !l.end_time);
        const widget = document.getElementById('headerTimerWidget');
        const pulse = document.getElementById('timerPulse');
        const titleEl = document.getElementById('timerTaskTitle');
        const dispEl = document.getElementById('timerDisplay');
        const stopBtn = document.getElementById('headerStopTimerBtn');
        const overtimeBanner = document.getElementById('overtimeBanner');

        /* Widget timer tidak ada di semua halaman (multi-halaman). */
        if (!widget) return;

        if (!activeLog) {
          widget.className = 'brut-border brut-shadow-sm bg-zinc-100 px-3 py-1.5 flex items-center gap-3';
          pulse.className = 'w-3 h-3 rounded-full bg-zinc-400 border border-black';
          titleEl.textContent = t('dasbor.tidakadattimer', 'Tidak ada timer aktif');
          dispEl.textContent = '00:00:00';
          stopBtn.classList.add('hidden');
          overtimeBanner.classList.add('hidden');
          return;
        }

        const task = mockDB.tasks.find(t => t.id === activeLog.task_id);
        const elapsedSec = Math.max(0, Math.floor((Date.now() - new Date(activeLog.start_time).getTime()) / 1000));
        const hrs = Math.floor(elapsedSec / 3600);
        const mins = Math.floor((elapsedSec % 3600) / 60);
        const secs = elapsedSec % 60;

        widget.className = 'brut-border brut-shadow-sm bg-brut-lime px-3 py-1.5 flex items-center gap-3';
        pulse.className = 'w-3 h-3 rounded-full bg-red-600 border border-black animate-ping';
        titleEl.textContent = task ? task.title : 'Tugas Aktif';
        dispEl.textContent = `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
        stopBtn.classList.remove('hidden');

        // FR-4.6 Pengingat otomatis jika > 10 jam
        if (overtimeBanner) overtimeBanner.classList.toggle('hidden', hrs < 10);
      };
      tick();
      state.timerInterval = setInterval(tick, 1000);
    }

    async function handleStartTimer(taskId) {
      try {
        await api.startTimer(taskId);
        showToast(t('toast.timermulai', 'Timer dimulai! Waktu dicatat oleh server.'), 'success');
        refreshCurrentPage();
      } catch (err) {
        showToast(err.message, 'error');
      }
    }

    async function handleStopTimer() {
      try {
        const stopped = await api.stopTimer();
        showToast(`Timer dihentikan! Durasi tercatat: ${formatMinutes(stopped.duration_minutes)}.`, 'info');
        refreshCurrentPage();
      } catch (err) {
        showToast(err.message, 'error');
      }
    }

    /* Peta halaman → fungsi render. Dipakai refreshCurrentPage() agar
       tampilan bisa digambar ulang tanpa reload dan tanpa menutup drawer. */
    function renderHalamanAktif() {
      const peta = {
        dashboard: renderDashboard,
        timeline: renderTimeline,
        todo: renderTodo,
        projects: renderProjects,
        timesheet: renderTimesheet,
        users: renderUsers
      };
      const fn = peta[state.currentPage];
      if (typeof fn === 'function') fn();
    }

    function refreshCurrentPage() {
      /* navigate() melakukan reload penuh bila halaman berbeda — itu menutup
         drawer dan mengosongkan form. Cukup gambar ulang halaman aktif. */
      const idDrawer = state.activeTaskDrawerId;
      renderHalamanAktif();
      if (idDrawer) openTaskDrawer(idDrawer);
    }

    /**************************************************************
     * 8. RENDER DASBOR RINGKASAN (BAB 5 & 10.1)
     **************************************************************/
    function renderDashboard() {
      const activeProjects = mockDB.projects.filter(p => !p.is_deleted && p.status === 'Berjalan');
      const allTasks = mockDB.tasks.filter(t => !t.is_deleted);
      const overdue = allTasks.filter(t => getTaskUrgency(t) === 'overdue');
      const dueSoon = allTasks.filter(t => getTaskUrgency(t) === 'duesoon');
      const runningTimers = mockDB.timeLogs.filter(l => !l.end_time);

      const totalMins = mockDB.timeLogs.reduce((acc, l) => acc + (Number(l.duration_minutes) || 0), 0);
      const timerMins = mockDB.timeLogs.filter(l => !l.is_manual).reduce((acc, l) => acc + (Number(l.duration_minutes) || 0), 0);
      const timerPct = totalMins > 0 ? Math.round((timerMins / totalMins) * 100) : 100;

      document.getElementById('dashActiveProjects').textContent = activeProjects.length;
      document.getElementById('dashOverdueTasks').textContent = overdue.length;
      document.getElementById('dashDueSoonTasks').textContent = `${dueSoon.length} jatuh tempo ≤ 2 hari`;
      document.getElementById('dashRunningTimers').textContent = runningTimers.length;
      document.getElementById('dashWeeklyHours').textContent = `${(totalMins / 60).toFixed(1)}j`;
      document.getElementById('dashTimerRatio').textContent = `${timerPct}% tercatat via Timer (Target ≥70%)`;

      // Daftar Progres Proyek
      const prjContainer = document.getElementById('dashProjectList');
      prjContainer.innerHTML = activeProjects.map(p => {
        const pct = calculateProjectProgress(p.id);
        const link = mockDB.shareLinks.find(s => s.project_id === p.id && s.is_active);
        return `
          <div class="p-4 brut-border bg-zinc-50 space-y-2">
            <div class="flex flex-wrap items-center justify-between gap-2">
              <div class="flex items-center gap-2">
                <span class="w-4 h-4 brut-border-sm inline-block" style="background:${esc(p.color)}"></span>
                <span class="font-display font-extrabold text-base">${esc(p.name)}</span>
                <span class="brut-badge bg-white">${esc(p.progress_mode === 'weighted' ? 'Bobot Jam' : 'Jumlah Tugas')}</span>
              </div>
              <div class="flex items-center gap-2">
                ${link ? `
                  <button onclick="bukaTracking('${esc(link.token)}')" class="brut-btn bg-brut-cyan px-2.5 py-1 text-xs">
                    👁️ Klien (${link.view_count}x dilihat)
                  </button>
                ` : ''}
                <span class="font-mono font-extrabold text-lg">${pct}%</span>
              </div>
            </div>
            <div class="w-full h-5 bg-white brut-border-sm overflow-hidden">
              <div class="h-full bg-brut-lime border-r-2 border-black transition-all duration-300" style="width:${pct}%"></div>
            </div>
            <div class="flex justify-between text-xs font-bold text-zinc-600">
              <span>Klien: ${esc(p.client_name)}</span>
              <span>Target Selesai: ${formatDateID(p.end_date)}</span>
            </div>
          </div>
        `;
      }).join('');

      // Live Timers
      const liveContainer = document.getElementById('dashLiveTimersList');
      if (!runningTimers.length) {
        liveContainer.innerHTML = `<div class="text-xs font-bold text-zinc-500">Belum ada pekerja yang menyalakan timer saat ini.</div>`;
      } else {
        liveContainer.innerHTML = runningTimers.map(l => {
          const usr = mockDB.users.find(u => u.id === l.user_id);
          const tsk = mockDB.tasks.find(t => t.id === l.task_id);
          const minsRunning = Math.max(1, Math.round((Date.now() - new Date(l.start_time).getTime()) / 60000));
          return `
            <div class="p-2.5 bg-white brut-border-sm flex items-center justify-between gap-2">
              <div>
                <div class="font-extrabold text-xs">${esc(usr ? usr.name : 'Pekerja')}</div>
                <div class="text-xs text-zinc-700 truncate max-w-[180px]">${esc(tsk ? tsk.title : '')}</div>
              </div>
              <span class="brut-badge bg-brut-lime font-mono">${formatMinutes(minsRunning)}</span>
            </div>
          `;
        }).join('');
      }

      // Urgent / Overdue List
      const urgentContainer = document.getElementById('dashUrgentList');
      const combinedUrgent = [...overdue, ...dueSoon].slice(0, 5);
      if (!combinedUrgent.length) {
        urgentContainer.innerHTML = `<div class="text-xs font-bold text-emerald-700">Semua tugas terkendali tepat waktu!</div>`;
      } else {
        urgentContainer.innerHTML = combinedUrgent.map(t => {
          const urg = getTaskUrgency(t);
          return `
            <div onclick="openTaskDrawer('${esc(t.id)}')" class="p-2.5 bg-white brut-border-sm flex items-center justify-between gap-2 cursor-pointer hover:bg-amber-50">
              <div class="truncate">
                <div class="font-extrabold text-xs truncate">${esc(t.title)}</div>
                <div class="text-[11px] font-mono text-zinc-600">Tenggat: ${formatDateID(t.due_date)}</div>
              </div>
              <span class="brut-badge ${urg === 'overdue' ? 'bg-brut-red text-white' : 'bg-brut-yellow'}">
                ${urg === 'overdue' ? 'TERLAMBAT' : 'SEGERA'}
              </span>
            </div>
          `;
        }).join('');
      }
    }

    /**************************************************************
     * 9. RENDER TIMELINE: FULLCALENDAR & TABEL LIST (FR-2.1 - FR-2.7)
     **************************************************************/
    function switchTimelineMode(mode) {
      state.timelineMode = mode;
      document.getElementById('tabCalBtn').className = `brut-btn px-3 py-2 text-xs uppercase ${mode === 'calendar' ? 'bg-brut-yellow' : 'bg-white'}`;
      document.getElementById('tabListBtn').className = `brut-btn px-3 py-2 text-xs uppercase ${mode === 'list' ? 'bg-brut-yellow' : 'bg-white'}`;
      document.getElementById('timelineCalendarWrap').classList.toggle('hidden', mode !== 'calendar');
      document.getElementById('timelineListWrap').classList.toggle('hidden', mode !== 'list');
      renderTimeline();
    }

    function getFilteredTasks() {
      const q = (document.getElementById('filterSearch')?.value || '').toLowerCase();
      const prj = document.getElementById('filterProject')?.value || 'ALL';
      const asg = document.getElementById('filterAssignee')?.value || 'ALL';
      const st = document.getElementById('filterStatus')?.value || 'ALL';

      return mockDB.tasks.filter(t => {
        if (t.is_deleted) return false;
        if (q && !t.title.toLowerCase().includes(q)) return false;
        if (prj !== 'ALL' && t.project_id !== prj) return false;
        if (asg !== 'ALL' && t.assignee_id !== asg) return false;
        if (st !== 'ALL' && t.status !== st) return false;
        return true;
      });
    }

    function renderTimeline() {
      if (state.timelineMode === 'calendar') {
        renderFullCalendar();
      } else {
        renderTimelineList();
      }
    }

    function renderFullCalendar() {
      const calEl = document.getElementById('fullcalendarEl');
      const tasks = getFilteredTasks();
      const events = tasks.map(t => {
        const prj = mockDB.projects.find(p => p.id === t.project_id);
        const urg = getTaskUrgency(t);
        let bgColor = prj ? prj.color : '#FFDE00';
        let textColor = '#000000';
        if (urg === 'overdue') {
          bgColor = '#FF4D4D';
          textColor = '#FFFFFF';
        } else if (urg === 'duesoon') {
          bgColor = '#FFDE00';
        }
        // FullCalendar end date is exclusive, add 1 day for inclusive bar rendering
        const endDateObj = new Date(t.due_date);
        endDateObj.setDate(endDateObj.getDate() + 1);
        const endIso = endDateObj.toISOString().split('T')[0];

        return {
          id: t.id,
          title: `${t.status === 'done' ? '✓ ' : ''}${t.title}`,
          start: t.start_date,
          end: endIso,
          backgroundColor: bgColor,
          textColor: textColor
        };
      });

      if (state.calendarInstance) {
        state.calendarInstance.destroy();
      }

      state.calendarInstance = new FullCalendar.Calendar(calEl, {
        initialView: 'dayGridMonth',
        initialDate: state.TODAY_STR,
        locale: 'id',
        headerToolbar: {
          left: 'prev,next today',
          center: 'title',
          right: 'dayGridMonth,timeGridWeek'
        },
        buttonText: {
          today: 'Hari Ini',
          month: 'Bulan',
          week: 'Minggu'
        },
        editable: state.currentUser?.role === 'admin', // Drag & Drop khusus Admin (FR-2.3)
        events: events,
        eventClick: info => {
          openTaskDrawer(info.event.id);
        },
        eventDrop: async info => {
          const newStart = info.event.startStr.split('T')[0];
          let newEnd = newStart;
          if (info.event.end) {
            const d = new Date(info.event.end);
            d.setDate(d.getDate() - 1);
            newEnd = d.toISOString().split('T')[0];
          }
          await api.updateTaskDates(info.event.id, newStart, newEnd);
          showToast(`Tanggal tugas diperbarui ke ${formatDateID(newStart)} – ${formatDateID(newEnd)}`, 'success');
        }
      });
      state.calendarInstance.render();
    }

    function renderTimelineList() {
      const groupBy = document.getElementById('listGroupBy').value;
      const sortBy = document.getElementById('listSortBy').value;
      const tasks = getFilteredTasks();

      const prioRank = { urgent: 4, high: 3, medium: 2, low: 1 };
      tasks.sort((a, b) => {
        if (sortBy === 'priority') return (prioRank[b.priority] || 0) - (prioRank[a.priority] || 0);
        return new Date(a.due_date) - new Date(b.due_date);
      });

      const groups = {};
      tasks.forEach(t => {
        let key = 'Lainnya';
        if (groupBy === 'project') {
          const p = mockDB.projects.find(x => x.id === t.project_id);
          key = p ? p.name : 'Tanpa Proyek';
        } else if (groupBy === 'assignee') {
          const u = mockDB.users.find(x => x.id === t.assignee_id);
          key = u ? u.name : 'Belum Ditugaskan';
        } else {
          key = t.status.toUpperCase();
        }
        if (!groups[key]) groups[key] = [];
        groups[key].push(t);
      });

      const container = document.getElementById('timelineListContainer');
      const keys = Object.keys(groups);
      if (!keys.length) {
        container.innerHTML = `<div class="brut-card p-6 text-center font-bold">Tidak ada tugas yang sesuai filter.</div>`;
        return;
      }

      container.innerHTML = keys.map(k => `
        <div class="brut-card overflow-hidden">
          <div class="p-3 bg-brut-yellow border-b-3 border-black font-display font-extrabold text-sm uppercase flex justify-between">
            <span>${esc(k)}</span>
            <span class="font-mono text-xs bg-white px-2 py-0.5 brut-border-sm">${groups[k].length} Tugas</span>
          </div>
          <div class="overflow-x-auto">
            <table class="w-full text-left border-collapse text-xs sm:text-sm">
              <thead>
                <tr class="bg-zinc-100 border-b-2 border-black font-extrabold uppercase text-xs">
                  <th class="p-3 border-r-2 border-black">Judul Tugas</th>
                  <th class="p-3 border-r-2 border-black">Penanggung Jawab</th>
                  <th class="p-3 border-r-2 border-black">Tenggat & Penanda</th>
                  <th class="p-3 border-r-2 border-black">Prioritas</th>
                  <th class="p-3 border-r-2 border-black">Est vs Aktual (FR-3.5)</th>
                  <th class="p-3 border-r-2 border-black">Status</th>
                  <th class="p-3 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody>
                ${groups[k].map(t => {
                  const u = mockDB.users.find(x => x.id === t.assignee_id);
                  const urg = getTaskUrgency(t);
                  const actualHrs = getTaskActualHours(t.id);
                  return `
                    <tr onclick="openTaskDrawer('${esc(t.id)}')" class="border-b-2 border-black hover:bg-amber-50 cursor-pointer">
                      <td class="p-3 border-r-2 border-black font-bold">
                        ${esc(t.title)}
                        ${t.is_milestone ? `<span class="ml-1 brut-badge bg-brut-pink text-[10px]">MILESTONE</span>` : ''}
                      </td>
                      <td class="p-3 border-r-2 border-black font-semibold">${esc(u ? u.name : '-')}</td>
                      <td class="p-3 border-r-2 border-black font-mono text-xs">
                        ${formatDateID(t.due_date)}
                        ${urg === 'overdue' ? `<span class="ml-1 brut-badge bg-brut-red text-white">TERLAMBAT</span>` : ''}
                        ${urg === 'duesoon' ? `<span class="ml-1 brut-badge bg-brut-yellow">≤ 2 HARI</span>` : ''}
                      </td>
                      <td class="p-3 border-r-2 border-black">
                        <span class="brut-badge ${t.priority === 'urgent' ? 'bg-brut-red text-white' : t.priority === 'high' ? 'bg-brut-orange' : 'bg-white'}">${esc(t.priority)}</span>
                      </td>
                      <td class="p-3 border-r-2 border-black font-mono text-xs">
                        Est: <b>${t.estimate_hours}j</b> / Akt: <b>${actualHrs}j</b>
                      </td>
                      <td class="p-3 border-r-2 border-black font-mono font-bold uppercase text-xs">${esc(t.status)}</td>
                      <td class="p-3 text-center">
                        <button onclick="event.stopPropagation(); hapusTugas('${esc(t.id)}')"
                                title="Hapus tugas"
                                class="brut-btn bg-brut-red text-white px-2 py-1 text-[10px] uppercase">
                          Hapus
                        </button>
                      </td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>
        </div>
      `).join('');
    }

    /**************************************************************
     * 10. RENDER TO DO PEKERJA & KANBAN (FR-3.1 - FR-3.5)
     **************************************************************/
    function switchTodoMode(mode) {
      state.todoMode = mode;
      document.getElementById('todoGroupBtn').className = `brut-btn px-3 py-2 text-xs uppercase ${mode === 'grouped' ? 'bg-brut-lime' : 'bg-white'}`;
      document.getElementById('todoKanbanBtn').className = `brut-btn px-3 py-2 text-xs uppercase ${mode === 'kanban' ? 'bg-brut-lime' : 'bg-white'}`;
      document.getElementById('todoGroupedContainer').classList.toggle('hidden', mode !== 'grouped');
      document.getElementById('todoKanbanContainer').classList.toggle('hidden', mode !== 'kanban');
      renderTodo();
    }

    function renderTodo() {
      const myTasks = mockDB.tasks.filter(t => {
        if (t.is_deleted) return false;
        if (state.currentUser.role === 'admin') return true;
        return t.assignee_id === state.currentUser.id;
      });

      if (state.todoMode === 'grouped') {
        const buckets = {
          ['🔥 ' + t('todo.terlambat', 'Terlambat (Overdue)')]: [],
          ['⚡ ' + t('todo.hariini', 'Hari Ini') + ' (' + formatDateID(state.TODAY_STR) + ')']: [],
          ['📅 ' + t('todo.mingguini', 'Minggu Ini & Mendatang')]: [],
          ['✅ ' + t('todo.selesai', 'Selesai (Done)')]: []
        };

        myTasks.forEach(t => {
          if (t.status === 'done') {
            buckets['✅ ' + t('todo.selesai', 'Selesai (Done)')].push(t);
          } else if (getTaskUrgency(t) === 'overdue') {
            buckets['🔥 ' + t('todo.terlambat', 'Terlambat (Overdue)')].push(t);
          } else if (t.due_date === state.TODAY_STR) {
            buckets['⚡ Hari Ini (24 Okt 2026)'].push(t);
          } else {
            buckets['📅 Minggu Ini & Mendatang'].push(t);
          }
        });

        document.getElementById('todoGroupedContainer').innerHTML = Object.entries(buckets).map(([label, list]) => `
          <div class="brut-card p-4 space-y-3">
            <div class="flex items-center justify-between border-b-2 border-black pb-2">
              <h3 class="font-display font-extrabold text-base uppercase">${label}</h3>
              <span class="brut-badge bg-brut-yellow">${list.length} Tugas</span>
            </div>
            ${!list.length ? `<div class="text-xs font-semibold text-zinc-500 py-2">Tidak ada tugas dalam kategori ini.</div>` : `
              <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                ${list.map(t => renderTodoCardHTML(t)).join('')}
              </div>
            `}
          </div>
        `).join('');
      } else {
        // Kanban Columns (FR-3.4)
        const cols = [
          { key: 'todo', label: 'TO DO', bg: 'bg-zinc-100' },
          { key: 'in_progress', label: 'IN PROGRESS', bg: 'bg-brut-cyan' },
          { key: 'review', label: 'REVIEW', bg: 'bg-brut-yellow' },
          { key: 'done', label: 'DONE (ADMIN)', bg: 'bg-brut-lime' }
        ];
        document.getElementById('todoKanbanContainer').innerHTML = cols.map(c => {
          const list = myTasks.filter(t => t.status === c.key);
          return `
            <div class="brut-card flex flex-col">
              <div class="p-3 ${c.bg} border-b-3 border-black font-display font-extrabold text-sm flex justify-between">
                <span>${c.label}</span>
                <span class="font-mono text-xs bg-white px-2 brut-border-sm">${list.length}</span>
              </div>
              <div class="p-3 space-y-3 flex-1 bg-amber-50/40">
                ${list.map(t => renderTodoCardHTML(t)).join('')}
              </div>
            </div>
          `;
        }).join('');
      }
      lucide.createIcons();
    }

    function renderTodoCardHTML(t) {
      const prj = mockDB.projects.find(p => p.id === t.project_id);
      const isRunning = mockDB.timeLogs.some(l => l.task_id === t.id && l.user_id === state.currentUser.id && !l.end_time);
      const actualHrs = getTaskActualHours(t.id);
      const doneSubs = (t.subtasks || []).filter(s => s.done).length;
      const totalSubs = (t.subtasks || []).length;

      return `
        <div class="brut-border brut-shadow-sm bg-white p-3.5 flex flex-col justify-between gap-3">
          <div>
            <div class="flex items-center justify-between gap-2 mb-1">
              <span class="text-[10px] font-extrabold uppercase px-2 py-0.5 brut-border-sm" style="background:${esc(prj ? prj.color : '#eee')}">
                ${esc(prj ? prj.name : 'Proyek')}
              </span>
              <span class="font-mono text-[11px] font-bold">${formatDateID(t.due_date)}</span>
            </div>
            <h4 onclick="openTaskDrawer('${esc(t.id)}')" class="font-display font-extrabold text-sm sm:text-base hover:underline cursor-pointer">
              ${esc(t.title)}
            </h4>
            <div class="mt-2 flex flex-wrap items-center gap-2 text-xs font-mono">
              <span class="bg-zinc-100 px-2 py-0.5 border border-black">Est: ${t.estimate_hours}j | Akt: ${actualHrs}j</span>
              ${totalSubs > 0 ? `<span class="bg-amber-100 px-2 py-0.5 border border-black">☑ ${doneSubs}/${totalSubs} Sub</span>` : ''}
            </div>
          </div>

          <div class="pt-2 border-t-2 border-dashed border-black flex items-center justify-between gap-2">
            <!-- Status Quick Select (FR-3.2) -->
            <select onchange="handleStatusChange('${esc(t.id)}', this.value)" class="brut-input text-xs py-1 px-2">
              <option value="todo" ${t.status === 'todo' ? 'selected' : ''}>To Do</option>
              <option value="in_progress" ${t.status === 'in_progress' ? 'selected' : ''}>In Progress</option>
              <option value="review" ${t.status === 'review' ? 'selected' : ''}>Review</option>
              <option value="done" ${t.status === 'done' ? 'selected' : ''} ${state.currentUser.role !== 'admin' ? 'disabled' : ''}>Done (Admin)</option>
            </select>

            <!-- Start / Stop Timer Button (FR-4.1) -->
            ${isRunning ? `
              <button onclick="handleStopTimer()" class="brut-btn bg-brut-red text-white px-2.5 py-1 text-xs uppercase">
                ■ Stop
              </button>
            ` : `
              <button onclick="handleStartTimer('${esc(t.id)}')" class="brut-btn bg-brut-lime px-2.5 py-1 text-xs uppercase">
                ▶ Start Timer
              </button>
            `}
          </div>
        </div>
      `;
    }

    /* Ubah tanda milestone / visibilitas klien dari drawer.
       Hanya dua field ini yang dikirim, agar update parsial tidak menimpa
       field lain (server menulis hanya kolom yang disertakan). */
    async function ubahMilestone(taskId, nilai) {
      const tugasObj = mockDB.tasks.find(x => x.id === taskId);
      if (!t) return;
      try {
        await api.updateTask({ id: t.id, title: t.title, is_milestone: nilai });
        showToast(nilai ? 'Ditandai sebagai milestone.' : 'Tanda milestone dilepas.', 'success');
        refreshCurrentPage();
      } catch (err) {
        showToast(err.message || 'Gagal menyimpan milestone.', 'error');
        refreshCurrentPage();
      }
    }

    async function ubahVisibilitas(taskId, nilai) {
      const tugasObj = mockDB.tasks.find(x => x.id === taskId);
      if (!t) return;
      try {
        await api.updateTask({ id: t.id, title: t.title, visible_to_client: nilai });
        showToast(nilai ? 'Tugas tampil di link klien.' : 'Tugas disembunyikan dari klien.', 'success');
        refreshCurrentPage();
      } catch (err) {
        showToast(err.message || 'Gagal menyimpan visibilitas.', 'error');
        refreshCurrentPage();
      }
    }

    /* Label & warna status tugas — satu sumber untuk milestone maupun rincian
       progres, supaya portal klien tidak pernah menampilkan status berbeda
       untuk tugas yang sama. */
    const STATUS_TUGAS = {
      todo:        { teks: '📋 TO DO',       warna: 'bg-zinc-100' },
      in_progress: { teks: '⏳ DIKERJAKAN',  warna: 'bg-brut-yellow/40' },
      review:      { teks: '🔍 REVIEW',      warna: 'bg-amber-100' },
      done:        { teks: '✅ SELESAI',     warna: 'bg-brut-lime/40' }
    };

    function labelStatus(status) {
      const s = STATUS_TUGAS[status];
      return s ? s.teks : '—';
    }

    function warnaStatus(status) {
      const s = STATUS_TUGAS[status];
      return s ? s.warna : 'bg-zinc-50';
    }

    async function handleStatusChange(taskId, newStatus) {
      try {
        await api.updateTaskStatus(taskId, newStatus);
        showToast(`Status tugas diperbarui menjadi ${newStatus.toUpperCase()}`, 'success');
        refreshCurrentPage();
      } catch (err) {
        showToast(err.message, 'error');
        refreshCurrentPage();
      }
    }

    /**************************************************************
     * 11. DRAWER DETAIL TUGAS, SUB-TUGAS & KOMENTAR (PRD 10.1)
     **************************************************************/
    function openTaskDrawer(taskId) {
      const tugasObj = mockDB.tasks.find(x => x.id === taskId);
      if (!t) return;
      state.activeTaskDrawerId = taskId;
      const prj = mockDB.projects.find(p => p.id === t.project_id);
      const usr = mockDB.users.find(u => u.id === t.assignee_id);
      const logs = mockDB.timeLogs.filter(l => l.task_id === taskId);
      const comments = mockDB.comments.filter(c => c.task_id === taskId);

      document.getElementById('drawerTaskBadge').textContent = t.status.toUpperCase();
      document.getElementById('taskDrawerBody').innerHTML = `
        <div class="space-y-3">
          <div class="text-xs font-extrabold uppercase px-2 py-1 brut-border-sm inline-block" style="background:${esc(prj ? prj.color : '#fff')}">
            ${esc(prj ? prj.name : '')}
          </div>
          <h2 class="font-display font-extrabold text-xl">${esc(t.title)}</h2>
          <p class="text-sm font-medium bg-amber-50 p-3 brut-border-sm">${esc(t.description || 'Tidak ada deskripsi.')}</p>

          <!-- Milestone & visibilitas klien: menentukan isi kartu Milestone Utama
               di portal tracking klien. Tanpa ini, tugas lama tak bisa dijadikan
               milestone karena tidak ada form edit tugas. -->
          <div class="flex flex-wrap gap-3 p-2 brut-border-sm bg-zinc-50">
            <label class="flex items-center gap-2 text-xs font-extrabold uppercase cursor-pointer">
              <input type="checkbox" ${t.is_milestone ? 'checked' : ''} onchange="ubahMilestone('${esc(t.id)}', this.checked)" class="w-4 h-4 accent-black">
              🎯 Milestone
            </label>
            <label class="flex items-center gap-2 text-xs font-extrabold uppercase cursor-pointer">
              <input type="checkbox" ${t.visible_to_client ? 'checked' : ''} onchange="ubahVisibilitas('${esc(t.id)}', this.checked)" class="w-4 h-4 accent-black">
              Tampil di Link Klien
            </label>
          </div>

          <div class="grid grid-cols-2 gap-2 text-xs font-bold">
            <div class="p-2 brut-border-sm bg-zinc-50">Penanggung Jawab: <br><span class="text-sm font-extrabold">${esc(usr ? usr.name : '-')}</span></div>
            <div class="p-2 brut-border-sm bg-zinc-50">Tenggat Waktu: <br><span class="text-sm font-mono font-extrabold">${formatDateID(t.due_date)}</span></div>
            <div class="p-2 brut-border-sm bg-zinc-50">Estimasi Jam: <br><span class="text-sm font-mono font-extrabold">${t.estimate_hours} Jam</span></div>
            <div class="p-2 brut-border-sm bg-zinc-50">Jam Aktual Timer: <br><span class="text-sm font-mono font-extrabold">${getTaskActualHours(t.id)} Jam</span></div>
          </div>
        </div>

        <!-- Checklist Sub-tugas (FR-3.3) -->
        <div class="space-y-2 pt-3 border-t-2 border-black">
          <h4 class="font-display font-extrabold text-sm uppercase">Sub-Tugas / Checklist (FR-3.3)</h4>
          <div class="space-y-1.5">
            ${(t.subtasks || []).map((s, idx) => `
              <div class="flex items-center gap-2 p-2 brut-border-sm bg-white text-xs font-bold">
                <label class="flex items-center gap-2 flex-1 min-w-0 cursor-pointer">
                  <input type="checkbox" ${s.done ? 'checked' : ''} onchange="toggleSubtask('${esc(t.id)}', ${idx})" class="w-4 h-4 accent-black flex-shrink-0">
                  <span class="${s.done ? 'line-through text-zinc-400' : ''} truncate">${esc(s.title)}</span>
                </label>
                <button onclick="hapusSubTugas('${esc(t.id)}', '${esc(s.id)}')"
                        title="Hapus sub-tugas"
                        class="brut-btn bg-brut-red text-white px-2 py-0.5 text-[10px] uppercase flex-shrink-0">
                  Hapus
                </button>
              </div>
            `).join('')}
            ${!(t.subtasks || []).length ? `<div class="text-xs font-mono text-zinc-500 p-2">Belum ada sub-tugas.</div>` : ''}
          </div>
          <div class="flex gap-2">
            <input type="text" id="newSubtaskInput" placeholder="Tambah sub-tugas..." class="brut-input text-xs py-1.5 flex-1">
            <button onclick="addSubtask('${esc(t.id)}')" class="brut-btn bg-brut-yellow px-3 py-1 text-xs uppercase">+ Tambah</button>
          </div>
        </div>

        <!-- Riwayat Log Waktu Tugas Ini -->
        <div class="space-y-2 pt-3 border-t-2 border-black">
          <h4 class="font-display font-extrabold text-sm uppercase">Catatan Waktu (${logs.length})</h4>
          <div class="space-y-1.5 max-h-40 overflow-y-auto">
            ${logs.map(l => {
              const u = mockDB.users.find(x => x.id === l.user_id);
              return `
                <div class="p-2 brut-border-sm bg-zinc-50 text-xs flex justify-between items-center">
                  <div>
                    <b>${esc(u ? u.name : '')}</b> • <span class="font-mono">${l.end_time ? formatMinutes(l.duration_minutes) : 'SEDANG BERJALAN'}</span>
                    <div class="text-[11px] text-zinc-600">${esc(l.note || '')}</div>
                  </div>
                  <span class="brut-badge ${l.is_manual ? 'bg-brut-orange' : 'bg-brut-lime'}">${l.is_manual ? 'MANUAL' : 'TIMER'}</span>
                </div>
              `;
            }).join('')}
          </div>
        </div>

        <!-- Diskusi / Komentar Tugas -->
        <div class="space-y-2 pt-3 border-t-2 border-black">
          <h4 class="font-display font-extrabold text-sm uppercase">Komentar Tugas</h4>
          <div class="space-y-2">
            ${comments.map(c => {
              const u = mockDB.users.find(x => x.id === c.user_id);
              return `
                <div class="p-2.5 brut-border-sm bg-amber-50 text-xs">
                  <div class="font-extrabold">${esc(u ? u.name : 'User')}</div>
                  <div class="mt-1">${esc(c.body)}</div>
                </div>
              `;
            }).join('')}
          </div>
          <div class="flex gap-2">
            <input type="text" id="newCommentInput" placeholder="Tulis komentar..." class="brut-input text-xs py-1.5 flex-1">
            <button onclick="addComment('${esc(t.id)}')" class="brut-btn bg-brut-cyan px-3 py-1 text-xs uppercase">Kirim</button>
          </div>

          <!-- Hapus tugas ini (tersedia untuk admin) -->
          ${state.currentUser?.role === 'admin' ? `
          <div class="pt-4 mt-2 border-t-2 border-black">
            <button onclick="hapusTugas('${esc(t.id)}')"
                    class="w-full brut-btn bg-brut-red text-white py-2 text-xs uppercase flex items-center justify-center gap-1.5">
              🗑️ Hapus Tugas Ini
            </button>
          </div>
          ` : ''}
        </div>
      `;

      document.getElementById('taskDrawerBackdrop').classList.remove('hidden');
      document.getElementById('taskDrawer').classList.remove('translate-x-full');
    }

    function closeTaskDrawer() {
      state.activeTaskDrawerId = null;
      document.getElementById('taskDrawerBackdrop').classList.add('hidden');
      document.getElementById('taskDrawer').classList.add('translate-x-full');
    }

    async function toggleSubtask(taskId, idx) {
      const tugasObj = mockDB.tasks.find(x => x.id === taskId);
      if (t && t.subtasks[idx]) {
        t.subtasks[idx].done = !t.subtasks[idx].done;
        openTaskDrawer(taskId);
        try {
          await api.updateTask({ id: t.id, title: t.title, subtasks: t.subtasks });
        } catch (err) {
          showToast(err.message || 'Gagal menyimpan checklist.', 'error');
        }
        refreshCurrentPage();
      }
    }

    async function addSubtask(taskId) {
      const inp = document.getElementById('newSubtaskInput');
      if (!inp || !inp.value.trim()) return;
      const judul = inp.value.trim();
      const tugasObj = mockDB.tasks.find(x => x.id === taskId);
      if (!t) return;

      t.subtasks = t.subtasks || [];
      t.subtasks.push({ id: 'sub-' + Date.now(), title: judul, done: false });

      /* Simpan dulu, baru gambar ulang — supaya state di layar dan di server
         tidak pernah berbeda dan input tidak terhapus sebelum terkirim. */
      try {
        await api.updateTask({ id: t.id, title: t.title, subtasks: t.subtasks });
      } catch (err) {
        showToast(err.message || 'Gagal menyimpan sub-tugas.', 'error');
        return;
      }
      refreshCurrentPage();
    }

    function addComment(taskId) {
      const inp = document.getElementById('newCommentInput');
      if (!inp || !inp.value.trim()) return;
      mockDB.comments.push({
        id: 'cm-' + Date.now(),
        task_id: taskId,
        user_id: state.currentUser.id,
        body: inp.value.trim(),
        created_at: new Date().toISOString()
      });
      openTaskDrawer(taskId);
    }

    /**************************************************************
     * 12. RENDER PROYEK & PENGATURAN SHARE LINK KLIEN (FR-5.1 - FR-5.7)
     **************************************************************/
    function renderProjects() {
      const grid = document.getElementById('projectsGrid');
      const projects = mockDB.projects.filter(p => !p.is_deleted);

      grid.innerHTML = projects.map(p => {
        const pct = calculateProjectProgress(p.id);
        const link = mockDB.shareLinks.find(s => s.project_id === p.id);
        const shareUrl = link ? `${location.origin}/share/${link.token}` : '';

        return `
          <div class="brut-card p-5 flex flex-col justify-between space-y-4">
            <div class="space-y-3">
              <div class="flex items-start justify-between gap-2">
                <div class="flex items-center gap-2">
                  <span class="w-5 h-5 brut-border-sm inline-block" style="background:${esc(p.color)}"></span>
                  <h3 class="font-display font-extrabold text-lg">${esc(p.name)}</h3>
                </div>
                <span class="brut-badge bg-brut-yellow">${esc(p.status)}</span>
              </div>
              <p class="text-xs font-semibold text-zinc-700">${esc(p.description)}</p>
              <div class="text-xs font-bold flex flex-wrap justify-between gap-2 bg-zinc-100 p-2.5 brut-border-sm">
                <span>Klien: <b>${esc(p.client_name)}</b></span>
                <span>Periode: <b>${formatDateID(p.start_date)} – ${formatDateID(p.end_date)}</b></span>
              </div>

              <!-- Progress Bar -->
              <div>
                <div class="flex justify-between text-xs font-extrabold uppercase mb-1">
                  <span>Progres (${p.progress_mode === 'weighted' ? 'Berbobot Jam Estimasi' : 'Jumlah Tugas Selesai'})</span>
                  <span class="font-mono">${pct}%</span>
                </div>
                <div class="w-full h-5 bg-white brut-border-sm">
                  <div class="h-full bg-brut-lime border-r-2 border-black" style="width:${pct}%"></div>
                </div>
              </div>
            </div>

            <!-- Panel Share Link Klien (FR-5.1 - FR-5.6) -->
            <div class="pt-4 border-t-3 border-black space-y-3 bg-amber-50 -mx-5 -mb-5 p-5">
              <div class="flex items-center justify-between">
                <span class="font-display font-extrabold text-xs uppercase flex items-center gap-1.5">
                  🔗 Link Tracking Klien
                </span>
                ${link && link.is_active ? `
                  <span class="font-mono text-[11px] font-bold bg-white px-2 py-0.5 brut-border-sm">
                    👁️ ${link.view_count}x dikunjungi • ${link.pin_hash ? '🔒 Pakai PIN' : '🔓 Publik'}
                  </span>
                ` : `<span class="brut-badge bg-brut-red text-white">NONAKTIF</span>`}
              </div>

              ${link && link.is_active ? `
                <div class="flex gap-2">
                  <input type="text" readonly value="${esc(shareUrl)}" id="shareInput-${esc(p.id)}" class="brut-input text-xs font-mono py-1.5 flex-1 bg-white">
                  <button onclick="copyShareUrl('${esc(p.id)}')" class="brut-btn bg-brut-yellow px-3 py-1 text-xs uppercase">Salin</button>
                </div>
                <div class="flex flex-wrap gap-2">
                  <button onclick="bukaTracking('${esc(link.token)}')" class="brut-btn bg-brut-cyan px-3 py-1.5 text-xs uppercase flex-1">
                    Pratinjau Portal Klien
                  </button>
                  <button onclick="shareViaWhatsApp('${esc(p.name)}', '${esc(shareUrl)}')" class="brut-btn bg-brut-lime px-3 py-1.5 text-xs uppercase">
                    Bagikan WA
                  </button>
                  <button onclick="openShareConfigModal('${esc(p.id)}')" class="brut-btn bg-white px-3 py-1.5 text-xs uppercase">
                    ⚙️ Atur Privasi & PIN
                  </button>
                </div>
              ` : `
                <button onclick="openShareConfigModal('${esc(p.id)}')" class="w-full brut-btn bg-brut-yellow py-2 text-xs uppercase">
                  + Buat / Aktifkan Link Tracking Klien
                </button>
              `}

              <div class="pt-3 border-t-2 border-dashed border-black/30">
                <button onclick="hapusProyek('${esc(p.id)}')"
                        class="w-full brut-btn bg-brut-red text-white py-2 text-xs uppercase flex items-center justify-center gap-1.5">
                  🗑️ Hapus Proyek Ini
                </button>
              </div>
            </div>
          </div>
        `;
      }).join('');
    }

    function copyShareUrl(projectId) {
      const inp = document.getElementById(`shareInput-${projectId}`);
      if (!inp) return;
      inp.select();
      document.execCommand('copy');
      showToast('URL Tracking Klien berhasil disalin ke clipboard!', 'success');
    }

    function shareViaWhatsApp(projectName, url) {
      const text = encodeURIComponent(`Halo! Berikut tautan laporan progres real-time untuk proyek *${projectName}*:\n${url}`);
      window.open(`https://wa.me/?text=${text}`, '_blank');
    }

    /**************************************************************
     * 13. PORTAL TRACKING KLIEN PUBLIK (FR-5.1 - FR-5.7)
     **************************************************************/
    /** Buka portal tracking klien di tab baru (halaman /share/<token>). */
    function bukaTracking(token, pin = '') {
      const url = `${location.origin}/share/${token}` + (pin ? `?pin=${encodeURIComponent(pin)}` : '');
      window.open(url, '_blank');
    }

    async function openClientTrackPreview(token, pin = '') {
      state.currentTrackingToken = token;
      try {
        const res = await api.getTrackingData(token, pin);
        /* Portal klien adalah halaman sendiri (share/index.php). */
        const view = document.getElementById('clientTrackView');
        if (view) view.classList.remove('hidden');

        if (res.requirePin) {
          document.getElementById('clientPinGate').classList.remove('hidden');
          document.getElementById('clientTrackContent').classList.add('hidden');
          lucide.createIcons();
          return;
        }

        document.getElementById('clientPinGate').classList.add('hidden');
        const content = document.getElementById('clientTrackContent');
        content.classList.remove('hidden');

        const { project, link, tasks } = res;
        /* Portal klien tidak login, jadi getBootstrapData tidak pernah jalan dan
           mockDB masih berisi data contoh. Suntikkan data proyek ini supaya
           perhitungan progres & jam kerja memakai angka nyata dari server. */
        mockDB.projects = [project];
        mockDB.tasks = tasks;
        mockDB.timeLogs = res.timeLogs || [];
        const pct = calculateProjectProgress(project.id);
        const milestones = tasks.filter(t => t.is_milestone);

        content.innerHTML = `
          <!-- Header Proyek Klien -->
          <div class="brut-card p-6 bg-white space-y-4">
            <div class="flex flex-wrap items-center justify-between gap-2">
              <div>
                <span class="brut-badge bg-brut-lime">${t('share.status', 'STATUS')}: ${esc(project.status)}</span>
                <h2 class="font-display font-extrabold text-2xl sm:text-3xl mt-1">${esc(project.name)}</h2>
                <p class="text-xs font-bold text-zinc-600">${t('share.klien', 'Klien')}: ${esc(project.client_name)} • ${t('share.update', 'Update Terakhir')}: ${formatDateID(link.last_viewed_at)}</p>
              </div>
              <div class="text-right">
                <div class="font-mono font-extrabold text-4xl bg-brut-yellow px-4 py-2 brut-border brut-shadow-sm">${pct}%</div>
              </div>
            </div>
            <p class="text-sm font-semibold">${esc(project.description)}</p>
            <div class="w-full h-6 bg-zinc-100 brut-border">
              <div class="h-full bg-brut-lime border-r-2 border-black" style="width:${pct}%"></div>
            </div>
          </div>

          <!-- Milestone Utama -->
          <div class="brut-card p-6 bg-white space-y-4">
            <h3 class="font-display font-extrabold text-lg uppercase border-b-2 border-black pb-2">🎯 ${t('share.milestone', 'Milestone Utama Proyek')}</h3>
            ${milestones.length === 0 ? `
              <p class="text-xs font-bold text-zinc-500 bg-zinc-50 p-3 brut-border-sm">
                ${t('share.tanpamilestone', 'Belum ada milestone yang dibagikan ke klien.')}
              </p>
            ` : `
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
              ${milestones.map(m => `
                <div class="p-3 brut-border-sm ${warnaStatus(m.status)}">
                  <div class="flex justify-between text-xs font-mono font-bold mb-1">
                    <span>${formatDateID(m.due_date)}</span>
                    <span>${labelStatus(m.status)}</span>
                  </div>
                  <div class="font-extrabold text-sm">${esc(m.title)}</div>
                </div>
              `).join('')}
            </div>
            `}
          </div>

          <!-- Daftar Tugas Sesuai Pengaturan Privasi Admin (FR-5.3) -->
          <div class="brut-card p-6 bg-white space-y-4">
            <h3 class="font-display font-extrabold text-lg uppercase border-b-2 border-black pb-2">📋 ${t('share.rincian', 'Rincian Progres Pekerjaan')}</h3>
            <div class="space-y-3">
              ${tasks.map(t => {
                const u = mockDB.users.find(x => x.id === t.assignee_id);
                const subs = t.subtasks || [];
                const subDone = subs.filter(s => s.done).length;
                const pctTugas = Math.round(skorTugas(t) * 100);
                return `
                  <div class="p-4 brut-border-sm bg-amber-50/40 space-y-2">
                    <div class="flex flex-wrap items-center justify-between gap-3">
                      <div class="space-y-1">
                        <div class="font-extrabold text-sm sm:text-base">${esc(t.title)}</div>
                        ${link.show_notes && t.description ? `<p class="text-xs text-zinc-700">${esc(t.description)}</p>` : ''}
                        <div class="flex flex-wrap gap-3 text-xs font-mono text-zinc-600">
                          <span>Tenggat: <b>${formatDateID(t.due_date)}</b></span>
                          ${link.show_workers ? `<span>PIC: <b>${esc(u ? u.name : '-')}</b></span>` : ''}
                          ${link.show_hours ? `<span>Jam Kerja: <b>${getTaskActualHours(t.id)}j</b></span>` : ''}
                        </div>
                      </div>
                      <div class="flex items-center gap-2">
                        ${subs.length ? `<span class="font-mono text-xs font-bold bg-white brut-border-sm px-2 py-0.5">${pctTugas}%</span>` : ''}
                        <span class="brut-badge ${warnaStatus(t.status)}">
                          ${labelStatus(t.status)}
                        </span>
                      </div>
                    </div>

                    ${subs.length ? `
                      <div class="pt-2 border-t-2 border-black/10 space-y-1.5">
                        <div class="flex items-center justify-between text-[11px] font-mono font-bold uppercase">
                          <span>Sub-Tugas / Checklist</span>
                          <span>${subDone}/${subs.length} selesai</span>
                        </div>
                        <div class="w-full h-2 bg-white brut-border-sm overflow-hidden">
                          <div class="h-full bg-brut-cyan" style="width:${subs.length ? Math.round(subDone / subs.length * 100) : 0}%"></div>
                        </div>
                        ${subs.map(s => `
                          <div class="flex items-start gap-2 text-xs font-semibold ${s.done ? 'text-zinc-500' : ''}">
                            <span class="shrink-0 font-mono font-extrabold ${s.done ? 'text-green-700' : 'text-zinc-400'}">${s.done ? '[✓]' : '[ ]'}</span>
                            <span class="${s.done ? 'line-through' : ''}">${esc(s.title)}</span>
                          </div>
                        `).join('')}
                      </div>
                    ` : ''}
                  </div>
                `;
              }).join('')}
            </div>
          </div>
        `;
        lucide.createIcons();
      } catch (err) {
        showToast(err.message, 'error');
      }
    }

    function submitClientPin() {
      const pin = document.getElementById('clientPinInput').value.trim();
      openClientTrackPreview(state.currentTrackingToken, pin);
    }

    function exitClientTrackPreview() {
      location.href = '/';
    }

    /**************************************************************
     * 14. RENDER TIMESHEET & KELOLA PENGGUNA (FR-4.7 & FR-1.4)
     **************************************************************/
    function renderTimesheet() {
      const uFilter = document.getElementById('tsUserFilter').value;
      const pFilter = document.getElementById('tsProjectFilter').value;

      const logs = mockDB.timeLogs.filter(l => {
        if (state.currentUser.role !== 'admin' && l.user_id !== state.currentUser.id) return false;
        if (uFilter !== 'ALL' && l.user_id !== uFilter) return false;
        if (pFilter !== 'ALL' && l.project_id !== pFilter) return false;
        return true;
      });

      const totalMins = logs.reduce((s, l) => s + (Number(l.duration_minutes) || 0), 0);
      const manualMins = logs.filter(l => l.is_manual).reduce((s, l) => s + (Number(l.duration_minutes) || 0), 0);

      document.getElementById('tsSummaryCards').innerHTML = `
        <div class="brut-card p-4 bg-brut-yellow">
          <div class="text-xs font-extrabold uppercase">Total Jam Tercatat</div>
          <div class="font-display font-extrabold text-3xl mt-1">${formatMinutes(totalMins)}</div>
        </div>
        <div class="brut-card p-4 bg-brut-lime">
          <div class="text-xs font-extrabold uppercase">Via Timer Otomatis</div>
          <div class="font-display font-extrabold text-3xl mt-1">${formatMinutes(totalMins - manualMins)}</div>
        </div>
        <div class="brut-card p-4 bg-brut-orange">
          <div class="text-xs font-extrabold uppercase">Input Manual</div>
          <div class="font-display font-extrabold text-3xl mt-1">${formatMinutes(manualMins)}</div>
        </div>
      `;

      document.getElementById('tsTableBody').innerHTML = logs.map(l => {
        const u = mockDB.users.find(x => x.id === l.user_id);
        const tugasObj = mockDB.tasks.find(x => x.id === l.task_id);
        const p = mockDB.projects.find(x => x.id === l.project_id);
        return `
          <tr class="border-b-2 border-black">
            <td class="p-3 border-r-2 border-black font-mono text-xs">${formatDateID(l.start_time)}</td>
            <td class="p-3 border-r-2 border-black font-bold">${esc(u ? u.name : '-')}</td>
            <td class="p-3 border-r-2 border-black">
              <div class="font-bold">${esc(t ? t.title : '-')}</div>
              <div class="text-xs text-zinc-600">${esc(p ? p.name : '')}</div>
            </td>
            <td class="p-3 border-r-2 border-black">
              <span class="brut-badge ${l.is_manual ? 'bg-brut-orange' : 'bg-brut-lime'}">${l.is_manual ? 'MANUAL' : 'TIMER'}</span>
            </td>
            <td class="p-3 border-r-2 border-black font-mono font-bold">${l.end_time ? formatMinutes(l.duration_minutes) : 'BERJALAN'}</td>
            <td class="p-3 border-r-2 border-black text-xs">${esc(l.note || '-')}</td>
            <td class="p-3">
              <button onclick="handleDeleteLog('${esc(l.id)}')" class="brut-btn bg-brut-red text-white px-2 py-1 text-xs">Hapus</button>
            </td>
          </tr>
        `;
      }).join('');
    }

    async function handleDeleteLog(logId) {
      try {
        await api.deleteLog(logId);
        showToast('Log waktu berhasil dihapus.', 'info');
        renderTimesheet();
      } catch (err) {
        showToast(err.message, 'error');
      }
    }

    function exportTimesheetCSV() {
      const rows = [['Tanggal', 'Pekerja', 'Tugas', 'Metode', 'Durasi (Menit)', 'Catatan']];
      mockDB.timeLogs.forEach(l => {
        const u = mockDB.users.find(x => x.id === l.user_id);
        const tugasObj = mockDB.tasks.find(x => x.id === l.task_id);
        rows.push([l.start_time, u ? u.name : '', t ? tugasObj.title : '', l.is_manual ? 'Manual' : 'Timer', l.duration_minutes, l.note || '']);
      });
      const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Timesheet_Ductions_${state.TODAY_STR}.csv`;
      a.click();
      showToast('File CSV Timesheet berhasil diunduh!', 'success');
    }

    function renderUsers() {
      document.getElementById('usersTableBody').innerHTML = mockDB.users.map(u => `
        <tr class="border-b-2 border-black">
          <td class="p-3 border-r-2 border-black">
            <div class="font-extrabold">${esc(u.name)}</div>
            <div class="font-mono text-xs text-zinc-600">${esc(u.email)}</div>
          </td>
          <td class="p-3 border-r-2 border-black">
            <span class="brut-badge ${u.role === 'admin' ? 'bg-brut-yellow' : 'bg-brut-cyan'}">${esc(u.role)}</span>
          </td>
          <td class="p-3 border-r-2 border-black font-mono text-xs">Rp ${Number(u.hourly_rate || 0).toLocaleString('id-ID')}/jam</td>
          <td class="p-3 border-r-2 border-black">
            <span class="brut-badge ${u.is_active ? 'bg-brut-lime' : 'bg-brut-red text-white'}">${u.is_active ? 'AKTIF' : 'NONAKTIF'}</span>
          </td>
          <td class="p-3 border-r-2 border-black font-mono text-xs">
            Gagal Login: ${u.failed_login || 0}/5
          </td>
          <td class="p-3 flex flex-wrap gap-1.5">
            <button onclick="toggleUserActive('${esc(u.id)}')" class="brut-btn bg-white px-2 py-1 text-xs">
              ${u.is_active ? 'Nonaktifkan' : 'Aktifkan'}
            </button>
            <button onclick="resetUserPassword('${esc(u.id)}')" class="brut-btn bg-brut-yellow px-2 py-1 text-xs">
              Reset Sandi
            </button>
            <button onclick="hapusPengguna('${esc(u.id)}')" class="brut-btn bg-brut-red text-white px-2 py-1 text-xs">
              Hapus
            </button>
          </td>
        </tr>
      `).join('');
    }

    function toggleUserActive(uid) {
      const u = mockDB.users.find(x => x.id === uid);
      if (u) {
        u.is_active = !u.is_active;
        renderUsers();
        showToast(`Status akun ${u.name} diperbarui.`, 'info');
      }
    }

    function resetUserPassword(uid) {
      const u = mockDB.users.find(x => x.id === uid);
      if (u) {
        u.password_hash = 'ductions123';
        u.failed_login = 0;
        u.locked_until = null;
        renderUsers();
        showToast(`Password ${u.name} direset ke: ductions123`, 'success');
      }
    }

    /**************************************************************
     * 15. MODAL DIALOG FORMS (PROYEK, TUGAS, SHARE LINK, MANUAL LOG)
     **************************************************************/
    function openModal(title, htmlContent) {
      document.getElementById('modalTitle').textContent = title;
      document.getElementById('modalBody').innerHTML = htmlContent;
      document.getElementById('modalBackdrop').classList.remove('hidden');
    }

    function closeModal() {
      document.getElementById('modalBackdrop').classList.add('hidden');
    }

    /**************************************************************
     * HAPUS DATA — modal konfirmasi (bukan confirm() bawaan)
     * Semua penghapusan bersifat soft delete di server, tetapi tetap
     * memakai konfirmasi eksplisit supaya tidak terklik tak sengaja.
     **************************************************************/
    let _aksiHapus = null;

    function konfirmasiHapus(judul, pesan, labelTombol, aksi) {
      _aksiHapus = aksi;
      openModal(judul, `
        <div class="space-y-4 text-sm">
          <div class="p-3 bg-brut-red/10 brut-border-sm flex items-start gap-2">
            <span class="text-xl leading-none">⚠️</span>
            <div class="font-bold">${pesan}</div>
          </div>
          <p class="text-xs font-mono text-zinc-600">
            Data tidak akan tampil lagi di aplikasi. Tindakan ini tidak bisa dibatalkan dari antarmuka.
          </p>
          <div class="flex gap-2 justify-end">
            <button type="button" onclick="batalHapus()" class="brut-btn bg-white px-4 py-2 text-xs uppercase">Batal</button>
            <button type="button" id="btnKonfirmasiHapus" onclick="jalankanHapus()"
                    class="brut-btn bg-brut-red text-white px-4 py-2 text-xs uppercase">
              ${labelTombol}
            </button>
          </div>
        </div>
      `);
    }

    function batalHapus() {
      _aksiHapus = null;
      closeModal();
    }

    async function jalankanHapus() {
      const aksi = _aksiHapus;
      if (!aksi) return;
      const tombol = document.getElementById('btnKonfirmasiHapus');
      if (tombol) {
        tombol.disabled = true;
        tombol.textContent = 'Menghapus…';
      }
      try {
        await aksi();
      } catch (err) {
        showToast(err.message || 'Gagal menghapus data.', 'error');
      } finally {
        _aksiHapus = null;
        closeModal();
      }
    }

    /* --- Hapus tugas (dipakai Timeline, To Do, drawer) --- */
    function hapusTugas(taskId) {
      const tugasObj = mockDB.tasks.find(x => x.id === taskId);
      if (!t) return;
      konfirmasiHapus(
        'Hapus Tugas',
        `Hapus tugas <b>"${esc(t.title)}"</b>?`,
        'Ya, Hapus Tugas',
        async () => {
          await api.deleteTask(taskId);
          mockDB.tasks = mockDB.tasks.filter(x => x.id !== taskId);
          closeTaskDrawer();
          showToast(t('toast.tugasdihapus', 'Tugas dihapus.'), 'success');
          refreshCurrentPage();
        }
      );
    }

    /* --- Hapus satu sub-tugas / checklist --- */
    function hapusSubTugas(taskId, subtaskId) {
      const tugasObj = mockDB.tasks.find(x => x.id === taskId);
      const s = t && (t.subtasks || []).find(x => x.id === subtaskId);
      if (!s) return;
      konfirmasiHapus(
        'Hapus Sub-Tugas',
        `Hapus sub-tugas <b>"${esc(s.title)}"</b>?`,
        'Ya, Hapus Sub-Tugas',
        async () => {
          const hasil = await api.deleteSubtask({ taskId, subtaskId });
          if (t) t.subtasks = (hasil && hasil.subtasks) || (t.subtasks || []).filter(x => x.id !== subtaskId);
          showToast('Sub-tugas dihapus.', 'success');
          openTaskDrawer(taskId);
          refreshCurrentPage();
        }
      );
    }

    /* --- Hapus proyek beserta tugas-tugasnya --- */
    function hapusProyek(projectId) {
      const p = mockDB.projects.find(x => x.id === projectId);
      if (!p) return;
      const jumlahTugas = mockDB.tasks.filter(t => t.project_id === projectId && !t.is_deleted).length;
      konfirmasiHapus(
        'Hapus Proyek',
        `Hapus proyek <b>"${esc(p.name)}"</b>${jumlahTugas ? ` beserta <b>${jumlahTugas} tugas</b> di dalamnya` : ''}?`,
        'Ya, Hapus Proyek',
        async () => {
          await api.deleteProject(projectId);
          mockDB.projects = mockDB.projects.filter(x => x.id !== projectId);
          mockDB.tasks = mockDB.tasks.filter(x => x.project_id !== projectId);
          showToast(t('toast.proyekdihapus', 'Proyek dihapus.'), 'success');
          refreshCurrentPage();
        }
      );
    }

    /* --- Hapus pengguna --- */
    function hapusPengguna(userId) {
      const u = mockDB.users.find(x => x.id === userId);
      if (!u) return;
      konfirmasiHapus(
        'Hapus Pengguna',
        `Hapus pengguna <b>"${esc(u.name)}"</b> (${esc(u.email)})?`,
        'Ya, Hapus Pengguna',
        async () => {
          await api.deleteUser(userId);
          mockDB.users = mockDB.users.filter(x => x.id !== userId);
          showToast('Pengguna dihapus.', 'success');
          refreshCurrentPage();
        }
      );
    }

    function openProjectModal() {
      openModal('Buat Proyek Baru (FR-2.1)', `
        <form onsubmit="submitNewProject(event)" class="space-y-3 text-xs sm:text-sm">
          <div>
            <label class="font-extrabold uppercase block mb-1">Nama Proyek</label>
            <input type="text" id="mpName" required class="w-full brut-input" placeholder="Contoh: Desain Aplikasi Kasir">
          </div>
          <div class="grid grid-cols-2 gap-2">
            <div>
              <label class="font-extrabold uppercase block mb-1">Nama Klien</label>
              <input type="text" id="mpClient" required class="w-full brut-input" placeholder="PT Maju Bersama">
            </div>
            <div>
              <label class="font-extrabold uppercase block mb-1">Warna Label Kalender</label>
              <input type="color" id="mpColor" value="#FFDE00" class="w-full h-10 brut-border cursor-pointer">
            </div>
          </div>
          <div class="grid grid-cols-2 gap-2">
            <div>
              <label class="font-extrabold uppercase block mb-1">Tanggal Mulai</label>
              <input type="date" id="mpStart" required value="2026-10-24" class="w-full brut-input">
            </div>
            <div>
              <label class="font-extrabold uppercase block mb-1">Target Selesai</label>
              <input type="date" id="mpEnd" required value="2026-11-15" class="w-full brut-input">
            </div>
          </div>
          <div>
            <label class="font-extrabold uppercase block mb-1">Metode Perhitungan Progres (FR-2.7)</label>
            <select id="mpMode" class="w-full brut-input">
              <option value="count">Jumlah Tugas Selesai ÷ Total Tugas</option>
              <option value="weighted">Berbobot Jam Estimasi Tugas</option>
            </select>
          </div>
          <div>
            <label class="font-extrabold uppercase block mb-1">Deskripsi Proyek</label>
            <textarea id="mpDesc" rows="2" class="w-full brut-input"></textarea>
          </div>
          <button type="submit" class="w-full brut-btn bg-brut-yellow py-2.5 uppercase">Simpan Proyek</button>
        </form>
      `);
    }

    async function submitNewProject(e) {
      e.preventDefault();
      await api.createProject({
        name: document.getElementById('mpName').value,
        client_name: document.getElementById('mpClient').value,
        color: document.getElementById('mpColor').value,
        start_date: document.getElementById('mpStart').value,
        end_date: document.getElementById('mpEnd').value,
        progress_mode: document.getElementById('mpMode').value,
        description: document.getElementById('mpDesc').value
      });
      closeModal();
      populateFilterDropdowns();
      refreshCurrentPage();
      showToast(t('toast.proyekbaru', 'Proyek baru berhasil ditambahkan!'), 'success');
    }

    function openTaskModal() {
      const prjOpts = mockDB.projects.filter(p => !p.is_deleted).map(p => `<option value="${esc(p.id)}">${esc(p.name)}</option>`).join('');
      const usrOpts = mockDB.users.map(u => `<option value="${esc(u.id)}" ${u.id === state.currentUser.id ? 'selected' : ''}>${esc(u.name)}</option>`).join('');

      openModal('Tambah Tugas / Milestone (FR-2.2)', `
        <form onsubmit="submitNewTask(event)" class="space-y-3 text-xs sm:text-sm">
          <div>
            <label class="font-extrabold uppercase block mb-1">Pilih Proyek</label>
            <select id="mtProject" required class="w-full brut-input">${prjOpts}</select>
          </div>
          <div>
            <label class="font-extrabold uppercase block mb-1">Judul Tugas</label>
            <input type="text" id="mtTitle" required class="w-full brut-input" placeholder="Contoh: Integrasi API Pembayaran">
          </div>
          <div class="grid grid-cols-2 gap-2">
            <div>
              <label class="font-extrabold uppercase block mb-1">Penanggung Jawab</label>
              <select id="mtAssignee" class="w-full brut-input">${usrOpts}</select>
            </div>
            <div>
              <label class="font-extrabold uppercase block mb-1">Prioritas</label>
              <select id="mtPriority" class="w-full brut-input">
                <option value="low">Low</option>
                <option value="medium" selected>Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
          </div>
          <div class="grid grid-cols-3 gap-2">
            <div>
              <label class="font-extrabold uppercase block mb-1">Mulai</label>
              <input type="date" id="mtStart" required value="2026-10-24" class="w-full brut-input">
            </div>
            <div>
              <label class="font-extrabold uppercase block mb-1">Tenggat</label>
              <input type="date" id="mtDue" required value="2026-10-26" class="w-full brut-input">
            </div>
            <div>
              <label class="font-extrabold uppercase block mb-1">Estimasi Jam</label>
              <input type="number" id="mtEst" required value="4" min="1" class="w-full brut-input">
            </div>
          </div>
          <div class="flex gap-4 pt-1">
            <label class="flex items-center gap-2 font-bold cursor-pointer">
              <input type="checkbox" id="mtMilestone" checked class="w-4 h-4 accent-black"> Tandai sebagai Milestone
            </label>
            <label class="flex items-center gap-2 font-bold cursor-pointer">
              <input type="checkbox" id="mtVisible" checked class="w-4 h-4 accent-black"> Tampil di Link Klien
            </label>
          </div>
          <div>
            <label class="font-extrabold uppercase block mb-1">Catatan / Deskripsi</label>
            <textarea id="mtDesc" rows="2" class="w-full brut-input"></textarea>
          </div>
          <button type="submit" class="w-full brut-btn bg-brut-lime py-2.5 uppercase">Simpan Tugas</button>
        </form>
      `);
    }

    async function submitNewTask(e) {
      e.preventDefault();
      await api.createTask({
        project_id: document.getElementById('mtProject').value,
        title: document.getElementById('mtTitle').value,
        assignee_id: document.getElementById('mtAssignee').value,
        priority: document.getElementById('mtPriority').value,
        start_date: document.getElementById('mtStart').value,
        due_date: document.getElementById('mtDue').value,
        estimate_hours: document.getElementById('mtEst').value,
        is_milestone: document.getElementById('mtMilestone').checked,
        visible_to_client: document.getElementById('mtVisible').checked,
        description: document.getElementById('mtDesc').value
      });
      closeModal();
      refreshCurrentPage();
      showToast(t('toast.tugasbaru', 'Tugas baru berhasil dibuat!'), 'success');
    }

    function openManualLogModal() {
      const taskOpts = mockDB.tasks.filter(t => !t.is_deleted).map(t => `<option value="${esc(t.id)}">${esc(t.title)}</option>`).join('');
      openModal('Input Waktu Kerja Manual (FR-4.5)', `
        <form onsubmit="submitManualLog(event)" class="space-y-3 text-xs sm:text-sm">
          <div class="p-2.5 bg-amber-100 brut-border-sm font-bold text-xs">
            ⚠️ Catatan waktu manual akan diberi label khusus <b>"MANUAL"</b> pada laporan timesheet dan wajib menyertakan alasan.
          </div>
          <div>
            <label class="font-extrabold uppercase block mb-1">Pilih Tugas</label>
            <select id="mlTask" required class="w-full brut-input">${taskOpts}</select>
          </div>
          <div>
            <label class="font-extrabold uppercase block mb-1">Durasi Kerja (Menit)</label>
            <input type="number" id="mlMins" required min="5" value="60" class="w-full brut-input">
          </div>
          <div>
            <label class="font-extrabold uppercase block mb-1">Alasan Input Manual (Wajib)</label>
            <textarea id="mlNote" required rows="2" placeholder="Contoh: Rapat di lapangan bersama klien, lupa menekan tombol Start..." class="w-full brut-input"></textarea>
          </div>
          <button type="submit" class="w-full brut-btn bg-brut-cyan py-2.5 uppercase">Simpan Log Manual</button>
        </form>
      `);
    }

    async function submitManualLog(e) {
      e.preventDefault();
      try {
        await api.addManualLog({
          task_id: document.getElementById('mlTask').value,
          duration_minutes: document.getElementById('mlMins').value,
          note: document.getElementById('mlNote').value
        });
        closeModal();
        refreshCurrentPage();
        showToast(t('toast.logmanual', 'Log waktu manual berhasil disimpan.'), 'success');
      } catch (err) {
        showToast(err.message, 'error');
      }
    }

    function openShareConfigModal(projectId) {
      const link = mockDB.shareLinks.find(s => s.project_id === projectId) || {
        pin_hash: '', show_hours: true, show_workers: true, show_notes: true, expires_at: '2026-12-31', is_active: true
      };
      openModal('Pengaturan Link Tracking Klien (FR-5.3 & FR-5.4)', `
        <form onsubmit="submitShareConfig(event, '${esc(projectId)}')" class="space-y-3 text-xs sm:text-sm">
          <div class="space-y-2">
            <label class="font-extrabold uppercase block">Visibilitas Data untuk Klien:</label>
            <label class="flex items-center gap-2 font-bold cursor-pointer">
              <input type="checkbox" id="scHours" ${link.show_hours ? 'checked' : ''} class="w-4 h-4 accent-black"> Tampilkan Jam Kerja Aktual
            </label>
            <label class="flex items-center gap-2 font-bold cursor-pointer">
              <input type="checkbox" id="scWorkers" ${link.show_workers ? 'checked' : ''} class="w-4 h-4 accent-black"> Tampilkan Nama Pekerja (PIC)
            </label>
            <label class="flex items-center gap-2 font-bold cursor-pointer">
              <input type="checkbox" id="scNotes" ${link.show_notes ? 'checked' : ''} class="w-4 h-4 accent-black"> Tampilkan Deskripsi / Catatan Tugas
            </label>
          </div>
          <div class="grid grid-cols-2 gap-2 pt-2">
            <div>
              <label class="font-extrabold uppercase block mb-1">PIN Keamanan (Opsional)</label>
              <input type="text" id="scPin" value="${esc(link.pin_hash || '')}" maxlength="6" placeholder="Kosongkan jika tanpa PIN" class="w-full brut-input font-mono">
            </div>
            <div>
              <label class="font-extrabold uppercase block mb-1">Kedaluwarsa Link</label>
              <input type="date" id="scExp" value="${esc(link.expires_at || '2026-12-31')}" class="w-full brut-input">
            </div>
          </div>
          <div class="flex flex-col gap-2 pt-2 border-t-2 border-black">
            <label class="flex items-center gap-2 font-bold cursor-pointer">
              <input type="checkbox" id="scActive" ${link.is_active !== false ? 'checked' : ''} class="w-4 h-4 accent-black"> Link Aktif (Matikan untuk Revoke / Cabut Akses)
            </label>
            <label class="flex items-center gap-2 font-bold cursor-pointer text-red-700">
              <input type="checkbox" id="scRegen" class="w-4 h-4 accent-black"> Buat Ulang Token 32 Karakter Baru (Link lama hangus)
            </label>
          </div>
          <button type="submit" class="w-full brut-btn bg-brut-yellow py-2.5 uppercase">Simpan Pengaturan Link</button>
        </form>
      `);
    }

    async function submitShareConfig(e, projectId) {
      e.preventDefault();
      await api.createOrUpdateShareLink({
        project_id: projectId,
        show_hours: document.getElementById('scHours').checked,
        show_workers: document.getElementById('scWorkers').checked,
        show_notes: document.getElementById('scNotes').checked,
        pin: document.getElementById('scPin').value.trim(),
        expires_at: document.getElementById('scExp').value,
        is_active: document.getElementById('scActive').checked,
        regenerate: document.getElementById('scRegen').checked
      });
      closeModal();
      renderProjects();
      showToast('Pengaturan link tracking klien berhasil diperbarui!', 'success');
    }

    function openUserModal() {
      openModal('Tambah Pengguna Baru (FR-1.4)', `
        <form onsubmit="submitNewUser(event)" class="space-y-3 text-xs sm:text-sm">
          <div>
            <label class="font-extrabold uppercase block mb-1">Nama Lengkap</label>
            <input type="text" id="muName" required class="w-full brut-input">
          </div>
          <div>
            <label class="font-extrabold uppercase block mb-1">Email</label>
            <input type="email" id="muEmail" required class="w-full brut-input">
          </div>
          <div class="grid grid-cols-2 gap-2">
            <div>
              <label class="font-extrabold uppercase block mb-1">Peran</label>
              <select id="muRole" class="w-full brut-input">
                <option value="worker">Pekerja (Worker)</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div>
              <label class="font-extrabold uppercase block mb-1">Tarif per Jam (Rp)</label>
              <input type="number" id="muRate" value="80000" class="w-full brut-input">
            </div>
          </div>
          <div>
            <label class="font-extrabold uppercase block mb-1">Password Awal</label>
            <input type="text" id="muPass" required value="pekerja123" class="w-full brut-input font-mono">
          </div>
          <button type="submit" class="w-full brut-btn bg-brut-lime py-2.5 uppercase">Tambah Akun</button>
        </form>
      `);
    }

    async function submitNewUser(e) {
      e.preventDefault();
      const muat = tombol => { if (tombol) { tombol.disabled = true; tombol.textContent = 'Menyimpan…'; } };
      const btn = e.target.querySelector('button[type=submit]');
      muat(btn);

      try {
        const hasil = await api.createUser({
          name: document.getElementById('muName').value.trim(),
          email: document.getElementById('muEmail').value.trim(),
          role: document.getElementById('muRole').value,
          hourly_rate: Number(document.getElementById('muRate').value) || 0,
          password: document.getElementById('muPass').value
        });

        /* Server mengembalikan baris yang benar-benar tersimpan; masukkan ke
           mockDB supaya tabel langsung terisi tanpa perlu reload halaman. */
        if (hasil && hasil.id) {
          mockDB.users.push({
            id: hasil.id, name: hasil.name, email: hasil.email,
            role: hasil.role, hourly_rate: hasil.hourly_rate || 0,
            is_active: true, failed_login: 0, locked_until: null
          });
        }

        closeModal();
        populateFilterDropdowns();
        renderUsers();
        showToast('Pengguna baru berhasil disimpan.', 'success');
        refreshCurrentPage();
      } catch (err) {
        showToast(err.message || 'Gagal menyimpan pengguna.', 'error');
        muat(btn);
        if (btn) { btn.disabled = false; btn.textContent = 'Simpan Pengguna'; }
      }
    }

    function openPasswordModal() {
      openModal('Ganti Password Saya (FR-1.5)', `
        <form onsubmit="submitChangePass(event)" class="space-y-3 text-xs sm:text-sm">
          <div>
            <label class="font-extrabold uppercase block mb-1">Password Baru</label>
            <input type="password" id="cpNew" required minlength="6" class="w-full brut-input">
          </div>
          <button type="submit" class="w-full brut-btn bg-brut-yellow py-2.5 uppercase">Perbarui Password</button>
        </form>
      `);
    }

    function submitChangePass(e) {
      e.preventDefault();
      const nw = document.getElementById('cpNew').value;
      const u = mockDB.users.find(x => x.id === state.currentUser.id);
      if (u) u.password_hash = nw;
      closeModal();
      showToast('Password Anda berhasil diperbarui!', 'success');
    }

    // Inisialisasi ikon; boot halaman dijalankan oleh bootPage() di boot.js.
    window.addEventListener('DOMContentLoaded', () => {
      lucide.createIcons();
    });
