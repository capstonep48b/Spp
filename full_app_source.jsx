
    const { useState, useEffect, useMemo, useCallback, useRef } = React;

    // Helper Format Currency Rupiah Konsisten: Rp X.XXX.XXX
    const formatRupiah = (val) => {
      if (val === null || val === undefined || val === '' || isNaN(val)) return 'Rp 0';
      return 'Rp ' + Number(val).toLocaleString('id-ID', { minimumFractionDigits: 0 });
    };

    // Helper Parse Angka
    const parseNumberOnly = (val) => {
      if (typeof val === 'number') return val;
      if (!val) return 0;
      const cleaned = val.toString().replace(/[^0-9]/g, '');
      return cleaned ? parseInt(cleaned, 10) : 0;
    };

    // Helper Format Input Display saat diketik
    const formatInputNumber = (val) => {
      const num = parseNumberOnly(val);
      return num ? num.toLocaleString('id-ID', { minimumFractionDigits: 0 }) : '';
    };
    const formatPhoneDisplay = (val) => {
      if (!val) return '-';
      let cleaned = val.replace(/[^0-9]/g, '');
      if (cleaned.length > 8) {
        return cleaned.replace(/(\d{4})(\d{4})(\d+)/, '$1-$2-$3');
      }
      return cleaned;
    };

    // Mappers Database Supabase & App State
    const mapStudentFromDb = (row) => {
      let classHistory = [];
      try {
        const localKey = 'spp_class_history_' + (row.id || row.nis);
        const stored = localStorage.getItem(localKey);
        if (stored) {
          classHistory = JSON.parse(stored);
        }
      } catch (e) {}

      return {
        id: row.id,
        nis: row.nis,
        nipd: row.nipd || row.nis || '',
        nisn: row.nisn || '',
        name: row.name,
        jk: row.jk || 'L',
        tempatLahir: row.tempat_lahir || row.tempatLahir || '',
        tanggalLahir: row.tanggal_lahir || row.tanggalLahir || '',
        nik: row.nik || '',
        agama: row.agama || 'Islam',
        alamat: row.alamat || '',
        rt: row.rt || '',
        rw: row.rw || '',
        kelas: row.kelas,
        tarif: Number(row.tarif || 0),
        wali: row.wali || '',
        telepon: row.telepon || '',
        password: row.password || row.nis || '123456',
        statusAktif: row.status ? (row.status === 'Aktif') : (row.status_aktif !== undefined ? row.status_aktif : true),
        fotoUrl: row.photo_url || row.foto_url || '',
        keringanan_note: row.keringanan_note || '',
        arrearsAmount: 0,
        arrearsNote: row.arrears_note || '',
        classHistory: Array.isArray(classHistory) ? classHistory : []
      };
    };

    const mapTransactionFromDb = (row) => ({
      id: row.id,
      studentId: row.student_id,
      studentName: row.student_name,
      kelas: row.kelas,
      month: row.month,
      amount: Number(row.amount || 0),
      method: row.method || '-',
      status: row.status,
      isRead: row.is_read || false,
      date: row.date || '-',
      kuitansiNo: row.kuitansi_no || '-'
    });

    const mapAnnouncementFromDb = (row) => ({
      id: row.id,
      title: row.title || 'Pengumuman Sekolah',
      content: row.content || '',
      imageUrl: row.image_url || '',
      isRead: row.is_read || false,
      date: row.date || new Date().toLocaleDateString('id-ID')
    });

    const mapComplaintFromDb = (row) => ({
      id: row.id,
      studentId: row.student_id,
      studentName: row.student_name,
      waliName: row.wali_name,
      title: row.title || 'Pengaduan / Masukan',
      content: row.content || '',
      adminReply: row.admin_reply || '',
      messages: row.messages ? (typeof row.messages === 'string' ? JSON.parse(row.messages) : row.messages) : [],
      status: row.status || 'Belum Ditangani',
      isRead: row.is_read || false,
      date: row.date || new Date().toLocaleDateString('id-ID'),
      createdAtMs: row.created_at ? new Date(row.created_at).getTime() : Date.now(),
      expiresAtMs: row.expires_at ? new Date(row.expires_at).getTime() : (Date.now() + 3600000)
    });

    const mapNoteFromDb = (row) => ({
      id: row.id,
      studentId: row.student_id,
      studentName: row.student_name,
      date: row.date || new Date().toLocaleDateString('id-ID'),
      category: row.category || 'Perkembangan Motorik',
      content: row.content || '',
      isRead: row.is_read || false,
      comments: typeof row.comments === 'string' ? JSON.parse(row.comments || '[]') : (row.comments || [])
    });

    const GreetingMascotBanner = ({ name, role = 'Pengguna', schoolName, academicYear }) => {
      const getGreetingData = () => {
        const hr = new Date().getHours();
        if (hr >= 3 && hr < 11) {
          return { greeting: 'Selamat Pagi', icon: '🌅', sub: 'Semoga harimu dipenuhi keberkahan & keceriaan!' };
        } else if (hr >= 11 && hr < 15) {
          return { greeting: 'Selamat Siang', icon: '☀️', sub: 'Tetap semangat dalam membimbing dan beraktivitas hari ini!' };
        } else if (hr >= 15 && hr < 18) {
          return { greeting: 'Selamat Sore', icon: '🌤️', sub: 'Selamat melanjutkan sisa kegiatan sore ini dengan gembira!' };
        } else {
          return { greeting: 'Selamat Malam', icon: '🌙', sub: 'Selamat beristirahat dan bersiap menyambut hari esok!' };
        }
      };

      const { greeting, icon, sub } = getGreetingData();

      return (
        <div className="greeting-welcome-banner rounded-3xl p-5 md:p-6 mb-6 flex flex-col sm:flex-row items-center justify-between gap-5 relative border border-blue-100 shadow-md">
          <div className="flex items-center gap-4 z-10">
            <div className="relative shrink-0">
              <div className="w-14 h-14 md:w-16 md:h-16 rounded-2xl bg-gradient-to-tr from-blue-600 via-sky-500 to-indigo-600 p-0.5 shadow-lg flex items-center justify-center animate-mascot-sway">
                <img 
                  src="logo.png" 
                  alt="Mascot Logo" 
                  className="w-full h-full object-contain p-1 rounded-2xl bg-white/95" 
                />
              </div>
              <div className="w-12 h-2 rounded-full bg-slate-400/30 mx-auto mt-1 animate-mascot-shadow"></div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg md:text-xl font-black text-slate-900 tracking-tight">
                  {greeting} {icon}, <span className="text-blue-600">{name}</span> <span className="animate-waving-hand inline-block text-xl sm:text-2xl ml-1">👋</span>
                </h3>
              </div>
              <p className="text-xs md:text-sm font-semibold text-slate-600 mt-0.5">{sub}</p>
              <div className="flex flex-wrap items-center gap-2 mt-2">
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-blue-100/80 text-blue-800 border border-blue-200">
                  🏫 {schoolName || 'PAUD SETIA BHAKTI'}
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-emerald-100/80 text-emerald-800 border border-emerald-200">
                  📅 Periode {academicYear || '2026/2027'}
                </span>
              </div>
            </div>
          </div>
        </div>
      );
    };

    const mapSettingsFromDb = (row) => {
      let localExt = {};
      try {
        localExt = JSON.parse(localStorage.getItem('spp_extended_settings') || '{}');
      } catch (e) {}

      const customClasses = row.custom_classes
        ? (typeof row.custom_classes === 'string' ? JSON.parse(row.custom_classes) : row.custom_classes)
        : (localExt.customClasses || []);

      let academicPeriods = [];
      if (row.academic_periods) {
        try {
          academicPeriods = typeof row.academic_periods === 'string' ? JSON.parse(row.academic_periods) : row.academic_periods;
        } catch (e) {}
      }
      if (!Array.isArray(academicPeriods) || academicPeriods.length === 0) {
        if (localExt.academicPeriods && localExt.academicPeriods.length > 0) {
          academicPeriods = localExt.academicPeriods;
        } else if (row.academic_year) {
          academicPeriods = [
            {
              id: '1',
              name: row.active_period_name || `Periode ${row.academic_year}`,
              startMonth: row.start_month || 'Juli',
              startYear: Number(row.start_year) || 2025,
              endMonth: row.end_month || 'Juni',
              endYear: Number(row.end_year) || 2026,
              semester: row.semester || 'Semua',
              isActive: true
            }
          ];
        }
      }

      let currentSchoolName = row.school_name || localExt.schoolName || 'PAUD SETIA BHAKTI';
      if (!currentSchoolName || currentSchoolName === 'PAUD TUNAS BANGSA') {
        currentSchoolName = 'PAUD SETIA BHAKTI';
      }

      return {
        id: row.id,
        schoolName: currentSchoolName,
        address: row.address || localExt.address || 'Bekasi, Jawa Barat',
        phone: row.phone || localExt.phone || '081234567890',
        academicYear: row.academic_year || localExt.academicYear || '2025/2026',
        activePeriodName: row.active_period_name || localExt.activePeriodName || `Periode ${row.academic_year || '2025/2026'}`,
        adminName: row.admin_name || localExt.adminName || 'Siti Rahma (Admin TU)',
        adminUsername: row.admin_username || localExt.adminUsername || 'admin',
        adminPassword: row.admin_password || localExt.adminPassword || 'admin123',
        dueDateDay: Number(row.due_date_day || localExt.dueDateDay || 10),
        midtransClientKey: row.midtrans_client_key || localExt.midtransClientKey || '',
        midtransServerKey: row.midtrans_server_key || localExt.midtransServerKey || '',
        tarifPlaygroup: Number(row.tarif_playgroup || localExt.tarifPlaygroup || 350000),
        tarifKelasA: Number(row.tarif_kelas_a || localExt.tarifKelasA || 400000),
        tarifKelasB: Number(row.tarif_kelas_b || localExt.tarifKelasB || 450000),
        startMonth: row.start_month || localExt.startMonth || 'Juli',
        startYear: Number(row.start_year || localExt.startYear || 2025),
        endMonth: row.end_month || localExt.endMonth || 'Juni',
        endYear: Number(row.end_year || localExt.endYear || 2026),
        semester: row.semester || localExt.semester || 'Semua',
        customClasses,
        academicPeriods: academicPeriods.map(p => ({
          ...p,
          semester: p.semester || 'Semua'
        }))
      };
    };

    // Supabase Client Setup
    let _supabaseClient = null;

    function getSupabaseClient() {
      if (_supabaseClient) return _supabaseClient;
      
      const url = window.ENV?.SUPABASE_URL || 'https://mgywbrmneeorynisujkf.supabase.co';
      const key = window.ENV?.SUPABASE_KEY || 'sb_publishable_BT_1lHhvJerwY0k4fWzIbg_51-VQ7V5';

      if (!url || !key) {
        console.warn("Supabase URL / Key tidak ditemukan!");
        return null;
      }

      const supaLib = window.supabase;
      if (supaLib && typeof supaLib.createClient === 'function') {
        try {
          _supabaseClient = supaLib.createClient(url, key);
          return _supabaseClient;
        } catch (err) {
          console.error("Gagal membuat Supabase client:", err);
          return null;
        }
      }
      return null;
    }

    const DEFAULT_SETTINGS = {
      startMonth: 'Juli',
      startYear: 2025,
      endMonth: 'Juni',
      endYear: 2026,
      semester: 'Semua',
      academicYear: '2025/2026',
      activePeriodName: 'Periode 2025/2026',
      academicPeriods: [],
      customClasses: [],
      schoolName: 'PAUD SETIA BHAKTI',
      address: 'Bekasi, Jawa Barat',
      phone: '081234567890',
      adminName: 'Siti Rahma (Admin TU)',
      adminUsername: 'admin',
      adminPassword: 'admin123',
      dueDateDay: 10,
      midtransClientKey: '',
      midtransServerKey: ''
    };

    // Helper: Validasi apakah aduan dihitung sebagai PENDING
    // Syarat pending: BELUM expired DAN pesan dari wali murid belum ada balasan sama sekali dari admin
    const isComplaintPending = (c, nowMs = Date.now()) => {
      if (!c) return false;
      const expiresAt = c.expiresAtMs || (c.createdAtMs ? c.createdAtMs + 3600000 : null);
      if (expiresAt && nowMs > expiresAt) return false; // Expired: tidak dihitung pending!

      const hasAdminReplied = Boolean(
        (c.adminReply && c.adminReply.trim().length > 0) ||
        (Array.isArray(c.messages) && c.messages.some(m => m.sender === 'Admin TU' || m.sender === 'Admin')) ||
        c.status === 'Sudah Ditangani'
      );
      return !hasAdminReplied;
    };

    const ALL_MONTHS = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

    // Helper: Generate daftar bulan secara dinamis berdasarkan periode awal (bulan + tahun) s/d akhir (bulan + tahun)
    const getMonthsList = (settingsOrStartMonth, academicYear = '', optEndMonth = '', optStartYear = null, optEndYear = null) => {
      let startMonth = 'Juli';
      let startYear = 2026;
      let endMonth = 'Juni';
      let endYear = 2027;

      if (typeof settingsOrStartMonth === 'object' && settingsOrStartMonth !== null) {
        startMonth = settingsOrStartMonth.startMonth || 'Juli';
        startYear = parseInt(settingsOrStartMonth.startYear) || 2026;
        endMonth = settingsOrStartMonth.endMonth || 'Juni';
        endYear = parseInt(settingsOrStartMonth.endYear) || (startYear + 1);
      } else if (typeof settingsOrStartMonth === 'string') {
        startMonth = settingsOrStartMonth || 'Juli';
        if (optStartYear) startYear = parseInt(optStartYear);
        if (optEndMonth) endMonth = optEndMonth;
        if (optEndYear) endYear = parseInt(optEndYear);
        else if (academicYear && academicYear.includes('/')) {
          const parts = academicYear.replace(/[^0-9/]/g, '').split('/');
          if (parts[0]) startYear = parseInt(parts[0]) || 2026;
          if (parts[1]) endYear = parseInt(parts[1]) || (startYear + 1);
        }
      }

      const startIndex = ALL_MONTHS.indexOf(startMonth);
      const endIndex = ALL_MONTHS.indexOf(endMonth);

      if (startIndex === -1 || endIndex === -1) {
        return ALL_MONTHS.map(m => `${m} ${startYear}`);
      }

      const res = [];
      let curMonth = startIndex;
      let curYear = startYear;
      let guard = 0;

      while (guard < 36) {
        res.push(`${ALL_MONTHS[curMonth]} ${curYear}`);
        if (curMonth === endIndex && curYear === endYear) {
          break;
        }
        curMonth++;
        if (curMonth > 11) {
          curMonth = 0;
          curYear++;
        }
        guard++;
      }
      return res.length > 0 ? res : ALL_MONTHS.map(m => `${m} ${startYear}`);
    };

    // Helper: Ambil daftar bulan yang sesuai dengan semester ('all', '1', '2' atau 'Semester 1' / 'Semester 2')
    const getSemesterMonths = (monthsList, semester = 'all') => {
      if (!Array.isArray(monthsList) || monthsList.length === 0) return [];
      const semStr = String(semester || 'all').toLowerCase();
      if (semStr === 'all' || semStr === 'semua' || semStr.includes('tahun') || semStr.includes('semua')) {
        return monthsList;
      }
      const half = Math.ceil(monthsList.length / 2);
      if (semStr === '1' || semStr.includes('1') || semStr.includes('ganjil')) {
        return monthsList.slice(0, half);
      }
      if (semStr === '2' || semStr.includes('2') || semStr.includes('genap')) {
        return monthsList.slice(half);
      }
      return monthsList;
    };

    // Helper: Cek apakah suatu bulan ajaran sudah berjalan / jatuh tempo s/d tanggal hari ini
    // ATURAN MUTLAK:
    // 1. Tahun di masa depan (misal 2027, 2028, 2029 dst saat hari ini 2026) -> BELUM JALAN SAMA SEKALI -> BUKAN TUNGGAKAN!
    // 2. Tahun lampau (misal 2025 ke bawah saat hari ini 2026) -> SUDAH JATUH TEMPO
    // 3. Tahun berjalan (mYear === curYear):
    //    - Bulan yang sudah lewat (< curMonth) -> SUDAH JATUH TEMPO
    //    - Bulan yang belum tiba (> curMonth) -> BELUM JALAN (Bukan Tunggakan)
    //    - Bulan berjalan (=== curMonth) -> Jatuh tempo jika tanggal hari ini sudah mencapai/melewati dueDateDay (default tgl 10)
    const isMonthDueOrElapsed = (monthStr, now = new Date(), optArg = 10) => {
      if (!monthStr) return false;
      const cleanStr = monthStr.trim();
      const parts = cleanStr.split(/\s+/);
      const mName = parts[0];
      const mYear = parts[1] ? parseInt(parts[1], 10) : now.getFullYear();
      const mIdx = ALL_MONTHS.indexOf(mName);
      
      if (mIdx === -1) return false;
      
      const curYear = now.getFullYear();
      const curMonth = now.getMonth(); // 0: Jan, ..., 9: Okt, ..., 11: Des
      const curDay = now.getDate();
      
      let dueDateDay = 10;
      if (typeof optArg === 'number' && optArg <= 31) {
        dueDateDay = optArg;
      } else if (typeof optArg === 'object' && optArg !== null && optArg.dueDateDay) {
        dueDateDay = parseInt(optArg.dueDateDay, 10) || 10;
      }
      
      // 1. Tahun di masa depan (belum berjalan sama sekali)
      if (mYear > curYear) {
        return false;
      }
      
      // 2. Tahun masa lalu (sudah lewat)
      if (mYear < curYear) {
        return true;
      }
      
      // 3. Tahun berjalan (mYear === curYear)
      if (mIdx < curMonth) {
        return true; // Bulan sebelumnya dalam tahun ini sudah lewat
      }
      if (mIdx > curMonth) {
        return false; // Bulan mendatang dalam tahun ini belum tiba
      }
      
      // Bulan sekarang (mIdx === curMonth): jatuh tempo jika tanggal hari ini sudah mencapai/melewati dueDateDay
      return curDay >= dueDateDay;
    };

    function Icon({ name, size = 18, className = "" }) {
      const spanRef = useRef(null);

      useEffect(() => {
        if (!spanRef.current) return;
        let isMounted = true;

        const renderIcon = () => {
          if (!isMounted || !spanRef.current) return;

          if (!window.lucide || !window.lucide.icons) {
            setTimeout(renderIcon, 50);
            return;
          }

          const pascalName = name
            ? name.split('-').map(part => part.charAt(0).toUpperCase() + part.slice(1)).join('')
            : '';

          const iconDef = window.lucide.icons[pascalName] || window.lucide.icons[name];

          if (iconDef && typeof window.lucide.createElement === 'function') {
            const svg = window.lucide.createElement(iconDef);
            svg.setAttribute('width', size);
            svg.setAttribute('height', size);
            if (className) {
              svg.setAttribute('class', className);
            }
            if (spanRef.current) {
              spanRef.current.innerHTML = '';
              spanRef.current.appendChild(svg);
            }
          }
        };

        renderIcon();

        return () => {
          isMounted = false;
        };
      }, [name, size, className]);

      return (
        <span 
          ref={spanRef} 
          className={`inline-flex items-center justify-center shrink-0 ${className}`} 
          style={{ width: size, height: size, verticalAlign: 'middle' }}
        />
      );
    }

    // Modal Image Preview Lightbox
    function ImagePreviewModal({ imageUrl, title, onClose }) {
      if (!imageUrl) return null;
      return (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-in fade-in zoom-in-95 duration-200">
          <div className="relative max-w-4xl w-full bg-white rounded-3xl overflow-hidden shadow-2xl border border-white/20 flex flex-col">
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <span className="font-extrabold text-sm truncate">{title || 'Preview Foto Pengumuman'}</span>
              <button
                onClick={onClose}
                className="p-2 hover:bg-slate-800 rounded-xl text-slate-300 hover:text-white transition-colors"
              >
                <Icon name="x" size={20} />
              </button>
            </div>
            <div className="p-4 bg-slate-950 flex items-center justify-center max-h-[80vh] overflow-auto">
              <img src={imageUrl} alt={title || 'Preview'} className="max-h-[75vh] w-auto max-w-full object-contain rounded-xl shadow-lg border border-slate-800" />
            </div>
            <div className="p-3 bg-slate-900 text-center text-xs text-slate-400">
              Klik di luar atau tombol (X) di pojok kanan atas untuk menutup preview.
            </div>
          </div>
        </div>
      );
    }

    function SchoolWatermarkBg() {
      return (
        <div className="luxury-watermark-bg" aria-hidden="true">
          {/* Subtle Ambient Radial Glows */}
          <div className="absolute -top-32 -left-32 w-96 h-96 bg-blue-600/[0.04] rounded-full blur-3xl pointer-events-none"></div>
          <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-sky-500/[0.04] rounded-full blur-3xl pointer-events-none"></div>
          <div className="absolute top-1/2 left-1/3 w-80 h-80 bg-indigo-500/[0.03] rounded-full blur-3xl pointer-events-none"></div>

          {/* Official PAUD SETIA BHAKTI Logo as Faint Luxury Watermark */}
          <div className="luxury-school-watermark flex items-center justify-center">
            <img 
              src="/logo.png" 
              alt="Watermark PAUD Setia Bhakti" 
              className="w-full h-full object-contain filter contrast-125 select-none pointer-events-none drop-shadow-sm" 
            />
          </div>
        </div>
      );
    }

    function LoadingBarScreen({ userRole, userName, onComplete }) {
      const [progress, setProgress] = useState(0);
      const isAdmin = userRole === 'admin';

      useEffect(() => {
        const interval = setInterval(() => {
          setProgress(prev => {
            if (prev >= 100) {
              clearInterval(interval);
              return 100;
            }
            // Dynamic acceleration curve
            const increment = prev < 50 
              ? Math.floor(Math.random() * 12) + 8 
              : prev < 85 
                ? Math.floor(Math.random() * 10) + 6 
                : Math.floor(Math.random() * 8) + 4;
            return Math.min(100, prev + increment);
          });
        }, 95);

        const timer = setTimeout(() => {
          setProgress(100);
          setTimeout(() => {
            onComplete();
          }, 450);
        }, 1650);

        return () => {
          clearInterval(interval);
          clearTimeout(timer);
        };
      }, [onComplete]);

      let stepText = isAdmin ? "Mengautentikasi hak akses administrator..." : "Menghubungkan ke server portal sekolah...";
      if (progress > 30 && progress <= 70) {
        stepText = isAdmin ? "Menyinkronkan data SPP, tagihan & catatan siswa..." : "Memuat histori pembayaran SPP & pengumuman...";
      } else if (progress > 70 && progress < 96) {
        stepText = isAdmin ? "Menyiapkan ruang kerja manajemen TU..." : "Mengonfigurasi dashboard wali murid...";
      } else if (progress >= 96) {
        stepText = "Sesi terverifikasi! Selamat datang.";
      }

      return (
        <div className="fixed inset-0 bg-white z-[99999] flex flex-col items-center justify-center p-4 sm:p-6 text-slate-800 overflow-hidden select-none loading-screen-pure-white">
          {/* Faint School Watermark in the background */}
          <div className="luxury-watermark-bg" aria-hidden="true">
            <div className="luxury-school-watermark opacity-[0.035] flex items-center justify-center">
              <img src="/logo.png" alt="watermark" className="w-full h-full object-contain filter contrast-125 select-none pointer-events-none" />
            </div>
          </div>

          {/* Ambient Glowing Aura Mesh (Soft subtle royal blue & cyan on pure white) */}
          <div className="absolute top-1/4 left-1/4 w-[420px] h-[420px] bg-blue-400/8 rounded-full blur-[110px] pointer-events-none -translate-x-1/2 -translate-y-1/2 animate-pulse-halo"></div>
          <div className="absolute bottom-1/4 right-1/4 w-[420px] h-[420px] bg-sky-300/10 rounded-full blur-[120px] pointer-events-none translate-x-1/3 translate-y-1/3"></div>

          {/* Central Luxury Container (Pristine Pure White Card) */}
          <div className="relative w-full max-w-lg p-7 sm:p-9 rounded-[38px] bg-white border border-slate-200/90 shadow-[0_25px_70px_-15px_rgba(30,58,138,0.12),0_0_0_1px_rgba(241,245,249,1)] space-y-7 animate-in fade-in zoom-in-95 duration-300">
            {/* Floating Luxury School Emblem with Orbiting Rings and Jewel Beads */}
            <div className="relative mx-auto w-36 h-36 flex items-center justify-center">
              {/* Outer Glowing Pulsing Halo */}
              <div className="absolute inset-0 bg-gradient-to-tr from-blue-600 via-sky-400 to-indigo-600 rounded-full blur-2xl opacity-40 animate-pulse-halo"></div>
              
              {/* Dual Counter-Rotating Orbit Rings with Glowing Jewels */}
              <div className="absolute -inset-4 rounded-full border-2 border-dashed border-blue-400/70 loading-orbit-ring pointer-events-none">
                <span className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-amber-400 shadow-[0_0_10px_#f59e0b] border-2 border-white"></span>
                <span className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 w-2.5 h-2.5 rounded-full bg-sky-400 shadow-[0_0_8px_#38bdf8] border border-white"></span>
              </div>
              <div className="absolute -inset-7 rounded-full border border-dotted border-sky-400/80 loading-orbit-counter pointer-events-none">
                <span className="absolute left-0 top-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-blue-600 shadow-[0_0_10px_#2563eb] border-2 border-white"></span>
                <span className="absolute right-0 top-1/2 translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_8px_#22d3ee]"></span>
              </div>

              {/* Central Official PAUD SETIA BHAKTI Logo Badge with 3D Ring */}
              <div className="relative w-28 h-28 rounded-full p-2 bg-gradient-to-tr from-amber-400 via-sky-400 to-blue-600 shadow-[0_15px_35px_rgba(37,99,235,0.32)] overflow-hidden flex items-center justify-center border-4 border-white bg-white group hover:scale-105 transition-transform animate-pulse-glow">
                <img 
                  src="/logo.png" 
                  alt="Logo PAUD Setia Bhakti" 
                  className="w-full h-full object-contain rounded-full" 
                />
              </div>
            </div>

            {/* Header Titles */}
            <div className="text-center space-y-2">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-50 border border-blue-200 text-blue-700 shadow-2xs">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-600 shadow-[0_0_8px_#2563eb] animate-pulse"></span>
                <span className="text-[11px] font-black tracking-widest uppercase">
                  {isAdmin ? 'ADMINISTRATOR TU WORKSPACE' : 'PORTAL RESMI WALI MURID'}
                </span>
              </div>
              <h3 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900">
                {isAdmin ? 'Memuat Sistem Keuangan SPP...' : 'Menyiapkan Portal Ananda...'}
              </h3>
              <p className="text-xs font-black text-blue-800 tracking-wide uppercase">
                PAUD SETIA BHAKTI • BEKASI
              </p>
              <p className="text-xs font-semibold text-slate-500 italic max-w-xs mx-auto truncate">
                "Mewujudkan Generasi Cerdas & Berakhlak Mulia"
              </p>
            </div>

            {/* 3 Interactive Stage Steps */}
            <div className="grid grid-cols-3 gap-2.5 pt-1 text-left">
              {[
                { step: 1, label: 'Otorisasi Akun', target: 30 },
                { step: 2, label: 'Sinkronisasi SPP', target: 70 },
                { step: 3, label: 'Membuka Portal', target: 95 }
              ].map((s) => {
                const isPassed = progress >= s.target;
                const isCurrent = progress < s.target && (s.step === 1 || progress >= (s.target - 35));
                return (
                  <div
                    key={s.step}
                    className={`p-2.5 rounded-2xl border transition-all ${
                      isPassed
                        ? 'bg-emerald-50 border-emerald-300 text-emerald-800 shadow-2xs'
                        : isCurrent
                          ? 'bg-blue-50 border-blue-400 text-blue-900 shadow-sm ring-2 ring-blue-500/20 animate-pulse'
                          : 'bg-slate-50 border-slate-200 text-slate-400'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 mb-1">
                      {isPassed ? (
                        <div className="w-4 h-4 rounded-full bg-emerald-600 text-white flex items-center justify-center font-black text-[10px] shadow-sm">
                          ✓
                        </div>
                      ) : (
                        <span className={`w-2.5 h-2.5 rounded-full ${isCurrent ? 'bg-blue-600 animate-ping' : 'bg-slate-300'}`}></span>
                      )}
                      <span className="text-[10px] font-black uppercase tracking-wider">Tahap {s.step}</span>
                    </div>
                    <p className="text-[11.5px] font-extrabold leading-tight truncate">{s.label}</p>
                  </div>
                );
              })}
            </div>

            {/* Animated Royal Progress Bar */}
            <div className="space-y-2.5 pt-1">
              <div className="flex justify-between items-center text-xs font-bold px-1">
                <span className="text-xs text-blue-700 font-bold truncate max-w-[320px]">
                  {stepText}
                </span>
                <span className="text-base font-black text-blue-700 font-mono tracking-wider">
                  {progress}%
                </span>
              </div>

              <div className="w-full bg-blue-50/80 rounded-full h-4 p-0.5 border border-blue-200 shadow-inner relative overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-blue-600 via-sky-500 to-indigo-600 transition-all duration-200 ease-out relative shadow-[0_2px_10px_rgba(37,99,235,0.4)] overflow-hidden"
                  style={{ width: `${progress}%` }}
                >
                  {/* Laser Scanning Sweep Effect */}
                  <div className="animate-laser-sweep"></div>
                  
                  {/* Glowing Leading Head Pointer */}
                  <div className="absolute right-0 top-0 bottom-0 w-3 bg-white rounded-full shadow-[0_0_8px_#ffffff]"></div>
                </div>
              </div>
            </div>

            {/* Footer Institutional Tagline */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 font-semibold tracking-wide">
              <span className="truncate font-bold text-slate-700">PAUD Setia Bhakti • Bekasi</span>
              <span className="flex items-center gap-1.5 text-emerald-700 font-extrabold text-[11px] bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                <Icon name="shield-check" size={13} className="text-emerald-600" />
                <span>Koneksi Aman Terverifikasi</span>
              </span>
            </div>
          </div>
        </div>
      );
    }

    function ToastNotification({ toast, onClose }) {
      if (!toast) return null;

      const isError = toast.type === 'error' || toast.type === 'delete';
      const isInfo = toast.type === 'info';

      let iconName = "check-circle";
      let iconColor = "text-emerald-600";
      let badgeBg = "bg-emerald-50 text-emerald-700 border-emerald-200";
      let borderAccent = "border-l-emerald-500";

      if (isError) {
        iconName = "alert-circle";
        iconColor = "text-rose-600";
        badgeBg = "bg-rose-50 text-rose-700 border-rose-200";
        borderAccent = "border-l-rose-500";
      } else if (isInfo) {
        iconName = "info";
        iconColor = "text-blue-600";
        badgeBg = "bg-blue-50 text-blue-700 border-blue-200";
        borderAccent = "border-l-blue-500";
      }

      return (
        <div className="fixed top-5 right-5 z-[9999] max-w-md w-full animate-slide-in-right">
          <div className={`p-4 rounded-2xl bg-white border border-slate-200 ${borderAccent} border-l-4 shadow-xl flex items-start gap-3.5 relative overflow-hidden`}>
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${badgeBg} border`}>
              <Icon name={iconName} size={20} className={iconColor} />
            </div>
            <div className="flex-1 pr-6">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 mb-0.5">
                {toast.title || 'Informasi Sistem'}
              </h4>
              <p className="text-xs text-slate-600 font-semibold leading-relaxed">
                {toast.message}
              </p>
            </div>
            <button
              onClick={onClose}
              className="absolute top-3 right-3 p-1 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors"
            >
              <Icon name="x" size={16} />
            </button>
            <div className="absolute bottom-0 left-0 h-1 bg-gradient-to-r from-blue-500 via-sky-400 to-indigo-500 animate-pulse w-full"></div>
          </div>
        </div>
      );
    }

    // ==========================================
    // 1. KOMPONEN LOGIN SPLIT CARD DUAL ROLE
    // ==========================================
    
    function LoginView({ onLogin, settings, students }) {
      const [role, setRole] = useState(() => {
        try {
          const urlParams = new URLSearchParams(window.location.search);
          const r = urlParams.get('role') || (window.location.hash.includes('admin') ? 'admin' : (window.location.hash.includes('wali') || window.location.hash.includes('parent') ? 'parent' : null));
          if (r) return r;
          const savedIntended = sessionStorage.getItem('spp_intended_role');
          if (savedIntended) return savedIntended;
        } catch (e) {}
        return 'parent';
      }); // 'parent' or 'admin'
      const [username, setUsername] = useState('');
      const [password, setPassword] = useState('');
      const [showPassword, setShowPassword] = useState(false);
      const [rememberMe, setRememberMe] = useState(true);
      const [errorMsg, setErrorMsg] = useState('');

      const handleLoginSubmit = (e) => {
        e.preventDefault();
        setErrorMsg('');
        if (role === 'admin') {
          if (
            username.trim() === (settings.adminUsername || 'admin') &&
            password.trim() === (settings.adminPassword || 'admin123')
          ) {
            onLogin({ role: 'admin', name: settings.adminName || 'Admin TU' });
          } else {
            setErrorMsg('Username atau Password Admin tidak cocok. Silakan coba lagi.');
          }
        } else {
          const student = students.find(s => 
            s.nis.toString().trim() === username.trim() && 
            (s.password.toString().trim() === password.trim() || s.nis.toString().trim() === password.trim())
          );
          if (student) {
            onLogin({ role: 'parent', student: student });
          } else {
            setErrorMsg('NIS atau Password Wali Siswa tidak ditemukan dalam sistem.');
          }
        }
      };

      const getTimeGreeting = () => {
        const hour = new Date().getHours();
        if (hour >= 3 && hour < 11) return { text: 'Selamat Pagi', emoji: '🌅', color: 'from-amber-400 to-orange-500' };
        if (hour >= 11 && hour < 15) return { text: 'Selamat Siang', emoji: '☀️', color: 'from-amber-400 to-yellow-500' };
        if (hour >= 15 && hour < 18) return { text: 'Selamat Sore', emoji: '🌤️', color: 'from-orange-400 to-rose-500' };
        return { text: 'Selamat Malam', emoji: '🌙', color: 'from-indigo-400 to-sky-400' };
      };
      const greeting = getTimeGreeting();

      const waPhone = settings.phone ? settings.phone.replace(/[^0-9]/g, '') : '6281234567890';
      const waLink = `https://wa.me/${waPhone}?text=${encodeURIComponent('Halo Admin ' + (settings.schoolName || 'PAUD SETIA BHAKTI') + ', saya wali murid ingin meminta bantuan login/reset password.')}`;

      return (
        <div className="min-h-screen bg-[#edf3fc] flex items-center justify-center p-4 sm:p-6 md:p-10 relative overflow-hidden bg-aesthetic-pattern">
          {/* Subtle Watermark in Login */}
          <div className="luxury-watermark-bg" aria-hidden="true">
            <div className="luxury-school-watermark flex items-center justify-center">
              <img src="/logo.png" alt="Watermark" className="w-full h-full object-contain filter contrast-125 select-none pointer-events-none" />
            </div>
          </div>

          {/* Ambient decorative soft blurs */}
          <div className="absolute top-10 left-10 w-96 h-96 bg-blue-400/10 rounded-full blur-3xl pointer-events-none"></div>
          <div className="absolute bottom-10 right-10 w-96 h-96 bg-sky-400/10 rounded-full blur-3xl pointer-events-none"></div>

          {/* Main Card: Split Screen Responsive */}
          <div className="w-full max-w-4xl bg-white rounded-[32px] shadow-[0_20px_60px_-15px_rgba(29,78,216,0.18)] border border-blue-100/70 overflow-hidden relative z-10 flex flex-col md:flex-row">
            
            {/* Left Hero Panel (Royal Blue with Cloud Wave Divider) */}
            <div className="relative md:w-5/12 bg-gradient-to-br from-blue-700 via-blue-600 to-indigo-800 text-white p-8 sm:p-10 flex flex-col justify-between overflow-hidden">
              
              {/* Subtle background circles for depth */}
              <div className="absolute -top-16 -left-16 w-56 h-56 rounded-full bg-white/10 blur-xl pointer-events-none"></div>
              <div className="absolute bottom-8 left-8 w-40 h-40 rounded-full bg-sky-400/20 blur-2xl pointer-events-none"></div>

              {/* Layered Organic Cloud Wave Divider (Right edge on desktop) */}
              <div className="hidden md:block absolute top-0 bottom-0 -right-1 w-24 overflow-hidden pointer-events-none z-10">
                <svg className="h-full w-full" preserveAspectRatio="none" viewBox="0 0 120 500" fill="none">
                  {/* Layer 1: translucent sky blue curve */}
                  <path d="M120,0 L60,0 C20,30 20,80 60,110 C20,140 20,190 60,220 C20,250 20,300 60,330 C20,360 20,410 60,440 C30,470 30,490 60,500 L120,500 Z" fill="rgba(255, 255, 255, 0.22)" />
                  {/* Layer 2: slightly lighter curve */}
                  <path d="M120,0 L78,0 C45,35 45,85 78,115 C45,145 45,195 78,225 C45,255 45,305 78,335 C45,365 45,415 78,445 C55,475 55,490 78,500 L120,500 Z" fill="rgba(255, 255, 255, 0.45)" />
                  {/* Layer 3: solid crisp white cloud edge merging into right white card */}
                  <path d="M120,0 L96,0 C70,40 70,90 96,120 C70,150 70,200 96,230 C70,260 70,310 96,340 C70,370 70,420 96,450 C80,475 80,490 96,500 L120,500 Z" fill="#ffffff" />
                </svg>
              </div>

              {/* Layered Cloud Wave for Mobile (Bottom edge of top banner) */}
              <div className="block md:hidden absolute -bottom-1 left-0 right-0 h-12 overflow-hidden pointer-events-none z-10">
                <svg className="w-full h-full" preserveAspectRatio="none" viewBox="0 0 500 80" fill="none">
                  <path d="M0,80 L0,30 C30,5 80,5 110,30 C140,5 190,5 220,30 C250,5 300,5 330,30 C360,5 410,5 440,30 C470,15 490,15 500,30 L500,80 Z" fill="rgba(255, 255, 255, 0.25)" />
                  <path d="M0,80 L0,42 C35,20 85,20 115,42 C145,20 195,20 225,42 C255,20 305,20 335,42 C365,20 415,20 445,42 C475,25 490,25 500,42 L500,80 Z" fill="rgba(255, 255, 255, 0.45)" />
                  <path d="M0,80 L0,55 C40,35 90,35 120,55 C150,35 200,35 230,55 C260,35 310,35 340,55 C370,35 420,35 450,55 C475,40 490,40 500,55 L500,80 Z" fill="#ffffff" />
                </svg>
              </div>

              {/* Brand Top / Center */}
              <div className="relative z-10 flex flex-col items-center md:items-start text-center md:text-left my-auto pt-4 pb-8 md:py-6 md:pr-8">
                
                {/* Waving Mascot & School Badge */}
                <div className="relative mb-4 group">
                  <div className="w-24 h-24 bg-white rounded-full p-1.5 shadow-2xl shadow-blue-950/40 border-4 border-white/80 overflow-hidden flex items-center justify-center transition-transform duration-300 group-hover:scale-105 animate-mascot-sway">
                    <img src="/logo.png" alt="Logo PAUD Setia Bhakti" className="w-full h-full object-contain" />
                  </div>
                  {/* Waving Hand Badge floating on top right of logo */}
                  <div className="absolute -top-1 -right-2 bg-white text-slate-800 p-1.5 rounded-full shadow-lg border-2 border-blue-100 flex items-center justify-center animate-bounce">
                    <span className="animate-waving-hand text-lg leading-none inline-block">👋</span>
                  </div>
                </div>

                {/* Dynamic Time Greeting Badge */}
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/15 backdrop-blur-md text-xs font-bold text-white mb-3 shadow-sm border border-white/20">
                  <span className="animate-waving-hand text-sm inline-block">👋</span>
                  <span>{greeting.emoji} {greeting.text}!</span>
                </div>
                
                <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight leading-tight mb-2">
                  {settings.schoolName || 'PAUD SETIA BHAKTI'}
                </h1>

                <p className="text-xs text-blue-100/90 font-medium leading-relaxed max-w-xs mb-6">
                  Sistem Informasi Pembayaran SPP & Administrasi Siswa Terpadu. Mewujudkan Generasi Cerdas & Berakhlak Mulia.
                </p>

                {/* Quick Info Tags */}
                <div className="hidden md:flex flex-col gap-2.5 w-full pt-4 border-t border-white/15 text-[11px] text-blue-100 font-semibold">
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded-full bg-sky-400/20 flex items-center justify-center text-sky-300 shrink-0">
                      <Icon name="check" size={12} />
                    </div>
                    <span>Konfirmasi Pembayaran Instan</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded-full bg-sky-400/20 flex items-center justify-center text-sky-300 shrink-0">
                      <Icon name="check" size={12} />
                    </div>
                    <span>Layanan Pengaduan & Catatan Siswa</span>
                  </div>
                </div>
              </div>

              {/* Footer info matching reference */}
              <div className="relative z-10 pt-4 border-t border-white/10 hidden md:flex items-center justify-between text-[10px] font-bold tracking-wider text-blue-200 uppercase">
                <span>PORTAL RESMI SPP</span>
                <span>VERSI 2.4</span>
              </div>
            </div>

            {/* Right Form Panel */}
            <div className="md:w-7/12 bg-white p-8 sm:p-12 flex flex-col justify-between relative z-10">
              <div>
                {/* Header Title */}
                <div className="mb-6">
                  <h2 className="text-2xl font-black text-slate-800 tracking-tight">
                    Masuk ke Akun
                  </h2>
                  <p className="text-xs text-slate-500 font-medium mt-1">
                    Silakan pilih peran dan masukkan data akun Anda untuk melanjutkan.
                  </p>
                </div>

                {/* Role Switcher Pill Tabs with Smooth Visual Indicator */}
                <div className="p-1 bg-slate-100 rounded-2xl flex items-center mb-6 border border-slate-200/80 shadow-inner">
                  <button
                    type="button"
                    onClick={() => { 
                      if (role !== 'parent') {
                        setRole('parent'); 
                        setErrorMsg(''); 
                        setUsername(''); 
                        setPassword(''); 
                        try { sessionStorage.setItem('spp_intended_role', 'parent'); } catch(e){} 
                      }
                    }}
                    className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all duration-300 flex items-center justify-center gap-2 ${
                      role === 'parent'
                        ? 'bg-blue-600 text-white shadow-md shadow-blue-500/30 scale-[1.02]'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
                    }`}
                  >
                    <Icon name="users" size={15} />
                    <span>Wali Murid</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => { 
                      if (role !== 'admin') {
                        setRole('admin'); 
                        setErrorMsg(''); 
                        setUsername(''); 
                        setPassword(''); 
                        try { sessionStorage.setItem('spp_intended_role', 'admin'); } catch(e){} 
                      }
                    }}
                    className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all duration-300 flex items-center justify-center gap-2 ${
                      role === 'admin'
                        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/30 scale-[1.02]'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
                    }`}
                  >
                    <Icon name="shield-check" size={15} />
                    <span>Admin TU</span>
                  </button>
                </div>

                {/* Error Banner */}
                {errorMsg && (
                  <div className="mb-5 p-3.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold rounded-2xl flex items-center gap-3 animate-in fade-in duration-200">
                    <Icon name="alert-circle" size={18} className="text-rose-600 shrink-0" />
                    <span>{errorMsg}</span>
                  </div>
                )}

                {/* Animated Dynamic Form Section (Key-based transition effect on Role Switch) */}
                <div key={role} className="animate-luxury-view space-y-4">
                  {/* Dynamic Interactive Role Welcome Banner */}
                  {role === 'parent' ? (
                    <div className="greeting-welcome-banner p-4 rounded-2xl flex items-center gap-3.5 mb-5 border border-blue-100 shadow-sm relative overflow-hidden">
                      <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-blue-600 to-sky-500 text-white flex items-center justify-center font-black text-xl shadow-md shrink-0 animate-mascot-sway">
                        <span className="animate-waving-hand inline-block">👋</span>
                      </div>
                      <div>
                        <h3 className="text-xs font-extrabold text-slate-800 flex items-center gap-1.5">
                          <span>Halo Wali Murid!</span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-bold">Wali Siswa</span>
                        </h3>
                        <p className="text-[11px] text-slate-600 font-medium mt-0.5 leading-snug">
                          Masukkan NIS & Password Ananda untuk melihat tagihan & kuitansi SPP.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="greeting-welcome-banner p-4 rounded-2xl flex items-center gap-3.5 mb-5 border border-indigo-100 shadow-sm relative overflow-hidden bg-gradient-to-r from-slate-900/5 to-indigo-900/5">
                      <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-indigo-700 to-purple-600 text-white flex items-center justify-center font-black text-xl shadow-md shrink-0 animate-mascot-sway">
                        <span className="animate-waving-hand inline-block">👋</span>
                      </div>
                      <div>
                        <h3 className="text-xs font-extrabold text-slate-800 flex items-center gap-1.5">
                          <span>Halo Administrator TU!</span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 font-bold">Admin TU</span>
                        </h3>
                        <p className="text-[11px] text-slate-600 font-medium mt-0.5 leading-snug">
                          Portal Khusus Pengelolaan SPP, Data Siswa & Administrasi Sekolah.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Login Form */}
                  <form onSubmit={handleLoginSubmit} className="space-y-4">
                    {/* Field 1: Username / NIS */}
                    <div className="space-y-1">
                      <label htmlFor="login-username" className="block text-xs font-bold text-slate-700 uppercase tracking-wide">
                        {role === 'admin' ? 'Username Admin' : 'NIS (Nomor Induk Siswa)'}
                      </label>
                      <div className="relative flex items-center">
                        <input
                          id="login-username"
                          name="username"
                          autoComplete="username"
                          type="text"
                          required
                          value={username}
                          onChange={(e) => setUsername(e.target.value)}
                          placeholder={role === 'admin' ? 'Masukkan username admin' : 'Contoh: 1001'}
                          className="w-full py-3 px-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 focus:outline-none focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 transition-all placeholder:text-slate-400"
                        />
                        {username.trim().length > 0 && (
                          <div className="absolute right-3.5 text-blue-600">
                            <Icon name="check" size={18} />
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Field 2: Password */}
                    <div className="space-y-1">
                      <label htmlFor="login-password" className="block text-xs font-bold text-slate-700 uppercase tracking-wide">
                        Password
                      </label>
                      <div className="relative flex items-center">
                        <input
                          id="login-password"
                          name="password"
                          autoComplete="current-password"
                          type={showPassword ? "text" : "password"}
                          required
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder={role === 'admin' ? 'Masukkan password admin' : 'Masukkan password atau NIS'}
                          className="w-full py-3 px-3.5 pr-11 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 focus:outline-none focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 transition-all placeholder:text-slate-400"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3.5 text-slate-400 hover:text-blue-600 transition-colors"
                          title={showPassword ? "Sembunyikan password" : "Lihat password"}
                        >
                          <Icon name={showPassword ? "eye-off" : "eye"} size={18} />
                        </button>
                      </div>
                    </div>

                    {/* Options row */}
                    <div className="flex items-center justify-between pt-1 text-xs">
                      <label htmlFor="login-remember" className="flex items-center gap-2 cursor-pointer text-slate-600 select-none font-medium">
                        <input
                          id="login-remember"
                          name="rememberMe"
                          type="checkbox"
                          checked={rememberMe}
                          onChange={(e) => setRememberMe(e.target.checked)}
                          className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span>Ingat saya</span>
                      </label>

                      {role === 'parent' ? (
                        <a
                          href={waLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800 font-bold hover:underline flex items-center gap-1"
                        >
                          <span>Lupa Password?</span>
                        </a>
                      ) : (
                        <span className="text-slate-400 text-[11px] font-semibold">Administrator TU</span>
                      )}
                    </div>

                    {/* Pill Action Buttons */}
                    <div className="pt-4 flex flex-col sm:flex-row items-center gap-3">
                      <button
                        type="submit"
                        className={`w-full sm:flex-1 py-3.5 px-6 rounded-full text-white font-extrabold text-sm shadow-lg active:scale-[0.98] transition-all flex items-center justify-center gap-2 ${
                          role === 'parent'
                            ? 'bg-blue-600 hover:bg-blue-700 shadow-blue-500/30 hover:shadow-blue-500/40'
                            : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-500/30 hover:shadow-indigo-500/40'
                        }`}
                      >
                        <span>Masuk Sekarang</span>
                        <Icon name="arrow-right" size={16} />
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          const nextRole = role === 'parent' ? 'admin' : 'parent';
                          setRole(nextRole);
                          try { sessionStorage.setItem('spp_intended_role', nextRole); } catch(e){}
                          setErrorMsg('');
                          setUsername('');
                          setPassword('');
                        }}
                        className="w-full sm:w-auto py-3.5 px-6 rounded-full border border-slate-300 hover:border-blue-400 text-slate-600 hover:text-blue-600 font-bold text-xs active:scale-[0.98] transition-all bg-white hover:bg-blue-50/50 flex items-center justify-center gap-1.5"
                      >
                        <span>{role === 'parent' ? 'Akses Admin' : 'Akses Wali'}</span>
                        <Icon name="arrow-right-left" size={14} className="text-slate-400" />
                      </button>
                    </div>
                  </form>
                </div>
              </div>

            </div>
          </div>
        </div>
      );
    }

function ParentDashboardView({ 
      student, 
      transactions, 
      announcements, 
      complaints,
      notes,
      settings, 
      onLogout, 
      onShowKuitansi, 
      onPayMidtrans,
      onAddComplaint,
      onAddCommentNote,
      onReplyComplaint,
      onUpdateParentSettings,
      onRefresh,
      isRefreshing
    }) {
      if (!student) {
        return (
          <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
            <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-xl text-center space-y-4 max-w-sm">
              <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center mx-auto animate-spin">
                <Icon name="refresh-cw" size={24} />
              </div>
              <p className="font-extrabold text-slate-800 text-base">Memuat Data Wali Murid...</p>
            </div>
          </div>
        );
      }

      const [activeTab, setActiveTab] = useState('spp');
      const [sppSubFilter, setSppSubFilter] = useState('all');
      const [complaintTitle, setComplaintTitle] = useState('');
      const [complaintContent, setComplaintContent] = useState('');
      const [commentText, setCommentText] = useState({});
      const [showParentBell, setShowParentBell] = useState(false);
      const [readAnnouncements, setReadAnnouncements] = useState(() => {
        try { return JSON.parse(localStorage.getItem('read_announcements_' + (student ? student.id : 'guest'))) || []; } catch(e) { return []; }
      });
      const [readNotes, setReadNotes] = useState(() => {
        try { return JSON.parse(localStorage.getItem('read_notes_' + (student ? student.id : 'guest'))) || []; } catch(e) { return []; }
      });
      const [readComplaintMsgs, setReadComplaintMsgs] = useState(() => {
        try { return JSON.parse(localStorage.getItem('read_complaint_msgs_' + (student ? student.id : 'guest'))) || {}; } catch(e) { return {}; }
      });
      const [previewImage, setPreviewImage] = useState(null);
      const [selectedAnnouncement, setSelectedAnnouncement] = useState(null);
      const [replyText, setReplyText] = useState({});
      const [nowMs, setNowMs] = useState(Date.now());
      const [expandedNotes, setExpandedNotes] = useState({});
      const toggleNote = (id) => setExpandedNotes(prev => ({ ...prev, [id]: !prev[id] }));
      
      // Settings State
      const [newPassword, setNewPassword] = useState('');
      const [newPhone, setNewPhone] = useState(student.telepon || '');

      useEffect(() => {
        const timer = setInterval(() => setNowMs(Date.now()), 5000);
        return () => clearInterval(timer);
      }, []);

      const studentTrx = useMemo(() => {
        return transactions.filter(t => 
          (t.studentId && t.studentId === student.id) || 
          (t.studentName && t.studentName.toLowerCase().trim() === student.name.toLowerCase().trim())
        );
      }, [transactions, student]);

      const myComplaints = useMemo(() => {
        return complaints.filter(c => c.studentId === student.id || c.studentName === student.name);
      }, [complaints, student]);

      const activeComplaint = useMemo(() => {
        return myComplaints.find(c => nowMs <= (c.expiresAtMs || (c.createdAtMs + 3600000)));
      }, [myComplaints, nowMs]);
      
      const expiredComplaints = useMemo(() => {
        return myComplaints.filter(c => nowMs > (c.expiresAtMs || (c.createdAtMs + 3600000))).sort((a,b) => b.createdAtMs - a.createdAtMs);
      }, [myComplaints, nowMs]);

      const myNotes = useMemo(() => {
        return notes.filter(n => n.studentId === student.id || n.studentName === student.name).sort((a,b) => new Date(b.created_at || Date.now()) - new Date(a.created_at || Date.now()));
      }, [notes, student]);

      const monthlyBills = useMemo(() => {
        const periodStartYear = parseInt(settings?.startYear) || 2026;
        const bills = getMonthsList(settings).map((monthName) => {
          const paidTrx = studentTrx.find(t => 
            t.status === 'Lunas' && (
              t.month === monthName || 
              t.month.toLowerCase().trim() === monthName.toLowerCase().trim() ||
              monthName.startsWith(t.month)
            )
          );
          const isDue = isMonthDueOrElapsed(monthName, new Date(), settings?.dueDateDay || 10);
          return {
            id: monthName,
            month: monthName,
            amount: student.tarif || 350000,
            status: paidTrx ? 'Lunas' : 'Belum Bayar',
            date: paidTrx ? paidTrx.date : '-',
            kuitansiNo: paidTrx ? paidTrx.kuitansiNo : '-',
            method: paidTrx ? paidTrx.method : '-',
            paidTrx: paidTrx,
            isDue: isDue
          };
        });
        
        return bills;
      }, [studentTrx, student, settings]);
      
      // Tunggakan HANYA bulan yang sudah berjalan s/d saat ini dan belum dibayar
      const unpaidBills = monthlyBills.filter(b => b.status !== 'Lunas' && b.isDue);
      // Bulan mendatang dalam periode ajaran (belum jatuh tempo)
      const upcomingBills = monthlyBills.filter(b => b.status !== 'Lunas' && !b.isDue);
      const paidBills = monthlyBills.filter(b => b.status === 'Lunas');
      const totalDueDebt = unpaidBills.reduce((acc, b) => acc + (b.amount || 0), 0);

      // Seluruh transaksi lunas (mencakup kelas saat ini & kelas sebelumnya)
      const allPaidTransactions = useMemo(() => {
        return studentTrx
          .filter(t => t.status === 'Lunas' || t.status === 'lunas' || t.status === 'Berhasil' || t.status === 'Sukses')
          .sort((a, b) => (b.id || 0) - (a.id || 0));
      }, [studentTrx]);

      // State filter kelas untuk riwayat pembayaran
      const [historyClassFilter, setHistoryClassFilter] = useState('all');

      // Daftar kelas yang pernah diikuti siswa (kelas saat ini + kelas dari transaksi masa lalu + classHistory)
      const studentClassHistoryList = useMemo(() => {
        const clsSet = new Set();
        if (student?.kelas) clsSet.add(student.kelas);
        (allPaidTransactions || []).forEach(t => { if (t.kelas) clsSet.add(t.kelas); });
        (student?.classHistory || []).forEach(h => {
          if (h.fromClass) clsSet.add(h.fromClass);
          if (h.toClass) clsSet.add(h.toClass);
        });
        return Array.from(clsSet);
      }, [student, allPaidTransactions]);

      // Filter riwayat berdasarkan pilihan kelas
      const filteredPaidBills = useMemo(() => {
        if (historyClassFilter === 'all') return allPaidTransactions;
        return allPaidTransactions.filter(t => (t.kelas || student?.kelas) === historyClassFilter);
      }, [allPaidTransactions, historyClassFilter, student?.kelas]);

      const unreadAnnCount = announcements.filter(a => !readAnnouncements.includes(a.id)).length;
      const unreadNotesCount = myNotes.filter(n => !readNotes.includes(n.id)).length;
      const unreadComplaintMsgsCount = myComplaints.filter(c => c.messages && c.messages.length > (readComplaintMsgs[c.id] || 0) && c.messages[c.messages.length - 1].sender === 'Admin TU').length;
      const totalParentUnread = unreadAnnCount + unreadNotesCount + unreadComplaintMsgsCount;

      const handleSubmitComplaint = (e) => {
        e.preventDefault();
        if (!complaintTitle || !complaintContent) return;
        const now = Date.now();
        onAddComplaint({
          studentId: student.id,
          studentName: student.name,
          waliName: student.wali || 'Wali Siswa',
          title: complaintTitle,
          content: complaintContent,
          adminReply: '',
          status: 'Belum Ditangani',
          isRead: false,
          date: new Date().toLocaleDateString('id-ID'),
          createdAtMs: now,
          expiresAtMs: now + 3600000
        });
        setComplaintTitle('');
        setComplaintContent('');
      };
      
      const handleSaveSettings = (e) => {
        e.preventDefault();
        const updateObj = {};
        if (newPassword.trim()) updateObj.password = newPassword.trim();
        if (newPhone.trim()) updateObj.telepon = newPhone.trim();
        
        if (Object.keys(updateObj).length > 0) {
          onUpdateParentSettings(student.id, updateObj);
          setNewPassword('');
        }
      };

      const getWaLink = (numStr) => {
        if (!numStr) return '#';
        let clean = numStr.replace(/[^0-9]/g, '');
        if (clean.startsWith('0')) clean = '62' + clean.slice(1);
        return `https://wa.me/${clean}`;
      };
      
      const formatPhoneDisplay = (val) => {
        if (!val) return '-';
        let cleaned = val.replace(/[^0-9]/g, '');
        if (cleaned.length > 8) {
          return cleaned.replace(/(\d{4})(\d{4})(\d+)/, '$1-$2-$3');
        }
        return cleaned;
      };

      return (
        <div className="min-h-screen bg-[#edf2f7] bg-aesthetic-pattern p-2 sm:p-3 md:p-4 lg:p-6 flex flex-col items-center justify-start text-slate-800">
          {previewImage && (
            <ImagePreviewModal imageUrl={previewImage.url} title={previewImage.title} onClose={() => setPreviewImage(null)} />
          )}

          {selectedAnnouncement && (
            <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in">
              <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl relative animate-in zoom-in-95 duration-200">
                <button onClick={() => setSelectedAnnouncement(null)} className="absolute top-4 right-4 p-2 bg-slate-100 hover:bg-rose-100 text-slate-500 hover:text-rose-600 rounded-xl transition-colors z-10 shadow-sm">
                  <Icon name="x" size={24} />
                </button>
                {selectedAnnouncement.imageUrl && (
                  <div className="w-full h-56 sm:h-72 bg-slate-100 relative shrink-0">
                    <img src={selectedAnnouncement.imageUrl} alt={selectedAnnouncement.title} className="w-full h-full object-cover" />
                  </div>
                )}
                <div className="p-6 md:p-8 overflow-y-auto">
                  <div className="flex items-center gap-2 text-[11px] font-bold text-teal-600 uppercase mb-4">
                    <Icon name="calendar" size={14} />
                    {selectedAnnouncement.date}
                  </div>
                  <h3 className="text-2xl sm:text-3xl font-black text-slate-900 mb-6 leading-tight">{selectedAnnouncement.title}</h3>
                  <div className="text-sm font-medium text-slate-700 leading-relaxed whitespace-pre-wrap">
                    {selectedAnnouncement.content}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* MAIN FLOATING APP CARD CONTAINER */}
          <div className="w-full max-w-[1720px] bg-white rounded-2xl md:rounded-[32px] shadow-2xl shadow-blue-900/10 flex flex-col md:flex-row overflow-hidden min-h-[96vh] border border-slate-200/80">
            {/* LEFT ROYAL BLUE SIDEBAR WITH SCOOPED TAB CUTOUT */}
            <aside className="w-full md:w-72 lg:w-80 royal-blue-sidebar shrink-0 flex flex-col justify-between p-0 relative z-20">
              <div>
                {/* Brand / School Header */}
                <div className="p-6 sm:p-7 pb-6 flex items-center gap-4">
                  <div 
                    onClick={() => student.fotoUrl && setPreviewImage({ url: student.fotoUrl, title: `Foto Profil - ${student.name}` })}
                    className="w-14 h-14 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center text-white border border-white/30 overflow-hidden shrink-0 shadow-lg cursor-pointer hover:scale-105 transition-transform"
                  >
                    {student.fotoUrl ? (
                      <img src={student.fotoUrl} alt={student.name} className="w-full h-full object-cover" />
                    ) : (
                      <img src="/logo.png" alt="PAUD Setia Bhakti" className="w-11 h-11 object-contain filter drop-shadow" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <h1 className="font-black text-base lg:text-lg leading-tight text-white tracking-tight truncate">{settings.schoolName}</h1>
                    <div className="inline-flex items-center gap-1.5 mt-1">
                      <span className="w-2 h-2 rounded-full bg-cyan-300 animate-pulse"></span>
                      <span className="text-xs font-black text-blue-100 uppercase tracking-wider">Wali Murid</span>
                    </div>
                  </div>
                </div>

                {/* Vertical Navigation (Clean 5 items) */}
                <nav className="pl-4 pr-0 py-4 space-y-2.5 sm:space-y-3 font-extrabold text-sm sm:text-base relative">
                  {[
                    { id: 'spp', icon: 'credit-card', label: 'Tagihan SPP', count: unpaidBills.length > 0 ? unpaidBills.length : null, isBadgeDanger: true },
                    { id: 'berita', icon: 'newspaper', label: 'Pengumuman', count: unreadAnnCount > 0 ? unreadAnnCount : null },
                    { id: 'evaluasi', icon: 'award', label: 'Catatan TU', count: unreadNotesCount > 0 ? unreadNotesCount : null },
                    { id: 'pengaduan', icon: 'message-square', label: 'Pengaduan', count: unreadComplaintMsgsCount > 0 ? unreadComplaintMsgsCount : null },
                    { id: 'pengaturan', icon: 'settings', label: 'Pengaturan' }
                  ].map(tab => {
                    const isActive = activeTab === tab.id;
                    return (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`w-full py-4 px-5 sm:px-6 flex items-center justify-between transition-all text-sm sm:text-[15px] ${
                          isActive
                            ? 'scooped-tab-active bg-white text-blue-700 font-black rounded-l-2xl rounded-r-none mr-0 shadow-sm'
                            : 'w-[calc(100%-16px)] mr-4 rounded-2xl text-white/90 hover:text-white hover:bg-white/10 font-extrabold'
                        }`}
                      >
                        <div className="flex items-center gap-3.5 truncate">
                          <Icon name={tab.icon} size={22} />
                          <span className="truncate">{tab.label}</span>
                        </div>
                        {tab.count ? (
                          <span className={`px-2.5 py-1 rounded-full text-xs font-black ${
                            isActive
                              ? (tab.isBadgeDanger ? 'bg-rose-100 text-rose-700' : 'bg-blue-100 text-blue-700')
                              : (tab.isBadgeDanger ? 'bg-rose-500 text-white' : 'bg-white/20 text-white')
                          }`}>
                            {tab.count}
                          </span>
                        ) : null}
                      </button>
                    );
                  })}
                </nav>
              </div>

              {/* Sidebar Footer: Student Profile Chip */}
              <div className="p-4 m-4 bg-white/10 backdrop-blur-md rounded-2xl border border-white/15 text-white">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center font-black text-sm text-white shrink-0">
                    {student.name ? student.name.charAt(0) : 'S'}
                  </div>
                  <div className="truncate flex-1">
                    <p className="text-sm font-black text-white truncate">{student.name}</p>
                    <p className="text-xs text-blue-100 font-semibold truncate">Kelas {student.kelas} • NIS {student.nis}</p>
                  </div>
                </div>
              </div>
            </aside>

            {/* RIGHT WHITE CONTENT PANEL */}
            <main className="flex-1 bg-white flex flex-col min-w-0 min-h-0 overflow-y-auto">
              {/* Header Top Bar */}
              <header className="px-6 md:px-10 pt-7 pb-5 border-b border-slate-100 flex flex-col gap-4 bg-white/95 backdrop-blur-md sticky top-0 z-10">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-3">
                      <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                        {activeTab === 'spp' && 'Status Pembayaran SPP'}
                        {activeTab === 'berita' && 'Berita & Pengumuman Sekolah'}
                        {activeTab === 'evaluasi' && 'Catatan Siswa dari TU / Guru'}
                        {activeTab === 'pengaduan' && 'Layanan Pengaduan & Aspirasi'}
                        {activeTab === 'pengaturan' && 'Pengaturan Akun Wali Murid'}
                      </h2>
                      {activeTab === 'spp' && (
                        unpaidBills.length > 0 ? (
                          <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-rose-50 text-rose-700 border border-rose-200">
                            <Icon name="alert-circle" size={13} className="text-rose-600" />
                            <span>{unpaidBills.length} Bulan Tertunggak</span>
                          </span>
                        ) : (
                          <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <Icon name="shield-check" size={14} className="text-emerald-600" />
                            <span>Status Lunas / Aman</span>
                          </span>
                        )
                      )}
                    </div>
                    <p className="text-sm sm:text-base text-slate-500 font-medium mt-1">
                      {activeTab === 'spp' && 'Informasi tarif, tagihan jatuh tempo, dan riwayat pembayaran resmi'}
                      {activeTab === 'berita' && 'Informasi kegiatan, edaran libur, dan agenda sekolah terkini'}
                      {activeTab === 'evaluasi' && 'Catatan perkembangan, pembinaan, dan apresiasi dari sekolah'}
                      {activeTab === 'pengaduan' && 'Sampaikan aspirasi dan konsultasi langsung dengan pihak TU'}
                      {activeTab === 'pengaturan' && 'Perbarui nomor WhatsApp dan kata sandi akun'}
                    </p>
                  </div>

                  {/* Header Actions */}
                  <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
                    <button
                      onClick={() => onRefresh(true)}
                      title="Sinkronisasi Data"
                      className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-bold transition-all flex items-center gap-2"
                    >
                      <Icon name="refresh-cw" size={17} className={isRefreshing ? 'animate-spin text-blue-600' : ''} />
                      <span className="hidden md:inline">Sinkronisasi</span>
                    </button>

                    <div className="relative">
                      <button
                        onClick={() => setShowParentBell(!showParentBell)}
                        className="p-2.5 bg-slate-100 hover:bg-slate-200 rounded-xl text-slate-700 relative transition-colors"
                        title="Notifikasi"
                      >
                        <Icon name="bell" size={18} />
                        {totalParentUnread > 0 && (
                          <span className="absolute -top-1 -right-1 w-5 h-5 bg-rose-500 text-white rounded-full text-[10px] font-extrabold flex items-center justify-center animate-pulse">
                            {totalParentUnread}
                          </span>
                        )}
                      </button>

                      {showParentBell && (
                        <div className="absolute right-0 mt-3 w-80 sm:w-96 bg-white rounded-3xl shadow-2xl border border-slate-200 text-slate-800 p-4 z-50 space-y-3 animate-in slide-in-from-top-2">
                          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                            <div className="flex items-center gap-2">
                              <h4 className="font-extrabold text-xs uppercase text-slate-700">Notifikasi</h4>
                              {totalParentUnread > 0 && (
                                <span className="px-2 py-0.5 bg-rose-100 text-rose-700 text-[10px] font-black rounded-full">
                                  {totalParentUnread} Baru
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              {totalParentUnread > 0 && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    const newAnnIds = [...new Set([...readAnnouncements, ...announcements.map(a => a.id)])];
                                    const newNoteIds = [...new Set([...readNotes, ...myNotes.map(n => n.id)])];
                                    const newComplaintMsgs = { ...readComplaintMsgs };
                                    myComplaints.forEach(c => {
                                      if (c.messages) newComplaintMsgs[c.id] = c.messages.length;
                                    });
                                    setReadAnnouncements(newAnnIds);
                                    setReadNotes(newNoteIds);
                                    setReadComplaintMsgs(newComplaintMsgs);
                                    try {
                                      localStorage.setItem('read_announcements_' + (student ? student.id : 'guest'), JSON.stringify(newAnnIds));
                                      localStorage.setItem('read_notes_' + (student ? student.id : 'guest'), JSON.stringify(newNoteIds));
                                      localStorage.setItem('read_complaint_msgs_' + (student ? student.id : 'guest'), JSON.stringify(newComplaintMsgs));
                                    } catch(e) {}
                                  }}
                                  className="text-[10px] font-bold text-blue-600 hover:text-blue-800 hover:underline"
                                >
                                  Tandai Dibaca
                                </button>
                              )}
                              <button onClick={() => setShowParentBell(false)} className="text-slate-400 hover:text-slate-600 text-xs font-bold">Tutup</button>
                            </div>
                          </div>

                          <div className="space-y-2 max-h-72 overflow-y-auto text-xs">
                            {announcements.length === 0 && myNotes.length === 0 && (
                              <p className="text-slate-400 text-center py-4 font-medium">Tidak ada notifikasi saat ini.</p>
                            )}

                            {announcements.slice(0, 6).map(ann => {
                              const isUnread = !readAnnouncements.includes(ann.id);
                              return (
                                <div
                                  key={ann.id}
                                  onClick={() => {
                                    if (isUnread) {
                                      const next = [...readAnnouncements, ann.id];
                                      setReadAnnouncements(next);
                                      try { localStorage.setItem('read_announcements_' + (student ? student.id : 'guest'), JSON.stringify(next)); } catch(e) {}
                                    }
                                    setShowParentBell(false);
                                    setActiveTab('berita');
                                  }}
                                  className={`p-3 rounded-xl border cursor-pointer transition-all hover:scale-[0.99] ${
                                    isUnread 
                                      ? 'bg-blue-50/80 border-blue-200 font-extrabold text-blue-950 shadow-sm' 
                                      : 'bg-slate-50/80 border-slate-200 text-slate-600'
                                  }`}
                                >
                                  <div className="flex justify-between items-center mb-1">
                                    <span className="font-extrabold text-[12px] truncate">Pengumuman: {ann.title}</span>
                                    {isUnread ? (
                                      <span className="px-1.5 py-0.5 bg-blue-600 text-white rounded text-[9px] font-black shrink-0">Baru</span>
                                    ) : (
                                      <span className="text-[10px] text-slate-400 font-semibold shrink-0">Dibaca</span>
                                    )}
                                  </div>
                                  <p className="text-[10px] text-slate-500 font-normal line-clamp-1">{ann.content || 'Klik untuk membuka pengumuman sekolah'}</p>
                                </div>
                              );
                            })}

                            {myNotes.slice(0, 6).map(n => {
                              const isUnread = !readNotes.includes(n.id);
                              return (
                                <div
                                  key={n.id}
                                  onClick={() => {
                                    if (isUnread) {
                                      const next = [...readNotes, n.id];
                                      setReadNotes(next);
                                      try { localStorage.setItem('read_notes_' + (student ? student.id : 'guest'), JSON.stringify(next)); } catch(e) {}
                                    }
                                    setShowParentBell(false);
                                    setActiveTab('evaluasi');
                                  }}
                                  className={`p-3 rounded-xl border cursor-pointer transition-all hover:scale-[0.99] ${
                                    isUnread 
                                      ? 'bg-emerald-50/80 border-emerald-200 font-extrabold text-emerald-950 shadow-sm' 
                                      : 'bg-slate-50/80 border-slate-200 text-slate-600'
                                  }`}
                                >
                                  <div className="flex justify-between items-center mb-1">
                                    <span className="font-extrabold text-[12px] truncate">Catatan TU: {n.title || n.category}</span>
                                    {isUnread ? (
                                      <span className="px-1.5 py-0.5 bg-emerald-600 text-white rounded text-[9px] font-black shrink-0">Baru</span>
                                    ) : (
                                      <span className="text-[10px] text-slate-400 font-semibold shrink-0">Dibaca</span>
                                    )}
                                  </div>
                                  <p className="text-[10px] text-slate-500 font-normal line-clamp-1">{n.content || 'Klik untuk melihat catatan dari Tata Usaha'}</p>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>

                    <button
                      onClick={onLogout}
                      title="Keluar"
                      className="px-4 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl text-sm font-bold border border-rose-200 transition-colors flex items-center gap-2"
                    >
                      <Icon name="log-out" size={17} />
                      <span className="hidden sm:inline">Keluar</span>
                    </button>
                  </div>
                </div>

                {/* HORIZONTAL SUB-PILL BAR FOR SPP TAB */}
                {activeTab === 'spp' && (
                  <div className="flex flex-wrap items-center gap-2.5 pt-1.5">
                    <button
                      onClick={() => setSppSubFilter('all')}
                      className={`sub-pill-btn ${sppSubFilter === 'all' ? 'sub-pill-btn-active' : 'sub-pill-btn-inactive'}`}
                    >
                      <Icon name="layers" size={16} />
                      <span>Semua Ringkasan</span>
                    </button>
                    <button
                      onClick={() => setSppSubFilter('unpaid')}
                      className={`sub-pill-btn ${sppSubFilter === 'unpaid' ? 'sub-pill-btn-active' : 'sub-pill-btn-inactive'}`}
                    >
                      <Icon name="alert-circle" size={16} />
                      <span>Tagihan Menunggak</span>
                      {unpaidBills.length > 0 && (
                        <span className={`ml-1.5 px-2 py-0.5 rounded-full text-xs font-black ${sppSubFilter === 'unpaid' ? 'bg-white text-rose-600' : 'bg-rose-500 text-white'}`}>
                          {unpaidBills.length}
                        </span>
                      )}
                    </button>
                    <button
                      onClick={() => setSppSubFilter('upcoming')}
                      className={`sub-pill-btn ${sppSubFilter === 'upcoming' ? 'sub-pill-btn-active' : 'sub-pill-btn-inactive'}`}
                    >
                      <Icon name="calendar" size={16} />
                      <span>Belum Jatuh Tempo</span>
                      <span className={`ml-1.5 px-2 py-0.5 rounded-full text-xs font-black ${sppSubFilter === 'upcoming' ? 'bg-white text-sky-800' : 'bg-sky-200 text-sky-800'}`}>
                        {upcomingBills.length}
                      </span>
                    </button>
                    <button
                      onClick={() => setSppSubFilter('paid')}
                      className={`sub-pill-btn ${sppSubFilter === 'paid' ? 'sub-pill-btn-active' : 'sub-pill-btn-inactive'}`}
                    >
                      <Icon name="check-circle-2" size={16} />
                      <span>Riwayat Lunas</span>
                      <span className={`ml-1.5 px-2 py-0.5 rounded-full text-xs font-black ${sppSubFilter === 'paid' ? 'bg-white text-emerald-800' : 'bg-emerald-200 text-emerald-800'}`}>
                        {paidBills.length}
                      </span>
                    </button>
                  </div>
                )}
              </header>

              {/* Main Content Body with Fluid Tab Switch Animation */}
              <div key={activeTab} className="p-6 md:p-10 space-y-7 flex-1 animate-tab-switch">

            {/* GREETING & WAVING MASCOT BANNER */}
            <GreetingMascotBanner 
              name={student.name || 'Wali Murid'} 
              role="Wali Murid" 
              schoolName={settings.schoolName} 
              academicYear={settings.academicYear} 
            />

            {/* TAB 1: SPP (Profile Card, Stats Cards, & SPP Tables) */}
            {activeTab === 'spp' && (
              isRefreshing ? (
                <div className="space-y-7 animate-pulse select-none">
                  {/* Skeleton Profile Card */}
                  <div className="glass-panel-modern rounded-[32px] p-6 sm:p-8 flex flex-col md:flex-row items-center justify-between gap-6 bg-slate-50/80">
                    <div className="flex items-center gap-6 w-full md:w-auto">
                      <div className="w-24 h-24 rounded-3xl bg-slate-200 animate-pulse shrink-0"></div>
                      <div className="space-y-3 flex-1">
                        <div className="h-5 w-36 bg-slate-200 rounded-full"></div>
                        <div className="h-8 w-64 bg-slate-200 rounded-xl"></div>
                        <div className="flex flex-wrap gap-2">
                          <div className="h-6 w-24 bg-slate-200 rounded-lg"></div>
                          <div className="h-6 w-32 bg-slate-200 rounded-lg"></div>
                        </div>
                      </div>
                    </div>
                    <div className="h-20 w-48 bg-slate-200 rounded-2xl"></div>
                  </div>

                  {/* Skeleton 4 Stat Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                    {[1, 2, 3, 4].map(i => (
                      <div key={i} className="p-6 rounded-3xl bg-white border border-slate-200 space-y-3 shadow-sm">
                        <div className="flex justify-between items-center">
                          <div className="w-12 h-12 rounded-2xl bg-slate-200"></div>
                          <div className="h-5 w-20 bg-slate-200 rounded-full"></div>
                        </div>
                        <div className="h-4 w-28 bg-slate-200 rounded"></div>
                        <div className="h-8 w-36 bg-slate-200 rounded-xl"></div>
                      </div>
                    ))}
                  </div>

                  {/* Skeleton Table Section */}
                  <div className="bg-white rounded-3xl border border-slate-200 p-6 space-y-4 shadow-sm">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-slate-200"></div>
                      <div className="space-y-2">
                        <div className="h-6 w-56 bg-slate-200 rounded-lg"></div>
                        <div className="h-4 w-72 bg-slate-100 rounded"></div>
                      </div>
                    </div>
                    <div className="space-y-3 pt-4">
                      {[1, 2, 3].map(i => (
                        <div key={i} className="h-16 bg-slate-100 rounded-2xl w-full"></div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div key={sppSubFilter} className="space-y-7 animate-modern-fade">
                {/* STUDENT PROFILE CARD - MODERN GLASSMORPHIC */}
            <div className="glass-panel-modern rounded-[32px] p-6 sm:p-8 flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-80 h-80 bg-blue-400/10 rounded-full blur-3xl -z-10 -translate-y-1/2 translate-x-1/3"></div>
              <div className="absolute bottom-0 left-0 w-64 h-64 bg-cyan-400/10 rounded-full blur-3xl -z-10 translate-y-1/3 -translate-x-1/4"></div>

              <div className="flex items-center gap-6 w-full md:w-auto">
                <div 
                  onClick={() => student.fotoUrl && setPreviewImage({ url: student.fotoUrl, title: `Foto Profil - ${student.name}` })}
                  className="w-24 h-24 rounded-3xl bg-gradient-to-tr from-blue-600 via-sky-500 to-cyan-400 border-4 border-white shadow-xl flex items-center justify-center text-white font-black text-4xl overflow-hidden shrink-0 cursor-pointer hover:scale-105 transition-transform relative z-10"
                >
                  {student.fotoUrl ? (
                    <img src={student.fotoUrl} alt={student.name} className="w-full h-full object-cover" />
                  ) : (
                    <span>{student.name ? student.name.charAt(0).toUpperCase() : 'S'}</span>
                  )}
                </div>
                <div>
                  <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-blue-50/90 text-blue-700 rounded-full text-xs font-black tracking-wider uppercase mb-2 shadow-sm border border-blue-200">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    AKTIF • KELAS {student.kelas}
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">{student.name}</h2>
                  <div className="flex flex-wrap items-center gap-3 mt-2.5 text-sm font-bold text-slate-500">
                    <span className="bg-white/80 px-3 py-1.5 rounded-xl border border-slate-200 shadow-sm">NIS: <span className="text-slate-800 font-extrabold">{student.nis}</span></span>
                    <span className="bg-white/80 px-3 py-1.5 rounded-xl border border-slate-200 shadow-sm">Wali: <span className="text-slate-800 font-extrabold">{student.wali || '-'}</span></span>
                    <a href={getWaLink(student.telepon)} target="_blank" rel="noopener noreferrer" className="bg-teal-50 text-teal-700 px-3 py-1.5 rounded-xl border border-teal-200 hover:bg-teal-100 transition-colors flex items-center gap-2 shadow-sm font-extrabold">
                      <Icon name="phone" size={14} /> {formatPhoneDisplay(student.telepon)}
                    </a>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-6 bg-white/80 backdrop-blur-md p-6 rounded-2xl border border-slate-200/80 w-full md:w-auto shadow-sm">
                <div className="text-right">
                  <p className="text-xs font-black text-slate-400 uppercase tracking-wider mb-1">Tarif SPP Resmi</p>
                  <p className="text-2xl sm:text-3xl font-black text-blue-600">{formatRupiah(student.tarif)}</p>
                  {student.keringanan_note && (
                    <span className="inline-block mt-1 px-2.5 py-1 bg-amber-100 text-amber-900 text-xs font-black rounded-lg border border-amber-200">
                      Keringanan: {student.keringanan_note}
                    </span>
                  )}
                </div>
                <div className="h-12 w-px bg-slate-200"></div>
                <div className="text-left">
                  <p className="text-xs font-black text-slate-400 uppercase tracking-wider mb-1">Tahun Ajaran</p>
                  <p className="text-base font-black text-slate-800 bg-white px-3.5 py-2 rounded-xl border border-slate-200 shadow-sm">{settings.academicYear}</p>
                </div>
              </div>
            </div>

            {/* MODERN OVERVIEW STATS CARDS */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {/* Card 1: Tunggakan s/d Bulan Berjalan */}
              <div className={`p-6 rounded-3xl border transition-all stagger-card-1 modern-hover-card ${
                unpaidBills.length > 0
                  ? 'bg-rose-50/90 border-rose-200 shadow-sm card-glow-rose'
                  : 'bg-emerald-50/90 border-emerald-200 shadow-sm card-glow-emerald'
              }`}>
                <div className="flex items-center justify-between mb-3.5">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                    unpaidBills.length > 0 ? 'bg-rose-500 text-white' : 'bg-emerald-500 text-white'
                  }`}>
                    <Icon name={unpaidBills.length > 0 ? 'alert-circle' : 'shield-check'} size={24} />
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider ${
                    unpaidBills.length > 0 ? 'bg-rose-200 text-rose-800' : 'bg-emerald-200 text-emerald-800'
                  }`}>
                    {unpaidBills.length > 0 ? `${unpaidBills.length} Bulan` : 'Lunas / Aman'}
                  </span>
                </div>
                <p className="text-xs sm:text-sm font-extrabold text-slate-500 uppercase tracking-wider">Tunggakan s/d Bulan Ini</p>
                <h4 className={`text-2xl sm:text-3xl font-black mt-1 ${unpaidBills.length > 0 ? 'text-rose-700' : 'text-emerald-700'}`}>
                  {formatRupiah(totalDueDebt)}
                </h4>
                <p className="text-xs sm:text-sm font-medium text-slate-500 mt-1.5">
                  {unpaidBills.length > 0 ? 'Wajib segera dilunasi' : 'Semua tagihan s/d bulan ini aman'}
                </p>
              </div>

              {/* Card 2: Bulan Mendatang (Belum Jatuh Tempo) */}
              <div className="p-6 rounded-3xl bg-sky-50/80 border border-sky-200 shadow-sm card-glow-cyan transition-all stagger-card-2 modern-hover-card">
                <div className="flex items-center justify-between mb-3.5">
                  <div className="w-12 h-12 rounded-2xl bg-sky-500 text-white flex items-center justify-center">
                    <Icon name="calendar" size={24} />
                  </div>
                  <span className="px-3 py-1 rounded-full bg-sky-200 text-sky-800 text-xs font-black uppercase tracking-wider">
                    {upcomingBills.length} Bulan
                  </span>
                </div>
                <p className="text-xs sm:text-sm font-extrabold text-slate-500 uppercase tracking-wider">Bulan Mendatang</p>
                <h4 className="text-2xl sm:text-3xl font-black text-sky-900 mt-1">Belum Jatuh Tempo</h4>
                <p className="text-xs sm:text-sm font-medium text-slate-500 mt-1.5">
                  Tidak dihitung nunggak • Opsi bayar awal
                </p>
              </div>

              {/* Card 3: Total Terbayar (Lunas) */}
              <div className="p-6 rounded-3xl bg-indigo-50/80 border border-indigo-200 shadow-sm card-glow-purple transition-all stagger-card-3 modern-hover-card">
                <div className="flex items-center justify-between mb-3.5">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center">
                    <Icon name="check-circle-2" size={24} />
                  </div>
                  <span className="px-3 py-1 rounded-full bg-indigo-200 text-indigo-800 text-xs font-black uppercase tracking-wider">
                    {monthlyBills.length > 0 ? Math.round((paidBills.length / monthlyBills.length) * 100) : 0}% Lunas
                  </span>
                </div>
                <p className="text-xs sm:text-sm font-extrabold text-slate-500 uppercase tracking-wider">Status Pembayaran</p>
                <h4 className="text-2xl sm:text-3xl font-black text-indigo-950 mt-1">
                  {paidBills.length} <span className="text-base font-bold text-slate-500">/ {monthlyBills.length} Bulan</span>
                </h4>
                <div className="w-full bg-indigo-200/60 rounded-full h-2 mt-2.5 overflow-hidden">
                  <div 
                    className="bg-indigo-600 h-full rounded-full transition-all duration-500" 
                    style={{ width: `${monthlyBills.length > 0 ? (paidBills.length / monthlyBills.length) * 100 : 0}%` }}
                  ></div>
                </div>
              </div>

              {/* Card 4: Tarif Resmi */}
              <div className="p-6 rounded-3xl bg-amber-50/80 border border-amber-200 shadow-sm card-glow-amber transition-all stagger-card-4 modern-hover-card">
                <div className="flex items-center justify-between mb-3.5">
                  <div className="w-12 h-12 rounded-2xl bg-amber-500 text-white flex items-center justify-center">
                    <Icon name="badge-percent" size={24} />
                  </div>
                  <span className="px-3 py-1 rounded-full bg-amber-200 text-amber-900 text-xs font-black uppercase tracking-wider">
                    Kelas {student.kelas}
                  </span>
                </div>
                <p className="text-xs sm:text-sm font-extrabold text-slate-500 uppercase tracking-wider">Tarif Resmi SPP</p>
                <h4 className="text-2xl sm:text-3xl font-black text-amber-950 mt-1">
                  {formatRupiah(student.tarif)}<span className="text-sm font-bold text-slate-500">/bln</span>
                </h4>
                <p className="text-xs sm:text-sm font-medium text-slate-500 mt-1.5 truncate">
                  {student.keringanan_note ? `Keringanan: ${student.keringanan_note}` : `Periode ${settings.academicYear || 'Aktif'}`}
                </p>
              </div>
            </div>


                {/* 1. Tagihan Menunggak (Shown if sppSubFilter is 'all' or 'unpaid') */}
                {(sppSubFilter === 'all' || sppSubFilter === 'unpaid') && (
                  <section className={`bg-white rounded-3xl border shadow-sm overflow-hidden relative transition-all ${
                    unpaidBills.length > 0 ? 'border-rose-100' : 'border-emerald-100'
                  }`}>
                    <div className={`absolute top-0 left-0 w-1.5 h-full ${
                      unpaidBills.length > 0 ? 'bg-rose-500' : 'bg-emerald-500'
                    }`}></div>
                    <div className={`p-6 md:p-7 border-b border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
                      unpaidBills.length > 0 ? 'bg-rose-50/30' : 'bg-emerald-50/30'
                    }`}>
                      <div className="flex items-center gap-3.5">
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
                          unpaidBills.length > 0 ? 'bg-rose-100 text-rose-600' : 'bg-emerald-100 text-emerald-600'
                        }`}>
                          <Icon name={unpaidBills.length > 0 ? "alert-circle" : "shield-check"} size={24}/>
                        </div>
                        <div>
                          <h3 className="font-black text-slate-800 text-xl sm:text-2xl">
                            {unpaidBills.length > 0 ? 'Tagihan Menunggak (s/d Bulan Berjalan)' : 'Status Tagihan s/d Bulan Ini'}
                          </h3>
                          <p className="text-sm text-slate-500 font-medium mt-0.5">
                            {unpaidBills.length > 0 
                              ? 'Bulan SPP yang telah berjalan / jatuh tempo dan perlu segera dilunasi.'
                              : 'Semua tagihan SPP s/d bulan berjalan dalam status aman & lunas.'}
                          </p>
                        </div>
                      </div>
                      {unpaidBills.length > 0 ? (
                        <span className="px-4 py-1.5 bg-rose-500 text-white rounded-full text-sm font-black shadow-sm shrink-0">
                          Total: {formatRupiah(totalDueDebt)}
                        </span>
                      ) : (
                        <span className="px-4 py-1.5 bg-emerald-500 text-white rounded-full text-sm font-black shadow-sm shrink-0 flex items-center gap-1.5">
                          <Icon name="check-circle" size={16} /> Status Aman & Lunas
                        </span>
                      )}
                    </div>
                    <div className="overflow-x-auto p-3">
                      {unpaidBills.length === 0 ? (
                        <div className="p-10 text-center flex flex-col items-center justify-center">
                          <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-3">
                            <Icon name="shield-check" size={36}/>
                          </div>
                          <p className="font-black text-slate-800 text-xl">Alhamdulillah, Tidak Ada Tunggakan</p>
                          <p className="text-base text-slate-500 font-medium mt-1">Semua tagihan SPP ananda s/d bulan berjalan dalam status aman & lunas.</p>
                        </div>
                      ) : (
                        <table className="w-full text-left">
                          <tbody className="divide-y divide-slate-100">
                            {unpaidBills.map((bill, idx) => (
                              <tr key={idx} className="hover:bg-slate-50 transition-colors group">
                                <td className="py-5 px-6">
                                  <div className="font-black text-slate-800 text-lg sm:text-xl">{bill.month}</div>
                                  <div className="flex items-center gap-1.5 text-xs font-black text-rose-600 uppercase mt-1">
                                    <Icon name="alert-triangle" size={13} className="text-rose-500" />
                                    <span>Jatuh Tempo • SPP {student.kelas}</span>
                                  </div>
                                </td>
                                <td className="py-5 px-6 text-right">
                                  <div className="font-black text-rose-600 text-xl sm:text-2xl">{formatRupiah(bill.amount)}</div>
                                </td>
                                <td className="py-5 px-6 text-right w-52">
                                  <button
                                    onClick={() => onPayMidtrans(bill)}
                                    className="w-full py-3.5 px-5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-black rounded-xl text-sm shadow-md shadow-blue-500/25 transition-all flex items-center justify-center gap-2 group-hover:scale-105"
                                  >
                                    <Icon name="credit-card" size={18} /> Bayar Online
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>
                  </section>
                )}

                {/* 2. BULAN MENDATANG (Shown if sppSubFilter is 'all' or 'upcoming') */}
                {(sppSubFilter === 'all' || sppSubFilter === 'upcoming') && upcomingBills.length > 0 && (
                  <details className="group bg-white rounded-3xl border border-sky-100 shadow-sm overflow-hidden" open={sppSubFilter === 'upcoming'}>
                    <summary className="p-6 md:p-7 cursor-pointer flex items-center justify-between select-none bg-sky-50/30 hover:bg-sky-50/60 transition-colors">
                      <div className="flex items-center gap-3.5">
                        <div className="w-12 h-12 bg-sky-100 text-sky-600 rounded-2xl flex items-center justify-center shrink-0"><Icon name="calendar" size={24}/></div>
                        <div>
                          <h3 className="font-black text-slate-800 text-xl sm:text-2xl">Bulan Mendatang (Belum Jatuh Tempo)</h3>
                          <p className="text-sm text-slate-500 font-medium mt-0.5">{upcomingBills.length} bulan tersisa di periode ajaran ini. Tidak dihitung nunggak & Anda dapat membayar lebih awal.</p>
                        </div>
                      </div>
                      <div className="w-9 h-9 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-400 group-open:rotate-180 transition-transform">
                        <Icon name="chevron-down" size={18} />
                      </div>
                    </summary>
                    <div className="border-t border-slate-100 p-3 overflow-x-auto">
                      <table className="w-full text-left">
                        <tbody className="divide-y divide-slate-100">
                          {upcomingBills.map((bill, idx) => (
                            <tr key={idx} className="hover:bg-slate-50 transition-colors group">
                              <td className="py-5 px-6">
                                <div className="font-black text-slate-800 text-lg sm:text-xl">{bill.month}</div>
                                <div className="text-xs font-bold text-sky-600 uppercase mt-1">Belum Jatuh Tempo • SPP {student.kelas}</div>
                              </td>
                              <td className="py-5 px-6 text-right">
                                <div className="font-black text-slate-700 text-xl sm:text-2xl">{formatRupiah(bill.amount)}</div>
                              </td>
                              <td className="py-5 px-6 text-right w-52">
                                <button
                                  onClick={() => onPayMidtrans(bill)}
                                  className="w-full py-3.5 px-5 bg-slate-800 hover:bg-slate-900 text-white font-black rounded-xl text-sm shadow-md transition-all flex items-center justify-center gap-2 group-hover:scale-105"
                                >
                                  <Icon name="credit-card" size={18} /> Bayar di Awal
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </details>
                )}

                {/* 3. RIWAYAT LUNAS (Mencakup riwayat di kelas saat ini & kelas-kelas sebelumnya) */}
                {(sppSubFilter === 'all' || sppSubFilter === 'paid') && (
                  <details className="group bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden" open={sppSubFilter === 'paid' || unpaidBills.length === 0}>
                    <summary className="p-6 md:p-7 cursor-pointer flex items-center justify-between select-none bg-slate-50/50 hover:bg-slate-50 transition-colors">
                      <div className="flex items-center gap-3.5">
                        <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center shrink-0"><Icon name="history" size={24}/></div>
                        <div>
                          <h3 className="font-black text-slate-800 text-xl sm:text-2xl">Riwayat SPP Lunas & Kelas Sebelumnya</h3>
                          <p className="text-sm text-slate-500 font-medium mt-0.5">{allPaidTransactions.length} transaksi resmi tersimpan lengkap dengan kuitansi.</p>
                        </div>
                      </div>
                      <div className="w-9 h-9 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-400 group-open:rotate-180 transition-transform">
                        <Icon name="chevron-down" size={18} />
                      </div>
                    </summary>

                    {/* Filter Riwayat Pembayaran Berdasarkan Kelas Sebelumnya & Sekarang */}
                    <div className="px-6 py-3.5 bg-slate-50 border-t border-b border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs">
                      <div className="flex items-center gap-2">
                        <Icon name="filter" size={14} className="text-slate-500" />
                        <span className="font-extrabold text-slate-600 uppercase tracking-wider">Filter Riwayat Kelas:</span>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setHistoryClassFilter('all')}
                          className={`px-3 py-1.5 rounded-xl font-black transition-all ${
                            historyClassFilter === 'all'
                              ? 'bg-blue-600 text-white shadow-sm'
                              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          Semua Kelas ({allPaidTransactions.length})
                        </button>
                        {studentClassHistoryList.map(cls => {
                          const count = allPaidTransactions.filter(t => (t.kelas || student?.kelas) === cls).length;
                          const isCurrent = cls === student?.kelas;
                          return (
                            <button
                              key={cls}
                              type="button"
                              onClick={() => setHistoryClassFilter(cls)}
                              className={`px-3 py-1.5 rounded-xl font-black transition-all flex items-center gap-1.5 ${
                                historyClassFilter === cls
                                  ? 'bg-blue-600 text-white shadow-sm'
                                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                              }`}
                            >
                              <span>{cls}</span>
                              {isCurrent && (
                                <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 font-extrabold">Aktif</span>
                              )}
                              <span className={`px-1.5 py-0.2 rounded text-[10px] font-black ${
                                historyClassFilter === cls ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-700'
                              }`}>
                                {count}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="p-3 overflow-x-auto">
                      {filteredPaidBills.length === 0 ? (
                        <p className="text-center p-8 text-base text-slate-500 font-bold">
                          {historyClassFilter === 'all' 
                            ? 'Belum ada riwayat pembayaran lunas.' 
                            : `Belum ada riwayat pembayaran pada kelas ${historyClassFilter}.`}
                        </p>
                      ) : (
                        <table className="w-full text-left">
                          <tbody className="divide-y divide-slate-100">
                            {filteredPaidBills.map((trx, idx) => (
                              <tr key={trx.id || idx} className="hover:bg-slate-50 transition-colors">
                                <td className="py-5 px-6">
                                  <div className="font-black text-slate-800 text-lg sm:text-xl">{trx.month}</div>
                                  <div className="flex items-center gap-2 mt-1">
                                    <span className="text-xs font-bold text-slate-400 uppercase">Tgl: {trx.date}</span>
                                    <span className="px-2 py-0.5 rounded-md text-[11px] font-black bg-blue-50 text-blue-800 border border-blue-200">
                                      Kelas: {trx.kelas || student?.kelas}
                                    </span>
                                  </div>
                                </td>
                                <td className="py-5 px-6">
                                  <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-100 text-emerald-800 rounded-xl font-black text-xs">
                                    <Icon name="check-circle-2" size={14} /> LUNAS
                                  </span>
                                  <div className="text-[11px] font-semibold text-slate-400 mt-1">{trx.metode || 'Tunai (di TU)'}</div>
                                </td>
                                <td className="py-5 px-6 font-black text-emerald-700 text-right text-lg sm:text-xl">
                                  {formatRupiah(trx.amount || trx.nominal)}
                                </td>
                                <td className="py-5 px-6 text-right w-48">
                                  <button
                                    onClick={() => onShowKuitansi(trx)}
                                    className="w-full py-3 px-4 bg-blue-50 hover:bg-blue-100 text-blue-700 font-extrabold rounded-xl text-sm transition-colors flex items-center justify-center gap-2 border border-blue-200 shadow-sm hover:scale-[1.02]"
                                  >
                                    <Icon name="receipt" size={16} /> Lihat Kuitansi
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>
                  </details>
                )}
              </div>
            )
            )}

            {/* TAB 2: BERITA */}
            {activeTab === 'berita' && (
              <section className="space-y-4 animate-in fade-in duration-300">
                {/* Same as original broadly, but slightly better styling */}
                <h3 className="text-xl font-black text-slate-800 flex items-center gap-2 mb-6">
                  <div className="w-10 h-10 bg-teal-100 text-teal-600 rounded-xl flex items-center justify-center"><Icon name="newspaper" size={20} /></div>
                  Berita & Pengumuman Sekolah
                </h3>
                {announcements.length === 0 ? (
                  <div className="bg-white p-8 rounded-3xl border border-slate-200 text-center shadow-sm">
                    <p className="text-slate-500 font-bold">Belum ada pengumuman saat ini.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {announcements.map((ann) => (
                      <div key={ann.id} className="bg-white rounded-3xl border border-slate-200/90 shadow-sm hover:shadow-xl transition-all overflow-hidden flex flex-col h-full group">
                        {ann.imageUrl ? (
                          <div 
                            className="w-full h-44 bg-slate-100 relative cursor-pointer overflow-hidden shrink-0"
                            onClick={() => setPreviewImage({ url: ann.imageUrl, title: ann.title })}
                          >
                            <img src={ann.imageUrl} alt={ann.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                            <div className="absolute inset-0 bg-slate-900/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                              <div className="bg-white/95 px-3 py-1.5 rounded-full text-slate-800 text-xs font-black shadow-lg flex items-center gap-1.5">
                                <Icon name="zoom-in" size={14} />
                                <span>Lihat Foto</span>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="w-full h-44 bg-gradient-to-br from-blue-600 via-indigo-600 to-sky-500 p-5 flex flex-col justify-between text-white shrink-0 relative overflow-hidden">
                            <div className="flex items-center justify-between">
                              <span className="px-2.5 py-1 bg-white/20 backdrop-blur-md rounded-lg text-[10px] font-black uppercase tracking-wider">
                                Berita Resmi
                              </span>
                              <Icon name="newspaper" size={22} className="text-blue-100" />
                            </div>
                            <h4 className="font-black text-sm text-white line-clamp-2 leading-snug drop-shadow-sm">
                              {ann.title}
                            </h4>
                          </div>
                        )}
                        <div className="p-6 flex-1 flex flex-col justify-between">
                          <div>
                            <div className="flex items-center gap-1.5 text-[11px] font-bold text-blue-600 uppercase mb-2">
                              <Icon name="calendar" size={13} />
                              <span>{ann.date}</span>
                            </div>
                            <h4 className="font-black text-slate-800 text-base mb-2 leading-tight line-clamp-2">{ann.title}</h4>
                            <p className="text-xs text-slate-600 leading-relaxed font-medium line-clamp-3 mb-4">{ann.content}</p>
                          </div>
                          <button 
                            type="button"
                            onClick={() => setSelectedAnnouncement(ann)}
                            className="mt-auto py-2.5 px-4 bg-blue-50 hover:bg-blue-100 text-blue-700 font-extrabold rounded-xl text-xs transition-colors flex justify-center items-center gap-2 border border-blue-200"
                          >
                            <span>Baca Selengkapnya</span>
                            <Icon name="arrow-right" size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            )}

            {/* TAB 3: CATATAN TU */}
            {activeTab === 'evaluasi' && (
              <section className="space-y-6 animate-in fade-in duration-300">
                <h3 className="text-xl font-black text-slate-800 flex items-center gap-2 mb-6">
                  <div className="w-10 h-10 bg-amber-100 text-amber-600 rounded-xl flex items-center justify-center"><Icon name="award" size={20} /></div>
                  Catatan Tata Usaha (TU) untuk Siswa
                </h3>
                {myNotes.length === 0 ? (
                  <div className="bg-white p-8 rounded-3xl border border-slate-200 text-center shadow-sm">
                    <p className="text-slate-500 font-bold">Belum ada catatan dari Tata Usaha untuk {student.name}.</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {myNotes.map((note) => (
                      <div key={note.id} className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                        <div className="p-6 border-b border-slate-100 bg-amber-50/30 flex items-start justify-between gap-4">
                          <div>
                            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-100 text-amber-800 rounded-lg text-[10px] font-black uppercase mb-2">
                              <Icon name="bookmark" size={12} /> {note.category || 'Catatan TU'}
                            </div>
                            <h4 className="font-black text-slate-800 text-lg">{note.title || 'Catatan Tata Usaha (TU)'}</h4>
                            <p className="text-xs text-slate-500 font-bold mt-1"><Icon name="calendar" size={12} className="inline mr-1"/>{note.date}</p>
                          </div>
                        </div>
                        <div className="p-6 text-sm text-slate-700 leading-relaxed font-medium whitespace-pre-wrap bg-white">
                          {note.content}
                        </div>
                        
                        {/* Comments Section */}
                        <div className="bg-slate-50 p-6 border-t border-slate-200">
                           <h5 className="font-black text-xs text-slate-500 uppercase mb-4 flex items-center gap-2"><Icon name="message-circle" size={14}/> Tanggapan Wali Murid</h5>
                           {note.comments && note.comments.length > 0 ? (
                             <div className="space-y-3 mb-4">
                               {note.comments.map((cm, i) => (
                                 <div key={i} className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex items-start gap-3">
                                    <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-black text-xs shrink-0">W</div>
                                    <div>
                                      <p className="text-xs font-black text-slate-800 mb-0.5">{cm.sender}</p>
                                      <p className="text-xs text-slate-600 font-medium">{cm.text}</p>
                                    </div>
                                 </div>
                               ))}
                             </div>
                           ) : (
                             <p className="text-xs text-slate-400 font-bold mb-4 italic">Belum ada tanggapan.</p>
                           )}
                           
                           {note.comments && note.comments.length > 0 ? (
                             <div className="p-3.5 bg-amber-50/90 border border-amber-200/90 rounded-2xl flex items-center justify-between gap-3">
                               <div className="flex items-center gap-2.5">
                                 <div className="w-7 h-7 rounded-lg bg-amber-500 text-white flex items-center justify-center shrink-0">
                                   <Icon name="lock" size={14} />
                                 </div>
                                 <div>
                                   <p className="text-xs font-black text-amber-900">Catatan Telah Ditanggapi (Terkunci)</p>
                                   <p className="text-[11px] font-medium text-amber-700">Tanggapan Anda telah terkirim ke pihak TU. Sesi tanggapan ini telah terkunci dan tersimpan di riwayat.</p>
                                 </div>
                               </div>
                               <span className="px-2.5 py-1 bg-amber-200/80 text-amber-900 text-[10px] font-black rounded-lg uppercase tracking-wide shrink-0 flex items-center gap-1">
                                 <Icon name="check" size={11} /> Terkunci
                               </span>
                             </div>
                           ) : (
                             <div className="flex gap-2">
                               <input 
                                 type="text" 
                                 value={commentText[note.id] || ''}
                                 onChange={(e) => setCommentText({...commentText, [note.id]: e.target.value})}
                                 placeholder="Ketik tanggapan Anda..."
                                 className="flex-1 px-4 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-amber-500"
                               />
                               <button
                                 onClick={() => {
                                   if(!commentText[note.id]?.trim()) return;
                                   onAddCommentNote(note.id, { sender: student.wali || 'Wali Murid', text: commentText[note.id].trim() });
                                   setCommentText({...commentText, [note.id]: ''});
                                 }}
                                 className="px-4 py-2.5 bg-amber-500 hover:bg-amber-600 active:scale-95 text-white font-black text-xs rounded-xl transition-all shadow-sm"
                               >
                                 Kirim
                               </button>
                             </div>
                           )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            )}

            {/* TAB 4: PENGADUAN / CHAT */}
            {activeTab === 'pengaduan' && (
              <section className="space-y-6 animate-in fade-in duration-300">
                <div className="bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-800 rounded-3xl p-6 sm:p-8 text-white flex flex-col sm:flex-row items-center justify-between gap-4 shadow-lg shadow-teal-900/20">
                  <div>
                    <h2 className="text-2xl font-black flex items-center gap-3"><Icon name="message-square" size={28}/> Layanan Pengaduan 2 Arah</h2>
                    <p className="text-blue-100 text-sm mt-2 font-medium max-w-xl leading-relaxed">
                      Kirimkan saran, kritik, atau pertanyaan. Ruang obrolan akan terbuka selama 1 jam untuk interaksi real-time dengan Admin TU. Setelah waktu habis, sesi ditutup otomatis.
                    </p>
                  </div>
                </div>

                {!activeComplaint ? (
                  <form onSubmit={handleSubmitComplaint} className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-5">
                    <h3 className="font-black text-lg text-slate-800 border-b border-slate-100 pb-4">Buat Sesi Pengaduan Baru</h3>
                    <div>
                      <label className="block text-xs font-black text-slate-700 uppercase mb-2">Judul Topik / Subjek</label>
                      <input type="text" required value={complaintTitle} onChange={e => setComplaintTitle(e.target.value)} placeholder="Contoh: Pertanyaan seragam olahraga" className="w-full px-4 py-3.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-teal-500" />
                    </div>
                    <div>
                      <label className="block text-xs font-black text-slate-700 uppercase mb-2">Pesan Anda</label>
                      <textarea required value={complaintContent} onChange={e => setComplaintContent(e.target.value)} rows="4" placeholder="Jelaskan pertanyaan atau masukan Anda..." className="w-full px-4 py-3.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none"></textarea>
                    </div>
                    <button type="submit" className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-xl text-sm shadow-md transition-all flex items-center justify-center gap-2">
                      <Icon name="send" size={18} /> Kirim Pengaduan & Mulai Sesi
                    </button>
                  </form>
                ) : (
                  <div className="bg-white rounded-3xl border-2 border-blue-400 shadow-lg shadow-blue-500/10 overflow-hidden flex flex-col h-[600px]">
                    <div className="bg-blue-50 p-4 sm:p-6 border-b border-blue-100 flex items-center justify-between shrink-0">
                      <div>
                        <h3 className="font-black text-blue-900 text-lg">{activeComplaint.title}</h3>
                        <p className="text-xs text-blue-700 font-bold mt-1 flex items-center gap-1.5"><Icon name="clock" size={14}/> Sesi Aktif: Tersisa {Math.max(0, Math.floor((activeComplaint.expiresAtMs - nowMs) / 60000))} Menit</p>
                      </div>
                      <div className="w-3 h-3 rounded-full bg-rose-500 animate-pulse border-2 border-rose-200" title="Live Chat Aktif"></div>
                    </div>
                    <div className="flex-1 p-4 sm:p-6 overflow-y-auto bg-slate-50 space-y-4">
                      {activeComplaint.messages && activeComplaint.messages.map((msg, i) => (
                        <div key={i} className={`flex flex-col ${msg.sender === 'Admin TU' ? 'items-start' : 'items-end'}`}>
                           <div className={`max-w-[85%] sm:max-w-[70%] p-4 rounded-2xl shadow-sm ${msg.sender === 'Admin TU' ? 'bg-white border border-slate-200 rounded-tl-sm' : 'bg-blue-600 text-white rounded-tr-sm'}`}>
                             <div className="flex items-center gap-2 mb-1.5 opacity-80">
                               <Icon name={msg.sender === 'Admin TU' ? 'shield-check' : 'user'} size={12} />
                               <span className="text-[10px] font-black uppercase">{msg.sender}</span>
                             </div>
                             <p className="text-sm font-medium leading-relaxed">{msg.text}</p>
                             {msg.imageUrl && (
                               <div className="mt-2">
                                 <img src={msg.imageUrl} alt="Lampiran" className="max-w-full h-auto rounded-lg shadow-sm border border-slate-200 cursor-pointer" onClick={() => setPreviewImage(msg.imageUrl)} />
                               </div>
                             )}
                           </div>
                           <span className="text-[10px] text-slate-400 font-bold mt-1.5">{msg.time || '-'}</span>
                        </div>
                      ))}
                    </div>
                    <div className="p-4 sm:p-6 bg-white border-t border-slate-100 shrink-0">
                      <div className="flex gap-2">
                        <input type="file" id={`file_${activeComplaint.id}`} className="hidden" accept="image/*" onChange={(e) => {
                          const file = e.target.files[0];
                          if(file) {
                            const reader = new FileReader();
                            reader.onload = (ev) => {
                              onReplyComplaint(activeComplaint.id, replyText[activeComplaint.id] || '(Mengirim Lampiran)', student.wali || 'Wali Murid', ev.target.result);
                              setReplyText({...replyText, [activeComplaint.id]: ''});
                            };
                            reader.readAsDataURL(file);
                          }
                        }} />
                        <button onClick={() => document.getElementById(`file_${activeComplaint.id}`).click()} className="px-4 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl shadow-sm transition-colors flex items-center justify-center">
                          <Icon name="paperclip" size={18} />
                        </button>
                        <input type="text" value={replyText[activeComplaint.id] || ''} onChange={(e) => setReplyText({...replyText, [activeComplaint.id]: e.target.value})} placeholder="Ketik balasan pesan..." className="flex-1 px-4 py-3.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-teal-500" onKeyDown={e => {
                          if(e.key === 'Enter') {
                            if(!replyText[activeComplaint.id]) return;
                            onReplyComplaint(activeComplaint.id, replyText[activeComplaint.id], student.wali || 'Wali Murid');
                            setReplyText({...replyText, [activeComplaint.id]: ''});
                          }
                        }}/>
                        <button onClick={() => {
                          if(!replyText[activeComplaint.id]) return;
                          onReplyComplaint(activeComplaint.id, replyText[activeComplaint.id], student.wali || 'Wali Murid');
                          setReplyText({...replyText, [activeComplaint.id]: ''});
                        }} className="px-6 bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-md transition-colors flex items-center justify-center">
                          <Icon name="send" size={18} />
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* History Pengaduan */}
                {expiredComplaints.length > 0 && (
                  <details className="group bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                    <summary className="p-6 cursor-pointer flex items-center justify-between select-none bg-slate-50/50 hover:bg-slate-50 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-slate-200 text-slate-600 rounded-xl flex items-center justify-center"><Icon name="archive" size={20}/></div>
                        <div>
                          <h3 className="font-black text-slate-800 text-lg">Riwayat Pengaduan (Selesai)</h3>
                          <p className="text-xs text-slate-500 font-medium">{expiredComplaints.length} sesi chat yang sudah ditutup/expired.</p>
                        </div>
                      </div>
                      <div className="w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-400 group-open:rotate-180 transition-transform">
                        <Icon name="chevron-down" size={16} />
                      </div>
                    </summary>
                    <div className="border-t border-slate-100 p-6 space-y-4 bg-slate-50/30">
                       {expiredComplaints.map(c => (
                         <div key={c.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm opacity-75 hover:opacity-100 transition-opacity">
                            <div className="flex justify-between items-start mb-3">
                              <h4 className="font-black text-slate-800 text-base">{c.title}</h4>
                              <span className="text-[10px] font-black text-slate-500 bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200 uppercase flex items-center gap-1"><Icon name="lock" size={12}/> Tertutup</span>
                            </div>
                            <div className="space-y-2 mb-4 max-h-40 overflow-y-auto border border-slate-100 rounded-xl p-3 bg-slate-50">
                               {c.messages && c.messages.map((m, idx) => (
                                 <p key={idx} className="text-xs font-medium text-slate-700">
                                   <span className="font-black text-slate-900 mr-1">{m.sender}:</span>{m.text}
                                 </p>
                               ))}
                            </div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase">Dibuat pada: {c.date} • Berakhir: {new Date(c.expiresAtMs || c.createdAtMs).toLocaleString('id-ID')}</p>
                         </div>
                       ))}
                    </div>
                  </details>
                )}
              </section>
            )}
            
            {/* TAB 5: PENGATURAN */}
            {activeTab === 'pengaturan' && (
              <section className="space-y-6 animate-in fade-in duration-300">
                <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 sm:p-8 max-w-2xl mx-auto">
                   <div className="text-center mb-8">
                     <div className="w-16 h-16 bg-slate-100 text-slate-600 rounded-2xl flex items-center justify-center mx-auto mb-4"><Icon name="settings" size={32}/></div>
                     <h3 className="text-2xl font-black text-slate-800">Pengaturan Akun Wali</h3>
                     <p className="text-sm text-slate-500 font-medium mt-1">Perbarui password login dan nomor WhatsApp yang dapat dihubungi oleh pihak sekolah.</p>
                   </div>
                   
                   <form onSubmit={handleSaveSettings} className="space-y-6">
                      <div className="space-y-2">
                        <label className="block text-xs font-black text-slate-700 uppercase tracking-wide">Nomor WhatsApp Baru</label>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400"><Icon name="phone" size={18} /></div>
                          <input id="settings-phone" name="phone" autoComplete="tel" type="text" value={newPhone} onChange={e => setNewPhone(e.target.value)} placeholder="Contoh: 08123456789" className="w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-300 rounded-2xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-teal-500" />
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <label className="block text-xs font-black text-slate-700 uppercase tracking-wide">Ganti Password (Opsional)</label>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400"><Icon name="lock" size={18} /></div>
                          <input id="settings-password" name="newPassword" autoComplete="new-password" type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="Kosongkan jika tidak ingin mengubah" className="w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-300 rounded-2xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-teal-500" />
                        </div>
                      </div>
                      
                      <div className="pt-4">
                        <button type="submit" className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-2xl shadow-md shadow-blue-500/25 transition-all flex items-center justify-center gap-2 text-sm">
                          <Icon name="save" size={18} /> Simpan Perubahan Akun
                        </button>
                      </div>
                   </form>
                </div>
              </section>
            )}

              </div>
            </main>
          </div>
        </div>
      );
    }

    // ==========================================
    // 3. DASHBOARD ADMINISTRATOR TU
    // ==========================================
    function DashboardView({ 
      students, 
      transactions, 
      announcements, 
      complaints,
      notes,
      settings = {},
      navigateTo, 
      onShowKuitansi,
      onMarkReadNotification,
      onRefresh,
      isRefreshing
    }) {
      const [showPivotModal, setShowPivotModal] = useState(null);
      const [showBellDropdown, setShowBellDropdown] = useState(false);

      const totalSiswa = students.length;
      
      const totalPemasukan = useMemo(() => {
        return transactions
          .filter(t => t.status === 'Lunas')
          .reduce((acc, curr) => acc + (curr.amount || 0), 0);
      }, [transactions]);

      const unreadComplaints = useMemo(() => complaints.filter(c => isComplaintPending(c)), [complaints]);
      const unreadTrx = useMemo(() => transactions.filter(t => !t.isRead), [transactions]);
      const totalUnreadCount = unreadComplaints.length + unreadTrx.length;

      const pemasukanPerKelas = useMemo(() => {
        const data = {};
        transactions.filter(t => t.status === 'Lunas').forEach(t => {
          if (!data[t.kelas]) data[t.kelas] = 0;
          data[t.kelas] += t.amount;
        });
        return Object.entries(data).map(([kelas, amount]) => ({ kelas, amount }));
      }, [transactions]);

      return (
        <div className="space-y-8 animate-in fade-in duration-300">
          
          {/* GREETING & WAVING MASCOT BANNER FOR ADMIN */}
          <GreetingMascotBanner 
            name={settings?.adminName || 'Admin TU'} 
            role="Administrator" 
            schoolName={settings?.schoolName} 
            academicYear={settings?.academicYear} 
          />

          <div className="bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-800 text-white p-7 sm:p-9 rounded-3xl shadow-lg shadow-blue-900/10 flex flex-wrap items-center justify-between gap-5">
            <div>
              <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">Panel Administrator TU</h2>
              <p className="text-sm sm:text-base text-blue-100 mt-1.5 font-medium">Kelola data siswa, pencatatan pembayaran manual, pengumuman, dan pengaduan.</p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => onRefresh(true)}
                title="Refresh Data Baru"
                className={`py-3 px-4 bg-white/15 hover:bg-white/25 active:scale-95 text-white rounded-2xl text-sm font-bold border border-white/20 transition-all flex items-center gap-2`}
              >
                <Icon name="refresh-cw" size={18} className={isRefreshing ? 'animate-spin text-emerald-300' : ''} />
                <span className="hidden sm:inline">Refresh Data</span>
              </button>

              <div className="relative">
                <button
                  onClick={() => setShowBellDropdown(!showBellDropdown)}
                  className="p-3 bg-white/15 hover:bg-white/25 rounded-2xl text-white relative transition-colors border border-white/20"
                >
                  <Icon name="bell" size={20} />
                  {totalUnreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-rose-500 text-white rounded-full text-[10px] font-extrabold flex items-center justify-center border-2 border-emerald-700 animate-pulse">
                      {totalUnreadCount}
                    </span>
                  )}
                </button>

                {showBellDropdown && (
                  <div className="absolute right-0 mt-3 w-80 sm:w-96 bg-white rounded-3xl shadow-2xl border border-slate-200 text-slate-800 p-4 z-50 space-y-3 animate-in slide-in-from-top-2">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                      <div className="flex items-center gap-2">
                        <h4 className="font-extrabold text-xs uppercase text-slate-700">Notifikasi Admin</h4>
                        {totalUnreadCount > 0 && (
                          <span className="px-2 py-0.5 bg-rose-100 text-rose-700 text-[10px] font-black rounded-full">
                            {totalUnreadCount} Baru
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {totalUnreadCount > 0 && (
                          <button
                            type="button"
                            onClick={() => {
                              complaints.forEach(c => onMarkReadNotification('complaint', c.id));
                              transactions.forEach(t => onMarkReadNotification('transaction', t.id));
                            }}
                            className="text-[10px] font-bold text-blue-600 hover:text-blue-800 hover:underline"
                          >
                            Tandai Dibaca
                          </button>
                        )}
                        <button onClick={() => setShowBellDropdown(false)} className="text-slate-400 hover:text-slate-600 text-xs font-bold">Tutup</button>
                      </div>
                    </div>

                    <div className="space-y-2 max-h-72 overflow-y-auto text-xs">
                      {complaints.length === 0 && transactions.length === 0 && (
                        <p className="text-slate-400 text-center py-4 font-medium">Belum ada aktivitas notifikasi.</p>
                      )}

                      {/* Pending Complaints */}
                      {complaints.filter(isComplaintPending).map(c => (
                        <div 
                          key={c.id} 
                          onClick={() => {
                            onMarkReadNotification('complaint', c.id);
                            setShowBellDropdown(false);
                            navigateTo('pengaduan');
                          }}
                          className="p-3 rounded-xl border cursor-pointer transition-all hover:scale-[0.99] bg-amber-50 border-amber-200 font-bold"
                        >
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-amber-900 font-extrabold truncate">Aduan Masuk: {c.title}</span>
                            <span className="px-1.5 py-0.5 bg-rose-500 text-white rounded text-[9px] font-black shrink-0">Perlu Balasan</span>
                          </div>
                          <p className="text-[11px] text-amber-800 truncate">{c.waliName || 'Wali'} ({c.studentName}) • {c.content}</p>
                        </div>
                      ))}

                      {/* Unread Transactions */}
                      {transactions.filter(t => !t.isRead).map(t => (
                        <div 
                          key={t.id} 
                          onClick={() => {
                            onMarkReadNotification('transaction', t.id);
                            setShowBellDropdown(false);
                            onShowKuitansi(t);
                          }}
                          className="p-3 rounded-xl border cursor-pointer transition-all hover:scale-[0.99] bg-emerald-50 border-emerald-200 font-bold"
                        >
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-emerald-900 font-extrabold truncate">Pembayaran SPP {t.month}</span>
                            <span className="px-1.5 py-0.5 bg-emerald-600 text-white rounded text-[9px] font-black shrink-0">Lunas</span>
                          </div>
                          <p className="text-[11px] text-emerald-800">{t.studentName} • {formatRupiah(t.amount)}</p>
                        </div>
                      ))}

                      {/* Other recent complaints if any */}
                      {complaints.filter(c => !isComplaintPending(c)).slice(0, 3).map(c => (
                        <div 
                          key={c.id} 
                          onClick={() => {
                            setShowBellDropdown(false);
                            navigateTo('pengaduan');
                          }}
                          className="p-2.5 rounded-xl border cursor-pointer transition-all bg-slate-50 border-slate-200 text-slate-600 opacity-80"
                        >
                          <div className="flex justify-between items-center mb-0.5">
                            <span className="font-bold text-slate-700 truncate">Aduan: {c.title}</span>
                            <span className="text-[10px] text-slate-400">Selesai</span>
                          </div>
                          <p className="text-[10px] text-slate-500">{c.waliName} ({c.studentName})</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <button 
                onClick={() => navigateTo('siswa')}
                className="py-3 px-5 bg-white text-blue-700 hover:bg-blue-50 rounded-2xl text-sm font-black transition-all shadow-md flex items-center gap-2"
              >
                <Icon name="user-plus" size={18} />
                Tambah Siswa
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <div 
              onClick={() => setShowPivotModal('siswa')}
              className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200 shadow-sm hover:shadow-md transition-all cursor-pointer flex items-center gap-5 group"
            >
              <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                <Icon name="users" size={32} />
              </div>
              <div>
                <p className="text-xs sm:text-sm font-extrabold text-slate-400 uppercase tracking-wider">Total Murid</p>
                <p className="text-2xl sm:text-3xl font-black text-slate-900 mt-1">{totalSiswa} Siswa</p>
              </div>
            </div>

            <div 
              onClick={() => setShowPivotModal('pemasukan')}
              className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200 shadow-sm hover:shadow-md transition-all cursor-pointer flex items-center gap-5 group"
              title="Klik untuk melihat transaksi pemasukan"
            >
              <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                <Icon name="wallet" size={32} />
              </div>
              <div>
                <p className="text-xs sm:text-sm font-extrabold text-slate-400 uppercase tracking-wider">Pemasukkan SPP</p>
                <p className="text-2xl sm:text-3xl font-black text-emerald-600 mt-1">{formatRupiah(totalPemasukan)}</p>
              </div>
            </div>

            <div 
              onClick={() => setShowPivotModal('transaksi')}
              className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200 shadow-sm hover:shadow-md transition-all cursor-pointer flex items-center gap-5 group"
              title="Klik untuk melihat transaksi"
            >
              <div className="w-16 h-16 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                <Icon name="credit-card" size={32} />
              </div>
              <div>
                <p className="text-xs sm:text-sm font-extrabold text-slate-400 uppercase tracking-wider">Jumlah Transaksi</p>
                <p className="text-2xl sm:text-3xl font-black text-slate-900 mt-1">{transactions.length} Transaksi</p>
              </div>
            </div>

            <div 
              onClick={() => navigateTo('pengaduan')}
              className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200 shadow-sm hover:shadow-md transition-all cursor-pointer flex items-center gap-5 group"
              title="Klik untuk melihat layanan pengaduan"
            >
              <div className="w-16 h-16 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                <Icon name="message-square" size={32} />
              </div>
              <div>
                <p className="text-xs sm:text-sm font-extrabold text-slate-400 uppercase tracking-wider">Pengaduan Pending</p>
                <p className="text-2xl sm:text-3xl font-black text-slate-900 mt-1">{complaints.filter(isComplaintPending).length} Pesan</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm">
            <h3 className="font-black text-slate-800 text-lg sm:text-xl mb-6 flex items-center gap-2.5">
              <Icon name="bar-chart-2" className="text-indigo-600" size={24} /> Grafik Pemasukan per Kelas
            </h3>
            <div className="flex items-end gap-2 sm:gap-4 h-52 sm:h-64 mt-4">
              {pemasukanPerKelas.map((item, idx) => {
                const maxAmount = Math.max(...pemasukanPerKelas.map(i => i.amount), 1);
                const heightPct = Math.max((item.amount / maxAmount) * 100, 5);
                return (
                  <div key={idx} className="flex-1 flex flex-col items-center gap-3 group">
                    <div className="w-full flex flex-col justify-end h-full relative">
                      <div className="absolute -top-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-800 text-white text-[10px] py-1 px-2 rounded-lg whitespace-nowrap z-10 pointer-events-none font-bold">
                        {formatRupiah(item.amount)}
                      </div>
                      <div 
                        className="w-full max-w-[64px] mx-auto bg-gradient-to-t from-blue-700 to-indigo-400 rounded-t-xl transition-all duration-700 ease-out group-hover:brightness-125 shadow-md shadow-indigo-200" 
                        style={{ height: `${heightPct}%` }}
                      ></div>
                    </div>
                    <span className="text-xs sm:text-sm font-extrabold text-slate-600 text-center truncate w-full">{item.kelas}</span>
                  </div>
                );
              })}
              {pemasukanPerKelas.length === 0 && (
                <div className="w-full h-full flex items-center justify-center text-slate-400 text-sm font-bold">Belum ada data pemasukan</div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-6 md:p-7 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-black text-slate-800 text-lg sm:text-xl">Riwayat Transaksi Terbaru</h3>
              <button onClick={() => navigateTo('transaksi')} className="text-sm font-extrabold text-emerald-700 hover:text-emerald-800">Lihat Semua &rarr;</button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-xs sm:text-sm font-extrabold text-slate-500 uppercase border-b border-slate-200 tracking-wider">
                    <th className="py-4 px-6">No Kuitansi</th>
                    <th className="py-4 px-6">Nama Siswa</th>
                    <th className="py-4 px-6">Kelas</th>
                    <th className="py-4 px-6">Bulan</th>
                    <th className="py-4 px-6">Nominal</th>
                    <th className="py-4 px-6">Metode</th>
                    <th className="py-4 px-6 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm font-medium">
                  {transactions.slice(0, 5).map((trx) => (
                    <tr key={trx.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-4 px-6 font-bold text-slate-800">{trx.kuitansiNo}</td>
                      <td className="py-4 px-6 font-bold text-slate-700">{trx.studentName}</td>
                      <td className="py-4 px-6 font-semibold">{trx.kelas}</td>
                      <td className="py-4 px-6 font-extrabold text-emerald-700">{trx.month}</td>
                      <td className="py-4 px-6 font-black text-slate-800">{formatRupiah(trx.amount)}</td>
                      <td className="py-4 px-6 font-medium">{trx.method}</td>
                      <td className="py-4 px-6 text-center">
                        <button
                          onClick={() => onShowKuitansi(trx)}
                          className="py-2 px-4 bg-blue-50 text-blue-700 hover:bg-blue-100 font-extrabold rounded-xl text-xs sm:text-sm border border-blue-200 transition-colors"
                        >
                          Kuitansi
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {showPivotModal && (
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-3xl max-w-4xl w-full p-6 sm:p-8 space-y-4 shadow-2xl animate-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div>
                    <h3 className="font-black text-slate-800 text-lg">
                      {showPivotModal === 'siswa' && 'Rincian Data Siswa Terdaftar'}
                      {(showPivotModal === 'pemasukan' || showPivotModal === 'transaksi') && 'Daftar Transaksi Pemasukan SPP'}
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {showPivotModal === 'siswa' && `Total ${students.length} siswa terdaftar di sistem`}
                      {(showPivotModal === 'pemasukan' || showPivotModal === 'transaksi') && `Total Akumulasi: ${formatRupiah(totalPemasukan)} • ${transactions.filter(t => t.status === 'Lunas').length} Transaksi Lunas`}
                    </p>
                  </div>
                  <button onClick={() => setShowPivotModal(null)} className="p-2 text-slate-400 hover:text-slate-600 font-black text-lg">✕</button>
                </div>

                <div className="flex-1 overflow-y-auto space-y-3 text-xs pr-1">
                  {showPivotModal === 'siswa' && (
                    <div className="space-y-2">
                      {students.map(s => (
                        <div key={s.id} className="p-3 bg-slate-50 rounded-xl flex justify-between items-center border border-slate-200">
                          <div>
                            <p className="font-bold text-slate-800">{s.name}</p>
                            <p className="text-[11px] text-slate-500">NIS: {s.nis} • Kelas: {s.kelas} • Wali: {s.wali || '-'} • WA: {s.telepon || '-'}</p>
                          </div>
                          <span className="font-extrabold text-emerald-700">{formatRupiah(s.tarif)}</span>
                        </div>
                      ))}
                      {students.length === 0 && (
                        <p className="text-center py-6 text-slate-400 font-medium">Belum ada murid terdaftar.</p>
                      )}
                    </div>
                  )}

                  {(showPivotModal === 'pemasukan' || showPivotModal === 'transaksi') && (
                    <div>
                      {transactions.length === 0 ? (
                        <div className="p-8 text-center text-slate-400">
                          <p className="font-bold">Belum ada transaksi pembayaran yang tercatat.</p>
                        </div>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full text-left border-collapse">
                            <thead>
                              <tr className="bg-slate-50 text-[11px] font-bold text-slate-500 uppercase border-b border-slate-200">
                                <th className="py-2.5 px-3">Tanggal</th>
                                <th className="py-2.5 px-3">No. Kuitansi</th>
                                <th className="py-2.5 px-3">Nama Siswa</th>
                                <th className="py-2.5 px-3">Kelas</th>
                                <th className="py-2.5 px-3">Bulan</th>
                                <th className="py-2.5 px-3">Nominal</th>
                                <th className="py-2.5 px-3">Metode</th>
                                <th className="py-2.5 px-3 text-center">Aksi</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {transactions.map(t => (
                                <tr key={t.id} className="hover:bg-slate-50/70">
                                  <td className="py-2.5 px-3 text-slate-600">{t.date}</td>
                                  <td className="py-2.5 px-3 font-mono font-bold text-blue-700">{t.kuitansiNo}</td>
                                  <td className="py-2.5 px-3 font-bold text-slate-800">{t.studentName}</td>
                                  <td className="py-2.5 px-3 text-slate-600">{t.kelas}</td>
                                  <td className="py-2.5 px-3 font-bold text-indigo-700">{t.month}</td>
                                  <td className="py-2.5 px-3 font-extrabold text-emerald-700">{formatRupiah(t.amount)}</td>
                                  <td className="py-2.5 px-3">
                                    <span className="px-2 py-0.5 rounded-full bg-slate-100 font-bold text-[10px] text-slate-600">{t.method}</span>
                                  </td>
                                  <td className="py-2.5 px-3 text-center">
                                    <button
                                      onClick={() => {
                                        setShowPivotModal(null);
                                        onShowKuitansi(t);
                                      }}
                                      className="px-2.5 py-1 bg-blue-50 text-blue-700 hover:bg-blue-100 font-bold rounded-lg text-xs"
                                    >
                                      Kuitansi
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

        </div>
      );
    }

    // ==========================================
    // 4. MANAJEMEN DATA MURID
    // ==========================================
    function SiswaListView({ students, settings, onAddStudent, onUpdateStudent, onDeleteStudent }) {
      const [showModal, setShowModal] = useState(false);
      const [editingStudent, setEditingStudent] = useState(null);
      const [isKeringanan, setIsKeringanan] = useState(false);
      const [waModalStudent, setWaModalStudent] = useState(null);
      const [waPhoneInput, setWaPhoneInput] = useState('');
      const [waSavePhone, setWaSavePhone] = useState(true);
      const [copiedWaMsg, setCopiedWaMsg] = useState(false);

      // State Naik / Pindah Kelas Siswa
      const [promotionStudent, setPromotionStudent] = useState(null);
      const [promotionForm, setPromotionForm] = useState({
        type: 'naik',
        targetClass: '',
        targetTarif: 0,
        academicYear: settings.academicYear || '2026/2027',
        note: '',
        keepExistingDiscount: true
      });

      const handleOpenPromotionModal = (student) => {
        setPromotionStudent(student);
        const currentClasses = settings.customClasses || [];
        const curIdx = currentClasses.findIndex(c => c.name === student.kelas);
        const nextCls = (curIdx !== -1 && curIdx + 1 < currentClasses.length)
          ? currentClasses[curIdx + 1]
          : currentClasses.find(c => c.name !== student.kelas) || currentClasses[0];

        const stdTarif = nextCls ? nextCls.tarif : (student.tarif || 0);
        const hasDiscount = Boolean(student.keringanan_note);

        setPromotionForm({
          type: 'naik',
          targetClass: nextCls ? nextCls.name : 'Kelas A',
          targetTarif: hasDiscount ? student.tarif : stdTarif,
          academicYear: settings.academicYear || '2026/2027',
          note: `Kenaikan dari ${student.kelas} ke ${nextCls ? nextCls.name : 'Kelas Baru'}`,
          keepExistingDiscount: hasDiscount
        });
      };

      const handlePromotionSubmit = (e) => {
        e.preventDefault();
        if (!promotionStudent) return;
        if (!promotionForm.targetClass) {
          alert('Silakan pilih kelas tujuan siswa!');
          return;
        }
        if (promotionForm.targetClass === promotionStudent.kelas) {
          alert('Kelas tujuan harus berbeda dengan kelas saat ini!');
          return;
        }

        const fromClass = promotionStudent.kelas;
        const toClass = promotionForm.targetClass;
        const newTarif = Number(promotionForm.targetTarif) || promotionStudent.tarif;
        const todayDate = new Date().toLocaleDateString('id-ID');

        const newRecord = {
          id: Date.now(),
          type: promotionForm.type === 'naik' ? 'Kenaikan Kelas' : 'Pindah / Mutasi Rombel',
          fromClass: fromClass,
          toClass: toClass,
          previousTarif: promotionStudent.tarif,
          newTarif: newTarif,
          academicYear: promotionForm.academicYear,
          note: promotionForm.note || (promotionForm.type === 'naik' ? `Kenaikan ke ${toClass}` : `Pindah ke ${toClass}`),
          date: todayDate
        };

        const updatedHistory = [...(promotionStudent.classHistory || []), newRecord];
        try {
          localStorage.setItem('spp_class_history_' + promotionStudent.id, JSON.stringify(updatedHistory));
          localStorage.setItem('spp_class_history_' + promotionStudent.nis, JSON.stringify(updatedHistory));
        } catch (err) {}

        onUpdateStudent(promotionStudent.id, {
          ...promotionStudent,
          kelas: toClass,
          tarif: newTarif,
          classHistory: updatedHistory
        });

        alert(
          `Sukses!\n\nAnanda ${promotionStudent.name} berhasil dipindahkan ke kelas "${toClass}".\n\n` +
          `Informasi: Seluruh riwayat transaksi & pembayaran SPP di kelas sebelumnya (${fromClass}) tetap tersimpan aman di sistem.`
        );

        setPromotionStudent(null);
      };

      const [formData, setFormData] = useState({
        nis: '',
        nipd: '',
        nisn: '',
        name: '',
        jk: 'L',
        tempatLahir: '',
        tanggalLahir: '',
        nik: '',
        agama: 'Islam',
        alamat: '',
        rt: '',
        rw: '',
        kelas: '',
        tarif: 0,
        wali: '',
        telepon: '',
        fotoUrl: '',
        password: '',
        statusAktif: true,
        keringanan_note: '',
        arrearsAmount: 0,
        arrearsNote: ''
      });

      const openModal = (student = null) => {
        if (student) {
          setEditingStudent(student);
          const matchCls = (settings.customClasses || []).find(c => c.name === student.kelas);
          const standardTarif = matchCls ? matchCls.tarif : (settings.tarifPlaygroup || 0);
          const hasDiscount = Boolean((student.keringanan_note && student.keringanan_note.trim().length > 0) || (student.tarif && student.tarif !== standardTarif));
          setIsKeringanan(hasDiscount);
          setFormData({
            ...student,
            nipd: student.nipd || student.nis || '',
            nisn: student.nisn || '',
            jk: student.jk || 'L',
            tempatLahir: student.tempatLahir || '',
            tanggalLahir: student.tanggalLahir || '',
            nik: student.nik || '',
            agama: student.agama || 'Islam',
            alamat: student.alamat || '',
            rt: student.rt || '',
            rw: student.rw || '',
            password: student.password || '',
            keringanan_note: student.keringanan_note || '',
            arrearsAmount: 0,
            arrearsNote: ''
          });
        } else {
          setEditingStudent(null);
          setIsKeringanan(false);
          const defaultKelas = (settings.customClasses || [])[0]?.name || '';
          const defaultTarif = (settings.customClasses || [])[0]?.tarif || settings.tarifPlaygroup || 0;
          setFormData({
            nis: '',
            nipd: '',
            nisn: '',
            name: '',
            jk: 'L',
            tempatLahir: '',
            tanggalLahir: '',
            nik: '',
            agama: 'Islam',
            alamat: '',
            rt: '',
            rw: '',
            kelas: defaultKelas,
            tarif: defaultTarif,
            wali: '',
            telepon: '',
            fotoUrl: '',
            password: '',
            statusAktif: true,
            keringanan_note: '',
            arrearsAmount: 0,
            arrearsNote: ''
          });
        }
        setShowModal(true);
      };

      const handleSubmit = (e) => {
        e.preventDefault();
        const payload = {
          ...formData,
          tarif: Number(formData.tarif) || 0,
          password: formData.password ? formData.password.trim() : (formData.nis ? formData.nis.toString().trim() : ''),
          keringanan_note: isKeringanan ? (formData.keringanan_note || 'Diringankan') : '',
          arrearsAmount: 0,
          arrearsNote: ''
        };
        if (editingStudent) {
          onUpdateStudent(editingStudent.id, payload);
        } else {
          onAddStudent(payload);
        }
        setShowModal(false);
      };

      const handlePhotoFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
          const reader = new FileReader();
          reader.onloadend = () => {
            setFormData(prev => ({ ...prev, fotoUrl: reader.result }));
          };
          reader.readAsDataURL(file);
        }
      };

      const getWaLink = (numStr) => {
        if (!numStr) return '#';
        let clean = numStr.replace(/[^0-9]/g, '');
        if (clean.startsWith('0')) clean = '62' + clean.slice(1);
        return `https://wa.me/${clean}`;
      };

      // Template pesan resmi WhatsApp untuk informasi akun login masing-masing murid
      const getLoginWaMessage = (student) => {
        if (!student) return '';
        const pwd = (student.password && student.password.toString().trim().length > 0) ? student.password.toString().trim() : student.nis;
        const loginUrl = window.location.origin;

        return (
          `*INFORMASI AKUN PORTAL SPP WALI MURID*\n` +
          `*${settings.schoolName || 'PAUD SETIA BHAKTI'}*\n` +
          `━━━━━━━━━━━━━━━━━━━━\n\n` +
          `Yth. Bapak/Ibu Wali dari Ananda *${student.name}*,\n\n` +
          `Berikut adalah data akun resmi untuk mengakses Portal SPP & Informasi Sekolah:\n\n` +
          `🌐 *Link Login Portal*: ${loginUrl}\n` +
          `👤 *Username (NIS)*: \`${student.nis}\`\n` +
          `🔑 *Password Akun*: \`${pwd}\`\n` +
          `🏫 *Kelas*: ${student.kelas}\n` +
          `💳 *Tarif SPP Resmi*: ${formatRupiah(student.tarif)}/bulan\n` +
          (student.keringanan_note ? `🏷️ *Keringanan*: ${student.keringanan_note}\n` : '') +
          `\n` +
          `📌 *Panduan Masuk Portal*:\n` +
          `1. Buka tautan portal di atas pada browser HP atau Komputer Anda.\n` +
          `2. Pilih peran *Wali Murid*.\n` +
          `3. Masukkan NIS dan Password yang tertera di atas.\n` +
          `4. Di dalam portal, Bapak/Ibu dapat memantau rincian tagihan SPP, berita kegiatan sekolah, catatan siswa dari TU/Guru, serta melakukan pembayaran langsung.\n\n` +
          `Apabila membutuhkan bantuan teknis login, silakan balas pesan WhatsApp ini.\n` +
          `Terima kasih atas perhatian dan kerja samanya. 🙏✨\n\n` +
          `Salam hormat,\n` +
          `*Tata Usaha ${settings.schoolName || 'PAUD SETIA BHAKTI'}*`
        );
      };

      const handleOpenWaModal = (student) => {
        setWaModalStudent(student);
        setWaPhoneInput(student.telepon || '');
        setWaSavePhone(true);
        setCopiedWaMsg(false);
      };

      const handleSendWaSubmit = () => {
        if (!waModalStudent) return;
        const phoneToUse = waPhoneInput.trim();
        if (!phoneToUse) {
          alert('Silakan masukkan nomor WhatsApp tujuan!');
          return;
        }

        let clean = phoneToUse.replace(/[^0-9]/g, '');
        if (clean.startsWith('0')) clean = '62' + clean.slice(1);

        if (clean.length < 9) {
          alert('Nomor WhatsApp tidak valid (minimal 9 digit)!');
          return;
        }

        // Jika dicentang dan nomor berubah atau sebelumnya kosong, update data murid
        if (waSavePhone && phoneToUse !== waModalStudent.telepon) {
          onUpdateStudent(waModalStudent.id, {
            ...waModalStudent,
            telepon: phoneToUse
          });
        }

        const msg = getLoginWaMessage(waModalStudent);
        const waUrl = `https://wa.me/${clean}?text=${encodeURIComponent(msg)}`;
        window.open(waUrl, '_blank');
        setWaModalStudent(null);
      };

      const handleCopyWaMessage = () => {
        if (!waModalStudent) return;
        const msg = getLoginWaMessage(waModalStudent);
        if (navigator.clipboard) {
          navigator.clipboard.writeText(msg).then(() => {
            setCopiedWaMsg(true);
            setTimeout(() => setCopiedWaMsg(false), 2500);
          });
        }
      };

      return (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 sm:p-7 rounded-3xl border border-slate-200 shadow-sm">
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight">Data Murid</h2>
              <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">Kelola data murid, link foto profil, no. WhatsApp wali murid, akun login, dan tarif SPP.</p>
            </div>
            <button
              onClick={() => openModal()}
              className="py-3 px-5 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-2xl text-xs sm:text-sm shadow-md shadow-blue-500/25 transition-all flex items-center gap-2 hover:scale-105 shrink-0"
            >
              <Icon name="user-plus" size={18} />
              <span>Tambah Murid Baru</span>
            </button>
          </div>

          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-xs sm:text-sm font-extrabold text-slate-500 uppercase border-b border-slate-200 tracking-wider">
                    <th className="py-4 px-6">Foto & Nama</th>
                    <th className="py-4 px-6">NIS</th>
                    <th className="py-4 px-6">Kelas</th>
                    <th className="py-4 px-6">Tarif SPP</th>
                    <th className="py-4 px-6">Wali & Informasi Login WA</th>
                    <th className="py-4 px-6">Status Siswa</th>
                    <th className="py-4 px-6 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm font-medium">
                  {students.map((s) => (
                    <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3.5">
                          <div className="w-11 h-11 rounded-2xl bg-teal-100 border border-teal-200 flex items-center justify-center font-black text-teal-800 text-sm overflow-hidden shrink-0 shadow-inner">
                            {s.fotoUrl ? (
                              <img src={s.fotoUrl} alt={s.name} className="w-full h-full object-cover" />
                            ) : (
                              s.name.charAt(0)
                            )}
                          </div>
                          <div>
                            <span className="font-black text-slate-800 text-sm sm:text-base block">{s.name}</span>
                            <span className="text-xs text-slate-400 font-semibold">{s.kelas}</span>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-6 font-black font-mono text-slate-800">{s.nis}</td>
                      <td className="py-4 px-6">
                        <span className="inline-flex items-center px-3 py-1 bg-blue-50 text-blue-700 rounded-xl border border-blue-200 font-extrabold text-xs sm:text-sm">
                          {s.kelas}
                        </span>
                        {s.classHistory && s.classHistory.length > 0 && (
                          <div className="text-[10px] text-indigo-700 font-bold mt-1.5 flex items-center gap-1 bg-indigo-50/90 px-2 py-0.5 rounded-lg border border-indigo-200 w-fit" title={`Riwayat: ${s.classHistory.map(h => `${h.fromClass} ➔ ${h.toClass}`).join(', ')}`}>
                            <Icon name="history" size={11} />
                            <span>{s.classHistory[s.classHistory.length - 1].fromClass} ➔ {s.kelas}</span>
                          </div>
                        )}
                      </td>
                      <td className="py-4 px-6">
                        <div className="font-black text-blue-700 text-sm sm:text-base">{formatRupiah(s.tarif)}</div>
                        {s.keringanan_note && (
                          <span className="inline-flex items-center gap-1 mt-1 px-2.5 py-0.5 bg-amber-100 text-amber-900 text-xs font-black rounded-lg border border-amber-200">
                            <Icon name="tag" size={12} /> {s.keringanan_note}
                          </span>
                        )}
                      </td>
                      <td className="py-4 px-6 text-slate-600">
                        <div className="flex flex-col gap-1.5 min-w-[200px]">
                          <div>
                            <p className="font-extrabold text-slate-800 text-sm">{s.wali || '-'}</p>
                            {s.telepon ? (
                              <a
                                href={getWaLink(s.telepon)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-emerald-700 transition-colors mt-0.5"
                                title="Chat WhatsApp langsung"
                              >
                                <Icon name="phone" size={13} className="text-emerald-600" />
                                <span>{s.telepon}</span>
                              </a>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md mt-0.5">
                                <Icon name="alert-circle" size={12} /> No. WA belum ada
                              </span>
                            )}
                          </div>

                          {/* TOMBOL CHAT WA LOGIN KHUSUS SISWA INI */}
                          <div>
                            <button
                              type="button"
                              onClick={() => handleOpenWaModal(s)}
                              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black transition-all shadow-sm ${
                                s.telepon
                                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20 active:scale-95 hover:scale-105'
                                  : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300'
                              }`}
                              title={`Kirim kredensial login (NIS: ${s.nis}) ke WhatsApp Wali`}
                            >
                              <Icon name="message-circle" size={14} className={s.telepon ? 'text-white' : 'text-emerald-700'} />
                              <span>Kirim Info Login</span>
                            </button>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <button
                          onClick={() => onUpdateStudent(s.id, { ...s, statusAktif: !s.statusAktif })}
                          className={`px-3 py-1.5 rounded-full text-xs font-black flex items-center gap-1.5 ${
                            s.statusAktif ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'
                          }`}
                        >
                          <span className={`w-2 h-2 rounded-full ${s.statusAktif ? 'bg-emerald-500' : 'bg-slate-400'}`}></span>
                          {s.statusAktif ? 'AKTIF' : 'NON-AKTIF'}
                        </button>
                      </td>
                      <td className="py-4 px-6 text-center space-x-1.5 whitespace-nowrap">
                        <button 
                          type="button"
                          onClick={() => handleOpenPromotionModal(s)} 
                          className="p-2.5 text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
                          title="Setting Naik / Pindah Kelas Siswa"
                        >
                          <Icon name="arrow-up-right" size={18} />
                        </button>
                        <button 
                          type="button"
                          onClick={() => handleOpenWaModal(s)} 
                          className="p-2.5 text-emerald-600 hover:bg-emerald-50 rounded-xl transition-colors"
                          title="Kirim Info Login Akun ke WA"
                        >
                          <Icon name="message-circle" size={18} />
                        </button>
                        <button 
                          type="button"
                          onClick={() => openModal(s)} 
                          className="p-2.5 text-blue-600 hover:bg-blue-50 rounded-xl transition-colors"
                          title="Edit Data Murid"
                        >
                          <Icon name="edit" size={18} />
                        </button>
                        <button 
                          type="button"
                          onClick={() => onDeleteStudent(s.id)} 
                          className="p-2.5 text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
                          title="Hapus Murid"
                        >
                          <Icon name="trash-2" size={18} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {showModal && (
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
              <div className="bg-white rounded-3xl max-w-3xl w-full my-auto shadow-2xl overflow-hidden flex flex-col max-h-[90vh] border border-slate-100 animate-in zoom-in-95 duration-200">
                {/* Modal Header */}
                <div className="px-6 py-5 border-b border-slate-100 bg-slate-50/80 backdrop-blur-md flex items-center justify-between sticky top-0 z-10">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-black text-lg shadow-md">
                      <Icon name={editingStudent ? "user-check" : "user-plus"} size={20} />
                    </div>
                    <div>
                      <h3 className="font-black text-slate-900 text-lg sm:text-xl">
                        {editingStudent ? `Edit Data Siswa: ${editingStudent.name}` : 'Tambah Murid Baru'}
                      </h3>
                      <p className="text-xs font-semibold text-slate-500">
                        Isi lengkap data diri siswa, kelas, tarif SPP, dan nomor WhatsApp wali murid
                      </p>
                    </div>
                  </div>
                  <button 
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="p-2.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-2xl transition-colors"
                  >
                    <Icon name="x" size={20} />
                  </button>
                </div>

                {/* Form Content */}
                <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6 text-xs">
                  {/* SECTION 1: DATA AKADEMIK & FOTO */}
                  <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-4">
                    <h4 className="font-black text-blue-900 uppercase tracking-wider text-xs flex items-center gap-2">
                      <Icon name="graduation-cap" size={16} className="text-blue-600" />
                      1. Data Akademik & Foto Profil Siswa
                    </h4>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block font-black text-slate-700 uppercase mb-1">NIS Siswa *</label>
                        <input
                          type="text"
                          required
                          placeholder="Nomor Induk Siswa"
                          value={formData.nis}
                          onChange={(e) => setFormData({ ...formData, nis: e.target.value, nipd: formData.nipd || e.target.value })}
                          className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl font-bold text-slate-900 focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block font-black text-slate-700 uppercase mb-1">NIPD</label>
                        <input
                          type="text"
                          placeholder="Nomor Induk Peserta Didik"
                          value={formData.nipd}
                          onChange={(e) => setFormData({ ...formData, nipd: e.target.value })}
                          className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl font-bold text-slate-900 focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block font-black text-slate-700 uppercase mb-1">NISN</label>
                        <input
                          type="text"
                          placeholder="NISN Nasional (10 Digit)"
                          value={formData.nisn}
                          onChange={(e) => setFormData({ ...formData, nisn: e.target.value })}
                          className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl font-bold text-slate-900 focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block font-black text-slate-700 uppercase mb-1">Nama Lengkap Siswa *</label>
                        <input
                          type="text"
                          required
                          placeholder="Nama Lengkap Siswa"
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl font-bold text-slate-900 focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block font-black text-slate-700 uppercase mb-1">Kelas / Rombel *</label>
                        <select
                          value={formData.kelas}
                          onChange={(e) => {
                            const k = e.target.value;
                            const matchCls = (settings.customClasses || []).find(c => c.name === k);
                            let t = matchCls ? matchCls.tarif : (settings.tarifPlaygroup || 0);
                            setFormData(prev => ({ ...prev, kelas: k, tarif: isKeringanan ? prev.tarif : t }));
                          }}
                          className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl font-black text-slate-900 focus:ring-2 focus:ring-blue-500"
                        >
                          {(settings.customClasses || []).map(cls => (
                            <option key={cls.name} value={cls.name}>{cls.name} (Tarif: {formatRupiah(cls.tarif)})</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block font-black text-slate-700 uppercase mb-1">Foto Profil Siswa</label>
                      <div className="flex flex-col sm:flex-row items-center gap-3">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handlePhotoFileChange}
                          className="w-full text-xs text-slate-500 file:py-2 file:px-4 file:rounded-xl file:border-0 file:bg-blue-100 file:text-blue-700 file:font-bold hover:file:bg-blue-200 cursor-pointer"
                        />
                        <span className="text-slate-400 font-bold">atau</span>
                        <input
                          type="text"
                          placeholder="URL Gambar Foto Siswa"
                          value={formData.fotoUrl}
                          onChange={(e) => setFormData({ ...formData, fotoUrl: e.target.value })}
                          className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl font-bold text-slate-900 focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                  </div>

                  {/* SECTION 2: DATA DIRI SISWA (LENGKAP SESUAI GAMBAR 1) */}
                  <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-4">
                    <h4 className="font-black text-indigo-900 uppercase tracking-wider text-xs flex items-center gap-2">
                      <Icon name="user" size={16} className="text-indigo-600" />
                      2. Data Diri & Demografi Siswa
                    </h4>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block font-black text-slate-700 uppercase mb-1">Jenis Kelamin (JK)</label>
                        <select
                          value={formData.jk || 'L'}
                          onChange={(e) => setFormData({ ...formData, jk: e.target.value })}
                          className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500"
                        >
                          <option value="L">L - Laki-laki</option>
                          <option value="P">P - Perempuan</option>
                        </select>
                      </div>

                      <div>
                        <label className="block font-black text-slate-700 uppercase mb-1">NIK Siswa / No. KTP</label>
                        <input
                          type="text"
                          placeholder="Nomor Induk Kependudukan (16 Digit)"
                          value={formData.nik || ''}
                          onChange={(e) => setFormData({ ...formData, nik: e.target.value })}
                          className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>

                      <div>
                        <label className="block font-black text-slate-700 uppercase mb-1">Agama</label>
                        <select
                          value={formData.agama || 'Islam'}
                          onChange={(e) => setFormData({ ...formData, agama: e.target.value })}
                          className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500"
                        >
                          <option value="Islam">Islam</option>
                          <option value="Kristen">Kristen</option>
                          <option value="Katolik">Katolik</option>
                          <option value="Hindu">Hindu</option>
                          <option value="Buddha">Buddha</option>
                          <option value="Konghucu">Konghucu</option>
                          <option value="Lainnya">Lainnya</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block font-black text-slate-700 uppercase mb-1">Tempat Lahir</label>
                        <input
                          type="text"
                          placeholder="Kota / Kabupaten Tempat Lahir"
                          value={formData.tempatLahir || ''}
                          onChange={(e) => setFormData({ ...formData, tempatLahir: e.target.value })}
                          className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>

                      <div>
                        <label className="block font-black text-slate-700 uppercase mb-1">Tanggal Lahir</label>
                        <input
                          type="date"
                          value={formData.tanggalLahir || ''}
                          onChange={(e) => setFormData({ ...formData, tanggalLahir: e.target.value })}
                          className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div className="md:col-span-2">
                        <label className="block font-black text-slate-700 uppercase mb-1">Alamat Tempat Tinggal</label>
                        <input
                          type="text"
                          placeholder="Dusun / Jalan / Perumahan"
                          value={formData.alamat || ''}
                          onChange={(e) => setFormData({ ...formData, alamat: e.target.value })}
                          className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                      <div>
                        <label className="block font-black text-slate-700 uppercase mb-1">RT</label>
                        <input
                          type="text"
                          placeholder="Contoh: 05"
                          value={formData.rt || ''}
                          onChange={(e) => setFormData({ ...formData, rt: e.target.value })}
                          className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                      <div>
                        <label className="block font-black text-slate-700 uppercase mb-1">RW</label>
                        <input
                          type="text"
                          placeholder="Contoh: 02"
                          value={formData.rw || ''}
                          onChange={(e) => setFormData({ ...formData, rw: e.target.value })}
                          className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                    </div>
                  </div>

                  {/* SECTION 3: PENGATURAN TARIF & KERINGANAN SPP */}
                  {(() => {
                    const matchCls = (settings.customClasses || []).find(c => c.name === formData.kelas);
                    const standardTarif = matchCls ? matchCls.tarif : (settings.tarifPlaygroup || 0);
                    return (
                      <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-black text-amber-950 uppercase tracking-wider text-xs flex items-center gap-2">
                              <Icon name="badge-percent" size={16} className="text-amber-600" />
                              3. Pengaturan Tarif SPP & Keringanan
                            </h4>
                            <p className="text-[11px] text-slate-500 font-semibold mt-0.5">Tarif standar {formData.kelas}: <strong className="text-slate-800">{formatRupiah(standardTarif)}/bln</strong></p>
                          </div>
                          <label className="inline-flex items-center gap-2 cursor-pointer select-none px-3.5 py-2 bg-white border border-amber-300 rounded-xl shadow-xs hover:border-amber-400 transition-colors">
                            <input
                              type="checkbox"
                              checked={isKeringanan}
                              onChange={(e) => {
                                const checked = e.target.checked;
                                setIsKeringanan(checked);
                                if (!checked) {
                                  setFormData(prev => ({ ...prev, tarif: standardTarif, keringanan_note: '' }));
                                }
                              }}
                              className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500"
                            />
                            <span className="text-xs font-black text-amber-900">Diberikan Keringanan</span>
                          </label>
                        </div>

                        {isKeringanan ? (
                          <div className="space-y-3 p-4 bg-amber-50/90 border border-amber-200 rounded-xl animate-in fade-in">
                            <div>
                              <label className="block font-black text-amber-950 uppercase text-[10px] mb-1">
                                Tarif SPP Setelah Keringanan (Rp / Bulan)
                              </label>
                              <div className="relative">
                                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none font-black text-amber-700">Rp</span>
                                <input
                                  type="number"
                                  required
                                  value={formData.tarif}
                                  onChange={(e) => setFormData({ ...formData, tarif: Number(e.target.value) })}
                                  placeholder="Contoh: 250000"
                                  className="w-full pl-11 pr-4 py-2 bg-white border border-amber-300 rounded-xl font-black text-amber-900 focus:ring-2 focus:ring-amber-500"
                                />
                              </div>
                            </div>

                            <div>
                              <label className="block font-black text-amber-950 uppercase text-[10px] mb-1">
                                Alasan / Kategori Keringanan
                              </label>
                              <input
                                type="text"
                                placeholder="Contoh: Yatim, Beasiswa, Anak Guru, Kurang Mampu"
                                value={formData.keringanan_note || ''}
                                onChange={(e) => setFormData({ ...formData, keringanan_note: e.target.value })}
                                className="w-full px-3.5 py-2 bg-white border border-amber-300 rounded-xl font-bold text-slate-800 focus:ring-2 focus:ring-amber-500"
                              />
                              <div className="flex flex-wrap gap-1.5 mt-2">
                                {['Yatim', 'Piatu', 'Yatim Piatu', 'Beasiswa', 'Anak Guru', 'Kurang Mampu'].map(chip => (
                                  <button
                                    key={chip}
                                    type="button"
                                    onClick={() => setFormData({ ...formData, keringanan_note: chip })}
                                    className="px-2.5 py-1 bg-white hover:bg-amber-100 text-amber-800 text-[10px] font-bold rounded-lg border border-amber-300 transition-colors shadow-2xs"
                                  >
                                    + {chip}
                                  </button>
                                ))}
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div>
                            <div className="relative">
                              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none font-extrabold text-slate-500">Rp</span>
                              <input
                                type="number"
                                required
                                value={formData.tarif}
                                onChange={(e) => setFormData({ ...formData, tarif: Number(e.target.value) })}
                                className="w-full pl-11 pr-4 py-2.5 bg-white border border-slate-300 rounded-xl font-bold text-slate-900"
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  {/* SECTION 4: DATA WALI & KREDENSIAL */}
                  <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-4">
                    <h4 className="font-black text-emerald-900 uppercase tracking-wider text-xs flex items-center gap-2">
                      <Icon name="phone-call" size={16} className="text-emerald-600" />
                      4. Data Orang Tua / Wali Murid & Login WA
                    </h4>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block font-black text-slate-700 uppercase mb-1">Nama Wali Murid</label>
                        <input
                          type="text"
                          placeholder="Nama Ayah / Ibu / Wali"
                          value={formData.wali}
                          onChange={(e) => setFormData({ ...formData, wali: e.target.value })}
                          className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500"
                        />
                      </div>

                      <div>
                        <label className="block font-black text-slate-700 uppercase mb-1">No. WhatsApp Wali Murid</label>
                        <input
                          type="text"
                          placeholder="Contoh: 081234567890"
                          value={formData.telepon}
                          onChange={(e) => setFormData({ ...formData, telepon: e.target.value })}
                          className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block font-black text-slate-700 uppercase mb-1">Password Login Wali Murid</label>
                      <input
                        type="text"
                        placeholder="Kosongkan jika ingin default sama dengan NIS"
                        value={formData.password || ''}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500"
                      />
                      <p className="text-[10px] text-slate-500 mt-1 font-medium">* Default password sama dengan nomor NIS siswa jika dikosongkan.</p>
                    </div>
                  </div>

                  {/* Modal Sticky Footer Actions */}
                  <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
                    <button 
                      type="button" 
                      onClick={() => setShowModal(false)} 
                      className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 font-bold rounded-xl text-slate-600 transition-colors"
                    >
                      Batal
                    </button>
                    <button 
                      type="submit" 
                      className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-extrabold rounded-xl shadow-lg shadow-emerald-600/20 transition-all flex items-center gap-2"
                    >
                      <Icon name="check" size={16} />
                      <span>Simpan Data Siswa</span>
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* MODAL KIRIM INFORMASI AKUN LOGIN KE WHATSAPP */}
          {waModalStudent && (
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in">
              <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 space-y-5 shadow-2xl animate-in zoom-in-95 duration-200 max-h-[92vh] flex flex-col border border-slate-200">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 bg-emerald-100 text-emerald-700 rounded-2xl flex items-center justify-center shadow-inner">
                      <Icon name="message-circle" size={24} />
                    </div>
                    <div>
                      <h3 className="font-black text-slate-800 text-lg sm:text-xl">Kirim Info Login ke WA</h3>
                      <p className="text-xs text-slate-500 font-semibold">Kirimkan NIS & Password portal SPP ke Wali Murid</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setWaModalStudent(null)} 
                    className="p-2 text-slate-400 hover:text-slate-600 font-black rounded-xl hover:bg-slate-100 transition-colors"
                  >
                    <Icon name="x" size={20} />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto space-y-4 text-xs pr-1">
                  {/* Student Mini Card */}
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex items-center gap-3.5">
                    <div className="w-12 h-12 rounded-xl bg-teal-100 border border-teal-200 flex items-center justify-center font-black text-teal-800 text-base shrink-0 overflow-hidden shadow-inner">
                      {waModalStudent.fotoUrl ? (
                        <img src={waModalStudent.fotoUrl} alt={waModalStudent.name} className="w-full h-full object-cover" />
                      ) : (
                        waModalStudent.name.charAt(0)
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4 className="font-black text-slate-900 text-sm truncate">{waModalStudent.name}</h4>
                      <div className="flex flex-wrap items-center gap-2 mt-1 text-slate-600 font-bold text-xs">
                        <span className="bg-white px-2 py-0.5 rounded-md border border-slate-200">Kelas: {waModalStudent.kelas}</span>
                        <span className="bg-white px-2 py-0.5 rounded-md border border-slate-200 font-mono text-blue-700">NIS: {waModalStudent.nis}</span>
                        <span className="bg-white px-2 py-0.5 rounded-md border border-slate-200 font-mono text-indigo-700">Pass: {waModalStudent.password || waModalStudent.nis}</span>
                      </div>
                    </div>
                  </div>

                  {/* WhatsApp Target Phone Input */}
                  <div>
                    <label className="block font-black text-slate-700 uppercase tracking-wider text-[11px] mb-1.5">
                      Nomor WhatsApp Tujuan (Wali Murid)
                    </label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-emerald-600 font-black">
                        <Icon name="phone" size={16} />
                      </span>
                      <input
                        type="text"
                        required
                        placeholder="Contoh: 081234567890 atau 6281234567890"
                        value={waPhoneInput}
                        onChange={(e) => setWaPhoneInput(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl font-black text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-500 text-sm"
                      />
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      <label className="inline-flex items-center gap-2 cursor-pointer select-none text-slate-700 font-bold text-xs">
                        <input
                          type="checkbox"
                          checked={waSavePhone}
                          onChange={(e) => setWaSavePhone(e.target.checked)}
                          className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500"
                        />
                        <span>Simpan nomor ini ke database murid jika baru/diubah</span>
                      </label>
                    </div>
                  </div>

                  {/* Message Preview */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="font-black text-slate-700 uppercase tracking-wider text-[11px]">
                        Preview Pesan WhatsApp
                      </label>
                      <button
                        type="button"
                        onClick={handleCopyWaMessage}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg text-xs transition-colors"
                      >
                        <Icon name={copiedWaMsg ? "check" : "copy"} size={13} className={copiedWaMsg ? "text-emerald-600" : ""} />
                        <span>{copiedWaMsg ? "Tersalin!" : "Salin Pesan"}</span>
                      </button>
                    </div>
                    <div className="p-3.5 bg-slate-900 text-slate-100 font-mono text-[11px] rounded-2xl max-h-52 overflow-y-auto whitespace-pre-wrap leading-relaxed border border-slate-800 shadow-inner">
                      {getLoginWaMessage(waModalStudent)}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setWaModalStudent(null)}
                    className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold rounded-2xl text-sm transition-colors"
                  >
                    Tutup
                  </button>
                  <button
                    type="button"
                    onClick={handleSendWaSubmit}
                    className="flex-1 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-black rounded-2xl text-sm shadow-md shadow-emerald-500/25 transition-all flex items-center justify-center gap-2 hover:scale-[1.02]"
                  >
                    <Icon name="send" size={17} />
                    <span>Buka WhatsApp Sekarang</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* MODAL PENGATURAN NAIK / PINDAH KELAS SISWA */}
          {promotionStudent && (
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in">
              <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 space-y-5 shadow-2xl animate-in zoom-in-95 duration-200 max-h-[92vh] flex flex-col border border-slate-200">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 bg-indigo-100 text-indigo-700 rounded-2xl flex items-center justify-center shadow-inner">
                      <Icon name="arrow-up-right" size={24} />
                    </div>
                    <div>
                      <h3 className="font-black text-slate-800 text-lg sm:text-xl">Naik / Pindah Kelas</h3>
                      <p className="text-xs text-slate-500 font-semibold">Pengaturan kenaikan kelas atau mutasi rombel murid</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setPromotionStudent(null)} 
                    className="p-2 text-slate-400 hover:text-slate-600 font-black rounded-xl hover:bg-slate-100 transition-colors"
                  >
                    <Icon name="x" size={20} />
                  </button>
                </div>

                <form onSubmit={handlePromotionSubmit} className="flex-1 overflow-y-auto space-y-4 text-xs pr-1">
                  {/* Current Student Profile Box */}
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex items-center gap-3.5">
                    <div className="w-12 h-12 rounded-xl bg-blue-100 border border-blue-200 flex items-center justify-center font-black text-blue-800 text-base shrink-0 overflow-hidden shadow-inner">
                      {promotionStudent.fotoUrl ? (
                        <img src={promotionStudent.fotoUrl} alt={promotionStudent.name} className="w-full h-full object-cover" />
                      ) : (
                        promotionStudent.name.charAt(0)
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4 className="font-black text-slate-900 text-sm truncate">{promotionStudent.name}</h4>
                      <div className="flex flex-wrap items-center gap-2 mt-1 text-slate-600 font-bold text-xs">
                        <span className="bg-white px-2 py-0.5 rounded-md border border-slate-200 font-mono text-blue-700">NIS: {promotionStudent.nis}</span>
                        <span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded-md font-extrabold">Kelas Saat Ini: {promotionStudent.kelas}</span>
                        <span className="bg-white px-2 py-0.5 rounded-md border border-slate-200 font-mono text-slate-700">Tarif: {formatRupiah(promotionStudent.tarif)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Tipe Perpindahan */}
                  <div>
                    <label className="block font-black text-slate-700 uppercase tracking-wider text-[11px] mb-1.5">
                      Jenis Perubahan Kelas
                    </label>
                    <div className="grid grid-cols-2 gap-2.5">
                      <button
                        type="button"
                        onClick={() => setPromotionForm(prev => ({ ...prev, type: 'naik' }))}
                        className={`p-3 rounded-2xl border font-bold flex items-center gap-2 transition-all ${
                          promotionForm.type === 'naik'
                            ? 'bg-blue-50 border-blue-400 text-blue-800 shadow-xs ring-2 ring-blue-500/20'
                            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        <Icon name="arrow-up-circle" size={17} className={promotionForm.type === 'naik' ? 'text-blue-600' : 'text-slate-400'} />
                        <div className="text-left">
                          <p className="text-xs font-black">Naik Kelas</p>
                          <p className="text-[10px] text-slate-500 font-normal">Tahun Ajaran Baru</p>
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => setPromotionForm(prev => ({ ...prev, type: 'pindah' }))}
                        className={`p-3 rounded-2xl border font-bold flex items-center gap-2 transition-all ${
                          promotionForm.type === 'pindah'
                            ? 'bg-indigo-50 border-indigo-400 text-indigo-800 shadow-xs ring-2 ring-indigo-500/20'
                            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        <Icon name="shuffle" size={17} className={promotionForm.type === 'pindah' ? 'text-indigo-600' : 'text-slate-400'} />
                        <div className="text-left">
                          <p className="text-xs font-black">Pindah Rombel</p>
                          <p className="text-[10px] text-slate-500 font-normal">Mutasi Rombongan Belajar</p>
                        </div>
                      </button>
                    </div>
                  </div>

                  {/* Destination Class Selector */}
                  <div>
                    <label className="block font-black text-slate-700 uppercase tracking-wider text-[11px] mb-1.5">
                      Pindah / Naik ke Kelas Tujuan
                    </label>
                    <select
                      required
                      value={promotionForm.targetClass}
                      onChange={(e) => {
                        const target = e.target.value;
                        const matchCls = (settings.customClasses || []).find(c => c.name === target);
                        const stdTarif = matchCls ? matchCls.tarif : (settings.tarifPlaygroup || 0);
                        setPromotionForm(prev => ({
                          ...prev,
                          targetClass: target,
                          targetTarif: prev.keepExistingDiscount ? prev.targetTarif : stdTarif,
                          note: `Kenaikan dari ${promotionStudent.kelas} ke ${target}`
                        }));
                      }}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl font-black text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500 text-sm"
                    >
                      <option value="">-- Pilih Kelas Tujuan --</option>
                      {(settings.customClasses || []).map(c => (
                        <option key={c.name} value={c.name} disabled={c.name === promotionStudent.kelas}>
                          {c.name} {c.name === promotionStudent.kelas ? '(Kelas Saat Ini)' : `(Tarif: ${formatRupiah(c.tarif)}/bln)`}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* New SPP Tariff */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="font-black text-slate-700 uppercase tracking-wider text-[11px]">
                        Tarif SPP di Kelas Baru (Rp / Bulan)
                      </label>
                      {promotionStudent.keringanan_note && (
                        <span className="text-[10px] text-amber-700 font-bold bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                          Status: {promotionStudent.keringanan_note}
                        </span>
                      )}
                    </div>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500 font-black">
                        Rp
                      </span>
                      <input
                        type="number"
                        required
                        value={promotionForm.targetTarif}
                        onChange={(e) => setPromotionForm(prev => ({ ...prev, targetTarif: Number(e.target.value) }))}
                        className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl font-black text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500 text-sm"
                      />
                    </div>
                    <p className="text-[10px] text-slate-500 mt-1 font-medium">
                      * Nominal tarif dapat disesuaikan otomatis atau diberikan keringanan khusus untuk murid ini.
                    </p>
                  </div>

                  {/* Academic Year & Note */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-black text-slate-700 uppercase tracking-wider text-[11px] mb-1.5">
                        Tahun Ajaran Efektif
                      </label>
                      <input
                        type="text"
                        value={promotionForm.academicYear}
                        onChange={(e) => setPromotionForm(prev => ({ ...prev, academicYear: e.target.value }))}
                        placeholder="Contoh: 2026/2027"
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block font-black text-slate-700 uppercase tracking-wider text-[11px] mb-1.5">
                        Catatan Kenaikan
                      </label>
                      <input
                        type="text"
                        value={promotionForm.note}
                        onChange={(e) => setPromotionForm(prev => ({ ...prev, note: e.target.value }))}
                        placeholder="Contoh: Lulus PG ke Kelas A"
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  {/* Preservation Guarantee Box */}
                  <div className="p-4 bg-emerald-50/90 border border-emerald-200 rounded-2xl flex items-start gap-3 text-xs text-emerald-950">
                    <Icon name="shield-check" size={20} className="text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-black text-emerald-950 text-xs">Riwayat Pembayaran di Kelas Sebelumnya Tetap Aman</p>
                      <p className="text-[11px] text-emerald-800 mt-0.5 leading-relaxed">
                        Seluruh kuitansi, pembayaran SPP lunas, dan transaksi saat siswa berada di kelas <strong>{promotionStudent.kelas}</strong> tidak akan hilang/terhapus. Riwayat tersebut tetap tersimpan dan dapat dilihat kapan saja dengan label kelas asalnya.
                      </p>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-3 pt-3 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setPromotionStudent(null)}
                      className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold rounded-2xl text-sm transition-colors"
                    >
                      Batal
                    </button>
                    <button
                      type="submit"
                      className="flex-1 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-black rounded-2xl text-sm shadow-md shadow-blue-500/25 transition-all flex items-center justify-center gap-2 hover:scale-[1.02]"
                    >
                      <Icon name="check-circle" size={17} />
                      <span>Simpan Kenaikan Kelas</span>
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      );
    }

    // ==========================================
    // 5. MANAJEMEN PENGUMUMAN (WITH PREVIEW FOTO ADMIN)
    // ==========================================
    function AdminPengumumanView({ announcements, onAddAnnouncement, onUpdateAnnouncement, onDeleteAnnouncement }) {
      const [showModal, setShowModal] = useState(false);
      const [editingAnn, setEditingAnn] = useState(null);
      const [previewImage, setPreviewImage] = useState(null);
      const [formData, setFormData] = useState({
        title: '',
        content: '',
        imageUrl: '',
        date: new Date().toLocaleDateString('id-ID')
      });

      const openModal = (ann = null) => {
        if (ann) {
          setEditingAnn(ann);
          setFormData({ ...ann });
        } else {
          setEditingAnn(null);
          setFormData({
            title: '',
            content: '',
            imageUrl: '',
            date: new Date().toLocaleDateString('id-ID')
          });
        }
        setShowModal(true);
      };

      const handleSubmit = async (e) => {
        e.preventDefault();
        if (editingAnn) {
          await onUpdateAnnouncement(editingAnn.id, formData);
        } else {
          await onAddAnnouncement(formData);
        }
        setShowModal(false);
      };

      const handleImageFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
          const reader = new FileReader();
          reader.onloadend = () => {
            setFormData(prev => ({ ...prev, imageUrl: reader.result }));
          };
          reader.readAsDataURL(file);
        }
      };

      return (
        <div className="space-y-6">
          {previewImage && (
            <ImagePreviewModal
              imageUrl={previewImage.url}
              title={previewImage.title}
              onClose={() => setPreviewImage(null)}
            />
          )}

          <div className="flex justify-between items-center bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
            <div>
              <h2 className="text-xl font-extrabold text-slate-800">Pengumuman & Berita Sekolah</h2>
              <p className="text-xs text-slate-500 mt-1">Kelola berita resmi dan pengumuman kegiatan sekolah yang tampil di portal wali murid.</p>
            </div>
            <button
              onClick={() => openModal()}
              className="py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs shadow-md shadow-blue-500/25 transition-all flex items-center gap-2"
            >
              <Icon name="plus-circle" size={16} />
              <span>Tambah Berita / Pengumuman</span>
            </button>
          </div>

          {(!announcements || announcements.length === 0) ? (
            <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 text-slate-400 font-medium">
              Belum ada berita pengumuman yang dibuat. Klik tombol di atas untuk membuat berita baru.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {announcements.map((ann) => (
                <div key={ann.id} className="bg-white rounded-3xl border border-slate-200/90 shadow-sm hover:shadow-lg transition-all flex flex-col overflow-hidden h-full">
                  {ann.imageUrl ? (
                    <div 
                      onClick={() => setPreviewImage({ url: ann.imageUrl, title: ann.title })}
                      className="relative group cursor-pointer overflow-hidden h-44 w-full bg-slate-100 shrink-0"
                    >
                      <img src={ann.imageUrl} alt={ann.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                      <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 text-white font-black text-xs">
                        <Icon name="maximize-2" size={16} />
                        <span>Preview Foto</span>
                      </div>
                    </div>
                  ) : (
                    <div className="h-44 w-full bg-gradient-to-br from-blue-600 via-indigo-600 to-sky-500 p-5 flex flex-col justify-between text-white shrink-0 relative overflow-hidden">
                      <div className="flex items-center justify-between">
                        <span className="px-2.5 py-1 bg-white/20 backdrop-blur-md rounded-lg text-[10px] font-black uppercase tracking-wider">
                          Pengumuman Resmi
                        </span>
                        <Icon name="megaphone" size={20} className="text-blue-100" />
                      </div>
                      <h4 className="font-black text-sm text-white line-clamp-2 leading-snug drop-shadow-sm">
                        {ann.title}
                      </h4>
                    </div>
                  )}

                  <div className="p-5 flex-1 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-2 text-xs">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-blue-50 text-blue-700 font-bold rounded-lg text-[11px] border border-blue-100">
                          <Icon name="calendar" size={12} />
                          {ann.date}
                        </span>
                      </div>

                      <h3 className="font-black text-slate-800 text-base mb-2 line-clamp-2 leading-tight">
                        {ann.title}
                      </h3>
                      <p className="text-xs text-slate-600 font-medium leading-relaxed line-clamp-3 whitespace-pre-line">
                        {ann.content}
                      </p>
                    </div>

                    <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-end gap-2">
                      {ann.imageUrl && (
                        <button
                          type="button"
                          onClick={() => setPreviewImage({ url: ann.imageUrl, title: ann.title })}
                          className="py-1.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs flex items-center gap-1.5 transition-colors"
                          title="Preview foto"
                        >
                          <Icon name="image" size={14} />
                          <span>Foto</span>
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => openModal(ann)}
                        className="py-1.5 px-3 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold rounded-xl text-xs flex items-center gap-1.5 transition-colors border border-blue-200"
                        title="Edit pengumuman"
                      >
                        <Icon name="edit" size={14} />
                        <span>Edit</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => onDeleteAnnouncement(ann.id)}
                        className="py-1.5 px-3 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold rounded-xl text-xs flex items-center gap-1.5 transition-colors border border-rose-200"
                        title="Hapus pengumuman"
                      >
                        <Icon name="trash-2" size={14} />
                        <span>Hapus</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {showModal && (
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
                <h3 className="font-extrabold text-slate-800 text-base">{editingAnn ? 'Edit Berita Pengumuman' : 'Tambah Berita / Pengumuman Baru'}</h3>
                
                <form onSubmit={handleSubmit} className="space-y-3 text-xs">
                  <div>
                    <label className="block font-bold text-slate-700 uppercase mb-1">Judul Pengumuman</label>
                    <input
                      type="text"
                      required
                      placeholder="Contoh: Jadwal Libur & Kegiatan Pentas Seni"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 uppercase mb-1">Isi Berita / Pengumuman</label>
                    <textarea
                      required
                      rows="5"
                      placeholder="Tuliskan isi detail pengumuman..."
                      value={formData.content}
                      onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-900"
                    ></textarea>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 uppercase mb-1">Upload / Link Foto Gambar Berita</label>
                    <div className="space-y-2">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageFileChange}
                        className="w-full text-xs text-slate-500 file:py-2 file:px-4 file:rounded-xl file:border-0 file:bg-emerald-50 file:text-emerald-700 file:font-bold hover:file:bg-emerald-100"
                      />
                      <input
                        type="text"
                        placeholder="Atau tempelkan URL Gambar Foto Pengumuman"
                        value={formData.imageUrl}
                        onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-900"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 uppercase mb-1">Tanggal Terbit</label>
                    <input
                      type="text"
                      value={formData.date}
                      onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-900"
                    />
                  </div>

                  <div className="flex gap-2 pt-2">
                    <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-2.5 bg-slate-100 font-bold rounded-xl text-slate-600">Batal</button>
                    <button type="submit" className="flex-1 py-2.5 bg-emerald-600 text-white font-bold rounded-xl">Simpan Berita</button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      );
    }

    // ==========================================
    // 6. CATAT PEMBAYARAN MANUAL
    // ==========================================
    function LaporanView({ students, transactions, settings }) {
      const [filterType, setFilterType] = useState('all');
      const [filterClass, setFilterClass] = useState('Playgroup');
      const [filterStudent, setFilterStudent] = useState('');
      const [filterSemester, setFilterSemester] = useState('all'); // 'all', '1', '2'
      const [viewMode, setViewMode] = useState('all'); // 'all', 'rekap', 'transaksi'

      // Daftar periode pembayaran SPP yang tersedia dari pengaturan
      const periodsList = useMemo(() => {
        let list = [];
        if (Array.isArray(settings?.academicPeriods) && settings.academicPeriods.length > 0) {
          list = settings.academicPeriods.map((p, idx) => ({
            ...p,
            id: String(p.id || `period-${idx}`)
          }));
        }

        const sStartM = settings?.startMonth || 'Juli';
        const sStartY = parseInt(settings?.startYear) || 2026;
        const sEndM = settings?.endMonth || 'Juni';
        const sEndY = parseInt(settings?.endYear) || 2027;

        // Jika belum ada di list, masukkan periode aktif default dari settings
        if (list.length === 0) {
          list.push({
            id: 'active-default',
            name: `Periode ${sStartM} ${sStartY} - ${sEndM} ${sEndY}`,
            startMonth: sStartM,
            startYear: sStartY,
            endMonth: sEndM,
            endYear: sEndY,
            semester: settings?.semester || 'Semua',
            isActive: true
          });
        } else {
          // Pastikan ada setidaknya satu yang bertanda isActive
          const hasActive = list.some(p => p.isActive);
          if (!hasActive) {
            const matchIdx = list.findIndex(p => 
              p.startMonth === sStartM && 
              parseInt(p.startYear) === sStartY && 
              p.endMonth === sEndM && 
              parseInt(p.endYear) === sEndY
            );
            if (matchIdx !== -1) {
              list[matchIdx].isActive = true;
            } else {
              list[0].isActive = true;
            }
          }
        }
        return list;
      }, [settings]);

      // Temukan periode aktif
      const activePeriod = useMemo(() => {
        return periodsList.find(p => p.isActive) || periodsList[0] || null;
      }, [periodsList]);

      // State pilihan periode (default ke periode aktif)
      const [filterPeriod, setFilterPeriod] = useState(() => {
        return activePeriod ? String(activePeriod.id) : 'all';
      });

      // Sinkronisasi otomatis default student ketika filterType berubah ke student
      useEffect(() => {
        if (filterType === 'student' && !filterStudent && students.length > 0) {
          setFilterStudent(students[0].id);
        }
      }, [filterType, filterStudent, students]);

      // Sinkronisasi default periode jika awalnya kosong
      useEffect(() => {
        if (!filterPeriod && activePeriod) {
          setFilterPeriod(String(activePeriod.id));
        }
      }, [activePeriod, filterPeriod]);

      // Objek periode yang sedang dipilih
      const selectedPeriodObj = useMemo(() => {
        const curId = filterPeriod || (activePeriod ? String(activePeriod.id) : 'all');
        if (curId === 'all') return null;
        return periodsList.find(p => String(p.id) === String(curId)) || null;
      }, [filterPeriod, activePeriod, periodsList]);

      // Objek murid yang dipilih saat filter student aktif
      const selectedStudentObj = useMemo(() => {
        if (!filterStudent) return null;
        return students.find(s => s.id === filterStudent || s.name === filterStudent) || null;
      }, [students, filterStudent]);

      // Rangkaian bulan untuk cakupan periode & semester yang dipilih
      const scopeMonths = useMemo(() => {
        const baseMonths = selectedPeriodObj ? getMonthsList(selectedPeriodObj) : getMonthsList(settings);
        return getSemesterMonths(baseMonths, filterSemester);
      }, [selectedPeriodObj, filterSemester, settings]);

      // Tahun mulai periode untuk acuan perhitungan bulan jatuh tempo
      const periodStartYear = useMemo(() => {
        if (selectedPeriodObj) return parseInt(selectedPeriodObj.startYear) || 2026;
        return parseInt(settings?.startYear) || 2026;
      }, [selectedPeriodObj, settings]);

      // Bulan yang SUDAH JATUH TEMPO / BERJALAN s/d bulan sekarang dalam cakupan ini
      // Bulan mendatang TIDAK dihitung sebagai tunggakan ("kalo blm kelewat bulan jangan terhitung")
      const dueMonths = useMemo(() => {
        return scopeMonths.filter(m => isMonthDueOrElapsed(m, new Date(), settings?.dueDateDay || 10));
      }, [scopeMonths, settings?.dueDateDay]);

      // Bulan mendatang yang belum tiba (belum jatuh tempo)
      const futureMonths = useMemo(() => {
        return scopeMonths.filter(m => !dueMonths.includes(m));
      }, [scopeMonths, dueMonths]);

      // Helper pencocokan transaksi dalam cakupan bulan
      const isTrxInScope = useCallback((trx) => {
        if (!trx) return false;
        const trxMonth = (trx.month || '').trim().toLowerCase();
        if (!trxMonth) return false;

        if (scopeMonths.some(m => m.trim().toLowerCase() === trxMonth)) {
          return true;
        }

        const parts = trxMonth.split(/\s+/);
        if (parts.length >= 2) return false;

        let trxYear = null;
        if (trx.date) {
          const matchYear = trx.date.match(/\b(20\d{2})\b/);
          if (matchYear) trxYear = parseInt(matchYear[1]);
        }

        if (trxYear) {
          const targetWithYear = `${parts[0]} ${trxYear}`.toLowerCase();
          return scopeMonths.some(m => m.trim().toLowerCase() === targetWithYear);
        }

        return scopeMonths.some(m => m.trim().toLowerCase().startsWith(parts[0]));
      }, [scopeMonths]);

      // Siswa yang masuk dalam filter (hanya siswa aktif)
      const filteredStudents = useMemo(() => {
        let list = students.filter(s => s.statusAktif !== false);
        if (filterType === 'class') {
          list = list.filter(s => (s.kelas || '').toLowerCase().trim() === (filterClass || '').toLowerCase().trim());
        } else if (filterType === 'student') {
          if (filterStudent) {
            list = list.filter(s => s.id === filterStudent || s.name === filterStudent);
          }
        }
        return list;
      }, [students, filterType, filterClass, filterStudent]);

      // Data Rekap Status Pembayaran & Tunggakan per Siswa
      const studentReportData = useMemo(() => {
        return filteredStudents.map(student => {
          const studentTrx = transactions.filter(t => {
            const isMatch = (t.studentId === student.id) ||
              (student.name && t.studentName && t.studentName.toLowerCase().trim() === student.name.toLowerCase().trim());
            const st = (t.status || '').toLowerCase().trim();
            const isPaid = (st === 'lunas' || st === 'berhasil' || st === 'sukses');
            return isMatch && isPaid;
          });

          // Bulan apa saja yang sudah dibayar oleh siswa ini di scope ini
          const paidMonths = scopeMonths.filter(m => {
            const mLower = m.trim().toLowerCase();
            return studentTrx.some(t => {
              const tMonth = (t.month || '').trim().toLowerCase();
              if (tMonth === mLower) return true;
              const parts = tMonth.split(/\s+/);
              if (parts.length === 1 && mLower.startsWith(parts[0])) return true;
              return false;
            });
          });

          // Bulan apa saja yang BELUM DIBAYAR dan SUDAH JATUH TEMPO s/d bulan sekarang (Tunggakan Aktif)
          // Kalo belum kelewat bulan jangan terhitung!
          const unpaidDueMonths = dueMonths.filter(m => !paidMonths.includes(m));

          // Bulan mendatang yang belum dibayar (belum jatuh tempo)
          const futureUnpaidMonths = futureMonths.filter(m => !paidMonths.includes(m));

          const tarif = Number(student.tarif) || 350000;
          const totalPaidAmount = paidMonths.length * tarif;
          const totalDebtAmount = unpaidDueMonths.length * tarif;
          const isLunas = unpaidDueMonths.length === 0;

          return {
            student,
            tarif,
            paidMonths,
            unpaidDueMonths,
            futureUnpaidMonths,
            totalPaidAmount,
            totalDebtAmount,
            isLunas
          };
        });
      }, [filteredStudents, transactions, scopeMonths, dueMonths, futureMonths]);

      // Total agregat statistik
      const grandTotalPaid = useMemo(() => {
        return studentReportData.reduce((sum, item) => sum + item.totalPaidAmount, 0);
      }, [studentReportData]);

      const grandTotalDebt = useMemo(() => {
        return studentReportData.reduce((sum, item) => sum + item.totalDebtAmount, 0);
      }, [studentReportData]);

      const totalLunasCount = useMemo(() => {
        return studentReportData.filter(i => i.isLunas).length;
      }, [studentReportData]);

      const totalDebtCount = useMemo(() => {
        return studentReportData.filter(i => !i.isLunas).length;
      }, [studentReportData]);

      // Riwayat Transaksi Kuitansi Pembayaran Lunas dalam scope
      const filteredTransactions = useMemo(() => {
        let res = transactions.filter(t => {
          const st = (t.status || '').toLowerCase().trim();
          return st === 'lunas' || st === 'berhasil' || st === 'sukses';
        });

        if (filterType === 'class') {
          res = res.filter(t => (t.kelas || '').toLowerCase().trim() === (filterClass || '').toLowerCase().trim());
        } else if (filterType === 'student') {
          if (filterStudent) {
            res = res.filter(t => 
              t.studentId === filterStudent || 
              (selectedStudentObj && t.studentName && t.studentName.toLowerCase().trim() === selectedStudentObj.name.toLowerCase().trim()) ||
              (t.studentName && t.studentName.toLowerCase().trim() === filterStudent.toLowerCase().trim())
            );
          }
        }

        res = res.filter(t => isTrxInScope(t));
        return res;
      }, [transactions, filterType, filterClass, filterStudent, selectedStudentObj, isTrxInScope]);

      const totalReceiptAmount = filteredTransactions.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);

      const handlePrint = () => {
        setTimeout(() => {
          window.print();
        }, 100);
      };

      const handleOpenPrintTab = () => {
        const printContent = document.querySelector('.printable-area');
        if (!printContent) {
          window.print();
          return;
        }
        const win = window.open('', '_blank');
        if (!win) {
          window.print();
          return;
        }
        win.document.write(`
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="UTF-8">
              <title>Laporan SPP - ${settings?.schoolName || 'PAUD'}</title>
              <link rel="stylesheet" href="style.css">
              <script src="https://cdn.tailwindcss.com"><\/script>
              <style>
                body { padding: 24px; background: #ffffff; color: #0f172a; font-family: sans-serif; }
                @media print { body { padding: 0; } }
              </style>
            </head>
            <body>
              <div class="printable-area">
                ${printContent.innerHTML}
              </div>
              <script>
                setTimeout(() => {
                  window.print();
                }, 400);
              <\/script>
            </body>
          </html>
        `);
        win.document.close();
      };

      const now = new Date();
      const currentMonthLabel = ALL_MONTHS[now.getMonth()];
      const currentDateFormatted = now.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
      const semesterLabel = filterSemester === '1' ? 'Semester 1 (Ganjil)' : (filterSemester === '2' ? 'Semester 2 (Genap)' : 'Semua Semester');

      return (
        <div className="space-y-6 animate-in fade-in duration-300">
          {/* FILTER PANEL ADMIN (SEMBUNYI SAAT CETAK) */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm print:hidden space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-xl font-extrabold text-slate-800 flex items-center gap-2">
                  <Icon name="printer" className="text-blue-600" /> Cetak Laporan Pembayaran & Rekap Tunggakan
                </h2>
                <p className="text-xs text-slate-500 mt-1 font-medium">
                  Filter laporan berdasarkan siswa/kelas, periode ajaran, dan pilihan semester dengan rekap bulan lunas vs tunggakan s/d bulan sekarang.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button 
                  onClick={handlePrint} 
                  className="py-2.5 px-5 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-black text-xs rounded-xl shadow-md transition-all flex items-center gap-2"
                >
                  <Icon name="printer" size={16} /> Cetak Sekarang (PDF)
                </button>
                <button 
                  type="button"
                  onClick={handleOpenPrintTab} 
                  className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all flex items-center gap-1.5 border border-slate-200"
                  title="Buka dokumen di tab baru untuk dicetak / simpan PDF"
                >
                  <Icon name="external-link" size={15} /> Buka Tab Cetak
                </button>
              </div>
            </div>

            {/* Grid Kontrol Filter */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* 1. Filter Berdasarkan */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Berdasarkan</label>
                <select 
                  value={filterType} 
                  onChange={e => setFilterType(e.target.value)} 
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl font-bold text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">Semua Siswa</option>
                  <option value="class">Per Kelas</option>
                  <option value="student">Per Nama Siswa</option>
                </select>
              </div>
              
              {/* 2. Pilihan Kelas (Jika Per Kelas) */}
              {filterType === 'class' && (
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Pilih Kelas</label>
                  <select 
                    value={filterClass} 
                    onChange={e => setFilterClass(e.target.value)} 
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl font-bold text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {(settings?.customClasses || []).map(c => (
                      <option key={c.name} value={c.name}>{c.name}</option>
                    ))}
                  </select>
                </div>
              )}
              
              {/* 2. Pilihan Siswa (Jika Per Siswa) */}
              {filterType === 'student' && (
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Pilih Siswa</label>
                  <select 
                    value={filterStudent} 
                    onChange={e => setFilterStudent(e.target.value)} 
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl font-bold text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">-- Pilih Siswa --</option>
                    {students.map(s => (
                      <option key={s.id} value={s.id}>{s.name} – {s.kelas}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* 3. Filter Periode SPP */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Periode Pembayaran SPP</label>
                <select 
                  value={filterPeriod || (activePeriod ? String(activePeriod.id) : 'all')} 
                  onChange={e => setFilterPeriod(e.target.value)} 
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl font-bold text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">Semua Periode</option>
                  {periodsList.map(p => (
                    <option key={p.id} value={String(p.id)}>
                      {p.name} {p.isActive ? '(Aktif)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* 4. Filter Semester (Fitur Baru Permintaan User) */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5 flex items-center gap-1">
                  <span>Pilih Semester</span>
                  <span className="px-1.5 py-0.2 bg-blue-100 text-blue-700 rounded text-[9px] font-black">Filter</span>
                </label>
                <select 
                  value={filterSemester} 
                  onChange={e => setFilterSemester(e.target.value)} 
                  className="w-full px-3.5 py-2.5 bg-blue-50/60 border border-blue-300 rounded-xl font-bold text-xs text-blue-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">Semua Semester (1 Tahun Penuh)</option>
                  <option value="1">Semester 1 (Ganjil)</option>
                  <option value="2">Semester 2 (Genap)</option>
                </select>
              </div>

              {/* 5. Tampilan Bagian Laporan */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Bagian Ditampilkan</label>
                <select 
                  value={viewMode} 
                  onChange={e => setViewMode(e.target.value)} 
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl font-bold text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">Lengkap (Rekap Siswa + Kuitansi)</option>
                  <option value="rekap">Hanya Rekap Pembayaran & Tunggakan</option>
                  <option value="transaksi">Hanya Riwayat Kuitansi Masuk</option>
                </select>
              </div>
            </div>

            {/* Info Badge Ringkas Status Filter */}
            <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
              <span className="text-[11px] font-bold text-slate-500">Info Filter Aktif:</span>
              <span className="px-2.5 py-1 bg-slate-100 text-slate-700 rounded-lg font-bold text-[11px] flex items-center gap-1">
                <Icon name="calendar" size={13} className="text-blue-600" />
                Periode: <strong className="text-slate-900">{selectedPeriodObj ? selectedPeriodObj.name : 'Semua Periode'}</strong>
              </span>
              <span className="px-2.5 py-1 bg-blue-100/70 text-blue-800 rounded-lg font-bold text-[11px] flex items-center gap-1">
                <Icon name="bookmark" size={13} className="text-blue-600" />
                Semester: <strong className="text-blue-950">{semesterLabel}</strong>
              </span>
              <span className="px-2.5 py-1 bg-emerald-100/70 text-emerald-800 rounded-lg font-bold text-[11px] flex items-center gap-1">
                <Icon name="clock" size={13} className="text-emerald-700" />
                Bulan Acuan Jatuh Tempo: <strong className="text-emerald-950">{currentMonthLabel} (Bulan Sekarang)</strong>
              </span>
              <span className="px-2.5 py-1 bg-purple-100/70 text-purple-800 rounded-lg font-bold text-[11px]">
                {scopeMonths.length} Bulan Teranalisis
              </span>
            </div>
          </div>

          {/* DOKUMEN LAPORAN CETAK / PREVIEW */}
          <div className="printable-area bg-white rounded-3xl p-6 sm:p-10 border border-slate-200 shadow-sm print:shadow-none print:border-none print:p-0 space-y-8">
            {/* KOP SURAT SEKOLAH */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-5 border-b-2 border-slate-900 pb-5 text-center sm:text-left">
              <div className="w-20 h-20 shrink-0 flex items-center justify-center p-1.5 bg-white border-2 border-slate-200 rounded-2xl shadow-sm">
                <img src="/logo.png" alt="PAUD Setia Bhakti" className="w-full h-full object-contain" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-black text-slate-900 uppercase tracking-wider">{settings?.schoolName || 'PAUD SETIA BHAKTI'}</h1>
                <p className="text-xs sm:text-sm font-semibold text-slate-600 mt-1">{settings?.address || 'Bekasi, Jawa Barat'}</p>
                <p className="text-xs sm:text-sm font-semibold text-slate-600">Telp / WA: {settings?.phone || '081234567890'}</p>
              </div>
              
              <div className="mt-5 pt-3 border-t border-slate-200">
                <h2 className="text-lg sm:text-xl font-black text-slate-800 uppercase tracking-wide">
                  LAPORAN PEMBAYARAN & REKAP TUNGGAKAN SPP
                </h2>
                <div className="flex flex-wrap items-center justify-center gap-3 mt-1.5 text-xs font-bold text-slate-600 uppercase">
                  <span>CAKUPAN: <strong className="text-slate-900">{
                    filterType === 'all' ? 'SEMUA SISWA' : 
                    filterType === 'class' ? `KELAS ${filterClass}` : 
                    (selectedStudentObj ? `${selectedStudentObj.name} (${selectedStudentObj.kelas})` : 'SISWA')
                  }</strong></span>
                  <span>•</span>
                  <span>PERIODE: <strong className="text-slate-900">{selectedPeriodObj ? selectedPeriodObj.name : 'SEMUA PERIODE'}</strong></span>
                  <span>•</span>
                  <span>SEMESTER: <strong className="text-slate-900">{semesterLabel.toUpperCase()}</strong></span>
                </div>
                <p className="text-[11px] font-medium text-slate-500 mt-1">
                  Dicetak pada: {currentDateFormatted} | Acuan Jatuh Tempo s/d Bulan Berjalan: <strong className="text-slate-700 font-bold">{currentMonthLabel}</strong>
                </p>
              </div>
            </div>

            {/* RINGKASAN METRIK FINANSIAL */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200 print:border-slate-300">
                <p className="text-[11px] font-black uppercase text-emerald-800">Total SPP Terbayarkan</p>
                <p className="text-xl sm:text-2xl font-black text-emerald-700 mt-1">{formatRupiah(grandTotalPaid)}</p>
                <p className="text-[10px] font-bold text-emerald-600 mt-0.5">Penerimaan dari siswa terdata</p>
              </div>

              <div className="p-4 bg-rose-50 rounded-2xl border border-rose-200 print:border-slate-300">
                <p className="text-[11px] font-black uppercase text-rose-800">Total Tunggakan SPP</p>
                <p className="text-xl sm:text-2xl font-black text-rose-700 mt-1">{formatRupiah(grandTotalDebt)}</p>
                <p className="text-[10px] font-bold text-rose-600 mt-0.5">
                  Hanya s/d {currentMonthLabel} (Bulan mendatang tidak terhitung)
                </p>
              </div>

              <div className="p-4 bg-blue-50 rounded-2xl border border-blue-200 print:border-slate-300">
                <p className="text-[11px] font-black uppercase text-blue-800">Status Pembayaran Siswa</p>
                <div className="flex items-center gap-3 mt-1.5">
                  <span className="text-xs font-black text-emerald-700 bg-white px-2.5 py-1 rounded-lg border border-emerald-200">
                    {totalLunasCount} Lunas
                  </span>
                  <span className="text-xs font-black text-rose-700 bg-white px-2.5 py-1 rounded-lg border border-rose-200">
                    {totalDebtCount} Menunggak
                  </span>
                </div>
                <p className="text-[10px] font-bold text-blue-600 mt-1.5">Total: {studentReportData.length} Siswa Terdaftar</p>
              </div>
            </div>

            {/* TABEL 1: REKAP PEMBAYARAN & TUNGGAKAN SISWA */}
            {(viewMode === 'all' || viewMode === 'rekap') && (
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <h3 className="font-black text-sm text-slate-800 uppercase tracking-wide flex items-center gap-2">
                    <Icon name="users" size={16} className="text-blue-600 print:hidden" />
                    I. Rekap Status Pembayaran & Tunggakan Siswa
                  </h3>
                  <span className="text-[11px] font-bold text-slate-500">
                    Rentang: {scopeMonths.length} Bulan ({semesterLabel})
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse border border-slate-300 text-xs">
                    <thead>
                      <tr className="bg-slate-100 font-bold text-slate-700 border-b-2 border-slate-300 print:bg-slate-200">
                        <th className="py-2.5 px-3 border-r border-slate-300 text-center w-10">No</th>
                        <th className="py-2.5 px-3 border-r border-slate-300">Nama Siswa & NIS</th>
                        <th className="py-2.5 px-3 border-r border-slate-300">Kelas</th>
                        <th className="py-2.5 px-3 border-r border-slate-300">Bulan Sudah Dibayar (Lunas)</th>
                        <th className="py-2.5 px-3 border-r border-slate-300">Bulan Belum Dibayar (Tunggakan s/d {currentMonthLabel})</th>
                        <th className="py-2.5 px-3 border-r border-slate-300 text-right">Total Terbayar</th>
                        <th className="py-2.5 px-3 border-r border-slate-300 text-right">Total Tunggakan</th>
                        <th className="py-2.5 px-3 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 font-medium text-slate-800">
                      {studentReportData.length === 0 ? (
                        <tr>
                          <td colSpan="8" className="py-8 text-center text-slate-500 font-bold">
                            Tidak ada siswa yang sesuai kriteria filter.
                          </td>
                        </tr>
                      ) : (
                        studentReportData.map((item, idx) => {
                          const { student, paidMonths, unpaidDueMonths, futureUnpaidMonths, totalPaidAmount, totalDebtAmount, isLunas } = item;
                          return (
                            <tr key={student.id || idx} className="hover:bg-slate-50">
                              <td className="py-2.5 px-3 border-r border-slate-200 text-center font-bold text-slate-600">
                                {idx + 1}
                              </td>
                              <td className="py-2.5 px-3 border-r border-slate-200 font-black text-slate-900">
                                {student.name}
                                <span className="block text-[10px] font-bold text-slate-400">NIS: {student.nis || '-'}</span>
                              </td>
                              <td className="py-2.5 px-3 border-r border-slate-200 font-bold text-slate-700">
                                {student.kelas}
                              </td>
                              {/* Bulan Sudah Dibayar */}
                              <td className="py-2.5 px-3 border-r border-slate-200">
                                {paidMonths.length > 0 ? (
                                  <div className="flex flex-wrap gap-1">
                                    {paidMonths.map((m, i) => (
                                      <span key={i} className="inline-block px-1.5 py-0.5 bg-emerald-100 text-emerald-800 rounded font-black text-[10px]">
                                        {m}
                                      </span>
                                    ))}
                                    <span className="text-[10px] text-emerald-700 font-bold ml-1 self-center">
                                      ({paidMonths.length} Bln)
                                    </span>
                                  </div>
                                ) : (
                                  <span className="text-slate-400 italic text-[11px]">Belum ada pembayaran (-)</span>
                                )}
                              </td>
                              {/* Bulan Belum Dibayar (Tunggakan s/d Bulan Sekarang) */}
                              <td className="py-2.5 px-3 border-r border-slate-200">
                                {unpaidDueMonths.length > 0 ? (
                                  <div className="space-y-1">
                                    <div className="flex flex-wrap gap-1">
                                      {unpaidDueMonths.map((m, i) => (
                                        <span key={i} className="inline-block px-1.5 py-0.5 bg-rose-100 text-rose-800 rounded font-black text-[10px]">
                                          {m}
                                        </span>
                                      ))}
                                      <span className="text-[10px] text-rose-700 font-black ml-1 self-center">
                                        ({unpaidDueMonths.length} Bulan Menunggak)
                                      </span>
                                    </div>
                                    {futureUnpaidMonths.length > 0 && (
                                      <p className="text-[9px] text-slate-400 italic">
                                        *Bulan mendatang: {futureUnpaidMonths[0]} s/d {futureUnpaidMonths[futureUnpaidMonths.length - 1]} ({futureUnpaidMonths.length} Bln belum jatuh tempo)
                                      </p>
                                    )}
                                  </div>
                                ) : (
                                  <div>
                                    <span className="inline-flex items-center gap-1 text-emerald-700 font-black text-[11px]">
                                      <Icon name="check-circle" size={12} /> Lunas (0 Tunggakan)
                                    </span>
                                    {futureUnpaidMonths.length > 0 && (
                                      <p className="text-[9px] text-slate-400 italic">
                                        {futureUnpaidMonths.length} bulan mendatang belum jatuh tempo
                                      </p>
                                    )}
                                  </div>
                                )}
                              </td>
                              {/* Total Terbayar */}
                              <td className="py-2.5 px-3 border-r border-slate-200 text-right font-black text-emerald-700">
                                {formatRupiah(totalPaidAmount)}
                              </td>
                              {/* Total Tunggakan */}
                              <td className="py-2.5 px-3 border-r border-slate-200 text-right font-black text-rose-700">
                                {formatRupiah(totalDebtAmount)}
                              </td>
                              {/* Status */}
                              <td className="py-2.5 px-3 text-center">
                                {isLunas ? (
                                  <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded font-black text-[10px] inline-block uppercase">
                                    Lunas
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 bg-rose-100 text-rose-800 rounded font-black text-[10px] inline-block uppercase">
                                    Nunggak ({unpaidDueMonths.length} Bln)
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                    <tfoot>
                      <tr className="bg-slate-100 font-black text-slate-900 border-t-2 border-slate-300">
                        <td colSpan="5" className="py-3 px-3 text-right border-r border-slate-300 uppercase">
                          Total Keseluruhan Rekap:
                        </td>
                        <td className="py-3 px-3 text-right text-emerald-700 border-r border-slate-300">
                          {formatRupiah(grandTotalPaid)}
                        </td>
                        <td className="py-3 px-3 text-right text-rose-700 border-r border-slate-300">
                          {formatRupiah(grandTotalDebt)}
                        </td>
                        <td className="py-3 px-3 text-center text-slate-600 text-[10px]">
                          {totalLunasCount} Lunas / {totalDebtCount} Nunggak
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            )}

            {/* TABEL 2: RINCIAN RIWAYAT TRANSAKSI KUITANSI */}
            {(viewMode === 'all' || viewMode === 'transaksi') && (
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <h3 className="font-black text-sm text-slate-800 uppercase tracking-wide flex items-center gap-2">
                    <Icon name="receipt" size={16} className="text-emerald-600 print:hidden" />
                    II. Rincian Riwayat Pembayaran Masuk (Kuitansi)
                  </h3>
                  <span className="text-[11px] font-bold text-slate-500">
                    {filteredTransactions.length} Transaksi Terverifikasi
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse border border-slate-300 text-xs">
                    <thead>
                      <tr className="bg-slate-100 font-bold text-slate-700 border-b-2 border-slate-300 print:bg-slate-200">
                        <th className="py-2.5 px-3 border-r border-slate-300 text-center w-10">No</th>
                        <th className="py-2.5 px-3 border-r border-slate-300">Tanggal</th>
                        <th className="py-2.5 px-3 border-r border-slate-300">No Kuitansi</th>
                        <th className="py-2.5 px-3 border-r border-slate-300">Nama Siswa</th>
                        <th className="py-2.5 px-3 border-r border-slate-300">Kelas</th>
                        <th className="py-2.5 px-3 border-r border-slate-300">Bulan SPP</th>
                        <th className="py-2.5 px-3 border-r border-slate-300">Metode Bayar</th>
                        <th className="py-2.5 px-3 text-right">Nominal</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 font-medium text-slate-800">
                      {filteredTransactions.length === 0 ? (
                        <tr>
                          <td colSpan="8" className="py-8 text-center text-slate-500 font-bold">
                            Tidak ada riwayat kuitansi pembayaran pada periode & semester ini.
                          </td>
                        </tr>
                      ) : (
                        filteredTransactions.map((trx, idx) => (
                          <tr key={trx.id || idx} className="hover:bg-slate-50">
                            <td className="py-2.5 px-3 border-r border-slate-200 text-center font-bold text-slate-600">{idx + 1}</td>
                            <td className="py-2.5 px-3 border-r border-slate-200 font-semibold">{trx.date}</td>
                            <td className="py-2.5 px-3 border-r border-slate-200 font-bold text-slate-800">{trx.kuitansiNo || '-'}</td>
                            <td className="py-2.5 px-3 border-r border-slate-200 font-black text-slate-900">{trx.studentName}</td>
                            <td className="py-2.5 px-3 border-r border-slate-200">{trx.kelas}</td>
                            <td className="py-2.5 px-3 border-r border-slate-200 font-bold text-emerald-800">{trx.month}</td>
                            <td className="py-2.5 px-3 border-r border-slate-200 text-slate-600">{trx.method || 'Tunai (di TU)'}</td>
                            <td className="py-2.5 px-3 text-right font-black text-emerald-700">{formatRupiah(trx.amount)}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                    <tfoot>
                      <tr className="bg-slate-100 font-black text-slate-900 border-t-2 border-slate-300">
                        <td colSpan="7" className="py-3 px-3 text-right border-r border-slate-300 uppercase">
                          Total Pemasukan Kuitansi:
                        </td>
                        <td className="py-3 px-3 text-right text-emerald-700">
                          {formatRupiah(totalReceiptAmount)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            )}

            {/* CATATAN KAKI & PENGESAHAN LAPORAN */}
            <div className="pt-4 border-t border-slate-200 text-xs text-slate-500 space-y-2">
              <p className="italic">
                * Catatan Sistem: Perhitungan total tunggakan hanya memperhitungkan tagihan yang telah jatuh tempo atau berjalan sampai dengan bulan saat ini (<strong>{currentMonthLabel}</strong>). Bulan-bulan mendatang dalam tahun ajaran yang belum jatuh tempo tidak dihitung sebagai tunggakan.
              </p>
            </div>

            <div className="mt-8 pt-4 flex justify-between items-end print:block print:text-right">
              <div className="text-[11px] text-slate-500 hidden sm:block print:hidden">
                <p>Dokumen ini dibuat otomatis oleh Sistem Informasi SPP PAUD.</p>
                <p>Berlaku sebagai rekapitulasi sah administrasi sekolah.</p>
              </div>

              <div className="text-center w-64 ml-auto">
                <p className="text-xs font-bold text-slate-600 mb-16">Mengetahui, Administrator TU</p>
                <p className="font-extrabold text-slate-900 underline uppercase text-sm">{settings?.adminName || 'Siti Rahma (Admin TU)'}</p>
                <p className="text-[10px] text-slate-500 font-bold">NIP / ID: {settings?.adminUsername || 'Admin'}</p>
              </div>
            </div>
          </div>
        </div>
      );
    }

    function TransaksiView({ students, transactions, settings, onAddTransaction, onShowKuitansi }) {
      const [selectedStudentId, setSelectedStudentId] = useState('');
      const [selectedMonth, setSelectedMonth] = useState('');
      const [payMethod, setPayMethod] = useState('Tunai (di TU)');
      const [customAmount, setCustomAmount] = useState('');

      // Daftar periode pembayaran SPP dari pengaturan
      const periodsList = useMemo(() => {
        let list = [];
        if (Array.isArray(settings?.academicPeriods) && settings.academicPeriods.length > 0) {
          list = settings.academicPeriods.map((p, idx) => ({
            ...p,
            id: String(p.id || `period-${idx}`)
          }));
        }
        const sStartM = settings?.startMonth || 'Juli';
        const sStartY = parseInt(settings?.startYear) || 2026;
        const sEndM = settings?.endMonth || 'Juni';
        const sEndY = parseInt(settings?.endYear) || 2027;

        if (list.length === 0) {
          list.push({
            id: 'active-default',
            name: `Periode ${sStartM} ${sStartY} - ${sEndM} ${sEndY}`,
            startMonth: sStartM,
            startYear: sStartY,
            endMonth: sEndM,
            endYear: sEndY,
            semester: settings?.semester || 'Semua',
            isActive: true
          });
        }
        return list;
      }, [settings]);

      const activePeriod = useMemo(() => {
        return periodsList.find(p => p.isActive) || periodsList[0] || null;
      }, [periodsList]);

      const [filterPeriod, setFilterPeriod] = useState(() => {
        return activePeriod ? String(activePeriod.id) : 'all';
      });

      // Semester otomatis terisi berdasarkan pengaturan aplikasi (settings.semester)
      const defaultSemester = useMemo(() => {
        const s = (settings?.semester || '').toLowerCase();
        if (s.includes('1') || s.includes('ganjil')) return '1';
        if (s.includes('2') || s.includes('genap')) return '2';
        return 'all';
      }, [settings?.semester]);

      const [filterSemester, setFilterSemester] = useState(defaultSemester);

      // Sinkronisasi otomatis saat pengaturan semester sekolah berubah
      useEffect(() => {
        setFilterSemester(defaultSemester);
      }, [defaultSemester]);

      useEffect(() => {
        if (activePeriod && (!filterPeriod || filterPeriod === 'all')) {
          setFilterPeriod(String(activePeriod.id));
        }
      }, [activePeriod]);

      const selectedPeriodObj = useMemo(() => {
        const curId = filterPeriod || (activePeriod ? String(activePeriod.id) : 'all');
        if (curId === 'all') return null;
        return periodsList.find(p => String(p.id) === String(curId)) || null;
      }, [filterPeriod, activePeriod, periodsList]);

      const activeStudents = useMemo(() => students.filter(s => s.statusAktif !== false), [students]);

      const selectedStudent = useMemo(() => {
        return students.find(s => s.id.toString() === selectedStudentId.toString());
      }, [students, selectedStudentId]);

      // Rangkaian bulan untuk cakupan periode & semester yang dipilih
      const scopeMonths = useMemo(() => {
        const baseMonths = selectedPeriodObj ? getMonthsList(selectedPeriodObj) : getMonthsList(settings);
        return getSemesterMonths(baseMonths, filterSemester);
      }, [selectedPeriodObj, filterSemester, settings]);

      const periodStartYear = useMemo(() => {
        if (selectedPeriodObj) return parseInt(selectedPeriodObj.startYear) || 2026;
        return parseInt(settings?.startYear) || 2026;
      }, [selectedPeriodObj, settings?.startYear]);

      // Status pembayaran siswa pada bulan-bulan dalam semester & periode ini
      const paymentSummary = useMemo(() => {
        if (!selectedStudent) return { paidMonths: [], unpaidMonths: [], dueUnpaidMonths: [], futureUnpaidMonths: [] };
        const studentTrx = transactions.filter(t => 
          (t.studentId === selectedStudent.id || (t.studentName && t.studentName.toLowerCase().trim() === selectedStudent.name.toLowerCase().trim())) &&
          (t.status === 'Lunas' || t.status === 'lunas' || t.status === 'Berhasil' || t.status === 'Sukses')
        );
        const paidMonths = scopeMonths.filter(m => {
          const mLower = m.trim().toLowerCase();
          return studentTrx.some(t => {
            const tMonth = (t.month || '').trim().toLowerCase();
            return tMonth === mLower || (tMonth && mLower.startsWith(tMonth));
          });
        });
        const allUnpaidMonths = scopeMonths.filter(m => !paidMonths.includes(m));
        
        // Pemisahan akurat: HANYA bulan yang telah berjalan s/d saat ini yang dihitung menunggak
        const dueUnpaidMonths = allUnpaidMonths.filter(m => isMonthDueOrElapsed(m, new Date(), settings?.dueDateDay || 10));
        const futureUnpaidMonths = allUnpaidMonths.filter(m => !isMonthDueOrElapsed(m, new Date(), settings?.dueDateDay || 10));

        return { 
          paidMonths, 
          unpaidMonths: allUnpaidMonths, 
          dueUnpaidMonths, 
          futureUnpaidMonths 
        };
      }, [selectedStudent, transactions, scopeMonths, settings?.dueDateDay]);

      useEffect(() => {
        if (selectedStudent) {
          setCustomAmount(selectedStudent.tarif || 350000);
          if (paymentSummary.dueUnpaidMonths.length > 0) {
            setSelectedMonth(paymentSummary.dueUnpaidMonths[0]);
          } else if (paymentSummary.futureUnpaidMonths.length > 0) {
            setSelectedMonth(paymentSummary.futureUnpaidMonths[0]);
          } else {
            setSelectedMonth('');
          }
        }
      }, [selectedStudent, paymentSummary.dueUnpaidMonths, paymentSummary.futureUnpaidMonths]);

      const handleManualPaymentSubmit = (e) => {
        e.preventDefault();
        if (!selectedStudent) {
          alert('Pilih siswa terlebih dahulu.');
          return;
        }
        if (!selectedMonth) {
          alert('Pilih bulan SPP terlebih dahulu.');
          return;
        }

        const currentDate = new Date().toLocaleDateString('id-ID');
        const kuitansiNo = `K-${new Date().getFullYear()}${String(new Date().getMonth()+1).padStart(2,'0')}-${Math.floor(100+Math.random()*900)}`;

        const newTrx = {
          studentId: selectedStudent.id,
          studentName: selectedStudent.name,
          kelas: selectedStudent.kelas,
          month: selectedMonth,
          amount: Number(customAmount) || selectedStudent.tarif,
          method: payMethod,
          status: 'Lunas',
          isRead: false,
          date: currentDate,
          kuitansiNo: kuitansiNo
        };

        onAddTransaction(newTrx);
        alert(`Pembayaran SPP Bulan ${selectedMonth} untuk ${selectedStudent.name} (${formatRupiah(newTrx.amount)}) berhasil dicatat!`);
      };

      return (
        <div className="space-y-6">
          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-5">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-50 text-blue-800 rounded-full text-[11px] font-black uppercase mb-2 border border-blue-200">
                <Icon name="credit-card" size={13} className="text-blue-600" />
                Catat Pembayaran SPP Manual
              </div>
              <h2 className="text-2xl font-black text-slate-800 tracking-tight">Catat Pembayaran SPP (Manual TU)</h2>
              <p className="text-xs text-slate-500 font-medium mt-1">
                Pencatatan langsung saat wali murid membayar tunai atau transfer di TU dengan filter periode & semester otomatis.
              </p>
            </div>

            {/* Filter Scope Periode & Semester (Sinkron Otomatis dari Pengaturan) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-slate-50/80 rounded-2xl border border-slate-200/80 text-xs">
              <div>
                <label className="block font-bold text-slate-600 uppercase mb-1">Periode Pembayaran</label>
                <select
                  value={filterPeriod || (activePeriod ? String(activePeriod.id) : 'all')}
                  onChange={(e) => setFilterPeriod(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">Semua Periode</option>
                  {periodsList.map(p => (
                    <option key={p.id} value={String(p.id)}>
                      {p.name} {p.isActive ? '(Aktif)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-600 uppercase mb-1 flex items-center justify-between">
                  <span>Semester</span>
                  <span className="text-[10px] text-blue-600 font-extrabold uppercase">Otomatis Terisi dari Pengaturan</span>
                </label>
                <select
                  value={filterSemester}
                  onChange={(e) => setFilterSemester(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white border border-blue-300 rounded-xl font-bold text-blue-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">Semua Semester (1 Tahun Penuh)</option>
                  <option value="1">Semester 1 (Ganjil)</option>
                  <option value="2">Semester 2 (Genap)</option>
                </select>
              </div>
            </div>

            <form onSubmit={handleManualPaymentSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">Pilih Siswa</label>
                <select
                  required
                  value={selectedStudentId}
                  onChange={(e) => setSelectedStudentId(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">-- Pilih Murid --</option>
                  {activeStudents.map(s => (
                    <option key={s.id} value={s.id}>{s.name} ({s.nis} - {s.kelas})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">Bulan SPP ({scopeMonths.length} Bulan Scope)</label>
                <select
                  required
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {paymentSummary.unpaidMonths.length === 0 ? (
                    <option value="">Semua Bulan di Semester Ini Sudah Lunas</option>
                  ) : (
                    <>
                      {paymentSummary.dueUnpaidMonths.length > 0 && (
                        <optgroup label="[Jatuh Tempo] Tagihan Menunggak">
                          {paymentSummary.dueUnpaidMonths.map(m => (
                            <option key={m} value={m}>{m} (Menunggak)</option>
                          ))}
                        </optgroup>
                      )}
                      {paymentSummary.futureUnpaidMonths.length > 0 && (
                        <optgroup label="[Mendatang] Belum Jatuh Tempo (Bayar Awal)">
                          {paymentSummary.futureUnpaidMonths.map(m => (
                            <option key={m} value={m}>{m} (Bulan Mendatang)</option>
                          ))}
                        </optgroup>
                      )}
                    </>
                  )}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">Metode Bayar</label>
                <select
                  value={payMethod}
                  onChange={(e) => setPayMethod(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="Tunai (di TU)">Tunai (di TU)</option>
                  <option value="Transfer Bank Manual">Transfer Bank Manual</option>
                  <option value="EDC TU">Mesin EDC TU</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">Nominal SPP (Rp)</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none font-extrabold text-slate-500">Rp</span>
                  <input
                    type="text"
                    required
                    value={formatInputNumber(customAmount)}
                    onChange={(e) => setCustomAmount(parseNumberOnly(e.target.value))}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl font-extrabold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {selectedStudent && (
                <div className="md:col-span-2 lg:col-span-4 p-4 bg-blue-50/70 border border-blue-200 rounded-2xl space-y-2 text-xs">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-black text-blue-950 text-sm">{selectedStudent.name}</span>
                      <span className="text-slate-400">•</span>
                      <span className="font-bold text-slate-600">Kelas: <strong className="text-slate-800">{selectedStudent.kelas}</strong></span>
                      <span className="text-slate-400">•</span>
                      <span className="font-bold text-slate-600">Tarif Resmi: <strong className="text-blue-700 font-extrabold">{formatRupiah(selectedStudent.tarif)}/bln</strong></span>
                    </div>
                    {selectedStudent.keringanan_note && (
                      <span className="px-2.5 py-1 bg-amber-100 text-amber-900 rounded-lg font-black text-[11px] border border-amber-300 flex items-center gap-1">
                        <Icon name="tag" size={12} /> Keringanan: {selectedStudent.keringanan_note}
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px]">
                    <span className="font-bold text-slate-500">Status di Semester Ini:</span>
                    <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded-lg font-black flex items-center gap-1">
                      <Icon name="check-circle" size={12} /> {paymentSummary.paidMonths.length} Bulan Lunas
                    </span>
                    {paymentSummary.dueUnpaidMonths.length > 0 ? (
                      <span className="px-2.5 py-1 bg-rose-100 text-rose-800 rounded-lg font-black flex items-center gap-1 border border-rose-200">
                        <Icon name="alert-circle" size={12} /> {paymentSummary.dueUnpaidMonths.length} Bulan Menunggak (s/d Bulan Ini)
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 bg-teal-100 text-teal-800 rounded-lg font-black flex items-center gap-1 border border-teal-200">
                        <Icon name="shield-check" size={12} /> 0 Tunggakan (Lunas s/d Bulan Ini)
                      </span>
                    )}
                    {paymentSummary.futureUnpaidMonths.length > 0 && (
                      <span className="px-2.5 py-1 bg-sky-100 text-sky-800 rounded-lg font-black flex items-center gap-1 border border-sky-200">
                        <Icon name="calendar" size={12} /> {paymentSummary.futureUnpaidMonths.length} Bulan Mendatang (Belum Jatuh Tempo)
                      </span>
                    )}
                  </div>
                </div>
              )}

              <div className="md:col-span-2 lg:col-span-4 pt-2">
                <button
                  type="submit"
                  disabled={paymentSummary.unpaidMonths.length === 0}
                  className="py-3 px-6 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:pointer-events-none text-white font-extrabold shadow-md shadow-blue-500/25 rounded-xl text-xs transition-all flex items-center gap-2"
                >
                  <Icon name="check-circle" size={16} />
                  <span>Simpan Pembayaran & Terbitkan Kuitansi</span>
                </button>
              </div>
            </form>
          </div>

          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-extrabold text-slate-800 text-base">Riwayat Transaksi Pembayaran</h3>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-[11px] font-bold text-slate-500 uppercase border-b border-slate-200">
                    <th className="py-4 px-6">No Kuitansi</th>
                    <th className="py-4 px-6">Nama Siswa</th>
                    <th className="py-4 px-6">Kelas</th>
                    <th className="py-4 px-6">Bulan SPP</th>
                    <th className="py-4 px-6">Nominal</th>
                    <th className="py-4 px-6">Metode</th>
                    <th className="py-4 px-6">Tanggal</th>
                    <th className="py-4 px-6 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs font-medium">
                  {transactions.map((trx) => (
                    <tr key={trx.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-4 px-6 font-bold text-slate-800">{trx.kuitansiNo}</td>
                      <td className="py-4 px-6 font-semibold text-slate-800">{trx.studentName}</td>
                      <td className="py-4 px-6">{trx.kelas}</td>
                      <td className="py-4 px-6 font-bold text-emerald-700">{trx.month}</td>
                      <td className="py-4 px-6 font-extrabold text-slate-900">{formatRupiah(trx.amount)}</td>
                      <td className="py-4 px-6">{trx.method}</td>
                      <td className="py-4 px-6 text-slate-500">{trx.date}</td>
                      <td className="py-4 px-6 text-center">
                        <button
                          onClick={() => onShowKuitansi(trx)}
                          className="py-1.5 px-3 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 font-bold rounded-xl text-xs border border-emerald-200"
                        >
                          Cetak Kuitansi
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      );
    }

    // ==========================================
    // 7. MANAJEMEN PENGADUAN
    // ==========================================
    
    function AdminPengaduanView({ complaints, onReplyComplaint, onToggleComplaintStatus }) {
      const [activeChatId, setActiveChatId] = useState(null);
      const [replyText, setReplyText] = useState('');
      const [nowMs, setNowMs] = useState(Date.now());
      const chatEndRef = React.useRef(null);

      useEffect(() => {
        const timer = setInterval(() => setNowMs(Date.now()), 10000);
        return () => clearInterval(timer);
      }, []);

      useEffect(() => {
        if (chatEndRef.current) {
          chatEndRef.current.scrollIntoView({ behavior: "smooth" });
        }
      }, [complaints, activeChatId]);

      const activeComplaints = complaints.filter(c => nowMs <= (c.expiresAtMs || (c.createdAtMs + 3600000))).sort((a,b) => b.createdAtMs - a.createdAtMs);
      const expiredComplaints = complaints.filter(c => nowMs > (c.expiresAtMs || (c.createdAtMs + 3600000))).sort((a,b) => b.createdAtMs - a.createdAtMs);

      const activeChat = complaints.find(c => c.id === activeChatId);

      return (
        <div className="h-[calc(100vh-6rem)] animate-in fade-in duration-300 flex gap-4">
          
          {/* LEFT SIDEBAR: CHAT LIST */}
          <div className="w-1/3 bg-white rounded-3xl border border-slate-200 shadow-sm flex flex-col overflow-hidden shrink-0">
             <div className="p-5 border-b border-slate-100 bg-slate-50/80">
               <h2 className="text-lg font-black text-slate-800 flex items-center gap-2">
                 <Icon name="message-square" size={20} className="text-emerald-600"/> Pesan Pengaduan
               </h2>
               <p className="text-[11px] text-slate-500 font-medium mt-1">Sesi chat aktif dalam 1 Jam.</p>
             </div>
             
             <div className="flex-1 overflow-y-auto">
                <div className="px-4 py-3">
                  <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">Live Chat ({activeComplaints.length})</h3>
                  {activeComplaints.length === 0 && <p className="text-xs text-slate-400 italic">Tidak ada chat aktif.</p>}
                  <div className="space-y-2">
                    {activeComplaints.map(c => (
                      <div 
                        key={c.id} 
                        onClick={() => setActiveChatId(c.id)}
                        className={`p-3 rounded-2xl cursor-pointer transition-all border ${activeChatId === c.id ? 'bg-emerald-50 border-emerald-300 shadow-sm' : 'bg-white border-slate-100 hover:bg-slate-50'}`}
                      >
                        <div className="flex justify-between items-start mb-1">
                          <h4 className="font-black text-slate-800 text-sm truncate max-w-[150px]">{c.studentName}</h4>
                          <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse shrink-0"></span>
                        </div>
                        <p className="text-xs text-slate-600 font-bold truncate">{c.title}</p>
                        <p className="text-[10px] text-slate-400 mt-1 font-medium"><Icon name="clock" size={10} className="inline mr-0.5"/> Sisa {Math.max(0, Math.floor((c.expiresAtMs - nowMs) / 60000))} mnt</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="px-4 py-3 border-t border-slate-100">
                  <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">Riwayat Expired ({expiredComplaints.length})</h3>
                  <div className="space-y-2">
                    {expiredComplaints.map(c => (
                      <div 
                        key={c.id} 
                        onClick={() => setActiveChatId(c.id)}
                        className={`p-3 rounded-2xl cursor-pointer transition-all border ${activeChatId === c.id ? 'bg-slate-100 border-slate-300 shadow-sm' : 'bg-white border-slate-100 hover:bg-slate-50'} opacity-75`}
                      >
                        <div className="flex justify-between items-start mb-1">
                          <h4 className="font-black text-slate-800 text-sm truncate max-w-[150px]">{c.studentName}</h4>
                          <Icon name="lock" size={12} className="text-slate-400" />
                        </div>
                        <p className="text-xs text-slate-600 font-bold truncate">{c.title}</p>
                      </div>
                    ))}
                  </div>
                </div>
             </div>
          </div>

          {/* RIGHT SIDE: CHAT WINDOW */}
          <div className="flex-1 bg-white rounded-3xl border border-slate-200 shadow-sm flex flex-col overflow-hidden">
            {!activeChat ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
                <div className="w-20 h-20 bg-slate-100 text-slate-300 rounded-full flex items-center justify-center mb-4">
                  <Icon name="message-circle" size={40} />
                </div>
                <h3 className="text-xl font-black text-slate-700">Pilih Percakapan</h3>
                <p className="text-sm text-slate-500 mt-2 font-medium">Pilih pesan di samping kiri untuk membalas pengaduan wali murid.</p>
              </div>
            ) : (
              <>
                <div className={`p-5 sm:p-6 border-b flex items-center justify-between shrink-0 ${nowMs <= activeChat.expiresAtMs ? 'bg-emerald-50/50 border-emerald-100' : 'bg-slate-100 border-slate-200'}`}>
                  <div>
                    <h3 className="font-black text-slate-800 text-lg">{activeChat.title}</h3>
                    <p className="text-xs text-slate-500 font-bold mt-1">Siswa: {activeChat.studentName} • Wali: {activeChat.waliName || 'Wali Murid'}</p>
                  </div>
                  {nowMs <= activeChat.expiresAtMs ? (
                     <div className="bg-rose-100 text-rose-700 px-3 py-1.5 rounded-lg text-xs font-black border border-rose-200 shadow-sm flex items-center gap-1.5">
                       <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>
                       LIVE CHAT
                     </div>
                  ) : (
                     <div className="bg-slate-200 text-slate-600 px-3 py-1.5 rounded-lg text-xs font-black border border-slate-300 flex items-center gap-1.5">
                       <Icon name="lock" size={14} /> EXPIRED
                     </div>
                  )}
                </div>
                
                <div className="flex-1 p-5 sm:p-6 overflow-y-auto bg-slate-50/50 space-y-4">
                  {/* First generic system message of the topic */}
                  <div className="text-center my-4">
                    <span className="bg-slate-200 text-slate-500 text-[10px] font-black uppercase px-3 py-1 rounded-full">Sesi Obrolan Dibuka: {activeChat.date}</span>
                  </div>

                  {activeChat.messages && activeChat.messages.map((msg, i) => {
                    const isAdmin = msg.sender === 'Admin TU';
                    return (
                      <div key={i} className={`flex flex-col ${isAdmin ? 'items-end' : 'items-start'}`}>
                         <div className={`max-w-[85%] sm:max-w-[70%] p-4 rounded-2xl shadow-sm ${isAdmin ? 'bg-emerald-600 text-white rounded-tr-sm' : 'bg-white border border-slate-200 rounded-tl-sm text-slate-800'}`}>
                           <div className="flex items-center gap-2 mb-1.5 opacity-80">
                             <Icon name={isAdmin ? 'shield-check' : 'user'} size={12} />
                             <span className="text-[10px] font-black uppercase">{msg.sender}</span>
                           </div>
                           <p className="text-sm font-medium leading-relaxed">{msg.text}</p>
                           {msg.imageUrl && (
                             <div className="mt-2">
                               <img src={msg.imageUrl} alt="Lampiran" className="max-w-full h-auto rounded-lg shadow-sm border border-slate-200 cursor-pointer" onClick={() => setPreviewImage(msg.imageUrl)} />
                             </div>
                           )}
                         </div>
                         <span className="text-[10px] text-slate-400 font-bold mt-1.5">{msg.time || '-'}</span>
                      </div>
                    );
                  })}
                  <div ref={chatEndRef} />
                </div>
                
                <div className="p-4 sm:p-5 bg-white border-t border-slate-100 shrink-0">
                  {nowMs <= activeChat.expiresAtMs ? (
                    <div className="flex gap-3">
                      <input type="file" id={`admin_file_${activeChat.id}`} className="hidden" accept="image/*" onChange={(e) => {
                        const file = e.target.files[0];
                        if(file) {
                          const reader = new FileReader();
                          reader.onload = (ev) => {
                            onReplyComplaint(activeChat.id, replyText || '(Mengirim Lampiran)', 'Admin TU', ev.target.result);
                            setReplyText('');
                          };
                          reader.readAsDataURL(file);
                        }
                      }} />
                      <button onClick={() => document.getElementById(`admin_file_${activeChat.id}`).click()} className="px-4 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl shadow-sm transition-colors flex items-center justify-center">
                        <Icon name="paperclip" size={18} />
                      </button>
                      <input 
                        type="text" 
                        value={replyText} 
                        onChange={(e) => setReplyText(e.target.value)} 
                        placeholder="Ketik balasan Anda..." 
                        className="flex-1 px-4 py-3 bg-slate-50 border border-slate-300 rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-500" 
                        onKeyDown={e => {
                          if(e.key === 'Enter' && replyText.trim()) {
                            onReplyComplaint(activeChat.id, replyText.trim(), 'Admin TU');
                            setReplyText('');
                          }
                        }}
                      />
                      <button 
                        onClick={() => {
                          if(replyText.trim()) {
                            onReplyComplaint(activeChat.id, replyText.trim(), 'Admin TU');
                            setReplyText('');
                          }
                        }} 
                        className="px-6 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-md transition-colors flex items-center justify-center gap-2 font-black"
                      >
                        <Icon name="send" size={18} /> <span className="hidden sm:inline">Kirim</span>
                      </button>
                    </div>
                  ) : (
                    <div className="w-full py-3 bg-slate-100 border border-slate-200 rounded-xl text-center text-slate-500 text-xs font-bold">
                      <Icon name="lock" size={14} className="inline mr-1" /> Waktu Sesi Habis. Obrolan ditutup.
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      );
    }
  
    // ==========================================
    // 7.5. PENGATURAN APLIKASI PANEL ADMIN
    // ==========================================
    function AdminPengaturanView({ settings, onSaveSettings }) {
      const [formData, setFormData] = useState({ ...settings });
      const [newAdminPassword, setNewAdminPassword] = useState('');
      const [newClassName, setNewClassName] = useState('');
      const [newClassTarif, setNewClassTarif] = useState(400000);

      useEffect(() => {
        setFormData({ ...settings });
        setNewAdminPassword('');
      }, [settings]);

      const handleAddClass = () => {
        if (!newClassName.trim()) return;
        const updatedClasses = [...(formData.customClasses || []), { name: newClassName.trim(), tarif: Number(newClassTarif) || 0 }];
        const updated = { ...formData, customClasses: updatedClasses };
        setFormData(updated);
        onSaveSettings(updated);
        setNewClassName('');
        setNewClassTarif(400000);
      };

      const handleDeleteClass = (idx) => {
        const updatedClasses = (formData.customClasses || []).filter((_, i) => i !== idx);
        const updated = { ...formData, customClasses: updatedClasses };
        setFormData(updated);
        onSaveSettings(updated);
      };

      const handleUpdateClass = (idx, field, value) => {
        const updatedClasses = [...(formData.customClasses || [])];
        updatedClasses[idx] = {
          ...updatedClasses[idx],
          [field]: field === 'tarif' ? (Number(value) || 0) : value
        };
        const updated = { ...formData, customClasses: updatedClasses };
        setFormData(updated);
      };

      const handleSaveCurrentAsPreset = () => {
        const sM = formData.startMonth || 'Juli';
        const sY = parseInt(formData.startYear) || 2025;
        const eM = formData.endMonth || 'Juni';
        const eY = parseInt(formData.endYear) || (sY + 1);
        const sem = formData.semester || 'Semua';
        const semTag = (sem && sem !== 'Semua') ? ` (${sem})` : '';
        const newName = formData.activePeriodName || `Periode ${sM} ${sY} - ${eM} ${eY}${semTag}`;
        
        const newPeriod = {
          id: Date.now().toString(),
          name: newName,
          startMonth: sM,
          startYear: sY,
          endMonth: eM,
          endYear: eY,
          semester: sem,
          isActive: true
        };

        const existingPeriods = (formData.academicPeriods && formData.academicPeriods.length > 0)
          ? formData.academicPeriods
          : [];

        // Hapus duplikat rentang yang sama persis jika ada
        const filtered = existingPeriods.filter(p => !(p.startMonth === sM && String(p.startYear) === String(sY) && p.endMonth === eM && String(p.endYear) === String(eY) && (p.semester || 'Semua') === sem));
        const updatedPeriods = [newPeriod, ...filtered.map(p => ({ ...p, isActive: false }))];

        const updatedFormData = {
          ...formData,
          activePeriodName: newName,
          startMonth: sM,
          startYear: sY,
          endMonth: eM,
          endYear: eY,
          semester: sem,
          academicYear: `${sY}/${eY}`,
          academicPeriods: updatedPeriods
        };

        setFormData(updatedFormData);
        onSaveSettings(updatedFormData);
        alert(`Rentang "${newName}" berhasil disimpan dan langsung diterapkan sebagai periode aktif!`);
      };

      const handleApplyPreset = (p) => {
        const sY = parseInt(p.startYear) || 2025;
        const eY = parseInt(p.endYear) || (sY + 1);
        const updatedPeriods = (formData.academicPeriods || []).map(item => ({
          ...item,
          isActive: item.id === p.id || (item.startMonth === p.startMonth && String(item.startYear) === String(p.startYear) && (item.semester || 'Semua') === (p.semester || 'Semua'))
        }));

        const updatedFormData = {
          ...formData,
          activePeriodName: p.name,
          startMonth: p.startMonth,
          startYear: sY,
          endMonth: p.endMonth,
          endYear: eY,
          semester: p.semester || 'Semua',
          academicYear: p.name.replace(/[^0-9/]/g, '') || `${sY}/${eY}`,
          academicPeriods: updatedPeriods
        };

        setFormData(updatedFormData);
        onSaveSettings(updatedFormData);
        alert(`Periode aktif berhasil diubah dan diterapkan ke: ${p.name}`);
      };

      const handleDeletePreset = (idx, pName) => {
        if (!confirm(`Hapus preset "${pName}"?`)) return;
        const updatedPeriods = (formData.academicPeriods || []).filter((_, i) => i !== idx);
        const updatedFormData = {
          ...formData,
          academicPeriods: updatedPeriods
        };
        setFormData(updatedFormData);
        onSaveSettings(updatedFormData);
      };

      const handleSubmit = (e) => {
        e.preventDefault();
        const payload = { ...formData };
        if (newAdminPassword && newAdminPassword.trim().length > 0) {
          payload.adminPassword = newAdminPassword.trim();
        }
        onSaveSettings(payload);
        setNewAdminPassword('');
      };

      return (
        <div className="bg-white p-6 md:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
          <div>
            <h2 className="text-xl font-extrabold text-slate-800">Pengaturan Aplikasi & Periode SPP</h2>
            <p className="text-xs text-slate-500 mt-1">Atur nama sekolah, tahun ajaran, nama periode aktif, kredensial admin, integrasi Midtrans, dan daftar kelas serta nominalnya.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6 text-xs">
            {/* 1. Informasi Sekolah & Administrator */}
            <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200 space-y-4">
              <h3 className="font-extrabold text-slate-800 text-sm flex items-center gap-2">
                <Icon name="school" size={18} className="text-emerald-600" />
                Informasi Sekolah & Kredensial Admin
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">Nama Sekolah</label>
                  <input
                    type="text"
                    required
                    value={formData.schoolName || ''}
                    onChange={(e) => setFormData({ ...formData, schoolName: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">Tahun Ajaran Default</label>
                  <input
                    type="text"
                    required
                    value={formData.academicYear || ''}
                    onChange={(e) => setFormData({ ...formData, academicYear: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">Alamat Sekolah</label>
                  <input
                    type="text"
                    value={formData.address || ''}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">No. Kontak TU / WA</label>
                  <input
                    type="text"
                    value={formData.phone || ''}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">Nama Admin / Kasir TU</label>
                  <input
                    type="text"
                    value={formData.adminName || ''}
                    onChange={(e) => setFormData({ ...formData, adminName: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">Username Admin</label>
                  <input
                    type="text"
                    value={formData.adminUsername || ''}
                    onChange={(e) => setFormData({ ...formData, adminUsername: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">
                    Ganti Password Admin <span className="normal-case text-slate-400 font-normal">(Opsional)</span>
                  </label>
                  <input
                    type="password"
                    placeholder="Kosongkan jika tidak mau mengubah password"
                    value={newAdminPassword}
                    onChange={(e) => setNewAdminPassword(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">Tanggal Jatuh Tempo SPP (Tiap Bulan)</label>
                  <input
                    type="number"
                    min="1"
                    max="31"
                    value={formData.dueDateDay || 10}
                    onChange={(e) => setFormData({ ...formData, dueDateDay: parseInt(e.target.value) || 10 })}
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* 2. Pengaturan Periode Pembayaran SPP */}
            <div className="p-5 bg-emerald-50/50 rounded-2xl border border-emerald-100 space-y-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-emerald-100/80 pb-3">
                <h3 className="font-extrabold text-emerald-950 text-sm flex items-center gap-2">
                  <Icon name="calendar" size={18} className="text-emerald-700" />
                  Pengaturan Periode Pembayaran SPP (Rentang Bulan & Tahun)
                </h3>
                <span className="text-[11px] font-bold text-emerald-800 bg-emerald-100/80 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                  <Icon name="check-circle" size={12} /> Periode Aktif Berjalan
                </span>
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">Nama Periode SPP Aktif</label>
                <input
                  type="text"
                  value={formData.activePeriodName || `Periode ${formData.academicYear || '2025/2026'}`}
                  onChange={(e) => setFormData({ ...formData, activePeriodName: e.target.value })}
                  placeholder="Contoh: Periode 2025/2026"
                  className="w-full px-3.5 py-2.5 bg-white border border-emerald-300 rounded-xl font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* Input Rentang Periode Aktif */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">Bulan Mulai</label>
                  <select
                    value={formData.startMonth || 'Juli'}
                    onChange={(e) => setFormData({ ...formData, startMonth: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    {ALL_MONTHS.map(m => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">Tahun Mulai</label>
                  <input
                    type="number"
                    value={formData.startYear || 2025}
                    onChange={(e) => setFormData({ ...formData, startYear: parseInt(e.target.value) || 2025 })}
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">Bulan Akhir</label>
                  <select
                    value={formData.endMonth || 'Juni'}
                    onChange={(e) => setFormData({ ...formData, endMonth: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    {ALL_MONTHS.map(m => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">Tahun Akhir</label>
                  <input
                    type="number"
                    value={formData.endYear || 2026}
                    onChange={(e) => setFormData({ ...formData, endYear: parseInt(e.target.value) || 2026 })}
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">Pilihan Semester</label>
                  <select
                    value={formData.semester || 'Semua'}
                    onChange={(e) => setFormData({ ...formData, semester: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-white border border-emerald-300 rounded-xl font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="Semua">Semua Semester (1 Tahun Penuh)</option>
                    <option value="Semester 1">Semester 1 (Ganjil)</option>
                    <option value="Semester 2">Semester 2 (Genap)</option>
                  </select>
                </div>
              </div>

              {/* Preset Cepat Semester */}
              <div className="flex flex-wrap items-center gap-2 pt-1 pb-1">
                <span className="text-[11px] font-black text-emerald-900 flex items-center gap-1">
                  <Icon name="zap" size={13} className="text-amber-500" /> Set Cepat Rentang Semester:
                </span>
                <button
                  type="button"
                  onClick={() => {
                    const y = formData.startYear || 2025;
                    setFormData({
                      ...formData,
                      semester: 'Semester 1',
                      startMonth: 'Juli',
                      startYear: y,
                      endMonth: 'Desember',
                      endYear: y
                    });
                  }}
                  className={`px-3 py-1 rounded-lg text-[11px] font-black border transition-all ${formData.semester === 'Semester 1' ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs' : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'}`}
                >
                  Semester 1 (Juli - Des)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const y = formData.startYear || 2025;
                    const nextY = y + 1;
                    setFormData({
                      ...formData,
                      semester: 'Semester 2',
                      startMonth: 'Januari',
                      startYear: nextY,
                      endMonth: 'Juni',
                      endYear: nextY
                    });
                  }}
                  className={`px-3 py-1 rounded-lg text-[11px] font-black border transition-all ${formData.semester === 'Semester 2' ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs' : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'}`}
                >
                  Semester 2 (Jan - Jun)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const y = formData.startYear || 2025;
                    setFormData({
                      ...formData,
                      semester: 'Semua',
                      startMonth: 'Juli',
                      startYear: y,
                      endMonth: 'Juni',
                      endYear: y + 1
                    });
                  }}
                  className={`px-3 py-1 rounded-lg text-[11px] font-black border transition-all ${formData.semester === 'Semua' || !formData.semester ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs' : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'}`}
                >
                  1 Tahun Penuh (Juli - Jun)
                </button>
              </div>

              {/* Preview Urutan Bulan yang Dihasilkan */}
              <div className="p-3 bg-white rounded-xl border border-emerald-200/70 text-[11px] text-emerald-900 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <span className="font-extrabold mr-1">Rangkaian Bulan Tagihan:</span>
                  {getMonthsList(formData).slice(0, 4).join(', ')} ... {getMonthsList(formData).slice(-2).join(', ')}
                  <span className="ml-2 font-black text-emerald-700">({getMonthsList(formData).length} Bulan)</span>
                </div>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-emerald-100 text-emerald-800 font-black rounded-lg text-[10px]">
                  <Icon name="tag" size={11} />
                  <span>{formData.semester || 'Semua Semester'}</span>
                </div>
              </div>

              {/* Tombol Simpan & Terapkan Rentang Ini Langsung */}
              <div className="flex flex-wrap items-center gap-3 pt-1">
                <button
                  type="button"
                  onClick={handleSaveCurrentAsPreset}
                  className="py-2.5 px-5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-black rounded-xl text-xs transition-all flex items-center gap-2 shadow-md shadow-emerald-600/30"
                >
                  <Icon name="check-circle" size={16} />
                  <span>Simpan & Terapkan Rentang Ini</span>
                </button>
                <p className="text-[11px] text-slate-500 font-medium">
                  Menyimpan rentang bulan & tahun ini ke daftar preset dan menerapkannya langsung ke sistem.
                </p>
              </div>

              {/* Kelola Daftar / Pilihan Periode Tambahan */}
              <div className="pt-3 border-t border-emerald-100/80 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-extrabold text-xs uppercase tracking-wider text-emerald-900">
                    Daftar Pilihan Preset Periode Ajaran
                  </h4>
                  <span className="text-[11px] text-slate-500 font-medium">
                    {(formData.academicPeriods || []).length} Preset Tersimpan
                  </span>
                </div>

                <div className="space-y-2">
                  {(formData.academicPeriods && formData.academicPeriods.length > 0) ? (
                    formData.academicPeriods.map((p, idx) => {
                      const isSelected = p.isActive || (
                        formData.startMonth === p.startMonth && 
                        String(formData.startYear) === String(p.startYear) && 
                        formData.endMonth === p.endMonth && 
                        String(formData.endYear) === String(p.endYear) &&
                        (p.semester || 'Semua') === (formData.semester || 'Semua')
                      );

                      return (
                        <div key={p.id || idx} className={`p-3 rounded-xl border flex flex-wrap items-center justify-between gap-3 ${isSelected ? 'bg-emerald-100/70 border-emerald-300' : 'bg-white border-slate-200'}`}>
                          <div className="flex items-center gap-3">
                            <span className={`w-6 h-6 rounded-lg font-black text-xs flex items-center justify-center ${isSelected ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
                              {idx + 1}
                            </span>
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="font-black text-slate-800">{p.name}</p>
                                <span className="px-2 py-0.5 rounded text-[10px] font-black bg-blue-100 text-blue-800">
                                  {p.semester || 'Semua Semester'}
                                </span>
                              </div>
                              <p className="text-[11px] text-slate-500 mt-0.5">
                                {p.startMonth} {p.startYear} s/d {p.endMonth} {p.endYear}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            {isSelected ? (
                              <span className="px-3 py-1 bg-emerald-600 text-white font-black text-[10px] rounded-lg flex items-center gap-1 shadow-sm">
                                <Icon name="check" size={12} /> Sedang Digunakan
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleApplyPreset(p)}
                                className="px-3 py-1 bg-white hover:bg-emerald-50 text-emerald-700 font-extrabold border border-emerald-300 rounded-lg text-[10px] transition-colors shadow-2xs"
                              >
                                Gunakan Periode Ini
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => handleDeletePreset(idx, p.name)}
                              className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors"
                              title="Hapus Preset"
                            >
                              <Icon name="trash-2" size={14} />
                            </button>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="p-4 bg-white rounded-xl border border-dashed border-emerald-200 text-center text-slate-400 text-xs">
                      Belum ada preset tersimpan. Klik tombol <strong>"Simpan & Terapkan Rentang Ini"</strong> di atas untuk membuat preset baru.
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={handleSaveCurrentAsPreset}
                    className="py-2 px-3.5 bg-emerald-700 hover:bg-emerald-800 text-white font-extrabold rounded-xl text-xs transition-colors flex items-center gap-1.5"
                  >
                    <Icon name="plus" size={14} /> Simpan Rentang Saat Ini Sebagai Preset Baru
                  </button>
                </div>
              </div>
            </div>

            {/* 3. Integrasi Midtrans Payment Gateway */}
            <div className="p-5 bg-indigo-50/50 rounded-2xl border border-indigo-100 space-y-4">
              <h3 className="font-extrabold text-indigo-950 text-sm flex items-center gap-2">
                <Icon name="credit-card" size={18} className="text-indigo-700" />
                Integrasi Payment Gateway Midtrans
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">Midtrans Client Key</label>
                  <input
                    type="text"
                    value={formData.midtransClientKey || ''}
                    onChange={(e) => setFormData({ ...formData, midtransClientKey: e.target.value })}
                    placeholder="SB-Mid-client-..."
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl font-mono text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">Midtrans Server Key</label>
                  <input
                    type="password"
                    value={formData.midtransServerKey || ''}
                    onChange={(e) => setFormData({ ...formData, midtransServerKey: e.target.value })}
                    placeholder="SB-Mid-server-..."
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl font-mono text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
            </div>

            {/* 4. Pengaturan Kelompok Kelas & Besaran Tarif SPP (Input Manual) */}
            <div className="p-5 bg-teal-50/50 rounded-2xl border border-teal-100 space-y-4">
              <h3 className="font-extrabold text-teal-950 text-sm flex items-center gap-2">
                <Icon name="layers" size={18} className="text-teal-700" />
                Pengaturan Kelompok Kelas & Besaran Tarif SPP (Input Manual)
              </h3>
              <p className="text-xs text-slate-500">Anda dapat langsung mengedit nama kelas dan tarif SPP pada kolom di bawah ini, atau menambahkan kelas baru.</p>

              <div className="space-y-3">
                {(formData.customClasses || []).length > 0 ? (
                  formData.customClasses.map((cls, idx) => (
                    <div key={idx} className="flex flex-wrap items-center justify-between gap-3 p-3 bg-white rounded-xl border border-slate-200 shadow-2xs">
                      <div className="flex items-center gap-3 flex-1 min-w-[200px]">
                        <span className="w-7 h-7 bg-teal-100 text-teal-800 rounded-lg font-black flex items-center justify-center text-xs shrink-0">{idx + 1}</span>
                        <input
                          type="text"
                          value={cls.name || ''}
                          onChange={(e) => handleUpdateClass(idx, 'name', e.target.value)}
                          placeholder="Nama Kelas"
                          className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-900 focus:bg-white text-xs"
                        />
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1.5">
                          <span className="font-extrabold text-slate-500 text-xs">Rp</span>
                          <input
                            type="number"
                            value={cls.tarif || 0}
                            onChange={(e) => handleUpdateClass(idx, 'tarif', e.target.value)}
                            placeholder="Tarif SPP"
                            className="w-36 px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl font-bold text-emerald-700 text-right focus:bg-white text-xs"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => handleDeleteClass(idx)}
                          className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors"
                          title="Hapus Kelas"
                        >
                          <Icon name="trash-2" size={16} />
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-4 bg-white rounded-xl border border-dashed border-teal-200 text-center text-slate-400 text-xs">
                    Belum ada kelas yang didaftarkan. Isi form di bawah ini untuk menambahkan kelas baru secara manual.
                  </div>
                )}
              </div>

              <div className="pt-2 flex flex-wrap gap-2 items-center">
                <input
                  type="text"
                  placeholder="Nama Kelas Baru (Contoh: Kelas B2)"
                  value={newClassName}
                  onChange={(e) => setNewClassName(e.target.value)}
                  className="flex-1 px-3.5 py-2 bg-white border border-slate-300 rounded-xl font-bold text-slate-900"
                />
                <input
                  type="number"
                  placeholder="Tarif SPP (Rp)"
                  value={newClassTarif}
                  onChange={(e) => setNewClassTarif(e.target.value)}
                  className="w-36 px-3.5 py-2 bg-white border border-slate-300 rounded-xl font-bold text-slate-900"
                />
                <button
                  type="button"
                  onClick={handleAddClass}
                  className="py-2 px-4 bg-teal-700 hover:bg-teal-800 text-white font-extrabold rounded-xl shadow-sm transition-all"
                >
                  + Tambah Nama Kelas
                </button>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 flex justify-end">
              <button
                type="submit"
                className="py-3.5 px-6 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-2xl shadow-lg shadow-emerald-600/30 transition-all flex items-center gap-2 text-sm"
              >
                <Icon name="save" size={18} />
                <span>Simpan Seluruh Pengaturan</span>
              </button>
            </div>
          </form>
        </div>
      );
    }

    function KuitansiModal({ transaction, settings, onClose }) {
      if (!transaction) return null;

      return (
        <div className="fixed inset-0 bg-slate-950/75 backdrop-blur-md z-[9999] flex items-center justify-center p-4 overflow-y-auto">
          <div 
            id="kuitansi-print-area" 
            className="printable-kuitansi ticket-wrapper max-w-sm sm:max-w-md w-full bg-white rounded-[32px] overflow-hidden shadow-2xl relative animate-in zoom-in-95 duration-200 border border-slate-200"
          >
            {/* Close Button (Hidden on Print) */}
            <button 
              onClick={onClose} 
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors print:hidden z-20"
              title="Tutup"
            >
              <Icon name="x" size={20} />
            </button>

            {/* Top Illustration & Header (Image 2) */}
            {/* Top Illustration & Header */}
            <div className="pt-8 pb-4 px-6 text-center space-y-2">
              <div className="w-16 h-16 mx-auto relative flex items-center justify-center mb-1">
                <div className="w-16 h-16 rounded-2xl bg-white border-2 border-blue-200 shadow-md p-2 flex items-center justify-center relative">
                  <img src="/logo.png" alt="PAUD Setia Bhakti" className="w-full h-full object-contain" />
                  <div className="absolute -bottom-2 -right-2 w-7 h-7 bg-emerald-500 rounded-full flex items-center justify-center border-2 border-white shadow-md text-white">
                    <Icon name="check" size={16} className="text-white stroke-[3]" />
                  </div>
                </div>
              </div>

              <h3 className="text-2xl font-black text-slate-900 tracking-tight">Payment Successful</h3>
              <p className="text-xs text-blue-900 font-extrabold uppercase tracking-wide">{settings.schoolName || 'PAUD SETIA BHAKTI'}</p>
              <div className="inline-block px-3 py-1 bg-blue-50 text-blue-700 font-extrabold text-[10px] rounded-full uppercase tracking-wider border border-blue-200">
                Kuitansi Sah Pembayaran SPP
              </div>
            </div>

            {/* Perforation Divider 1 with Left/Right Notches */}
            <div className="ticket-divider-row">
              <div className="ticket-notch ticket-notch-left"></div>
              <div className="ticket-perforation"></div>
              <div className="ticket-notch ticket-notch-right"></div>
            </div>

            {/* Section 1: Payment Details */}
            <div className="px-7 py-3 space-y-2.5 text-xs">
              <p className="font-extrabold text-slate-800 text-[13px] mb-2 tracking-tight">Payment Details</p>

              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-medium">Invoice Number</span>
                <span className="font-mono font-bold text-slate-800">: {transaction.kuitansiNo || '-'}</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-medium">Order Time</span>
                <span className="font-semibold text-slate-800">: {transaction.date || '-'}</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-medium">Payment Method</span>
                <span className="font-bold text-slate-800">: {transaction.method || 'Tunai (di TU)'}</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-medium">Payment Status</span>
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-800">:</span>
                  <span className="px-2.5 py-0.5 bg-emerald-500 text-white font-extrabold rounded-md text-[11px] shadow-sm">
                    Successful
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-medium">Amount</span>
                <span className="font-black text-slate-900 text-sm">: {formatRupiah(transaction.amount)}</span>
              </div>
            </div>

            {/* Perforation Divider 2 with Left/Right Notches */}
            <div className="ticket-divider-row">
              <div className="ticket-notch ticket-notch-left"></div>
              <div className="ticket-perforation"></div>
              <div className="ticket-notch ticket-notch-right"></div>
            </div>

            {/* Section 2: Product Details */}
            <div className="px-7 py-3 space-y-2.5 text-xs">
              <p className="font-extrabold text-slate-800 text-[13px] mb-2 tracking-tight">Product Details</p>

              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-medium truncate max-w-[160px]">SPP {transaction.studentName}</span>
                <span className="font-bold text-slate-800">: {formatRupiah(transaction.amount)}</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-medium">Kelas & Bulan</span>
                <span className="font-semibold text-slate-800">: Kelas {transaction.kelas || 'B'} • {transaction.month}</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-medium">Delivery / Admin</span>
                <span className="font-semibold text-emerald-600">: Rp 0 (Bebas Biaya)</span>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                <span className="font-black text-slate-900 text-xs">Total Amount</span>
                <span className="font-black text-blue-700 text-base">: {formatRupiah(transaction.amount)}</span>
              </div>
            </div>

            {/* Serrated Bottom Edge */}
            <div className="ticket-bottom-sawtooth mt-2"></div>

            {/* Action Buttons */}
            <div className="p-6 bg-slate-50/80 border-t border-slate-100 flex flex-col gap-2 print:hidden">
              <button
                type="button"
                onClick={() => window.print()}
                className="w-full py-3.5 px-4 bg-slate-900 hover:bg-slate-800 text-white font-extrabold rounded-2xl text-xs shadow-lg shadow-slate-900/15 transition-all flex items-center justify-center gap-2 hover:scale-[1.01] active:scale-[0.99]"
              >
                <Icon name="download" size={16} />
                <span>Download PDF Receipt</span>
              </button>
              <button
                type="button"
                onClick={onClose}
                className="w-full py-2 text-slate-500 hover:text-slate-800 text-xs font-bold transition-colors"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      );
    }

    function MidtransModal({ bill, student, settings, onClose, onConfirmSuccess }) {
      const [method, setMethod] = useState('QRIS / GoPay / OVO');
      const [isProcessing, setIsProcessing] = useState(false);

      const handleConfirm = () => {
        setIsProcessing(true);
        setTimeout(() => {
          setIsProcessing(false);
          onConfirmSuccess(bill, method);
        }, 600);
      };

      return (
        <div className="fixed inset-0 bg-slate-950/75 backdrop-blur-md z-[9999] flex items-center justify-center p-4">
          <div className="bg-white rounded-[32px] max-w-md w-full p-6 sm:p-8 space-y-5 shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-200 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-48 h-48 bg-blue-100/50 rounded-full blur-3xl -z-10 pointer-events-none"></div>

            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-tr from-blue-600 to-sky-400 text-white rounded-2xl flex items-center justify-center shadow-md shadow-blue-500/25">
                  <Icon name="credit-card" size={24} />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 text-base">Pembayaran SPP Online</h3>
                  <p className="text-xs text-slate-500 font-medium">Gerbang Pembayaran Otomatis</p>
                </div>
              </div>
              <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100">
                <Icon name="x" size={20} />
              </button>
            </div>

            {/* Summary Tagihan */}
            <div className="p-4 bg-gradient-to-r from-blue-50 via-sky-50 to-indigo-50 rounded-2xl border border-blue-100/80 space-y-1">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-slate-600">Murid:</span>
                <span className="font-black text-slate-900">{student.name} ({student.kelas})</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-slate-600">Tagihan Bulan:</span>
                <span className="font-black text-blue-700">{bill.month}</span>
              </div>
              <div className="pt-2 border-t border-blue-200/60 flex justify-between items-center">
                <span className="text-xs font-bold text-slate-600">Total Pembayaran</span>
                <span className="text-xl font-black text-blue-900">{formatRupiah(bill.amount)}</span>
              </div>
            </div>

            {/* Payment Method Selector */}
            <div className="space-y-2">
              <label className="block text-xs font-black text-slate-700 uppercase tracking-wider">
                Pilih Metode Pembayaran
              </label>

              <div className="space-y-2">
                {[
                  { id: 'QRIS / GoPay / OVO', title: 'QRIS & e-Wallet', desc: 'GoPay, OVO, ShopeePay, Dana (Instan)', icon: 'smartphone' },
                  { id: 'Transfer Bank (VA BCA/BNI/BRI)', title: 'Virtual Account Bank', desc: 'BCA, Mandiri, BNI, BRI, Permata', icon: 'building-2' },
                  { id: 'Tunai (di Kantor TU)', title: 'Bayar Tunai di TU', desc: 'Langsung melalui staf tata usaha sekolah', icon: 'banknote' }
                ].map((item) => (
                  <label
                    key={item.id}
                    onClick={() => setMethod(item.id)}
                    className={`p-3 rounded-2xl border flex items-center justify-between cursor-pointer transition-all ${
                      method === item.id 
                        ? 'bg-blue-50/70 border-blue-500 shadow-sm' 
                        : 'bg-slate-50 border-slate-200 hover:bg-slate-100/70'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${method === item.id ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-600'}`}>
                        <Icon name={item.icon} size={18} />
                      </div>
                      <div>
                        <p className="font-extrabold text-xs text-slate-800">{item.title}</p>
                        <p className="text-[11px] text-slate-500 font-medium">{item.desc}</p>
                      </div>
                    </div>
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${method === item.id ? 'border-blue-600 bg-blue-600' : 'border-slate-300'}`}>
                      {method === item.id && <div className="w-2 h-2 rounded-full bg-white"></div>}
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Confirm CTA */}
            <div className="flex gap-3 pt-2">
              <button 
                type="button" 
                onClick={onClose} 
                disabled={isProcessing}
                className="py-3 px-4 bg-slate-100 hover:bg-slate-200 font-bold rounded-2xl text-xs text-slate-600 transition-colors"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                disabled={isProcessing}
                className="flex-1 py-3.5 px-6 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-black rounded-2xl text-xs shadow-lg shadow-blue-500/25 transition-all flex items-center justify-center gap-2 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50"
              >
                {isProcessing ? (
                  <>
                    <Icon name="loader-2" size={16} className="animate-spin" />
                    <span>Memproses Pembayaran...</span>
                  </>
                ) : (
                  <>
                    <Icon name="check-circle" size={16} />
                    <span>Konfirmasi Pembayaran ({formatRupiah(bill.amount)})</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      );
    }

    // ==========================================
    // 9. MAIN APP CONTROLLER WITH SUPABASE SYNC
    // ==========================================
    
    function AdminCatatanView({ students, notes, onAddNote, onDeleteNote }) {
      const [selectedStudent, setSelectedStudent] = useState('');
      const [content, setContent] = useState('');

      const handleSubmit = (e) => {
        e.preventDefault();
        if (!selectedStudent || !content.trim()) return;
        const student = students.find(s => s.id === selectedStudent);
        if (!student) return;
        
        onAddNote({
          studentId: student.id,
          studentName: student.name,
          category: 'Catatan TU',
          title: `Catatan Tata Usaha (TU)`,
          content: content.trim(),
          date: new Date().toLocaleDateString('id-ID'),
          comments: []
        });
        setContent('');
        setSelectedStudent('');
      };

      return (
        <div className="space-y-6 animate-in fade-in duration-300">
          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-black text-slate-800 flex items-center gap-3"><Icon name="edit-3" size={28} className="text-teal-600"/> Catatan Siswa (Tata Usaha)</h2>
              <p className="text-sm text-slate-500 font-medium mt-1">Pilih nama siswa dan langsung ketik pesan atau catatan TU yang akan masuk ke portal wali murid.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1">
              <form onSubmit={handleSubmit} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-5 sticky top-24">
                <h3 className="font-black text-slate-800 border-b border-slate-100 pb-3 flex items-center gap-2">
                  <Icon name="send" size={18} className="text-teal-600" />
                  Kirim Catatan Siswa
                </h3>
                
                <div className="space-y-2">
                  <label className="block text-xs font-black text-slate-700 uppercase">Pilih Siswa</label>
                  <select 
                    required 
                    value={selectedStudent} 
                    onChange={e => setSelectedStudent(e.target.value)} 
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-300 rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-teal-500"
                  >
                    <option value="">-- Pilih Siswa --</option>
                    {students.map(s => (
                      <option key={s.id} value={s.id}>{s.name} ({s.nis} - {s.kelas})</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="block text-xs font-black text-slate-700 uppercase">Isi Pesan / Catatan TU</label>
                  <textarea 
                    required 
                    value={content} 
                    onChange={e => setContent(e.target.value)} 
                    rows="6" 
                    placeholder="Tuliskan catatan atau pesan TU langsung untuk siswa ini..." 
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-300 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none"
                  ></textarea>
                </div>

                <button type="submit" className="w-full py-3.5 bg-teal-600 hover:bg-teal-700 text-white font-black rounded-xl transition-all shadow-md flex items-center justify-center gap-2">
                  <Icon name="send" size={18} /> Kirim Pesan ke Siswa
                </button>
              </form>
            </div>

            <div className="lg:col-span-2 space-y-4">
               {notes.length === 0 ? (
                 <div className="bg-white p-8 rounded-3xl border border-slate-200 text-center shadow-sm">
                   <div className="w-16 h-16 bg-slate-100 text-slate-400 rounded-2xl flex items-center justify-center mx-auto mb-3"><Icon name="inbox" size={32}/></div>
                   <p className="text-slate-500 font-bold">Belum ada catatan siswa yang dikirimkan.</p>
                 </div>
               ) : (
                 notes.sort((a,b) => new Date(b.created_at || Date.now()) - new Date(a.created_at || Date.now())).map(n => (
                   <div key={n.id} className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                     <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex justify-between items-start">
                       <div>
                         <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-teal-100 text-teal-800 rounded-lg text-[10px] font-black uppercase mb-2">
                           <Icon name="tag" size={12} /> {n.category || 'Catatan TU'}
                         </div>
                         <h4 className="font-black text-slate-800 text-lg">Siswa: {n.studentName}</h4>
                         <p className="text-xs text-slate-500 font-bold mt-1"><Icon name="calendar" size={12} className="inline mr-1"/>{n.date}</p>
                       </div>
                       <button onClick={() => onDeleteNote && onDeleteNote(n.id)} className="p-2 bg-rose-50 text-rose-600 hover:bg-rose-500 hover:text-white rounded-xl transition-colors" title="Hapus Catatan">
                         <Icon name="trash-2" size={16} />
                       </button>
                     </div>
                     <div className="p-5 text-sm text-slate-700 font-medium whitespace-pre-wrap leading-relaxed">
                       {n.content}
                     </div>
                     <div className="p-4 bg-slate-50 border-t border-slate-100">
                        <p className="text-xs font-black text-slate-500 uppercase mb-2"><Icon name="message-circle" size={12} className="inline mr-1"/> Balasan Wali Murid ({n.comments ? n.comments.length : 0})</p>
                        {n.comments && n.comments.length > 0 ? (
                          <div className="space-y-2 mt-3">
                             {n.comments.map((cm, i) => (
                               <div key={i} className="bg-white p-3 border border-slate-200 rounded-xl">
                                  <p className="text-[10px] font-black text-slate-800">{cm.sender}</p>
                                  <p className="text-xs text-slate-600 font-medium">{cm.text}</p>
                               </div>
                             ))}
                          </div>
                        ) : (
                          <p className="text-xs text-slate-400 italic">Belum ada tanggapan dari wali murid.</p>
                        )}
                     </div>
                   </div>
                 ))
               )}
            </div>
          </div>
        </div>
      );
    }

    // ==========================================
    // 7.6. MONITOR TUNGGAKAN & FOLLOW-UP WHATSAPP
    // ==========================================
    function AdminTunggakanView({ students, transactions, settings, navigateTo }) {
      const [filterKelas, setFilterKelas] = useState('Semua Kelas');
      const [filterMonth, setFilterMonth] = useState('Semua Bulan');
      const [filterStatus, setFilterStatus] = useState('tunggakan');
      const [searchQuery, setSearchQuery] = useState('');
      const [copiedStudentId, setCopiedStudentId] = useState(null);

      const periodsList = useMemo(() => {
        const list = settings?.periods ? [...settings.periods] : [];
        const sStartM = settings?.startMonth || 'Juli';
        const sStartY = parseInt(settings?.startYear) || 2026;
        const sEndM = settings?.endMonth || 'Juni';
        const sEndY = parseInt(settings?.endYear) || 2027;

        if (list.length === 0) {
          list.push({
            id: 'active-default',
            name: `Periode ${sStartM} ${sStartY} - ${sEndM} ${sEndY}`,
            startMonth: sStartM,
            startYear: sStartY,
            endMonth: sEndM,
            endYear: sEndY,
            semester: settings?.semester || 'Semua',
            isActive: true
          });
        }
        return list;
      }, [settings]);

      const activePeriod = useMemo(() => {
        return periodsList.find(p => p.isActive) || periodsList[0] || null;
      }, [periodsList]);

      const [filterPeriod, setFilterPeriod] = useState(() => {
        return activePeriod ? String(activePeriod.id) : 'all';
      });

      useEffect(() => {
        if (activePeriod && (!filterPeriod || filterPeriod === 'all')) {
          setFilterPeriod(String(activePeriod.id));
        }
      }, [activePeriod]);

      const selectedPeriodObj = useMemo(() => {
        const curId = filterPeriod || (activePeriod ? String(activePeriod.id) : 'all');
        if (curId === 'all') return null;
        return periodsList.find(p => String(p.id) === String(curId)) || null;
      }, [filterPeriod, activePeriod, periodsList]);

      const periodStartYear = useMemo(() => {
        if (selectedPeriodObj) return parseInt(selectedPeriodObj.startYear) || 2026;
        return parseInt(settings?.startYear) || 2026;
      }, [selectedPeriodObj, settings?.startYear]);

      // Semester otomatis terisi dari pengaturan (settings.semester)
      const defaultSemester = useMemo(() => {
        const s = (settings?.semester || '').toLowerCase();
        if (s.includes('1') || s.includes('ganjil')) return '1';
        if (s.includes('2') || s.includes('genap')) return '2';
        return 'all';
      }, [settings?.semester]);

      const [filterSemester, setFilterSemester] = useState(defaultSemester);

      useEffect(() => {
        setFilterSemester(defaultSemester);
      }, [defaultSemester]);

      const baseAcademicMonths = useMemo(() => {
        return selectedPeriodObj ? getMonthsList(selectedPeriodObj) : getMonthsList(settings);
      }, [selectedPeriodObj, settings]);
      const academicMonths = useMemo(() => getSemesterMonths(baseAcademicMonths, filterSemester), [baseAcademicMonths, filterSemester]);
      const activeStudents = useMemo(() => students.filter(s => s.statusAktif !== false), [students]);

      // Bulan yang SUDAH BERJALAN / JATUH TEMPO s/d tanggal hari ini dalam tahun ajaran ini
      const dueAcademicMonths = useMemo(() => {
        return academicMonths.filter(m => isMonthDueOrElapsed(m, new Date(), settings?.dueDateDay || 10));
      }, [academicMonths, settings?.dueDateDay]);

      // Calculate debt status per student
      const studentDebtList = useMemo(() => {
        return activeStudents.map(student => {
          const studentTrx = transactions.filter(t => 
            (t.studentId === student.id || (t.studentName && t.studentName.toLowerCase().trim() === student.name.toLowerCase().trim())) &&
            (t.status === 'Lunas' || t.status === 'lunas' || t.status === 'Berhasil' || t.status === 'Sukses')
          );
          const paidMonths = studentTrx.map(t => (t.month || '').trim().toLowerCase());
          
          // Yang menunggak HANYA bulan yang telah jatuh tempo/berjalan s/d saat ini yang belum dibayar
          const unpaidMonths = dueAcademicMonths.filter(m => {
            const mLower = m.trim().toLowerCase();
            return !paidMonths.some(pm => pm === mLower || (pm && mLower.startsWith(pm)));
          });
          const futureUnpaidMonths = academicMonths.filter(m => 
            !isMonthDueOrElapsed(m, new Date(), settings?.dueDateDay || 10) && 
            !paidMonths.some(pm => pm === m.trim().toLowerCase() || (pm && m.trim().toLowerCase().startsWith(pm)))
          );
          const tarif = Number(student.tarif) || 0;
          const totalDebt = unpaidMonths.length * tarif;
          const isLunas = unpaidMonths.length === 0;

          return {
            student,
            unpaidMonths,
            futureUnpaidMonths,
            paidMonthsCount: paidMonths.length,
            totalDebt,
            isLunas
          };
        });
      }, [activeStudents, transactions, academicMonths, dueAcademicMonths, periodStartYear]);

      const totalStudents = activeStudents.length;
      const studentsWithDebt = studentDebtList.filter(item => !item.isLunas);
      const studentsLunas = studentDebtList.filter(item => item.isLunas);
      const totalNominalTunggakan = studentsWithDebt.reduce((sum, item) => sum + item.totalDebt, 0);
      const pelunasanPercentage = totalStudents > 0 ? Math.round((studentsLunas.length / totalStudents) * 100) : 100;

      const filteredList = useMemo(() => {
        return studentDebtList.filter(item => {
          const { student, unpaidMonths, isLunas } = item;
          if (filterStatus === 'tunggakan' && isLunas) return false;
          if (filterStatus === 'lunas' && !isLunas) return false;
          
          if (filterKelas !== 'Semua Kelas' && student.kelas !== filterKelas) return false;

          if (filterMonth !== 'Semua Bulan') {
            const hasMonthUnpaid = unpaidMonths.some(m => m.toLowerCase().includes(filterMonth.toLowerCase()));
            if (!hasMonthUnpaid) return false;
          }

          if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            const matchName = student.name.toLowerCase().includes(q);
            const matchNis = (student.nis || '').toLowerCase().includes(q);
            const matchWali = (student.wali || '').toLowerCase().includes(q);
            if (!matchName && !matchNis && !matchWali) return false;
          }

          return true;
        });
      }, [studentDebtList, filterStatus, filterKelas, filterMonth, searchQuery]);

      const generateWhatsAppMessage = (student, unpaidMonths, totalDebt) => {
        const monthsStr = unpaidMonths.length > 0 ? unpaidMonths.join(', ') : '-';
        
        return `Yth. Bapak/Ibu ${student.wali || 'Wali Murid'} dari ananda *${student.name}* (Kelas: ${student.kelas}, NIS: ${student.nis}),\n\n` +
          `Semoga senantiasa dalam keadaan sehat dan penuh berkah.\n\n` +
          `Kami dari Bagian Tata Usaha (TU) *${settings.schoolName}* bermaksud menginformasikan status pembayaran SPP yang belum terselesaikan s/d bulan berjalan ini:\n\n` +
          `📌 *Rincian Tagihan SPP:*\n` +
          `• Tarif SPP: *${formatRupiah(student.tarif)}/bulan*${student.keringanan_note ? ` (Keringanan: ${student.keringanan_note})` : ''}\n` +
          `• Bulan Tertunggak (s/d Bulan Berjalan): *${monthsStr}* (${unpaidMonths.length} bulan)\n` +
          `• Total Tagihan: *${formatRupiah(totalDebt)}*\n\n` +
          `Pembayaran dapat ditransfer ke rekening resmi sekolah atau diserahkan langsung di kantor TU.\n` +
          `Apabila Bapak/Ibu telah melakukan pembayaran sebelumnya, mohon konfirmasikan bukti transfer kepada kami.\n\n` +
          `Terima kasih banyak atas perhatian dan kerja samanya. 🙏\n\n` +
          `_Tata Usaha ${settings.schoolName}_`;
      };

      const handleWhatsAppClick = (student, unpaidMonths, totalDebt) => {
        if (!student.telepon) {
          alert(`Nomor telepon / WhatsApp untuk wali murid ${student.name} belum didaftarkan di data murid. Silakan lengkapi nomor telepon pada menu Data Murid.`);
          return;
        }

        let cleanPhone = student.telepon.replace(/[^0-9]/g, '');
        if (cleanPhone.startsWith('0')) {
          cleanPhone = '62' + cleanPhone.slice(1);
        } else if (cleanPhone.startsWith('8')) {
          cleanPhone = '62' + cleanPhone;
        }

        const message = generateWhatsAppMessage(student, unpaidMonths, totalDebt);
        const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
        window.open(url, '_blank');
      };

      const handleCopyMessage = (student, unpaidMonths, totalDebt) => {
        const message = generateWhatsAppMessage(student, unpaidMonths, totalDebt);
        navigator.clipboard.writeText(message).then(() => {
          setCopiedStudentId(student.id);
          setTimeout(() => setCopiedStudentId(null), 3000);
        }).catch(() => {
          alert("Gagal menyalin pesan.");
        });
      };

      const availableClasses = useMemo(() => {
        const fromSettings = (settings.customClasses || []).map(c => c.name);
        const fromStudents = activeStudents.map(s => s.kelas).filter(Boolean);
        return Array.from(new Set([...fromSettings, ...fromStudents]));
      }, [settings, activeStudents]);

      return (
        <div className="space-y-6 animate-in fade-in duration-300">
          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-50 text-amber-800 rounded-full text-[11px] font-black uppercase mb-2 border border-amber-200">
                <Icon name="phone-call" size={14} className="text-amber-600" /> Follow-Up Tagihan SPP
              </div>
              <h2 className="text-2xl font-black text-slate-800 tracking-tight">Siswa Belum Bayar & Follow Up WhatsApp</h2>
              <p className="text-xs text-slate-500 font-medium mt-1">
                Pantau siswa yang memiliki tunggakan SPP s/d bulan berjalan dan hubungi wali murid langsung via WhatsApp 1-klik pesan terformat.
              </p>
            </div>

            <button
              onClick={() => navigateTo('transaksi')}
              className="py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-xl text-xs transition-colors flex items-center gap-2 shadow-sm shrink-0"
            >
              <Icon name="plus-circle" size={16} /> Catat Bayar Manual
            </button>
          </div>

          {/* 4 Stat Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm flex items-center gap-4 relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1 bg-rose-500"></div>
              <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                <Icon name="alert-circle" size={24} />
              </div>
              <div>
                <p className="text-[11px] font-bold text-slate-400 uppercase">Siswa Belum Lunas</p>
                <p className="text-2xl font-black text-rose-600 mt-0.5">{studentsWithDebt.length} Siswa</p>
              </div>
            </div>

            <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm flex items-center gap-4 relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1 bg-amber-500"></div>
              <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                <Icon name="dollar-sign" size={24} />
              </div>
              <div>
                <p className="text-[11px] font-bold text-slate-400 uppercase">Total Tunggakan</p>
                <p className="text-xl font-black text-amber-700 mt-0.5">{formatRupiah(totalNominalTunggakan)}</p>
              </div>
            </div>

            <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm flex items-center gap-4 relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1 bg-emerald-500"></div>
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                <Icon name="check-circle-2" size={24} />
              </div>
              <div>
                <p className="text-[11px] font-bold text-slate-400 uppercase">Siswa Sudah Lunas</p>
                <p className="text-2xl font-black text-emerald-700 mt-0.5">{studentsLunas.length} Siswa</p>
              </div>
            </div>

            <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm flex items-center gap-4 relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1 bg-blue-500"></div>
              <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                <Icon name="pie-chart" size={24} />
              </div>
              <div>
                <p className="text-[11px] font-bold text-slate-400 uppercase">Tingkat Pelunasan</p>
                <p className="text-2xl font-black text-blue-700 mt-0.5">{pelunasanPercentage}%</p>
              </div>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex flex-col lg:flex-row gap-3 items-center justify-between">
            <div className="relative w-full lg:w-72">
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Cari nama siswa, NIS, wali..."
                className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <Icon name="search" size={14} className="absolute left-3 top-3.5 text-slate-400" />
            </div>

            <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto text-xs font-bold">
              <select
                value={filterStatus}
                onChange={e => setFilterStatus(e.target.value)}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="tunggakan">Hanya Belum Lunas ({studentsWithDebt.length})</option>
                <option value="semua">Semua Siswa ({totalStudents})</option>
                <option value="lunas">Hanya Sudah Lunas ({studentsLunas.length})</option>
              </select>

              <select
                value={filterPeriod || (activePeriod ? String(activePeriod.id) : 'all')}
                onChange={e => setFilterPeriod(e.target.value)}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">Semua Periode</option>
                {periodsList.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.name || `Periode ${p.startMonth} ${p.startYear} - ${p.endMonth} ${p.endYear}`} {p.isActive ? '(Aktif)' : ''}
                  </option>
                ))}
              </select>

              <select
                value={filterSemester}
                onChange={e => setFilterSemester(e.target.value)}
                className="px-3 py-2 bg-blue-50/70 border border-blue-200 rounded-xl text-blue-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">Semua Semester</option>
                <option value="1">Semester 1 (Ganjil)</option>
                <option value="2">Semester 2 (Genap)</option>
              </select>

              <select
                value={filterKelas}
                onChange={e => setFilterKelas(e.target.value)}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="Semua Kelas">Semua Kelas</option>
                {availableClasses.map(cls => (
                  <option key={cls} value={cls}>{cls}</option>
                ))}
              </select>

              <select
                value={filterMonth}
                onChange={e => setFilterMonth(e.target.value)}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="Semua Bulan">Semua Bulan Periode</option>
                {academicMonths.map(m => {
                  const isDue = isMonthDueOrElapsed(m, new Date(), settings?.dueDateDay || 10);
                  return (
                    <option key={m} value={m}>
                      {m} {isDue ? '(Berjalan/Due)' : '(Mendatang)'}
                    </option>
                  );
                })}
              </select>
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            {filteredList.length === 0 ? (
              <div className="p-12 text-center flex flex-col items-center justify-center">
                <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-3">
                  <Icon name="check-circle" size={32} />
                </div>
                <h3 className="font-black text-slate-800 text-lg">Tidak Ada Data Tertunggak</h3>
                <p className="text-xs text-slate-500 font-medium mt-1">
                  {filterStatus === 'tunggakan' 
                    ? 'Semua murid pada filter ini telah melunasi pembayaran SPP s/d bulan berjalan.' 
                    : 'Tidak ada murid yang sesuai dengan filter pencarian.'}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {filteredList.map(({ student, unpaidMonths, futureUnpaidMonths, totalDebt, isLunas }) => (
                  <div key={student.id} className="p-5 sm:p-6 hover:bg-slate-50/70 transition-colors flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div className="flex items-start gap-4 min-w-[280px]">
                      <div className="w-12 h-12 rounded-2xl bg-teal-100 border border-teal-200 flex items-center justify-center font-bold text-teal-800 text-lg shrink-0 overflow-hidden shadow-inner">
                        {student.fotoUrl ? (
                          <img src={student.fotoUrl} alt={student.name} className="w-full h-full object-cover" />
                        ) : (
                          student.name.charAt(0).toUpperCase()
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-black text-slate-800 text-base">{student.name}</h4>
                          <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded-md text-[10px] font-extrabold uppercase">
                            {student.kelas}
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 text-xs font-bold text-slate-500 mt-0.5">
                          <span>NIS: <strong className="text-slate-700">{student.nis}</strong></span>
                          <span>•</span>
                          <span>Tarif: <strong className="text-blue-700 font-black">{formatRupiah(student.tarif)}/bln</strong></span>
                          {student.keringanan_note && (
                            <span className="px-2 py-0.5 bg-amber-100 text-amber-900 rounded-md text-[10px] font-black border border-amber-200">
                              Keringanan: {student.keringanan_note}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-1.5 text-xs text-slate-600">
                          <span className="font-medium">Wali: <strong className="text-slate-800">{student.wali || '-'}</strong></span>
                          {student.telepon ? (
                            <span className="inline-flex items-center gap-1 font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100 text-[11px]">
                              <Icon name="phone" size={11} /> {student.telepon}
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold text-rose-500 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-100">
                              No WA Belum Diisi
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex-1 lg:px-4">
                      {isLunas ? (
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-100 text-emerald-800 rounded-full text-xs font-black">
                          <Icon name="check-circle-2" size={14} /> Lunas s/d Bulan Berjalan
                        </div>
                      ) : (
                        <div className="space-y-1.5">
                          <p className="text-[11px] font-black text-rose-600 uppercase tracking-wider flex items-center gap-1">
                            <Icon name="clock" size={12} /> {unpaidMonths.length} Bulan Menunggak (s/d Bulan Berjalan):
                          </p>
                          <div className="flex flex-wrap gap-1.5">
                            {unpaidMonths.map((m, idx) => (
                              <span key={idx} className="px-2.5 py-1 bg-rose-50 text-rose-700 border border-rose-200 rounded-lg text-[11px] font-extrabold">
                                {m}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between lg:justify-end gap-3 shrink-0 pt-3 lg:pt-0 border-t lg:border-t-0 border-slate-100">
                      <div className="text-left lg:text-right">
                        <p className="text-[10px] font-bold text-slate-400 uppercase">Total Tagihan</p>
                        <p className={`text-lg font-black ${isLunas ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {isLunas ? 'Rp 0' : formatRupiah(totalDebt)}
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        {!isLunas && (
                          <>
                            <button
                              type="button"
                              onClick={() => handleWhatsAppClick(student, unpaidMonths, totalDebt)}
                              className="px-3.5 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-black rounded-xl text-xs transition-all shadow-md shadow-emerald-600/25 flex items-center gap-1.5"
                              title="Kirim pesan penagihan langsung ke WhatsApp wali murid"
                            >
                              <Icon name="message-circle" size={16} />
                              <span>Chat WA</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleCopyMessage(student, unpaidMonths, totalDebt)}
                              className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-colors border border-slate-200"
                              title="Salin Pesan Follow Up"
                            >
                              <Icon name={copiedStudentId === student.id ? "check" : "copy"} size={16} className={copiedStudentId === student.id ? "text-emerald-600" : ""} />
                            </button>
                          </>
                        )}

                        <button
                          type="button"
                          onClick={() => navigateTo('transaksi')}
                          className="px-3 py-2.5 bg-blue-50 hover:bg-blue-100 text-blue-700 font-extrabold rounded-xl text-xs transition-colors border border-blue-200"
                          title="Buka menu catat pembayaran manual"
                        >
                          Bayar
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      );
    }
  
    function KickedOutModal({ info, onClose }) {
      if (!info) return null;
      return (
        <div className="fixed inset-0 bg-slate-900/75 backdrop-blur-md z-[9999] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-[32px] max-w-md w-full p-6 sm:p-8 space-y-5 shadow-2xl border border-rose-100 text-center relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-amber-500 via-rose-500 to-rose-600"></div>

            <div className="w-16 h-16 bg-rose-50 text-rose-600 rounded-3xl flex items-center justify-center mx-auto shadow-inner ring-8 ring-rose-50/50">
              <Icon name="alert-triangle" size={32} />
            </div>

            <div className="space-y-2">
              <h3 className="text-xl font-black text-slate-800 tracking-tight">
                Akun Login di Perangkat Lain
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                Sesi akun <span className="font-bold text-slate-900 underline decoration-rose-400">{info.userName}</span> pada perangkat ini telah dinonaktifkan otomatis.
              </p>
            </div>

            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 text-left space-y-2 text-xs">
              <div className="flex items-center justify-between text-slate-500 font-semibold">
                <span>Perangkat Baru:</span>
                <span className="font-black text-slate-800 bg-white px-2.5 py-1 rounded-lg border border-slate-200 shadow-sm flex items-center gap-1.5">
                  <Icon name="smartphone" size={14} className="text-blue-600" />
                  {info.device || 'Perangkat Lain'}
                </span>
              </div>
              <div className="flex items-center justify-between text-slate-500 font-semibold">
                <span>Waktu Login:</span>
                <span className="font-bold text-slate-700">{info.time || 'Baru saja'}</span>
              </div>
            </div>

            <p className="text-[11px] text-slate-400 italic">
              Keamanan: Satu akun hanya dapat digunakan aktif pada satu perangkat dalam satu waktu.
            </p>

            <button
              onClick={onClose}
              className="w-full py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-black rounded-2xl shadow-lg shadow-blue-500/25 transition-all text-sm flex items-center justify-center gap-2 active:scale-95"
            >
              <Icon name="log-in" size={18} />
              Mengerti & Masuk Kembali
            </button>
          </div>
        </div>
      );
    }

    function App() {
      // Isolasi sesi per-tab (sessionStorage) dan per-role (localStorage) agar refresh admin tidak menimpa user
      const [currentUser, setCurrentUser] = useState(() => {
        try {
          // 1. Prioritas utama: Cek sesi aktif tab ini (sessionStorage)
          const tabSession = sessionStorage.getItem('spp_tab_session');
          if (tabSession) {
            return JSON.parse(tabSession);
          }

          // 2. Cek apakah URL tab ini dibuka spesifik untuk role tertentu
          const urlParams = new URLSearchParams(window.location.search);
          const roleParam = urlParams.get('role') || (window.location.hash.includes('admin') ? 'admin' : (window.location.hash.includes('wali') || window.location.hash.includes('parent') ? 'parent' : null));

          if (roleParam === 'admin') {
            const adminSaved = localStorage.getItem('spp_admin_session');
            if (adminSaved) {
              sessionStorage.setItem('spp_tab_session', adminSaved);
              return JSON.parse(adminSaved);
            }
          } else if (roleParam === 'parent') {
            const parentSaved = localStorage.getItem('spp_parent_session');
            if (parentSaved) {
              sessionStorage.setItem('spp_tab_session', parentSaved);
              return JSON.parse(parentSaved);
            }
          }

          // 3. Cek intended role tab ini
          const intendedRole = sessionStorage.getItem('spp_intended_role');
          if (intendedRole === 'admin') {
            const adminSaved = localStorage.getItem('spp_admin_session');
            if (adminSaved) {
              sessionStorage.setItem('spp_tab_session', adminSaved);
              return JSON.parse(adminSaved);
            }
          } else if (intendedRole === 'parent') {
            const parentSaved = localStorage.getItem('spp_parent_session');
            if (parentSaved) {
              sessionStorage.setItem('spp_tab_session', parentSaved);
              return JSON.parse(parentSaved);
            }
          }

          // 4. Fallback ke login yang tersimpan
          const adminSaved = localStorage.getItem('spp_admin_session');
          const parentSaved = localStorage.getItem('spp_parent_session');
          if (adminSaved && !parentSaved) {
            sessionStorage.setItem('spp_tab_session', adminSaved);
            return JSON.parse(adminSaved);
          }
          if (parentSaved && !adminSaved) {
            sessionStorage.setItem('spp_tab_session', parentSaved);
            return JSON.parse(parentSaved);
          }
          const legacy = localStorage.getItem('spp_user_session');
          if (legacy) {
            sessionStorage.setItem('spp_tab_session', legacy);
            return JSON.parse(legacy);
          }
          return null;
        } catch (e) {
          return null;
        }
      });
      const [mySessionToken, setMySessionToken] = useState(() => {
        try {
          return sessionStorage.getItem('spp_my_session_token') || localStorage.getItem('spp_my_session_token') || '';
        } catch (e) {
          return '';
        }
      });
      const [kickedModal, setKickedModal] = useState(null);

      const currentUserRef = useRef(currentUser);
      currentUserRef.current = currentUser;
      const mySessionTokenRef = useRef(mySessionToken);
      mySessionTokenRef.current = mySessionToken;

      const [currentView, setCurrentView] = useState('dashboard');
      const [isRefreshing, setIsRefreshing] = useState(false);
      const [envConfig, setEnvConfig] = useState({});
      
      const [settings, setSettings] = useState(DEFAULT_SETTINGS);
      const [students, setStudents] = useState([]);
      const [transactions, setTransactions] = useState([]);
      const [announcements, setAnnouncements] = useState([]);
      const [complaints, setComplaints] = useState([]);
      const [notes, setNotes] = useState([]);

      const [selectedKuitansi, setSelectedKuitansi] = useState(null);
      const [activeMidtransBill, setActiveMidtransBill] = useState(null);
      const [toast, setToast] = useState(null);
      const [pendingUser, setPendingUser] = useState(null);
      const [isLoadingPortal, setIsLoadingPortal] = useState(false);

      const showToast = (title, message, type = 'success') => {
        setToast({ title, message, type });
        setTimeout(() => {
          setToast(null);
        }, 4000);
      };

      const handleForceLogout = useCallback((userName, device = 'Perangkat lain', time = 'Baru saja') => {
        const active = currentUserRef.current;
        setCurrentUser(null);
        setMySessionToken('');
        currentUserRef.current = null;
        mySessionTokenRef.current = '';
        try {
          sessionStorage.removeItem('spp_tab_session');
          sessionStorage.removeItem('spp_my_session_token');
          if (active?.role === 'admin') {
            localStorage.removeItem('spp_admin_session');
            localStorage.removeItem('spp_admin_token');
          } else if (active?.role === 'parent') {
            localStorage.removeItem('spp_parent_session');
            localStorage.removeItem('spp_parent_token');
          }
          localStorage.removeItem('spp_user_session');
          localStorage.removeItem('spp_my_session_token');
        } catch (e) {}
        setKickedModal({
          userName: userName || 'Pengguna',
          device: device,
          time: time
        });
      }, []);

      const handleUserLogout = useCallback(() => {
        const active = currentUserRef.current;
        setCurrentUser(null);
        setMySessionToken('');
        currentUserRef.current = null;
        mySessionTokenRef.current = '';
        try {
          sessionStorage.removeItem('spp_tab_session');
          sessionStorage.removeItem('spp_my_session_token');
          if (active?.role === 'admin') {
            localStorage.removeItem('spp_admin_session');
            localStorage.removeItem('spp_admin_token');
          } else if (active?.role === 'parent') {
            localStorage.removeItem('spp_parent_session');
            localStorage.removeItem('spp_parent_token');
          }
          localStorage.removeItem('spp_user_session');
          localStorage.removeItem('spp_my_session_token');
        } catch (e) {}
      }, []);

      const handleUserLogin = async (userObj) => {
        const newSessionToken = 'sess_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
        try {
          // Simpan sesi independen untuk tab saat ini
          sessionStorage.setItem('spp_tab_session', JSON.stringify(userObj));
          sessionStorage.setItem('spp_intended_role', userObj.role);
          sessionStorage.setItem('spp_my_session_token', newSessionToken);

          // Simpan terpisah per-role di localStorage agar login admin tidak menimpa user
          if (userObj.role === 'admin') {
            localStorage.setItem('spp_admin_session', JSON.stringify(userObj));
            localStorage.setItem('spp_admin_token', newSessionToken);
          } else {
            localStorage.setItem('spp_parent_session', JSON.stringify(userObj));
            localStorage.setItem('spp_parent_token', newSessionToken);
          }
        } catch (e) {}
        setMySessionToken(newSessionToken);
        mySessionTokenRef.current = newSessionToken;

        const deviceType = /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent) ? 'Smartphone (HP)' : 'Komputer (PC/Laptop)';
        const loginTime = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

        const supabase = getSupabaseClient();
        if (supabase) {
          try {
            if (userObj.role === 'parent' && userObj.student) {
              await supabase.from('students').update({ arrears_note: newSessionToken }).eq('id', userObj.student.id);
            }

            const userKey = userObj.role === 'parent' ? ('student_' + userObj.student.id) : 'admin_account';
            const authChannel = supabase.channel('spp_single_session_channel');
            authChannel.subscribe((status) => {
              if (status === 'SUBSCRIBED') {
                authChannel.send({
                  type: 'broadcast',
                  event: 'single_session_login',
                  payload: {
                    userKey,
                    sessionToken: newSessionToken,
                    device: deviceType,
                    time: loginTime
                  }
                });
              }
            });
          } catch (err) {
            console.warn("Gagal sinkronisasi sesi ke database:", err);
          }
        }

        setPendingUser(userObj);
        setIsLoadingPortal(true);
      };

      const fetchData = useCallback(async (isManual = false) => {
        const supabase = getSupabaseClient();
        if (isManual) {
          setIsRefreshing(true);
          showToast("Data Diperbarui", "Memuat ulang seluruh data siswa, transaksi, berita & pengaduan...", "info");
        }

        try {
          if (supabase) {
            const { data: stData } = await supabase.from('students').select('*');
            if (stData) {
              const mappedStudents = stData.map(mapStudentFromDb);
              setStudents(mappedStudents);

              // Cek validitas sesi siswa aktif di perangkat ini
              const activeUser = currentUserRef.current;
              const activeToken = mySessionTokenRef.current;
              if (activeUser && activeUser.role === 'parent' && activeUser.student && activeToken) {
                const freshSt = mappedStudents.find(s => s.id === activeUser.student.id);
                if (freshSt && freshSt.arrearsNote && freshSt.arrearsNote !== activeToken) {
                  handleForceLogout(freshSt.name, 'Perangkat lain');
                  return;
                }
              }
            }

            const { data: trData } = await supabase.from('transactions').select('*');
            if (trData) setTransactions(trData.map(mapTransactionFromDb));

            const { data: anData } = await supabase.from('announcements').select('*');
            if (anData) setAnnouncements(anData.map(mapAnnouncementFromDb));

            const { data: cpData } = await supabase.from('complaints').select('*');
            if (cpData) setComplaints(cpData.map(mapComplaintFromDb));

            const { data: ntData } = await supabase.from('student_notes').select('*');
            if (ntData) setNotes(ntData.map(mapNoteFromDb));

            const { data: stgData } = await supabase.from('settings').select('*').limit(1);
            if (stgData && stgData.length > 0) {
              const mappedSettings = mapSettingsFromDb(stgData[0]);
              setSettings(mappedSettings);
            }
          }
        } catch (e) {
          console.log("Sync local data.");
        } finally {
          if (isManual) {
            setTimeout(() => setIsRefreshing(false), 600);
          }
        }
      }, [handleForceLogout]);

      // Realtime listener broadcast saat ada login baru dari device lain
      useEffect(() => {
        const supabase = getSupabaseClient();
        if (!supabase) return;

        const authChannel = supabase.channel('spp_single_session_channel');
        authChannel.on('broadcast', { event: 'single_session_login' }, (msg) => {
          const payload = msg.payload || {};
          const activeUser = currentUserRef.current;
          const activeToken = mySessionTokenRef.current;
          if (!activeUser || !activeToken) return;

          const myKey = activeUser.role === 'parent' ? ('student_' + activeUser.student?.id) : 'admin_account';
          // Pastikan admin hanya menendang sesama admin di device lain, dan user hanya menendang akun siswa yang sama
          if (payload.userKey === myKey && payload.sessionToken && payload.sessionToken !== activeToken) {
            handleForceLogout(
              activeUser.role === 'parent' ? activeUser.student?.name : (activeUser.name || 'Admin'),
              payload.device || 'Perangkat lain',
              payload.time || 'Baru saja'
            );
          }
        }).subscribe();

        return () => {
          supabase.removeChannel(authChannel);
        };
      }, [handleForceLogout]);

      useEffect(() => {
        fetchData(false);
        const interval = setInterval(() => {
          fetchData(false);
        }, 30000);
        return () => clearInterval(interval);
      }, [fetchData]);

      const handleUpdateSettings = async (newSettings) => {
        setSettings(newSettings);
        try {
          localStorage.setItem('spp_extended_settings', JSON.stringify(newSettings));
        } catch (e) {}
        showToast("Pengaturan Disimpan", "Pengaturan sekolah & database berhasil diperbarui.", "success");

        const supabase = getSupabaseClient();
        if (supabase) {
          try {
            const activePeriodName = newSettings.activePeriodName ||
              (newSettings.academicPeriods && newSettings.academicPeriods.find(p => p.isActive)?.name) ||
              `Periode ${newSettings.academicYear || '2025/2026'}`;

            const extendedPayload = {
              school_name: newSettings.schoolName,
              address: newSettings.address,
              phone: newSettings.phone,
              academic_year: newSettings.academicYear,
              active_period_name: activePeriodName,
              semester: newSettings.semester || 'Semua',
              admin_name: newSettings.adminName,
              admin_username: newSettings.adminUsername,
              due_date_day: Number(newSettings.dueDateDay) || 10,
              midtrans_client_key: newSettings.midtransClientKey || '',
              midtrans_server_key: newSettings.midtransServerKey || '',
              start_month: newSettings.startMonth,
              start_year: Number(newSettings.startYear) || 2025,
              end_month: newSettings.endMonth,
              end_year: Number(newSettings.endYear) || 2026,
              academic_periods: JSON.stringify(newSettings.academicPeriods || []),
              custom_classes: JSON.stringify(newSettings.customClasses || [])
            };

            if (newSettings.adminPassword && newSettings.adminPassword.trim().length > 0) {
              extendedPayload.admin_password = newSettings.adminPassword.trim();
            }

            let res;
            if (newSettings.id) {
              res = await supabase.from('settings').update(extendedPayload).eq('id', newSettings.id);
            } else {
              res = await supabase.from('settings').insert([extendedPayload]);
            }

            if (res && res.error) {
              console.warn("Retrying update with fallback base payload:", res.error);
              const basePayload = {
                school_name: newSettings.schoolName,
                address: newSettings.address,
                phone: newSettings.phone,
                academic_year: newSettings.academicYear,
                active_period_name: activePeriodName,
                semester: newSettings.semester || 'Semua',
                admin_name: newSettings.adminName,
                admin_username: newSettings.adminUsername,
                due_date_day: Number(newSettings.dueDateDay) || 10
              };
              if (newSettings.adminPassword && newSettings.adminPassword.trim().length > 0) {
                basePayload.admin_password = newSettings.adminPassword.trim();
              }
              if (newSettings.id) {
                await supabase.from('settings').update(basePayload).eq('id', newSettings.id);
              } else {
                await supabase.from('settings').insert([basePayload]);
              }
            }
          } catch (err) {
            console.error("Gagal simpan settings ke Supabase:", err);
          }
        }
      };

      const handleAddAnnouncement = async (annData) => {
        const newAnn = { id: Date.now(), ...annData };
        setAnnouncements(prev => [newAnn, ...prev]);
        showToast("Berita Ditambahkan", `Berita "${annData.title}" berhasil ditambahkan & disinkronkan.`, "success");

        const supabase = getSupabaseClient();
        if (supabase) {
          try {
            await supabase.from('announcements').insert([{
              title: annData.title,
              content: annData.content,
              image_url: annData.imageUrl || '',
              date: annData.date || new Date().toLocaleDateString('id-ID')
            }]);
          } catch (err) {
            console.error("Gagal simpan pengumuman ke Supabase:", err);
          }
        }
      };

      const handleUpdateAnnouncement = async (id, updatedObj) => {
        setAnnouncements(prev => prev.map(a => a.id === id ? { ...a, ...updatedObj } : a));
        showToast("Berita Diperbarui", `Perubahan berita "${updatedObj.title}" berhasil disimpan.`, "success");

        const supabase = getSupabaseClient();
        if (supabase && typeof id !== 'number') {
          try {
            await supabase.from('announcements').update({
              title: updatedObj.title,
              content: updatedObj.content,
              image_url: updatedObj.imageUrl || '',
              date: updatedObj.date
            }).eq('id', id);
          } catch (err) {
            console.error("Gagal update pengumuman ke Supabase:", err);
          }
        }
      };

      const handleDeleteAnnouncement = async (id) => {
        if (confirm("Apakah Anda yakin ingin menghapus berita pengumuman ini?")) {
          const target = announcements.find(a => a.id === id);
          setAnnouncements(prev => prev.filter(a => a.id !== id));
          showToast("Berita Dihapus", `Berita "${target ? target.title : ''}" telah berhasil dihapus dari sistem.`, "delete");

          const supabase = getSupabaseClient();
          if (supabase && typeof id !== 'number') {
            try {
              await supabase.from('announcements').delete().eq('id', id);
            } catch (err) {
              console.error("Gagal hapus pengumuman dari Supabase:", err);
            }
          }
        }
      };

      const handleAddComplaint = async (compData) => {
        const initialMessages = [{ sender: 'Wali Murid', text: compData.content, time: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) }];
        const newComp = { 
          id: Date.now(), 
          ...compData,
          messages: initialMessages
        };
        setComplaints(prev => [newComp, ...prev]);
        showToast("Pengaduan Terkirim", "Pengaduan Anda telah terkirim ke Admin TU.", "success");

        const supabase = getSupabaseClient();
        if (supabase) {
          try {
            await supabase.from('complaints').insert([{
              student_id: compData.studentId,
              student_name: compData.studentName,
              wali_name: compData.waliName,
              title: compData.title,
              content: compData.content,
              admin_reply: '',
              messages: JSON.stringify(initialMessages),
              status: 'Belum Ditangani',
              date: compData.date
            }]);
          } catch (err) {}
        }
      };

      const handleReplyComplaint = async (id, replyText, senderRole = 'Admin TU', imageUrl = null) => {
        let updatedMessages = [];
        let updatedStatus = 'Sudah Ditangani';

        setComplaints(prev => prev.map(c => {
          if (c.id === id) {
            const isExpired = Date.now() > (c.expiresAtMs || (c.createdAtMs + 3600000));
            if (isExpired) return c; // Sesi 1 jam telah berakhir

            const newMsg = {
              sender: senderRole,
              text: replyText,
              imageUrl: imageUrl,
              time: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
            };
            const existingMsgs = (c.messages && c.messages.length > 0) 
              ? [...c.messages] 
              : [{ sender: 'Wali Murid', text: c.content, time: '-' }];

            if (c.adminReply && existingMsgs.length === 1) {
              existingMsgs.push({ sender: 'Admin TU', text: c.adminReply, time: '-' });
            }

            updatedMessages = [...existingMsgs, newMsg];
            updatedStatus = senderRole === 'Admin TU' ? 'Sudah Ditangani' : c.status;

            return { 
              ...c, 
              adminReply: senderRole === 'Admin TU' ? replyText : c.adminReply,
              messages: updatedMessages, 
              status: updatedStatus 
            };
          }
          return c;
        }));

        showToast("Pesan Terkirim", `Pesan balasan dari ${senderRole} berhasil terkirim.`, "success");

        const supabase = getSupabaseClient();
        if (supabase && typeof id !== 'number') {
          try {
            await supabase.from('complaints').update({
              admin_reply: replyText,
              messages: JSON.stringify(updatedMessages),
              status: updatedStatus
            }).eq('id', id);
          } catch (err) {}
        }
      };

      const handleToggleComplaintStatus = async (id) => {
        let nextStatus = 'Belum Ditangani';
        setComplaints(prev => prev.map(c => {
          if (c.id === id) {
            nextStatus = c.status === 'Sudah Ditangani' ? 'Belum Ditangani' : 'Sudah Ditangani';
            return { ...c, status: nextStatus };
          }
          return c;
        }));
        showToast("Status Pengaduan", `Status pengaduan diubah menjadi "${nextStatus}".`, "info");

        const supabase = getSupabaseClient();
        if (supabase && typeof id !== 'number') {
          try {
            await supabase.from('complaints').update({ status: nextStatus }).eq('id', id);
          } catch (err) {}
        }
      };

      const handleMarkReadNotification = async (type, id) => {
        const supabase = getSupabaseClient();
        if (type === 'complaint') {
          setComplaints(prev => prev.map(c => c.id === id ? { ...c, isRead: true } : c));
          if (supabase && typeof id !== 'number') {
            try { await supabase.from('complaints').update({ is_read: true }).eq('id', id); } catch (err) {}
          }
        } else if (type === 'transaction') {
          setTransactions(prev => prev.map(t => t.id === id ? { ...t, isRead: true } : t));
          if (supabase && typeof id !== 'number') {
            try { await supabase.from('transactions').update({ is_read: true }).eq('id', id); } catch (err) {}
          }
        }
      };

      const handleAddCommentNote = async (noteId, commentObj) => {
        const supabase = getSupabaseClient();
        setNotes(prev => prev.map(n => {
          if (n.id === noteId) {
            const updatedComments = [...(n.comments || []), commentObj];
            if (supabase && typeof noteId !== 'number') {
              supabase.from('student_notes').update({ comments: JSON.stringify(updatedComments) }).eq('id', noteId).then();
            }
            return { ...n, comments: updatedComments };
          }
          return n;
        }));
        showToast("Komentar Terkirim", "Komentar berhasil ditambahkan pada catatan evaluasi.", "success");
      };

      const handleAddNote = async (noteData) => {
      const supabase = getSupabaseClient();
      if (!supabase) {
        showToast('Database connection missing', 'error');
        return;
      }
      
      const dbPayload = {
        student_id: noteData.studentId,
        student_name: noteData.studentName,
        title: noteData.title,
        content: noteData.content,
        category: noteData.category,
        date: noteData.date,
        comments: JSON.stringify(noteData.comments || [])
      };
      
      const { data, error } = await supabase.from('student_notes').insert([dbPayload]).select();
      if (!error && data) {
         setNotes(prev => [mapNoteFromDb(data[0]), ...prev]);
         showToast('Catatan siswa berhasil dikirim!', 'success');
      } else {
         showToast('Gagal mengirim catatan: ' + (error ? error.message : ''), 'error');
      }
    };
    
    const handleAddStudent = async (stObj) => {
        const newStudent = { id: Date.now(), ...stObj };
        setStudents(prev => [...prev, newStudent]);
        showToast("Data Murid Ditambahkan", `Murid atas nama ${stObj.name} (NIS: ${stObj.nis}) berhasil diinput.`, "success");

        const supabase = getSupabaseClient();
        if (supabase) {
          try {
            await supabase.from('students').insert([{
              nis: stObj.nis,
              nipd: stObj.nipd || stObj.nis || '',
              nisn: stObj.nisn || '',
              name: stObj.name,
              jk: stObj.jk || 'L',
              tempat_lahir: stObj.tempatLahir || '',
              tanggal_lahir: stObj.tanggalLahir || '',
              nik: stObj.nik || '',
              agama: stObj.agama || 'Islam',
              alamat: stObj.alamat || '',
              rt: stObj.rt || '',
              rw: stObj.rw || '',
              kelas: stObj.kelas,
              tarif: stObj.tarif,
              wali: stObj.wali,
              telepon: stObj.telepon,
              password: stObj.password || stObj.nis,
              photo_url: stObj.fotoUrl || '',
              status: stObj.statusAktif ? 'Aktif' : 'Non-Aktif',
              keringanan_note: stObj.keringanan_note || '',
              arrears_amount: 0,
              arrears_note: ''
            }]);
          } catch (err) {}
        }
      };

      const handleUpdateStudent = async (id, updatedObj) => {
        setStudents(prev => prev.map(s => s.id === id ? { ...s, ...updatedObj } : s));
        const studentNameDisplay = updatedObj.name || 'tersebut';
        showToast("Data Murid Diperbarui", `Profil siswa ${studentNameDisplay} berhasil diperbarui.`, "success");

        const supabase = getSupabaseClient();
        if (supabase && typeof id !== 'number') {
          try {
            const dbUpdateObj = {};
            if ('nis' in updatedObj) dbUpdateObj.nis = updatedObj.nis;
            if ('nipd' in updatedObj) dbUpdateObj.nipd = updatedObj.nipd;
            if ('nisn' in updatedObj) dbUpdateObj.nisn = updatedObj.nisn;
            if ('name' in updatedObj) dbUpdateObj.name = updatedObj.name;
            if ('jk' in updatedObj) dbUpdateObj.jk = updatedObj.jk;
            if ('tempatLahir' in updatedObj) dbUpdateObj.tempat_lahir = updatedObj.tempatLahir;
            if ('tanggalLahir' in updatedObj) dbUpdateObj.tanggal_lahir = updatedObj.tanggalLahir;
            if ('nik' in updatedObj) dbUpdateObj.nik = updatedObj.nik;
            if ('agama' in updatedObj) dbUpdateObj.agama = updatedObj.agama;
            if ('alamat' in updatedObj) dbUpdateObj.alamat = updatedObj.alamat;
            if ('rt' in updatedObj) dbUpdateObj.rt = updatedObj.rt;
            if ('rw' in updatedObj) dbUpdateObj.rw = updatedObj.rw;
            if ('kelas' in updatedObj) dbUpdateObj.kelas = updatedObj.kelas;
            if ('tarif' in updatedObj) dbUpdateObj.tarif = updatedObj.tarif;
            if ('wali' in updatedObj) dbUpdateObj.wali = updatedObj.wali;
            if ('telepon' in updatedObj) dbUpdateObj.telepon = updatedObj.telepon;
            if ('password' in updatedObj) dbUpdateObj.password = updatedObj.password;
            if ('fotoUrl' in updatedObj) dbUpdateObj.photo_url = updatedObj.fotoUrl;
            if ('statusAktif' in updatedObj) dbUpdateObj.status = updatedObj.statusAktif ? 'Aktif' : 'Non-Aktif';
            if ('keringanan_note' in updatedObj) dbUpdateObj.keringanan_note = updatedObj.keringanan_note;
            dbUpdateObj.arrears_amount = 0;
            if ('arrearsNote' in updatedObj) dbUpdateObj.arrears_note = updatedObj.arrearsNote;
            
            await supabase.from('students').update(dbUpdateObj).eq('id', id);
          } catch (err) {}
        }
      };

      const handleDeleteStudent = async (id) => {
        if (confirm("Apakah Anda yakin ingin menghapus data siswa ini?")) {
          const target = students.find(s => s.id === id);
          setStudents(prev => prev.filter(s => s.id !== id));
          showToast("Data Murid Dihapus", `Data murid ${target ? target.name : ''} telah berhasil dihapus.`, "delete");

          const supabase = getSupabaseClient();
          if (supabase && typeof id !== 'number') {
            try {
              await supabase.from('students').delete().eq('id', id);
            } catch (err) {}
          }
        }
      };

      const handleAddTransaction = async (trxObj) => {
        const newTrx = { id: Date.now(), ...trxObj };
        setTransactions(prev => [newTrx, ...prev]);
        setSelectedKuitansi(newTrx);
        showToast("Pembayaran Berhasil", `Pembayaran SPP ${trxObj.month} a.n ${trxObj.studentName} tercatat!`, "success");

        const supabase = getSupabaseClient();
        if (supabase) {
          try {
            await supabase.from('transactions').insert([{
              student_name: trxObj.studentName,
              kelas: trxObj.kelas,
              month: trxObj.month,
              amount: trxObj.amount,
              method: trxObj.method,
              status: 'Lunas',
              date: trxObj.date,
              kuitansi_no: trxObj.kuitansiNo
            }]);
          } catch (err) {}
        }
      };

      if (isLoadingPortal && pendingUser) {
        return (
          <LoadingBarScreen
            userRole={pendingUser.role}
            userName={pendingUser.role === 'admin' ? pendingUser.name : pendingUser.student.name}
            onComplete={() => {
              setCurrentUser(pendingUser);
              setIsLoadingPortal(false);
              setPendingUser(null);
            }}
          />
        );
      }

      if (!currentUser) {
        return (
          <>
            <LoginView
              onLogin={handleUserLogin}
              settings={settings}
              students={students}
            />
            {kickedModal && (
              <KickedOutModal
                info={kickedModal}
                onClose={() => setKickedModal(null)}
              />
            )}
          </>
        );
      }

      const RefreshLoadingOverlay = () => (
        <div className="fixed inset-0 z-[99999] bg-slate-900/40 backdrop-blur-md flex flex-col items-center justify-center p-4 animate-in fade-in duration-200 select-none">
          <div className="bg-white/95 rounded-[32px] p-8 max-w-sm w-full shadow-2xl border border-white/80 flex flex-col items-center text-center relative overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Ambient Decorative Blurs */}
            <div className="absolute -top-10 -left-10 w-32 h-32 bg-blue-400/20 rounded-full blur-2xl pointer-events-none"></div>
            <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-sky-400/20 rounded-full blur-2xl pointer-events-none"></div>

            <div className="w-20 h-20 bg-blue-50/80 rounded-full p-2 mb-4 border-2 border-blue-100 flex items-center justify-center relative shadow-inner">
              <div className="w-16 h-16 rounded-full border-4 border-blue-600 border-t-transparent animate-spin absolute inset-0 m-auto"></div>
              <img src="/logo.png" alt="PAUD Setia Bhakti" className="w-10 h-10 object-contain relative z-10 animate-pulse" />
            </div>

            <h3 className="text-lg font-black text-slate-800 tracking-tight">Menyinkronkan Data...</h3>
            <p className="text-xs text-slate-500 font-medium mt-1 leading-relaxed">
              Harap tunggu sebentar, memperbarui data SPP, siswa & transaksi terbaru...
            </p>

            <div className="w-full bg-slate-100 h-2 rounded-full mt-5 overflow-hidden relative border border-slate-200/50">
              <div className="bg-gradient-to-r from-blue-600 via-sky-400 to-indigo-600 h-full w-full animate-loading-bar"></div>
            </div>
          </div>
        </div>
      );

      if (currentUser.role === 'parent') {
        const liveStudent = students.find(s => 
          currentUser.student && (s.id === currentUser.student.id || s.nis === currentUser.student.nis)
        ) || currentUser.student;

        return (
          <>
            <ParentDashboardView
              student={liveStudent}
              transactions={transactions}
              announcements={announcements}
              complaints={complaints}
              notes={notes}
              settings={settings}
              onLogout={handleUserLogout}
              onShowKuitansi={(trx) => setSelectedKuitansi(trx)}
              onPayMidtrans={(bill) => setActiveMidtransBill(bill)}
              onAddComplaint={handleAddComplaint}
              onAddCommentNote={handleAddCommentNote}
              onReplyComplaint={handleReplyComplaint}
              onUpdateParentSettings={handleUpdateStudent}
              onRefresh={fetchData}
              isRefreshing={isRefreshing}
            />

            {isRefreshing && <RefreshLoadingOverlay />}

            {selectedKuitansi && (
              <KuitansiModal
                transaction={selectedKuitansi}
                settings={settings}
                onClose={() => setSelectedKuitansi(null)}
              />
            )}

            {activeMidtransBill && (
              <MidtransModal
                bill={activeMidtransBill}
                student={currentUser.student}
                settings={settings}
                onClose={() => setActiveMidtransBill(null)}
                onConfirmSuccess={(bill, method) => {
                  const newTrx = {
                    id: Date.now(),
                    studentId: currentUser.student.id,
                    studentName: currentUser.student.name,
                    kelas: currentUser.student.kelas,
                    month: bill.month,
                    amount: bill.amount,
                    method: method,
                    status: 'Lunas',
                    isRead: false,
                    date: new Date().toLocaleDateString('id-ID'),
                    kuitansiNo: `K-${new Date().getFullYear()}${String(new Date().getMonth()+1).padStart(2,'0')}-${Math.floor(100+Math.random()*900)}`
                  };
                  handleAddTransaction(newTrx);
                  setSelectedKuitansi(newTrx);
                  setActiveMidtransBill(null);
                }}
              />
            )}

            <ToastNotification toast={toast} onClose={() => setToast(null)} />
          </>
        );
      }

      return (
        <>
          <div className="min-h-screen bg-[#edf2f7] bg-aesthetic-pattern p-2 sm:p-3 md:p-4 lg:p-6 flex flex-col items-center justify-start text-slate-800">
          <div className="w-full max-w-[1720px] bg-white rounded-2xl md:rounded-[32px] shadow-2xl shadow-blue-900/10 flex flex-col md:flex-row overflow-hidden min-h-[96vh] border border-slate-200/80">
            {/* ROYAL BLUE SIDEBAR WITH SCOOPED TAB CUTOUT */}
            <aside className="w-full md:w-72 lg:w-80 royal-blue-sidebar shrink-0 flex flex-col justify-between p-0 relative z-20">
              <div>
                {/* Brand / School Header */}
                <div className="p-6 sm:p-7 pb-6 flex items-center gap-4">
                  <div className="w-14 h-14 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center font-bold text-white shadow-lg border border-white/30 shrink-0 p-1.5 overflow-hidden">
                    <img src="/logo.png" alt="PAUD Setia Bhakti" className="w-full h-full object-contain filter drop-shadow" />
                  </div>
                  <div className="min-w-0">
                    <h1 className="font-black text-base lg:text-lg leading-tight text-white tracking-tight truncate">{settings.schoolName}</h1>
                    <div className="inline-flex items-center gap-1.5 mt-1">
                      <span className="w-2 h-2 rounded-full bg-cyan-300 animate-pulse"></span>
                      <span className="text-xs font-black text-blue-100 uppercase tracking-wider">Admin Panel</span>
                    </div>
                  </div>
                </div>

                {/* 5 Grouped Main Categories on the left */}
                <nav className="pl-4 pr-0 py-4 space-y-2.5 sm:space-y-3 font-extrabold text-sm sm:text-base relative">
                  {[
                    { id: 'dashboard', label: 'Dashboard', icon: 'home', defaultView: 'dashboard', views: ['dashboard'] },
                    { id: 'keuangan', label: 'Keuangan SPP', icon: 'credit-card', defaultView: 'transaksi', views: ['transaksi', 'tunggakan', 'laporan'] },
                    { id: 'kesiswaan', label: 'Kesiswaan', icon: 'users', defaultView: 'siswa', views: ['siswa', 'catatan'], badge: students.length },
                    { id: 'komunikasi', label: 'Komunikasi', icon: 'message-square', defaultView: 'pengumuman', views: ['pengumuman', 'pengaduan'], badge: (announcements.length + complaints.length) || null },
                    { id: 'pengaturan', label: 'Pengaturan', icon: 'settings', defaultView: 'pengaturan', views: ['pengaturan'] }
                  ].map(group => {
                    const isGroupActive = group.views.includes(currentView);
                    return (
                      <button
                        key={group.id}
                        onClick={() => {
                          if (!group.views.includes(currentView)) {
                            setCurrentView(group.defaultView);
                          }
                        }}
                        className={`w-full py-4 px-5 sm:px-6 flex items-center justify-between transition-all text-sm sm:text-[15px] ${
                          isGroupActive
                            ? 'scooped-tab-active bg-white text-blue-700 font-black rounded-l-2xl rounded-r-none mr-0 shadow-sm'
                            : 'w-[calc(100%-16px)] mr-4 rounded-2xl text-white/90 hover:text-white hover:bg-white/10 font-extrabold'
                        }`}
                      >
                        <div className="flex items-center gap-3.5 truncate">
                          <Icon name={group.icon} size={22} />
                          <span className="truncate">{group.label}</span>
                        </div>
                        {group.badge ? (
                          <span className={`px-2.5 py-1 rounded-full text-xs font-black ${
                            isGroupActive ? 'bg-blue-100 text-blue-700' : 'bg-white/20 text-white'
                          }`}>
                            {group.badge}
                          </span>
                        ) : null}
                      </button>
                    );
                  })}
                </nav>
              </div>

              {/* Sidebar Footer */}
              <div className="p-4 m-4 bg-white/10 backdrop-blur-md rounded-2xl border border-white/15 text-white">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center font-black text-sm text-white shrink-0">
                    {settings.adminName ? settings.adminName.charAt(0) : 'A'}
                  </div>
                  <div className="truncate flex-1">
                    <p className="text-sm font-black text-white truncate">{settings.adminName || 'Admin TU'}</p>
                    <p className="text-xs text-blue-100 font-semibold truncate">Tahun Ajaran {settings.academicYear || 'Aktif'}</p>
                  </div>
                </div>
              </div>
            </aside>

            {/* MAIN WHITE CONTENT CARD */}
            <main className="flex-1 bg-white flex flex-col min-w-0 min-h-0 overflow-y-auto">
              {/* Header Top Bar */}
              <header className="px-6 md:px-10 pt-7 pb-5 border-b border-slate-100 flex flex-col gap-4 bg-white/95 backdrop-blur-md sticky top-0 z-10">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-3">
                      <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                        {currentView === 'dashboard' && 'Dashboard Utama'}
                        {['transaksi', 'tunggakan', 'laporan'].includes(currentView) && 'Keuangan & Tagihan SPP'}
                        {['siswa', 'catatan'].includes(currentView) && 'Data Kesiswaan'}
                        {['pengumuman', 'pengaduan'].includes(currentView) && 'Komunikasi & Layanan'}
                        {currentView === 'pengaturan' && 'Pengaturan Aplikasi'}
                      </h2>
                      <span className="hidden sm:inline-flex items-center px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-blue-50 text-blue-700 border border-blue-200">
                        {currentView === 'transaksi' && 'Catat Bayar'}
                        {currentView === 'tunggakan' && 'Follow-Up Tunggakan'}
                        {currentView === 'laporan' && 'Laporan PDF'}
                        {currentView === 'siswa' && 'Data Murid'}
                        {currentView === 'catatan' && 'Catatan TU'}
                        {currentView === 'pengumuman' && 'Pengumuman'}
                        {currentView === 'pengaduan' && 'Aduan Masuk'}
                        {currentView === 'dashboard' && 'Statistik'}
                        {currentView === 'pengaturan' && 'Konfigurasi'}
                      </span>
                    </div>
                    <p className="text-sm sm:text-base text-slate-500 font-medium mt-1">
                      {currentView === 'dashboard' && 'Ringkasan operasional dan grafik penerimaan SPP'}
                      {['transaksi', 'tunggakan', 'laporan'].includes(currentView) && 'Kelola pencatatan bayar manual, pantau tunggakan & cetak laporan'}
                      {['siswa', 'catatan'].includes(currentView) && 'Kelola database murid aktif, kelas dan catatan konseling'}
                      {['pengumuman', 'pengaduan'].includes(currentView) && 'Publikasi pengumuman sekolah dan tanggapi pengaduan wali'}
                      {currentView === 'pengaturan' && 'Konfigurasi identitas sekolah, tarif SPP dan periode semester'}
                    </p>
                  </div>

                  {/* Header Actions */}
                  <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
                    <button
                      onClick={() => fetchData(true)}
                      title="Sinkronisasi Data"
                      className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-bold transition-all flex items-center gap-2 shadow-sm"
                    >
                      <Icon name="refresh-cw" size={17} className={isRefreshing ? 'animate-spin text-blue-600' : ''} />
                      <span className="hidden sm:inline">Sinkronisasi</span>
                    </button>

                    <button
                      onClick={handleUserLogout}
                      title="Keluar Akun Admin"
                      className="px-4 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl text-sm font-bold border border-rose-200 transition-colors flex items-center gap-2 shadow-sm"
                    >
                      <Icon name="log-out" size={17} />
                      <span className="hidden sm:inline">Keluar</span>
                    </button>
                  </div>
                </div>

                {/* HORIZONTAL SUB-PILL BAR ("di bikin sub per pilihan biar ga banyak yang disebelah kirinya") */}
                {['transaksi', 'tunggakan', 'laporan'].includes(currentView) && (
                  <div className="flex flex-wrap items-center gap-2.5 pt-1">
                    <button
                      onClick={() => setCurrentView('transaksi')}
                      className={`sub-pill-btn ${currentView === 'transaksi' ? 'sub-pill-btn-active' : 'sub-pill-btn-inactive'}`}
                    >
                      <Icon name="plus-circle" size={16} />
                      <span>Catat Bayar Manual</span>
                    </button>
                    <button
                      onClick={() => setCurrentView('tunggakan')}
                      className={`sub-pill-btn ${currentView === 'tunggakan' ? 'sub-pill-btn-active' : 'sub-pill-btn-inactive'}`}
                    >
                      <Icon name="phone-call" size={16} />
                      <span>Belum Bayar & Follow Up</span>
                    </button>
                    <button
                      onClick={() => setCurrentView('laporan')}
                      className={`sub-pill-btn ${currentView === 'laporan' ? 'sub-pill-btn-active' : 'sub-pill-btn-inactive'}`}
                    >
                      <Icon name="printer" size={16} />
                      <span>Cetak Laporan PDF</span>
                    </button>
                  </div>
                )}

                {['siswa', 'catatan'].includes(currentView) && (
                  <div className="flex flex-wrap items-center gap-2.5 pt-1">
                    <button
                      onClick={() => setCurrentView('siswa')}
                      className={`sub-pill-btn ${currentView === 'siswa' ? 'sub-pill-btn-active' : 'sub-pill-btn-inactive'}`}
                    >
                      <Icon name="users" size={16} />
                      <span>Data Murid</span>
                      <span className={`ml-1.5 px-2 py-0.5 rounded-full text-xs font-black ${currentView === 'siswa' ? 'bg-white text-blue-700' : 'bg-slate-200 text-slate-800'}`}>
                        {students.length}
                      </span>
                    </button>
                    <button
                      onClick={() => setCurrentView('catatan')}
                      className={`sub-pill-btn ${currentView === 'catatan' ? 'sub-pill-btn-active' : 'sub-pill-btn-inactive'}`}
                    >
                      <Icon name="award" size={16} />
                      <span>Catatan Siswa TU</span>
                      {notes.length > 0 && (
                        <span className={`ml-1.5 px-2 py-0.5 rounded-full text-xs font-black ${currentView === 'catatan' ? 'bg-white text-blue-700' : 'bg-slate-200 text-slate-800'}`}>
                          {notes.length}
                        </span>
                      )}
                    </button>
                  </div>
                )}

                {['pengumuman', 'pengaduan'].includes(currentView) && (
                  <div className="flex flex-wrap items-center gap-2.5 pt-1">
                    <button
                      onClick={() => setCurrentView('pengumuman')}
                      className={`sub-pill-btn ${currentView === 'pengumuman' ? 'sub-pill-btn-active' : 'sub-pill-btn-inactive'}`}
                    >
                      <Icon name="newspaper" size={16} />
                      <span>Berita & Pengumuman</span>
                      {announcements.length > 0 && (
                        <span className={`ml-1.5 px-2 py-0.5 rounded-full text-xs font-black ${currentView === 'pengumuman' ? 'bg-white text-blue-700' : 'bg-slate-200 text-slate-800'}`}>
                          {announcements.length}
                        </span>
                      )}
                    </button>
                    <button
                      onClick={() => setCurrentView('pengaduan')}
                      className={`sub-pill-btn ${currentView === 'pengaduan' ? 'sub-pill-btn-active' : 'sub-pill-btn-inactive'}`}
                    >
                      <Icon name="message-square" size={16} />
                      <span>Pengaduan & Aspirasi</span>
                      {complaints.length > 0 && (
                        <span className={`ml-1.5 px-2 py-0.5 rounded-full text-xs font-black ${currentView === 'pengaduan' ? 'bg-white text-blue-700' : 'bg-slate-200 text-slate-800'}`}>
                          {complaints.length}
                        </span>
                      )}
                    </button>
                  </div>
                )}
              </header>

              <div key={currentView} className="p-6 md:p-10 space-y-8 flex-1 animate-tab-switch">
            {currentView === 'dashboard' && (
              <DashboardView
                students={students}
                transactions={transactions}
                announcements={announcements}
                complaints={complaints}
                notes={notes}
                settings={settings}
                navigateTo={(v) => setCurrentView(v)}
                onShowKuitansi={(trx) => setSelectedKuitansi(trx)}
                onMarkReadNotification={handleMarkReadNotification}
                onRefresh={fetchData}
                isRefreshing={isRefreshing}
              />
            )}

            {currentView === 'siswa' && (
              <SiswaListView
                students={students}
                settings={settings}
                onAddStudent={handleAddStudent}
                onUpdateStudent={handleUpdateStudent}
                onDeleteStudent={handleDeleteStudent}
              />
            )}

            {currentView === 'transaksi' && (
              <TransaksiView
                students={students}
                transactions={transactions}
                settings={settings}
                onAddTransaction={handleAddTransaction}
                onShowKuitansi={(trx) => setSelectedKuitansi(trx)}
              />
            )}

            {currentView === 'laporan' && (
              <LaporanView
                students={students}
                transactions={transactions}
                settings={settings}
              />
            )}

            {currentView === 'pengumuman' && (
              <AdminPengumumanView
                announcements={announcements}
                onAddAnnouncement={handleAddAnnouncement}
                onUpdateAnnouncement={handleUpdateAnnouncement}
                onDeleteAnnouncement={handleDeleteAnnouncement}
              />
            )}

            {currentView === 'pengaduan' && (
              <AdminPengaduanView
                complaints={complaints}
                onReplyComplaint={handleReplyComplaint}
                onToggleComplaintStatus={handleToggleComplaintStatus}
              />
            )}

            {currentView === 'tunggakan' && (
              <AdminTunggakanView
                students={students}
                transactions={transactions}
                settings={settings}
                navigateTo={(v) => setCurrentView(v)}
              />
            )}

            {currentView === 'catatan' && (
              <AdminCatatanView
                students={students}
                notes={notes}
                onAddNote={handleAddNote}
                onDeleteNote={async (id) => {
                  const supabase = getSupabaseClient();
                  if (supabase && typeof id !== 'number') {
                    await supabase.from('student_notes').delete().eq('id', id);
                  }
                  setNotes(prev => prev.filter(n => n.id !== id));
                  showToast('Catatan berhasil dihapus', 'success');
                }}
              />
            )}
              {currentView === 'pengaturan' && (
              <AdminPengaturanView
                settings={settings}
                onSaveSettings={handleUpdateSettings}
              />
            )}

              </div>
            </main>
          </div>
        </div>

        {isRefreshing && <RefreshLoadingOverlay />}

        {selectedKuitansi && (
          <KuitansiModal
            transaction={selectedKuitansi}
            settings={settings}
            onClose={() => setSelectedKuitansi(null)}
          />
        )}

        <ToastNotification toast={toast} onClose={() => setToast(null)} />
      </>
    );
    }

    const rootElement = document.getElementById('root');
    const root = ReactDOM.createRoot(rootElement);
    root.render(<App />);
