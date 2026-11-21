// Substituído durante `npm run build` pela integração Netlify Identity/fflate.
export async function login(){throw new Error('Execute npm run build e publique via GitHub/Netlify.');}
export async function logout(){}
export async function getUser(){return null;}
export async function getSettings(){throw new Error('Publique via GitHub para ativar o Netlify Identity.');}
export async function refreshSession(){return null;}
export async function handleAuthCallback(){}
export async function acceptInvite(){throw new Error('Publique via GitHub para ativar o Netlify Identity.');}
export async function updateUser(){throw new Error('Publique via GitHub para ativar o Netlify Identity.');}
export async function requestPasswordRecovery(){throw new Error('Publique via GitHub para ativar o Netlify Identity.');}
export function zipSync(){throw new Error('Faça a compilação antes de criar backups.');}
export function unzipSync(){throw new Error('Faça a compilação antes de restaurar backups.');}
export function strToU8(s){return new TextEncoder().encode(s);}
export function strFromU8(a){return new TextDecoder().decode(a);}
