// Cenário de teste (rodado pelo api.test.js). Usa dados FICTÍCIOS (e-mails teste-*) e apaga tudo no final.
// Extrato por período (semana ou datas livres): ?de=...&ate=... (os dois dias entram).
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
  const u = (await chamar('/auth/cadastro', { metodo: 'POST', corpo: { nome: 'Ana', email: `teste-extrato-${sufixo}@exemplo.com`, senha: 'senha12345' } })).dados;
  const t = { token: u.token };
  await chamar('/casal', { metodo: 'POST', corpo: { nome: 'Casa' }, ...t });
  const L = (data, valorCentavos, extra = {}) =>
    chamar('/lancamentos', { metodo: 'POST', corpo: { tipo: 'DESPESA', data, valorCentavos, pagoPorId: u.usuario.id, ...extra }, ...t });
  await L('2026-10-31', 100); // sábado antes da semana
  await L('2026-11-02', 200); // segunda (1º dia da semana)
  await L('2026-11-05', 50000, { tipo: 'RECEITA' });
  await L('2026-11-08', 300); // domingo (último dia da semana)
  await L('2026-11-09', 400); // segunda seguinte
  const cartao = (await chamar('/formas-pagamento', { metodo: 'POST', corpo: { nome: 'Cartão', tipo: 'CREDITO', diaFechamento: 3, diaVencimento: 10 }, ...t })).dados.forma;
  await L('2026-11-04', 700, { formaPagamentoId: cartao.id });

  const semana = (await chamar('/lancamentos?de=2026-11-02&ate=2026-11-08', t)).dados;
  igual('semana seg 2 a dom 8: entram os dois extremos', semana.lancamentos.map((l) => l.data), ['2026-11-08', '2026-11-05', '2026-11-04', '2026-11-02']);
  igual('totais da semana', semana.totais, { entradas: 50000, saidas: 500, noCartao: 700, guardado: 0, sobra: 49500, rendimento: 0 });
  igual('devolve o período e mes null', [semana.periodo, semana.mes], [{ de: '2026-11-02', ate: '2026-11-08' }, null]);
  igual('semana que atravessa o mês (26/10 a 01/11)', (await chamar('/lancamentos?de=2026-10-26&ate=2026-11-01', t)).dados.lancamentos.map((l) => l.data), ['2026-10-31']);
  igual('um dia só', (await chamar('/lancamentos?de=2026-11-09&ate=2026-11-09', t)).dados.totais.saidas, 400);
  igual('mês continua funcionando (com período)', (await chamar('/lancamentos?mes=2026-11', t)).dados.periodo, { de: '2026-11-01', ate: '2026-11-30' });
  igual('início depois do fim: recusado', (await chamar('/lancamentos?de=2026-11-09&ate=2026-11-02', t)).status, 400);
  igual('só uma das datas: recusado', (await chamar('/lancamentos?de=2026-11-02', t)).status, 400);
  igual('data inválida: recusado', (await chamar('/lancamentos?de=2026-02-30&ate=2026-03-02', t)).status, 400);
  igual('mais de 1 ano: recusado', (await chamar('/lancamentos?de=2025-01-01&ate=2026-11-09', t)).status, 400);
  igual('exatamente 1 ano (366 dias): aceito', (await chamar('/lancamentos?de=2025-11-09&ate=2026-11-09', t)).status, 200);
} finally {
  const teste = await prisma.usuario.findMany({ where: { email: { startsWith: 'teste-' } }, select: { id: true, casalId: true } });
  const casais = [...new Set(teste.map((u) => u.casalId).filter(Boolean))];
  await prisma.lancamento.deleteMany({ where: { casalId: { in: casais } } });
  await prisma.usuario.deleteMany({ where: { id: { in: teste.map((u) => u.id) } } });
  await prisma.casal.deleteMany({ where: { id: { in: casais } } });
  if (falhas) throw new Error(`${falhas} verificação(ões) falharam: veja as linhas com ❌ acima`);
}
