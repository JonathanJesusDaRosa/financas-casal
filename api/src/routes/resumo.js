// GET /resumo?mes=2026-11 -> os números da tela Início (o "dashboard" do mês):
//   totais        entradas, saídas, guardado, sobra e rendimento (mesmas regras da lista)
//   porCategoria  quanto SAIU em cada categoria, do maior para o menor, com a %
//   ultimos       os 5 lançamentos mais recentes do mês
//   orcamento     categorias com limite: quanto já saiu e quanto falta (ou passou)
//   porFormaPagamento  quanto SAIU por forma de pagamento (ex.: quanto foi no crédito)
import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { autenticar } from '../middlewares/autenticar.js';
import { exigirCasal } from '../middlewares/exigirCasal.js';
import { mesSchema, paraTexto, validar } from '../lib/validar.js';
import { mesAtualNoBrasil } from '../lib/datas.js';

const router = Router();
router.use(autenticar, exigirCasal);

// Maior gasto primeiro. Empate: ordem alfabética, com "Sem categoria" por último.
function ordenarCategorias(a, b) {
  if (b.totalCentavos !== a.totalCentavos) return b.totalCentavos - a.totalCentavos;
  if (!a.categoria) return 1;
  if (!b.categoria) return -1;
  return a.categoria.nome.localeCompare(b.categoria.nome);
}

function intervaloDoMes(mes) {
  const [ano, numero] = mes.split('-').map(Number);
  return { inicio: new Date(Date.UTC(ano, numero - 1, 1)), fim: new Date(Date.UTC(ano, numero, 1)) };
}

// GET /resumo/evolucao?ate=2026-11&meses=6 -> entrou, saiu, guardado e sobra de cada mês,
// do mais antigo ao mais novo (para o gráfico "Evolução" do Início).
// Mesmas regras do resumo: entrou = receitas + resgates; sobra = entrou - saiu - guardado.
router.get('/evolucao', async (req, res) => {
  const ate = validar(mesSchema, req.query.ate ?? mesAtualNoBrasil(), res);
  if (!ate) return;
  const quantidade = Math.min(Math.max(Number(req.query.meses) || 6, 1), 24);

  // Lista de meses: ["2026-06", ..., "2026-11"]
  const [ano, numero] = ate.split('-').map(Number);
  const meses = Array.from({ length: quantidade }, (_, i) => {
    const d = new Date(Date.UTC(ano, numero - quantidade + i, 1));
    return d.toISOString().slice(0, 7);
  });

  // Uma consulta só: todos os lançamentos do período, somados por dia e tipo.
  const lancamentos = await prisma.lancamento.groupBy({
    by: ['data', 'tipo'],
    where: {
      casalId: req.casalId,
      data: { gte: intervaloDoMes(meses[0]).inicio, lt: intervaloDoMes(ate).fim },
      tipo: { in: ['RECEITA', 'RESGATE', 'DESPESA', 'GUARDADO'] },
    },
    _sum: { valorCentavos: true },
  });

  const porMes = Object.fromEntries(meses.map((m) => [m, { mes: m, entradas: 0, saidas: 0, guardado: 0 }]));
  for (const g of lancamentos) {
    const linha = porMes[paraTexto(g.data).slice(0, 7)];
    const valor = g._sum.valorCentavos ?? 0;
    if (g.tipo === 'RECEITA' || g.tipo === 'RESGATE') linha.entradas += valor;
    if (g.tipo === 'DESPESA') linha.saidas += valor;
    if (g.tipo === 'GUARDADO') linha.guardado += valor;
  }

  res.json({
    meses: meses.map((m) => ({ ...porMes[m], sobra: porMes[m].entradas - porMes[m].saidas - porMes[m].guardado })),
  });
});

router.get('/', async (req, res) => {
  const mes = validar(mesSchema, req.query.mes ?? new Date().toISOString().slice(0, 7), res);
  if (!mes) return;
  const { inicio, fim } = intervaloDoMes(mes);
  const doMes = { casalId: req.casalId, data: { gte: inicio, lt: fim } };

  // As 3 consultas rodam ao mesmo tempo (Promise.all).
  const [porTipo, porCategoriaBruto, ultimos, porFormaBruto, formas] = await Promise.all([
    // soma por tipo (RECEITA, DESPESA, GUARDADO...)
    prisma.lancamento.groupBy({ by: ['tipo'], where: doMes, _sum: { valorCentavos: true } }),
    // soma das DESPESAS por categoria
    prisma.lancamento.groupBy({
      by: ['categoriaId'],
      where: { ...doMes, tipo: 'DESPESA' },
      _sum: { valorCentavos: true },
    }),
    prisma.lancamento.findMany({
      where: { ...doMes, tipo: { not: 'RENDIMENTO' } },
      orderBy: [{ data: 'desc' }, { id: 'desc' }],
      take: 5,
      select: {
        id: true,
        tipo: true,
        valorCentavos: true,
        data: true,
        descricao: true,
        categoria: { select: { id: true, nome: true, icone: true } },
        pagoPor: { select: { id: true, nome: true } },
        caixinha: { select: { id: true, nome: true, icone: true } },
        formaPagamento: { select: { id: true, nome: true, tipo: true } },
      },
    }),
    // soma das DESPESAS por forma de pagamento
    prisma.lancamento.groupBy({
      by: ['formaPagamentoId'],
      where: { ...doMes, tipo: 'DESPESA' },
      _sum: { valorCentavos: true },
    }),
    prisma.formaPagamento.findMany({ where: { casalId: req.casalId }, select: { id: true, nome: true, tipo: true } }),
  ]);

  const soma = (tipo) => porTipo.find((g) => g.tipo === tipo)?._sum.valorCentavos ?? 0;
  const entradas = soma('RECEITA') + soma('RESGATE');
  const saidas = soma('DESPESA');
  const guardado = soma('GUARDADO');

  // Busca nome e ícone das categorias que apareceram + as que têm limite (orçamento).
  const ids = porCategoriaBruto.map((g) => g.categoriaId).filter(Boolean);
  const categorias = await prisma.categoria.findMany({
    where: { casalId: req.casalId, OR: [{ id: { in: ids } }, { limiteMensalCentavos: { not: null } }] },
    select: { id: true, nome: true, icone: true, limiteMensalCentavos: true },
  });
  const gastoDa = (id) => porCategoriaBruto.find((g) => g.categoriaId === id)?._sum.valorCentavos ?? 0;

  // { id, nome, icone } da categoria, ou null para "Sem categoria"
  const dadosDa = (id) => {
    const c = categorias.find((cat) => cat.id === id);
    return c ? { id: c.id, nome: c.nome, icone: c.icone } : null;
  };

  const porCategoria = porCategoriaBruto
    .map((g) => ({
      categoria: dadosDa(g.categoriaId),
      totalCentavos: g._sum.valorCentavos ?? 0,
      percentual: saidas ? Math.round(((g._sum.valorCentavos ?? 0) / saidas) * 100) : 0,
    }))
    .sort(ordenarCategorias);

  res.json({
    mes,
    totais: { entradas, saidas, guardado, sobra: entradas - saidas - guardado, rendimento: soma('RENDIMENTO') },
    porCategoria,
    orcamento: categorias
      .filter((c) => c.limiteMensalCentavos)
      .map((c) => {
        const gasto = gastoDa(c.id);
        return {
          categoria: { id: c.id, nome: c.nome, icone: c.icone },
          limiteCentavos: c.limiteMensalCentavos,
          gastoCentavos: gasto,
          restaCentavos: c.limiteMensalCentavos - gasto, // negativo = passou do previsto
          percentual: Math.round((gasto / c.limiteMensalCentavos) * 100),
        };
      })
      .sort((a, b) => b.percentual - a.percentual),
    porFormaPagamento: porFormaBruto
      .map((g) => ({
        forma: formas.find((f) => f.id === g.formaPagamentoId) ?? null, // null = "Não informada"
        totalCentavos: g._sum.valorCentavos ?? 0,
        percentual: saidas ? Math.round(((g._sum.valorCentavos ?? 0) / saidas) * 100) : 0,
      }))
      .sort((a, b) => b.totalCentavos - a.totalCentavos),
    ultimos: ultimos.map((l) => ({ ...l, data: paraTexto(l.data) })),
  });
});

export default router;
