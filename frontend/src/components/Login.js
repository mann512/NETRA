import React, { useState } from 'react';

export default function Login({ onLogin, loading }) {
  const [u, setU] = useState('');
  const [p, setP] = useState('');

  function submit(e) {
    e.preventDefault();
    onLogin(u, p);
  }

  return (
    <div style={s.page}>
      <div style={s.topBar}>
        <div style={s.topBarInner}>
          <span style={s.topLeft}>◤ SECURE ACCESS TERMINAL ◢</span>
          <span style={s.topRight}>
            <span style={s.dotGreen}>●</span> NETRA v1.0 &nbsp;|&nbsp;
            <span style={s.dotAmber}>●</span> OFFLINE MODE
          </span>
        </div>
      </div>

      <div style={s.center}>
        <div style={s.loginBox}>
          <div style={s.header}>
            <div style={s.emblem}>न्याय</div>
            <div>
              <div style={s.title}>NETRA</div>
              <div style={s.subtitle}>
                Criminal Network Intelligence &amp; Investigation Platform
              </div>
            </div>
          </div>

          <div style={s.strip}>
            <span>RESTRICTED — AUTHORISED PERSONNEL ONLY</span>
          </div>

          <form onSubmit={submit} style={s.form}>
            <div style={s.field}>
              <label style={s.label}>OFFICER ID</label>
              <input
                style={s.input}
                value={u}
                onChange={(e) => setU(e.target.value)}
                placeholder="enter officer id"
                autoComplete="off"
                autoFocus
              />
            </div>

            <div style={s.field}>
              <label style={s.label}>PASSPHRASE</label>
              <input
                style={s.input}
                type="password"
                value={p}
                onChange={(e) => setP(e.target.value)}
                placeholder="••••••••"
              />
            </div>

            <button type="submit" style={s.btn} disabled={loading}>
              {loading ? 'AUTHENTICATING...' : '▶ AUTHENTICATE'}
            </button>
          </form>

          <div style={s.meta}>
            <div style={s.metaRow}>
              <span style={s.metaKey}>ENCRYPTION</span>
              <span style={s.metaVal}>AES-256 · SHA-256</span>
            </div>
            <div style={s.metaRow}>
              <span style={s.metaKey}>SESSION</span>
              <span style={s.metaVal}>JWT · 30 MINUTES</span>
            </div>
            <div style={s.metaRow}>
              <span style={s.metaKey}>ACCESS LOG</span>
              <span style={s.metaVal}>ENABLED · AUDITED</span>
            </div>
            <div style={s.metaRow}>
              <span style={s.metaKey}>RATE LIMIT</span>
              <span style={s.metaVal}>5 ATTEMPTS / MIN</span>
            </div>
          </div>

          <div style={s.warn}>
            ⚠ Unauthorised access is punishable under IT Act 2000 &amp; BNS.
            All attempts are logged with IP address.
          </div>

          <div style={s.demo}>
            <div style={s.demoTitle}>TEST CREDENTIALS</div>
            <div style={s.demoGrid}>
              <span style={s.demoRole}>ADMIN</span>
              <span>admin1</span>
              <span style={s.demoPwd}>Admin@12345</span>

              <span style={s.demoRole}>SP</span>
              <span>sp1</span>
              <span style={s.demoPwd}>Sp@12345678</span>

              <span style={s.demoRole}>SHO</span>
              <span>sho1</span>
              <span style={s.demoPwd}>Sho@12345678</span>

              <span style={s.demoRole}>IO</span>
              <span>investigator1</span>
              <span style={s.demoPwd}>Inv@12345678</span>
            </div>
          </div>
        </div>

        <div style={s.sidePanel}>
          <div style={s.sideHead}>SYSTEM STATUS</div>
          <div style={s.sideBody}>
            <div style={s.stat}><span>DB</span><span style={s.ok}>● ONLINE</span></div>
            <div style={s.stat}><span>GRAPH ENGINE</span><span style={s.ok}>● ONLINE</span></div>
            <div style={s.stat}><span>AI EXTRACTION</span><span style={s.ok}>● ONLINE</span></div>
            <div style={s.stat}><span>INTEGRITY</span><span style={s.ok}>● VERIFIED</span></div>
            <div style={s.stat}><span>RATE LIMIT</span><span style={s.ok}>● ACTIVE</span></div>
            <div style={s.stat}><span>NODE</span><span style={s.mut}>DELHI-01</span></div>
          </div>

          <div style={s.sideHead2}>SECURITY</div>
          <div style={s.sideBody}>
            <div style={s.stat}><span>LOCKOUT</span><span style={s.ok}>5 ATTEMPTS</span></div>
            <div style={s.stat}><span>ENCRYPTION</span><span style={s.ok}>BCRYPT-12</span></div>
            <div style={s.stat}><span>MIME VALID</span><span style={s.ok}>● ON</span></div>
            <div style={s.stat}><span>CSRF</span><span style={s.ok}>● PROTECTED</span></div>
            <div style={s.stat}><span>XSS</span><span style={s.ok}>● PROTECTED</span></div>
          </div>
        </div>
      </div>

      <div style={s.footer}>
        <span>© 2026 STATE POLICE DEPARTMENT · FOR OFFICIAL USE ONLY</span>
        <span>SESSION ENCRYPTED · BUILD 2026.10.03</span>
      </div>
    </div>
  );
}

const s = {
  page: { minHeight: '100vh', background: '#0d1117', display: 'flex', flexDirection: 'column' },
  topBar: { background: '#161b22', borderBottom: '1px solid #30363d' },
  topBarInner: { display: 'flex', justifyContent: 'space-between', padding: '8px 20px', fontSize: 11, letterSpacing: 1 },
  topLeft: { color: '#d29922', fontWeight: 'bold', fontFamily: 'Consolas, monospace' },
  topRight: { color: '#8b949e', fontFamily: 'Consolas, monospace' },
  dotGreen: { color: '#3fb950' },
  dotAmber: { color: '#d29922' },
  center: {
    flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
    gap: 20, padding: 40, flexWrap: 'wrap',
  },
  loginBox: {
    background: '#161b22', border: '1px solid #30363d', width: 440,
  },
  header: { padding: 24, borderBottom: '1px solid #30363d', display: 'flex', alignItems: 'center', gap: 16 },
  emblem: {
    width: 48, height: 48, borderRadius: '50%',
    background: 'linear-gradient(135deg, #d29922, #9a6f0f)',
    color: '#0d1117', display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 15, fontWeight: 'bold',
  },
  title: { fontSize: 20, fontWeight: 'bold', letterSpacing: 4, color: '#e6edf3' },
  subtitle: { fontSize: 11, color: '#8b949e', marginTop: 2, letterSpacing: 0.5 },
  strip: {
    background: '#d2992210', borderBottom: '1px solid #d2992240',
    padding: '6px 24px', fontSize: 10, letterSpacing: 2,
    color: '#d29922', fontFamily: 'Consolas, monospace', textAlign: 'center',
  },
  form: { padding: 24 },
  field: { marginBottom: 16 },
  label: { display: 'block', fontSize: 10, letterSpacing: 1.5, color: '#8b949e', marginBottom: 6, fontFamily: 'Consolas, monospace' },
  input: {
    width: '100%', padding: '8px 12px', background: '#0d1117',
    border: '1px solid #30363d', color: '#e6edf3', fontSize: 13,
    fontFamily: 'Consolas, monospace', outline: 'none', boxSizing: 'border-box',
  },
  btn: {
    width: '100%', padding: '10px', marginTop: 4,
    background: '#d29922', color: '#0d1117', border: 'none',
    fontSize: 12, fontWeight: 'bold', letterSpacing: 1.5, cursor: 'pointer',
    fontFamily: 'Consolas, monospace',
  },
  meta: { padding: '12px 24px', borderTop: '1px solid #30363d' },
  metaRow: { display: 'flex', justifyContent: 'space-between', fontSize: 10, padding: '3px 0', fontFamily: 'Consolas, monospace' },
  metaKey: { color: '#6e7681', letterSpacing: 1 },
  metaVal: { color: '#8b949e' },
  warn: {
    background: '#d2992210', borderTop: '1px solid #d2992240',
    padding: '8px 24px', fontSize: 10, color: '#d29922',
    lineHeight: 1.5,
  },
  demo: { padding: '12px 24px', borderTop: '1px solid #30363d', background: '#0d1117' },
  demoTitle: { fontSize: 9, letterSpacing: 2, color: '#6e7681', marginBottom: 8, fontFamily: 'Consolas, monospace' },
  demoGrid: { display: 'grid', gridTemplateColumns: '50px 1fr auto', gap: '4px 10px', fontSize: 11, fontFamily: 'Consolas, monospace', alignItems: 'center' },
  demoRole: { color: '#d29922', fontSize: 9, letterSpacing: 1 },
  demoPwd: { color: '#8b949e' },
  sidePanel: { background: '#161b22', border: '1px solid #30363d', width: 240 },
  sideHead: {
    background: '#0d1117', borderBottom: '1px solid #30363d',
    padding: '8px 14px', fontSize: 10, letterSpacing: 2,
    color: '#d29922', fontFamily: 'Consolas, monospace',
  },
  sideHead2: {
    background: '#0d1117', borderTop: '1px solid #30363d', borderBottom: '1px solid #30363d',
    padding: '8px 14px', fontSize: 10, letterSpacing: 2,
    color: '#d29922', fontFamily: 'Consolas, monospace',
  },
  sideBody: { padding: 14 },
  stat: { display: 'flex', justifyContent: 'space-between', fontSize: 11, padding: '5px 0', fontFamily: 'Consolas, monospace' },
  ok: { color: '#3fb950' },
  mut: { color: '#8b949e' },
  footer: {
    background: '#161b22', borderTop: '1px solid #30363d',
    padding: '8px 20px', display: 'flex', justifyContent: 'space-between',
    fontSize: 10, color: '#6e7681', fontFamily: 'Consolas, monospace', letterSpacing: 0.5,
  },
};