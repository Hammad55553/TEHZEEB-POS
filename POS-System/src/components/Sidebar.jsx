import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import {
    LayoutDashboard, Package, ShoppingCart, History, RotateCcw, Settings, Timer,
    FileText, TrendingUp, Truck, Camera, ShieldAlert, BookOpen, Users, Users2,
    Wallet, Trash2, Layers, LogOut, Sliders, X, Menu
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
                    title="Premium Cloud Features"
                    style={{ background: 'linear-gradient(135deg, #FF8A1E, #D65A00)', border: 'none', color: '#fff', width: '34px', height: '34px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 2px 5px rgba(0,0,0,0.2)' }}
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z"/></svg>
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
                        <Cloud size={32} color="#FF8A1E" />
                    </div>
                    <h2 style={{ fontSize: '1.8rem', fontWeight: 950, margin: '0 0 5px' }}>TEHZEEB <span style={{ color: '#FF8A1E' }}>CLOUD+</span></h2>
                    <p style={{ margin: 0, opacity: 0.8, fontSize: '0.9rem', fontWeight: 600 }}>Enterprise Software Synchronization & Management</p>
                </div>

                {/* Body */}
                <div style={{ padding: '40px', background: '#f8fafc' }}>
                    {!isOnline ? (
                        <div style={{ textAlign: 'center', padding: '40px 20px', background: '#fef2f2', border: '2px dashed #fca5a5', borderRadius: '16px' }}>
                            <div style={{ width: '50px', height: '50px', background: '#fee2e2', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 15px' }}>
                                <ShieldAlert size={24} color="#ef4444" />
                            </div>
                            <h3 style={{ fontSize: '1.3rem', color: '#991b1b', fontWeight: 900, marginBottom: '10px' }}>NO INTERNET CONNECTION</h3>
                            <p style={{ color: '#b91c1c', fontSize: '0.95rem', fontWeight: 600, maxWidth: '400px', margin: '0 auto' }}>
                                You must connect to the internet to view subscription packages and unlock premium cloud features. Please turn on Wi-Fi or plug in a LAN cable.
                            </p>
                            <button onClick={() => window.location.reload()} style={{ marginTop: '20px', background: '#ef4444', color: 'white', padding: '12px 25px', borderRadius: '8px', border: 'none', fontWeight: 800, cursor: 'pointer' }}>
                                REFRESH CONNECTION
                            </button>
                        </div>
                    ) : (
                        <div>
                            <div style={{ textAlign: 'center', marginBottom: '30px' }}>
                                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: '#dcfce7', color: '#166534', padding: '6px 15px', borderRadius: '20px', fontWeight: 800, fontSize: '0.8rem', marginBottom: '15px' }}>
                                    <div style={{ width: '8px', height: '8px', background: '#22c55e', borderRadius: '50%' }}></div>
                                    SECURE CLOUD CONNECTION ACTIVE
                                </div>
                                <h3 style={{ fontSize: '1.2rem', color: '#1e293b', fontWeight: 900 }}>Upgrade to Premium Cloud Services</h3>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                                {/* Basic Plan */}
                                <div style={{ background: 'white', padding: '25px', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
                                    <h4 style={{ fontSize: '1.1rem', fontWeight: 900, color: '#475569', marginBottom: '5px' }}>Data Backup</h4>
                                    <p style={{ color: '#FF8A1E', fontSize: '1.5rem', fontWeight: 950, marginBottom: '20px' }}>Rs. 1,500 <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>/mo</span></p>
                                    <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                        <li style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.85rem', fontWeight: 600, color: '#64748b' }}><div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981' }}></div> Daily Cloud Backup</li>
                                        <li style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.85rem', fontWeight: 600, color: '#64748b' }}><div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981' }}></div> Disaster Recovery</li>
                                    </ul>
                                </div>

                                {/* Pro Plan */}
                                <div style={{ background: '#0f172a', padding: '25px', borderRadius: '16px', border: '2px solid #FF8A1E', boxShadow: '0 10px 15px -3px rgba(255, 138, 30, 0.2)', position: 'relative' }}>
                                    <div style={{ position: 'absolute', top: '-12px', right: '20px', background: '#FF8A1E', color: 'white', padding: '4px 12px', borderRadius: '12px', fontSize: '0.7rem', fontWeight: 900 }}>RECOMMENDED</div>
                                    <h4 style={{ fontSize: '1.1rem', fontWeight: 900, color: '#f8fafc', marginBottom: '5px' }}>Full Sync & Analytics</h4>
                                    <p style={{ color: '#FF8A1E', fontSize: '1.5rem', fontWeight: 950, marginBottom: '20px' }}>Rs. 3,000 <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>/mo</span></p>
                                    <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                        <li style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.85rem', fontWeight: 600, color: '#cbd5e1' }}><div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#FF8A1E' }}></div> Live Multi-Branch Sync</li>
                                        <li style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.85rem', fontWeight: 600, color: '#cbd5e1' }}><div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#FF8A1E' }}></div> CEO Mobile App Access</li>
                                        <li style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.85rem', fontWeight: 600, color: '#cbd5e1' }}><div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#FF8A1E' }}></div> Remote Manager Control</li>
                                    </ul>
                                </div>
                            </div>

                            <div style={{ marginTop: '30px', textAlign: 'center' }}>
                                <p style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>Please contact Asper InfoTech Support to activate your Cloud Subscription.</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
