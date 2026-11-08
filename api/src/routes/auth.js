// Rotas de cadastro, login e "quem sou eu".
import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { autenticar } from '../middlewares/autenticar.js';

const router = Router();

// ---------- Validação dos dados recebidos (zod) ----------

// trim = tira espaços das pontas; toLowerCase = salva sempre em minúsculas
const email = z
  .string({ error: 'Informe o e-mail.' })
  .trim()
  .toLowerCase()
  .pipe(z.email({ error: 'E-mail inválido.' }));

const cadastroSchema = z.object({
  nome: z
    .string({ error: 'Informe o nome.' })
    .trim()
    .min(2, { error: 'O nome precisa ter pelo menos 2 letras.' })
    .max(60, { error: 'Nome muito longo.' }),
  email,
  senha: z
    .string({ error: 'Informe a senha.' })
    .min(8, { error: 'A senha precisa ter pelo menos 8 caracteres.' })
    .max(72, { error: 'A senha pode ter no máximo 72 caracteres.' }), // limite do bcrypt
});

const loginSchema = z.object({
  email,
  senha: z.string({ error: 'Informe a senha.' }).min(1, { error: 'Informe a senha.' }),
});

// Valida o corpo da requisição; se der erro, responde 400 com a primeira mensagem.
function validar(schema, req, res) {
  const resultado = schema.safeParse(req.body ?? {});
  if (!resultado.success) {
    res.status(400).json({ erro: resultado.error.issues[0].message });
    return null;
  }
  return resultado.data;
}

// ---------- Ajudantes ----------

// Campos do usuário que podem sair da API (o hash da senha NUNCA sai).
const camposPublicos = { id: true, nome: true, email: true, casalId: true, papel: true };

function gerarToken(usuarioId) {
  // "sub" (subject) = de quem é o token. Vale por 30 dias.
  return jwt.sign({ sub: String(usuarioId) }, process.env.JWT_SECRET, { expiresIn: '30d' });
}

// Hash "falso" usado quando o e-mail não existe, para o login demorar o mesmo
// tempo nos dois casos (assim ninguém descobre quais e-mails estão cadastrados).
const HASH_FALSO = bcrypt.hashSync('senha-que-nao-existe', 10);

// ---------- Rotas ----------

// POST /auth/cadastro  { nome, email, senha }
router.post('/cadastro', async (req, res) => {
  const dados = validar(cadastroSchema, req, res);
  if (!dados) return;

  const senhaHash = await bcrypt.hash(dados.senha, 10);

  try {
    const usuario = await prisma.usuario.create({
      data: { nome: dados.nome, email: dados.email, senhaHash },
      select: camposPublicos,
    });
    res.status(201).json({ token: gerarToken(usuario.id), usuario });
  } catch (erro) {
    // P2002 = violou um campo @unique (o e-mail já existe)
    if (erro.code === 'P2002') {
      return res.status(409).json({ erro: 'Este e-mail já está cadastrado.' });
    }
    throw erro; // outros erros vão para o tratador geral (app.js)
  }
});

// POST /auth/login  { email, senha }
router.post('/login', async (req, res) => {
  const dados = validar(loginSchema, req, res);
  if (!dados) return;

  const usuario = await prisma.usuario.findUnique({ where: { email: dados.email } });
  const senhaConfere = await bcrypt.compare(dados.senha, usuario?.senhaHash ?? HASH_FALSO);

  if (!usuario || !senhaConfere) {
    return res.status(401).json({ erro: 'E-mail ou senha inválidos.' });
  }

  const { id, nome, email: emailSalvo, casalId, papel } = usuario;
  res.json({ token: gerarToken(id), usuario: { id, nome, email: emailSalvo, casalId, papel } });
});

// GET /auth/eu  (precisa de token) -> dados de quem está logado
router.get('/eu', autenticar, async (req, res) => {
  const usuario = await prisma.usuario.findUnique({
    where: { id: req.usuarioId },
    select: camposPublicos,
  });
  if (!usuario) {
    return res.status(401).json({ erro: 'Usuário não encontrado. Faça login de novo.' });
  }
  res.json({ usuario });
});

export default router;
