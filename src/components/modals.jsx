const SearchableStudentSelect = React.memo(function SearchableStudentSelect({
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
    return students.filter(s => s.name && s.name.toLowerCase().includes(q) || s.nis && String(s.nis).toLowerCase().includes(q) || s.kelas && s.kelas.toLowerCase().includes(q));
  }, [students, search]);
  useEffect(() => {
    const handleClickOutside = e => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);
  const handleSelect = s => {
    onChange({
      target: {
        value: s.id
      }
    });
    setIsOpen(false);
    setSearch('');
  };
  const handleClear = e => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    onChange({
      target: {
        value: ''
      }
    });
    setSearch('');
    setIsOpen(false);
  };
  const themeClasses = {
    sky: 'border-2 border-sky-200/90 focus-within:border-sky-500 focus-within:ring-2 focus-within:ring-sky-400/20',
    blue: 'border border-slate-300 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-400/20',
    teal: 'border border-slate-300 focus-within:border-teal-500 focus-within:ring-2 focus-within:ring-teal-400/20'
  }[theme] || 'border border-slate-300 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-400/20';
  return <div ref={containerRef} className={`relative w-full ${isOpen ? 'z-[999]' : 'z-20'}`}>
          {required && <input type="text" required={required} value={value || ''} onChange={() => {}} tabIndex={-1} aria-hidden="true" style={{
      position: 'absolute',
      opacity: 0,
      width: 1,
      height: 1,
      bottom: 0,
      left: 10,
      pointerEvents: 'none'
    }} />}

          <div role="button" tabIndex={0} onClick={() => {
      const next = !isOpen;
      setIsOpen(next);
      setSearch('');
      if (next) {
        setTimeout(() => {
          if (searchInputRef.current) searchInputRef.current.focus({
            preventScroll: true
          });
        }, 10);
      }
    }} onKeyDown={e => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        setIsOpen(!isOpen);
      }
    }} className={`w-full min-h-[42px] px-3.5 py-2 bg-white rounded-xl sm:rounded-2xl flex items-center justify-between gap-2 text-left font-bold text-xs sm:text-sm text-slate-800 shadow-2xs transition-all cursor-pointer select-none ${themeClasses}`}>
            <div className="flex items-center gap-2 min-w-0 flex-1">
              {selectedStudent ? <>
                  <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-black text-[11px] shrink-0 overflow-hidden">
                    {selectedStudent.fotoUrl ? <img src={selectedStudent.fotoUrl} alt={selectedStudent.name} loading="lazy" decoding="async" className="w-full h-full object-cover" /> : (selectedStudent.name || 'M').charAt(0).toUpperCase()}
                  </div>
                  <span className="truncate text-slate-900 font-extrabold">{selectedStudent.name}</span>
                  <span className="shrink-0 px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[10px] font-black uppercase">
                    {selectedStudent.nis ? `${selectedStudent.nis} • ` : ''}{selectedStudent.kelas}
                  </span>
                </> : <span className="text-slate-400 font-medium truncate">{placeholder}</span>}
            </div>

            <div className="flex items-center gap-1 shrink-0 text-slate-400">
              {selectedStudent && <button type="button" onClick={handleClear} className="p-1 hover:text-rose-600 rounded-full hover:bg-rose-50 transition-colors cursor-pointer" title="Hapus Pilihan Siswa">
                  <Icon name="x" size={13} />
                </button>}
              <Icon name="chevron-down" size={15} className={`transition-transform duration-200 ${isOpen ? 'rotate-180 text-blue-600' : ''}`} />
            </div>
          </div>

          {isOpen && <div className="absolute top-full left-0 right-0 mt-1.5 bg-white rounded-2xl border border-slate-200 shadow-2xl z-[999] overflow-hidden animate-in fade-in zoom-in-95 duration-150">
              <div className="p-2.5 border-b border-slate-100 bg-slate-50/80">
                <div className="relative flex items-center">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Icon name="search" size={14} />
                  </div>
                  <input ref={searchInputRef} type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Ketik untuk mencari nama, NIS, atau kelas..." className="w-full pl-9 pr-8 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs" />
                  {search && <button type="button" onClick={() => setSearch('')} className="absolute right-2.5 text-slate-400 hover:text-slate-600 p-0.5">
                      <Icon name="x" size={12} />
                    </button>}
                </div>
                <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 mt-1.5 px-1">
                  <span>{filteredStudents.length} dari {students.length} murid</span>
                  {search && <span className="text-blue-600 font-extrabold">Hasil Pencarian</span>}
                </div>
              </div>

              <div className="max-h-60 overflow-y-auto divide-y divide-slate-50 text-xs">
                {filteredStudents.length === 0 ? <div className="p-5 text-center text-slate-400 font-medium">
                    <Icon name="search-x" size={20} className="mx-auto mb-1 text-slate-300" />
                    Tidak ada murid yang cocok dengan "{search}"
                  </div> : filteredStudents.map(s => {
          const isSelected = String(s.id) === String(value);
          return <button key={s.id} type="button" onClick={() => handleSelect(s)} className={`w-full px-3.5 py-2.5 flex items-center justify-between gap-2.5 text-left transition-colors cursor-pointer ${isSelected ? 'bg-blue-50/80 text-blue-900 font-black' : 'hover:bg-slate-50 text-slate-700 font-medium'}`}>
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-black text-xs shrink-0 overflow-hidden">
                            {s.fotoUrl ? <img src={s.fotoUrl} alt={s.name} loading="lazy" decoding="async" className="w-full h-full object-cover" /> : (s.name || 'M').charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="font-extrabold text-slate-800 truncate">{s.name}</p>
                            <p className="text-[10px] text-slate-400 font-semibold truncate">
                              {s.nis ? `NIS: ${s.nis} • ` : ''}Kelas {s.kelas}
                            </p>
                          </div>
                        </div>
                        {isSelected && <Icon name="check" size={15} className="text-blue-600 shrink-0" />}
                      </button>;
        })}
              </div>
            </div>}
        </div>;
});

const KuitansiModal = React.memo(function KuitansiModal({
  transaction,
  settings,
  onClose
}) {
  if (!transaction) return null;
  return <ModalPortal><div className="fixed inset-0 bg-slate-950/75 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 overflow-y-auto">
          <div id="kuitansi-print-area" className="printable-kuitansi ticket-wrapper max-w-sm sm:max-w-md w-full bg-white rounded-[32px] overflow-hidden shadow-2xl relative my-auto animate-in zoom-in-95 duration-200 border border-slate-200">
            
            <button onClick={onClose} className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors print:hidden z-20" title="Tutup">
              <Icon name="x" size={20} />
            </button>

            
            
            <div className="pt-8 pb-4 px-6 text-center space-y-2">
              <div className="w-16 h-16 mx-auto relative flex items-center justify-center mb-1">
                <div className="w-16 h-16 rounded-2xl bg-white border-2 border-blue-200 shadow-md p-2 flex items-center justify-center relative">
                  <img src="logo.webp" alt="PAUD Setia Bhakti" loading="lazy" decoding="async" className="w-full h-full object-contain" />
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

            
            <div className="ticket-divider-row">
              <div className="ticket-notch ticket-notch-left"></div>
              <div className="ticket-perforation"></div>
              <div className="ticket-notch ticket-notch-right"></div>
            </div>

            
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
                  {Boolean(transaction.keringananNote) && <span className="px-1.5 py-0.5 rounded text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300">
                      *keringanan
                    </span>}
                </div>
              </div>
            </div>

            
            <div className="ticket-divider-row">
              <div className="ticket-notch ticket-notch-left"></div>
              <div className="ticket-perforation"></div>
              <div className="ticket-notch ticket-notch-right"></div>
            </div>

            
            <div className="px-7 py-3 space-y-2.5 text-xs">
              <p className="font-extrabold text-slate-800 text-[13px] mb-2 tracking-tight">Product Details</p>

              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-medium truncate max-w-[160px]">SPP {transaction.studentName}</span>
                <div className="flex items-center gap-1.5 text-right">
                  <span className="font-bold text-slate-800">: {formatRupiah(transaction.amount)}</span>
                  {Boolean(transaction.keringananNote) && <span className="text-[10px] font-black text-emerald-700 italic">*keringanan</span>}
                </div>
              </div>

              {Boolean(transaction.keringananNote) && <div className="flex items-start justify-between text-[11px] bg-emerald-50/80 p-2 rounded-xl border border-emerald-200">
                  <span className="text-emerald-700 font-bold">Keterangan:</span>
                  <span className="font-extrabold text-emerald-800 text-right">{transaction.keringananNote}</span>
                </div>}

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

            
            <div className="ticket-bottom-sawtooth mt-2"></div>

            
            <div className="p-6 bg-slate-50/80 border-t border-slate-100 flex flex-col gap-2 print:hidden">
              <button type="button" onClick={() => window.print()} className="w-full py-3.5 px-4 bg-slate-900 hover:bg-slate-800 text-white font-extrabold rounded-2xl text-xs shadow-lg shadow-slate-900/15 transition-all flex items-center justify-center gap-2 hover:scale-[1.01] active:scale-[0.99]">
                <Icon name="download" size={16} />
                <span>Download PDF Receipt</span>
              </button>
              <button type="button" onClick={onClose} className="w-full py-2 text-slate-500 hover:text-slate-800 text-xs font-bold transition-colors">
                Tutup
              </button>
            </div>
          </div>
        </div></ModalPortal>;
});

const MIDTRANS_PAYMENT_CATEGORIES = [{
  id: 'va',
  label: 'Virtual Account Bank',
  shortLabel: 'Bank VA',
  icon: 'building-2',
  defaultChannel: 'bca_va'
}, {
  id: 'qris',
  label: 'Scan QRIS & e-Wallet',
  shortLabel: 'Scan QRIS',
  icon: 'qr-code',
  defaultChannel: 'other_qris'
}, {
  id: 'cash',
  label: 'Tunai di TU',
  shortLabel: 'Loket TU',
  icon: 'banknote',
  defaultChannel: 'cash_tu'
}];

const MIDTRANS_CHANNEL_OPTIONS = {
  va: [{
    id: 'bca_va',
    title: 'BCA VA',
    shortCode: 'BCA',
    badgeClass: 'bg-blue-700 text-white',
    desc: 'm-BCA & myBCA'
  }, {
    id: 'echannel',
    title: 'Mandiri VA',
    shortCode: 'MANDIRI',
    badgeClass: 'bg-amber-400 text-slate-950',
    desc: "Livin' by Mandiri"
  }, {
    id: 'bni_va',
    title: 'BNI VA',
    shortCode: 'BNI',
    badgeClass: 'bg-orange-600 text-white',
    desc: 'BNI Mobile & ATM'
  }, {
    id: 'bri_va',
    title: 'BRI VA',
    shortCode: 'BRI',
    badgeClass: 'bg-sky-700 text-white',
    desc: 'BRImo & ATM BRI'
  }, {
    id: 'permata_va',
    title: 'Permata VA',
    shortCode: 'PERMATA',
    badgeClass: 'bg-emerald-700 text-white',
    desc: 'PermataMobile X'
  }, {
    id: 'cimb_va',
    title: 'CIMB Niaga VA',
    shortCode: 'CIMB',
    badgeClass: 'bg-rose-700 text-white',
    desc: 'OCTO Mobile & ATM'
  }, {
    id: 'other_va',
    title: 'Bank Lainnya (VA)',
    shortCode: 'ATM VA',
    badgeClass: 'bg-slate-700 text-white',
    desc: 'Transfer antar bank via ATM Bersama, Prima & Alto',
    fullWidth: true
  }],
  qris: [{
    id: 'other_qris',
    title: 'Scan QRIS (Semua Aplikasi)',
    shortCode: 'QRIS',
    badgeClass: 'bg-gradient-to-r from-indigo-600 to-blue-600 text-white',
    desc: 'Kode QRIS universal untuk GoPay, OVO, DANA, ShopeePay & M-Banking (Bisa Simulator QRIS)',
    fullWidth: true
  }, {
    id: 'gopay',
    title: 'GoPay QRIS',
    shortCode: 'GOPAY',
    badgeClass: 'bg-sky-600 text-white',
    desc: 'QRIS GoPay & GoPayLater (Bisa Simulator QRIS)'
  }, {
    id: 'shopeepay',
    title: 'ShopeePay QRIS',
    shortCode: 'SHOPEE',
    badgeClass: 'bg-orange-500 text-white',
    desc: 'QRIS ShopeePay & SPayLater (Bisa Simulator QRIS)'
  }, {
    id: 'dana',
    title: 'DANA (Redirect App)',
    shortCode: 'DANA',
    badgeClass: 'bg-blue-500 text-white',
    desc: 'Kasir DANA via No. HP & OTP (Bukan kode QR — untuk tes Simulator pilih Scan QRIS)'
  }, {
    id: 'ovo',
    title: 'OVO (Push Notif App)',
    shortCode: 'OVO',
    badgeClass: 'bg-violet-700 text-white',
    desc: 'Notifikasi aplikasi OVO 55 detik (Bukan kode QR — untuk tes Simulator pilih Scan QRIS)'
  }],
  cash: [{
    id: 'cash_tu',
    title: 'Bayar Tunai di Loket TU',
    shortCode: 'TUNAI',
    badgeClass: 'bg-slate-800 text-white',
    desc: 'Pembayaran langsung via staf Tata Usaha'
  }]
};

const MidtransModal = React.memo(function MidtransModal({
  bill,
  student,
  settings,
  onClose,
  onConfirmSuccess,
  onGatewayPending,
  onGatewayResult,
  onGatewayCancelledBeforePayment
}) {
  const [category, setCategory] = useState('va');
  const [channelId, setChannelId] = useState('bca_va');
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [qrisEmbedSession, setQrisEmbedSession] = useState(null);
  const [qrisEmbedQrUrl, setQrisEmbedQrUrl] = useState('');
  const [qrisUrlCopied, setQrisUrlCopied] = useState(false);
  const [isCheckingEmbedStatus, setIsCheckingEmbedStatus] = useState(false);
  const submittingRef = useRef(false);
  const outcomeHandledRef = useRef(false);
  const snapEmbedContainerRef = useRef(null);
  const embeddedTokenRef = useRef('');
  const syncedPendingQrRef = useRef('');
  const isCashTU = category === 'cash' || channelId === 'cash_tu';
  const isQrisCodeChannel = category === 'qris' && (channelId === 'other_qris' || channelId === 'gopay' || channelId === 'shopeepay');
  const isNonQrisWalletChannel = category === 'qris' && (channelId === 'dana' || channelId === 'ovo');
  const currentChannelList = MIDTRANS_CHANNEL_OPTIONS[category] || [];
  const selectedChannel = currentChannelList.find(c => c.id === channelId) || currentChannelList[0] || {
    id: 'bca_va',
    title: 'BCA VA',
    shortCode: 'BCA',
    desc: 'm-BCA & myBCA'
  };
  const [gatewayInfo, setGatewayInfo] = useState({
    checked: false,
    ready: false,
    mode: window.AppEnv?.midtransIsProduction ? 'production' : 'sandbox',
    snapUrl: window.AppEnv?.midtransSnapUrl || 'https://app.sandbox.midtrans.com/snap/snap.js',
    clientKey: window.AppEnv?.midtransClientKey || settings?.midtransClientKey || '',
    isDemoPlaceholder: true,
    backendReachable: false
  });
  useEffect(() => {
    let cancelled = false;
    const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const timer = setTimeout(() => {
      try {
        controller && controller.abort();
      } catch (e) {}
    }, 3500);
    const checkGatewayConfig = async () => {
      try {
        const data = await AppApi.payment.getMidtransConfig(controller ? controller.signal : undefined);
        if (!cancelled && data && data.ok) {
          setGatewayInfo({
            checked: true,
            ready: Boolean(data.ready),
            mode: data.mode || 'sandbox',
            snapUrl: data.snapUrl || window.AppEnv?.midtransSnapUrl || 'https://app.sandbox.midtrans.com/snap/snap.js',
            clientKey: data.clientKey || window.AppEnv?.midtransClientKey || settings?.midtransClientKey || '',
            isDemoPlaceholder: Boolean(data.isDemoPlaceholder),
            backendReachable: true
          });
          return;
        }
      } catch (e) {}
      if (!cancelled) {
        setGatewayInfo(prev => ({
          ...prev,
          checked: true,
          ready: false,
          backendReachable: false
        }));
      }
    };
    checkGatewayConfig().finally(() => clearTimeout(timer));
    return () => {
      cancelled = true;
      clearTimeout(timer);
      try {
        controller && controller.abort();
      } catch (e) {}
    };
  }, [settings?.midtransClientKey]);
  const handleSelectCategory = nextCat => {
    if (isProcessing) return;
    setCategory(nextCat);
    const catMeta = MIDTRANS_PAYMENT_CATEGORIES.find(c => c.id === nextCat);
    if (catMeta) {
      setChannelId(catMeta.defaultChannel);
    }
    setErrorMsg('');
  };
  const syncOrderStatus = async (orderId, fallbackResult = {}, createData = {}) => {
    const snapTok = createData?.snapToken || '';
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const det = await AppApi.payment.getMidtransStatusDetailed(orderId, {
          snapToken: snapTok
        });
        if (det && det.ok && det.data && det.data.ok && det.data.paymentDetermined !== false) {
          return det.data;
        }
      } catch (e) {}
      if (attempt === 0) {
        await new Promise(r => setTimeout(r, 350));
      }
    }
    return {
      ok: true,
      orderId,
      status: fallbackResult.transaction_status === 'settlement' || fallbackResult.transaction_status === 'capture' ? 'Lunas' : 'Pending',
      method: fallbackResult.payment_type ? `${String(fallbackResult.payment_type).toUpperCase()} (Midtrans)` : createData?.method || selectedChannel.title,
      snapToken: snapTok,
      expiryTime: createData?.expiryTime || '',
      expiresAtMs: Number(createData?.expiresAtMs || 0)
    };
  };
  const finishQrisEmbedSession = useCallback(async (sessionObj, preSyncedData = null, preSnapResult = null) => {
    if (!sessionObj || outcomeHandledRef.current) return;
    outcomeHandledRef.current = true;
    submittingRef.current = false;
    setIsCheckingEmbedStatus(true);
    let resolved = preSyncedData;
    if (!resolved) {
      try {
        const det = await AppApi.payment.getMidtransStatusDetailed(sessionObj.orderId, {
          snapToken: sessionObj.snapToken
        });
        if (det && det.ok && det.data && det.data.ok && det.data.paymentDetermined !== false) {
          resolved = det.data;
        }
      } catch (e) {}
    }
    setIsCheckingEmbedStatus(false);
    setQrisEmbedSession(null);
    if (resolved) {
      if (onGatewayResult) {
        onGatewayResult(bill, {
          ...resolved,
          rawCreate: sessionObj.rawCreate,
          ...(preSnapResult ? { snapResult: preSnapResult } : { closedManually: true })
        });
      } else if (resolved.status === 'Lunas') {
        onConfirmSuccess && onConfirmSuccess(bill, resolved.method || sessionObj.channelTitle);
      } else {
        onClose && onClose();
      }
      return;
    }
    if (onGatewayCancelledBeforePayment) {
      onGatewayCancelledBeforePayment(bill, {
        orderId: sessionObj.orderId,
        channelTitle: sessionObj.channelTitle
      });
    } else {
      onClose && onClose();
    }
  }, [bill, onClose, onConfirmSuccess, onGatewayCancelledBeforePayment, onGatewayResult]);
  const pollQrisEmbedStatus = useCallback(async (sessionObj, showNotChangedFeedback = false) => {
    if (!sessionObj || outcomeHandledRef.current) return;
    if (showNotChangedFeedback) {
      setIsCheckingEmbedStatus(true);
      setErrorMsg('');
    }
    try {
      const det = await AppApi.payment.getMidtransStatusDetailed(sessionObj.orderId, {
        snapToken: sessionObj.snapToken
      });
      if (det && det.ok && det.data && det.data.ok && det.data.paymentDetermined !== false) {
        const st = det.data;
        const qrUrl = st.paymentDetails?.qrCodeUrl || '';
        if (qrUrl) {
          setQrisEmbedQrUrl(prev => prev || qrUrl);
        }
        const statusLower = String(st.status || '').trim().toLowerCase();
        if (statusLower === 'lunas' || statusLower === 'berhasil' || statusLower === 'sukses' || statusLower === 'kadaluarsa' || statusLower === 'dibatalkan') {
          await finishQrisEmbedSession(sessionObj, st);
          return;
        }
        if (syncedPendingQrRef.current !== sessionObj.orderId && onGatewayPending) {
          syncedPendingQrRef.current = sessionObj.orderId;
          onGatewayPending(bill, {
            ...st,
            redirectUrl: sessionObj.redirectUrl,
            snapUrl: sessionObj.snapUrl
          });
        }
        if (showNotChangedFeedback) {
          setStatusMsg(qrUrl ? 'Menunggu konfirmasi pembayaran QRIS...' : 'Menunggu QRIS diterbitkan...');
        }
      } else if (showNotChangedFeedback) {
        setStatusMsg('QRIS sedang disiapkan oleh Midtrans...');
      }
    } catch (e) {
    } finally {
      if (showNotChangedFeedback) {
        setIsCheckingEmbedStatus(false);
      }
    }
  }, [bill, finishQrisEmbedSession, onGatewayPending]);
  const activeEmbedSessionRef = useRef(null);
  const finishQrisEmbedRef = useRef(null);
  const pollQrisEmbedRef = useRef(null);
  const syncOrderStatusRef = useRef(null);
  activeEmbedSessionRef.current = qrisEmbedSession;
  finishQrisEmbedRef.current = finishQrisEmbedSession;
  pollQrisEmbedRef.current = pollQrisEmbedStatus;
  syncOrderStatusRef.current = syncOrderStatus;
  const activeEmbedToken = qrisEmbedSession?.snapToken || '';
  const activeEmbedOrderId = qrisEmbedSession?.orderId || '';
  useEffect(() => {
    if (!activeEmbedToken || !snapEmbedContainerRef.current) return undefined;
    if (embeddedTokenRef.current === activeEmbedToken) return undefined;
    const snap = window.snap;
    if (!snap || typeof snap.embed !== 'function') return undefined;
    embeddedTokenRef.current = activeEmbedToken;
    snapEmbedContainerRef.current.innerHTML = '';
    try {
      snap.embed(activeEmbedToken, {
        embedId: 'midtrans-qris-embed-box',
        onSuccess: async result => {
          const curSess = activeEmbedSessionRef.current;
          const synced = await syncOrderStatusRef.current(curSess.orderId, result, curSess.rawCreate);
          await finishQrisEmbedRef.current(curSess, synced, result);
        },
        onPending: async result => {
          const curSess = activeEmbedSessionRef.current;
          const synced = await syncOrderStatusRef.current(curSess.orderId, result, curSess.rawCreate);
          if (synced?.paymentDetails?.qrCodeUrl) {
            setQrisEmbedQrUrl(synced.paymentDetails.qrCodeUrl);
          }
          await finishQrisEmbedRef.current(curSess, synced, result);
        },
        onError: errResult => {
          setErrorMsg(errResult?.status_message || 'Pembayaran QRIS gagal diproses oleh Midtrans.');
        },
        onClose: () => {
          finishQrisEmbedRef.current(activeEmbedSessionRef.current);
        }
      });
    } catch (e) {
      setErrorMsg('Gagal memuat jendela QRIS Midtrans: ' + (e?.message || 'Error'));
    }
    return () => {
      embeddedTokenRef.current = '';
      try {
        if (window.snap && typeof window.snap.hide === 'function') {
          window.snap.hide();
        }
      } catch (e) {}
    };
  }, [activeEmbedToken]);
  useEffect(() => {
    if (!activeEmbedOrderId) return undefined;
    const tick = () => {
      const curSess = activeEmbedSessionRef.current;
      if (curSess && pollQrisEmbedRef.current) {
        pollQrisEmbedRef.current(curSess, false);
      }
    };
    const t1 = setTimeout(tick, 1100);
    const t2 = setTimeout(tick, 2500);
    const interval = setInterval(tick, 3200);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearInterval(interval);
    };
  }, [activeEmbedOrderId]);
  const handleConfirm = async () => {
    if (submittingRef.current || isProcessing) return;
    setErrorMsg('');
    setStatusMsg('');
    if (isCashTU) {
      onClose && onClose();
      return;
    }
    if (!gatewayInfo.ready) {
      submittingRef.current = true;
      setIsProcessing(true);
      setTimeout(() => {
        submittingRef.current = false;
        setIsProcessing(false);
        onConfirmSuccess(bill, selectedChannel.title);
      }, 600);
      return;
    }
    submittingRef.current = true;
    outcomeHandledRef.current = false;
    setIsProcessing(true);
    setStatusMsg(`Menyiapkan ${selectedChannel.title}...`);
    try {
      const {
        ok,
        status: httpStatus,
        data
      } = await AppApi.payment.createMidtransTransaction({
        studentId: student.id,
        nis: student.nis,
        studentName: student.name,
        kelas: student.kelas,
        wali: student.wali,
        telepon: student.telepon,
        month: bill.month,
        amount: bill.amount,
        isArrearsPayment: Boolean(bill.isArrearsPayment),
        preferredChannel: selectedChannel.id,
        replacePending: Boolean(bill.replacePending)
      });
      if (httpStatus === 409 && data?.code === 'PENDING_TRANSACTION_EXISTS') {
        submittingRef.current = false;
        setIsProcessing(false);
        setStatusMsg('');
        if (onGatewayPending) {
          onGatewayPending(bill, {
            ...data,
            duplicateBlocked: true
          });
        } else {
          onClose && onClose();
        }
        return;
      }
      if (httpStatus === 409 && data?.code === 'ALREADY_PAID') {
        submittingRef.current = false;
        setIsProcessing(false);
        setStatusMsg('');
        setErrorMsg(data?.message || 'Tagihan ini sudah berstatus Lunas.');
        return;
      }
      if (!ok || !data || !data.ok || !data.snapToken) {
        throw new Error(data?.message || 'Gagal membuat sesi pembayaran Midtrans Snap.');
      }
      setStatusMsg(`Membuka ${selectedChannel.title}...`);
      const snap = await loadMidtransSnapScript(data.snapUrl || gatewayInfo.snapUrl, gatewayInfo.clientKey);
      const createdOrderId = data.orderId;
      if (isQrisCodeChannel && typeof snap.embed === 'function') {
        submittingRef.current = false;
        setIsProcessing(false);
        setStatusMsg('');
        setQrisEmbedQrUrl('');
        setQrisUrlCopied(false);
        embeddedTokenRef.current = '';
        syncedPendingQrRef.current = '';
        setQrisEmbedSession({
          snapToken: data.snapToken,
          snapUrl: data.snapUrl || gatewayInfo.snapUrl,
          orderId: createdOrderId,
          channelTitle: selectedChannel.title,
          method: data.method || selectedChannel.title,
          expiryTime: data.expiryTime || '',
          expiresAtMs: Number(data.expiresAtMs || 0) || Date.now() + DEFAULT_CLIENT_SNAP_EXPIRY_MS,
          redirectUrl: data.redirectUrl || '',
          rawCreate: data
        });
        return;
      }
      snap.pay(data.snapToken, {
        onSuccess: async result => {
          outcomeHandledRef.current = true;
          setStatusMsg('Memverifikasi status pembayaran...');
          const synced = await syncOrderStatus(createdOrderId, result, data);
          submittingRef.current = false;
          setIsProcessing(false);
          if (onGatewayResult) {
            onGatewayResult(bill, {
              ...synced,
              rawCreate: data,
              snapResult: result
            });
          } else {
            onConfirmSuccess(bill, synced.method || selectedChannel.title);
          }
        },
        onPending: async result => {
          outcomeHandledRef.current = true;
          setStatusMsg('Menyimpan status menunggu pembayaran...');
          const synced = await syncOrderStatus(createdOrderId, result, data);
          submittingRef.current = false;
          setIsProcessing(false);
          if (onGatewayResult) {
            onGatewayResult(bill, {
              ...synced,
              status: synced.status || 'Pending',
              rawCreate: data,
              snapResult: result
            });
          } else {
            onClose && onClose();
          }
        },
        onError: errResult => {
          outcomeHandledRef.current = true;
          submittingRef.current = false;
          setIsProcessing(false);
          setStatusMsg('');
          setErrorMsg(errResult?.status_message || 'Pembayaran gagal diproses oleh Midtrans.');
        },
        onClose: async () => {
          if (outcomeHandledRef.current) {
            submittingRef.current = false;
            setIsProcessing(false);
            return;
          }
          setStatusMsg('Memeriksa status pembayaran di Midtrans...');
          let detailedStatus = null;
          try {
            const det = await AppApi.payment.getMidtransStatusDetailed(createdOrderId, {
              snapToken: data.snapToken
            });
            if (det && det.ok && det.data && det.data.ok && det.data.paymentDetermined !== false) {
              detailedStatus = det.data;
            }
          } catch (e) {}
          submittingRef.current = false;
          setIsProcessing(false);
          setStatusMsg('');
          if (detailedStatus) {
            if (onGatewayResult) {
              onGatewayResult(bill, {
                ...detailedStatus,
                rawCreate: data,
                closedManually: true
              });
            } else {
              onClose && onClose();
            }
            return;
          }
          if (onGatewayCancelledBeforePayment) {
            onGatewayCancelledBeforePayment(bill, {
              orderId: createdOrderId,
              channelTitle: selectedChannel.title
            });
          } else {
            onClose && onClose();
          }
        }
      });
    } catch (err) {
      submittingRef.current = false;
      setIsProcessing(false);
      setStatusMsg('');
      setErrorMsg(err.message || 'Terjadi kesalahan saat menghubungi backend pembayaran.');
    }
  };
  if (qrisEmbedSession) {
    const isSandboxMode = gatewayInfo.mode !== 'production';
    return <ModalPortal><div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-[9999] flex items-center justify-center p-2.5 sm:p-4 overflow-y-auto">
            <div className="bg-white rounded-[24px] sm:rounded-[30px] max-w-4xl w-full max-h-[94vh] flex flex-col shadow-2xl border border-slate-200 my-auto animate-in zoom-in-95 duration-200 relative overflow-hidden">

              <div className="px-4 py-3.5 sm:px-6 sm:py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/80 shrink-0">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 bg-gradient-to-tr from-indigo-600 to-blue-600 text-white rounded-2xl flex items-center justify-center shadow-md shadow-indigo-500/25 shrink-0">
                    <Icon name="qr-code" size={20} />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-black text-slate-900 text-sm sm:text-base leading-tight truncate">{qrisEmbedSession.channelTitle}</h3>
                    <p className="text-[11px] text-slate-500 font-semibold mt-0.5 truncate">
                      Order: <span className="font-mono font-bold text-slate-700">{qrisEmbedSession.orderId}</span> • {formatRupiah(bill.amount)}
                    </p>
                  </div>
                </div>
                <button type="button" onClick={() => finishQrisEmbedSession(qrisEmbedSession)} disabled={isCheckingEmbedStatus} className="p-2 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-200/70 disabled:opacity-40 transition-colors shrink-0">
                  <Icon name="x" size={20} />
                </button>
              </div>

              <div className="p-3 sm:p-5 overflow-y-auto flex-1">
                <div className="grid grid-cols-1 lg:grid-cols-[310px_1fr] gap-4 items-start">
                  <div className="space-y-3">
                    <div className="p-3.5 rounded-2xl bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-950 text-white space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] font-black uppercase tracking-wider text-cyan-300">Batas Waktu</span>
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-400/20 border border-amber-300/40 text-xs font-mono font-black text-amber-200">
                          <Icon name="clock" size={11} />
                          <LiveCountdownText expiresAtMs={qrisEmbedSession.expiresAtMs} />
                        </span>
                      </div>
                      <div className="text-xs font-bold text-slate-200 truncate">{student.name} • {bill.month}</div>
                      <div className="text-lg font-black text-white">{formatRupiah(bill.amount)}</div>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-indigo-50/90 border border-indigo-200 space-y-2.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[11px] font-black text-indigo-950 uppercase tracking-wider">URL Gambar QRIS</span>
                        {qrisEmbedQrUrl ? <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black">Siap</span> : <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-black">
                            <Icon name="loader-2" size={10} className="animate-spin" /> Memuat
                          </span>}
                      </div>

                      {qrisEmbedQrUrl ? <>
                          <div className="p-2 rounded-xl bg-white border border-indigo-200/80 text-[10.5px] font-mono text-slate-700 break-all select-all leading-relaxed">
                            {qrisEmbedQrUrl}
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <button type="button" onClick={() => {
                        try {
                          navigator.clipboard.writeText(qrisEmbedQrUrl);
                          setQrisUrlCopied(true);
                          setTimeout(() => setQrisUrlCopied(false), 2000);
                        } catch (e) {}
                      }} className="flex-1 py-2 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black flex items-center justify-center gap-1.5 shadow-sm transition-colors">
                              <Icon name={qrisUrlCopied ? 'check' : 'copy'} size={13} />
                              <span>{qrisUrlCopied ? 'URL Disalin ✓' : 'Salin URL QRIS'}</span>
                            </button>
                            {isSandboxMode && <a href="https://simulator.sandbox.midtrans.com/v2/qris/index" target="_blank" rel="noopener noreferrer" className="py-2 px-3 rounded-xl bg-white hover:bg-slate-50 text-indigo-700 border border-indigo-300 text-xs font-black flex items-center justify-center gap-1.5 shadow-2xs transition-colors">
                                <Icon name="external-link" size={13} />
                                <span>Buka Simulator</span>
                              </a>}
                          </div>
                        </> : <p className="text-[11px] text-indigo-900 font-semibold leading-relaxed">
                          Sedang mengambil URL gambar QRIS dari Midtrans (1–2 detik)...
                        </p>}

                      {isSandboxMode && <div className="p-2.5 rounded-xl bg-white/80 border border-indigo-100 text-[11px] text-slate-700 space-y-1 leading-relaxed font-medium">
                          <p className="font-extrabold text-indigo-950">Cara Bayar di Simulator QRIS:</p>
                          <p>1. Klik <strong>Salin URL QRIS</strong> di atas (bukan Order ID / Download PNG).</p>
                          <p>2. Klik <strong>Buka Simulator</strong>, tempel URL di kolom <strong>QR Code Image Url</strong>, lalu klik <strong>Scan QR</strong>.</p>
                          <p>3. Pilih Issuer (GoPay / ShopeePay / DANA / OVO) &amp; klik <strong>Pay</strong>.</p>
                        </div>}
                    </div>

                    {statusMsg && <div className="p-2.5 rounded-xl bg-blue-50 border border-blue-200 text-[11px] font-bold text-blue-800 flex items-center gap-2">
                        <Icon name="info" size={14} className="shrink-0" />
                        <span>{statusMsg}</span>
                      </div>}
                    {errorMsg && <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-[11px] font-bold text-rose-700 flex items-center gap-2">
                        <Icon name="alert-circle" size={14} className="shrink-0" />
                        <span>{errorMsg}</span>
                      </div>}
                  </div>

                  <div className="w-full overflow-x-auto">
                    <div id="midtrans-qris-embed-box" ref={snapEmbedContainerRef} className="w-full min-w-[310px] h-[580px] rounded-2xl border border-slate-200 bg-white overflow-hidden" />
                  </div>
                </div>
              </div>

              <div className="px-4 py-3.5 sm:px-6 bg-slate-50/90 border-t border-slate-100 flex flex-wrap gap-2.5 shrink-0">
                <button type="button" onClick={() => finishQrisEmbedSession(qrisEmbedSession)} disabled={isCheckingEmbedStatus} className="py-2.5 px-4 bg-white hover:bg-slate-100 border border-slate-300 font-bold rounded-2xl text-xs text-slate-700 transition-colors disabled:opacity-50">
                  Simpan di Pending &amp; Tutup
                </button>
                <button type="button" onClick={() => pollQrisEmbedStatus(qrisEmbedSession, true)} disabled={isCheckingEmbedStatus} className="flex-1 py-2.5 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-black rounded-2xl text-xs sm:text-sm shadow-md flex items-center justify-center gap-2 disabled:opacity-50">
                  <Icon name={isCheckingEmbedStatus ? 'loader-2' : 'refresh-cw'} size={15} className={isCheckingEmbedStatus ? 'animate-spin' : ''} />
                  <span>{isCheckingEmbedStatus ? 'Memeriksa Status...' : 'Cek Status Pembayaran'}</span>
                </button>
              </div>
            </div>
          </div></ModalPortal>;
  }
  return <ModalPortal><div className="fixed inset-0 bg-slate-950/75 backdrop-blur-sm z-[9999] flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-[26px] sm:rounded-[30px] max-w-xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 my-auto animate-in zoom-in-95 duration-200 relative overflow-hidden">

            <div className="px-4 py-4 sm:px-6 sm:py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70 shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 sm:w-11 sm:h-11 bg-gradient-to-tr from-blue-600 via-sky-500 to-indigo-600 text-white rounded-2xl flex items-center justify-center shadow-md shadow-blue-500/25 shrink-0">
                  <Icon name="credit-card" size={20} />
                </div>
                <div className="min-w-0">
                  <h3 className="font-black text-slate-900 text-base sm:text-lg leading-tight">Pembayaran SPP Online</h3>
                  <p className="text-xs text-slate-500 font-semibold mt-0.5">
                    Pilih metode pembayaran yang akan digunakan
                  </p>
                </div>
              </div>
              <button type="button" onClick={onClose} disabled={isProcessing} className="p-2 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-200/70 disabled:opacity-40 transition-colors shrink-0">
                <Icon name="x" size={20} />
              </button>
            </div>

            <div className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1">
              {!isCashTU && gatewayInfo.checked && !gatewayInfo.ready && <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl text-[11px] text-amber-900 font-semibold flex items-start gap-2">
                  <Icon name="info" size={15} className="text-amber-600 shrink-0 mt-0.5" />
                  <span>
                    {gatewayInfo.backendReachable ? 'Backend API Midtrans siap, namun kunci Sandbox masih demo (.env). Konfirmasi akan berjalan dalam mode simulasi lokal.' : 'Backend API Midtrans belum tersambung di host ini. Pembayaran berjalan dalam mode simulasi lokal.'}
                  </span>
                </div>}

              <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-950 text-white shadow-lg shadow-blue-950/15 space-y-2.5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-[10px] font-black uppercase tracking-widest text-cyan-300 whitespace-nowrap">Rincian Tagihan</span>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-400/20 border border-amber-300/35 text-[10px] font-black text-amber-200 whitespace-nowrap shrink-0">
                        <Icon name="clock" size={10} className="shrink-0" /> Batas 5 Menit
                      </span>
                    </div>
                    <h4 className="font-black text-sm sm:text-base text-white truncate mt-1.5 capitalize">{student.name}</h4>
                    <p className="text-[11px] font-bold text-slate-300 truncate">{student.kelas} • NIS {student.nis}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-300 block">Total Bayar</span>
                    <div className="text-lg sm:text-2xl font-black text-white tracking-tight whitespace-nowrap mt-0.5">{formatRupiah(bill.amount)}</div>
                  </div>
                </div>
                <div className="pt-2 border-t border-white/10 flex flex-wrap items-center gap-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-300 shrink-0">Tagihan:</span>
                  <span className="inline-block max-w-full px-2.5 py-1 rounded-xl bg-white/15 border border-white/20 text-[11px] font-extrabold text-cyan-200 leading-snug break-words whitespace-normal">
                    {bill.month}
                  </span>
                </div>
              </div>

              {errorMsg && <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl text-xs font-bold text-rose-700 flex items-start gap-2">
                  <Icon name="alert-circle" size={16} className="shrink-0 mt-0.5" />
                  <span>{errorMsg}</span>
                </div>}

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-black text-slate-500 uppercase tracking-wider">
                    Pilih Metode Pembayaran
                  </label>
                </div>

                <div className="grid grid-cols-3 gap-1.5 p-1.5 bg-slate-100 rounded-2xl border border-slate-200/80">
                  {MIDTRANS_PAYMENT_CATEGORIES.map(cat => {
                const active = category === cat.id;
                return <button key={cat.id} type="button" disabled={isProcessing} onClick={() => handleSelectCategory(cat.id)} className={`py-2.5 px-2 rounded-xl text-[11px] sm:text-xs font-black transition-all flex items-center justify-center gap-1.5 ${active ? 'bg-white text-blue-700 shadow-sm border border-blue-200/80' : 'text-slate-600 hover:text-slate-900'}`}>
                        <Icon name={cat.icon} size={14} className={active ? 'text-blue-600 shrink-0' : 'text-slate-500 shrink-0'} />
                        <span className="truncate">{cat.shortLabel}</span>
                      </button>;
              })}
                </div>

                {!isCashTU ? <div className="space-y-2.5">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {currentChannelList.map(opt => {
                    const isSelected = channelId === opt.id;
                    return <button key={opt.id} type="button" disabled={isProcessing} onClick={() => !isProcessing && setChannelId(opt.id)} className={`p-3 sm:p-3.5 rounded-2xl border text-left transition-all flex items-center gap-3 relative ${opt.fullWidth ? 'sm:col-span-2' : ''} ${isSelected ? 'bg-blue-50/90 border-blue-600 ring-2 ring-blue-500/20 shadow-sm' : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/80'}`}>
                            <span className={`px-2 py-1.5 rounded-xl text-[10px] font-black tracking-wide shrink-0 w-[64px] text-center shadow-2xs ${opt.badgeClass}`}>
                              {opt.shortCode}
                            </span>
                            <div className="min-w-0 flex-1">
                              <p className="font-extrabold text-xs sm:text-[13px] text-slate-900 leading-snug">{opt.title}</p>
                              <p className="text-[11px] font-medium text-slate-500 leading-snug mt-0.5">{opt.desc}</p>
                            </div>
                            <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${isSelected ? 'border-blue-600 bg-blue-600' : 'border-slate-300'}`}>
                              {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white"></div>}
                            </div>
                          </button>;
                  })}
                    </div>
                    {isNonQrisWalletChannel && <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl text-[11px] text-amber-900 font-semibold flex items-start gap-2 leading-relaxed">
                        <Icon name="alert-triangle" size={15} className="text-amber-600 shrink-0 mt-0.5" />
                        <span>
                          Kanal langsung <strong>DANA (Redirect)</strong> &amp; <strong>OVO (Push App)</strong> tidak menghasilkan gambar kode QRIS sehingga tidak bisa diisi di Simulator QRIS. Untuk membayar atau mengetes DANA/OVO/GoPay/ShopeePay di Simulator QRIS Sandbox, pilih <strong>Scan QRIS (Semua Aplikasi)</strong>.
                        </span>
                      </div>}
                  </div> : <div className="p-4 bg-sky-50 border border-sky-200 rounded-2xl text-xs text-sky-950 space-y-2">
                    <div className="flex items-center gap-2 font-black text-sky-900">
                      <Icon name="building-2" size={17} className="text-sky-600 shrink-0" />
                      <span>Panduan Bayar Tunai di Loket TU</span>
                    </div>
                    <p className="font-medium leading-relaxed text-[11.5px] text-slate-700">
                      Silakan datang langsung ke loket Tata Usaha (TU) <strong>{settings?.schoolName || 'PAUD Setia Bhakti'}</strong> dengan menyebutkan NIS <strong>{student.nis}</strong>, tagihan <strong>{bill.month}</strong> sebesar <strong>{formatRupiah(bill.amount)}</strong>. Status tagihan otomatis menjadi Lunas setelah dicatat resmi oleh staf TU.
                    </p>
                  </div>}
              </div>
            </div>

            <div className="px-4 py-4 sm:px-6 bg-slate-50/90 border-t border-slate-100 flex gap-2.5 shrink-0">
              <button type="button" onClick={onClose} disabled={isProcessing} className="py-3 px-4 bg-white hover:bg-slate-100 border border-slate-200 font-bold rounded-2xl text-xs text-slate-600 transition-colors disabled:opacity-50 shrink-0">
                Batal
              </button>
              <button type="button" onClick={handleConfirm} disabled={isProcessing} className={`flex-1 py-3 px-4 sm:px-5 font-black rounded-2xl text-xs sm:text-sm shadow-lg transition-all flex items-center justify-center gap-2 active:scale-[0.99] disabled:opacity-50 ${isCashTU ? 'bg-slate-900 hover:bg-slate-800 text-white shadow-slate-500/20' : 'bg-gradient-to-r from-blue-600 via-sky-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-blue-500/25'}`}>
                {isProcessing ? <>
                    <Icon name="loader-2" size={16} className="animate-spin shrink-0" />
                    <span className="truncate">{statusMsg || 'Memproses Pembayaran...'}</span>
                  </> : isCashTU ? <>
                    <Icon name="info" size={16} className="shrink-0" />
                    <span>Saya Mengerti &amp; Tutup</span>
                  </> : <>
                    <Icon name="check-circle" size={16} className="shrink-0" />
                    <span className="truncate">
                      {gatewayInfo.ready ? `Bayar via ${selectedChannel.title}` : `Konfirmasi ${selectedChannel.title}`}
                    </span>
                  </>}
              </button>
            </div>
          </div>
        </div></ModalPortal>;
});
