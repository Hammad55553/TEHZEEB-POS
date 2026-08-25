import sys

file_path = "/Users/mac/React-native/Tahzeeb-Bakers/POS-System/src/pages/Inventory.jsx"

with open(file_path, "r") as f:
    lines = f.readlines()

missing_code = """
                            {(() => {
                                const L = { fontSize: '0.62rem', fontWeight: 900, color: '#64748b', display: 'block', marginBottom: '5px', letterSpacing: '0.05em', textTransform: 'uppercase' };
                                const I = { width: '100%', padding: '11px 12px', border: '1.5px solid #e2e8f0', borderRadius: '9px', fontSize: '0.9rem', fontWeight: 700, outline: 'none', boxSizing: 'border-box', background: 'white' };
                                const card = { background: 'white', border: '1px solid #eef1f5', borderRadius: '14px', padding: '16px' };
                                const sectionTitle = { fontSize: '0.6rem', fontWeight: 900, color: '#D2691E', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' };
                                const isWeight = formData.sell_type === 'weight';
                                return (
                                <>
                                    <div style={card}>
                                        <div style={sectionTitle}><Box size={13} /> Product Details</div>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: '14px' }}>
                                            <div>
                                                <label style={L}>Product Name</label>
                                                <input required style={I} value={formData.name || ''} onChange={e => setFormData({ ...formData, name: e.target.value })} />
                                            </div>
                                            <div>
                                                <label style={L}>Batch No</label>
                                                <input style={I} value={formData.batch_no || ''} onChange={e => setFormData({ ...formData, batch_no: e.target.value })} />
                                            </div>
                                        </div>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '14px', marginTop: '14px' }}>
                                            <div>
                                                <label style={L}>Category</label>
                                                <input style={I} value={formData.category || ''} onChange={e => setFormData({ ...formData, category: e.target.value })} />
                                            </div>
                                            <div>
                                                <label style={L}>Unit</label>
                                                <input style={I} value={formData.unit || ''} onChange={e => setFormData({ ...formData, unit: e.target.value })} />
                                            </div>
                                            <div>
                                                <label style={L}>Manufacturer</label>
                                                <input style={I} value={formData.manufacturer || ''} onChange={e => setFormData({ ...formData, manufacturer: e.target.value })} />
                                            </div>
                                        </div>
                                    </div>

                                    <div style={card}>
                                        <div style={sectionTitle}><Hash size={13} /> Sell Type</div>
                                        <div style={{ display: 'flex', gap: '10px' }}>
                                            <button type="button" onClick={() => setFormData({ ...formData, sell_type: 'piece' })} style={{ flex: 1, padding: '12px', borderRadius: '10px', background: !isWeight ? '#F7941D' : 'white', color: !isWeight ? 'white' : '#64748b' }}>By Piece</button>
                                            <button type="button" onClick={() => setFormData({ ...formData, sell_type: 'weight', unit: 'kg' })} style={{ flex: 1, padding: '12px', borderRadius: '10px', background: isWeight ? '#F7941D' : 'white', color: isWeight ? 'white' : '#64748b' }}>By Weight</button>
                                        </div>
                                    </div>

                                    <div style={card}>
                                        <div style={sectionTitle}><TrendingUp size={13} /> Pricing</div>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '14px' }}>
                                            <div>
                                                <label style={L}>Purchase Price</label>
                                                <input type="number" required style={I} value={formData.buy_price || ''} onChange={e => setFormData({ ...formData, buy_price: e.target.value })} />
                                            </div>
                                            <div>
                                                <label style={{ ...L, color: '#D2691E' }}>Sale Price</label>
                                                <input type="number" required style={{ ...I, border: '1.5px solid #F7941D', background: '#FFFBF2' }} value={formData.price || ''} onChange={e => setFormData({ ...formData, price: e.target.value })} />
                                            </div>
                                            <div>
                                                <label style={L}>Wholesale Price</label>
                                                <input type="number" style={{ ...I, border: '1.5px solid #FFB84D' }} value={formData.wholesale_price || ''} onChange={e => setFormData({ ...formData, wholesale_price: e.target.value })} />
                                            </div>
                                        </div>
                                        {formData.parent_id && (
                                            <div style={{ marginTop: '14px', background: '#e0e7ff', border: '1.5px dashed #6366f1', padding: '15px', borderRadius: '12px' }}>
                                                <p style={{ fontSize: '0.85rem', fontWeight: 900, color: '#4338ca' }}>PACK CONFIGURATION</p>
                                                <label style={{ ...L, color: '#3730a3' }}>Pieces inside this Pack</label>
                                                <input type="number" required style={{ ...I, border: '2px solid #818cf8' }} value={formData.pack_qty || ''} onChange={e => setFormData({ ...formData, pack_qty: e.target.value })} />
                                            </div>
                                        )}
                                    </div>
                                    <div style={card}>
                                        <div style={sectionTitle}><Layers size={13} /> Stock & Expiry</div>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '14px' }}>
"""

for i, line in enumerate(lines):
    if "<form onSubmit={handleSave} style={{ padding: '20px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '16px' }}>" in line:
        lines.insert(i + 1, missing_code)
        break

with open(file_path, "w") as f:
    f.writelines(lines)
