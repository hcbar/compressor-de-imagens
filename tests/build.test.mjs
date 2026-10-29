import {verifyFavicon} from '../scripts/check-favicon.mjs';
import test from 'node:test';import assert from 'node:assert/strict';import {existsSync,readFileSync} from 'node:fs';
test('pages are prerendered in three languages',()=>{for(const s of ['dist/index.html','dist/pt/index.html','dist/es/index.html'])assert.ok(existsSync(s),s)});
test('default preview is not indexable',()=>{if((process.env.DEPLOY_TARGET||'preview')==='preview'){assert.match(readFileSync('dist/index.html','utf8'),/noindex,nofollow/);assert.match(readFileSync('dist/robots.txt','utf8'),/Disallow: \/(?:\n|$)/)}});
test('safety headers and SEO are server-rendered',()=>{const h=readFileSync('dist/_headers','utf8');assert.match(h,/Content-Security-Policy:/);assert.match(h,/frame-ancestors 'none'/);const doc=readFileSync('dist/index.html','utf8');assert.match(doc,/<meta name="description"/);assert.doesNotMatch(doc,/<script(?![^>]*src=)[^>]*>/)});

test('favicon is shipped at root and linked by all locales',()=>{const svg=readFileSync('dist/favicon.svg','utf8');const ico=readFileSync('dist/favicon.ico');assert.match(svg,/<svg/);assert.equal(verifyFavicon('dist/favicon.ico'),true);for(const s of ['dist/index.html','dist/pt/index.html','dist/es/index.html']){const html=readFileSync(s,'utf8');assert.match(html,/href="\/favicon\.svg"/);assert.match(html,/href="\/favicon\.ico"/)}});
