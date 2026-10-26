# simplycompressor.com — publication checklist

The owner has purchased `simplycompressor.com`. Keep the current Worker
`image-compressor-preview` (the internal Worker name is not public). Do NOT
create another Worker or use a Cloudflare Pages site.

## Connect the hostname before merging this PR

In Cloudflare dashboard:
**Workers & Pages → image-compressor-preview → Settings → Domains & Routes → Add → Custom Domain**,
enter `simplycompressor.com`. Wait until HTTPS loads the existing tool. The
current preview remains `noindex` until the production build is explicitly enabled.

Do not attach `www.simplycompressor.com` as a second indexed copy. An optional
future redirect from www to the apex should use a Cloudflare redirect rule.

## Turn on production indexation

Once the custom domain loads, in Worker **Settings → Build**, change
**Build command** to:

```sh
npm ci --ignore-scripts --no-audit --no-fund && DEPLOY_TARGET=production npm run build && DEPLOY_TARGET=production node scripts/verify-build.mjs
```

Leave **Deploy command** as `npx wrangler deploy`; keep preview builds disabled.
Production build requires `DEPLOY_TARGET=production`; the default `npm run build`
**always generates noindex**, even when the config says `indexable:true`.

Then merge this PR into `main` to deploy via the existing GitHub connection.
The Wrangler config intentionally routes the existing Worker only to
`simplycompressor.com` and sets `workers_dev:false` to avoid a duplicate
indexable origin. This disables its former `workers.dev` production URL.
Do not merge before custom-domain readiness, or the old test URL may disappear.

## Verify live before declaring launch

- Check `https://simplycompressor.com/`, `/pt/`, `/es/`; HTTPS and compression/download.
- In view-source, confirm `<meta name="robots" content="index,follow">`, canonical,
  `hreflang` and descriptive title on all three routes.
- `/robots.txt` should allow crawlers and link to
  `https://simplycompressor.com/sitemap.xml`.
- Check the production manifest and latest source SHA; record the Cloudflare deploy version.
- Check custom domain and the absence of an accessible duplicate indexable workers.dev route.
- Register the canonical HTTPS origin in Google Search Console and submit sitemap.
  Indexation is eligible, not guaranteed.

Rollback: use Cloudflare Deployments → Rollback to restore last working version,
or re-enable `workers.dev` only temporarily if needed to troubleshoot a routing
problem. No ad or analytics integration is part of this launch.
