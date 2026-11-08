// Popula o banco com DADOS FICTÍCIOS para desenvolvimento.
// Rodar: npm run db:seed  (pode rodar várias vezes; não duplica nada)
import 'dotenv/config';
import { prisma } from '../src/lib/prisma.js';
import { CATEGORIAS_PADRAO } from '../src/lib/categoriasPadrao.js';

async function main() {
  // upsert = "atualiza se existir, cria se não existir"
  const casal = await prisma.casal.upsert({
    where: { id: 1 },
    update: {},
    create: { nome: 'Casal Exemplo' },
  });

  for (const categoria of CATEGORIAS_PADRAO) {
    await prisma.categoria.upsert({
      where: { casalId_nome: { casalId: casal.id, nome: categoria.nome } },
      update: {},
      create: { ...categoria, casalId: casal.id },
    });
  }

  console.log(`Seed ok: casal "${casal.nome}" com ${CATEGORIAS_PADRAO.length} categorias.`);
}

main()
  .catch((erro) => {
    console.error(erro);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
