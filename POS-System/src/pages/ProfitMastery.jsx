import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import {
    BarChart3,
    TrendingUp,
    TrendingDown,
    DollarSign,
    PieChart,
    Calendar,
    ArrowUpRight,
    Search,
    ShoppingBag,
    Briefcase,
    Zap,
    ChevronRight,
    CheckCircle2
} from 'lucide-react';
import { db } from '../database';

const ProfitMastery = () => {
    const navigate = useNavigate();
    
    // Pulse Animation Styles
    const pulseKeyframes = `
        @keyframes pulse-wave {
            0% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.8); }
            70% { box-shadow: 0 0 0 15px rgba(16, 185, 129, 0); }
            100% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); }
        }
    `;

    const { history: allSales } = useSelector(state => state.sales);
    const { items: inventory } = useSelector(state => state.inventory);
    const { user } = useSelector(state => state.auth);
    const [dateFilter, setDateFilter] = useState(new Date().toISOString().split('T')[0]);
    const [selectedProduct, setSelectedProduct] = useState(null);

    if (user?.role !== 'admin') {
        return (
            <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc' }}>
                <div style={{ textAlign: 'center', padding: '40px', background: 'white', borderRadius: '20px', boxShadow: '0 10px 25px rgba(0,0,0,0.05)' }}>
                    <h2 style={{ color: '#ef4444', fontWeight: 900 }}>ACCESS DENIED</h2>
                    <p style={{ color: '#64748b' }}>This high-level financial data is only available to Administrators.</p>
                </div>
            </div>
        );
    }

    // Filter sales locally from Redux history
    const [showAllHistory, setShowAllHistory] = useState(false);

    const filteredSales = React.useMemo(() => {
        if (!allSales) return [];
        // IMPORTANT: exclude Returned sales — a returned invoice must not count
        // toward revenue, cost or profit (that was inflating the numbers).
        // Deleted sales are already filtered out before they reach Redux.
        const valid = allSales.filter(s => s.status !== 'Returned');

        if (showAllHistory) return valid;
        return valid.filter(sale => {
            if (!sale.created_at) return false;
            const saleDate = new Date(sale.created_at).toISOString().split('T')[0];
            return saleDate === dateFilter;
        });
    }, [allSales, dateFilter, showAllHistory]);

    // Count of valid (non-returned) sales — shown in the header.
    const validSalesCount = React.useMemo(
        () => (allSales || []).filter(s => s.status !== 'Returned').length,
        [allSales]
    );

    const totalRevenue = React.useMemo(() => filteredSales.reduce((acc, s) => acc + (Number(s.total) || 0), 0), [filteredSales]);
    
    // Detailed Profit Calculation
    const { productProfitStats, totalNetProfit, totalCost } = React.useMemo(() => {
        const stats = {};
        let netProfit = 0;
        let cost = 0;

        filteredSales.forEach(sale => {
            let saleProfit = 0;
            const items = sale.sale_items || sale.items || [];
            items.forEach(item => {
                const buyPrice = item.buy_price || item.buyPrice || 0;
                const profitPerUnit = (item.price || 0) - buyPrice;
                const itemTotalProfit = profitPerUnit * (item.quantity || 0);
                
                saleProfit += itemTotalProfit;
                cost += (buyPrice * (item.quantity || 0));

                const invItem = inventory.find(i => i.id === item.product_id);
                const pName = item.product_name || item.name || invItem?.name || 'Unknown Item';

                if (!stats[pName]) {
                    stats[pName] = {
                        name: pName,
                        profit: 0,
                        qty: 0,
                        buyPrice: buyPrice,
                        salePrice: item.price,
                        category: item.category || invItem?.category || 'General',
                        sales: []
                    };
                }
                stats[pName].profit += itemTotalProfit;
                stats[pName].qty += (item.quantity || 0);
                stats[pName].sales.push({
                    billId: sale.id?.toString().slice(-6) || 'N/A',
                    qty: item.quantity,
                    customer: sale.customer_name || sale.customerName || 'Walk-in',
                    total: (item.price * item.quantity)
                });
            });
            netProfit += (saleProfit - (sale.discount || 0));
        });

        return { 
            productProfitStats: stats, 
            totalNetProfit: netProfit, 
            totalCost: cost 
        };
    }, [filteredSales, inventory]);

    const profitMargin = totalRevenue ? ((totalNetProfit / totalRevenue) * 100).toFixed(1) : 0;
    const topProfitableProducts = Object.values(productProfitStats)
        .sort((a, b) => b.profit - a.profit)
        .slice(0, 50);

    return (
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: '30px', background: '#f8fafc', padding: '20px', overflowY: 'auto' }}>
            <style>{pulseKeyframes}</style>
            
            {/* PRODUCT DETAIL MODAL */}
            {selectedProduct && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: window.innerWidth <= 480 ? '0' : '20px', backdropFilter: 'blur(5px)' }}>
                    <div style={{ background: 'white', width: '100%', maxWidth: '600px', height: window.innerWidth <= 480 ? '100%' : 'auto', borderRadius: window.innerWidth <= 480 ? '0' : '24px', overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', display: 'flex', flexDirection: 'column' }}>
                        <div style={{ background: '#0f172a', padding: '25px', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <h3 style={{ fontSize: '1.4rem', fontWeight: 900 }}>{selectedProduct.name}</h3>
                                <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginTop: '5px' }}>
                                    <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Category: {selectedProduct.category}</span>
                                    <button 
                                        onClick={() => navigate(`/insights/${selectedProduct.name}`)} 
                                        style={{ 
                                            background: '#FF8A1E', 
                                            color: 'white', 
                                            border: 'none', 
                                            padding: '4px 12px', 
                                            borderRadius: '6px', 
                                            fontSize: '0.7rem', 
                                            fontWeight: 900, 
                                            cursor: 'pointer',
                                            animation: 'pulse-wave 0.8s infinite',
                                            transition: 'all 0.1s',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '5px'
                                        }}
                                        onMouseOver={e => {
                                            e.currentTarget.style.background = '#F7941D';
                                            e.currentTarget.style.transform = 'scale(1.05)';
                                        }}
                                        onMouseOut={e => {
                                            e.currentTarget.style.background = '#FF8A1E';
                                            e.currentTarget.style.transform = 'scale(1)';
                                        }}
                                    >
                                        DEEP DIVE <ChevronRight size={12} />
                                    </button>
                                </div>
                            </div>
                            <button onClick={() => setSelectedProduct(null)} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white', padding: '10px', borderRadius: '50%', cursor: 'pointer' }}>✕</button>
                        </div>
                        <div style={{ padding: window.innerWidth <= 480 ? '20px' : '30px', flex: 1, overflowY: 'auto' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: window.innerWidth <= 480 ? '1fr' : 'repeat(3, 1fr)', gap: '15px', marginBottom: '25px' }}>
                                <div style={{ background: '#f8fafc', padding: '15px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                                    <span style={{ fontSize: '0.65rem', fontWeight: 800, color: '#64748b', display: 'block' }}>TOTAL SOLD</span>
                                    <span style={{ fontSize: '1.2rem', fontWeight: 950 }}>{selectedProduct.qty} Units</span>
                                </div>
                                <div style={{ background: '#FFF7E6', padding: '15px', borderRadius: '12px', border: '1px solid #FF8A1E' }}>
                                    <span style={{ fontSize: '0.65rem', fontWeight: 800, color: '#F7941D', display: 'block' }}>TOTAL PROFIT</span>
                                    <span style={{ fontSize: '1.2rem', fontWeight: 950, color: '#7A1E0C' }}>Rs {selectedProduct.profit.toLocaleString()}</span>
                                </div>
                                <div style={{ background: '#f0f9ff', padding: '15px', borderRadius: '12px', border: '1px solid #0ea5e9' }}>
                                    <span style={{ fontSize: '0.65rem', fontWeight: 800, color: '#0ea5e9', display: 'block' }}>PROFIT / UNIT</span>
                                    <span style={{ fontSize: '1.2rem', fontWeight: 950, color: '#0c4a6e' }}>Rs {selectedProduct.salePrice - selectedProduct.buyPrice}</span>
                                </div>
                            </div>

                            <h4 style={{ fontSize: '0.9rem', fontWeight: 900, marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Briefcase size={16} color="#0f172a" /> Today's Sales History
                            </h4>
                            <div style={{ maxHeight: '250px', overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: '12px' }}>
                                <table className="erp-table">
                                    <thead style={{ position: 'sticky', top: 0, background: '#f8fafc', zIndex: 1 }}>
                                        <tr>
                                            <th style={{ fontSize: '0.7rem' }}>BILL ID</th>
                                            <th style={{ fontSize: '0.7rem' }}>CLIENT</th>
                                            <th style={{ fontSize: '0.7rem', textAlign: 'right' }}>QTY</th>
                                            <th style={{ fontSize: '0.7rem', textAlign: 'right' }}>TOTAL</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {(selectedProduct.sales || []).map((s, i) => (
                                            <tr key={i}>
                                                <td style={{ fontWeight: 800, fontSize: '0.75rem' }}>#{s.billId}</td>
                                                <td style={{ fontSize: '0.75rem' }}>{s.customer}</td>
                                                <td style={{ textAlign: 'right', fontWeight: 700, fontSize: '0.75rem' }}>{s.qty}</td>
                                                <td style={{ textAlign: 'right', fontWeight: 800, fontSize: '0.75rem' }}>Rs {s.total.toLocaleString()}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* HEADER */}
            <header style={{ 
                display: 'flex', 
                flexDirection: window.innerWidth <= 768 ? 'column' : 'row',
                justifyContent: 'space-between', 
                alignItems: window.innerWidth <= 768 ? 'flex-start' : 'center', 
                background: '#0f172a', 
                padding: window.innerWidth <= 480 ? '20px' : '30px', 
                borderRadius: '24px', 
                color: 'white', 
                boxShadow: '0 15px 30px -10px rgba(15, 23, 42, 0.3)',
                gap: '20px'
            }}>
                <div>
                    <h2 style={{ fontSize: window.innerWidth <= 480 ? '1.4rem' : '2rem', fontWeight: 950, display: 'flex', alignItems: 'center', gap: '15px' }}>
                        <Zap size={window.innerWidth <= 480 ? 24 : 32} color="#FFB84D" /> Profit Mastery Analytics
                    </h2>
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginTop: '5px' }}>
                        <p style={{ color: '#94a3b8', fontWeight: 600, fontSize: window.innerWidth <= 480 ? '0.8rem' : '1rem' }}>Deep-dive into your margins.</p>
                        <span style={{ background: '#334155', color: '#FFB84D', padding: '4px 10px', borderRadius: '20px', fontSize: '0.7rem', fontWeight: 900 }}>{validSalesCount} TOTAL SALES</span>
                    </div>
                </div>
                <div style={{ display: 'flex', gap: '15px', alignItems: 'center', width: window.innerWidth <= 768 ? '100%' : 'auto', flexDirection: window.innerWidth <= 480 ? 'column' : 'row' }}>
                    <button 
                        onClick={() => setShowAllHistory(!showAllHistory)}
                        style={{
                            background: showAllHistory ? '#FF8A1E' : 'rgba(255,255,255,0.1)',
                            color: 'white',
                            border: '1px solid rgba(255,255,255,0.2)',
                            padding: '12px 20px',
                            borderRadius: '12px',
                            fontWeight: 900,
                            fontSize: '0.8rem',
                            cursor: 'pointer',
                            whiteSpace: 'nowrap',
                            width: window.innerWidth <= 480 ? '100%' : 'auto'
                        }}
                    >
                        {showAllHistory ? 'BACK TO TODAY' : 'SHOW ALL HISTORY'}
                    </button>
                    {!showAllHistory && (
                        <div style={{ position: 'relative', width: '100%' }}>
                            <Calendar size={18} style={{ position: 'absolute', left: '15px', top: '15px', color: '#FFB84D' }} />
                            <input
                                type="date"
                                className="erp-input"
                                style={{ paddingLeft: '45px', fontWeight: 800, border: 'none', borderRadius: '12px', height: '48px', width: '100%', background: 'rgba(255,255,255,0.1)', color: 'white' }}
                                value={dateFilter}
                                onChange={(e) => setDateFilter(e.target.value)}
                            />
                        </div>
                    )}
                </div>
            </header>

            {/* TOP STATS CARDS */}
            <div style={{ 
                display: 'grid', 
                gridTemplateColumns: window.innerWidth <= 1024 ? (window.innerWidth <= 600 ? '1fr' : '1fr 1fr') : 'repeat(4, 1fr)', 
                gap: '25px' 
            }}>
                <div style={{ background: 'white', padding: '25px', borderRadius: '24px', boxShadow: '0 4px 6px rgba(0,0,0,0.02)', border: '1px solid #e2e8f0' }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: 900, color: '#64748b' }}>GROSS REVENUE</span>
                    <h3 style={{ fontSize: window.innerWidth <= 480 ? '1.5rem' : '1.8rem', fontWeight: 950, color: '#0f172a', margin: '10px 0' }}>Rs {totalRevenue.toLocaleString()}</h3>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#FF8A1E', fontSize: '0.8rem', fontWeight: 800 }}>
                        <TrendingUp size={14} /> Total Value Sold
                    </div>
                </div>

                <div style={{ background: 'white', padding: '25px', borderRadius: '24px', border: '1px solid #e2e8f0' }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: 900, color: '#64748b' }}>TOTAL COST (CP)</span>
                    <h3 style={{ fontSize: window.innerWidth <= 480 ? '1.5rem' : '1.8rem', fontWeight: 950, color: '#ef4444', margin: '10px 0' }}>Rs {totalCost.toLocaleString()}</h3>
                    <p style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 700 }}>Inventory investment</p>
                </div>

                <div style={{ background: '#FFF7E6', padding: '25px', borderRadius: '24px', border: '1px solid #FFB84D' }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: 900, color: '#D2691E' }}>NET PROFIT</span>
                    <h3 style={{ fontSize: window.innerWidth <= 480 ? '1.5rem' : '1.8rem', fontWeight: 950, color: '#7A1E0C', margin: '10px 0' }}>Rs {totalNetProfit.toLocaleString()}</h3>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#F7941D', fontSize: '0.8rem', fontWeight: 800 }}>
                        <CheckCircle2 size={14} /> After Discounts
                    </div>
                </div>

                <div style={{ background: '#7A1E0C', padding: '25px', borderRadius: '24px', color: 'white' }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: 900, color: '#FCE1A8' }}>PROFIT MARGIN</span>
                    <h3 style={{ fontSize: window.innerWidth <= 480 ? '1.5rem' : '1.8rem', fontWeight: 950, margin: '10px 0' }}>{profitMargin}%</h3>
                    <p style={{ fontSize: '0.8rem', color: '#FCE1A8', fontWeight: 700 }}>Efficiency of sales</p>
                </div>
            </div>

            {/* MAIN ANALYSIS CONTENT */}
            <div style={{ 
                display: 'flex', 
                flexDirection: window.innerWidth <= 1024 ? 'column' : 'row', 
                gap: '30px' 
            }}>
                
                 {/* PRODUCT-WISE PROFIT TABLE */}
                 <div style={{ flex: 1, background: 'white', borderRadius: '24px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', overflow: 'hidden', minHeight: '400px' }}>
                      <div style={{ padding: '20px 30px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                         <h4 style={{ fontSize: '1.1rem', fontWeight: 950 }}>Unit-Level Profitability</h4>
                      </div>
                     <div style={{ overflowX: 'auto' }}>
                        <table className="erp-table">
                            <thead>
                                <tr style={{ background: '#f8fafc' }}>
                                    <th style={{ padding: '20px' }}>PRODUCT NAME</th>
                                    <th style={{ textAlign: 'right' }}>UNITS SOLD</th>
                                    <th style={{ textAlign: 'right' }}>TOTAL PROFIT</th>
                                    <th style={{ textAlign: 'center' }}>HEALTH</th>
                                </tr>
                            </thead>
                            <tbody>
                                {topProfitableProducts.map((p, idx) => (
                                    <tr key={idx} onClick={() => setSelectedProduct(p)} style={{ cursor: 'pointer', transition: 'background 0.2s' }} onMouseOver={e => e.currentTarget.style.background = '#f1f5f9'} onMouseOut={e => e.currentTarget.style.background = 'transparent'}>
                                        <td style={{ padding: '18px 20px', fontWeight: 800, whiteSpace: 'nowrap' }}>{p.name}</td>
                                        <td style={{ textAlign: 'right', fontWeight: 700 }}>{p.qty}</td>
                                        <td style={{ textAlign: 'right', fontWeight: 950, color: '#F7941D' }}>Rs {p.profit.toLocaleString()}</td>
                                        <td style={{ textAlign: 'center' }}>
                                            <div style={{ padding: '5px 10px', borderRadius: '6px', background: '#FFF7E6', color: '#F7941D', fontSize: '0.7rem', fontWeight: 900, display: 'inline-block' }}>GOOD</div>
                                        </td>
                                    </tr>
                                ))}
                                {topProfitableProducts.length === 0 && (
                                    <tr>
                                        <td colSpan="4" style={{ textAlign: 'center', padding: '100px', color: '#94a3b8', fontStyle: 'italic' }}>No sales data available for this date.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                     </div>
                </div>

                {/* VISUAL MARGIN INDICATOR */}
                <div style={{ background: 'white', padding: '30px', borderRadius: '24px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', alignItems: 'center', width: window.innerWidth <= 1024 ? '100%' : '400px' }}>
                    <h4 style={{ fontWeight: 950, marginBottom: '30px', width: '100%' }}>Margin Breakdown</h4>
                    <div style={{ 
                        width: '240px', 
                        height: '240px', 
                        borderRadius: '50%', 
                        background: `conic-gradient(
                            #F7941D 0% ${profitMargin}%, 
                            #ef4444 ${profitMargin}% ${((totalCost / (totalRevenue || 1)) * 100) + parseFloat(profitMargin)}%, 
                            #f8fafc 0% 100%
                        )`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        position: 'relative',
                        boxShadow: 'inset 0 0 30px rgba(0,0,0,0.05)'
                    }}>
                        <div style={{ width: '150px', height: '150px', background: 'white', borderRadius: '50%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', boxShadow: '0 10px 20px rgba(0,0,0,0.05)' }}>
                            <span style={{ fontSize: '1.5rem', fontWeight: 950, color: '#0f172a' }}>{profitMargin}%</span>
                            <span style={{ fontSize: '0.7rem', fontWeight: 900, color: '#94a3b8' }}>NET MARGIN</span>
                        </div>
                    </div>

                    <div style={{ width: '100%', marginTop: '40px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <div style={{ width: '15px', height: '15px', background: '#F7941D', borderRadius: '4px' }}></div>
                                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#64748b' }}>Profitable Growth</span>
                            </div>
                            <span style={{ fontWeight: 900 }}>Rs {totalNetProfit.toLocaleString()}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <div style={{ width: '15px', height: '15px', background: '#ef4444', borderRadius: '4px' }}></div>
                                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#64748b' }}>Stock Cost</span>
                            </div>
                            <span style={{ fontWeight: 900 }}>Rs {totalCost.toLocaleString()}</span>
                        </div>
                    </div>
                    
                    <div style={{ marginTop: 'auto', padding: '20px', background: '#f8fafc', borderRadius: '16px', border: '1px dashed #cbd5e1', width: '100%', textAlign: 'center' }}>
                         <p style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600, lineHeight: '1.4' }}>
                            "To build a sustainable store, focus on products with over 20% margin."
                         </p>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default ProfitMastery;
