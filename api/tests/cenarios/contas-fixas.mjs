// Cenário de teste (rodado pelo api.test.js). Usa dados FICTÍCIOS (e-mails teste-*) e apaga tudo no final.
// Teste: contas fixas (situação no mês, pagar, desfazer) e orçamento por categoria.
import { prisma } from '../../src/lib/prisma.js';
const B = process.env.TESTE_API; // endereço da API ligada pelo api.test.js
const sufixo = Date.now();
let falhas = 0;
const chamar = async (c, { metodo = 'GET', corpo, token } = {}) => {
  const r = await fetch(B + c, { method: metodo, headers: { 'Content-Type': 'application/json', ...(token && { Authorization: `Bearer ${token}` }) }, body: corpo ? JSON.stringify(corpo) : undefined });
  const t = await r.text(); return { status: r.status, dados: t ? JSON.parse(t) : null };
};
const igual = (titulo, a, b) => { const ok = JSON.stringify(a) === JSON.stringify(b); if (!ok) falhas++; console.log(`${ok ? '✅' : '❌'} ${titulo}: ${JSON.stringify(a)}${ok ? '' : '  (esperado ' + JSON.stringify(b) + ')'}`); };

const hoje = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date());
const mes = hoje.slice(0, 7);
const diaHoje = Number(hoje.slice(8));
console.log('hoje no Brasil:', hoje);

try {
  const ana = (await chamar('/auth/cadastro', { metodo: 'POST', corpo: { nome: 'Ana', email: `teste-ana-${sufixo}@exemplo.com`, senha: 'senha12345' } })).dados;
  const t = { token: ana.token };
  await chamar('/casal', { metodo: 'POST', corpo: { nome: 'Casa Teste' }, ...t });
  const zeca = (await chamar('/auth/cadastro', { metodo: 'POST', corpo: { nome: 'Zeca', email: `teste-zeca-${sufixo}@exemplo.com`, senha: 'senha12345' } })).dados;
  await chamar('/casal', { metodo: 'POST', corpo: { nome: 'Casa do Zeca' }, token: zeca.token });
  const cats = Object.fromEntries((await chamar('/categorias', t)).dados.categorias.map((c) => [c.nome, c.id]));

  console.log('\n--- Cadastro ---');
  const criar = (corpo) => chamar('/contas-fixas', { metodo: 'POST', corpo, ...t });
  const aluguel = (await criar({ nome: 'Aluguel', valorCentavos: 200000, diaVencimento: Math.max(1, diaHoje - 2), categoriaId: cats.Moradia })).dados.conta;
  const internet = (await criar({ nome: 'Internet', valorCentavos: 10000, diaVencimento: diaHoje, categoriaId: cats.Moradia })).dados.conta;
  const luz = (await criar({ nome: 'Luz', valorCentavos: 18000, diaVencimento: Math.min(28, diaHoje + 5) })).dados.conta;
  const salario = (await criar({ nome: 'Salário', tipo: 'RECEITA', valorCentavos: 500000, diaVencimento: 31, categoriaId: cats['Salário'] })).dados.conta;
  igual('tipo padrão = despesa', aluguel.tipo, 'DESPESA');
  igual('receita mantida', salario.tipo, 'RECEITA');
  igual('dia 0 recusado', (await criar({ nome: 'X', valorCentavos: 100, diaVencimento: 0 })).status, 400);
  igual('dia 32 recusado', (await criar({ nome: 'X', valorCentavos: 100, diaVencimento: 32 })).status, 400);
  const catZeca = (await chamar('/categorias', { token: zeca.token })).dados.categorias[0].id;
  igual('categoria de outra casa recusada', (await criar({ nome: 'X', valorCentavos: 100, diaVencimento: 5, categoriaId: catZeca })).status, 400);
  igual('editar só o valor não muda o tipo da receita', (await chamar(`/contas-fixas/${salario.id}`, { metodo: 'PATCH', corpo: { valorCentavos: 510000 }, ...t })).dados.conta.tipo, 'RECEITA');

  console.log('\n--- Situação no mês ---');
  let m = (await chamar(`/contas-fixas/mes?mes=${mes}`, t)).dados;
  const sit = (lista) => Object.fromEntries(lista.map((c) => [c.nome, `${c.situacao}${c.situacao !== 'paga' ? ' (' + c.diasParaVencer + 'd)' : ''}`]));
  console.log('   ', JSON.stringify(sit(m.contas)));
  if (diaHoje > 2) igual('aluguel atrasado', m.contas.find((c) => c.nome === 'Aluguel').situacao, 'atrasada');
  igual('internet vence hoje (a pagar, 0 dias)', [m.contas.find((c) => c.nome === 'Internet').situacao, m.contas.find((c) => c.nome === 'Internet').diasParaVencer], ['a_pagar', 0]);
  igual('dia 31 em fevereiro vira 28', (await chamar('/contas-fixas/mes?mes=2027-02', t)).dados.contas.find((c) => c.nome === 'Salário').vencimento, '2027-02-28');

  console.log('\n--- Pagar e desfazer ---');
  const pago = await chamar(`/contas-fixas/${aluguel.id}/pagar`, { metodo: 'POST', corpo: { mes }, ...t });
  igual('pagar aluguel', pago.status, 201);
  igual('pagar de novo no mesmo mês', (await chamar(`/contas-fixas/${aluguel.id}/pagar`, { metodo: 'POST', corpo: { mes }, ...t })).status, 409);
  igual('pagar luz com valor diferente', (await chamar(`/contas-fixas/${luz.id}/pagar`, { metodo: 'POST', corpo: { mes, valorCentavos: 21345 }, ...t })).status, 201);
  igual('Zeca tenta pagar conta da Ana', (await chamar(`/contas-fixas/${internet.id}/pagar`, { metodo: 'POST', corpo: { mes }, token: zeca.token })).status, 404);
  m = (await chamar(`/contas-fixas/mes?mes=${mes}`, t)).dados;
  igual('resumo do mês', m.resumo, { quantidade: 4, pagas: 2, atrasadas: 0, totalDespesasCentavos: 200000 + 10000 + 21345, faltaPagarCentavos: 10000 });
  const lanc = (await chamar(`/lancamentos/${pago.dados.lancamentoId}`, t)).dados.lancamento;
  igual('lançamento criado', [lanc.tipo, lanc.valorCentavos, lanc.descricao, lanc.categoria.nome, lanc.data], ['DESPESA', 200000, 'Aluguel', 'Moradia', hoje]);
  igual('desfazer (apagar o lançamento)', (await chamar(`/lancamentos/${pago.dados.lancamentoId}`, { metodo: 'DELETE', ...t })).status, 204);
  igual('aluguel volta a ficar pendente', (await chamar(`/contas-fixas/mes?mes=${mes}`, t)).dados.contas.find((c) => c.nome === 'Aluguel').situacao === 'paga', false);
  igual('desativar conta some do mês', (await chamar(`/contas-fixas/${internet.id}`, { metodo: 'PATCH', corpo: { ativa: false }, ...t })).dados.conta.ativa, false);
  igual('contas ativas no mês', (await chamar(`/contas-fixas/mes?mes=${mes}`, t)).dados.contas.map((c) => c.nome).sort(), ['Aluguel', 'Luz', 'Salário']);
  const luzLanc = (await chamar(`/lancamentos?mes=${mes}`, t)).dados.lancamentos.find((l) => l.descricao === 'Luz');
  igual('apagar conta mantém o lançamento já pago', (await chamar(`/contas-fixas/${luz.id}`, { metodo: 'DELETE', ...t })).status, 204);
  igual('lançamento da luz continua', (await chamar(`/lancamentos/${luzLanc.id}`, t)).status, 200);

  console.log('\n--- Orçamento ---');
  igual('limite no Mercado', (await chamar(`/categorias/${cats.Mercado}`, { metodo: 'PATCH', corpo: { limiteMensalCentavos: 150000 }, ...t })).dados.categoria.limiteMensalCentavos, 150000);
  await chamar(`/categorias/${cats.Lazer}`, { metodo: 'PATCH', corpo: { limiteMensalCentavos: 20000 }, ...t });
  await chamar(`/categorias/${cats.Transporte}`, { metodo: 'PATCH', corpo: { limiteMensalCentavos: 30000 }, ...t });
  igual('limite zero recusado', (await chamar(`/categorias/${cats.Mercado}`, { metodo: 'PATCH', corpo: { limiteMensalCentavos: 0 }, ...t })).status, 400);
  const L = (v, cat) => chamar('/lancamentos', { metodo: 'POST', corpo: { tipo: 'DESPESA', valorCentavos: v, data: hoje, categoriaId: cats[cat], pagoPorId: ana.usuario.id }, ...t });
  await L(120000, 'Mercado'); await L(25000, 'Lazer');
  const o = (await chamar(`/resumo?mes=${mes}`, t)).dados.orcamento;
  igual('orçamento (mais usado primeiro, inclui categoria sem gasto)', o.map((x) => `${x.categoria.nome} ${x.gastoCentavos}/${x.limiteCentavos} resta ${x.restaCentavos} ${x.percentual}%`), ['Lazer 25000/20000 resta -5000 125%', 'Mercado 120000/150000 resta 30000 80%', 'Transporte 0/30000 resta 30000 0%']);
  igual('tirar limite (null)', (await chamar(`/categorias/${cats.Transporte}`, { metodo: 'PATCH', corpo: { limiteMensalCentavos: null }, ...t })).dados.categoria.limiteMensalCentavos, null);
  igual('Transporte saiu do orçamento', (await chamar(`/resumo?mes=${mes}`, t)).dados.orcamento.length, 2);
  igual('"Sem categoria" continua null no resumo', (await chamar(`/resumo?mes=${mes}`, t)).dados.porCategoria.some((c) => c.categoria === null), true);
  igual('sem login', (await chamar('/contas-fixas')).status, 401);
} finally {
  const teste = await prisma.usuario.findMany({ where: { email: { startsWith: 'teste-' } }, select: { id: true, casalId: true } });
  const casais = [...new Set(teste.map((u) => u.casalId).filter(Boolean))];
  await prisma.lancamento.deleteMany({ where: { casalId: { in: casais } } });
  await prisma.usuario.deleteMany({ where: { id: { in: teste.map((u) => u.id) } } });
  await prisma.casal.deleteMany({ where: { id: { in: casais } } });
  if (falhas) throw new Error(`${falhas} verificação(ões) falharam: veja as linhas com ❌ acima`);
}
