# HYLA — Cidade em Foco

Projeto acadêmico da FATEC Itu para gestão urbana comunitária. O HYLA permite visualizar relatos de problemas urbanos e acompanhar ocorrências por categoria e status.

## Tecnologias

- HTML5, CSS3 e JavaScript Vanilla
- Tailwind CSS via CDN
- Leaflet e tiles do OpenStreetMap
- SweetAlert2 e Lucide Icons

## Executar localmente

Abra `index.html` com a extensão Live Server no VS Code. Para iniciar o servidor pela linha de comando na pasta do projeto:

```powershell
python -m http.server 5500
```

Depois, acesse <http://127.0.0.1:5500>.

## Estado atual

Login, cadastro e leitura/criação de ocorrências usam Supabase. A chave publishable fica em `js/supabase.js` e é apropriada para uso no navegador quando as políticas RLS estão ativas. Nunca coloque uma chave `secret`/`service_role` ou a senha do banco no frontend.

Antes de testar, aplique `supabase/policies.sql` no SQL Editor do Supabase para limitar a criação de relatos ao status inicial `pending`. A tabela permite leitura pública: relatos e coordenadas compartilhadas ficam visíveis a todos.

Para autenticação local, adicione `http://127.0.0.1:5500/**` e `http://localhost:5500/**` à lista de URLs de redirecionamento em **Authentication → URL Configuration**. Configure também a URL do GitHub Pages ao publicar.

O mapa usa coordenadas apenas quando a pessoa autoriza o compartilhamento de localização no formulário. Relatos sem coordenadas aparecem na lista, mas não têm marcador.

## Mapa

O mapa usa Leaflet e tiles do OpenStreetMap sem chave de API. É necessária conexão com a internet para carregar o mapa. Mantenha os créditos exibidos e respeite a [política de uso dos tiles do OpenStreetMap](https://operations.osmfoundation.org/policies/tiles/).
