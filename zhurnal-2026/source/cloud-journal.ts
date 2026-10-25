import { JournalStore, STORAGE_KEY, initialState, validateState, type Seed, type State, type StoragePort } from './storage.ts';
import { changesFor, copy, entitiesToState, entityKey, entityLabel, mergeEntity, recordValue, recordsToMap, remoteEntities, same, stateToEntities, type CloudChange, type CloudConflict, type CloudRecord, type EntityMap, type RemoteMap } from './cloud-model.ts';
export type { CloudChange, CloudConflict, CloudRecord } from './cloud-model.ts';

export type CloudTransport = {
 read():Promise<{records:CloudRecord[];server_time?:string}>;
 apply(operationId:string,changes:CloudChange[]):Promise<{ok:true;records:CloudRecord[]}|{ok:false;error:'conflict';conflicts:CloudRecord[]}>;
};
export type CloudPhase='loading'|'syncing'|'synced'|'offline'|'conflict'|'error';
export type CloudStatus={phase:CloudPhase;pendingCount:number;lastSyncedAt:string|null;error:string;conflicts:CloudConflict[];hasRemoteData:boolean;hasLocalCache:boolean;needsBootstrap:boolean};
type Flight={operationId:string;changes:CloudChange[]};
type Envelope={format:1;ownerId:string;initialized:boolean;state:State;remote:RemoteMap;pending:CloudChange[];conflicts:CloudConflict[];inflight?:Flight;lastSyncedAt:string|null;remoteSeen:boolean};
const now=()=>new Date().toISOString();
const operationId=()=>globalThis.crypto.randomUUID();
const message=(error:unknown)=>error instanceof Error?error.message:'Не удалось связаться с облаком';
const fieldConflict=(conflict:CloudConflict)=>Boolean(conflict.local&&conflict.remote&&conflict.fields.every(field=>
 !['completedAt','deletedAt','resolvedAt'].includes(field)&&
 (Object.hasOwn(conflict.local!,field)||Object.hasOwn(conflict.remote!,field))));

/**
 * One durable local envelope contains the state, remote baseline, versions and outbox.
 * Store writes commit all four together, before JournalStore publishes its new value.
 * The legacy local journal is never read or changed implicitly.
 */
export class CloudJournal {
 readonly ownerId:string;
 readonly cacheKey:string;
 readonly store:JournalStore;
 private envelope:Envelope;
 private snapshot:CloudStatus;
 private listeners=new Set<()=>void>();
 private cachePresent=false;
 private ready=false;
 private disposed=false;
 private timer:ReturnType<typeof setTimeout>|undefined;
 private active:Promise<void>|null=null;
 private onStorage:((event:StorageEvent)=>void)|null=null;
 private storage:StoragePort;
 private transport:CloudTransport;

 constructor(ownerId:string,storage:StoragePort,seed:Seed,transport:CloudTransport){
  if(!ownerId||ownerId.length>200)throw new Error('Не определен владелец журнала');
  this.ownerId=ownerId;this.storage=storage;this.transport=transport;
  this.cacheKey=`sgua-journal-cloud-v1:${encodeURIComponent(ownerId)}`;
  const existing=this.readCache();
  this.envelope=existing??{format:1,ownerId,initialized:false,state:initialState(seed),remote:{},pending:[],conflicts:[],lastSyncedAt:null,remoteSeen:false};
  this.cachePresent=Boolean(existing);
  this.snapshot=this.makeSnapshot('loading','');
  const port:StoragePort={
   getItem:(key)=>key===STORAGE_KEY?JSON.stringify((this.readCache()??this.envelope).state):this.storage.getItem(`${this.cacheKey}:${encodeURIComponent(key)}`),
   setItem:(key,value)=>{
    if(key!==STORAGE_KEY){this.storage.setItem(`${this.cacheKey}:${encodeURIComponent(key)}`,value);return;}
    this.localCommit(validateState(JSON.parse(value)));
   },
  };
  this.store=new JournalStore(port,seed);
  const subscribe=this.store.subscribe;
  this.store.subscribe=(listener)=>subscribe(()=>{try{listener();}catch{/* Observers cannot turn an already saved journal write into an error. */}});
  if(typeof window!=='undefined'){
   this.onStorage=(event)=>{if(event.key!==this.cacheKey||this.disposed)return;try{const next=this.readCache();if(next){this.envelope=next;this.cachePresent=true;this.store.reload();this.emit();this.schedule();}}catch(error){this.emit('error',message(error));}};
   window.addEventListener('storage',this.onStorage);
  }
 }
 get hasRemoteData(){return this.envelope.remoteSeen;}
 get hasLocalCache(){return this.cachePresent;}
 get needsBootstrap(){return !this.envelope.initialized;}
 getSnapshot=()=>this.snapshot;
 subscribe=(listener:()=>void)=>{this.listeners.add(listener);return()=>{this.listeners.delete(listener);};};

 private readCache():Envelope|null{
  const raw=this.storage.getItem(this.cacheKey);if(!raw)return null;
  const value=JSON.parse(raw) as Envelope;
  if(value.format!==1||value.ownerId!==this.ownerId||!value.remote||typeof value.remote!=='object'||!Array.isArray(value.conflicts))throw new Error('Локальная копия облачного журнала повреждена');
  value.state=validateState(value.state);value.remote=recordsToMap(Object.values(value.remote));
  value.pending=value.initialized?changesFor(value.state,value.remote,value.conflicts):[];
  return value;
 }
 private current(){return this.readCache()??this.envelope;}
 private makeSnapshot(phase:CloudPhase,error:string):CloudStatus{
  return {phase,pendingCount:this.envelope.pending.length+this.envelope.conflicts.length,lastSyncedAt:this.envelope.lastSyncedAt,error,conflicts:copy(this.envelope.conflicts),hasRemoteData:this.envelope.remoteSeen,hasLocalCache:this.cachePresent,needsBootstrap:!this.envelope.initialized};
 }
 private emit(phase?:CloudPhase,error?:string){
  if(this.disposed)return;
  const actual=phase??(this.envelope.conflicts.length?'conflict':this.active?'syncing':this.envelope.pending.length?(this.snapshot.phase==='offline'?'offline':'syncing'):'synced');
  this.snapshot=this.makeSnapshot(actual,error??(actual==='offline'||actual==='error'?this.snapshot.error:''));
  for(const listener of this.listeners){try{listener();}catch{/* Status subscribers cannot make a journal write fail. */}}
 }
 private persist(next:Envelope,reload=true){
  next.pending=next.initialized?changesFor(next.state,next.remote,next.conflicts):[];
  // setItem is deliberately first: a quota error leaves both journal and queue unchanged.
  this.storage.setItem(this.cacheKey,JSON.stringify(next));
  this.envelope=next;this.cachePresent=true;
  if(reload)this.store.reload();
  this.emit();
 }
 private localCommit(state:State){
  if(this.disposed)throw new Error('Облачный журнал закрыт');
  const next=copy(this.current()),local=stateToEntities(state);
  next.state=state;
  next.conflicts=next.conflicts.flatMap(conflict=>{
   const desired=local[conflict.key]?.data??null,remote=recordValue(next.remote[conflict.key]);
   if(same(desired,remote))return [];
   return [{...conflict,local:copy(desired),label:entityLabel(conflict.kind,desired,conflict.entityId)}];
  });
  this.persist(next,false);
  this.schedule();
 }
 private schedule(){
  if(!this.ready||!this.envelope.initialized||this.disposed)return;
  clearTimeout(this.timer);this.timer=setTimeout(()=>{void this.flush();},220);
 }

 async initialize():Promise<void>{
  if(this.disposed)throw new Error('Облачный журнал закрыт');
  this.emit('loading','');
  try{
   // A lost response is retried with the same operation id before a new baseline is read.
   if(this.envelope.inflight&&this.envelope.initialized)await this.sendFlight(this.envelope.inflight);
   const response=await this.transport.read();
   if(this.disposed)return;
   this.integrateRead(response.records,response.server_time);
   this.ready=true;this.emit();
   if(this.envelope.initialized&&this.envelope.pending.length)await this.flush();
  }catch(error){
   this.ready=true;
   this.emit(this.cachePresent&&this.envelope.initialized?'offline':'error',message(error));
   if(!this.cachePresent||!this.envelope.initialized)throw error;
  }
 }

 private integrateRead(records:CloudRecord[],serverTime?:string){
  const previous=copy(this.current()),incoming=recordsToMap(records);
  if(previous.initialized&&Object.keys(previous.remote).length&&records.length===0)throw new Error('Облако вернуло пустой журнал. Локальная копия сохранена; повторите синхронизацию.');
  if(!previous.initialized){
   const next={...previous,remote:incoming,lastSyncedAt:serverTime??now(),remoteSeen:records.length>0};
   if(records.length){next.state=entitiesToState(remoteEntities(incoming),serverTime);next.initialized=true;next.conflicts=[];}
   this.persist(next);return;
  }
  const local=stateToEntities(previous.state),merged:EntityMap={},conflicts:CloudConflict[]=[];
  const priorConflicts=new Map(previous.conflicts.map(c=>[c.key,c]));
  for(const key of new Set([...Object.keys(previous.remote),...Object.keys(local),...Object.keys(incoming)])){
   const old=previous.remote[key],fresh=incoming[key],desired=local[key]?.data??null,remote=recordValue(fresh),base=recordValue(old);
   const descriptor=local[key]??fresh??old;if(!descriptor)continue;
   const prior=priorConflicts.get(key);
   const result=prior&&!fieldConflict(prior)&&!same(desired,remote)?{data:desired,conflictingFields:prior.fields}:mergeEntity(base,desired,remote);
   if(prior&&fieldConflict(prior)&&!same(desired,remote)){
    // Keep unresolved fields visible while still accepting later independent
    // remote edits. The baseline may advance several times before a choice.
    const unresolved=prior.fields.filter(field=>!same(desired?.[field],remote?.[field]));
    result.conflictingFields=[...new Set([...unresolved,...result.conflictingFields])];
   }
   if(result.data)merged[key]={kind:descriptor.kind,entity_id:descriptor.entity_id,data:copy(result.data)};
   if(result.conflictingFields.length)conflicts.push({key,kind:descriptor.kind,entityId:descriptor.entity_id,label:entityLabel(descriptor.kind,result.data,descriptor.entity_id),fields:result.conflictingFields,local:copy(result.data),remote:copy(remote)});
  }
  const next:Envelope={...previous,remote:incoming,state:entitiesToState(merged,previous.state.savedAt??serverTime),conflicts,lastSyncedAt:serverTime??now(),remoteSeen:previous.remoteSeen||records.length>0};
  this.persist(next);
 }

 /** Explicit migration. Existing remote rows with a different value are reviewed as conflicts. */
 async importLegacy(input:State):Promise<void>{
  const candidate=validateState(input),previous=copy(this.current());
  if(previous.initialized&&(previous.pending.length||previous.inflight))throw new Error('Перед переносом дождитесь отправки текущих изменений в облако.');
  this.storage.setItem(`${this.cacheKey}:before-import`,JSON.stringify(previous.state));
  let next:Envelope;
  if(!previous.initialized||!Object.keys(previous.remote).length){
   next={...previous,initialized:true,state:candidate,conflicts:[]};
  }else{
   const desired=stateToEntities(previous.state),imported=stateToEntities(candidate),conflicts=[...previous.conflicts];
   for(const [key,entity] of Object.entries(imported)){
    const existing=desired[key],remote=previous.remote[key];
    if(existing&&same(existing.data,entity.data))continue;
    if(existing){
     const equivalent=mergeEntity(null,entity.data,existing.data);
     if(!equivalent.conflictingFields.length){desired[key]={...entity,data:equivalent.data!};continue;}
    }
    if(existing||remote){
     const priorIndex=conflicts.findIndex(c=>c.key===key);if(priorIndex>=0)conflicts.splice(priorIndex,1);
     conflicts.push({key,kind:entity.kind,entityId:entity.entity_id,label:entityLabel(entity.kind,entity.data,entity.entity_id),fields:['Импорт из локального журнала'],local:copy(entity.data),remote:copy(existing?.data??recordValue(remote))});
    }
    desired[key]=copy(entity);
   }
   next={...previous,initialized:true,state:entitiesToState(desired,candidate.savedAt??now()),conflicts};
  }
  this.persist(next);this.ready=true;await this.flush();
 }
 resolveConflict(key:string,choice:'local'|'remote'):void{
  if(choice!=='local'&&choice!=='remote')throw new Error('Выберите версию записи');
  const next=copy(this.current()),conflict=next.conflicts.find(c=>c.key===key);if(!conflict)return;
  const entities=stateToEntities(next.state);
  let data=copy(choice==='local'?conflict.local:conflict.remote);
  if(choice==='remote'&&fieldConflict(conflict)){
   // local already contains the automatic three-way merge. Choosing a remote
   // value for a disputed field must preserve unrelated local edits in it.
   data=copy(conflict.local!);
   for(const field of conflict.fields){
    if(Object.hasOwn(conflict.remote!,field))data[field]=copy(conflict.remote![field]);
    else delete data[field];
   }
  }
  if(data)entities[key]={kind:conflict.kind,entity_id:conflict.entityId,data:copy(data)};else delete entities[key];
  next.state=entitiesToState(entities,now());next.conflicts=next.conflicts.filter(c=>c.key!==key);
  this.persist(next);this.schedule();
 }

 async flush():Promise<void>{
  if(this.disposed||!this.ready||!this.envelope.initialized)return;
  if(this.active)return this.active;
  clearTimeout(this.timer);
  this.active=this.runFlush();
  this.emit('syncing','');
  try{await this.active;}finally{this.active=null;if(!this.disposed&&this.snapshot.phase==='syncing')this.emit();}
 }
 private async runFlush(){
  try{
   this.envelope=this.current();
   if(this.envelope.inflight)await this.sendFlight(this.envelope.inflight);
   if(this.disposed)return;
   const latest=await this.transport.read();if(this.disposed)return;this.integrateRead(latest.records,latest.server_time);
   let attempts=0;
   while(!this.disposed){
    const current=this.current();this.envelope=current;
    const pending=changesFor(current.state,current.remote,current.conflicts);
    if(!pending.length)break;
    if(++attempts>100)throw new Error('Слишком много последовательных изменений. Локальная очередь сохранена; повторите синхронизацию.');
    const batch:CloudChange[]=[];let bytes=0;
    for(const change of pending){const size=new TextEncoder().encode(JSON.stringify(change)).length;if(size>130000)throw new Error('Одна запись слишком велика для отправки. Сократите ее текст.');if(batch.length&&(batch.length>=500||bytes+size>3800000))break;batch.push(change);bytes+=size;}
    const flight={operationId:operationId(),changes:copy(batch)};
    this.persist({...copy(current),inflight:flight},false);
    await this.sendFlight(flight);
   }
   if(this.disposed)return;
   this.emit(this.envelope.conflicts.length?'conflict':'synced','');
  }catch(error){if(!this.disposed)this.emit('offline',message(error));}
 }
 private async sendFlight(flight:Flight){
  const response=await this.transport.apply(flight.operationId,copy(flight.changes));
  if(this.disposed)return;
  const current=copy(this.current());
  // Another tab may have replaced the active batch. Its durable intent must survive.
  const sameFlight=current.inflight?.operationId===flight.operationId;
  if(response.ok){
   const acknowledged=recordsToMap(response.records);
   for(const [key,row] of Object.entries(acknowledged)){
    if(!current.remote[key]||row.revision>=current.remote[key].revision)current.remote[key]=row;
   }
   if(sameFlight)delete current.inflight;
   current.lastSyncedAt=now();current.remoteSeen=true;
   // Keep the current desired state. It may contain edits made while this request was in flight.
   this.persist(current);
  }else{
   if(sameFlight)delete current.inflight;
   this.persist(current,false);
   const latest=await this.transport.read();if(this.disposed)return;
   this.integrateRead(latest.records,latest.server_time);
  }
 }
 dispose(){
  this.disposed=true;clearTimeout(this.timer);this.listeners.clear();
  if(this.onStorage&&typeof window!=='undefined')window.removeEventListener('storage',this.onStorage);
 }
}
