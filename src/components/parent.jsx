const ParentNoteCardItem = React.memo(function ParentNoteCardItem({
  note,
  student,
  onAddCommentNote
}) {
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [commentText, setCommentText] = useState('');
  const hasUserReplied = useMemo(() => {
    return (note.comments || []).some(c => c.sender === 'Wali Murid' || c.senderRole === 'parent' || c.sender?.toLowerCase().includes('wali') || student.name && c.sender === student.name || student.wali && c.sender === student.wali);
  }, [note.comments, student]);
  const handleSubmit = e => {
    if (e) e.preventDefault();
    if (!commentText.trim() || hasUserReplied) return;
    const now = new Date();
    const clockStr = now.toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit'
    }).replace(/\./g, ':');
    onAddCommentNote(note.id, {
      sender: 'Wali Murid',
      senderRole: 'parent',
      text: commentText.trim(),
      time: `${formatDateIndo(now)} • ${clockStr} WIB`
    });
    setCommentText('');
  };
  return <div className="bg-slate-50/80 rounded-2xl border border-slate-200/90 p-5 sm:p-6 hover:border-blue-200 transition-colors shadow-xs">
          
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

          
          <button type="button" onClick={() => setIsChatOpen(prev => !prev)} className="mt-4 w-full py-2.5 px-4 rounded-xl bg-white hover:bg-slate-100/90 border border-slate-200 flex items-center justify-between transition-colors text-xs font-black text-slate-700 active:scale-[0.99]">
            <div className="flex items-center gap-2">
              <Icon name="message-square" size={14} className="text-blue-600" />
              <span>Tanggapan Wali Murid ({note.comments ? note.comments.length : 0})</span>
              {hasUserReplied && <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black flex items-center gap-1 border border-emerald-200">
                  <Icon name="lock" size={10} /> Sudah Dibalas (Terkunci)
                </span>}
            </div>
            <div className="flex items-center gap-1.5 text-blue-600 text-[11px] font-bold">
              <span>{isChatOpen ? 'Tutup Percakapan' : 'Klik untuk buka riwayat percakapan'}</span>
              <Icon name={isChatOpen ? 'chevron-up' : 'chevron-down'} size={15} />
            </div>
          </button>

          
          {isChatOpen && <div className="mt-3 pt-3 border-t border-slate-200/60 space-y-3 animate-in fade-in duration-200">
              {note.comments && note.comments.length > 0 ? <div className="space-y-2">
                  {note.comments.map((c, i) => {
          const isTu = c.senderRole === 'admin' || c.sender?.toLowerCase().includes('admin') || c.sender?.toLowerCase().includes('tu');
          const senderLabel = isTu ? 'Tata Usaha (TU)' : `Wali Murid (Orang Tua Ananda ${student.name?.trim() || ''})`;
          return <div key={i} className={`p-3.5 rounded-xl border text-xs shadow-xs ${isTu ? 'bg-blue-50/80 border-blue-200 text-slate-800' : 'bg-emerald-50/80 border-emerald-200 text-slate-800'}`}>
                        <div className="flex justify-between items-center mb-1">
                          <span className={`font-black flex items-center gap-1.5 ${isTu ? 'text-blue-800' : 'text-emerald-800'}`}>
                            <Icon name={isTu ? 'shield-check' : 'user'} size={12} className={isTu ? 'text-blue-600' : 'text-emerald-600'} />
                            {senderLabel}
                          </span>
                          <span className="text-[10px] text-slate-500 font-bold">{formatDateTimeIndo(c.time, note.date)}</span>
                        </div>
                        <p className="text-slate-700 font-medium leading-relaxed whitespace-pre-wrap">{c.text}</p>
                      </div>;
        })}
                </div> : <p className="text-xs text-slate-400 italic text-center py-2">Belum ada riwayat tanggapan untuk catatan ini.</p>}

              
              {hasUserReplied ? <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-2.5 text-xs text-amber-900 font-bold">
                  <Icon name="lock" size={16} className="text-amber-600 shrink-0" />
                  <span>Anda sudah memberikan 1 tanggapan untuk catatan ini. Percakapan telah terkunci otomatis (maksimal 1x tanggapan).</span>
                </div> : <form onSubmit={handleSubmit} className="space-y-1.5 pt-1">
                  <div className="flex gap-2">
                    <input type="text" required value={commentText} onChange={e => setCommentText(e.target.value)} placeholder="Tulis tanggapan untuk TU (hanya 1x kesempatan membalas)..." className="flex-1 px-4 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-inner" />
                    <button type="submit" className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-xl text-xs transition-colors flex items-center gap-1.5 shadow-sm active:scale-95">
                      <Icon name="send" size={14} /> Kirim
                    </button>
                  </div>
                  <p className="text-[10px] text-slate-400 font-semibold italic">
                    * Catatan: Anda hanya dapat membalas 1 kali untuk setiap catatan TU. Setelah terkirim, form akan terkunci otomatis.
                  </p>
                </form>}
            </div>}
        </div>;
});

const ParentDashboardView = React.memo(function ParentDashboardView({
  student,
  transactions,
  announcements,
  complaints,
  notes,
  settings,
  onLogout,
  onShowKuitansi,
  onPayMidtrans,
  onResumePendingMidtrans,
  onCheckPendingStatus,
  onCancelPendingOrder,
  onRecreatePendingOrder,
  onSyncPendingOrder,
  parentNavIntent,
  onAddComplaint,
  onAddCommentNote,
  onReplyComplaint,
  onUpdateParentSettings,
  onRefresh,
  isRefreshing
}) {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [sppSubFilter, setSppSubFilter] = useState('all');
  const [isSppExpanded, setIsSppExpanded] = useState(true);
  const [pendingExpiryTick, setPendingExpiryTick] = useState(0);
  const [copiedPayCodeKey, setCopiedPayCodeKey] = useState(null);
  const syncedExpiredOrdersRef = useRef(new Set());
  const hydratedPendingOrdersRef = useRef(new Set());
  useEffect(() => {
    if (parentNavIntent && parentNavIntent.tab) {
      setActiveTab(parentNavIntent.tab);
      if (parentNavIntent.subFilter) {
        setSppSubFilter(parentNavIntent.subFilter);
        setIsSppExpanded(true);
      }
      setIsMobileMenuOpen(false);
    }
  }, [parentNavIntent]);
  const [complaintTitle, setComplaintTitle] = useState('');
  const [complaintContent, setComplaintContent] = useState('');
  const [complaintImage, setComplaintImage] = useState('');
  const [showParentBell, setShowParentBell] = useState(false);
  const [showParentClassHistory, setShowParentClassHistory] = useState(false);
  useEffect(() => {
    setShowParentBell(false);
    setShowParentClassHistory(false);
  }, [activeTab]);
  const [readAnnouncements, setReadAnnouncements] = useState(() => readJsonLsCached('read_announcements_' + (student ? student.id : 'guest'), []));
  const [readNotes, setReadNotes] = useState(() => readJsonLsCached('read_notes_' + (student ? student.id : 'guest'), []));
  const [readComplaintMsgs, setReadComplaintMsgs] = useState(() => readJsonLsCached('read_complaint_msgs_' + (student ? student.id : 'guest'), {}));
  const [previewImage, setPreviewImage] = useState(null);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState(null);
  const [replyText, setReplyText] = useState({});
  const [expiryTick, setExpiryTick] = useState(0);
  const [showPastComplaints, setShowPastComplaints] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [newPhone, setNewPhone] = useState(student?.telepon || '');
  const [settingsFeedback, setSettingsFeedback] = useState(null);
  const [historyClassFilter, setHistoryClassFilter] = useState('all');
  const studentTrx = useMemo(() => {
    if (!student) return [];
    return transactions.filter(t => t.studentId && t.studentId === student.id || t.studentName && t.studentName.toLowerCase().trim() === student.name.toLowerCase().trim());
  }, [transactions, student]);
  const studentActiveMonths = useMemo(() => {
    if (!student) return [];
    return getStudentAllBillingMonths(student, settings);
  }, [student, settings]);
  const monthlyBills = useMemo(() => {
    return studentActiveMonths.map(month => ({
      month,
      amount: Number(student?.tarif || 0)
    }));
  }, [studentActiveMonths, student]);
  const paidBills = useMemo(() => {
    const paidMonthNames = studentTrx.filter(isTrxSettled).map(t => (t.month || '').trim().toLowerCase());
    return monthlyBills.filter(b => paidMonthNames.includes(b.month.trim().toLowerCase()));
  }, [monthlyBills, studentTrx]);
  const unpaidBills = useMemo(() => {
    const paidMonthNames = studentTrx.filter(isTrxSettled).map(t => (t.month || '').trim().toLowerCase());
    const dueDateDay = Number(settings?.dueDateDay) || 10;
    const now = new Date();
    return monthlyBills.filter(b => {
      const mLower = b.month.trim().toLowerCase();
      const isPaid = paidMonthNames.some(pm => pm === mLower || pm && mLower.startsWith(pm));
      if (isPaid) return false;
      return isMonthDueOrElapsed(b.month, now, dueDateDay);
    });
  }, [monthlyBills, studentTrx, settings]);
  const upcomingBills = useMemo(() => {
    const paidMonthNames = studentTrx.filter(isTrxSettled).map(t => (t.month || '').trim().toLowerCase());
    const dueDateDay = Number(settings?.dueDateDay) || 10;
    const now = new Date();
    return monthlyBills.filter(b => {
      const mLower = b.month.trim().toLowerCase();
      const isPaid = paidMonthNames.some(pm => pm === mLower || pm && mLower.startsWith(pm));
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
    return studentTrx.filter(isTrxSettled);
  }, [studentTrx]);
  const pendingExpirySnapshot = useMemo(() => {
    const curNow = Date.now();
    const activeMap = new Map();
    const expiredList = [];
    const normMonth = v => String(v || '').trim().toLowerCase();
    const isArrLabel = v => {
      const n = normMonth(v);
      return n.includes('tunggakan') || n.includes('kelas sebelumnya');
    };
    const sorted = [...studentTrx].sort((a, b) => (b.createdAtMs || (typeof b.id === 'number' ? b.id : 0)) - (a.createdAtMs || (typeof a.id === 'number' ? a.id : 0)));
    sorted.forEach(trx => {
      if (!isTrxPendingStatus(trx)) return;
      const trxMonthLower = normMonth(trx.month);
      const trxIsArrears = isArrLabel(trx.month);
      const alreadySettled = allPaidTransactions.some(pt => {
        if (trxIsArrears && isArrLabel(pt.month)) return true;
        const ptMonth = normMonth(pt.month);
        return ptMonth && (ptMonth === trxMonthLower || trxMonthLower.startsWith(ptMonth) || ptMonth.startsWith(trxMonthLower));
      }) || trxIsArrears && Number(student?.arrearsAmount || 0) <= 0;
      if (alreadySettled) return;
      const expMs = computeClientTransactionExpiryMs(trx);
      if (expMs > 0 && curNow >= expMs) {
        expiredList.push({
          ...trx,
          computedExpiresAtMs: expMs
        });
        return;
      }
      const billKey = trxIsArrears ? '__arrears__' : trxMonthLower || trx.orderId || String(trx.id);
      if (!activeMap.has(billKey)) {
        activeMap.set(billKey, {
          ...trx,
          computedExpiresAtMs: expMs
        });
      }
    });
    return {
      active: Array.from(activeMap.values()),
      expired: expiredList
    };
  }, [studentTrx, allPaidTransactions, student?.arrearsAmount, pendingExpiryTick]);
  const activePendingTransactions = pendingExpirySnapshot.active;
  const expiredPendingTransactions = pendingExpirySnapshot.expired;
  const findActivePendingForBill = useCallback((billMonth, isArrears = false) => {
    const targetLower = String(billMonth || '').trim().toLowerCase();
    return activePendingTransactions.find(trx => {
      const trxLower = String(trx.month || '').trim().toLowerCase();
      if (isArrears) {
        return trxLower.includes('tunggakan') || trxLower.includes('kelas sebelumnya');
      }
      return trxLower && (trxLower === targetLower || targetLower.startsWith(trxLower) || trxLower.startsWith(targetLower));
    }) || null;
  }, [activePendingTransactions]);
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
  useEffect(() => {
    if (!onSyncPendingOrder || expiredPendingTransactions.length === 0) return;
    expiredPendingTransactions.forEach(trx => {
      if (trx.orderId && !syncedExpiredOrdersRef.current.has(trx.orderId)) {
        syncedExpiredOrdersRef.current.add(trx.orderId);
        onSyncPendingOrder(trx, {
          manual: false
        });
      }
    });
  }, [expiredPendingTransactions, onSyncPendingOrder]);
  useEffect(() => {
    if (!onSyncPendingOrder || activePendingTransactions.length === 0) return undefined;
    activePendingTransactions.forEach(trx => {
      if (trx.orderId && !trx.vaNumber && !trx.billKey && !trx.paymentCode && !trx.qrCodeUrl && !hydratedPendingOrdersRef.current.has(trx.orderId)) {
        hydratedPendingOrdersRef.current.add(trx.orderId);
        onSyncPendingOrder(trx, {
          manual: false
        });
      }
    });
    const pollTimer = setInterval(() => {
      activePendingTransactions.forEach(trx => {
        if (trx.orderId) {
          onSyncPendingOrder(trx, {
            manual: false
          });
        }
      });
    }, 12000);
    return () => clearInterval(pollTimer);
  }, [activePendingTransactions, onSyncPendingOrder]);
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
    if (!student) return [];
    return complaints.filter(c => c.studentId === student.id || c.studentName === student.name);
  }, [complaints, student]);
  useEffect(() => {
    const now = Date.now();
    let nextExpiry = Infinity;
    myComplaints.forEach(c => {
      const createdTime = c.createdAtMs || (typeof c.id === 'number' ? c.id : c.created_at ? new Date(c.created_at).getTime() : 0);
      const expiresAt = c.expiresAtMs || (createdTime ? createdTime + 3600000 : 0);
      if (expiresAt > now && expiresAt < nextExpiry) {
        nextExpiry = expiresAt;
      }
    });
    if (!Number.isFinite(nextExpiry)) return undefined;
    const delay = Math.max(50, Math.min(nextExpiry - now + 50, 2147483647));
    const timer = setTimeout(() => setExpiryTick(t => t + 1), delay);
    return () => clearTimeout(timer);
  }, [myComplaints, expiryTick]);
  const activeComplaint = useMemo(() => {
    const curNow = Date.now();
    return myComplaints.find(c => {
      const createdTime = c.createdAtMs || (typeof c.id === 'number' ? c.id : c.created_at ? new Date(c.created_at).getTime() : 0);
      const expiresAt = c.expiresAtMs || (createdTime ? createdTime + 3600000 : 0);
      const isExpired = expiresAt ? curNow > expiresAt : false;
      return !isExpired;
    });
  }, [myComplaints, expiryTick]);
  const pastComplaints = useMemo(() => {
    const curNow = Date.now();
    return myComplaints.filter(c => {
      const createdTime = c.createdAtMs || (typeof c.id === 'number' ? c.id : c.created_at ? new Date(c.created_at).getTime() : 0);
      const expiresAt = c.expiresAtMs || (createdTime ? createdTime + 3600000 : 0);
      const isExpired = expiresAt ? curNow > expiresAt : false;
      return isExpired;
    }).sort((a, b) => {
      const timeA = a.createdAtMs || (typeof a.id === 'number' ? a.id : 0);
      const timeB = b.createdAtMs || (typeof b.id === 'number' ? b.id : 0);
      return timeB - timeA;
    });
  }, [myComplaints, expiryTick]);
  const myNotes = useMemo(() => {
    if (!student) return [];
    return notes.filter(n => n.studentId === student.id || n.studentName === student.name).sort((a, b) => new Date(b.created_at || Date.now()) - new Date(a.created_at || Date.now()));
  }, [notes, student]);
  const unreadNotesCount = useMemo(() => {
    return myNotes.filter(n => !readNotes.includes(n.id)).length;
  }, [myNotes, readNotes]);
  const unreadComplaintsCount = useMemo(() => {
    return myComplaints.filter(c => {
      const msgs = c.messages || [];
      const hasAdminReply = msgs.some(m => m.sender === 'Admin TU' || m.sender?.toLowerCase().includes('admin') || m.sender?.toLowerCase().includes('tu')) || !!c.adminReply;
      return msgs.length > 0 ? (readComplaintMsgs[c.id] || 0) < msgs.length : hasAdminReply && !readComplaintMsgs[c.id];
    }).length;
  }, [myComplaints, readComplaintMsgs]);
  const unreadAnnCount = useMemo(() => {
    return announcements.filter(a => !readAnnouncements.includes(a.id)).length;
  }, [announcements, readAnnouncements]);
  const totalParentUnread = unreadAnnCount + unreadNotesCount + unreadComplaintsCount;
  const parentNotificationItems = useMemo(() => {
    const items = [];
    myComplaints.forEach(c => {
      const msgs = c.messages || [];
      const adminMsgs = msgs.filter(m => m.sender === 'Admin TU' || m.sender?.toLowerCase().includes('admin') || m.sender?.toLowerCase().includes('tu'));
      const hasAdminReply = adminMsgs.length > 0 || !!c.adminReply;
      const isUnread = msgs.length > 0 ? (readComplaintMsgs[c.id] || 0) < msgs.length : hasAdminReply && !readComplaintMsgs[c.id];
      if (hasAdminReply || isUnread) {
        const lastAdminMsg = adminMsgs[adminMsgs.length - 1];
        const snippet = lastAdminMsg ? lastAdminMsg.text : c.adminReply || msgs[msgs.length - 1]?.text || 'Tanggapan baru dari Admin TU';
        const time = formatDateTimeIndo(lastAdminMsg?.time, c.date);
        items.push({
          id: 'complaint_' + c.id,
          category: 'chat',
          title: `Balasan Chat TU: ${c.title || 'Pengaduan'}`,
          snippet: snippet,
          time: time,
          isUnread: isUnread,
          timestamp: c.createdAtMs || (typeof c.id === 'number' ? c.id : c.created_at ? new Date(c.created_at).getTime() : 0),
          onClick: () => {
            const nextCount = msgs.length > 0 ? msgs.length : 1;
            const updated = {
              ...readComplaintMsgs,
              [c.id]: nextCount
            };
            setReadComplaintMsgs(updated);
            writeJsonLsCached('read_complaint_msgs_' + (student ? student.id : 'guest'), updated);
            setShowParentBell(false);
            setActiveTab('pengaduan');
          }
        });
      }
    });
    myNotes.forEach(n => {
      const isUnread = !readNotes.includes(n.id);
      items.push({
        id: 'note_' + n.id,
        category: 'note',
        title: `Catatan TU: ${n.title || 'Catatan Baru'}`,
        snippet: n.content || 'Catatan penting perkembangan siswa dari TU',
        time: formatDateTimeIndo(n.date || ''),
        isUnread: isUnread,
        timestamp: n.created_at ? new Date(n.created_at).getTime() : typeof n.id === 'number' ? n.id : 0,
        onClick: () => {
          if (!readNotes.includes(n.id)) {
            const next = [...readNotes, n.id];
            setReadNotes(next);
            writeJsonLsCached('read_notes_' + (student ? student.id : 'guest'), next);
          }
          setShowParentBell(false);
          setActiveTab('evaluasi');
        }
      });
    });
    announcements.forEach(a => {
      const isUnread = !readAnnouncements.includes(a.id);
      items.push({
        id: 'ann_' + a.id,
        category: 'announcement',
        title: `Pengumuman: ${a.title}`,
        snippet: a.content || 'Klik untuk membuka rincian pengumuman',
        time: formatDateIndo(a.date || ''),
        isUnread: isUnread,
        timestamp: a.created_at ? new Date(a.created_at).getTime() : typeof a.id === 'number' ? a.id : 0,
        onClick: () => {
          if (!readAnnouncements.includes(a.id)) {
            const next = [...readAnnouncements, a.id];
            setReadAnnouncements(next);
            writeJsonLsCached('read_announcements_' + (student ? student.id : 'guest'), next);
          }
          setShowParentBell(false);
          setActiveTab('berita');
        }
      });
    });
    return items.sort((a, b) => {
      if (a.isUnread && !b.isUnread) return -1;
      if (!a.isUnread && b.isUnread) return 1;
      return (b.timestamp || 0) - (a.timestamp || 0);
    });
  }, [myComplaints, myNotes, announcements, readComplaintMsgs, readNotes, readAnnouncements, student]);
  useEffect(() => {
    if (activeTab === 'pengaduan' && myComplaints.length > 0) {
      const updated = {
        ...readComplaintMsgs
      };
      let changed = false;
      myComplaints.forEach(c => {
        const msgs = c.messages || [];
        const nextCount = msgs.length > 0 ? msgs.length : c.adminReply ? 1 : 0;
        if (nextCount > 0 && (readComplaintMsgs[c.id] || 0) < nextCount) {
          updated[c.id] = nextCount;
          changed = true;
        }
      });
      if (changed) {
        setReadComplaintMsgs(updated);
        writeJsonLsCached('read_complaint_msgs_' + (student ? student.id : 'guest'), updated);
      }
    } else if (activeTab === 'evaluasi' && myNotes.length > 0) {
      const unreadIds = myNotes.filter(n => !readNotes.includes(n.id)).map(n => n.id);
      if (unreadIds.length > 0) {
        const next = [...readNotes, ...unreadIds];
        setReadNotes(next);
        writeJsonLsCached('read_notes_' + (student ? student.id : 'guest'), next);
      }
    } else if (activeTab === 'berita' && announcements.length > 0) {
      const unreadIds = announcements.filter(a => !readAnnouncements.includes(a.id)).map(a => a.id);
      if (unreadIds.length > 0) {
        const next = [...new Set([...readAnnouncements, ...unreadIds])];
        setReadAnnouncements(next);
        writeJsonLsCached('read_announcements_' + (student ? student.id : 'guest'), next);
      }
    }
  }, [activeTab, myComplaints, myNotes, announcements]);
  const getWaLink = numStr => {
    if (!numStr) return '#';
    let clean = numStr.replace(/[^0-9]/g, '');
    if (clean.startsWith('0')) clean = '62' + clean.slice(1);else if (clean.startsWith('8')) clean = '62' + clean;
    return `https://wa.me/${clean}`;
  };
  const formatPhoneDisplay = val => {
    if (!val) return '-';
    let cleaned = val.replace(/[^0-9]/g, '');
    if (cleaned.length > 8) {
      return cleaned.replace(/(\d{4})(\d{4})(\d+)/, '$1-$2-$3');
    }
    return cleaned;
  };
  if (!student) {
    return <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
            <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-xl text-center space-y-4 max-w-sm">
              <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center mx-auto animate-spin">
                <Icon name="refresh-cw" size={24} />
              </div>
              <p className="font-extrabold text-slate-800 text-base">Memuat Data Wali Murid...</p>
            </div>
          </div>;
  }
  return <div className="min-h-screen bg-slate-100 flex flex-col w-full text-slate-800">
          {previewImage && <ImagePreviewModal imageUrl={previewImage.url} title={previewImage.title} onClose={() => setPreviewImage(null)} />}

          {selectedAnnouncement && <ModalPortal><div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/75 backdrop-blur-sm p-4 overflow-y-auto animate-in fade-in" onClick={e => {
            if (e.target === e.currentTarget) setSelectedAnnouncement(null);
          }}>
              <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl relative my-auto animate-in zoom-in-95 duration-200">
                <button onClick={() => setSelectedAnnouncement(null)} className="absolute top-4 right-4 p-2 bg-slate-100 hover:bg-rose-100 text-slate-500 hover:text-rose-600 rounded-xl transition-colors z-10 shadow-sm">
                  <Icon name="x" size={24} />
                </button>
                {selectedAnnouncement.imageUrl && <div className="w-full h-56 sm:h-72 bg-slate-100 relative shrink-0">
                    <img src={selectedAnnouncement.imageUrl} alt={selectedAnnouncement.title} loading="lazy" decoding="async" className="w-full h-full object-cover" />
                  </div>}
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
            </div></ModalPortal>}

          
          {showParentClassHistory && (() => {
      const existingHist = Array.isArray(student?.classHistory) ? student.classHistory : [];
      const hasInitial = existingHist.some(h => {
        const t = (h.type || '').toLowerCase();
        return t.includes('pendaftaran') || t.includes('awal');
      });
      const initialRecord = {
        id: 'parent_init_entry',
        type: 'Pendaftaran Awal',
        date: student?.createdAt ? new Date(student.createdAt).toLocaleDateString('id-ID', {
          day: 'numeric',
          month: 'long',
          year: 'numeric'
        }) : 'Awal Masuk',
        transferDate: student?.createdAt || '',
        fromClass: '-',
        toClass: existingHist.length > 0 ? existingHist[0].fromClass || student.kelas : student.kelas,
        effectiveMonth: student?.startActiveMonth || settings.startMonth || 'Januari',
        effectiveYear: student?.startActiveYear || settings.startYear || 2026,
        newTarif: student?.tarif,
        carriedOverArrears: 0,
        note: 'Pendaftaran pertama ananda di PAUD Setia Bhakti'
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
      return <ModalPortal><div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-6 overflow-y-auto animate-in fade-in">
                <div className="fixed inset-0 bg-slate-950/75 backdrop-blur-sm" onClick={() => setShowParentClassHistory(false)} />
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
                    <button type="button" onClick={() => setShowParentClassHistory(false)} className="p-2 text-slate-400 hover:text-slate-600 font-black rounded-xl hover:bg-slate-100 transition-colors">
                      <Icon name="x" size={20} />
                    </button>
                  </div>

                  <div className="flex-1 overflow-y-auto space-y-3.5 text-xs pr-1">
                    
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
                      return <tr key={h.id || idx} className="hover:bg-slate-50 transition-colors">
                                  <td className="py-3 px-3 text-center font-bold text-slate-400 text-[11px]">{idx + 1}</td>
                                  <td className="py-3 px-3 whitespace-nowrap font-bold text-slate-800">{formatMutationDate(h)}</td>
                                  <td className="py-3 px-3 whitespace-nowrap">
                                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black ${isPendaftaran ? 'bg-emerald-100 text-emerald-800' : 'bg-indigo-100 text-indigo-800'}`}>
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
                                </tr>;
                    })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-100 flex justify-end">
                    <button type="button" onClick={() => setShowParentClassHistory(false)} className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-colors">
                      Tutup
                    </button>
                  </div>
                </div>
              </div></ModalPortal>;
    })()}

          
          {showParentBell && <ModalPortal><div className="fixed inset-0 z-[9999] pointer-events-auto">
              
              <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-[2px] z-[9999]" onClick={() => setShowParentBell(false)} />
              
              <div className="fixed inset-x-3 sm:inset-x-auto sm:right-8 top-[72px] sm:top-20 z-[10000] w-auto max-w-sm sm:w-96 mx-auto sm:mx-0 bg-white rounded-3xl shadow-2xl border border-slate-200 text-slate-800 p-4 space-y-3 animate-in slide-in-from-top-2 duration-200 max-h-[82vh] overflow-y-auto">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <div className="flex items-center gap-2">
                    <h4 className="font-extrabold text-xs uppercase text-slate-700">Notifikasi Sekolah</h4>
                    {totalParentUnread > 0 && <span className="px-2 py-0.5 bg-rose-100 text-rose-700 text-[10px] font-black rounded-full">
                        {totalParentUnread} Baru
                      </span>}
                  </div>
                  <div className="flex items-center gap-2">
                    {totalParentUnread > 0 && <button type="button" onClick={() => {
              const newAnnIds = [...new Set([...readAnnouncements, ...announcements.map(a => a.id)])];
              setReadAnnouncements(newAnnIds);
              writeJsonLsCached('read_announcements_' + (student ? student.id : 'guest'), newAnnIds);
              const newNoteIds = [...new Set([...readNotes, ...myNotes.map(n => n.id)])];
              setReadNotes(newNoteIds);
              writeJsonLsCached('read_notes_' + (student ? student.id : 'guest'), newNoteIds);
              const updatedMsgs = {
                ...readComplaintMsgs
              };
              myComplaints.forEach(c => {
                const count = c.messages && c.messages.length > 0 ? c.messages.length : 1;
                updatedMsgs[c.id] = count;
              });
              setReadComplaintMsgs(updatedMsgs);
              writeJsonLsCached('read_complaint_msgs_' + (student ? student.id : 'guest'), updatedMsgs);
            }} className="text-[10px] font-bold text-blue-600 hover:text-blue-800 hover:underline">
                        Tandai Dibaca
                      </button>}
                    <button onClick={() => setShowParentBell(false)} className="text-slate-400 hover:text-slate-600 text-xs font-bold">Tutup</button>
                  </div>
                </div>

                <div className="space-y-2 max-h-80 overflow-y-auto text-xs">
                  {parentNotificationItems.length === 0 ? <div className="text-center py-6 text-slate-400 font-medium">
                      <Icon name="bell-off" size={26} className="mx-auto mb-1.5 text-slate-300" />
                      Tidak ada notifikasi baru saat ini.
                    </div> : parentNotificationItems.slice(0, 8).map(item => <div key={item.id} onClick={item.onClick} className={`p-3 rounded-2xl border cursor-pointer transition-all hover:scale-[0.99] ${item.isUnread ? item.category === 'chat' ? 'bg-amber-50/90 border-amber-300 font-extrabold text-amber-950 shadow-xs' : item.category === 'note' ? 'bg-purple-50/90 border-purple-200 font-extrabold text-purple-950 shadow-xs' : 'bg-blue-50/90 border-blue-200 font-extrabold text-blue-950 shadow-xs' : 'bg-slate-50/80 border-slate-200 text-slate-600'}`}>
                        <div className="flex justify-between items-center mb-1 gap-2">
                          <div className="flex items-center gap-1.5 min-w-0 flex-1">
                            <Icon name={item.category === 'chat' ? 'message-circle' : item.category === 'note' ? 'file-text' : 'megaphone'} size={13} className={`shrink-0 ${item.isUnread ? item.category === 'chat' ? 'text-amber-600' : item.category === 'note' ? 'text-purple-600' : 'text-blue-600' : 'text-slate-400'}`} />
                            <span className="font-extrabold text-[12px] truncate">{item.title}</span>
                          </div>
                          {item.isUnread ? <span className={`px-1.5 py-0.5 rounded text-[9px] font-black shrink-0 ${item.category === 'chat' ? 'bg-amber-500 text-white' : item.category === 'note' ? 'bg-purple-600 text-white' : 'bg-blue-600 text-white'}`}>
                              {item.category === 'chat' ? 'Balasan Baru' : 'Baru'}
                            </span> : <span className="text-[10px] text-slate-400 font-semibold shrink-0">Dibaca</span>}
                        </div>
                        <p className="text-[11px] text-slate-600 font-normal line-clamp-1">{item.snippet}</p>
                        {item.time && <span className="text-[9px] text-slate-400 mt-1 block font-medium">{item.time}</span>}
                      </div>)}
                </div>
              </div>
            </div></ModalPortal>}

          
          <div className="md:hidden sticky top-0 z-40 bg-gradient-to-r from-[#072a6b] via-[#0d3b8f] to-[#1554c2] px-4 sm:px-6 py-3.5 border-b border-cyan-400/30 shadow-xl shadow-blue-950/20 flex items-center justify-between min-h-[66px] text-white">
            <div className="flex items-center gap-3.5 min-w-0">
              <div onClick={() => student.fotoUrl && setPreviewImage({
          url: student.fotoUrl,
          title: `Foto Profil - ${student.name}`
        })} className="w-11 h-11 rounded-2xl bg-gradient-to-br from-cyan-400 via-blue-600 to-indigo-700 p-0.5 shadow-lg shadow-blue-950/50 overflow-hidden shrink-0 flex items-center justify-center cursor-pointer ring-2 ring-cyan-400/30">
                {student.fotoUrl ? <img src={student.fotoUrl} alt={student.name} loading="lazy" decoding="async" className="w-full h-full object-cover rounded-[14px]" /> : <img src="logo.webp" alt="PAUD Setia Bhakti" loading="lazy" decoding="async" className="w-8 h-8 object-contain filter drop-shadow" />}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <h1 className="text-base font-black text-white truncate tracking-tight">{settings.schoolName || 'PAUD SETIA BHAKTI'}</h1>
                </div>
                <div className="flex items-center gap-1.5 text-xs font-extrabold text-cyan-300 truncate mt-0.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                  <span className="truncate">Wali • {student.name}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              
              <button type="button" onClick={() => onRefresh(true)} disabled={isRefreshing} className="relative w-11 h-11 rounded-2xl bg-white/10 hover:bg-white/20 active:scale-95 text-white flex items-center justify-center transition-all border border-white/15 focus:outline-none ring-1 ring-white/10 shrink-0" aria-label="Sinkronisasi Data" title="Sinkronisasi Data">
                <Icon name="refresh-cw" size={18} className={isRefreshing ? 'animate-spin text-cyan-300' : 'text-white'} />
              </button>

              
              <button type="button" onClick={() => {
          setShowParentBell(!showParentBell);
          setIsMobileMenuOpen(false);
        }} className="relative w-11 h-11 rounded-2xl bg-white/10 hover:bg-white/20 active:scale-95 text-white flex items-center justify-center transition-all border border-white/15 focus:outline-none ring-1 ring-white/10 shrink-0" aria-label="Lihat Notifikasi" title="Notifikasi">
                <Icon name="bell" size={19} />
                {totalParentUnread > 0 && <span className="absolute -top-1 -right-1 w-5 h-5 bg-rose-500 text-white rounded-full text-[10px] font-black flex items-center justify-center ring-2 ring-white shadow-md">
                    {totalParentUnread > 9 ? '9+' : totalParentUnread}
                  </span>}
              </button>

              
              <button type="button" onClick={() => {
          setIsMobileMenuOpen(!isMobileMenuOpen);
          setShowParentBell(false);
        }} className="relative w-11 h-11 rounded-2xl bg-white/10 hover:bg-white/20 active:scale-95 text-white flex flex-col items-center justify-center gap-[4.5px] p-2.5 transition-all shadow-lg border border-white/15 focus:outline-none ring-1 ring-white/10 shrink-0" aria-label="Buka Menu" title="Menu Navigasi">
                <span className={`h-[2.5px] bg-white rounded-full transition-all duration-300 ${isMobileMenuOpen ? 'w-5 rotate-45 translate-y-[7px]' : 'w-5'}`}></span>
                <span className={`h-[2.5px] bg-white rounded-full transition-all duration-300 ${isMobileMenuOpen ? 'opacity-0 w-0' : 'w-4 self-start ml-0.5'}`}></span>
                <span className={`h-[2.5px] bg-white rounded-full transition-all duration-300 ${isMobileMenuOpen ? 'w-5 -rotate-45 -translate-y-[7px]' : 'w-5'}`}></span>
              </button>
            </div>
          </div>

          
          {isMobileMenuOpen && <ModalPortal><div className="md:hidden fixed inset-0 z-[9999] overflow-hidden animate-in fade-in duration-200">
              <div className="absolute inset-0 bg-slate-950/75 backdrop-blur-sm transition-opacity" onClick={() => setIsMobileMenuOpen(false)}></div>

              <div className="absolute top-0 right-0 bottom-0 w-[88%] sm:w-[380px] max-w-[430px] h-[100dvh] smurf-mobile-drawer text-white flex flex-col shadow-2xl z-10 overflow-hidden animate-in slide-in-from-right duration-300">
                <div className="flex-1 min-h-0 overflow-y-auto flex flex-col justify-between relative z-10">
                <div className="p-4 sm:p-5 relative z-10">
                  
                  <div className="flex items-center justify-between pb-3.5 border-b border-white/10 mb-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-slate-900 border border-white/15 flex items-center justify-center p-1.5 shadow-md shrink-0">
                        <img src="logo.webp" alt="PAUD Setia Bhakti" loading="lazy" decoding="async" className="w-full h-full object-contain" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h2 className="text-sm font-black text-white leading-tight truncate">{settings.schoolName || 'PAUD SETIA BHAKTI'}</h2>
                        <span className="text-[11px] font-bold text-cyan-400 uppercase tracking-wider block truncate">Portal Resmi Wali Murid</span>
                      </div>
                    </div>
                    <button type="button" onClick={() => setIsMobileMenuOpen(false)} className="w-9 h-9 rounded-xl bg-white/5 hover:bg-white/15 text-slate-300 hover:text-white flex items-center justify-center transition-colors border border-white/10 active:scale-95 shrink-0">
                      <Icon name="x" size={18} />
                    </button>
                  </div>

                  
                  <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-white/10 flex items-center gap-3 mb-4 shadow-lg shadow-black/30">
                    <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white font-black text-lg border border-white/20 overflow-hidden shrink-0 shadow-md">
                      {student.fotoUrl ? <img src={student.fotoUrl} alt={student.name} loading="lazy" decoding="async" className="w-full h-full object-cover" /> : student.name ? student.name.charAt(0) : 'S'}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-black text-white truncate capitalize">{student.name}</p>
                      <p className="text-xs text-slate-400 font-bold truncate mt-0.5">Kelas {student.kelas} • NIS {student.nis}</p>
                    </div>
                  </div>

                  
                  <div className="space-y-1.5">
                    {[{
              id: 'dashboard',
              label: 'Dashboard Utama',
              icon: 'home',
              badge: 0
            }, {
              id: 'spp',
              label: 'Tagihan SPP',
              icon: 'credit-card',
              badge: unpaidBills.length,
              badgeType: 'danger'
            }, {
              id: 'berita',
              label: 'Berita & Pengumuman',
              icon: 'newspaper',
              badge: unreadAnnCount,
              badgeType: 'info'
            }, {
              id: 'evaluasi',
              label: 'Catatan Siswa (TU)',
              icon: 'file-text',
              badge: unreadNotesCount,
              badgeType: 'info'
            }, {
              id: 'pengaduan',
              label: 'Layanan Pengaduan',
              icon: 'message-square',
              badge: unreadComplaintsCount,
              badgeType: 'danger'
            }, {
              id: 'pengaturan',
              label: 'Pengaturan Akun',
              icon: 'settings',
              badge: 0
            }].map(item => <div key={item.id} className="w-full">
                        <button type="button" onClick={() => {
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
              }} className={`w-full min-h-[44px] py-2.5 px-3.5 rounded-xl flex items-center justify-between text-xs sm:text-sm font-extrabold transition-all duration-200 active:scale-[0.99] ${activeTab === item.id ? 'smurf-nav-active' : 'smurf-nav-item'}`}>
                          <div className="flex items-center gap-3 min-w-0 flex-1 truncate">
                            <Icon name={item.icon} size={18} className="shrink-0" />
                            <span className="truncate capitalize">{item.label}</span>
                          </div>
                          <div className="flex items-center gap-2 shrink-0 ml-2">
                            {item.badge > 0 && <span className="px-2 py-0.5 rounded-full text-[11px] font-black bg-rose-500 text-white shadow-md shrink-0">
                                {item.badge}
                              </span>}
                            {item.id === 'spp' && <Icon name="chevron-down" size={16} className={`transition-transform duration-200 shrink-0 ${activeTab === 'spp' && isSppExpanded ? 'rotate-180' : ''}`} />}
                          </div>
                        </button>

                        
                        {item.id === 'spp' && activeTab === 'spp' && isSppExpanded && <div className="border-l-2 border-slate-800 ml-4 pl-3 mt-1.5 space-y-1">
                            {[{
                  id: 'all',
                  label: 'Semua Ringkasan',
                  icon: 'layers'
                }, {
                  id: 'pending',
                  label: 'Pending',
                  icon: 'clock',
                  badge: activePendingTransactions.length,
                  type: 'warning'
                }, {
                  id: 'unpaid',
                  label: 'Tagihan Menunggak',
                  icon: 'alert-circle',
                  badge: unpaidBills.length,
                  type: 'danger'
                }, {
                  id: 'upcoming',
                  label: 'Belum Jatuh Tempo',
                  icon: 'calendar',
                  badge: upcomingBills.length,
                  type: 'warning'
                }, {
                  id: 'paid',
                  label: 'Riwayat Lunas',
                  icon: 'check-circle-2',
                  badge: paidBills.length,
                  type: 'success'
                }].map(sub => <button key={sub.id} type="button" onClick={() => {
                  setSppSubFilter(sub.id);
                  setIsMobileMenuOpen(false);
                }} className={`w-full min-h-[40px] py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-between transition-all active:scale-[0.99] ${sppSubFilter === sub.id ? 'bg-white/15 text-white font-black border border-white/15 shadow-xs' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>
                                <div className="flex items-center gap-2.5 min-w-0 flex-1 truncate">
                                  <Icon name={sub.icon} size={15} className="shrink-0" />
                                  <span className="truncate capitalize">{sub.label}</span>
                                </div>
                                {sub.badge > 0 && <span className={`px-2 py-0.5 rounded-full text-[10px] font-black shrink-0 ${sub.type === 'danger' ? 'bg-rose-500 text-white' : sub.type === 'warning' ? 'bg-amber-400 text-slate-900' : 'bg-emerald-500 text-white'}`}>
                                    {sub.badge}
                                  </span>}
                              </button>)}
                          </div>}
                      </div>)}
                  </div>
                </div>

                
                <div className="mt-auto relative z-10">
                  <SidebarBottomOrnament roleLabel="Portal Wali Murid" />
                </div>
                </div>

                
                <div className="shrink-0 bg-slate-950/95 border-t border-white/10 p-4 space-y-2 relative z-10">
                  <button type="button" onClick={() => {
            onRefresh(true);
            setIsMobileMenuOpen(false);
          }} className="w-full min-h-[42px] py-2.5 px-3.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-white/10 text-white text-xs font-bold flex items-center justify-center gap-2 active:scale-95 transition-all shadow-sm">
                    <Icon name="refresh-cw" size={15} className={`shrink-0 ${isRefreshing ? 'animate-spin text-blue-400' : ''}`} />
                    <span className="truncate">Sinkronisasi Data Baru</span>
                  </button>

                  <button type="button" onClick={() => {
            setIsMobileMenuOpen(false);
            onLogout();
          }} className="w-full min-h-[42px] py-2.5 px-3.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/20 text-xs font-bold flex items-center justify-center gap-2 active:scale-95 transition-all shadow-sm">
                    <Icon name="log-out" size={15} className="shrink-0" />
                    <span className="truncate">Keluar Akun Wali Murid</span>
                  </button>
                </div>
              </div>
            </div></ModalPortal>}

          
          <div className="w-full flex-1 bg-aesthetic-pattern flex flex-col md:flex-row min-h-screen mobile-full-height relative">
            <aside className="w-full md:w-72 lg:w-80 royal-blue-sidebar shrink-0 flex flex-col justify-between p-0 relative z-20 overflow-x-hidden md:sticky md:top-0 md:h-screen md:self-start md:overflow-y-auto no-scrollbar hide-on-mobile-nav">

              <div className="relative z-10">
                
                <div className="p-4 sm:p-5 m-3 sm:m-4 mb-2 bg-white/15 rounded-2xl border border-white/20 flex items-center gap-3.5 shadow-lg shadow-blue-950/20">
                  <div onClick={() => student.fotoUrl && setPreviewImage({
              url: student.fotoUrl,
              title: `Foto Profil - ${student.name}`
            })} className="w-12 h-12 bg-white/25 rounded-xl flex items-center justify-center text-white border border-white/30 overflow-hidden shrink-0 shadow-md cursor-pointer hover:scale-105 transition-transform">
                    {student.fotoUrl ? <img src={student.fotoUrl} alt={student.name} loading="lazy" decoding="async" className="w-full h-full object-cover" /> : <img src="logo.webp" alt="PAUD Setia Bhakti" loading="lazy" decoding="async" className="w-9 h-9 object-contain filter drop-shadow" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h1 className="font-black text-sm sm:text-base leading-tight text-white tracking-tight truncate">{settings.schoolName || 'PAUD SETIA BHAKTI'}</h1>
                    <div className="inline-flex items-center gap-1.5 mt-1 px-2 py-0.5 rounded-full bg-cyan-400/20 border border-cyan-400/30">
                      <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                      <span className="text-[10px] font-black text-cyan-200 uppercase tracking-wider">Wali Murid</span>
                    </div>
                  </div>
                </div>

                
                <nav className="px-3 sm:px-4 py-2 sm:py-3 flex md:flex-col gap-1.5 font-extrabold text-sm relative overflow-y-auto overflow-x-hidden no-scrollbar">

                  
                  <button onClick={() => setActiveTab('dashboard')} className={`py-3.5 px-4 flex items-center justify-between transition-all duration-200 text-xs sm:text-[13.5px] whitespace-nowrap shrink-0 rounded-2xl ${activeTab === 'dashboard' ? 'smurf-nav-active' : 'smurf-nav-item font-bold'}`}>
                    <div className="flex items-center gap-3 truncate">
                      <Icon name="home" size={18} />
                      <span className="truncate">Dashboard Utama</span>
                    </div>
                  </button>

                  
                  <div className="w-full">
                    <button onClick={() => {
                if (activeTab !== 'spp') {
                  setActiveTab('spp');
                  setIsSppExpanded(true);
                } else {
                  setIsSppExpanded(!isSppExpanded);
                }
              }} className={`w-full py-3.5 px-4 flex items-center justify-between transition-all duration-200 text-xs sm:text-[13.5px] whitespace-nowrap shrink-0 rounded-2xl ${activeTab === 'spp' ? 'smurf-nav-active' : 'smurf-nav-item font-bold'}`}>
                      <div className="flex items-center gap-3 truncate">
                        <Icon name="credit-card" size={18} />
                        <span className="truncate">Tagihan SPP</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {unpaidBills.length > 0 && <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${activeTab === 'spp' ? 'bg-rose-100 text-rose-700' : 'badge-danger-active ring-1 ring-rose-300'}`}>
                            {unpaidBills.length}
                          </span>}
                        <Icon name="chevron-down" size={15} className={`transition-transform duration-200 ${activeTab === 'spp' && isSppExpanded ? 'rotate-180' : ''}`} />
                      </div>
                    </button>

                    
                    {activeTab === 'spp' && isSppExpanded && <div className="mt-1 ml-2 space-y-0.5 py-1">
                        {[{
                  id: 'all',
                  label: 'Semua Ringkasan',
                  icon: 'layers'
                }, {
                  id: 'pending',
                  label: 'Pending',
                  icon: 'clock',
                  badge: activePendingTransactions.length,
                  type: 'warning'
                }, {
                  id: 'unpaid',
                  label: 'Tagihan Menunggak',
                  icon: 'alert-circle',
                  badge: unpaidBills.length,
                  type: 'danger'
                }, {
                  id: 'upcoming',
                  label: 'Belum Jatuh Tempo',
                  icon: 'calendar',
                  badge: upcomingBills.length,
                  type: 'warning'
                }, {
                  id: 'paid',
                  label: 'Riwayat Lunas',
                  icon: 'check-circle-2',
                  badge: paidBills.length,
                  type: 'success'
                }].map(sub => <button key={sub.id} onClick={() => setSppSubFilter(sub.id)} className={`w-full px-4 py-2.5 rounded-xl text-xs font-bold flex items-center justify-between transition-all ${sppSubFilter === sub.id ? 'bg-white/20 text-white font-black border border-white/25 shadow-sm' : 'text-white/75 hover:text-white hover:bg-white/10'}`}>
                            <div className="flex items-center gap-2 truncate">
                              <Icon name={sub.icon} size={14} />
                              <span className="truncate">{sub.label}</span>
                            </div>
                            {sub.badge !== undefined && sub.badge !== null && <span className={`px-2 py-0.5 rounded-full text-[10px] font-black transition-all ${sub.badge === 0 ? 'badge-zero-muted' : sub.type === 'danger' ? 'badge-danger-active ring-1 ring-rose-300' : sub.type === 'warning' ? 'badge-warning-active' : 'badge-success-active'}`}>
                                {sub.badge}
                              </span>}
                          </button>)}
                      </div>}
                  </div>

                  
                  <button onClick={() => setActiveTab('berita')} className={`py-3.5 px-4 flex items-center justify-between transition-all duration-200 text-xs sm:text-[13.5px] whitespace-nowrap shrink-0 rounded-2xl ${activeTab === 'berita' ? 'smurf-nav-active' : 'smurf-nav-item font-bold'}`}>
                    <div className="flex items-center gap-3 truncate">
                      <Icon name="newspaper" size={18} />
                      <span className="truncate">Pengumuman</span>
                    </div>
                    {unreadAnnCount > 0 ? <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${activeTab === 'berita' ? 'bg-cyan-100 text-cyan-800' : 'badge-cyan-active'}`}>
                        {unreadAnnCount}
                      </span> : null}
                  </button>

                  
                  <button onClick={() => setActiveTab('evaluasi')} className={`py-3.5 px-4 flex items-center justify-between transition-all duration-200 text-xs sm:text-[13.5px] whitespace-nowrap shrink-0 rounded-2xl ${activeTab === 'evaluasi' ? 'smurf-nav-active' : 'smurf-nav-item font-bold'}`}>
                    <div className="flex items-center gap-3 truncate">
                      <Icon name="file-text" size={18} />
                      <span className="truncate">Catatan TU</span>
                    </div>
                    {unreadNotesCount > 0 ? <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${activeTab === 'evaluasi' ? 'bg-purple-100 text-purple-800' : 'badge-purple-active'}`}>
                        {unreadNotesCount}
                      </span> : null}
                  </button>

                  
                  <button onClick={() => setActiveTab('pengaduan')} className={`py-3.5 px-4 flex items-center justify-between transition-all duration-200 text-xs sm:text-[13.5px] whitespace-nowrap shrink-0 rounded-2xl ${activeTab === 'pengaduan' ? 'smurf-nav-active' : 'smurf-nav-item font-bold'}`}>
                    <div className="flex items-center gap-3 truncate">
                      <Icon name="message-square" size={18} />
                      <span className="truncate">Pengaduan</span>
                    </div>
                    {unreadComplaintsCount > 0 ? <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${activeTab === 'pengaduan' ? 'bg-orange-100 text-orange-800' : 'badge-orange-active'}`}>
                        {unreadComplaintsCount}
                      </span> : null}
                  </button>

                  
                  <button onClick={() => setActiveTab('pengaturan')} className={`py-3.5 px-4 flex items-center justify-between transition-all duration-200 text-xs sm:text-[13.5px] whitespace-nowrap shrink-0 rounded-2xl ${activeTab === 'pengaturan' ? 'smurf-nav-active' : 'smurf-nav-item font-bold'}`}>
                    <div className="flex items-center gap-3 truncate">
                      <Icon name="settings" size={18} />
                      <span className="truncate">Pengaturan</span>
                    </div>
                  </button>
                </nav>
              </div>

              
              <div className="mt-auto relative z-10 hidden md:block">
                <SidebarBottomOrnament roleLabel="Portal Wali Murid" />
                <div className="p-3 sm:p-3.5 m-3 sm:m-4 mt-1 bg-white/15 rounded-2xl border border-white/20 text-white relative z-10 shadow-lg shadow-blue-950/20">
                  <div className="flex items-center justify-between gap-2.5">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="relative shrink-0">
                        <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center font-black text-sm text-white overflow-hidden border border-white/25">
                          {student.fotoUrl ? <img src={student.fotoUrl} alt={student.name} loading="lazy" decoding="async" className="w-full h-full object-cover" /> : student.name ? student.name.charAt(0) : 'S'}
                        </div>
                        <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-400 ring-2 ring-slate-900"></span>
                      </div>
                      <div className="truncate flex-1">
                        <p className="text-sm font-black text-white truncate">{student.name}</p>
                        <p className="text-xs text-blue-100/80 font-semibold truncate">Kelas {student.kelas} • NIS {student.nis}</p>
                      </div>
                    </div>
                    <button onClick={onLogout} title="Keluar Akun" className="p-2 rounded-xl bg-white/10 hover:bg-rose-500/80 text-white/90 hover:text-white transition-all shadow-sm shrink-0">
                      <Icon name="log-out" size={16} />
                    </button>
                  </div>
                </div>
              </div>
            </aside>

            
            <main className="flex-1 flex flex-col min-w-0 min-h-0 mobile-nav-spacer relative">
              <PanelAestheticBg />
              
              <header className="px-4 sm:px-6 md:px-10 pt-4 sm:pt-7 pb-3.5 sm:pb-5 border-b border-slate-200/80 flex flex-col gap-3.5 sm:gap-4 bg-white relative z-20 md:sticky md:top-0 shadow-xs">
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
                      {activeTab === 'spp' && (unpaidBills.length > 0 ? <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-rose-50 text-rose-700 border border-rose-200">
                            <Icon name="alert-circle" size={13} className="text-rose-600" />
                            <span>{unpaidBills.length} Bulan Tertunggak</span>
                          </span> : <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <Icon name="shield-check" size={14} className="text-emerald-600" />
                            <span>Status Lunas / Aman</span>
                          </span>)}
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

                  
                  <div className="hidden md:flex items-center gap-2.5 sm:gap-3 shrink-0">
                    <button onClick={() => onRefresh(true)} title="Sinkronisasi Data" className="px-3.5 py-2 sm:px-4 sm:py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2">
                      <Icon name="refresh-cw" size={17} className={isRefreshing ? 'animate-spin text-blue-600' : ''} />
                      <span className="hidden sm:inline">Sinkronisasi</span>
                    </button>

                    <div className="relative">
                      
                      <button type="button" onClick={() => setShowParentBell(!showParentBell)} className="flex p-2.5 bg-slate-100 hover:bg-slate-200 rounded-xl text-slate-700 relative transition-colors items-center justify-center" title="Notifikasi">
                        <Icon name="bell" size={18} />
                        {totalParentUnread > 0 && <span className="absolute -top-1 -right-1 w-5 h-5 bg-rose-500 text-white rounded-full text-[10px] font-extrabold flex items-center justify-center">
                            {totalParentUnread}
                          </span>}
                      </button>
                    </div>

                    <button onClick={onLogout} title="Keluar" className="px-3.5 py-2 sm:px-4 sm:py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl text-xs sm:text-sm font-bold border border-rose-200 transition-colors flex items-center gap-2">
                      <Icon name="log-out" size={17} />
                      <span className="hidden sm:inline">Keluar</span>
                    </button>
                  </div>
                </div>
              </header>

              
              <div key={activeTab} className="px-3.5 py-4 sm:px-6 md:p-10 space-y-6 sm:space-y-7 flex-1 animate-tab-switch relative z-10">
                
                {activeTab === 'dashboard' && <section className="space-y-6 sm:space-y-7 animate-in fade-in duration-300">
                    
                    <GreetingMascotBanner name={student.name || 'Wali Murid'} role="Wali Murid" schoolName={settings.schoolName} academicYear={settings.academicYear} />

                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
                      <div onClick={() => {
                setActiveTab('spp');
                setSppSubFilter('unpaid');
              }} className={`p-5 sm:p-6 rounded-2xl sm:rounded-3xl border cursor-pointer transition-all hover:scale-[1.02] hover:shadow-xl bg-white shadow-sm relative overflow-hidden group ${unpaidBills.length > 0 ? 'border-rose-200/90 hover:border-rose-300' : 'border-emerald-200/90 hover:border-emerald-300'}`}>
                        <div className="flex justify-between items-center mb-3">
                          <span className="text-xs font-black uppercase text-slate-400 tracking-wider">Status SPP</span>
                          <div className={`w-11 h-11 rounded-2xl flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-transform ${unpaidBills.length > 0 ? 'bg-gradient-to-br from-rose-500 to-red-600 shadow-rose-500/30' : 'bg-gradient-to-br from-emerald-500 to-teal-600 shadow-emerald-500/30'}`}>
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

                      <div onClick={() => {
                setActiveTab('spp');
                setSppSubFilter('paid');
              }} className="p-5 sm:p-6 rounded-2xl sm:rounded-3xl bg-white border border-slate-200/90 hover:border-blue-300 shadow-sm hover:shadow-xl cursor-pointer hover:scale-[1.02] transition-all relative overflow-hidden group">
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

                      <div onClick={() => setActiveTab('berita')} className="p-5 sm:p-6 rounded-2xl sm:rounded-3xl bg-white border border-slate-200/90 hover:border-teal-300 shadow-sm hover:shadow-xl cursor-pointer hover:scale-[1.02] transition-all relative overflow-hidden group">
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

                      <div onClick={() => setActiveTab('evaluasi')} className="p-5 sm:p-6 rounded-2xl sm:rounded-3xl bg-white border border-slate-200/90 hover:border-indigo-300 shadow-sm hover:shadow-xl cursor-pointer hover:scale-[1.02] transition-all relative overflow-hidden group">
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

                    
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      
                      <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm flex flex-col justify-between">
                        <div>
                          <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
                            <h3 className="font-black text-slate-800 text-lg flex items-center gap-2">
                              <Icon name="credit-card" size={20} className="text-blue-600" /> Ringkasan Tagihan SPP
                            </h3>
                            <button onClick={() => {
                      setActiveTab('spp');
                      setSppSubFilter('all');
                    }} className="text-xs font-extrabold text-blue-600 hover:text-blue-800 flex items-center gap-1">
                              Rincian SPP <Icon name="arrow-right" size={14} />
                            </button>
                          </div>

                          {activePendingTransactions.length > 0 && <div className="mb-3 p-3.5 bg-amber-50 border border-amber-300 rounded-2xl flex items-center justify-between gap-3">
                              <div className="flex items-center gap-2.5 min-w-0">
                                <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-xs">
                                  <Icon name="clock" size={18} />
                                </div>
                                <div className="min-w-0">
                                  <p className="text-xs font-black text-amber-950 truncate">{activePendingTransactions.length} Pembayaran Menunggu Penyelesaian</p>
                                  <p className="text-[11px] font-bold text-amber-800 truncate">Selesaikan sebelum batas waktu Midtrans berakhir.</p>
                                </div>
                              </div>
                              <button type="button" onClick={() => {
                    setActiveTab('spp');
                    setSppSubFilter('pending');
                  }} className="px-3 py-2 bg-amber-600 hover:bg-amber-700 text-white font-black rounded-xl text-xs shrink-0 transition-all shadow-xs">
                                Menu Pending
                              </button>
                            </div>}

                          {unpaidBills.length > 0 ? <div className="space-y-3">
                              <div className="p-4 bg-rose-50 rounded-2xl border border-rose-200">
                                <p className="text-xs font-black text-rose-700 uppercase">Ada {unpaidBills.length} Bulan Belum Dibayar</p>
                                <p className="text-xl font-black text-rose-900 mt-1">Total: {formatRupiah(totalDueDebt)}</p>
                                <div className="flex flex-wrap gap-1.5 mt-2">
                                  {unpaidBills.map((b, idx) => <span key={idx} className="px-2.5 py-1 bg-rose-100 text-rose-800 text-xs font-black rounded-lg">
                                      {b.month}
                                    </span>)}
                                </div>
                              </div>
                            </div> : <div className="p-6 bg-emerald-50 rounded-2xl border border-emerald-200 text-center">
                              <Icon name="shield-check" size={36} className="mx-auto text-emerald-600 mb-2" />
                              <p className="font-black text-slate-800 text-base">Semua SPP Berjalan Lunas!</p>
                              <p className="text-xs text-slate-500 font-medium mt-1">Terima kasih atas kedisiplinan Bapak/Ibu wali murid.</p>
                            </div>}
                        </div>

                        {unpaidBills.length > 0 && (findActivePendingForBill(unpaidBills[0].month, false) ? <button type="button" onClick={() => {
                  setActiveTab('spp');
                  setSppSubFilter('pending');
                }} className="mt-6 w-full py-3.5 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white font-black rounded-2xl shadow-md shadow-amber-500/25 transition-all flex items-center justify-center gap-2 text-sm">
                            <Icon name="clock" size={18} /> Selesaikan Pending {unpaidBills[0].month} ({formatRupiah(unpaidBills[0].amount)})
                          </button> : <button onClick={() => onPayMidtrans(unpaidBills[0])} className="mt-6 w-full py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-black rounded-2xl shadow-md shadow-blue-500/25 transition-all flex items-center justify-center gap-2 text-sm">
                            <Icon name="credit-card" size={18} /> Bayar Tagihan {unpaidBills[0].month} ({formatRupiah(unpaidBills[0].amount)})
                          </button>)}
                      </div>

                      
                      <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm flex flex-col justify-between">
                        <div>
                          <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
                            <h3 className="font-black text-slate-800 text-lg flex items-center gap-2">
                              <Icon name="newspaper" size={20} className="text-teal-600" /> Pengumuman Resmi Terbaru
                            </h3>
                            <button onClick={() => setActiveTab('berita')} className="text-xs font-extrabold text-teal-600 hover:text-teal-800 flex items-center gap-1">
                              Lihat Semua <Icon name="arrow-right" size={14} />
                            </button>
                          </div>

                          {announcements.length > 0 ? <div className="space-y-3">
                              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
                                <span className="text-[11px] font-bold text-teal-600 uppercase flex items-center gap-1 mb-1">
                                  <Icon name="calendar" size={12} /> {formatDateIndo(announcements[0].date)}
                                </span>
                                <h4 className="font-black text-slate-800 text-base">{announcements[0].title}</h4>
                                <p className="text-xs text-slate-600 font-medium line-clamp-3 mt-1.5">{announcements[0].content}</p>
                              </div>
                            </div> : <p className="text-xs text-slate-400 font-medium text-center py-8">Belum ada pengumuman sekolah.</p>}
                        </div>
                      </div>
                    </div>
                  </section>}
                {activeTab === 'spp' && (isRefreshing ? <div className="space-y-7 select-none">
                      <div className="glass-panel-modern rounded-[32px] p-6 sm:p-8 flex flex-col md:flex-row items-center justify-between gap-6 bg-slate-50/80">
                        <div className="flex items-center gap-6 w-full md:w-auto">
                          <div className="w-24 h-24 rounded-3xl bg-slate-200 shrink-0"></div>
                          <div className="space-y-3 flex-1">
                            <div className="h-5 w-36 bg-slate-200 rounded-full"></div>
                            <div className="h-8 w-64 bg-slate-200 rounded-xl"></div>
                          </div>
                        </div>
                      </div>
                    </div> : <div key={sppSubFilter} className="space-y-6 sm:space-y-7 animate-modern-fade">
                      
                      <div className="glass-panel-modern rounded-2xl sm:rounded-[32px] p-5 sm:p-8 flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden">
                        <div className="flex items-center gap-4 sm:gap-6 w-full md:w-auto">
                          <div onClick={() => student.fotoUrl && setPreviewImage({
                  url: student.fotoUrl,
                  title: `Foto Profil - ${student.name}`
                })} className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl sm:rounded-3xl bg-gradient-to-tr from-blue-600 via-sky-500 to-cyan-400 border-4 border-white shadow-xl flex items-center justify-center text-white font-black text-3xl sm:text-4xl overflow-hidden shrink-0 cursor-pointer hover:scale-105 transition-transform relative z-10">
                            {student.fotoUrl ? <img src={student.fotoUrl} alt={student.name} loading="lazy" decoding="async" className="w-full h-full object-cover" /> : <span>{student.name ? student.name.charAt(0).toUpperCase() : 'S'}</span>}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-50/90 text-blue-700 rounded-full text-[11px] sm:text-xs font-black tracking-wider uppercase mb-1.5 shadow-sm border border-blue-200">
                              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
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

                        <div className="flex items-center gap-4 bg-white p-4 sm:p-6 rounded-2xl border border-slate-200/80 w-full md:w-auto shadow-sm">
                          <div className="text-right w-full md:w-auto">
                            <p className="text-xs font-black text-slate-400 uppercase tracking-wider mb-1">Tarif SPP Resmi</p>
                            <p className="text-2xl sm:text-3xl font-black text-blue-600">{formatRupiah(student.tarif)}</p>
                            {student.keringanan_note && <span className="inline-block mt-1 px-2.5 py-1 bg-amber-100 text-amber-900 text-xs font-black rounded-lg border border-amber-200">
                                Keringanan: {student.keringanan_note}
                              </span>}
                          </div>
                          <div className="h-10 w-px bg-slate-200 hidden sm:block"></div>
                          <div className="text-left hidden sm:block">
                            <p className="text-xs font-black text-slate-400 uppercase tracking-wider mb-1">Tahun Ajaran</p>
                            <p className="text-sm font-black text-slate-800 bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-sm">{settings.academicYear}</p>
                          </div>
                        </div>
                      </div>

                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
                        
                        <div className={`p-5 sm:p-6 rounded-2xl sm:rounded-3xl border transition-all ${unpaidBills.length > 0 ? 'bg-rose-50/90 border-rose-200 shadow-sm' : 'bg-emerald-50/90 border-emerald-200 shadow-sm'}`}>
                          <div className="flex items-center justify-between mb-3">
                            <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-2xl flex items-center justify-center ${unpaidBills.length > 0 ? 'bg-rose-500 text-white' : 'bg-emerald-500 text-white'}`}>
                              <Icon name={unpaidBills.length > 0 ? 'alert-circle' : 'shield-check'} size={22} />
                            </div>
                            <span className={`px-2.5 py-1 rounded-full text-[11px] font-black uppercase tracking-wider ${unpaidBills.length > 0 ? 'bg-rose-200 text-rose-800' : 'bg-emerald-200 text-emerald-800'}`}>
                              {unpaidBills.length > 0 ? `${unpaidBills.length} Bulan` : 'Lunas / Aman'}
                            </span>
                          </div>
                          <p className="text-xs font-extrabold text-slate-500 uppercase tracking-wider">Tunggakan s/d Bulan Ini</p>
                          <h4 className={`text-xl sm:text-2xl md:text-3xl font-black mt-1 ${totalDueDebt > 0 ? 'text-rose-700' : 'text-emerald-700'}`}>
                            {formatRupiah(totalDueDebt)}
                          </h4>
                          {Number(student?.arrearsAmount || 0) > 0 && !(student?.arrearsNote && student?.kelas && student.arrearsNote.toLowerCase().includes(student.kelas.toLowerCase())) && !String(student?.arrearsNote).startsWith('sess_') && <div className="mt-1.5 inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 text-[10.5px] font-black border border-amber-300">
                              <Icon name="history" size={11} className="text-amber-700" />
                              <span>+ Tunggakan Kelas Sebelumnya: {formatRupiah(student.arrearsAmount)}</span>
                            </div>}
                          <p className="text-xs font-medium text-slate-500 mt-1">
                            {totalDueDebt > 0 ? 'Wajib segera dilunasi' : 'Semua tagihan aman'}
                          </p>
                        </div>

                        
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

                        
                        <div className="p-5 sm:p-6 rounded-2xl sm:rounded-3xl bg-indigo-50/80 border border-indigo-200 shadow-sm transition-all">
                          <div className="flex items-center justify-between mb-3">
                            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center">
                              <Icon name="check-circle-2" size={22} />
                            </div>
                            <span className="px-2.5 py-1 rounded-full bg-indigo-200 text-indigo-800 text-[11px] font-black uppercase tracking-wider">
                              {monthlyBills.length > 0 ? Math.round(paidBills.length / monthlyBills.length * 100) : 0}% Lunas
                            </span>
                          </div>
                          <p className="text-xs font-extrabold text-slate-500 uppercase tracking-wider">Status Pembayaran</p>
                          <h4 className="text-xl sm:text-2xl md:text-3xl font-black text-indigo-950 mt-1">
                            {paidBills.length} <span className="text-sm font-bold text-slate-500">/ {monthlyBills.length} Bulan</span>
                          </h4>
                          <div className="w-full bg-indigo-200/60 rounded-full h-2 mt-2 overflow-hidden">
                            <div className="bg-indigo-600 h-full rounded-full transition-all duration-500" style={{
                    width: `${monthlyBills.length > 0 ? paidBills.length / monthlyBills.length * 100 : 0}%`
                  }}></div>
                          </div>
                        </div>

                        
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
                          <button type="button" onClick={() => setShowParentClassHistory(true)} className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-amber-100/70 text-amber-900 border border-amber-300 rounded-xl text-xs font-black transition-all shadow-2xs group active:scale-95 cursor-pointer w-full justify-center sm:justify-start" title="Klik untuk melihat linimasa riwayat jenjang & mutasi rombel ananda">
                            <Icon name="history" size={13} className="text-amber-700 group-hover:rotate-45 transition-transform" />
                            <span>Lihat Riwayat Jenjang Kelas</span>
                          </button>
                        </div>
                      </div>

                      
                      <div className="flex flex-wrap items-center gap-2 pb-1 overflow-x-auto no-scrollbar">
                        {[{
                id: 'all',
                label: 'Semua',
                count: monthlyBills.length
              }, {
                id: 'pending',
                label: 'Pending',
                count: activePendingTransactions.length,
                isPending: true
              }, {
                id: 'unpaid',
                label: 'Menunggak',
                count: unpaidBills.length,
                isDanger: true
              }, {
                id: 'upcoming',
                label: 'Mendatang',
                count: upcomingBills.length
              }, {
                id: 'paid',
                label: 'Lunas',
                count: paidBills.length
              }].map(sf => <button key={sf.id} onClick={() => setSppSubFilter(sf.id)} className={`px-3.5 py-1.5 rounded-full text-xs font-black transition-all shrink-0 flex items-center gap-1.5 ${sppSubFilter === sf.id ? sf.isPending ? 'bg-amber-600 text-white shadow-sm' : 'bg-blue-600 text-white shadow-sm' : 'bg-white text-slate-600 border border-slate-200 shadow-xs hover:bg-slate-50'}`}>
                            <span>{sf.label}</span>
                            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${sppSubFilter === sf.id ? 'bg-white/20 text-white' : sf.isPending && sf.count > 0 ? 'bg-amber-100 text-amber-800 font-black' : sf.isDanger && sf.count > 0 ? 'bg-rose-100 text-rose-700 font-black' : 'bg-slate-100 text-slate-600'}`}>
                              {sf.count}
                            </span>
                          </button>)}
                      </div>

                      {(sppSubFilter === 'pending' || sppSubFilter === 'all' && activePendingTransactions.length > 0) && <section className="bg-white rounded-2xl sm:rounded-3xl border border-amber-200 shadow-sm overflow-hidden relative transition-all">
                          <div className="absolute top-0 left-0 w-1.5 h-full bg-amber-500"></div>
                          <div className="p-5 sm:p-7 border-b border-amber-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-amber-50/50">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-sm">
                                <Icon name="clock" size={22} />
                              </div>
                              <div>
                                <h3 className="font-black text-slate-800 text-lg sm:text-2xl">Pembayaran Pending</h3>
                                <p className="text-xs sm:text-sm text-slate-600 font-medium mt-0.5">
                                  Transaksi Midtrans aktif dengan batas waktu 5 menit. Otomatis dibatalkan &amp; tagihan terbuka kembali bila waktu habis.
                                </p>
                              </div>
                            </div>
                            <span className="px-3 py-1 sm:px-4 sm:py-1.5 bg-amber-500 text-white rounded-full text-xs sm:text-sm font-black shadow-sm shrink-0">
                              {activePendingTransactions.length} Menunggu
                            </span>
                          </div>
                          <div className="p-3 sm:p-4 space-y-3">
                            {activePendingTransactions.length === 0 ? <div className="p-8 sm:p-10 text-center flex flex-col items-center justify-center">
                                <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-3">
                                  <Icon name="check-circle-2" size={32} />
                                </div>
                                <p className="font-black text-slate-800 text-lg">Tidak Ada Pembayaran Pending</p>
                                <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">
                                  Semua pembayaran Anda telah diselesaikan atau tidak ada transaksi tertunda saat ini.
                                </p>
                              </div> : activePendingTransactions.map((trx, idx) => {
                      const expMs = Number(trx.computedExpiresAtMs || computeClientTransactionExpiryMs(trx) || 0);
                      const expClock = expMs > 0 ? new Date(expMs).toLocaleTimeString('id-ID', {
                        hour: '2-digit',
                        minute: '2-digit'
                      }).replace(/\./g, ':') + ' WIB' : '';
                      const payCodeLabel = trx.vaNumber
                        ? `${trx.vaBank ? `VA ${trx.vaBank}` : 'No. VA'}`
                        : trx.billKey
                          ? `Kode Bill${trx.billerCode ? ` (${trx.billerCode})` : ''}`
                          : trx.paymentCode
                            ? 'Kode Bayar'
                            : '';
                      const payCodeVal = trx.vaNumber || trx.billKey || trx.paymentCode || '';
                      const qrCodeUrl = trx.qrCodeUrl || '';
                      const isQrisTrx = Boolean(qrCodeUrl) || String(trx.paymentType || '').toLowerCase() === 'qris' || /qris|gopay|shopeepay/i.test(String(trx.method || ''));
                      const isSandboxEnv = !window.AppEnv?.midtransIsProduction || String(trx.snapUrl || window.AppEnv?.midtransSnapUrl || '').includes('sandbox');
                      const copyKey = (trx.orderId || trx.id || idx) + '_code';
                      const qrCopyKey = (trx.orderId || trx.id || idx) + '_qr';
                      return <div key={trx.orderId || trx.id || idx} className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-amber-50/80 via-white to-orange-50/40 border border-amber-200 flex flex-col gap-3.5 shadow-2xs">
                                  <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3">
                                    <div className="space-y-2 min-w-0 flex-1">
                                      <div className="flex flex-wrap items-center gap-2">
                                        <h4 className="font-black text-slate-900 text-base sm:text-lg">{trx.month}</h4>
                                        <span className="status-pill-menunggu">
                                          <Icon name="clock" size={11} /> Menunggu Pembayaran
                                        </span>
                                      </div>
                                      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600 font-bold">
                                        <span className="px-2.5 py-0.5 rounded-lg bg-white border border-slate-200 font-mono text-[11px] text-slate-700 break-all">
                                          Order: {trx.orderId || '-'}
                                        </span>
                                        <span className="px-2.5 py-0.5 rounded-lg bg-blue-50 border border-blue-200 text-blue-800 text-[11px] font-extrabold">
                                          {trx.method && trx.method !== '-' ? trx.method : 'Midtrans Snap Online'}
                                        </span>
                                        {payCodeVal && <span className="inline-flex flex-wrap items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-900 text-[11px] font-mono font-black max-w-full">
                                            <span className="break-all">{payCodeLabel}: {payCodeVal}</span>
                                            <button type="button" onClick={() => {
                                    try {
                                      navigator.clipboard.writeText(payCodeVal);
                                      setCopiedPayCodeKey(copyKey);
                                      setTimeout(() => setCopiedPayCodeKey(null), 2000);
                                    } catch (e) {}
                                  }} className="px-1.5 py-0.5 rounded bg-indigo-600 hover:bg-indigo-700 text-white font-sans text-[10px] font-bold flex items-center gap-1 transition-colors">
                                              <Icon name={copiedPayCodeKey === copyKey ? 'check' : 'copy'} size={10} />
                                              <span>{copiedPayCodeKey === copyKey ? 'Disalin' : 'Salin'}</span>
                                            </button>
                                          </span>}
                                      </div>
                                      <div className="flex flex-wrap items-center gap-2 text-xs font-extrabold text-amber-900 pt-0.5">
                                        <Icon name="clock" size={13} className="text-amber-600 shrink-0" />
                                        {expMs > 0 ? <span>
                                            Sisa Waktu: <span className="font-mono font-black text-rose-700 bg-white px-2 py-0.5 rounded-md border border-amber-300"><LiveCountdownText expiresAtMs={expMs} /></span> {expClock ? `(Batas ${expClock})` : ''}
                                          </span> : <span>Menunggu batas waktu pembayaran dari Midtrans</span>}
                                      </div>
                                    </div>
                                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
                                      <div className="text-left sm:text-right bg-white sm:bg-transparent p-2.5 sm:p-0 rounded-xl border sm:border-0 border-amber-200">
                                        <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Tagihan</span>
                                        <div className="font-black text-slate-900 text-lg sm:text-xl whitespace-nowrap">{formatRupiah(trx.amount)}</div>
                                      </div>
                                      <div className="flex flex-wrap items-center gap-2">
                                        <button type="button" onClick={() => onCheckPendingStatus && onCheckPendingStatus(trx)} className="py-2.5 px-3 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 font-black rounded-xl text-xs transition-all flex items-center justify-center gap-1.5 shadow-2xs">
                                          <Icon name="refresh-cw" size={13} />
                                          <span>Cek Status</span>
                                        </button>
                                        {onRecreatePendingOrder && trx.orderId && <button type="button" onClick={() => onRecreatePendingOrder(trx)} className="py-2.5 px-3 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 font-black rounded-xl text-xs transition-all flex items-center justify-center gap-1.5 shadow-2xs" title="Batalkan transaksi lama dan langsung buat VA / QRIS baru">
                                            <Icon name="repeat" size={13} />
                                            <span>{isQrisTrx ? 'Buat QR Baru' : 'Buat VA Baru'}</span>
                                          </button>}
                                        {onCancelPendingOrder && trx.orderId && <button type="button" onClick={() => onCancelPendingOrder(trx)} className="py-2.5 px-3 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-black rounded-xl text-xs transition-all flex items-center justify-center gap-1.5 shadow-2xs" title="Batalkan order ini dan ganti metode pembayaran">
                                            <Icon name="x-circle" size={13} />
                                            <span>Batalkan</span>
                                          </button>}
                                        <button type="button" onClick={() => onResumePendingMidtrans && onResumePendingMidtrans(trx)} className="py-2.5 px-4 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white font-black rounded-xl text-xs sm:text-sm shadow-md shadow-amber-500/25 transition-all flex items-center justify-center gap-1.5">
                                          <Icon name="credit-card" size={15} />
                                          <span>Lanjutkan Bayar</span>
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                  {qrCodeUrl && <div className="p-3.5 rounded-xl bg-white border border-indigo-200 flex flex-col sm:flex-row items-start sm:items-center gap-3.5 w-full">
                                      <button type="button" onClick={() => setPreviewImage({
                            url: qrCodeUrl,
                            title: `Kode QRIS - ${trx.month}`
                          })} className="w-20 h-20 rounded-xl border border-slate-200 bg-white p-1 shrink-0 overflow-hidden hover:border-indigo-400 transition-colors cursor-pointer" title="Klik untuk perbesar gambar QRIS">
                                        <img src={qrCodeUrl} alt="Kode QRIS" className="w-full h-full object-contain" />
                                      </button>
                                      <div className="min-w-0 flex-1 w-full space-y-1.5">
                                        <div className="text-[11px] font-black text-indigo-950 uppercase tracking-wider">URL Kode QRIS (Simulator / Scan)</div>
                                        <div className="px-2.5 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-[11px] font-mono text-slate-700 break-all select-all">
                                          {qrCodeUrl}
                                        </div>
                                        <div className="flex flex-wrap items-center gap-2 pt-0.5">
                                          <button type="button" onClick={() => {
                                try {
                                  navigator.clipboard.writeText(qrCodeUrl);
                                  setCopiedPayCodeKey(qrCopyKey);
                                  setTimeout(() => setCopiedPayCodeKey(null), 2000);
                                } catch (e) {}
                              }} className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-black flex items-center gap-1.5 transition-colors shadow-2xs">
                                            <Icon name={copiedPayCodeKey === qrCopyKey ? 'check' : 'copy'} size={12} />
                                            <span>{copiedPayCodeKey === qrCopyKey ? 'URL Disalin ✓' : 'Salin URL QRIS'}</span>
                                          </button>
                                          {isSandboxEnv && <a href="https://simulator.sandbox.midtrans.com/v2/qris/index" target="_blank" rel="noopener noreferrer" className="px-3 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-[11px] font-black flex items-center gap-1.5 transition-colors">
                                              <Icon name="external-link" size={12} />
                                              <span>Buka Simulator QRIS</span>
                                            </a>}
                                        </div>
                                      </div>
                                    </div>}
                                  {!qrCodeUrl && isQrisTrx && <div className="px-3 py-2 rounded-xl bg-indigo-50/70 border border-indigo-200 text-[11px] font-semibold text-indigo-900 flex items-center gap-2 w-full">
                                      <Icon name="qr-code" size={14} className="text-indigo-600 shrink-0" />
                                      <span>URL QRIS belum dimuat di sesi ini. Klik <strong>Cek Status</strong> atau <strong>Lanjutkan Bayar</strong> untuk memunculkan QRIS.</span>
                                    </div>}
                                </div>;
                    })}
                          </div>
                        </section>}

                      
                      {(sppSubFilter === 'all' || sppSubFilter === 'unpaid') && <section className={`bg-white rounded-2xl sm:rounded-3xl border shadow-sm overflow-hidden relative transition-all ${unpaidBills.length > 0 ? 'border-rose-100' : 'border-emerald-100'}`}>
                          <div className={`absolute top-0 left-0 w-1.5 h-full ${unpaidBills.length > 0 ? 'bg-rose-500' : 'bg-emerald-500'}`}></div>
                          <div className={`p-5 sm:p-7 border-b border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${unpaidBills.length > 0 ? 'bg-rose-50/30' : 'bg-emerald-50/30'}`}>
                            <div className="flex items-center gap-3">
                              <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-2xl flex items-center justify-center shrink-0 ${unpaidBills.length > 0 ? 'bg-rose-100 text-rose-600' : 'bg-emerald-100 text-emerald-600'}`}>
                                <Icon name={unpaidBills.length > 0 ? "alert-circle" : "shield-check"} size={22} />
                              </div>
                              <div>
                                <h3 className="font-black text-slate-800 text-lg sm:text-2xl">
                                  {unpaidBills.length > 0 ? 'Tagihan Menunggak' : 'Status Tagihan Bulan Ini'}
                                </h3>
                                <p className="text-xs sm:text-sm text-slate-500 font-medium mt-0.5">
                                  {unpaidBills.length > 0 ? 'Bulan SPP yang telah jatuh tempo dan perlu dilunasi.' : 'Semua tagihan SPP s/d bulan berjalan lunas.'}
                                </p>
                              </div>
                            </div>
                            {unpaidBills.length > 0 ? <span className="px-3 py-1 sm:px-4 sm:py-1.5 bg-rose-500 text-white rounded-full text-xs sm:text-sm font-black shadow-sm shrink-0">
                                Total: {formatRupiah(totalDueDebt)}
                              </span> : <span className="px-3 py-1 sm:px-4 sm:py-1.5 bg-emerald-500 text-white rounded-full text-xs sm:text-sm font-black shadow-sm shrink-0 flex items-center gap-1.5">
                                <Icon name="check-circle" size={15} /> Status Aman & Lunas
                              </span>}
                          </div>
                          <div className="p-2 sm:p-3 space-y-3">
                            {Number(student?.arrearsAmount || 0) > 0 && !(student?.arrearsNote && student?.kelas && student.arrearsNote.toLowerCase().includes(student.kelas.toLowerCase())) && !String(student?.arrearsNote).startsWith('sess_') && (() => {
                      const arrearsPending = findActivePendingForBill('Tunggakan Kelas Sebelumnya', true);
                      return <div className="p-4 sm:p-5 rounded-2xl bg-amber-50/95 border-2 border-amber-300 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xs">
                                <div className="flex items-start gap-3">
                                  <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-sm">
                                    <Icon name="history" size={20} />
                                  </div>
                                  <div>
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <h4 className="font-black text-amber-950 text-sm sm:text-base">Tunggakan Bawaan Kelas Sebelumnya</h4>
                                      <span className="px-2 py-0.5 rounded-md bg-amber-200 text-amber-900 text-[10px] font-black uppercase">Akumulasi Mutasi / Naik Kelas</span>
                                    </div>
                                    <p className="text-xs text-amber-800 font-bold mt-0.5">{student.arrearsNote && !student.arrearsNote.startsWith('sess_') ? student.arrearsNote : 'Tunggakan dari kelas / periode ajaran sebelumnya'}</p>
                                  </div>
                                </div>
                                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto shrink-0">
                                  <div className="text-left sm:text-right bg-white sm:bg-transparent p-2.5 sm:p-0 rounded-xl border sm:border-0 border-amber-200">
                                    <span className="text-[10px] uppercase font-bold text-slate-400 block sm:hidden">Total Tunggakan:</span>
                                    <div className="font-black text-rose-700 text-xl sm:text-2xl">{formatRupiah(student.arrearsAmount)}</div>
                                    <span className="text-[11px] font-semibold text-slate-500 block">Konfirmasi / Kasir TU & Online</span>
                                  </div>
                                  {arrearsPending ? <button type="button" onClick={() => setSppSubFilter('pending')} className="py-2.5 px-4 bg-amber-600 hover:bg-amber-700 text-white font-black rounded-xl text-xs sm:text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95 whitespace-nowrap">
                                      <Icon name="clock" size={16} />
                                      <span>Selesaikan Pending</span>
                                    </button> : <button type="button" onClick={() => onPayMidtrans({
                        month: student.arrearsNote && !student.arrearsNote.startsWith('sess_') ? `Tunggakan (${student.arrearsNote})` : 'Tunggakan Kelas Sebelumnya',
                        amount: Number(student.arrearsAmount),
                        isArrearsPayment: true
                      })} className="py-2.5 px-4 bg-gradient-to-r from-amber-600 via-orange-600 to-rose-600 hover:from-amber-700 hover:to-rose-700 text-white font-black rounded-xl text-xs sm:text-sm shadow-md shadow-orange-600/25 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95 whitespace-nowrap">
                                      <Icon name="credit-card" size={16} />
                                      <span>Bayar Online</span>
                                    </button>}
                                </div>
                              </div>;
                    })()}

                            {unpaidBills.length === 0 && Number(student?.arrearsAmount || 0) === 0 ? <div className="p-8 sm:p-10 text-center flex flex-col items-center justify-center">
                                <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-3">
                                  <Icon name="shield-check" size={32} />
                                </div>
                                <p className="font-black text-slate-800 text-lg sm:text-xl">Tidak Ada Tunggakan</p>
                                <p className="text-xs sm:text-base text-slate-500 font-medium mt-1">Semua tagihan SPP ananda s/d bulan berjalan dalam status aman & lunas.</p>
                              </div> : unpaidBills.length === 0 ? <div className="p-5 text-center text-xs font-bold text-slate-500 bg-slate-50 rounded-xl border border-slate-200">
                                Seluruh tagihan SPP bulanan kelas {student.kelas} saat ini telah lunas.
                              </div> : <table className="w-full text-left">
                                <tbody className="divide-y divide-slate-100">
                                  {unpaidBills.map((bill, idx) => {
                          const pendingTrx = findActivePendingForBill(bill.month, false);
                          return <tr key={idx} className="hover:bg-slate-50 transition-colors">
                                        <td className="py-3.5 px-3 sm:py-4 sm:px-6">
                                          <div className="font-black text-slate-800 text-sm sm:text-xl leading-tight">{bill.month}</div>
                                          {pendingTrx ? <div className="flex items-center gap-1.5 text-[10.5px] sm:text-[11px] font-black text-amber-700 uppercase mt-0.5">
                                              <Icon name="clock" size={12} className="text-amber-600 shrink-0" />
                                              <span>Pending • Order {pendingTrx.orderId || '-'}</span>
                                            </div> : <div className="flex items-center gap-1.5 text-[10.5px] sm:text-[11px] font-black text-rose-600 uppercase mt-0.5">
                                              <Icon name="alert-triangle" size={12} className="text-rose-500 shrink-0" />
                                              <span>Jatuh Tempo • {student.kelas}</span>
                                            </div>}
                                        </td>
                                        <td className="py-3.5 px-2 sm:py-4 sm:px-6 text-right">
                                          <div className="font-black text-rose-600 text-sm sm:text-2xl whitespace-nowrap">{formatRupiah(bill.amount)}</div>
                                        </td>
                                        <td className="py-3.5 pl-2 pr-3 sm:py-4 sm:px-6 text-right w-32 sm:w-52">
                                          {pendingTrx ? <button type="button" onClick={() => setSppSubFilter('pending')} className="w-full py-2.5 sm:py-3.5 px-2.5 sm:px-5 bg-amber-500 hover:bg-amber-600 text-white font-black rounded-xl text-[11px] sm:text-sm shadow-md shadow-amber-500/20 transition-all flex items-center justify-center gap-1.5">
                                              <Icon name="clock" size={14} className="shrink-0" /> <span>Selesaikan Pending</span>
                                            </button> : <button onClick={() => onPayMidtrans(bill)} className="w-full py-2.5 sm:py-3.5 px-2.5 sm:px-5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-black rounded-xl text-[11px] sm:text-sm shadow-md shadow-blue-500/25 transition-all flex items-center justify-center gap-1.5 whitespace-nowrap">
                                              <Icon name="credit-card" size={14} className="shrink-0" /> <span>Bayar Online</span>
                                            </button>}
                                        </td>
                                      </tr>;
                        })}
                                </tbody>
                              </table>}
                          </div>
                        </section>}

                      
                      {(sppSubFilter === 'all' || sppSubFilter === 'upcoming') && upcomingBills.length > 0 && <details className="group bg-white rounded-2xl sm:rounded-3xl border border-sky-100 shadow-sm overflow-hidden" open={sppSubFilter === 'upcoming'}>
                          <summary className="p-5 sm:p-7 cursor-pointer flex items-center justify-between select-none bg-sky-50/30 hover:bg-sky-50/60 transition-colors">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-sky-100 text-sky-600 rounded-2xl flex items-center justify-center shrink-0"><Icon name="calendar" size={22} /></div>
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
                                {upcomingBills.map((bill, idx) => {
                        const pendingTrx = findActivePendingForBill(bill.month, false);
                        return <tr key={idx} className="hover:bg-slate-50 transition-colors">
                                      <td className="py-3.5 px-3 sm:py-4 sm:px-6">
                                        <div className="font-black text-slate-800 text-sm sm:text-xl leading-tight">{bill.month}</div>
                                        {pendingTrx ? <div className="text-[10.5px] sm:text-[11px] font-black text-amber-700 uppercase mt-0.5">Pending • Order {pendingTrx.orderId || '-'}</div> : <div className="text-[10.5px] sm:text-[11px] font-bold text-sky-600 uppercase mt-0.5">Belum Jatuh Tempo • {student.kelas}</div>}
                                      </td>
                                      <td className="py-3.5 px-2 sm:py-4 sm:px-6 text-right">
                                        <div className="font-black text-slate-700 text-sm sm:text-2xl whitespace-nowrap">{formatRupiah(bill.amount)}</div>
                                      </td>
                                      <td className="py-3.5 pl-2 pr-3 sm:py-4 sm:px-6 text-right w-32 sm:w-52">
                                        {pendingTrx ? <button type="button" onClick={() => setSppSubFilter('pending')} className="w-full py-2.5 sm:py-3.5 px-2.5 sm:px-5 bg-amber-500 hover:bg-amber-600 text-white font-black rounded-xl text-[11px] sm:text-sm shadow-md transition-all flex items-center justify-center gap-1.5">
                                            <Icon name="clock" size={14} className="shrink-0" /> <span>Selesaikan Pending</span>
                                          </button> : <button onClick={() => onPayMidtrans(bill)} className="w-full py-2.5 sm:py-3.5 px-2.5 sm:px-5 bg-slate-800 hover:bg-slate-900 text-white font-black rounded-xl text-[11px] sm:text-sm shadow-md transition-all flex items-center justify-center gap-1.5 whitespace-nowrap">
                                            <Icon name="credit-card" size={14} className="shrink-0" /> <span>Bayar di Awal</span>
                                          </button>}
                                      </td>
                                    </tr>;
                      })}
                              </tbody>
                            </table>
                          </div>
                        </details>}

                      
                      {(sppSubFilter === 'all' || sppSubFilter === 'paid') && <details className="group bg-white rounded-2xl sm:rounded-3xl border border-slate-200 shadow-sm overflow-hidden" open={sppSubFilter === 'paid' || unpaidBills.length === 0}>
                          <summary className="p-5 sm:p-7 cursor-pointer flex items-center justify-between select-none bg-slate-50/50 hover:bg-slate-50 transition-colors">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center shrink-0"><Icon name="history" size={22} /></div>
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
                              <button type="button" onClick={() => setHistoryClassFilter('all')} className={`px-3 py-1.5 rounded-xl font-black transition-all ${historyClassFilter === 'all' ? 'bg-blue-600 text-white shadow-sm' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'}`}>
                                Semua Kelas ({allPaidTransactions.length})
                              </button>
                              {studentClassHistoryList.map(cls => {
                    const count = allPaidTransactions.filter(t => (t.kelas || student?.kelas) === cls).length;
                    const isCurrent = cls === student?.kelas;
                    return <button key={cls} type="button" onClick={() => setHistoryClassFilter(cls)} className={`px-3 py-1.5 rounded-xl font-black transition-all flex items-center gap-1.5 ${historyClassFilter === cls ? 'bg-blue-600 text-white shadow-sm' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'}`}>
                                    <span>{cls}</span>
                                    {isCurrent && <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 font-extrabold">Aktif</span>}
                                    <span className={`px-1.5 py-0.2 rounded text-[10px] font-black ${historyClassFilter === cls ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-700'}`}>
                                      {count}
                                    </span>
                                  </button>;
                  })}
                            </div>
                          </div>

                          <div className="p-2 sm:p-3 overflow-x-auto">
                            {filteredPaidBills.length === 0 ? <p className="text-center p-8 text-sm sm:text-base text-slate-500 font-bold">
                                {historyClassFilter === 'all' ? 'Belum ada riwayat pembayaran lunas.' : `Belum ada riwayat pembayaran pada kelas ${historyClassFilter}.`}
                              </p> : <table className="w-full text-left border-collapse">
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
                                  {filteredPaidBills.map((trx, idx) => <tr key={trx.id || idx} className="hover:bg-amber-50/40 transition-colors">
                                      <td className="py-3.5 px-4">
                                        <div className="font-black text-slate-800 text-sm sm:text-base">{trx.month}</div>
                                        <div className="flex items-center gap-2 mt-0.5">
                                          <span className="text-[11px] font-bold text-slate-500">Tgl: {formatDateIndo(trx.date)}</span>
                                          {trx.kuitansiNo && <span className="font-mono text-[10px] text-slate-500 font-bold bg-slate-100 px-1.5 py-0.2 rounded">
                                              {trx.kuitansiNo}
                                            </span>}
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
                                        {Boolean(trx.keringananNote || student?.keringanan_note && (trx.amount || trx.nominal) < (settings?.customClasses?.find(c => c.name === (trx.kelas || student?.kelas))?.tarif || 350000)) && <div className="text-[10.5px] text-amber-700 font-extrabold flex items-center justify-end gap-0.5 mt-0.5">
                                            <span>*keringanan</span>
                                          </div>}
                                      </td>
                                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                                        <button onClick={() => onShowKuitansi(trx)} className="btn-print-kuitansi" title="Cetak Kuitansi Resmi">
                                          <Icon name="printer" size={13} />
                                          <span>Cetak Kuitansi</span>
                                        </button>
                                      </td>
                                    </tr>)}
                                </tbody>
                              </table>}
                          </div>
                        </details>}
                    </div>)}

                
                {activeTab === 'berita' && <section className="space-y-4 animate-in fade-in duration-300">
                    <h3 className="text-lg sm:text-xl font-black text-slate-800 flex items-center gap-2 mb-4">
                      <div className="w-9 h-9 sm:w-10 sm:h-10 bg-teal-100 text-teal-600 rounded-xl flex items-center justify-center"><Icon name="newspaper" size={18} /></div>
                      Berita & Pengumuman Sekolah
                    </h3>
                    {announcements.length === 0 ? <div className="bg-white p-8 rounded-3xl border border-slate-200 text-center shadow-sm">
                        <p className="text-slate-500 font-bold">Belum ada pengumuman saat ini.</p>
                      </div> : <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
                        {announcements.map(ann => <div key={ann.id} className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/90 shadow-sm hover:shadow-xl transition-all overflow-hidden flex flex-col h-full group">
                            {ann.imageUrl ? <div className="w-full h-44 bg-slate-100 relative cursor-pointer overflow-hidden shrink-0" onClick={() => setPreviewImage({
                  url: ann.imageUrl,
                  title: ann.title
                })}>
                                <img src={ann.imageUrl} alt={ann.title} loading="lazy" decoding="async" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                              </div> : <div className="w-full h-36 bg-gradient-to-br from-blue-600 via-indigo-600 to-sky-500 p-5 flex flex-col justify-between text-white shrink-0 relative overflow-hidden">
                                <div className="flex items-center justify-between">
                                  <span className="px-2.5 py-1 bg-white/25 rounded-lg text-[10px] font-black uppercase tracking-wider">
                                    Berita Resmi
                                  </span>
                                  <Icon name="newspaper" size={20} className="text-blue-100" />
                                </div>
                                <h4 className="font-black text-sm text-white line-clamp-2 leading-snug drop-shadow-sm">
                                  {ann.title}
                                </h4>
                              </div>}
                            <div className="p-5 flex-1 flex flex-col justify-between">
                              <div>
                                <div className="flex items-center gap-1.5 text-[11px] font-bold text-blue-600 uppercase mb-2">
                                  <Icon name="calendar" size={13} />
                                  <span>{formatDateIndo(ann.date)}</span>
                                </div>
                                <h4 className="font-black text-slate-800 text-base mb-2 leading-tight line-clamp-2">{ann.title}</h4>
                                <p className="text-xs text-slate-600 leading-relaxed font-medium line-clamp-3 mb-4">{ann.content}</p>
                              </div>
                              <button type="button" onClick={() => setSelectedAnnouncement(ann)} className="mt-auto py-2.5 px-4 bg-blue-50 hover:bg-blue-100 text-blue-700 font-extrabold rounded-xl text-xs transition-colors flex justify-center items-center gap-2 border border-blue-200">
                                <span>Baca Selengkapnya</span>
                                <Icon name="arrow-right" size={14} />
                              </button>
                            </div>
                          </div>)}
                      </div>}
                  </section>}

                
                {activeTab === 'evaluasi' && <section className="space-y-6 animate-in fade-in duration-300">
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

                      {myNotes.length === 0 ? <div className="text-center py-12 bg-slate-50 rounded-2xl border border-slate-100">
                          <Icon name="inbox" size={36} className="mx-auto text-slate-300 mb-2" />
                          <p className="text-slate-500 font-bold text-sm">Belum ada catatan TU untuk ananda {student.name}.</p>
                        </div> : <div className="space-y-4">
                          {myNotes.map(note => <ParentNoteCardItem key={note.id} note={note} student={student} onAddCommentNote={onAddCommentNote} />)}
                        </div>}
                    </div>
                  </section>}

                
                {activeTab === 'pengaduan' && <section className="space-y-6 animate-in fade-in duration-300">
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

                      
                      {activeComplaint ? <div className="space-y-6 mb-8">
                          
                          <div className="bg-gradient-to-r from-blue-50 via-indigo-50 to-sky-50 border border-blue-200 rounded-3xl p-5 sm:p-6 shadow-xs">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                              <div className="flex items-start gap-3.5">
                                <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-bold shrink-0 shadow-md shadow-blue-500/20">
                                  <Icon name="message-circle" size={22} />
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

                              
                              <div className="shrink-0 bg-white px-5 py-3 rounded-2xl border border-blue-200 shadow-sm flex items-center gap-3 self-start md:self-auto">
                                <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">
                                  <Icon name="timer" size={20} />
                                </div>
                                  <div>
                                    <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Sisa Waktu Sesi</p>
                                    <p className="text-xl font-black text-blue-700 font-mono tracking-wider">
                                      <LiveCountdownText expiresAtMs={activeComplaint.expiresAtMs || (activeComplaint.createdAtMs || activeComplaint.id) + 3600000} />
                                    </p>
                                  </div>
                                </div>
                              </div>
                            </div>

                            
                            <div className="bg-white rounded-3xl border-2 border-blue-400 shadow-md p-5 sm:p-6 space-y-4">
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                                <div>
                                  <div className="flex items-center gap-2">
                                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-amber-100 text-amber-800">
                                      {activeComplaint.status || 'Sedang Diproses'}
                                    </span>
                                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-blue-100 text-blue-800 flex items-center gap-1 font-mono">
                                      <Icon name="clock" size={11} />
                                      <LiveCountdownText expiresAtMs={activeComplaint.expiresAtMs || (activeComplaint.createdAtMs || activeComplaint.id) + 3600000} />
                                    </span>
                                  </div>
                                  <h4 className="font-black text-slate-800 text-lg mt-1.5">{activeComplaint.title}</h4>
                                </div>
                                <span className="text-xs text-slate-500 font-bold">{formatDateIndo(activeComplaint.date)}</span>
                              </div>

                              
                              <div className="space-y-3 max-h-80 overflow-y-auto bg-slate-50 p-4 rounded-2xl border border-slate-200/80">
                                {activeComplaint.messages && activeComplaint.messages.map((m, idx) => {
                      const isAdmin = m.sender === 'Admin TU' || m.sender?.toLowerCase().includes('admin') || m.sender?.toLowerCase().includes('tu');
                      return <div key={idx} className={`flex flex-col ${isAdmin ? 'items-start mr-auto' : 'items-end ml-auto'} max-w-[85%]`}>
                                      <div className={`p-3.5 rounded-2xl text-xs shadow-xs ${isAdmin ? 'bg-white text-slate-800 border border-slate-200/90 rounded-tl-xs' : 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-tr-xs shadow-blue-500/10'}`}>
                                        <div className={`flex justify-between items-center gap-3 mb-1 text-[11px] font-black ${isAdmin ? 'text-blue-800' : 'text-blue-100'}`}>
                                          <span className="flex items-center gap-1">
                                            <Icon name={isAdmin ? 'shield-check' : 'user'} size={12} className={isAdmin ? 'text-blue-600' : 'text-blue-200'} />
                                            {isAdmin ? 'Petugas Tata Usaha (TU)' : 'Anda (Wali Murid)'}
                                          </span>
                                          <span className="text-[10px] opacity-75 font-medium">{formatDateTimeIndo(m.time, activeComplaint.date)}</span>
                                        </div>
                                        <p className="font-semibold whitespace-pre-wrap leading-relaxed">{m.text}</p>
                                        {m.imageUrl && <div className="mt-2">
                                            <img src={m.imageUrl} alt="Lampiran" loading="lazy" decoding="async" className="max-w-full max-h-56 object-cover rounded-xl shadow-xs" />
                                          </div>}
                                      </div>
                                    </div>;
                    })}
                              </div>

                              
                              <div className="flex items-center gap-2 pt-1">
                                <input type="file" id={`parent_file_${activeComplaint.id}`} className="hidden" accept="image/*" onChange={async e => {
                      const file = e.target.files[0];
                      if (file) {
                        const targetId = activeComplaint.id;
                        const textToSend = (replyText[targetId] || '').trim() || '(Mengirim Lampiran Foto)';
                        const compressed = await compressImageFileToDataUrl(file);
                        if (compressed) {
                          onReplyComplaint(targetId, textToSend, 'Wali Murid', compressed);
                          setReplyText(prev => ({
                            ...prev,
                            [targetId]: ''
                          }));
                        }
                      }
                    }} />
                                <button type="button" onClick={() => document.getElementById(`parent_file_${activeComplaint.id}`).click()} className="p-3 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-2xl transition-colors flex items-center justify-center shrink-0 border border-slate-300 shadow-sm" title="Kirim Foto / Lampiran">
                                  <Icon name="image" size={18} />
                                </button>
                                <input type="text" value={replyText[activeComplaint.id] || ''} onChange={e => setReplyText({
                      ...replyText,
                      [activeComplaint.id]: e.target.value
                    })} onKeyDown={e => {
                      if (e.key === 'Enter' && replyText[activeComplaint.id]?.trim()) {
                        onReplyComplaint(activeComplaint.id, replyText[activeComplaint.id].trim(), 'Wali Murid');
                        setReplyText({
                          ...replyText,
                          [activeComplaint.id]: ''
                        });
                      }
                    }} placeholder="Tulis balasan untuk Admin TU..." className="flex-1 px-4 py-3 bg-slate-50 border border-slate-300 rounded-2xl text-xs sm:text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-inner" />
                                <button type="button" onClick={() => {
                      if (replyText[activeComplaint.id]?.trim()) {
                        onReplyComplaint(activeComplaint.id, replyText[activeComplaint.id].trim(), 'Wali Murid');
                        setReplyText({
                          ...replyText,
                          [activeComplaint.id]: ''
                        });
                      }
                    }} className="px-5 py-3 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-2xl text-xs sm:text-sm transition-all flex items-center gap-1.5 shadow-md shadow-blue-500/20 active:scale-95 shrink-0">
                                  <Icon name="send" size={15} /> Balas
                                </button>
                              </div>
                            </div>
                          </div> : (<form onSubmit={e => {
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
              }} className="bg-slate-50 p-5 sm:p-7 rounded-3xl border border-slate-200/80 mb-8 space-y-4 shadow-xs">
                            <div className="flex items-center justify-between">
                              <h4 className="font-black text-slate-800 text-sm uppercase tracking-wide flex items-center gap-2">
                                <Icon name="plus-circle" size={17} className="text-blue-600" /> Buat Pengaduan Baru
                              </h4>
                              <span className="text-[11px] font-bold text-slate-400">Durasi Respons: Maks. 1 Jam</span>
                            </div>

                            <div>
                              <label className="block text-xs font-bold text-slate-600 mb-1.5">Subjek / Judul Pengaduan</label>
                              <input type="text" required value={complaintTitle} onChange={e => setComplaintTitle(e.target.value)} placeholder="Contoh: Kendala Pembayaran SPP / Pertanyaan Kegiatan" className="w-full px-4 py-3 bg-white border border-slate-300 rounded-2xl text-xs sm:text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-inner" />
                            </div>

                            <div>
                              <label className="block text-xs font-bold text-slate-600 mb-1.5">Pesan / Detail Pengaduan</label>
                              <textarea required rows="4" value={complaintContent} onChange={e => setComplaintContent(e.target.value)} placeholder="Tuliskan pengaduan atau pertanyaan Anda secara rinci..." className="w-full px-4 py-3 bg-white border border-slate-300 rounded-2xl text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none shadow-inner"></textarea>
                            </div>

                            <div>
                              <label className="block text-xs font-bold text-slate-600 mb-1.5">Lampirkan Foto / Gambar (Opsional)</label>
                              <div className="flex items-center gap-2 flex-wrap">
                                <input type="file" id="parent_new_complaint_file" className="hidden" accept="image/*" onChange={async e => {
                      const file = e.target.files[0];
                      if (file) {
                        const compressed = await compressImageFileToDataUrl(file);
                        if (compressed) setComplaintImage(compressed);
                      }
                    }} />
                                <button type="button" onClick={() => document.getElementById('parent_new_complaint_file').click()} className="px-4 py-2.5 bg-white hover:bg-slate-100 border border-slate-300 rounded-xl text-xs font-bold text-slate-700 flex items-center gap-2 shadow-xs transition-colors">
                                  <Icon name="image" size={15} className="text-blue-600" />
                                  <span>{complaintImage ? 'Ganti Lampiran Foto' : 'Pilih Foto / Gambar'}</span>
                                </button>
                                {complaintImage && <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 px-3 py-1.5 rounded-xl">
                                    <img src={complaintImage} alt="Preview" loading="lazy" decoding="async" className="w-8 h-8 object-cover rounded-lg border border-blue-200" />
                                    <span className="text-[11px] font-bold text-blue-900">Foto Terpilih</span>
                                    <button type="button" onClick={() => setComplaintImage('')} className="p-1 text-rose-500 hover:text-rose-700 rounded-full hover:bg-rose-50" title="Hapus Foto">
                                      <Icon name="x" size={13} />
                                    </button>
                                  </div>}
                              </div>
                            </div>

                            <div className="pt-2">
                              <button type="submit" className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-2xl text-sm shadow-md shadow-blue-500/25 transition-all flex items-center justify-center gap-2 active:scale-[0.99]">
                                <Icon name="send" size={16} /> Kirim Pengaduan (Mulai Sesi 1 Jam)
                              </button>
                            </div>
                            <p className="text-[11px] text-slate-400 font-medium italic text-center">
                              * Anda hanya dapat membuat 1 pengaduan dalam satu waktu. Pengaduan baru berikutnya dapat dibuat setelah pengaduan selesai atau waktu 1 jam habis.
                            </p>
                          </form>)}

                        
                        {pastComplaints.length > 0 && <div className="pt-2 border-t border-slate-100">
                            <button type="button" onClick={() => setShowPastComplaints(prev => !prev)} className="w-full py-3.5 px-5 bg-slate-50 hover:bg-slate-100/80 rounded-2xl border border-slate-200 flex items-center justify-between text-xs font-black text-slate-700 transition-colors">
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

                            {showPastComplaints && <div className="mt-4 space-y-4 animate-in fade-in duration-200">
                                {pastComplaints.map(comp => <div key={comp.id} className="bg-slate-50/70 rounded-2xl border border-slate-200 p-5 shadow-xs space-y-3">
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

                                  
                                  <div className="space-y-2 max-h-60 overflow-y-auto bg-white p-3.5 rounded-xl border border-slate-200">
                                    {comp.messages && comp.messages.map((m, idx) => {
                        const isAdmin = m.sender === 'Admin TU' || m.sender?.toLowerCase().includes('admin') || m.sender?.toLowerCase().includes('tu');
                        return <div key={idx} className={`flex flex-col ${isAdmin ? 'items-start mr-auto' : 'items-end ml-auto'} max-w-[85%]`}>
                                          <div className={`p-3 rounded-xl text-xs ${isAdmin ? 'bg-blue-50/80 text-slate-800 border border-blue-200' : 'bg-slate-100 text-slate-800 border border-slate-300'}`}>
                                            <div className="flex justify-between items-center gap-3 mb-1">
                                              <span className={`font-black text-[11px] flex items-center gap-1 ${isAdmin ? 'text-blue-800' : 'text-slate-800'}`}>
                                                <Icon name={isAdmin ? 'shield-check' : 'user'} size={12} className={isAdmin ? 'text-blue-600' : 'text-slate-500'} />
                                                {isAdmin ? 'Tata Usaha (TU)' : 'Wali Murid'}
                                              </span>
                                              <span className="text-[10px] text-slate-500 font-medium">{formatDateTimeIndo(m.time, comp.date)}</span>
                                            </div>
                                            <p className="font-medium whitespace-pre-wrap">{m.text}</p>
                                          </div>
                                        </div>;
                      })}
                                  </div>

                                  
                                  <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl flex items-center gap-2 text-xs text-amber-800 font-bold">
                                    <Icon name="lock" size={14} className="text-amber-600 shrink-0" />
                                    <span>Sesi pengaduan ini telah selesai & terkunci otomatis karena durasi 1 jam telah berakhir.</span>
                                  </div>
                                </div>)}
                            </div>}
                        </div>}

                      {!activeComplaint && pastComplaints.length === 0 && <p className="text-center py-6 text-slate-400 font-medium text-xs sm:text-sm">
                          Belum ada riwayat pengaduan sebelumnya.
                        </p>}
                    </div>
                  </section>}

                
                {activeTab === 'pengaturan' && <section className="space-y-6 animate-in fade-in duration-300">
                    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 sm:p-8 w-full max-w-4xl mx-auto">
                      <div className="text-center mb-8">
                        <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-blue-100 shadow-inner">
                          <Icon name="settings" size={32} />
                        </div>
                        <h3 className="text-2xl font-black text-slate-800 tracking-tight">Pengaturan Akun Wali Murid</h3>
                        <p className="text-sm text-slate-500 font-medium mt-1">Perbarui nomor WhatsApp dan ganti password akun login portal ananda.</p>
                      </div>

                      
                      <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 border border-slate-200 mb-6 space-y-3">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div>
                            <span className="text-[11px] font-black uppercase tracking-wider text-slate-500">Status Kredensial Login</span>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-xs font-mono font-black text-slate-800 bg-white px-2.5 py-1 rounded-lg border border-slate-200">
                                NIS: {student.nis}
                              </span>
                              {student.password && student.password.toString().trim() !== student.nis.toString().trim() && student.password.toString().trim() !== `Sb${student.nis.toString().trim()}` ? <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 text-xs font-black">
                                  <Icon name="lock" size={13} className="text-emerald-600" />
                                  <span>Password Kustom Aktif</span>
                                </span> : <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-100 text-blue-800 border border-blue-300 text-xs font-black">
                                  <Icon name="key" size={13} className="text-blue-600" />
                                  <span>Default Sistem (Sb{student.nis})</span>
                                </span>}
                            </div>
                          </div>

                          <button type="button" onClick={() => {
                    const defaultPwd = student.nis ? `Sb${student.nis}` : '123456';
                    if (confirm(`Apakah Anda ingin mengembalikan password akun ke Default Sistem (${defaultPwd})?\n\nSetelah direset, password lama Anda tidak akan berlaku lagi dan Anda harus masuk menggunakan password default (${defaultPwd}).`)) {
                      onUpdateParentSettings(student.id, {
                        password: defaultPwd,
                        nis: student.nis
                      });
                      setNewPassword('');
                      setConfirmPassword('');
                      setSettingsFeedback({
                        type: 'success',
                        text: `Password akun berhasil direset ke Default Sistem (${defaultPwd})! Password lama tidak berlaku lagi, gunakan password default ini untuk masuk.`
                      });
                    }
                  }} className="px-3.5 py-2 bg-white hover:bg-slate-100 text-slate-700 hover:text-blue-600 rounded-xl border border-slate-300 font-extrabold text-xs shadow-sm transition-all flex items-center gap-1.5 shrink-0 active:scale-95" title="Reset password ke default sistem (Sb[NIS])">
                            <Icon name="rotate-ccw" size={14} />
                            <span>Reset ke Default Sistem</span>
                          </button>
                        </div>
                        <p className="text-[11.5px] text-slate-500 font-medium leading-relaxed">
                          Password default akun adalah <strong>Sb[NIS]</strong> (contoh: <code>Sb{student.nis}</code>). Jika Anda mengembalikan password ke default, password lama Anda otomatis dibatalkan dan Anda masuk menggunakan password default tersebut.
                        </p>
                      </div>

                      
                      {settingsFeedback && <div className={`p-4 rounded-2xl mb-6 text-xs sm:text-sm font-bold flex items-center gap-3 animate-in fade-in ${settingsFeedback.type === 'error' ? 'bg-rose-50 border border-rose-200 text-rose-700' : 'bg-emerald-50 border border-emerald-200 text-emerald-800'}`}>
                          <Icon name={settingsFeedback.type === 'error' ? "alert-circle" : "check-circle"} size={18} className="shrink-0" />
                          <span>{settingsFeedback.text}</span>
                        </div>}

                      <form onSubmit={e => {
                e.preventDefault();
                setSettingsFeedback(null);
                const updateObj = {};
                if (newPhone.trim() && newPhone.trim() !== student.telepon) {
                  updateObj.telepon = newPhone.trim();
                }
                if (newPassword.trim()) {
                  if (newPassword.trim().length < 6) {
                    setSettingsFeedback({
                      type: 'error',
                      text: 'Password baru minimal harus 6 karakter demi keamanan akun.'
                    });
                    return;
                  }
                  const hasLetter = /[a-zA-Z]/.test(newPassword.trim());
                  const hasNumber = /[0-9]/.test(newPassword.trim());
                  if (!hasLetter || !hasNumber) {
                    setSettingsFeedback({
                      type: 'error',
                      text: 'Password baru harus berupa campuran angka dan huruf (seaman mungkin)!'
                    });
                    return;
                  }
                  if (newPassword.trim() !== confirmPassword.trim()) {
                    setSettingsFeedback({
                      type: 'error',
                      text: 'Konfirmasi password tidak cocok dengan password baru!'
                    });
                    return;
                  }
                  updateObj.password = newPassword.trim();
                }
                if (Object.keys(updateObj).length === 0) {
                  setSettingsFeedback({
                    type: 'error',
                    text: 'Tidak ada perubahan data yang disimpan.'
                  });
                  return;
                }
                onUpdateParentSettings(student.id, updateObj);
                setNewPassword('');
                setConfirmPassword('');
                setSettingsFeedback({
                  type: 'success',
                  text: updateObj.password ? 'Password akun berhasil diperbarui! Gunakan password baru ini untuk login berikutnya.' : 'Nomor WhatsApp berhasil diperbarui!'
                });
              }} className="space-y-6">
                        <div className="space-y-2">
                          <label className="block text-xs font-black text-slate-700 uppercase tracking-wide">Nomor WhatsApp Wali Murid</label>
                          <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                              <Icon name="phone" size={18} />
                            </div>
                            <input id="settings-phone" name="phone" autoComplete="tel" type="text" value={newPhone} onChange={e => setNewPhone(e.target.value)} placeholder="Contoh: 08123456789" className="w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-300 rounded-2xl text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all" />
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
                              <input id="settings-password" name="newPassword" autoComplete="new-password" type={showNewPassword ? "text" : "password"} value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="Kosongkan jika tidak ganti" className="w-full pl-11 pr-11 py-3.5 bg-slate-50 border border-slate-300 rounded-2xl text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all" />
                              <button type="button" onClick={() => setShowNewPassword(!showNewPassword)} className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 transition-colors">
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
                              <input id="settings-confirm-password" name="confirmPassword" autoComplete="new-password" type={showNewPassword ? "text" : "password"} value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="Ulangi password baru" disabled={!newPassword} className="w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-300 rounded-2xl text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all disabled:opacity-50 disabled:cursor-not-allowed" />
                            </div>
                          </div>
                        </div>

                        <div className="pt-2">
                          <button type="submit" className="w-full py-4 bg-blue-600 hover:bg-blue-700 active:scale-[0.99] text-white font-black rounded-2xl shadow-md shadow-blue-500/25 transition-all flex items-center justify-center gap-2 text-sm sm:text-base">
                            <Icon name="save" size={18} />
                            <span>Simpan Perubahan Akun</span>
                          </button>
                        </div>
                      </form>
                    </div>
                  </section>}
              </div>
            </main>
          </div>

        </div>;
});
