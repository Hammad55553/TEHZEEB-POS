import React, { useState, useMemo } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Truck, 
    Plus, 
    Search, 
    Phone, 
    Building2, 
    History, 
    DollarSign, 
    ArrowUpRight, 
    ArrowDownRight, 
    Trash2, 
    X, 
    CheckCircle,
    UserPlus,
    Loader2
} from 'lucide-react';
import { db } from '../database';
import toast from 'react-hot-toast';
import { addSupplier, updateSupplierBalance, removeSupplier } from '../store/slices/suppliersSlice';
import { addToSyncQueue } from '../utils/offlineSync';

const SupplierManagement = () => {
    const dispatch = useDispatch();
    const suppliers = useSelector(state => state.suppliers.list);
    
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedSupplier, setSelectedSupplier] = useState(null);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isActionModalOpen, setIsActionModalOpen] = useState(false);
    const [actionType, setActionType] = useState('purchase'); // purchase or payment
    const [isSaving, setIsSaving] = useState(false);

    const [newSupplier, setNewSupplier] = useState({ name: '', contact: '', company: '', balance: '' });
    const [actionData, setActionData] = useState({ amount: '', note: '' });

    const filteredSuppliers = suppliers.filter(s => 
        s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        s.company.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const totalOutstanding = suppliers.reduce((acc, s) => acc + s.balance, 0);

    // --- ADD SUPPLIER (Direct Save Priority) ---
    const handleAddSupplier = async (e) => {
        e.preventDefault();
        if (isSaving) return;
        if (!newSupplier.name || !newSupplier.company) return toast.error('Name and Company are required');
        
        setIsSaving(true);
        const supplierId = `SUP-${Date.now()}`;
        const supplierData = {
            id: supplierId,
            name: newSupplier.name,
            contact: newSupplier.contact,
            company: newSupplier.company,
            balance: parseFloat(newSupplier.balance) || 0,
            history: newSupplier.balance > 0 ? [{
                date: new Date().toISOString(),
                type: 'Opening Balance',
                amount: parseFloat(newSupplier.balance),
                note: 'Account Created'
            }] : []
        };

        try {
            // Hum wait karenge taake cloud par save ho jaye (taake foran delete bhi ho sakay)
            const { error } = await db.from('suppliers').insert([supplierData]);
            
            if (error) {
                console.error("Database Error:", error);
                // Agar internet ka masla hai sirf tab queue mein dalein
                if (!navigator.onLine || error.message?.includes('Fetch')) {
                    addToSyncQueue('suppliers', 'insert', supplierData);
                    dispatch(addSupplier(supplierData));
                    toast.success('Offline: Saved locally, will sync later');
                    setIsAddModalOpen(false);
                } else {
                    // Agar DB error hai (400), toh user ko error dikhayein
                    toast.error(`Database Error: ${error.message}`);
                }
            } else {
                // Success on Cloud!
                dispatch(addSupplier(supplierData));
                toast.success('Supplier Profile Created LIVE on Cloud');
                setNewSupplier({ name: '', contact: '', company: '', balance: '' });
                setIsAddModalOpen(false);
            }
        } catch (err) {
            console.error("Fatal Error Add Supplier:", err);
            addToSyncQueue('suppliers', 'insert', supplierData);
            dispatch(addSupplier(supplierData));
            toast.success('Saved Locally (Offline Mode)');
            setIsAddModalOpen(false);
        } finally {
            setIsSaving(false);
        }
    };

    // --- UPDATE BALANCE (Purchase/Payment) ---
    const handleAction = async (e) => {
        e.preventDefault();
        if (isSaving) return;
        if (!actionData.amount) return toast.error('Enter amount');
        
        setIsSaving(true);
        const amount = parseFloat(actionData.amount);
        const newBalance = actionType === 'purchase' ? selectedSupplier.balance + amount : selectedSupplier.balance - amount;
        const newHistory = [
            {
                date: new Date().toISOString(),
                type: actionType === 'purchase' ? 'Stock Purchase' : 'Payment Made',
                amount: amount,
                note: actionData.note || ''
            },
            ...(selectedSupplier.history || [])
        ];

        try {
            const { error } = await db.from('suppliers').update({ balance: newBalance, history: newHistory }).eq('id', selectedSupplier.id);
            
            if (error) {
                addToSyncQueue('suppliers', 'update', { balance: newBalance, history: newHistory }, selectedSupplier.id);
                dispatch(updateSupplierBalance({ id: selectedSupplier.id, amount, type: actionType, note: actionData.note }));
                toast.success('Queued for Sync');
            } else {
                dispatch(updateSupplierBalance({ id: selectedSupplier.id, amount, type: actionType, note: actionData.note }));
                toast.success('Balance Updated Successfully');
            }
            setIsActionModalOpen(false);
            setActionData({ amount: '', note: '' });
            setSelectedSupplier(prev => ({ ...prev, balance: newBalance, history: newHistory }));
        } catch (err) {
            addToSyncQueue('suppliers', 'update', { balance: newBalance, history: newHistory }, selectedSupplier.id);
            dispatch(updateSupplierBalance({ id: selectedSupplier.id, amount, type: actionType, note: actionData.note }));
            toast.success('Saved Locally');
            setIsActionModalOpen(false);
        } finally {
            setIsSaving(false);
        }
    };

    // --- DELETE SUPPLIER (Improved) ---
    const handleDeleteSupplier = async (id) => {
        if (!window.confirm('Move this supplier to Trash? It will be permanently deleted after 30 days.')) return;
        
        const cleanId = id.trim();
        try {
            // Hum .delete() ki jagah .update() use karenge (Soft Delete)
            const { data, error } = await db
                .from('suppliers')
                .update({ deleted_at: new Date().toISOString() })
                .eq('id', cleanId)
                .select();
            
            if (error) {
                console.error("Delete Error:", error);
                if (error.code === '23503') {
                    toast.error('Cannot move to Trash: Supplier has linked inventory items');
                } else {
                    toast.error(`Action Failed: ${error.message}`);
                }
            } else if (!data || data.length === 0) {
                toast.error('ID Mismatch or Record not found');
            } else {
                dispatch(removeSupplier(cleanId));
                toast.success('Supplier moved to Trash');
                setSelectedSupplier(null);
            }
        } catch (err) {
            console.error("Fatal Error Delete:", err);
            toast.error('Action failed due to application error');
        }
    };

    return (
        <div style={{ 
            height: '100%', 
            display: 'flex', 
            flexDirection: 'column', 
            gap: window.innerWidth <= 480 ? '15px' : '20px', 
            padding: window.innerWidth <= 480 ? '15px' : '25px', 
            backgroundColor: '#f8fafc',
            overflow: 'hidden',
            boxSizing: 'border-box'
        }}>
            
            {/* HEADER */}
            <header style={{ 
                display: 'flex', 
                flexDirection: window.innerWidth <= 768 ? 'column' : 'row',
                justifyContent: 'space-between', 
                alignItems: window.innerWidth <= 768 ? 'stretch' : 'center', 
                background: 'white', 
                padding: window.innerWidth <= 480 ? '15px 20px' : '20px 25px', 
                borderRadius: '16px', 
                border: '1px solid #e2e8f0', 
                boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)',
                gap: '15px'
            }}>
                <div>
                    <h2 style={{ 
                        fontSize: window.innerWidth <= 480 ? '1.2rem' : '1.6rem', 
                        fontWeight: 950, 
                        color: '#1e293b', 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '12px' 
                    }}>
                        <div style={{ background: '#FFF7E6', padding: '8px', borderRadius: '10px' }}>
                            <Truck size={window.innerWidth <= 480 ? 20 : 28} color="#F7941D" />
                        </div>
                        SUPPLIER NETWORK
                    </h2>
                    <p style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600, marginTop: '2px' }}>Procurement khata & settlement history.</p>
                </div>
                <div style={{ 
                    display: 'flex', 
                    flexDirection: window.innerWidth <= 480 ? 'column' : 'row',
                    gap: '15px', 
                    alignItems: window.innerWidth <= 480 ? 'stretch' : 'center' 
                }}>
                    <div style={{ 
                        textAlign: window.innerWidth <= 480 ? 'left' : 'right', 
                        paddingRight: window.innerWidth <= 480 ? '0' : '20px', 
                        borderRight: window.innerWidth <= 480 ? 'none' : '1px solid #e2e8f0',
                        borderBottom: window.innerWidth <= 480 ? '1px solid #f1f5f9' : 'none',
                        paddingBottom: window.innerWidth <= 480 ? '10px' : '0'
                    }}>
                        <p style={{ fontSize: '0.65rem', fontWeight: 800, color: '#64748b' }}>TOTAL OUTSTANDING</p>
                        <h4 style={{ fontSize: window.innerWidth <= 480 ? '1.1rem' : '1.2rem', fontWeight: 950, color: '#ef4444' }}>Rs {totalOutstanding.toLocaleString()}</h4>
                    </div>
                    <button 
                        onClick={() => setIsAddModalOpen(true)}
                        style={{ 
                            background: '#F7941D', 
                            color: 'white', 
                            border: 'none', 
                            padding: '12px 20px', 
                            borderRadius: '10px', 
                            fontWeight: 800, 
                            cursor: 'pointer', 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'center',
                            gap: '8px',
                            fontSize: '0.85rem'
                        }}
                    >
                        <UserPlus size={18} /> NEW SUPPLIER
                    </button>
                </div>
            </header>

            <div style={{ 
                display: 'flex', 
                flexDirection: window.innerWidth <= 1024 ? 'column' : 'row',
                gap: '20px', 
                flex: 1, 
                overflow: 'hidden' 
            }}>
                
                {/* SUPPLIER LIST */}
                <div style={{ 
                    display: (window.innerWidth <= 1024 && selectedSupplier) ? 'none' : 'flex', 
                    flexDirection: 'column', 
                    gap: '15px', 
                    flex: 1,
                    overflow: 'hidden' 
                }}>
                    <div style={{ 
                        background: 'white', 
                        padding: '12px', 
                        borderRadius: '12px', 
                        border: '1px solid #e2e8f0' 
                    }}>
                        <div style={{ position: 'relative' }}>
                            <Search size={16} style={{ position: 'absolute', left: '15px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                            <input 
                                type="text" 
                                placeholder="Find supplier or company..." 
                                style={{ 
                                    width: '100%', 
                                    padding: '10px 15px 10px 40px', 
                                    border: '1px solid #cbd5e1', 
                                    borderRadius: '8px', 
                                    fontSize: '0.85rem', 
                                    fontWeight: 600,
                                    outline: 'none'
                                }}
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>

                    <div style={{ 
                        flex: 1, 
                        overflowY: 'auto', 
                        display: 'grid', 
                        gridTemplateColumns: window.innerWidth <= 640 ? '1fr' : 'repeat(auto-fill, minmax(300px, 1fr))', 
                        gap: '15px', 
                        paddingBottom: '20px' 
                    }}>
                        {filteredSuppliers.map((sup) => (
                            <motion.div 
                                key={sup.id}
                                layoutId={sup.id}
                                onClick={() => setSelectedSupplier(sup)}
                                style={{ 
                                    background: 'white', 
                                    padding: '15px', 
                                    borderRadius: '16px', 
                                    border: selectedSupplier?.id === sup.id ? '2px solid #F7941D' : '1px solid #e2e8f0', 
                                    cursor: 'pointer',
                                    transition: 'all 0.2s',
                                    display: 'flex',
                                    flexDirection: 'column'
                                }}
                            >
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', alignItems: 'center' }}>
                                    <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#FFF7E6', color: '#F7941D', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <Building2 size={18} />
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <p style={{ fontSize: '0.55rem', fontWeight: 800, color: '#64748b' }}>PAYABLE</p>
                                        <p style={{ fontSize: '0.95rem', fontWeight: 950, color: sup.balance > 0 ? '#ef4444' : '#F7941D' }}>Rs {sup.balance.toLocaleString()}</p>
                                    </div>
                                </div>
                                <h3 style={{ fontSize: '1rem', fontWeight: 900, color: '#1e293b', marginBottom: '4px' }}>{sup.name}</h3>
                                <p style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '5px' }}>
                                    <Building2 size={12} /> {sup.company}
                                </p>
                                
                                <div style={{ display: 'flex', gap: '8px', marginTop: '15px' }}>
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); setSelectedSupplier(sup); setActionType('purchase'); setIsActionModalOpen(true); }}
                                        style={{ flex: 1, padding: '8px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '0.65rem', fontWeight: 800, cursor: 'pointer' }}
                                    >+ STOCK</button>
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); setSelectedSupplier(sup); setActionType('payment'); setIsActionModalOpen(true); }}
                                        style={{ flex: 1, padding: '8px', background: '#FFF7E6', border: '1px solid #FFEFD0', color: '#F7941D', borderRadius: '8px', fontSize: '0.65rem', fontWeight: 800, cursor: 'pointer' }}
                                    >PAYMENT</button>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>

                {/* DETAILS PANEL */}
                <div style={{ 
                    background: 'white', 
                    borderRadius: window.innerWidth <= 1024 ? '16px' : '24px', 
                    border: '1px solid #e2e8f0', 
                    display: (window.innerWidth <= 1024 && !selectedSupplier) ? 'none' : 'flex', 
                    flexDirection: 'column', 
                    overflow: 'hidden',
                    width: window.innerWidth <= 1024 ? '100%' : '400px',
                    flexShrink: 0
                }}>
                    {selectedSupplier ? (
                        <>
                            <div style={{ padding: '20px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                        {window.innerWidth <= 1024 && (
                                            <button onClick={() => setSelectedSupplier(null)} style={{ background: 'white', border: '1px solid #e2e8f0', padding: '6px', borderRadius: '8px', cursor: 'pointer' }}>
                                                <X size={16} />
                                            </button>
                                        )}
                                        <div>
                                            <h4 style={{ fontSize: '1.1rem', fontWeight: 950, color: '#1e293b' }}>{selectedSupplier.name}</h4>
                                            <p style={{ color: '#64748b', fontWeight: 700, fontSize: '0.75rem' }}>{selectedSupplier.company}</p>
                                        </div>
                                    </div>
                                    <button onClick={() => handleDeleteSupplier(selectedSupplier.id)} style={{ background: '#fee2e2', color: '#ef4444', border: 'none', padding: '8px', borderRadius: '8px', cursor: 'pointer' }}>
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                                <div style={{ marginTop: '12px', display: 'flex', gap: '15px' }}>
                                    <div style={{ flex: 1 }}>
                                        <p style={{ fontSize: '0.55rem', fontWeight: 800, color: '#94a3b8' }}>CONTACT</p>
                                        <p style={{ fontSize: '0.8rem', fontWeight: 800, color: '#475569' }}>{selectedSupplier.contact || 'N/A'}</p>
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <p style={{ fontSize: '0.55rem', fontWeight: 800, color: '#94a3b8' }}>TOTAL BALANCE</p>
                                        <p style={{ fontSize: '0.9rem', fontWeight: 950, color: selectedSupplier.balance > 0 ? '#ef4444' : '#F7941D' }}>Rs {selectedSupplier.balance.toLocaleString()}</p>
                                    </div>
                                </div>
                            </div>
                            
                            <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
                                <h5 style={{ fontSize: '0.8rem', fontWeight: 900, color: '#1e293b', marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <History size={16} /> LEDGER HISTORY
                                </h5>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                    {selectedSupplier.history?.map((h, i) => (
                                        <div key={i} style={{ display: 'flex', gap: '12px', padding: '12px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                                            <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: h.type.includes('Payment') ? '#FFF7E6' : '#fff1f1', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                                {h.type.includes('Payment') ? <ArrowDownRight size={16} color="#F7941D" /> : <ArrowUpRight size={16} color="#ef4444" />}
                                            </div>
                                            <div style={{ flex: 1 }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                                    <p style={{ fontSize: '0.8rem', fontWeight: 800, color: '#1e293b' }}>{h.type}</p>
                                                    <span style={{ fontSize: '0.85rem', fontWeight: 950, color: h.type.includes('Payment') ? '#F7941D' : '#ef4444' }}>
                                                        {h.type.includes('Payment') ? '-' : '+'} Rs {h.amount.toLocaleString()}
                                                    </span>
                                                </div>
                                                <p style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 600 }}>{h.note || 'Manual'}</p>
                                                <p style={{ fontSize: '0.6rem', color: '#94a3b8', fontWeight: 700, marginTop: '2px' }}>{new Date(h.date).toLocaleDateString()}</p>
                                            </div>
                                        </div>
                                    ))}
                                    {(!selectedSupplier.history || selectedSupplier.history.length === 0) && (
                                        <div style={{ textAlign: 'center', padding: '40px 0', color: '#cbd5e1' }}>
                                            <History size={32} style={{ opacity: 0.3, marginBottom: '8px' }} />
                                            <p style={{ fontSize: '0.75rem', fontWeight: 800 }}>No entries.</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </>
                    ) : (
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px', textAlign: 'center' }}>
                            <div style={{ width: '70px', height: '70px', borderRadius: '50%', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '15px' }}>
                                <Truck size={36} color="#cbd5e1" />
                            </div>
                            <h3 style={{ color: '#1e293b', fontWeight: 900, fontSize: '1rem' }}>Supplier Details</h3>
                            <p style={{ color: '#64748b', fontSize: '0.75rem', fontWeight: 600, marginTop: '8px' }}>Select a vendor from the list to view procurement history.</p>
                        </div>
                    )}
                </div>
            </div>

            {/* ADD SUPPLIER MODAL */}
            {isAddModalOpen && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.7)', backdropFilter: 'blur(4px)', zIndex: 1000, display: 'flex', alignItems: window.innerWidth <= 480 ? 'flex-end' : 'center', justifyContent: 'center' }}>
                    <div style={{ background: 'white', width: '100%', maxWidth: '450px', borderRadius: window.innerWidth <= 480 ? '24px 24px 0 0' : '16px', overflow: 'hidden' }}>
                        <div style={{ background: '#F7941D', padding: '20px', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h3 style={{ fontWeight: 900, fontSize: '1rem' }}>REGISTER NEW SUPPLIER</h3>
                            <button onClick={() => setIsAddModalOpen(false)} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: 'white', cursor: 'pointer', padding: '5px', borderRadius: '8px' }}><X size={20} /></button>
                        </div>
                        <form onSubmit={handleAddSupplier} style={{ padding: '25px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
                            <div>
                                <label style={{ fontSize: '0.7rem', fontWeight: 900, color: '#64748b', display: 'block', marginBottom: '6px' }}>FULL NAME / OWNER</label>
                                <input style={{ width: '100%', padding: '12px', border: '1px solid #e2e8f0', borderRadius: '10px', fontSize: '0.9rem', fontWeight: 700, outline: 'none' }} value={newSupplier.name} onChange={e => setNewSupplier({...newSupplier, name: e.target.value})} placeholder="Owner Name" />
                            </div>
                            <div>
                                <label style={{ fontSize: '0.7rem', fontWeight: 900, color: '#64748b', display: 'block', marginBottom: '6px' }}>COMPANY / DISTRIBUTOR</label>
                                <input style={{ width: '100%', padding: '12px', border: '1px solid #e2e8f0', borderRadius: '10px', fontSize: '0.9rem', fontWeight: 700, outline: 'none' }} value={newSupplier.company} onChange={e => setNewSupplier({...newSupplier, company: e.target.value})} placeholder="Company Name" />
                            </div>
                            <div>
                                <label style={{ fontSize: '0.7rem', fontWeight: 900, color: '#64748b', display: 'block', marginBottom: '6px' }}>CONTACT</label>
                                <input style={{ width: '100%', padding: '12px', border: '1px solid #e2e8f0', borderRadius: '10px', fontSize: '0.9rem', fontWeight: 700, outline: 'none' }} value={newSupplier.contact} onChange={e => setNewSupplier({...newSupplier, contact: e.target.value})} placeholder="Phone Number" />
                            </div>
                            <div>
                                <label style={{ fontSize: '0.7rem', fontWeight: 900, color: '#64748b', display: 'block', marginBottom: '6px' }}>OPENING BALANCE (Rs)</label>
                                <input type="number" style={{ width: '100%', padding: '12px', border: '1px solid #e2e8f0', borderRadius: '10px', fontSize: '0.9rem', fontWeight: 700, outline: 'none' }} value={newSupplier.balance} onChange={e => setNewSupplier({...newSupplier, balance: e.target.value})} placeholder="0" />
                            </div>
                            <button 
                                type="submit" 
                                disabled={isSaving}
                                style={{ width: '100%', padding: '15px', background: isSaving ? '#94a3b8' : '#F7941D', color: 'white', border: 'none', borderRadius: '12px', fontWeight: 900, fontSize: '1rem', cursor: isSaving ? 'not-allowed' : 'pointer', marginTop: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                            >
                                {isSaving ? <Loader2 size={20} className="animate-spin" /> : <Plus size={20} />}
                                {isSaving ? 'REGISTERING...' : 'REGISTER SUPPLIER'}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* ACTION MODAL (PURCHASE/PAYMENT) */}
            {isActionModalOpen && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.7)', backdropFilter: 'blur(4px)', zIndex: 1000, display: 'flex', alignItems: window.innerWidth <= 480 ? 'flex-end' : 'center', justifyContent: 'center' }}>
                    <div style={{ background: 'white', width: '100%', maxWidth: '400px', borderRadius: window.innerWidth <= 480 ? '24px 24px 0 0' : '16px', overflow: 'hidden' }}>
                        <div style={{ background: actionType === 'purchase' ? '#ef4444' : '#F7941D', padding: '20px', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h3 style={{ fontWeight: 900, fontSize: '1rem' }}>{actionType === 'purchase' ? 'RECORD PURCHASE' : 'RECORD PAYMENT'}</h3>
                            <button onClick={() => setIsActionModalOpen(false)} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: 'white', cursor: 'pointer', padding: '5px', borderRadius: '8px' }}><X size={20} /></button>
                        </div>
                        <form onSubmit={handleAction} style={{ padding: '25px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            <div style={{ textAlign: 'center', padding: '10px', background: '#f8fafc', borderRadius: '10px' }}>
                                <p style={{ fontSize: '0.65rem', fontWeight: 800, color: '#64748b' }}>VENDOR: {selectedSupplier.company}</p>
                                <p style={{ fontSize: '0.85rem', fontWeight: 900, color: '#1e293b' }}>Balance: Rs {selectedSupplier.balance.toLocaleString()}</p>
                            </div>
                            <div>
                                <label style={{ fontSize: '0.7rem', fontWeight: 900, color: '#64748b', display: 'block', marginBottom: '8px' }}>AMOUNT (Rs)</label>
                                <input 
                                    type="number"
                                    autoFocus
                                    placeholder="0" 
                                    style={{ width: '100%', padding: '12px', border: '1px solid #e2e8f0', borderRadius: '10px', fontSize: '1.2rem', fontWeight: 950, color: actionType === 'purchase' ? '#ef4444' : '#F7941D', outline: 'none' }}
                                    value={actionData.amount}
                                    onChange={(e) => setActionData({ ...actionData, amount: e.target.value })}
                                />
                            </div>
                            <div>
                                <label style={{ fontSize: '0.7rem', fontWeight: 900, color: '#64748b', display: 'block', marginBottom: '8px' }}>INVOICE / NOTES</label>
                                <input 
                                    placeholder="Reference..." 
                                    style={{ width: '100%', padding: '12px', border: '1px solid #e2e8f0', borderRadius: '10px', fontSize: '0.9rem', fontWeight: 700, outline: 'none' }}
                                    value={actionData.note}
                                    onChange={(e) => setActionData({ ...actionData, note: e.target.value })}
                                />
                            </div>
                            <button 
                                type="submit" 
                                disabled={isSaving}
                                style={{ width: '100%', padding: '15px', background: isSaving ? '#94a3b8' : (actionType === 'purchase' ? '#ef4444' : '#F7941D'), color: 'white', border: 'none', borderRadius: '12px', fontWeight: 900, fontSize: '1rem', cursor: isSaving ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                            >
                                {isSaving ? <Loader2 size={20} className="animate-spin" /> : <CheckCircle size={20} />}
                                {isSaving ? 'PROCESSING...' : (actionType === 'purchase' ? 'INCREASE PAYABLE' : 'RECORD PAYMENT')}
                            </button>
                        </form>
                    </div>
                </div>
            )}

        </div>
    );
};

export default SupplierManagement;
