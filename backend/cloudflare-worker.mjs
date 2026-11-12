import core from './midtrans-core.js';

const PUBLIC_ENV_DEFAULTS = Object.freeze({
  CORS_ALLOWED_ORIGINS: 'http://localhost:3000,http://127.0.0.1:3000,https://e-sppsetiabhakti.my.id',
  BACKEND_API_URL: '',
  API_HEALTH_ENDPOINT: '/api/health',
  MIDTRANS_CONFIG_ENDPOINT: '/api/midtrans/config',
  MIDTRANS_CREATE_TX_ENDPOINT: '/api/midtrans/create-transaction',
  MIDTRANS_STATUS_ENDPOINT: '/api/midtrans/status',
  MIDTRANS_CANCEL_ENDPOINT: '/api/midtrans/cancel',
  MIDTRANS_WEBHOOK_ENDPOINT: '/api/midtrans/webhook',
  SUPABASE_URL: 'https://mgywbrmneeorynisujkf.supabase.co',
  SUPABASE_REST_PATH: '/rest/v1',
  SUPABASE_KEY: 'sb_publishable_BT_1lHhvJerwY0k4fWzIbg_51-VQ7V5',
  MIDTRANS_IS_PRODUCTION: 'false',
  MIDTRANS_CLIENT_KEY: 'Mid-client-MdhYv4NdjfvG20k6',
  MIDTRANS_SANDBOX_SNAP_URL: 'https://app.sandbox.midtrans.com/snap/snap.js',
  MIDTRANS_SANDBOX_API_URL: 'https://app.sandbox.midtrans.com/snap/v1/transactions',
  MIDTRANS_SANDBOX_CORE_API_URL: 'https://api.sandbox.midtrans.com/v2',
  MIDTRANS_PRODUCTION_SNAP_URL: 'https://app.midtrans.com/snap/snap.js',
  MIDTRANS_PRODUCTION_API_URL: 'https://app.midtrans.com/snap/v1/transactions',
  MIDTRANS_PRODUCTION_CORE_API_URL: 'https://api.midtrans.com/v2',
  APP_BASE_URL: 'https://e-sppsetiabhakti.my.id'
});

function buildRuntimeEnv(cfEnv) {
  const merged = { ...PUBLIC_ENV_DEFAULTS };
  if (cfEnv && typeof cfEnv === 'object') {
    for (const [k, v] of Object.entries(cfEnv)) {
      if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') {
        const text = String(v).trim();
        if (text !== '') {
          merged[k] = v;
        }
      }
    }
  }
  return merged;
}

function isProtectedAssetPath(pathname) {
  const lower = String(pathname || '').toLowerCase();
  const base = lower.split('/').pop() || '';
  if (base === '.env' || base.startsWith('.env.') || base === '.assetsignore' || base === '.gitignore') return true;
  if (base === 'wrangler.json' || base === 'wrangler.jsonc' || base === 'wrangler.toml') return true;
  if (base === 'package.json' || base === 'package-lock.json' || base === 'server.js' || base === 'build.js' || base === 'schema.sql') return true;
  if (lower.startsWith('/backend/') || lower.startsWith('/src/') || lower.startsWith('/functions/') || lower.startsWith('/.git') || lower.startsWith('/node_modules/')) return true;
  return false;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const pathname = url.pathname;
    const runtimeEnv = buildRuntimeEnv(env);
    const config = core.resolveBackendConfig(runtimeEnv);

    if (pathname === '/env.js') {
      const dynamicCode = core.renderEnvJsCode(config);
      return new Response(dynamicCode, {
        status: 200,
        headers: {
          'Content-Type': 'application/javascript; charset=utf-8',
          'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
          'X-Content-Type-Options': 'nosniff'
        }
      });
    }

    const isApiRoute =
      pathname.startsWith('/api/') ||
      Object.values(config.endpoints || {}).some((ep) => ep && (pathname === ep || pathname.startsWith(`${ep}/`)));

    if (isApiRoute) {
      const webFetch = (input, init) => globalThis.fetch(input, init);
      const apiResponse = await core.handleApiRequest(request, runtimeEnv, webFetch);
      if (apiResponse) {
        return new Response(apiResponse.body, {
          status: apiResponse.status,
          headers: apiResponse.headers
        });
      }

      return new Response(
        JSON.stringify({
          ok: false,
          code: 'NOT_FOUND',
          message: 'Endpoint API tidak ditemukan.'
        }),
        {
          status: 404,
          headers: {
            'Content-Type': 'application/json; charset=utf-8'
          }
        }
      );
    }

    if (isProtectedAssetPath(pathname)) {
      return new Response('403 Forbidden', {
        status: 403,
        headers: {
          'Content-Type': 'text/plain; charset=utf-8'
        }
      });
    }

    if (env && env.ASSETS && typeof env.ASSETS.fetch === 'function') {
      return env.ASSETS.fetch(request);
    }

    return new Response(
      JSON.stringify({
        ok: false,
        code: 'NOT_FOUND',
        message: 'Resource tidak ditemukan.'
      }),
      {
        status: 404,
        headers: {
          'Content-Type': 'application/json; charset=utf-8'
        }
      }
    );
  }
};
