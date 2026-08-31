import React, { useState, useMemo, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { db } from '../database';
import Pagination from '../components/Pagination';
import { 
    Database, 
    Search, 
    Filter, 
    TrendingDown, 
    TrendingUp, 
    Package, 
    Calendar,
    ArrowUpRight,
    ArrowDownRight,
    Activity,
    Info,
    ChevronDown,
    ChevronUp
} from 'lucide-react';

const StockRecords = () => {
    const inventory = useSelector(state => state.inventory.items);
    const reduxSales = useSelector(state => state.sales.history || []);
    const [sales, setSales] = useState(reduxSales);

    // Load recent sales WITH their line items so per-product daily sales works
    // (Redux history often lacks embedded sale_items). Falls back to Redux.
    useEffect(() => {
        let alive = true;
        (async () => {
            try {
                const { data } = await db.from('sales').select('*, sale_items(*)')
                    .is('deleted_at', null).order('id', { ascending: false }).limit(3000);
                if (alive && data && data.length) setSales(data);
            } catch (e) { /* keep redux fallback */ }
        })();
        return () => { alive = false; };
    }, []);
    
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('All');
    const [timeRange, setTimeRange] = useState('All Time');
    const [expandedProduct, setExpandedProduct] = useState(null);
    const [page, setPage] = useState(1);
    const PAGE_SIZE = 100;

    const categories = ['All', ...new Set(inventory.map(i => i.category).filter(Boolean))];

    // Calculate Daily Sales for each product based on filtered time range
    const productStats = useMemo(() => {
        const stats = {};
        if (!sales) return stats;

        const now = new Date();
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const startOfYesterday = new Date(startOfToday);
        startOfYesterday.setDate(startOfYesterday.getDate() - 1);
        const startOfWeek = new Date(startOfToday);
        startOfWeek.setDate(startOfWeek.getDate() - 7);
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

        const filteredSales = sales.filter(sale => {
            // Exclude returned sales — their units must not count as "sold".
            if (sale.status === 'Returned') return false;

            const saleDate = new Date(sale.created_at);
            if (timeRange === 'Today') return saleDate >= startOfToday;
            if (timeRange === 'Yesterday') return saleDate >= startOfYesterday && saleDate < startOfToday;
            if (timeRange === 'This Week') return saleDate >= startOfWeek;
            if (timeRange === 'This Month') return saleDate >= startOfMonth;
            return true;
        });

        filteredSales.forEach(sale => {
            const date = new Date(sale.created_at).toLocaleDateString();
            const lineItems = sale.sale_items || sale.items || [];
            lineItems.forEach(item => {
                // sale_items are stored with qty + product_id (older/other code may
                // use quantity / inventory_id) — accept all so counts always show.
                const pid = item.product_id ?? item.inventory_id ?? item.id;
                const q = Number(item.qty ?? item.quantity ?? 0) || 0;
                if (pid == null) return;
                if (!stats[pid]) stats[pid] = { dailySales: {}, totalSold: 0 };
                if (!stats[pid].dailySales[date]) stats[pid].dailySales[date] = 0;
                stats[pid].dailySales[date] += q;
                stats[pid].totalSold += q;
            });
        });
        
        return stats;
    }, [sales, timeRange]); // recompute when the time range changes (was missing)

    const filteredInventory = useMemo(() => inventory.filter(item => {
        const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                             String(item.id).includes(searchTerm);
        const matchesCat = selectedCategory === 'All' || item.category === selectedCategory;
        return matchesSearch && matchesCat;
    }), [inventory, searchTerm, selectedCategory]);

    const totalPages = Math.max(1, Math.ceil(filteredInventory.length / PAGE_SIZE));
    const safePage = Math.min(page, totalPages);
    const pagedInventory = useMemo(
        () => filteredInventory.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE),
        [filteredInventory, safePage]
    );
    React.useEffect(() => { setPage(1); }, [searchTerm, selectedCategory, timeRange]);

    // Summary Totals
    const totalStockValue = inventory.reduce((acc, item) => acc + (item.stock * (item.buy_price || 0)), 0);
    const totalFilteredUnitsSold = Object.values(productStats).reduce((acc, stat) => acc + stat.totalSold, 0);

    return (
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: '20px', padding: '25px', backgroundColor: '#f8fafc' }}>
            
            {/* HEADER */}
            <header style={{ 
                display: 'flex', 
                flexDirection: window.innerWidth <= 768 ? 'column' : 'row',
                justifyContent: 'space-between', 
                alignItems: window.innerWidth <= 768 ? 'flex-start' : 'center', 
                background: 'white', 
                padding: window.innerWidth <= 480 ? '15px' : '20px 25px', 
                borderRadius: '16px', 
                border: '1px solid #e2e8f0',
                gap: '20px'
            }}>
                <div>
                    <h2 style={{ fontSize: window.innerWidth <= 480 ? '1.2rem' : '1.6rem', fontWeight: 950, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <Database size={window.innerWidth <= 480 ? 24 : 28} color="#6366f1" /> STOCK RECORDS & AUDIT
                    </h2>
                    <p style={{ color: '#64748b', fontWeight: 600, fontSize: '0.8rem' }}>Comprehensive tracking of stock movements and daily sales</p>
                </div>
                
                <div style={{ display: 'flex', gap: '15px', width: window.innerWidth <= 768 ? '100%' : 'auto', justifyContent: 'space-between' }}>
                    <div style={{ textAlign: 'left', paddingRight: '15px', borderRight: window.innerWidth <= 768 ? 'none' : '1px solid #e2e8f0' }}>
                        <p style={{ fontSize: '0.65rem', fontWeight: 800, color: '#94a3b8' }}>TOTAL INVENTORY VALUE</p>
                        <h4 style={{ fontSize: '1rem', fontWeight: 900, color: '#1e293b' }}>Rs {totalStockValue.toLocaleString()}</h4>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                        <p style={{ fontSize: '0.65rem', fontWeight: 800, color: '#94a3b8' }}>{timeRange.toUpperCase()} SOLD</p>
                        <h4 style={{ fontSize: '1rem', fontWeight: 900, color: '#6366f1' }}>{totalFilteredUnitsSold.toLocaleString()} Units</h4>
                    </div>
                </div>
            </header>

            {/* FILTERS */}
            <div style={{ 
                display: 'flex', 
                flexDirection: window.innerWidth <= 768 ? 'column' : 'row',
                gap: '15px', 
                background: 'white', 
                padding: '15px', 
                borderRadius: '16px', 
                border: '1px solid #e2e8f0' 
            }}>
                <div style={{ position: 'relative', flex: 1 }}>
                    <Search size={18} style={{ position: 'absolute', left: '15px', top: '12px', color: '#94a3b8' }} />
                    <input 
                        type="text"
                        placeholder="Search product by name or ID..."
                        style={{ width: '100%', padding: '12px 15px 12px 45px', border: '1px solid #e2e8f0', borderRadius: '10px', fontSize: '0.9rem', fontWeight: 600 }}
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>
                
                <div style={{ display: 'flex', gap: '10px' }}>
                    <select 
                        style={{ flex: 1, padding: '10px 15px', border: '1px solid #e2e8f0', borderRadius: '10px', fontWeight: 700, background: '#f8fafc', color: '#475569' }}
                        value={selectedCategory}
                        onChange={e => setSelectedCategory(e.target.value)}
                    >
                        {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                    </select>

                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '8px', padding: '0 15px', border: '1px solid #e2e8f0', borderRadius: '10px', background: '#eef2ff' }}>
                        <Calendar size={18} color="#6366f1" />
                        <select 
                            style={{ width: '100%', border: 'none', background: 'transparent', height: '100%', fontWeight: 700, color: '#4338ca', outline: 'none', padding: '10px 0' }}
                            value={timeRange}
                            onChange={e => setTimeRange(e.target.value)}
                        >
                            <option value="All Time">All Time</option>
                            <option value="Today">Today</option>
                            <option value="Yesterday">Yesterday</option>
                            <option value="This Week">Last 7 Days</option>
                            <option value="This Month">This Month</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* DATA TABLE */}
            <div style={{ flex: 1, background: 'white', borderRadius: '16px', border: '1px solid #e2e8f0', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                <div style={{ overflowX: 'auto', flex: 1 }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '800px' }}>
                        <thead style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0', position: 'sticky', top: 0, zIndex: 10 }}>
                            <tr>
                                <th style={{ padding: '15px 25px', fontSize: '0.75rem', fontWeight: 800, color: '#64748b' }}>PRODUCT DETAILS</th>
                                <th style={{ padding: '15px 25px', fontSize: '0.75rem', fontWeight: 800, color: '#64748b' }}>OPENING STOCK</th>
                                <th style={{ padding: '15px 25px', fontSize: '0.75rem', fontWeight: 800, color: '#64748b' }}>CURRENT STOCK</th>
                                <th style={{ padding: '15px 25px', fontSize: '0.75rem', fontWeight: 800, color: '#64748b' }}>{timeRange === 'All Time' ? 'TOTAL SOLD' : `SOLD (${timeRange.toUpperCase()})`}</th>
                                <th style={{ padding: '15px 25px', fontSize: '0.75rem', fontWeight: 800, color: '#64748b' }}>STATUS</th>
                                <th style={{ padding: '15px 25px', fontSize: '0.75rem', fontWeight: 800, color: '#64748b', textAlign: 'right' }}>ANALYSIS</th>
                            </tr>
                        </thead>
                        <tbody>
                            {pagedInventory.map(item => {
                                const isExpanded = expandedProduct === item.id;
                                const dailySales = productStats[item.id]?.dailySales || {};
                                const salesDates = Object.keys(dailySales).sort((a,b) => new Date(b) - new Date(a));

                                return (
                                    <React.Fragment key={item.id}>
                                        <tr style={{ borderBottom: '1px solid #f1f5f9', cursor: 'pointer', background: isExpanded ? '#f5f3ff' : 'transparent' }} onClick={() => setExpandedProduct(isExpanded ? null : item.id)}>
                                            <td style={{ padding: '15px 25px' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                    <div style={{ padding: '8px', background: '#f1f5f9', borderRadius: '8px' }}><Package size={18} color="#6366f1" /></div>
                                                    <div>
                                                        <p style={{ fontWeight: 800, color: '#1e293b', fontSize: '0.9rem' }}>{item.name}</p>
                                                        <p style={{ fontSize: '0.7rem', fontWeight: 600, color: '#94a3b8' }}>ID: {item.id} | {item.category}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td style={{ padding: '15px 25px', fontWeight: 700, color: '#64748b' }}>{item.initial_stock || 0}</td>
                                            <td style={{ padding: '15px 25px' }}>
                                                <span style={{ fontWeight: 900, color: item.stock < 10 ? '#ef4444' : '#1e293b' }}>{item.stock}</span>
                                            </td>
                                            <td style={{ padding: '15px 25px', fontWeight: 800, color: '#6366f1' }}>{productStats[item.id]?.totalSold || 0}</td>
                                            <td style={{ padding: '15px 25px' }}>
                                                <span style={{ padding: '4px 10px', borderRadius: '20px', fontSize: '0.7rem', fontWeight: 800, background: item.stock > 0 ? '#f0fdf4' : '#fff1f1', color: item.stock > 0 ? '#F7941D' : '#ef4444' }}>
                                                    {item.stock > 0 ? 'IN STOCK' : 'OUT OF STOCK'}
                                                </span>
                                            </td>
                                            <td style={{ padding: '15px 25px', textAlign: 'right' }}>
                                                {isExpanded ? <ChevronUp size={20} color="#6366f1" /> : <ChevronDown size={20} color="#94a3b8" />}
                                            </td>
                                        </tr>
                                        
                                        {/* EXPANDED DETAILS */}
                                        {isExpanded && (
                                            <tr>
                                                <td colSpan="6" style={{ padding: '0', background: '#f8fafc' }}>
                                                    <div style={{ padding: '25px', display: window.innerWidth <= 1024 ? 'flex' : 'grid', flexDirection: 'column', gridTemplateColumns: window.innerWidth <= 1024 ? 'none' : '1fr 1fr', gap: '25px' }}>
                                                        
                                                        {/* LEFT: DAILY SALES LOG */}
                                                        <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '15px' }}>
                                                            <h5 style={{ fontSize: '0.8rem', fontWeight: 900, color: '#1e293b', marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                                <TrendingDown size={16} color="#ef4444" /> DAILY SALES HISTORY
                                                            </h5>
                                                            <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                                                                {salesDates.length > 0 ? salesDates.map(date => (
                                                                    <div key={date} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #f1f5f9' }}>
                                                                        <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#64748b' }}>{date}</span>
                                                                        <span style={{ fontSize: '0.85rem', fontWeight: 900, color: '#ef4444' }}>-{dailySales[date]} Units</span>
                                                                    </div>
                                                                )) : (
                                                                    <p style={{ padding: '20px', textAlign: 'center', color: '#94a3b8', fontSize: '0.8rem', fontWeight: 600 }}>No sales recorded yet</p>
                                                                )}
                                                            </div>
                                                        </div>

                                                        {/* RIGHT: RESTOCK LOG */}
                                                        <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '15px' }}>
                                                            <h5 style={{ fontSize: '0.8rem', fontWeight: 900, color: '#1e293b', marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                                <TrendingUp size={16} color="#F7941D" /> RESTOCKING LOG
                                                            </h5>
                                                            <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                                                                {(item.restock_history || []).length > 0 ? item.restock_history.map((log, idx) => (
                                                                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #f1f5f9' }}>
                                                                        <div>
                                                                            <p style={{ fontSize: '0.8rem', fontWeight: 800, color: '#1e293b' }}>+{log.quantity} Units</p>
                                                                            <p style={{ fontSize: '0.65rem', fontWeight: 600, color: '#94a3b8' }}>{new Date(log.date).toLocaleDateString()}</p>
                                                                        </div>
                                                                        <div style={{ textAlign: 'right' }}>
                                                                            <p style={{ fontSize: '0.8rem', fontWeight: 800, color: '#F7941D' }}>Rs {log.buy_price}</p>
                                                                        </div>
                                                                    </div>
                                                                )) : (
                                                                    <p style={{ padding: '20px', textAlign: 'center', color: '#94a3b8', fontSize: '0.8rem', fontWeight: 600 }}>No restocks recorded yet</p>
                                                                )}
                                                            </div>
                                                        </div>

                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </React.Fragment>
                                );
                            })}
                        </tbody>
                    </table>
                    <Pagination
                        page={safePage}
                        totalPages={totalPages}
                        totalItems={filteredInventory.length}
                        pageSize={PAGE_SIZE}
                        onChange={setPage}
                    />
                </div>
            </div>
        </div>
    );
};

export default StockRecords;
