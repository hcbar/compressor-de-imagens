import { compressImageToTarget } from './image.js';
const form = document.querySelector('#tool-form');
const fileInput = document.querySelector('#file');
const formatInput = document.querySelector('#format');
const targetInput = document.querySelector('#target');
const output = document.querySelector('#result');
const status = document.querySelector('#status');
const download = document.querySelector('#download');
const btn = form.querySelector('button[type=submit]');
let currentURL = null;
let generation = 0;
let controller = null;
let busy = false;
const lang = document.documentElement.lang.split('-')[0];
const messages = {
  en: {unsupported:'This browser cannot encode this format. Try the other mode.',need:'Choose an image first.',fail:'Could not process that file.',out:'Result',reached:'Target reached.',notReached:'Target not reached; this is the smallest output found.',noGain:'No size reduction: the result is as large as or larger than the original.'},
  pt: {unsupported:'Este navegador não consegue gerar este formato. Tente o outro modo.',need:'Escolha uma imagem primeiro.',fail:'Não foi possível processar o arquivo.',out:'Resultado',reached:'Meta atingida.',notReached:'Meta não atingida; este é o menor resultado encontrado.',noGain:'Sem redução de tamanho: o resultado é igual ou maior que o original.'},
  es: {unsupported:'Este navegador no puede generar este formato. Prueba el otro modo.',need:'Primero elige una imagen.',fail:'No se pudo procesar el archivo.',out:'Resultado',reached:'Objetivo alcanzado.',notReached:'Objetivo no alcanzado; este es el resultado más pequeño.',noGain:'Sin reducción de tamaño: el resultado es igual o mayor que el original.'}
}[lang];
function release() {
  if (currentURL) URL.revokeObjectURL(currentURL);
  currentURL = null;
  download.hidden = true;
  download.removeAttribute('href');
}
function invalidate() {
  generation++;
  controller?.abort();
  release();
  status.textContent = '';
  output.textContent = '';
}
fileInput.addEventListener('change', invalidate);
targetInput.addEventListener('input', invalidate);
formatInput.addEventListener('change', invalidate);
window.addEventListener('pagehide', invalidate);
form.addEventListener('submit', async e => {
  e.preventDefault();
  if (busy) return; // Native canvas/decode work already running cannot be preempted.
  invalidate();
  const myGeneration = generation;
  const f = fileInput.files?.[0];
  if (!f) { status.textContent = messages.need; return; }
  const targetKB = Number(targetInput.value);
  if (!Number.isFinite(targetKB) || targetKB < 1 || targetKB > 20480) {status.textContent = messages.fail;return;}
  controller = new AbortController();
  busy = true;
  btn.disabled = true;
  status.textContent = form.dataset.working;
  try {
    const result = await compressImageToTarget(f, targetKB * 1024, {signal:controller.signal, mode:formatInput.value});
    if (myGeneration !== generation || controller.signal.aborted) return;
    currentURL = URL.createObjectURL(result.blob);
    download.href = currentURL;
    const extension = { 'image/jpeg':'jpg', 'image/webp':'webp', 'image/png':'png' }[result.blob.type];
    download.download = 'compressed-image.' + extension;
    download.hidden = false;
    const format = n => (n / 1024).toLocaleString(lang, {minimumFractionDigits:1, maximumFractionDigits:1}) + ' KB';
    output.textContent = `${messages.out}: ${format(f.size)} → ${format(result.blob.size)} · ${extension.toUpperCase()} · ${result.width} × ${result.height} · ${result.reachedTarget ? messages.reached : messages.notReached}${result.blob.size >= f.size ? ' · ' + messages.noGain : ''}`;
    status.textContent = '';
  } catch (error) {
    if (myGeneration === generation && error?.name !== 'AbortError') status.textContent = error.message?.startsWith('Unsupported output format:') ? messages.unsupported : messages.fail;
  } finally {
    busy = false;
    btn.disabled = false;
    if (myGeneration === generation) controller = null;
  }
});
