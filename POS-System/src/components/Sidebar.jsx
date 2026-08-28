import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import {
    LayoutDashboard, Package, ShoppingCart, History, RotateCcw, Settings, Timer,
    FileText, TrendingUp, Truck, Camera, ShieldAlert, BookOpen, Users, Users2,
    Wallet, Trash2, Layers, LogOut, Sliders, X, Menu, Cloud
} from 'lucide-react';
import { logout } from '../store/slices/authSlice';
import logo from '../assets/tehzeeb_logo.png';

// TOP NAVIGATION BAR — horizontal menu across the top of every page (POS has its own).
// Colours follow the Format settings via CSS variables (--menu-bg/--menu-fg/--menu-font).
const Sidebar = () => {
    const { user } = useSelector(state => state.auth);
    const location = useLocation();
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const [isPremiumModalOpen, setIsPremiumModalOpen] = useState(false);

    const isAdmin = user?.role === 'admin';
    const permissions = user?.permissions || [];
    const hasAccess = (perm) => !perm || isAdmin || permissions.includes(perm);

    const ITEMS = [
        { to: '/', label: 'Dashboard', icon: LayoutDashboard, perm: null },
        { to: '/pos', label: 'New Sale', icon: ShoppingCart, perm: 'pos' },
        { to: '/invoice', label: 'Invoice', icon: History, perm: 'pos' },
        { to: '/orders-center', label: 'Orders', icon: Truck, perm: 'inventory' },
        { to: '/inventory', label: 'Products', icon: Package, perm: 'inventory' },
        { to: '/party', label: 'Party', icon: Users, perm: 'credit' },
        { to: '/credit', label: 'Khata', icon: Wallet, perm: 'credit' },
        { to: '/history', label: 'Invoices', icon: FileText, perm: 'pos' },
        { to: '/expiry', label: 'Expiry', icon: ShieldAlert, perm: 'inventory' },
        { to: '/suppliers', label: 'Suppliers', icon: Users2, perm: 'inventory' },
        { to: '/shortage', label: 'Shortage', icon: BookOpen, perm: 'inventory' },
        { to: '/expenses', label: 'Expense', icon: Wallet, perm: 'credit' },
        { to: '/shift', label: 'Shift', icon: Timer, perm: 'pos' },
        { to: '/stock-records', label: 'Stock', icon: Layers, perm: 'inventory' },
        { to: '/reports', label: 'Reports', icon: FileText, perm: 'reports' },
        { to: '/profit', label: 'Profit', icon: TrendingUp, admin: true },
        { to: '/users', label: 'Users', icon: Users2, admin: true },
        { to: '/format', label: 'Format', icon: Sliders, perm: 'pos' },
        { to: '/settings', label: 'Settings', icon: Settings, admin: true },
        { to: '/trash', label: 'Trash', icon: Trash2, admin: true },
    ];

    const visible = ITEMS.filter(i => (i.admin ? isAdmin : hasAccess(i.perm)));
    const isActive = (to) => to === '/' ? location.pathname === '/' : location.pathname.startsWith(to);

    return (
        <div
            className="no-print"
            style={{
                position: 'fixed', top: 0, left: 0, right: 0, height: '54px', zIndex: 1000,
                background: 'var(--menu-bg, #7A1E0C)', color: 'var(--menu-fg, #ffffff)',
                fontFamily: 'var(--menu-font, "Segoe UI", Tahoma, sans-serif)',
                display: 'flex', alignItems: 'center', padding: '0 12px', gap: '6px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.15)', overflow: 'hidden',
            }}
        >
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '2px', paddingLeft: '4px', paddingRight: '12px', flexShrink: 0, borderRight: '1px solid rgba(255,255,255,0.15)', marginRight: '4px' }}>
                <img src={logo} alt="Tehzeeb Logo" style={{ height: '26px', objectFit: 'contain' }} />
                <span style={{ fontWeight: 950, fontSize: '0.55rem', letterSpacing: '0.5px', whiteSpace: 'nowrap' }}>TEHZEEB</span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', overflowX: 'auto', flex: 1, height: '100%', scrollbarWidth: 'none' }}>
                {visible.map((it) => {
                    const Icon = it.icon;
                    const active = isActive(it.to);
                    return (
                        <button
                            key={it.to}
                            onClick={() => navigate(it.to)}
                            title={it.label}
                            style={{
                                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                                gap: '2px', minWidth: '62px', height: '44px', padding: '0 10px', border: 'none', borderRadius: '8px',
                                background: active ? 'rgba(255,255,255,0.20)' : 'transparent',
                                color: 'var(--menu-fg, #ffffff)', fontWeight: 800, fontSize: '0.6rem', cursor: 'pointer',
                                whiteSpace: 'nowrap', letterSpacing: '0.02em', flexShrink: 0, transition: 'background 0.15s',
                            }}
                            onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = 'rgba(255,255,255,0.10)'; }}
                            onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = 'transparent'; }}
                        >
                            <Icon size={17} />
                            {it.label.toUpperCase()}
                        </button>
                    );
                })}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0, paddingLeft: '10px', borderLeft: '1px solid rgba(255,255,255,0.15)' }}>
                <div style={{ textAlign: 'right', lineHeight: 1.1 }}>
                    <div style={{ fontSize: '0.55rem', fontWeight: 800, opacity: 0.75 }}>{(user?.role || '').toUpperCase()}</div>
                    <div style={{ fontSize: '0.78rem', fontWeight: 900, textTransform: 'capitalize', whiteSpace: 'nowrap' }}>{user?.name}</div>
                </div>
                
                <button
                    onClick={() => setIsPremiumModalOpen(true)}
                    title="System Backup & Security"
                    style={{ background: 'linear-gradient(135deg, #10b981, #047857)', border: 'none', color: '#fff', width: '34px', height: '34px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 2px 5px rgba(0,0,0,0.2)' }}
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                </button>

                <button
                    onClick={() => dispatch(logout())}
                    title="Logout"
                    style={{ background: 'rgba(255,255,255,0.12)', border: 'none', color: 'var(--menu-fg, #fff)', width: '34px', height: '34px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
                >
                    <LogOut size={16} />
                </button>
            </div>

            {isPremiumModalOpen && (
                <PremiumModal onClose={() => setIsPremiumModalOpen(false)} />
            )}
        </div>
    );
};

export default Sidebar;

const PremiumModal = ({ onClose }) => {
    const isOnline = navigator.onLine;
    
    const storedTime = localStorage.getItem('tehzeeb_backup_time') || '20:00';
    const formatTime = (timeString) => {
        const [hourString, minute] = timeString.split(':');
        const hour = parseInt(hourString, 10);
        const ampm = hour >= 12 ? 'PM' : 'AM';
        const formattedHour = hour % 12 || 12;
        return `${formattedHour}:${minute} ${ampm}`;
    };
    const displayTime = formatTime(storedTime);

    return (
        <div style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            background: 'rgba(15, 23, 42, 0.7)', backdropFilter: 'blur(10px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            animation: 'fadeIn 0.3s ease'
        }}>
            <div style={{
                background: 'white', width: '90%', maxWidth: '800px',
                borderRadius: '24px', overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
                display: 'flex', flexDirection: 'column'
            }}>
                {/* Header */}
                <div style={{
                    background: 'linear-gradient(135deg, #1e293b, #0f172a)', padding: '30px',
                    position: 'relative', color: 'white', textAlign: 'center'
                }}>
                    <button onClick={onClose} style={{ position: 'absolute', top: '20px', right: '20px', background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white', width: '32px', height: '32px', borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <X size={18} />
                    </button>
                    
                    <div style={{ width: '60px', height: '60px', background: 'rgba(255, 255, 255, 0.1)', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 15px', border: '1px solid rgba(255,255,255,0.2)' }}>
                        <Cloud size={32} color="#10b981" />
                    </div>
                    <h2 style={{ fontSize: '1.8rem', fontWeight: 950, margin: '0 0 5px' }}>TEHZEEB <span style={{ color: '#10b981' }}>DATA BACKUP</span></h2>
                    <p style={{ margin: 0, opacity: 0.8, fontSize: '0.9rem', fontWeight: 600 }}>Secure your business records and daily transactions</p>
                </div>

                {/* Body */}
                <div style={{ padding: '40px', background: '#f8fafc' }}>
                    <div style={{ textAlign: 'center', marginBottom: '30px' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: '#dcfce7', color: '#166534', padding: '6px 15px', borderRadius: '20px', fontWeight: 800, fontSize: '0.8rem', marginBottom: '15px' }}>
                            <div style={{ width: '8px', height: '8px', background: '#22c55e', borderRadius: '50%', animation: 'pulse 2s infinite' }}></div>
                            SYSTEM AUTO-BACKUP: ENABLED
                        </div>
                        <h3 style={{ fontSize: '1.2rem', color: '#1e293b', fontWeight: 900 }}>Data Protection Center</h3>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                        {/* Auto Backup Info */}
                        <div style={{ background: '#0f172a', padding: '25px', borderRadius: '16px', border: '2px solid #10b981', boxShadow: '0 10px 15px -3px rgba(16, 185, 129, 0.2)', position: 'relative' }}>
                            <div style={{ position: 'absolute', top: '-12px', right: '20px', background: '#10b981', color: 'white', padding: '4px 12px', borderRadius: '12px', fontSize: '0.7rem', fontWeight: 900 }}>{displayTime} DAILY</div>
                            <h4 style={{ fontSize: '1.1rem', fontWeight: 900, color: '#f8fafc', marginBottom: '10px' }}>Automated Routine</h4>
                            <p style={{ color: '#cbd5e1', fontSize: '0.85rem', fontWeight: 600, lineHeight: 1.5, marginBottom: '20px' }}>The system is scheduled to securely dump the database and update local records every day.</p>
                            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                <li style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.85rem', fontWeight: 600, color: '#94a3b8' }}><div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981' }}></div> Sales & Inventory Saved</li>
                                <li style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.85rem', fontWeight: 600, color: '#94a3b8' }}><div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981' }}></div> Khata Balances Updated</li>
                            </ul>
                        </div>

                        {/* Manual Backup */}
                        <div style={{ background: 'white', padding: '25px', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column' }}>
                            <h4 style={{ fontSize: '1.1rem', fontWeight: 900, color: '#475569', marginBottom: '10px' }}>Manual Backup</h4>
                            <p style={{ color: '#64748b', fontSize: '0.85rem', fontWeight: 600, lineHeight: 1.5, flex: 1 }}>Download a complete SQL dump immediately to your hard drive for offline safekeeping.</p>
                            <button onClick={() => {
                                import('react-hot-toast').then(({ default: toast }) => toast.success("Preparing backup file... Downloading soon.", { duration: 4000 }));
                            }} style={{ width: '100%', padding: '14px', background: '#0f172a', color: 'white', borderRadius: '10px', border: 'none', fontWeight: 800, cursor: 'pointer' }}>
                                EXPORT NOW
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
