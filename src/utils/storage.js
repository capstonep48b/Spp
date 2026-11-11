const LS_JSON_CACHE = new Map();

if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
  window.addEventListener('storage', ev => {
    if (ev && ev.key) LS_JSON_CACHE.delete(ev.key);else LS_JSON_CACHE.clear();
  });
}

const readJsonLsCached = (key, fallback) => {
  if (typeof window === 'undefined' || !window.localStorage) return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (raw === null || raw === undefined || raw === '') return fallback;
    const cached = LS_JSON_CACHE.get(key);
    if (cached && cached.raw === raw) return cached.val;
    const val = JSON.parse(raw);
    LS_JSON_CACHE.set(key, {
      raw,
      val
    });
    return val;
  } catch (e) {
    return fallback;
  }
};

const writeJsonLsCached = (key, value) => {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    const raw = JSON.stringify(value);
    window.localStorage.setItem(key, raw);
    LS_JSON_CACHE.set(key, {
      raw,
      val: value
    });
  } catch (e) {}
};

const ensureDashboardCss = () => {
  if (typeof document === 'undefined') return Promise.resolve();
  const cssHref = window.__SPP_DASHBOARD_CSS_HREF || 'dashboard.min.css';
  const existing = document.getElementById('spp-dashboard-css');
  if (existing) {
    if (existing.dataset.loaded === '1' || existing.sheet) return Promise.resolve();
    return new Promise(resolve => {
      const done = () => {
        existing.dataset.loaded = '1';
        resolve();
      };
      existing.addEventListener('load', done, {
        once: true
      });
      existing.addEventListener('error', done, {
        once: true
      });
      setTimeout(done, 1500);
    });
  }
  return new Promise(resolve => {
    const link = document.createElement('link');
    link.id = 'spp-dashboard-css';
    link.rel = 'stylesheet';
    link.href = cssHref;
    const done = () => {
      link.dataset.loaded = '1';
      resolve();
    };
    link.addEventListener('load', done, {
      once: true
    });
    link.addEventListener('error', done, {
      once: true
    });
    document.head.appendChild(link);
    setTimeout(done, 1500);
  });
};

const prefetchDashboardCss = () => {
  if (typeof document === 'undefined') return;
  const cssHref = window.__SPP_DASHBOARD_CSS_HREF || 'dashboard.min.css';
  if (document.getElementById('spp-dashboard-css') || document.getElementById('spp-dashboard-css-prefetch')) return;
  const link = document.createElement('link');
  link.id = 'spp-dashboard-css-prefetch';
  link.rel = 'prefetch';
  link.as = 'style';
  link.href = cssHref;
  document.head.appendChild(link);
};
