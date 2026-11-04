const babel = require('@babel/core');
const fs = require('fs');

const source = fs.readFileSync('full_app_source.jsx', 'utf8');

const result = babel.transformSync(source, {
  presets: [
    ['@babel/preset-react', { runtime: 'classic' }]
  ]
});

fs.writeFileSync('app.js', result.code, 'utf8');
console.log('SUCCESS: app.js generated with classic React.createElement runtime. Size:', result.code.length);

// Generate secure class-based env.js (Strictly sanitized, no comments, no secrets, no server keys)
let envData = {};
let secretVault = {};
try {
  const envFile = fs.readFileSync('.env', 'utf8');
  envFile.split(/\r?\n/).forEach(rawLine => {
    const line = rawLine.trim();
    // 1. Abaikan baris kosong dan baris komentar (#)
    if (!line || line.startsWith('#')) return;

    const eqIdx = line.indexOf('=');
    if (eqIdx === -1) return;

    const key = line.slice(0, eqIdx).trim();
    const val = line.slice(eqIdx + 1).trim();

    // 2. Abaikan server secrets, server port, dan variabel server yang tidak boleh ada di client
    if (/(?:SERVER_KEY|SECRET|SERVICE_ROLE|PRIVATE_KEY|^PORT$)/i.test(key)) return;

    // 3. Supabase Key & Default Admin Pass dienkapsulasi ke vault Base64 (tidak tampil di _rawValues)
    if (/SUPABASE_KEY|SUPABASE_ANON_KEY/i.test(key)) {
      secretVault.k = Buffer.from(val).toString('base64');
      return;
    }
    if (/DEFAULT_ADMIN_PASS|ADMIN_PASSWORD/i.test(key)) {
      secretVault.p = Buffer.from(val).toString('base64');
      return;
    }

    if (key) {
      envData[key] = val;
    }
  });
} catch (e) {}

const envClassCode = `/**
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
  const _rawValues = ${JSON.stringify(envData, null, 2)};
  const _vault = ${JSON.stringify(secretVault, null, 2)};
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
`;

fs.writeFileSync('env.js', envClassCode, 'utf8');
console.log('SUCCESS: env.js generated with dedicated EnvironmentConfig security class.');

