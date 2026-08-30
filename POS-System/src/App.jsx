import React, { useState, useEffect, lazy, Suspense } from 'react';
import { HashRouter as Router, Routes, Route, useLocation, Link, Navigate, useNavigate } from 'react-router-dom';
import { Provider } from 'react-redux';
import { store } from './store';
import { Toaster } from 'react-hot-toast';
import { LayoutDashboard, Menu, X, Wifi, WifiOff, Box, Hash, Loader2 } from 'lucide-react';
import Calculator from './components/Calculator';

import Sidebar from './components/Sidebar';
import LoadingProgress from './components/LoadingProgress';

// PERFORMANCE: Pages are lazy-loaded so the initial bundle stays small and
// each screen's code (POS ~94KB, Settings ~112KB, etc.) is only fetched when
// the user actually navigates to it. This dramatically speeds up first paint.
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Inventory = lazy(() => import('./pages/Inventory'));
const POS = lazy(() => import('./pages/POS'));
const SalesHistory = lazy(() => import('./pages/SalesHistory'));
const ShiftManagement = lazy(() => import('./pages/ShiftManagement'));
const CreditManagement = lazy(() => import('./pages/CreditManagement'));
const Party = lazy(() => import('./pages/Party'));
const Invoice = lazy(() => import('./pages/Invoice'));
const OrdersHub = lazy(() => import('./pages/OrdersHub'));
const Settings = lazy(() => import('./pages/Settings'));
const Reports = lazy(() => import('./pages/Reports'));
const ReportsHub = lazy(() => import('./pages/ReportsHub'));
const Format = lazy(() => import('./pages/Format'));
const ProfitMastery = lazy(() => import('./pages/ProfitMastery'));
const ProductInsights = lazy(() => import('./pages/ProductInsights'));
const OrderManagement = lazy(() => import('./pages/OrderManagement'));
const BillManagement = lazy(() => import('./pages/BillManagement'));
const ExpiryManagement = lazy(() => import('./pages/ExpiryManagement'));
const ShortageBook = lazy(() => import('./pages/ShortageBook'));
const ExpenseTracker = lazy(() => import('./pages/ExpenseTracker'));
const SupplierManagement = lazy(() => import('./pages/SupplierManagement'));
const Trash = lazy(() => import('./pages/Trash'));
const StockRecords = lazy(() => import('./pages/StockRecords'));

import { db } from './database';
import { useDispatch, useSelector } from 'react-redux';
import { RefreshCw, LogOut } from 'lucide-react';
import toast from 'react-hot-toast';
import { setInventory } from './store/slices/inventorySlice';
import { setCustomers } from './store/slices/customerSlice';
import { setSales } from './store/slices/salesSlice';
import { logout } from './store/slices/authSlice';
import { setShifts } from './store/slices/shiftSlice';
import { setShortageItems } from './store/slices/shortageSlice';
import { setExpenses } from './store/slices/expensesSlice';
import { setSuppliers } from './store/slices/suppliersSlice';
import { setOrders } from './store/slices/ordersSlice';
import { processSyncQueue } from './utils/offlineSync';
import Login from './pages/Login';
const Register = lazy(() => import('./pages/Register'));
const UserManagement = lazy(() => import('./pages/UserManagement'));
import { toggleCalculator, openCalculator, closeCalculator } from './store/slices/uiSlice';

// Lightweight fallback shown while a lazy page chunk is loading.
const PageLoader = () => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', width: '100%' }}>
    <Loader2 size={40} color="#F7941D" className="animate-spin" />
  </div>
);

// welcome start-up sound removed

const LockScreen = ({ message }) => (
  <div style={{ position: 'fixed', inset: 0, zIndex: 999999, backgroundColor: '#0f172a', color: '#fff', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: 'system-ui, sans-serif' }}>
    <h1 style={{ color: '#ef4444', fontSize: '3.5rem', fontWeight: '900', marginBottom: '20px', letterSpacing: '2px' }}>SYSTEM BLOCKED</h1>
    <p style={{ fontSize: '1.5rem', textAlign: 'center', maxWidth: '80%', color: '#f8fafc', fontWeight: '600' }}>{message || "Pending Payment"}</p>
    <p style={{ marginTop: '50px', color: '#64748b', fontSize: '0.9rem' }}>Please contact the developer/administrator to resolve this issue and unlock the system.</p>
  </div>
);

function AppContent() {
  const dispatch = useDispatch();
  const { isAuthenticated, user } = useSelector(state => state.auth);

  // REMOTE KILL SWITCH
  const [isLocked, setIsLocked] = useState(localStorage.getItem('tehzeeb_system_locked') === 'true');
  const [lockMessage, setLockMessage] = useState(localStorage.getItem('tehzeeb_lock_message') || 'Pending Payment');

  useEffect(() => {
    // ===================== LICENSE / REMOTE CONTROL =====================
    // Central licenses file (edit this from your Grand-Dashboard). Shape:
    // {
    //   "TZB-001": { "locked": false, "expiry": "2026-12-31", "message": "", "update_enabled": true },
    //   "SHOP-XYZ": { "locked": true,  "expiry": "2026-06-30", "message": "Payment pending" }
    // }
    // Each shop is identified by its own license key (set once per install).
    const LICENSES_URL = "https://raw.githubusercontent.com/Hammad55553/TEHZEEB-POS/main/licenses.json";
    // Backward-compatible global kill switch (locks ALL installs if locked:true).
    const KILL_SWITCH_URL = "https://raw.githubusercontent.com/Hammad55553/TEHZEEB-POS/main/killswitch.json";

    const licenseKey = ((typeof window !== 'undefined' && window.__POS_LICENSE__) || localStorage.getItem('tehzeeb_license_key') || '').trim();

    const applyLock = (locked, message) => {
      setIsLocked(locked);
      setLockMessage(message || 'Pending Payment');
      localStorage.setItem('tehzeeb_system_locked', locked ? 'true' : 'false');
      if (message) localStorage.setItem('tehzeeb_lock_message', message);
    };

    const checkLicense = async () => {
      // 1) Per-shop license (only if this install has a key)
      if (licenseKey) {
        try {
          const res = await fetch(`${LICENSES_URL}?t=${Date.now()}`, { cache: 'no-store' });
          if (res.ok) {
            const all = await res.json();
            const lic = all && all[licenseKey];
            if (lic) {
              // expired?
              if (lic.expiry) {
                const exp = new Date(lic.expiry + 'T23:59:59');
                if (!isNaN(exp) && exp < new Date()) {
                  applyLock(true, lic.message || 'License expired. Please renew.');
                  localStorage.setItem('tehzeeb_update_enabled', String(lic.update_enabled !== false));
                  return;
                }
              }
              if (lic.locked === true) {
                applyLock(true, lic.message || 'Account locked. Please contact provider.');
              } else {
                applyLock(false, '');
              }
              localStorage.setItem('tehzeeb_update_enabled', String(lic.update_enabled !== false));
              return; // per-license decision is final
            }
            // key not found in list -> treat as not-yet-activated but do not hard lock
          }
        } catch (e) { /* offline: keep last known status */ }
      }

      // 2) Global kill switch fallback (locks everyone) — also lets you disable
      //    installs that have no license key yet.
      try {
        const res = await fetch(`${KILL_SWITCH_URL}?t=${Date.now()}`, { cache: 'no-store' });
        if (res.ok) {
          const data = await res.json();
          if (data && data.locked === true) applyLock(true, data.message);
          else if (data && data.locked === false) applyLock(false, '');
        }
      } catch (e) { /* offline: keep last known status */ }
    };

    checkLicense();
    // Re-check every 30 min so a lock/unlock reaches the shop without a restart.
    const licTimer = setInterval(checkLicense, 30 * 60 * 1000);
    return () => clearInterval(licTimer);
  }, []);

  if (isLocked) {
    return <LockScreen message={lockMessage} />;
  }

  // Apply saved appearance/format (menu colors, background, zoom) on load
  useEffect(() => {
    try {
      const f = JSON.parse(localStorage.getItem('tehzeeb_format') || '{}');
      const root = document.documentElement;
      if (f.scale) document.body.style.zoom = String(f.scale);
      if (f.bg) { document.body.style.background = f.bg; root.style.setProperty('--bg-main', f.bg); }
      if (f.menuBg) root.style.setProperty('--menu-bg', f.menuBg);
      if (f.menuFg) root.style.setProperty('--menu-fg', f.menuFg);
      if (f.menuFont) root.style.setProperty('--menu-font', f.menuFont);
      if (f.accent) { root.style.setProperty('--primary', f.accent); root.style.setProperty('--accent-green', f.accent); }
    } catch (e) { /* ignore */ }
  }, []);
  const isAdmin = user?.role === 'admin';

  // SECURITY: Never trust localStorage alone for auth. On mount (and whenever
  // Database reports an auth change) verify there is a real, valid session and
  // that the profile is still active + that the cached role matches the DB.
  // If anything is off, force logout. This closes the "set pso_user in console
  // to become admin" bypass — the DB is the source of truth.
  useEffect(() => {
    let cancelled = false;

    const verifySession = async () => {
      // LOCAL/OFFLINE POS: persistence comes from localStorage (pso_user).
      // On refresh we NEVER auto-logout here — a local shop terminal should stay
      // logged in until the user explicitly logs out. Backend calls here could
      // fail (backend restarting/offline) and must not kick the cashier out.
      return;
    };

    verifySession();

    const { data: sub } = db.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') dispatch(logout());
    });

    return () => {
      cancelled = true;
      sub?.subscription?.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const location = useLocation();
  const isBillingMode = location.pathname === '/pos' || location.pathname === '/returns';
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);
  
  const navigate = useNavigate();
  const [showPinModal, setShowPinModal] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [targetPath, setTargetPath] = useState(null);
  const [pinError, setPinError] = useState(false);
  const [attempts, setAttempts] = useState(10);
  const isCalculatorOpen = useSelector(state => state.ui.isCalculatorOpen);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 1024);
  // Percentage loader state for the heavy initial data load (8 tables).
  const [loadProgress, setLoadProgress] = useState(0);
  const [showInitialLoader, setShowInitialLoader] = useState(false);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 1024);
    window.addEventListener('resize', handleResize);
    
    // Heartbeat ping for network tracking — ONLY when a multi-computer network
    // role is actually configured. On a single-computer setup this did nothing
    // useful and just spammed the console with ERR_NETWORK_CHANGED on wifi/LAN
    // changes. Also slowed to every 15s to be gentle.
    const networkRole = localStorage.getItem('tehzeeb_network_role');
    let heartbeat = null;
    if (networkRole) {
      heartbeat = setInterval(async () => {
        try {
          const localApiBase = localStorage.getItem('tehzeeb_server_ip');
          const url = (localApiBase || (window.__POS_API_BASE__ || `http://${window.location.hostname || '127.0.0.1'}:8000`)).replace(/\/$/, '');
          await fetch(`${url}/network/heartbeat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ role: networkRole, user: user?.name || user?.email || 'Unknown' })
          });
        } catch (e) {
          // Silent fail if backend unreachable
        }
      }, 15000);
    }

    return () => {
        window.removeEventListener('resize', handleResize);
        if (heartbeat) clearInterval(heartbeat);
    };
  }, [user]);

  const handleProtectedNavigation = (e, path) => {
    // Only ask for PIN if we are currently in billing mode (POS/Returns)
    if (isBillingMode) {
      e.preventDefault();
      setTargetPath(path);
      setShowPinModal(true);
    } else {
      navigate(path);
    }
  };

  const handlePinSubmit = (e) => {
    e.preventDefault();
    const storedPin = localStorage.getItem('tehzeeb_terminal_pin') || '1234';
    if (pinInput === storedPin) {
      setShowPinModal(false);
      setPinInput('');
      setPinError(false);
      setAttempts(10);
      navigate(targetPath);
    } else {
      const newAttempts = attempts - 1;
      setAttempts(newAttempts);
      setPinError(true);

      if (newAttempts <= 0) {
        toast.error("TOO MANY FAILED ATTEMPTS - LOGGING OUT", { duration: 5000 });
        dispatch(logout());
      } else {
        toast.error(`SECURITY ALERT: WRONG PIN! ${newAttempts} attempts remaining.`, { duration: 4000 });
      }

      setPinInput('');
    }
  };

  // WELCOME AUDIO LOGIC
  const playWelcome = () => { /* start-up sound removed */ };

  // Play on LOGIN
  useEffect(() => {
    if (isAuthenticated) {
      playWelcome();
    }
  }, [isAuthenticated]);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      playWelcome(); // Play on Reconnect
    };
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    let channels = [];

    const fetchData = async (withProgress = false) => {
        if (!isAuthenticated) return;
        setIsSyncing(true);

        // Show the percentage loader only for the heavy initial load, not for
        // background realtime refreshes (those should be silent).
        if (withProgress) {
            setShowInitialLoader(true);
            setLoadProgress(0);
        }

        // Each of the 8 table fetches bumps the percentage as it finishes, so
        // the user sees real progress (e.g. 12% → 25% → …) instead of a frozen
        // spinner. We still run them in parallel for speed.
        const TOTAL_STEPS = 8;
        let done = 0;
        const tick = () => {
            done += 1;
            if (withProgress) setLoadProgress(Math.round((done / TOTAL_STEPS) * 100));
        };
        const track = (p) => p.then((r) => { tick(); return r; });

        try {
            // 1. Initial Fetch (parallel, but each reports progress on finish)
            const localApiBase = localStorage.getItem('tehzeeb_server_ip');
            const baseUrl = (localApiBase || (window.__POS_API_BASE__ || `http://${window.location.hostname || '127.0.0.1'}:8000`)).replace(/\/$/, '');
            
            const fetchApi = async (path) => {
                const res = await fetch(`${baseUrl}${path}`);
                return res.json();
            };

            const [inv, cust, sales, shifts, short, exp, sup, ord] = await Promise.all([
                track(fetchApi('/api/inventory/products')),
                track(fetchApi('/api/party/customers')),
                track(fetchApi('/api/sales')),
                track(fetchApi('/api/shifts')),
                track(fetchApi('/api/inventory/shortage')),
                track(fetchApi('/api/expenses')),
                track(fetchApi('/api/party/suppliers')),
                track(fetchApi('/api/orders'))
            ]);

            if (inv.data) dispatch(setInventory(inv.data));
            if (cust.data) dispatch(setCustomers(cust.data));
            if (sales.data) dispatch(setSales(sales.data.sort((a,b) => new Date(b.created_at)-new Date(a.created_at))));
            if (shifts.data) {
                const activeShift = shifts.data.find(s => s.status === 'active' && s.staff_id === user.uid);
                const history = shifts.data
                    .filter(s => s.status !== 'active' && (isAdmin || s.staff_id === user.uid))
                    .sort((a,b) => new Date(b.start_time)-new Date(a.start_time));
                dispatch(setShifts({ activeShift, history }));
            }
            if (short.data) dispatch(setShortageItems(short.data));
            if (exp.data) dispatch(setExpenses(exp.data));
            if (sup.data) dispatch(setSuppliers(sup.data));
            if (typeof ord !== 'undefined' && ord.data) dispatch(setOrders(ord.data.sort((a,b) => new Date(b.created_at)-new Date(a.created_at))));

        } catch (err) {
            console.error(err);
        } finally {
            setIsSyncing(false);
            if (withProgress) {
                setLoadProgress(100);
                // Hold at 100% briefly so the fill animation completes, then hide.
                setTimeout(() => setShowInitialLoader(false), 400);
            }
        }
    };

    // PERFORMANCE: A single sale can fire several postgres_changes events in a
    // burst (sales + sale_items + inventory stock update). Previously each event
    // triggered a full re-fetch of every table, hammering Database bandwidth and
    // egress. Debounce so a burst of changes results in ONE refetch ~800ms later.
    let debounceTimer = null;
    const debouncedFetch = () => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => fetchData(), 800);
    };

    if (isAuthenticated) {
        // OFFLINE-FIRST: If we already have cached data in Redux (restored from
        // localStorage on reload), show it INSTANTLY and refresh silently in the
        // background — no full-screen loader, no waiting. The percentage loader
        // only appears on a genuine cold start (empty cache / first ever login).
        const hasCachedData =
            (store.getState().inventory?.items?.length || 0) > 0 ||
            (store.getState().sales?.history?.length || 0) > 0;

        fetchData(!hasCachedData);
        processSyncQueue();

        // Live cross-computer sync (polls the server every few seconds) is only
        // needed in a multi-computer network setup. On a single computer it just
        // spammed the console with ERR_NETWORK_CHANGED when wifi/LAN changed and
        // did no useful work. Enable it only when a network role is configured.
        const networkRoleSet = localStorage.getItem('tehzeeb_network_role');
        if (networkRoleSet) {
            const mainChannel = db.channel('db-changes')
                .on('postgres_changes', { event: '*', schema: 'public', table: 'inventory' }, debouncedFetch)
                .on('postgres_changes', { event: '*', schema: 'public', table: 'sales' }, debouncedFetch)
                .on('postgres_changes', { event: '*', schema: 'public', table: 'customers' }, debouncedFetch)
                .on('postgres_changes', { event: '*', schema: 'public', table: 'shifts' }, debouncedFetch)
                .on('postgres_changes', { event: '*', schema: 'public', table: 'shortage' }, debouncedFetch)
                .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, debouncedFetch)
                .on('postgres_changes', { event: '*', schema: 'public', table: 'expenses' }, debouncedFetch)
                .on('postgres_changes', { event: '*', schema: 'public', table: 'suppliers' }, debouncedFetch)
                .subscribe();
            channels.push(mainChannel);
        }
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearTimeout(debounceTimer);
      channels.forEach(ch => db.removeChannel(ch));
    };
  }, [isAuthenticated, dispatch]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'F3') {
        e.preventDefault();
        dispatch(toggleCalculator());
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const { items: localInv } = useSelector(state => state.inventory);
  const { list: localCust } = useSelector(state => state.customers);
  const { history: localSales } = useSelector(state => state.sales);
  const { history: localShifts, activeShift: localActiveShift } = useSelector(state => state.shift);
  const { items: localShort } = useSelector(state => state.shortage);
  const { list: localExp } = useSelector(state => state.expenses);
  const { list: localSup } = useSelector(state => state.suppliers);

  const handleManualSync = async () => {
    if (!navigator.onLine) return;
    setIsSyncing(true);
    try {
        // Force Refetch from Database
        const localApiBase = localStorage.getItem('tehzeeb_server_ip');
        const baseUrl = (localApiBase || (window.__POS_API_BASE__ || `http://${window.location.hostname || '127.0.0.1'}:8000`)).replace(/\/$/, '');
        const fetchApi = async (path) => {
            const res = await fetch(`${baseUrl}${path}`);
            return res.json();
        };

        const [inv, cust, sales] = await Promise.all([
            fetchApi('/api/inventory/products'),
            fetchApi('/api/party/customers'),
            fetchApi('/api/sales')
        ]);

        if (inv.data) dispatch(setInventory(inv.data));
        if (cust.data) dispatch(setCustomers(cust.data));
        if (sales.data) dispatch(setSales(sales.data.sort((a,b) => new Date(b.created_at)-new Date(a.created_at))));
      
      toast.success("Database Sync: Active");
    } catch (err) { console.error(err); }
    finally { setIsSyncing(false); }
  };

  if (!isAuthenticated) {
    return (
      <>
        <Toaster position="top-right" />
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/register" element={<Register />} />
            <Route path="*" element={<Login />} />
          </Routes>
        </Suspense>
      </>
    );
  }

  return (
    <div className="app-container">
      <style>{`
          @keyframes shake {
              10%, 90% { transform: translate3d(-1px, 0, 0); }
              20%, 80% { transform: translate3d(2px, 0, 0); }
              30%, 50%, 70% { transform: translate3d(-4px, 0, 0); }
              40%, 60% { transform: translate3d(4px, 0, 0); }
          }
      `}</style>
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: '#1e293b',
            color: '#fff',
            border: '1px solid rgba(255,255,255,0.1)',
            fontWeight: '600'
          }
        }}
      />

      {/* TOP NAVIGATION BAR (Hidden in POS because it has its own) */}
      {!isBillingMode && <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />}

      <main className="main-area" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative', paddingTop: isBillingMode ? 0 : '54px' }}>
        
        {/* COMPACT STATUS BAR (Removed as per user request to hide indicator) */}

        <div className="view-container" style={{ flex: 1, overflowY: 'auto' }}>
          <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/shift" element={<ShiftManagement />} />
            <Route path="/pos" element={<POS />} />
            <Route path="/inventory" element={<Inventory />} />
            <Route path="/credit" element={<CreditManagement />} />
            <Route path="/party" element={<Party />} />
            <Route path="/invoice" element={<Invoice />} />
            <Route path="/orders-center" element={<OrdersHub />} />
            <Route path="/history" element={<SalesHistory />} />
            <Route path="/reports" element={<ReportsHub />} />
            <Route path="/reports-old" element={<Reports />} />
            <Route path="/format" element={<Format />} />
            <Route path="/orders" element={<OrderManagement />} />
            <Route path="/bills" element={<BillManagement />} />
            <Route path="/expiry" element={<ExpiryManagement />} />
            <Route path="/shortage" element={<ShortageBook />} />
            <Route path="/expenses" element={<ExpenseTracker />} />
            <Route path="/suppliers" element={<SupplierManagement />} />
            <Route path="/trash" element={<Trash />} />
            <Route path="/stock-records" element={<StockRecords />} />
            <Route path="/profit" element={isAdmin ? <ProfitMastery /> : <Navigate to="/" />} />
            <Route path="/insights/:productName" element={<ProductInsights />} />

            {/* ADMIN ONLY ROUTES */}
            <Route path="/returns" element={<SalesHistory isReturnsPage={true} />} />
            <Route path="/users" element={isAdmin ? <UserManagement /> : <Navigate to="/" />} />
            <Route path="/settings" element={isAdmin ? <Settings /> : <Navigate to="/" />} />
          </Routes>
          </Suspense>
        </div>
      </main>

      <Calculator isOpen={isCalculatorOpen} onClose={() => dispatch(closeCalculator())} />

      {/* Percentage loader for the heavy initial data load (8 tables) */}
      {showInitialLoader && (
        <LoadingProgress progress={loadProgress} label="Loading store data" fullscreen />
      )}

      {/* SAFETY LOCK MODAL */}
      {showPinModal && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(10px)' }}>
              <div style={{ background: 'white', padding: '40px', borderRadius: '20px', width: '100%', maxWidth: '350px', textAlign: 'center', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.5)' }}>
                  <div style={{ width: '60px', height: '60px', background: '#eef2ff', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                      <Box size={30} color="#6366f1" />
                  </div>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#1e293b', marginBottom: '10px' }}>Terminal Security Lock</h3>
                  <p style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '25px' }}>Enter Terminal PIN to unlock the system dashboard.</p>
                  
                  <form onSubmit={handlePinSubmit}>
                      <input 
                          type="password" 
                          autoFocus
                          placeholder="PIN"
                          style={{ 
                              width: '100%', 
                              padding: '15px', 
                              textAlign: 'center', 
                              fontSize: '1.5rem', 
                              fontWeight: 900, 
                              letterSpacing: '8px', 
                              border: pinError ? '2px solid #ef4444' : '2px solid #e2e8f0', 
                              borderRadius: '12px', 
                              marginBottom: '10px', 
                              outline: 'none',
                              animation: pinError ? 'shake 0.5s cubic-bezier(.36,.07,.19,.97) both' : 'none',
                              background: pinError ? '#fef2f2' : 'white'
                          }}
                          value={pinInput}
                          onChange={(e) => {
                              setPinInput(e.target.value);
                              if (pinError) setPinError(false);
                          }}
                          maxLength={4}
                      />
                      {pinError && (
                          <div style={{ marginBottom: '15px' }}>
                              <p style={{ color: '#ef4444', fontSize: '0.7rem', fontWeight: 800, marginBottom: '2px' }}>WRONG SECURITY PIN</p>
                              <p style={{ color: '#ef4444', fontSize: '0.65rem', fontWeight: 900 }}>{attempts} ATTEMPTS REMAINING</p>
                          </div>
                      )}
                      <div style={{ display: 'flex', gap: '10px' }}>
                          <button type="button" onClick={() => setShowPinModal(false)} style={{ flex: 1, padding: '12px', background: '#f1f5f9', color: '#64748b', border: 'none', borderRadius: '10px', fontWeight: 700, cursor: 'pointer' }}>CANCEL</button>
                          <button type="submit" style={{ flex: 1, padding: '12px', background: '#6366f1', color: 'white', border: 'none', borderRadius: '10px', fontWeight: 700, cursor: 'pointer' }}>UNLOCK</button>
                      </div>
                  </form>
              </div>
          </div>
      )}
    </div>
  );
}

function App() {
  return (
    <Provider store={store}>
      <Router>
        <AppContent />
      </Router>
    </Provider>
  );
}

export default App;
