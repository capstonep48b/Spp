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
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2'
};

const server = http.createServer((req, res) => {
  const urlPath = req.url.split('?')[0];

  if (urlPath === '/env.js') {
    const envFilePath = path.join(__dirname, 'env.js');
    if (fs.existsSync(envFilePath)) {
      const content = fs.readFileSync(envFilePath, 'utf8');
      res.writeHead(200, { 'Content-Type': 'application/javascript; charset=utf-8' });
      return res.end(content);
    }
    
    let envData = {};
    let secretVault = {};
    try {
      const envFile = fs.readFileSync(path.join(__dirname, '.env'), 'utf8');
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
        if (/DEFAULT_ADMIN_PASS|ADMIN_PASSWORD/i.test(key)) {
          secretVault.p = Buffer.from(val).toString('base64');
          return;
        }
        if (key) envData[key] = val;
      });
    } catch (e) {}

    const dynamicCode = `class EnvironmentConfig {
  #config = {};
  #vault = {};
  constructor(raw = {}, vault = {}) {
    this.#config = Object.freeze(raw);
    this.#vault = Object.freeze({ ...vault });
    Object.freeze(this);
  }
  #decode(str) {
    if (!str || typeof str !== 'string') return '';
    try {
      if (typeof atob === 'function') return atob(str);
      if (typeof Buffer !== 'undefined') return Buffer.from(str, 'base64').toString('utf8');
    } catch (e) {}
    return '';
  }
  get(k, d = '') { return this.#config[k] !== undefined ? this.#config[k] : d; }
  has(k) { return Boolean(this.#config[k]); }
  get supabaseUrl() { return this.get('SUPABASE_URL'); }
  get supabaseKey() { return this.#decode(this.#vault.k) || (typeof localStorage !== 'undefined' ? (localStorage.getItem('spp_supabase_key') || localStorage.getItem('supabase_key')) : '') || ''; }
  get midtransClientKey() { return this.get('MIDTRANS_CLIENT_KEY'); }
  get schoolName() { return this.get('SCHOOL_NAME', 'PAUD SETIA BHAKTI'); }
  get schoolAddress() { return this.get('SCHOOL_ADDRESS', 'Bekasi, Jawa Barat'); }
  get schoolPhone() { return this.get('SCHOOL_PHONE', '081234567890'); }
  get academicYear() { return this.get('ACADEMIC_YEAR', '2025/2026'); }
  get adminName() { return this.get('DEFAULT_ADMIN_NAME', 'Siti Rahma (Admin TU)'); }
  get adminUsername() { return this.get('DEFAULT_ADMIN_USER', 'admin'); }
  get adminPassword() { return this.#decode(this.#vault.p) || this.get('DEFAULT_ADMIN_PASS', 'admin123'); }
  toObject() { return { ...this.#config }; }
}
(function() {
  const _inst = new EnvironmentConfig(${JSON.stringify(envData, null, 2)}, ${JSON.stringify(secretVault, null, 2)});
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
