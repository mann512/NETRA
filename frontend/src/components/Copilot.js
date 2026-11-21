import React, { useState } from 'react';
import { api } from '../api';

export default function Copilot({ caseId }) {
  const [q, setQ] = useState('');
  const [res, setRes] = useState(null);
  const [loading, setLoading] = useState(false);

  async function ask(e) {
    e.preventDefault();
    if (!q.trim()) return;
    setLoading(true);
    try { setRes(await api.copilot(caseId, q)); }
    catch (e) { alert(e.message); }
    finally { setLoading(false); }
  }

  return (
    <div>
      <div style={s.sectionHead}>
        <span>◤ ENTITY SEARCH ◢</span>
        <span style={s.sectionMeta}>CASE #{caseId}</span>
      </div>

      <form onSubmit={ask} style={s.searchBar}>
        <span style={s.prompt}>$</span>
        <input
          style={s.searchInput}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="search name, phone, IMEI, vehicle, aadhaar, location..."
        />
        <button style={s.searchBtn} disabled={loading}>
          {loading ? '...' : 'EXECUTE'}
        </button>
      </form>

      <div style={s.tip}>
        <b>SEARCH FIELDS:</b> name · phone · IMEI · Aadhaar · PAN · vehicle · bank account ·
        UPI · location · weapon · FIR number · section · crime type
      </div>

      {res && (
        <div style={s.resultPanel}>
          <div style={s.panelHead}>
            RESULTS — "{res.query}" · {res.matches.length} MATCHES
          </div>
          <div style={s.panelBody}>
            {res.matches.length === 0 ? (
              <div style={s.empty}>no matching records found in this case</div>
            ) : (
              <table style={s.table}>
                <thead>
                  <tr>
                    <th style={s.th}>#</th>
                    <th style={s.th}>TYPE</th>
                    <th style={s.th}>VALUE</th>
                  </tr>
                </thead>
                <tbody>
                  {res.matches.map((m, i) => (
                    <tr key={i}>
                      <td style={s.td}>{String(i + 1).padStart(2, '0')}</td>
                      <td style={s.td}><span style={s.badge}>{m.type}</span></td>
                      <td style={s.td}>{m.value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            <div style={s.note}>{res.note}</div>
          </div>
        </div>
      )}
    </div>
  );
}

const s = {
  sectionHead: {
    display: 'flex', justifyContent: 'space-between',
    borderBottom: '1px solid #30363d', paddingBottom: 10, marginBottom: 16,
    fontSize: 11, color: '#d29922', fontFamily: 'Consolas, monospace', letterSpacing: 2,
  },
  sectionMeta: { color: '#6e7681' },
  searchBar: {
    display: 'flex', alignItems: 'center', gap: 0,
    background: '#161b22', border: '1px solid #30363d', marginBottom: 12,
  },
  prompt: {
    padding: '0 14px', color: '#d29922',
    fontFamily: 'Consolas, monospace', fontSize: 14, fontWeight: 'bold',
  },
  searchInput: {
    flex: 1, padding: '10px 4px', background: 'transparent',
    border: 'none', color: '#e6edf3', fontSize: 13,
    fontFamily: 'Consolas, monospace', outline: 'none',
  },
  searchBtn: {
    padding: '10px 20px', background: '#d29922', color: '#0d1117',
    border: 'none', fontSize: 11, fontWeight: 'bold', letterSpacing: 1.5,
    cursor: 'pointer', fontFamily: 'Consolas, monospace',
  },
  tip: {
    background: '#0d1117', border: '1px solid #30363d',
    padding: 10, fontSize: 10, color: '#6e7681',
    marginBottom: 16, lineHeight: 1.7, fontFamily: 'Consolas, monospace',
  },
  resultPanel: { background: '#161b22', border: '1px solid #30363d' },
  panelHead: {
    background: '#0d1117', borderBottom: '1px solid #30363d',
    padding: '8px 14px', fontSize: 10, color: '#d29922',
    fontFamily: 'Consolas, monospace', letterSpacing: 1.5,
  },
  panelBody: { padding: 12 },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 11, fontFamily: 'Consolas, monospace' },
  th: {
    background: '#0d1117', border: '1px solid #30363d',
    padding: '6px 10px', textAlign: 'left', fontSize: 10,
    color: '#6e7681', letterSpacing: 1.5, fontWeight: 'normal',
  },
  td: { border: '1px solid #21262d', padding: '6px 10px', color: '#c9d1d9' },
  badge: {
    fontSize: 9, padding: '2px 6px', background: '#30363d',
    color: '#d29922', fontFamily: 'Consolas, monospace', letterSpacing: 1,
  },
  empty: { color: '#6e7681', fontSize: 11, fontStyle: 'italic', padding: 8, fontFamily: 'Consolas, monospace' },
  note: {
    marginTop: 10, fontSize: 10, color: '#6e7681',
    fontStyle: 'italic', borderTop: '1px solid #30363d',
    paddingTop: 8, fontFamily: 'Consolas, monospace',
  },
};