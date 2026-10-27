import { createQpdfRunner } from '/assets/qpdf/index.js';

const LIMIT = 20 * 1024 * 1024;
const form = document.querySelector('#pdf-form');
const fileInput = document.querySelector('#pdf-file');
const modeInput = document.querySelector('#pdf-mode');
const startButton = document.querySelector('#pdf-start');
const cancelButton = document.querySelector('#pdf-cancel');
const status = document.querySelector('#pdf-status');
const result = document.querySelector('#pdf-result');
const download = document.querySelector('#pdf-download');
const lang = document.documentElement.lang.slice(0, 2);
const messages = {
  en: {
    choose: 'Choose a PDF first.', invalid: 'Choose a valid PDF of up to 20 MiB.',
    signed: 'A digital signature was detected. Compressing would invalidate it; use the original PDF.',
    working: 'Optimizing locally in your browser…',
    noGain: 'This PDF is already as small as we can safely make it. Download the unchanged original.',
    saved: 'Smaller PDF ready.', failed: 'Could not safely optimize this PDF. Try another document.',
    cancel: 'Processing cancelled.', output: 'PDF size:', percent: 'smaller',
  },
  pt: {
    choose: 'Escolha um PDF primeiro.', invalid: 'Escolha um PDF válido de até 20 MiB.',
    signed: 'Foi detectada uma assinatura digital. A compressão a invalidaria; utilize o PDF original.',
    working: 'Otimizando localmente no navegador…',
    noGain: 'Este PDF já está tão pequeno quanto conseguimos com segurança. Baixe o original inalterado.',
    saved: 'PDF menor pronto.', failed: 'Não foi possível otimizar este PDF com segurança. Tente outro documento.',
    cancel: 'Processamento cancelado.', output: 'Tamanho do PDF:', percent: 'menor',
  },
  es: {
    choose: 'Selecciona primero un PDF.', invalid: 'Selecciona un PDF válido de hasta 20 MiB.',
    signed: 'Se detectó una firma digital. La compresión la invalidaría; utiliza el PDF original.',
    working: 'Optimizando localmente en el navegador…',
    noGain: 'Este PDF ya es tan pequeño como podemos dejarlo con seguridad. Descarga el original sin cambios.',
    saved: 'PDF reducido listo.', failed: 'No se pudo optimizar este PDF de forma segura. Prueba con otro documento.',
    cancel: 'Procesamiento cancelado.', output: 'Tamaño del PDF:', percent: 'más pequeño',
  }
}[lang] || null;
const msg = messages || {
  choose: 'Choose a PDF first.', invalid: 'Invalid PDF.', signed: 'Signed PDF.',
  working: 'Working…', noGain: 'No reduction.', saved: 'Ready.', failed: 'Could not optimize.',
  cancel: 'Cancelled.', output: 'PDF size:', percent: 'smaller'
};
let generation = 0;
let running = false;
let activeRunner = null;
let outputURL = null;

function clearOutput() {
  if (outputURL) URL.revokeObjectURL(outputURL);
  outputURL = null;
  result.textContent = '';
  download.hidden = true;
  download.removeAttribute('href');
}
function invalidate() {
  generation += 1;
  clearOutput();
  if (activeRunner) {
    const runner = activeRunner;
    activeRunner = null;
    void runner.destroy();
  }
  startButton.disabled = running;
  cancelButton.hidden = true;
}
function getSize(value) {
  return (value / 1024).toLocaleString(lang, { maximumFractionDigits: 1 }) + ' KB';
}
function hasPdfHeader(bytes) {
  // A PDF header may legally be preceded by a short binary prefix.
  return new TextDecoder('latin1').decode(bytes.slice(0, 1024)).includes('%PDF-');
}
function likelySigned(bytes) {
  // A conservative, non-exhaustive check. The warning below applies to all PDFs.
  const sample = new TextDecoder('latin1').decode(bytes);
  return /\/ByteRange\s*\[\s*\d+\s+\d+\s+\d+\s+\d+\s*\]/.test(sample);
}
function showError(text) {
  status.textContent = text;
  status.dataset.state = 'error';
}
function showSuccess(text) {
  status.textContent = text;
  status.dataset.state = 'success';
}

fileInput.addEventListener('change', () => { invalidate(); status.textContent = ''; });
modeInput.addEventListener('change', () => { invalidate(); status.textContent = ''; });
cancelButton.addEventListener('click', () => {
  invalidate();
  status.textContent = msg.cancel;
});
window.addEventListener('pagehide', invalidate);

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (running) return;
  const file = fileInput.files?.[0];
  if (!file) { showError(msg.choose); return; }
  if (file.size < 16 || file.size > LIMIT) { showError(msg.invalid); return; }

  const thisGeneration = ++generation;
  clearOutput();
  running = true;
  startButton.disabled = true;
  cancelButton.hidden = false;
  status.dataset.state = '';
  status.textContent = msg.working;
  let runner = null;
  try {
    const input = new Uint8Array(await file.arrayBuffer());
    if (!hasPdfHeader(input)) throw new Error('Invalid PDF header');
    if (likelySigned(input)) { showError(msg.signed); return; }
    if (thisGeneration !== generation) return;

    runner = await createQpdfRunner({
      workerUrl: '/assets/qpdf/worker.js',
      qpdfJsUrl: '/assets/qpdf/qpdf.js',
      wasmUrl: '/assets/qpdf/qpdf.wasm',
      timeoutMs: 90000
    });
    if (thisGeneration !== generation) return;
    activeRunner = runner;

    const args = [
      '--object-streams=generate', '--stream-data=compress',
      '--recompress-flate', '--compression-level=9'
    ];
    if (modeInput.value === 'smaller') args.push('--optimize-images');
    args.push('--', 'input.pdf', 'output.pdf');

    const optimized = await runner.runOne({
      input, inputName: 'input.pdf', outputName: 'output.pdf', args
    });
    if (thisGeneration !== generation) return;
    // Never serve an invalid output, even if qpdf produced bytes.
    if (!hasPdfHeader(optimized)) throw new Error('Not a PDF');
    const checked = await runner.run({
      inputs: { 'check.pdf': optimized },
      args: ['--check', 'check.pdf'],
      outputs: []
    });
    if (checked.exitCode !== 0 || checked.warnings?.length) throw new Error('PDF validation warnings');
    if (thisGeneration !== generation) return;

    const improved = optimized.byteLength < input.byteLength;
    const blob = improved
      ? new Blob([optimized], { type: 'application/pdf' })
      : file;
    const name = file.name.toLowerCase().endsWith('.pdf') ? file.name.slice(0, -4) : file.name;
    outputURL = URL.createObjectURL(blob);
    download.href = outputURL;
    download.download = improved ? name + '-compressed.pdf' : name + '.pdf';
    download.hidden = false;
    result.textContent = msg.output + ' ' + getSize(file.size) + ' → ' + getSize(blob.size)
      + (improved ? ' (' + Math.round((1 - blob.size / file.size) * 100) + '% ' + msg.percent + ')' : '');
    showSuccess(improved ? msg.saved : msg.noGain);
  } catch {
    if (thisGeneration === generation) showError(msg.failed);
  } finally {
    if (activeRunner === runner) activeRunner = null;
    if (runner) await runner.destroy();
    running = false;
    startButton.disabled = false;
    cancelButton.hidden = true;
  }
});
