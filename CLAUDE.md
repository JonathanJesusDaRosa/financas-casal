# Finanças do Casal

App de finanças para um casal (eu e minha esposa) organizarmos o dinheiro juntos. Também é meu projeto de portfólio: estudo engenharia de software e quero aprender construindo algo real.

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

## Estrutura

```
financas-casal/
├── web/   front-end (React + Vite), roda em http://localhost:5173
└── api/   back-end (Express), roda em http://localhost:3333
```

- Rodar o front: `cd web` e `npm run dev`
- Rodar a API: `cd api` e `npm run dev` (nodemon reinicia ao salvar)
- Teste rápido da API: `GET /health` responde `{"status":"ok"}`; `GET /health/db` testa o banco

### Banco (dentro de `api/`)

- Esquema: `api/prisma/schema.prisma`. Depois de mudar, rodar `npm run db:migrate -- --name descricao` e `npm run db:generate`.
- `npm run db:studio` abre os dados no navegador.
- O banco do Neon é o mesmo usado de verdade pelo casal: NÃO rodar `npm run db:seed` nele (cria o "Casal Exemplo"). Testes automáticos usam e-mails `teste-*@exemplo.com` e apagam tudo no final.
- Datas de lançamento são só o dia (`@db.Date`), trafegam como texto `AAAA-MM-DD` e são convertidas em UTC (`api/src/lib/validar.js`) para evitar erro de fuso.
- Dinheiro sempre em centavos (`Int`): R$ 100,50 = `10050`.
- `.env` tem `DATABASE_URL` (pooled, usada pelo app) e `DIRECT_URL` (sem pooler, usada pelas migrações).
- O cliente gerado (`src/generated/prisma`, fora do Git) é TypeScript; o Node 24 roda direto. Versões do Prisma fixadas em 7.10.1 (o `latest` do CLI era um RC da 8).

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

## Funcionalidades

**Primeira versão (MVP):**
- Conta compartilhada: cada um com seu login, os dois no mesmo "espaço do casal"
- Lançamentos de despesas e receitas: valor, data, categoria, descrição e quem pagou
- Categorias editáveis (Mercado, Transporte, Moradia, Lazer...)
- Resumo do mês: entradas, saídas, saldo e gastos por categoria
- Divisão proporcional à renda: quanto cada um deveria pagar e quem deve a quem
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

## Fora de escopo por enquanto

Conexão direta com bancos (Open Finance), integração com WhatsApp, cotações automáticas de investimentos, virar produto comercial.
