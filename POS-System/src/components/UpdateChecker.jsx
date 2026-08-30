import React, { useState, useEffect } from 'react';
import { RefreshCw, Download, AlertCircle, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import packageJson from '../../package.json';

const { ipcRenderer } = window.require ? window.require('electron') : { ipcRenderer: null };

const UpdateChecker = () => {
    const [updateStatus, setUpdateStatus] = useState('idle'); // idle, checking, available, downloading, downloaded, error
    const [message, setMessage] = useState('');
    const [progress, setProgress] = useState(0);

    useEffect(() => {
        if (!ipcRenderer) return;

        const handleMessage = (event, msg) => {
            if (msg.includes('HttpError: 404')) {
                setMessage('No updates found or repository is private.');
            } else if (msg.includes('Error')) {
                setMessage('Failed to check for updates.');
            } else {
                setMessage(msg);
            }
            console.log('Update Msg:', msg);
        };

        const handleAvailable = () => {
            setUpdateStatus('available');
            toast.success('A new update is available!');
        };

        const handleNotAvailable = () => {
            setUpdateStatus('idle');
            toast('System is up to date', { icon: '✅' });
        };

        const handleProgress = (event, progressObj) => {
            setUpdateStatus('downloading');
            setProgress(Math.round(progressObj.percent));
        };

        const handleDownloaded = () => {
            setUpdateStatus('downloaded');
            toast.success('Update ready! Restarting app...', { duration: 5000 });
        };

        ipcRenderer.on('update-message', handleMessage);
        ipcRenderer.on('update-available', handleAvailable);
        ipcRenderer.on('update-not-available', handleNotAvailable);
        ipcRenderer.on('download-progress', handleProgress);
        ipcRenderer.on('update-downloaded', handleDownloaded);

        return () => {
            ipcRenderer.removeAllListeners('update-message');
            ipcRenderer.removeAllListeners('update-available');
            ipcRenderer.removeAllListeners('update-not-available');
            ipcRenderer.removeAllListeners('download-progress');
            ipcRenderer.removeAllListeners('update-downloaded');
        };
    }, []);

    const checkUpdates = () => {
        if (!ipcRenderer) {
            toast.error('Not running in Desktop mode');
            return;
        }
        setUpdateStatus('checking');
        ipcRenderer.send('check-for-updates');
    };

    const restartAndInstall = () => {
        ipcRenderer.send('restart-app');
    };

    if (!ipcRenderer) return null;

    return (
        <div style={{ 
            marginTop: 'auto', 
            padding: '15px', 
            background: '#043b2d', 
            borderRadius: '8px', 
            margin: '10px', 
            border: '1px solid #8B2500' 
        }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontSize: '0.65rem', fontWeight: 900, color: '#FFB84D', letterSpacing: '0.5px' }}>SYSTEM VERSION {packageJson.version}</span>
                {updateStatus === 'checking' && <RefreshCw size={12} className="animate-spin" color="#FFB84D" />}
            </div>

            {updateStatus === 'idle' && (
                <button 
                    onClick={checkUpdates}
                    style={{ 
                        width: '100%', 
                        padding: '8px', 
                        background: '#8B2500', 
                        border: 'none', 
                        borderRadius: '4px', 
                        color: 'white', 
                        fontSize: '0.75rem', 
                        fontWeight: 800, 
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px'
                    }}
                >
                    <RefreshCw size={14} /> CHECK UPDATES
                </button>
            )}

            {updateStatus === 'checking' && (
                <div style={{ fontSize: '0.7rem', color: '#FCE1A8', textAlign: 'center', fontWeight: 700 }}>
                    Searching for updates...
                </div>
            )}

            {updateStatus === 'downloading' && (
                <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                        <span style={{ fontSize: '0.65rem', color: '#FCE1A8', fontWeight: 700 }}>Downloading...</span>
                        <span style={{ fontSize: '0.65rem', color: '#FCE1A8', fontWeight: 900 }}>{progress}%</span>
                    </div>
                    <div style={{ width: '100%', height: '4px', background: '#7A1E0C', borderRadius: '2px', overflow: 'hidden' }}>
                        <div style={{ width: `${progress}%`, height: '100%', background: '#FFB84D', transition: 'width 0.3s' }}></div>
                    </div>
                </div>
            )}

            {updateStatus === 'downloaded' && (
                <button 
                    onClick={restartAndInstall}
                    style={{ 
                        width: '100%', 
                        padding: '8px', 
                        background: '#FF8A1E', 
                        border: 'none', 
                        borderRadius: '4px', 
                        color: 'white', 
                        fontSize: '0.75rem', 
                        fontWeight: 900, 
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        boxShadow: '0 0 15px rgba(16, 185, 129, 0.4)'
                    }}
                >
                    <Download size={14} /> INSTALL & RESTART
                </button>
            )}

            {message && updateStatus !== 'downloading' && updateStatus !== 'downloaded' && (
                <div style={{ fontSize: '0.6rem', color: '#FFCB6B', marginTop: '5px', textAlign: 'center', opacity: 0.8 }}>
                    {message}
                </div>
            )}
        </div>
    );
};

export default UpdateChecker;
