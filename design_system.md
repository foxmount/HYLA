# Design System - Cidade em Foco

## Paleta de Cores

### Cores Primárias
- **Primary 500**: `#2563EB` (Blue 600) - Cor principal da marca, botões primários, links
- **Primary 600**: `#1D4ED8` (Blue 700) - Hover de botões primários
- **Primary 100**: `#DBEAFE` (Blue 100) - Fundos de cards, badges informativos

### Cores de Status
- **Success**: `#16A34A` (Green 600) - Status "Resolvido", confirmações
- **Success Light**: `#DCFCE7` (Green 100) - Background de badges de sucesso
- **Warning**: `#F59E0B` (Amber 500) - Status "Em Andamento", alertas
- **Warning Light**: `#FEF3C7` (Amber 100) - Background de badges de aviso
- **Danger**: `#DC2626` (Red 600) - Status "Pendente", ações destrutivas, erros
- **Danger Light**: `#FEE2E2` (Red 100) - Background de badges de perigo

### Cores Neutras
- **Gray 50**: `#F9FAFB` - Background principal da página
- **Gray 100**: `#F3F4F6` - Background de cards, inputs
- **Gray 200**: `#E5E7EB` - Bordas, divisores
- **Gray 300**: `#D1D5DB` - Bordas de inputs focados, placeholders
- **Gray 500**: `#9CA3AF` - Textos secundários, ícones desabilitados
- **Gray 700**: `#374151` - Textos principais
- **Gray 900**: `#111827` - Títulos, textos de alta importância

### Cores de Categoria (para ocorrências)
- **Buracos**: `#EF4444` (Red 500)
- **Lixo**: `#F97316` (Orange 500)
- **Iluminação**: `#FBBF24` (Amber 400)
- **Árvores**: `#22C55E` (Green 500)
- **Sinalização**: `#3B82F6` (Blue 500)
- **Outros**: `#8B5CF6` (Violet 500)

## Tipografia

### Fonte Principal
- **Font Family**: `Inter`, `system-ui`, `-apple-system`, `sans-serif`
- **Import**: `<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">`

### Escala Tipográfica
| Elemento | Tamanho | Peso | Line Height | Uso |
|----------|---------|------|-------------|-----|
| Display | 3rem (48px) | 700 | 1.1 | Hero principal |
| H1 | 2.25rem (36px) | 700 | 1.2 | Títulos de página |
| H2 | 1.875rem (30px) | 600 | 1.3 | Seções principais |
| H3 | 1.5rem (24px) | 600 | 1.4 | Subseções, cards |
| Body LG | 1.125rem (18px) | 400 | 1.6 | Textos de destaque |
| Body | 1rem (16px) | 400 | 1.5 | Textos padrão |
| Body SM | 0.875rem (14px) | 400 | 1.5 | Labels, ajuda |
| Caption | 0.75rem (12px) | 500 | 1.4 | Badges, timestamps |

## Espaçamentos

### Escala Base (4px)
- **xs**: 4px (0.25rem)
- **sm**: 8px (0.5rem)
- **md**: 16px (1rem)
- **lg**: 24px (1.5rem)
- **xl**: 32px (2rem)
- **2xl**: 48px (3rem)
- **3xl**: 64px (4rem)

### Aplicação
- **Container max-width**: 1280px (xl)
- **Padding container**: 16px mobile, 24px tablet, 32px desktop
- **Gap entre seções**: 32px (2rem)
- **Gap entre cards**: 16px (1rem)
- **Padding interno cards**: 24px (1.5rem)

## Border Radius
- **sm**: 4px (inputs, badges)
- **md**: 8px (botões, cards)
- **lg**: 12px (modais, dropdowns)
- **xl**: 16px (containers principais)
- **full**: 9999px (avatares, pills)

## Sombras
- **sm**: `0 1px 2px 0 rgb(0 0 0 / 0.05)` - Cards sutis
- **md**: `0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)` - Cards padrão
- **lg**: `0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)` - Modais, dropdowns
- **xl**: `0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)` - Overlays

## Componentes

### Botões
```css
/* Base */
.btn {
  @apply inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-md font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed;
}

/* Variantes */
.btn-primary { @apply bg-primary-500 text-white hover:bg-primary-600 focus:ring-primary-500; }
.btn-secondary { @apply bg-gray-100 text-gray-700 hover:bg-gray-200 focus:ring-gray-500; }
.btn-danger { @apply bg-danger text-white hover:bg-red-700 focus:ring-danger; }
.btn-ghost { @apply bg-transparent text-gray-600 hover:bg-gray-100 focus:ring-gray-500; }
.btn-outline { @apply border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 focus:ring-primary-500; }

/* Tamanhos */
.btn-sm { @apply px-3 py-1.5 text-sm; }
.btn-md { @apply px-4 py-2.5 text-base; }
.btn-lg { @apply px-6 py-3 text-lg; }
```

### Inputs
```css
.input {
  @apply w-full px-3 py-2.5 border border-gray-300 rounded-md bg-white text-gray-900 placeholder-gray-400 transition-colors;
  @apply focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent;
  @apply disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed;
}

.input-error {
  @apply border-danger focus:ring-danger;
}

.label {
  @apply block text-sm font-medium text-gray-700 mb-1.5;
}

.help-text {
  @apply mt-1.5 text-sm text-gray-500;
}

.error-text {
  @apply mt-1.5 text-sm text-danger;
}
```

### Cards
```css
.card {
  @apply bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden transition-shadow hover:shadow-md;
}

.card-header {
  @apply px-6 py-4 border-b border-gray-200 bg-gray-50;
}

.card-body {
  @apply p-6;
}

.card-footer {
  @apply px-6 py-4 border-t border-gray-200 bg-gray-50 flex items-center justify-end gap-3;
}
```

### Badges (Status/Categoria)
```css
.badge {
  @apply inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium;
}

.badge-pending { @apply bg-danger-light text-danger; }
.badge-in-progress { @apply bg-warning-light text-warning; }
.badge-resolved { @apply bg-success-light text-success; }

.badge-category { @apply bg-gray-100 text-gray-700; }
```

### Modais
```css
.modal-overlay {
  @apply fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50;
}

.modal {
  @apply bg-white rounded-xl shadow-xl max-h-[90vh] overflow-y-auto w-full max-w-md;
}

.modal-header {
  @apply px-6 py-4 border-b border-gray-200 flex items-center justify-between;
}

.modal-body {
  @apply p-6;
}

.modal-footer {
  @apply px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-end gap-3;
}
```

### Tabelas
```css
.table {
  @apply w-full text-sm text-left;
}

.table th {
  @apply px-4 py-3 font-medium text-gray-500 uppercase tracking-wider bg-gray-50 border-b border-gray-200;
}

.table td {
  @apply px-4 py-3 border-b border-gray-100 text-gray-900;
}

.table tbody tr {
  @apply hover:bg-gray-50 transition-colors;
}
```

## Ícones
- **Biblioteca**: Lucide Icons (via CDN)
- **Tamanho padrão**: 20px (1.25rem)
- **Tamanho pequeno**: 16px (1rem)
- **Tamanho grande**: 24px (1.5rem)

## Breakpoints Responsivos
- **Mobile**: < 640px
- **Tablet**: 640px - 1023px
- **Desktop**: ≥ 1024px

## Animações
- **Transição padrão**: `150ms ease-out`
- **Hover/Active**: `100ms ease-out`
- **Modais**: `200ms ease-out` (scale + fade)
- **Toasts**: `300ms ease-out` (slide + fade)

## Acessibilidade
- Contraste mínimo 4.5:1 para textos
- Focus visible em todos elementos interativos
- ARIA labels em botões apenas com ícones
- Semântica HTML5 correta
- Navegação por teclado funcional

## Painel Operacional

O painel (`dashboard.html`) usa uma composição própria, inspirada em ferramentas de monitoramento:

- **Canvas:** mapa interativo ocupa o espaço principal da tela; navegação lateral estreita mantém Dashboard, Mapa e Ocorrências acessíveis.
- **Navegação:** barra lateral de ícones com rótulos acessíveis e destaque amarelo-neon para a página ativa.
- **Tema do painel:** fundo `#0A0C0C`, superfícies `#111414` e `#171A19`, divisores `#272C29`, texto `#F0F2ED` e acento `#D7FF00`.
- **Mapa:** Leaflet com tiles do OpenStreetMap, atribuição dos provedores sempre visível, zoom, arraste e filtros por status e categoria.
- **Responsividade:** a barra lateral permanece compacta; filtros do mapa reorganizam-se em linhas menores em telas estreitas.

Esta paleta escura e o acento neon são específicos do painel. A tela de autenticação pode continuar usando a paleta azul principal definida acima.