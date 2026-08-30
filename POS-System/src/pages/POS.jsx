import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import {
    ShoppingCart,
    Search,
    Trash2,
    Plus,
    Minus,
    Printer,
    User,
    Banknote,
    CreditCard,
    History,
    Settings,
    X,
    Save,
    Pause,
    Play,
    ArrowRight,
    UserPlus,
    Box,
    LayoutGrid,
    Zap,
    ChevronDown,
    ChevronUp,
    AlertCircle,
    CheckCircle,
    Wallet,
    RefreshCw,
    Hash,
    Calculator,
    Wifi,
    WifiOff
} from 'lucide-react';
import { addToSyncQueue } from '../utils/offlineSync';
import { useNavigate } from 'react-router-dom';
import { addSale } from '../store/slices/salesSlice';
import { updateStock, setInventory } from '../store/slices/inventorySlice';
import { updateShiftStats } from '../store/slices/shiftSlice';
import { updateBalance } from '../store/slices/customerSlice';
import { addToShortage } from '../store/slices/shortageSlice';
import toast from 'react-hot-toast';
import doneSound from '../assets/Done.ogg';

import { db } from '../database';


import logo from '../assets/tehzeeb_logo.png';
import jazzcashLogo from '../assets/jazzcash.webp';
import easypaisaLogo from '../assets/Easypaisa.jpg';
import ThermalReceipt from '../components/ThermalReceipt';
import CheckoutSuccessModal from '../components/CheckoutSuccessModal';
import { openCalculator, closeCalculator } from '../store/slices/uiSlice';

const POS = () => {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const inventory = useSelector(state => state.inventory.items);
    const activeShift = useSelector(state => state.shift.activeShift);
    const customers = useSelector(state => state.customers.list);
    const salesHistory = useSelector(state => state.sales?.history || []);
    const user = useSelector(state => state.auth.user);
    const isAdmin = user?.role === 'admin';
    const permissions = user?.permissions || [];
    const hasAccess = (perm) => !perm || isAdmin || permissions.includes(perm);

    const playDone = () => {
        try {
            const audio = new Audio(doneSound);
            audio.play().catch(e => console.log("Audio blocked"));
        } catch (e) { console.error(e); }
    };

    // Error beep (no file needed) — short low tone for failed/invalid scan
    const playError = () => {
        try {
            const AC = window.AudioContext || window.webkitAudioContext;
            const ctx = new AC();
            const o = ctx.createOscillator();
            const g = ctx.createGain();
            o.type = 'square';
            o.frequency.value = 220;
            o.connect(g); g.connect(ctx.destination);
            g.gain.setValueAtTime(0.15, ctx.currentTime);
            o.start();
            o.stop(ctx.currentTime + 0.25);
            o.onended = () => ctx.close();
        } catch (e) { /* ignore */ }
    };

    const [cart, setCart] = useState([]);
    const [parkedBills, setParkedBills] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('All');
    const [selectedCustomer, setSelectedCustomer] = useState(null);
    const [cashReceived, setCashReceived] = useState('');
    const [globalDiscount, setGlobalDiscount] = useState(0);
    const [paymentMethod, setPaymentMethod] = useState('Cash');
    const [lastSale, setLastSale] = useState(null);
    const [isWholesaleMode, setIsWholesaleMode] = useState(false);
    const [walkingCustomerName, setWalkingCustomerName] = useState('');
    const [customerPhone, setCustomerPhone] = useState('');
    const [onlineProvider, setOnlineProvider] = useState('JazzCash');
    const [onlineAccount, setOnlineAccount] = useState('');
    const [suggestion, setSuggestion] = useState('');
    const [manualAdjustment, setManualAdjustment] = useState(0);

    // UI States
    const [showCustomerSearch, setShowCustomerSearch] = useState(false);
    const [showParkedList, setShowParkedList] = useState(false);
    const [showBreakdown, setShowBreakdown] = useState(false);
    const [checkoutStage, setCheckoutStage] = useState('idle'); // idle, printed, reporting
    const [isCheckingOut, setIsCheckingOut] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [pendingPrint, setPendingPrint] = useState(true);
    const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);
    const [mobileTab, setMobileTab] = useState('browse'); // browse, cart
    const [customerSearchTerm, setCustomerSearchTerm] = useState('');

    const [isOnline, setIsOnline] = useState(navigator.onLine);

    // NEW FEATURE STATE (UI-only helpers — no checkout/payment/barcode logic touched)
    const [isFullscreen, setIsFullscreen] = useState(false); // Fast/full-screen mode

    // Fullscreen toggle (safe, try/catch)
    const toggleFullscreen = () => {
        try {
            if (!document.fullscreenElement) {
                const el = document.getElementById('root') || document.documentElement;
                el.requestFullscreen?.();
                setIsFullscreen(true);
            } else {
                document.exitFullscreen?.();
                setIsFullscreen(false);
            }
        } catch (e) { /* ignore */ }
    };

    useEffect(() => {
        const onFsChange = () => setIsFullscreen(!!document.fullscreenElement);
        document.addEventListener('fullscreenchange', onFsChange);
        return () => document.removeEventListener('fullscreenchange', onFsChange);
    }, []);

    // Reprint last receipt — reuses the existing ThermalReceipt/lastSale print path
    const handleReprintLast = () => {
        if (!lastSale) return;
        try {
            playDone();
            setTimeout(() => { window.print(); }, 150);
        } catch (e) { /* ignore */ }
    };

    // Clear cart with confirm (subtle red button uses this)
    const handleClearCart = () => {
        if (cart.length === 0) return;
        if (window.confirm('Clear all items from the cart?')) {
            setCart([]);
            toast.success('Cart cleared');
        }
    };

    // WEIGHT helper: product sold loose by weight (kg) vs by piece (default)
    const isWeight = (p) => p?.sell_type === 'weight';

    // LOW STOCK helpers
    const isLowStock = (item) => {
        if (!item) return false;
        const s = item.stock ?? 0;
        return s <= (item.low_stock || 5);
    };
    const lowStockCount = useMemo(() => inventory.filter(isLowStock).length, [inventory]);

    // TODAY'S SALES SUMMARY (defensive: guards for undefined fields/shapes)
    const todayStats = useMemo(() => {
        const now = new Date();
        const isToday = (d) => {
            if (!d) return false;
            const dt = new Date(d);
            if (isNaN(dt.getTime())) return false;
            return dt.getFullYear() === now.getFullYear() &&
                dt.getMonth() === now.getMonth() &&
                dt.getDate() === now.getDate();
        };
        const todays = (salesHistory || []).filter(s => isToday(s?.created_at || s?.date));
        const total = todays.reduce((acc, s) => acc + (Number(s?.total) || 0), 0);
        return { total, count: todays.length };
    }, [salesHistory]);

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 1024);
        const handleOnline = () => setIsOnline(true);
        const handleOffline = () => setIsOnline(false);

        window.addEventListener('resize', handleResize);
        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('resize', handleResize);
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);


    const searchInputRef = useRef(null);
    const cashInputRef = useRef(null);

    const categories = useMemo(() => ['All', ...new Set(inventory.map(i => i.category))], [inventory]);

    // KEYBOARD SHORTCUTS
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'F1') { e.preventDefault(); searchInputRef.current?.focus(); }
            if (e.key === 'F2') { e.preventDefault(); setShowCustomerSearch(true); }
            if (e.key === 'F3') { e.preventDefault(); dispatch(openCalculator()); }
            if (e.key === 'F10') { 
                e.preventDefault(); 
                if (checkoutStage === 'printed') {
                    resetPOS();
                } else {
                    setPendingPrint(true); setShowConfirm(true); 
                }
            }
            if (e.key === 'F9') { e.preventDefault(); { setPendingPrint(false); setShowConfirm(true); } }
            if (e.key === 'F4') { e.preventDefault(); handleParkBill(); }
            if (e.key === 'Escape') {
                setShowCustomerSearch(false);
                setShowParkedList(false);
                setSearchTerm('');
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [cart, selectedCustomer, cashReceived, globalDiscount, paymentMethod, checkoutStage]);

    // GLOBAL BARCODE SCANNER INTERCEPTOR
    useEffect(() => {
        let barcodeBuffer = '';
        let lastKeyTime = 0;

        const handleGlobalScan = (e) => {
            // Ignore if typing inside input fields (except if they want global override, but usually we let inputs work)
            const activeTag = document.activeElement.tagName.toLowerCase();
            if (activeTag === 'input' || activeTag === 'textarea') return;

            const currentTime = new Date().getTime();
            if (currentTime - lastKeyTime > 100) {
                barcodeBuffer = ''; // Reset if typing slowly (human)
            }
            lastKeyTime = currentTime;

            if (e.key === 'Enter') {
                if (barcodeBuffer.length > 2) { // valid barcode length
                    e.preventDefault();
                    handleBarcodeScan(barcodeBuffer);
                }
                barcodeBuffer = '';
            } else if (e.key.length === 1) { // Normal characters
                barcodeBuffer += e.key;
            }
        };

        window.addEventListener('keypress', handleGlobalScan);
        return () => window.removeEventListener('keypress', handleGlobalScan);
    }, [inventory]);

    // BARCODE AUTO-SCAN
    // BARCODE SCAN: only act on Enter (scanner sends Enter after code).
    // Exact barcode/id match -> beep + add. No match -> error beep, nothing added.
    const handleBarcodeScan = (code) => {
        const term = (code || '').trim();
        if (!term) return;
        const item = inventory.find(i => i.barcode === term || String(i.id) === term);
        if (item) {
            addToCart(item);
            setSearchTerm('');
            setSuggestion('');
            playDone();
            // short + fixed id so rapid scans replace the toast instead of stacking many
            toast.success(`${item.name} added`, { id: 'scan-add', duration: 800 });
        } else {
            playError();
            toast.error('Item not found / wrong code');
        }
    };

    // GHOST AUTOCOMPLETE LOGIC
    useEffect(() => {
        if (searchTerm && searchTerm.length >= 2) {
            const match = inventory.find(i =>
                i.name?.toLowerCase().startsWith(searchTerm.toLowerCase())
            );
            if (match) {
                setSuggestion(match.name);
            } else {
                setSuggestion('');
            }
        } else {
            setSuggestion('');
        }
    }, [searchTerm, inventory]);

    const filteredInventory = useMemo(() => {
        const q = (searchTerm || '').toLowerCase().trim();
        // Performance: with thousands of products, don't render the whole catalog
        // when nothing is searched and no category is picked. Show results only
        // once the user searches or selects a category.
        if (!q && selectedCategory === 'All') return [];
        return inventory.filter(item => {
            const matchesSearch = !q ||
                item.name?.toLowerCase().includes(q) ||
                String(item.id).toLowerCase().includes(q) ||
                (item.barcode && item.barcode.includes(searchTerm)) ||
                (item.manufacturer && item.manufacturer.toLowerCase().includes(q)) ||
                (item.batch_no && item.batch_no.toLowerCase().includes(q));
            const matchesCat = selectedCategory === 'All' || item.category === selectedCategory;
            return matchesSearch && matchesCat;
        });
    }, [searchTerm, selectedCategory, inventory]);

    const addToCart = (product) => {
        const inventoryItem = inventory.find(i => i.id === product.id);
        // FAST SCAN SAFE: use a functional update so rapid scans (2-3 per second)
        // never work off a stale cart — every scan is guaranteed to be added.
        setCart(prev => {
            const existing = prev.find(c => c.id === product.id);
            const currentQtyInCart = existing ? existing.quantity : 0;
            if (inventoryItem && inventoryItem.stock <= currentQtyInCart) {
                toast.success(`Demand entry: Sourcing from outside needed.`);
            }
            if (existing) {
                return prev.map(c => c.id === product.id ? { ...c, quantity: c.quantity + 1 } : c);
            }
            const initialPrice = isWholesaleMode ? (product.wholesale_price || product.price) : product.price;
            return [{ ...product, quantity: 1, discount: 0, reason: '', custom_price: initialPrice }, ...prev];
        });
        setSearchTerm('');
        searchInputRef.current?.focus();
    };

    const updateCartItem = (id, field, value) => {
        if (field === 'quantity') {
            const inventoryItem = inventory.find(i => i.id === id);
            if (inventoryItem && value > inventoryItem.stock) {
                toast.success(`Exceeding system stock. Please provide a sourcing reason.`);
            }
        }
        setCart(cart.map(c => c.id === id ? { ...c, [field]: value } : c));
    };

    const removeFromCart = (id) => setCart(cart.filter(c => c.id !== id));

    const handleParkBill = () => {
        if (cart.length === 0) return;
        setParkedBills([...parkedBills, { id: Date.now(), cart, selectedCustomer, time: new Date().toLocaleTimeString() }]);
        setCart([]);
        setSelectedCustomer(null);
        toast.success('Bill Parked (Hold)');
    };

    const restoreParked = (bill) => {
        setCart(bill.cart);
        setSelectedCustomer(bill.selectedCustomer);
        setParkedBills(parkedBills.filter(b => b.id !== bill.id));
        setShowParkedList(false);
        playDone();
        toast.success('Bill recalled');
    };

    // CALCULATIONS
    const subtotal = cart.reduce((acc, c) => {
        const itemPrice = c.custom_price !== undefined ? c.custom_price : (isWholesaleMode ? (c.wholesale_price || c.price) : c.price);
        return acc + (itemPrice * c.quantity);
    }, 0);
    const itemDiscounts = cart.reduce((acc, c) => acc + (c.discount || 0), 0);

    // ITEM-BASED TAX CALCULATION (Default 0% unless set in Inventory)
    const tax = cart.reduce((acc, c) => {
        const itemPrice = c.custom_price !== undefined ? c.custom_price : (isWholesaleMode ? (c.wholesale_price || c.price) : c.price);
        const taxableAmount = (itemPrice * c.quantity) - (c.discount || 0);
        const itemTax = taxableAmount * (c.tax_percent || 0) / 100;
        return acc + itemTax;
    }, 0);

    const finalTotal = subtotal - itemDiscounts - globalDiscount + tax + manualAdjustment;
    const changeAmount = cashReceived ? parseFloat(cashReceived) - finalTotal : 0;

    useEffect(() => {
        const handleAfterPrint = () => {
            // This event fires after the print dialog is closed
            setCheckoutStage(prev => (prev === 'printing' ? 'printed' : prev));
        };

        window.addEventListener('afterprint', handleAfterPrint);
        return () => window.removeEventListener('afterprint', handleAfterPrint);
    }, []);

    const resetPOS = () => {
        setCart([]);
        setSearchTerm('');
        setSelectedCustomer(null);
        setCashReceived('');
        setGlobalDiscount(0);
        setPaymentMethod('Cash');
        setLastSale(null);
        setCheckoutStage('idle');
        setIsWholesaleMode(false);
        setWalkingCustomerName('');
        setCustomerPhone('');
        setOnlineAccount('');
        setOnlineProvider('JazzCash');
        setManualAdjustment(0);
    };

    const handleCheckout = async (shouldPrint = true) => {
        if (!activeShift || isCheckingOut) return;

        if (cart.length === 0) { toast.error('Add items first!'); return; }

        // KHATA (CREDIT): account/customer MUST be selected first
        if (paymentMethod === 'Credit' && !selectedCustomer) {
            toast.error('Khata sale: pehle customer/account select karein!');
            return;
        }

        // CASH: "Customer Give" (cash received) is mandatory and must cover the bill,
        // otherwise do not proceed / print.
        if (paymentMethod === 'Cash') {
            const given = parseFloat(cashReceived);
            if (!cashReceived || isNaN(given) || given <= 0) {
                toast.error('Customer Give (received amount) likhna zaroori hai!');
                return;
            }
            if (given < finalTotal) {
                toast.error(`Received Rs ${given} kam hai. Total Rs ${Math.round(finalTotal)} hai.`);
                return;
            }
        }

        // STOCK GUARD: block accidental over-selling. Selling more than the
        // available stock is only allowed when the line has an external-sourcing
        // `reason` (item brought in from outside). Without a reason, a quantity
        // above stock would push inventory negative — stop and warn instead.
        const overSold = cart.find(c => {
            const inv = inventory.find(i => i.id === c.id);
            const available = inv ? (inv.stock || 0) : 0;
            return !c.reason && c.quantity > available;
        });
        if (overSold) {
            const inv = inventory.find(i => i.id === overSold.id);
            toast.error(`Not enough stock for "${overSold.name}" (have ${inv?.stock || 0}, need ${overSold.quantity}). Add a sourcing reason to sell beyond stock.`);
            return;
        }

        // ONLINE & CARD VALIDATION
        if ((paymentMethod === 'Online' || paymentMethod === 'Card') && !customerPhone) {
            toast.error(`CUSTOMER PHONE IS MANDATORY FOR ${paymentMethod.toUpperCase()} PAYMENT!`);
            return;
        }

        setIsCheckingOut(true);
        const saleId = Date.now() + Math.floor(Math.random() * 1000); // BIGINT safe ID for Postgres

        const saleData = {
            id: saleId,
            customer_name: selectedCustomer ? selectedCustomer.name : (walkingCustomerName || 'WALK-IN CUSTOMER'),
            customer_id: selectedCustomer?.id || null,
            total: finalTotal,
            subtotal,
            tax,
            discount: itemDiscounts + globalDiscount,
            payment_method: paymentMethod,
            payment_details: (paymentMethod === 'Online' || paymentMethod === 'Card') ? {
                provider: paymentMethod === 'Online' ? onlineProvider : 'Card Machine',
                account: paymentMethod === 'Online' ? onlineAccount : 'POS Terminal',
                customer_phone: customerPhone
            } : null,
            status: paymentMethod === 'Credit' ? 'Khatta' : 'Paid',
            cashier: user?.name || activeShift?.staffName || 'Operator',
            shift_id: activeShift.id,
            data: { 
                is_wholesale_mode: isWholesaleMode,
                manual_adjustment: manualAdjustment,
                product_name: cart.map(item => item.name).join(', ')
            }
        };

        try {
            // 1. Save main sale
            const { data: savedSale, error: saleError } = await db
                .from('sales')
                .insert([saleData])
                .select()
                .single();

            if (saleError) {
                console.warn("Offline: Queuing Sale...");
                addToSyncQueue('sales', 'insert', saleData);
            }

            const finalSaleId = savedSale?.id || saleId;

            // 2. Save sale items
            const saleItemsData = cart.map(item => ({
                sale_id: finalSaleId,
                product_id: item.id,
                qty: item.quantity,
                price: item.custom_price !== undefined ? item.custom_price : (isWholesaleMode ? (item.wholesale_price || item.price) : item.price),
                buy_price: item.buy_price || 0,
                reason: item.reason || null
            }));

            const { error: itemsError } = await db
                .from('sale_items')
                .insert(saleItemsData);

            if (itemsError) {
                addToSyncQueue('sale_items', 'insert', saleItemsData);
            }

            // 3. Automated External Sourcing Expense
            const externalItems = cart.filter(item => item.reason && item.quantity > (inventory.find(i => i.id === item.id)?.stock || 0));
            if (externalItems.length > 0) {
                const totalExpense = externalItems.reduce((sum, item) => sum + ((item.buy_price || 0) * item.quantity), 0);
                if (totalExpense > 0) {
                    const expenseData = {
                        title: `EXT. SOURCING: Bill #${finalSaleId.toString().slice(-6).toUpperCase()}`,
                        amount: totalExpense,
                        category: 'External Sourcing',
                        date: new Date().toISOString(),
                        added_by: user?.name || activeShift?.staffName || 'Operator',
                        sale_id: finalSaleId
                    };
                    const { error: expError } = await db.from('expenses').insert([expenseData]);
                    if (expError) addToSyncQueue('expenses', 'insert', expenseData);
                    toast.success(`Expense Logged!`);
                }
            }

            // 4. Update Inventory Stock & Redux
            const updatedInventory = inventory.map(invItem => {
                const cartItem = cart.find(c => c.id === invItem.id);
                if (cartItem) {
                    const newStock = invItem.stock - cartItem.quantity;
                    const newTotalSold = (invItem.total_sold || 0) + cartItem.quantity;

                    // Fire-and-forget database update (errors handled via sync queue)
                    db.from('inventory')
                        .update({ stock: newStock, total_sold: newTotalSold })
                        .eq('id', invItem.id)
                        .then(({ error }) => {
                            if (error) addToSyncQueue('inventory', 'update', { stock: newStock, total_sold: newTotalSold }, invItem.id);
                        });

                    return { ...invItem, stock: newStock, total_sold: newTotalSold };
                }
                return invItem;
            });

            dispatch(setInventory(updatedInventory));

            // 5. Update Shift Stats
            dispatch(updateShiftStats({ sale: finalTotal }));
            const { data: currentShift } = await db
                .from('shifts')
                .select('sales')
                .eq('id', activeShift.id)
                .single();

            const newShiftSales = (currentShift?.sales || 0) + finalTotal;
            const { error: shiftError } = await db
                .from('shifts')
                .update({ sales: newShiftSales })
                .eq('id', activeShift.id);
            if (shiftError) addToSyncQueue('shifts', 'update', { sales: newShiftSales }, activeShift.id);

            // 6. Update Customer Balance if Credit
            if (paymentMethod === 'Credit' && selectedCustomer) {
                const { data: custData } = await db
                    .from('customers')
                    .select('balance, history')
                    .eq('id', selectedCustomer.id)
                    .single();

                const newBalance = (custData?.balance || 0) + finalTotal;
                const newHistory = [
                    {
                        date: new Date().toISOString(),
                        amount: finalTotal,
                        type: 'credit',
                        note: `POS Sale #${finalSaleId.toString().slice(-6)}`
                    },
                    ...(custData?.history || [])
                ];

                const { error: custError } = await db
                    .from('customers')
                    .update({ balance: newBalance, history: newHistory })
                    .eq('id', selectedCustomer.id);

                if (custError) addToSyncQueue('customers', 'update', { balance: newBalance, history: newHistory }, selectedCustomer.id);
            }

            // Finalize UI States
            setLastSale({ ...saleData, id: finalSaleId, items: cart, cash_received: cashReceived, change_amount: changeAmount, date: new Date().toLocaleString() });

            if (shouldPrint) {
                setCheckoutStage('printing');
                playDone();
                toast.success('Sale Processed Locally (Offline Ready)');
                if (window.printTimer) clearTimeout(window.printTimer);
                window.printTimer = setTimeout(() => {
                    window.print();
                }, 400);
            } else {
                setCheckoutStage('printed');
                playDone();
                toast.success('Sale Processed Successfully!');
            }

        } catch (err) {
            console.error("Checkout Error:", err);
            toast.success("Saved Locally (Offline Mode)");
            setCheckoutStage('printed');
        } finally {
            setIsCheckingOut(false);
        }
    };

    if (!activeShift) {
        return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', background: '#f1f5f9' }}>
                <div style={{ textAlign: 'center', padding: '60px', background: 'white', borderRadius: '12px', borderTop: '5px solid var(--primary)', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}>
                    <div style={{ width: '70px', height: '70px', background: 'var(--primary-light)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                        <Box size={35} color="var(--primary)" />
                    </div>
                    <h2 style={{ fontSize: '1.8rem', fontWeight: 900, color: 'var(--sidebar-active)' }}>TERMINAL STANDBY</h2>
                    <p style={{ color: '#64748b', marginTop: '10px', maxWidth: '300px' }}>Terminal is currently offline. Start a new session to begin billing.</p>
                    <button onClick={() => navigate('/shift')} style={{ marginTop: '30px', width: '100%', padding: '15px', background: 'var(--primary)', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 800, cursor: 'pointer', fontSize: '1rem' }}>OPEN TERMINAL</button>
                </div>
            </div>
        );
    }

    return (
        <>
            <div className="no-print" style={{ display: 'grid', gridTemplateRows: isMobile ? '50px 1fr auto' : '50px 1fr', height: '100%', background: '#e2e8f0', overflow: 'hidden' }}>

                {/* 1. TOP ERP BAR */}
                <header style={{
                    background: 'var(--menu-bg, var(--sidebar-active))',
                    color: 'var(--menu-fg, white)',
                    fontFamily: 'var(--menu-font, inherit)',
                    display: 'flex',
                    alignItems: 'center',
                    padding: isMobile ? '10px 12px' : '0 20px',
                    gap: '6px',
                    height: isMobile ? '45px' : '52px',
                    overflow: 'hidden',
                    boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                        <button
                            onClick={() => navigate('/')}
                            style={{
                                background: 'rgba(255,255,255,0.1)',
                                border: 'none',
                                color: 'white',
                                padding: '8px 12px',
                                borderRadius: '6px',
                                fontWeight: 800,
                                fontSize: '0.75rem',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px'
                            }}
                        >
                            <LayoutGrid size={16} /> DASHBOARD
                        </button>
                    </div>

                    {/* TOOLBAR BUTTONS (role-based, inside status bar) */}
                    {!isMobile && (
                        <div className="nav-scroll-container" style={{ display: 'flex', alignItems: 'center', gap: '6px', overflowX: 'auto', whiteSpace: 'nowrap', flex: 1, scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                            {[
                                { label: 'Calculator', icon: Calculator, action: 'calc', perm: 'pos' },
                                { label: 'New Sale', icon: ShoppingCart, to: '/pos', perm: 'pos' },
                                { label: 'Invoice', icon: History, to: '/invoice', perm: 'pos' },
                                { label: 'Sale Return', icon: RefreshCw, to: '/returns', perm: 'pos' },
                                { label: 'Products', icon: Box, to: '/inventory', perm: 'inventory' },
                                { label: 'Orders', icon: Box, to: '/orders-center', perm: 'inventory' },
                                { label: 'Invoices', icon: History, to: '/history', perm: 'pos' },
                                { label: 'Party', icon: User, to: '/party', perm: 'credit' },
                                { label: 'Khata', icon: Wallet, to: '/credit', perm: 'credit' },
                                { label: 'Expense', icon: Banknote, to: '/expenses', perm: 'credit' },
                                { label: 'Reports', icon: LayoutGrid, to: '/reports', perm: 'reports' },
                                { label: 'Settings', icon: Settings, to: '/settings', adminOnly: true },
                                { label: 'Format', icon: Settings, to: '/format', perm: 'pos' },
                            ]
                            .filter(b => b.adminOnly ? isAdmin : hasAccess(b.perm))
                            .map((b, i) => {
                                const Icon = b.icon;
                                const active = b.to === '/pos';
                                const isQuit = b.label === 'Quit';
                                return (
                                    <button
                                        key={i}
                                        onClick={() => b.action === 'calc' ? dispatch(openCalculator()) : navigate(b.to)}
                                        title={b.label}
                                        style={{
                                            display: 'flex', alignItems: 'center', gap: '6px',
                                            padding: '7px 12px', border: 'none', borderRadius: '6px',
                                            background: active ? 'var(--primary)' : (isQuit ? 'rgba(230,51,41,0.25)' : 'rgba(255,255,255,0.08)'),
                                            color: 'var(--menu-fg, white)', fontWeight: 800, fontSize: '0.72rem',
                                            cursor: 'pointer', transition: 'background 0.15s'
                                        }}
                                        onMouseEnter={e => { if (!active) e.currentTarget.style.background = isQuit ? 'rgba(230,51,41,0.5)' : 'rgba(255,255,255,0.2)'; }}
                                        onMouseLeave={e => { if (!active) e.currentTarget.style.background = isQuit ? 'rgba(230,51,41,0.25)' : 'rgba(255,255,255,0.08)'; }}
                                    >
                                        <Icon size={16} color={active ? 'white' : '#FFB84D'} />
                                        {b.label}
                                    </button>
                                );
                            })}
                        </div>
                    )}

                    {!isMobile ? (
                        <div style={{ marginLeft: 'auto', display: 'flex', gap: '10px', alignItems: 'center', flexShrink: 0 }}>
                            {window.innerWidth >= 1200 && (
                                <>
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                                        <span style={{ fontSize: '0.6rem', fontWeight: 900, color: '#FFB84D' }}>CASHIER</span>
                                        <span style={{ fontSize: '0.82rem', fontWeight: 900, textTransform: 'capitalize' }}>{user?.name}</span>
                                    </div>
                                    <div style={{ height: '28px', borderLeft: '1px solid rgba(255,255,255,0.1)' }}></div>
                                </>
                            )}
                            {/* FAST / FULLSCREEN MODE */}
                            <button
                                onClick={handleReprintLast}
                                disabled={!lastSale}
                                title="Reprint last receipt"
                                style={{ background: lastSale ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.05)', border: 'none', color: lastSale ? 'white' : 'rgba(255,255,255,0.35)', width: '34px', height: '34px', borderRadius: '6px', cursor: lastSale ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                            >
                                <Printer size={16} color={lastSale ? '#FFB84D' : 'rgba(255,255,255,0.35)'} />
                            </button>
                            {/* FAST / FULLSCREEN MODE */}
                            <button
                                onClick={toggleFullscreen}
                                title={isFullscreen ? 'Exit full screen' : 'Full screen (Fast mode)'}
                                style={{ background: isFullscreen ? 'var(--primary)' : 'rgba(255,255,255,0.12)', border: 'none', color: 'white', width: '34px', height: '34px', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                            >
                                <Zap size={16} color={isFullscreen ? 'white' : '#FFB84D'} />
                            </button>
                        </div>
                    ) : (
                        <div style={{ marginLeft: 'auto', display: 'flex', gap: '10px' }}>
                            <button onClick={() => setShowParkedList(true)} style={{ background: '#334155', border: 'none', color: 'white', padding: '8px', borderRadius: '6px' }}><Pause size={18} /></button>
                        </div>
                    )}
                </header>

                {/* 2. OPERATIONAL GRID */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: isMobile ? '1fr' : '1fr 380px',
                    gap: isMobile ? '10px' : '15px',
                    padding: isMobile ? '10px' : '15px',
                    overflow: 'hidden',
                    gridTemplateRows: isMobile ? 'auto 1fr' : 'none',
                    height: '100%',
                    background: '#f8fafc'
                }}>

                    {/* MIDDLE: SEARCH & ITEM LIST */}
                    <div style={{
                        display: (isMobile && mobileTab !== 'browse') ? 'none' : 'grid',
                        gridTemplateRows: 'auto 1fr auto',
                        gap: '1px',
                        background: '#e2e8f0',
                        overflow: 'hidden',
                        minHeight: 0
                    }}>

                        {/* SEARCH HEADER */}
                        <div style={{ background: 'white', padding: '8px 15px', display: 'flex', gap: '10px' }}>
                            <div style={{ position: 'relative', flex: 1 }}>
                                <Search size={18} style={{ position: 'absolute', left: '15px', top: '12px', color: 'var(--primary)', zIndex: 3 }} />
                                <div style={{ position: 'relative', width: '100%' }}>
                                    {/* GHOST SUGGESTION */}
                                    {suggestion && searchTerm && (
                                        <div style={{
                                            position: 'absolute',
                                            left: '45px',
                                            top: '10px',
                                            fontSize: '1rem',
                                            fontWeight: 800,
                                            color: '#cbd5e1',
                                            pointerEvents: 'none',
                                            whiteSpace: 'pre'
                                        }}>
                                            <span style={{ color: 'transparent' }}>{searchTerm}</span>
                                            {suggestion.slice(searchTerm.length)}
                                        </div>
                                    )}
                                    <input
                                        ref={searchInputRef}
                                        type="text"
                                        placeholder="F1: SEARCH ITEM..."
                                        style={{ width: '100%', padding: '10px 15px 10px 45px', fontSize: '1rem', fontWeight: 800, border: '2px solid #cbd5e1', borderRadius: '6px', outline: 'none', background: 'transparent', position: 'relative', zIndex: 2 }}
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        onKeyDown={(e) => {
                                            if ((e.key === 'Tab' || e.key === 'ArrowRight') && suggestion) {
                                                e.preventDefault();
                                                setSearchTerm(suggestion);
                                                setSuggestion('');
                                            }
                                            if (e.key === 'Enter') {
                                                e.preventDefault();
                                                const term = searchTerm.trim();
                                                if (!term) return;
                                                // exact barcode / id -> scan (beep). else if search matches -> add first. else error beep.
                                                const exact = inventory.find(i => i.barcode === term || String(i.id) === term);
                                                if (exact) {
                                                    handleBarcodeScan(term);
                                                } else if (filteredInventory.length > 0) {
                                                    addToCart(filteredInventory[0]);
                                                    setSearchTerm('');
                                                    setSuggestion('');
                                                    playDone();
                                                } else {
                                                    playError();
                                                    toast.error('Item not found / wrong code');
                                                }
                                            }
                                        }}
                                    />
                                </div>
                                {searchTerm && (
                                    <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'white', zIndex: 100, boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', border: '1px solid #cbd5e1', borderRadius: '0 0 6px 6px', maxHeight: '400px', overflowY: 'auto' }}>
                                        {filteredInventory.map(item => (
                                            <div key={item.id} style={{ borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <div onClick={() => addToCart(item)} style={{ padding: '10px 15px', cursor: 'pointer', flex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                        <span style={{ fontSize: '0.95rem', fontWeight: 900, color: '#1e293b' }}>{item.name}</span>
                                                        <div style={{ fontSize: '0.65rem', fontWeight: 700, color: '#64748b', display: 'flex', gap: '8px' }}>
                                                            <span>{item.category}</span>
                                                            {item.batch_no && <span style={{ color: '#ef4444', fontWeight: 900 }}>• BATCH: {item.batch_no}</span>}
                                                            {item.manufacturer && <span style={{ color: 'var(--primary)', fontWeight: 900 }}>• {item.manufacturer?.toUpperCase()}</span>}
                                                        </div>
                                                    </div>
                                                    <span style={{ fontWeight: 900, color: isWholesaleMode ? '#6366f1' : 'var(--primary)', fontSize: '1.2rem' }}>Rs {isWholesaleMode ? (item.wholesale_price || item.price) : item.price}{isWeight(item) ? '/kg' : ''}</span>
                                                </div>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        const shortageItem = {
                                                            name: item.name,
                                                            demand_count: 1,
                                                            status: 'pending',
                                                            notes: 'Added from POS'
                                                        };
                                                        dispatch(addToShortage(shortageItem));
                                                        db.from('shortage').insert([shortageItem]).then(({ error }) => {
                                                            if (!error) toast.success('Marked in Shortage Book (Database)');
                                                        });
                                                        toast.success('Marked in Shortage Book');
                                                    }}
                                                    style={{ margin: '0 15px', background: '#fff7ed', border: '1px solid #fed7aa', color: '#c2410c', padding: '6px 12px', borderRadius: '6px', fontSize: '0.65rem', fontWeight: 900, cursor: 'pointer' }}
                                                >
                                                    SHORT?
                                                </button>
                                            </div>
                                        ))}
                                        {filteredInventory.length === 0 && (
                                            <div style={{ padding: '30px', textAlign: 'center' }}>
                                                <p style={{ color: '#64748b', fontSize: '0.9rem', fontWeight: 700, marginBottom: '15px' }}>Not in inventory?</p>
                                                <button
                                                    onClick={() => {
                                                        const newShortage = {
                                                            name: searchTerm,
                                                            demand_count: 1,
                                                            status: 'pending',
                                                            notes: 'Added from POS'
                                                        };
                                                        dispatch(addToShortage(newShortage));
                                                        db.from('shortage').insert([newShortage]).then(({ error }) => {
                                                            if (!error) toast.success(`"${searchTerm}" added to Shortage Book (Database)`);
                                                        });
                                                        toast.success(`"${searchTerm}" added to Shortage Book`);
                                                        setSearchTerm('');
                                                    }}
                                                    style={{ background: '#6366f1', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '8px', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', margin: '0 auto' }}
                                                >
                                                    <Plus size={16} /> ADD TO SHORTAGE BOOK
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>





                        
                        {/* ITEM TABLE */}
                        <div style={{ background: 'white', overflowY: 'auto', position: 'relative', height: '100%', minHeight: 0 }}>
                            <img src={logo} style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', opacity: 0.03, height: '50%', pointerEvents: 'none', zIndex: 0 }} alt="" />
                            <table style={{ width: '100%', borderCollapse: 'collapse', position: 'relative', zIndex: 1 }}>
                                <thead style={{ position: 'sticky', top: 0, background: 'linear-gradient(135deg, var(--primary-light) 0%, #FDF3D0 100%)', color: 'var(--sidebar-active)', borderBottom: '2px solid #F6D9A8', fontSize: '0.72rem', fontWeight: 950, letterSpacing: '0.05em', textAlign: 'left', zIndex: 2, boxShadow: '0 4px 6px -4px rgba(0,0,0,0.05)' }}>
                                    <tr>
                                        <th style={{ padding: '8px 15px' }}>PRODUCT NAME</th>
                                        <th style={{ padding: '8px 15px', width: '100px' }}>PRICE</th>
                                        <th style={{ padding: '8px 15px', width: '150px' }}>QTY</th>
                                        <th style={{ padding: '8px 15px', width: '100px' }}>DISC</th>
                                        <th style={{ padding: '8px 15px', width: '120px', textAlign: 'right' }}>NET Rs</th>
                                        <th style={{ padding: '8px 15px', width: '50px' }}></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {cart.map((item, idx) => (
                                        <tr key={item.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                            <td style={{ padding: '8px 15px' }}>
                                                <div style={{ fontWeight: 800, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    {item.name}
                                                    {item.quantity > (inventory.find(i => i.id === item.id)?.stock || 0) && (
                                                        <span style={{ fontSize: '0.6rem', background: '#fef3c7', color: '#92400e', padding: '2px 6px', borderRadius: '4px', fontWeight: 900 }}>EXT. SOURCE</span>
                                                    )}
                                                    {isLowStock(inventory.find(i => i.id === item.id)) && (
                                                        <span style={{ fontSize: '0.6rem', background: '#FDF0EF', color: '#E63329', padding: '2px 6px', borderRadius: '4px', fontWeight: 900 }}>LOW</span>
                                                    )}
                                                </div>
                                                <div style={{ fontSize: '0.65rem', color: 'var(--primary)', fontWeight: 700 }}>{item.category} | Stock: {inventory.find(i => i.id === item.id)?.stock || 0}{isWeight(item) ? ' kg' : ''}</div>

                                                {item.quantity > (inventory.find(i => i.id === item.id)?.stock || 0) && (
                                                    <div style={{ marginTop: '8px', display: 'flex', gap: '8px' }}>
                                                        <div style={{ flex: 2 }}>
                                                            <label style={{ fontSize: '0.55rem', fontWeight: 900, color: '#b45309', display: 'block', marginBottom: '2px' }}>SOURCE NOTE</label>
                                                            <input
                                                                placeholder="Where from? (e.g. Ali Medicos)"
                                                                style={{ width: '100%', padding: '6px 10px', fontSize: '0.75rem', border: '1px solid #f59e0b', borderRadius: '4px', background: '#fffbeb', fontWeight: 700 }}
                                                                value={item.reason || ''}
                                                                onChange={(e) => updateCartItem(item.id, 'reason', e.target.value)}
                                                            />
                                                        </div>
                                                        <div style={{ flex: 1 }}>
                                                            <label style={{ fontSize: '0.55rem', fontWeight: 900, color: '#ef4444', display: 'block', marginBottom: '2px' }}>OUR COST (Rs)</label>
                                                            <div style={{ display: 'flex', alignItems: 'center', background: '#fff1f2', borderRadius: '4px', border: '1px solid #fecaca', padding: '0 8px', height: '31px' }}>
                                                                <input
                                                                    type="number"
                                                                    placeholder="Cost"
                                                                    style={{ width: '100%', background: 'transparent', border: 'none', fontSize: '0.8rem', fontWeight: 900, color: '#dc2626', outline: 'none' }}
                                                                    value={item.buy_price || 0}
                                                                    onChange={(e) => updateCartItem(item.id, 'buy_price', parseFloat(e.target.value) || 0)}
                                                                />
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
                                            </td>
                                            <td style={{ padding: '8px 15px', fontWeight: 900 }}>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                                    <label style={{ fontSize: '0.5rem', color: '#64748b', fontWeight: 900 }}>{isWeight(item) ? 'RATE/KG' : 'PRICE'}</label>
                                                    <input
                                                        type="number"
                                                        style={{
                                                            width: '80px',
                                                            padding: '4px',
                                                            border: '1px solid #cbd5e1',
                                                            borderRadius: '4px',
                                                            fontWeight: 900,
                                                            fontSize: '0.9rem',
                                                            background: item.custom_price !== (isWholesaleMode ? (item.wholesale_price || item.price) : item.price) ? '#f0f9ff' : 'white',
                                                            color: item.custom_price !== (isWholesaleMode ? (item.wholesale_price || item.price) : item.price) ? '#0369a1' : 'inherit'
                                                        }}
                                                        value={item.custom_price !== undefined ? item.custom_price : (isWholesaleMode ? (item.wholesale_price || item.price) : item.price)}
                                                        onChange={(e) => updateCartItem(item.id, 'custom_price', parseFloat(e.target.value) || 0)}
                                                    />
                                                    {isWholesaleMode && <div style={{ fontSize: '0.5rem', fontWeight: 900, color: '#6366f1' }}>WHOLESALE RATE</div>}
                                                </div>
                                            </td>
                                            <td style={{ padding: '8px 15px' }}>
                                                {isWeight(item) ? (
                                                    // WEIGHT LINE: decimal kg input (quantity holds kg). Amount = rate/kg * kg.
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                            <input
                                                                type="number"
                                                                min="0"
                                                                step="0.05"
                                                                className="qty-input-no-spin"
                                                                value={item.quantity}
                                                                onChange={(e) => updateCartItem(item.id, 'quantity', Math.max(0, parseFloat(e.target.value) || 0))}
                                                                style={{ width: '70px', padding: '6px', border: '2px solid var(--primary)', borderRadius: '4px', textAlign: 'center', fontWeight: 900, fontSize: '1rem', background: '#FFFBF2', color: 'var(--sidebar-active)' }}
                                                            />
                                                            <span style={{ fontSize: '0.7rem', fontWeight: 950, color: 'var(--primary-hover)' }}>kg</span>
                                                        </div>
                                                        <div style={{ display: 'flex', gap: '4px' }}>
                                                            {[{ l: '250g', v: 0.25 }, { l: '500g', v: 0.5 }, { l: '1kg', v: 1 }].map(c => (
                                                                <button
                                                                    key={c.l}
                                                                    onClick={() => updateCartItem(item.id, 'quantity', c.v)}
                                                                    style={{ padding: '3px 6px', background: 'var(--primary-light)', border: '1px solid #F6D9A8', borderRadius: '4px', fontSize: '0.6rem', fontWeight: 900, color: '#B4581F', cursor: 'pointer' }}
                                                                >
                                                                    {c.l}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                                        <button onClick={() => updateCartItem(item.id, 'quantity', Math.max(1, item.quantity - 1))} style={{ width: '30px', height: '30px', background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '4px', cursor: 'pointer', fontWeight: 900 }}>-</button>
                                                        <input
                                                            type="number"
                                                            min="1"
                                                            className="qty-input-no-spin"
                                                            value={item.quantity}
                                                            onChange={(e) => updateCartItem(item.id, 'quantity', Math.max(1, parseInt(e.target.value) || 1))}
                                                            style={{ width: '80px', padding: '6px', border: '1px solid #cbd5e1', borderRadius: '4px', textAlign: 'center', fontWeight: 900, fontSize: '1rem', background: '#fff' }}
                                                        />
                                                        <button onClick={() => updateCartItem(item.id, 'quantity', item.quantity + 1)} style={{ width: '30px', height: '30px', background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '4px', cursor: 'pointer', fontWeight: 900 }}>+</button>
                                                    </div>
                                                )}
                                            </td>
                                            <td style={{ padding: '8px 15px' }}>
                                                <input
                                                    type="number"
                                                    value={item.discount || 0}
                                                    onChange={(e) => updateCartItem(item.id, 'discount', parseFloat(e.target.value) || 0)}
                                                    style={{ width: '70px', padding: '6px', border: '1px solid #cbd5e1', borderRadius: '4px', textAlign: 'center', fontWeight: 800 }}
                                                />
                                            </td>
                                            <td style={{ padding: '8px 15px', textAlign: 'right', fontWeight: 950, fontSize: '1.1rem', color: isWholesaleMode ? '#4338ca' : 'var(--sidebar-active)' }}>
                                                Rs {((item.custom_price !== undefined ? item.custom_price : (isWholesaleMode ? (item.wholesale_price || item.price) : item.price)) * item.quantity - (item.discount || 0)).toLocaleString()}
                                            </td>
                                            <td style={{ padding: '8px 15px', textAlign: 'right' }}>
                                                <button onClick={() => removeFromCart(item.id)} style={{ color: 'var(--primary-light)', border: 'none', background: '#fee2e2', borderRadius: '50%', width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}><X size={14} color="#ef4444" /></button>
                                            </td>
                                        </tr>
                                    ))}
                                    {cart.length === 0 && (
                                        <tr>
                                            <td colSpan="6" style={{ textAlign: 'center', padding: '150px 20px' }}>
                                                {/* (No content needed here as watermark is behind) */}
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* MIDDLE FOOTER */}
                        {!isMobile && (
                            <div style={{ background: '#f8fafc', padding: '8px 15px', borderTop: '2px solid #e2e8f0', display: 'flex', gap: '15px' }}>
                                <button onClick={handleParkBill} style={{ padding: '10px 20px', background: '#334155', color: 'white', border: 'none', borderRadius: '4px', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <Pause size={16} /> HOLD BILL
                                </button>
                                <button onClick={() => setShowParkedList(true)} style={{ padding: '10px 20px', background: '#334155', color: 'white', border: 'none', borderRadius: '4px', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <Play size={16} /> RECALL
                                    <span style={{ background: parkedBills.length > 0 ? 'var(--primary)' : 'rgba(255,255,255,0.2)', color: 'white', borderRadius: '10px', padding: '1px 8px', fontSize: '0.72rem', fontWeight: 950 }}>{parkedBills.length}</span>
                                </button>
                                {/* CLEAR CART (subtle red, confirm) */}
                                <button
                                    onClick={handleClearCart}
                                    disabled={cart.length === 0}
                                    style={{ padding: '10px 16px', background: cart.length === 0 ? '#fee2e2' : '#FDF0EF', color: '#E63329', border: '1px solid #F5B8B3', borderRadius: '4px', fontWeight: 800, cursor: cart.length === 0 ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '8px', opacity: cart.length === 0 ? 0.6 : 1 }}
                                >
                                    <Trash2 size={16} /> CLEAR CART
                                </button>
                                <div style={{ marginLeft: 'auto', display: 'flex', gap: '30px', alignItems: 'center' }}>
                                    <span style={{ fontSize: '0.9rem', fontWeight: 900, color: '#1e293b' }}>TOTAL ITEMS: {cart.length}</span>
                                    <span style={{ fontSize: '0.9rem', fontWeight: 900, color: '#1e293b' }}>TOTAL QTY: {Math.round(cart.reduce((acc, c) => acc + (Number(c.quantity) || 0), 0) * 100) / 100}</span>
                                </div>
                            </div>
                        )}


                    
                    </div>

                    {/* RIGHT: SETTLEMENT PANEL */}
                    <div style={{
                        display: (isMobile && mobileTab !== 'cart') ? 'none' : 'flex',
                        flexDirection: 'column',
                        background: '#FFFBF2',
                        height: '100%',
                        overflow: 'hidden',
                        borderLeft: isMobile ? 'none' : '1px solid #e2e8f0'
                    }}>

                        {/* CUSTOMER HEADER */}
                        <div style={{ padding: '12px 16px', background: 'linear-gradient(135deg, var(--primary-light) 0%, #FDF3D0 100%)', borderBottom: '1px solid #F6D9A8', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                                <button
                                    onClick={() => setShowCustomerSearch(true)}
                                    style={{ background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-hover) 100%)', color: 'white', border: 'none', borderRadius: '10px', width: '38px', height: '38px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0, boxShadow: '0 2px 6px rgba(210,105,30,0.35)', transition: 'all 0.2s' }}
                                    title="Select Customer (F2)"
                                >
                                    <UserPlus size={18} />
                                </button>
                                <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                                    <span style={{ fontSize: '0.55rem', fontWeight: 800, color: '#B4581F', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Customer Name</span>
                                    {selectedCustomer ? (
                                        <span style={{ fontSize: '0.9rem', fontWeight: 900, color: 'var(--sidebar-active)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                            {selectedCustomer.name?.toUpperCase()}
                                        </span>
                                    ) : (
                                        <input
                                            type="text"
                                            placeholder="WALK-IN"
                                            value={walkingCustomerName}
                                            onChange={(e) => setWalkingCustomerName(e.target.value)}
                                            style={{ border: 'none', borderBottom: '1px dashed var(--primary)', background: 'transparent', fontSize: '0.8rem', fontWeight: 800, color: 'var(--sidebar-active)', outline: 'none', padding: '2px 0', width: '130px' }}
                                        />
                                    )}
                                </div>
                            </div>
                            {selectedCustomer && (
                                <button onClick={() => setSelectedCustomer(null)} style={{ background: '#FDE4E1', border: 'none', color: '#E63329', borderRadius: '50%', width: '26px', height: '26px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                    <X size={14} />
                                </button>
                            )}

                            {isMobile && (
                                <button
                                    onClick={() => setMobileTab('browse')}
                                    style={{
                                        background: 'linear-gradient(135deg, var(--sidebar-active) 0%, var(--sidebar-active) 100%)',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '10px',
                                        padding: '10px 15px',
                                        fontSize: '0.75rem',
                                        fontWeight: 900,
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '6px',
                                        flexShrink: 0,
                                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.15)'
                                    }}
                                >
                                    <Plus size={16} /> ADD ITEMS
                                </button>
                            )}
                        </div>

                        {/* WHOLESALE MODE TOGGLE */}
                        <div style={{ padding: '10px 16px', background: isWholesaleMode ? 'var(--primary-light)' : 'white', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', transition: 'background 0.3s' }}>
                            <span style={{ fontSize: '0.68rem', fontWeight: 800, letterSpacing: '0.06em', color: isWholesaleMode ? '#B4581F' : '#64748b' }}>APPLY WHOLESALE PRICES?</span>
                            <div
                                onClick={() => {
                                    const nextMode = !isWholesaleMode;
                                    setIsWholesaleMode(nextMode);
                                    // Update all existing items in cart to match new mode
                                    setCart(cart.map(item => ({
                                        ...item,
                                        custom_price: nextMode ? (item.wholesale_price || item.price) : item.price
                                    })));
                                }}
                                style={{
                                    width: '50px',
                                    height: '24px',
                                    background: isWholesaleMode ? 'var(--primary)' : '#cbd5e1',
                                    borderRadius: '12px',
                                    position: 'relative',
                                    cursor: 'pointer',
                                    transition: 'all 0.3s',
                                    boxShadow: isWholesaleMode ? 'inset 0 1px 3px rgba(122,30,12,0.3)' : 'none'
                                }}
                            >
                                <div style={{
                                    width: '20px',
                                    height: '20px',
                                    background: 'white',
                                    borderRadius: '50%',
                                    position: 'absolute',
                                    top: '2px',
                                    left: isWholesaleMode ? '28px' : '2px',
                                    transition: 'all 0.3s',
                                    boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
                                }}></div>
                            </div>
                        </div>

{/* FINANCIAL SUMMARY & PAYMENTS */}
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '12px 16px', gap: '10px', overflowY: 'auto' }}>
                            
                            {/* HERO: FINAL AMOUNT */}
                            <div style={{ background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-hover) 100%)', padding: '12px', borderRadius: '12px', color: 'white', textAlign: 'center', position: 'relative', boxShadow: '0 4px 15px -4px rgba(122,30,12,0.4)', flexShrink: 0 }}>
                                <span style={{ fontSize: '0.6rem', fontWeight: 800, color: '#F9C50D', display: 'block', marginBottom: '2px', letterSpacing: '0.14em', textTransform: 'uppercase' }}>Final Amount To Pay</span>
                                <div style={{ fontSize: '2.4rem', fontWeight: 950, lineHeight: 1, letterSpacing: '-1px' }}>Rs {Math.max(0, Math.round(finalTotal)).toLocaleString()}</div>
                            </div>

                            {/* CASH GIVEN & RETURN (PROMINENT AT TOP) */}
                            {paymentMethod === 'Cash' && (
                                <div style={{ background: 'white', padding: '12px', borderRadius: '12px', border: '2px solid var(--primary-light)', boxShadow: '0 2px 8px rgba(0,0,0,0.04)', flexShrink: 0 }}>
                                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                                        <div style={{ flex: 1 }}>
                                            <label style={{ fontSize: '0.55rem', fontWeight: 800, color: '#64748b', display: 'block', marginBottom: '4px', textTransform: 'uppercase' }}>Customer Gave (Rs)</label>
                                            <input
                                                ref={cashInputRef}
                                                type="number"
                                                placeholder="Amount"
                                                style={{ width: '100%', padding: '10px', fontSize: '1.2rem', fontWeight: 950, textAlign: 'center', background: '#FFFBF2', border: '2px solid #F6D9A8', borderRadius: '8px', color: 'var(--sidebar-active)', outline: 'none' }}
                                                value={cashReceived}
                                                onChange={(e) => setCashReceived(e.target.value)}
                                            />
                                        </div>
                                        {cashReceived && (
                                            <div style={{ flex: 1, padding: '10px', borderRadius: '8px', background: changeAmount >= 0 ? 'var(--primary-light)' : '#FDF0EF', textAlign: 'center', border: `2px solid ${changeAmount >= 0 ? 'var(--primary)' : '#ef4444'}` }}>
                                                <div style={{ fontWeight: 900, fontSize: '0.55rem', color: changeAmount >= 0 ? 'var(--primary-hover)' : '#991b1b', textTransform: 'uppercase', marginBottom: '2px' }}>{changeAmount >= 0 ? 'Return To Customer' : 'Short By'}</div>
                                                <div style={{ fontSize: '1.2rem', fontWeight: 950, color: changeAmount >= 0 ? 'var(--primary-hover)' : '#991b1b', lineHeight: 1 }}>Rs {Math.abs(Math.round(changeAmount)).toLocaleString()}</div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* PAYMENT METHODS (COMPACT) */}
                            <div style={{ flexShrink: 0 }}>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '8px' }}>
                                    {[
                                        { id: 'Cash', icon: <Banknote size={16} />, label: 'CASH' },
                                        { id: 'Card', icon: <CreditCard size={16} />, label: 'CARD' },
                                        { id: 'Online', icon: <Zap size={16} />, label: 'ONLINE' },
                                        { id: 'Credit', icon: <UserPlus size={16} />, label: 'KHATTA' }
                                    ].map(method => {
                                        const active = paymentMethod === method.id;
                                        return (
                                        <button
                                            key={method.id}
                                            onClick={() => setPaymentMethod(method.id)}
                                            style={{
                                                padding: '8px 4px',
                                                borderRadius: '8px',
                                                border: '2px solid',
                                                borderColor: active ? 'var(--primary)' : '#e2e8f0',
                                                background: active ? 'linear-gradient(135deg, var(--primary) 0%, var(--primary-hover) 100%)' : 'white',
                                                color: active ? 'white' : '#64748b',
                                                display: 'flex',
                                                flexDirection: 'column',
                                                alignItems: 'center',
                                                gap: '4px',
                                                cursor: 'pointer',
                                                boxShadow: active ? '0 4px 10px -2px rgba(210,105,30,0.4)' : 'none',
                                            }}
                                        >
                                            {method.icon}
                                            <span style={{ fontSize: '0.6rem', fontWeight: 900 }}>{method.label}</span>
                                        </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* ONLINE / CARD FIELDS */}
                            {(paymentMethod === 'Online' || paymentMethod === 'Card') && (
                                <div style={{ background: 'white', padding: '10px', borderRadius: '8px', border: '1px solid #F6D9A8', display: 'flex', flexDirection: 'column', gap: '8px', flexShrink: 0 }}>
                                    {paymentMethod === 'Online' && (
                                        <div style={{ display: 'flex', gap: '6px' }}>
                                            {['JazzCash', 'Easypaisa', 'Bank'].map(p => (
                                                <button
                                                    key={p} type="button" onClick={() => setOnlineProvider(p)}
                                                    style={{ flex: 1, padding: '6px', borderRadius: '6px', border: '2px solid', borderColor: onlineProvider === p ? 'var(--primary)' : '#e2e8f0', background: onlineProvider === p ? 'var(--primary-light)' : 'white', color: onlineProvider === p ? 'var(--primary)' : '#64748b', fontSize: '0.6rem', fontWeight: 900, cursor: 'pointer' }}
                                                >
                                                    {p.toUpperCase()}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                    <div style={{ display: 'flex', gap: '8px' }}>
                                        {paymentMethod === 'Online' && (
                                            <input placeholder="Received On (Number)" value={onlineAccount} onChange={e => setOnlineAccount(e.target.value)} style={{ flex: 1, padding: '8px', border: '1px solid #F6D9A8', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 700, outline: 'none', background: '#FFFBF2' }} />
                                        )}
                                        <input placeholder="Customer Phone *" value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} style={{ flex: 1, padding: '8px', border: '1px solid #F5B8B3', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 700, background: '#FDF0EF', outline: 'none' }} />
                                    </div>
                                </div>
                            )}

                            {/* ADJUSTMENTS BLOCK (COMPACT) */}
                            <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                                <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '6px 10px', flex: 1, display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <label style={{ fontSize: '0.55rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', flexShrink: 0 }}>Override:</label>
                                    <input
                                        type="number" placeholder="Set Rs"
                                        style={{ flex: 1, width: '10%', background: '#f8fafc', border: 'none', color: '#1e293b', fontSize: '0.8rem', fontWeight: 900, textAlign: 'right', outline: 'none' }}
                                        onBlur={(e) => {
                                            const target = parseFloat(e.target.value);
                                            if (!isNaN(target)) setManualAdjustment(target - (subtotal - itemDiscounts - globalDiscount + tax));
                                        }}
                                    />
                                </div>
                                <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '6px 10px', flex: 1, display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <label style={{ fontSize: '0.55rem', fontWeight: 800, color: '#F9C50D', textTransform: 'uppercase', flexShrink: 0 }}>Adj:</label>
                                    <input
                                        type="number" style={{ flex: 1, width: '10%', background: 'transparent', border: 'none', color: '#B4581F', fontSize: '0.8rem', fontWeight: 900, textAlign: 'right', outline: 'none' }}
                                        value={manualAdjustment} onChange={(e) => setManualAdjustment(parseFloat(e.target.value) || 0)}
                                    />
                                </div>
                            </div>

                            {/* BREAKDOWN */}
                            <div style={{ flexShrink: 0 }}>
                                <button
                                    onClick={() => setShowBreakdown(!showBreakdown)}
                                    style={{ width: '100%', padding: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'white', border: '1px solid #e2e8f0', borderRadius: showBreakdown ? '8px 8px 0 0' : '8px', cursor: 'pointer', fontWeight: 800, letterSpacing: '0.05em', color: '#64748b', fontSize: '0.6rem' }}
                                >
                                    <span>{showBreakdown ? 'HIDE' : 'VIEW'} BILL BREAKDOWN</span> {showBreakdown ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                </button>
                                {showBreakdown && (
                                    <div style={{ padding: '8px 12px', display: 'flex', flexDirection: 'column', gap: '6px', border: '1px solid #e2e8f0', borderTop: 'none', borderRadius: '0 0 8px 8px', background: 'white' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem' }}>
                                            <span style={{ fontWeight: 600, color: '#64748b' }}>Total Bill</span>
                                            <span style={{ fontWeight: 800, color: '#1e293b' }}>Rs {subtotal.toLocaleString()}</span>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem' }}>
                                            <span style={{ fontWeight: 600, color: '#64748b' }}>Total Discount</span>
                                            <span style={{ fontWeight: 800, color: '#E63329' }}>- Rs {(itemDiscounts + globalDiscount).toLocaleString()}</span>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', paddingTop: '6px', borderTop: '1px dashed #e2e8f0' }}>
                                            <span style={{ fontWeight: 600, color: '#64748b' }}>Tax Amount</span>
                                            <span style={{ fontWeight: 800, color: tax > 0 ? 'var(--primary)' : '#94a3b8' }}>+ Rs {tax.toLocaleString()}</span>
                                        </div>
                                    </div>
                                )}
                            </div>

                        </div>

                        {/* STICKY ACTIONS FOOTER */}
                        <div style={{
                            padding: '16px',
                            background: 'white',
                            borderTop: '1px solid #e2e8f0',
                            display: 'flex',
                            gap: '12px',
                            boxShadow: '0 -10px 20px -5px rgba(0, 0, 0, 0.05)'
                        }}>
                            <button
                                disabled={isCheckingOut}
                                onClick={() => { setPendingPrint(false); setShowConfirm(true); }}
                                style={{ flex: 1, padding: '16px', background: isCheckingOut ? '#94a3b8' : 'white', color: isCheckingOut ? 'white' : 'var(--primary-hover)', border: isCheckingOut ? '2px solid #94a3b8' : '2px solid var(--primary)', borderRadius: '12px', fontSize: '0.85rem', fontWeight: 900, cursor: isCheckingOut ? 'not-allowed' : 'pointer', letterSpacing: '0.03em', transition: 'all 0.15s' }}
                            >
                                {isCheckingOut ? '...' : 'FINISH (F9)'}
                            </button>
                            <button
                                disabled={isCheckingOut}
                                onClick={() => { setPendingPrint(true); setShowConfirm(true); }}
                                style={{ flex: 2, padding: '16px', background: isCheckingOut ? '#94a3b8' : 'linear-gradient(135deg, var(--primary) 0%, var(--primary-hover) 100%)', color: 'white', border: 'none', borderRadius: '12px', fontSize: '1rem', fontWeight: 950, cursor: isCheckingOut ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', letterSpacing: '0.02em', boxShadow: isCheckingOut ? 'none' : '0 8px 20px -6px rgba(210,105,30,0.6)', transition: 'all 0.15s' }}
                            >
                                {isCheckingOut ? <RefreshCw size={18} className="animate-spin" /> : <Printer size={18} />}
                                {isCheckingOut ? 'SAVING...' : 'PRINT & FINISH (F10)'}
                            </button>
                        </div>
                    </div>
                </div>

                {/* PARKED BILLS MODAL */}
                {showParkedList && (
                    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <div style={{ background: 'white', width: '650px', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)' }}>
                            <div style={{ background: 'var(--sidebar-active)', padding: '20px', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <h3 style={{ fontSize: '1.2rem', fontWeight: 900 }}>RECALL HELD TRANSACTIONS</h3>
                                <button onClick={() => setShowParkedList(false)} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}><X size={24} /></button>
                            </div>
                            <div style={{ padding: '20px' }}>
                                {parkedBills.length === 0 ? (
                                    <div style={{ textAlign: 'center', padding: '80px', color: '#cbd5e1' }}>
                                        <Pause size={60} style={{ opacity: 0.1, marginBottom: '10px' }} />
                                        <p style={{ fontWeight: 800 }}>No bills on hold.</p>
                                    </div>
                                ) : (
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                                        {parkedBills.map(bill => (
                                            <div key={bill.id} onClick={() => restoreParked(bill)} style={{ border: '2px solid #e2e8f0', padding: '20px', borderRadius: '10px', cursor: 'pointer', background: '#f8fafc' }} onMouseOver={e => e.currentTarget.style.borderColor = '#FF8A1E'} onMouseOut={e => e.currentTarget.style.borderColor = '#e2e8f0'}>
                                                <div style={{ fontWeight: 900, color: 'var(--sidebar-active)' }}>{bill.selectedCustomer ? bill.selectedCustomer.name?.toUpperCase() : 'WALK-IN (CASH)'}</div>
                                                <div style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 700, marginTop: '8px' }}>{bill.cart.length} Items | Held: {bill.time}</div>
                                                <div style={{ marginTop: '15px', color: 'var(--primary)', fontWeight: 900, fontSize: '1rem', borderTop: '1px solid #f1f5f9', paddingTop: '10px' }}>RECALL NOW →</div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* CUSTOMER SEARCH MODAL */}
                {showCustomerSearch && (
                    <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.8)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}>
                        <div style={{ background: 'white', width: '550px', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)' }}>
                            <div style={{ background: 'var(--sidebar-active)', padding: '25px', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                    <h3 style={{ fontSize: '1.2rem', fontWeight: 950, letterSpacing: '-0.5px' }}>CUSTOMER LIST</h3>
                                    <p style={{ fontSize: '0.7rem', opacity: 0.8, fontWeight: 700, marginTop: '2px' }}>Search and select account for billing</p>
                                </div>
                                <button onClick={() => { setShowCustomerSearch(false); setCustomerSearchTerm(''); }} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white', cursor: 'pointer', width: '36px', height: '36px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={20} /></button>
                            </div>
                            <div style={{ padding: '20px' }}>
                                <div style={{ position: 'relative', marginBottom: '20px' }}>
                                    <Search size={22} style={{ position: 'absolute', left: '15px', top: '50%', transform: 'translateY(-50%)', color: '#FF8A1E' }} />
                                    <input
                                        autoFocus
                                        placeholder="Type Name, Mobile or Address..."
                                        style={{ width: '100%', padding: '15px 15px 15px 50px', borderRadius: '12px', border: '2px solid #e2e8f0', fontSize: '1.1rem', fontWeight: 800, outline: 'none', transition: 'all 0.2s', color: '#1e293b' }}
                                        value={customerSearchTerm}
                                        onChange={(e) => setCustomerSearchTerm(e.target.value)}
                                        onFocus={(e) => e.target.style.borderColor = '#FF8A1E'}
                                        onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
                                    />
                                </div>
                                <div style={{ maxHeight: '400px', overflowY: 'auto', display: 'grid', gridTemplateColumns: '1fr', gap: '12px', padding: '5px' }}>
                                    {customers
                                        .filter(c =>
                                            c.name?.toLowerCase().includes(customerSearchTerm.toLowerCase()) ||
                                            c.phone?.includes(customerSearchTerm) ||
                                            c.address?.toLowerCase().includes(customerSearchTerm.toLowerCase()) ||
                                            c.id?.toString().includes(customerSearchTerm)
                                        )
                                        .map(c => (
                                            <button
                                                key={c.id}
                                                onClick={() => {
                                                    setSelectedCustomer(c);
                                                    setShowCustomerSearch(false);
                                                    setCustomerSearchTerm('');
                                                }}
                                                style={{ width: '100%', textAlign: 'left', padding: '0', border: 'none', background: 'transparent', cursor: 'pointer' }}
                                            >
                                                <div style={{
                                                    padding: '15px 20px',
                                                    border: '1px solid #f1f5f9',
                                                    borderRadius: '12px',
                                                    background: '#ffffff',
                                                    borderLeft: `5px solid ${c.balance > 0 ? '#ef4444' : '#FF8A1E'}`,
                                                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
                                                    transition: 'transform 0.2s, box-shadow 0.2s'
                                                }} onMouseOver={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 10px 15px -3px rgba(0, 0, 0, 0.1)'; }} onMouseOut={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.05)'; }}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                            <div style={{ width: '40px', height: '40px', background: c.balance > 0 ? '#fff1f1' : 'var(--primary-light)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: c.balance > 0 ? '#ef4444' : '#FF8A1E' }}>
                                                                <User size={20} />
                                                            </div>
                                                            <div>
                                                                <div style={{ fontWeight: 950, fontSize: '1.1rem', color: '#1e293b' }}>{c.name?.toUpperCase()}</div>
                                                                <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 800 }}>ADD: {c.address || 'N/A'} • PH: {c.phone}</div>
                                                            </div>
                                                        </div>
                                                        <div style={{ textAlign: 'right' }}>
                                                            <div style={{ fontSize: '0.65rem', fontWeight: 900, color: '#94a3b8' }}>DUE BALANCE</div>
                                                            <div style={{ fontWeight: 950, color: c.balance > 0 ? '#ef4444' : 'var(--primary)', fontSize: '1.1rem' }}>Rs {(c.balance || 0).toLocaleString()}</div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </button>
                                        ))}
                                </div>
                            </div>
                        </div>
                    </div>
                )}




                <CheckoutSuccessModal
                    checkoutStage={checkoutStage}
                    lastSale={lastSale}
                    logo={logo}
                    resetPOS={resetPOS}
                />

                {/* ANIMATED CONFIRMATION MODAL */}
                {showConfirm && (
                    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 11000, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(5px)' }}>
                        <div style={{
                            background: 'white',
                            width: '400px',
                            padding: '30px',
                            borderRadius: '20px',
                            textAlign: 'center',
                            animation: 'bounceIn 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55)'
                        }}>
                            <div style={{ width: '80px', height: '80px', background: pendingPrint ? 'var(--primary-light)' : '#f0f9ff', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                                {pendingPrint ? <Printer size={40} color="#FF8A1E" /> : <CheckCircle size={40} color="#FF8A1E" />}
                            </div>
                            <h2 style={{ fontSize: '1.5rem', fontWeight: 950, color: '#1e293b', marginBottom: '10px' }}>ARE YOU SURE?</h2>
                            <p style={{ color: '#64748b', fontWeight: 700, marginBottom: '30px' }}>
                                Do you want to {pendingPrint ? 'Print and Save' : 'Save Only'} this transaction of <span style={{ color: 'var(--primary)' }}>Rs {finalTotal.toLocaleString()}</span>?
                            </p>

                            <div style={{ display: 'flex', gap: '12px' }}>
                                <button
                                    onClick={() => setShowConfirm(false)}
                                    style={{ flex: 1, padding: '15px', background: '#f1f5f9', color: '#64748b', border: 'none', borderRadius: '12px', fontWeight: 900, cursor: 'pointer' }}
                                >
                                    NO, CANCEL
                                </button>
                                <button
                                    disabled={isCheckingOut}
                                    onClick={async () => {
                                        await handleCheckout(pendingPrint);
                                        setShowConfirm(false);
                                    }}
                                    style={{
                                        flex: 1,
                                        padding: '15px',
                                        background: isCheckingOut ? '#94a3b8' : (pendingPrint ? '#FF8A1E' : '#FF8A1E'),
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '12px',
                                        fontWeight: 900,
                                        cursor: isCheckingOut ? 'not-allowed' : 'pointer',
                                        boxShadow: isCheckingOut ? 'none' : '0 10px 15px -3px rgba(0,0,0,0.1)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '10px'
                                    }}
                                >
                                    {isCheckingOut ? (
                                        <>
                                            <RefreshCw size={20} className="animate-spin" />
                                            SAVING...
                                        </>
                                    ) : (
                                        'YES, PROCEED'
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* 3. MOBILE NAVIGATION FOOTER */}
                {isMobile && (
                    <div style={{
                        background: 'white',
                        borderTop: '2px solid #e2e8f0',
                        display: 'flex',
                        padding: '10px 15px',
                        gap: '15px',
                        zIndex: 1000,
                        boxShadow: '0 -4px 15px rgba(0,0,0,0.05)'
                    }}>
                        <button
                            onClick={() => setMobileTab('browse')}
                            style={{
                                flex: 1,
                                padding: '12px',
                                background: mobileTab === 'browse' ? 'var(--primary-light)' : 'transparent',
                                color: mobileTab === 'browse' ? 'var(--primary)' : '#64748b',
                                border: 'none',
                                borderRadius: '12px',
                                fontWeight: 950,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '8px',
                                fontSize: '0.8rem'
                            }}
                        >
                            <Search size={18} /> BROWSE
                        </button>
                        <button
                            onClick={() => setMobileTab('cart')}
                            style={{
                                flex: 1,
                                padding: '12px',
                                background: mobileTab === 'cart' ? 'var(--primary-light)' : 'transparent',
                                color: mobileTab === 'cart' ? 'var(--primary)' : '#64748b',
                                border: 'none',
                                borderRadius: '12px',
                                fontWeight: 950,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '8px',
                                position: 'relative',
                                fontSize: '0.8rem'
                            }}
                        >
                            <ShoppingCart size={18} /> CART
                            {cart.length > 0 && (
                                <span style={{
                                    position: 'absolute',
                                    top: '5px',
                                    right: '20%',
                                    background: '#ef4444',
                                    color: 'white',
                                    fontSize: '0.65rem',
                                    padding: '2px 6px',
                                    borderRadius: '10px',
                                    fontWeight: 900
                                }}>
                                    {cart.length}
                                </span>
                            )}
                        </button>
                    </div>
                )}
            </div>

            <ThermalReceipt
                lastSale={lastSale}
                activeShift={activeShift}
                logo={logo}
            />

            <style>
                {`
                .qty-input-no-spin::-webkit-inner-spin-button,
                .qty-input-no-spin::-webkit-outer-spin-button {
                    -webkit-appearance: none;
                    margin: 0;
                }
                /* FULLSCREEN FIX: keep the whole height chain at 100% so the POS
                   layout does not collapse when the app goes full screen. */
                :fullscreen {
                    width: 100% !important;
                    height: 100% !important;
                }
                :fullscreen, :-webkit-full-screen {
                    background: #e2e8f0;
                }
                html:fullscreen, body:fullscreen,
                :fullscreen #root,
                :fullscreen .app-container,
                :fullscreen .main-area,
                :fullscreen .view-container {
                    height: 100% !important;
                    max-height: 100% !important;
                    min-height: 100% !important;
                    overflow: hidden;
                }
                `}
            </style>
        </>
    );
};

export default POS;
