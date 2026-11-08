// Configuração da ferramenta de linha de comando do Prisma (migrate, studio, seed).
import 'dotenv/config';
import { defineConfig } from 'prisma/config';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'node prisma/seed.js',
  },
  datasource: {
    // Migrações usam a conexão direta (o Neon recomenda não usar o pooler aqui).
    url: process.env.DIRECT_URL,
  },
});
