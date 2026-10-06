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
