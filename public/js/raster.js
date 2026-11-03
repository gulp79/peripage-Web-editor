/* ==========================================================================
   Rasterisation, Canvas Rendering & Composition
   ========================================================================== */

import { S } from './state.js';
import { clamp, EMOJI_FACE, fontStack } from './constants.js';
import { $ } from './dom.js';

export let LAST = { mono: new Uint8Array(0), w: 384, h: 0 };
export const getLast = () => LAST;
export const setLast = val => { LAST = val; };

export async function ensureFonts(){
  if (!document.fonts) return;
  const fams = new Set([EMOJI_FACE]);
  S.els.forEach(e => { if ((e.type === 'text' || e.type === 'card') && e.family) fams.add(e.family); });
  await Promise.all([...fams].flatMap(f =>
    ['400','700'].map(w => document.fonts.load(`${w} 32px ${f}`).catch(() => {}))));
}

let fontRepaint = null;
export function repaintWhenFontsReady(){
  clearTimeout(fontRepaint);
  fontRepaint = setTimeout(() => ensureFonts().then(paint), 60);
}

/* ------------------------------------------------------------ image helpers */
export function toMono(lum, w, h, mode, thr){
  const out = new Uint8Array(w*h);
  if (mode === 'threshold' || mode === 'none'){
    for (let i=0;i<w*h;i++) out[i] = lum[i] < thr ? 1 : 0;
    return out;
  }
  if (mode === 'bayer'){
    const M = [[0,32,8,40,2,34,10,42],[48,16,56,24,50,18,58,26],
               [12,44,4,36,14,46,6,38],[60,28,52,20,62,30,54,22],
               [3,35,11,43,1,33,9,41],[51,19,59,27,49,17,57,25],
               [15,47,7,39,13,45,5,37],[63,31,55,23,61,29,53,21]];
    for (let y=0;y<h;y++) for (let x=0;x<w;x++){
      const t = (M[y&7][x&7]+0.5) * (255/64);
      out[y*w+x] = lum[y*w+x] < t ? 1 : 0;
    }
    return out;
  }
  const buf = Float32Array.from(lum);
  const push = (x,y,e) => { if (x>=0 && x<w && y<h) buf[y*w+x] += e; };
  const atk = mode === 'atkinson';
  for (let y=0;y<h;y++){
    for (let x=0;x<w;x++){
      const i = y*w+x, old = buf[i], nv = old < 128 ? 0 : 255;
      out[i] = nv ? 0 : 1;
      const err = old - nv;
      if (atk){
        const e = err/8;
        push(x+1,y,e); push(x+2,y,e);
        push(x-1,y+1,e); push(x,y+1,e); push(x+1,y+1,e);
        push(x,y+2,e);
      } else {
        push(x+1,y,   err*7/16);
        push(x-1,y+1, err*3/16);
        push(x,  y+1, err*5/16);
        push(x+1,y+1, err*1/16);
      }
    }
  }
  return out;
}

export function lumFrom(ctx, w, h, {brightness=0, contrast=0, invert=false} = {}){
  const d = ctx.getImageData(0,0,w,h).data;
  const lum = new Float32Array(w*h);
  const c = clamp(contrast,-100,100);
  const k = (259*(c+255)) / (255*(259-c));
  for (let i=0, p=0; i<lum.length; i++, p+=4){
    const a = d[p+3]/255;
    let v = 0.299*d[p] + 0.587*d[p+1] + 0.114*d[p+2];
    v = v*a + 255*(1-a);
    v = k*(v-128) + 128 + brightness;
    if (invert) v = 255 - v;
    lum[i] = clamp(v, 0, 255);
  }
  return lum;
}

export function blankCtx(w,h){
  const c = document.createElement('canvas');
  c.width = w; c.height = Math.max(1, h);
  const x = c.getContext('2d', {willReadFrequently:true});
  x.fillStyle = '#fff'; x.fillRect(0,0,c.width,c.height);
  return x;
}

export const alignX = (align, boxW, W) =>
  align === 'center' ? Math.round((W-boxW)/2) : align === 'right' ? W-boxW : 0;

/* ------------------------------------------------------------ text wrapping */
export function wrap(ctx, text, maxW){
  const lines = [];
  for (const para of String(text).split('\n')){
    if (para === ''){ lines.push(''); continue; }
    let line = '';
    for (const word of para.split(/(\s+)/)){
      const test = line + word;
      if (ctx.measureText(test).width > maxW && line.trim() !== ''){
        lines.push(line.replace(/\s+$/,''));
        line = word.replace(/^\s+/,'');
      } else line = test;
      while (ctx.measureText(line).width > maxW && line.length > 1){
        let i = line.length;
        while (i > 1 && ctx.measureText(line.slice(0,i)).width > maxW) i--;
        lines.push(line.slice(0,i));
        line = line.slice(i);
      }
    }
    lines.push(line.replace(/\s+$/,''));
  }
  return lines;
}

export function darkBBox(ctx, w, h, thr){
  thr = thr || 160;
  const d = ctx.getImageData(0,0,w,h).data;
  let x0=w, y0=h, x1=-1, y1=-1;
  for (let y=0;y<h;y++) for (let x=0;x<w;x++){
    const p = (y*w+x)*4, a = d[p+3]/255;
    const v = (0.299*d[p] + 0.587*d[p+1] + 0.114*d[p+2])*a + 255*(1-a);
    if (v < thr){ if(x<x0)x0=x; if(x>x1)x1=x; if(y<y0)y0=y; if(y>y1)y1=y; }
  }
  return x1 < 0 ? null : { x:x0, y:y0, w:x1-x0+1, h:y1-y0+1 };
}

/* ==========================================================================
   Gift tag geometries & borders
   ========================================================================== */
export const frameRect = (c,x,y,w,h,t) => {
  c.fillRect(x, y, w, t); c.fillRect(x, y+h-t, w, t);
  c.fillRect(x, y, t, h); c.fillRect(x+w-t, y, t, h);
};

export const dashFrame = (c,x,y,w,h,t,dash,gap) => {
  for (let i=0;i<w;i+=dash+gap){ const l=Math.min(dash,w-i);
    c.fillRect(x+i,y,l,t); c.fillRect(x+i,y+h-t,l,t); }
  for (let i=0;i<h;i+=dash+gap){ const l=Math.min(dash,h-i);
    c.fillRect(x,y+i,t,l); c.fillRect(x+w-t,y+i,t,l); }
};

export function starAt(c,cx,cy,r){
  c.beginPath();
  for (let i=0;i<8;i++){
    const a = -Math.PI/2 + i*Math.PI/4, rr = i%2 ? r*0.38 : r;
    const px = cx + Math.cos(a)*rr, py = cy + Math.sin(a)*rr;
    i ? c.lineTo(px,py) : c.moveTo(px,py);
  }
  c.closePath(); c.fill();
}

export const BORDERS = {
  none:      { group:'None',   label:'No border', zone:() => 0, draw(){} },
  single:    { group:'Classy', label:'Single rule',
               zone:t => t, draw(c,W,H,t,i){ frameRect(c,i,i,W-2*i,H-2*i,t); } },
  double:    { group:'Classy', label:'Double rule',
               zone:t => t*3,
               draw(c,W,H,t,i){ frameRect(c,i,i,W-2*i,H-2*i,t);
                 frameRect(c,i+t*2,i+t*2,W-2*i-t*4,H-2*i-t*4,t); } },
  thickthin: { group:'Classy', label:'Thick + thin',
               zone:t => t*4,
               draw(c,W,H,t,i){ const th=Math.max(1,Math.round(t*0.5));
                 frameRect(c,i,i,W-2*i,H-2*i,t*2);
                 frameRect(c,i+t*3,i+t*3,W-2*i-t*6,H-2*i-t*6,th); } },
  dotted:    { group:'Classy', label:'Dotted',
               zone:t => t, draw(c,W,H,t,i){ dashFrame(c,i,i,W-2*i,H-2*i,t,t,t*2); } },
  deco:      { group:'Classy', label:'Deco corners',
               zone:t => t*4,
               draw(c,W,H,t,i){
                 const w=W-2*i, h=H-2*i, L=Math.round(Math.min(w,h)*0.22), th=Math.max(1,Math.round(t*0.5));
                 [[i,i,1,1],[i+w,i,-1,1],[i,i+h,1,-1],[i+w,i+h,-1,-1]].forEach(([x,y,sx,sy])=>{
                   c.fillRect(sx>0?x:x-L, sy>0?y:y-t, L, t);
                   c.fillRect(sx>0?x:x-t, sy>0?y:y-L, t, L);
                   const o=t*3;
                   c.fillRect(sx>0?x+o:x-L*0.7-o, sy>0?y+o:y-o-th, L*0.7, th);
                   c.fillRect(sx>0?x+o:x-o-th, sy>0?y+o:y-L*0.7-o, th, L*0.7);
                 });
                 [[i+w/2, i+t/2],[i+w/2, i+h-t/2]].forEach(([x,y]) => starAt(c,x,y,t*2.2));
               } },
  dashed:    { group:'Funky',  label:'Dashed',
               zone:t => t, draw(c,W,H,t,i){ dashFrame(c,i,i,W-2*i,H-2*i,t,t*3,t*2); } },
  ticket:    { group:'Funky',  label:'Ticket stub',
               zone:t => t,
               draw(c,W,H,t,i){
                 dashFrame(c,i,i,W-2*i,H-2*i,t,t*3,t*2);
                 const r=Math.max(6,t*3);
                 c.save(); c.fillStyle='#fff';
                 c.beginPath(); c.arc(i, H/2, r, 0, Math.PI*2); c.fill();
                 c.beginPath(); c.arc(W-i, H/2, r, 0, Math.PI*2); c.fill();
                 c.restore();
               } },
  scallop:   { group:'Funky',  label:'Scallops',
               zone:t => t*3,
               draw(c,W,H,t,i){
                 const r=t*3, w=W-2*i, h=H-2*i;
                 c.save(); c.strokeStyle='#000'; c.lineWidth=t; c.lineCap='round';
                 for (let x=i+r; x<=i+w-r; x+=r*2){
                   c.beginPath(); c.arc(x, i+r, r, Math.PI, 0); c.stroke();
                   c.beginPath(); c.arc(x, i+h-r, r, 0, Math.PI); c.stroke();
                 }
                 for (let y=i+r*3; y<=i+h-r*3; y+=r*2){
                   c.beginPath(); c.arc(i+r, y, r, Math.PI/2, Math.PI*1.5); c.stroke();
                   c.beginPath(); c.arc(i+w-r, y, r, Math.PI*1.5, Math.PI/2); c.stroke();
                 }
                 c.restore();
               } },
  zigzag:    { group:'Funky',  label:'Zigzag',
               zone:t => t*3,
               draw(c,W,H,t,i){
                 const a=t*2.5, w=W-2*i, h=H-2*i, step=a*1.6;
                 c.save(); c.strokeStyle='#000'; c.lineWidth=t; c.lineJoin='miter';
                 const saw=(pts)=>{ c.beginPath(); pts.forEach((p,k)=>k?c.lineTo(p[0],p[1]):c.moveTo(p[0],p[1])); c.stroke(); };
                 const top=[],bot=[],lef=[],rig=[];
                 for (let x=i,k=0; x<=i+w; x+=step,k++){ top.push([x, i+(k%2?a:0)]); bot.push([x, i+h-(k%2?a:0)]); }
                 for (let y=i,k=0; y<=i+h; y+=step,k++){ lef.push([i+(k%2?a:0), y]); rig.push([i+w-(k%2?a:0), y]); }
                 [top,bot,lef,rig].forEach(saw);
                 c.restore();
               } },
  wave:      { group:'Funky',  label:'Wave',
               zone:t => t*3,
               draw(c,W,H,t,i){
                 const a=t*2.2, w=W-2*i, h=H-2*i, per=a*5;
                 c.save(); c.strokeStyle='#000'; c.lineWidth=t;
                 const wave=(fn,len)=>{ c.beginPath();
                   for (let d=0;d<=len;d++){ const [x,y]=fn(d, Math.sin(d/per*Math.PI*2)*a);
                     d?c.lineTo(x,y):c.moveTo(x,y); } c.stroke(); };
                 wave((d,o)=>[i+d, i+a+o], w);
                 wave((d,o)=>[i+d, i+h-a+o], w);
                 wave((d,o)=>[i+a+o, i+d], h);
                 wave((d,o)=>[i+w-a+o, i+d], h);
                 c.restore();
               } },
  stars:     { group:'Funky',  label:'Stars',
               zone:t => t*3,
               draw(c,W,H,t,i){
                 const r=t*2.2, w=W-2*i, h=H-2*i, step=r*3;
                 for (let x=i+r; x<=i+w-r; x+=step){ starAt(c,x,i+r,r); starAt(c,x,i+h-r,r); }
                 for (let y=i+r+step; y<=i+h-r-step; y+=step){ starAt(c,i+r,y,r); starAt(c,i+w-r,y,r); }
               } },
};

export function cardLines(el, innerW){
  const probe = blankCtx(4,4);
  const base = Math.max(10, el.size|0);
  const fam  = fontStack(el.family);
  const labelSize = clamp(Math.round(base*0.40), 9, 40);
  const msgSize   = Math.max(10, Math.round(base*0.72));
  const out = [];
  const push = (text, size, weight, tracking, lh) =>
    out.push({ text, size, font:`${weight} ${size}px ${fam}`, tracking:tracking||0,
               h:Math.round(size*(lh||1.25)) });

  if (el.ornament) push(el.ornament, Math.max(38, Math.round(base*1.35)), '400', 0, 1.25);
  if (el.to){
    if (el.labels) push('TO', labelSize, '400', Math.max(1,Math.round(labelSize*0.22)), 1.6);
    push(el.to, base, '700', 0, 1.2);
  }
  if (el.message){
    probe.font = `400 ${msgSize}px ${fam}`;
    for (const ln of wrap(probe, el.message, innerW)) push(ln, msgSize, '400', 0, 1.35);
  }
  if (el.divider && (el.from || el.to)) out.push({ rule:true, h:Math.max(10, base>>1) });
  if (el.from){
    if (el.labels) push('FROM', labelSize, '400', Math.max(1,Math.round(labelSize*0.22)), 1.6);
    push(el.from, base, '700', 0, 1.2);
  }
  return { lines: out, H: out.reduce((a,l) => a + l.h, 0) };
}

export function renderCard(el, W){
  const t     = clamp(el.weight|0, 1, 12);
  const inset = clamp(el.inset|0, 0, 60);
  const pad   = clamp(el.padding|0, 0, 80);
  const B     = BORDERS[el.border] || BORDERS.single;
  const zone  = B.zone(t);
  const innerW = Math.max(40, W - 2*(inset + zone + pad));
  const { lines, H } = cardLines(el, innerW);
  const cardH = Math.max(zone*2 + pad*2 + 8, H + 2*(zone + pad));

  const ctx = blankCtx(W, cardH);
  ctx.fillStyle = '#000';
  B.draw(ctx, W, cardH, t, inset);

  ctx.fillStyle = '#000';
  ctx.textBaseline = 'middle';
  let y = zone + pad + (cardH - 2*(zone+pad) - H)/2;
  for (const ln of lines){
    if (ln.rule){
      const rw = Math.round(innerW*0.42);
      ctx.fillRect(Math.round((W-rw)/2), Math.round(y + ln.h/2 - 1), rw, Math.max(1, t>>1 || 1));
    } else {
      ctx.font = ln.font;
      ctx.letterSpacing = ln.tracking + 'px';
      const tw = ctx.measureText(ln.text).width;
      ctx.fillText(ln.text, (W - tw)/2, y + ln.h/2);
      ctx.letterSpacing = '0px';
    }
    y += ln.h;
  }
  return { canvas:ctx, h:cardH };
}

/* --------------------------------------------------- per-element rasterising */
export function renderEl(el, W){
  const pad = el.before|0, padAfter = el.after|0;
  const wrapPad = (mono, h) => {
    const H = pad + h + padAfter;
    const out = new Uint8Array(W*H);
    out.set(mono, pad*W);
    return { mono: out, h: H };
  };

  if (el.type === 'space') return { mono:new Uint8Array(W*Math.max(1,el.height|0)), h:Math.max(1,el.height|0) };

  if (el.type === 'rule'){
    const t = clamp(el.thickness|0, 1, 40), inset = clamp(el.inset|0, 0, W/2-4);
    const m = new Uint8Array(W*t);
    for (let y=0;y<t;y++) for (let x=inset;x<W-inset;x++){
      if (el.style === 'dashed' && (x>>3) % 2) continue;
      if (el.style === 'dotted' && (x & 1)) continue;
      m[y*W+x] = 1;
    }
    return wrapPad(m, t);
  }

  if (el.type === 'text'){
    const probe = blankCtx(W, 10);
    const font = `${el.italic?'italic ':''}${el.bold?'700 ':'400 '}${Math.max(6,el.size|0)}px ${fontStack(el.family)}`;
    probe.font = font;
    probe.letterSpacing = (el.tracking|0) + 'px';
    const lh = Math.round(Math.max(6,el.size|0) * clamp(el.lineHeight,0.8,3));
    const lines = wrap(probe, el.text, W - 4);
    const h = Math.max(lh, lines.length * lh);
    const ctx = blankCtx(W, h);
    ctx.font = font;
    ctx.letterSpacing = (el.tracking|0) + 'px';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#000';
    if (el.invert){ ctx.fillRect(0,0,W,h); ctx.fillStyle = '#fff'; }
    lines.forEach((ln,i) => {
      const w = ctx.measureText(ln).width;
      const x = el.align === 'center' ? (W-w)/2 : el.align === 'right' ? W-w-2 : 2;
      ctx.fillText(ln, x, i*lh + lh/2);
    });
    return wrapPad(toMono(lumFrom(ctx,W,h), W, h, 'threshold', 160), h);
  }

  if (el.type === 'image'){
    if (!el._img || !el._img.width) return { mono:new Uint8Array(W*2), h:2 };
    const iw = Math.max(1, Math.round(W * clamp(el.scale,5,100)/100));
    const ih = Math.max(1, Math.round(el._img.height * (iw/el._img.width)));
    const ctx = blankCtx(W, ih);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(el._img, alignX(el.align, iw, W), 0, iw, ih);
    const lum = lumFrom(ctx, W, ih, {brightness:el.brightness, contrast:el.contrast, invert:el.invert});
    return wrapPad(toMono(lum, W, ih, el.dither, el.threshold), ih);
  }

  if (el.type === 'qr'){
    const target = clamp(el.size|0, 32, W);
    const tmp = document.createElement('canvas');
    try {
      new window.QRious({ element:tmp, value:String(el.value||' '), size:600, level:el.ecc,
                          background:'#fff', foreground:'#000', padding:0 });
    } catch(e){ return { mono:new Uint8Array(W*2), h:2 }; }
    const tc = tmp.getContext('2d', {willReadFrequently:true});
    const bb = darkBBox(tc, tmp.width, tmp.height);
    if (bb){
      const d = tc.getImageData(bb.x, bb.y, bb.w, bb.h).data;
      const dark = (x,y) => {
        const p = ((y|0)*bb.w + (x|0))*4;
        return (0.299*d[p] + 0.587*d[p+1] + 0.114*d[p+2]) < 128;
      };
      let run = 0;
      while (run < bb.w && dark(run, 0)) run++;
      const ms = run/7;
      const n  = ms > 0 ? Math.round(bb.w/ms) : 0;
      if (n >= 21 && n <= 177 && n <= W){
        let k = Math.max(1, Math.round(target/n));
        while (n*k > W && k > 1) k--;
        const side = n*k;
        const m  = new Uint8Array(W*side);
        const ox = clamp(alignX(el.align, side, W), 0, Math.max(0, W-side));
        for (let j=0;j<n;j++){
          for (let i=0;i<n;i++){
            if (!dark((i+0.5)*bb.w/n, (j+0.5)*bb.h/n)) continue;
            for (let dy=0; dy<k; dy++){
              const row = (j*k+dy)*W + ox + i*k;
              for (let dx=0; dx<k; dx++) m[row+dx] = 1;
            }
          }
        }
        return wrapPad(m, side);
      }
    }
    const size = target;
    const ctx = blankCtx(W, size);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(tmp, alignX(el.align, size, W), 0, size, size);
    return wrapPad(toMono(lumFrom(ctx,W,size), W, size, 'threshold', 128), size);
  }

  if (el.type === 'card'){
    const { canvas:ctx, h } = renderCard(el, W);
    return wrapPad(toMono(lumFrom(ctx, W, h), W, h, 'threshold', 150), h);
  }

  if (el.type === 'barcode'){
    const tmp = document.createElement('canvas');
    let ok = true;
    try {
      window.JsBarcode(tmp, String(el.value||''), {
        format: el.format, height: clamp(el.height|0,20,300), width:2,
        displayValue: !!el.showValue, fontSize:18, margin:6, textMargin:2,
        background:'#ffffff', lineColor:'#000000'
      });
    } catch(e){ ok = false; }
    if (!ok || !tmp.width){
      const ctx = blankCtx(W, 26);
      ctx.fillStyle='#000'; ctx.font='16px sans-serif'; ctx.textBaseline='middle';
      ctx.fillText('! invalid barcode value', 2, 13);
      return wrapPad(toMono(lumFrom(ctx,W,26), W, 26, 'threshold', 160), 26);
    }
    const bw = Math.min(W, tmp.width);
    const bh = Math.round(tmp.height * (bw/tmp.width));
    const ctx = blankCtx(W, bh);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(tmp, alignX(el.align, bw, W), 0, bw, bh);
    return wrapPad(toMono(lumFrom(ctx,W,bh), W, bh, 'threshold', 150), bh);
  }
  return { mono:new Uint8Array(W), h:1 };
}

/* --------------------------------------------------------- full composition */
export function compose(){
  const W = S.width;
  const parts = S.els.map(el => renderEl(el, W));
  const H = Math.max(1, parts.reduce((a,p) => a + p.h, 0));
  const mono = new Uint8Array(W*H);
  let y = 0;
  for (const p of parts){ mono.set(p.mono, y*W); y += p.h; }
  LAST = { mono, w:W, h:H };
  return LAST;
}

export function paint(){
  const {mono, w, h} = compose();
  const cv = $('#cv');
  if (!cv) return;
  const z = S.zoom;
  cv.width = Math.round(w * z); cv.height = Math.round(h * z);
  const ctx = cv.getContext('2d', {willReadFrequently: false});
  /* draw native-resolution mono buffer scaled up smoothly */
  const tmp = document.createElement('canvas');
  tmp.width = w; tmp.height = h;
  const tctx = tmp.getContext('2d', {willReadFrequently: false});
  const img = tctx.createImageData(w, h);
  for (let i=0, p=0; i<mono.length; i++, p+=4){
    const v = mono[i] ? 0 : 255;
    img.data[p] = img.data[p+1] = img.data[p+2] = v;
    img.data[p+3] = 255;
  }
  tctx.putImageData(img, 0, 0);
  ctx.imageSmoothingEnabled = z > 1;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(tmp, 0, 0, Math.round(w * z), Math.round(h * z));
  cv.style.width  = '';
  cv.style.height = '';
  const paper = $('#paper');
  if (paper) paper.style.width = Math.round(w * z) + 'px';
  const pillDims = $('#pillDims');
  if (pillDims) pillDims.textContent = `${w} × ${h} dots`;
  const pillBytes = $('#pillBytes');
  if (pillBytes) pillBytes.textContent = `${(Math.ceil(w/8)*h/1024).toFixed(1)} KiB raster`;
}

export function packRows(mono, w, h){
  const bpr = Math.ceil(w/8);
  const out = new Uint8Array(bpr*h);
  for (let y=0;y<h;y++){
    const ro = y*bpr, mo = y*w;
    for (let x=0;x<w;x++) if (mono[mo+x]) out[ro + (x>>3)] |= 0x80 >> (x&7);
  }
  return { data:out, bpr };
}
