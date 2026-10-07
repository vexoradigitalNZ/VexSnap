# VexSnap

VexSnap is a lightweight, mobile-first browser tool from Vexora Digital. It compresses photographs, exports smaller JPEGs, downloads image collections as ZIPs, and converts photographs into PDFs. It has no accounts or database in V1.

## How it works

The browser reads selected files, creates small previews, and processes each photo sequentially with Canvas. It corrects the photo's embedded orientation during decoding and applies any rotation chosen in the collection. Compression resizes the longest side without upscaling and encodes JPEG. Processed JPEGs are cached in memory for reuse by both exports. One image downloads directly; multiple images are packaged in a ZIP. `pdf-lib` places the same JPEGs into A4 or Letter pages without cropping or stretching. Source files, processed images, and PDFs are held only in browser memory. There are no upload routes, server actions, analytics, or remote conversion services. A page refresh clears the collection.

## Getting started

```bash
npm install
npm run dev
```

Open http://localhost:3000. For a production build, run `npm run build` and `npm start`.

Checks: `npm run lint`, `npm run typecheck`, and `npm test`. For the browser workflow test, start a production server on port 3100 with `npm run start -- -p 3100`, then run `npm run test:e2e`. This test uses an installed Chrome browser and generated sample images.

## Compression

| Mode | Longest side | JPEG quality |
| --- | ---: | ---: |
| Small | 1600 px | 68% |
| Balanced (default) | 2400 px | 82% |
| High Quality | 3200 px | 90% |
| Custom | 640–6000 px | 40–95% |

Transparent PNG pixels receive a white background. The app shows actual compressed size after processing, not an estimate. Compression may increase the size of an already small or optimized image.

## Formats and browser limitations

JPEG, PNG, and WebP are accepted after file signature and decode checks. HEIC/HEIF containers are accepted when the browser can decode them locally, notably on supported Apple devices; browsers without HEIC decoding show a per-file error asking for a JPEG copy. No HEIC conversion package or external service is used. Camera access uses a separate file input with `capture="environment"`; the browser decides whether to offer the camera. Multiple library selection uses the standard multiple file picker.

Large collections can still exceed browser memory, particularly while assembling a ZIP or PDF. Processing is sequential and releases source bitmaps and temporary canvases. On very constrained devices, use smaller batches or the Small preset. PWA metadata and an icon are included, but offline use is not promised because there is no service worker.

## Dependencies

- `pdf-lib`: browser-side PDF construction.
- `jszip`: browser-side ZIP packaging.
- `tsx` (development only): runs TypeScript unit tests with Node's test runner.
- `playwright` (development only): runs the real browser workflow and responsive checks.

## Deployment

Deploy as an ordinary Next.js application to a host that supports Next.js 16, or run `npm run build && npm start` on your own server. Use HTTPS for best mobile camera and installation support. No database, object storage, API keys, or conversion service is required for V1. The application assets are served by the host; users' photos stay in the browser.
