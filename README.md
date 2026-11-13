# HYLA — Cidade em Foco

## Sobre o projeto

O HYLA — Cidade em Foco é uma aplicação web acadêmica desenvolvida para a disciplina de Programação para a Internet da FATEC Itu.

### Problema identificado

Informações sobre problemas urbanos do cotidiano podem ficar espalhadas em conversas e canais diferentes, dificultando que moradores acompanhem os relatos e entendam quais situações já foram atendidas.

### Objetivo

Oferecer um espaço comunitário para registrar ocorrências urbanas, consultar relatos por região e categoria e acompanhar seu status em um mapa e em painéis de análise.

### Integrantes

- Felipe Cunha Orejana
- Pedro Henrique Jacomassi

### Aplicação publicada

[Acessar o HYLA no GitHub Pages](https://foxmount.github.io/HYLA/)

## Tecnologias

- HTML5, CSS3 e JavaScript Vanilla
- Tailwind CSS via CDN
- Supabase Authentication, banco de dados PostgreSQL e Row Level Security (RLS)
- SweetAlert2 para confirmações e mensagens
- Lucide Icons
- Leaflet e tiles do OpenStreetMap
- Git e GitHub para versionamento; GitHub Pages para publicação

## Organização do repositório

```text
HYLA/
├── assets/
│   ├── demo-occurrences/   # Ilustrações dos relatos fictícios
│   └── hyla-mark.svg       # Marca do projeto
├── css/
│   ├── auth.css            # Estilos da tela de acesso
│   └── dashboard.css       # Estilos do painel e das telas internas
├── js/
│   ├── auth.js             # Cadastro, login e recuperação de acesso
│   ├── dashboard.js        # Painel, ocorrências, categorias e locais
│   └── supabase.js         # Inicialização do cliente Supabase
├── supabase/
│   ├── functions/          # Edge Functions, incluindo administração
│   └── *.sql               # Scripts de estrutura, políticas e dados
├── index.html              # Entrada, login e cadastro
├── dashboard.html          # Aplicação após autenticação
├── README.md
└── design_system.md
```

## Principais funcionalidades

- Cadastro de conta, login, logout e recuperação de senha com Supabase Authentication.
- Controle de acesso a páginas e ações restritas; políticas RLS protegem os dados.
- Três cadastros integrados com persistência no Supabase: ocorrências, categorias e locais.
- Operações de inclusão, consulta, edição e exclusão, respeitando permissões e vínculos entre registros.
- Inclusão opcional de foto em ocorrências, armazenada no Supabase Storage.
- Mapa comunitário, busca e filtros por status, categoria e localização.
- Visão geral com indicadores e análises de ocorrências por status, categoria e município.
- Layout responsivo e mensagens de confirmação, sucesso e erro.

## Executar localmente

1. Configure o projeto Supabase e execute os scripts SQL indicados na seção **Estado atual**.
2. Confira a configuração do cliente em `js/supabase.js`.
3. Na raiz do projeto, inicie um servidor local. Por exemplo:

```powershell
python -m http.server 5500
```

4. Acesse <http://127.0.0.1:5500> e entre ou crie uma conta.
5. Para autenticação local, permita `http://127.0.0.1:5500/**` e `http://localhost:5500/**` em **Authentication → URL Configuration** no Supabase.

## Estado atual

Login, cadastro e operações de dados usam Supabase. A aplicação possui três cadastros relacionados: ocorrências, categorias e locais. Eles oferecem inclusão, consulta, edição e exclusão de acordo com as permissões; categorias e locais vinculados a ocorrências não podem ser excluídos, preservando o histórico. As ocorrências se relacionam com categorias e locais por chaves estrangeiras. A chave publishable fica em `js/supabase.js` e é apropriada para uso no navegador quando as políticas RLS estão ativas. Nunca coloque uma chave `secret`/`service_role` ou a senha do banco no frontend.

Antes de testar, execute `supabase/national-coverage.sql`, `supabase/user-administration.sql`, `supabase/occurrence-images.sql`, `supabase/occurrence-lifecycle.sql`, `supabase/occurrence-catalogs.sql` e, por último, `supabase/occurrence-address.sql`, nessa ordem, no SQL Editor do Supabase. A administração configura os perfis e as políticas; a migração de imagens cria o bucket público e atualiza os exemplos; o ciclo de vida configura arquivamento e exclusão autorizada; os cadastros criam categorias e locais; e a última migração acrescenta campos de endereço sem apagar os dados antigos e atualiza a política para novos relatos. Os relatos, endereços, coordenadas e imagens ficam públicos; não inclua dados pessoais nem localização privada.

Configure também a URL do GitHub Pages em **Authentication → URL Configuration**. Para recuperação de acesso, permita a URL `https://foxmount.github.io/HYLA/index.html?flow=recovery` (e a URL local correspondente).

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

Depois de publicar a função e entrar com a conta root, abra **Administração → Preparar demonstração**. O HYLA cria três contas fictícias (`Ana Souza`, `Bruno Lima` e `Carla Mendes`) e seis ocorrências com status, categorias e cidades diferentes. As contas usam endereços não destinados a receber e-mail (`@hyla.example.com`), são confirmadas pelo servidor e não precisam de caixa postal. Senhas fortes e aleatórias aparecem somente na confirmação; salve-as antes de fechar. Ao preparar a demonstração novamente, as senhas são redefinidas e exibidas outra vez. Os relatos têm títulos e descrições naturais, ilustrações próprias e um selo discreto “Exemplo” na lista.

No formulário, usuários podem anexar uma foto JPG, PNG ou WebP de até 5 MB. A imagem é armazenada no bucket público `occurrence-images`, associada ao relato e exibida na lista e no detalhe do marcador. A tela informa que o conteúdo enviado ficará visível publicamente.

Na área **Categorias**, usuários podem manter categorias próprias; a conta root pode manter as categorias compartilhadas. Na área **Locais**, cadastre CEP, rua, número, bairro, município e UF; CEP, número e complemento podem ser opcionais quando não se aplicarem. O formulário de ocorrência permite digitar o endereço ou preencher os campos com um local salvo. O CEP pode preencher rua, bairro, cidade e UF por consulta ao ViaCEP. Para posicionar um relato, busque o endereço no Nominatim/OpenStreetMap e escolha o resultado correto, ou use o GPS somente se estiver no local da ocorrência. A busca é iniciada pelo usuário, não usa chave de API e envia o endereço digitado ao serviço externo; o CEP também é enviado ao ViaCEP quando consultado. Os endereços e coordenadas dos relatos são públicos. Categorias e locais relacionados a ocorrências não podem ser excluídos; edite-os ou mantenha-os para preservar o histórico. O autor pode editar seus próprios relatos, e a conta root pode editar qualquer relato.

Relatos resolvidos são arquivados depois de 30 dias a partir da resolução, permanecem no banco e podem ser incluídos na lista ou no mapa pelo controle **Incluir arquivadas**. Cada usuário pode excluir permanentemente os próprios relatos; administradores podem excluir qualquer relato. A interface pede confirmação e remove também a imagem associada quando possível.

Para limpar os exemplos após a apresentação, execute `supabase/remove-demo-reports.sql` e remova as três contas em **Authentication → Users**. Isso não apaga contas reais nem relatos de usuários.

O mapa cobre o Brasil e começa centralizado no país. Os relatos incluem endereço, cidade e UF; o mapa e a lista permitem filtrar por município, estado, status e categoria, além de pesquisar bairro, cidade, UF ou título. No dashboard, os filtros de estado, cidade e categoria atualizam juntos os indicadores, gráficos e atividade recente; os gráficos apresentam participação percentual e contagens para facilitar a leitura. Novos relatos precisam de coordenadas confirmadas por geocodificação ou GPS para aparecer no mapa.

O menu do perfil mostra a conta autenticada e oferece a ação de sair. A central de notificações indica claramente que notificações automáticas ainda não estão habilitadas.

## Mapa

O mapa usa Leaflet e tiles do OpenStreetMap sem chave de API. A consulta de CEP usa o serviço ViaCEP, e a busca manual de endereço usa a API de geocodificação Nominatim do OpenStreetMap; ambos requerem internet. A busca Nominatim é acionada pelo usuário e deve permanecer dentro do limite de uso público (máximo de uma solicitação por segundo para a aplicação). Mantenha os créditos exibidos e respeite a [política de uso dos tiles](https://operations.osmfoundation.org/policies/tiles/) e a [política do Nominatim](https://operations.osmfoundation.org/policies/nominatim/).
