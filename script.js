// ════════════════════════════════════════════════════════════
// BASE AUTOMATA (subclass for NFA, GNFA, PDA, TM, etc.)
// ════════════════════════════════════════════════════════════
class AutomataBase {
  constructor(typeName) {
    this.typeName = typeName;
    this.states = new Map();   // id → {id,x,y,label,isStart,isAccept}
    this._counter = 0;
    this.startState = null;
  }

  _nextId() { return `q${this._counter++}`; }

  addState(x, y, label) {
    const id = this._nextId();
    const s = { id, x, y, label: label ?? id, isStart: false, isAccept: false };
    this.states.set(id, s);
    return s;
  }

  removeState(id) {
    this.states.delete(id);
    if (this.startState === id) this.startState = null;
  }

  setStart(id) {
    if (this.startState) {
      const prev = this.states.get(this.startState);
      if (prev) prev.isStart = false;
    }
    this.startState = id;
    const s = this.states.get(id);
    if (s) s.isStart = true;
  }

  toggleAccept(id) {
    const s = this.states.get(id);
    if (s) s.isAccept = !s.isAccept;
  }

  renameState(id, label) {
    const s = this.states.get(id);
    if (s) s.label = label;
  }

  // Override in subclasses:
  getTransitions()       { return []; }           // [{from,symbol,to}]
  simulate(input)        { return {accepted:false,path:[]}; }
  addTransition()        {}
  removeTransition()     {}
  reset() {
    this.states.clear();
    this.startState = null;
    this._counter = 0;
  }
}

// ════════════════════════════════════════════════════════════
// DFA
// ════════════════════════════════════════════════════════════
class DFA extends AutomataBase {
  constructor() {
    super('DFA');
    this.delta = new Map();   // "from,symbol" → toId
    this.alphabet = new Set();
  }

  addTransition(from, symbol, to) {
    this.delta.set(`${from},${symbol}`, to);
    this.alphabet.add(symbol);
  }

  removeTransition(from, symbol) {
    this.delta.delete(`${from},${symbol}`);
    this._rebuildAlphabet();
  }

  _rebuildAlphabet() {
    this.alphabet.clear();
    for (const k of this.delta.keys()) {
      this.alphabet.add(k.slice(k.indexOf(',') + 1));
    }
  }

  removeState(id) {
    super.removeState(id);
    for (const [k, to] of [...this.delta]) {
      if (k.split(',')[0] === id || to === id) this.delta.delete(k);
    }
    this._rebuildAlphabet();
  }

  getTransitions() {
    return [...this.delta].map(([k, to]) => {
      const ci = k.indexOf(',');
      return { from: k.slice(0, ci), symbol: k.slice(ci + 1), to };
    });
  }

  simulate(input) {
    if (!this.startState)
      return { accepted: false, error: 'No start state defined', path: [] };

    let cur = this.startState;
    const path = [{ state: cur, pos: 0 }];

    for (let i = 0; i < input.length; i++) {
      const ch = input[i];
      const next = this.delta.get(`${cur},${ch}`);
      if (next === undefined)
        return { accepted: false, error: `Dead: no δ(${this.states.get(cur)?.label ?? cur}, '${ch}')`, path, deadAt: i };
      cur = next;
      path.push({ state: cur, pos: i + 1 });
    }

    const fs = this.states.get(cur);
    return { accepted: !!fs?.isAccept, path, finalState: cur };
  }

  reset() {
    super.reset();
    this.delta.clear();
    this.alphabet.clear();
  }
}

// ════════════════════════════════════════════════════════════
// NFA STUB — fill in later
// ════════════════════════════════════════════════════════════
class NFA extends AutomataBase {
  constructor() { super('NFA'); }
  // TODO: Set<toId> values, epsilon closures, powerset construction
}

// ════════════════════════════════════════════════════════════
// GNFA STUB — fill in later
// ════════════════════════════════════════════════════════════
class GNFA extends AutomataBase {
  constructor() { super('GNFA'); }
  // TODO: regex-labelled transitions, state elimination
}

// ════════════════════════════════════════════════════════════
// PDA STUB — fill in later
// ════════════════════════════════════════════════════════════
class PDA extends AutomataBase {
  constructor() { super('PDA'); }
  // TODO: (input,pop) → (to,push) transitions, stack display
}

// ════════════════════════════════════════════════════════════
// TURING MACHINE STUB — fill in later
// ════════════════════════════════════════════════════════════
class TuringMachine extends AutomataBase {
  constructor() { super('TM'); }
  // TODO: tape, head position, (state,read) → (state,write,dir)
}

// ════════════════════════════════════════════════════════════
// GRAPH RENDERER  (Canvas 2D — reusable for all automata types)
// ════════════════════════════════════════════════════════════
class GraphRenderer {
  constructor(canvas) {
    this.cv = canvas;
    this.cx = canvas.getContext('2d');
    this.R = 27;
    this._hlStates = new Set();
    this._hlEdges  = [];      // [{from,to}]
    this._classic  = false;
    this.C = this._darkPalette();
  }

  _darkPalette() {
    return {
      bg:'#0d1117', fill:'#1c2128', border:'#388bfd',
      accept:'#3fb950', hl:'#e3b341', sel:'#f85149', hov:'#8957e5',
      txt:'#c9d1d9', edge:'#6e7681', edgeHL:'#e3b341',
      lbl:'#79b8ff', startArr:'#58a6ff', grid:'rgba(255,255,255,.022)',
      hlFill:'rgba(227,179,65,.15)', selFill:'rgba(248,81,73,.15)',
      hovFill:'rgba(137,87,229,.15)', lblBg:'rgba(13,17,23,.88)'
    };
  }

  _classicPalette() {
    return {
      bg:'#ffffff', fill:'#ffffff', border:'#000000',
      accept:'#000000', hl:'#cc6600', sel:'#cc0000', hov:'#555555',
      txt:'#000000', edge:'#000000', edgeHL:'#cc6600',
      lbl:'#000000', startArr:'#000000', grid:'rgba(0,0,0,0)',
      hlFill:'rgba(204,102,0,.08)', selFill:'rgba(200,0,0,.08)',
      hovFill:'rgba(0,0,0,.05)', lblBg:'rgba(255,255,255,.92)'
    };
  }

  setClassic(bool) {
    this._classic = bool;
    this.C = bool ? this._classicPalette() : this._darkPalette();
  }

  setHighlight(states = new Set(), edges = []) {
    this._hlStates = states;
    this._hlEdges  = edges;
  }

  render(automata, selected, hovered) {
    const { cv, cx, R } = this;
    const W = cv.width, H = cv.height;

    cx.fillStyle = this.C.bg;
    cx.fillRect(0, 0, W, H);
    this._grid(W, H);

    // Group transitions by (from,to) to merge multi-symbol labels
    const edgeMap = new Map();
    for (const t of automata.getTransitions()) {
      const k = `${t.from}→${t.to}`;
      if (!edgeMap.has(k)) edgeMap.set(k, { from: t.from, to: t.to, syms: [] });
      edgeMap.get(k).syms.push(t.symbol);
    }

    for (const e of edgeMap.values()) {
      const fS = automata.states.get(e.from);
      const tS = automata.states.get(e.to);
      if (!fS || !tS) continue;
      const label = e.syms.join(', ');
      const hl = this._hlEdges.some(h => h.from === e.from && h.to === e.to);
      const bidir = edgeMap.has(`${e.to}→${e.from}`);
      this._edge(fS, tS, label, hl, bidir);
    }

    for (const [id, s] of automata.states) {
      this._state(s,
        this._hlStates.has(id),
        selected === id,
        hovered === id
      );
    }
  }

  _grid(W, H) {
    if (this._classic) return;
    const cx = this.cx;
    cx.fillStyle = this.C.grid;
    for (let x = 30; x < W; x += 40)
      for (let y = 30; y < H; y += 40) {
        cx.beginPath(); cx.arc(x, y, 1.2, 0, Math.PI*2); cx.fill();
      }
  }

  _state(s, hl, sel, hov) {
    const cx = this.cx, R = this.R;
    let fill = this.C.fill;
    let bord = s.isAccept ? this.C.accept : this.C.border;

    if (hl)       { fill = this.C.hlFill;  bord = this.C.hl;  }
    else if (sel) { fill = this.C.selFill; bord = this.C.sel; }
    else if (hov) { fill = this.C.hovFill; bord = this.C.hov; }

    cx.shadowColor = bord;
    cx.shadowBlur  = this._classic ? 0 : (hl || sel ? 16 : 5);

    cx.beginPath(); cx.arc(s.x, s.y, R, 0, Math.PI*2);
    cx.fillStyle = fill; cx.fill();
    cx.strokeStyle = bord; cx.lineWidth = sel ? 2.5 : 2; cx.stroke();
    cx.shadowBlur = 0;

    if (s.isAccept) {
      cx.beginPath(); cx.arc(s.x, s.y, R - 5, 0, Math.PI*2);
      cx.strokeStyle = this.C.accept; cx.lineWidth = 1.5; cx.stroke();
    }

    if (s.isStart) {
      const ax = s.x - R - 28;
      cx.beginPath(); cx.moveTo(ax, s.y); cx.lineTo(s.x - R - 2, s.y);
      cx.strokeStyle = this.C.startArr; cx.lineWidth = 2; cx.stroke();
      cx.beginPath();
      cx.moveTo(s.x - R - 2, s.y);
      cx.lineTo(s.x - R - 10, s.y - 5);
      cx.lineTo(s.x - R - 10, s.y + 5);
      cx.closePath(); cx.fillStyle = this.C.startArr; cx.fill();
    }

    cx.fillStyle = hl ? this.C.hl : this.C.txt;
    cx.font = 'bold 13px monospace';
    cx.textAlign = 'center'; cx.textBaseline = 'middle';
    cx.fillText(s.label, s.x, s.y);
  }

  _edge(f, t, label, hl, bidir) {
    if (f.id === t.id) { this._selfLoop(f, label, hl); return; }
    if (bidir) this._curved(f, t, label, hl);
    else       this._straight(f, t, label, hl);
  }

  _straight(f, t, label, hl) {
    const cx = this.cx, R = this.R;
    const dx = t.x - f.x, dy = t.y - f.y;
    const d = Math.hypot(dx, dy), nx = dx/d, ny = dy/d;
    const sx = f.x + nx*R, sy = f.y + ny*R;
    const ex = t.x - nx*R, ey = t.y - ny*R;

    cx.beginPath(); cx.moveTo(sx, sy); cx.lineTo(ex, ey);
    cx.strokeStyle = hl ? this.C.edgeHL : this.C.edge;
    cx.lineWidth = hl ? 2 : 1.5; cx.stroke();
    this._arrow(ex, ey, Math.atan2(dy, dx), hl);
    this._label(label, (sx+ex)/2 - ny*16, (sy+ey)/2 + nx*16, hl);
  }

  _curved(f, t, label, hl) {
    const cx = this.cx, R = this.R;
    const dx = t.x - f.x, dy = t.y - f.y;
    const d = Math.hypot(dx, dy);
    const ny = -dx/d, nx = dy/d;  // perpendicular (swap+negate)
    const off = 42;
    const cpx = (f.x+t.x)/2 + nx*off;
    const cpy = (f.y+t.y)/2 + ny*off;

    const sa = Math.atan2(cpy - f.y, cpx - f.x);
    const ea = Math.atan2(t.y  - cpy, t.x  - cpx);
    const sx = f.x + Math.cos(sa)*R, sy = f.y + Math.sin(sa)*R;
    const ex = t.x - Math.cos(ea)*R, ey = t.y - Math.sin(ea)*R;

    cx.beginPath(); cx.moveTo(sx, sy);
    cx.quadraticCurveTo(cpx, cpy, ex, ey);
    cx.strokeStyle = hl ? this.C.edgeHL : this.C.edge;
    cx.lineWidth = hl ? 2 : 1.5; cx.stroke();
    this._arrow(ex, ey, ea, hl);
    this._label(label, cpx, cpy, hl);
  }

  _selfLoop(s, label, hl) {
    const cx = this.cx, R = this.R;
    const ly = s.y - R - 20, lr = 18;

    cx.beginPath();
    cx.arc(s.x, ly, lr, Math.PI * 0.5, Math.PI * 0.95 * 2.4);
    cx.strokeStyle = hl ? this.C.edgeHL : this.C.edge;
    cx.lineWidth = hl ? 2 : 1.5; cx.stroke();

    const aAngle = Math.PI * 0.97 * 2.4;
    const ax = s.x + lr * Math.cos(aAngle);
    const ay = ly  + lr * Math.sin(aAngle);
    this._arrow(ax, ay, aAngle + Math.PI/2, hl);

    this._label(label, s.x, ly - lr - 4, hl);
  }

  _arrow(x, y, angle, hl) {
    const cx = this.cx, sz = 7;
    cx.save(); cx.translate(x, y); cx.rotate(angle);
    cx.beginPath();
    cx.moveTo(0, 0); cx.lineTo(-sz, -sz*.45); cx.lineTo(-sz, sz*.45);
    cx.closePath();
    cx.fillStyle = hl ? this.C.edgeHL : this.C.edge; cx.fill();
    cx.restore();
  }

  _label(text, x, y, hl) {
    const cx = this.cx;
    cx.font = '12px monospace';
    const w = cx.measureText(text).width;
    cx.fillStyle = this.C.lblBg;
    cx.fillRect(x - w/2 - 4, y - 9, w + 8, 18);
    cx.fillStyle = hl ? this.C.edgeHL : this.C.lbl;
    cx.textAlign = 'center'; cx.textBaseline = 'middle';
    cx.fillText(text, x, y);
  }

  // ── Hit-testing ──

  stateAt(px, py, states) {
    for (const [, s] of states)
      if (Math.hypot(px - s.x, py - s.y) <= this.R) return s;
    return null;
  }

  /** Returns edge object {from, to, syms} if (px,py) is near a transition label, else null */
  transitionAt(px, py, automata) {
    const edgeMap = new Map();
    for (const t of automata.getTransitions()) {
      const k = `${t.from}→${t.to}`;
      if (!edgeMap.has(k)) edgeMap.set(k, { from: t.from, to: t.to, syms: [] });
      edgeMap.get(k).syms.push(t.symbol);
    }

    for (const e of edgeMap.values()) {
      const fS = automata.states.get(e.from);
      const tS = automata.states.get(e.to);
      if (!fS || !tS) continue;
      const bidir = edgeMap.has(`${e.to}→${e.from}`);
      const lp = this._labelPos(fS, tS, bidir);
      // Generous hit radius (label text + padding)
      if (Math.hypot(px - lp.x, py - lp.y) < 22) return e;
    }
    return null;
  }

  /** Returns the canvas position of a transition's label — must mirror _straight/_curved/_selfLoop */
  _labelPos(f, t, bidir) {
    const R = this.R;
    if (f.id === t.id) {
      // Self-loop
      const ly = f.y - R - 20, lr = 18;
      return { x: f.x, y: ly - lr - 4 };
    }
    if (bidir) {
      // Curved (matches _curved)
      const dx = t.x - f.x, dy = t.y - f.y;
      const d  = Math.hypot(dx, dy);
      const nx = dy/d, ny = -dx/d;   // perpendicular
      return { x: (f.x+t.x)/2 + nx*42, y: (f.y+t.y)/2 + ny*42 };
    }
    // Straight
    const dx = t.x - f.x, dy = t.y - f.y;
    const d  = Math.hypot(dx, dy), nx = dx/d, ny = dy/d;
    return { x: (f.x+t.x)/2 - ny*16, y: (f.y+t.y)/2 + nx*16 };
  }

  /** Draw the "linking" preview: dashed line from srcState to mouse */
  drawLinkPreview(srcState, mx, my) {
    const cx = this.cx, R = this.R;
    const dx = mx - srcState.x, dy = my - srcState.y;
    const d = Math.hypot(dx, dy);
    if (d < R + 2) return;   // don't draw inside the state circle

    const angle = Math.atan2(dy, dx);
    const sx = srcState.x + Math.cos(angle) * R;
    const sy = srcState.y + Math.sin(angle) * R;

    // Dashed line
    cx.save();
    cx.setLineDash([7, 4]);
    cx.beginPath(); cx.moveTo(sx, sy); cx.lineTo(mx, my);
    cx.strokeStyle = this.C.edgeHL;
    cx.lineWidth = 2;
    cx.globalAlpha = 0.8;
    cx.stroke();
    cx.setLineDash([]);

    // Arrowhead at mouse
    cx.translate(mx, my); cx.rotate(angle);
    cx.beginPath();
    cx.moveTo(0,0); cx.lineTo(-9,-4); cx.lineTo(-9, 4);
    cx.closePath();
    cx.fillStyle = this.C.edgeHL; cx.fill();
    cx.restore();
  }
}

// ════════════════════════════════════════════════════════════
// APP CONTROLLER
// ════════════════════════════════════════════════════════════
const App = (() => {

  // ── state ──
  let dfa = new DFA();
  let renderer, canvas;
  let tool = 'add';
  let selId = null, hovId = null;
  let drag = null, dragOff = { x:0, y:0 };

  // linking mode (canvas click-to-draw transitions)
  let linking = null;           // source state id while drawing a transition
  let mousePos = { x:0, y:0 }; // last known canvas mouse position
  let pendingLink = null;       // {fromId, toId} waiting for symbol input

  // theme
  let classic = false;

  // sim
  let simPath = null, simStep = 0, simActive = false;

  // ── init ──
  function init() {
    canvas = document.getElementById('canvas');
    renderer = new GraphRenderer(canvas);
    resize();
    window.addEventListener('resize', resize);

    canvas.addEventListener('mousedown',   onDown);
    canvas.addEventListener('mousemove',   onMove);
    canvas.addEventListener('mouseup',     onUp);
    canvas.addEventListener('mouseleave',  () => { hovId = null; drag = null; render(); });
    canvas.addEventListener('contextmenu', onCtx);

    // Hide context menu on any outside click
    document.addEventListener('click', () => {
      document.getElementById('ctx-menu').style.display = 'none';
    });

    // Escape cancels linking mode
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') { _cancelLink(); _symCancel(); }
    });

    // Symbol overlay: confirm on Enter
    document.getElementById('sym-input').addEventListener('keydown', e => {
      if (e.key === 'Enter') _symConfirm();
    });

    document.getElementById('nav').addEventListener('click', e => {
      const btn = e.target.closest('button[data-type]');
      if (!btn || btn.classList.contains('locked')) return;
      switchType(btn.dataset.type);
    });

    render(); updateUI();
  }

  function resize() {
    const w = document.getElementById('canvas-wrap');
    canvas.width  = w.clientWidth;
    canvas.height = w.clientHeight;
    render();
  }

  function render() {
    if (!renderer) return;
    let hlS = new Set(), hlE = [];
    if (simActive && simPath && simStep < simPath.length) {
      hlS.add(simPath[simStep].state);
      if (simStep > 0)
        hlE = [{ from: simPath[simStep-1].state, to: simPath[simStep].state }];
    }
    // In linking mode, highlight the source state
    if (linking) hlS.add(linking);

    renderer.setHighlight(hlS, hlE);
    renderer.render(dfa, selId, hovId);

    // Draw the dashed link-preview line on top
    if (linking) {
      const src = dfa.states.get(linking);
      if (src) renderer.drawLinkPreview(src, mousePos.x, mousePos.y);
    }
  }

  // ── mouse ──
  function pos(e) {
    const r = canvas.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }

  function onDown(e) {
    if (e.button !== 0) return;
    const p = pos(e);
    const s = renderer.stateAt(p.x, p.y, dfa.states);

    // ── Linking mode: left-click destination ──
    if (linking !== null) {
      if (s) {
        // Open the symbol prompt
        pendingLink = { fromId: linking, toId: s.id };
        const fLbl = dfa.states.get(linking)?.label ?? linking;
        const tLbl = s.label;
        document.getElementById('sym-from-lbl').textContent = fLbl;
        document.getElementById('sym-to-lbl').textContent   = tLbl;
        document.getElementById('sym-input').value = '';
        document.getElementById('sym-overlay').classList.add('show');
        setTimeout(() => document.getElementById('sym-input').focus(), 30);
      }
      // Cancel linking regardless (click on state → hand off to prompt; click on canvas → cancel)
      _cancelLink();
      return;
    }

    // ── Normal behaviour ──
    if (s) {
      drag = s.id;
      dragOff = { x: p.x - s.x, y: p.y - s.y };
      if (tool === 'select') { selId = s.id; updateUI(); }
    } else if (tool === 'add') {
      const ns = dfa.addState(p.x, p.y);
      if (dfa.states.size === 1) dfa.setStart(ns.id);
      updateUI();
    } else {
      selId = null; updateUI();
    }
    render();
  }

  function onMove(e) {
    const p = pos(e);
    mousePos = p;
    hovId = renderer.stateAt(p.x, p.y, dfa.states)?.id ?? null;
    if (drag) {
      const s = dfa.states.get(drag);
      if (s) { s.x = p.x - dragOff.x; s.y = p.y - dragOff.y; }
      canvas.className = 'grab-cur';
    } else if (linking) {
      canvas.className = 'link-cur';
    } else {
      canvas.className = tool === 'select' ? 'sel-cur' : '';
    }
    render();
  }

  function onUp() {
    drag = null;
    if (!linking) canvas.className = tool === 'select' ? 'sel-cur' : '';
  }

  function onCtx(e) {
    e.preventDefault();

    // Right-click while linking → cancel
    if (linking !== null) { _cancelLink(); return; }

    const p = pos(e);
    const s = renderer.stateAt(p.x, p.y, dfa.states);

    if (s) {
      selId = s.id; updateUI(); render();
      showStateCtxMenu(e.clientX, e.clientY, s);
      return;
    }

    // Check for edge hit
    const edge = renderer.transitionAt(p.x, p.y, dfa);
    if (edge) {
      showEdgeCtxMenu(e.clientX, e.clientY, edge);
    }
  }

  // ── Context menus ──

  function showStateCtxMenu(x, y, s) {
    const m = document.getElementById('ctx-menu');
    m.innerHTML = `
      <div class="cm-head">${s.label}</div>
      ${ci('→ Add Transition', `App._startLink('${s.id}')`)}
      <hr class="cm-sep">
      ${ci('▶ Set as Start',   `App._setStart('${s.id}')`)}
      ${ci(s.isAccept ? '★ Remove Accept' : '★ Set Accept', `App._toggleAccept('${s.id}')`)}
      ${ci('✎ Rename…',        `App._rename('${s.id}')`)}
      <hr class="cm-sep">
      ${ci('🗑 Delete State',   `App._del('${s.id}')`, true)}
    `;
    _showMenu(m, x, y);
  }

  function showEdgeCtxMenu(x, y, edge) {
    const m = document.getElementById('ctx-menu');
    const fLbl = dfa.states.get(edge.from)?.label ?? edge.from;
    const tLbl = dfa.states.get(edge.to)?.label   ?? edge.to;
    const symsStr = edge.syms.join(', ');

    const delItems = edge.syms.length === 1
      ? ci('🗑 Delete Transition', `App._rmTrans('${edge.from}','${edge.syms[0]}')`, true)
      : edge.syms.map(sym =>
          ci(`🗑 Delete ─${sym}→`, `App._rmTrans('${edge.from}','${sym}')`, true)
        ).join('');

    m.innerHTML = `
      <div class="cm-head">${fLbl} ─${symsStr}→ ${tLbl}</div>
      ${delItems}
    `;
    _showMenu(m, x, y);
  }

  function _showMenu(m, x, y) {
    m.style.display = 'block';
    // Clamp to viewport
    m.style.left = x + 'px';
    m.style.top  = y + 'px';
    // After paint, adjust if it overflows
    requestAnimationFrame(() => {
      const rect = m.getBoundingClientRect();
      if (rect.right  > window.innerWidth)  m.style.left = (x - rect.width)  + 'px';
      if (rect.bottom > window.innerHeight) m.style.top  = (y - rect.height) + 'px';
    });
  }

  function ci(lbl, fn, danger = false) {
    return `<div class="cm-item${danger ? ' d' : ''}"
      onclick="${fn};document.getElementById('ctx-menu').style.display='none'">${lbl}</div>`;
  }

  // ── Linking mode ──

  function _startLink(fromId) {
    document.getElementById('ctx-menu').style.display = 'none';
    linking = fromId;
    canvas.className = 'link-cur';
    _setCanvasHint('Click destination state · Right-click or Esc to cancel');
    render();
  }

  function _cancelLink() {
    linking = null;
    canvas.className = tool === 'select' ? 'sel-cur' : '';
    _setCanvasHint('Right-click state or edge for options');
    render();
  }

  function _setCanvasHint(text) {
    const el = document.getElementById('canvas-hint');
    if (el) el.textContent = text;
  }

  // ── Symbol prompt (overlay) ──

  function _symConfirm() {
    const sym = document.getElementById('sym-input').value.trim();
    if (sym && pendingLink) {
      dfa.addTransition(pendingLink.fromId, sym, pendingLink.toId);
      updateUI(); render();
    }
    _symCancel();
  }

  function _symCancel() {
    pendingLink = null;
    document.getElementById('sym-overlay').classList.remove('show');
    document.getElementById('sym-input').value = '';
  }

  // ── Public actions ──

  function setTool(t) {
    tool = t;
    document.getElementById('tool-add').classList.toggle('active', t === 'add');
    document.getElementById('tool-sel').classList.toggle('active', t === 'select');
    if (!linking) canvas.className = t === 'select' ? 'sel-cur' : '';
    document.getElementById('tool-hint').textContent =
      t === 'add' ? 'Click canvas to add states · Drag to move'
                  : 'Click state to select · Right-click for options';
  }

  function _setStart(id)    { dfa.setStart(id);     updateUI(); render(); }
  function _toggleAccept(id){ dfa.toggleAccept(id); updateUI(); render(); }
  function _del(id)         {
    dfa.removeState(id);
    if (selId === id) selId = null;
    updateUI(); render();
  }
  function _rename(id) {
    const s = dfa.states.get(id);
    if (!s) return;
    const nl = prompt('New label:', s.label);
    if (nl && nl.trim()) { dfa.renameState(id, nl.trim()); updateUI(); render(); }
  }

  function deleteSelected() { if (selId) _del(selId); }

  function addTransition() {
    const from = document.getElementById('t-from').value;
    const sym  = document.getElementById('t-sym').value.trim();
    const to   = document.getElementById('t-to').value;
    if (!from || !sym || !to) { alert('Fill all transition fields.'); return; }
    dfa.addTransition(from, sym, to);
    document.getElementById('t-sym').value = '';
    updateUI(); render();
  }

  function _rmTrans(from, sym) {
    dfa.removeTransition(from, sym);
    updateUI(); render();
  }

  // ── Simulation ──

  function runSim() {
    const input = document.getElementById('sim-str').value;
    const res = dfa.simulate(input);
    simPath   = res.path;
    simStep   = 0;
    simActive = true;
    _renderSimResult(res, input);
    document.getElementById('step-ctrl').style.display = 'flex';
    _updateStep();
    render();
  }

  function resetSim() {
    simPath = null; simStep = 0; simActive = false;
    document.getElementById('step-ctrl').style.display = 'none';
    document.getElementById('result-badge').className = 'badge idle';
    document.getElementById('result-badge').textContent = '—';
    document.getElementById('path-row').innerHTML = '';
    document.getElementById('err-msg').textContent = '';
    render();
  }

  function onSimInput() { if (simActive) resetSim(); }

  function stepBack() {
    if (!simPath || simStep <= 0) return;
    simStep--; _updateStep(); render();
  }

  function stepFwd() {
    if (!simPath || simStep >= simPath.length - 1) return;
    simStep++; _updateStep(); render();
  }

  function _updateStep() {
    const len = simPath ? simPath.length - 1 : 0;
    document.getElementById('step-ind').textContent = `${simStep} / ${len}`;
    document.getElementById('btn-bk').disabled  = simStep <= 0;
    document.getElementById('btn-fwd').disabled = !simPath || simStep >= simPath.length - 1;
    document.querySelectorAll('.pnode').forEach((n, i) => {
      n.classList.toggle('cur', i === simStep);
    });
  }

  function _renderSimResult(res, input) {
    const badge = document.getElementById('result-badge');
    badge.className = 'badge ' + (res.accepted ? 'ok' : 'fail');
    badge.textContent = res.accepted ? 'ACCEPTED' : 'REJECTED';

    const pr = document.getElementById('path-row');
    let h = '';
    (res.path ?? []).forEach((step, i) => {
      const s = dfa.states.get(step.state);
      const lbl = s?.label ?? step.state;
      const fin = i === res.path.length - 1 && res.accepted;
      if (i > 0) h += `<span style="color:var(--dim);font-size:10px;align-self:center">─${input[i-1]}→</span>`;
      h += `<span class="pnode${fin?' fin':''}" data-i="${i}" title="${lbl}">${lbl}</span>`;
    });
    pr.innerHTML = h;
    pr.querySelectorAll('.pnode').forEach(n =>
      n.addEventListener('click', () => { simStep = +n.dataset.i; _updateStep(); render(); })
    );

    document.getElementById('err-msg').textContent = res.error ?? '';
  }

  // ── UI update ──

  function updateUI() {
    document.getElementById('sc').textContent = dfa.states.size;

    // State list
    let sh = '';
    for (const [, s] of dfa.states) {
      const dot = s.isStart && s.isAccept ? 'both' : s.isAccept ? 'accept' : s.isStart ? 'start' : 'normal';
      const tags = (s.isStart ? '▶ ' : '') + (s.isAccept ? '★' : '');
      sh += `<div class="sitem${selId === s.id ? ' sel' : ''}" onclick="App._select('${s.id}')">
        <div class="sdot ${dot}"></div>
        <span style="font-family:monospace;font-size:12px">${s.label}</span>
        ${tags ? `<span class="stags">${tags.trim()}</span>` : ''}
      </div>`;
    }
    document.getElementById('state-list').innerHTML =
      sh || '<div style="font-size:12px;color:var(--dim);padding:3px">No states — click canvas to add</div>';

    // Selects
    let opts = '<option value="">Select…</option>';
    for (const [, s] of dfa.states) opts += `<option value="${s.id}">${s.label}</option>`;
    document.getElementById('t-from').innerHTML = opts;
    document.getElementById('t-to').innerHTML   = opts;

    // Transition list
    let th = '';
    for (const t of dfa.getTransitions()) {
      const fl = dfa.states.get(t.from)?.label ?? t.from;
      const tl = dfa.states.get(t.to)?.label   ?? t.to;
      th += `<div class="titem">
        <span class="lbl">${fl}</span>
        <span class="sym">─${t.symbol}→</span>
        <span class="lbl">${tl}</span>
        <button class="del" onclick="App._rmTrans('${t.from}','${t.symbol}')" title="Remove">✕</button>
      </div>`;
    }
    document.getElementById('t-list').innerHTML =
      th || '<div style="font-size:11px;color:var(--dim)">No transitions</div>';

    // Alphabet
    const al = [...dfa.alphabet].sort().join(', ');
    document.getElementById('alpha-disp').textContent = `Σ = {${al || '∅'}}`;

    // Delete button
    document.getElementById('del-btn').style.display = selId ? 'flex' : 'none';
  }

  function _select(id) { selId = id; setTool('select'); updateUI(); render(); }

  // ── Clear / Example ──

  function clearAll() {
    if (!dfa.states.size) return;
    if (!confirm('Clear all states and transitions?')) return;
    dfa.reset(); selId = null; _cancelLink(); resetSim(); updateUI(); render();
  }

  function loadExample() {
    dfa.reset(); selId = null; _cancelLink(); resetSim();
    const W = canvas.width, H = canvas.height;
    const cx = W/2, cy = H/2;

    // DFA accepting {a,b}* strings ending with 'ab'
    const q0 = dfa.addState(cx - 200, cy, 'q0');
    const q1 = dfa.addState(cx,       cy, 'q1');
    const q2 = dfa.addState(cx + 200, cy, 'q2');
    dfa.setStart(q0.id);
    dfa.toggleAccept(q2.id);
    dfa.addTransition(q0.id, 'a', q1.id);
    dfa.addTransition(q0.id, 'b', q0.id);
    dfa.addTransition(q1.id, 'a', q1.id);
    dfa.addTransition(q1.id, 'b', q2.id);
    dfa.addTransition(q2.id, 'a', q1.id);
    dfa.addTransition(q2.id, 'b', q0.id);

    document.getElementById('status-txt').textContent = 'Example: ends in "ab"';
    updateUI(); render();
  }

  // ── Theme toggle ──

  function toggleTheme() {
    classic = !classic;
    document.body.classList.toggle('classic', classic);
    renderer.setClassic(classic);
    const btn = document.getElementById('theme-btn');
    if (btn) btn.textContent = classic ? '🌙 Dark' : '☀ Classic';
    render();
  }

  // ── Type switching ──

  function switchType(type) {
    document.querySelectorAll('#nav button').forEach(b => b.classList.remove('active'));
    document.querySelector(`#nav button[data-type="${type}"]`).classList.add('active');

    const isDFA = type === 'DFA';
    document.getElementById('sidebar').style.display       = isDFA ? '' : 'none';
    document.getElementById('dfa-view').style.display      = isDFA ? '' : 'none';
    document.getElementById('coming-soon').style.display   = isDFA ? 'none' : 'flex';

    if (!isDFA) {
      const desc = {
        NFA:  'Nondeterministic Finite Automata with ε-transitions — coming soon.',
        GNFA: 'Generalised NFA for regex conversion — coming soon.',
        PDA:  'Pushdown Automata with stack operations — coming soon.',
        TM:   'Turing Machines with an infinite tape — coming soon.'
      };
      document.getElementById('cs-title').textContent = type;
      document.getElementById('cs-desc').textContent  = desc[type] ?? '';
    }
  }

  // ── Expose ──
  return {
    init,
    setTool,
    _setStart, _toggleAccept, _del, _rename, _select, _rmTrans,
    _startLink, _cancelLink,
    _symConfirm, _symCancel,
    deleteSelected, addTransition,
    runSim, resetSim, onSimInput, stepBack, stepFwd, clearAll, loadExample,
    toggleTheme
  };
})();

// ── Global helpers wired to inline onclick attributes ──
window.App            = App;
window.setTool        = t  => App.setTool(t);
window.addTransition  = () => App.addTransition();
window.runSim         = () => App.runSim();
window.resetSim       = () => App.resetSim();
window.onSimInput     = () => App.onSimInput();
window.stepBack       = () => App.stepBack();
window.stepFwd        = () => App.stepFwd();
window.clearAll       = () => App.clearAll();
window.loadExample    = () => App.loadExample();
window.deleteSelected = () => App.deleteSelected();
window.toggleTheme    = () => App.toggleTheme();

document.addEventListener('DOMContentLoaded', () => App.init());
