import React, { useMemo, useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import ThermalReceipt from '../components/ThermalReceipt';
import logo from '../assets/tehzeeb_logo.png';
import {
    ArrowLeft,
    TrendingUp,
    Calendar,
    Clock,
    ShoppingBag,
    DollarSign,
    Target,
    Activity,
    ChevronRight,
    Search,
    Package
} from 'lucide-react';
import { db } from '../database';
import toast from 'react-hot-toast';

const ProductInsights = () => {
    const { productName } = useParams();
    const navigate = useNavigate();
    const [previewSale, setPreviewSale] = useState(null);
    const { user } = useSelector(state => state.auth);
    const isAdmin = user?.role === 'admin';

    const { history: allSales } = useSelector(state => state.sales);
    const { items: inventory } = useSelector(state => state.inventory);

    const [transactions, setTransactions] = useState([]);
    const [inventoryItem, setInventoryItem] = useState(null);
    const [loading, setLoading] = useState(false);

    // Fetch All Transactions for this product locally from Redux
    useEffect(() => {
        if (!productName) return;
        setLoading(true);
        try {
            const pName = productName.toLowerCase();
            
            // 1. Build transactions from local Sales History
            const newTransactions = [];
            (allSales || []).forEach(sale => {
                const items = sale.sale_items || sale.items || [];
                items.forEach(item => {
                    if (item.name?.toLowerCase().includes(pName)) {
                        newTransactions.push({
                            ...item,
                            sales: {
                                id: sale.id,
                                invoice_no: sale.invoice_no,
                                status: sale.status,
                                created_at: sale.created_at || sale.date,
                                customer_name: sale.customer_name || sale.customerName,
                                seller_name: sale.seller_name || sale.sellerName
                            }
                        });
                    }
                });
            });
            setTransactions(newTransactions);

            // 2. Fetch live inventory data for stock from local Redux Inventory
            const invData = (inventory || []).find(i => i.name?.toLowerCase().includes(pName));
            if (invData) {
                setInventoryItem(invData);
            }
        } catch (err) {
            console.error("Insight Fetch Error:", err);
        } finally {
            setLoading(false);
        }
    }, [productName, allSales, inventory]);

    const fetchFullSale = async (saleId) => {
        try {
            const { data, error } = await db
                .from('sales')
                .select('*, sale_items(*)')
                .eq('id', saleId)
                .single();
            if (error) throw error;
            setPreviewSale(data);
        } catch (err) {
            console.error("Fetch Sale Error:", err);
            toast.error("Failed to load receipt");
        }
    };

    // 1. Data Aggregation for this specific product
    const productStats = useMemo(() => {
        const stats = {
            totalUnits: 0,
            returnedUnits: 0,
            totalRevenue: 0,
            totalProfit: 0,
            totalTax: 0,
            avgDailySales: 0,
            transactions: [],
            dailyDistribution: {},
            timeDistribution: { morning: 0, afternoon: 0, evening: 0 },
            operators: {},
        };

        transactions.forEach(item => {
            const sale = item.sales;
            if (!sale) return;

            const saleDate = sale.created_at?.split('T')[0] || 'Unknown';
            const saleTime = sale.created_at?.split('T')[1] || '';

            const qty = Number(item.quantity) || 0;
            const revenue = (Number(item.price) || 0) * qty;
            const profit = ((Number(item.price) || 0) - (Number(item.buy_price) || 0)) * qty;

            if (sale.status === 'Returned') {
                stats.returnedUnits += qty;
            } else {
                stats.totalUnits += qty;
                stats.totalRevenue += revenue;
                stats.totalProfit += profit;

                stats.dailyDistribution[saleDate] = (stats.dailyDistribution[saleDate] || 0) + qty;
                const op = sale.seller_name || 'System';
                stats.operators[op] = (stats.operators[op] || 0) + qty;

                const hour = parseInt(saleTime.split(':')[0]) || 0;
                if (hour < 13) stats.timeDistribution.morning++;
                else if (hour < 17) stats.timeDistribution.afternoon++;
                else stats.timeDistribution.evening++;
            }

            stats.transactions.push({
                id: sale.id,
                invoice_no: sale.invoice_no,
                date: saleDate,
                time: saleTime.split('.')[0],
                qty: qty,
                status: sale.status,
                customer: sale.customer_name || '—',
                price: item.price,
                operator: sale.seller_name || 'System',
                total: revenue
            });
        });

        const uniqueDays = Object.keys(stats.dailyDistribution).length;
        stats.avgDailySales = uniqueDays ? (stats.totalUnits / uniqueDays).toFixed(1) : 0;

        return stats;
    }, [transactions, productName]);

    const totalRestocked = (inventoryItem?.history || []).reduce((a, b) => a + Number(b.quantity), 0) || 0;

    return (
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: '25px', background: '#f8fafc', padding: '20px', overflowY: 'auto' }}>

            {/* NAVIGATION HEADER */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                    <button onClick={() => navigate(-1)} style={{ background: 'white', border: '1px solid #e2e8f0', padding: '10px', borderRadius: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                        <ArrowLeft size={20} color="#0f172a" />
                    </button>
                    <div>
                        <h2 style={{ fontSize: '1.5rem', fontWeight: 950, color: '#0f172a', letterSpacing: '-0.5px' }}>{productName} <span style={{ color: '#ec4899', fontWeight: 900 }}>360° Vision</span></h2>
                        <p style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 600 }}>End-to-end stock cycle and return analytics. <span style={{ color: '#FF8A1E' }}>({transactions.length} Records Found)</span></p>
                    </div>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                    <div style={{ padding: '8px 20px', background: '#0f172a', color: 'white', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 900 }}>
                        ID: {inventoryItem?.id}
                    </div>
                </div>
            </div>

            {/* STOCK CYCLE SUMMARY */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '15px' }}>
                <div style={{ background: 'white', padding: '20px', borderRadius: '20px', border: '1px solid #e2e8f0', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                    <span style={{ fontSize: '0.6rem', fontWeight: 900, color: '#64748b' }}>TOTAL RESTOCKED (+)</span>
                    <h3 style={{ fontSize: '1.4rem', fontWeight: 950, color: '#f59e0b' }}>{totalRestocked} <small style={{ fontSize: '0.7rem' }}>Units</small></h3>
                </div>
                <div style={{ background: 'white', padding: '20px', borderRadius: '20px', border: '1px solid #e2e8f0' }}>
                    <span style={{ fontSize: '0.6rem', fontWeight: 900, color: '#64748b' }}>TOTAL SOLD (-)</span>
                    <h3 style={{ fontSize: '1.4rem', fontWeight: 950, color: '#0f172a' }}>{productStats.totalUnits} <small style={{ fontSize: '0.7rem' }}>Units</small></h3>
                </div>
                <div style={{ background: '#fdf2f2', padding: '20px', borderRadius: '20px', border: '1px solid #fecaca' }}>
                    <span style={{ fontSize: '0.6rem', fontWeight: 900, color: '#991b1b' }}>TOTAL RETURNED (↺)</span>
                    <h3 style={{ fontSize: '1.4rem', fontWeight: 950, color: '#dc2626' }}>{productStats.returnedUnits} <small style={{ fontSize: '0.7rem' }}>Units</small></h3>
                </div>
                <div style={{ background: '#FFF7E6', padding: '20px', borderRadius: '20px', border: '1px solid #FF8A1E' }}>
                    <span style={{ fontSize: '0.6rem', fontWeight: 900, color: '#8B2500' }}>CURRENT STOCK (=)</span>
                    <h3 style={{ fontSize: '1.4rem', fontWeight: 950, color: '#F7941D' }}>{inventoryItem?.stock || 0} <small style={{ fontSize: '0.7rem' }}>Units</small></h3>
                </div>
                <div style={{ background: 'white', padding: '20px', borderRadius: '20px', border: '1px solid #e2e8f0' }}>
                    <span style={{ fontSize: '0.6rem', fontWeight: 900, color: '#64748b' }}>VALUATION (STOCK)</span>
                    <h3 style={{ fontSize: '1.4rem', fontWeight: 950, color: '#0f172a' }}>Rs {((inventoryItem?.stock || 0) * (inventoryItem?.price || 0)).toLocaleString()}</h3>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 400px', gap: '25px' }}>

                {/* 1. TRANSACTION AUDIT LOG WITH RETURN STATUS */}
                <div style={{ background: 'white', borderRadius: '24px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                    <div style={{ padding: '20px 30px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h4 style={{ fontWeight: 950 }}>Full Document Registry</h4>
                        <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 800 }}>INCLUDES RETURNS & SLIPS</div>
                    </div>
                    <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                        <table className="erp-table">
                            <thead style={{ position: 'sticky', top: 0, background: '#f8fafc', zIndex: 10 }}>
                                <tr>
                                    <th>ID</th>
                                    <th>CLIENT</th>
                                    <th>OPERATOR</th>
                                    <th>STATUS</th>
                                    <th style={{ textAlign: 'center' }}>QTY</th>
                                    <th style={{ textAlign: 'right' }}>UNIT PRICE</th>
                                    <th style={{ textAlign: 'right' }}>NET VALUE</th>
                                </tr>
                            </thead>
                            <tbody>
                                {[...productStats.transactions].reverse().map((t, idx) => (
                                    <tr key={idx} style={{ opacity: t.status === 'Returned' ? 0.6 : 1 }}>
                                        <td 
                                            onClick={() => fetchFullSale(t.id)}
                                            onMouseOver={e => e.currentTarget.style.color = '#F7941D'}
                                            onMouseOut={e => e.currentTarget.style.color = '#FF8A1E'}
                                            style={{ 
                                                fontSize: '0.75rem', 
                                                fontWeight: 900, 
                                                color: '#FF8A1E', 
                                                cursor: 'pointer', 
                                                textDecoration: 'underline',
                                                transition: 'color 0.2s'
                                            }}
                                        >
                                            #{t.invoice_no ? (100000 + parseInt(t.invoice_no)).toString() : t.id.toString().slice(-6).toUpperCase()}
                                        </td>
                                        <td style={{ fontSize: '0.75rem', fontWeight: 800 }}>{t.customer || '—'}</td>
                                        <td style={{ fontSize: '0.7rem', fontWeight: 700, color: '#64748b' }}>{t.operator}</td>
                                        <td>
                                            <span style={{
                                                fontSize: '0.6rem',
                                                background: t.status === 'Returned' ? '#fee2e2' : '#FFF7E6',
                                                color: t.status === 'Returned' ? '#991b1b' : '#8B2500',
                                                padding: '2px 8px',
                                                borderRadius: '4px',
                                                fontWeight: 900
                                            }}>
                                                {t.status === 'Returned' ? 'RETURNED' : 'SLIP PRINTED'}
                                            </span>
                                        </td>
                                        <td style={{ textAlign: 'center', fontWeight: 900 }}>{t.qty}</td>
                                        <td style={{ textAlign: 'right', fontWeight: 700, color: '#64748b' }}>Rs {t.price.toLocaleString()}</td>
                                        <td style={{ textAlign: 'right', fontWeight: 950 }}>Rs {t.total.toLocaleString()}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* 2. RECONCILIATION & PERFORMANCE */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>

                    {/* OPERATOR BREAKDOWN */}
                    <div style={{ background: 'white', padding: '30px', borderRadius: '24px', border: '1px solid #e2e8f0' }}>
                        <h4 style={{ fontWeight: 950, marginBottom: '20px' }}>Document Distribution</h4>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '15px', background: '#f8fafc', borderRadius: '12px' }}>
                                <span style={{ fontSize: '0.8rem', fontWeight: 700 }}>Total Invoices Generated:</span>
                                <span style={{ fontWeight: 950 }}>{productStats.transactions.length} Slips</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '15px', background: '#fff1f1', borderRadius: '12px' }}>
                                <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#991b1b' }}>Total Credit Returns:</span>
                                <span style={{ fontWeight: 950, color: '#991b1b' }}>{productStats.returnedUnits} Units</span>
                            </div>
                        </div>
                    </div>

                    {/* FINANCIAL SUMMARY */}
                    <div style={{ background: '#0f172a', padding: '30px', borderRadius: '24px', color: 'white' }}>
                        <h4 style={{ fontWeight: 900, marginBottom: '20px', color: '#c084fc' }}>Financial Audit Summary</h4>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                            <div style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '10px' }}>
                                <span style={{ fontSize: '0.7rem', color: '#94a3b8', display: 'block' }}>REVENUE SHARE</span>
                                <span style={{ fontSize: '1.2rem', fontWeight: 900 }}>Rs {productStats.totalRevenue.toLocaleString()}</span>
                            </div>
                            <div style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '10px' }}>
                                <span style={{ fontSize: '0.7rem', color: '#94a3b8', display: 'block' }}>COLLECTED TAX</span>
                                <span style={{ fontSize: '1.2rem', fontWeight: 900, color: '#38bdf8' }}>Rs {productStats.totalTax.toLocaleString()}</span>
                            </div>
                            {isAdmin && (
                                <div>
                                    <span style={{ fontSize: '0.7rem', color: '#94a3b8', display: 'block' }}>TOTAL PROFIT CONTRIBUTED</span>
                                    <span style={{ fontSize: '1.2rem', fontWeight: 900, color: '#FFB84D' }}>Rs {productStats.totalProfit.toLocaleString()}</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* RESTOCK LOG (PURCHASE HISTORY) */}
                    <div style={{ background: 'white', padding: '30px', borderRadius: '24px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                            <h4 style={{ fontWeight: 950, display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <Package size={18} color="#f59e0b" /> RESTOCK LOG
                            </h4>
                            <div style={{ background: '#fffbeb', padding: '4px 12px', borderRadius: '20px', fontSize: '0.65rem', fontWeight: 900, color: '#92400e', border: '1px solid #fef3c7' }}>
                                LTR INFLOW: {totalRestocked}
                            </div>
                        </div>
                        
                        <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                            {inventoryItem?.restockHistory?.length > 0 ? (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                    {[...inventoryItem.restockHistory].reverse().map((r, i) => (
                                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #f1f5f9' }}>
                                            <div style={{ background: 'white', width: '35px', height: '35px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                <Calendar size={14} color="#94a3b8" />
                                            </div>
                                            <div style={{ flex: 1 }}>
                                                <div style={{ fontSize: '0.8rem', fontWeight: 900 }}>+{r.quantity} UNITS ADDED</div>
                                                <div style={{ fontSize: '0.65rem', color: '#94a3b8', fontWeight: 700 }}>
                                                    {new Date(r.date).toLocaleDateString()} | {new Date(r.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p style={{ textAlign: 'center', color: '#cbd5e1', fontSize: '0.75rem', padding: '20px' }}>No restocks recorded yet.</p>
                            )}
                        </div>
                    </div>

                </div>

            </div>

            {/* INVOICE PREVIEW MODAL */}
            {previewSale && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.8)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '20px' }}>
                    <div style={{ background: 'white', borderRadius: '28px', position: 'relative', width: '380px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)', overflow: 'hidden', animation: 'modalIn 0.3s ease-out' }}>
                        <div style={{ padding: '20px 25px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontWeight: 950, fontSize: '0.9rem', color: '#1e293b' }}>PRODUCT SALE AUDIT</span>
                            <button 
                                onClick={() => setPreviewSale(null)} 
                                style={{ background: 'white', border: '1px solid #e2e8f0', width: '30px', height: '30px', borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, color: '#64748b' }}
                            >✕</button>
                        </div>
                        
                        <div style={{ padding: '20px', background: '#f8fafc', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
                            <div style={{ textAlign: 'center', marginBottom: '15px', borderBottom: '2px solid #e2e8f0', paddingBottom: '15px' }}>
                                <img src={logo} alt="Store Logo" style={{ height: '40px', marginBottom: '8px', filter: 'grayscale(1)' }} />
                                <h2 style={{ fontSize: '1.2rem', fontWeight: 950, color: '#0f172a', marginBottom: '5px' }}>DOCUMENT DETAILS</h2>
                                <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#FF8A1E', background: '#FFF7E6', padding: '4px 12px', borderRadius: '20px' }}>
                                    #{previewSale?.id?.toString().toUpperCase()}
                                </span>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '15px', fontSize: '0.75rem' }}>
                                <div>
                                    <span style={{ color: '#64748b', fontWeight: 700, display: 'block' }}>CLIENT</span>
                                    <span style={{ fontWeight: 900, color: '#1e293b' }}>{(previewSale.customer_name || previewSale.customerName || '—').toUpperCase()}</span>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <span style={{ color: '#64748b', fontWeight: 700, display: 'block' }}>COLLECTED BY</span>
                                    <span style={{ fontWeight: 900, color: '#1e293b' }}>{(previewSale.seller_name || previewSale.sellerName || 'OPERATOR').toUpperCase()}</span>
                                </div>
                            </div>

                            <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '20px' }}>
                                <thead>
                                    <tr style={{ background: '#f1f5f9' }}>
                                        <th style={{ padding: '8px', textAlign: 'left', fontSize: '0.65rem', fontWeight: 900, color: '#64748b' }}>PRODUCT</th>
                                        <th style={{ padding: '8px', textAlign: 'center', fontSize: '0.65rem', fontWeight: 900, color: '#64748b' }}>QTY</th>
                                        <th style={{ padding: '8px', textAlign: 'right', fontSize: '0.65rem', fontWeight: 900, color: '#64748b' }}>TOTAL</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {(previewSale.sale_items || previewSale.items || []).map((item, idx) => (
                                        <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                            <td style={{ padding: '10px 8px', fontSize: '0.75rem', fontWeight: 700 }}>{item.name}</td>
                                            <td style={{ padding: '10px 8px', textAlign: 'center', fontSize: '0.75rem', fontWeight: 800 }}>{item.quantity}</td>
                                            <td style={{ padding: '10px 8px', textAlign: 'right', fontSize: '0.75rem', fontWeight: 900 }}>Rs {((item.price || 0) * (item.quantity || 0)).toLocaleString()}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>

                            <div style={{ background: '#0f172a', padding: '15px', borderRadius: '12px', color: 'white' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '0.75rem' }}>
                                    <span style={{ color: '#94a3b8' }}>TOTAL VALUE:</span>
                                    <span style={{ fontWeight: 950, color: '#FFB84D', fontSize: '1rem' }}>Rs {previewSale.total?.toLocaleString()}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '6px', color: '#94a3b8' }}>
                                    <span>TIMESTAMP</span>
                                    <span>{new Date(previewSale.created_at || previewSale.date).toLocaleString()}</span>
                                </div>
                            </div>
                        </div>

                        <div style={{ padding: '20px 25px', background: 'white', borderTop: '1px solid #e2e8f0', textAlign: 'right' }}>
                            <button onClick={() => setPreviewSale(null)} style={{ width: '100%', padding: '12px', background: '#0f172a', color: 'white', border: 'none', borderRadius: '12px', fontWeight: 900, cursor: 'pointer', fontSize: '0.85rem' }}>
                                CLOSE DETAILS
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {/* RECEIPT PREVIEW MODAL */}
            {previewSale && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', backdropFilter: 'blur(4px)' }}>
                    <div style={{ background: 'white', padding: '30px', borderRadius: '24px', maxWidth: '400px', width: '100%', maxHeight: '90vh', overflowY: 'auto', position: 'relative' }}>
                        <button 
                            onClick={() => setPreviewSale(null)} 
                            style={{ position: 'absolute', top: '20px', right: '20px', background: '#f1f5f9', border: 'none', padding: '8px', borderRadius: '50%', cursor: 'pointer' }}
                        >
                            ✕
                        </button>
                        <ThermalReceipt sale={previewSale} items={previewSale.sale_items} />
                    </div>
                </div>
            )}
        </div>
    );
};

export default ProductInsights;
