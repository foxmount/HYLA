alter table public.ocorrencias
  add column if not exists city text,
  add column if not exists state text;

update public.ocorrencias
set city = coalesce(nullif(btrim(city), ''), 'Itu'),
    state = coalesce(nullif(upper(btrim(state)), ''), 'SP');

alter table public.ocorrencias
  alter column city set default 'Itu',
  alter column city set not null,
  alter column state set default 'SP',
  alter column state set not null;

create index if not exists ocorrencias_state_city_idx
  on public.ocorrencias (state, city);
