const DashboardView = React.memo(function DashboardView({
  students,
  transactions,
  announcements,
  complaints,
  notes,
  settings = {},
  navigateTo,
  onShowKuitansi,
  onCheckPendingStatus,
  onMarkReadNotification,
  onMarkAllRead,
  onOpenNotifications,
  totalAdminUnread,
  unreadNotesReplies = [],
  onRefresh,
  isRefreshing
}) {
  const [showPivotModal, setShowPivotModal] = useState(null);
  const [showBellDropdown, setShowBellDropdown] = useState(false);
  const [pendingExpiryTick, setPendingExpiryTick] = useState(0);
  const [checkingOrderId, setCheckingOrderId] = useState(null);
  const [unpaidSearch, setUnpaidSearch] = useState('');
  const [unpaidClassFilter, setUnpaidClassFilter] = useState('all');
  const [unpaidStatusFilter, setUnpaidStatusFilter] = useState('all');
  const [showAllUnpaid, setShowAllUnpaid] = useState(false);
  const totalSiswa = students.length;
  const settledTransactions = useMemo(() => transactions.filter(isTrxSettled), [transactions]);
  const totalPemasukan = useMemo(() => {
    return settledTransactions.reduce((acc, curr) => acc + (curr.amount || 0), 0);
  }, [settledTransactions]);
  const unreadComplaints = useMemo(() => complaints.filter(c => isComplaintPending(c)), [complaints]);
  const unreadTrx = useMemo(() => settledTransactions.filter(t => !t.isRead), [settledTransactions]);
  const totalUnreadCount = unreadComplaints.length + unreadTrx.length;
  const effectiveUnreadCount = typeof totalAdminUnread === 'number' ? totalAdminUnread : totalUnreadCount + (unreadNotesReplies ? unreadNotesReplies.length : 0);
  const pemasukanPerKelas = useMemo(() => {
    const data = {};
    settledTransactions.forEach(t => {
      if (!data[t.kelas]) data[t.kelas] = 0;
      data[t.kelas] += t.amount;
    });
    return Object.entries(data).map(([kelas, amount]) => ({
      kelas,
      amount
    }));
  }, [settledTransactions]);
  const activePendingTransactions = useMemo(() => {
    const curNow = Date.now();
    const activeMap = new Map();
    const normStr = v => String(v || '').trim().toLowerCase();
    const isArrLabel = v => {
      const n = normStr(v);
      return n.includes('tunggakan') || n.includes('kelas sebelumnya');
    };
    const sorted = [...transactions].sort((a, b) => (b.createdAtMs || (typeof b.id === 'number' ? b.id : 0)) - (a.createdAtMs || (typeof a.id === 'number' ? a.id : 0)));
    sorted.forEach(trx => {
      if (!isTrxPendingStatus(trx)) return;
      const trxMonthLower = normStr(trx.month);
      const trxIsArrears = isArrLabel(trx.month);
      const trxStudentNameLower = normStr(trx.studentName);
      const matchStudent = other => trx.studentId && other.studentId ? trx.studentId === other.studentId || trxStudentNameLower && normStr(other.studentName) === trxStudentNameLower : trxStudentNameLower && normStr(other.studentName) === trxStudentNameLower;
      const matchedStudent = students.find(s => trx.studentId && s.id === trx.studentId || trxStudentNameLower && normStr(s.name) === trxStudentNameLower);
      const alreadySettled = settledTransactions.some(pt => {
        if (!matchStudent(pt)) return false;
        if (trxIsArrears && isArrLabel(pt.month)) return true;
        const ptMonth = normStr(pt.month);
        return ptMonth && (ptMonth === trxMonthLower || trxMonthLower.startsWith(ptMonth) || ptMonth.startsWith(trxMonthLower));
      }) || trxIsArrears && matchedStudent && Number(matchedStudent.arrearsAmount || 0) <= 0;
      if (alreadySettled) return;
      const expMs = computeClientTransactionExpiryMs(trx);
      if (expMs > 0 && curNow >= expMs) return;
      const stKey = trx.studentId || trxStudentNameLower || 'unknown';
      const billKey = trxIsArrears ? '__arrears__' : trxMonthLower || trx.orderId || String(trx.id);
      const dedupeKey = `${stKey}::${billKey}`;
      if (!activeMap.has(dedupeKey)) {
        activeMap.set(dedupeKey, {
          ...trx,
          computedExpiresAtMs: expMs
        });
      }
    });
    return Array.from(activeMap.values());
  }, [transactions, settledTransactions, students, pendingExpiryTick]);
  useEffect(() => {
    const curNow = Date.now();
    let earliestExp = Infinity;
    activePendingTransactions.forEach(trx => {
      const exp = Number(trx.computedExpiresAtMs || computeClientTransactionExpiryMs(trx) || 0);
      if (exp > curNow && exp < earliestExp) {
        earliestExp = exp;
      }
    });
    if (!Number.isFinite(earliestExp)) return undefined;
    const delay = Math.max(80, Math.min(earliestExp - curNow + 80, 2147483647));
    const timer = setTimeout(() => setPendingExpiryTick(t => t + 1), delay);
    return () => clearTimeout(timer);
  }, [activePendingTransactions, pendingExpiryTick]);
  const totalPendingNominal = useMemo(() => {
    return activePendingTransactions.reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
  }, [activePendingTransactions]);
  const classFilterOptions = useMemo(() => {
    const clsSet = new Set();
    students.forEach(s => {
      if (s.kelas) clsSet.add(s.kelas);
    });
    return ['all', ...Array.from(clsSet).sort()];
  }, [students]);
  const unpaidStudentsReport = useMemo(() => {
    const periodsList = Array.isArray(settings?.academicPeriods) && settings.academicPeriods.length > 0 ? settings.academicPeriods : [];
    const activePeriod = periodsList.find(p => p.isActive) || periodsList[0] || null;
    const sysEarliest = getSystemEarliestPeriodStart(settings);
    const targetEndObj = activePeriod || settings;
    const endM = targetEndObj?.endMonth || settings?.endMonth || 'Juni';
    const endY = parseInt(targetEndObj?.endYear || settings?.endYear, 10) || sysEarliest.year + 1;
    let startM = sysEarliest.month;
    let startY = sysEarliest.year;
    if (activePeriod && !activePeriod.isActive && activePeriod.startMonth && activePeriod.startYear) {
      startM = activePeriod.startMonth;
      startY = parseInt(activePeriod.startYear, 10);
    }
    const baseAcademicMonths = getMonthsList(startM, '', endM, startY, endY);
    const activeSemester = detectSemesterFromPeriod(activePeriod, settings?.semester || 'all');
    const academicMonths = getSemesterMonths(baseAcademicMonths, activeSemester);
    const dueAcademicMonths = academicMonths.filter(m => isMonthDueOrElapsed(m, new Date(), settings?.dueDateDay || 10));
    const activeStudents = students.filter(s => s.statusAktif !== false && (!s.status || String(s.status).toLowerCase() === 'aktif'));
    const list = [];
    activeStudents.forEach(student => {
      const sNameLower = String(student.name || '').trim().toLowerCase();
      const studentSettled = settledTransactions.filter(t => t.studentId === student.id || t.studentName && String(t.studentName).trim().toLowerCase() === sNameLower);
      const paidMonths = studentSettled.map(t => String(t.month || '').trim().toLowerCase());
      const studentDueMonths = dueAcademicMonths.filter(m => isMonthOnOrAfterStudentStart(m, student, settings));
      const unpaidMonths = studentDueMonths.filter(m => {
        const mLower = m.trim().toLowerCase();
        return !paidMonths.some(pm => pm === mLower || pm && mLower.startsWith(pm));
      });
      let previousArrears = Number(student.arrearsAmount) || 0;
      if (student.arrearsNote && student.kelas) {
        const noteLower = String(student.arrearsNote).toLowerCase();
        const clsLower = String(student.kelas).toLowerCase();
        if (noteLower.includes(clsLower) || noteLower.startsWith('sess_')) {
          previousArrears = 0;
        }
      }
      const tarif = Number(student.tarif) || 0;
      const totalDebt = unpaidMonths.length * tarif + previousArrears;
      if (unpaidMonths.length === 0 && previousArrears <= 0) return;
      const studentPending = activePendingTransactions.filter(pt => pt.studentId === student.id || pt.studentName && String(pt.studentName).trim().toLowerCase() === sNameLower);
      list.push({
        student,
        unpaidMonths,
        previousArrears,
        totalDebt,
        pendingTransactions: studentPending,
        hasPending: studentPending.length > 0
      });
    });
    return list.sort((a, b) => b.totalDebt - a.totalDebt || b.unpaidMonths.length - a.unpaidMonths.length || String(a.student.name || '').localeCompare(String(b.student.name || '')));
  }, [students, settledTransactions, activePendingTransactions, settings]);
  const totalUnpaidNominal = useMemo(() => {
    return unpaidStudentsReport.reduce((sum, item) => sum + item.totalDebt, 0);
  }, [unpaidStudentsReport]);
  const filteredUnpaidStudents = useMemo(() => {
    const q = unpaidSearch.trim().toLowerCase();
    return unpaidStudentsReport.filter(item => {
      if (unpaidClassFilter !== 'all' && item.student.kelas !== unpaidClassFilter) return false;
      if (unpaidStatusFilter === 'with_pending' && !item.hasPending) return false;
      if (unpaidStatusFilter === 'pure_unpaid' && item.hasPending) return false;
      if (q) {
        const nameMatch = String(item.student.name || '').toLowerCase().includes(q);
        const nisMatch = String(item.student.nis || '').toLowerCase().includes(q);
        const clsMatch = String(item.student.kelas || '').toLowerCase().includes(q);
        const waliMatch = String(item.student.wali || '').toLowerCase().includes(q);
        if (!nameMatch && !nisMatch && !clsMatch && !waliMatch) return false;
      }
      return true;
    });
  }, [unpaidStudentsReport, unpaidSearch, unpaidClassFilter, unpaidStatusFilter]);
  const visibleUnpaidStudents = showAllUnpaid ? filteredUnpaidStudents : filteredUnpaidStudents.slice(0, 10);
  const scrollToSection = sectionId => {
    if (typeof document === 'undefined') return;
    const el = document.getElementById(sectionId);
    if (el && typeof el.scrollIntoView === 'function') {
      el.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      });
    }
  };
  const handleCheckPendingRow = async trx => {
    if (!onCheckPendingStatus || !trx || checkingOrderId) return;
    setCheckingOrderId(trx.orderId || trx.id);
    try {
      await onCheckPendingStatus(trx);
    } finally {
      setCheckingOrderId(null);
    }
  };
  return <div className="space-y-8 animate-in fade-in duration-300">
          
          {showBellDropdown && <ModalPortal><div className="fixed inset-0 z-[9999] pointer-events-auto">
              
              <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-[2px] z-[9999]" onClick={() => setShowBellDropdown(false)} />
              <div className="fixed inset-x-3 sm:inset-x-auto sm:right-8 top-[74px] sm:top-24 z-[10000] w-auto max-w-sm sm:max-w-none sm:w-96 mx-auto sm:mx-0 bg-white rounded-3xl shadow-2xl border border-slate-200 text-slate-800 p-4 space-y-3 animate-in slide-in-from-top-2 duration-200 max-h-[82vh] overflow-y-auto">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                      <Icon name="bell" size={14} />
                    </div>
                    <h4 className="font-extrabold text-xs uppercase text-slate-800 tracking-wide">Notifikasi Admin</h4>
                    {effectiveUnreadCount > 0 && <span className="px-2 py-0.5 bg-rose-100 text-rose-700 text-[10px] font-black rounded-full">
                        {effectiveUnreadCount} Baru
                      </span>}
                  </div>
                  <div className="flex items-center gap-2">
                    {effectiveUnreadCount > 0 && <button type="button" onClick={() => {
              if (onMarkAllRead) {
                onMarkAllRead();
              } else {
                complaints.forEach(c => onMarkReadNotification && onMarkReadNotification('complaint', c.id));
                transactions.forEach(t => onMarkReadNotification && onMarkReadNotification('transaction', t.id));
                (unreadNotesReplies || []).forEach(n => onMarkReadNotification && onMarkReadNotification('note', n.id));
              }
            }} className="text-[10px] font-bold text-blue-600 hover:text-blue-800 hover:underline">
                        Tandai Dibaca
                      </button>}
                    <button type="button" onClick={() => setShowBellDropdown(false)} className="px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-800 text-xs font-bold transition-colors">
                      Tutup
                    </button>
                  </div>
                </div>

                <div className="space-y-2 max-h-80 overflow-y-auto text-xs pr-0.5">
                  {complaints.length === 0 && transactions.length === 0 && (!unreadNotesReplies || unreadNotesReplies.length === 0) && <div className="text-center py-6 text-slate-400 font-medium">
                      <Icon name="bell-off" size={26} className="mx-auto mb-1.5 text-slate-300" />
                      Belum ada aktivitas notifikasi.
                    </div>}

                  
                  {(unreadNotesReplies || []).map(n => <div key={'dash_note_' + n.id} onClick={() => {
            onMarkReadNotification && onMarkReadNotification('note', n.id);
            setShowBellDropdown(false);
            navigateTo('catatan');
          }} className="p-3 rounded-2xl border border-teal-200 bg-teal-50/90 cursor-pointer hover:scale-[0.99] transition-all text-teal-950 font-bold shadow-2xs">
                      <div className="flex justify-between items-center mb-1 gap-2">
                        <span className="text-teal-900 font-extrabold truncate">Catatan: {n.studentName}</span>
                        <span className="px-1.5 py-0.5 bg-rose-500 text-white rounded text-[9px] font-black shrink-0">{n.unreadCount} Balasan Baru</span>
                      </div>
                      <p className="text-[11px] text-teal-800 truncate">{n.lastCommentText}</p>
                      {n.date && <span className="text-[9.5px] text-teal-700/80 font-semibold mt-1 block">{formatDateTimeIndo(n.date)}</span>}
                    </div>)}

                  
                  {unreadComplaints.map(c => <div key={c.id} onClick={() => {
            onMarkReadNotification && onMarkReadNotification('complaint', c.id);
            setShowBellDropdown(false);
            navigateTo('pengaduan');
          }} className="p-3 rounded-2xl border cursor-pointer transition-all hover:scale-[0.99] bg-amber-50/90 border-amber-200 font-bold shadow-2xs">
                      <div className="flex justify-between items-center mb-1 gap-2">
                        <span className="text-amber-900 font-extrabold truncate">Aduan Masuk: {c.title}</span>
                        <span className="px-1.5 py-0.5 bg-rose-500 text-white rounded text-[9px] font-black shrink-0">Perlu Balasan</span>
                      </div>
                      <p className="text-[11px] text-amber-800 truncate">{c.waliName || 'Wali'} ({c.studentName}) • {c.content}</p>
                      {c.date && <span className="text-[9.5px] text-amber-700/80 font-semibold mt-1 block">{formatDateIndo(c.date)}</span>}
                    </div>)}

                  
                  {unreadTrx.map(t => <div key={t.id} onClick={() => {
            onMarkReadNotification && onMarkReadNotification('transaction', t.id);
            setShowBellDropdown(false);
            onShowKuitansi(t);
          }} className="p-3 rounded-2xl border cursor-pointer transition-all hover:scale-[0.99] bg-emerald-50/90 border-emerald-200 font-bold shadow-2xs">
                      <div className="flex justify-between items-center mb-1 gap-2">
                        <span className="text-emerald-900 font-extrabold truncate">Pembayaran SPP {t.month}</span>
                        <span className="px-1.5 py-0.5 bg-emerald-600 text-white rounded text-[9px] font-black shrink-0">Lunas</span>
                      </div>
                      <p className="text-[11px] text-emerald-800">{t.studentName} • {formatRupiah(t.amount)}</p>
                      {t.date && <span className="text-[9.5px] text-emerald-700/80 font-semibold mt-1 block">{formatDateIndo(t.date)}</span>}
                    </div>)}

                  
                  {complaints.filter(c => !isComplaintPending(c)).slice(0, 4).map(c => <div key={c.id} onClick={() => {
            setShowBellDropdown(false);
            navigateTo('pengaduan');
          }} className="p-3 rounded-2xl border cursor-pointer transition-all hover:bg-slate-100 bg-slate-50/90 border-slate-200 text-slate-600">
                      <div className="flex justify-between items-center mb-0.5 gap-2">
                        <span className="font-bold text-slate-800 truncate">Aduan: {c.title}</span>
                        <span className="text-[10px] text-slate-400 font-semibold shrink-0">Selesai</span>
                      </div>
                      <p className="text-[10.5px] text-slate-500 truncate">{c.waliName} ({c.studentName})</p>
                      {c.date && <span className="text-[9.5px] text-slate-400 font-medium mt-0.5 block">{formatDateIndo(c.date)}</span>}
                    </div>)}
                </div>
              </div>
            </div></ModalPortal>}
          
          
          <GreetingMascotBanner name={settings?.adminName || 'Admin TU'} role="Administrator" schoolName={settings?.schoolName} academicYear={settings?.academicYear} />

          <div className="relative rounded-[28px] sm:rounded-[32px] p-6 sm:p-8 smurf-panel-glow text-slate-800 flex flex-wrap items-center justify-between gap-6">
            <div className="relative z-10">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-100 border border-sky-300/80 text-sky-800 text-xs font-black mb-2 shadow-xs">
                <span className="w-2 h-2 rounded-full bg-cyan-500"></span>
                <span>PANEL ADMINISTRATOR TU</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">Pusat Kendali Administrasi</h2>
              <p className="text-sm sm:text-base text-slate-600 mt-1 font-semibold max-w-xl">Kelola data murid, pantau pembayaran pending Midtrans, daftar siswa belum bayar, hingga respon aduan wali.</p>
            </div>

            <div className="flex items-center gap-3 relative z-10">
              <button onClick={() => onRefresh(true)} title="Refresh Data Baru" className="py-3 px-4.5 bg-sky-50 hover:bg-sky-100 active:scale-95 text-sky-800 rounded-2xl text-sm font-black border border-sky-200 transition-all flex items-center gap-2 shadow-sm">
                <Icon name="refresh-cw" size={18} className={isRefreshing ? 'animate-spin text-sky-600' : 'text-sky-600'} />
                <span className="hidden sm:inline">Refresh Data</span>
              </button>

              <div className="relative">
                <button type="button" onClick={() => {
            if (onOpenNotifications) {
              onOpenNotifications();
            } else {
              setShowBellDropdown(prev => !prev);
            }
          }} className="p-3 bg-sky-50 hover:bg-sky-100 rounded-2xl text-sky-800 relative transition-colors border border-sky-200 shadow-sm" title="Notifikasi Admin">
                  <Icon name="bell" size={20} />
                  {effectiveUnreadCount > 0 && <span className="absolute -top-1 -right-1 w-5 h-5 bg-rose-500 text-white rounded-full text-[10px] font-extrabold flex items-center justify-center border-2 border-white shadow-md">
                      {effectiveUnreadCount}
                    </span>}
                </button>
              </div>

              <button onClick={() => navigateTo('siswa')} className="py-3 px-5 bg-gradient-to-r from-blue-600 via-sky-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600 text-white font-black rounded-2xl text-sm transition-all shadow-lg shadow-sky-500/35 flex items-center gap-2 border border-cyan-300/40 active:scale-95">
                <Icon name="user-plus" size={18} />
                <span>Tambah Siswa</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
            <div onClick={() => setShowPivotModal('siswa')} className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/90 hover:border-blue-300 shadow-sm hover:shadow-xl transition-all cursor-pointer flex items-center gap-4 group transform hover:-translate-y-1 relative overflow-hidden">
              <div className="w-14 h-14 bg-gradient-to-br from-blue-600 to-indigo-600 text-white rounded-2xl flex items-center justify-center shrink-0 shadow-lg shadow-blue-600/30 group-hover:scale-105 transition-transform">
                <Icon name="users" size={26} />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">Total Murid</p>
                <p className="text-2xl font-black text-slate-900 mt-0.5">{totalSiswa} Siswa</p>
              </div>
            </div>

            <div onClick={() => setShowPivotModal('pemasukan')} className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/90 hover:border-emerald-300 shadow-sm hover:shadow-xl transition-all cursor-pointer flex items-center gap-4 group transform hover:-translate-y-1 relative overflow-hidden" title="Klik untuk melihat transaksi pemasukan">
              <div className="w-14 h-14 bg-gradient-to-br from-emerald-500 to-teal-600 text-white rounded-2xl flex items-center justify-center shrink-0 shadow-lg shadow-emerald-500/30 group-hover:scale-105 transition-transform">
                <Icon name="wallet" size={26} />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">Pemasukkan SPP</p>
                <p className="text-2xl font-black text-emerald-600 mt-0.5 truncate">{formatRupiah(totalPemasukan)}</p>
              </div>
            </div>

            <div onClick={() => setShowPivotModal('transaksi')} className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/90 hover:border-indigo-300 shadow-sm hover:shadow-xl transition-all cursor-pointer flex items-center gap-4 group transform hover:-translate-y-1 relative overflow-hidden" title="Klik untuk melihat transaksi lunas">
              <div className="w-14 h-14 bg-gradient-to-br from-indigo-500 to-violet-600 text-white rounded-2xl flex items-center justify-center shrink-0 shadow-lg shadow-indigo-500/30 group-hover:scale-105 transition-transform">
                <Icon name="credit-card" size={26} />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">Transaksi Lunas</p>
                <p className="text-2xl font-black text-slate-900 mt-0.5">{settledTransactions.length} Transaksi</p>
              </div>
            </div>

            <div onClick={() => scrollToSection('admin-pending-report')} className="bg-white rounded-3xl p-5 sm:p-6 border border-amber-200/90 hover:border-amber-400 shadow-sm hover:shadow-xl transition-all cursor-pointer flex items-center gap-4 group transform hover:-translate-y-1 relative overflow-hidden" title="Lihat Laporan Pembayaran Pending Midtrans">
              <div className="w-14 h-14 bg-gradient-to-br from-amber-500 to-orange-600 text-white rounded-2xl flex items-center justify-center shrink-0 shadow-lg shadow-amber-500/30 group-hover:scale-105 transition-transform">
                <Icon name="clock" size={26} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">Pembayaran Pending</p>
                <p className="text-2xl font-black text-amber-700 mt-0.5">{activePendingTransactions.length} Order</p>
                <p className="text-[11px] font-bold text-slate-500 truncate mt-0.5">Nilai {formatRupiah(totalPendingNominal)}</p>
              </div>
            </div>

            <div onClick={() => scrollToSection('admin-unpaid-report')} className="bg-white rounded-3xl p-5 sm:p-6 border border-rose-200/90 hover:border-rose-400 shadow-sm hover:shadow-xl transition-all cursor-pointer flex items-center gap-4 group transform hover:-translate-y-1 relative overflow-hidden" title="Lihat Laporan Siswa Belum Bayar SPP">
              <div className="w-14 h-14 bg-gradient-to-br from-rose-500 to-pink-600 text-white rounded-2xl flex items-center justify-center shrink-0 shadow-lg shadow-rose-500/30 group-hover:scale-105 transition-transform">
                <Icon name="alert-circle" size={26} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">Siswa Belum Bayar</p>
                <p className="text-2xl font-black text-rose-700 mt-0.5">{unpaidStudentsReport.length} Siswa</p>
                <p className="text-[11px] font-bold text-slate-500 truncate mt-0.5">Total {formatRupiah(totalUnpaidNominal)}</p>
              </div>
            </div>

            <div onClick={() => navigateTo('pengaduan')} className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/90 hover:border-sky-300 shadow-sm hover:shadow-xl transition-all cursor-pointer flex items-center gap-4 group transform hover:-translate-y-1 relative overflow-hidden" title="Klik untuk melihat layanan pengaduan">
              <div className="w-14 h-14 bg-gradient-to-br from-sky-500 to-cyan-600 text-white rounded-2xl flex items-center justify-center shrink-0 shadow-lg shadow-sky-500/30 group-hover:scale-105 transition-transform">
                <Icon name="message-square" size={26} />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">Pengaduan Pending</p>
                <p className="text-2xl font-black text-slate-900 mt-0.5">{unreadComplaints.length} Pesan</p>
              </div>
            </div>
          </div>

          <section id="admin-pending-report" className="scroll-mt-20 bg-white rounded-3xl border border-amber-200 shadow-sm overflow-hidden">
            <div className="p-5 sm:p-7 border-b border-amber-100 bg-amber-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start sm:items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-sm">
                  <Icon name="clock" size={22} />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 text-lg sm:text-xl">Laporan Pembayaran Pending Midtrans</h3>
                  <p className="text-xs sm:text-sm text-slate-600 font-medium mt-0.5">
                    Daftar tagihan menunggu pembayaran (batas 5 menit). Otomatis ditutup bila melewati batas waktu.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0 flex-wrap">
                <span className="px-3 py-1 rounded-full bg-amber-500 text-white text-xs font-black shadow-2xs">
                  {activePendingTransactions.length} Transaksi
                </span>
                <span className="px-3 py-1 rounded-full bg-white border border-amber-200 text-amber-900 text-xs font-black">
                  Total {formatRupiah(totalPendingNominal)}
                </span>
              </div>
            </div>

            {activePendingTransactions.length === 0 ? <div className="p-8 text-center flex flex-col items-center justify-center">
                <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mb-2.5">
                  <Icon name="check-circle-2" size={26} />
                </div>
                <p className="font-black text-slate-800 text-base">Tidak Ada Pembayaran Pending</p>
                <p className="text-xs text-slate-500 font-medium mt-1">Semua transaksi online sudah diselesaikan atau belum ada checkout aktif.</p>
              </div> : <>
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 text-xs font-extrabold text-slate-500 uppercase border-b border-slate-200 tracking-wider">
                        <th className="py-3.5 px-5">Nama Siswa</th>
                        <th className="py-3.5 px-5">Tagihan</th>
                        <th className="py-3.5 px-5">Order ID &amp; Kanal</th>
                        <th className="py-3.5 px-5">Nominal</th>
                        <th className="py-3.5 px-5">Sisa Waktu</th>
                        <th className="py-3.5 px-5 text-center">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-sm">
                      {activePendingTransactions.map((trx, idx) => {
                  const expMs = Number(trx.computedExpiresAtMs || computeClientTransactionExpiryMs(trx) || 0);
                  const expClock = expMs > 0 ? new Date(expMs).toLocaleTimeString('id-ID', {
                    hour: '2-digit',
                    minute: '2-digit'
                  }).replace(/\./g, ':') + ' WIB' : '';
                  const payCodeText = trx.vaNumber ? `${trx.vaBank ? `VA ${trx.vaBank}` : 'VA'}: ${trx.vaNumber}` : trx.billKey ? `Bill${trx.billerCode ? ` (${trx.billerCode})` : ''}: ${trx.billKey}` : trx.paymentCode ? `Kode: ${trx.paymentCode}` : '';
                  const isChecking = checkingOrderId && checkingOrderId === (trx.orderId || trx.id);
                  return <tr key={trx.orderId || trx.id || idx} className="hover:bg-amber-50/30 transition-colors">
                            <td className="py-3.5 px-5">
                              <div className="font-extrabold text-slate-900">{trx.studentName}</div>
                              <div className="text-[11px] font-bold text-slate-500">Kelas {trx.kelas || '-'}</div>
                            </td>
                            <td className="py-3.5 px-5">
                              <div className="font-extrabold text-slate-800">{trx.month}</div>
                              <div className="text-[11px] text-slate-400 font-bold">{trx.date || '-'}</div>
                            </td>
                            <td className="py-3.5 px-5">
                              <div className="font-mono text-xs font-bold text-slate-700">{trx.orderId || '-'}</div>
                              <div className="flex flex-wrap items-center gap-1.5 mt-1">
                                <span className="px-2 py-0.5 rounded-md bg-blue-50 border border-blue-200 text-blue-800 text-[10px] font-extrabold">
                                  {trx.method && trx.method !== '-' ? trx.method : 'Midtrans Snap Online'}
                                </span>
                                {payCodeText && <span className="px-2 py-0.5 rounded-md bg-indigo-50 border border-indigo-200 text-indigo-900 text-[10px] font-mono font-bold">
                                    {payCodeText}
                                  </span>}
                              </div>
                            </td>
                            <td className="py-3.5 px-5 font-black text-amber-800">{formatRupiah(trx.amount)}</td>
                            <td className="py-3.5 px-5">
                              {expMs > 0 ? <div>
                                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 font-mono text-xs font-black">
                                    <LiveCountdownText expiresAtMs={expMs} />
                                  </span>
                                  {expClock && <div className="text-[10px] font-bold text-slate-400 mt-0.5">Batas {expClock}</div>}
                                </div> : <span className="text-xs font-bold text-amber-700">Menunggu Midtrans</span>}
                            </td>
                            <td className="py-3.5 px-5 text-center">
                              {trx.orderId ? <button type="button" onClick={() => handleCheckPendingRow(trx)} disabled={Boolean(isChecking)} className="px-3 py-1.5 rounded-xl bg-white hover:bg-amber-50 border border-amber-300 text-amber-900 font-black text-xs transition-all inline-flex items-center gap-1.5 shadow-2xs disabled:opacity-60">
                                  <Icon name={isChecking ? 'loader-2' : 'refresh-cw'} size={13} className={isChecking ? 'animate-spin' : ''} />
                                  <span>{isChecking ? 'Cek...' : 'Cek Status'}</span>
                                </button> : <span className="text-xs text-slate-400 font-bold">-</span>}
                            </td>
                          </tr>;
                })}
                    </tbody>
                  </table>
                </div>

                <div className="md:hidden divide-y divide-amber-100">
                  {activePendingTransactions.map((trx, idx) => {
                const expMs = Number(trx.computedExpiresAtMs || computeClientTransactionExpiryMs(trx) || 0);
                const payCodeText = trx.vaNumber ? `${trx.vaBank ? `VA ${trx.vaBank}` : 'VA'}: ${trx.vaNumber}` : trx.billKey ? `Bill${trx.billerCode ? ` (${trx.billerCode})` : ''}: ${trx.billKey}` : trx.paymentCode ? `Kode: ${trx.paymentCode}` : '';
                const isChecking = checkingOrderId && checkingOrderId === (trx.orderId || trx.id);
                return <div key={trx.orderId || trx.id || idx} className="p-4 space-y-2.5 bg-white">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="font-black text-slate-900 text-sm truncate">{trx.studentName}</p>
                              <p className="text-[11px] font-bold text-slate-500">Kelas {trx.kelas || '-'} • {trx.month}</p>
                            </div>
                            <span className="font-black text-amber-800 text-sm shrink-0">{formatRupiah(trx.amount)}</span>
                          </div>
                          <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
                            <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-mono font-bold">{trx.orderId || '-'}</span>
                            <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-800 border border-blue-200 font-extrabold">
                              {trx.method && trx.method !== '-' ? trx.method : 'Midtrans Snap Online'}
                            </span>
                            {payCodeText && <span className="px-2 py-0.5 rounded bg-indigo-50 text-indigo-900 border border-indigo-200 font-mono font-bold">{payCodeText}</span>}
                          </div>
                          <div className="flex items-center justify-between gap-2 pt-1">
                            {expMs > 0 ? <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 font-mono text-[11px] font-black">
                                <Icon name="clock" size={12} /> <LiveCountdownText expiresAtMs={expMs} />
                              </span> : <span className="text-[11px] font-bold text-amber-700">Menunggu Midtrans</span>}
                            {trx.orderId && <button type="button" onClick={() => handleCheckPendingRow(trx)} disabled={Boolean(isChecking)} className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-black text-xs inline-flex items-center gap-1.5">
                                <Icon name={isChecking ? 'loader-2' : 'refresh-cw'} size={12} className={isChecking ? 'animate-spin' : ''} />
                                <span>{isChecking ? 'Memeriksa...' : 'Cek Status'}</span>
                              </button>}
                          </div>
                        </div>;
              })}
                </div>
              </>}
          </section>

          <section id="admin-unpaid-report" className="scroll-mt-20 bg-white rounded-3xl border border-rose-200 shadow-sm overflow-hidden">
            <div className="p-5 sm:p-7 border-b border-rose-100 bg-rose-50/40 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-start sm:items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-rose-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                    <Icon name="alert-circle" size={22} />
                  </div>
                  <div>
                    <h3 className="font-black text-slate-900 text-lg sm:text-xl">Laporan Siswa Belum Bayar SPP</h3>
                    <p className="text-xs sm:text-sm text-slate-600 font-medium mt-0.5">
                      Rekap siswa aktif dengan tagihan bulan jatuh tempo atau tunggakan bawaan kelas sebelumnya.
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-wrap shrink-0">
                  <span className="px-3 py-1 rounded-full bg-rose-600 text-white text-xs font-black shadow-2xs">
                    {unpaidStudentsReport.length} Siswa Menunggak
                  </span>
                  <span className="px-3 py-1 rounded-full bg-white border border-rose-200 text-rose-800 text-xs font-black">
                    Total {formatRupiah(totalUnpaidNominal)}
                  </span>
                  <button type="button" onClick={() => navigateTo('tunggakan')} className="px-3.5 py-1.5 rounded-full bg-slate-900 hover:bg-slate-800 text-white text-xs font-black transition-colors">
                    Buka Rekap Tunggakan &rarr;
                  </button>
                </div>
              </div>

              <div className="flex flex-col md:flex-row gap-2.5">
                <div className="relative flex-1">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Icon name="search" size={15} />
                  </div>
                  <input type="text" value={unpaidSearch} onChange={e => setUnpaidSearch(e.target.value)} placeholder="Cari nama siswa, NIS, kelas, atau nama wali..." className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-2xl text-xs font-bold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-400" />
                </div>
                <select value={unpaidClassFilter} onChange={e => setUnpaidClassFilter(e.target.value)} className="px-3.5 py-2.5 bg-white border border-slate-200 rounded-2xl text-xs font-extrabold text-slate-700 focus:outline-none focus:ring-2 focus:ring-rose-400">
                  <option value="all">Semua Kelas</option>
                  {classFilterOptions.filter(c => c !== 'all').map(cls => <option key={cls} value={cls}>Kelas {cls}</option>)}
                </select>
                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                  {[{
                id: 'all',
                label: 'Semua'
              }, {
                id: 'pure_unpaid',
                label: 'Belum Ada Proses'
              }, {
                id: 'with_pending',
                label: 'Ada Pending'
              }].map(opt => <button key={opt.id} type="button" onClick={() => setUnpaidStatusFilter(opt.id)} className={`px-3 py-2 rounded-2xl text-xs font-black shrink-0 transition-all border ${unpaidStatusFilter === opt.id ? 'bg-rose-600 text-white border-rose-600 shadow-2xs' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}>
                      {opt.label}
                    </button>)}
                </div>
              </div>
            </div>

            {filteredUnpaidStudents.length === 0 ? <div className="p-8 text-center flex flex-col items-center justify-center">
                <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mb-2.5">
                  <Icon name="shield-check" size={26} />
                </div>
                <p className="font-black text-slate-800 text-base">
                  {unpaidStudentsReport.length === 0 ? 'Semua Siswa Aktif Sudah Lunas!' : 'Tidak Ada Data yang Cocok dengan Filter'}
                </p>
                <p className="text-xs text-slate-500 font-medium mt-1">
                  {unpaidStudentsReport.length === 0 ? 'Seluruh tagihan jatuh tempo siswa aktif telah dilunasi.' : 'Coba ubah kata kunci pencarian atau filter kelas di atas.'}
                </p>
              </div> : <>
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 text-xs font-extrabold text-slate-500 uppercase border-b border-slate-200 tracking-wider">
                        <th className="py-3.5 px-5">Siswa &amp; NIS</th>
                        <th className="py-3.5 px-5">Kelas</th>
                        <th className="py-3.5 px-5">Rincian Tagihan Belum Bayar</th>
                        <th className="py-3.5 px-5">Total Tagihan</th>
                        <th className="py-3.5 px-5 text-center">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-sm">
                      {visibleUnpaidStudents.map(item => {
                  const s = item.student;
                  return <tr key={s.id || s.nis} className="hover:bg-rose-50/25 transition-colors">
                            <td className="py-3.5 px-5">
                              <div className="font-extrabold text-slate-900">{s.name}</div>
                              <div className="text-[11px] font-bold text-slate-500">NIS {s.nis || '-'} • Wali {s.wali || '-'}</div>
                            </td>
                            <td className="py-3.5 px-5">
                              <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 font-black text-xs">{s.kelas}</span>
                            </td>
                            <td className="py-3.5 px-5">
                              <div className="flex flex-wrap items-center gap-1.5">
                                {item.unpaidMonths.slice(0, 6).map(m => {
                          const mLower = m.trim().toLowerCase();
                          const hasPendingForMonth = item.pendingTransactions.some(pt => {
                            const pm = String(pt.month || '').trim().toLowerCase();
                            return pm === mLower || mLower.startsWith(pm) || pm.startsWith(mLower);
                          });
                          return <span key={m} className={`px-2 py-0.5 rounded-md text-[11px] font-extrabold border ${hasPendingForMonth ? 'bg-amber-50 border-amber-300 text-amber-800' : 'bg-rose-50 border-rose-200 text-rose-800'}`}>
                                      {m}{hasPendingForMonth ? ' (Pending)' : ''}
                                    </span>;
                        })}
                                {item.unpaidMonths.length > 6 && <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[11px] font-black">
                                    +{item.unpaidMonths.length - 6} bln lagi
                                  </span>}
                                {item.previousArrears > 0 && <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-100 border border-amber-300 text-amber-900 text-[11px] font-black">
                                    <Icon name="history" size={11} /> Tunggakan Lalu {formatRupiah(item.previousArrears)}
                                  </span>}
                              </div>
                            </td>
                            <td className="py-3.5 px-5 font-black text-rose-700 whitespace-nowrap">{formatRupiah(item.totalDebt)}</td>
                            <td className="py-3.5 px-5 text-center">
                              <div className="inline-flex items-center gap-1.5">
                                <button type="button" onClick={() => navigateTo('transaksi')} className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black text-xs transition-colors">
                                  Catat Bayar
                                </button>
                                <button type="button" onClick={() => navigateTo('tunggakan')} className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-black text-xs transition-colors">
                                  Follow Up
                                </button>
                              </div>
                            </td>
                          </tr>;
                })}
                    </tbody>
                  </table>
                </div>

                <div className="md:hidden divide-y divide-rose-100">
                  {visibleUnpaidStudents.map(item => {
                const s = item.student;
                return <div key={s.id || s.nis} className="p-4 space-y-2.5 bg-white">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="font-black text-slate-900 text-sm truncate">{s.name}</p>
                              <p className="text-[11px] font-bold text-slate-500">Kelas {s.kelas} • NIS {s.nis || '-'}</p>
                            </div>
                            <span className="font-black text-rose-700 text-sm shrink-0">{formatRupiah(item.totalDebt)}</span>
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {item.unpaidMonths.slice(0, 4).map(m => {
                      const mLower = m.trim().toLowerCase();
                      const hasPendingForMonth = item.pendingTransactions.some(pt => {
                        const pm = String(pt.month || '').trim().toLowerCase();
                        return pm === mLower || mLower.startsWith(pm) || pm.startsWith(mLower);
                      });
                      return <span key={m} className={`px-2 py-0.5 rounded text-[10px] font-extrabold border ${hasPendingForMonth ? 'bg-amber-50 border-amber-300 text-amber-800' : 'bg-rose-50 border-rose-200 text-rose-800'}`}>
                                  {m}{hasPendingForMonth ? ' (Pending)' : ''}
                                </span>;
                    })}
                            {item.unpaidMonths.length > 4 && <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-black">
                                +{item.unpaidMonths.length - 4} bln lagi
                              </span>}
                            {item.previousArrears > 0 && <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-300 text-[10px] font-black">
                                Tunggakan {formatRupiah(item.previousArrears)}
                              </span>}
                          </div>
                          <div className="flex items-center gap-2 pt-1">
                            <button type="button" onClick={() => navigateTo('transaksi')} className="flex-1 py-2 px-3 rounded-xl bg-blue-600 text-white font-black text-xs text-center">
                              Catat Bayar
                            </button>
                            <button type="button" onClick={() => navigateTo('tunggakan')} className="flex-1 py-2 px-3 rounded-xl bg-slate-100 text-slate-700 font-black text-xs text-center">
                              Follow Up
                            </button>
                          </div>
                        </div>;
              })}
                </div>

                {filteredUnpaidStudents.length > 10 && <div className="p-4 bg-slate-50/70 border-t border-slate-100 flex items-center justify-center">
                    <button type="button" onClick={() => setShowAllUnpaid(prev => !prev)} className="px-5 py-2 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 font-black text-xs transition-colors inline-flex items-center gap-1.5 shadow-2xs">
                      <Icon name={showAllUnpaid ? 'chevron-up' : 'chevron-down'} size={14} />
                      <span>{showAllUnpaid ? 'Tampilkan Lebih Sedikit' : `Tampilkan Semua (${filteredUnpaidStudents.length} Siswa)`}</span>
                    </button>
                  </div>}
              </>}
          </section>

          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm">
            <h3 className="font-black text-slate-800 text-lg sm:text-xl mb-6 flex items-center gap-2.5">
              <Icon name="bar-chart-2" className="text-indigo-600" size={24} /> Grafik Pemasukan per Kelas
            </h3>
            <div className="flex items-end gap-2 sm:gap-4 h-52 sm:h-64 mt-4">
              {pemasukanPerKelas.map((item, idx) => {
          const maxAmount = Math.max(...pemasukanPerKelas.map(i => i.amount), 1);
          const heightPct = Math.max(item.amount / maxAmount * 100, 5);
          return <div key={idx} className="flex-1 flex flex-col items-center gap-3 group">
                    <div className="w-full flex flex-col justify-end h-full relative">
                      <div className="absolute -top-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-800 text-white text-[10px] py-1 px-2 rounded-lg whitespace-nowrap z-10 pointer-events-none font-bold">
                        {formatRupiah(item.amount)}
                      </div>
                      <div className="w-full max-w-[64px] mx-auto bg-gradient-to-t from-blue-700 to-indigo-400 rounded-t-xl transition-all duration-700 ease-out group-hover:brightness-125 shadow-md shadow-indigo-200" style={{
                height: `${heightPct}%`
              }}></div>
                    </div>
                    <span className="text-xs sm:text-sm font-extrabold text-slate-600 text-center truncate w-full">{item.kelas}</span>
                  </div>;
        })}
              {pemasukanPerKelas.length === 0 && <div className="w-full h-full flex items-center justify-center text-slate-400 text-sm font-bold">Belum ada data pemasukan</div>}
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
                  {transactions.slice(0, 5).map(trx => {
              const settled = isTrxSettled(trx);
              const pending = isTrxPendingStatus(trx);
              const expired = String(trx.status || '').toLowerCase().includes('kadaluarsa') || String(trx.status || '').toLowerCase().includes('expire');
              return <tr key={trx.id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-4 px-6 font-bold text-slate-800">{trx.kuitansiNo}</td>
                        <td className="py-4 px-6 font-bold text-slate-700">{trx.studentName}</td>
                        <td className="py-4 px-6 font-semibold">{trx.kelas}</td>
                        <td className="py-4 px-6">
                          <div className="font-extrabold text-emerald-700">{trx.month}</div>
                          {trx.date && <div className="text-[11px] font-bold text-slate-400 mt-0.5">{formatDateIndo(trx.date)}</div>}
                        </td>
                        <td className="py-4 px-6 font-black text-slate-800">{formatRupiah(trx.amount)}</td>
                        <td className="py-4 px-6 font-medium">
                          <div>{trx.method}</div>
                          {!settled && <span className={`mt-1 ${pending ? 'status-pill-menunggu' : expired ? 'status-pill-kadaluarsa' : 'status-pill-batal'}`}>
                              {pending ? 'Pending' : expired ? 'Kadaluarsa' : 'Dibatalkan'}
                            </span>}
                        </td>
                        <td className="py-4 px-6 text-center">
                          {settled ? <button onClick={() => onShowKuitansi(trx)} className="py-2 px-4 bg-blue-50 text-blue-700 hover:bg-blue-100 font-extrabold rounded-xl text-xs sm:text-sm border border-blue-200 transition-colors">
                              Kuitansi
                            </button> : <span className="text-xs font-bold text-slate-400">-</span>}
                        </td>
                      </tr>;
            })}
                </tbody>
              </table>
            </div>
          </div>

          {showPivotModal && <ModalPortal><div className="fixed inset-0 bg-slate-950/75 backdrop-blur-sm z-[9999] flex items-center justify-center p-3 sm:p-6 overflow-y-auto" onClick={e => {
            if (e.target === e.currentTarget) setShowPivotModal(null);
          }}>
              <div className="bg-white rounded-3xl max-w-4xl w-full p-6 sm:p-8 space-y-4 shadow-2xl animate-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col my-auto relative">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div>
                    <h3 className="font-black text-slate-800 text-lg">
                      {showPivotModal === 'siswa' && 'Rincian Data Siswa Terdaftar'}
                      {(showPivotModal === 'pemasukan' || showPivotModal === 'transaksi') && 'Daftar Transaksi Pemasukan SPP'}
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {showPivotModal === 'siswa' && `Total ${students.length} siswa terdaftar di sistem`}
                      {(showPivotModal === 'pemasukan' || showPivotModal === 'transaksi') && `Total Akumulasi: ${formatRupiah(totalPemasukan)} • ${settledTransactions.length} Transaksi Lunas`}
                    </p>
                  </div>
                  <button onClick={() => setShowPivotModal(null)} className="p-2 text-slate-400 hover:text-slate-600 font-black text-lg">✕</button>
                </div>

                <div className="flex-1 overflow-y-auto space-y-3 text-xs pr-1">
                  {showPivotModal === 'siswa' && <div className="space-y-2">
                      {students.map(s => <div key={s.id} className="p-3 bg-slate-50 rounded-xl flex justify-between items-center border border-slate-200">
                          <div>
                            <p className="font-bold text-slate-800">{s.name}</p>
                            <p className="text-[11px] text-slate-500">NIS: {s.nis} • Kelas: {s.kelas} • Wali: {s.wali || '-'} • WA: {s.telepon || '-'}</p>
                          </div>
                          <span className="font-extrabold text-emerald-700">{formatRupiah(s.tarif)}</span>
                        </div>)}
                      {students.length === 0 && <p className="text-center py-6 text-slate-400 font-medium">Belum ada murid terdaftar.</p>}
                    </div>}

                  {(showPivotModal === 'pemasukan' || showPivotModal === 'transaksi') && <div>
                      {settledTransactions.length === 0 ? <div className="p-8 text-center text-slate-400">
                          <p className="font-bold">Belum ada transaksi pembayaran yang lunas tercatat.</p>
                        </div> : <div className="overflow-x-auto">
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
                              {settledTransactions.map(t => <tr key={t.id} className="hover:bg-slate-50/70">
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
                                    <button onClick={() => {
                        setShowPivotModal(null);
                        onShowKuitansi(t);
                      }} className="px-2.5 py-1 bg-blue-50 text-blue-700 hover:bg-blue-100 font-bold rounded-lg text-xs">
                                      Kuitansi
                                    </button>
                                  </td>
                                </tr>)}
                            </tbody>
                          </table>
                        </div>}
                    </div>}
                </div>
              </div>
            </div></ModalPortal>}

        </div>;
});
