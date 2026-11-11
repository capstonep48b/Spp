const isComplaintPending = c => {
  if (!c) return false;
  const nowMs = Date.now();
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
  if (expiresAt && nowMs > expiresAt) return false;
  if (c.isLocked || c.status === 'Terkunci' || c.status === 'Locked' || c.status === 'Selesai' || c.status === 'Tertutup') return false;
  const localAdminReadList = readJsonLsCached('spp_admin_read_complaints', []);
  const localAdminReadMsgCounts = readJsonLsCached('spp_admin_read_complaint_msgs', {});
  const msgs = Array.isArray(c.messages) ? c.messages : typeof c.messages === 'string' ? (() => {
    try {
      return JSON.parse(c.messages);
    } catch (e) {
      return [];
    }
  })() : [];
  const readCount = localAdminReadMsgCounts[c.id];
  if (readCount !== undefined && msgs.length <= readCount) {
    return false;
  }
  if (c.isRead && (readCount === undefined || msgs.length <= readCount)) {
    return false;
  }
  if (localAdminReadList.includes(c.id) && msgs.length === 0) {
    return false;
  }
  if (msgs.length > 0) {
    const lastMsg = msgs[msgs.length - 1];
    const isLastFromAdmin = Boolean(lastMsg.senderRole === 'admin' || lastMsg.sender === 'Admin TU' || lastMsg.sender === 'Admin' || typeof lastMsg.sender === 'string' && lastMsg.sender.toLowerCase().includes('admin'));
    if (isLastFromAdmin) return false;
    return true;
  }
  if (c.adminReply && c.adminReply.trim().length > 0 || c.admin_reply && c.admin_reply.trim().length > 0) {
    return false;
  }
  return true;
};

const getMonthsList = (settingsOrStartMonth, academicYear = '', optEndMonth = '', optStartYear = null, optEndYear = null) => {
  let startMonth = 'Juli';
  let startYear = 2026;
  let endMonth = 'Juni';
  let endYear = 2027;
  if (typeof settingsOrStartMonth === 'object' && settingsOrStartMonth !== null) {
    startMonth = settingsOrStartMonth.startMonth || 'Juli';
    startYear = parseInt(settingsOrStartMonth.startYear) || 2026;
    endMonth = settingsOrStartMonth.endMonth || 'Juni';
    endYear = parseInt(settingsOrStartMonth.endYear) || startYear + 1;
  } else if (typeof settingsOrStartMonth === 'string') {
    startMonth = settingsOrStartMonth || 'Juli';
    if (optStartYear) startYear = parseInt(optStartYear);
    if (optEndMonth) endMonth = optEndMonth;
    if (optEndYear) endYear = parseInt(optEndYear);else if (academicYear && academicYear.includes('/')) {
      const parts = academicYear.replace(/[^0-9/]/g, '').split('/');
      if (parts[0]) startYear = parseInt(parts[0]) || 2026;
      if (parts[1]) endYear = parseInt(parts[1]) || startYear + 1;
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

const getSemesterMonths = (monthsList, semester = 'all') => {
  if (!Array.isArray(monthsList) || monthsList.length === 0) return [];
  const semStr = String(semester || 'all').toLowerCase();
  if (semStr === 'all' || semStr === 'semua' || semStr.includes('tahun') || semStr.includes('semua')) {
    return monthsList;
  }
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

const detectSemesterFromPeriod = (period, fallback = 'all') => {
  if (!period) {
    const fb = String(fallback || '').toLowerCase();
    if (fb.includes('1') || fb.includes('ganjil')) return '1';
    if (fb.includes('2') || fb.includes('genap')) return '2';
    return 'all';
  }
  const pName = String(period.name || '').toLowerCase();
  const pSem = String(period.semester || '').toLowerCase();
  if (pName.includes('(semester 1)') || pName.includes('semester 1') || pName.includes('smt 1') || pName.includes('ganjil') || pSem.includes('1') || pSem.includes('ganjil')) {
    return '1';
  }
  if (pName.includes('(semester 2)') || pName.includes('semester 2') || pName.includes('smt 2') || pName.includes('genap') || pSem.includes('2') || pSem.includes('genap')) {
    return '2';
  }
  const startM = String(period.startMonth || '').toLowerCase();
  const endM = String(period.endMonth || '').toLowerCase();
  if (startM.includes('jul') && (endM.includes('des') || endM.includes('dec'))) return '1';
  if (startM.includes('jan') && endM.includes('jun')) return '2';
  return 'all';
};

const isMonthDueOrElapsed = (monthStr, now = new Date(), optArg = 10) => {
  if (!monthStr) return false;
  const cleanStr = monthStr.trim();
  const parts = cleanStr.split(/\s+/);
  const mName = parts[0];
  const mYear = parts[1] ? parseInt(parts[1], 10) : now.getFullYear();
  const mIdx = ALL_MONTHS.indexOf(mName);
  if (mIdx === -1) return false;
  const curYear = now.getFullYear();
  const curMonth = now.getMonth();
  if (mYear > curYear) {
    return false;
  }
  if (mYear < curYear) {
    return true;
  }
  if (mIdx <= curMonth) {
    return true;
  }
  return false;
};

const isMonthOnOrAfterStudentStart = (monthStr, student, settings = null) => {
  if (!monthStr) return false;
  const cleanStr = monthStr.trim();
  const parts = cleanStr.split(/\s+/);
  const mName = parts[0];
  const mIdx = ALL_MONTHS.indexOf(mName);
  if (mIdx === -1) return true;
  const mYear = parts[1] ? parseInt(parts[1], 10) : settings?.startYear ? parseInt(settings.startYear, 10) : new Date().getFullYear();
  let sStartMonth = student?.startActiveMonth;
  let sStartYear = student?.startActiveYear ? parseInt(student.startActiveYear, 10) : null;
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

const getSystemEarliestPeriodStart = settings => {
  let startY = settings?.startYear ? parseInt(settings.startYear, 10) : 2026;
  let startM = settings?.startMonth || 'Juli';
  let startIdx = ALL_MONTHS.indexOf(startM);
  if (startIdx === -1) startIdx = 6;
  if (Array.isArray(settings?.academicPeriods) && settings.academicPeriods.length > 0) {
    settings.academicPeriods.forEach(p => {
      const pY = parseInt(p.startYear, 10);
      const pIdx = ALL_MONTHS.indexOf(p.startMonth);
      if (!isNaN(pY) && pIdx !== -1) {
        if (pY < startY || pY === startY && pIdx < startIdx) {
          startY = pY;
          startM = p.startMonth;
          startIdx = pIdx;
        }
      }
    });
  }
  return {
    month: startM,
    year: startY,
    monthIdx: startIdx
  };
};

const getStudentEffectiveStart = (student, settings) => {
  const sysEarliest = getSystemEarliestPeriodStart(settings);
  let sMonth = student?.startActiveMonth;
  let sYear = student?.startActiveYear ? parseInt(student.startActiveYear, 10) : null;
  if (!sMonth || !sYear || isNaN(sYear)) {
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
  if (sYear < sysEarliest.year || sYear === sysEarliest.year && sIdx < sysEarliest.monthIdx) {
    return {
      month: sysEarliest.month,
      year: sysEarliest.year
    };
  }
  return {
    month: sMonth,
    year: sYear
  };
};

const getStudentAllBillingMonths = (student, settings, optSelectedPeriod = null) => {
  const effStart = getStudentEffectiveStart(student, settings);
  const targetEndObj = optSelectedPeriod || settings;
  const endM = targetEndObj?.endMonth || settings?.endMonth || 'Juni';
  const endY = parseInt(targetEndObj?.endYear || settings?.endYear) || effStart.year + 1;
  let startM = effStart.month;
  let startY = effStart.year;
  if (optSelectedPeriod && !optSelectedPeriod.isActive && optSelectedPeriod.startMonth && optSelectedPeriod.startYear) {
    const pStartIdx = ALL_MONTHS.indexOf(optSelectedPeriod.startMonth);
    const pStartY = parseInt(optSelectedPeriod.startYear, 10);
    const sStartIdx = ALL_MONTHS.indexOf(effStart.month);
    if (pStartY > effStart.year || pStartY === effStart.year && pStartIdx > sStartIdx) {
      startM = optSelectedPeriod.startMonth;
      startY = pStartY;
    }
  }
  const allMonths = getMonthsList(startM, '', endM, startY, endY);
  return allMonths.filter(m => isMonthOnOrAfterStudentStart(m, student, settings));
};
