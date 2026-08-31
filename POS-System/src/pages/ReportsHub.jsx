import React, { useState, useEffect, useMemo } from 'react';
import Pagination from '../components/Pagination';
import { useSelector } from 'react-redux';
import { db } from '../database';
import toast from 'react-hot-toast';
import { BarChart3, FileText, TrendingUp, Package, Layers, Sliders, ArrowLeftRight, Wallet, MapPin, BookOpen, Briefcase, Search, Info, Download, Calendar, DollarSign, ShoppingCart } from 'lucide-react';

// ---------- Theme ----------
const C = {
  orange: '#F7941D',
  copper: '#D2691E',
  maroon: '#8B2500',
  darkMaroon: '#7A1E0C',
  gold: '#F9C50D',
  amber: '#FFB84D',
  cream: '#FFF7E6',
  cream2: '#FDF3D0',
  red: '#E63329',
  border: '#e2e8f0',
  text: '#1e293b',
  muted: '#64748b',
  white: '#ffffff',
};

const ORANGE_GRAD = 'linear-gradient(135deg,#F7941D,#D2691E)';

// ---------- Helpers ----------
const num = (x) => (typeof x === 'number' && !isNaN(x) ? x : parseFloat(x) || 0);
const money = (x) => (num(x)).toLocaleString();
const asArray = (x) => (Array.isArray(x) ? x : []);

function fmtDate(d) {
  if (!d) return '-';
  try {
    const dt = new Date(d);
    if (isNaN(dt.getTime())) return String(d);
    return dt.toISOString().slice(0, 10);
  } catch (e) {
    return String(d);
  }
}

function inRange(dateStr, from, to) {
  if (!dateStr) return false;
  try {
    const t = new Date(dateStr).getTime();
    if (isNaN(t)) return false;
    const f = from ? new Date(from + 'T00:00:00').getTime() : -Infinity;
    const tt = to ? new Date(to + 'T23:59:59').getTime() : Infinity;
    return t >= f && t <= tt;
  } catch (e) {
    return false;
  }
}

function firstOfMonth() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
}
function today() {
  return new Date().toISOString().slice(0, 10);
}
function firstOfWeek() {
  const d = new Date();
  const day = d.getDay();               // 0=Sun
  const diff = (day === 0 ? 6 : day - 1); // week starts Monday
  d.setDate(d.getDate() - diff);
  return d.toISOString().slice(0, 10);
}
function firstOfYear() {
  const d = new Date();
  return new Date(d.getFullYear(), 0, 1).toISOString().slice(0, 10);
}

function toCSV(headers, rows) {
  const esc = (v) => {
    const s = v === null || v === undefined ? '' : String(v);
    if (s.includes(',') || s.includes('"') || s.includes('\n')) {
      return '"' + s.replace(/"/g, '""') + '"';
    }
    return s;
  };
  const lines = [];
  lines.push(headers.map(esc).join(','));
  asArray(rows).forEach((r) => lines.push(r.map(esc).join(',')));
  return lines.join('\n');
}

function downloadCSV(filename, headers, rows) {
  if (!asArray(rows).length) {
    toast('No rows to export');
    return;
  }
  try {
    const csv = toCSV(headers, rows);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('Exported CSV');
  } catch (e) {
    toast.error('Export failed');
  }
}

// ---------- Report definitions ----------
const REPORTS = [
  { id: 'sale', label: 'Sale Report', icon: FileText },
  { id: 'purchase', label: 'Purchase Report', icon: ShoppingCart },
  { id: 'profit', label: 'Profit Report', icon: TrendingUp },
  { id: 'stockQty', label: 'Stock Quantity Report', icon: Package },
  { id: 'stockVal', label: 'Stock Value Report', icon: Layers },
  { id: 'adjust', label: 'Stock Adjustment Report', icon: Sliders },
  { id: 'transfer', label: 'Stock Transfer Report', icon: ArrowLeftRight },
  { id: 'recovery', label: 'Recovery Report', icon: Wallet },
  { id: 'area', label: 'Area Wise Balance Report', icon: MapPin },
  { id: 'account', label: 'Account Report', icon: BookOpen },
  { id: 'journal', label: 'General Journal', icon: BookOpen },
  { id: 'business', label: 'Business Report', icon: Briefcase },
  { id: 'search', label: 'Search Description', icon: Search },
];

const HELP = {
  sale: 'Shows every sale invoice within the selected date range with the customer, payment method and total amount. The summary cards show total sales value, the number of bills and the average bill value.',
  purchase: 'Lists all purchase orders in the selected date range from suppliers, showing the party, number of items, total amount and order status. The summary shows the total purchase value.',
  profit: 'Calculates profit per sale by subtracting the cost of goods (cost price x quantity) from revenue (sale price x quantity) using the sold items. The summary shows total revenue, total cost, total profit and the profit margin percentage.',
  stockQty: 'Shows the current stock quantity of every product with its category and unit. Products at or below the low-stock threshold are flagged. The summary shows total SKUs, total units in stock and the low-stock count.',
  stockVal: 'Values your inventory. For each product it shows the cost value (stock x cost price) and the retail value (stock x sale price). The summary shows total cost value, total retail value and the potential profit.',
  adjust: 'Shows all manual stock adjustments in the date range, including the product, quantity changed (positive or negative), the reason and who made the adjustment.',
  transfer: 'Shows all stock transfers between locations in the date range, including the product, quantity, source location, destination location and who performed the transfer.',
  recovery: 'Shows customer payments received (recovery of outstanding balances) within the date range, including the customer, amount received and any note. The summary shows the total amount recovered.',
  area: 'Groups all customers by their area and sums their outstanding balances. Useful to see which areas carry the most receivables. Shows number of parties and total balance per area.',
  account: 'Select any customer to view their complete ledger statement: every transaction with date, note, type, amount and a running balance, plus their current outstanding balance.',
  journal: 'A combined view of all money movement in the date range: sales (money IN), expenses (money OUT) and customer payments (money IN), merged and sorted by date.',
  business: 'A high-level business summary for the selected range: total sales, purchases, expenses, gross profit and net result, along with the top 5 selling products and a payment method breakdown.',
  search: 'Search across sales, expenses, stock movements and orders for any keyword. Matching records are listed with their type, date, description and amount.',
};

// ---------- UI atoms ----------
function StatCard({ label, value, accent }) {
  return (
    <div style={{
      background: C.white, borderRadius: 14, padding: '16px 18px',
      border: `1px solid ${C.border}`, borderTop: `4px solid ${accent || C.orange}`,
      boxShadow: '0 2px 8px rgba(0,0,0,0.04)', minWidth: 150, flex: '1 1 160px',
    }}>
      <div style={{ fontSize: 12, color: C.muted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.4 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 800, color: C.text, marginTop: 6 }}>{value}</div>
    </div>
  );
}

function EmptyState({ text }) {
  return (
    <div style={{
      padding: 40, textAlign: 'center', color: C.muted, background: C.white,
      border: `1px dashed ${C.border}`, borderRadius: 14, fontSize: 15,
    }}>
      {text || 'No data for this range'}
    </div>
  );
}

const thStyle = { background: C.maroon, color: C.white, padding: '10px 12px', textAlign: 'left', fontSize: 13, fontWeight: 700, whiteSpace: 'nowrap' };
const tdStyle = { padding: '9px 12px', fontSize: 13, color: C.text, borderBottom: `1px solid ${C.border}` };

const TABLE_PAGE_SIZE = 100;
function Table({ headers, rows, totalsRow }) {
  const all = asArray(rows);
  const [tPage, setTPage] = React.useState(1);
  // reset to first page whenever the data set changes size
  React.useEffect(() => { setTPage(1); }, [all.length]);
  if (!all.length) return <EmptyState />;
  const totalPages = Math.max(1, Math.ceil(all.length / TABLE_PAGE_SIZE));
  const safePage = Math.min(tPage, totalPages);
  const view = all.slice((safePage - 1) * TABLE_PAGE_SIZE, safePage * TABLE_PAGE_SIZE);
  const offset = (safePage - 1) * TABLE_PAGE_SIZE;
  return (
   <>
    <div style={{ overflowX: 'auto', border: `1px solid ${C.border}`, borderRadius: 14, background: C.white }}>
      <table style={{ borderCollapse: 'collapse', width: '100%', minWidth: 520 }}>
        <thead>
          <tr>{headers.map((h, i) => <th key={i} style={thStyle}>{h}</th>)}</tr>
        </thead>
        <tbody>
          {view.map((r, ri) => (
            <tr key={offset + ri} style={{ background: (offset + ri) % 2 ? C.cream : C.white }}>
              {r.map((c, ci) => <td key={ci} style={tdStyle}>{c}</td>)}
            </tr>
          ))}
          {totalsRow && safePage === totalPages && (
            <tr style={{ background: C.cream2 }}>
              {totalsRow.map((c, ci) => (
                <td key={ci} style={{ ...tdStyle, fontWeight: 800, borderTop: `2px solid ${C.copper}` }}>{c}</td>
              ))}
            </tr>
          )}
        </tbody>
      </table>
    </div>
    <Pagination page={safePage} totalPages={totalPages} totalItems={all.length} pageSize={TABLE_PAGE_SIZE} onChange={setTPage} />
   </>
  );
}

function ReportShell({ title, help, showHelp, onToggleHelp, onExport, cards, children }) {
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, marginBottom: 14 }}>
        <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: C.darkMaroon }}>{title}</h2>
        <div style={{ display: 'flex', gap: 8 }}>
          {onExport && (
            <button onClick={onExport} style={{
              display: 'flex', alignItems: 'center', gap: 6, background: ORANGE_GRAD, color: C.white,
              border: 'none', borderRadius: 10, padding: '8px 14px', fontSize: 13, fontWeight: 700, cursor: 'pointer',
            }}>
              <Download size={16} /> EXPORT CSV
            </button>
          )}
          <button onClick={onToggleHelp} title="Info" style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', width: 38, height: 38,
            background: showHelp ? C.orange : C.white, color: showHelp ? C.white : C.copper,
            border: `1px solid ${C.amber}`, borderRadius: 10, cursor: 'pointer',
          }}>
            <Info size={18} />
          </button>
        </div>
      </div>

      {showHelp && (
        <div style={{
          background: C.cream, border: `1px solid #F6D9A8`, borderRadius: 12,
          padding: '12px 16px', marginBottom: 16, color: C.text, fontSize: 14, lineHeight: 1.5,
          display: 'flex', gap: 10, alignItems: 'flex-start',
        }}>
          <Info size={18} style={{ color: C.copper, flexShrink: 0, marginTop: 2 }} />
          <span>{help}</span>
        </div>
      )}

      {asArray(cards).length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 18 }}>
          {cards.map((c, i) => <StatCard key={i} label={c.label} value={c.value} accent={c.accent} />)}
        </div>
      )}

      {children}
    </div>
  );
}

// ---------- Main component ----------
function ReportsHub() {
  const [active, setActive] = useState('sale');
  const [from, setFrom] = useState(firstOfMonth());
  const [to, setTo] = useState(today());
  const [showHelp, setShowHelp] = useState(false);
  const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' && window.innerWidth <= 900);

  // data
  const [sales, setSales] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [stockMoves, setStockMoves] = useState([]);
  const [orders, setOrders] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);

  // redux fast sources
  const reduxInventory = useSelector((s) => s?.inventory?.items);
  const reduxCustomers = useSelector((s) => s?.customers?.list);
  const reduxSales = useSelector((s) => s?.sales?.history);

  // account report selection
  const [acctQuery, setAcctQuery] = useState('');
  const [acctId, setAcctId] = useState(null);

  // search description
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth <= 900);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => { setShowHelp(false); }, [active]);

  useEffect(() => {
    let mounted = true;
    // Hard safety: never let the Reports screen hang on "Loading..." forever
    const failsafe = setTimeout(() => { if (mounted) setLoading(false); }, 25000);
    async function load() {
      setLoading(true);
      try {
        // DATE-RANGE FILTERED: load only the selected range's data so the server
        // stays light and reports open in ~1 sec (no full-history load, no 4GB).
        const startISO = `${from}T00:00:00.000Z`;
        const endISO = `${to}T23:59:59.999Z`;
        const results = await Promise.allSettled([
          db.from('sales').select('*, sale_items(*)').is('deleted_at', null)
            .gte('created_at', startISO).lte('created_at', endISO)
            .order('id', { ascending: false }).limit(5000),
          db.from('inventory').select('*'),  // stock reports need current stock (all)
          db.from('stock_moves').select('*')
            .gte('created_at', startISO).lte('created_at', endISO)
            .order('id', { ascending: false }).limit(5000),
          db.from('orders').select('*')
            .gte('created_at', startISO).lte('created_at', endISO)
            .order('id', { ascending: false }).limit(5000),
          db.from('customers').select('*'),
          db.from('expenses').select('*')
            .gte('created_at', startISO).lte('created_at', endISO)
            .order('id', { ascending: false }).limit(5000),
        ]);
        if (!mounted) return;

        const pick = (r, fallback) => {
          if (r && r.status === 'fulfilled' && r.value && !r.value.error) {
            return asArray(r.value.data);
          }
          return asArray(fallback);
        };

        setSales(pick(results[0], reduxSales));
        setInventory(pick(results[1], reduxInventory));
        setStockMoves(pick(results[2], []));
        setOrders(pick(results[3], []));
        setCustomers(pick(results[4], reduxCustomers));
        setExpenses(pick(results[5], []));
      } catch (e) {
        toast.error('Failed to load report data');
        setSales(asArray(reduxSales));
        setInventory(asArray(reduxInventory));
        setCustomers(asArray(reduxCustomers));
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => { mounted = false; clearTimeout(failsafe); };
    // reload whenever the selected date range changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [from, to]);

  // ---- derived data per report ----
  const salesInRange = useMemo(
    () => asArray(sales).filter((s) => inRange(s?.created_at, from, to)),
    [sales, from, to]
  );

  // 1. Sale
  const saleReport = useMemo(() => {
    const rows = salesInRange.map((s) => ({
      date: fmtDate(s?.created_at),
      inv: s?.id ?? '-',
      customer: s?.customer_name || 'Walk-in',
      pay: s?.payment_method || '-',
      total: num(s?.total),
    }));
    const totalSales = rows.reduce((a, r) => a + r.total, 0);
    const bills = rows.length;
    const avg = bills ? totalSales / bills : 0;
    return { rows, totalSales, bills, avg };
  }, [salesInRange]);

  // 2. Purchase
  const purchaseReport = useMemo(() => {
    const rows = asArray(orders)
      .filter((o) => String(o?.order_type || '').toLowerCase().includes('purchase'))
      .filter((o) => inRange(o?.created_at, from, to))
      .map((o) => {
        const items = asArray(o?.items);
        return {
          date: fmtDate(o?.created_at),
          party: o?.party_name || '-',
          count: items.length,
          total: num(o?.total),
          status: o?.status || '-',
        };
      });
    const totalPurchases = rows.reduce((a, r) => a + r.total, 0);
    return { rows, totalPurchases };
  }, [orders, from, to]);

  // 3. Profit
  const profitReport = useMemo(() => {
    const rows = [];
    let totRev = 0, totCost = 0;
    salesInRange.forEach((s) => {
      const items = asArray(s?.sale_items);
      let rev = 0, cost = 0;
      items.forEach((it) => {
        const qty = num(it?.qty);
        const price = num(it?.price);
        const cp = num(it?.cost_price != null ? it?.cost_price : it?.buy_price);
        rev += price * qty;
        cost += cp * qty;
      });
      if (!items.length) rev = num(s?.total); // fallback when no line items
      const profit = rev - cost;
      totRev += rev; totCost += cost;
      rows.push({
        date: fmtDate(s?.created_at),
        inv: s?.id ?? '-',
        customer: s?.customer_name || 'Walk-in',
        rev, cost, profit,
      });
    });
    const totProfit = totRev - totCost;
    const margin = totRev ? (totProfit / totRev) * 100 : 0;
    return { rows, totRev, totCost, totProfit, margin };
  }, [salesInRange]);

  // 4. Stock Quantity
  const stockQtyReport = useMemo(() => {
    const rows = asArray(inventory).map((p) => {
      const stock = num(p?.stock);
      const low = stock <= 10;
      return {
        name: p?.name || '-',
        category: p?.category || '-',
        stock,
        unit: p?.unit || '-',
        low,
      };
    });
    const totalUnits = rows.reduce((a, r) => a + r.stock, 0);
    const lowCount = rows.filter((r) => r.low).length;
    return { rows, skus: rows.length, totalUnits, lowCount };
  }, [inventory]);

  // 5. Stock Value
  const stockValReport = useMemo(() => {
    const rows = asArray(inventory).map((p) => {
      const stock = num(p?.stock);
      const cp = num(p?.cost_price != null ? p?.cost_price : p?.buy_price);
      const sp = num(p?.sale_price != null ? p?.sale_price : p?.price);
      return {
        name: p?.name || '-',
        stock,
        costVal: stock * cp,
        retailVal: stock * sp,
      };
    });
    const totalCost = rows.reduce((a, r) => a + r.costVal, 0);
    const totalRetail = rows.reduce((a, r) => a + r.retailVal, 0);
    return { rows, totalCost, totalRetail, potential: totalRetail - totalCost };
  }, [inventory]);

  // 6. Stock Adjustment
  const adjustReport = useMemo(() => {
    const rows = asArray(stockMoves)
      .filter((m) => String(m?.move_type || '').toLowerCase() === 'adjustment')
      .filter((m) => inRange(m?.created_at, from, to))
      .map((m) => ({
        date: fmtDate(m?.created_at),
        product: m?.product_name || '-',
        qty: num(m?.qty),
        reason: m?.reason || '-',
        by: m?.done_by || '-',
      }));
    return { rows };
  }, [stockMoves, from, to]);

  // 7. Stock Transfer
  const transferReport = useMemo(() => {
    const rows = asArray(stockMoves)
      .filter((m) => String(m?.move_type || '').toLowerCase() === 'transfer')
      .filter((m) => inRange(m?.created_at, from, to))
      .map((m) => ({
        date: fmtDate(m?.created_at),
        product: m?.product_name || '-',
        qty: num(m?.qty),
        from: m?.from_loc || '-',
        to: m?.to_loc || '-',
        by: m?.done_by || '-',
      }));
    return { rows };
  }, [stockMoves, from, to]);

  // 8. Recovery
  const recoveryReport = useMemo(() => {
    const rows = [];
    asArray(customers).forEach((c) => {
      asArray(c?.history).forEach((h) => {
        const type = String(h?.type || '').toLowerCase();
        const isPayment = type === 'debit' || type === 'payment' || type === 'received';
        if (!isPayment) return;
        if (!inRange(h?.date, from, to)) return;
        rows.push({
          date: fmtDate(h?.date),
          customer: c?.name || '-',
          amount: num(h?.amount),
          note: h?.note || '-',
          _ts: new Date(h?.date).getTime() || 0,
        });
      });
    });
    rows.sort((a, b) => a._ts - b._ts);
    const total = rows.reduce((a, r) => a + r.amount, 0);
    return { rows, total };
  }, [customers, from, to]);

  // 9. Area Wise
  const areaReport = useMemo(() => {
    const map = {};
    asArray(customers).forEach((c) => {
      const area = (c?.data && c.data.area) || c?.address || 'Unknown';
      if (!map[area]) map[area] = { area, parties: 0, balance: 0 };
      map[area].parties += 1;
      map[area].balance += num(c?.balance);
    });
    const rows = Object.values(map).sort((a, b) => b.balance - a.balance);
    const totalBalance = rows.reduce((a, r) => a + r.balance, 0);
    const totalParties = rows.reduce((a, r) => a + r.parties, 0);
    return { rows, totalBalance, totalParties };
  }, [customers]);

  // 10. Account (per customer)
  const acctMatches = useMemo(() => {
    const q = acctQuery.trim().toLowerCase();
    const list = asArray(customers);
    if (!q) return list.slice(0, 30);
    return list.filter((c) =>
      String(c?.name || '').toLowerCase().includes(q) ||
      String(c?.phone || '').toLowerCase().includes(q)
    ).slice(0, 30);
  }, [customers, acctQuery]);

  const acctReport = useMemo(() => {
    const cust = asArray(customers).find((c) => c?.id === acctId);
    if (!cust) return null;
    const hist = asArray(cust?.history).slice().sort((a, b) => {
      return (new Date(a?.date).getTime() || 0) - (new Date(b?.date).getTime() || 0);
    });
    let running = 0;
    const rows = hist.map((h) => {
      const type = String(h?.type || '').toLowerCase();
      const amt = num(h?.amount);
      // credit/sale increases balance owed, debit/payment decreases
      if (type === 'credit' || type === 'sale' || type === 'purchase') running += amt;
      else running -= amt;
      return {
        date: fmtDate(h?.date),
        note: h?.note || '-',
        type: h?.type || '-',
        amount: amt,
        running,
      };
    });
    return { cust, rows, balance: num(cust?.balance) };
  }, [customers, acctId]);

  // 11. General Journal
  const journalReport = useMemo(() => {
    const rows = [];
    salesInRange.forEach((s) => {
      rows.push({
        _ts: new Date(s?.created_at).getTime() || 0,
        date: fmtDate(s?.created_at),
        desc: `Sale invoice #${s?.id ?? '-'} (${s?.customer_name || 'Walk-in'})`,
        type: 'IN',
        amount: num(s?.total),
      });
    });
    asArray(expenses).filter((e) => inRange(e?.created_at, from, to)).forEach((e) => {
      rows.push({
        _ts: new Date(e?.created_at).getTime() || 0,
        date: fmtDate(e?.created_at),
        desc: `Expense: ${e?.title || '-'}${e?.category ? ' (' + e.category + ')' : ''}`,
        type: 'OUT',
        amount: num(e?.amount),
      });
    });
    recoveryReport.rows.forEach((r) => {
      rows.push({
        _ts: r._ts,
        date: r.date,
        desc: `Payment received from ${r.customer}${r.note && r.note !== '-' ? ' - ' + r.note : ''}`,
        type: 'IN',
        amount: r.amount,
      });
    });
    rows.sort((a, b) => a._ts - b._ts);
    const totalIn = rows.filter((r) => r.type === 'IN').reduce((a, r) => a + r.amount, 0);
    const totalOut = rows.filter((r) => r.type === 'OUT').reduce((a, r) => a + r.amount, 0);
    return { rows, totalIn, totalOut };
  }, [salesInRange, expenses, recoveryReport, from, to]);

  // 12. Business
  const businessReport = useMemo(() => {
    const totalSales = saleReport.totalSales;
    const totalPurchases = purchaseReport.totalPurchases;
    const totalExpenses = asArray(expenses)
      .filter((e) => inRange(e?.created_at, from, to))
      .reduce((a, e) => a + num(e?.amount), 0);
    const grossProfit = profitReport.totProfit;
    const net = totalSales - totalPurchases - totalExpenses;

    // top products
    const prodMap = {};
    salesInRange.forEach((s) => {
      asArray(s?.sale_items).forEach((it) => {
        const nm = it?.name || 'Unknown';
        if (!prodMap[nm]) prodMap[nm] = { name: nm, qty: 0, amount: 0 };
        prodMap[nm].qty += num(it?.qty);
        prodMap[nm].amount += num(it?.price) * num(it?.qty);
      });
    });
    const topProducts = Object.values(prodMap).sort((a, b) => b.qty - a.qty).slice(0, 5);

    // payment breakdown
    const payMap = {};
    salesInRange.forEach((s) => {
      const pm = s?.payment_method || 'Other';
      if (!payMap[pm]) payMap[pm] = { method: pm, count: 0, amount: 0 };
      payMap[pm].count += 1;
      payMap[pm].amount += num(s?.total);
    });
    const payments = Object.values(payMap).sort((a, b) => b.amount - a.amount);

    return { totalSales, totalPurchases, totalExpenses, grossProfit, net, topProducts, payments };
  }, [saleReport, purchaseReport, profitReport, expenses, salesInRange, from, to]);

  // 13. Search Description
  const searchReport = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return { rows: [] };
    const rows = [];
    asArray(sales).forEach((s) => {
      const hay = `${s?.product_name || ''} ${s?.customer_name || ''}`.toLowerCase();
      if (hay.includes(q)) {
        rows.push({
          type: 'Sale',
          date: fmtDate(s?.created_at),
          desc: `${s?.product_name || 'Sale'} - ${s?.customer_name || 'Walk-in'}`,
          amount: num(s?.total),
          _ts: new Date(s?.created_at).getTime() || 0,
        });
      }
    });
    asArray(expenses).forEach((e) => {
      if (String(e?.title || '').toLowerCase().includes(q)) {
        rows.push({
          type: 'Expense',
          date: fmtDate(e?.created_at),
          desc: e?.title || '-',
          amount: num(e?.amount),
          _ts: new Date(e?.created_at).getTime() || 0,
        });
      }
    });
    asArray(stockMoves).forEach((m) => {
      if (String(m?.reason || '').toLowerCase().includes(q)) {
        rows.push({
          type: `Stock ${m?.move_type || 'Move'}`,
          date: fmtDate(m?.created_at),
          desc: `${m?.product_name || '-'}: ${m?.reason || '-'}`,
          amount: num(m?.qty),
          _ts: new Date(m?.created_at).getTime() || 0,
        });
      }
    });
    asArray(orders).forEach((o) => {
      if (String(o?.party_name || '').toLowerCase().includes(q)) {
        rows.push({
          type: `Order (${o?.order_type || '-'})`,
          date: fmtDate(o?.created_at),
          desc: o?.party_name || '-',
          amount: num(o?.total),
          _ts: new Date(o?.created_at).getTime() || 0,
        });
      }
    });
    rows.sort((a, b) => b._ts - a._ts);
    return { rows };
  }, [searchQuery, sales, expenses, stockMoves, orders]);

  // ---------- Renderers ----------
  function renderActive() {
    switch (active) {
      case 'sale': {
        const r = saleReport;
        return (
          <ReportShell
            title="Sale Report" help={HELP.sale} showHelp={showHelp} onToggleHelp={() => setShowHelp(!showHelp)}
            onExport={() => downloadCSV('sale_report.csv', ['Date', 'Invoice #', 'Customer', 'Payment', 'Total'],
              r.rows.map((x) => [x.date, x.inv, x.customer, x.pay, x.total]))}
            cards={[
              { label: 'Total Sales', value: 'Rs ' + money(r.totalSales), accent: C.orange },
              { label: 'Number of Bills', value: money(r.bills), accent: C.copper },
              { label: 'Average Bill', value: 'Rs ' + money(Math.round(r.avg)), accent: C.gold },
            ]}
          >
            <Table
              headers={['Date', 'Invoice #', 'Customer', 'Payment', 'Total']}
              rows={r.rows.map((x) => [x.date, x.inv, x.customer, x.pay, 'Rs ' + money(x.total)])}
              totalsRow={r.rows.length ? ['Total', '', '', '', 'Rs ' + money(r.totalSales)] : null}
            />
          </ReportShell>
        );
      }
      case 'purchase': {
        const r = purchaseReport;
        return (
          <ReportShell
            title="Purchase Report" help={HELP.purchase} showHelp={showHelp} onToggleHelp={() => setShowHelp(!showHelp)}
            onExport={() => downloadCSV('purchase_report.csv', ['Date', 'Party', 'Items', 'Total', 'Status'],
              r.rows.map((x) => [x.date, x.party, x.count, x.total, x.status]))}
            cards={[
              { label: 'Total Purchases', value: 'Rs ' + money(r.totalPurchases), accent: C.orange },
              { label: 'Purchase Orders', value: money(r.rows.length), accent: C.copper },
            ]}
          >
            <Table
              headers={['Date', 'Party', 'Items', 'Total', 'Status']}
              rows={r.rows.map((x) => [x.date, x.party, x.count, 'Rs ' + money(x.total), x.status])}
              totalsRow={r.rows.length ? ['Total', '', '', 'Rs ' + money(r.totalPurchases), ''] : null}
            />
          </ReportShell>
        );
      }
      case 'profit': {
        const r = profitReport;
        return (
          <ReportShell
            title="Profit Report" help={HELP.profit} showHelp={showHelp} onToggleHelp={() => setShowHelp(!showHelp)}
            onExport={() => downloadCSV('profit_report.csv', ['Date', 'Invoice #', 'Customer', 'Revenue', 'Cost', 'Profit'],
              r.rows.map((x) => [x.date, x.inv, x.customer, x.rev, x.cost, x.profit]))}
            cards={[
              { label: 'Total Revenue', value: 'Rs ' + money(Math.round(r.totRev)), accent: C.orange },
              { label: 'Total Cost', value: 'Rs ' + money(Math.round(r.totCost)), accent: C.red },
              { label: 'Total Profit', value: 'Rs ' + money(Math.round(r.totProfit)), accent: C.copper },
              { label: 'Margin', value: r.margin.toFixed(1) + '%', accent: C.gold },
            ]}
          >
            <Table
              headers={['Date', 'Invoice #', 'Customer', 'Revenue', 'Cost', 'Profit']}
              rows={r.rows.map((x) => [x.date, x.inv, x.customer, 'Rs ' + money(Math.round(x.rev)), 'Rs ' + money(Math.round(x.cost)), 'Rs ' + money(Math.round(x.profit))])}
              totalsRow={r.rows.length ? ['Total', '', '', 'Rs ' + money(Math.round(r.totRev)), 'Rs ' + money(Math.round(r.totCost)), 'Rs ' + money(Math.round(r.totProfit))] : null}
            />
          </ReportShell>
        );
      }
      case 'stockQty': {
        const r = stockQtyReport;
        return (
          <ReportShell
            title="Stock Quantity Report" help={HELP.stockQty} showHelp={showHelp} onToggleHelp={() => setShowHelp(!showHelp)}
            onExport={() => downloadCSV('stock_quantity.csv', ['Product', 'Category', 'Stock', 'Unit', 'Low Stock'],
              r.rows.map((x) => [x.name, x.category, x.stock, x.unit, x.low ? 'YES' : 'NO']))}
            cards={[
              { label: 'Total SKUs', value: money(r.skus), accent: C.orange },
              { label: 'Total Units', value: money(r.totalUnits), accent: C.copper },
              { label: 'Low Stock Items', value: money(r.lowCount), accent: C.red },
            ]}
          >
            <Table
              headers={['Product', 'Category', 'Stock', 'Unit', 'Status']}
              rows={r.rows.map((x) => [
                x.name, x.category, money(x.stock), x.unit,
                x.low ? <span style={{ color: C.red, fontWeight: 700 }}>Low Stock</span> : <span style={{ color: '#16a34a', fontWeight: 600 }}>OK</span>,
              ])}
              totalsRow={r.rows.length ? ['Total', money(r.skus) + ' SKUs', money(r.totalUnits), '', money(r.lowCount) + ' low'] : null}
            />
          </ReportShell>
        );
      }
      case 'stockVal': {
        const r = stockValReport;
        return (
          <ReportShell
            title="Stock Value Report" help={HELP.stockVal} showHelp={showHelp} onToggleHelp={() => setShowHelp(!showHelp)}
            onExport={() => downloadCSV('stock_value.csv', ['Product', 'Stock', 'Cost Value', 'Retail Value'],
              r.rows.map((x) => [x.name, x.stock, x.costVal, x.retailVal]))}
            cards={[
              { label: 'Total Cost Value', value: 'Rs ' + money(Math.round(r.totalCost)), accent: C.red },
              { label: 'Total Retail Value', value: 'Rs ' + money(Math.round(r.totalRetail)), accent: C.orange },
              { label: 'Potential Profit', value: 'Rs ' + money(Math.round(r.potential)), accent: C.copper },
            ]}
          >
            <Table
              headers={['Product', 'Stock', 'Cost Value', 'Retail Value']}
              rows={r.rows.map((x) => [x.name, money(x.stock), 'Rs ' + money(Math.round(x.costVal)), 'Rs ' + money(Math.round(x.retailVal))])}
              totalsRow={r.rows.length ? ['Total', '', 'Rs ' + money(Math.round(r.totalCost)), 'Rs ' + money(Math.round(r.totalRetail))] : null}
            />
          </ReportShell>
        );
      }
      case 'adjust': {
        const r = adjustReport;
        return (
          <ReportShell
            title="Stock Adjustment Report" help={HELP.adjust} showHelp={showHelp} onToggleHelp={() => setShowHelp(!showHelp)}
            onExport={() => downloadCSV('stock_adjustments.csv', ['Date', 'Product', 'Qty', 'Reason', 'By'],
              r.rows.map((x) => [x.date, x.product, x.qty, x.reason, x.by]))}
            cards={[{ label: 'Adjustments', value: money(r.rows.length), accent: C.orange }]}
          >
            <Table
              headers={['Date', 'Product', 'Qty', 'Reason', 'By']}
              rows={r.rows.map((x) => [
                x.date, x.product,
                <span style={{ color: x.qty < 0 ? C.red : '#16a34a', fontWeight: 700 }}>{x.qty > 0 ? '+' : ''}{money(x.qty)}</span>,
                x.reason, x.by,
              ])}
            />
          </ReportShell>
        );
      }
      case 'transfer': {
        const r = transferReport;
        return (
          <ReportShell
            title="Stock Transfer Report" help={HELP.transfer} showHelp={showHelp} onToggleHelp={() => setShowHelp(!showHelp)}
            onExport={() => downloadCSV('stock_transfers.csv', ['Date', 'Product', 'Qty', 'From', 'To', 'By'],
              r.rows.map((x) => [x.date, x.product, x.qty, x.from, x.to, x.by]))}
            cards={[{ label: 'Transfers', value: money(r.rows.length), accent: C.orange }]}
          >
            <Table
              headers={['Date', 'Product', 'Qty', 'From', 'To', 'By']}
              rows={r.rows.map((x) => [x.date, x.product, money(x.qty), x.from, x.to, x.by])}
            />
          </ReportShell>
        );
      }
      case 'recovery': {
        const r = recoveryReport;
        return (
          <ReportShell
            title="Recovery Report" help={HELP.recovery} showHelp={showHelp} onToggleHelp={() => setShowHelp(!showHelp)}
            onExport={() => downloadCSV('recovery_report.csv', ['Date', 'Customer', 'Amount', 'Note'],
              r.rows.map((x) => [x.date, x.customer, x.amount, x.note]))}
            cards={[
              { label: 'Total Recovered', value: 'Rs ' + money(r.total), accent: C.orange },
              { label: 'Payments', value: money(r.rows.length), accent: C.copper },
            ]}
          >
            <Table
              headers={['Date', 'Customer', 'Amount', 'Note']}
              rows={r.rows.map((x) => [x.date, x.customer, 'Rs ' + money(x.amount), x.note])}
              totalsRow={r.rows.length ? ['Total', '', 'Rs ' + money(r.total), ''] : null}
            />
          </ReportShell>
        );
      }
      case 'area': {
        const r = areaReport;
        return (
          <ReportShell
            title="Area Wise Balance Report" help={HELP.area} showHelp={showHelp} onToggleHelp={() => setShowHelp(!showHelp)}
            onExport={() => downloadCSV('area_balance.csv', ['Area', 'Parties', 'Total Balance'],
              r.rows.map((x) => [x.area, x.parties, x.balance]))}
            cards={[
              { label: 'Total Areas', value: money(r.rows.length), accent: C.orange },
              { label: 'Total Parties', value: money(r.totalParties), accent: C.copper },
              { label: 'Total Outstanding', value: 'Rs ' + money(r.totalBalance), accent: C.red },
            ]}
          >
            <Table
              headers={['Area', 'Parties', 'Total Balance']}
              rows={r.rows.map((x) => [x.area, money(x.parties), 'Rs ' + money(x.balance)])}
              totalsRow={r.rows.length ? ['Total', money(r.totalParties), 'Rs ' + money(r.totalBalance)] : null}
            />
          </ReportShell>
        );
      }
      case 'account': {
        const r = acctReport;
        return (
          <ReportShell
            title="Account Report" help={HELP.account} showHelp={showHelp} onToggleHelp={() => setShowHelp(!showHelp)}
            onExport={r ? () => downloadCSV('account_' + (r.cust?.name || 'customer') + '.csv',
              ['Date', 'Note', 'Type', 'Amount', 'Running Balance'],
              r.rows.map((x) => [x.date, x.note, x.type, x.amount, x.running])) : null}
            cards={r ? [
              { label: 'Customer', value: r.cust?.name || '-', accent: C.orange },
              { label: 'Current Balance', value: 'Rs ' + money(r.balance), accent: C.red },
              { label: 'Transactions', value: money(r.rows.length), accent: C.copper },
            ] : []}
          >
            <div style={{ marginBottom: 16, position: 'relative', maxWidth: 420 }}>
              <input
                value={acctQuery}
                onChange={(e) => setAcctQuery(e.target.value)}
                placeholder="Search customer by name or phone..."
                style={{
                  width: '100%', padding: '10px 12px', borderRadius: 10, border: `1px solid ${C.border}`,
                  fontSize: 14, outline: 'none',
                }}
              />
              <div style={{
                marginTop: 8, maxHeight: 180, overflowY: 'auto', border: `1px solid ${C.border}`,
                borderRadius: 10, background: C.white,
              }}>
                {acctMatches.length === 0 && <div style={{ padding: 12, color: C.muted, fontSize: 13 }}>No customers found</div>}
                {acctMatches.map((c) => (
                  <div key={c?.id}
                    onClick={() => setAcctId(c?.id)}
                    style={{
                      padding: '9px 12px', cursor: 'pointer', fontSize: 13,
                      background: c?.id === acctId ? C.cream : C.white,
                      borderBottom: `1px solid ${C.border}`,
                      display: 'flex', justifyContent: 'space-between', gap: 8,
                    }}>
                    <span style={{ fontWeight: c?.id === acctId ? 700 : 500 }}>{c?.name || '-'}</span>
                    <span style={{ color: C.muted }}>{c?.phone || ''}</span>
                  </div>
                ))}
              </div>
            </div>
            {!r ? <EmptyState text="Select a customer to view their statement" /> : (
              <Table
                headers={['Date', 'Note', 'Type', 'Amount', 'Running Balance']}
                rows={r.rows.map((x) => [x.date, x.note, x.type, 'Rs ' + money(x.amount), 'Rs ' + money(x.running)])}
                totalsRow={r.rows.length ? ['', '', '', 'Current Balance', 'Rs ' + money(r.balance)] : null}
              />
            )}
          </ReportShell>
        );
      }
      case 'journal': {
        const r = journalReport;
        return (
          <ReportShell
            title="General Journal" help={HELP.journal} showHelp={showHelp} onToggleHelp={() => setShowHelp(!showHelp)}
            onExport={() => downloadCSV('general_journal.csv', ['Date', 'Description', 'Type', 'Amount'],
              r.rows.map((x) => [x.date, x.desc, x.type, x.amount]))}
            cards={[
              { label: 'Total IN', value: 'Rs ' + money(r.totalIn), accent: '#16a34a' },
              { label: 'Total OUT', value: 'Rs ' + money(r.totalOut), accent: C.red },
              { label: 'Net', value: 'Rs ' + money(r.totalIn - r.totalOut), accent: C.orange },
            ]}
          >
            <Table
              headers={['Date', 'Description', 'Type', 'Amount']}
              rows={r.rows.map((x) => [
                x.date, x.desc,
                <span style={{ color: x.type === 'IN' ? '#16a34a' : C.red, fontWeight: 700 }}>{x.type}</span>,
                'Rs ' + money(x.amount),
              ])}
              totalsRow={r.rows.length ? ['Net', '', '', 'Rs ' + money(r.totalIn - r.totalOut)] : null}
            />
          </ReportShell>
        );
      }
      case 'business': {
        const r = businessReport;
        return (
          <ReportShell
            title="Business Report" help={HELP.business} showHelp={showHelp} onToggleHelp={() => setShowHelp(!showHelp)}
            cards={[
              { label: 'Total Sales', value: 'Rs ' + money(Math.round(r.totalSales)), accent: C.orange },
              { label: 'Total Purchases', value: 'Rs ' + money(Math.round(r.totalPurchases)), accent: C.copper },
              { label: 'Total Expenses', value: 'Rs ' + money(Math.round(r.totalExpenses)), accent: C.red },
              { label: 'Gross Profit', value: 'Rs ' + money(Math.round(r.grossProfit)), accent: C.gold },
              { label: 'Net Result', value: 'Rs ' + money(Math.round(r.net)), accent: r.net >= 0 ? '#16a34a' : C.red },
            ]}
          >
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 18 }}>
              <div>
                <h3 style={{ fontSize: 16, color: C.darkMaroon, margin: '0 0 10px' }}>Top 5 Selling Products</h3>
                <Table
                  headers={['Product', 'Qty Sold', 'Amount']}
                  rows={r.topProducts.map((p) => [p.name, money(p.qty), 'Rs ' + money(Math.round(p.amount))])}
                />
              </div>
              <div>
                <h3 style={{ fontSize: 16, color: C.darkMaroon, margin: '0 0 10px' }}>Payment Method Breakdown</h3>
                <Table
                  headers={['Method', 'Bills', 'Amount']}
                  rows={r.payments.map((p) => [p.method, money(p.count), 'Rs ' + money(Math.round(p.amount))])}
                />
              </div>
            </div>
          </ReportShell>
        );
      }
      case 'search': {
        const r = searchReport;
        return (
          <ReportShell
            title="Search Description" help={HELP.search} showHelp={showHelp} onToggleHelp={() => setShowHelp(!showHelp)}
            onExport={() => downloadCSV('search_results.csv', ['Type', 'Date', 'Description', 'Amount'],
              r.rows.map((x) => [x.type, x.date, x.desc, x.amount]))}
            cards={[{ label: 'Matches Found', value: money(r.rows.length), accent: C.orange }]}
          >
            <div style={{ marginBottom: 16, maxWidth: 480 }}>
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Type a keyword (product, customer, expense, reason, party)..."
                style={{
                  width: '100%', padding: '10px 12px', borderRadius: 10, border: `1px solid ${C.border}`,
                  fontSize: 14, outline: 'none',
                }}
              />
            </div>
            {!searchQuery.trim() ? <EmptyState text="Enter a keyword to search across all records" /> : (
              <Table
                headers={['Type', 'Date', 'Description', 'Amount']}
                rows={r.rows.map((x) => [x.type, x.date, x.desc, money(x.amount)])}
              />
            )}
          </ReportShell>
        );
      }
      default:
        return <EmptyState />;
    }
  }

  // date-based reports show the date range row; these are all except pure stock / area / account snapshots
  const showDateRange = !['stockQty', 'stockVal', 'area', 'account'].includes(active);

  const quickBtn = (label, onClick) => (
    <button onClick={onClick} style={{
      background: C.white, border: `1px solid ${C.amber}`, color: C.copper,
      borderRadius: 8, padding: '7px 12px', fontSize: 12, fontWeight: 700, cursor: 'pointer',
    }}>{label}</button>
  );

  return (
    <div style={{ height: '100%', overflowY: 'auto', background: '#faf7f2', color: C.text }}>
      <div style={{
        padding: isMobile ? '14px 12px' : '20px 24px',
        display: 'flex', flexDirection: 'column', gap: 16,
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <div style={{
            width: 46, height: 46, borderRadius: 12, background: ORANGE_GRAD,
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <BarChart3 size={26} color="#fff" />
          </div>
          <div>
            <div style={{ fontSize: isMobile ? 20 : 26, fontWeight: 900, color: C.darkMaroon, lineHeight: 1.1 }}>REPORTS</div>
            <div style={{ fontSize: 13, color: C.muted, fontWeight: 600 }}>Tehzeeb Sweets &amp; Super Store</div>
          </div>
        </div>

        {/* Mobile pills */}
        {isMobile && (
          <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
            {REPORTS.map((rep) => {
              const Icon = rep.icon;
              const on = active === rep.id;
              return (
                <button key={rep.id} onClick={() => setActive(rep.id)} style={{
                  display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap',
                  background: on ? ORANGE_GRAD : C.white, color: on ? '#fff' : C.text,
                  border: `1px solid ${on ? 'transparent' : C.border}`, borderRadius: 999,
                  padding: '8px 14px', fontSize: 13, fontWeight: 700, cursor: 'pointer', flexShrink: 0,
                }}>
                  <Icon size={15} /> {rep.label}
                </button>
              );
            })}
          </div>
        )}

        {/* Date range row */}
        {showDateRange && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
            background: C.white, border: `1px solid ${C.border}`, borderRadius: 14, padding: '12px 16px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: C.copper, fontWeight: 700, fontSize: 13 }}>
              <Calendar size={16} /> Date Range
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 12, color: C.muted }}>From</span>
              <input type="date" value={from} onChange={(e) => setFrom(e.target.value)}
                style={{ padding: '7px 10px', borderRadius: 8, border: `1px solid ${C.border}`, fontSize: 13 }} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 12, color: C.muted }}>To</span>
              <input type="date" value={to} onChange={(e) => setTo(e.target.value)}
                style={{ padding: '7px 10px', borderRadius: 8, border: `1px solid ${C.border}`, fontSize: 13 }} />
            </div>
            <div style={{ display: 'flex', gap: 8, marginLeft: 'auto', flexWrap: 'wrap' }}>
              {quickBtn('Today', () => { setFrom(today()); setTo(today()); })}
              {quickBtn('This Week', () => { setFrom(firstOfWeek()); setTo(today()); })}
              {quickBtn('This Month', () => { setFrom(firstOfMonth()); setTo(today()); })}
              {quickBtn('This Year', () => { setFrom(firstOfYear()); setTo(today()); })}
            </div>
          </div>
        )}

        {/* Body: menu + report */}
        <div style={{ display: 'flex', gap: 18, alignItems: 'flex-start' }}>
          {/* Desktop left menu */}
          {!isMobile && (
            <div style={{
              width: 230, flexShrink: 0, background: C.white, border: `1px solid ${C.border}`,
              borderRadius: 14, padding: 8, position: 'sticky', top: 8,
            }}>
              {REPORTS.map((rep) => {
                const Icon = rep.icon;
                const on = active === rep.id;
                return (
                  <button key={rep.id} onClick={() => setActive(rep.id)} style={{
                    display: 'flex', alignItems: 'center', gap: 10, width: '100%', textAlign: 'left',
                    background: on ? ORANGE_GRAD : 'transparent', color: on ? '#fff' : C.text,
                    border: 'none', borderRadius: 10, padding: '10px 12px', fontSize: 14,
                    fontWeight: on ? 700 : 600, cursor: 'pointer', marginBottom: 2,
                  }}>
                    <Icon size={17} style={{ flexShrink: 0 }} /> {rep.label}
                  </button>
                );
              })}
            </div>
          )}

          {/* Report area */}
          <div style={{ flex: 1, minWidth: 0 }}>
            {loading ? (
              <div style={{ padding: 40, textAlign: 'center', color: C.muted }}>Loading reports...</div>
            ) : renderActive()}
          </div>
        </div>
      </div>
    </div>
  );
}

export default ReportsHub;
