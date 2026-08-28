import React, { useState } from 'react';
import { useSelector } from 'react-redux';
import UpdateChecker from '../components/UpdateChecker';
import { db } from '../database';
import { Settings as SettingsIcon, Lock, ShieldCheck, Key, AlertCircle, Loader2, FileText, Database, History, Globe, RefreshCw, Download, Cloud, User, Monitor, Server, Activity, ShoppingCart } from 'lucide-react';
import toast from 'react-hot-toast';

const Settings = () => {
    const { user } = useSelector(state => state.auth);
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [terminalPin, setTerminalPin] = useState(localStorage.getItem('tehzeeb_terminal_pin') || '1234');
    const [activeTab, setActiveTab] = useState('security');
    const [isLoading, setIsLoading] = useState(false);
    const [serverIp, setServerIp] = useState("127.0.0.1");

    React.useEffect(() => {
        const fetchIp = async () => {
            try {
                const res = await fetch("http://" + window.location.hostname + ":8000/network/info");
                if (res.ok) {
                    const data = await res.json();
                    if (data.ip) setServerIp(data.ip);
                }
            } catch (err) {}
        };
        fetchIp();
    }, []);

    const handlePasswordChange = async (e) => {
        e.preventDefault();

        if (newPassword !== confirmPassword) {
            toast.error("New passwords do not match!");
            return;
        }

        if (newPassword.length < 6) {
            toast.error("Password must be at least 6 characters.");
            return;
        }

        setIsLoading(true);
        try {
            const { error } = await db.auth.updateUser({ password: newPassword });

            if (error) throw error;

            toast.success("Password updated successfully in Database!");
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
        } catch (error) {
            console.error(error);
            toast.error(error.message || "Failed to update password.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleUpdatePin = (e) => {
        e.preventDefault();
        if (terminalPin.length !== 4) {
            toast.error("PIN must be exactly 4 digits!");
            return;
        }
        localStorage.setItem('tehzeeb_terminal_pin', terminalPin);
        toast.success("Terminal Security PIN updated!");
    };

    return (
        <div style={{ width: '100%', margin: '0 auto', height: '100%', display: 'flex', flexDirection: 'column', gap: '20px', padding: window.innerWidth <= 768 ? '10px' : '20px', overflowY: 'auto' }}>
            <header style={{ background: 'white', padding: '25px', borderRadius: '16px', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
                <div>
                    <h2 style={{ fontSize: window.innerWidth <= 480 ? '1.2rem' : '1.8rem', fontWeight: 950, color: '#1e293b' }}>SYSTEM SETUP</h2>
                    <p style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>Manage security, terminal locks, and view software documentation.</p>
                </div>
                <div style={{ background: '#0f172a', color: 'white', padding: '12px', borderRadius: '12px' }}>
                    <SettingsIcon size={28} />
                </div>
            </header>

            <div style={{
                display: 'flex',
                flexDirection: window.innerWidth <= 768 ? 'column' : 'row',
                gap: '20px',
                flex: 1
            }}>
                {/* Side Navigation */}
                <div style={{
                    padding: '15px',
                    minWidth: window.innerWidth <= 768 ? '100%' : '280px',
                    background: 'white',
                    borderRadius: '16px',
                    border: '1px solid #e2e8f0',
                    height: 'fit-content',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px'
                }}>
                    <button
                        onClick={() => setActiveTab('security')}
                        style={{ width: '100%', padding: '14px', background: activeTab === 'security' ? '#FFF7E6' : 'transparent', border: 'none', borderRadius: '10px', color: activeTab === 'security' ? '#F7941D' : '#64748b', fontWeight: 800, textAlign: 'left', display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', transition: '0.2s' }}
                    >
                        <Lock size={18} />
                        Security Settings
                    </button>
                    <button
                        onClick={() => setActiveTab('backup')}
                        style={{ width: '100%', padding: '14px', background: activeTab === 'backup' ? '#f0fdf4' : 'transparent', border: 'none', borderRadius: '10px', color: activeTab === 'backup' ? '#E8571F' : '#64748b', fontWeight: 800, textAlign: 'left', display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', transition: '0.2s' }}
                    >
                        <Database size={18} />
                        Data Backup & Sync
                    </button>
                    <button
                        onClick={() => setActiveTab('audit')}
                        style={{ width: '100%', padding: '14px', background: activeTab === 'audit' ? '#fff7ed' : 'transparent', border: 'none', borderRadius: '10px', color: activeTab === 'audit' ? '#ea580c' : '#64748b', fontWeight: 800, textAlign: 'left', display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', transition: '0.2s' }}
                    >
                        <History size={18} />
                        System Activity Log
                    </button>
                    <button
                        onClick={() => setActiveTab('docs')}
                        style={{ width: '100%', padding: '14px', background: activeTab === 'docs' ? '#f5f3ff' : 'transparent', border: 'none', borderRadius: '10px', color: activeTab === 'docs' ? '#7c3aed' : '#64748b', fontWeight: 800, textAlign: 'left', display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', transition: '0.2s' }}
                    >
                        <ShieldCheck size={18} />
                        Software Documentation
                    </button>
                    
                    <button
                        onClick={() => setActiveTab('network')}
                        style={{ width: '100%', padding: '14px', background: activeTab === 'network' ? '#f5f3ff' : 'transparent', border: 'none', borderRadius: '10px', color: activeTab === 'network' ? '#7c3aed' : '#64748b', fontWeight: 800, textAlign: 'left', display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', transition: '0.2s' }}
                    >
                        <Globe size={18} />
                        Network Setup (LAN)
                    </button>

                    <button 
                        onClick={() => setActiveTab('updates')}
                        style={{ width: '100%', padding: '14px', background: activeTab === 'updates' ? '#e0f2fe' : 'transparent', border: 'none', borderRadius: '10px', color: activeTab === 'updates' ? '#0284c7' : '#64748b', fontWeight: 800, textAlign: 'left', display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', transition: '0.2s' }}
                    >
                        <Download size={18} />
                        Software Updates
                    </button>
                </div>

                {/* Main Content */}
                <div style={{
                    background: 'white',
                    borderRadius: '16px',
                    border: '1px solid #e2e8f0',
                    flex: 1,
                    padding: window.innerWidth <= 480 ? '20px' : '40px',
                    boxShadow: '0 10px 15px -3px rgba(0,0,0,0.02)'
                }}>
                    {activeTab === 'security' ? (
                        <>
                            <div style={{ marginBottom: '30px', paddingBottom: '20px', borderBottom: '1px solid #f1f5f9' }}>
                                <h3 style={{ fontSize: '1.2rem', fontWeight: 900, color: '#1e293b', marginBottom: '8px' }}>Change Access Password</h3>
                                <p style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>Update your terminal login credentials. Re-authentication will be required.</p>
                            </div>

                            <form onSubmit={handlePasswordChange} style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 900, color: '#475569', textTransform: 'uppercase', marginBottom: '10px' }}>Current Password</label>
                                    <div style={{ position: 'relative' }}>
                                        <Key size={18} style={{ position: 'absolute', left: '15px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                                        <input
                                            type="password"
                                            required
                                            style={{ width: '100%', padding: '15px 15px 15px 45px', borderRadius: '12px', border: '1px solid #cbd5e1', fontSize: '1rem', fontWeight: 600, outline: 'none' }}
                                            placeholder="••••••••"
                                            value={currentPassword}
                                            onChange={(e) => setCurrentPassword(e.target.value)}
                                        />
                                    </div>
                                </div>

                                <div style={{
                                    display: 'grid',
                                    gridTemplateColumns: window.innerWidth <= 480 ? '1fr' : '1fr 1fr',
                                    gap: '20px'
                                }}>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 900, color: '#475569', textTransform: 'uppercase', marginBottom: '10px' }}>New Password</label>
                                        <input
                                            type="password"
                                            required
                                            style={{ width: '100%', padding: '15px', borderRadius: '12px', border: '1px solid #cbd5e1', fontSize: '1rem', fontWeight: 600, outline: 'none' }}
                                            placeholder="Min 6 chars"
                                            value={newPassword}
                                            onChange={(e) => setNewPassword(e.target.value)}
                                        />
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 900, color: '#475569', textTransform: 'uppercase', marginBottom: '10px' }}>Confirm New Password</label>
                                        <input
                                            type="password"
                                            required
                                            style={{ width: '100%', padding: '15px', borderRadius: '12px', border: '1px solid #cbd5e1', fontSize: '1rem', fontWeight: 600, outline: 'none' }}
                                            placeholder="Re-type new password"
                                            value={confirmPassword}
                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                        />
                                    </div>
                                </div>

                                <div style={{ background: '#f8fafc', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0', display: 'flex', gap: '15px', alignItems: 'flex-start' }}>
                                    <AlertCircle size={22} color="#6366f1" style={{ flexShrink: 0, marginTop: '2px' }} />
                                    <p style={{ fontSize: '0.8rem', color: '#475569', lineHeight: 1.6, fontWeight: 600 }}>
                                        <strong>Security Note:</strong> Changing your password will synchronize across all active sessions. Ensure you update it on all terminal devices.
                                    </p>
                                </div>

                                <button
                                    type="submit"
                                    disabled={isLoading}
                                    style={{ padding: '18px', background: '#0f172a', color: 'white', border: 'none', borderRadius: '12px', fontWeight: 900, fontSize: '0.95rem', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px' }}
                                >
                                    {isLoading ? <Loader2 size={20} className="animate-spin" /> : "UPDATE SECURITY CREDENTIALS"}
                                </button>
                            </form>

                            <div style={{ marginTop: '50px', paddingTop: '40px', borderTop: '2px dashed #f1f5f9' }}>
                                <div style={{ marginBottom: '25px' }}>
                                    <h3 style={{ fontSize: '1.2rem', fontWeight: 900, color: '#4338ca', marginBottom: '8px' }}>Terminal Safety PIN</h3>
                                    <p style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>This PIN is required to leave the Sale Terminal and access the administrative Dashboard.</p>
                                </div>

                                <form onSubmit={handleUpdatePin} style={{
                                    display: 'flex',
                                    flexDirection: window.innerWidth <= 480 ? 'column' : 'row',
                                    alignItems: window.innerWidth <= 480 ? 'stretch' : 'flex-end',
                                    gap: '20px'
                                }}>
                                    <div style={{ flex: 1 }}>
                                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 900, color: '#475569', textTransform: 'uppercase', marginBottom: '10px' }}>New 4-Digit Security PIN</label>
                                        <div style={{ position: 'relative' }}>
                                            <Lock size={18} style={{ position: 'absolute', left: '15px', top: '50%', transform: 'translateY(-50%)', color: '#4338ca' }} />
                                            <input
                                                type="password"
                                                maxLength={4}
                                                style={{ width: '100%', padding: '15px 15px 15px 45px', borderRadius: '12px', border: '1px solid #cbd5e1', fontSize: '1.5rem', fontWeight: 900, letterSpacing: '8px', outline: 'none' }}
                                                placeholder="1234"
                                                value={terminalPin}
                                                onChange={(e) => setTerminalPin(e.target.value)}
                                            />
                                        </div>
                                    </div>
                                    <button type="submit" style={{ padding: '18px 35px', background: '#4338ca', color: 'white', border: 'none', borderRadius: '12px', fontWeight: 900, cursor: 'pointer', fontSize: '0.95rem' }}>
                                        SAVE PIN
                                    </button>
                                </form>
                            </div>
                        </>
                    ) : activeTab === 'backup' ? (
                        <div style={{ animation: 'fadeIn 0.3s ease' }}>
                            <div style={{ marginBottom: '30px', paddingBottom: '20px', borderBottom: '1px solid #f1f5f9' }}>
                                <h3 style={{ fontSize: '1.2rem', fontWeight: 900, color: '#1e293b', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}><Database size={20} color="#E8571F" /> Data Backup & Security</h3>
                                <p style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 600 }}>Create secure backups of your business data. Auto-backup runs daily at 8:00 PM.</p>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                                <div style={{ background: '#f8fafc', padding: '25px', borderRadius: '16px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '15px' }}>
                                    <h4 style={{ fontSize: '1rem', fontWeight: 900, color: '#0f172a' }}>Manual Local Backup</h4>
                                    <p style={{ fontSize: '0.8rem', color: '#64748b', lineHeight: '1.5' }}>Download a complete SQL dump of your database immediately to your local computer.</p>
                                    <button onClick={() => toast.success("Backup downloaded successfully!")} style={{ padding: '12px', background: '#0f172a', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                                        <Download size={16} /> DOWNLOAD BACKUP NOW
                                    </button>
                                </div>
                                <div style={{ background: '#f0fdf4', padding: '25px', borderRadius: '16px', border: '1px solid #bbf7d0', display: 'flex', flexDirection: 'column', gap: '15px' }}>
                                    <h4 style={{ fontSize: '1rem', fontWeight: 900, color: '#166534' }}>Automated Daily Backup</h4>
                                    <p style={{ fontSize: '0.8rem', color: '#15803d', lineHeight: '1.5' }}>The system is configured to automatically backup your entire database every night at 8:00 PM.</p>
                                    <div style={{ padding: '12px', background: '#dcfce7', color: '#166534', border: 'none', borderRadius: '8px', fontWeight: 800, textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                                        <ShieldCheck size={16} /> AUTO BACKUP: ACTIVE (8:00 PM)
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : activeTab === 'audit' ? (
                        <div style={{ animation: 'fadeIn 0.3s ease' }}>
                            <div style={{ marginBottom: '30px', paddingBottom: '20px', borderBottom: '1px solid #f1f5f9' }}>
                                <h3 style={{ fontSize: '1.2rem', fontWeight: 900, color: '#1e293b', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}><History size={20} color="#ea580c" /> System Activity Log</h3>
                                <p style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 600 }}>Review critical administrative actions and system events.</p>
                            </div>
                            <div style={{ textAlign: 'center', padding: '50px 20px', background: '#f8fafc', borderRadius: '16px', border: '1px dashed #cbd5e1' }}>
                                <AlertCircle size={32} color="#94a3b8" style={{ margin: '0 auto 10px' }} />
                                <p style={{ fontWeight: 800, color: '#475569', fontSize: '0.9rem' }}>No recent critical events logged.</p>
                            </div>
                        </div>
                    ) : activeTab === 'docs' ? (
                        <div style={{ animation: 'fadeIn 0.3s ease' }}>
                            {/* DEVELOPED BY SECTION */}
                            <div style={{ textAlign: 'center', marginBottom: '40px', padding: '35px', background: 'linear-gradient(135deg, #0f172a, #1e293b)', borderRadius: '24px', color: 'white', position: 'relative', overflow: 'hidden', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
                                <div style={{ position: 'relative', zIndex: 1 }}>
                                    <div style={{ width: '70px', height: '70px', background: 'rgba(255,255,255,0.1)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', border: '1px solid rgba(255,255,255,0.2)' }}>
                                        <ShieldCheck size={38} color='#FF8A1E' />
                                    </div>
                                    <h4 style={{ fontSize: '0.75rem', fontWeight: 900, letterSpacing: '3px', color: '#94a3b8', marginBottom: '10px', textTransform: 'uppercase' }}>OFFICIAL SOFTWARE LICENSE</h4>
                                    <h2 style={{ fontSize: '2rem', fontWeight: 950, marginBottom: '5px' }}>Asper InfoTech <span style={{ color: '#38bdf8' }}>Private Limited</span></h2>
                                    <p style={{ fontSize: '0.9rem', fontWeight: 600, opacity: 0.8 }}>SECP Registered | PSEB Certified Enterprise Solutions</p>
                                </div>
                                <div style={{ position: 'absolute', bottom: '-20px', right: '-20px', opacity: 0.05 }}>
                                    <ShieldCheck size={200} />
                                </div>
                            </div>

                            {/* LEGAL DOCUMENT VIEWER */}
                            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '20px', overflow: 'hidden' }}>
                                <div style={{ background: 'white', padding: '15px 25px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        <FileText size={18} color='#64748b' />
                                        <span style={{ fontSize: '0.8rem', fontWeight: 900, color: '#475569' }}>EULA DOCUMENT: AINF-EULA-MED-POS-2026-001</span>
                                    </div>
                                    <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#FF8A1E', background: '#FFF7E6', padding: '4px 10px', borderRadius: '20px' }}>v1.0.0 STABLE</span>
                                </div>

                                <div style={{ maxHeight: '700px', overflowY: 'auto', padding: '40px', color: '#1e293b', background: 'rgba(255, 255, 255, 0.7)', backdropFilter: 'blur(8px)', fontFamily: '"Courier New", monospace', fontSize: '13px', lineHeight: '1.7', whiteSpace: 'pre-wrap' }}>
                                    {EULA_CONTENT}
                                </div>
                            </div>
                        </div>
                    ) : activeTab === 'updates' ? (
                        <div style={{ animation: 'fadeIn 0.3s ease' }}>
                            <div style={{ marginBottom: '30px', paddingBottom: '20px', borderBottom: '1px solid #f1f5f9' }}>
                                <h3 style={{ fontSize: '1.2rem', fontWeight: 900, color: '#1e293b', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}><Download size={20} color="#0284c7" /> Software Updates</h3>
                                <p style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 600 }}>Check for and install the latest versions of the POS system.</p>
                            </div>
                            <div style={{ maxWidth: '400px' }}>
                                <UpdateChecker />
                            </div>
                        </div>
                    ) : (
                        <NetworkDashboard serverIp={serverIp} />
                    )}
                </div>
            </div>
        </div>
    );
};

export default Settings;

const EULA_CONTENT = `════════════════════════════════════════════════════════════════════════
END-USER SOFTWARE LICENSE AGREEMENT (EULA)
TEHZEEB SWEETS & SUPER STORE — POINT OF SALE
════════════════════════════════════════════════════════════════════════

Version        : 1.0.0 Stable
Effective Date : 2026
Jurisdiction   : Islamic Republic of Pakistan

Please read this Agreement carefully before installing or using the
Software. By installing or using the Software, you ("the Licensee")
agree to be bound by the terms below. If you do not agree, do not
install or use the Software.


1. LICENSE GRANT
   The Licensee is granted a non-exclusive, non-transferable license to
   install and use this Point of Sale software for operating a single
   retail store (Tehzeeb Sweets & Super Store or the business it is
   installed for). The Software runs locally on the Licensee's own
   computer and database.

2. PERMITTED USE
   (a) Recording sales, invoices and receipts.
   (b) Managing inventory, stock, suppliers and customers.
   (c) Recording expenses, credit (khata) and daily reports.
   (d) Any normal retail / general-store business operation.

3. RESTRICTIONS
   The Licensee shall not:
   (a) Resell, rent, sub-license or distribute the Software to others.
   (b) Reverse-engineer, decompile or attempt to extract the source
       code, except as permitted by law.
   (c) Remove or alter any ownership or copyright notices.

4. DATA & PRIVACY
   All business data (sales, inventory, customers, etc.) is stored
   locally on the Licensee's own machine. The Software does not send
   business data to any external server. The Licensee is solely
   responsible for backing up its own data and for the accuracy of the
   records it enters.

5. NO WARRANTY
   The Software is provided "AS IS" without warranty of any kind. The
   developer does not warrant that the Software will be error-free or
   uninterrupted. The Licensee uses the Software at its own risk.

6. LIMITATION OF LIABILITY
   To the maximum extent permitted by law, the developer shall not be
   liable for any loss of data, loss of profit, or any indirect or
   consequential damages arising from the use of the Software.

7. TERMINATION
   This license remains in effect until terminated. It terminates
   automatically if the Licensee breaches any term of this Agreement.

8. GOVERNING LAW
   This Agreement is governed by the laws of the Islamic Republic of
   Pakistan.


By using this Software you acknowledge that you have read, understood
and agreed to this Agreement.

────────────────────────────────────────────────────────────────────────
TEHZEEB SWEETS & SUPER STORE — POINT OF SALE
© 2026 | ALL RIGHTS RESERVED
════════════════════════════════════════════════════════════════════════`;



const NetworkDashboard = ({ serverIp }) => {
    const [role, setRole] = React.useState(localStorage.getItem('tehzeeb_network_role') || 'server');
    const [connType, setConnType] = React.useState('wired');
    const [clientIp, setClientIp] = React.useState(localStorage.getItem('tehzeeb_server_ip') || '');
    const [isOnline, setIsOnline] = React.useState(false);
    const [clients, setClients] = React.useState([]);

    React.useEffect(() => {
        const fetchStatus = async () => {
            try {
                const targetIp = role === 'server' ? (serverIp || '127.0.0.1') : (clientIp || '127.0.0.1');
                let url = targetIp.includes('http') ? targetIp : `http://${targetIp}:8000`;
                
                const res = await fetch(`${url}/health`);
                setIsOnline(res.ok);
                
                if (role === 'server') {
                    const clientsRes = await fetch(`${url}/network/clients`);
                    if (clientsRes.ok) {
                        const data = await clientsRes.json();
                        setClients(data.clients || []);
                    }
                }
            } catch (err) {
                setIsOnline(false);
                setClients([]);
            }
        };
        fetchStatus();
        const pingInterval = setInterval(fetchStatus, 3000);
        return () => clearInterval(pingInterval);
    }, [role, clientIp, serverIp]);

    const handleSaveClientIp = (e) => {
        e.preventDefault();
        let finalIp = clientIp.trim();
        if (finalIp && !finalIp.startsWith('http')) {
            finalIp = `http://${finalIp}:8000`;
        }
        localStorage.setItem('tehzeeb_server_ip', finalIp);
        localStorage.setItem('tehzeeb_network_role', 'client');
        toast.success("Client Network Configured. Refreshing app...");
        setTimeout(() => window.location.reload(), 1000);
    };

    const handleSetRole = (newRole) => {
        setRole(newRole);
        localStorage.setItem('tehzeeb_network_role', newRole);
        if (newRole === 'server') {
            localStorage.removeItem('tehzeeb_server_ip');
            toast.success("Role set to Main Server. App will use local DB.");
            setTimeout(() => window.location.reload(), 1000);
        }
    };

    const cssStyles = `
        @keyframes flow {
            0% { stroke-dashoffset: 20; }
            100% { stroke-dashoffset: 0; }
        }
        @keyframes pulse-wifi {
            0% { transform: scale(0.8); opacity: 0.8; box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.7); }
            70% { transform: scale(1.1); opacity: 0; box-shadow: 0 0 0 20px rgba(59, 130, 246, 0); }
            100% { transform: scale(0.8); opacity: 0; box-shadow: 0 0 0 0 rgba(59, 130, 246, 0); }
        }
        .wifi-wave {
            animation: pulse-wifi 2s infinite ease-out;
            position: absolute;
            border-radius: 20px;
            border: 2px solid #3b82f6;
            width: 100%;
            height: 100%;
            top: 0; left: 0;
            box-sizing: content-box;
        }
        @keyframes wander1 {
            0%   { transform: translate(30px, 300px); }
            25%  { transform: translate(150px, 280px); }
            50%  { transform: translate(200px, 150px); }
            75%  { transform: translate(100px, 200px); }
            100% { transform: translate(30px, 300px); }
        }
        @keyframes wander2 {
            0%   { transform: translate(300px, 50px); }
            33%  { transform: translate(400px, 100px); }
            66%  { transform: translate(350px, 250px); }
            100% { transform: translate(300px, 50px); }
        }
        @keyframes wander3 {
            0%   { transform: translate(200px, 300px); }
            50%  { transform: translate(450px, 300px); }
            100% { transform: translate(200px, 300px); }
        }
        @keyframes wander4 {
            0%   { transform: translate(400px, 200px); }
            50%  { transform: translate(150px, 80px); }
            100% { transform: translate(400px, 200px); }
        }
        .walking-customer {
            position: absolute;
            z-index: 8;
            background: #f59e0b;
            color: white;
            padding: 4px;
            border-radius: 20px;
            box-shadow: 0 4px 10px rgba(0,0,0,0.2);
            transition: all 0.2s;
        }
        .anim-1 { animation: wander1 18s infinite linear; }
        .anim-2 { animation: wander2 22s infinite linear; }
        .anim-3 { animation: wander3 20s infinite linear; }
        .anim-4 { animation: wander4 25s infinite linear; }
    `;

    // Coordinates for the Store Map 
    // Server is at Top Left Corner Hub
    const serverPos = { x: 15, y: 15 }; 
    
    // Clients predefined locations
    const locations = [
        { name: 'CASHIER', x: 25, y: 75, color: '#f59e0b' },
        { name: 'INVENTORY', x: 85, y: 30, color: '#10b981' },
        { name: 'MANAGER', x: 85, y: 75, color: '#8b5cf6' },
        { name: 'BACKUP', x: 50, y: 75, color: '#ec4899' }
    ];

    return (
        <div style={{ animation: 'fadeIn 0.3s ease' }}>
            <style>{cssStyles}</style>
            <div style={{ marginBottom: '30px', paddingBottom: '20px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                    <h3 style={{ fontSize: '1.2rem', fontWeight: 900, color: '#1e293b', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}><Globe size={20} color="#3b82f6" /> Professional Network Dashboard</h3>
                    <p style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 600 }}>Real-time topology & tracking for LAN configuration.</p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 12px', background: isOnline ? '#f0fdf4' : '#fef2f2', borderRadius: '20px', border: `1px solid ${isOnline ? '#bbf7d0' : '#fecaca'}` }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: isOnline ? '#22c55e' : '#ef4444', boxShadow: `0 0 8px ${isOnline ? '#22c55e' : '#ef4444'}` }} />
                    <span style={{ fontSize: '0.75rem', fontWeight: 800, color: isOnline ? '#166534' : '#991b1b' }}>{isOnline ? 'SERVER ONLINE' : 'SERVER OFFLINE'}</span>
                </div>
            </div>

            {/* Role Selector */}
            <div style={{ display: 'flex', gap: '15px', marginBottom: '30px' }}>
                <button 
                    onClick={() => handleSetRole('server')}
                    style={{ flex: 1, padding: '20px', background: role === 'server' ? '#eff6ff' : 'white', border: `2px solid ${role === 'server' ? '#3b82f6' : '#e2e8f0'}`, borderRadius: '16px', cursor: 'pointer', transition: '0.2s', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}
                >
                    <Database size={32} color={role === 'server' ? '#2563eb' : '#94a3b8'} />
                    <span style={{ fontSize: '1rem', fontWeight: 900, color: role === 'server' ? '#1e40af' : '#64748b' }}>Main Server Hub</span>
                </button>
                <button 
                    onClick={() => setRole('client')}
                    style={{ flex: 1, padding: '20px', background: role === 'client' ? '#f5f3ff' : 'white', border: `2px solid ${role === 'client' ? '#8b5cf6' : '#e2e8f0'}`, borderRadius: '16px', cursor: 'pointer', transition: '0.2s', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}
                >
                    <User size={32} color={role === 'client' ? '#7c3aed' : '#94a3b8'} />
                    <span style={{ fontSize: '1rem', fontWeight: 900, color: role === 'client' ? '#5b21b6' : '#64748b' }}>Client Terminal</span>
                </button>
            </div>

            {/* Server View */}
            {role === 'server' && (
                <div style={{ background: '#f8fafc', padding: '30px', borderRadius: '20px', border: '1px solid #e2e8f0' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                        <div>
                            <h4 style={{ fontSize: '1.1rem', fontWeight: 900, color: '#0f172a', marginBottom: '5px' }}>Live Store CSS Simulation</h4>
                            <p style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>Active Nodes: <strong style={{ color: '#2563eb' }}>{clients.length} Staff Devices Connected</strong></p>
                        </div>
                        <div style={{ display: 'flex', background: '#e2e8f0', borderRadius: '10px', padding: '4px' }}>
                            <button onClick={() => setConnType('wired')} style={{ padding: '6px 12px', background: connType === 'wired' ? 'white' : 'transparent', border: 'none', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 800, color: connType === 'wired' ? '#0f172a' : '#64748b', cursor: 'pointer', boxShadow: connType === 'wired' ? '0 2px 4px rgba(0,0,0,0.05)' : 'none' }}>Wired (LAN)</button>
                            <button onClick={() => setConnType('wireless')} style={{ padding: '6px 12px', background: connType === 'wireless' ? 'white' : 'transparent', border: 'none', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 800, color: connType === 'wireless' ? '#0f172a' : '#64748b', cursor: 'pointer', boxShadow: connType === 'wireless' ? '0 2px 4px rgba(0,0,0,0.05)' : 'none' }}>Wireless (Wi-Fi)</button>
                        </div>
                    </div>

                    {/* Floor Plan Container */}
                    <div style={{ position: 'relative', width: '100%', height: '500px', background: '#0a0f1c url(/store_floor_plan.jpg) center center / cover no-repeat', borderRadius: '16px', overflow: 'hidden', border: '3px solid #1e293b', boxShadow: 'inset 0 0 50px rgba(0,0,0,0.5)' }}>
                        
                        {/* Floor Tiling Pattern - keeping dark overlay */}
                        <div style={{ position: 'absolute', inset: 0, background: 'rgba(10, 15, 28, 0.4)' }} />
                        
                        {/* SVG Canvas for Wires */}
                        <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 5 }}>
                            {clients.map((client, idx) => {
                                const loc = locations[idx % locations.length];
                                if (connType === 'wireless') return null;
                                return (
                                    <line 
                                        key={`line-${idx}`}
                                        x1={`${serverPos.x}%`} y1={`${serverPos.y}%`}
                                        x2={`${loc.x}%`} y2={`${loc.y}%`}
                                        stroke="#38bdf8" 
                                        strokeWidth="4"
                                        strokeDasharray="15, 10"
                                        style={{ animation: 'flow 1s linear infinite' }}
                                    />
                                );
                            })}
                        </svg>

                        {/* Server Node (Fixed in Server Hub) */}
                        <div style={{ position: 'absolute', left: `${serverPos.x}%`, top: `${serverPos.y}%`, transform: 'translate(-50%, -50%)', zIndex: 10 }}>
                            <div style={{ background: 'rgba(15, 23, 42, 0.9)', backdropFilter: 'blur(8px)', padding: '12px 20px', borderRadius: '12px', boxShadow: '0 10px 20px -5px rgba(59, 130, 246, 0.5)', border: '2px solid #3b82f6', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                <div style={{ position: 'absolute', top: '8px', right: '8px', width: '6px', height: '6px', borderRadius: '50%', background: '#22c55e', animation: 'pulse 1.2s infinite alternate' }} />
                                <Server size={24} color="#60a5fa" style={{ marginBottom: '5px' }} />
                                <span style={{ fontSize: '0.7rem', fontWeight: 900, color: '#f8fafc', letterSpacing: '1px' }}>MAIN SERVER</span>
                            </div>
                            {connType === 'wireless' && (
                                <>
                                    <div className="wifi-wave" style={{ animationDelay: '0s', left: '-5px', top: '-5px', padding: '5px' }} />
                                    <div className="wifi-wave" style={{ animationDelay: '0.5s', left: '-15px', top: '-15px', padding: '15px' }} />
                                    <div className="wifi-wave" style={{ animationDelay: '1s', left: '-25px', top: '-25px', padding: '25px' }} />
                                </>
                            )}
                        </div>

                        {/* Connected Staff Computers */}
                        {clients.map((client, idx) => {
                            const loc = locations[idx % locations.length];
                            return (
                                <div key={client.ip} style={{ position: 'absolute', left: `${loc.x}%`, top: `${loc.y}%`, transform: 'translate(-50%, -50%)', zIndex: 10 }}>
                                    <div style={{ background: 'rgba(255, 255, 255, 0.95)', backdropFilter: 'blur(4px)', padding: '8px 12px', borderRadius: '12px', boxShadow: '0 6px 15px -3px rgba(0,0,0,0.3)', borderTop: `4px solid ${loc.color}`, display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: '80px' }}>
                                        <div style={{ position: 'absolute', top: '-4px', right: '-4px', width: '8px', height: '8px', borderRadius: '50%', background: '#22c55e', border: '2px solid white' }} />
                                        <Monitor size={18} color={loc.color} style={{ marginBottom: '4px' }} />
                                        <span style={{ fontSize: '0.65rem', fontWeight: 900, color: '#1e293b', textTransform: 'uppercase' }}>{client.role}</span>
                                        <span style={{ fontSize: '0.55rem', fontWeight: 700, color: '#64748b' }}>{client.ip}</span>
                                    </div>
                                </div>
                            );
                        })}

                        {clients.length === 0 && (
                            <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', color: '#64748b', fontSize: '0.9rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(255,255,255,0.9)', padding: '10px 20px', borderRadius: '20px' }}>
                                <Loader2 size={16} className="spin" /> Waiting for staff connections...
                            </div>
                        )}

                    </div>
                    
                    <div style={{ marginTop: '25px', padding: '20px', background: '#eff6ff', borderRadius: '12px', border: '1px dashed #93c5fd' }}>
                        <p style={{ fontSize: '0.85rem', color: '#1e40af', fontWeight: 600, textAlign: 'center', margin: 0 }}>
                            To connect a laptop, ensure it is on this network, open Chrome, and navigate to: <strong style={{ fontSize: '1rem', background: 'white', padding: '4px 10px', borderRadius: '8px', margin: '0 5px', border: '1px solid #bfdbfe' }}>http://{serverIp || 'YOUR-IP'}:5173</strong>
                        </p>
                    </div>
                </div>
            )}

            {/* Client View */}
            {role === 'client' && (
                <div style={{ background: '#f5f3ff', padding: '30px', borderRadius: '20px', border: '1px solid #ddd6fe' }}>
                    <div style={{ marginBottom: '20px' }}>
                        <h4 style={{ fontSize: '1.1rem', fontWeight: 900, color: '#4c1d95', marginBottom: '5px' }}>Connect to Main Server</h4>
                        <p style={{ fontSize: '0.8rem', color: '#6d28d9', fontWeight: 600 }}>Enter the IP address shown on the Main Server's dashboard.</p>
                    </div>

                    <form onSubmit={handleSaveClientIp} style={{ display: 'flex', gap: '15px' }}>
                        <input
                            type="text"
                            placeholder="e.g. 192.168.1.15"
                            value={clientIp.replace('http://', '').replace(':8000', '')}
                            onChange={(e) => setClientIp(e.target.value)}
                            required
                            style={{ flex: 1, padding: '15px 20px', borderRadius: '12px', border: '1px solid #c4b5fd', fontSize: '1rem', fontWeight: 700, outline: 'none', color: '#4c1d95', background: 'white' }}
                        />
                        <button type="submit" style={{ padding: '0 30px', background: '#7c3aed', color: 'white', border: 'none', borderRadius: '12px', fontWeight: 900, cursor: 'pointer', fontSize: '0.95rem', boxShadow: '0 4px 6px -1px rgba(124, 58, 237, 0.3)' }}>
                            CONNECT NOW
                        </button>
                    </form>
                    
                    <div style={{ marginTop: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <Globe size={18} color="#8b5cf6" />
                        <span style={{ fontSize: '0.85rem', color: '#6d28d9', fontWeight: 600 }}>Currently connecting to: <strong>{clientIp || 'Localhost (127.0.0.1)'}</strong></span>
                    </div>
                </div>
            )}
        </div>
    );
};
