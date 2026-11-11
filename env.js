class EnvironmentConfig {
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
    return this.get('BACKEND_API_URL', '').replace(/\/+$/, '');
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
  const _rawValues = {
  "SUPABASE_URL": "https://mgywbrmneeorynisujkf.supabase.co",
  "MIDTRANS_IS_PRODUCTION": "false",
  "MIDTRANS_CLIENT_KEY": "Mid-client-MdhYv4NdjfvG20k6",
  "MIDTRANS_SNAP_URL": "https://app.sandbox.midtrans.com/snap/snap.js",
  "BACKEND_API_URL": "",
  "API_HEALTH_ENDPOINT": "/api/health",
  "MIDTRANS_CONFIG_ENDPOINT": "/api/midtrans/config",
  "MIDTRANS_CREATE_TX_ENDPOINT": "/api/midtrans/create-transaction",
  "MIDTRANS_STATUS_ENDPOINT": "/api/midtrans/status",
  "MIDTRANS_CANCEL_ENDPOINT": "/api/midtrans/cancel"
};
  const _vault = {
  "k": "c2JfcHVibGlzaGFibGVfQlRfMWxIaHZKZXJ3WTBrNGZXekliZ181MS1WUTdWNQ=="
};
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
