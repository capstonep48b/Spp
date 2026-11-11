const {
  PLACEHOLDER_KEY_RE,
  normalizeBaseUrl,
  normalizeEndpointPath,
  parseBooleanEnv,
  stripQuotes,
  parseEnvText,
  isPlaceholderKey,
  resolveBackendConfig,
  getPublicEnvData,
  renderEnvJsCode
} = require('./config/env');
const { handleApiRequest } = require('./routes/apiRouter');
const {
  DEFAULT_SNAP_EXPIRY_MS,
  ALL_QRIS_CHANNELS,
  QRIS_EWALLET_CHANNELS,
  BANK_VA_CHANNELS,
  mapMidtransStatus,
  formatMidtransPaymentDetails,
  formatMidtransMethodLabel,
  isSettledStatus,
  isPendingStatus,
  isTerminalFailedStatus,
  parseMidtransTimestampMs,
  computeTransactionExpiryMs,
  didBillMatch,
  normalizeChannelKey,
  resolveEnabledPaymentsForChannel,
  getInitialMethodLabelForChannel
} = require('./utils/midtrans');
const {
  encodeBase64Utf8,
  sha512Hex,
  safeTimingEqual
} = require('./utils/crypto');

module.exports = {
  DEFAULT_SNAP_EXPIRY_MS,
  ALL_QRIS_CHANNELS,
  QRIS_EWALLET_CHANNELS,
  BANK_VA_CHANNELS,
  PLACEHOLDER_KEY_RE,
  normalizeBaseUrl,
  normalizeEndpointPath,
  parseBooleanEnv,
  stripQuotes,
  parseEnvText,
  isPlaceholderKey,
  resolveBackendConfig,
  getPublicEnvData,
  renderEnvJsCode,
  handleApiRequest,
  mapMidtransStatus,
  formatMidtransPaymentDetails,
  formatMidtransMethodLabel,
  encodeBase64Utf8,
  sha512Hex,
  safeTimingEqual,
  isSettledStatus,
  isPendingStatus,
  isTerminalFailedStatus,
  parseMidtransTimestampMs,
  computeTransactionExpiryMs,
  didBillMatch,
  normalizeChannelKey,
  resolveEnabledPaymentsForChannel,
  getInitialMethodLabelForChannel
};
