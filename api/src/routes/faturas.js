// Faturas dos cartões de crédito.
//   GET    /faturas                     -> cada cartão com a fatura atual e as próximas
//   GET    /faturas/:cartaoId?mes=       -> uma fatura: total, situação e as compras dela
//   POST   /faturas/:cartaoId/pagar      -> paga a fatura INTEIRA (é aqui que o dinheiro sai)
//   DELETE /faturas/:cartaoId/pagamento?mes= -> desfaz o pagamento
import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { autenticar } from '../middlewares/autenticar.js';
import { exigirCasal } from '../middlewares/exigirCasal.js';
import { dataSchema, idSchema, mesSchema, paraData, paraTexto, validar } from '../lib/validar.js';
import { cartaoConfigurado, faturaDaCompra, faturasDoCartao, somarMesesNaData } from '../lib/fatura.js';
import { hojeNoBrasil, mesesEntre, somarMeses } from '../lib/datas.js';

const router = Router();
router.use(autenticar, exigirCasal);

const selecaoCartao = { id: true, nome: true, tipo: true, diaFechamento: true, diaVencimento: true };

// Busca o cartão DESTA casa (e confere se tem fechamento/vencimento).
async function buscarCartao(id, casalId, res) {
  const cartao = await prisma.formaPagamento.findFirst({ where: { id, casalId }, select: selecaoCartao });
  if (!cartao || cartao.tipo !== 'CREDITO') {
    res.status(404).json({ erro: 'Cartão de crédito não encontrado.' });
    return null;
  }
  if (!cartaoConfigurado(cartao)) {
    res.status(400).json({ erro: 'Cadastre o dia de fechamento e de vencimento deste cartão.' });
    return null;
  }
  return cartao;
}

// Meses de fatura para mostrar: a anterior, a atual (aberta) e as futuras que têm parcelas.
async function mesesDoCartao(cartao, hoje) {
  const atual = faturaDaCompra(hoje, cartao.diaFechamento, cartao.diaVencimento);
  const ultima = await prisma.lancamento.findFirst({
    where: { formaPagamentoId: cartao.id, tipo: 'DESPESA', faturaMes: { gt: atual } },
    orderBy: { faturaMes: 'desc' },
    select: { faturaMes: true },
  });
  const ate = ultima?.faturaMes ?? atual;
  const quantidade = Math.min(mesesEntre(atual, ate), 47) + 2; // de "atual - 1" até a última
  return { atual, meses: Array.from({ length: quantidade }, (_, i) => somarMeses(atual, i - 1)) };
}

// GET /faturas -> cartões de crédito com as faturas (anterior, atual e futuras com parcelas)
router.get('/', async (req, res) => {
  const hoje = hojeNoBrasil();
  const cartoes = await prisma.formaPagamento.findMany({
    where: { casalId: req.casalId, tipo: 'CREDITO' },
    orderBy: { nome: 'asc' },
    select: selecaoCartao,
  });

  const resposta = [];
  for (const cartao of cartoes) {
    if (!cartaoConfigurado(cartao)) {
      resposta.push({ cartao, configurado: false, faturas: [] });
      continue;
    }
    const { atual, meses } = await mesesDoCartao(cartao, hoje);
    const faturas = await faturasDoCartao(cartao, meses, hoje);
    // Mostra a atual sempre; as outras só se tiverem compras ou pagamento
    resposta.push({
      cartao,
      configurado: true,
      faturaAtual: atual,
      faturas: faturas.filter((f) => f.mes === atual || f.totalCentavos > 0 || f.pagamento),
    });
  }
  res.json({ cartoes: resposta });
});

// GET /faturas/:cartaoId?mes=2026-12 -> a fatura e as compras dela (padrão: a fatura atual)
router.get('/:cartaoId', async (req, res) => {
  const id = validar(idSchema, req.params.cartaoId, res);
  if (!id) return;
  const cartao = await buscarCartao(id, req.casalId, res);
  if (!cartao) return;

  const hoje = hojeNoBrasil();
  const { atual, meses } = await mesesDoCartao(cartao, hoje);
  const mes = validar(mesSchema, req.query.mes ?? atual, res);
  if (!mes) return;

  const [fatura] = await faturasDoCartao(cartao, [mes], hoje);
  const encontradas = await prisma.lancamento.findMany({
    where: { formaPagamentoId: id, tipo: 'DESPESA', faturaMes: mes, casalId: req.casalId },
    select: {
      id: true,
      tipo: true,
      valorCentavos: true,
      data: true,
      descricao: true,
      faturaMes: true,
      parcela: true,
      totalParcelas: true,
      grupoParcelas: true,
      categoria: { select: { id: true, nome: true, icone: true } },
      pagoPor: { select: { id: true, nome: true } },
      formaPagamento: { select: { id: true, nome: true, tipo: true } },
    },
  });
  const compras = await comDataDaCompra(encontradas, req.casalId);

  // Ordem do extrato do cartão: pela data da COMPRA (a parcela 3/10 de uma compra de
  // setembro fica junto com as compras de setembro, e não no meio das compras deste mês).
  compras.sort((a, b) => b.dataCompra.localeCompare(a.dataCompra) || b.id - a.id);

  // Lista de meses para navegar (inclui o pedido, se estiver fora da faixa)
  const navegacao = meses.includes(mes) ? meses : [...meses, mes].sort();
  res.json({
    cartao,
    faturaAtual: atual,
    meses: navegacao,
    fatura,
    compras,
  });
});

// Coloca em cada compra a "dataCompra": o dia em que a compra foi feita.
// À vista: é a própria data. Parcelada: cada parcela tem a data do seu mês, então a data
// da compra é a da parcela 1 do mesmo grupo. Se a parcela 1 foi apagada, volta os meses
// a partir desta parcela (a 3/10 de 20/nov foi comprada em 20/set).
async function comDataDaCompra(compras, casalId) {
  const grupos = [...new Set(compras.map((c) => c.grupoParcelas).filter(Boolean))];
  const primeiras = grupos.length
    ? await prisma.lancamento.findMany({
        where: { casalId, grupoParcelas: { in: grupos }, parcela: 1 },
        select: { grupoParcelas: true, data: true },
      })
    : [];
  const dataDoGrupo = new Map(primeiras.map((p) => [p.grupoParcelas, paraTexto(p.data)]));

  return compras.map((c) => {
    const data = paraTexto(c.data);
    let dataCompra = data;
    if (c.grupoParcelas && c.parcela > 1) {
      dataCompra = dataDoGrupo.get(c.grupoParcelas) ?? somarMesesNaData(data, -(c.parcela - 1));
    }
    return { ...c, data, dataCompra };
  });
}

const pagarSchema = z.object({
  mes: mesSchema,
  data: dataSchema.optional(), // se não vier, hoje
  pagoPorId: idSchema.optional(), // se não vier, quem está logado
});

// POST /faturas/:cartaoId/pagar { mes, data?, pagoPorId? } -> paga a fatura inteira
router.post('/:cartaoId/pagar', async (req, res) => {
  const id = validar(idSchema, req.params.cartaoId, res);
  if (!id) return;
  const dados = validar(pagarSchema, req.body, res);
  if (!dados) return;
  const cartao = await buscarCartao(id, req.casalId, res);
  if (!cartao) return;

  const pagoPorId = dados.pagoPorId ?? req.usuarioId;
  const membro = await prisma.usuario.count({ where: { id: pagoPorId, casalId: req.casalId } });
  if (!membro) return res.status(400).json({ erro: 'Essa pessoa não faz parte da casa.' });

  const [fatura] = await faturasDoCartao(cartao, [dados.mes], hojeNoBrasil());
  if (fatura.pagamento) return res.status(409).json({ erro: 'Esta fatura já foi paga.' });
  if (fatura.totalCentavos <= 0) return res.status(400).json({ erro: 'Esta fatura não tem compras.' });

  const lancamento = await prisma.lancamento.create({
    data: {
      tipo: 'FATURA',
      valorCentavos: fatura.totalCentavos,
      data: paraData(dados.data ?? hojeNoBrasil()),
      descricao: `Fatura ${cartao.nome}`,
      formaPagamentoId: id,
      competencia: dados.mes,
      pagoPorId,
      casalId: req.casalId,
    },
    select: { id: true, valorCentavos: true },
  });
  res.status(201).json({ pagamento: lancamento });
});

// DELETE /faturas/:cartaoId/pagamento?mes=2026-12 -> desfaz o pagamento da fatura
router.delete('/:cartaoId/pagamento', async (req, res) => {
  const id = validar(idSchema, req.params.cartaoId, res);
  if (!id) return;
  const mes = validar(mesSchema, req.query.mes, res);
  if (!mes) return;
  const { count } = await prisma.lancamento.deleteMany({
    where: { casalId: req.casalId, formaPagamentoId: id, tipo: 'FATURA', competencia: mes },
  });
  if (count === 0) return res.status(404).json({ erro: 'Pagamento não encontrado.' });
  res.status(204).end();
});

export default router;
