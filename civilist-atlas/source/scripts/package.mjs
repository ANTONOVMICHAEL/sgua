import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';

const root=path.resolve(import.meta.dirname,'..');
const out=path.join(root,'release');
fs.mkdirSync(out,{recursive:true});
const single=path.join(out,'CIVILIST_atlas_offline.html');
fs.copyFileSync(path.join(root,'offline','index.html'),single);
const archive=path.join(out,'CIVILIST_atlas_offline.zip');
fs.rmSync(archive,{force:true});
execFileSync('zip',['-j','-9',archive,single,path.join(root,'INSTRUCTOR_GUIDE.md')]);
console.log('Autonomous file: '+single);
console.log('Reserve ZIP: '+archive);
