# Design System — Zênite · Aluguel Outdoor

- **Status:** aceito
- **Versão:** 1.0
- **Data:** 2026-11-23
- **Dono:** UI/UX Designer (UX)
- **Implementação:** `frontend-developer` — somente utilitários Tailwind v4 (ADR 0004)

Este documento é a fonte única de identidade visual. Ele não contém lógica TypeScript nem CSS
de autoria: os únicos trechos de CSS são os tokens do `@theme`, que o FE cola na entrada do
Tailwind. Toda classe listada abaixo deve ser copiada **por extenso** para constantes tipadas
dentro do componente — o Tailwind não enxerga classes montadas por concatenação.

---

## 1. Princípios visuais

### 1.1 Outdoor

A marca vem da natureza: **verde floresta** como base, **pedra** como fundo quente e
**lima elétrico** como sinal de ação. A sensação é de equipamento bem cuidado, não de
planilha. Títulos com serifada dão caráter editorial; o resto da interface é limpo e
funcional. O **azul geleira** entra como respiro frio (sky) e o **granito** como borda
discreta — nunca como texto sobre fundo claro.

### 1.2 Limpo

Hierarquia antes de decoração. Espaço em múltiplos de 4 px, uma cor de ação por tela,
bordas de baixo contraste e sombras curtas. Nada de gradiente, textura ruidosa ou ícone
decorativo sem função. Cada elemento tem um papel: fundo, superfície, texto, borda, ação
ou destaque.

### 1.3 Balcão rápido

O atendente de balcão é o usuário principal. Prioridade: **uma ou duas interações** para
reservar, consultar disponibilidade por data, registrar devolução ou cobrar multa. Tabelas
densas (linha de 36 px), campos com foco visível imediato, atalhos de teclado, estados de
carregamento curtos e mensagens de erro que dizem o que fazer. O perfil administrador tem
os mesmos padrões, com navegação adicional para fornecedores, manutenção, pagamentos e
cadastros.

### 1.4 Perfis e faixa de janela

| Perfil | Foco | O que vê primeiro |
| --- | --- | --- |
| **Atendente de balcão** |fluxo rápido | busca de cliente/equipamento, disponibilidade por data, reserva e devolução |
| **Administrador** |gestão | equipamentos, fornecedores, manutenção, pagamentos, multas e relatórios |

Layout responsivo **dentro da janela desktop de 800x600 a 1920x1080**. Em 800 px a sidebar
colapsa para ícones (`w-16`); a partir de 1024 px usa `w-sidebar` (240 px). Nunca depender
de rolagem horizontal fora de tabelas.

---

## 2. Papel de cada cor

| Token | Hex | Papel | Uso canônico |
| --- | --- | --- | --- |
| `pedra` | `#ECE9E1` | **fundo** | fundo da janela, faixas secundárias, estado vazio |
| `superficie` / `branco` | `#FFFFFF` | **superfície** | cards, campos, tabelas, modais e toasts |
| `grafite` | `#0D1512` | **texto principal** | texto corrido, rótulos, texto sobre lima/geleira |
| `floresta` | `#17302A` | **texto e estrutura** | títulos, cabeçalhos, sidebar, foco em fundo claro |
| `lima` | `#C6F135` | **ação / destaque** | botão primário e realce sobre verde escuro — nunca texto sobre pedra/branco |
| `geleira` | `#6FAFE0` | **destaque frio** | hover do botão primário, links sobre floresta, toast informativo |
| `granito` | `#8C9AA5` | **borda** | bordas, divisores, ícones inativos — texto só sobre floresta |
| `erro` | `#B23A2E` | semântico | validação, atraso, devolução fora do prazo |
| `alerta` | `#8A5A00` | semântico | manutenção, reserva pendente, pagamento em aberto |
| `sucesso` | `#17654B` | semântico | disponível, reserva confirmada, pagamento quitado |

Regra de ouro: **lima é tinta de fundo, não de texto em fundo claro**. Quando precisar de
um real sobre fundo claro, use `floresta`; quando o fundo for floresta, use `lima`.

---

## 3. Contraste WCAG AA verificado por combinação

Critérios usados: **4,5:1** para texto normal, **3:1** para texto grande (≥18 px ou ≥14 px
negrito) e elementos de interface, **3:1** para ícones e bordas de controle. Controles
desabilitados estão isentos, mas ainda recebem `opacity-50`/`opacity-60`.

### 3.1 Combinações permitidas

| Combinação | Razão | Uso |
| --- | --- | --- |
| `text-grafite` sobre `bg-pedra` | **15,28:1** | texto padrão no fundo da janela |
| `text-floresta` sobre `bg-pedra` | **11,60:1** | títulos e texto secundário no fundo |
| `text-floresta` sobre `bg-superficie` | **14,07:1** | títulos em cards e tabelas |
| `text-grafite` sobre `bg-superficie` | **18,53:1** | texto em cards, campos e modais |
| `text-pedra` sobre `bg-floresta` | **11,60:1** | sidebar e barra superior |
| `text-lima` sobre `bg-floresta` | **10,74:1** | item ativo, destaque na barra escura |
| `text-granito` sobre `bg-floresta` | **4,88:1** | ícone/legenda secundária escura |
| `text-geleira` sobre `bg-floresta` | **5,95:1** | link sobre verde escuro |
| `text-grafite` sobre `bg-lima` | **14,15:1** | botão primário |
| `text-grafite` sobre `bg-geleira` | **7,84:1** | hover do botão primário |
| `text-lima` sobre `bg-grafite` | **14,15:1** | toast sobre backdrop escuro |
| `text-branco` sobre `bg-erro` | **5,94:1** | botão destrutivo |
| `text-branco` sobre `bg-alerta` / `bg-sucesso` | **5,93 / 7,00:1** | botões semânticos sólidos |
| `text-erro` sobre `bg-erro-suave` | **5,06:1** | badge e toast de erro |
| `text-alerta` sobre `bg-alerta-suave` | **5,27:1** | badge e toast de alerta |
| `text-sucesso` sobre `bg-sucesso-suave` | **5,96:1** | badge e toast de sucesso |

### 3.2 Combinações proibidas

| Combinação | Razão | Motivo |
| --- | --- | --- |
| `text-lima` sobre `bg-pedra` | **1,08:1** | lima desaparece no fundo quente |
| `text-lima` sobre `bg-superficie` | **1,31:1** | ilegível em branco |
| `text-branco` sobre `bg-lima` | **1,31:1** | o botão primário **sempre** usa `text-grafite` |
| `text-granito` sobre `bg-pedra` | **2,38:1** | granito é borda, não texto claro |
| `text-geleira` sobre `bg-pedra` | **1,95:1** | use `floresta` ou `grafite` |
| `text-grafite` sobre `bg-floresta` | **1,32:1** | dois escuros; use `pedra` ou `lima` |

### 3.3 Foco visível

- Sobre fundo **claro** (pedra/branco): `focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-floresta` (**11,60:1**).
- Sobre fundo **escuro** (floresta/grafite): `focus-visible:outline-lima` (**10,74:1**).
- Nunca usar apenas `border` mudando de cor como único indicador de foco.

---

## 4. Cores semânticas

| Papel | Principal | Suave (fundo) | Clara (sobre floresta) | Contraste |
| --- | --- | --- | --- | --- |
| Erro | `#B23A2E` | `#FBE9E6` | `#F2A59B` | 5,94 branco / 5,06 suave / 7,12 floresta |
| Alerta | `#8A5A00` | `#FBF1D6` | `#F2C14E` | 5,93 branco / 5,27 suave / 8,38 floresta |
| Sucesso | `#17654B` | `#E3F2D0` | `#C6F135` (lima) | 7,00 branco / 5,96 suave / 10,74 floresta |

O verde `#17654B` foi escolhido (em vez do verde da marca) porque atinge AA em pedra
(**5,77:1**) e em branco (**7,00:1**); o lima continua sendo o "sucesso" dentro da sidebar.

---

## 5. Tipografia

### 5.1 Escolha adotada

| Uso | Família | Pacote npm | Fallback |
| --- | --- | --- | --- |
| Títulos (`font-display`) | **Fraunces** | `@fontsource-variable/fraunces` | Georgia, Times New Roman, serif |
| Interface (`font-sans`) | **Inter** | `@fontsource-variable/inter` | Segoe UI, **Arial**, system-ui, sans-serif |

Fraunces tem corte orgânico e eixos `SOFT`/`WONK` — combina com o logo e com o tema outdoor
sem virar "fonte de loja". Inter é neutra e legível em tabelas densas de balcão. O Arial
permanece como fallback imediato, então nada quebra se o pacote falhar. Se preferir Arial
puro, basta remover `'Inter'` da pilha em `--font-sans`.

### 5.2 Alternativas aprovadas

| Papel | Opção B | Pacote npm |
| --- | --- | --- |
| Títulos | **Libre Baskerville** | `@fontsource/libre-baskerville` |
| Interface | **Source Sans 3** | `@fontsource-variable/source-sans-3` |

### 5.3 Escala

| Nível | Classe | Uso |
| --- | --- | --- |
| Display | `font-display text-2xl font-semibold text-floresta` | título da tela |
| Seção | `font-display text-lg text-floresta` | título de card/modal |
| Corpo | `text-sm text-grafite` | texto padrão e células |
| Rótulo | `text-xs font-semibold uppercase tracking-wider text-floresta` | `th`, etiquetas |
| Auxiliar | `text-xs text-floresta/70` | placeholder, ajuda, rodapé |

> `text-floresta/70` foi calculado: **5,38:1** em branco e **4,86:1** em pedra — passa AA.

### 5.4 Instalação das fontes

Nenhuma fonte externa: a CSP bloqueia `font-src` remoto. No topo de
`src/renderer/src/tailwind.css`, o FE adiciona:

```css
@import '@fontsource-variable/fraunces';
@import '@fontsource-variable/inter';
@import 'tailwindcss';
```

---

## 6. Espaçamento, raios, sombras e ícones

### 6.1 Espaçamento (base 4 px)

| Token utilitário | Valor | Uso típico |
| --- | --- | --- |
| `1` | 4 px | gap entre ícone e texto |
| `2` | 8 px | padding interno de badge |
| `3` | 12 px | gap de botões |
| `4` | 16 px | padding de card/campo |
| `5` | 20 px | padding de card grande |
| `6` | 24 px | separação de seções |
| `8` | 32 px | padding de modal |
| `h-row` | 36 px | altura de linha da tabela |
| `w-sidebar` | 240 px | largura da sidebar |

### 6.2 Raios

| Token | Valor | Uso |
| --- | --- | --- |
| `rounded-control` | 8 px | botões, campos, selects, toasts |
| `rounded-card` | 10 px | cards, tabelas, modais |
| `rounded-pill` | 9999 px | badges e status |

### 6.3 Sombras

| Classe | Uso |
| --- | --- |
| `shadow-none` | elementos planos sobre fundo de tabela |
| `shadow-card` | cards e tabelas (padrão) |
| `shadow-modal` | modais e overlays |
| `hover:shadow-md` | card clicável |

### 6.4 Ícones

SVG inline, `size-4` (16 px) em controles e `size-5` (20 px) em destaques, sempre com
`stroke-current`, `shrink-0` e `aria-hidden="true"`. Nenhuma biblioteca de ícones nova sem
aprovação do Arquiteto. Ícone que comunica estado por conta própria precisa de `aria-label`
no elemento pai; o SVG permanece oculto para leitores de tela.

---

## 7. Tema Tailwind pronto para colar

Substitua/o complemento do bloco atual em `src/renderer/src/tailwind.css`:

```css
@import '@fontsource-variable/fraunces';
@import '@fontsource-variable/inter';
@import 'tailwindcss';

@theme {
  /* Paleta da marca */
  --color-grafite: #0d1512;
  --color-floresta: #17302a;
  --color-lima: #c6f135;
  --color-geleira: #6fafe0;
  --color-granito: #8c9aa5;
  --color-pedra: #ece9e1;
  --color-superficie: #ffffff;
  --color-branco: #ffffff;

  /* Semânticas */
  --color-erro: #b23a2e;
  --color-erro-suave: #fbe9e6;
  --color-erro-claro: #f2a59b;
  --color-alerta: #8a5a00;
  --color-alerta-suave: #fbf1d6;
  --color-alerta-claro: #f2c14e;
  --color-sucesso: #17654b;
  --color-sucesso-suave: #e3f2d0;
  --color-sucesso-claro: #c6f135;

  /* Tipografia */
  --font-display: 'Fraunces', Georgia, 'Times New Roman', serif;
  --font-sans: 'Inter', 'Segoe UI', Arial, system-ui, sans-serif;

  /* Formas */
  --radius-control: 8px;
  --radius-card: 10px;
  --radius-pill: 9999px;

  /* Medidas nomeadas */
  --spacing-row: 2.25rem;
  --spacing-sidebar: 15rem;

  /* Elevação */
  --shadow-card: 0 1px 2px rgb(13 21 18 / 0.06), 0 8px 24px rgb(13 21 18 / 0.05);
  --shadow-modal: 0 24px 60px rgb(13 21 18 / 0.25);
}
```

Isso gera, sem CSS adicional, utilitários como `bg-superficie`, `text-erro`,
`border-granito/45`, `rounded-card`, `h-row`, `w-sidebar`, `shadow-card`, `font-display`.

---

## 8. Especificação dos componentes

Todas as classes abaixo são **texto literal**. O FE as copia para constantes tipadas;
variantes (erro, desabilitado) são constantes separadas, nunca interpolação de string.

### 8.1 Botão

**Base primário**

```
inline-flex items-center justify-center gap-2 rounded-control bg-lima px-4 py-2.5 text-sm font-semibold text-grafite transition-colors duration-150
```

| Estado | Classes adicionais |
| --- | --- |
| normal | base |
| hover | `hover:bg-geleira` |
| foco | `focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-floresta` |
| desabilitado | `disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-lima` |
| erro / destrutivo | `bg-erro text-branco hover:bg-erro/90 focus-visible:outline-erro` |
| secundário | `border border-granito/45 bg-superficie text-floresta hover:bg-pedra` |
| ghost | `bg-transparent text-floresta hover:bg-floresta/10` |

### 8.2 Campo (input)

**Base**

```
w-full rounded-control border border-granito/45 bg-superficie px-3 py-2 text-sm text-grafite placeholder:text-floresta/70 transition-colors
```

| Estado | Classes adicionais |
| --- | --- |
| normal | base |
| hover | `hover:border-floresta/60` |
| foco | `focus-visible:border-floresta focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-floresta` |
| desabilitado | `disabled:cursor-not-allowed disabled:bg-pedra disabled:text-floresta/60` |
| erro | `aria-invalid:border-erro aria-invalid:focus-visible:outline-erro` |
| com ícone | wrapper `relative`; input ganha `pl-9`; ícone `pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-floresta` |

### 8.3 Select

Mesma base do campo, mais:

```
appearance-none pr-9
```

| Estado | Classes adicionais |
| --- | --- |
| normal | base + `appearance-none pr-9` |
| hover | `hover:border-floresta/60` |
| foco | `focus-visible:border-floresta focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-floresta` |
| desabilitado | `disabled:cursor-not-allowed disabled:bg-pedra disabled:text-floresta/60` |
| erro | `aria-invalid:border-erro aria-invalid:focus-visible:outline-erro` |
| seta | `pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-floresta` |

### 8.4 Tabela

| Estado | Classes |
| --- | --- |
| container | `w-full overflow-x-auto rounded-card border border-granito/45 bg-superficie shadow-card` |
| tabela | `w-full border-collapse text-left text-sm` |
| cabeçalho | `bg-floresta text-pedra` |
| `th` | `h-row px-4 text-xs font-semibold uppercase tracking-wider` |
| linha | `h-row border-t border-granito/30 transition-colors hover:bg-pedra/60` |
| célula | `px-4 py-2 text-grafite` |
| foco (linha selecionável) | `focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-floresta` |
| desabilitado | `opacity-60` |
| erro | `bg-erro-suave text-erro` |
| vazia | `h-32 text-center text-floresta/70` |

### 8.5 Modal

| Estado | Classes |
| --- | --- |
| backdrop | `fixed inset-0 z-40 bg-grafite/60 backdrop-blur-sm` |
| painel | `fixed left-1/2 top-1/2 z-50 w-[min(92vw,560px)] -translate-x-1/2 -translate-y-1/2 rounded-card bg-superficie shadow-modal` |
| cabeçalho | `flex items-center justify-between border-b border-granito/30 px-6 py-4` |
| título | `font-display text-xl text-floresta` |
| corpo | `max-h-[60vh] overflow-y-auto px-6 py-5 text-sm text-grafite` |
| rodapé | `flex justify-end gap-3 border-t border-granito/30 px-6 py-4` |
| foco | `focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-floresta` + `aria-modal="true"` + armadilha de foco |
| erro | `ring-1 ring-erro` no painel + `text-erro` no título |
| desabilitado | `opacity-60 pointer-events-none` no botão de confirmar |

### 8.6 Badge de status

**Base**

```
inline-flex items-center gap-1.5 rounded-pill px-2.5 py-1 text-xs font-semibold
```

| Estado | Classes adicionais |
| --- | --- |
| disponível | `bg-sucesso-suave text-sucesso` |
| reservado / pendente | `bg-alerta-suave text-alerta` |
| atrasado / erro | `bg-erro-suave text-erro` |
| manutenção / neutro | `bg-pedra text-floresta` |
| sobre barra escura | `bg-lima/20 text-lima` |
| desabilitado | `opacity-50` |

### 8.7 Toast

| Estado | Classes |
| --- | --- |
| container | `fixed bottom-6 right-6 z-50 flex w-[min(92vw,360px)] flex-col gap-2` |
| base | `flex items-start gap-3 rounded-card border px-4 py-3 text-sm shadow-card` |
| sucesso | `border-sucesso/30 bg-sucesso-suave text-sucesso` |
| erro | `border-erro/30 bg-erro-suave text-erro` |
| alerta | `border-alerta/30 bg-alerta-suave text-alerta` |
| informativo | `border-geleira/40 bg-geleira/10 text-floresta` |
| foco (fechar) | `focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-floresta` |
| desabilitado | `opacity-60` |

### 8.8 Sidebar

| Estado | Classes |
| --- | --- |
| container | `flex h-screen w-sidebar shrink-0 flex-col border-r border-granito/30 bg-floresta text-pedra` |
| marca | `px-6 py-5 font-display text-xl text-lima` |
| navegação | `flex flex-1 flex-col gap-1 px-3 py-4` |
| item base | `flex items-center gap-3 rounded-control px-3 py-2 text-sm text-pedra transition-colors` |
| hover | `hover:bg-pedra/10` |
| ativo | `bg-lima/20 text-lima` |
| foco | `focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lima` |
| desabilitado | `cursor-not-allowed opacity-50` |
| erro (pendência) | `text-erro-claro` |
| colapsada (800 px) | `w-16` no container e `justify-center` no item |

### 8.9 Card

| Estado | Classes |
| --- | --- |
| base | `rounded-card border border-granito/45 bg-superficie p-5 shadow-card` |
| título | `font-display text-base text-floresta` |
| corpo | `mt-2 text-sm text-grafite` |
| hover (clicável) | `transition-shadow hover:shadow-md` |
| foco (clicável) | `focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-floresta` |
| desabilitado | `opacity-60` |
| erro | `border-erro bg-erro-suave` |

### 8.10 Estado vazio

| Estado | Classes |
| --- | --- |
| container | `flex min-h-64 flex-col items-center justify-center gap-3 rounded-card border border-dashed border-granito/60 bg-pedra/40 p-8 text-center` |
| ícone | `size-10 text-floresta/70` |
| título | `font-display text-lg text-floresta` |
| texto | `max-w-sm text-sm text-floresta/70` |
| ação | classes do botão secundário (8.1) |
| foco | herda o botão |

### 8.11 Carregando

| Estado | Classes |
| --- | --- |
| container | `flex min-h-40 items-center justify-center gap-3 text-floresta` |
| spinner | `size-5 animate-spin rounded-full border-2 border-granito/40 border-t-floresta` |
| texto | `text-sm text-floresta/70` + `aria-live="polite"` |
| skeleton | `animate-pulse rounded-control bg-granito/30` |
| desabilitado | `opacity-60` |

### 8.12 Erro

| Estado | Classes |
| --- | --- |
| container | `flex min-h-40 flex-col items-center justify-center gap-3 rounded-card border border-erro/40 bg-erro-suave p-8 text-center` |
| ícone | `size-9 text-erro` |
| título | `font-display text-lg text-erro` |
| mensagem | `max-w-md text-sm text-grafite` |
| detalhes | `mt-2 text-xs text-erro` |
| ação | classes do botão secundário (8.1) |
| foco | `focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-erro` |

> Mensagem de erro nunca expõe stack, SQL ou segredo. Ela diz **o que aconteceu** e **o que
> fazer** (ex.: "Não foi possível consultar a disponibilidade. Tente novamente.").

---

## 9. Checklist de aceite para o frontend

1. Classes copiadas por extenso em constantes tipadas — nenhuma interpolação.
2. Nenhum `.css` novo, `@apply`, classe própria ou `style=`.
3. Combinações da seção 3.2 ausentes do código.
4. Foco visível em todo elemento interativo (seção 3.3).
5. Botão primário sempre `text-grafite` sobre `bg-lima`.
6. Tela com carregando, erro e lista vazia implementados.
7. Validado em 800x600 (sidebar colapsada) e 1920x1080.
8. Textos e ações coerentes com os dois perfis e com o fluxo de balcão.

---

## 10. Independência e handoff

Esta documentação é propriedade do UI/UX Designer. Mudanças de token ou de contraste exigem
nova revisão aqui antes de virarem código. Instalar `@fontsource-*` e aplicar o `@theme`
são tarefas do `frontend-developer`; mudanças em `src/main`, `src/preload`,
`src/shared/contratos` ou novas dependências que não sejam fontes passam pelo Arquiteto.
