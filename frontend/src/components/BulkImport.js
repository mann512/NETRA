import React, { useState } from 'react';
import { api } from '../api';

export default function BulkImport({ caseId }) {
  const [file, setFile] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const sampleCsv = `type,value,relation,target_type,target_value
Person,Rahul Sharma,associated_with,Phone,9811234567
Phone,9811234567,linked_to,BankAccount,123456789012
Person,Amit Verma,owns,Vehicle,DL-01-AB-1234
BankAccount,123456789012,associated_with,Location,Delhi
Person,Vikram Singh,associated_with,Phone,9876543210`;

  async function upload(e) {
    e.preventDefault();
    if (!file) return alert('CSV file select karo');
    setLoading(true);
    try {
      const res = await api.bulkImport(caseId, file);
      setResult(res);
      window.dispatchEvent(new Event('refresh-graph'));
    } catch (e) {
      alert(e.message);
    } finally { setLoading(false); }
  }

  function downloadSample() {
    const blob = new Blob([sampleCsv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'netra_sample.csv';
    a.click();
  }

  return (
    <div>
      <div style={s.sectionHead}>
        <span>◤ BULK CSV IMPORT ◢</span>
        <span style={s.sectionMeta}>CASE #{caseId}</span>
      </div>

      <div style={s.note}>
        <b>USE:</b> Ek CSV file mein pura network upload karo. Har row mein ek entity
        aur uska connection ho sakta hai. <b>Sample download karo</b> format dekhne ke liye.
      </div>

      <div style={s.panel}>
        <div style={s.panelHead}>CSV FORMAT</div>
        <div style={s.panelBody}>
          <table style={s.table}>
            <thead>
              <tr>
                <th style={s.th}>Column</th>
                <th style={s.th}>Required</th>
                <th style={s.th}>Description</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={s.td}><code>type</code></td>
                <td style={s.td}>✅</td>
                <td style={s.td}>Entity type (Person, Phone, Vehicle, etc.)</td>
              </tr>
              <tr>
                <td style={s.td}><code>value</code></td>
                <td style={s.td}>✅</td>
                <td style={s.td}>Entity value (Rahul Sharma, 9811234567)</td>
              </tr>
              <tr>
                <td style={s.td}><code>relation</code></td>
                <td style={s.td}>optional</td>
                <td style={s.td}>Relation name (associated_with, owns)</td>
              </tr>
              <tr>
                <td style={s.td}><code>target_type</code></td>
                <td style={s.td}>optional</td>
                <td style={s.td}>Link to this entity type</td>
              </tr>
              <tr>
                <td style={s.td}><code>target_value</code></td>
                <td style={s.td}>optional</td>
                <td style={s.td}>Link to this entity value</td>
              </tr>
            </tbody>
          </table>

          <button style={s.sampleBtn} onClick={downloadSample}>
            ▼ DOWNLOAD SAMPLE CSV
          </button>
        </div>
      </div>

      <form onSubmit={upload} style={s.panel}>
        <div style={s.panelHead}>UPLOAD CSV</div>
        <div style={s.panelBody}>
          <input
            type="file"
            accept=".csv,.txt"
            onChange={(e) => setFile(e.target.files[0])}
            style={s.fileInput}
          />
          <div style={s.btnRow}>
            <button type="submit" style={s.btn} disabled={loading || !file}>
              {loading ? 'IMPORTING...' : '▶ IMPORT CSV'}
            </button>
          </div>
        </div>
      </form>

      {result && (
        <div style={s.panel}>
          <div style={s.panelHead}>IMPORT RESULT</div>
          <div style={s.panelBody}>
            <div style={s.stat}><span>Entities added:</span><b style={{color:'#3fb950'}}>{result.entities_added}</b></div>
            <div style={s.stat}><span>Relationships added:</span><b style={{color:'#3fb950'}}>{result.relationships_added}</b></div>
            {result.errors && result.errors.length > 0 && (
              <div style={s.errorBox}>
                <b>⚠ {result.errors.length} errors:</b>
                {result.errors.map((e, i) => <div key={i} style={s.errLine}>• {e}</div>)}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

const s = {
  sectionHead: { display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #30363d', paddingBottom: 10, marginBottom: 16, fontSize: 11, color: '#d29922', fontFamily: 'Consolas, monospace', letterSpacing: 2 },
  sectionMeta: { color: '#6e7681' },
  note: { background: '#d2992210', border: '1px solid #d2992240', padding: 10, fontSize: 10, color: '#d29922', fontFamily: 'Consolas, monospace', marginBottom: 16, lineHeight: 1.7 },
  panel: { background: '#161b22', border: '1px solid #30363d', marginBottom: 16 },
  panelHead: { background: '#0d1117', borderBottom: '1px solid #30363d', padding: '8px 14px', fontSize: 10, color: '#d29922', fontFamily: 'Consolas, monospace', letterSpacing: 1.5 },
  panelBody: { padding: 16 },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 11, fontFamily: 'Consolas, monospace', marginBottom: 12 },
  th: { background: '#0d1117', border: '1px solid #30363d', padding: '6px 10px', textAlign: 'left', fontSize: 10, color: '#6e7681', letterSpacing: 1, fontWeight: 'normal' },
  td: { border: '1px solid #21262d', padding: '6px 10px', color: '#c9d1d9' },
  sampleBtn: { padding: '8px 16px', background: 'transparent', border: '1px solid #d29922', color: '#d29922', fontSize: 10, letterSpacing: 1.5, cursor: 'pointer', fontFamily: 'Consolas, monospace' },
  fileInput: { color: '#c9d1d9', fontSize: 12, fontFamily: 'Consolas, monospace', padding: 8 },
  btnRow: { marginTop: 12 },
  btn: { padding: '9px 20px', background: '#d29922', color: '#0d1117', border: 'none', fontSize: 11, fontWeight: 'bold', letterSpacing: 1.5, cursor: 'pointer', fontFamily: 'Consolas, monospace' },
  stat: { display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: 12, fontFamily: 'Consolas, monospace' },
  errorBox: { marginTop: 12, background: '#2d0f0f', border: '1px solid #f85149', padding: 10, color: '#f85149', fontSize: 11, fontFamily: 'Consolas, monospace' },
  errLine: { marginTop: 4, fontSize: 10 },
};