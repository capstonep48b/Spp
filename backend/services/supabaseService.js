const {
  formatDateIndoServer,
  isSettledStatus,
  isPendingStatus,
  didBillMatch,
  isUuid,
  generateKuitansiNo,
  toIsoTimestampOrNull
} = require('../utils/midtrans');

const activeOrderSyncLocks = new Map();

async function withOrderSyncLock(orderId, taskFn) {
  const lockKey = String(orderId || '').trim();
  if (!lockKey) return taskFn();
  const prev = activeOrderSyncLocks.get(lockKey) || Promise.resolve();
  let releaseCurrent;
  const currentPromise = new Promise((resolve) => {
    releaseCurrent = resolve;
  });
  const chained = prev.catch(() => {}).then(() => currentPromise);
  activeOrderSyncLocks.set(lockKey, chained);
  await prev.catch(() => {});
  try {
    return await taskFn();
  } finally {
    releaseCurrent();
    if (activeOrderSyncLocks.get(lockKey) === chained) {
      activeOrderSyncLocks.delete(lockKey);
    }
  }
}

function buildSupabaseHeaders(supabaseKey, prefer = '') {
  const headers = {
    'apikey': supabaseKey,
    'Content-Type': 'application/json'
  };
  if (supabaseKey && supabaseKey.startsWith('eyJ')) {
    headers['Authorization'] = `Bearer ${supabaseKey}`;
  }
  if (prefer) {
    headers['Prefer'] = prefer;
  }
  return headers;
}

function isMissingColumnError(resOrMsg, columnName = 'expires_at') {
  const errText = typeof resOrMsg === 'string'
    ? resOrMsg
    : String(resOrMsg?.error || '');
  const errCode = typeof resOrMsg === 'object' ? String(resOrMsg?.code || '') : '';
  const col = String(columnName || '').toLowerCase();
  if (!errText && !errCode) return false;
  const lower = errText.toLowerCase();
  if (errCode === 'PGRST204' && (!col || lower.includes(col))) return true;
  return Boolean(col && lower.includes(col) && /(column|schema cache|pgrst204|does not exist|could not find)/i.test(lower));
}

async function supabaseRestFetch(config, resourcePath, options = {}, fetchFn = globalThis.fetch) {
  if (!config.supabaseRestUrl || !config.supabaseServerKey) {
    return { configured: false, ok: false, status: 0, data: null, error: 'Supabase belum dikonfigurasi', code: null };
  }

  const cleanResource = resourcePath.startsWith('/') ? resourcePath : `/${resourcePath}`;
  const targetUrl = `${config.supabaseRestUrl}${cleanResource}`;
  const method = (options.method || 'GET').toUpperCase();
  const prefer = options.prefer || (method === 'POST' || method === 'PATCH' ? 'return=representation' : '');
  const headers = buildSupabaseHeaders(config.supabaseServerKey, prefer);

  const response = await fetchFn(targetUrl, {
    method,
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined
  });

  const rawText = await response.text();
  let parsed = null;
  if (rawText) {
    try {
      parsed = JSON.parse(rawText);
    } catch (e) {
      parsed = rawText;
    }
  }

  if (!response.ok) {
    const errMsg = (parsed && typeof parsed === 'object' && (parsed.message || parsed.error_description || parsed.hint))
      ? (parsed.message || parsed.error_description || parsed.hint)
      : `HTTP ${response.status}`;
    const errCode = (parsed && typeof parsed === 'object' && parsed.code) ? String(parsed.code) : null;
    return { configured: true, ok: false, status: response.status, data: null, error: errMsg, code: errCode };
  }

  return { configured: true, ok: true, status: response.status, data: parsed, error: null, code: null };
}

async function insertTransactionSafe(config, trxInsertBody, fetchFn = globalThis.fetch) {
  let res = await supabaseRestFetch(
    config,
    '/transactions',
    { method: 'POST', body: trxInsertBody },
    fetchFn
  );
  let strippedExpiresAt = false;
  if (!res.ok && Object.prototype.hasOwnProperty.call(trxInsertBody, 'expires_at') && isMissingColumnError(res, 'expires_at')) {
    const { expires_at: _omit, ...fallbackBody } = trxInsertBody;
    strippedExpiresAt = true;
    res = await supabaseRestFetch(
      config,
      '/transactions',
      { method: 'POST', body: fallbackBody },
      fetchFn
    );
  }
  if (strippedExpiresAt && res.ok && Array.isArray(res.data) && res.data[0] && trxInsertBody.expires_at) {
    res = { ...res, data: [{ ...res.data[0], expires_at: trxInsertBody.expires_at }, ...res.data.slice(1)] };
  }
  return res;
}

async function patchTransactionSafe(config, rowId, patchBody, fetchFn = globalThis.fetch) {
  let res = await supabaseRestFetch(
    config,
    `/transactions?id=eq.${encodeURIComponent(rowId)}`,
    { method: 'PATCH', body: patchBody },
    fetchFn
  );
  let strippedExpiresAt = false;
  if (!res.ok && Object.prototype.hasOwnProperty.call(patchBody, 'expires_at') && isMissingColumnError(res, 'expires_at')) {
    const { expires_at: _omit, ...fallbackBody } = patchBody;
    strippedExpiresAt = true;
    res = await supabaseRestFetch(
      config,
      `/transactions?id=eq.${encodeURIComponent(rowId)}`,
      { method: 'PATCH', body: fallbackBody },
      fetchFn
    );
  }
  if (strippedExpiresAt && res.ok && Array.isArray(res.data) && res.data[0] && patchBody.expires_at) {
    res = { ...res, data: [{ ...res.data[0], expires_at: patchBody.expires_at }, ...res.data.slice(1)] };
  }
  return res;
}

async function findTransactionByOrderId(config, orderId, fetchFn = globalThis.fetch) {
  const cleanOrderId = String(orderId || '').trim();
  if (!cleanOrderId || !config.supabaseRestUrl || !config.supabaseServerKey) return null;
  const findRes = await supabaseRestFetch(
    config,
    `/transactions?order_id=eq.${encodeURIComponent(cleanOrderId)}&select=*&limit=1`,
    { method: 'GET' },
    fetchFn
  );
  if (findRes.ok && Array.isArray(findRes.data) && findRes.data.length > 0) {
    return findRes.data[0];
  }
  return null;
}

async function loadSettingsMetadata(config, fetchFn = globalThis.fetch) {
  if (!config.supabaseRestUrl || !config.supabaseServerKey) return null;
  const res = await supabaseRestFetch(
    config,
    '/settings?select=id,school_name,academic_year,active_period_name,midtrans_client_key,midtrans_server_key&limit=1',
    { method: 'GET' },
    fetchFn
  );
  if (res.ok && Array.isArray(res.data) && res.data.length > 0) {
    return res.data[0];
  }
  return null;
}

async function findStudentByIdentifier(config, identifier, fetchFn = globalThis.fetch) {
  const cleanId = String(identifier || '').trim();
  if (!cleanId || !config.supabaseRestUrl || !config.supabaseServerKey) return null;
  const query = isUuid(cleanId)
    ? `id=eq.${encodeURIComponent(cleanId)}`
    : `nis=eq.${encodeURIComponent(cleanId)}`;
  const res = await supabaseRestFetch(
    config,
    `/students?${query}&select=id,nis,name,kelas,tarif&limit=1`,
    { method: 'GET' },
    fetchFn
  ).catch(() => null);
  if (res && res.ok && Array.isArray(res.data) && res.data.length > 0) {
    return res.data[0];
  }
  return null;
}

async function closeSiblingPendingTransactions(config, studentId, resolvedMonth, isArrearsRow, winnerOrderId, winnerRowId, fetchFn = globalThis.fetch) {
  if (!studentId || !isUuid(studentId) || !config.supabaseRestUrl || !config.supabaseServerKey) return;
  const trxRes = await supabaseRestFetch(
    config,
    `/transactions?student_id=eq.${encodeURIComponent(studentId)}&select=id,order_id,month,status`,
    { method: 'GET' },
    fetchFn
  ).catch(() => null);
  if (!trxRes || !trxRes.ok || !Array.isArray(trxRes.data)) return;
  const siblings = trxRes.data.filter((t) => {
    if (!t || !t.id || !isPendingStatus(t.status)) return false;
    if (winnerRowId && String(t.id) === String(winnerRowId)) return false;
    if (winnerOrderId && t.order_id && String(t.order_id) === String(winnerOrderId)) return false;
    return didBillMatch(t.month, resolvedMonth, isArrearsRow);
  });
  const nowIso = new Date().toISOString();
  for (const sib of siblings) {
    await patchTransactionSafe(
      config,
      sib.id,
      { status: 'Dibatalkan', payment_time: nowIso },
      fetchFn
    ).catch(() => null);
  }
}

async function syncMidtransResultToSupabase(config, payload, mappedStatus, methodLabel, existingTrx = null, fetchFn = globalThis.fetch, contextHint = null) {
  const orderId = String(payload?.order_id || contextHint?.orderId || '').trim();
  if (!orderId || !config.supabaseRestUrl || !config.supabaseServerKey) {
    return { synced: false, updatedTransaction: null, clearedArrears: false };
  }

  return withOrderSyncLock(orderId, async () => {
    let row = existingTrx;
    if (!row) {
      row = await findTransactionByOrderId(config, orderId, fetchFn);
    }

    const cf3Parts = String(payload?.custom_field3 || '').split('|');
    const cfType = String(cf3Parts[0] || '').trim().toUpperCase();
    const cfKuitansi = String(cf3Parts[1] || '').trim();
    const cfKelas = String(cf3Parts[2] || '').trim();
    const resolvedMonth = contextHint?.month || payload?.custom_field2 || row?.month || 'SPP Online';
    const isArrearsRow =
      String(resolvedMonth || '').toLowerCase().startsWith('tunggakan') ||
      cfType === 'ARREARS' ||
      Boolean(contextHint?.isArrearsPayment);

    const paymentTimestamp = payload.settlement_time || payload.transaction_time || row?.payment_time || new Date().toISOString();
    const hasConcretePaymentType = Boolean(payload?.payment_type && String(payload.payment_type).trim().toLowerCase() !== 'pending');
    const parsedExpiryIso = toIsoTimestampOrNull(payload.expiry_time || payload.expires_at || contextHint?.expiryTime || contextHint?.expiresAt);
    const nowSettled = isSettledStatus(mappedStatus);
    const normalizedMappedLower = String(mappedStatus || '').trim().toLowerCase();

    if (!row) {
      const shouldCreate =
        isPendingStatus(mappedStatus) ||
        nowSettled ||
        normalizedMappedLower === 'menunggu verifikasi';
      if (!shouldCreate) {
        return { synced: false, updatedTransaction: null, clearedArrears: false };
      }

      const studentHintId = contextHint?.studentId || contextHint?.nis || payload?.custom_field1 || '';
      const studentRec = (!contextHint?.studentName || !isUuid(contextHint?.studentId)) && studentHintId
        ? await findStudentByIdentifier(config, studentHintId, fetchFn)
        : null;
      const dbSettings = contextHint?.academicYear
        ? null
        : await loadSettingsMetadata(config, fetchFn).catch(() => null);

      const resolvedStudentId = isUuid(contextHint?.studentId)
        ? contextHint.studentId
        : (studentRec && isUuid(studentRec.id) ? studentRec.id : (isUuid(payload?.custom_field1) ? payload.custom_field1 : null));

      if (!nowSettled && resolvedStudentId) {
        const existingCheck = await supabaseRestFetch(
          config,
          `/transactions?student_id=eq.${encodeURIComponent(resolvedStudentId)}&select=id,month,status,order_id`,
          { method: 'GET' },
          fetchFn
        ).catch(() => null);
        if (existingCheck && existingCheck.ok && Array.isArray(existingCheck.data)) {
          const settledMatch = existingCheck.data.find(
            (t) => isSettledStatus(t.status) && didBillMatch(t.month, resolvedMonth, isArrearsRow)
          );
          if (settledMatch) {
            return { synced: false, updatedTransaction: settledMatch, clearedArrears: false, alreadySettled: true };
          }
        }
      }

      const resolvedStudentName = contextHint?.studentName || studentRec?.name || 'Siswa';
      const resolvedKelas = contextHint?.kelas || studentRec?.kelas || cfKelas || '-';
      const resolvedAmount = Math.round(Number(payload?.gross_amount || contextHint?.amount || studentRec?.tarif || 0));
      const resolvedMethod = hasConcretePaymentType
        ? methodLabel
        : (contextHint?.method || methodLabel || 'Midtrans Snap Online');
      const resolvedKuitansi = contextHint?.kuitansiNo || cfKuitansi || generateKuitansiNo();

      const trxInsertBody = {
        student_id: resolvedStudentId,
        student_name: resolvedStudentName,
        kelas: resolvedKelas,
        month: resolvedMonth,
        amount: resolvedAmount,
        method: resolvedMethod,
        status: mappedStatus,
        is_read: nowSettled ? false : true,
        date: formatDateIndoServer(paymentTimestamp),
        kuitansi_no: resolvedKuitansi,
        order_id: orderId,
        snap_token: contextHint?.snapToken || null,
        payment_type: payload?.payment_type || (nowSettled ? 'settlement' : 'pending'),
        payment_time: paymentTimestamp,
        academic_year: contextHint?.academicYear || dbSettings?.academic_year || null,
        period_name: contextHint?.periodName || dbSettings?.active_period_name || null
      };
      if (parsedExpiryIso) {
        trxInsertBody.expires_at = parsedExpiryIso;
      }

      const insertRes = await insertTransactionSafe(config, trxInsertBody, fetchFn);
      const insertedRow = (insertRes.ok && Array.isArray(insertRes.data) && insertRes.data[0])
        ? {
            ...(parsedExpiryIso && !insertRes.data[0].expires_at ? { expires_at: parsedExpiryIso } : {}),
            ...insertRes.data[0],
            ...(parsedExpiryIso ? { expires_at: insertRes.data[0].expires_at || parsedExpiryIso } : {})
          }
        : trxInsertBody;

      let clearedArrears = false;
      if (nowSettled && isArrearsRow && resolvedStudentId) {
        const stPatch = await supabaseRestFetch(
          config,
          `/students?id=eq.${encodeURIComponent(resolvedStudentId)}`,
          {
            method: 'PATCH',
            body: {
              arrears_amount: 0,
              arrears_note: `Lunas via Midtrans Online (${formatDateIndoServer(paymentTimestamp)})`
            }
          },
          fetchFn
        );
        clearedArrears = Boolean(stPatch.ok);
      }

      if (nowSettled && resolvedStudentId) {
        await closeSiblingPendingTransactions(config, resolvedStudentId, resolvedMonth, isArrearsRow, orderId, insertedRow?.id, fetchFn).catch(() => null);
      }

      return {
        synced: Boolean(insertRes.ok),
        created: true,
        updatedTransaction: insertedRow,
        clearedArrears
      };
    }

    const wasSettled = isSettledStatus(row.status);
    if (wasSettled && !nowSettled && normalizedMappedLower !== 'refund') {
      return { synced: false, updatedTransaction: row, clearedArrears: false };
    }

    const nextMethod = hasConcretePaymentType
      ? methodLabel
      : (row.method || methodLabel || 'Midtrans Snap Online');

    const patchBody = {
      status: mappedStatus,
      method: nextMethod,
      payment_type: payload.payment_type || row.payment_type || null,
      payment_time: paymentTimestamp
    };

    if (!row.snap_token && contextHint?.snapToken) {
      patchBody.snap_token = contextHint.snapToken;
    }

    if (parsedExpiryIso) {
      patchBody.expires_at = parsedExpiryIso;
    }

    if (nowSettled && !wasSettled) {
      patchBody.is_read = false;
      patchBody.date = formatDateIndoServer(paymentTimestamp);
    }

    const patchRes = await patchTransactionSafe(config, row.id, patchBody, fetchFn);

    const updatedTransaction = (patchRes.ok && Array.isArray(patchRes.data) && patchRes.data[0])
      ? { ...(parsedExpiryIso && !patchRes.data[0].expires_at ? { expires_at: parsedExpiryIso } : {}), ...patchRes.data[0], ...(parsedExpiryIso ? { expires_at: patchRes.data[0].expires_at || parsedExpiryIso } : {}) }
      : { ...row, ...patchBody };

    let clearedArrears = false;
    const targetStudentId = row.student_id || (isUuid(contextHint?.studentId) ? contextHint.studentId : null);
    if (nowSettled && isArrearsRow && targetStudentId) {
      const stPatch = await supabaseRestFetch(
        config,
        `/students?id=eq.${encodeURIComponent(targetStudentId)}`,
        {
          method: 'PATCH',
          body: {
            arrears_amount: 0,
            arrears_note: `Lunas via Midtrans Online (${formatDateIndoServer(paymentTimestamp)})`
          }
        },
        fetchFn
      );
      clearedArrears = Boolean(stPatch.ok);
    }

    if (nowSettled && targetStudentId) {
      await closeSiblingPendingTransactions(config, targetStudentId, resolvedMonth, isArrearsRow, orderId, row.id, fetchFn).catch(() => null);
    }

    return { synced: Boolean(patchRes.ok), created: false, updatedTransaction, clearedArrears };
  });
}

module.exports = {
  buildSupabaseHeaders,
  isMissingColumnError,
  supabaseRestFetch,
  insertTransactionSafe,
  patchTransactionSafe,
  findTransactionByOrderId,
  loadSettingsMetadata,
  syncMidtransResultToSupabase
};

