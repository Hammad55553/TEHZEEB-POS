import React from 'react';
import { Loader2 } from 'lucide-react';

/**
 * LoadingProgress
 * A polished full-screen (or inline) loader that shows a live percentage and a
 * progress bar. Use it on data-heavy screens so users can see how much has
 * loaded instead of staring at a blank spinner.
 *
 * Props:
 *   progress  number  0-100 (clamped). The percent shown + bar width.
 *   label     string  Small caption under the percent (e.g. "Loading sales…").
 *   fullscreen boolean If true, covers the whole viewport with an overlay.
 *                      If false, renders inline in the current container.
 */
const LoadingProgress = ({ progress = 0, label = 'Loading data', fullscreen = true }) => {
  const pct = Math.max(0, Math.min(100, Math.round(progress)));

  const inner = (
    <div style={{
      width: '320px',
      maxWidth: '85vw',
      background: 'white',
      borderRadius: '20px',
      padding: '32px 28px',
      boxShadow: '0 20px 45px -12px rgba(0,0,0,0.35)',
      textAlign: 'center',
    }}>
      {/* Spinning ring + big percent */}
      <div style={{ position: 'relative', width: '80px', height: '80px', margin: '0 auto 20px' }}>
        <Loader2
          size={80}
          color="#F7941D"
          className="animate-spin"
          style={{ position: 'absolute', inset: 0, opacity: 0.25 }}
        />
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '1.35rem', fontWeight: 900, color: '#1e293b',
        }}>
          {pct}%
        </div>
      </div>

      <p style={{ fontSize: '0.9rem', fontWeight: 800, color: '#1e293b', marginBottom: '4px' }}>
        {label}
      </p>
      <p style={{ fontSize: '0.7rem', fontWeight: 700, color: '#94a3b8', marginBottom: '18px' }}>
        Please wait…
      </p>

      {/* Progress bar */}
      <div style={{
        width: '100%', height: '10px', background: '#e2e8f0',
        borderRadius: '999px', overflow: 'hidden',
      }}>
        <div style={{
          width: `${pct}%`, height: '100%',
          background: 'linear-gradient(90deg, #38bdf8, #F7941D)',
          borderRadius: '999px',
          transition: 'width 0.35s ease',
        }} />
      </div>
    </div>
  );

  if (!fullscreen) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        width: '100%', minHeight: '50vh', padding: '20px',
      }}>
        {inner}
      </div>
    );
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9998,
      background: 'rgba(15, 23, 42, 0.6)',
      backdropFilter: 'blur(6px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      {inner}
    </div>
  );
};

export default LoadingProgress;
