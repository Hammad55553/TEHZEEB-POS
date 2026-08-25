import React, { useState, useEffect } from 'react';
import { Sliders, Monitor, Type, Droplet, RotateCcw, Check, Menu as MenuIcon } from 'lucide-react';
import toast from 'react-hot-toast';

// Appearance / Format settings — saved locally and applied to the whole app.
const STORAGE_KEY = 'tehzeeb_format';

const BACKGROUNDS = [
    { id: 'cream', label: 'Cream (Default)', value: '#f1f5f9' },
    { id: 'white', label: 'Plain White', value: '#ffffff' },
    { id: 'warm', label: 'Warm', value: '#FFF7E6' },
    { id: 'slate', label: 'Cool Grey', value: '#e2e8f0' },
    { id: 'dark', label: 'Dark', value: '#1e293b' },
];

const MENU_BGS = [
    { id: 'maroon', label: 'Maroon (Default)', value: '#7A1E0C' },
    { id: 'orange', label: 'Orange', value: '#D2691E' },
    { id: 'black', label: 'Black', value: '#1e293b' },
    { id: 'green', label: 'Green', value: '#065f46' },
    { id: 'blue', label: 'Blue', value: '#1e40af' },
    { id: 'purple', label: 'Purple', value: '#5b21b6' },
];

const MENU_FGS = [
    { id: 'white', label: 'White (Default)', value: '#ffffff' },
    { id: 'gold', label: 'Gold', value: '#FFB84D' },
    { id: 'cream', label: 'Cream', value: '#FFF7E6' },
    { id: 'black', label: 'Black', value: '#1e293b' },
    { id: 'yellow', label: 'Yellow', value: '#F9C50D' },
];

const MENU_FONTS = [
    { id: 'segoe', label: 'Default', value: "'Segoe UI', Tahoma, sans-serif" },
    { id: 'arial', label: 'Arial', value: 'Arial, sans-serif' },
    { id: 'georgia', label: 'Georgia (Serif)', value: 'Georgia, serif' },
    { id: 'mono', label: 'Monospace', value: "'Roboto Mono', monospace" },
    { id: 'verdana', label: 'Verdana', value: 'Verdana, sans-serif' },
];

const ACCENTS = [
    { id: 'orange', label: 'Orange (Default)', value: '#F7941D', hover: '#D2691E', light: '#FFF7E6' },
    { id: 'red', label: 'Red', value: '#E63329', hover: '#cc2219', light: '#FDF0EF' },
    { id: 'green', label: 'Green', value: '#059669', hover: '#047857', light: '#ecfdf5' },
    { id: 'blue', label: 'Blue', value: '#2563eb', hover: '#1d4ed8', light: '#eff6ff' },
    { id: 'purple', label: 'Purple', value: '#7c3aed', hover: '#6d28d9', light: '#f5f3ff' },
];

const SCALES = [
    { id: 'small', label: 'Small', value: 0.9 },
    { id: 'normal', label: 'Normal', value: 1 },
    { id: 'large', label: 'Large', value: 1.1 },
    { id: 'xlarge', label: 'Extra Large', value: 1.2 },
];

export function applyFormat(fmt) {
    try {
        const f = fmt || JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
        const root = document.documentElement;
        if (f.scale) document.body.style.zoom = String(f.scale);
        if (f.bg) { document.body.style.background = f.bg; root.style.setProperty('--bg-main', f.bg); }
        if (f.menuBg) root.style.setProperty('--menu-bg', f.menuBg);
        if (f.menuFg) root.style.setProperty('--menu-fg', f.menuFg);
        if (f.menuFont) root.style.setProperty('--menu-font', f.menuFont);
        if (f.accent) { 
            root.style.setProperty('--primary', f.accent); 
            root.style.setProperty('--accent-green', f.accent);
            const accObj = ACCENTS.find(a => a.value === f.accent) || ACCENTS[0];
            root.style.setProperty('--primary-hover', accObj.hover);
            root.style.setProperty('--primary-light', accObj.light);
        }
    } catch (e) { /* ignore */ }
}

const Format = () => {
    const [s, setS] = useState({ scale: 1, bg: '#f1f5f9', menuBg: '#7A1E0C', menuFg: '#ffffff', menuFont: "'Segoe UI', Tahoma, sans-serif", accent: '#F7941D' });

    useEffect(() => {
        try {
            const f = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
            setS(prev => ({ ...prev, ...f }));
        } catch (e) { /* ignore */ }
    }, []);

    const update = (patch) => {
        const next = { ...s, ...patch };
        setS(next);
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch (e) {}
        applyFormat(next);
    };

    const resetAll = () => {
        const def = { scale: 1, bg: '#f1f5f9', menuBg: '#7A1E0C', menuFg: '#ffffff', menuFont: "'Segoe UI', Tahoma, sans-serif", accent: '#F7941D' };
        setS(def);
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(def)); } catch (e) {}
        applyFormat(def);
        document.body.style.zoom = '1';
        toast.success('Appearance reset to default');
    };

    const card = { background: 'white', border: '1px solid #eef1f5', borderRadius: '14px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', padding: '20px', marginBottom: '18px' };
    const title = { display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.95rem', fontWeight: 950, color: '#7A1E0C', marginBottom: '14px' };
    const opt = (active) => ({
        padding: '11px 15px', borderRadius: '10px', border: '2px solid', borderColor: active ? '#F7941D' : '#e2e8f0',
        background: active ? '#FFF7E6' : 'white', color: active ? '#8B2500' : '#64748b',
        fontWeight: 800, fontSize: '0.78rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px',
    });
    const swatch = (c, round) => ({ width: '18px', height: '18px', borderRadius: round ? '50%' : '5px', background: c, border: '1px solid #cbd5e1', display: 'inline-block' });

    return (
        <div style={{ height: '100%', overflowY: 'auto', padding: window.innerWidth <= 768 ? '12px' : '24px', maxWidth: '780px', margin: '0 auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Sliders size={24} color="#F7941D" />
                    <h2 style={{ fontSize: '1.4rem', fontWeight: 950, color: '#1e293b' }}>FORMAT / APPEARANCE</h2>
                </div>
                <button onClick={resetAll} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'white', border: '1.5px solid #e2e8f0', color: '#64748b', borderRadius: '10px', padding: '9px 14px', fontWeight: 800, fontSize: '0.75rem', cursor: 'pointer' }}>
                    <RotateCcw size={15} /> RESET
                </button>
            </div>

            {/* LIVE MENU PREVIEW */}
            <div style={{ ...card, padding: 0, overflow: 'hidden' }}>
                <div style={{ background: s.menuBg, color: s.menuFg, fontFamily: s.menuFont, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: '18px', fontWeight: 800, fontSize: '0.85rem' }}>
                    <span>DASHBOARD</span><span>NEW SALE</span><span>PRODUCTS</span><span>REPORTS</span>
                    <span style={{ marginLeft: 'auto', opacity: 0.8, fontSize: '0.7rem' }}>Menu Preview</span>
                </div>
            </div>

            {/* MENU BACKGROUND */}
            <div style={card}>
                <div style={title}><MenuIcon size={18} color="#F7941D" /> MENU BACKGROUND COLOR</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                    {MENU_BGS.map(m => (
                        <button key={m.id} onClick={() => update({ menuBg: m.value })} style={opt(s.menuBg === m.value)}>
                            <span style={swatch(m.value)} />{m.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* MENU FONT COLOR */}
            <div style={card}>
                <div style={title}><Droplet size={18} color="#F7941D" /> MENU FONT COLOR</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                    {MENU_FGS.map(m => (
                        <button key={m.id} onClick={() => update({ menuFg: m.value })} style={opt(s.menuFg === m.value)}>
                            <span style={swatch(m.value, true)} />{m.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* MENU FONT */}
            <div style={card}>
                <div style={title}><Type size={18} color="#F7941D" /> MENU FONT</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                    {MENU_FONTS.map(m => (
                        <button key={m.id} onClick={() => update({ menuFont: m.value })} style={{ ...opt(s.menuFont === m.value), fontFamily: m.value }}>
                            {s.menuFont === m.value && <Check size={14} />}{m.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* BACKGROUND */}
            <div style={card}>
                <div style={title}><Monitor size={18} color="#F7941D" /> PAGE BACKGROUND</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                    {BACKGROUNDS.map(b => (
                        <button key={b.id} onClick={() => update({ bg: b.value })} style={opt(s.bg === b.value)}>
                            <span style={swatch(b.value)} />{b.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* UI SCALE */}
            <div style={card}>
                <div style={title}><Sliders size={18} color="#F7941D" /> UI SIZE (Zoom)</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                    {SCALES.map(sc => (
                        <button key={sc.id} onClick={() => update({ scale: sc.value })} style={opt(s.scale === sc.value)}>
                            {s.scale === sc.value && <Check size={14} />}{sc.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* ACCENT */}
            <div style={card}>
                <div style={title}><Droplet size={18} color="#F7941D" /> ACCENT COLOR</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                    {ACCENTS.map(a => (
                        <button key={a.id} onClick={() => update({ accent: a.value })} style={opt(s.accent === a.value)}>
                            <span style={swatch(a.value, true)} />{a.label}
                        </button>
                    ))}
                </div>
            </div>

            <div style={{ background: '#FFF7E6', border: '1px solid #F6D9A8', borderRadius: '12px', padding: '14px 18px', fontSize: '0.82rem', color: '#8B2500', fontWeight: 700 }}>
                Appearance settings are saved on this computer and applied every time you open the POS.
            </div>
        </div>
    );
};

export default Format;
