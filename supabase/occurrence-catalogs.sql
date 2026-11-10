begin;

create table if not exists public.hyla_categories (
  id uuid primary key default gen_random_uuid(),
  created_by uuid references auth.users (id) on delete set null,
  name text not null check (char_length(trim(name)) between 2 and 50),
  description text not null default '' check (char_length(description) <= 200),
  created_at timestamptz not null default now()
);

create unique index if not exists hyla_categories_owner_name_idx
  on public.hyla_categories (
    coalesce(created_by, '00000000-0000-0000-0000-000000000000'::uuid),
    lower(name)
  );

create table if not exists public.hyla_places (
  id uuid primary key default gen_random_uuid(),
  created_by uuid references auth.users (id) on delete set null,
  neighborhood text not null check (char_length(trim(neighborhood)) between 2 and 60),
  city text not null check (char_length(trim(city)) between 2 and 100),
  state text not null check (state ~ '^[A-Z]{2}$'),
  latitude double precision check (latitude between -90 and 90),
  longitude double precision check (longitude between -180 and 180),
  created_at timestamptz not null default now(),
  check ((latitude is null) = (longitude is null))
);

create unique index if not exists hyla_places_owner_address_idx
  on public.hyla_places (
    coalesce(created_by, '00000000-0000-0000-0000-000000000000'::uuid),
    lower(neighborhood),
    lower(city),
    state
  );

alter table public.hyla_categories enable row level security;
alter table public.hyla_places enable row level security;

revoke all on public.hyla_categories, public.hyla_places from anon, authenticated;
grant select on public.hyla_categories, public.hyla_places to anon, authenticated;
grant insert, update, delete on public.hyla_categories, public.hyla_places to authenticated;

drop policy if exists "HYLA categories are publicly readable" on public.hyla_categories;
create policy "HYLA categories are publicly readable"
  on public.hyla_categories for select to anon, authenticated
  using (true);

drop policy if exists "Active users create own HYLA categories" on public.hyla_categories;
create policy "Active users create own HYLA categories"
  on public.hyla_categories for insert to authenticated
  with check (
    (
      created_by = (select auth.uid())
      or (created_by is null and (select public.is_hyla_admin()))
    )
    and exists (
      select 1 from public.profiles
      where id = (select auth.uid()) and is_active
    )
  );

drop policy if exists "Owners or admins update HYLA categories" on public.hyla_categories;
create policy "Owners or admins update HYLA categories"
  on public.hyla_categories for update to authenticated
  using (
    (
      created_by = (select auth.uid())
      and exists (
        select 1 from public.profiles
        where id = (select auth.uid()) and is_active
      )
    )
    or (select public.is_hyla_admin())
  )
  with check (
    (
      created_by = (select auth.uid())
      and exists (
        select 1 from public.profiles
        where id = (select auth.uid()) and is_active
      )
    )
    or (select public.is_hyla_admin())
  );

drop policy if exists "Owners or admins delete HYLA categories" on public.hyla_categories;
create policy "Owners or admins delete HYLA categories"
  on public.hyla_categories for delete to authenticated
  using (
    (
      created_by = (select auth.uid())
      and exists (
        select 1 from public.profiles
        where id = (select auth.uid()) and is_active
      )
    )
    or (select public.is_hyla_admin())
  );

drop policy if exists "HYLA places are publicly readable" on public.hyla_places;
create policy "HYLA places are publicly readable"
  on public.hyla_places for select to anon, authenticated
  using (true);

drop policy if exists "Active users create own HYLA places" on public.hyla_places;
create policy "Active users create own HYLA places"
  on public.hyla_places for insert to authenticated
  with check (
    (
      created_by = (select auth.uid())
      or (created_by is null and (select public.is_hyla_admin()))
    )
    and exists (
      select 1 from public.profiles
      where id = (select auth.uid()) and is_active
    )
  );

drop policy if exists "Owners or admins update HYLA places" on public.hyla_places;
create policy "Owners or admins update HYLA places"
  on public.hyla_places for update to authenticated
  using (
    (
      created_by = (select auth.uid())
      and exists (
        select 1 from public.profiles
        where id = (select auth.uid()) and is_active
      )
    )
    or (select public.is_hyla_admin())
  )
  with check (
    (
      created_by = (select auth.uid())
      and exists (
        select 1 from public.profiles
        where id = (select auth.uid()) and is_active
      )
    )
    or (select public.is_hyla_admin())
  );

drop policy if exists "Owners or admins delete HYLA places" on public.hyla_places;
create policy "Owners or admins delete HYLA places"
  on public.hyla_places for delete to authenticated
  using (
    (
      created_by = (select auth.uid())
      and exists (
        select 1 from public.profiles
        where id = (select auth.uid()) and is_active
      )
    )
    or (select public.is_hyla_admin())
  );

insert into public.hyla_categories (name, description)
values
  ('Buracos', 'Buracos, rachaduras e danos no pavimento.'),
  ('Lixo', 'Coleta, descarte irregular e estruturas de lixo.'),
  ('Iluminação', 'Postes apagados ou com iluminação danificada.'),
  ('Árvores', 'Árvores caídas, galhos ou necessidade de poda.'),
  ('Sinalização', 'Placas, semáforos e sinalização viária.'),
  ('Outros', 'Outros problemas e necessidades urbanas.')
on conflict do nothing;

insert into public.hyla_categories (name)
select distinct trim(category)
from public.ocorrencias
where nullif(trim(category), '') is not null
on conflict do nothing;

insert into public.hyla_places (neighborhood, city, state, latitude, longitude)
select
  trim(neighborhood),
  trim(city),
  upper(trim(state)),
  avg(latitude) filter (where latitude is not null and longitude is not null),
  avg(longitude) filter (where latitude is not null and longitude is not null)
from public.ocorrencias
where nullif(trim(neighborhood), '') is not null
  and nullif(trim(city), '') is not null
  and state ~ '^[A-Za-z]{2}$'
group by lower(trim(neighborhood)), lower(trim(city)), upper(trim(state)),
         trim(neighborhood), trim(city), upper(trim(state))
on conflict do nothing;

insert into public.hyla_places (neighborhood, city, state, latitude, longitude)
values
  ('Centro', 'Itu', 'SP', -23.2645, -47.2992),
  ('Centro', 'Campinas', 'SP', -22.9056, -47.0608),
  ('Boa Viagem', 'Recife', 'PE', -8.1190, -34.9010),
  ('Centro', 'Curitiba', 'PR', -25.4284, -49.2733),
  ('Asa Norte', 'Brasília', 'DF', -15.7600, -47.8825),
  ('Barra', 'Salvador', 'BA', -13.0100, -38.5320)
on conflict do nothing;

alter table public.ocorrencias
  add column if not exists category_id uuid references public.hyla_categories (id) on delete restrict,
  add column if not exists place_id uuid references public.hyla_places (id) on delete restrict;

update public.ocorrencias as report
set category_id = category.id
from public.hyla_categories as category
where report.category_id is null
  and lower(trim(report.category)) = lower(category.name);

update public.ocorrencias as report
set place_id = place.id
from public.hyla_places as place
where report.place_id is null
  and lower(trim(report.neighborhood)) = lower(place.neighborhood)
  and lower(trim(report.city)) = lower(place.city)
  and upper(trim(report.state)) = place.state;

create index if not exists ocorrencias_category_id_idx
  on public.ocorrencias (category_id);
create index if not exists ocorrencias_place_id_idx
  on public.ocorrencias (place_id);

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
    and category_id is not null
    and place_id is not null
    and exists (
      select 1
      from public.profiles
      where id = (select auth.uid())
        and is_active
    )
  );

revoke update on public.ocorrencias from anon, authenticated;
grant update (
  title,
  description,
  category,
  category_id,
  place_id,
  neighborhood,
  city,
  state,
  latitude,
  longitude,
  image_url
) on public.ocorrencias to authenticated;

drop policy if exists "Users or admins update reports"
  on public.ocorrencias;
create policy "Users or admins update reports"
  on public.ocorrencias
  for update
  to authenticated
  using (
    (
      (select auth.uid()) = user_id
      and is_demo = false
      and exists (
        select 1
        from public.profiles
        where id = (select auth.uid())
          and is_active
      )
    )
    or (select public.is_hyla_admin())
  )
  with check (
    (
      (select auth.uid()) = user_id
      and is_demo = false
      and exists (
        select 1
        from public.profiles
        where id = (select auth.uid())
          and is_active
      )
    )
    or (select public.is_hyla_admin())
  );

drop policy if exists "Users upload own occurrence images"
  on storage.objects;
create policy "Users upload own occurrence images"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'occurrence-images'
    and (
      (storage.foldername(name))[1] = (select auth.uid())::text
      or (select public.is_hyla_admin())
    )
  );

commit;
