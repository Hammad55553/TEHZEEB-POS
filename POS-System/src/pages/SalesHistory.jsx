import React, { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import {
    History,
    Printer,
    RotateCcw,
    Search,
    Filter,
    FileText,
    Download,
    Calendar,
    User,
    MoreVertical,
    ChevronRight,
    ChevronLeft,
    XCircle,
    CheckCircle2,
    Trash2
} from 'lucide-react';
import { db } from '../database';
import { returnSale, deleteSale } from '../store/slices/salesSlice';
import { updateStock } from '../store/slices/inventorySlice';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import logo from '../assets/tehzeeb_logo.png';

const SalesHistory = ({ isReturnsPage = false }) => {
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const { user } = useSelector(state => state.auth);
    const sales = useSelector(state => state.sales.history);
    const isAdmin = user?.role === 'admin';
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedSale, setSelectedSale] = useState(null);
    const [period, setPeriod] = useState('all');
    const [isPeriodOpen, setIsPeriodOpen] = useState(false);

    const filteredSales = sales.filter(s => {
        const formattedInvoiceNo = s.invoice_no ? (100000 + parseInt(s.invoice_no)).toString() : s.id?.toString().slice(-6).toUpperCase();
        
        const matchesSearch = s.id.toString().toLowerCase().includes(searchTerm.toLowerCase()) ||
                             s.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                             formattedInvoiceNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
                             (s.invoice_no && s.invoice_no.toString().includes(searchTerm));
        
        if (!matchesSearch) return false;
        if (period === 'all') return true;

        const saleDate = new Date(s.created_at);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (period === 'today') return saleDate >= today;
        if (period === 'yesterday') {
            const yesterday = new Date(today);
            yesterday.setDate(yesterday.getDate() - 1);
            return saleDate >= yesterday && saleDate < today;
        }
        if (period === 'week') {
            const weekAgo = new Date(today);
            weekAgo.setDate(weekAgo.getDate() - 7);
            return saleDate >= weekAgo;
        }
        if (period === 'month') {
            const monthAgo = new Date(today);
            monthAgo.setMonth(monthAgo.getMonth() - 1);
            return saleDate >= monthAgo;
        }
        return true;
    });

    const handleDelete = async (saleId) => {
        if (!isAdmin) {
            toast.error("Only Admins can move transactions to trash.");
            return;
        }
        if (window.confirm('Move this invoice to Trash? It will be permanently deleted after 30 days.')) {
            try {
                const { error } = await db
                    .from('sales')
                    .update({ deleted_at: new Date().toISOString() })
                    .eq('id', saleId);
                
                if (error) throw error;
                toast.success('Invoice moved to Trash');
                
                // Redux se bhi hata dein (Optimistic UI)
                dispatch(deleteSale(saleId));
                setSelectedSale(null);
            } catch (err) {
                console.error("Delete Failed:", err);
                toast.error("Action Failed: " + err.message);
            }
        }
    };

    const handleExportCSV = () => {
        if (!filteredSales || filteredSales.length === 0) {
            toast.error('No records to export');
            return;
        }
        const headers = ['Invoice', 'Customer', 'Date', 'Operator', 'Payment', 'Status', 'Total'];
        const rows = filteredSales.map(s => {
            const invoiceNo = s.invoice_no ? (100000 + parseInt(s.invoice_no)) : (s.id?.toString().slice(-6).toUpperCase());
            // Wrap each field in quotes and escape internal quotes for safe CSV.
            return [
                invoiceNo,
                s.customer_name || 'Walk-in',
                new Date(s.created_at).toLocaleString(),
                s.seller_name || 'N/A',
                s.payment_method || 'Cash',
                s.status || 'Paid',
                s.total || 0
            ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(',');
        });

        const csv = [headers.join(','), ...rows].join('\n');
        const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${isReturnsPage ? 'returns' : 'sales'}_${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
        URL.revokeObjectURL(url);
        toast.success(`Exported ${filteredSales.length} records`);
    };

    const handleReturn = async (sale) => {
        if (sale.status === 'Returned') return;
        if (window.confirm('Authorize Full Return? Stock, shift totals and customer credit will all be reversed.')) {
            try {
                // Everything (double-return guard, stock + total_sold revert,
                // shift sales adjustment, credit balance reversal, status update)
                // now happens ATOMICALLY inside the Postgres function
                // process_sale_return — so a double click or two terminals can
                // never revert the same sale twice or leave data half-updated.
                const { data, error } = await db
                    .rpc('process_sale_return', { p_sale_id: sale.id });

                if (error) throw error;

                if (data === 'ALREADY_RETURNED') {
                    toast.error('This invoice has already been returned.');
                    setSelectedSale(null);
                    return;
                }

                // Update local state immediately so the row shows "Returned"
                // right away (the realtime refetch will confirm shortly after).
                dispatch(returnSale(sale.id));
                toast.success(`INV #${sale.id} Successfully Reversed`);
                setSelectedSale(null);
            } catch (err) {
                console.error("Return Failed:", err);
                toast.error("Return Failed: " + err.message);
            }
        }
    };

    return (
        <div style={{ 
            display: 'flex',
            flexDirection: window.innerWidth <= 1024 ? 'column' : 'row',
            height: '100%', 
            gap: '0', 
            background: '#f1f5f9', 
            overflow: 'hidden' 
        }}>

            {/* LEFT: MASTER LIST */}
            <div style={{ 
                display: 'flex', 
                flexDirection: 'column', 
                background: 'white', 
                overflow: 'hidden',
                flex: 1,
                width: '100%'
            }}>

                {/* TOOLBAR */}
                <div style={{ 
                    padding: window.innerWidth <= 480 ? '15px' : '20px', 
                    borderBottom: '1px solid #e2e8f0', 
                    display: 'flex', 
                    flexDirection: window.innerWidth <= 768 ? 'column' : 'row',
                    gap: '15px', 
                    alignItems: window.innerWidth <= 768 ? 'stretch' : 'center',
                    background: '#ffffff'
                }}>
                    <button onClick={() => navigate('/')} title="Back to Dashboard" style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#FFF7E6', border: '1.5px solid #F7941D', color: '#D2691E', borderRadius: '9px', padding: '9px 14px', fontWeight: 900, fontSize: '0.75rem', cursor: 'pointer', flexShrink: 0 }}>
                        <ArrowLeft size={16} /> BACK
                    </button>
                    <div style={{ flex: 1 }}>
                        <h2 style={{ fontSize: window.innerWidth <= 480 ? '1.1rem' : '1.4rem', fontWeight: 950, color: '#0f172a', letterSpacing: '-0.5px' }}>
                            {isReturnsPage ? 'SALES RETURN (RMA)' : 'TRANSACTION REGISTRY'}
                        </h2>
                        <p style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>Audit trail & document console.</p>
                    </div>

                    <div style={{ 
                        display: 'flex', 
                        flexDirection: window.innerWidth <= 480 ? 'column' : 'row',
                        gap: '10px',
                        flex: window.innerWidth <= 768 ? 'none' : '2'
                    }}>
                        <div style={{ position: 'relative', flex: 2 }}>
                            <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                            <input
                                type="text"
                                placeholder="Invoice or Client..."
                                style={{ width: '100%', padding: '10px 15px 10px 40px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 600, outline: 'none' }}
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>

                        <div style={{ display: 'flex', gap: '8px', flex: 1 }}>
                            <div style={{ position: 'relative', flex: 1 }}>
                                <button 
                                    onClick={() => setIsPeriodOpen(!isPeriodOpen)}
                                    style={{ width: '100%', padding: '10px', background: 'white', border: '1px solid #cbd5e1', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', cursor: 'pointer' }}
                                >
                                    <Calendar size={14} />
                                    <span style={{ fontSize: '0.75rem', fontWeight: 800 }}>
                                        {period === 'all' ? 'ALL' : period.toUpperCase()}
                                    </span>
                                </button>

                                {isPeriodOpen && (
                                    <div style={{ position: 'absolute', top: '110%', right: 0, background: 'white', border: '1px solid #e2e8f0', borderRadius: '12px', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)', zIndex: 100, width: '180px', overflow: 'hidden' }}>
                                        {[
                                            { id: 'all', label: 'All Time' },
                                            { id: 'today', label: 'Today' },
                                            { id: 'yesterday', label: 'Yesterday' },
                                            { id: 'week', label: 'Last 7 Days' },
                                            { id: 'month', label: 'This Month' }
                                        ].map(p => (
                                            <div 
                                                key={p.id}
                                                onClick={() => { setPeriod(p.id); setIsPeriodOpen(false); }}
                                                style={{ padding: '12px 15px', fontSize: '0.8rem', fontWeight: period === p.id ? 800 : 600, color: period === p.id ? '#F7941D' : '#64748b', background: period === p.id ? '#FFF7E6' : 'white', cursor: 'pointer' }}
                                            >
                                                {p.label}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <button onClick={handleExportCSV} style={{ padding: '10px', background: '#0f172a', color: 'white', border: 'none', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', cursor: 'pointer', flex: 1 }}>
                                <Download size={14} />
                                <span style={{ fontSize: '0.75rem', fontWeight: 800 }}>CSV</span>
                            </button>
                        </div>
                    </div>
                </div>

                {/* DATA GRID */}
                <div style={{ flex: 1, overflowY: 'auto', background: '#f8fafc' }}>
                    {window.innerWidth > 768 ? (
                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                            <thead style={{ position: 'sticky', top: 0, background: '#ffffff', borderBottom: '2px solid #f1f5f9', fontSize: '0.7rem', color: '#64748b', zIndex: 10 }}>
                                <tr>
                                    <th style={{ padding: '15px 20px' }}>ID</th>
                                    <th style={{ padding: '15px 20px' }}>CLIENT / ACCOUNT</th>
                                    <th style={{ padding: '15px 20px' }}>TIMESTAMP</th>
                                    <th style={{ padding: '15px 20px' }}>OPERATOR</th>
                                    <th style={{ padding: '15px 20px', textAlign: 'right' }}>REVENUE</th>
                                    <th style={{ padding: '15px 20px', textAlign: 'center' }}>STATUS</th>
                                    <th style={{ padding: '15px 20px' }}></th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredSales.map(sale => (
                                    <tr
                                        key={sale.id}
                                        onClick={() => setSelectedSale(sale)}
                                        style={{ borderBottom: '1px solid #f1f5f9', cursor: 'pointer', background: selectedSale?.id === sale.id ? '#f1f5f9' : 'white' }}
                                    >
                                        <td style={{ padding: '15px 20px', fontWeight: 900, color: '#FF8A1E', fontSize: '0.75rem' }}>
                                            #{sale.invoice_no ? (100000 + parseInt(sale.invoice_no)).toString() : sale.id?.toString().slice(-6).toUpperCase()}
                                        </td>
                                        <td style={{ padding: '15px 20px', fontWeight: 800, color: '#1e293b' }}>
                                            <div>{sale.customer_name || 'WALK-IN'}</div>
                                            <div style={{ fontSize: '0.65rem', color: '#94a3b8', fontWeight: 600, marginTop: '2px', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                {sale.product_name || 'No items info'}
                                            </div>
                                        </td>
                                        <td style={{ padding: '15px 20px', fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>
                                            {new Date(sale.created_at).toLocaleDateString()}
                                        </td>
                                        <td style={{ padding: '15px 20px' }}>
                                            <span style={{ fontSize: '0.65rem', fontWeight: 900, padding: '4px 8px', background: '#f1f5f9', borderRadius: '4px', color: '#475569' }}>{sale.payment_method?.toUpperCase()}</span>
                                        </td>
                                        <td style={{ padding: '15px 20px', fontWeight: 950, color: '#0f172a', textAlign: 'right' }}>Rs {sale.total.toLocaleString()}</td>
                                        <td style={{ padding: '15px 20px', textAlign: 'center' }}>
                                            <span style={{ 
                                                fontSize: '0.65rem', 
                                                fontWeight: 900, 
                                                padding: '4px 10px', 
                                                borderRadius: '20px',
                                                background: sale.status === 'Returned' ? '#fff1f1' : '#FFF7E6',
                                                color: sale.status === 'Returned' ? '#ef4444' : '#F7941D',
                                                border: `1px solid ${sale.status === 'Returned' ? '#fecaca' : '#FFEFD0'}`
                                            }}>
                                                {sale.status.toUpperCase()}
                                            </span>
                                        </td>
                                        <td style={{ padding: '15px 20px', textAlign: 'right' }}>
                                            <ChevronRight size={18} color="#cbd5e1" />
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    ) : (
                        <div style={{ padding: '15px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {filteredSales.map(sale => (
                                <motion.div
                                    key={sale.id}
                                    onClick={() => setSelectedSale(sale)}
                                    initial={{ opacity: 0, y: 5 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    style={{ 
                                        background: 'white', 
                                        borderRadius: '16px', 
                                        padding: '15px', 
                                        border: '1px solid #e2e8f0',
                                        boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
                                    }}
                                >
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                                        <span style={{ fontWeight: 900, color: '#FF8A1E', fontSize: '0.8rem' }}>
                                            #{sale.invoice_no ? (100000 + parseInt(sale.invoice_no)).toString() : sale.id?.toString().slice(-6).toUpperCase()}
                                        </span>
                                        <span style={{ 
                                            fontSize: '0.6rem', 
                                            fontWeight: 900, 
                                            padding: '3px 10px', 
                                            borderRadius: '20px',
                                            background: sale.status === 'Returned' ? '#fff1f1' : '#FFF7E6',
                                            color: sale.status === 'Returned' ? '#ef4444' : '#F7941D'
                                        }}>
                                            {sale.status.toUpperCase()}
                                        </span>
                                    </div>
                                    <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#1e293b', marginBottom: '2px' }}>{sale.customer_name || 'WALK-IN'}</div>
                                    <div style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 600, marginBottom: '10px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        {sale.product_name || 'No items info'}
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 600 }}>{new Date(sale.created_at).toLocaleDateString()} • {sale.payment_method?.toUpperCase()}</div>
                                        <div style={{ fontSize: '1rem', fontWeight: 950, color: '#0f172a' }}>Rs {sale.total.toLocaleString()}</div>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    )}
                </div>

                {/* FOOTER STATS */}
                <div style={{ 
                    padding: '15px 20px', 
                    background: '#ffffff', 
                    borderTop: '1px solid #e2e8f0', 
                    display: 'flex', 
                    flexDirection: window.innerWidth <= 480 ? 'column' : 'row', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                    fontSize: '0.75rem', 
                    fontWeight: 800, 
                    color: '#64748b', 
                    gap: '10px' 
                }}>
                    <span>DOCUMENTS: {filteredSales.length}</span>
                    <span>AUDITED TOTAL: <span style={{ color: '#0f172a', fontSize: '1.1rem', fontWeight: 950 }}>Rs {filteredSales.reduce((acc, s) => acc + s.total, 0).toLocaleString()}</span></span>
                </div>
            </div>

            {/* RIGHT SIDEBAR: DOCUMENT VIEWER */}
            <AnimatePresence>
                {selectedSale && (
                    <motion.div 
                        initial={{ x: window.innerWidth <= 1024 ? 0 : 400, opacity: window.innerWidth <= 1024 ? 0 : 1 }}
                        animate={{ x: 0, opacity: 1 }}
                        exit={{ x: window.innerWidth <= 1024 ? 0 : 400, opacity: 0 }}
                        style={{ 
                            position: window.innerWidth <= 1024 ? 'fixed' : 'relative',
                            inset: window.innerWidth <= 1024 ? 0 : 'auto',
                            zIndex: window.innerWidth <= 1024 ? 2000 : 1,
                            width: window.innerWidth <= 1024 ? '100%' : '420px',
                            background: 'white', 
                            borderLeft: '1px solid #e2e8f0', 
                            display: 'flex', 
                            flexDirection: 'column',
                            boxShadow: window.innerWidth <= 1024 ? 'none' : '-10px 0 30px rgba(0,0,0,0.05)'
                        }}
                    >
                        <div style={{ padding: '20px', background: '#ffffff', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <h3 style={{ fontSize: '0.9rem', fontWeight: 950, color: '#0f172a' }}>DOCUMENT VIEWER</h3>
                                <p style={{ fontSize: '0.65rem', color: '#64748b', fontWeight: 700 }}>Inbound/Outbound Audit</p>
                            </div>
                            <button onClick={() => setSelectedSale(null)} style={{ background: '#f1f5f9', border: 'none', cursor: 'pointer', padding: '8px', borderRadius: '50%', color: '#64748b' }}><XCircle size={20} /></button>
                        </div>

                        <div style={{ padding: window.innerWidth <= 480 ? '20px' : '30px', flex: 1, overflowY: 'auto' }}>
                            <div style={{ textAlign: 'center', marginBottom: '30px', paddingBottom: '25px', borderBottom: '1px solid #f1f5f9' }}>
                                 <img src={logo} alt="Tehzeeb Sweets & Super Store" style={{ height: '60px', marginBottom: '12px', objectFit: 'contain' }} />
                                 <h2 style={{ fontSize: '1.2rem', fontWeight: 950, color: '#0f172a' }}>TEHZEEB SWEETS & SUPER STORE</h2>
                                 <div style={{ marginTop: '10px' }}>
                                    <p style={{ fontSize: '0.85rem', color: '#FF8A1E', fontWeight: 950 }}>INVOICE #{selectedSale.invoice_no ? (100000 + parseInt(selectedSale.invoice_no)).toString() : selectedSale.id.toString().slice(-6).toUpperCase()}</p>
                                    <p style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 700, marginTop: '4px' }}>
                                        {new Date(selectedSale.created_at).toLocaleString()}
                                    </p>
                                 </div>
                             </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '30px' }}>
                                <div>
                                    <p style={{ fontSize: '0.6rem', color: '#94a3b8', fontWeight: 900, marginBottom: '4px' }}>CLIENT ACCOUNT</p>
                                    <p style={{ fontSize: '0.85rem', fontWeight: 800, color: '#1e293b' }}>{selectedSale.customer_name || 'WALK-IN'}</p>
                                </div>
                                <div>
                                    <p style={{ fontSize: '0.6rem', color: '#94a3b8', fontWeight: 900, marginBottom: '4px' }}>PAYMENT MODE</p>
                                    <p style={{ fontSize: '0.85rem', fontWeight: 800, color: '#1e293b' }}>{selectedSale.payment_method?.toUpperCase()}</p>
                                </div>
                            </div>

                            {selectedSale.payment_details && (
                                <div style={{ background: '#f8fafc', padding: '15px', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '30px' }}>
                                    <p style={{ fontSize: '0.6rem', fontWeight: 900, color: '#64748b', marginBottom: '10px' }}>PAYMENT AUDIT INFO</p>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        {selectedSale.payment_details.provider && (
                                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                <span style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 700 }}>PROVIDER:</span>
                                                <span style={{ fontSize: '0.7rem', fontWeight: 900, color: '#0369a1' }}>{selectedSale.payment_details.provider.toUpperCase()}</span>
                                            </div>
                                        )}
                                        {selectedSale.payment_details.account && (
                                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                <span style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 700 }}>ACCOUNT:</span>
                                                <span style={{ fontSize: '0.7rem', fontWeight: 900, color: '#1e293b' }}>{selectedSale.payment_details.account}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            <div style={{ marginBottom: '30px' }}>
                                <p style={{ fontSize: '0.7rem', fontWeight: 900, color: '#64748b', marginBottom: '12px', letterSpacing: '0.5px' }}>ITEMIZED BREAKDOWN</p>
                                 <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                    {selectedSale.sale_items && selectedSale.sale_items.length > 0 ? (
                                        selectedSale.sale_items.map(item => (
                                            <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '10px', borderBottom: '1px dashed #f1f5f9' }}>
                                                <div style={{ flex: 1 }}>
                                                    <p style={{ fontSize: '0.85rem', fontWeight: 800, color: '#1e293b' }}>{item.product_name || item.name}</p>
                                                    <p style={{ fontSize: '0.65rem', color: '#94a3b8', fontWeight: 700 }}>Qty: {item.quantity} @ Rs {item.price?.toLocaleString()}</p>
                                                </div>
                                                <div style={{ fontSize: '0.9rem', fontWeight: 950, color: '#0f172a' }}>
                                                    Rs {((item.price || 0) * (item.quantity || 0)).toLocaleString()}
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <div style={{ padding: '15px', background: '#f8fafc', borderRadius: '10px', border: '1px dashed #e2e8f0' }}>
                                            <p style={{ fontSize: '0.75rem', fontWeight: 800, color: '#475569' }}>{selectedSale.product_name || 'No item details available'}</p>
                                            <p style={{ fontSize: '0.6rem', color: '#94a3b8', fontWeight: 600, marginTop: '4px' }}>Detailed breakdown is only available for full sync records.</p>
                                        </div>
                                    )}
                                 </div>
                            </div>

                            <div style={{ background: '#f1f5f9', padding: '20px', borderRadius: '16px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#64748b' }}>TOTAL AMOUNT:</span>
                                    <span style={{ fontSize: '1.4rem', fontWeight: 950, color: '#0f172a' }}>Rs {selectedSale.total.toLocaleString()}</span>
                                </div>
                            </div>
                        </div>

                        <div style={{ padding: '20px', borderTop: '1px solid #f1f5f9', background: '#ffffff', display: 'flex', gap: '10px' }}>
                            <button className="btn-erp" style={{ flex: 1, padding: '14px', borderRadius: '10px', background: '#f8fafc', border: '1px solid #e2e8f0', color: '#1e293b', fontWeight: 900, fontSize: '0.8rem', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}>
                                <Printer size={18} /> PRINT
                            </button>
                            {isReturnsPage && isAdmin && (
                                <button
                                    onClick={() => handleReturn(selectedSale)}
                                    disabled={selectedSale.status === 'Returned'}
                                    style={{ flex: 1, padding: '14px', borderRadius: '10px', background: selectedSale.status === 'Returned' ? '#e2e8f0' : '#ef4444', color: 'white', border: 'none', fontWeight: 900, fontSize: '0.8rem', cursor: selectedSale.status === 'Returned' ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                                >
                                    <RotateCcw size={18} /> REVERSE
                                </button>
                            )}
                            {!isReturnsPage && isAdmin && (
                                <button
                                    onClick={() => handleDelete(selectedSale.id)}
                                    style={{ flex: 1, padding: '14px', borderRadius: '10px', background: '#fff1f1', color: '#ef4444', border: '1px solid #fee2e2', fontWeight: 900, fontSize: '0.8rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                                >
                                    <Trash2 size={18} /> DELETE
                                </button>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default SalesHistory;
