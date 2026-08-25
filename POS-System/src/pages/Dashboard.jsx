import React, { useMemo } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { db } from '../database';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import {
    TrendingUp,
    Package,
    AlertCircle,
    ShoppingCart,
    ArrowUpRight,
    Users,
    BarChart3,
    DollarSign,
    CreditCard,
    ChevronRight,
    Search,
    Calendar,
    ClipboardList,
    Trash2
} from 'lucide-react';

const Dashboard = () => {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const { history } = useSelector(state => state.sales);
    const { items } = useSelector(state => state.inventory);
    const { activeShift } = useSelector(state => state.shift);
    const customers = useSelector(state => state.customers.list);
    const user = useSelector(state => state.auth.user);
    const isAdmin = user?.role === 'admin';
    const [selectedBar, setSelectedBar] = React.useState(null);

    // 1. DATA PROCESSING FOR CHARTS
    const filteredHistory = useMemo(() => {
        // Exclude Returned sales everywhere on the dashboard — a returned invoice
        // must not count toward revenue, profit, trends or payment breakdown.
        const valid = (history || []).filter(s => s.status !== 'Returned');
        return isAdmin
            ? valid
            : valid.filter(s => (s.seller_name || s.sellerName) === user?.name || s.seller_id === user?.uid);
    }, [history, isAdmin, user]);

    const totalSales = useMemo(() => filteredHistory.reduce((acc, s) => acc + (Number(s.total) || 0), 0), [filteredHistory]);
    const totalReceivables = useMemo(() => customers.reduce((acc, c) => acc + (Number(c.balance) || 0), 0), [customers]);
    const today = new Date().toISOString().split('T')[0];
    const todaySales = useMemo(() => filteredHistory.filter(s => new Date(s.created_at || s.date).toISOString().split('T')[0] === today), [filteredHistory, today]);
    const todayRevenue = useMemo(() => todaySales.reduce((acc, s) => acc + (Number(s.total) || 0), 0), [todaySales]);

    // Revenue Trend (Last 7 Days)
    const revenueTrend = useMemo(() => {
        const days = [...Array(7)].map((_, i) => {
            const d = new Date();
            d.setDate(d.getDate() - i);
            return d.toISOString().split('T')[0];
        }).reverse();

        return days.map(day => {
            const daySales = filteredHistory.filter(s => new Date(s.created_at || s.date).toISOString().split('T')[0] === day);
            return {
                day: new Date(day).toLocaleDateString('en-US', { weekday: 'short' }),
                revenue: daySales.reduce((sum, s) => sum + (Number(s.total) || 0), 0)
            };
        });
    }, [filteredHistory]);

    // Payment Distribution
    const paymentStats = useMemo(() => {
        const stats = { Cash: 0, Credit: 0, Card: 0, Online: 0 };
        filteredHistory.forEach(s => {
            const method = s.payment_method || s.paymentMethod || 'Cash';
            const amt = Number(s.total) || 0;
            if (stats[method] !== undefined) stats[method] += amt;
            else stats['Cash'] += amt; // Default/Fallback
        });
        const total = Object.values(stats).reduce((a, b) => a + b, 0) || 1;
        return Object.entries(stats).map(([label, value]) => ({
            label,
            value,
            percent: (value / total) * 100
        }));
    }, [filteredHistory]);

    const [activeSegment, setActiveSegment] = React.useState(null);

    // Profit Calculation Logic
    const calculateProfit = (salesList) => {
        if (!salesList) return 0;
        return salesList.reduce((acc, sale) => {
            const saleProfit = (sale.items || sale.sale_items || []).reduce((sum, item) => {
                const buyPrice = item.buy_price || item.buyPrice || 0;
                return sum + (((item.price || 0) - buyPrice) * (item.quantity || 0));
            }, 0);
            return acc + (saleProfit - (sale.discount || 0));
        }, 0);
    };

    // Use filteredHistory (returned sales already excluded) instead of raw history.
    const totalProfit = isAdmin ? calculateProfit(filteredHistory) : 0;
    const maxRevenue = Math.max(...revenueTrend.map(d => d.revenue)) || 1000;

    return (
        <div style={{ 
            height: '100%', 
            overflowY: 'auto', 
            padding: window.innerWidth <= 480 ? '15px' : '25px', 
            backgroundColor: '#f8fafc', 
            color: '#1e293b' 
        }}>
            
            {/* 1. TOP PREMIUM HEADER */}
            <motion.header 
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                style={{ 
                    display: 'flex', 
                    flexDirection: window.innerWidth <= 768 ? 'column' : 'row',
                    justifyContent: 'space-between', 
                    alignItems: window.innerWidth <= 768 ? 'flex-start' : 'center', 
                    marginBottom: '30px',
                    gap: '15px'
                }}
            >
                <div>
                    <h2 style={{ fontSize: window.innerWidth <= 480 ? '1.3rem' : '1.8rem', fontWeight: 950, color: '#0f172a', letterSpacing: '-0.8px' }}>
                        Command Terminal <span style={{ color: '#FF8A1E', fontSize: '0.7rem', fontWeight: 800, verticalAlign: 'middle', background: '#FFF7E6', padding: '4px 10px', borderRadius: '20px', marginLeft: '5px' }}>PRO</span>
                    </h2>
                    <p style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 600, marginTop: '2px' }}>
                        Welcome, <span style={{ color: '#0f172a', fontWeight: 900 }}>{user?.name || 'Administrator'}</span>
                    </p>
                </div>
                <div style={{ display: 'flex', gap: '10px', width: window.innerWidth <= 768 ? '100%' : 'auto' }}>
                    <div style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '10px', 
                        background: 'white', 
                        padding: '10px 15px', 
                        borderRadius: '12px', 
                        border: '1px solid #e2e8f0', 
                        boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
                        flex: window.innerWidth <= 768 ? 1 : 'none',
                        justifyContent: 'center'
                    }}>
                        <div style={{ width: '8px', background: activeShift ? '#FF8A1E' : '#f59e0b', borderRadius: '50%', height: '8px' }}></div>
                        <span style={{ fontSize: '0.7rem', fontWeight: 900, letterSpacing: '0.5px' }}>{activeShift ? 'OPERATIONAL' : 'IDLE'}</span>
                    </div>
                </div>
            </motion.header>

            {/* 2. STATS OVERVIEW CARDS */}
            <div style={{ 
                display: 'grid', 
                gridTemplateColumns: window.innerWidth <= 480 ? '1fr' : 'repeat(auto-fit, minmax(220px, 1fr))', 
                gap: '15px', 
                marginBottom: '30px' 
            }}>
                {[
                    { label: isAdmin ? 'TOTAL REVENUE' : 'MY REVENUE', value: `Rs ${totalSales.toLocaleString()}`, color: '#6366f1', icon: <DollarSign size={20} />, sub: 'Gross billing' },
                    ...(isAdmin ? [{ label: 'NET PROFIT', value: `Rs ${totalProfit.toLocaleString()}`, color: '#F7941D', icon: <TrendingUp size={20} />, sub: 'After cost/discounts' }] : []),
                    { label: "TODAY'S TURNOVER", value: `Rs ${todayRevenue.toLocaleString()}`, color: '#FF8A1E', icon: <BarChart3 size={20} />, sub: `${todaySales.length} Invoices` },
                    { label: 'ACTIVE UDHAAR', value: `Rs ${totalReceivables.toLocaleString()}`, color: '#f59e0b', icon: <Users size={20} />, sub: 'Customer balance' },
                    { label: 'STOCK HEALTH', value: `${items.length} SKUs`, color: '#ec4899', icon: <Package size={20} />, sub: `${items.filter(i => i.stock < 10).length} Low stock` }
                ].map((stat, i) => (
                    <motion.div 
                        key={i}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: i * 0.05 }}
                        style={{ 
                            background: 'white', 
                            padding: '20px', 
                            borderRadius: '20px', 
                            border: '1px solid #e2e8f0', 
                            boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)',
                            position: 'relative'
                        }}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                            <div style={{ background: `${stat.color}15`, padding: '6px', borderRadius: '8px' }}>{React.cloneElement(stat.icon, { color: stat.color, size: 16 })}</div>
                            <span style={{ fontSize: '0.65rem', fontWeight: 900, color: '#64748b', textTransform: 'uppercase' }}>{stat.label}</span>
                        </div>
                        <h3 style={{ fontSize: '1.4rem', fontWeight: 950, color: '#0f172a' }}>{stat.value}</h3>
                        <p style={{ fontSize: '0.65rem', color: '#94a3b8', marginTop: '4px', fontWeight: 700 }}>{stat.sub}</p>
                    </motion.div>
                ))}
            </div>

            {/* 3. CHARTING SECTION */}
            <div style={{ 
                display: 'grid', 
                gridTemplateColumns: window.innerWidth <= 1024 ? '1fr' : '1.8fr 1.2fr', 
                gap: '20px', 
                marginBottom: '30px' 
            }}>
                
                {/* REVENUE BAR CHART */}
                <motion.div 
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    style={{ background: 'white', borderRadius: '24px', padding: window.innerWidth <= 480 ? '20px' : '30px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)' }}
                >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
                        <div>
                            <h4 style={{ fontSize: '1.1rem', fontWeight: 950, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <TrendingUp size={18} color="#6366f1" /> Revenue Trend
                            </h4>
                            <p style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>Daily performance monitor</p>
                        </div>
                    </div>

                    <div style={{ height: '220px', display: 'flex', alignItems: 'flex-end', gap: window.innerWidth <= 480 ? '8px' : '15px', paddingBottom: '20px', position: 'relative' }}>
                        {revenueTrend.map((data, i) => {
                            const isToday = i === 6;
                            const isSelected = selectedBar === i;
                            const ratio = data.revenue / maxRevenue;
                            
                            // Dynamic color logic based on revenue value
                            const getBarColor = () => {
                                if (isToday) return '#FF8A1E'; // Success green for today
                                if (isSelected) return '#4f46e5'; // Selection purple
                                if (ratio > 0.8) return '#6366f1'; // High revenue - Indigo
                                if (ratio > 0.4) return '#818cf8'; // Mid revenue - Light Indigo
                                return '#a5b4fc'; // Low revenue - Soft Violet
                            };

                            return (
                                <div 
                                    key={i} 
                                    onClick={() => setSelectedBar(isSelected ? null : i)}
                                    style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end', gap: '10px', cursor: 'pointer' }}
                                >
                                    <div style={{ position: 'relative', width: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', height: '100%', alignItems: 'center' }}>
                                        <AnimatePresence>
                                            {isSelected && (
                                                <motion.div 
                                                    initial={{ opacity: 0, y: 10, scale: 0.5 }}
                                                    animate={{ opacity: 1, y: -5, scale: 1 }}
                                                    exit={{ opacity: 0, y: 10, scale: 0.5 }}
                                                    style={{ 
                                                        position: 'absolute', 
                                                        top: `calc(${100 - (data.revenue / maxRevenue) * 100}% - 35px)`,
                                                        background: '#1e293b',
                                                        color: 'white',
                                                        padding: '4px 8px',
                                                        borderRadius: '6px',
                                                        fontSize: '0.65rem',
                                                        fontWeight: 900,
                                                        whiteSpace: 'nowrap',
                                                        zIndex: 10,
                                                        boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
                                                    }}
                                                >
                                                    Rs {data.revenue.toLocaleString()}
                                                    <div style={{ 
                                                        position: 'absolute', 
                                                        bottom: '-4px', 
                                                        left: '50%', 
                                                        transform: 'translateX(-50%) rotate(45deg)', 
                                                        width: '8px', 
                                                        height: '8px', 
                                                        background: '#1e293b' 
                                                    }} />
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                        <motion.div 
                                            initial={{ height: 0 }}
                                            animate={{ height: `${ratio * 100}%` }}
                                            whileHover={{ scaleX: 1.1, opacity: 0.9 }}
                                            style={{ 
                                                width: '100%', 
                                                maxWidth: '35px',
                                                background: getBarColor(), 
                                                borderRadius: '6px 6px 4px 4px',
                                                boxShadow: isToday ? '0 4px 12px rgba(16, 185, 129, 0.2)' : 'none',
                                                transition: 'background 0.3s'
                                            }}
                                        />
                                    </div>
                                    <span style={{ fontSize: '0.65rem', fontWeight: 900, color: isToday ? '#FF8A1E' : (isSelected ? '#0f172a' : '#64748b') }}>{data.day}</span>
                                </div>
                            );
                        })}
                    </div>
                </motion.div>

                {/* PAYMENT DISTRIBUTION */}
                <motion.div 
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    style={{ background: 'white', borderRadius: '24px', padding: window.innerWidth <= 480 ? '20px' : '30px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)' }}
                >
                    <h4 style={{ fontSize: '1.1rem', fontWeight: 950, color: '#0f172a', marginBottom: '4px' }}>Settlement Distribution</h4>
                    <p style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600, marginBottom: '20px' }}>Revenue channels</p>

                    <div style={{ display: 'flex', flexDirection: window.innerWidth <= 480 ? 'column' : 'row', gap: '25px', alignItems: 'center' }}>
                        <div style={{ position: 'relative', width: '180px', height: '180px', flexShrink: 0 }}>
                            <svg viewBox="0 0 100 100" style={{ transform: 'rotate(-90deg)', width: '100%', height: '100%' }}>
                                {/* Background thin ring for zero data */}
                                <circle cx="50" cy="50" r="38" fill="transparent" stroke="#f1f5f9" strokeWidth="8" />
                                
                                {paymentStats.map((stat, i) => {
                                    let offset = 0;
                                    for(let j=0; j<i; j++) offset += paymentStats[j].percent;
                                    const isSelected = activeSegment === i;
                                    const color = stat.label === 'Cash' ? '#FF8A1E' : stat.label === 'Credit' ? '#f59e0b' : stat.label === 'Card' ? '#6366f1' : '#0ea5e9';
                                    
                                    return (
                                        <g key={i} onClick={() => setActiveSegment(isSelected ? null : i)} style={{ cursor: 'pointer' }}>
                                            <motion.circle
                                                cx="50" cy="50" r="38"
                                                fill="transparent"
                                                stroke={color}
                                                strokeWidth={isSelected ? 12 : 10}
                                                strokeDasharray={`${stat.percent} 100`}
                                                strokeDashoffset={-offset}
                                                initial={{ pathLength: 0 }}
                                                animate={{ pathLength: 1 }}
                                                transition={{ duration: 1, delay: 0.5 + (i * 0.1) }}
                                                style={{ 
                                                    filter: isSelected ? `drop-shadow(0 0 6px ${color}80)` : 'none',
                                                    transition: 'stroke-width 0.3s, filter 0.3s'
                                                }}
                                            />
                                        </g>
                                    );
                                })}
                            </svg>
                            
                            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
                                <AnimatePresence mode="wait">
                                    {activeSegment !== null ? (
                                        <motion.div 
                                            key="info"
                                            initial={{ opacity: 0, scale: 0.8 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            exit={{ opacity: 0, scale: 0.8 }}
                                            style={{ textAlign: 'center' }}
                                        >
                                            <span style={{ fontSize: '0.6rem', fontWeight: 900, color: '#64748b', display: 'block' }}>{paymentStats[activeSegment].label.toUpperCase()}</span>
                                            <span style={{ fontSize: '1.1rem', fontWeight: 950, color: '#0f172a' }}>{paymentStats[activeSegment].percent.toFixed(0)}%</span>
                                        </motion.div>
                                    ) : (
                                        <motion.div key="total" initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ textAlign: 'center' }}>
                                            <span style={{ fontSize: '1.4rem', fontWeight: 950, color: '#0f172a' }}>{filteredHistory.length}</span>
                                            <span style={{ fontSize: '0.55rem', fontWeight: 900, color: '#64748b', display: 'block' }}>TOTAL TX</span>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1, width: '100%' }}>
                            {paymentStats.map((stat, i) => {
                                const isSelected = activeSegment === i;
                                const color = stat.label === 'Cash' ? '#FF8A1E' : stat.label === 'Credit' ? '#f59e0b' : stat.label === 'Card' ? '#6366f1' : '#0ea5e9';
                                return (
                                    <motion.div 
                                        key={i} 
                                        onClick={() => setActiveSegment(isSelected ? null : i)}
                                        whileHover={{ x: 5 }}
                                        style={{ 
                                            display: 'flex', 
                                            justifyContent: 'space-between', 
                                            alignItems: 'center', 
                                            padding: '10px 15px', 
                                            background: isSelected ? `${color}10` : '#f8fafc', 
                                            borderRadius: '12px',
                                            border: `1px solid ${isSelected ? color : 'transparent'}`,
                                            cursor: 'pointer',
                                            transition: 'all 0.3s'
                                        }}
                                    >
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: color, boxShadow: `0 0 6px ${color}` }}></div>
                                            <span style={{ fontSize: '0.75rem', fontWeight: 800, color: isSelected ? '#0f172a' : '#475569' }}>{stat.label}</span>
                                        </div>
                                        <div style={{ textAlign: 'right' }}>
                                            <span style={{ fontSize: '0.8rem', fontWeight: 950, color: '#0f172a', display: 'block' }}>{stat.percent.toFixed(0)}%</span>
                                            {isSelected && <span style={{ fontSize: '0.6rem', fontWeight: 700, color: '#64748b' }}>Rs {stat.value.toLocaleString()}</span>}
                                        </div>
                                    </motion.div>
                                );
                            })}
                        </div>
                    </div>
                </motion.div>
            </div>

            {/* 4. MODULAR FEED SECTION */}
            <div style={{ 
                display: 'grid', 
                gridTemplateColumns: window.innerWidth <= 1024 ? '1fr' : '1fr 350px', 
                gap: '20px' 
            }}>
                
                {/* RECENT SETTLEMENTS FEED */}
                <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '24px', overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)' }}>
                    <div style={{ padding: '20px 25px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc' }}>
                        <div>
                            <h5 style={{ fontWeight: 950, fontSize: '0.9rem', color: '#0f172a' }}>ACTIVITY FEED</h5>
                            <p style={{ fontSize: '0.65rem', color: '#64748b', fontWeight: 700 }}>Real-time transaction log</p>
                        </div>
                        <button onClick={() => navigate('/history')} style={{ background: 'white', border: '1px solid #e2e8f0', color: '#6366f1', padding: '6px 12px', borderRadius: '8px', fontSize: '0.7rem', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px' }}>
                            VIEW REGISTRY <ChevronRight size={14} />
                        </button>
                    </div>
                    
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        {filteredHistory.slice(0, 6).map((sale, i) => {
                            const productName = sale.product_name || '';
                            const items = productName ? productName.split(', ') : (sale.sale_items || sale.items || []);
                            const mainItem = productName ? items[0] : (items[0]?.name || 'Unknown Item');
                            const otherCount = productName ? items.length - 1 : (items.length > 0 ? items.length - 1 : 0);
                            const method = sale.payment_method || 'Cash';
                            
                            return (
                                <motion.div 
                                    key={sale.id}
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: i * 0.1 }}
                                    whileHover={{ background: '#f8fafc' }}
                                    style={{ 
                                        padding: '15px 25px', 
                                        borderBottom: i === 5 ? 'none' : '1px solid #f1f5f9',
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        cursor: 'pointer'
                                    }}
                                    onClick={() => navigate('/history')}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px', flex: 1 }}>
                                        <div style={{ 
                                            width: '40px', 
                                            height: '40px', 
                                            borderRadius: '12px', 
                                            background: method === 'Cash' ? '#FFF7E6' : method === 'Credit' ? '#fff7ed' : '#eef2ff',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            color: method === 'Cash' ? '#FF8A1E' : method === 'Credit' ? '#f59e0b' : '#6366f1'
                                        }}>
                                            {method === 'Cash' ? <DollarSign size={18} /> : method === 'Credit' ? <Users size={18} /> : <CreditCard size={18} />}
                                        </div>
                                        <div style={{ overflow: 'hidden' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
                                                <span style={{ fontWeight: 800, color: '#1e293b', fontSize: '0.85rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                    {mainItem}
                                                </span>
                                                {otherCount > 0 && (
                                                    <span style={{ fontSize: '0.6rem', fontWeight: 900, background: '#f1f5f9', color: '#64748b', padding: '2px 6px', borderRadius: '4px' }}>
                                                        +{otherCount} MORE
                                                    </span>
                                                )}
                                            </div>
                                            <div style={{ fontSize: '0.65rem', color: '#94a3b8', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '5px' }}>
                                                <span>{new Date(sale.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                                <span>•</span>
                                                <span style={{ color: '#64748b' }}>{sale.customer_name || 'WALK-IN'}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div style={{ textAlign: 'right', marginLeft: '15px' }}>
                                        <div style={{ fontWeight: 950, color: '#0f172a', fontSize: '0.95rem' }}>
                                            Rs {sale.total.toLocaleString()}
                                        </div>
                                        <div style={{ fontSize: '0.6rem', fontWeight: 800, color: method === 'Cash' ? '#FF8A1E' : '#64748b', textTransform: 'uppercase' }}>
                                            {method}
                                        </div>
                                    </div>
                                </motion.div>
                            );
                        })}
                    </div>
                </div>

                {/* ALERTS & NODE STATUS */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <div style={{ background: '#fff1f1', borderRadius: '24px', padding: '20px', border: '1px solid #fee2e2' }}>
                        <h5 style={{ color: '#991b1b', fontWeight: 950, fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '15px' }}>
                            <AlertCircle size={18} /> STOCK ALERTS
                        </h5>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            {items.filter(i => i.stock <= (i.min_stock || 5)).slice(0, 4).map((item, i) => (
                                <div key={i} style={{ background: 'white', padding: '12px', borderRadius: '12px', border: '1px solid #fee2e2', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ fontWeight: 800, fontSize: '0.75rem', color: '#1e293b' }}>{item.name}</span>
                                    <span style={{ fontSize: '0.85rem', fontWeight: 950, color: '#ef4444' }}>{item.stock}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div style={{ background: '#0f172a', borderRadius: '24px', padding: '20px', color: 'white' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                            <div style={{ background: 'rgba(56, 189, 248, 0.2)', padding: '8px', borderRadius: '10px' }}><Package size={20} color="#38bdf8" /></div>
                            <div>
                                <h6 style={{ fontWeight: 950, fontSize: '0.8rem' }}>NODE STATUS</h6>
                                <p style={{ fontSize: '0.6rem', color: '#94a3b8', fontWeight: 800 }}>TEHZEEB SWEETS & SUPER STORE v2.4</p>
                            </div>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.75rem' }}>
                             <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ opacity: 0.6 }}>Active SKUs</span><span style={{ fontWeight: 800 }}>{items.length}</span></div>
                             <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ opacity: 0.6 }}>Platform</span><span style={{ fontWeight: 800, color: '#FF8A1E' }}>ONLINE</span></div>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default Dashboard;

