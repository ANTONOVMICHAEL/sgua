import assert from 'node:assert/strict';
import { JournalStore, DEFAULT_RATING_SETTINGS, STORAGE_KEY } from './storage.ts';
import { buildRanking } from './rating.ts';
const seed=[{code:'А',institute:'И',students:['Анна Первая','Борис Второй','Вера Третья','Глеб Без записей']},{code:'Б',institute:'И',students:['Даша Другая']}];
const memory={value:null,getItem(k){return k===STORAGE_KEY?this.value:null},setItem(k,v){if(k===STORAGE_KEY)this.value=v}};
const store=new JournalStore(memory,seed);
const lesson=store.saveSession({groupCode:'А',date:'2026-10-20',period:1,kind:'Семинар',topic:'Тема'});
store.mark('А-1',lesson,'present');store.answer('А-1',lesson,'5',''); // 1+3 =4
store.mark('А-2',lesson,'late');store.answer('А-2',lesson,'+',''); // 1+2 =3
store.mark('А-3',lesson,'excused');store.answer('А-3',lesson,'4',''); // 0+2 =2
const debt=store.saveDebt({studentId:'А-1',groupCode:'А',sessionId:lesson,title:'Задание',kind:'Тема',dueDate:'',note:''}); // -2 =>2, shares rank2
let rows=buildRanking(store.getSnapshot(),['А'],DEFAULT_RATING_SETTINGS,'2026-10-24');
assert.equal(rows[0].student.id,'А-2');assert.equal(rows[0].score,3);assert.equal(rows.find(r=>r.student.id==='А-1').rank,2);assert.equal(rows.find(r=>r.student.id==='А-3').rank,2);assert.equal(rows.find(r=>r.student.id==='А-4').rank,null);assert.equal(rows.find(r=>r.student.id==='А-3').attendanceRate,null);
store.resolveDebt(debt,true);rows=buildRanking(store.getSnapshot(),['А'],DEFAULT_RATING_SETTINGS,'2026-10-24');assert.equal(rows[0].score,4);
const future=store.saveSession({groupCode:'А',date:'2026-11-01',period:1,kind:'Семинар',topic:'Будущее'});store.mark('А-2',future,'present');store.answer('А-2',future,'5','');
assert.equal(buildRanking(store.getSnapshot(),['А'],DEFAULT_RATING_SETTINGS,'2026-10-24').find(r=>r.student.id==='А-2').score,3);
store.archiveSession(lesson);assert.equal(buildRanking(store.getSnapshot(),['А'],DEFAULT_RATING_SETTINGS,'2026-10-24').find(r=>r.student.id==='А-2').score,null);store.archiveSession(lesson,false);
const settings={...DEFAULT_RATING_SETTINGS,grade5:5};store.setRatingSettings(settings);const reloaded=new JournalStore(memory,seed);assert.deepEqual(reloaded.getSnapshot().ratingSettings,settings);assert.equal(reloaded.getSnapshot().sessions.length,2);assert.equal(reloaded.getSnapshot().marks.length,4);assert.equal(reloaded.getSnapshot().answers.length,4);assert.equal(buildRanking(reloaded.getSnapshot(),['А'],settings,'2026-10-24')[0].score,6);
assert.throws(()=>store.setRatingSettings({...settings,attendance:-1}));assert.equal(buildRanking(store.getSnapshot(),['Б'],settings,'2026-10-24').length,1);
console.log('PASS: расчет баллов, равные места, записи без данных, уважительные пропуски, погашение долга');
console.log('PASS: будущие/скрытые занятия исключены; настройки и все проведенные занятия сохраняются');
