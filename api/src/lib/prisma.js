// Conexão única com o banco, reaproveitada por toda a API.
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client.ts';

// O "adapter" é o driver que conversa com o PostgreSQL (usa a conexão pooled do Neon).
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });

export const prisma = new PrismaClient({ adapter });
