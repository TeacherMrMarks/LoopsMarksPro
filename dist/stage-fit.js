// V36: apenas apresentação responsiva do Modo Palco.
// Nenhuma leitura/gravação de dados, áudio, MIDI, pedal ou repertórios.
let observed = null;
let resizeObserver = null;
let mutationObserver = null;
let queued = false;
let listenersInstalled = false;

export function fitStageLayout(stage = observed) {
  if (!stage || !stage.isConnected) return;
  const panel = stage.querySelector('.live-sections');
  if (!panel || panel.clientWidth <= 0) return;

  const usableWidth = Math.max(0, panel.clientWidth - 14);
  // Mínimo de ~70 px por coluna no retrato; seis colunas no modo paisagem.
  const columns = Math.max(2, Math.min(6, Math.floor((usableWidth + 5) / 73)));
  const visiblePads = [...panel.querySelectorAll('button.pad')].filter(el => !el.hidden &&
    !el.closest('[hidden]'));
  const extraControls = [...panel.querySelectorAll('.live-map-toolbar, #auto-crash-toggle')]
    .filter(el => !el.hidden && !el.closest('[hidden]'));
  const rows = Math.max(1, Math.ceil((visiblePads.length + extraControls.length) / columns));
  const room = Math.max(0, panel.clientHeight - 20);
  const fittedHeight = Math.floor((room - (rows - 1) * 5) / rows);
  // Nunca reduzir abaixo da área recomendada para toque (44 px).
  const padHeight = Math.max(48, Math.min(64, fittedHeight));
  stage.style.setProperty('--v36-columns', String(columns));
  stage.style.setProperty('--v36-pad-height', padHeight + 'px');
  stage.dataset.v36Overflow = fittedHeight < 48 ? 'true' : 'false';
}

export function scheduleStageFit() {
  if (queued || !observed) return;
  queued = true;
  requestAnimationFrame(() => { queued = false; fitStageLayout(); });
}

export function mountStageFit(stage) {
  resizeObserver?.disconnect();
  mutationObserver?.disconnect();
  observed = stage || null;
  if (!observed) return;
  const panel = observed.querySelector('.live-sections');
  if (panel && typeof ResizeObserver !== 'undefined') {
    resizeObserver = new ResizeObserver(scheduleStageFit);
    resizeObserver.observe(panel);
  }
  if (panel && typeof MutationObserver !== 'undefined') {
    mutationObserver = new MutationObserver(scheduleStageFit);
    mutationObserver.observe(panel, {subtree:true,attributes:true,attributeFilter:['hidden']});
  }
  if (!listenersInstalled) {
    listenersInstalled = true;
    window.addEventListener('resize', scheduleStageFit, {passive:true});
    window.addEventListener('orientationchange', scheduleStageFit, {passive:true});
    window.visualViewport?.addEventListener('resize', scheduleStageFit, {passive:true});
  }
  scheduleStageFit();
}
