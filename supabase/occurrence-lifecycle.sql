begin;

alter table public.ocorrencias
  add column if not exists resolved_at timestamptz;

update public.ocorrencias
set resolved_at = coalesce(resolved_at, created_at, now())
where status = 'resolved';

update public.ocorrencias
set resolved_at = null
where status <> 'resolved'
  and resolved_at is not null;

create or replace function public.track_ocorrencia_resolution()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status = 'resolved' then
    if tg_op = 'INSERT' then
      new.resolved_at := coalesce(new.resolved_at, new.created_at, now());
    elsif old.status is distinct from new.status then
      new.resolved_at := now();
    else
      new.resolved_at := coalesce(old.resolved_at, new.resolved_at, now());
    end if;
  else
    new.resolved_at := null;
  end if;

  return new;
end;
$$;

drop trigger if exists track_ocorrencia_resolution
  on public.ocorrencias;
create trigger track_ocorrencia_resolution
  before insert or update of status on public.ocorrencias
  for each row execute function public.track_ocorrencia_resolution();

revoke all on function public.track_ocorrencia_resolution() from public, anon, authenticated;

create index if not exists ocorrencias_resolved_at_idx
  on public.ocorrencias (resolved_at)
  where status = 'resolved';

grant delete on public.ocorrencias to authenticated;

drop policy if exists "Users delete own non-demo reports"
  on public.ocorrencias;
create policy "Users delete own non-demo reports"
  on public.ocorrencias
  for delete
  to authenticated
  using (
    (select auth.uid()) = user_id
    and is_demo = false
    and exists (
      select 1
      from public.profiles
      where id = (select auth.uid())
        and is_active
    )
  );

drop policy if exists "Admins delete any report"
  on public.ocorrencias;
create policy "Admins delete any report"
  on public.ocorrencias
  for delete
  to authenticated
  using ((select public.is_hyla_admin()));

drop policy if exists "Admins delete any occurrence image"
  on storage.objects;
create policy "Admins delete any occurrence image"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'occurrence-images'
    and (select public.is_hyla_admin())
  );

commit;
