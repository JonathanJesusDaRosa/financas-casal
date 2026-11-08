import express from 'express';
import cors from 'cors';
import { prisma } from './lib/prisma.js';
import authRoutes from './routes/auth.js';

const app = express();

// Permite que o front-end (localhost:5173) chame esta API.
app.use(cors({ origin: process.env.WEB_URL || 'http://localhost:5173' }));

// Faz o Express entender o corpo das requisições em JSON.
app.use(express.json());

// Rota de teste: se responder, a API está no ar.
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Testa se a API consegue falar com o banco (Neon).
app.get('/health/db', async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: 'ok', banco: 'conectado' });
  } catch (erro) {
    console.error(erro);
    res.status(503).json({ status: 'erro', banco: 'sem conexão' });
  }
});

// Cadastro, login e "quem sou eu"
app.use('/auth', authRoutes);

// Rota que não existe
app.use((req, res) => {
  res.status(404).json({ erro: 'Rota não encontrada.' });
});

// Tratador geral de erros: qualquer erro não previsto cai aqui.
// (O Express 5 já manda para cá os erros de funções async.)
app.use((erro, req, res, next) => {
  if (erro.type === 'entity.parse.failed') {
    return res.status(400).json({ erro: 'JSON inválido no corpo da requisição.' });
  }
  console.error(erro);
  res.status(500).json({ erro: 'Erro interno. Tente de novo em instantes.' });
});

export default app;
