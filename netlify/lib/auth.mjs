import { createHmac, createHash, timingSafeEqual } from 'node:crypto';
export const OWNER_ID = 'marks-pro-admin';
const COOKIE = '__Host-loops_session';
const SESSION_DAYS = 90;
const SESSION_SECONDS = SESSION_DAYS * 24 * 3600;
const json = (data, status=200, extra={}) => Response.json(data,{status,headers:{'Cache-Control':'no-store',...extra}});
export { json };
export const configured = () =>
  Boolean((process.env.LOOPS_ADMIN_PASSWORD||'').length>=16 &&
    (process.env.LOOPS_SESSION_SECRET||'').length>=32);
export const accountName = () => process.env.LOOPS_ADMIN_USERNAME || 'marks';
const hash = v => createHash('sha256').update(v).digest();
const same = (a,b) => timingSafeEqual(hash(String(a)),hash(String(b)));
function sign(payload) {
  return createHmac('sha256',process.env.LOOPS_SESSION_SECRET).update(payload).digest('base64url');
}
export function sessionUser(request) {
  if (!configured()) return null;
  const cookie=(request.headers.get('cookie')||'').split(';').map(v=>v.trim()).find(v=>v.startsWith(COOKIE+'='));
  if (!cookie) return null;
  const token=cookie.slice(COOKIE.length+1);
  const dot=token.indexOf('.');
  if (dot<1 || dot>500) return null;
  const payload=token.slice(0,dot), signature=token.slice(dot+1);
  if (!same(signature,sign(payload))) return null;
  try {
    const data=JSON.parse(Buffer.from(payload,'base64url').toString('utf8'));
    if (data.v!==1 || data.id!==OWNER_ID || data.e<=Math.floor(Date.now()/1000) ||
        data.e>Math.floor(Date.now()/1000)+SESSION_SECONDS+60 ||
        data.n!==createHash('sha256').update(process.env.LOOPS_ADMIN_PASSWORD).digest('hex').slice(0,16)) return null;
    return {id:OWNER_ID,email:accountName()};
  } catch {return null;}
}
export function newSession() {
  const payload=Buffer.from(JSON.stringify({id:OWNER_ID,v:1,e:Math.floor(Date.now()/1000)+SESSION_SECONDS,
    n:createHash('sha256').update(process.env.LOOPS_ADMIN_PASSWORD).digest('hex').slice(0,16)})).toString('base64url');
  return `${COOKIE}=${payload}.${sign(payload)}; Max-Age=${SESSION_SECONDS}; HttpOnly; Secure; SameSite=Lax; Path=/`;
}
export function clearSession() {
  return `${COOKIE}=; Max-Age=0; HttpOnly; Secure; SameSite=Lax; Path=/`;
}
export function credentialsValid(login,password) {
  if (!configured() || typeof login!=='string' || typeof password!=='string' || password.length>256 ||login.length>120) return false;
  return same(login,accountName()) && same(password,process.env.LOOPS_ADMIN_PASSWORD);
}
export function sameOrigin(req) {
  const origin=req.headers.get('origin');
  if (!origin) return false;
  try {return new URL(req.url).origin===origin;} catch {return false;}
}
