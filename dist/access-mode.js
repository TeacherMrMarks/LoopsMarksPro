// A musician link is never promoted to an Identity/admin session, even if its mode was stripped.
export function musicianRoute(search='') {
  const p=new URLSearchParams(search);
  return p.get('modo')==='musico'||p.has('chave');
}
export function phoneDevice(nav={},screen={}) {
  const ua=String(nav.userAgent||'');
  if(/iPhone|iPod|Windows Phone|Android.*Mobile|BlackBerry|Opera Mini/i.test(ua)||nav.userAgentData?.mobile===true)return true;
  // iPadOS desktop UA and touch tablets are also stage-only.
  if(/iPad|Android/i.test(ua)||(/Macintosh/i.test(ua)&&nav.maxTouchPoints>1))return true;
  return false; // ChromeOS and narrow desktop windows retain administrative access.
}
export function stageOnly({musician=false,phone=false,readonly=false}={}) {return musician||phone||readonly;}
const stageActions=new Set(['mixer-open','mixer-close','mixer-mute','mixer-solo','mixer-clear-solo','mixer-reset','stage-fullscreen','pedal-setup','midi-setup','audio-setup','drawer-tab','choose-repertoire','rep-prev-live','rep-next-live','download-repertoire','open-library','close-library','restart-intro','play','stop','part','crash','auto-crash-toggle','ride-toggle','hat-open-toggle','hat-closed-toggle','break','toggle-live-count','fill','mode-toggle','cancel-queue','download','sync','slower','faster','auth-back','auth-check','logout','song','map-next','map-previous','live']);
export const allowedStageAction=action=>stageActions.has(action);
