import { validateState, type State } from './storage.ts';

export const ENTITY_KINDS = ['group','student','session','mark','answer','debt','settings'] as const;
export type EntityKind = typeof ENTITY_KINDS[number];
export type CloudData = Record<string, unknown>;
export type CloudRecord = { kind: EntityKind; entity_id: string; revision: number; data: CloudData | null; deleted: boolean; updated_at: string };
export type CloudChange = { kind: EntityKind; entity_id: string; base_revision: number; data: CloudData | null; deleted: boolean };
export type Entity = { kind: EntityKind; entity_id: string; data: CloudData };
export type EntityMap = Record<string, Entity>;
export type RemoteMap = Record<string, CloudRecord>;
export type CloudConflict = { key: string; kind: EntityKind; entityId: string; label: string; fields: string[]; local: CloudData | null; remote: CloudData | null };
export const entityKey = (kind: EntityKind, id: string) => JSON.stringify([kind,id]);
export const copy = <T>(value:T):T => JSON.parse(JSON.stringify(value));
const normalize = (value:unknown):unknown => Array.isArray(value) ? value.map(normalize) : value && typeof value === 'object' ? Object.fromEntries(Object.entries(value).filter(([,v])=>v!==undefined).sort(([a],[b])=>a.localeCompare(b)).map(([k,v])=>[k,normalize(v)])) : value;
export const same = (a:unknown,b:unknown) => JSON.stringify(normalize(a)) === JSON.stringify(normalize(b));
export const recordValue = (record?:CloudRecord):CloudData|null => record && !record.deleted ? record.data : null;
const meaningful = (data:CloudData) => Object.fromEntries(Object.entries(data).filter(([field])=>!['createdAt','updatedAt'].includes(field)));
const timestamp = (field:string,a:unknown,b:unknown) => typeof a==='string'&&typeof b==='string' ? (field==='createdAt'?(a<b?a:b):(a>b?a:b)) : a??b;

export function stateToEntities(input:State):EntityMap {
 const state=validateState(input), result:EntityMap={};
 const add=(kind:EntityKind,id:string,data:unknown)=>{result[entityKey(kind,id)]={kind,entity_id:id,data:copy(data as CloudData)};};
 state.groups.forEach(g=>add('group',g.code,g));
 state.students.forEach(p=>add('student',p.id,p));
 state.sessions.forEach(s=>add('session',s.id,s));
 state.marks.forEach(m=>add('mark',JSON.stringify([m.studentId,m.sessionId]),m));
 state.answers.forEach(a=>add('answer',a.id,a));
 state.debts.forEach(d=>add('debt',d.id,d));
 if(state.ratingSettings) add('settings','rating',state.ratingSettings);
 return result;
}

export function recordsToMap(records:CloudRecord[]):RemoteMap {
 const map:RemoteMap={};
 for(const record of records){
  if(!ENTITY_KINDS.includes(record.kind)||typeof record.entity_id!=='string'||!record.entity_id||record.entity_id.length>500||!Number.isSafeInteger(record.revision)||record.revision<0||typeof record.deleted!=='boolean'||(!record.deleted&&(!record.data||typeof record.data!=='object'||Array.isArray(record.data)))) throw new Error('Облако вернуло поврежденную запись журнала');
  if(!record.deleted){
   const data=record.data!;
   const expected=record.kind==='group'?data.code:record.kind==='mark'?JSON.stringify([data.studentId,data.sessionId]):record.kind==='settings'?'rating':data.id;
   if(record.entity_id!==expected)throw new Error('Идентификатор облачной записи не совпадает с ее содержимым');
  }
  const key=entityKey(record.kind,record.entity_id);
  if(map[key]&&map[key].revision!==record.revision) throw new Error('В облаке обнаружен повтор записи');
  map[key]=copy(record);
 }
 return map;
}
export function remoteEntities(remote:RemoteMap):EntityMap {
 return Object.fromEntries(Object.entries(remote).filter(([,r])=>!r.deleted&&r.data).map(([key,r])=>[key,{kind:r.kind,entity_id:r.entity_id,data:copy(r.data!)}]));
}
export function entitiesToState(entities:EntityMap,savedAt?:string):State {
 const of=(kind:EntityKind)=>Object.values(entities).filter(e=>e.kind===kind).map(e=>copy(e.data));
 const state={schemaVersion:3,groups:of('group'),students:of('student'),sessions:of('session'),marks:of('mark'),answers:of('answer'),debts:of('debt')} as unknown as State;
 state.groups.sort((a,b)=>a.position-b.position||a.code.localeCompare(b.code));
 state.students.sort((a,b)=>a.groupCode.localeCompare(b.groupCode)||a.position-b.position||a.id.localeCompare(b.id));
 const settings=entities[entityKey('settings','rating')];
 if(settings) state.ratingSettings=copy(settings.data) as unknown as State['ratingSettings'];
 if(savedAt&&Number.isFinite(Date.parse(savedAt)))state.savedAt=savedAt;
 return validateState(state);
}
export const entityLabel=(kind:EntityKind,data:CloudData|null,id:string) => String(data?.fullName||data?.title||data?.topic||data?.code||(kind==='mark'?'Посещаемость':kind==='answer'?'Ответ':kind==='session'?'Занятие':kind==='settings'?'Настройки рейтинга':id));

/** Field-level three-way merge. A deletion and an edit always require a decision. */
export function mergeEntity(base:CloudData|null,local:CloudData|null,remote:CloudData|null):{data:CloudData|null;conflictingFields:string[]} {
 if(same(local,remote))return {data:copy(local),conflictingFields:[]};
 if(same(local,base))return {data:copy(remote),conflictingFields:[]};
 if(same(remote,base))return {data:copy(local),conflictingFields:[]};
 if(local&&remote&&same(meaningful(local),meaningful(remote))){
  const merged=copy(local);
  for(const field of ['createdAt','updatedAt']){const value=timestamp(field,local[field],remote[field]);if(value!==undefined)merged[field]=value;}
  return {data:merged,conflictingFields:[]};
 }
 if(!base||!local||!remote)return {data:copy(local),conflictingFields:[!local||!remote?'Удаление записи':'Новая запись с тем же идентификатором']};
 // Session trash is represented by deletedAt inside an active record. Do not
 // combine trash/restore with a simultaneous edit to the same session silently.
 const localLifecycle=!same(local.deletedAt,base.deletedAt),remoteLifecycle=!same(remote.deletedAt,base.deletedAt);
 if((localLifecycle&&!same(meaningful(remote),meaningful(base)))||(remoteLifecycle&&!same(meaningful(local),meaningful(base))))return {data:copy(local),conflictingFields:['deletedAt']};
 const merged:CloudData={}, conflicts:string[]=[];
 for(const field of new Set([...Object.keys(base),...Object.keys(local),...Object.keys(remote)])){
  const b=base[field],l=local[field],r=remote[field];let value:unknown;
  if(same(l,r))value=l;
  else if(same(l,b))value=r;
  else if(same(r,b))value=l;
  else if(field==='updatedAt'||field==='createdAt')value=timestamp(field,l,r);
  else {conflicts.push(field);value=l;}
  if(value!==undefined)merged[field]=copy(value);
 }
 return {data:merged,conflictingFields:conflicts};
}

export function changesFor(state:State,remote:RemoteMap,conflicts:CloudConflict[]=[]):CloudChange[]{
 const local=stateToEntities(state),blocked=new Set(conflicts.map(c=>c.key)),changes:CloudChange[]=[];
 for(const key of new Set([...Object.keys(local),...Object.keys(remote)])){
  if(blocked.has(key))continue;
  const desired=local[key]?.data??null,previous=remote[key];
  if(same(desired,recordValue(previous)))continue;
  const entity=local[key]??previous;
  changes.push({kind:entity.kind,entity_id:entity.entity_id,base_revision:previous?.revision??0,data:copy(desired),deleted:desired===null});
 }
 const order:Record<EntityKind,number>={group:0,student:1,session:2,mark:3,answer:3,debt:3,settings:4};
 // Inserts/updates parents first; physical removals children first.
 return changes.sort((a,b)=>Number(a.deleted)-Number(b.deleted)||(a.deleted?order[b.kind]-order[a.kind]:order[a.kind]-order[b.kind])||entityKey(a.kind,a.entity_id).localeCompare(entityKey(b.kind,b.entity_id)));
}
