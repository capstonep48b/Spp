// Saring notifikasi produksi dari CDN eksternal agar konsol bersih
(function() {
  const _warn = console.warn;
  console.warn = function(...args) {
    if (args[0] && typeof args[0] === 'string' && args[0].includes('cdn.tailwindcss.com should not be used in production')) {
      return;
    }
    _warn.apply(console, args);
  };
})();

window.onerror = function(msg, src, lineno, colno, err) {
  const errBox = document.createElement('div');
  errBox.style.cssText = 'background:red;color:white;padding:20px;z-index:9999;position:fixed;top:0;left:0;width:100%;';
  errBox.innerHTML = '<b>ERROR:</b> ' + msg + ' at ' + src + ':' + lineno + ':' + colno + '<br><pre>' + (err ? err.stack : '') + '</pre>';
  document.body.appendChild(errBox);
};

window.onunhandledrejection = function(e) {
  const errBox = document.createElement('div');
  errBox.style.cssText = 'background:red;color:white;padding:20px;z-index:9999;position:fixed;top:0;left:0;width:100%;';
  errBox.innerHTML = '<b>PROMISE ERROR:</b> ' + (e.reason ? e.reason.stack || e.reason : '');
  document.body.appendChild(errBox);
};
