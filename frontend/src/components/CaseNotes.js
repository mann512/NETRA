import React, { useEffect, useState } from 'react';
import { api } from '../api';

export default function CaseNotes({ caseId, user }) {
  const [notes, setNotes] = useState([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState(null);

  useEffect(() => { load(); }, [caseId]);

  async function load() {
    try { setNotes(await api.notes(caseId)); }
    catch (e) { console.error(e); }
  }

  async function add(e) {
    e.preventDefault();
    if (!text.trim()) return;
    setLoading(true);
    try {
      await api.addNote(caseId, text.trim());
      setText('');
      setMsg({ ok: true, text: 'Note added' });
      load();
    } catch (e) {
      setMsg({ ok: false, text: e.message });
    } finally { setLoading(false); }
  }

  async function del(id) {
    if (!window.confirm('Delete this note?')) return;
    try { await api.deleteNote(id); load(); }
    catch (e) { alert(e.message); }
  }

  return (
    <div>
      <div style={s.sectionHead}>
        <span>◤ INVESTIGATION DIARY ◢</span>
        <span style={s.sectionMeta}>CASE #{caseId} · {notes.length} ENTRIES</span>
      </div>

      {msg && (
        <div style={{
          ...s.msg,
          background: msg.ok ? '#0d2818' : '#2d0f0f',
          borderColor: msg.ok ? '#3fb950' : '#f85149',
          color: msg.ok ? '#3fb950' : '#f85149',
        }}>{msg.text}</div>
      )}

      <form onSubmit={add} style={s.formPanel}>
        <div style={s.panelHead}>NEW ENTRY</div>
        <div style={s.panelBody}>
          <textarea
            style={s.textarea}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Apne investigation notes likho... (kya hua, kisse baat hui, kya verify kiya)"
            rows={4}
          />
          <div style={s.btnRow}>
            <button type="submit" style={s.btn} disabled={loading || !text.trim()}>
              {loading ? '...' : '▶ ADD ENTRY'}
            </button>
          </div>
        </div>
      </form>

      <div style={s.panel}>
        <div style={s.panelHead}>DIARY ({notes.length})</div>
        <div style={s.panelBody}>
          {notes.length === 0 ? (
            <div style={s.empty}>no entries yet</div>
          ) : (
            notes.map((n) => (
              <div key={n.id} style={s.noteItem}>
                <div style={s.noteHead}>
                  <span style={s.noteTime}>{new Date(n.created_at).toLocaleString()}</span>
                  <span style={s.noteOfficer}>{n.officer_name} · {n.officer_rank}</span>
                  {(n.officer_id === user.id || ['SHO', 'RegionalAdmin', 'SystemAdmin'].includes(user.rank)) && (
                    <button style={s.delBtn} onClick={() => del(n.id)}>✕</button>
                  )}
                </div>
                <div style={s.noteBody}>{n.note}</div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

const s = {
  sectionHead: { display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #30363d', paddingBottom: 10, marginBottom: 16, fontSize: 11, color: '#d29922', fontFamily: 'Consolas, monospace', letterSpacing: 2 },
  sectionMeta: { color: '#6e7681' },
  msg: { padding: 10, fontSize: 11, border: '1px solid', marginBottom: 12, fontFamily: 'Consolas, monospace' },
  formPanel: { background: '#161b22', border: '1px solid #30363d', marginBottom: 16 },
  panelHead: { background: '#0d1117', borderBottom: '1px solid #30363d', padding: '8px 14px', fontSize: 10, color: '#d29922', fontFamily: 'Consolas, monospace', letterSpacing: 1.5 },
  panelBody: { padding: 16 },
  textarea: { width: '100%', padding: 10, background: '#0d1117', border: '1px solid #30363d', color: '#e6edf3', fontSize: 12, fontFamily: 'Consolas, monospace', outline: 'none', resize: 'vertical', lineHeight: 1.6 },
  btnRow: { marginTop: 12, display: 'flex', gap: 8 },
  btn: { padding: '9px 20px', background: '#d29922', color: '#0d1117', border: 'none', fontSize: 11, fontWeight: 'bold', letterSpacing: 1.5, cursor: 'pointer', fontFamily: 'Consolas, monospace' },
  panel: { background: '#161b22', border: '1px solid #30363d' },
  empty: { color: '#6e7681', fontStyle: 'italic', textAlign: 'center', padding: 30, fontFamily: 'Consolas, monospace', fontSize: 11 },
  noteItem: { borderBottom: '1px solid #21262d', padding: 12 },
  noteHead: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6, fontSize: 10, fontFamily: 'Consolas, monospace' },
  noteTime: { color: '#d29922' },
  noteOfficer: { color: '#6e7681' },
  delBtn: { marginLeft: 'auto', background: 'transparent', border: '1px solid #30363d', color: '#f85149', padding: '2px 8px', fontSize: 10, cursor: 'pointer' },
  noteBody: { fontSize: 12, color: '#c9d1d9', lineHeight: 1.7, whiteSpace: 'pre-wrap' },
};