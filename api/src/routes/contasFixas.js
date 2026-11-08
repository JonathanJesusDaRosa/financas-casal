// Contas fixas: cadastro (aluguel, internet...) e a situação de cada uma no mês.
// Uma conta NÃO vira lançamento sozinha: no mês ela fica "a pagar" até alguém
// marcar como paga (POST /contas-fixas/:id/pagar), que cria o lançamento.
import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { autenticar } from '../middlewares/autenticar.js';
import { exigirCasal } from '../middlewares/exigirCasal.js';
import { dataSchema, idSchema, mesSchema, paraData, paraTexto, validar } from '../lib/validar.js';
import { diasEntre, hojeNoBrasil, mesAtualNoBrasil, vencimentoNoMes } from '../lib/datas.js';

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
  ativa: z.boolean().optional(),
};

// Ao criar, sem tipo = despesa. Ao editar, campo que não veio fica como está
// (por isso o "padrão" só existe na criação).
const criarSchema = z.object({ ...campos, tipo: campos.tipo.default('DESPESA') });
const editarSchema = z.object(campos).partial();

const pagarSchema = z.object({
  mes: mesSchema,
  valorCentavos: valorCentavos.optional(), // se não vier, usa o valor de costume
  data: dataSchema.optional(), // se não vier, usa hoje
  pagoPorId: idSchema.optional(), // se não vier, quem está logado
});

// ---------- Ajudantes ----------

const selecaoConta = {
  id: true,
  nome: true,
  valorCentavos: true,
  diaVencimento: true,
  tipo: true,
  ativa: true,
  categoria: { select: { id: true, nome: true, icone: true } },
};

async function conferirCategoria(categoriaId, casalId) {
  if (!categoriaId) return null;
  const ok = await prisma.categoria.count({ where: { id: categoriaId, casalId } });
  return ok ? null : 'Categoria não encontrada.';
}

// ---------- Rotas ----------

// GET /contas-fixas -> todas as contas cadastradas (ativas primeiro)
router.get('/', async (req, res) => {
  const contas = await prisma.contaFixa.findMany({
    where: { casalId: req.casalId },
    orderBy: [{ ativa: 'desc' }, { diaVencimento: 'asc' }, { nome: 'asc' }],
    select: selecaoConta,
  });
  res.json({ contas });
});

// GET /contas-fixas/mes?mes=2026-11 -> situação de cada conta ativa no mês
//   situacao: "paga" | "atrasada" | "a_pagar"
//   diasParaVencer: negativo = atrasada há N dias; 0 = vence hoje
router.get('/mes', async (req, res) => {
  const mes = validar(mesSchema, req.query.mes ?? mesAtualNoBrasil(), res);
  if (!mes) return;
  const hoje = hojeNoBrasil();

  const contas = await prisma.contaFixa.findMany({
    where: { casalId: req.casalId, ativa: true },
    orderBy: [{ diaVencimento: 'asc' }, { nome: 'asc' }],
    select: {
      ...selecaoConta,
      pagamentos: {
        where: { competencia: mes },
        select: { id: true, valorCentavos: true, data: true, pagoPor: { select: { id: true, nome: true } } },
      },
    },
  });

  const situacoes = contas.map(({ pagamentos, ...conta }) => {
    const vencimento = vencimentoNoMes(mes, conta.diaVencimento);
    const pagamento = pagamentos[0] ?? null;
    const diasParaVencer = diasEntre(hoje, vencimento);
    const situacao = pagamento ? 'paga' : diasParaVencer < 0 ? 'atrasada' : 'a_pagar';
    return {
      ...conta,
      vencimento,
      diasParaVencer,
      situacao,
      pagamento: pagamento && { ...pagamento, data: paraTexto(pagamento.data) },
    };
  });

  const total = (lista) => lista.reduce((soma, c) => soma + (c.pagamento?.valorCentavos ?? c.valorCentavos), 0);
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
  res.json({ conta });
});

// POST /contas-fixas
router.post('/', async (req, res) => {
  const dados = validar(criarSchema, req.body, res);
  if (!dados) return;
  const problema = await conferirCategoria(dados.categoriaId, req.casalId);
  if (problema) return res.status(400).json({ erro: problema });

  const conta = await prisma.contaFixa.create({
    data: { ...dados, casalId: req.casalId },
    select: selecaoConta,
  });
  res.status(201).json({ conta });
});

// PATCH /contas-fixas/:id
router.patch('/:id', async (req, res) => {
  const id = validar(idSchema, req.params.id, res);
  if (!id) return;
  const dados = validar(editarSchema, req.body, res);
  if (!dados) return;
  const problema = await conferirCategoria(dados.categoriaId, req.casalId);
  if (problema) return res.status(400).json({ erro: problema });

  const { count } = await prisma.contaFixa.updateMany({ where: { id, casalId: req.casalId }, data: dados });
  if (count === 0) return res.status(404).json({ erro: 'Conta não encontrada.' });
  const conta = await prisma.contaFixa.findUnique({ where: { id }, select: selecaoConta });
  res.json({ conta });
});

// DELETE /contas-fixas/:id -> os lançamentos já pagos continuam (só perdem o vínculo)
router.delete('/:id', async (req, res) => {
  const id = validar(idSchema, req.params.id, res);
  if (!id) return;
  const { count } = await prisma.contaFixa.deleteMany({ where: { id, casalId: req.casalId } });
  if (count === 0) return res.status(404).json({ erro: 'Conta não encontrada.' });
  res.status(204).end();
});

// POST /contas-fixas/:id/pagar { mes, valorCentavos?, data?, pagoPorId? }
// Cria o lançamento do pagamento. Para desfazer: apagar esse lançamento.
router.post('/:id/pagar', async (req, res) => {
  const id = validar(idSchema, req.params.id, res);
  if (!id) return;
  const dados = validar(pagarSchema, req.body, res);
  if (!dados) return;

  const conta = await prisma.contaFixa.findFirst({ where: { id, casalId: req.casalId } });
  if (!conta) return res.status(404).json({ erro: 'Conta não encontrada.' });

  const pagoPorId = dados.pagoPorId ?? req.usuarioId;
  const membro = await prisma.usuario.count({ where: { id: pagoPorId, casalId: req.casalId } });
  if (!membro) return res.status(400).json({ erro: 'Essa pessoa não faz parte da casa.' });

  try {
    const lancamento = await prisma.lancamento.create({
      data: {
        tipo: conta.tipo,
        valorCentavos: dados.valorCentavos ?? conta.valorCentavos,
        data: paraData(dados.data ?? hojeNoBrasil()),
        descricao: conta.nome,
        categoriaId: conta.categoriaId,
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
