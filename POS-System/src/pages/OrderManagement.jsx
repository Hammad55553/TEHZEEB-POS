import React, { useState, useRef, useMemo } from 'react';
import logo from '../assets/tehzeeb_logo.png';
import { useSelector, useDispatch } from 'react-redux';
import Pagination from '../components/Pagination';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Truck,
    Calendar,
    Plus,
    Search,
    CheckCircle2,
    Clock,
    X,
    MoreHorizontal,
    ChevronRight,
    Package,
    ArrowRight,
    RefreshCw,
    Layers,
    Trash2,
    Edit3,
    ArrowUpCircle,
    ArrowDownCircle,
    Share2,
    FileText,
    Download,
    Eye,
    Printer,
    MessageCircle,
    Building2,
    Check,
    Phone
} from 'lucide-react';
import { db } from '../database';
import toast from 'react-hot-toast';
import { setInventory } from '../store/slices/inventorySlice';
import { setOrders, addOrder, updateOrderStatus, deleteOrder } from '../store/slices/ordersSlice';

const OrderManagement = () => {
    const dispatch = useDispatch();
    const orders = useSelector(state => state.orders.list);
    const inventory = useSelector(state => state.inventory.items);
    const suppliers = useSelector(state => state.suppliers.list);
    const { user } = useSelector(state => state.auth);
    const isAdmin = user?.role === 'admin';

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isPreviewOpen, setIsPreviewOpen] = useState(false);
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [activeTab, setActiveTab] = useState('All');
    const [page, setPage] = useState(1);
    const PAGE_SIZE = 100;
    const [confirmDelete, setConfirmDelete] = useState({ show: false, type: '', id: null, index: null, title: '', message: '' });
    const [processingOrderId, setProcessingOrderId] = useState(null);

    const [formData, setFormData] = useState({
        supplier: '',
        contact: '',
        type: 'Incoming',
        items: [{ name: '', qty: '', unit: 'PCS', price: '' }],
        booking_date: new Date().toISOString().split('T')[0],
        delivery_date: '',
        notes: ''
    });

    const [editingOrder, setEditingOrder] = useState(null);

    const handleAddItem = () => {
        setFormData({ ...formData, items: [...formData.items, { name: '', qty: '', unit: 'PCS', price: '' }] });
    };

    const handleRemoveItem = (index) => {
        if (formData.items.length === 1) {
            toast.error("At least one item is required");
            return;
        }
        setConfirmDelete({
            show: true,
            type: 'item',
            index: index,
            title: 'Remove Item?',
            message: 'Are you sure you want to remove this item from the list?'
        });
    };

    const handleItemChange = (index, field, value) => {
        const newItems = [...formData.items];
        newItems[index][field] = value;
        setFormData({ ...formData, items: newItems });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        const payload = {
            supplier: formData.supplier,
            contact: formData.contact,
            type: formData.type,
            items: formData.items.filter(item => item.name.trim() !== ''),
            booking_date: formData.booking_date,
            delivery_date: formData.delivery_date || null,
            notes: formData.notes,
            status: editingOrder ? editingOrder.status : 'Pending'
        };

        try {
            if (editingOrder) {
                const { data, error } = await db
                    .from('orders')
                    .update(payload)
                    .eq('id', editingOrder.id)
                    .select()
                    .single();

                if (error) throw error;
                // Reflect the edit in Redux immediately.
                dispatch(setOrders(orders.map(o => o.id === editingOrder.id ? (data || { ...o, ...payload }) : o)));
                toast.success('Order Booking Updated!');
            } else {
                const { data, error } = await db
                    .from('orders')
                    .insert([payload])
                    .select()
                    .single();

                if (error) throw error;
                dispatch(addOrder(data)); // show new order instantly
                toast.success('Order booked successfully!');
            }
            setIsModalOpen(false);
            setEditingOrder(null);
            setFormData({ supplier: '', contact: '', type: 'Incoming', items: [{ name: '', qty: '', unit: 'PCS', price: '' }], booking_date: new Date().toISOString().split('T')[0], delivery_date: '', notes: '' });
        } catch (err) {
            console.error("Database Error:", err);
            toast.error(err.message || 'Action failed');
        }
    };

    const handleDeleteOrder = async (id) => {
        setConfirmDelete({
            show: true,
            type: 'order',
            id,
            title: 'Move to Trash?',
            message: 'Are you sure you want to move this order record to the Trash? You can restore it within 30 days.'
        });
    };

    const confirmAction = async () => {
        const { type, id, index } = confirmDelete;
        
        if (type === 'order') {
            try {
                const { error } = await db
                    .from('orders')
                    .update({ deleted_at: new Date().toISOString() })
                    .eq('id', id);

                if (error) throw error;
                dispatch(deleteOrder(id)); // remove from list immediately
                toast.success("Order record moved to Trash");
            } catch (err) {
                console.error(err);
                toast.error('Action failed');
            }
        } else if (type === 'item') {
            const newItems = formData.items.filter((_, i) => i !== index);
            setFormData({ ...formData, items: newItems });
            toast.success("Item removed");
        }
        
        setConfirmDelete({ show: false, type: '', id: null, index: null, title: '', message: '' });
    };

    const openEditOrder = (order) => {
        setEditingOrder(order);
        setFormData({
            supplier: order.supplier,
            contact: order.contact || '',
            type: order.type || 'Incoming',
            items: order.items || [{ name: '', qty: '', unit: 'PCS', price: '' }],
            booking_date: order.booking_date || order.bookingDate || new Date().toISOString().split('T')[0],
            delivery_date: order.delivery_date || order.deliveryDate || '',
            notes: order.notes || ''
        });
        setIsModalOpen(true);
    };

    const handleMarkReceived = async (order, pushToStock = true) => {
        if (processingOrderId) return;

        // GUARD: never process an already-received order again. Without this a
        // double click (or two terminals) could add the stock twice, corrupting
        // inventory. We check the current DB status, not just the local copy.
        if (order.status === 'Received') {
            toast.error('This order is already received.');
            return;
        }

        if (!window.confirm(pushToStock ? 'Complete delivery and ADD items to stock?' : 'Mark as Delivered/Completed WITHOUT changing inventory?')) return;

        setProcessingOrderId(order.id);

        try {
            // Flip status Pending -> Received atomically; if another process
            // already flipped it, this returns 0 rows and we stop (no double add).
            const { data: flipped, error: orderError } = await db
                .from('orders')
                .update({ status: 'Received' })
                .eq('id', order.id)
                .neq('status', 'Received')
                .select();

            if (orderError) throw orderError;
            if (!flipped || flipped.length === 0) {
                toast.error('This order was already received.');
                return;
            }

            // Track inventory changes to also update Redux immediately.
            const invUpdates = [];

            if (pushToStock && order.items) {
                const missing = [];
                for (const item of order.items) {
                    const existing = inventory.find(i => i.name.toLowerCase() === item.name.toLowerCase());
                    if (!existing) { missing.push(item.name); continue; }

                    const currentStock = parseFloat(existing.stock || 0);
                    const incomingQty = parseFloat(item.qty || 0);

                    let updatedInv;
                    if (order.type === 'Outgoing') {
                        updatedInv = { stock: currentStock - incomingQty };
                    } else {
                        const currentBuyPrice = parseFloat(existing.buy_price || 0);
                        const incomingBuyPrice = parseFloat(item.price || existing.buy_price);
                        const totalStock = currentStock + incomingQty;
                        const averageBuyPrice = ((currentStock * currentBuyPrice) + (incomingQty * incomingBuyPrice)) / (totalStock || 1);
                        updatedInv = { stock: totalStock, buy_price: parseFloat(averageBuyPrice.toFixed(2)) };
                    }

                    const { error: invError } = await db
                        .from('inventory')
                        .update(updatedInv)
                        .eq('id', existing.id);
                    if (invError) throw invError;

                    invUpdates.push({ id: existing.id, ...updatedInv });
                }

                // Keep the local inventory (Redux) in sync so POS/Inventory show
                // the new stock immediately without waiting for a refetch.
                if (invUpdates.length > 0) {
                    const newInventory = inventory.map(inv => {
                        const u = invUpdates.find(x => x.id === inv.id);
                        return u ? { ...inv, ...u } : inv;
                    });
                    dispatch(setInventory(newInventory));
                }

                if (missing.length > 0) {
                    toast('Not in inventory (skipped): ' + missing.join(', '), { icon: '⚠️' });
                }
            }

            dispatch(updateOrderStatus({ id: order.id, status: 'Received' }));

            const msg = order.type === 'Outgoing' ? 'Supply Delivered & Stock Deducted!' : 'Order Received & Stock Merged!';
            toast.success(pushToStock ? msg : `Order Marked as Completed.`);
        } catch (err) {
            toast.error("Process failed.");
            console.error(err);
        } finally {
            setProcessingOrderId(null);
        }
    };

    // --- SHARING FUNCTIONS ---
    const shareWhatsApp = (order) => {
        if (!order) return;

        const rawId = order.id ? String(order.id) : '';
        const orderId = rawId ? rawId.slice(-6).toUpperCase() : 'NEW';

        const rawDate = order.booking_date || order.bookingDate;
        const date = rawDate ? new Date(rawDate).toLocaleDateString('en-GB') : new Date().toLocaleDateString('en-GB');

        let itemsText = '';
        const items = Array.isArray(order.items) ? order.items : [];

        items.forEach((item, index) => {
            const name = (item.name || 'Unknown Item').replace(/\*/g, '');
            const qty = item.qty || '0';
            const unit = item.unit || 'PCS';
            const priceText = item.price ? ` (@ Rs ${item.price})` : '';
            // Using dots to separate name and qty for a cleaner list look
            itemsText += `${index + 1}. ${name.padEnd(25, '.')} ${qty} ${unit}${priceText}\n`;
        });

        if (itemsText === '') itemsText = 'No items listed%0A';

        const supplier = order.supplier || 'N/A';
        const notes = order.notes || '';

        const text = `📦 *TEHZEEB SWEETS & SUPER STORE*\n*Official Supply Order*\n\n━━━━━━━━━━━━━━━━━━━━━━━━\n🆔 *Order ID:* #ORD-${orderId}\n📅 *Date:* ${date}\n🏢 *Supplier:* ${supplier}\n━━━━━━━━━━━━━━━━━━━━━━━━\n\n📋 *ITEMS LIST:*\n${itemsText.replace(/%0A/g, '\n')}\n━━━━━━━━━━━━━━━━━━━━━━━━\n${notes ? `📝 *Remarks:* ${notes}\n\n` : ''}*Generated by Tehzeeb Sweets & Super Store*`;

        const phoneNumber = order.contact ? String(order.contact).replace(/\D/g, '') : '';
        let finalPhone = phoneNumber;
        if (finalPhone.startsWith('0')) {
            finalPhone = '92' + finalPhone.slice(1);
        }

        window.open(`https://wa.me/${finalPhone}?text=${encodeURIComponent(text)}`);
    };

    const exportToCSV = (order) => {
        let csvContent = "data:text/csv;charset=utf-8,";
        csvContent += "Item Name,Quantity,Unit,Price\r\n";

        order.items.forEach(item => {
            csvContent += `${item.name},${item.qty},${item.unit || 'PCS'},${item.price || 0}\r\n`;
        });

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `Order_${order.supplier}_${order.booking_date || order.bookingDate}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success("Excel/CSV Exported!");
    };

    const printOrder = () => {
        window.print();
    };

    const filteredOrders = useMemo(() => {
        const q = searchTerm.toLowerCase();
        const qid = q.replace('#', '').replace('ord-', '');
        return orders.filter(o =>
            (o.supplier?.toLowerCase().includes(q) ||
                String(o.id ?? '').toLowerCase().includes(qid) ||
                o.items?.some(i => i.name?.toLowerCase().includes(q))) &&
            (activeTab === 'All' || o.status === activeTab)
        );
    }, [orders, searchTerm, activeTab]);

    const totalPages = Math.max(1, Math.ceil(filteredOrders.length / PAGE_SIZE));
    const safePage = Math.min(page, totalPages);
    const pagedOrders = useMemo(
        () => filteredOrders.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE),
        [filteredOrders, safePage]
    );
    React.useEffect(() => { setPage(1); }, [searchTerm, activeTab]);

    return (
        <div style={{
            height: '100%',
            overflowY: 'auto',
            padding: window.innerWidth <= 480 ? '15px' : '25px',
            backgroundColor: '#f8fafc',
            boxSizing: 'border-box'
        }}>

            {/* 1. PREMIUM HEADER */}
            <motion.header
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="no-print"
                style={{
                    display: 'flex',
                    flexDirection: window.innerWidth <= 768 ? 'column' : 'row',
                    justifyContent: 'space-between',
                    alignItems: window.innerWidth <= 768 ? 'stretch' : 'center',
                    marginBottom: '30px',
                    gap: '20px'
                }}
            >
                <div>
                    <h2 style={{
                        fontSize: window.innerWidth <= 480 ? '1.4rem' : '1.8rem',
                        fontWeight: 950,
                        color: '#0f172a',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px'
                    }}>
                        <div style={{ background: 'linear-gradient(135deg, #6366f1, #4f46e5)', padding: '10px', borderRadius: '12px', color: 'white', boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)' }}>
                            <Truck size={window.innerWidth <= 480 ? 20 : 24} />
                        </div>
                        Supply Order Hub
                    </h2>
                    <p style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600, marginTop: '8px' }}>Manage supplier bookings and inventory restocking.</p>
                </div>
                <div style={{
                    display: 'flex',
                    flexDirection: window.innerWidth <= 600 ? 'column' : 'row',
                    gap: '12px',
                    alignItems: 'stretch'
                }}>
                    <div style={{ position: 'relative', flex: 1 }}>
                        <Search style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} size={16} />
                        <input
                            placeholder="Find company or drug..."
                            style={{
                                padding: '12px 12px 12px 40px',
                                border: '1px solid #e2e8f0',
                                borderRadius: '12px',
                                width: '100%',
                                fontSize: '0.85rem',
                                fontWeight: 600,
                                boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
                                outline: 'none',
                                transition: 'all 0.2s'
                            }}
                            onFocus={(e) => e.target.style.borderColor = '#6366f1'}
                            onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <button
                        onClick={() => {
                            setEditingOrder(null);
                            setFormData({ supplier: '', contact: '', type: 'Incoming', items: [{ name: '', qty: '', unit: 'PCS', price: '' }], booking_date: new Date().toISOString().split('T')[0], delivery_date: '', notes: '' });
                            setIsModalOpen(true);
                        }}
                        style={{
                            background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
                            color: 'white',
                            border: 'none',
                            padding: '12px 20px',
                            borderRadius: '12px',
                            fontWeight: 800,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '8px',
                            cursor: 'pointer',
                            boxShadow: '0 4px 10px rgba(99, 102, 241, 0.3)',
                            fontSize: '0.85rem'
                        }}
                    >
                        <Plus size={18} /> NEW ORDER
                    </button>
                </div>
            </motion.header>

            {/* 2. TAB NAVIGATION */}
            <div className="no-print" style={{
                display: 'flex',
                gap: '8px',
                marginBottom: '25px',
                overflowX: 'auto',
                paddingBottom: '5px',
                msOverflowStyle: 'none',
                scrollbarWidth: 'none'
            }}>
                {['All', 'Pending', 'Received'].map(tab => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        style={{
                            padding: '8px 18px',
                            borderRadius: '12px',
                            fontWeight: 800,
                            fontSize: '0.75rem',
                            cursor: 'pointer',
                            backgroundColor: activeTab === tab ? '#1e293b' : 'white',
                            color: activeTab === tab ? 'white' : '#64748b',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
                            whiteSpace: 'nowrap',
                            transition: 'all 0.2s',
                            border: activeTab === tab ? '1px solid #1e293b' : '1px solid transparent'
                        }}
                    >
                        {tab} Orders
                    </button>
                ))}
            </div>

            {/* 3. ORDERS GRID */}
            <div className="no-print" style={{
                display: 'grid',
                gridTemplateColumns: window.innerWidth <= 640 ? '1fr' : 'repeat(auto-fill, minmax(380px, 1fr))',
                gap: '20px'
            }}>
                <>
                    {pagedOrders.map((order, idx) => (
                        <div
                            key={order.id}
                            style={{
                                background: 'white',
                                borderRadius: '24px',
                                padding: '25px',
                                border: '1px solid #e2e8f0',
                                boxShadow: '0 10px 15px -3px rgba(0,0,0,0.04)',
                                position: 'relative',
                                display: 'flex',
                                flexDirection: 'column'
                            }}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
                                <div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <span style={{ fontSize: '0.6rem', fontWeight: 900, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px' }}>#{String(order.id ?? '').slice(-6) || 'ORDER'}</span>
                                        {order.type === 'Outgoing' ? <ArrowUpCircle size={14} color="#6366f1" /> : <ArrowDownCircle size={14} color="#FF8A1E" />}
                                    </div>
                                    <h4 style={{ fontSize: '1.2rem', fontWeight: 950, color: '#0f172a', marginTop: '6px', lineHeight: 1.2 }}>{order.supplier}</h4>
                                    <p style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '5px', marginTop: '4px' }}>
                                        <Building2 size={12} /> {order.type === 'Incoming' ? 'Supplier' : 'Client/Party'}
                                    </p>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '10px' }}>
                                    <span style={{
                                        padding: '5px 12px',
                                        borderRadius: '12px',
                                        fontSize: '0.65rem',
                                        fontWeight: 900,
                                        backgroundColor: order.status === 'Received' ? '#FFF7E6' : '#fff7ed',
                                        color: order.status === 'Received' ? '#F7941D' : '#c2410c',
                                        border: `1px solid ${order.status === 'Received' ? '#bbf7d0' : '#ffedd5'}`,
                                        letterSpacing: '0.5px'
                                    }}>
                                        {order.status.toUpperCase()}
                                    </span>
                                    <div style={{ display: 'flex', gap: '6px' }}>
                                        <button
                                            onClick={() => { setSelectedOrder(order); setIsPreviewOpen(true); }}
                                            title="Preview Document"
                                            style={{ background: '#f8fafc', border: '1px solid #e2e8f0', color: '#64748b', padding: '8px', borderRadius: '10px', cursor: 'pointer' }}
                                        >
                                            <Eye size={16} />
                                        </button>
                                        <button
                                            onClick={() => openEditOrder(order)}
                                            style={{ background: '#f0f9ff', border: '1px solid #bae6fd', color: '#0284c7', padding: '8px', borderRadius: '10px', cursor: 'pointer' }}
                                        >
                                            <Edit3 size={16} />
                                        </button>
                                        <button
                                            onClick={() => handleDeleteOrder(order.id)}
                                            style={{ background: '#fff1f1', border: '1px solid #fee2e2', color: '#ef4444', padding: '8px', borderRadius: '10px', cursor: 'pointer' }}
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <div style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>
                                <div style={{ flex: 1, background: '#f8fafc', padding: '12px', borderRadius: '16px', border: '1px solid #f1f5f9' }}>
                                    <p style={{ fontSize: '0.6rem', color: '#94a3b8', fontWeight: 800, marginBottom: '4px' }}>BOOKING DATE</p>
                                    <p style={{ fontSize: '0.8rem', fontWeight: 900, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '6px' }}><Calendar size={12} /> {order.booking_date || order.bookingDate}</p>
                                </div>
                                <div style={{ flex: 1, background: '#f8fafc', padding: '12px', borderRadius: '16px', border: '1px solid #f1f5f9' }}>
                                    <p style={{ fontSize: '0.6rem', color: '#94a3b8', fontWeight: 800, marginBottom: '4px' }}>{order.type === 'Outgoing' ? 'DELIVERY BY' : 'EXPECTED'}</p>
                                    <p style={{ fontSize: '0.8rem', fontWeight: 900, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '6px' }}><Clock size={12} /> {order.delivery_date || order.deliveryDate || 'ASAP'}</p>
                                </div>
                            </div>

                            <div style={{ marginBottom: '20px', flex: 1 }}>
                                <p style={{ fontSize: '0.7rem', fontWeight: 900, color: '#94a3b8', marginBottom: '12px', letterSpacing: '0.5px' }}>{order.type === 'Outgoing' ? 'SUPPLY ITEMS:' : 'ORDERED ITEMS:'}</p>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    {order.items?.slice(0, 3).map((item, i) => (
                                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #f1f5f9' }}>
                                            <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#1e293b' }}>{item.name}</span>
                                            <span style={{ fontSize: '0.85rem', fontWeight: 950, color: '#6366f1' }}>{item.qty} <span style={{ fontSize: '0.65rem', fontWeight: 800 }}>{item.unit || 'PCS'}</span></span>
                                        </div>
                                    ))}
                                    {order.items?.length > 3 && (
                                        <p style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 800, textAlign: 'center', marginTop: '5px' }}>+ {order.items.length - 3} more items</p>
                                    )}
                                </div>
                            </div>

                            <div style={{ display: 'flex', gap: '8px', marginBottom: '15px' }}>
                                <button
                                    onClick={() => shareWhatsApp(order)}
                                    style={{ flex: 1, padding: '10px', background: '#25d366', color: 'white', border: 'none', borderRadius: '12px', fontWeight: 800, fontSize: '0.75rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                                >
                                    <MessageCircle size={16} /> WHATSAPP
                                </button>
                                <button
                                    onClick={() => exportToCSV(order)}
                                    style={{ flex: 1, padding: '10px', background: '#f8fafc', border: '1px solid #e2e8f0', color: '#475569', borderRadius: '12px', fontWeight: 800, fontSize: '0.75rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                                >
                                    <Download size={16} /> EXCEL
                                </button>
                            </div>

                            {order.status === 'Pending' && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                    <button
                                        disabled={processingOrderId === order.id}
                                        onClick={() => handleMarkReceived(order, true)}
                                        style={{
                                            width: '100%',
                                            padding: '14px',
                                            background: processingOrderId === order.id ? '#94a3b8' : 'linear-gradient(135deg, #FF8A1E, #F7941D)',
                                            color: 'white',
                                            border: 'none',
                                            borderRadius: '14px',
                                            fontWeight: 900,
                                            fontSize: '0.85rem',
                                            cursor: processingOrderId === order.id ? 'not-allowed' : 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: '10px',
                                            boxShadow: '0 4px 12px rgba(16, 185, 129, 0.2)'
                                        }}
                                    >
                                        {processingOrderId === order.id ? <RefreshCw size={18} className="animate-spin" /> : <CheckCircle2 size={18} />}
                                        {order.type === 'Outgoing' ? 'DELIVER & DEDUCT' : 'RECEIVE & MERGE'}
                                    </button>
                                </div>
                            )}
                        </div>
                    ))}
                </>

                <Pagination
                    page={safePage}
                    totalPages={totalPages}
                    totalItems={filteredOrders.length}
                    pageSize={PAGE_SIZE}
                    onChange={setPage}
                />
            </div>

            {/* 4. BOOKING MODAL */}
            <AnimatePresence>
                {isModalOpen && (
                    <div style={{
                        position: 'fixed',
                        inset: 0,
                        background: 'rgba(15, 23, 42, 0.7)',
                        backdropFilter: 'blur(8px)',
                        zIndex: 1000,
                        display: 'flex',
                        alignItems: window.innerWidth <= 600 ? 'flex-end' : 'center',
                        justifyContent: 'center',
                        padding: window.innerWidth <= 600 ? '0' : '20px'
                    }}>
                        <motion.div
                            initial={window.innerWidth <= 600 ? { y: '100%' } : { scale: 0.9, opacity: 0 }}
                            animate={{ y: 0, scale: 1, opacity: 1 }}
                            exit={window.innerWidth <= 600 ? { y: '100%' } : { scale: 0.9, opacity: 0 }}
                            style={{
                                background: 'white',
                                width: '100%',
                                maxWidth: '700px',
                                borderRadius: window.innerWidth <= 600 ? '30px 30px 0 0' : '24px',
                                overflow: 'hidden',
                                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
                                display: 'flex',
                                flexDirection: 'column'
                            }}
                        >
                            <div style={{ background: '#6366f1', padding: '20px 25px', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                    <h3 style={{ fontSize: '1.1rem', fontWeight: 950 }}>{editingOrder ? 'Update Booking' : 'New Supply Booking'}</h3>
                                    <p style={{ fontSize: '0.7rem', fontWeight: 700, opacity: 0.8 }}>Enter order details below</p>
                                </div>
                                <button 
                                    onClick={() => setIsModalOpen(false)} 
                                    style={{ 
                                        background: 'rgba(255,255,255,0.15)', 
                                        border: 'none', 
                                        color: 'white', 
                                        cursor: 'pointer', 
                                        padding: window.innerWidth <= 600 ? '6px' : '8px', 
                                        borderRadius: '10px' 
                                    }}
                                >
                                    <X size={window.innerWidth <= 600 ? 14 : 18} />
                                </button>
                            </div>

                            <form onSubmit={handleSubmit} style={{ padding: '25px', maxHeight: '80vh', overflowY: 'auto' }}>
                                <div style={{ display: 'grid', gridTemplateColumns: window.innerWidth <= 500 ? '1fr' : '1fr 1fr', gap: '15px', marginBottom: '20px' }}>
                                    <div>
                                        <label style={{ fontSize: '0.7rem', fontWeight: 900, color: '#64748b', display: 'block', marginBottom: '6px' }}>ORDER TYPE</label>
                                        <select
                                            style={{ width: '100%', padding: '12px', border: '1px solid #e2e8f0', borderRadius: '12px', fontWeight: 700, background: '#f8fafc', outline: 'none' }}
                                            value={formData.type}
                                            onChange={e => setFormData({ ...formData, type: e.target.value })}
                                        >
                                            <option value="Incoming">📥 Incoming (Restock/Purchase)</option>
                                            <option value="Outgoing">📤 Outgoing (Client Supply)</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label style={{ fontSize: '0.7rem', fontWeight: 900, color: '#64748b', display: 'block', marginBottom: '6px' }}>PARTY / COMPANY NAME</label>
                                        <input
                                            list="suppliers-list"
                                            required
                                            style={{ width: '100%', padding: '12px', border: '1px solid #e2e8f0', borderRadius: '12px', fontWeight: 700, outline: 'none' }}
                                            value={formData.supplier}
                                            onChange={e => {
                                                const val = e.target.value;
                                                // Find supplier by company or name
                                                const found = suppliers.find(s => s.company === val || s.name === val);
                                                setFormData(prev => ({
                                                    ...prev,
                                                    supplier: val,
                                                    contact: found ? found.contact : prev.contact
                                                }));
                                            }}
                                            placeholder="Search Supplier or Company..."
                                        />
                                        <datalist id="suppliers-list">
                                            {suppliers.map((s, i) => (
                                                <React.Fragment key={i}>
                                                    <option value={s.company} />
                                                    {s.name && s.name !== s.company && <option value={s.name} />}
                                                </React.Fragment>
                                            ))}
                                        </datalist>
                                    </div>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: window.innerWidth <= 500 ? '1fr' : '1fr 1fr', gap: '15px', marginBottom: '20px' }}>
                                    <div>
                                        <label style={{ fontSize: '0.7rem', fontWeight: 900, color: '#64748b', display: 'block', marginBottom: '6px' }}>WHATSAPP / CONTACT</label>
                                        <input style={{ width: '100%', padding: '12px', border: '1px solid #e2e8f0', borderRadius: '12px', fontWeight: 700, outline: 'none' }} value={formData.contact} onChange={e => setFormData({ ...formData, contact: e.target.value })} placeholder="Phone (e.g. 92300...)" />
                                    </div>
                                    <div>
                                        <label style={{ fontSize: '0.7rem', fontWeight: 900, color: '#64748b', display: 'block', marginBottom: '6px' }}>DELIVERY DEADLINE</label>
                                        <input type="date" style={{ width: '100%', padding: '12px', border: '1px solid #e2e8f0', borderRadius: '12px', fontWeight: 700, outline: 'none' }} value={formData.delivery_date} onChange={e => setFormData({ ...formData, delivery_date: e.target.value })} />
                                    </div>
                                </div>

                                <div style={{ marginBottom: '20px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                                        <label style={{ fontSize: '0.8rem', fontWeight: 950, color: '#1e293b' }}>ITEMIZED LIST</label>
                                        <button type="button" onClick={handleAddItem} style={{ fontSize: '0.7rem', fontWeight: 900, color: 'white', background: '#6366f1', padding: '6px 14px', borderRadius: '10px', border: 'none', cursor: 'pointer', boxShadow: '0 4px 6px rgba(99, 102, 241, 0.2)' }}>+ ADD PRODUCT</button>
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                        {formData.items.map((item, idx) => (
                                            <div key={idx} style={{
                                                position: 'relative',
                                                display: 'grid',
                                                gridTemplateColumns: window.innerWidth <= 600 ? '1fr' : '2fr 1.2fr 0.8fr',
                                                gap: '10px',
                                                padding: '35px 15px 15px',
                                                background: '#f8fafc',
                                                borderRadius: '16px',
                                                border: '1px solid #e2e8f0',
                                                marginBottom: '10px'
                                            }}>
                                                <button 
                                                    type="button" 
                                                    onClick={() => handleRemoveItem(idx)} 
                                                    style={{ 
                                                        position: 'absolute',
                                                        top: '8px',
                                                        right: '8px',
                                                        background: '#fff1f1', 
                                                        border: 'none', 
                                                        color: '#ef4444', 
                                                        padding: '4px', 
                                                        borderRadius: '8px', 
                                                        cursor: 'pointer', 
                                                        display: 'flex', 
                                                        alignItems: 'center', 
                                                        justifyContent: 'center',
                                                        zIndex: 2
                                                    }}
                                                >
                                                    <X size={14} />
                                                </button>
                                                <div style={{ position: 'relative' }}>
                                                    <input
                                                        list="drug-list"
                                                        placeholder="Drug Name"
                                                        required
                                                        style={{ width: '100%', padding: '10px', border: '1px solid #e2e8f0', borderRadius: '10px', fontWeight: 700, outline: 'none' }}
                                                        value={item.name}
                                                        onChange={e => handleItemChange(idx, 'name', e.target.value)}
                                                    />
                                                </div>
                                                <div style={{ display: 'flex', gap: '8px' }}>
                                                    <input placeholder="Qty" type="number" required style={{ flex: 1, padding: '10px', border: '1px solid #e2e8f0', borderRadius: '10px', fontWeight: 700, outline: 'none' }} value={item.qty} onChange={e => handleItemChange(idx, 'qty', e.target.value)} />
                                                    <select
                                                        style={{ width: '70px', padding: '10px', border: '1px solid #e2e8f0', borderRadius: '10px', fontWeight: 700, outline: 'none', background: 'white' }}
                                                        value={item.unit}
                                                        onChange={e => handleItemChange(idx, 'unit', e.target.value)}
                                                    >
                                                        <option value="PCS">PCS</option>
                                                        <option value="ML">ML</option>
                                                        <option value="LTR">LTR</option>
                                                        <option value="KG">KG</option>
                                                        <option value="PACK">PACK</option>
                                                        <option value="VIAL">VIAL</option>
                                                    </select>
                                                </div>
                                                <input placeholder="Price" type="number" style={{ width: '100%', padding: '10px', border: '1px solid #e2e8f0', borderRadius: '10px', fontWeight: 700, outline: 'none' }} value={item.price} onChange={e => handleItemChange(idx, 'price', e.target.value)} />
                                            </div>
                                        ))}
                                    </div>
                                    <datalist id="drug-list">
                                        {inventory.map((i, idx) => <option key={idx} value={i.name} />)}
                                    </datalist>
                                </div>

                                <div style={{ marginBottom: '20px' }}>
                                    <label style={{ fontSize: '0.7rem', fontWeight: 900, color: '#64748b', display: 'block', marginBottom: '6px' }}>REMARKS / SPECIAL INSTRUCTIONS</label>
                                    <textarea
                                        rows={3}
                                        style={{ width: '100%', padding: '12px', border: '1px solid #e2e8f0', borderRadius: '12px', fontWeight: 600, outline: 'none', resize: 'none' }}
                                        value={formData.notes}
                                        onChange={e => setFormData({ ...formData, notes: e.target.value })}
                                        placeholder="Any additional notes..."
                                    />
                                </div>

                                <button type="submit" style={{ width: '100%', padding: '18px', background: 'linear-gradient(135deg, #6366f1, #4f46e5)', color: 'white', border: 'none', borderRadius: '16px', fontWeight: 950, fontSize: '1rem', cursor: 'pointer', marginTop: '10px', boxShadow: '0 10px 15px -3px rgba(99, 102, 241, 0.3)', letterSpacing: '0.5px' }}>
                                    {editingOrder ? 'UPDATE BOOKING' : 'CONFIRM & SAVE BOOKING'}
                                </button>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* 5. PROFESSIONAL DOCUMENT PREVIEW MODAL */}
            <AnimatePresence>
                {isPreviewOpen && selectedOrder && (
                    <div style={{
                        position: 'fixed',
                        inset: 0,
                        background: 'rgba(0, 0, 0, 0.8)',
                        backdropFilter: 'blur(10px)',
                        zIndex: 2000,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '20px'
                    }}>
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            style={{
                                background: 'white',
                                width: '100%',
                                maxWidth: '800px',
                                borderRadius: '24px',
                                overflow: 'hidden',
                                display: 'flex',
                                flexDirection: 'column',
                                height: '90vh'
                            }}
                        >
                            <div className="no-print" style={{ background: '#1e293b', padding: '15px 25px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'white' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                                    <FileText size={20} />
                                    <h3 style={{ fontSize: '1rem', fontWeight: 900 }}>Order Document Preview</h3>
                                </div>
                                <div style={{ display: 'flex', gap: '10px' }}>
                                    <button onClick={printOrder} style={{ background: '#6366f1', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '10px', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <Printer size={16} /> Print / Save PDF
                                    </button>
                                    <button 
                                        onClick={() => setIsPreviewOpen(false)} 
                                        style={{ 
                                            background: 'rgba(255,255,255,0.15)', 
                                            color: 'white', 
                                            border: 'none', 
                                            padding: window.innerWidth <= 600 ? '6px' : '8px', 
                                            borderRadius: '10px', 
                                            cursor: 'pointer' 
                                        }}
                                    >
                                        <X size={window.innerWidth <= 600 ? 14 : 18} />
                                    </button>
                                </div>
                            </div>

                            <div id="printable-order" style={{ flex: 1, overflowY: 'auto', padding: '50px', background: 'white', color: '#1e293b' }}>
                                {/* DOCUMENT HEADER */}
                                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '3px solid #1e293b', paddingBottom: '20px', marginBottom: '30px', alignItems: 'center' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                                        <img src={logo} alt="Tehzeeb Sweets & Super Store" style={{ height: '70px', objectFit: 'contain' }} />
                                        <div>
                                            <h1 style={{ fontSize: '1.8rem', fontWeight: 950, letterSpacing: '-1px', color: '#1e293b', margin: 0 }}>TEHZEEB SWEETS & SUPER STORE</h1>
                                            <p style={{ fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8', margin: '4px 0 0 0' }}>Main Bazaar, Hasilpur | 0305-6699899</p>
                                        </div>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <div style={{ padding: '10px 20px', background: '#1e293b', color: 'white', borderRadius: '12px', display: 'inline-block' }}>
                                            <h2 style={{ fontSize: '1.2rem', fontWeight: 900 }}>SUPPLY ORDER</h2>
                                        </div>
                                        <p style={{ fontSize: '0.85rem', fontWeight: 800, marginTop: '10px' }}>No: #ORD-{String(selectedOrder.id ?? '').slice(-6).toUpperCase() || 'NEW'}</p>
                                        <p style={{ fontSize: '0.85rem', fontWeight: 800 }}>Date: {new Date(selectedOrder.booking_date || selectedOrder.bookingDate).toLocaleDateString('en-GB')}</p>
                                    </div>
                                </div>

                                {/* PARTY DETAILS */}
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px', marginBottom: '40px' }}>
                                    <div style={{ background: '#f8fafc', padding: '20px', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
                                        <p style={{ fontSize: '0.7rem', fontWeight: 900, color: '#94a3b8', marginBottom: '8px' }}>BILLING TO / FROM</p>
                                        <h4 style={{ fontSize: '1.1rem', fontWeight: 950, color: '#1e293b' }}>{selectedOrder.supplier}</h4>
                                        <p style={{ fontSize: '0.85rem', fontWeight: 700, color: '#475569', marginTop: '4px' }}>Contact: {selectedOrder.contact || 'N/A'}</p>
                                    </div>
                                    <div style={{ background: '#f8fafc', padding: '20px', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
                                        <p style={{ fontSize: '0.7rem', fontWeight: 900, color: '#94a3b8', marginBottom: '8px' }}>ORDER DETAILS</p>
                                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                            <span style={{ fontSize: '0.85rem', fontWeight: 800 }}>Type:</span>
                                            <span style={{ fontSize: '0.85rem', fontWeight: 950 }}>{selectedOrder.type === 'Incoming' ? 'Incoming Restock' : 'Outgoing Supply'}</span>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '5px' }}>
                                            <span style={{ fontSize: '0.85rem', fontWeight: 800 }}>Expected:</span>
                                            <span style={{ fontSize: '0.85rem', fontWeight: 950 }}>{selectedOrder.delivery_date || selectedOrder.deliveryDate || 'ASAP'}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* ITEMS TABLE */}
                                <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '30px' }}>
                                    <thead>
                                        <tr style={{ background: '#1e293b', color: 'white' }}>
                                            <th style={{ padding: '15px', textAlign: 'left', borderRadius: '12px 0 0 12px' }}>#</th>
                                            <th style={{ padding: '15px', textAlign: 'left' }}>Product Description</th>
                                            <th style={{ padding: '15px', textAlign: 'center' }}>Quantity</th>
                                            <th style={{ padding: '15px', textAlign: 'right', borderRadius: '0 12px 12px 0' }}>Est. Price</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {selectedOrder.items?.map((item, i) => (
                                            <tr key={i} style={{ borderBottom: '1px solid #e2e8f0' }}>
                                                <td style={{ padding: '15px', fontSize: '0.9rem', fontWeight: 800 }}>{i + 1}</td>
                                                <td style={{ padding: '15px', fontSize: '1rem', fontWeight: 900 }}>{item.name}</td>
                                                <td style={{ padding: '15px', textAlign: 'center', fontSize: '1rem', fontWeight: 950, color: '#6366f1' }}>{item.qty} {item.unit || 'PCS'}</td>
                                                <td style={{ padding: '15px', textAlign: 'right', fontSize: '0.9rem', fontWeight: 800 }}>{item.price ? `Rs ${item.price}` : ''}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>

                                {/* NOTES & FOOTER */}
                                {selectedOrder.notes && (
                                    <div style={{ marginTop: '20px', padding: '15px', borderLeft: '4px solid #6366f1', background: '#f5f7ff', borderRadius: '0 12px 12px 0' }}>
                                        <p style={{ fontSize: '0.75rem', fontWeight: 900, color: '#6366f1' }}>REMARKS:</p>
                                        <p style={{ fontSize: '0.9rem', fontWeight: 700, color: '#475569' }}>{selectedOrder.notes}</p>
                                    </div>
                                )}

                                <div style={{ marginTop: '80px', display: 'flex', justifyContent: 'space-between' }}>
                                    <div style={{ textAlign: 'center' }}>
                                        <div style={{ width: '150px', borderBottom: '1px solid #cbd5e1', marginBottom: '8px' }}></div>
                                        <p style={{ fontSize: '0.75rem', fontWeight: 800 }}>Supplier Signature</p>
                                    </div>
                                    <div style={{ textAlign: 'center' }}>
                                        <div style={{ width: '150px', borderBottom: '1px solid #1e293b', marginBottom: '8px' }}></div>
                                        <p style={{ fontSize: '0.75rem', fontWeight: 950 }}>Authorized Signature</p>
                                        <p style={{ fontSize: '0.65rem', fontWeight: 700, color: '#94a3b8' }}>Tehzeeb Sweets & Super Store</p>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            <style>{`
                @media print {
                    /* 1. Hide everything by default */
                    body * {
                        visibility: hidden !important;
                    }
                    
                    /* 2. ONLY show the printable area and its content */
                    #printable-order, #printable-order * {
                        visibility: visible !important;
                    }
                    
                    /* 3. Position the printable area at the very top of the page */
                    #printable-order {
                        position: absolute !important;
                        left: 0 !important;
                        top: 0 !important;
                        width: 100% !important;
                        margin: 0 !important;
                        padding: 20px !important;
                        background: white !important;
                    }

                    /* 4. Hide unnecessary structural elements that might interfere */
                    .no-print, header, nav, .sidebar, .app-header {
                        display: none !important;
                    }

                    /* 5. Ensure the body doesn't have height/overflow restrictions */
                    body, html {
                        height: auto !important;
                        overflow: visible !important;
                        background: white !important;
                    }
                }
            `}</style>

            {/* 6. BEAUTIFUL CONFIRMATION MODAL */}
            <AnimatePresence>
                {confirmDelete.show && (
                    <div style={{
                        position: 'fixed',
                        inset: 0,
                        background: 'rgba(15, 23, 42, 0.7)',
                        backdropFilter: 'blur(10px)',
                        zIndex: 3000,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '20px'
                    }}>
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.9, opacity: 0, y: 20 }}
                            style={{
                                background: 'white',
                                width: '100%',
                                maxWidth: '400px',
                                borderRadius: '24px',
                                padding: '30px',
                                textAlign: 'center',
                                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
                            }}
                        >
                            <div style={{
                                width: '60px',
                                height: '60px',
                                background: '#fee2e2',
                                borderRadius: '20px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                margin: '0 auto 20px',
                                color: '#ef4444'
                            }}>
                                <Trash2 size={30} />
                            </div>
                            <h3 style={{ fontSize: '1.4rem', fontWeight: 950, color: '#1e293b', marginBottom: '10px' }}>{confirmDelete.title}</h3>
                            <p style={{ fontSize: '0.9rem', color: '#64748b', fontWeight: 600, lineHeight: '1.5', marginBottom: '30px' }}>{confirmDelete.message}</p>
                            
                            <div style={{ display: 'flex', gap: '12px' }}>
                                <button
                                    onClick={() => setConfirmDelete({ show: false, type: '', id: null, index: null, title: '', message: '' })}
                                    style={{
                                        flex: 1,
                                        padding: '12px',
                                        background: '#f1f5f9',
                                        border: 'none',
                                        borderRadius: '12px',
                                        fontWeight: 800,
                                        color: '#475569',
                                        cursor: 'pointer'
                                    }}
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={confirmAction}
                                    style={{
                                        flex: 1,
                                        padding: '12px',
                                        background: '#ef4444',
                                        border: 'none',
                                        borderRadius: '12px',
                                        fontWeight: 800,
                                        color: 'white',
                                        cursor: 'pointer',
                                        boxShadow: '0 4px 12px rgba(239, 68, 68, 0.2)'
                                    }}
                                >
                                    Yes, Remove
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

        </div>
    );
};

export default OrderManagement;
