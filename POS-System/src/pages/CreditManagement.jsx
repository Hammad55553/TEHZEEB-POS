import React, { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Trash2, Edit3, UserPlus, Search, Phone, History, ArrowDownCircle, ArrowUpCircle, User, CreditCard, Share2, FileText, Image as ImageIcon, Download, Eye, X, MessageCircle, HelpCircle } from 'lucide-react';
import { addCustomer, updateBalance, deleteCustomer, editCustomer } from '../store/slices/customerSlice';
import toast from 'react-hot-toast';
import { db } from '../database';
import logo from '../assets/tehzeeb_logo.png';

const CreditManagement = () => {
    const dispatch = useDispatch();
    const { user } = useSelector(state => state.auth);
    const isAdmin = user?.role === 'admin';
    const customers = useSelector(state => state.customers.list);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCust, setSelectedCust] = useState(null);
    const [amount, setAmount] = useState('');
    const [note, setNote] = useState('');
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isExportModalOpen, setIsExportModalOpen] = useState(false);
    const [exportPreviewMode, setExportPreviewMode] = useState(null); // 'image', 'pdf', 'excel'
    const [khataType, setKhataType] = useState('Client');
    const [newCust, setNewCust] = useState({ name: '', phone: '', email: '', address: '', type: 'Client' });
    const [editData, setEditData] = useState({ id: '', name: '', phone: '', email: '', address: '', type: 'Client' });

    // Financial Overviews
    const totals = React.useMemo(() => {
        if (!customers) return { receivable: 0, payable: 0 };
        return customers.reduce((acc, c) => {
            const type = c.type || 'Client';
            if (type === 'Client') acc.receivable += (c.balance || 0);
            else acc.payable += (c.balance || 0);
            return acc;
        }, { receivable: 0, payable: 0 });
    }, [customers]);

    const filtered = React.useMemo(() => {
        if (!customers) return [];
        return customers.filter(c =>
            (c.type || 'Client') === khataType &&
            (c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                c.phone?.includes(searchTerm))
        ).sort((a, b) => b.balance - a.balance);
    }, [customers, khataType, searchTerm]);

    const handleDeleteCustomer = async (id) => {
        if (!isAdmin) return;
        if (window.confirm('Are you sure you want to PERMANENTLY delete this customer and all their history?')) {
            try {
                const { error } = await db
                    .from('customers')
                    .delete()
                    .eq('id', id);

                if (error) throw error;
                setSelectedCust(null);
                toast.success('Customer deleted from Database');
            } catch (err) {
                toast.error('Delete failed');
            }
        }
    };

    const handleUpdateCustomer = async (e) => {
        e.preventDefault();
        try {
            const { error } = await db
                .from('customers')
                .update({
                    name: editData.name,
                    phone: editData.phone,
                    email: editData.email || '',
                    address: editData.address || ''
                })
                .eq('id', editData.id);

            if (error) throw error;
            setIsEditModalOpen(false);
            toast.success('Details updated in Database');
        } catch (err) {
            toast.error('Update failed');
        }
    };

    const handleAction = async (type) => {
        if (!amount || parseFloat(amount) <= 0) return;
        const finalAmount = parseFloat(amount);

        const newBalance = type === 'credit' ? selectedCust.balance + finalAmount : selectedCust.balance - finalAmount;
        const newHistory = [
            { date: new Date().toISOString(), amount: finalAmount, type, note: note || (type === 'credit' ? 'Manual' : 'Payment') },
            ...(selectedCust.history || [])
        ];

        try {
            const { error } = await db
                .from('customers')
                .update({ balance: newBalance, history: newHistory })
                .eq('id', selectedCust.id);

            if (error) throw error;
            toast.success(type === 'credit' ? 'Debt recorded' : 'Payment received');
            setAmount('');
            setNote('');
        } catch (err) {
            toast.error('Transaction failed');
        }
    };

    const handleAddCustomer = async (e) => {
        e.preventDefault();
        const customerData = {
            name: newCust.name,
            phone: newCust.phone,
            email: newCust.email || '',
            address: newCust.address || '',
            type: newCust.type,
            balance: 0,
            history: []
        };

        try {
            const { error } = await db
                .from('customers')
                .insert([customerData]);

            if (error) throw error;
            toast.success('New account registered in Database');
            setIsAddModalOpen(false);
            setNewCust({ name: '', phone: '', email: '', address: '', type: 'Client' });
        } catch (err) {
            toast.error('Registration failed');
        }
    };

    const handleExportWhatsApp = (cust) => {
        const text = `*Tehzeeb Sweets & Super Store - Khata Summary*\n\n*Customer:* ${cust.name}\n*Total Balance:* Rs ${cust.balance.toLocaleString()}\n\n*Last Transactions:*\n${cust.history?.slice(0, 5).map(h => `- ${new Date(h.date).toLocaleDateString()}: Rs ${h.amount} (${h.type})`).join('\n')}\n\n_Please clear your dues at your earliest convenience._`;
        const encodedText = encodeURIComponent(text);
        window.open(`https://wa.me/${cust.phone?.replace(/[^0-9]/g, '')}?text=${encodedText}`, '_blank');
    };

    const handlePrintLedger = () => {
        window.print();
    };

    const handleExportExcel = (cust) => {
        const rows = [
            ["Date", "Description", "Type", "Amount"],
            ...(cust.history || []).map(h => [new Date(h.date).toLocaleDateString(), h.note || '—', h.type.toUpperCase(), h.amount])
        ];
        let csvContent = "data:text/csv;charset=utf-8," + rows.map(e => e.join(",")).join("\n");
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `${cust.name}_Ledger.csv`);
        document.body.appendChild(link);
        link.click();
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '15px', overflow: 'hidden', boxSizing: 'border-box' }}>
            {/* Toolbar */}
            <header style={{ 
                display: 'flex', 
                flexDirection: window.innerWidth <= 768 ? 'column' : 'row',
                justifyContent: 'space-between', 
                alignItems: window.innerWidth <= 768 ? 'stretch' : 'center', 
                marginBottom: '15px', 
                background: 'white', 
                padding: window.innerWidth <= 480 ? '15px' : '10px 20px', 
                borderRadius: '12px', 
                border: '1px solid #e2e8f0', 
                flexShrink: 0,
                gap: '15px'
            }}>
                <div>
                    <h2 style={{ fontSize: window.innerWidth <= 480 ? '1.1rem' : '1.2rem', fontWeight: 950, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ background: 'linear-gradient(45deg, #6366f1, #4f46e5)', padding: '5px', borderRadius: '8px', color: 'white' }}><CreditCard size={window.innerWidth <= 480 ? 14 : 16} /></div>
                        Executive Khata Hub
                    </h2>
                    <p style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 600, marginTop: '2px' }}>Receivables: <span style={{ color: '#ef4444' }}>Rs {totals.receivable.toLocaleString()}</span> | Payables: <span style={{ color: '#FF8A1E' }}>Rs {totals.payable.toLocaleString()}</span></p>
                </div>
                {isAdmin && (
                    <button
                        onClick={() => {
                            setNewCust({ ...newCust, type: khataType });
                            setIsAddModalOpen(true);
                        }}
                        style={{ background: '#6366f1', color: 'white', border: 'none', padding: '10px 16px', borderRadius: '8px', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', cursor: 'pointer', fontSize: '0.75rem' }}
                    >
                        <UserPlus size={16} /> REGISTER NEW {khataType.toUpperCase()}
                    </button>
                )}
            </header>

            {/* TAB SWITCHER */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '10px', flexShrink: 0 }}>
                {['Client', 'Company'].map(t => (
                    <button
                        key={t}
                        onClick={() => {
                            setKhataType(t);
                            setSelectedCust(null);
                        }}
                        style={{
                            padding: '6px 18px',
                            borderRadius: '8px',
                            border: khataType === t ? 'none' : '1px solid #e2e8f0',
                            fontWeight: 900,
                            cursor: 'pointer',
                            fontSize: '0.75rem',
                            backgroundColor: khataType === t ? '#1e293b' : 'white',
                            color: khataType === t ? 'white' : '#64748b',
                            transition: 'all 0.2s'
                        }}
                    >
                        {t} Accounts
                    </button>
                ))}
            </div>

            <div style={{ display: 'flex', gap: '15px', flex: 1, minHeight: 0, overflow: 'hidden', flexDirection: window.innerWidth <= 1024 ? 'column' : 'row' }}>
                {/* Left: Customer Selection Wall */}
                <div style={{ 
                    width: window.innerWidth <= 1024 ? '100%' : '280px', 
                    background: 'white', 
                    borderRadius: '12px', 
                    border: '1px solid #e2e8f0', 
                    display: (window.innerWidth <= 1024 && selectedCust) ? 'none' : 'flex', 
                    flexDirection: 'column', 
                    overflow: 'hidden', 
                    flexShrink: 0,
                    maxHeight: window.innerWidth <= 1024 ? '100%' : 'none'
                }}>
                    <div className="section-header" style={{ background: '#f8fafc', padding: '12px 15px', fontWeight: 950, color: '#0f172a', borderBottom: '1px solid #e2e8f0', fontSize: '0.85rem' }}>
                        {khataType === 'Client' ? 'Client Accounts' : 'Company Accounts'}
                    </div>
                    <div style={{ padding: '12px', borderBottom: '1px solid #f1f5f9' }}>
                        <div style={{ position: 'relative' }}>
                            <Search size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                            <input
                                style={{ width: '100%', padding: '10px 10px 10px 35px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 600 }}
                                placeholder={`Find ${khataType.toLowerCase()}...`}
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>
                    <div style={{ overflowY: 'auto', flex: 1, background: '#fff' }}>
                        {filtered.map(c => (
                            <div
                                key={c.id}
                                onClick={() => setSelectedCust(c)}
                                style={{
                                    padding: '12px 15px',
                                    borderBottom: '1px solid #f8fafc',
                                    cursor: 'pointer',
                                    background: selectedCust?.id === c.id ? '#f1f5f9' : 'transparent',
                                    transition: 'background 0.2s'
                                }}
                            >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ fontWeight: 800, fontSize: '0.85rem', color: '#1e293b' }}>{c.name}</span>
                                    <span style={{ fontWeight: 950, fontSize: '0.8rem', color: c.balance > 0 ? '#ef4444' : '#FF8A1E' }}>
                                        Rs {c.balance.toLocaleString()}
                                    </span>
                                </div>
                                <p style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 600, marginTop: '3px' }}>{c.phone}</p>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Right: Account Ledger & Actions */}
                <div style={{ 
                    flex: 1, 
                    display: (window.innerWidth <= 1024 && !selectedCust) ? 'none' : 'flex', 
                    flexDirection: 'column', 
                    gap: '10px', 
                    minHeight: 0 
                }}>
                    {selectedCust ? (
                        <>
                            <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', overflow: 'hidden', minHeight: 0, flex: 1 }}>
                                <div style={{ padding: '12px 15px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', flexShrink: 0 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                        {window.innerWidth <= 1024 && (
                                            <button onClick={() => setSelectedCust(null)} style={{ background: '#f1f5f9', border: 'none', padding: '8px', borderRadius: '8px', cursor: 'pointer' }}><X size={16} /></button>
                                        )}
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <span style={{ fontWeight: 950, fontSize: '0.95rem' }}>{selectedCust.name}</span>
                                            <div style={{ display: 'flex', gap: '6px' }}>
                                                <button onClick={() => { setEditData({ ...selectedCust }); setIsEditModalOpen(true); }} style={{ background: 'none', border: 'none', color: '#6366f1', cursor: 'pointer', padding: '2px' }}><Edit3 size={14} /></button>
                                                <button onClick={() => handleDeleteCustomer(selectedCust.id)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '2px' }}><Trash2 size={14} /></button>
                                            </div>
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px', fontSize: '0.75rem', fontWeight: 700, color: '#475569', flexWrap: 'wrap' }}>
                                        <span>📞 {selectedCust.phone}</span>
                                        <span style={{ color: selectedCust.balance > 0 ? '#ef4444' : '#FF8A1E', fontWeight: 950 }}>
                                            BALANCE: Rs {selectedCust.balance.toLocaleString()}
                                        </span>
                                    </div>
                                </div>
                                {selectedCust.address && (
                                    <div style={{ padding: '4px 15px', borderBottom: '1px dashed #e2e8f0', fontSize: '0.65rem', color: '#64748b', fontWeight: 600 }}>
                                        🏠 {selectedCust.address}
                                    </div>
                                )}
                                <div style={{ flex: 1, overflowX: 'auto', background: '#fff' }}>
                                    <table className="erp-table" style={{ minWidth: '600px' }}>
                                        <thead style={{ position: 'sticky', top: 0, zIndex: 1, backgroundColor: 'white' }}>
                                            <tr style={{ background: '#f8fafc' }}>
                                                <th style={{ padding: '10px 15px', fontWeight: 900, fontSize: '0.75rem' }}>Date & Time</th>
                                                <th style={{ padding: '10px 15px', fontWeight: 900, fontSize: '0.75rem' }}>Note / Detail</th>
                                                <th style={{ padding: '10px 15px', fontWeight: 900, fontSize: '0.75rem' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                                        Debit (+)
                                                        <HelpCircle 
                                                            size={12} 
                                                            style={{ cursor: 'help', color: '#6366f1' }} 
                                                            onClick={() => toast("DEBIT (+): Ye woh raqam hai jo aapne customer se LENI hai (Udhaar / Bill).", { icon: 'ℹ️' })}
                                                        />
                                                    </div>
                                                </th>
                                                <th style={{ padding: '10px 15px', fontWeight: 900, fontSize: '0.75rem' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                                        Credit (-)
                                                        <HelpCircle 
                                                            size={12} 
                                                            style={{ cursor: 'help', color: '#FF8A1E' }} 
                                                            onClick={() => toast("CREDIT (-): Ye woh raqam hai jo customer ne aapko WAPAS di hai (Wasuli / Jama).", { icon: '✅' })}
                                                        />
                                                    </div>
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {selectedCust.history.map((h, i) => (
                                                <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                                    <td style={{ padding: '8px 15px', fontSize: '0.75rem', fontWeight: 600 }}>{new Date(h.date).toLocaleDateString()}</td>
                                                    <td style={{ padding: '8px 15px', fontSize: '0.75rem', fontWeight: 700 }}>{h.note}</td>
                                                    <td style={{ padding: '8px 15px', color: '#ef4444', fontWeight: 900, fontSize: '0.8rem' }}>{h.type === 'credit' ? `Rs ${h.amount.toLocaleString()}` : '—'}</td>
                                                    <td style={{ padding: '8px 15px', color: '#FF8A1E', fontWeight: 900, fontSize: '0.8rem' }}>{h.type === 'payment' ? `Rs ${h.amount.toLocaleString()}` : '—'}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* Action Panel */}
                            <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '15px', flexShrink: 0 }}>
                                {isAdmin ? (
                                    <div style={{ display: 'grid', gridTemplateColumns: window.innerWidth <= 600 ? '1fr' : '1fr 1.5fr auto auto', gap: '15px' }}>
                                        <div>
                                            <label style={{ fontSize: '0.65rem', fontWeight: 900, color: '#64748b', display: 'block', marginBottom: '5px' }}>AMOUNT (Rs)</label>
                                            <input
                                                type="number"
                                                style={{ width: '100%', padding: '12px', fontSize: '1.2rem', fontWeight: 950, color: '#1e293b', border: '1px solid #e2e8f0', borderRadius: '10px', outline: 'none' }}
                                                value={amount}
                                                onChange={e => setAmount(e.target.value)}
                                                placeholder="0.00"
                                            />
                                        </div>
                                        <div>
                                            <label style={{ fontSize: '0.65rem', fontWeight: 900, color: '#64748b', display: 'block', marginBottom: '5px' }}>NOTE / REMARK</label>
                                            <input
                                                style={{ width: '100%', padding: '12px', border: '1px solid #e2e8f0', borderRadius: '10px', fontWeight: 700, outline: 'none', fontSize: '0.9rem' }}
                                                value={note}
                                                onChange={e => setNote(e.target.value)}
                                                placeholder="e.g. For Feed Purchase..."
                                            />
                                        </div>
                                        <div style={{ display: 'flex', gap: '10px' }}>
                                            <button
                                                onClick={() => handleAction('payment')}
                                                style={{ flex: 1, background: '#FF8A1E', color: 'white', border: 'none', borderRadius: '10px', fontWeight: 900, cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '4px', fontSize: '0.7rem', padding: '10px 15px' }}
                                            >
                                                <ArrowDownCircle size={18} />
                                                PAYMENT
                                            </button>
                                            <button
                                                onClick={() => handleAction('credit')}
                                                style={{ flex: 1, background: '#ef4444', color: 'white', border: 'none', borderRadius: '10px', fontWeight: 900, cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '4px', fontSize: '0.7rem', padding: '10px 15px' }}
                                            >
                                                <ArrowUpCircle size={18} />
                                                DEBT/BILL
                                            </button>
                                        </div>
                                        <button
                                            onClick={() => {
                                                setIsExportModalOpen(true);
                                                setExportPreviewMode('pdf');
                                            }}
                                            style={{ background: '#f8fafc', color: '#6366f1', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '10px 20px', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
                                        >
                                            <Share2 size={18} />
                                            <span style={{ fontSize: '0.65rem', fontWeight: 900 }}>SHARE</span>
                                        </button>
                                    </div>
                                ) : (
                                    <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}>
                                        <span style={{ fontWeight: 800, fontSize: '0.7rem' }}>ADMIN ONLY ACCESS</span>
                                    </div>
                                )}
                            </div>
                        </>
                    ) : (
                        <div style={{ gridRow: 'span 2', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'white', border: '1px solid var(--border)', borderRadius: '4px', opacity: 0.5 }}>
                            <User size={64} style={{ marginBottom: '15px' }} />
                            <h3 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Select Customer Account</h3>
                            <p>Search or click on an account from the left to view statement.</p>
                        </div>
                    )}
                </div>
            </div>
                      {/* LEDGER EXPORT MODAL */}
            {isExportModalOpen && selectedCust && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.8)', backdropFilter: 'blur(8px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '10px' }}>
                    <div style={{ 
                        background: 'white', 
                        width: '100%', 
                        maxWidth: '1000px', 
                        borderRadius: '24px', 
                        overflow: 'hidden', 
                        boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)', 
                        display: 'flex', 
                        flexDirection: window.innerWidth <= 768 ? 'column' : 'row',
                        height: window.innerWidth <= 768 ? '95vh' : '85vh' 
                    }}>
                        {/* SIDEBAR OPTIONS */}
                        <div style={{ 
                            width: window.innerWidth <= 768 ? '100%' : '280px',
                            background: '#f8fafc', 
                            padding: '25px', 
                            borderRight: window.innerWidth <= 768 ? 'none' : '1px solid #e2e8f0', 
                            borderBottom: window.innerWidth <= 768 ? '1px solid #e2e8f0' : 'none',
                            display: 'flex', 
                            flexDirection: 'column' 
                        }}>
                            <div style={{ marginBottom: '20px' }}>
                                <h3 style={{ fontSize: '1.1rem', fontWeight: 900, color: '#0f172a' }}>Export Options</h3>
                                <p style={{ fontSize: '0.75rem', color: '#64748b' }}>Generate statement for {selectedCust.name}</p>
                            </div>
 
                            <div style={{ display: 'flex', flexDirection: window.innerWidth <= 768 ? 'row' : 'column', gap: '10px', flexWrap: 'wrap' }}>
                                <button onClick={() => setExportPreviewMode('image')} style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '10px', padding: '12px', background: exportPreviewMode === 'image' ? '#0f172a' : 'white', color: exportPreviewMode === 'image' ? 'white' : '#1e293b', border: '1px solid #e2e8f0', borderRadius: '12px', cursor: 'pointer', fontWeight: 800, fontSize: '0.8rem' }}>
                                    <MessageCircle size={18} color="#FF8A1E" /> WhatsApp
                                </button>
                                <button onClick={() => setExportPreviewMode('pdf')} style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '10px', padding: '12px', background: exportPreviewMode === 'pdf' ? '#0f172a' : 'white', color: exportPreviewMode === 'pdf' ? 'white' : '#1e293b', border: '1px solid #e2e8f0', borderRadius: '12px', cursor: 'pointer', fontWeight: 800, fontSize: '0.8rem' }}>
                                    <FileText size={18} color="#ef4444" /> Print/PDF
                                </button>
                                <button onClick={() => handleExportExcel(selectedCust)} style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '10px', padding: '12px', background: 'white', color: '#1e293b', border: '1px solid #e2e8f0', borderRadius: '12px', cursor: 'pointer', fontWeight: 800, fontSize: '0.8rem' }}>
                                    <Download size={18} color="#0ea5e9" /> Excel
                                </button>
                            </div>
 
                            <button onClick={() => setIsExportModalOpen(false)} style={{ width: '100%', padding: '12px', background: '#f1f5f9', border: 'none', borderRadius: '12px', fontWeight: 900, color: '#64748b', cursor: 'pointer', marginTop: 'auto' }}>Close</button>
                        </div>
 
                        {/* PREVIEW AREA */}
                        <div style={{ flex: 1, padding: window.innerWidth <= 480 ? '10px' : '30px', overflowY: 'auto', background: '#94a3b8', display: 'flex', justifyContent: 'center' }}>
                            <div id="ledger-document" style={{ 
                                background: 'white', 
                                width: '100%', 
                                maxWidth: '800px',
                                minHeight: '100%', 
                                padding: window.innerWidth <= 480 ? '20px' : '50px', 
                                boxShadow: '0 10px 30px rgba(0,0,0,0.2)', 
                                position: 'relative', 
                                boxSizing: 'border-box' 
                            }}>
                                {/* LOGO & HEADER */}
                                <div style={{ textAlign: 'center', marginBottom: '30px', borderBottom: '2px solid #0f172a', paddingBottom: '15px' }}>
                                    <img src={logo} alt="Store Logo" style={{ height: '50px', marginBottom: '10px' }} />
                                    <h1 style={{ fontSize: '1.4rem', fontWeight: 950, color: '#0f172a', letterSpacing: '-1px' }}>TEHZEEB SWEETS & SUPER STORE</h1>
                                    <p style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 800 }}>SWEETS & GENERAL STORE | HASILPUR</p>
                                </div>
 
                                <div style={{ display: 'flex', flexDirection: window.innerWidth <= 480 ? 'column' : 'row', justifyContent: 'space-between', marginBottom: '30px', gap: '15px' }}>
                                    <div>
                                        <span style={{ fontSize: '0.65rem', fontWeight: 900, color: '#64748b', display: 'block' }}>ACCOUNT STATEMENT</span>
                                        <h2 style={{ fontSize: '1.2rem', fontWeight: 950, color: '#1e293b' }}>{selectedCust.name}</h2>
                                        <p style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 700 }}>Phone: {selectedCust.phone}</p>
                                    </div>
                                    <div style={{ textAlign: window.innerWidth <= 480 ? 'left' : 'right' }}>
                                        <span style={{ fontSize: '0.65rem', fontWeight: 900, color: '#64748b', display: 'block' }}>NET BALANCE</span>
                                        <h2 style={{ fontSize: '1.6rem', fontWeight: 950, color: selectedCust.balance > 0 ? '#ef4444' : '#FF8A1E' }}>Rs {selectedCust.balance.toLocaleString()}</h2>
                                        <span style={{ fontSize: '0.65rem', fontWeight: 900, color: '#94a3b8' }}>As of: {new Date().toLocaleDateString()}</span>
                                    </div>
                                </div>
 
                                <div style={{ overflowX: 'auto' }}>
                                    <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '40px', minWidth: '500px' }}>
                                        <thead>
                                            <tr style={{ background: '#f1f5f9', borderBottom: '2px solid #0f172a' }}>
                                                <th style={{ padding: '10px', textAlign: 'left', fontSize: '0.7rem', fontWeight: 900 }}>DATE</th>
                                                <th style={{ padding: '10px', textAlign: 'left', fontSize: '0.7rem', fontWeight: 900 }}>DESCRIPTION</th>
                                                <th style={{ padding: '10px', textAlign: 'right', fontSize: '0.7rem', fontWeight: 900 }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '4px' }}>
                                                        DEBIT (+)
                                                        <HelpCircle size={10} style={{ cursor: 'help' }} onClick={() => toast("DEBIT (+): Udhaar / Bill Amount", { icon: 'ℹ️' })} />
                                                    </div>
                                                </th>
                                                <th style={{ padding: '10px', textAlign: 'right', fontSize: '0.7rem', fontWeight: 900 }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '4px' }}>
                                                        CREDIT (-)
                                                        <HelpCircle size={10} style={{ cursor: 'help' }} onClick={() => toast("CREDIT (-): Wasuli / Jama Amount", { icon: '✅' })} />
                                                    </div>
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {selectedCust.history.map((h, i) => (
                                                <tr key={i} style={{ borderBottom: '1px solid #e2e8f0' }}>
                                                    <td style={{ padding: '10px', fontSize: '0.75rem', fontWeight: 700 }}>{new Date(h.date).toLocaleDateString()}</td>
                                                    <td style={{ padding: '10px', fontSize: '0.75rem' }}>{h.note}</td>
                                                    <td style={{ padding: '10px', textAlign: 'right', fontSize: '0.8rem', fontWeight: 900, color: '#ef4444' }}>{h.type === 'credit' ? `Rs ${h.amount.toLocaleString()}` : '—'}</td>
                                                    <td style={{ padding: '10px', textAlign: 'right', fontSize: '0.8rem', fontWeight: 900, color: '#FF8A1E' }}>{h.type === 'payment' ? `Rs ${h.amount.toLocaleString()}` : '—'}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
 
                                <div style={{ borderTop: '2px solid #e2e8f0', paddingTop: '15px', display: 'flex', flexDirection: window.innerWidth <= 480 ? 'column' : 'row', justifyContent: 'space-between', alignItems: 'center', gap: '15px' }}>
                                    <p style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 600 }}>Digitally generated by Tehzeeb Sweets & Super Store.</p>
                                    <button
                                        onClick={() => exportPreviewMode === 'image' ? handleExportWhatsApp(selectedCust) : handlePrintLedger()}
                                        style={{ width: window.innerWidth <= 480 ? '100%' : 'auto', background: '#0f172a', color: 'white', border: 'none', padding: '12px 25px', borderRadius: '12px', fontWeight: 950, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}
                                    >
                                        {exportPreviewMode === 'image' ? <MessageCircle size={18} /> : <FileText size={18} />}
                                        {exportPreviewMode === 'image' ? 'SEND WHATSAPP' : 'PRINT LEDGER'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Registration Modal */}
            {isAddModalOpen && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
                    <div style={{ background: 'white', width: '400px', borderRadius: '4px', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', overflow: 'hidden' }}>
                        <div style={{ background: '#6366f1', color: 'white', padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h3 style={{ fontSize: '1rem', fontWeight: 950 }}>REGISTER {khataType.toUpperCase()} KHATA</h3>
                            <button onClick={() => setIsAddModalOpen(false)} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', fontSize: '1.5rem' }}>×</button>
                        </div>
                        <form onSubmit={handleAddCustomer} style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
                            <div>
                                <label style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)', display: 'block', marginBottom: '5px' }}>FULL NAME</label>
                                <input required className="erp-input" style={{ width: '100%', padding: '8px', border: '1px solid var(--border)', borderRadius: '4px' }} value={newCust.name} onChange={e => setNewCust({ ...newCust, name: e.target.value })} />
                            </div>
                            <div>
                                <label style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)', display: 'block', marginBottom: '5px' }}>CONTACT NUMBER</label>
                                <input required className="erp-input" style={{ width: '100%', padding: '8px', border: '1px solid var(--border)', borderRadius: '4px' }} value={newCust.phone} onChange={e => setNewCust({ ...newCust, phone: e.target.value })} />
                            </div>
                            <div>
                                <label style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)', display: 'block', marginBottom: '5px' }}>EMAIL ADDRESS</label>
                                <input className="erp-input" style={{ width: '100%', padding: '8px', border: '1px solid var(--border)', borderRadius: '4px' }} value={newCust.email} onChange={e => setNewCust({ ...newCust, email: e.target.value })} />
                            </div>
                            <div>
                                <label style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)', display: 'block', marginBottom: '5px' }}>OFFICE / RESIDENTIAL ADDRESS</label>
                                <textarea className="erp-input" style={{ width: '100%', padding: '8px', border: '1px solid var(--border)', borderRadius: '4px', minHeight: '60px' }} value={newCust.address} onChange={e => setNewCust({ ...newCust, address: e.target.value })} />
                            </div>
                            <button type="submit" className="btn-erp btn-erp-primary" style={{ width: '100%', padding: '12px', justifyContent: 'center', marginTop: '10px' }}>Register Account</button>
                        </form>
                    </div>
                </div>
            )}
            {/* Edit Modal */}
            {isEditModalOpen && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
                    <div style={{ background: 'white', width: '400px', borderRadius: '4px', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', overflow: 'hidden' }}>
                        <div style={{ background: 'var(--primary)', color: 'white', padding: '12px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h3 style={{ fontSize: '0.9rem', fontWeight: 800 }}>UPDATE CUSTOMER DETAILS</h3>
                            <button onClick={() => setIsEditModalOpen(false)} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', fontSize: '1.2rem' }}>×</button>
                        </div>
                        <form onSubmit={handleUpdateCustomer} style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
                            <div>
                                <label style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)', display: 'block', marginBottom: '5px' }}>FULL NAME</label>
                                <input required className="erp-input" style={{ width: '100%', padding: '8px', border: '1px solid var(--border)', borderRadius: '4px' }} value={editData.name} onChange={e => setEditData({ ...editData, name: e.target.value })} />
                            </div>
                            <div>
                                <label style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)', display: 'block', marginBottom: '5px' }}>CONTACT NUMBER</label>
                                <input required className="erp-input" style={{ width: '100%', padding: '8px', border: '1px solid var(--border)', borderRadius: '4px' }} value={editData.phone} onChange={e => setEditData({ ...editData, phone: e.target.value })} />
                            </div>
                            <div>
                                <label style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)', display: 'block', marginBottom: '5px' }}>EMAIL ADDRESS</label>
                                <input className="erp-input" style={{ width: '100%', padding: '8px', border: '1px solid var(--border)', borderRadius: '4px' }} value={editData.email} onChange={e => setEditData({ ...editData, email: e.target.value })} />
                            </div>
                            <div>
                                <label style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)', display: 'block', marginBottom: '5px' }}>OFFICE / RESIDENTIAL ADDRESS</label>
                                <textarea className="erp-input" style={{ width: '100%', padding: '8px', border: '1px solid var(--border)', borderRadius: '4px', minHeight: '60px' }} value={editData.address} onChange={e => setEditData({ ...editData, address: e.target.value })} />
                            </div>
                            <button type="submit" className="btn-erp btn-erp-primary" style={{ width: '100%', padding: '12px', justifyContent: 'center', marginTop: '10px' }}>Save Changes</button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CreditManagement;
