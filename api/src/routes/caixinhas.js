// Caixinhas para sonhos: criar, editar, guardar, resgatar, atualizar saldo (juros).
import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { autenticar } from '../middlewares/autenticar.js';
import { exigirCasal } from '../middlewares/exigirCasal.js';
import { calcularSaldos, efeitoNoSaldo } from '../lib/saldos.js';
import { dataSchema, idSchema, paraData, paraTexto, validar } from '../lib/validar.js';

const router = Router();
router.use(autenticar, exigirCasal);

// ---------- Validação ----------

const valorPositivo = z
  .number({ error: 'Informe o valor.' })
  .int({ error: 'Valor inválido.' })
  .positive({ error: 'O valor precisa ser maior que zero.' })
  .max(1_000_000_000, { error: 'Valor alto demais.' });

const camposCaixinha = {
  nome: z
    .string({ error: 'Dê um nome para a caixinha.' })
    .trim()
    .min(1, { error: 'Dê um nome para a caixinha.' })
    .max(40, { error: 'Nome muito longo (máximo 40 letras).' }),
  icone: z.string().trim().max(16).nullish().transform((t) => t || null),
  valorAlvoCentavos: valorPositivo,
  prazo: dataSchema.nullish(),
  investimentoId: idSchema.nullish(),
};

const criarSchema = z.object(camposCaixinha);
const editarSchema = z.object({ ...camposCaixinha, arquivada: z.boolean() }).partial();

// Guardar e resgatar: valor + data (+ quem fez, opcional)
const movimentoSchema = z.object({
  valorCentavos: valorPositivo,
  data: dataSchema,
  pagoPorId: idSchema.optional(),
});

// Atualizar saldo: o valor que o banco mostra hoje
const atualizarSaldoSchema = z.object({
  saldoAtualCentavos: z
    .number({ error: 'Informe o saldo atual.' })
    .int({ error: 'Valor inválido.' })
    .min(0, { error: 'O saldo não pode ser negativo.' })
    .max(1_000_000_000, { error: 'Valor alto demais.' }),
  data: dataSchema,
});

// ---------- Ajudantes ----------

class ErroDeRegra extends Error {
  constructor(status, mensagem) {
    super(mensagem);
    this.status = status;
  }
}

// Executa a ação; se for um ErroDeRegra, responde com a mensagem dele.
async function comRegras(res, acao) {
  try {
    return await acao();
  } catch (erro) {
    if (erro instanceof ErroDeRegra) {
      res.status(erro.status).json({ erro: erro.message });
      return undefined;
    }
    throw erro;
  }
}

const selecaoCaixinha = {
  id: true,
  nome: true,
  icone: true,
  valorAlvoCentavos: true,
  prazo: true,
  arquivada: true,
  investimento: { select: { id: true, nome: true } },
};

// Junta os dados da caixinha com o saldo calculado.
function formatarCaixinha(caixinha, saldoDe) {
  const { guardado, resgatado, rendimento, saldo } = saldoDe(caixinha.id);
  return {
    ...caixinha,
    prazo: caixinha.prazo ? paraTexto(caixinha.prazo) : null,
    guardadoCentavos: guardado,
    resgatadoCentavos: resgatado,
    rendimentoCentavos: rendimento,
    saldoCentavos: saldo,
  };
}

// Busca a caixinha DESTE casal (ou dá 404).
async function buscarCaixinha(id, casalId, cliente = prisma) {
  const caixinha = await cliente.caixinha.findFirst({ where: { id, casalId }, select: selecaoCaixinha });
  if (!caixinha) throw new ErroDeRegra(404, 'Caixinha não encontrada.');
  return caixinha;
}

async function conferirInvestimento(investimentoId, casalId) {
  if (!investimentoId) return;
  const ok = await prisma.investimento.count({ where: { id: investimentoId, casalId } });
  if (!ok) throw new ErroDeRegra(400, 'Investimento não encontrado.');
}

async function conferirMembro(usuarioId, casalId) {
  const ok = await prisma.usuario.count({ where: { id: usuarioId, casalId } });
  if (!ok) throw new ErroDeRegra(400, 'Essa pessoa não faz parte do casal.');
}

// Devolve a caixinha atualizada (com saldo) para a resposta.
async function caixinhaComSaldo(id, casalId) {
  const saldoDe = await calcularSaldos(casalId);
  return formatarCaixinha(await buscarCaixinha(id, casalId), saldoDe);
}

// ---------- Rotas da caixinha ----------

// GET /caixinhas -> todas, com saldo (as arquivadas vêm com arquivada: true)
router.get('/', async (req, res) => {
  const [caixinhas, saldoDe] = await Promise.all([
    prisma.caixinha.findMany({
      where: { casalId: req.casalId },
      orderBy: [{ arquivada: 'asc' }, { criadoEm: 'asc' }],
      select: selecaoCaixinha,
    }),
    calcularSaldos(req.casalId),
  ]);
  res.json({ caixinhas: caixinhas.map((c) => formatarCaixinha(c, saldoDe)) });
});

// GET /caixinhas/:id -> uma caixinha + histórico de movimentos
router.get('/:id', async (req, res) => {
  const id = validar(idSchema, req.params.id, res);
  if (!id) return;

  await comRegras(res, async () => {
    const caixinha = await caixinhaComSaldo(id, req.casalId);
    const movimentos = await prisma.lancamento.findMany({
      where: { caixinhaId: id, casalId: req.casalId },
      orderBy: [{ data: 'desc' }, { id: 'desc' }],
      select: { id: true, tipo: true, valorCentavos: true, data: true, pagoPor: { select: { id: true, nome: true } } },
    });
    res.json({
      caixinha,
      movimentos: movimentos.map((m) => ({ ...m, data: paraTexto(m.data) })),
    });
  });
});

// POST /caixinhas
router.post('/', async (req, res) => {
  const dados = validar(criarSchema, req.body, res);
  if (!dados) return;

  await comRegras(res, async () => {
    await conferirInvestimento(dados.investimentoId, req.casalId);
    const criada = await prisma.caixinha.create({
      data: { ...dados, prazo: dados.prazo ? paraData(dados.prazo) : null, casalId: req.casalId },
    });
    res.status(201).json({ caixinha: await caixinhaComSaldo(criada.id, req.casalId) });
  });
});

// PATCH /caixinhas/:id
router.patch('/:id', async (req, res) => {
  const id = validar(idSchema, req.params.id, res);
  if (!id) return;
  const dados = validar(editarSchema, req.body, res);
  if (!dados) return;

  await comRegras(res, async () => {
    const atual = await caixinhaComSaldo(id, req.casalId);
    await conferirInvestimento(dados.investimentoId, req.casalId);

    if (dados.arquivada === true && atual.saldoCentavos !== 0) {
      throw new ErroDeRegra(409, 'Para arquivar, resgate todo o saldo da caixinha antes.');
    }

    const { prazo, ...resto } = dados;
    await prisma.caixinha.update({
      where: { id },
      data: { ...resto, ...(prazo !== undefined && { prazo: prazo ? paraData(prazo) : null }) },
    });
    res.json({ caixinha: await caixinhaComSaldo(id, req.casalId) });
  });
});

// DELETE /caixinhas/:id -> só se nunca teve movimentos (senão, arquivar)
router.delete('/:id', async (req, res) => {
  const id = validar(idSchema, req.params.id, res);
  if (!id) return;

  await comRegras(res, async () => {
    await buscarCaixinha(id, req.casalId);
    const movimentos = await prisma.lancamento.count({ where: { caixinhaId: id } });
    if (movimentos > 0) {
      throw new ErroDeRegra(409, 'Esta caixinha tem histórico. Resgate o saldo e arquive em vez de apagar.');
    }
    await prisma.caixinha.delete({ where: { id } });
    res.status(204).end();
  });
});

// ---------- Movimentos ----------

// Cria um movimento (GUARDADO / RESGATE / RENDIMENTO) dentro de uma transação,
// conferindo o saldo na mesma operação (evita dois resgates ao mesmo tempo).
async function criarMovimento(req, res, tipo, calcularValor) {
  const id = validar(idSchema, req.params.id, res);
  if (!id) return;
  const schema = tipo === 'RENDIMENTO' ? atualizarSaldoSchema : movimentoSchema;
  const dados = validar(schema, req.body, res);
  if (!dados) return;

  await comRegras(res, async () => {
    const pagoPorId = dados.pagoPorId ?? req.usuarioId;
    await conferirMembro(pagoPorId, req.casalId);

    await prisma.$transaction(async (tx) => {
      const caixinha = await buscarCaixinha(id, req.casalId, tx);
      if (caixinha.arquivada) throw new ErroDeRegra(409, 'Esta caixinha está arquivada.');

      const { saldo } = (await calcularSaldos(req.casalId, tx))(id);
      const valorCentavos = calcularValor(dados, saldo); // regra de cada tipo

      await tx.lancamento.create({
        data: {
          tipo,
          valorCentavos,
          data: paraData(dados.data),
          caixinhaId: id,
          casalId: req.casalId,
          pagoPorId,
        },
      });
    });

    res.status(201).json({ caixinha: await caixinhaComSaldo(id, req.casalId) });
  });
}

// POST /caixinhas/:id/guardar { valorCentavos, data, pagoPorId? }
router.post('/:id/guardar', (req, res) => criarMovimento(req, res, 'GUARDADO', (d) => d.valorCentavos));

// POST /caixinhas/:id/resgatar { valorCentavos, data, pagoPorId? }
router.post('/:id/resgatar', (req, res) =>
  criarMovimento(req, res, 'RESGATE', (d, saldo) => {
    if (d.valorCentavos > saldo) {
      throw new ErroDeRegra(409, 'Não dá para resgatar mais do que o saldo da caixinha.');
    }
    return d.valorCentavos;
  }),
);

// POST /caixinhas/:id/atualizar-saldo { saldoAtualCentavos, data }
// A diferença entre o saldo do banco e o do app vira um RENDIMENTO (pode ser negativo).
router.post('/:id/atualizar-saldo', (req, res) =>
  criarMovimento(req, res, 'RENDIMENTO', (d, saldo) => {
    const diferenca = d.saldoAtualCentavos - saldo;
    if (diferenca === 0) throw new ErroDeRegra(400, 'O saldo informado é igual ao do app.');
    return diferenca;
  }),
);

// DELETE /caixinhas/:id/movimentos/:movimentoId -> desfaz um movimento lançado errado
router.delete('/:id/movimentos/:movimentoId', async (req, res) => {
  const id = validar(idSchema, req.params.id, res);
  if (!id) return;
  const movimentoId = validar(idSchema, req.params.movimentoId, res);
  if (!movimentoId) return;

  await comRegras(res, async () => {
    await prisma.$transaction(async (tx) => {
      const movimento = await tx.lancamento.findFirst({
        where: { id: movimentoId, caixinhaId: id, casalId: req.casalId },
      });
      if (!movimento) throw new ErroDeRegra(404, 'Movimento não encontrado.');

      const { saldo } = (await calcularSaldos(req.casalId, tx))(id);
      if (saldo - efeitoNoSaldo(movimento) < 0) {
        throw new ErroDeRegra(409, 'Apagar este movimento deixaria o saldo negativo. Apague antes o resgate.');
      }
      await tx.lancamento.delete({ where: { id: movimentoId } });
    });

    res.json({ caixinha: await caixinhaComSaldo(id, req.casalId) });
  });
});

export default router;
