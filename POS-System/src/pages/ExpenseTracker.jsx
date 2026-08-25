import React, { useState, useMemo } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { motion } from 'framer-motion';
import { 
    Wallet, 
    Plus, 
    Trash2, 
    Calendar, 
    DollarSign, 
    Filter,
    Search,
    ArrowDownRight,
    ArrowUpRight,
    TrendingDown,
    X,
    FileText
} from 'lucide-react';
import { addExpense, removeExpense } from '../store/slices/expensesSlice';
import { db } from '../database';
import toast from 'react-hot-toast';

const ExpenseTracker = () => {
    const dispatch = useDispatch();
    const { list } = useSelector(state => state.expenses);
    const { user } = useSelector(state => state.auth);
    
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [formData, setFormData] = useState({
        category: 'Utilities',
        amount: '',
        title: '',   // main expense name (DB column `title`, required)
        notes: ''    // optional extra note (DB column `notes`)
    });

    const categories = ['Utilities', 'Rent', 'Salary', 'Store Supplies', 'Marketing', 'Maintenance', 'Others'];

    const filteredExpenses = useMemo(() => {
        const term = searchTerm.toLowerCase();
        return list.filter(e =>
            (e.title || '').toLowerCase().includes(term) ||
            (e.notes || '').toLowerCase().includes(term) ||
            (e.category || '').toLowerCase().includes(term)
        );
    }, [list, searchTerm]);

    const stats = useMemo(() => {
        const total = list.reduce((acc, e) => acc + e.amount, 0);
        const thisMonth = list.filter(e => new Date(e.created_at).getMonth() === new Date().getMonth()).reduce((acc, e) => acc + e.amount, 0);
        const today = list.filter(e => new Date(e.created_at).toISOString().split('T')[0] === new Date().toISOString().split('T')[0]).reduce((acc, e) => acc + e.amount, 0);
        return { total, thisMonth, today };
    }, [list]);

    const handleAdd = async (e) => {
        e.preventDefault();
        // title + amount are required (title is NOT NULL in the DB — this was
        // the bug: expenses without a title silently failed to insert).
        if (!formData.amount || !formData.title.trim()) {
            toast.error('Please enter a title and amount');
            return;
        }

        const expense = {
            title: formData.title.trim(),
            category: formData.category,
            amount: parseFloat(formData.amount) || 0,
            notes: formData.notes.trim() || null,
            added_by: user?.name || 'System'
        };

        setIsSaving(true);
        try {
            // Return the inserted row so we get the real id + created_at, then
            // push it into Redux immediately — the list updates without a reload.
            const { data, error } = await db
                .from('expenses')
                .insert([expense])
                .select()
                .single();

            if (error) throw error;

            dispatch(addExpense(data));
            toast.success('Expense saved');
            setFormData({ category: 'Utilities', amount: '', title: '', notes: '' });
            setIsModalOpen(false);
        } catch (err) {
            console.error(err);
            toast.error('Failed to save expense: ' + (err.message || ''));
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Delete this expense record?")) return;
        try {
            const { error } = await db
                .from('expenses')
                .delete()
                .eq('id', id);

            if (error) throw error;
            dispatch(removeExpense(id)); // update UI immediately
            toast.success('Expense deleted');
        } catch (err) {
            console.error(err);
            toast.error('Delete failed');
        }
    };

    return (
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: '20px', padding: '25px', backgroundColor: '#f8fafc' }}>
            
            {/* HEADER */}
            <header style={{ 
                display: 'flex', 
                flexDirection: window.innerWidth <= 600 ? 'column' : 'row',
                justifyContent: 'space-between', 
                alignItems: window.innerWidth <= 600 ? 'stretch' : 'center', 
                background: 'white', 
                padding: window.innerWidth <= 480 ? '15px' : '20px 25px', 
                borderRadius: '16px', 
                border: '1px solid #e2e8f0', 
                boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)',
                gap: '15px'
            }}>
                <div>
                    <h2 style={{ fontSize: window.innerWidth <= 480 ? '1.2rem' : '1.6rem', fontWeight: 950, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <Wallet size={window.innerWidth <= 480 ? 24 : 28} color="#ef4444" /> EXPENSE TRACKER
                    </h2>
                    <p style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600, marginTop: '5px' }}>Manage store overheads and daily operational costs.</p>
                </div>
                <button 
                    onClick={() => setIsModalOpen(true)}
                    style={{ background: '#0f172a', color: 'white', border: 'none', padding: '12px 20px', borderRadius: '10px', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                >
                    <Plus size={18} /> LOG NEW EXPENSE
                </button>
            </header>

            {/* STATS CARDS */}
            <div style={{ 
                display: 'grid', 
                gridTemplateColumns: window.innerWidth <= 480 ? '1fr' : window.innerWidth <= 900 ? '1fr 1fr' : 'repeat(3, 1fr)', 
                gap: '15px' 
            }}>
                <div style={{ background: 'white', padding: '20px', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
                    <p style={{ fontSize: '0.65rem', fontWeight: 800, color: '#64748b', marginBottom: '5px' }}>TODAY'S OUTFLOW</p>
                    <h3 style={{ fontSize: '1.3rem', fontWeight: 950, color: '#ef4444' }}>Rs {stats.today.toLocaleString()}</h3>
                </div>
                <div style={{ background: 'white', padding: '20px', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
                    <p style={{ fontSize: '0.65rem', fontWeight: 800, color: '#64748b', marginBottom: '5px' }}>MONTHLY TOTAL</p>
                    <h3 style={{ fontSize: '1.3rem', fontWeight: 950, color: '#1e293b' }}>Rs {stats.thisMonth.toLocaleString()}</h3>
                </div>
                <div style={{ background: '#0f172a', padding: '20px', borderRadius: '16px', color: 'white', gridColumn: window.innerWidth <= 900 && window.innerWidth > 480 ? 'span 2' : 'auto' }}>
                    <p style={{ fontSize: '0.65rem', fontWeight: 800, color: '#94a3b8', marginBottom: '5px' }}>CUMULATIVE EXPENSES</p>
                    <h3 style={{ fontSize: '1.3rem', fontWeight: 950, color: '#FFB84D' }}>Rs {stats.total.toLocaleString()}</h3>
                </div>
            </div>

            {/* SEARCH & FILTERS */}
            <div style={{ background: 'white', padding: '15px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                <div style={{ position: 'relative' }}>
                    <Search size={18} style={{ position: 'absolute', left: '15px', top: '12px', color: '#64748b' }} />
                    <input 
                        type="text" 
                        placeholder="Search by description or category..." 
                        style={{ width: '100%', padding: '12px 15px 12px 45px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.9rem', fontWeight: 600 }}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            {/* EXPENSE TABLE */}
            <div style={{ flex: 1, background: 'white', borderRadius: '16px', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column' }}>
                <div style={{ overflowX: 'auto', flex: 1 }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '800px' }}>
                        <thead style={{ position: 'sticky', top: 0, background: '#f8fafc', zIndex: 10 }}>
                            <tr style={{ borderBottom: '2px solid #e2e8f0' }}>
                                <th style={{ padding: '15px 20px', textAlign: 'left', fontSize: '0.75rem', fontWeight: 900, color: '#64748b' }}>DATE</th>
                                <th style={{ padding: '15px 20px', textAlign: 'left', fontSize: '0.75rem', fontWeight: 900, color: '#64748b' }}>CATEGORY</th>
                                <th style={{ padding: '15px 20px', textAlign: 'left', fontSize: '0.75rem', fontWeight: 900, color: '#64748b' }}>DESCRIPTION</th>
                                <th style={{ padding: '15px 20px', textAlign: 'left', fontSize: '0.75rem', fontWeight: 900, color: '#64748b' }}>OPERATOR</th>
                                <th style={{ padding: '15px 20px', textAlign: 'right', fontSize: '0.75rem', fontWeight: 900, color: '#64748b' }}>AMOUNT</th>
                                <th style={{ padding: '15px 20px', textAlign: 'right', fontSize: '0.75rem', fontWeight: 900, color: '#64748b' }}>ACTION</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredExpenses.map((expense, idx) => (
                                <motion.tr 
                                    key={expense.id}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: idx * 0.03 }}
                                    style={{ borderBottom: '1px solid #f1f5f9' }}
                                >
                                    <td style={{ padding: '15px 20px', fontSize: '0.8rem', fontWeight: 700, color: '#475569' }}>
                                        {new Date(expense.created_at).toLocaleDateString()}
                                    </td>
                                    <td style={{ padding: '15px 20px' }}>
                                        <span style={{ 
                                            fontSize: '0.65rem', 
                                            fontWeight: 900, 
                                            padding: '4px 10px', 
                                            borderRadius: '20px',
                                            background: '#f1f5f9',
                                            color: '#1e293b',
                                            textTransform: 'uppercase'
                                        }}>
                                            {expense.category}
                                        </span>
                                    </td>
                                    <td style={{ padding: '15px 20px', fontSize: '0.8rem', fontWeight: 800, color: '#1e293b' }}>
                                        {expense.title}
                                        {expense.notes && (
                                            <span style={{ display: 'block', fontSize: '0.7rem', fontWeight: 600, color: '#94a3b8', marginTop: '2px' }}>
                                                {expense.notes}
                                            </span>
                                        )}
                                    </td>
                                    <td style={{ padding: '15px 20px', fontSize: '0.75rem', fontWeight: 700, color: '#64748b' }}>
                                        {expense.added_by?.toUpperCase() || 'SYSTEM'}
                                    </td>
                                    <td style={{ padding: '15px 20px', textAlign: 'right', fontWeight: 950, color: '#ef4444', fontSize: '0.9rem' }}>
                                        - Rs {expense.amount.toLocaleString()}
                                    </td>
                                    <td style={{ padding: '15px 20px', textAlign: 'right' }}>
                                        <button onClick={() => handleDelete(expense.id)} style={{ background: 'none', border: 'none', color: '#cbd5e1', cursor: 'pointer' }}>
                                            <Trash2 size={16} />
                                        </button>
                                    </td>
                                </motion.tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* ADD EXPENSE MODAL */}
            {isModalOpen && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1000, display: 'flex', alignItems: window.innerWidth <= 480 ? 'flex-end' : 'center', justifyContent: 'center' }}>
                    <div style={{ 
                        background: 'white', 
                        width: window.innerWidth <= 480 ? '100%' : '450px', 
                        maxHeight: window.innerWidth <= 480 ? '90vh' : 'auto',
                        borderRadius: window.innerWidth <= 480 ? '24px 24px 0 0' : '16px', 
                        overflow: 'hidden' 
                    }}>
                        <div style={{ background: '#0f172a', padding: '20px', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h3 style={{ fontWeight: 900, fontSize: '1rem' }}>LOG NEW EXPENSE</h3>
                            <button onClick={() => setIsModalOpen(false)} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}><X size={24} /></button>
                        </div>
                        <form onSubmit={handleAdd} style={{ padding: '25px', display: 'flex', flexDirection: 'column', gap: '20px', overflowY: 'auto' }}>
                            <div>
                                <label style={{ fontSize: '0.7rem', fontWeight: 900, color: '#64748b', display: 'block', marginBottom: '8px' }}>EXPENSE CATEGORY</label>
                                <select 
                                    style={{ width: '100%', padding: '12px', border: '2px solid #e2e8f0', borderRadius: '10px', fontSize: '0.9rem', fontWeight: 700 }}
                                    value={formData.category}
                                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                >
                                    {categories.map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                            </div>
                            <div>
                                <label style={{ fontSize: '0.7rem', fontWeight: 900, color: '#64748b', display: 'block', marginBottom: '8px' }}>EXPENSE TITLE *</label>
                                <input
                                    type="text"
                                    placeholder="e.g. Electricity Bill"
                                    style={{ width: '100%', padding: '12px', border: '2px solid #e2e8f0', borderRadius: '10px', fontSize: '0.9rem', fontWeight: 700 }}
                                    value={formData.title}
                                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                />
                            </div>
                            <div>
                                <label style={{ fontSize: '0.7rem', fontWeight: 900, color: '#64748b', display: 'block', marginBottom: '8px' }}>AMOUNT (Rs) *</label>
                                <input
                                    type="number"
                                    placeholder="0.00"
                                    style={{ width: '100%', padding: '12px', border: '2px solid #e2e8f0', borderRadius: '10px', fontSize: '1.2rem', fontWeight: 950, color: '#ef4444' }}
                                    value={formData.amount}
                                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                                />
                            </div>
                            <div>
                                <label style={{ fontSize: '0.7rem', fontWeight: 900, color: '#64748b', display: 'block', marginBottom: '8px' }}>NOTES (OPTIONAL)</label>
                                <textarea
                                    placeholder="e.g. March month, meter #1234"
                                    style={{ width: '100%', padding: '12px', border: '2px solid #e2e8f0', borderRadius: '10px', fontSize: '0.9rem', fontWeight: 700, minHeight: '80px' }}
                                    value={formData.notes}
                                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                />
                            </div>
                            <button type="submit" disabled={isSaving} style={{ width: '100%', padding: '15px', background: '#0f172a', color: 'white', border: 'none', borderRadius: '10px', fontWeight: 900, fontSize: '1rem', cursor: isSaving ? 'not-allowed' : 'pointer', opacity: isSaving ? 0.7 : 1 }}>
                                {isSaving ? 'SAVING…' : 'SAVE EXPENSE ENTRY'}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ExpenseTracker;
