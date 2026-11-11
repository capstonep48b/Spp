const ICON_ELEMENT_CACHE = new Map();

const toPascalCaseIconName = str => str ? str.split('-').map(part => part.charAt(0).toUpperCase() + part.slice(1)).join('') : '';

const Icon = React.memo(function Icon({
  name,
  size = 18,
  className = "",
  style
}) {
  const iconDef = useMemo(() => {
    if (typeof window === 'undefined') {
      const ssrMap = typeof globalThis !== 'undefined' && globalThis.__SPP_ICONS ? globalThis.__SPP_ICONS : null;
      return ssrMap ? ssrMap[toPascalCaseIconName(name)] || ssrMap[name] || null : null;
    }
    const iconsMap = window.lucide && window.lucide.icons ? window.lucide.icons : window.__SPP_ICONS;
    if (!iconsMap) return null;
    return iconsMap[toPascalCaseIconName(name)] || iconsMap[name] || null;
  }, [name]);
  if (!iconDef) {
    return <span className={`inline-block shrink-0 ${className}`.trim()} style={{
      width: size,
      height: size,
      verticalAlign: 'middle',
      ...style
    }} aria-hidden="true" />;
  }
  let children = ICON_ELEMENT_CACHE.get(name);
  if (!children) {
    children = iconDef.map(([tag, attrs], idx) => React.createElement(tag, {
      key: idx,
      ...attrs
    }));
    ICON_ELEMENT_CACHE.set(name, children);
  }
  const mergedClassName = className && className.includes('mx-auto') ? `shrink-0 ${className}` : `inline-block shrink-0 ${className}`;
  return <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={mergedClassName.trim()} style={{
    verticalAlign: 'middle',
    ...style
  }}>
          {children}
        </svg>;
});

const BannerLiveClockPill = React.memo(function BannerLiveClockPill() {
  const [liveTime, setLiveTime] = React.useState('');
  React.useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      setLiveTime(now.toLocaleTimeString('id-ID', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      }) + ' WIB');
    };
    updateClock();
    const timer = setInterval(updateClock, 1000);
    return () => clearInterval(timer);
  }, []);
  return <div className="px-4 py-2.5 rounded-2xl bg-slate-900/45 border border-white/20 text-right shadow-lg shadow-black/20">
          <div className="flex items-center gap-2 text-xs font-black text-cyan-300 justify-end">
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            <span>Sistem Terhubung</span>
          </div>
          <div className="text-[13px] font-mono font-bold text-white tracking-wider mt-0.5">
            {liveTime || '00:00:00 WIB'}
          </div>
        </div>;
});

const GreetingMascotBanner = React.memo(function GreetingMascotBanner({
  name,
  role = 'Pengguna',
  schoolName,
  academicYear
}) {
  const [hourTick, setHourTick] = React.useState(() => new Date().getHours());
  React.useEffect(() => {
    const timer = setInterval(() => {
      const h = new Date().getHours();
      setHourTick(prev => prev === h ? prev : h);
    }, 60000);
    return () => clearInterval(timer);
  }, []);
  const {
    greeting,
    icon
  } = useMemo(() => {
    const hr = hourTick;
    if (hr >= 3 && hr < 11) {
      return {
        greeting: 'Selamat Pagi',
        icon: '🌅'
      };
    } else if (hr >= 11 && hr < 15) {
      return {
        greeting: 'Selamat Siang',
        icon: '☀️'
      };
    } else if (hr >= 15 && hr < 18) {
      return {
        greeting: 'Selamat Sore',
        icon: '🌤️'
      };
    } else {
      return {
        greeting: 'Selamat Malam',
        icon: '🌙'
      };
    }
  }, [hourTick]);
  return <div className="relative overflow-hidden rounded-[28px] sm:rounded-[32px] p-5 sm:p-7 md:p-8 mb-6 bg-gradient-to-br from-[#072a6b] via-[#0f44ad] to-[#0284c7] text-white border-2 border-cyan-300/40 shadow-2xl shadow-blue-900/40 flex flex-col md:flex-row items-center justify-between gap-5">
          
          <div className="absolute -top-16 -right-16 w-64 h-64 rounded-full pointer-events-none select-none" style={{
      background: 'radial-gradient(circle, rgba(34,211,238,0.22) 0%, transparent 70%)'
    }}></div>
          <div className="absolute -bottom-16 -left-16 w-64 h-64 rounded-full pointer-events-none select-none" style={{
      background: 'radial-gradient(circle, rgba(96,165,250,0.22) 0%, transparent 70%)'
    }}></div>

          <div className="flex items-center gap-4 sm:gap-5 z-10 w-full md:w-auto">
            <div className="relative shrink-0">
              <div className="w-14 h-14 sm:w-16 sm:h-16 md:w-20 md:h-20 rounded-2xl bg-gradient-to-tr from-cyan-400 via-blue-500 to-indigo-600 p-0.5 shadow-xl shadow-blue-900/50 flex items-center justify-center ring-2 ring-white/20">
                <img src="logo.webp" alt="Mascot Logo" loading="lazy" decoding="async" className="w-full h-full object-contain p-1.5 rounded-[14px] bg-slate-950/85" />
              </div>
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-lg sm:text-xl md:text-2xl font-black text-white tracking-tight leading-snug">
                  {role === 'Wali Murid' ? <>
                      {greeting} {icon}! Ayah & Bunda dari <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-sky-200 to-white">{name}</span>
                    </> : <>
                      {greeting} {icon}, <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-sky-200 to-white">{name}</span>
                    </>}
                  <span className="inline-block text-xl sm:text-2xl ml-1">👋</span>
                </h3>
              </div>
              <p className="text-xs sm:text-sm font-medium text-slate-200 mt-1 leading-relaxed">
                {role === 'Wali Murid' ? 'Selamat datang di ruang informasi akademik & SPP ananda. Pantau pembayaran, evaluasi guru, dan pengumuman sekolah dengan nyaman & transparan.' : 'Buku Induk Kesiswaan & Rekapitulasi Pembayaran SPP Sekolah. Kelola administrasi dengan cermat dan rapi.'}
              </p>
              
              <div className="flex flex-wrap items-center gap-2 mt-3">
                <span className="px-3 py-1 rounded-full text-[11px] font-extrabold bg-white/15 text-cyan-200 border border-white/20 shadow-inner flex items-center gap-1.5">
                  🏫 <span>{schoolName || 'PAUD SETIA BHAKTI'}</span>
                </span>
                <span className="px-3 py-1 rounded-full text-[11px] font-extrabold bg-emerald-500/20 text-emerald-200 border border-emerald-400/35 flex items-center gap-1.5">
                  📅 <span>Periode {academicYear || '2026/2027'}</span>
                </span>
                {role === 'Wali Murid' ? <span className="hidden sm:inline-flex px-3 py-1 rounded-full text-[11px] font-extrabold bg-amber-500/25 text-amber-200 border border-amber-400/35 items-center gap-1.5">
                    🎒 <span>Ruang Belajar Ceria & Berakhlak</span>
                  </span> : <span className="hidden sm:inline-flex px-3 py-1 rounded-full text-[11px] font-extrabold bg-amber-500/25 text-amber-200 border border-amber-400/35 items-center gap-1.5">
                    📖 <span>Buku Besar & Kas TU</span>
                  </span>}
              </div>
            </div>
          </div>

          
          <div className="hidden md:flex flex-col items-end gap-2 shrink-0 z-10">
            <BannerLiveClockPill />
            <div className="text-[10px] font-bold text-slate-300 uppercase tracking-widest text-right">
              {role === 'Administrator' ? '🛡️ Administrator Mode' : '👨‍👩‍👧 Portal Wali Terverifikasi'}
            </div>
          </div>
        </div>;
});

const SidebarBottomOrnament = React.memo(function SidebarBottomOrnament({
  roleLabel = 'Portal Terpadu'
}) {
  return <div className="sidebar-corak-ornament px-3.5 pt-4 pb-2 mt-auto relative z-10 select-none pointer-events-none" aria-hidden="true">
          <div className="relative rounded-2xl overflow-hidden border border-cyan-300/20 bg-gradient-to-br from-white/[0.08] via-sky-400/[0.06] to-blue-950/30 p-3.5 shadow-inner">
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
        </div>;
});

const PanelAestheticBg = React.memo(function PanelAestheticBg() {
  return <div className="panel-subtle-bg-layer" aria-hidden="true">
          <div className="panel-subtle-watermark">
            <img src="logo.webp" alt="" className="panel-subtle-watermark-img" />
          </div>
        </div>;
});

const ImagePreviewModal = React.memo(function ImagePreviewModal({
  imageUrl,
  title,
  onClose
}) {
  if (!imageUrl) return null;
  return <div className="fixed inset-0 bg-slate-950/90 z-50 flex items-center justify-center p-4 animate-in fade-in zoom-in-95 duration-200">
          <div className="relative max-w-4xl w-full bg-white rounded-3xl overflow-hidden shadow-2xl border border-white/20 flex flex-col">
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <span className="font-extrabold text-sm truncate">{title || 'Preview Foto Pengumuman'}</span>
              <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-xl text-slate-300 hover:text-white transition-colors">
                <Icon name="x" size={20} />
              </button>
            </div>
            <div className="p-4 bg-slate-950 flex items-center justify-center max-h-[80vh] overflow-auto">
              <img src={imageUrl} alt={title || 'Preview'} decoding="async" className="max-h-[75vh] w-auto max-w-full object-contain rounded-xl shadow-lg border border-slate-800" />
            </div>
            <div className="p-3 bg-slate-900 text-center text-xs text-slate-400">
              Klik di luar atau tombol (X) di pojok kanan atas untuk menutup preview.
            </div>
          </div>
        </div>;
});

const LoadingBarScreen = React.memo(function LoadingBarScreen({
  userRole,
  userName,
  onComplete
}) {
  const [progress, setProgress] = useState(0);
  const isAdmin = userRole === 'admin';
  useEffect(() => {
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        const increment = prev < 50 ? Math.floor(Math.random() * 12) + 8 : prev < 85 ? Math.floor(Math.random() * 10) + 6 : Math.floor(Math.random() * 8) + 4;
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
  return <main aria-label="Memuat Portal SPP" className="loading-screen-royal-nuance select-none">
          
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden" aria-hidden="true">
            <div className="w-[min(85vw,640px)] h-[min(85vw,640px)] opacity-[0.045] flex items-center justify-center pointer-events-none select-none">
              <img src="logo.webp" alt="watermark" className="w-full h-full object-contain filter brightness-125 select-none pointer-events-none" />
            </div>
          </div>

          
          <div className="relative w-full max-w-xl px-8 py-10 sm:px-12 sm:py-12 rounded-[42px] loading-glass-card text-white space-y-7 animate-in fade-in zoom-in-95 duration-300 z-10 border border-cyan-300/35 shadow-[0_30px_90px_-15px_rgba(2,6,23,0.7),0_0_60px_-10px_rgba(6,182,212,0.35)] overflow-hidden">
            
            <div className="relative mx-auto w-36 h-36 mt-5 mb-12 flex items-center justify-center">
              
              <div className="absolute -inset-4 rounded-full opacity-70 animate-pulse-halo pointer-events-none" style={{
          background: 'radial-gradient(circle, rgba(34,211,238,0.55) 0%, rgba(14,165,233,0.3) 45%, transparent 72%)'
        }}></div>
              
              
              <div className="absolute -inset-4 rounded-full border-2 border-dashed border-cyan-400/70 loading-orbit-ring pointer-events-none">
                <span className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-amber-400 shadow-[0_0_12px_#f59e0b] border-2 border-slate-900"></span>
                <span className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 w-2.5 h-2.5 rounded-full bg-sky-400 shadow-[0_0_10px_#38bdf8] border border-slate-900"></span>
              </div>
              <div className="absolute -inset-7 rounded-full border border-dotted border-blue-400/80 loading-orbit-counter pointer-events-none">
                <span className="absolute left-0 top-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-cyan-400 shadow-[0_0_12px_#22d3ee] border-2 border-slate-900"></span>
                <span className="absolute right-0 top-1/2 translate-x-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-indigo-400 shadow-[0_0_10px_#818cf8]"></span>
              </div>

              
              <div className="relative w-28 h-28 rounded-full p-2 bg-gradient-to-tr from-cyan-400 via-sky-500 to-blue-600 shadow-[0_15px_40px_rgba(6,182,212,0.45)] overflow-hidden flex items-center justify-center border-4 border-white/95 bg-white group hover:scale-105 transition-transform animate-pulse-glow">
                <img src="logo.webp" alt="Logo PAUD Setia Bhakti" className="w-full h-full object-contain rounded-full" />
              </div>
            </div>

            
            <div className="text-center space-y-2.5 pt-2">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/15 border border-cyan-400/40 text-cyan-300 shadow-sm">
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

            
            <div className="grid grid-cols-3 gap-3.5 pt-2 text-left">
              {[{
          step: 1,
          label: 'Otorisasi Akun',
          target: 30
        }, {
          step: 2,
          label: 'Sinkronisasi SPP',
          target: 70
        }, {
          step: 3,
          label: 'Membuka Portal',
          target: 95
        }].map(s => {
          const isPassed = progress >= s.target;
          const isCurrent = progress < s.target && (s.step === 1 || progress >= s.target - 35);
          return <div key={s.step} className={`p-3.5 sm:p-4 rounded-2xl border transition-all ${isPassed ? 'bg-emerald-500/20 border-emerald-400/60 text-emerald-200 shadow-[0_0_15px_rgba(16,185,129,0.25)]' : isCurrent ? 'bg-cyan-500/25 border-cyan-300 text-cyan-100 shadow-[0_0_20px_rgba(6,182,212,0.4)] ring-2 ring-cyan-400/50 animate-pulse' : 'bg-white/5 border-white/10 text-white/40'}`}>
                    <div className="flex items-center gap-1.5 mb-1.5">
                      {isPassed ? <div className="w-4 h-4 rounded-full bg-emerald-500 text-slate-950 flex items-center justify-center font-black text-[10px] shadow-sm">
                          ✓
                        </div> : <span className={`w-2.5 h-2.5 rounded-full ${isCurrent ? 'bg-cyan-400 animate-ping' : 'bg-white/20'}`}></span>}
                      <span className="text-[10px] font-black uppercase tracking-wider">Tahap {s.step}</span>
                    </div>
                    <p className="text-xs sm:text-[13px] font-black leading-tight">{s.label}</p>
                  </div>;
        })}
            </div>

            
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
                <div className="h-full rounded-full bg-gradient-to-r from-blue-600 via-cyan-400 to-sky-300 transition-all duration-200 ease-out relative shadow-[0_0_15px_rgba(6,182,212,0.6)] overflow-hidden" style={{
            width: `${progress}%`
          }}>
                  
                  <div className="animate-laser-sweep"></div>
                  
                  
                  <div className="absolute right-0 top-0 bottom-0 w-3 bg-white rounded-full shadow-[0_0_10px_#ffffff]"></div>
                </div>
              </div>
            </div>

            
            <div className="pt-3 border-t border-white/10 flex items-center justify-between text-xs text-slate-300 font-medium tracking-wide">
              <span className="truncate font-bold text-white">PAUD Setia Bhakti • Bekasi</span>
              <span className="flex items-center gap-1.5 text-emerald-300 font-extrabold text-[11px] bg-emerald-500/20 px-2.5 py-1 rounded-full border border-emerald-400/40 shadow-sm">
                <Icon name="shield-check" size={13} className="text-emerald-400" />
                <span>Koneksi Aman Terverifikasi</span>
              </span>
            </div>
          </div>
        </main>;
});

const ToastNotification = React.memo(function ToastNotification({
  toast,
  onClose
}) {
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
  return <div className="fixed top-5 right-5 z-[9999] max-w-md w-full animate-slide-in-right">
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
            <button onClick={onClose} className="absolute top-3 right-3 p-1 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors">
              <Icon name="x" size={16} />
            </button>
            <div className="absolute bottom-0 left-0 h-1 bg-gradient-to-r from-blue-500 via-sky-400 to-indigo-500 w-full"></div>
          </div>
        </div>;
});

const CrudPopupModal = React.memo(function CrudPopupModal({
  popup,
  onClose
}) {
  if (!popup) return null;
  const isConfirm = popup.type === 'confirm' || popup.type === 'delete_confirm';
  const isDelete = popup.type === 'delete' || popup.type === 'delete_confirm';
  const isError = popup.type === 'error';
  const isInfo = popup.type === 'info';
  const isSuccess = popup.type === 'success' || !isConfirm && !isDelete && !isError && !isInfo;
  return <div className="crud-modal-backdrop" onClick={e => {
    if (e.target === e.currentTarget && !isConfirm) onClose();
  }}>
          <div className="crud-modal-card" onClick={e => e.stopPropagation()}>
            
            <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-36 h-36 rounded-full pointer-events-none" style={{
        background: 'radial-gradient(circle, rgba(34,211,238,0.28) 0%, transparent 70%)'
      }}></div>

            
            {!isConfirm && <button type="button" onClick={onClose} className="absolute top-4 right-4 w-9 h-9 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition active:scale-95">
                <Icon name="x" size={18} />
              </button>}

            
            <div className="mx-auto mb-4 w-16 h-16 flex items-center justify-center relative z-10">
              {isConfirm || isDelete ? <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-rose-500 to-amber-500 text-white flex items-center justify-center shadow-xl shadow-rose-500/35 ring-4 ring-rose-100">
                  <Icon name="alert-triangle" size={32} />
                </div> : isError ? <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-rose-600 to-red-500 text-white flex items-center justify-center shadow-xl shadow-rose-500/35 ring-4 ring-rose-100">
                  <Icon name="alert-circle" size={32} />
                </div> : isInfo ? <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-sky-500 to-blue-600 text-white flex items-center justify-center shadow-xl shadow-sky-500/35 ring-4 ring-sky-100">
                  <Icon name="info" size={32} />
                </div> : <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-emerald-500 via-teal-500 to-cyan-500 text-white flex items-center justify-center shadow-xl shadow-emerald-500/35 ring-4 ring-emerald-100">
                  <Icon name="check" size={34} />
                </div>}
            </div>

            
            <h3 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight mb-2">
              {popup.title || (isConfirm ? 'Konfirmasi Tindakan' : isDelete ? 'Data Berhasil Dihapus' : 'Operasi Berhasil')}
            </h3>

            
            <p className="text-xs sm:text-sm font-semibold text-slate-600 leading-relaxed mb-6 px-1">
              {popup.message}
            </p>

            
            {popup.details && typeof popup.details === 'object' && <div className="mb-6 p-4 bg-slate-50 border border-slate-200/90 rounded-2xl text-left text-xs font-semibold text-slate-700 space-y-1.5 shadow-inner">
                {Object.entries(popup.details).map(([key, val]) => <div key={key} className="flex justify-between items-center py-1 border-b border-slate-200/60 last:border-0">
                    <span className="text-slate-500 font-bold">{key}</span>
                    <span className="font-black text-slate-800 truncate max-w-[220px]">{String(val)}</span>
                  </div>)}
              </div>}

            
            {isConfirm ? <div className="flex items-center gap-3 justify-center pt-1">
                <button type="button" onClick={() => {
          if (popup.onCancel) popup.onCancel();
          onClose();
        }} className="flex-1 py-3 px-5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-black text-sm transition active:scale-95 border border-slate-200">
                  {popup.cancelText || 'Batal'}
                </button>
                <button type="button" onClick={() => {
          if (popup.onConfirm) popup.onConfirm();
          onClose();
        }} className="flex-1 py-3 px-5 rounded-2xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-700 hover:to-red-700 text-white font-black text-sm shadow-lg shadow-rose-600/35 transition active:scale-95">
                  {popup.confirmText || 'Ya, Lanjutkan'}
                </button>
              </div> : <div className="flex flex-col sm:flex-row items-center gap-2.5 justify-center pt-1">
                {popup.onExtraAction && popup.extraActionText && <button type="button" onClick={() => {
          popup.onExtraAction();
          onClose();
        }} className="w-full sm:w-auto flex-1 py-3 px-5 rounded-2xl bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-300 font-black text-sm transition flex items-center justify-center gap-2 active:scale-95 shadow-sm">
                    <Icon name={popup.extraActionIcon || 'printer'} size={16} />
                    <span>{popup.extraActionText}</span>
                  </button>}
                <button type="button" onClick={onClose} className="w-full sm:w-auto flex-1 py-3 px-6 rounded-2xl bg-gradient-to-r from-blue-600 via-sky-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600 text-white font-black text-sm shadow-lg shadow-sky-500/35 transition active:scale-95">
                  {popup.buttonText || 'Mengerti & Tutup'}
                </button>
              </div>}
          </div>
        </div>;
});

const RefreshLoadingOverlay = React.memo(function RefreshLoadingOverlay() {
  return <div className="fixed inset-0 z-[99999] bg-slate-950/85 flex flex-col items-center justify-center p-4 animate-in fade-in duration-200 select-none overflow-hidden">
          <div className="loading-glass-card rounded-[32px] p-8 max-w-sm w-full shadow-2xl border border-white/20 flex flex-col items-center text-center relative overflow-hidden animate-in zoom-in-95 duration-200 text-white z-10">
            <div className="w-20 h-20 bg-white/10 rounded-full p-2 mb-4 border border-cyan-400/30 flex items-center justify-center relative shadow-inner">
              <div className="w-16 h-16 rounded-full border-4 border-cyan-400 border-t-transparent animate-spin absolute inset-0 m-auto"></div>
              <img src="logo.webp" alt="PAUD Setia Bhakti" loading="lazy" decoding="async" className="w-10 h-10 object-contain relative z-10" />
            </div>

            <h3 className="text-lg font-black text-white tracking-tight">Menyinkronkan Data...</h3>
            <p className="text-xs text-slate-300 font-medium mt-1 leading-relaxed">
              Harap tunggu sebentar, memperbarui data SPP, siswa & transaksi terbaru...
            </p>

            <div className="w-full bg-slate-950/80 h-2 rounded-full mt-5 overflow-hidden relative border border-white/15">
              <div className="bg-gradient-to-r from-blue-600 via-cyan-400 to-sky-300 h-full w-full animate-loading-bar shadow-[0_0_10px_#22d3ee]"></div>
            </div>
          </div>
        </div>;
});

const LiveCountdownText = React.memo(function LiveCountdownText({
  expiresAtMs
}) {
  const [nowMs, setNowMs] = useState(() => Date.now());
  useEffect(() => {
    if (!expiresAtMs || Date.now() >= expiresAtMs) return undefined;
    setNowMs(Date.now());
    const timer = setInterval(() => {
      const cur = Date.now();
      setNowMs(cur);
      if (cur >= expiresAtMs) {
        clearInterval(timer);
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [expiresAtMs]);
  const diffMs = (expiresAtMs || 0) - nowMs;
  if (diffMs <= 0) return '00:00';
  const totalSecs = Math.floor(diffMs / 1000);
  const hours = Math.floor(totalSecs / 3600);
  const minutes = Math.floor(totalSecs % 3600 / 60);
  const seconds = totalSecs % 60;
  if (hours > 0) {
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
});
