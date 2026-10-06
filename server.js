const http = require('http');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

const PORT = process.env.PORT || 3000;

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
    let envData = {};
    try {
      const envFile = fs.readFileSync(path.join(__dirname, '.env'), 'utf8');
      envFile.split('\n').forEach(line => {
        const [key, ...val] = line.split('=');
        if (key && val) envData[key.trim()] = val.join('=').trim();
      });
    } catch (e) {}
    res.writeHead(200, { 'Content-Type': 'application/javascript' });
    return res.end(`window.ENV = ${JSON.stringify(envData)};`);
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

server.listen(PORT, () => {
  const url = `http://localhost:${PORT}`;
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
