begin;

alter table public.hyla_places
  add column if not exists postal_code text,
  add column if not exists street text,
  add column if not exists street_number text,
  add column if not exists complement text;

alter table public.ocorrencias
  add column if not exists postal_code text,
  add column if not exists street text,
  add column if not exists street_number text,
  add column if not exists complement text;

alter table public.hyla_places
  drop constraint if exists hyla_places_postal_code_format_check,
  add constraint hyla_places_postal_code_format_check
    check (postal_code is null or postal_code ~ '^[0-9]{5}-?[0-9]{3}$'),
  drop constraint if exists hyla_places_street_length_check,
  add constraint hyla_places_street_length_check
    check (street is null or char_length(trim(street)) between 2 and 160),
  drop constraint if exists hyla_places_street_number_length_check,
  add constraint hyla_places_street_number_length_check
    check (street_number is null or char_length(trim(street_number)) between 1 and 20),
  drop constraint if exists hyla_places_complement_length_check,
  add constraint hyla_places_complement_length_check
    check (complement is null or char_length(trim(complement)) <= 100);

alter table public.ocorrencias
  drop constraint if exists ocorrencias_postal_code_format_check,
  add constraint ocorrencias_postal_code_format_check
    check (postal_code is null or postal_code ~ '^[0-9]{5}-?[0-9]{3}$'),
  drop constraint if exists ocorrencias_street_length_check,
  add constraint ocorrencias_street_length_check
    check (street is null or char_length(trim(street)) between 2 and 160),
  drop constraint if exists ocorrencias_street_number_length_check,
  add constraint ocorrencias_street_number_length_check
    check (street_number is null or char_length(trim(street_number)) between 1 and 20),
  drop constraint if exists ocorrencias_complement_length_check,
  add constraint ocorrencias_complement_length_check
    check (complement is null or char_length(trim(complement)) <= 100);

drop index if exists public.hyla_places_owner_address_idx;
create unique index if not exists hyla_places_owner_address_idx
  on public.hyla_places (
    coalesce(created_by, '00000000-0000-0000-0000-000000000000'::uuid),
    lower(neighborhood),
    lower(city),
    state,
    lower(coalesce(street, '')),
    lower(coalesce(street_number, '')),
    lower(coalesce(postal_code, ''))
  );

drop policy if exists "Active users create own HYLA places" on public.hyla_places;
create policy "Active users create own HYLA places"
  on public.hyla_places for insert to authenticated
  with check (
    (
      created_by = (select auth.uid())
      or (created_by is null and (select public.is_hyla_admin()))
    )
    and street is not null
    and char_length(trim(street)) between 2 and 160
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
      and street is not null
      and char_length(trim(street)) between 2 and 160
      and exists (
        select 1 from public.profiles
        where id = (select auth.uid()) and is_active
      )
    )
    or (
      (select public.is_hyla_admin())
      and street is not null
      and char_length(trim(street)) between 2 and 160
    )
  );

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
    and street is not null
    and char_length(trim(street)) between 2 and 160
    and char_length(trim(neighborhood)) between 2 and 60
    and char_length(trim(city)) between 2 and 100
    and state ~ '^[A-Z]{2}$'
    and latitude between -90 and 90
    and longitude between -180 and 180
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
  postal_code,
  street,
  street_number,
  complement,
  neighborhood,
  city,
  state,
  latitude,
  longitude,
  image_url
) on public.ocorrencias to authenticated;

commit;
