import React, { useState, useEffect } from 'react';
import { api } from '../api';
import GraphView from './GraphView';
import Copilot from './Copilot';
import Analytics from './Analytics';
import QuickAdd from './QuickAdd';
import Officers from './Officers';
import AuditLog from './AuditLog';
import Alerts from './Alerts';
import CrossCase from './CrossCase';
import CaseNotes from './CaseNotes';
import BulkImport from './BulkImport';
import CourtOrder from './CourtOrder';

export default function Dashboard({ user, onLogout }) {
  const [cases, setCases] = useState([]);
  const [activeCase, setActiveCase] = useState(null);
  const [tab, setTab] = useState('graph');
  const [uploading, setUploading] = useState(false);
  const [newCase, setNewCase] = useState({
    case_code: '',
    title: '',
    sensitivity: 'RESTRICTED',
  });
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    loadCases();
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (user.rank === 'SystemAdmin') setTab('officers');
  }, [user.rank]);

  async function loadCases() {
    try {
      const c = await api.cases();
      setCases(c);
      if (c.length && !activeCase) setActiveCase(c[0]);
    } catch (e) {
      if (user.rank !== 'SystemAdmin') alert(e.message);
    }
  }

  async function handleCreateCase(e) {
    e.preventDefault();
    if (!newCase.case_code || !newCase.title) {
      alert('Case Code and Title required.');
      return;
    }
    try {
      await api.createCase(newCase);
      setNewCase({ case_code: '', title: '', sensitivity: 'RESTRICTED' });
      loadCases();
    } catch (e) { alert(e.message); }
  }

  async function handleUpload(e) {
    const file = e.target.files[0];
    if (!file || !activeCase) return;
    setUploading(true);
    try {
      const res = await api.upload(activeCase.id, file);
      let msg = 'FILE UPLOADED\n\n';
      msg += 'SHA-256:\n' + res.sha256 + '\n\n';
      msg += 'ENTITIES EXTRACTED:\n';
      Object.entries(res.entities_extracted).forEach(([k, v]) => {
        msg += '  ' + k + ': ' + v + '\n';
      });
      msg += '\nRELATIONSHIPS: ' + res.relationships_found;
      alert(msg);
      setTab('graph');
      window.dispatchEvent(new Event('refresh-graph'));
    } catch (e) { alert(e.message); }
    finally { setUploading(false); e.target.value = ''; }
  }

  const rank = user.rank;
  const isSystemAdmin = rank === 'SystemAdmin';

  const caseStatus = activeCase?.status || 'OPEN';
  const isCaseLocked = ['CONVICTED', 'ACQUITTED', 'DISCHARGED', 'CLOSED'].includes(caseStatus);

  const tabs = [];

  if (!isSystemAdmin) {
    tabs.push(
      { id: 'graph', label: 'NETWORK' },
      { id: 'analytics', label: 'ANALYTICS' },
      { id: 'alerts', label: 'ALERTS' },
      { id: 'notes', label: 'NOTES' },
      { id: 'court', label: 'COURT ORDER' },
      { id: 'copilot', label: 'SEARCH' },
      { id: 'crosscase', label: 'CROSS-CASE' },
      { id: 'quickadd', label: 'DATA ENTRY' },
      { id: 'bulk', label: 'BULK IMPORT' }
    );
  }

  if (rank === 'SHO' || rank === 'RegionalAdmin' || rank === 'SystemAdmin') {
    tabs.push({ id: 'officers', label: 'OFFICERS' });
  }

  if (rank === 'SHO' || rank === 'RegionalAdmin' || rank === 'SystemAdmin') {
    tabs.push({ id: 'audit', label: 'AUDIT LOG' });
  }

  return (
    <div style={s.page}>
      <div style={s.header}>
        <div style={s.brand}>
          <div style={s.emblem}>न्याय</div>
          <div>
            <div style={s.brandTitle}>NETRA</div>
            <div style={s.brandSub}>Criminal Network Intelligence Platform</div>
          </div>
        </div>

        <div style={s.headerRight}>
          <div style={s.clock}>
            <div style={s.clockVal}>{now.toLocaleTimeString('en-IN', { hour12: false })}</div>
            <div style={s.clockDate}>{now.toLocaleDateString('en-IN')}</div>
          </div>
          <div style={s.userBox}>
            <div style={s.userName}>{user.full_name}</div>
            <div style={s.userMeta}>
              {user.rank} · {user.jurisdiction} · CLR: {user.clearance}
            </div>
          </div>
          <button onClick={onLogout} style={s.logout}>LOGOUT</button>
        </div>
      </div>

      <div style={s.statusBar}>
        <span><span style={s.green}>●</span> SYSTEM ONLINE</span>
        <span><span style={s.amber}>●</span> AUDIT LOGGING ACTIVE</span>
        <span><span style={s.green}>●</span> INTEGRITY VERIFIED</span>
        {isCaseLocked && (
          <span style={{ color: '#f85149' }}>
            ● CASE LOCKED: {caseStatus}
          </span>
        )}
        <span style={s.statusRight}>
          NODE: DELHI-01 · SESSION: {user.username.toUpperCase()} · ROLE: {rank.toUpperCase()}
        </span>
      </div>

      <div style={s.body}>
        {!isSystemAdmin && (
          <div style={s.sidebar}>
            <div style={s.sideSection}>
              <div style={s.sideHead}>CASE REGISTER ({cases.length})</div>
              <div style={s.caseList}>
                {cases.length === 0 && <div style={s.empty}>no cases registered</div>}
                {cases.map((c) => {
                  const locked = ['CONVICTED', 'ACQUITTED', 'DISCHARGED', 'CLOSED'].includes(c.status);
                  return (
                    <div key={c.id} onClick={() => setActiveCase(c)}
                         style={{
                           ...s.caseItem,
                           ...(activeCase?.id === c.id ? s.caseItemActive : {}),
                           ...(locked ? s.caseItemLocked : {}),
                         }}>
                      <div style={s.caseCode}>
                        {locked && '🔒 '}
                        {c.case_code}
                      </div>
                      <div style={s.caseTitle}>{c.title}</div>
                      <div style={s.caseMeta}>
                        <span style={s.badge}>{c.sensitivity}</span>
                        <span style={s.caseJuris}>{c.jurisdiction}</span>
                        {c.status && c.status !== 'OPEN' && (
                          <span style={{
                            ...s.badge,
                            color: locked ? '#f85149' : '#d29922',
                          }}>
                            {c.status}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div style={s.sideSection}>
              <div style={s.sideHead}>NEW CASE REGISTRATION</div>
              <form onSubmit={handleCreateCase} style={s.newCaseForm}>
                <label style={s.formLabel}>CASE CODE *</label>
                <input style={s.formInput} value={newCase.case_code}
                       onChange={(e) => setNewCase({ ...newCase, case_code: e.target.value })}
                       placeholder="FIR-2026-001" />

                <label style={s.formLabel}>TITLE *</label>
                <input style={s.formInput} value={newCase.title}
                       onChange={(e) => setNewCase({ ...newCase, title: e.target.value })}
                       placeholder="Case title" />

                <label style={s.formLabel}>SENSITIVITY</label>
                <select style={s.formInput} value={newCase.sensitivity}
                        onChange={(e) => setNewCase({ ...newCase, sensitivity: e.target.value })}>
                  <option>RESTRICTED</option>
                  <option>CONFIDENTIAL</option>
                  <option>SECRET</option>
                </select>

                <button type="submit" style={s.submitBtn}>▶ REGISTER CASE</button>
              </form>
            </div>
          </div>
        )}

        <div style={s.main}>
          {isSystemAdmin ? (
            <>
              <div style={s.tabsBar}>
                {tabs.map((t) => (
                  <div key={t.id} onClick={() => setTab(t.id)}
                       style={{ ...s.tab, ...(tab === t.id ? s.tabActive : {}) }}>
                    {t.label}
                  </div>
                ))}
              </div>
              <div style={s.content}>
                {tab === 'officers' && <Officers user={user} />}
                {tab === 'audit' && <AuditLog user={user} />}
              </div>
            </>
          ) : activeCase ? (
            <>
              <div style={s.caseBanner}>
                <div>
                  <div style={s.bannerCode}>
                    {isCaseLocked && '🔒 '}
                    {activeCase.case_code}
                  </div>
                  <div style={s.bannerTitle}>{activeCase.title}</div>
                </div>
                <div style={s.bannerRight}>
                  <div style={s.bannerMeta}>
                    <span style={s.bannerKey}>STATUS</span>
                    <span style={{
                      ...s.bannerVal,
                      color: isCaseLocked ? '#f85149' : '#3fb950',
                    }}>
                      {caseStatus}
                    </span>
                  </div>
                  <div style={s.bannerMeta}>
                    <span style={s.bannerKey}>SENSITIVITY</span>
                    <span style={s.bannerVal}>{activeCase.sensitivity}</span>
                  </div>
                  {!isCaseLocked ? (
                    <label style={s.uploadBtn}>
                      {uploading ? 'UPLOADING...' : '▲ UPLOAD EVIDENCE'}
                      <input type="file" style={{ display: 'none' }} onChange={handleUpload} disabled={uploading} />
                    </label>
                  ) : (
                    <div style={s.lockedBadge}>🔒 LOCKED</div>
                  )}
                </div>
              </div>

              {isCaseLocked && (
                <div style={s.lockedStrip}>
                  ⚠ CASE FINALIZED BY COURT ORDER — Read-only. New evidence, entities, or notes cannot be added.
                  To reopen, contact SHO/SP to upload a FURTHER_INVESTIGATION order.
                </div>
              )}

              <div style={s.tabsBar}>
                {tabs.map((t) => (
                  <div key={t.id} onClick={() => setTab(t.id)}
                       style={{ ...s.tab, ...(tab === t.id ? s.tabActive : {}) }}>
                    {t.label}
                  </div>
                ))}
              </div>

              <div style={s.content}>
                {tab === 'graph' && <GraphView caseId={activeCase.id} />}
                {tab === 'analytics' && <Analytics caseId={activeCase.id} />}
                {tab === 'alerts' && <Alerts caseId={activeCase.id} />}
                {tab === 'notes' && <CaseNotes caseId={activeCase.id} user={user} />}
                {tab === 'court' && (
                  <CourtOrder
                    caseId={activeCase.id}
                    user={user}
                    caseStatus={caseStatus}
                    onStatusChange={(newStatus) => {
                      setActiveCase({ ...activeCase, status: newStatus });
                      loadCases();
                    }}
                  />
                )}
                {tab === 'copilot' && <Copilot caseId={activeCase.id} />}
                {tab === 'crosscase' && <CrossCase />}
                {tab === 'quickadd' && <QuickAdd caseId={activeCase.id} />}
                {tab === 'bulk' && <BulkImport caseId={activeCase.id} />}
                {tab === 'officers' && <Officers user={user} />}
                {tab === 'audit' && <AuditLog user={user} />}
              </div>
            </>
          ) : (
            <>
              <div style={s.tabsBar}>
                {tabs.map((t) => (
                  <div key={t.id} onClick={() => setTab(t.id)}
                       style={{ ...s.tab, ...(tab === t.id ? s.tabActive : {}) }}>
                    {t.label}
                  </div>
                ))}
              </div>
              <div style={s.content}>
                {tab === 'crosscase' && <CrossCase />}
                {tab === 'officers' && <Officers user={user} />}
                {tab === 'audit' && <AuditLog user={user} />}
                {tab !== 'crosscase' && tab !== 'officers' && tab !== 'audit' && (
                  <div style={s.noCase}>
                    <div style={s.noCaseIcon}>⌗</div>
                    <div style={s.noCaseTitle}>NO CASE SELECTED</div>
                    <div style={s.noCaseHint}>
                      Register a new case from the sidebar or select an existing case to begin investigation.
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      <div style={s.footer}>
        <span>NETRA v1.0 · FOR OFFICIAL USE ONLY</span>
        <span>© 2026 STATE POLICE DEPARTMENT</span>
      </div>
    </div>
  );
}

const s = {
  page: { minHeight: '100vh', background: '#0d1117', display: 'flex', flexDirection: 'column' },
  header: { background: '#161b22', borderBottom: '1px solid #30363d', padding: '10px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  brand: { display: 'flex', alignItems: 'center', gap: 14 },
  emblem: { width: 38, height: 38, borderRadius: '50%', background: 'linear-gradient(135deg, #d29922, #9a6f0f)', color: '#0d1117', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 'bold' },
  brandTitle: { fontSize: 17, fontWeight: 'bold', letterSpacing: 3, color: '#e6edf3' },
  brandSub: { fontSize: 10, color: '#8b949e', letterSpacing: 0.5 },
  headerRight: { display: 'flex', alignItems: 'center', gap: 20 },
  clock: { textAlign: 'right', fontFamily: 'Consolas, monospace' },
  clockVal: { fontSize: 14, color: '#d29922', letterSpacing: 1 },
  clockDate: { fontSize: 10, color: '#8b949e' },
  userBox: { borderLeft: '1px solid #30363d', paddingLeft: 20 },
  userName: { fontSize: 12, fontWeight: 'bold', color: '#e6edf3' },
  userMeta: { fontSize: 10, color: '#8b949e', fontFamily: 'Consolas, monospace', marginTop: 2 },
  logout: { padding: '6px 14px', background: 'transparent', color: '#f85149', border: '1px solid #f85149', fontSize: 10, letterSpacing: 1.5, cursor: 'pointer', fontFamily: 'Consolas, monospace', fontWeight: 'bold' },
  statusBar: { background: '#0d1117', borderBottom: '1px solid #30363d', padding: '5px 20px', display: 'flex', gap: 24, fontSize: 10, color: '#8b949e', fontFamily: 'Consolas, monospace', letterSpacing: 1 },
  statusRight: { marginLeft: 'auto' },
  green: { color: '#3fb950' },
  amber: { color: '#d29922' },
  body: { flex: 1, display: 'flex', overflow: 'hidden' },
  sidebar: { width: 260, background: '#161b22', borderRight: '1px solid #30363d', display: 'flex', flexDirection: 'column', overflowY: 'auto' },
  sideSection: { borderBottom: '1px solid #30363d' },
  sideHead: { background: '#0d1117', padding: '8px 14px', fontSize: 10, color: '#d29922', letterSpacing: 2, fontFamily: 'Consolas, monospace', borderBottom: '1px solid #30363d' },
  caseList: { maxHeight: 320, overflowY: 'auto' },
  empty: { padding: 14, fontSize: 11, color: '#6e7681', fontStyle: 'italic', fontFamily: 'Consolas, monospace' },
  caseItem: { padding: '10px 14px', borderBottom: '1px solid #21262d', cursor: 'pointer', borderLeft: '2px solid transparent' },
  caseItemActive: { background: '#0d1117', borderLeft: '2px solid #d29922' },
  caseItemLocked: { opacity: 0.85 },
  caseCode: { fontSize: 11, fontWeight: 'bold', color: '#d29922', fontFamily: 'Consolas, monospace', letterSpacing: 1 },
  caseTitle: { fontSize: 11, color: '#c9d1d9', marginTop: 3 },
  caseMeta: { marginTop: 5, display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' },
  badge: { fontSize: 9, padding: '1px 5px', background: '#30363d', color: '#8b949e', fontFamily: 'Consolas, monospace', letterSpacing: 1 },
  caseJuris: { fontSize: 9, color: '#6e7681', fontFamily: 'Consolas, monospace' },
  newCaseForm: { padding: 14 },
  formLabel: { display: 'block', fontSize: 9, color: '#6e7681', letterSpacing: 1.5, marginTop: 8, marginBottom: 4, fontFamily: 'Consolas, monospace' },
  formInput: { width: '100%', padding: '6px 10px', background: '#0d1117', border: '1px solid #30363d', color: '#e6edf3', fontSize: 12, fontFamily: 'Consolas, monospace', outline: 'none', boxSizing: 'border-box' },
  submitBtn: { marginTop: 14, width: '100%', padding: '8px', background: '#d29922', color: '#0d1117', border: 'none', fontSize: 11, fontWeight: 'bold', letterSpacing: 1.5, cursor: 'pointer', fontFamily: 'Consolas, monospace' },
  main: { flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' },
  caseBanner: { background: '#161b22', borderBottom: '1px solid #30363d', padding: '14px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  bannerCode: { fontSize: 11, color: '#d29922', fontFamily: 'Consolas, monospace', letterSpacing: 1.5 },
  bannerTitle: { fontSize: 15, fontWeight: 'bold', color: '#e6edf3', marginTop: 3 },
  bannerRight: { display: 'flex', alignItems: 'center', gap: 20 },
  bannerMeta: { textAlign: 'right', fontFamily: 'Consolas, monospace' },
  bannerKey: { display: 'block', fontSize: 9, color: '#6e7681', letterSpacing: 1.5 },
  bannerVal: { fontSize: 11, color: '#c9d1d9', fontWeight: 'bold' },
  uploadBtn: { padding: '8px 16px', background: '#d29922', color: '#0d1117', border: 'none', fontSize: 10, fontWeight: 'bold', letterSpacing: 1.5, cursor: 'pointer', fontFamily: 'Consolas, monospace' },
  lockedBadge: { padding: '8px 16px', background: '#2d0f0f', color: '#f85149', border: '1px solid #f85149', fontSize: 10, fontWeight: 'bold', letterSpacing: 1.5, fontFamily: 'Consolas, monospace' },
  lockedStrip: { background: '#2d0f0f', borderBottom: '1px solid #f85149', padding: '8px 20px', fontSize: 10, color: '#f85149', fontFamily: 'Consolas, monospace', letterSpacing: 0.5 },
  tabsBar: { background: '#161b22', borderBottom: '1px solid #30363d', display: 'flex', padding: '0 20px', flexWrap: 'wrap' },
  tab: { padding: '10px 16px', fontSize: 10, letterSpacing: 1.3, color: '#6e7681', cursor: 'pointer', fontFamily: 'Consolas, monospace', borderBottom: '2px solid transparent', textTransform: 'uppercase' },
  tabActive: { color: '#d29922', borderBottom: '2px solid #d29922' },
  content: { flex: 1, overflowY: 'auto', padding: 20 },
  noCase: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#6e7681', minHeight: 400 },
  noCaseIcon: { fontSize: 48, color: '#30363d', fontFamily: 'Consolas, monospace' },
  noCaseTitle: { fontSize: 14, letterSpacing: 3, fontFamily: 'Consolas, monospace', marginTop: 14, color: '#8b949e' },
  noCaseHint: { fontSize: 11, marginTop: 8, maxWidth: 400, textAlign: 'center', lineHeight: 1.7 },
  footer: { background: '#161b22', borderTop: '1px solid #30363d', padding: '6px 20px', display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#6e7681', fontFamily: 'Consolas, monospace', letterSpacing: 0.5 },
};