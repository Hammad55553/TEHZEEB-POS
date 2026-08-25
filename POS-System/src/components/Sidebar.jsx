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
                    onClick={() => dispatch(logout())}
                    title="Logout"
                    style={{ background: 'rgba(255,255,255,0.12)', border: 'none', color: 'var(--menu-fg, #fff)', width: '34px', height: '34px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
                >
                    <LogOut size={16} />
                </button>
            </div>
        </div>
    );
};

export default Sidebar;
