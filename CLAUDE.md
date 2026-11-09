# Casa em Conta (antes "Finanças do Casal")

App de finanças da casa: eu e minha esposa (e, no futuro, filhos) organizando o dinheiro juntos. Também é meu projeto de portfólio: estudo engenharia de software e quero aprender construindo algo real.

Visão completa do projeto: https://claude.ai/artifact/1iXKbJSAJDdfKFPmdAuVEz

## Como trabalhar comigo

- Sou iniciante. Sei HTML, CSS e JavaScript; o resto estou aprendendo neste projeto.
- Tenho pouco tempo. Pode escrever o código por mim, não precisa ir linha por linha.
- Mas sempre explique, de forma curta:
  - o que cada parte do código faz;
  - por que escolheu esse caminho (e qual alternativa descartou, se for relevante).
- Antes de mudanças grandes (várias pastas, novas dependências, banco de dados), mostre o plano e espere eu aprovar.
- Prefira soluções simples e populares, com bastante material em português, a soluções "elegantes" difíceis de entender.
- Responda em português do Brasil.

## Stack

| Parte | Tecnologia |
| --- | --- |
| Front-end | React + Vite, como PWA (instalável pelo Safari/Chrome) |
| Back-end | Node.js + Express, JavaScript com ES Modules |
| Banco de dados | PostgreSQL no Neon (região São Paulo) + Prisma 7 |
| Versionamento | Git + GitHub (uso o GitHub Desktop) |

- Sistema: Windows, VS Code.
- JavaScript por enquanto; TypeScript fica para depois.
- Se um dia precisar de app nativo, o plano é embrulhar a PWA com Capacitor.

## Publicação (Vercel, plano Hobby)

- App: https://financas-casal-gold.vercel.app (projeto Vercel `financas-casal`, pasta `web`, variável `VITE_API_URL`)
- API: https://financas-casal-api-beta.vercel.app (projeto Vercel `financas-casal-api`, pasta `api`, variáveis `DATABASE_URL`, `JWT_SECRET`, `WEB_URL`)
- Cada push na `main` publica os dois sozinho. Variável nova na Vercel só vale depois de um Redeploy.
- Banco: branch `production` do Neon = app publicado (dados reais); branch `dev` = computador local.
- Mudou o schema? Testar na dev (`npm run db:migrate`) e, antes do push, aplicar em produção com `npm run db:migrar-producao` (o usuário roda; é dado real).

## Estrutura

```
financas-casal/
├── web/   front-end (React + Vite), roda em http://localhost:5173
└── api/   back-end (Express), roda em http://localhost:3333
```

- Rodar o front: `cd web` e `npm run dev`
- O projeto fica no OneDrive e o Vite às vezes não percebe arquivos alterados (o navegador mostra a versão antiga). Solução: salvar o arquivo de novo (ou `touch`) ou reiniciar o `npm run dev`.
- Rodar a API: `cd api` e `npm run dev` (nodemon reinicia ao salvar)
- Teste rápido da API: `GET /health` responde `{"status":"ok"}`; `GET /health/db` testa o banco

### Banco (dentro de `api/`)

- Esquema: `api/prisma/schema.prisma`. Depois de mudar, rodar `npm run db:migrate -- --name descricao` e `npm run db:generate`.
- `npm run db:studio` abre os dados no navegador.
- O banco do Neon é o mesmo usado de verdade pelo casal: NÃO rodar `npm run db:seed` nele (cria o "Casal Exemplo"). Testes automáticos usam e-mails `teste-*@exemplo.com` e apagam tudo no final.
- Datas de lançamento são só o dia (`@db.Date`), trafegam como texto `AAAA-MM-DD` e são convertidas em UTC (`api/src/lib/validar.js`) para evitar erro de fuso.
- Dinheiro sempre em centavos (`Int`): R$ 100,50 = `10050`.
- `.env` tem `DATABASE_URL` (pooled, usada pelo app) e `DIRECT_URL` (sem pooler, usada pelas migrações).
- Gerador clássico `prisma-client-js` (cliente JS em `node_modules/@prisma/client`, import `@prisma/client`). O gerador novo `prisma-client` gera `.ts`, que a Vercel NÃO inclui no deploy (ERR_MODULE_NOT_FOUND). Versões do Prisma fixadas em 7.10.1 (o `latest` do CLI era um RC da 8).

### Autenticação

- Senha com `bcryptjs` (sem compilação nativa no Windows); login devolve JWT (`jsonwebtoken`, 30 dias), assinado com `JWT_SECRET` do `.env`.
- Front guarda o token no `localStorage` (`web/src/api.js`) e manda em `Authorization: Bearer`. Migrar para cookie httpOnly quando publicar, se der.
- Rotas protegidas usam o middleware `api/src/middlewares/autenticar.js` (coloca `req.usuarioId`).
- Validação de entrada com `zod`; erros da API sempre no formato `{ "erro": "mensagem em português" }`.

### Espaço do casal

- Rotas em `api/src/routes/casal.js`: criar (`POST /casal`), entrar com código (`POST /casal/entrar`), ver (`GET /casal`), novo convite (`POST /casal/convite`).
- `Usuario.papel`: `TITULAR` (máx. 2 por casal) ou `DEPENDENTE` (previsto para um filho no futuro, ainda sem telas/permissões).
- Convite: código `XXX-XXX` (crypto, sem 0/O/1/I/L), vale 7 dias, é apagado quando o casal fica completo.
- Rotas com dados do casal usam `autenticar` + `exigirCasal` e SEMPRE filtram por `req.casalId`.
- `prisma migrate dev` não funciona quando o Prisma quer confirmar um aviso (terminal não interativo). Alternativa: gerar o SQL com `prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --script` numa pasta nova em `prisma/migrations/` e aplicar com `prisma migrate deploy`.

### Caixinhas e investimentos

- Movimentos de caixinha são `Lancamento` com tipo `GUARDADO`, `RESGATE` ou `RENDIMENTO` e `caixinhaId`. Só são criados/apagados pelas rotas de `/caixinhas` (as rotas de `/lancamentos` recusam).
- Saldo da caixinha = guardado + rendimento − resgatado, sempre calculado (`api/src/lib/saldos.js`), nunca salvo.
- "Atualizar saldo": a pessoa digita o saldo do banco e a diferença vira `RENDIMENTO` (pode ser negativo).
- Totais do mês: entradas = receitas + resgates; guardado = GUARDADO; sobra = entradas − saídas − guardado. Rendimento é só informativo e NÃO entra na sobra (decisão do usuário).
- Saldo de um investimento = soma das caixinhas ligadas a ele (sem saldo próprio).
- Caixinha com histórico não pode ser apagada; com saldo zero pode ser arquivada.

## Funcionalidades

**Primeira versão (MVP):**
- Conta compartilhada: cada um com seu login, os dois no mesmo "espaço do casal"
- Lançamentos de despesas e receitas: valor, data, categoria, descrição e quem pagou
- Categorias editáveis (Mercado, Transporte, Moradia, Lazer...)
- Resumo do mês: entradas, saídas, saldo e gastos por categoria
- ~~Divisão proporcional à renda~~: REMOVIDA. A casa junta todo o dinheiro (não divide salários nem despesas), então não existe "quem deve a quem". "Quem pagou" é só registro de quem fez o lançamento.
- Caixinhas para sonhos (tabela `Meta`): valor-alvo, prazo e quanto já foi guardado; cada caixinha pode apontar para um investimento
- Guardar dinheiro numa caixinha aparece no mês como "Separado para investir" (não é despesa); o mês mostra entradas, saídas, guardado e sobra
- Investimentos com registro manual: onde o dinheiro está aplicado (ex.: CDB Nubank) e o saldo, atualizado à mão. Sem cotações automáticas.

**Fases:**
1. Base (MVP acima)
2. IA por texto: frase digitada ("gasolina 100") vira lançamento
3. Voz: gravar áudio → transcrever → IA extrai os dados em JSON → usuário confirma → salva
4. Vitrine: demo com dados fictícios, README, vídeo, importação de extrato OFX/CSV

Cada fase só começa quando a anterior está em uso no dia a dia.

## Regras importantes

- Nunca salvar um lançamento feito pela IA sem confirmação do usuário.
- Chaves de API e senhas ficam em `.env` (fora do Git), e as chamadas de IA passam sempre pelo back-end.
- Senhas com hash (bcrypt ou argon2); cada casal só enxerga os próprios dados.
- Nunca colocar dados financeiros reais no repositório.

## Visual (DESIGN.md)

- O guia visual é o **DESIGN.md** (marca, tokens, tipografia, layout). Seguir sempre. As telas de referência (imagens) ficam na pasta `Ideia Design/` e o usuário gosta delas: seguir esse layout o mais perto possível.
- Cores só por tokens (`web/src/styles/tokens.css`): nunca cor fixa nas telas. Ícones: `lucide-react` via `<Icone nome="..." />` (lista em `web/src/utils/icones.js`; o banco guarda só o nome).
- Interface sem a palavra "casal" (usar "casa", "membros", "quem pagou") e sem emoji. Por dentro (banco, rotas `/casal`, `casalId`) o nome continua.
- Navegação: Início, Extrato, (+), Metas, Investir, Casa. NÃO usar `position: fixed` na barra (sumiu no iPhone instalado): o Layout é uma coluna de 100dvh com `.conteudo-rolavel` (rola) + `.navegacao` (fixa no fim). O "+" central abre o lançamento; na Fase 3 vira o microfone. Rótulos curtos para caber em 360px.
- "Caixinhas" se chamam **Metas** na interface (rotas do front `/metas`; API continua `/caixinhas`).
- Para conferir telas: prints com o Edge headless dentro de um iframe de 360/390px (o Edge sem janela tem largura mínima maior que um celular).

### Contas fixas e orçamento

- Dois tipos de conta fixa: SEM FIM (`totalParcelas` null) e COM FIM/parcelas (`totalParcelas` + `parcelaInicial`, ex.: 10x começando na 3ª). Último mês = `mesInicio` + (total − inicial).
- NADA RETROATIVO: `mesInicio` (AAAA-MM) nunca anterior ao mês atual no cadastro; a conta só aparece de `mesInicio` em diante. Contas antigas ganharam o mês de criação na migração.
- Valor variável: `ContaFixaAjuste` guarda o valor de UM mês, ajustado antes de pagar (`PUT/DELETE /contas-fixas/:id/valor-mes`); "Pagar" já usa esse valor. Depois de paga, não ajusta (edita o lançamento).
- Formas de pagamento: `FormaPagamento` (nome + tipo PIX/DEBITO/CREDITO/DINHEIRO/BOLETO/OUTRO), cadastro em Casa → Formas de pagamento; casa nova já vem com 5. Opcional no lançamento; conta fixa tem forma de costume. `/resumo` devolve `porFormaPagamento` (card no Início com total no crédito). Cartão de crédito tem regra própria (ver "Fatura do cartão").
- `ContaFixa` (nome, valor de costume, dia de vencimento 1–31, tipo, categoria, ativa). NÃO vira lançamento sozinha: no mês fica "a pagar"/"atrasada" até alguém tocar em "Pagar" (`POST /contas-fixas/:id/pagar`), que cria um `Lancamento` com `contaFixaId` + `competencia` ("2026-11"; único por conta e mês). Desfazer = apagar esse lançamento.
- Dia 31 em mês curto = último dia. "Hoje" para vencimento usa o fuso de São Paulo (`api/src/lib/datas.js`), porque a Vercel roda em UTC.
- Orçamento: `Categoria.limiteMensalCentavos` (opcional, o mesmo todo mês). `/resumo` devolve `orcamento`; barra na cor `--warning` a partir de 80%; texto calmo ("Faltam R$ X" / "Passou R$ X do previsto").
- Telas: `/contas` (dentro da navegação, acesso pelo Início e por Casa → Ajustes), `/contas/nova`, `/contas/:id/editar`. Limite editado em Casa → Categorias.

### Evolução e layout do computador

- Gráfico "Evolução" (Início): `GET /resumo/evolucao?ate=AAAA-MM&meses=6`; SVG feito à mão em `web/src/components/GraficoEvolucao.jsx` (legenda, dica no hover, "Ver em tabela", tocar num mês muda o mês do Início). Cores `--grafico-entrou`/`--grafico-saiu` validadas para daltonismo com o script do guia de dataviz (no escuro usam tons próprios; os de texto falhavam).
- Computador (>= 1024px): a MESMA navegação vira barra lateral só por CSS (logo, botão "Lançar", abas e "Contas", que só aparece no computador). Início vira painel de 2 colunas por `grid-template-areas` (classes `area-*`), mantendo a ordem do celular. Páginas com `.tela.larga` (Início, Metas, Investimentos) usam até 1280px; as outras até 880px. No computador o casal ANALISA; no celular LANÇA no dia a dia.
- Ao editar arquivos por script, usar `split/join` em vez de `replace` quando o texto tiver `$` (em `replace`, `$'` e `$&` são códigos especiais).

### Manual de uso

- Tela "Como usar" em `web/src/pages/Ajuda.jsx` (Casa → Ajustes → Como usar), em seções que abrem ao tocar. **Sempre que uma funcionalidade mudar ou for criada, atualizar o texto dali também.**

### Fatura do cartão de crédito

- Cartão = `FormaPagamento` tipo CREDITO com `diaFechamento` e `diaVencimento`. Sem os dias, lançar no cartão é recusado (pede para configurar).
- DESPESA no cartão ganha `faturaMes` (mês em que a fatura VENCE) e NÃO conta no "Saiu". Regra: compra antes do dia de fechamento -> fatura que fecha no mês; no dia ou depois -> a seguinte; vence no mês do fechamento se vencimento > fechamento, senão no mês seguinte (`api/src/lib/fatura.js`; cópia só para mostrar em `web/src/utils/fatura.js`).
- Parcelado no cartão: `POST /lancamentos` com `parcelas` e o valor TOTAL -> N lançamentos (`grupoParcelas`, `parcela`, `totalParcelas`), um por mês/fatura; centavos que sobram vão na 1ª. `DELETE ?todasParcelas=1` apaga a compra inteira.
- Pagar fatura (sempre inteira): `POST /faturas/:cartaoId/pagar` cria lançamento tipo FATURA (`competencia` = mês da fatura) — é ele que entra no "Saiu". Desfazer: `DELETE /faturas/:cartaoId/pagamento?mes=`. FATURA não se edita pelas rotas de lançamento.
- DUAS VISÕES: Saldo/Entrou/Saiu/Sobra/Evolução = dinheiro (caixa: despesas fora do cartão + faturas pagas). Gastos por categoria, orçamento e formas de pagamento = consumo (todas as despesas pela data da compra, inclusive no cartão). `/resumo` e `/lancamentos` devolvem `noCartao` (compras no cartão no mês).
- Faturas que vencem no mês aparecem em `/contas-fixas/mes` (`faturas`) e entram no "faltam pagar". Conta fixa paga com cartão vai para a fatura (não soma de novo).
- Cartão com compras em faturas não pode ser apagado nem mudar de tipo (só renomear). Compras no crédito anteriores a esta regra ficaram com `faturaMes` null (já contaram como saída) — decisão do usuário.

### Apagar dados e formas padrão

- Casa nova vem com Pix, Débito, Dinheiro e Boleto (SEM cartão de crédito: cada casa cadastra os seus).
- "Apagar dados" (Casa, fim da página): `DELETE /casal/lancamentos { confirmacao: nome da casa }` apaga TODOS os lançamentos da casa + ajustes de valor do mês. Mantém casa, membros, categorias, formas, contas fixas, metas (zeradas) e investimentos. Sem volta.

### Testes automáticos

- `cd api` e `npm test`: liga a API numa porta livre e roda os cenários de `api/tests/cenarios/` (dados fictícios `teste-*@exemplo.com`, apagados no final). Trava: recusa rodar se `DATABASE_URL` for igual a `PRODUCAO_DATABASE_URL`.
- Rodar SEMPRE antes de publicar mudanças na API. Funcionalidade nova = cenário novo (ou verificações novas) em `tests/cenarios/` e na lista do `tests/api.test.js`.

## Pendências combinadas

- Ajustes finos de visual conforme o uso (celular e computador).
- Depois: notificação de vencimento no celular (exige push + agendador no servidor).

## Fora de escopo por enquanto

Conexão direta com bancos (Open Finance), integração com WhatsApp, cotações automáticas de investimentos, virar produto comercial.

### Detalhes de comportamento do app

- Sem zoom de pinça e sem rolar de lado: `maximum-scale=1, user-scalable=no` no index.html (Android), `touch-action: pan-y` + `overflow-x: hidden` no CSS e `gesturestart` cancelado em main.jsx (iPhone ignora o meta).
- "Olho" no topo (Cabecalho) oculta valores: `formatarReais` devolve `R$ ••••`; escolha salva no aparelho (localStorage). Toda tela que mostra dinheiro chama `useValoresOcultos()` para redesenhar quando o olho muda.
