/**
 * ====================================================================
 * Dedicated Environment Configuration Class (Security Encapsulated)
 * Melindungi kredensial klien, menyembunyikan kunci rahasia server,
 * dan mencegah manipulasi objek runtime (Object.freeze & Tamper-Proof).
 * ====================================================================
 */
class EnvironmentConfig {
  #config = {};
  #initialized = false;

  constructor(rawConfig = {}) {
    if (this.#initialized) {
      throw new Error("EnvironmentConfig sudah diinisialisasi sebagai singleton.");
    }

    const sanitized = {};
    for (const [key, val] of Object.entries(rawConfig)) {
      if (!key || typeof key !== 'string') continue;
      const cleanKey = key.trim();
      // KEAMANAN: Filter otomatis kunci rahasia server (server key, secret, private key, password)
      // Kunci server seperti MIDTRANS_SERVER_KEY tidak boleh terekspos di browser client!
      const isSensitiveServerKey = /(?:SERVER_KEY|SECRET|SERVICE_ROLE|PRIVATE_KEY|PASSWORD)/i.test(cleanKey);
      if (!isSensitiveServerKey) {
        sanitized[cleanKey] = String(val || '').trim();
      }
    }

    this.#config = Object.freeze(sanitized);
    this.#initialized = true;
    Object.freeze(this);
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
    return this.get('SUPABASE_KEY') || this.get('SUPABASE_ANON_KEY');
  }

  get midtransClientKey() {
    return this.get('MIDTRANS_CLIENT_KEY');
  }

  toObject() {
    return { ...this.#config };
  }
}

// Inisialisasi Singleton Aman
(function() {
  const _rawValues = {
  "MIDTRANS_CLIENT_KEY": "SB-Mid-client-demo",
  "MIDTRANS_SERVER_KEY": "SB-Mid-server-demo",
  "SUPABASE_URL": "https://mgywbrmneeorynisujkf.supabase.co",
  "SUPABASE_KEY": "sb_publishable_BT_1lHhvJerwY0k4fWzIbg_51-VQ7V5"
};
  const _envInstance = new EnvironmentConfig(_rawValues);

  if (typeof window !== 'undefined') {
    // 1. Ekspor kelas dan instance resmi
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

    // 2. Backward compatibility untuk window.ENV (Read-only Getter)
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
