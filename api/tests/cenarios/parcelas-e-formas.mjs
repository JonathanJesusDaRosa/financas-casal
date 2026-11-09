// Cenário de teste (rodado pelo api.test.js). Usa dados FICTÍCIOS (e-mails teste-*) e apaga tudo no final.
// Teste: parcelas, início sem retroativo, ajuste do valor do mês e formas de pagamento.
import { prisma } from '../../src/lib/prisma.js';
const B = process.env.TESTE_API; // endereço da API ligada pelo api.test.js
const sufixo = Date.now();
let falhas = 0;
const chamar = async (c, { metodo = 'GET', corpo, token } = {}) => { const r = await fetch(B + c, { method: metodo, headers: { 'Content-Type': 'application/json', ...(token && { Authorization: `Bearer ${token}` }) }, body: corpo ? JSON.stringify(corpo) : undefined }); const t = await r.text(); return { status: r.status, dados: t ? JSON.parse(t) : null }; };
const igual = (titulo, a, b) => { const ok = JSON.stringify(a) === JSON.stringify(b); if (!ok) falhas++; console.log(`${ok ? '✅' : '❌'} ${titulo}: ${JSON.stringify(a)}${ok ? '' : '  (esperado ' + JSON.stringify(b) + ')'}`); };
const mais = (mes, n) => { const [a, m] = mes.split('-').map(Number); return new Date(Date.UTC(a, m - 1 + n, 1)).toISOString().slice(0, 7); };
const hoje = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date());
const mes = hoje.slice(0, 7);

try {
  const ana = (await chamar('/auth/cadastro', { metodo: 'POST', corpo: { nome: 'Ana', email: `teste-ana-${sufixo}@exemplo.com`, senha: 'senha12345' } })).dados;
  const t = { token: ana.token };
  await chamar('/casal', { metodo: 'POST', corpo: { nome: 'Casa' }, ...t });
  const zeca = (await chamar('/auth/cadastro', { metodo: 'POST', corpo: { nome: 'Zeca', email: `teste-zeca-${sufixo}@exemplo.com`, senha: 'senha12345' } })).dados;
  await chamar('/casal', { metodo: 'POST', corpo: { nome: 'Outra' }, token: zeca.token });

  console.log('\n--- Formas de pagamento ---');
  const formas = (await chamar('/formas-pagamento', t)).dados.formas;
  igual('casa nova já vem com 5 formas', formas.map((f) => `${f.nome}/${f.tipo}`), ['Pix/PIX', 'Débito/DEBITO', 'Crédito/CREDITO', 'Dinheiro/DINHEIRO', 'Boleto/BOLETO']);
  const nubank = (await chamar('/formas-pagamento', { metodo: 'POST', corpo: { nome: 'Nubank Crédito', tipo: 'CREDITO', diaFechamento: 3, diaVencimento: 10 }, ...t })).dados.forma;
  igual('criar cartão', [nubank.nome, nubank.tipo], ['Nubank Crédito', 'CREDITO']);
  igual('nome repetido', (await chamar('/formas-pagamento', { metodo: 'POST', corpo: { nome: 'Pix', tipo: 'PIX' }, ...t })).status, 409);
  igual('tipo inválido', (await chamar('/formas-pagamento', { metodo: 'POST', corpo: { nome: 'X', tipo: 'CHEQUE' }, ...t })).status, 400);
  const pix = formas.find((f) => f.tipo === 'PIX');
  const formaZeca = (await chamar('/formas-pagamento', { token: zeca.token })).dados.formas[0];
  igual('Zeca não edita forma da Ana', (await chamar(`/formas-pagamento/${pix.id}`, { metodo: 'PATCH', corpo: { nome: 'Hack' }, token: zeca.token })).status, 404);

  console.log('\n--- Lançamento com forma ---');
  const L = (corpo) => chamar('/lancamentos', { metodo: 'POST', corpo: { tipo: 'DESPESA', data: hoje, pagoPorId: ana.usuario.id, ...corpo }, ...t });
  const l1 = (await L({ valorCentavos: 30000, formaPagamentoId: nubank.id })).dados.lancamento;
  igual('lançamento guarda a forma', l1.formaPagamento.nome, 'Nubank Crédito');
  await L({ valorCentavos: 10000, formaPagamentoId: pix.id });
  await L({ valorCentavos: 5000 });
  igual('forma de outra casa recusada', (await L({ valorCentavos: 100, formaPagamentoId: formaZeca.id })).status, 400);

  console.log('\n--- Nada retroativo ---');
  const nova = (corpo) => chamar('/contas-fixas', { metodo: 'POST', corpo: { nome: 'X', valorCentavos: 10000, diaVencimento: 10, ...corpo }, ...t });
  igual('começar no mês passado: recusado', (await nova({ mesInicio: mais(mes, -1) })).status, 400);
  const internet = (await nova({ nome: 'Internet' })).dados.conta;
  igual('padrão começa no mês atual', internet.mesInicio, mes);
  igual('não aparece no mês anterior', (await chamar(`/contas-fixas/mes?mes=${mais(mes, -1)}`, t)).dados.contas.length, 0);
  igual('aparece daqui 2 anos (sem fim)', (await chamar(`/contas-fixas/mes?mes=${mais(mes, 24)}`, t)).dados.contas.map((c) => c.nome), ['Internet']);
  igual('editar início para o passado: recusado', (await chamar(`/contas-fixas/${internet.id}`, { metodo: 'PATCH', corpo: { mesInicio: mais(mes, -2) }, ...t })).status, 400);

  console.log('\n--- Parcelas ---');
  const geladeira = (await nova({ nome: 'Geladeira', valorCentavos: 100000, totalParcelas: 8, formaPagamentoId: nubank.id, mesInicio: mais(mes, 1) })).dados.conta;
  igual('8x começando mês que vem: termina em +8', geladeira.mesFinal, mais(mes, 8));
  igual('não aparece neste mês', (await chamar(`/contas-fixas/mes?mes=${mes}`, t)).dados.contas.some((c) => c.nome === 'Geladeira'), false);
  const parcela = async (m) => (await chamar(`/contas-fixas/mes?mes=${m}`, t)).dados.contas.find((c) => c.nome === 'Geladeira')?.parcela ?? 'não aparece';
  igual('parcelas 1, 2 e 8', [await parcela(mais(mes, 1)), await parcela(mais(mes, 2)), await parcela(mais(mes, 8))], [1, 2, 8]);
  igual('depois da 8ª some', await parcela(mais(mes, 9)), 'não aparece');
  const tv = (await nova({ nome: 'TV', valorCentavos: 50000, totalParcelas: 10, parcelaInicial: 3 })).dados.conta;
  igual('TV 10x começando na 3ª: 8 meses', tv.mesFinal, mais(mes, 7));
  igual('parcela inicial maior que o total: recusado', (await nova({ totalParcelas: 5, parcelaInicial: 6 })).status, 400);
  igual('0 parcelas: recusado', (await nova({ totalParcelas: 0 })).status, 400);

  console.log('\n--- Ajustar valor do mês e pagar ---');
  const luz = (await nova({ nome: 'Luz', valorCentavos: 12000, formaPagamentoId: pix.id })).dados.conta;
  const vLuz = async () => (await chamar(`/contas-fixas/mes?mes=${mes}`, t)).dados.contas.find((c) => c.nome === 'Luz');
  igual('previsto R$ 120', [(await vLuz()).valorDoMes, (await vLuz()).valorAjustado], [12000, false]);
  igual('ajustar para R$ 102', (await chamar(`/contas-fixas/${luz.id}/valor-mes`, { metodo: 'PUT', corpo: { mes, valorCentavos: 10200 }, ...t })).status, 200);
  igual('valor do mês ajustado', [(await vLuz()).valorDoMes, (await vLuz()).valorAjustado], [10200, true]);
  igual('próximo mês continua R$ 120', (await chamar(`/contas-fixas/mes?mes=${mais(mes, 1)}`, t)).dados.contas.find((c) => c.nome === 'Luz').valorDoMes, 12000);
  const pago = (await chamar(`/contas-fixas/${luz.id}/pagar`, { metodo: 'POST', corpo: { mes }, ...t })).dados;
  const lLuz = (await chamar(`/lancamentos/${pago.lancamentoId}`, t)).dados.lancamento;
  igual('pagar usa o valor ajustado e a forma de costume', [lLuz.valorCentavos, lLuz.formaPagamento?.nome], [10200, 'Pix']);
  igual('ajustar depois de pago: recusado', (await chamar(`/contas-fixas/${luz.id}/valor-mes`, { metodo: 'PUT', corpo: { mes, valorCentavos: 1 }, ...t })).status, 409);
  igual('ajustar mês fora do período: recusado', (await chamar(`/contas-fixas/${geladeira.id}/valor-mes`, { metodo: 'PUT', corpo: { mes, valorCentavos: 1 }, ...t })).status, 400);
  const pg = (await chamar(`/contas-fixas/${geladeira.id}/pagar`, { metodo: 'POST', corpo: { mes: mais(mes, 3), formaPagamentoId: null }, ...t })).dados;
  const lG = (await chamar(`/lancamentos/${pg.lancamentoId}`, t)).dados.lancamento;
  igual('parcela 3/8 na descrição; forma pode ser tirada', [lG.descricao, lG.formaPagamento], ['Geladeira (3/8)', null]);
  igual('pagar mês sem parcela: recusado', (await chamar(`/contas-fixas/${geladeira.id}/pagar`, { metodo: 'POST', corpo: { mes }, ...t })).status, 400);
  igual('voltar ao valor de costume', (await chamar(`/contas-fixas/${internet.id}/valor-mes?mes=${mes}`, { metodo: 'DELETE', ...t })).status, 204);

  console.log('\n--- Análise por forma de pagamento ---');
  const r = (await chamar(`/resumo?mes=${mes}`, t)).dados;
  igual('saídas por forma (inclui a parcela 3 paga hoje sem forma)', r.porFormaPagamento.map((f) => `${f.forma?.nome ?? 'Não informada'} ${f.totalCentavos}`), ['Não informada 105000', 'Nubank Crédito 30000', 'Pix 20200']);
  igual('cartão com compras em faturas não pode ser apagado', (await chamar(`/formas-pagamento/${nubank.id}`, { metodo: 'DELETE', ...t })).status, 409);
  const lPix = (await chamar(`/lancamentos?mes=${mes}`, t)).dados.lancamentos.find((l) => l.formaPagamento?.nome === 'Pix' && l.tipo === 'DESPESA' && !l.contaFixaId);
  igual('apagar forma (Pix) mantém lançamento', (await chamar(`/formas-pagamento/${pix.id}`, { metodo: 'DELETE', ...t })).status, 204);
  igual('lançamento fica sem forma', (await chamar(`/lancamentos/${lPix.id}`, t)).dados.lancamento.formaPagamento, null);
  igual('sem login', (await chamar('/formas-pagamento')).status, 401);
} finally {
  const teste = await prisma.usuario.findMany({ where: { email: { startsWith: 'teste-' } }, select: { id: true, casalId: true } });
  const casais = [...new Set(teste.map((u) => u.casalId).filter(Boolean))];
  await prisma.lancamento.deleteMany({ where: { casalId: { in: casais } } });
  await prisma.usuario.deleteMany({ where: { id: { in: teste.map((u) => u.id) } } });
  await prisma.casal.deleteMany({ where: { id: { in: casais } } });
  if (falhas) throw new Error(`${falhas} verificação(ões) falharam: veja as linhas com ❌ acima`);
}
