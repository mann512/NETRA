import React, { useEffect, useRef, useState } from 'react';
import cytoscape from 'cytoscape';
import { api } from '../api';

export default function GraphView({ caseId }) {
  const ref = useRef(null);
  const cyRef = useRef(null);
  const [graph, setGraph] = useState({ nodes: [], edges: [] });
  const [why, setWhy] = useState(null);

  useEffect(() => {
    load();
    const handler = () => load();
    window.addEventListener('refresh-graph', handler);
    return () => window.removeEventListener('refresh-graph', handler);
  }, [caseId]);

  async function load() {
    try {
      const g = await api.graph(caseId);
      setGraph(g);
      render(g);
    } catch (e) { console.error(e); }
  }

  function render(g) {
    if (!ref.current) return;
    if (cyRef.current) cyRef.current.destroy();

    const colors = {
      Person: '#58a6ff', Alias: '#58a6ff',
      Phone: '#3fb950', Landline: '#3fb950', IMEI: '#3fb950', Email: '#3fb950', SIM: '#3fb950',
      BankAccount: '#d29922', IFSC: '#d29922', UPI: '#d29922', Bank: '#d29922', Amount: '#d29922',
      Vehicle: '#bc8cff',
      Location: '#f85149', State: '#f85149', Pincode: '#f85149',
      Date: '#8b949e', Time: '#8b949e', Year: '#8b949e',
      Weapon: '#e5534b', WeaponSerial: '#e5534b',
      Aadhaar: '#39c5cf', PAN: '#39c5cf', Passport: '#39c5cf',
      FIRNumber: '#a371f7', Section: '#a371f7', CrimeType: '#a371f7',
      AadhaarNum: '#39c5cf',
      Organization: '#7d8590',
      Device: '#7d8590', App: '#7d8590',
    };

    const elements = [
      ...g.nodes.map((n) => ({ data: { id: n.id, label: n.label, type: n.type } })),
      ...g.edges.map((e, i) => ({ data: { id: 'e' + i, source: e.source, target: e.target } })),
    ];

    cyRef.current = cytoscape({
      container: ref.current,
      elements,
      style: [
        {
          selector: 'node',
          style: {
            'background-color': (ele) => colors[ele.data('type')] || '#7d8590',
            label: 'data(label)',
            color: '#c9d1d9',
            'font-size': 9,
            'font-family': 'Consolas, monospace',
            'text-valign': 'bottom',
            'text-margin-y': 4,
            'text-outline-color': '#0d1117',
            'text-outline-width': 2,
            width: 16, height: 16,
            'border-width': 1,
            'border-color': '#30363d',
          },
        },
        {
          selector: 'edge',
          style: {
            width: 1, 'line-color': '#30363d',
            'curve-style': 'bezier', opacity: 0.7,
          },
        },
        {
          selector: 'node:selected',
          style: { 'border-width': 2, 'border-color': '#d29922' },
        },
      ],
      layout: { name: 'cose', animate: false, padding: 30, nodeRepulsion: 10000 },
    });

    cyRef.current.on('tap', 'edge', (evt) => {
      const e = evt.target.data();
      const src = cyRef.current.getElementById(e.source).data('label');
      const tgt = cyRef.current.getElementById(e.target).data('label');
      explain(src, tgt);
    });
  }

  async function explain(a, b) {
    try {
      const res = await api.why(caseId, a, b);
      setWhy(res);
    } catch (e) { console.error(e); }
  }

  return (
    <div style={{ display: 'flex', gap: 16, height: '100%' }}>
      <div style={s.canvasWrap}>
        <div style={s.canvasHead}>
          <span style={s.canvasHeadL}>◤ NETWORK GRAPH ◢</span>
          <span style={s.canvasHeadR}>{graph.nodes.length} NODES · {graph.edges.length} EDGES</span>
        </div>
        <div ref={ref} style={s.canvas} />
      </div>

      <div style={s.side}>
        <div style={s.panel}>
          <div style={s.panelHead}>METRICS</div>
          <div style={s.panelBody}>
            <div style={s.stat}><span>NODES</span><span style={s.statVal}>{graph.nodes.length}</span></div>
            <div style={s.stat}><span>EDGES</span><span style={s.statVal}>{graph.edges.length}</span></div>
            <div style={s.hint}>Click any connection line to view evidence trail.</div>
          </div>
        </div>

        {why && (
          <div style={s.panel}>
            <div style={s.panelHead}>EVIDENCE TRAIL</div>
            <div style={s.panelBody}>
              <div style={s.whyTitle}>{why.from} <span style={s.arrow}>↔</span> {why.to}</div>
              <div style={s.whySummary}>{why.summary}</div>
              {why.evidence_trail.map((e, i) => (
                <div key={i} style={s.evidenceRow}>
                  <div style={s.evRel}>▸ {e.relation}</div>
                  <div style={s.evSrc}>
                    SOURCE: {e.filename || 'manual entry'} · REF #{e.evidence_id || 'M'}
                  </div>
                </div>
              ))}
              {why.evidence_trail.length === 0 && (
                <div style={s.empty}>no direct evidence · link via intermediate nodes</div>
              )}
            </div>
          </div>
        )}

        <div style={s.panel}>
          <div style={s.panelHead}>LEGEND</div>
          <div style={s.panelBody}>
            {[
              ['PERSON', '#58a6ff'],
              ['PHONE / IMEI', '#3fb950'],
              ['FINANCIAL', '#d29922'],
              ['VEHICLE', '#bc8cff'],
              ['LOCATION', '#f85149'],
              ['DATE / TIME', '#8b949e'],
              ['WEAPON', '#e5534b'],
              ['IDENTITY DOC', '#39c5cf'],
              ['LEGAL / FIR', '#a371f7'],
            ].map(([t, c]) => (
              <div key={t} style={s.legendRow}>
                <span style={{ ...s.legendDot, background: c }} />
                <span style={s.legendLabel}>{t}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

const s = {
  canvasWrap: { flex: 1, background: '#161b22', border: '1px solid #30363d', display: 'flex', flexDirection: 'column' },
  canvasHead: {
    background: '#0d1117', borderBottom: '1px solid #30363d',
    padding: '8px 14px', display: 'flex', justifyContent: 'space-between',
    fontSize: 10, fontFamily: 'Consolas, monospace', letterSpacing: 1.5,
  },
  canvasHeadL: { color: '#d29922' },
  canvasHeadR: { color: '#6e7681' },
  canvas: { flex: 1, background: '#0d1117', minHeight: 500 },
  side: { width: 300, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 12 },
  panel: { background: '#161b22', border: '1px solid #30363d' },
  panelHead: {
    background: '#0d1117', borderBottom: '1px solid #30363d',
    padding: '8px 14px', fontSize: 10, color: '#d29922',
    fontFamily: 'Consolas, monospace', letterSpacing: 2,
  },
  panelBody: { padding: 12 },
  stat: { display: 'flex', justifyContent: 'space-between', fontSize: 11, padding: '4px 0', fontFamily: 'Consolas, monospace' },
  statVal: { color: '#e6edf3', fontWeight: 'bold' },
  hint: { fontSize: 10, color: '#6e7681', marginTop: 8, fontFamily: 'Consolas, monospace', lineHeight: 1.6 },
  whyTitle: { fontSize: 12, color: '#e6edf3', fontFamily: 'Consolas, monospace', marginBottom: 6 },
  arrow: { color: '#d29922' },
  whySummary: { fontSize: 10, color: '#8b949e', marginBottom: 10, fontFamily: 'Consolas, monospace', lineHeight: 1.6 },
  evidenceRow: { background: '#0d1117', border: '1px solid #30363d', padding: 8, marginBottom: 6 },
  evRel: { fontSize: 11, color: '#3fb950', fontFamily: 'Consolas, monospace' },
  evSrc: { fontSize: 9, color: '#6e7681', marginTop: 4, fontFamily: 'Consolas, monospace', letterSpacing: 0.5 },
  empty: { fontSize: 10, color: '#6e7681', fontStyle: 'italic', padding: 8, fontFamily: 'Consolas, monospace' },
  legendRow: { display: 'flex', alignItems: 'center', marginBottom: 5 },
  legendDot: { width: 8, height: 8, borderRadius: '50%', marginRight: 8, border: '1px solid #30363d' },
  legendLabel: { fontSize: 10, color: '#8b949e', fontFamily: 'Consolas, monospace', letterSpacing: 0.5 },
};