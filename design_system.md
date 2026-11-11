# Design System — HYLA: Cidade em Foco

Este documento descreve as decisões visuais presentes na interface atual do HYLA. A tela de autenticação e o painel compartilham a identidade escura com acento verde-lima; cada área usa componentes adequados à sua finalidade.

## Identidade visual

- **Conceito:** gestão urbana comunitária, clareza de informação e participação dos moradores.
- **Tom visual:** interface escura e sóbria, com verde-lima para ações principais, foco e navegação ativa.
- **Marca:** `assets/hyla-mark.svg`.
- **Fonte:** Inter, com fontes de sistema como alternativas (`ui-sans-serif`, `system-ui`, `Segoe UI`).

## Cores

### Base compartilhada

| Uso | Cor |
|---|---|
| Fundo da autenticação | `#090B0A` |
| Fundo do painel | `#0A0C0C` |
| Superfície principal | `#111414` |
| Superfície elevada | `#171A19` |
| Bordas e divisores | `#272C29` |
| Texto principal | `#F0F2ED` |
| Texto secundário | `#929991` |
| Acento HYLA | `#D7FF00` |

O acento é usado com moderação em botões de ação, estados ativos, foco e detalhes gráficos. Fundos de acento usam transparência para preservar contraste e hierarquia.

### Estados das ocorrências

| Estado | Cor de referência | Aplicação |
|---|---|---|
| Pendente | `#E78B7A` | Indicadores e marcadores |
| Em andamento | `#D7FF00` | Indicadores, barras e marcadores |
| Resolvida | `#79B995` | Indicadores e marcadores |

As categorias possuem ícones e cores próprias nos cartões e marcadores. As cores também são acompanhadas por rótulos textuais, para não depender somente da percepção de cor.

## Tipografia

- **Família:** `Inter`, `ui-sans-serif`, `system-ui`, `-apple-system`, `BlinkMacSystemFont`, `Segoe UI`, sans-serif.
- **Títulos de página:** peso semibold, escala fluida com `clamp()`.
- **Títulos de painel e cartões:** semibold, com tamanho compacto para priorizar a leitura dos dados.
- **Texto de interface:** regular ou medium; rótulos e textos auxiliares usam tons secundários.
- **Números de indicadores:** numerais tabulares para facilitar a comparação.

O tamanho varia conforme o contexto: o painel operacional é mais compacto; a tela de autenticação usa títulos maiores e textos explicativos.

## Espaçamento e dimensões

- A interface usa uma escala baseada em múltiplos de aproximadamente 4 px, com gaps comuns de 4, 8, 10, 12, 16 e 24 px.
- O conteúdo principal é limitado a aproximadamente 1200 px e se adapta à largura disponível.
- As telas internas usam espaçamento fluido com `clamp()`; em dispositivos estreitos, o padding é reduzido.
- Formulários, cartões e painéis têm padding próprio para manter os campos legíveis sem sobrecarregar a tela.

## Componentes e interação

### Botões

- Ação principal: fundo verde-lima, texto escuro e estados de hover, foco e pressionado.
- Ação secundária: superfície escura com borda discreta.
- Ações destrutivas: destaque avermelhado e confirmação antes da exclusão.
- Controles desativados indicam visualmente que uma operação está em andamento.

### Campos e formulários

- Fundo escuro, borda visível e texto claro.
- Campos recebem foco destacado ao serem selecionados.
- Rótulos identificam os campos; textos auxiliares explicam formatos e dados opcionais.
- Validação nativa do navegador é complementada pelas regras do banco e pelo feedback da aplicação.

### Cartões, painéis e indicadores

- Superfícies escuras com bordas sutis, cantos arredondados e separadores consistentes.
- Indicadores usam ícone, nome, valor e contexto; as porcentagens complementam as contagens.
- Gráficos usam rótulos, valores e barras para mostrar a distribuição dos registros.

### Mensagens e feedback

- SweetAlert2 é usado para confirmações e mensagens de sucesso, aviso e erro.
- Durante ações assíncronas, botões são desativados quando aplicável; áreas de administração exibem estado de carregamento.
- Mensagens de erro não substituem o estado dos dados: falhas são apresentadas ao usuário.

### Ícones

- **Biblioteca:** Lucide Icons via CDN.
- Ícones de navegação, ações e status seguem o mesmo traço visual.
- Botões compostos exibem rótulo; controles somente com ícone possuem nome acessível.

## Responsividade

- O layout reorganiza filtros, indicadores, gráficos e cartões conforme a largura da tela.
- Em telas menores, a navegação lateral permanece compacta, os controles podem quebrar em novas linhas e os cartões passam a uma coluna.
- Formulários e diálogos limitam sua largura e permitem rolagem em telas baixas.
- A interface suporta uso por teclado com estados de foco visíveis.

## Arquivos relacionados

- `css/auth.css`: tema, formulário e layout da tela de acesso.
- `css/dashboard.css`: painel, responsividade, componentes e estados interativos.
- `index.html` e `dashboard.html`: estrutura semântica das telas.
