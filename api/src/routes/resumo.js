// GET /resumo?mes=2026-11 -> os números da tela Início (o "dashboard" do mês):
//   totais        entradas, saídas, guardado, sobra e rendimento (mesmas regras da lista)
//   porCategoria  quanto SAIU em cada categoria, do maior para o menor, com a %
//   ultimos       os 5 lançamentos mais recentes do mês
import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { autenticar } from '../middlewares/autenticar.js';
import { exigirCasal } from '../middlewares/exigirCasal.js';
import { mesSchema, paraTexto, validar } from '../lib/validar.js';

const router = Router();
router.use(autenticar, exigirCasal);

function intervaloDoMes(mes) {
  const [ano, numero] = mes.split('-').map(Number);
  return { inicio: new Date(Date.UTC(ano, numero - 1, 1)), fim: new Date(Date.UTC(ano, numero, 1)) };
}

router.get('/', async (req, res) => {
  const mes = validar(mesSchema, req.query.mes ?? new Date().toISOString().slice(0, 7), res);
  if (!mes) return;
  const { inicio, fim } = intervaloDoMes(mes);
  const doMes = { casalId: req.casalId, data: { gte: inicio, lt: fim } };

  // As 3 consultas rodam ao mesmo tempo (Promise.all).
  const [porTipo, porCategoriaBruto, ultimos] = await Promise.all([
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
      },
    }),
  ]);

  const soma = (tipo) => porTipo.find((g) => g.tipo === tipo)?._sum.valorCentavos ?? 0;
  const entradas = soma('RECEITA') + soma('RESGATE');
  const saidas = soma('DESPESA');
  const guardado = soma('GUARDADO');

  // Busca nome e ícone das categorias que apareceram.
  const ids = porCategoriaBruto.map((g) => g.categoriaId).filter(Boolean);
  const categorias = await prisma.categoria.findMany({
    where: { id: { in: ids }, casalId: req.casalId },
    select: { id: true, nome: true, icone: true },
  });

  const porCategoria = porCategoriaBruto
    .map((g) => ({
      categoria: categorias.find((c) => c.id === g.categoriaId) ?? null, // null = "Sem categoria"
      totalCentavos: g._sum.valorCentavos ?? 0,
      percentual: saidas ? Math.round(((g._sum.valorCentavos ?? 0) / saidas) * 100) : 0,
    }))
    .sort((a, b) => b.totalCentavos - a.totalCentavos);

  res.json({
    mes,
    totais: { entradas, saidas, guardado, sobra: entradas - saidas - guardado, rendimento: soma('RENDIMENTO') },
    porCategoria,
    ultimos: ultimos.map((l) => ({ ...l, data: paraTexto(l.data) })),
  });
});

export default router;
