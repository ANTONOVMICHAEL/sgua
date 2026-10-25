-- SGUA journal cloud storage. Apply to the connected project as an administrator.
-- Existing Antonovium/workdesk tables and Auth configuration are not changed.
-- Public RPC wrappers are SECURITY INVOKER. Only the non-exposed private
-- implementations are SECURITY DEFINER: clients have no direct table DML,
-- so the compare-and-swap/version protocol cannot be bypassed through REST.
-- All privileged code derives ownership from auth.uid(), checks the explicit
-- membership allow-list, rejects anonymous identities, and uses search_path=''.

create schema if not exists sgua_journal_private;
revoke all on schema sgua_journal_private from public, anon, authenticated;
grant usage on schema sgua_journal_private to authenticated;

create table if not exists public.sgua_journal_members (
  owner_id uuid primary key references auth.users(id) on delete cascade,
  enabled boolean not null default true,
  created_at timestamptz not null default now()
);
create table if not exists public.sgua_journal_entities (
  owner_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('group','student','session','mark','answer','debt','settings')),
  entity_id text not null check (length(entity_id) between 1 and 500 and length(btrim(entity_id)) > 0),
  revision bigint not null default 1 check (revision between 1 and 9007199254740991),
  data jsonb,
  deleted boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (owner_id, kind, entity_id),
  check ((deleted and data is null) or (not deleted and data is not null and jsonb_typeof(data) = 'object' and octet_length(data::text) <= 131072))
);
create table if not exists public.sgua_journal_operations (
  owner_id uuid not null references auth.users(id) on delete cascade,
  operation_id uuid not null,
  request_digest text not null check (request_digest ~ '^[a-f0-9]{64}$'),
  response jsonb not null check (jsonb_typeof(response) = 'object' and octet_length(response::text) <= 5242880),
  created_at timestamptz not null default clock_timestamp(),
  primary key (owner_id, operation_id)
);
create index if not exists sgua_journal_operations_owner_created_idx
  on public.sgua_journal_operations(owner_id, created_at desc, operation_id);
-- Support final-state uniqueness checks after an atomic batch, so archiving
-- and recreating a lesson in that same batch does not depend on entity order.
drop index if exists public.sgua_journal_live_session_slot_idx;
drop index if exists public.sgua_journal_live_mark_pair_idx;
create index if not exists sgua_journal_session_slot_idx
  on public.sgua_journal_entities(owner_id, (data->>'groupCode'), (data->>'date'), (data->>'period'))
  where kind = 'session' and not deleted and coalesce(data->>'deletedAt','') = '';
create index if not exists sgua_journal_mark_pair_idx
  on public.sgua_journal_entities(owner_id, (data->>'studentId'), (data->>'sessionId'))
  where kind = 'mark' and not deleted;

alter table public.sgua_journal_members enable row level security;
alter table public.sgua_journal_entities enable row level security;
alter table public.sgua_journal_operations enable row level security;
revoke all on table public.sgua_journal_members, public.sgua_journal_entities, public.sgua_journal_operations
  from public, anon, authenticated;
-- Reading one's own authorization status is safe; clients cannot alter it.
grant select on table public.sgua_journal_members to authenticated;
drop policy if exists sgua_journal_member_own_read on public.sgua_journal_members;
create policy sgua_journal_member_own_read on public.sgua_journal_members for select to authenticated
  using ((select auth.uid()) = owner_id);
drop policy if exists sgua_journal_entity_own_read on public.sgua_journal_entities;
create policy sgua_journal_entity_own_read on public.sgua_journal_entities for select to authenticated
  using ((select auth.uid()) = owner_id and exists (
    select 1 from public.sgua_journal_members m where m.owner_id = (select auth.uid()) and m.enabled
  ));
drop policy if exists sgua_journal_operation_own_read on public.sgua_journal_operations;
create policy sgua_journal_operation_own_read on public.sgua_journal_operations for select to authenticated
  using ((select auth.uid()) = owner_id and exists (
    select 1 from public.sgua_journal_members m where m.owner_id = (select auth.uid()) and m.enabled
  ));

-- The existing, verified account is the only initial member. Reapplying the
-- schema preserves a later administrative disable instead of re-enabling it.
insert into public.sgua_journal_members(owner_id)
  select id from auth.users where id = '4453c05c-8cdc-4948-ae32-a686b95bef18'::uuid
  on conflict (owner_id) do nothing;

create or replace function sgua_journal_private.require_owner()
returns uuid language plpgsql stable security definer set search_path = '' as $function$
declare v_owner uuid := auth.uid();
begin
  if v_owner is null or coalesce((auth.jwt()->>'is_anonymous')::boolean, false)
     or not exists (select 1 from public.sgua_journal_members m where m.owner_id = v_owner and m.enabled) then
    raise exception using errcode = '42501', message = 'Доступ к облачному журналу не разрешен для этого аккаунта';
  end if;
  return v_owner;
end;
$function$;
revoke all on function sgua_journal_private.require_owner() from public, anon, authenticated;

-- Check each entity at the API boundary. Relationships and the complete
-- schema-3 document are additionally validated by the client on load/import.
-- Debts with an empty/legacy missing sessionId remain accepted for compatibility.
create or replace function sgua_journal_private.validate_entity(p_kind text, p_id text, p_data jsonb)
returns void language plpgsql stable security invoker set search_path = '' as $function$
declare v_key text; v_value jsonb; v_sum integer := 0;
begin
  if jsonb_typeof(p_data) is distinct from 'object' or octet_length(p_data::text) > 131072 then
    raise exception using errcode = '22023', message = 'Неверный формат или размер записи';
  end if;
  if p_kind = 'group' then
    if p_data->>'code' is distinct from p_id or jsonb_typeof(p_data->'code') is distinct from 'string'
       or length(p_id) > 80 or jsonb_typeof(p_data->'institute') is distinct from 'string'
       or length(p_data->>'institute') > 3000 or jsonb_typeof(p_data->'position') is distinct from 'number' then
      raise exception using errcode = '22023', message = 'Неверная запись группы';
    end if;
  elsif p_kind = 'student' then
    if jsonb_typeof(p_data->'id') is distinct from 'string' or p_data->>'id' is distinct from p_id or length(p_id) > 150
       or jsonb_typeof(p_data->'groupCode') is distinct from 'string' or length(p_data->>'groupCode') not between 1 and 80
       or jsonb_typeof(p_data->'fullName') is distinct from 'string'
       or length(btrim(p_data->>'fullName')) < 1 or length(p_data->>'fullName') > 200
       or jsonb_typeof(p_data->'position') is distinct from 'number'
       or p_data->'active' not in ('0'::jsonb,'1'::jsonb) or not (p_data ? 'active') then
      raise exception using errcode = '22023', message = 'Неверная запись студента';
    end if;
  elsif p_kind = 'session' then
    if jsonb_typeof(p_data->'id') is distinct from 'string' or p_data->>'id' is distinct from p_id or length(p_id) > 150
       or jsonb_typeof(p_data->'groupCode') is distinct from 'string' or length(p_data->>'groupCode') not between 1 and 80
       or jsonb_typeof(p_data->'date') is distinct from 'string'
       or (p_data->>'date') !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
       or jsonb_typeof(p_data->'period') is distinct from 'number'
       or (p_data->>'period') !~ '^[0-9]+$'
       or (p_data->>'period')::numeric not between 1 and 12
       or jsonb_typeof(p_data->'kind') is distinct from 'string' or length(p_data->>'kind') > 100
       or jsonb_typeof(p_data->'topic') is distinct from 'string' or length(p_data->>'topic') > 3000
       or jsonb_typeof(p_data->'createdAt') is distinct from 'string' or length(p_data->>'createdAt') > 3000 then
      raise exception using errcode = '22023', message = 'Неверная запись занятия';
    end if;
    if to_char((p_data->>'date')::date, 'YYYY-MM-DD') <> p_data->>'date' then
      raise exception using errcode = '22023', message = 'Неверная дата занятия';
    end if;
    foreach v_key in array array['completedAt','deletedAt'] loop
      if p_data ? v_key then
        if jsonb_typeof(p_data->v_key) is distinct from 'string' or length(p_data->>v_key) > 100 then
          raise exception using errcode = '22023', message = 'Неверная дата состояния занятия';
        end if;
        perform (p_data->>v_key)::timestamptz;
      end if;
    end loop;
  elsif p_kind = 'mark' then
    if jsonb_typeof(p_data->'studentId') is distinct from 'string' or length(p_data->>'studentId') not between 1 and 150
       or jsonb_typeof(p_data->'sessionId') is distinct from 'string' or length(p_data->>'sessionId') not between 1 and 150
       or jsonb_typeof(p_data->'status') is distinct from 'string' or p_data->>'status' not in ('present','absent','late','excused')
       or jsonb_typeof(p_data->'updatedAt') is distinct from 'string' or length(p_data->>'updatedAt') > 3000 then
      raise exception using errcode = '22023', message = 'Неверная отметка посещаемости';
    end if;
  elsif p_kind = 'answer' then
    if jsonb_typeof(p_data->'id') is distinct from 'string' or p_data->>'id' is distinct from p_id or length(p_id) > 150
       or jsonb_typeof(p_data->'studentId') is distinct from 'string' or length(p_data->>'studentId') not between 1 and 150
       or jsonb_typeof(p_data->'sessionId') is distinct from 'string' or length(p_data->>'sessionId') not between 1 and 150
       or jsonb_typeof(p_data->'grade') is distinct from 'string' or p_data->>'grade' not in ('+','2','3','4','5')
       or jsonb_typeof(p_data->'note') is distinct from 'string' or length(p_data->>'note') > 3000
       or jsonb_typeof(p_data->'updatedAt') is distinct from 'string' or length(p_data->>'updatedAt') > 3000
       or (p_data ? 'createdAt' and (jsonb_typeof(p_data->'createdAt') is distinct from 'string' or length(p_data->>'createdAt') > 3000)) then
      raise exception using errcode = '22023', message = 'Неверная запись ответа';
    end if;
  elsif p_kind = 'debt' then
    if jsonb_typeof(p_data->'id') is distinct from 'string' or p_data->>'id' is distinct from p_id or length(p_id) > 150
       or jsonb_typeof(p_data->'studentId') is distinct from 'string' or length(p_data->>'studentId') not between 1 and 150
       or jsonb_typeof(p_data->'groupCode') is distinct from 'string' or length(p_data->>'groupCode') not between 1 and 80
       or jsonb_typeof(p_data->'sessionId') is distinct from 'string' or length(p_data->>'sessionId') > 500
       or jsonb_typeof(p_data->'title') is distinct from 'string' or length(btrim(p_data->>'title')) < 1 or length(p_data->>'title') > 200
       or jsonb_typeof(p_data->'kind') is distinct from 'string' or length(p_data->>'kind') > 100
       or jsonb_typeof(p_data->'dueDate') is distinct from 'string' or length(p_data->>'dueDate') > 10
       or jsonb_typeof(p_data->'note') is distinct from 'string' or length(p_data->>'note') > 3000
       or jsonb_typeof(p_data->'status') is distinct from 'string' or p_data->>'status' not in ('open','resolved')
       or jsonb_typeof(p_data->'resolution') is distinct from 'string' or length(p_data->>'resolution') > 3000
       or jsonb_typeof(p_data->'createdAt') is distinct from 'string' or length(p_data->>'createdAt') > 3000
       or jsonb_typeof(p_data->'updatedAt') is distinct from 'string' or length(p_data->>'updatedAt') > 3000
       or jsonb_typeof(p_data->'resolvedAt') is distinct from 'string' or length(p_data->>'resolvedAt') > 3000 then
      raise exception using errcode = '22023', message = 'Неверная запись задолженности';
    end if;
    if p_data->>'dueDate' <> '' then
      if (p_data->>'dueDate') !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
         or to_char((p_data->>'dueDate')::date, 'YYYY-MM-DD') <> p_data->>'dueDate' then
        raise exception using errcode = '22023', message = 'Неверный срок задолженности';
      end if;
    end if;
    if p_data->>'status' = 'resolved' then perform (p_data->>'resolvedAt')::timestamptz; end if;
  elsif p_kind = 'settings' then
    if p_id <> 'rating' then raise exception using errcode = '22023', message = 'Неизвестные настройки журнала'; end if;
    foreach v_key in array array['attendance','answerPlus','grade2','grade3','grade4','grade5','openDebt'] loop
      v_value := p_data->v_key;
      if jsonb_typeof(v_value) is distinct from 'number' or (p_data->>v_key) !~ '^[0-9]+$'
         or (p_data->>v_key)::numeric not between 0 and 20 then
        raise exception using errcode = '22023', message = 'Неверные баллы рейтинга';
      end if;
      v_sum := v_sum + (p_data->>v_key)::integer;
    end loop;
    if v_sum = 0 then raise exception using errcode = '22023', message = 'Хотя бы один показатель рейтинга должен быть больше нуля'; end if;
  else
    raise exception using errcode = '22023', message = 'Неизвестный вид записи';
  end if;
end;
$function$;
revoke all on function sgua_journal_private.validate_entity(text,text,jsonb) from public, anon, authenticated;

-- Remove the old zero-argument overload if a previous draft was installed.
drop function if exists public.sgua_journal_read();
drop function if exists sgua_journal_private.read_records();
create or replace function sgua_journal_private.read_records(p_since timestamptz default null)
returns jsonb language plpgsql security definer set search_path = '' as $function$
declare v_owner uuid := sgua_journal_private.require_owner(); v_records jsonb; v_cutoff timestamptz;
begin
  perform pg_catalog.pg_advisory_xact_lock_shared(pg_catalog.hashtextextended('sgua-journal:' || v_owner::text, 0));
  v_cutoff := clock_timestamp();
  select coalesce(jsonb_agg(jsonb_build_object(
    'kind',e.kind,'entity_id',e.entity_id,'revision',e.revision,'data',e.data,'deleted',e.deleted,'updated_at',e.updated_at
  ) order by e.kind,e.entity_id),'[]'::jsonb) into v_records
  from public.sgua_journal_entities e where e.owner_id = v_owner
    and (p_since is null or e.updated_at > p_since) and e.updated_at <= v_cutoff;
  return jsonb_build_object('records',v_records,'server_time',v_cutoff);
end;
$function$;
revoke all on function sgua_journal_private.read_records(timestamptz) from public, anon, authenticated;
grant execute on function sgua_journal_private.read_records(timestamptz) to authenticated;

create or replace function sgua_journal_private.apply_changes(p_operation_id uuid, p_changes jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $function$
declare
  v_owner uuid := sgua_journal_private.require_owner();
  v_change jsonb; v_kind text; v_id text; v_base bigint; v_deleted boolean; v_data jsonb;
  v_row public.sgua_journal_entities%rowtype;
  v_current jsonb; v_conflicts jsonb := '[]'::jsonb; v_records jsonb := '[]'::jsonb;
  v_response jsonb; v_previous public.sgua_journal_operations%rowtype;
  v_digest text; v_write_at timestamptz;
begin
  if p_operation_id is null or jsonb_typeof(p_changes) is distinct from 'array'
     or jsonb_array_length(p_changes) > 500 or octet_length(p_changes::text) > 4194304 then
    raise exception using errcode = '22023', message = 'Неверный размер пакета синхронизации';
  end if;
  v_digest := pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(p_changes::text,'UTF8')),'hex');
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('sgua-journal:' || v_owner::text, 0));
  select * into v_previous from public.sgua_journal_operations o where o.owner_id = v_owner and o.operation_id = p_operation_id;
  if found then
    if v_previous.request_digest <> v_digest then
      raise exception using errcode = '22023', message = 'Идентификатор операции уже использован для другого пакета';
    end if;
    return v_previous.response;
  end if;
  if jsonb_array_length(p_changes) = 0 then return jsonb_build_object('ok',true,'records','[]'::jsonb); end if;

  -- Validate the entire batch before either version checks or writes.
  for v_change in select value from jsonb_array_elements(p_changes) loop
    if jsonb_typeof(v_change) is distinct from 'object'
       or jsonb_typeof(v_change->'kind') is distinct from 'string'
       or v_change->>'kind' not in ('group','student','session','mark','answer','debt','settings')
       or jsonb_typeof(v_change->'entity_id') is distinct from 'string'
       or length(v_change->>'entity_id') not between 1 and 500 or length(btrim(v_change->>'entity_id')) = 0
       or jsonb_typeof(v_change->'base_revision') is distinct from 'number'
       or (v_change->>'base_revision') !~ '^[0-9]+$'
       or (v_change->>'base_revision')::numeric > 9007199254740991
       or jsonb_typeof(v_change->'deleted') is distinct from 'boolean' then
      raise exception using errcode = '22023', message = 'Неверная запись пакета синхронизации';
    end if;
    if not (v_change->>'deleted')::boolean then
      perform sgua_journal_private.validate_entity(v_change->>'kind',v_change->>'entity_id',v_change->'data');
    elsif v_change ? 'data' and jsonb_typeof(v_change->'data') not in ('object','null') then
      raise exception using errcode = '22023', message = 'Неверное удаление записи';
    end if;
  end loop;
  if exists (select 1 from jsonb_array_elements(p_changes) c group by c->>'kind',c->>'entity_id' having count(*) > 1) then
    raise exception using errcode = '22023', message = 'Одна запись указана в пакете несколько раз';
  end if;

  -- The per-owner lock protects new-row races too. A conflict never partly
  -- applies another record from the same batch.
  for v_change in select value from jsonb_array_elements(p_changes) loop
    v_kind := v_change->>'kind'; v_id := v_change->>'entity_id'; v_base := (v_change->>'base_revision')::bigint;
    select * into v_row from public.sgua_journal_entities e where e.owner_id = v_owner and e.kind = v_kind and e.entity_id = v_id;
    if coalesce(v_row.revision,0) <> v_base then
      v_current := jsonb_build_object('kind',v_kind,'entity_id',v_id,'revision',coalesce(v_row.revision,0),
        'data',v_row.data,'deleted',coalesce(v_row.deleted,true),'updated_at',v_row.updated_at);
      v_conflicts := v_conflicts || jsonb_build_array(v_current);
    end if;
  end loop;
  if jsonb_array_length(v_conflicts) > 0 then
    return jsonb_build_object('ok',false,'error','conflict','conflicts',v_conflicts);
  end if;

  v_write_at := clock_timestamp();
  for v_change in select value from jsonb_array_elements(p_changes) loop
    v_kind := v_change->>'kind'; v_id := v_change->>'entity_id'; v_deleted := (v_change->>'deleted')::boolean;
    v_data := case when v_deleted then null else v_change->'data' end;
    select * into v_row from public.sgua_journal_entities e where e.owner_id = v_owner and e.kind = v_kind and e.entity_id = v_id;
    if not found then
      insert into public.sgua_journal_entities(owner_id,kind,entity_id,revision,data,deleted,updated_at)
        values(v_owner,v_kind,v_id,1,v_data,v_deleted,v_write_at) returning * into v_row;
    elsif v_row.deleted is distinct from v_deleted or v_row.data is distinct from v_data then
      update public.sgua_journal_entities e set revision = e.revision + 1, data = v_data, deleted = v_deleted, updated_at = v_write_at
        where e.owner_id = v_owner and e.kind = v_kind and e.entity_id = v_id returning * into v_row;
    end if;
    v_records := v_records || jsonb_build_array(jsonb_build_object(
      'kind',v_row.kind,'entity_id',v_row.entity_id,'revision',v_row.revision,'data',v_row.data,'deleted',v_row.deleted,'updated_at',v_row.updated_at));
  end loop;
  -- Validate uniqueness against the final batch state under the same lock.
  -- A raised exception rolls back every entity mutation in this call.
  if exists (select 1 from jsonb_array_elements(p_changes) c where c->>'kind' = 'session') and exists (
    select 1 from public.sgua_journal_entities e where e.owner_id = v_owner and e.kind = 'session' and not e.deleted
      and coalesce(e.data->>'deletedAt','') = ''
    group by e.data->>'groupCode',e.data->>'date',e.data->>'period' having count(*) > 1
  ) then
    raise exception using errcode = '23505', message = 'На эту дату и пару уже есть занятие';
  end if;
  if exists (select 1 from jsonb_array_elements(p_changes) c where c->>'kind' = 'mark') and exists (
    select 1 from public.sgua_journal_entities e where e.owner_id = v_owner and e.kind = 'mark' and not e.deleted
    group by e.data->>'studentId',e.data->>'sessionId' having count(*) > 1
  ) then
    raise exception using errcode = '23505', message = 'У студента уже есть отметка на этом занятии';
  end if;
  v_response := jsonb_build_object('ok',true,'records',v_records);
  insert into public.sgua_journal_operations(owner_id,operation_id,request_digest,response,created_at)
    values(v_owner,p_operation_id,v_digest,v_response,clock_timestamp());
  -- Bounded exact-retry acknowledgments. Older requests still cannot duplicate
  -- an entity: its stable key/revision produces a normal conflict on replay.
  delete from public.sgua_journal_operations o where o.owner_id = v_owner and o.operation_id in (
    select recent.operation_id from (
      select operation_id, row_number() over (order by created_at desc,operation_id) as seq,
        sum(octet_length(response::text)) over (order by created_at desc,operation_id rows unbounded preceding) as bytes
      from public.sgua_journal_operations where owner_id = v_owner
    ) recent where recent.seq > 256 or recent.bytes > 33554432
  ) and o.operation_id <> p_operation_id;
  return v_response;
end;
$function$;
revoke all on function sgua_journal_private.apply_changes(uuid,jsonb) from public, anon, authenticated;
grant execute on function sgua_journal_private.apply_changes(uuid,jsonb) to authenticated;

create or replace function public.sgua_journal_read(p_since timestamptz default null)
returns jsonb language sql security invoker set search_path = '' as $function$
  select sgua_journal_private.read_records(p_since);
$function$;
create or replace function public.sgua_journal_apply(p_operation_id uuid, p_changes jsonb)
returns jsonb language sql security invoker set search_path = '' as $function$
  select sgua_journal_private.apply_changes(p_operation_id,p_changes);
$function$;
revoke all on function public.sgua_journal_read(timestamptz) from public, anon, authenticated;
revoke all on function public.sgua_journal_apply(uuid,jsonb) from public, anon, authenticated;
grant execute on function public.sgua_journal_read(timestamptz), public.sgua_journal_apply(uuid,jsonb) to authenticated;
comment on table public.sgua_journal_entities is 'Private per-owner SGUA journal records. Stable text IDs preserve schema-3 imports; completedAt and deletedAt remain in session data. Direct client DML is revoked; use CAS RPC.';
comment on table public.sgua_journal_operations is 'Bounded idempotent RPC acknowledgments: latest 256 operations and 32 MiB per owner. No credentials or Auth tokens are stored.';
