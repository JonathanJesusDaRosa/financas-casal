// Cenário de teste (rodado pelo api.test.js). Usa dados FICTÍCIOS (e-mails teste-*) e apaga tudo no final.
// Teste ponta a ponta: categorias e lançamentos, com dois casais fictícios.
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
  const zeca = await novoCasal('Zeca'); // outro casal

  console.log('\n--- Categorias ---');
  const cats = confere('lista as 6 padrão', await chamar('/categorias', { token: ana.token }), 200).categorias;
  console.log('   ', cats.map((c) => c.nome).join(', '));
  const mercado = cats.find((c) => c.nome === 'Mercado');
  const pet = confere('cria "Pet"', await chamar('/categorias', { metodo: 'POST', corpo: { nome: 'Pet', cor: '#795548' }, token: ana.token }), 201).categoria;
  confere('nome repetido', await chamar('/categorias', { metodo: 'POST', corpo: { nome: 'Pet' }, token: ana.token }), 409);
  confere('cor inválida', await chamar('/categorias', { metodo: 'POST', corpo: { nome: 'X', cor: 'azul' }, token: ana.token }), 400);
  confere('renomeia para "Pets"', await chamar(`/categorias/${pet.id}`, { metodo: 'PATCH', corpo: { nome: 'Pets' }, token: ana.token }), 200);
  confere('Zeca tenta renomear categoria da Ana', await chamar(`/categorias/${pet.id}`, { metodo: 'PATCH', corpo: { nome: 'Hack' }, token: zeca.token }), 404);
  confere('Zeca tenta apagar categoria da Ana', await chamar(`/categorias/${pet.id}`, { metodo: 'DELETE', token: zeca.token }), 404);

  console.log('\n--- Lançamentos ---');
  const base = { tipo: 'DESPESA', valorCentavos: 10050, data: '2026-11-30', categoriaId: mercado.id, pagoPorId: ana.usuarioId, descricao: 'Feira' };
  const l1 = confere('cria despesa R$ 100,50 em 30/11', await chamar('/lancamentos', { metodo: 'POST', corpo: base, token: ana.token }), 201).lancamento;
  console.log('    data devolvida:', l1.data, '| categoria:', l1.categoria.nome, '| pago por:', l1.pagoPor.nome);
  confere('cria receita R$ 5.000 em 01/11', await chamar('/lancamentos', { metodo: 'POST', corpo: { ...base, tipo: 'RECEITA', valorCentavos: 500000, data: '2026-11-01', categoriaId: null, descricao: '' }, token: ana.token }), 201);
  confere('cria despesa em 01/12 (outro mês)', await chamar('/lancamentos', { metodo: 'POST', corpo: { ...base, data: '2026-12-01' }, token: ana.token }), 201);
  const lp = confere('cria despesa na categoria Pets', await chamar('/lancamentos', { metodo: 'POST', corpo: { ...base, categoriaId: pet.id, valorCentavos: 8000 }, token: ana.token }), 201).lancamento;

  confere('valor zero', await chamar('/lancamentos', { metodo: 'POST', corpo: { ...base, valorCentavos: 0 }, token: ana.token }), 400);
  confere('valor com centavos quebrados (10.5)', await chamar('/lancamentos', { metodo: 'POST', corpo: { ...base, valorCentavos: 10.5 }, token: ana.token }), 400);
  confere('data 2026-02-30', await chamar('/lancamentos', { metodo: 'POST', corpo: { ...base, data: '2026-02-30' }, token: ana.token }), 400);
  confere('tipo inválido', await chamar('/lancamentos', { metodo: 'POST', corpo: { ...base, tipo: 'OUTRO' }, token: ana.token }), 400);
  confere('Ana usa categoria do Zeca', await chamar('/lancamentos', { metodo: 'POST', corpo: { ...base, categoriaId: (await chamar('/categorias', { token: zeca.token })).dados.categorias[0].id }, token: ana.token }), 400);
  confere('Ana diz que Zeca pagou', await chamar('/lancamentos', { metodo: 'POST', corpo: { ...base, pagoPorId: zeca.usuarioId }, token: ana.token }), 400);

  const nov = confere('lista novembro', await chamar('/lancamentos?mes=2026-11', { token: ana.token }), 200);
  console.log('    itens:', nov.lancamentos.length, '| totais:', JSON.stringify(nov.totais), '| ordem das datas:', nov.lancamentos.map((l) => l.data).join(', '));
  const dez = confere('lista dezembro', await chamar('/lancamentos?mes=2026-12', { token: ana.token }), 200);
  console.log('    itens:', dez.lancamentos.length);
  confere('mês inválido', await chamar('/lancamentos?mes=2026-13', { token: ana.token }), 400);
  confere('Zeca lista novembro (deve vir vazio)', await chamar('/lancamentos?mes=2026-11', { token: zeca.token }), 200);
  console.log('    itens do Zeca:', (await chamar('/lancamentos?mes=2026-11', { token: zeca.token })).dados.lancamentos.length);

  const editado = confere('edita valor para R$ 120,00', await chamar(`/lancamentos/${l1.id}`, { metodo: 'PATCH', corpo: { valorCentavos: 12000 }, token: ana.token }), 200).lancamento;
  console.log('    valor:', editado.valorCentavos, '| data mantida:', editado.data, '| descrição mantida:', editado.descricao);
  confere('Zeca tenta ver lançamento da Ana', await chamar(`/lancamentos/${l1.id}`, { token: zeca.token }), 404);
  confere('Zeca tenta editar lançamento da Ana', await chamar(`/lancamentos/${l1.id}`, { metodo: 'PATCH', corpo: { valorCentavos: 1 }, token: zeca.token }), 404);
  confere('Zeca tenta apagar lançamento da Ana', await chamar(`/lancamentos/${l1.id}`, { metodo: 'DELETE', token: zeca.token }), 404);
  confere('id inválido', await chamar('/lancamentos/abc', { token: ana.token }), 400);

  confere('apaga categoria Pets', await chamar(`/categorias/${pet.id}`, { metodo: 'DELETE', token: ana.token }), 204);
  const semCat = confere('lançamento da Pets continua existindo', await chamar(`/lancamentos/${lp.id}`, { token: ana.token }), 200).lancamento;
  console.log('    categoria agora:', semCat.categoria);
  confere('apaga lançamento', await chamar(`/lancamentos/${l1.id}`, { metodo: 'DELETE', token: ana.token }), 204);
  confere('lançamento apagado some', await chamar(`/lancamentos/${l1.id}`, { token: ana.token }), 404);
  confere('sem login', await chamar('/lancamentos'), 401);
} finally {
  // Limpeza: apaga casais e usuários de teste (lançamentos e categorias vão junto)
  const teste = await prisma.usuario.findMany({ where: { email: { startsWith: 'teste-' } }, select: { id: true, casalId: true } });
  const casais = [...new Set(teste.map((u) => u.casalId).filter(Boolean))];
  await prisma.lancamento.deleteMany({ where: { casalId: { in: casais } } });
  await prisma.usuario.deleteMany({ where: { id: { in: teste.map((u) => u.id) } } });
  await prisma.casal.deleteMany({ where: { id: { in: casais } } });
  console.log(`\nLimpeza: ${teste.length} usuários e ${casais.length} casais de teste apagados.`);
  if (falhas) throw new Error(`${falhas} verificação(ões) falharam: veja as linhas com ❌ acima`);
}
