import React, { useState, useEffect } from 'react';
import { api } from '../api';

// ---- Client-side validation patterns (mirror of backend) ----
const VALIDATORS = {
  Person: { re: /^[A-Za-z][A-Za-z\.\s]{1,60}$/, hint: 'Only letters & spaces (2-60)', ex: 'Rahul Sharma' },
  Alias: { re: /^[A-Za-z][A-Za-z\.\s]{1,40}$/, hint: 'Only letters & spaces', ex: 'Rocky' },
  Aadhaar: { re: /^\d{4}\s?\d{4}\s?\d{4}$/, hint: '12 digits', ex: '1234 5678 9012' },
  PAN: { re: /^[A-Z]{5}\d{4}[A-Z]$/, hint: '5 letters + 4 digits + 1 letter', ex: 'ABCDE1234F' },
  Passport: { re: /^[A-Z]\d{7}$/, hint: '1 letter + 7 digits', ex: 'A1234567' },
  VoterID: { re: /^[A-Z]{3}\d{7}$/, hint: '3 letters + 7 digits', ex: 'ABC1234567' },
  DrivingLicense: { re: /^[A-Z]{2}\d{2}\s?\d{4}\s?\d{7}$/, hint: 'DL + state + year + number', ex: 'DL0120201234567' },
  Phone: { re: /^(?:\+91[\s-]?)?[6-9]\d{9}$/, hint: '10 digits starting 6-9', ex: '9811234567' },
  Landline: { re: /^0\d{2,4}[\s-]?\d{6,8}$/, hint: 'Starts with 0', ex: '011-23456789' },
  IMEI: { re: /^\d{15}$/, hint: 'Exactly 15 digits', ex: '123456789012345' },
  IMSI: { re: /^\d{15}$/, hint: 'Exactly 15 digits', ex: '404101234567890' },
  SIM: { re: /^\d{15,20}$/, hint: '15-20 digits', ex: '8991012345678901234' },
  Email: { re: /^[\w\.\-]+@[\w\.\-]+\.\w+$/, hint: 'Valid email', ex: 'user@example.com' },
  IPAddress: { re: /^(?:(?:25[0-5]|2[0-4]\d|[01]?\d?\d)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d?\d)$/, hint: 'IPv4', ex: '192.168.1.1' },
  MACAddress: { re: /^([0-9A-Fa-f]{2}[:-]){5}[0-9A-Fa-f]{2}$/, hint: 'AA:BB:CC:DD:EE:FF', ex: 'AA:BB:CC:DD:EE:FF' },
  SocialHandle: { re: /^@[A-Za-z0-9_\.]{3,30}$/, hint: 'Starts with @', ex: '@username' },
  BankAccount: { re: /^\d{9,18}$/, hint: '9-18 digits', ex: '123456789012' },
  IFSC: { re: /^[A-Z]{4}0[A-Z0-9]{6}$/, hint: '4 letters + 0 + 6 chars', ex: 'HDFC0001234' },
  UPI: { re: /^[\w\.\-]{3,50}@[a-zA-Z]{3,20}$/, hint: 'username@bank', ex: 'rahul@okhdfcbank' },
  CreditCard: { re: /^(?:\d{4}[\s-]?){3}\d{4}$/, hint: '16 digits', ex: '4111111111111111' },
  TransactionID: { re: /^[A-Z0-9]{8,25}$/, hint: '8-25 alphanumeric', ex: 'TXN12345678' },
  Bank: { re: /^[A-Za-z\s]{3,40}$/, hint: 'Bank name', ex: 'HDFC Bank' },
  Amount: { re: /^[\d,]+(?:\.\d{1,2})?$/, hint: 'Digits and commas', ex: '500000' },
  Cryptocurrency: { re: /^(BTC|ETH|USDT|Bitcoin|Ethereum)$/, hint: 'BTC/ETH/USDT', ex: 'BTC' },
  WalletAddress: { re: /^(0x[a-fA-F0-9]{40}|[13][a-km-zA-HJ-NP-Z1-9]{25,34})$/, hint: 'Wallet address', ex: '0x...' },
  Vehicle: { re: /^[A-Z]{2}[\s-]?\d{1,2}[\s-]?[A-Z]{1,3}[\s-]?\d{4}$/, hint: 'DL-01-AB-1234', ex: 'DL-01-AB-1234' },
  ChassisNo: { re: /^[A-HJ-NPR-Z0-9]{17}$/, hint: '17 chars (no I,O,Q)', ex: 'MA3EYD32S00123456' },
  EngineNo: { re: /^[A-Z0-9]{8,20}$/, hint: '8-20 alphanumeric', ex: 'ENG12345678' },
  Weapon: { re: /^[A-Za-z\s\-0-9]{2,40}$/, hint: 'Letters & numbers', ex: 'Country-made pistol' },
  WeaponSerial: { re: /^[A-Z0-9\-]{5,25}$/, hint: '5-25 alphanumeric', ex: 'CP-2026-889' },
  Location: { re: /^[A-Za-z][A-Za-z\s\.\-]{1,60}$/, hint: 'City/location name', ex: 'Delhi' },
  State: { re: /^[A-Za-z][A-Za-z\s]{2,40}$/, hint: 'State name', ex: 'Punjab' },
  Pincode: { re: /^[1-9]\d{5}$/, hint: '6 digits (not starting 0)', ex: '110001' },
  GPS: { re: /^-?\d{1,3}\.\d{4,8}\s*,\s*-?\d{1,3}\.\d{4,8}$/, hint: 'lat,long', ex: '28.6139,77.2090' },
  Date: { re: /^\d{1,2}[-/]\d{1,2}[-/]\d{2,4}$/, hint: 'DD/MM/YYYY', ex: '15/03/2026' },
  Time: { re: /^(?:[01]?\d|2[0-3]):[0-5]\d(?::[0-5]\d)?\s?(?:AM|PM|am|pm)?$/, hint: 'HH:MM', ex: '14:30' },
  Year: { re: /^(19|20)\d{2}$/, hint: '4-digit year', ex: '2026' },
  FIRNumber: { re: /^\d{1,6}(?:[/-]\d{2,4})?$/, hint: '1042/2026', ex: '1042/2026' },
  Section: { re: /^[A-Za-z0-9\(\)\s\.\-]{2,60}$/, hint: 'IPC 384 etc', ex: 'IPC 384' },
  PoliceStation: { re: /^[A-Za-z][A-Za-z\s\.\-]{2,60}$/, hint: 'Station name', ex: 'Delhi Central' },
  CourtName: { re: /^[A-Za-z][A-Za-z\s\.\-]{2,60}$/, hint: 'Court name', ex: 'District Court' },
  CrimeType: { re: /^[A-Za-z][A-Za-z\s]{2,40}$/, hint: 'Crime type', ex: 'extortion' },
  Device: { re: /^[A-Za-z][A-Za-z0-9\s\-\.]{1,40}$/, hint: 'Device name', ex: 'iPhone 14' },
  App: { re: /^[A-Za-z][A-Za-z0-9\s\.\-]{1,30}$/, hint: 'App name', ex: 'WhatsApp' },
  Organization: { re: /^[A-Za-z][A-Za-z0-9\s\.\-&]{2,80}$/, hint: 'Org name', ex: 'ABC Pvt Ltd' },
};

const FALLBACK = {
  People: ['Person', 'Alias'],
  Identity: ['Aadhaar', 'PAN', 'Passport', 'VoterID', 'DrivingLicense'],
  Communication: ['Phone', 'Landline', 'IMEI', 'IMSI', 'SIM', 'Email', 'IPAddress', 'MACAddress', 'SocialHandle'],
  Finance: ['BankAccount', 'IFSC', 'UPI', 'CreditCard', 'TransactionID', 'Bank', 'Amount', 'Cryptocurrency', 'WalletAddress'],
  Vehicles: ['Vehicle', 'ChassisNo', 'EngineNo'],
  Weapons: ['Weapon', 'WeaponSerial'],
  Location: ['Location', 'State', 'Pincode', 'GPS'],
  Time: ['Date', 'Time', 'Year'],
  Legal: ['FIRNumber', 'Section', 'PoliceStation', 'CourtName', 'CrimeType'],
  Digital: ['Device', 'App'],
  Organization: ['Organization'],
};

const ALL_TYPES = [];
Object.values(FALLBACK).forEach((arr) => ALL_TYPES.push(...arr));

function clientValidate(etype, value) {
  const v = value.trim();
  if (!v) return { ok: false, msg: 'Value khali hai' };
  if (v.length < 2) return { ok: false, msg: 'Value too short (min 2 chars)' };
  if (v.length > 200) return { ok: false, msg: 'Value too long (max 200 chars)' };

  const rule = VALIDATORS[etype];
  if (rule && !rule.re.test(v)) {
    return { ok: false, msg: `${rule.hint} — example: ${rule.ex}` };
  }
  return { ok: true };
}

export default function QuickAdd({ caseId }) {
  const [categories, setCategories] = useState(FALLBACK);
  const [tab, setTab] = useState('entity');

  const [etype, setEtype] = useState('Person');
  const [eval_, setEval] = useState('');
  const [liveCheck, setLiveCheck] = useState(null);

  const [srcType, setSrcType] = useState('Person');
  const [srcVal, setSrcVal] = useState('');
  const [tgtType, setTgtType] = useState('Phone');
  const [tgtVal, setTgtVal] = useState('');
  const [srcCheck, setSrcCheck] = useState(null);
  const [tgtCheck, setTgtCheck] = useState(null);
  const [relation, setRelation] = useState('associated_with');
  const [msg, setMsg] = useState(null);

  useEffect(() => { loadTypes(); }, []);

  async function loadTypes() {
    try {
      const c = await api.entityTypes();
      if (c && Object.keys(c).length > 0) {
        const normalized = {};
        Object.entries(c).forEach(([cat, arr]) => {
          normalized[cat] = arr.map((x) => (typeof x === 'string' ? x : x.name));
        });
        setCategories(normalized);
      }
    } catch (e) { /* fallback */ }
  }

  // Live validation for single entity
  function onEntityValueChange(v) {
    setEval(v);
    if (!v.trim()) { setLiveCheck(null); return; }
    setLiveCheck(clientValidate(etype, v));
  }

  function onEtypeChange(t) {
    setEtype(t);
    if (eval_.trim()) setLiveCheck(clientValidate(t, eval_));
  }

  function onSrcChange(v) { setSrcVal(v); setSrcCheck(v.trim() ? clientValidate(srcType, v) : null); }
  function onTgtChange(v) { setTgtVal(v); setTgtCheck(v.trim() ? clientValidate(tgtType, v) : null); }

  async function submitEntity(e) {
    e.preventDefault();
    const check = clientValidate(etype, eval_);
    if (!check.ok) {
      setMsg({ ok: false, text: `❌ ${check.msg}` });
      return;
    }
    try {
      const res = await api.addEntity(caseId, { type: etype, value: eval_.trim() });
      setMsg({ ok: true, text: `✅ Added ${res.type}: ${res.value}` });
      setEval(''); setLiveCheck(null);
      window.dispatchEvent(new Event('refresh-graph'));
    } catch (e) { setMsg({ ok: false, text: `❌ ${e.message}` }); }
  }

  async function submitLink(e) {
    e.preventDefault();
    const sCheck = clientValidate(srcType, srcVal);
    const tCheck = clientValidate(tgtType, tgtVal);
    if (!sCheck.ok) { setMsg({ ok: false, text: `❌ From value: ${sCheck.msg}` }); return; }
    if (!tCheck.ok) { setMsg({ ok: false, text: `❌ To value: ${tCheck.msg}` }); return; }

    try {
      await api.manualLink(caseId, {
        source_type: srcType, source_value: srcVal.trim(),
        target_type: tgtType, target_value: tgtVal.trim(), relation,
      });
      setMsg({ ok: true, text: `✅ Linked ${srcVal} → ${tgtVal}` });
      setSrcVal(''); setTgtVal(''); setSrcCheck(null); setTgtCheck(null);
      window.dispatchEvent(new Event('refresh-graph'));
    } catch (e) { setMsg({ ok: false, text: `❌ ${e.message}` }); }
  }

  const rule = VALIDATORS[etype];

  return (
    <div>
      <div style={s.sectionHead}>
        <span>◤ MANUAL DATA ENTRY ◢</span>
        <span style={s.sectionMeta}>CASE #{caseId}</span>
      </div>

      <div style={s.tabsBar}>
        <div onClick={() => { setTab('entity'); setMsg(null); }}
             style={{ ...s.tab, ...(tab === 'entity' ? s.tabActive : {}) }}>▲ ADD ENTITY</div>
        <div onClick={() => { setTab('link'); setMsg(null); }}
             style={{ ...s.tab, ...(tab === 'link' ? s.tabActive : {}) }}>⇄ ADD CONNECTION</div>
      </div>

      {msg && (
        <div style={{
          ...s.msg,
          background: msg.ok ? '#0d2818' : '#2d0f0f',
          borderColor: msg.ok ? '#3fb950' : '#f85149',
          color: msg.ok ? '#3fb950' : '#f85149',
        }}>{msg.text}</div>
      )}

      {tab === 'entity' && (
        <div style={s.formPanel}>
          <div style={s.panelHead}>SINGLE ENTITY REGISTRATION</div>
          <div style={s.panelBody}>
            <form onSubmit={submitEntity}>
              <div style={s.field}>
                <label style={s.label}>ENTITY TYPE *</label>
                <select style={s.input} value={etype}
                        onChange={(e) => onEtypeChange(e.target.value)}>
                  {Object.entries(categories).map(([cat, types]) => (
                    <optgroup key={cat} label={`── ${cat} ──`}>
                      {types.map((t) => <option key={t} value={t}>{t}</option>)}
                    </optgroup>
                  ))}
                </select>
                {rule && (
                  <div style={s.hint}>
                    <b>FORMAT:</b> {rule.hint} &nbsp;·&nbsp; <b>EXAMPLE:</b> <code style={s.code}>{rule.ex}</code>
                  </div>
                )}
              </div>

              <div style={s.field}>
                <label style={s.label}>VALUE *</label>
                <input
                  style={{
                    ...s.input,
                    borderColor: liveCheck
                      ? (liveCheck.ok ? '#3fb950' : '#f85149')
                      : '#30363d',
                  }}
                  value={eval_}
                  onChange={(e) => onEntityValueChange(e.target.value)}
                  placeholder={rule ? rule.ex : 'enter value'}
                />
                {liveCheck && !liveCheck.ok && (
                  <div style={s.errLine}>✗ {liveCheck.msg}</div>
                )}
                {liveCheck && liveCheck.ok && (
                  <div style={s.okLine}>✓ valid format</div>
                )}
              </div>

              <div style={s.btnRow}>
                <button type="submit" style={s.btn}
                        disabled={!eval_.trim() || (liveCheck && !liveCheck.ok)}>
                  ▶ SAVE RECORD
                </button>
                <button type="button" style={s.btn2}
                        onClick={() => { setEval(''); setLiveCheck(null); setMsg(null); }}>
                  CLEAR
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {tab === 'link' && (
        <div style={s.formPanel}>
          <div style={s.panelHead}>ESTABLISH CONNECTION</div>
          <div style={s.panelBody}>
            <form onSubmit={submitLink}>
              <div style={s.row2}>
                <div>
                  <label style={s.label}>FROM — TYPE</label>
                  <select style={s.input} value={srcType}
                          onChange={(e) => { setSrcType(e.target.value); setSrcCheck(srcVal.trim() ? clientValidate(e.target.value, srcVal) : null); }}>
                    {ALL_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>

                  <label style={{ ...s.label, marginTop: 12 }}>FROM — VALUE *</label>
                  <input
                    style={{
                      ...s.input,
                      borderColor: srcCheck ? (srcCheck.ok ? '#3fb950' : '#f85149') : '#30363d',
                    }}
                    value={srcVal}
                    onChange={(e) => onSrcChange(e.target.value)}
                    placeholder={VALIDATORS[srcType]?.ex || 'enter value'}
                  />
                  {srcCheck && !srcCheck.ok && <div style={s.errLine}>✗ {srcCheck.msg}</div>}
                </div>

                <div>
                  <label style={s.label}>TO — TYPE</label>
                  <select style={s.input} value={tgtType}
                          onChange={(e) => { setTgtType(e.target.value); setTgtCheck(tgtVal.trim() ? clientValidate(e.target.value, tgtVal) : null); }}>
                    {ALL_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>

                  <label style={{ ...s.label, marginTop: 12 }}>TO — VALUE *</label>
                  <input
                    style={{
                      ...s.input,
                      borderColor: tgtCheck ? (tgtCheck.ok ? '#3fb950' : '#f85149') : '#30363d',
                    }}
                    value={tgtVal}
                    onChange={(e) => onTgtChange(e.target.value)}
                    placeholder={VALIDATORS[tgtType]?.ex || 'enter value'}
                  />
                  {tgtCheck && !tgtCheck.ok && <div style={s.errLine}>✗ {tgtCheck.msg}</div>}
                </div>
              </div>

              <div style={{ ...s.field, marginTop: 14 }}>
                <label style={s.label}>RELATION TYPE</label>
                <select style={s.input} value={relation}
                        onChange={(e) => setRelation(e.target.value)}>
                  <option value="associated_with">associated_with</option>
                  <option value="calls">calls</option>
                  <option value="owns">owns</option>
                  <option value="transferred_to">transferred_to</option>
                  <option value="met_with">met_with</option>
                  <option value="family_of">family_of</option>
                  <option value="accomplice_of">accomplice_of</option>
                  <option value="uses_vehicle">uses_vehicle</option>
                  <option value="lives_at">lives_at</option>
                  <option value="manually_linked">manually_linked</option>
                </select>
              </div>

              <div style={s.btnRow}>
                <button type="submit" style={s.btn}
                        disabled={
                          !srcVal.trim() || !tgtVal.trim() ||
                          (srcCheck && !srcCheck.ok) || (tgtCheck && !tgtCheck.ok)
                        }>
                  ▶ SAVE CONNECTION
                </button>
                <button type="button" style={s.btn2}
                        onClick={() => { setSrcVal(''); setTgtVal(''); setSrcCheck(null); setTgtCheck(null); setMsg(null); }}>
                  CLEAR
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div style={s.refPanel}>
        <div style={s.panelHead}>REFERENCE — VALID FORMATS ({ALL_TYPES.length} TYPES)</div>
        <div style={s.panelBody}>
          <table style={s.refTable}>
            <tbody>
              {Object.entries(categories).map(([cat, types]) => (
                <tr key={cat}>
                  <td style={s.refCat}>{cat.toUpperCase()}</td>
                  <td style={s.refTypes}>
                    {types.map((t) => {
                      const v = VALIDATORS[t];
                      return (
                        <div key={t} style={s.refItem}>
                          <b style={s.refTypeName}>{t}</b>
                          {v && <span style={s.refHint}> — {v.hint} · e.g. <code>{v.ex}</code></span>}
                        </div>
                      );
                    })}
                  </td>
                </tr>
              ))}
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
  tabsBar: { display: 'flex', background: '#161b22', border: '1px solid #30363d', borderBottom: 'none' },
  tab: { padding: '10px 18px', fontSize: 11, letterSpacing: 1.5, color: '#6e7681', cursor: 'pointer', fontFamily: 'Consolas, monospace', borderBottom: '2px solid transparent' },
  tabActive: { color: '#d29922', borderBottom: '2px solid #d29922', background: '#0d1117' },
  msg: { padding: 10, fontSize: 11, border: '1px solid', marginTop: 12, fontFamily: 'Consolas, monospace', letterSpacing: 0.5 },
  formPanel: { background: '#161b22', border: '1px solid #30363d', borderTop: 'none' },
  panelHead: { background: '#0d1117', borderBottom: '1px solid #30363d', padding: '8px 14px', fontSize: 10, color: '#d29922', fontFamily: 'Consolas, monospace', letterSpacing: 1.5 },
  panelBody: { padding: 16 },
  field: { marginBottom: 14 },
  label: { display: 'block', fontSize: 10, color: '#6e7681', letterSpacing: 1.5, marginBottom: 5, fontFamily: 'Consolas, monospace' },
  input: { width: '100%', padding: '8px 10px', background: '#0d1117', border: '1px solid #30363d', color: '#e6edf3', fontSize: 12, fontFamily: 'Consolas, monospace', outline: 'none' },
  hint: { marginTop: 6, fontSize: 10, color: '#6e7681', fontFamily: 'Consolas, monospace', lineHeight: 1.6 },
  code: { background: '#0d1117', border: '1px solid #30363d', padding: '1px 5px', color: '#d29922' },
  errLine: { marginTop: 6, fontSize: 10, color: '#f85149', fontFamily: 'Consolas, monospace' },
  okLine: { marginTop: 6, fontSize: 10, color: '#3fb950', fontFamily: 'Consolas, monospace' },
  row2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 },
  btnRow: { display: 'flex', gap: 8, marginTop: 16 },
  btn: { padding: '9px 20px', background: '#d29922', color: '#0d1117', border: 'none', fontSize: 11, fontWeight: 'bold', letterSpacing: 1.5, cursor: 'pointer', fontFamily: 'Consolas, monospace' },
  btn2: { padding: '9px 16px', background: 'transparent', color: '#8b949e', border: '1px solid #30363d', fontSize: 11, letterSpacing: 1.5, cursor: 'pointer', fontFamily: 'Consolas, monospace' },
  refPanel: { marginTop: 16, background: '#161b22', border: '1px solid #30363d' },
  refTable: { width: '100%', borderCollapse: 'collapse', fontFamily: 'Consolas, monospace' },
  refCat: { background: '#0d1117', border: '1px solid #21262d', padding: '6px 12px', fontSize: 10, fontWeight: 'bold', color: '#d29922', letterSpacing: 1.5, width: 130, verticalAlign: 'top' },
  refTypes: { border: '1px solid #21262d', padding: '8px 12px' },
  refItem: { fontSize: 10, color: '#8b949e', lineHeight: 1.8, marginBottom: 2 },
  refTypeName: { color: '#c9d1d9' },
  refHint: { color: '#6e7681' },
};