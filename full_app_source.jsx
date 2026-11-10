
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

    // Helper Generator Password Default Siswa: Kombinasi Huruf Besar, Huruf Kecil, dan Angka (Sangat Aman)
    const generateDefaultStudentPassword = (prefix = 'Sb') => {
      // Menggunakan kombinasi karakter aman (tanpa karakter ambigu seperti 0/O atau 1/I/l)
      const uppers = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
      const lowers = 'abcdefghijkmnpqrstuvwxyz';
      const numbers = '23456789';
      const all = uppers + lowers + numbers;

      let pwd = prefix; // Awalan sekolah: 'Sb'
      pwd += numbers[Math.floor(Math.random() * numbers.length)];
      pwd += uppers[Math.floor(Math.random() * uppers.length)];
      pwd += lowers[Math.floor(Math.random() * lowers.length)];
      for (let i = 0; i < 3; i++) {
        pwd += all[Math.floor(Math.random() * all.length)];
      }
      return pwd; // Contoh hasil: Sb7Nx4q9 (8 karakter campuran angka & huruf)
    };

    // Mappers Database Supabase & App State
    const mapStudentFromDb = (row) => {
      let classHistory = [];
      if (row.class_history) {
        try {
          classHistory = typeof row.class_history === 'string' ? JSON.parse(row.class_history) : row.class_history;
        } catch (e) {}
      }
      if (!Array.isArray(classHistory) || classHistory.length === 0) {
        try {
          const localKey = 'spp_class_history_' + (row.id || row.nis);
          const stored = localStorage.getItem(localKey);
          if (stored) {
            classHistory = JSON.parse(stored);
          }
        } catch (e) {}
      }

      let completedLevels = {};
      try {
        const localLevelKey = 'spp_completed_levels_' + (row.id || row.nis);
        const storedLevels = localStorage.getItem(localLevelKey);
        if (storedLevels) {
          completedLevels = JSON.parse(storedLevels);
        }
      } catch (e) {}

      const isAktif = row.status ? (row.status === 'Aktif') : (row.status_aktif !== undefined ? Boolean(row.status_aktif) : true);

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
        password: row.password || (row.nis ? `Sb${row.nis}` : '123456'),
        status: isAktif ? 'Aktif' : 'Non-Aktif',
        statusAktif: isAktif,
        fotoUrl: row.photo_url || row.foto_url || '',
        keringanan_note: row.keringanan_note || '',
        arrearsAmount: Number(row.arrears_amount || 0),
        arrearsNote: (row.arrears_note && !String(row.arrears_note).startsWith('sess_')) ? row.arrears_note : '',
        sessionToken: row.session_token || '',
        startActiveMonth: row.start_active_month || row.startActiveMonth || '',
        startActiveYear: row.start_active_year ? Number(row.start_active_year) : (row.startActiveYear ? Number(row.startActiveYear) : null),
        classHistory: Array.isArray(classHistory) ? classHistory : [],
        completedLevels: completedLevels
      };
    };

    const ALL_MONTHS = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

    // Helper Format Tanggal Indonesia: Tanggal NamaBulan Tahun (contoh: 5 November 2026)
    const formatDateIndo = (dateVal) => {
      if (!dateVal || dateVal === '-') return dateVal || '-';
      if (dateVal instanceof Date) {
        if (isNaN(dateVal.getTime())) return '-';
        return `${dateVal.getDate()} ${ALL_MONTHS[dateVal.getMonth()]} ${dateVal.getFullYear()}`;
      }
      const str = String(dateVal).trim();
      if (!str || str === '-') return '-';

      // Jika sudah format "5 November 2026" atau "05 - November - 2026" (dengan atau tanpa jam di belakangnya)
      const indoMatch = str.match(/^(\d{1,2})(?:\s*-\s*|\s+)([A-Za-z]+)(?:\s*-\s*|\s+)(\d{4})(.*)$/);
      if (indoMatch) {
        const mIdx = ALL_MONTHS.findIndex(m => m.toLowerCase() === indoMatch[2].toLowerCase());
        if (mIdx !== -1) {
          const dayNum = parseInt(indoMatch[1], 10);
          const suffix = indoMatch[4] ? indoMatch[4].trim() : '';
          return `${dayNum} ${ALL_MONTHS[mIdx]} ${indoMatch[3]}${suffix ? ' ' + suffix : ''}`;
        }
      }

      // Jika format DD/MM/YYYY atau D/M/YYYY (contoh: 5/11/2026 atau 05/11/2026, dengan atau tanpa jam)
      const slashMatch = str.match(/^(\d{1,2})[\/](\d{1,2})[\/](\d{4})(.*)$/);
      if (slashMatch) {
        const dayNum = parseInt(slashMatch[1], 10);
        const monthNum = parseInt(slashMatch[2], 10);
        const yearNum = slashMatch[3];
        const suffix = slashMatch[4] ? slashMatch[4].trim() : '';
        if (monthNum >= 1 && monthNum <= 12 && dayNum >= 1 && dayNum <= 31) {
          return `${dayNum} ${ALL_MONTHS[monthNum - 1]} ${yearNum}${suffix ? ' ' + suffix : ''}`;
        }
      }

      // Jika format YYYY/MM/DD
      const slashYmdMatch = str.match(/^(\d{4})[\/](\d{1,2})[\/](\d{1,2})(.*)$/);
      if (slashYmdMatch) {
        const yearNum = slashYmdMatch[1];
        const monthNum = parseInt(slashYmdMatch[2], 10);
        const dayNum = parseInt(slashYmdMatch[3], 10);
        const suffix = slashYmdMatch[4] ? slashYmdMatch[4].trim() : '';
        if (monthNum >= 1 && monthNum <= 12 && dayNum >= 1 && dayNum <= 31) {
          return `${dayNum} ${ALL_MONTHS[monthNum - 1]} ${yearNum}${suffix ? ' ' + suffix : ''}`;
        }
      }

      // Jika format YYYY-MM-DD (tanpa T ISO)
      const dashYmdMatch = str.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
      if (dashYmdMatch) {
        const yearNum = dashYmdMatch[1];
        const monthNum = parseInt(dashYmdMatch[2], 10);
        const dayNum = parseInt(dashYmdMatch[3], 10);
        if (monthNum >= 1 && monthNum <= 12 && dayNum >= 1 && dayNum <= 31) {
          return `${dayNum} ${ALL_MONTHS[monthNum - 1]} ${yearNum}`;
        }
      }

      // Jika format DD-MM-YYYY
      const dashDmyMatch = str.match(/^(\d{1,2})-(\d{1,2})-(\d{4})(.*)$/);
      if (dashDmyMatch) {
        const dayNum = parseInt(dashDmyMatch[1], 10);
        const monthNum = parseInt(dashDmyMatch[2], 10);
        const yearNum = dashDmyMatch[3];
        const suffix = dashDmyMatch[4] ? dashDmyMatch[4].trim() : '';
        if (monthNum >= 1 && monthNum <= 12 && dayNum >= 1 && dayNum <= 31) {
          return `${dayNum} ${ALL_MONTHS[monthNum - 1]} ${yearNum}${suffix ? ' ' + suffix : ''}`;
        }
      }

      // Jika di dalam string ada pola DD/MM/YYYY (misal di dalam teks waktu)
      if (/\b\d{1,2}[\/]\d{1,2}[\/]\d{4}\b/.test(str)) {
        return str.replace(/\b(\d{1,2})[\/](\d{1,2})[\/](\d{4})\b/g, (full, dStr, mStr, yStr) => {
          const dNum = parseInt(dStr, 10);
          const mNum = parseInt(mStr, 10);
          if (mNum >= 1 && mNum <= 12 && dNum >= 1 && dNum <= 31) {
            return `${dNum} ${ALL_MONTHS[mNum - 1]} ${yStr}`;
          }
          return full;
        });
      }

      // Fallback ke Date parser (untuk ISO string seperti 2026-11-05T01:20:00Z)
      const d = new Date(str);
      if (!isNaN(d.getTime())) {
        return `${d.getDate()} ${ALL_MONTHS[d.getMonth()]} ${d.getFullYear()}`;
      }

      return str;
    };

    // Helper Format Tanggal & Waktu untuk Catatan TU / Pengaduan (contoh: 5 November 2026 • 14:30 WIB)
    const formatDateTimeIndo = (timeOrDateVal, fallbackDateVal = '') => {
      if (!timeOrDateVal || timeOrDateVal === '-' || timeOrDateVal === 'Wali') {
        return fallbackDateVal ? formatDateIndo(fallbackDateVal) : '-';
      }
      const str = String(timeOrDateVal).trim();
      // Jika hanya jam saja (contoh: "01.45" atau "14:30" atau "14:30 WIB")
      if (/^\d{1,2}[:.]\d{2}(?:[:.]\d{2})?(?:\s*(?:WIB|WITA|WIT|AM|PM))?$/i.test(str)) {
        const cleanTime = str.replace(/\./g, ':').replace(/\s*(WIB|WITA|WIT)$/i, '') + ' WIB';
        const baseDate = fallbackDateVal ? formatDateIndo(fallbackDateVal).split('•')[0].trim() : formatDateIndo(new Date());
        return baseDate && baseDate !== '-' ? `${baseDate} • ${cleanTime}` : cleanTime;
      }
      return formatDateIndo(str);
    };

    const dateToYyyyMmDd = (formattedVal) => {
      if (!formattedVal) return '';
      const str = String(formattedVal).trim();
      if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;
      const indoMatch = str.match(/^(\d{1,2})(?:\s*-\s*|\s+)([A-Za-z]+)(?:\s*-\s*|\s+)(\d{4})/);
      if (indoMatch) {
        const day = indoMatch[1].padStart(2, '0');
        const mIdx = ALL_MONTHS.findIndex(m => m.toLowerCase() === indoMatch[2].toLowerCase());
        if (mIdx !== -1) {
          const month = String(mIdx + 1).padStart(2, '0');
          return `${indoMatch[3]}-${month}-${day}`;
        }
      }
      const dmyMatch = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
      if (dmyMatch) {
        const day = dmyMatch[1].padStart(2, '0');
        const month = dmyMatch[2].padStart(2, '0');
        return `${dmyMatch[3]}-${month}-${day}`;
      }
      const d = new Date(str);
      if (!isNaN(d.getTime())) {
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${y}-${m}-${day}`;
      }
      return '';
    };

    const mapTransactionFromDb = (row) => {
      let localAdminRead = false;
      try {
        const readList = JSON.parse(localStorage.getItem('spp_admin_read_trx') || '[]');
        if (readList.includes(row.id)) localAdminRead = true;
      } catch (e) {}
      return {
        id: row.id,
        studentId: row.student_id,
        studentName: row.student_name,
        kelas: row.kelas,
        month: row.month,
        amount: Number(row.amount || 0),
        method: row.method || '-',
        status: row.status,
        isRead: Boolean(row.is_read || localAdminRead),
        date: formatDateIndo(row.date && row.date !== '-' ? row.date : (row.created_at || '-')),
        kuitansiNo: row.kuitansi_no || '-',
        keringananNote: row.keringanan_note || ''
      };
    };

    const mapAnnouncementFromDb = (row) => ({
      id: row.id,
      title: row.title || 'Pengumuman Sekolah',
      content: row.content || '',
      imageUrl: row.image_url || '',
      isRead: row.is_read || false,
      date: formatDateIndo(row.date || row.created_at || new Date())
    });

    const mapComplaintFromDb = (row) => {
      const createdTime = row.created_at ? new Date(row.created_at).getTime() : (typeof row.id === 'number' ? row.id : Date.now());
      const expiresTime = row.expires_at ? new Date(row.expires_at).getTime() : (createdTime + 3600000);
      let localAdminRead = false;
      try {
        const readList = JSON.parse(localStorage.getItem('spp_admin_read_complaints') || '[]');
        if (readList.includes(row.id)) localAdminRead = true;
      } catch (e) {}
      const formattedDate = formatDateIndo(row.date || row.created_at || new Date());
      const rawMessages = row.messages ? (typeof row.messages === 'string' ? JSON.parse(row.messages) : row.messages) : [];
      return {
        id: row.id,
        studentId: row.student_id,
        studentName: row.student_name,
        waliName: row.wali_name,
        title: row.title || 'Pengaduan / Masukan',
        content: row.content || '',
        adminReply: row.admin_reply || '',
        messages: Array.isArray(rawMessages) ? rawMessages.map(m => ({ ...m, time: formatDateTimeIndo(m.time, formattedDate) })) : [],
        status: row.status || 'Belum Ditangani',
        isRead: Boolean(row.is_read || localAdminRead),
        date: formattedDate,
        createdAtMs: createdTime,
        expiresAtMs: expiresTime
      };
    };

    const mapNoteFromDb = (row) => {
      const baseDate = formatDateIndo(row.date || row.created_at || new Date());
      const rawDateStr = String(row.date || '');
      const hasTime = /[•,]|\d{1,2}[:.]\d{2}/.test(rawDateStr);
      const timeSuffix = (!hasTime && row.created_at)
        ? ' • ' + new Date(row.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }).replace(/\./g, ':') + ' WIB'
        : '';
      const fullDate = `${baseDate}${timeSuffix}`;
      const rawComments = typeof row.comments === 'string' ? JSON.parse(row.comments || '[]') : (row.comments || []);
      return {
        id: row.id,
        studentId: row.student_id,
        studentName: row.student_name,
        title: row.title || 'Catatan Tata Usaha (TU)',
        date: fullDate,
        category: row.category || 'Catatan TU',
        content: row.content || '',
        isRead: row.is_read || false,
        created_at: row.created_at,
        comments: Array.isArray(rawComments) ? rawComments.map(c => ({ ...c, time: formatDateTimeIndo(c.time, baseDate) })) : []
      };
    };

    const GreetingMascotBanner = ({ name, role = 'Pengguna', schoolName, academicYear }) => {
      const [liveTime, setLiveTime] = React.useState('');

      React.useEffect(() => {
        const updateClock = () => {
          const now = new Date();
          setLiveTime(now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) + ' WIB');
        };
        updateClock();
        const timer = setInterval(updateClock, 1000);
        return () => clearInterval(timer);
      }, []);

      const getGreetingData = () => {
        const hr = new Date().getHours();
        if (hr >= 3 && hr < 11) {
          return { greeting: 'Selamat Pagi', icon: '🌅', sub: 'Semoga harimu dipenuhi keberkahan, semangat & keceriaan!' };
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
        <div className="relative overflow-hidden rounded-[28px] sm:rounded-[32px] p-5 sm:p-7 md:p-8 mb-6 bg-gradient-to-br from-[#072a6b] via-[#0f44ad] to-[#0284c7] text-white border-2 border-cyan-300/40 shadow-2xl shadow-blue-900/40 flex flex-col md:flex-row items-center justify-between gap-5 transition-all">
          {/* Luminous Smurf Glow Orbs */}
          <div className="absolute -top-16 -right-16 w-64 h-64 rounded-full bg-cyan-400/30 blur-[70px] pointer-events-none select-none animate-pulse"></div>
          <div className="absolute -bottom-16 -left-16 w-64 h-64 rounded-full bg-blue-400/30 blur-[70px] pointer-events-none select-none"></div>

          <div className="flex items-center gap-4 sm:gap-5 z-10 w-full md:w-auto">
            <div className="relative shrink-0">
              <div className="w-14 h-14 sm:w-16 sm:h-16 md:w-20 md:h-20 rounded-2xl bg-gradient-to-tr from-cyan-400 via-blue-500 to-indigo-600 p-0.5 shadow-xl shadow-blue-900/50 flex items-center justify-center animate-mascot-sway ring-2 ring-white/20">
                <img 
                  src="logo.webp" 
                  alt="Mascot Logo" 
                  className="w-full h-full object-contain p-1.5 rounded-[14px] bg-slate-950/80 backdrop-blur-md" 
                />
              </div>
              <div className="w-12 sm:w-14 h-2 rounded-full bg-cyan-400/20 mx-auto mt-1 animate-mascot-shadow blur-xs"></div>
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-lg sm:text-xl md:text-2xl font-black text-white tracking-tight leading-snug">
                  {role === 'Wali Murid' ? (
                    <>
                      {greeting} {icon}! Ayah & Bunda dari <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-sky-200 to-white">{name}</span>
                    </>
                  ) : (
                    <>
                      {greeting} {icon}, <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-sky-200 to-white">{name}</span>
                    </>
                  )}
                  <span className="animate-waving-hand inline-block text-xl sm:text-2xl ml-1">👋</span>
                </h3>
              </div>
              <p className="text-xs sm:text-sm font-medium text-slate-200 mt-1 leading-relaxed">
                {role === 'Wali Murid'
                  ? 'Selamat datang di ruang informasi akademik & SPP ananda. Pantau pembayaran, evaluasi guru, dan pengumuman sekolah dengan nyaman & transparan.'
                  : 'Buku Induk Kesiswaan & Rekapitulasi Pembayaran SPP Sekolah. Kelola administrasi dengan cermat dan rapi.'
                }
              </p>
              
              <div className="flex flex-wrap items-center gap-2 mt-3">
                <span className="px-3 py-1 rounded-full text-[11px] font-extrabold bg-white/10 text-cyan-200 border border-white/15 backdrop-blur-md shadow-inner flex items-center gap-1.5">
                  🏫 <span>{schoolName || 'PAUD SETIA BHAKTI'}</span>
                </span>
                <span className="px-3 py-1 rounded-full text-[11px] font-extrabold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 backdrop-blur-md flex items-center gap-1.5">
                  📅 <span>Periode {academicYear || '2026/2027'}</span>
                </span>
                {role === 'Wali Murid' ? (
                  <span className="hidden sm:inline-flex px-3 py-1 rounded-full text-[11px] font-extrabold bg-amber-500/20 text-amber-200 border border-amber-400/30 backdrop-blur-md items-center gap-1.5">
                    🎒 <span>Ruang Belajar Ceria & Berakhlak</span>
                  </span>
                ) : (
                  <span className="hidden sm:inline-flex px-3 py-1 rounded-full text-[11px] font-extrabold bg-amber-500/20 text-amber-200 border border-amber-400/30 backdrop-blur-md items-center gap-1.5">
                    📖 <span>Buku Besar & Kas TU</span>
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Right Status Capsule Pill (Matching Login Screen Clock Capsule) */}
          <div className="hidden md:flex flex-col items-end gap-2 shrink-0 z-10">
            <div className="px-4 py-2.5 rounded-2xl bg-white/10 backdrop-blur-xl border border-white/15 text-right shadow-lg shadow-black/20">
              <div className="flex items-center gap-2 text-xs font-black text-cyan-300 justify-end">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                <span>Sistem Terhubung</span>
              </div>
              <div className="text-[13px] font-mono font-bold text-white tracking-wider mt-0.5">
                {liveTime || '00:00:00 WIB'}
              </div>
            </div>
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">
              {role === 'Administrator' ? '🛡️ Administrator Mode' : '👨‍👩‍👧 Portal Wali Terverifikasi'}
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

      const currentSchoolName = row.school_name || localExt.schoolName || 'PAUD SETIA BHAKTI';

      return {
        id: row.id,
        schoolName: currentSchoolName,
        address: row.address || localExt.address || '',
        phone: row.phone || localExt.phone || '',
        academicYear: row.academic_year || localExt.academicYear || '',
        activePeriodName: row.active_period_name || localExt.activePeriodName || (row.academic_year ? `Periode ${row.academic_year}` : ''),
        adminName: row.admin_name || localExt.adminName || 'Sarah Aura Alamanda',
        adminUsername: row.admin_username || localExt.adminUsername || 'Sarah',
        adminPassword: row.admin_password || localExt.adminPassword || '',
        dueDateDay: Number(row.due_date_day || localExt.dueDateDay || 10),
        midtransClientKey: row.midtrans_client_key || localExt.midtransClientKey || (window.AppEnv?.midtransClientKey || ''),
        midtransServerKey: row.midtrans_server_key || localExt.midtransServerKey || '',
        startMonth: row.start_month || localExt.startMonth || 'Juli',
        startYear: Number(row.start_year || localExt.startYear || 2026),
        endMonth: row.end_month || localExt.endMonth || 'Desember',
        endYear: Number(row.end_year || localExt.endYear || 2027),
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
      
      const url = (window.AppEnv && typeof window.AppEnv.supabaseUrl === 'string') 
        ? window.AppEnv.supabaseUrl 
        : (window.ENV?.SUPABASE_URL || '');
      const key = (window.AppEnv && typeof window.AppEnv.supabaseKey === 'string') 
        ? window.AppEnv.supabaseKey 
        : (window.ENV?.SUPABASE_KEY || '');

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
      startYear: 2026,
      endMonth: 'Desember',
      endYear: 2027,
      semester: 'Semua',
      academicYear: '20262027',
      activePeriodName: 'Periode Juli 2026 - Desember 2027',
      academicPeriods: [],
      customClasses: [],
      schoolName: 'PAUD SETIA BHAKTI',
      address: 'Paud setia bhakti, GMQR+P5P, Purwadadi Tim., Kec. Purwadadi, Kabupaten Subang, Jawa Barat 46385',
      phone: '089503222835',
      adminName: 'Sarah Aura Alamanda',
      adminUsername: 'Sarah',
      adminPassword: '',
      dueDateDay: 10,
      midtransClientKey: window.AppEnv?.midtransClientKey || window.ENV?.MIDTRANS_CLIENT_KEY || '',
      midtransServerKey: ''
    };

    // Helper: Validasi apakah aduan dihitung sebagai PENDING
    // Aturan:
    // 1. TIDAK DIHITUNG pending jika sesi sudah TERKUNCI / lewat 1 jam (> 3600000 ms)
    // 2. TIDAK DIHITUNG pending jika status terkunci/selesai
    // 3. TIDAK DIHITUNG pending jika sudah DIBACA oleh Admin (isRead true atau sudah dibuka di chat)
    // 4. TIDAK DIHITUNG pending jika pesan terakhir sudah dibalas oleh Admin TU
    // 5. DIHITUNG pending HANYA JIKA masih dalam 1 jam, pesan terakhir dari Wali Murid, dan belum dibaca oleh Admin
    const isComplaintPending = (c) => {
      if (!c) return false;
      const nowMs = Date.now();

      // 1. Cek apakah sesi sudah terkunci / lewat 1 jam (Expired)
      let createdTime = 0;
      if (c.created_at) {
        createdTime = new Date(c.created_at).getTime();
      } else if (c.createdAtMs) {
        createdTime = Number(c.createdAtMs);
      } else if (typeof c.id === 'number') {
        createdTime = c.id;
      }
      
      let expiresAt = 0;
      if (c.expires_at) {
        expiresAt = new Date(c.expires_at).getTime();
      } else if (c.expiresAtMs) {
        expiresAt = Number(c.expiresAtMs);
      } else if (createdTime) {
        expiresAt = createdTime + 3600000;
      }

      // Expired / Terkunci -> TIDAK PERNAH PENDING!
      if (expiresAt && nowMs > expiresAt) return false;
      if (c.isLocked || c.status === 'Terkunci' || c.status === 'Locked' || c.status === 'Selesai' || c.status === 'Tertutup') return false;

      // 2. Cek apakah sudah dibaca oleh admin (Notifikasi merah hilang saat dibaca)
      let localAdminReadList = [];
      let localAdminReadMsgCounts = {};
      try {
        localAdminReadList = JSON.parse(localStorage.getItem('spp_admin_read_complaints') || '[]');
        localAdminReadMsgCounts = JSON.parse(localStorage.getItem('spp_admin_read_complaint_msgs') || '{}');
      } catch (e) {}

      const msgs = Array.isArray(c.messages) 
        ? c.messages 
        : (typeof c.messages === 'string' ? (() => { try { return JSON.parse(c.messages); } catch(e){ return []; } })() : []);

      const readCount = localAdminReadMsgCounts[c.id];
      // Jika chat sudah dibuka/dibaca dan tidak ada pesan baru setelahnya -> notifikasi merah hilang!
      if (readCount !== undefined && msgs.length <= readCount) {
        return false;
      }
      if (c.isRead && (readCount === undefined || msgs.length <= readCount)) {
        return false;
      }
      if (localAdminReadList.includes(c.id) && msgs.length === 0) {
        return false;
      }

      // 3. Sesi masih aktif (< 1 jam): Periksa pesan terakhir
      if (msgs.length > 0) {
        const lastMsg = msgs[msgs.length - 1];
        const isLastFromAdmin = Boolean(
          lastMsg.senderRole === 'admin' ||
          lastMsg.sender === 'Admin TU' ||
          lastMsg.sender === 'Admin' ||
          (typeof lastMsg.sender === 'string' && lastMsg.sender.toLowerCase().includes('admin'))
        );
        // Jika pesan terakhir dari admin -> sudah dibalas -> TIDAK PENDING
        if (isLastFromAdmin) return false;
        // Jika pesan terakhir dari wali murid dan belum dibaca -> PENDING!
        return true;
      }

      // Jika belum ada array messages, cek adminReply
      if ((c.adminReply && c.adminReply.trim().length > 0) || (c.admin_reply && c.admin_reply.trim().length > 0)) {
        return false;
      }

      // Belum dibalas sama sekali & belum dibaca & masih dalam 1 jam -> PENDING!
      return true;
    };

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
      // Jika rentang bulan yang dipilih sudah <= 6 bulan (misal Jan - Jun atau Jul - Des),
      // rentang ini sudah merupakan satu semester penuh! JANGAN dipotong lagi agar tidak terpotong menjadi 3 bulan.
      if (monthsList.length <= 6) {
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

    // Helper: Deteksi semester otomatis dari objek atau nama periode pembayaran
    const detectSemesterFromPeriod = (period, fallback = 'all') => {
      if (!period) {
        const fb = String(fallback || '').toLowerCase();
        if (fb.includes('1') || fb.includes('ganjil')) return '1';
        if (fb.includes('2') || fb.includes('genap')) return '2';
        return 'all';
      }

      const pName = String(period.name || '').toLowerCase();
      const pSem = String(period.semester || '').toLowerCase();

      // 1. Cek jika nama atau semester menyebut Semester 1 / Ganjil secara spesifik
      if (pName.includes('(semester 1)') || pName.includes('semester 1') || pName.includes('smt 1') || pName.includes('ganjil') || pSem.includes('1') || pSem.includes('ganjil')) {
        return '1';
      }

      // 2. Cek jika nama atau semester menyebut Semester 2 / Genap secara spesifik
      if (pName.includes('(semester 2)') || pName.includes('semester 2') || pName.includes('smt 2') || pName.includes('genap') || pSem.includes('2') || pSem.includes('genap')) {
        return '2';
      }

      // 3. Deteksi rentang bulan jika periode semesteran (6 bulan)
      const startM = String(period.startMonth || '').toLowerCase();
      const endM = String(period.endMonth || '').toLowerCase();
      if (startM.includes('jul') && (endM.includes('des') || endM.includes('dec'))) return '1';
      if (startM.includes('jan') && endM.includes('jun')) return '2';

      // 4. Default: jika semester diset 'semua' atau 1 tahun penuh
      return 'all';
    };

    // Helper: Cek apakah suatu bulan ajaran sudah jatuh tempo / menunggak
    // ATURAN SISTEM KEUANGAN (Permintaan 1):
    // Bulan berjalan saat ini (current month / "bulan now") dan bulan lampau SUDAH TERMASUK tagihan jatuh tempo / menunggak jika belum lunas!
    // Bulan ke depannya (mIdx > curMonth) berstatus "Belum Jatuh Tempo".
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
      
      // 1. Tahun di masa depan (belum berjalan sama sekali) -> Belum Jatuh Tempo
      if (mYear > curYear) {
        return false;
      }
      
      // 2. Tahun masa lalu (sudah lewat dari tahun berjalan) -> Sudah Lewat / Menunggak
      if (mYear < curYear) {
        return true;
      }
      
      // 3. Tahun berjalan (mYear === curYear):
      // Bulan saat ini (bulan now) ataupun bulan lampau -> Jatuh Tempo / Menunggak jika belum lunas
      if (mIdx <= curMonth) {
        return true;
      }
      
      // Bulan ke depannya (mIdx > curMonth) berstatus "belum jatuh tempo"
      return false;
    };

    // Helper: Cek apakah suatu bulan ajaran (misal "Januari 2026") sudah masuk dalam masa aktif siswa
    // Siswa hanya ditagih SPP dan dihitung tunggakan mulai dari bulan & tahun saat siswa aktif sampai periode diterapkan
    const isMonthOnOrAfterStudentStart = (monthStr, student, settings = null) => {
      if (!monthStr) return false;
      const cleanStr = monthStr.trim();
      const parts = cleanStr.split(/\s+/);
      const mName = parts[0];
      const mIdx = ALL_MONTHS.indexOf(mName);
      if (mIdx === -1) return true;

      const mYear = parts[1] ? parseInt(parts[1], 10) : (settings?.startYear ? parseInt(settings.startYear, 10) : new Date().getFullYear());

      // Ambil acuan bulan & tahun mulai aktif siswa
      let sStartMonth = student?.startActiveMonth;
      let sStartYear = student?.startActiveYear ? parseInt(student.startActiveYear, 10) : null;

      // Jika belum diset spesifik di data siswa, gunakan startMonth & startYear dari settings periode aktif
      if (!sStartMonth) {
        sStartMonth = settings?.startMonth || 'Januari';
      }
      if (!sStartYear || isNaN(sStartYear)) {
        sStartYear = settings?.startYear ? parseInt(settings.startYear, 10) : mYear;
      }

      const sStartIdx = ALL_MONTHS.indexOf(sStartMonth);
      if (sStartIdx === -1) return true;

      if (mYear < sStartYear) return false;
      if (mYear > sStartYear) return true;
      return mIdx >= sStartIdx;
    };

    // Helper: Titik awal paling awal operasional sekolah dari daftar preset periode
    const getSystemEarliestPeriodStart = (settings) => {
      let startY = settings?.startYear ? parseInt(settings.startYear, 10) : 2026;
      let startM = settings?.startMonth || 'Juli';
      let startIdx = ALL_MONTHS.indexOf(startM);
      if (startIdx === -1) startIdx = 6;

      if (Array.isArray(settings?.academicPeriods) && settings.academicPeriods.length > 0) {
        settings.academicPeriods.forEach(p => {
          const pY = parseInt(p.startYear, 10);
          const pIdx = ALL_MONTHS.indexOf(p.startMonth);
          if (!isNaN(pY) && pIdx !== -1) {
            if (pY < startY || (pY === startY && pIdx < startIdx)) {
              startY = pY;
              startM = p.startMonth;
              startIdx = pIdx;
            }
          }
        });
      }
      return { month: startM, year: startY, monthIdx: startIdx };
    };

    // Helper: Titik mulai efektif penagihan siswa (memperhatikan kapan murid masuk)
    const getStudentEffectiveStart = (student, settings) => {
      const sysEarliest = getSystemEarliestPeriodStart(settings);
      let sMonth = student?.startActiveMonth;
      let sYear = student?.startActiveYear ? parseInt(student.startActiveYear, 10) : null;

      if (!sMonth || !sYear || isNaN(sYear)) {
        // Siswa tidak memiliki tanggal masuk spesifik, gunakan awal mula operasional sekolah (Januari 2026)
        return {
          month: sysEarliest.month,
          year: sysEarliest.year
        };
      }

      const sIdx = ALL_MONTHS.indexOf(sMonth);
      if (sIdx === -1) {
        return {
          month: sysEarliest.month,
          year: sysEarliest.year
        };
      }

      // Jika tanggal masuk murid tercatat sebelum sistem sekolah berdiri, batas bawah adalah sysEarliest
      if (sYear < sysEarliest.year || (sYear === sysEarliest.year && sIdx < sysEarliest.monthIdx)) {
        return { month: sysEarliest.month, year: sysEarliest.year };
      }

      return { month: sMonth, year: sYear };
    };

    // Helper: Menghasilkan seluruh rangkaian bulan penagihan siswa sejak siswa aktif masuk
    // Menarik sisa-sisa tunggakan dari sebelum semester/periode aktif saat ini s/d akhir periode aktif
    const getStudentAllBillingMonths = (student, settings, optSelectedPeriod = null) => {
      const effStart = getStudentEffectiveStart(student, settings);
      
      const targetEndObj = optSelectedPeriod || settings;
      const endM = targetEndObj?.endMonth || settings?.endMonth || 'Juni';
      const endY = parseInt(targetEndObj?.endYear || settings?.endYear) || (effStart.year + 1);

      let startM = effStart.month;
      let startY = effStart.year;

      if (optSelectedPeriod && !optSelectedPeriod.isActive && optSelectedPeriod.startMonth && optSelectedPeriod.startYear) {
        const pStartIdx = ALL_MONTHS.indexOf(optSelectedPeriod.startMonth);
        const pStartY = parseInt(optSelectedPeriod.startYear, 10);
        const sStartIdx = ALL_MONTHS.indexOf(effStart.month);
        if (pStartY > effStart.year || (pStartY === effStart.year && pStartIdx > sStartIdx)) {
          startM = optSelectedPeriod.startMonth;
          startY = pStartY;
        }
      }

      const allMonths = getMonthsList(startM, '', endM, startY, endY);
      return allMonths.filter(m => isMonthOnOrAfterStudentStart(m, student, settings));
    };

    const ensureDashboardCss = () => {
      if (typeof document === 'undefined') return Promise.resolve();
      const cssHref = window.__SPP_DASHBOARD_CSS_HREF || 'dashboard.min.css';
      const existing = document.getElementById('spp-dashboard-css');
      if (existing) {
        if (existing.dataset.loaded === '1' || existing.sheet) return Promise.resolve();
        return new Promise((resolve) => {
          const done = () => { existing.dataset.loaded = '1'; resolve(); };
          existing.addEventListener('load', done, { once: true });
          existing.addEventListener('error', done, { once: true });
          setTimeout(done, 1500);
        });
      }
      return new Promise((resolve) => {
        const link = document.createElement('link');
        link.id = 'spp-dashboard-css';
        link.rel = 'stylesheet';
        link.href = cssHref;
        const done = () => {
          link.dataset.loaded = '1';
          resolve();
        };
        link.addEventListener('load', done, { once: true });
        link.addEventListener('error', done, { once: true });
        document.head.appendChild(link);
        setTimeout(done, 1500);
      });
    };

    const prefetchDashboardCss = () => {
      if (typeof document === 'undefined') return;
      const cssHref = window.__SPP_DASHBOARD_CSS_HREF || 'dashboard.min.css';
      if (document.getElementById('spp-dashboard-css') || document.getElementById('spp-dashboard-css-prefetch')) return;
      const link = document.createElement('link');
      link.id = 'spp-dashboard-css-prefetch';
      link.rel = 'prefetch';
      link.as = 'style';
      link.href = cssHref;
      document.head.appendChild(link);
    };

    const ICON_ELEMENT_CACHE = new Map();
    const toPascalCaseIconName = (str) => (
      str ? str.split('-').map(part => part.charAt(0).toUpperCase() + part.slice(1)).join('') : ''
    );

    const Icon = React.memo(function Icon({ name, size = 18, className = "", style }) {
      const iconDef = useMemo(() => {
        if (typeof window === 'undefined') {
          const ssrMap = (typeof globalThis !== 'undefined' && globalThis.__SPP_ICONS) ? globalThis.__SPP_ICONS : null;
          return ssrMap ? (ssrMap[toPascalCaseIconName(name)] || ssrMap[name] || null) : null;
        }
        const iconsMap = (window.lucide && window.lucide.icons) ? window.lucide.icons : window.__SPP_ICONS;
        if (!iconsMap) return null;
        return iconsMap[toPascalCaseIconName(name)] || iconsMap[name] || null;
      }, [name]);

      if (!iconDef) {
        return (
          <span
            className={`inline-block shrink-0 ${className}`.trim()}
            style={{ width: size, height: size, verticalAlign: 'middle', ...style }}
            aria-hidden="true"
          />
        );
      }

      let children = ICON_ELEMENT_CACHE.get(name);
      if (!children) {
        children = iconDef.map(([tag, attrs], idx) => React.createElement(tag, { key: idx, ...attrs }));
        ICON_ELEMENT_CACHE.set(name, children);
      }

      const mergedClassName = className && className.includes('mx-auto')
        ? `shrink-0 ${className}`
        : `inline-block shrink-0 ${className}`;

      return (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          className={mergedClassName.trim()}
          style={{ verticalAlign: 'middle', ...style }}
        >
          {children}
        </svg>
      );
    });

    // Ornamen Pola / Corak Estetik Bagian Bawah Sidebar Navigasi (Admin & Wali Murid)
    const SidebarBottomOrnament = React.memo(function SidebarBottomOrnament({ roleLabel = 'Portal Terpadu' }) {
      return (
        <div className="sidebar-corak-ornament px-3.5 pt-4 pb-2 mt-auto relative z-10 select-none pointer-events-none" aria-hidden="true">
          <div className="relative rounded-2xl overflow-hidden border border-cyan-300/20 bg-gradient-to-br from-white/[0.08] via-sky-400/[0.06] to-blue-950/30 p-3.5 shadow-inner">
            {/* Layered Ornamental Geometric & Wave SVG Corak */}
            <svg className="absolute inset-0 w-full h-full opacity-35" viewBox="0 0 260 120" fill="none" preserveAspectRatio="none">
              <defs>
                <pattern id="sidebarDiamondGrid" width="24" height="24" patternUnits="userSpaceOnUse">
                  <path d="M12 0L24 12L12 24L0 12Z" stroke="rgba(186,230,253,0.38)" strokeWidth="0.7" fill="none" />
                  <circle cx="12" cy="12" r="1.5" fill="rgba(56,189,248,0.55)" />
                </pattern>
              </defs>
              <rect width="260" height="120" fill="url(#sidebarDiamondGrid)" />
              <path d="M-20 85 C40 50, 95 110, 155 72 C205 42, 240 85, 280 58 L280 130 L-20 130 Z" fill="rgba(56,189,248,0.16)" />
              <path d="M-20 100 C50 68, 120 118, 185 82 C225 60, 255 95, 280 75 L280 130 L-20 130 Z" fill="rgba(14,165,233,0.22)" />
              <circle cx="225" cy="24" r="32" stroke="rgba(125,211,252,0.3)" strokeWidth="1" strokeDasharray="3 3" />
              <circle cx="225" cy="24" r="20" stroke="rgba(255,255,255,0.22)" strokeWidth="1" />
            </svg>

            <div className="relative z-10 flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-cyan-400/20 border border-cyan-300/35 flex items-center justify-center text-cyan-200 shrink-0 shadow-xs">
                <Icon name="sparkles" size={14} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-black uppercase tracking-widest text-cyan-200/95 truncate">{roleLabel}</p>
                <p className="text-[10px] font-semibold text-blue-100/75 truncate">Transparan • Terintegrasi • Aman</p>
              </div>
            </div>
          </div>
        </div>
      );
    });

    // Background Tipis Estetik untuk Area Konten Utama Panel Admin & Wali Murid
    const PanelAestheticBg = React.memo(function PanelAestheticBg() {
      return (
        <div className="panel-subtle-bg-layer" aria-hidden="true">
          <svg className="panel-subtle-svg-mesh" viewBox="0 0 1200 800" fill="none" preserveAspectRatio="xMidYMid slice">
            <defs>
              <pattern id="panelSubtleGrid" width="44" height="44" patternUnits="userSpaceOnUse">
                <path d="M 44 0 L 0 0 0 44" fill="none" stroke="rgba(37, 99, 235, 0.04)" strokeWidth="1" />
                <circle cx="22" cy="22" r="1.2" fill="rgba(14, 165, 233, 0.065)" />
              </pattern>
            </defs>
            <rect width="1200" height="800" fill="url(#panelSubtleGrid)" />
            <path d="M-100 620 C220 490, 480 730, 820 560 C1020 460, 1150 610, 1300 520" stroke="rgba(14, 165, 233, 0.07)" strokeWidth="2" fill="none" />
            <path d="M-100 680 C260 540, 540 770, 880 610 C1060 520, 1180 650, 1300 580" stroke="rgba(37, 99, 235, 0.05)" strokeWidth="1.5" strokeDasharray="6 6" fill="none" />
            <circle cx="1060" cy="140" r="180" stroke="rgba(14, 165, 233, 0.05)" strokeWidth="1.5" strokeDasharray="8 8" />
            <circle cx="1060" cy="140" r="125" stroke="rgba(37, 99, 235, 0.04)" strokeWidth="1" />
          </svg>
          <div className="panel-subtle-watermark">
            <img src="logo.webp" alt="" className="panel-subtle-watermark-img" />
          </div>
        </div>
      );
    });

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
              src="logo.webp" 
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
        <main aria-label="Memuat Portal SPP" className="loading-screen-royal-nuance select-none">
          {/* Faint School Watermark in the background */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden" aria-hidden="true">
            <div className="w-[min(85vw,640px)] h-[min(85vw,640px)] opacity-[0.045] flex items-center justify-center pointer-events-none select-none">
              <img src="logo.webp" alt="watermark" className="w-full h-full object-contain filter brightness-125 select-none pointer-events-none" />
            </div>
          </div>

          {/* Central Luxury Container (Spacious Frosted Loading Card) */}
          <div className="relative w-full max-w-xl px-8 py-10 sm:px-12 sm:py-12 rounded-[42px] loading-glass-card text-white space-y-7 animate-in fade-in zoom-in-95 duration-300 z-10 border border-cyan-300/35 shadow-[0_30px_90px_-15px_rgba(2,6,23,0.7),0_0_60px_-10px_rgba(6,182,212,0.35)] overflow-hidden">
            {/* Floating Luxury School Emblem with Orbiting Rings and Jewel Beads (Given generous top & bottom margin so orbit rings never touch the badge below) */}
            <div className="relative mx-auto w-36 h-36 mt-5 mb-12 flex items-center justify-center">
              {/* Outer Glowing Pulsing Halo */}
              <div className="absolute inset-0 bg-gradient-to-tr from-cyan-400 via-sky-500 to-blue-600 rounded-full blur-2xl opacity-70 animate-pulse-halo"></div>
              
              {/* Dual Counter-Rotating Orbit Rings with Glowing Jewels */}
              <div className="absolute -inset-4 rounded-full border-2 border-dashed border-cyan-400/70 loading-orbit-ring pointer-events-none">
                <span className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-amber-400 shadow-[0_0_12px_#f59e0b] border-2 border-slate-900"></span>
                <span className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 w-2.5 h-2.5 rounded-full bg-sky-400 shadow-[0_0_10px_#38bdf8] border border-slate-900"></span>
              </div>
              <div className="absolute -inset-7 rounded-full border border-dotted border-blue-400/80 loading-orbit-counter pointer-events-none">
                <span className="absolute left-0 top-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-cyan-400 shadow-[0_0_12px_#22d3ee] border-2 border-slate-900"></span>
                <span className="absolute right-0 top-1/2 translate-x-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-indigo-400 shadow-[0_0_10px_#818cf8]"></span>
              </div>

              {/* Central Official PAUD SETIA BHAKTI Logo Badge with 3D Ring */}
              <div className="relative w-28 h-28 rounded-full p-2 bg-gradient-to-tr from-cyan-400 via-sky-500 to-blue-600 shadow-[0_15px_40px_rgba(6,182,212,0.45)] overflow-hidden flex items-center justify-center border-4 border-white/95 bg-white group hover:scale-105 transition-transform animate-pulse-glow">
                <img 
                  src="logo.webp" 
                  alt="Logo PAUD Setia Bhakti" 
                  className="w-full h-full object-contain rounded-full" 
                />
              </div>
            </div>

            {/* Header Titles */}
            <div className="text-center space-y-2.5 pt-2">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-cyan-400/40 text-cyan-300 shadow-sm">
                <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 shadow-[0_0_10px_#22d3ee] animate-pulse"></span>
                <span className="text-[11px] font-black tracking-widest uppercase">
                  {isAdmin ? 'ADMINISTRATOR TU WORKSPACE' : 'PORTAL RESMI WALI MURID'}
                </span>
              </div>
              <h3 className="text-2xl sm:text-3xl font-black tracking-tight text-white drop-shadow-md">
                {isAdmin ? 'Memuat Sistem Keuangan SPP...' : 'Menyiapkan Portal Ananda...'}
              </h3>
              <p className="text-xs font-black text-cyan-300 tracking-wider uppercase">
                PAUD SETIA BHAKTI • BEKASI
              </p>
              <p className="text-xs font-medium text-blue-100/80 italic max-w-sm mx-auto">
                "Mewujudkan Generasi Cerdas & Berakhlak Mulia"
              </p>
            </div>

            {/* 3 Interactive Stage Steps with Generous Spacing */}
            <div className="grid grid-cols-3 gap-3.5 pt-2 text-left">
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
                    className={`p-3.5 sm:p-4 rounded-2xl border transition-all ${
                      isPassed
                        ? 'bg-emerald-500/20 border-emerald-400/60 text-emerald-200 shadow-[0_0_15px_rgba(16,185,129,0.25)]'
                        : isCurrent
                          ? 'bg-cyan-500/25 border-cyan-300 text-cyan-100 shadow-[0_0_20px_rgba(6,182,212,0.4)] ring-2 ring-cyan-400/50 animate-pulse'
                          : 'bg-white/5 border-white/10 text-white/40'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 mb-1.5">
                      {isPassed ? (
                        <div className="w-4 h-4 rounded-full bg-emerald-500 text-slate-950 flex items-center justify-center font-black text-[10px] shadow-sm">
                          ✓
                        </div>
                      ) : (
                        <span className={`w-2.5 h-2.5 rounded-full ${isCurrent ? 'bg-cyan-400 animate-ping' : 'bg-white/20'}`}></span>
                      )}
                      <span className="text-[10px] font-black uppercase tracking-wider">Tahap {s.step}</span>
                    </div>
                    <p className="text-xs sm:text-[13px] font-black leading-tight">{s.label}</p>
                  </div>
                );
              })}
            </div>

            {/* Animated Royal Progress Bar */}
            <div className="space-y-3 pt-2">
              <div className="flex justify-between items-center text-xs font-bold px-1">
                <span className="text-xs text-cyan-200 font-bold truncate max-w-[340px]">
                  {stepText}
                </span>
                <span className="text-base font-black text-cyan-300 font-mono tracking-wider">
                  {progress}%
                </span>
              </div>

              <div className="w-full bg-slate-950/80 rounded-full h-4 sm:h-5 p-0.5 border border-white/20 shadow-inner relative overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-blue-600 via-cyan-400 to-sky-300 transition-all duration-200 ease-out relative shadow-[0_0_15px_rgba(6,182,212,0.6)] overflow-hidden"
                  style={{ width: `${progress}%` }}
                >
                  {/* Laser Scanning Sweep Effect */}
                  <div className="animate-laser-sweep"></div>
                  
                  {/* Glowing Leading Head Pointer */}
                  <div className="absolute right-0 top-0 bottom-0 w-3 bg-white rounded-full shadow-[0_0_10px_#ffffff]"></div>
                </div>
              </div>
            </div>

            {/* Footer Institutional Tagline */}
            <div className="pt-3 border-t border-white/10 flex items-center justify-between text-xs text-slate-300 font-medium tracking-wide">
              <span className="truncate font-bold text-white">PAUD Setia Bhakti • Bekasi</span>
              <span className="flex items-center gap-1.5 text-emerald-300 font-extrabold text-[11px] bg-emerald-500/20 px-2.5 py-1 rounded-full border border-emerald-400/40 shadow-sm">
                <Icon name="shield-check" size={13} className="text-emerald-400" />
                <span>Koneksi Aman Terverifikasi</span>
              </span>
            </div>
          </div>
        </main>
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
    // CRUD POPUP MODAL (Admin & User Portals)
    // ==========================================
    function CrudPopupModal({ popup, onClose }) {
      if (!popup) return null;

      const isConfirm = popup.type === 'confirm' || popup.type === 'delete_confirm';
      const isDelete = popup.type === 'delete' || popup.type === 'delete_confirm';
      const isError = popup.type === 'error';
      const isInfo = popup.type === 'info';
      const isSuccess = popup.type === 'success' || (!isConfirm && !isDelete && !isError && !isInfo);

      return (
        <div 
          className="crud-modal-backdrop" 
          onClick={(e) => { 
            if (e.target === e.currentTarget && !isConfirm) onClose(); 
          }}
        >
          <div className="crud-modal-card" onClick={(e) => e.stopPropagation()}>
            {/* Top Glowing Orb */}
            <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-36 h-36 rounded-full bg-cyan-400/25 blur-3xl pointer-events-none"></div>

            {/* Close 'X' Button */}
            {!isConfirm && (
              <button
                type="button"
                onClick={onClose}
                className="absolute top-4 right-4 w-9 h-9 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition active:scale-95"
              >
                <Icon name="x" size={18} />
              </button>
            )}

            {/* Animated Icon Avatar */}
            <div className="mx-auto mb-4 w-16 h-16 flex items-center justify-center relative z-10">
              {isConfirm || isDelete ? (
                <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-rose-500 to-amber-500 text-white flex items-center justify-center shadow-xl shadow-rose-500/35 ring-4 ring-rose-100">
                  <Icon name="alert-triangle" size={32} />
                </div>
              ) : isError ? (
                <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-rose-600 to-red-500 text-white flex items-center justify-center shadow-xl shadow-rose-500/35 ring-4 ring-rose-100">
                  <Icon name="alert-circle" size={32} />
                </div>
              ) : isInfo ? (
                <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-sky-500 to-blue-600 text-white flex items-center justify-center shadow-xl shadow-sky-500/35 ring-4 ring-sky-100">
                  <Icon name="info" size={32} />
                </div>
              ) : (
                <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-emerald-500 via-teal-500 to-cyan-500 text-white flex items-center justify-center shadow-xl shadow-emerald-500/35 ring-4 ring-emerald-100">
                  <Icon name="check" size={34} />
                </div>
              )}
            </div>

            {/* Modal Title */}
            <h3 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight mb-2">
              {popup.title || (isConfirm ? 'Konfirmasi Tindakan' : isDelete ? 'Data Berhasil Dihapus' : 'Operasi Berhasil')}
            </h3>

            {/* Modal Message */}
            <p className="text-xs sm:text-sm font-semibold text-slate-600 leading-relaxed mb-6 px-1">
              {popup.message}
            </p>

            {/* Extra Details Box (if provided) */}
            {popup.details && typeof popup.details === 'object' && (
              <div className="mb-6 p-4 bg-slate-50 border border-slate-200/90 rounded-2xl text-left text-xs font-semibold text-slate-700 space-y-1.5 shadow-inner">
                {Object.entries(popup.details).map(([key, val]) => (
                  <div key={key} className="flex justify-between items-center py-1 border-b border-slate-200/60 last:border-0">
                    <span className="text-slate-500 font-bold">{key}</span>
                    <span className="font-black text-slate-800 truncate max-w-[220px]">{String(val)}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Action Buttons */}
            {isConfirm ? (
              <div className="flex items-center gap-3 justify-center pt-1">
                <button
                  type="button"
                  onClick={() => {
                    if (popup.onCancel) popup.onCancel();
                    onClose();
                  }}
                  className="flex-1 py-3 px-5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-black text-sm transition active:scale-95 border border-slate-200"
                >
                  {popup.cancelText || 'Batal'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (popup.onConfirm) popup.onConfirm();
                    onClose();
                  }}
                  className="flex-1 py-3 px-5 rounded-2xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-700 hover:to-red-700 text-white font-black text-sm shadow-lg shadow-rose-600/35 transition active:scale-95"
                >
                  {popup.confirmText || 'Ya, Lanjutkan'}
                </button>
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row items-center gap-2.5 justify-center pt-1">
                {popup.onExtraAction && popup.extraActionText && (
                  <button
                    type="button"
                    onClick={() => {
                      popup.onExtraAction();
                      onClose();
                    }}
                    className="w-full sm:w-auto flex-1 py-3 px-5 rounded-2xl bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-300 font-black text-sm transition flex items-center justify-center gap-2 active:scale-95 shadow-sm"
                  >
                    <Icon name={popup.extraActionIcon || 'printer'} size={16} />
                    <span>{popup.extraActionText}</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full sm:w-auto flex-1 py-3 px-6 rounded-2xl bg-gradient-to-r from-blue-600 via-sky-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600 text-white font-black text-sm shadow-lg shadow-sky-500/35 transition active:scale-95"
                >
                  {popup.buttonText || 'Mengerti & Tutup'}
                </button>
              </div>
            )}
          </div>
        </div>
      );
    }

    // ==========================================
    // 1. KOMPONEN LOGIN SPLIT CARD DUAL ROLE
    // ==========================================
    
    function LoginView({ onLogin, settings, students, onPrepareAuth, isSsrSnapshot = false, ssrHydrating = false, initialUsername = '', initialPassword = '' }) {
      const [hasMounted, setHasMounted] = useState(() => !ssrHydrating);
      const [role, setRole] = useState(() => {
        if (typeof window === 'undefined' || ssrHydrating) return 'parent';
        try {
          const urlParams = new URLSearchParams(window.location.search);
          const r = urlParams.get('role') || (window.location.hash.includes('admin') ? 'admin' : (window.location.hash.includes('wali') || window.location.hash.includes('parent') ? 'parent' : null));
          if (r) return r;
          const savedIntended = sessionStorage.getItem('spp_intended_role');
          if (savedIntended) return savedIntended;
        } catch (e) {}
        return 'parent';
      }); // 'parent' or 'admin'
      const [username, setUsername] = useState(() => (ssrHydrating ? '' : (initialUsername || '')));
      const [password, setPassword] = useState(() => (ssrHydrating ? '' : (initialPassword || '')));
      const [showPassword, setShowPassword] = useState(false);
      const [rememberMe, setRememberMe] = useState(true);
      const [errorMsg, setErrorMsg] = useState('');
      const [isSubmitting, setIsSubmitting] = useState(false);

      const handleLoginSubmit = async (e) => {
        e.preventDefault();
        if (isSubmitting) return;
        setErrorMsg('');
        setIsSubmitting(true);

        try {
          let activeSettings = settings;
          let activeStudents = students;

          if (typeof onPrepareAuth === 'function') {
            try {
              const prepared = await onPrepareAuth('submit');
              if (prepared) {
                if (prepared.settings) activeSettings = prepared.settings;
                if (prepared.students) activeStudents = prepared.students;
              }
            } catch (err) {
              setErrorMsg('Gagal terhubung ke server portal. Periksa koneksi internet Anda lalu coba kembali.');
              return;
            }
          }

          const cleanInput = username.trim().toLowerCase();

          if (role === 'admin') {
            const expectedAdminUser = (activeSettings.adminUsername || '').trim().toLowerCase();
            const expectedAdminPass = (activeSettings.adminPassword || '').trim();
            
            if (
              expectedAdminUser &&
              cleanInput === expectedAdminUser &&
              password.trim() === expectedAdminPass
            ) {
              await Promise.resolve(onLogin({ role: 'admin', name: activeSettings.adminName || 'Sarah Aura Alamanda' }));
            } else {
              setErrorMsg('Username atau Password Admin TU tidak cocok. Silakan pastikan akun Admin Anda benar.');
            }
          } else {
            // Login Wali Murid: Cari berdasarkan NIS ATAU Nama Siswa (case-insensitive)
            const student = (activeStudents || []).find(s => 
              (s.nis && s.nis.toString().trim() === username.trim()) ||
              (s.name && s.name.trim().toLowerCase() === cleanInput)
            );
            
            if (!student) {
              setErrorMsg('Data Wali Siswa / NIS tidak ditemukan dalam sistem. Silakan masukkan NIS atau Nama Siswa ananda.');
              return;
            }

            // CEK STATUS SISWA (LULUS / KELUAR / NON-AKTIF):
            const isStudentActive = student.statusAktif !== false && (!student.status || student.status.toLowerCase() === 'aktif');
            if (!isStudentActive) {
              setErrorMsg('Akun siswa ini berstatus NON-AKTIF / TELAH KELUAR / LULUS (Status Akun: OFF). Akses login ke portal telah ditutup oleh pihak sekolah. Silakan hubungi bagian Tata Usaha (TU).');
              return;
            }

            const enteredPwd = password.trim();

            // Cek apakah password akun saat ini adalah status Default Sistem:
            // Default: belum ada password kustom, ATAU password sama dengan Sb[NIS], ATAU sama dengan [NIS]
            const isDefault = !student.password || 
                              student.password.toString().trim() === student.nis.toString().trim() || 
                              student.password.toString().trim() === `Sb${student.nis.toString().trim()}`;

            let isValid = false;
            if (isDefault) {
              const validDefaults = [
                `Sb${student.nis.toString().trim()}`,
                student.nis.toString().trim()
              ];
              if (student.password && student.password.toString().trim().length > 0) {
                validDefaults.push(student.password.toString().trim());
              }
              isValid = validDefaults.includes(enteredPwd);
            } else {
              // Jika akun telah diset menggunakan password kustom terbaru
              isValid = (enteredPwd === student.password.toString().trim());
            }

            if (isValid) {
              await Promise.resolve(onLogin({ role: 'parent', student: student }));
            } else {
              if (isDefault) {
                setErrorMsg(`Password akun telah diatur ke Default Sistem. Silakan masuk menggunakan password default: Sb${student.nis} (atau NIS Anda).`);
              } else {
                setErrorMsg('Password akun tidak cocok dengan password yang aktif saat ini. Silakan coba lagi.');
              }
            }
          }
        } finally {
          setIsSubmitting(false);
        }
      };

      const [currentTime, setCurrentTime] = useState(() => new Date());
      const [activeFeatureIdx, setActiveFeatureIdx] = useState(null);
      const [spinningIcons, setSpinningIcons] = useState({ 0: false, 1: false, 2: false, 3: false });

      useEffect(() => {
        if (!hasMounted) setHasMounted(true);
        if (ssrHydrating && typeof window !== 'undefined') {
          try {
            const urlParams = new URLSearchParams(window.location.search);
            const r = urlParams.get('role') || (window.location.hash.includes('admin') ? 'admin' : (window.location.hash.includes('wali') || window.location.hash.includes('parent') ? 'parent' : null));
            const intended = r || sessionStorage.getItem('spp_intended_role');
            if (intended === 'admin' || intended === 'parent') {
              setRole(intended);
            }
            const domUser = document.getElementById('login-username')?.value || initialUsername || '';
            const domPass = document.getElementById('login-password')?.value || initialPassword || '';
            if (domUser) setUsername(domUser);
            if (domPass) setPassword(domPass);
          } catch (e) {}
        }
        const timer = setInterval(() => setCurrentTime(new Date()), 15000);
        return () => clearInterval(timer);
      }, []);

      const triggerIconSpin = (idx) => {
        setActiveFeatureIdx(prev => (prev === idx ? null : idx));
        setSpinningIcons(prev => ({ ...prev, [idx]: true }));
        setTimeout(() => {
          setSpinningIcons(prev => ({ ...prev, [idx]: false }));
        }, 750);
      };

      const loginFeatures = [
        {
          icon: 'credit-card',
          title: 'Bayar SPP Instan',
          sub: 'QRIS & VA Bank',
          detail: 'Pembayaran otomatis terverifikasi 24 jam tanpa perlu kirim bukti manual.',
          iconBg: 'bg-sky-400/20 text-sky-300 border-sky-400/35',
          activeBorder: 'border-sky-400/60 bg-sky-500/20 shadow-sky-500/20',
          glowColor: 'from-sky-400/30 to-cyan-300/10'
        },
        {
          icon: 'printer',
          title: 'Kuitansi Resmi',
          sub: 'Cetak Bukti Sah',
          detail: 'Unduh & cetak kuitansi digital resmi berstempel PAUD Setia Bhakti kapan saja.',
          iconBg: 'bg-emerald-400/20 text-emerald-300 border-emerald-400/35',
          activeBorder: 'border-emerald-400/60 bg-emerald-500/20 shadow-emerald-500/20',
          glowColor: 'from-emerald-400/30 to-teal-300/10'
        },
        {
          icon: 'file-text',
          title: 'Catatan Siswa',
          sub: 'Laporan Motorik',
          detail: 'Pantau catatan perkembangan, motorik, dan pesan khusus dari Tata Usaha.',
          iconBg: 'bg-purple-400/20 text-purple-300 border-purple-400/35',
          activeBorder: 'border-purple-400/60 bg-purple-500/20 shadow-purple-500/20',
          glowColor: 'from-purple-400/30 to-fuchsia-300/10'
        },
        {
          icon: 'message-square',
          title: 'Layanan Aduan',
          sub: 'Live Chat 1 Jam',
          detail: 'Konsultasi & pengaduan langsung terhubung dengan Admin TU secara real-time.',
          iconBg: 'bg-amber-400/20 text-amber-300 border-amber-400/35',
          activeBorder: 'border-amber-400/60 bg-amber-500/20 shadow-amber-500/20',
          glowColor: 'from-amber-400/30 to-yellow-300/10'
        }
      ];

      const formattedDate = currentTime.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
      const formattedClock = currentTime.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB';

      const getTimeGreeting = () => {
        const hour = currentTime.getHours();
        if (hour >= 3 && hour < 11) return { text: 'Selamat Pagi', emoji: '🌅', color: 'from-amber-400 to-orange-500' };
        if (hour >= 11 && hour < 15) return { text: 'Selamat Siang', emoji: '☀️', color: 'from-amber-400 to-yellow-500' };
        if (hour >= 15 && hour < 18) return { text: 'Selamat Sore', emoji: '🌤️', color: 'from-orange-400 to-rose-500' };
        return { text: 'Selamat Malam', emoji: '🌙', color: 'from-indigo-400 to-sky-400' };
      };
      const greeting = getTimeGreeting();

      let waPhone = settings.phone ? settings.phone.replace(/[^0-9]/g, '') : '6281234567890';
      if (waPhone.startsWith('0')) {
        waPhone = '62' + waPhone.slice(1);
      } else if (waPhone.startsWith('8')) {
        waPhone = '62' + waPhone;
      }
      const waLink = `https://wa.me/${waPhone}?text=${encodeURIComponent('Halo Admin ' + (settings.schoolName || 'PAUD SETIA BHAKTI') + ', saya wali murid ingin meminta bantuan login/reset password.')}`;

      const showLiveStatus = !isSsrSnapshot && hasMounted;

      return (
        <main aria-label="Portal Login SPP" className="min-h-screen login-ambient-canvas flex flex-col items-center justify-center p-3 sm:p-5 md:p-8 lg:p-10 relative overflow-hidden">
          {/* Subtle Watermark in Login Canvas (LCP Optimized with WebP & High Priority) */}
          <div className="luxury-watermark-bg" aria-hidden="true">
            <div className="luxury-school-watermark flex items-center justify-center">
              <img 
                src="logo.webp" 
                alt="" 
                width="224"
                height="224"
                fetchPriority="high"
                decoding="sync"
                className="w-full h-full object-contain filter contrast-125 select-none pointer-events-none opacity-15" 
              />
            </div>
          </div>

          {/* Top Brand & Status Pill (Visible on Desktop / Tablet) */}
          <div className="relative z-10 mb-4 hidden lg:flex items-center gap-3 px-6 py-2.5 rounded-full bg-white/10 backdrop-blur-xl border border-white/20 text-white shadow-2xl shadow-blue-950/40">
            <div className="w-7 h-7 rounded-full bg-white/20 border border-white/30 flex items-center justify-center p-0.5 overflow-hidden shrink-0">
              <img src="logo.webp" alt="PAUD Setia Bhakti" width="28" height="28" className="w-full h-full object-contain" />
            </div>
            <span className="text-xs font-black tracking-wide text-white">{settings.schoolName || 'PAUD SETIA BHAKTI'}</span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="text-[11px] font-bold text-blue-200">Portal Layanan SPP & Administrasi Siswa</span>
            <span className="px-2.5 py-0.5 rounded-full bg-amber-400/20 text-amber-300 text-[10px] font-black border border-amber-400/30">{`Tahun Ajaran ${settings.academicYear || '2026/2027'}`}</span>
          </div>

          {/* MAIN LOGIN CARD: Responsive (Full 2-Column on Desktop, Sleek Mobile Card on Mobile) */}
          <div className="w-full max-w-[430px] lg:max-w-5xl xl:max-w-6xl 2xl:max-w-[1240px] login-glass-card rounded-[32px] sm:rounded-[36px] lg:rounded-[40px] overflow-hidden relative z-10 flex flex-col lg:flex-row shadow-2xl transition-all border border-white/20">
            
            {/* LEFT HERO PANEL (Midnight Sapphire): Compact on Mobile, Full Majestic on Desktop */}
            <div className="relative lg:w-[46%] xl:w-[45%] bg-gradient-to-br from-[#0a1838] via-[#0d2250] to-[#07132e] text-white p-5 sm:p-7 lg:p-10 xl:p-12 flex flex-col justify-between overflow-hidden shrink-0">

              {/* Subtle background circles for depth */}
              <div className="absolute -top-16 -left-16 w-52 h-52 rounded-full bg-blue-500/10 blur-xl pointer-events-none"></div>
              <div className="absolute bottom-8 left-8 w-44 h-44 rounded-full bg-sky-400/15 blur-2xl pointer-events-none"></div>

              {/* Layered Organic Wave Divider (Right edge on Desktop) */}
              <div className="hidden lg:block absolute top-0 bottom-0 -right-1 w-24 overflow-hidden pointer-events-none z-10" aria-hidden="true">
                <svg className="h-full w-full" preserveAspectRatio="none" viewBox="0 0 120 500" fill="none">
                  <path d="M120,0 L60,0 C20,30 20,80 60,110 C20,140 20,190 60,220 C20,250 20,300 60,330 C20,360 20,410 60,440 C30,470 30,490 60,500 L120,500 Z" fill="rgba(255, 255, 255, 0.22)" />
                  <path d="M120,0 L78,0 C45,35 45,85 78,115 C45,145 45,195 78,225 C45,255 45,305 78,335 C45,365 45,415 78,445 C55,475 55,490 78,500 L120,500 Z" fill="rgba(255, 255, 255, 0.45)" />
                  <path d="M120,0 L96,0 C70,40 70,90 96,120 C70,150 70,200 96,230 C70,260 70,310 96,340 C70,370 70,420 96,450 C80,475 80,490 96,500 L120,500 Z" fill="#ffffff" />
                </svg>
              </div>

              {/* Mobile Wave Divider (Bottom edge of top banner on mobile) */}
              <div className="block lg:hidden absolute -bottom-1 left-0 right-0 h-8 overflow-hidden pointer-events-none z-10" aria-hidden="true">
                <svg className="w-full h-full" preserveAspectRatio="none" viewBox="0 0 500 60" fill="none">
                  <path d="M0,60 L0,30 C60,10 120,10 180,30 C240,50 300,50 360,30 C420,10 480,10 500,20 L500,60 Z" fill="#ffffff" />
                </svg>
              </div>

              {/* Brand & Content Container */}
              <div className="relative z-10 flex flex-col justify-between h-full pb-4 lg:pb-0">
                
                {/* 1. Header Bar: Status Capsule on Mobile & Desktop (Locked bounds to prevent font layout shift) */}
                <div className="flex items-center justify-between gap-2.5 mb-4 sm:mb-5">
                  <div className="inline-flex items-center gap-2 h-8 sm:h-9 px-3.5 rounded-full bg-white/10 backdrop-blur-md text-[11px] font-bold text-white border border-white/15 shadow-sm min-w-0">
                    <Icon name="clock" size={13} className="text-cyan-300 shrink-0" />
                    <span className="truncate">{showLiveStatus ? `${formattedDate} • ${formattedClock}` : 'Portal Resmi Sekolah • 24 Jam'}</span>
                  </div>
                  <div className="inline-flex items-center justify-center shrink-0 min-w-[125px] gap-1.5 h-8 sm:h-9 px-3 rounded-full bg-white/15 backdrop-blur-md text-xs font-black text-cyan-200 border border-white/20 shadow-xs">
                    <span>{showLiveStatus ? greeting.emoji : '✨'}</span>
                    <span>{showLiveStatus ? `${greeting.text}!` : 'Selamat Datang!'}</span>
                  </div>
                </div>

                {/* 2. School Identity: Clean, Balanced, Aligned */}
                <div className="flex items-center gap-3 sm:gap-4 mb-4 lg:mb-6">
                  {/* Logo Container with Strict Constrained Dimensions */}
                  <div 
                    className="rounded-2xl bg-white p-1.5 shadow-xl border-2 border-white/80 shrink-0 flex items-center justify-center animate-mascot-sway" 
                    style={{ width: '56px', height: '56px', minWidth: '56px', minHeight: '56px', maxWidth: '56px', maxHeight: '56px' }}
                  >
                    <img 
                      src="logo.webp" 
                      alt="Logo PAUD Setia Bhakti" 
                      width="56"
                      height="56"
                      className="w-full h-full max-h-full max-w-full object-contain filter drop-shadow select-none pointer-events-none" 
                    />
                  </div>

                  <div className="min-w-0 flex-1">
                    <h1 className="text-base sm:text-xl lg:text-2xl font-black text-white tracking-tight leading-tight truncate">
                      {settings.schoolName || 'PAUD SETIA BHAKTI'}
                    </h1>
                    <div className="flex items-center gap-1.5 sm:gap-2 mt-1 flex-wrap">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-400/20 border border-amber-400/30 text-amber-300 text-[10px] font-black tracking-wide">
                        ⭐ Akreditasi A Unggul • NPSN Resmi
                      </span>
                      <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-cyan-400/15 border border-cyan-400/25 text-cyan-200 text-[10px] font-extrabold">
                        📖 Kurikulum Merdeka PAUD
                      </span>
                    </div>
                    <p className="text-[11px] lg:text-xs text-blue-100/80 font-medium leading-relaxed mt-1 hidden sm:block max-w-sm">
                      Sistem Informasi Pembayaran SPP & Administrasi Kesiswaan Terpadu.
                    </p>
                  </div>
                </div>

                {/* 3. 4 Interactive Feature Cards (2x2 Grid) */}
                <div className="mb-3 lg:mb-5">
                  <div className="grid grid-cols-2 gap-2.5 text-xs text-blue-100 font-semibold">
                    {loginFeatures.map((feat, idx) => {
                      const isActive = activeFeatureIdx === idx;
                      const isSpinning = !!spinningIcons[idx];
                      return (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => triggerIconSpin(idx)}
                          onMouseEnter={() => {
                            setSpinningIcons(prev => ({ ...prev, [idx]: true }));
                            setTimeout(() => setSpinningIcons(prev => ({ ...prev, [idx]: false })), 700);
                          }}
                          className={`login-feature-card-interactive group relative p-2.5 lg:p-3 rounded-2xl backdrop-blur-md border flex items-center gap-2.5 text-left transition-all duration-300 cursor-pointer overflow-hidden ${
                            isActive
                              ? `${feat.activeBorder} scale-[1.02] shadow-lg`
                              : 'bg-white/10 hover:bg-white/15 border-white/15 hover:border-white/30 shadow-xs hover:-translate-y-0.5'
                          }`}
                        >
                          {/* Subtle hover gradient glow */}
                          <div className={`absolute inset-0 bg-gradient-to-br ${feat.glowColor} opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none`}></div>

                          {/* Rotating / Orbiting Icon Container (Flattened DOM level) */}
                          <div className={`relative w-8 h-8 lg:w-9 lg:h-9 rounded-xl border ${feat.iconBg} flex items-center justify-center shrink-0 transition-transform duration-500 group-hover:scale-110`}>
                            {/* Continuous rotating dashed orbit ring around the icon */}
                            <span
                              className="login-icon-orbit-ring absolute -inset-1 rounded-xl border border-dashed border-current opacity-40 group-hover:opacity-85 pointer-events-none"
                              style={{ animationDelay: `${idx * -1.5}s` }}
                            ></span>
                            <Icon 
                              name={feat.icon} 
                              size={15} 
                              className={`login-feature-icon-inner ${isSpinning ? 'login-icon-spin-burst' : 'login-icon-idle-orbit'}`}
                              style={{ animationDelay: `${idx * 0.4}s` }}
                            />
                          </div>

                          <div className="min-w-0 flex-1 relative z-10">
                            <p className="font-black text-white text-[11px] lg:text-xs truncate group-hover:text-cyan-200 transition-colors">{feat.title}</p>
                            <p className="text-[9px] lg:text-[10px] text-blue-200/85 truncate">{feat.sub}</p>
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {/* Interactive Feature Detail Pill when a user clicks one of the 4 cards */}
                  {activeFeatureIdx !== null && loginFeatures[activeFeatureIdx] && (
                    <div className="mt-2 px-3 py-2 rounded-xl bg-white/15 backdrop-blur-md border border-cyan-300/30 text-[10px] sm:text-[11px] text-cyan-100 font-bold flex items-center justify-between gap-2 animate-in fade-in duration-200">
                      <span className="leading-snug">{loginFeatures[activeFeatureIdx].detail}</span>
                      <button
                        type="button"
                        onClick={() => setActiveFeatureIdx(null)}
                        className="text-cyan-300 hover:text-white shrink-0 p-0.5"
                        title="Tutup info"
                        aria-label="Tutup informasi fitur"
                      >
                        <Icon name="x" size={12} />
                      </button>
                    </div>
                  )}
                </div>

                {/* 4. Official Slogan Card (Visible on Mobile & Desktop) */}
                <div className="p-3.5 lg:p-4 rounded-2xl bg-gradient-to-br from-white/12 via-white/8 to-cyan-400/10 backdrop-blur-md border border-white/20 text-blue-50 leading-snug w-full mb-3 lg:mb-4 shadow-inner relative overflow-hidden group">
                  <div className="absolute -right-6 -bottom-6 w-20 h-20 rounded-full bg-cyan-400/15 blur-xl pointer-events-none"></div>
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-cyan-400/20 border border-cyan-300/30 text-[9px] font-black text-cyan-200 uppercase tracking-widest">
                      <Icon name="sparkles" size={10} className="text-cyan-300" />
                      Slogan Layanan Resmi
                    </span>
                  </div>
                  <p className="text-xs lg:text-[13px] font-extrabold text-white tracking-tight leading-relaxed">
                    "Kini Bayar SPP Makin Mudah. Tanpa Antre, Transparan, dan Aman."
                  </p>
                  <p className="text-[10px] font-black text-cyan-300 mt-1.5 uppercase tracking-wider flex items-center gap-1.5">
                    <span className="w-3 h-0.5 bg-cyan-400 rounded-full inline-block"></span>
                    Layanan Terpadu PAUD Setia Bhakti
                  </p>
                </div>

                {/* Footer Desktop Note */}
                <div className="hidden lg:flex items-center justify-between pt-3 border-t border-white/15 text-[11px] font-bold text-blue-200 uppercase tracking-wider">
                  <span>PORTAL RESMI SPP</span>
                  <span>VERSI 1.0</span>
                </div>

              </div>
            </div>

            {/* RIGHT FORM PANEL: Crisp, Clean, Ultra-Spacious on Desktop & Mobile */}
            <div className="lg:w-[54%] xl:w-[55%] bg-white p-5 sm:p-7 lg:p-10 xl:p-12 flex flex-col justify-between relative z-10 text-slate-800">
              <div>
                
                {/* Header Title with Sub-Badge */}
                <div className="mb-4 lg:mb-6">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-[11px] font-black uppercase tracking-wider mb-2 border border-blue-100">
                    <Icon name="sparkles" size={13} className="text-blue-600" />
                    <span>Portal Resmi SPP & Akademik</span>
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                    Masuk ke Akun
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">
                    Silakan pilih peran dan masukkan data akun Anda untuk melanjutkan ke dasbor.
                  </p>
                </div>

                {/* Role Switcher Pill Tabs with Smooth Visual Indicator */}
                <div className="p-1 bg-slate-100 rounded-2xl flex items-center mb-4 border border-slate-200/80 shadow-inner">
                  <button
                    type="button"
                    onClick={() => { 
                      prefetchDashboardCss();
                      if (typeof onPrepareAuth === 'function') onPrepareAuth('prefetch');
                      if (role !== 'parent') {
                        setRole('parent'); 
                        setErrorMsg(''); 
                        setUsername(''); 
                        setPassword(''); 
                        try { sessionStorage.setItem('spp_intended_role', 'parent'); } catch(e){} 
                      }
                    }}
                    className={`flex-1 min-h-[44px] py-2.5 px-3 rounded-xl text-xs sm:text-sm font-extrabold transition-all duration-200 flex items-center justify-center gap-2 ${
                      role === 'parent'
                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30 scale-[1.01]'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
                    }`}
                  >
                    <Icon name="users" size={17} className="shrink-0" />
                    <span>Wali Murid</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => { 
                      prefetchDashboardCss();
                      if (typeof onPrepareAuth === 'function') onPrepareAuth('prefetch');
                      if (role !== 'admin') {
                        setRole('admin'); 
                        setErrorMsg(''); 
                        setUsername(''); 
                        setPassword(''); 
                        try { sessionStorage.setItem('spp_intended_role', 'admin'); } catch(e){} 
                      }
                    }}
                    className={`flex-1 min-h-[44px] py-2.5 px-3 rounded-xl text-xs sm:text-sm font-extrabold transition-all duration-200 flex items-center justify-center gap-2 ${
                      role === 'admin'
                        ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30 scale-[1.01]'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
                    }`}
                  >
                    <Icon name="shield-check" size={17} className="shrink-0" />
                    <span>Admin TU</span>
                  </button>
                </div>

                {/* Error Banner */}
                {errorMsg && (
                  <div className="mb-4 p-3.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs sm:text-sm font-bold rounded-2xl flex items-center gap-2.5 animate-in fade-in">
                    <Icon name="alert-circle" size={17} className="text-rose-600 shrink-0" />
                    <span className="min-w-0 flex-1">{errorMsg}</span>
                  </div>
                )}

                {/* Dynamic Role Guide Banner */}
                {role === 'parent' ? (
                  <div className="greeting-welcome-banner p-3.5 sm:p-4 rounded-2xl flex items-start sm:items-center gap-3.5 mb-4 border border-blue-100 bg-blue-50/60 shadow-xs relative overflow-hidden">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-sky-500 text-white flex items-center justify-center font-black text-xl shadow-md shrink-0">
                      <span>👋</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-xs sm:text-sm font-black text-slate-800 flex items-center gap-1.5">
                        <span>Halo Bapak/Ibu Wali Murid!</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-bold">Portal Wali</span>
                      </h3>
                      <p className="text-[11px] sm:text-xs text-slate-600 font-medium mt-0.5 leading-snug">
                        Silakan masuk menggunakan NIS dan kata sandi akun yang terdaftar untuk mengakses rincian tagihan SPP ananda.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="greeting-welcome-banner p-3.5 sm:p-4 rounded-2xl flex items-start sm:items-center gap-3.5 mb-4 border border-indigo-100 bg-indigo-50/60 shadow-xs relative overflow-hidden">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-700 to-purple-600 text-white flex items-center justify-center font-black text-xl shadow-md shrink-0">
                      <Icon name="shield" size={18} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-xs sm:text-sm font-black text-slate-800 flex items-center gap-1.5">
                        <span>Halo Administrator TU!</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 font-bold">Admin Panel</span>
                      </h3>
                      <p className="text-[11px] sm:text-xs text-slate-600 font-medium mt-0.5 leading-snug">
                        Portal resmi pengelolaan SPP, administrasi kesiswaan, dan pelaporan keuangan sekolah.
                      </p>
                    </div>
                  </div>
                )}

                {/* Login Form */}
                <form
                  onSubmit={handleLoginSubmit}
                  onFocus={() => {
                    prefetchDashboardCss();
                    if (typeof onPrepareAuth === 'function') onPrepareAuth('prefetch');
                  }}
                  className="space-y-3.5 sm:space-y-4"
                >
                  {/* Field 1: Username / NIS */}
                  <div className="space-y-1">
                    <label htmlFor="login-username" className="block text-[11px] sm:text-xs font-black text-slate-700 uppercase tracking-wide">
                      {role === 'admin' ? 'USERNAME / NIP ADMIN TU' : 'NIS / NAMA SISWA'}
                    </label>
                    <div className="relative flex items-center">
                      <div className="absolute left-4 text-slate-400 pointer-events-none">
                        <Icon name={role === 'admin' ? "shield" : "user"} size={18} />
                      </div>
                      <input
                        id="login-username"
                        name="username"
                        autoComplete="username"
                        type="text"
                        required
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder={role === 'admin' ? 'Masukkan username / NIP admin' : 'Masukkan NIS atau nama siswa'}
                        className="w-full h-13 min-h-[52px] pl-11 pr-4 bg-slate-50 border-2 border-slate-200 rounded-2xl text-xs sm:text-sm font-bold text-slate-800 focus:outline-none focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/15 transition-all placeholder:text-slate-400 shadow-inner"
                      />
                      {username.trim().length > 0 && (
                        <div className="absolute right-4 text-emerald-600">
                          <Icon name="check" size={18} />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Field 2: Password */}
                  <div className="space-y-1">
                    <label htmlFor="login-password" className="block text-[11px] sm:text-xs font-black text-slate-700 uppercase tracking-wide">
                      KATA SANDI
                    </label>
                    <div className="relative flex items-center">
                      <div className="absolute left-4 text-slate-400 pointer-events-none">
                        <Icon name="lock" size={18} />
                      </div>
                      <input
                        id="login-password"
                        name="password"
                        autoComplete="current-password"
                        type={showPassword ? "text" : "password"}
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder={role === 'admin' ? 'Masukkan kata sandi admin' : 'Masukkan kata sandi akun'}
                        className="w-full h-13 min-h-[52px] pl-11 pr-12 bg-slate-50 border-2 border-slate-200 rounded-2xl text-xs sm:text-sm font-bold text-slate-800 focus:outline-none focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/15 transition-all placeholder:text-slate-400 shadow-inner"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3.5 text-slate-500 hover:text-blue-600 transition-colors p-1.5"
                        title={showPassword ? "Sembunyikan password" : "Lihat password"}
                        aria-label={showPassword ? "Sembunyikan kata sandi" : "Lihat kata sandi"}
                      >
                        <Icon name={showPassword ? "eye-off" : "eye"} size={18} />
                      </button>
                    </div>
                  </div>

                  {/* Options row */}
                  <div className="flex items-center justify-between pt-0.5 text-xs sm:text-sm">
                    <label htmlFor="login-remember" className="flex items-center gap-2 cursor-pointer text-slate-600 select-none font-bold">
                      <input
                        id="login-remember"
                        name="rememberMe"
                        type="checkbox"
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                        className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                      />
                      <span>Ingat saya</span>
                    </label>

                    {role === 'parent' ? (
                      <a
                        href={waLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800 font-extrabold hover:underline flex items-center gap-1 text-[11px] sm:text-xs"
                      >
                        <Icon name="help-circle" size={13} />
                        <span>Lupa Password? Bantuan TU</span>
                      </a>
                    ) : (
                      <span className="text-slate-500 text-xs font-semibold">Administrator TU</span>
                    )}
                  </div>

                  {/* Action Buttons - Solid, Bold, Stately (TIDAK GEPENG!) */}
                  <div className="pt-2 space-y-2.5">
                    {/* Primary Submit Button: Stately 54px-56px height with bold typography */}
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className={`w-full min-h-[52px] h-13 sm:h-14 rounded-2xl text-white font-black text-sm sm:text-base shadow-xl active:scale-[0.98] transition-all duration-300 flex items-center justify-center gap-2.5 group ${
                        isSubmitting ? 'opacity-80 cursor-wait ' : ''
                      }${
                        role === 'parent'
                          ? 'bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 shadow-blue-600/35 hover:shadow-blue-600/50'
                          : 'bg-gradient-to-r from-indigo-600 via-indigo-700 to-purple-800 hover:from-indigo-700 hover:to-purple-900 shadow-indigo-600/35 hover:shadow-indigo-600/50'
                      }`}
                    >
                      <span>{isSubmitting ? 'Memverifikasi Akun...' : 'Masuk Sekarang'}</span>
                      <Icon name="arrow-right" size={20} className="transition-transform duration-200 group-hover:translate-x-1" />
                    </button>

                    {/* Secondary Role Switch Button: Full width, neat rounded-2xl (TIDAK GEPENG!) */}
                    <button
                      type="button"
                      onClick={() => {
                        prefetchDashboardCss();
                        if (typeof onPrepareAuth === 'function') onPrepareAuth('prefetch');
                        const nextRole = role === 'parent' ? 'admin' : 'parent';
                        setRole(nextRole);
                        try { sessionStorage.setItem('spp_intended_role', nextRole); } catch(e){}
                        setErrorMsg('');
                        setUsername('');
                        setPassword('');
                      }}
                      className="w-full min-h-[46px] h-11 sm:h-12 rounded-2xl border-2 border-slate-200 hover:border-blue-400 bg-slate-50 hover:bg-blue-50/60 text-slate-700 hover:text-blue-700 font-extrabold text-xs sm:text-sm active:scale-[0.98] transition-all duration-200 flex items-center justify-center gap-2 shadow-xs"
                    >
                      <Icon name="arrow-right-left" size={15} className="text-slate-500" />
                      <span>{role === 'parent' ? 'Beralih ke Portal Login Admin TU' : 'Beralih ke Portal Login Wali Murid'}</span>
                    </button>
                  </div>
                </form>

              </div>
            </div>

          </div>
        </main>
      );
    }

    function ParentNoteCardItem({ note, student, onAddCommentNote }) {
      const [isChatOpen, setIsChatOpen] = useState(false);
      const [commentText, setCommentText] = useState('');

      // Cek apakah user (Wali Murid) sudah pernah mengirim tanggapan untuk catatan ini (Maksimal 1 kali balas)
      const hasUserReplied = useMemo(() => {
        return (note.comments || []).some(c => 
          c.sender === 'Wali Murid' || 
          c.senderRole === 'parent' ||
          c.sender?.toLowerCase().includes('wali') ||
          (student.name && c.sender === student.name) ||
          (student.wali && c.sender === student.wali)
        );
      }, [note.comments, student]);

      const handleSubmit = (e) => {
        if (e) e.preventDefault();
        if (!commentText.trim() || hasUserReplied) return;
        const now = new Date();
        const clockStr = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }).replace(/\./g, ':');
        onAddCommentNote(note.id, {
          sender: 'Wali Murid',
          senderRole: 'parent',
          text: commentText.trim(),
          time: `${formatDateIndo(now)} • ${clockStr} WIB`
        });
        setCommentText('');
      };

      return (
        <div className="bg-slate-50/80 rounded-2xl border border-slate-200/90 p-5 sm:p-6 hover:border-blue-200 transition-colors shadow-xs">
          {/* Header Catatan TU: Jelas dari Pihak Tata Usaha */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 bg-blue-100 text-blue-900 font-extrabold rounded-lg text-xs uppercase tracking-wide flex items-center gap-1.5 border border-blue-200">
                <Icon name="shield-check" size={13} className="text-blue-700" />
                Catatan dari: Tata Usaha (TU)
              </span>
              <span className="px-2.5 py-0.5 bg-slate-200 text-slate-700 font-bold rounded-lg text-[11px]">
                {note.category || 'Catatan Perkembangan'}
              </span>
            </div>
            <span className="text-xs font-bold text-slate-500 flex items-center gap-1">
              <Icon name="calendar" size={13} className="text-blue-600" /> {formatDateTimeIndo(note.date)}
            </span>
          </div>

          <h4 className="font-black text-slate-800 text-base mb-2">{note.title}</h4>
          <p className="text-xs sm:text-sm text-slate-700 font-medium leading-relaxed whitespace-pre-wrap">{note.content}</p>

          {/* Tombol Accordion untuk Buka/Tutup Riwayat Percakapan Catatan TU */}
          <button
            type="button"
            onClick={() => setIsChatOpen(prev => !prev)}
            className="mt-4 w-full py-2.5 px-4 rounded-xl bg-white hover:bg-slate-100/90 border border-slate-200 flex items-center justify-between transition-colors text-xs font-black text-slate-700 active:scale-[0.99]"
          >
            <div className="flex items-center gap-2">
              <Icon name="message-square" size={14} className="text-blue-600" />
              <span>Tanggapan Wali Murid ({note.comments ? note.comments.length : 0})</span>
              {hasUserReplied && (
                <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black flex items-center gap-1 border border-emerald-200">
                  <Icon name="lock" size={10} /> Sudah Dibalas (Terkunci)
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5 text-blue-600 text-[11px] font-bold">
              <span>{isChatOpen ? 'Tutup Percakapan' : 'Klik untuk buka riwayat percakapan'}</span>
              <Icon name={isChatOpen ? 'chevron-up' : 'chevron-down'} size={15} />
            </div>
          </button>

          {/* Konten Percakapan (Hanya Tampil Jika Diklik) */}
          {isChatOpen && (
            <div className="mt-3 pt-3 border-t border-slate-200/60 space-y-3 animate-in fade-in duration-200">
              {note.comments && note.comments.length > 0 ? (
                <div className="space-y-2">
                  {note.comments.map((c, i) => {
                    const isTu = c.senderRole === 'admin' || c.sender?.toLowerCase().includes('admin') || c.sender?.toLowerCase().includes('tu');
                    const senderLabel = isTu ? 'Tata Usaha (TU)' : `Wali Murid (Orang Tua Ananda ${student.name?.trim() || ''})`;
                    return (
                      <div key={i} className={`p-3.5 rounded-xl border text-xs shadow-xs ${
                        isTu 
                          ? 'bg-blue-50/80 border-blue-200 text-slate-800' 
                          : 'bg-emerald-50/80 border-emerald-200 text-slate-800'
                      }`}>
                        <div className="flex justify-between items-center mb-1">
                          <span className={`font-black flex items-center gap-1.5 ${isTu ? 'text-blue-800' : 'text-emerald-800'}`}>
                            <Icon name={isTu ? 'shield-check' : 'user'} size={12} className={isTu ? 'text-blue-600' : 'text-emerald-600'} />
                            {senderLabel}
                          </span>
                          <span className="text-[10px] text-slate-500 font-bold">{formatDateTimeIndo(c.time, note.date)}</span>
                        </div>
                        <p className="text-slate-700 font-medium leading-relaxed whitespace-pre-wrap">{c.text}</p>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs text-slate-400 italic text-center py-2">Belum ada riwayat tanggapan untuk catatan ini.</p>
              )}

              {/* Status Terkunci (Jika user sudah membalas 1x) ATAU Form Balas (Hanya bisa 1x) */}
              {hasUserReplied ? (
                <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-2.5 text-xs text-amber-900 font-bold">
                  <Icon name="lock" size={16} className="text-amber-600 shrink-0" />
                  <span>Anda sudah memberikan 1 tanggapan untuk catatan ini. Percakapan telah terkunci otomatis (maksimal 1x tanggapan).</span>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-1.5 pt-1">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      required
                      value={commentText}
                      onChange={e => setCommentText(e.target.value)}
                      placeholder="Tulis tanggapan untuk TU (hanya 1x kesempatan membalas)..."
                      className="flex-1 px-4 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-inner"
                    />
                    <button
                      type="submit"
                      className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-xl text-xs transition-colors flex items-center gap-1.5 shadow-sm active:scale-95"
                    >
                      <Icon name="send" size={14} /> Kirim
                    </button>
                  </div>
                  <p className="text-[10px] text-slate-400 font-semibold italic">
                    * Catatan: Anda hanya dapat membalas 1 kali untuk setiap catatan TU. Setelah terkirim, form akan terkunci otomatis.
                  </p>
                </form>
              )}
            </div>
          )}
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

      const [activeTab, setActiveTab] = useState('dashboard');
      const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
      const [sppSubFilter, setSppSubFilter] = useState('all');
      const [isSppExpanded, setIsSppExpanded] = useState(true);
      const [complaintTitle, setComplaintTitle] = useState('');
      const [complaintContent, setComplaintContent] = useState('');
      const [complaintImage, setComplaintImage] = useState('');
      const [showParentBell, setShowParentBell] = useState(false);
      const [showParentClassHistory, setShowParentClassHistory] = useState(false);

      // Auto-close notification dropdown when switching tabs
      useEffect(() => {
        setShowParentBell(false);
        setShowParentClassHistory(false);
      }, [activeTab]);

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

      // On mount: mark all already-read items (stored in localStorage) - notifs opened before are already tracked
      const [replyText, setReplyText] = useState({});
      const [nowMs, setNowMs] = useState(Date.now());
      const [showPastComplaints, setShowPastComplaints] = useState(false);

      // Settings State
      const [newPassword, setNewPassword] = useState('');
      const [confirmPassword, setConfirmPassword] = useState('');
      const [showNewPassword, setShowNewPassword] = useState(false);
      const [newPhone, setNewPhone] = useState(student.telepon || '');
      const [settingsFeedback, setSettingsFeedback] = useState(null);
      const [historyClassFilter, setHistoryClassFilter] = useState('all');

      useEffect(() => {
        const intervalMs = activeTab === 'pengaduan' ? 1000 : 15000;
        const timer = setInterval(() => setNowMs(Date.now()), intervalMs);
        return () => clearInterval(timer);
      }, [activeTab]);

      const studentTrx = useMemo(() => {
        return transactions.filter(t => 
          (t.studentId && t.studentId === student.id) || 
          (t.studentName && t.studentName.toLowerCase().trim() === student.name.toLowerCase().trim())
        );
      }, [transactions, student]);

      // Rangkaian seluruh bulan penagihan siswa sejak aktif masuk (menarik sisa tunggakan sebelum semester berjalan) s/d akhir periode
      const studentActiveMonths = useMemo(() => {
        return getStudentAllBillingMonths(student, settings);
      }, [student, settings]);

      const monthlyBills = useMemo(() => {
        return studentActiveMonths.map(month => ({
          month,
          amount: Number(student?.tarif || 0)
        }));
      }, [studentActiveMonths, student]);

      const paidBills = useMemo(() => {
        const paidMonthNames = studentTrx
          .filter(t => t.status === 'Lunas' || t.status === 'lunas' || t.status === 'Berhasil' || t.status === 'Sukses')
          .map(t => (t.month || '').trim().toLowerCase());

        return monthlyBills.filter(b => paidMonthNames.includes(b.month.trim().toLowerCase()));
      }, [monthlyBills, studentTrx]);

      const unpaidBills = useMemo(() => {
        const paidMonthNames = studentTrx
          .filter(t => t.status === 'Lunas' || t.status === 'lunas' || t.status === 'Berhasil' || t.status === 'Sukses')
          .map(t => (t.month || '').trim().toLowerCase());

        const dueDateDay = Number(settings?.dueDateDay) || 10;
        const now = new Date();

        return monthlyBills.filter(b => {
          const mLower = b.month.trim().toLowerCase();
          const isPaid = paidMonthNames.some(pm => pm === mLower || (pm && mLower.startsWith(pm)));
          if (isPaid) return false;
          return isMonthDueOrElapsed(b.month, now, dueDateDay);
        });
      }, [monthlyBills, studentTrx, settings]);

      const upcomingBills = useMemo(() => {
        const paidMonthNames = studentTrx
          .filter(t => t.status === 'Lunas' || t.status === 'lunas' || t.status === 'Berhasil' || t.status === 'Sukses')
          .map(t => (t.month || '').trim().toLowerCase());

        const dueDateDay = Number(settings?.dueDateDay) || 10;
        const now = new Date();

        return monthlyBills.filter(b => {
          const mLower = b.month.trim().toLowerCase();
          const isPaid = paidMonthNames.some(pm => pm === mLower || (pm && mLower.startsWith(pm)));
          if (isPaid) return false;
          return !isMonthDueOrElapsed(b.month, now, dueDateDay);
        });
      }, [monthlyBills, studentTrx, settings]);

      const totalDueDebt = useMemo(() => {
        let previousArrears = Number(student?.arrearsAmount || 0);
        if (student?.arrearsNote && student?.kelas) {
          const noteLower = String(student.arrearsNote).toLowerCase();
          const clsLower = String(student.kelas).toLowerCase();
          if (noteLower.includes(clsLower) || noteLower.startsWith('sess_')) {
            previousArrears = 0;
          }
        }
        return unpaidBills.reduce((acc, b) => acc + b.amount, 0) + previousArrears;
      }, [unpaidBills, student?.arrearsAmount, student?.arrearsNote, student?.kelas]);

      const allPaidTransactions = useMemo(() => {
        return studentTrx.filter(t => t.status === 'Lunas' || t.status === 'lunas' || t.status === 'Berhasil' || t.status === 'Sukses');
      }, [studentTrx]);

      const studentClassHistoryList = useMemo(() => {
        const rawList = Array.isArray(student?.classHistory) ? student.classHistory : [];
        const extracted = [];

        if (student?.kelas) {
          extracted.push(student.kelas);
        }

        rawList.forEach(item => {
          if (typeof item === 'string' && item.trim()) {
            extracted.push(item.trim());
          } else if (item && typeof item === 'object') {
            if (item.toClass && typeof item.toClass === 'string') extracted.push(item.toClass.trim());
            if (item.fromClass && typeof item.fromClass === 'string') extracted.push(item.fromClass.trim());
            if (item.kelas && typeof item.kelas === 'string') extracted.push(item.kelas.trim());
          }
        });

        return [...new Set(extracted.filter(Boolean))];
      }, [student]);

      const filteredPaidBills = useMemo(() => {
        if (historyClassFilter === 'all') return allPaidTransactions;
        return allPaidTransactions.filter(t => (t.kelas || student?.kelas) === historyClassFilter);
      }, [allPaidTransactions, historyClassFilter, student]);

      const myComplaints = useMemo(() => {
        return complaints.filter(c => c.studentId === student.id || c.studentName === student.name);
      }, [complaints, student]);

      const activeComplaint = useMemo(() => {
        return myComplaints.find(c => {
          const createdTime = c.createdAtMs || (typeof c.id === 'number' ? c.id : (c.created_at ? new Date(c.created_at).getTime() : 0));
          const expiresAt = c.expiresAtMs || (createdTime ? createdTime + 3600000 : 0);
          const isExpired = expiresAt ? nowMs > expiresAt : false;
          // Pengaduan TIDAK terkunci selama belum lewat 1 jam (meskipun status sudah ditangani / dibalas admin)
          return !isExpired;
        });
      }, [myComplaints, nowMs]);
      
      const pastComplaints = useMemo(() => {
        return myComplaints.filter(c => {
          const createdTime = c.createdAtMs || (typeof c.id === 'number' ? c.id : (c.created_at ? new Date(c.created_at).getTime() : 0));
          const expiresAt = c.expiresAtMs || (createdTime ? createdTime + 3600000 : 0);
          const isExpired = expiresAt ? nowMs > expiresAt : false;
          return isExpired;
        }).sort((a,b) => {
          const timeA = a.createdAtMs || (typeof a.id === 'number' ? a.id : 0);
          const timeB = b.createdAtMs || (typeof b.id === 'number' ? b.id : 0);
          return timeB - timeA;
        });
      }, [myComplaints, nowMs]);

      const formatCountdown = (expiresAtMs, currentMs) => {
        const diffMs = expiresAtMs - currentMs;
        if (diffMs <= 0) return '00:00';
        const totalSecs = Math.floor(diffMs / 1000);
        const minutes = Math.floor(totalSecs / 60);
        const seconds = totalSecs % 60;
        return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
      };

      const myNotes = useMemo(() => {
        return notes.filter(n => n.studentId === student.id || n.studentName === student.name).sort((a,b) => new Date(b.created_at || Date.now()) - new Date(a.created_at || Date.now()));
      }, [notes, student]);

      const unreadNotesCount = useMemo(() => {
        return myNotes.filter(n => !readNotes.includes(n.id)).length;
      }, [myNotes, readNotes]);

      const unreadComplaintsCount = useMemo(() => {
        return myComplaints.filter(c => c.messages && (readComplaintMsgs[c.id] || 0) < c.messages.length).length;
      }, [myComplaints, readComplaintMsgs]);

      const unreadAnnCount = useMemo(() => {
        return announcements.filter(a => !readAnnouncements.includes(a.id)).length;
      }, [announcements, readAnnouncements]);

      const totalParentUnread = unreadAnnCount + unreadNotesCount + unreadComplaintsCount;

      const parentNotificationItems = useMemo(() => {
        const items = [];

        // 1. Complaint / chat messages from Admin TU
        myComplaints.forEach(c => {
          const msgs = c.messages || [];
          const adminMsgs = msgs.filter(m => 
            m.sender === 'Admin TU' || m.sender?.toLowerCase().includes('admin') || m.sender?.toLowerCase().includes('tu')
          );
          const hasAdminReply = adminMsgs.length > 0 || !!c.adminReply;
          const isUnread = msgs.length > 0 ? (readComplaintMsgs[c.id] || 0) < msgs.length : (hasAdminReply && !readComplaintMsgs[c.id]);

          if (hasAdminReply || isUnread) {
            const lastAdminMsg = adminMsgs[adminMsgs.length - 1];
            const snippet = lastAdminMsg ? lastAdminMsg.text : (c.adminReply || (msgs[msgs.length - 1]?.text) || 'Tanggapan baru dari Admin TU');
            const time = formatDateTimeIndo(lastAdminMsg?.time, c.date);

            items.push({
              id: 'complaint_' + c.id,
              category: 'chat',
              title: `Balasan Chat TU: ${c.title || 'Pengaduan'}`,
              snippet: snippet,
              time: time,
              isUnread: isUnread,
              timestamp: c.createdAtMs || (typeof c.id === 'number' ? c.id : (c.created_at ? new Date(c.created_at).getTime() : 0)),
              onClick: () => {
                const nextCount = msgs.length > 0 ? msgs.length : 1;
                const updated = { ...readComplaintMsgs, [c.id]: nextCount };
                setReadComplaintMsgs(updated);
                try { localStorage.setItem('read_complaint_msgs_' + (student ? student.id : 'guest'), JSON.stringify(updated)); } catch(e) {}
                setShowParentBell(false);
                setActiveTab('pengaduan');
              }
            });
          }
        });

        // 2. Catatan TU
        myNotes.forEach(n => {
          const isUnread = !readNotes.includes(n.id);
          items.push({
            id: 'note_' + n.id,
            category: 'note',
            title: `Catatan TU: ${n.title || 'Catatan Baru'}`,
            snippet: n.content || 'Catatan penting perkembangan siswa dari TU',
            time: formatDateTimeIndo(n.date || ''),
            isUnread: isUnread,
            timestamp: n.created_at ? new Date(n.created_at).getTime() : (typeof n.id === 'number' ? n.id : 0),
            onClick: () => {
              if (!readNotes.includes(n.id)) {
                const next = [...readNotes, n.id];
                setReadNotes(next);
                try { localStorage.setItem('read_notes_' + (student ? student.id : 'guest'), JSON.stringify(next)); } catch(e) {}
              }
              setShowParentBell(false);
              setActiveTab('evaluasi');
            }
          });
        });

        // 3. Announcements (Pengumuman Sekolah)
        announcements.forEach(a => {
          const isUnread = !readAnnouncements.includes(a.id);
          items.push({
            id: 'ann_' + a.id,
            category: 'announcement',
            title: `Pengumuman: ${a.title}`,
            snippet: a.content || 'Klik untuk membuka rincian pengumuman',
            time: formatDateIndo(a.date || ''),
            isUnread: isUnread,
            timestamp: a.created_at ? new Date(a.created_at).getTime() : (typeof a.id === 'number' ? a.id : 0),
            onClick: () => {
              if (!readAnnouncements.includes(a.id)) {
                const next = [...readAnnouncements, a.id];
                setReadAnnouncements(next);
                try { localStorage.setItem('read_announcements_' + (student ? student.id : 'guest'), JSON.stringify(next)); } catch(e) {}
              }
              setShowParentBell(false);
              setActiveTab('berita');
            }
          });
        });

        // Sort: Unread first, then newer items first
        return items.sort((a, b) => {
          if (a.isUnread && !b.isUnread) return -1;
          if (!a.isUnread && b.isUnread) return 1;
          return (b.timestamp || 0) - (a.timestamp || 0);
        });
      }, [myComplaints, myNotes, announcements, readComplaintMsgs, readNotes, readAnnouncements, student]);

      // Auto-mark notifications as read when opening specific tabs or notifications
      useEffect(() => {
        if (activeTab === 'pengaduan' && myComplaints.length > 0) {
          const updated = { ...readComplaintMsgs };
          let changed = false;
          myComplaints.forEach(c => {
            if (c.messages && (readComplaintMsgs[c.id] || 0) < c.messages.length) {
              updated[c.id] = c.messages.length;
              changed = true;
            }
          });
          if (changed) {
            setReadComplaintMsgs(updated);
            try { localStorage.setItem('read_complaint_msgs_' + (student ? student.id : 'guest'), JSON.stringify(updated)); } catch(e) {}
          }
        } else if (activeTab === 'evaluasi' && myNotes.length > 0) {
          const unreadIds = myNotes.filter(n => !readNotes.includes(n.id)).map(n => n.id);
          if (unreadIds.length > 0) {
            const next = [...readNotes, ...unreadIds];
            setReadNotes(next);
            try { localStorage.setItem('read_notes_' + (student ? student.id : 'guest'), JSON.stringify(next)); } catch(e) {}
          }
        } else if (activeTab === 'berita' && announcements.length > 0) {
          const unreadIds = announcements.filter(a => !readAnnouncements.includes(a.id)).map(a => a.id);
          if (unreadIds.length > 0) {
            const next = [...new Set([...readAnnouncements, ...unreadIds])];
            setReadAnnouncements(next);
            try { localStorage.setItem('read_announcements_' + (student ? student.id : 'guest'), JSON.stringify(next)); } catch(e) {}
          }
        }
      }, [activeTab, myComplaints, myNotes, announcements]);

      const getWaLink = (numStr) => {
        if (!numStr) return '#';
        let clean = numStr.replace(/[^0-9]/g, '');
        if (clean.startsWith('0')) clean = '62' + clean.slice(1);
        else if (clean.startsWith('8')) clean = '62' + clean;
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
        <div className="min-h-screen bg-slate-100 flex flex-col w-full text-slate-800">
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
                    {formatDateIndo(selectedAnnouncement.date)}
                  </div>
                  <h3 className="text-2xl sm:text-3xl font-black text-slate-900 mb-6 leading-tight">{selectedAnnouncement.title}</h3>
                  <div className="text-sm font-medium text-slate-700 leading-relaxed whitespace-pre-wrap">
                    {selectedAnnouncement.content}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ROOT-LEVEL PARENT RIWAYAT JENJANG KELAS & MUTASI MODAL */}
          {showParentClassHistory && (() => {
            const existingHist = Array.isArray(student?.classHistory) ? student.classHistory : [];
            const hasInitial = existingHist.some(h => {
              const t = (h.type || '').toLowerCase();
              return t.includes('pendaftaran') || t.includes('awal');
            });

            const initialRecord = {
              id: 'parent_init_entry',
              type: 'Pendaftaran Awal',
              date: student?.createdAt ? new Date(student.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : 'Awal Masuk',
              transferDate: student?.createdAt || '',
              fromClass: '-',
              toClass: existingHist.length > 0 ? (existingHist[0].fromClass || student.kelas) : student.kelas,
              effectiveMonth: student?.startActiveMonth || settings.startMonth || 'Januari',
              effectiveYear: student?.startActiveYear || settings.startYear || 2026,
              newTarif: student?.tarif,
              carriedOverArrears: 0,
              note: 'Pendaftaran pertama ananda di PAUD Setia Bhakti'
            };

            const fullHistoryList = hasInitial ? existingHist : [initialRecord, ...existingHist];

            const formatMutationDate = (h) => {
              if (h.transferDate) {
                try {
                  const parts = String(h.transferDate).split('-');
                  if (parts.length === 3) {
                    const d = parseInt(parts[2], 10);
                    const m = ALL_MONTHS[parseInt(parts[1], 10) - 1] || parts[1];
                    const y = parts[0];
                    return `${d} ${m} ${y}`;
                  }
                } catch (e) {}
                return h.transferDate;
              }
              return h.date || h.academicYear || '-';
            };

            return (
              <div className="fixed inset-0 z-[1100] flex items-center justify-center p-3 sm:p-6 overflow-y-auto animate-in fade-in">
                <div 
                  className="fixed inset-0 bg-slate-950/80 backdrop-blur-md"
                  onClick={() => setShowParentClassHistory(false)}
                />
                <div className="bg-white rounded-3xl max-w-3xl w-full p-5 sm:p-7 space-y-4 shadow-2xl animate-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col border border-slate-200 m-auto relative z-10 text-slate-800">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3.5">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 bg-gradient-to-tr from-blue-600 to-indigo-600 text-white rounded-2xl flex items-center justify-center shadow-md">
                        <Icon name="history" size={22} />
                      </div>
                      <div>
                        <h3 className="font-black text-slate-900 text-base sm:text-lg">Riwayat Jenjang Kelas & Mutasi Ananda</h3>
                        <p className="text-xs text-slate-500 font-bold">{student.name} • NIS: <span className="font-mono text-indigo-700">{student.nis}</span></p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowParentClassHistory(false)}
                      className="p-2 text-slate-400 hover:text-slate-600 font-black rounded-xl hover:bg-slate-100 transition-colors"
                    >
                      <Icon name="x" size={20} />
                    </button>
                  </div>

                  <div className="flex-1 overflow-y-auto space-y-3.5 text-xs pr-1">
                    {/* Status Info Box */}
                    <div className="p-3.5 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl text-[11px] text-blue-950 leading-relaxed space-y-1">
                      <p className="font-black text-blue-900 flex items-center gap-1.5">
                        <Icon name="shield-check" size={15} className="text-blue-600" />
                        Transparansi Tagihan & Mutasi Rombel:
                      </p>
                      <p>
                        • Jika ananda pindah rombel di pertengahan semester berjalan (misal: masuk di bulan Februari), maka bulan sebelum ia masuk (Januari) <strong>tidak dihitung sebagai hutang atau tunggakan</strong>.
                      </p>
                      <p>
                        • Tagihan dihitung mulai bulan ia masuk ({student.startActiveMonth || 'Januari'} {student.startActiveYear || 2026} dan seterusnya). Tagihan bulan berjalan dan mendatang berstatus <strong>"Belum Jatuh Tempo"</strong>.
                      </p>
                    </div>

                    {/* Table */}
                    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse text-xs">
                          <thead>
                            <tr className="bg-slate-100 text-slate-600 font-black uppercase tracking-wider text-[10px] border-b border-slate-200">
                              <th className="py-2.5 px-3 text-center w-8">No</th>
                              <th className="py-2.5 px-3 whitespace-nowrap">Tanggal Pindah</th>
                              <th className="py-2.5 px-3 whitespace-nowrap">Jenis Mutasi</th>
                              <th className="py-2.5 px-3 whitespace-nowrap">Perubahan Rombel</th>
                              <th className="py-2.5 px-3 whitespace-nowrap">Mulai Ditagih</th>
                              <th className="py-2.5 px-3 whitespace-nowrap">Tarif SPP</th>
                              <th className="py-2.5 px-3">Catatan</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 font-medium">
                            {fullHistoryList.map((h, idx) => {
                              const isPendaftaran = (h.type || '').toLowerCase().includes('pendaftaran') || (h.type || '').toLowerCase().includes('awal');
                              return (
                                <tr key={h.id || idx} className="hover:bg-slate-50 transition-colors">
                                  <td className="py-3 px-3 text-center font-bold text-slate-400 text-[11px]">{idx + 1}</td>
                                  <td className="py-3 px-3 whitespace-nowrap font-bold text-slate-800">{formatMutationDate(h)}</td>
                                  <td className="py-3 px-3 whitespace-nowrap">
                                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black ${
                                      isPendaftaran ? 'bg-emerald-100 text-emerald-800' : 'bg-indigo-100 text-indigo-800'
                                    }`}>
                                      {h.type || 'Mutasi Rombel'}
                                    </span>
                                  </td>
                                  <td className="py-3 px-3 whitespace-nowrap font-black text-slate-800">
                                    <div className="flex items-center gap-1">
                                      <span className="px-1.5 py-0.5 bg-slate-100 rounded text-slate-600 text-[11px]">{h.fromClass || '-'}</span>
                                      <span className="text-indigo-600 font-bold">➔</span>
                                      <span className="px-1.5 py-0.5 bg-emerald-50 rounded text-emerald-900 text-[11px] font-black">{h.toClass || '-'}</span>
                                    </div>
                                  </td>
                                  <td className="py-3 px-3 whitespace-nowrap">
                                    <div className="font-black text-indigo-950">{h.effectiveMonth || '-'} {h.effectiveYear || ''}</div>
                                    <span className="text-[9px] text-emerald-700 font-bold">Bebas tunggakan lalu</span>
                                  </td>
                                  <td className="py-3 px-3 whitespace-nowrap font-black text-blue-700 font-mono">
                                    {h.newTarif ? formatRupiah(h.newTarif) : '-'}
                                  </td>
                                  <td className="py-3 px-3 text-slate-600 text-[11px] max-w-xs">{h.note || '-'}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-100 flex justify-end">
                    <button
                      type="button"
                      onClick={() => setShowParentClassHistory(false)}
                      className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-colors"
                    >
                      Tutup
                    </button>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* ROOT-LEVEL PARENT NOTIFICATION MODAL (FLOATING DROPDOWN DARI ATAS, TIDAK TERTUTUP BANNER) */}
          {showParentBell && (
            <div className="fixed inset-0 z-[9999] pointer-events-auto">
              {/* Subtle Click-Away Backdrop */}
              <div 
                className="fixed inset-0 bg-slate-900/20 backdrop-blur-[2px] z-[9999]" 
                onClick={() => setShowParentBell(false)} 
              />
              {/* Dropdown Card */}
              <div className="fixed inset-x-3 sm:inset-x-auto sm:right-8 top-[72px] sm:top-20 z-[10000] w-auto max-w-sm sm:w-96 mx-auto sm:mx-0 bg-white rounded-3xl shadow-2xl border border-slate-200 text-slate-800 p-4 space-y-3 animate-in slide-in-from-top-2 duration-200 max-h-[82vh] overflow-y-auto">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <div className="flex items-center gap-2">
                    <h4 className="font-extrabold text-xs uppercase text-slate-700">Notifikasi Sekolah</h4>
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
                          setReadAnnouncements(newAnnIds);
                          try {
                            localStorage.setItem('read_announcements_' + (student ? student.id : 'guest'), JSON.stringify(newAnnIds));
                          } catch(e) {}

                          const newNoteIds = [...new Set([...readNotes, ...myNotes.map(n => n.id)])];
                          setReadNotes(newNoteIds);
                          try {
                            localStorage.setItem('read_notes_' + (student ? student.id : 'guest'), JSON.stringify(newNoteIds));
                          } catch(e) {}

                          const updatedMsgs = { ...readComplaintMsgs };
                          myComplaints.forEach(c => {
                            const count = (c.messages && c.messages.length > 0) ? c.messages.length : 1;
                            updatedMsgs[c.id] = count;
                          });
                          setReadComplaintMsgs(updatedMsgs);
                          try {
                            localStorage.setItem('read_complaint_msgs_' + (student ? student.id : 'guest'), JSON.stringify(updatedMsgs));
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

                <div className="space-y-2 max-h-80 overflow-y-auto text-xs">
                  {parentNotificationItems.length === 0 ? (
                    <div className="text-center py-6 text-slate-400 font-medium">
                      <Icon name="bell-off" size={26} className="mx-auto mb-1.5 text-slate-300" />
                      Tidak ada notifikasi baru saat ini.
                    </div>
                  ) : (
                    parentNotificationItems.slice(0, 8).map(item => (
                      <div
                        key={item.id}
                        onClick={item.onClick}
                        className={`p-3 rounded-2xl border cursor-pointer transition-all hover:scale-[0.99] ${
                          item.isUnread 
                            ? item.category === 'chat'
                              ? 'bg-amber-50/90 border-amber-300 font-extrabold text-amber-950 shadow-xs'
                              : item.category === 'note'
                                ? 'bg-purple-50/90 border-purple-200 font-extrabold text-purple-950 shadow-xs'
                                : 'bg-blue-50/90 border-blue-200 font-extrabold text-blue-950 shadow-xs'
                            : 'bg-slate-50/80 border-slate-200 text-slate-600'
                        }`}
                      >
                        <div className="flex justify-between items-center mb-1 gap-2">
                          <div className="flex items-center gap-1.5 min-w-0 flex-1">
                            <Icon 
                              name={item.category === 'chat' ? 'message-circle' : item.category === 'note' ? 'file-text' : 'megaphone'} 
                              size={13} 
                              className={`shrink-0 ${
                                item.isUnread 
                                  ? item.category === 'chat' ? 'text-amber-600' : item.category === 'note' ? 'text-purple-600' : 'text-blue-600'
                                  : 'text-slate-400'
                              }`} 
                            />
                            <span className="font-extrabold text-[12px] truncate">{item.title}</span>
                          </div>
                          {item.isUnread ? (
                            <span className={`px-1.5 py-0.5 rounded text-[9px] font-black shrink-0 ${
                              item.category === 'chat' 
                                ? 'bg-amber-500 text-white animate-pulse' 
                                : item.category === 'note' 
                                  ? 'bg-purple-600 text-white' 
                                  : 'bg-blue-600 text-white'
                            }`}>
                              {item.category === 'chat' ? 'Balasan Baru' : 'Baru'}
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-400 font-semibold shrink-0">Dibaca</span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-600 font-normal line-clamp-1">{item.snippet}</p>
                        {item.time && (
                          <span className="text-[9px] text-slate-400 mt-1 block font-medium">{item.time}</span>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TOP MOBILE APP BAR with 3-Line Hamburger Menu (Vibrant Smurf Royal Blue Theme) */}
          <div className="md:hidden sticky top-0 z-40 bg-gradient-to-r from-[#072a6b]/95 via-[#0d3b8f]/95 to-[#1554c2]/95 backdrop-blur-xl px-4 sm:px-6 py-3.5 border-b border-cyan-400/30 shadow-xl shadow-blue-950/20 flex items-center justify-between min-h-[66px] text-white">
            <div className="flex items-center gap-3.5 min-w-0">
              <div 
                onClick={() => student.fotoUrl && setPreviewImage({ url: student.fotoUrl, title: `Foto Profil - ${student.name}` })}
                className="w-11 h-11 rounded-2xl bg-gradient-to-br from-cyan-400 via-blue-600 to-indigo-700 p-0.5 shadow-lg shadow-blue-950/50 overflow-hidden shrink-0 flex items-center justify-center cursor-pointer ring-2 ring-cyan-400/30"
              >
                {student.fotoUrl ? (
                  <img src={student.fotoUrl} alt={student.name} className="w-full h-full object-cover rounded-[14px]" />
                ) : (
                  <img src="logo.webp" alt="PAUD Setia Bhakti" className="w-8 h-8 object-contain filter drop-shadow" />
                )}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <h1 className="text-base font-black text-white truncate tracking-tight">{settings.schoolName || 'PAUD SETIA BHAKTI'}</h1>
                </div>
                <div className="flex items-center gap-1.5 text-xs font-extrabold text-cyan-300 truncate mt-0.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                  <span className="truncate">Wali • {student.name}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              {/* Refresh / Sinkronisasi Button on Mobile */}
              <button
                type="button"
                onClick={() => onRefresh(true)}
                disabled={isRefreshing}
                className="relative w-11 h-11 rounded-2xl bg-white/10 hover:bg-white/20 active:scale-95 text-white flex items-center justify-center transition-all border border-white/15 focus:outline-none ring-1 ring-white/10 shrink-0 backdrop-blur-md"
                aria-label="Sinkronisasi Data"
                title="Sinkronisasi Data"
              >
                <Icon name="refresh-cw" size={18} className={isRefreshing ? 'animate-spin text-cyan-300' : 'text-white'} />
              </button>

              {/* Notification Bell Button on Mobile */}
              <button
                type="button"
                onClick={() => {
                  setShowParentBell(!showParentBell);
                  setIsMobileMenuOpen(false);
                }}
                className="relative w-11 h-11 rounded-2xl bg-white/10 hover:bg-white/20 active:scale-95 text-white flex items-center justify-center transition-all border border-white/15 focus:outline-none ring-1 ring-white/10 shrink-0 backdrop-blur-md"
                aria-label="Lihat Notifikasi"
                title="Notifikasi"
              >
                <Icon name="bell" size={19} />
                {totalParentUnread > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-rose-500 text-white rounded-full text-[10px] font-black flex items-center justify-center animate-pulse ring-2 ring-white shadow-md">
                    {totalParentUnread > 9 ? '9+' : totalParentUnread}
                  </span>
                )}
              </button>

              {/* Rounded Dark Frosted 3-Line Hamburger Button */}
              <button
                type="button"
                onClick={() => {
                  setIsMobileMenuOpen(!isMobileMenuOpen);
                  setShowParentBell(false);
                }}
                className="relative w-11 h-11 rounded-2xl bg-white/10 hover:bg-white/20 active:scale-95 text-white flex flex-col items-center justify-center gap-[4.5px] p-2.5 transition-all shadow-lg border border-white/15 focus:outline-none ring-1 ring-white/10 shrink-0 backdrop-blur-md"
                aria-label="Buka Menu"
                title="Menu Navigasi"
              >
                <span className={`h-[2.5px] bg-white rounded-full transition-all duration-300 ${isMobileMenuOpen ? 'w-5 rotate-45 translate-y-[7px]' : 'w-5'}`}></span>
                <span className={`h-[2.5px] bg-white rounded-full transition-all duration-300 ${isMobileMenuOpen ? 'opacity-0 w-0' : 'w-4 self-start ml-0.5'}`}></span>
                <span className={`h-[2.5px] bg-white rounded-full transition-all duration-300 ${isMobileMenuOpen ? 'w-5 -rotate-45 -translate-y-[7px]' : 'w-5'}`}></span>
              </button>
            </div>
          </div>

          {/* MOBILE SLIDE-OUT NAVIGATION DRAWER */}
          {isMobileMenuOpen && (
            <div className="md:hidden fixed inset-0 z-50 overflow-hidden animate-in fade-in duration-200">
              <div 
                className="absolute inset-0 bg-slate-950/80 backdrop-blur-md transition-opacity" 
                onClick={() => setIsMobileMenuOpen(false)}
              ></div>

              <div className="absolute top-0 right-0 bottom-0 w-[88%] sm:w-[380px] max-w-[430px] min-h-[100dvh] smurf-mobile-drawer text-white flex flex-col justify-between shadow-2xl z-10 overflow-y-auto animate-in slide-in-from-right duration-300 relative">
                {/* Luminous Glow Orbs in Drawer */}
                <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-blue-500/15 blur-3xl pointer-events-none"></div>
                <div className="absolute bottom-20 -left-10 w-40 h-40 rounded-full bg-cyan-500/10 blur-3xl pointer-events-none"></div>

                <div className="p-4 sm:p-5 relative z-10">
                  {/* Drawer Header */}
                  <div className="flex items-center justify-between pb-3.5 border-b border-white/10 mb-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-slate-900 border border-white/15 flex items-center justify-center p-1.5 shadow-md shrink-0">
                        <img src="logo.webp" alt="PAUD Setia Bhakti" className="w-full h-full object-contain" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h2 className="text-sm font-black text-white leading-tight truncate">{settings.schoolName || 'PAUD SETIA BHAKTI'}</h2>
                        <span className="text-[11px] font-bold text-cyan-400 uppercase tracking-wider block truncate">Portal Resmi Wali Murid</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="w-9 h-9 rounded-xl bg-white/5 hover:bg-white/15 text-slate-300 hover:text-white flex items-center justify-center transition-colors border border-white/10 active:scale-95 shrink-0"
                    >
                      <Icon name="x" size={18} />
                    </button>
                  </div>

                  {/* Student Profile Card in Drawer */}
                  <div className="p-3.5 rounded-2xl bg-slate-900/80 backdrop-blur-xl border border-white/10 flex items-center gap-3 mb-4 shadow-lg shadow-black/30">
                    <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white font-black text-lg border border-white/20 overflow-hidden shrink-0 shadow-md">
                      {student.fotoUrl ? (
                        <img src={student.fotoUrl} alt={student.name} className="w-full h-full object-cover" />
                      ) : (
                        student.name ? student.name.charAt(0) : 'S'
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-black text-white truncate capitalize">{student.name}</p>
                      <p className="text-xs text-slate-400 font-bold truncate mt-0.5">Kelas {student.kelas} • NIS {student.nis}</p>
                    </div>
                  </div>

                  {/* Navigation Links */}
                  <div className="space-y-1.5">
                    {[
                      { id: 'dashboard', label: 'Dashboard Utama', icon: 'home', badge: 0 },
                      { id: 'spp', label: 'Tagihan SPP', icon: 'credit-card', badge: unpaidBills.length, badgeType: 'danger' },
                      { id: 'berita', label: 'Berita & Pengumuman', icon: 'newspaper', badge: unreadAnnCount, badgeType: 'info' },
                      { id: 'evaluasi', label: 'Catatan Siswa (TU)', icon: 'file-text', badge: unreadNotesCount, badgeType: 'info' },
                      { id: 'pengaduan', label: 'Layanan Pengaduan', icon: 'message-square', badge: unreadComplaintsCount, badgeType: 'danger' },
                      { id: 'pengaturan', label: 'Pengaturan Akun', icon: 'settings', badge: 0 }
                    ].map(item => (
                      <div key={item.id} className="w-full">
                        <button
                          type="button"
                          onClick={() => {
                            if (item.id === 'spp') {
                              if (activeTab === 'spp') {
                                setIsSppExpanded(!isSppExpanded);
                              } else {
                                setActiveTab('spp');
                                setIsSppExpanded(true);
                              }
                            } else {
                              setActiveTab(item.id);
                              setIsMobileMenuOpen(false);
                            }
                          }}
                          className={`w-full min-h-[44px] py-2.5 px-3.5 rounded-xl flex items-center justify-between text-xs sm:text-sm font-extrabold transition-all duration-200 active:scale-[0.99] ${
                            activeTab === item.id
                              ? 'smurf-nav-active'
                              : 'smurf-nav-item'
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0 flex-1 truncate">
                            <Icon name={item.icon} size={18} className="shrink-0" />
                            <span className="truncate capitalize">{item.label}</span>
                          </div>
                          <div className="flex items-center gap-2 shrink-0 ml-2">
                            {item.badge > 0 && (
                              <span className="px-2 py-0.5 rounded-full text-[11px] font-black bg-rose-500 text-white animate-pulse shadow-md shrink-0">
                                {item.badge}
                              </span>
                            )}
                            {item.id === 'spp' && (
                              <Icon name="chevron-down" size={16} className={`transition-transform duration-200 shrink-0 ${activeTab === 'spp' && isSppExpanded ? 'rotate-180' : ''}`} />
                            )}
                          </div>
                        </button>

                        {/* SPP Sub-items Tree */}
                        {item.id === 'spp' && activeTab === 'spp' && isSppExpanded && (
                          <div className="border-l-2 border-slate-800 ml-4 pl-3 mt-1.5 space-y-1">
                            {[
                              { id: 'all', label: 'Semua Ringkasan', icon: 'layers' },
                              { id: 'unpaid', label: 'Tagihan Menunggak', icon: 'alert-circle', badge: unpaidBills.length, type: 'danger' },
                              { id: 'upcoming', label: 'Belum Jatuh Tempo', icon: 'calendar', badge: upcomingBills.length, type: 'warning' },
                              { id: 'paid', label: 'Riwayat Lunas', icon: 'check-circle-2', badge: paidBills.length, type: 'success' }
                            ].map(sub => (
                              <button
                                key={sub.id}
                                type="button"
                                onClick={() => {
                                  setSppSubFilter(sub.id);
                                  setIsMobileMenuOpen(false);
                                }}
                                className={`w-full min-h-[40px] py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-between transition-all active:scale-[0.99] ${
                                  sppSubFilter === sub.id
                                    ? 'bg-white/15 text-white font-black border border-white/15 shadow-xs'
                                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                                }`}
                              >
                                <div className="flex items-center gap-2.5 min-w-0 flex-1 truncate">
                                  <Icon name={sub.icon} size={15} className="shrink-0" />
                                  <span className="truncate capitalize">{sub.label}</span>
                                </div>
                                {sub.badge > 0 && (
                                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-black shrink-0 ${
                                    sub.type === 'danger' ? 'bg-rose-500 text-white' : sub.type === 'warning' ? 'bg-amber-400 text-slate-900' : 'bg-emerald-500 text-white'
                                  }`}>
                                    {sub.badge}
                                  </span>
                                )}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Ornamental Corak Pattern at Bottom of Mobile Drawer */}
                <div className="mt-auto relative z-10">
                  <SidebarBottomOrnament roleLabel="Portal Wali Murid" />
                </div>

                {/* Sticky Drawer Footer Actions */}
                <div className="sticky bottom-0 bg-slate-950/90 backdrop-blur-lg border-t border-white/10 p-4 space-y-2 relative z-10">
                  <button
                    type="button"
                    onClick={() => {
                      onRefresh(true);
                      setIsMobileMenuOpen(false);
                    }}
                    className="w-full min-h-[42px] py-2.5 px-3.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-white/10 text-white text-xs font-bold flex items-center justify-center gap-2 active:scale-95 transition-all shadow-sm"
                  >
                    <Icon name="refresh-cw" size={15} className={`shrink-0 ${isRefreshing ? 'animate-spin text-blue-400' : ''}`} />
                    <span className="truncate">Sinkronisasi Data Baru</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      onLogout();
                    }}
                    className="w-full min-h-[42px] py-2.5 px-3.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/20 text-xs font-bold flex items-center justify-center gap-2 active:scale-95 transition-all shadow-sm"
                  >
                    <Icon name="log-out" size={15} className="shrink-0" />
                    <span className="truncate">Keluar Akun Wali Murid</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* MAIN FULL-WIDTH APP CONTAINER */}
          <div className="w-full flex-1 bg-aesthetic-pattern flex flex-col md:flex-row min-h-screen mobile-full-height relative">
            {/* Ambient Smurf Glowing Orbs */}
            <div className="smurf-ambient-orb smurf-orb-1"></div>
            <div className="smurf-ambient-orb smurf-orb-2"></div>
            <div className="smurf-ambient-orb smurf-orb-3"></div>
            {/* LEFT ROYAL BLUE SIDEBAR - Hidden on mobile, replaced by bottom nav */}
            <aside className="w-full md:w-72 lg:w-80 royal-blue-sidebar shrink-0 flex flex-col justify-between p-0 relative z-20 overflow-x-hidden hide-on-mobile-nav">
              
              {/* Subtle Ambient Highlights in Sidebar */}
              <div className="absolute -bottom-10 -left-10 w-64 h-64 rounded-full bg-blue-500/10 blur-[80px] pointer-events-none select-none z-0"></div>
              <div className="absolute top-20 right-0 w-48 h-48 rounded-full bg-indigo-500/10 blur-[60px] pointer-events-none select-none z-0"></div>

              <div className="relative z-10">
                {/* Brand / School Header with Frosted Glass Container (Matching Image 3) */}
                <div className="p-4 sm:p-5 m-3 sm:m-4 mb-2 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 flex items-center gap-3.5 shadow-lg shadow-blue-950/20">
                  <div 
                    onClick={() => student.fotoUrl && setPreviewImage({ url: student.fotoUrl, title: `Foto Profil - ${student.name}` })}
                    className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-xl flex items-center justify-center text-white border border-white/30 overflow-hidden shrink-0 shadow-md cursor-pointer hover:scale-105 transition-transform"
                  >
                    {student.fotoUrl ? (
                      <img src={student.fotoUrl} alt={student.name} className="w-full h-full object-cover" />
                    ) : (
                      <img src="logo.webp" alt="PAUD Setia Bhakti" className="w-9 h-9 object-contain filter drop-shadow" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h1 className="font-black text-sm sm:text-base leading-tight text-white tracking-tight truncate">{settings.schoolName || 'PAUD SETIA BHAKTI'}</h1>
                    <div className="inline-flex items-center gap-1.5 mt-1 px-2 py-0.5 rounded-full bg-cyan-400/20 border border-cyan-400/30">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                      <span className="text-[10px] font-black text-cyan-200 uppercase tracking-wider">Wali Murid</span>
                    </div>
                  </div>
                </div>

                {/* Vertical Navigation - Pill Style */}
                <nav className="px-3 sm:px-4 py-2 sm:py-3 flex md:flex-col gap-1.5 font-extrabold text-sm relative overflow-y-auto overflow-x-hidden no-scrollbar">

                  {/* 1. Dashboard Utama */}
                  <button
                    onClick={() => setActiveTab('dashboard')}
                    className={`py-3.5 px-4 flex items-center justify-between transition-all duration-200 text-xs sm:text-[13.5px] whitespace-nowrap shrink-0 rounded-2xl ${
                      activeTab === 'dashboard'
                        ? 'smurf-nav-active'
                        : 'smurf-nav-item font-bold'
                    }`}
                  >
                    <div className="flex items-center gap-3 truncate">
                      <Icon name="home" size={18} />
                      <span className="truncate">Dashboard Utama</span>
                    </div>
                  </button>

                  {/* 2. Tagihan SPP (Accordion with Sub-items) */}
                  <div className="w-full">
                    <button
                      onClick={() => {
                        if (activeTab !== 'spp') {
                          setActiveTab('spp');
                          setIsSppExpanded(true);
                        } else {
                          setIsSppExpanded(!isSppExpanded);
                        }
                      }}
                      className={`w-full py-3.5 px-4 flex items-center justify-between transition-all duration-200 text-xs sm:text-[13.5px] whitespace-nowrap shrink-0 rounded-2xl ${
                        activeTab === 'spp'
                          ? 'smurf-nav-active'
                          : 'smurf-nav-item font-bold'
                      }`}
                    >
                      <div className="flex items-center gap-3 truncate">
                        <Icon name="credit-card" size={18} />
                        <span className="truncate">Tagihan SPP</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {unpaidBills.length > 0 && (
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                            activeTab === 'spp' ? 'bg-rose-100 text-rose-700' : 'badge-danger-active animate-pulse ring-1 ring-rose-300'
                          }`}>
                            {unpaidBills.length}
                          </span>
                        )}
                        <Icon name="chevron-down" size={15} className={`transition-transform duration-200 ${activeTab === 'spp' && isSppExpanded ? 'rotate-180' : ''}`} />
                      </div>
                    </button>

                    {/* Sub-menu items for SPP with Distinctive Colored Badges */}
                    {activeTab === 'spp' && isSppExpanded && (
                      <div className="mt-1 ml-2 space-y-0.5 py-1">
                        {[
                          { id: 'all', label: 'Semua Ringkasan', icon: 'layers' },
                          { id: 'unpaid', label: 'Tagihan Menunggak', icon: 'alert-circle', badge: unpaidBills.length, type: 'danger' },
                          { id: 'upcoming', label: 'Belum Jatuh Tempo', icon: 'calendar', badge: upcomingBills.length, type: 'warning' },
                          { id: 'paid', label: 'Riwayat Lunas', icon: 'check-circle-2', badge: paidBills.length, type: 'success' }
                        ].map(sub => (
                          <button
                            key={sub.id}
                            onClick={() => setSppSubFilter(sub.id)}
                            className={`w-full px-4 py-2.5 rounded-xl text-xs font-bold flex items-center justify-between transition-all ${
                              sppSubFilter === sub.id
                                ? 'bg-white/20 text-white font-black border border-white/25 shadow-sm'
                                : 'text-white/75 hover:text-white hover:bg-white/10'
                            }`}
                          >
                            <div className="flex items-center gap-2 truncate">
                              <Icon name={sub.icon} size={14} />
                              <span className="truncate">{sub.label}</span>
                            </div>
                            {sub.badge !== undefined && sub.badge !== null && (
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-black transition-all ${
                                sub.badge === 0 
                                  ? 'badge-zero-muted' 
                                  : sub.type === 'danger'
                                    ? 'badge-danger-active animate-pulse ring-1 ring-rose-300'
                                    : sub.type === 'warning'
                                      ? 'badge-warning-active'
                                      : 'badge-success-active'
                              }`}>
                                {sub.badge}
                              </span>
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* 3. Pengumuman */}
                  <button
                    onClick={() => setActiveTab('berita')}
                    className={`py-3.5 px-4 flex items-center justify-between transition-all duration-200 text-xs sm:text-[13.5px] whitespace-nowrap shrink-0 rounded-2xl ${
                      activeTab === 'berita'
                        ? 'smurf-nav-active'
                        : 'smurf-nav-item font-bold'
                    }`}
                  >
                    <div className="flex items-center gap-3 truncate">
                      <Icon name="newspaper" size={18} />
                      <span className="truncate">Pengumuman</span>
                    </div>
                    {unreadAnnCount > 0 ? (
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                        activeTab === 'berita' ? 'bg-cyan-100 text-cyan-800' : 'badge-cyan-active animate-pulse'
                      }`}>
                        {unreadAnnCount}
                      </span>
                    ) : null}
                  </button>

                  {/* 4. Catatan TU */}
                  <button
                    onClick={() => setActiveTab('evaluasi')}
                    className={`py-3.5 px-4 flex items-center justify-between transition-all duration-200 text-xs sm:text-[13.5px] whitespace-nowrap shrink-0 rounded-2xl ${
                      activeTab === 'evaluasi'
                        ? 'smurf-nav-active'
                        : 'smurf-nav-item font-bold'
                    }`}
                  >
                    <div className="flex items-center gap-3 truncate">
                      <Icon name="file-text" size={18} />
                      <span className="truncate">Catatan TU</span>
                    </div>
                    {unreadNotesCount > 0 ? (
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                        activeTab === 'evaluasi' ? 'bg-purple-100 text-purple-800' : 'badge-purple-active animate-pulse'
                      }`}>
                        {unreadNotesCount}
                      </span>
                    ) : null}
                  </button>

                  {/* 5. Pengaduan (Warm Coral/Orange Badge when > 0, matching Image 3) */}
                  <button
                    onClick={() => setActiveTab('pengaduan')}
                    className={`py-3.5 px-4 flex items-center justify-between transition-all duration-200 text-xs sm:text-[13.5px] whitespace-nowrap shrink-0 rounded-2xl ${
                      activeTab === 'pengaduan'
                        ? 'smurf-nav-active'
                        : 'smurf-nav-item font-bold'
                    }`}
                  >
                    <div className="flex items-center gap-3 truncate">
                      <Icon name="message-square" size={18} />
                      <span className="truncate">Pengaduan</span>
                    </div>
                    {unreadComplaintsCount > 0 ? (
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                        activeTab === 'pengaduan' ? 'bg-orange-100 text-orange-800' : 'badge-orange-active animate-pulse'
                      }`}>
                        {unreadComplaintsCount}
                      </span>
                    ) : null}
                  </button>

                  {/* 6. Pengaturan */}
                  <button
                    onClick={() => setActiveTab('pengaturan')}
                    className={`py-3.5 px-4 flex items-center justify-between transition-all duration-200 text-xs sm:text-[13.5px] whitespace-nowrap shrink-0 rounded-2xl ${
                      activeTab === 'pengaturan'
                        ? 'smurf-nav-active'
                        : 'smurf-nav-item font-bold'
                    }`}
                  >
                    <div className="flex items-center gap-3 truncate">
                      <Icon name="settings" size={18} />
                      <span className="truncate">Pengaturan</span>
                    </div>
                  </button>
                </nav>
              </div>

              {/* Bottom Sidebar Section: Decorative Corak Ornament + Student Profile Chip */}
              <div className="mt-auto relative z-10 hidden md:block">
                <SidebarBottomOrnament roleLabel="Portal Wali Murid" />
                <div className="p-3 sm:p-3.5 m-3 sm:m-4 mt-1 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 text-white relative z-10 shadow-lg shadow-blue-950/20">
                  <div className="flex items-center justify-between gap-2.5">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="relative shrink-0">
                        <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center font-black text-sm text-white overflow-hidden border border-white/25">
                          {student.fotoUrl ? (
                            <img src={student.fotoUrl} alt={student.name} className="w-full h-full object-cover" />
                          ) : (
                            student.name ? student.name.charAt(0) : 'S'
                          )}
                        </div>
                        <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-400 ring-2 ring-slate-900 animate-pulse"></span>
                      </div>
                      <div className="truncate flex-1">
                        <p className="text-sm font-black text-white truncate">{student.name}</p>
                        <p className="text-xs text-blue-100/80 font-semibold truncate">Kelas {student.kelas} • NIS {student.nis}</p>
                      </div>
                    </div>
                    <button
                      onClick={onLogout}
                      title="Keluar Akun"
                      className="p-2 rounded-xl bg-white/10 hover:bg-rose-500/80 text-white/90 hover:text-white transition-all shadow-sm shrink-0"
                    >
                      <Icon name="log-out" size={16} />
                    </button>
                  </div>
                </div>
              </div>
            </aside>

            {/* RIGHT AESTHETIC CONTENT PANEL */}
            <main className="flex-1 bg-aesthetic-pattern flex flex-col min-w-0 min-h-0 overflow-y-auto mobile-nav-spacer relative">
              <PanelAestheticBg />
              {/* Header Top Bar */}
              <header className="px-4 sm:px-6 md:px-10 pt-4 sm:pt-7 pb-3.5 sm:pb-5 border-b border-slate-200/80 flex flex-col gap-3.5 sm:gap-4 bg-white/90 backdrop-blur-md relative z-20 md:sticky md:top-0">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-3">
                      <h2 className="text-xl sm:text-2xl md:text-3xl font-black text-slate-900 tracking-tight">
                        {activeTab === 'dashboard' && 'Dashboard Utama Wali Murid'}
                        {activeTab === 'spp' && 'Status Pembayaran SPP'}
                        {activeTab === 'berita' && 'Berita & Pengumuman Sekolah'}
                        {activeTab === 'evaluasi' && 'Catatan Siswa (Tata Usaha)'}
                        {activeTab === 'pengaduan' && 'Layanan Pengaduan Wali Murid'}
                        {activeTab === 'pengaturan' && 'Pengaturan Akun'}
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
                    <p className="text-xs sm:text-sm md:text-base text-slate-500 font-medium mt-1">
                      {activeTab === 'dashboard' && 'Ringkasan laporan status SPP, pengumuman sekolah & perkembangan ananda'}
                      {activeTab === 'spp' && 'Informasi tarif, tagihan jatuh tempo, dan riwayat pembayaran resmi'}
                      {activeTab === 'berita' && 'Informasi kegiatan, edaran libur, dan agenda sekolah terkini'}
                      {activeTab === 'evaluasi' && 'Pesan dan catatan penting perkembangan siswa dari Tata Usaha (TU)'}
                      {activeTab === 'pengaduan' && 'Sampaikan masukan, kendala, atau pertanyaan langsung ke pihak sekolah'}
                      {activeTab === 'pengaturan' && 'Kelola informasi nomor WhatsApp dan kata sandi akun Anda'}
                    </p>
                  </div>

                  {/* Header Actions */}
                  <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                    <button
                      onClick={() => onRefresh(true)}
                      title="Sinkronisasi Data"
                      className="px-3.5 py-2 sm:px-4 sm:py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2"
                    >
                      <Icon name="refresh-cw" size={17} className={isRefreshing ? 'animate-spin text-blue-600' : ''} />
                      <span className="hidden sm:inline">Sinkronisasi</span>
                    </button>

                    <div className="relative">
                      {/* Bell button on desktop (hidden on mobile because mobile uses top bar) */}
                      <button
                        type="button"
                        onClick={() => setShowParentBell(!showParentBell)}
                        className="hidden md:flex p-2.5 bg-slate-100 hover:bg-slate-200 rounded-xl text-slate-700 relative transition-colors items-center justify-center"
                        title="Notifikasi"
                      >
                        <Icon name="bell" size={18} />
                        {totalParentUnread > 0 && (
                          <span className="absolute -top-1 -right-1 w-5 h-5 bg-rose-500 text-white rounded-full text-[10px] font-extrabold flex items-center justify-center animate-pulse">
                            {totalParentUnread}
                          </span>
                        )}
                      </button>
                    </div>

                    <button
                      onClick={onLogout}
                      title="Keluar"
                      className="px-3.5 py-2 sm:px-4 sm:py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl text-xs sm:text-sm font-bold border border-rose-200 transition-colors flex items-center gap-2"
                    >
                      <Icon name="log-out" size={17} />
                      <span className="hidden sm:inline">Keluar</span>
                    </button>
                  </div>
                </div>
              </header>

              {/* Main Content Body */}
              <div key={activeTab} className="px-3.5 py-4 sm:px-6 md:p-10 space-y-6 sm:space-y-7 flex-1 animate-tab-switch relative z-10">
                {/* TAB 0: DASHBOARD UTAMA */}
                {activeTab === 'dashboard' && (
                  <section className="space-y-6 sm:space-y-7 animate-in fade-in duration-300">
                    {/* GREETING & WAVING MASCOT BANNER */}
                    <GreetingMascotBanner 
                      name={student.name || 'Wali Murid'} 
                      role="Wali Murid" 
                      schoolName={settings.schoolName} 
                      academicYear={settings.academicYear} 
                    />

                    {/* 4 SUMMARY STAT CARDS */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
                      <div 
                        onClick={() => { setActiveTab('spp'); setSppSubFilter('unpaid'); }}
                        className={`p-5 sm:p-6 rounded-2xl sm:rounded-3xl border cursor-pointer transition-all hover:scale-[1.02] hover:shadow-xl bg-white shadow-sm relative overflow-hidden group ${
                          unpaidBills.length > 0 ? 'border-rose-200/90 hover:border-rose-300' : 'border-emerald-200/90 hover:border-emerald-300'
                        }`}
                      >
                        <div className="flex justify-between items-center mb-3">
                          <span className="text-xs font-black uppercase text-slate-400 tracking-wider">Status SPP</span>
                          <div className={`w-11 h-11 rounded-2xl flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-transform ${
                            unpaidBills.length > 0 ? 'bg-gradient-to-br from-rose-500 to-red-600 shadow-rose-500/30' : 'bg-gradient-to-br from-emerald-500 to-teal-600 shadow-emerald-500/30'
                          }`}>
                            <Icon name={unpaidBills.length > 0 ? "alert-circle" : "shield-check"} size={20} />
                          </div>
                        </div>
                        <p className={`text-xl sm:text-2xl font-black ${unpaidBills.length > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                          {unpaidBills.length > 0 ? formatRupiah(totalDueDebt) : 'Status Lunas'}
                        </p>
                        <p className="text-xs text-slate-500 font-semibold mt-1">
                          {unpaidBills.length > 0 ? `${unpaidBills.length} Bulan Tertunggak` : 'Tidak ada tunggakan SPP'}
                        </p>
                      </div>

                      <div 
                        onClick={() => { setActiveTab('spp'); setSppSubFilter('paid'); }}
                        className="p-5 sm:p-6 rounded-2xl sm:rounded-3xl bg-white border border-slate-200/90 hover:border-blue-300 shadow-sm hover:shadow-xl cursor-pointer hover:scale-[1.02] transition-all relative overflow-hidden group"
                      >
                        <div className="flex justify-between items-center mb-3">
                          <span className="text-xs font-black uppercase text-slate-400 tracking-wider">SPP Lunas</span>
                          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/30 flex items-center justify-center group-hover:scale-110 transition-transform">
                            <Icon name="check-circle-2" size={20} />
                          </div>
                        </div>
                        <p className="text-xl sm:text-2xl font-black text-slate-900">
                          {paidBills.length} <span className="text-xs text-slate-400 font-bold">/ {monthlyBills.length} Bulan</span>
                        </p>
                        <p className="text-xs text-slate-500 font-semibold mt-1">
                          Tarif: {formatRupiah(student.tarif)}/bulan
                        </p>
                      </div>

                      <div 
                        onClick={() => setActiveTab('berita')}
                        className="p-5 sm:p-6 rounded-2xl sm:rounded-3xl bg-white border border-slate-200/90 hover:border-teal-300 shadow-sm hover:shadow-xl cursor-pointer hover:scale-[1.02] transition-all relative overflow-hidden group"
                      >
                        <div className="flex justify-between items-center mb-3">
                          <span className="text-xs font-black uppercase text-slate-400 tracking-wider">Pengumuman</span>
                          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-teal-500 to-emerald-600 text-white shadow-lg shadow-teal-500/30 flex items-center justify-center group-hover:scale-110 transition-transform">
                            <Icon name="newspaper" size={20} />
                          </div>
                        </div>
                        <p className="text-xl sm:text-2xl font-black text-slate-900">{announcements.length} Berita</p>
                        <p className="text-xs text-slate-500 font-semibold mt-1">
                          {unreadAnnCount > 0 ? `${unreadAnnCount} Belum Dibaca` : 'Semua telah dibaca'}
                        </p>
                      </div>

                      <div 
                        onClick={() => setActiveTab('evaluasi')}
                        className="p-5 sm:p-6 rounded-2xl sm:rounded-3xl bg-white border border-slate-200/90 hover:border-indigo-300 shadow-sm hover:shadow-xl cursor-pointer hover:scale-[1.02] transition-all relative overflow-hidden group"
                      >
                        <div className="flex justify-between items-center mb-3">
                          <span className="text-xs font-black uppercase text-slate-400 tracking-wider">Catatan TU</span>
                          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-lg shadow-indigo-500/30 flex items-center justify-center group-hover:scale-110 transition-transform">
                            <Icon name="file-text" size={20} />
                          </div>
                        </div>
                        <p className="text-xl sm:text-2xl font-black text-slate-900">{myNotes.length} Catatan</p>
                        <p className="text-xs text-slate-500 font-semibold mt-1">Catatan penting TU</p>
                      </div>
                    </div>

                    {/* OVERVIEW CONTENT CARDS */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {/* SPP Status Summary Card */}
                      <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm flex flex-col justify-between">
                        <div>
                          <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
                            <h3 className="font-black text-slate-800 text-lg flex items-center gap-2">
                              <Icon name="credit-card" size={20} className="text-blue-600" /> Ringkasan Tagihan SPP
                            </h3>
                            <button
                              onClick={() => { setActiveTab('spp'); setSppSubFilter('all'); }}
                              className="text-xs font-extrabold text-blue-600 hover:text-blue-800 flex items-center gap-1"
                            >
                              Rincian SPP <Icon name="arrow-right" size={14} />
                            </button>
                          </div>

                          {unpaidBills.length > 0 ? (
                            <div className="space-y-3">
                              <div className="p-4 bg-rose-50 rounded-2xl border border-rose-200">
                                <p className="text-xs font-black text-rose-700 uppercase">Ada {unpaidBills.length} Bulan Belum Dibayar</p>
                                <p className="text-xl font-black text-rose-900 mt-1">Total: {formatRupiah(totalDueDebt)}</p>
                                <div className="flex flex-wrap gap-1.5 mt-2">
                                  {unpaidBills.map((b, idx) => (
                                    <span key={idx} className="px-2.5 py-1 bg-rose-100 text-rose-800 text-xs font-black rounded-lg">
                                      {b.month}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className="p-6 bg-emerald-50 rounded-2xl border border-emerald-200 text-center">
                              <Icon name="shield-check" size={36} className="mx-auto text-emerald-600 mb-2" />
                              <p className="font-black text-slate-800 text-base">Semua SPP Berjalan Lunas!</p>
                              <p className="text-xs text-slate-500 font-medium mt-1">Terima kasih atas kedisiplinan Bapak/Ibu wali murid.</p>
                            </div>
                          )}
                        </div>

                        {unpaidBills.length > 0 && (
                          <button
                            onClick={() => onPayMidtrans(unpaidBills[0])}
                            className="mt-6 w-full py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-black rounded-2xl shadow-md shadow-blue-500/25 transition-all flex items-center justify-center gap-2 text-sm"
                          >
                            <Icon name="credit-card" size={18} /> Bayar Tagihan {unpaidBills[0].month} ({formatRupiah(unpaidBills[0].amount)})
                          </button>
                        )}
                      </div>

                      {/* Latest Announcement Summary Card */}
                      <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm flex flex-col justify-between">
                        <div>
                          <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
                            <h3 className="font-black text-slate-800 text-lg flex items-center gap-2">
                              <Icon name="newspaper" size={20} className="text-teal-600" /> Pengumuman Resmi Terbaru
                            </h3>
                            <button
                              onClick={() => setActiveTab('berita')}
                              className="text-xs font-extrabold text-teal-600 hover:text-teal-800 flex items-center gap-1"
                            >
                              Lihat Semua <Icon name="arrow-right" size={14} />
                            </button>
                          </div>

                          {announcements.length > 0 ? (
                            <div className="space-y-3">
                              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
                                <span className="text-[11px] font-bold text-teal-600 uppercase flex items-center gap-1 mb-1">
                                  <Icon name="calendar" size={12} /> {formatDateIndo(announcements[0].date)}
                                </span>
                                <h4 className="font-black text-slate-800 text-base">{announcements[0].title}</h4>
                                <p className="text-xs text-slate-600 font-medium line-clamp-3 mt-1.5">{announcements[0].content}</p>
                              </div>
                            </div>
                          ) : (
                            <p className="text-xs text-slate-400 font-medium text-center py-8">Belum ada pengumuman sekolah.</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </section>
                )}
                {activeTab === 'spp' && (
                  isRefreshing ? (
                    <div className="space-y-7 animate-pulse select-none">
                      <div className="glass-panel-modern rounded-[32px] p-6 sm:p-8 flex flex-col md:flex-row items-center justify-between gap-6 bg-slate-50/80">
                        <div className="flex items-center gap-6 w-full md:w-auto">
                          <div className="w-24 h-24 rounded-3xl bg-slate-200 animate-pulse shrink-0"></div>
                          <div className="space-y-3 flex-1">
                            <div className="h-5 w-36 bg-slate-200 rounded-full"></div>
                            <div className="h-8 w-64 bg-slate-200 rounded-xl"></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div key={sppSubFilter} className="space-y-6 sm:space-y-7 animate-modern-fade">
                      {/* STUDENT PROFILE CARD */}
                      <div className="glass-panel-modern rounded-2xl sm:rounded-[32px] p-5 sm:p-8 flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-80 h-80 bg-blue-400/10 rounded-full blur-3xl -z-10 -translate-y-1/2 translate-x-1/3"></div>
                        <div className="absolute bottom-0 left-0 w-64 h-64 bg-cyan-400/10 rounded-full blur-3xl -z-10 translate-y-1/3 -translate-x-1/4"></div>

                        <div className="flex items-center gap-4 sm:gap-6 w-full md:w-auto">
                          <div 
                            onClick={() => student.fotoUrl && setPreviewImage({ url: student.fotoUrl, title: `Foto Profil - ${student.name}` })}
                            className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl sm:rounded-3xl bg-gradient-to-tr from-blue-600 via-sky-500 to-cyan-400 border-4 border-white shadow-xl flex items-center justify-center text-white font-black text-3xl sm:text-4xl overflow-hidden shrink-0 cursor-pointer hover:scale-105 transition-transform relative z-10"
                          >
                            {student.fotoUrl ? (
                              <img src={student.fotoUrl} alt={student.name} className="w-full h-full object-cover" />
                            ) : (
                              <span>{student.name ? student.name.charAt(0).toUpperCase() : 'S'}</span>
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-50/90 text-blue-700 rounded-full text-[11px] sm:text-xs font-black tracking-wider uppercase mb-1.5 shadow-sm border border-blue-200">
                              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                              AKTIF • KELAS {student.kelas}
                            </div>
                            <h2 className="text-xl sm:text-2xl md:text-3xl font-black text-slate-900 tracking-tight truncate">{student.name}</h2>
                            <div className="flex flex-wrap items-center gap-2.5 mt-2 text-xs sm:text-sm font-bold text-slate-500">
                              <span className="bg-white/80 px-2.5 py-1 rounded-xl border border-slate-200 shadow-sm">NIS: <span className="text-slate-800 font-extrabold">{student.nis}</span></span>
                              <span className="bg-white/80 px-2.5 py-1 rounded-xl border border-slate-200 shadow-sm">Wali: <span className="text-slate-800 font-extrabold">{student.wali || '-'}</span></span>
                              <a href={getWaLink(student.telepon)} target="_blank" rel="noopener noreferrer" className="bg-teal-50 text-teal-700 px-2.5 py-1 rounded-xl border border-teal-200 hover:bg-teal-100 transition-colors flex items-center gap-1.5 shadow-sm font-extrabold">
                                <Icon name="phone" size={13} /> {formatPhoneDisplay(student.telepon)}
                              </a>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-4 bg-white/80 backdrop-blur-md p-4 sm:p-6 rounded-2xl border border-slate-200/80 w-full md:w-auto shadow-sm">
                          <div className="text-right w-full md:w-auto">
                            <p className="text-xs font-black text-slate-400 uppercase tracking-wider mb-1">Tarif SPP Resmi</p>
                            <p className="text-2xl sm:text-3xl font-black text-blue-600">{formatRupiah(student.tarif)}</p>
                            {student.keringanan_note && (
                              <span className="inline-block mt-1 px-2.5 py-1 bg-amber-100 text-amber-900 text-xs font-black rounded-lg border border-amber-200">
                                Keringanan: {student.keringanan_note}
                              </span>
                            )}
                          </div>
                          <div className="h-10 w-px bg-slate-200 hidden sm:block"></div>
                          <div className="text-left hidden sm:block">
                            <p className="text-xs font-black text-slate-400 uppercase tracking-wider mb-1">Tahun Ajaran</p>
                            <p className="text-sm font-black text-slate-800 bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-sm">{settings.academicYear}</p>
                          </div>
                        </div>
                      </div>

                      {/* STATS CARDS */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
                        {/* Card 1 */}
                        <div className={`p-5 sm:p-6 rounded-2xl sm:rounded-3xl border transition-all ${
                          unpaidBills.length > 0
                            ? 'bg-rose-50/90 border-rose-200 shadow-sm'
                            : 'bg-emerald-50/90 border-emerald-200 shadow-sm'
                        }`}>
                          <div className="flex items-center justify-between mb-3">
                            <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-2xl flex items-center justify-center ${
                              unpaidBills.length > 0 ? 'bg-rose-500 text-white' : 'bg-emerald-500 text-white'
                            }`}>
                              <Icon name={unpaidBills.length > 0 ? 'alert-circle' : 'shield-check'} size={22} />
                            </div>
                            <span className={`px-2.5 py-1 rounded-full text-[11px] font-black uppercase tracking-wider ${
                              unpaidBills.length > 0 ? 'bg-rose-200 text-rose-800' : 'bg-emerald-200 text-emerald-800'
                            }`}>
                              {unpaidBills.length > 0 ? `${unpaidBills.length} Bulan` : 'Lunas / Aman'}
                            </span>
                          </div>
                          <p className="text-xs font-extrabold text-slate-500 uppercase tracking-wider">Tunggakan s/d Bulan Ini</p>
                          <h4 className={`text-xl sm:text-2xl md:text-3xl font-black mt-1 ${totalDueDebt > 0 ? 'text-rose-700' : 'text-emerald-700'}`}>
                            {formatRupiah(totalDueDebt)}
                          </h4>
                          {Number(student?.arrearsAmount || 0) > 0 && !(student?.arrearsNote && student?.kelas && student.arrearsNote.toLowerCase().includes(student.kelas.toLowerCase())) && !String(student?.arrearsNote).startsWith('sess_') && (
                            <div className="mt-1.5 inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 text-[10.5px] font-black border border-amber-300">
                              <Icon name="history" size={11} className="text-amber-700" />
                              <span>+ Tunggakan Kelas Sebelumnya: {formatRupiah(student.arrearsAmount)}</span>
                            </div>
                          )}
                          <p className="text-xs font-medium text-slate-500 mt-1">
                            {totalDueDebt > 0 ? 'Wajib segera dilunasi' : 'Semua tagihan aman'}
                          </p>
                        </div>

                        {/* Card 2 */}
                        <div className="p-5 sm:p-6 rounded-2xl sm:rounded-3xl bg-sky-50/80 border border-sky-200 shadow-sm transition-all">
                          <div className="flex items-center justify-between mb-3">
                            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-sky-500 text-white flex items-center justify-center">
                              <Icon name="calendar" size={22} />
                            </div>
                            <span className="px-2.5 py-1 rounded-full bg-sky-200 text-sky-800 text-[11px] font-black uppercase tracking-wider">
                              {upcomingBills.length} Bulan
                            </span>
                          </div>
                          <p className="text-xs font-extrabold text-slate-500 uppercase tracking-wider">Bulan Mendatang</p>
                          <h4 className="text-xl sm:text-2xl md:text-3xl font-black text-sky-900 mt-1">Belum Jatuh Tempo</h4>
                          <p className="text-xs font-medium text-slate-500 mt-1">
                            Opsi bayar lebih awal
                          </p>
                        </div>

                        {/* Card 3 */}
                        <div className="p-5 sm:p-6 rounded-2xl sm:rounded-3xl bg-indigo-50/80 border border-indigo-200 shadow-sm transition-all">
                          <div className="flex items-center justify-between mb-3">
                            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center">
                              <Icon name="check-circle-2" size={22} />
                            </div>
                            <span className="px-2.5 py-1 rounded-full bg-indigo-200 text-indigo-800 text-[11px] font-black uppercase tracking-wider">
                              {monthlyBills.length > 0 ? Math.round((paidBills.length / monthlyBills.length) * 100) : 0}% Lunas
                            </span>
                          </div>
                          <p className="text-xs font-extrabold text-slate-500 uppercase tracking-wider">Status Pembayaran</p>
                          <h4 className="text-xl sm:text-2xl md:text-3xl font-black text-indigo-950 mt-1">
                            {paidBills.length} <span className="text-sm font-bold text-slate-500">/ {monthlyBills.length} Bulan</span>
                          </h4>
                          <div className="w-full bg-indigo-200/60 rounded-full h-2 mt-2 overflow-hidden">
                            <div 
                              className="bg-indigo-600 h-full rounded-full transition-all duration-500" 
                              style={{ width: `${monthlyBills.length > 0 ? (paidBills.length / monthlyBills.length) * 100 : 0}%` }}
                            ></div>
                          </div>
                        </div>

                        {/* Card 4 */}
                        <div className="p-5 sm:p-6 rounded-2xl sm:rounded-3xl bg-amber-50/80 border border-amber-200 shadow-sm transition-all">
                          <div className="flex items-center justify-between mb-3">
                            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-amber-500 text-white flex items-center justify-center">
                              <Icon name="badge-percent" size={22} />
                            </div>
                            <span className="px-2.5 py-1 rounded-full bg-amber-200 text-amber-900 text-[11px] font-black uppercase tracking-wider">
                              Kelas {student.kelas}
                            </span>
                          </div>
                          <p className="text-xs font-extrabold text-slate-500 uppercase tracking-wider">Tarif SPP</p>
                          <h4 className="text-xl sm:text-2xl md:text-3xl font-black text-amber-950 mt-1">
                            {formatRupiah(student.tarif)}<span className="text-xs font-bold text-slate-500">/bln</span>
                          </h4>
                          <p className="text-xs font-medium text-slate-500 mt-1 truncate">
                            Periode {settings.academicYear || 'Aktif'}
                          </p>
                          <button
                            type="button"
                            onClick={() => setShowParentClassHistory(true)}
                            className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-amber-100/70 text-amber-900 border border-amber-300 rounded-xl text-xs font-black transition-all shadow-2xs group active:scale-95 cursor-pointer w-full justify-center sm:justify-start"
                            title="Klik untuk melihat linimasa riwayat jenjang & mutasi rombel ananda"
                          >
                            <Icon name="history" size={13} className="text-amber-700 group-hover:rotate-45 transition-transform" />
                            <span>Lihat Riwayat Jenjang Kelas</span>
                          </button>
                        </div>
                      </div>

                      {/* Quick Sub-Filter Pills on Mobile */}
                      <div className="flex md:hidden items-center gap-2 pb-1 overflow-x-auto no-scrollbar">
                        {[
                          { id: 'all', label: 'Semua', count: monthlyBills.length },
                          { id: 'unpaid', label: 'Menunggak', count: unpaidBills.length, isDanger: true },
                          { id: 'upcoming', label: 'Mendatang', count: upcomingBills.length },
                          { id: 'paid', label: 'Lunas', count: paidBills.length }
                        ].map(sf => (
                          <button
                            key={sf.id}
                            onClick={() => setSppSubFilter(sf.id)}
                            className={`px-3.5 py-1.5 rounded-full text-xs font-black transition-all shrink-0 flex items-center gap-1.5 ${
                              sppSubFilter === sf.id 
                                ? 'bg-blue-600 text-white shadow-sm' 
                                : 'bg-white text-slate-600 border border-slate-200 shadow-xs'
                            }`}
                          >
                            <span>{sf.label}</span>
                            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                              sppSubFilter === sf.id 
                                ? 'bg-white/20 text-white' 
                                : sf.isDanger && sf.count > 0 ? 'bg-rose-100 text-rose-700 font-black' : 'bg-slate-100 text-slate-600'
                            }`}>
                              {sf.count}
                            </span>
                          </button>
                        ))}
                      </div>

                      {/* 1. Tagihan Menunggak */}
                      {(sppSubFilter === 'all' || sppSubFilter === 'unpaid') && (
                        <section className={`bg-white rounded-2xl sm:rounded-3xl border shadow-sm overflow-hidden relative transition-all ${
                          unpaidBills.length > 0 ? 'border-rose-100' : 'border-emerald-100'
                        }`}>
                          <div className={`absolute top-0 left-0 w-1.5 h-full ${
                            unpaidBills.length > 0 ? 'bg-rose-500' : 'bg-emerald-500'
                          }`}></div>
                          <div className={`p-5 sm:p-7 border-b border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
                            unpaidBills.length > 0 ? 'bg-rose-50/30' : 'bg-emerald-50/30'
                          }`}>
                            <div className="flex items-center gap-3">
                              <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-2xl flex items-center justify-center shrink-0 ${
                                unpaidBills.length > 0 ? 'bg-rose-100 text-rose-600' : 'bg-emerald-100 text-emerald-600'
                              }`}>
                                <Icon name={unpaidBills.length > 0 ? "alert-circle" : "shield-check"} size={22}/>
                              </div>
                              <div>
                                <h3 className="font-black text-slate-800 text-lg sm:text-2xl">
                                  {unpaidBills.length > 0 ? 'Tagihan Menunggak' : 'Status Tagihan Bulan Ini'}
                                </h3>
                                <p className="text-xs sm:text-sm text-slate-500 font-medium mt-0.5">
                                  {unpaidBills.length > 0 
                                    ? 'Bulan SPP yang telah jatuh tempo dan perlu dilunasi.'
                                    : 'Semua tagihan SPP s/d bulan berjalan lunas.'}
                                </p>
                              </div>
                            </div>
                            {unpaidBills.length > 0 ? (
                              <span className="px-3 py-1 sm:px-4 sm:py-1.5 bg-rose-500 text-white rounded-full text-xs sm:text-sm font-black shadow-sm shrink-0">
                                Total: {formatRupiah(totalDueDebt)}
                              </span>
                            ) : (
                              <span className="px-3 py-1 sm:px-4 sm:py-1.5 bg-emerald-500 text-white rounded-full text-xs sm:text-sm font-black shadow-sm shrink-0 flex items-center gap-1.5">
                                <Icon name="check-circle" size={15} /> Status Aman & Lunas
                              </span>
                            )}
                          </div>
                          <div className="p-2 sm:p-3 space-y-3">
                            {Number(student?.arrearsAmount || 0) > 0 && !(student?.arrearsNote && student?.kelas && student.arrearsNote.toLowerCase().includes(student.kelas.toLowerCase())) && !String(student?.arrearsNote).startsWith('sess_') && (
                              <div className="p-4 sm:p-5 rounded-2xl bg-amber-50/95 border-2 border-amber-300 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xs">
                                <div className="flex items-start gap-3">
                                  <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-sm">
                                    <Icon name="history" size={20} />
                                  </div>
                                  <div>
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <h4 className="font-black text-amber-950 text-sm sm:text-base">Tunggakan Bawaan Kelas Sebelumnya</h4>
                                      <span className="px-2 py-0.5 rounded-md bg-amber-200 text-amber-900 text-[10px] font-black uppercase">Akumulasi Mutasi / Naik Kelas</span>
                                    </div>
                                    <p className="text-xs text-amber-800 font-bold mt-0.5">{(student.arrearsNote && !student.arrearsNote.startsWith('sess_')) ? student.arrearsNote : 'Tunggakan dari kelas / periode ajaran sebelumnya'}</p>
                                  </div>
                                </div>
                                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto shrink-0">
                                  <div className="text-left sm:text-right bg-white sm:bg-transparent p-2.5 sm:p-0 rounded-xl border sm:border-0 border-amber-200">
                                    <span className="text-[10px] uppercase font-bold text-slate-400 block sm:hidden">Total Tunggakan:</span>
                                    <div className="font-black text-rose-700 text-xl sm:text-2xl">{formatRupiah(student.arrearsAmount)}</div>
                                    <span className="text-[11px] font-semibold text-slate-500 block">Konfirmasi / Kasir TU & Online</span>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => onPayMidtrans({
                                      month: (student.arrearsNote && !student.arrearsNote.startsWith('sess_')) ? `Tunggakan (${student.arrearsNote})` : 'Tunggakan Kelas Sebelumnya',
                                      amount: Number(student.arrearsAmount),
                                      isArrearsPayment: true
                                    })}
                                    className="py-2.5 px-4 bg-gradient-to-r from-amber-600 via-orange-600 to-rose-600 hover:from-amber-700 hover:to-rose-700 text-white font-black rounded-xl text-xs sm:text-sm shadow-md shadow-orange-600/25 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95 whitespace-nowrap"
                                  >
                                    <Icon name="credit-card" size={16} />
                                    <span>Bayar Online</span>
                                  </button>
                                </div>
                              </div>
                            )}

                            {unpaidBills.length === 0 && Number(student?.arrearsAmount || 0) === 0 ? (
                              <div className="p-8 sm:p-10 text-center flex flex-col items-center justify-center">
                                <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-3">
                                  <Icon name="shield-check" size={32}/>
                                </div>
                                <p className="font-black text-slate-800 text-lg sm:text-xl">Tidak Ada Tunggakan</p>
                                <p className="text-xs sm:text-base text-slate-500 font-medium mt-1">Semua tagihan SPP ananda s/d bulan berjalan dalam status aman & lunas.</p>
                              </div>
                            ) : unpaidBills.length === 0 ? (
                              <div className="p-5 text-center text-xs font-bold text-slate-500 bg-slate-50 rounded-xl border border-slate-200">
                                Seluruh tagihan SPP bulanan kelas {student.kelas} saat ini telah lunas.
                              </div>
                            ) : (
                              <table className="w-full text-left">
                                <tbody className="divide-y divide-slate-100">
                                  {unpaidBills.map((bill, idx) => (
                                    <tr key={idx} className="hover:bg-slate-50 transition-colors">
                                      <td className="py-4 px-4 sm:px-6">
                                        <div className="font-black text-slate-800 text-base sm:text-xl">{bill.month}</div>
                                        <div className="flex items-center gap-1.5 text-[11px] font-black text-rose-600 uppercase mt-0.5">
                                          <Icon name="alert-triangle" size={12} className="text-rose-500" />
                                          <span>Jatuh Tempo • SPP {student.kelas}</span>
                                        </div>
                                      </td>
                                      <td className="py-4 px-4 sm:px-6 text-right">
                                        <div className="font-black text-rose-600 text-lg sm:text-2xl">{formatRupiah(bill.amount)}</div>
                                      </td>
                                      <td className="py-4 px-4 sm:px-6 text-right w-40 sm:w-52">
                                        <button
                                          onClick={() => onPayMidtrans(bill)}
                                          className="w-full py-2.5 sm:py-3.5 px-3 sm:px-5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-black rounded-xl text-xs sm:text-sm shadow-md shadow-blue-500/25 transition-all flex items-center justify-center gap-2"
                                        >
                                          <Icon name="credit-card" size={16} /> Bayar Online
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

                      {/* 2. BULAN MENDATANG */}
                      {(sppSubFilter === 'all' || sppSubFilter === 'upcoming') && upcomingBills.length > 0 && (
                        <details className="group bg-white rounded-2xl sm:rounded-3xl border border-sky-100 shadow-sm overflow-hidden" open={sppSubFilter === 'upcoming'}>
                          <summary className="p-5 sm:p-7 cursor-pointer flex items-center justify-between select-none bg-sky-50/30 hover:bg-sky-50/60 transition-colors">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-sky-100 text-sky-600 rounded-2xl flex items-center justify-center shrink-0"><Icon name="calendar" size={22}/></div>
                              <div>
                                <h3 className="font-black text-slate-800 text-lg sm:text-2xl">Bulan Mendatang (Belum Jatuh Tempo)</h3>
                                <p className="text-xs sm:text-sm text-slate-500 font-medium mt-0.5">{upcomingBills.length} bulan tersisa di periode ajaran ini.</p>
                              </div>
                            </div>
                            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-400 group-open:rotate-180 transition-transform shrink-0">
                              <Icon name="chevron-down" size={16} />
                            </div>
                          </summary>
                          <div className="border-t border-slate-100 p-2 sm:p-3 overflow-x-auto">
                            <table className="w-full text-left">
                              <tbody className="divide-y divide-slate-100">
                                {upcomingBills.map((bill, idx) => (
                                  <tr key={idx} className="hover:bg-slate-50 transition-colors">
                                    <td className="py-4 px-4 sm:px-6">
                                      <div className="font-black text-slate-800 text-base sm:text-xl">{bill.month}</div>
                                      <div className="text-[11px] font-bold text-sky-600 uppercase mt-0.5">Belum Jatuh Tempo • SPP {student.kelas}</div>
                                    </td>
                                    <td className="py-4 px-4 sm:px-6 text-right">
                                      <div className="font-black text-slate-700 text-lg sm:text-2xl">{formatRupiah(bill.amount)}</div>
                                    </td>
                                    <td className="py-4 px-4 sm:px-6 text-right w-40 sm:w-52">
                                      <button
                                        onClick={() => onPayMidtrans(bill)}
                                        className="w-full py-2.5 sm:py-3.5 px-3 sm:px-5 bg-slate-800 hover:bg-slate-900 text-white font-black rounded-xl text-xs sm:text-sm shadow-md transition-all flex items-center justify-center gap-2"
                                      >
                                        <Icon name="credit-card" size={16} /> Bayar di Awal
                                      </button>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </details>
                      )}

                      {/* 3. RIWAYAT LUNAS */}
                      {(sppSubFilter === 'all' || sppSubFilter === 'paid') && (
                        <details className="group bg-white rounded-2xl sm:rounded-3xl border border-slate-200 shadow-sm overflow-hidden" open={sppSubFilter === 'paid' || unpaidBills.length === 0}>
                          <summary className="p-5 sm:p-7 cursor-pointer flex items-center justify-between select-none bg-slate-50/50 hover:bg-slate-50 transition-colors">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center shrink-0"><Icon name="history" size={22}/></div>
                              <div>
                                <h3 className="font-black text-slate-800 text-lg sm:text-2xl">Riwayat SPP Lunas</h3>
                                <p className="text-xs sm:text-sm text-slate-500 font-medium mt-0.5">{allPaidTransactions.length} transaksi resmi tersimpan.</p>
                              </div>
                            </div>
                            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-400 group-open:rotate-180 transition-transform shrink-0">
                              <Icon name="chevron-down" size={16} />
                            </div>
                          </summary>

                          <div className="px-4 sm:px-6 py-3 bg-slate-50 border-t border-b border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs">
                            <div className="flex items-center gap-2">
                              <Icon name="filter" size={14} className="text-slate-500" />
                              <span className="font-extrabold text-slate-600 uppercase tracking-wider">Filter Kelas:</span>
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

                          <div className="p-2 sm:p-3 overflow-x-auto">
                            {filteredPaidBills.length === 0 ? (
                              <p className="text-center p-8 text-sm sm:text-base text-slate-500 font-bold">
                                {historyClassFilter === 'all' 
                                  ? 'Belum ada riwayat pembayaran lunas.' 
                                  : `Belum ada riwayat pembayaran pada kelas ${historyClassFilter}.`}
                              </p>
                            ) : (
                              <table className="w-full text-left border-collapse">
                                <thead>
                                  <tr className="text-[11px] sm:text-xs font-black uppercase tracking-wider">
                                    <th className="py-3.5 px-4 pastel-th-sky rounded-l-2xl text-left whitespace-nowrap">Bulan SPP & Tanggal</th>
                                    <th className="py-3.5 px-4 pastel-th-yellow text-left whitespace-nowrap">Kelas</th>
                                    <th className="py-3.5 px-4 pastel-th-mint text-center whitespace-nowrap">Status</th>
                                    <th className="py-3.5 px-4 pastel-th-teal text-right whitespace-nowrap">Nominal</th>
                                    <th className="py-3.5 px-4 pastel-th-blue text-center rounded-r-2xl whitespace-nowrap">Aksi</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 text-xs sm:text-sm font-medium">
                                  {filteredPaidBills.map((trx, idx) => (
                                    <tr key={trx.id || idx} className="hover:bg-amber-50/40 transition-colors">
                                      <td className="py-3.5 px-4">
                                        <div className="font-black text-slate-800 text-sm sm:text-base">{trx.month}</div>
                                        <div className="flex items-center gap-2 mt-0.5">
                                          <span className="text-[11px] font-bold text-slate-500">Tgl: {formatDateIndo(trx.date)}</span>
                                          {trx.kuitansiNo && (
                                            <span className="font-mono text-[10px] text-slate-500 font-bold bg-slate-100 px-1.5 py-0.2 rounded">
                                              {trx.kuitansiNo}
                                            </span>
                                          )}
                                        </div>
                                      </td>
                                      <td className="py-3.5 px-4">
                                        <span className="px-2.5 py-1 rounded-xl text-xs font-black bg-amber-100/80 text-amber-900 border border-amber-300">
                                          {trx.kelas || student?.kelas}
                                        </span>
                                      </td>
                                      <td className="py-3.5 px-4 text-center">
                                        <span className="status-pill-lunas">
                                          <Icon name="check" size={11} /> LUNAS
                                        </span>
                                      </td>
                                      <td className="py-3.5 px-4 font-black text-emerald-700 text-right text-sm sm:text-base whitespace-nowrap">
                                        <div>{formatRupiah(trx.amount || trx.nominal)}</div>
                                        {Boolean(
                                          trx.keringananNote ||
                                          (student?.keringanan_note && (trx.amount || trx.nominal) < (settings?.customClasses?.find(c => c.name === (trx.kelas || student?.kelas))?.tarif || 350000))
                                        ) && (
                                          <div className="text-[10.5px] text-amber-700 font-extrabold flex items-center justify-end gap-0.5 mt-0.5">
                                            <span>*keringanan</span>
                                          </div>
                                        )}
                                      </td>
                                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                                        <button
                                          onClick={() => onShowKuitansi(trx)}
                                          className="btn-print-kuitansi"
                                          title="Cetak Kuitansi Resmi"
                                        >
                                          <Icon name="printer" size={13} />
                                          <span>Cetak Kuitansi</span>
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
                    <h3 className="text-lg sm:text-xl font-black text-slate-800 flex items-center gap-2 mb-4">
                      <div className="w-9 h-9 sm:w-10 sm:h-10 bg-teal-100 text-teal-600 rounded-xl flex items-center justify-center"><Icon name="newspaper" size={18} /></div>
                      Berita & Pengumuman Sekolah
                    </h3>
                    {announcements.length === 0 ? (
                      <div className="bg-white p-8 rounded-3xl border border-slate-200 text-center shadow-sm">
                        <p className="text-slate-500 font-bold">Belum ada pengumuman saat ini.</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
                        {announcements.map((ann) => (
                          <div key={ann.id} className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/90 shadow-sm hover:shadow-xl transition-all overflow-hidden flex flex-col h-full group">
                            {ann.imageUrl ? (
                              <div 
                                className="w-full h-44 bg-slate-100 relative cursor-pointer overflow-hidden shrink-0"
                                onClick={() => setPreviewImage({ url: ann.imageUrl, title: ann.title })}
                              >
                                <img src={ann.imageUrl} alt={ann.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                              </div>
                            ) : (
                              <div className="w-full h-36 bg-gradient-to-br from-blue-600 via-indigo-600 to-sky-500 p-5 flex flex-col justify-between text-white shrink-0 relative overflow-hidden">
                                <div className="flex items-center justify-between">
                                  <span className="px-2.5 py-1 bg-white/20 backdrop-blur-md rounded-lg text-[10px] font-black uppercase tracking-wider">
                                    Berita Resmi
                                  </span>
                                  <Icon name="newspaper" size={20} className="text-blue-100" />
                                </div>
                                <h4 className="font-black text-sm text-white line-clamp-2 leading-snug drop-shadow-sm">
                                  {ann.title}
                                </h4>
                              </div>
                            )}
                            <div className="p-5 flex-1 flex flex-col justify-between">
                              <div>
                                <div className="flex items-center gap-1.5 text-[11px] font-bold text-blue-600 uppercase mb-2">
                                  <Icon name="calendar" size={13} />
                                  <span>{formatDateIndo(ann.date)}</span>
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

                {/* TAB 3: CATATAN TU (EVALUASI) */}
                {activeTab === 'evaluasi' && (
                  <section className="space-y-6 animate-in fade-in duration-300">
                    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 sm:p-8">
                      <div className="flex items-center gap-3 mb-6 border-b border-slate-100 pb-4">
                        <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center font-bold">
                          <Icon name="file-text" size={24} />
                        </div>
                        <div>
                          <h3 className="text-xl font-black text-slate-800">Catatan dari Tata Usaha (TU)</h3>
                          <p className="text-xs sm:text-sm text-slate-500 font-medium mt-0.5">Catatan & perkembangan ananda {student.name}</p>
                        </div>
                      </div>

                      {myNotes.length === 0 ? (
                        <div className="text-center py-12 bg-slate-50 rounded-2xl border border-slate-100">
                          <Icon name="inbox" size={36} className="mx-auto text-slate-300 mb-2" />
                          <p className="text-slate-500 font-bold text-sm">Belum ada catatan TU untuk ananda {student.name}.</p>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {myNotes.map(note => (
                            <ParentNoteCardItem
                              key={note.id}
                              note={note}
                              student={student}
                              onAddCommentNote={onAddCommentNote}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  </section>
                )}

                {/* TAB 4: PENGADUAN */}
                {activeTab === 'pengaduan' && (
                  <section className="space-y-6 animate-in fade-in duration-300">
                    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 sm:p-8 w-full max-w-6xl mx-auto">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 border-b border-slate-100 pb-4">
                        <div>
                          <h3 className="text-xl font-black text-slate-800 flex items-center gap-2">
                            <Icon name="message-square" size={24} className="text-blue-600" /> Layanan Pengaduan & Masukan
                          </h3>
                          <p className="text-xs sm:text-sm text-slate-500 font-medium mt-0.5">Sampaikan keluhan, pertanyaan, atau masukan langsung kepada pihak sekolah</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-bold border border-blue-200 flex items-center gap-1.5">
                            <Icon name="clock" size={13} className="text-blue-600" /> Durasi Sesi: 1 Jam
                          </span>
                        </div>
                      </div>

                      {/* JIKA ADA PENGADUAN AKTIF: Tampilkan Banner Info & Timer + Form Terkunci */}
                      {activeComplaint ? (
                        <div className="space-y-6 mb-8">
                          {/* Banner Pemberitahuan Pengaduan Aktif Sedang Berjalan */}
                          <div className="bg-gradient-to-r from-blue-50 via-indigo-50 to-sky-50 border border-blue-200 rounded-3xl p-5 sm:p-6 shadow-xs">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                              <div className="flex items-start gap-3.5">
                                <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-bold shrink-0 shadow-md shadow-blue-500/20">
                                  <Icon name="message-circle" size={22} className="animate-bounce" />
                                </div>
                                <div>
                                  <div className="flex flex-wrap items-center gap-2 mb-1">
                                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-blue-600 text-white shadow-xs">
                                      Pengaduan Aktif
                                    </span>
                                    <span className="text-xs font-extrabold text-slate-800">Satu Pengaduan Dalam Satu Waktu</span>
                                  </div>
                                  <p className="text-xs sm:text-sm text-slate-600 font-semibold leading-relaxed">
                                    Anda sedang memiliki pengaduan aktif. Sesuai aturan, Anda baru dapat membuat pengaduan baru setelah pengaduan ini selesai ditangani atau durasi maksimal 1 jam telah berakhir.
                                  </p>
                                </div>
                              </div>

                              {/* Live Countdown Timer Badge */}
                              <div className="shrink-0 bg-white px-5 py-3 rounded-2xl border border-blue-200 shadow-sm flex items-center gap-3 self-start md:self-auto">
                                <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">
                                  <Icon name="timer" size={20} className="animate-pulse" />
                                </div>
                                <div>
                                  <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Sisa Waktu Sesi</p>
                                  <p className="text-xl font-black text-blue-700 font-mono tracking-wider">
                                    {formatCountdown(activeComplaint.expiresAtMs || ((activeComplaint.createdAtMs || activeComplaint.id) + 3600000), nowMs)}
                                  </p>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Kartu Chat Pengaduan Aktif */}
                          <div className="bg-white rounded-3xl border-2 border-blue-400 shadow-md p-5 sm:p-6 space-y-4">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-amber-100 text-amber-800">
                                    {activeComplaint.status || 'Sedang Diproses'}
                                  </span>
                                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-blue-100 text-blue-800 flex items-center gap-1 font-mono">
                                    <Icon name="clock" size={11} />
                                    {formatCountdown(activeComplaint.expiresAtMs || ((activeComplaint.createdAtMs || activeComplaint.id) + 3600000), nowMs)}
                                  </span>
                                </div>
                                <h4 className="font-black text-slate-800 text-lg mt-1.5">{activeComplaint.title}</h4>
                              </div>
                              <span className="text-xs text-slate-500 font-bold">{formatDateIndo(activeComplaint.date)}</span>
                            </div>

                            {/* Thread Pesan Live */}
                            <div className="space-y-3 max-h-80 overflow-y-auto bg-slate-50 p-4 rounded-2xl border border-slate-200/80">
                              {activeComplaint.messages && activeComplaint.messages.map((m, idx) => {
                                const isAdmin = m.sender === 'Admin TU' || m.sender?.toLowerCase().includes('admin') || m.sender?.toLowerCase().includes('tu');
                                return (
                                  <div key={idx} className={`flex flex-col ${isAdmin ? 'items-start mr-auto' : 'items-end ml-auto'} max-w-[85%]`}>
                                    <div className={`p-3.5 rounded-2xl text-xs shadow-xs ${
                                      isAdmin
                                        ? 'bg-white text-slate-800 border border-slate-200/90 rounded-tl-xs'
                                        : 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-tr-xs shadow-blue-500/10'
                                    }`}>
                                      <div className={`flex justify-between items-center gap-3 mb-1 text-[11px] font-black ${isAdmin ? 'text-blue-800' : 'text-blue-100'}`}>
                                        <span className="flex items-center gap-1">
                                          <Icon name={isAdmin ? 'shield-check' : 'user'} size={12} className={isAdmin ? 'text-blue-600' : 'text-blue-200'} />
                                          {isAdmin ? 'Petugas Tata Usaha (TU)' : 'Anda (Wali Murid)'}
                                        </span>
                                        <span className="text-[10px] opacity-75 font-medium">{formatDateTimeIndo(m.time, activeComplaint.date)}</span>
                                      </div>
                                      <p className="font-semibold whitespace-pre-wrap leading-relaxed">{m.text}</p>
                                      {m.imageUrl && (
                                        <div className="mt-2">
                                          <img src={m.imageUrl} alt="Lampiran" className="max-w-full max-h-56 object-cover rounded-xl shadow-xs" />
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>

                            {/* Form Balas Chat Aktif */}
                            <div className="flex items-center gap-2 pt-1">
                              <input
                                type="file"
                                id={`parent_file_${activeComplaint.id}`}
                                className="hidden"
                                accept="image/*"
                                onChange={e => {
                                  const file = e.target.files[0];
                                  if (file) {
                                    const reader = new FileReader();
                                    reader.onload = ev => {
                                      onReplyComplaint(
                                        activeComplaint.id,
                                        replyText[activeComplaint.id]?.trim() || '(Mengirim Lampiran Foto)',
                                        'Wali Murid',
                                        ev.target.result
                                      );
                                      setReplyText({ ...replyText, [activeComplaint.id]: '' });
                                    };
                                    reader.readAsDataURL(file);
                                  }
                                }}
                              />
                              <button
                                type="button"
                                onClick={() => document.getElementById(`parent_file_${activeComplaint.id}`).click()}
                                className="p-3 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-2xl transition-colors flex items-center justify-center shrink-0 border border-slate-300 shadow-sm"
                                title="Kirim Foto / Lampiran"
                              >
                                <Icon name="image" size={18} />
                              </button>
                              <input
                                type="text"
                                value={replyText[activeComplaint.id] || ''}
                                onChange={e => setReplyText({ ...replyText, [activeComplaint.id]: e.target.value })}
                                onKeyDown={e => {
                                  if (e.key === 'Enter' && replyText[activeComplaint.id]?.trim()) {
                                    onReplyComplaint(activeComplaint.id, replyText[activeComplaint.id].trim(), 'Wali Murid');
                                    setReplyText({ ...replyText, [activeComplaint.id]: '' });
                                  }
                                }}
                                placeholder="Tulis balasan untuk Admin TU..."
                                className="flex-1 px-4 py-3 bg-slate-50 border border-slate-300 rounded-2xl text-xs sm:text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-inner"
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  if (replyText[activeComplaint.id]?.trim()) {
                                    onReplyComplaint(activeComplaint.id, replyText[activeComplaint.id].trim(), 'Wali Murid');
                                    setReplyText({ ...replyText, [activeComplaint.id]: '' });
                                  }
                                }}
                                className="px-5 py-3 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-2xl text-xs sm:text-sm transition-all flex items-center gap-1.5 shadow-md shadow-blue-500/20 active:scale-95 shrink-0"
                              >
                                <Icon name="send" size={15} /> Balas
                              </button>
                            </div>
                          </div>
                        </div>
                      ) : (
                        /* JIKA TIDAK ADA PENGADUAN AKTIF: Tampilkan Form Buat Pengaduan Baru */
                        <form
                          onSubmit={e => {
                            e.preventDefault();
                            if (!complaintTitle.trim() || !complaintContent.trim()) return;
                            onAddComplaint({
                              studentId: student.id,
                              studentName: student.name,
                              waliName: student.wali || 'Wali Murid',
                              title: complaintTitle.trim(),
                              content: complaintContent.trim(),
                              imageUrl: complaintImage || null,
                              date: formatDateIndo(new Date())
                            });
                            setComplaintTitle('');
                            setComplaintContent('');
                            setComplaintImage('');
                          }}
                          className="bg-slate-50 p-5 sm:p-7 rounded-3xl border border-slate-200/80 mb-8 space-y-4 shadow-xs"
                        >
                          <div className="flex items-center justify-between">
                            <h4 className="font-black text-slate-800 text-sm uppercase tracking-wide flex items-center gap-2">
                              <Icon name="plus-circle" size={17} className="text-blue-600" /> Buat Pengaduan Baru
                            </h4>
                            <span className="text-[11px] font-bold text-slate-400">Durasi Respons: Maks. 1 Jam</span>
                          </div>

                          <div>
                            <label className="block text-xs font-bold text-slate-600 mb-1.5">Subjek / Judul Pengaduan</label>
                            <input
                              type="text"
                              required
                              value={complaintTitle}
                              onChange={e => setComplaintTitle(e.target.value)}
                              placeholder="Contoh: Kendala Pembayaran SPP / Pertanyaan Kegiatan"
                              className="w-full px-4 py-3 bg-white border border-slate-300 rounded-2xl text-xs sm:text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-inner"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-bold text-slate-600 mb-1.5">Pesan / Detail Pengaduan</label>
                            <textarea
                              required
                              rows="4"
                              value={complaintContent}
                              onChange={e => setComplaintContent(e.target.value)}
                              placeholder="Tuliskan pengaduan atau pertanyaan Anda secara rinci..."
                              className="w-full px-4 py-3 bg-white border border-slate-300 rounded-2xl text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none shadow-inner"
                            ></textarea>
                          </div>

                          <div>
                            <label className="block text-xs font-bold text-slate-600 mb-1.5">Lampirkan Foto / Gambar (Opsional)</label>
                            <div className="flex items-center gap-2 flex-wrap">
                              <input
                                type="file"
                                id="parent_new_complaint_file"
                                className="hidden"
                                accept="image/*"
                                onChange={e => {
                                  const file = e.target.files[0];
                                  if (file) {
                                    const reader = new FileReader();
                                    reader.onload = ev => setComplaintImage(ev.target.result);
                                    reader.readAsDataURL(file);
                                  }
                                }}
                              />
                              <button
                                type="button"
                                onClick={() => document.getElementById('parent_new_complaint_file').click()}
                                className="px-4 py-2.5 bg-white hover:bg-slate-100 border border-slate-300 rounded-xl text-xs font-bold text-slate-700 flex items-center gap-2 shadow-xs transition-colors"
                              >
                                <Icon name="image" size={15} className="text-blue-600" />
                                <span>{complaintImage ? 'Ganti Lampiran Foto' : 'Pilih Foto / Gambar'}</span>
                              </button>
                              {complaintImage && (
                                <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 px-3 py-1.5 rounded-xl">
                                  <img src={complaintImage} alt="Preview" className="w-8 h-8 object-cover rounded-lg border border-blue-200" />
                                  <span className="text-[11px] font-bold text-blue-900">Foto Terpilih</span>
                                  <button
                                    type="button"
                                    onClick={() => setComplaintImage('')}
                                    className="p-1 text-rose-500 hover:text-rose-700 rounded-full hover:bg-rose-50"
                                    title="Hapus Foto"
                                  >
                                    <Icon name="x" size={13} />
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="pt-2">
                            <button
                              type="submit"
                              className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-2xl text-sm shadow-md shadow-blue-500/25 transition-all flex items-center justify-center gap-2 active:scale-[0.99]"
                            >
                              <Icon name="send" size={16} /> Kirim Pengaduan (Mulai Sesi 1 Jam)
                            </button>
                          </div>
                          <p className="text-[11px] text-slate-400 font-medium italic text-center">
                            * Anda hanya dapat membuat 1 pengaduan dalam satu waktu. Pengaduan baru berikutnya dapat dibuat setelah pengaduan selesai atau waktu 1 jam habis.
                          </p>
                        </form>
                      )}

                      {/* RIWAYAT PENGADUAN TERDAHULU / TERKUNCI (KE HIDE SECARA DEFAULT) */}
                      {pastComplaints.length > 0 && (
                        <div className="pt-2 border-t border-slate-100">
                          <button
                            type="button"
                            onClick={() => setShowPastComplaints(prev => !prev)}
                            className="w-full py-3.5 px-5 bg-slate-50 hover:bg-slate-100/80 rounded-2xl border border-slate-200 flex items-center justify-between text-xs font-black text-slate-700 transition-colors"
                          >
                            <div className="flex items-center gap-2.5">
                              <Icon name="archive" size={16} className="text-slate-500" />
                              <span>Riwayat Pengaduan Selesai / Terkunci ({pastComplaints.length})</span>
                              <span className="px-2 py-0.5 rounded-full bg-slate-200 text-slate-600 text-[10px] font-bold">
                                Batas 1 Jam Selesai
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5 text-blue-600 font-bold">
                              <span>{showPastComplaints ? 'Sembunyikan' : 'Buka Riwayat Percakapan'}</span>
                              <Icon name={showPastComplaints ? 'chevron-up' : 'chevron-down'} size={15} />
                            </div>
                          </button>

                          {showPastComplaints && (
                            <div className="mt-4 space-y-4 animate-in fade-in duration-200">
                              {pastComplaints.map(comp => (
                                <div key={comp.id} className="bg-slate-50/70 rounded-2xl border border-slate-200 p-5 shadow-xs space-y-3">
                                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/70 pb-3">
                                    <div>
                                      <div className="flex items-center gap-2">
                                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-slate-200 text-slate-700">
                                          {comp.status === 'Sudah Ditangani' ? 'Sudah Ditangani' : 'Terkunci (1 Jam Berakhir)'}
                                        </span>
                                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-slate-100 text-slate-500 border border-slate-200 flex items-center gap-1">
                                          <Icon name="lock" size={10} /> Sesi Ditutup
                                        </span>
                                      </div>
                                      <h5 className="font-black text-slate-800 text-base mt-1">{comp.title}</h5>
                                    </div>
                                    <span className="text-[11px] text-slate-500 font-bold">{formatDateIndo(comp.date)}</span>
                                  </div>

                                  {/* Chat Thread */}
                                  <div className="space-y-2 max-h-60 overflow-y-auto bg-white p-3.5 rounded-xl border border-slate-200">
                                    {comp.messages && comp.messages.map((m, idx) => {
                                      const isAdmin = m.sender === 'Admin TU' || m.sender?.toLowerCase().includes('admin') || m.sender?.toLowerCase().includes('tu');
                                      return (
                                        <div key={idx} className={`flex flex-col ${isAdmin ? 'items-start mr-auto' : 'items-end ml-auto'} max-w-[85%]`}>
                                          <div className={`p-3 rounded-xl text-xs ${
                                            isAdmin
                                              ? 'bg-blue-50/80 text-slate-800 border border-blue-200'
                                              : 'bg-slate-100 text-slate-800 border border-slate-300'
                                          }`}>
                                            <div className="flex justify-between items-center gap-3 mb-1">
                                              <span className={`font-black text-[11px] flex items-center gap-1 ${isAdmin ? 'text-blue-800' : 'text-slate-800'}`}>
                                                <Icon name={isAdmin ? 'shield-check' : 'user'} size={12} className={isAdmin ? 'text-blue-600' : 'text-slate-500'} />
                                                {isAdmin ? 'Tata Usaha (TU)' : 'Wali Murid'}
                                              </span>
                                              <span className="text-[10px] text-slate-500 font-medium">{formatDateTimeIndo(m.time, comp.date)}</span>
                                            </div>
                                            <p className="font-medium whitespace-pre-wrap">{m.text}</p>
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>

                                  {/* Locked Notice */}
                                  <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl flex items-center gap-2 text-xs text-amber-800 font-bold">
                                    <Icon name="lock" size={14} className="text-amber-600 shrink-0" />
                                    <span>Sesi pengaduan ini telah selesai & terkunci otomatis karena durasi 1 jam telah berakhir.</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      {!activeComplaint && pastComplaints.length === 0 && (
                        <p className="text-center py-6 text-slate-400 font-medium text-xs sm:text-sm">
                          Belum ada riwayat pengaduan sebelumnya.
                        </p>
                      )}
                    </div>
                  </section>
                )}

                {/* TAB 5: PENGATURAN */}
                {activeTab === 'pengaturan' && (
                  <section className="space-y-6 animate-in fade-in duration-300">
                    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 sm:p-8 w-full max-w-4xl mx-auto">
                      <div className="text-center mb-8">
                        <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-blue-100 shadow-inner">
                          <Icon name="settings" size={32} />
                        </div>
                        <h3 className="text-2xl font-black text-slate-800 tracking-tight">Pengaturan Akun Wali Murid</h3>
                        <p className="text-sm text-slate-500 font-medium mt-1">Perbarui nomor WhatsApp dan ganti password akun login portal ananda.</p>
                      </div>

                      {/* Info Status Akun & Password */}
                      <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 border border-slate-200 mb-6 space-y-3">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div>
                            <span className="text-[11px] font-black uppercase tracking-wider text-slate-500">Status Kredensial Login</span>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-xs font-mono font-black text-slate-800 bg-white px-2.5 py-1 rounded-lg border border-slate-200">
                                NIS: {student.nis}
                              </span>
                              {student.password && 
                               student.password.toString().trim() !== student.nis.toString().trim() && 
                               student.password.toString().trim() !== `Sb${student.nis.toString().trim()}` ? (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 text-xs font-black">
                                  <Icon name="lock" size={13} className="text-emerald-600" />
                                  <span>Password Kustom Aktif</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-100 text-blue-800 border border-blue-300 text-xs font-black">
                                  <Icon name="key" size={13} className="text-blue-600" />
                                  <span>Default Sistem (Sb{student.nis})</span>
                                </span>
                              )}
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => {
                              const defaultPwd = student.nis ? `Sb${student.nis}` : '123456';
                              if (confirm(`Apakah Anda ingin mengembalikan password akun ke Default Sistem (${defaultPwd})?\n\nSetelah direset, password lama Anda tidak akan berlaku lagi dan Anda harus masuk menggunakan password default (${defaultPwd}).`)) {
                                onUpdateParentSettings(student.id, { password: defaultPwd, nis: student.nis });
                                setNewPassword('');
                                setConfirmPassword('');
                                setSettingsFeedback({
                                  type: 'success',
                                  text: `Password akun berhasil direset ke Default Sistem (${defaultPwd})! Password lama tidak berlaku lagi, gunakan password default ini untuk masuk.`
                                });
                              }
                            }}
                            className="px-3.5 py-2 bg-white hover:bg-slate-100 text-slate-700 hover:text-blue-600 rounded-xl border border-slate-300 font-extrabold text-xs shadow-sm transition-all flex items-center gap-1.5 shrink-0 active:scale-95"
                            title="Reset password ke default sistem (Sb[NIS])"
                          >
                            <Icon name="rotate-ccw" size={14} />
                            <span>Reset ke Default Sistem</span>
                          </button>
                        </div>
                        <p className="text-[11.5px] text-slate-500 font-medium leading-relaxed">
                          Password default akun adalah <strong>Sb[NIS]</strong> (contoh: <code>Sb{student.nis}</code>). Jika Anda mengembalikan password ke default, password lama Anda otomatis dibatalkan dan Anda masuk menggunakan password default tersebut.
                        </p>
                      </div>

                      {/* Feedback Banner */}
                      {settingsFeedback && (
                        <div className={`p-4 rounded-2xl mb-6 text-xs sm:text-sm font-bold flex items-center gap-3 animate-in fade-in ${
                          settingsFeedback.type === 'error'
                            ? 'bg-rose-50 border border-rose-200 text-rose-700'
                            : 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                        }`}>
                          <Icon name={settingsFeedback.type === 'error' ? "alert-circle" : "check-circle"} size={18} className="shrink-0" />
                          <span>{settingsFeedback.text}</span>
                        </div>
                      )}

                      <form
                        onSubmit={e => {
                          e.preventDefault();
                          setSettingsFeedback(null);
                          const updateObj = {};

                          if (newPhone.trim() && newPhone.trim() !== student.telepon) {
                            updateObj.telepon = newPhone.trim();
                          }

                          if (newPassword.trim()) {
                            if (newPassword.trim().length < 6) {
                              setSettingsFeedback({ type: 'error', text: 'Password baru minimal harus 6 karakter demi keamanan akun.' });
                              return;
                            }
                            const hasLetter = /[a-zA-Z]/.test(newPassword.trim());
                            const hasNumber = /[0-9]/.test(newPassword.trim());
                            if (!hasLetter || !hasNumber) {
                              setSettingsFeedback({ type: 'error', text: 'Password baru harus berupa campuran angka dan huruf (seaman mungkin)!' });
                              return;
                            }
                            if (newPassword.trim() !== confirmPassword.trim()) {
                              setSettingsFeedback({ type: 'error', text: 'Konfirmasi password tidak cocok dengan password baru!' });
                              return;
                            }
                            updateObj.password = newPassword.trim();
                          }

                          if (Object.keys(updateObj).length === 0) {
                            setSettingsFeedback({ type: 'error', text: 'Tidak ada perubahan data yang disimpan.' });
                            return;
                          }

                          onUpdateParentSettings(student.id, updateObj);
                          setNewPassword('');
                          setConfirmPassword('');
                          setSettingsFeedback({
                            type: 'success',
                            text: updateObj.password
                              ? 'Password akun berhasil diperbarui! Gunakan password baru ini untuk login berikutnya.'
                              : 'Nomor WhatsApp berhasil diperbarui!'
                          });
                        }}
                        className="space-y-6"
                      >
                        <div className="space-y-2">
                          <label className="block text-xs font-black text-slate-700 uppercase tracking-wide">Nomor WhatsApp Wali Murid</label>
                          <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                              <Icon name="phone" size={18} />
                            </div>
                            <input
                              id="settings-phone"
                              name="phone"
                              autoComplete="tel"
                              type="text"
                              value={newPhone}
                              onChange={e => setNewPhone(e.target.value)}
                              placeholder="Contoh: 08123456789"
                              className="w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-300 rounded-2xl text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <label className="block text-xs font-black text-slate-700 uppercase tracking-wide">
                              Password Baru <span className="text-slate-400 font-normal lowercase">(opsional)</span>
                            </label>
                            <div className="relative">
                              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                                <Icon name="lock" size={18} />
                              </div>
                              <input
                                id="settings-password"
                                name="newPassword"
                                autoComplete="new-password"
                                type={showNewPassword ? "text" : "password"}
                                value={newPassword}
                                onChange={e => setNewPassword(e.target.value)}
                                placeholder="Kosongkan jika tidak ganti"
                                className="w-full pl-11 pr-11 py-3.5 bg-slate-50 border border-slate-300 rounded-2xl text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                              />
                              <button
                                type="button"
                                onClick={() => setShowNewPassword(!showNewPassword)}
                                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
                              >
                                <Icon name={showNewPassword ? "eye-off" : "eye"} size={17} />
                              </button>
                            </div>
                          </div>

                          <div className="space-y-2">
                            <label className="block text-xs font-black text-slate-700 uppercase tracking-wide">
                              Konfirmasi Password Baru
                            </label>
                            <div className="relative">
                              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                                <Icon name="shield-check" size={18} />
                              </div>
                              <input
                                id="settings-confirm-password"
                                name="confirmPassword"
                                autoComplete="new-password"
                                type={showNewPassword ? "text" : "password"}
                                value={confirmPassword}
                                onChange={e => setConfirmPassword(e.target.value)}
                                placeholder="Ulangi password baru"
                                disabled={!newPassword}
                                className="w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-300 rounded-2xl text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                              />
                            </div>
                          </div>
                        </div>

                        <div className="pt-2">
                          <button
                            type="submit"
                            className="w-full py-4 bg-blue-600 hover:bg-blue-700 active:scale-[0.99] text-white font-black rounded-2xl shadow-md shadow-blue-500/25 transition-all flex items-center justify-center gap-2 text-sm sm:text-base"
                          >
                            <Icon name="save" size={18} />
                            <span>Simpan Perubahan Akun</span>
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
          {/* ROOT-LEVEL ADMIN NOTIFICATION DROPDOWN (BEBAS DARI STACKING CONTEXT BANNER & STAT CARDS) */}
          {showBellDropdown && (
            <div className="fixed inset-0 z-[9999] pointer-events-auto">
              {/* Subtle Click-Away Backdrop */}
              <div 
                className="fixed inset-0 bg-slate-900/20 backdrop-blur-[2px] z-[9999]"
                onClick={() => setShowBellDropdown(false)}
              />
              <div className="fixed inset-x-3 sm:inset-x-auto sm:right-8 top-[74px] sm:top-24 z-[10000] w-auto max-w-sm sm:max-w-none sm:w-96 mx-auto sm:mx-0 bg-white rounded-3xl shadow-2xl border border-slate-200 text-slate-800 p-4 space-y-3 animate-in slide-in-from-top-2 duration-200 max-h-[82vh] overflow-y-auto">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                      <Icon name="bell" size={14} />
                    </div>
                    <h4 className="font-extrabold text-xs uppercase text-slate-800 tracking-wide">Notifikasi Admin</h4>
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
                          complaints.forEach(c => onMarkReadNotification && onMarkReadNotification('complaint', c.id));
                          transactions.forEach(t => onMarkReadNotification && onMarkReadNotification('transaction', t.id));
                        }}
                        className="text-[10px] font-bold text-blue-600 hover:text-blue-800 hover:underline"
                      >
                        Tandai Dibaca
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setShowBellDropdown(false)}
                      className="px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-800 text-xs font-bold transition-colors"
                    >
                      Tutup
                    </button>
                  </div>
                </div>

                <div className="space-y-2 max-h-80 overflow-y-auto text-xs pr-0.5">
                  {complaints.length === 0 && transactions.length === 0 && (
                    <div className="text-center py-6 text-slate-400 font-medium">
                      <Icon name="bell-off" size={26} className="mx-auto mb-1.5 text-slate-300" />
                      Belum ada aktivitas notifikasi.
                    </div>
                  )}

                  {/* Pending Complaints */}
                  {complaints.filter(isComplaintPending).map(c => (
                    <div 
                      key={c.id} 
                      onClick={() => {
                        onMarkReadNotification && onMarkReadNotification('complaint', c.id);
                        setShowBellDropdown(false);
                        navigateTo('pengaduan');
                      }}
                      className="p-3 rounded-2xl border cursor-pointer transition-all hover:scale-[0.99] bg-amber-50/90 border-amber-200 font-bold shadow-2xs"
                    >
                      <div className="flex justify-between items-center mb-1 gap-2">
                        <span className="text-amber-900 font-extrabold truncate">Aduan Masuk: {c.title}</span>
                        <span className="px-1.5 py-0.5 bg-rose-500 text-white rounded text-[9px] font-black shrink-0">Perlu Balasan</span>
                      </div>
                      <p className="text-[11px] text-amber-800 truncate">{c.waliName || 'Wali'} ({c.studentName}) • {c.content}</p>
                      {c.date && <span className="text-[9.5px] text-amber-700/80 font-semibold mt-1 block">{formatDateIndo(c.date)}</span>}
                    </div>
                  ))}

                  {/* Unread Transactions */}
                  {transactions.filter(t => !t.isRead).map(t => (
                    <div 
                      key={t.id} 
                      onClick={() => {
                        onMarkReadNotification && onMarkReadNotification('transaction', t.id);
                        setShowBellDropdown(false);
                        onShowKuitansi(t);
                      }}
                      className="p-3 rounded-2xl border cursor-pointer transition-all hover:scale-[0.99] bg-emerald-50/90 border-emerald-200 font-bold shadow-2xs"
                    >
                      <div className="flex justify-between items-center mb-1 gap-2">
                        <span className="text-emerald-900 font-extrabold truncate">Pembayaran SPP {t.month}</span>
                        <span className="px-1.5 py-0.5 bg-emerald-600 text-white rounded text-[9px] font-black shrink-0">Lunas</span>
                      </div>
                      <p className="text-[11px] text-emerald-800">{t.studentName} • {formatRupiah(t.amount)}</p>
                      {t.date && <span className="text-[9.5px] text-emerald-700/80 font-semibold mt-1 block">{formatDateIndo(t.date)}</span>}
                    </div>
                  ))}

                  {/* Other recent complaints if any */}
                  {complaints.filter(c => !isComplaintPending(c)).slice(0, 4).map(c => (
                    <div 
                      key={c.id} 
                      onClick={() => {
                        setShowBellDropdown(false);
                        navigateTo('pengaduan');
                      }}
                      className="p-3 rounded-2xl border cursor-pointer transition-all hover:bg-slate-100 bg-slate-50/90 border-slate-200 text-slate-600"
                    >
                      <div className="flex justify-between items-center mb-0.5 gap-2">
                        <span className="font-bold text-slate-800 truncate">Aduan: {c.title}</span>
                        <span className="text-[10px] text-slate-400 font-semibold shrink-0">Selesai</span>
                      </div>
                      <p className="text-[10.5px] text-slate-500 truncate">{c.waliName} ({c.studentName})</p>
                      {c.date && <span className="text-[9.5px] text-slate-400 font-medium mt-0.5 block">{formatDateIndo(c.date)}</span>}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
          
          {/* GREETING & WAVING MASCOT BANNER FOR ADMIN */}
          <GreetingMascotBanner 
            name={settings?.adminName || 'Admin TU'} 
            role="Administrator" 
            schoolName={settings?.schoolName} 
            academicYear={settings?.academicYear} 
          />

          <div className="relative rounded-[28px] sm:rounded-[32px] p-6 sm:p-8 smurf-panel-glow text-slate-800 flex flex-wrap items-center justify-between gap-6">
            <div className="relative z-10">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-100 border border-sky-300/80 text-sky-800 text-xs font-black mb-2 shadow-xs">
                <span className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse"></span>
                <span>PANEL ADMINISTRATOR TU</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">Pusat Kendali Administrasi</h2>
              <p className="text-sm sm:text-base text-slate-600 mt-1 font-semibold max-w-xl">Kelola data murid, pencatatan transaksi manual, broadcast pengumuman, dan respon aduan wali.</p>
            </div>

            <div className="flex items-center gap-3 relative z-10">
              <button
                onClick={() => onRefresh(true)}
                title="Refresh Data Baru"
                className="py-3 px-4.5 bg-sky-50 hover:bg-sky-100 active:scale-95 text-sky-800 rounded-2xl text-sm font-black border border-sky-200 transition-all flex items-center gap-2 shadow-sm"
              >
                <Icon name="refresh-cw" size={18} className={isRefreshing ? 'animate-spin text-sky-600' : 'text-sky-600'} />
                <span className="hidden sm:inline">Refresh Data</span>
              </button>

              <div className="relative">
                <button
                  type="button"
                  onClick={() => {
                    const next = !showBellDropdown;
                    setShowBellDropdown(next);
                    if (next) {
                      complaints.forEach(c => onMarkReadNotification && onMarkReadNotification('complaint', c.id));
                      transactions.forEach(t => onMarkReadNotification && onMarkReadNotification('transaction', t.id));
                    }
                  }}
                  className="p-3 bg-sky-50 hover:bg-sky-100 rounded-2xl text-sky-800 relative transition-colors border border-sky-200 shadow-sm"
                  title="Notifikasi Admin"
                >
                  <Icon name="bell" size={20} />
                  {totalUnreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-rose-500 text-white rounded-full text-[10px] font-extrabold flex items-center justify-center border-2 border-white animate-pulse shadow-md">
                      {totalUnreadCount}
                    </span>
                  )}
                </button>
              </div>

              <button 
                onClick={() => navigateTo('siswa')}
                className="py-3 px-5 bg-gradient-to-r from-blue-600 via-sky-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600 text-white font-black rounded-2xl text-sm transition-all shadow-lg shadow-sky-500/35 flex items-center gap-2 border border-cyan-300/40 active:scale-95"
              >
                <Icon name="user-plus" size={18} />
                <span>Tambah Siswa</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <div 
              onClick={() => setShowPivotModal('siswa')}
              className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/90 hover:border-blue-300 shadow-sm hover:shadow-xl transition-all cursor-pointer flex items-center gap-5 group transform hover:-translate-y-1 relative overflow-hidden"
            >
              <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-indigo-600 text-white rounded-2xl flex items-center justify-center shrink-0 shadow-lg shadow-blue-600/30 group-hover:scale-110 transition-transform">
                <Icon name="users" size={30} />
              </div>
              <div>
                <p className="text-xs sm:text-sm font-extrabold text-slate-400 uppercase tracking-wider">Total Murid</p>
                <p className="text-2xl sm:text-3xl font-black text-slate-900 mt-1">{totalSiswa} Siswa</p>
              </div>
            </div>

            <div 
              onClick={() => setShowPivotModal('pemasukan')}
              className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/90 hover:border-emerald-300 shadow-sm hover:shadow-xl transition-all cursor-pointer flex items-center gap-5 group transform hover:-translate-y-1 relative overflow-hidden"
              title="Klik untuk melihat transaksi pemasukan"
            >
              <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-teal-600 text-white rounded-2xl flex items-center justify-center shrink-0 shadow-lg shadow-emerald-500/30 group-hover:scale-110 transition-transform">
                <Icon name="wallet" size={30} />
              </div>
              <div>
                <p className="text-xs sm:text-sm font-extrabold text-slate-400 uppercase tracking-wider">Pemasukkan SPP</p>
                <p className="text-2xl sm:text-3xl font-black text-emerald-600 mt-1">{formatRupiah(totalPemasukan)}</p>
              </div>
            </div>

            <div 
              onClick={() => setShowPivotModal('transaksi')}
              className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/90 hover:border-amber-300 shadow-sm hover:shadow-xl transition-all cursor-pointer flex items-center gap-5 group transform hover:-translate-y-1 relative overflow-hidden"
              title="Klik untuk melihat transaksi"
            >
              <div className="w-16 h-16 bg-gradient-to-br from-amber-500 to-orange-600 text-white rounded-2xl flex items-center justify-center shrink-0 shadow-lg shadow-amber-500/30 group-hover:scale-110 transition-transform">
                <Icon name="credit-card" size={30} />
              </div>
              <div>
                <p className="text-xs sm:text-sm font-extrabold text-slate-400 uppercase tracking-wider">Jumlah Transaksi</p>
                <p className="text-2xl sm:text-3xl font-black text-slate-900 mt-1">{transactions.length} Transaksi</p>
              </div>
            </div>

            <div 
              onClick={() => navigateTo('pengaduan')}
              className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/90 hover:border-rose-300 shadow-sm hover:shadow-xl transition-all cursor-pointer flex items-center gap-5 group transform hover:-translate-y-1 relative overflow-hidden"
              title="Klik untuk melihat layanan pengaduan"
            >
              <div className="w-16 h-16 bg-gradient-to-br from-rose-500 to-red-600 text-white rounded-2xl flex items-center justify-center shrink-0 shadow-lg shadow-rose-500/30 group-hover:scale-110 transition-transform">
                <Icon name="message-square" size={30} />
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
                      <td className="py-4 px-6">
                        <div className="font-extrabold text-emerald-700">{trx.month}</div>
                        {trx.date && <div className="text-[11px] font-bold text-slate-400 mt-0.5">{formatDateIndo(trx.date)}</div>}
                      </td>
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
                                  <td className="py-2.5 px-3 text-slate-600">{formatDateIndo(t.date)}</td>
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
    function SiswaListView({ students, settings, transactions = [], onAddStudent, onUpdateStudent, onDeleteStudent, showToast }) {
      const [showModal, setShowModal] = useState(false);
      const [editingStudent, setEditingStudent] = useState(null);
      const [isKeringanan, setIsKeringanan] = useState(false);
      const [waModalStudent, setWaModalStudent] = useState(null);
      const [waPhoneInput, setWaPhoneInput] = useState('');
      const [waSavePhone, setWaSavePhone] = useState(true);
      const [copiedWaMsg, setCopiedWaMsg] = useState(false);
      const [selectedBiodataStudent, setSelectedBiodataStudent] = useState(null);
      const [selectedHistoryStudent, setSelectedHistoryStudent] = useState(null);
      const [viewTab, setViewTab] = useState('biodata'); // 'biodata' | 'history'
      const [searchQuery, setSearchQuery] = useState('');
      const [classFilter, setClassFilter] = useState('ALL');
      const [matriksPage, setMatriksPage] = useState(1);
      const MATRIKS_PER_PAGE = 10;

      // Daftar kelas dinamis diambil langsung dari Pengaturan (settings.customClasses)
      const classList = useMemo(() => {
        if (Array.isArray(settings?.customClasses) && settings.customClasses.length > 0) {
          const valid = settings.customClasses.filter(c => c && c.name && c.name.trim().length > 0);
          if (valid.length > 0) return valid;
        }
        const studentClasses = Array.from(new Set((students || []).map(s => s.kelas).filter(Boolean)));
        return studentClasses.map(clsName => ({ name: clsName, tarif: 0 }));
      }, [settings?.customClasses, students]);

      // Cek apakah siswa berstatus Lulus / Alumni
      const isStudentLulus = (student) => {
        if (!student) return false;
        return (
          student.statusAktif === false ||
          (student.status || '').toLowerCase() === 'lulus' ||
          (student.status || '').toLowerCase() === 'non-aktif' ||
          (student.kelas || '').toLowerCase().includes('lulus') ||
          (student.kelas || '').toLowerCase().includes('alumni')
        );
      };

      // Cek apakah jenjang kelas tertentu telah ditempuh/aktif untuk siswa
      const isClassCompleted = (student, clsName) => {
        if (!student || !clsName) return false;
        if (isStudentLulus(student)) return true;

        const targetNameLower = clsName.trim().toLowerCase();
        const currentClassLower = (student.kelas || '').trim().toLowerCase();

        // 1. Cek manual override di completedLevels jika ada
        const overrides = student.completedLevels || {};
        if (overrides[clsName] !== undefined) {
          return Boolean(overrides[clsName]);
        }

        // 2. Cek apakah kelas saat ini sama persis
        if (currentClassLower === targetNameLower) return true;

        // 3. Cek urutan jenjang dinamis berdasarkan posisi kelas di pengaturan
        const targetIdx = classList.findIndex(c => c.name.trim().toLowerCase() === targetNameLower);
        const currentIdx = classList.findIndex(c => c.name.trim().toLowerCase() === currentClassLower);
        if (targetIdx !== -1 && currentIdx !== -1 && currentIdx >= targetIdx) {
          return true;
        }

        // 4. Cek riwayat kelas sebelumnya di classHistory
        const history = Array.isArray(student.classHistory) ? student.classHistory : [];
        const inHistory = history.some(h => 
          (h.fromClass && h.fromClass.trim().toLowerCase() === targetNameLower) ||
          (h.toClass && h.toClass.trim().toLowerCase() === targetNameLower)
        );
        if (inHistory) return true;

        return false;
      };

      // Helper status progres jenjang kelas dinamis tanpa hardcode
      const getClassProgressionStatus = (student) => {
        if (!student) return { lulus: false };
        const isLulus = isStudentLulus(student);
        const res = {
          lulus: isLulus
        };
        classList.forEach(c => {
          res[c.name] = isClassCompleted(student, c.name);
        });
        return res;
      };

      // Data murid terfilter berdasarkan input pencarian & filter kelas
      const filteredStudents = useMemo(() => {
        return (students || []).filter(s => {
          if (!s) return false;
          const q = searchQuery.toLowerCase().trim();
          const matchQuery = !q || (
            (s.name && s.name.toLowerCase().includes(q)) ||
            (s.nis && String(s.nis).toLowerCase().includes(q)) ||
            (s.nik && String(s.nik).toLowerCase().includes(q)) ||
            (s.nipd && String(s.nipd).toLowerCase().includes(q)) ||
            (s.wali && s.wali.toLowerCase().includes(q)) ||
            (s.kelas && s.kelas.toLowerCase().includes(q))
          );

          let matchClass = true;
          if (classFilter !== 'ALL') {
            if (classFilter === 'LULUS') {
              matchClass = isStudentLulus(s);
            } else {
              matchClass = Boolean(s.kelas && s.kelas.trim().toLowerCase() === classFilter.trim().toLowerCase());
            }
          }

          return matchQuery && matchClass;
        });
      }, [students, searchQuery, classFilter]);

      useEffect(() => {
        setMatriksPage(1);
      }, [searchQuery, classFilter]);

      // Handler Toggle Checklist Jenjang Kelas (Ceklis / Unceklis) Realtime & Persisten
      const handleToggleLevel = (student, clsName) => {
        if (!student || !clsName) return;
        const curChecked = isClassCompleted(student, clsName);
        const todayDate = formatDateIndo(new Date());

        let updatedStudent = { ...student };
        let updatedOverrides = { ...(student.completedLevels || {}) };
        const currentHistory = Array.isArray(student.classHistory) ? [...student.classHistory] : [];

        const targetIdx = classList.findIndex(c => c.name.trim().toLowerCase() === clsName.trim().toLowerCase());
        const targetCls = targetIdx !== -1 ? classList[targetIdx] : { name: clsName, tarif: student.tarif || 0 };

        if (curChecked) {
          // Aksi Unceklis: Batalkan jenjang ini
          updatedOverrides[clsName] = false;

          let prevClass = '-';
          let prevTarif = 0;
          if (targetIdx > 0) {
            prevClass = classList[targetIdx - 1].name;
            prevTarif = classList[targetIdx - 1].tarif || student.tarif;
          }

          const currentIdx = classList.findIndex(c => c.name.trim().toLowerCase() === (student.kelas || '').trim().toLowerCase());
          if (currentIdx >= targetIdx) {
            updatedStudent.kelas = prevClass;
            if (prevTarif > 0) updatedStudent.tarif = prevTarif;
            // Kembalikan juga tunggakan bawaan menjadi 0 agar tidak dobel/aneh di portal wali
            updatedStudent.arrearsAmount = 0;
            updatedStudent.arrearsNote = '';
          }

          currentHistory.push({
            id: Date.now(),
            type: 'Penyesuaian Jenjang (Batal Ceklis)',
            fromClass: student.kelas,
            toClass: prevClass,
            date: todayDate,
            note: `Membatalkan centang jenjang ${clsName}`
          });

          updatedStudent.completedLevels = updatedOverrides;
          updatedStudent.classHistory = currentHistory;

          onUpdateStudent(student.id, updatedStudent);
          if (typeof showToast === 'function') {
            showToast("Jenjang Diperbarui", `Jenjang ${clsName} untuk ${student.name} dibatalkan.`, "info");
          }
        } else {
          // Aksi Ceklis: Tandai jenjang ini dan jenjang sebelumnya sebagai selesai
          classList.forEach((c, i) => {
            if (i <= targetIdx) {
              updatedOverrides[c.name] = true;
            }
          });

          updatedStudent.kelas = targetCls.name;
          if (targetCls.tarif) updatedStudent.tarif = targetCls.tarif;
          updatedStudent.statusAktif = true;
          updatedStudent.status = 'Aktif';

          currentHistory.push({
            id: Date.now(),
            type: 'Kenaikan Jenjang (Ceklis)',
            fromClass: student.kelas,
            toClass: targetCls.name,
            date: todayDate,
            note: `Ceklis jenjang ${clsName}`
          });

          updatedStudent.completedLevels = updatedOverrides;
          updatedStudent.classHistory = currentHistory;

          onUpdateStudent(student.id, updatedStudent);
          if (typeof showToast === 'function') {
            showToast("Jenjang Berhasil Dicentang!", `${student.name} kini berada di ${targetCls.name}.`, "success");
          }
        }
      };

      // Handler Toggle Kelulusan (Lulus / Belum Lulus)
      const handleToggleLulus = (student) => {
        if (!student) return;
        const willBeLulus = !isStudentLulus(student);
        const todayDate = formatDateIndo(new Date());
        const currentHistory = Array.isArray(student.classHistory) ? [...student.classHistory] : [];

        let updatedStudent = { ...student };
        let updatedOverrides = { ...(student.completedLevels || {}) };

        if (willBeLulus) {
          classList.forEach(c => {
            updatedOverrides[c.name] = true;
          });
          updatedOverrides['lulus'] = true;

          currentHistory.push({
            id: Date.now(),
            type: 'Kelulusan (Alumni)',
            fromClass: student.kelas,
            toClass: 'Alumni (Lulus)',
            date: todayDate,
            note: 'Telah tamat / lulus dari PAUD'
          });

          updatedStudent.statusAktif = false;
          updatedStudent.status = 'Lulus';
          updatedStudent.completedLevels = updatedOverrides;
          updatedStudent.classHistory = currentHistory;

          onUpdateStudent(student.id, updatedStudent);
          if (typeof showToast === 'function') {
            showToast("Kelulusan Berhasil!", `${student.name} kini berstatus Lulus (Alumni).`, "success");
          }
        } else {
          const lastClass = classList[classList.length - 1] || { name: student.kelas || 'Kelas', tarif: student.tarif || 0 };
          updatedOverrides['lulus'] = false;

          currentHistory.push({
            id: Date.now(),
            type: 'Pembatalan Kelulusan',
            fromClass: 'Alumni (Lulus)',
            toClass: lastClass.name,
            date: todayDate,
            note: 'Kelulusan dibatalkan, kembali aktif belajar'
          });

          updatedStudent.statusAktif = true;
          updatedStudent.status = 'Aktif';
          updatedStudent.kelas = lastClass.name;
          if (lastClass.tarif) updatedStudent.tarif = lastClass.tarif;
          updatedStudent.completedLevels = updatedOverrides;
          updatedStudent.classHistory = currentHistory;

          onUpdateStudent(student.id, updatedStudent);
          if (typeof showToast === 'function') {
            showToast("Kelulusan Dibatalkan", `${student.name} diaktifkan kembali di kelas ${lastClass.name}.`, "info");
          }
        }
      };

      // State Naik / Pindah Kelas Siswa
      const [promotionStudent, setPromotionStudent] = useState(null);
      const [promotionForm, setPromotionForm] = useState({
        type: 'naik',
        targetClass: '',
        targetTarif: 0,
        academicYear: settings.academicYear || '2026/2027',
        note: '',
        keepExistingDiscount: true,
        unpaidMonthsList: [],
        curClassUnpaidDebt: 0,
        existingArrears: 0,
        totalAccumulated: 0,
        carryOverDebt: false
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

        // Hitung sisa tagihan yang belum lunas di kelas saat ini
        const studentTrx = (transactions || []).filter(t => 
          (t.studentId === student.id || (t.studentName && t.studentName.toLowerCase().trim() === student.name.toLowerCase().trim())) &&
          (t.status === 'Lunas' || t.status === 'lunas' || t.status === 'Berhasil' || t.status === 'Sukses')
        );
        const paidMonthNames = studentTrx.map(t => (t.month || '').trim().toLowerCase());
        const allMonths = getStudentAllBillingMonths(student, settings);
        const curDueDate = Number(settings?.dueDateDay) || 10;
        const now = new Date();
        const unpaidMonthsList = allMonths.filter(m => {
          const mLower = m.trim().toLowerCase();
          const isPaid = paidMonthNames.some(pm => pm === mLower || (pm && mLower.startsWith(pm)));
          if (isPaid) return false;
          return isMonthDueOrElapsed(m, now, curDueDate);
        });

        const curClassUnpaidDebt = unpaidMonthsList.length * (Number(student.tarif) || 0);
        const existingArrears = Number(student.arrearsAmount) || 0;
        const totalAccumulated = curClassUnpaidDebt + existingArrears;

        const curMonthName = ALL_MONTHS[now.getMonth()] || 'Januari';
        const curYearNum = now.getFullYear();
        const todayIso = now.toISOString().split('T')[0];

        setPromotionForm({
          type: 'pindah',
          targetClass: nextCls ? nextCls.name : (classList[0]?.name || student.kelas || ''),
          targetTarif: hasDiscount ? student.tarif : stdTarif,
          academicYear: settings.academicYear || `${curYearNum}/${curYearNum + 1}`,
          transferDate: todayIso,
          effectiveMonth: curMonthName,
          effectiveYear: curYearNum,
          note: `Pindah rombel dari ${student.kelas} ke ${nextCls ? nextCls.name : (classList[0]?.name || 'Kelas Baru')}`,
          keepExistingDiscount: hasDiscount,
          unpaidMonthsList,
          curClassUnpaidDebt,
          existingArrears,
          totalAccumulated,
          carryOverDebt: totalAccumulated > 0,
          excludePriorMonths: true
        });
      };

      const handlePromotionSubmit = (e) => {
        e.preventDefault();
        if (!promotionStudent) return;
        if (!promotionForm.targetClass) {
          alert('Silakan pilih kelas atau status tujuan siswa!');
          return;
        }

        const fromClass = promotionStudent.kelas;
        const toClass = promotionForm.targetClass;
        const transferDate = promotionForm.transferDate || new Date().toISOString().split('T')[0];
        const effectiveMonth = promotionForm.effectiveMonth || ALL_MONTHS[new Date().getMonth()] || 'Januari';
        const effectiveYear = parseInt(promotionForm.effectiveYear, 10) || new Date().getFullYear();
        const todayDate = transferDate;
        let formattedTransferDate = transferDate;
        try {
          const parts = transferDate.split('-');
          if (parts.length === 3) {
            const d = parseInt(parts[2], 10);
            const m = ALL_MONTHS[parseInt(parts[1], 10) - 1] || parts[1];
            const y = parts[0];
            formattedTransferDate = `${d} ${m} ${y}`;
          }
        } catch (err) {}

        // Akumulasi tunggakan dari kelas sebelumnya jika ada
        const carryDebt = promotionForm.carryOverDebt ? (Number(promotionForm.totalAccumulated) || 0) : 0;
        let newArrearsNote = '';
        if (carryDebt > 0) {
          if (promotionForm.unpaidMonthsList && promotionForm.unpaidMonthsList.length > 0) {
            newArrearsNote = `Tunggakan ${fromClass}: ${promotionForm.unpaidMonthsList.length} bln (${promotionForm.unpaidMonthsList.join(', ')}) = ${formatRupiah(promotionForm.curClassUnpaidDebt)}`;
            if (promotionForm.existingArrears > 0) {
              newArrearsNote += ` + Bawaan: ${formatRupiah(promotionForm.existingArrears)}`;
            }
          } else if (promotionStudent.arrearsNote) {
            newArrearsNote = promotionStudent.arrearsNote;
          } else {
            newArrearsNote = `Tunggakan dari ${fromClass}: ${formatRupiah(carryDebt)}`;
          }
        }

        // KASUS KHUSUS: SISWA LULUS / KELUAR SEKOLAH (STATUS: OFF)
        if (promotionForm.type === 'keluar') {
          const isLulus = toClass.toLowerCase().includes('lulus') || toClass.toLowerCase().includes('alumni');
          const finalStatus = isLulus ? 'Lulus' : 'Non-Aktif';
          const newRecord = {
            id: Date.now(),
            type: isLulus ? 'Kelulusan (Alumni)' : 'Keluar Sekolah',
            fromClass: fromClass,
            toClass: toClass,
            transferDate: transferDate,
            effectiveMonth: effectiveMonth,
            effectiveYear: effectiveYear,
            previousTarif: promotionStudent.tarif,
            newTarif: 0,
            academicYear: promotionForm.academicYear,
            unpaidMonthsFromPrevious: promotionForm.unpaidMonthsList || [],
            unpaidAmountFromPrevious: promotionForm.curClassUnpaidDebt || 0,
            carriedOverArrears: carryDebt,
            note: promotionForm.note || (isLulus ? `Siswa telah lulus / tamat dari ${fromClass}` : `Siswa telah keluar / mutasi dari ${fromClass}`),
            date: transferDate
          };

          const updatedHistory = [...(promotionStudent.classHistory || []), newRecord];
          try {
            localStorage.setItem('spp_class_history_' + promotionStudent.id, JSON.stringify(updatedHistory));
            localStorage.setItem('spp_class_history_' + promotionStudent.nis, JSON.stringify(updatedHistory));
          } catch (err) {}

          onUpdateStudent(promotionStudent.id, {
            ...promotionStudent,
            kelas: toClass,
            tarif: 0,
            statusAktif: false,
            status: finalStatus,
            arrearsAmount: carryDebt,
            arrearsNote: newArrearsNote,
            classHistory: updatedHistory,
            lastMutationDate: transferDate,
            session_token: null
          });

          alert(
            `Status Siswa Berhasil Diperbarui!\n\n` +
            `Ananda ${promotionStudent.name} kini berstatus: "${toClass}".\n` +
            `Tanggal Mutasi: ${formattedTransferDate}\n` +
            `Status Akun: NON-AKTIF / OFF (Akses Login Ditutup).\n\n` +
            `🔒 Username & password NIS ${promotionStudent.nis} tidak dapat digunakan lagi untuk login ke portal wali murid.\n` +
            (carryDebt > 0 
              ? `⚠️ Catatan Tunggakan: Sisa tagihan dari kelas sebelumnya sebesar ${formatRupiah(carryDebt)} tetap tersimpan di riwayat.\n` 
              : `✅ Siswa bersih tanpa tunggakan.\n`)
          );

          setPromotionStudent(null);
          return;
        }

        if (promotionForm.targetClass === promotionStudent.kelas) {
          alert('Kelas tujuan harus berbeda dengan kelas saat ini!');
          return;
        }

        const newTarif = Number(promotionForm.targetTarif) || promotionStudent.tarif;

        const newRecord = {
          id: Date.now(),
          type: promotionForm.type === 'naik' ? 'Kenaikan Kelas' : 'Pindah / Mutasi Rombel',
          fromClass: fromClass,
          toClass: toClass,
          transferDate: transferDate,
          effectiveMonth: effectiveMonth,
          effectiveYear: effectiveYear,
          previousTarif: promotionStudent.tarif,
          newTarif: newTarif,
          academicYear: promotionForm.academicYear,
          unpaidMonthsFromPrevious: promotionForm.unpaidMonthsList || [],
          unpaidAmountFromPrevious: promotionForm.curClassUnpaidDebt || 0,
          carriedOverArrears: carryDebt,
          note: promotionForm.note || (promotionForm.type === 'naik' ? `Kenaikan ke ${toClass}` : `Pindah ke ${toClass}`),
          date: transferDate
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
          statusAktif: true,
          status: 'Aktif',
          startActiveMonth: effectiveMonth,
          startActiveYear: effectiveYear,
          arrearsAmount: carryDebt,
          arrearsNote: newArrearsNote,
          classHistory: updatedHistory,
          lastMutationDate: transferDate
        });

        alert(
          `Sukses ${promotionForm.type === 'naik' ? 'Kenaikan Kelas' : 'Pindah Rombel'}!\n\n` +
          `Ananda ${promotionStudent.name} berhasil dipindahkan ke rombel "${toClass}".\n` +
          `Tanggal Pasti Pindah: ${formattedTransferDate}\n` +
          `Mulai Efektif Tagihan: ${effectiveMonth} ${effectiveYear}\n` +
          `Tarif SPP Baru: ${formatRupiah(newTarif)}/bulan.\n\n` +
          `📌 Aturan Keuangan & Tunggakan:\n` +
          `• Tagihan siswa dihitung mulai dari bulan ia masuk (${effectiveMonth} ${effectiveYear} dan seterusnya).\n` +
          `• Bulan sebelum masuk (${fromClass}) tidak dihitung sebagai hutang atau tunggakan di rombel baru.\n` +
          `• Tagihan untuk bulan berjalan & mendatang berstatus "Belum Jatuh Tempo". Status baru menunggak jika sudah melewati bulan saat ini.\n\n` +
          (carryDebt > 0 
            ? `⚠️ Catatan Tunggakan: Sisa tagihan dari kelas ${fromClass} sebesar ${formatRupiah(carryDebt)} telah otomatis diakumulasikan ke tagihan siswa di kelas baru.\n\n`
            : `✅ Siswa bersih tanpa tunggakan dari kelas sebelumnya.\n\n`) +
          `Seluruh riwayat jenjang kelas dan pembayaran terdahulu tersimpan rapi di sistem mutasi.`
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
        arrearsNote: '',
        startActiveMonth: settings.startMonth || 'Januari',
        startActiveYear: settings.startYear ? Number(settings.startYear) : new Date().getFullYear(),
        classHistory: []
      });

      const openModal = (student = null) => {
        if (student) {
          setEditingStudent(student);
          const matchCls = (settings.customClasses || []).find(c => c.name === student.kelas);
          const standardTarif = matchCls ? matchCls.tarif : 0;
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
            password: student.password || (student.nis ? `Sb${student.nis}` : generateDefaultStudentPassword()),
            keringanan_note: student.keringanan_note || '',
            arrearsAmount: Number(student.arrearsAmount) || 0,
            arrearsNote: student.arrearsNote || '',
            startActiveMonth: student.startActiveMonth || settings.startMonth || 'Januari',
            startActiveYear: student.startActiveYear ? Number(student.startActiveYear) : (settings.startYear ? Number(settings.startYear) : new Date().getFullYear()),
            classHistory: student.classHistory || []
          });
        } else {
          setEditingStudent(null);
          setIsKeringanan(false);
          const defaultKelas = (settings.customClasses || [])[0]?.name || '';
          const defaultTarif = (settings.customClasses || [])[0]?.tarif || 0;
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
            password: generateDefaultStudentPassword(),
            statusAktif: true,
            keringanan_note: '',
            arrearsAmount: 0,
            arrearsNote: '',
            startActiveMonth: settings.startMonth || 'Januari',
            startActiveYear: settings.startYear ? Number(settings.startYear) : new Date().getFullYear(),
            classHistory: []
          });
        }
        setShowModal(true);
      };

      const handleSubmit = (e) => {
        e.preventDefault();

        // VALIDASI SEMUA DATA DIRI WAJIB LENGKAP:
        const missing = [];
        if (!formData.name?.trim()) missing.push('Nama Lengkap Siswa');
        if (!formData.nis?.toString().trim()) missing.push('NIS');
        if (!formData.jk?.trim()) missing.push('Jenis Kelamin (L/P)');
        if (!formData.tempatLahir?.trim()) missing.push('Tempat Lahir');
        if (!formData.tanggalLahir?.trim()) missing.push('Tanggal Lahir');
        if (!formData.nik?.toString().trim()) missing.push('NIK Siswa (16 Digit)');
        if (!formData.agama?.trim()) missing.push('Agama');
        if (!formData.alamat?.trim()) missing.push('Alamat Tempat Tinggal');
        if (!formData.rt?.toString().trim()) missing.push('RT');
        if (!formData.rw?.toString().trim()) missing.push('RW');
        if (!formData.kelas?.trim()) missing.push('Kelas');
        if (!formData.wali?.trim()) missing.push('Nama Orang Tua / Wali');
        if (!formData.telepon?.trim()) missing.push('No. WhatsApp Wali');

        if (missing.length > 0) {
          alert(
            `MOHON LENGKAPI SELURUH DATA DIRI SISWA:\n\n` +
            missing.map((f, i) => `${i + 1}. ${f}`).join('\n') +
            `\n\nSeluruh data diri dari Nama sampai RT/RW wajib diisi sebelum menyimpan data siswa!`
          );
          return;
        }

        const effectivePassword = (formData.password && formData.password.trim().length > 0)
          ? formData.password.trim()
          : (formData.nis ? `Sb${formData.nis.toString().trim()}` : '123456');

        const payload = {
          ...formData,
          name: formData.name.trim(),
          nis: formData.nis.toString().trim(),
          nipd: formData.nipd ? formData.nipd.toString().trim() : formData.nis.toString().trim(),
          nisn: formData.nisn ? formData.nisn.toString().trim() : '',
          jk: formData.jk || 'L',
          tempatLahir: formData.tempatLahir.trim(),
          tanggalLahir: formData.tanggalLahir.trim(),
          nik: formData.nik.toString().trim(),
          agama: formData.agama || 'Islam',
          alamat: formData.alamat.trim(),
          rt: formData.rt.toString().trim(),
          rw: formData.rw.toString().trim(),
          kelas: formData.kelas.trim(),
          tarif: Number(formData.tarif) || 0,
          wali: formData.wali.trim(),
          telepon: formData.telepon.trim(),
          password: effectivePassword,
          status: formData.statusAktif ? 'Aktif' : 'Non-Aktif',
          statusAktif: formData.statusAktif !== false,
          keringanan_note: isKeringanan ? (formData.keringanan_note || 'Diringankan') : '',
          arrearsAmount: (formData.kelas && formData.arrearsNote && formData.arrearsNote.toLowerCase().includes(formData.kelas.toLowerCase())) ? 0 : (Number(formData.arrearsAmount) || 0),
          arrearsNote: (formData.kelas && formData.arrearsNote && formData.arrearsNote.toLowerCase().includes(formData.kelas.toLowerCase())) ? '' : (formData.arrearsNote || ''),
          startActiveMonth: formData.startActiveMonth || settings.startMonth || 'Januari',
          startActiveYear: formData.startActiveYear ? Number(formData.startActiveYear) : (settings.startYear ? Number(settings.startYear) : new Date().getFullYear()),
          classHistory: formData.classHistory || []
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
        else if (clean.startsWith('8')) clean = '62' + clean;
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
        else if (clean.startsWith('8')) clean = '62' + clean;

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

          {/* Tab Navigasi: Data Pokok Murid vs Matriks Riwayat & Jenjang Kelas */}
          <div className="flex flex-wrap items-center gap-2.5 border-b border-slate-200 pb-2">
            <button
              type="button"
              onClick={() => setViewTab('biodata')}
              className={`px-5 py-3 rounded-2xl font-black text-xs sm:text-sm flex items-center gap-2 transition-all ${
                viewTab === 'biodata'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-500/25 scale-[1.02]'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <Icon name="users" size={17} />
              <span>Data Pokok & Biodata Murid</span>
              <span className={`px-2 py-0.5 rounded-full text-[11px] font-black ${viewTab === 'biodata' ? 'bg-blue-700 text-white' : 'bg-slate-100 text-slate-600'}`}>
                {students.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setViewTab('history')}
              className={`px-5 py-3 rounded-2xl font-black text-xs sm:text-sm flex items-center gap-2 transition-all ${
                viewTab === 'history'
                  ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md shadow-indigo-500/25 scale-[1.02]'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <Icon name="check-square" size={17} />
              <span>Tabel Riwayat & Jenjang Kelas (Checklist)</span>
              <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-black ${viewTab === 'history' ? 'bg-white/20 text-white' : 'bg-indigo-50 text-indigo-700 border border-indigo-200'}`}>
                {classList.map(c => c.name).join(' ➔ ')} ➔ Lulus
              </span>
            </button>
          </div>

          {/* SEARCH & FILTER TOOLBAR (Buku Induk & Matriks Riwayat) */}
          <div className="bg-white p-4 sm:p-5 rounded-2xl sm:rounded-3xl border border-slate-200/90 shadow-sm flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-4">
            <div className="relative flex-1">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Icon name="search" size={17} />
              </span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={viewTab === 'history' ? "Cari nama murid atau NIS pada tabel jenjang kelas..." : "Cari nama murid, NIS, NIK, atau wali..."}
                className="w-full pl-10 pr-9 py-2.5 sm:py-3 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-xs sm:text-sm text-slate-800 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all shadow-inner"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                  title="Hapus pencarian"
                >
                  <Icon name="x" size={16} />
                </button>
              )}
            </div>

            <div className="flex items-center gap-2.5 shrink-0">
              <div className="relative min-w-[150px] sm:min-w-[180px]">
                <select
                  value={classFilter}
                  onChange={(e) => setClassFilter(e.target.value)}
                  className="w-full py-2.5 sm:py-3 pl-3.5 pr-8 bg-slate-50 border border-slate-200 rounded-2xl font-black text-xs sm:text-sm text-slate-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all cursor-pointer shadow-2xs"
                >
                  <option value="ALL">Semua Kelas ({students.length})</option>
                  {classList.map(c => (
                    <option key={c.name} value={c.name}>
                      {c.name} ({students.filter(s => s.kelas === c.name).length})
                    </option>
                  ))}
                  <option value="LULUS">Alumni / Lulus ({students.filter(isStudentLulus).length})</option>
                </select>
              </div>

              {(searchQuery || classFilter !== 'ALL') && (
                <button
                  type="button"
                  onClick={() => { setSearchQuery(''); setClassFilter('ALL'); }}
                  className="px-3.5 py-2.5 sm:py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold transition-colors"
                  title="Reset filter & pencarian"
                >
                  Reset
                </button>
              )}

              <span className="hidden md:inline-flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-blue-50 text-blue-700 text-xs font-black border border-blue-100">
                <span>{filteredStudents.length}</span>
                <span className="font-semibold text-blue-600/80">Murid</span>
              </span>
            </div>
          </div>

          {viewTab === 'biodata' && (
            <div className="pastel-table-card">
            <div className="overflow-x-auto p-3 sm:p-4">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="text-[11px] sm:text-xs font-black uppercase tracking-wider">
                    <th className="py-3.5 px-4 pastel-th-orange rounded-l-2xl text-left whitespace-nowrap">Foto & Nama</th>
                    <th className="py-3.5 px-4 pastel-th-sky text-left whitespace-nowrap">NIS / NIK</th>
                    <th className="py-3.5 px-4 pastel-th-yellow text-left whitespace-nowrap">Data Diri & Alamat</th>
                    <th className="py-3.5 px-4 pastel-th-mint text-left whitespace-nowrap">Kelas</th>
                    <th className="py-3.5 px-4 pastel-th-teal text-left whitespace-nowrap">Tarif SPP</th>
                    <th className="py-3.5 px-4 pastel-th-purple text-left whitespace-nowrap">Wali & Login WA</th>
                    <th className="py-3.5 px-4 pastel-th-coral text-center whitespace-nowrap">Status Akun</th>
                    <th className="py-3.5 px-4 pastel-th-blue text-center rounded-r-2xl whitespace-nowrap">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm font-medium">
                  {filteredStudents.length > 0 ? (
                    filteredStudents.map((s) => (
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
                      <td className="py-4 px-6 font-mono text-slate-800">
                        <span className="font-black text-sm block">{s.nis}</span>
                        {s.nik && <span className="text-[11px] text-slate-500 font-medium block">NIK: {s.nik}</span>}
                      </td>
                      <td className="py-4 px-6 text-xs">
                        <div className="space-y-1 max-w-[220px]">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className={`px-2 py-0.5 rounded-md font-black text-[10px] ${
                              s.jk === 'P' ? 'bg-pink-100 text-pink-700 border border-pink-200' : 'bg-blue-100 text-blue-700 border border-blue-200'
                            }`}>
                              {s.jk === 'P' ? 'Perempuan (P)' : 'Laki-laki (L)'}
                            </span>
                            {s.agama && (
                              <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded-md text-[10px] font-bold">
                                {s.agama}
                              </span>
                            )}
                          </div>
                          {(s.tempatLahir || s.tanggalLahir) && (
                            <p className="text-slate-600 font-semibold text-[11px] truncate" title={`${s.tempatLahir || '-'}, ${s.tanggalLahir || '-'}`}>
                              📍 {s.tempatLahir || '-'}{s.tanggalLahir ? `, ${s.tanggalLahir}` : ''}
                            </p>
                          )}
                          <p className="text-slate-700 font-bold text-[11px] truncate" title={`${s.alamat || '-'} RT ${s.rt || '-'}/RW ${s.rw || '-'}`}>
                            🏠 {s.alamat || '-'} {(s.rt || s.rw) ? <span className="font-mono text-blue-800 font-extrabold">(RT {s.rt || '0'}/RW {s.rw || '0'})</span> : null}
                          </p>
                          <button
                            type="button"
                            onClick={() => setSelectedBiodataStudent(s)}
                            className="inline-flex items-center gap-1 text-[11px] text-blue-600 hover:text-blue-800 font-black hover:underline pt-0.5"
                          >
                            <Icon name="id-card" size={12} />
                            <span>Lihat Biodata Lengkap</span>
                          </button>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <span className="inline-flex items-center px-3 py-1 bg-blue-50 text-blue-700 rounded-xl border border-blue-200 font-extrabold text-xs sm:text-sm">
                          {s.kelas}
                        </span>
                        <div className="text-[10px] text-emerald-700 font-bold mt-1 flex items-center gap-1">
                          <Icon name="calendar" size={11} />
                          <span>Mulai: {s.startActiveMonth || settings.startMonth || 'Jan'} {s.startActiveYear || settings.startYear || ''}</span>
                        </div>
                        {/* Mini Checklist Progress Indikator */}
                        {(() => {
                          const isLulus = isStudentLulus(s);
                          return (
                            <div className="flex items-center gap-1 mt-1.5 flex-wrap" title={`Progres Jenjang: ${classList.map(c => c.name).join(' ➔ ')} ➔ Lulus`}>
                              {classList.map((c, cIdx) => {
                                const completed = isClassCompleted(s, c.name);
                                return (
                                  <React.Fragment key={c.name || cIdx}>
                                    {cIdx > 0 && <span className="text-slate-300 text-[9px]">➔</span>}
                                    <span className={`px-1.5 py-0.5 rounded text-[9px] font-black ${completed ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' : 'bg-slate-100 text-slate-400'}`}>
                                      {c.name}{completed ? ' ✓' : ''}
                                    </span>
                                  </React.Fragment>
                                );
                              })}
                              {isLulus && (
                                <>
                                  <span className="text-slate-300 text-[9px]">➔</span>
                                  <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-purple-100 text-purple-800 border border-purple-300">
                                    Lulus ✓
                                  </span>
                                </>
                              )}
                            </div>
                          );
                        })()}
                        <button
                          type="button"
                          onClick={() => setSelectedHistoryStudent(s)}
                          className="mt-1.5 inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 hover:text-indigo-900 border border-indigo-200 text-[10px] font-bold transition-all shadow-2xs group cursor-pointer"
                          title="Klik untuk membuka Tabel Riwayat Jenjang Kelas & Mutasi Siswa"
                        >
                          <Icon name="history" size={11} className="group-hover:rotate-45 transition-transform" />
                          <span>Riwayat Jenjang ({Array.isArray(s.classHistory) ? s.classHistory.length : 0})</span>
                        </button>
                      </td>
                      <td className="py-4 px-6">
                        <div className="font-black text-blue-700 text-sm sm:text-base">{formatRupiah(s.tarif)}</div>
                        {s.keringanan_note && (
                          <span className="inline-flex items-center gap-1 mt-1 px-2.5 py-0.5 bg-amber-100 text-amber-900 text-xs font-black rounded-lg border border-amber-200">
                            <Icon name="tag" size={12} /> {s.keringanan_note}
                          </span>
                        )}
                        {Number(s.arrearsAmount) > 0 && (
                          <div className="mt-1 px-2 py-0.5 bg-rose-50 text-rose-700 rounded-md text-[10px] font-black border border-rose-200 flex items-center gap-1" title={s.arrearsNote}>
                            <Icon name="alert-triangle" size={10} />
                            <span>Tunggakan Lama: {formatRupiah(s.arrearsAmount)}</span>
                          </div>
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

                          {/* KREDENSIAL PASSWORD AKUN WALI */}
                          <div className="flex items-center gap-1.5 py-0.5">
                            <span className="text-[10px] font-bold text-slate-400">Password:</span>
                            <span className="font-mono font-black text-xs text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200 select-all tracking-wider" title="Password login akun siswa (campuran huruf & angka)">
                              {s.password || (s.nis ? `Sb${s.nis}` : '-')}
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                const pwdToCopy = s.password || (s.nis ? `Sb${s.nis}` : '');
                                if (pwdToCopy) {
                                  navigator.clipboard.writeText(pwdToCopy);
                                  alert(`Password '${pwdToCopy}' untuk siswa ${s.name} berhasil disalin ke clipboard!`);
                                }
                              }}
                              className="p-1 text-slate-400 hover:text-blue-600 transition-colors"
                              title="Salin password ke clipboard"
                            >
                              <Icon name="copy" size={12} />
                            </button>
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
                        <div className="flex flex-col items-start gap-1.5">
                          {/* Tombol Modern Switch Toggle ON / OFF */}
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                const newStatus = !s.statusAktif;
                                const confirmMsg = newStatus
                                  ? `Aktifkan kembali akun siswa "${s.name}" (ON)?\n\n- Akses login portal dibuka kembali.\n- Siswa dapat login dengan NIS (${s.nis}) dan password.`
                                  : `Nonaktifkan akun siswa "${s.name}" (OFF - Keluar / Lulus)?\n\nSetelah dinonaktifkan (OFF):\n- Akses login portal DITUTUP!\n- Sesi aktif wali murid otomatis diakhiri.\n- Siswa tidak akan bisa login lagi ke portal.`;
                                if (confirm(confirmMsg)) {
                                  onUpdateStudent(s.id, {
                                    ...s,
                                    statusAktif: newStatus,
                                    status: newStatus ? 'Aktif' : 'Non-Aktif'
                                  });
                                }
                              }}
                              className={`relative inline-flex h-7 w-14 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none shadow-sm ${
                                s.statusAktif ? 'bg-emerald-600 shadow-emerald-500/25 ring-2 ring-emerald-500/20' : 'bg-slate-300 ring-2 ring-slate-400/20'
                              }`}
                              title={s.statusAktif ? 'Klik untuk mematikan akun (OFF: Keluar / Lulus)' : 'Klik untuk menyalakan akun (ON: Aktif)'}
                            >
                              <span
                                className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out flex items-center justify-center font-black text-[9px] ${
                                  s.statusAktif ? 'translate-x-7 text-emerald-700' : 'translate-x-0 text-slate-500'
                                }`}
                              >
                                {s.statusAktif ? 'ON' : 'OFF'}
                              </span>
                            </button>

                            <span className={`text-[11px] font-black px-2 py-0.5 rounded-lg border ${
                              s.statusAktif 
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-300' 
                                : 'bg-rose-50 text-rose-800 border-rose-300'
                            }`}>
                              {s.statusAktif ? 'ON (Aktif)' : 'OFF (Keluar/Lulus)'}
                            </span>
                          </div>

                          {s.statusAktif ? (
                            <span className="text-[10px] font-bold text-emerald-700 flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                              Bisa Login Portal
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold text-rose-600 flex items-center gap-1 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200">
                              <Icon name="lock" size={10} /> Akses Login Terkunci
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-4 px-6 text-center space-x-1.5 whitespace-nowrap">
                        <button 
                          type="button"
                          onClick={() => setSelectedBiodataStudent(s)} 
                          className="p-2.5 text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                          title="Lihat Kartu Biodata Murid Lengkap (Format Resmi)"
                        >
                          <Icon name="id-card" size={18} />
                        </button>
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
                  ))) : (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-400 font-medium">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <Icon name="search" size={28} className="text-slate-300" />
                          <p className="text-sm font-bold text-slate-600">Tidak ada murid yang cocok dengan pencarian</p>
                          <p className="text-xs text-slate-400">Coba ubah kata kunci pencarian atau reset filter kelas.</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 2: MATRIKS RIWAYAT & JENJANG KELAS (CHECKLIST) */}
        {viewTab === 'history' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* Stat Cards Jenjang Kelas Dinamis dari Pengaturan */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3.5 sm:gap-4">
              {classList.map((cls, cIdx) => {
                const count = students.filter(s => {
                  const isL = !s.statusAktif || (s.status || '').toLowerCase() === 'lulus' || (s.kelas || '').toLowerCase().includes('lulus');
                  return !isL && (s.kelas || '').trim().toLowerCase() === cls.name.trim().toLowerCase();
                }).length;
                const icons = ['baby', 'book-open', 'school', 'sparkles', 'graduation-cap'];
                const colors = [
                  { bg: 'bg-amber-50', text: 'text-amber-600', border: 'border-amber-200' },
                  { bg: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-200' },
                  { bg: 'bg-teal-50', text: 'text-teal-600', border: 'border-teal-200' },
                  { bg: 'bg-indigo-50', text: 'text-indigo-600', border: 'border-indigo-200' },
                  { bg: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-emerald-200' }
                ];
                const theme = colors[cIdx % colors.length];

                return (
                  <div key={cls.name || cIdx} className="bg-white p-4 sm:p-5 rounded-2xl sm:rounded-3xl border border-slate-200 shadow-sm flex items-center justify-between hover:shadow-md transition-all">
                    <div className="min-w-0 flex-1 pr-2">
                      <p className="text-[11px] sm:text-xs font-black uppercase text-slate-400 tracking-wider truncate">{cls.name}</p>
                      <p className="text-xl sm:text-2xl font-black text-slate-800 mt-1">
                        {count}
                        <span className="text-xs font-semibold text-slate-400 ml-1">Siswa</span>
                      </p>
                    </div>
                    <div className={`w-10 h-10 sm:w-11 sm:h-11 rounded-2xl ${theme.bg} ${theme.text} border ${theme.border} flex items-center justify-center font-black shadow-2xs shrink-0`}>
                      <Icon name={icons[cIdx % icons.length]} size={20} />
                    </div>
                  </div>
                );
              })}

              {/* Card Kelulusan / Alumni */}
              <div className="bg-white p-4 sm:p-5 rounded-2xl sm:rounded-3xl border border-purple-200 bg-purple-50/30 shadow-sm flex items-center justify-between hover:shadow-md transition-all">
                <div className="min-w-0 flex-1 pr-2">
                  <p className="text-[11px] sm:text-xs font-black uppercase text-purple-600 tracking-wider truncate">Lulus / Alumni</p>
                  <p className="text-xl sm:text-2xl font-black text-purple-900 mt-1">
                    {students.filter(isStudentLulus).length}
                    <span className="text-xs font-semibold text-purple-400 ml-1">Siswa</span>
                  </p>
                </div>
                <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-purple-100 text-purple-700 border border-purple-300 flex items-center justify-center font-black shadow-2xs shrink-0">
                  <Icon name="award" size={20} />
                </div>
              </div>
            </div>

            {/* Matriks Checklist Table */}
            <div className="pastel-table-card">
              <div className="p-4 sm:p-5 border-b border-slate-100 bg-amber-50/40 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div>
                  <h3 className="font-black text-slate-800 text-base flex items-center gap-2">
                    <span className="text-amber-500">📖</span>
                    <span>Matriks Riwayat & Jenjang Kelas Murid</span>
                  </h3>
                  <p className="text-xs text-slate-600 font-medium mt-0.5">
                    Kolom kelas mengikuti Pengaturan Aplikasi secara otomatis. Klik tombol checklist untuk menaikkan jenjang atau membatalkan secara realtime.
                  </p>
                </div>
                <div className="flex items-center gap-2 text-xs font-bold text-slate-700 bg-white px-3.5 py-1.5 rounded-2xl border border-amber-200 shadow-2xs">
                  <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                  <span>(✓) = Jenjang Terselesaikan / Sedang Aktif</span>
                </div>
              </div>

              <div className="overflow-x-auto p-3 sm:p-4">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="text-[11px] sm:text-xs font-black uppercase tracking-wider">
                      <th className="py-3.5 px-4 pastel-th-slate w-12 text-center rounded-l-2xl whitespace-nowrap">#</th>
                      <th className="py-3.5 px-4 pastel-th-orange whitespace-nowrap">Nama Murid & NIS</th>
                      <th className="py-3.5 px-4 pastel-th-yellow whitespace-nowrap">Kelas Saat Ini</th>
                      {classList.map((cls, cIdx) => (
                        <th key={cls.name || cIdx} className="py-3.5 px-4 text-center pastel-th-mint whitespace-nowrap">
                          {cls.name}
                        </th>
                      ))}
                      <th className="py-3.5 px-4 text-center pastel-th-teal whitespace-nowrap">Kelulusan (Lulus)</th>
                      <th className="py-3.5 px-4 pastel-th-coral whitespace-nowrap">Catatan Riwayat / Mutasi</th>
                      <th className="py-3.5 px-4 text-center pastel-th-blue rounded-r-2xl whitespace-nowrap">Aksi Cepat</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm font-medium">
                    {(() => {
                      const totalMatriksPages = Math.ceil(filteredStudents.length / MATRIKS_PER_PAGE) || 1;
                      const currentMatriksPage = Math.min(Math.max(1, matriksPage), totalMatriksPages);
                      const startIdx = (currentMatriksPage - 1) * MATRIKS_PER_PAGE;
                      const paginatedStudents = filteredStudents.slice(startIdx, startIdx + MATRIKS_PER_PAGE);

                      if (paginatedStudents.length === 0) {
                        return (
                          <tr>
                            <td colSpan={classList.length + 5} className="py-12 text-center text-slate-400 font-medium">
                              <div className="flex flex-col items-center justify-center gap-2">
                                <Icon name="search" size={28} className="text-slate-300" />
                                <p className="text-sm font-bold text-slate-600">Tidak ada murid yang sesuai dengan filter pencarian</p>
                                <p className="text-xs text-slate-400">Coba cari dengan nama murid atau NIS lain.</p>
                              </div>
                            </td>
                          </tr>
                        );
                      }

                      return paginatedStudents.map((s, localIdx) => {
                        const idx = startIdx + localIdx;
                        const isLulus = isStudentLulus(s);
                        return (
                          <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                          <td className="py-4 px-5 text-center text-xs font-black text-slate-400">
                            {idx + 1}
                          </td>
                          <td className="py-4 px-5">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-200 flex items-center justify-center font-black text-indigo-700 text-xs overflow-hidden shrink-0 shadow-2xs">
                                {s.fotoUrl ? (
                                  <img src={s.fotoUrl} alt={s.name} className="w-full h-full object-cover" />
                                ) : (
                                  <span>{s.name ? s.name.charAt(0).toUpperCase() : 'M'}</span>
                                )}
                              </div>
                              <div>
                                <h4 className="font-black text-slate-900 text-sm leading-tight hover:text-blue-600 transition-colors">
                                  {s.name}
                                </h4>
                                <div className="flex items-center gap-2 mt-0.5">
                                  <span className="text-[11px] font-bold text-slate-500">NIS: {s.nis}</span>
                                  <span className="text-[10px] text-slate-300">•</span>
                                  <span className="text-[11px] font-semibold text-slate-500">{s.jk === 'P' ? 'Perempuan' : 'Laki-laki'}</span>
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="py-4 px-5 whitespace-nowrap">
                            <span className="px-3 py-1 rounded-xl text-xs font-black bg-slate-100 text-slate-800 border border-slate-200 shadow-2xs">
                              {s.kelas || 'Belum Diatur'}
                            </span>
                            <div className="mt-1">
                              {isLulus ? (
                                <span className="inline-flex items-center gap-1 text-[11px] font-black text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full border border-purple-200">
                                  <Icon name="award" size={12} /> ALUMNI / LULUS
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-[11px] font-black text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span> AKTIF BELAJAR
                                </span>
                              )}
                            </div>
                          </td>

                          {/* CHECKLIST TIAP KELAS DINAMIS */}
                          {classList.map((cls, cIdx) => {
                            const isDone = isClassCompleted(s, cls.name);
                            return (
                              <td key={cls.name || cIdx} className="py-4 px-5 text-center bg-blue-50/10">
                                <button
                                  type="button"
                                  onClick={() => handleToggleLevel(s, cls.name)}
                                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-black text-xs transition-all shadow-2xs cursor-pointer active:scale-95 ${
                                    isDone
                                      ? 'bg-emerald-100 hover:bg-rose-100 text-emerald-800 hover:text-rose-700 border border-emerald-300 hover:border-rose-300 ring-2 ring-emerald-500/20'
                                      : 'bg-white hover:bg-emerald-50 text-slate-400 hover:text-emerald-700 border border-dashed border-slate-300 hover:border-emerald-400'
                                  }`}
                                  title={isDone ? `Jenjang ${cls.name} Aktif/Selesai (Klik untuk Batalkan)` : `Belum Ceklis (Klik untuk Naik/Ceklis ${cls.name})`}
                                >
                                  <Icon name={isDone ? "check" : "plus"} size={14} className={isDone ? "stroke-[3]" : ""} />
                                  <span>{isDone ? 'Ceklis (✓)' : '+ Ceklis'}</span>
                                </button>
                              </td>
                            );
                          })}

                          {/* CHECKLIST KELULUSAN */}
                          <td className="py-4 px-5 text-center bg-purple-50/20">
                            <button
                              type="button"
                              onClick={() => handleToggleLulus(s)}
                              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-black text-xs transition-all shadow-2xs cursor-pointer active:scale-95 ${
                                isLulus
                                  ? 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-rose-600 hover:to-red-600 text-white shadow-xs ring-2 ring-purple-500/30'
                                  : 'bg-slate-100 hover:bg-purple-50 text-slate-500 hover:text-purple-700 border border-dashed border-slate-300 hover:border-purple-400'
                              }`}
                              title={isLulus ? 'Sudah Lulus (Klik untuk Batalkan Kelulusan)' : 'Belum Lulus (Klik untuk Tandai Lulus/Alumni)'}
                            >
                              <Icon name={isLulus ? "award" : "plus"} size={14} />
                              <span>{isLulus ? 'LULUS (✓)' : 'Belum Lulus'}</span>
                            </button>
                          </td>

                          {/* CATATAN RIWAYAT / MUTASI (TAMPIL PAS DIKLIK BIAR GA GANGGU) */}
                          <td className="py-4 px-5">
                            <button
                              type="button"
                              onClick={() => setSelectedHistoryStudent(s)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 shadow-2xs hover:shadow-xs transition-all active:scale-95 group cursor-pointer"
                              title="Klik untuk membuka Tabel Riwayat Jenjang Kelas & Mutasi Siswa"
                            >
                              <Icon name="history" size={13} className="text-indigo-600 group-hover:rotate-45 transition-transform" />
                              <span>Lihat Riwayat ({Array.isArray(s.classHistory) ? s.classHistory.length : 0})</span>
                            </button>
                          </td>

                          {/* AKSI CEPAT */}
                          <td className="py-4 px-5 text-center whitespace-nowrap">
                            <div className="inline-flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => handleOpenPromotionModal(s)}
                                className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold rounded-xl text-xs transition-colors border border-indigo-200 flex items-center gap-1.5 shadow-2xs active:scale-95"
                                title="Kenaikan / Pindah Kelas Siswa"
                              >
                                <Icon name="arrow-up-right" size={14} />
                                <span>Naik Kelas</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => handleToggleLulus(s)}
                                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-2xs active:scale-95 ${
                                  isLulus
                                    ? 'bg-amber-100 hover:bg-amber-200 text-amber-800 border border-amber-300'
                                    : 'bg-purple-600 hover:bg-purple-700 text-white'
                                }`}
                                title={isLulus ? 'Batalkan status lulus dan aktifkan kembali' : 'Tandai siswa ini telah lulus dari PAUD'}
                              >
                                <Icon name={isLulus ? 'rotate-ccw' : 'award'} size={14} />
                                <span>{isLulus ? 'Batal Lulus' : 'Set Lulus'}</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    });
                  })()}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {filteredStudents.length > MATRIKS_PER_PAGE && (() => {
              const totalPages = Math.ceil(filteredStudents.length / MATRIKS_PER_PAGE) || 1;
              const currentMatriksPage = Math.min(Math.max(1, matriksPage), totalPages);
              const startIdx = (currentMatriksPage - 1) * MATRIKS_PER_PAGE;
              const endIdx = Math.min(startIdx + MATRIKS_PER_PAGE, filteredStudents.length);
              return (
                <div className="p-4 border-t border-slate-100 bg-slate-50/60 flex flex-col sm:flex-row items-center justify-between gap-3">
                  <p className="text-xs font-bold text-slate-500">
                    Menampilkan <span className="font-extrabold text-slate-800">{startIdx + 1} - {endIdx}</span> dari <span className="font-extrabold text-slate-800">{filteredStudents.length}</span> murid
                  </p>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <button
                      type="button"
                      disabled={currentMatriksPage <= 1}
                      onClick={() => setMatriksPage(p => Math.max(1, p - 1))}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                        currentMatriksPage <= 1
                          ? 'text-slate-300 bg-slate-100 cursor-not-allowed'
                          : 'text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 shadow-2xs cursor-pointer active:scale-95'
                      }`}
                    >
                      Prev
                    </button>
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(pageNum => (
                      <button
                        key={pageNum}
                        type="button"
                        onClick={() => setMatriksPage(pageNum)}
                        className={`min-w-[32px] h-8 px-2 rounded-xl text-xs font-black transition-all cursor-pointer active:scale-95 ${
                          currentMatriksPage === pageNum
                            ? 'bg-blue-600 text-white shadow-xs'
                            : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
                        }`}
                      >
                        {pageNum}
                      </button>
                    ))}
                    <button
                      type="button"
                      disabled={currentMatriksPage >= totalPages}
                      onClick={() => setMatriksPage(p => Math.min(totalPages, p + 1))}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                        currentMatriksPage >= totalPages
                          ? 'text-slate-300 bg-slate-100 cursor-not-allowed'
                          : 'text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 shadow-2xs cursor-pointer active:scale-95'
                      }`}
                    >
                      Next
                    </button>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
        )}

        {/* MODAL TABEL RIWAYAT JENJANG KELAS & MUTASI ROMBEL */}
        {selectedHistoryStudent && (() => {
          const existingHist = Array.isArray(selectedHistoryStudent.classHistory) ? selectedHistoryStudent.classHistory : [];
          const hasInitial = existingHist.some(h => {
            const t = (h.type || '').toLowerCase();
            return t.includes('pendaftaran') || t.includes('awal');
          });

          const initialRecord = {
            id: 'init_entry',
            type: 'Pendaftaran Awal',
            date: selectedHistoryStudent.createdAt ? new Date(selectedHistoryStudent.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : 'Awal Masuk',
            transferDate: selectedHistoryStudent.createdAt || '',
            fromClass: '-',
            toClass: existingHist.length > 0 ? (existingHist[0].fromClass || selectedHistoryStudent.kelas) : selectedHistoryStudent.kelas,
            effectiveMonth: selectedHistoryStudent.startActiveMonth || settings.startMonth || 'Januari',
            effectiveYear: selectedHistoryStudent.startActiveYear || settings.startYear || 2026,
            newTarif: selectedHistoryStudent.tarif,
            carriedOverArrears: 0,
            note: 'Pendaftaran pertama siswa di PAUD Setia Bhakti'
          };

          const fullHistoryList = hasInitial ? existingHist : [initialRecord, ...existingHist];

          const formatMutationDate = (h) => {
            if (h.transferDate) {
              try {
                const parts = String(h.transferDate).split('-');
                if (parts.length === 3) {
                  const d = parseInt(parts[2], 10);
                  const m = ALL_MONTHS[parseInt(parts[1], 10) - 1] || parts[1];
                  const y = parts[0];
                  return `${d} ${m} ${y}`;
                }
              } catch (e) {}
              return h.transferDate;
            }
            return h.date || h.academicYear || '-';
          };

          return (
            <div className="modal-portal-wrapper fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[9999] flex items-center justify-center p-3 sm:p-6 overflow-y-auto animate-in fade-in">
              <div className="modal-portal-card bg-white rounded-3xl max-w-4xl w-full p-5 sm:p-7 space-y-5 shadow-2xl animate-in zoom-in-95 duration-200 max-h-[92vh] sm:max-h-[90vh] flex flex-col border border-slate-200 m-auto relative">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                  <div className="flex items-center gap-3.5">
                    <div className="w-12 h-12 bg-gradient-to-tr from-indigo-600 to-blue-600 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
                      <Icon name="history" size={24} />
                    </div>
                    <div>
                      <h3 className="font-black text-slate-900 text-lg sm:text-xl">Tabel Riwayat Jenjang Kelas & Mutasi Rombel</h3>
                      <p className="text-xs sm:text-sm text-slate-500 font-bold mt-0.5">
                        {selectedHistoryStudent.name} • NIS: <span className="font-mono text-indigo-700">{selectedHistoryStudent.nis}</span>
                      </p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setSelectedHistoryStudent(null)} 
                    className="p-2.5 text-slate-400 hover:text-slate-700 font-black rounded-xl hover:bg-slate-100 transition-colors"
                    title="Tutup Modal"
                  >
                    <Icon name="x" size={20} />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto space-y-4 pr-1 text-xs">
                  {/* Status Overview Cards */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    <div className="p-3 bg-blue-50/80 border border-blue-200 rounded-2xl">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Rombel Terkini</span>
                      <span className="font-black text-slate-900 text-sm mt-0.5 block">{selectedHistoryStudent.kelas}</span>
                    </div>
                    <div className="p-3 bg-indigo-50/80 border border-indigo-200 rounded-2xl">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Tarif SPP Saat Ini</span>
                      <span className="font-black text-indigo-900 text-sm mt-0.5 block">{formatRupiah(selectedHistoryStudent.tarif)}/bln</span>
                    </div>
                    <div className="p-3 bg-emerald-50/80 border border-emerald-200 rounded-2xl">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Status Siswa</span>
                      <span className="font-black text-emerald-800 text-sm mt-0.5 block">
                        {isStudentLulus(selectedHistoryStudent) ? 'Alumni (Lulus)' : (selectedHistoryStudent.status || 'Aktif')}
                      </span>
                    </div>
                    <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-2xl">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Akumulasi Tunggakan</span>
                      <span className={`font-black text-sm mt-0.5 block ${Number(selectedHistoryStudent.arrearsAmount) > 0 ? 'text-rose-600' : 'text-emerald-700'}`}>
                        {formatRupiah(selectedHistoryStudent.arrearsAmount || 0)}
                      </span>
                    </div>
                  </div>

                  {/* Financial & Mutation Calculation Rule Banner */}
                  <div className="p-3.5 bg-gradient-to-r from-blue-50 via-sky-50 to-indigo-50 border border-blue-200 rounded-2xl flex items-start gap-3 shadow-2xs">
                    <Icon name="shield-check" size={18} className="text-blue-600 shrink-0 mt-0.5" />
                    <div className="text-[11px] text-blue-950 leading-relaxed space-y-1">
                      <p className="font-black text-blue-900 text-xs">Aturan Sistem Finansial & Mutasi Rombel:</p>
                      <p>
                        1. <strong>Perhitungan Tagihan Saat Pindah Rombel:</strong> Tagihan dihitung mulai dari bulan siswa masuk ke rombel baru. Bulan-bulan sebelum ia masuk <strong>TIDAK dihitung</strong> sebagai hutang atau tunggakan di rombel tersebut.
                      </p>
                      <p>
                        2. <strong>Status Tagihan & Jatuh Tempo:</strong> Tagihan bulan berjalan dan bulan ke depan berstatus <strong>"Belum Jatuh Tempo"</strong>. Tagihan baru dianggap <strong>"Menunggak"</strong> secara sistem jika sudah melewati bulan saat ini.
                      </p>
                    </div>
                  </div>

                  {/* TABEL RIWAYAT JENJANG KELAS */}
                  <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
                    <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                      <h4 className="font-black text-slate-800 text-xs uppercase tracking-wider flex items-center gap-2">
                        <Icon name="table" size={14} className="text-indigo-600" />
                        <span>Tabel Riwayat Mutasi & Jenjang Kelas ({fullHistoryList.length} Catatan)</span>
                      </h4>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="bg-slate-100/80 text-slate-600 font-black uppercase tracking-wider text-[10px] border-b border-slate-200">
                            <th className="py-3 px-3 text-center w-10">No</th>
                            <th className="py-3 px-3.5 whitespace-nowrap">Tanggal Pasti Pindah</th>
                            <th className="py-3 px-3.5 whitespace-nowrap">Jenis Mutasi</th>
                            <th className="py-3 px-4 whitespace-nowrap">Perubahan Rombel</th>
                            <th className="py-3 px-3.5 whitespace-nowrap">Mulai Efektif Tagihan</th>
                            <th className="py-3 px-3.5 whitespace-nowrap">Tarif SPP Baru</th>
                            <th className="py-3 px-3.5 whitespace-nowrap">Tunggakan Terbawa</th>
                            <th className="py-3 px-4">Catatan Mutasi</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-medium">
                          {fullHistoryList.map((h, idx) => {
                            const isPendaftaran = (h.type || '').toLowerCase().includes('pendaftaran') || (h.type || '').toLowerCase().includes('awal');
                            const isPindah = (h.type || '').toLowerCase().includes('pindah');
                            const isLulus = (h.type || '').toLowerCase().includes('lulus') || (h.type || '').toLowerCase().includes('keluar');

                            return (
                              <tr key={h.id || idx} className="hover:bg-slate-50/80 transition-colors">
                                <td className="py-3 px-3 text-center font-bold text-slate-400 text-[11px]">{idx + 1}</td>
                                <td className="py-3 px-3.5 whitespace-nowrap font-bold text-slate-800">
                                  {formatMutationDate(h)}
                                </td>
                                <td className="py-3 px-3.5 whitespace-nowrap">
                                  <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black ${
                                    isPendaftaran
                                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                      : isPindah
                                        ? 'bg-indigo-100 text-indigo-800 border border-indigo-200'
                                        : isLulus
                                          ? 'bg-purple-100 text-purple-800 border border-purple-200'
                                          : 'bg-blue-100 text-blue-800 border border-blue-200'
                                  }`}>
                                    {h.type || 'Mutasi Rombel'}
                                  </span>
                                </td>
                                <td className="py-3 px-4 whitespace-nowrap font-black text-slate-800">
                                  <div className="flex items-center gap-1.5">
                                    <span className="px-2 py-0.5 bg-slate-100 border border-slate-200 rounded-md text-[11px] text-slate-700">
                                      {h.fromClass || '-'}
                                    </span>
                                    <span className="text-indigo-600 font-bold">➔</span>
                                    <span className="px-2 py-0.5 bg-emerald-50 border border-emerald-200 rounded-md text-[11px] text-emerald-900 font-black">
                                      {h.toClass || '-'}
                                    </span>
                                  </div>
                                </td>
                                <td className="py-3 px-3.5 whitespace-nowrap">
                                  <div className="font-black text-indigo-950">
                                    {h.effectiveMonth || '-'} {h.effectiveYear || ''}
                                  </div>
                                  <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-100 block w-fit mt-0.5">
                                    Bulan sebelum masuk bersih
                                  </span>
                                </td>
                                <td className="py-3 px-3.5 whitespace-nowrap font-black text-blue-700 font-mono">
                                  {h.newTarif ? formatRupiah(h.newTarif) : '-'}
                                </td>
                                <td className="py-3 px-3.5 whitespace-nowrap">
                                  {Number(h.carriedOverArrears) > 0 ? (
                                    <span className="font-bold text-rose-600 font-mono">
                                      {formatRupiah(h.carriedOverArrears)}
                                    </span>
                                  ) : (
                                    <span className="text-emerald-700 font-bold">Rp 0 (Bersih)</span>
                                  )}
                                </td>
                                <td className="py-3 px-4 text-slate-600 text-[11px] max-w-xs">
                                  {h.note || '-'}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

                {/* Footer Buttons */}
                <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-2.5">
                  <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                    <button
                      type="button"
                      onClick={() => {
                        const studentTarget = selectedHistoryStudent;
                        setSelectedHistoryStudent(null);
                        handleOpenPromotionModal(studentTarget);
                      }}
                      className="w-full sm:w-auto px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-black rounded-xl text-xs flex items-center justify-center gap-2 shadow-md shadow-blue-500/25 active:scale-95 transition-all"
                    >
                      <Icon name="shuffle" size={15} />
                      <span>Pindah / Mutasi Rombel Siswa Ini</span>
                    </button>

                    {existingHist.length > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          const lastRec = existingHist[existingHist.length - 1];
                          const prevCls = lastRec.fromClass || lastRec.previousClass || '';
                          if (!prevCls) {
                            alert('Tidak dapat mendeteksi kelas sebelumnya dari riwayat mutasi.');
                            return;
                          }
                          if (!confirm(`Batalkan kenaikan/mutasi terakhir dan kembalikan ananda ${selectedHistoryStudent.name} ke kelas "${prevCls}"?\n\nTunggakan bawaan kelas sebelumnya akan otomatis direset menjadi Rp 0.`)) {
                            return;
                          }
                          const updatedHist = [...existingHist, {
                            id: Date.now(),
                            type: 'Pembatalan Kenaikan (Revert)',
                            fromClass: selectedHistoryStudent.kelas,
                            toClass: prevCls,
                            date: new Date().toLocaleDateString('id-ID'),
                            note: `Admin membatalkan kenaikan kelas dan mengembalikan siswa ke ${prevCls}`
                          }];
                          const matchCls = (settings?.customClasses || []).find(c => c.name === prevCls);
                          const revertedTarif = lastRec.previousTarif || (matchCls ? matchCls.tarif : selectedHistoryStudent.tarif);
                          const reverted = {
                            ...selectedHistoryStudent,
                            kelas: prevCls,
                            tarif: revertedTarif,
                            arrearsAmount: 0,
                            arrearsNote: '',
                            classHistory: updatedHist
                          };
                          onUpdateStudent(selectedHistoryStudent.id, reverted);
                          setSelectedHistoryStudent(null);
                          if (typeof showToast === 'function') {
                            showToast("Kenaikan Dibatalkan", `${selectedHistoryStudent.name} dikembalikan ke ${prevCls} dan tunggakan bawaan direset ke Rp 0.`, "success");
                          }
                        }}
                        className="w-full sm:w-auto px-4 py-2.5 bg-amber-500 hover:bg-amber-600 active:scale-95 text-white font-black rounded-xl text-xs flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
                        title="Batalkan kenaikan terakhir jika salah klik dan kembalikan ke kelas sebelumnya"
                      >
                        <Icon name="rotate-ccw" size={15} />
                        <span>Batal Kenaikan & Kembalikan Kelas</span>
                      </button>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => setSelectedHistoryStudent(null)}
                    className="w-full sm:w-auto px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-colors"
                  >
                    Tutup
                  </button>
                </div>
              </div>
            </div>
          );
        })()}

        {showModal && (
            <div className="modal-portal-wrapper fixed inset-0 bg-slate-950/75 backdrop-blur-md z-[9999] flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
              <div className="modal-portal-card bg-white rounded-3xl max-w-3xl w-full m-auto shadow-2xl overflow-hidden flex flex-col max-h-[90vh] sm:max-h-[88vh] border border-slate-200 animate-in zoom-in-95 duration-200 relative">
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
                            const matchCls = classList.find(c => c.name === k);
                            let t = matchCls ? matchCls.tarif : 0;
                            setFormData(prev => ({ ...prev, kelas: k, tarif: isKeringanan ? prev.tarif : t }));
                          }}
                          className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl font-black text-slate-900 focus:ring-2 focus:ring-blue-500"
                        >
                          {classList.map(cls => (
                            <option key={cls.name} value={cls.name}>{cls.name} (Tarif: {formatRupiah(cls.tarif)})</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-blue-50/70 p-4 rounded-xl border border-blue-200">
                      <div>
                        <label className="block font-black text-blue-900 uppercase mb-1 flex items-center gap-1.5">
                          <Icon name="calendar" size={13} className="text-blue-600" />
                          Bulan Mulai Aktif / Masuk *
                        </label>
                        <select
                          value={formData.startActiveMonth || settings.startMonth || 'Januari'}
                          onChange={(e) => setFormData({ ...formData, startActiveMonth: e.target.value })}
                          className="w-full px-3.5 py-2.5 bg-white border border-blue-200 rounded-xl font-bold text-slate-900 focus:ring-2 focus:ring-blue-500"
                        >
                          {ALL_MONTHS.map(m => (
                            <option key={m} value={m}>{m}</option>
                          ))}
                        </select>
                        <p className="text-[10px] text-blue-700 font-semibold mt-1">
                          Tagihan SPP & tunggakan hanya dihitung mulai dari bulan ini.
                        </p>
                      </div>
                      <div>
                        <label className="block font-black text-blue-900 uppercase mb-1 flex items-center gap-1.5">
                          <Icon name="clock" size={13} className="text-blue-600" />
                          Tahun Mulai Aktif *
                        </label>
                        <input
                          type="number"
                          value={formData.startActiveYear || (settings.startYear ? Number(settings.startYear) : new Date().getFullYear())}
                          onChange={(e) => setFormData({ ...formData, startActiveYear: parseInt(e.target.value, 10) || new Date().getFullYear() })}
                          className="w-full px-3.5 py-2.5 bg-white border border-blue-200 rounded-xl font-bold text-slate-900 focus:ring-2 focus:ring-blue-500"
                        />
                        <p className="text-[10px] text-blue-700 font-semibold mt-1">
                          Tahun ajaran masuk siswa (contoh: 2026).
                        </p>
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
                        <label className="block font-black text-slate-700 uppercase mb-1">
                          Jenis Kelamin (JK) <span className="text-rose-500">*</span>
                        </label>
                        <select
                          required
                          value={formData.jk || 'L'}
                          onChange={(e) => setFormData({ ...formData, jk: e.target.value })}
                          className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500"
                        >
                          <option value="L">L - Laki-laki</option>
                          <option value="P">P - Perempuan</option>
                        </select>
                      </div>

                      <div>
                        <label className="block font-black text-slate-700 uppercase mb-1">
                          NIK Siswa / No. KTP <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="Nomor Induk Kependudukan (16 Digit)"
                          value={formData.nik || ''}
                          onChange={(e) => setFormData({ ...formData, nik: e.target.value })}
                          className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>

                      <div>
                        <label className="block font-black text-slate-700 uppercase mb-1">
                          Agama <span className="text-rose-500">*</span>
                        </label>
                        <select
                          required
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
                        <label className="block font-black text-slate-700 uppercase mb-1">
                          Tempat Lahir <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="Kota / Kabupaten Tempat Lahir"
                          value={formData.tempatLahir || ''}
                          onChange={(e) => setFormData({ ...formData, tempatLahir: e.target.value })}
                          className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>

                      <div>
                        <label className="block font-black text-slate-700 uppercase mb-1">
                          Tanggal Lahir <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="date"
                          required
                          value={formData.tanggalLahir || ''}
                          onChange={(e) => setFormData({ ...formData, tanggalLahir: e.target.value })}
                          className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div className="md:col-span-2">
                        <label className="block font-black text-slate-700 uppercase mb-1">
                          Alamat Tempat Tinggal <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="Dusun / Jalan / Perumahan"
                          value={formData.alamat || ''}
                          onChange={(e) => setFormData({ ...formData, alamat: e.target.value })}
                          className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                      <div>
                        <label className="block font-black text-slate-700 uppercase mb-1">
                          RT <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="Contoh: 05"
                          value={formData.rt || ''}
                          onChange={(e) => setFormData({ ...formData, rt: e.target.value })}
                          className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                      <div>
                        <label className="block font-black text-slate-700 uppercase mb-1">
                          RW <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="text"
                          required
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
                    const standardTarif = matchCls ? matchCls.tarif : 0;
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

                  {/* STATUS TUNGGAKAN BAWAAN KELAS SEBELUMNYA */}
                  {Number(formData.arrearsAmount) > 0 && (
                    <div className="bg-rose-50/80 p-4 rounded-2xl border border-rose-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-in fade-in">
                      <div>
                        <span className="text-[10px] font-black uppercase text-rose-800 tracking-wider flex items-center gap-1.5">
                          <Icon name="alert-triangle" size={13} className="text-rose-600" />
                          Tunggakan Bawaan Kelas Sebelumnya
                        </span>
                        <p className="text-sm font-black text-rose-700 mt-0.5">
                          {formatRupiah(formData.arrearsAmount)}
                        </p>
                        {formData.arrearsNote && (
                          <p className="text-[11px] font-semibold text-slate-600 mt-0.5">{formData.arrearsNote}</p>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setFormData(prev => ({ ...prev, arrearsAmount: 0, arrearsNote: '' }));
                        }}
                        className="px-3.5 py-2 bg-rose-600 hover:bg-rose-700 active:scale-95 text-white font-bold text-xs rounded-xl transition-all shadow-xs shrink-0 flex items-center gap-1.5 cursor-pointer"
                        title="Hapus tunggakan bawaan jika salah klik mutasi/kenaikan kelas"
                      >
                        <Icon name="trash-2" size={14} />
                        <span>Hapus / Reset Tunggakan Bawaan (Rp 0)</span>
                      </button>
                    </div>
                  )}

                  {/* SECTION 4: DATA WALI & KREDENSIAL */}
                  <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-4">
                    <h4 className="font-black text-emerald-900 uppercase tracking-wider text-xs flex items-center gap-2">
                      <Icon name="phone-call" size={16} className="text-emerald-600" />
                      4. Data Orang Tua / Wali Murid & Login WA
                    </h4>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block font-black text-slate-700 uppercase mb-1">
                          Nama Orang Tua / Wali Murid <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="Nama Ayah / Ibu / Wali"
                          value={formData.wali}
                          onChange={(e) => setFormData({ ...formData, wali: e.target.value })}
                          className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500"
                        />
                      </div>

                      <div>
                        <label className="block font-black text-slate-700 uppercase mb-1">
                          No. WhatsApp Wali Murid <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="Contoh: 081234567890"
                          value={formData.telepon}
                          onChange={(e) => setFormData({ ...formData, telepon: e.target.value })}
                          className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500"
                        />
                      </div>
                    </div>

                    {!editingStudent ? (
                      <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl space-y-3">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-sm shrink-0">
                              <Icon name="shield-check" size={16} />
                            </div>
                            <div>
                              <h5 className="font-black text-blue-900 text-xs uppercase tracking-wide">Password Default Sistem (Kombinasi Angka & Huruf)</h5>
                              <p className="text-[11px] text-blue-700 font-medium">Otomatis digenerate by sistem seaman mungkin.</p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              const newGen = generateDefaultStudentPassword();
                              setFormData(prev => ({ ...prev, password: newGen }));
                            }}
                            className="px-2.5 py-1.5 bg-white hover:bg-blue-100 text-blue-700 rounded-lg border border-blue-200 text-xs font-bold transition-all flex items-center gap-1 shadow-sm active:scale-95 shrink-0"
                            title="Generate ulang password default"
                          >
                            <Icon name="refresh-cw" size={12} />
                            <span>Acak Ulang</span>
                          </button>
                        </div>
                        <div className="flex items-center gap-2 bg-white px-3.5 py-2.5 rounded-xl border border-blue-200 shadow-inner">
                          <span className="text-xs text-slate-400 font-bold">Password Akun:</span>
                          <span className="font-mono font-black text-sm text-blue-700 tracking-widest flex-1 select-all">{formData.password || '...'}</span>
                          <button
                            type="button"
                            onClick={() => {
                              if (formData.password) {
                                navigator.clipboard.writeText(formData.password);
                                alert(`Password '${formData.password}' berhasil disalin ke clipboard!`);
                              }
                            }}
                            className="p-1.5 text-slate-400 hover:text-blue-600 transition-colors"
                            title="Salin password ke clipboard"
                          >
                            <Icon name="copy" size={15} />
                          </button>
                        </div>
                        <p className="text-[10.5px] text-blue-600 font-medium leading-relaxed">
                          * Sistem telah otomatis membuat password aman campuran huruf dan angka di atas. Password ini akan tersimpan di database dan otomatis terkirim saat klik "Kirim Info Login" WhatsApp ke wali murid. Wali murid juga dapat menggantinya sendiri di portal mereka.
                        </p>
                      </div>
                    ) : (
                      <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div>
                            <span className="block font-black text-slate-700 uppercase text-xs tracking-wide">Password Akun Wali Murid</span>
                            <div className="flex items-center gap-2 mt-1.5">
                              <span className="font-mono font-black text-sm bg-white px-3 py-1 rounded-xl border border-slate-300 text-blue-700 tracking-widest select-all shadow-inner">
                                {formData.password || (formData.nis ? `Sb${formData.nis}` : '-')}
                              </span>
                              <button
                                type="button"
                                onClick={() => {
                                  const pwdToCopy = formData.password || (formData.nis ? `Sb${formData.nis}` : '');
                                  if (pwdToCopy) {
                                    navigator.clipboard.writeText(pwdToCopy);
                                    alert(`Password '${pwdToCopy}' disalin ke clipboard!`);
                                  }
                                }}
                                className="p-1.5 bg-white text-slate-500 hover:text-blue-600 rounded-lg border border-slate-200 transition-colors shadow-sm"
                                title="Salin password"
                              >
                                <Icon name="copy" size={14} />
                              </button>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                const defPwd = formData.nis ? `Sb${formData.nis}` : '123456';
                                setFormData(prev => ({ ...prev, password: defPwd }));
                                alert(`Password diset ke Default Sistem: ${defPwd}.\n\nSetelah klik 'Simpan Data Siswa', password lama tidak berlaku lagi dan wali murid harus masuk menggunakan password default ini.`);
                              }}
                              className="px-3 py-2 bg-amber-50 hover:bg-amber-100 text-amber-800 rounded-xl text-xs font-black border border-amber-300 shadow-sm transition-all flex items-center gap-1.5 shrink-0 active:scale-95"
                              title="Kembalikan ke password default sistem (Sb[NIS])"
                            >
                              <Icon name="rotate-ccw" size={14} />
                              <span>Reset ke Default</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                const newGen = generateDefaultStudentPassword();
                                setFormData(prev => ({ ...prev, password: newGen }));
                                alert(`Password baru campuran huruf & angka di-generate: ${newGen}. Klik 'Simpan Data Siswa' untuk menyimpan ke database.`);
                              }}
                              className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black shadow-md shadow-blue-500/20 transition-all flex items-center gap-1.5 shrink-0 active:scale-95"
                              title="Generate password acak baru kombinasi angka & huruf"
                            >
                              <Icon name="refresh-cw" size={14} />
                              <span>Acak Baru</span>
                            </button>
                          </div>
                        </div>

                        <div className="pt-2 border-t border-slate-200">
                          <label className="block text-[11px] font-bold text-slate-600 mb-1">
                            Atur Manual Password (Atau kosongkan untuk menggunakan default Sb[NIS]):
                          </label>
                          <input
                            type="text"
                            placeholder="Ketik password baru jika ingin manual"
                            value={formData.password || ''}
                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                            className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* SECTION 5: STATUS AKUN SISWA & IZIN LOGIN (TOMBOL ON / OFF) */}
                  <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="space-y-0.5">
                        <h4 className="font-black text-slate-800 uppercase tracking-wider text-xs flex items-center gap-2">
                          <Icon name="power" size={16} className={formData.statusAktif ? "text-emerald-600" : "text-rose-600"} />
                          5. Status Akun Siswa & Izin Login (ON / OFF)
                        </h4>
                        <p className="text-[11px] text-slate-500 font-medium leading-relaxed">
                          {formData.statusAktif 
                            ? "Akun AKTIF (ON) — Siswa & wali murid dapat login menggunakan NIS dan password." 
                            : "Akun NON-AKTIF / KELUAR / LULUS (OFF) — Akses login portal ditutup total dan sesi login dinonaktifkan."}
                        </p>
                      </div>

                      {/* Tombol Modern Switch Toggle ON / OFF */}
                      <div className="flex items-center gap-2.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            const nextStatus = !formData.statusAktif;
                            setFormData(prev => ({
                              ...prev,
                              statusAktif: nextStatus,
                              status: nextStatus ? 'Aktif' : 'Non-Aktif'
                            }));
                          }}
                          className={`relative inline-flex h-8 w-16 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none shadow-sm ${
                            formData.statusAktif ? 'bg-emerald-600 ring-2 ring-emerald-500/20' : 'bg-slate-300 ring-2 ring-slate-400/20'
                          }`}
                          title="Klik untuk mengubah status ON / OFF"
                        >
                          <span
                            className={`pointer-events-none inline-block h-7 w-7 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out flex items-center justify-center font-black text-[10px] ${
                              formData.statusAktif ? 'translate-x-8 text-emerald-700' : 'translate-x-0 text-slate-500'
                            }`}
                          >
                            {formData.statusAktif ? 'ON' : 'OFF'}
                          </span>
                        </button>
                        <span className={`text-xs font-black px-2.5 py-1 rounded-xl border ${
                          formData.statusAktif 
                            ? 'bg-emerald-100 text-emerald-800 border-emerald-300' 
                            : 'bg-rose-100 text-rose-800 border-rose-300'
                        }`}>
                          {formData.statusAktif ? 'ON (Aktif)' : 'OFF (Keluar/Lulus)'}
                        </span>
                      </div>
                    </div>

                    {!formData.statusAktif && (
                      <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-[11px] font-bold flex items-center gap-2">
                        <Icon name="lock" size={15} className="text-rose-600 shrink-0" />
                        <span>Perhatian: Akun yang diatur ke status OFF tidak akan bisa login ke portal wali murid sama sekali.</span>
                      </div>
                    )}
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
            <div className="modal-portal-wrapper fixed inset-0 bg-slate-950/75 backdrop-blur-md z-[9999] flex items-center justify-center p-3 sm:p-6 overflow-y-auto animate-in fade-in">
              <div className="modal-portal-card bg-white rounded-3xl max-w-lg w-full p-5 sm:p-7 space-y-5 shadow-2xl animate-in zoom-in-95 duration-200 max-h-[90vh] sm:max-h-[88vh] flex flex-col border border-slate-200 m-auto relative">
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
            <div className="modal-portal-wrapper fixed inset-0 bg-slate-950/75 backdrop-blur-md z-[9999] flex items-center justify-center p-3 sm:p-6 overflow-y-auto animate-in fade-in">
              <div className="modal-portal-card bg-white rounded-3xl max-w-lg w-full p-5 sm:p-7 space-y-5 shadow-2xl animate-in zoom-in-95 duration-200 max-h-[90vh] sm:max-h-[88vh] flex flex-col border border-slate-200 m-auto relative">
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
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          const target = (promotionForm.targetClass && !promotionForm.targetClass.includes('Alumni') && !promotionForm.targetClass.includes('Keluar'))
                            ? promotionForm.targetClass
                            : (classList.find(c => c.name !== promotionStudent.kelas)?.name || classList[0]?.name || '');
                          const matchCls = classList.find(c => c.name === target);
                          setPromotionForm(prev => ({
                            ...prev,
                            type: 'naik',
                            targetClass: target,
                            targetTarif: prev.keepExistingDiscount ? prev.targetTarif : (matchCls ? matchCls.tarif : prev.targetTarif),
                            note: `Kenaikan kelas dari ${promotionStudent.kelas} ke ${target} (TA ${prev.academicYear || settings.academicYear || ''})`
                          }));
                        }}
                        className={`p-2.5 sm:p-3 rounded-2xl border font-bold flex flex-col sm:flex-row items-center gap-1.5 sm:gap-2 transition-all ${
                          promotionForm.type === 'naik'
                            ? 'bg-blue-50 border-blue-400 text-blue-800 shadow-xs ring-2 ring-blue-500/20'
                            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        <Icon name="arrow-up-circle" size={17} className={promotionForm.type === 'naik' ? 'text-blue-600' : 'text-slate-400'} />
                        <div className="text-center sm:text-left">
                          <p className="text-xs font-black">Naik Kelas</p>
                          <p className="text-[9px] text-slate-500 font-normal">Tahun Ajaran Baru</p>
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          const target = (promotionForm.targetClass && !promotionForm.targetClass.includes('Alumni') && !promotionForm.targetClass.includes('Keluar'))
                            ? promotionForm.targetClass
                            : (classList.find(c => c.name !== promotionStudent.kelas)?.name || classList[0]?.name || '');
                          const matchCls = classList.find(c => c.name === target);
                          setPromotionForm(prev => ({
                            ...prev,
                            type: 'pindah',
                            targetClass: target,
                            targetTarif: prev.keepExistingDiscount ? prev.targetTarif : (matchCls ? matchCls.tarif : prev.targetTarif),
                            note: `Pindah rombel dari ${promotionStudent.kelas} ke ${target}`
                          }));
                        }}
                        className={`p-2.5 sm:p-3 rounded-2xl border font-bold flex flex-col sm:flex-row items-center gap-1.5 sm:gap-2 transition-all ${
                          promotionForm.type === 'pindah'
                            ? 'bg-indigo-50 border-indigo-400 text-indigo-800 shadow-xs ring-2 ring-indigo-500/20'
                            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        <Icon name="shuffle" size={17} className={promotionForm.type === 'pindah' ? 'text-indigo-600' : 'text-slate-400'} />
                        <div className="text-center sm:text-left">
                          <p className="text-xs font-black">Pindah Rombel</p>
                          <p className="text-[9px] text-slate-500 font-normal">Mutasi Rombel</p>
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => setPromotionForm(prev => ({ 
                          ...prev, 
                          type: 'keluar',
                          targetClass: 'Alumni (Lulus)',
                          targetTarif: 0,
                          note: `Kelulusan / Keluar dari ${promotionStudent.kelas}`
                        }))}
                        className={`p-2.5 sm:p-3 rounded-2xl border font-bold flex flex-col sm:flex-row items-center gap-1.5 sm:gap-2 transition-all ${
                          promotionForm.type === 'keluar'
                            ? 'bg-purple-50 border-purple-400 text-purple-900 shadow-xs ring-2 ring-purple-500/20'
                            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        <Icon name="award" size={17} className={promotionForm.type === 'keluar' ? 'text-purple-600' : 'text-slate-400'} />
                        <div className="text-center sm:text-left">
                          <p className="text-xs font-black">Lulus / Keluar</p>
                          <p className="text-[9px] text-slate-500 font-normal">Set Akun OFF</p>
                        </div>
                      </button>
                    </div>
                  </div>

                  {/* Destination Class / Status Selector */}
                  {promotionForm.type === 'keluar' ? (
                    <div className="space-y-3">
                      <div>
                        <label className="block font-black text-slate-700 uppercase tracking-wider text-[11px] mb-1.5">
                          Status Kelulusan / Keluar Siswa
                        </label>
                        <select
                          required
                          value={promotionForm.targetClass}
                          onChange={(e) => {
                            const val = e.target.value;
                            setPromotionForm(prev => ({
                              ...prev,
                              targetClass: val,
                              targetTarif: 0,
                              note: `Status ${val} dari ${promotionStudent.kelas}`
                            }));
                          }}
                          className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl font-black text-slate-900 focus:bg-white focus:ring-2 focus:ring-purple-500 text-sm"
                        >
                          <option value="Alumni (Lulus)">Alumni (Lulus / Tamat PAUD)</option>
                          <option value="Keluar / Pindah Sekolah">Keluar / Pindah Sekolah</option>
                          <option value="Non-Aktif (Berhenti)">Non-Aktif (Berhenti)</option>
                        </select>
                      </div>

                      <div className="p-3.5 bg-purple-50 border border-purple-200 rounded-2xl flex items-start gap-3">
                        <Icon name="lock" size={18} className="text-purple-700 shrink-0 mt-0.5" />
                        <div className="text-[11px] text-purple-900 leading-relaxed">
                          <p className="font-black">Otomatis Tutup Akses Login Portal (Status OFF):</p>
                          <p className="font-medium text-purple-800 mt-0.5">
                            Siswa yang dinyatakan Lulus atau Keluar akan otomatis dinonaktifkan (OFF). Sesi login wali murid langsung diakhiri dan akun tidak dapat digunakan lagi untuk login.
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <label className="block font-black text-slate-700 uppercase tracking-wider text-[11px] mb-1.5">
                        Pindah / Naik ke Kelas Tujuan
                      </label>
                      <select
                        required
                        value={promotionForm.targetClass}
                        onChange={(e) => {
                          const target = e.target.value;
                          const matchCls = classList.find(c => c.name === target);
                          const stdTarif = matchCls ? matchCls.tarif : 0;
                          const autoNote = promotionForm.type === 'naik'
                            ? `Kenaikan kelas dari ${promotionStudent.kelas} ke ${target} (TA ${promotionForm.academicYear || settings.academicYear || ''})`
                            : `Pindah rombel dari ${promotionStudent.kelas} ke ${target}`;
                          setPromotionForm(prev => ({
                            ...prev,
                            targetClass: target,
                            targetTarif: prev.keepExistingDiscount ? prev.targetTarif : stdTarif,
                            note: autoNote
                          }));
                        }}
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl font-black text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500 text-sm"
                      >
                        <option value="">-- Pilih Kelas Tujuan --</option>
                        {classList.map(c => (
                          <option key={c.name} value={c.name} disabled={c.name === promotionStudent.kelas}>
                            {c.name} {c.name === promotionStudent.kelas ? '(Kelas Saat Ini)' : `(Tarif: ${formatRupiah(c.tarif)}/bln)`}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* New SPP Tariff - Only if not keluar */}
                  {promotionForm.type !== 'keluar' && (
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
                  )}

                  {/* Tanggal Pindah Rombel & Bulan Mulai Efektif Masuk - TAMPIL HANYA JIKA PINDAH ROMBEL */}
                  {promotionForm.type === 'pindah' && (
                    <>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <label className="block font-black text-slate-700 uppercase tracking-wider text-[11px] mb-1.5">
                            Tanggal Pasti Pindah Rombel
                          </label>
                          <input
                            type="date"
                            required={promotionForm.type === 'pindah'}
                            value={promotionForm.transferDate || ''}
                            onChange={(e) => setPromotionForm(prev => ({ ...prev, transferDate: e.target.value }))}
                            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500 text-sm"
                          />
                        </div>

                        <div>
                          <label className="block font-black text-slate-700 uppercase tracking-wider text-[11px] mb-1.5">
                            Mulai Efektif di Rombel Baru
                          </label>
                          <select
                            value={promotionForm.effectiveMonth || 'Januari'}
                            onChange={(e) => setPromotionForm(prev => ({ ...prev, effectiveMonth: e.target.value }))}
                            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl font-black text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500 text-sm"
                          >
                            {ALL_MONTHS.map(m => (
                              <option key={m} value={m}>{m}</option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block font-black text-slate-700 uppercase tracking-wider text-[11px] mb-1.5">
                            Tahun Kalender Efektif
                          </label>
                          <input
                            type="number"
                            value={promotionForm.effectiveYear || new Date().getFullYear()}
                            onChange={(e) => setPromotionForm(prev => ({ ...prev, effectiveYear: parseInt(e.target.value, 10) || new Date().getFullYear() }))}
                            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl font-black text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500 text-sm"
                          />
                        </div>
                      </div>

                      {/* Penjelasan Perhitungan Keuangan & Tunggakan Saat Pindah Rombel */}
                      <div className="p-3.5 bg-gradient-to-r from-blue-50 to-indigo-50/70 border border-blue-200 rounded-2xl flex items-start gap-3 shadow-2xs">
                        <Icon name="info" size={18} className="text-blue-600 shrink-0 mt-0.5" />
                        <div className="text-xs text-blue-950 leading-relaxed">
                          <p className="font-black text-blue-900">Perhitungan Tagihan & Tunggakan Saat Pindah Rombel:</p>
                          <ul className="text-[11px] text-blue-800 mt-1 space-y-1 list-disc list-inside">
                            <li>Tagihan siswa dihitung mulai dari bulan ia masuk (<strong>{promotionForm.effectiveMonth} {promotionForm.effectiveYear}</strong> dan seterusnya).</li>
                            <li>Bulan sebelum ia masuk ke rombel ini <strong>TIDAK dihitung</strong> sebagai hutang atau tunggakan.</li>
                            <li>Tagihan untuk bulan berjalan dan bulan ke depannya berstatus <strong>"Belum Jatuh Tempo"</strong>. Status hanya dianggap menunggak jika sudah melewati bulan saat ini.</li>
                          </ul>
                        </div>
                      </div>
                    </>
                  )}

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
                        Catatan Mutasi / Kenaikan
                      </label>
                      <input
                        type="text"
                        value={promotionForm.note}
                        onChange={(e) => setPromotionForm(prev => ({ ...prev, note: e.target.value }))}
                        placeholder="Contoh: Pindah rombel / mutasi kelas"
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  {/* Kotak Akumulasi Tunggakan Kelas Sebelumnya */}
                  <div className={`p-4 rounded-2xl border transition-all ${
                    promotionForm.totalAccumulated > 0
                      ? 'bg-amber-50/90 border-amber-300 text-amber-950'
                      : 'bg-emerald-50/90 border-emerald-200 text-emerald-950'
                  }`}>
                    <div className="flex items-start gap-2.5">
                      <Icon 
                        name={promotionForm.totalAccumulated > 0 ? "alert-triangle" : "check-circle"} 
                        size={18} 
                        className={`shrink-0 mt-0.5 ${promotionForm.totalAccumulated > 0 ? 'text-amber-600' : 'text-emerald-600'}`} 
                      />
                      <div className="flex-1">
                        <p className="font-black text-xs">
                          {promotionForm.totalAccumulated > 0 
                            ? `Terdapat Tagihan / Tunggakan di ${promotionStudent.kelas}`
                            : `Tagihan Bersih: Tidak Ada Tunggakan di ${promotionStudent.kelas}`}
                        </p>
                        {promotionForm.totalAccumulated > 0 ? (
                          <div className="text-[11px] text-amber-900 mt-1 space-y-1">
                            <p>
                              Tunggakan kelas {promotionStudent.kelas}: <strong>{promotionForm.unpaidMonthsList.length} bulan</strong> {promotionForm.unpaidMonthsList.length > 0 && `(${promotionForm.unpaidMonthsList.join(', ')})`} = <strong>{formatRupiah(promotionForm.curClassUnpaidDebt)}</strong>
                              {promotionForm.existingArrears > 0 && (
                                <span> + Saldo tunggakan sebelumnya: <strong>{formatRupiah(promotionForm.existingArrears)}</strong></span>
                              )}
                            </p>
                            <p className="font-extrabold text-amber-950">
                              Total Akumulasi Tagihan Tertunggak: {formatRupiah(promotionForm.totalAccumulated)}
                            </p>
                          </div>
                        ) : (
                          <p className="text-[11px] text-emerald-800 mt-0.5">
                            Siswa telah melunasi seluruh kewajiban SPP yang jatuh tempo di kelas saat ini.
                          </p>
                        )}
                      </div>
                    </div>

                    {promotionForm.totalAccumulated > 0 && (
                      <label className="mt-3 pt-3 border-t border-amber-200 flex items-center gap-2.5 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={promotionForm.carryOverDebt}
                          onChange={(e) => setPromotionForm(prev => ({ ...prev, carryOverDebt: e.target.checked }))}
                          className="w-4 h-4 text-amber-600 rounded border-amber-300 focus:ring-amber-500"
                        />
                        <span className="text-xs font-black text-amber-950">
                          Akumulasikan sisa tagihan ({formatRupiah(promotionForm.totalAccumulated)}) ke tagihan siswa di kelas baru
                        </span>
                      </label>
                    )}
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
                      <span>{promotionForm.type === 'naik' ? 'Simpan Kenaikan Kelas' : (promotionForm.type === 'keluar' ? 'Simpan Status Keluar' : 'Simpan Pindah Rombel')}</span>
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* MODAL LIHAT BIODATA LENGKAP SISWA (FORMAT RESMI) */}
          {selectedBiodataStudent && (
            <div className="modal-portal-wrapper fixed inset-0 bg-slate-950/75 backdrop-blur-md z-[9999] flex items-center justify-center p-3 sm:p-6 overflow-y-auto animate-in fade-in">
              <div className="modal-portal-card bg-white rounded-3xl max-w-2xl w-full p-5 sm:p-8 space-y-6 shadow-2xl animate-in zoom-in-95 duration-200 max-h-[90vh] sm:max-h-[88vh] flex flex-col border border-slate-200 m-auto relative">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-blue-100 text-blue-700 rounded-2xl flex items-center justify-center shadow-inner">
                      <Icon name="id-card" size={24} />
                    </div>
                    <div>
                      <h3 className="font-black text-slate-800 text-lg sm:text-xl">Biodata Lengkap Murid</h3>
                      <p className="text-xs text-slate-500 font-semibold">Format Buku Induk & Data Pokok Kesiswaan Resmi</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setSelectedBiodataStudent(null)} 
                    className="p-2 text-slate-400 hover:text-slate-600 font-black rounded-xl hover:bg-slate-100 transition-colors"
                  >
                    <Icon name="x" size={20} />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto space-y-5 text-xs pr-1">
                  {/* Kop & Profil Utama */}
                  <div className="p-4 sm:p-5 bg-gradient-to-r from-blue-50/70 via-indigo-50/40 to-teal-50/50 rounded-2xl border border-blue-100 flex flex-col sm:flex-row items-center sm:items-start gap-4 text-center sm:text-left">
                    <div className="w-20 h-20 rounded-2xl bg-white border-2 border-blue-200 flex items-center justify-center font-black text-blue-800 text-2xl shrink-0 overflow-hidden shadow-md">
                      {selectedBiodataStudent.fotoUrl ? (
                        <img src={selectedBiodataStudent.fotoUrl} alt={selectedBiodataStudent.name} className="w-full h-full object-cover" />
                      ) : (
                        selectedBiodataStudent.name.charAt(0)
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                        <h4 className="font-black text-slate-900 text-lg">{selectedBiodataStudent.name}</h4>
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-black ${
                          selectedBiodataStudent.statusAktif ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' : 'bg-rose-100 text-rose-800 border border-rose-300'
                        }`}>
                          {selectedBiodataStudent.statusAktif ? 'AKTIF' : 'LULUS / NON-AKTIF'}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mt-1.5 text-xs">
                        <span className="font-mono bg-white px-2.5 py-0.5 rounded-md border border-slate-200 font-black text-blue-700">NIS: {selectedBiodataStudent.nis}</span>
                        {selectedBiodataStudent.nipd && <span className="font-mono bg-white px-2.5 py-0.5 rounded-md border border-slate-200 font-bold text-slate-700">NIPD: {selectedBiodataStudent.nipd}</span>}
                        {selectedBiodataStudent.nisn && <span className="font-mono bg-white px-2.5 py-0.5 rounded-md border border-slate-200 font-bold text-slate-700">NISN: {selectedBiodataStudent.nisn}</span>}
                        <span className="bg-blue-600 text-white px-2.5 py-0.5 rounded-md font-extrabold">Kelas: {selectedBiodataStudent.kelas}</span>
                      </div>
                    </div>
                  </div>

                  {/* Rincian Tabel Data Diri Sesuai Format Excel Sekolah */}
                  <div className="bg-slate-50 rounded-2xl border border-slate-200 overflow-hidden">
                    <div className="px-4 py-2.5 bg-slate-100 border-b border-slate-200 font-black text-slate-700 uppercase tracking-wider text-[11px] flex items-center gap-2">
                      <Icon name="user-check" size={14} className="text-blue-600" />
                      <span>Data Identitas Siswa (Buku Induk)</span>
                    </div>
                    <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
                      <div>
                        <span className="text-slate-400 font-semibold block text-[10px] uppercase">Nama Lengkap</span>
                        <span className="font-black text-slate-900 text-sm">{selectedBiodataStudent.name}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 font-semibold block text-[10px] uppercase">Jenis Kelamin</span>
                        <span className="font-black text-slate-900">
                          {selectedBiodataStudent.jk === 'P' ? 'Perempuan (P)' : 'Laki-laki (L)'}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 font-semibold block text-[10px] uppercase">NIK Siswa (16 Digit)</span>
                        <span className="font-mono font-black text-slate-900 text-sm tracking-wider">
                          {selectedBiodataStudent.nik || '-'}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 font-semibold block text-[10px] uppercase">Agama</span>
                        <span className="font-black text-slate-900">{selectedBiodataStudent.agama || '-'}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 font-semibold block text-[10px] uppercase">Tempat Lahir</span>
                        <span className="font-bold text-slate-800">{selectedBiodataStudent.tempatLahir || '-'}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 font-semibold block text-[10px] uppercase">Tanggal Lahir</span>
                        <span className="font-bold text-slate-800">{selectedBiodataStudent.tanggalLahir || '-'}</span>
                      </div>
                      <div className="sm:col-span-2">
                        <span className="text-slate-400 font-semibold block text-[10px] uppercase">Alamat Domisili</span>
                        <span className="font-black text-slate-900">{selectedBiodataStudent.alamat || '-'}</span>
                        <span className="font-mono font-bold text-blue-700 ml-2">RT {selectedBiodataStudent.rt || '0'} / RW {selectedBiodataStudent.rw || '0'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Informasi Orang Tua / Wali & Kontak */}
                  <div className="bg-slate-50 rounded-2xl border border-slate-200 overflow-hidden">
                    <div className="px-4 py-2.5 bg-slate-100 border-b border-slate-200 font-black text-slate-700 uppercase tracking-wider text-[11px] flex items-center gap-2">
                      <Icon name="users" size={14} className="text-emerald-600" />
                      <span>Data Orang Tua / Wali & Akses Login</span>
                    </div>
                    <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
                      <div>
                        <span className="text-slate-400 font-semibold block text-[10px] uppercase">Nama Wali Murid</span>
                        <span className="font-black text-slate-900 text-sm">{selectedBiodataStudent.wali || '-'}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 font-semibold block text-[10px] uppercase">No. WhatsApp Wali</span>
                        {selectedBiodataStudent.telepon ? (
                          <a 
                            href={getWaLink(selectedBiodataStudent.telepon)} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="font-bold text-emerald-700 hover:underline flex items-center gap-1.5"
                          >
                            <Icon name="phone" size={13} /> {selectedBiodataStudent.telepon}
                          </a>
                        ) : (
                          <span className="text-amber-600 font-bold">- Belum diisi -</span>
                        )}
                      </div>
                      <div>
                        <span className="text-slate-400 font-semibold block text-[10px] uppercase">Password Login Wali</span>
                        <span className="font-mono font-black text-blue-700 bg-white px-2 py-0.5 rounded border border-slate-200">
                          {selectedBiodataStudent.password || (selectedBiodataStudent.nis ? `Sb${selectedBiodataStudent.nis}` : '-')}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 font-semibold block text-[10px] uppercase">Tarif SPP Bulanan</span>
                        <span className="font-black text-blue-800 text-sm">{formatRupiah(selectedBiodataStudent.tarif)}/bln</span>
                        {selectedBiodataStudent.keringanan_note && (
                          <span className="ml-2 text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                            {selectedBiodataStudent.keringanan_note}
                          </span>
                        )}
                      </div>
                      <div>
                        <span className="text-slate-400 font-semibold block text-[10px] uppercase">Mulai Aktif / Terdaftar</span>
                        <span className="font-black text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-lg border border-emerald-200 inline-flex items-center gap-1.5">
                          <Icon name="calendar" size={12} className="text-emerald-600" />
                          {selectedBiodataStudent.startActiveMonth || settings.startMonth || 'Januari'} {selectedBiodataStudent.startActiveYear || settings.startYear || ''}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Status Tunggakan & Riwayat Mutasi / Naik Kelas */}
                  {((Number(selectedBiodataStudent.arrearsAmount) > 0) || (selectedBiodataStudent.classHistory && selectedBiodataStudent.classHistory.length > 0)) && (
                    <div className="bg-slate-50 rounded-2xl border border-slate-200 overflow-hidden">
                      <div className="px-4 py-2.5 bg-slate-100 border-b border-slate-200 font-black text-slate-700 uppercase tracking-wider text-[11px] flex items-center gap-2">
                        <Icon name="history" size={14} className="text-indigo-600" />
                        <span>Riwayat Kenaikan Kelas & Tunggakan Akumulasi</span>
                      </div>
                      <div className="p-4 space-y-3">
                        {Number(selectedBiodataStudent.arrearsAmount) > 0 && (
                          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-900">
                            <p className="font-black">Tunggakan Bawaan Kelas Sebelumnya: {formatRupiah(selectedBiodataStudent.arrearsAmount)}</p>
                            {selectedBiodataStudent.arrearsNote && (
                              <p className="text-[11px] text-rose-700 mt-0.5">{selectedBiodataStudent.arrearsNote}</p>
                            )}
                          </div>
                        )}
                        {selectedBiodataStudent.classHistory && selectedBiodataStudent.classHistory.length > 0 && (
                          <div className="space-y-1.5">
                            <span className="text-[10px] font-black uppercase text-slate-500">Log Mutasi Kelas:</span>
                            {selectedBiodataStudent.classHistory.map((hist, i) => (
                              <div key={i} className="p-2.5 bg-white border border-slate-200 rounded-xl flex items-center justify-between text-xs">
                                <div>
                                  <span className="font-black text-slate-900">{hist.fromClass} ➔ {hist.toClass}</span>
                                  <span className="text-slate-400 ml-2">({hist.date || '-'})</span>
                                </div>
                                <span className="font-mono font-bold text-blue-700">{formatRupiah(hist.newTarif)}/bln</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-3 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setSelectedBiodataStudent(null)}
                    className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-black rounded-2xl text-xs transition-colors"
                  >
                    Tutup
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const st = selectedBiodataStudent;
                      setSelectedBiodataStudent(null);
                      openModal(st);
                    }}
                    className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-2xl text-xs shadow-md shadow-blue-500/25 transition-all flex items-center justify-center gap-2"
                  >
                    <Icon name="edit" size={16} />
                    <span>Edit Data Siswa Ini</span>
                  </button>
                </div>
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
        date: formatDateIndo(new Date())
      });

      const openModal = (ann = null) => {
        if (ann) {
          setEditingAnn(ann);
          setFormData({
            ...ann,
            date: formatDateIndo(ann.date)
          });
        } else {
          setEditingAnn(null);
          setFormData({
            title: '',
            content: '',
            imageUrl: '',
            date: formatDateIndo(new Date())
          });
        }
        setShowModal(true);
      };

      const handleSubmit = async (e) => {
        e.preventDefault();
        const payload = {
          ...formData,
          date: formatDateIndo(formData.date) || formatDateIndo(new Date())
        };
        if (editingAnn) {
          await onUpdateAnnouncement(editingAnn.id, payload);
        } else {
          await onAddAnnouncement(payload);
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
                          {formatDateIndo(ann.date)}
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
                    <label className="block font-bold text-slate-700 uppercase mb-1">Tanggal Terbit (Pilih Kalender)</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="date"
                        value={dateToYyyyMmDd(formData.date)}
                        onChange={(e) => {
                          if (e.target.value) {
                            setFormData({ ...formData, date: formatDateIndo(e.target.value) });
                          }
                        }}
                        className="px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-900 cursor-pointer shadow-2xs"
                      />
                      <div className="flex-1 px-3.5 py-2.5 bg-blue-50 border border-blue-200 rounded-xl font-black text-blue-900 text-xs flex items-center gap-2 shadow-2xs">
                        <Icon name="calendar" size={15} className="text-blue-600 shrink-0" />
                        <span className="truncate">{formData.date || formatDateIndo(new Date())}</span>
                      </div>
                    </div>
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
    // REUSABLE SEARCHABLE STUDENT SELECTOR
    // Replaces raw <select> with searchable dropdown
    // ==========================================
    function SearchableStudentSelect({
      students = [],
      value = '',
      onChange,
      placeholder = '-- Pilih Siswa --',
      required = false,
      theme = 'blue'
    }) {
      const [isOpen, setIsOpen] = useState(false);
      const [search, setSearch] = useState('');
      const containerRef = useRef(null);
      const searchInputRef = useRef(null);

      const selectedStudent = useMemo(() => {
        if (!value) return null;
        return students.find(s => String(s.id) === String(value) || s.name === value || s.nis === value) || null;
      }, [students, value]);

      const filteredStudents = useMemo(() => {
        if (!search.trim()) return students;
        const q = search.toLowerCase().trim();
        return students.filter(s => 
          (s.name && s.name.toLowerCase().includes(q)) ||
          (s.nis && String(s.nis).toLowerCase().includes(q)) ||
          (s.kelas && s.kelas.toLowerCase().includes(q))
        );
      }, [students, search]);

      useEffect(() => {
        const handleClickOutside = (e) => {
          if (containerRef.current && !containerRef.current.contains(e.target)) {
            setIsOpen(false);
          }
        };
        if (isOpen) {
          document.addEventListener('mousedown', handleClickOutside);
        }
        return () => document.removeEventListener('mousedown', handleClickOutside);
      }, [isOpen]);

      const handleSelect = (s) => {
        onChange({ target: { value: s.id } });
        setIsOpen(false);
        setSearch('');
      };

      const handleClear = (e) => {
        if (e) {
          e.preventDefault();
          e.stopPropagation();
        }
        onChange({ target: { value: '' } });
        setSearch('');
        setIsOpen(false);
      };

      const themeClasses = {
        sky: 'border-2 border-sky-200/90 focus-within:border-sky-500 focus-within:ring-2 focus-within:ring-sky-400/20',
        blue: 'border border-slate-300 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-400/20',
        teal: 'border border-slate-300 focus-within:border-teal-500 focus-within:ring-2 focus-within:ring-teal-400/20'
      }[theme] || 'border border-slate-300 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-400/20';

      return (
        <div ref={containerRef} className={`relative w-full ${isOpen ? 'z-[999]' : 'z-20'}`}>
          {required && (
            <input
              type="text"
              required={required}
              value={value || ''}
              onChange={() => {}}
              tabIndex={-1}
              aria-hidden="true"
              style={{
                position: 'absolute',
                opacity: 0,
                width: 1,
                height: 1,
                bottom: 0,
                left: 10,
                pointerEvents: 'none'
              }}
            />
          )}

          <div
            role="button"
            tabIndex={0}
            onClick={() => {
              const next = !isOpen;
              setIsOpen(next);
              setSearch('');
              if (next) {
                setTimeout(() => {
                  if (searchInputRef.current) searchInputRef.current.focus({ preventScroll: true });
                }, 10);
              }
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                setIsOpen(!isOpen);
              }
            }}
            className={`w-full min-h-[42px] px-3.5 py-2 bg-white rounded-xl sm:rounded-2xl flex items-center justify-between gap-2 text-left font-bold text-xs sm:text-sm text-slate-800 shadow-2xs transition-all cursor-pointer select-none ${themeClasses}`}
          >
            <div className="flex items-center gap-2 min-w-0 flex-1">
              {selectedStudent ? (
                <>
                  <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-black text-[11px] shrink-0 overflow-hidden">
                    {selectedStudent.fotoUrl ? (
                      <img src={selectedStudent.fotoUrl} alt={selectedStudent.name} className="w-full h-full object-cover" />
                    ) : (
                      (selectedStudent.name || 'M').charAt(0).toUpperCase()
                    )}
                  </div>
                  <span className="truncate text-slate-900 font-extrabold">{selectedStudent.name}</span>
                  <span className="shrink-0 px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[10px] font-black uppercase">
                    {selectedStudent.nis ? `${selectedStudent.nis} • ` : ''}{selectedStudent.kelas}
                  </span>
                </>
              ) : (
                <span className="text-slate-400 font-medium truncate">{placeholder}</span>
              )}
            </div>

            <div className="flex items-center gap-1 shrink-0 text-slate-400">
              {selectedStudent && (
                <button
                  type="button"
                  onClick={handleClear}
                  className="p-1 hover:text-rose-600 rounded-full hover:bg-rose-50 transition-colors cursor-pointer"
                  title="Hapus Pilihan Siswa"
                >
                  <Icon name="x" size={13} />
                </button>
              )}
              <Icon name="chevron-down" size={15} className={`transition-transform duration-200 ${isOpen ? 'rotate-180 text-blue-600' : ''}`} />
            </div>
          </div>

          {isOpen && (
            <div className="absolute top-full left-0 right-0 mt-1.5 bg-white rounded-2xl border border-slate-200 shadow-2xl z-[999] overflow-hidden animate-in fade-in zoom-in-95 duration-150">
              <div className="p-2.5 border-b border-slate-100 bg-slate-50/80">
                <div className="relative flex items-center">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Icon name="search" size={14} />
                  </div>
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Ketik untuk mencari nama, NIS, atau kelas..."
                    className="w-full pl-9 pr-8 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs"
                  />
                  {search && (
                    <button
                      type="button"
                      onClick={() => setSearch('')}
                      className="absolute right-2.5 text-slate-400 hover:text-slate-600 p-0.5"
                    >
                      <Icon name="x" size={12} />
                    </button>
                  )}
                </div>
                <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 mt-1.5 px-1">
                  <span>{filteredStudents.length} dari {students.length} murid</span>
                  {search && <span className="text-blue-600 font-extrabold">Hasil Pencarian</span>}
                </div>
              </div>

              <div className="max-h-60 overflow-y-auto divide-y divide-slate-50 text-xs">
                {filteredStudents.length === 0 ? (
                  <div className="p-5 text-center text-slate-400 font-medium">
                    <Icon name="search-x" size={20} className="mx-auto mb-1 text-slate-300" />
                    Tidak ada murid yang cocok dengan "{search}"
                  </div>
                ) : (
                  filteredStudents.map(s => {
                    const isSelected = String(s.id) === String(value);
                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => handleSelect(s)}
                        className={`w-full px-3.5 py-2.5 flex items-center justify-between gap-2.5 text-left transition-colors cursor-pointer ${
                          isSelected 
                            ? 'bg-blue-50/80 text-blue-900 font-black' 
                            : 'hover:bg-slate-50 text-slate-700 font-medium'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-black text-xs shrink-0 overflow-hidden">
                            {s.fotoUrl ? (
                              <img src={s.fotoUrl} alt={s.name} className="w-full h-full object-cover" />
                            ) : (
                              (s.name || 'M').charAt(0).toUpperCase()
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="font-extrabold text-slate-800 truncate">{s.name}</p>
                            <p className="text-[10px] text-slate-400 font-semibold truncate">
                              {s.nis ? `NIS: ${s.nis} • ` : ''}Kelas {s.kelas}
                            </p>
                          </div>
                        </div>
                        {isSelected && (
                          <Icon name="check" size={15} className="text-blue-600 shrink-0" />
                        )}
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>
      );
    }

    // 6. CATAT PEMBAYARAN MANUAL
    // ==========================================
    function LaporanView({ students, transactions, settings }) {
      const [filterType, setFilterType] = useState('all');
      const [filterClass, setFilterClass] = useState(() => (settings?.customClasses && settings.customClasses.length > 0) ? settings.customClasses[0].name : '');
      const [filterStudent, setFilterStudent] = useState('');
      const [filterSemester, setFilterSemester] = useState('all'); // 'all', '1', '2'
      const [viewMode, setViewMode] = useState('all'); // 'all', 'rekap', 'transaksi'
      const [filterTrxScope, setFilterTrxScope] = useState('all'); // 'all' (Termasuk Riwayat Kelas Sebelumnya) | 'current_only' (Hanya Transaksi di Kelas Terpilih)

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

      // Filter student dibiarkan kosong jika user menekan tombol [x] (clear)

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

      // Sinkronisasi otomatis semester saat periode terpilih berubah
      useEffect(() => {
        if (selectedPeriodObj) {
          setFilterSemester(detectSemesterFromPeriod(selectedPeriodObj, 'all'));
        }
      }, [selectedPeriodObj]);

      // Objek murid yang dipilih saat filter student aktif
      const selectedStudentObj = useMemo(() => {
        if (!filterStudent) return null;
        return students.find(s => s.id === filterStudent || s.name === filterStudent) || null;
      }, [students, filterStudent]);

      // Rangkaian bulan untuk cakupan periode & semester yang dipilih
      const scopeMonths = useMemo(() => {
        if (selectedPeriodObj) {
          const pStartM = selectedPeriodObj.startMonth || 'Juli';
          const pStartY = parseInt(selectedPeriodObj.startYear) || 2026;
          const pEndM = selectedPeriodObj.endMonth || 'Juni';
          const pEndY = parseInt(selectedPeriodObj.endYear) || pStartY;

          const pMonths = getMonthsList(pStartM, '', pEndM, pStartY, pEndY);
          if (pMonths.length > 6 && filterSemester !== 'all') {
            return getSemesterMonths(pMonths, filterSemester);
          }
          return pMonths;
        }

        const sysEarliest = getSystemEarliestPeriodStart(settings);
        const endM = settings?.endMonth || 'Juni';
        const endY = parseInt(settings?.endYear) || (sysEarliest.year + 1);

        const baseMonths = getMonthsList(sysEarliest.month, '', endM, sysEarliest.year, endY);
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

        // Sertakan transaksi pelunasan tunggakan bawaan / kelas sebelumnya
        if (trxMonth.includes('tunggakan') || trxMonth.includes('kelas sebelumnya')) {
          return true;
        }

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
            list = list.filter(s => String(s.id) === String(filterStudent) || s.name === filterStudent);
          } else {
            return []; // Jika pilihan siswa dihapus (kosong), tampilkan tabel kosong tanpa memilih acak
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

          // Filter scope, due, dan future months agar HANYA menghitung bulan saat siswa aktif
          const studentScopeMonths = scopeMonths.filter(m => isMonthOnOrAfterStudentStart(m, student, settings));
          const studentDueMonths = dueMonths.filter(m => isMonthOnOrAfterStudentStart(m, student, settings));
          const studentFutureMonths = futureMonths.filter(m => isMonthOnOrAfterStudentStart(m, student, settings));

          // Bulan apa saja yang sudah dibayar oleh siswa ini di scope ini
          const paidMonths = studentScopeMonths.filter(m => {
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
          const unpaidDueMonths = studentDueMonths.filter(m => !paidMonths.includes(m));

          // Bulan mendatang yang belum dibayar (belum jatuh tempo)
          const futureUnpaidMonths = studentFutureMonths.filter(m => !paidMonths.includes(m));

          const tarif = Number(student.tarif) || 350000;
          const totalPaidAmount = paidMonths.length * tarif;
          const previousArrears = Number(student.arrearsAmount) || 0;
          const totalDebtAmount = (unpaidDueMonths.length * tarif) + previousArrears;
          const isLunas = unpaidDueMonths.length === 0 && previousArrears === 0;

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
      }, [filteredStudents, transactions, scopeMonths, dueMonths, futureMonths, settings]);

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
          if (filterTrxScope === 'current_only') {
            res = res.filter(t => (t.kelas || '').toLowerCase().trim() === (filterClass || '').toLowerCase().trim());
          } else {
            // 'all': Termasuk transaksi murid rombel ini saat di kelas sebelumnya
            const studentIdsInClass = new Set(filteredStudents.map(s => String(s.id)));
            const studentNamesInClass = new Set(filteredStudents.map(s => (s.name || '').toLowerCase().trim()));
            res = res.filter(t => 
              (t.kelas || '').toLowerCase().trim() === (filterClass || '').toLowerCase().trim() ||
              (t.studentId && studentIdsInClass.has(String(t.studentId))) ||
              (t.studentName && studentNamesInClass.has((t.studentName || '').toLowerCase().trim()))
            );
          }
        } else if (filterType === 'student') {
          if (filterStudent) {
            res = res.filter(t => 
              String(t.studentId) === String(filterStudent) || 
              (selectedStudentObj && t.studentName && t.studentName.toLowerCase().trim() === selectedStudentObj.name.toLowerCase().trim()) ||
              (t.studentName && t.studentName.toLowerCase().trim() === String(filterStudent).toLowerCase().trim())
            );
          } else {
            return []; // Jika belum ada siswa yang dipilih, transaksi kosong
          }
        }

        res = res.filter(t => isTrxInScope(t));
        return res;
      }, [transactions, filterType, filterClass, filterStudent, selectedStudentObj, isTrxInScope, filterTrxScope, filteredStudents]);

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
              <link rel="stylesheet" href="dashboard.min.css">
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
                  <SearchableStudentSelect 
                    students={students}
                    value={filterStudent} 
                    onChange={e => setFilterStudent(e.target.value)} 
                    placeholder="-- Cari & Pilih Siswa --"
                    theme="blue"
                  />
                </div>
              )}

              {/* 3. Filter Periode SPP */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Periode Pembayaran SPP</label>
                <select 
                  value={filterPeriod || (activePeriod ? String(activePeriod.id) : 'all')} 
                  onChange={e => {
                    const newId = e.target.value;
                    setFilterPeriod(newId);
                    const matchP = periodsList.find(p => String(p.id) === String(newId));
                    setFilterSemester(detectSemesterFromPeriod(matchP, 'all'));
                  }} 
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

              {/* 6. Cakupan Riwayat Kelas (Untuk memastikan pembayaran kelas sebelumnya terlacak) */}
              {filterType === 'class' && (
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5 flex items-center gap-1">
                    <span>Riwayat Kelas</span>
                    <span className="px-1.5 py-0.2 bg-emerald-100 text-emerald-800 rounded text-[9px] font-black">Pelacakan</span>
                  </label>
                  <select 
                    value={filterTrxScope} 
                    onChange={e => setFilterTrxScope(e.target.value)} 
                    className="w-full px-3.5 py-2.5 bg-emerald-50/60 border border-emerald-300 rounded-xl font-bold text-xs text-emerald-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="all">Semua Rombel (Termasuk Kelas Sebelumnya)</option>
                    <option value="current_only">Hanya Kelas {filterClass} Saja</option>
                  </select>
                </div>
              )}
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
                <img src="logo.webp" alt="PAUD Setia Bhakti" className="w-full h-full object-contain" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-black text-slate-900 uppercase tracking-wider">{settings?.schoolName || 'PAUD SETIA BHAKTI'}</h1>
                <p className="text-xs sm:text-sm font-semibold text-slate-600 mt-1">{settings?.address || 'Paud setia bhakti, Subang, Jawa Barat'}</p>
                <p className="text-xs sm:text-sm font-semibold text-slate-600">Telp / WA: {settings?.phone || '089503222835'}</p>
              </div>
              
              <div className="mt-5 pt-3 border-t border-slate-200">
                <h2 className="text-lg sm:text-xl font-black text-slate-800 uppercase tracking-wide">
                  LAPORAN PEMBAYARAN & REKAP TUNGGAKAN SPP
                </h2>
                <div className="flex flex-wrap items-center justify-center gap-3 mt-1.5 text-xs font-bold text-slate-600 uppercase">
                  <span>CAKUPAN: <strong className="text-slate-900">{
                    filterType === 'all' ? 'SEMUA SISWA' : 
                    filterType === 'class' ? `KELAS ${filterClass}` : 
                    (selectedStudentObj ? `${selectedStudentObj.name} (${selectedStudentObj.kelas})` : 'BELUM ADA SISWA DIPILIH')
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
                            {filterType === 'student' && !filterStudent
                              ? 'Belum Ada Siswa yang Dipilih. Silakan cari dan pilih nama siswa pada kolom filter di atas.'
                              : 'Tidak ada data siswa yang sesuai kriteria filter.'}
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
                            {filterType === 'student' && !filterStudent
                              ? 'Belum ada siswa yang dipilih. Silakan pilih siswa pada filter di atas.'
                              : 'Tidak ada riwayat kuitansi pembayaran pada periode & semester ini.'}
                          </td>
                        </tr>
                      ) : (
                        filteredTransactions.map((trx, idx) => (
                          <tr key={trx.id || idx} className="hover:bg-slate-50">
                            <td className="py-2.5 px-3 border-r border-slate-200 text-center font-bold text-slate-600">{idx + 1}</td>
                            <td className="py-2.5 px-3 border-r border-slate-200 font-semibold">{formatDateIndo(trx.date)}</td>
                            <td className="py-2.5 px-3 border-r border-slate-200 font-bold text-slate-800">{trx.kuitansiNo || '-'}</td>
                            <td className="py-2.5 px-3 border-r border-slate-200 font-black text-slate-900">{trx.studentName}</td>
                            <td className="py-2.5 px-3 border-r border-slate-200">
                              <span className="font-semibold">{trx.kelas}</span>
                              {filterType === 'class' && trx.kelas && (trx.kelas || '').toLowerCase().trim() !== (filterClass || '').toLowerCase().trim() && (
                                <span className="block text-[10px] text-amber-700 font-bold">(Kelas Sebelumnya)</span>
                              )}
                            </td>
                            <td className="py-2.5 px-3 border-r border-slate-200 font-bold text-emerald-800">
                              <span>{trx.month}</span>
                              {Boolean(trx.keringananNote) && (
                                <span className="block text-[10px] font-black text-emerald-700 italic">
                                  * Diringankan ({trx.keringananNote})
                                </span>
                              )}
                            </td>
                            <td className="py-2.5 px-3 border-r border-slate-200 text-slate-600">{trx.method || 'Tunai (di TU)'}</td>
                            <td className="py-2.5 px-3 text-right font-black text-emerald-700">
                              <div>{formatRupiah(trx.amount)}</div>
                              {Boolean(trx.keringananNote) && (
                                <span className="text-[9px] font-extrabold text-emerald-700 bg-emerald-100/80 px-1 py-0.5 rounded border border-emerald-300">
                                  * Keringanan
                                </span>
                              )}
                            </td>
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
                <p className="font-extrabold text-slate-900 underline uppercase text-sm">{settings?.adminName || 'Sarah Aura Alamanda'}</p>
                <p className="text-[10px] text-slate-500 font-bold">NIP / ID: {settings?.adminUsername || 'Sarah'}</p>
              </div>
            </div>
          </div>
        </div>
      );
    }

    function TransaksiView({ students, transactions, settings, onAddTransaction, onShowKuitansi, onUpdateStudent }) {
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

      // Semester otomatis terisi dari periode pembayaran yang dipilih atau pengaturan
      const defaultSemester = useMemo(() => {
        return detectSemesterFromPeriod(activePeriod, settings?.semester || 'all');
      }, [activePeriod, settings?.semester]);

      const [filterSemester, setFilterSemester] = useState(() => {
        return detectSemesterFromPeriod(activePeriod, settings?.semester || 'all');
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

      // Sinkronisasi otomatis saat periode pembayaran berubah
      useEffect(() => {
        if (selectedPeriodObj) {
          setFilterSemester(detectSemesterFromPeriod(selectedPeriodObj, defaultSemester));
        } else {
          setFilterSemester(defaultSemester);
        }
      }, [selectedPeriodObj, defaultSemester]);

      const activeStudents = useMemo(() => students.filter(s => s.statusAktif !== false), [students]);

      const selectedStudent = useMemo(() => {
        return students.find(s => s.id.toString() === selectedStudentId.toString());
      }, [students, selectedStudentId]);

      // Rangkaian bulan untuk cakupan periode & semester yang dipilih (diambil langsung dari periode pilihan)
      const scopeMonths = useMemo(() => {
        if (selectedPeriodObj) {
          const pStartM = selectedPeriodObj.startMonth || 'Juli';
          const pStartY = parseInt(selectedPeriodObj.startYear) || 2026;
          const pEndM = selectedPeriodObj.endMonth || 'Juni';
          const pEndY = parseInt(selectedPeriodObj.endYear) || pStartY;

          const pMonths = getMonthsList(pStartM, '', pEndM, pStartY, pEndY);
          // Jika periode mencakup lebih dari 1 semester (> 6 bulan) dan filterSemester disetel bukan 'all'
          if (pMonths.length > 6 && filterSemester !== 'all') {
            return getSemesterMonths(pMonths, filterSemester);
          }
          return pMonths;
        }

        const sysEarliest = getSystemEarliestPeriodStart(settings);
        const endM = settings?.endMonth || 'Juni';
        const endY = parseInt(settings?.endYear) || (sysEarliest.year + 1);

        const baseMonths = getMonthsList(sysEarliest.month, '', endM, sysEarliest.year, endY);
        return getSemesterMonths(baseMonths, filterSemester);
      }, [selectedPeriodObj, filterSemester, settings]);

      const periodStartYear = useMemo(() => {
        if (selectedPeriodObj) return parseInt(selectedPeriodObj.startYear) || 2026;
        return parseInt(settings?.startYear) || 2026;
      }, [selectedPeriodObj, settings?.startYear]);

      // Status pembayaran siswa pada bulan-bulan dalam semester & periode ini
      const paymentSummary = useMemo(() => {
        if (!selectedStudent) return { paidMonths: [], unpaidMonths: [], dueUnpaidMonths: [], futureUnpaidMonths: [], pastUnpaidDueMonths: [] };
        const studentTrx = transactions.filter(t => 
          (t.studentId === selectedStudent.id || (t.studentName && t.studentName.toLowerCase().trim() === selectedStudent.name.toLowerCase().trim())) &&
          (t.status === 'Lunas' || t.status === 'lunas' || t.status === 'Berhasil' || t.status === 'Sukses')
        );

        // Cakupan bulan yang dihitung hanya yang jatuh pada masa aktif siswa
        const studentScopeMonths = scopeMonths.filter(m => isMonthOnOrAfterStudentStart(m, selectedStudent, settings));

        // Cari juga bulan lampau sejak murid masuk s/d awal periode ini yang belum lunas (sisa tunggakan sebelum semester sekarang)
        const sysEarliest = getSystemEarliestPeriodStart(settings);
        const studentStart = getStudentEffectiveStart(selectedStudent, settings);
        let pastUnpaidDueMonths = [];
        if (scopeMonths.length > 0) {
          const firstMonthInScope = scopeMonths[0];
          const parts = firstMonthInScope.split(' ');
          const fMonth = parts[0];
          const fYear = parseInt(parts[1]) || sysEarliest.year;
          const fIdx = ALL_MONTHS.indexOf(fMonth);

          const priorMonths = getMonthsList(studentStart.month, '', ALL_MONTHS[(fIdx - 1 + 12) % 12], studentStart.year, (fIdx === 0 ? fYear - 1 : fYear));
          if (priorMonths.length > 0 && priorMonths[0] !== firstMonthInScope) {
            pastUnpaidDueMonths = priorMonths.filter(m => {
              if (!isMonthOnOrAfterStudentStart(m, selectedStudent, settings)) return false;
              if (!isMonthDueOrElapsed(m, new Date(), settings?.dueDateDay || 10)) return false;
              const mLower = m.trim().toLowerCase();
              return !studentTrx.some(t => {
                const tMonth = (t.month || '').trim().toLowerCase();
                return tMonth === mLower || (tMonth && mLower.startsWith(tMonth));
              });
            });
          }
        }

        const paidMonths = studentScopeMonths.filter(m => {
          const mLower = m.trim().toLowerCase();
          return studentTrx.some(t => {
            const tMonth = (t.month || '').trim().toLowerCase();
            return tMonth === mLower || (tMonth && mLower.startsWith(tMonth));
          });
        });
        const allUnpaidMonths = studentScopeMonths.filter(m => !paidMonths.includes(m));
        
        // Pemisahan akurat: HANYA bulan yang telah berjalan s/d saat ini yang dihitung menunggak
        const dueUnpaidMonths = allUnpaidMonths.filter(m => isMonthDueOrElapsed(m, new Date(), settings?.dueDateDay || 10));
        const futureUnpaidMonths = allUnpaidMonths.filter(m => !isMonthDueOrElapsed(m, new Date(), settings?.dueDateDay || 10));

        const combinedDueUnpaid = [...pastUnpaidDueMonths, ...dueUnpaidMonths.filter(m => !pastUnpaidDueMonths.includes(m))];
        const combinedAllUnpaid = [...pastUnpaidDueMonths, ...allUnpaidMonths.filter(m => !pastUnpaidDueMonths.includes(m))];

        return { 
          paidMonths, 
          unpaidMonths: combinedAllUnpaid, 
          dueUnpaidMonths: combinedDueUnpaid, 
          futureUnpaidMonths,
          pastUnpaidDueMonths
        };
      }, [selectedStudent, transactions, scopeMonths, settings?.dueDateDay, settings]);

      useEffect(() => {
        if (selectedStudent) {
          if (selectedMonth && selectedMonth.startsWith('Tunggakan')) {
            setCustomAmount(selectedStudent.arrearsAmount || 0);
          } else {
            setCustomAmount(selectedStudent.tarif || 350000);
          }
          if (paymentSummary.dueUnpaidMonths.length > 0) {
            setSelectedMonth(paymentSummary.dueUnpaidMonths[0]);
          } else if (Number(selectedStudent.arrearsAmount || 0) > 0) {
            setSelectedMonth(selectedStudent.arrearsNote ? `Tunggakan (${selectedStudent.arrearsNote})` : 'Tunggakan Kelas Sebelumnya');
            setCustomAmount(Number(selectedStudent.arrearsAmount));
          } else if (paymentSummary.futureUnpaidMonths.length > 0) {
            setSelectedMonth(paymentSummary.futureUnpaidMonths[0]);
          } else {
            setSelectedMonth('');
          }
        } else {
          setSelectedMonth('');
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

        const currentDate = formatDateIndo(new Date());
        const kuitansiNo = `K-${new Date().getFullYear()}${String(new Date().getMonth()+1).padStart(2,'0')}-${Math.floor(100+Math.random()*900)}`;

        const isArrears = selectedMonth.startsWith('Tunggakan') || selectedMonth.includes('Kelas Sebelumnya');

        const newTrx = {
          studentId: selectedStudent.id,
          studentName: selectedStudent.name,
          kelas: selectedStudent.kelas,
          month: selectedMonth,
          amount: Number(customAmount) || (isArrears ? selectedStudent.arrearsAmount : selectedStudent.tarif),
          method: payMethod,
          status: 'Lunas',
          isRead: false,
          date: currentDate,
          kuitansiNo: kuitansiNo,
          keringananNote: selectedStudent.keringanan_note || selectedStudent.keringananNote || ''
        };

        onAddTransaction(newTrx);

        if (isArrears && typeof onUpdateStudent === 'function') {
          onUpdateStudent(selectedStudent.id, {
            ...selectedStudent,
            arrearsAmount: 0,
            arrearsNote: `Lunas via Manual TU (${currentDate})`
          });
        }

        alert(`Pembayaran SPP Bulan ${selectedMonth} untuk ${selectedStudent.name} (${formatRupiah(newTrx.amount)}) berhasil dicatat!`);
      };

      return (
        <div className="space-y-6">
          {/* Card 1: Catat Pembayaran SPP (Manual TU) - Nuansa Buku Ledger Pastel */}
          <div className="pastel-ledger-card p-6 sm:p-8 space-y-5 relative">
            {/* Subtle Stationery Motifs (Clean, Academic & Non-childish) */}
            <div className="absolute top-4 right-5 hidden sm:flex items-center gap-2 pointer-events-none opacity-40 select-none text-base">
              <span title="Buku Akademik">📖</span>
              <span title="Penggaris Pembukuan">📐</span>
              <span title="Catatan">✈️</span>
            </div>

            <div className="relative z-10">
              <div className="inline-flex items-center gap-2 px-3.5 py-1 bg-amber-100/80 text-amber-900 rounded-full text-xs font-black uppercase mb-2 border border-amber-300/80 shadow-2xs">
                <span>📖</span>
                <span>Buku Catat Pembayaran SPP (Manual TU)</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
                Catat Pembayaran SPP (Manual TU)
              </h2>
              <p className="text-xs text-slate-600 font-medium mt-1">
                Pencatatan langsung saat wali murid membayar tunai atau transfer TU dengan nomor periode & semester otomatis.
              </p>
            </div>

            {/* Filter Scope Periode & Semester (Sinkron Otomatis dari Pengaturan) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-amber-50/40 rounded-2xl border border-amber-200/70 text-xs">
              <div>
                <label className="block font-black text-slate-700 uppercase mb-1.5 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  <span>PERIODE PEMBAYARAN</span>
                </label>
                <select
                  value={filterPeriod || (activePeriod ? String(activePeriod.id) : 'all')}
                  onChange={(e) => {
                    const newId = e.target.value;
                    setFilterPeriod(newId);
                    const matchP = periodsList.find(p => String(p.id) === String(newId));
                    setFilterSemester(detectSemesterFromPeriod(matchP, defaultSemester));
                  }}
                  className="w-full px-4 py-2.5 bg-white border-2 border-emerald-200/90 rounded-2xl font-bold text-slate-800 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-400/20 shadow-2xs"
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
                <label className="block font-black text-slate-700 uppercase mb-1.5 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                    <span>SEMESTER</span>
                  </span>
                  <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full flex items-center gap-1 ${Boolean(filterPeriod && filterPeriod !== 'all') ? 'text-amber-800 bg-amber-100 border border-amber-200' : 'text-blue-700 bg-blue-100/60'}`}>
                    {Boolean(filterPeriod && filterPeriod !== 'all') ? '🔒 Terkunci (Sesuai Periode)' : 'Otomatis Terisi'}
                  </span>
                </label>
                <select
                  value={filterSemester}
                  disabled={Boolean(filterPeriod && filterPeriod !== 'all')}
                  onChange={(e) => setFilterSemester(e.target.value)}
                  className={`w-full px-4 py-2.5 rounded-2xl font-bold border-2 shadow-2xs transition-all ${
                    Boolean(filterPeriod && filterPeriod !== 'all')
                      ? 'bg-slate-100 border-slate-200 text-slate-500 cursor-not-allowed opacity-90'
                      : 'bg-white border-rose-200/90 text-slate-800 focus:outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-400/20'
                  }`}
                >
                  <option value="all">Semua Semester (1 Tahun Penuh)</option>
                  <option value="1">Semester 1 (Ganjil)</option>
                  <option value="2">Semester 2 (Genap)</option>
                </select>
              </div>
            </div>

            <form onSubmit={handleManualPaymentSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
              <div className="relative z-30">
                <label className="block font-black text-slate-700 uppercase mb-1.5 flex items-center gap-1">
                  <span>PILIH MURID</span>
                </label>
                <SearchableStudentSelect
                  required
                  students={activeStudents}
                  value={selectedStudentId}
                  onChange={(e) => setSelectedStudentId(e.target.value)}
                  placeholder="-- Cari & Pilih Murid --"
                  theme="sky"
                />
              </div>

              <div>
                <label className="block font-black text-slate-700 uppercase mb-1.5 flex items-center justify-between">
                  <span>PILIH KAS / BULAN SPP</span>
                  <span className="text-[10px] font-extrabold text-purple-700">{scopeMonths.length} Bln</span>
                </label>
                <select
                  required
                  value={selectedMonth}
                  onChange={(e) => {
                    const val = e.target.value;
                    setSelectedMonth(val);
                    if (val.startsWith('Tunggakan') && selectedStudent) {
                      setCustomAmount(selectedStudent.arrearsAmount || 0);
                    } else if (selectedStudent) {
                      setCustomAmount(selectedStudent.tarif || 350000);
                    }
                  }}
                  className="w-full px-4 py-2.5 bg-white border-2 border-purple-200/90 rounded-2xl font-bold text-slate-800 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-400/20 shadow-2xs"
                >
                  {!selectedStudent ? (
                    <>
                      <option value="">-- Pilih Murid Terlebih Dahulu --</option>
                      {scopeMonths.map(m => (
                        <option key={m} value={m} disabled>{m} ({selectedPeriodObj?.name || 'Scope Periode'})</option>
                      ))}
                    </>
                  ) : paymentSummary.unpaidMonths.length === 0 && Number(selectedStudent.arrearsAmount || 0) === 0 ? (
                    <option value="">Semua Bulan di Semester Ini Sudah Lunas</option>
                  ) : (
                    <>
                      {Number(selectedStudent.arrearsAmount || 0) > 0 && (
                        <optgroup label="[Tunggakan Bawaan] Kelas Sebelumnya">
                          <option value={selectedStudent.arrearsNote ? `Tunggakan (${selectedStudent.arrearsNote})` : 'Tunggakan Kelas Sebelumnya'}>
                            {selectedStudent.arrearsNote ? `Tunggakan (${selectedStudent.arrearsNote})` : 'Tunggakan Kelas Sebelumnya'} - {formatRupiah(selectedStudent.arrearsAmount)}
                          </option>
                        </optgroup>
                      )}
                      {paymentSummary.pastUnpaidDueMonths && paymentSummary.pastUnpaidDueMonths.length > 0 && (
                        <optgroup label="[Sisa Tunggakan Sebelumnya] Periode Lampau">
                          {paymentSummary.pastUnpaidDueMonths.map(m => (
                            <option key={m} value={m}>{m} (Menunggak Lampau)</option>
                          ))}
                        </optgroup>
                      )}
                      {paymentSummary.dueUnpaidMonths.filter(m => !paymentSummary.pastUnpaidDueMonths?.includes(m)).length > 0 && (
                        <optgroup label="[Jatuh Tempo] Tagihan Periode Ini">
                          {paymentSummary.dueUnpaidMonths.filter(m => !paymentSummary.pastUnpaidDueMonths?.includes(m)).map(m => (
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
                <label className="block font-black text-slate-700 uppercase mb-1.5 flex items-center gap-1">
                  <span>METODE BAYAR</span>
                </label>
                <select
                  value={payMethod}
                  onChange={(e) => setPayMethod(e.target.value)}
                  className="w-full px-4 py-2.5 bg-white border-2 border-emerald-200/90 rounded-2xl font-bold text-slate-800 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-400/20 shadow-2xs"
                >
                  <option value="Tunai (di TU)">Tunai (di TU)</option>
                  <option value="Transfer Bank Manual">Transfer Bank Manual</option>
                  <option value="EDC TU">Mesin EDC TU</option>
                </select>
              </div>

              <div>
                <label className="block font-black text-slate-700 uppercase mb-1.5 flex items-center gap-1">
                  <span>NOMINAL SPP</span>
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none font-black text-slate-400 text-xs">Rp</span>
                  <input
                    type="text"
                    required
                    value={formatInputNumber(customAmount)}
                    onChange={(e) => setCustomAmount(parseNumberOnly(e.target.value))}
                    className="w-full pl-10 pr-4 py-2.5 bg-white border-2 border-amber-200/90 rounded-2xl font-black text-slate-900 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-400/20 shadow-2xs"
                  />
                </div>
              </div>

              {selectedStudent && (
                <div className="md:col-span-2 lg:col-span-4 p-4 bg-amber-50/60 border border-amber-200 rounded-2xl space-y-2 text-xs">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-black text-slate-900 text-sm">{selectedStudent.name}</span>
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
                  className="py-3 px-6 bg-gradient-to-r from-orange-400 via-amber-500 to-orange-500 hover:from-orange-500 hover:to-amber-600 disabled:opacity-50 disabled:pointer-events-none text-white font-black shadow-md shadow-orange-300/40 rounded-2xl text-xs sm:text-sm transition-all flex items-center gap-2"
                >
                  <Icon name="check-circle" size={16} />
                  <span>Simpan Pembayaran & Terbitkan Kuitansi</span>
                </button>
              </div>
            </form>
          </div>

          {/* Card 2: Riwayat Transaksi - Table Header Chip Pastel Matching Screenshot 1 */}
          <div className="pastel-table-card">
            <div className="p-5 sm:p-6 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-amber-500 text-base">⭐</span>
                <h3 className="font-black text-slate-800 text-base sm:text-lg">Riwayat Transaksi</h3>
              </div>
              <span className="text-xs font-bold text-slate-500 bg-slate-100 px-3 py-1 rounded-full">
                {transactions.length} Data Tersimpan
              </span>
            </div>

            <div className="overflow-x-auto p-3 sm:p-4">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="text-[11px] sm:text-xs font-black uppercase tracking-wider">
                    <th className="py-3.5 px-4 pastel-th-sky rounded-l-2xl text-left whitespace-nowrap">No Kuitansi</th>
                    <th className="py-3.5 px-4 pastel-th-orange text-left whitespace-nowrap">Nama Siswa</th>
                    <th className="py-3.5 px-4 pastel-th-yellow text-left whitespace-nowrap">Kelas</th>
                    <th className="py-3.5 px-4 pastel-th-mint text-left whitespace-nowrap">Bulan SPP</th>
                    <th className="py-3.5 px-4 pastel-th-teal text-left whitespace-nowrap">Nominal</th>
                    <th className="py-3.5 px-4 pastel-th-coral text-left whitespace-nowrap">Metode</th>
                    <th className="py-3.5 px-4 pastel-th-mint text-center whitespace-nowrap">Status</th>
                    <th className="py-3.5 px-4 pastel-th-purple text-left whitespace-nowrap">Tanggal</th>
                    <th className="py-3.5 px-4 pastel-th-blue text-center rounded-r-2xl whitespace-nowrap">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs font-medium">
                  {transactions.length > 0 ? (
                    transactions.map((trx) => {
                      const isLunas = (trx.status || 'Lunas').toLowerCase().includes('lunas') || (trx.status || '').toLowerCase().includes('berhasil') || (trx.status || '').toLowerCase().includes('sukses');
                      return (
                        <tr key={trx.id} className="hover:bg-amber-50/40 transition-colors">
                          <td className="py-3.5 px-4 font-mono font-bold text-slate-800 whitespace-nowrap">{trx.kuitansiNo}</td>
                          <td className="py-3.5 px-4 font-extrabold text-slate-800 whitespace-nowrap">{trx.studentName}</td>
                          <td className="py-3.5 px-4 font-bold text-slate-700 whitespace-nowrap">{trx.kelas}</td>
                          <td className="py-3.5 px-4 font-extrabold text-emerald-800 whitespace-nowrap">{trx.month}</td>
                          <td className="py-3.5 px-4 font-black text-slate-900 whitespace-nowrap">{formatRupiah(trx.amount)}</td>
                          <td className="py-3.5 px-4 text-slate-700 font-semibold whitespace-nowrap">{trx.method}</td>
                          <td className="py-3.5 px-4 text-center whitespace-nowrap">
                            {isLunas ? (
                              <span className="status-pill-lunas">
                                <Icon name="check" size={11} /> Lunas
                              </span>
                            ) : (
                              <span className="status-pill-menunggu">
                                <Icon name="clock" size={11} /> Menunggu
                              </span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-slate-600 font-bold whitespace-nowrap">{formatDateIndo(trx.date)}</td>
                          <td className="py-3.5 px-4 text-center whitespace-nowrap">
                            <button
                              onClick={() => onShowKuitansi(trx)}
                              className="btn-print-kuitansi"
                              title="Cetak Kuitansi Sah"
                            >
                              <Icon name="printer" size={13} />
                              <span>Cetak Kuitansi</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan="9" className="text-center py-8 text-slate-400 font-bold">
                        Belum ada riwayat transaksi pembayaran tercatat.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      );
    }

    // ==========================================
    // 7. MANAJEMEN PENGADUAN (DENGAN GROUPING SUB-PERCAKAPAN PER SISWA)
    // ==========================================
    function AdminPengaduanView({ complaints, onReplyComplaint, onToggleComplaintStatus, onMarkAsRead }) {
      const [activeChatId, setActiveChatId] = useState(null);
      const [replyText, setReplyText] = useState('');
      const [nowMs, setNowMs] = useState(Date.now());
      const [expandedStudents, setExpandedStudents] = useState({});
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

      // Grouping Riwayat Terkunci Per Siswa (Agar rapi & tidak berantakan)
      const groupedExpired = useMemo(() => {
        const map = {};
        expiredComplaints.forEach(c => {
          const rawName = (c.studentName || 'Wali Murid').trim();
          const key = rawName.toLowerCase();
          if (!map[key]) {
            map[key] = {
              key,
              studentName: rawName,
              waliName: c.waliName || 'Wali Murid',
              items: []
            };
          }
          map[key].items.push(c);
        });
        return Object.values(map);
      }, [expiredComplaints]);

      const toggleStudent = (key) => {
        setExpandedStudents(prev => ({ ...prev, [key]: !prev[key] }));
      };

      const handleSelectChat = (c) => {
        if (!c) return;
        setActiveChatId(c.id);
        if (onMarkAsRead) {
          onMarkAsRead('complaint', c.id);
        }
      };

      useEffect(() => {
        if (!activeChatId && activeComplaints.length > 0 && typeof window !== 'undefined' && window.innerWidth >= 768) {
          handleSelectChat(activeComplaints[0]);
        }
      }, [activeComplaints.length]);

      const activeChat = complaints.find(c => c.id === activeChatId);

      return (
        <div className="h-[calc(100vh-6rem)] animate-in fade-in duration-300 flex flex-col md:flex-row gap-4">
          
          {/* LEFT SIDEBAR: CHAT LIST (WhatsApp Mobile Responsive Layout) */}
          <div className={`w-full md:w-80 lg:w-96 bg-white rounded-3xl border border-slate-200 shadow-sm flex-col overflow-hidden shrink-0 ${activeChatId ? 'hidden md:flex' : 'flex'}`}>
             <div className="p-4 sm:p-5 border-b border-slate-100 bg-slate-50/80 flex items-center justify-between">
               <div>
                 <h2 className="text-base sm:text-lg font-black text-slate-800 flex items-center gap-2">
                   <Icon name="message-square" size={20} className="text-emerald-600"/> Pesan Pengaduan
                 </h2>
                 <p className="text-[11px] text-slate-500 font-medium mt-0.5">Sesi live chat aktif selama 1 jam.</p>
               </div>
               <span className="px-2.5 py-1 rounded-full text-xs font-black bg-emerald-100 text-emerald-800">
                 {activeComplaints.length} Live
               </span>
             </div>
             
             <div className="flex-1 overflow-y-auto p-3 space-y-4">
                {/* 1. SECTION LIVE CHAT (AKTIF < 1 JAM) */}
                <div>
                  <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2 px-2 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    Live Chat Aktif ({activeComplaints.length})
                  </h3>
                  {activeComplaints.length === 0 && (
                    <div className="p-4 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                      <p className="text-xs text-slate-400 font-bold italic">Tidak ada chat aktif saat ini.</p>
                    </div>
                  )}
                  <div className="space-y-2">
                    {activeComplaints.map(c => {
                      const isSelected = activeChatId === c.id;
                      const remainingMinutes = Math.max(0, Math.floor((c.expiresAtMs - nowMs) / 60000));
                      const lastMsg = c.messages && c.messages.length > 0 ? c.messages[c.messages.length - 1] : null;

                      return (
                        <div 
                          key={c.id} 
                          onClick={() => handleSelectChat(c)}
                          className={`p-3.5 rounded-2xl cursor-pointer transition-all border ${
                            isSelected 
                              ? 'bg-emerald-50 border-emerald-300 shadow-sm ring-2 ring-emerald-400/20' 
                              : 'bg-white border-slate-100 hover:bg-slate-50 hover:border-slate-200'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-2 truncate">
                              <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-black text-xs shrink-0">
                                {c.studentName ? c.studentName.charAt(0).toUpperCase() : 'W'}
                              </div>
                              <h4 className="font-black text-slate-800 text-sm truncate">{c.studentName}</h4>
                            </div>
                            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shrink-0"></span>
                          </div>
                          
                          <p className="text-xs font-black text-slate-700 truncate pl-10">{c.title}</p>
                          {lastMsg && (
                            <p className="text-xs text-slate-500 truncate pl-10 mt-0.5 font-medium">
                              <span className="font-bold text-slate-600">{lastMsg.sender === 'Admin TU' ? 'Anda: ' : ''}</span>
                              {lastMsg.text}
                            </p>
                          )}
                          
                          <div className="flex items-center justify-between mt-2 pl-10 text-[10px] text-slate-400 font-bold">
                            <span className="flex items-center gap-1 text-emerald-600 bg-emerald-100/60 px-2 py-0.5 rounded-full font-mono font-bold">
                              <Icon name="clock" size={10} /> Sisa {remainingMinutes} mnt
                            </span>
                            <span>{formatDateIndo(c.date)}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* 2. SECTION RIWAYAT PENGADUAN TERKUNCI (DIGROUPING PER SISWA) */}
                <div className="pt-2 border-t border-slate-100">
                  <div className="flex items-center justify-between px-2 mb-2">
                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
                      Riwayat Terkunci ({expiredComplaints.length})
                    </h3>
                    <span className="text-[10px] font-bold text-slate-400">
                      {groupedExpired.length} Wali Siswa
                    </span>
                  </div>

                  {groupedExpired.length === 0 ? (
                    <p className="text-xs text-slate-400 italic text-center py-3">Belum ada riwayat pengaduan tersimpan.</p>
                  ) : (
                    <div className="space-y-2">
                      {groupedExpired.map(group => {
                        const isExpanded = expandedStudents[group.key] ?? false;
                        const hasSelectedChild = group.items.some(i => i.id === activeChatId);

                        return (
                          <div 
                            key={group.key}
                            className={`rounded-2xl border transition-all overflow-hidden ${
                              hasSelectedChild 
                                ? 'border-blue-300 bg-blue-50/30 shadow-xs' 
                                : 'border-slate-200 bg-slate-50/70 hover:bg-slate-50'
                            }`}
                          >
                            {/* Accordion Header: Profil Siswa & Total Sub Pesan */}
                            <button
                              type="button"
                              onClick={() => toggleStudent(group.key)}
                              className="w-full p-3 flex items-center justify-between text-left transition-colors"
                            >
                              <div className="flex items-center gap-2.5 truncate">
                                <div className="w-8 h-8 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center font-extrabold text-xs shrink-0">
                                  {group.studentName ? group.studentName.charAt(0).toUpperCase() : 'W'}
                                </div>
                                <div className="min-w-0">
                                  <h4 className="font-extrabold text-slate-800 text-xs truncate">
                                    {group.studentName}
                                  </h4>
                                  <p className="text-[10px] text-slate-400 font-medium truncate">
                                    {group.waliName || 'Wali Murid'}
                                  </p>
                                </div>
                              </div>

                              <div className="flex items-center gap-2 shrink-0">
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-slate-200 text-slate-700 flex items-center gap-1">
                                  <Icon name="lock" size={10} />
                                  {group.items.length} Pesan
                                </span>
                                <Icon 
                                  name={isExpanded ? 'chevron-up' : 'chevron-down'} 
                                  size={14} 
                                  className="text-slate-400" 
                                />
                              </div>
                            </button>

                            {/* Sub-Pesan Pesan Terkunci (Hanya Tampil Jika Accordion Dibuka) */}
                            {isExpanded && (
                              <div className="px-2 pb-2 space-y-1.5 border-t border-slate-200/60 pt-2 animate-in fade-in duration-150">
                                {group.items.map(c => {
                                  const isSelected = activeChatId === c.id;
                                  const lastMsg = c.messages && c.messages.length > 0 ? c.messages[c.messages.length - 1] : null;

                                  return (
                                    <div
                                      key={c.id}
                                      onClick={() => handleSelectChat(c)}
                                      className={`p-2.5 rounded-xl cursor-pointer transition-all border text-left ${
                                        isSelected
                                          ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                                          : 'bg-white hover:bg-slate-100 border-slate-200 text-slate-700'
                                      }`}
                                    >
                                      <div className="flex items-center justify-between mb-0.5">
                                        <p className={`text-xs font-black truncate ${isSelected ? 'text-white' : 'text-slate-800'}`}>
                                          {c.title}
                                        </p>
                                        <span className={`text-[9px] font-bold shrink-0 ml-1.5 ${isSelected ? 'text-blue-100' : 'text-slate-400'}`}>
                                          {formatDateIndo(c.date)}
                                        </span>
                                      </div>

                                      {lastMsg && (
                                        <p className={`text-[11px] truncate ${isSelected ? 'text-blue-100' : 'text-slate-500'}`}>
                                          {lastMsg.sender === 'Admin TU' ? 'Anda: ' : ''}{lastMsg.text}
                                        </p>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
             </div>
          </div>

          {/* RIGHT SIDE: CHAT WINDOW */}
          <div className={`w-full flex-1 bg-white rounded-3xl border border-slate-200 shadow-sm flex-col overflow-hidden ${!activeChatId ? 'hidden md:flex' : 'flex'}`}>
            {!activeChat ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-slate-50/50">
                <div className="w-20 h-20 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mb-4 border border-emerald-100 shadow-inner">
                  <Icon name="message-circle" size={40} />
                </div>
                <h3 className="text-xl font-black text-slate-800">Pilih Percakapan Chat</h3>
                <p className="text-sm text-slate-500 mt-2 font-medium max-w-sm">Pilih pesan pengaduan di panel sebelah kiri untuk membalas obrolan wali murid secara real-time.</p>
              </div>
            ) : (
              <>
                {/* Chat Top Header with Mobile Back Button */}
                <div className={`p-4 sm:p-5 border-b flex items-center justify-between shrink-0 ${nowMs <= activeChat.expiresAtMs ? 'bg-emerald-50/60 border-emerald-100' : 'bg-slate-100 border-slate-200'}`}>
                  <div className="flex items-center gap-3 min-w-0">
                    <button
                      onClick={() => setActiveChatId(null)}
                      className="md:hidden p-2 bg-white hover:bg-slate-100 text-slate-700 rounded-xl transition-colors shrink-0 border border-slate-200 flex items-center justify-center shadow-sm"
                      title="Kembali ke Daftar Chat"
                    >
                      <Icon name="arrow-left" size={18} />
                    </button>
                    <div className="min-w-0">
                      <h3 className="font-black text-slate-900 text-base sm:text-lg truncate">{activeChat.title}</h3>
                      <p className="text-xs text-slate-600 font-bold truncate mt-0.5">Siswa: <span className="text-emerald-700">{activeChat.studentName}</span> • Wali: {activeChat.waliName || 'Wali Murid'}</p>
                    </div>
                  </div>

                  <div className="shrink-0 ml-2">
                    {nowMs <= activeChat.expiresAtMs ? (
                       <div className="bg-emerald-600 text-white px-3 py-1.5 rounded-xl text-xs font-black shadow-sm flex items-center gap-1.5">
                         <span className="w-2 h-2 rounded-full bg-white animate-pulse"></span>
                         LIVE CHAT
                       </div>
                    ) : (
                       <div className="bg-slate-200 text-slate-700 px-3 py-1.5 rounded-xl text-xs font-black border border-slate-300 flex items-center gap-1.5">
                         <Icon name="lock" size={14} /> EXPIRED
                       </div>
                    )}
                  </div>
                </div>
                
                {/* WhatsApp Chat Body */}
                <div className="flex-1 p-4 sm:p-6 overflow-y-auto bg-[#f0f4f8] space-y-4">
                  <div className="text-center my-3">
                    <span className="bg-white/80 backdrop-blur-sm text-slate-500 text-[10px] font-black uppercase px-3.5 py-1.5 rounded-full border border-slate-200 shadow-sm">
                      Sesi Obrolan Dibuka: {formatDateIndo(activeChat.date)}
                    </span>
                  </div>

                  {activeChat.messages && activeChat.messages.map((msg, i) => {
                    const isAdmin = msg.sender === 'Admin TU';
                    return (
                      <div key={i} className={`flex flex-col ${isAdmin ? 'items-end' : 'items-start'}`}>
                         <div className={`max-w-[88%] sm:max-w-[75%] p-3.5 sm:p-4 rounded-2xl shadow-sm ${
                           isAdmin 
                             ? 'bg-emerald-600 text-white rounded-tr-xs' 
                             : 'bg-white border border-slate-200/90 rounded-tl-xs text-slate-800'
                         }`}>
                           <div className="flex items-center gap-1.5 mb-1 opacity-80">
                             <Icon name={isAdmin ? 'shield-check' : 'user'} size={12} />
                             <span className="text-[10px] font-black uppercase tracking-wider">{msg.sender}</span>
                           </div>
                           <p className="text-xs sm:text-sm font-semibold leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                           {msg.imageUrl && (
                             <div className="mt-2.5">
                               <img 
                                 src={msg.imageUrl} 
                                 alt="Lampiran" 
                                 className="max-w-full max-h-64 object-cover rounded-xl shadow-md border border-slate-200 cursor-pointer hover:opacity-95 transition-opacity" 
                                 onClick={() => setPreviewImage(msg.imageUrl)} 
                               />
                             </div>
                           )}
                         </div>
                         <span className="text-[10px] text-slate-500 font-bold mt-1 px-1">{formatDateTimeIndo(msg.time, activeChat.date)}</span>
                      </div>
                    );
                  })}
                  <div ref={chatEndRef} />
                </div>
                
                {/* Chat Input Bar */}
                <div className="p-3.5 sm:p-4 bg-white border-t border-slate-200 shrink-0">
                  {nowMs <= activeChat.expiresAtMs ? (
                    <div className="flex items-center gap-2">
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
                      <button 
                        type="button" 
                        onClick={() => document.getElementById(`admin_file_${activeChat.id}`).click()} 
                        className="p-3 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl transition-colors flex items-center justify-center shrink-0"
                        title="Kirim Lampiran Gambar"
                      >
                        <Icon name="paperclip" size={18} />
                      </button>
                      <input 
                        type="text" 
                        value={replyText} 
                        onChange={(e) => setReplyText(e.target.value)} 
                        placeholder="Ketik balasan Anda..." 
                        className="flex-1 px-4 py-3 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500" 
                        onKeyDown={e => {
                          if(e.key === 'Enter' && replyText.trim()) {
                            onReplyComplaint(activeChat.id, replyText.trim(), 'Admin TU');
                            setReplyText('');
                          }
                        }}
                      />
                      <button 
                        type="button"
                        onClick={() => {
                          if(replyText.trim()) {
                            onReplyComplaint(activeChat.id, replyText.trim(), 'Admin TU');
                            setReplyText('');
                          }
                        }} 
                        className="px-4 sm:px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-md transition-colors flex items-center justify-center gap-2 font-black shrink-0 text-xs sm:text-sm"
                      >
                        <Icon name="send" size={18} /> <span className="hidden sm:inline">Kirim</span>
                      </button>
                    </div>
                  ) : (
                    <div className="w-full py-3 bg-slate-100 border border-slate-200 rounded-xl text-center text-slate-500 text-xs font-bold flex items-center justify-center gap-2">
                      <Icon name="lock" size={14} /> Sesi live chat 1 jam telah berakhir (Expired)
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
      const [newClassTarif, setNewClassTarif] = useState('');
      const isDirtyRef = useRef(false);

      // State untuk Form Tambah Preset Periode Manual
      const [newPresetName, setNewPresetName] = useState('');
      const [newPresetStartMonth, setNewPresetStartMonth] = useState('Juli');
      const [newPresetStartYear, setNewPresetStartYear] = useState(2026);
      const [newPresetEndMonth, setNewPresetEndMonth] = useState('Juni');
      const [newPresetEndYear, setNewPresetEndYear] = useState(2027);
      const [newPresetSemester, setNewPresetSemester] = useState('Semua');

      useEffect(() => {
        if (!isDirtyRef.current) {
          setFormData({ ...settings });
          setNewAdminPassword('');
        }
      }, [settings]);

      // Helper untuk merubah formData sekaligus menjaga isDirtyRef & auto activePeriodName
      const updateFormState = (patch) => {
        isDirtyRef.current = true;
        setFormData((prev) => {
          const next = { ...prev, ...patch };
          const semTag = (next.semester && next.semester !== 'Semua') ? ` (${next.semester})` : '';
          const autoName = `Periode ${next.startMonth || 'Juli'} ${next.startYear || 2025} - ${next.endMonth || 'Juni'} ${next.endYear || 2026}${semTag}`;
          return {
            ...next,
            activePeriodName: autoName
          };
        });
      };

      const handleAddClass = () => {
        if (!newClassName.trim()) return;
        isDirtyRef.current = false;
        const updatedClasses = [...(formData.customClasses || []), { name: newClassName.trim(), tarif: Number(newClassTarif) || 0 }];
        const updated = { ...formData, customClasses: updatedClasses };
        setFormData(updated);
        onSaveSettings(updated);
        setNewClassName('');
        setNewClassTarif('');
      };

      const handleDeleteClass = (idx) => {
        isDirtyRef.current = false;
        const updatedClasses = (formData.customClasses || []).filter((_, i) => i !== idx);
        const updated = { ...formData, customClasses: updatedClasses };
        setFormData(updated);
        onSaveSettings(updated);
      };

      const handleUpdateClass = (idx, field, value) => {
        isDirtyRef.current = true;
        const updatedClasses = [...(formData.customClasses || [])];
        updatedClasses[idx] = {
          ...updatedClasses[idx],
          [field]: field === 'tarif' ? (Number(value) || 0) : value
        };
        const updated = { ...formData, customClasses: updatedClasses };
        setFormData(updated);
      };

      // Tambah Preset Periode Baru secara Manual
      const handleAddPresetManual = () => {
        isDirtyRef.current = false;
        const sM = newPresetStartMonth || 'Juli';
        const sY = Number(newPresetStartYear) || 2026;
        const eM = newPresetEndMonth || 'Juni';
        const eY = Number(newPresetEndYear) || 2027;
        const sem = newPresetSemester || 'Semua';
        const semTag = (sem && sem !== 'Semua') ? ` (${sem})` : '';
        const name = newPresetName.trim() || `Periode ${sM} ${sY} - ${eM} ${eY}${semTag}`;

        const newPeriod = {
          id: Date.now().toString(),
          name: name,
          startMonth: sM,
          startYear: sY,
          endMonth: eM,
          endYear: eY,
          semester: sem,
          isActive: false
        };

        const existingPeriods = formData.academicPeriods || [];
        const updatedPeriods = [...existingPeriods, newPeriod];

        const updatedFormData = {
          ...formData,
          academicPeriods: updatedPeriods
        };

        setFormData(updatedFormData);
        onSaveSettings(updatedFormData);
        setNewPresetName('');
      };

      // Edit langsung item preset di daftar
      const handleUpdatePresetField = (idx, field, value) => {
        isDirtyRef.current = true;
        const updatedPeriods = [...(formData.academicPeriods || [])];
        const val = (field === 'startYear' || field === 'endYear') ? (Number(value) || 0) : value;
        updatedPeriods[idx] = {
          ...updatedPeriods[idx],
          [field]: val
        };

        let updatedFormData = { ...formData, academicPeriods: updatedPeriods };
        if (updatedPeriods[idx].isActive) {
          const semTag = (updatedPeriods[idx].semester && updatedPeriods[idx].semester !== 'Semua') ? ` (${updatedPeriods[idx].semester})` : '';
          const autoName = updatedPeriods[idx].name || `Periode ${updatedPeriods[idx].startMonth} ${updatedPeriods[idx].startYear} - ${updatedPeriods[idx].endMonth} ${updatedPeriods[idx].endYear}${semTag}`;
          updatedFormData = {
            ...updatedFormData,
            activePeriodName: autoName,
            startMonth: updatedPeriods[idx].startMonth,
            startYear: updatedPeriods[idx].startYear,
            endMonth: updatedPeriods[idx].endMonth,
            endYear: updatedPeriods[idx].endYear,
            semester: updatedPeriods[idx].semester
          };
        }

        setFormData(updatedFormData);
      };

      const handleSaveCurrentAsPreset = () => {
        isDirtyRef.current = false;
        const sM = formData.startMonth || 'Juli';
        const sY = parseInt(formData.startYear) || 2025;
        const eM = formData.endMonth || 'Juni';
        const eY = parseInt(formData.endYear) || (sY + 1);
        const sem = formData.semester || 'Semua';
        const semTag = (sem && sem !== 'Semua') ? ` (${sem})` : '';
        const newName = `Periode ${sM} ${sY} - ${eM} ${eY}${semTag}`;
        
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
        isDirtyRef.current = false;
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
        isDirtyRef.current = false;
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
        isDirtyRef.current = false;
        const semTag = (formData.semester && formData.semester !== 'Semua') ? ` (${formData.semester})` : '';
        const autoName = `Periode ${formData.startMonth || 'Juli'} ${formData.startYear || 2025} - ${formData.endMonth || 'Juni'} ${formData.endYear || 2026}${semTag}`;
        const payload = {
          ...formData,
          activePeriodName: autoName
        };
        if (newAdminPassword && newAdminPassword.trim().length > 0) {
          payload.adminPassword = newAdminPassword.trim();
        }
        onSaveSettings(payload);
        setNewAdminPassword('');
      };

      return (
        <div className="bg-white p-4 sm:p-7 md:p-9 rounded-2xl sm:rounded-3xl border border-slate-200/90 shadow-sm space-y-6 sm:space-y-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5 border-b border-slate-100">
            <div className="flex items-start gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center shadow-lg shadow-blue-500/25 shrink-0">
                <Icon name="sliders" size={24} />
              </div>
              <div>
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">Pengaturan Aplikasi & Periode SPP</h2>
                <p className="text-xs text-slate-500 font-medium mt-0.5">Konfigurasi identitas sekolah, periode aktif ajaran, kredensial login admin, gateway pembayaran, serta rombel kelompok kelas.</p>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6 text-xs">
            {/* 1. Informasi Sekolah & Administrator */}
            <div className="p-4 sm:p-6 bg-gradient-to-br from-slate-50 to-blue-50/30 rounded-2xl sm:rounded-3xl border border-slate-200/90 space-y-4 sm:space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200/70">
                <h3 className="font-black text-slate-800 text-sm sm:text-base flex items-center gap-2.5">
                  <span className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center shadow-inner">
                    <Icon name="school" size={17} />
                  </span>
                  <span>Identitas Sekolah & Akun Admin TU</span>
                </h3>
                <span className="text-[11px] font-extrabold text-blue-700 bg-blue-100/70 px-2.5 py-0.5 rounded-full">
                  Konfigurasi Utama
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 sm:gap-4">
                <div>
                  <label className="flex items-center gap-1.5 font-bold text-slate-700 uppercase tracking-wider text-[11px] mb-1.5">
                    <Icon name="building" size={13} className="text-blue-600" />
                    <span>Nama Lembaga / Sekolah</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.schoolName || ''}
                    onChange={(e) => { isDirtyRef.current = true; setFormData({ ...formData, schoolName: e.target.value }); }}
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-600 shadow-2xs text-xs"
                    placeholder="Contoh: PAUD SETIA BHAKTI"
                  />
                </div>

                <div>
                  <label className="flex items-center gap-1.5 font-bold text-slate-700 uppercase tracking-wider text-[11px] mb-1.5">
                    <Icon name="calendar" size={13} className="text-blue-600" />
                    <span>Tahun Ajaran Default</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.academicYear || ''}
                    onChange={(e) => { isDirtyRef.current = true; setFormData({ ...formData, academicYear: e.target.value }); }}
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-600 shadow-2xs text-xs"
                    placeholder="Contoh: 2025/2026"
                  />
                </div>

                <div>
                  <label className="flex items-center gap-1.5 font-bold text-slate-700 uppercase tracking-wider text-[11px] mb-1.5">
                    <Icon name="map-pin" size={13} className="text-blue-600" />
                    <span>Alamat Lengkap Sekolah</span>
                  </label>
                  <input
                    type="text"
                    value={formData.address || ''}
                    onChange={(e) => { isDirtyRef.current = true; setFormData({ ...formData, address: e.target.value }); }}
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-600 shadow-2xs text-xs"
                    placeholder="Alamat sekolah..."
                  />
                </div>

                <div>
                  <label className="flex items-center gap-1.5 font-bold text-slate-700 uppercase tracking-wider text-[11px] mb-1.5">
                    <Icon name="phone" size={13} className="text-emerald-600" />
                    <span>No. Kontak Resmi TU / WhatsApp</span>
                  </label>
                  <input
                    type="text"
                    value={formData.phone || ''}
                    onChange={(e) => { isDirtyRef.current = true; setFormData({ ...formData, phone: e.target.value }); }}
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-600 shadow-2xs text-xs"
                    placeholder="08123456789"
                  />
                </div>

                <div>
                  <label className="flex items-center gap-1.5 font-bold text-slate-700 uppercase tracking-wider text-[11px] mb-1.5">
                    <Icon name="user-check" size={13} className="text-indigo-600" />
                    <span>Nama Admin / Kasir TU</span>
                  </label>
                  <input
                    type="text"
                    value={formData.adminName || ''}
                    onChange={(e) => { isDirtyRef.current = true; setFormData({ ...formData, adminName: e.target.value }); }}
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-600 shadow-2xs text-xs"
                    placeholder="Nama Admin TU"
                  />
                </div>

                <div>
                  <label className="flex items-center gap-1.5 font-bold text-slate-700 uppercase tracking-wider text-[11px] mb-1.5">
                    <Icon name="user" size={13} className="text-indigo-600" />
                    <span>Username Login Admin</span>
                  </label>
                  <input
                    type="text"
                    value={formData.adminUsername || ''}
                    onChange={(e) => { isDirtyRef.current = true; setFormData({ ...formData, adminUsername: e.target.value }); }}
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-600 shadow-2xs text-xs"
                    placeholder="Username login"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="flex items-center gap-1.5 font-bold text-slate-700 uppercase tracking-wider text-[11px]">
                      <Icon name="lock" size={13} className="text-amber-600" />
                      <span>Ganti Password Admin <span className="normal-case text-slate-400 font-normal">(Opsional)</span></span>
                    </label>
                  </div>
                  <input
                    type="password"
                    placeholder="Kosongkan jika tidak mau mengubah password"
                    value={newAdminPassword}
                    onChange={(e) => { isDirtyRef.current = true; setNewAdminPassword(e.target.value); }}
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-600 shadow-2xs text-xs"
                  />
                </div>

                <div>
                  <label className="flex items-center gap-1.5 font-bold text-slate-700 uppercase tracking-wider text-[11px] mb-1.5">
                    <Icon name="clock" size={13} className="text-purple-600" />
                    <span>Tanggal Jatuh Tempo SPP (Tiap Bulan)</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="31"
                    value={formData.dueDateDay || 10}
                    onChange={(e) => { isDirtyRef.current = true; setFormData({ ...formData, dueDateDay: parseInt(e.target.value) || 10 }); }}
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-600 shadow-2xs text-xs"
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
                <label className="block font-bold text-slate-700 uppercase mb-1 flex items-center justify-between">
                  <span>Nama Periode SPP Aktif</span>
                  <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                    <Icon name="lock" size={11} /> Otomatis Mengikuti Periode Aktif
                  </span>
                </label>
                <input
                  type="text"
                  readOnly
                  disabled
                  value={formData.activePeriodName || `Periode ${formData.startMonth || 'Juli'} ${formData.startYear || 2025} - ${formData.endMonth || 'Juni'} ${formData.endYear || 2026}${formData.semester && formData.semester !== 'Semua' ? ` (${formData.semester})` : ''}`}
                  placeholder="Otomatis mengikuti rentang periode"
                  className="w-full px-3.5 py-2.5 bg-slate-100 border border-emerald-200 rounded-xl font-bold text-slate-600 cursor-not-allowed focus:outline-none"
                />
              </div>

              {/* Input Rentang Periode Aktif */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">Bulan Mulai</label>
                  <select
                    value={formData.startMonth || 'Juli'}
                    onChange={(e) => updateFormState({ startMonth: e.target.value })}
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
                    onChange={(e) => updateFormState({ startYear: parseInt(e.target.value) || 2025 })}
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">Bulan Akhir</label>
                  <select
                    value={formData.endMonth || 'Juni'}
                    onChange={(e) => updateFormState({ endMonth: e.target.value })}
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
                    onChange={(e) => updateFormState({ endYear: parseInt(e.target.value) || 2026 })}
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">Pilihan Semester</label>
                  <select
                    value={formData.semester || 'Semua'}
                    onChange={(e) => updateFormState({ semester: e.target.value })}
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
                    updateFormState({
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
                    updateFormState({
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
                    updateFormState({
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
              <div className="pt-4 border-t border-emerald-100/80 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-extrabold text-xs uppercase tracking-wider text-emerald-900 flex items-center gap-1.5">
                      <Icon name="list" size={14} className="text-emerald-700" />
                      Daftar Pilihan Preset Periode Ajaran (Bisa Diisi & Disimpan ke Database)
                    </h4>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Kelola daftar preset periode tersimpan. Anda dapat mengedit nama & rentang periode langsung di bawah ini.
                    </p>
                  </div>
                  <span className="text-[11px] text-emerald-800 font-bold bg-emerald-100 px-2.5 py-1 rounded-full">
                    {(formData.academicPeriods || []).length} Preset Tersimpan
                  </span>
                </div>

                {/* List Preset Tersimpan dengan Editable Form Controls */}
                <div className="space-y-3">
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
                        <div key={p.id || idx} className={`p-3.5 rounded-2xl border transition-all ${isSelected ? 'bg-emerald-100/80 border-emerald-400 shadow-sm' : 'bg-white border-slate-200 hover:border-slate-300'}`}>
                          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                            <div className="flex items-start sm:items-center gap-3 flex-1 min-w-[240px]">
                              <span className={`w-7 h-7 rounded-xl font-black text-xs flex items-center justify-center shrink-0 ${isSelected ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
                                {idx + 1}
                              </span>
                              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 flex-1">
                                <div className="sm:col-span-2">
                                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-0.5">Nama Preset Periode</label>
                                  <input
                                    type="text"
                                    value={p.name || ''}
                                    onChange={(e) => handleUpdatePresetField(idx, 'name', e.target.value)}
                                    placeholder="Nama Preset Periode"
                                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-900 focus:bg-white text-xs"
                                  />
                                </div>

                                <div>
                                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-0.5">Mulai (Bulan & Thn)</label>
                                  <div className="flex gap-1">
                                    <select
                                      value={p.startMonth || 'Juli'}
                                      onChange={(e) => handleUpdatePresetField(idx, 'startMonth', e.target.value)}
                                      className="w-1/2 px-2 py-1.5 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-900 text-xs"
                                    >
                                      {ALL_MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
                                    </select>
                                    <input
                                      type="number"
                                      value={p.startYear || 2025}
                                      onChange={(e) => handleUpdatePresetField(idx, 'startYear', e.target.value)}
                                      className="w-1/2 px-2 py-1.5 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-900 text-xs"
                                    />
                                  </div>
                                </div>

                                <div>
                                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-0.5">Akhir & Semester</label>
                                  <div className="flex gap-1">
                                    <select
                                      value={p.endMonth || 'Juni'}
                                      onChange={(e) => handleUpdatePresetField(idx, 'endMonth', e.target.value)}
                                      className="w-1/2 px-2 py-1.5 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-900 text-xs"
                                    >
                                      {ALL_MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
                                    </select>
                                    <input
                                      type="number"
                                      value={p.endYear || 2026}
                                      onChange={(e) => handleUpdatePresetField(idx, 'endYear', e.target.value)}
                                      className="w-1/2 px-2 py-1.5 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-900 text-xs"
                                    />
                                  </div>
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 justify-end pt-1 lg:pt-0 border-t lg:border-t-0 border-slate-100">
                              <select
                                value={p.semester || 'Semua'}
                                onChange={(e) => handleUpdatePresetField(idx, 'semester', e.target.value)}
                                className="px-2.5 py-1.5 bg-blue-50 border border-blue-200 text-blue-900 font-bold rounded-xl text-xs"
                              >
                                <option value="Semua">Semua Sem</option>
                                <option value="Semester 1">Semester 1</option>
                                <option value="Semester 2">Semester 2</option>
                              </select>

                              {isSelected ? (
                                <span className="px-3 py-1.5 bg-emerald-600 text-white font-black text-[10px] rounded-xl flex items-center gap-1 shadow-xs">
                                  <Icon name="check" size={12} /> Aktif
                                </span>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => handleApplyPreset(p)}
                                  className="px-3 py-1.5 bg-white hover:bg-emerald-50 text-emerald-700 font-extrabold border border-emerald-300 rounded-xl text-[10px] transition-colors shadow-2xs"
                                >
                                  Terapkan
                                </button>
                              )}

                              <button
                                type="button"
                                onClick={() => handleDeletePreset(idx, p.name)}
                                className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-xl transition-colors"
                                title="Hapus Preset"
                              >
                                <Icon name="trash-2" size={15} />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="p-4 bg-white rounded-xl border border-dashed border-emerald-200 text-center text-slate-400 text-xs">
                      Belum ada preset tersimpan di database. Gunakan form di bawah untuk menambah preset baru.
                    </div>
                  )}
                </div>

                {/* Form Manual Tambah Preset Baru */}
                <div className="p-4 bg-white rounded-2xl border border-emerald-200 space-y-3">
                  <h5 className="font-extrabold text-slate-800 text-xs flex items-center gap-1.5">
                    <Icon name="plus-circle" size={15} className="text-emerald-600" />
                    Tambah Preset Periode Baru Manual
                  </h5>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
                    <div className="lg:col-span-2">
                      <label className="text-[10px] font-bold text-slate-600 uppercase block mb-1">Nama Preset Periode</label>
                      <input
                        type="text"
                        placeholder="Contoh: Periode 2026/2027"
                        value={newPresetName}
                        onChange={(e) => setNewPresetName(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-900 text-xs"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-600 uppercase block mb-1">Bulan Mulai</label>
                      <select
                        value={newPresetStartMonth}
                        onChange={(e) => setNewPresetStartMonth(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-900 text-xs"
                      >
                        {ALL_MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-600 uppercase block mb-1">Tahun Mulai</label>
                      <input
                        type="number"
                        value={newPresetStartYear}
                        onChange={(e) => setNewPresetStartYear(parseInt(e.target.value) || 2026)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-900 text-xs"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-600 uppercase block mb-1">Bulan Akhir</label>
                      <select
                        value={newPresetEndMonth}
                        onChange={(e) => setNewPresetEndMonth(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-900 text-xs"
                      >
                        {ALL_MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-600 uppercase block mb-1">Tahun Akhir</label>
                      <input
                        type="number"
                        value={newPresetEndYear}
                        onChange={(e) => setNewPresetEndYear(parseInt(e.target.value) || 2027)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-900 text-xs"
                      />
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                    <div className="flex items-center gap-2">
                      <label className="text-[10px] font-bold text-slate-600 uppercase">Semester:</label>
                      <select
                        value={newPresetSemester}
                        onChange={(e) => setNewPresetSemester(e.target.value)}
                        className="px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-900 text-xs"
                      >
                        <option value="Semua">Semua Semester</option>
                        <option value="Semester 1">Semester 1 (Ganjil)</option>
                        <option value="Semester 2">Semester 2 (Genap)</option>
                      </select>
                    </div>

                    <button
                      type="button"
                      onClick={handleAddPresetManual}
                      className="py-2 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-xl text-xs transition-colors flex items-center gap-1.5 shadow-sm"
                    >
                      <Icon name="plus" size={14} /> + Tambah Preset Periode Baru
                    </button>
                  </div>
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
                    onChange={(e) => { isDirtyRef.current = true; setFormData({ ...formData, midtransClientKey: e.target.value }); }}
                    placeholder="SB-Mid-client-..."
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl font-mono text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">Midtrans Server Key</label>
                  <input
                    type="password"
                    value={formData.midtransServerKey || ''}
                    onChange={(e) => { isDirtyRef.current = true; setFormData({ ...formData, midtransServerKey: e.target.value }); }}
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
                        <div className="relative flex items-center">
                          <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none font-black text-slate-500 text-xs">Rp</span>
                          <input
                            type="text"
                            value={formatInputNumber(cls.tarif)}
                            onChange={(e) => handleUpdateClass(idx, 'tarif', parseNumberOnly(e.target.value))}
                            placeholder="0"
                            className="w-36 pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl font-black text-emerald-700 text-right focus:bg-white focus:border-teal-500 focus:outline-none text-xs"
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
                <div className="relative flex items-center">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none font-black text-slate-500 text-sm">
                    Rp
                  </span>
                  <input
                    type="text"
                    placeholder="1.200.000"
                    value={formatInputNumber(newClassTarif)}
                    onChange={(e) => setNewClassTarif(parseNumberOnly(e.target.value))}
                    className="w-40 pl-11 pr-3.5 py-2 bg-white border border-slate-300 rounded-xl font-black text-slate-900 text-right focus:border-teal-500 focus:outline-none shadow-inner"
                  />
                </div>
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
                  <img src="logo.webp" alt="PAUD Setia Bhakti" className="w-full h-full object-contain" />
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
                <span className="font-semibold text-slate-800">: {formatDateIndo(transaction.date || '-')}</span>
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
                <div className="flex items-center gap-1.5 text-right">
                  <span className="text-slate-800">:</span>
                  <span className="font-black text-slate-900 text-sm">{formatRupiah(transaction.amount)}</span>
                  {Boolean(transaction.keringananNote) && (
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300">
                      *keringanan
                    </span>
                  )}
                </div>
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
                <div className="flex items-center gap-1.5 text-right">
                  <span className="font-bold text-slate-800">: {formatRupiah(transaction.amount)}</span>
                  {Boolean(transaction.keringananNote) && (
                    <span className="text-[10px] font-black text-emerald-700 italic">*keringanan</span>
                  )}
                </div>
              </div>

              {Boolean(transaction.keringananNote) && (
                <div className="flex items-start justify-between text-[11px] bg-emerald-50/80 p-2 rounded-xl border border-emerald-200">
                  <span className="text-emerald-700 font-bold">Keterangan:</span>
                  <span className="font-extrabold text-emerald-800 text-right">{transaction.keringananNote}</span>
                </div>
              )}

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
    
    function AdminNoteCardItem({ n, onDeleteNote }) {
      const hasReplies = Boolean(n.comments && n.comments.length > 0);
      const [isOpen, setIsOpen] = useState(!hasReplies);
      const [readCommentCount, setReadCommentCount] = useState(() => {
        try {
          const map = JSON.parse(localStorage.getItem('spp_admin_read_note_replies') || '{}');
          return map[n.id] || 0;
        } catch (e) {
          return 0;
        }
      });

      const unreadCount = Math.max(0, (n.comments?.length || 0) - readCommentCount);

      const markAsRead = () => {
        try {
          const map = JSON.parse(localStorage.getItem('spp_admin_read_note_replies') || '{}');
          map[n.id] = n.comments ? n.comments.length : 0;
          localStorage.setItem('spp_admin_read_note_replies', JSON.stringify(map));
          setReadCommentCount(map[n.id]);
          window.dispatchEvent(new Event('spp_note_read_updated'));
        } catch (e) {}
      };

      const handleToggle = () => {
        const next = !isOpen;
        setIsOpen(next);
        if (next && unreadCount > 0) {
          markAsRead();
        }
      };

      useEffect(() => {
        if (isOpen && unreadCount > 0) {
          markAsRead();
        }
      }, [isOpen, n.comments]);

      return (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col transition-all">
          <button
            type="button"
            onClick={handleToggle}
            className="w-full p-4 sm:p-5 border-b border-slate-100 bg-slate-50/60 flex justify-between items-center text-left hover:bg-slate-100/70 transition-colors cursor-pointer"
          >
            <div className="flex-1 min-w-0 pr-3">
              <div className="flex flex-wrap items-center gap-2 mb-1.5">
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-teal-100 text-teal-800 rounded-lg text-[10px] font-black uppercase">
                  <Icon name="tag" size={11} /> {n.category || 'Catatan TU'}
                </span>
                {unreadCount > 0 ? (
                  <span className="px-2.5 py-0.5 bg-rose-500 text-white rounded-full text-[10px] font-black flex items-center gap-1 animate-pulse">
                    <Icon name="message-circle" size={11} /> {unreadCount} Balasan Baru
                  </span>
                ) : hasReplies ? (
                  <span className="px-2.5 py-0.5 bg-blue-100 text-blue-700 rounded-full text-[10px] font-black flex items-center gap-1">
                    <Icon name="message-circle" size={11} /> {n.comments.length} Balasan Masuk
                  </span>
                ) : (
                  <span className="px-2 py-0.5 bg-slate-200/70 text-slate-600 rounded-full text-[10px] font-bold">
                    Menunggu Tanggapan
                  </span>
                )}
              </div>
              <h4 className="font-black text-slate-800 text-sm sm:text-base truncate">Siswa: {n.studentName}</h4>
              <p className="text-xs text-slate-500 font-bold mt-0.5 flex items-center gap-1">
                <Icon name="calendar" size={12} className="text-teal-600" /> {formatDateTimeIndo(n.date)}
                {hasReplies && (
                  <span className="text-blue-600 font-bold ml-2 text-[11px]">
                    • {isOpen ? 'Tutup percakapan' : 'Klik untuk buka riwayat percakapan'}
                  </span>
                )}
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <div className="w-8 h-8 rounded-xl bg-slate-200/60 flex items-center justify-center text-slate-600 transition-transform">
                <Icon name={isOpen ? 'chevron-up' : 'chevron-down'} size={16} />
              </div>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onDeleteNote && onDeleteNote(n.id); }}
                className="w-8 h-8 bg-rose-50 hover:bg-rose-500 text-rose-500 hover:text-white rounded-xl transition-colors flex items-center justify-center shadow-xs"
                title="Hapus Catatan"
              >
                <Icon name="trash-2" size={14} />
              </button>
            </div>
          </button>

          {isOpen && (
            <div className="animate-in fade-in duration-200">
              <div className="p-5 text-sm text-slate-700 font-medium whitespace-pre-wrap leading-relaxed bg-white">
                {n.content}
              </div>
              <div className="p-4 sm:p-5 bg-slate-50 border-t border-slate-100">
                <p className="text-xs font-black text-slate-600 uppercase mb-2 flex items-center gap-1.5">
                  <Icon name="message-circle" size={13} className="text-blue-600"/> Balasan Wali Murid ({n.comments ? n.comments.length : 0})
                </p>
                {n.comments && n.comments.length > 0 ? (
                  <div className="space-y-2 mt-2">
                    {n.comments.map((cm, i) => (
                      <div key={i} className="bg-white p-3.5 border border-slate-200 rounded-2xl shadow-xs">
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-[11px] font-black text-slate-800 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-600"></span>
                            {cm.sender}
                          </p>
                          <span className="text-[10px] text-slate-500 font-bold">{formatDateTimeIndo(cm.time, n.date)}</span>
                        </div>
                        <p className="text-xs text-slate-600 font-medium leading-relaxed">{cm.text}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 italic">Belum ada tanggapan dari wali murid.</p>
                )}
              </div>
            </div>
          )}
        </div>
      );
    }

    function AdminCatatanView({ students, notes, onAddNote, onDeleteNote }) {
      const [selectedStudent, setSelectedStudent] = useState('');
      const [content, setContent] = useState('');

      const handleSubmit = (e) => {
        e.preventDefault();
        if (!selectedStudent || !content.trim()) return;
        const student = students.find(s => s.id === selectedStudent);
        if (!student) return;
        const now = new Date();
        const clockStr = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }).replace(/\./g, ':');
        onAddNote({
          studentId: student.id,
          studentName: student.name,
          category: 'Catatan TU',
          title: `Catatan Tata Usaha (TU)`,
          content: content.trim(),
          date: `${formatDateIndo(now)} • ${clockStr} WIB`,
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
                  <SearchableStudentSelect 
                    required 
                    students={students}
                    value={selectedStudent} 
                    onChange={e => setSelectedStudent(e.target.value)} 
                    placeholder="-- Cari & Pilih Siswa --"
                    theme="teal"
                  />
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
                   <AdminNoteCardItem key={n.id} n={n} onDeleteNote={onDeleteNote} />
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

      // Semester otomatis terisi dari pengaturan (settings.semester) atau periode terpilih
      const defaultSemester = useMemo(() => {
        return detectSemesterFromPeriod(activePeriod, settings?.semester || 'all');
      }, [activePeriod, settings?.semester]);

      const [filterSemester, setFilterSemester] = useState(() => {
        return detectSemesterFromPeriod(activePeriod, settings?.semester || 'all');
      });

      // Sinkronisasi otomatis semester saat periode ajaran berubah
      useEffect(() => {
        if (selectedPeriodObj) {
          setFilterSemester(detectSemesterFromPeriod(selectedPeriodObj, defaultSemester));
        } else {
          setFilterSemester(defaultSemester);
        }
      }, [selectedPeriodObj, defaultSemester]);

      const baseAcademicMonths = useMemo(() => {
        const sysEarliest = getSystemEarliestPeriodStart(settings);
        const targetEndObj = selectedPeriodObj || settings;
        const endM = targetEndObj?.endMonth || settings?.endMonth || 'Juni';
        const endY = parseInt(targetEndObj?.endYear || settings?.endYear) || (sysEarliest.year + 1);

        let startM = sysEarliest.month;
        let startY = sysEarliest.year;
        if (selectedPeriodObj && !selectedPeriodObj.isActive && selectedPeriodObj.startMonth && selectedPeriodObj.startYear) {
          startM = selectedPeriodObj.startMonth;
          startY = parseInt(selectedPeriodObj.startYear, 10);
        }

        return getMonthsList(startM, '', endM, startY, endY);
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
          
          // Bulan yang masuk perhitungan SPP & tunggakan HANYA yang jatuh pada masa aktif siswa
          const studentDueMonths = dueAcademicMonths.filter(m => isMonthOnOrAfterStudentStart(m, student, settings));
          const studentAcademicMonths = academicMonths.filter(m => isMonthOnOrAfterStudentStart(m, student, settings));

          // Yang menunggak HANYA bulan yang telah jatuh tempo/berjalan s/d saat ini yang belum dibayar
          const unpaidMonths = studentDueMonths.filter(m => {
            const mLower = m.trim().toLowerCase();
            return !paidMonths.some(pm => pm === mLower || (pm && mLower.startsWith(pm)));
          });
          const futureUnpaidMonths = studentAcademicMonths.filter(m => 
            !isMonthDueOrElapsed(m, new Date(), settings?.dueDateDay || 10) && 
            !paidMonths.some(pm => pm === m.trim().toLowerCase() || (pm && m.trim().toLowerCase().startsWith(pm)))
          );
          const tarif = Number(student.tarif) || 0;
          const currentClassDebt = unpaidMonths.length * tarif;
          const previousArrears = Number(student.arrearsAmount) || 0;
          const totalDebt = currentClassDebt + previousArrears;
          const isLunas = unpaidMonths.length === 0 && previousArrears === 0;

          return {
            student,
            unpaidMonths,
            futureUnpaidMonths,
            paidMonthsCount: paidMonths.length,
            totalDebt,
            isLunas
          };
        });
      }, [activeStudents, transactions, academicMonths, dueAcademicMonths, periodStartYear, settings]);

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
        const hasPrevArrears = Number(student.arrearsAmount) > 0;
        
        return `Yth. Bapak/Ibu ${student.wali || 'Wali Murid'} dari ananda *${student.name}* (Kelas: ${student.kelas}, NIS: ${student.nis}),\n\n` +
          `Semoga senantiasa dalam keadaan sehat dan penuh berkah.\n\n` +
          `Kami dari Bagian Tata Usaha (TU) *${settings.schoolName}* bermaksud menginformasikan status pembayaran SPP yang belum terselesaikan s/d bulan berjalan ini:\n\n` +
          `📌 *Rincian Tagihan SPP:*\n` +
          `• Tarif SPP: *${formatRupiah(student.tarif)}/bulan*${student.keringanan_note ? ` (Keringanan: ${student.keringanan_note})` : ''}\n` +
          (unpaidMonths.length > 0 ? `• Bulan Tertunggak (s/d Bulan Berjalan): *${monthsStr}* (${unpaidMonths.length} bulan)\n` : '') +
          (hasPrevArrears ? `• Sisa Tunggakan Kelas Sebelumnya: *${formatRupiah(student.arrearsAmount)}* (${student.arrearsNote || 'Tunggakan Kelas Sebelumnya'})\n` : '') +
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
              <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-700 flex items-center justify-center shrink-0 font-black text-sm border border-amber-200 shadow-2xs">
                Rp
              </div>
              <div>
                <p className="text-[11px] font-bold text-slate-400 uppercase flex items-center gap-1">
                  <span>Total Tunggakan</span>
                  <span className="text-[9px] text-amber-600 font-extrabold lowercase bg-amber-50 px-1 rounded border border-amber-200">(s/d sekarang)</span>
                </p>
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
          <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200 shadow-sm flex flex-col lg:flex-row gap-3.5 items-stretch lg:items-center justify-between">
            <div className="relative w-full sm:w-80 lg:w-80 flex items-center">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Icon name="search" size={16} />
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Cari nama siswa, NIS, wali..."
                className="w-full pl-10 pr-9 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white shadow-xs transition-all"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                >
                  <Icon name="x" size={14} />
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:flex lg:flex-wrap items-center gap-2.5 w-full lg:w-auto text-xs font-bold">
              <select
                value={filterStatus}
                onChange={e => setFilterStatus(e.target.value)}
                className="w-full sm:w-auto min-h-[42px] px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-xs"
              >
                <option value="tunggakan">Hanya Belum Lunas ({studentsWithDebt.length})</option>
                <option value="semua">Semua Siswa ({totalStudents})</option>
                <option value="lunas">Hanya Sudah Lunas ({studentsLunas.length})</option>
              </select>

              <select
                value={filterPeriod || (activePeriod ? String(activePeriod.id) : 'all')}
                onChange={e => {
                  const newId = e.target.value;
                  setFilterPeriod(newId);
                  const matchP = periodsList.find(p => String(p.id) === String(newId));
                  setFilterSemester(detectSemesterFromPeriod(matchP, defaultSemester));
                }}
                className="w-full sm:w-auto min-h-[42px] px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-xs"
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
                className="w-full sm:w-auto min-h-[42px] px-3.5 py-2.5 bg-blue-50/80 border border-blue-200 rounded-xl text-blue-900 font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-xs"
              >
                <option value="all">Semua Semester</option>
                <option value="1">Semester 1 (Ganjil)</option>
                <option value="2">Semester 2 (Genap)</option>
              </select>

              <select
                value={filterKelas}
                onChange={e => setFilterKelas(e.target.value)}
                className="w-full sm:w-auto min-h-[42px] px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-xs"
              >
                <option value="Semua Kelas">Semua Kelas</option>
                {availableClasses.map(cls => (
                  <option key={cls} value={cls}>{cls}</option>
                ))}
              </select>

              <select
                value={filterMonth}
                onChange={e => setFilterMonth(e.target.value)}
                className="w-full sm:w-auto min-h-[42px] px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-xs sm:col-span-2 lg:col-span-1"
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
                          {unpaidMonths.length > 0 && (
                            <>
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
                            </>
                          )}
                          {Number(student.arrearsAmount) > 0 && (
                            <div className="mt-1 px-2.5 py-1 bg-amber-50 border border-amber-300 rounded-lg text-[11px] font-extrabold text-amber-900 inline-flex items-center gap-1.5">
                              <Icon name="alert-triangle" size={12} className="text-amber-600" />
                              <span>Tunggakan Bawaan Kelas Sebelumnya: {formatRupiah(student.arrearsAmount)}</span>
                            </div>
                          )}
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

    function App({ initialHandoff = null }) {
      const handoffConsumedRef = useRef(false);
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
      const [isAdminMobileMenuOpen, setIsAdminMobileMenuOpen] = useState(false);
      const [showAdminMobileBell, setShowAdminMobileBell] = useState(false);

      useEffect(() => {
        setShowAdminMobileBell(false);
      }, [currentView]);

      const [adminExpandedGroup, setAdminExpandedGroup] = useState(() => {
        if (['transaksi', 'tunggakan', 'laporan'].includes('dashboard')) return 'keuangan';
        if (['siswa', 'catatan'].includes('dashboard')) return 'kesiswaan';
        if (['pengumuman', 'pengaduan'].includes('dashboard')) return 'komunikasi';
        return 'dashboard';
      });
      const [isRefreshing, setIsRefreshing] = useState(false);
      const [envConfig, setEnvConfig] = useState({});
      
      const [settings, setSettings] = useState(() => {
        if (initialHandoff && initialHandoff.settings) return initialHandoff.settings;
        try {
          const c = localStorage.getItem('spp_extended_settings') || localStorage.getItem('spp_cached_settings');
          return c ? JSON.parse(c) : DEFAULT_SETTINGS;
        } catch(e) { return DEFAULT_SETTINGS; }
      });
      const [students, setStudents] = useState(() => {
        if (initialHandoff && Array.isArray(initialHandoff.students) && initialHandoff.students.length > 0) {
          return initialHandoff.students;
        }
        try {
          const c = localStorage.getItem('spp_cached_students');
          return c ? JSON.parse(c) : [];
        } catch(e) { return []; }
      });
      const [transactions, setTransactions] = useState(() => {
        try {
          const c = localStorage.getItem('spp_cached_transactions');
          if (!c) return [];
          return JSON.parse(c).map(t => ({ ...t, date: formatDateIndo(t.date) }));
        } catch(e) { return []; }
      });
      const [announcements, setAnnouncements] = useState(() => {
        try {
          const c = localStorage.getItem('spp_cached_announcements');
          if (!c) return [];
          return JSON.parse(c).map(a => ({ ...a, date: formatDateIndo(a.date) }));
        } catch(e) { return []; }
      });
      const [complaints, setComplaints] = useState(() => {
        try {
          const c = localStorage.getItem('spp_cached_complaints');
          if (!c) return [];
          return JSON.parse(c).map(cp => ({
            ...cp,
            date: formatDateIndo(cp.date),
            messages: Array.isArray(cp.messages)
              ? cp.messages.map(m => ({ ...m, time: formatDateTimeIndo(m.time, cp.date) }))
              : []
          }));
        } catch(e) { return []; }
      });
      const [notes, setNotes] = useState(() => {
        try {
          const c = localStorage.getItem('spp_cached_notes');
          if (!c) return [];
          return JSON.parse(c).map(n => ({
            ...n,
            date: formatDateTimeIndo(n.date),
            comments: Array.isArray(n.comments)
              ? n.comments.map(cm => ({ ...cm, time: formatDateTimeIndo(cm.time, n.date) }))
              : []
          }));
        } catch(e) { return []; }
      });

      const [selectedKuitansi, setSelectedKuitansi] = useState(null);
      const [activeMidtransBill, setActiveMidtransBill] = useState(null);
      const [toast, setToast] = useState(null);
      const [crudPopup, setCrudPopup] = useState(null);
      const [pendingUser, setPendingUser] = useState(() => (initialHandoff && initialHandoff.userObj ? initialHandoff.userObj : null));
      const [isLoadingPortal, setIsLoadingPortal] = useState(() => Boolean(initialHandoff && initialHandoff.userObj));

      // Notifikasi Admin & Hitungan Unread (Dideklarasikan di level teratas komponen App sesuai Rules of Hooks)
      const [notesReadSync, setNotesReadSync] = useState(0);
      useEffect(() => {
        const handleNoteReadSync = () => setNotesReadSync(s => s + 1);
        window.addEventListener('spp_note_read_updated', handleNoteReadSync);
        return () => window.removeEventListener('spp_note_read_updated', handleNoteReadSync);
      }, []);

      const unreadNotesRepliesList = useMemo(() => {
        try {
          const readMap = JSON.parse(localStorage.getItem('spp_admin_read_note_replies') || '{}');
          return (notes || []).map(n => {
            const readCount = readMap[n.id] || 0;
            const comments = Array.isArray(n.comments) ? n.comments : [];
            const unreadCount = Math.max(0, comments.length - readCount);
            if (unreadCount <= 0) return null;
            const lastComment = comments[comments.length - 1];
            return {
              ...n,
              unreadCount,
              lastCommentText: lastComment ? `${lastComment.sender}: "${lastComment.text}"` : 'Balasan baru masuk'
            };
          }).filter(Boolean);
        } catch (e) {
          return [];
        }
      }, [notes, isRefreshing, notesReadSync]);

      const pendingComplaints = useMemo(() => complaints.filter(isComplaintPending), [complaints]);
      const unreadTransactions = useMemo(() => transactions.filter(t => !t.isRead), [transactions]);
      const totalAdminUnread = pendingComplaints.length + unreadTransactions.length + unreadNotesRepliesList.length;

      const showToast = (title, message, type = 'success', extra = {}) => {
        setToast({ title, message, type });
        setCrudPopup({
          title,
          message,
          type,
          ...extra
        });
        setTimeout(() => {
          setToast(null);
        }, 4000);
      };

      const showConfirmPopup = ({ title, message, onConfirm, onCancel, confirmText, cancelText, details }) => {
        setCrudPopup({
          title,
          message,
          type: 'confirm',
          onConfirm,
          onCancel,
          confirmText,
          cancelText,
          details
        });
      };

      const handleForceLogout = useCallback((userName, device = 'Perangkat lain', time = 'Baru saja') => {
        ensureDashboardCss();
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

      const handleUserLogin = async (userObj, opts = {}) => {
        const cssReadyPromise = ensureDashboardCss();
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
              const sessionPayload = { session_token: newSessionToken };
              if (userObj.student.arrearsNote && String(userObj.student.arrearsNote).startsWith('sess_')) {
                sessionPayload.arrears_note = '';
              }
              await supabase.from('students').update(sessionPayload).eq('id', userObj.student.id);
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

        await cssReadyPromise;
        if (!opts || !opts.alreadyLoading) {
          setPendingUser(userObj);
          setIsLoadingPortal(true);
        }
      };

      const fetchData = useCallback(async (isManual = false) => {
        const supabase = getSupabaseClient();
        if (isManual) {
          setIsRefreshing(true);
          showToast("Data Diperbarui", "Memuat ulang seluruh data siswa, transaksi, berita & pengaduan...", "info");
        }

        try {
          if (supabase) {
            const activeUser = currentUserRef.current;
            const shouldFetchAll = isManual || !!activeUser;

            if (!shouldFetchAll) {
              // Mode Tamu / Awal Login: Hanya muat 'students' & 'settings' secara paralel (mengeliminasi 6 rantai sekuensial)
              const [stRes, stgRes] = await Promise.allSettled([
                supabase.from('students').select('*'),
                supabase.from('settings').select('*').limit(1)
              ]);

              if (stRes.status === 'fulfilled' && stRes.value && stRes.value.data) {
                const mappedStudents = stRes.value.data.map(mapStudentFromDb);
                setStudents(mappedStudents);
                try { localStorage.setItem('spp_cached_students', JSON.stringify(mappedStudents)); } catch(e) {}
              }

              if (stgRes.status === 'fulfilled' && stgRes.value && stgRes.value.data && stgRes.value.data.length > 0) {
                const mappedSettings = mapSettingsFromDb(stgRes.value.data[0]);
                setSettings(mappedSettings);
                try { localStorage.setItem('spp_cached_settings', JSON.stringify(mappedSettings)); } catch(e) {}
              }
            } else {
              // Mode Sesi Pengguna: Ambil seluruh data secara konkruen / paralel sekaligus
              const [stRes, trRes, anRes, cpRes, ntRes, stgRes] = await Promise.allSettled([
                supabase.from('students').select('*'),
                supabase.from('transactions').select('*'),
                supabase.from('announcements').select('*'),
                supabase.from('complaints').select('*'),
                supabase.from('student_notes').select('*'),
                supabase.from('settings').select('*').limit(1)
              ]);

              if (stRes.status === 'fulfilled' && stRes.value && stRes.value.data) {
                const mappedStudents = stRes.value.data.map(mapStudentFromDb);
                setStudents(mappedStudents);
                try { localStorage.setItem('spp_cached_students', JSON.stringify(mappedStudents)); } catch(e) {}

                // Cek validitas sesi siswa aktif di perangkat ini
                const activeToken = mySessionTokenRef.current;
                if (activeUser && activeUser.role === 'parent' && activeUser.student && activeToken) {
                  const freshSt = mappedStudents.find(s => s.id === activeUser.student.id);
                  if (freshSt && freshSt.sessionToken && freshSt.sessionToken !== activeToken) {
                    handleForceLogout(freshSt.name, 'Perangkat lain');
                    return;
                  }
                }
              }

              if (trRes.status === 'fulfilled' && trRes.value && trRes.value.data) {
                const mappedTr = trRes.value.data.map(mapTransactionFromDb);
                setTransactions(mappedTr);
                try { localStorage.setItem('spp_cached_transactions', JSON.stringify(mappedTr)); } catch(e) {}
              }

              if (anRes.status === 'fulfilled' && anRes.value && anRes.value.data) {
                const mappedAn = anRes.value.data.map(mapAnnouncementFromDb);
                setAnnouncements(mappedAn);
                try { localStorage.setItem('spp_cached_announcements', JSON.stringify(mappedAn)); } catch(e) {}
              }

              if (cpRes.status === 'fulfilled' && cpRes.value && cpRes.value.data) {
                const mappedCp = cpRes.value.data.map(mapComplaintFromDb);
                setComplaints(mappedCp);
                try { localStorage.setItem('spp_cached_complaints', JSON.stringify(mappedCp)); } catch(e) {}
              }

              if (ntRes.status === 'fulfilled' && ntRes.value && ntRes.value.data) {
                const mappedNt = ntRes.value.data.map(mapNoteFromDb);
                setNotes(mappedNt);
                try { localStorage.setItem('spp_cached_notes', JSON.stringify(mappedNt)); } catch(e) {}
              }

              if (stgRes.status === 'fulfilled' && stgRes.value && stgRes.value.data && stgRes.value.data.length > 0) {
                const mappedSettings = mapSettingsFromDb(stgRes.value.data[0]);
                setSettings(mappedSettings);
                try { localStorage.setItem('spp_cached_settings', JSON.stringify(mappedSettings)); } catch(e) {}
              }
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

      // Saat pengguna berhasil login, sinkronkan seluruh transaksi dan pengumuman secara instan
      useEffect(() => {
        try { document.documentElement.classList.remove('spp-has-session'); } catch (e) {}
        if (initialHandoff && initialHandoff.userObj && !handoffConsumedRef.current) {
          handoffConsumedRef.current = true;
          handleUserLogin(initialHandoff.userObj, { alreadyLoading: true });
        }
      }, []);

      useEffect(() => {
        if (currentUser || isLoadingPortal) {
          ensureDashboardCss();
        }
        if (currentUser) {
          fetchData(false);
        }
      }, [currentUser, isLoadingPortal, fetchData]);

      const handleUpdateSettings = async (newSettings) => {
        setSettings(newSettings);
        try {
          localStorage.setItem('spp_extended_settings', JSON.stringify(newSettings));
          localStorage.setItem('spp_cached_settings', JSON.stringify(newSettings));
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
                due_date_day: Number(newSettings.dueDateDay) || 10,
                midtrans_client_key: newSettings.midtransClientKey || '',
                midtrans_server_key: newSettings.midtransServerKey || '',
                start_month: newSettings.startMonth || 'Juli',
                start_year: Number(newSettings.startYear) || 2025,
                end_month: newSettings.endMonth || 'Juni',
                end_year: Number(newSettings.endYear) || 2026,
                academic_periods: JSON.stringify(newSettings.academicPeriods || []),
                custom_classes: JSON.stringify(newSettings.customClasses || [])
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
        const formattedDate = formatDateIndo(annData.date || new Date());
        const newAnn = { id: Date.now(), ...annData, date: formattedDate };
        setAnnouncements(prev => [newAnn, ...prev]);
        showToast("Berita Ditambahkan", `Berita "${annData.title}" berhasil ditambahkan & disinkronkan.`, "success");

        const supabase = getSupabaseClient();
        if (supabase) {
          try {
            await supabase.from('announcements').insert([{
              title: annData.title,
              content: annData.content,
              image_url: annData.imageUrl || '',
              date: formattedDate
            }]);
          } catch (err) {
            console.error("Gagal simpan pengumuman ke Supabase:", err);
          }
        }
      };

      const handleUpdateAnnouncement = async (id, updatedObj) => {
        const formattedObj = { ...updatedObj, date: formatDateIndo(updatedObj.date || new Date()) };
        setAnnouncements(prev => prev.map(a => a.id === id ? { ...a, ...formattedObj } : a));
        showToast("Berita Diperbarui", `Perubahan berita "${updatedObj.title}" berhasil disimpan.`, "success");

        const supabase = getSupabaseClient();
        if (supabase && typeof id !== 'number') {
          try {
            await supabase.from('announcements').update({
              title: formattedObj.title,
              content: formattedObj.content,
              image_url: formattedObj.imageUrl || '',
              date: formattedObj.date
            }).eq('id', id);
          } catch (err) {
            console.error("Gagal update pengumuman ke Supabase:", err);
          }
        }
      };

      const handleDeleteAnnouncement = async (id) => {
        const target = announcements.find(a => a.id === id);
        showConfirmPopup({
          title: "Hapus Berita Pengumuman?",
          message: `Apakah Anda yakin ingin menghapus pengumuman "${target ? target.title : ''}" dari portal? Data yang dihapus tidak dapat dipulihkan.`,
          confirmText: "Ya, Hapus",
          cancelText: "Batal",
          onConfirm: async () => {
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
        });
      };

      const handleAddComplaint = async (compData) => {
        const now = Date.now();
        const nowObj = new Date(now);
        const formattedDate = formatDateIndo(compData.date || nowObj);
        const clockStr = nowObj.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }).replace(/\./g, ':');
        const initialMessages = [{ 
          sender: 'Wali Murid', 
          senderRole: 'parent',
          text: compData.content, 
          time: `${formattedDate} • ${clockStr} WIB`
        }];
        const newComp = { 
          id: now, 
          ...compData,
          date: formattedDate,
          createdAtMs: now,
          expiresAtMs: now + 3600000,
          isRead: false,
          messages: initialMessages,
          status: 'Belum Ditangani'
        };
        setComplaints(prev => [newComp, ...prev]);
        showToast("Pengaduan Terkirim", "Pengaduan Anda telah terkirim ke Admin TU. Sesi obrolan aktif selama 1 jam.", "success");

        const supabase = getSupabaseClient();
        if (supabase) {
          try {
            const validStudentId = (compData.studentId && typeof compData.studentId === 'string' && compData.studentId.includes('-')) ? compData.studentId : null;
            const { data } = await supabase.from('complaints').insert([{
              student_id: validStudentId,
              student_name: compData.studentName,
              wali_name: compData.waliName,
              title: compData.title,
              content: compData.content,
              admin_reply: '',
              messages: JSON.stringify(initialMessages),
              status: 'Belum Ditangani',
              is_read: false,
              date: formattedDate
            }]).select();
            if (data && data[0]) {
              const mapped = mapComplaintFromDb(data[0]);
              setComplaints(prev => prev.map(c => c.id === now ? mapped : c));
            }
          } catch (err) {}
        }
      };

      const handleReplyComplaint = async (id, replyText, senderRole = 'Admin TU', imageUrl = null) => {
        let updatedMessages = [];
        let updatedStatus = 'Sudah Ditangani';
        const isFromAdmin = senderRole === 'Admin TU';

        setComplaints(prev => prev.map(c => {
          if (c.id === id) {
            const isExpired = Date.now() > (c.expiresAtMs || (c.createdAtMs + 3600000));
            if (isExpired) return c; // Sesi 1 jam telah berakhir

            const nowObj = new Date();
            const clockStr = nowObj.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }).replace(/\./g, ':');
            const newMsg = {
              sender: senderRole,
              senderRole: isFromAdmin ? 'admin' : 'parent',
              text: replyText,
              imageUrl: imageUrl,
              time: `${formatDateIndo(nowObj)} • ${clockStr} WIB`
            };
            const existingMsgs = (c.messages && c.messages.length > 0) 
              ? [...c.messages] 
              : [{ sender: 'Wali Murid', text: c.content, time: '-' }];

            if (c.adminReply && existingMsgs.length === 1) {
              existingMsgs.push({ sender: 'Admin TU', text: c.adminReply, time: '-' });
            }

            updatedMessages = [...existingMsgs, newMsg];
            updatedStatus = isFromAdmin ? 'Sudah Ditangani' : c.status;

            return { 
              ...c, 
              adminReply: isFromAdmin ? replyText : c.adminReply,
              messages: updatedMessages, 
              status: updatedStatus,
              isRead: isFromAdmin ? true : false
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
              status: updatedStatus,
              is_read: isFromAdmin ? true : false
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
          try {
            const list = JSON.parse(localStorage.getItem('spp_admin_read_complaints') || '[]');
            if (!list.includes(id)) {
              list.push(id);
              localStorage.setItem('spp_admin_read_complaints', JSON.stringify(list));
            }
          } catch(e) {}
          setComplaints(prev => prev.map(c => c.id === id ? { ...c, isRead: true } : c));
          if (supabase && typeof id !== 'number') {
            try { await supabase.from('complaints').update({ is_read: true }).eq('id', id); } catch (err) {}
          }
        } else if (type === 'transaction') {
          try {
            const list = JSON.parse(localStorage.getItem('spp_admin_read_trx') || '[]');
            if (!list.includes(id)) {
              list.push(id);
              localStorage.setItem('spp_admin_read_trx', JSON.stringify(list));
            }
          } catch(e) {}
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
      
      const validStudentId = (noteData.studentId && typeof noteData.studentId === 'string' && noteData.studentId.includes('-')) ? noteData.studentId : null;
      const dbPayload = {
        student_id: validStudentId,
        student_name: noteData.studentName,
        title: noteData.title,
        content: noteData.content,
        category: noteData.category,
        date: noteData.date,
        comments: JSON.stringify(noteData.comments || []),
        is_read: false
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
        const defaultPwd = stObj.password || (stObj.nis ? `Sb${stObj.nis}` : '123456');
        const newStudent = { id: Date.now(), ...stObj, password: defaultPwd };
        setStudents(prev => {
          const next = [...prev, newStudent];
          try { localStorage.setItem('spp_cached_students', JSON.stringify(next)); } catch(e) {}
          return next;
        });
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
              password: defaultPwd,
              photo_url: stObj.fotoUrl || '',
              status: stObj.statusAktif ? 'Aktif' : 'Non-Aktif',
              keringanan_note: stObj.keringanan_note || '',
              arrears_amount: Number(stObj.arrearsAmount) || 0,
              arrears_note: stObj.arrearsNote || '',
              start_active_month: stObj.startActiveMonth || '',
              start_active_year: stObj.startActiveYear ? Number(stObj.startActiveYear) : null,
              class_history: JSON.stringify(stObj.classHistory || [])
            }]);
          } catch (err) {}
        }
      };

      const handleUpdateStudent = async (id, updatedObj) => {
        setStudents(prev => {
          const next = prev.map(s => (s.id === id || (updatedObj.nis && s.nis === updatedObj.nis)) ? { ...s, ...updatedObj } : s);
          try { localStorage.setItem('spp_cached_students', JSON.stringify(next)); } catch(e) {}
          return next;
        });

        setCurrentUser(prev => {
          if (prev && prev.role === 'parent' && prev.student && (prev.student.id === id || prev.student.nis === updatedObj.nis)) {
            if (updatedObj.statusAktif === false || (updatedObj.status && updatedObj.status.toLowerCase() !== 'aktif')) {
              try {
                sessionStorage.removeItem('spp_tab_session');
                localStorage.removeItem('spp_parent_session');
              } catch (e) {}
              alert('Akun siswa telah dinonaktifkan / keluar / lulus oleh Admin (Status: OFF). Sesi akses login telah ditutup.');
              return null;
            }
            const updatedUser = {
              ...prev,
              student: { ...prev.student, ...updatedObj }
            };
            try {
              sessionStorage.setItem('spp_tab_session', JSON.stringify(updatedUser));
              localStorage.setItem('spp_parent_session', JSON.stringify(updatedUser));
            } catch (e) {}
            return updatedUser;
          }
          return prev;
        });
        const studentNameDisplay = updatedObj.name || 'tersebut';
        showToast("Data Murid Diperbarui", `Profil siswa ${studentNameDisplay} berhasil diperbarui.`, "success");

        const supabase = getSupabaseClient();
        if (supabase) {
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
            if ('statusAktif' in updatedObj) {
              if (updatedObj.statusAktif === false) {
                dbUpdateObj.status = updatedObj.status || 'Non-Aktif';
              } else {
                dbUpdateObj.status = 'Aktif';
              }
            } else if ('status' in updatedObj) {
              dbUpdateObj.status = updatedObj.status;
            }
            if ('keringanan_note' in updatedObj) dbUpdateObj.keringanan_note = updatedObj.keringanan_note;
            if ('arrearsAmount' in updatedObj) dbUpdateObj.arrears_amount = Number(updatedObj.arrearsAmount) || 0;
            if ('arrearsNote' in updatedObj) dbUpdateObj.arrears_note = updatedObj.arrearsNote;
            if ('startActiveMonth' in updatedObj) dbUpdateObj.start_active_month = updatedObj.startActiveMonth || '';
            if ('startActiveYear' in updatedObj) dbUpdateObj.start_active_year = updatedObj.startActiveYear ? Number(updatedObj.startActiveYear) : null;
            if ('classHistory' in updatedObj) dbUpdateObj.class_history = JSON.stringify(updatedObj.classHistory);
            if (updatedObj.completedLevels) {
              try {
                localStorage.setItem('spp_completed_levels_' + id, JSON.stringify(updatedObj.completedLevels));
                if (updatedObj.nis) localStorage.setItem('spp_completed_levels_' + updatedObj.nis, JSON.stringify(updatedObj.completedLevels));
              } catch (e) {}
            }
            if (updatedObj.statusAktif === false || (updatedObj.status && updatedObj.status.toLowerCase() !== 'aktif')) {
              dbUpdateObj.session_token = null;
            }
            
            if (typeof id === 'string' && id.includes('-')) {
              await supabase.from('students').update(dbUpdateObj).eq('id', id);
            } else if (updatedObj.nis) {
              await supabase.from('students').update(dbUpdateObj).eq('nis', updatedObj.nis);
            } else {
              await supabase.from('students').update(dbUpdateObj).eq('id', id);
            }
          } catch (err) {
            console.error("Gagal update student ke Supabase:", err);
          }
        }
      };

      const handleDeleteStudent = async (id) => {
        const target = students.find(s => s.id === id);
        showConfirmPopup({
          title: "Hapus Data Murid?",
          message: `Apakah Anda yakin ingin menghapus data murid "${target ? target.name : ''}" (NIS: ${target?.nis || '-'})? Semua histori transaksi dan data kesiswaan akan ikut terhapus.`,
          confirmText: "Ya, Hapus Data",
          cancelText: "Batal",
          details: target ? {
            'Nama Siswa': target.name,
            'NIS / NISN': `${target.nis || '-'} / ${target.nisn || '-'}`,
            'Kelas / Jenjang': target.kelas || '-'
          } : null,
          onConfirm: async () => {
            setStudents(prev => {
              const next = prev.filter(s => s.id !== id);
              try { localStorage.setItem('spp_cached_students', JSON.stringify(next)); } catch(e) {}
              return next;
            });
            showToast("Data Murid Dihapus", `Data murid ${target ? target.name : ''} telah berhasil dihapus.`, "delete");

            const supabase = getSupabaseClient();
            if (supabase && typeof id !== 'number') {
              try {
                await supabase.from('students').delete().eq('id', id);
              } catch (err) {}
            }
          }
        });
      };

      const handleAddTransaction = async (trxObj) => {
        const newTrx = { id: Date.now(), ...trxObj };
        setTransactions(prev => [newTrx, ...prev]);
        setSelectedKuitansi(newTrx);
        showToast("Pembayaran Berhasil", `Pembayaran SPP ${trxObj.month} a.n ${trxObj.studentName} tercatat!`, "success", {
          details: {
            'Nama Siswa': trxObj.studentName,
            'Bulan SPP': trxObj.month,
            'Nominal': formatRupiah(trxObj.amount),
            'Metode': trxObj.method || 'Tunai / Manual',
            'No. Kuitansi': trxObj.kuitansiNo
          },
          extraActionText: 'Cetak Kuitansi',
          extraActionIcon: 'printer',
          onExtraAction: () => setSelectedKuitansi(newTrx)
        });

        const supabase = getSupabaseClient();
        if (supabase) {
          try {
            const validStudentId = (trxObj.studentId && typeof trxObj.studentId === 'string' && trxObj.studentId.includes('-')) ? trxObj.studentId : null;
            await supabase.from('transactions').insert([{
              student_id: validStudentId,
              student_name: trxObj.studentName,
              kelas: trxObj.kelas,
              month: trxObj.month,
              amount: trxObj.amount,
              method: trxObj.method,
              status: 'Lunas',
              date: trxObj.date,
              kuitansi_no: trxObj.kuitansiNo,
              is_read: false
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
        <div className="fixed inset-0 z-[99999] bg-slate-950/70 backdrop-blur-md flex flex-col items-center justify-center p-4 animate-in fade-in duration-200 select-none overflow-hidden">
          <div className="loading-glass-card rounded-[32px] p-8 max-w-sm w-full shadow-2xl border border-white/20 flex flex-col items-center text-center relative overflow-hidden animate-in zoom-in-95 duration-200 text-white z-10">
            {/* Ambient Decorative Blurs */}
            <div className="absolute -top-10 -left-10 w-32 h-32 bg-cyan-500/20 rounded-full blur-2xl pointer-events-none"></div>
            <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-blue-600/25 rounded-full blur-2xl pointer-events-none"></div>

            <div className="w-20 h-20 bg-white/10 rounded-full p-2 mb-4 border border-cyan-400/30 flex items-center justify-center relative shadow-inner">
              <div className="w-16 h-16 rounded-full border-4 border-cyan-400 border-t-transparent animate-spin absolute inset-0 m-auto"></div>
              <img src="logo.webp" alt="PAUD Setia Bhakti" className="w-10 h-10 object-contain relative z-10 animate-pulse" />
            </div>

            <h3 className="text-lg font-black text-white tracking-tight">Menyinkronkan Data...</h3>
            <p className="text-xs text-slate-300 font-medium mt-1 leading-relaxed">
              Harap tunggu sebentar, memperbarui data SPP, siswa & transaksi terbaru...
            </p>

            <div className="w-full bg-slate-950/80 h-2 rounded-full mt-5 overflow-hidden relative border border-white/15">
              <div className="bg-gradient-to-r from-blue-600 via-cyan-400 to-sky-300 h-full w-full animate-loading-bar shadow-[0_0_10px_#22d3ee]"></div>
            </div>
          </div>
        </div>
      );

      if (currentUser.role === 'parent') {
        const liveStudent = students.find(s => 
          currentUser.student && (s.id === currentUser.student.id || s.nis === currentUser.student.nis)
        ) || currentUser.student;

        // CEK STATUS AKTIF SISWA (ON / OFF): Jika dinonaktifkan (OFF), keluar, atau lulus -> otomatis keluarkan sesi login
        const isStudentStillActive = liveStudent && liveStudent.statusAktif !== false && (!liveStudent.status || liveStudent.status.toLowerCase() === 'aktif');
        if (!isStudentStillActive) {
          try {
            sessionStorage.removeItem('spp_tab_session');
            localStorage.removeItem('spp_parent_session');
          } catch (e) {}
          setTimeout(() => {
            setCurrentUser(null);
            alert('Akun siswa ini berstatus Non-Aktif / Keluar / Lulus (Status: OFF). Akses portal wali murid telah ditutup oleh pihak sekolah.');
          }, 50);
          return null;
        }

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
                    date: formatDateIndo(new Date()),
                    kuitansiNo: `K-${new Date().getFullYear()}${String(new Date().getMonth()+1).padStart(2,'0')}-${Math.floor(100+Math.random()*900)}`
                  };
                  handleAddTransaction(newTrx);
                  if (bill.isArrearsPayment) {
                    handleUpdateStudent(currentUser.student.id, {
                      ...currentUser.student,
                      arrearsAmount: 0,
                      arrearsNote: `Lunas via Midtrans Online (${newTrx.date})`
                    });
                  }
                  setSelectedKuitansi(newTrx);
                  setActiveMidtransBill(null);
                }}
              />
            )}

            <ToastNotification toast={toast} onClose={() => setToast(null)} />
            <CrudPopupModal popup={crudPopup} onClose={() => setCrudPopup(null)} />
          </>
        );
      }

      return (
        <>
          <div className="min-h-screen bg-aesthetic-pattern flex flex-col w-full text-slate-800 relative">
            {/* Ambient Smurf Glowing Orbs */}
            <div className="smurf-ambient-orb smurf-orb-1"></div>
            <div className="smurf-ambient-orb smurf-orb-2"></div>
            <div className="smurf-ambient-orb smurf-orb-3"></div>

            {/* ROOT-LEVEL ADMIN NOTIFICATION MODAL (FLOATING DROPDOWN DARI ATAS) */}
            {showAdminMobileBell && (
              <div className="fixed inset-0 z-[9999] pointer-events-auto">
                <div 
                  className="fixed inset-0 bg-slate-900/20 backdrop-blur-[2px] z-[9999]" 
                  onClick={() => setShowAdminMobileBell(false)} 
                />
                <div className="fixed inset-x-3 sm:inset-x-auto sm:right-8 top-[72px] sm:top-20 z-[10000] w-auto max-w-sm sm:w-96 mx-auto sm:mx-0 bg-white rounded-3xl shadow-2xl border border-slate-200 text-slate-800 p-4 space-y-3 animate-in slide-in-from-top-2 duration-200 max-h-[82vh] overflow-y-auto">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                        <Icon name="bell" size={14} />
                      </div>
                      <h4 className="font-extrabold text-xs uppercase text-slate-800 tracking-wide">Notifikasi Admin TU</h4>
                      {totalAdminUnread > 0 && (
                        <span className="px-2 py-0.5 bg-rose-100 text-rose-700 text-[10px] font-black rounded-full">
                          {totalAdminUnread} Baru
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {totalAdminUnread > 0 && (
                        <button
                          type="button"
                          onClick={() => {
                            complaints.forEach(c => handleMarkReadNotification('complaint', c.id));
                            transactions.forEach(t => handleMarkReadNotification('transaction', t.id));
                          }}
                          className="text-[10px] font-bold text-blue-600 hover:text-blue-800 hover:underline"
                        >
                          Tandai Dibaca
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setShowAdminMobileBell(false)}
                        className="px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-800 text-xs font-bold transition-colors"
                      >
                        Tutup
                      </button>
                    </div>
                  </div>
                  
                  <div className="space-y-2 text-xs max-h-80 overflow-y-auto pr-0.5">
                    {totalAdminUnread === 0 ? (
                      <div className="text-center py-6 text-slate-400 font-medium">
                        <Icon name="bell-off" size={26} className="mx-auto mb-1.5 text-slate-300" />
                        Semua pengaduan dan transaksi telah ditinjau.
                      </div>
                    ) : (
                      <>
                        {pendingComplaints.map(c => (
                          <div 
                            key={'pending_' + c.id}
                            onClick={() => {
                              handleMarkReadNotification('complaint', c.id);
                              setShowAdminMobileBell(false);
                              setCurrentView('pengaduan');
                            }}
                            className="p-3 rounded-2xl border border-amber-300 bg-amber-50/90 cursor-pointer hover:scale-[0.99] transition-all text-amber-950 font-bold shadow-2xs"
                          >
                            <div className="flex items-center justify-between gap-2 mb-1">
                              <span className="text-xs font-black truncate flex items-center gap-1.5 text-amber-900">
                                <Icon name="message-circle" size={13} className="text-amber-600 shrink-0" />
                                Aduan: {c.studentName || 'Wali Murid'}
                              </span>
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-amber-500 text-white shrink-0">Menunggu</span>
                            </div>
                            <p className="text-[11px] text-amber-800 line-clamp-1 font-medium">{c.title || c.description || 'Pengaduan baru dari wali murid'}</p>
                            {c.date && <span className="text-[9.5px] text-amber-700/80 font-semibold mt-1 block">{formatDateIndo(c.date)}</span>}
                          </div>
                        ))}
                        {unreadTransactions.map(t => (
                          <div 
                            key={'trx_' + t.id}
                            onClick={() => {
                              handleMarkReadNotification('transaction', t.id);
                              setShowAdminMobileBell(false);
                              setCurrentView('transaksi');
                            }}
                            className="p-3 rounded-2xl border border-blue-200 bg-blue-50/90 cursor-pointer hover:scale-[0.99] transition-all text-blue-950 font-bold shadow-2xs"
                          >
                            <div className="flex items-center justify-between gap-2 mb-1">
                              <span className="text-xs font-black truncate flex items-center gap-1.5 text-blue-900">
                                <Icon name="credit-card" size={13} className="text-blue-600 shrink-0" />
                                {t.studentName} ({t.month || 'SPP'})
                              </span>
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-blue-600 text-white shrink-0">{t.status || 'Lunas'}</span>
                            </div>
                            <p className="text-[11px] text-blue-800 font-semibold">{formatRupiah(t.amount)} • {formatDateIndo(t.date)}</p>
                          </div>
                        ))}
                        {unreadNotesRepliesList.map(n => (
                          <div 
                            key={'note_reply_' + n.id}
                            onClick={() => {
                              setShowAdminMobileBell(false);
                              setCurrentView('catatan');
                            }}
                            className="p-3 rounded-2xl border border-teal-200 bg-teal-50/90 cursor-pointer hover:scale-[0.99] transition-all text-teal-950 font-bold shadow-2xs"
                          >
                            <div className="flex items-center justify-between gap-2 mb-1">
                              <span className="text-xs font-black truncate flex items-center gap-1.5 text-teal-900">
                                <Icon name="message-circle" size={13} className="text-teal-600 shrink-0" />
                                Catatan: {n.studentName}
                              </span>
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-rose-500 text-white shrink-0 animate-pulse">
                                {n.unreadCount} Balasan Baru
                              </span>
                            </div>
                            <p className="text-[11px] text-teal-800 line-clamp-1 font-medium">{n.lastCommentText}</p>
                            {n.date && <span className="text-[9.5px] text-teal-700/80 font-semibold mt-1 block">{formatDateTimeIndo(n.date)}</span>}
                          </div>
                        ))}
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* TOP MOBILE APP BAR with Refresh, Bell, and 3-Line Hamburger Menu for Admin */}
            <div className="md:hidden sticky top-0 z-40 bg-gradient-to-r from-[#072a6b]/95 via-[#0d3b8f]/95 to-[#1554c2]/95 backdrop-blur-xl px-4 sm:px-6 py-3.5 border-b border-cyan-400/30 shadow-xl shadow-blue-950/20 flex items-center justify-between min-h-[66px] text-white">
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-cyan-400 via-indigo-600 to-blue-700 p-0.5 shadow-lg shadow-blue-950/50 overflow-hidden shrink-0 flex items-center justify-center ring-2 ring-cyan-400/30">
                  <img src="logo.webp" alt="PAUD Setia Bhakti" className="w-8 h-8 object-contain filter drop-shadow" />
                </div>
                <div className="min-w-0">
                  <h1 className="text-base font-black text-white truncate tracking-tight">{settings.schoolName || 'PAUD SETIA BHAKTI'}</h1>
                  <div className="flex items-center gap-1.5 text-xs font-extrabold text-cyan-300 truncate mt-0.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                    <span>Admin TU • {settings.adminName || 'Admin'}</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons: [Refresh] [Lonceng] [Garis 3] */}
              <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                {/* Refresh / Sinkronisasi Button on Mobile */}
                <button
                  type="button"
                  onClick={() => fetchData(true)}
                  disabled={isRefreshing}
                  className="relative w-11 h-11 rounded-2xl bg-white/10 hover:bg-white/20 active:scale-95 text-white flex items-center justify-center transition-all border border-white/15 focus:outline-none ring-1 ring-white/10 shrink-0 backdrop-blur-md"
                  aria-label="Sinkronisasi Data"
                  title="Sinkronisasi Data"
                >
                  <Icon name="refresh-cw" size={18} className={isRefreshing ? 'animate-spin text-cyan-300' : 'text-white'} />
                </button>

                {/* Notification Bell Button on Mobile */}
                <button
                  type="button"
                  onClick={() => {
                    setShowAdminMobileBell(!showAdminMobileBell);
                    setIsAdminMobileMenuOpen(false);
                  }}
                  className="relative w-11 h-11 rounded-2xl bg-white/10 hover:bg-white/20 active:scale-95 text-white flex items-center justify-center transition-all border border-white/15 focus:outline-none ring-1 ring-white/10 shrink-0 backdrop-blur-md"
                  aria-label="Lihat Notifikasi Admin"
                  title="Notifikasi"
                >
                  <Icon name="bell" size={19} />
                  {totalAdminUnread > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-rose-500 text-white rounded-full text-[10px] font-black flex items-center justify-center animate-pulse ring-2 ring-white shadow-md">
                      {totalAdminUnread > 9 ? '9+' : totalAdminUnread}
                    </span>
                  )}
                </button>

                {/* Rounded Dark Frosted 3-Line Hamburger Button */}
                <button
                  type="button"
                  onClick={() => {
                    setIsAdminMobileMenuOpen(!isAdminMobileMenuOpen);
                    setShowAdminMobileBell(false);
                  }}
                  className="relative w-11 h-11 rounded-2xl bg-white/10 hover:bg-white/20 active:scale-95 text-white flex flex-col items-center justify-center gap-[4.5px] p-2.5 transition-all shadow-lg border border-white/15 focus:outline-none ring-1 ring-white/10 shrink-0 backdrop-blur-md"
                  aria-label="Buka Menu Admin"
                  title="Menu Navigasi"
                >
                  <span className={`h-[2.5px] bg-white rounded-full transition-all duration-300 ${isAdminMobileMenuOpen ? 'w-5 rotate-45 translate-y-[7px]' : 'w-5'}`}></span>
                  <span className={`h-[2.5px] bg-white rounded-full transition-all duration-300 ${isAdminMobileMenuOpen ? 'opacity-0 w-0' : 'w-4 self-start ml-0.5'}`}></span>
                  <span className={`h-[2.5px] bg-white rounded-full transition-all duration-300 ${isAdminMobileMenuOpen ? 'w-5 -rotate-45 -translate-y-[7px]' : 'w-5'}`}></span>
                </button>
              </div>
            </div>

            {/* MOBILE SLIDE-OUT NAVIGATION DRAWER - Admin */}
            {isAdminMobileMenuOpen && (
              <div className="md:hidden fixed inset-0 z-50 overflow-hidden animate-in fade-in duration-200">
                <div 
                  className="absolute inset-0 bg-slate-950/80 backdrop-blur-md transition-opacity" 
                  onClick={() => setIsAdminMobileMenuOpen(false)}
                ></div>

                <div className="absolute top-0 right-0 bottom-0 w-[88%] sm:w-[380px] max-w-[430px] min-h-[100dvh] smurf-mobile-drawer text-white flex flex-col justify-between shadow-2xl z-10 overflow-y-auto animate-in slide-in-from-right duration-300 relative">
                  {/* Luminous Glow Orbs in Drawer */}
                  <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-blue-500/15 blur-3xl pointer-events-none"></div>
                  <div className="absolute bottom-20 -left-10 w-40 h-40 rounded-full bg-cyan-500/10 blur-3xl pointer-events-none"></div>

                  <div className="p-4 sm:p-5 relative z-10">
                    {/* Drawer Header */}
                    <div className="flex items-center justify-between pb-3.5 border-b border-white/10 mb-4">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-slate-900 border border-white/15 flex items-center justify-center p-1.5 shadow-md shrink-0">
                          <img src="logo.webp" alt="PAUD Setia Bhakti" className="w-full h-full object-contain" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <h2 className="text-sm font-black text-white leading-tight truncate">{settings.schoolName || 'PAUD SETIA BHAKTI'}</h2>
                          <span className="text-[11px] font-bold text-cyan-400 uppercase tracking-wider block truncate">Panel Administrator TU</span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setIsAdminMobileMenuOpen(false)}
                        className="w-9 h-9 rounded-xl bg-white/5 hover:bg-white/15 text-slate-300 hover:text-white flex items-center justify-center transition-colors border border-white/10 active:scale-95 shrink-0"
                      >
                        <Icon name="x" size={18} />
                      </button>
                    </div>

                    {/* Admin User Chip in Drawer */}
                    <div className="p-3.5 rounded-2xl bg-slate-900/80 backdrop-blur-xl border border-white/10 flex items-center gap-3 mb-4 shadow-lg shadow-black/30">
                      <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center text-white font-black text-lg border border-white/20 overflow-hidden shrink-0 shadow-md">
                        {settings.adminName ? settings.adminName.charAt(0) : 'A'}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-black text-white truncate capitalize">{settings.adminName || 'Admin TU'}</p>
                        <p className="text-xs text-slate-400 font-bold truncate mt-0.5">Tahun Ajaran {settings.academicYear || 'Aktif'}</p>
                      </div>
                    </div>

                    {/* Admin Navigation Groups */}
                    <div className="space-y-1.5">
                      {[
                        { id: 'dashboard', label: 'Dashboard', icon: 'home', defaultView: 'dashboard', views: ['dashboard'] },
                        { 
                          id: 'keuangan', 
                          label: 'Keuangan SPP', 
                          icon: 'credit-card', 
                          defaultView: 'transaksi', 
                          views: ['transaksi', 'tunggakan', 'laporan'],
                          subItems: [
                            { id: 'transaksi', label: 'Catat Bayar Manual', icon: 'plus-circle' },
                            { id: 'tunggakan', label: 'Follow-Up Tunggakan', icon: 'phone-call', badge: students.filter(s => (s.unpaidMonths && s.unpaidMonths.length > 0) || (s.unpaidCount > 0)).length || null, badgeType: 'danger' },
                            { id: 'laporan', label: 'Cetak Laporan PDF', icon: 'printer' }
                          ]
                        },
                        { 
                          id: 'kesiswaan', 
                          label: 'Kesiswaan', 
                          icon: 'users', 
                          defaultView: 'siswa', 
                          views: ['siswa', 'catatan'], 
                          badge: null,
                          subItems: [
                            { id: 'siswa', label: 'Data Murid', icon: 'user-check' },
                            { id: 'catatan', label: 'Catatan Siswa TU', icon: 'file-text' }
                          ]
                        },
                        { 
                          id: 'komunikasi', 
                          label: 'Komunikasi', 
                          icon: 'message-square', 
                          defaultView: 'pengumuman', 
                          views: ['pengumuman', 'pengaduan'], 
                          badge: (complaints.filter(isComplaintPending).length) || null,
                          badgeType: 'danger',
                          subItems: [
                            { id: 'pengumuman', label: 'Pengumuman Sekolah', icon: 'newspaper' },
                            { id: 'pengaduan', label: 'Pengaduan Wali', icon: 'message-circle', badge: (complaints.filter(isComplaintPending).length) || null, badgeType: 'danger' }
                          ]
                        },
                        { id: 'pengaturan', label: 'Pengaturan', icon: 'settings', defaultView: 'pengaturan', views: ['pengaturan'] }
                      ].map(group => {
                        const isGroupActive = group.views.includes(currentView);
                        const isExpanded = adminExpandedGroup === group.id;

                        return (
                          <div key={group.id} className="w-full">
                            <button
                              type="button"
                              onClick={() => {
                                if (group.subItems) {
                                  if (isExpanded) {
                                    setAdminExpandedGroup(null);
                                  } else {
                                    setAdminExpandedGroup(group.id);
                                    if (!isGroupActive) {
                                      setCurrentView(group.defaultView);
                                    }
                                  }
                                } else {
                                  setAdminExpandedGroup(group.id);
                                  setCurrentView(group.defaultView);
                                  setIsAdminMobileMenuOpen(false);
                                }
                              }}
                              className={`w-full min-h-[44px] py-2.5 px-3.5 rounded-xl flex items-center justify-between text-xs sm:text-sm font-extrabold transition-all duration-200 active:scale-[0.99] ${
                                isGroupActive
                                  ? 'smurf-nav-active'
                                  : 'smurf-nav-item'
                              }`}
                            >
                              <div className="flex items-center gap-3 min-w-0 flex-1 truncate">
                                <Icon name={group.icon} size={18} className="shrink-0" />
                                <span className="truncate capitalize">{group.label}</span>
                              </div>
                              <div className="flex items-center gap-2 shrink-0 ml-2">
                                {group.badge !== undefined && group.badge !== null && (
                                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-black transition-all ${
                                    group.badge === 0 
                                      ? 'badge-zero-muted'
                                      : group.badgeType === 'danger'
                                        ? 'badge-danger-active animate-pulse ring-1 ring-rose-300'
                                        : 'badge-cyan-active'
                                  }`}>
                                    {group.badge}
                                  </span>
                                )}
                                {group.subItems && (
                                  <Icon name="chevron-down" size={16} className={`transition-transform duration-200 shrink-0 ${isExpanded ? 'rotate-180' : ''}`} />
                                )}
                              </div>
                            </button>

                            {group.subItems && isExpanded && (
                              <div className="border-l-2 border-slate-800 ml-4 pl-3 mt-1.5 space-y-1">
                                {group.subItems.map(sub => (
                                  <button
                                    key={sub.id}
                                    type="button"
                                    onClick={() => {
                                      setCurrentView(sub.id);
                                      setAdminExpandedGroup(group.id);
                                      setIsAdminMobileMenuOpen(false);
                                    }}
                                    className={`w-full min-h-[40px] py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-between transition-all active:scale-[0.99] ${
                                      currentView === sub.id
                                        ? 'bg-white/15 text-white font-black border border-white/15 shadow-xs'
                                        : 'text-slate-400 hover:text-white hover:bg-white/5'
                                    }`}
                                  >
                                    <div className="flex items-center gap-2.5 min-w-0 flex-1 truncate">
                                      <Icon name={sub.icon} size={15} className="shrink-0" />
                                      <span className="truncate capitalize">{sub.label}</span>
                                    </div>
                                    {sub.badge > 0 && (
                                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-500 text-white animate-pulse shrink-0">
                                        {sub.badge}
                                      </span>
                                    )}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Ornamental Corak Pattern at Bottom of Admin Mobile Drawer */}
                  <div className="mt-auto relative z-10">
                    <SidebarBottomOrnament roleLabel="Panel Admin TU" />
                  </div>

                  {/* Sticky Drawer Footer Actions */}
                  <div className="sticky bottom-0 bg-slate-950/90 backdrop-blur-lg border-t border-white/10 p-4 space-y-2 relative z-10">
                    <button
                      type="button"
                      onClick={() => {
                        fetchData(true);
                        setIsAdminMobileMenuOpen(false);
                      }}
                      className="w-full min-h-[42px] py-2.5 px-3.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-white/10 text-white text-xs font-bold flex items-center justify-center gap-2 active:scale-95 transition-all shadow-sm"
                    >
                      <Icon name="refresh-cw" size={15} className={`shrink-0 ${isRefreshing ? 'animate-spin text-blue-400' : ''}`} />
                      <span className="truncate">Sinkronisasi Data Baru</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setIsAdminMobileMenuOpen(false);
                        handleUserLogout();
                      }}
                      className="w-full min-h-[42px] py-2.5 px-3.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/20 text-xs font-bold flex items-center justify-center gap-2 active:scale-95 transition-all shadow-sm"
                    >
                      <Icon name="log-out" size={15} className="shrink-0" />
                      <span className="truncate">Keluar Akun Admin TU</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            <div className="w-full flex-1 bg-[#ebf1f8] flex flex-col md:flex-row min-h-screen mobile-full-height">
              {/* ROYAL BLUE SIDEBAR - Hidden on mobile */}
              <aside className="w-full md:w-72 lg:w-80 royal-blue-sidebar shrink-0 flex flex-col justify-between p-0 relative z-20 overflow-x-hidden hide-on-mobile-nav">
                
                {/* Subtle Ambient Highlights in Admin Sidebar */}
                <div className="absolute -bottom-10 -left-10 w-64 h-64 rounded-full bg-blue-500/10 blur-[80px] pointer-events-none select-none z-0"></div>
                <div className="absolute top-20 right-0 w-48 h-48 rounded-full bg-indigo-500/10 blur-[60px] pointer-events-none select-none z-0"></div>

                <div className="relative z-10">
                  {/* Brand / School Header with Frosted Glass Container (Matching Image 3) */}
                  <div className="p-4 sm:p-5 m-3 sm:m-4 mb-2 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 flex items-center gap-3.5 shadow-lg shadow-blue-950/20">
                    <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-xl flex items-center justify-center text-white border border-white/30 overflow-hidden shrink-0 shadow-md">
                      <img src="logo.webp" alt="PAUD Setia Bhakti" className="w-9 h-9 object-contain filter drop-shadow" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h1 className="font-black text-sm sm:text-base leading-tight text-white tracking-tight truncate">{settings.schoolName || 'PAUD SETIA BHAKTI'}</h1>
                      <div className="inline-flex items-center gap-1.5 mt-1 px-2 py-0.5 rounded-full bg-cyan-400/20 border border-cyan-400/30">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                        <span className="text-[10px] font-black text-cyan-200 uppercase tracking-wider">Admin Panel</span>
                      </div>
                    </div>
                  </div>

                  {/* Admin Navigation - Pill Style Groups */}
                  <nav className="px-3 pr-3 py-2 sm:py-3 space-y-1.5 font-extrabold text-sm relative">
                    {[
                      { id: 'dashboard', label: 'Dashboard', icon: 'home', defaultView: 'dashboard', views: ['dashboard'] },
                      { 
                        id: 'keuangan', 
                        label: 'Keuangan SPP', 
                        icon: 'credit-card', 
                        defaultView: 'transaksi', 
                        views: ['transaksi', 'tunggakan', 'laporan'],
                        subItems: [
                          { id: 'transaksi', label: 'Catat Bayar Manual', icon: 'plus-circle' },
                          { id: 'tunggakan', label: 'Follow-Up Tunggakan', icon: 'phone-call', badge: students.filter(s => (s.unpaidMonths && s.unpaidMonths.length > 0) || (s.unpaidCount > 0)).length || null, badgeType: 'danger' },
                          { id: 'laporan', label: 'Cetak Laporan PDF', icon: 'printer' }
                        ]
                      },
                      { 
                        id: 'kesiswaan', 
                        label: 'Kesiswaan', 
                        icon: 'users', 
                        defaultView: 'siswa', 
                        views: ['siswa', 'catatan'], 
                        badge: (unreadNotesRepliesList.length > 0 ? unreadNotesRepliesList.length : null),
                        badgeType: 'danger',
                        subItems: [
                          { id: 'siswa', label: 'Data Murid', icon: 'user-check' },
                          { id: 'catatan', label: 'Catatan Siswa TU', icon: 'file-text', badge: (unreadNotesRepliesList.length > 0 ? unreadNotesRepliesList.length : null), badgeType: 'danger' }
                        ]
                      },
                      { 
                        id: 'komunikasi', 
                        label: 'Komunikasi', 
                        icon: 'message-square', 
                        defaultView: 'pengumuman', 
                        views: ['pengumuman', 'pengaduan'], 
                        badge: (complaints.filter(c => isComplaintPending(c)).length) || null,
                        badgeType: 'danger',
                        subItems: [
                          { id: 'pengumuman', label: 'Pengumuman Sekolah', icon: 'newspaper' },
                          { id: 'pengaduan', label: 'Pengaduan Wali', icon: 'message-circle', badge: (complaints.filter(c => isComplaintPending(c)).length) || null, badgeType: 'danger' }
                        ]
                      },
                      { id: 'pengaturan', label: 'Pengaturan', icon: 'settings', defaultView: 'pengaturan', views: ['pengaturan'] }
                    ].map(group => {
                      const isGroupActive = group.views.includes(currentView);
                      const isExpanded = adminExpandedGroup === group.id;

                      return (
                        <div key={group.id} className="w-full">
                          <button
                            onClick={() => {
                              if (group.subItems) {
                                if (isExpanded) {
                                  setAdminExpandedGroup(null);
                                } else {
                                  setAdminExpandedGroup(group.id);
                                  if (!isGroupActive) {
                                    setCurrentView(group.defaultView);
                                  }
                                }
                              } else {
                                setAdminExpandedGroup(group.id);
                                setCurrentView(group.defaultView);
                              }
                            }}
                            className={`w-full py-3.5 px-4 flex items-center justify-between transition-all duration-200 text-xs sm:text-[13.5px] whitespace-nowrap rounded-2xl ${
                              isGroupActive
                                ? 'smurf-nav-active'
                                : 'smurf-nav-item'
                            }`}
                          >
                            <div className="flex items-center gap-3 truncate">
                              <Icon name={group.icon} size={18} />
                              <span className="truncate">{group.label}</span>
                            </div>

                            <div className="flex items-center gap-1.5">
                              {group.badge !== undefined && group.badge !== null && (
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-black transition-all ${
                                  group.badge === 0 
                                    ? 'badge-zero-muted'
                                    : group.badgeType === 'danger'
                                      ? 'badge-danger-active animate-pulse ring-1 ring-rose-300'
                                      : group.badgeType === 'sky'
                                        ? 'badge-cyan-active'
                                        : 'badge-purple-active'
                                }`}>
                                  {group.badge}
                                </span>
                              )}

                              {group.subItems && (
                                <Icon 
                                  name="chevron-down" 
                                  size={15} 
                                  className={`transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} 
                                />
                              )}
                            </div>
                          </button>

                          {/* Sub-Items when Expanded */}
                          {group.subItems && isExpanded && (
                            <div className="mt-1 ml-2 space-y-0.5 py-1">
                              {group.subItems.map(sub => (
                                <button
                                  key={sub.id}
                                  onClick={() => {
                                    setCurrentView(sub.id);
                                    setAdminExpandedGroup(group.id);
                                  }}
                                  className={`w-full px-4 py-2.5 rounded-xl text-xs font-bold flex items-center justify-between transition-all ${
                                    currentView === sub.id
                                      ? 'bg-white text-sky-800 font-black shadow-md border border-cyan-300'
                                      : 'text-white/80 hover:text-white hover:bg-white/15'
                                  }`}
                                >
                                  <div className="flex items-center gap-2 truncate">
                                    <Icon name={sub.icon} size={14} />
                                    <span className="truncate">{sub.label}</span>
                                  </div>
                                  {sub.badge !== undefined && sub.badge !== null && (
                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-black transition-all ${
                                      sub.badge === 0
                                        ? 'badge-zero-muted'
                                        : sub.badgeType === 'danger'
                                          ? 'badge-danger-active animate-pulse ring-1 ring-rose-300'
                                          : sub.badgeType === 'sky'
                                            ? 'badge-cyan-active'
                                            : sub.badgeType === 'purple'
                                              ? 'badge-purple-active'
                                              : 'badge-cyan-active'
                                    }`}>
                                      {sub.badge}
                                    </span>
                                  )}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </nav>
                </div>

                {/* Bottom Admin Sidebar Section: Decorative Corak Ornament + Admin Profile Chip */}
                <div className="mt-auto relative z-10 hidden md:block">
                  <SidebarBottomOrnament roleLabel="Panel Admin TU" />
                  <div className="p-3 sm:p-3.5 m-3 sm:m-4 mt-1 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 text-white relative z-10 shadow-lg shadow-blue-950/20">
                    <div className="flex items-center justify-between gap-2.5">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="relative shrink-0">
                          <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center font-black text-sm text-white border border-white/25">
                            {settings.adminName ? settings.adminName.charAt(0) : 'A'}
                          </div>
                          <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-400 ring-2 ring-slate-900 animate-pulse"></span>
                        </div>
                        <div className="truncate flex-1">
                          <p className="text-sm font-black text-white truncate">{settings.adminName || 'Admin TU'}</p>
                          <p className="text-xs text-blue-100/80 font-semibold truncate">Tahun Ajaran {settings.academicYear || 'Aktif'}</p>
                        </div>
                      </div>
                      <button
                        onClick={handleUserLogout}
                        title="Keluar Akun Admin"
                        className="p-2 rounded-xl bg-white/10 hover:bg-rose-500/80 text-white/90 hover:text-white transition-all shadow-sm shrink-0"
                      >
                        <Icon name="log-out" size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              </aside>

            {/* MAIN AESTHETIC CONTENT CARD */}
            <main className="flex-1 bg-aesthetic-pattern flex flex-col min-w-0 min-h-0 overflow-y-auto mobile-nav-spacer relative">
              <PanelAestheticBg />
              {/* Header Top Bar */}
              <header className="px-4 sm:px-6 md:px-10 pt-7 sm:pt-8 pb-4 sm:pb-5 border-b border-slate-200/80 flex flex-col gap-3.5 sm:gap-4 bg-white/95 backdrop-blur-md relative z-20 md:sticky md:top-0 shadow-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-3">
                      <h2 className="text-xl sm:text-2xl md:text-3xl font-black text-slate-900 tracking-tight leading-snug">
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
                    <p className="text-xs sm:text-sm md:text-base text-slate-500 font-medium mt-1">
                      {currentView === 'dashboard' && 'Ringkasan operasional dan grafik penerimaan SPP'}
                      {['transaksi', 'tunggakan', 'laporan'].includes(currentView) && 'Kelola pencatatan bayar manual, pantau tunggakan & cetak laporan'}
                      {['siswa', 'catatan'].includes(currentView) && 'Kelola database murid aktif, kelas dan catatan konseling'}
                      {['pengumuman', 'pengaduan'].includes(currentView) && 'Publikasi pengumuman sekolah dan tanggapi pengaduan wali'}
                      {currentView === 'pengaturan' && 'Konfigurasi identitas sekolah, tarif SPP dan periode semester'}
                    </p>
                  </div>

                  {/* Header Actions - Tampil hanya di desktop, di mobile sudah ada di top bar & drawer */}
                  <div className="hidden md:flex items-center gap-2.5 sm:gap-3 shrink-0">
                    {/* Desktop Notification Bell (Samakan fitur dengan mobile header) */}
                    <button
                      type="button"
                      onClick={() => setShowAdminMobileBell(prev => !prev)}
                      title="Notifikasi Masuk (Pengaduan, Transaksi & Balasan Catatan Siswa)"
                      className={`relative px-3.5 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 shadow-sm cursor-pointer ${
                        totalAdminUnread > 0
                          ? 'bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200'
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                      }`}
                    >
                      <Icon name="bell" size={17} className={totalAdminUnread > 0 ? 'text-rose-600' : 'text-slate-600'} />
                      <span className="hidden sm:inline">Notifikasi</span>
                      {totalAdminUnread > 0 && (
                        <span className="px-1.5 py-0.2 min-w-[18px] text-center bg-rose-500 text-white rounded-full text-[10px] font-black animate-pulse shadow-xs">
                          {totalAdminUnread > 99 ? '99+' : totalAdminUnread}
                        </span>
                      )}
                    </button>

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
              </header>

              {/* Mobile Sub-Navigation Pills for Admin Multi-View Sections */}
              {['transaksi', 'tunggakan', 'laporan'].includes(currentView) && (
                <div className="flex md:hidden items-center gap-2 px-4 py-2.5 bg-slate-100/90 border-b border-slate-200 overflow-x-auto no-scrollbar shrink-0 relative z-10">
                  <button
                    onClick={() => setCurrentView('transaksi')}
                    className={`px-3.5 py-1.5 rounded-full text-xs font-black transition-all shrink-0 flex items-center gap-1.5 ${
                      currentView === 'transaksi' ? 'bg-blue-600 text-white shadow-sm' : 'bg-white text-slate-600 border border-slate-200'
                    }`}
                  >
                    <Icon name="credit-card" size={13} />
                    <span>Catat Bayar</span>
                  </button>
                  <button
                    onClick={() => setCurrentView('tunggakan')}
                    className={`px-3.5 py-1.5 rounded-full text-xs font-black transition-all shrink-0 flex items-center gap-1.5 ${
                      currentView === 'tunggakan' ? 'bg-blue-600 text-white shadow-sm' : 'bg-white text-slate-600 border border-slate-200'
                    }`}
                  >
                    <Icon name="alert-circle" size={13} className={currentView === 'tunggakan' ? 'text-amber-200' : 'text-amber-500'} />
                    <span>Tunggakan</span>
                  </button>
                  <button
                    onClick={() => setCurrentView('laporan')}
                    className={`px-3.5 py-1.5 rounded-full text-xs font-black transition-all shrink-0 flex items-center gap-1.5 ${
                      currentView === 'laporan' ? 'bg-blue-600 text-white shadow-sm' : 'bg-white text-slate-600 border border-slate-200'
                    }`}
                  >
                    <Icon name="file-text" size={13} />
                    <span>Laporan PDF</span>
                  </button>
                </div>
              )}

              {['siswa', 'catatan'].includes(currentView) && (
                <div className="flex md:hidden items-center gap-2 px-4 py-2.5 bg-slate-100/90 border-b border-slate-200 overflow-x-auto no-scrollbar shrink-0 relative z-10">
                  <button
                    onClick={() => setCurrentView('siswa')}
                    className={`px-3.5 py-1.5 rounded-full text-xs font-black transition-all shrink-0 flex items-center gap-1.5 ${
                      currentView === 'siswa' ? 'bg-blue-600 text-white shadow-sm' : 'bg-white text-slate-600 border border-slate-200'
                    }`}
                  >
                    <Icon name="users" size={13} />
                    <span>Data Murid ({students.length})</span>
                  </button>
                  <button
                    onClick={() => setCurrentView('catatan')}
                    className={`px-3.5 py-1.5 rounded-full text-xs font-black transition-all shrink-0 flex items-center gap-1.5 ${
                      currentView === 'catatan' ? 'bg-blue-600 text-white shadow-sm' : 'bg-white text-slate-600 border border-slate-200'
                    }`}
                  >
                    <Icon name="file-edit" size={13} />
                    <span>Catatan TU</span>
                  </button>
                </div>
              )}

              {['pengumuman', 'pengaduan'].includes(currentView) && (
                <div className="flex md:hidden items-center gap-2 px-4 py-2.5 bg-slate-100/90 border-b border-slate-200 overflow-x-auto no-scrollbar shrink-0 relative z-10">
                  <button
                    onClick={() => setCurrentView('pengumuman')}
                    className={`px-3.5 py-1.5 rounded-full text-xs font-black transition-all shrink-0 flex items-center gap-1.5 ${
                      currentView === 'pengumuman' ? 'bg-blue-600 text-white shadow-sm' : 'bg-white text-slate-600 border border-slate-200'
                    }`}
                  >
                    <Icon name="newspaper" size={13} />
                    <span>Pengumuman</span>
                  </button>
                  <button
                    onClick={() => setCurrentView('pengaduan')}
                    className={`px-3.5 py-1.5 rounded-full text-xs font-black transition-all shrink-0 flex items-center gap-1.5 ${
                      currentView === 'pengaduan' ? 'bg-blue-600 text-white shadow-sm' : 'bg-white text-slate-600 border border-slate-200'
                    }`}
                  >
                    <Icon name="message-square" size={13} />
                    <span>Pengaduan Wali</span>
                    {complaints.filter(c => isComplaintPending(c)).length > 0 && (
                      <span className="px-1.5 py-0.2 rounded-full text-[10px] font-black bg-rose-500 text-white">
                        {complaints.filter(c => isComplaintPending(c)).length}
                      </span>
                    )}
                  </button>
                </div>
              )}

              <div key={currentView} className="px-3.5 py-4 sm:px-6 md:p-10 space-y-6 sm:space-y-8 flex-1 animate-tab-switch relative z-10">
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
                transactions={transactions}
                onAddStudent={handleAddStudent}
                onUpdateStudent={handleUpdateStudent}
                onDeleteStudent={handleDeleteStudent}
                showToast={showToast}
              />
            )}

            {currentView === 'transaksi' && (
              <TransaksiView
                students={students}
                transactions={transactions}
                settings={settings}
                onAddTransaction={handleAddTransaction}
                onShowKuitansi={(trx) => setSelectedKuitansi(trx)}
                onUpdateStudent={handleUpdateStudent}
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
                onMarkAsRead={handleMarkReadNotification}
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
                onDeleteNote={(id) => {
                  showConfirmPopup({
                    title: "Hapus Catatan Kesiswaan?",
                    message: "Apakah Anda yakin ingin menghapus catatan bimbingan/evaluasi murid ini? Data yang dihapus tidak dapat dipulihkan.",
                    confirmText: "Ya, Hapus",
                    cancelText: "Batal",
                    onConfirm: async () => {
                      const supabase = getSupabaseClient();
                      if (supabase && typeof id !== 'number') {
                        await supabase.from('student_notes').delete().eq('id', id);
                      }
                      setNotes(prev => prev.filter(n => n.id !== id));
                      showToast('Catatan berhasil dihapus', 'delete');
                    }
                  });
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
        <CrudPopupModal popup={crudPopup} onClose={() => setCrudPopup(null)} />
      </>
    );
    }

    window.__SPP_MountFullApp = function(existingRoot, handoff) {
      try { document.documentElement.classList.remove('spp-has-session'); } catch (e) {}
      const targetRoot = existingRoot || ReactDOM.createRoot(document.getElementById('root'));
      targetRoot.render(<App initialHandoff={handoff || window.__SPP_LOGIN_HANDOFF || null} />);
      return targetRoot;
    };

    if (!window.__SPP_DEFER_APP_MOUNT) {
      window.__SPP_MountFullApp();
    }
