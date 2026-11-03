/* ==========================================================================
   Presets Management, Custom Presets & Import/Export
   ========================================================================== */

import { S, setUid } from './state.js';
import { PRESETS } from './presets_template.js';
import { STORAGE_KEY_PRESETS } from './constants.js';
import { $, esc } from './dom.js';
import { log } from './bluetooth.js';
import { paint, ensureFonts } from './raster.js';

let onPresetLoadedCallback = null;
export function setOnPresetLoaded(fn){
  onPresetLoadedCallback = fn;
}

export function loadCustomPresets() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PRESETS);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (parsed && Array.isArray(parsed.presets)) {
      return parsed.presets;
    }
    return [];
  } catch (err) {
    log('Failed to load presets from localStorage: ' + err.message, 'w');
    return [];
  }
}

export function saveCustomPresets(arr) {
  try {
    const payload = { version: 1, presets: arr };
    localStorage.setItem(STORAGE_KEY_PRESETS, JSON.stringify(payload));
    return true;
  } catch (err) {
    log('Failed to save preset to localStorage: ' + err.message, 'e');
    return false;
  }
}

export function getAllPresets() {
  const customs = loadCustomPresets().map(c => ({
    id: c.id,
    name: c.name,
    desc: c.desc || '',
    isCustom: true,
    els: c.els,
    make() {
      return JSON.parse(JSON.stringify(this.els));
    }
  }));
  return [...PRESETS, ...customs];
}

export function saveCurrentAsPreset() {
  const nameInput = $('#presetNameInput');
  const descInput = $('#presetDescInput');
  const name = (nameInput.value || '').trim();
  if (!name) {
    log('Please enter a name for the preset.', 'w');
    nameInput.focus();
    return;
  }
  if (!S.els || !S.els.length) {
    log('Current document is empty: add at least one block before saving.', 'w');
    return;
  }
  const desc = (descInput.value || '').trim().slice(0, 60);
  const cleanEls = S.els.map(e => {
    const c = { ...e };
    delete c._img;
    return c;
  });
  const customs = loadCustomPresets();
  const newPreset = {
    id: 'custom-' + Date.now(),
    name: name.slice(0, 30),
    desc,
    els: JSON.parse(JSON.stringify(cleanEls))
  };
  customs.push(newPreset);
  if (saveCustomPresets(customs)) {
    nameInput.value = '';
    descInput.value = '';
    $('#presetSaveForm').style.display = 'none';
    buildPresets();
    $('#presetHdr').classList.add('open');
    $('#presetBody').style.display = '';
    log(`Preset "${newPreset.name}" saved.`, 'o');
  }
}

export function deleteCustomPreset(id) {
  const customs = loadCustomPresets();
  const target = customs.find(p => p.id === id);
  const filtered = customs.filter(p => p.id !== id);
  if (saveCustomPresets(filtered)) {
    buildPresets();
    const name = target ? target.name : id;
    log(`Preset "${name}" deleted.`, 'o');
  }
}

export function downloadPresetJson(arr, filename) {
  const payload = { version: 1, presets: arr };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename || 'peripage-presets.json';
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}

export function exportPresets() {
  const customs = loadCustomPresets();
  if (customs.length === 0) {
    if (S.els && S.els.length) {
      if (confirm('No custom presets in the list yet.\nDo you want to save and export the current label as a preset?')) {
        const defaultName = (S.els.find(e => e.type === 'text' && e.text)?.text || 'Label').split('\n')[0].trim().slice(0, 30) || 'My Preset';
        const name = prompt('Preset name:', defaultName);
        if (!name) return;
        const cleanEls = S.els.map(e => {
          const c = { ...e };
          delete c._img;
          return c;
        });
        const newPreset = {
          id: 'custom-' + Date.now(),
          name: name.slice(0, 30),
          desc: '',
          els: JSON.parse(JSON.stringify(cleanEls))
        };
        customs.push(newPreset);
        saveCustomPresets(customs);
        buildPresets();
        downloadPresetJson(customs, 'peripage-presets.json');
        log(`Preset "${newPreset.name}" saved and exported.`, 'o');
      }
    } else {
      log('No custom presets saved to export.', 'w');
    }
    return;
  }
  downloadPresetJson(customs, 'peripage-presets.json');
  log(`Exported ${customs.length} custom preset(s).`, 'o');
}

export function exportSinglePreset(id) {
  const customs = loadCustomPresets();
  const p = customs.find(x => x.id === id);
  if (!p) return;
  const slug = p.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'preset';
  downloadPresetJson([p], `peripage-preset-${slug}.json`);
  log(`Preset "${p.name}" exported.`, 'o');
}

export function exportCurrentLabel() {
  if (!S.els || !S.els.length) {
    log('Current document is empty: add at least one block before exporting.', 'w');
    return;
  }
  const defaultName = (S.els.find(e => e.type === 'text' && e.text)?.text || 'Label').split('\n')[0].trim().slice(0, 30) || 'My Preset';
  const name = prompt('Name for the exported preset:', defaultName);
  if (!name) return;
  const cleanEls = S.els.map(e => {
    const c = { ...e };
    delete c._img;
    return c;
  });
  const newPreset = {
    id: 'custom-' + Date.now(),
    name: name.slice(0, 30),
    desc: '',
    els: JSON.parse(JSON.stringify(cleanEls))
  };
  const customs = loadCustomPresets();
  customs.push(newPreset);
  saveCustomPresets(customs);
  buildPresets();
  $('#presetHdr').classList.add('open');
  $('#presetBody').style.display = '';
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'preset';
  downloadPresetJson([newPreset], `peripage-preset-${slug}.json`);
  log(`Label "${name}" saved as preset and exported.`, 'o');
}

export function importPresets(file) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const data = JSON.parse(reader.result);
      if (!data || typeof data !== 'object') {
        throw new Error('Invalid JSON file');
      }

      let presetsToImport = [];

      if (Array.isArray(data)) {
        if (data.length > 0 && data[0].type) {
          const autoName = file.name.replace(/\.[^/.]+$/, "").slice(0, 30) || 'Imported Preset';
          presetsToImport.push({
            id: 'custom-' + Date.now(),
            name: autoName,
            desc: 'Imported from file',
            els: data
          });
        } else {
          presetsToImport = data;
        }
      } else if (Array.isArray(data.presets)) {
        presetsToImport = data.presets;
      } else if (Array.isArray(data.els)) {
        const autoName = (data.name || file.name.replace(/\.[^/.]+$/, "") || 'Imported Preset').slice(0, 30);
        presetsToImport.push({
          id: data.id || ('custom-' + Date.now()),
          name: autoName,
          desc: data.desc || 'Imported from file',
          els: data.els
        });
      } else if (data.preset && Array.isArray(data.preset.els)) {
        presetsToImport.push(data.preset);
      } else {
        throw new Error('Unrecognized format (missing "presets" or "els" array)');
      }

      if (presetsToImport.length === 0) {
        log('The selected file contains 0 presets (empty list).', 'w');
        return;
      }

      const existing = loadCustomPresets();
      const existingIds = new Set(existing.map(p => p.id));
      PRESETS.forEach(p => existingIds.add(p.id));

      let addedCount = 0;
      let skippedCount = 0;
      let lastAdded = null;

      for (let i = 0; i < presetsToImport.length; i++) {
        const p = presetsToImport[i];
        if (!p || !Array.isArray(p.els) || !p.els.length) {
          skippedCount++;
          continue;
        }

        let pId = p.id ? String(p.id) : ('custom-' + (Date.now() + i));
        if (existingIds.has(pId)) {
          pId = 'custom-' + Date.now() + '-' + i;
        }

        const cleanEls = p.els.map(e => {
          const c = { ...e };
          delete c._img;
          return c;
        });

        const pName = String(p.name || file.name.replace(/\.[^/.]+$/, "") || 'Imported Preset').slice(0, 30);
        const pDesc = p.desc ? String(p.desc).slice(0, 60) : '';

        const importedObj = {
          id: pId,
          name: pName,
          desc: pDesc,
          els: cleanEls
        };

        existing.push(importedObj);
        existingIds.add(pId);
        addedCount++;
        lastAdded = importedObj;
      }

      if (addedCount > 0) {
        saveCustomPresets(existing);
        buildPresets();
        $('#presetHdr').classList.add('open');
        $('#presetBody').style.display = '';
        log(`Import complete: ${addedCount} preset(s) added successfully.`, 'o');

        if (lastAdded && confirm(`Preset "${lastAdded.name}" imported!\nDo you want to load it into the editor now?`)) {
          const all = getAllPresets();
          const target = all.find(x => x.id === lastAdded.id);
          if (target) loadPreset(target);
        }
      } else {
        log(`No valid presets imported (${skippedCount} invalid or empty).`, 'w');
      }
    } catch (err) {
      log('Error importing presets: ' + err.message, 'e');
    }
  };
  reader.onerror = () => {
    log('Error reading preset file.', 'e');
  };
  reader.readAsText(file);
}

export function loadPreset(preset, onLoaded) {
  if (S.els.length && !confirm(`Replace current document with preset "${preset.name}"?`)) return;
  S.els = preset.make();
  let nextId = 1;
  S.els.forEach(e => {
    e.id = nextId++;
    e.collapsed = true;
  });
  setUid(nextId);
  S.els.filter(e => e.type === 'image' && e.src).forEach(e => {
    const img = new Image(); img.onload = () => { e._img = img; paint(); }; img.src = e.src;
  });
  if (onLoaded) {
    onLoaded();
  } else if (onPresetLoadedCallback) {
    onPresetLoadedCallback();
  }
  ensureFonts().then(paint);
  log(`Preset "${preset.name}" loaded.`, 'o');
}

export function renderPresetModalList() {
  const query = ($('#presetSearch')?.value || '').trim().toLowerCase();
  const all = getAllPresets();
  const filtered = all.filter(p => {
    if (!query) return true;
    return (p.name && p.name.toLowerCase().includes(query)) ||
           (p.desc && p.desc.toLowerCase().includes(query));
  });

  const countBadge = $('#presetModalCount');
  if (countBadge) {
    const customCount = all.filter(p => p.isCustom).length;
    countBadge.textContent = `${all.length} presets (${customCount} custom)`;
  }

  const listEl = $('#presetModalList');
  if (!listEl) return;

  if (filtered.length === 0) {
    listEl.innerHTML = `<div class="empty" style="padding:40px 12px;">No presets matching "${esc(query)}".</div>`;
    return;
  }

  listEl.innerHTML = filtered.map(p => {
    const rawEls = typeof p.make === 'function' ? p.make() : (p.els || []);
    const count = rawEls.length;
    const typeCounts = {};
    rawEls.forEach(e => { typeCounts[e.type] = (typeCounts[e.type] || 0) + 1; });
    const summary = Object.entries(typeCounts).map(([k, v]) => `${v} ${k}`).join(', ') || 'empty';

    return `
      <div class="prow" style="display:flex; align-items:center; justify-content:space-between; gap:12px; padding:10px 12px; background:var(--card); border:1px solid var(--line); border-radius:8px;">
        <div style="display:flex; flex-direction:column; gap:3px; flex:1; min-width:0;">
          <div style="display:flex; align-items:center; gap:8px;">
            <span class="pill" style="font-size:10px; font-weight:600; text-transform:uppercase; ${p.isCustom ? 'background:rgba(59,130,246,0.18); color:#60A5FA; border-color:rgba(59,130,246,0.3);' : 'background:rgba(148,163,184,0.12); color:#94A3B8;'}">${p.isCustom ? 'Custom' : 'Built-in'}</span>
            <strong style="font-size:13px; color:var(--tx); overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${esc(p.name)}</strong>
          </div>
          <div style="font-size:11px; color:var(--tx2); overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">
            ${esc(p.desc || 'No description')}
          </div>
          <div style="font-size:10px; color:#64748B;">
            ${count} block${count === 1 ? '' : 's'} (${esc(summary)})
          </div>
        </div>
        <div style="display:flex; align-items:center; gap:6px; flex-shrink:0;">
          <button type="button" class="mini primary" data-modal-load="${esc(p.id)}" style="display:flex; align-items:center; gap:4px; padding:5px 9px;" title="Load this preset into the canvas editor">
            <span>▶</span> Load
          </button>
          <button type="button" class="mini" data-modal-exp="${esc(p.id)}" style="color:#10B981; border:1px solid rgba(16,185,129,0.35); background:rgba(16,185,129,0.12); display:flex; align-items:center; gap:4px; padding:5px 9px;" title="Download this preset as a JSON file">
            <span>⬇</span> Export
          </button>
          ${p.isCustom ? `
          <button type="button" class="mini" data-modal-del="${esc(p.id)}" style="color:#EF4444; border:1px solid rgba(239,68,68,0.35); background:rgba(239,68,68,0.12); display:flex; align-items:center; gap:4px; padding:5px 9px;" title="Delete this custom preset">
            <span>🗑</span> Delete
          </button>
          ` : `
          <span class="pill" style="font-size:10px; color:#64748B; opacity:0.6; padding:4px 8px;">Default</span>
          `}
        </div>
      </div>
    `;
  }).join('');
}

export function openPresetModal() {
  $('#presetModal').hidden = false;
  $('#presetSearch').value = '';
  renderPresetModalList();
  $('#presetSearch').focus();
}

export function closePresetModal() {
  $('#presetModal').hidden = true;
}

export function buildPresets() {
  const all = getAllPresets();
  $('#presetGrid').innerHTML = all.map(p =>
    `<button type="button" data-preset="${esc(p.id)}" title="${esc(p.name)}${p.desc ? ' · ' + esc(p.desc) : ''}">` +
      `<span class="pname">${esc(p.name)}</span>` +
      `<span class="pdesc">${esc(p.desc)}</span>` +
      (p.isCustom ? `
        <div class="pbtns">
          <span class="pact pexp" data-exp="${esc(p.id)}" title="Export preset (.json)">⬇</span>
          <span class="pact pdel" data-del="${esc(p.id)}" title="Delete preset">🗑</span>
        </div>` : '') +
    `</button>`
  ).join('');

  if (!$('#presetModal').hidden) {
    renderPresetModalList();
  }
}

export function togglePresetSaveForm(show) {
  const form = $('#presetSaveForm');
  const body = $('#presetBody');
  const isClosed = form.style.display === 'none' || !form.style.display;
  const shouldOpen = show !== undefined ? show : isClosed;

  if (shouldOpen) {
    $('#presetHdr').classList.add('open');
    body.style.display = '';
    form.style.display = 'block';
    if (!$('#presetNameInput').value) {
      const firstText = S.els.find(e => e.type === 'text' && e.text)?.text?.split('\n')[0]?.trim();
      if (firstText) $('#presetNameInput').value = firstText.slice(0, 30);
    }
    $('#presetNameInput').focus();
    $('#presetNameInput').select();
  } else {
    form.style.display = 'none';
  }
}
