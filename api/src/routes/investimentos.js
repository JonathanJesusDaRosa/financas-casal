// Investimentos: onde o dinheiro das caixinhas está aplicado (registro manual).
// O saldo de cada investimento é a soma do saldo das caixinhas ligadas a ele.
import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { autenticar } from '../middlewares/autenticar.js';
import { exigirCasal } from '../middlewares/exigirCasal.js';
import { calcularSaldos } from '../lib/saldos.js';
import { idSchema, validar } from '../lib/validar.js';

const router = Router();
router.use(autenticar, exigirCasal);

const nomeSchema = z.object({
  nome: z
    .string({ error: 'Informe o nome do investimento.' })
    .trim()
    .min(1, { error: 'Informe o nome do investimento.' })
    .max(60, { error: 'Nome muito longo (máximo 60 letras).' }),
});

const NOME_REPETIDO = 'Já existe um investimento com esse nome.';

// GET /investimentos -> cada investimento com suas caixinhas e o total
// (+ as caixinhas que ainda não estão em nenhum investimento)
router.get('/', async (req, res) => {
  const [investimentos, caixinhas, saldoDe] = await Promise.all([
    prisma.investimento.findMany({
      where: { casalId: req.casalId },
      orderBy: { nome: 'asc' },
      select: { id: true, nome: true },
    }),
    prisma.caixinha.findMany({
      where: { casalId: req.casalId, arquivada: false },
      orderBy: { criadoEm: 'asc' },
      select: { id: true, nome: true, icone: true, investimentoId: true },
    }),
    calcularSaldos(req.casalId),
  ]);

  const comSaldo = caixinhas.map((c) => ({ ...c, saldoCentavos: saldoDe(c.id).saldo }));
  const somar = (lista) => lista.reduce((total, c) => total + c.saldoCentavos, 0);

  const resposta = investimentos.map((inv) => {
    const dele = comSaldo.filter((c) => c.investimentoId === inv.id);
    return { ...inv, saldoCentavos: somar(dele), caixinhas: dele };
  });
  const semInvestimento = comSaldo.filter((c) => !c.investimentoId);

  res.json({
    totalCentavos: somar(comSaldo),
    investimentos: resposta,
    caixinhasSemInvestimento: semInvestimento,
  });
});

// POST /investimentos { nome }
router.post('/', async (req, res) => {
  const dados = validar(nomeSchema, req.body, res);
  if (!dados) return;
  try {
    const investimento = await prisma.investimento.create({
      data: { nome: dados.nome, casalId: req.casalId },
      select: { id: true, nome: true },
    });
    res.status(201).json({ investimento });
  } catch (erro) {
    if (erro.code === 'P2002') return res.status(409).json({ erro: NOME_REPETIDO });
    throw erro;
  }
});

// PATCH /investimentos/:id { nome }
router.patch('/:id', async (req, res) => {
  const id = validar(idSchema, req.params.id, res);
  if (!id) return;
  const dados = validar(nomeSchema, req.body, res);
  if (!dados) return;
  try {
    const { count } = await prisma.investimento.updateMany({
      where: { id, casalId: req.casalId },
      data: { nome: dados.nome },
    });
    if (count === 0) return res.status(404).json({ erro: 'Investimento não encontrado.' });
    res.json({ investimento: { id, nome: dados.nome } });
  } catch (erro) {
    if (erro.code === 'P2002') return res.status(409).json({ erro: NOME_REPETIDO });
    throw erro;
  }
});

// DELETE /investimentos/:id -> as caixinhas dele ficam "sem investimento"
router.delete('/:id', async (req, res) => {
  const id = validar(idSchema, req.params.id, res);
  if (!id) return;
  const { count } = await prisma.investimento.deleteMany({ where: { id, casalId: req.casalId } });
  if (count === 0) return res.status(404).json({ erro: 'Investimento não encontrado.' });
  res.status(204).end();
});

export default router;
