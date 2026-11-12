const checkStudentGraduated = student => {
  if (!student) return false;
  return student.statusAktif === false || (student.status || '').toLowerCase() === 'lulus' || (student.status || '').toLowerCase() === 'non-aktif' || (student.kelas || '').toLowerCase().includes('lulus') || (student.kelas || '').toLowerCase().includes('alumni');
};

const checkStudentClassDone = (student, clsName, classList) => {
  if (!student || !clsName) return false;
  if (checkStudentGraduated(student)) return true;
  const targetNameLower = clsName.trim().toLowerCase();
  const currentClassLower = (student.kelas || '').trim().toLowerCase();
  const overrides = student.completedLevels || {};
  if (overrides[clsName] !== undefined) {
    return Boolean(overrides[clsName]);
  }
  if (currentClassLower === targetNameLower) return true;
  const targetIdx = classList.findIndex(c => c.name.trim().toLowerCase() === targetNameLower);
  const currentIdx = classList.findIndex(c => c.name.trim().toLowerCase() === currentClassLower);
  if (targetIdx !== -1 && currentIdx !== -1 && currentIdx >= targetIdx) {
    return true;
  }
  const history = Array.isArray(student.classHistory) ? student.classHistory : [];
  return history.some(h => h.fromClass && h.fromClass.trim().toLowerCase() === targetNameLower || h.toClass && h.toClass.trim().toLowerCase() === targetNameLower);
};

const buildStudentWaHref = numStr => {
  if (!numStr) return '#';
  let clean = numStr.replace(/[^0-9]/g, '');
  if (clean.startsWith('0')) clean = '62' + clean.slice(1);else if (clean.startsWith('8')) clean = '62' + clean;
  return `https://wa.me/${clean}`;
};

const SiswaBiodataRow = React.memo(function SiswaBiodataRow({
  s,
  classList,
  defaultStartMonth,
  defaultStartYear,
  onSelectBiodata,
  onSelectHistory,
  onOpenWa,
  onOpenPromotion,
  onOpenEdit,
  onDeleteStudent,
  onToggleAccountStatus
}) {
  const isLulus = checkStudentGraduated(s);
  return <tr className="hover:bg-slate-50 transition-colors">
      <td className="py-4 px-6">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-teal-100 border border-teal-200 flex items-center justify-center font-black text-teal-800 text-sm overflow-hidden shrink-0 shadow-inner">
            {s.fotoUrl ? <img src={s.fotoUrl} alt={s.name} loading="lazy" decoding="async" className="w-full h-full object-cover" /> : s.name.charAt(0)}
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
            <span className={`px-2 py-0.5 rounded-md font-black text-[10px] ${s.jk === 'P' ? 'bg-pink-100 text-pink-700 border border-pink-200' : 'bg-blue-100 text-blue-700 border border-blue-200'}`}>
              {s.jk === 'P' ? 'Perempuan (P)' : 'Laki-laki (L)'}
            </span>
            {s.agama && <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded-md text-[10px] font-bold">
                {s.agama}
              </span>}
          </div>
          {(s.tempatLahir || s.tanggalLahir) && <p className="text-slate-600 font-semibold text-[11px] truncate" title={`${s.tempatLahir || '-'}, ${s.tanggalLahir || '-'}`}>
              📍 {s.tempatLahir || '-'}{s.tanggalLahir ? `, ${s.tanggalLahir}` : ''}
            </p>}
          <p className="text-slate-700 font-bold text-[11px] truncate" title={`${s.alamat || '-'} RT ${s.rt || '-'}/RW ${s.rw || '-'}`}>
            🏠 {s.alamat || '-'} {s.rt || s.rw ? <span className="font-mono text-blue-800 font-extrabold">(RT {s.rt || '0'}/RW {s.rw || '0'})</span> : null}
          </p>
          <button type="button" onClick={() => onSelectBiodata(s)} className="inline-flex items-center gap-1 text-[11px] text-blue-600 hover:text-blue-800 font-black hover:underline pt-0.5">
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
          <span>Mulai: {s.startActiveMonth || defaultStartMonth || 'Jan'} {s.startActiveYear || defaultStartYear || ''}</span>
        </div>
        <div className="flex items-center gap-1 mt-1.5 flex-wrap" title={`Progres Jenjang: ${classList.map(c => c.name).join(' ➔ ')} ➔ Lulus`}>
          {classList.map((c, cIdx) => {
            const completed = checkStudentClassDone(s, c.name, classList);
            return <React.Fragment key={c.name || cIdx}>
                {cIdx > 0 && <span className="text-slate-300 text-[9px]">➔</span>}
                <span className={`px-1.5 py-0.5 rounded text-[9px] font-black ${completed ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' : 'bg-slate-100 text-slate-400'}`}>
                  {c.name}{completed ? ' ✓' : ''}
                </span>
              </React.Fragment>;
          })}
          {isLulus && <>
              <span className="text-slate-300 text-[9px]">➔</span>
              <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-purple-100 text-purple-800 border border-purple-300">
                Lulus ✓
              </span>
            </>}
        </div>
        <button type="button" onClick={() => onSelectHistory(s)} className="mt-1.5 inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 hover:text-indigo-900 border border-indigo-200 text-[10px] font-bold transition-all shadow-2xs group cursor-pointer" title="Klik untuk membuka Tabel Riwayat Jenjang Kelas & Mutasi Siswa">
          <Icon name="history" size={11} className="group-hover:rotate-45 transition-transform" />
          <span>Riwayat Jenjang ({Array.isArray(s.classHistory) ? s.classHistory.length : 0})</span>
        </button>
      </td>
      <td className="py-4 px-6">
        <div className="font-black text-blue-700 text-sm sm:text-base">{formatRupiah(s.tarif)}</div>
        {s.keringanan_note && <span className="inline-flex items-center gap-1 mt-1 px-2.5 py-0.5 bg-amber-100 text-amber-900 text-xs font-black rounded-lg border border-amber-200">
            <Icon name="tag" size={12} /> {s.keringanan_note}
          </span>}
        {Number(s.arrearsAmount) > 0 && <div className="mt-1 px-2 py-0.5 bg-rose-50 text-rose-700 rounded-md text-[10px] font-black border border-rose-200 flex items-center gap-1" title={s.arrearsNote}>
            <Icon name="alert-triangle" size={10} />
            <span>Tunggakan Lama: {formatRupiah(s.arrearsAmount)}</span>
          </div>}
      </td>
      <td className="py-4 px-6 text-slate-600">
        <div className="flex flex-col gap-1.5 min-w-[200px]">
          <div>
            <p className="font-extrabold text-slate-800 text-sm">{s.wali || '-'}</p>
            {s.telepon ? <a href={buildStudentWaHref(s.telepon)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-emerald-700 transition-colors mt-0.5" title="Chat WhatsApp langsung">
                <Icon name="phone" size={13} className="text-emerald-600" />
                <span>{s.telepon}</span>
              </a> : <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md mt-0.5">
                <Icon name="alert-circle" size={12} /> No. WA belum ada
              </span>}
          </div>
          <div className="flex items-center gap-1.5 py-0.5">
            <span className="text-[10px] font-bold text-slate-400">Password:</span>
            <span className="font-mono font-black text-xs text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200 select-all tracking-wider" title="Password login akun siswa (campuran huruf & angka)">
              {s.password || (s.nis ? `Sb${s.nis}` : '-')}
            </span>
            <button type="button" onClick={() => {
              const pwdToCopy = s.password || (s.nis ? `Sb${s.nis}` : '');
              if (pwdToCopy) {
                navigator.clipboard.writeText(pwdToCopy);
                alert(`Password '${pwdToCopy}' untuk siswa ${s.name} berhasil disalin ke clipboard!`);
              }
            }} className="p-1 text-slate-400 hover:text-blue-600 transition-colors" title="Salin password ke clipboard">
              <Icon name="copy" size={12} />
            </button>
          </div>
          <div>
            <button type="button" onClick={() => onOpenWa(s)} className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black transition-all shadow-sm ${s.telepon ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20 active:scale-95 hover:scale-105' : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300'}`} title={`Kirim kredensial login (NIS: ${s.nis}) ke WhatsApp Wali`}>
              <Icon name="message-circle" size={14} className={s.telepon ? 'text-white' : 'text-emerald-700'} />
              <span>Kirim Info Login</span>
            </button>
          </div>
        </div>
      </td>
      <td className="py-4 px-6">
        <div className="flex flex-col items-start gap-1.5">
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => onToggleAccountStatus(s)} className={`relative inline-flex h-7 w-14 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none shadow-sm ${s.statusAktif ? 'bg-emerald-600 shadow-emerald-500/25 ring-2 ring-emerald-500/20' : 'bg-slate-300 ring-2 ring-slate-400/20'}`} title={s.statusAktif ? 'Klik untuk mematikan akun (OFF: Keluar / Lulus)' : 'Klik untuk menyalakan akun (ON: Aktif)'}>
              <span className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out flex items-center justify-center font-black text-[9px] ${s.statusAktif ? 'translate-x-7 text-emerald-700' : 'translate-x-0 text-slate-500'}`}>
                {s.statusAktif ? 'ON' : 'OFF'}
              </span>
            </button>
            <span className={`text-[11px] font-black px-2 py-0.5 rounded-lg border ${s.statusAktif ? 'bg-emerald-50 text-emerald-800 border-emerald-300' : 'bg-rose-50 text-rose-800 border-rose-300'}`}>
              {s.statusAktif ? 'ON (Aktif)' : 'OFF (Keluar/Lulus)'}
            </span>
          </div>
          {s.statusAktif ? <span className="text-[10px] font-bold text-emerald-700 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              Bisa Login Portal
            </span> : <span className="text-[10px] font-bold text-rose-600 flex items-center gap-1 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200">
              <Icon name="lock" size={10} /> Akses Login Terkunci
            </span>}
        </div>
      </td>
      <td className="py-4 px-6 text-center space-x-1.5 whitespace-nowrap">
        <button type="button" onClick={() => onSelectBiodata(s)} className="p-2.5 text-blue-600 hover:bg-blue-50 rounded-xl transition-all" title="Lihat Kartu Biodata Murid Lengkap (Format Resmi)">
          <Icon name="id-card" size={18} />
        </button>
        <button type="button" onClick={() => onOpenPromotion(s)} className="p-2.5 text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all" title="Setting Naik / Pindah Kelas Siswa">
          <Icon name="arrow-up-right" size={18} />
        </button>
        <button type="button" onClick={() => onOpenWa(s)} className="p-2.5 text-emerald-600 hover:bg-emerald-50 rounded-xl transition-colors" title="Kirim Info Login Akun ke WA">
          <Icon name="message-circle" size={18} />
        </button>
        <button type="button" onClick={() => onOpenEdit(s)} className="p-2.5 text-blue-600 hover:bg-blue-50 rounded-xl transition-colors" title="Edit Data Murid">
          <Icon name="edit" size={18} />
        </button>
        <button type="button" onClick={() => onDeleteStudent(s.id)} className="p-2.5 text-rose-600 hover:bg-rose-50 rounded-xl transition-colors" title="Hapus Murid">
          <Icon name="trash-2" size={18} />
        </button>
      </td>
    </tr>;
});

const SiswaListView = React.memo(function SiswaListView({
  students,
  settings,
  transactions = [],
  onAddStudent,
  onUpdateStudent,
  onDeleteStudent,
  showToast
}) {
  const [showModal, setShowModal] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);
  const [isKeringanan, setIsKeringanan] = useState(false);
  const [waModalStudent, setWaModalStudent] = useState(null);
  const [waPhoneInput, setWaPhoneInput] = useState('');
  const [waSavePhone, setWaSavePhone] = useState(true);
  const [copiedWaMsg, setCopiedWaMsg] = useState(false);
  const [selectedBiodataStudent, setSelectedBiodataStudent] = useState(null);
  const [selectedHistoryStudent, setSelectedHistoryStudent] = useState(null);
  const [viewTab, setViewTab] = useState('biodata');
  const [searchQuery, setSearchQuery] = useState('');
  const [classFilter, setClassFilter] = useState('ALL');
  const [biodataPage, setBiodataPage] = useState(1);
  const [matriksPage, setMatriksPage] = useState(1);
  const BIODATA_PER_PAGE = 12;
  const MATRIKS_PER_PAGE = 10;
  const classList = useMemo(() => {
    if (Array.isArray(settings?.customClasses) && settings.customClasses.length > 0) {
      const valid = settings.customClasses.filter(c => c && c.name && c.name.trim().length > 0);
      if (valid.length > 0) return valid;
    }
    const studentClasses = Array.from(new Set((students || []).map(s => s.kelas).filter(Boolean)));
    return studentClasses.map(clsName => ({
      name: clsName,
      tarif: 0
    }));
  }, [settings?.customClasses, students]);
  const isStudentLulus = student => {
    if (!student) return false;
    return student.statusAktif === false || (student.status || '').toLowerCase() === 'lulus' || (student.status || '').toLowerCase() === 'non-aktif' || (student.kelas || '').toLowerCase().includes('lulus') || (student.kelas || '').toLowerCase().includes('alumni');
  };
  const isClassCompleted = (student, clsName) => {
    if (!student || !clsName) return false;
    if (isStudentLulus(student)) return true;
    const targetNameLower = clsName.trim().toLowerCase();
    const currentClassLower = (student.kelas || '').trim().toLowerCase();
    const overrides = student.completedLevels || {};
    if (overrides[clsName] !== undefined) {
      return Boolean(overrides[clsName]);
    }
    if (currentClassLower === targetNameLower) return true;
    const targetIdx = classList.findIndex(c => c.name.trim().toLowerCase() === targetNameLower);
    const currentIdx = classList.findIndex(c => c.name.trim().toLowerCase() === currentClassLower);
    if (targetIdx !== -1 && currentIdx !== -1 && currentIdx >= targetIdx) {
      return true;
    }
    const history = Array.isArray(student.classHistory) ? student.classHistory : [];
    const inHistory = history.some(h => h.fromClass && h.fromClass.trim().toLowerCase() === targetNameLower || h.toClass && h.toClass.trim().toLowerCase() === targetNameLower);
    if (inHistory) return true;
    return false;
  };
  const getClassProgressionStatus = student => {
    if (!student) return {
      lulus: false
    };
    const isLulus = isStudentLulus(student);
    const res = {
      lulus: isLulus
    };
    classList.forEach(c => {
      res[c.name] = isClassCompleted(student, c.name);
    });
    return res;
  };
  const filteredStudents = useMemo(() => {
    return (students || []).filter(s => {
      if (!s) return false;
      const q = searchQuery.toLowerCase().trim();
      const matchQuery = !q || s.name && s.name.toLowerCase().includes(q) || s.nis && String(s.nis).toLowerCase().includes(q) || s.nik && String(s.nik).toLowerCase().includes(q) || s.nipd && String(s.nipd).toLowerCase().includes(q) || s.wali && s.wali.toLowerCase().includes(q) || s.kelas && s.kelas.toLowerCase().includes(q);
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
    setBiodataPage(1);
  }, [searchQuery, classFilter]);
  const handleSelectBiodata = useCallback(s => setSelectedBiodataStudent(s), []);
  const handleSelectHistory = useCallback(s => setSelectedHistoryStudent(s), []);
  const handleToggleAccountStatus = useCallback(s => {
    const newStatus = !s.statusAktif;
    const confirmMsg = newStatus ? `Aktifkan kembali akun siswa "${s.name}" (ON)?\n\n- Akses login portal dibuka kembali.\n- Siswa dapat login dengan NIS (${s.nis}) dan password.` : `Nonaktifkan akun siswa "${s.name}" (OFF - Keluar / Lulus)?\n\nSetelah dinonaktifkan (OFF):\n- Akses login portal DITUTUP!\n- Sesi aktif wali murid otomatis diakhiri.\n- Siswa tidak akan bisa login lagi ke portal.`;
    if (confirm(confirmMsg)) {
      onUpdateStudent(s.id, {
        ...s,
        statusAktif: newStatus,
        status: newStatus ? 'Aktif' : 'Non-Aktif'
      });
    }
  }, [onUpdateStudent]);
  const handleToggleLevel = (student, clsName) => {
    if (!student || !clsName) return;
    const curChecked = isClassCompleted(student, clsName);
    const todayDate = formatDateIndo(new Date());
    let updatedStudent = {
      ...student
    };
    let updatedOverrides = {
      ...(student.completedLevels || {})
    };
    const currentHistory = Array.isArray(student.classHistory) ? [...student.classHistory] : [];
    const targetIdx = classList.findIndex(c => c.name.trim().toLowerCase() === clsName.trim().toLowerCase());
    const targetCls = targetIdx !== -1 ? classList[targetIdx] : {
      name: clsName,
      tarif: student.tarif || 0
    };
    if (curChecked) {
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
  const handleToggleLulus = student => {
    if (!student) return;
    const willBeLulus = !isStudentLulus(student);
    const todayDate = formatDateIndo(new Date());
    const currentHistory = Array.isArray(student.classHistory) ? [...student.classHistory] : [];
    let updatedStudent = {
      ...student
    };
    let updatedOverrides = {
      ...(student.completedLevels || {})
    };
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
      const lastClass = classList[classList.length - 1] || {
        name: student.kelas || 'Kelas',
        tarif: student.tarif || 0
      };
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
  const handleOpenPromotionModal = useCallback(student => {
    setPromotionStudent(student);
    const currentClasses = settings.customClasses || [];
    const curIdx = currentClasses.findIndex(c => c.name === student.kelas);
    const nextCls = curIdx !== -1 && curIdx + 1 < currentClasses.length ? currentClasses[curIdx + 1] : currentClasses.find(c => c.name !== student.kelas) || currentClasses[0];
    const stdTarif = nextCls ? nextCls.tarif : student.tarif || 0;
    const hasDiscount = Boolean(student.keringanan_note);
    const studentTrx = (transactions || []).filter(t => (t.studentId === student.id || t.studentName && t.studentName.toLowerCase().trim() === student.name.toLowerCase().trim()) && (t.status === 'Lunas' || t.status === 'lunas' || t.status === 'Berhasil' || t.status === 'Sukses'));
    const paidMonthNames = studentTrx.map(t => (t.month || '').trim().toLowerCase());
    const allMonths = getStudentAllBillingMonths(student, settings);
    const curDueDate = Number(settings?.dueDateDay) || 10;
    const now = new Date();
    const unpaidMonthsList = allMonths.filter(m => {
      const mLower = m.trim().toLowerCase();
      const isPaid = paidMonthNames.some(pm => pm === mLower || pm && mLower.startsWith(pm));
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
      targetClass: nextCls ? nextCls.name : classList[0]?.name || student.kelas || '',
      targetTarif: hasDiscount ? student.tarif : stdTarif,
      academicYear: settings.academicYear || `${curYearNum}/${curYearNum + 1}`,
      transferDate: todayIso,
      effectiveMonth: curMonthName,
      effectiveYear: curYearNum,
      note: `Pindah rombel dari ${student.kelas} ke ${nextCls ? nextCls.name : classList[0]?.name || 'Kelas Baru'}`,
      keepExistingDiscount: hasDiscount,
      unpaidMonthsList,
      curClassUnpaidDebt,
      existingArrears,
      totalAccumulated,
      carryOverDebt: totalAccumulated > 0,
      excludePriorMonths: true
    });
  }, [classList, settings, transactions]);
  const handlePromotionSubmit = e => {
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
    const carryDebt = promotionForm.carryOverDebt ? Number(promotionForm.totalAccumulated) || 0 : 0;
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
      writeJsonLsCached('spp_class_history_' + promotionStudent.id, updatedHistory);
      writeJsonLsCached('spp_class_history_' + promotionStudent.nis, updatedHistory);
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
      alert(`Status Siswa Berhasil Diperbarui!\n\n` + `Ananda ${promotionStudent.name} kini berstatus: "${toClass}".\n` + `Tanggal Mutasi: ${formattedTransferDate}\n` + `Status Akun: NON-AKTIF / OFF (Akses Login Ditutup).\n\n` + `🔒 Username & password NIS ${promotionStudent.nis} tidak dapat digunakan lagi untuk login ke portal wali murid.\n` + (carryDebt > 0 ? `⚠️ Catatan Tunggakan: Sisa tagihan dari kelas sebelumnya sebesar ${formatRupiah(carryDebt)} tetap tersimpan di riwayat.\n` : `✅ Siswa bersih tanpa tunggakan.\n`));
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
    writeJsonLsCached('spp_class_history_' + promotionStudent.id, updatedHistory);
    writeJsonLsCached('spp_class_history_' + promotionStudent.nis, updatedHistory);
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
    alert(`Sukses ${promotionForm.type === 'naik' ? 'Kenaikan Kelas' : 'Pindah Rombel'}!\n\n` + `Ananda ${promotionStudent.name} berhasil dipindahkan ke rombel "${toClass}".\n` + `Tanggal Pasti Pindah: ${formattedTransferDate}\n` + `Mulai Efektif Tagihan: ${effectiveMonth} ${effectiveYear}\n` + `Tarif SPP Baru: ${formatRupiah(newTarif)}/bulan.\n\n` + `📌 Aturan Keuangan & Tunggakan:\n` + `• Tagihan siswa dihitung mulai dari bulan ia masuk (${effectiveMonth} ${effectiveYear} dan seterusnya).\n` + `• Bulan sebelum masuk (${fromClass}) tidak dihitung sebagai hutang atau tunggakan di rombel baru.\n` + `• Tagihan untuk bulan berjalan & mendatang berstatus "Belum Jatuh Tempo". Status baru menunggak jika sudah melewati bulan saat ini.\n\n` + (carryDebt > 0 ? `⚠️ Catatan Tunggakan: Sisa tagihan dari kelas ${fromClass} sebesar ${formatRupiah(carryDebt)} telah otomatis diakumulasikan ke tagihan siswa di kelas baru.\n\n` : `✅ Siswa bersih tanpa tunggakan dari kelas sebelumnya.\n\n`) + `Seluruh riwayat jenjang kelas dan pembayaran terdahulu tersimpan rapi di sistem mutasi.`);
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
  const openModal = useCallback((student = null) => {
    if (student) {
      setEditingStudent(student);
      const matchCls = (settings.customClasses || []).find(c => c.name === student.kelas);
      const standardTarif = matchCls ? matchCls.tarif : 0;
      const hasDiscount = Boolean(student.keringanan_note && student.keringanan_note.trim().length > 0 || student.tarif && student.tarif !== standardTarif);
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
        startActiveYear: student.startActiveYear ? Number(student.startActiveYear) : settings.startYear ? Number(settings.startYear) : new Date().getFullYear(),
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
  }, [settings]);
  const handleSubmit = e => {
    e.preventDefault();
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
      alert(`MOHON LENGKAPI SELURUH DATA DIRI SISWA:\n\n` + missing.map((f, i) => `${i + 1}. ${f}`).join('\n') + `\n\nSeluruh data diri dari Nama sampai RT/RW wajib diisi sebelum menyimpan data siswa!`);
      return;
    }
    const effectivePassword = formData.password && formData.password.trim().length > 0 ? formData.password.trim() : formData.nis ? `Sb${formData.nis.toString().trim()}` : '123456';
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
      keringanan_note: isKeringanan ? formData.keringanan_note || 'Diringankan' : '',
      arrearsAmount: formData.kelas && formData.arrearsNote && formData.arrearsNote.toLowerCase().includes(formData.kelas.toLowerCase()) ? 0 : Number(formData.arrearsAmount) || 0,
      arrearsNote: formData.kelas && formData.arrearsNote && formData.arrearsNote.toLowerCase().includes(formData.kelas.toLowerCase()) ? '' : formData.arrearsNote || '',
      startActiveMonth: formData.startActiveMonth || settings.startMonth || 'Januari',
      startActiveYear: formData.startActiveYear ? Number(formData.startActiveYear) : settings.startYear ? Number(settings.startYear) : new Date().getFullYear(),
      classHistory: formData.classHistory || []
    };
    if (editingStudent) {
      onUpdateStudent(editingStudent.id, payload);
    } else {
      onAddStudent(payload);
    }
    setShowModal(false);
  };
  const handlePhotoFileChange = async e => {
    const file = e.target.files[0];
    if (file) {
      const compressed = await compressImageFileToDataUrl(file, 640, 0.8);
      if (compressed) {
        setFormData(prev => ({
          ...prev,
          fotoUrl: compressed
        }));
      }
    }
  };
  const getWaLink = numStr => {
    if (!numStr) return '#';
    let clean = numStr.replace(/[^0-9]/g, '');
    if (clean.startsWith('0')) clean = '62' + clean.slice(1);else if (clean.startsWith('8')) clean = '62' + clean;
    return `https://wa.me/${clean}`;
  };
  const getLoginWaMessage = student => {
    if (!student) return '';
    const pwd = student.password && student.password.toString().trim().length > 0 ? student.password.toString().trim() : student.nis;
    const loginUrl = window.location.origin;
    return `*INFORMASI AKUN PORTAL SPP WALI MURID*\n` + `*${settings.schoolName || 'PAUD SETIA BHAKTI'}*\n` + `━━━━━━━━━━━━━━━━━━━━\n\n` + `Yth. Bapak/Ibu Wali dari Ananda *${student.name}*,\n\n` + `Berikut adalah data akun resmi untuk mengakses Portal SPP & Informasi Sekolah:\n\n` + `🌐 *Link Login Portal*: ${loginUrl}\n` + `👤 *Username (NIS)*: \`${student.nis}\`\n` + `🔑 *Password Akun*: \`${pwd}\`\n` + `🏫 *Kelas*: ${student.kelas}\n` + `💳 *Tarif SPP Resmi*: ${formatRupiah(student.tarif)}/bulan\n` + (student.keringanan_note ? `🏷️ *Keringanan*: ${student.keringanan_note}\n` : '') + `\n` + `📌 *Panduan Masuk Portal*:\n` + `1. Buka tautan portal di atas pada browser HP atau Komputer Anda.\n` + `2. Pilih peran *Wali Murid*.\n` + `3. Masukkan NIS dan Password yang tertera di atas.\n` + `4. Di dalam portal, Bapak/Ibu dapat memantau rincian tagihan SPP, berita kegiatan sekolah, catatan siswa dari TU/Guru, serta melakukan pembayaran langsung.\n\n` + `Apabila membutuhkan bantuan teknis login, silakan balas pesan WhatsApp ini.\n` + `Terima kasih atas perhatian dan kerja samanya. 🙏✨\n\n` + `Salam hormat,\n` + `*Tata Usaha ${settings.schoolName || 'PAUD SETIA BHAKTI'}*`;
  };
  const handleOpenWaModal = useCallback(student => {
    setWaModalStudent(student);
    setWaPhoneInput(student.telepon || '');
    setWaSavePhone(true);
    setCopiedWaMsg(false);
  }, []);
  const handleSendWaSubmit = () => {
    if (!waModalStudent) return;
    const phoneToUse = waPhoneInput.trim();
    if (!phoneToUse) {
      alert('Silakan masukkan nomor WhatsApp tujuan!');
      return;
    }
    let clean = phoneToUse.replace(/[^0-9]/g, '');
    if (clean.startsWith('0')) clean = '62' + clean.slice(1);else if (clean.startsWith('8')) clean = '62' + clean;
    if (clean.length < 9) {
      alert('Nomor WhatsApp tidak valid (minimal 9 digit)!');
      return;
    }
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
  return <div className="space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 sm:p-7 rounded-3xl border border-slate-200 shadow-sm">
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight">Data Murid</h2>
              <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">Kelola data murid, link foto profil, no. WhatsApp wali murid, akun login, dan tarif SPP.</p>
            </div>
            <button onClick={() => openModal()} className="py-3 px-5 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-2xl text-xs sm:text-sm shadow-md shadow-blue-500/25 transition-all flex items-center gap-2 hover:scale-105 shrink-0">
              <Icon name="user-plus" size={18} />
              <span>Tambah Murid Baru</span>
            </button>
          </div>

          
          <div className="flex flex-wrap items-center gap-2.5 border-b border-slate-200 pb-2">
            <button type="button" onClick={() => setViewTab('biodata')} className={`px-5 py-3 rounded-2xl font-black text-xs sm:text-sm flex items-center gap-2 transition-all ${viewTab === 'biodata' ? 'bg-blue-600 text-white shadow-md shadow-blue-500/25 scale-[1.02]' : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'}`}>
              <Icon name="users" size={17} />
              <span>Data Pokok & Biodata Murid</span>
              <span className={`px-2 py-0.5 rounded-full text-[11px] font-black ${viewTab === 'biodata' ? 'bg-blue-700 text-white' : 'bg-slate-100 text-slate-600'}`}>
                {students.length}
              </span>
            </button>

            <button type="button" onClick={() => setViewTab('history')} className={`px-5 py-3 rounded-2xl font-black text-xs sm:text-sm flex items-center gap-2 transition-all ${viewTab === 'history' ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md shadow-indigo-500/25 scale-[1.02]' : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'}`}>
              <Icon name="check-square" size={17} />
              <span>Tabel Riwayat & Jenjang Kelas (Checklist)</span>
              <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-black ${viewTab === 'history' ? 'bg-white/20 text-white' : 'bg-indigo-50 text-indigo-700 border border-indigo-200'}`}>
                {classList.map(c => c.name).join(' ➔ ')} ➔ Lulus
              </span>
            </button>
          </div>

          
          <div className="bg-white p-4 sm:p-5 rounded-2xl sm:rounded-3xl border border-slate-200/90 shadow-sm flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-4">
            <div className="relative flex-1">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Icon name="search" size={17} />
              </span>
              <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder={viewTab === 'history' ? "Cari nama murid atau NIS pada tabel jenjang kelas..." : "Cari nama murid, NIS, NIK, atau wali..."} className="w-full pl-10 pr-9 py-2.5 sm:py-3 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-xs sm:text-sm text-slate-800 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all shadow-inner" />
              {searchQuery && <button type="button" onClick={() => setSearchQuery('')} className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600" title="Hapus pencarian">
                  <Icon name="x" size={16} />
                </button>}
            </div>

            <div className="flex items-center gap-2.5 shrink-0">
              <div className="relative min-w-[150px] sm:min-w-[180px]">
                <select value={classFilter} onChange={e => setClassFilter(e.target.value)} className="w-full py-2.5 sm:py-3 pl-3.5 pr-8 bg-slate-50 border border-slate-200 rounded-2xl font-black text-xs sm:text-sm text-slate-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all cursor-pointer shadow-2xs">
                  <option value="ALL">Semua Kelas ({students.length})</option>
                  {classList.map(c => <option key={c.name} value={c.name}>
                      {c.name} ({students.filter(s => s.kelas === c.name).length})
                    </option>)}
                  <option value="LULUS">Alumni / Lulus ({students.filter(isStudentLulus).length})</option>
                </select>
              </div>

              {(searchQuery || classFilter !== 'ALL') && <button type="button" onClick={() => {
          setSearchQuery('');
          setClassFilter('ALL');
        }} className="px-3.5 py-2.5 sm:py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold transition-colors" title="Reset filter & pencarian">
                  Reset
                </button>}

              <span className="hidden md:inline-flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-blue-50 text-blue-700 text-xs font-black border border-blue-100">
                <span>{filteredStudents.length}</span>
                <span className="font-semibold text-blue-600/80">Murid</span>
              </span>
            </div>
          </div>

          {viewTab === 'biodata' && (() => {
            const totalBiodataPages = Math.ceil(filteredStudents.length / BIODATA_PER_PAGE) || 1;
            const currentBiodataPage = Math.min(Math.max(1, biodataPage), totalBiodataPages);
            const biodataStartIdx = (currentBiodataPage - 1) * BIODATA_PER_PAGE;
            const biodataEndIdx = Math.min(biodataStartIdx + BIODATA_PER_PAGE, filteredStudents.length);
            const paginatedBiodataStudents = filteredStudents.slice(biodataStartIdx, biodataEndIdx);
            return <div className="pastel-table-card">
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
                      {paginatedBiodataStudents.length > 0 ? paginatedBiodataStudents.map(s => <SiswaBiodataRow key={s.id} s={s} classList={classList} defaultStartMonth={settings.startMonth} defaultStartYear={settings.startYear} onSelectBiodata={handleSelectBiodata} onSelectHistory={handleSelectHistory} onOpenWa={handleOpenWaModal} onOpenPromotion={handleOpenPromotionModal} onOpenEdit={openModal} onDeleteStudent={onDeleteStudent} onToggleAccountStatus={handleToggleAccountStatus} />) : <tr>
                          <td colSpan={8} className="py-12 text-center text-slate-400 font-medium">
                            <div className="flex flex-col items-center justify-center gap-2">
                              <Icon name="search" size={28} className="text-slate-300" />
                              <p className="text-sm font-bold text-slate-600">Tidak ada murid yang cocok dengan pencarian</p>
                              <p className="text-xs text-slate-400">Coba ubah kata kunci pencarian atau reset filter kelas.</p>
                            </div>
                          </td>
                        </tr>}
                    </tbody>
                  </table>
                </div>
                {filteredStudents.length > BIODATA_PER_PAGE && <div className="p-4 border-t border-slate-100 bg-slate-50/60 flex flex-col sm:flex-row items-center justify-between gap-3">
                    <p className="text-xs font-bold text-slate-500">
                      Menampilkan <span className="font-extrabold text-slate-800">{biodataStartIdx + 1} - {biodataEndIdx}</span> dari <span className="font-extrabold text-slate-800">{filteredStudents.length}</span> murid
                    </p>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <button type="button" disabled={currentBiodataPage <= 1} onClick={() => setBiodataPage(p => Math.max(1, p - 1))} className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${currentBiodataPage <= 1 ? 'text-slate-300 bg-slate-100 cursor-not-allowed' : 'text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 shadow-2xs cursor-pointer active:scale-95'}`}>
                        Prev
                      </button>
                      {Array.from({
                        length: totalBiodataPages
                      }, (_, i) => i + 1).map(pageNum => <button key={pageNum} type="button" onClick={() => setBiodataPage(pageNum)} className={`min-w-[32px] h-8 px-2 rounded-xl text-xs font-black transition-all cursor-pointer active:scale-95 ${currentBiodataPage === pageNum ? 'bg-blue-600 text-white shadow-xs' : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'}`}>
                          {pageNum}
                        </button>)}
                      <button type="button" disabled={currentBiodataPage >= totalBiodataPages} onClick={() => setBiodataPage(p => Math.min(totalBiodataPages, p + 1))} className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${currentBiodataPage >= totalBiodataPages ? 'text-slate-300 bg-slate-100 cursor-not-allowed' : 'text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 shadow-2xs cursor-pointer active:scale-95'}`}>
                        Next
                      </button>
                    </div>
                  </div>}
              </div>;
          })()}

        
        {viewTab === 'history' && <div className="space-y-6 animate-in fade-in duration-200">
            
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3.5 sm:gap-4">
              {classList.map((cls, cIdx) => {
          const count = students.filter(s => {
            const isL = !s.statusAktif || (s.status || '').toLowerCase() === 'lulus' || (s.kelas || '').toLowerCase().includes('lulus');
            return !isL && (s.kelas || '').trim().toLowerCase() === cls.name.trim().toLowerCase();
          }).length;
          const icons = ['baby', 'book-open', 'school', 'sparkles', 'graduation-cap'];
          const colors = [{
            bg: 'bg-amber-50',
            text: 'text-amber-600',
            border: 'border-amber-200'
          }, {
            bg: 'bg-blue-50',
            text: 'text-blue-600',
            border: 'border-blue-200'
          }, {
            bg: 'bg-teal-50',
            text: 'text-teal-600',
            border: 'border-teal-200'
          }, {
            bg: 'bg-indigo-50',
            text: 'text-indigo-600',
            border: 'border-indigo-200'
          }, {
            bg: 'bg-emerald-50',
            text: 'text-emerald-600',
            border: 'border-emerald-200'
          }];
          const theme = colors[cIdx % colors.length];
          return <div key={cls.name || cIdx} className="bg-white p-4 sm:p-5 rounded-2xl sm:rounded-3xl border border-slate-200 shadow-sm flex items-center justify-between hover:shadow-md transition-all">
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
                  </div>;
        })}

              
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
                      {classList.map((cls, cIdx) => <th key={cls.name || cIdx} className="py-3.5 px-4 text-center pastel-th-mint whitespace-nowrap">
                          {cls.name}
                        </th>)}
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
                  return <tr>
                            <td colSpan={classList.length + 5} className="py-12 text-center text-slate-400 font-medium">
                              <div className="flex flex-col items-center justify-center gap-2">
                                <Icon name="search" size={28} className="text-slate-300" />
                                <p className="text-sm font-bold text-slate-600">Tidak ada murid yang sesuai dengan filter pencarian</p>
                                <p className="text-xs text-slate-400">Coba cari dengan nama murid atau NIS lain.</p>
                              </div>
                            </td>
                          </tr>;
                }
                return paginatedStudents.map((s, localIdx) => {
                  const idx = startIdx + localIdx;
                  const isLulus = isStudentLulus(s);
                  return <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                          <td className="py-4 px-5 text-center text-xs font-black text-slate-400">
                            {idx + 1}
                          </td>
                          <td className="py-4 px-5">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-200 flex items-center justify-center font-black text-indigo-700 text-xs overflow-hidden shrink-0 shadow-2xs">
                                {s.fotoUrl ? <img src={s.fotoUrl} alt={s.name} loading="lazy" decoding="async" className="w-full h-full object-cover" /> : <span>{s.name ? s.name.charAt(0).toUpperCase() : 'M'}</span>}
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
                              {isLulus ? <span className="inline-flex items-center gap-1 text-[11px] font-black text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full border border-purple-200">
                                  <Icon name="award" size={12} /> ALUMNI / LULUS
                                </span> : <span className="inline-flex items-center gap-1 text-[11px] font-black text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> AKTIF BELAJAR
                                </span>}
                            </div>
                          </td>

                          
                          {classList.map((cls, cIdx) => {
                      const isDone = isClassCompleted(s, cls.name);
                      return <td key={cls.name || cIdx} className="py-4 px-5 text-center bg-blue-50/10">
                                <button type="button" onClick={() => handleToggleLevel(s, cls.name)} className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-black text-xs transition-all shadow-2xs cursor-pointer active:scale-95 ${isDone ? 'bg-emerald-100 hover:bg-rose-100 text-emerald-800 hover:text-rose-700 border border-emerald-300 hover:border-rose-300 ring-2 ring-emerald-500/20' : 'bg-white hover:bg-emerald-50 text-slate-400 hover:text-emerald-700 border border-dashed border-slate-300 hover:border-emerald-400'}`} title={isDone ? `Jenjang ${cls.name} Aktif/Selesai (Klik untuk Batalkan)` : `Belum Ceklis (Klik untuk Naik/Ceklis ${cls.name})`}>
                                  <Icon name={isDone ? "check" : "plus"} size={14} className={isDone ? "stroke-[3]" : ""} />
                                  <span>{isDone ? 'Ceklis (✓)' : '+ Ceklis'}</span>
                                </button>
                              </td>;
                    })}

                          
                          <td className="py-4 px-5 text-center bg-purple-50/20">
                            <button type="button" onClick={() => handleToggleLulus(s)} className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-black text-xs transition-all shadow-2xs cursor-pointer active:scale-95 ${isLulus ? 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-rose-600 hover:to-red-600 text-white shadow-xs ring-2 ring-purple-500/30' : 'bg-slate-100 hover:bg-purple-50 text-slate-500 hover:text-purple-700 border border-dashed border-slate-300 hover:border-purple-400'}`} title={isLulus ? 'Sudah Lulus (Klik untuk Batalkan Kelulusan)' : 'Belum Lulus (Klik untuk Tandai Lulus/Alumni)'}>
                              <Icon name={isLulus ? "award" : "plus"} size={14} />
                              <span>{isLulus ? 'LULUS (✓)' : 'Belum Lulus'}</span>
                            </button>
                          </td>

                          
                          <td className="py-4 px-5">
                            <button type="button" onClick={() => setSelectedHistoryStudent(s)} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 shadow-2xs hover:shadow-xs transition-all active:scale-95 group cursor-pointer" title="Klik untuk membuka Tabel Riwayat Jenjang Kelas & Mutasi Siswa">
                              <Icon name="history" size={13} className="text-indigo-600 group-hover:rotate-45 transition-transform" />
                              <span>Lihat Riwayat ({Array.isArray(s.classHistory) ? s.classHistory.length : 0})</span>
                            </button>
                          </td>

                          
                          <td className="py-4 px-5 text-center whitespace-nowrap">
                            <div className="inline-flex items-center gap-2">
                              <button type="button" onClick={() => handleOpenPromotionModal(s)} className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold rounded-xl text-xs transition-colors border border-indigo-200 flex items-center gap-1.5 shadow-2xs active:scale-95" title="Kenaikan / Pindah Kelas Siswa">
                                <Icon name="arrow-up-right" size={14} />
                                <span>Naik Kelas</span>
                              </button>

                              <button type="button" onClick={() => handleToggleLulus(s)} className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-2xs active:scale-95 ${isLulus ? 'bg-amber-100 hover:bg-amber-200 text-amber-800 border border-amber-300' : 'bg-purple-600 hover:bg-purple-700 text-white'}`} title={isLulus ? 'Batalkan status lulus dan aktifkan kembali' : 'Tandai siswa ini telah lulus dari PAUD'}>
                                <Icon name={isLulus ? 'rotate-ccw' : 'award'} size={14} />
                                <span>{isLulus ? 'Batal Lulus' : 'Set Lulus'}</span>
                              </button>
                            </div>
                          </td>
                        </tr>;
                });
              })()}
                </tbody>
              </table>
            </div>

            
            {filteredStudents.length > MATRIKS_PER_PAGE && (() => {
          const totalPages = Math.ceil(filteredStudents.length / MATRIKS_PER_PAGE) || 1;
          const currentMatriksPage = Math.min(Math.max(1, matriksPage), totalPages);
          const startIdx = (currentMatriksPage - 1) * MATRIKS_PER_PAGE;
          const endIdx = Math.min(startIdx + MATRIKS_PER_PAGE, filteredStudents.length);
          return <div className="p-4 border-t border-slate-100 bg-slate-50/60 flex flex-col sm:flex-row items-center justify-between gap-3">
                  <p className="text-xs font-bold text-slate-500">
                    Menampilkan <span className="font-extrabold text-slate-800">{startIdx + 1} - {endIdx}</span> dari <span className="font-extrabold text-slate-800">{filteredStudents.length}</span> murid
                  </p>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <button type="button" disabled={currentMatriksPage <= 1} onClick={() => setMatriksPage(p => Math.max(1, p - 1))} className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${currentMatriksPage <= 1 ? 'text-slate-300 bg-slate-100 cursor-not-allowed' : 'text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 shadow-2xs cursor-pointer active:scale-95'}`}>
                      Prev
                    </button>
                    {Array.from({
                length: totalPages
              }, (_, i) => i + 1).map(pageNum => <button key={pageNum} type="button" onClick={() => setMatriksPage(pageNum)} className={`min-w-[32px] h-8 px-2 rounded-xl text-xs font-black transition-all cursor-pointer active:scale-95 ${currentMatriksPage === pageNum ? 'bg-blue-600 text-white shadow-xs' : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'}`}>
                        {pageNum}
                      </button>)}
                    <button type="button" disabled={currentMatriksPage >= totalPages} onClick={() => setMatriksPage(p => Math.min(totalPages, p + 1))} className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${currentMatriksPage >= totalPages ? 'text-slate-300 bg-slate-100 cursor-not-allowed' : 'text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 shadow-2xs cursor-pointer active:scale-95'}`}>
                      Next
                    </button>
                  </div>
                </div>;
        })()}
          </div>
        </div>}

        
        {selectedHistoryStudent && (() => {
      const existingHist = Array.isArray(selectedHistoryStudent.classHistory) ? selectedHistoryStudent.classHistory : [];
      const hasInitial = existingHist.some(h => {
        const t = (h.type || '').toLowerCase();
        return t.includes('pendaftaran') || t.includes('awal');
      });
      const initialRecord = {
        id: 'init_entry',
        type: 'Pendaftaran Awal',
        date: selectedHistoryStudent.createdAt ? new Date(selectedHistoryStudent.createdAt).toLocaleDateString('id-ID', {
          day: 'numeric',
          month: 'long',
          year: 'numeric'
        }) : 'Awal Masuk',
        transferDate: selectedHistoryStudent.createdAt || '',
        fromClass: '-',
        toClass: existingHist.length > 0 ? existingHist[0].fromClass || selectedHistoryStudent.kelas : selectedHistoryStudent.kelas,
        effectiveMonth: selectedHistoryStudent.startActiveMonth || settings.startMonth || 'Januari',
        effectiveYear: selectedHistoryStudent.startActiveYear || settings.startYear || 2026,
        newTarif: selectedHistoryStudent.tarif,
        carriedOverArrears: 0,
        note: 'Pendaftaran pertama siswa di PAUD Setia Bhakti'
      };
      const fullHistoryList = hasInitial ? existingHist : [initialRecord, ...existingHist];
      const formatMutationDate = h => {
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
      return <ModalPortal><div className="modal-portal-wrapper fixed inset-0 bg-slate-950/75 backdrop-blur-sm z-[9999] flex items-center justify-center p-3 sm:p-6 overflow-y-auto animate-in fade-in">
              <div className="modal-portal-card bg-white rounded-3xl max-w-4xl w-full p-5 sm:p-7 space-y-5 shadow-2xl animate-in zoom-in-95 duration-200 max-h-[92vh] sm:max-h-[90vh] flex flex-col border border-slate-200 m-auto relative">
                
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
                  <button onClick={() => setSelectedHistoryStudent(null)} className="p-2.5 text-slate-400 hover:text-slate-700 font-black rounded-xl hover:bg-slate-100 transition-colors" title="Tutup Modal">
                    <Icon name="x" size={20} />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto space-y-4 pr-1 text-xs">
                  
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
                        {isStudentLulus(selectedHistoryStudent) ? 'Alumni (Lulus)' : selectedHistoryStudent.status || 'Aktif'}
                      </span>
                    </div>
                    <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-2xl">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Akumulasi Tunggakan</span>
                      <span className={`font-black text-sm mt-0.5 block ${Number(selectedHistoryStudent.arrearsAmount) > 0 ? 'text-rose-600' : 'text-emerald-700'}`}>
                        {formatRupiah(selectedHistoryStudent.arrearsAmount || 0)}
                      </span>
                    </div>
                  </div>

                  
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
                      return <tr key={h.id || idx} className="hover:bg-slate-50/80 transition-colors">
                                <td className="py-3 px-3 text-center font-bold text-slate-400 text-[11px]">{idx + 1}</td>
                                <td className="py-3 px-3.5 whitespace-nowrap font-bold text-slate-800">
                                  {formatMutationDate(h)}
                                </td>
                                <td className="py-3 px-3.5 whitespace-nowrap">
                                  <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black ${isPendaftaran ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' : isPindah ? 'bg-indigo-100 text-indigo-800 border border-indigo-200' : isLulus ? 'bg-purple-100 text-purple-800 border border-purple-200' : 'bg-blue-100 text-blue-800 border border-blue-200'}`}>
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
                                  {Number(h.carriedOverArrears) > 0 ? <span className="font-bold text-rose-600 font-mono">
                                      {formatRupiah(h.carriedOverArrears)}
                                    </span> : <span className="text-emerald-700 font-bold">Rp 0 (Bersih)</span>}
                                </td>
                                <td className="py-3 px-4 text-slate-600 text-[11px] max-w-xs">
                                  {h.note || '-'}
                                </td>
                              </tr>;
                    })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

                
                <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-2.5">
                  <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                    <button type="button" onClick={() => {
                const studentTarget = selectedHistoryStudent;
                setSelectedHistoryStudent(null);
                handleOpenPromotionModal(studentTarget);
              }} className="w-full sm:w-auto px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-black rounded-xl text-xs flex items-center justify-center gap-2 shadow-md shadow-blue-500/25 active:scale-95 transition-all">
                      <Icon name="shuffle" size={15} />
                      <span>Pindah / Mutasi Rombel Siswa Ini</span>
                    </button>

                    {existingHist.length > 0 && <button type="button" onClick={() => {
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
              }} className="w-full sm:w-auto px-4 py-2.5 bg-amber-500 hover:bg-amber-600 active:scale-95 text-white font-black rounded-xl text-xs flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer" title="Batalkan kenaikan terakhir jika salah klik dan kembalikan ke kelas sebelumnya">
                        <Icon name="rotate-ccw" size={15} />
                        <span>Batal Kenaikan & Kembalikan Kelas</span>
                      </button>}
                  </div>

                  <button type="button" onClick={() => setSelectedHistoryStudent(null)} className="w-full sm:w-auto px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-colors">
                    Tutup
                  </button>
                </div>
              </div>
            </div></ModalPortal>;
    })()}

        {showModal && <ModalPortal><div className="modal-portal-wrapper fixed inset-0 bg-slate-950/75 backdrop-blur-sm z-[9999] flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
              <div className="modal-portal-card bg-white rounded-3xl max-w-3xl w-full m-auto shadow-2xl overflow-hidden flex flex-col max-h-[90vh] sm:max-h-[88vh] border border-slate-200 animate-in zoom-in-95 duration-200 relative">
                
                <div className="px-6 py-4 sm:py-5 border-b border-slate-100 bg-slate-50 flex items-center justify-between sticky top-0 z-10 shrink-0">
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
                  <button type="button" onClick={() => setShowModal(false)} className="p-2.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-2xl transition-colors">
                    <Icon name="x" size={20} />
                  </button>
                </div>

                
                <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6 text-xs">
                  
                  <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-4">
                    <h4 className="font-black text-blue-900 uppercase tracking-wider text-xs flex items-center gap-2">
                      <Icon name="graduation-cap" size={16} className="text-blue-600" />
                      1. Data Akademik & Foto Profil Siswa
                    </h4>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block font-black text-slate-700 uppercase mb-1">NIS Siswa *</label>
                        <input type="text" required placeholder="Nomor Induk Siswa" value={formData.nis} onChange={e => setFormData({
                  ...formData,
                  nis: e.target.value,
                  nipd: formData.nipd || e.target.value
                })} className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl font-bold text-slate-900 focus:ring-2 focus:ring-blue-500" />
                      </div>
                      <div>
                        <label className="block font-black text-slate-700 uppercase mb-1">NIPD</label>
                        <input type="text" placeholder="Nomor Induk Peserta Didik" value={formData.nipd} onChange={e => setFormData({
                  ...formData,
                  nipd: e.target.value
                })} className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl font-bold text-slate-900 focus:ring-2 focus:ring-blue-500" />
                      </div>
                      <div>
                        <label className="block font-black text-slate-700 uppercase mb-1">NISN</label>
                        <input type="text" placeholder="NISN Nasional (10 Digit)" value={formData.nisn} onChange={e => setFormData({
                  ...formData,
                  nisn: e.target.value
                })} className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl font-bold text-slate-900 focus:ring-2 focus:ring-blue-500" />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block font-black text-slate-700 uppercase mb-1">Nama Lengkap Siswa *</label>
                        <input type="text" required placeholder="Nama Lengkap Siswa" value={formData.name} onChange={e => setFormData({
                  ...formData,
                  name: e.target.value
                })} className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl font-bold text-slate-900 focus:ring-2 focus:ring-blue-500" />
                      </div>
                      <div>
                        <label className="block font-black text-slate-700 uppercase mb-1">Kelas / Rombel *</label>
                        <select value={formData.kelas} onChange={e => {
                  const k = e.target.value;
                  const matchCls = classList.find(c => c.name === k);
                  let t = matchCls ? matchCls.tarif : 0;
                  setFormData(prev => ({
                    ...prev,
                    kelas: k,
                    tarif: isKeringanan ? prev.tarif : t
                  }));
                }} className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl font-black text-slate-900 focus:ring-2 focus:ring-blue-500">
                          {classList.map(cls => <option key={cls.name} value={cls.name}>{cls.name} (Tarif: {formatRupiah(cls.tarif)})</option>)}
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-blue-50/70 p-4 rounded-xl border border-blue-200">
                      <div>
                        <label className="block font-black text-blue-900 uppercase mb-1 flex items-center gap-1.5">
                          <Icon name="calendar" size={13} className="text-blue-600" />
                          Bulan Mulai Aktif / Masuk *
                        </label>
                        <select value={formData.startActiveMonth || settings.startMonth || 'Januari'} onChange={e => setFormData({
                  ...formData,
                  startActiveMonth: e.target.value
                })} className="w-full px-3.5 py-2.5 bg-white border border-blue-200 rounded-xl font-bold text-slate-900 focus:ring-2 focus:ring-blue-500">
                          {ALL_MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
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
                        <input type="number" value={formData.startActiveYear || (settings.startYear ? Number(settings.startYear) : new Date().getFullYear())} onChange={e => setFormData({
                  ...formData,
                  startActiveYear: parseInt(e.target.value, 10) || new Date().getFullYear()
                })} className="w-full px-3.5 py-2.5 bg-white border border-blue-200 rounded-xl font-bold text-slate-900 focus:ring-2 focus:ring-blue-500" />
                        <p className="text-[10px] text-blue-700 font-semibold mt-1">
                          Tahun ajaran masuk siswa (contoh: 2026).
                        </p>
                      </div>
                    </div>

                    <div>
                      <label className="block font-black text-slate-700 uppercase mb-1">Foto Profil Siswa</label>
                      <div className="flex flex-col sm:flex-row items-center gap-3">
                        <input type="file" accept="image/*" onChange={handlePhotoFileChange} className="w-full text-xs text-slate-500 file:py-2 file:px-4 file:rounded-xl file:border-0 file:bg-blue-100 file:text-blue-700 file:font-bold hover:file:bg-blue-200 cursor-pointer" />
                        <span className="text-slate-400 font-bold">atau</span>
                        <input type="text" placeholder="URL Gambar Foto Siswa" value={formData.fotoUrl} onChange={e => setFormData({
                  ...formData,
                  fotoUrl: e.target.value
                })} className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl font-bold text-slate-900 focus:ring-2 focus:ring-blue-500" />
                      </div>
                    </div>
                  </div>

                  
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
                        <select required value={formData.jk || 'L'} onChange={e => setFormData({
                  ...formData,
                  jk: e.target.value
                })} className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500">
                          <option value="L">L - Laki-laki</option>
                          <option value="P">P - Perempuan</option>
                        </select>
                      </div>

                      <div>
                        <label className="block font-black text-slate-700 uppercase mb-1">
                          NIK Siswa / No. KTP <span className="text-rose-500">*</span>
                        </label>
                        <input type="text" required placeholder="Nomor Induk Kependudukan (16 Digit)" value={formData.nik || ''} onChange={e => setFormData({
                  ...formData,
                  nik: e.target.value
                })} className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500" />
                      </div>

                      <div>
                        <label className="block font-black text-slate-700 uppercase mb-1">
                          Agama <span className="text-rose-500">*</span>
                        </label>
                        <select required value={formData.agama || 'Islam'} onChange={e => setFormData({
                  ...formData,
                  agama: e.target.value
                })} className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500">
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
                        <input type="text" required placeholder="Kota / Kabupaten Tempat Lahir" value={formData.tempatLahir || ''} onChange={e => setFormData({
                  ...formData,
                  tempatLahir: e.target.value
                })} className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500" />
                      </div>

                      <div>
                        <label className="block font-black text-slate-700 uppercase mb-1">
                          Tanggal Lahir <span className="text-rose-500">*</span>
                        </label>
                        <input type="date" required value={formData.tanggalLahir || ''} onChange={e => setFormData({
                  ...formData,
                  tanggalLahir: e.target.value
                })} className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500" />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div className="md:col-span-2">
                        <label className="block font-black text-slate-700 uppercase mb-1">
                          Alamat Tempat Tinggal <span className="text-rose-500">*</span>
                        </label>
                        <input type="text" required placeholder="Dusun / Jalan / Perumahan" value={formData.alamat || ''} onChange={e => setFormData({
                  ...formData,
                  alamat: e.target.value
                })} className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500" />
                      </div>
                      <div>
                        <label className="block font-black text-slate-700 uppercase mb-1">
                          RT <span className="text-rose-500">*</span>
                        </label>
                        <input type="text" required placeholder="Contoh: 05" value={formData.rt || ''} onChange={e => setFormData({
                  ...formData,
                  rt: e.target.value
                })} className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500" />
                      </div>
                      <div>
                        <label className="block font-black text-slate-700 uppercase mb-1">
                          RW <span className="text-rose-500">*</span>
                        </label>
                        <input type="text" required placeholder="Contoh: 02" value={formData.rw || ''} onChange={e => setFormData({
                  ...formData,
                  rw: e.target.value
                })} className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500" />
                      </div>
                    </div>
                  </div>

                  
                  {(() => {
            const matchCls = (settings.customClasses || []).find(c => c.name === formData.kelas);
            const standardTarif = matchCls ? matchCls.tarif : 0;
            return <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-black text-amber-950 uppercase tracking-wider text-xs flex items-center gap-2">
                              <Icon name="badge-percent" size={16} className="text-amber-600" />
                              3. Pengaturan Tarif SPP & Keringanan
                            </h4>
                            <p className="text-[11px] text-slate-500 font-semibold mt-0.5">Tarif standar {formData.kelas}: <strong className="text-slate-800">{formatRupiah(standardTarif)}/bln</strong></p>
                          </div>
                          <label className="inline-flex items-center gap-2 cursor-pointer select-none px-3.5 py-2 bg-white border border-amber-300 rounded-xl shadow-xs hover:border-amber-400 transition-colors">
                            <input type="checkbox" checked={isKeringanan} onChange={e => {
                    const checked = e.target.checked;
                    setIsKeringanan(checked);
                    if (!checked) {
                      setFormData(prev => ({
                        ...prev,
                        tarif: standardTarif,
                        keringanan_note: ''
                      }));
                    }
                  }} className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500" />
                            <span className="text-xs font-black text-amber-900">Diberikan Keringanan</span>
                          </label>
                        </div>

                        {isKeringanan ? <div className="space-y-3 p-4 bg-amber-50/90 border border-amber-200 rounded-xl animate-in fade-in">
                            <div>
                              <label className="block font-black text-amber-950 uppercase text-[10px] mb-1">
                                Tarif SPP Setelah Keringanan (Rp / Bulan)
                              </label>
                              <div className="relative">
                                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none font-black text-amber-700">Rp</span>
                                <input type="number" required value={formData.tarif} onChange={e => setFormData({
                      ...formData,
                      tarif: Number(e.target.value)
                    })} placeholder="Contoh: 250000" className="w-full pl-11 pr-4 py-2 bg-white border border-amber-300 rounded-xl font-black text-amber-900 focus:ring-2 focus:ring-amber-500" />
                              </div>
                            </div>

                            <div>
                              <label className="block font-black text-amber-950 uppercase text-[10px] mb-1">
                                Alasan / Kategori Keringanan
                              </label>
                              <input type="text" placeholder="Contoh: Yatim, Beasiswa, Anak Guru, Kurang Mampu" value={formData.keringanan_note || ''} onChange={e => setFormData({
                    ...formData,
                    keringanan_note: e.target.value
                  })} className="w-full px-3.5 py-2 bg-white border border-amber-300 rounded-xl font-bold text-slate-800 focus:ring-2 focus:ring-amber-500" />
                              <div className="flex flex-wrap gap-1.5 mt-2">
                                {['Yatim', 'Piatu', 'Yatim Piatu', 'Beasiswa', 'Anak Guru', 'Kurang Mampu'].map(chip => <button key={chip} type="button" onClick={() => setFormData({
                      ...formData,
                      keringanan_note: chip
                    })} className="px-2.5 py-1 bg-white hover:bg-amber-100 text-amber-800 text-[10px] font-bold rounded-lg border border-amber-300 transition-colors shadow-2xs">
                                    + {chip}
                                  </button>)}
                              </div>
                            </div>
                          </div> : <div>
                            <div className="relative">
                              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none font-extrabold text-slate-500">Rp</span>
                              <input type="number" required value={formData.tarif} onChange={e => setFormData({
                    ...formData,
                    tarif: Number(e.target.value)
                  })} className="w-full pl-11 pr-4 py-2.5 bg-white border border-slate-300 rounded-xl font-bold text-slate-900" />
                            </div>
                          </div>}
                      </div>;
          })()}

                  
                  {Number(formData.arrearsAmount) > 0 && <div className="bg-rose-50/80 p-4 rounded-2xl border border-rose-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-in fade-in">
                      <div>
                        <span className="text-[10px] font-black uppercase text-rose-800 tracking-wider flex items-center gap-1.5">
                          <Icon name="alert-triangle" size={13} className="text-rose-600" />
                          Tunggakan Bawaan Kelas Sebelumnya
                        </span>
                        <p className="text-sm font-black text-rose-700 mt-0.5">
                          {formatRupiah(formData.arrearsAmount)}
                        </p>
                        {formData.arrearsNote && <p className="text-[11px] font-semibold text-slate-600 mt-0.5">{formData.arrearsNote}</p>}
                      </div>
                      <button type="button" onClick={() => {
              setFormData(prev => ({
                ...prev,
                arrearsAmount: 0,
                arrearsNote: ''
              }));
            }} className="px-3.5 py-2 bg-rose-600 hover:bg-rose-700 active:scale-95 text-white font-bold text-xs rounded-xl transition-all shadow-xs shrink-0 flex items-center gap-1.5 cursor-pointer" title="Hapus tunggakan bawaan jika salah klik mutasi/kenaikan kelas">
                        <Icon name="trash-2" size={14} />
                        <span>Hapus / Reset Tunggakan Bawaan (Rp 0)</span>
                      </button>
                    </div>}

                  
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
                        <input type="text" required placeholder="Nama Ayah / Ibu / Wali" value={formData.wali} onChange={e => setFormData({
                  ...formData,
                  wali: e.target.value
                })} className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500" />
                      </div>

                      <div>
                        <label className="block font-black text-slate-700 uppercase mb-1">
                          No. WhatsApp Wali Murid <span className="text-rose-500">*</span>
                        </label>
                        <input type="text" required placeholder="Contoh: 081234567890" value={formData.telepon} onChange={e => setFormData({
                  ...formData,
                  telepon: e.target.value
                })} className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500" />
                      </div>
                    </div>

                    {!editingStudent ? <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl space-y-3">
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
                          <button type="button" onClick={() => {
                  const newGen = generateDefaultStudentPassword();
                  setFormData(prev => ({
                    ...prev,
                    password: newGen
                  }));
                }} className="px-2.5 py-1.5 bg-white hover:bg-blue-100 text-blue-700 rounded-lg border border-blue-200 text-xs font-bold transition-all flex items-center gap-1 shadow-sm active:scale-95 shrink-0" title="Generate ulang password default">
                            <Icon name="refresh-cw" size={12} />
                            <span>Acak Ulang</span>
                          </button>
                        </div>
                        <div className="flex items-center gap-2 bg-white px-3.5 py-2.5 rounded-xl border border-blue-200 shadow-inner">
                          <span className="text-xs text-slate-400 font-bold">Password Akun:</span>
                          <span className="font-mono font-black text-sm text-blue-700 tracking-widest flex-1 select-all">{formData.password || '...'}</span>
                          <button type="button" onClick={() => {
                  if (formData.password) {
                    navigator.clipboard.writeText(formData.password);
                    alert(`Password '${formData.password}' berhasil disalin ke clipboard!`);
                  }
                }} className="p-1.5 text-slate-400 hover:text-blue-600 transition-colors" title="Salin password ke clipboard">
                            <Icon name="copy" size={15} />
                          </button>
                        </div>
                        <p className="text-[10.5px] text-blue-600 font-medium leading-relaxed">
                          * Sistem telah otomatis membuat password aman campuran huruf dan angka di atas. Password ini akan tersimpan di database dan otomatis terkirim saat klik "Kirim Info Login" WhatsApp ke wali murid. Wali murid juga dapat menggantinya sendiri di portal mereka.
                        </p>
                      </div> : <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div>
                            <span className="block font-black text-slate-700 uppercase text-xs tracking-wide">Password Akun Wali Murid</span>
                            <div className="flex items-center gap-2 mt-1.5">
                              <span className="font-mono font-black text-sm bg-white px-3 py-1 rounded-xl border border-slate-300 text-blue-700 tracking-widest select-all shadow-inner">
                                {formData.password || (formData.nis ? `Sb${formData.nis}` : '-')}
                              </span>
                              <button type="button" onClick={() => {
                      const pwdToCopy = formData.password || (formData.nis ? `Sb${formData.nis}` : '');
                      if (pwdToCopy) {
                        navigator.clipboard.writeText(pwdToCopy);
                        alert(`Password '${pwdToCopy}' disalin ke clipboard!`);
                      }
                    }} className="p-1.5 bg-white text-slate-500 hover:text-blue-600 rounded-lg border border-slate-200 transition-colors shadow-sm" title="Salin password">
                                <Icon name="copy" size={14} />
                              </button>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <button type="button" onClick={() => {
                    const defPwd = formData.nis ? `Sb${formData.nis}` : '123456';
                    setFormData(prev => ({
                      ...prev,
                      password: defPwd
                    }));
                    alert(`Password diset ke Default Sistem: ${defPwd}.\n\nSetelah klik 'Simpan Data Siswa', password lama tidak berlaku lagi dan wali murid harus masuk menggunakan password default ini.`);
                  }} className="px-3 py-2 bg-amber-50 hover:bg-amber-100 text-amber-800 rounded-xl text-xs font-black border border-amber-300 shadow-sm transition-all flex items-center gap-1.5 shrink-0 active:scale-95" title="Kembalikan ke password default sistem (Sb[NIS])">
                              <Icon name="rotate-ccw" size={14} />
                              <span>Reset ke Default</span>
                            </button>
                            <button type="button" onClick={() => {
                    const newGen = generateDefaultStudentPassword();
                    setFormData(prev => ({
                      ...prev,
                      password: newGen
                    }));
                    alert(`Password baru campuran huruf & angka di-generate: ${newGen}. Klik 'Simpan Data Siswa' untuk menyimpan ke database.`);
                  }} className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black shadow-md shadow-blue-500/20 transition-all flex items-center gap-1.5 shrink-0 active:scale-95" title="Generate password acak baru kombinasi angka & huruf">
                              <Icon name="refresh-cw" size={14} />
                              <span>Acak Baru</span>
                            </button>
                          </div>
                        </div>

                        <div className="pt-2 border-t border-slate-200">
                          <label className="block text-[11px] font-bold text-slate-600 mb-1">
                            Atur Manual Password (Atau kosongkan untuk menggunakan default Sb[NIS]):
                          </label>
                          <input type="text" placeholder="Ketik password baru jika ingin manual" value={formData.password || ''} onChange={e => setFormData({
                  ...formData,
                  password: e.target.value
                })} className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-blue-500" />
                        </div>
                      </div>}
                  </div>

                  
                  <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="space-y-0.5">
                        <h4 className="font-black text-slate-800 uppercase tracking-wider text-xs flex items-center gap-2">
                          <Icon name="power" size={16} className={formData.statusAktif ? "text-emerald-600" : "text-rose-600"} />
                          5. Status Akun Siswa & Izin Login (ON / OFF)
                        </h4>
                        <p className="text-[11px] text-slate-500 font-medium leading-relaxed">
                          {formData.statusAktif ? "Akun AKTIF (ON) — Siswa & wali murid dapat login menggunakan NIS dan password." : "Akun NON-AKTIF / KELUAR / LULUS (OFF) — Akses login portal ditutup total dan sesi login dinonaktifkan."}
                        </p>
                      </div>

                      
                      <div className="flex items-center gap-2.5 shrink-0">
                        <button type="button" onClick={() => {
                  const nextStatus = !formData.statusAktif;
                  setFormData(prev => ({
                    ...prev,
                    statusAktif: nextStatus,
                    status: nextStatus ? 'Aktif' : 'Non-Aktif'
                  }));
                }} className={`relative inline-flex h-8 w-16 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none shadow-sm ${formData.statusAktif ? 'bg-emerald-600 ring-2 ring-emerald-500/20' : 'bg-slate-300 ring-2 ring-slate-400/20'}`} title="Klik untuk mengubah status ON / OFF">
                          <span className={`pointer-events-none inline-block h-7 w-7 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out flex items-center justify-center font-black text-[10px] ${formData.statusAktif ? 'translate-x-8 text-emerald-700' : 'translate-x-0 text-slate-500'}`}>
                            {formData.statusAktif ? 'ON' : 'OFF'}
                          </span>
                        </button>
                        <span className={`text-xs font-black px-2.5 py-1 rounded-xl border ${formData.statusAktif ? 'bg-emerald-100 text-emerald-800 border-emerald-300' : 'bg-rose-100 text-rose-800 border-rose-300'}`}>
                          {formData.statusAktif ? 'ON (Aktif)' : 'OFF (Keluar/Lulus)'}
                        </span>
                      </div>
                    </div>

                    {!formData.statusAktif && <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-[11px] font-bold flex items-center gap-2">
                        <Icon name="lock" size={15} className="text-rose-600 shrink-0" />
                        <span>Perhatian: Akun yang diatur ke status OFF tidak akan bisa login ke portal wali murid sama sekali.</span>
                      </div>}
                  </div>

                  
                  <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
                    <button type="button" onClick={() => setShowModal(false)} className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 font-bold rounded-xl text-slate-600 transition-colors">
                      Batal
                    </button>
                    <button type="submit" className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-extrabold rounded-xl shadow-lg shadow-emerald-600/20 transition-all flex items-center gap-2">
                      <Icon name="check" size={16} />
                      <span>Simpan Data Siswa</span>
                    </button>
                  </div>
                </form>
              </div>
            </div></ModalPortal>}

          
          {waModalStudent && <ModalPortal><div className="modal-portal-wrapper fixed inset-0 bg-slate-950/75 backdrop-blur-sm z-[9999] flex items-center justify-center p-3 sm:p-6 overflow-y-auto animate-in fade-in">
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
                  <button onClick={() => setWaModalStudent(null)} className="p-2 text-slate-400 hover:text-slate-600 font-black rounded-xl hover:bg-slate-100 transition-colors">
                    <Icon name="x" size={20} />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto space-y-4 text-xs pr-1">
                  
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex items-center gap-3.5">
                    <div className="w-12 h-12 rounded-xl bg-teal-100 border border-teal-200 flex items-center justify-center font-black text-teal-800 text-base shrink-0 overflow-hidden shadow-inner">
                      {waModalStudent.fotoUrl ? <img src={waModalStudent.fotoUrl} alt={waModalStudent.name} loading="lazy" decoding="async" className="w-full h-full object-cover" /> : waModalStudent.name.charAt(0)}
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

                  
                  <div>
                    <label className="block font-black text-slate-700 uppercase tracking-wider text-[11px] mb-1.5">
                      Nomor WhatsApp Tujuan (Wali Murid)
                    </label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-emerald-600 font-black">
                        <Icon name="phone" size={16} />
                      </span>
                      <input type="text" required placeholder="Contoh: 081234567890 atau 6281234567890" value={waPhoneInput} onChange={e => setWaPhoneInput(e.target.value)} className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl font-black text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-500 text-sm" />
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      <label className="inline-flex items-center gap-2 cursor-pointer select-none text-slate-700 font-bold text-xs">
                        <input type="checkbox" checked={waSavePhone} onChange={e => setWaSavePhone(e.target.checked)} className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500" />
                        <span>Simpan nomor ini ke database murid jika baru/diubah</span>
                      </label>
                    </div>
                  </div>

                  
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="font-black text-slate-700 uppercase tracking-wider text-[11px]">
                        Preview Pesan WhatsApp
                      </label>
                      <button type="button" onClick={handleCopyWaMessage} className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg text-xs transition-colors">
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
                  <button type="button" onClick={() => setWaModalStudent(null)} className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold rounded-2xl text-sm transition-colors">
                    Tutup
                  </button>
                  <button type="button" onClick={handleSendWaSubmit} className="flex-1 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-black rounded-2xl text-sm shadow-md shadow-emerald-500/25 transition-all flex items-center justify-center gap-2 hover:scale-[1.02]">
                    <Icon name="send" size={17} />
                    <span>Buka WhatsApp Sekarang</span>
                  </button>
                </div>
              </div>
            </div></ModalPortal>}

          
          {promotionStudent && <ModalPortal><div className="modal-portal-wrapper fixed inset-0 bg-slate-950/75 backdrop-blur-sm z-[9999] flex items-center justify-center p-3 sm:p-6 overflow-y-auto animate-in fade-in">
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
                  <button onClick={() => setPromotionStudent(null)} className="p-2 text-slate-400 hover:text-slate-600 font-black rounded-xl hover:bg-slate-100 transition-colors">
                    <Icon name="x" size={20} />
                  </button>
                </div>

                <form onSubmit={handlePromotionSubmit} className="flex-1 overflow-y-auto space-y-4 text-xs pr-1">
                  
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex items-center gap-3.5">
                    <div className="w-12 h-12 rounded-xl bg-blue-100 border border-blue-200 flex items-center justify-center font-black text-blue-800 text-base shrink-0 overflow-hidden shadow-inner">
                      {promotionStudent.fotoUrl ? <img src={promotionStudent.fotoUrl} alt={promotionStudent.name} loading="lazy" decoding="async" className="w-full h-full object-cover" /> : promotionStudent.name.charAt(0)}
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

                  
                  <div>
                    <label className="block font-black text-slate-700 uppercase tracking-wider text-[11px] mb-1.5">
                      Jenis Perubahan Kelas
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      <button type="button" onClick={() => {
                const target = promotionForm.targetClass && !promotionForm.targetClass.includes('Alumni') && !promotionForm.targetClass.includes('Keluar') ? promotionForm.targetClass : classList.find(c => c.name !== promotionStudent.kelas)?.name || classList[0]?.name || '';
                const matchCls = classList.find(c => c.name === target);
                setPromotionForm(prev => ({
                  ...prev,
                  type: 'naik',
                  targetClass: target,
                  targetTarif: prev.keepExistingDiscount ? prev.targetTarif : matchCls ? matchCls.tarif : prev.targetTarif,
                  note: `Kenaikan kelas dari ${promotionStudent.kelas} ke ${target} (TA ${prev.academicYear || settings.academicYear || ''})`
                }));
              }} className={`p-2.5 sm:p-3 rounded-2xl border font-bold flex flex-col sm:flex-row items-center gap-1.5 sm:gap-2 transition-all ${promotionForm.type === 'naik' ? 'bg-blue-50 border-blue-400 text-blue-800 shadow-xs ring-2 ring-blue-500/20' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                        <Icon name="arrow-up-circle" size={17} className={promotionForm.type === 'naik' ? 'text-blue-600' : 'text-slate-400'} />
                        <div className="text-center sm:text-left">
                          <p className="text-xs font-black">Naik Kelas</p>
                          <p className="text-[9px] text-slate-500 font-normal">Tahun Ajaran Baru</p>
                        </div>
                      </button>

                      <button type="button" onClick={() => {
                const target = promotionForm.targetClass && !promotionForm.targetClass.includes('Alumni') && !promotionForm.targetClass.includes('Keluar') ? promotionForm.targetClass : classList.find(c => c.name !== promotionStudent.kelas)?.name || classList[0]?.name || '';
                const matchCls = classList.find(c => c.name === target);
                setPromotionForm(prev => ({
                  ...prev,
                  type: 'pindah',
                  targetClass: target,
                  targetTarif: prev.keepExistingDiscount ? prev.targetTarif : matchCls ? matchCls.tarif : prev.targetTarif,
                  note: `Pindah rombel dari ${promotionStudent.kelas} ke ${target}`
                }));
              }} className={`p-2.5 sm:p-3 rounded-2xl border font-bold flex flex-col sm:flex-row items-center gap-1.5 sm:gap-2 transition-all ${promotionForm.type === 'pindah' ? 'bg-indigo-50 border-indigo-400 text-indigo-800 shadow-xs ring-2 ring-indigo-500/20' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                        <Icon name="shuffle" size={17} className={promotionForm.type === 'pindah' ? 'text-indigo-600' : 'text-slate-400'} />
                        <div className="text-center sm:text-left">
                          <p className="text-xs font-black">Pindah Rombel</p>
                          <p className="text-[9px] text-slate-500 font-normal">Mutasi Rombel</p>
                        </div>
                      </button>

                      <button type="button" onClick={() => setPromotionForm(prev => ({
                ...prev,
                type: 'keluar',
                targetClass: 'Alumni (Lulus)',
                targetTarif: 0,
                note: `Kelulusan / Keluar dari ${promotionStudent.kelas}`
              }))} className={`p-2.5 sm:p-3 rounded-2xl border font-bold flex flex-col sm:flex-row items-center gap-1.5 sm:gap-2 transition-all ${promotionForm.type === 'keluar' ? 'bg-purple-50 border-purple-400 text-purple-900 shadow-xs ring-2 ring-purple-500/20' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                        <Icon name="award" size={17} className={promotionForm.type === 'keluar' ? 'text-purple-600' : 'text-slate-400'} />
                        <div className="text-center sm:text-left">
                          <p className="text-xs font-black">Lulus / Keluar</p>
                          <p className="text-[9px] text-slate-500 font-normal">Set Akun OFF</p>
                        </div>
                      </button>
                    </div>
                  </div>

                  
                  {promotionForm.type === 'keluar' ? <div className="space-y-3">
                      <div>
                        <label className="block font-black text-slate-700 uppercase tracking-wider text-[11px] mb-1.5">
                          Status Kelulusan / Keluar Siswa
                        </label>
                        <select required value={promotionForm.targetClass} onChange={e => {
                const val = e.target.value;
                setPromotionForm(prev => ({
                  ...prev,
                  targetClass: val,
                  targetTarif: 0,
                  note: `Status ${val} dari ${promotionStudent.kelas}`
                }));
              }} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl font-black text-slate-900 focus:bg-white focus:ring-2 focus:ring-purple-500 text-sm">
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
                    </div> : <div>
                      <label className="block font-black text-slate-700 uppercase tracking-wider text-[11px] mb-1.5">
                        Pindah / Naik ke Kelas Tujuan
                      </label>
                      <select required value={promotionForm.targetClass} onChange={e => {
              const target = e.target.value;
              const matchCls = classList.find(c => c.name === target);
              const stdTarif = matchCls ? matchCls.tarif : 0;
              const autoNote = promotionForm.type === 'naik' ? `Kenaikan kelas dari ${promotionStudent.kelas} ke ${target} (TA ${promotionForm.academicYear || settings.academicYear || ''})` : `Pindah rombel dari ${promotionStudent.kelas} ke ${target}`;
              setPromotionForm(prev => ({
                ...prev,
                targetClass: target,
                targetTarif: prev.keepExistingDiscount ? prev.targetTarif : stdTarif,
                note: autoNote
              }));
            }} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl font-black text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500 text-sm">
                        <option value="">-- Pilih Kelas Tujuan --</option>
                        {classList.map(c => <option key={c.name} value={c.name} disabled={c.name === promotionStudent.kelas}>
                            {c.name} {c.name === promotionStudent.kelas ? '(Kelas Saat Ini)' : `(Tarif: ${formatRupiah(c.tarif)}/bln)`}
                          </option>)}
                      </select>
                    </div>}

                  
                  {promotionForm.type !== 'keluar' && <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="font-black text-slate-700 uppercase tracking-wider text-[11px]">
                          Tarif SPP di Kelas Baru (Rp / Bulan)
                        </label>
                        {promotionStudent.keringanan_note && <span className="text-[10px] text-amber-700 font-bold bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                            Status: {promotionStudent.keringanan_note}
                          </span>}
                      </div>
                      <div className="relative">
                        <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500 font-black">
                          Rp
                        </span>
                        <input type="number" required value={promotionForm.targetTarif} onChange={e => setPromotionForm(prev => ({
                ...prev,
                targetTarif: Number(e.target.value)
              }))} className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl font-black text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500 text-sm" />
                      </div>
                      <p className="text-[10px] text-slate-500 mt-1 font-medium">
                        * Nominal tarif dapat disesuaikan otomatis atau diberikan keringanan khusus untuk murid ini.
                      </p>
                    </div>}

                  
                  {promotionForm.type === 'pindah' && <>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <label className="block font-black text-slate-700 uppercase tracking-wider text-[11px] mb-1.5">
                            Tanggal Pasti Pindah Rombel
                          </label>
                          <input type="date" required={promotionForm.type === 'pindah'} value={promotionForm.transferDate || ''} onChange={e => setPromotionForm(prev => ({
                  ...prev,
                  transferDate: e.target.value
                }))} className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500 text-sm" />
                        </div>

                        <div>
                          <label className="block font-black text-slate-700 uppercase tracking-wider text-[11px] mb-1.5">
                            Mulai Efektif di Rombel Baru
                          </label>
                          <select value={promotionForm.effectiveMonth || 'Januari'} onChange={e => setPromotionForm(prev => ({
                  ...prev,
                  effectiveMonth: e.target.value
                }))} className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl font-black text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500 text-sm">
                            {ALL_MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
                          </select>
                        </div>

                        <div>
                          <label className="block font-black text-slate-700 uppercase tracking-wider text-[11px] mb-1.5">
                            Tahun Kalender Efektif
                          </label>
                          <input type="number" value={promotionForm.effectiveYear || new Date().getFullYear()} onChange={e => setPromotionForm(prev => ({
                  ...prev,
                  effectiveYear: parseInt(e.target.value, 10) || new Date().getFullYear()
                }))} className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl font-black text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500 text-sm" />
                        </div>
                      </div>

                      
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
                    </>}

                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-black text-slate-700 uppercase tracking-wider text-[11px] mb-1.5">
                        Tahun Ajaran Efektif
                      </label>
                      <input type="text" value={promotionForm.academicYear} onChange={e => setPromotionForm(prev => ({
                ...prev,
                academicYear: e.target.value
              }))} placeholder="Contoh: 2026/2027" className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500" />
                    </div>

                    <div>
                      <label className="block font-black text-slate-700 uppercase tracking-wider text-[11px] mb-1.5">
                        Catatan Mutasi / Kenaikan
                      </label>
                      <input type="text" value={promotionForm.note} onChange={e => setPromotionForm(prev => ({
                ...prev,
                note: e.target.value
              }))} placeholder="Contoh: Pindah rombel / mutasi kelas" className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500" />
                    </div>
                  </div>

                  
                  <div className={`p-4 rounded-2xl border transition-all ${promotionForm.totalAccumulated > 0 ? 'bg-amber-50/90 border-amber-300 text-amber-950' : 'bg-emerald-50/90 border-emerald-200 text-emerald-950'}`}>
                    <div className="flex items-start gap-2.5">
                      <Icon name={promotionForm.totalAccumulated > 0 ? "alert-triangle" : "check-circle"} size={18} className={`shrink-0 mt-0.5 ${promotionForm.totalAccumulated > 0 ? 'text-amber-600' : 'text-emerald-600'}`} />
                      <div className="flex-1">
                        <p className="font-black text-xs">
                          {promotionForm.totalAccumulated > 0 ? `Terdapat Tagihan / Tunggakan di ${promotionStudent.kelas}` : `Tagihan Bersih: Tidak Ada Tunggakan di ${promotionStudent.kelas}`}
                        </p>
                        {promotionForm.totalAccumulated > 0 ? <div className="text-[11px] text-amber-900 mt-1 space-y-1">
                            <p>
                              Tunggakan kelas {promotionStudent.kelas}: <strong>{promotionForm.unpaidMonthsList.length} bulan</strong> {promotionForm.unpaidMonthsList.length > 0 && `(${promotionForm.unpaidMonthsList.join(', ')})`} = <strong>{formatRupiah(promotionForm.curClassUnpaidDebt)}</strong>
                              {promotionForm.existingArrears > 0 && <span> + Saldo tunggakan sebelumnya: <strong>{formatRupiah(promotionForm.existingArrears)}</strong></span>}
                            </p>
                            <p className="font-extrabold text-amber-950">
                              Total Akumulasi Tagihan Tertunggak: {formatRupiah(promotionForm.totalAccumulated)}
                            </p>
                          </div> : <p className="text-[11px] text-emerald-800 mt-0.5">
                            Siswa telah melunasi seluruh kewajiban SPP yang jatuh tempo di kelas saat ini.
                          </p>}
                      </div>
                    </div>

                    {promotionForm.totalAccumulated > 0 && <label className="mt-3 pt-3 border-t border-amber-200 flex items-center gap-2.5 cursor-pointer select-none">
                        <input type="checkbox" checked={promotionForm.carryOverDebt} onChange={e => setPromotionForm(prev => ({
                ...prev,
                carryOverDebt: e.target.checked
              }))} className="w-4 h-4 text-amber-600 rounded border-amber-300 focus:ring-amber-500" />
                        <span className="text-xs font-black text-amber-950">
                          Akumulasikan sisa tagihan ({formatRupiah(promotionForm.totalAccumulated)}) ke tagihan siswa di kelas baru
                        </span>
                      </label>}
                  </div>

                  
                  <div className="p-4 bg-emerald-50/90 border border-emerald-200 rounded-2xl flex items-start gap-3 text-xs text-emerald-950">
                    <Icon name="shield-check" size={20} className="text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-black text-emerald-950 text-xs">Riwayat Pembayaran di Kelas Sebelumnya Tetap Aman</p>
                      <p className="text-[11px] text-emerald-800 mt-0.5 leading-relaxed">
                        Seluruh kuitansi, pembayaran SPP lunas, dan transaksi saat siswa berada di kelas <strong>{promotionStudent.kelas}</strong> tidak akan hilang/terhapus. Riwayat tersebut tetap tersimpan dan dapat dilihat kapan saja dengan label kelas asalnya.
                      </p>
                    </div>
                  </div>

                  
                  <div className="flex items-center gap-3 pt-3 border-t border-slate-100">
                    <button type="button" onClick={() => setPromotionStudent(null)} className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold rounded-2xl text-sm transition-colors">
                      Batal
                    </button>
                    <button type="submit" className="flex-1 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-black rounded-2xl text-sm shadow-md shadow-blue-500/25 transition-all flex items-center justify-center gap-2 hover:scale-[1.02]">
                      <Icon name="check-circle" size={17} />
                      <span>{promotionForm.type === 'naik' ? 'Simpan Kenaikan Kelas' : promotionForm.type === 'keluar' ? 'Simpan Status Keluar' : 'Simpan Pindah Rombel'}</span>
                    </button>
                  </div>
                </form>
              </div>
            </div></ModalPortal>}

          
          {selectedBiodataStudent && <ModalPortal><div className="modal-portal-wrapper fixed inset-0 bg-slate-950/75 backdrop-blur-sm z-[9999] flex items-center justify-center p-3 sm:p-6 overflow-y-auto animate-in fade-in">
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
                  <button onClick={() => setSelectedBiodataStudent(null)} className="p-2 text-slate-400 hover:text-slate-600 font-black rounded-xl hover:bg-slate-100 transition-colors">
                    <Icon name="x" size={20} />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto space-y-5 text-xs pr-1">
                  
                  <div className="p-4 sm:p-5 bg-gradient-to-r from-blue-50/70 via-indigo-50/40 to-teal-50/50 rounded-2xl border border-blue-100 flex flex-col sm:flex-row items-center sm:items-start gap-4 text-center sm:text-left">
                    <div className="w-20 h-20 rounded-2xl bg-white border-2 border-blue-200 flex items-center justify-center font-black text-blue-800 text-2xl shrink-0 overflow-hidden shadow-md">
                      {selectedBiodataStudent.fotoUrl ? <img src={selectedBiodataStudent.fotoUrl} alt={selectedBiodataStudent.name} loading="lazy" decoding="async" className="w-full h-full object-cover" /> : selectedBiodataStudent.name.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                        <h4 className="font-black text-slate-900 text-lg">{selectedBiodataStudent.name}</h4>
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-black ${selectedBiodataStudent.statusAktif ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' : 'bg-rose-100 text-rose-800 border border-rose-300'}`}>
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
                        {selectedBiodataStudent.telepon ? <a href={getWaLink(selectedBiodataStudent.telepon)} target="_blank" rel="noopener noreferrer" className="font-bold text-emerald-700 hover:underline flex items-center gap-1.5">
                            <Icon name="phone" size={13} /> {selectedBiodataStudent.telepon}
                          </a> : <span className="text-amber-600 font-bold">- Belum diisi -</span>}
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
                        {selectedBiodataStudent.keringanan_note && <span className="ml-2 text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                            {selectedBiodataStudent.keringanan_note}
                          </span>}
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

                  
                  {(Number(selectedBiodataStudent.arrearsAmount) > 0 || selectedBiodataStudent.classHistory && selectedBiodataStudent.classHistory.length > 0) && <div className="bg-slate-50 rounded-2xl border border-slate-200 overflow-hidden">
                      <div className="px-4 py-2.5 bg-slate-100 border-b border-slate-200 font-black text-slate-700 uppercase tracking-wider text-[11px] flex items-center gap-2">
                        <Icon name="history" size={14} className="text-indigo-600" />
                        <span>Riwayat Kenaikan Kelas & Tunggakan Akumulasi</span>
                      </div>
                      <div className="p-4 space-y-3">
                        {Number(selectedBiodataStudent.arrearsAmount) > 0 && <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-900">
                            <p className="font-black">Tunggakan Bawaan Kelas Sebelumnya: {formatRupiah(selectedBiodataStudent.arrearsAmount)}</p>
                            {selectedBiodataStudent.arrearsNote && <p className="text-[11px] text-rose-700 mt-0.5">{selectedBiodataStudent.arrearsNote}</p>}
                          </div>}
                        {selectedBiodataStudent.classHistory && selectedBiodataStudent.classHistory.length > 0 && <div className="space-y-1.5">
                            <span className="text-[10px] font-black uppercase text-slate-500">Log Mutasi Kelas:</span>
                            {selectedBiodataStudent.classHistory.map((hist, i) => <div key={i} className="p-2.5 bg-white border border-slate-200 rounded-xl flex items-center justify-between text-xs">
                                <div>
                                  <span className="font-black text-slate-900">{hist.fromClass} ➔ {hist.toClass}</span>
                                  <span className="text-slate-400 ml-2">({hist.date || '-'})</span>
                                </div>
                                <span className="font-mono font-bold text-blue-700">{formatRupiah(hist.newTarif)}/bln</span>
                              </div>)}
                          </div>}
                      </div>
                    </div>}
                </div>

                <div className="flex items-center gap-3 pt-3 border-t border-slate-100">
                  <button type="button" onClick={() => setSelectedBiodataStudent(null)} className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-black rounded-2xl text-xs transition-colors">
                    Tutup
                  </button>
                  <button type="button" onClick={() => {
            const st = selectedBiodataStudent;
            setSelectedBiodataStudent(null);
            openModal(st);
          }} className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-2xl text-xs shadow-md shadow-blue-500/25 transition-all flex items-center justify-center gap-2">
                    <Icon name="edit" size={16} />
                    <span>Edit Data Siswa Ini</span>
                  </button>
                </div>
              </div>
            </div></ModalPortal>}
        </div>;
});
