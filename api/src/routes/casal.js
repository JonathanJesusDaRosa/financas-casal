// Rotas do espaço do casal: criar, entrar com código, ver e gerar novo convite.
import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { autenticar } from '../middlewares/autenticar.js';
import { exigirCasal } from '../middlewares/exigirCasal.js';
import { limiteConvite } from '../middlewares/limitarTentativas.js';
import { CATEGORIAS_PADRAO } from '../lib/categoriasPadrao.js';
import { gerarCodigoConvite, normalizarCodigo, novaValidade } from '../lib/convite.js';

const router = Router();
const MAX_TITULARES = 2;

// Todas as rotas daqui exigem login.
router.use(autenticar);

// Erro "esperado" que já carrega o status HTTP e a mensagem para o usuário.
class ErroDeRegra extends Error {
  constructor(status, mensagem) {
    super(mensagem);
    this.status = status;
  }
}

function responderErroDeRegra(erro, res) {
  if (erro instanceof ErroDeRegra) {
    res.status(erro.status).json({ erro: erro.message });
    return true;
  }
  return false;
}

// Monta o que a API devolve sobre o casal.
// O código de convite só aparece para titulares e enquanto houver vaga.
async function montarCasal(casalId, papelDeQuemPede) {
  const casal = await prisma.casal.findUnique({
    where: { id: casalId },
    include: {
      usuarios: { select: { id: true, nome: true, papel: true }, orderBy: { id: 'asc' } },
    },
  });

  const titulares = casal.usuarios.filter((u) => u.papel === 'TITULAR').length;
  const podeConvidar = papelDeQuemPede === 'TITULAR' && titulares < MAX_TITULARES;
  const conviteValido =
    casal.codigoConvite && casal.conviteExpiraEm && casal.conviteExpiraEm > new Date();

  return {
    id: casal.id,
    nome: casal.nome,
    membros: casal.usuarios,
    podeConvidar,
    convite:
      podeConvidar && conviteValido
        ? { codigo: casal.codigoConvite, expiraEm: casal.conviteExpiraEm }
        : null,
  };
}

// Tenta algumas vezes caso o código sorteado já exista (muito raro).
async function comCodigoUnico(acao) {
  for (let tentativa = 0; tentativa < 5; tentativa++) {
    try {
      return await acao(gerarCodigoConvite());
    } catch (erro) {
      const codigoRepetido = erro.code === 'P2002' && String(erro.meta?.target ?? '').includes('codigoConvite');
      if (!codigoRepetido) throw erro;
    }
  }
  throw new Error('Não foi possível gerar um código de convite único.');
}

// ---------- POST /casal  { nome } -> cria o espaço ----------
const criarSchema = z.object({
  nome: z
    .string({ error: 'Dê um nome para o espaço.' })
    .trim()
    .min(2, { error: 'O nome precisa ter pelo menos 2 letras.' })
    .max(60, { error: 'Nome muito longo.' }),
});

router.post('/', async (req, res) => {
  const resultado = criarSchema.safeParse(req.body ?? {});
  if (!resultado.success) {
    return res.status(400).json({ erro: resultado.error.issues[0].message });
  }

  try {
    // $transaction = ou tudo dá certo, ou nada é salvo.
    const casal = await comCodigoUnico((codigo) =>
      prisma.$transaction(async (tx) => {
        const novo = await tx.casal.create({
          data: {
            nome: resultado.data.nome,
            codigoConvite: codigo,
            conviteExpiraEm: novaValidade(),
            categorias: { create: CATEGORIAS_PADRAO },
          },
        });

        // Só entra se ainda não estiver em nenhum casal (evita criar dois).
        const { count } = await tx.usuario.updateMany({
          where: { id: req.usuarioId, casalId: null },
          data: { casalId: novo.id, papel: 'TITULAR' },
        });
        if (count === 0) throw new ErroDeRegra(409, 'Você já faz parte de um espaço.');

        return novo;
      }),
    );

    res.status(201).json({ casal: await montarCasal(casal.id, 'TITULAR') });
  } catch (erro) {
    if (!responderErroDeRegra(erro, res)) throw erro;
  }
});

// ---------- POST /casal/entrar  { codigo } -> entra num espaço ----------
router.post('/entrar', limiteConvite, async (req, res) => {
  const codigo = normalizarCodigo(req.body?.codigo);
  if (codigo.length !== 7) {
    return res.status(400).json({ erro: 'O código tem 6 letras/números, como K7M-4QX.' });
  }

  try {
    const casalId = await prisma.$transaction(async (tx) => {
      const casal = await tx.casal.findUnique({ where: { codigoConvite: codigo } });
      if (!casal || !casal.conviteExpiraEm || casal.conviteExpiraEm <= new Date()) {
        throw new ErroDeRegra(404, 'Código inválido ou vencido. Peça um novo código.');
      }

      const titulares = await tx.usuario.count({ where: { casalId: casal.id, papel: 'TITULAR' } });
      if (titulares >= MAX_TITULARES) {
        throw new ErroDeRegra(409, 'Este espaço já está completo.');
      }

      const { count } = await tx.usuario.updateMany({
        where: { id: req.usuarioId, casalId: null },
        data: { casalId: casal.id, papel: 'TITULAR' },
      });
      if (count === 0) throw new ErroDeRegra(409, 'Você já faz parte de um espaço.');

      // Casal completo: o código deixa de funcionar.
      if (titulares + 1 >= MAX_TITULARES) {
        await tx.casal.update({
          where: { id: casal.id },
          data: { codigoConvite: null, conviteExpiraEm: null },
        });
      }
      return casal.id;
    });

    res.json({ casal: await montarCasal(casalId, 'TITULAR') });
  } catch (erro) {
    if (!responderErroDeRegra(erro, res)) throw erro;
  }
});

// ---------- GET /casal -> dados do meu espaço ----------
router.get('/', exigirCasal, async (req, res) => {
  res.json({ casal: await montarCasal(req.casalId, req.papel) });
});

// ---------- POST /casal/convite -> gera um código novo ----------
router.post('/convite', exigirCasal, async (req, res) => {
  const atual = await montarCasal(req.casalId, req.papel);
  if (!atual.podeConvidar) {
    return res.status(409).json({ erro: 'O espaço já está completo.' });
  }

  await comCodigoUnico((codigo) =>
    prisma.casal.update({
      where: { id: req.casalId },
      data: { codigoConvite: codigo, conviteExpiraEm: novaValidade() },
    }),
  );

  res.json({ casal: await montarCasal(req.casalId, req.papel) });
});

export default router;
