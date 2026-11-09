// Contas fixas: cadastro (aluguel, internet, compra parcelada...) e a situação de cada uma no mês.
//
// Dois tipos:
//   - SEM FIM (totalParcelas = null): aparece todo mês a partir do mês de início.
//   - COM FIM (parcelas): aparece só nos meses das parcelas. Ex.: 8x começando em nov/2026
//     vai até jun/2027. "parcelaInicial" permite começar na parcela 3 (compra feita antes).
//
// Regras:
//   - Nada retroativo: o mês de início nunca é anterior ao mês atual (no cadastro).
//   - Uma conta NÃO vira lançamento sozinha: fica "a pagar" até alguém tocar em "Pagar".
//   - O valor do mês pode ser AJUSTADO antes de pagar (ex.: luz prevista R$ 120, veio R$ 102).
import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { autenticar } from '../middlewares/autenticar.js';
import { exigirCasal } from '../middlewares/exigirCasal.js';
import { dataSchema, idSchema, mesSchema, paraData, paraTexto, validar } from '../lib/validar.js';
import { diasEntre, hojeNoBrasil, mesAtualNoBrasil, mesesEntre, somarMeses, vencimentoNoMes } from '../lib/datas.js';

const router = Router();
router.use(autenticar, exigirCasal);

// ---------- Validação ----------

const valorCentavos = z
  .number({ error: 'Informe o valor.' })
  .int({ error: 'Valor inválido.' })
  .positive({ error: 'O valor precisa ser maior que zero.' })
  .max(1_000_000_000, { error: 'Valor alto demais.' });

const campos = {
  nome: z
    .string({ error: 'Dê um nome para a conta.' })
    .trim()
    .min(1, { error: 'Dê um nome para a conta.' })
    .max(60, { error: 'Nome muito longo (máximo 60 letras).' }),
  valorCentavos,
  diaVencimento: z
    .number({ error: 'Informe o dia do vencimento.' })
    .int({ error: 'Dia inválido.' })
    .min(1, { error: 'O dia vai de 1 a 31.' })
    .max(31, { error: 'O dia vai de 1 a 31.' }),
  tipo: z.enum(['DESPESA', 'RECEITA'], { error: 'Escolha se a conta sai ou entra.' }),
  categoriaId: idSchema.nullish(),
  formaPagamentoId: idSchema.nullish(),
  ativa: z.boolean().optional(),
  mesInicio: mesSchema,
  // null = sem fim
  totalParcelas: z
    .number({ error: 'Número de parcelas inválido.' })
    .int({ error: 'Número de parcelas inválido.' })
    .min(1, { error: 'O número de parcelas vai de 1 a 420.' })
    .max(420, { error: 'O número de parcelas vai de 1 a 420.' })
    .nullable(),
  parcelaInicial: z
    .number({ error: 'Parcela inicial inválida.' })
    .int({ error: 'Parcela inicial inválida.' })
    .min(1, { error: 'A parcela inicial começa em 1.' }),
};

// Ao criar, o que não vier ganha o padrão. Ao editar, o que não vier fica como está.
const criarSchema = z.object({
  ...campos,
  tipo: campos.tipo.default('DESPESA'),
  mesInicio: campos.mesInicio.optional(),
  totalParcelas: campos.totalParcelas.default(null),
  parcelaInicial: campos.parcelaInicial.default(1),
});
const editarSchema = z.object(campos).partial();

const pagarSchema = z.object({
  mes: mesSchema,
  valorCentavos: valorCentavos.optional(), // se não vier: o valor ajustado do mês, ou o de costume
  data: dataSchema.optional(), // se não vier, hoje
  pagoPorId: idSchema.optional(), // se não vier, quem está logado
  formaPagamentoId: idSchema.nullish(), // se não vier, a forma de costume da conta
});

const ajusteSchema = z.object({ mes: mesSchema, valorCentavos });

// ---------- Ajudantes ----------

const selecaoConta = {
  id: true,
  nome: true,
  valorCentavos: true,
  diaVencimento: true,
  tipo: true,
  ativa: true,
  mesInicio: true,
  totalParcelas: true,
  parcelaInicial: true,
  categoria: { select: { id: true, nome: true, icone: true } },
  formaPagamento: { select: { id: true, nome: true, tipo: true } },
};

// Último mês de uma conta com fim (ou null se não tem fim).
// Ex.: 8 parcelas começando na 3ª em nov/2026 -> 6 meses -> abr/2027
function mesFinal(conta) {
  if (!conta.totalParcelas) return null;
  return somarMeses(conta.mesInicio, conta.totalParcelas - conta.parcelaInicial);
}

// Número da parcela naquele mês (ou null se a conta não tem fim)
function parcelaNoMes(conta, mes) {
  if (!conta.totalParcelas) return null;
  return conta.parcelaInicial + mesesEntre(conta.mesInicio, mes);
}

// A conta aparece neste mês? (do início até o fim, se tiver fim)
function apareceNoMes(conta, mes) {
  const fim = mesFinal(conta);
  return mes >= conta.mesInicio && (!fim || mes <= fim);
}

// Confere regras que dependem de mais de um campo (parcelas e início)
function conferirDuracao({ totalParcelas, parcelaInicial }) {
  if (totalParcelas && parcelaInicial > totalParcelas) {
    return 'A parcela inicial não pode ser maior que o número de parcelas.';
  }
  return null;
}

async function conferirVinculos({ categoriaId, formaPagamentoId }, casalId) {
  if (categoriaId) {
    const ok = await prisma.categoria.count({ where: { id: categoriaId, casalId } });
    if (!ok) return 'Categoria não encontrada.';
  }
  if (formaPagamentoId) {
    const ok = await prisma.formaPagamento.count({ where: { id: formaPagamentoId, casalId } });
    if (!ok) return 'Forma de pagamento não encontrada.';
  }
  return null;
}

// Junta à conta os dados calculados que as telas usam
function formatarConta(conta) {
  return { ...conta, mesFinal: mesFinal(conta) };
}

// ---------- Rotas ----------

// GET /contas-fixas -> todas as contas cadastradas (ativas primeiro)
router.get('/', async (req, res) => {
  const contas = await prisma.contaFixa.findMany({
    where: { casalId: req.casalId },
    orderBy: [{ ativa: 'desc' }, { diaVencimento: 'asc' }, { nome: 'asc' }],
    select: selecaoConta,
  });
  res.json({ contas: contas.map(formatarConta) });
});

// GET /contas-fixas/mes?mes=2026-11 -> situação de cada conta ativa NAQUELE mês
//   situacao: "paga" | "atrasada" | "a_pagar"
//   diasParaVencer: negativo = atrasada há N dias; 0 = vence hoje
//   valorDoMes: o valor ajustado do mês (se houver) ou o de costume
//   parcela: número da parcela no mês (contas com fim)
router.get('/mes', async (req, res) => {
  const mes = validar(mesSchema, req.query.mes ?? mesAtualNoBrasil(), res);
  if (!mes) return;
  const hoje = hojeNoBrasil();

  const todas = await prisma.contaFixa.findMany({
    where: { casalId: req.casalId, ativa: true, mesInicio: { lte: mes } },
    orderBy: [{ diaVencimento: 'asc' }, { nome: 'asc' }],
    select: {
      ...selecaoConta,
      pagamentos: {
        where: { competencia: mes },
        select: {
          id: true,
          valorCentavos: true,
          data: true,
          pagoPor: { select: { id: true, nome: true } },
          formaPagamento: { select: { id: true, nome: true, tipo: true } },
        },
      },
      ajustes: { where: { competencia: mes }, select: { valorCentavos: true } },
    },
  });

  const situacoes = todas
    .filter((conta) => apareceNoMes(conta, mes))
    .map(({ pagamentos, ajustes, ...conta }) => {
      const vencimento = vencimentoNoMes(mes, conta.diaVencimento);
      const pagamento = pagamentos[0] ?? null;
      const diasParaVencer = diasEntre(hoje, vencimento);
      const ajuste = ajustes[0] ?? null;
      return {
        ...formatarConta(conta),
        vencimento,
        diasParaVencer,
        situacao: pagamento ? 'paga' : diasParaVencer < 0 ? 'atrasada' : 'a_pagar',
        parcela: parcelaNoMes(conta, mes),
        valorDoMes: ajuste ? ajuste.valorCentavos : conta.valorCentavos,
        valorAjustado: Boolean(ajuste),
        pagamento: pagamento && { ...pagamento, data: paraTexto(pagamento.data) },
      };
    });

  // Valor que conta no total: o pago (se já pagou) ou o previsto do mês
  const valor = (c) => c.pagamento?.valorCentavos ?? c.valorDoMes;
  const total = (lista) => lista.reduce((soma, c) => soma + valor(c), 0);
  const despesas = situacoes.filter((c) => c.tipo === 'DESPESA');

  res.json({
    mes,
    hoje,
    contas: situacoes,
    resumo: {
      quantidade: situacoes.length,
      pagas: situacoes.filter((c) => c.situacao === 'paga').length,
      atrasadas: situacoes.filter((c) => c.situacao === 'atrasada').length,
      totalDespesasCentavos: total(despesas),
      faltaPagarCentavos: total(despesas.filter((c) => c.situacao !== 'paga')),
    },
  });
});

// GET /contas-fixas/:id -> uma conta (tela de edição)
router.get('/:id', async (req, res) => {
  const id = validar(idSchema, req.params.id, res);
  if (!id) return;
  const conta = await prisma.contaFixa.findFirst({ where: { id, casalId: req.casalId }, select: selecaoConta });
  if (!conta) return res.status(404).json({ erro: 'Conta não encontrada.' });
  res.json({ conta: formatarConta(conta) });
});

// POST /contas-fixas
router.post('/', async (req, res) => {
  const dados = validar(criarSchema, req.body, res);
  if (!dados) return;

  // Nada retroativo: começa no mês atual (padrão) ou num mês futuro.
  const mesAtual = mesAtualNoBrasil();
  const mesInicio = dados.mesInicio ?? mesAtual;
  if (mesInicio < mesAtual) {
    return res.status(400).json({ erro: 'A conta não pode começar num mês que já passou.' });
  }

  const problema = conferirDuracao(dados) ?? (await conferirVinculos(dados, req.casalId));
  if (problema) return res.status(400).json({ erro: problema });

  const conta = await prisma.contaFixa.create({
    data: { ...dados, mesInicio, casalId: req.casalId },
    select: selecaoConta,
  });
  res.status(201).json({ conta: formatarConta(conta) });
});

// PATCH /contas-fixas/:id
router.patch('/:id', async (req, res) => {
  const id = validar(idSchema, req.params.id, res);
  if (!id) return;
  const dados = validar(editarSchema, req.body, res);
  if (!dados) return;

  const atual = await prisma.contaFixa.findFirst({ where: { id, casalId: req.casalId } });
  if (!atual) return res.status(404).json({ erro: 'Conta não encontrada.' });

  // O início só pode mudar para o mês atual ou para frente (manter o que já era também vale).
  if (dados.mesInicio && dados.mesInicio !== atual.mesInicio && dados.mesInicio < mesAtualNoBrasil()) {
    return res.status(400).json({ erro: 'A conta não pode começar num mês que já passou.' });
  }

  const final = { ...atual, ...dados };
  const problema = conferirDuracao(final) ?? (await conferirVinculos(dados, req.casalId));
  if (problema) return res.status(400).json({ erro: problema });

  const conta = await prisma.contaFixa.update({ where: { id }, data: dados, select: selecaoConta });
  res.json({ conta: formatarConta(conta) });
});

// DELETE /contas-fixas/:id -> os lançamentos já pagos continuam (só perdem o vínculo)
router.delete('/:id', async (req, res) => {
  const id = validar(idSchema, req.params.id, res);
  if (!id) return;
  const { count } = await prisma.contaFixa.deleteMany({ where: { id, casalId: req.casalId } });
  if (count === 0) return res.status(404).json({ erro: 'Conta não encontrada.' });
  res.status(204).end();
});

// Busca a conta DESTA casa e confere se ela aparece no mês pedido.
async function contaDoMes(id, casalId, mes, res) {
  const conta = await prisma.contaFixa.findFirst({ where: { id, casalId } });
  if (!conta) {
    res.status(404).json({ erro: 'Conta não encontrada.' });
    return null;
  }
  if (!apareceNoMes(conta, mes)) {
    res.status(400).json({ erro: 'Esta conta não tem vencimento neste mês.' });
    return null;
  }
  return conta;
}

// PUT /contas-fixas/:id/valor-mes { mes, valorCentavos } -> ajusta o valor daquele mês
// (antes de pagar). Ex.: a luz prevista era R$ 120 e a conta veio R$ 102.
router.put('/:id/valor-mes', async (req, res) => {
  const id = validar(idSchema, req.params.id, res);
  if (!id) return;
  const dados = validar(ajusteSchema, req.body, res);
  if (!dados) return;
  const conta = await contaDoMes(id, req.casalId, dados.mes, res);
  if (!conta) return;

  const jaPaga = await prisma.lancamento.count({ where: { contaFixaId: id, competencia: dados.mes } });
  if (jaPaga) return res.status(409).json({ erro: 'Esta conta já foi paga neste mês. Edite o lançamento.' });

  // upsert = cria o ajuste do mês ou troca o valor, se já existir
  await prisma.contaFixaAjuste.upsert({
    where: { contaFixaId_competencia: { contaFixaId: id, competencia: dados.mes } },
    create: { contaFixaId: id, competencia: dados.mes, valorCentavos: dados.valorCentavos },
    update: { valorCentavos: dados.valorCentavos },
  });
  res.json({ valorDoMes: dados.valorCentavos });
});

// DELETE /contas-fixas/:id/valor-mes?mes=2026-11 -> volta a usar o valor de costume
router.delete('/:id/valor-mes', async (req, res) => {
  const id = validar(idSchema, req.params.id, res);
  if (!id) return;
  const mes = validar(mesSchema, req.query.mes, res);
  if (!mes) return;
  const conta = await prisma.contaFixa.findFirst({ where: { id, casalId: req.casalId } });
  if (!conta) return res.status(404).json({ erro: 'Conta não encontrada.' });
  await prisma.contaFixaAjuste.deleteMany({ where: { contaFixaId: id, competencia: mes } });
  res.status(204).end();
});

// POST /contas-fixas/:id/pagar { mes, valorCentavos?, data?, pagoPorId?, formaPagamentoId? }
// Cria o lançamento do pagamento. Para desfazer: apagar esse lançamento.
router.post('/:id/pagar', async (req, res) => {
  const id = validar(idSchema, req.params.id, res);
  if (!id) return;
  const dados = validar(pagarSchema, req.body, res);
  if (!dados) return;
  const conta = await contaDoMes(id, req.casalId, dados.mes, res);
  if (!conta) return;

  const pagoPorId = dados.pagoPorId ?? req.usuarioId;
  const membro = await prisma.usuario.count({ where: { id: pagoPorId, casalId: req.casalId } });
  if (!membro) return res.status(400).json({ erro: 'Essa pessoa não faz parte da casa.' });

  // Forma: a escolhida agora; se não vier nada, a de costume da conta. (null = sem forma)
  const formaPagamentoId = dados.formaPagamentoId !== undefined ? dados.formaPagamentoId : conta.formaPagamentoId;
  const problema = await conferirVinculos({ formaPagamentoId }, req.casalId);
  if (problema) return res.status(400).json({ erro: problema });

  // Valor: o informado; senão o ajustado do mês; senão o de costume.
  const ajuste = await prisma.contaFixaAjuste.findUnique({
    where: { contaFixaId_competencia: { contaFixaId: id, competencia: dados.mes } },
  });
  const valor = dados.valorCentavos ?? ajuste?.valorCentavos ?? conta.valorCentavos;

  // Descrição com a parcela: "Geladeira (3/8)"
  const parcela = parcelaNoMes(conta, dados.mes);
  const descricao = parcela ? `${conta.nome} (${parcela}/${conta.totalParcelas})` : conta.nome;

  try {
    const lancamento = await prisma.lancamento.create({
      data: {
        tipo: conta.tipo,
        valorCentavos: valor,
        data: paraData(dados.data ?? hojeNoBrasil()),
        descricao,
        categoriaId: conta.categoriaId,
        formaPagamentoId,
        pagoPorId,
        casalId: req.casalId,
        contaFixaId: conta.id,
        competencia: dados.mes,
      },
      select: { id: true },
    });
    res.status(201).json({ lancamentoId: lancamento.id });
  } catch (erro) {
    if (erro.code === 'P2002') {
      return res.status(409).json({ erro: 'Esta conta já foi marcada como paga neste mês.' });
    }
    throw erro;
  }
});

export default router;
