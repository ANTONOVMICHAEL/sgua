import { createClient } from '@supabase/supabase-js';
import { CLOUD_URL, CLOUD_PUBLIC_KEY } from './cloud-config';
import type { CloudRecord } from './cloud-model';

export const cloudClient = createClient(CLOUD_URL,CLOUD_PUBLIC_KEY,{
 auth:{storageKey:'sgua-journal-auth-v1',persistSession:true,autoRefreshToken:true,detectSessionInUrl:false},
 global:{headers:{'x-client-info':'sgua-journal/14'}}
});

/** Delta transport keeps the complete record set locally while transferring only new versions. */
export function createCloudTransport() {
 let since:string|null=null;
 const records=new Map<string,CloudRecord>();
 let reading:Promise<{records:CloudRecord[];server_time?:string}>|null=null;
 const remember=(rows:CloudRecord[])=>rows.forEach(row=>{
  const key=JSON.stringify([row.kind,row.entity_id]);
  const old=records.get(key);
  if(!old||row.revision>=old.revision)records.set(key,row);
 });
 return {
  async read():Promise<{records:CloudRecord[];server_time?:string}> {
   if(reading)return reading;
   reading=(async()=>{
    const {data,error}=await cloudClient.rpc('sgua_journal_read',since?{p_since:since}:{});
    if(error)throw new Error(error.code==='42501'?'У этого аккаунта нет доступа к журналу. Войди под учетной записью Antonovium.':`Не удалось получить журнал: ${error.message}`);
    if(!data||!Array.isArray(data.records))throw new Error('Сервер вернул неполные данные журнала');
    remember(data.records);
    if(typeof data.server_time==='string')since=data.server_time;
    return {records:[...records.values()],server_time:data.server_time};
   })();
   try{return await reading;}finally{reading=null;}
  },
  async apply(operationId:string,changes:unknown[]) {
   const {data,error}=await cloudClient.rpc('sgua_journal_apply',{p_operation_id:operationId,p_changes:changes});
   if(error)throw new Error(error.code==='42501'?'У этого аккаунта нет доступа к журналу.':`Не удалось сохранить записи: ${error.message}`);
   if(!data||typeof data.ok!=='boolean')throw new Error('Сервер не подтвердил сохранение');
   if(data.ok&&Array.isArray(data.records))remember(data.records);
   if(!data.ok&&Array.isArray(data.conflicts))remember(data.conflicts.filter((r:CloudRecord)=>r.revision>0));
   return data;
  }
 };
}
