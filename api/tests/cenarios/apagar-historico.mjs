// Cenário de teste (rodado pelo api.test.js). Usa dados FICTÍCIOS (e-mails teste-*) e apaga tudo no final.
// "Apagar dados": apaga TODOS os lançamentos da casa (e os ajustes de valor do mês),
// mas mantém casa, membros, categorias, formas, contas fixas, metas e investimentos.
// E não pode tocar em NADA de outra casa.
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

// Cria uma casa com um pouco de tudo
async function casaCheia(nome) {
  const u = (await chamar('/auth/cadastro', { metodo: 'POST', corpo: { nome, email: `teste-${nome.toLowerCase()}-${sufixo}@exemplo.com`, senha: 'senha12345' } })).dados;
  const t = { token: u.token };
  await chamar('/casal', { metodo: 'POST', corpo: { nome: `Casa ${nome}` }, ...t });
  const hoje = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date());
  const mes = hoje.slice(0, 7);
  const L = (corpo) => chamar('/lancamentos', { metodo: 'POST', corpo: { tipo: 'DESPESA', data: hoje, pagoPorId: u.usuario.id, valorCentavos: 1000, ...corpo }, ...t });
  await L({}); await L({ tipo: 'RECEITA', valorCentavos: 50000 });
  const cartao = (await chamar('/formas-pagamento', { metodo: 'POST', corpo: { nome: 'Cartão', tipo: 'CREDITO', diaFechamento: 3, diaVencimento: 10 }, ...t })).dados.forma;
  await L({ formaPagamentoId: cartao.id, parcelas: 3, valorCentavos: 3000 });
  const meta = (await chamar('/caixinhas', { metodo: 'POST', corpo: { nome: 'Viagem', valorAlvoCentavos: 100000 }, ...t })).dados.caixinha;
  await chamar(`/caixinhas/${meta.id}/guardar`, { metodo: 'POST', corpo: { valorCentavos: 5000, data: hoje }, ...t });
  const conta = (await chamar('/contas-fixas', { metodo: 'POST', corpo: { nome: 'Internet', valorCentavos: 10000, diaVencimento: 10 }, ...t })).dados.conta;
  await chamar(`/contas-fixas/${conta.id}/valor-mes`, { metodo: 'PUT', corpo: { mes, valorCentavos: 9000 }, ...t });
  await chamar(`/contas-fixas/${conta.id}/pagar`, { metodo: 'POST', corpo: { mes }, ...t });
  return { u, t, mes, meta, conta };
}

try {
  const ana = await casaCheia('Ana');
  const zeca = await casaCheia('Zeca');
  const contar = (casa) => prisma.lancamento.count({ where: { casal: { usuarios: { some: { id: casa.u.usuario.id } } } } });
  const antesAna = await contar(ana);
  const antesZeca = await contar(zeca);
  igual('as duas casas têm lançamentos', [antesAna > 0, antesZeca > 0], [true, true]);

  igual('sem confirmação: recusado', (await chamar('/casal/lancamentos', { metodo: 'DELETE', ...ana.t })).status, 400);
  igual('nome errado: recusado', (await chamar('/casal/lancamentos', { metodo: 'DELETE', corpo: { confirmacao: 'Casa Zeca' }, ...ana.t })).status, 400);
  igual('nada foi apagado', await contar(ana), antesAna);
  const r = await chamar('/casal/lancamentos', { metodo: 'DELETE', corpo: { confirmacao: '  casa ana ' }, ...ana.t });
  igual('nome certo (maiúsculas e espaços não importam): apaga', [r.status, r.dados.apagados], [200, antesAna]);

  igual('Ana: nenhum lançamento', await contar(ana), 0);
  igual('Ana: meta continua, zerada', (await chamar(`/caixinhas/${ana.meta.id}`, ana.t)).dados.caixinha.saldoCentavos, 0);
  const contaMes = (await chamar(`/contas-fixas/mes?mes=${ana.mes}`, ana.t)).dados.contas.find((c) => c.nome === 'Internet');
  igual('Ana: conta fixa continua, a pagar e sem ajuste', [contaMes.situacao === 'paga', contaMes.valorAjustado, contaMes.valorDoMes], [false, false, 10000]);
  igual('Ana: categorias e formas continuam', [(await chamar('/categorias', ana.t)).dados.categorias.length, (await chamar('/formas-pagamento', ana.t)).dados.formas.length], [6, 5]);
  igual('Ana: continua na casa', (await chamar('/auth/eu', ana.t)).dados.usuario.casalId !== null, true);
  igual('Zeca: NADA mudou', await contar(zeca), antesZeca);
  igual('sem login: recusado', (await chamar('/casal/lancamentos', { metodo: 'DELETE', corpo: { confirmacao: 'x' } })).status, 401);
} finally {
  const teste = await prisma.usuario.findMany({ where: { email: { startsWith: 'teste-' } }, select: { id: true, casalId: true } });
  const casais = [...new Set(teste.map((u) => u.casalId).filter(Boolean))];
  await prisma.lancamento.deleteMany({ where: { casalId: { in: casais } } });
  await prisma.usuario.deleteMany({ where: { id: { in: teste.map((u) => u.id) } } });
  await prisma.casal.deleteMany({ where: { id: { in: casais } } });
  if (falhas) throw new Error(`${falhas} verificação(ões) falharam: veja as linhas com ❌ acima`);
}
