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

// Generate static env.js for static web hosts (GitHub Pages, Vercel, Netlify)
let envData = {};
try {
  const envFile = fs.readFileSync('.env', 'utf8');
  envFile.split('\n').forEach(line => {
    const [key, ...val] = line.split('=');
    if (key && val && key.trim()) envData[key.trim()] = val.join('=').trim();
  });
} catch (e) {}

fs.writeFileSync('env.js', `window.ENV = ${JSON.stringify(envData, null, 2)};\n`, 'utf8');
console.log('SUCCESS: env.js generated for static deployment.');
