import sys

file_path = "/Users/mac/React-native/Tahzeeb-Bakers/POS-System/src/pages/Inventory.jsx"

with open(file_path, "r") as f:
    text = f.read()

text = text.replace("""                                            <div>
                                                <label style={L}>{isWeight ? 'Stock (kg)' : 'Stock'}</label>""", """                                    <div style={card}>
                                        <div style={sectionTitle}><Layers size={13} /> Stock & Expiry</div>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '14px' }}>
                                            <div>
                                                <label style={L}>{isWeight ? 'Stock (kg)' : 'Stock'}</label>""")

with open(file_path, "w") as f:
    f.write(text)

