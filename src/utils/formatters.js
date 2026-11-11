const formatRupiah = val => {
  if (val === null || val === undefined || val === '' || isNaN(val)) return 'Rp 0';
  return 'Rp ' + Number(val).toLocaleString('id-ID', {
    minimumFractionDigits: 0
  });
};

const parseNumberOnly = val => {
  if (typeof val === 'number') return val;
  if (!val) return 0;
  const cleaned = val.toString().replace(/[^0-9]/g, '');
  return cleaned ? parseInt(cleaned, 10) : 0;
};

const formatInputNumber = val => {
  const num = parseNumberOnly(val);
  return num ? num.toLocaleString('id-ID', {
    minimumFractionDigits: 0
  }) : '';
};

const formatPhoneDisplay = val => {
  if (!val) return '-';
  let cleaned = val.replace(/[^0-9]/g, '');
  if (cleaned.length > 8) {
    return cleaned.replace(/(\d{4})(\d{4})(\d+)/, '$1-$2-$3');
  }
  return cleaned;
};

const compressImageFileToDataUrl = (file, maxDim = 960, quality = 0.78) => new Promise(resolve => {
  if (!file || typeof window === 'undefined') {
    resolve('');
    return;
  }
  const fallbackRead = () => {
    try {
      const reader = new FileReader();
      reader.onloadend = () => resolve(typeof reader.result === 'string' ? reader.result : '');
      reader.onerror = () => resolve('');
      reader.readAsDataURL(file);
    } catch (e) {
      resolve('');
    }
  };
  try {
    if (file.type === 'image/gif' || file.type === 'image/svg+xml' || typeof URL === 'undefined' || typeof URL.createObjectURL !== 'function') {
      fallbackRead();
      return;
    }
    const objUrl = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      try {
        URL.revokeObjectURL(objUrl);
      } catch (e) {}
      try {
        let w = img.naturalWidth || img.width || 0;
        let h = img.naturalHeight || img.height || 0;
        if (!w || !h) {
          fallbackRead();
          return;
        }
        if (w <= maxDim && h <= maxDim && file.size <= 120 * 1024) {
          fallbackRead();
          return;
        }
        if (w > maxDim || h > maxDim) {
          const ratio = Math.min(maxDim / w, maxDim / h);
          w = Math.max(1, Math.round(w * ratio));
          h = Math.max(1, Math.round(h * ratio));
        }
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          fallbackRead();
          return;
        }
        ctx.drawImage(img, 0, 0, w, h);
        let out = '';
        try {
          out = canvas.toDataURL('image/webp', quality);
        } catch (e) {}
        if (!out || !out.startsWith('data:image/webp')) {
          out = canvas.toDataURL('image/jpeg', quality);
        }
        resolve(out || '');
      } catch (err) {
        fallbackRead();
      }
    };
    img.onerror = () => {
      try {
        URL.revokeObjectURL(objUrl);
      } catch (e) {}
      fallbackRead();
    };
    img.src = objUrl;
  } catch (e) {
    fallbackRead();
  }
});

const generateDefaultStudentPassword = (prefix = 'Sb') => {
  const uppers = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const lowers = 'abcdefghijkmnpqrstuvwxyz';
  const numbers = '23456789';
  const all = uppers + lowers + numbers;
  let pwd = prefix;
  pwd += numbers[Math.floor(Math.random() * numbers.length)];
  pwd += uppers[Math.floor(Math.random() * uppers.length)];
  pwd += lowers[Math.floor(Math.random() * lowers.length)];
  for (let i = 0; i < 3; i++) {
    pwd += all[Math.floor(Math.random() * all.length)];
  }
  return pwd;
};

const ALL_MONTHS = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

const formatDateIndo = dateVal => {
  if (!dateVal || dateVal === '-') return dateVal || '-';
  if (dateVal instanceof Date) {
    if (isNaN(dateVal.getTime())) return '-';
    return `${dateVal.getDate()} ${ALL_MONTHS[dateVal.getMonth()]} ${dateVal.getFullYear()}`;
  }
  const str = String(dateVal).trim();
  if (!str || str === '-') return '-';
  const indoMatch = str.match(/^(\d{1,2})(?:\s*-\s*|\s+)([A-Za-z]+)(?:\s*-\s*|\s+)(\d{4})(.*)$/);
  if (indoMatch) {
    const mIdx = ALL_MONTHS.findIndex(m => m.toLowerCase() === indoMatch[2].toLowerCase());
    if (mIdx !== -1) {
      const dayNum = parseInt(indoMatch[1], 10);
      const suffix = indoMatch[4] ? indoMatch[4].trim() : '';
      return `${dayNum} ${ALL_MONTHS[mIdx]} ${indoMatch[3]}${suffix ? ' ' + suffix : ''}`;
    }
  }
  const slashMatch = str.match(/^(\d{1,2})[\/](\d{1,2})[\/](\d{4})(.*)$/);
  if (slashMatch) {
    const dayNum = parseInt(slashMatch[1], 10);
    const monthNum = parseInt(slashMatch[2], 10);
    const yearNum = slashMatch[3];
    const suffix = slashMatch[4] ? slashMatch[4].trim() : '';
    if (monthNum >= 1 && monthNum <= 12 && dayNum >= 1 && dayNum <= 31) {
      return `${dayNum} ${ALL_MONTHS[monthNum - 1]} ${yearNum}${suffix ? ' ' + suffix : ''}`;
    }
  }
  const slashYmdMatch = str.match(/^(\d{4})[\/](\d{1,2})[\/](\d{1,2})(.*)$/);
  if (slashYmdMatch) {
    const yearNum = slashYmdMatch[1];
    const monthNum = parseInt(slashYmdMatch[2], 10);
    const dayNum = parseInt(slashYmdMatch[3], 10);
    const suffix = slashYmdMatch[4] ? slashYmdMatch[4].trim() : '';
    if (monthNum >= 1 && monthNum <= 12 && dayNum >= 1 && dayNum <= 31) {
      return `${dayNum} ${ALL_MONTHS[monthNum - 1]} ${yearNum}${suffix ? ' ' + suffix : ''}`;
    }
  }
  const dashYmdMatch = str.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (dashYmdMatch) {
    const yearNum = dashYmdMatch[1];
    const monthNum = parseInt(dashYmdMatch[2], 10);
    const dayNum = parseInt(dashYmdMatch[3], 10);
    if (monthNum >= 1 && monthNum <= 12 && dayNum >= 1 && dayNum <= 31) {
      return `${dayNum} ${ALL_MONTHS[monthNum - 1]} ${yearNum}`;
    }
  }
  const dashDmyMatch = str.match(/^(\d{1,2})-(\d{1,2})-(\d{4})(.*)$/);
  if (dashDmyMatch) {
    const dayNum = parseInt(dashDmyMatch[1], 10);
    const monthNum = parseInt(dashDmyMatch[2], 10);
    const yearNum = dashDmyMatch[3];
    const suffix = dashDmyMatch[4] ? dashDmyMatch[4].trim() : '';
    if (monthNum >= 1 && monthNum <= 12 && dayNum >= 1 && dayNum <= 31) {
      return `${dayNum} ${ALL_MONTHS[monthNum - 1]} ${yearNum}${suffix ? ' ' + suffix : ''}`;
    }
  }
  if (/\b\d{1,2}[\/]\d{1,2}[\/]\d{4}\b/.test(str)) {
    return str.replace(/\b(\d{1,2})[\/](\d{1,2})[\/](\d{4})\b/g, (full, dStr, mStr, yStr) => {
      const dNum = parseInt(dStr, 10);
      const mNum = parseInt(mStr, 10);
      if (mNum >= 1 && mNum <= 12 && dNum >= 1 && dNum <= 31) {
        return `${dNum} ${ALL_MONTHS[mNum - 1]} ${yStr}`;
      }
      return full;
    });
  }
  const d = new Date(str);
  if (!isNaN(d.getTime())) {
    return `${d.getDate()} ${ALL_MONTHS[d.getMonth()]} ${d.getFullYear()}`;
  }
  return str;
};

const formatDateTimeIndo = (timeOrDateVal, fallbackDateVal = '') => {
  if (!timeOrDateVal || timeOrDateVal === '-' || timeOrDateVal === 'Wali') {
    return fallbackDateVal ? formatDateIndo(fallbackDateVal) : '-';
  }
  const str = String(timeOrDateVal).trim();
  if (/^\d{1,2}[:.]\d{2}(?:[:.]\d{2})?(?:\s*(?:WIB|WITA|WIT|AM|PM))?$/i.test(str)) {
    const cleanTime = str.replace(/\./g, ':').replace(/\s*(WIB|WITA|WIT)$/i, '') + ' WIB';
    const baseDate = fallbackDateVal ? formatDateIndo(fallbackDateVal).split('•')[0].trim() : formatDateIndo(new Date());
    return baseDate && baseDate !== '-' ? `${baseDate} • ${cleanTime}` : cleanTime;
  }
  return formatDateIndo(str);
};

const dateToYyyyMmDd = formattedVal => {
  if (!formattedVal) return '';
  const str = String(formattedVal).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;
  const indoMatch = str.match(/^(\d{1,2})(?:\s*-\s*|\s+)([A-Za-z]+)(?:\s*-\s*|\s+)(\d{4})/);
  if (indoMatch) {
    const day = indoMatch[1].padStart(2, '0');
    const mIdx = ALL_MONTHS.findIndex(m => m.toLowerCase() === indoMatch[2].toLowerCase());
    if (mIdx !== -1) {
      const month = String(mIdx + 1).padStart(2, '0');
      return `${indoMatch[3]}-${month}-${day}`;
    }
  }
  const dmyMatch = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
  if (dmyMatch) {
    const day = dmyMatch[1].padStart(2, '0');
    const month = dmyMatch[2].padStart(2, '0');
    return `${dmyMatch[3]}-${month}-${day}`;
  }
  const d = new Date(str);
  if (!isNaN(d.getTime())) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }
  return '';
};
