// Cenário de teste (rodado pelo api.test.js). Usa dados FICTÍCIOS (e-mails teste-*) e apaga tudo no final.
// Teste: rota /resumo e ícones de categoria.
import { prisma } from '../../src/lib/prisma.js';
const B = process.env.TESTE_API; // endereço da API ligada pelo api.test.js
const sufixo = Date.now();
let falhas = 0;
const chamar = async (c, { metodo = 'GET', corpo, token } = {}) => {
  const r = await fetch(B + c, { method: metodo, headers: { 'Content-Type': 'application/json', ...(token && { Authorization: `Bearer ${token}` }) }, body: corpo ? JSON.stringify(corpo) : undefined });
  const t = await r.text(); return { status: r.status, dados: t ? JSON.parse(t) : null };
};
const igual = (titulo, a, b) => { const ok = JSON.stringify(a) === JSON.stringify(b); if (!ok) falhas++; console.log(`${ok ? '✅' : '❌'} ${titulo}: ${JSON.stringify(a)}${ok ? '' : ' (esperado ' + JSON.stringify(b) + ')'}`); };
try {
  const { dados: u } = await chamar('/auth/cadastro', { metodo: 'POST', corpo: { nome: 'Bia', email: `teste-bia-${sufixo}@exemplo.com`, senha: 'senha12345' } });
  const t = { token: u.token };
  const casa = await chamar('/casal', { metodo: 'POST', corpo: { nome: 'Casa da Bia' }, ...t });
  igual('casa criada', casa.status, 201);
  const cats = (await chamar('/categorias', t)).dados.categorias;
  igual('categorias padrão com ícone', cats.map((c) => `${c.nome}:${c.icone}`), ['Lazer:lazer', 'Mercado:carrinho', 'Moradia:casa', 'Salário:salario', 'Saúde:saude', 'Transporte:carro']);
  const pet = (await chamar('/categorias', { metodo: 'POST', corpo: { nome: 'Pet', icone: 'pet' }, ...t })).dados.categoria;
  igual('nova categoria com ícone', pet.icone, 'pet');
  igual('ícone inválido', (await chamar('/categorias', { metodo: 'POST', corpo: { nome: 'X', icone: '🐶' }, ...t })).status, 400);
  igual('troca ícone', (await chamar(`/categorias/${pet.id}`, { metodo: 'PATCH', corpo: { icone: 'presente' }, ...t })).dados.categoria.icone, 'presente');
  const sem = (await chamar('/categorias', { metodo: 'POST', corpo: { nome: 'Sem ícone' }, ...t })).dados.categoria;
  igual('sem ícone vira "etiqueta"', sem.icone, 'etiqueta');

  const mercado = cats.find((c) => c.nome === 'Mercado');
  const moradia = cats.find((c) => c.nome === 'Moradia');
  const base = { tipo: 'DESPESA', data: '2026-10-10', pagoPorId: u.usuario.id };
  await chamar('/lancamentos', { metodo: 'POST', corpo: { ...base, valorCentavos: 30000, categoriaId: mercado.id }, ...t });
  await chamar('/lancamentos', { metodo: 'POST', corpo: { ...base, valorCentavos: 20000, categoriaId: mercado.id, data: '2026-10-20' }, ...t });
  await chamar('/lancamentos', { metodo: 'POST', corpo: { ...base, valorCentavos: 150000, categoriaId: moradia.id }, ...t });
  await chamar('/lancamentos', { metodo: 'POST', corpo: { ...base, valorCentavos: 50000, categoriaId: null }, ...t });
  await chamar('/lancamentos', { metodo: 'POST', corpo: { ...base, tipo: 'RECEITA', valorCentavos: 600000 }, ...t });
  await chamar('/lancamentos', { metodo: 'POST', corpo: { ...base, valorCentavos: 9900, data: '2026-11-01', categoriaId: mercado.id }, ...t });
  const meta = (await chamar('/caixinhas', { metodo: 'POST', corpo: { nome: 'Viagem', icone: 'aviao', valorAlvoCentavos: 100000 }, ...t })).dados.caixinha;
  await chamar(`/caixinhas/${meta.id}/guardar`, { metodo: 'POST', corpo: { valorCentavos: 40000, data: '2026-10-25' }, ...t });

  const r = await chamar('/resumo?mes=2026-10', t);
  igual('status', r.status, 200);
  igual('totais outubro', r.dados.totais, { entradas: 600000, saidas: 250000, noCartao: 0, consumo: 250000, guardado: 40000, sobra: 310000, rendimento: 0, saldoAnterior: 0, saldoAcumulado: 310000 });
  const nov = (await chamar('/resumo?mes=2026-11', t)).dados.totais;
  igual('novembro: veio de outubro a sobra (310.000) e acumula com o mês (−9.900)', [nov.saldoAnterior, nov.saldoAcumulado], [310000, 300100]);
  await chamar('/lancamentos', { metodo: 'POST', corpo: { ...base, valorCentavos: 10000, data: '2026-10-28' }, ...t }); // lançado atrasado em outubro
  igual('lançamento atrasado em outubro corrige novembro sozinho', (await chamar('/resumo?mes=2026-11', t)).dados.totais.saldoAnterior, 300000);
  igual('por categoria (maior primeiro)', r.dados.porCategoria.map((c) => `${c.categoria?.nome ?? 'Sem categoria'} ${c.totalCentavos} ${c.percentual}%`), ['Moradia 150000 60%', 'Mercado 50000 20%', 'Sem categoria 50000 20%']);
  igual('ícone na categoria', r.dados.porCategoria[0].categoria.icone, 'casa');
  igual('últimos (5, mais novo primeiro)', r.dados.ultimos.map((l) => `${l.data} ${l.tipo}`), ['2026-10-25 GUARDADO', '2026-10-20 DESPESA', '2026-10-10 RECEITA', '2026-10-10 DESPESA', '2026-10-10 DESPESA']);
  igual('novembro separado', (await chamar('/resumo?mes=2026-11', t)).dados.totais.saidas, 9900);
  igual('mês inválido', (await chamar('/resumo?mes=2026-13', t)).status, 400);
  igual('sem login', (await chamar('/resumo')).status, 401);
  igual('mensagem nova (casa)', (await chamar('/casal', { metodo: 'POST', corpo: { nome: 'Outra' }, ...t })).dados.erro, 'Você já faz parte de uma casa.');
} finally {
  const teste = await prisma.usuario.findMany({ where: { email: { startsWith: 'teste-' } }, select: { id: true, casalId: true } });
  const casais = [...new Set(teste.map((u) => u.casalId).filter(Boolean))];
  await prisma.lancamento.deleteMany({ where: { casalId: { in: casais } } });
  await prisma.usuario.deleteMany({ where: { id: { in: teste.map((u) => u.id) } } });
  await prisma.casal.deleteMany({ where: { id: { in: casais } } });
  if (falhas) throw new Error(`${falhas} verificação(ões) falharam: veja as linhas com ❌ acima`);
}
