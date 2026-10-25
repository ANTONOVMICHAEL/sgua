import assert from 'node:assert/strict';
import { JournalStore, STORAGE_KEY, DEFAULT_RATING_SETTINGS, validateState } from './storage.ts';
import { buildRanking } from './rating.ts';
import { journalCsv } from './journal-export.ts';

const seed = [{code:'А',institute:'Институт',students:['Первый Студент','Второй Студент']},{code:'Б',institute:'Институт',students:['Третий Студент']}];
class Memory { values = new Map(); fail = false; getItem(k) {return this.values.get(k) ?? null;} setItem(k,v) {if(this.fail && k === STORAGE_KEY) throw Error('Quota exceeded'); this.values.set(k,v);} }
const memory = new Memory();
const old = new JournalStore(memory,seed);
const session = old.saveSession({groupCode:'А',date:'2026-10-25',period:2,kind:'Семинар',topic:'Исполнение обязательств'});
old.mark('А-1',session,'present');
const legacy = old.answer('А-1',session,'5','Первый ответ из прежней версии');
const oldCopy = JSON.parse(old.export()); oldCopy.schemaVersion=2; delete oldCopy.answers[0].createdAt;
memory.setItem(STORAGE_KEY,JSON.stringify(oldCopy));
const store = new JournalStore(memory,seed);
assert.equal(store.getSnapshot().schemaVersion,3);
assert.deepEqual(store.getSnapshot().answers,oldCopy.answers);
assert.deepEqual(store.getSnapshot().marks,oldCopy.marks);
const second = store.answer('А-1',session,'4','Второй ответ');
const third = store.answer('А-1',session,'+','Дополнение');
assert.equal(new Set([legacy,second,third]).size,3);
assert.equal(store.getSnapshot().answers.length,3);
store.saveAnswer({id:second,studentId:'А-1',sessionId:session,grade:'3',note:'Уточненный второй ответ'});
assert.equal(store.getSnapshot().answers.find(a=>a.id===legacy).grade,'5');
assert.equal(store.getSnapshot().answers.find(a=>a.id===third).grade,'+');
assert.equal(store.getSnapshot().answers.find(a=>a.id===second).grade,'3');
const beforeInvalid = store.export();
assert.throws(()=>store.saveAnswer({id:second,studentId:'А-2',sessionId:session,grade:'2',note:''}));
assert.throws(()=>store.saveAnswer({id:'missing',studentId:'А-1',sessionId:session,grade:'5',note:''}));
assert.equal(store.export(),beforeInvalid);
console.log('PASS: миграция версии 2 сохраняет прежний ответ; три ответа за пару имеют разные id, изменение адресное');

const debtInput={studentId:'А-1',groupCode:'А',sessionId:session,kind:'Задание',dueDate:'2026-10-30',note:''};
const debtA=store.saveDebt({...debtInput,title:'Задача 1'});
const debtB=store.saveDebt({...debtInput,title:'Задача 2'});
store.resolveDebt(debtA,true,'Сдана устно');
assert.equal(store.getSnapshot().debts.find(d=>d.id===debtB).status,'open');
store.saveDebt({...debtInput,id:debtB,title:'Задача 2 с уточнением'});
assert.equal(store.getSnapshot().debts.find(d=>d.id===debtA).resolution,'Сдана устно');
assert.throws(()=>store.saveDebt({...debtInput,studentId:'Б-1',groupCode:'Б',title:'Чужая пара'}));
let row=buildRanking(store.getSnapshot(),['А'],DEFAULT_RATING_SETTINGS,'2026-10-25').find(r=>r.student.id==='А-1');
assert.equal(row.answers,3); assert.equal(row.averageGrade,4); assert.equal(row.openDebts,1); assert.equal(row.resolvedDebts,1); assert.equal(row.score,5); // 1 + 3 + 1 + 2 - 2
store.resolveDebt(debtA,false);
assert.equal(store.getSnapshot().debts.filter(d=>d.status==='open').length,2);
row=buildRanking(store.getSnapshot(),['А'],DEFAULT_RATING_SETTINGS,'2026-10-25').find(r=>r.student.id==='А-1'); assert.equal(row.score,3);
store.resolveDebt(debtA,true,'Сдана устно');
console.log('PASS: две задолженности за одну пару независимы; рейтинг считает каждый ответ и каждый открытый долг');

const removed=store.removeAnswer(second);
assert.deepEqual(store.getSnapshot().answers.map(a=>a.id),[legacy,third]);
store.restoreAnswer(removed);
assert.equal(store.getSnapshot().answers.length,3);
assert.throws(()=>store.restoreAnswer(removed));
const beforeQuota=store.export(); memory.fail=true;
assert.throws(()=>store.answer('А-1',session,'5','Не должен появиться'));
assert.throws(()=>store.removeAnswer(third));
assert.equal(store.export(),beforeQuota); memory.fail=false;
const reloaded=new JournalStore(memory,seed);
assert.deepEqual(reloaded.getSnapshot(),store.getSnapshot());
const imported=new JournalStore(new Memory(),seed); imported.import(JSON.parse(store.export()));
assert.deepEqual(imported.getSnapshot(),store.getSnapshot());
assert.throws(()=>validateState({...imported.getSnapshot(),answers:[...imported.getSnapshot().answers,imported.getSnapshot().answers[0]]}));
console.log('PASS: удаление и возврат одного ответа сохраняют остальные; ошибка хранилища атомарна, JSON и перезагрузка сохраняют все записи');

const csv=journalCsv(imported.getSnapshot(),'А');
for (const value of ['Первый ответ из прежней версии','Уточненный второй ответ','Дополнение','Задача 1 (погашена)','Задача 2 с уточнением (открыта)','Сдана устно']) assert(csv.includes(value),value);
assert(csv.includes('5 / + / 3'));
console.log('PASS: CSV содержит все оценки, комментарии, оба задания и результат погашения');
