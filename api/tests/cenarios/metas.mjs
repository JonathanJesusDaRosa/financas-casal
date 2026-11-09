// Cenário de teste (rodado pelo api.test.js). Usa dados FICTÍCIOS (e-mails teste-*) e apaga tudo no final.
// Teste ponta a ponta: caixinhas, investimentos e os totais do mês.
import { prisma } from '../../src/lib/prisma.js';

const B = process.env.TESTE_API; // endereço da API ligada pelo api.test.js
const sufixo = Date.now();
let falhas = 0;

async function chamar(caminho, { metodo = 'GET', corpo, token } = {}) {
  const r = await fetch(B + caminho, {
    method: metodo,
    headers: { 'Content-Type': 'application/json', ...(token && { Authorization: `Bearer ${token}` }) },
    body: corpo ? JSON.stringify(corpo) : undefined,
  });
  const texto = await r.text();
  return { status: r.status, dados: texto ? JSON.parse(texto) : null };
}

function confere(titulo, resposta, statusEsperado) {
  const ok = resposta.status === statusEsperado;
  if (!ok) falhas++;
  console.log(`${ok ? '✅' : '❌'} ${titulo} [HTTP ${resposta.status}]${resposta.dados?.erro ? ' — ' + resposta.dados.erro : ''}`);
  return resposta.dados;
}

function igual(titulo, obtido, esperado) {
  const ok = JSON.stringify(obtido) === JSON.stringify(esperado);
  if (!ok) falhas++;
  console.log(`${ok ? '✅' : '❌'} ${titulo}: ${JSON.stringify(obtido)}${ok ? '' : ' (esperado ' + JSON.stringify(esperado) + ')'}`);
}

async function novoCasal(nome) {
  const { dados } = await chamar('/auth/cadastro', {
    metodo: 'POST',
    corpo: { nome, email: `teste-${nome.toLowerCase()}-${sufixo}@exemplo.com`, senha: 'senha12345' },
  });
  const casal = await chamar('/casal', { metodo: 'POST', corpo: { nome: `Casal ${nome}` }, token: dados.token });
  return { token: dados.token, usuarioId: dados.usuario.id, casalId: casal.dados.casal.id };
}

try {
  const ana = await novoCasal('Ana');
  const zeca = await novoCasal('Zeca');
  const t = { token: ana.token };

  console.log('\n--- Investimentos e caixinhas ---');
  const cdb = confere('cria investimento "CDB Nubank"', await chamar('/investimentos', { metodo: 'POST', corpo: { nome: 'CDB Nubank' }, ...t }), 201).investimento;
  confere('nome repetido', await chamar('/investimentos', { metodo: 'POST', corpo: { nome: 'CDB Nubank' }, ...t }), 409);
  const zecaInv = (await chamar('/investimentos', { metodo: 'POST', corpo: { nome: 'Do Zeca' }, token: zeca.token })).dados.investimento;

  let viagem = confere('cria caixinha Viagem (alvo R$ 5.000, no CDB)', await chamar('/caixinhas', { metodo: 'POST', corpo: { nome: 'Viagem', icone: 'praia', valorAlvoCentavos: 500000, prazo: '2027-07-01', investimentoId: cdb.id }, ...t }), 201).caixinha;
  igual('caixinha nova começa zerada', viagem.saldoCentavos, 0);
  confere('caixinha usando investimento do Zeca', await chamar('/caixinhas', { metodo: 'POST', corpo: { nome: 'X', valorAlvoCentavos: 100, investimentoId: zecaInv.id }, ...t }), 400);
  confere('caixinha sem valor-alvo', await chamar('/caixinhas', { metodo: 'POST', corpo: { nome: 'X' }, ...t }), 400);
  const carro = confere('cria caixinha Carro (sem investimento, sem prazo)', await chamar('/caixinhas', { metodo: 'POST', corpo: { nome: 'Carro', valorAlvoCentavos: 3000000 }, ...t }), 201).caixinha;

  console.log('\n--- Movimentos ---');
  const v = `/caixinhas/${viagem.id}`;
  viagem = confere('guarda R$ 300 em 05/11', await chamar(`${v}/guardar`, { metodo: 'POST', corpo: { valorCentavos: 30000, data: '2026-11-05' }, ...t }), 201).caixinha;
  viagem = confere('guarda R$ 200 em 20/11', await chamar(`${v}/guardar`, { metodo: 'POST', corpo: { valorCentavos: 20000, data: '2026-11-20' }, ...t }), 201).caixinha;
  igual('saldo após guardar', viagem.saldoCentavos, 50000);
  viagem = confere('atualiza saldo para R$ 504,20 (juros)', await chamar(`${v}/atualizar-saldo`, { metodo: 'POST', corpo: { saldoAtualCentavos: 50420, data: '2026-11-30' }, ...t }), 201).caixinha;
  igual('rendimento registrado', viagem.rendimentoCentavos, 420);
  confere('atualiza para o mesmo valor', await chamar(`${v}/atualizar-saldo`, { metodo: 'POST', corpo: { saldoAtualCentavos: 50420, data: '2026-11-30' }, ...t }), 400);
  confere('resgata mais que o saldo', await chamar(`${v}/resgatar`, { metodo: 'POST', corpo: { valorCentavos: 99999, data: '2026-12-02' }, ...t }), 409);
  viagem = confere('resgata R$ 100 em 02/12', await chamar(`${v}/resgatar`, { metodo: 'POST', corpo: { valorCentavos: 10000, data: '2026-12-02' }, ...t }), 201).caixinha;
  igual('saldo após resgate', viagem.saldoCentavos, 40420);
  viagem = confere('atualiza para menos (imposto): R$ 400', await chamar(`${v}/atualizar-saldo`, { metodo: 'POST', corpo: { saldoAtualCentavos: 40000, data: '2026-12-03' }, ...t }), 201).caixinha;
  igual('rendimento total (420 - 420)', viagem.rendimentoCentavos, 0);
  confere('Zeca tenta guardar na caixinha da Ana', await chamar(`${v}/guardar`, { metodo: 'POST', corpo: { valorCentavos: 100, data: '2026-11-05' }, token: zeca.token }), 404);
  confere('guarda dizendo que o Zeca pagou', await chamar(`${v}/guardar`, { metodo: 'POST', corpo: { valorCentavos: 100, data: '2026-11-05', pagoPorId: zeca.usuarioId }, ...t }), 400);
  confere('Zeca vê a caixinha da Ana', await chamar(v, { token: zeca.token }), 404);

  console.log('\n--- Totais do mês ---');
  await chamar('/lancamentos', { metodo: 'POST', corpo: { tipo: 'RECEITA', valorCentavos: 800000, data: '2026-11-01', pagoPorId: ana.usuarioId }, ...t });
  await chamar('/lancamentos', { metodo: 'POST', corpo: { tipo: 'DESPESA', valorCentavos: 520000, data: '2026-11-10', pagoPorId: ana.usuarioId }, ...t });
  const nov = (await chamar('/lancamentos?mes=2026-11', t)).dados;
  igual('novembro', nov.totais, { entradas: 800000, saidas: 520000, noCartao: 0, guardado: 50000, sobra: 230000, rendimento: 420 });
  igual('tipos na lista de novembro (sem rendimento)', nov.lancamentos.map((l) => l.tipo).sort(), ['DESPESA', 'GUARDADO', 'GUARDADO', 'RECEITA']);
  igual('guardado mostra a caixinha', nov.lancamentos.find((l) => l.tipo === 'GUARDADO').caixinha.nome, 'Viagem');
  const dez = (await chamar('/lancamentos?mes=2026-12', t)).dados;
  igual('dezembro (resgate entra como entrada)', dez.totais, { entradas: 10000, saidas: 0, noCartao: 0, guardado: 0, sobra: 10000, rendimento: -420 });

  const guardado = nov.lancamentos.find((l) => l.tipo === 'GUARDADO');
  confere('editar guardado pela rota de lançamentos', await chamar(`/lancamentos/${guardado.id}`, { metodo: 'PATCH', corpo: { valorCentavos: 1 }, ...t }), 400);
  confere('apagar guardado pela rota de lançamentos', await chamar(`/lancamentos/${guardado.id}`, { metodo: 'DELETE', ...t }), 400);

  console.log('\n--- Histórico e exclusões ---');
  const detalhe = confere('detalhe com histórico', await chamar(v, t), 200);
  igual('histórico (mais novo primeiro)', detalhe.movimentos.map((m) => `${m.data} ${m.tipo} ${m.valorCentavos}`), [
    '2026-12-03 RENDIMENTO -420', '2026-12-02 RESGATE 10000', '2026-11-30 RENDIMENTO 420', '2026-11-20 GUARDADO 20000', '2026-11-05 GUARDADO 30000',
  ]);
  const resgate = detalhe.movimentos.find((m) => m.tipo === 'RESGATE');
  const g300 = detalhe.movimentos.find((m) => m.valorCentavos === 30000);
  // saldo 400; apagar o guardado de 300 deixaria 100 (ok). Depois apagar o de 200 deixaria -100 (bloqueado).
  confere('apaga guardado de R$ 300', await chamar(`${v}/movimentos/${g300.id}`, { metodo: 'DELETE', ...t }), 200);
  const g200 = detalhe.movimentos.find((m) => m.valorCentavos === 20000);
  confere('apagar guardado de R$ 200 deixaria saldo negativo', await chamar(`${v}/movimentos/${g200.id}`, { metodo: 'DELETE', ...t }), 409);
  confere('apaga o resgate', await chamar(`${v}/movimentos/${resgate.id}`, { metodo: 'DELETE', ...t }), 200);
  confere('Zeca tenta apagar movimento da Ana', await chamar(`${v}/movimentos/${g200.id}`, { metodo: 'DELETE', token: zeca.token }), 404);

  confere('arquivar com saldo', await chamar(v, { metodo: 'PATCH', corpo: { arquivada: true }, ...t }), 409);
  confere('apagar caixinha com histórico', await chamar(v, { metodo: 'DELETE', ...t }), 409);
  confere('apaga caixinha Carro (sem histórico)', await chamar(`/caixinhas/${carro.id}`, { metodo: 'DELETE', ...t }), 204);

  console.log('\n--- Visão de investimentos ---');
  await chamar('/caixinhas', { metodo: 'POST', corpo: { nome: 'Reserva', valorAlvoCentavos: 1000000 }, ...t });
  const inv = confere('lista investimentos', await chamar('/investimentos', t), 200);
  const saldoViagem = (await chamar(v, t)).dados.caixinha.saldoCentavos;
  igual('CDB Nubank = saldo da Viagem', inv.investimentos[0].saldoCentavos, saldoViagem);
  igual('caixinhas sem investimento', inv.caixinhasSemInvestimento.map((c) => c.nome), ['Reserva']);
  confere('apaga o investimento', await chamar(`/investimentos/${cdb.id}`, { metodo: 'DELETE', ...t }), 204);
  igual('Viagem ficou sem investimento', (await chamar(v, t)).dados.caixinha.investimento, null);
  confere('Zeca lista investimentos (não vê os da Ana)', await chamar('/investimentos', { token: zeca.token }), 200);
} finally {
  const teste = await prisma.usuario.findMany({ where: { email: { startsWith: 'teste-' } }, select: { id: true, casalId: true } });
  const casais = [...new Set(teste.map((u) => u.casalId).filter(Boolean))];
  await prisma.lancamento.deleteMany({ where: { casalId: { in: casais } } });
  await prisma.usuario.deleteMany({ where: { id: { in: teste.map((u) => u.id) } } });
  await prisma.casal.deleteMany({ where: { id: { in: casais } } });
  console.log(`\nLimpeza: ${teste.length} usuários e ${casais.length} casais de teste apagados.`);
  if (falhas) throw new Error(`${falhas} verificação(ões) falharam: veja as linhas com ❌ acima`);
}
