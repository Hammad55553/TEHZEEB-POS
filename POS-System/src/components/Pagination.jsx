import React, { useState, useEffect } from 'react';

/**
 * Reusable pagination bar: Prev/Next + numbered page buttons with "..." +
 * a "go to page" box. Only renders the current window of numbers (never
 * thousands of buttons).
 *
 * Props:
 *   page        - current page (1-based)
 *   totalPages  - total number of pages
 *   onChange(n) - called with the new page number
 *   totalItems  - (optional) total row count, for the "Showing X-Y of N" text
 *   pageSize    - (optional) rows per page, for the count text
 */
export default function Pagination({ page, totalPages, onChange, totalItems, pageSize }) {
  const [jump, setJump] = useState('');
  useEffect(() => { setJump(''); }, [page]);

  if (totalPages <= 1 && !totalItems) return null;

  const go = (n) => {
    const t = Math.max(1, Math.min(totalPages, Number(n) || 1));
    if (t !== page) onChange(t);
  };

  // Build the list of page numbers to show: 1 … around-current … last
  const pages = [];
  const windowSize = 1; // how many neighbours around current
  const push = (n) => { if (!pages.includes(n) && n >= 1 && n <= totalPages) pages.push(n); };
  push(1);
  for (let i = page - windowSize; i <= page + windowSize; i++) push(i);
  push(totalPages);
  pages.sort((a, b) => a - b);
  // insert gaps ("...") where numbers are not consecutive
  const withGaps = [];
  for (let i = 0; i < pages.length; i++) {
    withGaps.push(pages[i]);
    if (i < pages.length - 1 && pages[i + 1] - pages[i] > 1) withGaps.push('...');
  }

  const btn = (active, disabled) => ({
    minWidth: 38, padding: '8px 12px', borderRadius: 8,
    border: '1px solid ' + (active ? '#8B2500' : '#e2e8f0'),
    background: active ? '#8B2500' : (disabled ? '#f8fafc' : '#fff'),
    color: active ? '#fff' : (disabled ? '#cbd5e1' : '#475569'),
    fontWeight: 800, cursor: disabled ? 'not-allowed' : 'pointer',
    fontSize: '0.85rem',
  });

  const from = totalItems ? (page - 1) * (pageSize || 0) + 1 : 0;
  const to = totalItems ? Math.min(page * (pageSize || 0), totalItems) : 0;

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '12px 20px', borderTop: '1px solid #f1f5f9', background: '#fff', flexWrap: 'wrap' }}>
      {totalItems !== undefined && (
        <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748b' }}>
          {totalItems === 0 ? 'No records' : `Showing ${from}-${to} of ${totalItems}`}
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
        <button onClick={() => go(page - 1)} disabled={page <= 1} style={btn(false, page <= 1)}>‹ Back</button>

        {withGaps.map((p, i) =>
          p === '...'
            ? <span key={'g' + i} style={{ padding: '0 6px', color: '#94a3b8', fontWeight: 900 }}>…</span>
            : <button key={p} onClick={() => go(p)} style={btn(p === page, false)}>{p}</button>
        )}

        <button onClick={() => go(page + 1)} disabled={page >= totalPages} style={btn(false, page >= totalPages)}>Next ›</button>

        {/* Go-to-page box */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginLeft: 8 }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#94a3b8' }}>Go to</span>
          <input
            type="number" min={1} max={totalPages} value={jump}
            onChange={(e) => setJump(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && jump) go(jump); }}
            placeholder={String(page)}
            style={{ width: 60, padding: '8px', borderRadius: 8, border: '1px solid #e2e8f0', fontWeight: 800, textAlign: 'center', color: '#475569' }}
          />
          <button onClick={() => jump && go(jump)} style={btn(false, false)}>Go</button>
        </div>
      </div>
    </div>
  );
}
