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
  image_url,
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
  demo.image_url,
  true,
  now() - demo.age
from (
  values
    ('ana.souza@hyla.example.com', 'Buraco na Rua Floriano Peixoto', 'O asfalto cedeu perto da praça e dificulta a passagem de bicicletas e veículos.', 'Buracos', 'Centro', 'Itu', 'SP', 'pending', -23.2645::double precision, -47.2992::double precision, 'https://foxmount.github.io/HYLA/assets/demo-occurrences/pavement.svg', interval '2 hours'),
    ('bruno.lima@hyla.example.com', 'Lixeira danificada na Praça Carlos Gomes', 'A estrutura está solta e parte dos resíduos acaba ficando ao lado da lixeira.', 'Lixo', 'Centro', 'Campinas', 'SP', 'progress', -22.9056::double precision, -47.0608::double precision, 'https://foxmount.github.io/HYLA/assets/demo-occurrences/trash.svg', interval '1 day'),
    ('carla.mendes@hyla.example.com', 'Iluminação apagada na Avenida Boa Viagem', 'O trecho está sem iluminação à noite, próximo ao cruzamento com a Rua dos Navegantes.', 'Iluminação', 'Boa Viagem', 'Recife', 'PE', 'resolved', -8.1190::double precision, -34.9010::double precision, 'https://foxmount.github.io/HYLA/assets/demo-occurrences/lighting.svg', interval '3 days'),
    ('ana.souza@hyla.example.com', 'Calçada obstruída na Rua XV de Novembro', 'Um objeto deixado na calçada reduz a passagem e dificulta a circulação de pedestres.', 'Outros', 'Centro', 'Curitiba', 'PR', 'pending', -25.4284::double precision, -49.2733::double precision, 'https://foxmount.github.io/HYLA/assets/demo-occurrences/sidewalk.svg', interval '5 hours'),
    ('bruno.lima@hyla.example.com', 'Árvore caída na Asa Norte', 'Galhos de uma árvore caída ocupam parte da calçada após a chuva.', 'Árvores', 'Asa Norte', 'Brasília', 'DF', 'progress', -15.7600::double precision, -47.8825::double precision, 'https://foxmount.github.io/HYLA/assets/demo-occurrences/tree.svg', interval '2 days'),
    ('carla.mendes@hyla.example.com', 'Placa danificada na Avenida Oceânica', 'A placa está inclinada e com a sinalização parcialmente comprometida.', 'Sinalização', 'Barra', 'Salvador', 'BA', 'resolved', -13.0100::double precision, -38.5320::double precision, 'https://foxmount.github.io/HYLA/assets/demo-occurrences/sign.svg', interval '4 days')
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
  image_url,
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
