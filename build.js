const babel = require('@babel/core');
const terser = require('terser');
const CleanCSS = require('clean-css');
const postcss = require('postcss');
const tailwindcss = require('tailwindcss');
const crypto = require('crypto');
const fs = require('fs');
const vm = require('vm');
const zlib = require('zlib');

const SRC_MODULES = [
  'src/utils/storage.js',
  'src/utils/formatters.js',
  'src/utils/mappers.js',
  'src/utils/billing.js',
  'src/services/api.js',
  'src/components/common.jsx',
  'src/components/auth.jsx',
  'src/components/modals.jsx',
  'src/components/parent.jsx',
  'src/components/admin/DashboardView.jsx',
  'src/components/admin/SiswaListView.jsx',
  'src/components/admin/FinanceViews.jsx',
  'src/components/admin/CommunicationViews.jsx',
  'src/App.jsx'
];

function sha256Short(content) {
  return crypto.createHash('sha256').update(content).digest('hex').slice(0, 8);
}

function toPascalCaseIconName(str) {
  return str
    ? str.split('-').map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join('')
    : '';
}

function loadAllLucideIcons() {
  const exportsObj = {};
  const sandbox = { module: { exports: exportsObj }, exports: exportsObj };
  vm.runInNewContext(fs.readFileSync('libs/lucide.min.js', 'utf8'), sandbox);
  if (!exportsObj.icons || typeof exportsObj.icons !== 'object') {
    throw new Error('Gagal memuat definisi ikon dari libs/lucide.min.js');
  }
  return exportsObj.icons;
}

function extractUsedIcons(targetSource, allIcons) {
  const used = {};
  const re = /['"]([a-z][a-z0-9]*(?:-[a-z0-9]+)*)['"]/g;
  let match;
  while ((match = re.exec(targetSource)) !== null) {
    const pascal = toPascalCaseIconName(match[1]);
    if (allIcons[pascal] && !used[pascal]) {
      used[pascal] = allIcons[pascal];
    }
  }
  return used;
}

function extractDeclarations(source, targetNames, astCache = null) {
  const ast = astCache || babel.parseSync(source, {
    presets: [['@babel/preset-react', { runtime: 'classic' }]],
    babelrc: false,
    configFile: false,
    filename: 'app_bundle.jsx'
  });
  const chunks = [];
  for (const stmt of ast.program.body) {
    if (stmt.type === 'FunctionDeclaration' && stmt.id && targetNames.has(stmt.id.name)) {
      chunks.push(source.slice(stmt.start, stmt.end));
    } else if (
      stmt.type === 'VariableDeclaration' &&
      stmt.declarations.some((d) => d.id && targetNames.has(d.id.name))
    ) {
      chunks.push(source.slice(stmt.start, stmt.end));
    }
  }
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
  const minified = new CleanCSS({ level: 2, specialComments: 0 }).minify(result.css);
  if (minified.errors && minified.errors.length > 0) {
    throw new Error(`CleanCSS errors: ${minified.errors.join('; ')}`);
  }
  return minified.styles;
}

const VOID_HTML_TAGS = new Set([
  'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr'
]);

const BOOLEAN_HTML_ATTRS = new Set([
  'checked', 'disabled', 'required', 'readonly', 'readOnly', 'multiple', 'selected', 'hidden'
]);

const UNITLESS_CSS_PROPS = new Set([
  'opacity', 'zIndex', 'fontWeight', 'lineHeight', 'flex', 'flexGrow', 'flexShrink', 'order', 'scale', 'zoom'
]);

const ATTR_NAME_MAP = {
  className: 'class',
  htmlFor: 'for',
  fetchPriority: 'fetchpriority',
  tabIndex: 'tabindex',
  readOnly: 'readonly',
  autoComplete: 'autocomplete',
  strokeWidth: 'stroke-width',
  strokeLinecap: 'stroke-linecap',
  strokeLinejoin: 'stroke-linejoin'
};

function escapeHtmlText(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function escapeHtmlAttr(str) {
  return escapeHtmlText(str).replace(/"/g, '&quot;');
}

function styleObjectToCss(styleObj) {
  if (!styleObj || typeof styleObj !== 'object') return '';
  const parts = [];
  for (const [key, rawVal] of Object.entries(styleObj)) {
    if (rawVal === undefined || rawVal === null || rawVal === '') continue;
    const cssProp = key.replace(/[A-Z]/g, (m) => '-' + m.toLowerCase());
    const val = (typeof rawVal === 'number' && rawVal !== 0 && !UNITLESS_CSS_PROPS.has(key))
      ? `${rawVal}px`
      : String(rawVal);
    parts.push(`${cssProp}:${val}`);
  }
  return parts.join(';');
}

function vnodeToHtml(vnode, ssrFragmentSymbol) {
  if (vnode === null || vnode === undefined || typeof vnode === 'boolean') return '';
  if (Array.isArray(vnode)) return vnode.map((c) => vnodeToHtml(c, ssrFragmentSymbol)).join('');
  if (typeof vnode === 'string' || typeof vnode === 'number') return escapeHtmlText(vnode);
  if (typeof vnode !== 'object') return '';

  const { type, props = {} } = vnode;

  if (type === ssrFragmentSymbol) {
    return vnodeToHtml(props.children, ssrFragmentSymbol);
  }
  if (typeof type === 'function') {
    return vnodeToHtml(type(props), ssrFragmentSymbol);
  }
  if (type && typeof type === 'object' && typeof type.type === 'function') {
    return vnodeToHtml(type.type(props), ssrFragmentSymbol);
  }
  if (typeof type !== 'string') return '';

  let attrsStr = '';
  let innerDangerHtml = null;

  for (const [rawKey, val] of Object.entries(props)) {
    if (rawKey === 'children' || rawKey === 'key' || rawKey === 'ref') continue;
    if (rawKey === 'dangerouslySetInnerHTML') {
      if (val && typeof val.__html === 'string') innerDangerHtml = val.__html;
      continue;
    }
    if (val === undefined || val === null || typeof val === 'function') continue;

    if (rawKey === 'style') {
      const styleCss = styleObjectToCss(val);
      if (styleCss) attrsStr += ` style="${escapeHtmlAttr(styleCss)}"`;
      continue;
    }

    if (BOOLEAN_HTML_ATTRS.has(rawKey)) {
      if (val) attrsStr += ` ${ATTR_NAME_MAP[rawKey] || rawKey.toLowerCase()}`;
      continue;
    }

    const attrName = ATTR_NAME_MAP[rawKey] || rawKey;
    if (typeof val === 'boolean') {
      if (val) attrsStr += ` ${attrName}="true"`;
      else if (attrName === 'aria-hidden') attrsStr += ` aria-hidden="false"`;
      continue;
    }

    attrsStr += ` ${attrName}="${escapeHtmlAttr(val)}"`;
  }

  if (VOID_HTML_TAGS.has(type)) {
    return `<${type}${attrsStr} />`;
  }

  const innerHtml = innerDangerHtml !== null
    ? innerDangerHtml
    : vnodeToHtml(props.children, ssrFragmentSymbol);

  return `<${type}${attrsStr}>${innerHtml}</${type}>`;
}

function renderLoginSsrHtml(source, ast, loginIcons, ssrSettings) {
  const ssrTargets = new Set(['ICON_ELEMENT_CACHE', 'toPascalCaseIconName', 'Icon', 'LoginStatusClockPills', 'LoginView']);
  const ssrSource = `
const { useState, useEffect, useMemo, useCallback, useRef } = React;
${extractDeclarations(source, ssrTargets, ast)}
globalThis.__SPP_RENDER_SSR_LOGIN = function(ssrSettings) {
  return React.createElement(LoginView, {
    onLogin: function() {},
    settings: ssrSettings,
    students: [],
    isSsrSnapshot: true
  });
};
`;

  const compiled = babel.transformSync(ssrSource, {
    presets: [['@babel/preset-react', { runtime: 'classic' }]],
    babelrc: false,
    configFile: false,
    filename: 'ssr_login.jsx',
    comments: false
  });

  const FRAGMENT_SYM = Symbol.for('react.fragment');
  const SSRReact = {
    Fragment: FRAGMENT_SYM,
    createElement(type, props, ...children) {
      const merged = { ...(props || {}) };
      if (children.length === 1) merged.children = children[0];
      else if (children.length > 1) merged.children = children;
      return { type, props: merged };
    },
    memo(comp) {
      return { $$typeof: Symbol.for('react.memo'), type: comp };
    },
    useState(init) {
      return [typeof init === 'function' ? init() : init, () => { }];
    },
    useEffect() { },
    useMemo(fn) {
      return fn();
    },
    useCallback(fn) {
      return fn;
    },
    useRef(init) {
      return { current: init };
    }
  };

  const sandbox = {
    React: SSRReact,
    Map,
    Set,
    Date,
    encodeURIComponent,
    console,
    setTimeout,
    clearTimeout,
    setInterval,
    clearInterval
  };
  sandbox.globalThis = sandbox;
  sandbox.__SPP_ICONS = loginIcons;

  vm.runInNewContext(compiled.code, sandbox);
  const vnode = sandbox.__SPP_RENDER_SSR_LOGIN(ssrSettings);
  return vnodeToHtml(vnode, FRAGMENT_SYM);
}

function buildBootAppCode(appJsUrl, dashCssUrl) {
  return `
(function () {
  const APP_JS_URL = ${JSON.stringify(appJsUrl)};
  const DASH_CSS_URL = ${JSON.stringify(dashCssUrl)};
  const SUPABASE_LIB_URL = "libs/supabase.min.js";
  window.__SPP_DASHBOARD_CSS_HREF = DASH_CSS_URL;

  const hasSavedSession = () => {
    try {
      const tabRaw = sessionStorage.getItem('spp_tab_session');
      if (tabRaw && tabRaw.trim().length > 2) {
        const parsed = JSON.parse(tabRaw);
        if (parsed && typeof parsed === 'object' && parsed.role) return true;
      }
    } catch (e) {}
    return false;
  };

  let _fullBundlePromise = null;
  const loadScriptOrdered = (src) => new Promise((resolve, reject) => {
    const existing = Array.from(document.scripts || []).find((s) => s.getAttribute('src') === src || s.dataset.sppSrc === src);
    if (existing) {
      if (existing.dataset.loaded === '1') return resolve();
      existing.addEventListener('load', () => resolve(), { once: true });
      existing.addEventListener('error', (e) => reject(e), { once: true });
      return;
    }
    const s = document.createElement('script');
    s.dataset.sppSrc = src;
    s.src = src;
    s.async = false;
    s.addEventListener('load', () => { s.dataset.loaded = '1'; resolve(); }, { once: true });
    s.addEventListener('error', () => reject(new Error('Gagal memuat skrip: ' + src)), { once: true });
    document.head.appendChild(s);
  });

  const ensureFullBundle = (deferMount = true) => {
    window.__SPP_DEFER_APP_MOUNT = deferMount;
    if (window.__SPP_MountFullApp) {
      return Promise.all([ensureDashboardCss(), loadScriptOrdered(SUPABASE_LIB_URL)]);
    }
    if (!_fullBundlePromise) {
      _fullBundlePromise = Promise.all([
        ensureDashboardCss(),
        loadScriptOrdered(SUPABASE_LIB_URL),
        loadScriptOrdered(APP_JS_URL)
      ]).catch((err) => {
        _fullBundlePromise = null;
        throw err;
      });
    }
    return _fullBundlePromise;
  };

  const prefetchScript = (href) => {
    if (document.querySelector('link[data-spp-prefetch="' + href + '"]')) return;
    const l = document.createElement('link');
    l.rel = 'prefetch';
    l.as = 'script';
    l.href = href;
    l.dataset.sppPrefetch = href;
    document.head.appendChild(l);
  };

  let _authDataPromise = null;
  let _authDataFetchedAt = 0;
  const fetchAuthData = (forceFresh = false) => {
    if (!forceFresh && _authDataPromise && (Date.now() - _authDataFetchedAt < 15000)) {
      return _authDataPromise;
    }
    _authDataFetchedAt = Date.now();
    _authDataPromise = (async () => {
      const url = (window.AppEnv && typeof window.AppEnv.supabaseUrl === 'string')
        ? window.AppEnv.supabaseUrl
        : (window.ENV?.SUPABASE_URL || '');
      const key = (window.AppEnv && typeof window.AppEnv.supabaseKey === 'string')
        ? window.AppEnv.supabaseKey
        : (window.ENV?.SUPABASE_KEY || '');

      let cachedSettings = null;
      let cachedStudents = [];
      try {
        const sRaw = localStorage.getItem('spp_extended_settings') || localStorage.getItem('spp_cached_settings');
        if (sRaw) cachedSettings = JSON.parse(sRaw);
        const stRaw = localStorage.getItem('spp_cached_students');
        if (stRaw) cachedStudents = JSON.parse(stRaw);
      } catch (e) {}

      let nextSettings = cachedSettings || DEFAULT_SETTINGS;
      let nextStudents = Array.isArray(cachedStudents) ? cachedStudents : [];

      if (url && key) {
        try {
          const base = url.replace(/\\/+$/, '');
          const headers = { apikey: key, Authorization: 'Bearer ' + key, Accept: 'application/json' };
          const [stgResp, stResp] = await Promise.all([
            fetch(base + '/rest/v1/settings?select=*&limit=1', { headers }),
            fetch(base + '/rest/v1/students?select=*', { headers })
          ]);
          if (!stgResp.ok || !stResp.ok) {
            throw new Error('HTTP error saat sinkronisasi login');
          }
          const [stgRows, stRows] = await Promise.all([stgResp.json(), stResp.json()]);
          if (Array.isArray(stgRows) && stgRows.length > 0) {
            nextSettings = mapSettingsFromDb(stgRows[0]);
            try { localStorage.setItem('spp_cached_settings', JSON.stringify(nextSettings)); } catch (e) {}
          }
          if (Array.isArray(stRows)) {
            nextStudents = stRows.map(mapStudentFromDb);
            try { localStorage.setItem('spp_cached_students', JSON.stringify(nextStudents)); } catch (e) {}
          }
        } catch (networkErr) {
          if (nextStudents.length === 0 && (!cachedSettings || !cachedSettings.adminUsername)) {
            throw networkErr;
          }
        }
      }
      return { settings: nextSettings, students: nextStudents };
    })().catch((err) => {
      _authDataPromise = null;
      throw err;
    });
    return _authDataPromise;
  };

  const mountBoot = () => {
    const rootEl = document.getElementById('root');
    if (!rootEl) return;

    const mountGuestBoot = () => {
      const preUser = document.getElementById('login-username')?.value || '';
      const prePass = document.getElementById('login-password')?.value || '';
      const canHydrate = Boolean(
        typeof ReactDOM.hydrateRoot === 'function' &&
        rootEl.firstElementChild &&
        rootEl.firstElementChild.tagName === 'MAIN'
      );

      let root = null;

      function BootApp() {
        const [bootState, setBootState] = React.useState(() => ({
          settings: DEFAULT_SETTINGS,
          students: []
        }));

        React.useEffect(() => {
          try {
            const cs = localStorage.getItem('spp_extended_settings') || localStorage.getItem('spp_cached_settings');
            const cst = localStorage.getItem('spp_cached_students');
            if (cs || cst) {
              setBootState({
                settings: cs ? JSON.parse(cs) : DEFAULT_SETTINGS,
                students: cst ? JSON.parse(cst) : []
              });
            }
          } catch (e) {}
        }, []);

        const handlePrepareAuth = React.useCallback(async (mode) => {
          ensureDashboardCss();
          if (mode === 'prefetch') {
            prefetchScript(SUPABASE_LIB_URL);
            prefetchScript(APP_JS_URL);
            fetchAuthData(false).then((data) => {
              if (data) setBootState(data);
            }).catch(() => {});
            return null;
          }
          ensureFullBundle(true).catch(() => {});
          const data = await fetchAuthData(false);
          if (data) setBootState(data);
          return data;
        }, []);

        const handleBootLogin = React.useCallback(async (userObj) => {
          const handoffData = await fetchAuthData(false).catch(() => bootState);
          await ensureFullBundle(true);
          const handoff = {
            userObj,
            settings: handoffData?.settings || bootState.settings,
            students: handoffData?.students || bootState.students
          };
          window.__SPP_LOGIN_HANDOFF = handoff;
          if (typeof window.__SPP_MountFullApp === 'function') {
            window.__SPP_MountFullApp(root, handoff);
          }
        }, [bootState]);

        return (
          <LoginView
            onLogin={handleBootLogin}
            settings={bootState.settings}
            students={bootState.students}
            onPrepareAuth={handlePrepareAuth}
            ssrHydrating={canHydrate}
            initialUsername={preUser}
            initialPassword={prePass}
          />
        );
      }

      if (canHydrate) {
        root = ReactDOM.hydrateRoot(rootEl, <BootApp />);
      } else {
        root = ReactDOM.createRoot(rootEl);
        root.render(<BootApp />);
      }
    };

    if (hasSavedSession()) {
      ensureFullBundle(true)
        .then(() => {
          if (typeof window.__SPP_MountFullApp === 'function') {
            window.__SPP_MountFullApp(null, null);
          } else {
            document.documentElement.classList.remove('spp-has-session');
            mountGuestBoot();
          }
        })
        .catch(() => {
          document.documentElement.classList.remove('spp-has-session');
          mountGuestBoot();
        });
      return;
    }

    mountGuestBoot();
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mountBoot, { once: true });
  } else {
    mountBoot();
  }
})();
`;
}

async function runBuild() {
  console.log('--- [START PRODUCTION BUILD] ---');

  const moduleSources = SRC_MODULES.map((modPath) => fs.readFileSync(modPath, 'utf8'));
  const source = 'const { useState, useEffect, useMemo, useCallback, useRef } = React;\n' + moduleSources.join('\n\n');
  const htmlTemplate = fs.readFileSync('index.html', 'utf8');
  const rawCss = fs.readFileSync('src/styles/main.css', 'utf8');
  const ast = babel.parseSync(source, {
    presets: [['@babel/preset-react', { runtime: 'classic' }]],
    babelrc: false,
    configFile: false,
    filename: 'app_bundle.jsx'
  });

  console.log(`1. Extracting pruned Lucide icons (${SRC_MODULES.length} modules)...`);
  const allLucideIcons = loadAllLucideIcons();
  const appIcons = extractUsedIcons(source, allLucideIcons);
  console.log(`   Pruned full-app icons: ${Object.keys(appIcons).length} / ${Object.keys(allLucideIcons).length} (${Buffer.byteLength(JSON.stringify(appIcons))} B JSON).`);

  console.log('2. Compiling modular src/ -> app.js + app.js.map...');
  const fullAppSourceWithIcons = `(typeof globalThis!=='undefined'?globalThis:window).__SPP_ICONS=${JSON.stringify(appIcons)};` + source;
  const babelRes = babel.transformSync(fullAppSourceWithIcons, {
    presets: [['@babel/preset-react', { runtime: 'classic' }]],
    babelrc: false,
    configFile: false,
    filename: 'app_bundle.jsx',
    sourceFileName: 'app_bundle.jsx',
    sourceMaps: true,
    compact: true,
    comments: false
  });

  const terserRes = await terser.minify(babelRes.code, {
    compress: {
      drop_console: false,
      drop_debugger: true,
      ecma: 2020,
      passes: 3,
      pure_getters: true
    },
    mangle: {
      toplevel: false,
      reserved: ['React', 'ReactDOM', 'Icon', 'AplikasiSPP', 'EnvironmentConfig', 'AppEnv', 'BootApp', 'AppApi']
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
  const appHash = sha256Short(terserRes.code);
  console.log(`   SUCCESS: app.js ${Buffer.byteLength(terserRes.code)} B (gzip ${zlib.gzipSync(terserRes.code).length} B, v=${appHash}), map ${Buffer.byteLength(terserRes.map)} B.`);

  console.log('3. Compiling static Tailwind CSS bundles (inline login CSS & dashboard.min.css)...');
  const cleanHtmlForScan = htmlTemplate
    .replace(/<style id="spp-login-css">[\s\S]*?<\/style>/, '<style id="spp-login-css"></style>')
    .replace(/<script id="spp-session-boot">[\s\S]*?<\/script>/, '<script id="spp-session-boot"></script>')
    .replace(/<div id="root"(?:\s+data-ssr-root="1")?>[\s\S]*?<\/div>(?=\s*<script(?:\s+data-spp-sw="1")?>)/, '<div id="root" data-ssr-root="1"></div>');
  const loginCssDeclNames = new Set(['ICON_ELEMENT_CACHE', 'toPascalCaseIconName', 'Icon', 'LoginStatusClockPills', 'LoginView']);
  const loginComponentSrc = extractDeclarations(source, loginCssDeclNames, ast) + '\n' + cleanHtmlForScan;
  const loginCustomCss = filterCustomCssForSource(rawCss, loginComponentSrc, { includePrint: false });
  const loginMinCss = await compileSplitCss(loginComponentSrc, loginCustomCss);
  console.log(`   SUCCESS: inline login CSS ${Buffer.byteLength(loginMinCss)} B (gzip ${zlib.gzipSync(loginMinCss).length} B).`);

  const fullAppCssSrc = source + '\n' + cleanHtmlForScan;
  const dashboardCustomCss = filterCustomCssForSource(rawCss, fullAppCssSrc, { includePrint: true });
  const dashboardMinCss = await compileSplitCss(fullAppCssSrc, dashboardCustomCss);
  fs.writeFileSync('dashboard.min.css', dashboardMinCss, 'utf8');
  const dashCssHash = sha256Short(dashboardMinCss);
  console.log(`   SUCCESS: dashboard.min.css ${Buffer.byteLength(dashboardMinCss)} B (gzip ${zlib.gzipSync(dashboardMinCss).length} B, v=${dashCssHash}).`);

  console.log('4. Generating sanitized secure env.js...');
  const { parseEnvText, resolveBackendConfig, renderEnvJsCode } = require('./backend/midtrans-core');
  let mergedEnv = {};
  try {
    if (fs.existsSync('.env')) {
      Object.assign(mergedEnv, parseEnvText(fs.readFileSync('.env', 'utf8')));
    }
    if (fs.existsSync('.env.local')) {
      Object.assign(mergedEnv, parseEnvText(fs.readFileSync('.env.local', 'utf8')));
    }
  } catch (e) { }
  for (const [k, v] of Object.entries(process.env)) {
    if (v !== undefined) mergedEnv[k] = v;
  }

  const resolvedEnvConfig = resolveBackendConfig(mergedEnv);
  const envClassCode = renderEnvJsCode(resolvedEnvConfig);

  fs.writeFileSync('env.js', envClassCode, 'utf8');
  const envHash = sha256Short(envClassCode);
  console.log(`   SUCCESS: env.js generated (mode=${resolvedEnvConfig.mode}, v=${envHash}).`);

  console.log('5. Compiling lightweight login.min.js + login.min.js.map...');
  const loginTargetNames = new Set([
    'LS_JSON_CACHE',
    'readJsonLsCached',
    'writeJsonLsCached',
    'mapStudentFromDb',
    'ALL_MONTHS',
    'formatDateIndo',
    'mapSettingsFromDb',
    'DEFAULT_SETTINGS',
    'ensureDashboardCss',
    'prefetchDashboardCss',
    'ICON_ELEMENT_CACHE',
    'toPascalCaseIconName',
    'Icon',
    'LoginStatusClockPills',
    'LoginView'
  ]);
  const loginExtractedSrc = extractDeclarations(source, loginTargetNames, ast);
  const loginIcons = extractUsedIcons(loginExtractedSrc, allLucideIcons);
  const appJsVersionedUrl = `app.js?v=${appHash}`;
  const dashCssVersionedUrl = `dashboard.min.css?v=${dashCssHash}`;

  const loginBundleRaw = `
(typeof globalThis!=='undefined'?globalThis:window).__SPP_ICONS=${JSON.stringify(loginIcons)};
const { useState, useEffect, useMemo, useCallback, useRef } = React;
${loginExtractedSrc}
${buildBootAppCode(appJsVersionedUrl, dashCssVersionedUrl)}
`;

  const loginBabel = babel.transformSync(loginBundleRaw, {
    presets: [['@babel/preset-react', { runtime: 'classic' }]],
    babelrc: false,
    configFile: false,
    filename: 'login_bundle.jsx',
    sourceFileName: 'login_bundle.jsx',
    sourceMaps: true,
    compact: true,
    comments: false
  });

  const loginTerser = await terser.minify(loginBabel.code, {
    compress: {
      drop_console: false,
      drop_debugger: true,
      ecma: 2020,
      passes: 3,
      pure_getters: true
    },
    mangle: {
      toplevel: true,
      reserved: ['React', 'ReactDOM', 'AppEnv', 'EnvironmentConfig', 'ENV', 'BootApp']
    },
    format: {
      comments: false
    },
    sourceMap: {
      content: loginBabel.map,
      filename: 'login.min.js',
      url: 'login.min.js.map',
      includeSources: false
    }
  });

  fs.writeFileSync('login.min.js', loginTerser.code, 'utf8');
  fs.writeFileSync('login.min.js.map', loginTerser.map, 'utf8');
  const loginJsHash = sha256Short(loginTerser.code);
  console.log(`   SUCCESS: login.min.js ${Buffer.byteLength(loginTerser.code)} B (gzip ${zlib.gzipSync(loginTerser.code).length} B, ${Object.keys(loginIcons).length} icons, v=${loginJsHash}).`);

  console.log('6. Rendering SSR LoginView snapshot & updating index.html + sw.js...');
  const defaultSettingsSandbox = { window: { AppEnv: {}, ENV: {} } };
  vm.runInNewContext(extractDeclarations(source, new Set(['DEFAULT_SETTINGS']), ast) + '\nglobalThis.__DS = DEFAULT_SETTINGS;', defaultSettingsSandbox);
  const ssrSettings = defaultSettingsSandbox.__DS || {
    schoolName: 'PAUD SETIA BHAKTI',
    academicYear: '20262027',
    phone: '089503222835'
  };

  const ssrHtml = renderLoginSsrHtml(source, ast, loginIcons, ssrSettings);

  const safeLoginCss = loginMinCss.replace(/<\/style>/gi, '<\\/style>');
  const inlineSessionBoot = `(function(){window.__SPP_DASHBOARD_CSS_HREF='${dashCssVersionedUrl}';try{var ts=sessionStorage.getItem('spp_tab_session');if(ts&&ts.length>2){document.documentElement.classList.add('spp-has-session');var l=document.createElement('link');l.id='spp-dashboard-css';l.rel='stylesheet';l.href='${dashCssVersionedUrl}';l.onload=function(){this.dataset.loaded='1';};document.head.appendChild(l);setTimeout(function(){try{document.documentElement.classList.remove('spp-has-session');}catch(e){}},8000);}}catch(e){}})();`;

  let updatedHtml = htmlTemplate
    .replace(/<style id="spp-login-css">[\s\S]*?<\/style>/, `<style id="spp-login-css">${safeLoginCss}html.spp-has-session #root{opacity:0;pointer-events:none}</style>`)
    .replace(/<script id="spp-session-boot">[\s\S]*?<\/script>/, `<script id="spp-session-boot">${inlineSessionBoot}</script>`)
    .replace(/src="env\.js(?:\?v=[^"]*)?"/, `src="env.js?v=${envHash}"`)
    .replace(/src="login\.min\.js(?:\?v=[^"]*)?"/, `src="login.min.js?v=${loginJsHash}"`)
    .replace(/<div id="root"(?:\s+data-ssr-root="1")?>[\s\S]*?<\/div>(?=\s*<script(?:\s+data-spp-sw="1")?>)/, `<div id="root" data-ssr-root="1">${ssrHtml}</div>`);

  fs.writeFileSync('index.html', updatedHtml, 'utf8');
  console.log(`   SUCCESS: index.html updated (${Buffer.byteLength(updatedHtml)} B, gzip ${zlib.gzipSync(updatedHtml).length} B).`);

  const swBuildHash = sha256Short(appHash + dashCssHash + loginJsHash + envHash);
  const swAssets = [
    './',
    'index.html',
    'logo.webp',
    'favicon.svg',
    `env.js?v=${envHash}`,
    `login.min.js?v=${loginJsHash}`,
    'libs/react.production.min.js',
    'libs/react-dom.production.min.js'
  ];
  let swCode = fs.readFileSync('sw.js', 'utf8');
  swCode = swCode
    .replace(/const CACHE_NAME = '[^']*';/, `const CACHE_NAME = 'spp-cache-${swBuildHash}';`)
    .replace(/const STATIC_ASSETS = \[[\s\S]*?\];/, `const STATIC_ASSETS = [\n  ${swAssets.map((u) => `'${u}'`).join(',\n  ')}\n];`);
  fs.writeFileSync('sw.js', swCode, 'utf8');
  console.log(`   SUCCESS: sw.js updated (CACHE_NAME = spp-cache-${swBuildHash}).`);

  console.log('--- [BUILD COMPLETED SUCCESSFULLY] ---');
}

runBuild().catch((err) => {
  console.error('BUILD FAILED:', err);
  process.exit(1);
});
