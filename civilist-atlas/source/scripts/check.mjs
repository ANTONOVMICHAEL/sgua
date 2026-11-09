import {readFileSync,existsSync} from 'node:fs';
import {cases} from '../src/content.js';
import {homework} from '../src/homework.js';
import {traces,closingNotes} from '../src/interpretation.js';

function assert(ok,message){if(!ok)throw Error(message)}
assert(cases.length===3,'Должно быть три дела');
assert(cases.map(c=>c.steps.length).join('/')==='7/6/9','Порядок 22 кадров изменен');
assert(cases.flatMap(c=>c.steps).filter(s=>s.doc).length===14,'Комплект 14 документов нарушен');
assert(homework.length===3&&homework.every(h=>h.length>=3&&h.join('').length>400),'Неполные исходные фабулы');
assert(traces.length===3&&traces.every((t,i)=>t.length===cases[i].steps.length),'Нет связи для учебного шага');
assert(closingNotes.length===3,'Нет правовой опоры');
for(const c of cases)for(const s of c.steps){
  assert(s.label&&s.title&&s.lead&&s.question,'Неполный учебный кадр');
  if(s.doc)assert(s.doc.head&&s.doc.tag&&s.doc.rows.length>=2&&s.doc.rows.every(r=>r.length===2&&r.every(Boolean)),'Неполный документ');
}
const files=['src/main.js','src/scene.js','src/content.js','src/homework.js','src/interpretation.js','src/style.css'];
const source=files.map(p=>readFileSync(new URL('../'+p,import.meta.url),'utf8')).join('\n');
assert(!/Ключ преподавателя|private-teacher-key|teacher_answer_key/i.test(source),'Приватный ключ в публичном коде');
assert(/requestAnimationFrame/.test(source),'Нет цикла движения');
assert(/PageDown/.test(source)&&/PageUp/.test(source),'Нет клавиатурного пульта');
assert(existsSync(new URL('../offline/index.html',import.meta.url)),'Автономный HTML не собран');
const offline=readFileSync(new URL('../offline/index.html',import.meta.url),'utf8');
assert(offline.includes('data:font/woff2'),'Автономный файл не содержит шрифты');
assert(!/src="https?:|href="https?:|url\(https?:/i.test(offline),'В автономном файле найдены внешние ресурсы');
assert(offline.includes('ГОСУДАРСТВО'),'Потеряно содержание атласа');
console.log(JSON.stringify({cases:3,steps:22,documents:14,homework:3,offlineBytes:Buffer.byteLength(offline),status:'ok'},null,2));
