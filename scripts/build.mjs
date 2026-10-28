import {rmSync,mkdirSync,writeFileSync,copyFileSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {readConfig,checkConfig} from './check.mjs';
const p=readConfig();checkConfig(p);
const target=process.env.DEPLOY_TARGET||'preview';if(!['preview','production'].includes(target))throw new Error('DEPLOY_TARGET must be preview or production');
const publicIndexable=target==='production'&&p.indexable&&Boolean(p.siteUrl);
const dist=resolve('dist');rmSync(dist,{recursive:true,force:true});mkdirSync(join(dist,'assets'),{recursive:true});
for(const file of ['app.js','image.js','diagnostics.js','style.css'])copyFileSync(`src/${file}`,join(dist,'assets',file));
const esc=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;');
const urlFor=lang=>lang==='en'?'/':`/${lang}/`;
const urlBase=p.siteUrl?p.siteUrl.replace(/\/$/,''):null;
for(const lang of p.locales){
  const c=p.content[lang], route=urlFor(lang),dir=lang==='en'?dist:join(dist,lang);mkdirSync(dir,{recursive:true});
  const canonical=urlBase?`${urlBase}${route}`:'';
  const alternates=publicIndexable?p.locales.map(l=>`<link rel="alternate" hreflang="${l==='pt'?'pt-BR':l}" href="${esc(urlBase+urlFor(l))}">`).join(''):'';
  const html=`<!doctype html><html lang="${lang==='pt'?'pt-BR':lang}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="${publicIndexable?'index,follow':'noindex,nofollow'}"><title>${esc(c.title)} · ${esc(c.brand || p.brand)}</title><meta name="description" content="${esc(c.description)}">${publicIndexable?`<link rel="canonical" href="${esc(canonical)}">${alternates}<link rel="alternate" hreflang="x-default" href="${esc(urlBase+'/')}">`:''}<link rel="stylesheet" href="/assets/style.css"><script type="module" src="/assets/app.js"></script></head><body><header><nav aria-label="${lang==='pt'?'Idiomas':lang==='es'?'Idiomas':'Languages'}"><span class="brand">${esc(c.brand || p.brand)}</span><span><a href="/" lang="en">EN</a><a href="/pt/" lang="pt-BR">PT</a><a href="/es/" lang="es">ES</a></span></nav></header><main><h1>${esc(c.hero)}</h1><p class="lead">${esc(c.lead)}</p><section class="panel"><form id="tool-form" data-working="${esc(c.status)}"><div class="field"><label for="file">${esc(c.upload)}</label><input id="file" aria-describedby="limits local-privacy" type="file" accept="image/jpeg,image/png,image/webp" required><div id="local-privacy"><strong>${esc(c.privacy)}</strong><p>${esc(c.privacyDetail)}</p><details><summary>${esc(c.privacyHow)}</summary><p>${esc(c.privacyExplanation)}</p></details></div></div><div class="field"><label for="target">${esc(c.target)}</label><input id="target" type="number" min="1" max="20480" value="100" required></div><p class="warning">${esc(c.warning)}</p><p id="status" role="status" aria-live="polite"></p><section id="diagnostic-panel" data-copied="${esc(c.diagnosticCopied)}" data-fallback="${esc(c.diagnosticCopyFallback)}" hidden><div class="diagnostic-actions"><code id="error-code"></code><button id="copy-diagnostic" type="button">${esc(c.copyDiagnostic)}</button></div><details id="diagnostic-details"><summary>${esc(c.viewDiagnostic)}</summary><textarea id="diagnostic-report" readonly aria-label="${esc(c.viewDiagnostic)}" spellcheck="false"></textarea></details><p id="copy-status" role="status"></p></section><section id="preview-panel" aria-label="${esc(c.previewLabel)}" hidden><h2 class="preview-heading">${esc(c.previewLabel)}</h2><img id="preview" class="preview-image" alt="${esc(c.previewLabel)}"><p id="result" aria-live="polite"></p><a id="download" class="download" hidden>${esc(c.download)}</a></section></form></section><p id="limits" class="note">${esc(c.note)}</p></main><footer><span>${esc(c.brand || p.brand)} · ${target==='preview'?'Preview':'Production'}</span></footer></body></html>`;
  writeFileSync(join(dir,'index.html'),html);
}
// Cloudflare Static Assets _headers format. Security defaults do not permit external scripts or connections.
writeFileSync(join(dist,'_headers'),`/*\n  X-Content-Type-Options: nosniff\n  Referrer-Policy: no-referrer\n  Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=()\n  X-Frame-Options: DENY\n  Content-Security-Policy: default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self' blob: data:; connect-src 'self'; font-src 'self'; object-src 'none'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'\n`);
writeFileSync(join(dist,'robots.txt'),publicIndexable?'User-agent: *\nAllow: /\nSitemap: '+urlBase+'/sitemap.xml\n':'User-agent: *\nDisallow: /\n');
if(publicIndexable)writeFileSync(join(dist,'sitemap.xml'),'<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'+p.locales.map(l=>`<url><loc>${esc(urlBase+urlFor(l))}</loc></url>`).join('')+'</urlset>');
for(const kind of ['preview','production']){
  const data={name:p.slug+(kind==='preview'?'-preview':''),compatibility_date:'2026-10-24',workers_dev:true,preview_urls:false,assets:{directory:'./dist',html_handling:'force-trailing-slash'},observability:{enabled:false}};
  if(p.profile==='backend')Object.assign(data,{main:'./worker/api.mjs',no_bundle:true,assets:{...data.assets,binding:'ASSETS',run_worker_first:['/api/*']}});
  writeFileSync(resolve(`wrangler.${kind}.jsonc`),JSON.stringify(data,null,2)+'\n');
}
console.log(`Built ${p.brand} for ${target}; profile=${p.profile}; indexable=${publicIndexable}`);
