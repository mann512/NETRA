import React, { useState } from 'react';
import { api } from '../api';

export default function CrossCase() {
  const [q, setQ] = useState('');
  const [res, setRes] = useState(null);
  const [loading, setLoading] = useState(false);

  async function search(e) {
    e.preventDefault();
    if (!q.trim()) return;
    setLoading(true);
    try {
      setRes(await api.crossCaseSearch(q));
    } catch (e) {
      alert(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <div style={s.sectionHead}>
        <span>◤ CROSS-CASE INTELLIGENCE ◢</span>
        <span style={s.sectionMeta}>SEARCH ACROSS ALL CASES</span>
      </div>

      <div style={s.note}>
        <b>PURPOSE:</b> Ek entity (phone, vehicle, aadhaar, naam) ko <b>saare cases</b> mein
        dhundo. Jo entity multiple FIRs mein aati hai, woh link hai — yehi SIH ka core idea hai.
      </div>

      <form onSubmit={search} style={s.searchBar}>
        <span style={s.prompt}>$</span>
        <input style={s.searchInput} value={q}
               onChange={(e) => setQ(e.target.value)}
               placeholder="e.g. 9811234567, Rahul Sharma, DL-01-AB-1234, ABCDE1234F" />
        <button style={s.searchBtn} disabled={loading}>
          {loading ? '...' : 'SEARCH ALL CASES'}
        </button>
      </form>

      {res && (
        <div>
          <div style={s.resultCount}>
            {res.total_matches} entity(ies) found in 2+ cases
          </div>

          {res.matches.length === 0 ? (
            <div style={s.empty}>
              No entity found in multiple cases yet. Upload more evidence to different cases.
            </div>
          ) : (
            res.matches.map((m, i) => (
              <div key={i} style={s.matchPanel}>
                <div style={s.matchHead}>
                  <span style={s.matchType}>{m.type}</span>
                  <span style={s.matchValue}>{m.value}</span>
                  <span style={s.matchCount}>
                    ⟶ {m.cases.length} CASES
                  </span>
                </div>
                <div style={s.casesList}>
                  {m.cases.map((c, j) => (
                    <div key={j} style={s.caseRow}>
                      <span style={s.caseCode}>{c.case_code}</span>
                      <span style={s.caseTitle}>{c.title}</span>
                      <span style={s.caseJuris}>{c.jurisdiction}</span>
                      <span style={s.caseSev}>{c.sensitivity}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

const s = {
  sectionHead: { display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #30363d', paddingBottom: 10, marginBottom: 16, fontSize: 11, color: '#d29922', fontFamily: 'Consolas, monospace', letterSpacing: 2 },
  sectionMeta: { color: '#6e7681' },
  note: { background: '#d2992210', border: '1px solid #d2992240', padding: 10, fontSize: 10, color: '#d29922', fontFamily: 'Consolas, monospace', marginBottom: 16, lineHeight: 1.7 },
  searchBar: { display: 'flex', alignItems: 'center', background: '#161b22', border: '1px solid #30363d', marginBottom: 12 },
  prompt: { padding: '0 14px', color: '#d29922', fontFamily: 'Consolas, monospace', fontSize: 14, fontWeight: 'bold' },
  searchInput: { flex: 1, padding: '10px 4px', background: 'transparent', border: 'none', color: '#e6edf3', fontSize: 13, fontFamily: 'Consolas, monospace', outline: 'none' },
  searchBtn: { padding: '10px 20px', background: '#d29922', color: '#0d1117', border: 'none', fontSize: 11, fontWeight: 'bold', letterSpacing: 1.5, cursor: 'pointer', fontFamily: 'Consolas, monospace' },
  resultCount: { fontSize: 11, color: '#8b949e', fontFamily: 'Consolas, monospace', marginBottom: 12, letterSpacing: 1 },
  empty: { padding: 30, textAlign: 'center', color: '#6e7681', fontStyle: 'italic', fontFamily: 'Consolas, monospace', fontSize: 11 },
  matchPanel: { background: '#161b22', border: '1px solid #30363d', marginBottom: 12 },
  matchHead: { background: '#0d1117', padding: '10px 14px', borderBottom: '1px solid #30363d', display: 'flex', alignItems: 'center', gap: 12 },
  matchType: { fontSize: 9, padding: '2px 8px', background: '#30363d', color: '#d29922', fontFamily: 'Consolas, monospace', letterSpacing: 1 },
  matchValue: { fontSize: 14, color: '#e6edf3', fontWeight: 'bold', fontFamily: 'Consolas, monospace' },
  matchCount: { marginLeft: 'auto', color: '#f85149', fontFamily: 'Consolas, monospace', fontSize: 11, fontWeight: 'bold', letterSpacing: 1 },
  casesList: { padding: 0 },
  caseRow: { padding: '8px 14px', borderBottom: '1px solid #21262d', display: 'grid', gridTemplateColumns: '140px 1fr 100px 100px', gap: 12, alignItems: 'center', fontSize: 11, fontFamily: 'Consolas, monospace' },
  caseCode: { color: '#d29922', fontWeight: 'bold' },
  caseTitle: { color: '#c9d1d9' },
  caseJuris: { color: '#6e7681', fontSize: 10 },
  caseSev: { color: '#8b949e', fontSize: 10 },
};