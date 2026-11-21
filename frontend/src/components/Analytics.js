import React, { useEffect, useState } from 'react';
import { api } from '../api';

export default function Analytics({ caseId }) {
  const [data, setData] = useState(null);

  useEffect(() => { load(); }, [caseId]);

  async function load() {
    try { setData(await api.analytics(caseId)); }
    catch (e) { console.error(e); }
  }

  if (!data) return <div style={s.loading}>LOADING ANALYSIS...</div>;

  return (
    <div>
      <div style={s.sectionHead}>
        <span>◤ GRAPH ANALYTICS REPORT ◢</span>
        <span style={s.sectionMeta}>CASE #{caseId}</span>
      </div>

      <div style={s.grid}>
        <div style={s.panel}>
          <div style={s.panelHead}>TOP CONNECTED ENTITIES · DEGREE CENTRALITY</div>
          <div style={s.panelBody}>
            {data.degree.length === 0 ? <div style={s.empty}>no data</div> : (
              <table style={s.table}>
                <thead>
                  <tr>
                    <th style={s.th}>RANK</th>
                    <th style={s.th}>ENTITY</th>
                    <th style={{ ...s.th, textAlign: 'right' }}>SCORE</th>
                  </tr>
                </thead>
                <tbody>
                  {data.degree.map((d, i) => (
                    <tr key={i}>
                      <td style={s.td}>{String(i + 1).padStart(2, '0')}</td>
                      <td style={s.td}>{d.node}</td>
                      <td style={{ ...s.td, textAlign: 'right', color: '#d29922', fontWeight: 'bold' }}>{d.score}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        <div style={s.panel}>
          <div style={s.panelHead}>BRIDGE PERSONS · BETWEENNESS CENTRALITY</div>
          <div style={s.panelBody}>
            {data.betweenness.length === 0 ? <div style={s.empty}>no data</div> : (
              <table style={s.table}>
                <thead>
                  <tr>
                    <th style={s.th}>RANK</th>
                    <th style={s.th}>ENTITY</th>
                    <th style={{ ...s.th, textAlign: 'right' }}>SCORE</th>
                  </tr>
                </thead>
                <tbody>
                  {data.betweenness.map((d, i) => (
                    <tr key={i}>
                      <td style={s.td}>{String(i + 1).padStart(2, '0')}</td>
                      <td style={s.td}>{d.node}</td>
                      <td style={{ ...s.td, textAlign: 'right', color: '#58a6ff', fontWeight: 'bold' }}>{d.score}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        <div style={{ ...s.panel, gridColumn: '1 / -1' }}>
          <div style={s.panelHead}>DETECTED COMMUNITIES / GROUPS</div>
          <div style={s.panelBody}>
            {data.communities.length === 0 ? <div style={s.empty}>no communities detected</div> : (
              data.communities.map((c, i) => (
                <div key={i} style={s.communityRow}>
                  <div style={s.communityHead}>GROUP #{String(i + 1).padStart(2, '0')} · {c.length} MEMBERS</div>
                  <div style={s.communityMembers}>{c.join(' · ')}</div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div style={s.note}>
        <b>NOTE:</b> Centrality scores indicate structural importance within the network.
        High degree = many connections. High betweenness = bridge between groups.
        These are investigative leads, not conclusions.
      </div>
    </div>
  );
}

const s = {
  loading: { padding: 24, color: '#6e7681', fontFamily: 'Consolas, monospace', fontSize: 11, letterSpacing: 2 },
  sectionHead: {
    display: 'flex', justifyContent: 'space-between',
    borderBottom: '1px solid #30363d', paddingBottom: 10, marginBottom: 16,
    fontSize: 11, color: '#d29922', fontFamily: 'Consolas, monospace', letterSpacing: 2,
  },
  sectionMeta: { color: '#6e7681' },
  grid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 },
  panel: { background: '#161b22', border: '1px solid #30363d' },
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
  empty: { color: '#6e7681', fontSize: 11, fontStyle: 'italic', padding: 8, fontFamily: 'Consolas, monospace' },
  communityRow: {
    background: '#0d1117', border: '1px solid #30363d',
    padding: 10, marginBottom: 8,
  },
  communityHead: {
    fontSize: 10, fontWeight: 'bold', color: '#d29922',
    fontFamily: 'Consolas, monospace', letterSpacing: 1.5, marginBottom: 6,
  },
  communityMembers: { fontSize: 11, color: '#8b949e', lineHeight: 1.8, fontFamily: 'Consolas, monospace' },
  note: {
    marginTop: 16, background: '#d2992210', border: '1px solid #d2992240',
    padding: 12, fontSize: 10, color: '#d29922', lineHeight: 1.7,
    fontFamily: 'Consolas, monospace',
  },
};