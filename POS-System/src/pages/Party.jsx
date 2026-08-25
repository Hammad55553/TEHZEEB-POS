import React, { useState, useEffect, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { db } from '../database';
import toast from 'react-hot-toast';
import { Users, UserPlus, Search, Phone, Wallet, CheckCircle, Clock, Trash2, X, Calculator, FileText, Plus, TrendingUp, Calendar, DollarSign, ClipboardList, Handshake } from 'lucide-react';

// ---- Theme ----
const C = {
  primary: '#F7941D',
  hover: '#D2691E',
  maroon: '#7A1E0C',
  maroon2: '#8B2500',
  gold: '#FFB84D',
  gold2: '#F9C50D',
  cream: '#FFF7E6',
  cream2: '#FDF3D0',
  red: '#E63329',
  border: '#e2e8f0',
  border2: '#eef1f5',
  text: '#1e293b',
  muted: '#64748b',
};
const GRAD = 'linear-gradient(135deg,#F7941D,#D2691E)';

const money = (x) => 'Rs ' + (Number(x) || 0).toLocaleString();

const isMobile = () => (typeof window !== 'undefined' ? window.innerWidth <= 768 : false);

const todayStr = () => new Date().toISOString().slice(0, 10);

// ---- Reusable UI ----
const cardStyle = {
  background: '#fff',
  borderRadius: 13,
  border: `1px solid ${C.border2}`,
  boxShadow: '0 1px 3px rgba(15,23,42,0.06)',
  padding: 16,
};

const labelStyle = {
  fontSize: 11,
  textTransform: 'uppercase',
  color: C.muted,
  letterSpacing: '0.06em',
  fontWeight: 700,
  marginBottom: 4,
};

const inputStyle = {
  width: '100%',
  padding: '11px',
  border: `1.5px solid ${C.border}`,
  borderRadius: 9,
  fontSize: 14,
  outline: 'none',
  boxSizing: 'border-box',
  color: C.text,
  background: '#fff',
};

function Field({ label, children }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={labelStyle}>{label}</div>
      {children}
    </div>
  );
}

function SaveBtn({ children, onClick, disabled }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        background: GRAD,
        color: '#fff',
        border: 'none',
        borderRadius: 9,
        padding: '11px 20px',
        fontSize: 14,
        fontWeight: 700,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.6 : 1,
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
      }}
    >
      {children}
    </button>
  );
}

function CancelBtn({ onClick, children }) {
  return (
    <button
      onClick={onClick}
      style={{
        background: '#fff',
        color: C.muted,
        border: `1.5px solid ${C.border}`,
        borderRadius: 9,
        padding: '11px 20px',
        fontSize: 14,
        fontWeight: 700,
        cursor: 'pointer',
      }}
    >
      {children || 'Cancel'}
    </button>
  );
}

function Modal({ title, icon, onClose, children }) {
  const mob = isMobile();
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(15,23,42,0.7)',
        backdropFilter: 'blur(4px)',
        WebkitBackdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: mob ? 'flex-start' : 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: mob ? '10px' : '20px',
        overflowY: 'auto',
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#fff',
          borderRadius: 14,
          width: '100%',
          maxWidth: 520,
          overflow: 'hidden',
          boxShadow: '0 20px 60px rgba(15,23,42,0.3)',
          margin: mob ? '10px 0' : 0,
        }}
      >
        <div
          style={{
            background: GRAD,
            color: '#fff',
            padding: '16px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 17, fontWeight: 800 }}>
            {icon}
            {title}
          </div>
          <button
            onClick={onClose}
            style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: '#fff', borderRadius: 8, width: 32, height: 32, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <X size={18} />
          </button>
        </div>
        <div style={{ padding: 20 }}>{children}</div>
      </div>
    </div>
  );
}

function StatCard({ label, value, icon, accent }) {
  return (
    <div style={{ ...cardStyle, flex: '1 1 160px', minWidth: 150 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={labelStyle}>{label}</div>
        <div style={{ color: accent || C.primary }}>{icon}</div>
      </div>
      <div style={{ fontSize: 24, fontWeight: 800, color: C.text, marginTop: 6 }}>{value}</div>
    </div>
  );
}

function Loading() {
  return (
    <div style={{ padding: 40, textAlign: 'center', color: C.muted, fontSize: 14 }}>
      Loading...
    </div>
  );
}

function Empty({ text }) {
  return (
    <div style={{ padding: 40, textAlign: 'center', color: C.muted, fontSize: 14 }}>
      {text}
    </div>
  );
}

// ========================= MAIN =========================
function Party() {
  // useSelector guarded so it never throws if store slice is absent
  const user = useSelector((s) => (s && s.auth ? s.auth.user : null));
  const cashierName = (user && (user.name || user.email)) || 'Cashier';

  const [tab, setTab] = useState('parties');

  const tabs = [
    { key: 'parties', label: 'Parties', icon: <Users size={16} /> },
    { key: 'tasks', label: 'Tasks', icon: <ClipboardList size={16} /> },
    { key: 'promises', label: 'Promises', icon: <Handshake size={16} /> },
    { key: 'calc', label: 'Cash Calculator', icon: <Calculator size={16} /> },
    { key: 'cash', label: 'Cash Details', icon: <Wallet size={16} /> },
    { key: 'salary', label: 'Salary', icon: <FileText size={16} /> },
  ];

  const mob = isMobile();

  return (
    <div style={{ height: '100%', overflowY: 'auto', padding: mob ? '10px' : '20px', background: C.cream, boxSizing: 'border-box' }}>
      {/* Header */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: mob ? 20 : 26, fontWeight: 900, color: C.maroon }}>Tehzeeb Sweets &amp; Super Store</div>
        <div style={{ fontSize: 13, color: C.muted, fontWeight: 600 }}>Parties, Tasks, Promises &amp; Cash Management</div>
      </div>

      {/* Tab bar */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 18 }}>
        {tabs.map((t) => {
          const active = tab === t.key;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '9px 15px',
                borderRadius: 999,
                border: active ? 'none' : `1.5px solid ${C.border}`,
                background: active ? GRAD : '#fff',
                color: active ? '#fff' : C.muted,
                fontWeight: 700,
                fontSize: 13,
                cursor: 'pointer',
                boxShadow: active ? '0 4px 12px rgba(247,148,29,0.35)' : 'none',
              }}
            >
              {t.icon}
              {t.label}
            </button>
          );
        })}
      </div>

      {tab === 'parties' && <PartiesTab mob={mob} />}
      {tab === 'tasks' && <TasksTab mob={mob} />}
      {tab === 'promises' && <PromisesTab mob={mob} />}
      {tab === 'calc' && <CashCalculatorTab mob={mob} />}
      {tab === 'cash' && <CashDetailsTab mob={mob} />}
      {tab === 'salary' && <SalaryTab mob={mob} />}
    </div>
  );
}

// ========================= PARTIES =========================
function PartiesTab({ mob }) {
  const [parties, setParties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [detail, setDetail] = useState(null);
  const [form, setForm] = useState({ name: '', phone: '', address: '', balance: '' });
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const { data, error } = await db
        .from('customers')
        .select()
        .is('deleted_at', null)
        .order('id', { ascending: false });
      if (error) throw error;
      setParties(Array.isArray(data) ? data : []);
    } catch (e) {
      toast.error('Failed to load parties');
      setParties([]);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const q = (search || '').toLowerCase().trim();
    if (!q) return parties;
    return parties.filter((p) => {
      const n = (p.name || '').toLowerCase();
      const ph = (p.phone || '').toLowerCase();
      return n.includes(q) || ph.includes(q);
    });
  }, [parties, search]);

  const create = async () => {
    if (!form.name.trim()) {
      toast.error('Name is required');
      return;
    }
    setSaving(true);
    try {
      const opening = Number(form.balance) || 0;
      const history = opening
        ? [{ date: todayStr(), amount: opening, type: opening < 0 ? 'debit' : 'credit', note: 'Opening balance' }]
        : [];
      const { error } = await db.from('customers').insert([
        {
          name: form.name.trim(),
          phone: form.phone.trim(),
          address: form.address.trim(),
          balance: opening,
          history,
        },
      ]);
      if (error) throw error;
      toast.success('Party created');
      setShowNew(false);
      setForm({ name: '', phone: '', address: '', balance: '' });
      load();
    } catch (e) {
      toast.error('Failed to create party');
    }
    setSaving(false);
  };

  const remove = async (p) => {
    if (!p || !p.id) return;
    if (!window.confirm(`Delete party "${p.name || ''}"?`)) return;
    try {
      const { error } = await db.from('customers').update({ deleted_at: new Date().toISOString() }).eq('id', p.id);
      if (error) throw error;
      toast.success('Party deleted');
      setDetail(null);
      load();
    } catch (e) {
      toast.error('Failed to delete party');
    }
  };

  return (
    <div>
      {/* Controls */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: '1 1 240px' }}>
          <Search size={16} style={{ position: 'absolute', left: 12, top: 13, color: C.muted }} />
          <input
            placeholder="Search by name or phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ ...inputStyle, paddingLeft: 36 }}
          />
        </div>
        <SaveBtn onClick={() => setShowNew(true)}>
          <UserPlus size={16} /> New Party
        </SaveBtn>
      </div>

      {loading ? (
        <Loading />
      ) : filtered.length === 0 ? (
        <Empty text="No parties found." />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: mob ? '1fr' : 'repeat(auto-fill,minmax(280px,1fr))', gap: 12 }}>
          {filtered.map((p) => {
            const bal = Number(p.balance) || 0;
            return (
              <div
                key={p.id}
                onClick={() => setDetail(p)}
                style={{ ...cardStyle, cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 6 }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ fontWeight: 800, color: C.text, fontSize: 16 }}>{p.name || 'Unnamed'}</div>
                  <div style={{ color: C.primary }}><Users size={18} /></div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, color: C.muted, fontSize: 13 }}>
                  <Phone size={13} /> {p.phone || '—'}
                </div>
                <div style={{ marginTop: 4 }}>
                  <div style={labelStyle}>Balance</div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: bal < 0 ? C.red : C.text }}>{money(bal)}</div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* New Party Modal */}
      {showNew && (
        <Modal title="New Party" icon={<UserPlus size={18} />} onClose={() => setShowNew(false)}>
          <Field label="Name *">
            <input style={inputStyle} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </Field>
          <Field label="Phone">
            <input style={inputStyle} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </Field>
          <Field label="Address">
            <input style={inputStyle} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
          </Field>
          <Field label="Opening Balance">
            <input type="number" style={inputStyle} value={form.balance} onChange={(e) => setForm({ ...form, balance: e.target.value })} />
          </Field>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
            <CancelBtn onClick={() => setShowNew(false)} />
            <SaveBtn onClick={create} disabled={saving}>
              <Plus size={16} /> {saving ? 'Saving...' : 'Save'}
            </SaveBtn>
          </div>
        </Modal>
      )}

      {/* Detail Modal */}
      {detail && (
        <Modal title={detail.name || 'Party'} icon={<Users size={18} />} onClose={() => setDetail(null)}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
              <div>
                <div style={labelStyle}>Phone</div>
                <div style={{ fontWeight: 700, color: C.text }}>{detail.phone || '—'}</div>
              </div>
              <div>
                <div style={labelStyle}>Address</div>
                <div style={{ fontWeight: 700, color: C.text }}>{detail.address || '—'}</div>
              </div>
            </div>
            <div style={{ background: C.cream2, borderRadius: 10, padding: 14 }}>
              <div style={labelStyle}>Current Balance</div>
              <div style={{ fontSize: 30, fontWeight: 900, color: (Number(detail.balance) || 0) < 0 ? C.red : C.maroon }}>
                {money(detail.balance)}
              </div>
            </div>
            <div>
              <div style={{ ...labelStyle, marginBottom: 8 }}>Transaction History</div>
              {Array.isArray(detail.history) && detail.history.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 240, overflowY: 'auto' }}>
                  {detail.history.map((h, i) => (
                    <div
                      key={i}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '8px 10px',
                        border: `1px solid ${C.border2}`,
                        borderRadius: 8,
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 700, color: C.text, fontSize: 13 }}>{(h && h.note) || '—'}</div>
                        <div style={{ fontSize: 11, color: C.muted }}>{(h && h.date) || ''}</div>
                      </div>
                      <div style={{ fontWeight: 800, color: h && h.type === 'debit' ? C.red : '#16a34a' }}>
                        {h && h.type === 'debit' ? '-' : '+'}
                        {money(h && h.amount)}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ color: C.muted, fontSize: 13 }}>No transactions yet.</div>
              )}
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 6 }}>
              <button
                onClick={() => remove(detail)}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#fff', color: C.red, border: `1.5px solid ${C.red}`, borderRadius: 9, padding: '9px 16px', fontWeight: 700, cursor: 'pointer' }}
              >
                <Trash2 size={16} /> Delete Party
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ========================= TASKS =========================
function TasksTab({ mob }) {
  const [tasks, setTasks] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ title: '', party_id: '', due_date: '', note: '' });

  const load = async () => {
    setLoading(true);
    try {
      const { data, error } = await db.from('tasks').select().is('deleted_at', null).order('id', { ascending: false });
      if (error) throw error;
      setTasks(Array.isArray(data) ? data : []);
      const { data: cdata } = await db.from('customers').select().is('deleted_at', null).order('id', { ascending: false });
      setCustomers(Array.isArray(cdata) ? cdata : []);
    } catch (e) {
      toast.error('Failed to load tasks');
      setTasks([]);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const create = async () => {
    if (!form.title.trim()) {
      toast.error('Title is required');
      return;
    }
    setSaving(true);
    try {
      const party = customers.find((c) => String(c.id) === String(form.party_id));
      const { error } = await db.from('tasks').insert([
        {
          title: form.title.trim(),
          party_id: form.party_id ? Number(form.party_id) : null,
          party_name: party ? party.name : null,
          due_date: form.due_date || null,
          status: 'pending',
          note: form.note.trim(),
        },
      ]);
      if (error) throw error;
      toast.success('Task created');
      setShowNew(false);
      setForm({ title: '', party_id: '', due_date: '', note: '' });
      load();
    } catch (e) {
      toast.error('Failed to create task');
    }
    setSaving(false);
  };

  const markDone = async (t) => {
    try {
      const { error } = await db.from('tasks').update({ status: 'done' }).eq('id', t.id);
      if (error) throw error;
      toast.success('Task completed');
      load();
    } catch (e) {
      toast.error('Failed to update task');
    }
  };

  const remove = async (t) => {
    if (!window.confirm('Delete this task?')) return;
    try {
      const { error } = await db.from('tasks').update({ deleted_at: new Date().toISOString() }).eq('id', t.id);
      if (error) throw error;
      toast.success('Task deleted');
      load();
    } catch (e) {
      toast.error('Failed to delete task');
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
        <SaveBtn onClick={() => setShowNew(true)}>
          <Plus size={16} /> New Task
        </SaveBtn>
      </div>

      {loading ? (
        <Loading />
      ) : tasks.length === 0 ? (
        <Empty text="No tasks yet." />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {tasks.map((t) => {
            const pending = t.status !== 'done';
            return (
              <div
                key={t.id}
                style={{
                  ...cardStyle,
                  borderLeft: `4px solid ${pending ? C.primary : '#16a34a'}`,
                  background: pending ? C.cream : '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 12,
                  flexWrap: 'wrap',
                }}
              >
                <div style={{ flex: '1 1 200px' }}>
                  <div style={{ fontWeight: 800, color: C.text, fontSize: 15 }}>{t.title || '—'}</div>
                  <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 4, fontSize: 12, color: C.muted }}>
                    {t.party_name && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><Users size={12} /> {t.party_name}</span>}
                    {t.due_date && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><Calendar size={12} /> {t.due_date}</span>}
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: pending ? C.primary : '#16a34a', fontWeight: 700 }}>
                      {pending ? <Clock size={12} /> : <CheckCircle size={12} />} {pending ? 'Pending' : 'Done'}
                    </span>
                  </div>
                  {t.note && <div style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>{t.note}</div>}
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  {pending && (
                    <button
                      onClick={() => markDone(t)}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: '#16a34a', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 12px', fontWeight: 700, cursor: 'pointer', fontSize: 13 }}
                    >
                      <CheckCircle size={15} /> Done
                    </button>
                  )}
                  <button
                    onClick={() => remove(t)}
                    style={{ display: 'inline-flex', alignItems: 'center', background: '#fff', color: C.red, border: `1.5px solid ${C.red}`, borderRadius: 8, padding: '8px 10px', cursor: 'pointer' }}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showNew && (
        <Modal title="New Task" icon={<ClipboardList size={18} />} onClose={() => setShowNew(false)}>
          <Field label="Title *">
            <input style={inputStyle} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          </Field>
          <Field label="Party (optional)">
            <select style={inputStyle} value={form.party_id} onChange={(e) => setForm({ ...form, party_id: e.target.value })}>
              <option value="">— None —</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </Field>
          <Field label="Due Date">
            <input type="date" style={inputStyle} value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} />
          </Field>
          <Field label="Note">
            <textarea style={{ ...inputStyle, minHeight: 70, resize: 'vertical' }} value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
          </Field>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
            <CancelBtn onClick={() => setShowNew(false)} />
            <SaveBtn onClick={create} disabled={saving}>
              <Plus size={16} /> {saving ? 'Saving...' : 'Save'}
            </SaveBtn>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ========================= PROMISES =========================
function PromisesTab({ mob }) {
  const [promises, setPromises] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ party_id: '', amount: '', promise_date: '', note: '' });

  const load = async () => {
    setLoading(true);
    try {
      const { data, error } = await db.from('promises').select().is('deleted_at', null).order('id', { ascending: false });
      if (error) throw error;
      setPromises(Array.isArray(data) ? data : []);
      const { data: cdata } = await db.from('customers').select().is('deleted_at', null).order('id', { ascending: false });
      setCustomers(Array.isArray(cdata) ? cdata : []);
    } catch (e) {
      toast.error('Failed to load promises');
      setPromises([]);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const create = async () => {
    if (!form.party_id) {
      toast.error('Party is required');
      return;
    }
    if (!form.amount || Number(form.amount) <= 0) {
      toast.error('Valid amount is required');
      return;
    }
    if (!form.promise_date) {
      toast.error('Promise date is required');
      return;
    }
    setSaving(true);
    try {
      const party = customers.find((c) => String(c.id) === String(form.party_id));
      const { error } = await db.from('promises').insert([
        {
          party_id: Number(form.party_id),
          party_name: party ? party.name : null,
          amount: Number(form.amount) || 0,
          promise_date: form.promise_date,
          status: 'pending',
          note: form.note.trim(),
        },
      ]);
      if (error) throw error;
      toast.success('Promise added');
      setShowNew(false);
      setForm({ party_id: '', amount: '', promise_date: '', note: '' });
      load();
    } catch (e) {
      toast.error('Failed to add promise');
    }
    setSaving(false);
  };

  const fulfill = async (p) => {
    try {
      const { error } = await db.from('promises').update({ status: 'fulfilled' }).eq('id', p.id);
      if (error) throw error;
      toast.success('Promise fulfilled');
      load();
    } catch (e) {
      toast.error('Failed to update promise');
    }
  };

  const remove = async (p) => {
    if (!window.confirm('Delete this promise?')) return;
    try {
      const { error } = await db.from('promises').update({ deleted_at: new Date().toISOString() }).eq('id', p.id);
      if (error) throw error;
      toast.success('Promise deleted');
      load();
    } catch (e) {
      toast.error('Failed to delete promise');
    }
  };

  const today = todayStr();

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
        <SaveBtn onClick={() => setShowNew(true)}>
          <Plus size={16} /> New Promise
        </SaveBtn>
      </div>

      {loading ? (
        <Loading />
      ) : promises.length === 0 ? (
        <Empty text="No promises yet." />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: mob ? '1fr' : 'repeat(auto-fill,minmax(280px,1fr))', gap: 12 }}>
          {promises.map((p) => {
            const pending = p.status !== 'fulfilled';
            const overdue = pending && p.promise_date && p.promise_date < today;
            return (
              <div
                key={p.id}
                style={{
                  ...cardStyle,
                  borderLeft: `4px solid ${overdue ? C.red : pending ? C.gold2 : '#16a34a'}`,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ fontWeight: 800, color: C.text, fontSize: 15 }}>{p.party_name || 'Party'}</div>
                  <Handshake size={18} style={{ color: C.primary }} />
                </div>
                <div style={{ fontSize: 22, fontWeight: 900, color: C.maroon, margin: '6px 0' }}>{money(p.amount)}</div>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', fontSize: 12, color: C.muted }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    <Calendar size={12} /> {p.promise_date || '—'}
                  </span>
                  <span style={{ fontWeight: 700, color: overdue ? C.red : pending ? C.primary : '#16a34a' }}>
                    {overdue ? 'Overdue' : pending ? 'Pending' : 'Fulfilled'}
                  </span>
                </div>
                {p.note && <div style={{ fontSize: 12, color: C.muted, marginTop: 6 }}>{p.note}</div>}
                <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                  {pending && (
                    <button
                      onClick={() => fulfill(p)}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: '#16a34a', color: '#fff', border: 'none', borderRadius: 8, padding: '7px 12px', fontWeight: 700, cursor: 'pointer', fontSize: 13 }}
                    >
                      <CheckCircle size={15} /> Fulfilled
                    </button>
                  )}
                  <button
                    onClick={() => remove(p)}
                    style={{ display: 'inline-flex', alignItems: 'center', background: '#fff', color: C.red, border: `1.5px solid ${C.red}`, borderRadius: 8, padding: '7px 10px', cursor: 'pointer' }}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showNew && (
        <Modal title="New Promise" icon={<Handshake size={18} />} onClose={() => setShowNew(false)}>
          <Field label="Party *">
            <select style={inputStyle} value={form.party_id} onChange={(e) => setForm({ ...form, party_id: e.target.value })}>
              <option value="">— Select party —</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </Field>
          <Field label="Amount *">
            <input type="number" style={inputStyle} value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
          </Field>
          <Field label="Promise Date *">
            <input type="date" style={inputStyle} value={form.promise_date} onChange={(e) => setForm({ ...form, promise_date: e.target.value })} />
          </Field>
          <Field label="Note">
            <textarea style={{ ...inputStyle, minHeight: 70, resize: 'vertical' }} value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
          </Field>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
            <CancelBtn onClick={() => setShowNew(false)} />
            <SaveBtn onClick={create} disabled={saving}>
              <Plus size={16} /> {saving ? 'Saving...' : 'Save'}
            </SaveBtn>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ========================= CASH CALCULATOR =========================
const DENOMS = [5000, 1000, 500, 100, 50, 20, 10, 5, 2, 1];

function CashCalculatorTab({ mob }) {
  const [counts, setCounts] = useState({});

  const setCount = (d, v) => {
    const n = v === '' ? '' : Math.max(0, parseInt(v, 10) || 0);
    setCounts({ ...counts, [d]: n });
  };

  const total = useMemo(() => {
    return DENOMS.reduce((sum, d) => sum + d * (Number(counts[d]) || 0), 0);
  }, [counts]);

  const reset = () => setCounts({});

  return (
    <div style={{ maxWidth: 640 }}>
      <div style={{ ...cardStyle, padding: 0, overflow: 'hidden' }}>
        <div style={{ background: GRAD, color: '#fff', padding: '14px 18px', fontWeight: 800, fontSize: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Calculator size={18} /> Cash Drawer Counter
        </div>
        <div style={{ padding: 14 }}>
          <div style={{ display: 'flex', fontSize: 11, textTransform: 'uppercase', color: C.muted, fontWeight: 700, letterSpacing: '0.05em', padding: '4px 8px' }}>
            <div style={{ flex: 1 }}>Denomination</div>
            <div style={{ width: mob ? 90 : 110, textAlign: 'center' }}>Count</div>
            <div style={{ width: mob ? 100 : 140, textAlign: 'right' }}>Line Total</div>
          </div>
          {DENOMS.map((d) => (
            <div key={d} style={{ display: 'flex', alignItems: 'center', padding: '6px 8px', borderTop: `1px solid ${C.border2}` }}>
              <div style={{ flex: 1, fontWeight: 800, color: C.text }}>Rs {d.toLocaleString()}</div>
              <div style={{ width: mob ? 90 : 110, textAlign: 'center' }}>
                <input
                  type="number"
                  min="0"
                  value={counts[d] === undefined ? '' : counts[d]}
                  onChange={(e) => setCount(d, e.target.value)}
                  style={{ ...inputStyle, width: mob ? 78 : 92, textAlign: 'center', padding: '8px' }}
                />
              </div>
              <div style={{ width: mob ? 100 : 140, textAlign: 'right', fontWeight: 700, color: C.maroon }}>
                {money(d * (Number(counts[d]) || 0))}
              </div>
            </div>
          ))}
        </div>
        <div style={{ background: C.cream2, padding: '16px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={labelStyle}>Grand Total</div>
            <div style={{ fontSize: 30, fontWeight: 900, color: C.maroon }}>{money(total)}</div>
          </div>
          <button
            onClick={reset}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#fff', color: C.red, border: `1.5px solid ${C.red}`, borderRadius: 9, padding: '10px 18px', fontWeight: 700, cursor: 'pointer' }}
          >
            <X size={16} /> Reset
          </button>
        </div>
      </div>
    </div>
  );
}

// ========================= CASH DETAILS =========================
function CashDetailsTab({ mob }) {
  const [loading, setLoading] = useState(true);
  const [sales, setSales] = useState([]);
  const [shift, setShift] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const { data: sdata } = await db.from('sales').select().order('id', { ascending: false });
      setSales(Array.isArray(sdata) ? sdata : []);
      const { data: shdata } = await db.from('shifts').select().order('id', { ascending: false });
      const list = Array.isArray(shdata) ? shdata : [];
      const open = list.find((s) => s && (s.status === 'open' || !s.closed_at));
      setShift(open || null);
    } catch (e) {
      toast.error('Failed to load cash details');
      setSales([]);
      setShift(null);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const today = todayStr();

  const todaySales = useMemo(() => {
    return sales.filter((s) => {
      const created = s && s.created_at ? String(s.created_at).slice(0, 10) : '';
      return created === today;
    });
  }, [sales, today]);

  const totalToday = useMemo(() => todaySales.reduce((sum, s) => sum + (Number(s.total) || 0), 0), [todaySales]);

  const byMethod = useMemo(() => {
    const map = {};
    todaySales.forEach((s) => {
      const m = (s && s.payment_method) || 'Unknown';
      map[m] = (map[m] || 0) + (Number(s.total) || 0);
    });
    return map;
  }, [todaySales]);

  if (loading) return <Loading />;

  return (
    <div>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
        <StatCard label="Today's Sales" value={money(totalToday)} icon={<TrendingUp size={18} />} />
        <StatCard label="Bills Today" value={(todaySales.length || 0).toLocaleString()} icon={<FileText size={18} />} accent={C.hover} />
        <StatCard
          label="Cash in Drawer"
          value={shift ? money(shift.opening_cash) : 'No open shift'}
          icon={<Wallet size={18} />}
          accent={C.maroon}
        />
      </div>

      <div style={{ ...cardStyle }}>
        <div style={{ ...labelStyle, marginBottom: 10 }}>Payment Method Breakdown (Today)</div>
        {Object.keys(byMethod).length === 0 ? (
          <div style={{ color: C.muted, fontSize: 13 }}>No sales recorded today.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {Object.keys(byMethod).map((m) => (
              <div key={m} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', background: C.cream, borderRadius: 9 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700, color: C.text, textTransform: 'capitalize' }}>
                  <DollarSign size={15} style={{ color: C.primary }} /> {m}
                </div>
                <div style={{ fontWeight: 800, color: C.maroon }}>{money(byMethod[m])}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {shift && (
        <div style={{ ...cardStyle, marginTop: 12 }}>
          <div style={{ ...labelStyle, marginBottom: 10 }}>Current Open Shift</div>
          <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', fontSize: 14 }}>
            <div>
              <div style={labelStyle}>Cashier</div>
              <div style={{ fontWeight: 700, color: C.text }}>{shift.cashier || '—'}</div>
            </div>
            <div>
              <div style={labelStyle}>Opening Cash</div>
              <div style={{ fontWeight: 700, color: C.text }}>{money(shift.opening_cash)}</div>
            </div>
            <div>
              <div style={labelStyle}>Opened At</div>
              <div style={{ fontWeight: 700, color: C.text }}>{shift.opened_at ? String(shift.opened_at).slice(0, 16).replace('T', ' ') : '—'}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ========================= SALARY =========================
function SalaryTab({ mob }) {
  const [salaries, setSalaries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ employee_name: '', month: '', basic: '', bonus: '', deduction: '' });

  const load = async () => {
    setLoading(true);
    try {
      const { data, error } = await db.from('salaries').select().is('deleted_at', null).order('id', { ascending: false });
      if (error) throw error;
      setSalaries(Array.isArray(data) ? data : []);
    } catch (e) {
      toast.error('Failed to load salaries');
      setSalaries([]);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const net = (Number(form.basic) || 0) + (Number(form.bonus) || 0) - (Number(form.deduction) || 0);

  const create = async () => {
    if (!form.employee_name.trim()) {
      toast.error('Employee name is required');
      return;
    }
    if (!form.month.trim()) {
      toast.error('Month is required');
      return;
    }
    if (!form.basic || Number(form.basic) <= 0) {
      toast.error('Valid basic salary is required');
      return;
    }
    setSaving(true);
    try {
      const { error } = await db.from('salaries').insert([
        {
          employee_name: form.employee_name.trim(),
          month: form.month.trim(),
          basic: Number(form.basic) || 0,
          bonus: Number(form.bonus) || 0,
          deduction: Number(form.deduction) || 0,
          net,
          paid: false,
        },
      ]);
      if (error) throw error;
      toast.success('Salary sheet created');
      setShowNew(false);
      setForm({ employee_name: '', month: '', basic: '', bonus: '', deduction: '' });
      load();
    } catch (e) {
      toast.error('Failed to create salary sheet');
    }
    setSaving(false);
  };

  const markPaid = async (s) => {
    try {
      const { error } = await db.from('salaries').update({ paid: true }).eq('id', s.id);
      if (error) throw error;
      toast.success('Marked as paid');
      load();
    } catch (e) {
      toast.error('Failed to update');
    }
  };

  const remove = async (s) => {
    if (!window.confirm('Delete this salary sheet?')) return;
    try {
      const { error } = await db.from('salaries').update({ deleted_at: new Date().toISOString() }).eq('id', s.id);
      if (error) throw error;
      toast.success('Deleted');
      load();
    } catch (e) {
      toast.error('Failed to delete');
    }
  };

  const totalPayroll = useMemo(() => salaries.reduce((sum, s) => sum + (Number(s.net) || 0), 0), [salaries]);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, gap: 12, flexWrap: 'wrap' }}>
        <StatCard label="Total Payroll" value={money(totalPayroll)} icon={<DollarSign size={18} />} accent={C.maroon} />
        <SaveBtn onClick={() => setShowNew(true)}>
          <Plus size={16} /> New Salary Sheet
        </SaveBtn>
      </div>

      {loading ? (
        <Loading />
      ) : salaries.length === 0 ? (
        <Empty text="No salary sheets yet." />
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, minWidth: mob ? 0 : 600 }}>
            {salaries.map((s) => (
              <div key={s.id} style={{ ...cardStyle, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                <div style={{ flex: '1 1 160px' }}>
                  <div style={{ fontWeight: 800, color: C.text, fontSize: 15 }}>{s.employee_name || '—'}</div>
                  <div style={{ fontSize: 12, color: C.muted }}>{s.month || '—'}</div>
                </div>
                <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', fontSize: 13 }}>
                  <div><div style={labelStyle}>Basic</div><div style={{ fontWeight: 700 }}>{money(s.basic)}</div></div>
                  <div><div style={labelStyle}>Bonus</div><div style={{ fontWeight: 700, color: '#16a34a' }}>{money(s.bonus)}</div></div>
                  <div><div style={labelStyle}>Deduction</div><div style={{ fontWeight: 700, color: C.red }}>{money(s.deduction)}</div></div>
                  <div><div style={labelStyle}>Net</div><div style={{ fontWeight: 800, color: C.maroon }}>{money(s.net)}</div></div>
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <span style={{ fontSize: 12, fontWeight: 700, padding: '4px 10px', borderRadius: 999, background: s.paid ? '#dcfce7' : C.cream2, color: s.paid ? '#16a34a' : C.hover }}>
                    {s.paid ? 'Paid' : 'Unpaid'}
                  </span>
                  {!s.paid && (
                    <button
                      onClick={() => markPaid(s)}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: '#16a34a', color: '#fff', border: 'none', borderRadius: 8, padding: '7px 12px', fontWeight: 700, cursor: 'pointer', fontSize: 13 }}
                    >
                      <CheckCircle size={15} /> Pay
                    </button>
                  )}
                  <button
                    onClick={() => remove(s)}
                    style={{ display: 'inline-flex', alignItems: 'center', background: '#fff', color: C.red, border: `1.5px solid ${C.red}`, borderRadius: 8, padding: '7px 10px', cursor: 'pointer' }}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {showNew && (
        <Modal title="New Salary Sheet" icon={<FileText size={18} />} onClose={() => setShowNew(false)}>
          <Field label="Employee Name *">
            <input style={inputStyle} value={form.employee_name} onChange={(e) => setForm({ ...form, employee_name: e.target.value })} />
          </Field>
          <Field label="Month * (e.g. Aug 2026)">
            <input style={inputStyle} value={form.month} onChange={(e) => setForm({ ...form, month: e.target.value })} />
          </Field>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <div style={{ flex: '1 1 120px' }}>
              <Field label="Basic *">
                <input type="number" style={inputStyle} value={form.basic} onChange={(e) => setForm({ ...form, basic: e.target.value })} />
              </Field>
            </div>
            <div style={{ flex: '1 1 120px' }}>
              <Field label="Bonus">
                <input type="number" style={inputStyle} value={form.bonus} onChange={(e) => setForm({ ...form, bonus: e.target.value })} />
              </Field>
            </div>
            <div style={{ flex: '1 1 120px' }}>
              <Field label="Deduction">
                <input type="number" style={inputStyle} value={form.deduction} onChange={(e) => setForm({ ...form, deduction: e.target.value })} />
              </Field>
            </div>
          </div>
          <div style={{ background: C.cream2, borderRadius: 10, padding: 14, margin: '4px 0 12px' }}>
            <div style={labelStyle}>Net Salary</div>
            <div style={{ fontSize: 26, fontWeight: 900, color: C.maroon }}>{money(net)}</div>
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <CancelBtn onClick={() => setShowNew(false)} />
            <SaveBtn onClick={create} disabled={saving}>
              <Plus size={16} /> {saving ? 'Saving...' : 'Save'}
            </SaveBtn>
          </div>
        </Modal>
      )}
    </div>
  );
}

export default Party;
