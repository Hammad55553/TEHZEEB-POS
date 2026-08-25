import React, { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { motion } from 'framer-motion';
import { 
    BookOpen, 
    Plus, 
    CheckCircle, 
    Trash2, 
    Clock, 
    Search, 
    AlertCircle,
    ShoppingCart,
    MoreVertical,
    X
} from 'lucide-react';
import { addToShortage, removeFromShortage, updateShortageStatus, setShortageItems } from '../store/slices/shortageSlice';
import { db } from '../database';
import toast from 'react-hot-toast';

const ShortageBook = () => {
    const dispatch = useDispatch();
    const { items } = useSelector(state => state.shortage);
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [newItemName, setNewItemName] = useState('');

    const filteredItems = items.filter(i => 
        i.name.toLowerCase().includes(searchTerm.toLowerCase())
    ).sort((a, b) => (b.demand_count || 0) - (a.demand_count || 0));

    const handleAddManual = async (e) => {
        e.preventDefault();
        const name = newItemName.trim();
        if (!name) return;

        // If this medicine is already in the book, bump its demand_count
        // instead of creating a duplicate entry.
        const existing = items.find(i => (i.name || '').toLowerCase() === name.toLowerCase());

        try {
            if (existing) {
                const newCount = (existing.demand_count || 1) + 1;
                const { data, error } = await db
                    .from('shortage')
                    .update({ demand_count: newCount, status: 'pending' })
                    .eq('id', existing.id)
                    .select()
                    .single();
                if (error) throw error;
                dispatch(updateShortageStatus({ id: existing.id, status: 'pending' }));
                dispatch(setShortageItems(items.map(i => i.id === existing.id ? (data || { ...i, demand_count: newCount }) : i)));
                toast.success('Demand increased');
            } else {
                const { data, error } = await db
                    .from('shortage')
                    .insert([{ name, demand_count: 1, status: 'pending', notes: '' }])
                    .select()
                    .single();
                if (error) throw error;
                dispatch(addToShortage(data));
                toast.success('Added to Shortage Book');
            }
            setNewItemName('');
            setIsModalOpen(false);
        } catch (err) {
            console.error(err);
            toast.error('Failed to add demand: ' + (err.message || ''));
        }
    };

    const handleStatusChange = async (id, status) => {
        try {
            const { error } = await db
                .from('shortage')
                .update({ status })
                .eq('id', id);

            if (error) throw error;
            dispatch(updateShortageStatus({ id, status })); // reflect immediately
            toast.success(`Marked as ${status}`);
        } catch (err) {
            console.error(err);
            toast.error('Status update failed');
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Remove this entry?")) return;
        try {
            const { error } = await db
                .from('shortage')
                .delete()
                .eq('id', id);

            if (error) throw error;
            dispatch(removeFromShortage(id)); // reflect immediately
            toast.success('Entry removed');
        } catch (err) {
            console.error(err);
            toast.error('Delete failed');
        }
    };

    return (
        <div style={{ 
            height: '100%', 
            display: 'flex', 
            flexDirection: 'column', 
            gap: window.innerWidth <= 480 ? '15px' : '20px', 
            padding: window.innerWidth <= 480 ? '15px' : '25px', 
            backgroundColor: '#f4f7fa',
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
                        <div style={{ background: '#e0e7ff', padding: '8px', borderRadius: '10px' }}>
                            <BookOpen size={window.innerWidth <= 480 ? 20 : 24} color="#6366f1" />
                        </div>
                        SHORTAGE BOOK
                    </h2>
                    <p style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600, marginTop: '2px' }}>Track out-of-stock items and customer demands.</p>
                </div>
                <button 
                    onClick={() => setIsModalOpen(true)}
                    style={{ 
                        background: '#6366f1', 
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
                    <Plus size={18} /> NEW DEMAND
                </button>
            </header>

            {/* SEARCH */}
            <div style={{ 
                background: 'white', 
                padding: window.innerWidth <= 480 ? '12px' : '15px', 
                borderRadius: '12px', 
                border: '1px solid #e2e8f0' 
            }}>
                <div style={{ position: 'relative' }}>
                    <Search size={18} style={{ position: 'absolute', left: '15px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
                    <input 
                        type="text" 
                        placeholder="Search requested items..." 
                        style={{ 
                            width: '100%', 
                            padding: '12px 15px 12px 45px', 
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

            {/* LIST */}
            <div style={{ 
                flex: 1, 
                overflowY: 'auto', 
                display: 'grid', 
                gridTemplateColumns: window.innerWidth <= 640 ? '1fr' : 'repeat(auto-fill, minmax(320px, 1fr))', 
                gap: '20px',
                paddingBottom: '20px'
            }}>
                {filteredItems.map((item, idx) => (
                    <motion.div 
                        key={item.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.05 }}
                        style={{ 
                            background: 'white', 
                            padding: window.innerWidth <= 480 ? '15px' : '20px', 
                            borderRadius: '16px', 
                            border: '1px solid #e2e8f0', 
                            boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)',
                            position: 'relative',
                            display: 'flex',
                            flexDirection: 'column'
                        }}
                    >
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px', alignItems: 'center' }}>
                            <span style={{ 
                                fontSize: '0.6rem', 
                                fontWeight: 900, 
                                padding: '4px 10px', 
                                background: item.status === 'resolved' ? '#FFF7E6' : item.status === 'ordered' ? '#FFF7E6' : '#fff7ed', 
                                color: item.status === 'resolved' ? '#F7941D' : item.status === 'ordered' ? '#F7941D' : '#c2410c',
                                borderRadius: '20px',
                                textTransform: 'uppercase',
                                letterSpacing: '0.5px'
                            }}>
                                {item.status}
                            </span>
                            <button 
                                onClick={() => handleDelete(item.id)} 
                                style={{ background: '#f8fafc', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '6px', borderRadius: '8px' }}
                            >
                                <Trash2 size={14} />
                            </button>
                        </div>

                        <h3 style={{ fontSize: '1.1rem', fontWeight: 900, color: '#1e293b', marginBottom: '12px', lineHeight: 1.3 }}>{item.name}</h3>
                        
                        <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
                            <div style={{ background: '#f8fafc', padding: '10px', borderRadius: '10px', flex: 1 }}>
                                <p style={{ fontSize: '0.55rem', color: '#64748b', fontWeight: 800 }}>DEMAND</p>
                                <p style={{ fontSize: '0.95rem', fontWeight: 950, color: '#6366f1' }}>{item.demand_count || 1} <span style={{ fontSize: '0.7rem' }}>x</span></p>
                            </div>
                            <div style={{ background: '#f8fafc', padding: '10px', borderRadius: '10px', flex: 1 }}>
                                <p style={{ fontSize: '0.55rem', color: '#64748b', fontWeight: 800 }}>DATE</p>
                                <p style={{ fontSize: '0.8rem', fontWeight: 800, color: '#475569' }}>{new Date(item.created_at).toLocaleDateString()}</p>
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: '8px', marginTop: 'auto' }}>
                            {item.status === 'pending' && (
                                <button 
                                    onClick={() => handleStatusChange(item.id, 'ordered')}
                                    style={{ flex: 1, padding: '10px', background: '#FFF7E6', color: '#F7941D', border: 'none', borderRadius: '10px', fontWeight: 800, fontSize: '0.7rem', cursor: 'pointer' }}
                                >
                                    MARK ORDERED
                                </button>
                            )}
                            {item.status !== 'resolved' && (
                                <button 
                                    onClick={() => handleStatusChange(item.id, 'resolved')}
                                    style={{ flex: 1, padding: '10px', background: '#FFF7E6', color: '#F7941D', border: 'none', borderRadius: '10px', fontWeight: 800, fontSize: '0.7rem', cursor: 'pointer' }}
                                >
                                    RESOLVED
                                </button>
                            )}
                        </div>
                    </motion.div>
                ))}
            </div>

            {/* MANUAL ADD MODAL */}
            {isModalOpen && (
                <div style={{ 
                    position: 'fixed', 
                    inset: 0, 
                    background: 'rgba(15, 23, 42, 0.7)', 
                    backdropFilter: 'blur(4px)',
                    zIndex: 1000, 
                    display: 'flex', 
                    alignItems: window.innerWidth <= 480 ? 'flex-end' : 'center', 
                    justifyContent: 'center',
                    padding: window.innerWidth <= 480 ? '0' : '20px'
                }}>
                    <motion.div 
                        initial={{ y: 50, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        style={{ 
                            background: 'white', 
                            width: '100%', 
                            maxWidth: '450px', 
                            borderRadius: window.innerWidth <= 480 ? '24px 24px 0 0' : '16px', 
                            overflow: 'hidden',
                            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
                        }}
                    >
                        <div style={{ background: '#6366f1', padding: '20px', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h3 style={{ fontWeight: 900, fontSize: '1rem' }}>NEW DEMAND ENTRY</h3>
                            <button onClick={() => setIsModalOpen(false)} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: 'white', cursor: 'pointer', padding: '5px', borderRadius: '8px' }}><X size={20} /></button>
                        </div>
                        <form onSubmit={handleAddManual} style={{ padding: '25px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            <div>
                                <label style={{ fontSize: '0.7rem', fontWeight: 900, color: '#64748b', display: 'block', marginBottom: '8px' }}>PRODUCT NAME / DESCRIPTION</label>
                                <input 
                                    autoFocus
                                    placeholder="e.g. Panadol 500mg (10 strips)..." 
                                    style={{ 
                                        width: '100%', 
                                        padding: '15px', 
                                        border: '1px solid #e2e8f0', 
                                        borderRadius: '12px', 
                                        fontSize: '1rem', 
                                        fontWeight: 700,
                                        outline: 'none',
                                        background: '#f8fafc'
                                    }}
                                    value={newItemName}
                                    onChange={(e) => setNewItemName(e.target.value)}
                                />
                            </div>
                            <button 
                                type="submit" 
                                style={{ 
                                    width: '100%', 
                                    padding: '15px', 
                                    background: '#6366f1', 
                                    color: 'white', 
                                    border: 'none', 
                                    borderRadius: '12px', 
                                    fontWeight: 900, 
                                    fontSize: '1rem', 
                                    cursor: 'pointer',
                                    boxShadow: '0 10px 15px -3px rgba(99, 102, 241, 0.3)'
                                }}
                            >
                                ADD TO SHORTAGE BOOK
                            </button>
                            {window.innerWidth <= 480 && <div style={{ height: '20px' }} />}
                        </form>
                    </motion.div>
                </div>
            )}
        </div>
    );
};

export default ShortageBook;
