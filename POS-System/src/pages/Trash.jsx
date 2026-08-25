import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { 
    Trash2, 
    RefreshCcw, 
    History, 
    Truck, 
    Search, 
    XCircle,
    Calendar,
    AlertCircle,
    CheckCircle2,
    Loader2,
    Box,
    ShoppingCart,
    ChevronDown,
    ChevronUp,
    Info,
    Receipt
} from 'lucide-react';
import { db } from '../database';
import toast from 'react-hot-toast';

const Trash = () => {
    const [activeTab, setActiveTab] = useState('sales'); // 'sales', 'suppliers', 'inventory', 'orders'
    const [trashData, setTrashData] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isActionLoading, setIsActionLoading] = useState(null); 
    const [searchTerm, setSearchTerm] = useState('');
    const [expandedId, setExpandedId] = useState(null);

    const fetchTrash = async () => {
        setIsLoading(true);
        try {
            let query = db.from(activeTab).select('*').not('deleted_at', 'is', null);

            // Fetch nested items if it's sales or orders
            if (activeTab === 'sales') {
                query = db.from('sales').select('*, sale_items(*, inventory(name))').not('deleted_at', 'is', null);
            }

            const { data, error } = await query.order('deleted_at', { ascending: false });

            if (error) throw error;
            setTrashData(data || []);
        } catch (err) {
            console.error("Fetch Trash Error:", err);
            toast.error("Failed to load trash");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        setExpandedId(null);
        fetchTrash();
    }, [activeTab]);

    const handleRestore = async (id) => {
        setIsActionLoading(id);
        try {
            const { error } = await db.from(activeTab).update({ deleted_at: null }).eq('id', id);
            if (error) throw error;
            toast.success("Record Restored Successfully");
            setTrashData(prev => prev.filter(item => item.id !== id));
        } catch (err) {
            toast.error("Failed to restore");
        } finally {
            setIsActionLoading(null);
        }
    };

    const handlePermanentDelete = async (id) => {
        if (!window.confirm("PERMANENT DELETE: This action cannot be undone. Are you sure?")) return;
        setIsActionLoading(id);
        try {
            const { error } = await db.from(activeTab).delete().eq('id', id);
            if (error) throw error;
            toast.success("Deleted Permanently");
            setTrashData(prev => prev.filter(item => item.id !== id));
        } catch (err) {
            toast.error("Failed to delete permanently");
        } finally {
            setIsActionLoading(null);
        }
    };

    const filteredTrash = trashData.filter(item => {
        const query = searchTerm.toLowerCase();
        if (activeTab === 'sales') return item.customer_name?.toLowerCase().includes(query) || item.id.toString().includes(query);
        if (activeTab === 'suppliers') return item.name?.toLowerCase().includes(query) || item.company?.toLowerCase().includes(query);
        if (activeTab === 'orders') return item.supplier?.toLowerCase().includes(query) || item.id.toString().includes(query);
        return item.name?.toLowerCase().includes(query) || item.id.toString().includes(query) || item.barcode?.includes(query);
    });

    return (
        <div style={{ height: '100%', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '20px', padding: window.innerWidth <= 768 ? '10px' : '25px', backgroundColor: '#f8fafc' }}>
            
            <header style={{ 
                display: 'flex', 
                flexDirection: window.innerWidth <= 768 ? 'column' : 'row',
                justifyContent: 'space-between', 
                alignItems: window.innerWidth <= 768 ? 'flex-start' : 'center', 
                background: 'white', 
                padding: '20px 25px', 
                borderRadius: '16px', 
                border: '1px solid #e2e8f0',
                gap: '15px'
            }}>
                <div>
                    <h2 style={{ fontSize: window.innerWidth <= 480 ? '1.3rem' : '1.6rem', fontWeight: 950, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <Trash2 size={28} color="#ef4444" /> SYSTEM TRASH
                    </h2>
                    <p style={{ color: '#64748b', fontWeight: 600, fontSize: '0.9rem' }}>Items are automatically cleared after 30 days</p>
                </div>
                
                <div style={{ 
                    display: 'flex', 
                    background: '#f1f5f9', 
                    padding: '5px', 
                    borderRadius: '12px', 
                    gap: '5px',
                    width: window.innerWidth <= 768 ? '100%' : 'auto',
                    overflowX: 'auto'
                }} className="hide-scrollbar">
                    {['sales', 'inventory', 'suppliers', 'orders'].map(tab => (
                        <button key={tab} onClick={() => setActiveTab(tab)} style={{ flex: window.innerWidth <= 768 ? 1 : 'none', padding: '10px 15px', border: 'none', borderRadius: '10px', fontWeight: 800, fontSize: '0.75rem', cursor: 'pointer', background: activeTab === tab ? 'white' : 'transparent', color: activeTab === tab ? '#F7941D' : '#64748b', boxShadow: activeTab === tab ? '0 4px 6px -1px rgba(0,0,0,0.05)' : 'none', whiteSpace: 'nowrap' }}>
                            {tab.toUpperCase()}
                        </button>
                    ))}
                </div>
            </header>

            <div style={{ background: 'white', padding: '15px', borderRadius: '16px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: window.innerWidth <= 480 ? 'column' : 'row', gap: '15px' }}>
                <div style={{ position: 'relative', flex: 1 }}>
                    <Search size={18} style={{ position: 'absolute', left: '15px', top: '12px', color: '#94a3b8' }} />
                    <input type="text" placeholder={`Search deleted ${activeTab}...`} style={{ width: '100%', padding: '12px 15px 12px 45px', border: '1px solid #e2e8f0', borderRadius: '10px', fontSize: '0.9rem', fontWeight: 600 }} value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                </div>
                <button onClick={fetchTrash} style={{ padding: window.innerWidth <= 480 ? '12px' : '0 20px', background: 'white', border: '1px solid #e2e8f0', borderRadius: '10px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><RefreshCcw size={18} color="#64748b" /></button>
            </div>

            <div style={{ flex: 1, background: 'transparent', display: 'flex', flexDirection: 'column' }}>
                {isLoading ? (
                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'white', borderRadius: '24px' }}><Loader2 className="animate-spin" size={40} color="#F7941D" /></div>
                ) : filteredTrash.length > 0 ? (
                    window.innerWidth <= 1024 ? (
                        /* Mobile/Tablet Card View */
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                            {filteredTrash.map(item => {
                                const deletedDate = new Date(item.deleted_at);
                                const expiryDate = new Date(deletedDate);
                                expiryDate.setDate(expiryDate.getDate() + 30);
                                const daysRemaining = Math.ceil((expiryDate - new Date()) / (1000 * 60 * 60 * 24));
                                const isExpanded = expandedId === item.id;

                                return (
                                    <div key={item.id} style={{ background: 'white', borderRadius: '16px', border: '1px solid #e2e8f0', overflow: 'hidden', transition: 'all 0.2s' }}>
                                        <div style={{ padding: '15px', display: 'flex', flexDirection: 'column', gap: '15px' }} onClick={() => setExpandedId(isExpanded ? null : item.id)}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                    <div style={{ padding: '8px', background: '#f1f5f9', borderRadius: '10px' }}>
                                                        {activeTab === 'sales' ? <History size={18} color="#F7941D" /> : activeTab === 'inventory' ? <Box size={18} color="#F7941D" /> : activeTab === 'orders' ? <ShoppingCart size={18} color="#6366f1" /> : <Truck size={18} color="#F7941D" />}
                                                    </div>
                                                    <div>
                                                        <p style={{ fontWeight: 900, color: '#1e293b', fontSize: '0.95rem' }}>{activeTab === 'sales' ? `Invoice #${item.id.toString().slice(-6).toUpperCase()}` : activeTab === 'orders' ? `Order #${item.id}` : item.name}</p>
                                                        <p style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b' }}>{activeTab === 'sales' ? item.customer_name : activeTab === 'inventory' ? item.category : activeTab === 'orders' ? item.supplier : item.company}</p>
                                                    </div>
                                                </div>
                                                <span style={{ padding: '4px 10px', borderRadius: '20px', fontSize: '0.7rem', fontWeight: 800, background: daysRemaining < 7 ? '#fff1f1' : '#f0fdf4', color: daysRemaining < 7 ? '#ef4444' : '#F7941D' }}>{daysRemaining}D Left</span>
                                            </div>

                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem', color: '#64748b', fontWeight: 700 }}>
                                                <span>Deleted: {deletedDate.toLocaleDateString()}</span>
                                                <div style={{ display: 'flex', gap: '8px' }}>
                                                    <button onClick={(e) => { e.stopPropagation(); handleRestore(item.id); }} disabled={isActionLoading === item.id} style={{ padding: '8px 12px', background: '#FFF7E6', border: '1px solid #FFEFD0', color: '#F7941D', borderRadius: '8px', fontSize: '0.7rem', fontWeight: 800, cursor: 'pointer' }}>RESTORE</button>
                                                    <button onClick={(e) => { e.stopPropagation(); handlePermanentDelete(item.id); }} disabled={isActionLoading === item.id} style={{ padding: '8px 12px', background: '#fff1f1', border: '1px solid #fee2e2', color: '#ef4444', borderRadius: '8px', fontSize: '0.7rem', fontWeight: 800, cursor: 'pointer' }}>DELETE</button>
                                                </div>
                                            </div>

                                            {isExpanded && activeTab === 'sales' && (
                                                <div style={{ marginTop: '10px', padding: '15px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                                                    <h4 style={{ fontSize: '0.75rem', fontWeight: 950, marginBottom: '10px', color: '#F7941D', display: 'flex', alignItems: 'center', gap: '8px' }}><Receipt size={14}/> ITEMS</h4>
                                                    {(item.sale_items || []).map((si, idx) => (
                                                        <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #f1f5f9' }}>
                                                            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#1e293b' }}>{si.product_name || si.inventory?.name || si.name || 'Unnamed Item'} x{si.quantity}</span>
                                                            <span style={{ fontSize: '0.8rem', fontWeight: 900, color: '#1e293b' }}>Rs {si.price}</span>
                                                        </div>
                                                    ))}
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '10px', fontWeight: 900, color: '#F7941D' }}>
                                                        <span>TOTAL:</span>
                                                        <span>Rs {item.total?.toLocaleString()}</span>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        /* Desktop Table View */
                        <div style={{ background: 'white', borderRadius: '24px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                            <div style={{ overflowY: 'auto' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                                    <thead style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0', position: 'sticky', top: 0 }}>
                                        <tr>
                                            <th style={{ padding: '15px 25px', fontSize: '0.75rem', fontWeight: 800, color: '#64748b' }}>ITEM DETAILS</th>
                                            <th style={{ padding: '15px 25px', fontSize: '0.75rem', fontWeight: 800, color: '#64748b' }}>DELETED ON</th>
                                            <th style={{ padding: '15px 25px', fontSize: '0.75rem', fontWeight: 800, color: '#64748b' }}>REMAINING</th>
                                            <th style={{ padding: '15px 25px', fontSize: '0.75rem', fontWeight: 800, color: '#64748b', textAlign: 'right' }}>ACTIONS</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredTrash.map(item => {
                                            const deletedDate = new Date(item.deleted_at);
                                            const expiryDate = new Date(deletedDate);
                                            expiryDate.setDate(expiryDate.getDate() + 30);
                                            const daysRemaining = Math.ceil((expiryDate - new Date()) / (1000 * 60 * 60 * 24));
                                            const isExpanded = expandedId === item.id;

                                            return (
                                                <React.Fragment key={item.id}>
                                                    <tr style={{ borderBottom: '1px solid #f1f5f9', cursor: 'pointer', background: isExpanded ? '#f0f9ff' : 'transparent' }} onClick={() => setExpandedId(isExpanded ? null : item.id)}>
                                                        <td style={{ padding: '15px 25px' }}>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                                                                <div style={{ padding: '10px', background: '#f1f5f9', borderRadius: '10px' }}>
                                                                    {activeTab === 'sales' ? <History size={20} color="#F7941D" /> : activeTab === 'inventory' ? <Box size={20} color="#F7941D" /> : activeTab === 'orders' ? <ShoppingCart size={20} color="#6366f1" /> : <Truck size={20} color="#F7941D" />}
                                                                </div>
                                                                <div>
                                                                    <p style={{ fontWeight: 900, color: '#1e293b' }}>{activeTab === 'sales' ? `Invoice #${item.id.toString().slice(-6).toUpperCase()}` : activeTab === 'orders' ? `Order #${item.id}` : item.name}</p>
                                                                    <p style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b' }}>{activeTab === 'sales' ? item.customer_name : activeTab === 'inventory' ? item.category : activeTab === 'orders' ? item.supplier : item.company}</p>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td style={{ padding: '15px 25px', fontSize: '0.85rem', fontWeight: 700, color: '#64748b' }}>{deletedDate.toLocaleDateString()}</td>
                                                        <td style={{ padding: '15px 25px' }}><span style={{ padding: '4px 12px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 800, background: daysRemaining < 7 ? '#fff1f1' : '#f0fdf4', color: daysRemaining < 7 ? '#ef4444' : '#F7941D' }}>{daysRemaining} Days</span></td>
                                                        <td style={{ padding: '15px 25px', textAlign: 'right' }}>
                                                            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                                                                <button onClick={(e) => { e.stopPropagation(); handleRestore(item.id); }} disabled={isActionLoading === item.id} style={{ padding: '8px 12px', background: '#FFF7E6', border: '1px solid #FFEFD0', color: '#F7941D', borderRadius: '8px', fontSize: '0.75rem', fontWeight: 800, cursor: 'pointer' }}>RESTORE</button>
                                                                <button onClick={(e) => { e.stopPropagation(); handlePermanentDelete(item.id); }} disabled={isActionLoading === item.id} style={{ padding: '8px 12px', background: '#fff1f1', border: '1px solid #fee2e2', color: '#ef4444', borderRadius: '8px', fontSize: '0.75rem', fontWeight: 800, cursor: 'pointer' }}>DELETE</button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                    {isExpanded && activeTab === 'sales' && (
                                                        <tr>
                                                            <td colSpan="4" style={{ padding: '20px 25px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                                                                <div style={{ background: 'white', borderRadius: '12px', padding: '15px', border: '1px solid #e2e8f0' }}>
                                                                    <h4 style={{ fontSize: '0.8rem', fontWeight: 950, marginBottom: '10px', color: '#F7941D', display: 'flex', alignItems: 'center', gap: '8px' }}><Receipt size={16}/> INVOICE ITEMS</h4>
                                                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: '15px', borderBottom: '2px solid #f1f5f9', paddingBottom: '8px', marginBottom: '8px' }}>
                                                                        <span style={{ fontSize: '0.7rem', fontWeight: 900, color: '#94a3b8' }}>ITEM</span>
                                                                        <span style={{ fontSize: '0.7rem', fontWeight: 900, color: '#94a3b8' }}>QTY</span>
                                                                        <span style={{ fontSize: '0.7rem', fontWeight: 900, color: '#94a3b8', textAlign: 'right' }}>PRICE</span>
                                                                    </div>
                                                                    {(item.sale_items || []).map((si, idx) => (
                                                                        <div key={idx} style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: '15px', padding: '8px 0', borderBottom: '1px solid #f1f5f9' }}>
                                                                            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#1e293b' }}>{si.product_name || si.inventory?.name || si.name || 'Unnamed Item'}</span>
                                                                            <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#64748b' }}>x{si.quantity}</span>
                                                                            <span style={{ fontSize: '0.85rem', fontWeight: 900, color: '#1e293b' }}>Rs {si.price}</span>
                                                                        </div>
                                                                    ))}
                                                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '15px', paddingTop: '10px', borderTop: '2px solid #f1f5f9' }}>
                                                                        <span style={{ fontWeight: 800, color: '#64748b' }}>TOTAL AMOUNT:</span>
                                                                        <span style={{ fontWeight: 950, color: '#F7941D', fontSize: '1.1rem' }}>Rs {item.total?.toLocaleString()}</span>
                                                                    </div>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    )}
                                                </React.Fragment>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )
                ) : (
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', padding: '50px' }}>
                        <CheckCircle2 size={40} color="#cbd5e1" style={{ marginBottom: '20px' }} />
                        <h3 style={{ fontWeight: 900, color: '#1e293b' }}>Trash is Empty</h3>
                        <p style={{ fontWeight: 600, fontSize: '0.85rem' }}>No deleted {activeTab} found.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Trash;
