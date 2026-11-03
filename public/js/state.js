/* ==========================================================================
   Application State & Model Factory
   ========================================================================== */

let uid = 1;

export const getUid = () => uid;
export const setUid = v => { uid = v; };
export const nextUid = () => uid++;

export const S = {
  els: [],
  width: 384,
  density: 1,
  zoom: 1.5,
  grid: false,
  sel: null,
};

export const BT = {
  device: null,
  server: null,
  chars: [],
  write: null,
  notify: null,
  _writable: []
};

export const byId = id => S.els.find(e => e.id === +id);

export function makeEl(type){
  const base = { id: nextUid(), type, collapsed: true, before: 0, after: 6 };
  switch(type){
    case 'text':    return {...base, text:'Hello from PeriPage', family:'sans-serif',
                            size:26, bold:false, italic:false, align:'left',
                            lineHeight:1.25, tracking:0, invert:false, after:8};
    case 'image':   return {...base, src:null, name:'', scale:100, align:'center',
                            dither:'floyd', threshold:128, brightness:0, contrast:0,
                            invert:false, _img:null};
    case 'qr':      return {...base, value:'https://example.com', size:200,
                            align:'center', ecc:'M'};
    case 'barcode': return {...base, value:'1234567890', format:'CODE128',
                            height:70, align:'center', showValue:true};
    case 'rule':    return {...base, style:'solid', thickness:3, inset:0, after:8, before:4};
    case 'space':   return {...base, height:24, after:0};
    case 'card':    return {...base, to:'Priya', from:'Balan', message:'Happy Diwali',
                            ornament:'✦', family:"'Playfair Display'", size:34,
                            border:'deco', weight:3, padding:16, inset:6,
                            labels:true, divider:true, before:6, after:10};
  }
}
