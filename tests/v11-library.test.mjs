import test from 'node:test';
import assert from 'node:assert/strict';
import {newSong,Repository} from '../dist/data.js';
import {songKind,inFolder,emptyLibrary,validLibrary,repertoireEntries,cleanLibrary} from '../dist/library-model.js';
const uuid=()=>crypto.randomUUID();

test('V11: músicas antigas continuam músicas, sem modificar a biblioteca anterior',()=>{
  assert.equal(songKind({name:'Legacy',parts:{}}),'music');
  const novo=newSong();assert.equal(novo.kind,'music');assert.equal(novo.folderId,'');
  const ritmo={...novo,kind:'rhythm'};
  assert.equal(inFolder(ritmo,'rhythm'),true);
  assert.equal(inFolder(ritmo,'music'),false);
});
test('V11: repertório aceita músicas e ritmos, repetições, ordem e BPM por item',()=>{
  const s1={...newSong(),name:'Entrada',bpm:75};
  const s2={...newSong(),name:'Rock',kind:'rhythm',bpm:110};
  const list={items:[{songId:s1.id,bpm:null},{songId:s2.id,bpm:104},{songId:s1.id,bpm:68}]};
  const entries=repertoireEntries(list,[s1,s2]);
  assert.deepEqual(entries.map(x=>x.song.name),['Entrada','Rock','Entrada']);
  assert.deepEqual(entries.map(x=>x.bpm),[null,104,68]);
});
test('V11: pastas e repertórios validam entradas antes de irem à nuvem',()=>{
  const folder={id:uuid(),name:'Casamentos',kind:'music'};
  const rep={id:uuid(),name:'Cerimônia',date:'2026-11-21',items:[{songId:uuid(),bpm:75}]};
  assert.equal(validLibrary({folders:[folder],repertoires:[rep]}),true);
  assert.equal(validLibrary({folders:[{...folder,name:'  '}],repertoires:[rep]}),false);
  assert.equal(validLibrary({folders:[folder],repertoires:[{...rep,items:[{...rep.items[0],bpm:900}]}]}),false);
  assert.deepEqual(cleanLibrary(emptyLibrary()),{folders:[],repertoires:[]});
});
test('V11: metadados são salvos localmente e confirmados na nuvem sem tocar nos WAVs',async()=>{
  const owner=uuid();const memory=new Map();let remote={revision:0,content:{folders:[],repertoires:[]}};
  const repo=Object.create(Repository.prototype);repo.owner=owner;
  repo.disk={get:async k=>memory.get(k),batch:async entries=>{for(const [k,v] of entries)memory.set(k,v);}};
  repo.cloud={library:async()=>remote,saveLibrary:async lib=>{
    assert.equal(lib.revision,remote.revision);remote={revision:remote.revision+1,content:cleanLibrary(lib)};
    return {revision:remote.revision};
  }};
  let local=await repo.libraryState();assert.equal(local.dirty,false);
  local.folders.push({id:uuid(),name:'Worship',kind:'rhythm'});
  local=await repo.saveLibrary(local);assert.equal(local.dirty,true);
  assert.equal((await repo.libraryState()).folders.length,1);
  await repo.syncLibrary();
  const after=await repo.libraryState();assert.equal(after.dirty,false);assert.equal(after.revision,1);
  assert.equal(remote.content.folders.length,1);
});
test('V11: edição simultânea protege metadados contra substituição silenciosa',async()=>{
  const owner=uuid();const memory=new Map();
  const repo=Object.create(Repository.prototype);repo.owner=owner;
  repo.disk={get:async k=>memory.get(k),batch:async entries=>{for(const [k,v] of entries)memory.set(k,v);}};
  repo.cloud={library:async()=>({revision:4,content:{folders:[],repertoires:[]}}),saveLibrary:async()=>{throw Error('Não deveria substituir')}};
  await repo.saveLibrary({folders:[{id:uuid(),name:'Rock',kind:'rhythm'}],repertoires:[]});
  await assert.rejects(repo.syncLibrary(),/outro aparelho/);
  const local=await repo.libraryState();assert.equal(local.dirty,true);assert.equal(local.folders.length,1);
});
