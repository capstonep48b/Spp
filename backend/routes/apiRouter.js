const { resolveBackendConfig, isPlaceholderKey } = require('../config/env');
const { sha512Hex, safeTimingEqual } = require('../utils/crypto');
const {
  mapMidtransStatus,
  isPendingStatus,
  isSettledStatus,
  isTerminalFailedStatus,
  parseMidtransTimestampMs,
  formatMidtransMethodLabel,
  buildCorsHeaders,
  jsonResult
} = require('../utils/midtrans');
const {
  loadSettingsMetadata,
  syncMidtransResultToSupabase
} = require('../services/supabaseService');
const {
  resolveActiveMidtransCredentials,
  createSnapTransaction,
  checkCoreTransactionStatus,
  cancelMidtransTransaction,
  getDraftOrderContext,
  cleanupDraftOrder
} = require('../services/midtransService');

async function handleApiRequest(reqLike, rawEnv = {}, fetchFn = globalThis.fetch) {
  const config = resolveBackendConfig(rawEnv);
  const requestUrl = reqLike.url || `http://localhost:${config.port}/`;
  const parsedUrl = new URL(requestUrl, `http://localhost:${config.port}`);
  const pathname = parsedUrl.pathname.length > 1 ? parsedUrl.pathname.replace(/\/+$/, '') : parsedUrl.pathname;
  const method = String(reqLike.method || 'GET').toUpperCase();
  const corsHeaders = buildCorsHeaders(reqLike.headers, parsedUrl.toString(), config);

  if (method === 'OPTIONS') {
    return { status: 204, headers: corsHeaders, body: '' };
  }

  if (method === 'GET' && pathname === config.endpoints.health) {
    const dbSettings = await loadSettingsMetadata(config, fetchFn).catch(() => null);
    const creds = await resolveActiveMidtransCredentials(config, dbSettings);

    return jsonResult(200, {
      ok: true,
      service: 'aplikasi-spp-midtrans-backend',
      mode: config.mode,
      isProduction: config.isProduction,
      midtransConfigured: creds.ready,
      isDemoPlaceholder: creds.isDemoPlaceholder,
      supabaseConfigured: Boolean(config.supabaseRestUrl && config.supabaseServerKey),
      endpoints: config.endpoints
    }, corsHeaders);
  }

  if (method === 'GET' && pathname === config.endpoints.config) {
    const dbSettings = await loadSettingsMetadata(config, fetchFn).catch(() => null);
    const creds = await resolveActiveMidtransCredentials(config, dbSettings);

    return jsonResult(200, {
      ok: true,
      mode: config.mode,
      isProduction: config.isProduction,
      snapUrl: config.midtransSnapUrl,
      clientKey: creds.clientKey,
      clientKeyConfigured: creds.clientKeyConfigured,
      serverKeyConfigured: creds.serverKeyConfigured,
      serverKeyFormat: creds.serverKeyFormat,
      ready: creds.ready,
      isDemoPlaceholder: creds.isDemoPlaceholder,
      credentialSource: creds.source,
      endpoints: {
        createTransaction: config.endpoints.createTransaction,
        status: config.endpoints.status,
        cancel: config.endpoints.cancel
      }
    }, corsHeaders);
  }

  if (method === 'POST' && pathname === config.endpoints.createTransaction) {
    let payload = {};
    try {
      const rawText = typeof reqLike.text === 'function' ? await reqLike.text() : (reqLike.body || '');
      payload = rawText ? JSON.parse(rawText) : {};
    } catch (e) {
      return jsonResult(400, {
        ok: false,
        code: 'INVALID_JSON',
        message: 'Body request harus berupa JSON yang valid.'
      }, corsHeaders);
    }

    return createSnapTransaction(config, payload, corsHeaders, fetchFn);
  }

  if (method === 'POST' && pathname === config.endpoints.webhook) {
    let notif = {};
    try {
      const rawText = typeof reqLike.text === 'function' ? await reqLike.text() : (reqLike.body || '');
      notif = rawText ? JSON.parse(rawText) : {};
    } catch (e) {
      return jsonResult(400, { ok: false, message: 'Invalid JSON webhook payload' }, corsHeaders);
    }

    const orderId = String(notif.order_id || '').trim();
    const statusCode = String(notif.status_code || '').trim();
    const grossAmount = String(notif.gross_amount || '').trim();
    const signatureKey = String(notif.signature_key || '').trim();

    if (!orderId || !statusCode || !grossAmount || !signatureKey) {
      return jsonResult(400, { ok: false, message: 'Missing required Midtrans notification fields' }, corsHeaders);
    }

    const dbSettings = await loadSettingsMetadata(config, fetchFn).catch(() => null);
    const creds = await resolveActiveMidtransCredentials(config, dbSettings);
    const hasSignatureSecret = !isPlaceholderKey(config.midtransSignatureKey);

    if (!creds.serverKeyConfigured && !hasSignatureSecret) {
      return jsonResult(503, { ok: false, message: 'MIDTRANS_SERVER_KEY belum dikonfigurasi' }, corsHeaders);
    }

    const sigPayloadPrefix = `${orderId}${statusCode}${grossAmount}`;
    let sigValid = false;
    if (creds.serverKeyConfigured) {
      const expectedServerSig = await sha512Hex(`${sigPayloadPrefix}${creds.serverKey}`);
      if (safeTimingEqual(signatureKey, expectedServerSig)) {
        sigValid = true;
      }
    }
    if (!sigValid && hasSignatureSecret) {
      const expectedSecretSig = await sha512Hex(`${sigPayloadPrefix}${config.midtransSignatureKey}`);
      if (safeTimingEqual(signatureKey, expectedSecretSig)) {
        sigValid = true;
      }
    }
    if (!sigValid) {
      return jsonResult(403, { ok: false, message: 'Invalid Midtrans signature_key' }, corsHeaders);
    }

    let mappedStatus = mapMidtransStatus(notif.transaction_status, notif.fraud_status);
    const notifExpiryMs = parseMidtransTimestampMs(notif.expiry_time);
    if (isPendingStatus(mappedStatus) && notifExpiryMs > 0 && Date.now() >= notifExpiryMs) {
      mappedStatus = 'Kadaluarsa';
    }
    const methodLabel = formatMidtransMethodLabel(notif);
    const draftCtx = getDraftOrderContext(orderId);
    const syncRes = await syncMidtransResultToSupabase(config, notif, mappedStatus, methodLabel, null, fetchFn, draftCtx);
    if (isSettledStatus(mappedStatus) || isTerminalFailedStatus(mappedStatus)) {
      cleanupDraftOrder(orderId);
    }

    return jsonResult(200, {
      ok: true,
      orderId,
      status: mappedStatus,
      method: methodLabel,
      synced: syncRes.synced,
      clearedArrears: syncRes.clearedArrears
    }, corsHeaders);
  }

  const cancelBase = config.endpoints.cancel;
  if (method === 'POST' && (pathname === cancelBase || pathname.startsWith(`${cancelBase}/`))) {
    let payload = {};
    try {
      const rawText = typeof reqLike.text === 'function' ? await reqLike.text() : (reqLike.body || '');
      payload = rawText ? JSON.parse(rawText) : {};
    } catch (e) {
      return jsonResult(400, {
        ok: false,
        code: 'INVALID_JSON',
        message: 'Body request harus berupa JSON yang valid.'
      }, corsHeaders);
    }
    const pathOrderId = pathname.length > cancelBase.length
      ? decodeURIComponent(pathname.slice(cancelBase.length + 1))
      : '';
    const orderId = String(payload.orderId || payload.order_id || parsedUrl.searchParams.get('order_id') || pathOrderId || '').trim();
    return cancelMidtransTransaction(config, orderId, corsHeaders, fetchFn);
  }

  const statusBase = config.endpoints.status;
  if (method === 'GET' && (pathname === statusBase || pathname.startsWith(`${statusBase}/`))) {
    const pathOrderId = pathname.length > statusBase.length
      ? decodeURIComponent(pathname.slice(statusBase.length + 1))
      : '';
    const orderId = String(parsedUrl.searchParams.get('order_id') || pathOrderId || '').trim();
    const snapTokenHint = String(parsedUrl.searchParams.get('snap_token') || '').trim();

    return checkCoreTransactionStatus(config, orderId, corsHeaders, fetchFn, { snapToken: snapTokenHint });
  }

  return null;
}

module.exports = {
  handleApiRequest
};

