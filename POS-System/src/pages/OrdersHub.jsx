import React, { useState, useEffect, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { db } from '../database';
import Pagination from '../components/Pagination';
import toast from 'react-hot-toast';
import { ClipboardList, ShoppingCart, RotateCcw, Truck, Package, Building2, Info, Search, X, Plus, Minus, Trash2, CheckCircle, Clock, RefreshCw } from 'lucide-react';

const C = {
  orange: '#F7941D',
  darkOrange: '#D2691E',
  maroon: '#7A1E0C',
  maroon2: '#8B2500',
  gold: '#FFB84D',
  gold2: '#F9C50D',
  cream: '#FFF7E6',
  cream2: '#FDF3D0',
  creamBorder: '#F6D9A8',
  red: '#E63329',
  border: '#e2e8f0',
  text: '#1e293b',
  muted: '#64748b',
};

const ORANGE_GRAD = 'linear-gradient(135deg,#F7941D,#D2691E)';

// Order type meta
const ORDER_TYPES = {
  sale_order: {
    key: 'sale_order',
    label: 'New Sale Order',
    menuLabel: 'New Sale Order',
    icon: ShoppingCart,
    party: 'customer',
    badge: '#F7941D',
    badgeText: 'Sale',
    help: 'A customer places an order for later (made/delivered afterwards). Stock is not reduced now — only the order is recorded. Example: 5kg barfi ordered for a wedding.',
  },
  sale_return_order: {
    key: 'sale_return_order',
    label: 'Sale Return Order',
    menuLabel: 'Sale Return Order',
    icon: RotateCcw,
    party: 'customer',
    badge: '#E63329',
    badgeText: 'Sale Return',
    help: 'A customer intends to return goods — only the return order is recorded now. Mark it completed once the actual return is done.',
  },
  purchase_order: {
    key: 'purchase_order',
    label: 'New Purchase Order',
    menuLabel: 'New Purchase Order',
    icon: Truck,
    party: 'supplier',
    badge: '#D2691E',
    badgeText: 'Purchase',
    help: 'We are ordering stock from a supplier. Only the order is placed now — mark completed and update stock when the goods arrive.',
  },
  purchase_return_order: {
    key: 'purchase_return_order',
    label: 'Purchase Return Order',
    menuLabel: 'Purchase Return Order',
    icon: RotateCcw,
    party: 'supplier',
    badge: '#8B2500',
    badgeText: 'Purchase Return',
    help: 'We intend to return stock to a supplier. Only the return order is recorded now. Mark completed once the return is done.',
  },
  vendor_purchase_order: {
    key: 'vendor_purchase_order',
    label: 'Vendor Purchase Order',
    menuLabel: 'Vendor Purchase Order',
    icon: Package,
    party: 'supplier',
    badge: '#FFB84D',
    badgeText: 'Vendor',
    help: 'An order from a small vendor. The order is recorded now — mark completed when the goods are received.',
  },
  company_purchase_order: {
    key: 'company_purchase_order',
    label: 'Company Purchase Order',
    menuLabel: 'Company Purchase Order',
    icon: Building2,
    party: 'supplier',
    badge: '#7A1E0C',
    badgeText: 'Company',
    help: 'A direct order from a company/factory (usually a large manufacturer order). Mark completed on delivery.',
  },
};

const FILTER_CHIPS = [
  { key: 'all', label: 'All' },
  { key: 'sale_order', label: 'Sale' },
  { key: 'sale_return_order', label: 'Sale Return' },
  { key: 'purchase_order', label: 'Purchase' },
  { key: 'purchase_return_order', label: 'Purchase Return' },
  { key: 'vendor_purchase_order', label: 'Vendor' },
  { key: 'company_purchase_order', label: 'Company' },
];

const MENU = [
  { key: 'all', label: 'All Orders', icon: ClipboardList },
  { key: 'sale_order', label: 'New Sale Order', icon: ShoppingCart },
  { key: 'sale_return_order', label: 'Sale Return Order', icon: RotateCcw },
  { key: 'purchase_order', label: 'New Purchase Order', icon: Truck },
  { key: 'purchase_return_order', label: 'Purchase Return Order', icon: RotateCcw },
  { key: 'vendor_purchase_order', label: 'Vendor Purchase Order', icon: Package },
  { key: 'company_purchase_order', label: 'Company Purchase Order', icon: Building2 },
];

function OrdersHub() {
  const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' ? window.innerWidth <= 900 : false);
  const [isSmall, setIsSmall] = useState(typeof window !== 'undefined' ? window.innerWidth <= 768 : false);
  const [active, setActive] = useState('all');

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);

  // Redux slices with local fallbacks
  const invRedux = useSelector(s => s.inventory?.items || []);
  const custRedux = useSelector(s => s.customers?.list || []);
  const suppRedux = useSelector(s => s.suppliers?.list || []);
  const ordersRedux = useSelector(s => s.orders?.list || []);
  const user = useSelector(s => s.auth?.user);

  const [invFetched, setInvFetched] = useState([]);
  const [custFetched, setCustFetched] = useState([]);
  const [suppFetched, setSuppFetched] = useState([]);

  const inventory = invRedux.length ? invRedux : invFetched;
  const customers = custRedux.length ? custRedux : custFetched;
  const suppliers = suppRedux.length ? suppRedux : suppFetched;

  useEffect(() => {
    const onResize = () => {
      setIsMobile(window.innerWidth <= 900);
      setIsSmall(window.innerWidth <= 768);
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const fetchOrders = async () => {
    // INSTANT: if orders are already in Redux, show them right away (no wait).
    if (ordersRedux && ordersRedux.length) {
      const active = ordersRedux.filter(o => !o.deleted_at);
      setOrders(active);
      setLoading(false);
    } else {
      setLoading(true);
    }
    // Then refresh from the DB in the background so the list stays current.
    try {
      const { data, error } = await db.from('orders').select('*').is('deleted_at', null).order('id', { ascending: false }).limit(2000);
      if (error) throw error;
      if (data) setOrders(data);
    } catch (e) {
      if (!(ordersRedux && ordersRedux.length)) toast.error('Could not load orders');
    } finally {
      setLoading(false);
    }
  };

  const fetchFallbacks = async () => {
    if (!invRedux.length) {
      try {
        const { data } = await db.from('inventory').select('id,name,price,unit,sell_type');
        if (data) setInvFetched(data);
      } catch (e) { /* ignore */ }
    }
    if (!custRedux.length) {
      try {
        const { data } = await db.from('customers').select('id,name');
        if (data) setCustFetched(data);
      } catch (e) { /* ignore */ }
    }
    if (!suppRedux.length) {
      try {
        const { data } = await db.from('suppliers').select('id,name,company');
        if (data) setSuppFetched(data);
      } catch (e) { /* ignore */ }
    }
  };

  useEffect(() => {
    fetchOrders();
    fetchFallbacks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div style={{ height: '100%', overflowY: 'auto', padding: isSmall ? '10px' : '20px', background: '#f8fafc', color: C.text, boxSizing: 'border-box' }}>
      {/* Header */}
      <div style={{ marginBottom: 16 }}>
        <div style={{
          background: ORANGE_GRAD, borderRadius: 14, padding: isSmall ? '16px' : '20px 24px',
          color: '#fff', boxShadow: '0 4px 14px rgba(210,105,30,0.28)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <ClipboardList size={28} />
            <div>
              <div style={{ fontSize: isSmall ? 20 : 24, fontWeight: 800, letterSpacing: 0.5 }}>ORDERS CENTER</div>
              <div style={{ fontSize: 12, opacity: 0.92 }}>Tehzeeb Sweets &amp; Super Store — Pending orders record &amp; management</div>
            </div>
          </div>
        </div>
      </div>

      {/* Layout */}
      <div style={{ display: 'flex', gap: 16, flexDirection: isMobile ? 'column' : 'row', alignItems: 'stretch' }}>
        {/* Menu */}
        {isMobile ? (
          <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 6 }}>
            {MENU.map(m => {
              const Ico = m.icon;
              const on = active === m.key;
              return (
                <button key={m.key} onClick={() => setActive(m.key)} style={{
                  flex: '0 0 auto', display: 'flex', alignItems: 'center', gap: 6,
                  padding: '9px 14px', borderRadius: 20, border: on ? 'none' : `1.5px solid ${C.border}`,
                  background: on ? ORANGE_GRAD : '#fff', color: on ? '#fff' : C.text,
                  fontWeight: 700, fontSize: 13, cursor: 'pointer', whiteSpace: 'nowrap',
                  boxShadow: on ? '0 2px 8px rgba(210,105,30,0.3)' : 'none'
                }}>
                  <Ico size={16} /> {m.label}
                </button>
              );
            })}
          </div>
        ) : (
          <div style={{ flex: '0 0 240px', background: '#fff', borderRadius: 14, border: `1px solid ${C.border}`, padding: 10, height: 'fit-content', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            {MENU.map(m => {
              const Ico = m.icon;
              const on = active === m.key;
              return (
                <button key={m.key} onClick={() => setActive(m.key)} style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                  padding: '12px 14px', borderRadius: 10, border: 'none', marginBottom: 4,
                  background: on ? ORANGE_GRAD : 'transparent', color: on ? '#fff' : C.text,
                  fontWeight: on ? 700 : 600, fontSize: 14, cursor: 'pointer', textAlign: 'left',
                  boxShadow: on ? '0 2px 8px rgba(210,105,30,0.3)' : 'none'
                }}>
                  <Ico size={18} /> {m.label}
                </button>
              );
            })}
          </div>
        )}

        {/* Content */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {active === 'all' ? (
            <AllOrders
              orders={orders} loading={loading} onRefresh={fetchOrders}
              isSmall={isSmall}
            />
          ) : (
            <OrderForm
              key={active}
              type={active}
              customers={customers} suppliers={suppliers} inventory={inventory}
              user={user} onSaved={fetchOrders} isSmall={isSmall}
            />
          )}
        </div>
      </div>
    </div>
  );
}

/* ---------- Info Button + Help Panel ---------- */
function InfoBox({ open, onToggle, children }) {
  return (
    <>
      <button onClick={onToggle} title="Info" style={{
        width: 34, height: 34, borderRadius: '50%', border: `1.5px solid ${C.creamBorder}`,
        background: open ? C.cream : '#fff', color: C.darkOrange, cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center', flex: '0 0 auto'
      }}>
        <Info size={18} />
      </button>
      {open && (
        <div style={{
          background: C.cream, border: `1.5px solid ${C.creamBorder}`, borderRadius: 12,
          padding: '12px 14px', marginTop: 12, color: C.maroon2, fontSize: 13.5, lineHeight: 1.6, width: '100%'
        }}>
          {children}
        </div>
      )}
    </>
  );
}

/* ---------- Searchable Picker ---------- */
function SearchPicker({ label, placeholder, options, value, onSelect, allowFreeText, renderOption }) {
  const [q, setQ] = useState(value || '');
  const [open, setOpen] = useState(false);

  useEffect(() => { setQ(value || ''); }, [value]);

  const filtered = useMemo(() => {
    const t = (q || '').toLowerCase();
    if (!t) return options.slice(0, 50);
    return options.filter(o => (o._searchText || '').toLowerCase().includes(t)).slice(0, 50);
  }, [q, options]);

  return (
    <div style={{ position: 'relative' }}>
      {label && <label style={labelStyle}>{label}</label>}
      <div style={{ position: 'relative' }}>
        <Search size={16} style={{ position: 'absolute', left: 11, top: 13, color: C.muted }} />
        <input
          value={q}
          placeholder={placeholder}
          onChange={e => {
            setQ(e.target.value);
            setOpen(true);
            if (allowFreeText) onSelect({ freeText: e.target.value });
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 180)}
          style={{ ...inputStyle, paddingLeft: 34 }}
        />
        {q && (
          <button onMouseDown={e => { e.preventDefault(); setQ(''); onSelect(null); }} style={{
            position: 'absolute', right: 8, top: 9, border: 'none', background: 'transparent', cursor: 'pointer', color: C.muted
          }}><X size={16} /></button>
        )}
      </div>
      {open && filtered.length > 0 && (
        <div style={{
          position: 'absolute', zIndex: 30, top: '100%', left: 0, right: 0, marginTop: 4,
          background: '#fff', border: `1.5px solid ${C.border}`, borderRadius: 9, maxHeight: 240,
          overflowY: 'auto', boxShadow: '0 6px 20px rgba(0,0,0,0.12)'
        }}>
          {filtered.map((o, i) => (
            <div key={o.id ?? i}
              onMouseDown={e => { e.preventDefault(); onSelect(o); setQ(o._display || ''); setOpen(false); }}
              style={{ padding: '10px 12px', cursor: 'pointer', fontSize: 14, borderBottom: `1px solid ${C.border}` }}
              onMouseEnter={e => e.currentTarget.style.background = C.cream}
              onMouseLeave={e => e.currentTarget.style.background = '#fff'}
            >
              {renderOption ? renderOption(o) : o._display}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ---------- Order Form ---------- */
function OrderForm({ type, customers, suppliers, inventory, user, onSaved, isSmall }) {
  const meta = ORDER_TYPES[type];
  const Ico = meta.icon;
  const usesCustomer = meta.party === 'customer';

  const [helpOpen, setHelpOpen] = useState(false);
  const [partyName, setPartyName] = useState('');
  const [partyId, setPartyId] = useState(null);
  const [lines, setLines] = useState([]);
  const [expectedDate, setExpectedDate] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  // line item builder
  const [selProd, setSelProd] = useState(null);
  const [qty, setQty] = useState(1);
  const [price, setPrice] = useState('');

  const partyOptions = useMemo(() => {
    const list = usesCustomer ? customers : suppliers;
    return (list || []).map(p => ({
      ...p,
      _display: usesCustomer ? p.name : (p.company ? `${p.name} (${p.company})` : p.name),
      _searchText: `${p.name || ''} ${p.company || ''}`,
    }));
  }, [usesCustomer, customers, suppliers]);

  const prodOptions = useMemo(() => {
    return (inventory || []).map(p => ({
      ...p,
      _display: p.name,
      _searchText: `${p.name || ''} ${p.unit || ''}`,
    }));
  }, [inventory]);

  const grandTotal = useMemo(() => lines.reduce((s, l) => s + (Number(l.qty) || 0) * (Number(l.price) || 0), 0), [lines]);

  const addLine = () => {
    if (!selProd && !price) { toast.error('Please select a product'); return; }
    const name = selProd ? selProd.name : '';
    if (!name) { toast.error('Please select a product'); return; }
    const q = Number(qty) || 0;
    const p = Number(price) || 0;
    if (q <= 0) { toast.error('Please enter a valid quantity'); return; }
    setLines(prev => [...prev, { name, qty: q, price: p }]);
    setSelProd(null); setQty(1); setPrice('');
  };

  const removeLine = (idx) => setLines(prev => prev.filter((_, i) => i !== idx));

  const resetForm = () => {
    setPartyName(''); setPartyId(null); setLines([]); setExpectedDate(''); setNotes('');
    setSelProd(null); setQty(1); setPrice('');
  };

  const save = async () => {
    if (!partyName.trim()) { toast.error(`${usesCustomer ? 'Customer' : 'Supplier'} ka naam zaroori hai`); return; }
    if (lines.length === 0) { toast.error('Add at least one item'); return; }
    setSaving(true);
    try {
      const row = {
        order_type: type,
        party_name: partyName.trim(),
        party_id: partyId,
        items: lines,
        total: grandTotal,
        status: 'pending',
        notes: notes || null,
        expected_date: expectedDate || null,
        done_by: user?.name || null,
      };
      const { error } = await db.from('orders').insert([row]);
      if (error) throw error;
      toast.success(`${meta.label} save ho gaya`);
      resetForm();
      onSaved();
    } catch (e) {
      toast.error('Could not save');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={cardStyle}>
      {/* header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: meta.badge, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
            <Ico size={22} />
          </div>
          <div>
            <div style={{ fontSize: 18, fontWeight: 800, color: C.maroon }}>{meta.label}</div>
            <div style={{ fontSize: 12, color: C.muted }}>{usesCustomer ? 'Customer order' : 'Supplier order'} — status pending</div>
          </div>
        </div>
        <InfoBox open={helpOpen} onToggle={() => setHelpOpen(v => !v)}>
          <b>{meta.label}:</b> {meta.help}
        </InfoBox>
      </div>

      <div style={{ height: 1, background: C.border, margin: '16px 0' }} />

      {/* Party */}
      <div style={{ marginBottom: 16 }}>
        <SearchPicker
          label={usesCustomer ? 'Customer' : 'Supplier / Party'}
          placeholder={usesCustomer ? 'Customer dhundein ya likhein...' : 'Supplier dhundein ya likhein...'}
          options={partyOptions}
          value={partyName}
          allowFreeText
          onSelect={(o) => {
            if (!o) { setPartyName(''); setPartyId(null); return; }
            if (o.freeText !== undefined) { setPartyName(o.freeText); setPartyId(null); return; }
            setPartyName(o.name || ''); setPartyId(o.id ?? null);
          }}
        />
      </div>

      {/* Line item builder */}
      <div style={{ background: C.cream2, border: `1.5px solid ${C.creamBorder}`, borderRadius: 12, padding: 14, marginBottom: 16 }}>
        <div style={{ ...labelStyle, marginBottom: 10 }}>Add Item</div>
        <div style={{ display: 'grid', gridTemplateColumns: isSmall ? '1fr' : '2fr 1fr 1fr auto', gap: 10, alignItems: 'end' }}>
          <SearchPicker
            placeholder="Product dhundein..."
            options={prodOptions}
            value={selProd?.name || ''}
            onSelect={(o) => {
              if (!o) { setSelProd(null); return; }
              setSelProd(o);
              setPrice(String(o.price ?? ''));
            }}
            renderOption={(o) => (
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                <span>{o.name}</span>
                <span style={{ color: C.muted, fontSize: 12 }}>Rs {(o.price || 0).toLocaleString()}{o.unit ? `/${o.unit}` : ''}</span>
              </div>
            )}
          />
          <div>
            <label style={labelStyle}>Qty</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <button onClick={() => setQty(q => Math.max(1, (Number(q) || 1) - 1))} style={stepBtn}><Minus size={14} /></button>
              <input type="number" value={qty} onChange={e => setQty(e.target.value)} style={{ ...inputStyle, textAlign: 'center', padding: '9px 4px' }} />
              <button onClick={() => setQty(q => (Number(q) || 0) + 1)} style={stepBtn}><Plus size={14} /></button>
            </div>
          </div>
          <div>
            <label style={labelStyle}>Price (Rs)</label>
            <input type="number" value={price} onChange={e => setPrice(e.target.value)} placeholder="0" style={inputStyle} />
          </div>
          <button onClick={addLine} style={{
            ...primaryBtn, padding: '11px 16px', height: 44, whiteSpace: 'nowrap'
          }}><Plus size={16} /> Add</button>
        </div>
      </div>

      {/* Lines list */}
      {lines.length > 0 && (
        <div style={{ border: `1px solid ${C.border}`, borderRadius: 12, overflow: 'hidden', marginBottom: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr auto', gap: 8, padding: '10px 14px', background: C.cream, fontSize: 11, fontWeight: 700, color: C.muted, textTransform: 'uppercase' }}>
            <div>Item</div><div style={{ textAlign: 'center' }}>Qty</div><div style={{ textAlign: 'right' }}>Price</div><div style={{ textAlign: 'right' }}>Total</div><div></div>
          </div>
          {lines.map((l, i) => (
            <div key={i} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr auto', gap: 8, padding: '10px 14px', borderTop: `1px solid ${C.border}`, alignItems: 'center', fontSize: 14 }}>
              <div style={{ fontWeight: 600 }}>{l.name}</div>
              <div style={{ textAlign: 'center' }}>{l.qty}</div>
              <div style={{ textAlign: 'right' }}>Rs {(l.price || 0).toLocaleString()}</div>
              <div style={{ textAlign: 'right', fontWeight: 700, color: C.darkOrange }}>Rs {(((l.qty || 0) * (l.price || 0)) || 0).toLocaleString()}</div>
              <button onClick={() => removeLine(i)} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: C.red }}><Trash2 size={16} /></button>
            </div>
          ))}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, padding: '12px 14px', background: C.cream, borderTop: `1.5px solid ${C.creamBorder}`, alignItems: 'center' }}>
            <span style={{ fontSize: 13, color: C.muted, fontWeight: 700, textTransform: 'uppercase' }}>Grand Total</span>
            <span style={{ fontSize: 20, fontWeight: 800, color: C.maroon }}>Rs {(grandTotal || 0).toLocaleString()}</span>
          </div>
        </div>
      )}

      {/* Meta fields */}
      <div style={{ display: 'grid', gridTemplateColumns: isSmall ? '1fr' : '1fr 1fr', gap: 12, marginBottom: 16 }}>
        <div>
          <label style={labelStyle}>Expected Date</label>
          <input type="date" value={expectedDate} onChange={e => setExpectedDate(e.target.value)} style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>Notes</label>
          <input type="text" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Koi note..." style={inputStyle} />
        </div>
      </div>

      <button onClick={save} disabled={saving} style={{ ...primaryBtn, width: '100%', padding: '14px', fontSize: 15, opacity: saving ? 0.7 : 1 }}>
        {saving ? <RefreshCw size={18} className="spin" /> : <CheckCircle size={18} />} {saving ? 'Saving...' : `Save ${meta.label}`}
      </button>
    </div>
  );
}

/* ---------- All Orders ---------- */
function AllOrders({ orders, loading, onRefresh, isSmall }) {
  const [helpOpen, setHelpOpen] = useState(false);
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [busyId, setBusyId] = useState(null);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 100;

  const filtered = useMemo(() => {
    return (orders || []).filter(o => {
      if (typeFilter !== 'all' && o.order_type !== typeFilter) return false;
      if (statusFilter !== 'all' && (o.status || 'pending') !== statusFilter) return false;
      return true;
    });
  }, [orders, typeFilter, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pagedOrders = useMemo(
    () => filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE),
    [filtered, safePage]
  );
  React.useEffect(() => { setPage(1); }, [typeFilter, statusFilter]);

  const setStatus = async (id, status) => {
    setBusyId(id);
    try {
      const { error } = await db.from('orders').update({ status }).eq('id', id);
      if (error) throw error;
      toast.success(status === 'completed' ? 'Order complete ho gaya' : 'Order cancel ho gaya');
      onRefresh();
    } catch (e) {
      toast.error('Could not update');
    } finally {
      setBusyId(null);
    }
  };

  const softDelete = async (id) => {
    if (!window.confirm('This order will be archived (the record is not deleted, it just leaves the list). Confirm?')) return;
    setBusyId(id);
    try {
      const { error } = await db.from('orders').update({ deleted_at: new Date().toISOString() }).eq('id', id);
      if (error) throw error;
      toast.success('Order archive ho gaya');
      onRefresh();
    } catch (e) {
      toast.error('Could not delete');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div style={cardStyle}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: ORANGE_GRAD, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
            <ClipboardList size={22} />
          </div>
          <div>
            <div style={{ fontSize: 18, fontWeight: 800, color: C.maroon }}>All Orders</div>
            <div style={{ fontSize: 12, color: C.muted }}>{filtered.length} order(s) dikh rahe hain</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={onRefresh} title="Refresh" style={{ ...ghostBtn }}><RefreshCw size={18} /></button>
          <InfoBox open={helpOpen} onToggle={() => setHelpOpen(v => !v)}>
            These are all <b>pending orders</b>. Use <b>Mark Completed</b> when an order is done. Cancel marks it cancelled. <b>Delete only archives</b> — the record is always kept (for audit).
          </InfoBox>
        </div>
      </div>

      {helpOpen && <div style={{ height: 0 }} />}

      <div style={{ height: 1, background: C.border, margin: '16px 0' }} />

      {/* Type filter chips */}
      <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 6, marginBottom: 10 }}>
        {FILTER_CHIPS.map(c => {
          const on = typeFilter === c.key;
          return (
            <button key={c.key} onClick={() => setTypeFilter(c.key)} style={{
              flex: '0 0 auto', padding: '7px 14px', borderRadius: 18, fontSize: 13, fontWeight: 700, cursor: 'pointer',
              border: on ? 'none' : `1.5px solid ${C.border}`, background: on ? ORANGE_GRAD : '#fff', color: on ? '#fff' : C.text, whiteSpace: 'nowrap'
            }}>{c.label}</button>
          );
        })}
      </div>

      {/* Status filter */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {['pending', 'completed', 'all'].map(s => {
          const on = statusFilter === s;
          return (
            <button key={s} onClick={() => setStatusFilter(s)} style={{
              padding: '6px 14px', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer', textTransform: 'capitalize',
              border: `1.5px solid ${on ? C.darkOrange : C.border}`, background: on ? C.cream : '#fff', color: on ? C.darkOrange : C.muted
            }}>{s}</button>
          );
        })}
      </div>

      {loading ? (
        <div style={{ padding: 40, textAlign: 'center', color: C.muted }}>Loading...</div>
      ) : filtered.length === 0 ? (
        <div style={{ padding: 40, textAlign: 'center', color: C.muted }}>
          <Package size={40} style={{ opacity: 0.4 }} />
          <div style={{ marginTop: 10 }}>No orders found</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {pagedOrders.map(o => {
            const meta = ORDER_TYPES[o.order_type] || { badge: C.muted, badgeText: o.order_type, label: o.order_type };
            const status = o.status || 'pending';
            const isPending = status === 'pending';
            const itemsCount = Array.isArray(o.items) ? o.items.length : 0;
            const busy = busyId === o.id;
            const statusColor = status === 'completed' ? '#16a34a' : status === 'cancelled' ? C.red : C.darkOrange;
            return (
              <div key={o.id} style={{
                border: `1.5px solid ${isPending ? C.creamBorder : C.border}`,
                borderLeft: `5px solid ${meta.badge}`,
                background: isPending ? C.cream : '#fff',
                borderRadius: 12, padding: 14
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap', alignItems: 'flex-start' }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 6 }}>
                      <span style={{ background: meta.badge, color: '#fff', fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 6, textTransform: 'uppercase' }}>{meta.badgeText}</span>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: 700, color: statusColor, textTransform: 'capitalize' }}>
                        {status === 'completed' ? <CheckCircle size={13} /> : <Clock size={13} />} {status}
                      </span>
                      <span style={{ fontSize: 12, color: C.muted }}>#{o.id}</span>
                    </div>
                    <div style={{ fontSize: 16, fontWeight: 800, color: C.text }}>{o.party_name || 'Unknown Party'}</div>
                    <div style={{ fontSize: 13, color: C.muted, marginTop: 2 }}>
                      {itemsCount} item(s) · <b style={{ color: C.darkOrange }}>Rs {(o.total || 0).toLocaleString()}</b>
                      {o.expected_date ? ` · Expected: ${o.expected_date}` : ''}
                    </div>
                    {o.notes && <div style={{ fontSize: 12, color: C.muted, marginTop: 4, fontStyle: 'italic' }}>Note: {o.notes}</div>}
                    <div style={{ fontSize: 11, color: C.muted, marginTop: 4 }}>
                      {o.done_by ? `By ${o.done_by} · ` : ''}{o.created_at ? new Date(o.created_at).toLocaleString() : ''}
                    </div>
                  </div>
                </div>

                {/* Items detail */}
                {itemsCount > 0 && (
                  <div style={{ marginTop: 10, background: '#fff', border: `1px solid ${C.border}`, borderRadius: 8, padding: '8px 10px', display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {o.items.map((it, i) => (
                      <span key={i} style={{ fontSize: 12, color: C.text, background: C.cream2, borderRadius: 6, padding: '3px 8px' }}>
                        {it?.name} × {it?.qty} @ {((it?.price) || 0).toLocaleString()}
                      </span>
                    ))}
                  </div>
                )}

                {/* Actions */}
                <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
                  {status !== 'completed' && (
                    <button disabled={busy} onClick={() => setStatus(o.id, 'completed')} style={{ ...smallBtn, background: '#16a34a', color: '#fff' }}>
                      <CheckCircle size={14} /> Mark Completed
                    </button>
                  )}
                  {status !== 'cancelled' && status !== 'completed' && (
                    <button disabled={busy} onClick={() => setStatus(o.id, 'cancelled')} style={{ ...smallBtn, background: '#fff', color: C.red, border: `1.5px solid ${C.red}` }}>
                      <X size={14} /> Cancel
                    </button>
                  )}
                  <button disabled={busy} onClick={() => softDelete(o.id)} style={{ ...smallBtn, background: '#fff', color: C.muted, border: `1.5px solid ${C.border}` }}>
                    <Trash2 size={14} /> Delete
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Pagination
        page={safePage}
        totalPages={totalPages}
        totalItems={filtered.length}
        pageSize={PAGE_SIZE}
        onChange={setPage}
      />
    </div>
  );
}

/* ---------- shared styles ---------- */
const cardStyle = {
  background: '#fff', borderRadius: 14, border: `1px solid ${C.border}`,
  padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
};
const labelStyle = {
  display: 'block', fontSize: 11, fontWeight: 700, color: C.muted,
  textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6
};
const inputStyle = {
  width: '100%', padding: '11px', border: `1.5px solid ${C.border}`, borderRadius: 9,
  fontSize: 14, color: C.text, outline: 'none', boxSizing: 'border-box', background: '#fff'
};
const primaryBtn = {
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
  background: ORANGE_GRAD, color: '#fff', border: 'none', borderRadius: 9,
  fontWeight: 700, cursor: 'pointer', fontSize: 14, padding: '11px 16px',
  boxShadow: '0 2px 8px rgba(210,105,30,0.3)'
};
const ghostBtn = {
  width: 34, height: 34, borderRadius: '50%', border: `1.5px solid ${C.border}`,
  background: '#fff', color: C.darkOrange, cursor: 'pointer',
  display: 'flex', alignItems: 'center', justifyContent: 'center'
};
const smallBtn = {
  display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 14px',
  borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer', border: 'none'
};
const stepBtn = {
  width: 34, height: 40, borderRadius: 8, border: `1.5px solid ${C.border}`,
  background: C.cream, color: C.darkOrange, cursor: 'pointer',
  display: 'flex', alignItems: 'center', justifyContent: 'center', flex: '0 0 auto'
};

export default OrdersHub;
