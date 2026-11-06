PARAMETERS TO EDIT

LABEL_PURPOSE:
"descrive il contenuto di una scatola o bustina di cibo"

LABEL_FIELDS:

- cibo/sostanza contenuta
- data imbustamento/sigillatura

OPTIONAL ICON:
"a simple monochrome icon di un cibo"

MAIN HEADER:
"La dispensa di G&M&F"

SECONDARY HEADER:
none

TASK

Create a finished, downloadable SVG label template based strictly on the parameters above.

The label must be designed for printing with a PeriPage A6 Mini thermal printer at 203 DPI and editing in Inkscape.

The generated label must follow these requirements.

DOCUMENT FORMAT

- SVG 1.1 format.
- Canvas width: exactly 384 px.
- Physical width: approximately 48 mm.
- Use a viewBox starting at 0 0 with a width of 384 units.
- Calculate the height according to the amount of information, keeping the label as compact as possible.
- Prefer a compact height between 180 and 260 px when the content allows it.
- White page background.
- Optimized for a 203 DPI monochrome thermal printer.
- Use only pure black #000000 and pure white #FFFFFF.
- Do not use grayscale, colors, transparency, shadows, gradients, blur, textures, photographs, or dithering.
- Use square pixels.
- Leave a safe external margin of at least 8 px.
- Keep all essential content at least 16 px away from the canvas edges.

VISUAL STYLE

Use a modern, elegant, compact, monochrome industrial-label style.

The label should have:

- A fully closed external black border.
- Rounded external corners.
- A black upper header with rounded top corners.
- A white content area below the header.
- Strong visual hierarchy.
- Generous but efficient spacing.
- Bold typography for the main value.
- Small uppercase labels with increased letter spacing.
- Clear alignment and consistent margins.
- A clean style inspired by modern technical, workshop, inventory, and maker-space labels.

The label must look polished and intentional, not like a generic form.

Do not add decorative elements that do not improve identification or readability.

BORDER REQUIREMENTS

The outer border must be a single complete shape or rectangle.

The border must:

- Be visible on all four sides.
- Have properly rounded top and bottom corners.
- End completely inside the SVG canvas.
- Never appear cropped or cut off at the bottom.
- Never extend outside the page.
- Remain visually consistent after opening the SVG in Inkscape.
- Use a stroke width suitable for 203 DPI thermal printing, preferably between 2 and 3 px.

The black header must align precisely with the internal edges of the outer border.

The transition between the black header and the white body must be clean and horizontal.

LAYOUT RULES

Place the main header prominently inside the black upper section.

If a secondary header is provided:

- Place it above or beside the main header.
- Use a smaller font size than the main header.
- Keep both texts clearly readable.

If an icon is requested:

- Create it as a simple editable vector icon.
- Use only basic SVG paths, circles, rectangles, or lines.
- Make the icon white when placed inside the black header.
- Do not use external image files.
- Do not embed raster images.
- Keep the icon visually simple enough for 203 DPI printing.

Place the remaining fields in the white section.

For each field:

- Display the field label in small uppercase letters.
- Display its value below the label in a larger and heavier font.
- Give greater visual emphasis to the most important value.
- Avoid unnecessary lines and separators.
- Do not repeat the same information unless repetition is intentionally requested in the parameters.

Automatically adapt the layout to the number of fields:

- One or two fields: use a spacious single-column arrangement.
- Three or four short fields: use a balanced two-column arrangement when appropriate.
- Long values: use a single-column arrangement.
- Never allow text to overlap another element.
- Never allow text to extend beyond the safe area.
- Reduce font size moderately if necessary, but prioritize readability.

TYPOGRAPHY

Use this font stack:

Inter, Arial, sans-serif

Use editable SVG text objects, not text converted into paths.

Recommended hierarchy:

- Main header: 28 to 34 px, bold or extra bold.
- Secondary header: 15 to 18 px, semibold, uppercase.
- Main body value: 30 to 40 px, extra bold.
- Other field values: 18 to 24 px, semibold or bold.
- Field labels: 10 to 13 px, bold, uppercase, with increased letter spacing.

Avoid fonts with very thin lines.

All text must remain legible after printing on a 203 DPI thermal printer.

INKSCAPE COMPATIBILITY

The SVG must open correctly in Inkscape.

Organize the document into named Inkscape layers:

- 01 Background and Border
- 02 Header
- 03 Main Information
- 04 Additional Fields
- 05 Optional Icon
- 99 Safe Area Guide

Use:

- inkscape:groupmode="layer"
- inkscape:label="Layer name"

Give editable elements meaningful IDs, such as:

- outer-border
- header-background
- header-main
- header-secondary
- main-value
- field-1-label
- field-1-value
- optional-icon

Create an optional safe-area guide as a separate hidden layer.

The safe-area guide:

- Must be hidden by default.
- Must not be visible in the printed result.
- May use a gray dashed outline because it is a non-printing editing guide only.

Avoid:

- External CSS.
- External fonts.
- External images.
- Linked resources.
- JavaScript.
- Filters.
- Masks and clipping paths unless absolutely necessary.
- Features unsupported by standard SVG viewers.

DELIVERABLES

Create the actual files, not merely instructions or an SVG code sample.

Provide:

1. A valid editable SVG file.
2. A PNG preview of the complete label.
3. A ZIP archive containing the SVG file, to ensure that the SVG can be downloaded even if the interface does not support direct SVG downloads.

Use descriptive filenames based on LABEL_PURPOSE.

Before delivering the files:

- Validate the SVG as well-formed XML.
- Verify that the SVG opens correctly.
- Check that the complete outer border is visible.
- Check that the lower border is not cropped.
- Check that no text overlaps or extends outside the canvas.
- Check that only pure black and pure white are used in printable layers.
- Check that the canvas width is exactly 384 px.
- Render the PNG preview from the final SVG, not from a separate design.

Return clickable download links for the ZIP file and PNG preview.

Do not return only the SVG source code in the response.