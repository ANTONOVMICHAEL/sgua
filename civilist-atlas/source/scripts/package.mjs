import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';

const root=path.resolve(import.meta.dirname,'..');
const out=path.join(root,'release');
fs.mkdirSync(out,{recursive:true});
const single=path.join(out,'CIVILIST_atlas_offline.html');
const csp="default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data: blob:; font-src data:; connect-src 'none'; worker-src blob:; base-uri 'none'; form-action 'none'";
const html=fs.readFileSync(path.join(root,'offline','index.html'),'utf8').replace('<head>','<head><meta http-equiv="Content-Security-Policy" content="'+csp+'">');
fs.writeFileSync(single,html);
const archive=path.join(out,'CIVILIST_atlas_offline.zip');
fs.rmSync(archive,{force:true});
execFileSync('zip',['-j','-9',archive,single,path.join(root,'INSTRUCTOR_GUIDE.md')]);
console.log('Autonomous file: '+single);
console.log('Reserve ZIP: '+archive);

