const LoginStatusClockPills = React.memo(function LoginStatusClockPills({
  showLiveStatus
}) {
  const [currentTime, setCurrentTime] = useState(() => showLiveStatus ? new Date() : null);
  useEffect(() => {
    if (!showLiveStatus) return undefined;
    setCurrentTime(new Date());
    const timer = setInterval(() => setCurrentTime(new Date()), 15000);
    return () => clearInterval(timer);
  }, [showLiveStatus]);
  const {
    formattedDate,
    formattedClock,
    greeting
  } = useMemo(() => {
    if (!showLiveStatus || !currentTime) {
      return {
        formattedDate: '',
        formattedClock: '',
        greeting: {
          text: 'Selamat Datang',
          emoji: '✨'
        }
      };
    }
    const fDate = currentTime.toLocaleDateString('id-ID', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
    const fClock = currentTime.toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit'
    }) + ' WIB';
    const hour = currentTime.getHours();
    let g;
    if (hour >= 3 && hour < 11) g = {
      text: 'Selamat Pagi',
      emoji: '🌅'
    };else if (hour >= 11 && hour < 15) g = {
      text: 'Selamat Siang',
      emoji: '☀️'
    };else if (hour >= 15 && hour < 18) g = {
      text: 'Selamat Sore',
      emoji: '🌤️'
    };else g = {
      text: 'Selamat Malam',
      emoji: '🌙'
    };
    return {
      formattedDate: fDate,
      formattedClock: fClock,
      greeting: g
    };
  }, [showLiveStatus, currentTime]);
  return <div className="flex items-center justify-between gap-2.5 mb-4 sm:mb-5">
          <div className="inline-flex items-center gap-2 h-8 sm:h-9 px-3.5 rounded-full bg-white/15 text-[11px] font-bold text-white border border-white/15 shadow-sm min-w-0">
            <Icon name="clock" size={13} className="text-cyan-300 shrink-0" />
            <span className="truncate">{showLiveStatus ? `${formattedDate} • ${formattedClock}` : 'Portal Resmi Sekolah • 24 Jam'}</span>
          </div>
          <div className="inline-flex items-center justify-center shrink-0 min-w-[125px] gap-1.5 h-8 sm:h-9 px-3 rounded-full bg-white/20 text-xs font-black text-cyan-200 border border-white/20 shadow-xs">
            <span>{showLiveStatus ? greeting.emoji : '✨'}</span>
            <span>{showLiveStatus ? `${greeting.text}!` : 'Selamat Datang!'}</span>
          </div>
        </div>;
});

const LoginView = React.memo(function LoginView({
  onLogin,
  settings,
  students,
  onPrepareAuth,
  isSsrSnapshot = false,
  ssrHydrating = false,
  initialUsername = '',
  initialPassword = ''
}) {
  const [hasMounted, setHasMounted] = useState(() => !ssrHydrating);
  const [role, setRole] = useState(() => {
    if (typeof window === 'undefined' || ssrHydrating) return 'parent';
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const r = urlParams.get('role') || (window.location.hash.includes('admin') ? 'admin' : window.location.hash.includes('wali') || window.location.hash.includes('parent') ? 'parent' : null);
      if (r) return r;
      const savedIntended = sessionStorage.getItem('spp_intended_role');
      if (savedIntended) return savedIntended;
    } catch (e) {}
    return 'parent';
  });
  const [username, setUsername] = useState(() => ssrHydrating ? '' : initialUsername || '');
  const [password, setPassword] = useState(() => ssrHydrating ? '' : initialPassword || '');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const handleLoginSubmit = async e => {
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
        if (expectedAdminUser && cleanInput === expectedAdminUser && password.trim() === expectedAdminPass) {
          await Promise.resolve(onLogin({
            role: 'admin',
            name: activeSettings.adminName || 'Sarah Aura Alamanda'
          }));
        } else {
          setErrorMsg('Username atau Password Admin TU tidak cocok. Silakan pastikan akun Admin Anda benar.');
        }
      } else {
        const student = (activeStudents || []).find(s => s.nis && s.nis.toString().trim() === username.trim() || s.name && s.name.trim().toLowerCase() === cleanInput);
        if (!student) {
          setErrorMsg('Data Wali Siswa / NIS tidak ditemukan dalam sistem. Silakan masukkan NIS atau Nama Siswa ananda.');
          return;
        }
        const isStudentActive = student.statusAktif !== false && (!student.status || student.status.toLowerCase() === 'aktif');
        if (!isStudentActive) {
          setErrorMsg('Akun siswa ini berstatus NON-AKTIF / TELAH KELUAR / LULUS (Status Akun: OFF). Akses login ke portal telah ditutup oleh pihak sekolah. Silakan hubungi bagian Tata Usaha (TU).');
          return;
        }
        const enteredPwd = password.trim();
        const isDefault = !student.password || student.password.toString().trim() === student.nis.toString().trim() || student.password.toString().trim() === `Sb${student.nis.toString().trim()}`;
        let isValid = false;
        if (isDefault) {
          const validDefaults = [`Sb${student.nis.toString().trim()}`, student.nis.toString().trim()];
          if (student.password && student.password.toString().trim().length > 0) {
            validDefaults.push(student.password.toString().trim());
          }
          isValid = validDefaults.includes(enteredPwd);
        } else {
          isValid = enteredPwd === student.password.toString().trim();
        }
        if (isValid) {
          await Promise.resolve(onLogin({
            role: 'parent',
            student: student
          }));
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
  const [activeFeatureIdx, setActiveFeatureIdx] = useState(null);
  const [spinningIcons, setSpinningIcons] = useState({
    0: false,
    1: false,
    2: false,
    3: false
  });
  useEffect(() => {
    if (!hasMounted) setHasMounted(true);
    if (ssrHydrating && typeof window !== 'undefined') {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const r = urlParams.get('role') || (window.location.hash.includes('admin') ? 'admin' : window.location.hash.includes('wali') || window.location.hash.includes('parent') ? 'parent' : null);
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
  }, []);
  const triggerIconSpin = idx => {
    setActiveFeatureIdx(prev => prev === idx ? null : idx);
    setSpinningIcons(prev => ({
      ...prev,
      [idx]: true
    }));
    setTimeout(() => {
      setSpinningIcons(prev => ({
        ...prev,
        [idx]: false
      }));
    }, 750);
  };
  const loginFeatures = useMemo(() => [{
    icon: 'credit-card',
    title: 'Bayar SPP Instan',
    sub: 'QRIS & VA Bank',
    detail: 'Pembayaran otomatis terverifikasi 24 jam tanpa perlu kirim bukti manual.',
    iconBg: 'bg-sky-400/20 text-sky-300 border-sky-400/35',
    activeBorder: 'border-sky-400/60 bg-sky-500/20 shadow-sky-500/20',
    glowColor: 'from-sky-400/30 to-cyan-300/10'
  }, {
    icon: 'printer',
    title: 'Kuitansi Resmi',
    sub: 'Cetak Bukti Sah',
    detail: 'Unduh & cetak kuitansi digital resmi berstempel PAUD Setia Bhakti kapan saja.',
    iconBg: 'bg-emerald-400/20 text-emerald-300 border-emerald-400/35',
    activeBorder: 'border-emerald-400/60 bg-emerald-500/20 shadow-emerald-500/20',
    glowColor: 'from-emerald-400/30 to-teal-300/10'
  }, {
    icon: 'file-text',
    title: 'Catatan Siswa',
    sub: 'Laporan Motorik',
    detail: 'Pantau catatan perkembangan, motorik, dan pesan khusus dari Tata Usaha.',
    iconBg: 'bg-purple-400/20 text-purple-300 border-purple-400/35',
    activeBorder: 'border-purple-400/60 bg-purple-500/20 shadow-purple-500/20',
    glowColor: 'from-purple-400/30 to-fuchsia-300/10'
  }, {
    icon: 'message-square',
    title: 'Layanan Aduan',
    sub: 'Live Chat 1 Jam',
    detail: 'Konsultasi & pengaduan langsung terhubung dengan Admin TU secara real-time.',
    iconBg: 'bg-amber-400/20 text-amber-300 border-amber-400/35',
    activeBorder: 'border-amber-400/60 bg-amber-500/20 shadow-amber-500/20',
    glowColor: 'from-amber-400/30 to-yellow-300/10'
  }], []);
  const waLink = useMemo(() => {
    let waPhone = settings.phone ? settings.phone.replace(/[^0-9]/g, '') : '6281234567890';
    if (waPhone.startsWith('0')) {
      waPhone = '62' + waPhone.slice(1);
    } else if (waPhone.startsWith('8')) {
      waPhone = '62' + waPhone;
    }
    return `https://wa.me/${waPhone}?text=${encodeURIComponent('Halo Admin ' + (settings.schoolName || 'PAUD SETIA BHAKTI') + ', saya wali murid ingin meminta bantuan login/reset password.')}`;
  }, [settings.phone, settings.schoolName]);
  const showLiveStatus = !isSsrSnapshot && hasMounted;
  return <main aria-label="Portal Login SPP" className="min-h-screen login-ambient-canvas flex flex-col items-center justify-center p-3 sm:p-5 md:p-8 lg:p-10 relative overflow-hidden">
          
          <div className="luxury-watermark-bg" aria-hidden="true">
            <div className="luxury-school-watermark flex items-center justify-center">
              <img src="logo.webp" alt="" width="224" height="224" fetchPriority="high" decoding="sync" className="w-full h-full object-contain filter contrast-125 select-none pointer-events-none opacity-15" />
            </div>
          </div>

          
          <div className="relative z-10 mb-4 hidden lg:flex items-center gap-3 px-6 py-2.5 rounded-full bg-slate-900/75 border border-white/20 text-white shadow-2xl shadow-blue-950/40">
            <div className="w-7 h-7 rounded-full bg-white/20 border border-white/30 flex items-center justify-center p-0.5 overflow-hidden shrink-0">
              <img src="logo.webp" alt="PAUD Setia Bhakti" width="28" height="28" className="w-full h-full object-contain" />
            </div>
            <span className="text-xs font-black tracking-wide text-white">{settings.schoolName || 'PAUD SETIA BHAKTI'}</span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="text-[11px] font-bold text-blue-200">Portal Layanan SPP & Administrasi Siswa</span>
            <span className="px-2.5 py-0.5 rounded-full bg-amber-400/20 text-amber-300 text-[10px] font-black border border-amber-400/30">{`Tahun Ajaran ${settings.academicYear || '2026/2027'}`}</span>
          </div>

          
          <div className="w-full max-w-[430px] lg:max-w-5xl xl:max-w-6xl 2xl:max-w-[1240px] login-glass-card rounded-[32px] sm:rounded-[36px] lg:rounded-[40px] overflow-hidden relative z-10 flex flex-col lg:flex-row shadow-2xl transition-all border border-white/20">
            
            
            <div className="relative lg:w-[46%] xl:w-[45%] bg-gradient-to-br from-[#0a1838] via-[#0d2250] to-[#07132e] text-white p-5 sm:p-7 lg:p-10 xl:p-12 flex flex-col justify-between overflow-hidden shrink-0">

              
              <div className="absolute -top-16 -left-16 w-52 h-52 rounded-full pointer-events-none" style={{
          background: 'radial-gradient(circle, rgba(59,130,246,0.14) 0%, transparent 70%)'
        }}></div>
              <div className="absolute bottom-8 left-8 w-44 h-44 rounded-full pointer-events-none" style={{
          background: 'radial-gradient(circle, rgba(56,189,248,0.16) 0%, transparent 70%)'
        }}></div>

              
              <div className="hidden lg:block absolute top-0 bottom-0 -right-1 w-24 overflow-hidden pointer-events-none z-10" aria-hidden="true">
                <svg className="h-full w-full" preserveAspectRatio="none" viewBox="0 0 120 500" fill="none">
                  <path d="M120,0 L60,0 C20,30 20,80 60,110 C20,140 20,190 60,220 C20,250 20,300 60,330 C20,360 20,410 60,440 C30,470 30,490 60,500 L120,500 Z" fill="rgba(255, 255, 255, 0.22)" />
                  <path d="M120,0 L78,0 C45,35 45,85 78,115 C45,145 45,195 78,225 C45,255 45,305 78,335 C45,365 45,415 78,445 C55,475 55,490 78,500 L120,500 Z" fill="rgba(255, 255, 255, 0.45)" />
                  <path d="M120,0 L96,0 C70,40 70,90 96,120 C70,150 70,200 96,230 C70,260 70,310 96,340 C70,370 70,420 96,450 C80,475 80,490 96,500 L120,500 Z" fill="#ffffff" />
                </svg>
              </div>

              
              <div className="block lg:hidden absolute -bottom-1 left-0 right-0 h-8 overflow-hidden pointer-events-none z-10" aria-hidden="true">
                <svg className="w-full h-full" preserveAspectRatio="none" viewBox="0 0 500 60" fill="none">
                  <path d="M0,60 L0,30 C60,10 120,10 180,30 C240,50 300,50 360,30 C420,10 480,10 500,20 L500,60 Z" fill="#ffffff" />
                </svg>
              </div>

              
              <div className="relative z-10 flex flex-col justify-between h-full pb-4 lg:pb-0">
                
                
                <LoginStatusClockPills showLiveStatus={showLiveStatus} />

                
                <div className="flex items-center gap-3 sm:gap-4 mb-4 lg:mb-6">
                  
                  <div className="rounded-2xl bg-white p-1.5 shadow-xl border-2 border-white/80 shrink-0 flex items-center justify-center animate-mascot-sway" style={{
              width: '56px',
              height: '56px',
              minWidth: '56px',
              minHeight: '56px',
              maxWidth: '56px',
              maxHeight: '56px'
            }}>
                    <img src="logo.webp" alt="Logo PAUD Setia Bhakti" width="56" height="56" className="w-full h-full max-h-full max-w-full object-contain filter drop-shadow select-none pointer-events-none" />
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

                
                <div className="mb-3 lg:mb-5">
                  <div className="grid grid-cols-2 gap-2.5 text-xs text-blue-100 font-semibold">
                    {loginFeatures.map((feat, idx) => {
                const isActive = activeFeatureIdx === idx;
                const isSpinning = !!spinningIcons[idx];
                return <button key={idx} type="button" onClick={() => triggerIconSpin(idx)} onMouseEnter={() => {
                  setSpinningIcons(prev => ({
                    ...prev,
                    [idx]: true
                  }));
                  setTimeout(() => setSpinningIcons(prev => ({
                    ...prev,
                    [idx]: false
                  })), 700);
                }} className={`login-feature-card-interactive group relative p-2.5 lg:p-3 rounded-2xl border flex items-center gap-2.5 text-left transition-all duration-300 cursor-pointer overflow-hidden ${isActive ? `${feat.activeBorder} scale-[1.02] shadow-lg` : 'bg-white/10 hover:bg-white/15 border-white/15 hover:border-white/30 shadow-xs hover:-translate-y-0.5'}`}>
                          
                          <div className={`absolute inset-0 bg-gradient-to-br ${feat.glowColor} opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none`}></div>

                          
                          <div className={`relative w-8 h-8 lg:w-9 lg:h-9 rounded-xl border ${feat.iconBg} flex items-center justify-center shrink-0 transition-transform duration-500 group-hover:scale-110`}>
                            
                            <span className="login-icon-orbit-ring absolute -inset-1 rounded-xl border border-dashed border-current opacity-40 group-hover:opacity-85 pointer-events-none" style={{
                      animationDelay: `${idx * -1.5}s`
                    }}></span>
                            <Icon name={feat.icon} size={15} className={`login-feature-icon-inner ${isSpinning ? 'login-icon-spin-burst' : 'login-icon-idle-orbit'}`} style={{
                      animationDelay: `${idx * 0.4}s`
                    }} />
                          </div>

                          <div className="min-w-0 flex-1 relative z-10">
                            <p className="font-black text-white text-[11px] lg:text-xs truncate group-hover:text-cyan-200 transition-colors">{feat.title}</p>
                            <p className="text-[9px] lg:text-[10px] text-blue-200/85 truncate">{feat.sub}</p>
                          </div>
                        </button>;
              })}
                  </div>

                  
                  {activeFeatureIdx !== null && loginFeatures[activeFeatureIdx] && <div className="mt-2 px-3 py-2 rounded-xl bg-white/15 border border-cyan-300/30 text-[10px] sm:text-[11px] text-cyan-100 font-bold flex items-center justify-between gap-2 animate-in fade-in duration-200">
                      <span className="leading-snug">{loginFeatures[activeFeatureIdx].detail}</span>
                      <button type="button" onClick={() => setActiveFeatureIdx(null)} className="text-cyan-300 hover:text-white shrink-0 p-0.5" title="Tutup info" aria-label="Tutup informasi fitur">
                        <Icon name="x" size={12} />
                      </button>
                    </div>}
                </div>

                
                <div className="p-3.5 lg:p-4 rounded-2xl bg-gradient-to-br from-white/12 via-white/8 to-cyan-400/10 border border-white/20 text-blue-50 leading-snug w-full mb-3 lg:mb-4 shadow-inner relative overflow-hidden group">
                  <div className="absolute -right-6 -bottom-6 w-20 h-20 rounded-full pointer-events-none" style={{
              background: 'radial-gradient(circle, rgba(34,211,238,0.18) 0%, transparent 70%)'
            }}></div>
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

                
                <div className="hidden lg:flex items-center justify-between pt-3 border-t border-white/15 text-[11px] font-bold text-blue-200 uppercase tracking-wider">
                  <span>PORTAL RESMI SPP</span>
                  <span>VERSI 1.0</span>
                </div>

              </div>
            </div>

            
            <div className="lg:w-[54%] xl:w-[55%] bg-white p-5 sm:p-7 lg:p-10 xl:p-12 flex flex-col justify-between relative z-10 text-slate-800">
              <div>
                
                
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

                
                <div className="p-1 bg-slate-100 rounded-2xl flex items-center mb-4 border border-slate-200/80 shadow-inner">
                  <button type="button" onClick={() => {
              prefetchDashboardCss();
              if (typeof onPrepareAuth === 'function') onPrepareAuth('prefetch');
              if (role !== 'parent') {
                setRole('parent');
                setErrorMsg('');
                setUsername('');
                setPassword('');
                try {
                  sessionStorage.setItem('spp_intended_role', 'parent');
                } catch (e) {}
              }
            }} className={`flex-1 min-h-[44px] py-2.5 px-3 rounded-xl text-xs sm:text-sm font-extrabold transition-all duration-200 flex items-center justify-center gap-2 ${role === 'parent' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30 scale-[1.01]' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'}`}>
                    <Icon name="users" size={17} className="shrink-0" />
                    <span>Wali Murid</span>
                  </button>

                  <button type="button" onClick={() => {
              prefetchDashboardCss();
              if (typeof onPrepareAuth === 'function') onPrepareAuth('prefetch');
              if (role !== 'admin') {
                setRole('admin');
                setErrorMsg('');
                setUsername('');
                setPassword('');
                try {
                  sessionStorage.setItem('spp_intended_role', 'admin');
                } catch (e) {}
              }
            }} className={`flex-1 min-h-[44px] py-2.5 px-3 rounded-xl text-xs sm:text-sm font-extrabold transition-all duration-200 flex items-center justify-center gap-2 ${role === 'admin' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30 scale-[1.01]' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'}`}>
                    <Icon name="shield-check" size={17} className="shrink-0" />
                    <span>Admin TU</span>
                  </button>
                </div>

                
                {errorMsg && <div className="mb-4 p-3.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs sm:text-sm font-bold rounded-2xl flex items-center gap-2.5 animate-in fade-in">
                    <Icon name="alert-circle" size={17} className="text-rose-600 shrink-0" />
                    <span className="min-w-0 flex-1">{errorMsg}</span>
                  </div>}

                
                {role === 'parent' ? <div className="greeting-welcome-banner p-3.5 sm:p-4 rounded-2xl flex items-start sm:items-center gap-3.5 mb-4 border border-blue-100 bg-blue-50/60 shadow-xs relative overflow-hidden">
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
                  </div> : <div className="greeting-welcome-banner p-3.5 sm:p-4 rounded-2xl flex items-start sm:items-center gap-3.5 mb-4 border border-indigo-100 bg-indigo-50/60 shadow-xs relative overflow-hidden">
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
                  </div>}

                
                <form onSubmit={handleLoginSubmit} onFocus={() => {
            prefetchDashboardCss();
            if (typeof onPrepareAuth === 'function') onPrepareAuth('prefetch');
          }} className="space-y-3.5 sm:space-y-4">
                  
                  <div className="space-y-1">
                    <label htmlFor="login-username" className="block text-[11px] sm:text-xs font-black text-slate-700 uppercase tracking-wide">
                      {role === 'admin' ? 'USERNAME / NIP ADMIN TU' : 'NIS / NAMA SISWA'}
                    </label>
                    <div className="relative flex items-center">
                      <div className="absolute left-4 text-slate-400 pointer-events-none">
                        <Icon name={role === 'admin' ? "shield" : "user"} size={18} />
                      </div>
                      <input id="login-username" name="username" autoComplete="username" type="text" required value={username} onChange={e => setUsername(e.target.value)} placeholder={role === 'admin' ? 'Masukkan username / NIP admin' : 'Masukkan NIS atau nama siswa'} className="w-full h-13 min-h-[52px] pl-11 pr-4 bg-slate-50 border-2 border-slate-200 rounded-2xl text-xs sm:text-sm font-bold text-slate-800 focus:outline-none focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/15 transition-all placeholder:text-slate-400 shadow-inner" />
                      {username.trim().length > 0 && <div className="absolute right-4 text-emerald-600">
                          <Icon name="check" size={18} />
                        </div>}
                    </div>
                  </div>

                  
                  <div className="space-y-1">
                    <label htmlFor="login-password" className="block text-[11px] sm:text-xs font-black text-slate-700 uppercase tracking-wide">
                      KATA SANDI
                    </label>
                    <div className="relative flex items-center">
                      <div className="absolute left-4 text-slate-400 pointer-events-none">
                        <Icon name="lock" size={18} />
                      </div>
                      <input id="login-password" name="password" autoComplete="current-password" type={showPassword ? "text" : "password"} required value={password} onChange={e => setPassword(e.target.value)} placeholder={role === 'admin' ? 'Masukkan kata sandi admin' : 'Masukkan kata sandi akun'} className="w-full h-13 min-h-[52px] pl-11 pr-12 bg-slate-50 border-2 border-slate-200 rounded-2xl text-xs sm:text-sm font-bold text-slate-800 focus:outline-none focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/15 transition-all placeholder:text-slate-400 shadow-inner" />
                      <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3.5 text-slate-500 hover:text-blue-600 transition-colors p-1.5" title={showPassword ? "Sembunyikan password" : "Lihat password"} aria-label={showPassword ? "Sembunyikan kata sandi" : "Lihat kata sandi"}>
                        <Icon name={showPassword ? "eye-off" : "eye"} size={18} />
                      </button>
                    </div>
                  </div>

                  
                  <div className="flex items-center justify-between pt-0.5 text-xs sm:text-sm">
                    <label htmlFor="login-remember" className="flex items-center gap-2 cursor-pointer text-slate-600 select-none font-bold">
                      <input id="login-remember" name="rememberMe" type="checkbox" checked={rememberMe} onChange={e => setRememberMe(e.target.checked)} className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer" />
                      <span>Ingat saya</span>
                    </label>

                    {role === 'parent' ? <a href={waLink} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 font-extrabold hover:underline flex items-center gap-1 text-[11px] sm:text-xs">
                        <Icon name="help-circle" size={13} />
                        <span>Lupa Password? Bantuan TU</span>
                      </a> : <span className="text-slate-500 text-xs font-semibold">Administrator TU</span>}
                  </div>

                  
                  <div className="pt-2 space-y-2.5">
                    
                    <button type="submit" disabled={isSubmitting} className={`w-full min-h-[52px] h-13 sm:h-14 rounded-2xl text-white font-black text-sm sm:text-base shadow-xl active:scale-[0.98] transition-all duration-300 flex items-center justify-center gap-2.5 group ${isSubmitting ? 'opacity-80 cursor-wait ' : ''}${role === 'parent' ? 'bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 shadow-blue-600/35 hover:shadow-blue-600/50' : 'bg-gradient-to-r from-indigo-600 via-indigo-700 to-purple-800 hover:from-indigo-700 hover:to-purple-900 shadow-indigo-600/35 hover:shadow-indigo-600/50'}`}>
                      <span>{isSubmitting ? 'Memverifikasi Akun...' : 'Masuk Sekarang'}</span>
                      <Icon name="arrow-right" size={20} className="transition-transform duration-200 group-hover:translate-x-1" />
                    </button>

                    
                    <button type="button" onClick={() => {
                prefetchDashboardCss();
                if (typeof onPrepareAuth === 'function') onPrepareAuth('prefetch');
                const nextRole = role === 'parent' ? 'admin' : 'parent';
                setRole(nextRole);
                try {
                  sessionStorage.setItem('spp_intended_role', nextRole);
                } catch (e) {}
                setErrorMsg('');
                setUsername('');
                setPassword('');
              }} className="w-full min-h-[46px] h-11 sm:h-12 rounded-2xl border-2 border-slate-200 hover:border-blue-400 bg-slate-50 hover:bg-blue-50/60 text-slate-700 hover:text-blue-700 font-extrabold text-xs sm:text-sm active:scale-[0.98] transition-all duration-200 flex items-center justify-center gap-2 shadow-xs">
                      <Icon name="arrow-right-left" size={15} className="text-slate-500" />
                      <span>{role === 'parent' ? 'Beralih ke Portal Login Admin TU' : 'Beralih ke Portal Login Wali Murid'}</span>
                    </button>
                  </div>
                </form>

              </div>
            </div>

          </div>
        </main>;
});

const KickedOutModal = React.memo(function KickedOutModal({
  info,
  onClose
}) {
  if (!info) return null;
  return <div className="fixed inset-0 bg-slate-900/85 z-[9999] flex items-center justify-center p-4 animate-in fade-in duration-200">
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

            <button onClick={onClose} className="w-full py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-black rounded-2xl shadow-lg shadow-blue-500/25 transition-all text-sm flex items-center justify-center gap-2 active:scale-95">
              <Icon name="log-in" size={18} />
              Mengerti & Masuk Kembali
            </button>
          </div>
        </div>;
});
