import { compressImageToTarget } from './image.js';

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
  en: {unsupported:'This browser cannot create a supported image format.',fail:'Could not process this image.',out:'Result',reached:'Target reached.',notReached:'Target not reached; this is the smallest result found.',noGain:'The result is not smaller than the original.',invalid:'Enter a target between 1 and 20,480 KB.'},
  pt: {unsupported:'Este navegador não consegue gerar um formato compatível.',fail:'Não foi possível processar esta imagem.',out:'Resultado',reached:'Meta atingida.',notReached:'Meta não atingida; este é o menor resultado encontrado.',noGain:'O resultado não ficou menor que o original.',invalid:'Informe um tamanho entre 1 e 20.480 KB.'},
  es: {unsupported:'Este navegador no puede generar un formato compatible.',fail:'No se pudo procesar esta imagen.',out:'Resultado',reached:'Objetivo alcanzado.',notReached:'Objetivo no alcanzado; este es el resultado más pequeño encontrado.',noGain:'El resultado no es menor que el original.',invalid:'Introduce un tamaño entre 1 y 20.480 KB.'}
}[lang] || {};
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
  try {
    // Only one native canvas compression at a time. New input invalidates
    // stale output immediately, and queues the latest request.
    const result = await compressImageToTarget(file, targetKB * 1024, {signal:mine.signal});
    if (id !== generation || mine.signal.aborted) return;
    const extension = {'image/jpeg':'jpg','image/webp':'webp','image/png':'png'}[result.blob.type];
    if (!extension) throw new Error('Unsupported output format: ' + result.blob.type);
    const url = URL.createObjectURL(result.blob);
    if (id !== generation || mine.signal.aborted) {URL.revokeObjectURL(url);return;}
    currentURL = url;
    preview.src = url;
    previewPanel.hidden = false;
    download.href = url;
    download.download = 'compressed-image.' + extension;
    download.hidden = false;
    const format = n => (n / 1024).toLocaleString(lang, {minimumFractionDigits:1, maximumFractionDigits:1}) + ' KB';
    output.textContent = `${messages.out}: ${format(file.size)} → ${format(result.blob.size)} · ${extension.toUpperCase()} · ${result.width} × ${result.height} · ${result.reachedTarget ? messages.reached : messages.notReached}${result.blob.size >= file.size ? ' · ' + messages.noGain : ''}`;
    status.textContent = '';
  } catch (error) {
    if (id === generation && error?.name !== 'AbortError')
      status.textContent = error.message?.startsWith('Unsupported output format:') ? messages.unsupported : messages.fail;
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
