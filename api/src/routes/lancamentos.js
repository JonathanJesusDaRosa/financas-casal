// Lançamentos (despesas e receitas) da casa.
//
// Cartão de crédito: uma DESPESA paga com cartão (forma tipo CREDITO, com fechamento e
// vencimento cadastrados) NÃO conta no "Saiu" do mês. Ela vai para a fatura do cartão
// (campo faturaMes) e o dinheiro só sai quando a fatura é paga (lançamento tipo FATURA).
// Compra parcelada no cartão vira N lançamentos (um por parcela, cada um na sua fatura).
import { randomUUID } from 'node:crypto';
import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { autenticar } from '../middlewares/autenticar.js';
import { exigirCasal } from '../middlewares/exigirCasal.js';
import { dataSchema, idSchema, mesSchema, paraData, paraTexto, validar } from '../lib/validar.js';
import { cartaoConfigurado, faturaDaCompra, somarMesesNaData } from '../lib/fatura.js';

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
  formaPagamentoId: idSchema.nullish(),
  pagoPorId: idSchema,
};

// Na criação, "parcelas" (só para compra no cartão): o valor informado é o TOTAL da compra.
const criarSchema = z.object({
  ...campos,
  parcelas: z
    .number({ error: 'Número de parcelas inválido.' })
    .int({ error: 'Número de parcelas inválido.' })
    .min(1, { error: 'As parcelas vão de 1 a 48.' })
    .max(48, { error: 'As parcelas vão de 1 a 48.' })
    .default(1),
});
const editarSchema = z.object(campos).partial(); // na edição todos são opcionais

// ---------- Ajudantes ----------

// O que a API devolve sobre cada lançamento.
const selecao = {
  id: true,
  tipo: true,
  valorCentavos: true,
  data: true,
  descricao: true,
  competencia: true,
  faturaMes: true,
  parcela: true,
  totalParcelas: true,
  grupoParcelas: true,
  categoria: { select: { id: true, nome: true, cor: true, icone: true } },
  pagoPor: { select: { id: true, nome: true } },
  caixinha: { select: { id: true, nome: true, icone: true } },
  formaPagamento: { select: { id: true, nome: true, tipo: true } },
};

// Tipos que têm tela própria: metas (/caixinhas) e pagamento de fatura (/faturas).
const TIPOS_DE_CAIXINHA = ['GUARDADO', 'RESGATE', 'RENDIMENTO'];
const MENSAGEM_CAIXINHA = 'Este movimento é de uma meta. Altere pelo histórico da meta.';
const MENSAGEM_FATURA = 'Este é o pagamento de uma fatura. Desfaça pela tela do cartão.';

// Converte a data para "AAAA-MM-DD" (sem hora, sem fuso).
const formatar = (lancamento) => ({ ...lancamento, data: paraTexto(lancamento.data) });

// Confere se a categoria, a forma e quem pagou são DESTA casa.
// Sem isso, alguém poderia ligar um lançamento à categoria de outra casa.
// Devolve { problema } ou { forma } (a forma completa, para saber se é cartão).
async function conferirVinculos({ categoriaId, pagoPorId, formaPagamentoId }, casalId) {
  if (categoriaId) {
    const ok = await prisma.categoria.count({ where: { id: categoriaId, casalId } });
    if (!ok) return { problema: 'Categoria não encontrada.' };
  }
  let forma = null;
  if (formaPagamentoId) {
    forma = await prisma.formaPagamento.findFirst({ where: { id: formaPagamentoId, casalId } });
    if (!forma) return { problema: 'Forma de pagamento não encontrada.' };
  }
  if (pagoPorId) {
    const ok = await prisma.usuario.count({ where: { id: pagoPorId, casalId } });
    if (!ok) return { problema: 'A pessoa que pagou não faz parte da casa.' };
  }
  return { forma };
}

// A despesa vai para a fatura? Só se for DESPESA paga com cartão de crédito configurado.
// Cartão de crédito SEM fechamento/vencimento: avisamos para configurar.
function regraDoCartao(tipo, forma) {
  if (tipo !== 'DESPESA' || forma?.tipo !== 'CREDITO') return { vaiParaFatura: false };
  if (!cartaoConfigurado(forma)) {
    return {
      problema: `Cadastre o dia de fechamento e de vencimento do cartão "${forma.nome}" em Casa → Formas de pagamento.`,
    };
  }
  return { vaiParaFatura: true };
}

// "2026-11" -> { inicio: 2026-11-01, fim: 2026-12-01 }
function intervaloDoMes(mes) {
  const [ano, numero] = mes.split('-').map(Number);
  return {
    inicio: new Date(Date.UTC(ano, numero - 1, 1)),
    fim: new Date(Date.UTC(ano, numero, 1)),
  };
}

// É uma compra no cartão (vai para a fatura, não conta no "Saiu")?
const noCartao = (l) => l.tipo === 'DESPESA' && Boolean(l.faturaMes);

// ---------- Rotas ----------

// GET /lancamentos?mes=2026-11 -> lançamentos do mês + totais
//   entradas   = receitas + resgates de metas (dinheiro que ficou disponível)
//   saidas     = despesas pagas na hora + pagamentos de fatura (dinheiro que SAIU)
//   noCartao   = compras no cartão neste mês (vão para as faturas; só informativo)
//   guardado   = o que foi separado para as metas
//   sobra      = entradas - saidas - guardado
//   rendimento = juros das metas no mês (só informativo, NÃO entra na sobra)
router.get('/', async (req, res) => {
  const mes = validar(mesSchema, req.query.mes ?? new Date().toISOString().slice(0, 7), res);
  if (!mes) return;
  const { inicio, fim } = intervaloDoMes(mes);

  const doMes = await prisma.lancamento.findMany({
    where: { casalId: req.casalId, data: { gte: inicio, lt: fim } },
    orderBy: [{ data: 'desc' }, { id: 'desc' }],
    select: selecao,
  });

  const somar = (lista) => lista.reduce((total, l) => total + l.valorCentavos, 0);
  const doTipo = (...tipos) => doMes.filter((l) => tipos.includes(l.tipo));
  const entradas = somar(doTipo('RECEITA', 'RESGATE'));
  const saidas = somar(doTipo('DESPESA', 'FATURA').filter((l) => !noCartao(l)));
  const guardado = somar(doTipo('GUARDADO'));

  res.json({
    mes,
    totais: {
      entradas,
      saidas,
      noCartao: somar(doMes.filter(noCartao)),
      guardado,
      sobra: entradas - saidas - guardado,
      rendimento: somar(doTipo('RENDIMENTO')),
    },
    // Rendimentos ficam fora da lista (aparecem no histórico da meta).
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

// POST /lancamentos { ..., parcelas? }
// No cartão: 1 parcela = compra à vista na fatura; N parcelas = N lançamentos, um por fatura.
router.post('/', async (req, res) => {
  const { parcelas, ...dados } = validar(criarSchema, req.body, res) ?? {};
  if (!dados.tipo) return;

  const { problema, forma } = await conferirVinculos(dados, req.casalId);
  if (problema) return res.status(400).json({ erro: problema });

  const cartao = regraDoCartao(dados.tipo, forma);
  if (cartao.problema) return res.status(400).json({ erro: cartao.problema });
  if (parcelas > 1 && !cartao.vaiParaFatura) {
    return res.status(400).json({ erro: 'Parcelar só vale para compra no cartão de crédito.' });
  }

  const base = { ...dados, casalId: req.casalId };

  // Fora do cartão: um lançamento normal
  if (!cartao.vaiParaFatura) {
    const lancamento = await prisma.lancamento.create({
      data: { ...base, data: paraData(dados.data) },
      select: selecao,
    });
    return res.status(201).json({ lancamento: formatar(lancamento) });
  }

  // No cartão: divide o total em parcelas (os centavos que sobram ficam na 1ª parcela,
  // para a soma bater certinho). Cada parcela cai num mês e numa fatura.
  const valorParcela = Math.floor(dados.valorCentavos / parcelas);
  const sobraCentavos = dados.valorCentavos - valorParcela * parcelas;
  const grupoParcelas = parcelas > 1 ? randomUUID() : null;

  const registros = Array.from({ length: parcelas }, (_, i) => {
    const dataParcela = somarMesesNaData(dados.data, i);
    return {
      ...base,
      valorCentavos: valorParcela + (i === 0 ? sobraCentavos : 0),
      data: paraData(dataParcela),
      faturaMes: faturaDaCompra(dataParcela, forma.diaFechamento, forma.diaVencimento),
      ...(grupoParcelas && { parcela: i + 1, totalParcelas: parcelas, grupoParcelas }),
    };
  });

  // $transaction: ou cria todas as parcelas, ou nenhuma
  const criados = await prisma.$transaction(
    registros.map((data) => prisma.lancamento.create({ data, select: selecao })),
  );
  res.status(201).json({ lancamento: formatar(criados[0]), parcelasCriadas: criados.length });
});

// PATCH /lancamentos/:id
router.patch('/:id', async (req, res) => {
  const id = validar(idSchema, req.params.id, res);
  if (!id) return;
  const dados = validar(editarSchema, req.body, res);
  if (!dados) return;

  const existente = await prisma.lancamento.findFirst({ where: { id, casalId: req.casalId } });
  if (!existente) return res.status(404).json({ erro: 'Lançamento não encontrado.' });
  if (TIPOS_DE_CAIXINHA.includes(existente.tipo)) return res.status(400).json({ erro: MENSAGEM_CAIXINHA });
  if (existente.tipo === 'FATURA') return res.status(400).json({ erro: MENSAGEM_FATURA });

  const { problema, forma: formaNova } = await conferirVinculos(dados, req.casalId);
  if (problema) return res.status(400).json({ erro: problema });

  // Como fica depois da edição: recalcula a fatura (pode ter mudado data, forma ou tipo)
  const final = { ...existente, ...dados, data: dados.data ?? paraTexto(existente.data) };
  const forma = dados.formaPagamentoId !== undefined
    ? formaNova
    : existente.formaPagamentoId && (await prisma.formaPagamento.findUnique({ where: { id: existente.formaPagamentoId } }));
  const cartao = regraDoCartao(final.tipo, forma);
  if (cartao.problema) return res.status(400).json({ erro: cartao.problema });

  const lancamento = await prisma.lancamento.update({
    where: { id },
    data: {
      ...dados,
      ...(dados.data && { data: paraData(dados.data) }),
      faturaMes: cartao.vaiParaFatura ? faturaDaCompra(final.data, forma.diaFechamento, forma.diaVencimento) : null,
    },
    select: selecao,
  });
  res.json({ lancamento: formatar(lancamento) });
});

// DELETE /lancamentos/:id[?todasParcelas=1]
// Com todasParcelas=1, apaga a compra parcelada inteira (todas as parcelas do grupo).
router.delete('/:id', async (req, res) => {
  const id = validar(idSchema, req.params.id, res);
  if (!id) return;

  const existente = await prisma.lancamento.findFirst({ where: { id, casalId: req.casalId } });
  if (!existente) return res.status(404).json({ erro: 'Lançamento não encontrado.' });
  if (TIPOS_DE_CAIXINHA.includes(existente.tipo)) return res.status(400).json({ erro: MENSAGEM_CAIXINHA });
  if (existente.tipo === 'FATURA') return res.status(400).json({ erro: MENSAGEM_FATURA });

  if (req.query.todasParcelas === '1' && existente.grupoParcelas) {
    await prisma.lancamento.deleteMany({ where: { casalId: req.casalId, grupoParcelas: existente.grupoParcelas } });
  } else {
    await prisma.lancamento.delete({ where: { id } });
  }
  res.status(204).end();
});

export default router;
