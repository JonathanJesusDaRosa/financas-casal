// Lançamentos (despesas e receitas) do casal.
import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { autenticar } from '../middlewares/autenticar.js';
import { exigirCasal } from '../middlewares/exigirCasal.js';
import { dataSchema, idSchema, mesSchema, paraData, paraTexto, validar } from '../lib/validar.js';

const router = Router();
router.use(autenticar, exigirCasal);

// ---------- Validação ----------

// Valor em CENTAVOS. O limite (R$ 10 milhões) fica bem abaixo do máximo de um
// Int no PostgreSQL (~R$ 21 milhões em centavos).
const valorCentavos = z
  .number({ error: 'Informe o valor.' })
  .int({ error: 'Valor inválido.' })
  .positive({ error: 'O valor precisa ser maior que zero.' })
  .max(1_000_000_000, { error: 'Valor alto demais.' });

const campos = {
  tipo: z.enum(['RECEITA', 'DESPESA'], { error: 'Escolha despesa ou receita.' }),
  valorCentavos,
  data: dataSchema,
  descricao: z
    .string()
    .trim()
    .max(120, { error: 'Descrição muito longa (máximo 120 letras).' })
    .nullish() // pode vir vazio
    .transform((texto) => texto || null),
  categoriaId: idSchema.nullish(),
  pagoPorId: idSchema,
};

const criarSchema = z.object(campos);
const editarSchema = z.object(campos).partial(); // na edição todos são opcionais

// ---------- Ajudantes ----------

// O que a API devolve sobre cada lançamento.
const selecao = {
  id: true,
  tipo: true,
  valorCentavos: true,
  data: true,
  descricao: true,
  categoria: { select: { id: true, nome: true, cor: true, icone: true } },
  pagoPor: { select: { id: true, nome: true } },
  caixinha: { select: { id: true, nome: true, icone: true } },
};

// Tipos que pertencem a uma caixinha: só podem ser criados/apagados pelas rotas de /caixinhas.
const TIPOS_DE_CAIXINHA = ['GUARDADO', 'RESGATE', 'RENDIMENTO'];
const MENSAGEM_CAIXINHA = 'Este movimento é de uma meta. Altere pelo histórico da meta.';

// Converte a data para "AAAA-MM-DD" (sem hora, sem fuso).
const formatar = (lancamento) => ({ ...lancamento, data: paraTexto(lancamento.data) });

// Confere se a categoria e quem pagou são DESTE casal.
// Sem isso, alguém poderia ligar um lançamento à categoria de outro casal.
async function conferirVinculos({ categoriaId, pagoPorId }, casalId) {
  if (categoriaId) {
    const ok = await prisma.categoria.count({ where: { id: categoriaId, casalId } });
    if (!ok) return 'Categoria não encontrada.';
  }
  if (pagoPorId) {
    const ok = await prisma.usuario.count({ where: { id: pagoPorId, casalId } });
    if (!ok) return 'A pessoa que pagou não faz parte da casa.';
  }
  return null;
}

// "2026-11" -> { inicio: 2026-11-01, fim: 2026-12-01 }
function intervaloDoMes(mes) {
  const [ano, numero] = mes.split('-').map(Number);
  return {
    inicio: new Date(Date.UTC(ano, numero - 1, 1)),
    fim: new Date(Date.UTC(ano, numero, 1)),
  };
}

// ---------- Rotas ----------

// GET /lancamentos?mes=2026-11 -> lançamentos do mês + totais
//   entradas   = receitas + resgates de caixinhas (dinheiro que ficou disponível)
//   saidas     = despesas
//   guardado   = o que foi separado para as caixinhas
//   sobra      = entradas - saidas - guardado
//   rendimento = juros das caixinhas no mês (só informativo, NÃO entra na sobra)
router.get('/', async (req, res) => {
  const mes = validar(mesSchema, req.query.mes ?? new Date().toISOString().slice(0, 7), res);
  if (!mes) return;
  const { inicio, fim } = intervaloDoMes(mes);

  const doMes = await prisma.lancamento.findMany({
    where: { casalId: req.casalId, data: { gte: inicio, lt: fim } },
    orderBy: [{ data: 'desc' }, { id: 'desc' }],
    select: selecao,
  });

  const somar = (...tipos) =>
    doMes.filter((l) => tipos.includes(l.tipo)).reduce((total, l) => total + l.valorCentavos, 0);
  const entradas = somar('RECEITA', 'RESGATE');
  const saidas = somar('DESPESA');
  const guardado = somar('GUARDADO');

  res.json({
    mes,
    totais: {
      entradas,
      saidas,
      guardado,
      sobra: entradas - saidas - guardado,
      rendimento: somar('RENDIMENTO'),
    },
    // Rendimentos ficam fora da lista (aparecem no histórico da caixinha).
    lancamentos: doMes.filter((l) => l.tipo !== 'RENDIMENTO').map(formatar),
  });
});

// GET /lancamentos/:id -> um lançamento (usado na tela de edição)
router.get('/:id', async (req, res) => {
  const id = validar(idSchema, req.params.id, res);
  if (!id) return;

  const lancamento = await prisma.lancamento.findFirst({
    where: { id, casalId: req.casalId },
    select: selecao,
  });
  if (!lancamento) return res.status(404).json({ erro: 'Lançamento não encontrado.' });
  res.json({ lancamento: formatar(lancamento) });
});

// POST /lancamentos
router.post('/', async (req, res) => {
  const dados = validar(criarSchema, req.body, res);
  if (!dados) return;

  const problema = await conferirVinculos(dados, req.casalId);
  if (problema) return res.status(400).json({ erro: problema });

  const lancamento = await prisma.lancamento.create({
    data: { ...dados, data: paraData(dados.data), casalId: req.casalId },
    select: selecao,
  });
  res.status(201).json({ lancamento: formatar(lancamento) });
});

// PATCH /lancamentos/:id
router.patch('/:id', async (req, res) => {
  const id = validar(idSchema, req.params.id, res);
  if (!id) return;
  const dados = validar(editarSchema, req.body, res);
  if (!dados) return;

  const existente = await prisma.lancamento.findFirst({
    where: { id, casalId: req.casalId },
    select: { tipo: true },
  });
  if (!existente) return res.status(404).json({ erro: 'Lançamento não encontrado.' });
  if (TIPOS_DE_CAIXINHA.includes(existente.tipo)) return res.status(400).json({ erro: MENSAGEM_CAIXINHA });

  const problema = await conferirVinculos(dados, req.casalId);
  if (problema) return res.status(400).json({ erro: problema });

  const lancamento = await prisma.lancamento.update({
    where: { id },
    data: { ...dados, ...(dados.data && { data: paraData(dados.data) }) },
    select: selecao,
  });
  res.json({ lancamento: formatar(lancamento) });
});

// DELETE /lancamentos/:id
router.delete('/:id', async (req, res) => {
  const id = validar(idSchema, req.params.id, res);
  if (!id) return;

  // Só apaga receitas e despesas; movimentos de caixinha têm regra própria (saldo).
  const { count } = await prisma.lancamento.deleteMany({
    where: { id, casalId: req.casalId, tipo: { in: ['RECEITA', 'DESPESA'] } },
  });
  if (count === 0) {
    const deCaixinha = await prisma.lancamento.count({ where: { id, casalId: req.casalId } });
    return deCaixinha
      ? res.status(400).json({ erro: MENSAGEM_CAIXINHA })
      : res.status(404).json({ erro: 'Lançamento não encontrado.' });
  }
  res.status(204).end();
});

export default router;
