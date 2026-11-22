import { MIX_CHANNELS, MIX_IDS, normalizeMix, effectiveGain, mixChannel, readLocalMix, writeLocalMix, hasSolo, soloExcluded } from './mixer.js';
import { Cloud, Repository, PARTS, PLAY_PARTS, MANUAL_PARTS, FINALES, newSong, MAX_FILE_BYTES, fillBase, fillVariantId, firstPlayablePart, liveCatalog, playableParts, extraSections, CRASH_STOPS, hasAudioPart, preparedCrashParts, crashSignature, AUTO_CRASHES, ATTACK_IDS, extraBreaks, cymbalSettings, RENAMEABLE_PARTS, partLabel, namedPart, renamePart, resetPartName, LAYER_IDS, LAYER_ACTIONS, layerVolume, stageFill } from './data.js';
import { suggestSlot } from './importer.js';
import { Player, bpmRange } from './audio.js';
import { METERS, meterOf, meterHint, meterChoice, beatUnitForChoice, countForMeter, classifyDuration, wavMeasure } from './meter.js';
import { exampleSongs } from './demo.js';
import { makeBackup, restoreBackup, triggerDownload } from './backup.js';
import { emptyLibrary, cleanLibrary, songKind, inFolder, repertoireEntries, repertoireSong, entryId, cleanEntryLabels } from './library-model.js';

import { MidiController, loadMidiSettings, saveMidiSettings } from './midi.js';

const APP_VERSION = 'V28';
// O link do músico carrega exclusivamente o Modo Palco Pro.
const musicianLink = new URL(location.href).searchParams.get('modo') === 'musico';
const versionTag = () => '<span class="version-tag" aria-label="Versão do aplicativo: ' + APP_VERSION + '" title="Versão ' + APP_VERSION + '">' + APP_VERSION + '</span>';
const app = document.querySelector('#app');
const dialog = document.querySelector('#dialog');
const toast = document.querySelector('#toast');
const cloud = new Cloud(window.LOOPS_CONFIG);
const icons = {
  pencil:'<path d="m15 5 4 4M4 20l4-1L20 7l-4-4L4 15z"/>',
  mixer:'<path d="M5 3v18m7-18v18m7-18v18M2 8h6m1 8h6m1-11h6"/>',
  fullscreen:'<path d="M9 3H3v6m12-6h6v6M3 15v6h6m12-6v6h-6"/>',
  midi: '<rect x="2" y="4" width="20" height="16" rx="2"/><path d="M7 4v16m5-16v16m5-16v16"/><path d="M6 4h3v9H6zm5 0h3v9h-3zm5 0h3v9h-3z" fill="currentColor" stroke="none"/>',
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
  folder: '<path d="M3 7v12h18V9H12l-2-3H3z"/>',
  arrowup:'<path d="m6 14 6-6 6 6"/>',
  arrowdown:'<path d="m6 10 6 6 6-6"/>',
  link: '<path d="m10 14 4-4m-5 6-2 2a4 4 0 0 1-6-6l4-4a4 4 0 0 1 6 0m2 0 2-2a4 4 0 0 1 6 6l-4 4a4 4 0 0 1-6 0" transform="translate(1 0) scale(.95 1)"/>',
};
const icon = key => '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
  (icons[key] || icons.wave) + '</svg>';
const escape = text => String(text ?? '').replace(/[&<>"']/g, key =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[key]);
const get = name => app.querySelector(name);
const safeStored = key => { try{return localStorage.getItem(key);}catch{return null;} };
const label = key => partLabel(state.admin,fillBase(key));
const idle = { running: false, beat: -1 };
const state = {
  view: !musicianLink && new URL(location.href).searchParams.get('modo') === 'central' ? 'admin' : 'live',
  songs: [], offline: new Map(), selected: null, admin: null, bpm: 0, volume: 0.82,
  preparation: '', syncLabel: '', errors: '', searchLive: '', searchAdmin: '',
  selectedSignature: '', info: idle, download: '', capture: null, libraryOpen: false,
  libraryData:emptyLibrary(), adminKind:'music', adminFolder:'', adminPanel:'editor',
  adminSearch:'', drawerTab:'all', repEditingId:null, activeRepId:null, activeRepPos:0,
  managementOpen:safeStored('loops-v12-management')!=='closed',
  sidebarCollapsed:safeStored('loops-v12-sidebar')==='collapsed',
  introOpen:safeStored('loops-v12-editor-intro')!=='closed',
  editorTab:(()=>{const remembered=safeStored('loops-v15-editor-tab') || (safeStored('loops-v14-editor-tab')==='crash'?'loopcrash':safeStored('loops-v14-editor-tab'));return ['dados','loops','loopcrash','crash','viradas','mapa','counter','passage','finais'].includes(remembered)?remembered:'dados';})(),
  catalogView:safeStored('loops-v14-catalog-view')==='lista'?'lista':'cards',
  pedalLearn:null,pedalMap:loadPedalMap(),pedalLastAt:0,
  liveCountEnabled:true,liveCountBars:1,

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

let mixerOpen=false;
const mixerPending=new Map();
let mixerWriteTimer;
function mixerSong(){return state.view==='live'?state.selected:(state.adminPanel==='editor'?state.admin:null);}
function profileFor(song){if(!song)return normalizeMix(null);if(song.repertoireKey)return ((musicianLink||song.demo)?readLocalMix(localStorage,song):null)||normalizeMix(song.mixer,song);return mixerPending.get(song.id)?.profile || ((musicianLink||song.demo)?readLocalMix(localStorage,song):null) || normalizeMix(song.mixer,song);}
function layerAvailable(key){return !!(player.ready&&player.song?.id===state.selected?.id&&hasAudioPart(state.selected,key)&&player.song.parts?.[key]?.path===state.selected.parts?.[key]?.path&&player.buffers.has(key));}
function previewGain(part,song){const profile=profileFor(song), channel=mixChannel(part,Boolean(song?.customFills?.some(p=>p.id===fillBase(part))));const trims=cymbalSettings(song);const trim=LAYER_IDS.includes(part)?layerVolume(song,part):/^autoCrash[123]$/.test(part)?trims.autoVolume:1;return effectiveGain(profile,'master')*effectiveGain(profile,channel)*trim;}
function hideMixer(){get('#mixer-panel')?.remove();app.querySelectorAll('[data-action="mixer-open"]').forEach(b=>b.setAttribute('aria-expanded','false'));}
function showMixer(){
  hideMixer();const song=mixerSong();if(!song){mixerOpen=false;notice('Selecione uma música ou ritmo para mixar.');return;}
  const profile=profileFor(song);
  app.insertAdjacentHTML('beforeend','<aside id="mixer-panel" class="mixer-panel" aria-label="Mixer Marks Pro"><div class="mixer-heading"><div><strong>Mixer Marks Pro</strong><small>'+escape(song.name||'Sem título')+'</small></div>'+iconButton('mixer-close','Fechar mixer','x')+'</div><div class="mixer-channels">'+MIX_CHANNELS.map(([id,name])=>'<div class="mixer-channel" data-mix-strip="'+id+'"><label for="mix-'+id+'">'+escape(name)+'</label><output data-mix-output="'+id+'">'+Math.round(profile[id].level*100)+'%</output><input type="range" class="mixer-fader" id="mix-'+id+'" data-mix-level="'+id+'" aria-label="Volume '+escape(name)+'" min="0" max="100" step="1" value="'+Math.round(profile[id].level*100)+'"><button type="button" class="mixer-mute" data-action="mixer-mute" data-channel="'+id+'" aria-pressed="'+profile[id].muted+'">MUTE</button>'+(id==='master'?'':'<button type="button" class="mixer-solo" data-action="mixer-solo" data-channel="'+id+'" aria-pressed="'+profile[id].solo+'">SOLO</button>')+'</div>').join('')+'</div><div class="mixer-footer">'+button('mixer-reset','Restaurar padrão','refresh','ghost')+button('mixer-clear-solo','Limpar SOLO','x','ghost')+'<small id="mixer-solo-status"></small><small>'+ (musicianLink?'Mix salvo neste aparelho':song.repertoireKey?'Mix salvo somente neste item · nuvem quando parado':'Salvamento automático · nuvem quando parado') +'</small></div></aside>');
  app.querySelectorAll('[data-action="mixer-open"]').forEach(b=>b.setAttribute('aria-expanded','true'));paintMixer(profile);
}
function paintMixer(profile){for(const id of MIX_IDS){const input=get('[data-mix-level="'+id+'"]'),output=get('[data-mix-output="'+id+'"]'),mute=get('[data-action="mixer-mute"][data-channel="'+id+'"]');if(input&&Number(input.value)!==Math.round(profile[id].level*100))input.value=String(Math.round(profile[id].level*100));if(output)output.textContent=Math.round(profile[id].level*100)+'%';if(mute)mute.setAttribute('aria-pressed',String(profile[id].muted));const solo=get('[data-action="mixer-solo"][data-channel="'+id+'"]');if(solo)solo.setAttribute('aria-pressed',String(profile[id].solo));get('[data-mix-strip="'+id+'"]')?.classList.toggle('solo-excluded',soloExcluded(profile,id));}const status=get('#mixer-solo-status');if(status)status.textContent=hasSolo(profile)?'SOLO ativo':'Mixagem normal';}
function setMixerValue(id,field,value){const song=mixerSong();if(!song||!MIX_IDS.includes(id))return;const profile=normalizeMix(profileFor(song),song);profile[id]={...profile[id],[field]:value};applyMixer(song,profile);}
function applyMixer(song,raw){
  const profile=normalizeMix(raw,song);if(!(song.repertoireKey&&(musicianLink||song.demo)))song.mixer=profile;
  if(state.view==='live'){state.volume=profile.master.level;player.updateMix(profile);}
  if(previewSound?.songId===song.id&&previewContext)previewSound.gain.gain.setTargetAtTime(previewGain(previewSound.part,song),previewContext.currentTime,.012);
  paintMixer(profile);
  if(song.repertoireKey){if(state.selected===song)state.selectedSignature=selectionSignature(song);if(musicianLink||song.demo){try{writeLocalMix(localStorage,song,profile);}catch{notice('Não foi possível salvar a mixagem neste aparelho.');}}else queueEntryMix(song,profile);return;}
  if(musicianLink||song.demo){try{writeLocalMix(localStorage,song,profile);}catch{notice('Não foi possível salvar a mixagem neste aparelho.');}return;}
  if(state.view==='admin'){delayedSave();return;}
  mixerPending.set(song.id,{profile,repository:repo});clearTimeout(mixerWriteTimer);mixerWriteTimer=setTimeout(flushMixerWrites,350);
}
const entryMixPending=new Map();let entryMixTimer,entryMixWrites=0;
function queueEntryMix(song,profile){
  const rep=state.libraryData.repertoires.find(r=>r.id===song.repertoireId);
  const item=rep?.items.find((i,n)=>entryId(i,n)===song.repertoireItemId);if(!item)return;
  item.itemId=song.repertoireItemId;item.mixer=structuredClone(profile);
  entryMixPending.set(song.repertoireKey,{repId:rep.id,itemId:item.itemId,profile:structuredClone(profile),repository:repo});
  clearTimeout(entryMixTimer);entryMixTimer=setTimeout(flushEntryMixWrites,350);
}
function flushEntryMixWrites(){clearTimeout(entryMixTimer);if(!entryMixPending.size)return;
  const batch=[...entryMixPending.values()];entryMixPending.clear();writesPending++;entryMixWrites++;
  draftWrites=draftWrites.catch(()=>{}).then(async()=>{const current=batch[0].repository;if(current!==repo)return;
    const library=await current.libraryState();for(const e of batch){if(e.repository!==current)continue;const rep=library.repertoires.find(r=>r.id===e.repId);const item=rep?.items.find((i,n)=>entryId(i,n)===e.itemId);if(item){item.itemId=e.itemId;item.mixer=e.profile;}}
    await current.saveLibrary(library);requestSync();
  }).catch(e=>notice(e.message||'Falha ao salvar a mixagem do repertório.')).finally(()=>{writesPending--;entryMixWrites--;});
}
function flushMixerWrites(){flushEntryMixWrites();clearTimeout(mixerWriteTimer);for(const [id,entry] of mixerPending){mixerPending.delete(id);writesPending++;draftWrites=draftWrites.catch(()=>{}).then(async()=>{const current=entry.repository;if(!current||current!==repo)return;const stored=await current.song(id);if(!stored||stored.deleted||stored.demo)return;const saved=await current.save({...stored,mixer:entry.profile});if(current!==repo)return;ownEdits.set(id,saved.edit);replaceLocalSong(saved);if(state.admin?.id===id&&!draftTimer&&state.view!=='admin')state.admin=structuredClone(saved);if(state.selected?.id===id&&!state.selected.repertoireKey){state.selected={...state.selected,mixer:mixerPending.get(id)?.profile||state.selected.mixer||entry.profile,edit:saved.edit,revision:saved.revision};state.selectedSignature=selectionSignature(state.selected);}requestSync();}).catch(e=>notice(e.message||'Não foi possível salvar a mixagem.')).finally(()=>writesPending--);}}
async function stageFullScreen(){if(document.fullscreenElement){await document.exitFullscreen?.();return;}if(document.documentElement.requestFullscreen){try{await document.documentElement.requestFullscreen();return;}catch{}}document.body.classList.toggle('palco-focus');}

function brand(extra = '') {
  return '<div class="brand ' + extra + '"><span class="mark">' + icon('wave') +
    '</span><span class="brand-titles"><strong>Loops Marks Pro <span class="brand-version">' + APP_VERSION +
    '</span></strong><small>'+ (state.view==='live'?'Modo Palco Pro':'Studio Marks') +'</small></span></div>';
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

function loadPedalMap(){
  try{const data=JSON.parse(localStorage.getItem('loops-v12-pedal-map')||'{}');
    return data&&typeof data==='object'&&!Array.isArray(data)?data:{};
  }catch{return {};}
}
function settingsMenu(user){
  return '<button type="button" class="nav-link v12-settings-btn v15-primary-nav" data-action="settings" title="Configurações">'+icon('settings')+'<span>Configurações</span></button>';
}
function adminSidebar() {
  const user=cloud.session()?.email||'Conta não conectada';
  const [status,statusIcon]=statusText();
  const expanded=state.managementOpen;
  return '<aside class="sidebar v11-sidebar v12-sidebar">'+
    '<div class="v12-brand-row">'+brand()+iconButton('collapse-sidebar',state.sidebarCollapsed?'Expandir lateral':'Recolher lateral','layers')+'</div>'+
    '<nav aria-label="Navegação principal"><button type="button" class="nav-link v12-group" data-action="toggle-management" aria-expanded="'+expanded+'" title="Gerenciamento">'+icon('grid')+'<span>Gerenciamento</span>'+icon(expanded?'arrowup':'arrowdown')+'</button>'+
    '<div class="v12-subnav" '+(expanded?'':'hidden')+'>'+
    '<button type="button" class="nav-link" data-action="admin" title="Central de loops" '+(state.adminPanel==='editor'?'aria-current="page"':'')+'>'+icon('grid')+'<span>Central de loops</span></button>'+
    '<button type="button" class="nav-link" data-action="show-kind" data-kind="music" title="Músicas" '+(state.adminKind==='music'&&state.adminPanel==='catalog'?'aria-current="page"':'')+'>'+icon('music')+'<span>Músicas</span></button>'+
    '<button type="button" class="nav-link" data-action="show-kind" data-kind="rhythm" title="Ritmos" '+(state.adminKind==='rhythm'&&state.adminPanel==='catalog'?'aria-current="page"':'')+'>'+icon('wave')+'<span>Ritmos</span></button>'+
    '<button type="button" class="nav-link" data-action="show-repertoires" title="Repertórios" '+(state.adminPanel==='repertoires'?'aria-current="page"':'')+'>'+icon('list')+'<span>Repertórios</span></button>'+
    '<button type="button" class="nav-link" data-action="show-folders" title="Gerenciar pastas" '+(state.adminPanel==='folders'?'aria-current="page"':'')+'>'+icon('folder')+'<span>Gerenciar pastas</span></button></div>'+
    '<div class="sidebar-rule"></div><button class="nav-link v15-primary-nav" data-action="live" title="Modo Palco Pro">'+icon('current')+'<span>Modo Palco Pro</span></button></nav>'+
    '<div class="v12-sidebar-bottom">'+settingsMenu(user)+'</div></aside>';
}
function shell() {
  const live=state.view==='live';
  const [status,statusIcon]=statusText();
  if(live) return '<div class="stage-shell'+(musicianLink?' musician-shell':'')+'"><header class="stage-topbar">'+
    (musicianLink?'<span class="stage-top-left"></span>':iconButton('admin','Central Administrativa','grid','data-stage-back'))+
    brand('stage-brand')+'<div class="stage-tools"><span class="stage-connection" title="'+escape(status)+'" id="sync-label">'+icon(statusIcon)+'<span>'+escape(status)+'</span></span>'+
    iconButton('pedal-setup','Configurar pedal Bluetooth','wave')+midiIcon()+iconButton('mixer-open','Mixer Marks Pro','mixer','aria-expanded="false"')+
    iconButton('stage-fullscreen','Tela cheia','fullscreen')+iconButton('open-library','Selecionar repertório','list','id="repertoire-toggle" aria-expanded="false" aria-controls="live-drawer"')+
    '</div></header><main class="stage-main">'+liveView()+'</main></div>';
  return '<div class="shell admin-shell v11-shell v12-shell '+(state.sidebarCollapsed?'v12-collapsed':'')+'">'+adminSidebar()+
    '<main class="main admin-main v11-main">'+adminView()+'</main></div>';
}

function loginView() {
  if(musicianLink)return '<main class="login"><section class="frame login-card">'+brand()+
    '<h1>Acesso do músico</h1><p>'+escape(cloud.authError||'Abra o link individual que você recebeu do administrador.')+'</p>'+
    '<p>O link de acesso pode ter sido revogado ou expirado.</p><div class="login-footer">Loops Marks Pro '+APP_VERSION+'</div></section></main>';
  return '<main class="login"><section class="frame login-card">' + brand() +
    '<h1>' + (musicianLink ? 'Entrar no Modo Palco Pro' : 'Entrar na central') + '</h1><p>Acesse com o e-mail convidado no Netlify Identity. No primeiro acesso, abra o convite para criar sua senha.</p>' +
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
  const rows=liveCatalog(state.songs);
  return view==='admin'?rows:rows.concat(cloud.enabled?[]:exampleSongs);
}
function library(view) {
  // No palco, o repertório aparece somente na gaveta discreta.
  return '<aside class="library frame repertoire-drawer" id="live-drawer" role="dialog" aria-modal="true" aria-label="Selecionar música, ritmo ou repertório" hidden>'+
    '<div class="library-head"><div><p class="library-overline">BIBLIOTECA</p><h2>Seleção de palco</h2></div><div class="library-head-tools"><span class="count" id="song-count"></span>'+iconButton('close-library','Fechar biblioteca','x')+'</div></div>'+
    '<div class="drawer-tabs">'+[['all','Tudo'],['music','Músicas'],['rhythm','Ritmos'],['repertoires','Repertórios']].map(([id,txt])=>'<button type="button" data-action="drawer-tab" data-tab="'+id+'" '+(state.drawerTab===id?'aria-pressed="true"':'')+'>'+txt+'</button>').join('')+'</div>'+
    '<label class="search">'+icon('search')+'<input id="search" type="search" autocomplete="off" placeholder="Buscar no repertório" aria-label="Buscar" value="'+escape(state.searchLive)+'"></label>'+
    '<div class="items" id="items"></div><div class="library-download"><p>PREPARAR OFFLINE</p>'+
    button('download','Baixar música selecionada','download','ghost','id="download-btn"')+
    button('download-repertoire','Baixar repertório completo','download','ghost','id="download-rep-btn"')+
    '</div><div class="library-foot">'+icon('headphones')+'<span>Baixe os áudios e confira em Modo Avião antes da apresentação.</span></div></aside>';
}
function liveView() {
  return '<div class="live-workspace"><section class="deck stage-deck" aria-label="Player de loops">'+deck()+'</section>'+
    '<div id="drawer-backdrop" class="drawer-backdrop" data-action="close-library" hidden></div>'+library('live')+'</div>';
}
function toggleLibrary(open) {
  const drawer=get('#live-drawer'),backdrop=get('#drawer-backdrop'),trigger=get('#repertoire-toggle');
  if(!drawer||!backdrop)return;
  state.libraryOpen=open;drawer.hidden=!open;backdrop.hidden=!open;
  trigger?.setAttribute('aria-expanded',String(open));document.body.classList.toggle('drawer-visible',open);
  if(open)drawer.querySelector('#search')?.focus();else trigger?.focus();
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
  const parts = playableParts(song).filter(part => hasAudioPart(song,part.id));
  const countPresent = Boolean(song.parts?.countIntro?.path);
  const countReady = countPresent && state.liveCountEnabled;
  const introReady = Boolean(song.parts?.intro?.path);
  const openingLabel = (countReady ? 'Contagem de baquetas ('+state.liveCountBars+' comp.) → ' : '') +
    (introReady ? 'Introdução musical ('+(song.introMode==='repeat'?'repete até comando':'uma vez')+') → ' : '') + 'Parte escolhida';
  const manual = [...PARTS.filter(p=>(p.group==='manuais'||p.group==='automaticas')&&stageFill(p)).map(p=>namedPart(song,p)),...(song.customFills||[]).map(p=>({...p,icon:'wave'}))].filter(part => Object.keys(song.parts || {}).some(id => fillBase(id) === part.id && hasAudioPart(song,id)));
  const endings = FINALES.filter(part => hasAudioPart(song,part.id));
  const crashStops = CRASH_STOPS.filter(part => hasAudioPart(song, part.id));
  const ride=PARTS.filter(p=>LAYER_IDS.includes(p.id)&&hasAudioPart(song,p.id));
  const autoCrash= AUTO_CRASHES.some(p=>hasAudioPart(song,p.id));
  const liveBreaks=extraBreaks(song).filter(p=>hasAudioPart(song,p.id));
  const breakPads=group=>{const items=liveBreaks.filter(p=>p.group===group);return items.length?'<div class="live-break-group" hidden><div class="section-head live-subsection"><h2>'+(group==='counter'?'Contratempos':'Passagens')+'</h2><span>Tempo 1 · retorno automático</span></div><div class="pads">'+items.map(p=>'<button type="button" class="pad fill-pad" data-action="break" data-part="'+escape(p.id)+'" hidden disabled>'+icon('wave')+'<strong>'+escape(p.label)+'</strong><small>'+escape(song.parts[p.id].bars)+' comp.</small></button>').join('')+'</div></div>':'';};
  const activeRep=(state.libraryData.repertoires||[]).find(r=>r.id===state.activeRepId);
  const repEntries=activeRep?repertoireEntries(activeRep,songsFor('live')):[];
  const repNav=repEntries.length?'<div class="live-rep-strip"><span>'+icon('list')+' '+escape(activeRep.name)+' · '+(state.activeRepPos+1)+'/'+repEntries.length+'</span><div>'+iconButton('rep-prev-live','Música anterior','arrowup',''+(state.activeRepPos===0?'disabled':''))+iconButton('rep-next-live','Próxima música','arrowdown',''+(state.activeRepPos===repEntries.length-1?'disabled':''))+'</div></div>':'';
  return '<section class="frame">'+repNav+'<div class="deck-header"><div><h2>'+escape(song.name)+'</h2><p class="track-meta">' +
    (song.occasion ? escape(song.occasion) + ' · ' : '') + escape(song.bpm) + ' BPM original · ' + escape(meterOf(song)) +
    ' · ' + escape(song.beats) + ' pulsos</p></div><span class="chip" id="player-chip"></span></div>' +
    '<div class="stage-status" role="status" aria-live="polite"><div class="stage-status-main"><span class="stage-status-label">PARTE EM EXECUÇÃO</span>' +
    '<strong id="stage-active">' + escape(playableParts(song).find(p => p.id === openingPart)?.label || 'Aguardando') + '</strong></div>' +
    '<div class="stage-status-side"><span id="stage-mode">Pronto · contínuo</span><small id="stage-next"></small></div></div>' +
    '<div class="wave-box"><canvas id="waveform" role="img" aria-label="Forma de onda da parte atual"></canvas><div>' +
    '<span id="wave-caption">' + escape(playableParts(song).find(part => part.id === openingPart)?.label || 'Loop') + '</span><span id="wave-caption-right">Compasso</span></div></div>' +
    '<div class="transport"><div class="tempo">' + iconButton('slower', 'Diminuir BPM', 'minus', 'id="slower"') +
    '<div class="bpm-center"><strong id="bpm">' + escape(state.bpm) + '</strong><small>BPM</small></div>' +
    iconButton('faster', 'Aumentar BPM', 'plus', 'id="faster"') + '</div><div class="transport-actions">' +
    button('play', 'Iniciar', 'play', 'primary', 'id="play-btn"') +
    iconButton('stop', 'Parar imediatamente', 'stop', 'id="stop-btn" disabled') +
    '</div><div class="meter" aria-label="Tempos do compasso">' +
    Array.from({ length: song.beats }, (_, index) => '<span class="pulse">' + (index + 1) + '</span>').join('') +
    '</div></div><div class="deck-line"><p class="player-message" id="player-message" aria-live="polite"></p>' +
    '</div>' +
    '<div class="queue-tools">' + button('cancel-queue', 'Cancelar troca agendada', 'x', 'ghost', 'id="cancel-btn" disabled hidden') +
    '<button type="button" class="mode-toggle" data-action="mode-toggle" id="fill-mode" title="Alternar motor de viradas" ' +
    'aria-label="Modo de virada: inteligente ou completa">' +
    icon('wave') + '<span>Virada: ' + (player.mode === 'full' ? 'PRÓXIMO 1' : 'INTELIGENTE') + '</span></button>' +
    '<button type="button" class="mode-toggle count-live-toggle" id="live-count-toggle" data-action="toggle-live-count" aria-pressed="'+countReady+'" '+(!countPresent?'disabled title="Importe um WAV de contagem primeiro"':'title="Ativar ou desativar contagem antes de Iniciar"')+'>'+icon('wave')+'<span>Contagem: '+(countReady?'LIGADA':'DESLIGADA')+'</span></button>'+
    '<label class="live-count-bars" for="live-count-bars" title="Compassos da contagem inicial">Compassos <select id="live-count-bars" aria-label="Compassos da contagem inicial" '+(!countPresent?'disabled':'')+'><option value="1" '+(state.liveCountBars===1?'selected':'')+'>1 comp.</option><option value="2" '+(state.liveCountBars===2?'selected':'')+'>2 comp.</option></select></label>'+
    '<span id="pedal-status-live" class="pedal-live-feedback" aria-live="polite"></span></div></section>' +
    '<section class="frame live-sections"><div class="section-head"><h2>Partes da música</h2><span>Entrada no tempo 1</span></div>' +
    '<div class="pads">' + (hasAudioPart(song,'intro')?'<button class="pad" type="button" data-action="restart-intro" data-part="intro" disabled>'+icon('spark')+'<strong>'+escape(partLabel(song,'intro'))+'</strong><small>Iniciar pela abertura</small></button>':'') + parts.map(part => '<button type="button" class="pad" data-action="part" data-part="' + part.id +
    '" disabled>' + icon(part.icon) + '<strong>' + escape(part.label) + '</strong><small>' + (song.parts?.[part.id + 'Entry'] ? 'Entrada + contínuo' : 'Loop contínuo') + '</small></button>').join('') +
    '</div><p class="v19-opening-hint" id="opening-path">'+icon('music')+' <strong>Abertura:</strong> '+escape(openingLabel)+'</p>' + (song.kind!=='rhythm'&&(song.sequence||[]).length ? '<div class="live-map-toolbar"><span id="live-map-status">Mapa musical · '+escape(song.sequenceMode==='automatic'?'Automático':'Assistido')+'</span>'+iconButton('map-previous','Etapa anterior','arrowup')+button('map-next','Próxima parte','arrowdown','ghost')+'</div>':'') + (manual.length ? '<div class="section-head live-subsection"><h2>Viradas disponíveis</h2><span>Retorna ao loop</span></div>' +
    '<div class="pads manual-pads">' + manual.map(part => '<button type="button" class="pad fill-pad" data-action="fill" data-part="' +
    part.id + '" disabled>' + icon(part.icon) + '<strong>' + escape(part.label) + '</strong><small>Virada avulsa</small></button>').join('') +
    '</div>' : '') + (crashStops.length ? '<div id="live-crashes" hidden><div class="section-head live-subsection"><h2>Crash · Ataques adicionais</h2><span>Tocam no próximo tempo 1, sem parar a bateria</span></div>' +
    '<div class="pads crash-pads">' + crashStops.map(part => '<button type="button" class="pad crash-stop-pad" data-action="crash" data-part="' + part.id + '" hidden disabled>' +
    icon('spark') + '<strong>' + escape(part.label) + '</strong><small>Prato sobre o loop</small></button>').join('') + '</div></div>' : '') +
    (autoCrash?'<div id="live-auto-crash" hidden><div class="section-head live-subsection"><h2>Crash automático</h2><span>Após viradas</span></div><button type="button" class="mode-toggle" data-action="auto-crash-toggle" id="auto-crash-toggle" disabled>'+icon('spark')+'<span>Crash automático</span></button></div>':'') +
    (ride.length?'<div id="live-ride" hidden><div class="section-head live-subsection"><h2>Pratos de condução</h2><span>Condução e aberto: refrão · fechado: partes leves</span></div><div class="pads">'+ride.map(p=>'<button type="button" class="pad" data-action="'+LAYER_ACTIONS[p.id]+'" data-part="'+p.id+'" hidden disabled>'+icon('wave')+'<strong>'+escape(p.label)+'</strong><small>Desativado</small></button>').join('')+'</div></div>':'') + breakPads('counter')+breakPads('passage')+
    (endings.length ? '<div class="section-head live-subsection"><h2>Encerramentos</h2><span>Toque uma vez</span></div>' +
    '<div class="pads end-pads">' + endings.map(part => '<button type="button" class="pad final ' + (part.id === 'finish' ? 'finish' : '') +
    '" data-action="part" data-part="' + part.id + '" disabled>' + icon(part.icon) + '<strong>' + escape(part.label) +
    '</strong><small>Finaliza a execução</small></button>').join('') + '</div>' : '') +
    (!manual.length && !endings.length && !crashStops.length && !ride && !autoCrash && !liveBreaks.length ? '<p class="subtle note">Cadastre viradas, crash e acabamentos na Central Administrativa.</p>' : '') +
    '</section>';
}

function adminView() {
  const title=state.adminPanel==='folders'?'Organizar pastas':state.adminPanel==='repertoires'?'Meus repertórios':state.adminPanel==='catalog'?(state.adminKind==='rhythm'?'Biblioteca de ritmos':'Biblioteca de músicas'):'Central Administrativa';
  const desc=state.adminPanel==='folders'?'Organize músicas e ritmos em pastas sem mover os WAVs.':
    state.adminPanel==='repertoires'?'Monte apresentações com músicas e ritmos, na ordem que desejar.':state.adminPanel==='catalog'?'Escolha uma pasta e abra o cadastro que deseja editar.':
    'Seu repertório, seus loops e as regras de palco no mesmo lugar.';
  const action=state.adminPanel==='repertoires'?button('new-repertoire','Novo repertório','plus','primary'):
    ['editor','catalog'].includes(state.adminPanel)?button('new',state.adminKind==='rhythm'?'Novo ritmo':'Nova música','plus','primary'):'';
  const [syncStatus,syncIcon]=statusText();
  return '<div class="v11-heading"><div><h1>'+title+'</h1><p>'+desc+'</p></div><div class="admin-quick-actions">'+action+
    iconButton('pedal-setup','Configurar pedal Bluetooth','wave')+midiIcon()+iconButton('mixer-open','Mixer Marks Pro','mixer','aria-expanded="false"')+
    '<span class="v15-sync-status" id="sync-label" title="'+escape(syncStatus)+'" role="status">'+icon(syncIcon)+'<span>'+escape(syncStatus)+'</span></span></div></div>'+ 
    (state.errors?'<div class="warning" role="status">'+escape(state.errors)+' '+button('sync','Tentar sincronizar','refresh','ghost')+'</div>':'')+
    '<section class="frame admin-editor v11-editor">'+(state.adminPanel==='folders'?foldersPanel():state.adminPanel==='catalog'?catalogPanel():
      state.adminPanel==='repertoires'?repertoiresPanel():state.admin?editor():
      '<div class="blank"><h2>Escolha um item na biblioteca</h2><p>Use o menu lateral para selecionar ou criar uma música ou um ritmo.</p></div>')+'</section>';
}
function catalogPanel(){
  const kind=state.adminKind;
  const folders=kindFolders(kind);
  return '<div class="v12-catalog-head"><div><p class="eyebrow">BIBLIOTECA DE '+(kind==='rhythm'?'RITMOS':'MÚSICAS')+'</p><h2>Selecione para editar</h2><p>Biblioteca organizada por pasta, com edição em tela ampla.</p></div>'+
    '<span class="count" id="catalog-count">0</span></div>'+
    '<div class="v12-catalog-filters"><label class="search">'+icon('search')+'<input type="search" id="admin-search" aria-label="Pesquisar biblioteca" placeholder="Pesquisar por nome, momento ou BPM" value="'+escape(state.adminSearch)+'"></label>'+
    '<div class="v12-folder-filters"><button class="sidebar-folder" data-action="select-folder" data-folder="" '+(!state.adminFolder?'aria-current="true"':'')+'>Todas</button>'+
    folders.map(f=>'<button class="sidebar-folder" data-action="select-folder" data-folder="'+escape(f.id)+'" '+(state.adminFolder===f.id?'aria-current="true"':'')+'>'+icon('folder')+escape(f.name)+'</button>').join('')+'</div></div>'+
    '<div class="v14-catalog-view" role="group" aria-label="Modo de visualização">'+
    '<button class="v14-view-toggle" data-action="catalog-view" data-mode="cards" aria-pressed="'+(state.catalogView==='cards')+'">'+icon('grid')+' Cards</button>'+
    '<button class="v14-view-toggle" data-action="catalog-view" data-mode="lista" aria-pressed="'+(state.catalogView==='lista')+'">'+icon('list')+' Lista</button></div>'+
    '<div class="v12-catalog-grid '+(state.catalogView==='lista'?'v14-list':'')+'" id="catalog-items"></div>';
}
function kindFolders(kind){return (state.libraryData.folders||[]).filter(f=>f.kind===kind).sort((a,b)=>a.name.localeCompare(b.name,'pt-BR'));}
function foldersPanel(){
  return '<div class="editor-panel-head"><div><p class="eyebrow">ORGANIZAÇÃO</p><h2>Pastas da biblioteca</h2><p>Uma pasta vazia pode ser excluída sem apagar músicas ou áudios.</p></div></div>'+
    '<form id="create-folder-form" class="v11-form-row"><label class="field"><span>Nome da pasta</span><input name="name" maxlength="70" required placeholder="Ex.: Casamentos ou Rock"></label>'+
    '<label class="field"><span>Biblioteca</span><select name="kind"><option value="music">Músicas</option><option value="rhythm">Ritmos</option></select></label><button class="button primary" type="submit">'+icon('plus')+'Criar pasta</button></form>'+
    ['music','rhythm'].map(kind=>'<div class="folder-block"><h3>'+(kind==='music'?'Músicas':'Ritmos')+'</h3>'+
      (kindFolders(kind).map(f=>'<div class="folder-admin-row">'+icon('folder')+
        '<input aria-label="Renomear pasta" data-folder-name="'+escape(f.id)+'" maxlength="70" value="'+escape(f.name)+'">'+
        '<span>'+state.songs.filter(s=>!s.deleted&&s.folderId===f.id).length+' itens</span>'+
        iconButton('delete-folder','Excluir pasta, sem apagar itens','trash','data-id="'+escape(f.id)+'"')+'</div>').join('')||'<p class="subtle">Nenhuma pasta cadastrada.</p>')+'</div>').join('');
}
function repertoiresPanel() {
  const reps=state.libraryData.repertoires||[];
  const rep=reps.find(r=>r.id===state.repEditingId)||reps[0];
  const songs=liveCatalog(state.songs).sort((a,b)=>(a.name||'').localeCompare(b.name||'','pt-BR'));
  const entries=rep?repertoireEntries(rep,songs):[];
  return '<div class="editor-panel-head"><div><p class="eyebrow">APRESENTAÇÕES</p><h2>Repertórios personalizados</h2><p>Uma música ou ritmo pode participar de quantos repertórios você precisar, sem duplicar o WAV.</p></div></div>'+
    '<div class="repertoire-admin-layout"><div class="rep-list">'+(reps.map(r=>'<button class="rep-item" data-action="edit-repertoire" data-id="'+escape(r.id)+'" '+(r.id===rep?.id?'aria-pressed="true"':'')+'>'+icon('list')+'<span><strong>'+escape(r.name)+'</strong><small>'+r.items.length+' itens</small></span></button>').join('')||'<p class="subtle">Nenhum repertório ainda.</p>')+'</div>'+
    '<div class="rep-detail">'+(!rep?'<div class="blank"><h2>Crie seu primeiro repertório</h2><p>Adicione músicas ou ritmos e organize a ordem da apresentação.</p></div>':
      '<div class="rep-detail-head"><label class="field"><span>Nome do repertório</span><input data-rep-field="name" maxlength="90" value="'+escape(rep.name)+'"></label>'+
      '<label class="field"><span>Data (opcional)</span><input data-rep-field="date" type="date" value="'+escape(rep.date||'')+'"></label></div>'+
      '<div class="rep-actions">'+button('use-repertoire','Abrir no Modo Palco Pro','play','primary')+button('duplicate-repertoire','Duplicar','layers','ghost')+button('delete-repertoire','Excluir','trash','ghost danger')+'</div>'+
      '<div class="section-head"><h2>Ordem de execução</h2><span>'+entries.length+' itens disponíveis</span></div>'+
      '<div class="rep-tracks">'+(rep.items.map((item,index)=>{
        const song=songs.find(s=>s.id===item.songId);
        return '<div class="rep-track"><span class="rep-track-num">'+(index+1)+'</span><span class="rep-track-name"><input type="text" maxlength="90" data-rep-title="'+index+'" aria-label="Nome da música neste repertório" placeholder="Nome neste repertório" value="'+escape(item.title||song?.name||'')+'"><small>'+(songKind(song)==='rhythm'?'Ritmo':'Música')+(song?' · '+song.bpm+' BPM':'')+'</small></span>'+
          '<label class="rep-bpm">BPM<input type="number" min="'+(song?bpmRange(song.bpm)[0]:30)+'" max="'+(song?bpmRange(song.bpm)[1]:280)+'" data-rep-bpm="'+index+'" placeholder="Original" value="'+(item.bpm||'')+'" aria-label="BPM do item '+(index+1)+'" title="Ajuste seguro: até 10 BPM acima ou abaixo do WAV original"></label>'+
          iconButton('rep-customize','Personalizar partes e mixagem deste item','settings','data-index="'+index+'" '+(song?'':'disabled'))+
          iconButton('rep-up','Subir item','arrowup','data-index="'+index+'" '+(index===0?'disabled':''))+
          iconButton('rep-down','Descer item','arrowdown','data-index="'+index+'" '+(index===rep.items.length-1?'disabled':''))+
          iconButton('rep-remove','Remover do repertório','trash','data-index="'+index+'"')+'</div>';}).join('')||'<p class="subtle">Adicione uma música ou ritmo abaixo.</p>')+'</div>'+
      '<div class="v11-form-row rep-add"><label class="field"><span>Nome da música no repertório</span><input id="rep-add-name" maxlength="90" placeholder="Ex.: Deus Cuida de Mim"></label><label class="field"><span>Selecionar música ou ritmo existente</span><select id="rep-add-song">'+
      songs.map(s=>'<option value="'+escape(s.id)+'">'+escape(s.name||'Sem título')+' · '+(songKind(s)==='rhythm'?'Ritmo':'Música')+'</option>').join('')+'</select></label><label class="field"><span>BPM desta música (opcional)</span><input id="rep-add-bpm" type="number" min="30" max="280" placeholder="BPM original"></label>'+button('rep-add','Adicionar ao repertório','plus','primary',songs.length?'':'disabled')+'</div><p class="v17-rep-help">Ao selecionar um ritmo, informe o nome da música e seu BPM. Use a engrenagem para personalizar nomes e mixagem de cada item. O ritmo original e os arquivos WAV permanecem intactos. O ajuste seguro de andamento é de até ±10 BPM do WAV original.</p>')+'</div></div>';
}

function field(key, title, value, attrs = '') {
  return '<label class="field"><span>' + title + '</span><input data-field="' + key + '" value="' +
    escape(value) + '" ' + attrs + '></label>';
}

function editorSection(song, group, title, helper, open = false) {
  const items = PARTS.filter(part => part.group === group).map(p=>namedPart(song,p));
  const count = items.filter(part => group === 'crashstops' ? hasAudioPart(song,part.id) : song.parts?.[part.id]).length;
  return '<details class="editor-group" ' + (open ? 'open' : '') + '><summary><span>' + icon(group === 'loops' ? 'music' :
    group === 'finais' ? 'flag' : 'wave') + '<strong>' + escape(title) + '</strong></span><small>' + count + '/' + items.length +
    ' áudios</small></summary><p class="group-hint">' + escape(helper) + '</p><div class="file-list">' +
    items.map(part => fileRow(part, group === 'crashstops' && !hasAudioPart(song,part.id) ? undefined : song.parts?.[part.id], song)).join('') + '</div></details>';
}

function availableFillChoices(song) {
  return [...PARTS.filter(p => p.type === 'virada').map(p=>namedPart(song,p)), ...(song.customFills || [])]
    .filter(part => Object.keys(song.parts || {}).some(id => fillBase(id) === part.id));
}

function variantEditor(song) {
  const variants = [...PARTS.filter(p => p.type === 'virada').map(p=>namedPart(song,p)), ...(song.customFills || [])];
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
  const loopOptions = [{id:'intro',label:partLabel(song,'intro')}, ...playableParts(song)];
  const targetOptions = [...playableParts(song), ...FINALES];
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
      const fillLabel = value==='none' ? 'Sem virada' : partLabel(song,value);
      return '<div class="transition-row"><span><strong>'+escape(fromLabel)+' → '+escape(toLabel)+'</strong><small>'+escape(fillLabel)+'</small></span>' +
        iconButton('remove-transition','Remover regra','trash','data-key="'+escape(key)+'"')+'</div>';
    }).join('') + '</div></details>';
}


function sequenceEditor(song) {
  if(songKind(song)==='rhythm') return '<div class="v13-rhythm-map-note">Ritmo livre: controle as partes, viradas e o final diretamente no Modo Palco Pro ou pelo pedal.</div>';
  const sections=[...(song.parts?.intro?[{id:'intro',label:partLabel(song,'intro')}]:[]),...playableParts(song).filter(p=>song.parts?.[p.id]),...FINALES.filter(p=>song.parts?.[p.id]),...CRASH_STOPS.filter(p=>song.parts?.[p.id])];
  const stages=song.sequence||[];
  const lookup=id=>sections.find(p=>p.id===id)?.label || id;
  return '<details class="editor-group v13-sequence-editor" open><summary><span>'+icon('list')+'<strong>04 · Mapa da sequência musical</strong></span><small>'+stages.length+' etapas</small></summary>'+
    '<p class="group-hint">Monte a ordem da música; volte para outras partes, repita refrões e escolha se a passagem acontece automaticamente ou ao tocar em Próxima parte. Ritmos continuam livres.</p>'+
    '<div class="v13-sequence-options"><label class="field"><span>Execução do mapa</span><select data-field="sequenceMode">'+
      '<option value="assisted" '+(song.sequenceMode!=='automatic'?'selected':'')+'>Assistida · avançar quando eu tocar</option><option value="automatic" '+(song.sequenceMode==='automatic'?'selected':'')+'>Automática · respeitar repetições</option></select></label>'+
    '<p class="subtle">O mapa não altera os WAVs. Cada etapa aponta para um loop ou acabamento que você já cadastrou.</p></div>'+
    '<div class="v13-sequence-list">'+(stages.map((step,index)=>'<div class="v13-sequence-step"><span class="v13-step-num">'+(index+1)+'</span>'+
      '<label class="field"><span>Parte</span><select data-seq-part="'+index+'">'+sections.map(part=>'<option value="'+escape(part.id)+'" '+(part.id===step.part?'selected':'')+'>'+escape(part.label)+'</option>').join('')+'</select></label>'+
      '<label class="field v13-small-field"><span>Repetir</span><select data-seq-repeats="'+index+'" '+(step.part==='intro'?'disabled':'')+'>'+
        '<option value="0" '+(step.repeats===0?'selected':'')+'>Até comando</option>'+
        Array.from({length:16},(_,n)=>'<option value="'+(n+1)+'" '+(step.repeats===n+1?'selected':'')+'>'+(n+1)+'×</option>').join('')+'</select></label>'+
      '<label class="field v13-small-field"><span>Depois</span><select data-seq-jump="'+index+'"><option value="-1">Próxima</option>'+stages.filter(s=>s.part!=='intro').map((s)=>{const n=stages.indexOf(s);return '<option value="'+n+'" '+(step.jumpTo===n?'selected':'')+'>'+String(n+1).padStart(2,'0')+' · '+escape(lookup(s.part))+'</option>';}).join('')+'</select></label>'+
      '<div class="v13-step-actions">'+iconButton('seq-up','Subir etapa','arrowup','data-index="'+index+'" '+(index===0?'disabled':''))+iconButton('seq-down','Descer etapa','arrowdown','data-index="'+index+'" '+(index===stages.length-1?'disabled':''))+iconButton('seq-remove','Excluir etapa','trash','data-index="'+index+'"')+'</div></div>').join('')||'<p class="subtle">Adicione uma primeira etapa para montar sua música.</p>')+'</div>'+
    '<div class="v13-sequence-add"><label class="field"><span>Adicionar parte</span><select id="seq-add-part">'+sections.map(part=>'<option value="'+escape(part.id)+'">'+escape(part.label)+'</option>').join('')+'</select></label>'+button('seq-add','Adicionar etapa','plus','ghost',sections.length?'':'disabled')+'</div>'+
    '<p class="subtle">No Modo Palco Pro, Próxima parte segue o mapa. No modo automático, cada loop é contado em compassos e as entradas são agendadas pelo relógio do áudio. Etapas “Até comando” aguardam sua decisão.</p></details>';
}
function customSectionsEditor(song){
  const sections=extraSections(song);
  return '<details class="editor-group v13-extra-sections"><summary><span>'+icon('layers')+'<strong>Mais partes musicais</strong></span><small>'+sections.length+' personalizadas</small></summary>'+
    '<p class="group-hint">Acrescente Verso 2, Ponte, Solo, Interlúdio, Coda, Parte D, E e outros loops. Cada um pode ter uma entrada com prato.</p>'+
    '<div class="v13-extra-list">'+sections.map(part=>'<div class="v13-extra-item"><div class="v13-extra-heading"><span class="subtle">Parte personalizada · edite o nome abaixo</span>'+iconButton('section-remove','Excluir esta parte','trash','data-id="'+part.id+'"')+'</div>'+fileRow(part,song.parts?.[part.id],song)+'</div>').join('')+'</div>'+button('section-add','Criar nova parte','plus','ghost')+'</details>';
}


// As entradas com crash de partes personalizadas também ficam na aba Loop + Crash.
function customEntryEditor(song){
  const sections=extraSections(song);
  if(!sections.length)return '';
  return '<details class="editor-group v15-extra-entries"><summary><span>'+icon('spark')+
    '<strong>Loop + Crash · Partes personalizadas</strong></span><small>'+sections.filter(part=>song.parts?.[part.id+'Entry']).length+'/'+sections.length+' áudios</small></summary>'+
    '<p class="group-hint">Cada entrada com prato toca uma vez antes do respectivo loop contínuo.</p><div class="file-list">'+
    sections.map(part=>fileRow({...part,id:part.id+'Entry',label:'Entrada '+part.label+' com crash',group:'entradas',type:'entrada'},song.parts?.[part.id+'Entry'],song)).join('')+'</div></details>';
}
function editor() {
  const song = state.admin;
  const customized = song.customFills || [];
  return '<div class="deck-header"><div><p class="eyebrow">EDITOR DE LOOPS</p><h2 id="editor-title">' + escape(song.name || (songKind(song)==='rhythm'?'Novo ritmo':'Nova música')) +
    '</h2><p class="track-meta" id="save-label">Salvamento automático</p></div>' +
    iconButton('delete', songKind(song)==='rhythm'?'Excluir ritmo':'Excluir música', 'trash') + '</div>' +
    (song.conflict ? '<div class="warning" role="status">Esta música foi editada em outro aparelho.' +
      '<div>' + button('resolve-remote', 'Usar versão da central', 'cloud', 'ghost') +
      button('resolve-local', 'Publicar minha edição', 'check', 'ghost') + '</div></div>' : '') +
    '<details class="v12-editor-intro" id="v12-editor-intro" '+(state.introOpen?'open':'')+'><summary>'+icon('settings')+'<strong>Dados e comportamento musical</strong><span>'+escape(song.bpm)+' BPM · '+escape(meterOf(song))+' · '+(songKind(song)==='rhythm'?'Ritmo':'Música')+'</span></summary><div class="v12-editor-intro-body">'+
    '<div class="v11-classification"><label class="field"><span>Tipo de cadastro</span><select data-field="kind">' +
    ['music','rhythm'].map(k=>'<option value="'+k+'" '+(songKind(song)===k?'selected':'')+'>'+(k==='music'?'Música específica':'Ritmo reutilizável')+'</option>').join('')+'</select></label>' +
    '<label class="field"><span>Pasta</span><select data-field="folderId"><option value="">Sem pasta</option>' +
    kindFolders(songKind(song)).map(f=>'<option value="'+escape(f.id)+'" '+(song.folderId===f.id?'selected':'')+'>'+escape(f.name)+'</option>').join('')+'</select></label></div>' +
    (songKind(song)==='rhythm' ? '<div class="v11-rhythm-template"><span>Use esta bateria em outras músicas sem reimportar os WAVs.</span>'+button('make-from-rhythm','Criar música a partir deste ritmo','plus','ghost')+'</div>' : '') +
    '<div class="section-head"><h2>01 · Identificação</h2><span>Salva automaticamente</span></div>' +
    '<div class="form-grid">' + field('name', songKind(song)==='rhythm'?'Nome do ritmo':'Nome da música', song.name, songKind(song)==='rhythm'?'maxlength="90" placeholder="Ex.: Balada Pop, Blues 6/8, Valsa"':'maxlength="90" placeholder="Ex.: Entrada da noiva"') +
    field('occasion', songKind(song)==='rhythm'?'Estilo musical':'Momento', song.occasion, songKind(song)==='rhythm'?'maxlength="55" placeholder="Ex.: Pop, Blues, Sertanejo"':'maxlength="55" placeholder="Ex.: Entrada"') +
    field('bpm', 'BPM original', song.bpm, 'type="number" min="30" max="280"') +
    '<label class="field"><span>Fórmula de compasso</span><select data-field="meter" aria-label="Fórmula de compasso">' +
    METERS.map(meter => '<option value="' + meter.value + '" ' + (meterChoice(song) === meter.value ? 'selected' : '') + '>' + (meter.label||meter.value) + '</option>').join('') +
    '</select><small class="v16-meter-hint">'+escape(meterHint(song))+'</small></label></div>' +
    '<div class="section-head"><h2>02 · Comportamento musical</h2><span>Personalizado por '+(songKind(song)==='rhythm'?'ritmo':'música')+'</span></div>' +
    '<div class="form-grid">' +
    '<label class="field"><span>Troca de parte / virada</span><select data-field="fillMode">' +
    '<option value="smart" ' + ((song.fillMode || 'smart') === 'smart' ? 'selected' : '') + '>Inteligente · resposta imediata, queda no tempo 1</option>' +
    '<option value="full" ' + (song.fillMode === 'full' ? 'selected' : '') + '>Completa · próxima entrada segura</option></select></label>' +
    '<label class="field"><span>Repetir a mesma parte</span><select data-field="repeatMode">' +
    '<option value="fill" ' + ((song.repeatMode || 'fill') === 'fill' ? 'selected' : '') + '>Com virada + crash</option>' +
    '<option value="direct" ' + (song.repeatMode === 'direct' ? 'selected' : '') + '>Direto ao loop de entrada com crash</option>' +
    '</select></label></div>' +
    '<div class="v18-intro-settings"><h3>Introduções</h3><p class="subtle">Contagem de baquetas e introdução musical independentes. WAV de vários compassos.</p>' +
    '<label class="field"><span>Contagem de baquetas</span><select data-field="countIntroEnabled">' +
    '<option value="true" '+(song.countIntroEnabled!==false?'selected':'')+'>Ativada se houver WAV</option>' +
    '<option value="false" '+(song.countIntroEnabled===false?'selected':'')+'>Desativada</option></select></label>' +
    '<label class="field"><span>Introdução musical</span><select data-field="introMode">' +
    '<option value="once" '+(song.introMode!=='repeat'?'selected':'')+'>Tocar uma vez → parte inicial</option>' +
    '<option value="repeat" '+(song.introMode==='repeat'?'selected':'')+'>Repetir até comando pelo celular / pedal</option></select></label></div></div></details>' +
    '<div class="import-toolbar"><div><h2>03 · Biblioteca de áudios</h2><p>WAVs separados da sua DAW · Até 32 MB por arquivo</p></div>' +
    button('batch-import','Importar vários WAVs','plus','ghost') + '<input type="file" id="batch-files" accept=".wav,audio/wav,audio/x-wav" multiple hidden></div>' +
    editorSection(song, 'loops', 'Loops contínuos e introduções',
      'O WAV contínuo NÃO deve ter crash de entrada repetido. Ele fica em repetição até a próxima troca. Dê dois toques/cliques no nome ou use o lápis para renomear neste cadastro.', true) +
    editorSection(song, 'entradas', 'Loop + Crash · Entradas por parte (opcional)',
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
    editorSection(song, 'crashstops', 'Crashes adicionais', 'Crash 1, 2 e 3: WAVs de ataque que tocam JUNTOS do loop no próximo tempo 1, sem interromper a bateria. Para encerrar, use Acabamento ou Final. Se quiser prato em outro pulso, prepare o deslocamento dentro do WAV, começando o arquivo no tempo 1.') +
    cymbalEditor(song) + breakEditor(song,'counter') + breakEditor(song,'passage') +
    editorSection(song, 'finais', 'Acabamento e final', 'Arquivos de encerramento de execução única, inclusive cauda do prato.') +
    customSectionsEditor(song) +
    customEntryEditor(song) +
    transitionEditor(song) +
    sequenceEditor(song) +
    '<div class="footer-actions"><small class="subtle">O cadastro aparece no Modo Palco Pro automaticamente. Para tocar, importe ao menos um loop contínuo. Confira os WAVs offline antes do evento.</small></div>';
}

function cymbalEditor(song){
  const config=cymbalSettings(song);
  return '<details class="editor-group" open><summary><span>'+icon('spark')+'<strong>Crashes automáticos pós-virada</strong></span></summary><p class="group-hint">Ataque no tempo 1 após a virada. A → prato 1, B → prato 2, Refrão → prato 3; demais partes em rodízio. WAVs com prato/crash no nome não recebem ataque adicional.</p><label class="field"><span>Crash automático</span><select data-cymbal="autoEnabled"><option value="true" '+(config.autoEnabled?'selected':'')+'>Ligado</option><option value="false" '+(!config.autoEnabled?'selected':'')+'>Desligado</option></select></label><label class="field"><span>Volume automático (%)</span><input type="number" min="0" max="100" data-cymbal="autoVolume" value="'+Math.round(config.autoVolume*100)+'"></label><div class="file-list">'+AUTO_CRASHES.map(p=>fileRow(p,song.parts?.[p.id],song)).join('')+'</div></details>'+ 
    '<details class="editor-group" open><summary><span>'+icon('wave')+'<strong>Prato de condução manual e chimbais</strong></span></summary><p class="group-hint">WAVs em compassos completos. Condução e chimbal aberto acompanham o refrão; chimbal fechado acompanha partes leves. As camadas continuam durante as viradas até a chegada da nova parte, sem duplicar instrumentos já gravados.</p>'+LAYER_IDS.map(id=>{const p=PARTS.find(p=>p.id===id),key={rideLoop:'rideVolume',hatOpenLoop:'hatOpenVolume',hatClosedLoop:'hatClosedVolume'}[id];return '<label class="field"><span>Volume '+escape(id==='rideLoop'?'da condução':id==='hatOpenLoop'?'do chimbal aberto':'do chimbal fechado')+' (%)</span><input type="number" min="0" max="100" data-cymbal="'+key+'" value="'+Math.round(config[key]*100)+'"></label>'+fileRow(p,song.parts?.[id],song);}).join('')+'</details>' ;
}
function breakEditor(song,group){
  const title=group==='counter'?'Contratempo':'Passagem', items=extraBreaks(song).filter(p=>p.group===group);
  return '<details class="editor-group" open><summary><span>'+icon('wave')+'<strong>'+(group==='counter'?'Contratempos':'Passagens')+'</strong></span><small>'+items.length+' cadastrados</small></summary><p class="group-hint">Importe WAV de 1, 2 ou mais compassos. A duração é reconhecida na importação. O trecho toca uma vez no tempo 1, com retorno à parte musical.</p><div class="custom-list">'+items.map(p=>'<div class="custom-fill-item"><label class="field"><span>Nome</span><input maxlength="52" data-break-name="'+escape(p.id)+'" value="'+escape(p.label)+'"></label>'+fileRow(p,song.parts?.[p.id],song)+button('remove-break','Excluir '+title.toLowerCase(),'trash','ghost danger','data-part="'+escape(p.id)+'"')+'</div>').join('')+'</div>'+button('add-break','Adicionar '+title.toLowerCase(),'plus','ghost','data-part="'+group+'"')+'</details>';
}
function cymbalOverrides(part,audio){
  if(!audio||ATTACK_IDS.includes(part.id)||[...LAYER_IDS,'finish','outro','countIntro'].includes(part.id))return '';
  const options=(key)=>[['auto','Pelo nome do WAV'],['yes','Já contém'],['no','Não contém']].map(([value,label])=>'<option value="'+value+'" '+((audio[key]||'auto')===value?'selected':'')+'>'+label+'</option>').join('');
  return '<div class="cymbal-overrides"><label>Prato de ataque <select data-wav-cymbal="hasCrash" data-part="'+escape(part.id)+'">'+options('hasCrash')+'</select></label><label>Condução <select data-wav-cymbal="hasConduction" data-part="'+escape(part.id)+'">'+options('hasConduction')+'</select></label><label>Chimbal aberto <select data-wav-cymbal="hasHatOpen" data-part="'+escape(part.id)+'">'+options('hasHatOpen')+'</select></label><label>Chimbal fechado <select data-wav-cymbal="hasHatClosed" data-part="'+escape(part.id)+'">'+options('hasHatClosed')+'</select></label></div>';
}
function fileRow(part, audio, song = state.admin) {
  const finishing = ['finais','crashstops','autocrashes'].includes(part.group) || ['finish','outro',...ATTACK_IDS].includes(part.id);
  const filling = part.type === 'virada';
  const variant = part.id.match(/__(\d+)$/);
  const unit = filling ? 'tempos' : 'comp.';
  const count = variant ? Number(variant[1]) : filling ?
    (audio?.lengthBeats || (audio?.bars || 1) * song.beats) : (audio?.bars || 1);
  const renameable=part.group==='loops'&&part.id!=='countIntro';
  const title=renameable?'<span class="part-name-tools"><button type="button" class="part-name-edit" data-rename-part="'+escape(part.id)+'" title="Dois cliques ou toques para renomear">'+escape(part.label)+'</button><button type="button" class="part-rename-pencil" data-action="rename-part" data-part="'+escape(part.id)+'" aria-label="Renomear '+escape(part.label)+'">'+icon('pencil')+'</button></span>':'<strong>'+escape(part.label)+'</strong>';
  return '<div class="file-row" data-row="' + escape(part.id) + '">' + icon(part.icon || 'wave') + '<div>'+title+'<small title="' + escape(audio?.name) + '">' + escape(audio?.name || 'Sem arquivo') + '</small></div>' +
    (finishing ? '<span class="subtle"><small>Uma vez</small></span>' :
      '<label class="field length-field"><input type="number" min="1" max="' + (filling ? 128 : 64) + '" data-length="' + escape(part.id) + '" ' +
      'data-unit="' + (filling ? 'beats' : 'bars') + '" aria-label="' + unit + ' de ' + escape(part.label) + '" value="' + escape(count) + '" ' +
      (audio && !variant ? '' : 'disabled') + '><span>' + unit + '</span></label>') +
    '<input type="file" accept=".wav,audio/wav,audio/x-wav" data-file="' + escape(part.id) + '" hidden>' +
    button('preview', 'Ouvir', 'play', 'ghost audio-preview', 'data-part="' + escape(part.id) + '" aria-label="Ouvir ' + escape(part.label) + '" ' + (audio ? '' : 'disabled')) +
    button('reuse-wav', 'Reutilizar', 'layers', 'ghost', 'data-part="' + escape(part.id) + '" title="Usar WAV de outra parte deste cadastro"') +
    button('browse', audio ? 'Trocar' : 'Importar', audio ? 'refresh' : 'plus', 'ghost',
      'data-part="' + escape(part.id) + '" aria-label="Importar WAV de ' + escape(part.label) + '"') +
    iconButton('remove-file', 'Remover WAV de ' + escape(part.label), 'trash', 'data-part="' + escape(part.id) + '" ' +
      (audio ? '' : 'disabled')) + '</div>'+cymbalOverrides(part,audio);
}

// V14: apresentação apenas. Move os mesmos campos originais para abas, sem recriar
// inputs, alterar IDs, callbacks, modelo de dados, uploads ou funções de nuvem.
const V14_EDITOR_TABS = [
  ['dados','Dados','settings'],
  ['loops','Loops','music'],
  ['loopcrash','Loop + Crash','spark'],
  ['crash','Crash','spark'],
  ['viradas','Viradas','wave'],
  ['mapa','Mapa musical','layers'],
  ['counter','Contratempos','wave'],
  ['passage','Passagens','music'],
  ['finais','Finais','flag'],
];
function editorGroupTab(element) {
  const title=(element.querySelector(':scope > summary strong')?.textContent||'').toLowerCase();
  if(title.includes('loops contínuos')||title.includes('mais partes musicais'))return 'loops';
  if(title.includes('loop + crash')||title.includes('primeira entrada'))return 'loopcrash';
  if(title==='crash' || title==='crashes adicionais'||title.includes('crashes automáticos')||title.includes('prato de condução'))return 'crash';
  if(title==='contratempos')return 'counter';
  if(title==='passagens')return 'passage';
  if(title.includes('viradas')||title.includes('variações de virada'))return 'viradas';
  if(title.includes('mapa'))return 'mapa';
  if(title.includes('acabamento')||title.includes('final'))return 'finais';
  return 'loops';
}
function showEditorTab(id, focus=false) {
  const root=get('.admin-editor');
  if(!root||!V14_EDITOR_TABS.some(tab=>tab[0]===id))return;
  state.editorTab=id;
  try{localStorage.setItem('loops-v15-editor-tab',id);}catch{}
  for(const button of root.querySelectorAll('.v14-editor-tab')) {
    const active=button.dataset.tab===id;
    button.setAttribute('aria-selected',String(active));
    button.tabIndex=active?0:-1;
    if(active&&focus){button.focus({preventScroll:true});button.scrollIntoView?.({block:'nearest',inline:'nearest'});}
  }
  for(const panel of root.querySelectorAll('.v14-editor-panel')){
    panel.hidden=panel.dataset.tab!==id;
    if(!panel.hidden){const first=panel.querySelector('details.editor-group, details.v12-editor-intro');if(first)first.open=true;}
  }
}
function setupEditorTabs(){
  const root=get('.admin-editor');
  if(!root||!root.querySelector(':scope > #v12-editor-intro'))return;
  const header=root.querySelector(':scope > .deck-header');
  if(!header)return;
  const nav=document.createElement('div');
  nav.className='v14-editor-tabs';nav.setAttribute('role','tablist');
  nav.setAttribute('aria-label','Seções da edição de música ou ritmo');
  nav.innerHTML=V14_EDITOR_TABS.map(([id,title,glyph])=>
    '<button type="button" class="v14-editor-tab" role="tab" id="v14-tab-'+id+'" data-action="editor-tab" data-tab="'+id+'" aria-controls="v14-panel-'+id+'" aria-selected="false" tabindex="-1">'+icon(glyph)+'<span>'+title+'</span></button>').join('');
  header.after(nav);
  const panels=new Map();
  for(const [id] of V14_EDITOR_TABS){
    const panel=document.createElement('section');panel.className='v14-editor-panel';
    panel.id='v14-panel-'+id;panel.dataset.tab=id;panel.setAttribute('role','tabpanel');
    panel.setAttribute('aria-labelledby','v14-tab-'+id);panel.hidden=true;
    panels.set(id,panel);root.append(panel);
  }
  const intro=root.querySelector(':scope > #v12-editor-intro');
  if(intro)panels.get('dados').append(intro);
  const toolbar=root.querySelector(':scope > .import-toolbar');
  if(toolbar)panels.get('loops').append(toolbar);
  const groups=[...root.querySelectorAll(':scope > details.editor-group')];
  for(const group of groups)panels.get(editorGroupTab(group)).append(group);
  const footer=root.querySelector(':scope > .footer-actions');
  if(footer)panels.get('finais').append(footer);
  showEditorTab(state.editorTab);
}

function render() {
  if (musicianLink) state.view = 'live';
  if (cloud.enabled && cloud.authFlow?.type === 'invalid') { app.innerHTML = authLinkErrorView(); return; }
  if (cloud.enabled && cloud.authFlow) { app.innerHTML = passwordView(); return; }
  if (cloud.enabled && !cloud.session()) { app.innerHTML = loginView(); return; }
  document.body.classList.remove('drawer-visible');
  state.libraryOpen = false;
  app.innerHTML = shell();
  if(mixerOpen&&mixerSong())showMixer();
  setupEditorTabs();
  updateLibrary();
  if (state.view === 'live') updatePlayback(true);
  else updateSaveLabel();
}

function normalized(value) {
  return (value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR');
}

function updateAdminSidebar(){
  const container=get('#catalog-items');if(!container)return;
  container.classList.toggle('v14-list',state.catalogView==='lista');
  const rows=songsFor('admin').filter(song=>inFolder(song,state.adminKind,state.adminFolder))
    .filter(song=>normalized(song.name+' '+song.occasion+' '+song.bpm).includes(normalized(state.adminSearch)))
    .sort((a,b)=>(a.name||'').localeCompare(b.name||'','pt-BR'));
  const counter=get('#catalog-count');if(counter)counter.textContent=String(rows.length);
  container.innerHTML=rows.map(song=>'<button type="button" class="v12-catalog-card" data-action="song" data-id="'+escape(song.id)+'">'+
    '<span class="v12-catalog-symbol">'+icon(songKind(song)==='rhythm'?'wave':'music')+'</span><span><strong>'+escape(song.name||'Sem título')+'</strong><small>'+escape(song.occasion||'Sem categoria')+' · '+song.bpm+' BPM · '+escape(meterOf(song))+'</small></span>'+icon('arrowdown')+'</button>').join('')||
    '<p class="empty-list">Nenhum cadastro nesta pasta. Crie um item pelo botão acima.</p>';
}
function updateLibrary() {
  updateAdminSidebar();
  const container=get('#items');if(!container)return;
  const search=normalized(state.searchLive);
  const rows=songsFor('live').sort((a,b)=>(a.name||'').localeCompare(b.name||'','pt-BR'));
  const showReps=state.drawerTab==='repertoires';
  const filtered=showReps?(state.libraryData.repertoires||[]).filter(r=>normalized(r.name).includes(search)):
    rows.filter(song=>(state.drawerTab==='all'||songKind(song)===state.drawerTab)&&
      normalized(song.name+' '+song.occasion).includes(search));
  const counter=get('#song-count');if(counter)counter.textContent=String(filtered.length);
  container.innerHTML=showReps?filtered.map(r=>'<button type="button" class="item" data-action="choose-repertoire" data-id="'+escape(r.id)+'" aria-pressed="'+(r.id===state.activeRepId)+'">'+
    '<span class="item-icon">'+icon('list')+'</span><span><span class="item-title">'+escape(r.name)+'</span><span class="item-meta">'+r.items.length+' itens · Músicas + ritmos</span></span></button>').join('')||'<p class="empty-list">Nenhum repertório encontrado.</p>':
    filtered.map(song=>{
      const saved=state.offline.get(song.id);
      const downloaded=song.demo||(saved&&sortedSignature(saved)===sortedSignature(song));
      const status=firstPlayablePart(song)?'':' · Falta loop contínuo';
      return '<button type="button" class="item" data-action="song" data-id="'+escape(song.id)+'" aria-pressed="'+(song.id===state.selected?.id)+'">'+
        '<span class="item-icon">'+icon(songKind(song)==='rhythm'?'wave':'music')+'</span><span><span class="item-title">'+escape(song.name||'Sem título')+
        '</span><span class="item-meta">'+(songKind(song)==='rhythm'?'Ritmo':'Música')+' · '+escape(song.occasion||'')+' · '+song.bpm+' BPM · '+escape(meterOf(song))+status+'</span></span>'+
        (downloaded?icon('check'):'')+'</button>';
    }).join('')||'<p class="empty-list">Nenhum item encontrado.</p>';
  app.querySelectorAll('[data-action="drawer-tab"]').forEach(el=>el.setAttribute('aria-pressed',String(el.dataset.tab===state.drawerTab)));
  const repButton=get('#download-rep-btn');if(repButton)repButton.disabled=!state.activeRepId;
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

async function openPartRename(id){
  const song=state.admin;if(state.view!=='admin'||!song||!(RENAMEABLE_PARTS.some(p=>p.id===id)||extraSections(song).some(p=>p.id===id))||document.querySelector('#part-rename-dialog'))return;
  const ask=document.createElement('dialog');ask.id='part-rename-dialog';
  ask.innerHTML='<h2>Renomear parte</h2><p>Somente neste ritmo ou música. WAVs, viradas e controles permanecem vinculados.</p><form method="dialog"><label class="field"><span>Nome</span><input required maxlength="52" value="'+escape(partLabel(song,id))+'"></label><menu><button type="button" class="button ghost" data-default>Nome padrão</button><button class="button ghost" value="cancel" formnovalidate>Cancelar</button><button class="button primary" value="save">Salvar</button></menu></form>';
  document.body.appendChild(ask);const input=ask.querySelector('input');
  const standard=RENAMEABLE_PARTS.find(p=>p.id===id)?.label||song.customSections?.find(p=>p.id===id)?.defaultLabel;
  const reset=ask.querySelector('[data-default]');reset.disabled=!standard;reset.onclick=()=>{input.value=standard;input.setCustomValidity('');input.focus();};
  const form=ask.querySelector('form');form.addEventListener('submit',event=>{if(event.submitter?.value!=='cancel'&&!input.value.trim()){event.preventDefault();input.setCustomValidity('Informe um nome.');input.reportValidity();}});input.addEventListener('input',()=>input.setCustomValidity(''));
  ask.showModal();input.focus();input.select();
  await new Promise(resolve=>ask.addEventListener('close',resolve,{once:true}));
  const value=input.value,save=ask.returnValue==='save';ask.remove();
  if(!save||state.admin?.id!==song.id)return;
  if(standard&&value.trim()===standard)resetPartName(state.admin,id);else if(!renamePart(state.admin,id,value))return;
  await persistDraft();render();notice('Nome atualizado somente neste cadastro.');
}

async function openEntryEditor(index){
  const rep=currentRepertoire(),item=rep?.items[index],source=state.songs.find(s=>s.id===item?.songId&&!s.deleted);
  if(!source||musicianLink||document.querySelector('#rep-custom-dialog'))return;
  let resetAll=false;const id=entryId(item,index), labels=cleanEntryLabels(item.partLabels), profile=normalizeMix(item.mixer||source.mixer,source);
  const parts=[...RENAMEABLE_PARTS,...extraSections(source)].filter(p=>hasAudioPart(source,p.id)||hasAudioPart(source,p.id+'Entry'));
  const ask=document.createElement('dialog');ask.id='rep-custom-dialog';ask.className='rep-custom-dialog';
  ask.innerHTML='<h2>Personalizar '+escape(item.title||source.name)+'</h2><p>Somente este item do repertório. O cadastro original permanece intacto.</p><form method="dialog"><h3>Nomes das partes</h3><div class="rep-custom-fields">'+(parts.map(p=>'<label class="field"><span>'+escape(partLabel(source,p.id))+'</span><input data-entry-name="'+escape(p.id)+'" maxlength="52" placeholder="'+escape(partLabel(source,p.id))+'" value="'+escape(labels[p.id]||'')+'"></label>').join('')||'<p>Cadastre os WAVs das partes na biblioteca primeiro.</p>')+'</div><h3>Mixagem deste item</h3><label class="rep-use-mix"><input type="checkbox" id="rep-own-mix" '+(item.mixer?'checked':'')+'> Usar mixagem própria</label><div class="rep-custom-mix">'+MIX_CHANNELS.map(([key,name])=>'<div><label>'+escape(name)+' <output>'+Math.round(profile[key].level*100)+'%</output><input data-entry-level="'+key+'" type="range" min="0" max="100" value="'+Math.round(profile[key].level*100)+'"></label><label><input data-entry-mute="'+key+'" type="checkbox" '+(profile[key].muted?'checked':'')+'> MUTE</label>'+(key==='master'?'':'<label><input data-entry-solo="'+key+'" type="checkbox" '+(profile[key].solo?'checked':'')+'> SOLO</label>')+'</div>').join('')+'</div><menu><button type="button" class="button ghost" data-entry-reset>Herdar original</button><button class="button ghost" value="cancel">Cancelar</button><button class="button primary" value="save">Salvar item</button></menu></form>';
  document.body.appendChild(ask);const own=ask.querySelector('#rep-own-mix');
  const enable=()=>ask.querySelectorAll('[data-entry-level],[data-entry-mute],[data-entry-solo]').forEach(el=>el.disabled=!own.checked);own.onchange=enable;enable();
  ask.querySelectorAll('[data-entry-level]').forEach(el=>el.oninput=()=>el.parentElement.querySelector('output').textContent=el.value+'%');
  ask.querySelector('[data-entry-reset]').onclick=()=>{resetAll=true;ask.querySelectorAll('[data-entry-name]').forEach(el=>el.value='');own.checked=false;enable();};
  ask.showModal();await new Promise(resolve=>ask.addEventListener('close',resolve,{once:true}));
  const save=ask.returnValue==='save';if(save){const dest=state.libraryData.repertoires.find(r=>r.id===rep.id)?.items.find((i,n)=>entryId(i,n)===id);if(dest){dest.itemId=id;const next=resetAll?{}:{...labels};for(const el of ask.querySelectorAll('[data-entry-name]')){if(el.value.trim())next[el.dataset.entryName]=el.value.trim();else delete next[el.dataset.entryName];}dest.partLabels=cleanEntryLabels(next);if(own.checked){for(const key of MIX_IDS){profile[key]={level:Number(ask.querySelector('[data-entry-level="'+key+'"]').value)/100,muted:ask.querySelector('[data-entry-mute="'+key+'"]').checked,solo:ask.querySelector('[data-entry-solo="'+key+'"]')?.checked||false};}dest.mixer=profile;}else delete dest.mixer;}}
  ask.remove();if(save){await saveLibraryData();render();notice('Personalização salva somente neste item.');}
}

function confirmChoice(title, description, ok) {
  const ask=document.createElement('dialog');
  ask.innerHTML='<h2>'+escape(title)+'</h2><p>'+escape(description)+'</p>'+
    '<form method="dialog"><menu><button class="button ghost" value="cancel">Cancelar</button>'+
    '<button class="button primary" value="ok">'+escape(ok)+'</button></menu></form>';
  document.body.appendChild(ask);ask.showModal();
  return new Promise(resolve=>ask.addEventListener('close',()=>{
    const accepted=ask.returnValue==='ok';ask.remove();resolve(accepted);
  },{once:true}));
}

async function copyMobile(){
  if(!navigator.onLine){notice('Conecte-se para gerar ou revogar um link com segurança.');return;}
  let link=await cloud.linkStatus();
  function makeUrl(token,official=false){
    const url=new URL(location.href);
    if(official&&/^[a-f0-9]{12,}--/.test(location.hostname)){
      url.hostname=location.hostname.replace(/^[a-f0-9]{12,}--/,'');
    }
    url.pathname='/';url.search='';url.searchParams.set('modo','musico');url.searchParams.set('chave',token);
    url.hash='';return url.href;
  }
  function paint(){
    const running=link?.active;
    const preview=/^[a-f0-9]{12,}--/.test(location.hostname);
    const permanent=running?makeUrl(link.token,true):'';
    dialog.innerHTML='<section class="v12-settings-dialog"><div class="v13-modal-title"><div><p class="eyebrow">ACESSO DO MÚSICO</p><h2>Link do aplicativo</h2></div>'+iconButton('close-link-x','Fechar','x')+'</div>'+
      '<p>Link individual de leitura. Sem acesso à edição. Revogar impede novos downloads imediatamente quando o aparelho estiver online.</p>'+
      (running?'<div class="v12-active-link"><strong>● Link ativo</strong><small>Válido até '+escape(new Date(link.expiresAt).toLocaleDateString('pt-BR'))+'</small></div><label class="field"><span>Link permanente (atualiza com a versão publicada)</span><input id="musician-url" readonly value="'+escape(permanent)+'"></label>':
      '<div class="warning">Nenhum link ativo. Gere um novo para autorizar um músico.</div>')+
      (running&&preview?'<p class="subtle">Para testar a V13 agora, use o endereço deste Permalink com a mesma chave. O endereço permanente recebe versões novas após publicar.</p>':'')+
      '<div class="v12-modal-actions">'+(running?button('copy-link','Copiar link permanente','link','primary')+
      (preview?button('copy-preview','Copiar link de teste','share','ghost'):'')+
      button('revoke-link','Revogar acesso','trash','ghost danger')+button('renew-link','Gerar outro link','refresh','ghost'):
      button('create-link','Gerar link seguro','plus','primary'))+
      button('close-dialog','Fechar','x','ghost')+'</div></section>';
    dialog.querySelector('[data-action="close-dialog"]').onclick=()=>dialog.close();
    dialog.querySelector('[data-action="close-link-x"]').onclick=()=>dialog.close();
    dialog.querySelector('[data-action="copy-link"]')?.addEventListener('click',()=>copyText(permanent));
    dialog.querySelector('[data-action="copy-preview"]')?.addEventListener('click',()=>copyText(makeUrl(link.token,false)));
    dialog.querySelector('[data-action="create-link"]')?.addEventListener('click',()=>mutate('create'));
    dialog.querySelector('[data-action="renew-link"]')?.addEventListener('click',()=>mutate('renew'));
    dialog.querySelector('[data-action="revoke-link"]')?.addEventListener('click',()=>mutate('revoke'));
  }
  async function copyText(text){try{await navigator.clipboard.writeText(text);notice('Link copiado.');}
    catch{const box=dialog.querySelector('#musician-url');if(box){box.focus();box.select();}notice('Copie o endereço selecionado.');}}
  async function mutate(action){
    if(action==='revoke'||action==='renew'){
      if(!await confirmChoice('Revogar link atual?','O link antigo deixa de funcionar online. Downloads anteriores podem continuar disponíveis por até 48 horas offline.','Revogar'))return;
    }
    try{link=action==='revoke'?await cloud.linkRevoke():await cloud.linkCreate();paint();
      notice(action==='revoke'?'Link revogado.':'Novo link criado. O anterior não é mais autorizado.');}
    catch(e){notice(e.message);}
  }
  paint();dialog.showModal();
}

async function openSettingsModal(){
  const user=cloud.session()?.email||'Conta desconectada';
  dialog.innerHTML='<section class="v12-settings-dialog"><div class="v12-settings-heading"><div><p class="eyebrow">STUDIO MARKS</p><h2>Configurações</h2></div>'+iconButton('close-settings','Fechar','x')+'</div>'+
    '<div class="v12-setting-user">'+icon('user')+'<span>'+escape(user)+'</span></div>'+
    '<div class="v12-settings-grid">'+
      button('settings-backup','Backup e restauração','download','v12-setting-tile')+
      button('settings-link','Gerenciar link do músico','link','v12-setting-tile')+
      button('settings-pedal','Controle por pedal','wave','v12-setting-tile')+
      button('settings-midi','MIDI Learn Pro','midi','v12-setting-tile')+
      (!cloud.musician ? button('settings-password','Redefinir minha senha','settings','v12-setting-tile') : '')+
      button('settings-sync','Sincronizar agora','cloud','v12-setting-tile')+
      button('settings-logout','Sair da conta','exit','v12-setting-tile danger')+'</div><p class="subtle">Versão '+APP_VERSION+' · Todas as alterações são salvas automaticamente.</p></section>';
  dialog.querySelector('[data-action="close-settings"]').onclick=()=>dialog.close();
  for(const [action,run] of [['settings-backup',()=>openBackupCenter()],['settings-link',()=>copyMobile()],
    ['settings-pedal',()=>openPedalModal()],['settings-midi',()=>openMidiModal()],['settings-password',()=>openPasswordSettingsModal()],['settings-sync',()=>syncCatalog()],
    ['settings-logout',()=>handleAction({dataset:{action:'logout'}})]]){
    dialog.querySelector('[data-action="'+action+'"]').onclick=async()=>{
      dialog.close();try{await run();}catch(e){notice(e.message);}
    };
  }
  dialog.showModal();
}

async function openPasswordSettingsModal(){
  if(cloud.musician || cloud.session()?.readonly){notice('Somente a conta administrativa pode redefinir sua própria senha.');return;}
  if(!navigator.onLine){notice('Conecte à internet para alterar sua senha no Netlify Identity.');return;}
  dialog.innerHTML='<section class="v12-settings-dialog"><div class="v12-settings-heading"><div><p class="eyebrow">SEGURANÇA DA CONTA</p><h2>Redefinir minha senha</h2></div>'+iconButton('close-password-settings','Fechar','x')+'</div>'+ 
    '<p class="subtle">Esta opção altera a senha da sua conta administrativa no Netlify Identity, sem afetar os links dos músicos ou os arquivos. Sua sessão precisa estar autenticada e conectada.</p>'+ 
    '<form id="v18-password-settings-form" class="v18-password-form">'+
    '<label class="field"><span>Nova senha (mínimo 8 caracteres)</span><input name="password" type="password" minlength="8" required autocomplete="new-password"></label>'+ 
    '<label class="field"><span>Confirmar nova senha</span><input name="confirmation" type="password" minlength="8" required autocomplete="new-password"></label>'+ 
    '<p id="v18-password-error" role="alert" class="error"></p>'+ 
    '<button type="submit" class="button primary">Salvar nova senha</button></form></section>';
  dialog.querySelector('[data-action="close-password-settings"]').onclick=()=>dialog.close();
  dialog.querySelector('#v18-password-settings-form').onsubmit=async(event)=>{
    event.preventDefault();const form=event.currentTarget;
    const password=String(new FormData(form).get('password')||'');
    const confirmation=String(new FormData(form).get('confirmation')||'');
    const error=form.querySelector('#v18-password-error');
    if(password.length<8 || password!==confirmation){error.textContent=password!==confirmation?'As senhas não coincidem.':'Use pelo menos 8 caracteres.';return;}
    const submit=form.querySelector('[type="submit"]');submit.disabled=true;error.textContent='';
    try{await cloud.changePassword(password);form.reset();dialog.close();notice('Senha atualizada no Netlify Identity. Use a nova senha no próximo acesso.');}
    catch(e){error.textContent=e.message||'Não foi possível alterar a senha.';}
    finally{submit.disabled=false;}
  };
  dialog.showModal();
}

const pedalActions=[
  ['play','Iniciar / Parar'],['stop','Parar'],
  ...PLAY_PARTS.map(p=>['part:'+p.id,'Ir para '+p.label]),
  ...MANUAL_PARTS.map(p=>['fill:'+p.id,'Virada: '+p.label]),
  ...FINALES.map(p=>['part:'+p.id,'Encerramento: '+p.label]),
  ...CRASH_STOPS.map(p=>['crash:'+p.id,'Acionar '+p.label]),
  ['ride-toggle','Prato de condução · ligar/desligar'],['hat-open-toggle','Chimbal aberto · ligar/desligar'],['hat-closed-toggle','Chimbal fechado · ligar/desligar'],['auto-crash-toggle','Crash automático · ligar/desligar'],
  ['rep-prev-live','Música anterior'],['rep-next-live','Próxima música'],['open-library','Abrir repertório']
];
function controlActions(){
  const current=state.view==='admin'?state.admin:state.selected;
  const actions=pedalActions.map(([id,name])=>[id,id.startsWith('part:')&&PLAY_PARTS.some(p=>p.id===id.slice(5))?'Ir para '+partLabel(current,id.slice(5)):name]);
  for(const song of [current,...state.songs])for(const p of [...PARTS.filter(p=>p.group==='automaticas'),...(song?.customFills||[])])if(Object.keys(song?.parts||{}).some(key=>fillBase(key)===p.id&&hasAudioPart(song,key))&&!actions.some(([id])=>id==='fill:'+p.id))actions.push(['fill:'+p.id,'Virada: '+partLabel(song,p.id)]);
  for(const song of [current,...state.songs])for(const p of extraSections(song))if(hasAudioPart(song,p.id)&&!actions.some(([id])=>id==='part:'+p.id))actions.push(['part:'+p.id,'Ir para '+p.label]);
  for(const song of [current,...state.songs])for(const b of extraBreaks(song))if(!actions.some(([id])=>id==='break:'+b.id))actions.push(['break:'+b.id,(b.group==='counter'?'Contratempo':'Passagem')+' '+b.id.split('_')[1]+' · '+b.label]);
  return actions;
}
function pedalOptions(value){const actions=controlActions();if(value&&!actions.some(([id])=>id===value))actions.push([value,value]);return '<option value="">Não atribuir</option>'+actions.map(([id,txt])=>
  '<option value="'+escape(id)+'" '+(id===value?'selected':'')+'>'+escape(txt)+'</option>').join('');}
async function openPedalModal(){
  state.pedalLearn=null;
  state.pedalSlots=Math.max(6,state.pedalSlots||6,...Object.values(state.pedalMap).map(x=>(Number(x.slot)||0)+1));
  dialog.innerHTML='<section class="v12-settings-dialog"><div class="v12-settings-heading"><div><p class="eyebrow">BLUETOOTH HID</p><h2>Controle por pedal</h2></div>'+iconButton('close-pedals','Fechar','x')+'</div>'+
    '<p class="subtle">Conecte o pedal no Bluetooth do iPhone ou computador em modo teclado. Selecione a função e clique em Aprender: depois pise no pedal. Sem internet durante o show.</p>'+
    '<div class="v12-pedal-list">'+Array.from({length:state.pedalSlots},(_,i)=>{
      const code=Object.keys(state.pedalMap).find(k=>state.pedalMap[k]?.slot===i);
      const item=code?state.pedalMap[code]:{};
      return '<div class="v12-pedal-row"><strong>Pedal '+(i+1)+'</strong><select data-pedal-action="'+i+'">'+pedalOptions(item.command)+'</select>'+
        '<code data-pedal-key="'+i+'">'+escape(code||'Não associado')+'</code>'+button('learn-pedal','Aprender','wave','ghost','data-slot="'+i+'"')+'</div>';
    }).join('')+'</div><div class="v12-modal-actions">'+button('add-pedal-slot','Adicionar controle','plus','ghost')+button('clear-pedals','Limpar comandos','trash','ghost')+
    button('close-pedals','Concluir','check','primary')+'</div><p class="subtle" id="pedal-status" aria-live="polite"></p></section>';
  dialog.querySelectorAll('[data-action="close-pedals"]').forEach(el=>el.onclick=()=>{state.pedalLearn=null;dialog.close();});
  dialog.querySelectorAll('[data-action="learn-pedal"]').forEach(el=>el.onclick=()=>{
    state.pedalLearn=Number(el.dataset.slot);dialog.querySelector('#pedal-status').textContent='Agora pise no pedal '+(state.pedalLearn+1)+'…';
  });
  dialog.querySelectorAll('[data-pedal-action]').forEach(el=>el.onchange=()=>{
    const slot=Number(el.dataset.pedalAction);const entry=Object.entries(state.pedalMap).find(([,v])=>v.slot===slot);
    if(entry){state.pedalMap[entry[0]].command=el.value;persistPedals();}
  });
  dialog.querySelector('[data-action="add-pedal-slot"]').onclick=()=>{if(state.pedalSlots>=512)return;state.pedalSlots++;dialog.close();openPedalModal();};
  dialog.querySelector('[data-action="clear-pedals"]').onclick=()=>{
    state.pedalMap={};persistPedals();dialog.close();openPedalModal();
  };
  dialog.showModal();
}
function persistPedals(){try{localStorage.setItem('loops-v12-pedal-map',JSON.stringify(state.pedalMap));}catch{notice('Seu navegador não permitiu salvar o mapeamento local.');}}
function receivePedal(code){
  const entry=state.pedalMap[code];if(!entry||!entry.command||state.view!=='live'||!repo)return;
  const now=Date.now();if(now-state.pedalLastAt<170)return;
  state.pedalLastAt=now;
  const [prefix,part]=entry.command.split(':');
  const action=['part','fill','crash','break'].includes(prefix)?prefix:entry.command;
  handleAction({dataset:{action:action==='play'&&player.running?'stop':action,part}}).catch(e=>notice(e.message));
  const label=controlActions().find(([key])=>key===entry.command)?.[1]||entry.command;
  const live=get('#pedal-status-live');if(live)live.textContent='Pedal: '+label;
}

// MIDI Learn Pro V22 — local to the browser, with no dependency on the cloud.
const midi = new MidiController({navigator,settings:loadMidiSettings(localStorage),
  onChange:updateMidiStatus,onSignal:(message,device)=>{
    if(midi.learning&&(!dialog.open||!dialog.querySelector('.midi-dialog')))midi.cancelLearn();
    const el=dialog.querySelector('#midi-monitor');if(el)el.textContent=(device.name||'MIDI')+' · '+midiSignalLabel(message)+' · valor '+message.value;
  },onLearn:()=>{persistMidi();paintMidiMappings();const el=dialog.querySelector('#midi-learn-status');if(el)el.textContent='Comando aprendido. Você pode ensinar outro.';},
  onCommand:receiveMidiCommand});
function midiIcon(){return iconButton('midi-setup','Configurar MIDI Learn Pro','midi','aria-pressed="'+(midi.settings.enabled&&midi.devices.length>0)+'"');}
function midiActions(){
  const items=[...MIX_CHANNELS.map(([id,name])=>['mix:'+id,'Mixer · '+name+' (fader CC)']),['start','Iniciar / Retomar'],['restart-intro','Iniciar pela introdução musical'],...controlActions(),
    ['mode-toggle','Alternar modo de virada'],['cancel-queue','Cancelar troca'],['slower','Diminuir BPM (1)'],['faster','Aumentar BPM (1)'],['bpm-absolute','BPM por knob/fader (parado)'],['volume-absolute','Volume por knob/fader'],
    ['toggle-live-count','Ligar / desligar contagem'],['count-one','Contagem: 1 compasso'],['count-two','Contagem: 2 compassos'],['map-next','Próxima etapa do mapa'],['map-previous','Etapa anterior do mapa']];
  for(const p of extraSections(state.view==='admin'?state.admin:state.selected))if(!items.some(([id])=>id==='part:'+p.id))items.push(['part:'+p.id,'Ir para '+p.label]);
  for(const m of midi.settings.mappings)if(!items.some(([id])=>id===m.command))items.push([m.command,m.command]);
  return items;
}
function midiOptions(value,nonCC=false){return midiActions().filter(([id])=>!nonCC||!['bpm-absolute','volume-absolute'].includes(id)&&!id.startsWith('mix:')).map(([id,txt])=>'<option value="'+escape(id)+'" '+(id===value?'selected':'')+'>'+escape(txt)+'</option>').join('');}
function midiSignalLabel(m){return ({note:'Nota',cc:'CC',program:'Programa'}[m.type]||m.type)+' '+m.number+' · canal '+(m.channel+1);}
function persistMidi(){try{saveMidiSettings(localStorage,midi.settings);}catch{notice('O navegador não permitiu salvar o MIDI localmente.');}updateMidiStatus();}
function updateMidiStatus(){
  const active=midi.settings.enabled&&midi.devices.length>0;
  app.querySelectorAll('[data-action="midi-setup"]').forEach(el=>el.setAttribute('aria-pressed',String(active)));
  const el=dialog.querySelector('#midi-devices');if(el)el.textContent=!midi.supported?'Web MIDI indisponível neste navegador. No iPhone, experimente uma ponte Web MIDI; o pedal HID continua disponível.':!midi.access?'Aguardando autorização. Clique em Conectar MIDI.':midi.devices.length?midi.devices.map(p=>p.name||p.manufacturer||p.id||'Entrada MIDI').join(' · '):'Nenhuma entrada MIDI detectada. Verifique a conexão USB/Bluetooth.';
}
function paintMidiMappings(){
  const list=dialog.querySelector('#midi-mappings');if(!list)return;
  list.innerHTML=midi.settings.mappings.map((m,i)=>'<div class="midi-map-row"><div><strong>'+escape(midiSignalLabel(m))+'</strong><small>'+escape(m.anyDevice?'Qualquer dispositivo':m.device.name||m.device.id||'Dispositivo MIDI')+(m.type==='cc'?' · '+(m.mode==='relative'?'pulso':m.mode==='change'?'variação':'pressão'):'')+'</small></div><select aria-label="Função MIDI" data-midi-edit="'+i+'">'+midiOptions(m.command,m.type!=='cc')+'</select>'+iconButton('midi-delete','Excluir atribuição','trash','data-index="'+i+'"')+'</div>').join('')||'<p class="subtle">Nenhuma atribuição. Escolha uma função e clique em Aprender MIDI.</p>';
  list.querySelectorAll('[data-midi-edit]').forEach(el=>el.onchange=()=>{const m=midi.settings.mappings[Number(el.dataset.midiEdit)];if(m){m.command=el.value;persistMidi();}});
  list.querySelectorAll('[data-action="midi-delete"]').forEach(el=>el.onclick=()=>{midi.settings.mappings.splice(Number(el.dataset.index),1);persistMidi();paintMidiMappings();});
}
function openMidiModal(){
  state.pedalLearn=null;midi.cancelLearn();
  dialog.innerHTML='<section class="v12-settings-dialog midi-dialog"><div class="v12-settings-heading"><div><p class="eyebrow">USB · BLUETOOTH MIDI · CORE MIDI VIA PONTE</p><h2>MIDI Learn Pro</h2></div>'+iconButton('midi-close','Fechar','x')+'</div>'+
    '<p class="subtle">Conecte o controlador e autorize o navegador. Teclas, pads, botões e controles CC podem acionar as funções. O pedal HID continua independente.</p>'+
    '<div class="midi-connection"><label><input type="checkbox" id="midi-enabled" '+(midi.settings.enabled?'checked':'')+'> Ativar controle MIDI</label>'+button('midi-connect','Conectar MIDI','midi','primary')+'</div><p id="midi-devices" class="subtle" role="status"></p><p id="midi-monitor" class="midi-monitor" role="status">Monitor: aguardando sinal MIDI…</p>'+
    '<div class="midi-learn-panel"><label class="field"><span>Função a atribuir</span><select id="midi-command">'+midiOptions('start')+'</select></label><label class="field"><span>Comportamento CC</span><select id="midi-cc-mode"><option value="press">Botão / pad (valor ≥ 64)</option><option value="change">Knob / fader (a cada alteração)</option><option value="relative">Encoder relativo (cada mensagem)</option></select></label><label class="midi-any"><input type="checkbox" id="midi-any"> Aceitar esta mensagem de qualquer dispositivo</label>'+button('midi-learn','Aprender MIDI','midi','primary')+button('midi-cancel','Cancelar aprendizado','x','ghost')+'<p id="midi-learn-status" class="subtle" role="status"></p></div>'+
    '<h3>Atribuições salvas</h3><div id="midi-mappings" class="midi-mappings"></div><div class="v12-modal-actions">'+button('midi-clear','Limpar atribuições','trash','ghost')+button('midi-close','Concluir','check','primary')+'</div><p class="subtle">Salvamento automático neste navegador. Incluído no backup. Para iniciar áudio, o navegador pode exigir primeiro um toque na tela. BPM continua ajustável somente com a reprodução parada.</p></section>';
  const status=dialog.querySelector('#midi-learn-status');
  dialog.querySelectorAll('[data-action="midi-close"]').forEach(el=>el.onclick=()=>{midi.cancelLearn();dialog.close();});
  dialog.querySelector('#midi-enabled').onchange=e=>{midi.settings.enabled=e.target.checked;persistMidi();if(!midi.settings.enabled)midi.cancelLearn();};
  dialog.querySelector('[data-action="midi-connect"]').onclick=async e=>{
    const el=e.currentTarget;el.disabled=true;status.textContent='Solicitando acesso MIDI…';
    try{if(midi.supported){try{player.context().resume().catch(()=>{});}catch{}}await midi.connect();midi.settings.enabled=true;const checkbox=dialog.querySelector('#midi-enabled');if(checkbox)checkbox.checked=true;persistMidi();status.textContent='Conexão MIDI autorizada. Pressione um controle para conferir o monitor.';}
    catch(error){status.textContent=error.message||'Acesso MIDI negado ou indisponível.';}finally{el.disabled=false;}
  };
  dialog.querySelector('[data-action="midi-learn"]').onclick=()=>{if(!midi.access||!midi.devices.length){status.textContent='Conecte e autorize uma entrada MIDI primeiro.';return;}const command=dialog.querySelector('#midi-command').value;const mode=dialog.querySelector('#midi-cc-mode').value;midi.learn(command,{mode,anyDevice:dialog.querySelector('#midi-any').checked});status.textContent='Pressione uma tecla, pad ou botão, ou mova um controle CC agora…';};
  dialog.querySelector('[data-action="midi-cancel"]').onclick=()=>{midi.cancelLearn();status.textContent='Aprendizado cancelado.';};
  dialog.querySelector('[data-action="midi-clear"]').onclick=()=>{if(!window.confirm('Apagar todas as atribuições MIDI deste navegador? O pedal não será alterado.'))return;midi.cancelLearn();midi.settings.mappings=[];persistMidi();paintMidiMappings();};
  // Unlock Web Audio on this real click, not on a MIDI event (which some browsers do not count as a gesture).
  if(midi.supported){try{player.context().resume().catch(()=>{});}catch{}}
  paintMidiMappings();updateMidiStatus();dialog.showModal();
}
function receiveMidiCommand(command,value){
  if(!repo||dialog.open||document.querySelector('#part-rename-dialog[open]')||(cloud.enabled&&!cloud.session())||document.visibilityState==='hidden')return;
  if(command.startsWith('mix:')||command==='volume-absolute'){const id=command==='volume-absolute'?'master':command.slice(4);if(mixerSong()&&MIX_IDS.includes(id))setMixerValue(id,'level',value/127);return;}
  if(state.view!=='live'||!state.selected)return;
  if(state.capture||state.libraryOpen&&command!=='stop')return;
  const [prefix,part]=command.split(':');
  const feedback=()=>{const el=get('#pedal-status-live');if(el)el.textContent='MIDI: '+(midiActions().find(([id])=>id===command)?.[1]||command);};
  if(command==='bpm-absolute'){if(player.running||startPending)return;const [min,max]=bpmRange(state.selected.bpm);setLiveBpm(Math.round(min+(max-min)*value/127));feedback();return;}
  if(command==='count-one'||command==='count-two'){if(player.running||startPending||!player.buffers.has('countIntro'))return;updateLiveCount(state.liveCountEnabled,command==='count-one'?1:2);updatePlayback(true);const select=get('#live-count-bars');if(select)select.value=String(state.liveCountBars);feedback();return;}
  if(command==='restart-intro'){if(player.running||startPending||!player.ready||!player.buffers.has('intro'))return;player.armedPart=null;}
  const action=command==='start'||command==='restart-intro'?'play':command==='play'&&player.running&&!state.info.interrupted?'stop':prefix;
  const target=[...app.querySelectorAll('[data-action]')].find(el=>el.dataset.action===action&&(!part||el.dataset.part===part));
  // Route through the same panel controls, including disabled/unavailable crash and part checks.
  if(!target&&action==='fill'&&part&&player.fillExists(part)){handleAction({dataset:{action,part}}).then(feedback).catch(error=>notice(error.message));return;}
  if(!target||target.disabled||target.hidden)return;
  handleAction(target).then(feedback).catch(error=>notice(error.message||'Comando MIDI indisponível.'));
}
function setLiveBpm(value){
  if(!state.selected||player.running||startPending)return;
  const [min,max]=bpmRange(state.selected.bpm);const next=Math.min(max,Math.max(min,value));if(next===state.bpm)return;
  state.bpm=next;player.cancelPreparation();currentGeneration++;state.preparation='Preparando áudio…';clearTimeout(prepTimer);updatePlayback(true);prepTimer=setTimeout(()=>prepareLive(),190);
}
async function reconnectMidi(){
  if(!midi.settings.enabled||!midi.supported)return;
  try{const permission=await navigator.permissions?.query({name:'midi',sysex:false});if(permission?.state==='granted')await midi.connect();}catch{/* manual connect is available for bridges and browsers without MIDI permissions API */}
}
dialog.addEventListener('close',()=>{if(!dialog.open)midi.cancelLearn();});
dialog.addEventListener('cancel',()=>midi.cancelLearn());

// Central de Backup V3. O backup completo é independente da nuvem: inclui todos os WAVs.
async function openBackupCenter() {
  await saveBeforeLeaving();
  stopPreview();
  if (!repo) return;
  if (player.running) { notice('Pare a reprodução antes de abrir os backups.'); return; }
  await saveBeforeLeaving();
  dialog.innerHTML = '<section class="backup-dialog v13-backup-dialog"><div class="v13-modal-title"><div><p class="eyebrow">SEUS DADOS PROTEGIDOS</p><h2>Backup e restauração</h2></div>'+iconButton('backup-x','Fechar','x')+'</div>'+
    '<p class="v13-backup-caption">Exportar, importar ou recuperar versões anteriores. Inclui repertórios, mapas, pastas, pratos, contratempos, passagens, nomes das partes, mixagem, controles MIDI/pedal e WAVs.</p>'+
    '<div class="backup-choices">'+
    '<button type="button" class="button primary" data-backup="completo">' + icon('download') + 'Backup completo</button>'+
    '<button type="button" class="button ghost" data-backup="configuracoes">' + icon('cloud') + 'Configurações</button>'+
    '<button type="button" class="button ghost" data-backup="audios">' + icon('music') + 'WAVs + índice</button></div>'+
    '<div class="v13-import-panel"><label class="field"><span>Importar / Restaurar backup ZIP</span>'+
    '<input id="restore-file" type="file" accept=".zip,application/zip"></label>'+
    '<p class="subtle">A importação cria novas cópias e não apaga os cadastros atuais.</p></div>'+
    '<details class="v13-backup-extra"><summary>Mais opções de recuperação '+icon('arrowdown')+'</summary><div class="backup-row"><button type="button" class="button ghost" id="list-history">' +
    icon('layers') + 'Versões automáticas</button><button type="button" class="button ghost" id="migrate-v2">Importar cadastros locais V2</button></div>'+
    '<div id="backup-history"></div></details><p class="backup-progress" id="backup-progress" role="status"></p>'+ 
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
  dialog.querySelector('[data-action="backup-x"]').addEventListener('click',()=>dialog.close());
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
      state.pedalMap=loadPedalMap();midi.settings=loadMidiSettings(localStorage);midi.cancelLearn();if(!midi.settings.enabled)midi.disconnect();updateMidiStatus();
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

function selectionSignature(song){return sortedSignature(song)+(song?.repertoireKey?JSON.stringify([song.repertoireKey,song.repertoireBpm,song.name,song.partLabels,song.customSections,song.mixer]):'');}
function sortedSignature(song) { return song ? song.id + ':' + (song.edit || song.revision) + ':' + crashSignature(song) : ''; }

async function refreshLocal() {
  const current = repo;
  const rows = await current.catalog();
  if (repo !== current) return;
  state.songs = rows;
  const previousLibrary=JSON.stringify(cleanLibrary(state.libraryData));
  if(!entryMixPending.size&&!entryMixWrites)state.libraryData = await current.libraryState();
  const libraryChanged=previousLibrary!==JSON.stringify(cleanLibrary(state.libraryData));
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
  let latest = await preferDownloaded(preferred);
  if(state.activeRepId){const rep=state.libraryData.repertoires.find(r=>r.id===state.activeRepId);const entries=repertoireEntries(rep,available);
    const index=state.selected?.repertoireItemId?entries.findIndex(e=>e.itemId===state.selected.repertoireItemId):state.activeRepPos;
    if(index>=0&&entries[index]){state.activeRepPos=index;latest=repertoireSong(entries[index],rep.id);}else{state.activeRepId=null;state.activeRepPos=0;}
  }
  if (repo !== current) return;
  const editingLibrary=document.activeElement?.matches('[data-folder-name],[data-rep-field],[data-rep-bpm],[data-rep-title]')||Boolean(document.querySelector('#rep-custom-dialog'));
  if(libraryChanged&&state.view==='admin'&&['folders','repertoires'].includes(state.adminPanel)&&!editingLibrary){render();return;}
  if (!player.running && selectionSignature(latest) !== state.selectedSignature && !entryMixPending.size && !entryMixWrites) {
    selectLive(latest,repertoireTempo(latest));
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
  flushEntryMixWrites();await draftWrites.catch(()=>{});
  if(syncTask)return syncTask;
  if(!repo||player.running)return;
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
      if(cloud.musician && error.code===401){
        stopPlayback();const oldRepo=repo;cloud.user=null;repo=null;state.songs=[];oldRepo?.purgeMusicianCache?.().catch(()=>{});
        try{localStorage.removeItem('loops-v12-musician-verified');}catch{}
        cloud.authError='Link do músico revogado ou expirado.';render();return;
      }
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

function loadLiveCount(song) {
  if (!song) return {enabled:false,bars:1};
  const defaults={enabled:song.countIntroEnabled!==false,bars:Math.min(2,Math.max(1,Number(song.parts?.countIntro?.bars)||1))};
  try {
    const saved=JSON.parse(localStorage.getItem('loops-v20-count-'+(song.repertoireKey||song.id))||'null');
    if(saved && typeof saved.enabled==='boolean' && [1,2].includes(saved.bars)) return saved;
  } catch {}
  return defaults;
}
function updateLiveCount(enabled,bars) {
  const present=Boolean(state.selected?.parts?.countIntro?.path);
  state.liveCountEnabled=Boolean(enabled)&&present;
  state.liveCountBars=bars===2?2:1;
  player.setCountControl(state.liveCountEnabled,state.liveCountBars);
  if(state.selected?.id) {
    try {localStorage.setItem('loops-v20-count-'+(state.selected.repertoireKey||state.selected.id),JSON.stringify({enabled:state.liveCountEnabled,bars:state.liveCountBars}));} catch {}
  }
}
function selectLive(song,bpmOverride=null) {
  currentGeneration++;
  const count=loadLiveCount(song);
  state.liveCountEnabled=count.enabled && Boolean(song?.parts?.countIntro?.path);
  state.liveCountBars=count.bars;
  player.setCountControl(state.liveCountEnabled,state.liveCountBars);
  clearTimeout(prepTimer);
  state.selected = song;
  state.volume=profileFor(song).master.level;
  state.selectedSignature = selectionSignature(song);
  state.bpm = bpmOverride || song?.bpm || 0;
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
        await current.download(state.songs.find(s=>s.id===shown.id)||shown, (count, all) => {
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
      state.offline.set(shown.id, state.songs.find(s=>s.id===shown.id)||shown);
      updateLibrary();
      local = await current.available(shown);
      if (!local) throw new Error('Os WAVs não ficaram completos no aparelho. Tente Baixar para offline.');
    }
    const ready = await player.prepare(shown, state.bpm, path => current.audio(path));
    if (!ready || generation !== currentGeneration) return;
    player.updateMix(profileFor(state.selected));
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

// V23: só mostra ataques com WAV associado e confirmado na preparação atual.
function updateLiveCrashVisibility() {
  const section = get('#live-crashes');
  if (!section) return;
  const available = new Set(preparedCrashParts(state.selected, player).map(part => part.id));
  for (const pad of section.querySelectorAll('[data-action="crash"]')) {
    pad.hidden = !available.has(pad.dataset.part);
    if (pad.hidden) pad.disabled = true;
  }
  section.hidden = available.size === 0;
}

function updatePlayback(force = false) {
  const playing = player.summary();
  const previous = state.info;
  state.info = playing;
  if (get('#stage-active')) {
    const isFill = Boolean(playing.active && ([...PARTS, ...(state.selected?.customFills || [])]
      .some(part => part.id === fillBase(playing.active) && part.type === 'virada')));
    const name = playing.active ? player.label(playing.active) :
      (player.ready ? player.label(playing.armed || player.initialPart || 'a') : 'Aguardando');
    const mode = !playing.running ? (player.ready ? (playing.armed?'Parte selecionada · Pronto para iniciar':'Pronto para iniciar') : 'Preparando áudio') :
      extraBreaks(state.selected).some(p=>p.id===playing.active)?'Trecho em execução · retorno automático':isFill ? 'Virada em execução' : playing.entryAttack ? 'Entrada com crash' :
      playing.active === 'countIntro' ? 'Contagem de baquetas' : playing.active === 'intro' ? 'Introdução musical' : 'Loop contínuo';
    const next = playing.next ? 'PRÓXIMO · ' + player.label(playing.next) : (playing.sequenceTotal ? 'MAPA · '+(playing.sequenceIndex+1)+'/'+playing.sequenceTotal : '');
    const mapStatus=get('#live-map-status');if(mapStatus&&playing.sequenceTotal)mapStatus.textContent='Mapa '+(playing.sequenceAuto?'automático':'assistido')+' · '+(playing.sequenceIndex+1)+'/'+playing.sequenceTotal;
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
    (playing.offsetBeats ? ' (últimos ' + Number(playing.fillBeats.toFixed(2)) + 'T)' : '') + ' → ' : '') + player.label(playing.next)) : '';
  const message = playing.interrupted ? 'Áudio suspenso · toque em Retomar' :
    playing.running ? (queued || (playing.active ? player.label(playing.active) + (playing.entryAttack ? ' · entrada com crash' : playing.active==='countIntro' ? ' · contagem antes da entrada' : ' · contínuo') : 'Iniciando…')) :
    (preparation || (player.ready ? (playing.armed ? 'Selecionada '+player.label(playing.armed)+' · Iniciar '+(state.liveCountEnabled && player.buffers.has('countIntro') ? 'toca a contagem antes dela':'entra direto nessa parte') : 'Todos os áudios preparados · Pronto para tocar') : 'Selecione os áudios para tocar.'));
  const chip = playing.running ? (playing.interrupted ? 'Interrompido' : 'Tocando') : player.ready ? 'Pronto para tocar' : 'Aguardando áudio';
  const closing = ['finish','outro'].includes(playing.next) ||
    ['finish','outro'].includes(playing.active);
  const crashChanged=(previous.crashQueued||[]).join('|')!==(playing.crashQueued||[]).join('|') ||
    (previous.crashPlaying||[]).join('|')!==(playing.crashPlaying||[]).join('|');
  if (force || crashChanged || JSON.stringify(previous.layerStates)!==JSON.stringify(playing.layerStates) || previous.autoCrashEnabled!==playing.autoCrashEnabled || previous.running !== playing.running || previous.next !== playing.next ||
      previous.fill !== playing.fill || previous.active !== playing.active || previous.armed !== playing.armed || previous.entryAttack !== playing.entryAttack || previous.canCancel !== playing.canCancel || previous.interrupted !== playing.interrupted) {
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
    const autoSection=get('#live-auto-crash'),autoBtn=get('#auto-crash-toggle');
    if(autoSection&&autoBtn){const available=player.ready&&player.song?.id===state.selected.id&&AUTO_CRASHES.some(p=>hasAudioPart(state.selected,p.id)&&player.song.parts?.[p.id]?.path===state.selected.parts?.[p.id]?.path&&player.buffers.has(p.id));autoSection.hidden=!available;autoBtn.disabled=!available;autoBtn.setAttribute('aria-pressed',String(playing.autoCrashEnabled));autoBtn.querySelector('span').textContent='Crash automático: '+(playing.autoCrashEnabled?'LIGADO':'DESLIGADO');}
    const rideSection=get('#live-ride');if(rideSection)rideSection.hidden=!LAYER_IDS.some(key=>layerAvailable(key));
    updateLiveCrashVisibility();
    for (const pad of app.querySelectorAll('.pad')) {
      const key = pad.dataset.part;
      if(pad.dataset.action==='restart-intro'){pad.disabled=playing.running||startPending||!player.ready||!player.buffers.has('intro');pad.classList.toggle('active',playing.active==='intro');continue;}
      const isCrash = pad.dataset.action==='crash';
      const isLayer=LAYER_IDS.includes(key)&&pad.dataset.action===LAYER_ACTIONS[key];
      const layerState=playing.layerStates?.[key]||'off';
      if(isLayer)pad.hidden=!layerAvailable(key);
      const current = isLayer?layerState==='playing':isCrash ? Boolean(playing.crashPlaying?.includes(key)) : playing.active === key;
      const inQueue = isLayer?layerState==='suspended':isCrash ? Boolean(playing.crashQueued?.includes(key)) : (playing.next === key || playing.fill === key);
      const armed = !playing.running && playing.armed === key;
      pad.classList.toggle('active', current);
      pad.classList.toggle('queued', inQueue);
      pad.classList.toggle('armed', armed);
      if(pad.dataset.action==='break')pad.hidden=!(player.ready&&player.song?.id===state.selected.id&&hasAudioPart(state.selected,key)&&player.song.parts?.[key]?.path===state.selected.parts?.[key]?.path&&player.buffers.has(key));
      const selectableStopped = (pad.dataset.action==='part' && player.loopKeys.has(key) && player.ready)||isLayer&&layerAvailable(key);
      pad.disabled = pad.hidden || (!playing.running && !selectableStopped) || (pad.dataset.action === 'fill' ? !player.fillExists(key) : !player.buffers.has(key)) || closing;
      const info = pad.querySelector('small');
      if (info) info.textContent = isLayer?(layerState==='playing'?'ATIVADO · tocando':layerState==='suspended'?'ATIVADO · aguardando parte':'DESATIVADO'):pad.dataset.action==='break'?(current?'Em execução':inQueue?'Na fila':(state.selected.parts?.[key]?.bars||1)+' comp. · retorno automático'):armed ? 'Selecionada para iniciar' : current ? (playing.entryAttack ? 'Com crash' : 'Tocando') : inQueue ? 'Na fila' :
        pad.dataset.action === 'fill' ? 'Virada avulsa' : isCrash ? (inQueue ? 'Ataque no próximo tempo 1' : current ? 'Crash soando sobre a bateria' : 'Adicionar crash no tempo 1') : ['finish','outro'].includes(key) ? 'Finalizar' :
        (state.selected.parts?.[key + 'Entry'] ? 'Entrada + contínuo' : 'Loop contínuo');
    }
    for(const group of app.querySelectorAll('.live-break-group'))group.hidden=![...group.querySelectorAll('.pad')].some(p=>!p.hidden);
    const cancel = get('#cancel-btn');
    if (cancel) { cancel.hidden = !playing.canCancel; cancel.disabled = !playing.canCancel; }
    get('#wave-caption').textContent = playing.active ? player.label(playing.active) + (playing.entryAttack ? ' · Crash' : '') : player.label(playing.armed || player.initialPart || 'a');
    if ((previous.active !== playing.active || previous.armed !== playing.armed) && player.ready) computePeaks(playing.active || playing.armed || player.initialPart || 'a');
    updateDownload();
  }
  const modeLabel = get('#fill-mode span');
  if (modeLabel) modeLabel.textContent = 'Virada: ' + (player.mode === 'smart' ? 'INTELIGENTE' : 'PRÓXIMO 1');
  const countSelector=get('#live-count-bars');
  if(countSelector) countSelector.disabled=playing.running || !player.buffers.has('countIntro');
  const countLabel=get('#live-count-toggle');
  if(countLabel) {
    countLabel.setAttribute('aria-pressed',String(state.liveCountEnabled));
    countLabel.disabled=playing.running || !player.buffers.has('countIntro');
    const span=countLabel.querySelector('span');
    if(span)span.textContent='Contagem: '+(state.liveCountEnabled?'LIGADA':'DESLIGADA');
  }
  const opening=get('#opening-path');
  if(opening) {
    const text=(state.liveCountEnabled && player.buffers.has('countIntro') ? 'Contagem de baquetas ('+state.liveCountBars+' comp.) → ' : '')+(player.buffers.has('intro')?'Introdução musical ('+(state.selected.introMode==='repeat'?'repete até comando':'uma vez')+') → ':'')+'Parte escolhida';
    if(opening.dataset.path!==text){opening.dataset.path=text;opening.innerHTML=icon('music')+' <strong>Abertura:</strong> '+escape(text);}
  }
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
  flushEntryMixWrites();requestSync();
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
  flushMixerWrites();
  if (draftTimer) await persistDraft();
  else await draftWrites;
}

async function changeView(view) {
  if (musicianLink && view !== 'live') return; // Link do músico nunca mostra a Central de edição.
  if (state.view === view) return;
  mixerOpen=false;hideMixer();
  stopPreview();
  if (state.capture || startPending) return;
  if (player.running) {
    if (!await confirmChoice('Parar a reprodução?', 'A música está tocando.', 'Parar e abrir')) return;
    stopPlayback();
  }
  await saveBeforeLeaving();
  state.view = view;
  if(view!=='live'){document.body.classList.remove('palco-focus');if(document.fullscreenElement)document.exitFullscreen?.().catch(()=>{});}
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
      if (sortedSignature(song) !== sortedSignature(state.selected) && !state.selected?.repertoireKey) selectLive(song);
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
  return PARTS.find(part => part.id === id) || extraBreaks(song).find(p=>p.id===id) || song.customFills?.find(part => part.id === id) || extraSections(song).find(part=>part.id===id) || extraSections(song).map(part=>({...part,id:part.id+'Entry',type:'entrada'})).find(part=>part.id===id);
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
  const ending = ['outro','finish',...ATTACK_IDS].includes(part);
  const variant = part.match(/__(\d+)$/);
  const fill = slotInfo(song,fillBase(part))?.type === 'virada';
  if (variant && (!fill || Number(variant[1]) > song.beats)) throw new Error('Variação inválida para o compasso atual.');
  if (!ending) {
    const timing=classifyDuration(duration,song,fill);
    const beats=Math.max(1,timing.beats);
    if (!timing.ok && timing.reason==='tempo') {
      throw new Error(file.name + ': o WAV mede '+duration.toFixed(3)+' s, mas não encaixa em ' +
        meterOf(song) + ' a '+song.bpm+' BPM. Um compasso deve durar '+wavMeasure(song).toFixed(3)+
        ' s. Confira o compasso, o BPM e o corte na DAW.');
    }
    if (variant && beats !== Number(variant[1])) {
      throw new Error(file.name + ': esta variação deve ter exatamente ' + variant[1] + ' tempos.');
    }
    if (!fill && !timing.ok) {
      throw new Error(file.name + ': o loop precisa conter compassos completos de ' + meterOf(song) +
        ' ('+song.beats+' pulsos por compasso). Confira o corte do WAV.');
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
  const slots = [...PARTS, ...(song.customFills || []), ...variants,...extraBreaks(song)];
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
  gain.gain.value = previewGain(part,state.admin);
  source.buffer = buffer;
  source.connect(gain).connect(previewContext.destination);
  previewSound = {part, source, gain, songId:state.admin.id};
  source.onended = () => { if (previewSound?.source === source) stopPreview(); };
  source.start();
  paintPreviewButtons();
  notice('Ouvindo ' + (slotInfo(state.admin, part)?.label || part) + '…');
}

async function reuseWavInPart(target) {
  const song = state.admin;
  if (!song || !slotInfo(song, target)) return;
  const options = Object.entries(song.parts||{}).filter(([key,meta]) => key!==target && meta?.path);
  if (!options.length) { notice('Importe primeiro um WAV em outra parte deste cadastro.'); return; }
  dialog.innerHTML = '<h2>Reutilizar WAV já cadastrado</h2><p class="subtle">O mesmo áudio será vinculado a outra parte, sem nova importação. Os dois botões funcionarão separadamente.</p>'+
    '<label class="field"><span>WAV de origem</span><select id="reuse-source">'+options.map(([key,meta])=>
      '<option value="'+escape(key)+'">'+escape(label(key))+' — '+escape(meta.name||'WAV')+'</option>').join('')+'</select></label>'+
    '<menu>'+button('reuse-cancel','Cancelar','x','ghost')+button('reuse-confirm','Usar este WAV','check','primary')+'</menu>';
  dialog.showModal();
  dialog.querySelector('[data-action="reuse-cancel"]').onclick=()=>dialog.close();
  dialog.querySelector('[data-action="reuse-confirm"]').onclick=async()=>{
    const key=dialog.querySelector('#reuse-source')?.value;
    const source=song.parts?.[key];if(!source)return;
    const srcFill=slotInfo(song,fillBase(key))?.type==='virada';
    const dstFill=slotInfo(song,fillBase(target))?.type==='virada';
    const srcEnding=['finish','outro',...ATTACK_IDS].includes(key);
    const dstEnding=['finish','outro',...ATTACK_IDS].includes(target);
    const beats=Number(source.lengthBeats||source.bars*song.beats);
    const variant=target.match(/__(\d+)$/);
    if(srcEnding!==dstEnding){notice('Para manter a duração correta, reutilize encerramentos apenas em outros encerramentos.');return;}
    if(srcFill!==dstFill && !dstEnding && (!Number.isInteger(beats)||(!dstFill&&beats%song.beats!==0))) {
      notice('Este WAV não tem duração compatível com a parte de destino.');return;
    }
    if(variant && beats!==Number(variant[1])){notice('A variação deve conter '+variant[1]+' tempos.');return;}
    song.parts[target] = {...structuredClone(source)};
    try { await persistDraft(); dialog.close(); render(); notice('WAV reutilizado sem duplicar o arquivo.'); }
    catch(e){notice(e.message);}
  };
}

async function saveLibraryData() {
  flushEntryMixWrites();await draftWrites;
  state.libraryData=await repo.saveLibrary(state.libraryData);
  requestSync();
}
function currentRepertoire(){return (state.libraryData.repertoires||[]).find(r=>r.id===state.repEditingId)||state.libraryData.repertoires?.[0]||null;}
function repertoireTempo(song){if(!song?.repertoireBpm)return null;const [min,max]=bpmRange(song.bpm);return Math.max(min,Math.min(max,song.repertoireBpm));}
async function playRepertoire(id,index=0){
  const rep=(state.libraryData.repertoires||[]).find(r=>r.id===id);
  const entries=repertoireEntries(rep,songsFor('live'));
  if(!entries.length){notice('Este repertório não possui músicas ou ritmos disponíveis.');return;}
  if(player.running && !await confirmChoice('Trocar de música?','A bateria atual será interrompida.','Trocar'))return;
  if(player.running)stopPlayback();
  flushEntryMixWrites();await draftWrites;
  state.activeRepId=id;state.activeRepPos=Math.max(0,Math.min(index,entries.length-1));
  const entry=entries[state.activeRepPos];
  let tempo=entry.bpm;
  if(tempo){const [min,max]=bpmRange(entry.song.bpm);if(tempo<min||tempo>max){tempo=Math.min(max,Math.max(min,tempo));notice('BPM do repertório ajustado ao limite de ±10 do arquivo original.');}}
  selectLive(repertoireSong(entry,rep.id),tempo);
  toggleLibrary(false);
  window.scrollTo?.(0,0);
}
async function mutateRepertoire(task){
  const rep=currentRepertoire();if(!rep)return;
  await task(rep);
  await saveLibraryData();render();
}
async function handleAction(element) {
  const { action, id, part } = element.dataset;
  if(action==='mixer-open'){mixerOpen=!mixerOpen;if(mixerOpen)showMixer();else hideMixer();return;}
  if(action==='mixer-close'){mixerOpen=false;hideMixer();return;}
  if(action==='mixer-mute'){const id=element.dataset.channel;const song=mixerSong();if(song&&MIX_IDS.includes(id))setMixerValue(id,'muted',!profileFor(song)[id].muted);return;}
  if(action==='mixer-solo'){const id=element.dataset.channel;const song=mixerSong();if(song&&id!=='master'&&MIX_IDS.includes(id))setMixerValue(id,'solo',!profileFor(song)[id].solo);return;}
  if(action==='mixer-clear-solo'){const song=mixerSong();if(song){const profile=normalizeMix(profileFor(song),song);for(const id of MIX_IDS)profile[id].solo=false;applyMixer(song,profile);}return;}
  if(action==='mixer-reset'){const song=mixerSong();if(song)applyMixer(song,normalizeMix(null,song));return;}
  if(action==='stage-fullscreen'){await stageFullScreen();return;}
  if(action==='editor-tab'){showEditorTab(element.dataset.tab,true);return;}
  if(action==='catalog-view'){
    state.catalogView=element.dataset.mode==='lista'?'lista':'cards';
    try{localStorage.setItem('loops-v14-catalog-view',state.catalogView);}catch{}
    render();return;
  }
  if(action==='toggle-management'){state.managementOpen=!state.managementOpen;
    try{localStorage.setItem('loops-v12-management',state.managementOpen?'open':'closed');}catch{}render();return;}
  if(action==='collapse-sidebar'){state.sidebarCollapsed=!state.sidebarCollapsed;
    try{localStorage.setItem('loops-v12-sidebar',state.sidebarCollapsed?'collapsed':'open');}catch{}render();return;}
  if(action==='settings'){await openSettingsModal();return;}
  if(action==='pedal-setup'){await openPedalModal();return;}
  if(action==='midi-setup'){openMidiModal();return;}

  if(action==='drawer-tab'){state.drawerTab=element.dataset.tab;updateLibrary();return;}
  if(action==='choose-repertoire'){await playRepertoire(id);return;}
  if(action==='rep-prev-live'||action==='rep-next-live'){
    if(!state.activeRepId)return;
    await playRepertoire(state.activeRepId,state.activeRepPos+(action==='rep-next-live'?1:-1));return;
  }
  if(action==='download-repertoire'){
    if(!state.activeRepId||player.running||state.download)return;
    const rep=(state.libraryData.repertoires||[]).find(r=>r.id===state.activeRepId);
    const entries=repertoireEntries(rep,songsFor('live'));
    state.download='Baixando repertório…';updateDownload();
    try{for(let i=0;i<entries.length;i++){
      const song=entries[i].song;if(song.demo)continue;
      state.download='Baixando '+(i+1)+'/'+entries.length+': '+song.name;updateDownload();
      await repo.download(song);
      state.offline.set(song.id,song);
    }notice(entries.length+' itens verificados para uso offline.');updateLibrary();}
    catch(e){notice(e.message||'Falha ao baixar repertório.');}
    finally{state.download='';updateDownload();}return;
  }
  if(action==='show-kind'||action==='select-folder'||action==='show-repertoires'||action==='show-folders'){
    await saveBeforeLeaving();
    if(action==='show-kind') {state.adminKind=element.dataset.kind;state.adminFolder='';state.adminPanel='catalog';state.admin=null;}
    if(action==='select-folder') {state.adminFolder=element.dataset.folder||'';state.adminPanel='catalog';state.admin=null;}
    if(action==='show-repertoires') {state.adminPanel='repertoires';state.repEditingId||=state.libraryData.repertoires?.[0]?.id||null;}
    if(action==='show-folders')state.adminPanel='folders';
    render();return;
  }
  if(action==='make-from-rhythm'){
    if(!state.admin||songKind(state.admin)!=='rhythm')return;
    await saveBeforeLeaving();
    const template=structuredClone(state.admin);
    state.admin={...template,id:crypto.randomUUID(),kind:'music',folderId:'',
      name:('Música baseada em '+(template.name||'ritmo')).slice(0,90),revision:0,edit:undefined,dirty:true,conflict:null};
    state.adminKind='music';state.adminFolder='';state.adminPanel='editor';
    await persistDraft();render();notice('Música criada compartilhando os WAVs do ritmo.');return;
  }
  if(action==='rename-part'){await openPartRename(part);return;}
  if(action==='section-add'){
    if(!state.admin||songKind(state.admin)==='rhythm'&&false)return;
    state.admin.customSections ||= [];
    if(state.admin.customSections.length>=36){notice('Limite de 36 partes adicionais.');return;}
    const newId='section_'+crypto.randomUUID().replace(/-/g,'').slice(0,12);
    const used=new Set([...playableParts(state.admin).map(p=>p.label),...PLAY_PARTS.map(p=>p.label),...extraSections(state.admin).map(p=>p.defaultLabel)]);
    let letter=70;while(letter<=90&&used.has('Parte '+String.fromCharCode(letter)))letter++;
    let name=letter<=90?'Parte '+String.fromCharCode(letter):'Parte extra '+(state.admin.customSections.length+1);
    state.admin.customSections.push({id:newId,label:name,defaultLabel:name});
    await persistDraft();render();return;
  }
  if(action==='section-remove'){
    if(!state.admin)return;
    const key=id;if(!await confirmChoice('Excluir parte musical?','O WAV e as etapas que usam esta parte serão retirados do cadastro.','Excluir'))return;
    state.admin.customSections=(state.admin.customSections||[]).filter(s=>s.id!==key);
    delete state.admin.parts[key];delete state.admin.parts[key+'Entry'];
    state.admin.sequence=(state.admin.sequence||[]).filter(s=>s.part!==key);
    state.admin.transitions=Object.fromEntries(Object.entries(state.admin.transitions||{}).filter(([k])=>!k.split('>').includes(key)));
    await persistDraft();render();return;
  }
  if(action==='seq-add'){
    const key=get('#seq-add-part')?.value;if(!key)return;
    state.admin.sequence ||= [];if(state.admin.sequence.length>=120){notice('Máximo de 120 etapas.');return;}
    if(key==='intro'){
      if(state.admin.sequence.some(s=>s.part==='intro')){notice('A introdução já está no mapa.');return;}
      for(const step of state.admin.sequence)if(step.jumpTo>=0)step.jumpTo++;
      state.admin.sequence.unshift({part:key,repeats:1,jumpTo:-1});
    } else state.admin.sequence.push({part:key,repeats:1,jumpTo:-1});
    await persistDraft();render();return;
  }
  if(['seq-remove','seq-up','seq-down'].includes(action)){
    const index=Number(element.dataset.index),steps=state.admin.sequence||[];
    if(!Number.isInteger(index)||index<0||index>=steps.length)return;
    if(action==='seq-remove'){
      steps.splice(index,1);
      for(const step of steps)if(step.jumpTo>=0){if(step.jumpTo===index)step.jumpTo=-1;else if(step.jumpTo>index)step.jumpTo--;}
    }else{
      const next=index+(action==='seq-up'?-1:1);if(next<0||next>=steps.length)return;
      [steps[index],steps[next]]=[steps[next],steps[index]];
      for(const step of steps){if(step.jumpTo===index)step.jumpTo=next;else if(step.jumpTo===next)step.jumpTo=index;}
    }
    await persistDraft();render();return;
  }
  if(action==='map-next'||action==='map-previous'){
    if(player.nextSequence(action==='map-previous'?-1:1)) updatePlayback(true);
    else notice('Não há outra etapa disponível no mapa.');return;
  }
  if(action==='new-repertoire'){
    const rep={id:crypto.randomUUID(),name:'Novo repertório',date:'',items:[]};
    state.libraryData.repertoires.push(rep);state.repEditingId=rep.id;
    await saveLibraryData();render();return;
  }
  if(action==='edit-repertoire'){state.repEditingId=id;render();return;}
  if(action==='rep-add'){
    const selected=get('#rep-add-song')?.value;if(!selected)return;
    const source=state.songs.find(song=>song.id===selected&&!song.deleted);if(!source)return;
    const title=get('#rep-add-name')?.value.trim().slice(0,90)||'';
    if(songKind(source)==='rhythm'&&!title){notice('Informe o nome da música para utilizar este ritmo no repertório.');get('#rep-add-name')?.focus();return;}
    const raw=get('#rep-add-bpm')?.value.trim()||'';const tempo=raw?Number(raw):null;
    const [min,max]=bpmRange(source.bpm);
    if(tempo!==null&&(!Number.isInteger(tempo)||tempo<min||tempo>max)){notice('Este WAV permite BPM entre '+min+' e '+max+'. O ritmo original não será modificado.');get('#rep-add-bpm')?.focus();return;}
    await mutateRepertoire(rep=>{rep.items.push({songId:selected,bpm:tempo,title,itemId:crypto.randomUUID()});});return;
  }
  if(action==='rep-customize'){await openEntryEditor(Number(element.dataset.index));return;}
  if(['rep-up','rep-down','rep-remove'].includes(action)){
    const index=Number(element.dataset.index);
    await mutateRepertoire(rep=>{
      if(!Number.isInteger(index)||index<0||index>=rep.items.length)return;
      if(action==='rep-remove')rep.items.splice(index,1);
      else {const next=index+(action==='rep-up'?-1:1);if(next<0||next>=rep.items.length)return;
        [rep.items[index],rep.items[next]]=[rep.items[next],rep.items[index]];}
    });return;
  }
  if(action==='duplicate-repertoire'){
    const rep=currentRepertoire();if(!rep)return;
    const clone=structuredClone(rep);clone.id=crypto.randomUUID();clone.items=clone.items.map(item=>({...item,itemId:crypto.randomUUID()}));clone.name=(rep.name+' (cópia)').slice(0,90);
    state.libraryData.repertoires.push(clone);state.repEditingId=clone.id;
    await saveLibraryData();render();return;
  }
  if(action==='delete-repertoire'){
    const rep=currentRepertoire();if(!rep)return;
    if(!await confirmChoice('Excluir repertório?','As músicas e WAVs permanecerão na biblioteca.','Excluir repertório'))return;
    state.libraryData.repertoires=state.libraryData.repertoires.filter(r=>r.id!==rep.id);
    state.repEditingId=state.libraryData.repertoires[0]?.id||null;
    await saveLibraryData();render();return;
  }
  if(action==='use-repertoire'){
    const rep=currentRepertoire();if(!rep)return;
    await changeView('live');await playRepertoire(rep.id);return;
  }
  if(action==='delete-folder'){
    const folder=state.libraryData.folders.find(f=>f.id===id);if(!folder)return;
    if(!await confirmChoice('Excluir pasta?','Os itens serão mantidos na biblioteca, sem pasta.','Excluir pasta'))return;
    await saveBeforeLeaving();
    for(const song of state.songs.filter(s=>!s.deleted&&s.folderId===id)) {
      const saved=await repo.save({...song,folderId:''});replaceLocalSong(saved);
    }
    state.libraryData.folders=state.libraryData.folders.filter(f=>f.id!==id);
    if(state.adminFolder===id)state.adminFolder='';
    if(state.admin?.folderId===id)state.admin.folderId='';
    await saveLibraryData();render();return;
  }

  if (action === 'auth-check') {
    element.disabled=true;
    const result=get('#auth-check-message');
    if(result) result.textContent='Verificando…';
    try {const status=await cloud.diagnoseIdentity();if(result) result.textContent=status;}
    catch {if(result) result.textContent='Não foi possível verificar a conexão com o Netlify.';}
    finally {element.disabled=false;}
    return;
  }
  if (action === 'open-library') {mixerOpen=false;hideMixer();toggleLibrary(true); return;}
  if (action === 'close-library') { toggleLibrary(false); return; }
  if (action === 'live' || action === 'admin') {
    if(action==='admin'&&state.view==='admin'){state.adminPanel='editor';render();return;}
    await changeView(action);return;
  }
  if (action === 'link') { await copyMobile(); return; }
  if (action === 'backup') { await openBackupCenter(); return; }
  if (action === 'restart-intro') {if(!player.running&&player.ready&&player.buffers.has('intro')){player.armedPart=null;await startPlayer();}return;}
  if (action === 'play') { await startPlayer(); return; }
  if (action === 'stop') { stopPlayback(); return; }
  if (action === 'part') { if (!player.go(part)) notice('Parte indisponível ou aguarde a troca atual.'); updatePlayback(true); return; }
  if (action === 'crash') { if (!preparedCrashParts(state.selected, player).some(item => item.id === part)) return; if (!player.crash(part)) notice('Inicie um loop musical antes de acionar o crash.'); updatePlayback(true); return; }
  if(action==='auto-crash-toggle'){if(player.ready&&player.song?.id===state.selected?.id)player.toggleAutoCrash();updatePlayback(true);return;}
  if(action==='ride-toggle'||action==='hat-open-toggle'||action==='hat-closed-toggle'){const key=LAYER_IDS.find(k=>LAYER_ACTIONS[k]===action);if(layerAvailable(key))player.toggleLayer(key);updatePlayback(true);return;}
  if(action==='break'){if(player.ready&&player.song?.id===state.selected?.id&&hasAudioPart(state.selected,part)&&player.song.parts?.[part]?.path===state.selected.parts?.[part]?.path&&player.buffers.has(part))player.playBreak(part);updatePlayback(true);return;}
  if (action === 'toggle-live-count') {
    if(player.running){notice('Pare a reprodução para alterar a contagem inicial.');return;}
    updateLiveCount(!state.liveCountEnabled,state.liveCountBars);
    updatePlayback(true);
    return;
  }
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
    setLiveBpm(state.bpm + (action === 'slower' ? -1 : 1));
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
    state.errors=state.syncLabel='';state.libraryData=emptyLibrary();state.activeRepId=null;
    render();
    return;
  }
  if (state.capture) return;
  if (action === 'preview') { if (state.view === 'admin') await previewWav(part); return; }
  if (musicianLink && ['new','browse','remove-file','delete','batch-import','add-custom','remove-custom','add-break','remove-break','add-transition','remove-transition','backup','link'].includes(action)) return;
  if (action === 'song') {
    const song = songsFor(state.view).find(row => row.id === id);
    if (!song) return;
    if (state.view === 'live') {
      if (startPending || state.download) return;
      if(state.selected?.id===song.id&&!state.activeRepId){toggleLibrary(false);return;}
      if (player.running && !await confirmChoice('Trocar de música?', 'A reprodução atual vai parar.', 'Trocar música')) return;
      if (player.running) stopPlayback();
      flushEntryMixWrites();await draftWrites;
      state.activeRepId=null;state.activeRepPos=0;
      toggleLibrary(false);
      selectLive(await preferDownloaded(song));
      window.scrollTo?.(0,0);
    } else {
      await saveBeforeLeaving();
      state.admin = structuredClone(await repo.song(song.id) || song);
      state.adminKind=songKind(song);state.adminFolder=state.admin.folderId||'';state.adminPanel='editor';state.editorTab='dados';
      state.editLabel = '';
      render();
    }
    return;
  }
  if (action === 'new') {
    await saveBeforeLeaving();
    state.admin = {...newSong(),kind:state.adminKind,folderId:state.adminFolder};
    state.adminPanel='editor';state.editorTab='dados';
    state.editLabel = '';
    render();
    get('[data-field="name"]')?.focus();
    return;
  }
  if (!state.admin) return;
  if (action === 'batch-import') { get('#batch-files')?.click(); return; }
  if(action==='add-break'){
    if(!['counter','passage'].includes(part))return;state.admin.customBreaks||=[];if(state.admin.customBreaks.length>=250){notice('Limite de segurança do catálogo atingido.');return;}
    const items=extraBreaks(state.admin).filter(p=>p.group===part);const n=1+Math.max(0,...items.map(p=>Number(p.id.split('_')[1])));
    state.admin.customBreaks.push({id:part+'_'+n,label:(part==='counter'?'Contratempo ':'Passagem ')+n});await persistDraft();render();return;
  }
  if(action==='remove-break'){if(!await confirmChoice('Excluir este trecho?','O WAV será desvinculado deste cadastro.','Excluir'))return;state.admin.customBreaks=(state.admin.customBreaks||[]).filter(p=>p.id!==part);delete state.admin.parts[part];await persistDraft();render();return;}
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
  if (action === 'reuse-wav') { await reuseWavInPart(part); return; }
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
  if(state.pedalLearn!==null){
    if(event.key==='Escape'){state.pedalLearn=null;return;}
    if(event.repeat||['Shift','Control','Alt','Meta'].includes(event.key))return;
    event.preventDefault();
    const slot=state.pedalLearn;
    for(const [key,val] of Object.entries(state.pedalMap))if(val.slot===slot)delete state.pedalMap[key];
    const choice=dialog.querySelector('[data-pedal-action="'+slot+'"]')?.value||'';
    if(choice){state.pedalMap[event.code||('key-'+event.key)]={slot,command:choice};persistPedals();}
    state.pedalLearn=null;
    dialog.close();openPedalModal();
    return;
  }
  if(event.repeat||event.altKey||event.ctrlKey||event.metaKey||event.shiftKey)return;
  if((['INPUT','TEXTAREA','SELECT'].includes(event.target?.tagName)&&!event.target?.dataset?.mixLevel)||dialog.open||document.querySelector('#part-rename-dialog[open]'))return;
  const code=event.code||('key-'+event.key);
  if(state.pedalMap[code]&&state.view==='live'){
    event.preventDefault();receivePedal(code);
  }
});

document.addEventListener('keydown', event => {
  if(event.key==='Escape'&&mixerOpen){mixerOpen=false;hideMixer();return;}
  if (event.key === 'Escape' && state.libraryOpen) { event.preventDefault(); toggleLibrary(false); }
});

let lastRenameTap=null;
app.addEventListener('click', event => {
  const name=event.target.closest('[data-rename-part]');
  if(name){const now=Date.now(),id=name.dataset.renamePart;const songId=state.admin?.id;
    if(lastRenameTap?.id===id&&lastRenameTap.songId===songId&&now-lastRenameTap.time<=450){lastRenameTap=null;openPartRename(id).catch(e=>notice(e.message));}else lastRenameTap={id,songId,time:now};return;}
  const target = event.target.closest('[data-action]');
  if (!target || target.disabled) return;
  handleAction(target).catch(error => notice(error.message || 'Não foi possível concluir.'));
});

app.addEventListener('toggle',event=>{
  if(event.target.id==='v12-editor-intro'){
    state.introOpen=event.target.open;
    try{localStorage.setItem('loops-v12-editor-intro',state.introOpen?'open':'closed');}catch{}
  }
},true);

app.addEventListener('input', event => {
  const input = event.target;
  if(input.id==='admin-search'){state.adminSearch=input.value;updateAdminSidebar();return;}
  if (input.id === 'search') {
    if (state.view === 'live') state.searchLive = input.value;
    else state.searchAdmin = input.value;
    updateLibrary();
    return;
  }
  if(input.dataset.mixLevel){setMixerValue(input.dataset.mixLevel,'level',Number(input.value)/100);return;}
  if(input.id==='live-count-bars'){
    if(player.running){input.value=String(state.liveCountBars);notice('Pare a reprodução para alterar os compassos da contagem.');return;}
    updateLiveCount(state.liveCountEnabled,Number(input.value));
    updatePlayback(true);
    return;
  }
  if (!state.admin || !input.validity.valid) return;
  if(input.dataset.sectionName){const entry=state.admin.customSections?.find(s=>s.id===input.dataset.sectionName);if(entry){entry.label=input.value.slice(0,52);delayedSave();}return;}
  if(input.dataset.breakName){const b=state.admin.customBreaks?.find(p=>p.id===input.dataset.breakName);if(b&&input.value.trim()){b.label=input.value.trim().slice(0,52);delayedSave();}return;}
  if(input.dataset.cymbal){const key=input.dataset.cymbal;state.admin.cymbals=cymbalSettings(state.admin);state.admin.cymbals[key]=key==='autoEnabled'?input.value==='true':Math.max(0,Math.min(100,Number(input.value)||0))/100;if(previewSound?.songId===state.admin.id&&previewContext)previewSound.gain.gain.setTargetAtTime(previewGain(previewSound.part,state.admin),previewContext.currentTime,.012);delayedSave();return;}
  if(input.dataset.wavCymbal){const meta=state.admin.parts?.[input.dataset.part];if(meta){meta[input.dataset.wavCymbal]=input.value;delayedSave();}return;}
  if (input.dataset.customName) {
    const custom = state.admin.customFills?.find(item => item.id === input.dataset.customName);
    if (custom) { custom.label = input.value.slice(0,52); delayedSave(); }
    return;
  }
  if (input.dataset.field) {
    const field = input.dataset.field;
    if(field==='kind'){state.admin.kind=input.value==='rhythm'?'rhythm':'music';state.admin.folderId='';state.adminKind=state.admin.kind;state.adminFolder='';
      persistDraft().then(()=>render()).catch(()=>{});return;}
    if(field==='folderId'){state.admin.folderId=input.value;state.adminFolder=input.value;
      persistDraft().then(()=>render()).catch(()=>{});return;}
    if (field==='meter') {
      const pulses=countForMeter(input.value);
      if(!pulses || (meterChoice(state.admin)===input.value && state.admin.beats===pulses))return;
      const existing=Object.keys(state.admin.parts||{}).length;
      state.admin.meter=input.value==='6/8@quarter'?'6/8':input.value;
      state.admin.beatUnit=beatUnitForChoice(input.value);
      state.admin.beats=pulses;
      if(existing)notice('Compasso alterado. Confira os WAVs já importados: precisam corresponder ao novo compasso e BPM.');
      persistDraft().then(()=>render()).catch(error=>notice(error.message));
      return;
    }
    if(field==='countIntroEnabled'){state.admin.countIntroEnabled=input.value==='true';delayedSave();return;}
    if (['bpm', 'beats'].includes(field)) {
      if (!input.value || !Number(input.value)) return;
      state.admin[field] = Number(input.value);
    } else {
      state.admin[field] = input.value.trim();
      if (field === 'name') get('#editor-title').textContent = state.admin[field] || (songKind(state.admin)==='rhythm'?'Novo ritmo':'Nova música');
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
  const el=event.target;
  if(el.id==='live-count-bars'){
    if(player.running){el.value=String(state.liveCountBars);return;}
    updateLiveCount(state.liveCountEnabled,Number(el.value));updatePlayback(true);return;
  }
  if(el.dataset.folderName){
    const f=state.libraryData.folders.find(x=>x.id===el.dataset.folderName);
    if(f){const name=el.value.trim().slice(0,70);if(!name){el.value=f.name;notice('Informe o nome da pasta.');return;}
      f.name=name;saveLibraryData().then(()=>render()).catch(e=>notice(e.message));}return;
  }
  if(el.dataset.seqPart!==undefined||el.dataset.seqRepeats!==undefined||el.dataset.seqJump!==undefined){
    const index=Number(el.dataset.seqPart??el.dataset.seqRepeats??el.dataset.seqJump);
    const step=state.admin?.sequence?.[index];if(!step)return;
    if(el.dataset.seqPart!==undefined)step.part=el.value;
    if(el.dataset.seqRepeats!==undefined)step.repeats=Number(el.value);
    if(el.dataset.seqJump!==undefined)step.jumpTo=Number(el.value);
    persistDraft().then(()=>render()).catch(e=>notice(e.message));return;
  }
  if(el.dataset.repField){
    const rep=currentRepertoire();if(!rep)return;
    rep[el.dataset.repField]=el.value.trim();saveLibraryData().then(()=>render()).catch(e=>notice(e.message));return;
  }
  if(el.dataset.repTitle!==undefined){
    const rep=currentRepertoire();const entry=rep?.items[Number(el.dataset.repTitle)];if(!entry)return;
    entry.title=el.value.trim().slice(0,90);saveLibraryData().catch(e=>notice(e.message));return;
  }
  if(el.dataset.repBpm!==undefined){
    const rep=currentRepertoire();const entry=rep?.items[Number(el.dataset.repBpm)];if(!entry)return;
    const n=Number(el.value);if(el.value&&!Number.isInteger(n)||el.value&&(n<30||n>280)){notice('BPM entre 30 e 280.');return;}
    const source=state.songs.find(song=>song.id===entry.songId&&!song.deleted);
    if(el.value&&source){const [min,max]=bpmRange(source.bpm);if(n<min||n>max){notice('BPM permitido para este WAV: '+min+' a '+max+'.');el.value=entry.bpm||'';return;}}
    entry.bpm=el.value?n:null;saveLibraryData().then(()=>render()).catch(e=>notice(e.message));return;
  }
  if (event.target.id === 'batch-files') { batchPreview(event.target); return; }
  if (event.target.dataset.file) importWav(event.target).catch(error => notice(error.message));
});

app.addEventListener('submit', async event => {
  if(event.target.id==='create-folder-form'){
    event.preventDefault();
    const form=new FormData(event.target);const name=String(form.get('name')||'').trim().slice(0,70);
    const kind=form.get('kind');if(!name||!['music','rhythm'].includes(kind))return;
    if(state.libraryData.folders.some(f=>f.kind===kind&&normalized(f.name)===normalized(name))) {notice('Esta pasta já existe.');return;}
    state.libraryData.folders.push({id:crypto.randomUUID(),name,kind});
    try{await saveLibraryData();render();notice('Pasta criada e sincronização agendada.');}
    catch(e){notice(e.message||'Não foi possível criar a pasta.');}return;
  }
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
window.addEventListener('online', () => {
  if(cloud.musician&&cloud.session()){
    cloud.initializeMusician().then(user=>{if(!user){stopPlayback();repo=null;render();}else requestSync();});
  }else requestSync();updateTop();
});

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
setInterval(() => {
  if(document.visibilityState!=='visible')return;
  if(cloud.musician&&navigator.onLine&&cloud.session()){
    cloud.musicianRequest('?op=resolve').catch(error=>{
      if(error.code===401){stopPlayback();const oldRepo=repo;cloud.user=null;repo=null;state.songs=[];oldRepo?.purgeMusicianCache?.().catch(()=>{});
        try{localStorage.removeItem('loops-v12-musician-verified');}catch{}
        cloud.authError='Acesso revogado. Solicite um novo link ao administrador.';render();}
    });
  } else requestSync();
},20000);

async function boot() {
  await cloud.initialize();
  if (cloud.enabled && !cloud.session()) { render(); return; }
  repo = new Repository(cloud);
  render();
  await refreshLocal();
  if (state.view === 'admin' && !state.admin) {
    const first = songsFor('admin')[0];
    if (first) { state.admin = structuredClone(first);state.adminKind=songKind(first);render(); }
  }
  if (state.view === 'live' && state.selected && !player.ready && !state.preparation) prepareLive();
  requestSync();
}

if(musicianLink&&cloud.musicianToken){
  const manifest=document.querySelector('link[rel="manifest"]');
  if(manifest)manifest.href='/.netlify/functions/loops-musician?op=manifest&chave='+encodeURIComponent(cloud.musicianToken);
}
if ('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js').catch(() => {
  notice('Não foi possível ativar a abertura offline neste navegador.');
});
boot().then(()=>reconnectMidi()).catch(error => { cloud.authError = error.message || 'Falha ao abrir a central.'; render(); notice(cloud.authError); });

// Janelas de configurações também fecham ao tocar no fundo ou pressionar Esc.
dialog.addEventListener('click',event=>{if(event.target===dialog)dialog.close();});
