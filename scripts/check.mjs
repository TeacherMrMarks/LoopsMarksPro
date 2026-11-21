import { readdirSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
const required=['index.html','app.js','audio.js','data.js','backup.js','netlify-client.js','sw.js','styles.css'];
for(const file of required){if(!existsSync('dist/'+file))throw Error('Arquivo ausente: '+file);}
for(const file of readdirSync('dist').filter(f=>f.endsWith('.js'))){execFileSync(process.execPath,['--check','dist/'+file],{stdio:'inherit'});}
console.log('V4 TESTE: arquivos estáticos verificados. Publicar pasta dist.');
