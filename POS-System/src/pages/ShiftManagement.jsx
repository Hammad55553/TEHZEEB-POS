import React, { useState, useMemo } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { 
    Play, 
    Square, 
    History as HistoryIcon, 
    Timer, 
    User, 
    Wallet, 
    Activity, 
    ArrowRightCircle, 
    Trash2,
    Calendar,
    Clock,
    DollarSign,
    TrendingUp,
    TrendingDown,
    ShieldCheck,
    AlertCircle,
    ChevronRight,
    Search
} from 'lucide-react';
import { startShift, endShift, updateShiftStats, deleteShift } from '../store/slices/shiftSlice';
import toast from 'react-hot-toast';
import { db } from '../database';

const ShiftManagement = () => {
    const dispatch = useDispatch();
    const { activeShift, history } = useSelector(state => state.shift);
    const { user } = useSelector(state => state.auth);
    const isAdmin = user?.role === 'admin';
    const [openingCash, setOpeningCash] = useState('');
    const [closingCash, setClosingCash] = useState('');
    const [searchTerm, setSearchTerm] = useState('');

    const handleStart = async (e) => {
        e.preventDefault();

        // Guard: never open a second active shift for the same operator.
        // Check the DB (source of truth), not just local state.
        const { data: existing } = await db
            .from('shifts')
            .select('id')
            .eq('staff_id', user?.uid || user?.id)
            .eq('status', 'active')
            .limit(1);

        if (existing && existing.length > 0) {
            toast.error('You already have an active shift. Close it before starting a new one.');
            return;
        }

        const staffName = user?.name || 'Authorized Operator';
        const shiftData = {
            staff_name: staffName,
            staff_id: user?.uid || user?.id,
            opening_cash: parseFloat(openingCash) || 0,
            start_time: new Date().toISOString(),
            sales: 0,
            expenses: 0,
            status: 'active'
        };

        try {
            const { data, error } = await db
                .from('shifts')
                .insert([shiftData])
                .select();
            
            if (error) throw error;
            dispatch(startShift({ ...shiftData, id: data[0].id }));
            toast.success('Terminal Session Started');
        } catch (err) {
            console.error(err);
            toast.error("Failed to start shift");
        }
    };

    const handleEnd = async (e) => {
        e.preventDefault();
        const finalClosingCash = parseFloat(closingCash) || 0;
        
        try {
            const { error } = await db
                .from('shifts')
                .update({
                    closing_cash: finalClosingCash,
                    end_time: new Date().toISOString(),
                    status: 'closed'
                })
                .eq('id', activeShift.id);
            
            if (error) throw error;
            
            dispatch(endShift({ closingCash: finalClosingCash }));
            toast.success('Shift closed successfully');
        } catch (err) {
            console.error(err);
            toast.error("Failed to close shift");
        }
    };

    const handleDeleteShift = async (id) => {
        if (!isAdmin) return;
        if (window.confirm('Are you sure you want to PERMANENTLY delete this shift record?')) {
            try {
                const { error } = await db
                    .from('shifts')
                    .delete()
                    .eq('id', id);
                
                if (error) throw error;
                dispatch(deleteShift(id));
                toast.success('Shift record deleted');
            } catch (err) {
                console.error(err);
                toast.error("Delete failed");
            }
        }
    };

    const filteredHistory = useMemo(() => {
        if (!searchTerm) return history;
        return history.filter(s => 
            s.staff_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            s.id.toString().includes(searchTerm)
        );
    }, [history, searchTerm]);

    return (
        <div style={{ height: '100%', backgroundColor: '#f1f5f9', overflowY: 'auto', padding: window.innerWidth <= 768 ? '15px' : '30px' }}>
            <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
                
                {/* MODERN HEADER */}
                <header style={{ display: 'flex', flexDirection: window.innerWidth <= 768 ? 'column' : 'row', justifyContent: 'space-between', alignItems: window.innerWidth <= 768 ? 'flex-start' : 'center', marginBottom: '30px', gap: '20px' }}>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                            <div style={{ padding: '10px', background: '#6366f1', borderRadius: '12px', color: 'white' }}>
                                <Activity size={24} />
                            </div>
                            <h1 style={{ fontSize: window.innerWidth <= 480 ? '1.5rem' : '1.8rem', fontWeight: 900, color: '#1e293b', letterSpacing: '-0.5px' }}>Terminal Operations</h1>
                        </div>
                        <p style={{ color: '#64748b', fontWeight: 600, fontSize: '0.9rem' }}>Control shift sessions, track live production, and audit logs.</p>
                    </div>

                    <div style={{ display: 'flex', gap: '12px' }}>
                        <div style={{ background: 'white', padding: '10px 20px', borderRadius: '14px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '10px', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                            <Calendar size={18} color="#6366f1" />
                            <span style={{ fontWeight: 800, color: '#1e293b', fontSize: '0.9rem' }}>{new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                        </div>
                        {activeShift && (
                            <div style={{ background: '#FDF3D0', padding: '10px 20px', borderRadius: '14px', border: '1px solid #bbf7d0', display: 'flex', alignItems: 'center', gap: '10px', color: '#166534' }}>
                                <div style={{ width: '8px', height: '8px', background: '#FF7A00', borderRadius: '50%', animation: 'pulse 1.5s infinite' }}></div>
                                <span style={{ fontWeight: 900, fontSize: '0.8rem' }}>SESSION ACTIVE</span>
                            </div>
                        )}
                    </div>
                </header>

                <div style={{ display: 'grid', gridTemplateColumns: window.innerWidth <= 1024 ? '1fr' : '1fr 450px', gap: '30px' }}>
                    
                    {/* LEFT SECTION: ACTIVE STATUS & ACTIONS */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
                        
                        {!activeShift ? (
                            /* OFFLINE VIEW */
                            <div style={{ background: 'white', borderRadius: '24px', padding: window.innerWidth <= 480 ? '30px 20px' : '60px', border: '1px solid #e2e8f0', textAlign: 'center', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.05)' }}>
                                <div style={{ width: '100px', height: '100px', background: '#f8fafc', borderRadius: '30px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 25px', border: '1px solid #f1f5f9' }}>
                                    <ShieldCheck size={48} color="#6366f1" />
                                </div>
                                <h2 style={{ fontSize: '1.8rem', fontWeight: 950, color: '#1e293b', marginBottom: '15px' }}>Terminal Restricted</h2>
                                <p style={{ color: '#64748b', fontSize: '1rem', fontWeight: 600, maxWidth: '500px', margin: '0 auto 40px', lineHeight: 1.6 }}>
                                    Your terminal is currently locked. To start processing sales and accessing inventory, please initiate a new shift session.
                                </p>

                                <form onSubmit={handleStart} style={{ maxWidth: '450px', margin: '0 auto', background: '#f8fafc', padding: '35px', borderRadius: '24px', border: '1px solid #e2e8f0' }}>
                                    <div style={{ marginBottom: '25px' }}>
                                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 900, color: '#64748b', marginBottom: '12px', textAlign: 'left', letterSpacing: '1px' }}>OPENING CASH BALANCE</label>
                                        <div style={{ position: 'relative' }}>
                                            <span style={{ position: 'absolute', left: '20px', top: '50%', transform: 'translateY(-50%)', fontWeight: 900, color: '#1e293b', fontSize: '1.2rem' }}>Rs</span>
                                            <input 
                                                type="number"
                                                required
                                                autoFocus
                                                placeholder="0.00"
                                                style={{ width: '100%', padding: '15px 15px 15px 50px', fontSize: '1.5rem', fontWeight: 950, borderRadius: '14px', border: '2px solid #e2e8f0', outline: 'none', transition: 'all 0.2s', color: '#1e293b' }}
                                                value={openingCash}
                                                onChange={e => setOpeningCash(e.target.value)}
                                            />
                                        </div>
                                    </div>
                                    <button type="submit" style={{ width: '100%', padding: '18px', background: '#6366f1', color: 'white', border: 'none', borderRadius: '14px', fontSize: '1.1rem', fontWeight: 900, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', boxShadow: '0 4px 6px rgba(99, 102, 241, 0.2)' }}>
                                        <Play size={22} fill="currentColor" /> UNLOCK TERMINAL
                                    </button>
                                </form>
                            </div>
                        ) : (
                            /* ONLINE VIEW: LIVE MONITOR */
                            <>
                                {/* STATS GRID */}
                                <div style={{ display: 'grid', gridTemplateColumns: window.innerWidth <= 550 ? '1fr' : 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px' }}>
                                    {[
                                        { label: 'SESSION START', value: new Date(activeShift.start_time || activeShift.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), icon: Clock, color: '#6366f1', bg: '#eef2ff' },
                                        { label: 'OPENING CASH', value: `Rs ${(activeShift.opening_cash || activeShift.openingCash || 0).toLocaleString()}`, icon: Wallet, color: '#FF8A1E', bg: '#FFF7E6' },
                                        { label: 'CURRENT SALES', value: `Rs ${(activeShift.sales || 0).toLocaleString()}`, icon: TrendingUp, color: '#FF8A1E', bg: '#f0fdf4' },
                                        { label: 'EXPENSES', value: `Rs ${(activeShift.expenses || 0).toLocaleString()}`, icon: TrendingDown, color: '#ef4444', bg: '#fef2f2' }
                                    ].map((stat, i) => (
                                        <div key={i} style={{ background: 'white', padding: '25px', borderRadius: '24px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '15px', position: 'relative', overflow: 'hidden' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <div style={{ padding: '10px', background: stat.bg, borderRadius: '12px', color: stat.color }}>
                                                    <stat.icon size={22} />
                                                </div>
                                            </div>
                                            <div>
                                                <p style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748b', marginBottom: '5px' }}>{stat.label}</p>
                                                <h3 style={{ fontSize: '1.5rem', fontWeight: 950, color: '#1e293b' }}>{stat.value}</h3>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {/* TERMINATION FORM */}
                                <div style={{ background: 'white', borderRadius: '24px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                                    <div style={{ padding: '20px 25px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <h3 style={{ fontSize: '1rem', fontWeight: 900, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                            <AlertCircle size={20} color="#ef4444" /> Shift Termination
                                        </h3>
                                        <span style={{ fontSize: '0.7rem', fontWeight: 900, color: '#ef4444', background: '#fee2e2', padding: '4px 12px', borderRadius: '50px' }}>CRITICAL STEP</span>
                                    </div>
                                    <div style={{ padding: '30px' }}>
                                        <form onSubmit={handleEnd} style={{ display: 'flex', flexDirection: window.innerWidth <= 768 ? 'column' : 'row', gap: '20px', alignItems: 'flex-end' }}>
                                            <div style={{ flex: 1, width: '100%' }}>
                                                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, color: '#64748b', marginBottom: '10px' }}>PHYSICAL CASH COUNT (Rs)</label>
                                                <input 
                                                    type="number"
                                                    required
                                                    placeholder="Enter exact counter cash..."
                                                    style={{ width: '100%', padding: '15px', fontSize: '1.2rem', fontWeight: 800, borderRadius: '14px', border: '2px solid #fee2e2', background: '#fff5f5' }}
                                                    value={closingCash}
                                                    onChange={e => setClosingCash(e.target.value)}
                                                />
                                            </div>
                                            <button type="submit" style={{ height: '58px', padding: '0 30px', background: '#dc2626', color: 'white', border: 'none', borderRadius: '14px', fontWeight: 900, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px', boxShadow: '0 4px 6px rgba(220, 38, 38, 0.2)' }}>
                                                <Square size={20} fill="currentColor" /> END SESSION
                                            </button>
                                        </form>
                                    </div>
                                </div>
                            </>
                        )}

                        {/* EXPENSE RECORDING */}
                        {activeShift && (
                            <div style={{ background: 'white', borderRadius: '24px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                                <div style={{ padding: '20px 25px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                                    <h3 style={{ fontSize: '1rem', fontWeight: 900, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        <DollarSign size={20} color="#6366f1" /> Cash Outflow (Expense)
                                    </h3>
                                </div>
                                <div style={{ padding: '30px' }}>
                                    <div style={{ display: 'grid', gridTemplateColumns: window.innerWidth <= 600 ? '1fr' : '150px 1fr auto', gap: '15px' }}>
                                        <input type="number" id="expAmount" placeholder="Amount" style={{ width: '100%', padding: '12px 15px', borderRadius: '12px', border: '1px solid #e2e8f0', fontWeight: 800 }} />
                                        <input type="text" id="expNote" placeholder="Expense Reason (e.g. Utility, Tea, Transport)" style={{ width: '100%', padding: '12px 15px', borderRadius: '12px', border: '1px solid #e2e8f0', fontWeight: 600 }} />
                                        <button 
                                            onClick={async () => {
                                                const amt = parseFloat(document.getElementById('expAmount').value);
                                                const note = document.getElementById('expNote').value;
                                                if (!amt || !note) return;
                                                dispatch(updateShiftStats({ expense: amt }));
                                                try {
                                                    await db.from('shifts').update({ expenses: (activeShift.expenses || 0) + amt }).eq('id', activeShift.id);
                                                    toast.success('Expense Recorded');
                                                } catch (err) { toast.error("Sync Failed"); }
                                                document.getElementById('expAmount').value = '';
                                                document.getElementById('expNote').value = '';
                                            }}
                                            style={{ padding: '0 25px', height: '48px', background: '#6366f1', color: 'white', border: 'none', borderRadius: '12px', fontWeight: 900, cursor: 'pointer' }}
                                        >
                                            RECORD
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* RIGHT SECTION: SHIFT HISTORY */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        <div style={{ background: 'white', borderRadius: '24px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
                            <div style={{ padding: '25px', borderBottom: '1px solid #e2e8f0' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                                    <h3 style={{ fontSize: '1.1rem', fontWeight: 950, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        <HistoryIcon size={22} color="#6366f1" /> Session Audit
                                    </h3>
                                    <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#6366f1', background: '#eef2ff', padding: '4px 10px', borderRadius: '50px' }}>{history.length} LOGS</span>
                                </div>
                                <div style={{ position: 'relative' }}>
                                    <Search size={16} style={{ position: 'absolute', left: '12px', top: '12px', color: '#94a3b8' }} />
                                    <input 
                                        type="text" 
                                        placeholder="Search by staff or ID..."
                                        style={{ width: '100%', padding: '10px 15px 10px 40px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', fontSize: '0.85rem' }}
                                        value={searchTerm}
                                        onChange={e => setSearchTerm(e.target.value)}
                                    />
                                </div>
                            </div>

                            <div style={{ flex: 1, overflowY: 'auto', padding: '15px' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                    {filteredHistory.map(s => (
                                        <div key={s.id} style={{ padding: '15px', borderRadius: '16px', border: '1px solid #f1f5f9', background: '#fff', transition: 'all 0.2s', position: 'relative' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                    <div style={{ width: '32px', height: '32px', background: '#f8fafc', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: 900, color: '#6366f1', border: '1px solid #e2e8f0' }}>
                                                        {s.staff_name?.charAt(0) || 'U'}
                                                    </div>
                                                    <div>
                                                        <p style={{ fontSize: '0.85rem', fontWeight: 800, color: '#1e293b' }}>{s.staff_name || 'System User'}</p>
                                                        <p style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 600 }}>{new Date(s.start_time || s.startTime).toLocaleDateString()}</p>
                                                    </div>
                                                </div>
                                                <div style={{ textAlign: 'right' }}>
                                                    <p style={{ fontSize: '0.9rem', fontWeight: 950, color: '#F7941D' }}>Rs {s.sales?.toLocaleString()}</p>
                                                    <p style={{ fontSize: '0.65rem', fontWeight: 700, color: '#94a3b8' }}>TOTAL VOL.</p>
                                                </div>
                                            </div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: '#f8fafc', borderRadius: '10px', fontSize: '0.75rem', fontWeight: 700, color: '#64748b' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                                    <Clock size={12} />
                                                    {new Date(s.start_time || s.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    <span>→</span>
                                                    {(s.end_time || s.endTime) ? new Date(s.end_time || s.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '...'}
                                                </div>
                                                {isAdmin && (
                                                    <button 
                                                        onClick={() => handleDeleteShift(s.id)}
                                                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', color: '#f87171' }}
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                    {filteredHistory.length === 0 && (
                                        <div style={{ padding: '40px 20px', textAlign: 'center', color: '#94a3b8' }}>
                                            <HistoryIcon size={32} style={{ marginBottom: '10px', opacity: 0.5 }} />
                                            <p style={{ fontSize: '0.85rem', fontWeight: 600 }}>No session logs found.</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <style>{`
                @keyframes pulse {
                    0% { transform: scale(1); opacity: 1; }
                    50% { transform: scale(1.4); opacity: 0.5; }
                    100% { transform: scale(1); opacity: 1; }
                }
                *::-webkit-scrollbar {
                    width: 6px;
                }
                *::-webkit-scrollbar-track {
                    background: transparent;
                }
                *::-webkit-scrollbar-thumb {
                    background: #cbd5e1;
                    border-radius: 10px;
                }
            `}</style>
        </div>
    );
};

export default ShiftManagement;
