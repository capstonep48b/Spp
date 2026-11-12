const http = require('http');
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const { exec } = require('child_process');
const {
  parseEnvText,
  resolveBackendConfig,
  renderEnvJsCode,
  handleApiRequest
} = require('./backend/midtrans-core');

const MAX_BODY_BYTES = 1024 * 1024;

function loadMergedRuntimeEnv() {
  const merged = {};
  const envFiles = [path.join(__dirname, '.env'), path.join(__dirname, '.env.local')];
  envFiles.forEach((filePath) => {
    try {
      if (fs.existsSync(filePath)) {
        Object.assign(merged, parseEnvText(fs.readFileSync(filePath, 'utf8')));
      }
    } catch (e) {}
  });
  for (const [key, value] of Object.entries(process.env)) {
    if (value !== undefined) {
      merged[key] = value;
    }
  }
  return merged;
}

const bootConfig = resolveBackendConfig(loadMergedRuntimeEnv());
let currentPort = Number(process.env.PORT) || bootConfig.port || 3000;

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2'
};

function readRequestBody(req) {
  return new Promise((resolve, reject) => {
    if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') {
      return resolve('');
    }
    const chunks = [];
    let totalBytes = 0;
    req.on('data', (chunk) => {
      totalBytes += chunk.length;
      if (totalBytes > MAX_BODY_BYTES) {
        req.destroy();
        return reject(new Error('Request body terlalu besar'));
      }
      chunks.push(chunk);
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

function isProtectedStaticFile(normalizedPath) {
  const base = path.basename(normalizedPath).toLowerCase();
  const lower = normalizedPath.toLowerCase();
  if (base === '.env' || base.startsWith('.env.') || base === '.assetsignore' || base === '.gitignore') return true;
  if (base === 'wrangler.json' || base === 'wrangler.jsonc' || base === 'wrangler.toml') return true;
  if (base === 'package.json' || base === 'package-lock.json' || base === 'server.js' || base === 'build.js') return true;
  if (lower.includes('/backend/') || lower.includes('/functions/') || lower.startsWith('/.git') || lower.startsWith('/node_modules/')) return true;
  if (lower.startsWith('/src/') || lower === '/schema.sql') return true;
  return false;
}

const COMPRESSIBLE_EXTS = new Set(['.html', '.js', '.css', '.svg', '.json', '.map']);

function sendCompressed(req, res, statusCode, headers, body, allowCompress = true) {
  const outHeaders = { ...(headers || {}) };
  const rawBuf = Buffer.isBuffer(body) ? body : Buffer.from(String(body || ''), 'utf8');
  const existingVary = outHeaders.Vary || outHeaders.vary;
  if (!existingVary) {
    outHeaders.Vary = 'Accept-Encoding';
  } else if (!String(existingVary).toLowerCase().includes('accept-encoding')) {
    outHeaders.Vary = `${existingVary}, Accept-Encoding`;
  }

  if (
    !allowCompress ||
    req.method === 'HEAD' ||
    rawBuf.length < 512 ||
    outHeaders['Content-Encoding'] ||
    outHeaders['content-encoding']
  ) {
    res.writeHead(statusCode, outHeaders);
    return res.end(req.method === 'HEAD' ? undefined : rawBuf);
  }

  const acceptEncoding = String(req.headers['accept-encoding'] || '');
  if (/\bbr\b/i.test(acceptEncoding) && typeof zlib.brotliCompress === 'function') {
    zlib.brotliCompress(
      rawBuf,
      { params: { [zlib.constants.BROTLI_PARAM_QUALITY]: 5 } },
      (err, compressed) => {
        if (err || !compressed) {
          res.writeHead(statusCode, outHeaders);
          return res.end(rawBuf);
        }
        delete outHeaders['Content-Length'];
        delete outHeaders['content-length'];
        outHeaders['Content-Encoding'] = 'br';
        res.writeHead(statusCode, outHeaders);
        return res.end(compressed);
      }
    );
    return;
  }

  if (/\bgzip\b/i.test(acceptEncoding)) {
    zlib.gzip(rawBuf, { level: 6 }, (err, compressed) => {
      if (err || !compressed) {
        res.writeHead(statusCode, outHeaders);
        return res.end(rawBuf);
      }
      delete outHeaders['Content-Length'];
      delete outHeaders['content-length'];
      outHeaders['Content-Encoding'] = 'gzip';
      res.writeHead(statusCode, outHeaders);
      return res.end(compressed);
    });
    return;
  }

  res.writeHead(statusCode, outHeaders);
  return res.end(rawBuf);
}

function createAppServer(customFetchFn = globalThis.fetch, customEnvOverride = null) {
  return http.createServer(async (req, res) => {
    const rawUrl = req.url || '/';
    const urlPath = rawUrl.split('?')[0];
    const runtimeEnv = customEnvOverride
      ? { ...loadMergedRuntimeEnv(), ...customEnvOverride }
      : loadMergedRuntimeEnv();
    const config = resolveBackendConfig(runtimeEnv);

    if (urlPath === '/env.js') {
      const dynamicCode = renderEnvJsCode(config);
      return sendCompressed(req, res, 200, {
        'Content-Type': 'application/javascript; charset=utf-8',
        'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
        'X-Content-Type-Options': 'nosniff'
      }, dynamicCode, true);
    }

    const isApiRoute =
      urlPath.startsWith('/api/') ||
      Object.values(config.endpoints).some((ep) => urlPath === ep || urlPath.startsWith(`${ep}/`));

    if (isApiRoute) {
      try {
        const bodyText = await readRequestBody(req);
        const hostHeader = req.headers.host || `localhost:${currentPort}`;
        const fullUrl = `http://${hostHeader}${rawUrl}`;
        const reqLike = {
          method: req.method,
          url: fullUrl,
          headers: req.headers,
          body: bodyText,
          text: async () => bodyText
        };

        const apiResponse = await handleApiRequest(reqLike, runtimeEnv, customFetchFn);
        if (apiResponse) {
          return sendCompressed(req, res, apiResponse.status, apiResponse.headers, apiResponse.body, true);
        }

        return sendCompressed(
          req,
          res,
          404,
          { 'Content-Type': 'application/json; charset=utf-8' },
          JSON.stringify({ ok: false, code: 'NOT_FOUND', message: 'Endpoint API tidak ditemukan.' }),
          true
        );
      } catch (err) {
        return sendCompressed(
          req,
          res,
          500,
          { 'Content-Type': 'application/json; charset=utf-8' },
          JSON.stringify({ ok: false, code: 'SERVER_ERROR', message: err.message }),
          true
        );
      }
    }

    let safePath = path.posix.normalize(urlPath.replace(/\\/g, '/'));
    if (!safePath.startsWith('/')) safePath = `/${safePath}`;
    if (safePath === '/') safePath = '/index.html';

    if (isProtectedStaticFile(safePath)) {
      res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
      return res.end('403 Forbidden');
    }

    const filePath = path.join(__dirname, safePath.slice(1));
    if (!filePath.startsWith(__dirname)) {
      res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
      return res.end('403 Forbidden');
    }

    const ext = path.extname(filePath).toLowerCase();

    fs.readFile(filePath, (err, data) => {
      if (err) {
        if (err.code === 'ENOENT') {
          if (urlPath === '/favicon.ico') {
            res.writeHead(204);
            return res.end();
          }
          res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
          res.end('404 File Not Found');
        } else {
          res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
          res.end('500 Server Error');
        }
        return;
      }

      sendCompressed(
        req,
        res,
        200,
        {
          'Content-Type': MIME_TYPES[ext] || 'application/octet-stream',
          'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
          'Pragma': 'no-cache',
          'Expires': '0'
        },
        data,
        COMPRESSIBLE_EXTS.has(ext)
      );
    });
  });
}

if (require.main === module) {
  const server = createAppServer();
  const skipAutoOpen = process.env.NO_OPEN === '1' || process.argv.includes('--no-open');

  server.on('listening', () => {
    const cfg = resolveBackendConfig(loadMergedRuntimeEnv());
    const url = `http://localhost:${currentPort}`;
    console.log('\n======================================================');
    console.log(`Aplikasi SPP berjalan di: ${url}`);
    console.log(`Midtrans Mode: ${cfg.mode.toUpperCase()} (${cfg.midtransApiUrl})`);
    console.log(`Backend API  : ${cfg.endpoints.createTransaction} | ${cfg.endpoints.webhook}`);
    console.log('Tekan Ctrl + C di terminal untuk menghentikan server.');
    console.log('======================================================\n');

    if (!skipAutoOpen) {
      const startCmd = process.platform === 'win32'
        ? `start ${url}`
        : process.platform === 'darwin'
          ? `open ${url}`
          : `xdg-open ${url}`;

      exec(startCmd, () => {});
    }
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.warn(`\nPort ${currentPort} sedang dipakai oleh proses lain.`);
      currentPort += 1;
      console.log(`Mencoba beralih ke port ${currentPort}...\n`);
      setTimeout(() => {
        server.listen(currentPort);
      }, 250);
    } else {
      console.error('Server error:', err);
    }
  });

  server.listen(currentPort);
}

module.exports = { createAppServer, loadMergedRuntimeEnv };
