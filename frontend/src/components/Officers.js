import React, { useState, useEffect } from 'react';
import { api } from '../api';

export default function Officers({ user }) {
  const [officers, setOfficers] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    username: '',
    password: '',
    full_name: '',
    rank: 'Investigator',
    jurisdiction: user.jurisdiction,
    station: user.station || '',
    clearance: 'RESTRICTED',
  });
  const [msg, setMsg] = useState(null);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    try {
      setOfficers(await api.officers());
    } catch (e) {
      setMsg({ ok: false, text: e.message });
    }
  }

  const allowedRanks =
    {
      SystemAdmin: ['Investigator', 'SHO', 'RegionalAdmin', 'SystemAdmin'],
      RegionalAdmin: ['Investigator', 'SHO'],
      SHO: ['Investigator'],
    }[user.rank] || [];

  async function create(e) {
    e.preventDefault();
    try {
      await api.createOfficer(form);
      setMsg({ ok: true, text: `Officer '${form.username}' created` });
      setForm({ ...form, username: '', password: '', full_name: '' });
      setShowForm(false);
      load();
    } catch (e) {
      setMsg({ ok: false, text: e.message });
    }
  }

  async function toggleActive(o) {
    // SHO not allowed
    if (user.rank === 'SHO') {
      alert('SHO cannot activate/deactivate officers. Contact SP or Admin.');
      return;
    }
    if (user.rank === 'Investigator') {
      alert('Access denied.');
      return;
    }
    if (!window.confirm(`${o.is_active ? 'Deactivate' : 'Activate'} ${o.username}?`)) return;
    try {
      if (o.is_active) {
        await api.deleteOfficer(o.id);
      } else {
        await api.updateOfficer(o.id, { is_active: 1 });
      }
      load();
    } catch (e) {
      alert(e.message);
    }
  }

  async function resetPwd(o) {
    // SHO can only reset own station IO passwords
    if (user.rank === 'SHO') {
      if (o.rank !== 'Investigator' || o.station !== user.station) {
        alert('SHO can only reset passwords for own-station Investigators.');
        return;
      }
    }
    const p = prompt(`New password for ${o.username} (min 5 chars):`);
    if (!p) return;
    if (p.length < 5) {
      alert('Password must be at least 5 characters');
      return;
    }
    try {
      await api.resetPassword(o.id, p);
      alert('Password reset successfully');
    } catch (e) {
      alert(e.message);
    }
  }

  const canToggleActive =
    user.rank === 'RegionalAdmin' || user.rank === 'SystemAdmin';

  const canResetPwd = (o) => {
    if (user.rank === 'SystemAdmin' || user.rank === 'RegionalAdmin') return true;
    if (user.rank === 'SHO' && o.rank === 'Investigator' && o.station === user.station)
      return true;
    return false;
  };

  return (
    <div>
      <div style={s.sectionHead}>
        <span>◤ OFFICER MANAGEMENT ◢</span>
        <span style={s.sectionMeta}>ROLE: {user.rank.toUpperCase()}</span>
      </div>

      {msg && (
        <div
          style={{
            ...s.msg,
            background: msg.ok ? '#0d2818' : '#2d0f0f',
            borderColor: msg.ok ? '#3fb950' : '#f85149',
            color: msg.ok ? '#3fb950' : '#f85149',
          }}
        >
          {msg.text}
        </div>
      )}

      <div style={{ marginBottom: 12 }}>
        <button onClick={() => setShowForm(!showForm)} style={s.btn}>
          {showForm ? '✕ CANCEL' : '＋ ADD OFFICER'}
        </button>
      </div>

      {showForm && (
        <div style={s.panel}>
          <div style={s.panelHead}>NEW OFFICER REGISTRATION</div>
          <div style={s.panelBody}>
            <form onSubmit={create}>
              <div style={s.grid2}>
                <div>
                  <label style={s.label}>USERNAME *</label>
                  <input
                    style={s.input}
                    value={form.username}
                    onChange={(e) =>
                      setForm({ ...form, username: e.target.value })
                    }
                    placeholder="e.g. investigator5"
                  />
                </div>
                <div>
                  <label style={s.label}>PASSWORD * (min 5)</label>
                  <input
                    style={s.input}
                    type="password"
                    value={form.password}
                    onChange={(e) =>
                      setForm({ ...form, password: e.target.value })
                    }
                  />
                </div>
                <div>
                  <label style={s.label}>FULL NAME *</label>
                  <input
                    style={s.input}
                    value={form.full_name}
                    onChange={(e) =>
                      setForm({ ...form, full_name: e.target.value })
                    }
                    placeholder="e.g. Inspector Ramesh Yadav"
                  />
                </div>
                <div>
                  <label style={s.label}>RANK *</label>
                  <select
                    style={s.input}
                    value={form.rank}
                    onChange={(e) => setForm({ ...form, rank: e.target.value })}
                  >
                    {allowedRanks.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={s.label}>JURISDICTION *</label>
                  <input
                    style={s.input}
                    value={form.jurisdiction}
                    onChange={(e) =>
                      setForm({ ...form, jurisdiction: e.target.value })
                    }
                    disabled={user.rank === 'SHO'}
                  />
                </div>
                <div>
                  <label style={s.label}>STATION</label>
                  <input
                    style={s.input}
                    value={form.station}
                    onChange={(e) =>
                      setForm({ ...form, station: e.target.value })
                    }
                    disabled={user.rank === 'SHO'}
                  />
                </div>
                <div>
                  <label style={s.label}>CLEARANCE</label>
                  <select
                    style={s.input}
                    value={form.clearance}
                    onChange={(e) =>
                      setForm({ ...form, clearance: e.target.value })
                    }
                  >
                    <option>RESTRICTED</option>
                    <option>CONFIDENTIAL</option>
                    <option>SECRET</option>
                  </select>
                </div>
              </div>
              <div style={s.btnRow}>
                <button type="submit" style={s.btn}>
                  ▶ CREATE OFFICER
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div style={s.panel}>
        <div style={s.panelHead}>
          {user.rank === 'SHO'
            ? `STATION OFFICERS (${officers.length})`
            : `ALL OFFICERS (${officers.length})`}
        </div>
        <div style={s.panelBody}>
          <table style={s.table}>
            <thead>
              <tr>
                <th style={s.th}>ID</th>
                <th style={s.th}>USERNAME</th>
                <th style={s.th}>FULL NAME</th>
                <th style={s.th}>RANK</th>
                <th style={s.th}>JURISDICTION</th>
                <th style={s.th}>STATION</th>
                <th style={s.th}>CLEARANCE</th>
                <th style={s.th}>STATUS</th>
                <th style={s.th}>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {officers.map((o) => (
                <tr key={o.id}>
                  <td style={s.td}>{String(o.id).padStart(3, '0')}</td>
                  <td style={s.td}>
                    <b>{o.username}</b>
                  </td>
                  <td style={s.td}>{o.full_name}</td>
                  <td style={s.td}>{o.rank}</td>
                  <td style={s.td}>{o.jurisdiction}</td>
                  <td style={s.td}>{o.station || '—'}</td>
                  <td style={s.td}>{o.clearance}</td>
                  <td style={s.td}>
                    <span style={o.is_active ? s.ok : s.dead}>
                      {o.is_active ? '● ACTIVE' : '● INACTIVE'}
                    </span>
                  </td>
                  <td style={s.td}>
                    {canResetPwd(o) && (
                      <button style={s.mini} onClick={() => resetPwd(o)}>
                        RESET PWD
                      </button>
                    )}
                    {canToggleActive && (
                      <button style={s.mini2} onClick={() => toggleActive(o)}>
                        {o.is_active ? 'DEACTIVATE' : 'ACTIVATE'}
                      </button>
                    )}
                    {!canResetPwd(o) && !canToggleActive && (
                      <span style={s.noAction}>—</span>
                    )}
                  </td>
                </tr>
              ))}
              {officers.length === 0 && (
                <tr>
                  <td colSpan="9" style={s.empty}>
                    no officers found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

const s = {
  sectionHead: {
    display: 'flex',
    justifyContent: 'space-between',
    borderBottom: '1px solid #30363d',
    paddingBottom: 10,
    marginBottom: 16,
    fontSize: 11,
    color: '#d29922',
    fontFamily: 'Consolas, monospace',
    letterSpacing: 2,
  },
  sectionMeta: { color: '#6e7681' },
  msg: {
    padding: 10,
    fontSize: 11,
    border: '1px solid',
    marginBottom: 12,
    fontFamily: 'Consolas, monospace',
  },
  btn: {
    padding: '9px 20px',
    background: '#d29922',
    color: '#0d1117',
    border: 'none',
    fontSize: 11,
    fontWeight: 'bold',
    letterSpacing: 1.5,
    cursor: 'pointer',
    fontFamily: 'Consolas, monospace',
  },
  panel: {
    background: '#161b22',
    border: '1px solid #30363d',
    marginBottom: 16,
  },
  panelHead: {
    background: '#0d1117',
    borderBottom: '1px solid #30363d',
    padding: '8px 14px',
    fontSize: 10,
    color: '#d29922',
    fontFamily: 'Consolas, monospace',
    letterSpacing: 1.5,
  },
  panelBody: { padding: 16 },
  grid2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 },
  label: {
    display: 'block',
    fontSize: 10,
    color: '#6e7681',
    letterSpacing: 1.5,
    marginBottom: 5,
    fontFamily: 'Consolas, monospace',
  },
  input: {
    width: '100%',
    padding: '8px 10px',
    background: '#0d1117',
    border: '1px solid #30363d',
    color: '#e6edf3',
    fontSize: 12,
    fontFamily: 'Consolas, monospace',
    outline: 'none',
  },
  btnRow: { marginTop: 16, display: 'flex', gap: 8 },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: 11,
    fontFamily: 'Consolas, monospace',
  },
  th: {
    background: '#0d1117',
    border: '1px solid #30363d',
    padding: '8px 10px',
    textAlign: 'left',
    fontSize: 10,
    color: '#6e7681',
    letterSpacing: 1.2,
    fontWeight: 'normal',
  },
  td: {
    border: '1px solid #21262d',
    padding: '7px 10px',
    color: '#c9d1d9',
  },
  ok: { color: '#3fb950', fontSize: 10 },
  dead: { color: '#6e7681', fontSize: 10 },
  mini: {
    padding: '3px 8px',
    background: 'transparent',
    border: '1px solid #30363d',
    color: '#d29922',
    fontSize: 9,
    cursor: 'pointer',
    fontFamily: 'Consolas, monospace',
    letterSpacing: 0.5,
    marginRight: 4,
  },
  mini2: {
    padding: '3px 8px',
    background: 'transparent',
    border: '1px solid #30363d',
    color: '#f85149',
    fontSize: 9,
    cursor: 'pointer',
    fontFamily: 'Consolas, monospace',
    letterSpacing: 0.5,
  },
  noAction: { color: '#484f58', fontSize: 11 },
  empty: {
    textAlign: 'center',
    color: '#6e7681',
    fontStyle: 'italic',
    padding: 20,
    fontSize: 11,
  },
};