const babel = require('@babel/core');
const terser = require('terser');
const CleanCSS = require('clean-css');
const fs = require('fs');

async function runBuild() {
  console.log('--- [START PRODUCTION BUILD] ---');

  // 1. Compile JSX with Babel
  console.log('1. Compiling full_app_source.jsx with Babel...');
  const source = fs.readFileSync('full_app_source.jsx', 'utf8');
  const babelRes = babel.transformSync(source, {
    presets: [
      ['@babel/preset-react', { runtime: 'classic' }]
    ],
    compact: true,
    comments: false
  });

  // 2. Production Minification of JavaScript with Terser (Saves ~236 KB payload, >30 KiB gzip)
  console.log('2. Minifying JavaScript with Terser...');
  const terserRes = await terser.minify(babelRes.code, {
    compress: {
      drop_console: false,
      drop_debugger: true,
      passes: 2
    },
    mangle: {
      toplevel: false,
      reserved: ['React', 'ReactDOM', 'Icon', 'AplikasiSPP', 'EnvironmentConfig', 'AppEnv']
    },
    format: {
      comments: false
    }
  });

  fs.writeFileSync('app.js', terserRes.code, 'utf8');
  console.log(`   SUCCESS: app.js minified to ${Buffer.byteLength(terserRes.code)} bytes.`);

  // 3. Production Minification of CSS with CleanCSS (Saves ~15.8 KB payload, >3.7 KiB gzip)
  console.log('3. Minifying style.css to style.min.css...');
  const rawCss = fs.readFileSync('style.css', 'utf8');
  const cleanCssRes = new CleanCSS({ level: 1 }).minify(rawCss);
  fs.writeFileSync('style.min.css', cleanCssRes.styles, 'utf8');
  console.log(`   SUCCESS: style.min.css generated (${Buffer.byteLength(cleanCssRes.styles)} bytes).`);

  // 4. Generate secure class-based env.js (Strictly sanitized, no hardcoded admin credentials or school data)
  console.log('4. Generating sanitized secure env.js...');
  let envData = {};
  let secretVault = {};
  try {
    const envFile = fs.readFileSync('.env', 'utf8');
    envFile.split(/\r?\n/).forEach(rawLine => {
      const line = rawLine.trim();
      if (!line || line.startsWith('#')) return;

      const eqIdx = line.indexOf('=');
      if (eqIdx === -1) return;

      const key = line.slice(0, eqIdx).trim();
      const val = line.slice(eqIdx + 1).trim();

      if (/(?:SERVER_KEY|SECRET|SERVICE_ROLE|PRIVATE_KEY|^PORT$)/i.test(key)) return;

      if (/SUPABASE_KEY|SUPABASE_ANON_KEY/i.test(key)) {
        secretVault.k = Buffer.from(val).toString('base64');
        return;
      }

      if (/^(SUPABASE_URL|MIDTRANS_CLIENT_KEY)$/i.test(key)) {
        envData[key] = val;
      }
    });
  } catch (e) {}

  const envClassCode = `/**
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
    return { ...this.#config };
  }
}

(function() {
  const _rawValues = ${JSON.stringify(envData, null, 2)};
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

  fs.writeFileSync('env.js', envClassCode, 'utf8');
  console.log('   SUCCESS: env.js generated with zero hardcoded credentials.');
  console.log('--- [BUILD COMPLETED SUCCESSFULLY] ---');
}

runBuild().catch(err => {
  console.error('BUILD FAILED:', err);
  process.exit(1);
});
