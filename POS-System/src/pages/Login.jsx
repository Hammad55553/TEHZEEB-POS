import React, { useState } from 'react';
import { useDispatch } from 'react-redux';
import { useNavigate, Link } from 'react-router-dom';
import { db } from '../database';
import { login } from '../store/slices/authSlice';
import { Shield, Lock, User, AlertCircle, Loader2, Chrome } from 'lucide-react';
import toast from 'react-hot-toast';

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isGoogleLoading, setIsGoogleLoading] = useState(false);
    const dispatch = useDispatch();
    const navigate = useNavigate();

    const handleGoogleLogin = async () => {
        setIsGoogleLoading(true);
        try {
            const { data, error } = await db.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    queryParams: {
                        access_type: 'offline',
                        prompt: 'select_account',
                    },
                },
            });
            if (error) throw error;
            // Note: OAuth on web/desktop usually needs a redirect or separate handling
            // For now, Database will handle the session.
        } catch (error) {
            console.error(error);
            toast.error("Google authentication failed.");
        } finally {
            setIsGoogleLoading(false);
        }
    };

    const handleLogin = async (e) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            const { data, error } = await db.auth.signInWithPassword({
                email,
                password,
            });

            if (error) throw error;

            // Our local backend returns the full user in data.user (and session.user)
            const user = data.user || data.session?.user;
            if (!user) { toast.error("Login failed. Try again."); return; }

            if (user.status && user.status !== 'active') {
                toast.error("Your account is pending approval or has been disabled.");
                return;
            }

            const finalUser = {
                uid: user.id,
                email: user.email,
                role: user.role || 'cashier',
                status: user.status || 'active',
                name: user.name || (user.email ? user.email.split('@')[0] : 'User'),
                permissions: user.role === 'admin'
                    ? ['pos', 'inventory', 'credit', 'reports', 'users', 'profit']
                    : (user.permissions || ['pos', 'inventory', 'credit', 'reports'])
            };

            dispatch(login(finalUser));
            toast.success(`Welcome back, ${finalUser.name}!`);
            navigate('/');
        } catch (error) {
            console.error(error);
            toast.error(error.message || "Invalid credentials.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div style={{
            height: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#0f172a',
            fontFamily: 'Segoe UI, Tahoma, Geneva, Verdana, sans-serif'
        }}>
            <div style={{
                width: '400px',
                background: 'white',
                borderRadius: '16px',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
                overflow: 'hidden'
            }}>
                {/* Header */}
                <div style={{
                    background: '#1e293b',
                    padding: '40px 20px',
                    textAlign: 'center',
                    color: 'white'
                }}>
                    <div style={{
                        width: '60px',
                        height: '60px',
                        background: 'rgba(56, 189, 248, 0.1)',
                        borderRadius: '12px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: '0 auto 20px',
                        border: '1px solid #38bdf8'
                    }}>
                        <Shield size={32} color="#38bdf8" />
                    </div>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: 900, marginBottom: '8px', letterSpacing: '-0.5px' }}>TEHZEEB POS</h2>
                    <p style={{ color: '#94a3b8', fontSize: '0.85rem', fontWeight: 600 }}>Secure Terminal Authentication</p>
                </div>

                {/* Google Login Button */}
                <button
                    type="button"
                    onClick={handleGoogleLogin}
                    disabled={isGoogleLoading || isLoading}
                    style={{
                        width: 'calc(100% - 80px)', /* Adjust for padding */
                        margin: '20px 40px 0 40px', /* Add margin to center and provide space */
                        padding: '12px',
                        background: 'white',
                        border: '1px solid #e2e8f0',
                        borderRadius: '8px',
                        color: '#1e293b',
                        fontWeight: 700,
                        fontSize: '0.9rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '10px',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                    }}
                    onMouseOver={(e) => e.currentTarget.style.background = '#f8fafc'}
                    onMouseOut={(e) => e.currentTarget.style.background = 'white'}
                >
                    {isGoogleLoading ? <Loader2 size={18} className="animate-spin" /> : <Chrome size={18} color="#4285F4" />}
                    CONTINUE WITH GOOGLE
                </button>

                <div style={{ display: 'flex', alignItems: 'center', margin: '20px 40px', gap: '15px' }}>
                    <div style={{ flex: 1, height: '1px', background: '#e2e8f0' }}></div>
                    <span style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 800 }}>OR LOGIN WITH EMAIL</span>
                    <div style={{ flex: 1, height: '1px', background: '#e2e8f0' }}></div>
                </div>

                {/* Form */}
                <form onSubmit={handleLogin} style={{ padding: '0 40px 40px 40px' }}>
                    <div style={{ marginBottom: '20px' }}>
                        <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 900, color: '#64748b', textTransform: 'uppercase', marginBottom: '8px' }}>Operator Email</label>
                        <div style={{ position: 'relative' }}>
                            <User size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                            <input
                                type="email"
                                required
                                placeholder="name@tehzeeb.com"
                                style={{
                                    width: '100%',
                                    padding: '12px 12px 12px 40px',
                                    border: '2px solid #e2e8f0',
                                    borderRadius: '8px',
                                    fontSize: '0.9rem',
                                    fontWeight: 700,
                                    outline: 'none',
                                    transition: 'border-color 0.2s'
                                }}
                                onFocus={e => e.target.style.borderColor = '#38bdf8'}
                                onBlur={e => e.target.style.borderColor = '#e2e8f0'}
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                            />
                        </div>
                    </div>

                    <div style={{ marginBottom: '30px' }}>
                        <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 900, color: '#64748b', textTransform: 'uppercase', marginBottom: '8px' }}>Security Password</label>
                        <div style={{ position: 'relative' }}>
                            <Lock size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                            <input
                                type="password"
                                required
                                placeholder="••••••••"
                                style={{
                                    width: '100%',
                                    padding: '12px 12px 12px 40px',
                                    border: '2px solid #e2e8f0',
                                    borderRadius: '8px',
                                    fontSize: '0.9rem',
                                    fontWeight: 700,
                                    outline: 'none',
                                    transition: 'border-color 0.2s'
                                }}
                                onFocus={e => e.target.style.borderColor = '#38bdf8'}
                                onBlur={e => e.target.style.borderColor = '#e2e8f0'}
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={isLoading}
                        style={{
                            width: '100%',
                            padding: '14px',
                            background: '#F7941D',
                            color: 'white',
                            border: 'none',
                            borderRadius: '8px',
                            fontSize: '1rem',
                            fontWeight: 900,
                            cursor: isLoading ? 'not-allowed' : 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '10px',
                            boxShadow: '0 4px 6px -1px rgba(37, 99, 235, 0.4)'
                        }}
                    >
                        {isLoading ? (
                            <>
                                <Loader2 size={20} className="animate-spin" />
                                <span>VERIFYING...</span>
                            </>
                        ) : (
                            <span>UNLOCK TERMINAL</span>
                        )}
                    </button>

                    <div style={{ marginTop: '20px', textAlign: 'center' }}>
                        <Link to="/register" style={{ color: '#F7941D', fontSize: '0.85rem', fontWeight: 700, textDecoration: 'none' }}>
                            New operator? Create account
                        </Link>
                    </div>

                    <div style={{ marginTop: '20px', textAlign: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', color: '#64748b', fontSize: '0.75rem', fontWeight: 700 }}>
                            <AlertCircle size={14} />
                            <span>Authorized Personnel Only</span>
                        </div>
                    </div>
                </form>

                {/* Footer bar */}
                <div style={{ height: '6px', background: '#38bdf8' }}></div>
            </div>
        </div>
    );
};

export default Login;
