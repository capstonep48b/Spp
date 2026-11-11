const bytesToBinary = (bytes) => {
  let binary = '';
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i]);
  }
  return binary;
};

function encodeBase64Utf8(str) {
  const bytes = new TextEncoder().encode(String(str || ''));
  return btoa(bytesToBinary(bytes));
}

async function sha512Hex(text) {
  const data = new TextEncoder().encode(String(text || ''));
  const digest = await globalThis.crypto.subtle.digest('SHA-512', data);
  const bytes = new Uint8Array(digest);
  let hex = '';
  for (let i = 0; i < bytes.length; i += 1) {
    hex += bytes[i].toString(16).padStart(2, '0');
  }
  return hex;
}

function safeTimingEqual(a, b) {
  const strA = String(a || '').toLowerCase();
  const strB = String(b || '').toLowerCase();
  const maxLen = Math.max(strA.length, strB.length);
  let diff = strA.length ^ strB.length;
  for (let i = 0; i < maxLen; i += 1) {
    const codeA = i < strA.length ? strA.charCodeAt(i) : 0;
    const codeB = i < strB.length ? strB.charCodeAt(i) : 0;
    diff |= codeA ^ codeB;
  }
  return diff === 0 && strA.length > 0;
}

module.exports = {
  encodeBase64Utf8,
  sha512Hex,
  safeTimingEqual
};

