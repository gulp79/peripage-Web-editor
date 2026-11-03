/* ==========================================================================
   UI Components, Interactions & Event Handling
   ========================================================================== */

import { S, makeEl, byId, nextUid } from './state.js';
import { FONTS, EMOJI, EMOJI_KEYWORDS } from './constants.js';
import { BORDERS, paint, repaintWhenFontsReady } from './raster.js';
import { saveLayout, loadLayout, exportPng } from './persistence.js';
import {
  connect, disconnect, doPrint, probeChars, doTest, feedPaper, resetPrinter, selectCharacteristic
} from './bluetooth.js';
import {
  saveCurrentAsPreset, deleteCustomPreset, exportPresets, exportSinglePreset,
  exportCurrentLabel, importPresets, loadPreset, renderPresetModalList,
  openPresetModal, closePresetModal, buildPresets, togglePresetSaveForm,
  getAllPresets, loadCustomPresets, setOnPresetLoaded
} from './presets.js';
import { $, $$, esc } from './dom.js';

let emojiTarget = null;
let emojiCat = Object.keys(EMOJI)[0];

export function openEmoji(ta, el, key){
  emojiTarget = { ta, el, key: key || 'text' };
  $('#emojiSearch').value = '';
  emojiCat = Object.keys(EMOJI)[0];
  renderEmoji();
  $('#emojiModal').hidden = false;
  $('#emojiSearch').focus();
}

export function closeEmoji(){
  $('#emojiModal').hidden = true;
  emojiTarget = null;
}

export function renderEmoji(){
  const q = $('#emojiSearch').value.trim().toLowerCase();
  $('#emojiCats').innerHTML = Object.keys(EMOJI).map(c =>
    `<button data-cat="${c}" class="${!q && c===emojiCat?'on':''}">${c}</button>`).join('');
  let chars;
  if (q){
    chars = Object.values(EMOJI).join(' ').split(/\s+/).filter(Boolean)
      .filter(ch => (EMOJI_KEYWORDS[ch]||'').includes(q));
    if (!chars.length)
      chars = Object.entries(EMOJI).filter(([c]) => c.toLowerCase().includes(q))
                .flatMap(([,v]) => v.split(/\s+/)).filter(Boolean);
  } else {
    chars = EMOJI[emojiCat].split(/\s+/).filter(Boolean);
  }
  $('#emojiGrid').innerHTML = chars.length
    ? chars.map(ch => `<button data-emoji="${ch}" title="${ch}">${ch}</button>`).join('')
    : `<div class="enone">Nothing matches “${esc(q)}”.</div>`;
}

export function insertEmoji(ch){
  if (!emojiTarget) return;
  const { ta, el, key } = emojiTarget;
  const a = ta.selectionStart ?? ta.value.length, b = ta.selectionEnd ?? a;
  ta.value = ta.value.slice(0,a) + ch + ta.value.slice(b);
  el[key] = ta.value;
  const item = ta.closest('.item');
  if (item) item.querySelector('.ttl').textContent = title(el);
  ta.focus();
  ta.selectionStart = ta.selectionEnd = a + ch.length;
  repaintWhenFontsReady();
}

/* ------------------------------------------------------------ form controls */
const F = (label, html) => `<div class="f"><label>${label}</label>${html}</div>`;
const num = (el,k,label,min,max,step) =>
  F(label, `<input type="number" data-id="${el.id}" data-k="${k}" data-t="n" value="${el[k]}" min="${min}" max="${max}" step="${step||1}" style="font-family:JetBrains Mono">`);
const rng = (el,k,label,min,max,step) =>
  F(`${label} <b style="color:var(--tx); font-family:JetBrains Mono">${el[k]}</b>`,
    `<input type="range" data-id="${el.id}" data-k="${k}" data-t="n" value="${el[k]}" min="${min}" max="${max}" step="${step||1}">`);
const sel = (el,k,label,opts) =>
  F(label, `<select data-id="${el.id}" data-k="${k}" style="font-size:11.5px">` +
    opts.map(([v,t]) => `<option value="${v}"${String(el[k])===String(v)?' selected':''}>${t}</option>`).join('') +
    `</select>`);
const chk = (el,k,label) =>
  `<label style="display:flex;gap:6px;align-items:center;color:var(--tx);margin:0 0 8px;cursor:pointer">
     <input type="checkbox" data-id="${el.id}" data-k="${k}" data-t="b"${el[k]?' checked':''}> ${label}</label>`;
const ALIGN = [['left','Left'],['center','Centre'],['right','Right']];

export function borderSelect(el){
  const groups = {};
  for (const [k,b] of Object.entries(BORDERS)) (groups[b.group] ||= []).push([k, b.label]);
  const html = Object.entries(groups).map(([g,list]) =>
    `<optgroup label="${g}">` + list.map(([v,t]) =>
      `<option value="${v}"${el.border===v?' selected':''}>${t}</option>`).join('') +
    `</optgroup>`).join('');
  return `<div class="f"><label>Border</label>` +
         `<select data-id="${el.id}" data-k="border" style="font-size:11.5px">${html}</select></div>`;
}

export function fontSelect(el){
  const groups = FONTS.map(([g, list]) =>
    `<optgroup label="${g}">` + list.map(([v,t]) =>
      `<option value="${esc(v)}"${el.family===v?' selected':''}>${t}</option>`).join('') +
    `</optgroup>`).join('');
  const known = FONTS.some(([,l]) => l.some(([v]) => v === el.family));
  const extra = known ? '' :
    `<option value="${esc(el.family)}" selected>${esc(el.family)} (saved)</option>`;
  return `<div class="f"><label>Font</label>` +
         `<select data-id="${el.id}" data-k="family" data-font="1" style="font-size:11.5px">${extra}${groups}</select></div>`;
}

export function title(el){
  switch(el.type){
    case 'text':    return (el.text||'').split('\n')[0].slice(0,40) || 'empty';
    case 'image':   return el.name || (el.src ? 'image' : 'no file chosen');
    case 'qr':      return el.value.slice(0,40);
    case 'barcode': return el.format + ' · ' + el.value.slice(0,24);
    case 'rule':    return el.style + ' ' + el.thickness + 'px';
    case 'space':   return el.height + 'px gap';
    case 'card':    return `${el.to||'—'} ← ${el.from||'—'} · ${BORDERS[el.border]?.label||el.border}`;
  }
}

export function bodyFor(el){
  const sp = `<div class="grid2">${num(el,'before','Space above',0,300)}${num(el,'after','Space below',0,300)}</div>`;
  switch(el.type){
    case 'text': return `
      <div class="f"><label>Text</label>
        <div class="tbar">
          <button data-emoji-btn="${el.id}" data-emoji-k="text">😀 Emoji</button>
          <button data-case="${el.id}" data-mode="upper">AA</button>
          <button data-case="${el.id}" data-mode="lower">aa</button>
        </div>
        <textarea data-id="${el.id}" data-k="text">${esc(el.text)}</textarea>
      </div>
      <div class="grid2">
        ${fontSelect(el)}
        ${num(el,'size','Size (px)',6,220)}
      </div>
      <div class="grid2">${sel(el,'align','Align',ALIGN)}${num(el,'tracking','Letter space',-5,30)}</div>
      ${rng(el,'lineHeight','Line height',0.8,3,0.05)}
      <div class="row" style="gap:14px;margin-bottom:8px">
        ${chk(el,'bold','Bold')}${chk(el,'italic','Italic')}${chk(el,'invert','Invert')}
      </div>${sp}`;

    case 'image': return `
      ${F('File', `<input type="file" accept="image/*" data-file="${el.id}" style="padding:4px">`)}
      <div class="grid2">${rng(el,'scale','Width %',5,100)}${sel(el,'align','Align',ALIGN)}</div>
      ${sel(el,'dither','Halftone',[['floyd','Floyd–Steinberg'],['atkinson','Atkinson'],
                                    ['bayer','Ordered 8×8'],['threshold','Hard threshold']])}
      ${el.dither==='threshold' ? rng(el,'threshold','Threshold',1,254) : ''}
      ${rng(el,'brightness','Brightness',-120,120)}
      ${rng(el,'contrast','Contrast',-100,100)}
      ${chk(el,'invert','Invert')}${sp}`;

    case 'qr': return `
      ${F('Content', `<textarea data-id="${el.id}" data-k="value">${esc(el.value)}</textarea>`)}
      <div class="grid2">${num(el,'size','Size (px)',48,S.width)}${sel(el,'align','Align',ALIGN)}</div>
      ${sel(el,'ecc','Error correction',[['L','L · 7%'],['M','M · 15%'],['Q','Q · 25%'],['H','H · 30%']])}${sp}`;

    case 'barcode': return `
      ${F('Value', `<input type="text" data-id="${el.id}" data-k="value" value="${esc(el.value)}">`)}
      ${sel(el,'format','Symbology',[['CODE128','Code 128'],['CODE39','Code 39'],['EAN13','EAN-13'],
                                     ['EAN8','EAN-8'],['UPC','UPC-A'],['ITF14','ITF-14'],['MSI','MSI'],
                                     ['pharmacode','Pharmacode']])}
      <div class="grid2">${num(el,'height','Bar height',20,300)}${sel(el,'align','Align',ALIGN)}</div>
      ${chk(el,'showValue','Print value below')}${sp}`;

    case 'rule': return `
      <div class="grid2">${sel(el,'style','Style',[['solid','Solid'],['dashed','Dashed'],['dotted','Dotted']])}
      ${num(el,'thickness','Thickness',1,40)}</div>
      ${num(el,'inset','Side inset',0,150)}${sp}`;

    case 'space': return num(el,'height','Height (px)',1,400);

    case 'card': return `
      <div class="grid2">
        ${F('To', `<input type="text" data-id="${el.id}" data-k="to" value="${esc(el.to)}">`)}
        ${F('From', `<input type="text" data-id="${el.id}" data-k="from" value="${esc(el.from)}">`)}
      </div>
      <div class="f"><label>Message</label>
        <div class="tbar"><button data-emoji-btn="${el.id}" data-emoji-k="message">😀 Emoji</button></div>
        <textarea data-id="${el.id}" data-k="message" style="min-height:48px">${esc(el.message)}</textarea>
      </div>
      <div class="f"><label>Ornament</label>
        <div class="tbar"><button data-emoji-btn="${el.id}" data-emoji-k="ornament">😀 Pick</button></div>
        <input type="text" data-id="${el.id}" data-k="ornament" value="${esc(el.ornament)}">
      </div>
      ${fontSelect(el)}
      ${borderSelect(el)}
      <div class="grid2">${num(el,'size','Name size',10,90)}${num(el,'weight','Border weight',1,12)}</div>
      <div class="grid2">${num(el,'padding','Padding',0,80)}${num(el,'inset','Side inset',0,60)}</div>
      <div class="row" style="gap:14px;margin-bottom:8px">
        ${chk(el,'labels','To / From labels')}${chk(el,'divider','Divider')}
      </div>${sp}`;
  }
}

export function buildList(){
  const wrapEl = $('#list');
  if (!wrapEl) return;
  if (!S.els.length){
    wrapEl.innerHTML = `<div class="empty">Nothing yet.<br>Add a block above to start.</div>`;
    paint(); return;
  }
  wrapEl.innerHTML = S.els.map((el,i) => `
    <div class="item t-${el.type} ${el.collapsed?'collapsed':''} ${S.sel===el.id?'sel':''}" data-item="${el.id}">
      <div class="top" data-toggle="${el.id}">
        <span class="handle" data-handle="${el.id}" title="Drag to reorder">⠿</span>
        <span class="chev">${el.collapsed ? '▶' : '▼'}</span>
        <span class="kind">${el.type}</span>
        <span class="ttl">${esc(title(el))}</span>
        <button class="mini ghost" data-move="${el.id}" data-dir="-1" ${i===0?'disabled':''} title="Up">↑</button>
        <button class="mini ghost" data-move="${el.id}" data-dir="1" ${i===S.els.length-1?'disabled':''} title="Down">↓</button>
        <button class="mini ghost" data-dup="${el.id}" title="Duplicate">⧉</button>
        <button class="mini ghost danger" data-del="${el.id}" title="Delete">✕</button>
      </div>
      <div class="body">${bodyFor(el)}</div>
    </div>`).join('');
  paint();
}

/* ------------------------------------------------------------ grid overlay */
const gridOv = document.createElement('div');
Object.assign(gridOv.style, {position:'absolute', inset:'0', pointerEvents:'none', display:'none'});

export function drawGrid(){
  const z = S.zoom;
  gridOv.style.display = S.grid && z >= 2 ? 'block' : 'none';
  gridOv.style.backgroundImage =
    `linear-gradient(to right, rgba(59,130,246,.35) 1px, transparent 1px),
     linear-gradient(to bottom, rgba(59,130,246,.35) 1px, transparent 1px)`;
  gridOv.style.backgroundSize = `${z}px ${z}px`;
}

/* ------------------------------------------------------------ drag reorder */
let drag = null;

function afterElement(list, y){
  return [...list.querySelectorAll('.item:not(.dragging)')].reduce((best, child) => {
    const box = child.getBoundingClientRect();
    const offset = y - box.top - box.height/2;
    return (offset < 0 && offset > best.offset) ? { offset, el:child } : best;
  }, { offset: -Infinity }).el || null;
}

function autoScroll(y){
  const box = $('.col.left');
  if (!box) return;
  const r = box.getBoundingClientRect(), edge = 48;
  if (y < r.top + edge)         box.scrollTop -= Math.ceil((r.top + edge - y)/4);
  else if (y > r.bottom - edge) box.scrollTop += Math.ceil((y - r.bottom + edge)/4);
}

function endDrag(){
  if (!drag) return;
  const order = $$('#list .item').map(n => +n.dataset.item);
  S.els.sort((a,b) => order.indexOf(a.id) - order.indexOf(b.id));
  drag.item.classList.remove('dragging');
  $('#list')?.classList.remove('dragging-active');
  drag = null;
  buildList();
}

/* ------------------------------------------------------------ event bindings */
export function initUI(){
  const paper = $('#paper');
  if (paper && !paper.contains(gridOv)){
    paper.appendChild(gridOv);
  }

  setOnPresetLoaded(buildList);

  const listEl = $('#list');
  if (listEl){
    listEl.addEventListener('click', ev => {
      if (ev.target.closest('[data-handle]')) return;
      const t = ev.target.closest('[data-move],[data-dup],[data-del],[data-toggle]');
      if (!t) return;
      if (t.dataset.move){
        ev.stopPropagation();
        const i = S.els.findIndex(e => e.id === +t.dataset.move);
        const j = i + (+t.dataset.dir);
        if (j >= 0 && j < S.els.length){ [S.els[i], S.els[j]] = [S.els[j], S.els[i]]; buildList(); }
      } else if (t.dataset.dup){
        ev.stopPropagation();
        const el = byId(t.dataset.dup);
        const copy = {...el, id:nextUid()};
        S.els.splice(S.els.indexOf(el)+1, 0, copy);
        buildList();
      } else if (t.dataset.del){
        ev.stopPropagation();
        S.els = S.els.filter(e => e.id !== +t.dataset.del);
        buildList();
      } else if (t.dataset.toggle){
        const el = byId(t.dataset.toggle);
        el.collapsed = !el.collapsed;
        S.sel = el.id;
        buildList();
      }
    });

    listEl.addEventListener('click', ev => {
      const eb = ev.target.closest('[data-emoji-btn]');
      if (eb){
        ev.stopPropagation();
        const id  = eb.dataset.emojiBtn, key = eb.dataset.emojiK || 'text';
        const el  = byId(id);
        const fld = eb.closest('.item').querySelector(`[data-id="${id}"][data-k="${key}"]`);
        if (el && fld) openEmoji(fld, el, key);
        return;
      }
      const cb = ev.target.closest('[data-case]');
      if (cb){
        ev.stopPropagation();
        const el = byId(cb.dataset.case);
        const ta = cb.closest('.f').querySelector('textarea');
        if (!el || !ta) return;
        ta.value = el.text = cb.dataset.mode === 'upper'
          ? el.text.toUpperCase() : el.text.toLowerCase();
        const item = ta.closest('.item');
        if (item) item.querySelector('.ttl').textContent = title(el);
        paint();
      }
    });

    listEl.addEventListener('input', ev => {
      const i = ev.target;
      if (!i.dataset.k) return;
      const el = byId(i.dataset.id);
      if (!el) return;
      const t = i.dataset.t;
      el[i.dataset.k] = t === 'n' ? parseFloat(i.value) : t === 'b' ? i.checked : i.value;
      const item = i.closest('.item');
      if (item) item.querySelector('.ttl').textContent = title(el);
      const lab = i.closest('.f')?.querySelector('label b');
      if (lab) lab.textContent = i.value;
      if (i.dataset.k === 'dither'){ buildList(); return; }
      if (i.dataset.font){ repaintWhenFontsReady(); return; }
      if (i.dataset.k === 'border'){ paint(); return; }
      paint();
    });

    listEl.addEventListener('change', ev => {
      const f = ev.target;
      if (!f.dataset.file) return;
      const el = byId(f.dataset.file), file = f.files[0];
      if (!el || !file) return;
      const r = new FileReader();
      r.onload = () => {
        el.src = r.result; el.name = file.name;
        const img = new Image();
        img.onload = () => { el._img = img; buildList(); };
        img.src = r.result;
      };
      r.readAsDataURL(file);
    });

    listEl.addEventListener('pointerdown', ev => {
      const h = ev.target.closest('[data-handle]');
      if (!h) return;
      const item = h.closest('.item');
      if (!item) return;
      ev.preventDefault();
      try { h.setPointerCapture(ev.pointerId); } catch(e){}
      drag = { item, id:+item.dataset.item };
      item.classList.add('dragging');
      listEl.classList.add('dragging-active');
    });

    listEl.addEventListener('pointermove', ev => {
      if (!drag) return;
      ev.preventDefault();
      const after = afterElement(listEl, ev.clientY);
      if (after == null) listEl.appendChild(drag.item);
      else if (after !== drag.item) listEl.insertBefore(drag.item, after);
      autoScroll(ev.clientY);
    });

    listEl.addEventListener('pointerup', endDrag);
    listEl.addEventListener('pointercancel', endDrag);
  }

  $$('[data-add]').forEach(b => b.addEventListener('click', () => {
    const el = makeEl(b.dataset.add);
    el.collapsed = false;
    S.els.push(el); S.sel = el.id;
    buildList();
    $('#list')?.lastElementChild?.scrollIntoView({block:'nearest'});
  }));

  const btnClear = $('#btnClear');
  if (btnClear) btnClear.onclick = () => {
    if (S.els.length && confirm('Remove all blocks?')){ S.els = []; buildList(); }
  };

  const btnCollapse = $('#btnCollapse');
  if (btnCollapse) btnCollapse.onclick = () => {
    const any = S.els.some(e => !e.collapsed);
    S.els.forEach(e => e.collapsed = any);
    buildList();
  };

  const zoomSel = $('#zoom');
  if (zoomSel) zoomSel.onchange = e => {
    S.zoom = parseFloat(e.target.value);
    paint();
    drawGrid();
  };

  const paperWSel = $('#paperW');
  if (paperWSel) paperWSel.onchange = e => {
    S.width = parseInt(e.target.value, 10);
    buildList();
  };

  $$('#density button').forEach(b => b.onclick = () => {
    S.density = +b.dataset.d;
    $$('#density button').forEach(x => x.classList.toggle('on', x === b));
  });

  const btnGrid = $('#btnGrid');
  if (btnGrid) btnGrid.onclick = () => {
    S.grid = !S.grid;
    btnGrid.classList.toggle('on');
    drawGrid();
  };

  const btnSave = $('#btnSave');
  if (btnSave) btnSave.onclick = saveLayout;

  const btnLoad = $('#btnLoad');
  if (btnLoad) btnLoad.onclick = () => loadLayout(buildList);

  const btnPng = $('#btnPng');
  if (btnPng) btnPng.onclick = exportPng;

  /* Emoji modal events */
  const emojiCats = $('#emojiCats');
  if (emojiCats) emojiCats.addEventListener('click', ev => {
    const b = ev.target.closest('[data-cat]');
    if (!b) return;
    emojiCat = b.dataset.cat;
    $('#emojiSearch').value = '';
    renderEmoji();
  });

  const emojiGrid = $('#emojiGrid');
  if (emojiGrid) emojiGrid.addEventListener('click', ev => {
    const b = ev.target.closest('[data-emoji]');
    if (b) insertEmoji(b.dataset.emoji);
  });

  const emojiSearch = $('#emojiSearch');
  if (emojiSearch) emojiSearch.addEventListener('input', renderEmoji);

  const emojiClose = $('#emojiClose');
  if (emojiClose) emojiClose.onclick = closeEmoji;

  const emojiModal = $('#emojiModal');
  if (emojiModal) emojiModal.addEventListener('click', ev => {
    if (ev.target === emojiModal) closeEmoji();
  });

  /* Preset section and manager events */
  const presetHdr = $('#presetHdr');
  if (presetHdr) presetHdr.addEventListener('click', () => {
    const open = presetHdr.classList.toggle('open');
    $('#presetBody').style.display = open ? '' : 'none';
  });

  const btnPresetToggle = $('#btnPresetToggle');
  if (btnPresetToggle) btnPresetToggle.addEventListener('click', ev => {
    ev.stopPropagation();
    togglePresetSaveForm();
  });

  const btnShowSavePreset = $('#btnShowSavePreset');
  if (btnShowSavePreset) btnShowSavePreset.addEventListener('click', () => {
    togglePresetSaveForm(true);
  });

  const btnManagePresets = $('#btnManagePresets');
  if (btnManagePresets) btnManagePresets.addEventListener('click', () => {
    openPresetModal();
  });

  const btnOpenPresetModal = $('#btnOpenPresetModal');
  if (btnOpenPresetModal) btnOpenPresetModal.addEventListener('click', ev => {
    ev.stopPropagation();
    openPresetModal();
  });

  const btnPresetCancel = $('#btnPresetCancel');
  if (btnPresetCancel) btnPresetCancel.addEventListener('click', () => {
    togglePresetSaveForm(false);
  });

  const presetSaveForm = $('#presetSaveForm');
  if (presetSaveForm) presetSaveForm.addEventListener('submit', e => {
    e.preventDefault();
    saveCurrentAsPreset();
  });

  const btnPresetSave = $('#btnPresetSave');
  if (btnPresetSave) btnPresetSave.addEventListener('click', e => {
    e.preventDefault();
    saveCurrentAsPreset();
  });

  const presetGrid = $('#presetGrid');
  if (presetGrid) presetGrid.addEventListener('click', ev => {
    const delBtn = ev.target.closest('[data-del]');
    if (delBtn) {
      ev.stopPropagation();
      const id = delBtn.dataset.del;
      const customs = loadCustomPresets();
      const p = customs.find(x => x.id === id);
      const name = p ? p.name : id;
      if (confirm(`Delete preset "${name}"?`)) {
        deleteCustomPreset(id);
      }
      return;
    }
    const expBtn = ev.target.closest('[data-exp]');
    if (expBtn) {
      ev.stopPropagation();
      exportSinglePreset(expBtn.dataset.exp);
      return;
    }
    const b = ev.target.closest('[data-preset]');
    if (!b) return;
    const all = getAllPresets();
    const preset = all.find(p => p.id === b.dataset.preset);
    if (preset) loadPreset(preset, buildList);
  });

  const btnExportPresets = $('#btnExportPresets');
  if (btnExportPresets) btnExportPresets.addEventListener('click', exportPresets);

  const btnExportCurrentPreset = $('#btnExportCurrentPreset');
  if (btnExportCurrentPreset) btnExportCurrentPreset.addEventListener('click', exportCurrentLabel);

  const btnImportPresets = $('#btnImportPresets');
  if (btnImportPresets) btnImportPresets.addEventListener('click', () => {
    $('#presetImportInput')?.click();
  });

  const presetImportInput = $('#presetImportInput');
  if (presetImportInput) presetImportInput.addEventListener('change', ev => {
    const file = ev.target.files && ev.target.files[0];
    if (file) {
      importPresets(file);
      ev.target.value = '';
    }
  });

  /* Modal interactions */
  const presetModalClose = $('#presetModalClose');
  if (presetModalClose) presetModalClose.onclick = closePresetModal;

  const presetModal = $('#presetModal');
  if (presetModal) presetModal.addEventListener('click', ev => {
    if (ev.target === presetModal) closePresetModal();
  });

  const presetSearch = $('#presetSearch');
  if (presetSearch) presetSearch.addEventListener('input', renderPresetModalList);

  const btnModalImport = $('#btnModalImport');
  if (btnModalImport) btnModalImport.addEventListener('click', () => {
    $('#presetImportInput')?.click();
  });

  const btnModalExportAll = $('#btnModalExportAll');
  if (btnModalExportAll) btnModalExportAll.addEventListener('click', exportPresets);

  const btnModalSaveCurrent = $('#btnModalSaveCurrent');
  if (btnModalSaveCurrent) btnModalSaveCurrent.addEventListener('click', () => {
    closePresetModal();
    togglePresetSaveForm(true);
  });

  const presetModalList = $('#presetModalList');
  if (presetModalList) presetModalList.addEventListener('click', ev => {
    const loadBtn = ev.target.closest('[data-modal-load]');
    if (loadBtn) {
      const id = loadBtn.dataset.modalLoad;
      const preset = getAllPresets().find(p => p.id === id);
      if (preset) {
        loadPreset(preset, buildList);
        closePresetModal();
      }
      return;
    }
    const expBtn = ev.target.closest('[data-modal-exp]');
    if (expBtn) {
      exportSinglePreset(expBtn.dataset.modalExp);
      return;
    }
    const delBtn = ev.target.closest('[data-modal-del]');
    if (delBtn) {
      const id = delBtn.dataset.modalDel;
      const customs = loadCustomPresets();
      const p = customs.find(x => x.id === id);
      const name = p ? p.name : id;
      if (confirm(`Delete preset "${name}"?`)) {
        deleteCustomPreset(id);
        renderPresetModalList();
      }
      return;
    }
  });

  /* Global keyboard shortcut */
  document.addEventListener('keydown', ev => {
    if (ev.key === 'Escape') {
      if (!$('#emojiModal')?.hidden) closeEmoji();
      if (!$('#presetModal')?.hidden) closePresetModal();
    }
  });

  /* Bluetooth button events */
  const btnConnect = $('#btnConnect');
  if (btnConnect) btnConnect.onclick = connect;

  const btnDisconnect = $('#btnDisconnect');
  if (btnDisconnect) btnDisconnect.onclick = disconnect;

  const charSel = $('#charSel');
  if (charSel) charSel.onchange = e => selectCharacteristic(e.target.value);

  const btnPrint = $('#btnPrint');
  if (btnPrint) btnPrint.onclick = doPrint;

  const btnProbe = $('#btnProbe');
  if (btnProbe) btnProbe.onclick = probeChars;

  const btnTest = $('#btnTest');
  if (btnTest) btnTest.onclick = doTest;

  const btnFeed = $('#btnFeed');
  if (btnFeed) btnFeed.onclick = feedPaper;

  const btnReset = $('#btnReset');
  if (btnReset) btnReset.onclick = resetPrinter;

  /* Log clear button */
  const btnClearLog = $('#btnClearLog');
  if (btnClearLog) {
    btnClearLog.onclick = () => { $('#log').textContent = ''; };
  }
}
