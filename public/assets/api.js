/* ==========================================================================
   DUCTIONS — API.JS
   ========================================================================== */
    /**************************************************************
     * 3. PEMBUNGKUS OBJEK `api` (SESUAI PRD BAB 8 & 10.4)
     **************************************************************/
    const callGAS = (fn, ...args) => new Promise((resolve, reject) => {
      const token = sessionStorage.getItem('ductions_token') || '';
      google.script.run
        .withSuccessHandler(res => res && res.ok ? resolve(res.data) : reject(res ? res.error : 'Terjadi kesalahan server'))
        .withFailureHandler(err => reject(err.message || String(err)))[fn](token, ...args);
    });

    /* Jalur SERVER: HTTP ke backend Express + SQLite. */
    const callServer = async (fn, ...args) => {
      const token = sessionStorage.getItem('ductions_token') || '';
      const badan = {};
      // Petakan argumen posisional ke nama field yang dibaca server
      const NAMA_ARG = {
        login: ['email', 'password'],
        createProject: ['payload'], updateProject: ['payload'], deleteProject: ['projectId'],
        createTask: ['payload'], updateTask: ['payload'], deleteTask: ['taskId'],
        deleteSubtask: ['payload'], deleteUser: ['userId'], createUser: ['payload'],
        updateTaskDates: ['payload'], updateTaskStatus: ['payload'],
        startTimer: ['taskId'], stopTimer: [],
        addManualLog: ['payload'], deleteLog: ['logId'],
        createOrUpdateShareLink: ['payload'], getTrackingData: ['shareToken', 'pin']
      };
      (NAMA_ARG[fn] || []).forEach((nama, i) => {
        if (args[i] !== undefined) badan[nama] = args[i];
      });

      let res;
      try {
        res = await fetch('/api/' + fn, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-Ductions-Token': token },
          body: JSON.stringify(badan)
        });
      } catch (e) {
        throw new Error('Tidak dapat menghubungi server: ' + e.message);
      }
      let json;
      try { json = await res.json(); }
      catch (e) { throw new Error('Respons server tidak valid (HTTP ' + res.status + ')'); }
      if (json && json.ok) return json.data;
      throw new Error((json && json.error) || ('HTTP ' + res.status + ' — terjadi kesalahan server'));
    };

    const api = {
      async login(email, password) {
        if (IS_GAS) return callGAS('login', email, password);
        if (IS_SERVER) return callServer('login', email, password);
        const user = mockDB.users.find(u => u.email.toLowerCase() === email.toLowerCase());
        if (!user) throw new Error('Email tidak ditemukan.');
        if (!user.is_active) throw new Error('Akun Anda telah dinonaktifkan oleh Admin.');
        if (user.locked_until && new Date(user.locked_until) > new Date()) {
          throw new Error('Akun terkunci sementara (15 menit) karena 5x gagal login.');
        }
        if (user.password_hash !== password) {
          user.failed_login = (user.failed_login || 0) + 1;
          if (user.failed_login >= 5) {
            user.locked_until = new Date(Date.now() + 15 * 60000).toISOString();
            throw new Error('Gagal 5 kali berturut-turut! Akun dikunci selama 15 menit (FR-1.6).');
          }
          throw new Error(`Password salah! Percobaan gagal ke-${user.failed_login} dari 5.`);
        }
        user.failed_login = 0;
        user.locked_until = null;
        const token = 'tok_' + Math.random().toString(36).substring(2) + Date.now();
        return { token, user: { id: user.id, name: user.name, email: user.email, role: user.role, hourly_rate: user.hourly_rate } };
      },

      async getBootstrapData() {
        if (IS_GAS) {
          const d = await callGAS('getBootstrapData');
          Object.assign(mockDB, d);   // data server menggantikan data contoh
          return d;
        }
        if (IS_SERVER) {
          const d = await callServer('getBootstrapData');
          // Data dari SQLite menggantikan data contoh di memori.
          // Render memakai mockDB sebagai satu-satunya sumber, jadi cukup ditimpa.
          mockDB.users = d.users;
          mockDB.projects = d.projects;
          mockDB.tasks = d.tasks;
          mockDB.timeLogs = d.timeLogs;
          mockDB.shareLinks = d.shareLinks;
          mockDB.comments = d.comments;
          return d;
        }
        return {
          users: mockDB.users.map(({ password_hash, ...u }) => u),
          projects: mockDB.projects.filter(p => !p.is_deleted),
          tasks: mockDB.tasks.filter(t => !t.is_deleted),
          timeLogs: mockDB.timeLogs,
          shareLinks: mockDB.shareLinks,
          comments: mockDB.comments
        };
      },

      async createProject(payload) {
        if (IS_GAS) return callGAS('createProject', payload);

        if (IS_SERVER) { await callServer('createProject', payload); return await api.getBootstrapData(); }
        const newPrj = {
          id: 'prj-' + Date.now(),
          name: payload.name,
          client_name: payload.client_name,
          client_email: payload.client_email || '',
          description: payload.description || '',
          color: payload.color || '#FFDE00',
          start_date: payload.start_date,
          end_date: payload.end_date,
          status: payload.status || 'Berjalan',
          progress_mode: payload.progress_mode || 'count',
          is_deleted: false
        };
        mockDB.projects.push(newPrj);
        return newPrj;
      },

      async createTask(payload) {
        if (IS_GAS) return callGAS('createTask', payload);

        if (IS_SERVER) { await callServer('createTask', payload); return await api.getBootstrapData(); }
        const newTask = {
          id: 'tsk-' + Date.now(),
          project_id: payload.project_id,
          parent_id: '',
          title: payload.title,
          description: payload.description || '',
          assignee_id: payload.assignee_id,
          start_date: payload.start_date,
          due_date: payload.due_date,
          priority: payload.priority || 'medium',
          status: payload.status || 'todo',
          estimate_hours: Number(payload.estimate_hours) || 2,
          is_milestone: Boolean(payload.is_milestone),
          visible_to_client: payload.visible_to_client !== false,
          is_deleted: false,
          subtasks: []
        };
        mockDB.tasks.push(newTask);
        return newTask;
      },

      async updateTask(payload) {
        if (IS_GAS) return callGAS('updateTask', payload);

        if (IS_SERVER) { await callServer('updateTask', payload); return await api.getBootstrapData(); }
        const idx = mockDB.tasks.findIndex(x => x.id === payload.id);
        if (idx < 0) throw new Error('Tugas tidak ditemukan');
        mockDB.tasks[idx] = { ...mockDB.tasks[idx], ...payload };
        return mockDB.tasks[idx];
      },

      async updateTaskStatus(taskId, newStatus) {
        if (IS_GAS) return callGAS('updateTaskStatus', { taskId, newStatus });

        if (IS_SERVER) { await callServer('updateTaskStatus', { taskId, newStatus }); return await api.getBootstrapData(); }
        const t = mockDB.tasks.find(x => x.id === taskId);
        if (!t) throw new Error('Tugas tidak ditemukan');
        if (state.currentUser.role === 'worker' && newStatus === 'done') {
          throw new Error('Pekerja hanya dapat memindahkan status hingga Review. Admin yang menyetujui ke Done (FR-3.2).');
        }
        t.status = newStatus;
        return t;
      },

      async updateTaskDates(taskId, startDate, dueDate) {
        if (IS_GAS) return callGAS('updateTaskDates', { taskId, startDate, dueDate });

        if (IS_SERVER) { await callServer('updateTaskDates', { taskId, startDate, dueDate }); return await api.getBootstrapData(); }
        const t = mockDB.tasks.find(x => x.id === taskId);
        if (t) {
          t.start_date = startDate;
          t.due_date = dueDate;
        }
        return t;
      },

      async startTimer(taskId) {
        if (IS_GAS) return callGAS('startTimer', taskId);

        if (IS_SERVER) { await callServer('startTimer', taskId); return await api.getBootstrapData(); }
        const uid = state.currentUser.id;
        // Hentikan timer aktif milik user ini terlebih dahulu (FR-4.2)
        mockDB.timeLogs.forEach(l => {
          if (l.user_id === uid && !l.end_time) {
            l.end_time = new Date().toISOString();
            l.duration_minutes = Math.max(1, Math.round((new Date(l.end_time) - new Date(l.start_time)) / 60000));
          }
        });
        const task = mockDB.tasks.find(t => t.id === taskId);
        if (task && task.status === 'todo') task.status = 'in_progress';
        const newLog = {
          id: 'log-' + Date.now(),
          task_id: taskId,
          project_id: task ? task.project_id : '',
          user_id: uid,
          start_time: new Date().toISOString(),
          end_time: '',
          duration_minutes: 0,
          is_manual: false,
          note: 'Timer otomatis',
          created_at: new Date().toISOString()
        };
        mockDB.timeLogs.unshift(newLog);
        return newLog;
      },

      async stopTimer() {
        if (IS_GAS) return callGAS('stopTimer');

        if (IS_SERVER) { await callServer('stopTimer'); return await api.getBootstrapData(); }
        const uid = state.currentUser.id;
        const active = mockDB.timeLogs.find(l => l.user_id === uid && !l.end_time);
        if (!active) throw new Error('Tidak ada timer aktif');
        active.end_time = new Date().toISOString();
        active.duration_minutes = Math.max(1, Math.round((new Date(active.end_time) - new Date(active.start_time)) / 60000));
        return active;
      },

      async addManualLog(payload) {
        if (IS_GAS) return callGAS('addManualLog', payload);

        if (IS_SERVER) { await callServer('addManualLog', payload); return await api.getBootstrapData(); }
        if (!payload.note || payload.note.trim().length < 5) {
          throw new Error('Alasan input waktu manual wajib diisi lengkap (FR-4.5).');
        }
        const task = mockDB.tasks.find(t => t.id === payload.task_id);
        const log = {
          id: 'log-' + Date.now(),
          task_id: payload.task_id,
          project_id: task ? task.project_id : '',
          user_id: state.currentUser.id,
          start_time: new Date().toISOString(),
          end_time: new Date().toISOString(),
          duration_minutes: Number(payload.duration_minutes),
          is_manual: true,
          note: payload.note,
          created_at: new Date().toISOString()
        };
        mockDB.timeLogs.unshift(log);
        return log;
      },

      /* --- Hapus: proyek, tugas, sub-tugas, pengguna ---
         Semua mengembalikan bootstrap data terbaru agar layar langsung
         sinkron dengan server setelah penghapusan. */
      async deleteProject(projectId) {
        if (IS_GAS) return callGAS('deleteProject', projectId);
        if (IS_SERVER) { await callServer('deleteProject', projectId); return await api.getBootstrapData(); }
        mockDB.projects = mockDB.projects.filter(p => p.id !== projectId);
        mockDB.tasks = mockDB.tasks.filter(t => t.project_id !== projectId);
        return api.getBootstrapData();
      },

      async deleteTask(taskId) {
        if (IS_GAS) return callGAS('deleteTask', taskId);
        if (IS_SERVER) { await callServer('deleteTask', taskId); return await api.getBootstrapData(); }
        mockDB.tasks = mockDB.tasks.filter(t => t.id !== taskId);
        return api.getBootstrapData();
      },

      async deleteSubtask(payload) {
        if (IS_GAS) return callGAS('deleteSubtask', payload);
        if (IS_SERVER) return callServer('deleteSubtask', payload);
        const t = mockDB.tasks.find(x => x.id === payload.taskId);
        if (t) t.subtasks = (t.subtasks || []).filter(s => s.id !== payload.subtaskId);
        return { taskId: payload.taskId, subtasks: (t && t.subtasks) || [] };
      },

      async createUser(payload) {
        if (IS_GAS) return callGAS('createUser', payload);
        return callServer('createUser', payload);
      },

      async deleteUser(userId) {
        if (IS_GAS) return callGAS('deleteUser', userId);
        if (IS_SERVER) { await callServer('deleteUser', userId); return await api.getBootstrapData(); }
        mockDB.users = mockDB.users.filter(u => u.id !== userId);
        return api.getBootstrapData();
      },

      async deleteLog(logId) {
        if (IS_GAS) return callGAS('deleteLog', logId);

        if (IS_SERVER) { await callServer('deleteLog', logId); return await api.getBootstrapData(); }
        const idx = mockDB.timeLogs.findIndex(l => l.id === logId);
        if (idx === -1) throw new Error('Log tidak ditemukan');
        const log = mockDB.timeLogs[idx];
        if (state.currentUser.role !== 'admin') {
          const hoursSince = (Date.now() - new Date(log.created_at).getTime()) / 3600000;
          if (log.user_id !== state.currentUser.id || hoursSince > 24) {
            throw new Error('Pekerja hanya dapat menghapus log miliknya maksimal 24 jam setelah dicatat.');
          }
        }
        mockDB.timeLogs.splice(idx, 1);
        return true;
      },

      async createOrUpdateShareLink(payload) {
        if (IS_GAS) return callGAS('createShareLink', payload);

        if (IS_SERVER) { await callServer('createOrUpdateShareLink', payload); return await api.getBootstrapData(); }
        let link = mockDB.shareLinks.find(s => s.project_id === payload.project_id);
        const randomToken = 'trk_' + Array.from({ length: 28 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
        if (link) {
          if (payload.regenerate) link.token = randomToken;
          link.pin_hash = payload.pin || '';
          link.show_hours = Boolean(payload.show_hours);
          link.show_workers = Boolean(payload.show_workers);
          link.show_notes = Boolean(payload.show_notes);
          link.expires_at = payload.expires_at || '2026-12-31';
          link.is_active = Boolean(payload.is_active);
        } else {
          link = {
            id: 'sh-' + Date.now(),
            project_id: payload.project_id,
            token: randomToken,
            pin_hash: payload.pin || '',
            show_hours: Boolean(payload.show_hours),
            show_workers: Boolean(payload.show_workers),
            show_notes: Boolean(payload.show_notes),
            expires_at: payload.expires_at || '2026-12-31',
            is_active: true,
            view_count: 0,
            last_viewed_at: new Date().toISOString()
          };
          mockDB.shareLinks.push(link);
        }
        return link;
      },

      async getTrackingData(shareToken, pin = '') {
        if (IS_GAS) return callGAS('getTrackingData', shareToken, pin);
        if (IS_SERVER) return callServer('getTrackingData', shareToken, pin);
        const link = mockDB.shareLinks.find(s => s.token === shareToken && s.is_active);
        if (!link) throw new Error('Tautan tracking tidak valid atau telah dicabut oleh Admin.');
        if (link.expires_at && new Date(link.expires_at) < new Date('2026-10-24')) {
          throw new Error('Tautan tracking ini telah kedaluwarsa.');
        }
        if (link.pin_hash && link.pin_hash !== pin) {
          return { requirePin: true, token: shareToken };
        }
        link.view_count = (link.view_count || 0) + 1;
        link.last_viewed_at = new Date().toISOString();
        const project = mockDB.projects.find(p => p.id === link.project_id);
        const tasks = mockDB.tasks.filter(t => t.project_id === link.project_id && !t.is_deleted && t.visible_to_client);
        return { requirePin: false, link, project, tasks };
      }
    };
