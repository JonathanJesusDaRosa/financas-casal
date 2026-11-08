// Categorias do casal: listar, criar, editar (nome/cor) e apagar.
import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { autenticar } from '../middlewares/autenticar.js';
import { exigirCasal } from '../middlewares/exigirCasal.js';
import { iconeSchema, idSchema, validar } from '../lib/validar.js';

const router = Router();
router.use(autenticar, exigirCasal);

const nome = z
  .string({ error: 'Informe o nome da categoria.' })
  .trim()
  .min(1, { error: 'Informe o nome da categoria.' })
  .max(40, { error: 'Nome muito longo (máximo 40 letras).' });

const cor = z.string().regex(/^#[0-9a-fA-F]{6}$/, { error: 'Cor inválida.' });

const criarSchema = z.object({ nome, cor: cor.optional(), icone: iconeSchema });
const editarSchema = z
  .object({ nome: nome.optional(), cor: cor.optional(), icone: iconeSchema.optional() })
  .refine((d) => d.nome !== undefined || d.cor !== undefined || d.icone !== undefined, {
    error: 'Nada para alterar.',
  });

const NOME_REPETIDO = 'Já existe uma categoria com esse nome.';

// GET /categorias -> lista em ordem alfabética, com quantos lançamentos cada uma tem
router.get('/', async (req, res) => {
  const categorias = await prisma.categoria.findMany({
    where: { casalId: req.casalId },
    orderBy: { nome: 'asc' },
    select: { id: true, nome: true, cor: true, icone: true, _count: { select: { lancamentos: true } } },
  });

  res.json({
    categorias: categorias.map(({ _count, ...c }) => ({ ...c, totalLancamentos: _count.lancamentos })),
  });
});

// POST /categorias { nome, cor? }
router.post('/', async (req, res) => {
  const dados = validar(criarSchema, req.body, res);
  if (!dados) return;

  try {
    const categoria = await prisma.categoria.create({
      data: { nome: dados.nome, cor: dados.cor ?? null, icone: dados.icone ?? 'etiqueta', casalId: req.casalId },
      select: { id: true, nome: true, cor: true, icone: true },
    });
    res.status(201).json({ categoria });
  } catch (erro) {
    if (erro.code === 'P2002') return res.status(409).json({ erro: NOME_REPETIDO });
    throw erro;
  }
});

// PATCH /categorias/:id { nome?, cor? }
router.patch('/:id', async (req, res) => {
  const id = validar(idSchema, req.params.id, res);
  if (!id) return;
  const dados = validar(editarSchema, req.body, res);
  if (!dados) return;

  try {
    // updateMany com casalId: só altera se a categoria for DESTE casal.
    const { count } = await prisma.categoria.updateMany({
      where: { id, casalId: req.casalId },
      data: dados,
    });
    if (count === 0) return res.status(404).json({ erro: 'Categoria não encontrada.' });

    const categoria = await prisma.categoria.findUnique({
      where: { id },
      select: { id: true, nome: true, cor: true, icone: true },
    });
    res.json({ categoria });
  } catch (erro) {
    if (erro.code === 'P2002') return res.status(409).json({ erro: NOME_REPETIDO });
    throw erro;
  }
});

// DELETE /categorias/:id -> os lançamentos dela ficam "sem categoria"
router.delete('/:id', async (req, res) => {
  const id = validar(idSchema, req.params.id, res);
  if (!id) return;

  const { count } = await prisma.categoria.deleteMany({ where: { id, casalId: req.casalId } });
  if (count === 0) return res.status(404).json({ erro: 'Categoria não encontrada.' });
  res.status(204).end();
});

export default router;
