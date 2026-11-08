# Casa em Conta — guia visual

Use este guia para todas as telas do app (pasta `web/`). Identidade completa: https://claude.ai/artifact/YHKtRQhtezEsutRjMwDuoN

## Marca

- **Nome:** Casa em Conta
- **Tagline:** As contas da casa, em dia e sem briga.
- **Para quem:** a casa toda (casal, filhos, quem divide as contas). Nunca use "casal" na interface: use "casa", "membros" e "quem pagou".
- **Logo:** casa índigo com uma moeda pêssego no lugar da porta. Arquivos em `web/public/brand/`:
  - `casa-em-conta-logo.svg` (símbolo + nome), `casa-em-conta-mark.svg` (só o símbolo), `casa-em-conta-app-icon.svg` (ícone da PWA, 512×512).

## Princípios

1. Lançar é mais rápido que esquecer: o botão de voz está sempre a um toque.
2. Calmo, não alarmista: vermelho só para despesa e erro.
3. A IA sugere, a pessoa confirma: nada é salvo sem a tela de confirmação.

## Tom de voz

- Português do Brasil, "você", frases curtas, verbo no início ("Lançar gasto", "Confirmar").
- "Entrou" e "Saiu" em vez de "Crédito" e "Débito". Sem culpa, sem exclamações, sem emoji.
- Valores: `R$ 1.234,56` via `Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })`. Datas curtas: "08 nov".

## Tokens (copiar para `web/src/styles/tokens.css` e importar em `main.jsx`)

```css
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap');

:root {
  /* cores — tema claro */
  --surface: #F8F7FC;        /* fundo das telas */
  --surface-raised: #FFFFFF; /* cards e campos */
  --ink: #1C1B33;            /* texto principal */
  --ink-muted: #5E5B7A;      /* texto secundário, datas */
  --line: #E3E1F0;           /* divisórias e bordas de card */
  --indigo: #3D3A8C;         /* marca: botão principal, nav ativa, links, foco */
  --on-indigo: #FFFFFF;
  --indigo-soft: #E6E5F6;    /* chips, abas, card de saldo */
  --peach: #FFB38A;          /* destaque: botão de voz e metas (nunca texto) */
  --on-peach: #1C1B33;
  --peach-soft: #FFE9DC;     /* aviso de confirmação, fundo da barra de meta */
  --income: #1E7F5C;         /* receitas, sempre com "+" */
  --expense: #B42318;        /* despesas e erros, sempre com "−" */
  --warning: #9A4A06;        /* orçamento perto do limite */

  /* tipografia */
  --font-sans: "Plus Jakarta Sans", system-ui, -apple-system, "Segoe UI", sans-serif;

  /* espaçamento (grade de 4px) */
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;  /* margem lateral e padding de card */
  --space-6: 24px;  /* entre seções */
  --space-8: 32px;

  /* cantos */
  --radius-sm: 8px;    /* campos, chips, ícone de categoria */
  --radius-md: 12px;   /* botões e cards */
  --radius-lg: 20px;   /* folhas e card de saldo */
  --radius-full: 999px;/* botão de voz, avatar, barra de progresso */

  /* sombra (só folhas e botão de voz) */
  --shadow-sheet: 0 -4px 24px rgba(28, 27, 51, 0.12);
}

@media (prefers-color-scheme: dark) {
  :root {
    --surface: #15142A;
    --surface-raised: #201E3D;
    --ink: #F1F0FA;
    --ink-muted: #A9A6C6;
    --line: #33315A;
    --indigo: #8C88E8;
    --on-indigo: #15142A;
    --indigo-soft: #2A2858;
    --peach-soft: #4A3330;
    --income: #5FD3A4;
    --expense: #FF8A80;
    --warning: #F5B451;
  }
}

body {
  margin: 0;
  background: var(--surface);
  color: var(--ink);
  font-family: var(--font-sans);
  font-size: 15px;
  line-height: 22px;
}
```

Regra: no código das telas, **nunca** escreva uma cor fixa. Use sempre `var(--token)`.

Exceção de contraste: no tema escuro, texto sobre `--indigo-soft` usa `--ink` (índigo claro sobre índigo suave fica ilegível). Ícones podem continuar em `--indigo`.

## Telas de referência

Imagens em `docs/telas/` (exportadas do guia visual). São **referência de estilo**, não precisam ser copiadas exatamente: mantenha as cores, a tipografia, os espaços e o clima geral, mas a organização de cada tela pode mudar se fizer mais sentido no app.

- `inicio.png`: tela Início, tema claro
- `confirmacao.png`: folha de confirmação do lançamento por voz
- `inicio-escuro.png`: tela Início, tema escuro
- `guia.png`: prancha com cores, tipografia e componentes

## Tipografia

Uma família só: Plus Jakarta Sans.

| Estilo | Tamanho / altura da linha | Peso | Uso |
| --- | --- | --- | --- |
| display | 32 / 40 | 700 | boas-vindas |
| title | 22 / 28 | 700 | título da tela |
| heading | 17 / 24 | 600 | título de seção |
| body | 15 / 22 | 400 | texto corrido |
| label | 13 / 18 | 500 | rótulos e botões |
| caption | 12 / 16 | 500 | datas, quem pagou |
| amount-lg | 36 / 44 | 700 | saldo do mês |
| amount | 17 / 24 | 600 | valores em listas |

Valores usam `font-variant-numeric: tabular-nums`.

## Layout

- Mobile first (360 a 430px). No computador, conteúdo centralizado com `max-width: 480px`.
- Cards: fundo `--surface-raised`, borda 1px `--line`, `--radius-md`, padding `--space-4`, **sem sombra**.
- Um botão principal (`--indigo`) por tela. Botões com no mínimo 44px de altura.
- Foco: `outline: 2px solid var(--indigo); outline-offset: 2px;`
- **Navegação inferior:** 4 abas (Início, Lançamentos, Metas, Casa) com ícones de 24px. No centro, sobreposto, o **botão de voz**: círculo `--peach` de 64px, ícone de microfone `--on-peach`, `--shadow-sheet`.
- **Início:** card de saldo (`--indigo-soft`, `--radius-lg`, valor em amount-lg), entradas e saídas do mês, gastos por categoria e últimos lançamentos.
- **Item de lançamento:** ícone da categoria em quadrado de 40px (`--radius-sm`, fundo `--indigo-soft`), descrição em body, "quem pagou · data" em caption `--ink-muted`, valor em amount à direita (`--income` com "+" ou `--expense` com "−").
- **Confirmação da IA:** folha que sobe de baixo (`--radius-lg` só no topo, `--shadow-sheet`) com valor, categoria, descrição, data e quem pagou, todos editáveis. Aviso "Confira antes de salvar" em fundo `--peach-soft`. Botões "Salvar" (principal) e "Corrigir" (secundário).

## Ícones

`lucide-react`, traço 1.75, 20px (24px na navegação), cor `currentColor`.

## PWA

No manifest: `"name": "Casa em Conta"`, `"short_name": "Casa em Conta"`, `"theme_color": "#3D3A8C"`, `"background_color": "#F8F7FC"`, ícone `brand/casa-em-conta-app-icon.svg` (gerar também PNG 192 e 512).
