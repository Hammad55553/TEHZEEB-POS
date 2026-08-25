import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { db } from '../database';
import { Users, CheckCircle, Shield, Trash2, Loader2, Key, UserPlus, X, Activity } from 'lucide-react';
import toast from 'react-hot-toast';

const PERMISSIONS = [
    { id: 'pos', label: 'Sale Terminal' },
    { id: 'inventory', label: 'Stock / Inventory' },
    { id: 'credit', label: 'Customer Accounts' },
    { id: 'reports', label: 'Registry Logs' },
    { id: 'profit', label: 'Profit Mastery' },
    { id: 'shortage', label: 'Shortage Book' },
    { id: 'expenses', label: 'Expense Tracker' },
    { id: 'suppliers', label: 'Suppliers' },
    { id: 'users', label: 'Team Management' },
    { id: 'settings', label: 'System Setup' },
];

const UserManagement = () => {
    const { user } = useSelector(state => state.auth);
    const isAdmin = user?.role === 'admin';

    const [users, setUsers] = useState([]);
    const [salesByUser, setSalesByUser] = useState({});
    const [isLoading, setIsLoading] = useState(true);

    // create-user modal
    const [showCreate, setShowCreate] = useState(false);
    const [creating, setCreating] = useState(false);
    const [form, setForm] = useState({ name: '', email: '', password: '', role: 'cashier' });

    // change-password modal
    const [pwUser, setPwUser] = useState(null);
    const [newPw, setNewPw] = useState('');
    const [savingPw, setSavingPw] = useState(false);

    const fetchUsers = async () => {
        setIsLoading(true);
        try {
            const { data, error } = await db.from('users').select('*').order('id', { ascending: true });
            if (error) throw error;
            setUsers(data || []);
        } catch (e) {
            toast.error('Failed to load staff list');
        } finally {
            setIsLoading(false);
        }
    };

    const fetchActivity = async () => {
        try {
            const { data } = await db.from('sales').select('*');
            const counts = {};
            (data || []).forEach(s => {
                const key = (s.seller_name || s.cashier || '').toLowerCase();
                if (key) counts[key] = (counts[key] || 0) + 1;
            });
            setSalesByUser(counts);
        } catch (e) { /* ignore */ }
    };

    useEffect(() => { fetchUsers(); fetchActivity(); }, []);

    const handleCreate = async (e) => {
        e.preventDefault();
        if (!isAdmin) { toast.error('Admin only'); return; }
        if (!form.name || !form.email || !form.password) { toast.error('Fill all fields'); return; }
        if (form.password.length < 4) { toast.error('Password too short'); return; }
        setCreating(true);
        try {
            const { data, error } = await db.auth.signUp({
                email: form.email.trim(),
                password: form.password,
                options: { data: { name: form.name.trim(), role: form.role } },
            });
            if (error || data?.error) throw new Error((error || data.error)?.message || 'Failed');
            if (data?.error) throw new Error(data.error.message);
            // default permissions for a new non-admin user
            const created = data?.data?.user || data?.user;
            if (created && form.role !== 'admin') {
                await db.from('users').update({ permissions: ['pos', 'inventory', 'credit', 'reports'] }).eq('id', created.id);
            }
            toast.success(`User "${form.name}" created`);
            setShowCreate(false);
            setForm({ name: '', email: '', password: '', role: 'cashier' });
            fetchUsers();
        } catch (err) {
            toast.error(err.message || 'Could not create user');
        } finally {
            setCreating(false);
        }
    };

    const handleTogglePermission = async (u, permission) => {
        if (!isAdmin) { toast.error('Admin only'); return; }
        const current = u.permissions || [];
        const next = current.includes(permission) ? current.filter(p => p !== permission) : [...current, permission];
        try {
            const { error } = await db.from('users').update({ permissions: next }).eq('id', u.id);
            if (error) throw error;
            toast.success(`Updated ${permission} for ${u.name}`);
            fetchUsers();
        } catch (e) { toast.error('Failed to update permissions'); }
    };

    const handleUpdateStatus = async (id, status) => {
        if (!isAdmin) { toast.error('Admin only'); return; }
        try {
            const { error } = await db.from('users').update({ status }).eq('id', id);
            if (error) throw error;
            toast.success(`User marked ${status}`);
            fetchUsers();
        } catch (e) { toast.error('Failed to update status'); }
    };

    const handleDelete = async (id) => {
        if (!isAdmin) { toast.error('Admin only'); return; }
        if (!window.confirm('Delete this user permanently?')) return;
        try {
            const { error } = await db.from('users').delete().eq('id', id);
            if (error) throw error;
            toast.success('User deleted');
            fetchUsers();
        } catch (e) { toast.error('Failed to delete'); }
    };

    const handleChangePassword = async (e) => {
        e.preventDefault();
        if (!pwUser) return;
        if (!newPw || newPw.length < 4) { toast.error('Password too short'); return; }
        setSavingPw(true);
        try {
            const { error } = await db.auth.adminSetPassword(pwUser.email, newPw);
            if (error) throw error;
            toast.success(`Password changed for ${pwUser.name}`);
            setPwUser(null);
            setNewPw('');
        } catch (err) {
            toast.error('Could not change password');
        } finally {
            setSavingPw(false);
        }
    };

    const card = { background: 'white', border: '1px solid #eef1f5', borderRadius: '14px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' };
    const badge = (bg, col) => ({ padding: '4px 10px', borderRadius: '6px', background: bg, color: col, fontSize: '0.7rem', fontWeight: 900, width: 'fit-content' });

    return (
        <div style={{ height: '100%', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '18px', padding: window.innerWidth <= 768 ? '10px' : '20px' }}>
            {/* HEADER */}
            <header style={{ ...card, padding: '18px 22px', display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '14px' }}>
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
                        <Shield size={24} color="#F7941D" />
                        <h2 style={{ fontSize: '1.4rem', fontWeight: 950, color: '#1e293b' }}>TEAM ACCESS CONTROL</h2>
                    </div>
                    <p style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 600 }}>Create staff, set permissions, change passwords.</p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ background: '#FFF7E6', padding: '10px 18px', borderRadius: '10px', border: '1px solid #F6D9A8', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Users size={18} color="#D2691E" />
                        <span style={{ fontWeight: 900, fontSize: '0.85rem', color: '#7A1E0C' }}>{users.length} STAFF</span>
                    </div>
                    {isAdmin && (
                        <button onClick={() => setShowCreate(true)}
                            style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'linear-gradient(135deg, #F7941D 0%, #D2691E 100%)', color: 'white', border: 'none', borderRadius: '10px', padding: '11px 18px', fontWeight: 900, fontSize: '0.8rem', cursor: 'pointer', boxShadow: '0 6px 14px rgba(247,148,29,0.3)' }}>
                            <UserPlus size={18} /> NEW USER
                        </button>
                    )}
                </div>
            </header>

            {/* USER CARDS */}
            {isLoading ? (
                <div style={{ textAlign: 'center', padding: '60px' }}><Loader2 size={40} className="animate-spin" style={{ margin: '0 auto', color: '#F7941D' }} /></div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: window.innerWidth <= 900 ? '1fr' : 'repeat(auto-fill, minmax(420px, 1fr))', gap: '16px' }}>
                    {users.map(u => {
                        const perms = u.permissions || [];
                        const activeSales = salesByUser[(u.name || '').toLowerCase()] || 0;
                        return (
                            <div key={u.id} style={{ ...card, padding: '18px' }}>
                                {/* top */}
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                        <div style={{ width: '44px', height: '44px', borderRadius: '10px', background: 'linear-gradient(135deg, #8B2500, #F7941D)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 950, fontSize: '1.1rem' }}>
                                            {(u.name || u.email || '?').charAt(0).toUpperCase()}
                                        </div>
                                        <div>
                                            <div style={{ fontWeight: 900, color: '#1e293b', fontSize: '1.02rem' }}>{u.name || '—'}</div>
                                            <div style={{ color: '#64748b', fontWeight: 600, fontSize: '0.8rem' }}>{u.email}</div>
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', alignItems: 'flex-end' }}>
                                        <span style={badge(u.role === 'admin' ? '#FFF7E6' : '#f1f5f9', u.role === 'admin' ? '#D2691E' : '#64748b')}>{(u.role || 'cashier').toUpperCase()}</span>
                                        <span style={badge(u.status === 'disabled' ? '#fee2e2' : '#FDF3D0', u.status === 'disabled' ? '#ef4444' : '#B4581F')}>{(u.status || 'active').toUpperCase()}</span>
                                    </div>
                                </div>

                                {/* activity */}
                                <div style={{ display: 'flex', gap: '10px', marginBottom: '14px' }}>
                                    <div style={{ flex: 1, background: '#FFFBF2', border: '1px solid #F6D9A8', borderRadius: '10px', padding: '8px 12px' }}>
                                        <div style={{ fontSize: '0.55rem', fontWeight: 900, color: '#B4581F', letterSpacing: '0.05em' }}>JOINED</div>
                                        <div style={{ fontSize: '0.82rem', fontWeight: 900, color: '#7A1E0C' }}>{u.created_at ? new Date(u.created_at).toLocaleDateString() : '—'}</div>
                                    </div>
                                    <div style={{ flex: 1, background: '#FFFBF2', border: '1px solid #F6D9A8', borderRadius: '10px', padding: '8px 12px' }}>
                                        <div style={{ fontSize: '0.55rem', fontWeight: 900, color: '#B4581F', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '4px' }}><Activity size={10} /> BILLS MADE</div>
                                        <div style={{ fontSize: '0.82rem', fontWeight: 900, color: '#7A1E0C' }}>{activeSales}</div>
                                    </div>
                                </div>

                                {/* permissions */}
                                {u.role !== 'admin' && (
                                    <div style={{ marginBottom: '14px' }}>
                                        <div style={{ fontSize: '0.62rem', fontWeight: 900, color: '#94a3b8', marginBottom: '8px', letterSpacing: '0.05em' }}>PERMISSIONS (tap to toggle)</div>
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                            {PERMISSIONS.map(p => {
                                                const on = perms.includes(p.id);
                                                return (
                                                    <button key={p.id} disabled={!isAdmin} onClick={() => handleTogglePermission(u, p.id)}
                                                        style={{ padding: '6px 10px', borderRadius: '8px', fontSize: '0.6rem', fontWeight: 900, cursor: isAdmin ? 'pointer' : 'default', background: on ? '#FFF7E6' : '#f8fafc', color: on ? '#D2691E' : '#94a3b8', border: `1px solid ${on ? '#F7941D' : '#e2e8f0'}`, display: 'flex', alignItems: 'center', gap: '5px' }}>
                                                        {on ? <CheckCircle size={11} /> : <div style={{ width: '11px', height: '11px', borderRadius: '50%', border: '1px solid #cbd5e1' }} />}
                                                        {p.label.toUpperCase()}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}
                                {u.role === 'admin' && (
                                    <div style={{ marginBottom: '14px', fontSize: '0.72rem', fontWeight: 800, color: '#D2691E', background: '#FFF7E6', border: '1px solid #F6D9A8', borderRadius: '8px', padding: '8px 12px' }}>
                                        Admin has full access to everything.
                                    </div>
                                )}

                                {/* actions */}
                                {isAdmin && (
                                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', borderTop: '1px solid #f1f5f9', paddingTop: '12px' }}>
                                        <button onClick={() => { setPwUser(u); setNewPw(''); }}
                                            style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '9px 14px', color: '#D2691E', background: '#FFF7E6', border: '1px solid #F6D9A8', borderRadius: '9px', cursor: 'pointer', fontWeight: 900, fontSize: '0.7rem' }}>
                                            <Key size={15} /> CHANGE PASSWORD
                                        </button>
                                        {u.role !== 'admin' && (u.status === 'disabled'
                                            ? <button onClick={() => handleUpdateStatus(u.id, 'active')} style={{ padding: '9px 14px', background: '#F7941D', color: 'white', border: 'none', borderRadius: '9px', fontWeight: 900, cursor: 'pointer', fontSize: '0.7rem' }}>ENABLE</button>
                                            : <button onClick={() => handleUpdateStatus(u.id, 'disabled')} style={{ padding: '9px 14px', background: 'white', color: '#f59e0b', border: '1px solid #fbbf24', borderRadius: '9px', fontWeight: 900, cursor: 'pointer', fontSize: '0.7rem' }}>DISABLE</button>
                                        )}
                                        {u.role !== 'admin' && (
                                            <button onClick={() => handleDelete(u.id)} style={{ padding: '9px', color: '#ef4444', background: '#fff1f1', border: '1px solid #fecaca', borderRadius: '9px', cursor: 'pointer' }}><Trash2 size={16} /></button>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            {/* CREATE USER MODAL */}
            {showCreate && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.7)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', backdropFilter: 'blur(4px)' }}>
                    <div style={{ background: '#f8fafc', width: '100%', maxWidth: '440px', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.35)' }}>
                        <div style={{ background: 'linear-gradient(135deg, #8B2500 0%, #F7941D 100%)', padding: '16px 22px', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h3 style={{ fontSize: '1.05rem', fontWeight: 900, display: 'flex', alignItems: 'center', gap: '8px' }}><UserPlus size={20} /> NEW USER</h3>
                            <button onClick={() => setShowCreate(false)} style={{ background: 'rgba(255,255,255,0.15)', border: 'none', color: 'white', width: '30px', height: '30px', borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={16} /></button>
                        </div>
                        <form onSubmit={handleCreate} style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                            {[
                                { k: 'name', label: 'Full Name', type: 'text', ph: 'e.g. Ali Raza' },
                                { k: 'email', label: 'Email (login id)', type: 'email', ph: 'name@tehzeeb.com' },
                                { k: 'password', label: 'Password', type: 'text', ph: 'min 4 characters' },
                            ].map(fd => (
                                <div key={fd.k}>
                                    <label style={{ fontSize: '0.62rem', fontWeight: 900, color: '#64748b', letterSpacing: '0.05em', textTransform: 'uppercase', display: 'block', marginBottom: '5px' }}>{fd.label}</label>
                                    <input type={fd.type} placeholder={fd.ph} required value={form[fd.k]} onChange={e => setForm({ ...form, [fd.k]: e.target.value })}
                                        style={{ width: '100%', padding: '11px 12px', border: '1.5px solid #e2e8f0', borderRadius: '9px', fontSize: '0.9rem', fontWeight: 700, outline: 'none', boxSizing: 'border-box' }} />
                                </div>
                            ))}
                            <div>
                                <label style={{ fontSize: '0.62rem', fontWeight: 900, color: '#64748b', letterSpacing: '0.05em', textTransform: 'uppercase', display: 'block', marginBottom: '5px' }}>Role</label>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    {['cashier', 'manager', 'admin'].map(r => (
                                        <button key={r} type="button" onClick={() => setForm({ ...form, role: r })}
                                            style={{ flex: 1, padding: '10px', borderRadius: '9px', border: '2px solid', borderColor: form.role === r ? '#F7941D' : '#e2e8f0', background: form.role === r ? 'linear-gradient(135deg,#F7941D,#D2691E)' : 'white', color: form.role === r ? 'white' : '#64748b', fontWeight: 900, fontSize: '0.72rem', cursor: 'pointer', textTransform: 'capitalize' }}>{r}</button>
                                    ))}
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
                                <button type="button" onClick={() => setShowCreate(false)} style={{ flex: 1, padding: '13px', borderRadius: '10px', border: '1.5px solid #e2e8f0', background: 'white', fontWeight: 800, color: '#64748b', cursor: 'pointer' }}>CANCEL</button>
                                <button type="submit" disabled={creating} style={{ flex: 2, padding: '13px', borderRadius: '10px', border: 'none', background: 'linear-gradient(135deg,#F7941D,#D2691E)', color: 'white', fontWeight: 900, cursor: 'pointer', opacity: creating ? 0.7 : 1 }}>{creating ? 'CREATING...' : 'CREATE USER'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* CHANGE PASSWORD MODAL */}
            {pwUser && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.7)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', backdropFilter: 'blur(4px)' }}>
                    <div style={{ background: '#f8fafc', width: '100%', maxWidth: '400px', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.35)' }}>
                        <div style={{ background: 'linear-gradient(135deg, #8B2500 0%, #F7941D 100%)', padding: '16px 22px', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h3 style={{ fontSize: '1rem', fontWeight: 900, display: 'flex', alignItems: 'center', gap: '8px' }}><Key size={18} /> CHANGE PASSWORD</h3>
                            <button onClick={() => setPwUser(null)} style={{ background: 'rgba(255,255,255,0.15)', border: 'none', color: 'white', width: '30px', height: '30px', borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={16} /></button>
                        </div>
                        <form onSubmit={handleChangePassword} style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                            <p style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 700 }}>Set a new password for <b style={{ color: '#7A1E0C' }}>{pwUser.name}</b> ({pwUser.email}).</p>
                            <input type="text" placeholder="New password (min 4)" required value={newPw} onChange={e => setNewPw(e.target.value)}
                                style={{ width: '100%', padding: '12px', border: '1.5px solid #F7941D', borderRadius: '9px', fontSize: '0.95rem', fontWeight: 800, outline: 'none', boxSizing: 'border-box', background: '#FFFBF2' }} />
                            <div style={{ display: 'flex', gap: '10px' }}>
                                <button type="button" onClick={() => setPwUser(null)} style={{ flex: 1, padding: '13px', borderRadius: '10px', border: '1.5px solid #e2e8f0', background: 'white', fontWeight: 800, color: '#64748b', cursor: 'pointer' }}>CANCEL</button>
                                <button type="submit" disabled={savingPw} style={{ flex: 2, padding: '13px', borderRadius: '10px', border: 'none', background: 'linear-gradient(135deg,#F7941D,#D2691E)', color: 'white', fontWeight: 900, cursor: 'pointer', opacity: savingPw ? 0.7 : 1 }}>{savingPw ? 'SAVING...' : 'CHANGE PASSWORD'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default UserManagement;
