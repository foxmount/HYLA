create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role text not null default 'user' check (role in ('user', 'admin')),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.profiles
  add column if not exists is_active boolean not null default true;

alter table public.profiles enable row level security;
revoke all on public.profiles from anon, authenticated;
grant select on public.profiles to authenticated;

insert into public.profiles (id)
select id
from auth.users
on conflict (id) do nothing;

create or replace function public.is_hyla_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles
    where id = (select auth.uid())
      and role = 'admin'
      and is_active
  );
$$;

revoke all on function public.is_hyla_admin() from public, anon;
grant execute on function public.is_hyla_admin() to authenticated;

drop policy if exists "Perfis visíveis ao próprio usuário e admins"
  on public.profiles;
create policy "Perfis visíveis ao próprio usuário e admins"
  on public.profiles
  for select
  to authenticated
  using ((select auth.uid()) = id or (select public.is_hyla_admin()));

drop trigger if exists on_auth_user_created_hyla_profile
  on auth.users;

create or replace function public.create_hyla_profile()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id)
  values (new.id)
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created_hyla_profile
  after insert on auth.users
  for each row execute function public.create_hyla_profile();

revoke all on function public.create_hyla_profile() from public, anon, authenticated;

alter table public.ocorrencias
  add column if not exists is_demo boolean not null default false;

alter table public.ocorrencias enable row level security;
revoke insert, update, delete, truncate, references, trigger
  on public.ocorrencias from anon, authenticated;
grant select on public.ocorrencias to anon, authenticated;
grant insert on public.ocorrencias to authenticated;

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
