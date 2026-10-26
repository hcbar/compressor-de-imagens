# Image Compressor / Compressor de Imagens

## Simple global-first MVP

Default route `/` is **English**, with PT-BR at `/pt/` and Spanish at `/es/`. All future microtools should default to a global audience unless specifically scoped otherwise.

User journey: **choose an image → enter target size (KB) → see automatically generated preview → download**. No format/mode selector or extra action button. The generated file is shown before download, with original/new KB, chosen output type, dimensions and a short status (reached target, not reached, no reduction).

The application retains the existing `smallest` internal compression strategy: compare real JPEG/WebP output for opaque inputs, PNG/WebP for transparent images. Never silently flatten transparency. If no candidate meets the requested target, display the best result with an explicit warning. Browser encoders may alter visual quality, format, metadata and dimensions; disclose this prominently in all three languages. Work remains on the user's device with no uploads, tracking or advertising.

Changing file immediately invalidates previous preview and download; changing target also invalidates immediately, then compresses with a short debounce to avoid repeated heavy work on mobile. Native Canvas work is not forcibly interruptible, but stale results must never appear, and there must be at most one compression running at a time. Revoke Object URLs when replaced and on pagehide.

Supported input remains JPG/PNG/WebP, up to 25 MiB and 24 MP, output up to 12 MP, target 1–20480 KB (1024 bytes/KB). Animated images become static; exact output size and perceptual quality are not guaranteed. The underlying `mode:'original'` API is retained for existing regression tests, but not shown in the UI.

## Release status

Independent product repository; preview on Cloudflare Workers at
https://image-compressor-preview.cerqueirabarreto.workers.dev/ .
Site intentionally `noindex` until a custom domain is chosen and explicitly approved.
No changes to the starter, Recorte, audio product, or orchestration workflows.
