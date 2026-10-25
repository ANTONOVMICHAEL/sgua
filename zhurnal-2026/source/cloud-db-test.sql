-- Administrator-only verification after cloud-schema.sql has been applied.
-- Run this whole file in one database connection. Every test write is rolled
-- back, including operation acknowledgments; no Auth user/config is changed.
-- Failure raises an exception. Success ends with ROLLBACK and test notices.
begin;
select set_config('request.jwt.claims', '{"sub":"4453c05c-8cdc-4948-ae32-a686b95bef18","role":"authenticated","is_anonymous":false}', true);
set local role authenticated;
do $test$
declare
  stem text := '__sgua_test_' || replace(gen_random_uuid()::text,'-','');
  op uuid := gen_random_uuid(); changes jsonb; r jsonb; replay jsonb; page jsonb;
  cutoff timestamptz; group_data jsonb; session_data jsonb; student_data jsonb;
  change jsonb; rejected boolean; bad jsonb; n integer;
begin
  page := public.sgua_journal_read();
  if jsonb_typeof(page->'records') <> 'array' or page->>'server_time' is null then raise exception 'Read envelope invalid'; end if;
  cutoff := (page->>'server_time')::timestamptz;
  group_data := jsonb_build_object('code',stem,'institute','Rollback test','position',999);
  changes := jsonb_build_array(jsonb_build_object('kind','group','entity_id',stem,'base_revision',0,'data',group_data,'deleted',false));
  r := public.sgua_journal_apply(op,changes);
  if r->>'ok' <> 'true' or (r#>>'{records,0,revision}')::integer <> 1 then raise exception 'Initial revision is not 1'; end if;
  replay := public.sgua_journal_apply(op,changes);
  if replay is distinct from r then raise exception 'Retry acknowledgment changed'; end if;

  rejected := false;
  begin perform public.sgua_journal_apply(op,'[]'::jsonb); exception when invalid_parameter_value then rejected := true; end;
  if not rejected then raise exception 'Reused operation ID with a different request was accepted'; end if;

  -- A byte-equivalent update is acknowledged without advancing its revision.
  changes := jsonb_set(changes,'{0,base_revision}','1'::jsonb);
  r := public.sgua_journal_apply(gen_random_uuid(),changes);
  if (r#>>'{records,0,revision}')::integer <> 1 then raise exception 'No-op advanced the revision'; end if;
  changes := jsonb_set(changes,'{0,data,institute}','"Updated"'::jsonb);
  r := public.sgua_journal_apply(gen_random_uuid(),changes);
  if (r#>>'{records,0,revision}')::integer <> 2 then raise exception 'Update did not advance revision'; end if;
  page := public.sgua_journal_read(cutoff);
  if not exists(select 1 from jsonb_array_elements(page->'records') x where x->>'entity_id'=stem and x->>'revision'='2') then raise exception 'Delta omitted a new write'; end if;
  page := public.sgua_journal_read((page->>'server_time')::timestamptz);
  if jsonb_array_length(page->'records') <> 0 then raise exception 'Unchanged delta is not empty'; end if;

  -- One stale entity prevents the other, valid entity from being inserted.
  r := public.sgua_journal_apply(gen_random_uuid(),changes || jsonb_build_array(jsonb_build_object('kind','group','entity_id',stem || '_atomic','base_revision',0,'data',jsonb_set(group_data,'{code}',to_jsonb(stem || '_atomic')),'deleted',false)));
  if r->>'error' <> 'conflict' or (r#>>'{conflicts,0,revision}')::integer <> 2 then raise exception 'CAS conflict missing'; end if;
  page := public.sgua_journal_read();
  if exists(select 1 from jsonb_array_elements(page->'records') x where x->>'entity_id'=stem || '_atomic') then raise exception 'Conflict batch partially applied'; end if;
  r := public.sgua_journal_apply(gen_random_uuid(),jsonb_build_array(jsonb_build_object('kind','group','entity_id',stem || '_missing','base_revision',99,'data',jsonb_set(group_data,'{code}',to_jsonb(stem || '_missing')),'deleted',false)));
  if r#>>'{conflicts,0,revision}' <> '0' or r#>>'{conflicts,0,deleted}' <> 'true' then raise exception 'Missing entity conflict invalid'; end if;

  -- Reject duplicates and malformed protocol input before any writes.
  changes := jsonb_set(changes,'{0,base_revision}','2'::jsonb);
  rejected := false;
  begin perform public.sgua_journal_apply(gen_random_uuid(),changes || changes); exception when invalid_parameter_value then rejected := true; end;
  if not rejected then raise exception 'Duplicate changes accepted'; end if;
  for bad in select value from jsonb_array_elements(jsonb_build_array(
    jsonb_set(changes,'{0,kind}','"unknown"'),
    jsonb_set(changes,'{0,data}','null'),
    jsonb_set(changes,'{0,base_revision}','-1'),
    jsonb_set(changes,'{0,deleted}','null'),
    jsonb_set(changes,'{0,entity_id}',to_jsonb(repeat('x',501)))
  )) loop
    rejected := false;
    begin perform public.sgua_journal_apply(gen_random_uuid(),bad); exception when invalid_parameter_value then rejected := true; end;
    if not rejected then raise exception 'Malformed protocol input accepted: %',bad; end if;
  end loop;
  select jsonb_agg(changes->0) into bad from generate_series(1,501);
  rejected := false;
  begin perform public.sgua_journal_apply(gen_random_uuid(),bad); exception when invalid_parameter_value then rejected := true; end;
  if not rejected then raise exception 'Batch of 501 accepted'; end if;

  -- The payload preserves text IDs and multiple answers/debts per lesson.
  student_data := jsonb_build_object('id',stem || '_student','groupCode',stem,'fullName','Проверка облака','position',1,'active',1);
  session_data := jsonb_build_object('id',stem || '_session','groupCode',stem,'date','2026-10-25','period',1,'kind','Семинар','topic','Rollback test','createdAt','2026-10-25T12:00:00.000Z','completedAt','2026-10-25T13:30:00.000Z');
  changes := jsonb_build_array(
    jsonb_build_object('kind','student','entity_id',stem || '_student','base_revision',0,'data',student_data,'deleted',false),
    jsonb_build_object('kind','session','entity_id',stem || '_session','base_revision',0,'data',session_data,'deleted',false)
  );
  for n in 1..2 loop
    changes := changes || jsonb_build_array(
      jsonb_build_object('kind','answer','entity_id',stem || '_answer' || n,'base_revision',0,'deleted',false,'data',jsonb_build_object('id',stem || '_answer' || n,'studentId',stem || '_student','sessionId',stem || '_session','grade','5','note','','updatedAt','2026-10-25T13:00:00.000Z')),
      jsonb_build_object('kind','debt','entity_id',stem || '_debt' || n,'base_revision',0,'deleted',false,'data',jsonb_build_object('id',stem || '_debt' || n,'studentId',stem || '_student','groupCode',stem,'sessionId','','title','Проверка','kind','Ответ','dueDate','','note','','status','open','resolution','','createdAt','2026-10-25T13:00:00.000Z','updatedAt','2026-10-25T13:00:00.000Z','resolvedAt',''))
    );
  end loop;
  r := public.sgua_journal_apply(gen_random_uuid(),changes);
  if r->>'ok' <> 'true' or jsonb_array_length(r->'records') <> 6 or r#>>'{records,1,data,completedAt}' <> '2026-10-25T13:30:00.000Z' then raise exception 'Lesson/answers/debts payload was not preserved'; end if;
  for bad in select value from jsonb_array_elements(jsonb_build_array(
    jsonb_build_array(jsonb_set(changes->0,'{data,id}','123'::jsonb)),
    jsonb_build_array(jsonb_set(changes->2,'{data,grade}','5'::jsonb)),
    jsonb_build_array(jsonb_set(changes->2,'{data,grade}','null'::jsonb)),
    jsonb_build_array(jsonb_set(changes->3,'{data,status}','null'::jsonb))
  )) loop
    rejected := false;
    begin perform public.sgua_journal_apply(gen_random_uuid(),bad); exception when invalid_parameter_value then rejected := true; end;
    if not rejected then raise exception 'Wrong payload JSON types accepted'; end if;
  end loop;

  change := jsonb_build_object('kind','mark','entity_id',stem || '_mark','base_revision',0,'deleted',false,'data',jsonb_build_object('studentId',stem || '_student','sessionId',stem || '_session','status','present','updatedAt','2026-10-25T13:00:00.000Z'));
  r := public.sgua_journal_apply(gen_random_uuid(),jsonb_build_array(change));
  if r->>'ok' <> 'true' then raise exception 'Valid mark rejected'; end if;
  rejected := false;
  begin perform public.sgua_journal_apply(gen_random_uuid(),jsonb_build_array(jsonb_set(change,'{data,status}','null'::jsonb))); exception when invalid_parameter_value then rejected := true; end;
  if not rejected then raise exception 'Null mark status accepted'; end if;
  rejected := false;
  begin perform public.sgua_journal_apply(gen_random_uuid(),jsonb_build_array(jsonb_set(change,'{entity_id}',to_jsonb(stem || '_mark_duplicate')))); exception when unique_violation then rejected := true; end;
  if not rejected then raise exception 'Duplicate attendance pair accepted'; end if;

  -- Archiving an old lesson and creating its replacement in one batch works
  -- even when the new lesson is first; two final live lessons are rejected.
  r := public.sgua_journal_apply(gen_random_uuid(),jsonb_build_array(
    jsonb_build_object('kind','session','entity_id',stem || '_replacement','base_revision',0,'data',jsonb_set(session_data,'{id}',to_jsonb(stem || '_replacement')),'deleted',false),
    jsonb_build_object('kind','session','entity_id',stem || '_session','base_revision',1,'data',session_data || '{"deletedAt":"2026-10-25T14:00:00.000Z"}'::jsonb,'deleted',false)
  ));
  if r->>'ok' <> 'true' then raise exception 'Archive/recreate batch failed'; end if;
  rejected := false;
  begin perform public.sgua_journal_apply(gen_random_uuid(),jsonb_build_array(jsonb_build_object('kind','session','entity_id',stem || '_duplicate','base_revision',0,'data',jsonb_set(session_data,'{id}',to_jsonb(stem || '_duplicate')),'deleted',false))); exception when unique_violation then rejected := true; end;
  if not rejected then raise exception 'Two live lessons in one slot were accepted'; end if;
  page := public.sgua_journal_read();
  if exists(select 1 from jsonb_array_elements(page->'records') x where x->>'entity_id'=stem || '_duplicate') then raise exception 'Duplicate slot error left a record'; end if;

  -- Tombstones remain readable and stale clients cannot resurrect them.
  changes := jsonb_build_array(jsonb_build_object('kind','group','entity_id',stem,'base_revision',2,'data',null,'deleted',true));
  r := public.sgua_journal_apply(gen_random_uuid(),changes);
  if r#>>'{records,0,revision}' <> '3' or r#>>'{records,0,deleted}' <> 'true' or r#>'{records,0,data}' <> 'null'::jsonb then raise exception 'Tombstone invalid'; end if;
  r := public.sgua_journal_apply(gen_random_uuid(),jsonb_build_array(jsonb_build_object('kind','group','entity_id',stem,'base_revision',0,'data',group_data,'deleted',false)));
  if r->>'error' <> 'conflict' or r#>>'{conflicts,0,revision}' <> '3' then raise exception 'Stale resurrection accepted'; end if;

  -- The authenticated client must not bypass the revision RPC via table REST.
  rejected := false;
  begin perform 1 from public.sgua_journal_entities; exception when insufficient_privilege then rejected := true; end;
  if not rejected then raise exception 'Direct table read unexpectedly granted'; end if;
  rejected := false;
  begin update public.sgua_journal_entities set revision=revision+1; exception when insufficient_privilege then rejected := true; end;
  if not rejected then raise exception 'Direct entity update unexpectedly granted'; end if;
  rejected := false;
  begin update public.sgua_journal_members set enabled=true; exception when insufficient_privilege then rejected := true; end;
  if not rejected then raise exception 'Membership modification unexpectedly granted'; end if;
  raise notice 'Owner protocol, delta, idempotency, validation, atomicity, tombstones and direct-DML tests passed';
end;
$test$;

reset role;
select set_config('request.jwt.claims', '{"sub":"11111111-1111-4111-8111-111111111111","role":"authenticated","is_anonymous":false}', true);
set local role authenticated;
do $test$
declare rejected boolean := false;
begin
  begin perform public.sgua_journal_read(); exception when insufficient_privilege then rejected:=true; end;
  if not rejected then raise exception 'Another account read the journal'; end if;
  rejected:=false;
  begin perform public.sgua_journal_apply(gen_random_uuid(),'[]'::jsonb); exception when insufficient_privilege then rejected:=true; end;
  if not rejected then raise exception 'Another account wrote the journal'; end if;
  if exists(select 1 from public.sgua_journal_members) then raise exception 'Membership RLS exposed another account'; end if;
  raise notice 'Unauthorized authenticated account blocked';
end;
$test$;

reset role;
select set_config('request.jwt.claims', '{"sub":"4453c05c-8cdc-4948-ae32-a686b95bef18","role":"authenticated","is_anonymous":true}', true);
set local role authenticated;
do $test$
declare rejected boolean:=false;
begin
  begin perform public.sgua_journal_read(); exception when insufficient_privilege then rejected:=true; end;
  if not rejected then raise exception 'Anonymous identity accepted'; end if;
  raise notice 'Anonymous Auth identity blocked';
end;
$test$;

reset role;
select set_config('request.jwt.claims', '{"role":"anon"}', true);
set local role anon;
do $test$
declare rejected boolean:=false;
begin
  begin perform public.sgua_journal_read(); exception when insufficient_privilege then rejected:=true; end;
  if not rejected then raise exception 'Anon role executed read RPC'; end if;
  rejected:=false;
  begin perform public.sgua_journal_apply(gen_random_uuid(),'[]'::jsonb); exception when insufficient_privilege then rejected:=true; end;
  if not rejected then raise exception 'Anon role executed write RPC'; end if;
  raise notice 'Anon role blocked';
end;
$test$;
reset role;
rollback;
