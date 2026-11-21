import { configured, accountName, json, newSession, clearSession, sessionUser,
  credentialsValid, sameOrigin } from '../lib/auth.mjs';

export default async function handler(req) {
  const op = new URL(req.url).searchParams.get('op') || '';
  if (req.method==='GET' && op==='session') return json({configured:configured(),user:sessionUser(req)});
  if (req.method!=='POST' || !sameOrigin(req)) return json({message:'Requisição não autorizada.'},403);
  if (op==='logout') return json({ok:true},200,{'Set-Cookie':clearSession()});
  if (op!=='login') return json({message:'Operação inválida.'},404);
  if (!configured()) return json({message:'Configure a conta e a chave de sessão em Environment variables do Netlify.'},503);
  if (Number(req.headers.get('content-length') || 0)>2048) return json({message:'Solicitação grande demais.'},413);
  let body;
  try {body=await req.json();} catch {return json({message:'Dados de login inválidos.'},400);}
  if (!credentialsValid(body?.username,body?.password)) {
    // Não diferencia usuário inexistente e senha incorreta.
    return json({message:'Usuário ou senha incorretos.'},401);
  }
  return json({user:{id:'marks-pro-admin',email:accountName()}},200,{'Set-Cookie':newSession()});
}
