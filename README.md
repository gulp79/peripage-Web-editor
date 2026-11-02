# PeriPage A6 Web Editor

A single-file browser application that composes a receipt and prints it straight to a
PeriPage A6 or A6 Mini thermal printer over **Web Bluetooth**. No native app, no driver,
no installation.

The application is a static web page (`public/index.html`) that must be served over
**HTTPS** from a web server. It connects directly from the browser to the printer via
BLE GATT — the server only delivers the page and plays no role in Bluetooth communication.

## Requirements

### Browser

Web Bluetooth is available only in Chromium-based browsers (Chrome, Edge) on supported
platforms. Safari and Firefox do not implement the API and cannot use this application.

| Platform | Status |
|---|---|
| Chrome / Edge, Windows, macOS | Works out of the box |
| Chrome, Android | Works — natural pairing for a pocket printer; page must be on HTTPS |
| Chrome, Linux | Works when BlueZ 5.41+ is present. Older builds may need `chrome://flags/#enable-experimental-web-platform-features` |
| Safari, Firefox | No Web Bluetooth — not supported |

### Secure context

`file://` does not work. Chrome exposes `navigator.bluetooth` only on `https://` or
`http://localhost`. A plain LAN address such as `http://192.168.1.5` is not a secure
context — the browser hides Bluetooth entirely at that origin with no error message.

This means:

- **Development:** serve from `localhost` with the command below.
- **Production:** serve from a domain with a valid TLS certificate.

## Deployment

The repository contains only static files. Copy the contents of `public/` to any HTTPS
web server.

### Nginx example

```nginx
server {
    listen 80;
    listen [::]:80;
    server_name peripage.example.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name peripage.example.com;

    ssl_certificate     /etc/letsencrypt/live/peripage.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/peripage.example.com/privkey.pem;

    root /var/www/peripage;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

Place `public/index.html` in `/var/www/peripage/` and reload Nginx.
HTTPS is mandatory — without it the Connect button cannot function.

### Local development

No build step or package manager is required.

```powershell
# Windows
py -m http.server 8765 --bind 127.0.0.1 --directory public
```

```bash
# macOS / Linux
python3 -m http.server 8765 --bind 127.0.0.1 --directory public
```

Open `http://localhost:8765/` in Chrome or Edge.

### Syntax check

After editing the inline JavaScript, extract and parse it with:

```bash
python3 - <<'PY'
from pathlib import Path
import re
html = Path('public/index.html').read_text(encoding='utf-8')
scripts = re.findall(r'<script(?:\s[^>]*)?>(.*?)</script>', html, flags=re.S | re.I)
inline = [s for s in scripts if s.strip()]
Path('/tmp/peripage-inline.js').write_text('\n'.join(inline), encoding='utf-8')
print(f'extracted {len(inline)} inline script block(s)')
PY
node --check /tmp/peripage-inline.js
```

## Blocks

Text (font, size, weight, alignment, tracking, line height, inverted white-on-black),
image, QR code, barcode, divider, spacer, and **gift tag**.

**Gift tag** is a framed name card for presents: a To line, a message, a From line, an
ornament, and a border. Twelve borders in two moods — classy (single, double, thick + thin,
dotted, deco corners) and funky (dashed, ticket stub with punched notches, scallops, zigzag,
wave, stars). Borders are painted as geometry directly on the dot grid rather than assembled
from font glyphs, so they stay sharp at 203 dpi and scale with the border weight. Type
hierarchy is derived from one size control: labels, names, and message sizes are computed
from it so a tag stays balanced whatever you set.

**Fonts.** 32 faces in eight groups: heavy display, funky, pixel and retro, handwriting,
script, typewriter, elegant, plus the system defaults. Pixel faces such as Press Start 2P
and Silkscreen are a natural fit for a 203 dpi head, since their grid lands on whole dots.
Webfonts are loaded through the CSS Font Loading API *before* the canvas draws — a face that
has not arrived yet renders as a silent fallback and would bake the wrong glyphs into the
raster.

**Emoji.** A searchable picker with nine categories inserts at the caret. Emoji are rendered
through **Noto Emoji**, the monochrome face, not the colour one. Colour emoji thresholded to
1-bit collapse into unreadable blobs, whereas the monochrome glyphs are line art that prints
cleanly. The picker grid uses the same face, so what you pick is what prints.

Blocks start collapsed as one-line rows, so a long document stays scannable. A block you
have just added opens automatically. Drag the grip at the left of any row to reorder, or use
the arrow buttons for precision. Reordering uses pointer events rather than HTML5
drag-and-drop, because HTML5 dragging never fires on a touch screen.

Save and load the layout to `localStorage`; export the composition as PNG.

Everything is composited to a 1-bit buffer at the printer's native resolution, so the
on-screen preview is exactly the dot pattern that gets sent.

- **Text, QR, barcode, rules** are hard-thresholded, so they stay crisp.
- **Images** get their own halftone: Floyd–Steinberg, Atkinson, ordered 8×8 Bayer, or a
  plain threshold, with brightness/contrast/invert.
- **QR codes** snap to an integer number of printer dots per module and are centred on
  the dot grid, which matters for scan reliability at 203 dpi.

## Wire protocol

Raster data is standard ESC/POS `GS v 0`, wrapped in PeriPage's own reset and density
commands. Derived from `bitrate16/peripage-python`.

| Purpose | Bytes |
|---|---|
| Reset | `10 ff fe 01` + twelve `00` |
| Darkness | `10 ff 10 00 0n`  (n = 0 light, 1 normal, 2 dark) |
| Raster block | `1d 76 30 00 xL xH yL yH` + rows |
| Feed paper | `1b 4a nn`  (nn = dot rows) |

`xL/xH` is bytes per row (48 for a 384-dot A6), `yL/yH` is the row count in that block,
capped at 255. Rows are MSB-first, 1 = black dot.

Framing follows the reference driver exactly:

- a **reset before every raster block**, not once per job;
- in the default **row-by-row** transfer mode, one write per row, so a write never
  straddles a row boundary. **Bulk packets** mode streams the whole block instead, which
  is faster where the printer tolerates it.

A verified transcript for three rows per block:

```
10ff100001                        density
10fffe01 000000000000000000000000 reset
1d76300030000300                  block: 48 bytes/row, 3 rows
<48 bytes> <48 bytes> <48 bytes>  one write per row
…                                 reset + preamble + rows, per block
1b4a50                            feed
```

## Connecting

Press **Connect**. The app enumerates every GATT service it is allowed to see, logs each
characteristic with its properties, and auto-selects a known write characteristic
(`ff02`, `2af1`, `ae01`, Nordic UART, Microchip transparent UART…). It also subscribes to
a notify characteristic if one exists.

Switch the device filter to **All Bluetooth devices** if the printer does not advertise a
`PeriPage`/`PPG` name prefix.

### If no writable characteristic appears

Some PeriPage units expose only Bluetooth Classic SPP/RFCOMM. Web Bluetooth speaks GATT
only and cannot reach those — no browser workaround exists. In that case the printer needs
a native application or bridge.

## When it connects but nothing prints

Writing to the wrong characteristic almost always succeeds silently, so the log cannot tell
you it went nowhere. Press **Probe every characteristic**. It prints a numbered line through
each writable characteristic in turn. Whichever number appears on paper identifies the right
one, which you then select from the dropdown.

Auto-selection scores candidates rather than taking the first match, strongly preferring
known printer services and refusing to land on housekeeping services like battery or device
information. If nothing scores, the log says so instead of pretending.
