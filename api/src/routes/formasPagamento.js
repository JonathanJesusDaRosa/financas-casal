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

// Só para cartão de crédito: dias em que a fatura fecha e vence (1 a 31)
const dia = z
  .number({ error: 'Dia inválido.' })
  .int({ error: 'Dia inválido.' })
  .min(1, { error: 'O dia vai de 1 a 31.' })
  .max(31, { error: 'O dia vai de 1 a 31.' })
  .nullish();

const criarSchema = z.object({ nome, tipo, diaFechamento: dia, diaVencimento: dia });
const editarSchema = z.object({ nome, tipo, diaFechamento: dia, diaVencimento: dia }).partial();

// Dias de fatura só fazem sentido no crédito; nos outros tipos ficam vazios.
function limparDias(dados, tipoFinal) {
  if (tipoFinal === 'CREDITO') return dados;
  return { ...dados, diaFechamento: null, diaVencimento: null };
}

const NOME_REPETIDO = 'Já existe uma forma de pagamento com esse nome.';
const selecao = {
  id: true,
  nome: true,
  tipo: true,
  diaFechamento: true,
  diaVencimento: true,
  _count: { select: { lancamentos: true } },
};
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
    const forma = await prisma.formaPagamento.create({
      data: { ...limparDias(dados, dados.tipo), casalId: req.casalId },
      select: selecao,
    });
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
    const atual = await prisma.formaPagamento.findFirst({ where: { id, casalId: req.casalId } });
    if (!atual) return res.status(404).json({ erro: 'Forma de pagamento não encontrada.' });
    // Cartão com compras em faturas não pode deixar de ser crédito (as faturas ficariam sem dono)
    if (atual.tipo === 'CREDITO' && dados.tipo && dados.tipo !== 'CREDITO' && (await temComprasEmFaturas(id))) {
      return res.status(409).json({ erro: MENSAGEM_CARTAO_EM_USO });
    }
    await prisma.formaPagamento.update({ where: { id }, data: limparDias(dados, dados.tipo ?? atual.tipo) });
    const forma = await prisma.formaPagamento.findUnique({ where: { id }, select: selecao });
    res.json({ forma: formatar(forma) });
  } catch (erro) {
    if (erro.code === 'P2002') return res.status(409).json({ erro: NOME_REPETIDO });
    throw erro;
  }
});

// Cartão com compras em faturas: apagar deixaria essas compras sem fatura para pagar
// (nunca contariam como saída). Nesse caso, só dá para renomear.
const MENSAGEM_CARTAO_EM_USO =
  'Este cartão tem compras em faturas. Para não bagunçar as faturas, ele não pode ser apagado nem mudar de tipo. Você pode renomeá-lo.';

async function temComprasEmFaturas(id) {
  return (await prisma.lancamento.count({ where: { formaPagamentoId: id, faturaMes: { not: null } } })) > 0;
}

// DELETE /formas-pagamento/:id -> os lançamentos continuam, só ficam "sem forma"
router.delete('/:id', async (req, res) => {
  const id = validar(idSchema, req.params.id, res);
  if (!id) return;
  const existe = await prisma.formaPagamento.count({ where: { id, casalId: req.casalId } });
  if (existe && (await temComprasEmFaturas(id))) return res.status(409).json({ erro: MENSAGEM_CARTAO_EM_USO });
  const { count } = await prisma.formaPagamento.deleteMany({ where: { id, casalId: req.casalId } });
  if (count === 0) return res.status(404).json({ erro: 'Forma de pagamento não encontrada.' });
  res.status(204).end();
});

export default router;
