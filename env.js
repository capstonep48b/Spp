/**
 * ====================================================================
 * Dedicated Environment Configuration Class (Security Encapsulated)
 * Melindungi kredensial klien, menyembunyikan kunci rahasia server,
 * dan mencegah manipulasi objek runtime (Object.freeze & Tamper-Proof).
 * Seluruh data identitas sekolah, periode, dan admin dimuat dari Supabase.
 * ====================================================================
 */
class EnvironmentConfig {
  #config = {};
  #vault = {};
  #initialized = false;

  constructor(rawConfig = {}, vault = {}) {
    if (this.#initialized) {
      throw new Error("EnvironmentConfig sudah diinisialisasi sebagai singleton.");
    }

    const sanitized = {};
    for (const [key, val] of Object.entries(rawConfig)) {
      if (!key || typeof key !== 'string') continue;
      const cleanKey = key.trim();
      // KEAMANAN: Hanya konfigurasi publik yang diizinkan
      if (/^(SUPABASE_URL|MIDTRANS_CLIENT_KEY|SCHOOL_NAME)$/i.test(cleanKey)) {
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

  get midtransClientKey() {
    return this.get('MIDTRANS_CLIENT_KEY');
  }

  get schoolName() {
    return this.get('SCHOOL_NAME', 'PAUD SETIA BHAKTI');
  }

  toObject() {
    // Hanya konfigurasi koneksi publik yang aman
    return { ...this.#config };
  }
}

// Inisialisasi Singleton Aman
(function() {
  const _rawValues = {
  "SUPABASE_URL": "https://mgywbrmneeorynisujkf.supabase.co",
  "MIDTRANS_CLIENT_KEY": "SB-Mid-client-demo"
};
  const _vault = {
  "k": "c2JfcHVibGlzaGFibGVfQlRfMWxIaHZKZXJ3WTBrNGZXekliZ181MS1WUTdWNQ=="
};
  const _envInstance = new EnvironmentConfig(_rawValues, _vault);

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

    // 2. Backward compatibility untuk window.ENV (Read-only Getter publik)
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
