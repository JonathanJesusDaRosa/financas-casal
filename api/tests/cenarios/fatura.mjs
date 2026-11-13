// Cenário de teste (rodado pelo api.test.js). Usa dados FICTÍCIOS (e-mails teste-*) e apaga tudo no final.
// Fatura do cartão: compra no crédito vai para a fatura (não conta no "Saiu"),
// parcelas em faturas seguidas, pagar a fatura inteira (aí sim conta no "Saiu").
import { prisma } from '../../src/lib/prisma.js';

const B = process.env.TESTE_API; // endereço da API ligada pelo api.test.js
const sufixo = Date.now();
let falhas = 0;
const chamar = async (c, { metodo = 'GET', corpo, token } = {}) => {
  const r = await fetch(B + c, { method: metodo, headers: { 'Content-Type': 'application/json', ...(token && { Authorization: `Bearer ${token}` }) }, body: corpo ? JSON.stringify(corpo) : undefined });
  const t = await r.text();
  return { status: r.status, dados: t ? JSON.parse(t) : null };
};
const igual = (titulo, a, b) => {
  const ok = JSON.stringify(a) === JSON.stringify(b);
  if (!ok) falhas++;
  console.log(`${ok ? '✅' : '❌'} ${titulo}: ${JSON.stringify(a)}${ok ? '' : '  (esperado ' + JSON.stringify(b) + ')'}`);
};

try {
  const ana = (await chamar('/auth/cadastro', { metodo: 'POST', corpo: { nome: 'Ana', email: `teste-ana-${sufixo}@exemplo.com`, senha: 'senha12345' } })).dados;
  const t = { token: ana.token };
  await chamar('/casal', { metodo: 'POST', corpo: { nome: 'Casa' }, ...t });
  const zeca = (await chamar('/auth/cadastro', { metodo: 'POST', corpo: { nome: 'Zeca', email: `teste-zeca-${sufixo}@exemplo.com`, senha: 'senha12345' } })).dados;
  await chamar('/casal', { metodo: 'POST', corpo: { nome: 'Outra' }, token: zeca.token });
  const cats = Object.fromEntries((await chamar('/categorias', t)).dados.categorias.map((c) => [c.nome, c.id]));
  const formas = Object.fromEntries((await chamar('/formas-pagamento', t)).dados.formas.map((f) => [f.nome, f]));
  const compra = (corpo) => chamar('/lancamentos', { metodo: 'POST', corpo: { tipo: 'DESPESA', pagoPorId: ana.usuario.id, categoriaId: cats.Mercado, ...corpo }, ...t });
  const resumo = async (mes) => (await chamar(`/resumo?mes=${mes}`, t)).dados.totais;

  console.log('\n--- Cartão precisa de fechamento e vencimento ---');
  const semDias = (await chamar('/formas-pagamento', { metodo: 'POST', corpo: { nome: 'Cartão sem dias', tipo: 'CREDITO' }, ...t })).dados.forma;
  igual('crédito sem os dias: recusado', (await compra({ valorCentavos: 100, data: '2026-11-02', formaPagamentoId: semDias.id })).status, 400);
  const nubank = (await chamar('/formas-pagamento', { metodo: 'POST', corpo: { nome: 'Nubank', tipo: 'CREDITO', diaFechamento: 3, diaVencimento: 10 }, ...t })).dados.forma;
  igual('cartão com os dias', [nubank.diaFechamento, nubank.diaVencimento], [3, 10]);
  igual('dias no Pix são ignorados', (await chamar('/formas-pagamento', { metodo: 'POST', corpo: { nome: 'Pix 2', tipo: 'PIX', diaFechamento: 3 }, ...t })).dados.forma.diaFechamento, null);

  console.log('\n--- Compra no cartão vai para a fatura ---');
  const c1 = (await compra({ valorCentavos: 30000, data: '2026-11-02', formaPagamentoId: nubank.id })).dados.lancamento;
  const c2 = (await compra({ valorCentavos: 20000, data: '2026-11-05', formaPagamentoId: nubank.id })).dados.lancamento;
  igual('antes do fechamento (dia 2) -> fatura de nov', c1.faturaMes, '2026-11');
  igual('depois do fechamento (dia 5) -> fatura de dez', c2.faturaMes, '2026-12');
  const nov = await resumo('2026-11');
  igual('novembro: não conta no Saiu, conta como consumo', [nov.saidas, nov.noCartao, nov.consumo], [0, 50000, 50000]);
  igual('gastos por categoria contam a compra (consumo)', (await chamar('/resumo?mes=2026-11', t)).dados.porCategoria[0].totalCentavos, 50000);

  console.log('\n--- Parcelado no cartão ---');
  const p = (await compra({ valorCentavos: 100000, parcelas: 3, data: '2026-11-20', formaPagamentoId: nubank.id, descricao: 'Geladeira' })).dados;
  igual('3 parcelas criadas', p.parcelasCriadas, 3);
  const parcelas = await prisma.lancamento.findMany({ where: { grupoParcelas: { not: null }, casal: { usuarios: { some: { id: ana.usuario.id } } } }, orderBy: { parcela: 'asc' } });
  igual('valores (centavos que sobram na 1ª)', parcelas.map((x) => x.valorCentavos), [33334, 33333, 33333]);
  igual('uma parcela por fatura', parcelas.map((x) => x.faturaMes), ['2026-12', '2027-01', '2027-02']);
  igual('datas mês a mês', parcelas.map((x) => x.data.toISOString().slice(0, 10)), ['2026-11-20', '2026-12-20', '2027-01-20']);
  igual('parcelar no Pix: recusado', (await compra({ valorCentavos: 300, parcelas: 3, data: '2026-11-20', formaPagamentoId: formas.Pix.id })).status, 400);

  console.log('\n--- Fatura e pagamento ---');
  const fDez = (await chamar(`/faturas/${nubank.id}?mes=2026-12`, t)).dados;
  igual('fatura de dez: compra do dia 5 + 1ª parcela', [fDez.fatura.totalCentavos, fDez.compras.length], [20000 + 33334, 2]);
  igual('datas da fatura de dez', [fDez.fatura.fechamento, fDez.fatura.vencimento], ['2026-12-03', '2026-12-10']);
  const lista = (await chamar('/faturas', t)).dados.cartoes.find((c) => c.cartao.id === nubank.id);
  igual('lista de faturas do cartão tem as parcelas futuras', lista.faturas.some((f) => f.mes === '2027-02'), true);
  igual('pagar fatura de dez', (await chamar(`/faturas/${nubank.id}/pagar`, { metodo: 'POST', corpo: { mes: '2026-12', data: '2026-12-10' }, ...t })).status, 201);
  igual('pagar de novo: recusado', (await chamar(`/faturas/${nubank.id}/pagar`, { metodo: 'POST', corpo: { mes: '2026-12' }, ...t })).status, 409);
  igual('pagar fatura vazia: recusado', (await chamar(`/faturas/${nubank.id}/pagar`, { metodo: 'POST', corpo: { mes: '2027-06' }, ...t })).status, 400);
  const dez = await resumo('2026-12');
  igual('dezembro: Saiu = pagamento da fatura; 2ª parcela é consumo', [dez.saidas, dez.noCartao], [53334, 33333]);
  const extratoDez = (await chamar('/lancamentos?mes=2026-12', t)).dados;
  igual('extrato de dez: mesmos totais', [extratoDez.totais.saidas, extratoDez.totais.noCartao], [53334, 33333]);
  const pagamento = extratoDez.lancamentos.find((l) => l.tipo === 'FATURA');
  igual('pagamento aparece no extrato', [pagamento.descricao, pagamento.competencia], ['Fatura Nubank', '2026-12']);
  igual('compras no cartão NÃO aparecem na lista do extrato', extratoDez.lancamentos.filter((l) => l.faturaMes).length, 0);
  igual('extrato de nov também sem compras no cartão', (await chamar('/lancamentos?mes=2026-11', t)).dados.lancamentos.length, 0);
  igual('evolução de dez: Saiu = fatura paga', (await chamar('/resumo/evolucao?ate=2026-12&meses=2', t)).dados.meses[1].saidas, 53334);
  igual('editar o pagamento pela rota de lançamentos: recusado', (await chamar(`/lancamentos/${pagamento.id}`, { metodo: 'PATCH', corpo: { valorCentavos: 1 }, ...t })).status, 400);
  igual('apagar o pagamento pela rota de lançamentos: recusado', (await chamar(`/lancamentos/${pagamento.id}`, { metodo: 'DELETE', ...t })).status, 400);
  const contasDez = (await chamar('/contas-fixas/mes?mes=2026-12', t)).dados;
  igual('fatura aparece nas contas do mês, paga', contasDez.faturas.map((f) => [f.cartao.nome, f.situacao, f.totalCentavos]), [['Nubank', 'paga', 53334]]);
  igual('desfazer pagamento', (await chamar(`/faturas/${nubank.id}/pagamento?mes=2026-12`, { metodo: 'DELETE', ...t })).status, 204);
  igual('dezembro volta a Saiu 0', (await resumo('2026-12')).saidas, 0);

  console.log('\n--- Extrato do cartão pela data da compra ---');
  await compra({ valorCentavos: 1500, data: '2026-12-15', formaPagamentoId: nubank.id, descricao: 'Farmácia' });
  const fJan = (await chamar(`/faturas/${nubank.id}?mes=2027-01`, t)).dados;
  igual('fatura de jan: compra de 15/dez antes da parcela 2/3 (comprada em 20/nov)',
    fJan.compras.map((c) => [c.descricao, c.data, c.dataCompra]),
    [['Farmácia', '2026-12-15', '2026-12-15'], ['Geladeira', '2026-12-20', '2026-11-20']]);
  await prisma.lancamento.delete({ where: { id: parcelas[0].id } }); // some a parcela 1
  const fJan2 = (await chamar(`/faturas/${nubank.id}?mes=2027-01`, t)).dados;
  igual('sem a parcela 1, a data da compra é calculada voltando os meses',
    fJan2.compras.find((c) => c.descricao === 'Geladeira').dataCompra, '2026-11-20');

  console.log('\n--- Editar e apagar ---');
  igual('mudar data da compra (2 -> 4/nov) muda a fatura', (await chamar(`/lancamentos/${c1.id}`, { metodo: 'PATCH', corpo: { data: '2026-11-04' }, ...t })).dados.lancamento.faturaMes, '2026-12');
  igual('trocar para Pix sai da fatura', (await chamar(`/lancamentos/${c1.id}`, { metodo: 'PATCH', corpo: { formaPagamentoId: formas.Pix.id }, ...t })).dados.lancamento.faturaMes, null);
  igual('aí conta no Saiu de novembro', (await resumo('2026-11')).saidas, 30000);
  igual('apagar todas as parcelas', (await chamar(`/lancamentos/${parcelas[1].id}?todasParcelas=1`, { metodo: 'DELETE', ...t })).status, 204);
  igual('fatura de fev ficou vazia', (await chamar(`/faturas/${nubank.id}?mes=2027-02`, t)).dados.fatura.totalCentavos, 0);

  console.log('\n--- Conta fixa paga no cartão ---');
  const hoje = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date());
  const netflix = (await chamar('/contas-fixas', { metodo: 'POST', corpo: { nome: 'Streaming', valorCentavos: 5590, diaVencimento: 15, formaPagamentoId: nubank.id }, ...t })).dados.conta;
  const pago = (await chamar(`/contas-fixas/${netflix.id}/pagar`, { metodo: 'POST', corpo: { mes: hoje.slice(0, 7) }, ...t })).dados;
  const lNetflix = (await chamar(`/lancamentos/${pago.lancamentoId}`, t)).dados.lancamento;
  igual('vai para a fatura do cartão', Boolean(lNetflix.faturaMes), true);

  console.log('\n--- Outros cartões e segurança ---');
  const itau = (await chamar('/formas-pagamento', { metodo: 'POST', corpo: { nome: 'Itaú', tipo: 'CREDITO', diaFechamento: 28, diaVencimento: 5 }, ...t })).dados.forma;
  igual('fecha 28, vence 5: compra 29/nov -> fatura de jan', (await compra({ valorCentavos: 1000, data: '2026-11-29', formaPagamentoId: itau.id })).dados.lancamento.faturaMes, '2027-01');
  igual('Zeca não vê fatura da Ana', (await chamar(`/faturas/${nubank.id}`, { token: zeca.token })).status, 404);
  igual('Zeca não paga fatura da Ana', (await chamar(`/faturas/${nubank.id}/pagar`, { metodo: 'POST', corpo: { mes: '2026-12' }, token: zeca.token })).status, 404);
  igual('cartão com compras não pode ser apagado', (await chamar(`/formas-pagamento/${nubank.id}`, { metodo: 'DELETE', ...t })).status, 409);
  igual('nem virar débito', (await chamar(`/formas-pagamento/${nubank.id}`, { metodo: 'PATCH', corpo: { tipo: 'DEBITO' }, ...t })).status, 409);
  igual('mas pode ser renomeado', (await chamar(`/formas-pagamento/${nubank.id}`, { metodo: 'PATCH', corpo: { nome: 'Nubank Roxinho' }, ...t })).status, 200);
} finally {
  const teste = await prisma.usuario.findMany({ where: { email: { startsWith: 'teste-' } }, select: { id: true, casalId: true } });
  const casais = [...new Set(teste.map((u) => u.casalId).filter(Boolean))];
  await prisma.lancamento.deleteMany({ where: { casalId: { in: casais } } });
  await prisma.usuario.deleteMany({ where: { id: { in: teste.map((u) => u.id) } } });
  await prisma.casal.deleteMany({ where: { id: { in: casais } } });
  if (falhas) throw new Error(`${falhas} verificação(ões) falharam: veja as linhas com ❌ acima`);
}
