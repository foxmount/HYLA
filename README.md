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

Antes de testar, execute `supabase/national-coverage.sql` e depois `supabase/user-administration.sql` no SQL Editor do Supabase. A segunda migração cria os perfis e o papel administrativo, configura as políticas de acesso e adiciona `is_demo` para identificar relatos temporários. Os relatos são públicos; não inclua dados pessoais nem localização privada.

Para autenticação local, adicione `http://127.0.0.1:5500/**` e `http://localhost:5500/**` à lista de URLs de redirecionamento em **Authentication → URL Configuration**. Configure também a URL do GitHub Pages ao publicar.

### Administração e apresentação

Crie primeiro a conta root em **Authentication → Users**. Depois das migrações, promova somente essa conta no SQL Editor, substituindo o e-mail pelo da conta:

```sql
update public.profiles as profile
set role = 'admin'
from auth.users as auth_user
where profile.id = auth_user.id
  and lower(auth_user.email) = lower('EMAIL_DA_CONTA_ROOT');
```

A área de administração só aparece para o perfil `admin`. A função segura `supabase/functions/admin-users` verifica o token e o perfil no servidor antes de listar contas, suspender/reativar usuários, enviar links de recuperação ou preparar os dados da apresentação. Ela não lê nem revela senhas pessoais. Nunca coloque a chave `service_role` no site. Para ativar a função, instale o Supabase CLI, autentique e vincule este projeto; depois publique-a:

```powershell
supabase login
supabase link --project-ref rnfdliedxxmjakcgkhfc
supabase functions deploy admin-users
```

O fluxo de recuperação requer que a URL `https://foxmount.github.io/HYLA/index.html?flow=recovery` (e a URL local correspondente) esteja permitida em **Authentication → URL Configuration**.

Depois de publicar a função e entrar com a conta root, abra **Administração → Preparar demonstração**. O HYLA cria três contas fictícias (`Ana Souza`, `Bruno Lima` e `Carla Mendes`) e seis ocorrências com status, categorias e cidades diferentes. As contas usam endereços não destinados a receber e-mail (`@hyla.example.com`), são confirmadas pelo servidor e não precisam de caixa postal. Senhas fortes e aleatórias aparecem somente na confirmação; salve-as antes de fechar. Ao preparar a demonstração novamente, as senhas são redefinidas e exibidas outra vez. Os relatos aparecem no mapa, nos filtros, nas listas e nas análises com o selo “Demonstração”.

Para limpar os exemplos após a apresentação, execute `supabase/remove-demo-reports.sql` e remova as três contas em **Authentication → Users**. Isso não apaga contas reais nem relatos de usuários.

O mapa cobre o Brasil e começa centralizado no país. Os relatos incluem cidade e UF; o mapa e a lista permitem filtrar por município, estado, status e categoria, além de pesquisar bairro, cidade, UF ou título. No dashboard, os filtros de estado, cidade e categoria atualizam juntos os indicadores, gráficos e atividade recente; os gráficos apresentam participação percentual e contagens para facilitar a leitura. A localização do navegador é opcional: relatos sem coordenadas aparecem nas listas, gráficos e filtros, mas não têm marcador no mapa.

O menu do perfil mostra a conta autenticada e oferece a ação de sair. A central de notificações indica claramente que notificações automáticas ainda não estão habilitadas.

## Mapa

O mapa usa Leaflet e tiles do OpenStreetMap sem chave de API. É necessária conexão com a internet para carregar o mapa. Mantenha os créditos exibidos e respeite a [política de uso dos tiles do OpenStreetMap](https://operations.osmfoundation.org/policies/tiles/).
