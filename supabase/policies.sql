alter table public.ocorrencias enable row level security;

drop policy if exists "Ocorrências visíveis publicamente"
  on public.ocorrencias;
create policy "Ocorrências visíveis publicamente"
  on public.ocorrencias
  for select
  to anon, authenticated
  using (true);

drop policy if exists "Usuários autenticados criam seus relatos"
  on public.ocorrencias;

create policy "Usuários autenticados criam seus relatos"
  on public.ocorrencias
  for insert
  to authenticated
  with check (
    (select auth.uid()) = user_id
    and status = 'pending'
    and is_demo = false
    and exists (
      select 1
      from public.profiles
      where id = (select auth.uid())
        and is_active
    )
  );
