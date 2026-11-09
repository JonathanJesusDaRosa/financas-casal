// Formas de pagamento da casa: "Pix", "Nubank Crédito", "Itaú Débito"...
// O TIPO (PIX, DEBITO, CREDITO...) permite analisar, ex.: tudo o que foi no crédito.
import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { autenticar } from '../middlewares/autenticar.js';
import { exigirCasal } from '../middlewares/exigirCasal.js';
import { idSchema, validar } from '../lib/validar.js';

const router = Router();
router.use(autenticar, exigirCasal);

const TIPOS_FORMA = ['PIX', 'DEBITO', 'CREDITO', 'DINHEIRO', 'BOLETO', 'OUTRO'];

const nome = z
  .string({ error: 'Informe o nome (ex.: Nubank Crédito).' })
  .trim()
  .min(1, { error: 'Informe o nome (ex.: Nubank Crédito).' })
  .max(40, { error: 'Nome muito longo (máximo 40 letras).' });
const tipo = z.enum(TIPOS_FORMA, { error: 'Escolha o tipo (Pix, Débito, Crédito...).' });

const criarSchema = z.object({ nome, tipo });
const editarSchema = z.object({ nome, tipo }).partial();

const NOME_REPETIDO = 'Já existe uma forma de pagamento com esse nome.';
const selecao = { id: true, nome: true, tipo: true, _count: { select: { lancamentos: true } } };
const formatar = ({ _count, ...f }) => ({ ...f, totalLancamentos: _count.lancamentos });

// GET /formas-pagamento -> ordenadas por tipo e nome
router.get('/', async (req, res) => {
  const formas = await prisma.formaPagamento.findMany({
    where: { casalId: req.casalId },
    orderBy: [{ tipo: 'asc' }, { nome: 'asc' }],
    select: selecao,
  });
  res.json({ formas: formas.map(formatar) });
});

// POST /formas-pagamento { nome, tipo }
router.post('/', async (req, res) => {
  const dados = validar(criarSchema, req.body, res);
  if (!dados) return;
  try {
    const forma = await prisma.formaPagamento.create({ data: { ...dados, casalId: req.casalId }, select: selecao });
    res.status(201).json({ forma: formatar(forma) });
  } catch (erro) {
    if (erro.code === 'P2002') return res.status(409).json({ erro: NOME_REPETIDO });
    throw erro;
  }
});

// PATCH /formas-pagamento/:id { nome?, tipo? }
router.patch('/:id', async (req, res) => {
  const id = validar(idSchema, req.params.id, res);
  if (!id) return;
  const dados = validar(editarSchema, req.body, res);
  if (!dados) return;
  try {
    const { count } = await prisma.formaPagamento.updateMany({ where: { id, casalId: req.casalId }, data: dados });
    if (count === 0) return res.status(404).json({ erro: 'Forma de pagamento não encontrada.' });
    const forma = await prisma.formaPagamento.findUnique({ where: { id }, select: selecao });
    res.json({ forma: formatar(forma) });
  } catch (erro) {
    if (erro.code === 'P2002') return res.status(409).json({ erro: NOME_REPETIDO });
    throw erro;
  }
});

// DELETE /formas-pagamento/:id -> os lançamentos continuam, só ficam "sem forma"
router.delete('/:id', async (req, res) => {
  const id = validar(idSchema, req.params.id, res);
  if (!id) return;
  const { count } = await prisma.formaPagamento.deleteMany({ where: { id, casalId: req.casalId } });
  if (count === 0) return res.status(404).json({ erro: 'Forma de pagamento não encontrada.' });
  res.status(204).end();
});

export default router;
