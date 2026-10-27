# PDF compression MVP — review candidate (not deployed)

## Scope

- Three standalone, local-only routes: /pdf/, /pt/pdf/, /es/pdf/.
- Uses **qpdf-run 0.2.3** (MIT) bundling a qpdf WebAssembly runtime and a Web Worker. Files are never uploaded. No new Worker, API route, tracking or advertising.
- Two honest presets:
  1. Preserve quality: lossless Flate recompression and object streams.
  2. Smaller file: above plus qpdf's image optimization, which may convert eligible images to JPEG and reduce visual quality. Text/vectors are not rasterized.
- Output is checked by qpdf before being offered. If not smaller than the input, returns the **unchanged original**, explicitly disclosing this.
- Input maximum: 20 MiB. PDF may still exceed mobile RAM during decompression; a 90s process timeout is applied. "Cancel" terminates the worker where already initialized.
- Warns that reserialization may invalidate digital signatures or PDF certifications. Common signatures (/ByteRange) are detected and blocked; this detection is not exhaustive. Do not market it as signature safe.
- Password-protected PDFs, malformed PDFs and unsupported PDFs show a generic, localized failure.

## Known limits and review gates

- qpdf performs structural optimization; it does not downsample existing JPEG scans. Some documents, particularly scanned or previously optimized PDFs, shrink little or not at all. The "Smaller file" preset is **not** a target size guarantee.
- Some PDF structures can be damaged by rewriting. Manual regressions required: text selection, internal hyperlinks, embedded fonts, form fields, transparency, tagged accessibility, PDF/A, visual diffs, signed files.
- Confirm qpdf WASM supports the chosen options on both desktop and mobile; no claims of completion until Chromium smoke, actual PDF download and output validation succeed on the candidate SHA.
- Inspect the pinned package and vendored qpdf binary, license notices, and supply-chain provenance before merging. Do not merge/deploy automatically.
- Future true image downsampling is a separate phase after production validation and benchmarks; never rasterize whole pages silently.

## Local verification

npm ci --ignore-scripts --no-audit --no-fund
npm run verify
python3 tests/browser-pdf-smoke.py
DEPLOY_TARGET=production npm run build
DEPLOY_TARGET=production node scripts/verify-build.mjs

A preview build remains noindex. Production canonical and sitemap include all six pages only when DEPLOY_TARGET=production.
