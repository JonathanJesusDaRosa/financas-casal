// Aplica as migrações pendentes no banco de PRODUÇÃO (o que o app publicado usa).
// Rodar: npm run db:migrar-producao
//
// No dia a dia, o .env aponta para o banco de desenvolvimento (branch "dev" do Neon).
// Este script troca, só durante a execução, para o endereço de produção
// (PRODUCAO_DIRECT_URL no .env) e roda "prisma migrate deploy".
import 'dotenv/config';
import { spawnSync } from 'node:child_process';

const urlProducao = process.env.PRODUCAO_DIRECT_URL;
if (!urlProducao) {
  console.error('Falta PRODUCAO_DIRECT_URL no arquivo api/.env.');
  process.exit(1);
}

console.log('⚠️  Aplicando migrações no banco de PRODUÇÃO...\n');

const resultado = spawnSync('npx', ['prisma', 'migrate', 'deploy'], {
  stdio: 'inherit',
  shell: true, // necessário no Windows para encontrar o "npx"
  env: { ...process.env, DIRECT_URL: urlProducao },
});

process.exit(resultado.status ?? 1);
