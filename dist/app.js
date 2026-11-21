import { Cloud, Repository, PARTS, PLAY_PARTS, MANUAL_PARTS, FINALES, newSong, MAX_FILE_BYTES, fillBase, fillVariantId, firstPlayablePart, liveCatalog } from './data.js';
import { suggestSlot } from './importer.js';
import { Player, bpmRange } from './audio.js';
import { exampleSongs } from './demo.js';
import { makeBackup, restoreBackup, triggerDownload } from './backup.js';

const APP_VERSION = 'V10';
// O link do músico carrega exclusivamente o Modo Live.
const musicianLink = new URL(location.href).searchParams.get('modo') === 'musico';
const versionTag = () => '<span class="version-tag" aria-label="Versão do aplicativo: ' + APP_VERSION + '" title="Versão ' + APP_VERSION + '">' + APP_VERSION + '</span>';
const app = document.querySelector('#app');
const dialog = document.querySelector('#dialog');
const toast = document.querySelector('#toast');
const cloud = new Cloud(window.LOOPS_CONFIG);
const icons = {
  wave: '<path d="M3 10v4m4-8v12m5-16v20m5-14v8m4-6v4"/>',
  grid: '<rect x="3" y="3" width="7" height="7" rx="1.3"/><rect x="14" y="3" width="7" height="7" rx="1.3"/><rect x="3" y="14" width="7" height="7" rx="1.3"/><rect x="14" y="14" width="7" height="7" rx="1.3"/>',
  current: '<path d="M2 12h4l3-6 4 12 3-6h6"/>',
  play: '<path d="m8 5 12 7-12 7z" fill="currentColor" stroke="none"/>',
  stop: '<rect x="5" y="5" width="14" height="14" rx="2" fill="currentColor" stroke="none"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  minus: '<path d="M5 12h14"/>',
  music: '<path d="M9 18V5l11-2v13m-11 2a3 3 0 1 1-3-2c1.7-.3 3 .6 3 2Zm11-2a3 3 0 1 1-3-2c1.7-.3 3 .6 3 2Z"/>',
  cloud: '<path d="M7 18H6a4 4 0 1 1 1-8 5 5 0 0 1 9-2 4 4 0 1 1 3 10h-1m-8-4 2 2 4-4"/>',
  device: '<rect x="7" y="2.5" width="10" height="19" rx="2"/><path d="M11 18.5h2"/>',
  search: '<circle cx="10" cy="10" r="5.5"/><path d="m14.5 14.5 5 5"/>',
  download: '<path d="M12 3v12m-4-4 4 4 4-4M5 16v4h14v-4"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  headphones: '<path d="M3 15v-3a9 9 0 0 1 18 0v3M3 15a2 2 0 0 1 2-2h2v6H5a2 2 0 0 1-2-2zm18 0a2 2 0 0 0-2-2h-2v6h2a2 2 0 0 0 2-2z"/>',
  volume: '<path d="M4 9v6h4l5 4V5L8 9Zm12 0a4 4 0 0 1 0 6m2-8a7 7 0 0 1 0 10"/>',
  spark: '<path d="M12 2.5 14.4 10l7.1 2-7.1 2.1L12 21.5 9.6 14 2.5 12l7.1-2Z"/>',
  a: '<path d="M5 19 12 5l7 14M8 14h8"/>',
  b: '<path d="M6 19V5h7a3.5 3.5 0 0 1 0 7H6m7 0h.8a3.5 3.5 0 0 1 0 7H6"/>',
  layers: '<path d="m12 3 9 5-9 5-9-5Zm-9 9 9 5 9-5m-18 4 9 5 9-5"/>',
  flag: '<path d="M5 21V4h13l-2.5 4.2L18 12H5"/>',
  user: '<circle cx="12" cy="8" r="3.3"/><path d="M5 21v-2a7 7 0 0 1 14 0v2"/>',
  exit: '<path d="M11 4H4v16h7m-1-8h10m-4-4 4 4-4 4"/>',
  trash: '<path d="M4 6h16M9 6V3h6v3m3 0-1 15H7L6 6m4 4v7m4-7v7"/>',
  refresh: '<path d="M20 10a8 8 0 1 0-.8 6M20 4v6h-6"/>',
  settings: '<path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z"/><path d="m19.2 15.1.1-.2 1.8-1.4-1.8-3.1-2.1.7a7 7 0 0 0-1.4-.9l-.4-2.2h-3.6l-.5 2.2a7 7 0 0 0-1.4.9l-2.1-.7-1.8 3.1 1.8 1.4a7 7 0 0 0 0 1.7l-1.8 1.4 1.8 3.1 2.1-.7a7 7 0 0 0 1.4.9l.5 2.2h3.6l.4-2.2a7 7 0 0 0 1.4-.9l2.1.7 1.8-3.1-1.8-1.4a7 7 0 0 0 0-1.7" transform="translate(0 -2.5) scale(.9)"/>',
  list: '<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>',
  x: '<path d="M5 5l14 14M19 5 5 19"/>',
  share: '<path d="M12 16V3m-5 5 5-5 5 5M5 14v6h14v-6"/>',
  link: '<path d="m10 14 4-4m-5 6-2 2a4 4 0 0 1-6-6l4-4a4 4 0 0 1 6 0m2 0 2-2a4 4 0 0 1 6 6l-4 4a4 4 0 0 1-6 0" transform="translate(1 0) scale(.95 1)"/>',
};
const icon = key => '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
  (icons[key] || icons.wave) + '</svg>';
const escape = text => String(text ?? '').replace(/[&<>"']/g, key =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[key]);
const get = name => app.querySelector(name);
const label = key => PARTS.find(item => item.id === fillBase(key))?.label || state.admin?.customFills?.find(item => item.id === fillBase(key))?.label || key;
const idle = { running: false, beat: -1 };
const state = {
  view: !musicianLink && new URL(location.href).searchParams.get('modo') === 'central' ? 'admin' : 'live',
  songs: [], offline: new Map(), selected: null, admin: null, bpm: 0, volume: 0.82,
  preparation: '', syncLabel: '', errors: '', searchLive: '', searchAdmin: '',
  selectedSignature: '', info: idle, download: '', capture: null, libraryOpen: false,
};
const player = new Player(() => { if (player.running) updatePlayback(); });
let repo;
let animation;
let syncTask;
let syncTimer;
let draftTimer;
let prepTimer;
let toastTimer;
let wakeLock;
let startPending = false;
let wavePeaks = [];
let lastProgress = -1;
let currentGeneration = 0;
let draftWrites = Promise.resolve();
let writesPending = 0;
let batchFiles = [];
let previewContext = null;
let previewSound = null;
let previewToken = 0;
const ownEdits = new Map();

function brand(extra = '') {
  return '<div class="brand ' + extra + '"><span class="mark">' + icon('wave') +
    '</span><span class="brand-titles"><strong>Loops Marks Pro <span class="brand-version">' + APP_VERSION +
    '</span></strong><small>Studio Marks</small></span></div>';
}

function button(action, text, sign, classes = '', props = '') {
  return '<button type="button" class="button ' + classes + '" data-action="' + action + '" ' + props +
    '>' + (sign ? icon(sign) : '') + (text ? '<span>' + escape(text) + '</span>' : '') + '</button>';
}

function iconButton(action, text, sign, props = '') {
  return '<button type="button" class="icon-btn" data-action="' + action + '" title="' + escape(text) +
    '" aria-label="' + escape(text) + '" ' + props + '>' + icon(sign) + '</button>';
}

function statusText() {
  if (!cloud.enabled) return ['Modo demonstração', 'headphones'];
  if (!navigator.onLine) return ['Offline', 'device'];
  if (state.syncLabel) return [state.syncLabel, state.errors ? 'device' : 'cloud'];
  return ['Central online', 'cloud'];
}

function settingsMenu(user) {
  return '<details class="settings-menu" id="settings-menu"><summary aria-label="Abrir configurações">' +
    icon('settings') + '<span>Configurações</span></summary><div class="settings-panel">' +
    '<p class="settings-title">PREFERÊNCIAS DA CENTRAL</p><div class="settings-account">' + icon('user') +
    '<span title="' + escape(user) + '">' + escape(user) + '</span></div>' +
    button('backup', 'Backup e restauração', 'download', 'settings-action') +
    button('link', 'Gerar link do aplicativo', 'link', 'settings-action') +
    button('logout', 'Sair da conta', 'exit', 'settings-action settings-logout') +
    '</div></details>';
}

function shell() {
  const live = state.view === 'live';
  const user = cloud.session()?.email || 'Conta não conectada';
  const [status, statusIcon] = statusText();
  if (live) {
    return '<div class="stage-shell' + (musicianLink ? ' musician-shell' : '') + '">' +
      '<header class="stage-topbar">' +
      (musicianLink ? '<span class="stage-top-left" aria-hidden="true"></span>' : iconButton('admin', 'Voltar à Central Administrativa', 'grid', 'data-stage-back')) +
      brand('stage-brand') +
      '<div class="stage-tools">' +
      '<span class="stage-connection" title="' + escape(status) + '" id="sync-label">' + icon(statusIcon) + '<span>' + escape(status) + '</span></span>' +
      iconButton('open-library', 'Escolher música no repertório', 'list', 'id="repertoire-toggle" aria-expanded="false" aria-controls="live-drawer"') +
      '</div></header><main class="stage-main">' + liveView() + '</main></div>';
  }
  return '<div class="shell admin-shell"><aside class="sidebar">' + brand() +
    '<nav aria-label="Seções"><button class="nav-link" data-action="live">' + icon('current') + 'Modo ao vivo</button>' +
    '<button class="nav-link" data-action="admin" aria-current="page">' + icon('grid') + 'Central de loops</button></nav>' +
    '<div class="sidebar-foot"><p class="sidebar-foot-label">STUDIO MARKS · CONTROLE DE PALCO</p></div></aside>' +
    '<div class="workspace"><header class="topbar">' + brand('mobile-only') +
    '<div class="breadcrumb">' + icon('grid') + '<span>Central de loops</span></div>' +
    '<div class="top-actions"><span class="sync' + (state.errors ? ' warn' : '') + '" id="sync-label">' +
      icon(statusIcon) + '<span>' + escape(status) + '</span></span>' + settingsMenu(user) +
    '</div></header><main class="main admin-main">' + adminView() + '</main></div></div>';
}

function loginView() {
  return '<main class="login"><section class="frame login-card">' + brand() +
    '<h1>' + (musicianLink ? 'Entrar no Modo Live' : 'Entrar na central') + '</h1><p>Acesse com o e-mail convidado no Netlify Identity. No primeiro acesso, abra o convite para criar sua senha.</p>' +
    '<form id="login-form"><label class="field"><span>E-mail</span><input type="email" name="email" required autocomplete="username"></label>' +
    '<label class="field"><span>Senha</span><input type="password" name="password" required autocomplete="current-password"></label>' +
    '<button class="button primary" type="submit">' + icon('user') + 'Entrar</button>' +
    '<p class="error" id="login-error" role="alert">' + escape(cloud.authError) + '</p></form>' +
    '<details class="recovery-help"><summary>Esqueci minha senha</summary>' +
    '<p>O link do Netlify abre o endereço principal do projeto. Para criar ou redefinir sua senha, confirme que ele exibe V10. Não solicite vários e-mails seguidos.</p>' +
    '<form id="request-recovery-form"><label class="field"><span>E-mail da conta</span><input type="email" name="email" required autocomplete="email"></label>' +
    '<button class="button ghost" type="submit">Enviar link de recuperação</button>' +
    '<p id="recovery-message" role="status"></p></form></details>' +
    '<details class="recovery-help"><summary>Verificar configuração de acesso</summary>' +
    '<p>Diagnóstico sem enviar e-mail de recuperação e sem alterar sua senha.</p>' +
    button('auth-check', 'Verificar Identity', 'refresh', 'ghost') +
    '<p id="auth-check-message" role="status"></p></details>' +
    '<div class="login-footer">Loops Marks Pro ' + APP_VERSION + '</div>' +
    '</section></main>';
}

function passwordView() {
  const isInvite = cloud.authFlow?.type === 'invite';
  return '<main class="login"><section class="frame login-card">' + brand() +
    '<h1>' + (isInvite ? 'Criar senha de acesso' : 'Definir nova senha') + '</h1>' +
    '<p>' + (isInvite ? 'O Netlify confirmou o convite. Crie e confirme sua senha para ativar esta conta.' :
      'O Netlify confirmou seu link. Defina e confirme a nova senha abaixo. A Central só será aberta após salvar.') + '</p>' +
    '<form id="password-form"><label class="field"><span>Nova senha (mínimo 8 caracteres)</span>' +
    '<input type="password" name="password" required minlength="8" autocomplete="new-password"></label>' +
    '<label class="field"><span>Confirmar nova senha</span>' +
    '<input type="password" name="confirmation" required minlength="8" autocomplete="new-password"></label>' +
    '<button class="button primary" type="submit">' + icon('user') +
    (isInvite ? 'Ativar minha conta' : 'Salvar nova senha') + '</button>' +
    '<p class="error" id="password-error" role="alert"></p></form>' +
    '<div class="login-footer">Loops Marks Pro ' + APP_VERSION + '</div>' +
    '</section></main>';
}

function authLinkErrorView() {
  return '<main class="login"><section class="frame login-card">' + brand() +
    '<h1>Link de acesso não validado</h1>' +
    '<p>' + escape(cloud.authError || 'O link pode ter expirado ou já ter sido usado. Solicite um novo link de recuperação pelo aplicativo.') + '</p>' +
    '<button type="button" class="button ghost" data-action="auth-back">Voltar ao login</button>' +
    '<div class="login-footer">Loops Marks Pro ' + APP_VERSION + '</div></section></main>';
}

function songsFor(view) {
  // A música deve aparecer no Modo Live assim que o cadastro é salvo.
  // Faltando um loop contínuo, ela fica visível com orientação em vez de sumir.
  const rows = liveCatalog(state.songs);
  return view === 'admin' ? rows : rows.concat(cloud.enabled ? [] : exampleSongs);
}

function library(view) {
  const search = view === 'live' ? state.searchLive : state.searchAdmin;
  const live = view === 'live';
  return '<aside class="library frame' + (live ? ' repertoire-drawer' : '') + '" ' +
    (live ? 'id="live-drawer" role="dialog" aria-modal="true" aria-label="Repertório de músicas" hidden' : '') + '>' +
    '<div class="library-head"><div><p class="library-overline">' + (live ? 'SELEÇÃO RÁPIDA' : 'BIBLIOTECA') + '</p><h2>' +
    (live ? 'Repertório' : 'Músicas') + '</h2></div><div class="library-head-tools"><span class="count" id="song-count"></span>' +
    (live ? iconButton('close-library','Fechar repertório','x') : '') + '</div></div>' +
    '<label class="search">' + icon('search') + '<input id="search" type="search" autocomplete="off" placeholder="Buscar música" aria-label="Buscar música" value="' +
    escape(search) + '"></label><div class="items" id="items"></div>' +
    (live ? '<div class="library-download"><p>ARQUIVOS PARA TOCAR SEM INTERNET</p>' +
      button('download', 'Baixar para offline', 'download', 'ghost', 'id="download-btn"') + '</div>' +
      '<div class="library-foot">' + icon('headphones') +
      '<span>Antes do evento, baixe os WAVs e confira a reprodução em modo avião.</span></div>' : '') + '</aside>';
}

function liveView() {
  return '<div class="live-workspace"><section class="deck stage-deck" aria-label="Player de loops">' + deck() +
    '</section><div id="drawer-backdrop" class="drawer-backdrop" data-action="close-library" hidden></div>' + library('live') + '</div>';
}

function toggleLibrary(open) {
  const drawer = get('#live-drawer'), backdrop = get('#drawer-backdrop'), trigger = get('#repertoire-toggle');
  if (!drawer || !backdrop) return;
  state.libraryOpen = open;
  drawer.hidden = !open;
  backdrop.hidden = !open;
  if (trigger) trigger.setAttribute('aria-expanded', String(open));
  document.body.classList.toggle('drawer-visible', open);
  if (open) drawer.querySelector('#search')?.focus();
  else trigger?.focus();
}

function deck() {
  const song = state.selected;
  if (!song) return '<div class="frame blank"><h2>Seu repertório começa aqui</h2><p>' +
    (musicianLink ? 'Nenhuma música sincronizada nesta conta. Cadastre e sincronize o repertório pelo computador.' : 'Cadastre uma música na Central Administrativa.') + '</p>' +
    (musicianLink ? '' : button('admin', 'Abrir central', 'grid', 'primary')) + '</div>';
  const openingPart = firstPlayablePart(song);
  if (!openingPart) return '<div class="frame blank"><h2>' + escape(song.name || 'Música sem título') +
    '</h2><p>Cadastro encontrado. Para reproduzir, importe pelo menos um WAV no campo <strong>Loop contínuo</strong> (Parte A, Refrão ou outra parte). Entradas com prato e viradas não substituem o loop contínuo.</p>' +
    (musicianLink ? '' : button('admin', 'Completar cadastro', 'grid', 'primary')) + '</div>';
  const parts = PLAY_PARTS.filter(part => song.parts?.[part.id]);
  const manual = MANUAL_PARTS.filter(part => Object.keys(song.parts || {}).some(id => fillBase(id) === part.id));
  const endings = FINALES.filter(part => song.parts?.[part.id]);
  return '<section class="frame"><div class="deck-header"><div><h2>' + escape(song.name) + '</h2><p class="track-meta">' +
    (song.occasion ? escape(song.occasion) + ' · ' : '') + escape(song.bpm) + ' BPM original · ' + escape(song.beats) +
    ' tempos</p></div><span class="chip" id="player-chip"></span></div>' +
    '<div class="stage-status" role="status" aria-live="polite"><div class="stage-status-main"><span class="stage-status-label">PARTE EM EXECUÇÃO</span>' +
    '<strong id="stage-active">' + escape(PLAY_PARTS.find(p => p.id === openingPart)?.label || 'Aguardando') + '</strong></div>' +
    '<div class="stage-status-side"><span id="stage-mode">Pronto · contínuo</span><small id="stage-next"></small></div></div>' +
    '<div class="wave-box"><canvas id="waveform" role="img" aria-label="Forma de onda da parte atual"></canvas><div>' +
    '<span id="wave-caption">' + escape(PLAY_PARTS.find(part => part.id === openingPart)?.label || 'Loop') + '</span><span id="wave-caption-right">Compasso</span></div></div>' +
    '<div class="transport"><div class="tempo">' + iconButton('slower', 'Diminuir BPM', 'minus', 'id="slower"') +
    '<div class="bpm-center"><strong id="bpm">' + escape(state.bpm) + '</strong><small>BPM</small></div>' +
    iconButton('faster', 'Aumentar BPM', 'plus', 'id="faster"') + '</div><div class="transport-actions">' +
    button('play', 'Iniciar', 'play', 'primary', 'id="play-btn"') +
    iconButton('stop', 'Parar imediatamente', 'stop', 'id="stop-btn" disabled') +
    '</div><div class="meter" aria-label="Tempos do compasso">' +
    Array.from({ length: song.beats }, (_, index) => '<span class="pulse">' + (index + 1) + '</span>').join('') +
    '</div></div><div class="deck-line"><p class="player-message" id="player-message" aria-live="polite"></p>' +
    '<label class="vol" title="Volume">' + icon('volume') + '<input type="range" id="volume" aria-label="Volume" min="0" max="1" step="0.01" value="' +
    escape(state.volume) + '"></label></div>' +
    '<div class="queue-tools">' + button('cancel-queue', 'Cancelar troca agendada', 'x', 'ghost', 'id="cancel-btn" disabled hidden') +
    '<button type="button" class="mode-toggle" data-action="mode-toggle" id="fill-mode" title="Alternar motor de viradas" ' +
    'aria-label="Modo de virada: inteligente ou completa">' +
    icon('wave') + '<span>Virada: ' + (player.mode === 'full' ? 'PRÓXIMO 1' : 'INTELIGENTE') + '</span></button>' +
    '</div></section>' +
    '<section class="frame live-sections"><div class="section-head"><h2>Partes da música</h2><span>Entrada no tempo 1</span></div>' +
    '<div class="pads">' + parts.map(part => '<button type="button" class="pad" data-action="part" data-part="' + part.id +
    '" disabled>' + icon(part.icon) + '<strong>' + escape(part.label) + '</strong><small>' + (song.parts?.[part.id + 'Entry'] ? 'Entrada + contínuo' : 'Loop contínuo') + '</small></button>').join('') +
    '</div>' + (manual.length ? '<div class="section-head live-subsection"><h2>Viradas manuais</h2><span>Retorna ao loop</span></div>' +
    '<div class="pads manual-pads">' + manual.map(part => '<button type="button" class="pad fill-pad" data-action="fill" data-part="' +
    part.id + '" disabled>' + icon(part.icon) + '<strong>' + escape(part.label) + '</strong><small>Virada avulsa</small></button>').join('') +
    '</div>' : '') + (endings.length ? '<div class="section-head live-subsection"><h2>Encerramentos</h2><span>Toque uma vez</span></div>' +
    '<div class="pads end-pads">' + endings.map(part => '<button type="button" class="pad final ' + (part.id === 'finish' ? 'finish' : '') +
    '" data-action="part" data-part="' + part.id + '" disabled>' + icon(part.icon) + '<strong>' + escape(part.label) +
    '</strong><small>Finaliza a execução</small></button>').join('') + '</div>' : '') +
    (!manual.length && !endings.length ? '<p class="subtle note">Cadastre viradas e acabamentos na Central Administrativa.</p>' : '') +
    '</section>';
}

function adminView() {
  const amount = state.songs.filter(song => !song.deleted).length;
  return '<div class="heading"><div><p class="eyebrow">STUDIO MARKS / ADMINISTRAÇÃO</p><h1>Central Administrativa</h1>' +
    '<p>Seu repertório, seus loops e as regras de palco no mesmo lugar.</p></div>' +
    '<div class="admin-quick-actions">' + button('new', 'Nova música', 'plus', 'primary') + '</div></div>' +
    '<div class="admin-summary">' +
    '<div class="mini-stat"><small>MÚSICAS</small><strong>' + amount + '</strong><span>Na biblioteca</span></div>' +
    '<div class="mini-stat"><small>SALVAMENTO</small><strong>' + (cloud.enabled ? 'Nuvem' : 'Local') + '</strong><span>' +
      (cloud.enabled ? 'Netlify Blobs + aparelho' : 'Demonstração sem nuvem') + '</span></div>' +
    '<div class="access-shortcut"><div><small>ACESSO DO MÚSICO</small><strong>Aplicativo no celular</strong><span>Gere o link em Configurações · Modo Live sem edição</span></div>' + icon('device') + '</div></div>' +
    (state.errors ? '<div class="warning" role="status">' + escape(state.errors) + ' ' +
      button('sync', 'Tentar sincronizar', 'refresh', 'ghost') + '</div>' : '') +
    '<div class="workspace-grid admin-grid">' + library('admin') + '<section class="frame admin-editor">' +
    (state.admin ? editor() : '<div class="blank"><h2>Selecione uma música</h2><p>Crie uma música para importar os seus loops de bateria.</p></div>') +
    '</section></div>';
}

function field(key, title, value, attrs = '') {
  return '<label class="field"><span>' + title + '</span><input data-field="' + key + '" value="' +
    escape(value) + '" ' + attrs + '></label>';
}

function editorSection(song, group, title, helper, open = false) {
  const items = PARTS.filter(part => part.group === group);
  const count = items.filter(part => song.parts?.[part.id]).length;
  return '<details class="editor-group" ' + (open ? 'open' : '') + '><summary><span>' + icon(group === 'loops' ? 'music' :
    group === 'finais' ? 'flag' : 'wave') + '<strong>' + escape(title) + '</strong></span><small>' + count + '/' + items.length +
    ' áudios</small></summary><p class="group-hint">' + escape(helper) + '</p><div class="file-list">' +
    items.map(part => fileRow(part, song.parts?.[part.id], song)).join('') + '</div></details>';
}

function availableFillChoices(song) {
  return [...PARTS.filter(p => p.type === 'virada'), ...(song.customFills || [])]
    .filter(part => Object.keys(song.parts || {}).some(id => fillBase(id) === part.id));
}

function variantEditor(song) {
  const variants = [...PARTS.filter(p => p.type === 'virada'), ...(song.customFills || [])];
  const count = Object.keys(song.parts || {}).filter(id => /__\d+$/.test(id)).length;
  return '<details class="editor-group"><summary><span>' + icon('wave') +
    '<strong>Variações de virada (opcional)</strong></span><small>' + count + ' WAVs</small></summary>' +
    '<p class="group-hint">Suba uma virada curta de 1, 2, 3 ou mais tempos. O player procura primeiro a duração gravada; ' +
    'se não existir, aproveita a parte final da virada longa da mesma família. Não precisa cadastrar variações.</p>' +
    '<div class="variant-groups">' + variants.map(part => {
      const entries = Array.from({length:song.beats},(_,i) => i + 1).map(beats => {
        const id = fillVariantId(part.id, beats);
        return fileRow({...part, id, label:beats + (beats === 1 ? ' tempo' : ' tempos'),type:'virada'},song.parts?.[id],song);
      });
      const amount = Array.from({length:song.beats},(_,i) => fillVariantId(part.id,i+1)).filter(key=>song.parts?.[key]).length;
      return '<details class="variant-family"><summary><strong>' + escape(part.label) +
        '</strong><small>' + amount + ' variações</small></summary><div>' + entries.join('') + '</div></details>';
    }).join('') + '</div></details>';
}

function transitionEditor(song) {
  const loopOptions = [{id:'intro',label:'Introdução'}, ...PLAY_PARTS];
  const targetOptions = [...PLAY_PARTS, ...FINALES];
  const fills = availableFillChoices(song);
  const rows = Object.entries(song.transitions || {});
  return '<details class="editor-group" open><summary><span>' + icon('layers') + '<strong>Mapa de transições</strong></span>' +
    '<small>' + rows.length + ' regras</small></summary>' +
    '<p class="group-hint">Defina uma virada diferente para uma passagem específica. Sem regra, o app usa a virada automática do destino.</p>' +
    '<div class="transition-form">' +
    '<label class="field"><span>De</span><select id="transition-from">' + loopOptions.map(p => '<option value="'+p.id+'">'+escape(p.label)+'</option>').join('') + '</select></label>' +
    '<label class="field"><span>Para</span><select id="transition-to">' + targetOptions.map(p => '<option value="'+p.id+'">'+escape(p.label)+'</option>').join('') + '</select></label>' +
    '<label class="field"><span>Usar virada</span><select id="transition-fill">' +
    '<option value="">Padrão automática</option><option value="none">Sem virada</option>' + fills.map(p =>
    '<option value="'+escape(p.id)+'">'+escape(p.label)+'</option>').join('') + '</select></label>' +
    button('add-transition', 'Salvar regra', 'plus', 'ghost') + '</div>' +
    '<div class="transition-list">' + rows.map(([key, value]) => {
      const [from, dest] = key.split('>');
      const fromLabel = loopOptions.find(p=>p.id===from)?.label || from;
      const toLabel = targetOptions.find(p=>p.id===dest)?.label || dest;
      const fillLabel = value==='none' ? 'Sem virada' : [...PARTS,...(song.customFills||[])].find(p=>p.id===value)?.label || value;
      return '<div class="transition-row"><span><strong>'+escape(fromLabel)+' → '+escape(toLabel)+'</strong><small>'+escape(fillLabel)+'</small></span>' +
        iconButton('remove-transition','Remover regra','trash','data-key="'+escape(key)+'"')+'</div>';
    }).join('') + '</div></details>';
}

function editor() {
  const song = state.admin;
  const customized = song.customFills || [];
  return '<div class="deck-header"><div><p class="eyebrow">EDITOR DE LOOPS</p><h2 id="editor-title">' + escape(song.name || 'Nova música') +
    '</h2><p class="track-meta" id="save-label">Salvamento automático</p></div>' +
    iconButton('delete', 'Excluir música', 'trash') + '</div>' +
    (song.conflict ? '<div class="warning" role="status">Esta música foi editada em outro aparelho.' +
      '<div>' + button('resolve-remote', 'Usar versão da central', 'cloud', 'ghost') +
      button('resolve-local', 'Publicar minha edição', 'check', 'ghost') + '</div></div>' : '') +
    '<div class="section-head"><h2>01 · Identificação</h2><span>Salva automaticamente</span></div>' +
    '<div class="form-grid">' + field('name', 'Nome da música', song.name, 'maxlength="90" placeholder="Ex.: Entrada da noiva"') +
    field('occasion', 'Momento', song.occasion, 'maxlength="55" placeholder="Ex.: Entrada"') +
    field('bpm', 'BPM original', song.bpm, 'type="number" min="30" max="280"') +
    '<label class="field"><span>Tempos / compasso</span><select data-field="beats">' +
    [2,3,4,5,6].map(beats => '<option ' + (beats === song.beats ? 'selected' : '') + '>' + beats + '</option>').join('') +
    '</select></label></div>' +
    '<div class="section-head"><h2>02 · Comportamento musical</h2><span>Personalizado por música</span></div>' +
    '<div class="form-grid">' +
    '<label class="field"><span>Troca de parte / virada</span><select data-field="fillMode">' +
    '<option value="smart" ' + ((song.fillMode || 'smart') === 'smart' ? 'selected' : '') + '>Inteligente · próximo tempo 1</option>' +
    '<option value="full" ' + (song.fillMode === 'full' ? 'selected' : '') + '>Completa · próxima entrada segura</option></select></label>' +
    '<label class="field"><span>Repetir a mesma parte</span><select data-field="repeatMode">' +
    '<option value="fill" ' + ((song.repeatMode || 'fill') === 'fill' ? 'selected' : '') + '>Com virada + crash</option>' +
    '<option value="direct" ' + (song.repeatMode === 'direct' ? 'selected' : '') + '>Direto ao loop de entrada com crash</option>' +
    '</select></label></div>' +
    '<div class="import-toolbar"><div><h2>03 · Biblioteca de áudios</h2><p>WAVs separados da sua DAW · Até 32 MB por arquivo</p></div>' +
    button('batch-import','Importar vários WAVs','plus','ghost') + '<input type="file" id="batch-files" accept=".wav,audio/wav,audio/x-wav" multiple hidden></div>' +
    editorSection(song, 'loops', 'Loops contínuos e introdução',
      'O WAV contínuo NÃO deve ter crash de entrada repetido. Ele fica em repetição até a próxima troca.', true) +
    editorSection(song, 'entradas', 'Primeira entrada com crash (opcional)',
      'WAV de um ou mais compassos com o prato de ataque. Toca UMA vez a cada entrada na parte; depois vem o loop contínuo. O WAV precisa ter o mesmo BPM e compasso.') +
    editorSection(song, 'automaticas', 'Viradas automáticas', 'Opcional: entram no tempo certo quando você pede outra parte.', true) +
    editorSection(song, 'manuais', 'Viradas manuais', 'Uma virada selecionada manualmente substitui a automática antes da parte desejada.') +
    variantEditor(song) +
    '<details class="editor-group"><summary><span>' + icon('wave') + '<strong>Viradas específicas</strong></span><small>' +
    customized.length + ' cadastradas</small></summary><p class="group-hint">Crie quantas viradas exclusivas precisar e vincule-as ao mapa de transições.</p>' +
    '<div class="custom-list">' + customized.map(part => '<div class="custom-fill-item">' +
    '<label class="field"><span>Nome da virada</span><input maxlength="52" data-custom-name="' + escape(part.id) + '" value="' + escape(part.label) + '"></label>' +
    fileRow({...part,icon:'wave',type:'virada'}, song.parts?.[part.id], song) +
    button('remove-custom', 'Excluir virada específica', 'trash', 'ghost danger', 'data-part="' + escape(part.id) + '"') + '</div>').join('') +
    '</div>' + button('add-custom', 'Adicionar virada específica', 'plus', 'ghost') + '</details>' +
    editorSection(song, 'finais', 'Acabamento e final', 'Arquivos de encerramento de execução única, inclusive cauda do prato.') +
    transitionEditor(song) +
    '<div class="footer-actions"><small class="subtle">O cadastro aparece no Modo Live automaticamente. Para tocar, importe ao menos um loop contínuo. Confira os WAVs offline antes do evento.</small></div>';
}

function fileRow(part, audio, song = state.admin) {
  const finishing = part.group === 'finais' || ['finish','outro'].includes(part.id);
  const filling = part.type === 'virada';
  const variant = part.id.match(/__(\d+)$/);
  const unit = filling ? 'tempos' : 'comp.';
  const count = variant ? Number(variant[1]) : filling ?
    (audio?.lengthBeats || (audio?.bars || 1) * song.beats) : (audio?.bars || 1);
  return '<div class="file-row" data-row="' + escape(part.id) + '">' + icon(part.icon || 'wave') + '<div><strong>' + escape(part.label) +
    '</strong><small title="' + escape(audio?.name) + '">' + escape(audio?.name || 'Sem arquivo') + '</small></div>' +
    (finishing ? '<span class="subtle"><small>Uma vez</small></span>' :
      '<label class="field length-field"><input type="number" min="1" max="' + (filling ? 128 : 64) + '" data-length="' + escape(part.id) + '" ' +
      'data-unit="' + (filling ? 'beats' : 'bars') + '" aria-label="' + unit + ' de ' + escape(part.label) + '" value="' + escape(count) + '" ' +
      (audio && !variant ? '' : 'disabled') + '><span>' + unit + '</span></label>') +
    '<input type="file" accept=".wav,audio/wav,audio/x-wav" data-file="' + escape(part.id) + '" hidden>' +
    button('preview', 'Ouvir', 'play', 'ghost audio-preview', 'data-part="' + escape(part.id) + '" aria-label="Ouvir ' + escape(part.label) + '" ' + (audio ? '' : 'disabled')) +
    button('browse', audio ? 'Trocar' : 'Importar', audio ? 'refresh' : 'plus', 'ghost',
      'data-part="' + escape(part.id) + '" aria-label="Importar WAV de ' + escape(part.label) + '"') +
    iconButton('remove-file', 'Remover WAV de ' + escape(part.label), 'trash', 'data-part="' + escape(part.id) + '" ' +
      (audio ? '' : 'disabled')) + '</div>';
}

function render() {
  if (musicianLink) state.view = 'live';
  if (cloud.enabled && cloud.authFlow?.type === 'invalid') { app.innerHTML = authLinkErrorView(); return; }
  if (cloud.enabled && cloud.authFlow) { app.innerHTML = passwordView(); return; }
  if (cloud.enabled && !cloud.session()) { app.innerHTML = loginView(); return; }
  document.body.classList.remove('drawer-visible');
  state.libraryOpen = false;
  app.innerHTML = shell();
  updateLibrary();
  if (state.view === 'live') updatePlayback(true);
  else updateSaveLabel();
}

function normalized(value) {
  return (value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR');
}

function updateLibrary() {
  const container = get('#items');
  if (!container) return;
  const view = state.view;
  const selected = view === 'live' ? state.selected?.id : state.admin?.id;
  const search = normalized(view === 'live' ? state.searchLive : state.searchAdmin);
  const rows = songsFor(view).sort((a, b) => (a.name || '').localeCompare(b.name || '', 'pt-BR'));
  get('#song-count').textContent = rows.length;
  const visible = rows.filter(song => normalized(song.name + ' ' + song.occasion).includes(search));
  container.innerHTML = visible.map(song => {
    const offlineRecord = state.offline.get(song.id);
    const downloaded = song.demo || (offlineRecord && sortedSignature(offlineRecord) === sortedSignature(song));
    const status = firstPlayablePart(song) ? '' : ' · Falta loop contínuo';
    return '<button type="button" class="item" data-action="song" data-id="' + escape(song.id) + '" aria-pressed="' +
      (song.id === selected) + '"><span class="item-icon">' + icon('music') + '</span><span><span class="item-title">' +
      escape(song.name || 'Sem título') + '</span><span class="item-meta">' + escape(song.occasion || 'Rascunho') + ' · ' +
      escape(song.bpm) + ' BPM' + escape(view === 'live' ? status : '') + '</span></span>' + (downloaded && view === 'live' ? icon('check') : '') + '</button>';
  }).join('') || '<p class="empty-list">' + (search ? 'Nenhuma música encontrada.' : 'Nenhuma música cadastrada.') + '</p>';
}

function updateTop() {
  const element = get('#sync-label');
  if (!element) return;
  const [status, statusIcon] = statusText();
  element.innerHTML = icon(statusIcon) + '<span>' + escape(status) + '</span>';
  element.classList.toggle('warn', Boolean(state.errors));
  element.title = state.errors || status;
}

function updateSaveLabel() {
  const text = get('#save-label');
  if (!text) return;
  const saved = state.songs.find(song => song.id === state.admin.id);
  text.textContent = state.admin.conflict ? 'Conflito de edição' :
    state.editLabel || (!saved ? 'Salvamento automático' : !cloud.enabled ? 'Salvo neste aparelho' : saved.dirty ?
      'Salvo no aparelho · sincronização pendente' : 'Salvo na central');
}

function notice(message) {
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 3300);
}

function confirmChoice(title, description, ok) {
  const safe = escape;
  dialog.innerHTML = '<h2>' + safe(title) + '</h2><p>' + safe(description) + '</p>' +
    '<form method="dialog"><menu><button class="button ghost" value="cancel">Cancelar</button>' +
    '<button class="button primary" value="ok">' + safe(ok) + '</button></menu></form>';
  dialog.returnValue = '';
  dialog.showModal();
  return new Promise(resolve => dialog.addEventListener('close', () => resolve(dialog.returnValue === 'ok'), { once: true }));
}

async function copyMobile() {
  const url = new URL(location.href);
  // Link estável e exclusivo da interface do músico; sem menus de cadastro.
  url.search = '?modo=musico';
  url.hash = '';
  const preview = location.hostname.match(/^[a-f0-9]{12,}--(.+\.netlify\.app)$/i);
  const stable = new URL(url.href);
  if (preview) stable.hostname = preview[1];
  const published = !['localhost', '127.0.0.1', '0.0.0.0'].includes(url.hostname) && url.protocol === 'https:';
  dialog.innerHTML = '<h2>Link do músico · Só Modo Live</h2>' +
    '<p>O link abre diretamente o player, sem tela de edição. No iPhone: abra pelo Safari, entre uma vez no Netlify Identity e escolha Compartilhar → Adicionar à Tela de Início. Depois baixe os WAVs dentro do app instalado.</p>' +
    (published ? '<p class="link-note">Se o Netlify pedir login da própria plataforma antes do aplicativo, confira Project visibility no painel: o projeto Private exige conta da equipe. Para acesso direto, a interface pode ser Public; o login Identity continua protegendo os WAVs e cadastros.</p>' : '<p class="warning">Este é um endereço local. Para usar no celular, publique no Netlify.</p>') +
    '<label class="field"><span>Link do app no iPhone (endereço principal)</span><input readonly value="' + escape(stable.href) + '"></label>' +
    (preview ? '<label class="field" style="margin-top:10px"><span>Link desta versão de teste (Permalink)</span><input readonly value="' + escape(url.href) + '"></label><p class="link-note">Para instalar definitivamente, use o endereço principal quando a V10 estiver publicada. O Permalink é uma prévia isolada.</p>' : '') +
    '<div class="batch-footer" style="margin-top:14px">' + button('copy', 'Copiar app oficial', 'link', 'primary') +
    (preview ? button('copy-preview', 'Copiar link de teste', 'link', 'ghost') : '') +
    button('share', 'Compartilhar', 'share', 'ghost') +
    '<a class="button ghost" href="' + escape(url.href) + '" target="_blank" rel="noopener noreferrer">Abrir link do músico</a>' +
    '<button class="button ghost" id="close-link">Fechar</button></div>';
  dialog.querySelector('#close-link').addEventListener('click', () => dialog.close());
  dialog.querySelector('[data-action="copy"]').addEventListener('click', async () => {
    try {
      if (!navigator.clipboard?.writeText) throw new Error('Clipboard indisponível');
      await navigator.clipboard.writeText(stable.href);
      notice('Link do músico copiado.');
    } catch {
      const field = dialog.querySelector('input');
      field.focus(); field.select();
      try { if (!document.execCommand('copy')) throw new Error('Falha ao copiar'); notice('Link do músico copiado.'); }
      catch { notice('Selecione e copie o endereço do músico.'); }
    }
  });
  dialog.querySelector('[data-action="copy-preview"]')?.addEventListener('click', async () => {
    try {
      if (!navigator.clipboard?.writeText) throw new Error('Indisponível');
      await navigator.clipboard.writeText(url.href);
      notice('Permalink de teste copiado.');
    } catch {
      const fields = dialog.querySelectorAll('input');
      const input = fields[fields.length - 1];
      input?.focus(); input?.select();
      try { if (!document.execCommand('copy')) throw new Error('Cópia indisponível'); notice('Link de teste copiado.'); }
      catch { notice('Selecione e copie o link de teste.'); }
    }
  });
  dialog.querySelector('[data-action="share"]').addEventListener('click', async () => {
    if (navigator.share) {
      try { await navigator.share({ title: 'Loops Marks Pro', text: 'Abrir o Modo Live', url: stable.href }); }
      catch (error) { if (error.name !== 'AbortError') notice('Não foi possível compartilhar o endereço.'); }
    } else window.open('https://wa.me/?text=' + encodeURIComponent('Loops Marks Pro — Modo Live: ' + stable.href), '_blank', 'noopener,noreferrer');
  });
  dialog.showModal();
}

// Central de Backup V3. O backup completo é independente da nuvem: inclui todos os WAVs.
async function openBackupCenter() {
  stopPreview();
  if (!repo) return;
  if (player.running) { notice('Pare a reprodução antes de abrir os backups.'); return; }
  await saveBeforeLeaving();
  dialog.innerHTML = '<section class="backup-dialog"><p class="eyebrow">PROTEÇÃO DO REPERTÓRIO</p>'+
    '<h2>Backup e restauração</h2>'+
    '<p>Escolha uma cópia para guardar fora do Netlify. O backup completo reúne músicas, viradas, regras e áudios WAV.</p>'+
    '<div class="backup-choices">'+
    '<button type="button" class="button primary" data-backup="completo">' + icon('download') + 'Backup completo</button>'+
    '<button type="button" class="button ghost" data-backup="configuracoes">' + icon('cloud') + 'Só configurações</button>'+
    '<button type="button" class="button ghost" data-backup="audios">' + icon('music') + 'Só áudios + índice</button></div>'+
    '<div class="backup-divider"></div><label class="field"><span>Importar e restaurar backup ZIP</span>'+
    '<input id="restore-file" type="file" accept=".zip,application/zip"></label>'+
    '<p class="subtle backup-small">A restauração adiciona novas cópias das músicas, sem sobrescrever as existentes.</p>'+
    '<div class="backup-divider"></div><div class="backup-row"><button type="button" class="button ghost" id="list-history">' +
    icon('layers') + 'Versões automáticas</button><button type="button" class="button ghost" id="migrate-v2">Importar cadastros locais V2</button></div>'+
    '<div id="backup-history"></div><p class="backup-progress" id="backup-progress" role="status"></p>'+
    '<menu><button class="button ghost" id="backup-close">Fechar</button></menu></section>';
  const message=dialog.querySelector('#backup-progress');
  const lock=async(task)=>{
    const controls=dialog.querySelectorAll('button,input');
    controls.forEach(el=>el.disabled=true);
    try { await task(); }
    catch(e) {message.textContent='Erro: '+(e.message||'operação não concluída');}
    finally {controls.forEach(el=>el.disabled=false);}
  };
  dialog.querySelector('#backup-close').addEventListener('click',()=>dialog.close());
  dialog.querySelectorAll('[data-backup]').forEach(button=>button.addEventListener('click',()=>lock(async()=>{
    const mode=button.dataset.backup;
    message.textContent='Preparando backup…';
    const blob=await makeBackup(repo,mode,(n,total)=>{message.textContent='Incluindo WAV '+n+'/'+total;});
    const stamp=new Date().toISOString().slice(0,16).replace(/[:T]/g,'-');
    triggerDownload(blob,'Loops-Marks-Pro-'+APP_VERSION+'-'+mode+'-'+stamp+'.zip');
    message.textContent='Backup criado: '+(blob.size/1024/1024).toFixed(1)+' MB. Guarde este ZIP em local seguro.';
  })));
  dialog.querySelector('#restore-file').addEventListener('change',e=>{
    const file=e.target.files?.[0]; if(!file)return;
    lock(async()=>{
      if(!await confirmBackupRestore(file))return;
      message.textContent='Restaurando…';
      const result=await restoreBackup(repo,file,(n,total)=>{message.textContent='Restaurando '+n+'/'+total;});
      await refreshLocal();requestSync();
      message.textContent=result.imported+' músicas restauradas. A sincronização será feita com o Netlify.';
    });
  });
  dialog.querySelector('#migrate-v2').addEventListener('click',()=>lock(async()=>{
    message.textContent='Importando rascunhos locais da versão anterior…';
    const n=await repo.importV2Demo(); await refreshLocal();requestSync();
    message.textContent=n ? n+' música(s) importada(s) da V2.' : 'Nenhum cadastro local da V2 encontrado neste aparelho.';
  }));
  dialog.querySelector('#list-history').addEventListener('click',()=>lock(async()=>{
    if(!navigator.onLine)throw new Error('Para recuperar versões da nuvem, conecte-se à internet.');
    const entries=await cloud.snapshots();
    const list=dialog.querySelector('#backup-history');
    list.innerHTML='<h3>Versões anteriores</h3>'+(entries.length ? entries.map((r,i)=>
      '<div class="history-row"><span>'+escape(r.title)+'</span><button type="button" class="button ghost" data-history="'+i+'">Restaurar</button></div>').join(''):
      '<p class="subtle backup-small">Nenhuma versão anterior na nuvem.</p>');
    list.querySelectorAll('[data-history]').forEach(b=>b.addEventListener('click',()=>lock(async()=>{
      const selected=entries[Number(b.dataset.history)];
      if(!confirm('Restaurar esta versão da música? A versão atual também ficará guardada.'))return;
      await cloud.restore(selected.key);
      await refreshLocal(); await syncCatalog();
      message.textContent='Versão recuperada na nuvem. Confira o repertório.';
    })));
    message.textContent=entries.length+' versões automáticas encontradas.';
  }));
  dialog.showModal();
}
async function confirmBackupRestore(file) {
  return confirm('Importar o arquivo "'+file.name+'"? As músicas serão criadas como novas cópias.');
}

function sortedSignature(song) { return song ? song.id + ':' + (song.edit || song.revision) : ''; }

async function refreshLocal() {
  const current = repo;
  const rows = await current.catalog();
  if (repo !== current) return;
  state.songs = rows;
  const downloads = await Promise.all(rows.filter(row => !row.deleted).map(async row => [row.id, await current.offline(row.id)]));
  if (repo !== current) return;
  state.offline = new Map(downloads.filter(([, saved]) => saved));
  if (state.admin && !draftTimer && !writesPending && !state.capture) {
    const saved = rows.find(row => row.id === state.admin.id);
    if (saved && !saved.deleted) {
      const conflictChanged = Boolean(saved.conflict) !== Boolean(state.admin.conflict);
      const changedElsewhere = saved.edit !== state.admin.edit && saved.edit !== ownEdits.get(saved.id);
      const editing = document.activeElement?.matches('input,select') &&
        get('.admin-editor')?.contains(document.activeElement);
      if (changedElsewhere && editing) {
        notice('Edição em outro aparelho. Reabra a música para ver as mudanças.');
      } else {
        state.admin = structuredClone(saved);
        if ((conflictChanged || changedElsewhere) && state.view === 'admin' && !editing) render();
      }
    }
  }
  const available = songsFor('live');
  const preferred = available.find(song => song.id === state.selected?.id) || available[0] || null;
  const latest = await preferDownloaded(preferred);
  if (repo !== current) return;
  if (!player.running && sortedSignature(latest) !== state.selectedSignature) {
    selectLive(latest);
  } else {
    updateLibrary();
    updateTop();
    updateSaveLabel();
    updateDownload();
  }
}

async function syncCatalog() {
  if (!repo || !cloud.enabled || !navigator.onLine || !cloud.session() || player.running) return;
  if (syncTask) return syncTask;
  const current = repo;
  state.errors = '';
  state.syncLabel = 'Sincronizando';
  updateTop();
  syncTask = (async () => {
    try {
      const run = () => current.sync();
      await (navigator.locks?.request('loops-marks-sync-' + current.owner, run) || run());
      if (current !== repo) return;
      state.syncLabel = 'Sincronizado';
      await refreshLocal();
    } catch (error) {
      if (current !== repo) return;
      if (!cloud.session()) { stopPlayback(); repo = null; render(); return; }
      state.errors = error.code === 409 ? 'Mudança em outro aparelho. A central verificará a edição.' :
        (error.code === 0 ? error.message : 'Dados salvos neste aparelho. A central ainda não confirmou a sincronização.');
      state.syncLabel = 'Sincronização pendente';
    } finally {
      syncTask = null;
      updateTop();
      updateSaveLabel();
    }
  })();
  return syncTask;
}

function requestSync() {
  clearTimeout(syncTimer);
  syncTimer = setTimeout(() => { syncCatalog(); }, 650);
}

function selectLive(song) {
  currentGeneration++;
  clearTimeout(prepTimer);
  state.selected = song;
  state.selectedSignature = sortedSignature(song);
  state.bpm = song?.bpm || 0;
  state.preparation = '';
  wavePeaks = [];
  player.cancelPreparation();
  if (state.view === 'live') {
    render();
    if (song) prepareLive();
  }
}

async function preferDownloaded(song) {
  // Não exibir metadados antigos do cache offline: eles escondiam a Parte A recém-salva.
  // Se faltar WAV, prepareLive busca os arquivos da versão atual na nuvem.
  return song;
}

function latestSelected() {
  return songsFor('live').find(song => song.id === state.selected?.id) || state.selected;
}

async function prepareLive() {
  const shown = state.selected;
  if (!shown || state.view !== 'live') return;
  if (!firstPlayablePart(shown)) {
    player.cancelPreparation();
    state.preparation = 'Importe um loop contínuo para tocar.';
    updatePlayback(true);
    return;
  }
  const current = repo;
  const generation = ++currentGeneration;
  state.preparation = 'Preparando áudio…';
  updatePlayback(true);
  try {
    let local = shown.demo || await current.available(shown);
    if (generation !== currentGeneration) return;
    if (!local && !navigator.onLine) {
      state.preparation = 'WAV não encontrado neste aparelho. Conecte-se para baixar esta música antes do evento.';
      updatePlayback(true);
      return;
    }
    if (!local) {
      state.preparation = 'Baixando os WAVs que faltam…';
      state.download = 'Baixando WAVs…';
      updatePlayback(true);
      updateDownload();
      try {
        await current.download(shown, (count, all) => {
          if (generation !== currentGeneration) return;
          state.preparation = 'Baixando WAVs ' + count + '/' + all + '…';
          state.download = 'Baixando ' + count + '/' + all;
          updatePlayback(true);
          updateDownload();
        });
      } finally {
        if (generation === currentGeneration) {
          state.download = '';
          updateDownload();
        }
      }
      if (generation !== currentGeneration) return;
      state.offline.set(shown.id, shown);
      updateLibrary();
      local = await current.available(shown);
      if (!local) throw new Error('Os WAVs não ficaram completos no aparelho. Tente Baixar para offline.');
    }
    const ready = await player.prepare(shown, state.bpm, path => current.audio(path));
    if (!ready || generation !== currentGeneration) return;
    player.volume(state.volume);
    computePeaks(player.initialPart || 'a');
    state.preparation = '';
  } catch (error) {
    if (generation !== currentGeneration) return;
    state.preparation = error.message;
    player.ready = false;
  }
  updatePlayback(true);
}

function updateDownload() {
  const element = get('#download-btn');
  const song = latestSelected();
  if (!element || !song) return;
  const saved = state.offline.get(song.id);
  const same = song.demo || (saved && sortedSignature(saved) === sortedSignature(song));
  const text = state.download || (same ? 'Offline pronto' : saved ? 'Atualizar arquivos offline' : 'Baixar para offline');
  if (element.textContent !== text) element.innerHTML = icon(same ? 'check' : 'download') + '<span>' + escape(text) + '</span>';
  element.disabled = Boolean(state.download || state.info.running || song.demo || (same && player.ready));
}

function computePeaks(key) {
  const source = player.buffers.get(key)?.buffer;
  if (!source) { wavePeaks = []; return; }
  const data = source.getChannelData(0);
  const count = 112;
  const peaks = Array.from({ length: count }, (_, i) => {
    const lo = Math.floor(i * data.length / count);
    const hi = Math.floor((i + 1) * data.length / count);
    let peak = 0;
    for (let j = lo; j < hi; j += 5) peak = Math.max(peak, Math.abs(data[j]));
    return peak;
  });
  const max = Math.max(...peaks, 0.001);
  wavePeaks = peaks.map(peak => Math.min(1, Math.pow(peak / max, 0.63)));
}

function drawWave(progress) {
  const canvas = get('#waveform');
  if (!canvas) return;
  const width = canvas.clientWidth, height = canvas.clientHeight;
  if (!width || !height) return;
  const ratio = Math.min(2, window.devicePixelRatio || 1);
  if (canvas.width !== Math.round(width * ratio)) canvas.width = Math.round(width * ratio);
  if (canvas.height !== Math.round(height * ratio)) canvas.height = Math.round(height * ratio);
  const context = canvas.getContext('2d');
  context.setTransform(ratio, 0, 0, ratio, 0, 0);
  context.clearRect(0, 0, width, height);
  for (let beat = 0; beat <= (state.selected?.beats || 4); beat++) {
    const x = beat * width / (state.selected?.beats || 4);
    context.fillStyle = '#253b32';
    context.fillRect(x, 2, 1, height - 4);
  }
  if (!wavePeaks.length) {
    context.fillStyle = '#324c3e';
    context.fillRect(0, height / 2, width, 1);
    return;
  }
  const step = width / wavePeaks.length;
  for (const [i, amp] of wavePeaks.entries()) {
    const size = Math.max(2, amp * (height - 6));
    context.fillStyle = i / wavePeaks.length <= progress ? '#c8f59e' : i % 4 === 0 ? '#91b48f' : '#587963';
    context.fillRect(i * step + 0.5, (height - size) / 2, Math.max(1, step - 1.2), size);
  }
  if (progress >= 0) {
    context.fillStyle = '#e3ffb7';
    context.fillRect(Math.min(width - 1, progress * width), 0, 1, height);
  }
}

function updatePlayback(force = false) {
  const playing = player.summary();
  const previous = state.info;
  state.info = playing;
  if (get('#stage-active')) {
    const isFill = Boolean(playing.active && ([...PARTS, ...(state.selected?.customFills || [])]
      .some(part => part.id === fillBase(playing.active) && part.type === 'virada')));
    const name = playing.active ? player.label(playing.active) :
      (player.ready ? player.label(player.initialPart || 'a') : 'Aguardando');
    const mode = !playing.running ? (player.ready ? 'Pronto para iniciar' : 'Preparando áudio') :
      isFill ? 'Virada em execução' : playing.entryAttack ? 'Entrada com crash' :
      playing.active === 'intro' ? 'Introdução' : 'Loop contínuo';
    const next = playing.next ? 'PRÓXIMO · ' + player.label(playing.next) : '';
    if (get('#stage-active').textContent !== name) get('#stage-active').textContent = name;
    if (get('#stage-mode').textContent !== mode) get('#stage-mode').textContent = mode;
    if (get('#stage-next').textContent !== next) get('#stage-next').textContent = next;
    get('.stage-status')?.classList.toggle('in-queue', Boolean(playing.next));
  }
  if (previous.running && !playing.running) {
    releaseScreen();
    if (state.errors || cloud.enabled) requestSync();
  }
  if (!get('#play-btn') || !state.selected) return;
  const [min, max] = bpmRange(state.selected.bpm);
  const preparation = state.preparation;
  const queued = playing.next ?
    ('Agendado: ' + (playing.fill ? player.label(playing.fill) +
    (playing.offsetBeats ? ' (últimos ' + playing.fillBeats + 'T)' : '') + ' → ' : '') + player.label(playing.next)) : '';
  const message = playing.interrupted ? 'Áudio suspenso · toque em Retomar' :
    playing.running ? (queued || (playing.active ? player.label(playing.active) + (playing.entryAttack ? ' · entrada com crash' : ' · contínuo') : 'Iniciando…')) :
    (preparation || (player.ready ? 'Todos os áudios preparados · Pronto para tocar' : 'Selecione os áudios para tocar.'));
  const chip = playing.running ? (playing.interrupted ? 'Interrompido' : 'Tocando') : player.ready ? 'Pronto para tocar' : 'Aguardando áudio';
  const closing = ['finish','outro'].includes(playing.next) || ['finish','outro'].includes(playing.active);
  if (force || previous.running !== playing.running || previous.next !== playing.next ||
      previous.fill !== playing.fill || previous.active !== playing.active || previous.entryAttack !== playing.entryAttack || previous.canCancel !== playing.canCancel || previous.interrupted !== playing.interrupted) {
    const text = get('#player-message');
    if (text && text.textContent !== message) text.textContent = message;
    const chipElement = get('#player-chip');
    chipElement.className = 'chip' + (playing.running && !playing.interrupted ? ' active' : player.ready ? ' ready' : '');
    chipElement.innerHTML = icon(playing.running ? 'current' : player.ready ? 'check' : 'wave') + escape(chip);
    const playBtn = get('#play-btn');
    playBtn.disabled = startPending || (!playing.interrupted && (playing.running || !player.ready));
    const playLabel = playing.interrupted ? 'Retomar' : 'Iniciar';
    if (playBtn.textContent !== playLabel) playBtn.innerHTML = icon('play') + '<span>' + playLabel + '</span>';
    get('#stop-btn').disabled = !playing.running;
    get('#bpm').textContent = state.bpm;
    get('#slower').disabled = playing.running || startPending || state.bpm <= min;
    get('#faster').disabled = playing.running || startPending || state.bpm >= max;
    for (const pad of app.querySelectorAll('.pad')) {
      const key = pad.dataset.part;
      const current = playing.active === key;
      const inQueue = playing.next === key || playing.fill === key;
      pad.classList.toggle('active', current);
      pad.classList.toggle('queued', inQueue);
      pad.disabled = !playing.running || (pad.dataset.action === 'fill' ? !player.fillExists(key) : !player.buffers.has(key)) || closing;
      const info = pad.querySelector('small');
      if (info) info.textContent = current ? (playing.entryAttack ? 'Com crash' : 'Tocando') : inQueue ? 'Na fila' :
        pad.dataset.action === 'fill' ? 'Virada avulsa' : ['finish','outro'].includes(key) ? 'Finalizar' :
        (state.selected.parts?.[key + 'Entry'] ? 'Entrada + contínuo' : 'Loop contínuo');
    }
    const cancel = get('#cancel-btn');
    if (cancel) { cancel.hidden = !playing.canCancel; cancel.disabled = !playing.canCancel; }
    get('#wave-caption').textContent = playing.active ? player.label(playing.active) + (playing.entryAttack ? ' · Crash' : '') : player.label(player.initialPart || 'a');
    if (previous.active !== playing.active && player.ready) computePeaks(playing.active || player.initialPart || 'a');
    updateDownload();
  }
  const modeLabel = get('#fill-mode span');
  if (modeLabel) modeLabel.textContent = 'Virada: ' + (player.mode === 'smart' ? 'INTELIGENTE' : 'PRÓXIMO 1');
  if (force || playing.beat !== previous.beat) {
    Array.from(app.querySelectorAll('.pulse')).forEach((tempo, i) => tempo.classList.toggle('on', i === playing.beat));
  }
  if (force || Math.abs((playing.progress ?? -1) - lastProgress) > 0.007) {
    lastProgress = playing.progress ?? -1;
    drawWave(lastProgress);
  }
}

function animate() {
  cancelAnimationFrame(animation);
  updatePlayback();
  if (player.running) animation = requestAnimationFrame(animate);
}

async function keepScreen() {
  if (!navigator.wakeLock || wakeLock || document.visibilityState !== 'visible') return;
  try {
    const lock = await navigator.wakeLock.request('screen');
    if (!player.running) { await lock.release(); return; }
    wakeLock = lock;
    lock.addEventListener('release', () => { if (wakeLock === lock) wakeLock = null; });
  } catch {}
}

function releaseScreen() { if (wakeLock) wakeLock.release().catch(() => {}); }
function stopPlayback() {
  player.stop();
  cancelAnimationFrame(animation);
  releaseScreen();
  updatePlayback(true);
}

function replaceLocalSong(song) {
  const id = state.songs.findIndex(item => item.id === song.id);
  if (id === -1) state.songs.push(song);
  else state.songs[id] = song;
}

function persistDraft(files = []) {
  clearTimeout(draftTimer);
  draftTimer = null;
  if (!state.admin) return Promise.resolve();
  const current = repo;
  const snapshot = structuredClone(state.admin);
  writesPending++;
  draftWrites = draftWrites.catch(() => {}).then(async () => {
    const stored = await current.song(snapshot.id);
    if (stored && stored.revision >= snapshot.revision &&
        (stored.edit === snapshot.edit || stored.edit === ownEdits.get(snapshot.id))) {
      snapshot.revision = stored.revision;
      snapshot.conflict = stored.conflict;
    }
    const song = await current.save(snapshot, files);
    if (repo !== current) return;
    ownEdits.set(song.id, song.edit);
    if (state.admin?.id === song.id) {
      state.admin.edit = song.edit;
      state.admin.revision = song.revision;
      state.admin.conflict = song.conflict;
    }
    replaceLocalSong(song);
    updateLibrary();
    state.editLabel = '';
    updateSaveLabel();
    requestSync();
  }).catch(error => {
    state.editLabel = 'Falha ao salvar · alterações ainda nesta tela';
    updateSaveLabel();
    notice(error.message || 'Falha ao salvar neste aparelho.');
    throw error;
  }).finally(() => { writesPending--; });
  return draftWrites;
}

function delayedSave() {
  clearTimeout(draftTimer);
  state.editLabel = 'Salvando…';
  updateSaveLabel();
  draftTimer = setTimeout(() => { persistDraft().catch(() => {}); }, 390);
}

async function saveBeforeLeaving() {
  if (draftTimer) await persistDraft();
  else await draftWrites;
}

async function changeView(view) {
  if (musicianLink && view !== 'live') return; // Link do músico nunca mostra a Central de edição.
  if (state.view === view) return;
  stopPreview();
  if (state.capture || startPending) return;
  if (player.running) {
    if (!await confirmChoice('Parar a reprodução?', 'A música está tocando.', 'Parar e abrir')) return;
    stopPlayback();
  }
  await saveBeforeLeaving();
  state.view = view;
  state.libraryOpen = false;
  document.body.classList.remove('drawer-visible');
  const url = new URL(location.href);
  url.searchParams.set('modo', musicianLink ? 'musico' : (view === 'live' ? 'ao-vivo' : 'central'));
  history.replaceState(null, '', url);
  if (view === 'admin' && !state.admin) {
    const first = songsFor('admin')[0];
    if (first) state.admin = structuredClone(first);
  }
  render();
  if (view === 'live') {
    await refreshLocal();
    if (!player.ready && state.selected) await prepareLive();
  }
  requestSync();
}

async function startPlayer() {
  if (startPending) return;
  if (state.info.interrupted) { await player.context().resume(); return; }
  startPending = true;
  try {
    const starting = player.start();
    updatePlayback(true);
    await starting;
    animate();
    keepScreen();
  } finally {
    startPending = false;
    updatePlayback(true);
  }
}

async function download() {
  const song = latestSelected();
  if (!song || song.demo || state.download || player.running) return;
  state.download = 'Preparando…';
  updateDownload();
  try {
    await repo.download(song, (count, all) => {
      state.download = 'Baixando ' + count + '/' + all;
      updateDownload();
    });
    state.offline.set(song.id, song);
    updateLibrary();
    if (state.selected?.id === song.id) {
      if (sortedSignature(song) !== state.selectedSignature) selectLive(song);
      else await prepareLive();
    }
    notice('Música salva para usar offline.');
  } catch (error) {
    notice(error.message);
  } finally {
    state.download = '';
    updateDownload();
  }
}

function slotInfo(song, id) {
  return PARTS.find(part => part.id === id) || song.customFills?.find(part => part.id === id);
}

async function inspectWav(file, part, song) {
  if (file.size > MAX_FILE_BYTES) throw new Error(file.name + ': limite de 32 MB por WAV.');
  if (file.size < 44) throw new Error(file.name + ': WAV inválido ou vazio.');
  const header = new TextDecoder().decode(await file.slice(0, 12).arrayBuffer());
  if (!/^(RIFF|RF64)/.test(header) || header.slice(8) !== 'WAVE') {
    throw new Error(file.name + ': exporte em WAV PCM na DAW.');
  }
  let duration;
  try { duration = (await player.context().decodeAudioData(await file.arrayBuffer())).duration; }
  catch { throw new Error(file.name + ': não foi possível ler o WAV. Tente PCM 16/24 bits.'); }
  const secondsPerBeat = 60 / song.bpm;
  const ending = ['outro','finish'].includes(part);
  const variant = part.match(/__(\d+)$/);
  const fill = slotInfo(song,fillBase(part))?.type === 'virada';
  if (variant && (!fill || Number(variant[1]) > song.beats)) throw new Error('Variação inválida para o compasso atual.');
  if (!ending) {
    const estimatedBeats = duration / secondsPerBeat;
    const beats = Math.max(1, Math.round(estimatedBeats));
    if (Math.abs(beats * secondsPerBeat - duration) > 0.085) {
      throw new Error(file.name + ': duração não encaixa em tempos inteiros a ' + song.bpm + ' BPM.');
    }
    if (variant && beats !== Number(variant[1])) {
      throw new Error(file.name + ': esta variação deve ter exatamente ' + variant[1] + ' tempos.');
    }
    if (!fill && beats % song.beats !== 0) {
      throw new Error(file.name + ': o loop deve conter compassos completos (' + song.beats + '/4).');
    }
    if (beats > (fill ? 128 : 64 * song.beats)) throw new Error(file.name + ': o trecho está longo demais.');
    return { part, file, meta: { path: repo.owner + '/' + song.id + '/' + crypto.randomUUID() + '.wav',
      name: file.name.slice(0, 150), bars: beats/song.beats, lengthBeats: beats } };
  }
  return { part, file, meta: { path: repo.owner + '/' + song.id + '/' + crypto.randomUUID() + '.wav',
    name: file.name.slice(0, 150), bars: 1 } };
}

async function saveImported(imports) {
  const song = state.admin;
  if (!song || !imports.length) return;
  const entries = [];
  for (const imported of imports) {
    song.parts[imported.part] = imported.meta;
    entries.push([imported.meta.path, imported.file]);
  }
  await persistDraft(entries);
  render();
  notice(imports.length + (imports.length === 1 ? ' WAV importado.' : ' WAVs importados.'));
}

async function importWav(source) {
  stopPreview();
  const file = source.files?.[0];
  const song = state.admin;
  if (!file || !song) return;
  if (state.capture) throw new Error('Aguarde a importação anterior.');
  state.capture = song.id;
  try {
    const imported = await inspectWav(file, source.dataset.file, song);
    await saveImported([imported]);
  } finally { state.capture = null; source.value = ''; }
}

function batchPreview(source) {
  if (!state.admin || state.capture) return;
  batchFiles = Array.from(source.files || []);
  source.value = '';
  if (!batchFiles.length) return;
  const song = state.admin;
  const fills = [...PARTS.filter(p=>p.type==='virada'), ...(song.customFills || [])];
  const variants = fills.flatMap(fill => Array.from({length:song.beats}, (_,index) => ({
    id:fillVariantId(fill.id,index+1),label:fill.label+' · '+(index+1)+'T',type:'virada'})));
  const slots = [...PARTS, ...(song.customFills || []), ...variants];
  dialog.innerHTML = '<h2>Importar WAVs em lote</h2><p>Identificamos os arquivos pelo nome. Confira os destinos antes de salvar.</p>' +
    '<div class="batch-list">' + batchFiles.map((file,index) => {
      const suggestion = suggestSlot(file.name);
      return '<label class="batch-row"><span title="'+escape(file.name)+'">'+escape(file.name)+'</span><select data-map-index="'+index+'">' +
        '<option value="">Não importar</option>' + slots.map(slot => '<option value="'+escape(slot.id)+'" '+(slot.id===suggestion?'selected':'')+'>'+escape(slot.label)+'</option>').join('')+
        '</select></label>';
    }).join('') + '</div><div class="batch-footer"><button type="button" class="button ghost" id="batch-dismiss">Cancelar</button>' +
    '<button type="button" class="button primary" id="batch-confirm">Importar selecionados</button></div><p class="error" id="batch-error" role="alert"></p>';
  dialog.showModal();
  dialog.querySelector('#batch-dismiss').addEventListener('click',()=>dialog.close());
  dialog.querySelector('#batch-confirm').addEventListener('click',async event => {
    const selected = [...dialog.querySelectorAll('[data-map-index]')].map(select =>
      [Number(select.dataset.mapIndex),select.value]).filter(([,value])=>value);
    const targets = selected.map(([,id]) => id);
    const error = dialog.querySelector('#batch-error');
    if (!selected.length) { error.textContent = 'Escolha pelo menos um destino.'; return; }
    if (new Set(targets).size !== targets.length) { error.textContent = 'Escolha um destino diferente para cada WAV.'; return; }
    event.currentTarget.disabled = true;
    state.capture = song.id;
    try {
      const imports = [];
      for (const [index, id] of selected) imports.push(await inspectWav(batchFiles[index], id, song));
      await saveImported(imports);
      dialog.close();
    } catch(e) { error.textContent = e.message || 'Não foi possível importar.'; }
    finally { state.capture = null; event.currentTarget.disabled = false; }
  });
}

function paintPreviewButtons() {
  for (const button of app.querySelectorAll('[data-action="preview"]')) {
    const active = previewSound?.part === button.dataset.part;
    button.innerHTML = icon(active ? 'stop' : 'play') + '<span>' + (active ? 'Parar' : 'Ouvir') + '</span>';
    button.title = active ? 'Parar prévia' : 'Ouvir este WAV';
  }
}

function stopPreview() {
  previewToken++;
  if (previewSound) {
    const sound = previewSound;
    previewSound = null;
    sound.source.onended = null;
    try { sound.source.stop(); } catch {}
    try { sound.source.disconnect(); sound.gain.disconnect(); } catch {}
  }
  paintPreviewButtons();
}

async function previewWav(part) {
  const same = previewSound?.part === part;
  stopPreview();
  if (same) return;
  const meta = state.admin?.parts?.[part];
  if (!meta?.path) { notice('Importe um WAV antes de ouvir.'); return; }
  const Context = window.AudioContext || window.webkitAudioContext;
  if (!Context) { notice('Este navegador não permite prévia de áudio.'); return; }
  previewContext ||= new Context({ latencyHint: 'interactive' });
  // resume é chamado a partir do toque do usuário para funcionar no iPhone.
  const resume = previewContext.resume();
  const ticket = ++previewToken;
  notice('Preparando prévia do WAV…');
  await resume;
  let blob = await repo.audio(meta.path);
  if (!blob && navigator.onLine && cloud.session()) blob = await cloud.audio(meta.path);
  if (ticket !== previewToken) return;
  if (!blob) throw new Error('WAV ainda não disponível. Confira o salvamento na nuvem.');
  const buffer = await previewContext.decodeAudioData(await blob.arrayBuffer());
  if (ticket !== previewToken) return;
  const source = previewContext.createBufferSource();
  const gain = previewContext.createGain();
  gain.gain.value = 0.85;
  source.buffer = buffer;
  source.connect(gain).connect(previewContext.destination);
  previewSound = {part, source, gain};
  source.onended = () => { if (previewSound?.source === source) stopPreview(); };
  source.start();
  paintPreviewButtons();
  notice('Ouvindo ' + (slotInfo(state.admin, part)?.label || part) + '…');
}

async function handleAction(element) {
  const { action, id, part } = element.dataset;
  if (action === 'auth-check') {
    element.disabled=true;
    const result=get('#auth-check-message');
    if(result) result.textContent='Verificando…';
    try {const status=await cloud.diagnoseIdentity();if(result) result.textContent=status;}
    catch {if(result) result.textContent='Não foi possível verificar a conexão com o Netlify.';}
    finally {element.disabled=false;}
    return;
  }
  if (action === 'open-library') { toggleLibrary(true); return; }
  if (action === 'close-library') { toggleLibrary(false); return; }
  if (action === 'live' || action === 'admin') { await changeView(action); return; }
  if (action === 'link') { await copyMobile(); return; }
  if (action === 'backup') { await openBackupCenter(); return; }
  if (action === 'play') { await startPlayer(); return; }
  if (action === 'stop') { stopPlayback(); return; }
  if (action === 'part') { player.go(part); updatePlayback(true); return; }
  if (action === 'fill') { player.fill(part); updatePlayback(true); return; }
  if (action === 'mode-toggle') {
    if (player.pending) { notice('Aguarde ou cancele a troca agendada para mudar o modo.'); return; }
    player.setMode(player.mode === 'smart' ? 'full' : 'smart');
    const mode = get('#fill-mode span');
    if (mode) mode.textContent = 'Virada: ' + (player.mode === 'smart' ? 'INTELIGENTE' : 'PRÓXIMO 1');
    notice(player.mode === 'smart' ? 'Viradas adaptativas ativadas.' : 'Viradas completas ativadas.');
    return;
  }
  if (action === 'cancel-queue') { if (player.cancel()) notice('Troca cancelada.'); updatePlayback(true); return; }
  if (action === 'download') { await download(); return; }
  if (action === 'sync') { await syncCatalog(); render(); return; }
  if (action === 'slower' || action === 'faster') {
    if (!state.selected || player.running || startPending) return;
    const [min, max] = bpmRange(state.selected.bpm);
    state.bpm = Math.min(max, Math.max(min, state.bpm + (action === 'slower' ? -1 : 1)));
    player.cancelPreparation();
    currentGeneration++;
    state.preparation = 'Preparando áudio…';
    clearTimeout(prepTimer);
    updatePlayback(true);
    prepTimer = setTimeout(() => prepareLive(), 190);
    return;
  }
  if (action === 'auth-back') {
    cloud.authFlow = null; cloud.authError = '';
    render();
    return;
  }
  if (action === 'logout') {
    stopPreview();
    if (state.capture) return;
    if (!await confirmChoice('Sair da conta?', 'Para entrar novamente neste aparelho, use seu e-mail e senha.', 'Sair')) return;
    await saveBeforeLeaving();
    stopPlayback();
    currentGeneration++;
    player.cancelPreparation();
    await cloud.signOut();
    repo = null;
    state.songs = [];
    ownEdits.clear();
    state.offline.clear();
    state.admin = state.selected = null;
    state.selectedSignature = '';
    state.errors = state.syncLabel = '';
    render();
    return;
  }
  if (state.capture) return;
  if (action === 'preview') { if (state.view === 'admin') await previewWav(part); return; }
  if (musicianLink && ['new','browse','remove-file','delete','batch-import','add-custom','remove-custom','add-transition','remove-transition','backup','link'].includes(action)) return;
  if (action === 'song') {
    const song = songsFor(state.view).find(row => row.id === id);
    if (!song) return;
    if (state.view === 'live') {
      if (state.selected?.id === song.id || startPending || state.download) return;
      if (player.running && !await confirmChoice('Trocar de música?', 'A reprodução atual vai parar.', 'Trocar música')) return;
      if (player.running) stopPlayback();
      toggleLibrary(false);
      selectLive(await preferDownloaded(song));
    } else {
      await saveBeforeLeaving();
      state.admin = structuredClone(await repo.song(song.id) || song);
      state.editLabel = '';
      render();
    }
    return;
  }
  if (action === 'new') {
    await saveBeforeLeaving();
    state.admin = newSong();
    state.editLabel = '';
    render();
    get('[data-field="name"]').focus();
    return;
  }
  if (!state.admin) return;
  if (action === 'batch-import') { get('#batch-files')?.click(); return; }
  if (action === 'add-custom') {
    state.admin.customFills ||= [];
    state.admin.customFills.push({id:'fillCustom_'+crypto.randomUUID().replace(/-/g,'').slice(0,14),label:'Nova virada específica'});
    await persistDraft(); render(); return;
  }
  if (action === 'remove-custom') {
    if (!await confirmChoice('Excluir virada específica?', 'As regras que usam essa virada também serão removidas.', 'Excluir')) return;
    state.admin.customFills = (state.admin.customFills || []).filter(item => item.id !== part);
    delete state.admin.parts[part];
    for (const key of Object.keys(state.admin.parts)) if (fillBase(key) === part) delete state.admin.parts[key];
    for (const [key, value] of Object.entries(state.admin.transitions || {})) {
      if (value === part) delete state.admin.transitions[key];
    }
    await persistDraft(); render(); return;
  }
  if (action === 'add-transition') {
    const from = get('#transition-from')?.value, to = get('#transition-to')?.value, fill = get('#transition-fill')?.value;
    if (!from || !to) return;
    state.admin.transitions ||= {};
    if (fill) state.admin.transitions[from + '>' + to] = fill;
    else delete state.admin.transitions[from + '>' + to];
    await persistDraft(); render(); notice('Regra de transição salva.'); return;
  }
  if (action === 'remove-transition') {
    if (state.admin.transitions) delete state.admin.transitions[element.dataset.key];
    await persistDraft(); render(); return;
  }
  if (action === 'browse') {
    stopPreview();
    get('[data-file="' + part + '"]').click();
  } else if (action === 'remove-file') {
    stopPreview();
    delete state.admin.parts[part];
    await persistDraft();
    render();
  } else if (action === 'delete') {
    if (!await confirmChoice('Excluir música?', 'Ela sairá do seu repertório.', 'Excluir')) return;
    state.admin.deleted = true;
    await persistDraft();
    state.admin = null;
    render();
  } else if (action === 'resolve-local' || action === 'resolve-remote') {
    await saveBeforeLeaving();
    const local = await repo.song(state.admin.id);
    await repo.replaceWithRemote(local, action === 'resolve-local');
    state.admin = null;
    await refreshLocal();
    const saved = await repo.song(local.id);
    if (!saved.deleted) state.admin = structuredClone(saved);
    render();
    requestSync();
  }
}

document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && state.libraryOpen) { event.preventDefault(); toggleLibrary(false); }
});

app.addEventListener('click', event => {
  const target = event.target.closest('[data-action]');
  if (!target || target.disabled) return;
  handleAction(target).catch(error => notice(error.message || 'Não foi possível concluir.'));
});

app.addEventListener('input', event => {
  const input = event.target;
  if (input.id === 'search') {
    if (state.view === 'live') state.searchLive = input.value;
    else state.searchAdmin = input.value;
    updateLibrary();
    return;
  }
  if (input.id === 'volume') {
    state.volume = Number(input.value);
    player.volume(state.volume);
    return;
  }
  if (!state.admin || !input.validity.valid) return;
  if (input.dataset.customName) {
    const custom = state.admin.customFills?.find(item => item.id === input.dataset.customName);
    if (custom) { custom.label = input.value.slice(0,52); delayedSave(); }
    return;
  }
  if (input.dataset.field) {
    const field = input.dataset.field;
    if (['bpm', 'beats'].includes(field)) {
      if (!input.value || !Number(input.value)) return;
      state.admin[field] = Number(input.value);
    } else {
      state.admin[field] = input.value.trim();
      if (field === 'name') get('#editor-title').textContent = state.admin[field] || 'Nova música';
    }
    delayedSave();
  } else if (input.dataset.length && input.value && Number(input.value) >= 1) {
    const part = state.admin.parts?.[input.dataset.length];
    if (!part) return;
    const count = Number(input.value);
    if (input.dataset.unit === 'beats') { part.lengthBeats = count; part.bars = count/state.admin.beats; }
    else { part.bars = count; part.lengthBeats = count*state.admin.beats; }
    delayedSave();
  }
});

app.addEventListener('change', event => {
  if (event.target.id === 'batch-files') { batchPreview(event.target); return; }
  if (event.target.dataset.file) importWav(event.target).catch(error => notice(error.message));
});

app.addEventListener('submit', async event => {
  if (event.target.id === 'request-recovery-form') {
    event.preventDefault();
    const form = event.target;
    const button = form.querySelector('[type="submit"]');
    const message = form.querySelector('#recovery-message');
    button.disabled = true;
    message.textContent = 'Solicitando link…';
    try {
      await cloud.sendPasswordReset(new FormData(form).get('email').trim());
      message.textContent = 'Se o e-mail estiver cadastrado, confira sua caixa de entrada e spam.';
    } catch (error) {
      message.textContent = error.message || 'Não foi possível solicitar o link.';
    } finally { button.disabled = false; }
    return;
  }
  if (event.target.id === 'password-form') {
    event.preventDefault();
    const form = event.target;
    const data = new FormData(form);
    const password = String(data.get('password'));
    const confirmation = String(data.get('confirmation'));
    const output = form.querySelector('#password-error');
    const submit = form.querySelector('[type="submit"]');
    if (password.length < 8 || password !== confirmation) {
      output.textContent = password !== confirmation ? 'As senhas não coincidem.' : 'Use pelo menos 8 caracteres.';
      return;
    }
    submit.disabled = true;
    output.textContent = 'Confirmando acesso…';
    try {
      if (cloud.authFlow?.type === 'invite') await cloud.finishInvite(password);
      else await cloud.finishRecovery(password);
      output.textContent = '';
      await boot();
      notice(cloud.session() ? 'Senha configurada. Bem-vindo ao Loops Marks Pro.' :
        'Senha alterada. Entre com seu e-mail e a nova senha.');
    } catch (error) {
      output.textContent = error.message || 'Não foi possível concluir. Solicite outro link.';
    } finally { submit.disabled = false; }
    return;
  }
  if (event.target.id !== 'login-form') return;
  event.preventDefault();
  const form = event.target;
  const data = new FormData(form);
  const submit = form.querySelector('[type="submit"]');
  get('#login-error').textContent = '';
  submit.disabled = true;
  try {
    await cloud.signIn(String(data.get('email')).trim(), String(data.get('password')));
    await boot();
  } catch (error) {
    const errorOutput = get('#login-error');
    const message = error.message || 'Não foi possível confirmar seu login no Netlify Identity.';
    if (errorOutput) errorOutput.textContent = message;
    else notice(message);
  } finally { submit.disabled = false; }
});

window.addEventListener('resize', () => drawWave(lastProgress));
window.addEventListener('online', () => { updateTop(); requestSync(); });
window.addEventListener('offline', updateTop);
window.addEventListener('storage', event => {
  if (event.key === 'loops-marks-last-user-v3' && !event.newValue && repo && cloud.enabled) {
    stopPlayback();
    currentGeneration++;
    player.cancelPreparation();
    repo = null;
    state.songs = [];
    ownEdits.clear();
    state.offline.clear();
    state.selected = state.admin = null;
    state.selectedSignature = '';
    render();
  }
});
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') {
    if (draftTimer) persistDraft().catch(() => {});
    return;
  }
  if (player.running) {
    animate();
    keepScreen();
  } else requestSync();
});
setInterval(() => { if (document.visibilityState === 'visible') requestSync(); }, 20000);

async function boot() {
  await cloud.initialize();
  if (cloud.enabled && !cloud.session()) { render(); return; }
  repo = new Repository(cloud);
  render();
  await refreshLocal();
  if (state.view === 'admin' && !state.admin) {
    const first = songsFor('admin')[0];
    if (first) { state.admin = structuredClone(first); render(); }
  }
  if (state.view === 'live' && state.selected && !player.ready && !state.preparation) prepareLive();
  requestSync();
}

if ('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js').catch(() => {
  notice('Não foi possível ativar a abertura offline neste navegador.');
});
boot().catch(error => { cloud.authError = error.message || 'Falha ao abrir a central.'; render(); notice(cloud.authError); });
