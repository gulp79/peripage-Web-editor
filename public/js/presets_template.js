/* ==========================================================================
   Built-in Preset Templates
   ========================================================================== */

import { makeEl } from './state.js';

export const PRESETS = [
  {
    id: 'default',
    name: 'Default',
    desc: 'Welcome document',
    make() {
      return [
        Object.assign(makeEl('text'),  {text:'PERIPAGE A6', size:44, bold:true, align:'center', after:2}),
        Object.assign(makeEl('rule'),  {thickness:4}),
        Object.assign(makeEl('text'),  {text:'Web Bluetooth editor.\nType here, add photos, QR codes and barcodes, then hit Print.', size:22, align:'center'}),
        Object.assign(makeEl('qr'),    {value:'https://developer.mozilla.org/docs/Web/API/Web_Bluetooth_API', size:220}),
        Object.assign(makeEl('space'), {height:20}),
      ];
    },
  },
  {
    id: 'filament3d',
    name: '3D Filament',
    desc: 'Spool label',
    make() {
      return [
        Object.assign(makeEl('text'), {
          text: 'BAMBU LAB',
          family: "'Archivo Black'",
          size: 28, bold: true, align: 'center',
          invert: true, before: 0, after: 0,
        }),
        Object.assign(makeEl('text'), {
          text: 'PLA MATTE',
          family: "'Archivo Black'",
          size: 44, bold: true, align: 'center',
          invert: true, before: 0, after: 10,
        }),
        Object.assign(makeEl('text'), {
          text: 'COLOR',
          family: "'Archivo Black'",
          size: 18, bold: false, align: 'left',
          invert: false, before: 8, after: 0,
          tracking: 4,
        }),
        Object.assign(makeEl('text'), {
          text: 'DARK GREEN',
          family: "'Archivo Black'",
          size: 42, bold: true, align: 'left',
          invert: false, before: 0, after: 6,
        }),
        Object.assign(makeEl('space'), {height: 8}),
      ];
    },
  },
  {
    id: 'freezer',
    name: 'Freezer',
    desc: 'Food storage label',
    make() {
      return [
        Object.assign(makeEl('text'), {
          text: 'FREEZER',
          family: "'Archivo Black'",
          size: 45, bold: true, align: 'center',
          invert: true, before: 0, after: 0,
        }),
        Object.assign(makeEl('text'), {
          text: 'FOOD / ITEM NAME',
          family: "'Archivo Black'",
          size: 16, bold: false, align: 'left',
          invert: false, before: 10, after: 0,
          tracking: 2,
        }),
        Object.assign(makeEl('text'), {
          text: 'Item Description',
          family: "'Archivo Black'",
          size: 38, bold: true, align: 'left',
          invert: false, before: 2, after: 6,
        }),
        Object.assign(makeEl('rule'), {style:'solid', thickness:3, inset:0, before:4, after:10}),
        Object.assign(makeEl('text'), {
          text: 'PACKAGING / EXPIRY DATE',
          family: "'Archivo Black'",
          size: 16, bold: false, align: 'left',
          invert: false, before: 0, after: 0,
          tracking: 2,
        }),
        Object.assign(makeEl('text'), {
          text: 'DD/MM/YYYY',
          family: "'Archivo Black'",
          size: 38, bold: true, align: 'left',
          invert: false, before: 2, after: 10,
        }),
      ];
    },
  },
];
