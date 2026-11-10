do $$
declare
  demo_user_count integer;
begin
  select count(distinct id)
  into demo_user_count
  from auth.users
  where lower(email) in (
    'ana.souza@hyla.example.com',
    'bruno.lima@hyla.example.com',
    'carla.mendes@hyla.example.com'
  );

  if demo_user_count <> 3 then
    raise exception 'Crie e confirme as três contas de demonstração antes de inserir os relatos.';
  end if;
end;
$$;

insert into public.ocorrencias (
  user_id,
  title,
  description,
  category,
  neighborhood,
  city,
  state,
  status,
  latitude,
  longitude,
  is_demo,
  created_at
)
select
  users.id,
  demo.title,
  demo.description,
  demo.category,
  demo.neighborhood,
  demo.city,
  demo.state,
  demo.status,
  demo.latitude,
  demo.longitude,
  true,
  now() - demo.age
from (
  values
    ('ana.souza@hyla.example.com', 'Buraco próximo à praça', 'Demonstração: pavimento danificado na via.', 'Buracos', 'Centro', 'Itu', 'SP', 'pending', -23.2645::double precision, -47.2992::double precision, interval '2 hours'),
    ('bruno.lima@hyla.example.com', 'Lixeira pública danificada', 'Demonstração: lixeira precisa de manutenção.', 'Lixo', 'Vila Nova', 'Campinas', 'SP', 'progress', -22.9056::double precision, -47.0608::double precision, interval '1 day'),
    ('carla.mendes@hyla.example.com', 'Poste de iluminação apagado', 'Demonstração: ponto de luz sem funcionamento.', 'Iluminação', 'Boa Viagem', 'Recife', 'PE', 'resolved', -8.1190::double precision, -34.9010::double precision, interval '3 days'),
    ('ana.souza@hyla.example.com', 'Calçada com acessibilidade comprometida', 'Demonstração: obstáculo na passagem de pedestres.', 'Outros', 'Centro', 'Curitiba', 'PR', 'pending', -25.4284::double precision, -49.2733::double precision, interval '5 hours'),
    ('bruno.lima@hyla.example.com', 'Árvore caída após chuva', 'Demonstração: galhos bloqueiam parte da calçada.', 'Árvores', 'Asa Norte', 'Brasília', 'DF', 'progress', -15.7600::double precision, -47.8825::double precision, interval '2 days'),
    ('carla.mendes@hyla.example.com', 'Placa de trânsito danificada', 'Demonstração: sinalização precisa de reparo.', 'Sinalização', 'Barra', 'Salvador', 'BA', 'resolved', -13.0100::double precision, -38.5320::double precision, interval '4 days')
) as demo (
  email,
  title,
  description,
  category,
  neighborhood,
  city,
  state,
  status,
  latitude,
  longitude,
  age
)
join auth.users as users
  on lower(users.email) = demo.email
where not exists (
  select 1
  from public.ocorrencias as existing
  where existing.is_demo = true
    and existing.title = demo.title
);
