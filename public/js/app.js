/* ==========================================================================
   PeriPage Studio Application Entry Point & Composition Root
   ========================================================================== */

import { S, setUid } from './state.js';
import { PRESETS } from './presets_template.js';
import { $ } from './dom.js';
import { setConnected, log } from './bluetooth.js';
import { ensureFonts, paint } from './raster.js';
import { buildPresets } from './presets.js';
import { initUI, buildList, drawGrid } from './ui.js';

function boot(){
  // Verify external global libraries without altering normal flow
  if (typeof window.QRious === 'undefined') {
    console.warn('QRious library not found on window. QR block generation may fail.');
  }
  if (typeof window.JsBarcode === 'undefined') {
    console.warn('JsBarcode library not found on window. Barcode block generation may fail.');
  }

  // Register UI and event listeners once
  initUI();

  // Security and environment warnings
  const warn = [];
  if (!navigator.bluetooth)
    warn.push('<b>Web Bluetooth is not available here.</b> Use desktop Chrome, Edge or Chrome on Android, over <code>https://</code> or <code>http://localhost</code>.');
  else if (!window.isSecureContext)
    warn.push('<b>Insecure context.</b> Serve this page from <code>http://localhost</code> or HTTPS.');
  warn.push('If the PeriPage only exposes Bluetooth Classic (SPP), no writable GATT characteristic will appear. Try "All Bluetooth devices".');
  const secWarn = $('#secWarn');
  if (secWarn) {
    secWarn.innerHTML = `<div class="warnbox">${warn.join('<hr style="border:0;border-top:1px solid rgba(245,158,11,.2);margin:7px 0">')}</div>`;
  }

  // Initial presets population
  buildPresets();

  // Load initial preset (3D Filament by default to match design mockup)
  S.els = PRESETS[1].make();
  setUid(Math.max(...S.els.map(e => e.id)) + 1);

  buildList();
  drawGrid();
  setConnected(false);

  ensureFonts().then(paint);
  if (document.fonts) document.fonts.ready.then(paint);

  log('Ready. Connect a printer to begin.', 'd');
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}
