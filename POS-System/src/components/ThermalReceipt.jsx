import React from 'react';

const ThermalReceipt = ({ lastSale, activeShift, logo }) => {
    if (!lastSale) return null;

    return (
        <div id="thermal-receipt" className="receipt-thermal-terminal print-only" style={{
            width: '80mm',
            margin: '0',
            padding: '4mm 2mm',
            background: 'white',
            fontFamily: '"Courier New", Courier, monospace',
            color: 'black',
            lineHeight: '1.1',
            fontSize: '11px'
        }}>
            {/* STORE HEADER */}
            <div style={{ textAlign: 'center', marginBottom: '10px' }}>
                <img src={logo} alt="" style={{ height: '40px', marginBottom: '5px', filter: 'grayscale(1)' }} />
                <h1 style={{ margin: '0 0 2px 0', fontSize: '18px', fontWeight: '900', textTransform: 'uppercase' }}>TEHZEEB SWEETS & SUPER STORE</h1>
                <p style={{ margin: 0, fontSize: '10px', fontWeight: 700 }}>Main Bazaar, Hasilpur</p>
                <p style={{ margin: 0, fontSize: '10px', fontWeight: 600 }}>Ph: 0305-6699899</p>
            </div>

            <div style={{ borderTop: '1px dashed #000', borderBottom: '1px dashed #000', padding: '5px 0', textAlign: 'left', marginBottom: '10px' }}>
                <p style={{ margin: 0, fontSize: '12px', fontWeight: 'bold' }}>SALE INVOICE</p>
                <p style={{ margin: '2px 0 0 0', fontSize: '10px' }}>OPERATOR: {(lastSale?.seller_name || activeShift?.staff_name || 'Operator')?.toUpperCase()}</p>
            </div>

            {/* TRANSACTION INFO */}
            <div style={{ marginBottom: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontWeight: 'bold' }}>INV NO: #{lastSale?.invoice_no ? (100000 + parseInt(lastSale.invoice_no)).toString() : lastSale?.id?.toString().slice(-6).toUpperCase()}</span>
                    <span style={{ textAlign: 'right' }}>DATE: {lastSale?.date?.split(',')[0]}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>PAY MODE: {lastSale?.payment_method?.toUpperCase()}</span>
                    <span style={{ textAlign: 'right' }}>TIME: {lastSale?.date?.split(',')[1]}</span>
                </div>
                
                {/* PAYMENT DETAILS (ONLINE/CARD) */}
                {lastSale?.payment_details && (
                    <div style={{ marginTop: '5px', padding: '4px', border: '1px dotted #000', borderRadius: '2px', fontSize: '10px' }}>
                        {lastSale.payment_details.provider && <div>PROVIDER: {lastSale.payment_details.provider.toUpperCase()}</div>}
                        {lastSale.payment_details.account && <div>REC. A/C: {lastSale.payment_details.account}</div>}
                        {lastSale.payment_details.customer_phone && <div style={{ fontWeight: 'bold' }}>CUST. PH: {lastSale.payment_details.customer_phone}</div>}
                    </div>
                )}

                {lastSale?.customer_name && lastSale?.customer_name !== 'WALK-IN CUSTOMER' && (
                    <div style={{ marginTop: '5px', borderTop: '1px dotted #000', paddingTop: '5px' }}>
                        <span>CUSTOMER: {(lastSale?.customer_name || '').toUpperCase()}</span>
                    </div>
                )}
            </div>

            {/* ITEM TABLE */}
            <div style={{ borderTop: '1px solid #000', borderBottom: '1px solid #000', padding: '5px 0', marginBottom: '10px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10px' }}>
                    <thead>
                        <tr style={{ borderBottom: '1px dotted #000' }}>
                            <th style={{ textAlign: 'left', paddingBottom: '3px', width: '40%' }}>ITEMS</th>
                            <th style={{ textAlign: 'center', paddingBottom: '3px' }}>QTY</th>
                            <th style={{ textAlign: 'right', paddingBottom: '3px' }}>PRICE</th>
                            <th style={{ textAlign: 'right', paddingBottom: '3px' }}>TOTAL</th>
                        </tr>
                    </thead>
                    <tbody>
                        {(lastSale?.items || []).map((item, idx) => (
                            <tr key={idx} style={{ verticalAlign: 'top' }}>
                                <td style={{ padding: '4px 0' }}>
                                    <div style={{ fontWeight: 'bold' }}>{item.name?.toUpperCase()}</div>
                                    {item.reason && <div style={{ fontSize: '9px', fontStyle: 'italic', color: '#555' }}>* {item.reason}</div>}
                                </td>
                                <td style={{ textAlign: 'center', padding: '4px 0' }}>{item.quantity}</td>
                                <td style={{ textAlign: 'right', padding: '4px 0' }}>{item.price.toFixed(0)}</td>
                                <td style={{ textAlign: 'right', padding: '4px 0' }}>{(item.price * item.quantity).toFixed(0)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* TOTALS SECTION */}
            <div style={{ marginBottom: '15px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
                    <span>GROSS TOTAL:</span>
                    <span>Rs {(lastSale?.subtotal || 0).toLocaleString()}</span>
                </div>
                {lastSale.discount > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
                        <span>TOTAL DISCOUNT:</span>
                        <span>-Rs {(lastSale?.discount || 0).toLocaleString()}</span>
                    </div>
                )}
                {lastSale.tax > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
                        <span>SALES TAX:</span>
                        <span>+Rs {(lastSale?.tax || 0).toLocaleString()}</span>
                    </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', fontWeight: '900', borderTop: '1px double #000', paddingTop: '5px', marginTop: '5px' }}>
                    <span>NET AMOUNT:</span>
                    <span>Rs {(lastSale?.total || 0).toLocaleString()}</span>
                </div>

                {lastSale?.payment_method === 'Cash' && (
                    <div style={{ marginTop: '10px', fontSize: '10px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span>CASH TENDERED:</span>
                            <span>Rs {parseFloat(lastSale?.cash_received || 0).toFixed(0)}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span>BALANCE RETURN:</span>
                            <span>Rs {Math.max(0, lastSale?.change_amount || 0).toFixed(0)}</span>
                        </div>
                    </div>
                )}
            </div>

            {/* FOOTER */}
            <div style={{ textAlign: 'center', marginTop: '20px', fontSize: '9px' }}>
                <div style={{ borderTop: '1px dashed #000', paddingTop: '10px' }}></div>
                <p style={{ margin: '0 0 2px 0', fontWeight: 'bold', fontSize: '10px' }}>THANK YOU FOR VISITING </p>
                <p style={{ margin: '4px 0 0 0', fontWeight: 600 }}>No return/exchange without original bill.</p>
                <p style={{ margin: 0 }}>Thank you for shopping with us!</p>
                <div style={{ marginTop: '4px', fontSize: '8px', color: '#555' }}>
                    Software developed by <b>asperinfotech.com</b>
                </div>
            </div>
        </div>
    );
};

export default ThermalReceipt;
