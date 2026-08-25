import React from 'react';
import toast from 'react-hot-toast';

const CheckoutSuccessModal = ({ checkoutStage, lastSale, logo, resetPOS }) => {
    if (checkoutStage !== 'printed') return null;

    return (
        <div className="no-print" style={{ position: 'fixed', inset: 0, background: 'rgba(255, 255, 255, 0.98)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(10px)' }}>
            <div style={{ width: '450px', padding: '40px', textAlign: 'center' }}>

                <div style={{ marginBottom: '30px', animation: 'fadeInScale 0.5s ease-out' }}>
                    <img src={logo} alt="Tehzeeb Sweets & Super Store" style={{ height: '120px', objectFit: 'contain' }} />
                </div>

                <h2 style={{ fontSize: '1.2rem', fontWeight: 900, color: '#FF8A1E', letterSpacing: '4px', marginBottom: '10px' }}>READY FOR NEXT CUSTOMER</h2>
                <p style={{ color: '#94a3b8', marginBottom: '40px', fontWeight: 600, fontSize: '0.85rem' }}>Invoice #{lastSale?.id} is printed successfully.</p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                    <button
                        onClick={resetPOS}
                        style={{ width: '100%', padding: '20px', background: '#FF8A1E', color: 'white', border: 'none', borderRadius: '12px', fontSize: '1.1rem', fontWeight: 950, cursor: 'pointer', boxShadow: '0 20px 25px -5px rgba(16, 185, 129, 0.2)', transition: 'transform 0.2s' }}
                        onMouseOver={e => e.currentTarget.style.transform = 'scale(1.02)'}
                        onMouseOut={e => e.currentTarget.style.transform = 'scale(1.0)'}
                    >
                        CONTINUE TO NEW BILL (F10)
                    </button>

                    <div style={{ display: 'flex', gap: '10px' }}>
                        <button
                            onClick={() => window.print()}
                            style={{ flex: 1, padding: '12px', background: '#f8fafc', color: '#64748b', border: '1px solid #e2e8f0', borderRadius: '8px', fontWeight: 800, cursor: 'pointer', fontSize: '0.8rem' }}
                        >
                            RE-PRINT SLIP
                        </button>
                        <button
                            onClick={() => {
                                toast.error('Issue Reported.');
                                resetPOS();
                            }}
                            style={{ flex: 1, padding: '12px', background: '#fff1f1', color: '#ef4444', border: 'none', borderRadius: '8px', fontWeight: 800, cursor: 'pointer', fontSize: '0.8rem' }}
                        >
                            REPORT ISSUE
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CheckoutSuccessModal;
