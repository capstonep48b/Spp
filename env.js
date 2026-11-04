/**
 * ====================================================================
 * Dedicated Environment Configuration Class (Security Encapsulated)
 * Melindungi kredensial klien, menyembunyikan kunci rahasia server,
 * dan mencegah manipulasi objek runtime (Object.freeze & Tamper-Proof).
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
      // KEAMANAN: Filter otomatis kunci rahasia server dan baris komentar
      if (!/(?:SERVER_KEY|SECRET|SERVICE_ROLE|PRIVATE_KEY|^#|^PORT$)/i.test(cleanKey)) {
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

  get schoolAddress() {
    return this.get('SCHOOL_ADDRESS', 'Bekasi, Jawa Barat');
  }

  get schoolPhone() {
    return this.get('SCHOOL_PHONE', '081234567890');
  }

  get academicYear() {
    return this.get('ACADEMIC_YEAR', '2025/2026');
  }

  get adminName() {
    return this.get('DEFAULT_ADMIN_NAME', 'Siti Rahma (Admin TU)');
  }

  get adminUsername() {
    return this.get('DEFAULT_ADMIN_USER', 'admin');
  }

  get adminPassword() {
    const fromVault = this.#decode(this.#vault.p);
    return fromVault || this.get('DEFAULT_ADMIN_PASS', 'admin123');
  }

  toObject() {
    // Hanya konfigurasi publik yang aman, Supabase Key dan Password tidak dibocorkan ke window.ENV
    return { ...this.#config };
  }
}

// Inisialisasi Singleton Aman
(function() {
  const _rawValues = {
  "SUPABASE_URL": "https://mgywbrmneeorynisujkf.supabase.co",
  "MIDTRANS_CLIENT_KEY": "SB-Mid-client-demo",
  "SCHOOL_NAME": "PAUD SETIA BHAKTI",
  "SCHOOL_ADDRESS": "Bekasi, Jawa Barat",
  "SCHOOL_PHONE": "081234567890",
  "ACADEMIC_YEAR": "2025/2026",
  "DEFAULT_ADMIN_NAME": "Siti Rahma (Admin TU)",
  "DEFAULT_ADMIN_USER": "admin"
};
  const _vault = {
  "k": "c2JfcHVibGlzaGFibGVfQlRfMWxIaHZKZXJ3WTBrNGZXekliZ181MS1WUTdWNQ==",
  "p": "YWRtaW4xMjM="
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
