let _supabaseClient = null;

function getSupabaseClient() {
  if (_supabaseClient) return _supabaseClient;
  const url = window.AppEnv && typeof window.AppEnv.supabaseUrl === 'string' ? window.AppEnv.supabaseUrl : window.ENV?.SUPABASE_URL || '';
  const key = window.AppEnv && typeof window.AppEnv.supabaseKey === 'string' ? window.AppEnv.supabaseKey : window.ENV?.SUPABASE_KEY || '';
  if (!url || !key) {
    console.warn("Supabase URL / Key tidak ditemukan!");
    return null;
  }
  const supaLib = window.supabase;
  if (supaLib && typeof supaLib.createClient === 'function') {
    try {
      _supabaseClient = supaLib.createClient(url, key);
      return _supabaseClient;
    } catch (err) {
      console.error("Gagal membuat Supabase client:", err);
      return null;
    }
  }
  return null;
}

const getBackendApiEndpointUrl = (appEnvProp, fallbackPath) => {
  try {
    if (window.AppEnv && typeof window.AppEnv.getApiUrl === 'function') {
      const ep = window.AppEnv[appEnvProp] || fallbackPath;
      return window.AppEnv.getApiUrl(ep);
    }
    const base = (window.AppEnv?.backendApiUrl || '').replace(/\/+$/, '');
    return base ? `${base}${fallbackPath}` : fallbackPath;
  } catch (e) {
    return fallbackPath;
  }
};

const loadMidtransSnapScript = (snapUrl, clientKey) => new Promise((resolve, reject) => {
  if (typeof window === 'undefined') return reject(new Error('Window tidak tersedia'));
  if (window.snap && typeof window.snap.pay === 'function') {
    const activeScript = document.getElementById('midtrans-snap-script');
    if (!activeScript || activeScript.getAttribute('data-client-key') === clientKey) {
      return resolve(window.snap);
    }
    try {
      activeScript.remove();
    } catch (e) {}
  }
  const existing = document.getElementById('midtrans-snap-script');
  if (existing) {
    if (existing.dataset.loaded === '1' && window.snap) return resolve(window.snap);
    existing.addEventListener('load', () => resolve(window.snap), {
      once: true
    });
    existing.addEventListener('error', () => reject(new Error('Gagal memuat Midtrans Snap.js')), {
      once: true
    });
    return;
  }
  const script = document.createElement('script');
  script.id = 'midtrans-snap-script';
  script.src = snapUrl || window.AppEnv?.midtransSnapUrl || 'https://app.sandbox.midtrans.com/snap/snap.js';
  if (clientKey) script.setAttribute('data-client-key', clientKey);
  script.async = true;
  script.onload = () => {
    script.dataset.loaded = '1';
    if (window.snap && typeof window.snap.pay === 'function') {
      resolve(window.snap);
    } else {
      reject(new Error('Midtrans Snap object tidak ditemukan setelah skrip dimuat.'));
    }
  };
  script.onerror = () => reject(new Error('Gagal memuat skrip pembayaran Midtrans Snap.'));
  document.head.appendChild(script);
});

const AppApi = {
  isConnected() {
    return Boolean(getSupabaseClient());
  },
  auth: {
    async syncSessionToken(role, payload, settingsId = null) {
      const supabase = getSupabaseClient();
      if (!supabase) return null;
      if (role === 'parent' && payload && payload.studentId !== undefined) {
        const sessionPayload = {
          session_token: payload.newSessionToken
        };
        if (payload.arrearsNote && String(payload.arrearsNote).startsWith('sess_')) {
          sessionPayload.arrears_note = '';
        }
        await supabase.from('students').update(sessionPayload).eq('id', payload.studentId);
        return null;
      }
      if (role === 'admin' && payload && payload.newSessionToken) {
        let stgId = settingsId;
        if (!stgId) {
          const {
            data: stgRows
          } = await supabase.from('settings').select('id').limit(1);
          if (stgRows && stgRows[0]?.id) stgId = stgRows[0].id;
        }
        if (stgId) {
          await supabase.from('settings').update({
            session_token: payload.newSessionToken
          }).eq('id', stgId);
          return stgId;
        }
      }
      return null;
    },
    createSessionChannel() {
      const supabase = getSupabaseClient();
      return supabase ? supabase.channel('spp_single_session_channel') : null;
    },
    subscribeSessionChannel(onBroadcast, onSubscribed) {
      const supabase = getSupabaseClient();
      if (!supabase) return null;
      const channel = supabase.channel('spp_single_session_channel');
      channel.on('broadcast', {
        event: 'single_session_login'
      }, msg => {
        if (typeof onBroadcast === 'function') onBroadcast(msg.payload || {});
      }).subscribe(status => {
        if (status === 'SUBSCRIBED' && typeof onSubscribed === 'function') {
          onSubscribed(channel);
        }
      });
      return channel;
    },
    unsubscribeSessionChannel(channel) {
      const supabase = getSupabaseClient();
      if (supabase && channel) {
        supabase.removeChannel(channel);
      }
    }
  },
  sync: {
    async fetchGuestBundle() {
      const supabase = getSupabaseClient();
      if (!supabase) return null;
      const [stRes, stgRes] = await Promise.allSettled([
        supabase.from('students').select('*'),
        supabase.from('settings').select('*').limit(1)
      ]);
      return {
        stRes,
        stgRes
      };
    },
    async fetchPortalBundle() {
      const supabase = getSupabaseClient();
      if (!supabase) return null;
      const [stRes, trRes, anRes, cpRes, ntRes, stgRes] = await Promise.allSettled([
        supabase.from('students').select('*'),
        supabase.from('transactions').select('*'),
        supabase.from('announcements').select('*'),
        supabase.from('complaints').select('*'),
        supabase.from('student_notes').select('*'),
        supabase.from('settings').select('*').limit(1)
      ]);
      return {
        stRes,
        trRes,
        anRes,
        cpRes,
        ntRes,
        stgRes
      };
    }
  },
  settings: {
    async save(extendedPayload, basePayload, settingsId) {
      const supabase = getSupabaseClient();
      if (!supabase) return;
      let res;
      if (settingsId) {
        res = await supabase.from('settings').update(extendedPayload).eq('id', settingsId);
      } else {
        res = await supabase.from('settings').insert([extendedPayload]);
      }
      if (res && res.error) {
        console.warn("Retrying update with fallback base payload:", res.error);
        if (settingsId) {
          await supabase.from('settings').update(basePayload).eq('id', settingsId);
        } else {
          await supabase.from('settings').insert([basePayload]);
        }
      }
    }
  },
  announcements: {
    async create(payload) {
      const supabase = getSupabaseClient();
      if (!supabase) return;
      await supabase.from('announcements').insert([payload]);
    },
    async update(id, payload) {
      const supabase = getSupabaseClient();
      if (supabase && typeof id !== 'number') {
        await supabase.from('announcements').update(payload).eq('id', id);
      }
    },
    async remove(id) {
      const supabase = getSupabaseClient();
      if (supabase && typeof id !== 'number') {
        await supabase.from('announcements').delete().eq('id', id);
      }
    }
  },
  complaints: {
    async create(payload) {
      const supabase = getSupabaseClient();
      if (!supabase) return {
        data: null
      };
      return supabase.from('complaints').insert([payload]).select();
    },
    async reply(id, payload) {
      const supabase = getSupabaseClient();
      if (supabase && typeof id !== 'number') {
        await supabase.from('complaints').update(payload).eq('id', id);
      }
    },
    async toggleStatus(id, nextStatus) {
      const supabase = getSupabaseClient();
      if (supabase && typeof id !== 'number') {
        await supabase.from('complaints').update({
          status: nextStatus
        }).eq('id', id);
      }
    },
    async markRead(id) {
      const supabase = getSupabaseClient();
      if (supabase && typeof id !== 'number') {
        try {
          await supabase.from('complaints').update({
            is_read: true
          }).eq('id', id);
        } catch (err) {}
      }
    },
    async markManyRead(ids) {
      const supabase = getSupabaseClient();
      if (supabase && Array.isArray(ids) && ids.length > 0) {
        await supabase.from('complaints').update({
          is_read: true
        }).in('id', ids);
      }
    }
  },
  notes: {
    async create(payload) {
      const supabase = getSupabaseClient();
      if (!supabase) {
        return {
          data: null,
          error: {
            message: 'Database connection missing'
          },
          noClient: true
        };
      }
      return supabase.from('student_notes').insert([payload]).select();
    },
    updateComments(id, comments) {
      const supabase = getSupabaseClient();
      if (supabase && typeof id !== 'number') {
        supabase.from('student_notes').update({
          comments: JSON.stringify(comments),
          is_read: false
        }).eq('id', id).then();
      }
    },
    async markRead(id) {
      const supabase = getSupabaseClient();
      if (supabase && typeof id !== 'number') {
        try {
          await supabase.from('student_notes').update({
            is_read: true
          }).eq('id', id);
        } catch (err) {}
      }
    },
    async markManyRead(ids) {
      const supabase = getSupabaseClient();
      if (supabase && Array.isArray(ids) && ids.length > 0) {
        try {
          await supabase.from('student_notes').update({
            is_read: true
          }).in('id', ids);
        } catch (err) {}
      }
    },
    async remove(id) {
      const supabase = getSupabaseClient();
      if (supabase && typeof id !== 'number') {
        await supabase.from('student_notes').delete().eq('id', id);
      }
    }
  },
  students: {
    async create(payload) {
      const supabase = getSupabaseClient();
      if (supabase) {
        try {
          await supabase.from('students').insert([payload]);
        } catch (err) {}
      }
    },
    async update(id, nis, payload) {
      const supabase = getSupabaseClient();
      if (!supabase) return;
      if (typeof id === 'string' && id.includes('-')) {
        await supabase.from('students').update(payload).eq('id', id);
      } else if (nis) {
        await supabase.from('students').update(payload).eq('nis', nis);
      } else {
        await supabase.from('students').update(payload).eq('id', id);
      }
    },
    async remove(id) {
      const supabase = getSupabaseClient();
      if (supabase && typeof id !== 'number') {
        try {
          await supabase.from('students').delete().eq('id', id);
        } catch (err) {}
      }
    }
  },
  transactions: {
    async create(payload) {
      const supabase = getSupabaseClient();
      if (supabase) {
        try {
          await supabase.from('transactions').insert([payload]);
        } catch (err) {}
      }
    },
    async markRead(id) {
      const supabase = getSupabaseClient();
      if (supabase && typeof id !== 'number') {
        try {
          await supabase.from('transactions').update({
            is_read: true
          }).eq('id', id);
        } catch (err) {}
      }
    },
    async markManyRead(ids) {
      const supabase = getSupabaseClient();
      if (supabase && Array.isArray(ids) && ids.length > 0) {
        await supabase.from('transactions').update({
          is_read: true
        }).in('id', ids);
      }
    }
  },
  payment: {
    async getMidtransConfig(signal) {
      const configUrl = getBackendApiEndpointUrl('midtransConfigEndpoint', '/api/midtrans/config');
      const res = await fetch(configUrl, {
        method: 'GET',
        headers: {
          Accept: 'application/json'
        },
        ...(signal ? {
          signal
        } : {})
      });
      const ctype = (res.headers.get('content-type') || '').toLowerCase();
      if (!res.ok || !ctype.includes('application/json')) {
        throw new Error('Backend API tidak aktif');
      }
      return res.json();
    },
    async createMidtransTransaction(payload) {
      const createUrl = getBackendApiEndpointUrl('midtransCreateTxEndpoint', '/api/midtrans/create-transaction');
      const res = await fetch(createUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json'
        },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data && data.orderId) {
        const expMs = Number(data.expiresAtMs || 0) || parseMidtransTimestampClientMs(data.expiryTime || data.expiresAt);
        saveTrxMetaCache(data.orderId, {
          snapToken: data.snapToken || '',
          snapUrl: data.snapUrl || '',
          method: data.method || payload?.preferredChannel || '',
          expiresAt: data.expiryTime || '',
          expiresAtMs: expMs,
          createdAtMs: data.createdAtMs || Date.now(),
          vaNumber: data.paymentDetails?.vaNumber || '',
          vaBank: data.paymentDetails?.vaBank || '',
          billKey: data.paymentDetails?.billKey || '',
          billerCode: data.paymentDetails?.billerCode || '',
          paymentCode: data.paymentDetails?.paymentCode || '',
          qrCodeUrl: data.paymentDetails?.qrCodeUrl || '',
          transactionId: data.paymentDetails?.transactionId || '',
          acquirer: data.paymentDetails?.acquirer || '',
          paymentType: data.paymentDetails?.paymentType || '',
          snapRedirectUrl: data.redirectUrl || ''
        });
      }
      return {
        ok: res.ok,
        status: res.status,
        data
      };
    },
    async getMidtransStatusDetailed(orderId, opts = {}) {
      const statusBaseUrl = getBackendApiEndpointUrl('midtransStatusEndpoint', '/api/midtrans/status');
      const sep = statusBaseUrl.includes('?') ? '&' : '?';
      const metaEntry = orderId ? readTrxMetaCache()[orderId] : null;
      const snapHint = opts?.snapToken || metaEntry?.snapToken || '';
      const snapQuery = snapHint ? `&snap_token=${encodeURIComponent(snapHint)}` : '';
      const res = await fetch(`${statusBaseUrl}${sep}order_id=${encodeURIComponent(orderId)}${snapQuery}`, {
        method: 'GET',
        headers: {
          Accept: 'application/json'
        }
      });
      let data = null;
      try {
        data = await res.json();
      } catch (e) {}
      if (res.ok && data && data.ok && data.paymentDetermined !== false && (data.orderId || orderId)) {
        const expMs = Number(data.expiresAtMs || 0) || parseMidtransTimestampClientMs(data.expiryTime || data.expiresAt);
        const pd = data.paymentDetails || {};
        saveTrxMetaCache(data.orderId || orderId, {
          snapToken: data.snapToken || snapHint || undefined,
          method: data.method && data.method !== 'pending' ? data.method : undefined,
          expiresAt: data.expiryTime || '',
          expiresAtMs: expMs,
          vaNumber: pd.vaNumber || '',
          vaBank: pd.vaBank || '',
          billKey: pd.billKey || '',
          billerCode: pd.billerCode || '',
          paymentCode: pd.paymentCode || '',
          qrCodeUrl: pd.qrCodeUrl || '',
          transactionId: pd.transactionId || '',
          acquirer: pd.acquirer || '',
          paymentType: data.paymentType || pd.paymentType || ''
        });
      }
      return {
        ok: res.ok,
        status: res.status,
        data
      };
    },
    async cancelMidtransTransaction(orderId) {
      const cancelUrl = getBackendApiEndpointUrl('midtransCancelEndpoint', '/api/midtrans/cancel');
      const res = await fetch(cancelUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json'
        },
        body: JSON.stringify({
          orderId
        })
      });
      let data = null;
      try {
        data = await res.json();
      } catch (e) {}
      return {
        ok: res.ok,
        status: res.status,
        data
      };
    },
    async getMidtransStatus(orderId) {
      const {
        ok,
        data
      } = await this.getMidtransStatusDetailed(orderId);
      if (!ok || !data || !data.ok || data.paymentDetermined === false) return null;
      return data;
    }
  }
};
