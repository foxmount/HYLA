begin;

alter table public.ocorrencias
  add column if not exists image_url text;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'occurrence-images',
  'occurrence-images',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Public can view occurrence images"
  on storage.objects;
create policy "Public can view occurrence images"
  on storage.objects
  for select
  to public
  using (bucket_id = 'occurrence-images');

drop policy if exists "Users upload own occurrence images"
  on storage.objects;
create policy "Users upload own occurrence images"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'occurrence-images'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "Users delete own occurrence images"
  on storage.objects;
create policy "Users delete own occurrence images"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'occurrence-images'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

update public.ocorrencias
set title = case title
      when '[DEMO] Buraco na Rua Floriano Peixoto' then 'Buraco na Rua Floriano Peixoto'
      when '[DEMO] Lixeira danificada na Praça Carlos Gomes' then 'Lixeira danificada na Praça Carlos Gomes'
      when '[DEMO] Iluminação apagada na Avenida Boa Viagem' then 'Iluminação apagada na Avenida Boa Viagem'
      when '[DEMO] Calçada obstruída na Rua XV de Novembro' then 'Calçada obstruída na Rua XV de Novembro'
      when '[DEMO] Árvore caída na Asa Norte' then 'Árvore caída na Asa Norte'
      when '[DEMO] Placa danificada na Avenida Oceânica' then 'Placa danificada na Avenida Oceânica'
      else title
    end,
    description = case title
      when '[DEMO] Buraco na Rua Floriano Peixoto' then 'O asfalto cedeu perto da praça e dificulta a passagem de bicicletas e veículos.'
      when '[DEMO] Lixeira danificada na Praça Carlos Gomes' then 'A estrutura está solta e parte dos resíduos acaba ficando ao lado da lixeira.'
      when '[DEMO] Iluminação apagada na Avenida Boa Viagem' then 'O trecho está sem iluminação à noite, próximo ao cruzamento com a Rua dos Navegantes.'
      when '[DEMO] Calçada obstruída na Rua XV de Novembro' then 'Um objeto deixado na calçada reduz a passagem e dificulta a circulação de pedestres.'
      when '[DEMO] Árvore caída na Asa Norte' then 'Galhos de uma árvore caída ocupam parte da calçada após a chuva.'
      when '[DEMO] Placa danificada na Avenida Oceânica' then 'A placa está inclinada e com a sinalização parcialmente comprometida.'
      else description
    end,
    is_demo = true,
    image_url = case category
      when 'Buracos' then 'https://foxmount.github.io/HYLA/assets/demo-occurrences/pavement.svg'
      when 'Lixo' then 'https://foxmount.github.io/HYLA/assets/demo-occurrences/trash.svg'
      when 'Iluminação' then 'https://foxmount.github.io/HYLA/assets/demo-occurrences/lighting.svg'
      when 'Outros' then 'https://foxmount.github.io/HYLA/assets/demo-occurrences/sidewalk.svg'
      when 'Árvores' then 'https://foxmount.github.io/HYLA/assets/demo-occurrences/tree.svg'
      when 'Sinalização' then 'https://foxmount.github.io/HYLA/assets/demo-occurrences/sign.svg'
      else image_url
    end
where title in (
  '[DEMO] Buraco na Rua Floriano Peixoto',
  '[DEMO] Lixeira danificada na Praça Carlos Gomes',
  '[DEMO] Iluminação apagada na Avenida Boa Viagem',
  '[DEMO] Calçada obstruída na Rua XV de Novembro',
  '[DEMO] Árvore caída na Asa Norte',
  '[DEMO] Placa danificada na Avenida Oceânica'
);

update public.ocorrencias
set title = case title
      when 'Buraco próximo à praça' then 'Buraco na Rua Floriano Peixoto'
      when 'Lixeira pública danificada' then 'Lixeira danificada na Praça Carlos Gomes'
      when 'Poste de iluminação apagado' then 'Iluminação apagada na Avenida Boa Viagem'
      when 'Calçada com acessibilidade comprometida' then 'Calçada obstruída na Rua XV de Novembro'
      when 'Árvore caída após chuva' then 'Árvore caída na Asa Norte'
      when 'Placa de trânsito danificada' then 'Placa danificada na Avenida Oceânica'
      else title
    end,
    description = case title
      when 'Buraco próximo à praça' then 'O asfalto cedeu perto da praça e dificulta a passagem de bicicletas e veículos.'
      when 'Lixeira pública danificada' then 'A estrutura está solta e parte dos resíduos acaba ficando ao lado da lixeira.'
      when 'Poste de iluminação apagado' then 'O trecho está sem iluminação à noite, próximo ao cruzamento com a Rua dos Navegantes.'
      when 'Calçada com acessibilidade comprometida' then 'Um objeto deixado na calçada reduz a passagem e dificulta a circulação de pedestres.'
      when 'Árvore caída após chuva' then 'Galhos de uma árvore caída ocupam parte da calçada após a chuva.'
      when 'Placa de trânsito danificada' then 'A placa está inclinada e com a sinalização parcialmente comprometida.'
      else regexp_replace(description, '^Demonstração:[[:space:]]*', '')
    end,
    image_url = case category
      when 'Buracos' then coalesce(image_url, 'https://foxmount.github.io/HYLA/assets/demo-occurrences/pavement.svg')
      when 'Lixo' then coalesce(image_url, 'https://foxmount.github.io/HYLA/assets/demo-occurrences/trash.svg')
      when 'Iluminação' then coalesce(image_url, 'https://foxmount.github.io/HYLA/assets/demo-occurrences/lighting.svg')
      when 'Outros' then coalesce(image_url, 'https://foxmount.github.io/HYLA/assets/demo-occurrences/sidewalk.svg')
      when 'Árvores' then coalesce(image_url, 'https://foxmount.github.io/HYLA/assets/demo-occurrences/tree.svg')
      when 'Sinalização' then coalesce(image_url, 'https://foxmount.github.io/HYLA/assets/demo-occurrences/sign.svg')
      else image_url
    end
where is_demo = true;

commit;
