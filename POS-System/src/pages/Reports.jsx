import React, { useState } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate, Link } from 'react-router-dom';
import {
    BarChart3,
    TrendingUp,
    PieChart,
    Download,
    Calendar,
    ChevronRight,
    FileText,
    Save,
    Loader2,
    ArrowUpRight,
    ArrowDownRight,
    Search,
    Wallet,
    ShoppingBag,
    Users,
    Activity,
    CreditCard,
    DollarSign,
    Box,
    Printer
} from 'lucide-react';
import { db } from '../database';
import toast from 'react-hot-toast';
import ThermalReceipt from '../components/ThermalReceipt';
import logo from '../assets/tehzeeb_logo.png';

const Reports = () => {
    const navigate = useNavigate();
    const { history } = useSelector(state => state.sales);
    const { items } = useSelector(state => state.inventory);
    const { activeShift } = useSelector(state => state.shift);
    const { user } = useSelector(state => state.auth);

    const [isSaving, setIsSaving] = useState(false);
    const today = new Date().toISOString().split('T')[0];
    const [dateFilter, setDateFilter] = useState(today);   // FROM date
    const [dateTo, setDateTo] = useState(today);           // TO date
    const [selectedSale, setSelectedSale] = useState(null);

    const [sales, setSales] = useState([]);
    const [loading, setLoading] = useState(false);

    // Fetch Sales for the selected date RANGE (from → to, inclusive).
    React.useEffect(() => {
        const fetchSales = async () => {
            setLoading(true);
            try {
                // Guard: if the user sets "to" before "from", swap them.
                const from = dateFilter <= dateTo ? dateFilter : dateTo;
                const to = dateFilter <= dateTo ? dateTo : dateFilter;

                const startOfDay = `${from}T00:00:00.000Z`;
                const endOfDay = `${to}T23:59:59.999Z`;

                const { data, error } = await db
                    .from('sales')
                    .select('*, sale_items(*)')
                    .gte('created_at', startOfDay)
                    .lte('created_at', endOfDay)
                    .order('created_at', { ascending: false })
                    .limit(5000);

                if (error) throw error;
                setSales(data || []);
            } catch (err) {
                console.error("Fetch Error:", err);
                toast.error("Failed to load sales data");
            } finally {
                setLoading(false);
            }
        };

        fetchSales();
    }, [dateFilter, dateTo]);

    const filteredSales = sales;

    const totalRevenue = filteredSales.reduce((acc, s) => acc + (s.total || 0), 0);
    const totalTransactions = filteredSales.length;
    
    // Profit Calculation (Admin Only)
    const isAdmin = user?.role === 'admin';
    const totalProfit = filteredSales.reduce((acc, sale) => {
        const saleProfit = (sale.sale_items || []).reduce((sum, item) => {
            const buyPrice = item.buy_price || 0;
            return sum + (((item.price || 0) - buyPrice) * (item.quantity || 0));
        }, 0);
        return acc + (saleProfit - (sale.discount || 0));
    }, 0);

    // Payment Mode Breakdown
    const paymentStats = { Cash: 0, Card: 0, Credit: 0, Online: 0 };
    filteredSales.forEach(s => {
        const method = s.payment_method || 'Cash';
        paymentStats[method] = (paymentStats[method] || 0) + (s.total || 0);
    });

    // Top Selling products & Category Insights
    const productStats = {};
    filteredSales.forEach(sale => {
        (sale.sale_items || []).forEach(item => {
            if (!productStats[item.name]) {
                productStats[item.name] = { qty: 0, revenue: 0 };
            }
            productStats[item.name].qty += (item.quantity || 0);
            productStats[item.name].revenue += ((item.price || 0) * (item.quantity || 0));
        });
    });
    const topSelling = Object.entries(productStats)
        .sort(([, a], [, b]) => b.qty - a.qty)
        .slice(0, 8);

    const handleSaveReport = async () => {
        setIsSaving(true);
        try {
            const reportData = {
                report_date: dateFilter,
                generated_by: user.name,
                metrics: {
                    revenue: totalRevenue,
                    transactions: totalTransactions,
                    top_products: topSelling,
                    payment_stats: paymentStats,
                    total_profit: isAdmin ? totalProfit : 'HIDDEN'
                },
                type: 'Daily Summary'
            };
            const { error } = await db
                .from('reports')
                .insert([reportData]);
            
            if (error) throw error;
            toast.success(`DSR for ${dateFilter} archived in Database!`);
        } catch (error) {
            console.error(error);
            toast.error("Failed to archive report.");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: '25px', backgroundColor: '#f8fafc', padding: '15px', overflowY: 'auto' }}>
            
            {/* 1. PROFESSIONAL HEADER */}
            <header style={{ 
                background: 'white', 
                padding: window.innerWidth <= 480 ? '20px' : '25px', 
                borderRadius: '16px', 
                display: 'flex', 
                flexDirection: window.innerWidth <= 768 ? 'column' : 'row',
                justifyContent: 'space-between', 
                alignItems: window.innerWidth <= 768 ? 'flex-start' : 'center', 
                boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', 
                border: '1px solid #e2e8f0',
                gap: '20px'
            }}>
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                        <div style={{ background: '#FFF7E6', padding: '8px', borderRadius: '10px' }}>
                            <BarChart3 size={24} color="#FF8A1E" />
                        </div>
                        <h2 style={{ fontSize: window.innerWidth <= 480 ? '1.4rem' : '1.8rem', fontWeight: 950, color: '#1e293b', letterSpacing: '-0.5px' }}>Daily Sales Report</h2>
                    </div>
                    <p style={{ fontSize: '0.9rem', color: '#64748b', fontWeight: 600 }}>Real-time business intelligence and financial reconciliation.</p>
                </div>

                <div className="no-print" style={{ display: 'flex', flexDirection: window.innerWidth <= 768 ? 'column' : 'row', gap: '12px', alignItems: window.innerWidth <= 768 ? 'stretch' : 'center', width: window.innerWidth <= 768 ? '100%' : 'auto', flexWrap: 'wrap' }}>
                    {/* FROM date */}
                    <div style={{ position: 'relative' }}>
                        <span style={{ position: 'absolute', left: '15px', top: '-8px', background: 'white', padding: '0 6px', fontSize: '0.6rem', fontWeight: 900, color: '#FF8A1E' }}>FROM</span>
                        <Calendar size={16} style={{ position: 'absolute', left: '14px', top: '16px', color: '#FF8A1E', zIndex: 1 }} />
                        <input
                            type="date"
                            max={dateTo}
                            style={{ paddingLeft: '40px', fontWeight: 800, border: '2px solid #e2e8f0', borderRadius: '12px', height: '48px', fontSize: '0.9rem', background: '#f8fafc' }}
                            value={dateFilter}
                            onChange={(e) => setDateFilter(e.target.value)}
                        />
                    </div>
                    {/* TO date */}
                    <div style={{ position: 'relative' }}>
                        <span style={{ position: 'absolute', left: '15px', top: '-8px', background: 'white', padding: '0 6px', fontSize: '0.6rem', fontWeight: 900, color: '#FF8A1E' }}>TO</span>
                        <Calendar size={16} style={{ position: 'absolute', left: '14px', top: '16px', color: '#FF8A1E', zIndex: 1 }} />
                        <input
                            type="date"
                            min={dateFilter}
                            style={{ paddingLeft: '40px', fontWeight: 800, border: '2px solid #e2e8f0', borderRadius: '12px', height: '48px', fontSize: '0.9rem', background: '#f8fafc' }}
                            value={dateTo}
                            onChange={(e) => setDateTo(e.target.value)}
                        />
                    </div>

                    {/* PRINT */}
                    <button
                        onClick={() => window.print()}
                        disabled={filteredSales.length === 0}
                        style={{ height: '48px', padding: '0 20px', background: filteredSales.length === 0 ? '#e2e8f0' : '#F7941D', color: 'white', border: 'none', borderRadius: '12px', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', cursor: filteredSales.length === 0 ? 'not-allowed' : 'pointer' }}
                    >
                        <Printer size={18} /> PRINT
                    </button>

                    {/* ARCHIVE */}
                    <button
                        onClick={handleSaveReport}
                        disabled={isSaving || filteredSales.length === 0}
                        style={{ height: '48px', padding: '0 20px', background: '#0f172a', color: 'white', border: 'none', borderRadius: '12px', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', cursor: 'pointer', boxShadow: '0 10px 15px -3px rgba(15, 23, 42, 0.2)' }}
                    >
                        {isSaving ? <Loader2 size={20} className="animate-spin" /> : <Save size={20} />}
                        ARCHIVE DSR
                    </button>
                </div>
            </header>

            {/* 2. STATS OVERVIEW CARDS */}
            <div style={{ 
                display: 'grid', 
                gridTemplateColumns: window.innerWidth <= 1024 ? (window.innerWidth <= 600 ? '1fr' : '1fr 1fr') : 'repeat(4, 1fr)', 
                gap: '20px' 
            }}>
                
                {/* REVENUE CARD */}
                <div style={{ background: 'white', padding: '25px', borderRadius: '20px', border: '1px solid #e2e8f0', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
                        <div style={{ background: '#f0f9ff', padding: '10px', borderRadius: '12px' }}><DollarSign size={20} color="#0ea5e9" /></div>
                        <span style={{ fontSize: '0.75rem', fontWeight: 900, color: '#0ea5e9', background: '#f0f9ff', padding: '4px 10px', borderRadius: '20px' }}>REVENUE</span>
                    </div>
                    <h3 style={{ fontSize: window.innerWidth <= 480 ? '1.5rem' : '1.8rem', fontWeight: 950, color: '#0f172a', marginBottom: '5px' }}>Rs {totalRevenue.toLocaleString()}</h3>
                    <p style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 700 }}>Total cash & credit inflow</p>
                </div>

                {/* PROFIT CARD (ADMIN) */}
                {isAdmin ? (
                    <Link to="/profit" style={{ textDecoration: 'none' }}>
                        <div style={{ background: '#7A1E0C', padding: '25px', borderRadius: '20px', boxShadow: '0 20px 25px -5px rgba(6, 78, 59, 0.2)', transition: 'transform 0.2s', cursor: 'pointer' }} onMouseOver={e => e.currentTarget.style.transform = 'translateY(-5px)'} onMouseOut={e => e.currentTarget.style.transform = 'translateY(0)'}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
                                <div style={{ background: 'rgba(255,255,255,0.1)', padding: '10px', borderRadius: '12px' }}><TrendingUp size={20} color="#FFB84D" /></div>
                                <span style={{ fontSize: '0.75rem', fontWeight: 900, color: '#FFB84D', background: 'rgba(52, 211, 153, 0.1)', padding: '4px 10px', borderRadius: '20px' }}>NET PROFIT</span>
                            </div>
                            <h3 style={{ fontSize: window.innerWidth <= 480 ? '1.5rem' : '1.8rem', fontWeight: 950, color: 'white', marginBottom: '5px' }}>Rs {totalProfit.toLocaleString()}</h3>
                            <p style={{ fontSize: '0.8rem', color: '#FCE1A8', fontWeight: 700 }}>Click for detailed analysis</p>
                        </div>
                    </Link>
                ) : (
                    <div style={{ background: 'white', padding: '25px', borderRadius: '20px', border: '1px solid #e2e8f0' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
                            <div style={{ background: '#f5f3ff', padding: '10px', borderRadius: '12px' }}><ShoppingBag size={20} color="#8b5cf6" /></div>
                            <span style={{ fontSize: '0.75rem', fontWeight: 900, color: '#8b5cf6', background: '#f5f3ff', padding: '4px 10px', borderRadius: '20px' }}>SALES</span>
                        </div>
                        <h3 style={{ fontSize: window.innerWidth <= 480 ? '1.5rem' : '1.8rem', fontWeight: 950, color: '#0f172a', marginBottom: '5px' }}>{totalTransactions}</h3>
                        <p style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 700 }}>Total success invoices</p>
                    </div>
                )}

                {/* PAYMENT MODE CARD */}
                <div style={{ background: 'white', padding: '25px', borderRadius: '20px', border: '1px solid #e2e8f0' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
                        <div style={{ background: '#fff7ed', padding: '10px', borderRadius: '12px' }}><Wallet size={20} color="#f59e0b" /></div>
                        <span style={{ fontSize: '0.75rem', fontWeight: 900, color: '#f59e0b', background: '#fff7ed', padding: '4px 10px', borderRadius: '20px' }}>CASH FLOW</span>
                    </div>
                    <h3 style={{ fontSize: window.innerWidth <= 480 ? '1.3rem' : '1.4rem', fontWeight: 950, color: '#0f172a', marginBottom: '5px' }}>Rs {paymentStats.Cash.toLocaleString()}</h3>
                    <p style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 700 }}>Pure cash collections</p>
                </div>

                {/* KHATTA CARD */}
                <div style={{ background: 'white', padding: '25px', borderRadius: '20px', border: '1px solid #e2e8f0' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
                        <div style={{ background: '#fef2f2', padding: '10px', borderRadius: '12px' }}><Users size={20} color="#ef4444" /></div>
                        <span style={{ fontSize: '0.75rem', fontWeight: 900, color: '#ef4444', background: '#fef2f2', padding: '4px 10px', borderRadius: '20px' }}>CREDIT SALES</span>
                    </div>
                    <h3 style={{ fontSize: window.innerWidth <= 480 ? '1.3rem' : '1.4rem', fontWeight: 950, color: '#0f172a', marginBottom: '5px' }}>Rs {paymentStats.Credit.toLocaleString()}</h3>
                    <p style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 700 }}>Added to customer accounts</p>
                </div>
            </div>

            {/* 3. DETAILED CONTENT AREA */}
            <div style={{ 
                display: 'flex', 
                flexDirection: window.innerWidth <= 1024 ? 'column' : 'row', 
                gap: '25px', 
                flex: 1 
            }}>
                
                {/* BILLS TABLE */}
                <div style={{ background: 'white', borderRadius: '24px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
                    <div style={{ padding: '20px 30px', borderBottom: '1px solid #f1f5f9', background: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h4 style={{ fontSize: '1.1rem', fontWeight: 950, color: '#1e293b' }}>Transactional Audit Trail</h4>
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <div style={{ padding: '6px 12px', background: '#f8fafc', borderRadius: '8px', fontSize: '0.75rem', fontWeight: 800, color: '#64748b' }}>
                                {filteredSales.length} INVOICES FOUND
                            </div>
                        </div>
                    </div>

                    <div style={{ flex: 1, overflowY: 'auto', padding: '0 10px' }}>
                        <div style={{ overflowX: 'auto' }}>
                            <table className="erp-table" style={{ border: 'none' }}>
                            <thead style={{ position: 'sticky', top: 0, zIndex: 10, background: 'white' }}>
                                <tr style={{ borderBottom: '2px solid #f1f5f9' }}>
                                    <th style={{ padding: '15px 20px', textAlign: 'left', fontSize: '0.75rem', fontWeight: 900, color: '#64748b' }}>ID</th>
                                    <th style={{ padding: '15px 20px', textAlign: 'left', fontSize: '0.75rem', fontWeight: 900, color: '#64748b' }}>CLIENT</th>
                                    <th style={{ padding: '15px 20px', textAlign: 'left', fontSize: '0.75rem', fontWeight: 900, color: '#64748b' }}>OPERATOR</th>
                                    <th style={{ padding: '15px 20px', textAlign: 'left', fontSize: '0.75rem', fontWeight: 900, color: '#64748b' }}>ITEMS</th>
                                    <th style={{ padding: '15px 20px', textAlign: 'left', fontSize: '0.75rem', fontWeight: 900, color: '#64748b' }}>MODE</th>
                                    <th style={{ padding: '15px 20px', textAlign: 'right', fontSize: '0.75rem', fontWeight: 900, color: '#64748b' }}>TOTAL</th>
                                    {isAdmin && <th style={{ padding: '15px 20px', textAlign: 'right', fontSize: '0.75rem', fontWeight: 900, color: '#64748b' }}>PROFIT</th>}
                                </tr>
                            </thead>
                             <tbody>
                                {filteredSales.map(sale => {
                                    const saleProfit = (sale.sale_items || []).reduce((sum, item) => {
                                        const buyPrice = item.buy_price || 0;
                                        return sum + (((item.price || 0) - buyPrice) * (item.quantity || 0));
                                    }, 0) - (sale.discount || 0);

                                    return (
                                        <tr key={sale.id} onMouseOver={e => e.currentTarget.style.background = '#f8fafc'} onMouseOut={e => e.currentTarget.style.background = 'transparent'}>
                                            <td 
                                                onClick={() => setSelectedSale(sale)}
                                                style={{ 
                                                    padding: '12px 10px', 
                                                    fontWeight: 900, 
                                                    color: '#FF8A1E', 
                                                    cursor: 'pointer', 
                                                    textDecoration: 'underline', 
                                                    fontSize: '0.7rem',
                                                    transition: 'all 0.2s'
                                                }}
                                            >
                                                #{sale.invoice_no ? (100000 + parseInt(sale.invoice_no)).toString() : sale.id?.toString().slice(-6).toUpperCase()}
                                            </td>
                                            <td style={{ fontWeight: 700, color: '#334155', fontSize: '0.75rem' }}>{sale.customer_name || '—'}</td>
                                            <td style={{ fontWeight: 800, color: '#64748b', fontSize: '0.75rem' }}>{sale.seller_name?.toUpperCase() || 'SYSTEM'}</td>
                                            <td style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 600 }}>
                                                {(sale.sale_items || []).map(i => i.name).join(', ')}
                                            </td>
                                            <td>
                                                <span style={{ 
                                                    fontSize: '0.6rem', 
                                                    fontWeight: 900, 
                                                    padding: '4px 8px', 
                                                    background: sale.payment_method === 'Cash' ? '#FFF7E6' : sale.payment_method === 'Credit' ? '#fff1f1' : '#f0f9ff', 
                                                    borderRadius: '6px', 
                                                    color: sale.payment_method === 'Cash' ? '#F7941D' : sale.payment_method === 'Credit' ? '#ef4444' : '#0ea5e9'
                                                }}>
                                                    {sale.payment_method?.toUpperCase()}
                                                </span>
                                            </td>
                                            <td style={{ textAlign: 'right', fontWeight: 950, color: '#1e293b', fontSize: '0.8rem' }}>Rs {sale.total.toLocaleString()}</td>
                                            {isAdmin && <td style={{ textAlign: 'right', fontWeight: 900, color: '#F7941D', fontSize: '0.8rem' }}>Rs {saleProfit.toLocaleString()}</td>}
                                        </tr>
                                    );
                                })}
                            </tbody>
                            </table>
                        </div>
                        {filteredSales.length === 0 && (
                            <div style={{ textAlign: 'center', padding: '100px 0' }}>
                                <div style={{ background: '#f8fafc', width: '80px', height: '80px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                                    <Search size={30} color="#cbd5e1" />
                                </div>
                                <h3 style={{ color: '#94a3b8', fontWeight: 800 }}>No reports for this date</h3>
                            </div>
                        )}
                    </div>
                </div>

                {/* RIGHT SIDEBAR: ANALYTICS */}
                <div style={{ 
                    display: 'flex', 
                    flexDirection: 'column', 
                    gap: '25px',
                    width: window.innerWidth <= 1024 ? '100%' : '380px'
                }}>
                    
                    {/* TOP PRODUCTS */}
                    <div style={{ background: 'white', padding: '30px', borderRadius: '24px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '25px' }}>
                            <div style={{ background: '#fff7ed', padding: '8px', borderRadius: '8px' }}><Box size={18} color="#f59e0b" /></div>
                            <h4 style={{ fontSize: '1rem', fontWeight: 950, color: '#1e293b' }}>Fast Moving Items (Top 5)</h4>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                            {topSelling.slice(0, 5).map(([name, data], idx) => (
                                <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <div style={{ width: '32px', height: '32px', background: '#f8fafc', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: 900, color: '#94a3b8', border: '1px solid #f1f5f9' }}>
                                        {idx + 1}
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', fontWeight: 800, color: '#334155', marginBottom: '4px' }}>
                                            <span>{name}</span>
                                            <span>{data.qty} Units</span>
                                        </div>
                                        <div style={{ height: '6px', background: '#f1f5f9', borderRadius: '10px' }}>
                                            <div style={{ height: '100%', background: '#f59e0b', borderRadius: '10px', width: `${(data.qty / topSelling[0][1].qty) * 100}%` }}></div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                            {topSelling.length === 0 && <p style={{ textAlign: 'center', color: '#94a3b8', fontSize: '0.8rem' }}>No data available.</p>}
                        </div>
                    </div>

                    {/* PIE CHART SECTION */}
                    <div style={{ background: 'white', padding: '30px', borderRadius: '24px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '25px' }}>
                            <div style={{ background: '#f5f3ff', padding: '8px', borderRadius: '8px' }}><PieChart size={18} color="#8b5cf6" /></div>
                            <h4 style={{ fontSize: '1rem', fontWeight: 950, color: '#1e293b' }}>Payment Distribution</h4>
                        </div>

                        {totalRevenue > 0 ? (
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}>
                                {/* CIRCULAR PIE CHART (CSS CONIC-GRADIENT) */}
                                <div style={{ 
                                    width: '180px', 
                                    height: '180px', 
                                    borderRadius: '50%', 
                                    background: `conic-gradient(
                                        #FF8A1E 0% ${(paymentStats.Cash / totalRevenue) * 100}%, 
                                        #0ea5e9 ${(paymentStats.Cash / totalRevenue) * 100}% ${((paymentStats.Cash + paymentStats.Card) / totalRevenue) * 100}%, 
                                        #ef4444 ${((paymentStats.Cash + paymentStats.Card) / totalRevenue) * 100}% 100%
                                    )`,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    boxShadow: 'inset 0 0 20px rgba(0,0,0,0.05), 0 10px 15px -3px rgba(0,0,0,0.1)',
                                    position: 'relative'
                                }}>
                                    <div style={{ width: '100px', height: '100px', background: 'white', borderRadius: '50%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
                                        <span style={{ fontSize: '0.65rem', fontWeight: 900, color: '#94a3b8' }}>INFLOW</span>
                                        <span style={{ fontSize: '0.9rem', fontWeight: 950, color: '#1e293b' }}>100%</span>
                                    </div>
                                </div>

                                {/* LEGEND */}
                                <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem', fontWeight: 700 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <div style={{ width: '12px', height: '12px', borderRadius: '3px', background: '#FF8A1E' }}></div>
                                            <span style={{ color: '#64748b' }}>CASH</span>
                                        </div>
                                        <span style={{ color: '#1e293b' }}>{((paymentStats.Cash / totalRevenue) * 100).toFixed(0)}%</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem', fontWeight: 700 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <div style={{ width: '12px', height: '12px', borderRadius: '3px', background: '#0ea5e9' }}></div>
                                            <span style={{ color: '#64748b' }}>CARD</span>
                                        </div>
                                        <span style={{ color: '#1e293b' }}>{((paymentStats.Card / totalRevenue) * 100).toFixed(0)}%</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem', fontWeight: 700 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <div style={{ width: '12px', height: '12px', borderRadius: '3px', background: '#ef4444' }}></div>
                                            <span style={{ color: '#64748b' }}>CREDIT</span>
                                        </div>
                                        <span style={{ color: '#1e293b' }}>{((paymentStats.Credit / totalRevenue) * 100).toFixed(0)}%</span>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div style={{ textAlign: 'center', padding: '40px 0', color: '#94a3b8' }}>
                                <PieChart size={40} style={{ opacity: 0.1, marginBottom: '10px' }} />
                                <p style={{ fontSize: '0.8rem', fontWeight: 800 }}>No data for chart</p>
                            </div>
                        )}
                    </div>

                    {/* PROFIT ANALYSIS CHART */}
                    {isAdmin && (
                        <div style={{ background: 'white', padding: '30px', borderRadius: '24px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '25px' }}>
                                <div style={{ background: '#FFF7E6', padding: '8px', borderRadius: '8px' }}><Activity size={18} color="#FF8A1E" /></div>
                                <h4 style={{ fontSize: '1rem', fontWeight: 950, color: '#1e293b' }}>Profit vs Revenue</h4>
                            </div>

                            {totalRevenue > 0 ? (
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}>
                                    <div style={{ 
                                        width: '180px', 
                                        height: '180px', 
                                        borderRadius: '50%', 
                                        background: `conic-gradient(
                                            #F7941D 0% ${(totalProfit / totalRevenue) * 100}%, 
                                            #f1f5f9 ${(totalProfit / totalRevenue) * 100}% 100%
                                        )`,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        boxShadow: 'inset 0 0 20px rgba(0,0,0,0.05)'
                                    }}>
                                        <div style={{ width: '100px', height: '100px', background: 'white', borderRadius: '50%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                                            <span style={{ fontSize: '1rem', fontWeight: 950, color: '#F7941D' }}>{((totalProfit / totalRevenue) * 100).toFixed(1)}%</span>
                                            <span style={{ fontSize: '0.6rem', fontWeight: 800, color: '#94a3b8' }}>MARGIN</span>
                                        </div>
                                    </div>
                                    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', fontWeight: 700 }}>
                                            <span>NET PROFIT:</span>
                                            <span style={{ color: '#F7941D' }}>Rs {totalProfit.toLocaleString()}</span>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', fontWeight: 700 }}>
                                            <span>TOTAL REVENUE:</span>
                                            <span style={{ color: '#1e293b' }}>Rs {totalRevenue.toLocaleString()}</span>
                                        </div>
                                    </div>
                                </div>
                            ) : null}
                        </div>
                    )}

                    {/* PRODUCT PERFORMANCE RANKING */}
                    <div style={{ background: 'white', padding: '30px', borderRadius: '24px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
                         <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '25px' }}>
                            <div style={{ background: '#fff7ed', padding: '8px', borderRadius: '8px' }}><ShoppingBag size={18} color="#f59e0b" /></div>
                            <h4 style={{ fontSize: '1rem', fontWeight: 950, color: '#1e293b' }}>Product Sales Insights</h4>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {topSelling.map(([name, data], idx) => (
                                <div 
                                    key={idx} 
                                    onClick={() => navigate(`/insights/${name}`)}
                                    style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #f1f5f9', cursor: 'pointer' }}
                                >
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#1e293b' }}>{name}</div>
                                        <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 700 }}>
                                            {data.qty} units | <span style={{ color: '#F7941D' }}>Rs {data.revenue.toLocaleString()}</span>
                                        </div>
                                    </div>
                                    <ChevronRight size={16} color="#cbd5e1" />
                                </div>
                            ))}
                        </div>
                    </div>

                </div>

            </div>

            {/* INVOICE PREVIEW MODAL */}
            {selectedSale && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.8)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: window.innerWidth <= 480 ? '0' : '20px' }}>
                    <div style={{ background: 'white', borderRadius: window.innerWidth <= 480 ? '0' : '28px', position: 'relative', width: '380px', height: window.innerWidth <= 480 ? '100%' : 'auto', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)', overflow: 'hidden', animation: 'modalIn 0.3s ease-out', display: 'flex', flexDirection: 'column' }}>
                        <div style={{ padding: '20px 25px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontWeight: 950, fontSize: '0.9rem', color: '#1e293b' }}>INVOICE AUDIT DATA</span>
                            <button 
                                onClick={() => setSelectedSale(null)} 
                                style={{ background: 'white', border: '1px solid #e2e8f0', width: '30px', height: '30px', borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, color: '#64748b' }}
                            >✕</button>
                        </div>
                        
                        <div style={{ padding: '20px', background: '#f8fafc', borderRadius: '16px', border: '1px solid #e2e8f0', flex: 1, overflowY: 'auto' }}>
                            <div style={{ textAlign: 'center', marginBottom: '20px', borderBottom: '2px solid #e2e8f0', paddingBottom: '15px' }}>
                                <img src={logo} alt="Store Logo" style={{ height: '50px', marginBottom: '10px', filter: 'grayscale(1)' }} />
                                <h2 style={{ fontSize: '1.2rem', fontWeight: 950, color: '#0f172a', marginBottom: '5px' }}>INVOICE DETAILS</h2>
                                <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#FF8A1E', background: '#FFF7E6', padding: '4px 12px', borderRadius: '20px' }}>
                                    #{selectedSale?.id?.toString().toUpperCase()}
                                </span>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '20px', fontSize: '0.8rem' }}>
                                <div>
                                    <span style={{ color: '#64748b', fontWeight: 700, display: 'block' }}>CUSTOMER</span>
                                    <span style={{ fontWeight: 900, color: '#1e293b' }}>{selectedSale.customer_name?.toUpperCase() || '—'}</span>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <span style={{ color: '#64748b', fontWeight: 700, display: 'block' }}>DATE & TIME</span>
                                    <span style={{ fontWeight: 900, color: '#1e293b' }}>{new Date(selectedSale.created_at).toLocaleString()}</span>
                                </div>
                                <div>
                                    <span style={{ color: '#64748b', fontWeight: 700, display: 'block' }}>OPERATOR</span>
                                    <span style={{ fontWeight: 900, color: '#1e293b' }}>{selectedSale.seller_name?.toUpperCase() || 'SYSTEM'}</span>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <span style={{ color: '#64748b', fontWeight: 700, display: 'block' }}>PAYMENT MODE</span>
                                    <span style={{ fontWeight: 900, color: '#FF8A1E' }}>{selectedSale.payment_method?.toUpperCase()}</span>
                                </div>
                            </div>

                            <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '20px' }}>
                                <thead>
                                    <tr style={{ background: '#f1f5f9' }}>
                                        <th style={{ padding: '10px', textAlign: 'left', fontSize: '0.7rem', fontWeight: 900, color: '#64748b' }}>ID</th>
                                        <th style={{ padding: '10px', textAlign: 'center', fontSize: '0.7rem', fontWeight: 900, color: '#64748b' }}>QTY</th>
                                        <th style={{ padding: '10px', textAlign: 'right', fontSize: '0.7rem', fontWeight: 900, color: '#64748b' }}>TOTAL</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {(selectedSale.sale_items || []).map((item, idx) => (
                                        <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                            <td style={{ padding: '12px 10px', fontSize: '0.8rem', fontWeight: 700 }}>{item.name}</td>
                                            <td style={{ padding: '12px 10px', textAlign: 'center', fontSize: '0.8rem', fontWeight: 800 }}>{item.quantity}</td>
                                            <td style={{ padding: '12px 10px', textAlign: 'right', fontSize: '0.8rem', fontWeight: 900 }}>Rs {((item.price || 0) * (item.quantity || 0)).toLocaleString()}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>

                            <div style={{ background: '#0f172a', padding: '15px', borderRadius: '12px', color: 'white' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.8rem' }}>
                                    <span style={{ color: '#94a3b8' }}>SUBTOTAL:</span>
                                    <span>Rs {selectedSale.subtotal?.toLocaleString()}</span>
                                </div>
                                {selectedSale.discount > 0 && (
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.8rem', color: '#fb7185' }}>
                                        <span>DISCOUNT:</span>
                                        <span>-Rs {selectedSale.discount?.toLocaleString()}</span>
                                    </div>
                                )}
                                <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '8px' }}>
                                    <span style={{ fontWeight: 900 }}>GRAND TOTAL:</span>
                                    <span style={{ fontWeight: 950, color: '#FFB84D', fontSize: '1.1rem' }}>Rs {selectedSale.total?.toLocaleString()}</span>
                                </div>
                            </div>
                        </div>

                        <div style={{ padding: '20px 25px', background: 'white', borderTop: '1px solid #e2e8f0' }}>
                            <button onClick={() => setSelectedSale(null)} style={{ width: '100%', padding: '12px', background: '#F7941D', color: 'white', border: 'none', borderRadius: '12px', fontWeight: 900, cursor: 'pointer', fontSize: '0.85rem' }}>
                                CLOSE AUDIT VIEW
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ============ PRINT-ONLY CLEAN REPORT ============ */}
            {/* Hidden on screen (.print-only), rendered only when printing. */}
            <div className="print-only">
                <div style={{ textAlign: 'center', borderBottom: '2px solid #000', paddingBottom: '10px', marginBottom: '16px' }}>
                    <img src={logo} alt="logo" style={{ height: '55px', marginBottom: '6px' }} />
                    <h1 style={{ fontSize: '20px', fontWeight: 900, margin: 0 }}>Tehzeeb Sweets & Super Store</h1>
                    <p style={{ fontSize: '13px', margin: '2px 0', fontWeight: 700 }}>Daily Sales Report (DSR)</p>
                    <p style={{ fontSize: '12px', margin: 0 }}>
                        {dateFilter === dateTo
                            ? `Date: ${new Date(dateFilter).toLocaleDateString()}`
                            : `Period: ${new Date(dateFilter).toLocaleDateString()} — ${new Date(dateTo).toLocaleDateString()}`}
                    </p>
                    <p style={{ fontSize: '11px', margin: '2px 0', color: '#333' }}>
                        Generated: {new Date().toLocaleString()} &nbsp;|&nbsp; By: {user?.name || 'System'}
                    </p>
                </div>

                {/* Summary */}
                <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '16px', fontSize: '12px' }}>
                    <tbody>
                        <tr>
                            <td style={{ border: '1px solid #000', padding: '8px', fontWeight: 800 }}>Total Revenue</td>
                            <td style={{ border: '1px solid #000', padding: '8px', textAlign: 'right', fontWeight: 900 }}>Rs {totalRevenue.toLocaleString()}</td>
                            <td style={{ border: '1px solid #000', padding: '8px', fontWeight: 800 }}>Total Transactions</td>
                            <td style={{ border: '1px solid #000', padding: '8px', textAlign: 'right', fontWeight: 900 }}>{totalTransactions}</td>
                        </tr>
                        {isAdmin && (
                            <tr>
                                <td style={{ border: '1px solid #000', padding: '8px', fontWeight: 800 }}>Total Profit</td>
                                <td style={{ border: '1px solid #000', padding: '8px', textAlign: 'right', fontWeight: 900 }}>Rs {totalProfit.toLocaleString()}</td>
                                <td style={{ border: '1px solid #000', padding: '8px', fontWeight: 800 }}>Avg / Invoice</td>
                                <td style={{ border: '1px solid #000', padding: '8px', textAlign: 'right', fontWeight: 900 }}>Rs {totalTransactions ? Math.round(totalRevenue / totalTransactions).toLocaleString() : 0}</td>
                            </tr>
                        )}
                    </tbody>
                </table>

                {/* Payment breakdown */}
                <h3 style={{ fontSize: '13px', fontWeight: 900, margin: '0 0 6px' }}>Payment Breakdown</h3>
                <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '16px', fontSize: '12px' }}>
                    <tbody>
                        {Object.entries(paymentStats).map(([m, v]) => (
                            <tr key={m}>
                                <td style={{ border: '1px solid #000', padding: '6px 8px', fontWeight: 700 }}>{m}</td>
                                <td style={{ border: '1px solid #000', padding: '6px 8px', textAlign: 'right', fontWeight: 800 }}>Rs {v.toLocaleString()}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                {/* Invoice list */}
                <h3 style={{ fontSize: '13px', fontWeight: 900, margin: '0 0 6px' }}>Invoices ({filteredSales.length})</h3>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
                    <thead>
                        <tr style={{ background: '#eee' }}>
                            <th style={{ border: '1px solid #000', padding: '6px', textAlign: 'left' }}>#</th>
                            <th style={{ border: '1px solid #000', padding: '6px', textAlign: 'left' }}>Time</th>
                            <th style={{ border: '1px solid #000', padding: '6px', textAlign: 'left' }}>Customer</th>
                            <th style={{ border: '1px solid #000', padding: '6px', textAlign: 'left' }}>Payment</th>
                            <th style={{ border: '1px solid #000', padding: '6px', textAlign: 'right' }}>Amount</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredSales.map((s, i) => (
                            <tr key={s.id}>
                                <td style={{ border: '1px solid #000', padding: '5px 6px' }}>{s.invoice_no ? (100000 + parseInt(s.invoice_no)) : (i + 1)}</td>
                                <td style={{ border: '1px solid #000', padding: '5px 6px' }}>{new Date(s.created_at).toLocaleString()}</td>
                                <td style={{ border: '1px solid #000', padding: '5px 6px' }}>{s.customer_name || 'Walk-in'}</td>
                                <td style={{ border: '1px solid #000', padding: '5px 6px' }}>{s.payment_method || 'Cash'}</td>
                                <td style={{ border: '1px solid #000', padding: '5px 6px', textAlign: 'right', fontWeight: 700 }}>Rs {(s.total || 0).toLocaleString()}</td>
                            </tr>
                        ))}
                        <tr style={{ background: '#eee' }}>
                            <td colSpan={4} style={{ border: '1px solid #000', padding: '6px', textAlign: 'right', fontWeight: 900 }}>TOTAL</td>
                            <td style={{ border: '1px solid #000', padding: '6px', textAlign: 'right', fontWeight: 900 }}>Rs {totalRevenue.toLocaleString()}</td>
                        </tr>
                    </tbody>
                </table>

                <p style={{ textAlign: 'center', fontSize: '10px', marginTop: '20px', color: '#333' }}>
                    — Computer generated report · Tehzeeb Sweets & Super Store —
                </p>
            </div>
        </div>
    );
};

export default Reports;
