const LaporanView = React.memo(function LaporanView({
  students,
  transactions,
  settings
}) {
  const [filterType, setFilterType] = useState('all');
  const [filterClass, setFilterClass] = useState(() => settings?.customClasses && settings.customClasses.length > 0 ? settings.customClasses[0].name : '');
  const [filterStudent, setFilterStudent] = useState('');
  const [filterSemester, setFilterSemester] = useState('all');
  const [viewMode, setViewMode] = useState('all');
  const [filterTrxScope, setFilterTrxScope] = useState('all');
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
    } else {
      const hasActive = list.some(p => p.isActive);
      if (!hasActive) {
        const matchIdx = list.findIndex(p => p.startMonth === sStartM && parseInt(p.startYear) === sStartY && p.endMonth === sEndM && parseInt(p.endYear) === sEndY);
        if (matchIdx !== -1) {
          list[matchIdx].isActive = true;
        } else {
          list[0].isActive = true;
        }
      }
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
    if (!filterPeriod && activePeriod) {
      setFilterPeriod(String(activePeriod.id));
    }
  }, [activePeriod, filterPeriod]);
  const selectedPeriodObj = useMemo(() => {
    const curId = filterPeriod || (activePeriod ? String(activePeriod.id) : 'all');
    if (curId === 'all') return null;
    return periodsList.find(p => String(p.id) === String(curId)) || null;
  }, [filterPeriod, activePeriod, periodsList]);
  useEffect(() => {
    if (selectedPeriodObj) {
      setFilterSemester(detectSemesterFromPeriod(selectedPeriodObj, 'all'));
    }
  }, [selectedPeriodObj]);
  const selectedStudentObj = useMemo(() => {
    if (!filterStudent) return null;
    return students.find(s => s.id === filterStudent || s.name === filterStudent) || null;
  }, [students, filterStudent]);
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
    const endY = parseInt(settings?.endYear) || sysEarliest.year + 1;
    const baseMonths = getMonthsList(sysEarliest.month, '', endM, sysEarliest.year, endY);
    return getSemesterMonths(baseMonths, filterSemester);
  }, [selectedPeriodObj, filterSemester, settings]);
  const periodStartYear = useMemo(() => {
    if (selectedPeriodObj) return parseInt(selectedPeriodObj.startYear) || 2026;
    return parseInt(settings?.startYear) || 2026;
  }, [selectedPeriodObj, settings]);
  const dueMonths = useMemo(() => {
    return scopeMonths.filter(m => isMonthDueOrElapsed(m, new Date(), settings?.dueDateDay || 10));
  }, [scopeMonths, settings?.dueDateDay]);
  const futureMonths = useMemo(() => {
    return scopeMonths.filter(m => !dueMonths.includes(m));
  }, [scopeMonths, dueMonths]);
  const isTrxInScope = useCallback(trx => {
    if (!trx) return false;
    const trxMonth = (trx.month || '').trim().toLowerCase();
    if (!trxMonth) return false;
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
  const filteredStudents = useMemo(() => {
    let list = students.filter(s => s.statusAktif !== false);
    if (filterType === 'class') {
      list = list.filter(s => (s.kelas || '').toLowerCase().trim() === (filterClass || '').toLowerCase().trim());
    } else if (filterType === 'student') {
      if (filterStudent) {
        list = list.filter(s => String(s.id) === String(filterStudent) || s.name === filterStudent);
      } else {
        return [];
      }
    }
    return list;
  }, [students, filterType, filterClass, filterStudent]);
  const studentReportData = useMemo(() => {
    return filteredStudents.map(student => {
      const studentTrx = transactions.filter(t => {
        const isMatch = t.studentId === student.id || student.name && t.studentName && t.studentName.toLowerCase().trim() === student.name.toLowerCase().trim();
        const st = (t.status || '').toLowerCase().trim();
        const isPaid = st === 'lunas' || st === 'berhasil' || st === 'sukses';
        return isMatch && isPaid;
      });
      const studentScopeMonths = scopeMonths.filter(m => isMonthOnOrAfterStudentStart(m, student, settings));
      const studentDueMonths = dueMonths.filter(m => isMonthOnOrAfterStudentStart(m, student, settings));
      const studentFutureMonths = futureMonths.filter(m => isMonthOnOrAfterStudentStart(m, student, settings));
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
      const unpaidDueMonths = studentDueMonths.filter(m => !paidMonths.includes(m));
      const futureUnpaidMonths = studentFutureMonths.filter(m => !paidMonths.includes(m));
      const tarif = Number(student.tarif) || 350000;
      const totalPaidAmount = paidMonths.length * tarif;
      const previousArrears = Number(student.arrearsAmount) || 0;
      const totalDebtAmount = unpaidDueMonths.length * tarif + previousArrears;
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
  const filteredTransactions = useMemo(() => {
    let res = transactions.filter(t => {
      const st = (t.status || '').toLowerCase().trim();
      return st === 'lunas' || st === 'berhasil' || st === 'sukses';
    });
    if (filterType === 'class') {
      if (filterTrxScope === 'current_only') {
        res = res.filter(t => (t.kelas || '').toLowerCase().trim() === (filterClass || '').toLowerCase().trim());
      } else {
        const studentIdsInClass = new Set(filteredStudents.map(s => String(s.id)));
        const studentNamesInClass = new Set(filteredStudents.map(s => (s.name || '').toLowerCase().trim()));
        res = res.filter(t => (t.kelas || '').toLowerCase().trim() === (filterClass || '').toLowerCase().trim() || t.studentId && studentIdsInClass.has(String(t.studentId)) || t.studentName && studentNamesInClass.has((t.studentName || '').toLowerCase().trim()));
      }
    } else if (filterType === 'student') {
      if (filterStudent) {
        res = res.filter(t => String(t.studentId) === String(filterStudent) || selectedStudentObj && t.studentName && t.studentName.toLowerCase().trim() === selectedStudentObj.name.toLowerCase().trim() || t.studentName && t.studentName.toLowerCase().trim() === String(filterStudent).toLowerCase().trim());
      } else {
        return [];
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
  const currentDateFormatted = now.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
  const semesterLabel = filterSemester === '1' ? 'Semester 1 (Ganjil)' : filterSemester === '2' ? 'Semester 2 (Genap)' : 'Semua Semester';
  return <div className="space-y-6 animate-in fade-in duration-300">
          
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
                <button onClick={handlePrint} className="py-2.5 px-5 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-black text-xs rounded-xl shadow-md transition-all flex items-center gap-2">
                  <Icon name="printer" size={16} /> Cetak Sekarang (PDF)
                </button>
                <button type="button" onClick={handleOpenPrintTab} className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all flex items-center gap-1.5 border border-slate-200" title="Buka dokumen di tab baru untuk dicetak / simpan PDF">
                  <Icon name="external-link" size={15} /> Buka Tab Cetak
                </button>
              </div>
            </div>

            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Berdasarkan</label>
                <select value={filterType} onChange={e => setFilterType(e.target.value)} className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl font-bold text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="all">Semua Siswa</option>
                  <option value="class">Per Kelas</option>
                  <option value="student">Per Nama Siswa</option>
                </select>
              </div>
              
              
              {filterType === 'class' && <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Pilih Kelas</label>
                  <select value={filterClass} onChange={e => setFilterClass(e.target.value)} className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl font-bold text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500">
                    {(settings?.customClasses || []).map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
                  </select>
                </div>}
              
              
              {filterType === 'student' && <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Pilih Siswa</label>
                  <SearchableStudentSelect students={students} value={filterStudent} onChange={e => setFilterStudent(e.target.value)} placeholder="-- Cari & Pilih Siswa --" theme="blue" />
                </div>}

              
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Periode Pembayaran SPP</label>
                <select value={filterPeriod || (activePeriod ? String(activePeriod.id) : 'all')} onChange={e => {
            const newId = e.target.value;
            setFilterPeriod(newId);
            const matchP = periodsList.find(p => String(p.id) === String(newId));
            setFilterSemester(detectSemesterFromPeriod(matchP, 'all'));
          }} className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl font-bold text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="all">Semua Periode</option>
                  {periodsList.map(p => <option key={p.id} value={String(p.id)}>
                      {p.name} {p.isActive ? '(Aktif)' : ''}
                    </option>)}
                </select>
              </div>

              
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5 flex items-center gap-1">
                  <span>Pilih Semester</span>
                  <span className="px-1.5 py-0.2 bg-blue-100 text-blue-700 rounded text-[9px] font-black">Filter</span>
                </label>
                <select value={filterSemester} onChange={e => setFilterSemester(e.target.value)} className="w-full px-3.5 py-2.5 bg-blue-50/60 border border-blue-300 rounded-xl font-bold text-xs text-blue-900 focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="all">Semua Semester (1 Tahun Penuh)</option>
                  <option value="1">Semester 1 (Ganjil)</option>
                  <option value="2">Semester 2 (Genap)</option>
                </select>
              </div>

              
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Bagian Ditampilkan</label>
                <select value={viewMode} onChange={e => setViewMode(e.target.value)} className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl font-bold text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="all">Lengkap (Rekap Siswa + Kuitansi)</option>
                  <option value="rekap">Hanya Rekap Pembayaran & Tunggakan</option>
                  <option value="transaksi">Hanya Riwayat Kuitansi Masuk</option>
                </select>
              </div>

              
              {filterType === 'class' && <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5 flex items-center gap-1">
                    <span>Riwayat Kelas</span>
                    <span className="px-1.5 py-0.2 bg-emerald-100 text-emerald-800 rounded text-[9px] font-black">Pelacakan</span>
                  </label>
                  <select value={filterTrxScope} onChange={e => setFilterTrxScope(e.target.value)} className="w-full px-3.5 py-2.5 bg-emerald-50/60 border border-emerald-300 rounded-xl font-bold text-xs text-emerald-900 focus:outline-none focus:ring-2 focus:ring-emerald-500">
                    <option value="all">Semua Rombel (Termasuk Kelas Sebelumnya)</option>
                    <option value="current_only">Hanya Kelas {filterClass} Saja</option>
                  </select>
                </div>}
            </div>

            
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

          
          <div className="printable-area bg-white rounded-3xl p-6 sm:p-10 border border-slate-200 shadow-sm print:shadow-none print:border-none print:p-0 space-y-8">
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-5 border-b-2 border-slate-900 pb-5 text-center sm:text-left">
              <div className="w-20 h-20 shrink-0 flex items-center justify-center p-1.5 bg-white border-2 border-slate-200 rounded-2xl shadow-sm">
                <img src="logo.webp" alt="PAUD Setia Bhakti" loading="lazy" decoding="async" className="w-full h-full object-contain" />
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
                  <span>CAKUPAN: <strong className="text-slate-900">{filterType === 'all' ? 'SEMUA SISWA' : filterType === 'class' ? `KELAS ${filterClass}` : selectedStudentObj ? `${selectedStudentObj.name} (${selectedStudentObj.kelas})` : 'BELUM ADA SISWA DIPILIH'}</strong></span>
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

            
            {(viewMode === 'all' || viewMode === 'rekap') && <div className="space-y-3">
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
                      {studentReportData.length === 0 ? <tr>
                          <td colSpan="8" className="py-8 text-center text-slate-500 font-bold">
                            {filterType === 'student' && !filterStudent ? 'Belum Ada Siswa yang Dipilih. Silakan cari dan pilih nama siswa pada kolom filter di atas.' : 'Tidak ada data siswa yang sesuai kriteria filter.'}
                          </td>
                        </tr> : studentReportData.map((item, idx) => {
                const {
                  student,
                  paidMonths,
                  unpaidDueMonths,
                  futureUnpaidMonths,
                  totalPaidAmount,
                  totalDebtAmount,
                  isLunas
                } = item;
                return <tr key={student.id || idx} className="hover:bg-slate-50">
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
                              
                              <td className="py-2.5 px-3 border-r border-slate-200">
                                {paidMonths.length > 0 ? <div className="flex flex-wrap gap-1">
                                    {paidMonths.map((m, i) => <span key={i} className="inline-block px-1.5 py-0.5 bg-emerald-100 text-emerald-800 rounded font-black text-[10px]">
                                        {m}
                                      </span>)}
                                    <span className="text-[10px] text-emerald-700 font-bold ml-1 self-center">
                                      ({paidMonths.length} Bln)
                                    </span>
                                  </div> : <span className="text-slate-400 italic text-[11px]">Belum ada pembayaran (-)</span>}
                              </td>
                              
                              <td className="py-2.5 px-3 border-r border-slate-200">
                                {unpaidDueMonths.length > 0 ? <div className="space-y-1">
                                    <div className="flex flex-wrap gap-1">
                                      {unpaidDueMonths.map((m, i) => <span key={i} className="inline-block px-1.5 py-0.5 bg-rose-100 text-rose-800 rounded font-black text-[10px]">
                                          {m}
                                        </span>)}
                                      <span className="text-[10px] text-rose-700 font-black ml-1 self-center">
                                        ({unpaidDueMonths.length} Bulan Menunggak)
                                      </span>
                                    </div>
                                    {futureUnpaidMonths.length > 0 && <p className="text-[9px] text-slate-400 italic">
                                        *Bulan mendatang: {futureUnpaidMonths[0]} s/d {futureUnpaidMonths[futureUnpaidMonths.length - 1]} ({futureUnpaidMonths.length} Bln belum jatuh tempo)
                                      </p>}
                                  </div> : <div>
                                    <span className="inline-flex items-center gap-1 text-emerald-700 font-black text-[11px]">
                                      <Icon name="check-circle" size={12} /> Lunas (0 Tunggakan)
                                    </span>
                                    {futureUnpaidMonths.length > 0 && <p className="text-[9px] text-slate-400 italic">
                                        {futureUnpaidMonths.length} bulan mendatang belum jatuh tempo
                                      </p>}
                                  </div>}
                              </td>
                              
                              <td className="py-2.5 px-3 border-r border-slate-200 text-right font-black text-emerald-700">
                                {formatRupiah(totalPaidAmount)}
                              </td>
                              
                              <td className="py-2.5 px-3 border-r border-slate-200 text-right font-black text-rose-700">
                                {formatRupiah(totalDebtAmount)}
                              </td>
                              
                              <td className="py-2.5 px-3 text-center">
                                {isLunas ? <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded font-black text-[10px] inline-block uppercase">
                                    Lunas
                                  </span> : <span className="px-2 py-0.5 bg-rose-100 text-rose-800 rounded font-black text-[10px] inline-block uppercase">
                                    Nunggak ({unpaidDueMonths.length} Bln)
                                  </span>}
                              </td>
                            </tr>;
              })}
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
              </div>}

            
            {(viewMode === 'all' || viewMode === 'transaksi') && <div className="space-y-3 pt-2">
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
                      {filteredTransactions.length === 0 ? <tr>
                          <td colSpan="8" className="py-8 text-center text-slate-500 font-bold">
                            {filterType === 'student' && !filterStudent ? 'Belum ada siswa yang dipilih. Silakan pilih siswa pada filter di atas.' : 'Tidak ada riwayat kuitansi pembayaran pada periode & semester ini.'}
                          </td>
                        </tr> : filteredTransactions.map((trx, idx) => <tr key={trx.id || idx} className="hover:bg-slate-50">
                            <td className="py-2.5 px-3 border-r border-slate-200 text-center font-bold text-slate-600">{idx + 1}</td>
                            <td className="py-2.5 px-3 border-r border-slate-200 font-semibold">{formatDateIndo(trx.date)}</td>
                            <td className="py-2.5 px-3 border-r border-slate-200 font-bold text-slate-800">{trx.kuitansiNo || '-'}</td>
                            <td className="py-2.5 px-3 border-r border-slate-200 font-black text-slate-900">{trx.studentName}</td>
                            <td className="py-2.5 px-3 border-r border-slate-200">
                              <span className="font-semibold">{trx.kelas}</span>
                              {filterType === 'class' && trx.kelas && (trx.kelas || '').toLowerCase().trim() !== (filterClass || '').toLowerCase().trim() && <span className="block text-[10px] text-amber-700 font-bold">(Kelas Sebelumnya)</span>}
                            </td>
                            <td className="py-2.5 px-3 border-r border-slate-200 font-bold text-emerald-800">
                              <span>{trx.month}</span>
                              {Boolean(trx.keringananNote) && <span className="block text-[10px] font-black text-emerald-700 italic">
                                  * Diringankan ({trx.keringananNote})
                                </span>}
                            </td>
                            <td className="py-2.5 px-3 border-r border-slate-200 text-slate-600">{trx.method || 'Tunai (di TU)'}</td>
                            <td className="py-2.5 px-3 text-right font-black text-emerald-700">
                              <div>{formatRupiah(trx.amount)}</div>
                              {Boolean(trx.keringananNote) && <span className="text-[9px] font-extrabold text-emerald-700 bg-emerald-100/80 px-1 py-0.5 rounded border border-emerald-300">
                                  * Keringanan
                                </span>}
                            </td>
                          </tr>)}
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
              </div>}

            
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
        </div>;
});

const TransaksiHistoryRow = React.memo(function TransaksiHistoryRow({
  trx,
  onShowKuitansi
}) {
  const isLunas = isTrxSettled(trx);
  const isPending = isTrxPendingStatus(trx);
  const statusLower = String(trx.status || '').toLowerCase();
  const isExpired = statusLower.includes('kadaluarsa') || statusLower.includes('expire');
  return <tr className="hover:bg-amber-50/40 transition-colors">
      <td className="py-3.5 px-4 font-mono font-bold text-slate-800 whitespace-nowrap">{trx.kuitansiNo}</td>
      <td className="py-3.5 px-4 font-extrabold text-slate-800 whitespace-nowrap">{trx.studentName}</td>
      <td className="py-3.5 px-4 font-bold text-slate-700 whitespace-nowrap">{trx.kelas}</td>
      <td className="py-3.5 px-4 font-extrabold text-emerald-800 whitespace-nowrap">{trx.month}</td>
      <td className="py-3.5 px-4 font-black text-slate-900 whitespace-nowrap">{formatRupiah(trx.amount)}</td>
      <td className="py-3.5 px-4 text-slate-700 font-semibold whitespace-nowrap">{trx.method}</td>
      <td className="py-3.5 px-4 text-center whitespace-nowrap">
        {isLunas ? <span className="status-pill-lunas">
            <Icon name="check" size={11} /> Lunas
          </span> : isPending ? <span className="status-pill-menunggu">
            <Icon name="clock" size={11} /> Pending
          </span> : isExpired ? <span className="status-pill-kadaluarsa">
            <Icon name="timer-off" size={11} /> Kadaluarsa
          </span> : <span className="status-pill-batal">
            <Icon name="x-circle" size={11} /> Dibatalkan
          </span>}
      </td>
      <td className="py-3.5 px-4 text-slate-600 font-bold whitespace-nowrap">{formatDateIndo(trx.date)}</td>
      <td className="py-3.5 px-4 text-center whitespace-nowrap">
        {isLunas ? <button onClick={() => onShowKuitansi(trx)} className="btn-print-kuitansi" title="Cetak Kuitansi Sah">
            <Icon name="printer" size={13} />
            <span>Cetak Kuitansi</span>
          </button> : <span className="text-xs font-bold text-slate-400">
            {isPending ? 'Menunggu Pembayaran' : '-'}
          </span>}
      </td>
    </tr>;
});

const TransaksiView = React.memo(function TransaksiView({
  students,
  transactions,
  settings,
  onAddTransaction,
  onShowKuitansi,
  onUpdateStudent
}) {
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [selectedMonth, setSelectedMonth] = useState('');
  const [payMethod, setPayMethod] = useState('Tunai (di TU)');
  const [customAmount, setCustomAmount] = useState('');
  const [trxPage, setTrxPage] = useState(1);
  const TRX_PER_PAGE = 15;
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
    const endY = parseInt(settings?.endYear) || sysEarliest.year + 1;
    const baseMonths = getMonthsList(sysEarliest.month, '', endM, sysEarliest.year, endY);
    return getSemesterMonths(baseMonths, filterSemester);
  }, [selectedPeriodObj, filterSemester, settings]);
  const periodStartYear = useMemo(() => {
    if (selectedPeriodObj) return parseInt(selectedPeriodObj.startYear) || 2026;
    return parseInt(settings?.startYear) || 2026;
  }, [selectedPeriodObj, settings?.startYear]);
  const paymentSummary = useMemo(() => {
    if (!selectedStudent) return {
      paidMonths: [],
      unpaidMonths: [],
      dueUnpaidMonths: [],
      futureUnpaidMonths: [],
      pastUnpaidDueMonths: []
    };
    const studentTrx = transactions.filter(t => (t.studentId === selectedStudent.id || t.studentName && t.studentName.toLowerCase().trim() === selectedStudent.name.toLowerCase().trim()) && (t.status === 'Lunas' || t.status === 'lunas' || t.status === 'Berhasil' || t.status === 'Sukses'));
    const studentScopeMonths = scopeMonths.filter(m => isMonthOnOrAfterStudentStart(m, selectedStudent, settings));
    const sysEarliest = getSystemEarliestPeriodStart(settings);
    const studentStart = getStudentEffectiveStart(selectedStudent, settings);
    let pastUnpaidDueMonths = [];
    if (scopeMonths.length > 0) {
      const firstMonthInScope = scopeMonths[0];
      const parts = firstMonthInScope.split(' ');
      const fMonth = parts[0];
      const fYear = parseInt(parts[1]) || sysEarliest.year;
      const fIdx = ALL_MONTHS.indexOf(fMonth);
      const priorMonths = getMonthsList(studentStart.month, '', ALL_MONTHS[(fIdx - 1 + 12) % 12], studentStart.year, fIdx === 0 ? fYear - 1 : fYear);
      if (priorMonths.length > 0 && priorMonths[0] !== firstMonthInScope) {
        pastUnpaidDueMonths = priorMonths.filter(m => {
          if (!isMonthOnOrAfterStudentStart(m, selectedStudent, settings)) return false;
          if (!isMonthDueOrElapsed(m, new Date(), settings?.dueDateDay || 10)) return false;
          const mLower = m.trim().toLowerCase();
          return !studentTrx.some(t => {
            const tMonth = (t.month || '').trim().toLowerCase();
            return tMonth === mLower || tMonth && mLower.startsWith(tMonth);
          });
        });
      }
    }
    const paidMonths = studentScopeMonths.filter(m => {
      const mLower = m.trim().toLowerCase();
      return studentTrx.some(t => {
        const tMonth = (t.month || '').trim().toLowerCase();
        return tMonth === mLower || tMonth && mLower.startsWith(tMonth);
      });
    });
    const allUnpaidMonths = studentScopeMonths.filter(m => !paidMonths.includes(m));
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
  const handleManualPaymentSubmit = e => {
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
    const kuitansiNo = `K-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}-${Math.floor(100 + Math.random() * 900)}`;
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
  return <div className="space-y-6">
          
          <div className="pastel-ledger-card p-6 sm:p-8 space-y-5 relative">
            
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

            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-amber-50/40 rounded-2xl border border-amber-200/70 text-xs">
              <div>
                <label className="block font-black text-slate-700 uppercase mb-1.5 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  <span>PERIODE PEMBAYARAN</span>
                </label>
                <select value={filterPeriod || (activePeriod ? String(activePeriod.id) : 'all')} onChange={e => {
            const newId = e.target.value;
            setFilterPeriod(newId);
            const matchP = periodsList.find(p => String(p.id) === String(newId));
            setFilterSemester(detectSemesterFromPeriod(matchP, defaultSemester));
          }} className="w-full px-4 py-2.5 bg-white border-2 border-emerald-200/90 rounded-2xl font-bold text-slate-800 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-400/20 shadow-2xs">
                  <option value="all">Semua Periode</option>
                  {periodsList.map(p => <option key={p.id} value={String(p.id)}>
                      {p.name} {p.isActive ? '(Aktif)' : ''}
                    </option>)}
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
                <select value={filterSemester} disabled={Boolean(filterPeriod && filterPeriod !== 'all')} onChange={e => setFilterSemester(e.target.value)} className={`w-full px-4 py-2.5 rounded-2xl font-bold border-2 shadow-2xs transition-all ${Boolean(filterPeriod && filterPeriod !== 'all') ? 'bg-slate-100 border-slate-200 text-slate-500 cursor-not-allowed opacity-90' : 'bg-white border-rose-200/90 text-slate-800 focus:outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-400/20'}`}>
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
                <SearchableStudentSelect required students={activeStudents} value={selectedStudentId} onChange={e => setSelectedStudentId(e.target.value)} placeholder="-- Cari & Pilih Murid --" theme="sky" />
              </div>

              <div>
                <label className="block font-black text-slate-700 uppercase mb-1.5 flex items-center justify-between">
                  <span>PILIH KAS / BULAN SPP</span>
                  <span className="text-[10px] font-extrabold text-purple-700">{scopeMonths.length} Bln</span>
                </label>
                <select required value={selectedMonth} onChange={e => {
            const val = e.target.value;
            setSelectedMonth(val);
            if (val.startsWith('Tunggakan') && selectedStudent) {
              setCustomAmount(selectedStudent.arrearsAmount || 0);
            } else if (selectedStudent) {
              setCustomAmount(selectedStudent.tarif || 350000);
            }
          }} className="w-full px-4 py-2.5 bg-white border-2 border-purple-200/90 rounded-2xl font-bold text-slate-800 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-400/20 shadow-2xs">
                  {!selectedStudent ? <>
                      <option value="">-- Pilih Murid Terlebih Dahulu --</option>
                      {scopeMonths.map(m => <option key={m} value={m} disabled>{m} ({selectedPeriodObj?.name || 'Scope Periode'})</option>)}
                    </> : paymentSummary.unpaidMonths.length === 0 && Number(selectedStudent.arrearsAmount || 0) === 0 ? <option value="">Semua Bulan di Semester Ini Sudah Lunas</option> : <>
                      {Number(selectedStudent.arrearsAmount || 0) > 0 && <optgroup label="[Tunggakan Bawaan] Kelas Sebelumnya">
                          <option value={selectedStudent.arrearsNote ? `Tunggakan (${selectedStudent.arrearsNote})` : 'Tunggakan Kelas Sebelumnya'}>
                            {selectedStudent.arrearsNote ? `Tunggakan (${selectedStudent.arrearsNote})` : 'Tunggakan Kelas Sebelumnya'} - {formatRupiah(selectedStudent.arrearsAmount)}
                          </option>
                        </optgroup>}
                      {paymentSummary.pastUnpaidDueMonths && paymentSummary.pastUnpaidDueMonths.length > 0 && <optgroup label="[Sisa Tunggakan Sebelumnya] Periode Lampau">
                          {paymentSummary.pastUnpaidDueMonths.map(m => <option key={m} value={m}>{m} (Menunggak Lampau)</option>)}
                        </optgroup>}
                      {paymentSummary.dueUnpaidMonths.filter(m => !paymentSummary.pastUnpaidDueMonths?.includes(m)).length > 0 && <optgroup label="[Jatuh Tempo] Tagihan Periode Ini">
                          {paymentSummary.dueUnpaidMonths.filter(m => !paymentSummary.pastUnpaidDueMonths?.includes(m)).map(m => <option key={m} value={m}>{m} (Menunggak)</option>)}
                        </optgroup>}
                      {paymentSummary.futureUnpaidMonths.length > 0 && <optgroup label="[Mendatang] Belum Jatuh Tempo (Bayar Awal)">
                          {paymentSummary.futureUnpaidMonths.map(m => <option key={m} value={m}>{m} (Bulan Mendatang)</option>)}
                        </optgroup>}
                    </>}
                </select>
              </div>

              <div>
                <label className="block font-black text-slate-700 uppercase mb-1.5 flex items-center gap-1">
                  <span>METODE BAYAR</span>
                </label>
                <select value={payMethod} onChange={e => setPayMethod(e.target.value)} className="w-full px-4 py-2.5 bg-white border-2 border-emerald-200/90 rounded-2xl font-bold text-slate-800 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-400/20 shadow-2xs">
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
                  <input type="text" required value={formatInputNumber(customAmount)} onChange={e => setCustomAmount(parseNumberOnly(e.target.value))} className="w-full pl-10 pr-4 py-2.5 bg-white border-2 border-amber-200/90 rounded-2xl font-black text-slate-900 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-400/20 shadow-2xs" />
                </div>
              </div>

              {selectedStudent && <div className="md:col-span-2 lg:col-span-4 p-4 bg-amber-50/60 border border-amber-200 rounded-2xl space-y-2 text-xs">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-black text-slate-900 text-sm">{selectedStudent.name}</span>
                      <span className="text-slate-400">•</span>
                      <span className="font-bold text-slate-600">Kelas: <strong className="text-slate-800">{selectedStudent.kelas}</strong></span>
                      <span className="text-slate-400">•</span>
                      <span className="font-bold text-slate-600">Tarif Resmi: <strong className="text-blue-700 font-extrabold">{formatRupiah(selectedStudent.tarif)}/bln</strong></span>
                    </div>
                    {selectedStudent.keringanan_note && <span className="px-2.5 py-1 bg-amber-100 text-amber-900 rounded-lg font-black text-[11px] border border-amber-300 flex items-center gap-1">
                        <Icon name="tag" size={12} /> Keringanan: {selectedStudent.keringanan_note}
                      </span>}
                  </div>

                  <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px]">
                    <span className="font-bold text-slate-500">Status di Semester Ini:</span>
                    <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded-lg font-black flex items-center gap-1">
                      <Icon name="check-circle" size={12} /> {paymentSummary.paidMonths.length} Bulan Lunas
                    </span>
                    {paymentSummary.dueUnpaidMonths.length > 0 ? <span className="px-2.5 py-1 bg-rose-100 text-rose-800 rounded-lg font-black flex items-center gap-1 border border-rose-200">
                        <Icon name="alert-circle" size={12} /> {paymentSummary.dueUnpaidMonths.length} Bulan Menunggak (s/d Bulan Ini)
                      </span> : <span className="px-2.5 py-1 bg-teal-100 text-teal-800 rounded-lg font-black flex items-center gap-1 border border-teal-200">
                        <Icon name="shield-check" size={12} /> 0 Tunggakan (Lunas s/d Bulan Ini)
                      </span>}
                    {paymentSummary.futureUnpaidMonths.length > 0 && <span className="px-2.5 py-1 bg-sky-100 text-sky-800 rounded-lg font-black flex items-center gap-1 border border-sky-200">
                        <Icon name="calendar" size={12} /> {paymentSummary.futureUnpaidMonths.length} Bulan Mendatang (Belum Jatuh Tempo)
                      </span>}
                  </div>
                </div>}

              <div className="md:col-span-2 lg:col-span-4 pt-2">
                <button type="submit" disabled={paymentSummary.unpaidMonths.length === 0} className="py-3 px-6 bg-gradient-to-r from-orange-400 via-amber-500 to-orange-500 hover:from-orange-500 hover:to-amber-600 disabled:opacity-50 disabled:pointer-events-none text-white font-black shadow-md shadow-orange-300/40 rounded-2xl text-xs sm:text-sm transition-all flex items-center gap-2">
                  <Icon name="check-circle" size={16} />
                  <span>Simpan Pembayaran & Terbitkan Kuitansi</span>
                </button>
              </div>
            </form>
          </div>

          
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

            {(() => {
              const totalTrxPages = Math.ceil(transactions.length / TRX_PER_PAGE) || 1;
              const currentTrxPage = Math.min(Math.max(1, trxPage), totalTrxPages);
              const trxStartIdx = (currentTrxPage - 1) * TRX_PER_PAGE;
              const trxEndIdx = Math.min(trxStartIdx + TRX_PER_PAGE, transactions.length);
              const paginatedTransactions = transactions.slice(trxStartIdx, trxEndIdx);
              return <>
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
                        {paginatedTransactions.length > 0 ? paginatedTransactions.map((trx, idx) => <TransaksiHistoryRow key={trx.id || idx} trx={trx} onShowKuitansi={onShowKuitansi} />) : <tr>
                            <td colSpan="9" className="text-center py-8 text-slate-400 font-bold">
                              Belum ada riwayat transaksi pembayaran tercatat.
                            </td>
                          </tr>}
                      </tbody>
                    </table>
                  </div>
                  {transactions.length > TRX_PER_PAGE && <div className="p-4 border-t border-slate-100 bg-slate-50/60 flex flex-col sm:flex-row items-center justify-between gap-3">
                      <p className="text-xs font-bold text-slate-500">
                        Menampilkan <span className="font-extrabold text-slate-800">{trxStartIdx + 1} - {trxEndIdx}</span> dari <span className="font-extrabold text-slate-800">{transactions.length}</span> transaksi
                      </p>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <button type="button" disabled={currentTrxPage <= 1} onClick={() => setTrxPage(p => Math.max(1, p - 1))} className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${currentTrxPage <= 1 ? 'text-slate-300 bg-slate-100 cursor-not-allowed' : 'text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 shadow-2xs cursor-pointer active:scale-95'}`}>
                          Prev
                        </button>
                        {Array.from({
                          length: totalTrxPages
                        }, (_, i) => i + 1).map(pageNum => <button key={pageNum} type="button" onClick={() => setTrxPage(pageNum)} className={`min-w-[32px] h-8 px-2 rounded-xl text-xs font-black transition-all cursor-pointer active:scale-95 ${currentTrxPage === pageNum ? 'bg-blue-600 text-white shadow-xs' : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'}`}>
                            {pageNum}
                          </button>)}
                        <button type="button" disabled={currentTrxPage >= totalTrxPages} onClick={() => setTrxPage(p => Math.min(totalTrxPages, p + 1))} className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${currentTrxPage >= totalTrxPages ? 'text-slate-300 bg-slate-100 cursor-not-allowed' : 'text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 shadow-2xs cursor-pointer active:scale-95'}`}>
                          Next
                        </button>
                      </div>
                    </div>}
                </>;
            })()}
          </div>
        </div>;
});

const AdminTunggakanView = React.memo(function AdminTunggakanView({
  students,
  transactions,
  settings,
  navigateTo
}) {
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
  const defaultSemester = useMemo(() => {
    return detectSemesterFromPeriod(activePeriod, settings?.semester || 'all');
  }, [activePeriod, settings?.semester]);
  const [filterSemester, setFilterSemester] = useState(() => {
    return detectSemesterFromPeriod(activePeriod, settings?.semester || 'all');
  });
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
    const endY = parseInt(targetEndObj?.endYear || settings?.endYear) || sysEarliest.year + 1;
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
  const dueAcademicMonths = useMemo(() => {
    return academicMonths.filter(m => isMonthDueOrElapsed(m, new Date(), settings?.dueDateDay || 10));
  }, [academicMonths, settings?.dueDateDay]);
  const studentDebtList = useMemo(() => {
    return activeStudents.map(student => {
      const studentTrx = transactions.filter(t => (t.studentId === student.id || t.studentName && t.studentName.toLowerCase().trim() === student.name.toLowerCase().trim()) && (t.status === 'Lunas' || t.status === 'lunas' || t.status === 'Berhasil' || t.status === 'Sukses'));
      const paidMonths = studentTrx.map(t => (t.month || '').trim().toLowerCase());
      const studentDueMonths = dueAcademicMonths.filter(m => isMonthOnOrAfterStudentStart(m, student, settings));
      const studentAcademicMonths = academicMonths.filter(m => isMonthOnOrAfterStudentStart(m, student, settings));
      const unpaidMonths = studentDueMonths.filter(m => {
        const mLower = m.trim().toLowerCase();
        return !paidMonths.some(pm => pm === mLower || pm && mLower.startsWith(pm));
      });
      const futureUnpaidMonths = studentAcademicMonths.filter(m => !isMonthDueOrElapsed(m, new Date(), settings?.dueDateDay || 10) && !paidMonths.some(pm => pm === m.trim().toLowerCase() || pm && m.trim().toLowerCase().startsWith(pm)));
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
  const pelunasanPercentage = totalStudents > 0 ? Math.round(studentsLunas.length / totalStudents * 100) : 100;
  const filteredList = useMemo(() => {
    return studentDebtList.filter(item => {
      const {
        student,
        unpaidMonths,
        isLunas
      } = item;
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
    return `Yth. Bapak/Ibu ${student.wali || 'Wali Murid'} dari ananda *${student.name}* (Kelas: ${student.kelas}, NIS: ${student.nis}),\n\n` + `Semoga senantiasa dalam keadaan sehat dan penuh berkah.\n\n` + `Kami dari Bagian Tata Usaha (TU) *${settings.schoolName}* bermaksud menginformasikan status pembayaran SPP yang belum terselesaikan s/d bulan berjalan ini:\n\n` + `📌 *Rincian Tagihan SPP:*\n` + `• Tarif SPP: *${formatRupiah(student.tarif)}/bulan*${student.keringanan_note ? ` (Keringanan: ${student.keringanan_note})` : ''}\n` + (unpaidMonths.length > 0 ? `• Bulan Tertunggak (s/d Bulan Berjalan): *${monthsStr}* (${unpaidMonths.length} bulan)\n` : '') + (hasPrevArrears ? `• Sisa Tunggakan Kelas Sebelumnya: *${formatRupiah(student.arrearsAmount)}* (${student.arrearsNote || 'Tunggakan Kelas Sebelumnya'})\n` : '') + `• Total Tagihan: *${formatRupiah(totalDebt)}*\n\n` + `Pembayaran dapat ditransfer ke rekening resmi sekolah atau diserahkan langsung di kantor TU.\n` + `Apabila Bapak/Ibu telah melakukan pembayaran sebelumnya, mohon konfirmasikan bukti transfer kepada kami.\n\n` + `Terima kasih banyak atas perhatian dan kerja samanya. 🙏\n\n` + `_Tata Usaha ${settings.schoolName}_`;
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
  return <div className="space-y-6 animate-in fade-in duration-300">
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

            <button onClick={() => navigateTo('transaksi')} className="py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-xl text-xs transition-colors flex items-center gap-2 shadow-sm shrink-0">
              <Icon name="plus-circle" size={16} /> Catat Bayar Manual
            </button>
          </div>

          
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

          
          <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200 shadow-sm flex flex-col lg:flex-row gap-3.5 items-stretch lg:items-center justify-between">
            <div className="relative w-full sm:w-80 lg:w-80 flex items-center">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Icon name="search" size={16} />
              </div>
              <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Cari nama siswa, NIS, wali..." className="w-full pl-10 pr-9 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white shadow-xs transition-all" />
              {searchQuery && <button type="button" onClick={() => setSearchQuery('')} className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600">
                  <Icon name="x" size={14} />
                </button>}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:flex lg:flex-wrap items-center gap-2.5 w-full lg:w-auto text-xs font-bold">
              <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="w-full sm:w-auto min-h-[42px] px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-xs">
                <option value="tunggakan">Hanya Belum Lunas ({studentsWithDebt.length})</option>
                <option value="semua">Semua Siswa ({totalStudents})</option>
                <option value="lunas">Hanya Sudah Lunas ({studentsLunas.length})</option>
              </select>

              <select value={filterPeriod || (activePeriod ? String(activePeriod.id) : 'all')} onChange={e => {
          const newId = e.target.value;
          setFilterPeriod(newId);
          const matchP = periodsList.find(p => String(p.id) === String(newId));
          setFilterSemester(detectSemesterFromPeriod(matchP, defaultSemester));
        }} className="w-full sm:w-auto min-h-[42px] px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-xs">
                <option value="all">Semua Periode</option>
                {periodsList.map(p => <option key={p.id} value={p.id}>
                    {p.name || `Periode ${p.startMonth} ${p.startYear} - ${p.endMonth} ${p.endYear}`} {p.isActive ? '(Aktif)' : ''}
                  </option>)}
              </select>

              <select value={filterSemester} onChange={e => setFilterSemester(e.target.value)} className="w-full sm:w-auto min-h-[42px] px-3.5 py-2.5 bg-blue-50/80 border border-blue-200 rounded-xl text-blue-900 font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-xs">
                <option value="all">Semua Semester</option>
                <option value="1">Semester 1 (Ganjil)</option>
                <option value="2">Semester 2 (Genap)</option>
              </select>

              <select value={filterKelas} onChange={e => setFilterKelas(e.target.value)} className="w-full sm:w-auto min-h-[42px] px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-xs">
                <option value="Semua Kelas">Semua Kelas</option>
                {availableClasses.map(cls => <option key={cls} value={cls}>{cls}</option>)}
              </select>

              <select value={filterMonth} onChange={e => setFilterMonth(e.target.value)} className="w-full sm:w-auto min-h-[42px] px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-xs sm:col-span-2 lg:col-span-1">
                <option value="Semua Bulan">Semua Bulan Periode</option>
                {academicMonths.map(m => {
            const isDue = isMonthDueOrElapsed(m, new Date(), settings?.dueDateDay || 10);
            return <option key={m} value={m}>
                      {m} {isDue ? '(Berjalan/Due)' : '(Mendatang)'}
                    </option>;
          })}
              </select>
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            {filteredList.length === 0 ? <div className="p-12 text-center flex flex-col items-center justify-center">
                <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-3">
                  <Icon name="check-circle" size={32} />
                </div>
                <h3 className="font-black text-slate-800 text-lg">Tidak Ada Data Tertunggak</h3>
                <p className="text-xs text-slate-500 font-medium mt-1">
                  {filterStatus === 'tunggakan' ? 'Semua murid pada filter ini telah melunasi pembayaran SPP s/d bulan berjalan.' : 'Tidak ada murid yang sesuai dengan filter pencarian.'}
                </p>
              </div> : <div className="divide-y divide-slate-100">
                {filteredList.map(({
          student,
          unpaidMonths,
          futureUnpaidMonths,
          totalDebt,
          isLunas
        }) => <div key={student.id} className="p-5 sm:p-6 hover:bg-slate-50/70 transition-colors flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div className="flex items-start gap-4 min-w-[280px]">
                      <div className="w-12 h-12 rounded-2xl bg-teal-100 border border-teal-200 flex items-center justify-center font-bold text-teal-800 text-lg shrink-0 overflow-hidden shadow-inner">
                        {student.fotoUrl ? <img src={student.fotoUrl} alt={student.name} loading="lazy" decoding="async" className="w-full h-full object-cover" /> : student.name.charAt(0).toUpperCase()}
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
                          {student.keringanan_note && <span className="px-2 py-0.5 bg-amber-100 text-amber-900 rounded-md text-[10px] font-black border border-amber-200">
                              Keringanan: {student.keringanan_note}
                            </span>}
                        </div>
                        <div className="flex items-center gap-2 mt-1.5 text-xs text-slate-600">
                          <span className="font-medium">Wali: <strong className="text-slate-800">{student.wali || '-'}</strong></span>
                          {student.telepon ? <span className="inline-flex items-center gap-1 font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100 text-[11px]">
                              <Icon name="phone" size={11} /> {student.telepon}
                            </span> : <span className="text-[10px] font-bold text-rose-500 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-100">
                              No WA Belum Diisi
                            </span>}
                        </div>
                      </div>
                    </div>

                    <div className="flex-1 lg:px-4">
                      {isLunas ? <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-100 text-emerald-800 rounded-full text-xs font-black">
                          <Icon name="check-circle-2" size={14} /> Lunas s/d Bulan Berjalan
                        </div> : <div className="space-y-1.5">
                          {unpaidMonths.length > 0 && <>
                              <p className="text-[11px] font-black text-rose-600 uppercase tracking-wider flex items-center gap-1">
                                <Icon name="clock" size={12} /> {unpaidMonths.length} Bulan Menunggak (s/d Bulan Berjalan):
                              </p>
                              <div className="flex flex-wrap gap-1.5">
                                {unpaidMonths.map((m, idx) => <span key={idx} className="px-2.5 py-1 bg-rose-50 text-rose-700 border border-rose-200 rounded-lg text-[11px] font-extrabold">
                                    {m}
                                  </span>)}
                              </div>
                            </>}
                          {Number(student.arrearsAmount) > 0 && <div className="mt-1 px-2.5 py-1 bg-amber-50 border border-amber-300 rounded-lg text-[11px] font-extrabold text-amber-900 inline-flex items-center gap-1.5">
                              <Icon name="alert-triangle" size={12} className="text-amber-600" />
                              <span>Tunggakan Bawaan Kelas Sebelumnya: {formatRupiah(student.arrearsAmount)}</span>
                            </div>}
                        </div>}
                    </div>

                    <div className="flex items-center justify-between lg:justify-end gap-3 shrink-0 pt-3 lg:pt-0 border-t lg:border-t-0 border-slate-100">
                      <div className="text-left lg:text-right">
                        <p className="text-[10px] font-bold text-slate-400 uppercase">Total Tagihan</p>
                        <p className={`text-lg font-black ${isLunas ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {isLunas ? 'Rp 0' : formatRupiah(totalDebt)}
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        {!isLunas && <>
                            <button type="button" onClick={() => handleWhatsAppClick(student, unpaidMonths, totalDebt)} className="px-3.5 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-black rounded-xl text-xs transition-all shadow-md shadow-emerald-600/25 flex items-center gap-1.5" title="Kirim pesan penagihan langsung ke WhatsApp wali murid">
                              <Icon name="message-circle" size={16} />
                              <span>Chat WA</span>
                            </button>

                            <button type="button" onClick={() => handleCopyMessage(student, unpaidMonths, totalDebt)} className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-colors border border-slate-200" title="Salin Pesan Follow Up">
                              <Icon name={copiedStudentId === student.id ? "check" : "copy"} size={16} className={copiedStudentId === student.id ? "text-emerald-600" : ""} />
                            </button>
                          </>}

                        <button type="button" onClick={() => navigateTo('transaksi')} className="px-3 py-2.5 bg-blue-50 hover:bg-blue-100 text-blue-700 font-extrabold rounded-xl text-xs transition-colors border border-blue-200" title="Buka menu catat pembayaran manual">
                          Bayar
                        </button>
                      </div>
                    </div>
                  </div>)}
              </div>}
          </div>
        </div>;
});
