import React, { useState, useEffect, useMemo } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { db } from '../database';
import toast from 'react-hot-toast';
import { FileText, ShoppingCart, RotateCcw, Truck, Package, ArrowLeftRight, Sliders, Printer, Search, X, Info, Plus, Minus, CheckCircle, Trash2, RefreshCw } from 'lucide-react';
import { setInventory } from '../store/slices/inventorySlice';

// ---- Theme palette ----
const C = {
  orange: '#F7941D',
  darkOrange: '#D2691E',
  maroon: '#7A1E0C',
  brown: '#8B2500',
  gold: '#F9C50D',
  lightGold: '#FFB84D',
  cream: '#FFF7E6',
  cream2: '#FDF3D0',
  helpBorder: '#F6D9A8',
  red: '#E63329',
  border: '#e2e8f0',
  text: '#1e293b',
  muted: '#64748b',
};
const ORANGE_GRAD = 'linear-gradient(135deg,#F7941D,#D2691E)';
const STORE_NAME = 'TEHZEEB SWEETS & SUPER STORE';

const SECTIONS = [
  { key: 'overview', label: 'Overview', icon: Sliders },
  { key: 'reprint', label: 'Reprint Invoice', icon: Printer },
  { key: 'adjust', label: 'Stock Adjustment', icon: RefreshCw },
  { key: 'transfer', label: 'Stock Transfer', icon: ArrowLeftRight },
  { key: 'preturn', label: 'Purchase Return', icon: RotateCcw },
  { key: 'history', label: 'Move History', icon: FileText },
];

const HELP = {
  overview: 'Quick shortcuts to New Sale, Sale Return, New Purchase and viewing old invoices. These are just links — the actual work happens on those pages.',
  reprint: 'Find and reprint an old bill. This does not create a new sale.',
  adjust: 'Correct stock for count differences or damage. Every adjustment is recorded.',
  transfer: 'Record moving goods from store/godown to the counter (within one shop). Total stock stays the same.',
  preturn: 'Goods returned to a supplier. Stock is reduced and a record is kept.',
  history: 'A full record of all stock adjustments, transfers and returns. Nothing is deleted here.',
};

function Invoice() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const inventory = useSelector((s) => s.inventory?.items || []);
  const user = useSelector((s) => s.auth?.user);

  const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' && window.innerWidth <= 900);
  const [isSmall, setIsSmall] = useState(typeof window !== 'undefined' && window.innerWidth <= 768);
  const [active, setActive] = useState('overview');
  const [showInfo, setShowInfo] = useState({});

  useEffect(() => {
    const onResize = () => {
      setIsMobile(window.innerWidth <= 900);
      setIsSmall(window.innerWidth <= 768);
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const toggleInfo = (key) => setShowInfo((p) => ({ ...p, [key]: !p[key] }));

  // ---------------- Reprint state ----------------
  const [reprintQuery, setReprintQuery] = useState('');
  const [reprintResults, setReprintResults] = useState([]);
  const [reprintLoading, setReprintLoading] = useState(false);
  const [selectedSale, setSelectedSale] = useState(null);

  const doReprintSearch = async () => {
    const q = (reprintQuery || '').trim();
    if (!q) { toast.error('Search likhein (invoice id ya customer name)'); return; }
    setReprintLoading(true);
    try {
      const isNumeric = /^\d+$/.test(q);
      let rows = [];

      if (isNumeric) {
        // Search by exact invoice id first (fast, indexed) — no full-table load
        const { data, error } = await db
          .from('sales')
          .select('*, sale_items(*)')
          .eq('id', Number(q))
          .is('deleted_at', null)
          .limit(30);
        if (error) throw error;
        rows = data || [];
      }

      // If not numeric, or numeric id gave nothing, search by customer name
      if (rows.length === 0) {
        const { data, error } = await db
          .from('sales')
          .select('*, sale_items(*)')
          .ilike('customer_name', `%${q}%`)
          .is('deleted_at', null)
          .order('created_at', { ascending: false })
          .limit(30);
        if (error) throw error;
        rows = data || [];
      }

      setReprintResults((rows || []).slice(0, 30));
      if (!rows || rows.length === 0) toast('No invoice found', { icon: 'ℹ️' });
    } catch (e) {
      toast.error('Search fail: ' + (e?.message || 'error'));
      setReprintResults([]);
    } finally {
      setReprintLoading(false);
    }
  };

  const printSale = (sale) => {
    if (!sale) return;
    const items = sale.sale_items || [];
    const rows = items.map((it) => {
      const nm = it?.product_name || it?.name || 'Item';
      const qty = it?.qty ?? it?.quantity ?? 0;
      const price = it?.price ?? it?.unit_price ?? 0;
      const line = (Number(qty) || 0) * (Number(price) || 0);
      return `<tr><td>${nm}</td><td style="text-align:center">${(qty || 0)}</td><td style="text-align:right">${(price || 0)}</td><td style="text-align:right">${(line || 0).toLocaleString()}</td></tr>`;
    }).join('');
    const dateStr = sale.created_at ? new Date(sale.created_at).toLocaleString() : '';
    const subtotal = sale.subtotal ?? sale.total ?? 0;
    const discount = sale.discount ?? 0;
    const tax = sale.tax ?? 0;
    const total = sale.total ?? 0;
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>Invoice ${sale.id || ''}</title>
      <style>
        *{font-family:'Courier New',monospace;}
        body{width:280px;margin:0 auto;padding:10px;color:#000;}
        h2{text-align:center;margin:4px 0;font-size:16px;}
        .meta{font-size:11px;text-align:center;margin-bottom:8px;}
        table{width:100%;border-collapse:collapse;font-size:12px;}
        th,td{padding:2px 0;}
        thead th{border-bottom:1px dashed #000;text-align:left;}
        .tot td{padding-top:4px;}
        .line{border-top:1px dashed #000;}
        .foot{text-align:center;font-size:11px;margin-top:10px;}
      </style></head><body>
      <h2>${STORE_NAME}</h2>
      <div class="meta">Invoice #${sale.id || ''}<br/>${dateStr}<br/>Customer: ${sale.customer_name || 'Walk-in'}</div>
      <table>
        <thead><tr><th>Item</th><th style="text-align:center">Qty</th><th style="text-align:right">Rate</th><th style="text-align:right">Amt</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
      <table class="line"><tbody>
        <tr class="tot"><td>Subtotal</td><td colspan="3" style="text-align:right">${(subtotal || 0).toLocaleString()}</td></tr>
        <tr><td>Discount</td><td colspan="3" style="text-align:right">${(discount || 0).toLocaleString()}</td></tr>
        <tr><td>Tax</td><td colspan="3" style="text-align:right">${(tax || 0).toLocaleString()}</td></tr>
        <tr class="tot"><td><b>TOTAL</b></td><td colspan="3" style="text-align:right"><b>Rs ${(total || 0).toLocaleString()}</b></td></tr>
        <tr><td>Payment</td><td colspan="3" style="text-align:right">${sale.payment_method || 'Cash'}</td></tr>
      </tbody></table>
      <div class="foot">Shukriya! Dobara tashreef laayein.<br/>*** ${STORE_NAME} ***<br/><span style="font-size: 9px; color: #555; display: inline-block; margin-top: 4px;">Software developed by <b>asperinfotech.com</b></span></div>
      <script>window.onload=function(){window.print();};</script>
      </body></html>`;
    const w = window.open('', '_blank', 'width=350,height=600');
    if (!w) { toast.error('Popup blocked — please allow popups'); return; }
    w.document.open();
    w.document.write(html);
    w.document.close();
  };

  // ---------------- Move history ----------------
  const [moves, setMoves] = useState([]);
  const [movesLoading, setMovesLoading] = useState(false);

  const fetchMoves = async () => {
    setMovesLoading(true);
    try {
      const { data, error } = await db
        .from('stock_moves')
        .select('*')
        .is('deleted_at', null)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setMoves(data || []);
    } catch (e) {
      toast.error('History load fail: ' + (e?.message || 'error'));
      setMoves([]);
    } finally {
      setMovesLoading(false);
    }
  };

  useEffect(() => {
    if (active === 'history') fetchMoves();
  }, [active]);

  // ---------------- Suppliers ----------------
  const [suppliers, setSuppliers] = useState([]);
  const fetchSuppliers = async () => {
    try {
      const { data, error } = await db.from('suppliers').select('*');
      if (error) throw error;
      setSuppliers(data || []);
    } catch (e) {
      setSuppliers([]);
    }
  };
  useEffect(() => {
    if (active === 'preturn') fetchSuppliers();
  }, [active]);

  // ---------------- helper: update stock in DB + redux ----------------
  const applyStockUpdate = async (productId, newStock) => {
    const { error } = await db.from('inventory').update({ stock: newStock }).eq('id', productId);
    if (error) throw error;
    const updated = (inventory || []).map((p) => (p.id === productId ? { ...p, stock: newStock } : p));
    dispatch(setInventory(updated));
    return updated;
  };

  // ============================================================
  // RENDER HELPERS
  // ============================================================
  const infoBtn = (key) => (
    <button
      onClick={() => toggleInfo(key)}
      title="Info"
      style={{
        width: 34, height: 34, borderRadius: '50%', border: `1.5px solid ${C.helpBorder}`,
        background: showInfo[key] ? ORANGE_GRAD : C.cream, color: showInfo[key] ? '#fff' : C.darkOrange,
        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      }}
    >
      <Info size={18} />
    </button>
  );

  const helpPanel = (key) =>
    showInfo[key] ? (
      <div style={{
        background: C.cream, border: `1.5px solid ${C.helpBorder}`, borderRadius: 12,
        padding: '12px 14px', margin: '10px 0 16px', color: C.brown, fontSize: 14, lineHeight: 1.5,
      }}>
        {HELP[key]}
      </div>
    ) : null;

  const sectionHeader = (key, title) => (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
      <h2 style={{ margin: 0, fontSize: 22, color: C.maroon, fontWeight: 800 }}>{title}</h2>
      {infoBtn(key)}
    </div>
  );

  const cardStyle = {
    background: '#fff', border: `1px solid ${C.border}`, borderRadius: 14,
    padding: isSmall ? 14 : 20, boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
  };
  const inputStyle = {
    width: '100%', padding: '11px', border: `1.5px solid ${C.border}`, borderRadius: 9,
    fontSize: 14, color: C.text, outline: 'none', boxSizing: 'border-box', background: '#fff',
  };
  const labelStyle = { display: 'block', fontSize: 13, fontWeight: 600, color: C.muted, marginBottom: 6 };
  const saveBtnStyle = {
    background: ORANGE_GRAD, color: '#fff', border: 'none', borderRadius: 9,
    padding: '12px 22px', fontSize: 15, fontWeight: 700, cursor: 'pointer',
    display: 'inline-flex', alignItems: 'center', gap: 8,
  };

  // ============================================================
  // SECTION: OVERVIEW
  // ============================================================
  const renderOverview = () => {
    const tiles = [
      { title: 'New Sale', desc: 'Naya bill banayein (POS)', icon: ShoppingCart, to: '/pos' },
      { title: 'Sale Return', desc: 'Return sold goods', icon: RotateCcw, to: '/returns' },
      { title: 'New Purchase', desc: 'Supplier se kharidari', icon: Truck, to: '/orders' },
      { title: 'View Invoices', desc: 'Purani invoices dekhein', icon: FileText, to: '/history' },
    ];
    return (
      <div style={cardStyle}>
        {sectionHeader('overview', 'Quick Actions')}
        {helpPanel('overview')}
        <div style={{
          display: 'grid',
          gridTemplateColumns: isSmall ? '1fr' : 'repeat(auto-fill,minmax(220px,1fr))',
          gap: 16, marginTop: 8,
        }}>
          {tiles.map((t) => {
            const Ic = t.icon;
            return (
              <button
                key={t.title}
                onClick={() => navigate(t.to)}
                style={{
                  textAlign: 'left', cursor: 'pointer', border: `1px solid ${C.border}`,
                  borderRadius: 14, padding: 18, background: C.cream2,
                  display: 'flex', flexDirection: 'column', gap: 10, transition: 'transform .1s',
                }}
              >
                <div style={{
                  width: 48, height: 48, borderRadius: 12, background: ORANGE_GRAD,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff',
                }}>
                  <Ic size={26} />
                </div>
                <div style={{ fontSize: 17, fontWeight: 800, color: C.maroon }}>{t.title}</div>
                <div style={{ fontSize: 13, color: C.muted }}>{t.desc}</div>
              </button>
            );
          })}
        </div>
        <div style={{ marginTop: 18, display: 'flex', gap: 10, alignItems: 'center' }}>
          {infoBtn('trash_note')}
          {!showInfo['trash_note'] && <span style={{ fontSize: 13, color: C.muted, fontWeight: 600 }}>Note on deleting</span>}
        </div>
        {showInfo['trash_note'] && (
          <div style={{
            marginTop: 10, background: C.cream, border: `1.5px solid ${C.helpBorder}`,
            borderRadius: 12, padding: '12px 14px', color: C.brown, fontSize: 13.5, display: 'flex',
            gap: 10, alignItems: 'flex-start',
          }}>
            <Trash2 size={18} style={{ flexShrink: 0, marginTop: 2 }} />
            <span>Note: Deleting an invoice only moves it to <b>Trash</b> — records are never truly lost (kept for future audit).</span>
          </div>
        )}
      </div>
    );
  };

  // ============================================================
  // SECTION: REPRINT
  // ============================================================
  const renderReprint = () => (
    <div style={cardStyle}>
      {sectionHeader('reprint', 'Reprint Invoice (Dual Invoice)')}
      {helpPanel('reprint')}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 14 }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
          <Search size={17} style={{ position: 'absolute', left: 11, top: 12, color: C.muted }} />
          <input
            style={{ ...inputStyle, paddingLeft: 36 }}
            placeholder="Invoice ID ya customer name..."
            value={reprintQuery}
            onChange={(e) => setReprintQuery(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') doReprintSearch(); }}
          />
        </div>
        <button style={saveBtnStyle} onClick={doReprintSearch} disabled={reprintLoading}>
          <Search size={16} /> {reprintLoading ? 'Searching...' : 'Search'}
        </button>
      </div>

      {reprintResults.length > 0 && !selectedSale && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }}>
          {reprintResults.map((s) => (
            <button
              key={s.id}
              onClick={() => setSelectedSale(s)}
              style={{
                textAlign: 'left', cursor: 'pointer', border: `1px solid ${C.border}`,
                borderRadius: 10, padding: 12, background: '#fff',
                display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap',
              }}
            >
              <span style={{ fontWeight: 700, color: C.maroon }}>#{s.id} — {s.customer_name || 'Walk-in'}</span>
              <span style={{ color: C.muted, fontSize: 13 }}>
                {s.created_at ? new Date(s.created_at).toLocaleDateString() : ''} · Rs {(s.total || 0).toLocaleString()}
              </span>
            </button>
          ))}
        </div>
      )}

      {selectedSale && (
        <div style={{ border: `1.5px solid ${C.helpBorder}`, borderRadius: 12, padding: 16, background: C.cream2 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <div style={{ fontWeight: 800, color: C.maroon, fontSize: 17 }}>
              Invoice #{selectedSale.id}
            </div>
            <button
              onClick={() => setSelectedSale(null)}
              style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: C.muted }}
            >
              <X size={20} />
            </button>
          </div>
          <div style={{ fontSize: 13, color: C.muted, marginBottom: 12 }}>
            {selectedSale.created_at ? new Date(selectedSale.created_at).toLocaleString() : ''} · {selectedSale.customer_name || 'Walk-in'} · {selectedSale.payment_method || 'Cash'}
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14, minWidth: 340 }}>
              <thead>
                <tr style={{ color: C.muted, textAlign: 'left' }}>
                  <th style={{ padding: '6px 4px' }}>Item</th>
                  <th style={{ padding: '6px 4px', textAlign: 'center' }}>Qty</th>
                  <th style={{ padding: '6px 4px', textAlign: 'right' }}>Rate</th>
                  <th style={{ padding: '6px 4px', textAlign: 'right' }}>Amount</th>
                </tr>
              </thead>
              <tbody>
                {(selectedSale.sale_items || []).map((it, i) => {
                  const qty = it?.qty ?? it?.quantity ?? 0;
                  const price = it?.price ?? it?.unit_price ?? 0;
                  return (
                    <tr key={i} style={{ borderTop: `1px solid ${C.border}` }}>
                      <td style={{ padding: '6px 4px' }}>{it?.product_name || it?.name || 'Item'}</td>
                      <td style={{ padding: '6px 4px', textAlign: 'center' }}>{qty || 0}</td>
                      <td style={{ padding: '6px 4px', textAlign: 'right' }}>{(price || 0).toLocaleString()}</td>
                      <td style={{ padding: '6px 4px', textAlign: 'right' }}>{(((Number(qty) || 0) * (Number(price) || 0)) || 0).toLocaleString()}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div style={{ marginTop: 12, textAlign: 'right', fontSize: 14, color: C.text }}>
            <div>Subtotal: Rs {(selectedSale.subtotal ?? selectedSale.total ?? 0).toLocaleString()}</div>
            <div>Discount: Rs {(selectedSale.discount || 0).toLocaleString()}</div>
            <div style={{ fontWeight: 800, fontSize: 17, color: C.maroon, marginTop: 4 }}>
              Total: Rs {(selectedSale.total || 0).toLocaleString()}
            </div>
          </div>
          <div style={{ marginTop: 14 }}>
            <button style={saveBtnStyle} onClick={() => printSale(selectedSale)}>
              <Printer size={17} /> PRINT
            </button>
          </div>
        </div>
      )}
    </div>
  );

  // ============================================================
  // Product picker (shared)
  // ============================================================
  const ProductPicker = ({ value, onSelect, placeholder }) => {
    const [term, setTerm] = useState('');
    const [open, setOpen] = useState(false);
    const list = useMemo(() => {
      const t = (term || '').toLowerCase();
      return (inventory || [])
        .filter((p) => !p?.deleted_at)
        .filter((p) => !t || String(p?.name || '').toLowerCase().includes(t) || String(p?.barcode || '').toLowerCase().includes(t))
        .slice(0, 40);
    }, [term, inventory]);
    return (
      <div style={{ position: 'relative' }}>
        <input
          style={inputStyle}
          placeholder={placeholder || 'Search product...'}
          value={value ? (value.name || '') : term}
          onChange={(e) => { setTerm(e.target.value); onSelect(null); setOpen(true); }}
          onFocus={() => setOpen(true)}
        />
        {open && !value && (
          <div style={{
            position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 20, background: '#fff',
            border: `1.5px solid ${C.border}`, borderRadius: 9, marginTop: 4, maxHeight: 230,
            overflowY: 'auto', boxShadow: '0 6px 18px rgba(0,0,0,0.12)',
          }}>
            {list.length === 0 && <div style={{ padding: 10, color: C.muted, fontSize: 13 }}>No product found</div>}
            {list.map((p) => (
              <button
                key={p.id}
                onClick={() => { onSelect(p); setOpen(false); setTerm(''); }}
                style={{
                  display: 'flex', justifyContent: 'space-between', width: '100%', textAlign: 'left',
                  padding: '9px 11px', border: 'none', borderBottom: `1px solid ${C.border}`,
                  background: '#fff', cursor: 'pointer', fontSize: 13.5,
                }}
              >
                <span>{p.name}</span>
                <span style={{ color: C.muted }}>Stock: {(p.stock || 0).toLocaleString()}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  };

  // ============================================================
  // SECTION: STOCK ADJUSTMENT
  // ============================================================
  const [adjProduct, setAdjProduct] = useState(null);
  const [adjMode, setAdjMode] = useState('new'); // 'new' | 'delta'
  const [adjNewStock, setAdjNewStock] = useState('');
  const [adjDelta, setAdjDelta] = useState('');
  const [adjReason, setAdjReason] = useState('');
  const [adjSaving, setAdjSaving] = useState(false);

  const saveAdjustment = async () => {
    if (!adjProduct) { toast.error('Please select a product'); return; }
    const current = Number(adjProduct.stock) || 0;
    let newStock, delta;
    if (adjMode === 'new') {
      if (adjNewStock === '' || isNaN(Number(adjNewStock))) { toast.error('Naya stock likhein'); return; }
      newStock = Number(adjNewStock);
      delta = newStock - current;
    } else {
      if (adjDelta === '' || isNaN(Number(adjDelta))) { toast.error('Change (+/-) likhein'); return; }
      delta = Number(adjDelta);
      newStock = current + delta;
    }
    if (newStock < 0) { toast.error('Stock cannot be less than 0'); return; }
    if (!adjReason.trim()) { toast.error('Reason likhein'); return; }
    setAdjSaving(true);
    try {
      await applyStockUpdate(adjProduct.id, newStock);
      const { error: mErr } = await db.from('stock_moves').insert({
        move_type: 'adjustment',
        product_id: adjProduct.id,
        product_name: adjProduct.name,
        qty: delta,
        reason: adjReason.trim(),
        done_by: user?.name || 'unknown',
      });
      if (mErr) throw mErr;
      toast.success('Stock adjust ho gaya');
      setAdjProduct(null); setAdjNewStock(''); setAdjDelta(''); setAdjReason('');
      if (active === 'history') fetchMoves();
    } catch (e) {
      toast.error('Save fail: ' + (e?.message || 'error'));
    } finally {
      setAdjSaving(false);
    }
  };

  const renderAdjust = () => {
    const current = Number(adjProduct?.stock) || 0;
    return (
      <div style={cardStyle}>
        {sectionHeader('adjust', 'Stock Adjustment')}
        {helpPanel('adjust')}
        <div style={{ display: 'grid', gap: 14, maxWidth: 520 }}>
          <div>
            <label style={labelStyle}>Product</label>
            <ProductPicker value={adjProduct} onSelect={setAdjProduct} />
          </div>
          {adjProduct && (
            <div style={{ background: C.cream, border: `1.5px solid ${C.helpBorder}`, borderRadius: 9, padding: '10px 12px', color: C.brown }}>
              Current Stock: <b>{(current).toLocaleString()}</b> {adjProduct.unit || ''}
            </div>
          )}
          <div style={{ display: 'flex', gap: 8 }}>
            {['new', 'delta'].map((m) => (
              <button
                key={m}
                onClick={() => setAdjMode(m)}
                style={{
                  flex: 1, padding: 10, borderRadius: 9, cursor: 'pointer', fontWeight: 700, fontSize: 13,
                  border: `1.5px solid ${adjMode === m ? C.darkOrange : C.border}`,
                  background: adjMode === m ? ORANGE_GRAD : '#fff',
                  color: adjMode === m ? '#fff' : C.text,
                }}
              >
                {m === 'new' ? 'Set New Stock' : 'Add / Remove (+/-)'}
              </button>
            ))}
          </div>
          {adjMode === 'new' ? (
            <div>
              <label style={labelStyle}>New Actual Stock</label>
              <input style={inputStyle} type="number" value={adjNewStock} onChange={(e) => setAdjNewStock(e.target.value)} placeholder="e.g. 25" />
            </div>
          ) : (
            <div>
              <label style={labelStyle}>Change (use - for reduce)</label>
              <input style={inputStyle} type="number" value={adjDelta} onChange={(e) => setAdjDelta(e.target.value)} placeholder="e.g. -3 ya 5" />
            </div>
          )}
          <div>
            <label style={labelStyle}>Reason</label>
            <input style={inputStyle} value={adjReason} onChange={(e) => setAdjReason(e.target.value)} placeholder="damage / count correction / etc." />
          </div>
          <div>
            <button style={saveBtnStyle} onClick={saveAdjustment} disabled={adjSaving}>
              <CheckCircle size={17} /> {adjSaving ? 'Saving...' : 'Save Adjustment'}
            </button>
          </div>
        </div>
      </div>
    );
  };

  // ============================================================
  // SECTION: STOCK TRANSFER
  // ============================================================
  const [trProduct, setTrProduct] = useState(null);
  const [trQty, setTrQty] = useState('');
  const [trFrom, setTrFrom] = useState('Main Store');
  const [trTo, setTrTo] = useState('Counter');
  const [trReason, setTrReason] = useState('');
  const [trSaving, setTrSaving] = useState(false);

  const saveTransfer = async () => {
    if (!trProduct) { toast.error('Please select a product'); return; }
    const qty = Number(trQty);
    if (!qty || isNaN(qty) || qty <= 0) { toast.error('Qty theek likhein'); return; }
    setTrSaving(true);
    try {
      const { error } = await db.from('stock_moves').insert({
        move_type: 'transfer',
        product_id: trProduct.id,
        product_name: trProduct.name,
        qty,
        from_loc: trFrom || 'Main Store',
        to_loc: trTo || 'Counter',
        reason: trReason.trim() || 'Location transfer',
        done_by: user?.name || 'unknown',
      });
      if (error) throw error;
      // total stock unchanged — location movement only
      toast.success('Transfer record ho gaya');
      setTrProduct(null); setTrQty(''); setTrReason('');
      if (active === 'history') fetchMoves();
    } catch (e) {
      toast.error('Save fail: ' + (e?.message || 'error'));
    } finally {
      setTrSaving(false);
    }
  };

  const renderTransfer = () => (
    <div style={cardStyle}>
      {sectionHeader('transfer', 'Stock Transfer')}
      {helpPanel('transfer')}
      <div style={{ display: 'grid', gap: 14, maxWidth: 520 }}>
        <div>
          <label style={labelStyle}>Product</label>
          <ProductPicker value={trProduct} onSelect={setTrProduct} />
        </div>
        <div>
          <label style={labelStyle}>Quantity</label>
          <input style={inputStyle} type="number" value={trQty} onChange={(e) => setTrQty(e.target.value)} placeholder="e.g. 10" />
        </div>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 140 }}>
            <label style={labelStyle}>From</label>
            <input style={inputStyle} value={trFrom} onChange={(e) => setTrFrom(e.target.value)} />
          </div>
          <div style={{ flex: 1, minWidth: 140 }}>
            <label style={labelStyle}>To</label>
            <input style={inputStyle} value={trTo} onChange={(e) => setTrTo(e.target.value)} />
          </div>
        </div>
        <div>
          <label style={labelStyle}>Reason (optional)</label>
          <input style={inputStyle} value={trReason} onChange={(e) => setTrReason(e.target.value)} placeholder="counter refill / etc." />
        </div>
        <div>
          <button style={saveBtnStyle} onClick={saveTransfer} disabled={trSaving}>
            <ArrowLeftRight size={17} /> {trSaving ? 'Saving...' : 'Record Transfer'}
          </button>
        </div>
      </div>
    </div>
  );

  // ============================================================
  // SECTION: PURCHASE RETURN
  // ============================================================
  const [prSupplier, setPrSupplier] = useState(null);
  const [prSupplierTerm, setPrSupplierTerm] = useState('');
  const [prSupplierOpen, setPrSupplierOpen] = useState(false);
  const [prProduct, setPrProduct] = useState(null);
  const [prQty, setPrQty] = useState('');
  const [prReason, setPrReason] = useState('');
  const [prSaving, setPrSaving] = useState(false);

  const filteredSuppliers = useMemo(() => {
    const t = (prSupplierTerm || '').toLowerCase();
    return (suppliers || []).filter((s) => !t || String(s?.name || '').toLowerCase().includes(t) || String(s?.company || '').toLowerCase().includes(t)).slice(0, 40);
  }, [prSupplierTerm, suppliers]);

  const savePurchaseReturn = async () => {
    if (!prSupplier) { toast.error('Please select a supplier'); return; }
    if (!prProduct) { toast.error('Please select a product'); return; }
    const qty = Number(prQty);
    if (!qty || isNaN(qty) || qty <= 0) { toast.error('Qty theek likhein'); return; }
    const current = Number(prProduct.stock) || 0;
    if (qty > current) { toast.error('Qty stock se zyada hai'); return; }
    if (!prReason.trim()) { toast.error('Reason likhein'); return; }
    setPrSaving(true);
    try {
      const newStock = current - qty;
      await applyStockUpdate(prProduct.id, newStock);
      const { error } = await db.from('stock_moves').insert({
        move_type: 'purchase_return',
        product_id: prProduct.id,
        product_name: prProduct.name,
        qty,
        to_loc: prSupplier.name,
        reason: prReason.trim(),
        done_by: user?.name || 'unknown',
      });
      if (error) throw error;
      toast.success('Purchase return record ho gaya');
      setPrSupplier(null); setPrSupplierTerm(''); setPrProduct(null); setPrQty(''); setPrReason('');
      if (active === 'history') fetchMoves();
    } catch (e) {
      toast.error('Save fail: ' + (e?.message || 'error'));
    } finally {
      setPrSaving(false);
    }
  };

  const renderPurchaseReturn = () => (
    <div style={cardStyle}>
      {sectionHeader('preturn', 'Purchase Return')}
      {helpPanel('preturn')}
      <div style={{ display: 'grid', gap: 14, maxWidth: 520 }}>
        <div style={{ position: 'relative' }}>
          <label style={labelStyle}>Supplier</label>
          <input
            style={inputStyle}
            placeholder="Search supplier..."
            value={prSupplier ? (prSupplier.name || '') : prSupplierTerm}
            onChange={(e) => { setPrSupplierTerm(e.target.value); setPrSupplier(null); setPrSupplierOpen(true); }}
            onFocus={() => setPrSupplierOpen(true)}
          />
          {prSupplierOpen && !prSupplier && (
            <div style={{
              position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 20, background: '#fff',
              border: `1.5px solid ${C.border}`, borderRadius: 9, marginTop: 4, maxHeight: 220,
              overflowY: 'auto', boxShadow: '0 6px 18px rgba(0,0,0,0.12)',
            }}>
              {filteredSuppliers.length === 0 && <div style={{ padding: 10, color: C.muted, fontSize: 13 }}>No supplier found</div>}
              {filteredSuppliers.map((s) => (
                <button
                  key={s.id}
                  onClick={() => { setPrSupplier(s); setPrSupplierOpen(false); setPrSupplierTerm(''); }}
                  style={{
                    display: 'flex', justifyContent: 'space-between', width: '100%', textAlign: 'left',
                    padding: '9px 11px', border: 'none', borderBottom: `1px solid ${C.border}`,
                    background: '#fff', cursor: 'pointer', fontSize: 13.5,
                  }}
                >
                  <span>{s.name}{s.company ? ` (${s.company})` : ''}</span>
                  <span style={{ color: C.muted }}>{s.phone || ''}</span>
                </button>
              ))}
            </div>
          )}
        </div>
        <div>
          <label style={labelStyle}>Product</label>
          <ProductPicker value={prProduct} onSelect={setPrProduct} />
        </div>
        {prProduct && (
          <div style={{ background: C.cream, border: `1.5px solid ${C.helpBorder}`, borderRadius: 9, padding: '10px 12px', color: C.brown }}>
            Current Stock: <b>{(Number(prProduct.stock) || 0).toLocaleString()}</b> {prProduct.unit || ''}
          </div>
        )}
        <div>
          <label style={labelStyle}>Return Quantity</label>
          <input style={inputStyle} type="number" value={prQty} onChange={(e) => setPrQty(e.target.value)} placeholder="e.g. 5" />
        </div>
        <div>
          <label style={labelStyle}>Reason</label>
          <input style={inputStyle} value={prReason} onChange={(e) => setPrReason(e.target.value)} placeholder="expired / damaged / wrong item" />
        </div>
        <div>
          <button style={saveBtnStyle} onClick={savePurchaseReturn} disabled={prSaving}>
            <RotateCcw size={17} /> {prSaving ? 'Saving...' : 'Save Return'}
          </button>
        </div>
      </div>
    </div>
  );

  // ============================================================
  // SECTION: MOVE HISTORY
  // ============================================================
  const badgeFor = (type) => {
    const map = {
      adjustment: { label: 'Adjustment', bg: C.gold, color: C.brown },
      transfer: { label: 'Transfer', bg: C.lightGold, color: C.brown },
      purchase_return: { label: 'Purchase Return', bg: C.red, color: '#fff' },
    };
    const m = map[type] || { label: type || 'Move', bg: C.border, color: C.text };
    return (
      <span style={{ background: m.bg, color: m.color, padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap' }}>
        {m.label}
      </span>
    );
  };

  const renderHistory = () => (
    <div style={cardStyle}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <h2 style={{ margin: 0, fontSize: 22, color: C.maroon, fontWeight: 800 }}>Move History</h2>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={fetchMoves}
            title="Refresh"
            style={{
              width: 34, height: 34, borderRadius: '50%', border: `1.5px solid ${C.helpBorder}`,
              background: C.cream, color: C.darkOrange, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <RefreshCw size={17} />
          </button>
          {infoBtn('history')}
        </div>
      </div>
      {helpPanel('history')}
      {movesLoading ? (
        <div style={{ color: C.muted, padding: 20, textAlign: 'center' }}>Loading...</div>
      ) : moves.length === 0 ? (
        <div style={{ color: C.muted, padding: 20, textAlign: 'center' }}>No records yet.</div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13.5, minWidth: 640 }}>
            <thead>
              <tr style={{ color: C.muted, textAlign: 'left' }}>
                <th style={{ padding: '8px 6px' }}>Type</th>
                <th style={{ padding: '8px 6px' }}>Product</th>
                <th style={{ padding: '8px 6px', textAlign: 'right' }}>Qty</th>
                <th style={{ padding: '8px 6px' }}>Reason</th>
                <th style={{ padding: '8px 6px' }}>Loc</th>
                <th style={{ padding: '8px 6px' }}>Date</th>
                <th style={{ padding: '8px 6px' }}>By</th>
              </tr>
            </thead>
            <tbody>
              {moves.map((m) => (
                <tr key={m.id} style={{ borderTop: `1px solid ${C.border}` }}>
                  <td style={{ padding: '8px 6px' }}>{badgeFor(m.move_type)}</td>
                  <td style={{ padding: '8px 6px', fontWeight: 600 }}>{m.product_name || '-'}</td>
                  <td style={{ padding: '8px 6px', textAlign: 'right' }}>{(m.qty || 0).toLocaleString()}</td>
                  <td style={{ padding: '8px 6px', color: C.muted }}>{m.reason || '-'}</td>
                  <td style={{ padding: '8px 6px', color: C.muted }}>
                    {[m.from_loc, m.to_loc].filter(Boolean).join(' → ') || '-'}
                  </td>
                  <td style={{ padding: '8px 6px', color: C.muted }}>{m.created_at ? new Date(m.created_at).toLocaleString() : '-'}</td>
                  <td style={{ padding: '8px 6px', color: C.muted }}>{m.done_by || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );

  // ============================================================
  // MAIN LAYOUT
  // ============================================================
  const renderActive = () => {
    switch (active) {
      case 'overview': return renderOverview();
      case 'reprint': return renderReprint();
      case 'adjust': return renderAdjust();
      case 'transfer': return renderTransfer();
      case 'preturn': return renderPurchaseReturn();
      case 'history': return renderHistory();
      default: return renderOverview();
    }
  };

  const menuItem = (s) => {
    const Ic = s.icon;
    const isActive = active === s.key;
    return (
      <button
        key={s.key}
        onClick={() => setActive(s.key)}
        style={{
          display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer',
          border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 700,
          padding: isMobile ? '9px 14px' : '11px 14px',
          background: isActive ? ORANGE_GRAD : (isMobile ? '#fff' : 'transparent'),
          color: isActive ? '#fff' : C.text,
          whiteSpace: 'nowrap',
          borderBottom: isMobile ? 'none' : `0px`,
          width: isMobile ? 'auto' : '100%',
          textAlign: 'left',
          boxShadow: isMobile && !isActive ? `inset 0 0 0 1.5px ${C.border}` : 'none',
        }}
      >
        <Ic size={18} /> {s.label}
      </button>
    );
  };

  return (
    <div style={{ height: '100%', overflowY: 'auto', padding: isSmall ? '10px' : '20px', background: C.cream, boxSizing: 'border-box' }}>
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: isSmall ? 22 : 28, fontWeight: 900, color: C.maroon, letterSpacing: 0.3 }}>
          INVOICE CENTER
        </div>
        <div style={{ fontSize: 13, color: C.darkOrange, fontWeight: 700 }}>{STORE_NAME}</div>
      </div>

      {isMobile ? (
        <>
          <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 8, marginBottom: 14 }}>
            {SECTIONS.map(menuItem)}
          </div>
          {renderActive()}
        </>
      ) : (
        <div style={{ display: 'flex', gap: 18, alignItems: 'flex-start' }}>
          <div style={{
            width: 230, flexShrink: 0, background: '#fff', border: `1px solid ${C.border}`,
            borderRadius: 14, padding: 10, display: 'flex', flexDirection: 'column', gap: 4,
            boxShadow: '0 2px 10px rgba(0,0,0,0.05)', position: 'sticky', top: 0,
          }}>
            {SECTIONS.map(menuItem)}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            {renderActive()}
          </div>
        </div>
      )}
    </div>
  );
}

export default Invoice;
