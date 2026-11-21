// Auto-detect backend URL from current browser URL
// Works both on localhost AND over network (mobile/tablet access)
const BASE = `${window.location.protocol}//${window.location.hostname}:8000`;

export function getToken() {
  return localStorage.getItem('netra_token');
}
export function setToken(t) {
  localStorage.setItem('netra_token', t);
}
export function clearToken() {
  localStorage.removeItem('netra_token');
  localStorage.removeItem('netra_user');
}
export function getUser() {
  const u = localStorage.getItem('netra_user');
  return u ? JSON.parse(u) : null;
}
export function setUser(u) {
  localStorage.setItem('netra_user', JSON.stringify(u));
}

async function req(path, options = {}) {
  const headers = options.headers || {};
  const token = getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;
  if (!(options.body instanceof FormData) && options.body) {
    headers['Content-Type'] = 'application/json';
  }

  const res = await fetch(BASE + path, { ...options, headers });

  if (res.status === 401) {
    clearToken();
    if (window.location.pathname !== '/') {
      window.location.reload();
    }
    throw new Error('Session expired. Please login again.');
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Request failed' }));
    let msg = 'Request failed';
    if (typeof err.detail === 'string') {
      msg = err.detail;
    } else if (Array.isArray(err.detail)) {
      msg = err.detail
        .map((d) => {
          const loc = (d.loc || []).filter((x) => x !== 'body').join('.');
          return `${loc}: ${d.msg || JSON.stringify(d)}`;
        })
        .join('\n');
    } else if (err.detail) {
      msg = JSON.stringify(err.detail);
    }
    throw new Error(msg);
  }
  return res.json();
}

export const api = {
  login: (username, password) =>
    req('/api/login', { method: 'POST', body: JSON.stringify({ username, password }) }),

  cases: () => req('/api/cases'),
  createCase: (body) => req('/api/cases', { method: 'POST', body: JSON.stringify(body) }),
  assignCase: (caseId, officerId) =>
    req(`/api/cases/${caseId}/assign`, { method: 'POST', body: JSON.stringify({ officer_id: officerId }) }),
  updateCaseStatus: (caseId, status) =>
    req(`/api/cases/${caseId}/status`, { method: 'PUT', body: JSON.stringify({ status }) }),

  upload: (caseId, file) => {
    const fd = new FormData();
    fd.append('file', file);
    return req(`/api/cases/${caseId}/upload`, { method: 'POST', body: fd });
  },
  bulkImport: (caseId, file) => {
    const fd = new FormData();
    fd.append('file', file);
    return req(`/api/cases/${caseId}/bulk-import`, { method: 'POST', body: fd });
  },
  evidence: (caseId) => req(`/api/cases/${caseId}/evidence`),

  graph: (caseId) => req(`/api/cases/${caseId}/graph`),
  analytics: (caseId) => req(`/api/cases/${caseId}/analytics`),
  alerts: (caseId) => req(`/api/cases/${caseId}/alerts`),

  why: (caseId, a, b) =>
    req(`/api/cases/${caseId}/why?a=${encodeURIComponent(a)}&b=${encodeURIComponent(b)}`),
  copilot: (caseId, q) =>
    req(`/api/cases/${caseId}/copilot?q=${encodeURIComponent(q)}`),

  crossCaseSearch: (q) => req(`/api/cross-case/search?q=${encodeURIComponent(q)}`),

  audit: () => req('/api/audit'),

  entityTypes: () => req('/api/entity-types'),
  addEntity: (caseId, body) =>
    req(`/api/cases/${caseId}/entities`, { method: 'POST', body: JSON.stringify(body) }),
  manualLink: (caseId, body) =>
    req(`/api/cases/${caseId}/manual-link`, { method: 'POST', body: JSON.stringify(body) }),

  officers: () => req('/api/officers'),
  createOfficer: (body) => req('/api/officers', { method: 'POST', body: JSON.stringify(body) }),
  updateOfficer: (id, body) => req(`/api/officers/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  deleteOfficer: (id) => req(`/api/officers/${id}`, { method: 'DELETE' }),
  resetPassword: (id, password) =>
    req(`/api/officers/${id}/reset-password`, { method: 'POST', body: JSON.stringify({ password }) }),

  notes: (caseId) => req(`/api/cases/${caseId}/notes`),
  addNote: (caseId, note) =>
    req(`/api/cases/${caseId}/notes`, { method: 'POST', body: JSON.stringify({ note }) }),
  deleteNote: (noteId) => req(`/api/notes/${noteId}`, { method: 'DELETE' }),

  courtOrders: (caseId) => req(`/api/cases/${caseId}/court-orders`),
    addCourtOrder: async (caseId, fields, file) => {
    const file_base64 = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = (e) => reject(new Error('File read failed'));
      reader.readAsDataURL(file);
    });

    return req(`/api/cases/${caseId}/court-orders`, {
      method: 'POST',
      body: JSON.stringify({
        ...fields,
        file_base64,
        file_name: file.name,
      }),
    });
  },
};