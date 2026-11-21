# Templates & Customization

Invix templates are designed to be data-driven and customizable.

## Built-in Templates

Invix ships with 15 templates:

| Template | Style / Use case |
|---|---|
| Classic | Traditional professional invoice |
| Modern | Clean contemporary layout |
| Minimal | Simple, low-noise layout |
| Corporate | Formal business style |
| Creative | Expressive visual style |
| Elegant | Refined serif/accent style |
| Bold | Strong visual hierarchy |
| Gradient | Color-forward modern style |
| Dark | Dark-themed invoice layout |
| Compact | Dense layout for more items |
| Thermal Receipt | Narrow receipt-style output |
| Freelancer | Freelancer-focused layout |
| Agency | Agency/service-business layout |
| GST Tax Invoice | India GST-oriented invoice |
| Proforma / Quotation | Quote/proforma workflow |

## Customization Studio

The builder includes a customization panel for live template styling:

- **Colors**: primary/secondary/text/background presets and custom colors.
- **Typography**: Google fonts for headings/body, size/line-height controls.
- **Logo**: size and position.
- **Sections**: show/hide and reorder sections.
- **Columns**: toggle, rename, reorder (HSN, Discount, Tax, etc.).
- **Paper**: A4/A5/Letter, portrait/landscape, margins.
- **Watermark**: text/image watermark, opacity, position.
- **Labels**: customize invoice labels/text.
- **Table/Borders**: table style, zebra rows, borders, radius.

## My Templates

You can save custom designs as reusable templates:

- Save current design as a template
- Duplicate/rename/delete
- Export/import template JSON
- Apply saved templates to new invoices

## Template Architecture (for Developers)

Key files:

```text
src/templates/
  registry.jsx   # Template registry and resolution
  layouts.jsx    # Layout engines/components
  schema.js      # Customization schema/defaults/presets
  shared.jsx     # Shared template building blocks
```

### Adding a New Template

1. Add/extend layout or component in `src/templates/layouts.jsx` (or appropriate file).
2. Register the template in `src/templates/registry.jsx`.
3. Ensure it respects customization schema and section/column visibility.
4. Test in builder preview, dark/light mode, PDF/PNG/print export.

## Export Fidelity

When making template changes, always verify:

- Builder live preview
- PDF export
- PNG export
- Print layout
- Mobile/responsive behavior
- Dark/light app UI (where applicable)
