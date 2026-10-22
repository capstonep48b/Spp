const http = require('http');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

let currentPort = Number(process.env.PORT) || 3000;

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2'
};

const server = http.createServer((req, res) => {
  const urlPath = req.url.split('?')[0];

  if (urlPath === '/save-flowchart-image' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const { image } = JSON.parse(body);
        const base64Data = image.replace(/^data:image\/png;base64,/, '');
        const targetPath = path.join(__dirname, 'Flowchart_Sistem_SPP_Midtrans.png');
        fs.writeFileSync(targetPath, base64Data, 'base64');
        console.log('✅ Flowchart image successfully saved to:', targetPath);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, path: targetPath }));
      } catch (err) {
        console.error('Error saving flowchart:', err);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  if (urlPath === '/env.js') {
    const envFilePath = path.join(__dirname, 'env.js');
    if (fs.existsSync(envFilePath)) {
      const content = fs.readFileSync(envFilePath, 'utf8');
      res.writeHead(200, { 'Content-Type': 'application/javascript; charset=utf-8' });
      return res.end(content);
    }
    
    let envData = {};
    try {
      const envFile = fs.readFileSync(path.join(__dirname, '.env'), 'utf8');
      envFile.split('\n').forEach(line => {
        const [key, ...val] = line.split('=');
        if (key && val) envData[key.trim()] = val.join('=').trim();
      });
    } catch (e) {}

    const safeEnv = {};
    for (const [k, v] of Object.entries(envData)) {
      if (!/(?:SERVER_KEY|SECRET|SERVICE_ROLE|PRIVATE_KEY|PASSWORD)/i.test(k)) {
        safeEnv[k] = v;
      }
    }

    const dynamicCode = `class EnvironmentConfig {
  #config = {};
  constructor(raw = {}) {
    this.#config = Object.freeze(raw);
    Object.freeze(this);
  }
  get(k, d = '') { return this.#config[k] !== undefined ? this.#config[k] : d; }
  has(k) { return Boolean(this.#config[k]); }
  get supabaseUrl() { return this.get('SUPABASE_URL'); }
  get supabaseKey() { return this.get('SUPABASE_KEY') || this.get('SUPABASE_ANON_KEY'); }
  get midtransClientKey() { return this.get('MIDTRANS_CLIENT_KEY'); }
  toObject() { return { ...this.#config }; }
}
(function() {
  const _inst = new EnvironmentConfig(${JSON.stringify(safeEnv, null, 2)});
  if (typeof window !== 'undefined') {
    Object.defineProperty(window, 'EnvironmentConfig', { value: EnvironmentConfig, writable: false, configurable: false });
    Object.defineProperty(window, 'AppEnv', { value: _inst, writable: false, configurable: false, enumerable: true });
    Object.defineProperty(window, 'ENV', { get: () => _inst.toObject(), configurable: false, enumerable: true });
  }
})();`;

    res.writeHead(200, { 'Content-Type': 'application/javascript; charset=utf-8' });
    return res.end(dynamicCode);
  }


  let safePath = path.normalize(urlPath).replace(/^(\.\.[/\\])+/, '');
  if (safePath === '/' || safePath === '\\') safePath = '/index.html';

  const filePath = path.join(__dirname, safePath);
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

    res.writeHead(200, {
      'Content-Type': MIME_TYPES[ext] || 'application/octet-stream',
      'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
      'Pragma': 'no-cache',
      'Expires': '0'
    });
    res.end(data);
  });
});

server.on('listening', () => {
  const url = `http://localhost:${currentPort}`;
  console.log('\n======================================================');
  console.log(`🚀 Aplikasi SPP berhasil berjalan di: ${url}`);
  console.log('🌐 Membuka browser secara otomatis...');
  console.log('📌 Tekan Ctrl + C di terminal untuk menghentikan server.');
  console.log('======================================================\n');

  // Auto-open browser on Windows, Mac, or Linux
  const startCmd = process.platform === 'win32' 
    ? `start ${url}` 
    : process.platform === 'darwin' 
      ? `open ${url}` 
      : `xdg-open ${url}`;
  
  exec(startCmd, () => {});
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.warn(`\n⚠️  Port ${currentPort} sedang dipakai oleh proses lain.`);
    currentPort += 1;
    console.log(`🔄 Mencoba beralih ke port ${currentPort}...\n`);
    setTimeout(() => {
      server.listen(currentPort);
    }, 250);
  } else {
    console.error('❌ Server error:', err);
  }
});

server.listen(currentPort);
