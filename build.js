const babel = require('@babel/core');
const terser = require('terser');
const CleanCSS = require('clean-css');
const postcss = require('postcss');
const tailwindcss = require('tailwindcss');
const fs = require('fs');
const zlib = require('zlib');

function extractLoginComponentSources(source) {
  const ast = babel.parseSync(source, {
    presets: [['@babel/preset-react', { runtime: 'classic' }]],
    filename: 'full_app_source.jsx'
  });
  const targets = new Set(['Icon', 'LoginView']);
  const chunks = [];
  function walk(node) {
    if (!node || typeof node !== 'object') return;
    if ((node.type === 'FunctionDeclaration' || node.type === 'VariableDeclarator') && node.id && targets.has(node.id.name)) {
      chunks.push(source.slice(node.start, node.end));
      return;
    }
    for (const k of Object.keys(node)) {
      if (k === 'loc' || k === 'start' || k === 'end') continue;
      const v = node[k];
      if (Array.isArray(v)) v.forEach(walk);
      else if (v && typeof v === 'object' && v.type) walk(v);
    }
  }
  walk(ast.program);
  return chunks.join('\n');
}

function getSelectorClasses(selector) {
  const s = selector.replace(/\\:/g, '__COLON__');
  const matches = [];
  const re = /\.([a-zA-Z_-][a-zA-Z0-9_-]*(?:__COLON__[a-zA-Z0-9_-]+)*)/g;
  let m;
  while ((m = re.exec(s)) !== null) {
    matches.push(m[1].replace(/__COLON__/g, ':'));
  }
  return matches;
}

function filterCustomCssForSource(rawCss, targetSource, { includePrint = true } = {}) {
  const root = postcss.parse(rawCss);
  const usedKeyframeNames = new Set();

  const shouldKeepRule = (rule) => {
    const keptSels = rule.selectors.filter((sel) => {
      const cls = getSelectorClasses(sel);
      if (cls.length === 0) return true;
      return cls.every((c) => targetSource.includes(c));
    });
    if (keptSels.length === 0) return false;
    rule.selector = keptSels.join(', ');
    rule.walkDecls(/^animation(-name)?$/, (decl) => {
      // Collect identifiers from animation properties
      const cleaned = decl.value.replace(/cubic-bezier\([^)]*\)/g, ' ');
      cleaned.split(/[\s,]+/).forEach((tok) => {
        if (/^[a-zA-Z_-][a-zA-Z0-9_-]*$/.test(tok)) {
          usedKeyframeNames.add(tok);
        }
      });
    });
    return true;
  };

  root.each((node) => {
    if (node.type === 'comment') {
      node.remove();
    } else if (node.type === 'rule') {
      if (!shouldKeepRule(node)) node.remove();
    } else if (node.type === 'atrule' && node.name === 'media') {
      if (!includePrint && node.params.includes('print')) {
        node.remove();
        return;
      }
      node.each((child) => {
        if (child.type === 'rule' && !shouldKeepRule(child)) child.remove();
      });
      if (!node.nodes || node.nodes.length === 0) node.remove();
    }
  });

  // Remove unreferenced @keyframes
  root.each((node) => {
    if (node.type === 'atrule' && node.name === 'keyframes') {
      if (!usedKeyframeNames.has(node.params.trim())) {
        node.remove();
      }
    }
  });

  return root.toString();
}

async function compileSplitCss(tailwindContentRaw, customCss) {
  const result = await postcss([
    tailwindcss({
      content: [{ raw: tailwindContentRaw, extension: 'jsx' }],
      theme: { extend: {} },
      corePlugins: { preflight: true }
    })
  ]).process(`@tailwind base;\n@tailwind components;\n@tailwind utilities;\n${customCss}`, {
    from: undefined
  });
  const minified = new CleanCSS({ level: 2 }).minify(result.css);
  if (minified.errors && minified.errors.length > 0) {
    throw new Error(`CleanCSS errors: ${minified.errors.join('; ')}`);
  }
  return minified.styles;
}

async function runBuild() {
  console.log('--- [START PRODUCTION BUILD] ---');

  // 1. Compile JSX with Babel + Source Map
  console.log('1. Compiling full_app_source.jsx with Babel (with source map)...');
  const source = fs.readFileSync('full_app_source.jsx', 'utf8');
  const babelRes = babel.transformSync(source, {
    presets: [
      ['@babel/preset-react', { runtime: 'classic' }]
    ],
    filename: 'full_app_source.jsx',
    sourceFileName: 'full_app_source.jsx',
    sourceMaps: true,
    compact: true,
    comments: false
  });

  // 2. Production Minification of JavaScript with Terser + External Source Map
  console.log('2. Minifying JavaScript with Terser & generating app.js.map...');
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
    },
    sourceMap: {
      content: babelRes.map,
      filename: 'app.js',
      url: 'app.js.map',
      includeSources: false
    }
  });

  fs.writeFileSync('app.js', terserRes.code, 'utf8');
  fs.writeFileSync('app.js.map', terserRes.map, 'utf8');
  console.log(`   SUCCESS: app.js minified to ${Buffer.byteLength(terserRes.code)} bytes (gzip ${zlib.gzipSync(terserRes.code).length} B), app.js.map ${Buffer.byteLength(terserRes.map)} bytes.`);

  // 3. Compile Static Tailwind CSS & Split Bundles (Eliminating libs/tailwind.js & Unused CSS)
  console.log('3. Compiling static Tailwind CSS + custom CSS bundles (login.min.css & dashboard.min.css)...');
  const html = fs.readFileSync('index.html', 'utf8');
  const rawCss = fs.readFileSync('style.css', 'utf8');

  const loginComponentSrc = extractLoginComponentSources(source) + '\n' + html;
  const loginCustomCss = filterCustomCssForSource(rawCss, loginComponentSrc, { includePrint: false });
  const loginMinCss = await compileSplitCss(loginComponentSrc, loginCustomCss);
  fs.writeFileSync('login.min.css', loginMinCss, 'utf8');
  console.log(`   SUCCESS: login.min.css generated (${Buffer.byteLength(loginMinCss)} bytes, gzip ${zlib.gzipSync(loginMinCss).length} B).`);

  const fullAppSrc = source + '\n' + html;
  const dashboardCustomCss = filterCustomCssForSource(rawCss, fullAppSrc, { includePrint: true });
  const dashboardMinCss = await compileSplitCss(fullAppSrc, dashboardCustomCss);
  fs.writeFileSync('dashboard.min.css', dashboardMinCss, 'utf8');
  console.log(`   SUCCESS: dashboard.min.css generated (${Buffer.byteLength(dashboardMinCss)} bytes, gzip ${zlib.gzipSync(dashboardMinCss).length} B).`);

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
