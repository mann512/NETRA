import React, { useEffect, useState } from 'react';
import { api } from '../api';

export default function Alerts({ caseId }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => { load(); }, [caseId]);

  async function load() {
    setLoading(true);
    try {
      const res = await api.alerts(caseId);
      setData(res);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }

  if (loading) return <div style={s.loading}>SCANNING FOR PATTERNS...</div>;
  if (!data) return <div style={s.loading}>No data</div>;

  const sevColor = {
    HIGH: '#f85149',
    MEDIUM: '#d29922',
    LOW: '#58a6ff',
  };

  return (
    <div>
      <div style={s.sectionHead}>
        <span>◤ SUSPICIOUS PATTERN ENGINE ◢</span>
        <span style={s.sectionMeta}>
          {data.total} ALERT{data.total !== 1 ? 'S' : ''} DETECTED
        </span>
      </div>

      <div style={s.note}>
        <b>NOTE:</b> These are investigative leads, not accusations.
        Patterns require human verification before action.
      </div>

      {data.alerts.length === 0 ? (
        <div style={s.empty}>
          No suspicious patterns detected in current case data.
          Upload more evidence to enable richer analysis.
        </div>
      ) : (
        <div style={s.grid}>
          {data.alerts.map((a, i) => (
            <div key={i} style={s.alertCard}>
              <div style={s.alertHead}>
                <span style={{ ...s.sev, color: sevColor[a.severity] || '#8b949e' }}>
                  ● {a.severity}
                </span>
                <span style={s.type}>{a.type}</span>
              </div>
              <div style={s.alertTitle}>{a.title}</div>
              <div style={s.alertDesc}>{a.description}</div>
              {a.involved && a.involved.length > 0 && (
                <div style={s.alertInvolved}>
                  <b>INVOLVED:</b> {a.involved.slice(0, 5).join(' · ')}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const s = {
  sectionHead: { display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #30363d', paddingBottom: 10, marginBottom: 16, fontSize: 11, color: '#d29922', fontFamily: 'Consolas, monospace', letterSpacing: 2 },
  sectionMeta: { color: '#6e7681' },
  loading: { padding: 30, color: '#6e7681', fontFamily: 'Consolas, monospace', fontSize: 11, textAlign: 'center' },
  note: { background: '#d2992210', border: '1px solid #d2992240', padding: 10, fontSize: 10, color: '#d29922', fontFamily: 'Consolas, monospace', marginBottom: 16, lineHeight: 1.6 },
  empty: { padding: 40, textAlign: 'center', color: '#6e7681', fontFamily: 'Consolas, monospace', fontSize: 11, fontStyle: 'italic' },
  grid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 },
  alertCard: { background: '#161b22', border: '1px solid #30363d', padding: 14 },
  alertHead: { display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 10, fontFamily: 'Consolas, monospace', letterSpacing: 1 },
  sev: { fontWeight: 'bold' },
  type: { color: '#6e7681', fontSize: 9 },
  alertTitle: { fontSize: 13, color: '#e6edf3', fontWeight: 'bold', marginBottom: 6 },
  alertDesc: { fontSize: 11, color: '#8b949e', lineHeight: 1.6, marginBottom: 8 },
  alertInvolved: { fontSize: 10, color: '#6e7681', fontFamily: 'Consolas, monospace', borderTop: '1px solid #21262d', paddingTop: 6 },
};