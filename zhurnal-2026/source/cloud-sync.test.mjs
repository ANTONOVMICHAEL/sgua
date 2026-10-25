import assert from 'node:assert/strict';
import { CloudJournal } from './cloud-journal.ts';
import { DEFAULT_RATING_SETTINGS, JournalStore, STORAGE_KEY } from './storage.ts';

const clone = value => JSON.parse(JSON.stringify(value));
const seed = [{code:'А',institute:'Институт',students:['Первый Студент','Второй Студент']}];
const detail = {groupCode:'А',date:'2026-10-25',period:1,kind:'Семинар',topic:'Исполнение обязательств'};
const key = value => JSON.stringify([value.kind,value.entity_id]);
function at(timestamp, action){
  const OriginalDate=globalThis.Date;
  globalThis.Date=class extends OriginalDate {constructor(...args){super(...(args.length?args:[timestamp]));}static now(){return new OriginalDate(timestamp).getTime();}};
  try{return action();}finally{globalThis.Date=OriginalDate;}
}
class Memory {
  values = new Map(); fail = false;
  getItem(name){return this.values.get(name) ?? null;}
  setItem(name,value){if(this.fail)throw Error('Quota exceeded');this.values.set(name,value);}
}
class Server {
  owners = new Map(); operations = new Map(); failures = new Set(); applyCalls = 0; commits = 0; maxBatch = 0; lostNext = false; blockNext = null;
  rows(owner){if(!this.owners.has(owner))this.owners.set(owner,new Map());return this.owners.get(owner);}
  records(owner){return clone([...this.rows(owner).values()]);}
  transport(owner){return {
    read:async()=>{if(this.failures.has(owner))throw Error('Offline');return {records:this.records(owner),server_time:new Date().toISOString()};},
    apply:async(operationId,changes)=>{
      this.applyCalls++;this.maxBatch=Math.max(this.maxBatch,changes.length);assert(changes.length<=500,'RPC batch limit');
      if(this.failures.has(owner))throw Error('Offline');
      const operationKey=JSON.stringify([owner,operationId]);
      if(this.operations.has(operationKey))return clone(this.operations.get(operationKey));
      const rows=this.rows(owner);
      const conflicts=changes.filter(c=>(rows.get(key(c))?.revision??0)!==c.base_revision).map(c=>rows.get(key(c))??{kind:c.kind,entity_id:c.entity_id,revision:0,data:null,deleted:true,updated_at:new Date().toISOString()});
      if(conflicts.length)return {ok:false,error:'conflict',conflicts:clone(conflicts)};
      const changed=changes.map(c=>({kind:c.kind,entity_id:c.entity_id,revision:(rows.get(key(c))?.revision??0)+1,data:c.deleted?null:clone(c.data),deleted:c.deleted,updated_at:new Date().toISOString()}));
      changed.forEach(r=>rows.set(key(r),r));this.commits++;
      const result={ok:true,records:clone(changed)};this.operations.set(operationKey,result);
      if(this.blockNext){const gate=this.blockNext;this.blockNext=null;gate.enter();await gate.wait;}
      if(this.lostNext){this.lostNext=false;throw Error('Response lost after commit');}
      return clone(result);
    }
  };}
}
function legacy(){const m=new Memory();const store=new JournalStore(m,seed);const sessionId=store.saveSession(detail);store.mark('А-1',sessionId,'present');return {state:clone(store.getSnapshot()),sessionId};}
async function flush(cloud){try{await cloud.flush();}catch{}}
async function bootstrap(server,owner='owner',state=legacy().state,memory=new Memory()){
 const cloud=new CloudJournal(owner,memory,seed,server.transport(owner));await cloud.initialize();await cloud.importLegacy(state);await flush(cloud);return {cloud,memory};
}
function field(server,owner,kind,id){return server.records(owner).find(r=>r.kind===kind&&r.entity_id===id&&!r.deleted)?.data;}
const live=new Set();
function track(c){live.add(c);return c;}
function dispose(c){c.dispose();live.delete(c);}
try {
  {
    const server=new Server(),memory=new Memory();const old=JSON.stringify(legacy().state);memory.setItem(STORAGE_KEY,old);
    const c=track(new CloudJournal('owner',memory,seed,server.transport('owner')));await c.initialize();await flush(c);
    assert.equal(server.records('owner').length,0,'seed must not upload before explicit import');
    assert.equal(c.getSnapshot().needsBootstrap,true);assert.equal(memory.getItem(STORAGE_KEY),old);
    const value=JSON.parse(old);await c.importLegacy(value);await flush(c);
    assert(server.records('owner').length>0);assert.equal(c.getSnapshot().pendingCount,0);assert.equal(c.getSnapshot().needsBootstrap,false);assert.equal(memory.getItem(STORAGE_KEY),old);
    dispose(c);
    console.log('PASS: cloud bootstrap requires explicit import, and legacy browser data remains unchanged');
  }
  {
    const server=new Server(),data=legacy();const first=await bootstrap(server,'owner',data.state);const a=track(first.cloud);
    const b=track(new CloudJournal('owner',new Memory(),seed,server.transport('owner')));await b.initialize();
    const aid=a.store.answer('А-1',data.sessionId,'5','Ответ с компьютера');await flush(a);
    const bid=b.store.answer('А-2',data.sessionId,'4','Ответ с телефона');await flush(b);await flush(a);
    assert.notEqual(aid,bid);assert.equal(a.store.getSnapshot().answers.length,2);assert.equal(b.store.getSnapshot().answers.length,2);
    assert.equal(server.records('owner').filter(r=>r.kind==='answer'&&!r.deleted).length,2);
    dispose(a);dispose(b);
    console.log('PASS: independent answers from two devices merge without replacing each other');
  }
  {
    const server=new Server();const first=await bootstrap(server);const a=track(first.cloud),b=track(new CloudJournal('owner',new Memory(),seed,server.transport('owner')));await b.initialize();
    a.store.saveStudent({id:'А-1',groupCode:'А',fullName:'Имя с компьютера',active:1});
    b.store.saveStudent({id:'А-1',groupCode:'А',fullName:'Имя с телефона',active:1});
    await flush(a);await flush(b);
    assert.equal(field(server,'owner','student','А-1').fullName,'Имя с компьютера');
    assert.equal(b.getSnapshot().phase,'conflict');const conflict=b.getSnapshot().conflicts.find(v=>v.kind==='student');assert(conflict);assert(conflict.fields.includes('fullName'));
    b.resolveConflict(conflict.key,'local');await flush(b);assert.equal(field(server,'owner','student','А-1').fullName,'Имя с телефона');
    dispose(a);dispose(b);
    console.log('PASS: conflicting edits require an explicit choice; the cloud value is not silently replaced');
  }
  {
    const server=new Server();const result=await bootstrap(server);const a=track(result.cloud),b=track(new CloudJournal('owner',new Memory(),seed,server.transport('owner')));await b.initialize();
    a.store.saveStudent({id:'А-1',groupCode:'А',fullName:'Имя из облака',active:1});b.store.saveStudent({id:'А-1',groupCode:'А',fullName:'Локальное имя',active:1});await flush(a);await flush(b);
    assert.equal(b.getSnapshot().conflicts.length,1);assert.deepEqual(b.getSnapshot().conflicts[0].fields,['fullName']);
    a.store.saveStudent({id:'А-1',groupCode:'А',fullName:'Имя из облака',active:0});await flush(a);await flush(b);
    assert.equal(b.store.getSnapshot().students.find(v=>v.id==='А-1').active,0,'new remote fields must merge while another field is awaiting a decision');
    const conflict=b.getSnapshot().conflicts[0];assert.deepEqual(conflict.fields,['fullName']);b.resolveConflict(conflict.key,'remote');await flush(b);
    const student=field(server,'owner','student','А-1');assert.equal(student.fullName,'Имя из облака');assert.equal(student.active,0);assert.equal(b.getSnapshot().conflicts.length,0);dispose(a);dispose(b);
    console.log('PASS: polling an unresolved name conflict still incorporates independent new cloud changes');
  }
  {
    const server=new Server();const first=await bootstrap(server);const a=track(first.cloud),b=track(new CloudJournal('owner',new Memory(),seed,server.transport('owner')));await b.initialize();
    a.store.saveStudent({id:'А-1',groupCode:'А',fullName:'Уточненное Имя',active:1});
    b.store.saveStudent({id:'А-1',groupCode:'А',fullName:'Первый Студент',active:0});
    await flush(a);await flush(b);await flush(a);
    const p=field(server,'owner','student','А-1');assert.equal(p.fullName,'Уточненное Имя');assert.equal(p.active,0);assert.equal(b.getSnapshot().conflicts.length,0);
    dispose(a);dispose(b);
    console.log('PASS: edits to different fields of one record merge automatically');
  }
  {
    const server=new Server(),data=legacy();const result=await bootstrap(server,'owner',data.state);const a=track(result.cloud);
    const id=a.store.answer('А-1',data.sessionId,'5','Начальный комментарий');await flush(a);
    const b=track(new CloudJournal('owner',new Memory(),seed,server.transport('owner')));await b.initialize();
    at('2026-10-25T13:00:01Z',()=>a.store.saveAnswer({id,studentId:'А-1',sessionId:data.sessionId,grade:'4',note:'Начальный комментарий'}));
    at('2026-10-25T13:00:02Z',()=>b.store.saveAnswer({id,studentId:'А-1',sessionId:data.sessionId,grade:'5',note:'Новый комментарий'}));
    assert.notEqual(a.store.getSnapshot().answers[0].updatedAt,b.store.getSnapshot().answers[0].updatedAt);await flush(a);await flush(b);await flush(a);
    const answer=field(server,'owner','answer',id);assert.equal(answer.grade,'4');assert.equal(answer.note,'Новый комментарий');assert.equal(answer.updatedAt,'2026-10-25T13:00:02.000Z');assert.equal(b.getSnapshot().conflicts.length,0);dispose(a);dispose(b);
    console.log('PASS: grade and comment edits merge independently despite different update timestamps');
  }
  {
    const server=new Server(),data=legacy();const result=await bootstrap(server,'owner',data.state);const a=track(result.cloud);
    const id=a.store.answer('А-1',data.sessionId,'5','Комментарий A');await flush(a);
    const b=track(new CloudJournal('owner',new Memory(),seed,server.transport('owner')));await b.initialize();
    at('2026-10-25T13:10:01Z',()=>a.store.saveAnswer({id,studentId:'А-1',sessionId:data.sessionId,grade:'3',note:'Комментарий A'}));
    at('2026-10-25T13:10:02Z',()=>b.store.saveAnswer({id,studentId:'А-1',sessionId:data.sessionId,grade:'4',note:'Комментарий B'}));
    await flush(a);await flush(b);
    const conflicts=b.getSnapshot().conflicts;assert.equal(conflicts.length,1);assert.equal(conflicts[0].kind,'answer');assert.deepEqual(conflicts[0].fields,['grade']);
    assert.equal(b.store.getSnapshot().answers.find(v=>v.id===id).note,'Комментарий B');assert.equal(field(server,'owner','answer',id).note,'Комментарий A');
    b.resolveConflict(conflicts[0].key,'remote');await flush(b);await flush(a);
    const answer=field(server,'owner','answer',id);assert.equal(answer.grade,'3');assert.equal(answer.note,'Комментарий B');assert.equal(b.store.getSnapshot().answers.find(v=>v.id===id).note,'Комментарий B');assert.equal(b.getSnapshot().conflicts.length,0);dispose(a);dispose(b);
    console.log('PASS: choosing the remote conflicting grade retains an independently edited local comment');
  }
  {
    const server=new Server(),data=legacy();const result=await bootstrap(server,'owner',data.state);const a=track(result.cloud),b=track(new CloudJournal('owner',new Memory(),seed,server.transport('owner')));await b.initialize();
    at('2026-10-25T13:00:01Z',()=>a.store.mark('А-2',data.sessionId,'late'));at('2026-10-25T13:00:02Z',()=>b.store.mark('А-2',data.sessionId,'late'));await flush(a);await flush(b);await flush(a);
    const id=JSON.stringify(['А-2',data.sessionId]);assert.equal(server.records('owner').filter(v=>v.kind==='mark'&&v.entity_id===id&&!v.deleted).length,1);assert.equal(field(server,'owner','mark',id).status,'late');assert.equal(b.getSnapshot().conflicts.length,0);dispose(a);dispose(b);
    console.log('PASS: identical attendance marks created on two devices coalesce despite different timestamps');
  }
  {
    const server=new Server(),data=legacy();const result=await bootstrap(server,'owner',data.state);const a=track(result.cloud);server.failures.add('owner');
    const id=a.store.answer('А-1',data.sessionId,'+','Без сети');await flush(a);assert(a.getSnapshot().pendingCount>0);assert.equal(a.getSnapshot().phase,'offline');dispose(a);
    const b=track(new CloudJournal('owner',result.memory,seed,server.transport('owner')));await b.initialize();assert(b.store.getSnapshot().answers.some(x=>x.id===id));assert(b.getSnapshot().pendingCount>0);
    server.failures.delete('owner');await flush(b);assert.equal(b.getSnapshot().pendingCount,0);assert(field(server,'owner','answer',id));dispose(b);
    console.log('PASS: offline records and pending operations survive reload and synchronize after reconnect');
  }
  {
    const server=new Server(),data=legacy();const result=await bootstrap(server,'owner',data.state);const c=track(result.cloud);const commitsBefore=server.commits;
    server.lostNext=true;const id=c.store.answer('А-1',data.sessionId,'5','Ответ с потерянным подтверждением');await flush(c);assert(c.getSnapshot().pendingCount>0);await flush(c);
    assert.equal(server.commits,commitsBefore+1);assert.equal(server.records('owner').filter(r=>r.kind==='answer'&&r.entity_id===id&&!r.deleted).length,1);assert.equal(c.getSnapshot().pendingCount,0);dispose(c);
    console.log('PASS: retry after a lost response reuses the operation id and does not duplicate the answer');
  }
  {
    const server=new Server(),data=legacy();const result=await bootstrap(server,'owner',data.state);const a=track(result.cloud);const commitsBefore=server.commits;
    server.lostNext=true;const id=a.store.answer('А-1',data.sessionId,'4','Ответ перед перезапуском');await flush(a);assert(a.getSnapshot().pendingCount>0);dispose(a);
    const b=track(new CloudJournal('owner',result.memory,seed,server.transport('owner')));await b.initialize();await flush(b);
    assert.equal(server.commits,commitsBefore+1);assert.equal(b.store.getSnapshot().answers.filter(v=>v.id===id).length,1);assert.equal(b.getSnapshot().pendingCount,0);dispose(b);
    console.log('PASS: an unacknowledged operation is retried safely after the browser is restarted');
  }
  {
    const server=new Server();const result=await bootstrap(server);const c=track(result.cloud);let enter;let release;
    const entered=new Promise(resolve=>{enter=resolve;});const wait=new Promise(resolve=>{release=resolve;});server.blockNext={enter,wait};
    c.store.saveStudent({id:'А-1',groupCode:'А',fullName:'Первое изменение',active:1});const inFlight=flush(c);await entered;
    c.store.saveStudent({id:'А-1',groupCode:'А',fullName:'Последующее изменение',active:1});release();await inFlight;await flush(c);
    assert.equal(field(server,'owner','student','А-1').fullName,'Последующее изменение');assert.equal(c.getSnapshot().pendingCount,0);assert.equal(c.getSnapshot().conflicts.length,0);dispose(c);
    console.log('PASS: an edit made during an in-flight request is retained and sent afterward');
  }
  {
    const server=new Server(),data=legacy();const result=await bootstrap(server,'owner',data.state);const a=track(result.cloud);const id=a.store.answer('А-1',data.sessionId,'5','Первоначальный ответ');await flush(a);
    const b=track(new CloudJournal('owner',new Memory(),seed,server.transport('owner')));await b.initialize();
    a.store.removeAnswer(id);b.store.saveAnswer({id,studentId:'А-1',sessionId:data.sessionId,grade:'4',note:'Изменение одновременно с удалением'});await flush(a);await flush(b);
    assert.equal(server.records('owner').find(r=>r.kind==='answer'&&r.entity_id===id).deleted,true);assert.equal(b.getSnapshot().phase,'conflict');
    const conflict=b.getSnapshot().conflicts.find(v=>v.kind==='answer');assert(conflict);b.resolveConflict(conflict.key,'remote');await flush(b);assert(!b.store.getSnapshot().answers.some(x=>x.id===id));
    dispose(a);dispose(b);
    console.log('PASS: answer removal is a tombstone; concurrent edits require a decision and cannot resurrect it silently');
  }
  {
    const server=new Server(),data=legacy();const result=await bootstrap(server,'owner',data.state);const c=track(result.cloud);
    const imported=clone(data.state);imported.students[0].fullName='Различающееся имя из старой копии';await c.importLegacy(imported);await flush(c);
    assert.equal(field(server,'owner','student','А-1').fullName,'Первый Студент');assert.equal(c.getSnapshot().phase,'conflict');const conflict=c.getSnapshot().conflicts.find(v=>v.kind==='student');assert(conflict);c.resolveConflict(conflict.key,'remote');await flush(c);dispose(c);
    console.log('PASS: importing an old journal never silently overwrites differing cloud records');
  }
  {
    const server=new Server(),data=legacy(),memory=new Memory();const one=await bootstrap(server,'one',data.state,memory);const a=track(one.cloud);const id=a.store.answer('А-1',data.sessionId,'5','Запись первого аккаунта');await flush(a);dispose(a);
    const b=track(new CloudJournal('two',memory,seed,server.transport('two')));assert.equal(b.getSnapshot().hasLocalCache,false);await b.initialize();assert.equal(b.store.getSnapshot().answers.length,0);assert.equal(b.getSnapshot().needsBootstrap,true);assert.equal(server.records('two').length,0);dispose(b);
    const c=track(new CloudJournal('one',memory,seed,server.transport('one')));await c.initialize();assert(c.store.getSnapshot().answers.some(x=>x.id===id));dispose(c);
    console.log('PASS: local caches and queues are isolated by owner');
  }
  {
    const server=new Server(),data=legacy();const result=await bootstrap(server,'owner',data.state);const c=track(result.cloud),memory=result.memory;
    const before=c.store.export(),saved=clone([...memory.values.entries()]),pending=c.getSnapshot().pendingCount;memory.fail=true;
    assert.throws(()=>c.store.answer('А-1',data.sessionId,'+','Не записалось'),/Quota exceeded/);
    assert.equal(c.store.export(),before);assert.deepEqual([...memory.values.entries()],saved);assert.equal(c.getSnapshot().pendingCount,pending);memory.fail=false;dispose(c);
    console.log('PASS: a failed atomic cache write does not change the journal or its synchronization queue');
  }
  {
    const server=new Server(),data=legacy();const result=await bootstrap(server,'owner',data.state);const a=track(result.cloud),b=track(new CloudJournal('owner',new Memory(),seed,server.transport('owner')));await b.initialize();
    const input={studentId:'А-1',groupCode:'А',sessionId:data.sessionId,title:'Задолженность 1',kind:'Ответ',dueDate:'2026-11-01',note:''};
    const first=a.store.saveDebt(input);await flush(a);const second=b.store.saveDebt({...input,title:'Задолженность 2'});await flush(b);await flush(a);
    assert.notEqual(first,second);assert.equal(a.store.getSnapshot().debts.length,2);assert.equal(b.store.getSnapshot().debts.length,2);
    b.store.resolveDebt(first,true,'Ответ принят');await flush(b);await flush(a);
    assert.equal(a.store.getSnapshot().debts.find(v=>v.id===first).status,'resolved');assert.equal(a.store.getSnapshot().debts.find(v=>v.id===first).resolution,'Ответ принят');assert.equal(a.store.getSnapshot().debts.find(v=>v.id===second).status,'open');dispose(a);dispose(b);
    console.log('PASS: multiple debts for one student and lesson merge independently, including debt settlement');
  }
  {
    const server=new Server(),data=legacy();data.state.ratingSettings=clone(DEFAULT_RATING_SETTINGS);const result=await bootstrap(server,'owner',data.state);const a=track(result.cloud),b=track(new CloudJournal('owner',new Memory(),seed,server.transport('owner')));await b.initialize();
    a.store.setRatingSettings({...DEFAULT_RATING_SETTINGS,attendance:4});b.store.setRatingSettings({...DEFAULT_RATING_SETTINGS,grade5:7});await flush(a);await flush(b);await flush(a);
    assert.deepEqual(a.store.getSnapshot().ratingSettings,{...DEFAULT_RATING_SETTINGS,attendance:4,grade5:7});assert.equal(server.records('owner').filter(v=>v.kind==='settings').length,1);assert.equal(b.getSnapshot().conflicts.length,0);dispose(a);dispose(b);
    console.log('PASS: independent rating settings merge into one durable settings record');
  }
  {
    const server=new Server(),data=legacy();const result=await bootstrap(server,'owner',data.state);const c=track(result.cloud);const status=c.getSnapshot();assert.equal(c.getSnapshot(),status);
    const unsubscribe=c.subscribe(()=>{throw Error('Broken status widget');});const unsubscribeStore=c.store.subscribe(()=>{throw Error('Broken journal widget');});const answer=c.store.answer('А-1',data.sessionId,'+','Сломанный подписчик не мешает записи');assert(c.store.getSnapshot().answers.some(v=>v.id===answer));await flush(c);assert(field(server,'owner','answer',answer));unsubscribe();unsubscribeStore();dispose(c);
    console.log('PASS: snapshots remain stable and broken status or journal subscribers cannot fail saved writes');
  }
  {
    const server=new Server(),data=legacy();const result=await bootstrap(server,'owner',data.state);const a=track(result.cloud);
    a.store.completeSession(data.sessionId);a.store.archiveSession(data.sessionId);await flush(a);
    const b=track(new CloudJournal('owner',new Memory(),seed,server.transport('owner')));await b.initialize();
    const archived=b.store.getSnapshot().sessions.find(v=>v.id===data.sessionId);assert(archived.completedAt);assert(archived.deletedAt);
    b.store.archiveSession(data.sessionId,false);await flush(b);await flush(a);
    const restored=a.store.getSnapshot().sessions.find(v=>v.id===data.sessionId);assert(restored.completedAt);assert.equal(restored.deletedAt,undefined);dispose(a);dispose(b);
    console.log('PASS: completion and session trash survive synchronization, and restoring retains completion');
  }
  {
    const server=new Server(),data=legacy();const result=await bootstrap(server,'owner',data.state);const a=track(result.cloud),b=track(new CloudJournal('owner',new Memory(),seed,server.transport('owner')));await b.initialize();
    a.store.archiveSession(data.sessionId);b.store.saveSession({...detail,id:data.sessionId,topic:'Тема изменена одновременно с удалением'});await flush(a);await flush(b);
    assert.equal(b.getSnapshot().phase,'conflict');const conflict=b.getSnapshot().conflicts.find(v=>v.kind==='session');assert(conflict);assert(conflict.fields.includes('deletedAt'));assert.equal(field(server,'owner','session',data.sessionId).topic,detail.topic);assert(field(server,'owner','session',data.sessionId).deletedAt);
    b.resolveConflict(conflict.key,'remote');await flush(b);assert(b.store.getSnapshot().sessions.find(v=>v.id===data.sessionId).deletedAt);dispose(a);dispose(b);
    console.log('PASS: moving a lesson to trash conflicts with simultaneous topic edits instead of hiding them');
  }
  {
    const server=new Server(),data=legacy();const large=clone(data.state);large.answers=Array.from({length:1103},(_,i)=>({id:`bulk-${i}`,studentId:'А-1',sessionId:data.sessionId,grade:'+',note:`Запись ${i}`,createdAt:'2026-10-25T10:00:00Z',updatedAt:'2026-10-25T10:00:00Z'}));
    const result=await bootstrap(server,'owner',large);const c=track(result.cloud);assert.equal(server.records('owner').filter(r=>r.kind==='answer'&&!r.deleted).length,1103);assert(server.maxBatch<=500);assert.equal(c.getSnapshot().pendingCount,0);dispose(c);
    console.log('PASS: large imports use bounded batches and preserve every independent answer');
  }
} finally {for(const c of live)c.dispose();}
