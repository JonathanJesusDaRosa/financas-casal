// Conexão única com o banco, reaproveitada por toda a API.
import { PrismaPg } from '@prisma/adapter-pg';
// O cliente é gerado em JavaScript dentro de node_modules pelo "prisma generate"
// (gerador clássico "prisma-client-js"; o novo gera TypeScript, que a Vercel não empacota).
import { PrismaClient } from '@prisma/client';

// O "adapter" é o driver que conversa com o PostgreSQL (usa a conexão pooled do Neon).
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });

export const prisma = new PrismaClient({ adapter });

// Tempo máximo das transações "interativas" (padrão do Prisma: 5 segundos).
// Damos folga porque, na Vercel, cada ida ao banco leva mais tempo que no computador.
export const OPCOES_TRANSACAO = { timeout: 15000, maxWait: 10000 };
