/* ==========================================================================
   Bluetooth Transport & PeriPage Wire Protocol
   ========================================================================== */

import { BT, S } from './state.js';
import {
  clamp, sleep, KNOWN_SERVICES, PREFERRED_WRITE, PREFERRED_NOTIFY,
  PRINTER_SERVICES, GENERIC_SERVICES
} from './constants.js';
import { $ } from './dom.js';
import { packRows, compose, blankCtx, toMono, lumFrom } from './raster.js';

export const shortUuid = u => {
  if (!u) return '';
  const m = /^0000([0-9a-f]{4})-0000-1000-8000-00805f9b34fb$/.exec(u);
  return m ? m[1] : String(u).slice(0,8);
};

export function scoreWritable(x){
  const i = PREFERRED_WRITE.indexOf(x.c.uuid);
  let n = i >= 0 ? 100 - i : 0;
  if (PRINTER_SERVICES.has(x.svc)) n += 50;
  if (GENERIC_SERVICES.has(x.svc)) n -= 200;
  if (x.c.properties.writeWithoutResponse) n += 5;
  return n;
}

export function log(msg, cls){
  const el = $('#log');
  if (!el) return;
  const t = new Date().toLocaleTimeString('en-GB');
  el.insertAdjacentHTML('beforeend',
    `<span class="${cls||''}">[${t}] ${String(msg).replace(/[<&]/g, c => c==='<'?'&lt;':'&amp;')}</span>\n`);
  el.scrollTop = el.scrollHeight;
}

export const hex = s => new Uint8Array(s.match(/../g).map(b => parseInt(b,16)));

export function setConnected(on){
  const dot = $('#dot');
  if (dot) dot.classList.toggle('on', on);
  const btnDisconnect = $('#btnDisconnect');
  if (btnDisconnect) btnDisconnect.disabled = !on;
  const btnConnect = $('#btnConnect');
  if (btnConnect) btnConnect.disabled = on;
  ['#btnPrint','#btnTest','#btnFeed','#btnReset','#btnProbe'].forEach(s => {
    const el = $(s);
    if (el) el.disabled = !on;
  });
  if (!on){
    const devName = $('#devName');
    if (devName) devName.textContent = 'Not connected';
  }
}

export async function connect(){
  if (!navigator.bluetooth){ log('Web Bluetooth unavailable in this browser.', 'e'); return; }
  const all = $('#filterMode')?.value === 'all';
  const opts = all
    ? { acceptAllDevices:true, optionalServices:KNOWN_SERVICES }
    : { filters:[{namePrefix:'PeriPage'},{namePrefix:'Peripage'},{namePrefix:'PPG'},
                 {namePrefix:'PERIPAGE'},{namePrefix:'A6'},{namePrefix:'PP'}],
        optionalServices:KNOWN_SERVICES };
  try{
    log('Requesting device…');
    const dev = await navigator.bluetooth.requestDevice(opts);
    BT.device = dev;
    dev.addEventListener('gattserverdisconnected', () => {
      log('Disconnected.', 'w'); setConnected(false); BT.write = null;
    });
    log(`Selected "${dev.name || dev.id}" — connecting GATT…`);
    BT.server = await dev.gatt.connect();

    const svcs = await BT.server.getPrimaryServices();
    BT.chars = [];
    for (const s of svcs){
      let cs = [];
      try { cs = await s.getCharacteristics(); } catch(e){ continue; }
      for (const c of cs){
        const p = c.properties;
        BT.chars.push({ c, svc:s.uuid,
          w: p.write || p.writeWithoutResponse, n: p.notify || p.indicate });
        log(`  ${shortUuid(s.uuid || s.svc)} / ${shortUuid(c.uuid)}  ` +
            [p.read&&'r', p.write&&'w', p.writeWithoutResponse&&'W', p.notify&&'n']
              .filter(Boolean).join('') , 'd');
      }
    }
    const writable = BT.chars.filter(x => x.w);
    if (!writable.length){
      log('No writable characteristic found. This printer is probably Bluetooth Classic (SPP) only.', 'e');
      $('#devName').textContent = dev.name || 'Connected';
      setConnected(true); $('#btnPrint').disabled = true; $('#btnTest').disabled = true;
      return;
    }
    const sel = $('#charSel');
    sel.innerHTML = writable.map((x,i) =>
      `<option value="${i}">#${i} ${shortUuid(x.svc)} → ${shortUuid(x.c.uuid)}</option>`).join('');
    let pick = 0, best = -Infinity;
    writable.forEach((x,i) => { const n = scoreWritable(x); if (n > best){ best = n; pick = i; } });
    sel.value = String(pick);
    BT.write = writable[pick].c;
    BT._writable = writable;
    log(`Write characteristic #${pick}: ${shortUuid(writable[pick].svc)}/${shortUuid(BT.write.uuid)}`, 'o');
    if (best <= 0)
      log('None of these look like a known printer endpoint. Use "Probe every characteristic".', 'w');
    await sleep(250);

    const nt = BT.chars.find(x => x.n && PREFERRED_NOTIFY.includes(x.c.uuid))
            || BT.chars.find(x => x.n);
    if (nt){
      try{
        await nt.c.startNotifications();
        nt.c.addEventListener('characteristicvaluechanged', ev => {
          const v = new Uint8Array(ev.target.value.buffer);
          log('← ' + Array.from(v).map(b=>b.toString(16).padStart(2,'0')).join(' '), 'd');
        });
        BT.notify = nt.c;
      }catch(e){}
    }
    $('#devName').textContent = dev.name || 'Connected';
    setConnected(true);
    log('Ready to print.', 'o');
  }catch(e){
    if (e.name === 'NotFoundError' && /cancell?ed/i.test(e.message))
      log('Device chooser dismissed.', 'w');
    else
      log('Connect failed: ' + e.message, 'e');
  }
}

export function disconnect(){
  try{ BT.device?.gatt?.disconnect(); }catch(e){}
  setConnected(false);
}

export function selectCharacteristic(idx){
  const w = BT._writable?.[+idx];
  if (w){ BT.write = w.c; log('Write characteristic → ' + w.c.uuid, 'o'); }
}

export async function writeBytes(bytes, onProgress){
  if (!BT.write) throw new Error('not connected');
  const size  = parseInt($('#mtu').value, 10);
  const delay = parseInt($('#delay').value, 10) || 0;
  const noRsp = BT.write.properties.writeWithoutResponse;
  for (let i=0; i<bytes.length; i+=size){
    const slice = bytes.subarray(i, Math.min(i+size, bytes.length));
    let tries = 0;
    for(;;){
      try{
        if (noRsp && BT.write.writeValueWithoutResponse) await BT.write.writeValueWithoutResponse(slice);
        else if (BT.write.writeValueWithResponse)        await BT.write.writeValueWithResponse(slice);
        else                                             await BT.write.writeValue(slice);
        break;
      }catch(err){
        if (++tries > 3) throw err;
        log('retry write @' + i + ' (' + err.message + ')', 'w');
        await sleep(120);
      }
    }
    if (delay) await sleep(delay);
    if (onProgress) onProgress(Math.min(i+size, bytes.length), bytes.length);
  }
}

export const CMD = {
  reset:   () => hex('10fffe01000000000000000000000000'),
  density: d => hex('10ff1000' + String(clamp(d,0,2)).padStart(2,'0')),
  feed:    n => new Uint8Array([0x1b, 0x4a, clamp(n|0, 0, 255)]),
};

export async function printMono(mono, w, h, opts){
  opts = opts || {};
  const { data, bpr } = packRows(mono, w, h);
  const rowsPer = clamp(parseInt($('#chunkRows').value,10) || 48, 1, 255);
  const byRow   = $('#txMode').value === 'rows';
  const bar = $('#progbar');
  if (opts.progress !== false && bar) bar.style.width = '0%';

  await writeBytes(CMD.density(S.density));
  await sleep(30);

  for (let y=0; y<h; y+=rowsPer){
    const rows = Math.min(rowsPer, h-y);
    await writeBytes(CMD.reset());
    await sleep(20);
    await writeBytes(new Uint8Array(
      [0x1d,0x76,0x30,0x00, bpr & 0xff, (bpr>>8)&0xff, rows & 0xff, (rows>>8)&0xff]));
    if (byRow){
      for (let r=0; r<rows; r++)
        await writeBytes(data.subarray((y+r)*bpr, (y+r+1)*bpr));
    } else {
      await writeBytes(data.subarray(y*bpr, (y+rows)*bpr));
    }
    if (opts.progress !== false && bar) bar.style.width = Math.round((y+rows)/h*100) + '%';
  }

  if (opts.feed !== false){
    const f = clamp(parseInt($('#feed').value,10)||0, 0, 255);
    if (f) await writeBytes(CMD.feed(f));
  }
  if (opts.progress !== false && bar){
    bar.style.width = '100%';
    setTimeout(() => { if (bar) bar.style.width = '0%'; }, 900);
  }
}

export async function sendLabel(text){
  const W = S.width, H = 44;
  const ctx = blankCtx(W, H);
  ctx.fillStyle = '#000';
  ctx.font = '700 26px ui-monospace, monospace';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 4, H/2);
  await printMono(toMono(lumFrom(ctx,W,H), W, H, 'threshold', 160), W, H,
                  {feed:false, progress:false});
}

export async function probeChars(){
  const list = BT._writable || [];
  if (!list.length){ log('No writable characteristics to probe.', 'w'); return; }
  const saved = BT.write;
  const btn = $('#btnProbe');
  if (btn) btn.disabled = true;
  log(`Probing ${list.length} characteristics. Watch the paper.`);
  for (let i=0; i<list.length; i++){
    const tag = `#${i} ${shortUuid(list[i].svc)}/${shortUuid(list[i].c.uuid)}`;
    BT.write = list[i].c;
    log('  → ' + tag);
    try { await sendLabel(tag); await sleep(400); }
    catch(e){ log('    write rejected: ' + e.message, 'w'); }
  }
  BT.write = saved;
  try { await writeBytes(CMD.feed(70)); } catch(e){}
  log('Probe done.', 'o');
  if (btn) btn.disabled = false;
}

export async function doPrint(){
  const {mono, w, h} = compose();
  if (!h || !S.els.length){ log('Nothing to print.', 'w'); return; }
  const btn = $('#btnPrint');
  if (btn) btn.disabled = true;
  log(`Printing ${w}×${h} (${(Math.ceil(w/8)*h/1024).toFixed(1)} KiB)…`);
  try{
    await printMono(mono, w, h);
    log('Print finished.', 'o');
  }catch(e){ log('Print failed: ' + e.message, 'e'); }
  if (btn) btn.disabled = false;
}

export async function doTest(){
  const W = S.width, H = 130;
  const ctx = blankCtx(W, H);
  ctx.fillStyle = '#000';
  ctx.fillRect(0,0,W,4);
  ctx.font = '700 30px sans-serif'; ctx.textBaseline = 'top';
  ctx.fillText('TEST STRIP', 6, 12);
  ctx.font = '18px sans-serif';
  ctx.fillText(W + ' dots wide', 6, 50);
  for (let x=0;x<W;x++){
    const v = Math.round(255 * x/(W-1));
    ctx.fillStyle = `rgb(${v},${v},${v})`;
    ctx.fillRect(x, 76, 1, 26);
  }
  ctx.fillStyle = '#000';
  for (let x=0;x<W;x+=2) ctx.fillRect(x, 108, 1, 8);
  ctx.fillRect(0, H-4, W, 4);
  const lum  = lumFrom(ctx, W, H);
  const mono = toMono(lum, W, H, 'floyd', 128);
  const btn = $('#btnTest');
  if (btn) btn.disabled = true;
  try{ await printMono(mono, W, H); log('Test strip sent.', 'o'); }
  catch(e){ log('Test failed: ' + e.message, 'e'); }
  if (btn) btn.disabled = false;
}

export async function feedPaper(){
  try{
    await writeBytes(CMD.feed(clamp(parseInt($('#feed').value,10)||60,1,255)));
    log('Fed paper.');
  }catch(e){ log('Feed failed: ' + e.message, 'e'); }
}

export async function resetPrinter(){
  try{
    await writeBytes(CMD.reset());
    log('Reset sent.');
  }catch(e){ log('Reset failed: ' + e.message, 'e'); }
}
