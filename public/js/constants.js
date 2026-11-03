/* ==========================================================================
   Constants & Shared Immutable Definitions
   ========================================================================== */

export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const sleep = ms => new Promise(r => setTimeout(r, ms));

/* ------------------------------------------------------------ font catalogue */
export const FONTS = [
  ['Basic', [
    ['sans-serif','System sans'], ['serif','System serif'], ['ui-monospace, monospace','System mono'],
  ]],
  ['Heavy display', [
    ["'Anton'",'Anton'], ["'Archivo Black'",'Archivo Black'], ["'Alfa Slab One'",'Alfa Slab One'],
    ["'Titan One'",'Titan One'], ["'Rubik Mono One'",'Rubik Mono One'], ["'Bebas Neue'",'Bebas Neue'],
    ["'Black Ops One'",'Black Ops One'],
  ]],
  ['Funky', [
    ["'Bungee'",'Bungee'], ["'Bungee Shade'",'Bungee Shade'], ["'Monoton'",'Monoton'],
    ["'Righteous'",'Righteous'], ["'Creepster'",'Creepster'], ["'Nosifer'",'Nosifer'],
  ]],
  ['Pixel & retro', [
    ["'Press Start 2P'",'Press Start 2P'], ["'Silkscreen'",'Silkscreen'], ["'VT323'",'VT323'],
    ["'Major Mono Display'",'Major Mono'], ["'Orbitron'",'Orbitron'],
  ]],
  ['Handwriting', [
    ["'Permanent Marker'",'Permanent Marker'], ["'Caveat'",'Caveat'], ["'Rock Salt'",'Rock Salt'],
    ["'Gloria Hallelujah'",'Gloria Hallelujah'], ["'Shadows Into Light'",'Shadows Into Light'],
  ]],
  ['Script', [ ["'Lobster'",'Lobster'], ["'Pacifico'",'Pacifico'] ]],
  ['Typewriter', [ ["'Special Elite'",'Special Elite'], ["'Courier Prime'",'Courier Prime'] ]],
  ['Elegant', [
    ["'Playfair Display'",'Playfair Display'], ["'Cinzel'",'Cinzel'],
    ["'UnifrakturMaguntia'",'Blackletter'],
  ]],
];

export const EMOJI_FACE = "'Noto Emoji'";
export const fontStack = fam => `${fam}, ${EMOJI_FACE}, sans-serif`;

/* ------------------------------------------------------------ emoji catalogue */
export const EMOJI = {
  'Smileys': '😀 😃 😄 😁 😆 😅 🤣 😂 🙂 🙃 😉 😊 😇 🥰 😍 🤩 😘 😗 😋 😛 🤪 🤨 🧐 🤓 😎 🥳 😏 😒 😞 😔 😟 😕 🙁 😣 😖 😫 😩 🥺 😢 😭 😤 😠 😡 🤬 🤯 😳 🥵 🥶 😱 😨 😰 😥 😓 🤗 🤔 🤭 🤫 🤥 😶 😐 😑 😬 🙄 😯 😴 🤤 😪 😵 🤐 🥴 🤢 🤮 🤧 😷 🤒 🤕 🤑 🤠 😈 👿 👹 👺 🤡 💩 👻 💀 ☠️ 👽 👾 🤖 🎃',
  'Gestures': '👋 🤚 🖐️ ✋ 🖖 👌 🤌 🤏 ✌️ 🤞 🤟 🤘 🤙 👈 👉 👆 🖕 👇 ☝️ 👍 👎 ✊ 👊 🤛 🤜 👏 🙌 👐 🤲 🤝 🙏 ✍️ 💅 🤳 💪 🦾 🦵 🦶 👂 👃 🧠 🫀 👀 👁️ 👅 👄',
  'People': '👶 🧒 👦 👧 🧑 👨 👩 🧓 👴 👵 🙍 🙎 🙅 🙆 💁 🙋 🧏 🙇 🤦 🤷 👮 🕵️ 💂 🥷 👷 🤴 👸 👳 👲 🧕 🤵 👰 🤰 🤱 👼 🎅 🤶 🦸 🦹 🧙 🧚 🧛 🧜 🧝 🧞 🧟 💆 💇 🚶 🧍 🧎 🏃 💃 🕺 🕴️ 👯 🧖 🧗',
  'Animals': '🐶 🐱 🐭 🐹 🐰 🦊 🐻 🐼 🐨 🐯 🦁 🐮 🐷 🐸 🐵 🙈 🙉 🙊 🐒 🐔 🐧 🐦 🐤 🦆 🦅 🦉 🦇 🐺 🐗 🐴 🦄 🐝 🐛 🦋 🐌 🐞 🐜 🦂 🕷️ 🐢 🐍 🦎 🐙 🦑 🦐 🦀 🐡 🐠 🐟 🐬 🐳 🐋 🦈 🐊 🐅 🐆 🦓 🦍 🐘 🦛 🐪 🦒 🐃 🐄 🐎 🐖 🐏 🐑 🦙 🐐 🦌 🐕 🐩 🐈 🐓 🦃 🦚 🦜 🕊️ 🐇 🦝 🦔',
  'Food': '🍏 🍎 🍐 🍊 🍋 🍌 🍉 🍇 🍓 🫐 🍈 🍒 🍑 🥭 🍍 🥥 🥝 🍅 🍆 🥑 🥦 🥬 🥒 🌶️ 🌽 🥕 🧄 🧅 🥔 🍠 🥐 🥯 🍞 🥖 🧀 🥚 🍳 🧈 🥞 🧇 🥓 🍔 🍟 🍕 🌭 🥪 🌮 🌯 🥗 🍝 🍜 🍲 🍛 🍣 🍱 🥟 🍤 🍙 🍚 🍥 🥠 🍦 🍰 🎂 🧁 🥧 🍫 🍬 🍭 🍮 🍯 🍼 🥛 ☕ 🍵 🍺 🍻 🥂 🍷 🥃 🍸 🍹 🧉 🧊',
  'Travel': '🚗 🚕 🚙 🚌 🚎 🏎️ 🚓 🚑 🚒 🚐 🚚 🚛 🚜 🛴 🚲 🛵 🏍️ 🚨 🚔 🚍 🚘 🚖 🚡 🚠 🚟 🚃 🚋 🚞 🚝 🚄 🚅 🚈 🚂 🚆 🚇 🚊 🚉 ✈️ 🛫 🛬 🛩️ 💺 🛰️ 🚀 🛸 🚁 🛶 ⛵ 🚤 🛥️ 🛳️ ⛴️ 🚢 ⚓ 🗺️ 🗿 🗽 🗼 🏰 🏯 🏟️ 🎡 🎢 🎠 ⛲ ⛱️ 🏖️ 🏝️ 🏔️ ⛰️ 🌋 🗻 🏕️ ⛺ 🏠 🏡 🏢 🏦 🏨 🏪 🏫 ⛪ 🕌',
  'Objects': '⌚ 📱 💻 ⌨️ 🖥️ 🖨️ 🖱️ 💽 💾 💿 📀 📷 📸 📹 🎥 📞 ☎️ 📟 📠 📺 📻 🎙️ ⏱️ ⏰ ⏳ 🔋 🔌 💡 🔦 🕯️ 🧯 🛢️ 💸 💵 💴 💶 💷 🪙 💰 💳 💎 ⚖️ 🧰 🔧 🔨 ⚒️ 🛠️ ⛏️ 🔩 ⚙️ 🧱 ⛓️ 🧲 🔫 💣 🧨 🔪 🗡️ ⚔️ 🛡️ 🚬 ⚰️ 🏺 🔮 📿 💈 ⚗️ 🔭 🔬 🕳️ 💊 💉 🩹 🩺 🚪 🛏️ 🛋️ 🚽 🚿 🛁 🧴 🧷 🧹 🧺 🧻 🧼 🧽 🛒 🚭',
  'Symbols': '❤️ 🧡 💛 💚 💙 💜 🖤 🤍 🤎 💔 ❣️ 💕 💞 💓 💗 💖 💘 💝 💟 ☮️ ✝️ ☪️ 🕉️ ☸️ ✡️ 🔯 🕎 ☯️ ☦️ 🛐 ⛎ ♈ ♉ ♊ ♋ ♌ ♍ ♎ ♏ ♐ ♑ ♒ ♓ 🆔 ⚛️ 🉑 ☢️ ☣️ 📴 📳 🈶 🈚 🈸 🅰️ 🅱️ 🆎 🆑 🅾️ 🆘 ❌ ⭕ 🛑 ⛔ 📛 🚫 💯 💢 ♨️ 🚷 🚯 🚳 🚱 🔞 📵 ❗ ❓ ‼️ ⁉️ 🔅 🔆 〽️ ⚠️ 🚸 🔱 ⚜️ 🔰 ♻️ ✅ 🈯 💹 ❇️ ✳️ ❎ 🌐 💠 Ⓜ️ 🌀 💤 🏧 🚾 ♿ 🅿️ 🛗 🈳 🈂️ 🛂 🛃 🛄 🛅',
  'Fun': '⭐ 🌟 ✨ ⚡ 🔥 💥 💫 🌈 ☀️ 🌤️ ⛅ 🌥️ ☁️ 🌦️ 🌧️ ⛈️ 🌩️ 🌨️ ❄️ ☃️ ⛄ 🌬️ 💨 🌪️ 🌫️ 🌊 💧 💦 ☔ ☂️ 🌙 🌛 🌜 🌚 🌝 🌞 🪐 🌍 🌎 🌏 🎉 🎊 🎈 🎁 🎀 🎗️ 🎫 🎟️ 🏆 🏅 🥇 🥈 🥉 ⚽ 🏀 🏈 ⚾ 🎾 🏐 🏉 🎱 🏓 🏸 🥅 🏒 🏑 🥍 🏏 ⛳ 🎯 🎮 🕹️ 🎲 🧩 🎰 🎨 🎭 🎤 🎧 🎼 🎵 🎶 🥁 🎷 🎺 🎸 🪕 🎻 📚 📖 📝 ✏️ 📌 📎 ✂️ 📅 🔍 🔎 🔒 🔑',
};

export const EMOJI_KEYWORDS = {
  '😀':'grin happy smile','❤️':'heart love red','🔥':'fire hot lit','⭐':'star','✅':'check tick done ok',
  '❌':'cross x no','🎉':'party celebrate tada','🙏':'pray thanks please','👍':'thumbs up good yes',
  '👎':'thumbs down bad no','☕':'coffee tea','🍕':'pizza food','🐶':'dog puppy','🐱':'cat kitten',
  '🚗':'car auto','✈️':'plane flight travel','🎂':'cake birthday','💡':'idea bulb light',
  '📌':'pin note','⚠️':'warning caution','🕐':'time clock','💰':'money cash','🎁':'gift present',
};

/* ------------------------------------------------------------ bluetooth uuids */
export const U16 = x => `0000${x}-0000-1000-8000-00805f9b34fb`;
export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

export function validUuids(list, label){
  const ok = [], bad = [];
  for (const u of list) (UUID_RE.test(u) ? ok : bad).push(u);
  if (bad.length) console.warn('dropped malformed ' + label + ' UUIDs:', bad);
  return Array.from(new Set(ok));
}

export const KNOWN_SERVICES = validUuids([
  U16('ff00'), U16('18f0'), U16('ae30'), U16('fff0'), U16('ffe0'), U16('fee7'),
  U16('180f'), U16('180a'), U16('1800'), U16('1801'),
  'e7810a71-73ae-499d-8c15-faa9aef0c3f2',
  '49535343-fe7d-4ae5-8fa9-9fafd205e455',
  '6e400001-b5a3-f393-e0a9-e50e24dcca9e',
], 'service');

export const PREFERRED_WRITE = validUuids([
  U16('ff02'), U16('2af1'), U16('ae01'), U16('fff2'), U16('fff1'), U16('ffe1'),
  'bef8d6c9-9c21-4c9e-b632-bd58c1009f9f',
  '49535343-8841-43f4-a8d4-ecbe34729bb3',
  '6e400002-b5a3-f393-e0a9-e50e24dcca9e',
], 'write');

export const PREFERRED_NOTIFY = validUuids([
  U16('ff01'), U16('2af0'), U16('ae02'), U16('fff1'),
  '49535343-1e4d-4bd9-ba61-23c647249616',
  '6e400003-b5a3-f393-e0a9-e50e24dcca9e',
], 'notify');

export const PRINTER_SERVICES = new Set([
  U16('ff00'), U16('18f0'), U16('ae30'), U16('fff0'), U16('ffe0'), U16('fee7'),
  'e7810a71-73ae-499d-8c15-faa9aef0c3f2',
  '49535343-fe7d-4ae5-8fa9-9fafd205e455',
  '6e400001-b5a3-f393-e0a9-e50e24dcca9e',
]);

export const GENERIC_SERVICES = new Set([U16('1800'), U16('1801'), U16('180a'), U16('180f')]);

/* ------------------------------------------------------------ storage keys */
export const STORAGE_KEY_LAYOUT = 'peripage-editor-v1';
export const STORAGE_KEY_PRESETS = 'peripage-presets-v1';
