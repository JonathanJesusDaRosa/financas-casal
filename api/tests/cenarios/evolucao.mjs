// Cenário de teste (rodado pelo api.test.js). Usa dados FICTÍCIOS (e-mails teste-*) e apaga tudo no final.
import { prisma } from '../../src/lib/prisma.js';
const B = process.env.TESTE_API; // endereço da API ligada pelo api.test.js
let falhas = 0;
const chamar = async (c, { metodo = 'GET', corpo, token } = {}) => { const r = await fetch(B + c, { method: metodo, headers: { 'Content-Type': 'application/json', ...(token && { Authorization: `Bearer ${token}` }) }, body: corpo ? JSON.stringify(corpo) : undefined }); const t = await r.text(); return { status: r.status, dados: t ? JSON.parse(t) : null }; };
const igual = (titulo, a, b) => { const ok = JSON.stringify(a) === JSON.stringify(b); if (!ok) falhas++; console.log(`${ok ? '✅' : '❌'} ${titulo}: ${JSON.stringify(a)}${ok ? '' : '  (esperado ' + JSON.stringify(b) + ')'}`); };
try {
  const u = (await chamar('/auth/cadastro', { metodo: 'POST', corpo: { nome: 'Ana', email: `teste-evo-${Date.now()}@exemplo.com`, senha: 'senha12345' } })).dados;
  const t = { token: u.token };
  await chamar('/casal', { metodo: 'POST', corpo: { nome: 'Casa' }, ...t });
  const L = (tipo, v, data) => chamar('/lancamentos', { metodo: 'POST', corpo: { tipo, valorCentavos: v, data, pagoPorId: u.usuario.id }, ...t });
  await L('RECEITA', 500000, '2026-09-05'); await L('DESPESA', 300000, '2026-09-30');
  await L('RECEITA', 500000, '2026-10-01'); await L('DESPESA', 550000, '2026-10-31');
  await L('DESPESA', 1000, '2026-12-01'); // fora do período
  const meta = (await chamar('/caixinhas', { metodo: 'POST', corpo: { nome: 'X', valorAlvoCentavos: 100000 }, ...t })).dados.caixinha;
  await chamar(`/caixinhas/${meta.id}/guardar`, { metodo: 'POST', corpo: { valorCentavos: 20000, data: '2026-11-03' }, ...t });
  await chamar(`/caixinhas/${meta.id}/resgatar`, { metodo: 'POST', corpo: { valorCentavos: 5000, data: '2026-11-04' }, ...t });
  const r = (await chamar('/resumo/evolucao?ate=2026-11&meses=4', t)).dados.meses;
  igual('meses em ordem', r.map((m) => m.mes), ['2026-08', '2026-09', '2026-10', '2026-11']);
  igual('agosto vazio', r[0], { mes: '2026-08', entradas: 0, saidas: 0, guardado: 0, sobra: 0 });
  igual('setembro', r[1], { mes: '2026-09', entradas: 500000, saidas: 300000, guardado: 0, sobra: 200000 });
  igual('outubro negativo', r[2].sobra, -50000);
  igual('novembro (resgate entra, guardado sai)', r[3], { mes: '2026-11', entradas: 5000, saidas: 0, guardado: 20000, sobra: -15000 });
  igual('virada de ano', (await chamar('/resumo/evolucao?ate=2027-01&meses=3', t)).dados.meses.map((m) => m.mes), ['2026-11', '2026-12', '2027-01']);
  igual('padrão 6 meses', (await chamar('/resumo/evolucao?ate=2026-11', t)).dados.meses.length, 6);
  igual('mês inválido', (await chamar('/resumo/evolucao?ate=2026-13', t)).status, 400);
  igual('confere com o resumo do mês', (await chamar('/resumo?mes=2026-10', t)).dados.totais.sobra, r[2].sobra);
} finally {
  const teste = await prisma.usuario.findMany({ where: { email: { startsWith: 'teste-' } }, select: { id: true, casalId: true } });
  const casais = [...new Set(teste.map((u) => u.casalId).filter(Boolean))];
  await prisma.lancamento.deleteMany({ where: { casalId: { in: casais } } });
  await prisma.usuario.deleteMany({ where: { id: { in: teste.map((u) => u.id) } } });
  await prisma.casal.deleteMany({ where: { casalId: undefined, id: { in: casais } } });
  if (falhas) throw new Error(`${falhas} verificação(ões) falharam: veja as linhas com ❌ acima`);
}
