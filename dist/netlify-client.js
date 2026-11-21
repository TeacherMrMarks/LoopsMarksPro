// Loops Marks Pro V4 TESTE: sem Identity / sem Netlify / sem chamadas de rede.
export async function login(){throw Error('Modo teste sem autenticação.');}
export async function logout(){}
export async function getUser(){return null;}
export async function handleAuthCallback(){return null;}
export async function acceptInvite(){throw Error('Modo teste sem autenticação.');}
export async function updateUser(){throw Error('Modo teste sem autenticação.');}
export async function requestPasswordRecovery(){throw Error('Modo teste sem autenticação.');}
const strToU8 = str => new TextEncoder().encode(str);
const strFromU8 = bytes => new TextDecoder().decode(bytes);
const _crcTable = new Uint32Array(256);
for(let n=0;n<256;n++){let c=n;for(let j=0;j<8;j++)c=(c&1)?(0xEDB88320^(c>>>1)):(c>>>1);_crcTable[n]=c>>>0;}
function _crc32(bytes){let c=0xFFFFFFFF;for(let i=0;i<bytes.length;i++)c=_crcTable[(c^bytes[i])&255]^(c>>>8);return(c^0xFFFFFFFF)>>>0;}
function zipSync(inputs){
  const pieces=[],directory=[]; let offset=0;
  for(const [name,buf] of Object.entries(inputs)){
    const content=buf instanceof Uint8Array?buf:new Uint8Array(buf),filename=strToU8(name),crc=_crc32(content);
    if(content.length>420*1024*1024)throw Error('Arquivo muito grande para backup.');
    const head=new Uint8Array(30+filename.length),v=new DataView(head.buffer);
    v.setUint32(0,0x04034b50,true);v.setUint16(4,20,true);v.setUint16(6,0x800,true);v.setUint16(8,0,true);
    v.setUint32(14,crc,true);v.setUint32(18,content.length,true);v.setUint32(22,content.length,true);
    v.setUint16(26,filename.length,true);head.set(filename,30);
    const cen=new Uint8Array(46+filename.length),cv=new DataView(cen.buffer);
    cv.setUint32(0,0x02014b50,true);cv.setUint16(4,20,true);cv.setUint16(6,20,true);cv.setUint16(8,0x800,true);
    cv.setUint32(16,crc,true);cv.setUint32(20,content.length,true);cv.setUint32(24,content.length,true);
    cv.setUint16(28,filename.length,true);cv.setUint32(42,offset,true);cen.set(filename,46);
    directory.push(cen);pieces.push(head,content);offset+=head.length+content.length;
  }
  const dirOffset=offset;for(const c of directory){pieces.push(c);offset+=c.length;}
  const end=new Uint8Array(22),ev=new DataView(end.buffer);
  ev.setUint32(0,0x06054b50,true);ev.setUint16(8,directory.length,true);ev.setUint16(10,directory.length,true);
  ev.setUint32(12,offset-dirOffset,true);ev.setUint32(16,dirOffset,true);pieces.push(end);
  const total=offset+end.length,output=new Uint8Array(total);let pos=0;
  for(const p of pieces){output.set(p,pos);pos+=p.length;}return output;
}
function unzipSync(bytes){
  if(!(bytes instanceof Uint8Array))bytes=new Uint8Array(bytes);
  const v=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength),found={};let e=-1;
  for(let p=bytes.length-22;p>=Math.max(0,bytes.length-65558);p--){if(v.getUint32(p,true)===0x06054b50){e=p;break;}}
  if(e<0)throw Error('Arquivo ZIP não reconhecido.');
  const count=v.getUint16(e+10,true),start=v.getUint32(e+16,true);let p=start;let bytesRead=0;
  if(count>10000)throw Error('ZIP contém arquivos demais.');
  for(let i=0;i<count;i++){
    if(p+46>bytes.length||v.getUint32(p,true)!==0x02014b50)throw Error('Índice ZIP inválido.');
    const method=v.getUint16(p+10,true),size=v.getUint32(p+20,true),original=v.getUint32(p+24,true);
    const nameLen=v.getUint16(p+28,true),extraLen=v.getUint16(p+30,true),commentLen=v.getUint16(p+32,true);
    const loc=v.getUint32(p+42,true),name=strFromU8(bytes.slice(p+46,p+46+nameLen));
    if(method!==0)throw Error('Este modo local restaura ZIPs sem compressão; use o backup criado nesta prévia.');
    if(size!==original||bytesRead+size>420*1024*1024)throw Error('ZIP excede limite de segurança.');
    if(loc+30>bytes.length||v.getUint32(loc,true)!==0x04034b50)throw Error('Dados ZIP inválidos.');
    const pos=loc+30+v.getUint16(loc+26,true)+v.getUint16(loc+28,true);
    if(pos+size>bytes.length)throw Error('ZIP incompleto.');
    const data=bytes.slice(pos,pos+size);if(_crc32(data)!==v.getUint32(p+16,true))throw Error('Falha na verificação de integridade.');
    found[name]=data;bytesRead+=size;p+=46+nameLen+extraLen+commentLen;
  }return found;
}
export {zipSync, unzipSync, strToU8, strFromU8};
