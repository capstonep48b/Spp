const { isPlaceholderKey } = require('../config/env');
const { encodeBase64Utf8 } = require('../utils/crypto');
const {
  DEFAULT_SNAP_EXPIRY_MS,
  formatDateIndoServer,
  isUuid,
  sanitizePhone,
  parseMidtransTimestampMs,
  computeTransactionExpiryMs,
  generateOrderId,
  generateKuitansiNo,
  mapMidtransStatus,
  isSettledStatus,
  isPendingStatus,
  isTerminalFailedStatus,
  didBillMatch,
  normalizeChannelKey,
  resolveEnabledPaymentsForChannel,
  getInitialMethodLabelForChannel,
  formatMidtransPaymentDetails,
  formatMidtransMethodLabel,
  jsonResult
} = require('../utils/midtrans');
const {
  supabaseRestFetch,
  patchTransactionSafe,
  findTransactionByOrderId,
  loadSettingsMetadata,
  syncMidtransResultToSupabase
} = require('./supabaseService');

const activeBillCreationLocks = new Map();
const pendingOrderContextByOrderId = new Map();
const activeDraftOrdersByBillKey = new Map();
const DRAFT_CONTEXT_TTL_MS = 2 * 60 * 60 * 1000;

function pruneExpiredDrafts() {
  const now = Date.now();
  for (const [ord, ctx] of pendingOrderContextByOrderId.entries()) {
    if (!ctx || now - (ctx.createdAtMs || 0) > DRAFT_CONTEXT_TTL_MS) {
      pendingOrderContextByOrderId.delete(ord);
    }
  }
  for (const [lk, ctx] of activeDraftOrdersByBillKey.entries()) {
    if (!ctx || now - (ctx.createdAtMs || 0) > DRAFT_CONTEXT_TTL_MS || !pendingOrderContextByOrderId.has(ctx.orderId)) {
      activeDraftOrdersByBillKey.delete(lk);
    }
  }
}

function saveDraftOrderContext(lockKey, draftContext) {
  pruneExpiredDrafts();
  if (pendingOrderContextByOrderId.size > 500) {
    const oldestKey = pendingOrderContextByOrderId.keys().next().value;
    if (oldestKey) pendingOrderContextByOrderId.delete(oldestKey);
  }
  if (draftContext && draftContext.orderId) {
    pendingOrderContextByOrderId.set(draftContext.orderId, draftContext);
    if (lockKey) {
      activeDraftOrdersByBillKey.set(lockKey, draftContext);
    }
  }
}

function getDraftOrderContext(orderId) {
  const key = String(orderId || '').trim();
  if (!key) return null;
  const ctx = pendingOrderContextByOrderId.get(key) || null;
  if (!ctx) return null;
  if (Date.now() - (ctx.createdAtMs || 0) > DRAFT_CONTEXT_TTL_MS) {
    pendingOrderContextByOrderId.delete(key);
    return null;
  }
  return ctx;
}

function cleanupDraftOrder(orderId) {
  const key = String(orderId || '').trim();
  if (!key) return;
  pendingOrderContextByOrderId.delete(key);
  for (const [lk, ctx] of activeDraftOrdersByBillKey.entries()) {
    if (ctx && ctx.orderId === key) {
      activeDraftOrdersByBillKey.delete(lk);
    }
  }
}

async function withBillCreationLock(lockKey, taskFn) {
  const prev = activeBillCreationLocks.get(lockKey) || Promise.resolve();
  let releaseCurrent;
  const currentPromise = new Promise((resolve) => {
    releaseCurrent = resolve;
  });
  const chained = prev.catch(() => {}).then(() => currentPromise);
  activeBillCreationLocks.set(lockKey, chained);
  await prev.catch(() => {});
  try {
    return await taskFn();
  } finally {
    releaseCurrent();
    if (activeBillCreationLocks.get(lockKey) === chained) {
      activeBillCreationLocks.delete(lockKey);
    }
  }
}

async function resolveActiveMidtransCredentials(config, dbSettings) {
  let clientKey = config.midtransClientKey;
  let serverKey = config.midtransServerKey;
  let source = 'env';

  const dbClient = dbSettings && typeof dbSettings.midtrans_client_key === 'string' ? dbSettings.midtrans_client_key.trim() : '';
  const dbServer = dbSettings && typeof dbSettings.midtrans_server_key === 'string' ? dbSettings.midtrans_server_key.trim() : '';

  if (isPlaceholderKey(clientKey) && dbClient && !isPlaceholderKey(dbClient) && /^(?:SB-)?Mid-client-/i.test(dbClient)) {
    clientKey = dbClient;
    source = 'supabase_settings_fallback';
  }
  if (isPlaceholderKey(serverKey) && dbServer && !isPlaceholderKey(dbServer) && /^(?:SB-)?Mid-server-/i.test(dbServer)) {
    serverKey = dbServer;
    source = 'supabase_settings_fallback';
  }

  const clientKeyConfigured = !isPlaceholderKey(clientKey);
  const serverKeyConfigured = !isPlaceholderKey(serverKey);

  return {
    clientKey,
    serverKey,
    clientKeyConfigured,
    serverKeyConfigured,
    ready: clientKeyConfigured && serverKeyConfigured,
    isDemoPlaceholder: !clientKeyConfigured || !serverKeyConfigured,
    source
  };
}

async function fetchCoreOrderStatusRaw(config, serverKey, orderId, fetchFn = globalThis.fetch) {
  const targetCoreUrl = `${config.midtransCoreApiUrl}/${encodeURIComponent(orderId)}/status`;
  const midRes = await fetchFn(targetCoreUrl, {
    method: 'GET',
    headers: {
      'Accept': 'application/json',
      'Authorization': `Basic ${encodeBase64Utf8(`${serverKey}:`)}`
    }
  });
  const text = await midRes.text();
  const midJson = text ? JSON.parse(text) : {};
  return { midRes, midJson };
}

async function cancelCoreOrderBestEffort(config, serverKey, orderId, fetchFn = globalThis.fetch) {
  if (!orderId) return { ok: true, settled: false };
  try {
    const targetCancelUrl = `${config.midtransCoreApiUrl}/${encodeURIComponent(orderId)}/cancel`;
    const cancelRes = await fetchFn(targetCancelUrl, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': `Basic ${encodeBase64Utf8(`${serverKey}:`)}`
      }
    });
    const text = await cancelRes.text();
    const cancelJson = text ? JSON.parse(text) : {};
    const code = String(cancelJson.status_code || '');
    if (code === '412' || cancelRes.status === 403 || code === '403') {
      const { midRes, midJson } = await fetchCoreOrderStatusRaw(config, serverKey, orderId, fetchFn);
      if (midRes.ok && String(midJson.status_code) !== '404') {
        const mapped = mapMidtransStatus(midJson.transaction_status, midJson.fraud_status);
        if (isSettledStatus(mapped)) {
          return { ok: false, settled: true, midJson, mappedStatus: mapped };
        }
      }
    }
    return { ok: cancelRes.ok || code === '404' || code === '412' || cancelRes.status === 403 || code === '403', settled: false };
  } catch (e) {
    return { ok: false, settled: false };
  }
}

function buildPendingConflictResponse(row, fallbackMonth, fallbackAmount, snapUrl, corsHeaders, extra = {}) {
  const expMs = extra.expiresAtMs !== undefined ? extra.expiresAtMs : computeTransactionExpiryMs(row);
  const expTime = extra.expiryTime || row.expires_at || (expMs > 0 ? new Date(expMs).toISOString() : '');
  const resolvedMethod = extra.method || row.method || 'Midtrans Snap Online';
  return jsonResult(409, {
    ok: false,
    code: 'PENDING_TRANSACTION_EXISTS',
    message: `Tagihan "${row.month || fallbackMonth}" masih memiliki transaksi Pending yang aktif (${row.order_id || 'tanpa Order ID'}). Silakan selesaikan atau batalkan transaksi tersebut terlebih dahulu.`,
    orderId: row.order_id || '',
    snapToken: row.snap_token || '',
    amount: Number(row.amount || fallbackAmount || 0),
    month: row.month || fallbackMonth,
    method: resolvedMethod,
    expiryTime: expTime,
    expiresAtMs: expMs,
    paymentDetails: extra.paymentDetails || null,
    snapUrl,
    transaction: extra.transaction || row
  }, corsHeaders);
}

async function createSnapTransaction(config, payload, corsHeaders, fetchFn = globalThis.fetch) {
  const month = String(payload.month || '').trim();
  const studentId = String(payload.studentId || '').trim();
  const nis = String(payload.nis || '').trim();
  const isArrearsPayment = Boolean(payload.isArrearsPayment);
  const preferredChannel = String(payload.preferredChannel || '').trim();
  const replacePending = Boolean(payload.replacePending);

  if (!month || (!studentId && !nis)) {
    return jsonResult(400, {
      ok: false,
      code: 'MISSING_FIELDS',
      message: 'Parameter wajib (studentId/nis dan month) belum lengkap.'
    }, corsHeaders);
  }

  if (preferredChannel && /(tunai|cash|kantor\s*tu|manual)/i.test(preferredChannel)) {
    return jsonResult(400, {
      ok: false,
      code: 'INVALID_PAYMENT_CHANNEL',
      message: 'Pembayaran tunai hanya diproses langsung di loket Tata Usaha sekolah.'
    }, corsHeaders);
  }

  const lockStudentPart = String(studentId || nis).trim().toLowerCase();
  const lockBillPart = isArrearsPayment ? '__arrears__' : month.toLowerCase();
  const lockKey = `${lockStudentPart}::${lockBillPart}`;

  return withBillCreationLock(lockKey, async () => {
    const dbSettings = await loadSettingsMetadata(config, fetchFn).catch(() => null);
    const creds = await resolveActiveMidtransCredentials(config, dbSettings);

    if (!creds.serverKeyConfigured || !creds.clientKeyConfigured) {
      return jsonResult(503, {
        ok: false,
        code: 'MIDTRANS_NOT_CONFIGURED',
        mode: config.mode,
        isDemoPlaceholder: true,
        message: 'Midtrans Client Key / Server Key belum diisi (masih menggunakan key demo placeholder di .env).'
      }, corsHeaders);
    }

    let student = null;
    if (config.supabaseRestUrl && config.supabaseServerKey) {
      const filterQuery = isUuid(studentId)
        ? `id=eq.${encodeURIComponent(studentId)}`
        : `nis=eq.${encodeURIComponent(nis || studentId)}`;

      const stRes = await supabaseRestFetch(
        config,
        `/students?${filterQuery}&select=id,nis,name,kelas,tarif,wali,telepon,status,arrears_amount,arrears_note&limit=1`,
        { method: 'GET' },
        fetchFn
      );

      if (stRes.ok && Array.isArray(stRes.data) && stRes.data.length > 0) {
        student = stRes.data[0];
      } else if (stRes.ok) {
        return jsonResult(404, {
          ok: false,
          code: 'STUDENT_NOT_FOUND',
          message: 'Data murid tidak ditemukan di database.'
        }, corsHeaders);
      } else {
        return jsonResult(502, {
          ok: false,
          code: 'SUPABASE_LOOKUP_FAILED',
          message: `Gagal memverifikasi data murid dari Supabase: ${stRes.error}`
        }, corsHeaders);
      }
    } else {
      student = {
        id: studentId || null,
        nis: nis || '',
        name: String(payload.studentName || 'Siswa').trim(),
        kelas: String(payload.kelas || '').trim(),
        tarif: Number(payload.amount || 0),
        wali: String(payload.wali || '').trim(),
        telepon: String(payload.telepon || '').trim(),
        status: 'Aktif',
        arrears_amount: Number(payload.amount || 0),
        arrears_note: month
      };
    }

    if (student.status && String(student.status).toLowerCase() !== 'aktif') {
      return jsonResult(403, {
        ok: false,
        code: 'STUDENT_INACTIVE',
        message: 'Akun siswa berstatus Non-Aktif / Lulus / Keluar sehingga tidak dapat melakukan pembayaran online.'
      }, corsHeaders);
    }

    const rawAmount = isArrearsPayment ? Number(student.arrears_amount || 0) : Number(student.tarif || 0);
    const grossAmount = Math.round(rawAmount > 0 ? rawAmount : Number(payload.amount || 0));

    if (!Number.isFinite(grossAmount) || grossAmount <= 0) {
      return jsonResult(400, {
        ok: false,
        code: 'INVALID_AMOUNT',
        message: 'Nominal tagihan SPP harus lebih dari Rp 0.'
      }, corsHeaders);
    }

    const billMonthLabel = isArrearsPayment
      ? (student.arrears_note && !String(student.arrears_note).startsWith('sess_')
          ? `Tunggakan (${student.arrears_note})`
          : 'Tunggakan Kelas Sebelumnya')
      : month;

    if (config.supabaseRestUrl && config.supabaseServerKey && student.id && isUuid(student.id)) {
      const trxCheck = await supabaseRestFetch(
        config,
        `/transactions?student_id=eq.${encodeURIComponent(student.id)}&select=*`,
        { method: 'GET' },
        fetchFn
      );
      if (trxCheck.ok && Array.isArray(trxCheck.data)) {
        const matchingRows = trxCheck.data.filter((t) => didBillMatch(t.month, billMonthLabel, isArrearsPayment));
        const alreadySettled = matchingRows.find((t) => isSettledStatus(t.status));
        if (alreadySettled) {
          return jsonResult(409, {
            ok: false,
            code: 'ALREADY_PAID',
            message: `Tagihan "${billMonthLabel}" untuk ${student.name} sudah berstatus Lunas.`
          }, corsHeaders);
        }

        const pendingRows = [...matchingRows]
          .filter((t) => isPendingStatus(t.status))
          .reverse()
          .sort((a, b) => parseMidtransTimestampMs(b.created_at) - parseMidtransTimestampMs(a.created_at));

        if (pendingRows.length > 0) {
          const nowMs = Date.now();
          for (const olderPending of pendingRows.slice(1)) {
            const olderExp = computeTransactionExpiryMs(olderPending);
            if (olderPending.order_id && olderExp > 0 && nowMs < olderExp) {
              try {
                const { midRes: oldRes, midJson: oldJson } = await fetchCoreOrderStatusRaw(
                  config,
                  creds.serverKey,
                  olderPending.order_id,
                  fetchFn
                );
                if (oldRes.ok && String(oldJson.status_code) !== '404') {
                  const oldMapped = mapMidtransStatus(oldJson.transaction_status, oldJson.fraud_status);
                  if (isSettledStatus(oldMapped)) {
                    await syncMidtransResultToSupabase(
                      config,
                      { ...oldJson, order_id: oldJson.order_id || olderPending.order_id },
                      oldMapped,
                      formatMidtransMethodLabel(oldJson),
                      olderPending,
                      fetchFn
                    );
                    return jsonResult(409, {
                      ok: false,
                      code: 'ALREADY_PAID',
                      message: `Tagihan "${billMonthLabel}" untuk ${student.name} sudah berstatus Lunas.`
                    }, corsHeaders);
                  }
                }
              } catch (e) {}
            }
            if (olderPending.id) {
              const targetOldStatus = olderExp > 0 && nowMs >= olderExp ? 'Kadaluarsa' : 'Dibatalkan';
              if (targetOldStatus === 'Dibatalkan' && olderPending.order_id) {
                await cancelCoreOrderBestEffort(config, creds.serverKey, olderPending.order_id, fetchFn).catch(() => null);
              }
              await patchTransactionSafe(
                config,
                olderPending.id,
                { status: targetOldStatus, payment_time: new Date().toISOString() },
                fetchFn
              ).catch(() => null);
              cleanupDraftOrder(olderPending.order_id);
            }
          }

          const newestPending = pendingRows[0];
          const localExpiryMs = computeTransactionExpiryMs(newestPending);

          if (newestPending.order_id) {
            try {
              const { midRes, midJson } = await fetchCoreOrderStatusRaw(
                config,
                creds.serverKey,
                newestPending.order_id,
                fetchFn
              );

              if (midRes.ok && String(midJson.status_code) !== '404') {
                let coreMapped = mapMidtransStatus(midJson.transaction_status, midJson.fraud_status);
                const coreExpiryMs = parseMidtransTimestampMs(midJson.expiry_time) || localExpiryMs;
                if (isPendingStatus(coreMapped) && coreExpiryMs > 0 && Date.now() >= coreExpiryMs) {
                  coreMapped = 'Kadaluarsa';
                }
                const methodLabel = formatMidtransMethodLabel(midJson);
                const syncRes = await syncMidtransResultToSupabase(
                  config,
                  { ...midJson, order_id: midJson.order_id || newestPending.order_id },
                  coreMapped,
                  methodLabel,
                  newestPending,
                  fetchFn
                );

                if (isSettledStatus(coreMapped)) {
                  return jsonResult(409, {
                    ok: false,
                    code: 'ALREADY_PAID',
                    message: `Tagihan "${billMonthLabel}" untuk ${student.name} sudah berstatus Lunas.`
                  }, corsHeaders);
                }

                if (!isTerminalFailedStatus(coreMapped)) {
                  if (replacePending) {
                    const cancelOutcome = await cancelCoreOrderBestEffort(config, creds.serverKey, newestPending.order_id, fetchFn);
                    if (cancelOutcome.settled && cancelOutcome.midJson) {
                      await syncMidtransResultToSupabase(
                        config,
                        { ...cancelOutcome.midJson, order_id: newestPending.order_id },
                        cancelOutcome.mappedStatus,
                        formatMidtransMethodLabel(cancelOutcome.midJson),
                        newestPending,
                        fetchFn
                      );
                      return jsonResult(409, {
                        ok: false,
                        code: 'ALREADY_PAID',
                        message: `Tagihan "${billMonthLabel}" untuk ${student.name} baru saja terkonfirmasi Lunas.`
                      }, corsHeaders);
                    }
                    if (newestPending.id) {
                      await patchTransactionSafe(
                        config,
                        newestPending.id,
                        { status: 'Dibatalkan', payment_time: new Date().toISOString() },
                        fetchFn
                      ).catch(() => null);
                    }
                    cleanupDraftOrder(newestPending.order_id);
                  } else {
                    const conflictDetails = formatMidtransPaymentDetails(midJson);
                    return buildPendingConflictResponse(
                      newestPending,
                      billMonthLabel,
                      grossAmount,
                      config.midtransSnapUrl,
                      corsHeaders,
                      {
                        expiresAtMs: coreExpiryMs,
                        expiryTime: midJson.expiry_time || newestPending.expires_at || '',
                        method: syncRes.updatedTransaction?.method || newestPending.method,
                        paymentDetails: conflictDetails,
                        transaction: syncRes.updatedTransaction || newestPending
                      }
                    );
                  }
                }
              } else if (String(midJson.status_code) === '404') {
                const isAbandonedLegacy = String(newestPending.payment_type || '').trim().toLowerCase() === 'pending';
                if ((replacePending || isAbandonedLegacy || (localExpiryMs > 0 && nowMs >= localExpiryMs)) && newestPending.id) {
                  await patchTransactionSafe(
                    config,
                    newestPending.id,
                    { status: replacePending ? 'Dibatalkan' : 'Kadaluarsa', payment_time: new Date().toISOString() },
                    fetchFn
                  ).catch(() => null);
                  cleanupDraftOrder(newestPending.order_id);
                } else {
                  return buildPendingConflictResponse(
                    newestPending,
                    billMonthLabel,
                    grossAmount,
                    config.midtransSnapUrl,
                    corsHeaders,
                    { expiresAtMs: localExpiryMs }
                  );
                }
              } else {
                if ((replacePending || (localExpiryMs > 0 && nowMs >= localExpiryMs)) && newestPending.id) {
                  if (replacePending) {
                    await cancelCoreOrderBestEffort(config, creds.serverKey, newestPending.order_id, fetchFn).catch(() => null);
                  }
                  await patchTransactionSafe(
                    config,
                    newestPending.id,
                    { status: replacePending ? 'Dibatalkan' : 'Kadaluarsa', payment_time: new Date().toISOString() },
                    fetchFn
                  ).catch(() => null);
                  cleanupDraftOrder(newestPending.order_id);
                } else {
                  return buildPendingConflictResponse(
                    newestPending,
                    billMonthLabel,
                    grossAmount,
                    config.midtransSnapUrl,
                    corsHeaders,
                    { expiresAtMs: localExpiryMs }
                  );
                }
              }
            } catch (e) {
              if ((replacePending || (localExpiryMs > 0 && nowMs >= localExpiryMs)) && newestPending.id) {
                await patchTransactionSafe(
                  config,
                  newestPending.id,
                  { status: replacePending ? 'Dibatalkan' : 'Kadaluarsa', payment_time: new Date().toISOString() },
                  fetchFn
                ).catch(() => null);
                cleanupDraftOrder(newestPending.order_id);
              } else {
                return buildPendingConflictResponse(
                  newestPending,
                  billMonthLabel,
                  grossAmount,
                  config.midtransSnapUrl,
                  corsHeaders,
                  { expiresAtMs: localExpiryMs }
                );
              }
            }
          } else {
            if ((replacePending || (localExpiryMs > 0 && nowMs >= localExpiryMs)) && newestPending.id) {
              await patchTransactionSafe(
                config,
                newestPending.id,
                { status: replacePending ? 'Dibatalkan' : 'Kadaluarsa', payment_time: new Date().toISOString() },
                fetchFn
              ).catch(() => null);
            } else {
              return buildPendingConflictResponse(
                newestPending,
                billMonthLabel,
                grossAmount,
                config.midtransSnapUrl,
                corsHeaders,
                { expiresAtMs: localExpiryMs }
              );
            }
          }
        }
      }
    }

    const existingDraft = activeDraftOrdersByBillKey.get(lockKey);
    if (existingDraft && existingDraft.orderId) {
      const nowDraftMs = Date.now();
      if (existingDraft.expiresAtMs > 0 && nowDraftMs >= existingDraft.expiresAtMs) {
        cleanupDraftOrder(existingDraft.orderId);
      } else {
        try {
          const { midRes, midJson } = await fetchCoreOrderStatusRaw(
            config,
            creds.serverKey,
            existingDraft.orderId,
            fetchFn
          );
          if (midRes.ok && String(midJson.status_code) !== '404') {
            let draftMapped = mapMidtransStatus(midJson.transaction_status, midJson.fraud_status);
            const draftExpiryMs = parseMidtransTimestampMs(midJson.expiry_time) || existingDraft.expiresAtMs;
            if (isPendingStatus(draftMapped) && draftExpiryMs > 0 && Date.now() >= draftExpiryMs) {
              draftMapped = 'Kadaluarsa';
            }
            const draftMethodLabel = formatMidtransMethodLabel(midJson);
            const syncDraftRes = await syncMidtransResultToSupabase(
              config,
              { ...midJson, order_id: midJson.order_id || existingDraft.orderId },
              draftMapped,
              draftMethodLabel,
              null,
              fetchFn,
              existingDraft
            );
            if (isSettledStatus(draftMapped)) {
              cleanupDraftOrder(existingDraft.orderId);
              return jsonResult(409, {
                ok: false,
                code: 'ALREADY_PAID',
                message: `Tagihan "${billMonthLabel}" untuk ${student.name} sudah berstatus Lunas.`
              }, corsHeaders);
            }
            if (!isTerminalFailedStatus(draftMapped)) {
              if (replacePending) {
                const cancelOutcome = await cancelCoreOrderBestEffort(config, creds.serverKey, existingDraft.orderId, fetchFn);
                if (cancelOutcome.settled && cancelOutcome.midJson) {
                  await syncMidtransResultToSupabase(
                    config,
                    { ...cancelOutcome.midJson, order_id: existingDraft.orderId },
                    cancelOutcome.mappedStatus,
                    formatMidtransMethodLabel(cancelOutcome.midJson),
                    syncDraftRes.updatedTransaction || null,
                    fetchFn,
                    existingDraft
                  );
                  cleanupDraftOrder(existingDraft.orderId);
                  return jsonResult(409, {
                    ok: false,
                    code: 'ALREADY_PAID',
                    message: `Tagihan "${billMonthLabel}" untuk ${student.name} baru saja terkonfirmasi Lunas.`
                  }, corsHeaders);
                }
                if (syncDraftRes.updatedTransaction?.id) {
                  await patchTransactionSafe(
                    config,
                    syncDraftRes.updatedTransaction.id,
                    { status: 'Dibatalkan', payment_time: new Date().toISOString() },
                    fetchFn
                  ).catch(() => null);
                }
              } else {
                const draftPaymentDetails = formatMidtransPaymentDetails(midJson);
                const draftRow = syncDraftRes.updatedTransaction || {
                  id: existingDraft.orderId,
                  student_id: existingDraft.studentId,
                  student_name: existingDraft.studentName,
                  kelas: existingDraft.kelas,
                  month: existingDraft.month,
                  amount: existingDraft.amount,
                  method: draftMethodLabel,
                  status: draftMapped,
                  date: formatDateIndoServer(new Date()),
                  kuitansi_no: existingDraft.kuitansiNo,
                  order_id: existingDraft.orderId,
                  snap_token: existingDraft.snapToken,
                  expires_at: midJson.expiry_time || existingDraft.expiryTime
                };
                return buildPendingConflictResponse(
                  draftRow,
                  billMonthLabel,
                  grossAmount,
                  config.midtransSnapUrl,
                  corsHeaders,
                  {
                    expiresAtMs: draftExpiryMs,
                    expiryTime: midJson.expiry_time || existingDraft.expiryTime,
                    method: draftRow.method || draftMethodLabel,
                    paymentDetails: draftPaymentDetails,
                    transaction: draftRow
                  }
                );
              }
            }
            cleanupDraftOrder(existingDraft.orderId);
          } else if (String(midJson.status_code) === '404') {
            cleanupDraftOrder(existingDraft.orderId);
          }
        } catch (e) {
          cleanupDraftOrder(existingDraft.orderId);
        }
      }
    }

    const orderId = generateOrderId(student.nis || student.id);
    const kuitansiNo = generateKuitansiNo();
    const safePhone = sanitizePhone(student.telepon);
    const itemName = (isArrearsPayment
      ? `Tunggakan ${student.name}`
      : `SPP ${billMonthLabel}${student.kelas ? ` (${student.kelas})` : ''}`).slice(0, 50);
    const normalizedChannelCode = normalizeChannelKey(preferredChannel);
    const enabledPayments = resolveEnabledPaymentsForChannel(preferredChannel);
    const initialMethodLabel = getInitialMethodLabelForChannel(preferredChannel);
    const cf3Raw = `${isArrearsPayment ? 'ARREARS' : 'MONTHLY_SPP'}|${kuitansiNo}|${String(student.kelas || '').slice(0, 20)}`;

    const snapBody = {
      transaction_details: {
        order_id: orderId,
        gross_amount: grossAmount
      },
      credit_card: {
        secure: true
      },
      expiry: {
        unit: 'minute',
        duration: 5
      },
      customer_details: {
        first_name: String(student.name || 'Wali Murid').slice(0, 50),
        ...(student.wali ? { last_name: `Wali: ${String(student.wali).slice(0, 40)}` } : {}),
        ...(safePhone ? { phone: safePhone } : {})
      },
      item_details: [
        {
          id: (isArrearsPayment ? 'SPP-TUNGGAKAN' : `SPP-${billMonthLabel}`).replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 50),
          price: grossAmount,
          quantity: 1,
          name: itemName
        }
      ],
      custom_field1: String(student.id || student.nis || '').slice(0, 50),
      custom_field2: billMonthLabel.slice(0, 50),
      custom_field3: cf3Raw.slice(0, 50)
    };

    if (Array.isArray(enabledPayments) && enabledPayments.length > 0) {
      snapBody.enabled_payments = enabledPayments;
    }

    const finishUrl = config.finishRedirectUrl || config.appBaseUrl;
    if (finishUrl) {
      snapBody.callbacks = { finish: finishUrl };
    }

    let midtransRes;
    let midtransJson = {};
    try {
      midtransRes = await fetchFn(config.midtransApiUrl, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'Authorization': `Basic ${encodeBase64Utf8(`${creds.serverKey}:`)}`
        },
        body: JSON.stringify(snapBody)
      });
      const text = await midtransRes.text();
      midtransJson = text ? JSON.parse(text) : {};
    } catch (err) {
      return jsonResult(502, {
        ok: false,
        code: 'MIDTRANS_NETWORK_ERROR',
        message: `Gagal menghubungi Midtrans Snap API (${config.midtransApiUrl}): ${err.message}`
      }, corsHeaders);
    }

    if (!midtransRes.ok || !midtransJson.token) {
      const rawErrorDetails = Array.isArray(midtransJson.error_messages)
        ? midtransJson.error_messages.join('; ')
        : (midtransJson.status_message || midtransJson.message || midtransJson.error || `HTTP ${midtransRes.status}`);
      const errorDetails = midtransRes.status === 401
        ? `${rawErrorDetails} (Pastikan MIDTRANS_SERVER_KEY valid dan sesuai mode ${config.mode.toUpperCase()} di env/Cloudflare Secrets)`
        : rawErrorDetails;
      return jsonResult(midtransRes.status >= 400 ? midtransRes.status : 502, {
        ok: false,
        code: 'MIDTRANS_SNAP_ERROR',
        message: `Midtrans menolak pembuatan transaksi: ${errorDetails}`,
        details: midtransJson
      }, corsHeaders);
    }

    const createdAtMs = Date.now();
    const expiresAtMs = createdAtMs + DEFAULT_SNAP_EXPIRY_MS;
    const expiresAtIso = new Date(expiresAtMs).toISOString();
    const draftContext = {
      orderId,
      snapToken: midtransJson.token,
      snapUrl: config.midtransSnapUrl,
      studentId: isUuid(student.id) ? student.id : null,
      nis: student.nis || '',
      studentName: student.name,
      kelas: student.kelas || '-',
      month: billMonthLabel,
      amount: grossAmount,
      method: initialMethodLabel,
      channelCode: normalizedChannelCode || '',
      kuitansiNo,
      isArrearsPayment,
      expiryTime: expiresAtIso,
      expiresAt: expiresAtIso,
      expiresAtMs,
      createdAtMs,
      academicYear: dbSettings?.academic_year || null,
      periodName: dbSettings?.active_period_name || null
    };
    saveDraftOrderContext(lockKey, draftContext);

    return jsonResult(200, {
      ok: true,
      preInserted: false,
      mode: config.mode,
      orderId,
      snapToken: midtransJson.token,
      redirectUrl: midtransJson.redirect_url || '',
      studentId: draftContext.studentId,
      studentName: draftContext.studentName,
      kelas: draftContext.kelas,
      amount: grossAmount,
      kuitansiNo,
      month: billMonthLabel,
      method: initialMethodLabel,
      channelCode: normalizedChannelCode || null,
      enabledPayments: enabledPayments || null,
      expiryTime: expiresAtIso,
      expiresAtMs,
      createdAtMs,
      snapUrl: config.midtransSnapUrl,
      transaction: null
    }, corsHeaders);
  });
}

async function checkCoreTransactionStatus(config, orderId, corsHeaders, fetchFn = globalThis.fetch, opts = {}) {
  if (!orderId) {
    return jsonResult(400, {
      ok: false,
      code: 'MISSING_ORDER_ID',
      message: 'Parameter order_id wajib disertakan.'
    }, corsHeaders);
  }

  const dbSettings = await loadSettingsMetadata(config, fetchFn).catch(() => null);
  const creds = await resolveActiveMidtransCredentials(config, dbSettings);

  if (!creds.serverKeyConfigured) {
    return jsonResult(503, {
      ok: false,
      code: 'MIDTRANS_NOT_CONFIGURED',
      message: 'MIDTRANS_SERVER_KEY belum dikonfigurasi.'
    }, corsHeaders);
  }

  const existingRow = await findTransactionByOrderId(config, orderId, fetchFn).catch(() => null);
  const draftCtx = getDraftOrderContext(orderId);
  const optSnapToken = opts && opts.snapToken ? String(opts.snapToken).trim() : '';
  const mergedContext = draftCtx
    ? { ...draftCtx, ...(optSnapToken && !draftCtx.snapToken ? { snapToken: optSnapToken } : {}) }
    : (optSnapToken ? { orderId, snapToken: optSnapToken } : null);

  let midRes;
  let midJson = {};
  try {
    const raw = await fetchCoreOrderStatusRaw(config, creds.serverKey, orderId, fetchFn);
    midRes = raw.midRes;
    midJson = raw.midJson;
  } catch (err) {
    return jsonResult(502, {
      ok: false,
      code: 'MIDTRANS_CORE_NETWORK_ERROR',
      message: `Gagal memeriksa status ke Midtrans Core API: ${err.message}`
    }, corsHeaders);
  }

  if (!midRes.ok && String(midJson.status_code) !== '404') {
    return jsonResult(midRes.status >= 400 ? midRes.status : 502, {
      ok: false,
      code: 'MIDTRANS_STATUS_ERROR',
      message: midJson.status_message || `HTTP ${midRes.status}`,
      details: midJson
    }, corsHeaders);
  }

  if (String(midJson.status_code) === '404') {
    const localExpiryMs = computeTransactionExpiryMs(existingRow);
    const localExpIso = existingRow?.expires_at || (localExpiryMs > 0 ? new Date(localExpiryMs).toISOString() : '');

    if (existingRow && isSettledStatus(existingRow.status)) {
      cleanupDraftOrder(orderId);
      return jsonResult(200, {
        ok: true,
        mode: config.mode,
        orderId,
        transactionStatus: 'settlement',
        fraudStatus: 'accept',
        status: existingRow.status,
        method: existingRow.method || 'Midtrans Snap Online',
        grossAmount: Number(existingRow.amount || 0),
        paymentType: existingRow.payment_type || '',
        snapToken: existingRow.snap_token || mergedContext?.snapToken || '',
        expiryTime: localExpIso,
        expiresAtMs: localExpiryMs,
        paymentDetermined: true,
        paymentDetails: null,
        synced: true,
        clearedArrears: false,
        transaction: existingRow
      }, corsHeaders);
    }

    if (existingRow && isPendingStatus(existingRow.status) && ((localExpiryMs > 0 && Date.now() >= localExpiryMs) || String(existingRow.payment_type || '').trim().toLowerCase() === 'pending')) {
      cleanupDraftOrder(orderId);
      const patchRes = await patchTransactionSafe(
        config,
        existingRow.id,
        { status: 'Kadaluarsa', payment_time: new Date().toISOString() },
        fetchFn
      ).catch(() => null);
      const updatedRow = (patchRes && patchRes.ok && Array.isArray(patchRes.data) && patchRes.data[0])
        ? patchRes.data[0]
        : { ...existingRow, status: 'Kadaluarsa' };

      return jsonResult(200, {
        ok: true,
        found: false,
        mode: config.mode,
        orderId,
        transactionStatus: 'expire',
        fraudStatus: '',
        status: 'Kadaluarsa',
        method: updatedRow.method || 'Midtrans Snap Online',
        grossAmount: Number(updatedRow.amount || 0),
        paymentType: updatedRow.payment_type || '',
        snapToken: updatedRow.snap_token || mergedContext?.snapToken || '',
        expiryTime: localExpIso,
        expiresAtMs: localExpiryMs,
        expiredByTimeout: true,
        paymentDetermined: true,
        paymentDetails: null,
        synced: Boolean(patchRes && patchRes.ok),
        clearedArrears: false,
        transaction: updatedRow
      }, corsHeaders);
    }

    if (existingRow && isTerminalFailedStatus(existingRow.status)) {
      cleanupDraftOrder(orderId);
      return jsonResult(200, {
        ok: true,
        found: false,
        mode: config.mode,
        orderId,
        transactionStatus: 'expire',
        fraudStatus: '',
        status: existingRow.status,
        method: existingRow.method || 'Midtrans Snap Online',
        grossAmount: Number(existingRow.amount || 0),
        paymentType: existingRow.payment_type || '',
        snapToken: existingRow.snap_token || mergedContext?.snapToken || '',
        expiryTime: localExpIso,
        expiresAtMs: localExpiryMs,
        paymentDetermined: true,
        paymentDetails: null,
        synced: false,
        clearedArrears: false,
        transaction: existingRow
      }, corsHeaders);
    }

    return jsonResult(200, {
      ok: true,
      found: false,
      code: 'ORDER_NOT_FOUND',
      orderId,
      paymentDetermined: false,
      status: existingRow?.status || 'Uninitiated',
      method: existingRow?.method || mergedContext?.method || '',
      snapToken: existingRow?.snap_token || mergedContext?.snapToken || '',
      expiryTime: localExpIso || mergedContext?.expiryTime || '',
      expiresAtMs: localExpiryMs || mergedContext?.expiresAtMs || 0,
      transaction: existingRow || null,
      message: midJson.status_message || 'Metode pembayaran belum dipilih / transaksi belum terbentuk di Midtrans.'
    }, corsHeaders);
  }

  let mappedStatus = mapMidtransStatus(midJson.transaction_status, midJson.fraud_status);
  const resolvedExpiryMs = parseMidtransTimestampMs(midJson.expiry_time) || computeTransactionExpiryMs(existingRow) || Number(mergedContext?.expiresAtMs || 0);
  if (isPendingStatus(mappedStatus) && resolvedExpiryMs > 0 && Date.now() >= resolvedExpiryMs) {
    mappedStatus = 'Kadaluarsa';
  }
  const methodLabel = formatMidtransMethodLabel(midJson);
  const paymentDetails = formatMidtransPaymentDetails(midJson);
  const syncRes = await syncMidtransResultToSupabase(
    config,
    { ...midJson, order_id: midJson.order_id || orderId },
    mappedStatus,
    methodLabel,
    existingRow,
    fetchFn,
    mergedContext
  );

  if (isSettledStatus(mappedStatus) || isTerminalFailedStatus(mappedStatus)) {
    cleanupDraftOrder(orderId);
  }

  return jsonResult(200, {
    ok: true,
    mode: config.mode,
    orderId,
    transactionStatus: midJson.transaction_status || '',
    fraudStatus: midJson.fraud_status || '',
    status: mappedStatus,
    method: syncRes.updatedTransaction?.method || methodLabel,
    grossAmount: Number(midJson.gross_amount || existingRow?.amount || mergedContext?.amount || 0),
    paymentType: midJson.payment_type || '',
    snapToken: syncRes.updatedTransaction?.snap_token || existingRow?.snap_token || mergedContext?.snapToken || '',
    expiryTime: midJson.expiry_time || syncRes.updatedTransaction?.expires_at || (resolvedExpiryMs > 0 ? new Date(resolvedExpiryMs).toISOString() : ''),
    expiresAtMs: resolvedExpiryMs,
    paymentDetermined: true,
    paymentDetails,
    synced: syncRes.synced,
    clearedArrears: syncRes.clearedArrears,
    transaction: syncRes.updatedTransaction
  }, corsHeaders);
}

async function cancelMidtransTransaction(config, orderId, corsHeaders, fetchFn = globalThis.fetch) {
  if (!orderId) {
    return jsonResult(400, {
      ok: false,
      code: 'MISSING_ORDER_ID',
      message: 'Parameter order_id wajib disertakan.'
    }, corsHeaders);
  }

  const dbSettings = await loadSettingsMetadata(config, fetchFn).catch(() => null);
  const creds = await resolveActiveMidtransCredentials(config, dbSettings);

  if (!creds.serverKeyConfigured) {
    return jsonResult(503, {
      ok: false,
      code: 'MIDTRANS_NOT_CONFIGURED',
      message: 'MIDTRANS_SERVER_KEY belum dikonfigurasi.'
    }, corsHeaders);
  }

  const existingRow = await findTransactionByOrderId(config, orderId, fetchFn).catch(() => null);
  if (existingRow && isSettledStatus(existingRow.status)) {
    return jsonResult(409, {
      ok: false,
      code: 'ALREADY_PAID',
      message: 'Transaksi ini sudah berstatus Lunas dan tidak dapat dibatalkan.',
      transaction: existingRow
    }, corsHeaders);
  }

  const draftCtx = getDraftOrderContext(orderId);
  let cancelRes;
  let cancelJson = {};
  try {
    const targetCancelUrl = `${config.midtransCoreApiUrl}/${encodeURIComponent(orderId)}/cancel`;
    cancelRes = await fetchFn(targetCancelUrl, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': `Basic ${encodeBase64Utf8(`${creds.serverKey}:`)}`
      }
    });
    const text = await cancelRes.text();
    cancelJson = text ? JSON.parse(text) : {};
  } catch (err) {
    return jsonResult(502, {
      ok: false,
      code: 'MIDTRANS_CANCEL_NETWORK_ERROR',
      message: `Gagal menghubungi Midtrans Core API untuk membatalkan transaksi: ${err.message}`
    }, corsHeaders);
  }

  const cancelCode = String(cancelJson.status_code || '');
  const isForbiddenCancel = cancelRes.status === 403 || cancelCode === '403';
  if (!cancelRes.ok && cancelCode !== '404' && cancelCode !== '412' && !isForbiddenCancel) {
    return jsonResult(cancelRes.status >= 400 ? cancelRes.status : 502, {
      ok: false,
      code: 'MIDTRANS_CANCEL_ERROR',
      message: cancelJson.status_message || cancelJson.error || `HTTP ${cancelRes.status}`,
      details: cancelJson
    }, corsHeaders);
  }

  if (cancelCode === '412' || isForbiddenCancel) {
    try {
      const { midRes, midJson } = await fetchCoreOrderStatusRaw(config, creds.serverKey, orderId, fetchFn);
      if (midRes.ok && String(midJson.status_code) !== '404') {
        const mappedNow = mapMidtransStatus(midJson.transaction_status, midJson.fraud_status);
        if (isSettledStatus(mappedNow)) {
          const methodLabel = formatMidtransMethodLabel(midJson);
          const syncRes = await syncMidtransResultToSupabase(config, { ...midJson, order_id: orderId }, mappedNow, methodLabel, existingRow, fetchFn, draftCtx);
          cleanupDraftOrder(orderId);
          return jsonResult(409, {
            ok: false,
            code: 'ALREADY_PAID',
            message: 'Transaksi ini baru saja terkonfirmasi Lunas di Midtrans sehingga tidak dapat dibatalkan.',
            transaction: syncRes.updatedTransaction || existingRow
          }, corsHeaders);
        }
      }
    } catch (e) {}
  }

  cleanupDraftOrder(orderId);

  let updatedRow = existingRow || null;
  let synced = false;
  if (existingRow && existingRow.id && !isSettledStatus(existingRow.status)) {
    const patchRes = await patchTransactionSafe(
      config,
      existingRow.id,
      {
        status: 'Dibatalkan',
        payment_time: new Date().toISOString()
      },
      fetchFn
    ).catch(() => null);
    synced = Boolean(patchRes && patchRes.ok);
    updatedRow = (patchRes && patchRes.ok && Array.isArray(patchRes.data) && patchRes.data[0])
      ? patchRes.data[0]
      : { ...existingRow, status: 'Dibatalkan' };
  }

  return jsonResult(200, {
    ok: true,
    mode: config.mode,
    orderId,
    status: 'Dibatalkan',
    synced,
    coreCancelSkipped: isForbiddenCancel,
    transaction: updatedRow
  }, corsHeaders);
}

module.exports = {
  resolveActiveMidtransCredentials,
  createSnapTransaction,
  checkCoreTransactionStatus,
  cancelMidtransTransaction,
  getDraftOrderContext,
  cleanupDraftOrder
};

