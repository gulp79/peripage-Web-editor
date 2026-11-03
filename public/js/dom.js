/* ==========================================================================
   DOM & Escaping Helpers
   ========================================================================== */

export const $  = s => document.querySelector(s);
export const $$ = s => Array.from(document.querySelectorAll(s));
export const esc = s => String(s ?? '').replace(/[<>&"]/g, c => ({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;'}[c]));
