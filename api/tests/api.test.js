// Testes automáticos da API. Rodar dentro de api/:  npm test
//
// Como funciona:
//   1. Confere que o .env aponta para o banco de TESTE (branch "dev" do Neon), nunca o de produção.
//   2. Liga a API numa porta livre, aqui mesmo (não precisa do "npm run dev").
//   3. Roda cada cenário de tests/cenarios/. Cada um cria casas e usuários FICTÍCIOS
//      (e-mails "teste-...@exemplo.com") e apaga tudo no final.
//
// Usa o executor de testes que já vem no Node (node:test), sem biblioteca extra.
import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import app from '../src/app.js';
import { prisma } from '../src/lib/prisma.js';

let servidor;

before(async () => {
  // Trava de segurança: NUNCA rodar testes no banco com os dados reais da casa.
  assert.ok(process.env.DATABASE_URL, 'Falta DATABASE_URL no .env');
  assert.notEqual(
    process.env.DATABASE_URL,
    process.env.PRODUCAO_DATABASE_URL,
    'O .env está apontando para o banco de PRODUÇÃO. Os testes só rodam no banco de teste (dev).',
  );

  // Liga a API numa porta livre (porta 0 = "o sistema escolhe uma livre")
  await new Promise((pronto) => {
    servidor = app.listen(0, pronto);
  });
  process.env.TESTE_API = `http://localhost:${servidor.address().port}`;
});

after(async () => {
  await new Promise((pronto) => servidor.close(pronto));
  await prisma.$disconnect();
});

const CENARIOS = [
  ['lançamentos e categorias', 'lancamentos.mjs'],
  ['metas e investimentos', 'metas.mjs'],
  ['resumo do mês (Início) e ícones', 'resumo.mjs'],
  ['contas fixas e orçamento', 'contas-fixas.mjs'],
  ['evolução mês a mês', 'evolucao.mjs'],
  ['parcelas, ajuste do mês e formas de pagamento', 'parcelas-e-formas.mjs'],
  ['fatura do cartão de crédito', 'fatura.mjs'],
  ['apagar o histórico de lançamentos', 'apagar-historico.mjs'],
];

for (const [nome, arquivo] of CENARIOS) {
  // Cada cenário é um módulo que roda ao ser importado e lança erro se algo falhar.
  test(nome, async () => {
    await import(`./cenarios/${arquivo}`);
  });
}
