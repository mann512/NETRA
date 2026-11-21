import React, { useEffect, useState } from 'react';
import { api } from '../api';

export default function CourtOrder({ caseId, user, caseStatus, onStatusChange }) {
  const [orders, setOrders] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [file, setFile] = useState(null);
  const [msg, setMsg] = useState(null);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    order_type: 'CONVICTION',
    court_name: '',
    judge_name: '',
    order_date: new Date().toISOString().slice(0, 10),
    verdict_summary: '',
    sentence_details: '',
    directives: '',
  });

  const canSubmit = ['SHO', 'RegionalAdmin', 'SystemAdmin'].includes(user.rank);

  useEffect(() => { load(); }, [caseId]);

  async function load() {
    try { setOrders(await api.courtOrders(caseId)); }
    catch (e) { console.error(e); }
  }

  async function submit(e) {
    e.preventDefault();
    if (!file) return setMsg({ ok: false, text: 'Court order PDF required' });
    if (!form.court_name || !form.judge_name || !form.verdict_summary) {
      return setMsg({ ok: false, text: 'Court name, judge name, verdict summary required' });
    }

    const confirmMsg = form.order_type === 'FURTHER_INVESTIGATION'
      ? 'This will RE-OPEN the case for further investigation. Confirm?'
      : 'This will FINALIZE the case and make it READ-ONLY. Confirm?';
    if (!window.confirm(confirmMsg)) return;

    setLoading(true);
    try {
      const res = await api.addCourtOrder(caseId, form, file);
      setMsg({ ok: true, text: `Court order recorded. Case status: ${res.case_status}` });
      setShowForm(false);
      setForm({ ...form, verdict_summary: '', sentence_details: '', directives: '' });
      setFile(null);
      load();
      if (onStatusChange) onStatusChange(res.case_status);
    } catch (e) {
      setMsg({ ok: false, text: e.message });
    } finally {
      setLoading(false);
    }
  }

  const isFinal = ['CONVICTED', 'ACQUITTED', 'DISCHARGED', 'CLOSED'].includes(caseStatus);

  const typeColor = {
    CONVICTION: '#f85149',
    ACQUITTAL: '#3fb950',
    DISCHARGE: '#58a6ff',
    FURTHER_INVESTIGATION: '#d29922',
    CLOSURE: '#8b949e',
  };

  return (
    <div>
      <div style={s.sectionHead}>
        <span>◤ COURT ORDERS &amp; JUDGMENT ◢</span>
        <span style={s.sectionMeta}>
          CASE #{caseId} · STATUS: <b style={{ color: isFinal ? '#f85149' : '#3fb950' }}>{caseStatus || 'OPEN'}</b>
        </span>
      </div>

      {isFinal && (
        <div style={s.lockedBanner}>
          🔒 <b>CASE FINALIZED</b> — Court order recorded. Case is now read-only.
          No new evidence, entities, or notes can be added.
          To reopen, a <b>FURTHER_INVESTIGATION</b> order must be uploaded.
        </div>
      )}

      {msg && (
        <div style={{
          ...s.msg,
          background: msg.ok ? '#0d2818' : '#2d0f0f',
          borderColor: msg.ok ? '#3fb950' : '#f85149',
          color: msg.ok ? '#3fb950' : '#f85149',
        }}>{msg.text}</div>
      )}

      {canSubmit && !isFinal && (
        <div style={{ marginBottom: 12 }}>
          <button onClick={() => setShowForm(!showForm)} style={s.btn}>
            {showForm ? '✕ CANCEL' : '＋ RECORD COURT ORDER'}
          </button>
        </div>
      )}

      {canSubmit && isFinal && (
        <div style={{ marginBottom: 12 }}>
          <button
            onClick={() => {
              setForm({ ...form, order_type: 'FURTHER_INVESTIGATION' });
              setShowForm(true);
            }}
            style={s.btn2}>
            ⟲ UPLOAD FURTHER INVESTIGATION ORDER (REOPEN)
          </button>
        </div>
      )}

      {showForm && (
        <form onSubmit={submit} style={s.panel}>
          <div style={s.panelHead}>RECORD COURT ORDER</div>
          <div style={s.panelBody}>
            <div style={s.grid2}>
              <div>
                <label style={s.label}>ORDER TYPE *</label>
                <select style={s.input} value={form.order_type}
                        onChange={(e) => setForm({ ...form, order_type: e.target.value })}>
                  <option value="CONVICTION">CONVICTION</option>
                  <option value="ACQUITTAL">ACQUITTAL</option>
                  <option value="DISCHARGE">DISCHARGE</option>
                  <option value="CLOSURE">CLOSURE</option>
                  <option value="FURTHER_INVESTIGATION">FURTHER_INVESTIGATION (reopen)</option>
                </select>
              </div>

              <div>
                <label style={s.label}>ORDER DATE *</label>
                <input style={s.input} type="date" value={form.order_date}
                       onChange={(e) => setForm({ ...form, order_date: e.target.value })} />
              </div>

              <div>
                <label style={s.label}>COURT NAME *</label>
                <input style={s.input} value={form.court_name}
                       onChange={(e) => setForm({ ...form, court_name: e.target.value })}
                       placeholder="e.g. District Court, Delhi" />
              </div>

              <div>
                <label style={s.label}>JUDGE NAME *</label>
                <input style={s.input} value={form.judge_name}
                       onChange={(e) => setForm({ ...form, judge_name: e.target.value })}
                       placeholder="e.g. Hon. Justice R. K. Sharma" />
              </div>
            </div>

            <div style={{ marginTop: 14 }}>
              <label style={s.label}>VERDICT SUMMARY *</label>
              <textarea style={s.textarea} rows={3} value={form.verdict_summary}
                        onChange={(e) => setForm({ ...form, verdict_summary: e.target.value })}
                        placeholder="Court ka verdict summary... (kaun convict hua, kya kaha)" />
            </div>

            <div style={{ marginTop: 14 }}>
              <label style={s.label}>SENTENCE DETAILS (if conviction)</label>
              <textarea style={s.textarea} rows={2} value={form.sentence_details}
                        onChange={(e) => setForm({ ...form, sentence_details: e.target.value })}
                        placeholder="e.g. 7 years RI + Rs. 50,000 fine under IPC 384" />
            </div>

            <div style={{ marginTop: 14 }}>
              <label style={s.label}>DIRECTIVES / REMARKS</label>
              <textarea style={s.textarea} rows={2} value={form.directives}
                        onChange={(e) => setForm({ ...form, directives: e.target.value })}
                        placeholder="Court ke koi aur directives..." />
            </div>

            <div style={{ marginTop: 14 }}>
              <label style={s.label}>ORDER PDF * (SHA-256 hashed)</label>
              <input type="file" accept=".pdf" onChange={(e) => setFile(e.target.files[0])}
                     style={s.fileInput} />
            </div>

            <div style={s.btnRow}>
              <button type="submit" style={s.btn} disabled={loading || !file}>
                {loading ? 'UPLOADING...' : '▶ SAVE COURT ORDER'}
              </button>
            </div>
          </div>
        </form>
      )}

      <div style={s.panel}>
        <div style={s.panelHead}>ORDER HISTORY ({orders.length})</div>
        <div style={s.panelBody}>
          {orders.length === 0 ? (
            <div style={s.empty}>no court orders recorded yet</div>
          ) : (
            orders.map((o) => (
              <div key={o.id} style={s.orderCard}>
                <div style={s.orderHead}>
                  <span style={{
                    ...s.typeBadge,
                    color: typeColor[o.order_type] || '#8b949e',
                    borderColor: typeColor[o.order_type] || '#30363d',
                  }}>
                    {o.order_type}
                  </span>
                  <span style={s.orderDate}>{o.order_date}</span>
                  <span style={s.orderCourt}>{o.court_name}</span>
                </div>
                <div style={s.orderJudge}>Hon. {o.judge_name}</div>
                <div style={s.orderSection}>
                  <b>VERDICT:</b> {o.verdict_summary}
                </div>
                {o.sentence_details && (
                  <div style={s.orderSection}>
                    <b>SENTENCE:</b> {o.sentence_details}
                  </div>
                )}
                {o.directives && (
                  <div style={s.orderSection}>
                    <b>DIRECTIVES:</b> {o.directives}
                  </div>
                )}
                <div style={s.orderMeta}>
                  <span>📄 {o.document_filename}</span>
                  <span style={s.hash}>SHA-256: {o.document_sha256.slice(0, 24)}...</span>
                  <span>Recorded: {new Date(o.uploaded_at).toLocaleString()}</span>
                </div>
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
  lockedBanner: { background: '#2d0f0f', border: '1px solid #f85149', padding: 12, fontSize: 11, color: '#f85149', fontFamily: 'Consolas, monospace', marginBottom: 16, lineHeight: 1.6 },
  msg: { padding: 10, fontSize: 11, border: '1px solid', marginBottom: 12, fontFamily: 'Consolas, monospace' },
  btn: { padding: '9px 20px', background: '#d29922', color: '#0d1117', border: 'none', fontSize: 11, fontWeight: 'bold', letterSpacing: 1.5, cursor: 'pointer', fontFamily: 'Consolas, monospace' },
  btn2: { padding: '9px 20px', background: 'transparent', color: '#d29922', border: '1px solid #d29922', fontSize: 11, fontWeight: 'bold', letterSpacing: 1.5, cursor: 'pointer', fontFamily: 'Consolas, monospace' },
  panel: { background: '#161b22', border: '1px solid #30363d', marginBottom: 16 },
  panelHead: { background: '#0d1117', borderBottom: '1px solid #30363d', padding: '8px 14px', fontSize: 10, color: '#d29922', fontFamily: 'Consolas, monospace', letterSpacing: 1.5 },
  panelBody: { padding: 16 },
  grid2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 },
  label: { display: 'block', fontSize: 10, color: '#6e7681', letterSpacing: 1.5, marginBottom: 5, fontFamily: 'Consolas, monospace' },
  input: { width: '100%', padding: '8px 10px', background: '#0d1117', border: '1px solid #30363d', color: '#e6edf3', fontSize: 12, fontFamily: 'Consolas, monospace', outline: 'none', boxSizing: 'border-box' },
  textarea: { width: '100%', padding: 10, background: '#0d1117', border: '1px solid #30363d', color: '#e6edf3', fontSize: 12, fontFamily: 'Consolas, monospace', outline: 'none', resize: 'vertical', lineHeight: 1.6, boxSizing: 'border-box' },
  fileInput: { color: '#c9d1d9', fontSize: 12, fontFamily: 'Consolas, monospace', padding: 8 },
  btnRow: { marginTop: 16, display: 'flex', gap: 8 },
  empty: { textAlign: 'center', color: '#6e7681', fontStyle: 'italic', padding: 30, fontSize: 11, fontFamily: 'Consolas, monospace' },
  orderCard: { background: '#0d1117', border: '1px solid #30363d', padding: 14, marginBottom: 12 },
  orderHead: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 },
  typeBadge: { fontSize: 10, padding: '3px 10px', border: '1px solid', letterSpacing: 1.5, fontFamily: 'Consolas, monospace', fontWeight: 'bold' },
  orderDate: { color: '#8b949e', fontSize: 11, fontFamily: 'Consolas, monospace' },
  orderCourt: { marginLeft: 'auto', color: '#6e7681', fontSize: 11, fontFamily: 'Consolas, monospace' },
  orderJudge: { fontSize: 12, color: '#d29922', fontFamily: 'Consolas, monospace', marginBottom: 10 },
  orderSection: { fontSize: 12, color: '#c9d1d9', marginBottom: 6, lineHeight: 1.6 },
  orderMeta: { marginTop: 10, paddingTop: 8, borderTop: '1px solid #21262d', fontSize: 10, color: '#6e7681', fontFamily: 'Consolas, monospace', display: 'flex', gap: 16, flexWrap: 'wrap' },
  hash: { color: '#484f58' },
};