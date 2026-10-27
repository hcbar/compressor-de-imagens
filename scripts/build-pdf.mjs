import { mkdirSync, writeFileSync, copyFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const escapeHtml = s => String(s).replaceAll('&', '&amp;').replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;');

const copyEngine = (dist) => {
  const source = 'node_modules/qpdf-run';
  const target = join(dist, 'assets/qpdf');
  mkdirSync(target, { recursive: true });
  for (const file of ['index.js', 'browserRunner.js', 'bytes.js', 'worker.js'])
    copyFileSync(join(source, 'src', file), join(target, file));
  for (const file of ['qpdf.js', 'qpdf.wasm']) {
    const from = join(source, 'vendor/qpdf/lib', file);
    if (statSync(from).size >= 25 * 1024 * 1024) throw new Error('PDF engine exceeds Cloudflare static asset limit');
    copyFileSync(from, join(target, file));
  }
  copyFileSync('src/pdf.js', join(dist, 'assets/pdf.js'));
  copyFileSync('src/pdf.css', join(dist, 'assets/pdf.css'));
};

const copy = {
  en: {
    title: 'Compress PDF Online for Free — Keep Text Selectable',
    description: 'Compress PDF files in your browser with no upload. Optimize PDF structure or try smaller images, while keeping text selectable.',
    hero: 'Compress PDF',
    lead: 'Make a PDF smaller, right in your browser. No file uploads.',
    upload: 'Choose PDF', mode: 'Compression',
    preserve: 'Preserve quality (lossless structure optimization)',
    smaller: 'Smaller file (may reduce image quality)',
    run: 'Compress PDF', cancel: 'Cancel', download: 'Download PDF',
    imageLink: 'Compress images', pdfLink: 'Compress PDF',
    warning: 'Text and vector pages remain selectable. Image-heavy or already optimized PDFs may not shrink. Compression can invalidate digital signatures and certain PDF certifications; do not use this tool for signed documents. Keep your original.',
    note: 'PDF up to 20 MiB. Processing happens on your device. No uploads, accounts, tracking or ads.'
  },
  pt: {
    title: 'Comprimir PDF Grátis Online — Preservar Texto Selecionável',
    description: 'Comprima PDF no seu navegador, sem upload. Otimize a estrutura ou reduza imagens, mantendo texto selecionável.',
    hero: 'Comprimir PDF',
    lead: 'Reduza o tamanho do PDF direto no navegador. Sem enviar o arquivo.',
    upload: 'Escolher PDF', mode: 'Compressão',
    preserve: 'Preservar qualidade (otimização estrutural sem perdas)',
    smaller: 'Arquivo menor (pode reduzir a qualidade das imagens)',
    run: 'Comprimir PDF', cancel: 'Cancelar', download: 'Baixar PDF',
    imageLink: 'Comprimir imagens', pdfLink: 'Comprimir PDF',
    warning: 'Texto e conteúdo vetorial continuam selecionáveis. PDFs já otimizados ou com muitas imagens podem não diminuir. A compressão pode invalidar assinaturas digitais e certificações; não use documentos assinados. Guarde o original.',
    note: 'PDF de até 20 MiB. Processamento no seu dispositivo. Sem upload, conta, rastreamento ou anúncios.'
  },
  es: {
    title: 'Comprimir PDF Gratis Online — Conservar Texto Seleccionable',
    description: 'Comprime PDF en tu navegador sin subir archivos. Optimiza la estructura o las imágenes conservando texto seleccionable.',
    hero: 'Comprimir PDF',
    lead: 'Reduce el tamaño de un PDF en tu navegador. Sin subir archivos.',
    upload: 'Seleccionar PDF', mode: 'Compresión',
    preserve: 'Conservar calidad (optimización estructural sin pérdida)',
    smaller: 'Archivo más pequeño (puede reducir la calidad de las imágenes)',
    run: 'Comprimir PDF', cancel: 'Cancelar', download: 'Descargar PDF',
    imageLink: 'Comprimir imágenes', pdfLink: 'Comprimir PDF',
    warning: 'El texto y los vectores siguen siendo seleccionables. Los PDF ya optimizados o con muchas imágenes pueden no reducirse. La compresión puede invalidar firmas y certificaciones; no uses documentos firmados. Conserva el original.',
    note: 'PDF de hasta 20 MiB. Procesamiento en tu dispositivo. Sin subidas, cuentas, seguimiento ni anuncios.'
  }
};

export function buildPdfPages({ dist, product, publicIndexable }) {
  copyEngine(dist);
  const origin = product.siteUrl ? product.siteUrl.replace(/\/$/, '') : '';
  const pdfRoute = lang => lang === 'en' ? '/pdf/' : '/' + lang + '/pdf/';
  const imageRoute = lang => lang === 'en' ? '/' : '/' + lang + '/';
  const urls = [];
  for (const lang of product.locales) {
    const c = copy[lang];
    const route = pdfRoute(lang);
    const dir = join(dist, lang === 'en' ? 'pdf' : lang + '/pdf');
    mkdirSync(dir, { recursive: true });
    const alternates = publicIndexable ? product.locales.map(l =>
      '<link rel="alternate" hreflang="' + (l === 'pt' ? 'pt-BR' : l) +
      '" href="' + escapeHtml(origin + pdfRoute(l)) + '">').join('') +
      '<link rel="alternate" hreflang="x-default" href="' + escapeHtml(origin + pdfRoute('en')) + '">' : '';
    const robots = publicIndexable ? 'index,follow' : 'noindex,nofollow';
    const canonical = publicIndexable ? '<link rel="canonical" href="' + escapeHtml(origin + route) + '">' : '';
    const html = '<!doctype html><html lang="' + (lang === 'pt' ? 'pt-BR' : lang) +
      '"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">' +
      '<meta name="robots" content="' + robots + '"><title>' + escapeHtml(c.title) + '</title>' +
      '<meta name="description" content="' + escapeHtml(c.description) + '">' + canonical + alternates +
      '<link rel="stylesheet" href="/assets/style.css"><link rel="stylesheet" href="/assets/pdf.css">' +
      '<script type="module" src="/assets/pdf.js"></script></head><body class="pdf-page">' +
      '<header><nav aria-label="Languages"><a class="brand" href="/">Simply Compressor</a><span>' +
      '<a href="/pdf/">EN</a> <a href="/pt/pdf/">PT</a> <a href="/es/pdf/">ES</a></span></nav></header>' +
      '<main><nav class="pdf-nav" aria-label="Tools"><a href="' + imageRoute(lang) + '">' +
      escapeHtml(c.imageLink) + '</a><a href="' + route + '" aria-current="page">' +
      escapeHtml(c.pdfLink) + '</a></nav><h1>' + escapeHtml(c.hero) + '</h1>' +
      '<p class="lead">' + escapeHtml(c.lead) + '</p><section class="panel">' +
      '<form id="pdf-form"><div class="field"><label for="pdf-file">' + escapeHtml(c.upload) +
      '</label><input id="pdf-file" type="file" accept="application/pdf,.pdf" required></div>' +
      '<div class="field"><label for="pdf-mode">' + escapeHtml(c.mode) + '</label>' +
      '<select id="pdf-mode"><option value="preserve">' + escapeHtml(c.preserve) +
      '</option><option value="smaller">' + escapeHtml(c.smaller) + '</option></select></div>' +
      '<p class="pdf-warning">' + escapeHtml(c.warning) + '</p>' +
      '<div class="pdf-actions"><button type="submit" id="pdf-start">' + escapeHtml(c.run) +
      '</button><button type="button" id="pdf-cancel" hidden>' + escapeHtml(c.cancel) + '</button></div>' +
      '<p id="pdf-status" role="status" aria-live="polite"></p><p id="pdf-result" aria-live="polite"></p>' +
      '<a id="pdf-download" class="download" hidden>' + escapeHtml(c.download) + '</a></form></section>' +
      '<p class="note">' + escapeHtml(c.note) + '</p></main><footer><span>Simply Compressor</span></footer>' +
      '</body></html>';
    writeFileSync(join(dir, 'index.html'), html);
    urls.push(route);
  }
  return urls;
}
