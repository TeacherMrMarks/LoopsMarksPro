// Verificação de sessão, como na Central de Cifras Studio Marks Pro.
// O usuário é identificado pelo Identity; cada conta só alcança seus próprios
// registros no loops-api, cuja autorização é verificada separadamente.
import {getUser} from '@netlify/identity';
const reply=(payload,status=200)=>Response.json(payload,{status,headers:{'Cache-Control':'private, no-store'}});
export default async function handler(request) {
  if(request.method !== 'GET') return reply({error:'Método não permitido.'},405);
  try {
    const user=await getUser();
    if(!user?.id || !user?.email) return reply({error:'Entre com uma conta autorizada no Netlify Identity.'},401);
    return reply({user:{id:user.id,email:user.email,roles:user.roles || []}},200);
  } catch {
    return reply({error:'O Netlify Identity não conseguiu validar a sessão. Confira a configuração do projeto.'},503);
  }
}
