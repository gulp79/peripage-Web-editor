/* ==========================================================================
   Layout Persistence & PNG Export
   ========================================================================== */

import { S, setUid } from './state.js';
import { STORAGE_KEY_LAYOUT } from './constants.js';
import { $, $$ } from './dom.js';
import { log } from './bluetooth.js';
import { paint, ensureFonts } from './raster.js';

export function saveLayout(){
  const data = {
    width: S.width,
    density: S.density,
    els: S.els.map(e => { const c = {...e}; delete c._img; return c; })
  };
  localStorage.setItem(STORAGE_KEY_LAYOUT, JSON.stringify(data));
  log('Layout saved to this browser.', 'o');
}

export function loadLayout(onLoaded){
  const raw = localStorage.getItem(STORAGE_KEY_LAYOUT);
  if (!raw){ log('No saved layout.', 'w'); return; }
  try{
    const d = JSON.parse(raw);
    S.width = d.width || 384;
    S.density = d.density ?? 1;
    S.els = d.els || [];
    let nextId = 1;
    S.els.forEach(e => {
      e.id = nextId++;
      e.collapsed = true;
    });
    setUid(nextId);
    const paperW = $('#paperW');
    if (paperW) paperW.value = String(S.width);
    $$('#density button').forEach(x => x.classList.toggle('on', +x.dataset.d === S.density));
    S.els.filter(e => e.type === 'image' && e.src).forEach(e => {
      const img = new Image();
      img.onload = () => { e._img = img; paint(); };
      img.src = e.src;
    });
    if (onLoaded) onLoaded();
    ensureFonts().then(paint);
    log('Layout loaded.', 'o');
  }catch(e){ log('Load failed: ' + e.message, 'e'); }
}

export function exportPng(){
  const cv = $('#cv');
  if (!cv) return;
  cv.toBlob(b => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(b);
    a.download = 'peripage-' + Date.now() + '.png';
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  });
}
