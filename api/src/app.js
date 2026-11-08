import express from 'express';
import cors from 'cors';
import { prisma } from './lib/prisma.js';
import authRoutes from './routes/auth.js';
import casalRoutes from './routes/casal.js';
import categoriasRoutes from './routes/categorias.js';
import lancamentosRoutes from './routes/lancamentos.js';
import caixinhasRoutes from './routes/caixinhas.js';
import investimentosRoutes from './routes/investimentos.js';
import resumoRoutes from './routes/resumo.js';

const app = express();

// Na Vercel a API fica atrás de um "proxy". Isto faz o Express enxergar o IP
// real de quem acessa (necessário para o limite de tentativas funcionar).
app.set('trust proxy', 1);

// Só estes endereços podem chamar a API pelo navegador.
// WEB_URL pode ter mais de um, separados por vírgula.
const origensPermitidas = (process.env.WEB_URL || 'http://localhost:5173')
  .split(',')
  .map((url) => url.trim());
app.use(cors({ origin: origensPermitidas }));

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

// Espaço do casal (criar, entrar com código, ver, novo convite)
app.use('/casal', casalRoutes);

// Categorias e lançamentos (sempre do casal de quem está logado)
app.use('/categorias', categoriasRoutes);
app.use('/lancamentos', lancamentosRoutes);

// Caixinhas para sonhos e onde o dinheiro está investido
app.use('/caixinhas', caixinhasRoutes);
app.use('/investimentos', investimentosRoutes);

// Números da tela Início (dashboard do mês)
app.use('/resumo', resumoRoutes);

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
