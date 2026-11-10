# HYLA — Cidade em Foco

Projeto acadêmico da FATEC Itu para gestão urbana comunitária. O HYLA permite visualizar relatos de problemas urbanos e acompanhar ocorrências por categoria, status e município em todo o Brasil.

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

Antes de testar, execute `supabase/national-coverage.sql` no SQL Editor do Supabase para adicionar cidade e UF às ocorrências existentes. Os relatos antigos serão mantidos e classificados como Itu - SP, que era o local inicial do painel. Aplique também `supabase/policies.sql` para limitar a criação de relatos ao status inicial `pending`. A tabela permite leitura pública: relatos e coordenadas compartilhadas ficam visíveis a todos.

Para autenticação local, adicione `http://127.0.0.1:5500/**` e `http://localhost:5500/**` à lista de URLs de redirecionamento em **Authentication → URL Configuration**. Configure também a URL do GitHub Pages ao publicar.

O mapa cobre o Brasil e começa centralizado no país. Os relatos incluem cidade e UF; o mapa e a lista permitem filtrar por município, estado, status e categoria, além de pesquisar bairro, cidade, UF ou título. No dashboard, os filtros de estado, cidade e categoria atualizam juntos os indicadores, gráficos e atividade recente; os gráficos apresentam participação percentual e contagens para facilitar a leitura. A localização do navegador é opcional: relatos sem coordenadas aparecem nas listas, gráficos e filtros, mas não têm marcador no mapa.

O menu do avatar mostra a conta autenticada e oferece a ação de sair. A central de notificações indica claramente que notificações automáticas ainda não estão habilitadas.

## Mapa

O mapa usa Leaflet e tiles do OpenStreetMap sem chave de API. É necessária conexão com a internet para carregar o mapa. Mantenha os créditos exibidos e respeite a [política de uso dos tiles do OpenStreetMap](https://operations.osmfoundation.org/policies/tiles/).
