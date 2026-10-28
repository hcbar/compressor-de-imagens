import { compressImageToTarget } from './image.js';
import { createDiagnostic } from './diagnostics.js';

const form = document.querySelector('#tool-form');
const fileInput = document.querySelector('#file');
const targetInput = document.querySelector('#target');
const output = document.querySelector('#result');
const status = document.querySelector('#status');
const download = document.querySelector('#download');
const preview = document.querySelector('#preview');
const previewPanel = document.querySelector('#preview-panel');
const lang = document.documentElement.lang.split('-')[0];
const messages = {
  en: {unsupported:'This browser cannot create a supported image format.',fail:'Could not process this image.',out:'Result',reached:'Target reached.',notReached:'Target not reached; this is the smallest result found.',noGain:'The result is not smaller than the original.',alreadySmall:'Already below the requested size.',cannot:'This size could not be achieved with this image.',invalid:'Enter a target between 1 and 20,480 KB.'},
  pt: {unsupported:'Este navegador não consegue gerar um formato compatível.',fail:'Não foi possível processar esta imagem.',out:'Resultado',reached:'Meta atingida.',notReached:'Meta não atingida; este é o menor resultado encontrado.',noGain:'O resultado não ficou menor que o original.',alreadySmall:'A imagem já está abaixo do tamanho solicitado.',cannot:'Não foi possível chegar a esse tamanho com esta imagem.',invalid:'Informe um tamanho entre 1 e 20.480 KB.'},
  es: {unsupported:'Este navegador no puede generar un formato compatible.',fail:'No se pudo procesar esta imagen.',out:'Resultado',reached:'Objetivo alcanzado.',notReached:'Objetivo no alcanzado; este es el resultado más pequeño encontrado.',noGain:'El resultado no es menor que el original.',alreadySmall:'La imagen ya es menor que el tamaño solicitado.',cannot:'No se pudo alcanzar este tamaño con esta imagen.',invalid:'Introduce un tamaño entre 1 y 20.480 KB.'}
}[lang] || {};
const diagnosticPanel = document.querySelector('#diagnostic-panel');
const diagnosticReport = document.querySelector('#diagnostic-report');
const diagnosticDetails = document.querySelector('#diagnostic-details');
const copyStatus = document.querySelector('#copy-status');
function showDiagnostic(error, stage) {
  const report = createDiagnostic(error, stage);
  document.querySelector('#error-code').textContent = report.code;
  diagnosticReport.value = JSON.stringify(report, null, 2);
  diagnosticDetails.open = false;
  copyStatus.textContent = '';
  diagnosticPanel.hidden = false;
}
function clearDiagnostic() {
  diagnosticPanel.hidden = true;
  diagnosticReport.value = '';
  diagnosticDetails.open = false;
  copyStatus.textContent = '';
}
document.querySelector('#copy-diagnostic').onclick = async () => {
  const report = diagnosticReport.value;
  if (!report) return;
  try {
    await navigator.clipboard.writeText(report);
    copyStatus.textContent = diagnosticPanel.dataset.copied;
  } catch {
    diagnosticDetails.open = true;
    diagnosticReport.focus(); diagnosticReport.select();
    copyStatus.textContent = diagnosticPanel.dataset.fallback;
  }
};
let generation = 0;
let currentURL = null;
let controller = null;
let busy = false;
let queuedGeneration = null;
let debounce = null;

function release() {
  preview.removeAttribute('src');
  previewPanel.hidden = true;
  if (currentURL) URL.revokeObjectURL(currentURL);
  currentURL = null;
  download.hidden = true;
  download.removeAttribute('href');
}
function invalidate() {
  clearDiagnostic();
  generation++;
  clearTimeout(debounce);
  controller?.abort();
  release();
  output.textContent = '';
  status.textContent = '';
}
function validTarget() {
  const v = targetInput.value.trim();
  const n = Number(v);
  return v !== '' && Number.isFinite(n) && n >= 1 && n <= 20480 ? n : null;
}
function schedule(delay) {
  invalidate();
  const file = fileInput.files?.[0];
  if (!file) return;
  const target = validTarget();
  if (target === null) {
    if (targetInput.value.trim() !== '') status.textContent = messages.invalid;
    return;
  }
  status.textContent = form.dataset.working;
  const thisGeneration = generation;
  debounce = setTimeout(() => run(thisGeneration), delay);
}
async function run(id) {
  if (id !== generation) return;
  if (busy) {
    queuedGeneration = id;
    return;
  }
  const file = fileInput.files?.[0];
  const targetKB = validTarget();
  if (!file || targetKB === null) return;
  const mine = new AbortController();
  controller = mine;
  busy = true;
  let stage = 'conversion';
  try {
    // Only one native canvas compression at a time. New input invalidates
    // stale output immediately, and queues the latest request.
    const result = await compressImageToTarget(file, targetKB * 1024, {signal:mine.signal});
    if (id !== generation || mine.signal.aborted) return;
    const extension = {'image/jpeg':'jpg','image/webp':'webp','image/png':'png'}[result.blob.type];
    if (!extension) throw Object.assign(new Error('Unsupported output'), {code:'UNSUPPORTED_OUTPUT'});
    stage = 'export';
    const url = URL.createObjectURL(result.blob);
    if (id !== generation || mine.signal.aborted) {URL.revokeObjectURL(url);return;}
    currentURL = url;
    stage = 'rendering';
    preview.onerror = () => {
      if (id !== generation) return;
      release(); status.textContent = messages.fail;
      showDiagnostic({code:'PREVIEW_FAILED'}, 'rendering');
    };
    preview.src = url;
    previewPanel.hidden = false;
    download.href = url;
    download.download = 'compressed-image.' + extension;
    download.hidden = false;
    const format = n => (n / 1024).toLocaleString(lang, {minimumFractionDigits:1, maximumFractionDigits:1}) + ' KB';
    output.textContent = `${format(file.size)} → ${format(result.blob.size)}${result.unchanged ? ' · ' + messages.alreadySmall : ''}`;
    status.textContent = '';
  } catch (error) {
    if (id === generation && error?.name !== 'AbortError') {
      const report = createDiagnostic(error, stage);
      status.textContent = report.code === 'IC_TARGET_UNREACHABLE' ? messages.cannot :
        ['IC_OUTPUT_FORMAT','IC_NO_OUTPUT','IC_CANVAS_UNAVAILABLE'].includes(report.code) ? messages.unsupported : messages.fail;
      showDiagnostic(error, stage);
    }
  } finally {
    if (controller === mine) controller = null;
    busy = false;
    if (queuedGeneration === generation) {
      queuedGeneration = null;
      void run(generation);
    } else {
      queuedGeneration = null;
    }
  }
}

fileInput.addEventListener('change', () => schedule(0));
targetInput.addEventListener('input', () => schedule(450));
window.addEventListener('pagehide', () => {invalidate();queuedGeneration=null;});
form.addEventListener('submit', e => e.preventDefault());
