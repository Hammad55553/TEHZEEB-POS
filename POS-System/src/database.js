/**
 * LOCAL BACKEND SHIM  —  Tehzeeb Sweets & Super Store POS
 * -----------------------------------------------------------------------------
 * This file used to point at Database (cloud). It now talks to a LOCAL
 * FastAPI + PostgreSQL backend running fully offline on this machine
 * (default http://127.0.0.1:8000).
 *
 * It re-implements just the slice of the Database JS API the app uses:
 *   db.from(table).select().eq().is().not().order().single()...
 *   db.from(table).insert() / .update().eq() / .delete().eq() / .upsert()
 *   db.auth.signInWithPassword / signUp / getSession / onAuthStateChange
 *                .signInWithOAuth / updateUser / resetPasswordForEmail / signOut
 *   db.channel(name).on('postgres_changes', ...).subscribe()  (polling)
 *   db.removeChannel(ch)
 *
 * Every method returns the same { data, error } shape the app already expects,
 * so no page code had to change.
 */

const localApiBase = typeof localStorage !== 'undefined' ? localStorage.getItem('tehzeeb_server_ip') : null;
const API_BASE = localApiBase || (typeof window !== 'undefined' && window.__POS_API_BASE__) || `http://${window.location.hostname || '127.0.0.1'}:8000`;

const TOKEN_KEY = 'tehzeeb_auth_token';
const SESSION_KEY = 'tehzeeb_auth_session';

function getToken() {
  try { return localStorage.getItem(TOKEN_KEY) || ''; } catch { return ''; }
}
function setSession(session) {
  try {
    if (session) {
      localStorage.setItem(TOKEN_KEY, session.access_token || '');
      localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    } else {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(SESSION_KEY);
    }
  } catch { /* ignore */ }
}
function cachedSession() {
  try { return JSON.parse(localStorage.getItem(SESSION_KEY)) || null; } catch { return null; }
}

async function api(path, body) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${getToken()}`,
    },
    body: JSON.stringify(body || {}),
  });
  if (!res.ok) {
    return { data: null, error: { message: `HTTP ${res.status}` } };
  }
  return res.json();
}

// ---------------------------------------------------------------- query builder
class QueryBuilder {
  constructor(table) {
    this.table = table === 'profiles' ? 'users' : table;
    this._filters = [];
    this._embed = [];
    this._order = null;
    this._limit = null;
    this._single = false;
    this._action = 'select';
    this._payload = null;
    this._selectCols = '*';
  }

  select(cols = '*') {
    this._selectCols = cols || '*';
    // detect embedded relations like "*, sale_items(*)" or "*, sale_items(*, inventory(name))"
    const matches = String(cols).match(/([a-z_]+)\s*\(/gi) || [];
    matches.forEach((m) => {
      const name = m.replace('(', '').trim();
      if (name && name !== this.table) this._embed.push(name);
    });
    if (this._action !== 'select') {
      // insert/update/delete followed by .select() -> just return affected rows
      this._returnRows = true;
    } else {
      this._action = 'select';
    }
    return this;
  }

  insert(rows) {
    this._action = 'insert';
    this._payload = Array.isArray(rows) ? rows : [rows];
    return this;
  }
  upsert(rows) {
    // simple upsert = insert (tables use serial ids; app rarely relies on conflict)
    return this.insert(rows);
  }
  update(data) {
    this._action = 'update';
    this._payload = data;
    return this;
  }
  delete() {
    this._action = 'delete';
    return this;
  }

  eq(col, value) { this._filters.push({ col, op: 'eq', value }); return this; }
  neq(col, value) { this._filters.push({ col, op: 'neq', value }); return this; }
  gt(col, value) { this._filters.push({ col, op: 'gt', value }); return this; }
  gte(col, value) { this._filters.push({ col, op: 'gte', value }); return this; }
  lt(col, value) { this._filters.push({ col, op: 'lt', value }); return this; }
  lte(col, value) { this._filters.push({ col, op: 'lte', value }); return this; }
  like(col, value) { this._filters.push({ col, op: 'like', value }); return this; }
  ilike(col, value) { this._filters.push({ col, op: 'ilike', value }); return this; }
  in(col, values) { this._filters.push({ col, op: 'in', value: values }); return this; }

  // database: .is('deleted_at', null)  and  .not('deleted_at','is',null)
  is(col, value) { this._filters.push({ col, op: 'is', value }); return this; }
  not(col, op, value) {
    if (op === 'is') this._filters.push({ col, op: 'not_is', value });
    else this._filters.push({ col, op: 'neq', value });
    return this;
  }

  order(col, opts = {}) {
    this._order = { col, asc: opts.ascending !== false };
    return this;
  }
  limit(n) { this._limit = n; return this; }
  single() { this._single = true; return this; }
  maybeSingle() { this._single = true; return this; }

  // thenable: allows `await db.from(...).select()...`
  then(resolve, reject) {
    return this._run().then(resolve, reject);
  }

  async _run() {
    try {
      let res;
      if (this._action === 'select') {
        return await api(`/db/${this.table}/select`, {
          filters: this._filters,
          embed: this._embed,
          order: this._order,
          limit: this._limit,
          single: this._single,
        });
      } else if (this._action === 'insert') {
        res = await api(`/db/${this.table}/insert`, { rows: this._payload });
      } else if (this._action === 'update') {
        res = await api(`/db/${this.table}/update`, {
          data: this._payload,
          filters: this._filters,
        });
      } else if (this._action === 'delete') {
        res = await api(`/db/${this.table}/delete`, { filters: this._filters });
      } else {
        return { data: null, error: { message: 'unknown action' } };
      }
      
      // Unwrap array if .single() was called (Database compat)
      if (this._single && res.data && Array.isArray(res.data)) {
        res.data = res.data[0] || null;
      }
      return res;
    } catch (e) {
      return { data: null, error: { message: String(e) } };
    }
  }
}

// ---------------------------------------------------------------- auth
const authApi = {
  async signInWithPassword({ email, password }) {
    const r = await api('/auth/signin', { email, password });
    if (r?.data?.session) setSession(r.data.session);
    _emit(r?.data?.session ? 'SIGNED_IN' : 'SIGNED_OUT', r?.data?.session || null);
    return r;
  },
  async signUp({ email, password, options }) {
    const name = options?.data?.name || '';
    const role = options?.data?.role || 'cashier';
    return api('/auth/signup', { email, password, name, role });
  },
  // Admin: set/reset another user's password directly (offline, no email link)
  async adminSetPassword(email, password) {
    return api('/auth/reset-password', { email, password });
  },
  async signInWithOAuth() {
    // No cloud OAuth offline. Surface a clear message.
    return { data: null, error: { message: 'Online sign-in is disabled in offline mode. Use email & password.' } };
  },
  async getSession() {
    const cached = cachedSession();
    if (!cached) return { data: { session: null }, error: null };
    const r = await api('/auth/session', {});
    const session = r?.data?.session || null;
    if (!session) setSession(null);
    return { data: { session }, error: null };
  },
  async getUser() {
    const s = cachedSession();
    return { data: { user: s?.user || null }, error: null };
  },
  async updateUser({ password }) {
    return api('/auth/update-password', { password });
  },
  async resetPasswordForEmail(email) {
    return api('/auth/reset-password', { email });
  },
  async signOut() {
    setSession(null);
    _emit('SIGNED_OUT', null);
    return { error: null };
  },
  onAuthStateChange(cb) {
    _authListeners.push(cb);
    // fire once with current state (async, like database)
    setTimeout(() => cb('INITIAL_SESSION', cachedSession()), 0);
    return {
      data: {
        subscription: {
          unsubscribe() {
            const i = _authListeners.indexOf(cb);
            if (i >= 0) _authListeners.splice(i, 1);
          },
        },
      },
    };
  },
};

const _authListeners = [];
function _emit(event, session) {
  _authListeners.forEach((cb) => { try { cb(event, session); } catch {} });
}

// ---------------------------------------------------------------- realtime (polling)
class Channel {
  constructor(name) {
    this.name = name;
    this._handlers = [];
    this._timer = null;
  }
  on(_type, _filter, handler) {
    this._handlers.push(handler);
    return this;
  }
  subscribe(cb) {
    // Local offline app: no background polling. Data changes are made by this
    // same app and reflected immediately, so a 4s full-refetch loop only wastes
    // CPU/RAM (re-loading thousands of products + sales). Disabled for speed.
    if (cb) cb('SUBSCRIBED');
    return this;
  }
  unsubscribe() {
    if (this._timer) clearInterval(this._timer);
    this._timer = null;
  }
}

// ---------------------------------------------------------------- client
export const db = {
  from(table) { return new QueryBuilder(table); },
  auth: authApi,
  channel(name) { return new Channel(name); },
  removeChannel(ch) { if (ch && ch.unsubscribe) ch.unsubscribe(); },
};

export default db;
