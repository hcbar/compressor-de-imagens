# Image Compressor / Compressor de Imagens

A two-input, automatic, browser-only image compressor. Choose an image, set the target KB, preview the result, and download. No upload, account or format selector.

Global default: English on `/`; Portuguese on `/pt/`, Spanish on `/es/`.

Run locally on Node >=22.13:

```sh
npm ci --ignore-scripts --no-audit --no-fund
npm run dev
```

CI runs `npm run verify`, Chromium browser smoke in three languages and uploads the tested build. `wrangler.jsonc` configures the Cloudflare Workers preview deployment. Preview is publicly accessible but marked `noindex`; no tracking or advertising. See `PRODUCT.md` for limits and `DEPLOY-PREVIEW.md` for deployment instructions.
