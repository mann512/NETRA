import React, { useEffect, useState } from 'react';
import { api } from '../api';

export default function AuditLog({ user }) {
  const [logs, setLogs] = useState([]);
  const [filter, setFilter] = useState('');
  const [err, setErr] = useState('');

  useEffect(() => { load(); }, []);

  async function load() {
    try { setLogs(await api.audit()); }
    catch (e) { setErr(e.message); }
  }

  const filtered = logs.filter((l) => {
    if (!filter) return true;
    const f = filter.toLowerCase();
    return (
      (l.username || '').toLowerCase().includes(f) ||
      (l.action || '').toLowerCase().includes(f) ||
      (l.details || '').toLowerCase().includes(f) ||
      (l.rank || '').toLowerCase().includes(f)
    );
  });

  if (err) {
    return (
      <div style={s.denied}>
        <div style={s.deniedIcon}>⛔</div>
        <div style={s.deniedText}>{err}</div>
      </div>
    );
  }

  return (
    <div>
      <div style={s.sectionHead}>
        <span>◤ AUDIT TRAIL ◢</span>
        <span style={s.sectionMeta}>ROLE: {user.rank.toUpperCase()} · {filtered.length} ENTRIES</span>
      </div>

      <input style={s.filter} value={filter}
             onChange={(e) => setFilter(e.target.value)}
             placeholder="filter by username, action, details, rank..." />

      <div style={s.panel}>
        <div style={s.panelHead}>ACCESS LOG</div>
        <div style={s.panelBody}>
          <table style={s.table}>
            <thead>
              <tr>
                <th style={s.th}>ID</th>
                <th style={s.th}>TIME</th>
                <th style={s.th}>USER</th>
                <th style={s.th}>RANK</th>
                <th style={s.th}>ACTION</th>
                <th style={s.th}>DETAILS</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((l) => (
                <tr key={l.id}>
                  <td style={s.td}>{String(l.id).padStart(5, '0')}</td>
                  <td style={s.td}>{new Date(l.timestamp).toLocaleString()}</td>
                  <td style={s.td}><b>{l.username || '—'}</b></td>
                  <td style={s.td}>{l.rank || '—'}</td>
                  <td style={s.td}><span style={s.badge}>{l.action}</span></td>
                  <td style={s.td}>{l.details || '—'}</td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan="6" style={s.empty}>no audit entries</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

const s = {
  sectionHead: { display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #30363d', paddingBottom: 10, marginBottom: 16, fontSize: 11, color: '#d29922', fontFamily: 'Consolas, monospace', letterSpacing: 2 },
  sectionMeta: { color: '#6e7681' },
  filter: { width: '100%', padding: '8px 12px', background: '#161b22', border: '1px solid #30363d', color: '#e6edf3', fontSize: 12, fontFamily: 'Consolas, monospace', marginBottom: 12, outline: 'none' },
  panel: { background: '#161b22', border: '1px solid #30363d' },
  panelHead: { background: '#0d1117', borderBottom: '1px solid #30363d', padding: '8px 14px', fontSize: 10, color: '#d29922', fontFamily: 'Consolas, monospace', letterSpacing: 1.5 },
  panelBody: { padding: 0, maxHeight: 600, overflowY: 'auto' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 11, fontFamily: 'Consolas, monospace' },
  th: { background: '#0d1117', border: '1px solid #30363d', padding: '8px 10px', textAlign: 'left', fontSize: 10, color: '#6e7681', letterSpacing: 1, fontWeight: 'normal', position: 'sticky', top: 0 },
  td: { border: '1px solid #21262d', padding: '6px 10px', color: '#c9d1d9' },
  badge: { fontSize: 9, padding: '2px 6px', background: '#30363d', color: '#d29922', fontFamily: 'Consolas, monospace', letterSpacing: 0.5 },
  empty: { textAlign: 'center', color: '#6e7681', fontStyle: 'italic', padding: 30 },
  denied: { padding: 60, textAlign: 'center', background: '#161b22', border: '1px solid #30363d' },
  deniedIcon: { fontSize: 48, marginBottom: 12 },
  deniedText: { color: '#f85149', fontFamily: 'Consolas, monospace', fontSize: 13, letterSpacing: 1 },
};