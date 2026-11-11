function App({
  initialHandoff = null
}) {
  const handoffConsumedRef = useRef(false);
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const tabSession = sessionStorage.getItem('spp_tab_session');
      if (tabSession && tabSession.trim().length > 2) {
        const parsed = JSON.parse(tabSession);
        if (parsed && typeof parsed === 'object' && parsed.role) {
          return parsed;
        }
      }
      return null;
    } catch (e) {
      return null;
    }
  });
  const [mySessionToken, setMySessionToken] = useState(() => {
    try {
      return sessionStorage.getItem('spp_my_session_token') || '';
    } catch (e) {
      return '';
    }
  });
  const [pendingUser, setPendingUser] = useState(() => initialHandoff && initialHandoff.userObj ? initialHandoff.userObj : null);
  const [isLoadingPortal, setIsLoadingPortal] = useState(() => Boolean(initialHandoff && initialHandoff.userObj));
  const [kickedModal, setKickedModal] = useState(null);
  const currentUserRef = useRef(currentUser);
  currentUserRef.current = currentUser;
  const pendingUserRef = useRef(pendingUser);
  pendingUserRef.current = pendingUser;
  const mySessionTokenRef = useRef(mySessionToken);
  mySessionTokenRef.current = mySessionToken;
  const authChannelRef = useRef(null);
  const bcChannelRef = useRef(null);
  const pendingBroadcastRef = useRef(null);
  const sessionSyncPendingRef = useRef(false);
  const lastVisibilityFetchRef = useRef(0);
  const rawDbSnapshotRef = useRef({});
  const studentsRef = useRef([]);
  const transactionsRef = useRef([]);
  const announcementsRef = useRef([]);
  const complaintsRef = useRef([]);
  const notesRef = useRef([]);
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
    return readJsonLsCached('spp_extended_settings', null) || readJsonLsCached('spp_cached_settings', DEFAULT_SETTINGS);
  });
  const [students, setStudents] = useState(() => {
    if (initialHandoff && Array.isArray(initialHandoff.students) && initialHandoff.students.length > 0) {
      return initialHandoff.students;
    }
    const c = readJsonLsCached('spp_cached_students', []);
    return Array.isArray(c) ? c : [];
  });
  const [transactions, setTransactions] = useState(() => {
    const c = readJsonLsCached('spp_cached_transactions', []);
    return Array.isArray(c) ? c.map(t => ({
      ...t,
      date: formatDateIndo(t.date)
    })) : [];
  });
  const [announcements, setAnnouncements] = useState(() => {
    const c = readJsonLsCached('spp_cached_announcements', []);
    return Array.isArray(c) ? c.map(a => ({
      ...a,
      date: formatDateIndo(a.date)
    })) : [];
  });
  const [complaints, setComplaints] = useState(() => {
    const c = readJsonLsCached('spp_cached_complaints', []);
    return Array.isArray(c) ? c.map(cp => ({
      ...cp,
      date: formatDateIndo(cp.date),
      messages: Array.isArray(cp.messages) ? cp.messages.map(m => ({
        ...m,
        time: formatDateTimeIndo(m.time, cp.date)
      })) : []
    })) : [];
  });
  const [notes, setNotes] = useState(() => {
    const c = readJsonLsCached('spp_cached_notes', []);
    return Array.isArray(c) ? c.map(n => ({
      ...n,
      date: formatDateTimeIndo(n.date),
      comments: Array.isArray(n.comments) ? n.comments.map(cm => ({
        ...cm,
        time: formatDateTimeIndo(cm.time, n.date)
      })) : []
    })) : [];
  });
  studentsRef.current = students;
  transactionsRef.current = transactions;
  announcementsRef.current = announcements;
  complaintsRef.current = complaints;
  notesRef.current = notes;
  const [selectedKuitansi, setSelectedKuitansi] = useState(null);
  const [activeMidtransBill, setActiveMidtransBill] = useState(null);
  const [parentNavIntent, setParentNavIntent] = useState(null);
  const pendingSyncInFlightRef = useRef(new Set());
  const resumingSnapRef = useRef(false);
  const [toast, setToast] = useState(null);
  const [crudPopup, setCrudPopup] = useState(null);
  const [notesReadSync, setNotesReadSync] = useState(0);
  useEffect(() => {
    const handleNoteReadSync = () => setNotesReadSync(s => s + 1);
    window.addEventListener('spp_note_read_updated', handleNoteReadSync);
    return () => window.removeEventListener('spp_note_read_updated', handleNoteReadSync);
  }, []);
  const unreadNotesRepliesList = useMemo(() => {
    try {
      const readMap = readJsonLsCached('spp_admin_read_note_replies', {}) || {};
      return (notes || []).map(n => {
        const comments = Array.isArray(n.comments) ? n.comments : [];
        if (n.isRead && readMap[n.id] === undefined) return null;
        const readCount = readMap[n.id] || 0;
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
  const unreadTransactions = useMemo(() => transactions.filter(t => !t.isRead && (t.status === 'Lunas' || t.status === 'lunas' || t.status === 'Berhasil' || t.status === 'Sukses')), [transactions]);
  const totalAdminUnread = pendingComplaints.length + unreadTransactions.length + unreadNotesRepliesList.length;
  const tunggakanStudentsCount = useMemo(() => students.filter(s => s.unpaidMonths && s.unpaidMonths.length > 0 || s.unpaidCount > 0).length || null, [students]);
  const showToast = useCallback((title, message, type = 'success', extra = {}) => {
    setToast({
      title,
      message,
      type
    });
    if (!extra || !extra.toastOnly) {
      setCrudPopup({
        title,
        message,
        type,
        ...extra
      });
    }
    setTimeout(() => {
      setToast(null);
    }, 4000);
  }, []);
  const showConfirmPopup = useCallback(({
    title,
    message,
    onConfirm,
    onCancel,
    confirmText,
    cancelText,
    details
  }) => {
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
  }, []);
  const handleShowKuitansi = useCallback(trx => setSelectedKuitansi(trx), []);
  const handleCloseKuitansi = useCallback(() => setSelectedKuitansi(null), []);
  const upsertTransactionState = useCallback(mappedTrx => {
    if (!mappedTrx) return;
    const isSameBillForStudent = (a, b) => {
      const aStudentId = a.studentId ? String(a.studentId) : '';
      const bStudentId = b.studentId ? String(b.studentId) : '';
      const aName = String(a.studentName || '').trim().toLowerCase();
      const bName = String(b.studentName || '').trim().toLowerCase();
      const sameStudent = aStudentId && bStudentId ? aStudentId === bStudentId : Boolean(aName && bName && aName === bName);
      if (!sameStudent) return false;
      const am = String(a.month || '').trim().toLowerCase();
      const bm = String(b.month || '').trim().toLowerCase();
      if (!am || !bm) return false;
      const aArr = am.includes('tunggakan') || am.includes('kelas sebelumnya');
      const bArr = bm.includes('tunggakan') || bm.includes('kelas sebelumnya');
      if (aArr && bArr) return true;
      return am === bm || !aArr && !bArr && (am.startsWith(bm) || bm.startsWith(am));
    };
    setTransactions(prev => {
      const exists = prev.some(t => mappedTrx.orderId && t.orderId === mappedTrx.orderId || mappedTrx.id && t.id === mappedTrx.id);
      const isTargetMatch = t => mappedTrx.orderId && t.orderId === mappedTrx.orderId || mappedTrx.id && t.id === mappedTrx.id;
      const incomingSettled = isTrxSettled(mappedTrx);
      const incomingPending = isTrxPendingStatus(mappedTrx);
      let next = exists ? prev.map(t => isTargetMatch(t) ? {
        ...t,
        ...mappedTrx
      } : t) : [mappedTrx, ...prev];
      if (incomingSettled || incomingPending) {
        next = next.map(t => {
          if (isTargetMatch(t) || !isTrxPendingStatus(t) || !isSameBillForStudent(t, mappedTrx)) {
            return t;
          }
          return {
            ...t,
            status: 'Dibatalkan'
          };
        });
      }
      writeJsonLsCached('spp_cached_transactions', next);
      return next;
    });
  }, []);
  const handlePayMidtrans = useCallback(bill => {
    if (!bill) return;
    const activeStudent = currentUserRef.current?.student || null;
    const studentNameLower = String(activeStudent?.name || '').trim().toLowerCase();
    const billMonthLower = String(bill.month || '').trim().toLowerCase();
    const isArrearsBill = Boolean(bill.isArrearsPayment) || billMonthLower.includes('tunggakan') || billMonthLower.includes('kelas sebelumnya');
    const studentTransactions = (transactionsRef.current || []).filter(t => activeStudent ? t.studentId === activeStudent.id || studentNameLower && String(t.studentName || '').trim().toLowerCase() === studentNameLower : true);
    const alreadyPaid = studentTransactions.some(t => {
      if (!isTrxSettled(t)) return false;
      const tLower = String(t.month || '').trim().toLowerCase();
      if (isArrearsBill) return tLower.includes('tunggakan') || tLower.includes('kelas sebelumnya');
      return tLower && (tLower === billMonthLower || billMonthLower.startsWith(tLower));
    });
    if (alreadyPaid) {
      showToast('Tagihan Sudah Lunas', `Tagihan ${bill.month} sudah berstatus Lunas.`, 'info');
      return;
    }
    const nowMs = Date.now();
    const activePending = studentTransactions.find(t => {
      if (!isTrxPendingStatus(t)) return false;
      const expMs = computeClientTransactionExpiryMs(t);
      if (expMs > 0 && nowMs >= expMs) return false;
      const tLower = String(t.month || '').trim().toLowerCase();
      if (isArrearsBill) return tLower.includes('tunggakan') || tLower.includes('kelas sebelumnya');
      return tLower && (tLower === billMonthLower || billMonthLower.startsWith(tLower) || tLower.startsWith(billMonthLower));
    });
    if (activePending) {
      setParentNavIntent({
        tab: 'spp',
        subFilter: 'pending',
        nonce: Date.now()
      });
      showToast('Transaksi Pending Aktif', `Masih ada transaksi Pending (${activePending.orderId || bill.month}). Selesaikan atau cek status di menu Pending terlebih dahulu.`, 'info');
      return;
    }
    setActiveMidtransBill(bill);
  }, [showToast]);
  const handleCloseMidtrans = useCallback(() => setActiveMidtransBill(null), []);
  const handleOpenAdminBell = useCallback(() => setShowAdminMobileBell(true), []);
  const handleCloseToast = useCallback(() => setToast(null), []);
  const handleClosePopup = useCallback(() => setCrudPopup(null), []);
  const handleCloseKickedModal = useCallback(() => setKickedModal(null), []);
  const handleCompleteLoadingPortal = useCallback(() => {
    const userToMount = pendingUserRef.current;
    if (userToMount) setCurrentUser(userToMount);
    setIsLoadingPortal(false);
    setPendingUser(null);
  }, []);
  const handleForceLogout = useCallback((userName, device = 'Perangkat lain', time = 'Baru saja') => {
    ensureDashboardCss();
    setCurrentUser(null);
    setPendingUser(null);
    setIsLoadingPortal(false);
    setMySessionToken('');
    currentUserRef.current = null;
    pendingUserRef.current = null;
    mySessionTokenRef.current = '';
    try {
      sessionStorage.removeItem('spp_tab_session');
      sessionStorage.removeItem('spp_my_session_token');
      localStorage.removeItem('spp_admin_session');
      localStorage.removeItem('spp_admin_token');
      localStorage.removeItem('spp_parent_session');
      localStorage.removeItem('spp_parent_token');
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
    setCurrentUser(null);
    setPendingUser(null);
    setIsLoadingPortal(false);
    setMySessionToken('');
    currentUserRef.current = null;
    pendingUserRef.current = null;
    mySessionTokenRef.current = '';
    try {
      sessionStorage.removeItem('spp_tab_session');
      sessionStorage.removeItem('spp_my_session_token');
      localStorage.removeItem('spp_admin_session');
      localStorage.removeItem('spp_admin_token');
      localStorage.removeItem('spp_parent_session');
      localStorage.removeItem('spp_parent_token');
      localStorage.removeItem('spp_user_session');
      localStorage.removeItem('spp_my_session_token');
    } catch (e) {}
  }, []);
  const handleUserLogin = async (userObj, opts = {}) => {
    const cssReadyPromise = ensureDashboardCss();
    const newSessionToken = 'sess_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
    try {
      sessionStorage.setItem('spp_tab_session', JSON.stringify(userObj));
      sessionStorage.setItem('spp_intended_role', userObj.role);
      sessionStorage.setItem('spp_my_session_token', newSessionToken);
      localStorage.removeItem('spp_admin_session');
      localStorage.removeItem('spp_admin_token');
      localStorage.removeItem('spp_parent_session');
      localStorage.removeItem('spp_parent_token');
      localStorage.removeItem('spp_user_session');
      localStorage.removeItem('spp_my_session_token');
    } catch (e) {}
    setMySessionToken(newSessionToken);
    mySessionTokenRef.current = newSessionToken;
    pendingUserRef.current = userObj;
    const deviceType = /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent) ? 'Smartphone (HP)' : 'Komputer (PC/Laptop)';
    const loginTime = new Date().toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit'
    });
    const userKey = userObj.role === 'parent' ? 'student_' + userObj.student.id : 'admin_account';
    const broadcastPayload = {
      userKey,
      sessionToken: newSessionToken,
      device: deviceType,
      time: loginTime
    };
    try {
      if (typeof BroadcastChannel !== 'undefined') {
        if (bcChannelRef.current) {
          bcChannelRef.current.postMessage(broadcastPayload);
        } else {
          const bc = new BroadcastChannel('spp_single_session_bc');
          bc.postMessage(broadcastPayload);
          setTimeout(() => {
            try {
              bc.close();
            } catch (err) {}
          }, 500);
        }
      }
      localStorage.setItem('spp_single_session_ping', JSON.stringify({
        ...broadcastPayload,
        nonce: Math.random()
      }));
    } catch (e) {}
    if (AppApi.isConnected()) {
      sessionSyncPendingRef.current = true;
      try {
        if (userObj.role === 'parent' && userObj.student) {
          await AppApi.auth.syncSessionToken('parent', {
            studentId: userObj.student.id,
            newSessionToken,
            arrearsNote: userObj.student.arrearsNote
          });
          setStudents(prev => prev.map(s => s.id === userObj.student.id ? {
            ...s,
            sessionToken: newSessionToken
          } : s));
        } else if (userObj.role === 'admin') {
          const stgId = await AppApi.auth.syncSessionToken('admin', {
            newSessionToken
          }, settings?.id || initialHandoff?.settings?.id);
          if (stgId) {
            setSettings(prev => ({
              ...prev,
              id: stgId,
              sessionToken: newSessionToken
            }));
          }
        }
        const rtMsg = {
          type: 'broadcast',
          event: 'single_session_login',
          payload: broadcastPayload
        };
        const ch = authChannelRef.current || AppApi.auth.createSessionChannel();
        if (ch && ch.state === 'joined') {
          ch.send(rtMsg);
        } else {
          pendingBroadcastRef.current = rtMsg;
        }
      } catch (err) {
        console.warn("Gagal sinkronisasi sesi ke database:", err);
      } finally {
        sessionSyncPendingRef.current = false;
      }
    }
    await cssReadyPromise;
    if (!opts || !opts.alreadyLoading) {
      setPendingUser(userObj);
      setIsLoadingPortal(true);
    }
  };
  const fetchData = useCallback(async (isManual = false) => {
    const connected = AppApi.isConnected();
    if (isManual) {
      setIsRefreshing(true);
      showToast("Data Diperbarui", "Memuat ulang seluruh data siswa, transaksi, berita & pengaduan...", "info");
    }
    try {
      if (connected) {
        const activeUser = currentUserRef.current;
        const shouldFetchAll = isManual || !!activeUser;
        if (!shouldFetchAll) {
          const bundle = await AppApi.sync.fetchGuestBundle();
          if (!bundle) return;
          const {
            stRes,
            stgRes
          } = bundle;
          if (stRes.status === 'fulfilled' && stRes.value && stRes.value.data) {
            const rawStudents = stRes.value.data;
            const rawStudentsJson = JSON.stringify(rawStudents);
            if (isManual || rawDbSnapshotRef.current.students !== rawStudentsJson) {
              rawDbSnapshotRef.current.students = rawStudentsJson;
              const mappedStudents = rawStudents.map(mapStudentFromDb);
              setStudents(mappedStudents);
              writeJsonLsCached('spp_cached_students', mappedStudents);
            }
          }
          if (stgRes.status === 'fulfilled' && stgRes.value && stgRes.value.data && stgRes.value.data.length > 0) {
            const rawSettings = stgRes.value.data[0];
            const rawSettingsJson = JSON.stringify(rawSettings);
            if (isManual || rawDbSnapshotRef.current.settings !== rawSettingsJson) {
              rawDbSnapshotRef.current.settings = rawSettingsJson;
              const mappedSettings = mapSettingsFromDb(rawSettings);
              setSettings(mappedSettings);
              writeJsonLsCached('spp_cached_settings', mappedSettings);
            }
          }
        } else {
          const bundle = await AppApi.sync.fetchPortalBundle();
          if (!bundle) return;
          const {
            stRes,
            trRes,
            anRes,
            cpRes,
            ntRes,
            stgRes
          } = bundle;
          if (stRes.status === 'fulfilled' && stRes.value && stRes.value.data) {
            const rawStudents = stRes.value.data;
            const activeToken = mySessionTokenRef.current;
            if (!sessionSyncPendingRef.current && activeUser && activeUser.role === 'parent' && activeUser.student && activeToken) {
              const freshRawSt = rawStudents.find(s => s.id === activeUser.student.id);
              if (freshRawSt && freshRawSt.session_token && freshRawSt.session_token !== activeToken) {
                handleForceLogout(freshRawSt.name, 'Perangkat / Tab lain');
                return;
              }
            }
            const rawStudentsJson = JSON.stringify(rawStudents);
            if (isManual || rawDbSnapshotRef.current.students !== rawStudentsJson) {
              rawDbSnapshotRef.current.students = rawStudentsJson;
              const mappedStudents = rawStudents.map(mapStudentFromDb);
              setStudents(mappedStudents);
              writeJsonLsCached('spp_cached_students', mappedStudents);
            }
          }
          if (stgRes.status === 'fulfilled' && stgRes.value && stgRes.value.data && stgRes.value.data.length > 0) {
            const rawSettings = stgRes.value.data[0];
            const activeToken = mySessionTokenRef.current;
            if (!sessionSyncPendingRef.current && activeUser && activeUser.role === 'admin' && activeToken && rawSettings.session_token && rawSettings.session_token !== activeToken) {
              handleForceLogout(activeUser.name || rawSettings.admin_name || 'Admin TU', 'Perangkat / Tab lain');
              return;
            }
            const rawSettingsJson = JSON.stringify(rawSettings);
            if (isManual || rawDbSnapshotRef.current.settings !== rawSettingsJson) {
              rawDbSnapshotRef.current.settings = rawSettingsJson;
              const mappedSettings = mapSettingsFromDb(rawSettings);
              setSettings(mappedSettings);
              writeJsonLsCached('spp_cached_settings', mappedSettings);
            }
          }
          if (trRes.status === 'fulfilled' && trRes.value && trRes.value.data) {
            const rawTr = trRes.value.data;
            const rawTrJson = JSON.stringify(rawTr);
            if (isManual || rawDbSnapshotRef.current.transactions !== rawTrJson) {
              rawDbSnapshotRef.current.transactions = rawTrJson;
              const mappedTr = rawTr.map(mapTransactionFromDb);
              setTransactions(mappedTr);
              writeJsonLsCached('spp_cached_transactions', mappedTr);
            }
          }
          if (anRes.status === 'fulfilled' && anRes.value && anRes.value.data) {
            const rawAn = anRes.value.data;
            const rawAnJson = JSON.stringify(rawAn);
            if (isManual || rawDbSnapshotRef.current.announcements !== rawAnJson) {
              rawDbSnapshotRef.current.announcements = rawAnJson;
              const mappedAn = rawAn.map(mapAnnouncementFromDb);
              setAnnouncements(mappedAn);
              writeJsonLsCached('spp_cached_announcements', mappedAn);
            }
          }
          if (cpRes.status === 'fulfilled' && cpRes.value && cpRes.value.data) {
            const rawCp = cpRes.value.data;
            const rawCpJson = JSON.stringify(rawCp);
            if (isManual || rawDbSnapshotRef.current.complaints !== rawCpJson) {
              rawDbSnapshotRef.current.complaints = rawCpJson;
              const mappedCp = rawCp.map(mapComplaintFromDb);
              setComplaints(mappedCp);
              writeJsonLsCached('spp_cached_complaints', mappedCp);
            }
          }
          if (ntRes.status === 'fulfilled' && ntRes.value && ntRes.value.data) {
            const rawNt = ntRes.value.data;
            const rawNtJson = JSON.stringify(rawNt);
            if (isManual || rawDbSnapshotRef.current.notes !== rawNtJson) {
              rawDbSnapshotRef.current.notes = rawNtJson;
              const mappedNt = rawNt.map(mapNoteFromDb);
              setNotes(mappedNt);
              writeJsonLsCached('spp_cached_notes', mappedNt);
            }
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
  }, [handleForceLogout, showToast]);
  useEffect(() => {
    const handleIncomingSessionBroadcast = payload => {
      if (!payload || !payload.sessionToken || !payload.userKey) return;
      const activeUser = currentUserRef.current || pendingUserRef.current;
      const activeToken = mySessionTokenRef.current;
      if (!activeUser || !activeToken) return;
      const myKey = activeUser.role === 'parent' ? 'student_' + activeUser.student?.id : 'admin_account';
      if (payload.userKey === myKey && payload.sessionToken !== activeToken) {
        handleForceLogout(activeUser.role === 'parent' ? activeUser.student?.name : activeUser.name || 'Admin', payload.device || 'Perangkat lain', payload.time || 'Baru saja');
      }
    };
    let bc = null;
    try {
      if (typeof BroadcastChannel !== 'undefined') {
        bc = new BroadcastChannel('spp_single_session_bc');
        bcChannelRef.current = bc;
        bc.onmessage = event => handleIncomingSessionBroadcast(event.data);
      }
    } catch (e) {}
    const handleStoragePing = e => {
      if (e.key === 'spp_single_session_ping' && e.newValue) {
        try {
          handleIncomingSessionBroadcast(JSON.parse(e.newValue));
        } catch (err) {}
      }
    };
    window.addEventListener('storage', handleStoragePing);
    let authChannel = null;
    if (AppApi.isConnected()) {
      authChannel = AppApi.auth.subscribeSessionChannel(payload => {
        handleIncomingSessionBroadcast(payload);
      }, ch => {
        if (pendingBroadcastRef.current) {
          const queued = pendingBroadcastRef.current;
          pendingBroadcastRef.current = null;
          ch.send(queued);
        }
      });
      authChannelRef.current = authChannel;
    }
    return () => {
      window.removeEventListener('storage', handleStoragePing);
      if (bc) {
        if (bcChannelRef.current === bc) bcChannelRef.current = null;
        try {
          bc.close();
        } catch (e) {}
      }
      if (authChannel) {
        if (authChannelRef.current === authChannel) authChannelRef.current = null;
        AppApi.auth.unsubscribeSessionChannel(authChannel);
      }
    };
  }, [handleForceLogout]);
  useEffect(() => {
    fetchData(false);
    const interval = setInterval(() => {
      fetchData(false);
    }, 30000);
    const handleVisibilityCheck = () => {
      if (document.visibilityState === 'visible' && currentUserRef.current && !sessionSyncPendingRef.current) {
        const now = Date.now();
        if (now - lastVisibilityFetchRef.current > 1500) {
          lastVisibilityFetchRef.current = now;
          fetchData(false);
        }
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityCheck);
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityCheck);
    };
  }, [fetchData]);
  useEffect(() => {
    try {
      document.documentElement.classList.remove('spp-has-session');
    } catch (e) {}
    if (initialHandoff && initialHandoff.userObj && !handoffConsumedRef.current) {
      handoffConsumedRef.current = true;
      handleUserLogin(initialHandoff.userObj, {
        alreadyLoading: true
      });
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
  const handleUpdateSettings = useCallback(async newSettings => {
    setSettings(newSettings);
    writeJsonLsCached('spp_extended_settings', newSettings);
    writeJsonLsCached('spp_cached_settings', newSettings);
    showToast("Pengaturan Disimpan", "Pengaturan sekolah & database berhasil diperbarui.", "success");
    if (AppApi.isConnected()) {
      try {
        const activePeriodName = newSettings.activePeriodName || newSettings.academicPeriods && newSettings.academicPeriods.find(p => p.isActive)?.name || `Periode ${newSettings.academicYear || '2025/2026'}`;
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
        await AppApi.settings.save(extendedPayload, basePayload, newSettings.id);
      } catch (err) {
        console.error("Gagal simpan settings ke Supabase:", err);
      }
    }
  }, [showToast]);
  const handleAddAnnouncement = useCallback(async annData => {
    const formattedDate = formatDateIndo(annData.date || new Date());
    const newAnn = {
      id: Date.now(),
      ...annData,
      date: formattedDate
    };
    setAnnouncements(prev => [newAnn, ...prev]);
    showToast("Berita Ditambahkan", `Berita "${annData.title}" berhasil ditambahkan & disinkronkan.`, "success");
    if (AppApi.isConnected()) {
      try {
        await AppApi.announcements.create({
          title: annData.title,
          content: annData.content,
          image_url: annData.imageUrl || '',
          date: formattedDate
        });
      } catch (err) {
        console.error("Gagal simpan pengumuman ke Supabase:", err);
      }
    }
  }, [showToast]);
  const handleUpdateAnnouncement = useCallback(async (id, updatedObj) => {
    const formattedObj = {
      ...updatedObj,
      date: formatDateIndo(updatedObj.date || new Date())
    };
    setAnnouncements(prev => prev.map(a => a.id === id ? {
      ...a,
      ...formattedObj
    } : a));
    showToast("Berita Diperbarui", `Perubahan berita "${updatedObj.title}" berhasil disimpan.`, "success");
    if (AppApi.isConnected()) {
      try {
        await AppApi.announcements.update(id, {
          title: formattedObj.title,
          content: formattedObj.content,
          image_url: formattedObj.imageUrl || '',
          date: formattedObj.date
        });
      } catch (err) {
        console.error("Gagal update pengumuman ke Supabase:", err);
      }
    }
  }, [showToast]);
  const handleDeleteAnnouncement = useCallback(async id => {
    const target = announcementsRef.current.find(a => a.id === id);
    showConfirmPopup({
      title: "Hapus Berita Pengumuman?",
      message: `Apakah Anda yakin ingin menghapus pengumuman "${target ? target.title : ''}" dari portal? Data yang dihapus tidak dapat dipulihkan.`,
      confirmText: "Ya, Hapus",
      cancelText: "Batal",
      onConfirm: async () => {
        setAnnouncements(prev => prev.filter(a => a.id !== id));
        showToast("Berita Dihapus", `Berita "${target ? target.title : ''}" telah berhasil dihapus dari sistem.`, "delete");
        if (AppApi.isConnected()) {
          try {
            await AppApi.announcements.remove(id);
          } catch (err) {
            console.error("Gagal hapus pengumuman dari Supabase:", err);
          }
        }
      }
    });
  }, [showConfirmPopup, showToast]);
  const handleAddComplaint = useCallback(async compData => {
    const now = Date.now();
    const nowObj = new Date(now);
    const formattedDate = formatDateIndo(compData.date || nowObj);
    const clockStr = nowObj.toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit'
    }).replace(/\./g, ':');
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
    if (AppApi.isConnected()) {
      try {
        const validStudentId = compData.studentId && typeof compData.studentId === 'string' && compData.studentId.includes('-') ? compData.studentId : null;
        const {
          data
        } = await AppApi.complaints.create({
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
        });
        if (data && data[0]) {
          const mapped = mapComplaintFromDb(data[0]);
          setComplaints(prev => prev.map(c => c.id === now ? mapped : c));
        }
      } catch (err) {}
    }
  }, [showToast]);
  const handleReplyComplaint = useCallback(async (id, replyText, senderRole = 'Admin TU', imageUrl = null) => {
    let updatedMessages = [];
    let updatedStatus = 'Sudah Ditangani';
    const isFromAdmin = senderRole === 'Admin TU';
    setComplaints(prev => prev.map(c => {
      if (c.id === id) {
        const isExpired = Date.now() > (c.expiresAtMs || c.createdAtMs + 3600000);
        if (isExpired) return c;
        const nowObj = new Date();
        const clockStr = nowObj.toLocaleTimeString('id-ID', {
          hour: '2-digit',
          minute: '2-digit'
        }).replace(/\./g, ':');
        const newMsg = {
          sender: senderRole,
          senderRole: isFromAdmin ? 'admin' : 'parent',
          text: replyText,
          imageUrl: imageUrl,
          time: `${formatDateIndo(nowObj)} • ${clockStr} WIB`
        };
        const existingMsgs = c.messages && c.messages.length > 0 ? [...c.messages] : [{
          sender: 'Wali Murid',
          text: c.content,
          time: '-'
        }];
        if (c.adminReply && existingMsgs.length === 1) {
          existingMsgs.push({
            sender: 'Admin TU',
            text: c.adminReply,
            time: '-'
          });
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
    if (isFromAdmin) {
      try {
        const storedList = readJsonLsCached('spp_admin_read_complaints', []);
        const list = Array.isArray(storedList) ? [...storedList] : [];
        if (!list.includes(id)) {
          list.push(id);
          writeJsonLsCached('spp_admin_read_complaints', list);
        }
        const storedMsgs = readJsonLsCached('spp_admin_read_complaint_msgs', {});
        const msgCounts = {
          ...(storedMsgs && typeof storedMsgs === 'object' ? storedMsgs : {})
        };
        const targetC = complaintsRef.current.find(c => c.id === id);
        msgCounts[id] = Math.max(updatedMessages && updatedMessages.length || 0, targetC && Array.isArray(targetC.messages) ? targetC.messages.length + 1 : 1);
        writeJsonLsCached('spp_admin_read_complaint_msgs', msgCounts);
      } catch (e) {}
    }
    showToast("Pesan Terkirim", `Pesan balasan dari ${senderRole} berhasil terkirim.`, "success");
    if (AppApi.isConnected()) {
      try {
        await AppApi.complaints.reply(id, {
          admin_reply: replyText,
          messages: JSON.stringify(updatedMessages),
          status: updatedStatus,
          is_read: isFromAdmin ? true : false
        });
      } catch (err) {}
    }
  }, [showToast]);
  const handleToggleComplaintStatus = useCallback(async id => {
    let nextStatus = 'Belum Ditangani';
    setComplaints(prev => prev.map(c => {
      if (c.id === id) {
        nextStatus = c.status === 'Sudah Ditangani' ? 'Belum Ditangani' : 'Sudah Ditangani';
        return {
          ...c,
          status: nextStatus
        };
      }
      return c;
    }));
    showToast("Status Pengaduan", `Status pengaduan diubah menjadi "${nextStatus}".`, "info");
    if (AppApi.isConnected()) {
      try {
        await AppApi.complaints.toggleStatus(id, nextStatus);
      } catch (err) {}
    }
  }, [showToast]);
  const handleMarkReadNotification = useCallback(async (type, id) => {
    if (type === 'complaint') {
      const target = (complaintsRef.current || []).find(c => c.id === id);
      const msgLen = target && Array.isArray(target.messages) ? target.messages.length : 0;
      try {
        const listRaw = readJsonLsCached('spp_admin_read_complaints', []);
        const list = Array.isArray(listRaw) ? [...listRaw] : [];
        if (!list.includes(id)) {
          list.push(id);
          writeJsonLsCached('spp_admin_read_complaints', list);
        }
        const msgCounts = {
          ...(readJsonLsCached('spp_admin_read_complaint_msgs', {}) || {})
        };
        msgCounts[id] = Math.max(msgCounts[id] || 0, msgLen);
        writeJsonLsCached('spp_admin_read_complaint_msgs', msgCounts);
      } catch (e) {}
      setComplaints(prev => {
        const next = prev.map(c => c.id === id ? {
          ...c,
          isRead: true
        } : c);
        writeJsonLsCached('spp_cached_complaints', next);
        return next;
      });
      await AppApi.complaints.markRead(id);
    } else if (type === 'transaction') {
      try {
        const listRaw = readJsonLsCached('spp_admin_read_trx', []);
        const list = Array.isArray(listRaw) ? [...listRaw] : [];
        if (!list.includes(id)) {
          list.push(id);
          writeJsonLsCached('spp_admin_read_trx', list);
        }
      } catch (e) {}
      setTransactions(prev => {
        const next = prev.map(t => t.id === id ? {
          ...t,
          isRead: true
        } : t);
        writeJsonLsCached('spp_cached_transactions', next);
        return next;
      });
      await AppApi.transactions.markRead(id);
    } else if (type === 'note') {
      const target = (notesRef.current || []).find(n => n.id === id);
      const commentLen = target && Array.isArray(target.comments) ? target.comments.length : 0;
      try {
        const readMap = {
          ...(readJsonLsCached('spp_admin_read_note_replies', {}) || {})
        };
        readMap[id] = Math.max(readMap[id] || 0, commentLen);
        writeJsonLsCached('spp_admin_read_note_replies', readMap);
        window.dispatchEvent(new Event('spp_note_read_updated'));
      } catch (e) {}
      setNotesReadSync(s => s + 1);
      setNotes(prev => {
        const next = prev.map(n => n.id === id ? {
          ...n,
          isRead: true
        } : n);
        writeJsonLsCached('spp_cached_notes', next);
        return next;
      });
      await AppApi.notes.markRead(id);
    }
  }, []);
  const markAllNotesRepliesRead = useCallback(async () => {
    const currentNotes = notesRef.current || [];
    if (currentNotes.length === 0) return;
    const uuidIds = [];
    try {
      const readMap = {
        ...(readJsonLsCached('spp_admin_read_note_replies', {}) || {})
      };
      currentNotes.forEach(n => {
        const len = Array.isArray(n.comments) ? n.comments.length : 0;
        if ((readMap[n.id] || 0) < len || !n.isRead) {
          readMap[n.id] = len;
          if (typeof n.id === 'string' && n.id.includes('-')) {
            uuidIds.push(n.id);
          }
        }
      });
      writeJsonLsCached('spp_admin_read_note_replies', readMap);
      window.dispatchEvent(new Event('spp_note_read_updated'));
    } catch (e) {}
    setNotesReadSync(s => s + 1);
    setNotes(prev => {
      const next = prev.map(n => n.isRead ? n : {
        ...n,
        isRead: true
      });
      writeJsonLsCached('spp_cached_notes', next);
      return next;
    });
    await AppApi.notes.markManyRead(uuidIds);
  }, []);
  const handleMarkAllAdminRead = useCallback(async () => {
    const complaintUuids = [];
    const trxUuids = [];
    try {
      const compListRaw = readJsonLsCached('spp_admin_read_complaints', []);
      const readCompList = Array.isArray(compListRaw) ? [...compListRaw] : [];
      const msgCounts = {
        ...(readJsonLsCached('spp_admin_read_complaint_msgs', {}) || {})
      };
      (complaintsRef.current || []).forEach(c => {
        if (!readCompList.includes(c.id)) readCompList.push(c.id);
        const len = Array.isArray(c.messages) ? c.messages.length : 0;
        msgCounts[c.id] = Math.max(msgCounts[c.id] || 0, len);
        if (!c.isRead && typeof c.id === 'string' && c.id.includes('-')) {
          complaintUuids.push(c.id);
        }
      });
      writeJsonLsCached('spp_admin_read_complaints', readCompList);
      writeJsonLsCached('spp_admin_read_complaint_msgs', msgCounts);
    } catch (e) {}
    try {
      const trxListRaw = readJsonLsCached('spp_admin_read_trx', []);
      const readTrxList = Array.isArray(trxListRaw) ? [...trxListRaw] : [];
      (transactionsRef.current || []).forEach(t => {
        if (!readTrxList.includes(t.id)) readTrxList.push(t.id);
        if (!t.isRead && typeof t.id === 'string' && t.id.includes('-')) {
          trxUuids.push(t.id);
        }
      });
      writeJsonLsCached('spp_admin_read_trx', readTrxList);
    } catch (e) {}
    setComplaints(prev => {
      const next = prev.map(c => c.isRead ? c : {
        ...c,
        isRead: true
      });
      writeJsonLsCached('spp_cached_complaints', next);
      return next;
    });
    setTransactions(prev => {
      const next = prev.map(t => t.isRead ? t : {
        ...t,
        isRead: true
      });
      writeJsonLsCached('spp_cached_transactions', next);
      return next;
    });
    await markAllNotesRepliesRead();
    if (AppApi.isConnected()) {
      try {
        await AppApi.complaints.markManyRead(complaintUuids);
        await AppApi.transactions.markManyRead(trxUuids);
      } catch (err) {}
    }
  }, [markAllNotesRepliesRead]);
  const selectAdminView = useCallback(viewId => {
    setCurrentView(viewId);
    if (viewId === 'catatan') {
      markAllNotesRepliesRead();
    }
  }, [markAllNotesRepliesRead]);
  useEffect(() => {
    if (currentUser?.role === 'admin' && currentView === 'catatan' && unreadNotesRepliesList.length > 0) {
      markAllNotesRepliesRead();
    }
  }, [currentUser?.role, currentView, unreadNotesRepliesList.length, markAllNotesRepliesRead]);
  const handleAddCommentNote = useCallback(async (noteId, commentObj) => {
    setNotes(prev => {
      const next = prev.map(n => {
        if (n.id === noteId) {
          const updatedComments = [...(n.comments || []), commentObj];
          AppApi.notes.updateComments(noteId, updatedComments);
          return {
            ...n,
            comments: updatedComments,
            isRead: false
          };
        }
        return n;
      });
      writeJsonLsCached('spp_cached_notes', next);
      return next;
    });
    showToast("Komentar Terkirim", "Komentar berhasil ditambahkan pada catatan evaluasi.", "success");
  }, [showToast]);
  const handleAddNote = useCallback(async noteData => {
    const validStudentId = noteData.studentId && typeof noteData.studentId === 'string' && noteData.studentId.includes('-') ? noteData.studentId : null;
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
    const {
      data,
      error,
      noClient
    } = await AppApi.notes.create(dbPayload);
    if (noClient) {
      showToast('Database connection missing', 'error');
      return;
    }
    if (!error && data) {
      setNotes(prev => {
        const next = [mapNoteFromDb(data[0]), ...prev];
        writeJsonLsCached('spp_cached_notes', next);
        return next;
      });
      showToast('Catatan siswa berhasil dikirim!', 'success');
    } else {
      showToast('Gagal mengirim catatan: ' + (error ? error.message : ''), 'error');
    }
  }, [showToast]);
  const handleAddStudent = useCallback(async stObj => {
    const defaultPwd = stObj.password || (stObj.nis ? `Sb${stObj.nis}` : '123456');
    const newStudent = {
      id: Date.now(),
      ...stObj,
      password: defaultPwd
    };
    setStudents(prev => {
      const next = [...prev, newStudent];
      writeJsonLsCached('spp_cached_students', next);
      return next;
    });
    showToast("Data Murid Ditambahkan", `Murid atas nama ${stObj.name} (NIS: ${stObj.nis}) berhasil diinput.`, "success");
    await AppApi.students.create({
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
    });
  }, [showToast]);
  const handleUpdateStudent = useCallback(async (id, updatedObj) => {
    setStudents(prev => {
      const next = prev.map(s => s.id === id || updatedObj.nis && s.nis === updatedObj.nis ? {
        ...s,
        ...updatedObj
      } : s);
      writeJsonLsCached('spp_cached_students', next);
      return next;
    });
    setCurrentUser(prev => {
      if (prev && prev.role === 'parent' && prev.student && (prev.student.id === id || prev.student.nis === updatedObj.nis)) {
        if (updatedObj.statusAktif === false || updatedObj.status && updatedObj.status.toLowerCase() !== 'aktif') {
          try {
            sessionStorage.removeItem('spp_tab_session');
            localStorage.removeItem('spp_parent_session');
          } catch (e) {}
          alert('Akun siswa telah dinonaktifkan / keluar / lulus oleh Admin (Status: OFF). Sesi akses login telah ditutup.');
          return null;
        }
        const updatedUser = {
          ...prev,
          student: {
            ...prev.student,
            ...updatedObj
          }
        };
        try {
          sessionStorage.setItem('spp_tab_session', JSON.stringify(updatedUser));
        } catch (e) {}
        return updatedUser;
      }
      return prev;
    });
    const studentNameDisplay = updatedObj.name || 'tersebut';
    showToast("Data Murid Diperbarui", `Profil siswa ${studentNameDisplay} berhasil diperbarui.`, "success");
    if (AppApi.isConnected()) {
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
          writeJsonLsCached('spp_completed_levels_' + id, updatedObj.completedLevels);
          if (updatedObj.nis) writeJsonLsCached('spp_completed_levels_' + updatedObj.nis, updatedObj.completedLevels);
        }
        if (updatedObj.statusAktif === false || updatedObj.status && updatedObj.status.toLowerCase() !== 'aktif') {
          dbUpdateObj.session_token = null;
        }
        await AppApi.students.update(id, updatedObj.nis, dbUpdateObj);
      } catch (err) {
        console.error("Gagal update student ke Supabase:", err);
      }
    }
  }, [showToast]);
  const handleDeleteStudent = useCallback(async id => {
    const target = (studentsRef.current || []).find(s => s.id === id);
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
          writeJsonLsCached('spp_cached_students', next);
          return next;
        });
        showToast("Data Murid Dihapus", `Data murid ${target ? target.name : ''} telah berhasil dihapus.`, "delete");
        await AppApi.students.remove(id);
      }
    });
  }, [showConfirmPopup, showToast]);
  const handleAddTransaction = useCallback(async trxObj => {
    const newTrx = {
      id: Date.now(),
      ...trxObj
    };
    setTransactions(prev => {
      const next = [newTrx, ...prev];
      writeJsonLsCached('spp_cached_transactions', next);
      return next;
    });
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
    const validStudentId = trxObj.studentId && typeof trxObj.studentId === 'string' && trxObj.studentId.includes('-') ? trxObj.studentId : null;
    await AppApi.transactions.create({
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
    });
  }, [showToast]);
  const handleDeleteNote = useCallback(id => {
    showConfirmPopup({
      title: "Hapus Catatan Kesiswaan?",
      message: "Apakah Anda yakin ingin menghapus catatan bimbingan/evaluasi murid ini? Data yang dihapus tidak dapat dipulihkan.",
      confirmText: "Ya, Hapus",
      cancelText: "Batal",
      onConfirm: async () => {
        await AppApi.notes.remove(id);
        setNotes(prev => {
          const next = prev.filter(n => n.id !== id);
          writeJsonLsCached('spp_cached_notes', next);
          return next;
        });
        showToast('Catatan berhasil dihapus', 'delete');
      }
    });
  }, [showConfirmPopup, showToast]);
  const handleMarkNoteRead = useCallback(note => {
    if (note && note.id !== undefined) {
      handleMarkReadNotification('note', note.id);
    }
  }, [handleMarkReadNotification]);
  const handleSyncPendingOrder = useCallback(async (trx, opts = {}) => {
    const manual = Boolean(opts && opts.manual);
    if (!trx || !trx.orderId) {
      if (manual) {
        showToast('Order ID Tidak Ditemukan', 'Transaksi ini belum memiliki Order ID Midtrans.', 'info');
      }
      return null;
    }
    if (pendingSyncInFlightRef.current.has(trx.orderId)) {
      return null;
    }
    pendingSyncInFlightRef.current.add(trx.orderId);
    try {
      const {
        ok,
        data
      } = await AppApi.payment.getMidtransStatusDetailed(trx.orderId, {
        snapToken: trx.snapToken
      });
      if (!ok || !data || !data.ok || data.paymentDetermined === false) {
        const expMs = Number(data?.expiresAtMs || 0) || computeClientTransactionExpiryMs(trx);
        const expiredLocally = expMs > 0 && Date.now() >= expMs || String(trx.paymentType || '').trim().toLowerCase() === 'pending';
        if (expiredLocally) {
          const expiredTrx = {
            ...trx,
            status: 'Kadaluarsa'
          };
          upsertTransactionState(expiredTrx);
          if (manual || isTrxPendingStatus(trx)) {
            showToast('Waktu Pembayaran Berakhir', `Tagihan ${trx.month} melewati batas waktu dan dikembalikan ke daftar belum dibayar.`, 'info');
          }
          return expiredTrx;
        }
        if (manual) {
          showToast('Status Belum Berubah', data?.message || 'Masih menunggu konfirmasi dari Midtrans.', 'info');
        }
        return null;
      }
      const pd = data.paymentDetails || {};
      const row = data.transaction || {};
      const mapped = data.transaction ? mapTransactionFromDb(data.transaction) : {
        ...trx
      };
      const updatedTrx = {
        ...mapped,
        status: data.status || mapped.status || trx.status,
        method: data.method && data.method !== 'pending' && data.method !== '-' ? data.method : mapped.method && mapped.method !== '-' ? mapped.method : trx.method,
        orderId: data.orderId || mapped.orderId || trx.orderId,
        snapToken: data.snapToken || mapped.snapToken || trx.snapToken || '',
        snapUrl: mapped.snapUrl || trx.snapUrl || '',
        vaNumber: pd.vaNumber || row.va_number || mapped.vaNumber || trx.vaNumber || '',
        vaBank: pd.vaBank || row.va_bank || mapped.vaBank || trx.vaBank || '',
        billKey: pd.billKey || row.bill_key || mapped.billKey || trx.billKey || '',
        billerCode: pd.billerCode || row.biller_code || mapped.billerCode || trx.billerCode || '',
        paymentCode: pd.paymentCode || row.payment_code || mapped.paymentCode || trx.paymentCode || '',
        expiresAt: data.expiryTime || mapped.expiresAt || trx.expiresAt || '',
        expiresAtMs: Number(data.expiresAtMs || 0) || mapped.expiresAtMs || trx.expiresAtMs || 0
      };
      if (updatedTrx.orderId) {
        saveTrxMetaCache(updatedTrx.orderId, {
          snapToken: updatedTrx.snapToken,
          snapUrl: updatedTrx.snapUrl,
          method: updatedTrx.method,
          vaNumber: updatedTrx.vaNumber,
          vaBank: updatedTrx.vaBank,
          billKey: updatedTrx.billKey,
          billerCode: updatedTrx.billerCode,
          paymentCode: updatedTrx.paymentCode,
          expiresAt: updatedTrx.expiresAt,
          expiresAtMs: updatedTrx.expiresAtMs
        });
      }
      upsertTransactionState(updatedTrx);
      if (isTrxSettled(updatedTrx)) {
        const mLower = String(updatedTrx.month || '').toLowerCase();
        const isArr = mLower.includes('tunggakan') || mLower.includes('kelas sebelumnya');
        const targetStudentId = updatedTrx.studentId || trx.studentId || currentUserRef.current?.student?.id;
        if (isArr && data.clearedArrears !== false && targetStudentId) {
          setStudents(prev => {
            const next = prev.map(s => s.id === targetStudentId ? {
              ...s,
              arrearsAmount: 0,
              arrearsNote: `Lunas via Midtrans Online (${updatedTrx.date})`
            } : s);
            writeJsonLsCached('spp_cached_students', next);
            return next;
          });
        }
        setSelectedKuitansi(updatedTrx);
        showToast('Pembayaran Terverifikasi Lunas', `Pembayaran SPP ${updatedTrx.month} telah berhasil dilunasi.`, 'success');
        fetchData(false);
      } else if (isTrxExpiredOrFailed(updatedTrx)) {
        if (manual || isTrxPendingStatus(trx)) {
          showToast(`Transaksi ${updatedTrx.status}`, `Batas waktu pembayaran ${updatedTrx.month} telah berakhir. Tagihan dikembalikan agar bisa dibayar ulang.`, 'info');
        }
        fetchData(false);
      } else if (manual) {
        showToast('Menunggu Pembayaran', `Order ${updatedTrx.orderId} masih berstatus Pending di Midtrans.`, 'info');
      }
      return updatedTrx;
    } catch (err) {
      if (manual) {
        showToast('Gagal Cek Status', err?.message || 'Tidak dapat menghubungi server verifikasi status.', 'info');
      }
      return null;
    } finally {
      pendingSyncInFlightRef.current.delete(trx.orderId);
    }
  }, [fetchData, showToast, upsertTransactionState]);
  const handleCancelPendingOrder = useCallback(trx => {
    if (!trx || !trx.orderId) {
      showToast('Order Tidak Valid', 'Transaksi ini belum memiliki Order ID untuk dibatalkan.', 'info');
      return;
    }
    showConfirmPopup({
      title: 'Batalkan Pembayaran Pending?',
      message: `Order ${trx.orderId} (${trx.month}) akan dibatalkan di Midtrans sehingga Anda dapat memilih metode pembayaran lain.`,
      confirmText: 'Ya, Batalkan Order',
      cancelText: 'Tetap Lanjutkan',
      onConfirm: async () => {
        try {
          const res = await AppApi.payment.cancelMidtransTransaction(trx.orderId);
          if (!res.ok && res.status === 409 && res.data?.code === 'ALREADY_PAID') {
            showToast('Transaksi Sudah Lunas', res.data?.message || 'Pembayaran ini ternyata sudah berstatus Lunas.', 'info');
            await handleSyncPendingOrder(trx, {
              manual: true
            });
            return;
          }
          if (!res.ok || !res.data || !res.data.ok) {
            showToast('Gagal Membatalkan', res.data?.message || 'Midtrans menolak pembatalan transaksi ini.', 'delete');
            return;
          }
          const cancelledTrx = {
            ...trx,
            status: 'Dibatalkan'
          };
          upsertTransactionState(cancelledTrx);
          setParentNavIntent({
            tab: 'spp',
            subFilter: 'unpaid',
            nonce: Date.now()
          });
          showToast('Pembayaran Dibatalkan', `Order ${trx.orderId} telah dibatalkan. Tagihan kembali terbuka untuk pilih metode lain.`, 'info', {
            toastOnly: true
          });
          fetchData(false);
        } catch (err) {
          showToast('Gagal Membatalkan', err?.message || 'Terjadi kesalahan saat membatalkan order.', 'delete');
        }
      }
    });
  }, [fetchData, handleSyncPendingOrder, showConfirmPopup, showToast, upsertTransactionState]);
  const handleRecreatePendingOrder = useCallback(trx => {
    if (!trx || !trx.orderId) {
      showToast('Order Tidak Valid', 'Transaksi ini belum memiliki Order ID Midtrans.', 'info');
      return;
    }
    const mLower = String(trx.month || '').toLowerCase();
    const isArrearsBill = mLower.includes('tunggakan') || mLower.includes('kelas sebelumnya');
    showConfirmPopup({
      title: 'Buat VA / Metode Bayar Baru?',
      message: `Order Pending ${trx.orderId} (${trx.method || 'Midtrans'}) untuk tagihan ${trx.month} akan dibatalkan otomatis di Midtrans agar Anda bisa membuat nomor VA / kode QRIS baru tanpa transaksi ganda.`,
      confirmText: 'Ya, Buat Baru',
      cancelText: 'Tetap Pakai Ini',
      onConfirm: async () => {
        try {
          const res = await AppApi.payment.cancelMidtransTransaction(trx.orderId);
          if (!res.ok && res.status === 409 && res.data?.code === 'ALREADY_PAID') {
            showToast('Transaksi Sudah Lunas', res.data?.message || 'Pembayaran ini ternyata sudah berstatus Lunas.', 'info');
            await handleSyncPendingOrder(trx, {
              manual: true
            });
            return;
          }
          if (!res.ok || !res.data || !res.data.ok) {
            showToast('Gagal Membuat Ulang', res.data?.message || 'Midtrans menolak pembatalan transaksi sebelumnya.', 'delete');
            return;
          }
          const cancelledTrx = {
            ...trx,
            status: 'Dibatalkan'
          };
          upsertTransactionState(cancelledTrx);
          setActiveMidtransBill({
            month: trx.month,
            amount: Number(trx.amount || 0),
            isArrearsPayment: isArrearsBill,
            replacePending: true
          });
          fetchData(false);
        } catch (err) {
          showToast('Gagal Membuat Ulang', err?.message || 'Terjadi kesalahan saat mengganti transaksi pending.', 'delete');
        }
      }
    });
  }, [fetchData, handleSyncPendingOrder, showConfirmPopup, showToast, upsertTransactionState]);
  const handleResumePendingMidtrans = useCallback(async trx => {
    if (!trx || resumingSnapRef.current) return;
    resumingSnapRef.current = true;
    try {
      const latest = trx.orderId ? await handleSyncPendingOrder(trx, {
        manual: false
      }) : null;
      if (latest && (isTrxSettled(latest) || isTrxExpiredOrFailed(latest))) {
        resumingSnapRef.current = false;
        return;
      }
      const metaMap = readTrxMetaCache();
      const meta = trx.orderId ? metaMap[trx.orderId] : null;
      const snapToken = trx.snapToken || latest?.snapToken || meta?.snapToken || '';
      if (!snapToken) {
        resumingSnapRef.current = false;
        showToast('Sesi Snap Tidak Ditemukan', 'Token pembayaran belum tersedia di sesi browser ini. Klik Cek Status atau tunggu hingga batas waktu transaksi habis.', 'info');
        return;
      }
      const snapUrl = trx.snapUrl || meta?.snapUrl || window.AppEnv?.midtransSnapUrl || 'https://app.sandbox.midtrans.com/snap/snap.js';
      const clientKey = settings?.midtransClientKey || window.AppEnv?.midtransClientKey || '';
      const snap = await loadMidtransSnapScript(snapUrl, clientKey);
      let callbackDone = false;
      snap.pay(snapToken, {
        onSuccess: () => {
          callbackDone = true;
          resumingSnapRef.current = false;
          handleSyncPendingOrder(trx, {
            manual: true
          });
        },
        onPending: () => {
          callbackDone = true;
          resumingSnapRef.current = false;
          handleSyncPendingOrder(trx, {
            manual: true
          });
        },
        onError: () => {
          callbackDone = true;
          resumingSnapRef.current = false;
          showToast('Pembayaran Gagal', 'Transaksi tidak dapat diproses di Midtrans.', 'delete');
          handleSyncPendingOrder(trx, {
            manual: false
          });
        },
        onClose: () => {
          resumingSnapRef.current = false;
          if (!callbackDone) {
            handleSyncPendingOrder(trx, {
              manual: false
            });
          }
        }
      });
    } catch (err) {
      resumingSnapRef.current = false;
      showToast('Gagal Membuka Midtrans', err?.message || 'Tidak dapat memuat jendela pembayaran Midtrans.', 'delete');
    }
  }, [handleSyncPendingOrder, settings?.midtransClientKey, showToast]);
  if (isLoadingPortal && pendingUser) {
    return <LoadingBarScreen userRole={pendingUser.role} userName={pendingUser.role === 'admin' ? pendingUser.name : pendingUser.student.name} onComplete={handleCompleteLoadingPortal} />;
  }
  if (!currentUser) {
    return <>
            <LoginView onLogin={handleUserLogin} settings={settings} students={students} />
            {kickedModal && <KickedOutModal info={kickedModal} onClose={handleCloseKickedModal} />}
          </>;
  }
  if (currentUser.role === 'parent') {
    const liveStudent = students.find(s => currentUser.student && (s.id === currentUser.student.id || s.nis === currentUser.student.nis)) || currentUser.student;
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
    return <>
            <ParentDashboardView student={liveStudent} transactions={transactions} announcements={announcements} complaints={complaints} notes={notes} settings={settings} onLogout={handleUserLogout} onShowKuitansi={handleShowKuitansi} onPayMidtrans={handlePayMidtrans} onResumePendingMidtrans={handleResumePendingMidtrans} onCheckPendingStatus={trx => handleSyncPendingOrder(trx, {
        manual: true
      })} onCancelPendingOrder={handleCancelPendingOrder} onRecreatePendingOrder={handleRecreatePendingOrder} onSyncPendingOrder={handleSyncPendingOrder} parentNavIntent={parentNavIntent} onAddComplaint={handleAddComplaint} onAddCommentNote={handleAddCommentNote} onReplyComplaint={handleReplyComplaint} onUpdateParentSettings={handleUpdateStudent} onRefresh={fetchData} isRefreshing={isRefreshing} />

            {isRefreshing && <RefreshLoadingOverlay />}

            {selectedKuitansi && <KuitansiModal transaction={selectedKuitansi} settings={settings} onClose={handleCloseKuitansi} />}

            {activeMidtransBill && <MidtransModal bill={activeMidtransBill} student={liveStudent} settings={settings} onClose={() => {
        if (activeMidtransBill?.replacePending) {
          setParentNavIntent({
            tab: 'spp',
            subFilter: 'unpaid',
            nonce: Date.now()
          });
        }
        handleCloseMidtrans();
      }} onGatewayCancelledBeforePayment={(bill, info) => {
        setActiveMidtransBill(null);
        if (bill?.replacePending) {
          setParentNavIntent({
            tab: 'spp',
            subFilter: 'unpaid',
            nonce: Date.now()
          });
        }
        showToast('Pembayaran Belum Dibuat', `Anda menutup jendela ${info?.channelTitle || 'Midtrans'} sebelum nomor pembayaran diterbitkan. Tagihan tetap terbuka.`, 'info', {
          toastOnly: true
        });
      }} onConfirmSuccess={(bill, method) => {
        const newTrx = {
          id: Date.now(),
          studentId: liveStudent.id,
          studentName: liveStudent.name,
          kelas: liveStudent.kelas,
          month: bill.month,
          amount: bill.amount,
          method: method,
          status: 'Lunas',
          isRead: false,
          date: formatDateIndo(new Date()),
          kuitansiNo: `K-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}-${Math.floor(100 + Math.random() * 900)}`
        };
        handleAddTransaction(newTrx);
        if (bill.isArrearsPayment) {
          handleUpdateStudent(liveStudent.id, {
            ...liveStudent,
            arrearsAmount: 0,
            arrearsNote: `Lunas via Midtrans Online (${newTrx.date})`
          });
        }
        setSelectedKuitansi(newTrx);
        setActiveMidtransBill(null);
      }} onGatewayPending={(bill, pendingData) => {
        const rawTrx = pendingData?.transaction;
        const pd = pendingData?.paymentDetails || {};
        const baseMapped = rawTrx && (rawTrx.student_name || rawTrx.order_id) ? mapTransactionFromDb(rawTrx) : {
          id: rawTrx?.id || Date.now(),
          studentId: liveStudent.id,
          studentName: liveStudent.name,
          kelas: liveStudent.kelas,
          month: rawTrx?.month || pendingData?.month || bill.month,
          amount: Number(pendingData?.amount || rawTrx?.amount || bill.amount),
          method: pendingData?.method || rawTrx?.method || 'Midtrans Snap Online',
          status: 'Pending',
          isRead: true,
          date: formatDateIndo(rawTrx?.date || new Date()),
          kuitansiNo: rawTrx?.kuitansi_no || pendingData?.kuitansiNo || '-',
          orderId: pendingData?.orderId || rawTrx?.order_id || ''
        };
        const expMs = Number(pendingData?.expiresAtMs || 0) || baseMapped.expiresAtMs || parseMidtransTimestampClientMs(pendingData?.expiryTime || rawTrx?.expires_at) || Date.now() + DEFAULT_CLIENT_SNAP_EXPIRY_MS;
        const pendingTrx = {
          ...baseMapped,
          snapToken: pendingData?.snapToken || rawTrx?.snap_token || baseMapped.snapToken || '',
          snapUrl: pendingData?.snapUrl || baseMapped.snapUrl || '',
          vaNumber: pd.vaNumber || rawTrx?.va_number || baseMapped.vaNumber || '',
          vaBank: pd.vaBank || rawTrx?.va_bank || baseMapped.vaBank || '',
          billKey: pd.billKey || rawTrx?.bill_key || baseMapped.billKey || '',
          billerCode: pd.billerCode || rawTrx?.biller_code || baseMapped.billerCode || '',
          paymentCode: pd.paymentCode || rawTrx?.payment_code || baseMapped.paymentCode || '',
          expiresAt: pendingData?.expiryTime || rawTrx?.expires_at || baseMapped.expiresAt || '',
          expiresAtMs: expMs,
          createdAtMs: baseMapped.createdAtMs || Date.now()
        };
        if (pendingTrx.orderId) {
          saveTrxMetaCache(pendingTrx.orderId, {
            snapToken: pendingTrx.snapToken,
            snapUrl: pendingTrx.snapUrl,
            method: pendingTrx.method,
            vaNumber: pendingTrx.vaNumber,
            vaBank: pendingTrx.vaBank,
            billKey: pendingTrx.billKey,
            billerCode: pendingTrx.billerCode,
            paymentCode: pendingTrx.paymentCode,
            expiresAt: pendingTrx.expiresAt,
            expiresAtMs: pendingTrx.expiresAtMs,
            createdAtMs: pendingTrx.createdAtMs
          });
        }
        upsertTransactionState(pendingTrx);
        if (pendingData?.duplicateBlocked) {
          setActiveMidtransBill(null);
          setParentNavIntent({
            tab: 'spp',
            subFilter: 'pending',
            nonce: Date.now()
          });
          showToast('Transaksi Pending Ditemukan', pendingData?.message || `Masih ada transaksi Pending (${pendingTrx.orderId || bill.month}). Selesaikan di menu Pending.`, 'info');
        }
      }} onGatewayResult={(bill, gatewayRes) => {
        const rawTrx = gatewayRes.transaction;
        const pd = gatewayRes.paymentDetails || {};
        const sr = gatewayRes.snapResult || {};
        const srVa = Array.isArray(sr.va_numbers) && sr.va_numbers[0] ? sr.va_numbers[0] : null;
        const baseMapped = rawTrx && (rawTrx.student_name || rawTrx.order_id) ? mapTransactionFromDb(rawTrx) : {
          id: rawTrx?.id || Date.now(),
          studentId: liveStudent.id,
          studentName: liveStudent.name,
          kelas: liveStudent.kelas,
          month: rawTrx?.month || gatewayRes.rawCreate?.month || bill.month,
          amount: Number(gatewayRes.grossAmount || rawTrx?.amount || gatewayRes.rawCreate?.amount || bill.amount),
          method: gatewayRes.method && gatewayRes.method !== 'pending' ? gatewayRes.method : rawTrx?.method || gatewayRes.rawCreate?.method || 'Midtrans Snap Online',
          status: gatewayRes.status || 'Pending',
          isRead: false,
          date: formatDateIndo(rawTrx?.date || new Date()),
          kuitansiNo: rawTrx?.kuitansi_no || gatewayRes.rawCreate?.kuitansiNo || '-',
          orderId: gatewayRes.orderId || rawTrx?.order_id || ''
        };
        const expMs = Number(gatewayRes.expiresAtMs || 0) || baseMapped.expiresAtMs || Number(gatewayRes.rawCreate?.expiresAtMs || 0) || parseMidtransTimestampClientMs(gatewayRes.expiryTime || gatewayRes.rawCreate?.expiryTime || rawTrx?.expires_at) || (gatewayRes.status === 'Pending' || !gatewayRes.status ? Date.now() + DEFAULT_CLIENT_SNAP_EXPIRY_MS : 0);
        const mappedTrx = {
          ...baseMapped,
          status: gatewayRes.status || baseMapped.status || 'Pending',
          method: gatewayRes.method && gatewayRes.method !== 'pending' && gatewayRes.method !== '-' ? gatewayRes.method : baseMapped.method,
          orderId: gatewayRes.orderId || baseMapped.orderId || '',
          snapToken: gatewayRes.snapToken || gatewayRes.rawCreate?.snapToken || rawTrx?.snap_token || baseMapped.snapToken || '',
          snapUrl: gatewayRes.rawCreate?.snapUrl || baseMapped.snapUrl || '',
          vaNumber: pd.vaNumber || rawTrx?.va_number || srVa?.va_number || sr.permata_va_number || baseMapped.vaNumber || '',
          vaBank: pd.vaBank || rawTrx?.va_bank || (srVa?.bank ? String(srVa.bank).toUpperCase() : sr.permata_va_number ? 'PERMATA' : '') || baseMapped.vaBank || '',
          billKey: pd.billKey || rawTrx?.bill_key || sr.bill_key || baseMapped.billKey || '',
          billerCode: pd.billerCode || rawTrx?.biller_code || sr.biller_code || baseMapped.billerCode || '',
          paymentCode: pd.paymentCode || rawTrx?.payment_code || sr.payment_code || baseMapped.paymentCode || '',
          expiresAt: gatewayRes.expiryTime || gatewayRes.rawCreate?.expiryTime || rawTrx?.expires_at || baseMapped.expiresAt || '',
          expiresAtMs: expMs
        };
        if (mappedTrx.orderId) {
          saveTrxMetaCache(mappedTrx.orderId, {
            snapToken: mappedTrx.snapToken,
            snapUrl: mappedTrx.snapUrl,
            method: mappedTrx.method,
            vaNumber: mappedTrx.vaNumber,
            vaBank: mappedTrx.vaBank,
            billKey: mappedTrx.billKey,
            billerCode: mappedTrx.billerCode,
            paymentCode: mappedTrx.paymentCode,
            expiresAt: mappedTrx.expiresAt,
            expiresAtMs: mappedTrx.expiresAtMs
          });
        }
        upsertTransactionState(mappedTrx);
        if (isTrxSettled(mappedTrx)) {
          if (bill.isArrearsPayment && gatewayRes.clearedArrears !== false) {
            setStudents(prev => {
              const next = prev.map(s => s.id === liveStudent.id ? {
                ...s,
                arrearsAmount: 0,
                arrearsNote: `Lunas via Midtrans Online (${mappedTrx.date})`
              } : s);
              writeJsonLsCached('spp_cached_students', next);
              return next;
            });
          }
          setSelectedKuitansi(mappedTrx);
          showToast('Pembayaran Midtrans Berhasil', `Pembayaran SPP ${mappedTrx.month} (${mappedTrx.method}) telah lunas terverifikasi.`, 'success');
        } else if (isTrxExpiredOrFailed(mappedTrx)) {
          setParentNavIntent({
            tab: 'spp',
            subFilter: 'unpaid',
            nonce: Date.now()
          });
          showToast(`Transaksi ${mappedTrx.status}`, `Tagihan ${mappedTrx.month} dikembalikan ke daftar belum dibayar agar bisa dibayar ulang.`, 'info');
        } else {
          setParentNavIntent({
            tab: 'spp',
            subFilter: 'pending',
            nonce: Date.now()
          });
          showToast('Menunggu Pembayaran Midtrans', `Order ${mappedTrx.orderId || ''} masuk ke menu Pending (batas 5 menit). Selesaikan sebelum batas waktu berakhir.`, 'info');
        }
        setActiveMidtransBill(null);
        fetchData(false);
      }} />}

            <ToastNotification toast={toast} onClose={handleCloseToast} />
            <CrudPopupModal popup={crudPopup} onClose={handleClosePopup} />
          </>;
  }
  return <>
          <div className="min-h-screen bg-aesthetic-pattern flex flex-col w-full text-slate-800 relative">

            
            {showAdminMobileBell && <div className="fixed inset-0 z-[9999] pointer-events-auto">
                <div className="fixed inset-0 bg-slate-900/30 z-[9999]" onClick={() => setShowAdminMobileBell(false)} />
                <div className="fixed inset-x-3 sm:inset-x-auto sm:right-8 top-[72px] sm:top-20 z-[10000] w-auto max-w-sm sm:w-96 mx-auto sm:mx-0 bg-white rounded-3xl shadow-2xl border border-slate-200 text-slate-800 p-4 space-y-3 animate-in slide-in-from-top-2 duration-200 max-h-[82vh] overflow-y-auto">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                        <Icon name="bell" size={14} />
                      </div>
                      <h4 className="font-extrabold text-xs uppercase text-slate-800 tracking-wide">Notifikasi Admin TU</h4>
                      {totalAdminUnread > 0 && <span className="px-2 py-0.5 bg-rose-100 text-rose-700 text-[10px] font-black rounded-full">
                          {totalAdminUnread} Baru
                        </span>}
                    </div>
                    <div className="flex items-center gap-2">
                      {totalAdminUnread > 0 && <button type="button" onClick={handleMarkAllAdminRead} className="text-[10px] font-bold text-blue-600 hover:text-blue-800 hover:underline cursor-pointer">
                          Tandai Dibaca
                        </button>}
                      <button type="button" onClick={() => setShowAdminMobileBell(false)} className="px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-800 text-xs font-bold transition-colors">
                        Tutup
                      </button>
                    </div>
                  </div>
                  
                  <div className="space-y-2 text-xs max-h-80 overflow-y-auto pr-0.5">
                    {totalAdminUnread === 0 ? <div className="text-center py-6 text-slate-400 font-medium">
                        <Icon name="bell-off" size={26} className="mx-auto mb-1.5 text-slate-300" />
                        Semua pengaduan, transaksi, dan balasan catatan telah ditinjau.
                      </div> : <>
                        {pendingComplaints.map(c => <div key={'pending_' + c.id} onClick={() => {
                handleMarkReadNotification('complaint', c.id);
                setShowAdminMobileBell(false);
                selectAdminView('pengaduan');
              }} className="p-3 rounded-2xl border border-amber-300 bg-amber-50/90 cursor-pointer hover:scale-[0.99] transition-all text-amber-950 font-bold shadow-2xs">
                            <div className="flex items-center justify-between gap-2 mb-1">
                              <span className="text-xs font-black truncate flex items-center gap-1.5 text-amber-900">
                                <Icon name="message-circle" size={13} className="text-amber-600 shrink-0" />
                                Aduan: {c.studentName || 'Wali Murid'}
                              </span>
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-amber-500 text-white shrink-0">Menunggu</span>
                            </div>
                            <p className="text-[11px] text-amber-800 line-clamp-1 font-medium">{c.title || c.description || 'Pengaduan baru dari wali murid'}</p>
                            {c.date && <span className="text-[9.5px] text-amber-700/80 font-semibold mt-1 block">{formatDateIndo(c.date)}</span>}
                          </div>)}
                        {unreadTransactions.map(t => <div key={'trx_' + t.id} onClick={() => {
                handleMarkReadNotification('transaction', t.id);
                setShowAdminMobileBell(false);
                selectAdminView('transaksi');
              }} className="p-3 rounded-2xl border border-blue-200 bg-blue-50/90 cursor-pointer hover:scale-[0.99] transition-all text-blue-950 font-bold shadow-2xs">
                            <div className="flex items-center justify-between gap-2 mb-1">
                              <span className="text-xs font-black truncate flex items-center gap-1.5 text-blue-900">
                                <Icon name="credit-card" size={13} className="text-blue-600 shrink-0" />
                                {t.studentName} ({t.month || 'SPP'})
                              </span>
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-blue-600 text-white shrink-0">{t.status || 'Lunas'}</span>
                            </div>
                            <p className="text-[11px] text-blue-800 font-semibold">{formatRupiah(t.amount)} • {formatDateIndo(t.date)}</p>
                          </div>)}
                        {unreadNotesRepliesList.map(n => <div key={'note_reply_' + n.id} onClick={() => {
                handleMarkReadNotification('note', n.id);
                setShowAdminMobileBell(false);
                selectAdminView('catatan');
              }} className="p-3 rounded-2xl border border-teal-200 bg-teal-50/90 cursor-pointer hover:scale-[0.99] transition-all text-teal-950 font-bold shadow-2xs">
                            <div className="flex items-center justify-between gap-2 mb-1">
                              <span className="text-xs font-black truncate flex items-center gap-1.5 text-teal-900">
                                <Icon name="message-circle" size={13} className="text-teal-600 shrink-0" />
                                Catatan: {n.studentName}
                              </span>
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-rose-500 text-white shrink-0">
                                {n.unreadCount} Balasan Baru
                              </span>
                            </div>
                            <p className="text-[11px] text-teal-800 line-clamp-1 font-medium">{n.lastCommentText}</p>
                            {n.date && <span className="text-[9.5px] text-teal-700/80 font-semibold mt-1 block">{formatDateTimeIndo(n.date)}</span>}
                          </div>)}
                      </>}
                  </div>
                </div>
              </div>}

            
            <div className="md:hidden sticky top-0 z-40 bg-gradient-to-r from-[#072a6b] via-[#0d3b8f] to-[#1554c2] px-4 sm:px-6 py-3.5 border-b border-cyan-400/30 shadow-xl shadow-blue-950/20 flex items-center justify-between min-h-[66px] text-white">
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-cyan-400 via-indigo-600 to-blue-700 p-0.5 shadow-lg shadow-blue-950/50 overflow-hidden shrink-0 flex items-center justify-center ring-2 ring-cyan-400/30">
                  <img src="logo.webp" alt="PAUD Setia Bhakti" loading="lazy" decoding="async" className="w-8 h-8 object-contain filter drop-shadow" />
                </div>
                <div className="min-w-0">
                  <h1 className="text-base font-black text-white truncate tracking-tight">{settings.schoolName || 'PAUD SETIA BHAKTI'}</h1>
                  <div className="flex items-center gap-1.5 text-xs font-extrabold text-cyan-300 truncate mt-0.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                    <span>Admin TU • {settings.adminName || 'Admin'}</span>
                  </div>
                </div>
              </div>

              
              <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                
                <button type="button" onClick={() => fetchData(true)} disabled={isRefreshing} className="relative w-11 h-11 rounded-2xl bg-white/15 hover:bg-white/25 active:scale-95 text-white flex items-center justify-center transition-all border border-white/15 focus:outline-none ring-1 ring-white/10 shrink-0" aria-label="Sinkronisasi Data" title="Sinkronisasi Data">
                  <Icon name="refresh-cw" size={18} className={isRefreshing ? 'animate-spin text-cyan-300' : 'text-white'} />
                </button>

                
                <button type="button" onClick={() => {
            setShowAdminMobileBell(!showAdminMobileBell);
            setIsAdminMobileMenuOpen(false);
          }} className="relative w-11 h-11 rounded-2xl bg-white/15 hover:bg-white/25 active:scale-95 text-white flex items-center justify-center transition-all border border-white/15 focus:outline-none ring-1 ring-white/10 shrink-0" aria-label="Lihat Notifikasi Admin" title="Notifikasi">
                  <Icon name="bell" size={19} />
                  {totalAdminUnread > 0 && <span className="absolute -top-1 -right-1 w-5 h-5 bg-rose-500 text-white rounded-full text-[10px] font-black flex items-center justify-center ring-2 ring-white shadow-md">
                      {totalAdminUnread > 9 ? '9+' : totalAdminUnread}
                    </span>}
                </button>

                
                <button type="button" onClick={() => {
            setIsAdminMobileMenuOpen(!isAdminMobileMenuOpen);
            setShowAdminMobileBell(false);
          }} className="relative w-11 h-11 rounded-2xl bg-white/15 hover:bg-white/25 active:scale-95 text-white flex flex-col items-center justify-center gap-[4.5px] p-2.5 transition-all shadow-lg border border-white/15 focus:outline-none ring-1 ring-white/10 shrink-0" aria-label="Buka Menu Admin" title="Menu Navigasi">
                  <span className={`h-[2.5px] bg-white rounded-full transition-all duration-300 ${isAdminMobileMenuOpen ? 'w-5 rotate-45 translate-y-[7px]' : 'w-5'}`}></span>
                  <span className={`h-[2.5px] bg-white rounded-full transition-all duration-300 ${isAdminMobileMenuOpen ? 'opacity-0 w-0' : 'w-4 self-start ml-0.5'}`}></span>
                  <span className={`h-[2.5px] bg-white rounded-full transition-all duration-300 ${isAdminMobileMenuOpen ? 'w-5 -rotate-45 -translate-y-[7px]' : 'w-5'}`}></span>
                </button>
              </div>
            </div>

            
            {isAdminMobileMenuOpen && <div className="md:hidden fixed inset-0 z-50 overflow-hidden animate-in fade-in duration-200">
                <div className="absolute inset-0 bg-slate-950/85 transition-opacity" onClick={() => setIsAdminMobileMenuOpen(false)}></div>

                <div className="absolute top-0 right-0 bottom-0 w-[88%] sm:w-[380px] max-w-[430px] min-h-[100dvh] smurf-mobile-drawer text-white flex flex-col justify-between shadow-2xl z-10 overflow-y-auto animate-in slide-in-from-right duration-300 relative">
                  <div className="p-4 sm:p-5 relative z-10">
                    
                    <div className="flex items-center justify-between pb-3.5 border-b border-white/10 mb-4">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-slate-900 border border-white/15 flex items-center justify-center p-1.5 shadow-md shrink-0">
                          <img src="logo.webp" alt="PAUD Setia Bhakti" loading="lazy" decoding="async" className="w-full h-full object-contain" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <h2 className="text-sm font-black text-white leading-tight truncate">{settings.schoolName || 'PAUD SETIA BHAKTI'}</h2>
                          <span className="text-[11px] font-bold text-cyan-400 uppercase tracking-wider block truncate">Panel Administrator TU</span>
                        </div>
                      </div>
                      <button type="button" onClick={() => setIsAdminMobileMenuOpen(false)} className="w-9 h-9 rounded-xl bg-white/5 hover:bg-white/15 text-slate-300 hover:text-white flex items-center justify-center transition-colors border border-white/10 active:scale-95 shrink-0">
                        <Icon name="x" size={18} />
                      </button>
                    </div>

                    
                    <div className="p-3.5 rounded-2xl bg-slate-900/95 border border-white/10 flex items-center gap-3 mb-4 shadow-lg shadow-black/30">
                      <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center text-white font-black text-lg border border-white/20 overflow-hidden shrink-0 shadow-md">
                        {settings.adminName ? settings.adminName.charAt(0) : 'A'}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-black text-white truncate capitalize">{settings.adminName || 'Admin TU'}</p>
                        <p className="text-xs text-slate-400 font-bold truncate mt-0.5">Tahun Ajaran {settings.academicYear || 'Aktif'}</p>
                      </div>
                    </div>

                    
                    <div className="space-y-1.5">
                      {[{
                id: 'dashboard',
                label: 'Dashboard',
                icon: 'home',
                defaultView: 'dashboard',
                views: ['dashboard']
              }, {
                id: 'keuangan',
                label: 'Keuangan SPP',
                icon: 'credit-card',
                defaultView: 'transaksi',
                views: ['transaksi', 'tunggakan', 'laporan'],
                subItems: [{
                  id: 'transaksi',
                  label: 'Catat Bayar Manual',
                  icon: 'plus-circle'
                }, {
                  id: 'tunggakan',
                  label: 'Follow-Up Tunggakan',
                  icon: 'phone-call',
                  badge: tunggakanStudentsCount,
                  badgeType: 'danger'
                }, {
                  id: 'laporan',
                  label: 'Cetak Laporan PDF',
                  icon: 'printer'
                }]
              }, {
                id: 'kesiswaan',
                label: 'Kesiswaan',
                icon: 'users',
                defaultView: 'siswa',
                views: ['siswa', 'catatan'],
                badge: unreadNotesRepliesList.length > 0 ? unreadNotesRepliesList.length : null,
                badgeType: 'danger',
                subItems: [{
                  id: 'siswa',
                  label: 'Data Murid',
                  icon: 'user-check'
                }, {
                  id: 'catatan',
                  label: 'Catatan Siswa TU',
                  icon: 'file-text',
                  badge: unreadNotesRepliesList.length > 0 ? unreadNotesRepliesList.length : null,
                  badgeType: 'danger'
                }]
              }, {
                id: 'komunikasi',
                label: 'Komunikasi',
                icon: 'message-square',
                defaultView: 'pengumuman',
                views: ['pengumuman', 'pengaduan'],
                badge: pendingComplaints.length || null,
                badgeType: 'danger',
                subItems: [{
                  id: 'pengumuman',
                  label: 'Pengumuman Sekolah',
                  icon: 'newspaper'
                }, {
                  id: 'pengaduan',
                  label: 'Pengaduan Wali',
                  icon: 'message-circle',
                  badge: pendingComplaints.length || null,
                  badgeType: 'danger'
                }]
              }, {
                id: 'pengaturan',
                label: 'Pengaturan',
                icon: 'settings',
                defaultView: 'pengaturan',
                views: ['pengaturan']
              }].map(group => {
                const isGroupActive = group.views.includes(currentView);
                const isExpanded = adminExpandedGroup === group.id;
                return <div key={group.id} className="w-full">
                            <button type="button" onClick={() => {
                    if (group.subItems) {
                      if (isExpanded) {
                        setAdminExpandedGroup(null);
                      } else {
                        setAdminExpandedGroup(group.id);
                        if (!isGroupActive) {
                          selectAdminView(group.defaultView);
                        }
                      }
                    } else {
                      setAdminExpandedGroup(group.id);
                      selectAdminView(group.defaultView);
                      setIsAdminMobileMenuOpen(false);
                    }
                  }} className={`w-full min-h-[44px] py-2.5 px-3.5 rounded-xl flex items-center justify-between text-xs sm:text-sm font-extrabold transition-all duration-200 active:scale-[0.99] ${isGroupActive ? 'smurf-nav-active' : 'smurf-nav-item'}`}>
                              <div className="flex items-center gap-3 min-w-0 flex-1 truncate">
                                <Icon name={group.icon} size={18} className="shrink-0" />
                                <span className="truncate capitalize">{group.label}</span>
                              </div>
                              <div className="flex items-center gap-2 shrink-0 ml-2">
                                {group.badge !== undefined && group.badge !== null && <span className={`px-2 py-0.5 rounded-full text-[10px] font-black transition-all ${group.badge === 0 ? 'badge-zero-muted' : group.badgeType === 'danger' ? 'badge-danger-active ring-1 ring-rose-300' : 'badge-cyan-active'}`}>
                                    {group.badge}
                                  </span>}
                                {group.subItems && <Icon name="chevron-down" size={16} className={`transition-transform duration-200 shrink-0 ${isExpanded ? 'rotate-180' : ''}`} />}
                              </div>
                            </button>

                            {group.subItems && isExpanded && <div className="border-l-2 border-slate-800 ml-4 pl-3 mt-1.5 space-y-1">
                                {group.subItems.map(sub => <button key={sub.id} type="button" onClick={() => {
                      selectAdminView(sub.id);
                      setAdminExpandedGroup(group.id);
                      setIsAdminMobileMenuOpen(false);
                    }} className={`w-full min-h-[40px] py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-between transition-all active:scale-[0.99] ${currentView === sub.id ? 'bg-white/15 text-white font-black border border-white/15 shadow-xs' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>
                                    <div className="flex items-center gap-2.5 min-w-0 flex-1 truncate">
                                      <Icon name={sub.icon} size={15} className="shrink-0" />
                                      <span className="truncate capitalize">{sub.label}</span>
                                    </div>
                                    {sub.badge > 0 && <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-500 text-white shrink-0">
                                        {sub.badge}
                                      </span>}
                                  </button>)}
                              </div>}
                          </div>;
              })}
                    </div>
                  </div>

                  
                  <div className="mt-auto relative z-10">
                    <SidebarBottomOrnament roleLabel="Panel Admin TU" />
                  </div>

                  
                  <div className="sticky bottom-0 bg-slate-950 border-t border-white/10 p-4 space-y-2 relative z-10">
                    <button type="button" onClick={() => {
              fetchData(true);
              setIsAdminMobileMenuOpen(false);
            }} className="w-full min-h-[42px] py-2.5 px-3.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-white/10 text-white text-xs font-bold flex items-center justify-center gap-2 active:scale-95 transition-all shadow-sm">
                      <Icon name="refresh-cw" size={15} className={`shrink-0 ${isRefreshing ? 'animate-spin text-blue-400' : ''}`} />
                      <span className="truncate">Sinkronisasi Data Baru</span>
                    </button>

                    <button type="button" onClick={() => {
              setIsAdminMobileMenuOpen(false);
              handleUserLogout();
            }} className="w-full min-h-[42px] py-2.5 px-3.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/20 text-xs font-bold flex items-center justify-center gap-2 active:scale-95 transition-all shadow-sm">
                      <Icon name="log-out" size={15} className="shrink-0" />
                      <span className="truncate">Keluar Akun Admin TU</span>
                    </button>
                  </div>
                </div>
              </div>}

            <div className="w-full flex-1 bg-[#ebf1f8] flex flex-col md:flex-row min-h-screen mobile-full-height">
              
              <aside className="w-full md:w-72 lg:w-80 royal-blue-sidebar shrink-0 flex flex-col justify-between p-0 relative md:sticky md:top-0 md:h-screen md:self-start md:overflow-y-auto no-scrollbar z-20 overflow-x-hidden hide-on-mobile-nav">
                <div className="relative z-10">
                  
                  <div className="p-4 sm:p-5 m-3 sm:m-4 mb-2 bg-white/15 rounded-2xl border border-white/20 flex items-center gap-3.5 shadow-lg shadow-blue-950/20">
                    <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center text-white border border-white/30 overflow-hidden shrink-0 shadow-md">
                      <img src="logo.webp" alt="PAUD Setia Bhakti" loading="lazy" decoding="async" className="w-9 h-9 object-contain filter drop-shadow" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h1 className="font-black text-sm sm:text-base leading-tight text-white tracking-tight truncate">{settings.schoolName || 'PAUD SETIA BHAKTI'}</h1>
                      <div className="inline-flex items-center gap-1.5 mt-1 px-2 py-0.5 rounded-full bg-cyan-400/20 border border-cyan-400/30">
                        <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                        <span className="text-[10px] font-black text-cyan-200 uppercase tracking-wider">Admin Panel</span>
                      </div>
                    </div>
                  </div>

                  
                  <nav className="px-3 pr-3 py-2 sm:py-3 space-y-1.5 font-extrabold text-sm relative">
                    {[{
                id: 'dashboard',
                label: 'Dashboard',
                icon: 'home',
                defaultView: 'dashboard',
                views: ['dashboard']
              }, {
                id: 'keuangan',
                label: 'Keuangan SPP',
                icon: 'credit-card',
                defaultView: 'transaksi',
                views: ['transaksi', 'tunggakan', 'laporan'],
                subItems: [{
                  id: 'transaksi',
                  label: 'Catat Bayar Manual',
                  icon: 'plus-circle'
                }, {
                  id: 'tunggakan',
                  label: 'Follow-Up Tunggakan',
                  icon: 'phone-call',
                  badge: tunggakanStudentsCount,
                  badgeType: 'danger'
                }, {
                  id: 'laporan',
                  label: 'Cetak Laporan PDF',
                  icon: 'printer'
                }]
              }, {
                id: 'kesiswaan',
                label: 'Kesiswaan',
                icon: 'users',
                defaultView: 'siswa',
                views: ['siswa', 'catatan'],
                badge: unreadNotesRepliesList.length > 0 ? unreadNotesRepliesList.length : null,
                badgeType: 'danger',
                subItems: [{
                  id: 'siswa',
                  label: 'Data Murid',
                  icon: 'user-check'
                }, {
                  id: 'catatan',
                  label: 'Catatan Siswa TU',
                  icon: 'file-text',
                  badge: unreadNotesRepliesList.length > 0 ? unreadNotesRepliesList.length : null,
                  badgeType: 'danger'
                }]
              }, {
                id: 'komunikasi',
                label: 'Komunikasi',
                icon: 'message-square',
                defaultView: 'pengumuman',
                views: ['pengumuman', 'pengaduan'],
                badge: pendingComplaints.length || null,
                badgeType: 'danger',
                subItems: [{
                  id: 'pengumuman',
                  label: 'Pengumuman Sekolah',
                  icon: 'newspaper'
                }, {
                  id: 'pengaduan',
                  label: 'Pengaduan Wali',
                  icon: 'message-circle',
                  badge: pendingComplaints.length || null,
                  badgeType: 'danger'
                }]
              }, {
                id: 'pengaturan',
                label: 'Pengaturan',
                icon: 'settings',
                defaultView: 'pengaturan',
                views: ['pengaturan']
              }].map(group => {
                const isGroupActive = group.views.includes(currentView);
                const isExpanded = adminExpandedGroup === group.id;
                return <div key={group.id} className="w-full">
                          <button onClick={() => {
                    if (group.subItems) {
                      if (isExpanded) {
                        setAdminExpandedGroup(null);
                      } else {
                        setAdminExpandedGroup(group.id);
                        if (!isGroupActive) {
                          selectAdminView(group.defaultView);
                        }
                      }
                    } else {
                      setAdminExpandedGroup(group.id);
                      selectAdminView(group.defaultView);
                    }
                  }} className={`w-full py-3.5 px-4 flex items-center justify-between transition-all duration-200 text-xs sm:text-[13.5px] whitespace-nowrap rounded-2xl ${isGroupActive ? 'smurf-nav-active' : 'smurf-nav-item'}`}>
                            <div className="flex items-center gap-3 truncate">
                              <Icon name={group.icon} size={18} />
                              <span className="truncate">{group.label}</span>
                            </div>

                            <div className="flex items-center gap-1.5">
                              {group.badge !== undefined && group.badge !== null && <span className={`px-2 py-0.5 rounded-full text-[10px] font-black transition-all ${group.badge === 0 ? 'badge-zero-muted' : group.badgeType === 'danger' ? 'badge-danger-active ring-1 ring-rose-300' : group.badgeType === 'sky' ? 'badge-cyan-active' : 'badge-purple-active'}`}>
                                  {group.badge}
                                </span>}

                              {group.subItems && <Icon name="chevron-down" size={15} className={`transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />}
                            </div>
                          </button>

                          
                          {group.subItems && isExpanded && <div className="mt-1 ml-2 space-y-0.5 py-1">
                              {group.subItems.map(sub => <button key={sub.id} onClick={() => {
                      selectAdminView(sub.id);
                      setAdminExpandedGroup(group.id);
                    }} className={`w-full px-4 py-2.5 rounded-xl text-xs font-bold flex items-center justify-between transition-all ${currentView === sub.id ? 'bg-white text-sky-800 font-black shadow-md border border-cyan-300' : 'text-white/80 hover:text-white hover:bg-white/15'}`}>
                                  <div className="flex items-center gap-2 truncate">
                                    <Icon name={sub.icon} size={14} />
                                    <span className="truncate">{sub.label}</span>
                                  </div>
                                  {sub.badge !== undefined && sub.badge !== null && <span className={`px-2 py-0.5 rounded-full text-[10px] font-black transition-all ${sub.badge === 0 ? 'badge-zero-muted' : sub.badgeType === 'danger' ? 'badge-danger-active ring-1 ring-rose-300' : sub.badgeType === 'sky' ? 'badge-cyan-active' : sub.badgeType === 'purple' ? 'badge-purple-active' : 'badge-cyan-active'}`}>
                                      {sub.badge}
                                    </span>}
                                </button>)}
                            </div>}
                        </div>;
              })}
                  </nav>
                </div>

                
                <div className="mt-auto relative z-10 hidden md:block">
                  <SidebarBottomOrnament roleLabel="Panel Admin TU" />
                  <div className="p-3 sm:p-3.5 m-3 sm:m-4 mt-1 bg-white/15 rounded-2xl border border-white/20 text-white relative z-10 shadow-lg shadow-blue-950/20">
                    <div className="flex items-center justify-between gap-2.5">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="relative shrink-0">
                          <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center font-black text-sm text-white border border-white/25">
                            {settings.adminName ? settings.adminName.charAt(0) : 'A'}
                          </div>
                          <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-400 ring-2 ring-slate-900"></span>
                        </div>
                        <div className="truncate flex-1">
                          <p className="text-sm font-black text-white truncate">{settings.adminName || 'Admin TU'}</p>
                          <p className="text-xs text-blue-100/80 font-semibold truncate">Tahun Ajaran {settings.academicYear || 'Aktif'}</p>
                        </div>
                      </div>
                      <button onClick={handleUserLogout} title="Keluar Akun Admin" className="p-2 rounded-xl bg-white/10 hover:bg-rose-500/80 text-white/90 hover:text-white transition-all shadow-sm shrink-0">
                        <Icon name="log-out" size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              </aside>

            
            <main className="flex-1 flex flex-col min-w-0 min-h-0 mobile-nav-spacer relative">
              <PanelAestheticBg />
              
              <header className="px-4 sm:px-6 md:px-10 pt-7 sm:pt-8 pb-4 sm:pb-5 border-b border-slate-200/80 flex flex-col gap-3.5 sm:gap-4 bg-white relative z-20 md:sticky md:top-0 shadow-xs">
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

                  
                  <div className="hidden md:flex items-center gap-2.5 sm:gap-3 shrink-0">
                    
                    <button type="button" onClick={() => setShowAdminMobileBell(prev => !prev)} title="Notifikasi Masuk (Pengaduan, Transaksi & Balasan Catatan Siswa)" className={`relative px-3.5 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 shadow-sm cursor-pointer ${totalAdminUnread > 0 ? 'bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'}`}>
                      <Icon name="bell" size={17} className={totalAdminUnread > 0 ? 'text-rose-600' : 'text-slate-600'} />
                      <span className="hidden sm:inline">Notifikasi</span>
                      {totalAdminUnread > 0 && <span className="px-1.5 py-0.2 min-w-[18px] text-center bg-rose-500 text-white rounded-full text-[10px] font-black shadow-xs">
                          {totalAdminUnread > 99 ? '99+' : totalAdminUnread}
                        </span>}
                    </button>

                    <button onClick={() => fetchData(true)} title="Sinkronisasi Data" className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-bold transition-all flex items-center gap-2 shadow-sm">
                      <Icon name="refresh-cw" size={17} className={isRefreshing ? 'animate-spin text-blue-600' : ''} />
                      <span className="hidden sm:inline">Sinkronisasi</span>
                    </button>

                    <button onClick={handleUserLogout} title="Keluar Akun Admin" className="px-4 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl text-sm font-bold border border-rose-200 transition-colors flex items-center gap-2 shadow-sm">
                      <Icon name="log-out" size={17} />
                      <span className="hidden sm:inline">Keluar</span>
                    </button>
                  </div>
                </div>
              </header>

              
              {['transaksi', 'tunggakan', 'laporan'].includes(currentView) && <div className="flex md:hidden items-center gap-2 px-4 py-2.5 bg-slate-100/90 border-b border-slate-200 overflow-x-auto no-scrollbar shrink-0 relative z-10">
                  <button onClick={() => selectAdminView('transaksi')} className={`px-3.5 py-1.5 rounded-full text-xs font-black transition-all shrink-0 flex items-center gap-1.5 ${currentView === 'transaksi' ? 'bg-blue-600 text-white shadow-sm' : 'bg-white text-slate-600 border border-slate-200'}`}>
                    <Icon name="credit-card" size={13} />
                    <span>Catat Bayar</span>
                  </button>
                  <button onClick={() => selectAdminView('tunggakan')} className={`px-3.5 py-1.5 rounded-full text-xs font-black transition-all shrink-0 flex items-center gap-1.5 ${currentView === 'tunggakan' ? 'bg-blue-600 text-white shadow-sm' : 'bg-white text-slate-600 border border-slate-200'}`}>
                    <Icon name="alert-circle" size={13} className={currentView === 'tunggakan' ? 'text-amber-200' : 'text-amber-500'} />
                    <span>Tunggakan</span>
                  </button>
                  <button onClick={() => selectAdminView('laporan')} className={`px-3.5 py-1.5 rounded-full text-xs font-black transition-all shrink-0 flex items-center gap-1.5 ${currentView === 'laporan' ? 'bg-blue-600 text-white shadow-sm' : 'bg-white text-slate-600 border border-slate-200'}`}>
                    <Icon name="file-text" size={13} />
                    <span>Laporan PDF</span>
                  </button>
                </div>}

              {['siswa', 'catatan'].includes(currentView) && <div className="flex md:hidden items-center gap-2 px-4 py-2.5 bg-slate-100/90 border-b border-slate-200 overflow-x-auto no-scrollbar shrink-0 relative z-10">
                  <button onClick={() => selectAdminView('siswa')} className={`px-3.5 py-1.5 rounded-full text-xs font-black transition-all shrink-0 flex items-center gap-1.5 ${currentView === 'siswa' ? 'bg-blue-600 text-white shadow-sm' : 'bg-white text-slate-600 border border-slate-200'}`}>
                    <Icon name="users" size={13} />
                    <span>Data Murid ({students.length})</span>
                  </button>
                  <button onClick={() => selectAdminView('catatan')} className={`px-3.5 py-1.5 rounded-full text-xs font-black transition-all shrink-0 flex items-center gap-1.5 ${currentView === 'catatan' ? 'bg-blue-600 text-white shadow-sm' : 'bg-white text-slate-600 border border-slate-200'}`}>
                    <Icon name="file-edit" size={13} />
                    <span>Catatan TU</span>
                    {unreadNotesRepliesList.length > 0 && <span className="px-1.5 py-0.2 rounded-full text-[10px] font-black bg-rose-500 text-white">
                        {unreadNotesRepliesList.length}
                      </span>}
                  </button>
                </div>}

              {['pengumuman', 'pengaduan'].includes(currentView) && <div className="flex md:hidden items-center gap-2 px-4 py-2.5 bg-slate-100/90 border-b border-slate-200 overflow-x-auto no-scrollbar shrink-0 relative z-10">
                  <button onClick={() => selectAdminView('pengumuman')} className={`px-3.5 py-1.5 rounded-full text-xs font-black transition-all shrink-0 flex items-center gap-1.5 ${currentView === 'pengumuman' ? 'bg-blue-600 text-white shadow-sm' : 'bg-white text-slate-600 border border-slate-200'}`}>
                    <Icon name="newspaper" size={13} />
                    <span>Pengumuman</span>
                  </button>
                  <button onClick={() => selectAdminView('pengaduan')} className={`px-3.5 py-1.5 rounded-full text-xs font-black transition-all shrink-0 flex items-center gap-1.5 ${currentView === 'pengaduan' ? 'bg-blue-600 text-white shadow-sm' : 'bg-white text-slate-600 border border-slate-200'}`}>
                    <Icon name="message-square" size={13} />
                    <span>Pengaduan Wali</span>
                    {pendingComplaints.length > 0 && <span className="px-1.5 py-0.2 rounded-full text-[10px] font-black bg-rose-500 text-white">
                        {pendingComplaints.length}
                      </span>}
                  </button>
                </div>}

              <div key={currentView} className="px-3.5 py-4 sm:px-6 md:p-10 space-y-6 sm:space-y-8 flex-1 animate-tab-switch relative z-10">
            {currentView === 'dashboard' && <DashboardView students={students} transactions={transactions} announcements={announcements} complaints={complaints} notes={notes} settings={settings} navigateTo={selectAdminView} totalAdminUnread={totalAdminUnread} unreadNotesReplies={unreadNotesRepliesList} onShowKuitansi={handleShowKuitansi} onCheckPendingStatus={trx => handleSyncPendingOrder(trx, {
          manual: true
        })} onMarkReadNotification={handleMarkReadNotification} onMarkAllRead={handleMarkAllAdminRead} onOpenNotifications={handleOpenAdminBell} onRefresh={fetchData} isRefreshing={isRefreshing} />}

            {currentView === 'siswa' && <SiswaListView students={students} settings={settings} transactions={transactions} onAddStudent={handleAddStudent} onUpdateStudent={handleUpdateStudent} onDeleteStudent={handleDeleteStudent} showToast={showToast} />}

            {currentView === 'transaksi' && <TransaksiView students={students} transactions={transactions} settings={settings} onAddTransaction={handleAddTransaction} onShowKuitansi={handleShowKuitansi} onUpdateStudent={handleUpdateStudent} />}

            {currentView === 'laporan' && <LaporanView students={students} transactions={transactions} settings={settings} />}

            {currentView === 'pengumuman' && <AdminPengumumanView announcements={announcements} onAddAnnouncement={handleAddAnnouncement} onUpdateAnnouncement={handleUpdateAnnouncement} onDeleteAnnouncement={handleDeleteAnnouncement} />}

            {currentView === 'pengaduan' && <AdminPengaduanView complaints={complaints} onReplyComplaint={handleReplyComplaint} onToggleComplaintStatus={handleToggleComplaintStatus} onMarkAsRead={handleMarkReadNotification} />}

            {currentView === 'tunggakan' && <AdminTunggakanView students={students} transactions={transactions} settings={settings} navigateTo={selectAdminView} />}

            {currentView === 'catatan' && <AdminCatatanView students={students} notes={notes} onAddNote={handleAddNote} onMarkNoteRead={handleMarkNoteRead} onDeleteNote={handleDeleteNote} />}
              {currentView === 'pengaturan' && <AdminPengaturanView settings={settings} onSaveSettings={handleUpdateSettings} />}

              </div>
            </main>
          </div>

        </div>

        {isRefreshing && <RefreshLoadingOverlay />}

        {selectedKuitansi && <KuitansiModal transaction={selectedKuitansi} settings={settings} onClose={handleCloseKuitansi} />}

        <ToastNotification toast={toast} onClose={handleCloseToast} />
        <CrudPopupModal popup={crudPopup} onClose={handleClosePopup} />
      </>;
}

window.__SPP_MountFullApp = function (existingRoot, handoff) {
  try {
    document.documentElement.classList.remove('spp-has-session');
  } catch (e) {}
  const targetRoot = existingRoot || ReactDOM.createRoot(document.getElementById('root'));
  targetRoot.render(<App initialHandoff={handoff || window.__SPP_LOGIN_HANDOFF || null} />);
  return targetRoot;
};

if (!window.__SPP_DEFER_APP_MOUNT) {
  window.__SPP_MountFullApp();
}
