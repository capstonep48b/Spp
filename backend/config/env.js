const { encodeBase64Utf8 } = require('../utils/crypto');

const PLACEHOLDER_KEY_RE = /^(?:$|your[_-]|sb-mid-(?:client|server)-demo|demo|placeholder|changeme|xxx+)/i;

function normalizeBaseUrl(value, fallback = '') {
  const raw = String(value || fallback || '').trim();
  if (!raw) return '';
  return raw.replace(/\/+$/, '');
}

function normalizeEndpointPath(value, fallback) {
  const raw = String(value || fallback || '').trim();
  if (!raw) return fallback;
  const withSlash = raw.startsWith('/') ? raw : `/${raw}`;
  return withSlash.length > 1 ? withSlash.replace(/\/+$/, '') : withSlash;
}

function parseBooleanEnv(value, fallback = false) {
  if (typeof value === 'boolean') return value;
  const normalized = String(value ?? '').trim().toLowerCase();
  if (!normalized) return fallback;
  return normalized === 'true' || normalized === '1' || normalized === 'yes';
}

function stripQuotes(val) {
  const trimmed = String(val ?? '').trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"') && trimmed.length >= 2) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'") && trimmed.length >= 2)
  ) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

function parseEnvText(content) {
  const result = {};
  if (!content || typeof content !== 'string') return result;

  content.split(/\r?\n/).forEach((rawLine) => {
    const trimmed = rawLine.trim();
    if (!trimmed || trimmed.startsWith('#')) return;

    const cleanLine = trimmed.startsWith('export ') ? trimmed.slice(7).trim() : trimmed;
    const eqIdx = cleanLine.indexOf('=');
    if (eqIdx === -1) return;

    const key = cleanLine.slice(0, eqIdx).trim();
    if (!key) return;
    const val = stripQuotes(cleanLine.slice(eqIdx + 1));
    result[key] = val;
  });

  return result;
}

function isPlaceholderKey(value) {
  const cleaned = String(value || '').trim();
  if (!cleaned) return true;
  return PLACEHOLDER_KEY_RE.test(cleaned);
}

function resolveBackendConfig(rawEnv = {}) {
  const env = rawEnv && typeof rawEnv === 'object' ? rawEnv : {};

  const isProduction = parseBooleanEnv(env.MIDTRANS_IS_PRODUCTION, false);
  const sandboxSnapUrl = String(env.MIDTRANS_SANDBOX_SNAP_URL || 'https://app.sandbox.midtrans.com/snap/snap.js').trim();
  const sandboxApiUrl = normalizeBaseUrl(env.MIDTRANS_SANDBOX_API_URL, 'https://app.sandbox.midtrans.com/snap/v1/transactions');
  const sandboxCoreApiUrl = normalizeBaseUrl(env.MIDTRANS_SANDBOX_CORE_API_URL, 'https://api.sandbox.midtrans.com/v2');

  const productionSnapUrl = String(env.MIDTRANS_PRODUCTION_SNAP_URL || 'https://app.midtrans.com/snap/snap.js').trim();
  const productionApiUrl = normalizeBaseUrl(env.MIDTRANS_PRODUCTION_API_URL, 'https://app.midtrans.com/snap/v1/transactions');
  const productionCoreApiUrl = normalizeBaseUrl(env.MIDTRANS_PRODUCTION_CORE_API_URL, 'https://api.midtrans.com/v2');

  const activeSnapUrl = String(env.MIDTRANS_SNAP_URL || '').trim() || (isProduction ? productionSnapUrl : sandboxSnapUrl);
  const activeApiUrl = normalizeBaseUrl(env.MIDTRANS_API_URL) || (isProduction ? productionApiUrl : sandboxApiUrl);
  const activeCoreApiUrl = normalizeBaseUrl(env.MIDTRANS_CORE_API_URL) || (isProduction ? productionCoreApiUrl : sandboxCoreApiUrl);

  const supabaseUrl = normalizeBaseUrl(env.SUPABASE_URL);
  const supabaseRestPath = normalizeEndpointPath(env.SUPABASE_REST_PATH, '/rest/v1');
  const supabaseRestUrl = supabaseUrl ? `${supabaseUrl}${supabaseRestPath}` : '';
  const supabasePublicKey = String(env.SUPABASE_KEY || env.SUPABASE_ANON_KEY || '').trim();
  const supabaseServerKey = String(env.SUPABASE_SERVICE_ROLE_KEY || supabasePublicKey).trim();

  const backendApiUrl = normalizeBaseUrl(env.BACKEND_API_URL);
  const endpoints = {
    health: normalizeEndpointPath(env.API_HEALTH_ENDPOINT, '/api/health'),
    config: normalizeEndpointPath(env.MIDTRANS_CONFIG_ENDPOINT, '/api/midtrans/config'),
    createTransaction: normalizeEndpointPath(env.MIDTRANS_CREATE_TX_ENDPOINT, '/api/midtrans/create-transaction'),
    status: normalizeEndpointPath(env.MIDTRANS_STATUS_ENDPOINT, '/api/midtrans/status'),
    cancel: normalizeEndpointPath(env.MIDTRANS_CANCEL_ENDPOINT, '/api/midtrans/cancel'),
    webhook: normalizeEndpointPath(env.MIDTRANS_WEBHOOK_ENDPOINT, '/api/midtrans/webhook')
  };

  const midtransClientKey = String(env.MIDTRANS_CLIENT_KEY || '').trim();
  const midtransServerKey = String(env.MIDTRANS_SERVER_KEY || '').trim();
  const midtransSignatureKey = String(env.MIDTRANS_SIGNATURE_KEY || '').trim();
  const midtransMerchantId = String(env.MIDTRANS_MERCHANT_ID || '').trim();

  const corsAllowedOrigins = String(env.CORS_ALLOWED_ORIGINS || '*')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  const appBaseUrl = normalizeBaseUrl(env.APP_BASE_URL);
  const finishRedirectUrl = String(env.MIDTRANS_FINISH_REDIRECT_URL || '').trim();

  return {
    port: Number(env.PORT) || 3000,
    isProduction,
    mode: isProduction ? 'production' : 'sandbox',
    supabaseUrl,
    supabaseRestPath,
    supabaseRestUrl,
    supabasePublicKey,
    supabaseServerKey,
    hasServiceRoleKey: Boolean(env.SUPABASE_SERVICE_ROLE_KEY && String(env.SUPABASE_SERVICE_ROLE_KEY).trim()),
    backendApiUrl,
    endpoints,
    midtransMerchantId,
    midtransClientKey,
    midtransServerKey,
    midtransSignatureKey,
    midtransSnapUrl: activeSnapUrl,
    midtransApiUrl: activeApiUrl,
    midtransCoreApiUrl: activeCoreApiUrl,
    midtransUrls: {
      sandbox: {
        snapJs: sandboxSnapUrl,
        snapApi: sandboxApiUrl,
        coreApi: sandboxCoreApiUrl
      },
      production: {
        snapJs: productionSnapUrl,
        snapApi: productionApiUrl,
        coreApi: productionCoreApiUrl
      }
    },
    corsAllowedOrigins,
    appBaseUrl,
    finishRedirectUrl
  };
}

function getPublicEnvData(config) {
  const publicConfig = {
    SUPABASE_URL: config.supabaseUrl || '',
    MIDTRANS_IS_PRODUCTION: config.isProduction ? 'true' : 'false',
    MIDTRANS_CLIENT_KEY: config.midtransClientKey || '',
    MIDTRANS_SNAP_URL: config.midtransSnapUrl || '',
    BACKEND_API_URL: config.backendApiUrl || '',
    API_HEALTH_ENDPOINT: config.endpoints.health,
    MIDTRANS_CONFIG_ENDPOINT: config.endpoints.config,
    MIDTRANS_CREATE_TX_ENDPOINT: config.endpoints.createTransaction,
    MIDTRANS_STATUS_ENDPOINT: config.endpoints.status,
    MIDTRANS_CANCEL_ENDPOINT: config.endpoints.cancel
  };

  const secretVault = {};
  if (config.supabasePublicKey) {
    secretVault.k = encodeBase64Utf8(config.supabasePublicKey);
  }

  return { publicConfig, secretVault };
}

function renderEnvJsCode(config) {
  const { publicConfig, secretVault } = getPublicEnvData(config);

  return `class EnvironmentConfig {
  #config = {};
  #vault = {};
  #initialized = false;

  constructor(rawConfig = {}, vault = {}) {
    if (this.#initialized) {
      throw new Error("EnvironmentConfig sudah diinisialisasi sebagai singleton.");
    }

    const sanitized = {};
    const allowRe = /^(SUPABASE_URL|MIDTRANS_IS_PRODUCTION|MIDTRANS_CLIENT_KEY|MIDTRANS_SNAP_URL|BACKEND_API_URL|API_HEALTH_ENDPOINT|MIDTRANS_CONFIG_ENDPOINT|MIDTRANS_CREATE_TX_ENDPOINT|MIDTRANS_STATUS_ENDPOINT|MIDTRANS_CANCEL_ENDPOINT|SCHOOL_NAME)$/i;
    for (const [key, val] of Object.entries(rawConfig)) {
      if (!key || typeof key !== 'string') continue;
      const cleanKey = key.trim();
      if (allowRe.test(cleanKey)) {
        sanitized[cleanKey] = String(val || '').trim();
      }
    }

    this.#config = Object.freeze(sanitized);
    this.#vault = Object.freeze({ ...vault });
    this.#initialized = true;
    Object.freeze(this);
  }

  #decode(token) {
    if (!token || typeof token !== 'string') return '';
    try {
      if (typeof atob === 'function') return atob(token);
      if (typeof Buffer !== 'undefined') return Buffer.from(token, 'base64').toString('utf8');
    } catch (e) {}
    return '';
  }

  get(key, defaultValue = '') {
    return Object.prototype.hasOwnProperty.call(this.#config, key) ? this.#config[key] : defaultValue;
  }

  has(key) {
    return Boolean(this.#config[key]);
  }

  get supabaseUrl() {
    return this.get('SUPABASE_URL');
  }

  get supabaseKey() {
    const fromVault = this.#decode(this.#vault.k);
    if (fromVault) return fromVault;
    if (typeof localStorage !== 'undefined') {
      return localStorage.getItem('spp_supabase_key') || localStorage.getItem('supabase_key') || '';
    }
    return '';
  }

  get midtransIsProduction() {
    return String(this.get('MIDTRANS_IS_PRODUCTION', 'false')).toLowerCase() === 'true';
  }

  get midtransClientKey() {
    return this.get('MIDTRANS_CLIENT_KEY');
  }

  get midtransSnapUrl() {
    return this.get('MIDTRANS_SNAP_URL', 'https://app.sandbox.midtrans.com/snap/snap.js');
  }

  get backendApiUrl() {
    return this.get('BACKEND_API_URL', '').replace(/\\/+$/, '');
  }

  get apiHealthEndpoint() {
    return this.get('API_HEALTH_ENDPOINT', '/api/health');
  }

  get midtransConfigEndpoint() {
    return this.get('MIDTRANS_CONFIG_ENDPOINT', '/api/midtrans/config');
  }

  get midtransCreateTxEndpoint() {
    return this.get('MIDTRANS_CREATE_TX_ENDPOINT', '/api/midtrans/create-transaction');
  }

  get midtransStatusEndpoint() {
    return this.get('MIDTRANS_STATUS_ENDPOINT', '/api/midtrans/status');
  }

  get midtransCancelEndpoint() {
    return this.get('MIDTRANS_CANCEL_ENDPOINT', '/api/midtrans/cancel');
  }

  getApiUrl(endpointPath = '') {
    const base = this.backendApiUrl;
    const cleanPath = String(endpointPath || '').startsWith('/') ? String(endpointPath || '') : ('/' + String(endpointPath || ''));
    return base ? (base + cleanPath) : cleanPath;
  }

  get schoolName() {
    return this.get('SCHOOL_NAME', 'PAUD SETIA BHAKTI');
  }

  toObject() {
    return { ...this.#config };
  }
}

(function() {
  const _rawValues = ${JSON.stringify(publicConfig, null, 2)};
  const _vault = ${JSON.stringify(secretVault, null, 2)};
  const _envInstance = new EnvironmentConfig(_rawValues, _vault);

  if (typeof window !== 'undefined') {
    Object.defineProperty(window, 'EnvironmentConfig', {
      value: EnvironmentConfig,
      writable: false,
      configurable: false,
      enumerable: false
    });

    Object.defineProperty(window, 'AppEnv', {
      value: _envInstance,
      writable: false,
      configurable: false,
      enumerable: true
    });

    Object.defineProperty(window, 'ENV', {
      get: () => _envInstance.toObject(),
      set: () => { console.warn("Peringatan Keamanan: window.ENV bersifat read-only dan terlindungi!"); },
      configurable: false,
      enumerable: true
    });
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { EnvironmentConfig, AppEnv: _envInstance };
  }
})();
`;
}

module.exports = {
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
};

