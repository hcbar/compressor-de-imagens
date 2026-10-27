import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, statSync } from 'node:fs';

test('PDF pages are localized, isolated and noindex in preview', () => {
  for (const route of ['pdf', 'pt/pdf', 'es/pdf']) {
    const html = readFileSync('dist/' + route + '/index.html', 'utf8');
    assert.match(html, /id="pdf-form"/);
    assert.match(html, /id="pdf-mode"/);
    assert.match(html, /assets\/pdf.js/);
    assert.match(html, /noindex,nofollow/);
    assert.doesNotMatch(html, /<script(?![^>]*src=)[^>]*>/);
  }
  const image = readFileSync('dist/index.html', 'utf8');
  assert.match(image, /id="tool-form"/);
});

test('pinned PDF worker runtime is self-hosted and loaded only by PDF route', () => {
  const files = ['index.js', 'browserRunner.js', 'bytes.js', 'worker.js', 'qpdf.js', 'qpdf.wasm'];
  for (const file of files) {
    const p = 'dist/assets/qpdf/' + file;
    assert.ok(existsSync(p), p);
    assert.ok(statSync(p).size > 0);
    assert.ok(statSync(p).size < 25 * 1024 * 1024);
  }
  const image = readFileSync('dist/index.html', 'utf8');
  assert.doesNotMatch(image, /assets\/pdf.js|assets\/qpdf/);
  const js = readFileSync('dist/assets/pdf.js', 'utf8');
  assert.match(js, /--optimize-images/);
  assert.match(js, /--check/);
  assert.match(js, /optimized.byteLength < input.byteLength/);
  assert.doesNotMatch(js, /fetch\s*\(/);
});
