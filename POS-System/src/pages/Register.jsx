import React, { useState } from 'react';
import { useDispatch } from 'react-redux';
import { useNavigate, Link } from 'react-router-dom';
import { db } from '../database';
import { login } from '../store/slices/authSlice';
import { UserPlus, Lock, User, Mail, ShieldCheck, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

const Register = () => {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    // SECURITY: role is NEVER chosen by the user at signup. All new accounts
    // are created as 'user' with 'pending' status and must be promoted by an
    // admin from User Management. This prevents self-granting admin access.
    const role = 'user';
    const [isLoading, setIsLoading] = useState(false);
    const dispatch = useDispatch();
    const navigate = useNavigate();

    const handleRegister = async (e) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            const { data, error } = await db.auth.signUp({
                email,
                password,
            });

            if (error) throw error;

            const user = data.user;

            // Save to profiles table
            const { error: profileError } = await db
                .from('profiles')
                .insert([
                    {
                        id: user.id,
                        name: name,
                        email: email,
                        role: role,
                        status: 'pending', // Requires admin approval
                    }
                ]);

            if (profileError) throw profileError;

            toast.success(`Registration request sent! Please wait for Admin approval.`, { duration: 6000 });
            navigate('/login');
        } catch (error) {
            console.error(error);
            toast.error(error.message || "Registration failed. Try again.");
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
                width: '450px',
                background: 'white',
                borderRadius: '16px',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
                overflow: 'hidden'
            }}>
                {/* Header */}
                <div style={{
                    background: '#1e293b',
                    padding: '30px 20px',
                    textAlign: 'center',
                    color: 'white'
                }}>
                    <div style={{
                        width: '50px',
                        height: '50px',
                        background: 'rgba(16, 185, 129, 0.1)',
                        borderRadius: '12px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: '0 auto 15px',
                        border: '1px solid #FF8A1E'
                    }}>
                        <UserPlus size={28} color="#FF8A1E" />
                    </div>
                    <h2 style={{ fontSize: '1.25rem', fontWeight: 900, marginBottom: '5px' }}>OPERATOR REGISTRATION</h2>
                    <p style={{ color: '#94a3b8', fontSize: '0.8rem', fontWeight: 600 }}>Create a new terminal account</p>
                </div>

                {/* Form */}
                <form onSubmit={handleRegister} style={{ padding: '30px' }}>
                    <div style={{ marginBottom: '15px' }}>
                        <label style={{ display: 'block', fontSize: '0.65rem', fontWeight: 900, color: '#64748b', textTransform: 'uppercase', marginBottom: '5px' }}>Full Name</label>
                        <div style={{ position: 'relative' }}>
                            <User size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                            <input
                                type="text"
                                required
                                placeholder="Tehzeeb Sweets & Super Store"
                                style={{ width: '100%', padding: '10px 12px 10px 35px', border: '2px solid #e2e8f0', borderRadius: '8px', fontSize: '0.9rem', fontWeight: 700, outline: 'none' }}
                                value={name}
                                onChange={e => setName(e.target.value)}
                            />
                        </div>
                    </div>

                    <div style={{ marginBottom: '15px' }}>
                        <label style={{ display: 'block', fontSize: '0.65rem', fontWeight: 900, color: '#64748b', textTransform: 'uppercase', marginBottom: '5px' }}>Email Address</label>
                        <div style={{ position: 'relative' }}>
                            <Mail size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                            <input
                                type="email"
                                required
                                placeholder="info@tehzeeb.com"
                                style={{ width: '100%', padding: '10px 12px 10px 35px', border: '2px solid #e2e8f0', borderRadius: '8px', fontSize: '0.9rem', fontWeight: 700, outline: 'none' }}
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                            />
                        </div>
                    </div>

                    <div style={{ marginBottom: '15px' }}>
                        <label style={{ display: 'block', fontSize: '0.65rem', fontWeight: 900, color: '#64748b', textTransform: 'uppercase', marginBottom: '5px' }}>Password</label>
                        <div style={{ position: 'relative' }}>
                            <Lock size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                            <input
                                type="password"
                                required
                                placeholder="Minimum 6 characters"
                                style={{ width: '100%', padding: '10px 12px 10px 35px', border: '2px solid #e2e8f0', borderRadius: '8px', fontSize: '0.9rem', fontWeight: 700, outline: 'none' }}
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                            />
                        </div>
                    </div>

                    <div style={{ marginBottom: '25px', padding: '12px 14px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <ShieldCheck size={18} color="#FF8A1E" />
                        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b' }}>
                            New accounts are created as Terminal Operators and require Admin approval before access is granted.
                        </span>
                    </div>

                    <button
                        type="submit"
                        disabled={isLoading}
                        style={{
                            width: '100%',
                            padding: '14px',
                            background: '#FF8A1E',
                            color: 'white',
                            border: 'none',
                            borderRadius: '8px',
                            fontSize: '1rem',
                            fontWeight: 900,
                            cursor: isLoading ? 'not-allowed' : 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '10px'
                        }}
                    >
                        {isLoading ? (
                            <>
                                <Loader2 size={20} className="animate-spin" />
                                <span>REGISTERING...</span>
                            </>
                        ) : (
                            <span>CREATE ACCOUNT</span>
                        )}
                    </button>

                    <div style={{ marginTop: '20px', textAlign: 'center' }}>
                        <Link to="/login" style={{ color: '#F7941D', fontSize: '0.85rem', fontWeight: 700, textDecoration: 'none' }}>
                            Already have an account? Login here
                        </Link>
                    </div>
                </form>

                <div style={{ height: '6px', background: '#FF8A1E' }}></div>
            </div>
        </div>
    );
};

export default Register;
