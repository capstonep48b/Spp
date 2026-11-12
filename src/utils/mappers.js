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

const mapSettingsFromDb = row => {
  const storedExt = readJsonLsCached('spp_extended_settings', null);
  const localExt = storedExt && typeof storedExt === 'object' ? storedExt : {};
  const customClasses = row.custom_classes ? typeof row.custom_classes === 'string' ? JSON.parse(row.custom_classes) : row.custom_classes : localExt.customClasses || [];
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
      academicPeriods = [{
        id: '1',
        name: row.active_period_name || `Periode ${row.academic_year}`,
        startMonth: row.start_month || 'Juli',
        startYear: Number(row.start_year) || 2025,
        endMonth: row.end_month || 'Juni',
        endYear: Number(row.end_year) || 2026,
        semester: row.semester || 'Semua',
        isActive: true
      }];
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
    sessionToken: row.session_token || '',
    dueDateDay: Number(row.due_date_day || localExt.dueDateDay || 10),
    midtransClientKey: row.midtrans_client_key || localExt.midtransClientKey || window.AppEnv?.midtransClientKey || '',
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

const mapStudentFromDb = row => {
  let classHistory = [];
  if (row.class_history) {
    try {
      classHistory = typeof row.class_history === 'string' ? JSON.parse(row.class_history) : row.class_history;
    } catch (e) {}
  }
  if (!Array.isArray(classHistory) || classHistory.length === 0) {
    const localKey = 'spp_class_history_' + (row.id || row.nis);
    const storedHistory = readJsonLsCached(localKey, null);
    if (Array.isArray(storedHistory)) {
      classHistory = storedHistory;
    }
  }
  const localLevelKey = 'spp_completed_levels_' + (row.id || row.nis);
  const storedLevels = readJsonLsCached(localLevelKey, null);
  const completedLevels = storedLevels && typeof storedLevels === 'object' ? storedLevels : {};
  const isAktif = row.status ? row.status === 'Aktif' : row.status_aktif !== undefined ? Boolean(row.status_aktif) : true;
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
    arrearsNote: row.arrears_note && !String(row.arrears_note).startsWith('sess_') ? row.arrears_note : '',
    sessionToken: row.session_token || '',
    startActiveMonth: row.start_active_month || row.startActiveMonth || '',
    startActiveYear: row.start_active_year ? Number(row.start_active_year) : row.startActiveYear ? Number(row.startActiveYear) : null,
    classHistory: Array.isArray(classHistory) ? classHistory : [],
    completedLevels: completedLevels
  };
};

const DEFAULT_CLIENT_SNAP_EXPIRY_MS = 5 * 60 * 1000;

const parseMidtransTimestampClientMs = val => {
  if (typeof val === 'number' && Number.isFinite(val)) return val > 0 ? val : 0;
  if (!val) return 0;
  const str = String(val).trim();
  if (!str || str === '-') return 0;
  if (/^\d{10,13}$/.test(str)) {
    const n = Number(str);
    return str.length <= 10 ? n * 1000 : n;
  }
  const midMatch = str.match(/^(\d{4}-\d{2}-\d{2})\s+(\d{2}:\d{2}:\d{2})(?:\.\d+)?$/);
  if (midMatch) {
    const p = Date.parse(`${midMatch[1]}T${midMatch[2]}+07:00`);
    return Number.isFinite(p) ? p : 0;
  }
  const parsed = Date.parse(str);
  return Number.isFinite(parsed) ? parsed : 0;
};

const readTrxMetaCache = () => {
  const c = readJsonLsCached('spp_trx_meta_cache', {});
  return c && typeof c === 'object' ? c : {};
};

const saveTrxMetaCache = (orderId, meta = {}) => {
  if (!orderId) return;
  try {
    const prevMap = readTrxMetaCache();
    const existing = prevMap[orderId] || {};
    const nextEntry = {
      ...existing
    };
    if (meta.snapToken) nextEntry.snapToken = meta.snapToken;
    if (meta.snapUrl) nextEntry.snapUrl = meta.snapUrl;
    if (meta.method && meta.method !== '-' && meta.method !== 'pending') nextEntry.method = meta.method;
    if (meta.expiresAt) nextEntry.expiresAt = meta.expiresAt;
    if (Number(meta.expiresAtMs) > 0) nextEntry.expiresAtMs = Number(meta.expiresAtMs);
    if (Number(meta.createdAtMs) > 0) nextEntry.createdAtMs = Number(meta.createdAtMs);
    if (meta.vaNumber) nextEntry.vaNumber = meta.vaNumber;
    if (meta.vaBank) nextEntry.vaBank = meta.vaBank;
    if (meta.billKey) nextEntry.billKey = meta.billKey;
    if (meta.billerCode) nextEntry.billerCode = meta.billerCode;
    if (meta.paymentCode) nextEntry.paymentCode = meta.paymentCode;
    if (meta.qrCodeUrl) nextEntry.qrCodeUrl = meta.qrCodeUrl;
    if (meta.transactionId) nextEntry.transactionId = meta.transactionId;
    if (meta.acquirer) nextEntry.acquirer = meta.acquirer;
    if (meta.paymentType) nextEntry.paymentType = meta.paymentType;
    if (meta.snapRedirectUrl) nextEntry.snapRedirectUrl = meta.snapRedirectUrl;
    nextEntry.updatedAt = Date.now();
    const entries = Object.entries({
      ...prevMap,
      [orderId]: nextEntry
    });
    if (entries.length > 80) {
      entries.sort((a, b) => (b[1]?.updatedAt || 0) - (a[1]?.updatedAt || 0));
    }
    writeJsonLsCached('spp_trx_meta_cache', Object.fromEntries(entries.slice(0, 80)));
  } catch (e) {}
};

const isTrxSettled = trx => {
  if (!trx || !trx.status) return false;
  const s = String(trx.status).trim().toLowerCase();
  return s === 'lunas' || s === 'berhasil' || s === 'sukses' || s === 'settlement' || s === 'capture';
};

const isTrxPendingStatus = trx => {
  if (!trx || isTrxSettled(trx)) return false;
  const s = String(trx.status || '').trim().toLowerCase();
  return s === 'pending' || s.startsWith('menunggu') || s === 'authorize';
};

const isTrxExpiredOrFailed = trx => {
  if (!trx) return false;
  const s = String(trx.status || '').trim().toLowerCase();
  return s.includes('kadaluarsa') || s.includes('expire') || s.includes('batal') || s.includes('cancel') || s.includes('gagal') || s.includes('deny') || s.includes('fail');
};

const computeClientTransactionExpiryMs = trx => {
  if (!trx) return 0;
  const explicitMs = Number(trx.expiresAtMs || 0) || parseMidtransTimestampClientMs(trx.expiresAt || trx.expires_at || trx.expiryTime || trx.expiry_time);
  const createdMs = Number(trx.createdAtMs || 0) || parseMidtransTimestampClientMs(trx.created_at || trx.paymentTime || trx.payment_time);
  const paymentTypeLower = String(trx.paymentType || trx.payment_type || '').trim().toLowerCase();
  if (paymentTypeLower === 'pending' && createdMs > 0) {
    const capMs = createdMs + DEFAULT_CLIENT_SNAP_EXPIRY_MS;
    return explicitMs > 0 ? Math.min(explicitMs, capMs) : capMs;
  }
  if (explicitMs > 0) return explicitMs;
  if (createdMs > 0) return createdMs + DEFAULT_CLIENT_SNAP_EXPIRY_MS;
  return 0;
};

const mapTransactionFromDb = row => {
  const readList = readJsonLsCached('spp_admin_read_trx', []);
  const localAdminRead = Array.isArray(readList) && readList.includes(row.id);
  const metaMap = readTrxMetaCache();
  const meta = row.order_id && metaMap[row.order_id] ? metaMap[row.order_id] : null;
  const createdAtMs = parseMidtransTimestampClientMs(row.created_at || meta?.createdAtMs || 0);
  const rawExpMs = parseMidtransTimestampClientMs(row.expires_at || row.expiry_time || meta?.expiresAtMs || meta?.expiresAt || 0);
  const paymentTypeLower = String(row.payment_type || '').trim().toLowerCase();
  const fiveMinCapMs = createdAtMs > 0 ? createdAtMs + DEFAULT_CLIENT_SNAP_EXPIRY_MS : 0;
  const expiresAtMs = paymentTypeLower === 'pending' && fiveMinCapMs > 0
    ? rawExpMs > 0 ? Math.min(rawExpMs, fiveMinCapMs) : fiveMinCapMs
    : rawExpMs > 0 ? rawExpMs : fiveMinCapMs;
  const resolvedMethod = row.method && row.method !== '-' && String(row.method).toLowerCase() !== 'pending' ? row.method : meta?.method || row.method || '-';
  return {
    id: row.id,
    studentId: row.student_id,
    studentName: row.student_name,
    kelas: row.kelas,
    month: row.month,
    amount: Number(row.amount || 0),
    method: resolvedMethod,
    status: row.status,
    isRead: Boolean(row.is_read || localAdminRead),
    date: formatDateIndo(row.date && row.date !== '-' ? row.date : row.created_at || '-'),
    kuitansiNo: row.kuitansi_no || '-',
    orderId: row.order_id || '',
    snapToken: row.snap_token || meta?.snapToken || '',
    snapUrl: row.snap_url || meta?.snapUrl || '',
    paymentType: row.payment_type || meta?.paymentType || '',
    paymentTime: row.payment_time || '',
    vaNumber: row.va_number || meta?.vaNumber || '',
    vaBank: row.va_bank || meta?.vaBank || '',
    billKey: row.bill_key || meta?.billKey || '',
    billerCode: row.biller_code || meta?.billerCode || '',
    paymentCode: row.payment_code || meta?.paymentCode || '',
    qrCodeUrl: row.qr_code_url || meta?.qrCodeUrl || '',
    transactionId: row.transaction_id || meta?.transactionId || '',
    acquirer: row.acquirer || meta?.acquirer || '',
    snapRedirectUrl: row.snap_redirect_url || meta?.snapRedirectUrl || '',
    createdAtMs,
    expiresAt: row.expires_at || meta?.expiresAt || '',
    expiresAtMs,
    keringananNote: row.keringanan_note || ''
  };
};

const mapAnnouncementFromDb = row => ({
  id: row.id,
  title: row.title || 'Pengumuman Sekolah',
  content: row.content || '',
  imageUrl: row.image_url || '',
  isRead: row.is_read || false,
  date: formatDateIndo(row.date || row.created_at || new Date())
});

const mapComplaintFromDb = row => {
  const createdTime = row.created_at ? new Date(row.created_at).getTime() : typeof row.id === 'number' ? row.id : Date.now();
  const expiresTime = row.expires_at ? new Date(row.expires_at).getTime() : createdTime + 3600000;
  const readList = readJsonLsCached('spp_admin_read_complaints', []);
  const localAdminRead = Array.isArray(readList) && readList.includes(row.id);
  const formattedDate = formatDateIndo(row.date || row.created_at || new Date());
  const rawMessages = row.messages ? typeof row.messages === 'string' ? JSON.parse(row.messages) : row.messages : [];
  return {
    id: row.id,
    studentId: row.student_id,
    studentName: row.student_name,
    waliName: row.wali_name,
    title: row.title || 'Pengaduan / Masukan',
    content: row.content || '',
    adminReply: row.admin_reply || '',
    messages: Array.isArray(rawMessages) ? rawMessages.map(m => ({
      ...m,
      time: formatDateTimeIndo(m.time, formattedDate)
    })) : [],
    status: row.status || 'Belum Ditangani',
    isRead: Boolean(row.is_read || localAdminRead),
    date: formattedDate,
    createdAtMs: createdTime,
    expiresAtMs: expiresTime
  };
};

const mapNoteFromDb = row => {
  const baseDate = formatDateIndo(row.date || row.created_at || new Date());
  const rawDateStr = String(row.date || '');
  const hasTime = /[•,]|\d{1,2}[:.]\d{2}/.test(rawDateStr);
  const timeSuffix = !hasTime && row.created_at ? ' • ' + new Date(row.created_at).toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit'
  }).replace(/\./g, ':') + ' WIB' : '';
  const fullDate = `${baseDate}${timeSuffix}`;
  const rawComments = typeof row.comments === 'string' ? JSON.parse(row.comments || '[]') : row.comments || [];
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
    comments: Array.isArray(rawComments) ? rawComments.map(c => ({
      ...c,
      time: formatDateTimeIndo(c.time, baseDate)
    })) : []
  };
};
