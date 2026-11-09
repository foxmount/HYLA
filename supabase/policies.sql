drop policy if exists "Usuários autenticados criam seus relatos"
  on public.ocorrencias;

create policy "Usuários autenticados criam seus relatos"
  on public.ocorrencias
  for insert
  to authenticated
  with check (
    auth.uid() = user_id
    and status = 'pending'
  );
