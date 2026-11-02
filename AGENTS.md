# AGENTS.md

## Project overview

This repository contains a browser-based editor and print client for PeriPage thermal printers, primarily the PeriPage A6 Mini.

The application:

- runs entirely in the browser;
- connects to the printer through the Web Bluetooth API;
- composes text, images, QR codes, barcodes, dividers, spacers, and gift tags;
- rasterizes the composition to a 1-bit monochrome bitmap at the printer's native width;
- sends ESC/POS raster data wrapped with PeriPage-specific commands over a writable BLE GATT characteristic;
- stores layouts only in the browser's `localStorage`;
- has no application backend, database, or server-side Bluetooth component.

The production target for this fork is a static site served by Nginx over HTTPS. The production target is a static site served by Nginx over HTTPS. The repository contains no cloud-platform deployment configuration or production application server.

## Repository layout

The repository is intentionally minimal:

```text
.
├── .git/
├── .gitignore
├── AGENTS.md
├── README.md
└── public/
    └── index.html
```

Important files:

- `public/index.html`: the complete application, including HTML, CSS, and JavaScript.
- `README.md`: project documentation, protocol notes, browser requirements, troubleshooting, and deployment guidance.
- `.gitignore`: files and directories intentionally excluded from version control.
- `AGENTS.md`: instructions for coding agents working on this repository.

There is no `package.json`, build system, application server, Wrangler configuration, or startup script. Do not recreate any of these unless a future task explicitly requires one and explains why a static-only solution is insufficient.

The deployed site consists of the contents of `public/`. Do not move `index.html` to the repository root or create a second copy of the application.

## Primary architectural rules

1. Keep the application static and client-side by default.
2. Do not introduce Node.js, Python, PHP, a database, or an API server into the production runtime unless the requested feature genuinely requires one.
3. Do not add a frontend framework merely to implement a small change. The current application is intentionally dependency-light and single-file.
4. Preserve direct browser-to-printer communication. Nginx only serves static files and must never be treated as the Bluetooth endpoint.
5. Preserve support for HTTPS and `http://localhost`. Web Bluetooth must not be expected to work from an ordinary insecure LAN origin such as `http://192.168.x.x`.
6. Preserve compatibility with Chromium-based browsers that implement Web Bluetooth. Do not claim support for browsers that do not expose `navigator.bluetooth`.
7. Treat BLE writes as hardware-sensitive. Avoid refactoring Bluetooth transport, packet framing, delays, row boundaries, UUID selection, or reset behavior without focused testing.
8. Never add secrets, printer identifiers, Bluetooth addresses, API tokens, or personal layout data to the repository.
9. Keep the repository minimal: application changes normally belong in `public/index.html`, while documentation changes belong in `README.md` or `AGENTS.md`.

## Current application design

The application state is held in the global `S` object. Content is represented as an ordered array of blocks in `S.els`.

Current block types include:

- `text`
- `image`
- `qr`
- `barcode`
- `rule`
- `space`
- `card`

The main rendering pipeline is:

```text
block state
  -> renderEl()
  -> per-block 1-bit raster
  -> compose()
  -> LAST mono buffer
  -> canvas preview or packRows()
  -> printMono()
  -> BLE writes
```

Key areas in `public/index.html`:

- CSS and responsive layout
- font catalogue and font loading
- default block models in `makeEl()`
- image luminance and dithering
- text wrapping and element rasterization
- gift-tag rendering
- full-document composition and preview
- ESC/POS row packing
- Web Bluetooth discovery and characteristic selection
- PeriPage command framing and print transfer
- editor UI generation and event delegation
- drag-to-reorder behavior
- layout save/load and PNG export
- application boot and default document

Before changing a feature, trace both its UI state and rasterization path. A control that appears correctly in the editor but is not consumed by `renderEl()` has no effect on printed output.

## Hardware and protocol invariants

Unless a task explicitly asks to investigate printer protocol behavior, preserve these invariants:

- A6 width is 384 dots for the existing default profile.
- Raster rows are packed MSB first, with `1` representing a black dot.
- ESC/POS raster command uses `GS v 0` (`1d 76 30 00`).
- Raster blocks are capped at 255 rows.
- A PeriPage reset is sent immediately before every raster block.
- Row-by-row mode must not combine data in a way that crosses raster-row boundaries.
- Bulk mode remains optional because not every firmware/transport combination tolerates it equally.
- Write operations retain retry handling and pacing.
- Auto-selection must strongly prefer known printer services and avoid generic services such as battery and device information.
- If multiple writable characteristics exist, manual selection and characteristic probing must remain available.
- Web Bluetooth supports BLE GATT only. It cannot communicate with Bluetooth Classic SPP/RFCOMM-only printer revisions.

When changing transport code, identify whether the change affects:

- discovery filters;
- optional service UUIDs;
- characteristic scoring;
- write-with-response versus write-without-response;
- packet size;
- write delay;
- reset/density/feed commands;
- raster block boundaries;
- progress reporting;
- disconnect and reconnect behavior.

Explain these effects in the final summary.

## External dependencies

The current page loads resources from external CDNs, including Google Fonts, QRious, and JsBarcode.

When modifying dependencies:

- prefer pinned versions;
- do not silently upgrade libraries;
- do not remove a dependency without replacing every use;
- keep the app usable when a font fails to load by retaining sensible fallbacks;
- consider self-hosting the assets under `public/vendor/` or `public/fonts/` when offline operation, privacy, repeatability, or a strict Content Security Policy is requested;
- update `README.md` if runtime network requirements change.

Do not add npm runtime packages merely to load browser libraries. If local vendoring is requested, store browser-ready files under `public/` and reference them with relative URLs.

## Development workflow

### Inspect before editing

Before making changes:

1. Read `AGENTS.md` and the relevant sections of `README.md`.
2. Inspect the actual repository tree.
3. Read the relevant portions of `public/index.html` rather than assuming framework conventions.
4. Search for all references to a state property, block type, DOM ID, UUID, command, or function being changed.
5. Determine whether the request affects only UI, only rasterization, only Bluetooth transport, or multiple layers.

Do not edit generated files, minified vendor files, or deployment configuration unless the task requires it.

### Keep changes focused

- Prefer the smallest coherent patch that completes the requested behavior.
- Do not perform unrelated formatting or broad rewrites.
- Preserve existing user-facing behavior unless a change is explicitly requested.
- Reuse the established helpers and event-delegation patterns.
- Avoid renaming stable IDs and function names without a practical reason.
- Add concise comments only where hardware behavior, browser restrictions, or non-obvious algorithms need explanation.

### Local run

No build or dependency installation is required. Start a local static server from the repository root:

```bash
python3 -m http.server 8765 --bind 127.0.0.1 --directory public
```

On Windows, either of these commands may be available:

```powershell
py -m http.server 8765 --bind 127.0.0.1 --directory public
```

```powershell
python -m http.server 8765 --bind 127.0.0.1 --directory public
```

Open:

```text
http://localhost:8765/
```

`localhost` is intentionally used because Web Bluetooth requires a secure context and browsers treat localhost as trustworthy for development.

Do not test Bluetooth by opening `public/index.html` through `file://`, and do not add a server script merely as a shortcut for the command above.

### Static syntax check

Because the JavaScript is inline, extract it and run a parser check after JavaScript changes:

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

External `<script src="...">` tags are not included by this extraction.

If Node.js is unavailable, at minimum inspect the browser console after loading the page. Do not claim syntax validation was performed if it was not.

## Validation checklist

For every change, run or evaluate the relevant items below.

### General UI

- The page loads without JavaScript errors.
- Existing default blocks render.
- Controls remain usable at common desktop widths.
- Scrolling continues to work in all three columns.
- Buttons and inputs retain accessible labels or meaningful visible text.
- User-provided strings inserted through HTML templates are escaped with the existing `esc()` helper.

### Editor behavior

- Add, edit, duplicate, delete, collapse, move, and drag operations still work.
- The selected block and title summary remain correct.
- Changing a control repaints the preview when appropriate.
- Structural controls rebuild the editor only when necessary.
- Saved layouts can be loaded without losing supported fields.
- New fields have safe defaults for older saved layouts.
- Images still restore correctly from stored data URLs when applicable.

### Rendering

- Preview dimensions match the selected paper width.
- Printed raster and preview derive from the same mono buffer.
- Black/white polarity is unchanged.
- Text wrapping does not overflow the paper width.
- QR modules remain aligned to integer printer dots.
- Barcodes remain readable and invalid values fail visibly rather than crashing.
- Image brightness, contrast, inversion, and dithering remain deterministic.
- Empty documents do not trigger a print job.

### Bluetooth and printing

When hardware is available, test with an actual PeriPage A6 Mini after changes to transport or raster code:

- device chooser opens only after a user gesture;
- connection and disconnection update the UI;
- services and characteristics are enumerated;
- a writable characteristic is selected or can be selected manually;
- test strip prints;
- ordinary content prints;
- feed and reset controls work;
- row-by-row mode works with the safe packet setting;
- disconnecting during a write produces a useful error and does not leave the UI permanently disabled.

If hardware was not available, state explicitly that physical printing was not verified.

### Browser checks

At minimum, target current desktop Chrome or Edge and Chrome on Android when mobile behavior is affected. Verify that unsupported/insecure contexts display a useful warning rather than failing silently.

## Adding or changing block types

When adding a new block type, update every relevant layer:

1. Add a default model in `makeEl(type)`.
2. Add an editor button or another creation path.
3. Add a label/color style if needed.
4. Add a summary in `title(el)`.
5. Add controls in `bodyFor(el)`.
6. Add rasterization in `renderEl(el, W)` or a dedicated helper.
7. Ensure `before` and `after` spacing semantics are consistent.
8. Ensure duplicate, delete, reorder, save, load, and PNG export work.
9. Ensure old saved layouts still load.
10. Document the new block in `README.md`.

Keep block data serializable. Do not store DOM nodes, canvas contexts, Bluetooth objects, or other non-serializable runtime objects in saved layout data. Runtime-only properties should use a clear convention such as the existing `_img` property and must be removed before serialization.

## State and persistence compatibility

The current local-storage key is:

```text
peripage-editor-v1
```

Do not change it casually. If a breaking schema change is necessary:

- introduce a versioned schema;
- migrate old data when practical;
- preserve unknown-but-safe fields where possible;
- handle malformed storage without preventing application startup;
- document the migration.

Avoid changing existing default values in a way that alters previously saved layouts unexpectedly.

## Security and privacy

This is a static application, but browser security still matters.

- Never use `innerHTML` with unescaped user text.
- Preserve escaping for text, filenames, QR values, barcode values, and saved content displayed in generated markup.
- Do not log personal content or full document data unless a debugging task explicitly requires it.
- Do not upload layouts, images, Bluetooth identifiers, or printer data.
- Do not add analytics, telemetry, or remote logging without explicit approval.
- Do not request broader Bluetooth permissions or services than required.
- Do not attempt to bypass the Web Bluetooth user-gesture or secure-context requirements.
- If adding a Content Security Policy, account for inline script/style usage or refactor them deliberately. Do not deploy a policy that silently breaks the editor.

## Nginx deployment target

The application must remain deployable as plain static files. A typical deployment copies the contents of `public/` into a web root such as:

```text
/var/www/peripage/
```

A minimal server block is:

```nginx
server {
    listen 80;
    listen [::]:80;
    server_name peripage.example.com;

    root /var/www/peripage;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

Production must use HTTPS. The HTTP virtual host should redirect to HTTPS once the certificate is configured.

When adding files, use relative asset paths that work when served from the configured site root. If subpath hosting is requested, audit every absolute path and test from that subpath.

Do not require Nginx modules beyond ordinary static-file serving unless explicitly requested.

## Static-only repository policy

This fork deliberately contains no Node.js project metadata or cloud-platform configuration.

Agents must not introduce any of the following by default:

- `package.json` or `package-lock.json`;
- `node_modules/`;
- Vite, Webpack, Parcel, React, Vue, Svelte, or another frontend framework;
- Wrangler or Cloudflare Workers configuration;
- Python, Node.js, PHP, or another production application server;
- Docker files solely to serve this static page;
- a generated `dist/` directory;
- a duplicate root-level `index.html`.

If a requested feature appears to require tooling or a new dependency, first determine whether it can be implemented directly in `public/index.html` or with static assets under `public/`. Introduce build tooling only when the user explicitly approves that architectural change.

Development commands are allowed to use tools already installed on the workstation for validation, but such tools must not become production dependencies unless explicitly requested.

## Coding conventions

- Use plain HTML, CSS, and modern browser JavaScript consistent with the existing file.
- Keep strict mode enabled.
- Prefer `const`; use `let` only for reassigned bindings.
- Use `async`/`await` for asynchronous Bluetooth and font operations.
- Preserve the established `$` and `$$` selector helpers unless refactoring the whole application is explicitly requested.
- Keep user input clamped before it affects dimensions, packet sizes, or printer commands.
- Use typed arrays for raster and protocol data.
- Avoid per-pixel object allocation in rendering loops.
- Avoid unnecessary `buildList()` calls because they rebuild interactive DOM state. Prefer `paint()` for visual-only changes.
- Keep functions small enough to reason about, but do not fragment straightforward raster loops merely for style.
- Follow the existing naming style for DOM IDs, state fields, and helper functions.
- Keep the visible UI language consistent within a change. Do not partially translate the interface unless requested.

## Performance guidance

Raster operations scale with paper width and document height. When changing rendering code:

- avoid repeated full-document composition when one repaint is sufficient;
- avoid converting large typed arrays to normal arrays;
- avoid synchronous work that blocks pointer dragging or text entry more than necessary;
- release temporary object URLs;
- be cautious with very tall canvases and large embedded images;
- preserve `willReadFrequently: true` where repeated pixel reads are expected;
- debounce font-related repaints and similarly expensive repeated operations.

Do not optimize Bluetooth throughput by removing delays or increasing packet size globally without hardware evidence. Faster settings must remain optional and recoverable.

## Agent task protocol

For each requested change:

1. Restate the concrete objective internally and identify affected layers.
2. Inspect the relevant code and all call sites.
3. Make a focused patch.
4. Run available static checks.
5. Run the app locally when possible.
6. Test the affected UI/rendering behavior.
7. Test physical printing when the change touches protocol or BLE and hardware is available.
8. Update documentation when behavior, dependencies, browser requirements, deployment, or supported block types change.
9. Report exactly what changed, which checks ran, and what remains unverified.

Do not report success based only on code appearance. Distinguish clearly among:

- statically validated;
- loaded successfully in a browser;
- functionally tested in the editor;
- physically printed on a PeriPage device.

## Change report format

At the end of an implementation task, provide a concise report with:

```text
Summary
- What changed

Files changed
- path: purpose

Validation
- Checks that passed

Not verified
- Hardware/browser/deployment checks that were not available

Deployment notes
- Only when the change affects Nginx, HTTPS, paths, assets, or caching
```

## Prohibited assumptions

Do not assume:

- that every PeriPage A6 revision exposes the same BLE service;
- that a successful BLE write means data reached the print endpoint;
- that Web Bluetooth works over ordinary HTTP on a LAN address;
- that Safari or Firefox supports this application;
- that npm, a build step, or a production application server is required;
- that preview correctness guarantees hardware correctness;
- that increasing MTU or removing delays is safe for every printer firmware;
- that externally hosted fonts or scripts are available offline.

When uncertain about printer behavior, preserve the current known-working path and expose experimental behavior as an explicit option rather than replacing the safe default.
