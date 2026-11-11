const DEFAULT_SNAP_EXPIRY_MS = 5 * 60 * 1000;
const ALL_QRIS_CHANNELS = ['other_qris'];
const QRIS_EWALLET_CHANNELS = ['other_qris', 'gopay', 'shopeepay', 'dana', 'ovo'];
const BANK_VA_CHANNELS = ['bca_va', 'echannel', 'bni_va', 'bri_va', 'permata_va', 'cimb_va', 'other_va', 'bank_transfer'];

const CHANNEL_TO_ENABLED_PAYMENTS = {
  bca_va: ['bca_va'],
  bni_va: ['bni_va'],
  bri_va: ['bri_va'],
  mandiri_va: ['echannel'],
  echannel: ['echannel'],
  permata_va: ['permata_va'],
  cimb_va: ['cimb_va'],
  bsi_va: ['bsi_va'],
  danamon_va: ['danamon_va'],
  other_va: ['other_va'],
  qris_all: ['other_qris'],
  scan_qr: ['other_qris'],
  scan_qris: ['other_qris'],
  qris: ['other_qris'],
  other_qris: ['other_qris'],
  shopeepay: ['shopeepay'],
  shopeepay_qris: ['shopeepay'],
  gopay: ['gopay'],
  dana: ['dana'],
  ovo: ['ovo'],
  indomaret: ['indomaret'],
  alfamart: ['alfamart'],
  credit_card: ['credit_card']
};

const CHANNEL_METHOD_LABELS = {
  bca_va: 'VA BCA (Midtrans)',
  bni_va: 'VA BNI (Midtrans)',
  bri_va: 'VA BRI (Midtrans)',
  mandiri_va: 'Mandiri VA (Midtrans)',
  echannel: 'Mandiri VA (Midtrans)',
  permata_va: 'VA Permata (Midtrans)',
  cimb_va: 'VA CIMB Niaga (Midtrans)',
  bsi_va: 'VA BSI (Midtrans)',
  danamon_va: 'VA Danamon (Midtrans)',
  other_va: 'VA Bank Lainnya (Midtrans)',
  qris_all: 'Scan QRIS (Midtrans)',
  scan_qr: 'Scan QRIS (Midtrans)',
  scan_qris: 'Scan QRIS (Midtrans)',
  qris: 'Scan QRIS (Midtrans)',
  other_qris: 'QRIS (Midtrans)',
  shopeepay: 'ShopeePay QRIS (Midtrans)',
  shopeepay_qris: 'ShopeePay QRIS (Midtrans)',
  gopay: 'GoPay QRIS (Midtrans)',
  dana: 'DANA (Midtrans)',
  ovo: 'OVO (Midtrans)',
  indomaret: 'Indomaret (Midtrans)',
  alfamart: 'Alfamart (Midtrans)',
  credit_card: 'Kartu Kredit / Debit (Midtrans)'
};

function formatDateIndoServer(dateInput = new Date()) {
  const d = dateInput instanceof Date ? dateInput : new Date(dateInput);
  if (Number.isNaN(d.getTime())) {
    const now = new Date();
    return `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;
  }
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

function isUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value || '').trim());
}

function sanitizePhone(phone) {
  const digits = String(phone || '').replace(/[^\d+]/g, '');
  return digits.length >= 8 ? digits.slice(0, 20) : '';
}

function parseMidtransTimestampMs(val) {
  if (val === null || val === undefined || val === '') return 0;
  if (typeof val === 'number') return Number.isFinite(val) ? val : 0;
  if (val instanceof Date) {
    const t = val.getTime();
    return Number.isNaN(t) ? 0 : t;
  }
  const raw = String(val).trim();
  if (!raw) return 0;
  const wibMatch = raw.match(/^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2}:\d{2})(?:\.\d+)?$/);
  if (wibMatch) {
    const ms = Date.parse(`${wibMatch[1]}T${wibMatch[2]}+07:00`);
    return Number.isNaN(ms) ? 0 : ms;
  }
  const ms = Date.parse(raw);
  return Number.isNaN(ms) ? 0 : ms;
}

function toIsoTimestampOrNull(val) {
  const ms = parseMidtransTimestampMs(val);
  if (!ms || ms <= 0) return null;
  try {
    return new Date(ms).toISOString();
  } catch (e) {
    return null;
  }
}

function computeTransactionExpiryMs(trx) {
  if (!trx || typeof trx !== 'object') return 0;
  const explicitMs = parseMidtransTimestampMs(trx.expires_at || trx.expiry_time || trx.expiresAt);
  const createdMs = parseMidtransTimestampMs(trx.created_at || trx.createdAtMs);
  const paymentTypeLower = String(trx.payment_type || '').trim().toLowerCase();
  if (paymentTypeLower === 'pending' && createdMs > 0) {
    const fiveMinCapMs = createdMs + DEFAULT_SNAP_EXPIRY_MS;
    return explicitMs > 0 ? Math.min(explicitMs, fiveMinCapMs) : fiveMinCapMs;
  }
  if (explicitMs > 0) return explicitMs;
  if (createdMs > 0) return createdMs + DEFAULT_SNAP_EXPIRY_MS;
  return 0;
}

function generateOrderId(nisOrId) {
  const safeToken = String(nisOrId || 'SISWA')
    .replace(/[^a-zA-Z0-9_-]/g, '')
    .slice(0, 14) || 'SISWA';
  const ts = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `SPP-${safeToken}-${ts}-${rand}`.slice(0, 50);
}

function generateKuitansiNo() {
  const now = new Date();
  const ym = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
  const seq = Math.floor(1000 + Math.random() * 9000);
  return `K-${ym}-${seq}`;
}

function mapMidtransStatus(transactionStatus, fraudStatus) {
  const tx = String(transactionStatus || '').trim().toLowerCase();
  const fraud = String(fraudStatus || '').trim().toLowerCase();

  if (tx === 'settlement') return 'Lunas';
  if (tx === 'capture') {
    if (fraud === 'challenge') return 'Menunggu Verifikasi';
    if (fraud === 'deny') return 'Dibatalkan';
    return 'Lunas';
  }
  if (tx === 'pending' || tx === 'authorize') return 'Pending';
  if (tx === 'expire') return 'Kadaluarsa';
  if (tx === 'cancel' || tx === 'deny' || tx === 'failure') return 'Dibatalkan';
  if (tx === 'refund' || tx === 'partial_refund' || tx === 'chargeback') return 'Refund';
  return 'Pending';
}

function isSettledStatus(statusText) {
  const s = String(statusText || '').trim().toLowerCase();
  return s === 'lunas' || s === 'berhasil' || s === 'sukses';
}

function isPendingStatus(statusText) {
  const s = String(statusText || '').trim().toLowerCase();
  return s === 'pending' || s === 'menunggu' || s === 'menunggu verifikasi';
}

function isTerminalFailedStatus(statusText) {
  const s = String(statusText || '').trim().toLowerCase();
  return s === 'kadaluarsa' || s === 'expired' || s === 'dibatalkan' || s === 'cancel' || s === 'deny' || s === 'failure' || s === 'refund';
}

function didBillMatch(trxMonth, targetMonth, isArrearsPayment = false) {
  const tm = String(trxMonth || '').trim().toLowerCase();
  const targetLower = String(targetMonth || '').trim().toLowerCase();
  if (!tm || !targetLower) return false;
  if (isArrearsPayment) {
    return tm === targetLower || (tm.startsWith('tunggakan') && targetLower.startsWith('tunggakan'));
  }
  return tm === targetLower || (!tm.startsWith('tunggakan') && targetLower.startsWith(tm));
}

function normalizeChannelKey(preferredChannel) {
  const raw = String(preferredChannel || '').trim().toLowerCase();
  if (!raw) return '';
  if (Object.prototype.hasOwnProperty.call(CHANNEL_TO_ENABLED_PAYMENTS, raw)) return raw;
  if (/(tunai|cash|kantor\s*tu|manual)/i.test(raw)) return 'cash_tu';
  if (/\bother[_\s]*qris\b/i.test(raw)) return 'other_qris';
  if (/(qris_all|scan[_\s]*qris?|semua[_\s]*(qr|qris)|all[_\s]*(qr|qris))/i.test(raw)) return 'qris_all';
  if (/^va\s*bca|\bbca(\s*va|_va|\s*virtual)?\b/i.test(raw) && !/bni|bri|mandiri/i.test(raw)) return 'bca_va';
  if (/^va\s*bni|\bbni(\s*va|_va|\s*virtual)?\b/i.test(raw) && !/bca|bri|mandiri/i.test(raw)) return 'bni_va';
  if (/^va\s*bri|\bbri(\s*va|_va|\s*virtual)?\b/i.test(raw) && !/bca|bni|mandiri/i.test(raw)) return 'bri_va';
  if (/\bmandiri|echannel\b/i.test(raw) && !/bca|bni|bri/i.test(raw)) return 'echannel';
  if (/\bpermata\b/i.test(raw)) return 'permata_va';
  if (/\bcimb\b/i.test(raw)) return 'cimb_va';
  if (/\bbsi\b/i.test(raw)) return 'bsi_va';
  if (/\bdanamon\b/i.test(raw)) return 'danamon_va';
  if (/\bbank\s*lain|other[_\s]*va|atm\s*bersama\b/i.test(raw)) return 'other_va';
  if (/\bshopeepay\b/i.test(raw)) return 'shopeepay';
  if (/\bdana\b/i.test(raw) && !/gopay|ovo|qris/i.test(raw)) return 'dana';
  if (/\bovo\b/i.test(raw) && !/gopay|dana|qris/i.test(raw)) return 'ovo';
  if (/\bgopay\b/i.test(raw) && !/ovo|dana|qris/i.test(raw)) return 'gopay';
  if (/\bqris\b/i.test(raw) && !/ovo|dana/i.test(raw)) return 'qris_all';
  if (/\bindomaret\b/i.test(raw)) return 'indomaret';
  if (/\balfamart\b/i.test(raw)) return 'alfamart';
  return raw;
}

function resolveEnabledPaymentsForChannel(preferredChannel) {
  const normalized = normalizeChannelKey(preferredChannel);
  if (!normalized || normalized === 'cash_tu') return null;
  if (Object.prototype.hasOwnProperty.call(CHANNEL_TO_ENABLED_PAYMENTS, normalized)) {
    return [...CHANNEL_TO_ENABLED_PAYMENTS[normalized]];
  }
  if (/(qris|gopay|ovo|dana|shopeepay|ewallet|e-wallet|wallet)/i.test(normalized)) {
    return [...QRIS_EWALLET_CHANNELS];
  }
  if (/(transfer|bank|va|virtual\s*account)/i.test(normalized)) {
    return [...BANK_VA_CHANNELS];
  }
  return null;
}

function getInitialMethodLabelForChannel(preferredChannel) {
  const normalized = normalizeChannelKey(preferredChannel);
  if (normalized && Object.prototype.hasOwnProperty.call(CHANNEL_METHOD_LABELS, normalized)) {
    return CHANNEL_METHOD_LABELS[normalized];
  }
  if (/(qris|gopay|ovo|dana|shopeepay|ewallet|e-wallet|wallet)/i.test(normalized)) {
    return 'QRIS & e-Wallet (Midtrans)';
  }
  if (/(transfer|bank|va|virtual\s*account)/i.test(normalized)) {
    return 'Virtual Account Bank (Midtrans)';
  }
  return 'Midtrans Snap Online';
}

function formatMidtransPaymentDetails(payload = {}) {
  const vaFirst = Array.isArray(payload.va_numbers) && payload.va_numbers.length > 0 ? payload.va_numbers[0] : null;
  const vaBank = vaFirst?.bank ? String(vaFirst.bank).toUpperCase() : (payload.permata_va_number ? 'PERMATA' : '');
  const vaNumber = vaFirst?.va_number ? String(vaFirst.va_number) : (payload.permata_va_number ? String(payload.permata_va_number) : '');
  return {
    paymentType: String(payload.payment_type || '').trim(),
    vaBank,
    vaNumber,
    billerCode: payload.biller_code ? String(payload.biller_code) : '',
    billKey: payload.bill_key ? String(payload.bill_key) : '',
    paymentCode: payload.payment_code ? String(payload.payment_code) : '',
    acquirer: payload.acquirer ? String(payload.acquirer).toUpperCase() : ''
  };
}

function formatMidtransMethodLabel(payload = {}) {
  const type = String(payload.payment_type || '').trim().toLowerCase();
  if (!type) return 'Midtrans Snap Online';

  if (type === 'qris') {
    const acquirer = payload.acquirer ? String(payload.acquirer).toUpperCase() : '';
    return acquirer ? `QRIS (${acquirer} - Midtrans)` : 'QRIS (Midtrans)';
  }
  if (type === 'gopay') return 'GoPay (Midtrans)';
  if (type === 'shopeepay' || type === 'shopeepay_qris') return 'QRIS / ShopeePay (Midtrans)';
  if (type === 'dana') return 'DANA (Midtrans)';
  if (type === 'ovo') return 'OVO (Midtrans)';
  if (type === 'bank_transfer') {
    if (Array.isArray(payload.va_numbers) && payload.va_numbers[0]?.bank) {
      return `VA ${String(payload.va_numbers[0].bank).toUpperCase()} (Midtrans)`;
    }
    if (payload.permata_va_number) return 'VA PERMATA (Midtrans)';
    return 'Virtual Account Bank (Midtrans)';
  }
  if (type === 'echannel') return 'Mandiri VA (Midtrans)';
  if (type === 'bca_klikpay') return 'BCA KlikPay (Midtrans)';
  if (type === 'cstore') {
    const store = payload.store ? String(payload.store).toUpperCase() : 'Minimarket';
    return `${store} (Midtrans)`;
  }
  if (type === 'credit_card') return 'Kartu Kredit / Debit (Midtrans)';
  if (type === 'akulaku') return 'Akulaku PayLater (Midtrans)';
  if (type === 'kredivo') return 'Kredivo (Midtrans)';

  return `${type.replace(/_/g, ' ').toUpperCase()} (Midtrans)`;
}

function buildCorsHeaders(requestHeaders, requestUrl, config) {
  const origin = requestHeaders?.get ? (requestHeaders.get('origin') || '') : (requestHeaders?.origin || '');
  const allowed = config.corsAllowedOrigins || ['*'];
  const selfOrigin = requestUrl ? new URL(requestUrl).origin : '';

  let allowOrigin = '';
  if (allowed.includes('*')) {
    allowOrigin = origin || '*';
  } else if (origin && (allowed.includes(origin) || origin === selfOrigin)) {
    allowOrigin = origin;
  } else if (allowed.length > 0) {
    allowOrigin = allowed[0];
  }

  return {
    'Access-Control-Allow-Origin': allowOrigin || '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
    'Access-Control-Max-Age': '86400',
    'Vary': 'Origin'
  };
}

function jsonResult(status, body, extraHeaders = {}) {
  return {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
      'X-Content-Type-Options': 'nosniff',
      ...extraHeaders
    },
    body: JSON.stringify(body)
  };
}

module.exports = {
  DEFAULT_SNAP_EXPIRY_MS,
  ALL_QRIS_CHANNELS,
  QRIS_EWALLET_CHANNELS,
  BANK_VA_CHANNELS,
  formatDateIndoServer,
  isUuid,
  sanitizePhone,
  parseMidtransTimestampMs,
  toIsoTimestampOrNull,
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
  buildCorsHeaders,
  jsonResult
};

