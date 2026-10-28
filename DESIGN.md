# VexSnap interface refresh

Reference: https://hyperpdf.cloud/ (inspected 28 October 2026).

Inspected the live desktop page and its 400px mobile layout in Chrome, plus the public HTML/CSS. The reference uses a centered hero, subtle 60px background grid and red radial glow, bold sans-serif headings, pill labels, gradient primary buttons, outlined secondary buttons, and rounded dark cards. Its mobile navigation hides secondary links and its content grids become single columns.

## Design tokens

| Role | Reference value | VexSnap |
| --- | --- | --- |
| Background | `#0d0d0f` | Same |
| Surfaces | `#13131a`, `#1a1a24`, `#1e1e2e` | Same |
| Main text | `#e8e8f0` | Same |
| Muted text | `#8888aa` | `#aaaac2` for stronger contrast |
| Accents | `#e63946`, `#ff6b6b` | Same |
| Gradient | `#e63946 → #c1121f → #9d0208`, 135 degrees | Same; buttons have an 8% black overlay for white-label contrast |
| Decorative borders | White at 8% opacity | Same; controls use `#606078` |
| Font | `-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', sans-serif` | Same, no external font requests |
| Weights | 800 headings, 700 card headings/primary buttons, 600 labels, 400 body | Same hierarchy |
| Radii | 8px controls, 14px buttons, 20px cards, pill badges | Same scale |
| Spacing | 16–32px component spacing; large 80–100px sections | 8px scale, 64px desktop / 40px mobile sections for a working tool |

VexSnap retains its name and Vexora attribution. Its original viewfinder/V mark is supplied as SVG and app icons. Copy describes only existing JPEG, ZIP and PDF operations. All processing libraries, file validation, compression settings and PDF generation remain unchanged. The white miniature PDF page represents the actual document, rather than inheriting the dark application theme.

## Verification

- `npm run lint`: passed.
- `npm run typecheck`: passed.
- `npm test`: all 8 tests passed.
- `npm run build`: passed on retry; the installed Next.js 16.4.0 emitted a security advisory and initially stopped the build. Framework upgrades were not included in this design change.
- `VEXSNAP_TEST_URL=http://localhost:3002 npm run test:e2e`: passed. Covers PNG import, reorder, rotate, remove, compression, JPEG/ZIP downloads and contents, PDF downloads and all page layouts, orientation, titles, notes, regeneration, corrupt files, and overflow at 320/390/768/1280/1600px.
- `VEXSNAP_TEST_URL=http://localhost:3002 npm run test:interface`: passed. Covers empty states, skip link/focus outline, keyboard preview, Escape and focus return, custom slider, loading status, Letter PDF success, error dismissal, reduced motion, and no external HTTP requests or browser runtime errors during the flow.
- Desktop and mobile screenshots reviewed. The interface suite saves screenshots in `.next/interface-desktop.png` and `.next/interface-mobile.png`.
- Calculated text contrast on the lightest card: main text 13.46:1, muted text 7.22:1, accent text 5.91:1. White button labels at the brightest gradient stop: approximately 4.79:1.

The first end-to-end attempt timed out during cold dev compilation; the retry passed. Tests ran in Chrome. Physical camera capture, browser-dependent HEIC decoding, and Safari/Firefox were not exercised; their existing handling is retained.
