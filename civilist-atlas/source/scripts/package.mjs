import {copyFileSync,mkdirSync,statSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';

mkdirSync('release',{recursive:true});
copyFileSync('offline/index.html','release/CIVILIST_atlas_offline.html');
const bytes=statSync('release/CIVILIST_atlas_offline.html').size;
const sha256=createHash('sha256').update(await import('node:fs').then(m=>m.readFileSync('release/CIVILIST_atlas_offline.html'))).digest('hex');
writeFileSync('release/BUILD.json',JSON.stringify({name:'ЦИВИЛИСТ. Правовая лаборатория',version:'7.0.0',offline:{name:'CIVILIST_atlas_offline.html',bytes,sha256}},null,2)+'\n');
console.log('Offline',bytes,sha256);
