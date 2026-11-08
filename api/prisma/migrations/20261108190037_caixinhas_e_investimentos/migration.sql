-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "TipoLancamento" ADD VALUE 'GUARDADO';
ALTER TYPE "TipoLancamento" ADD VALUE 'RESGATE';
ALTER TYPE "TipoLancamento" ADD VALUE 'RENDIMENTO';

-- DropForeignKey
ALTER TABLE "Meta" DROP CONSTRAINT "Meta_casalId_fkey";

-- AlterTable
ALTER TABLE "Lancamento" ADD COLUMN     "caixinhaId" INTEGER;

-- DropTable
DROP TABLE "Meta";

-- CreateTable
CREATE TABLE "Caixinha" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "icone" TEXT,
    "valorAlvoCentavos" INTEGER NOT NULL,
    "prazo" DATE,
    "arquivada" BOOLEAN NOT NULL DEFAULT false,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "casalId" INTEGER NOT NULL,
    "investimentoId" INTEGER,

    CONSTRAINT "Caixinha_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Investimento" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "casalId" INTEGER NOT NULL,

    CONSTRAINT "Investimento_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Investimento_casalId_nome_key" ON "Investimento"("casalId", "nome");

-- CreateIndex
CREATE INDEX "Lancamento_caixinhaId_idx" ON "Lancamento"("caixinhaId");

-- AddForeignKey
ALTER TABLE "Lancamento" ADD CONSTRAINT "Lancamento_caixinhaId_fkey" FOREIGN KEY ("caixinhaId") REFERENCES "Caixinha"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Caixinha" ADD CONSTRAINT "Caixinha_casalId_fkey" FOREIGN KEY ("casalId") REFERENCES "Casal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Caixinha" ADD CONSTRAINT "Caixinha_investimentoId_fkey" FOREIGN KEY ("investimentoId") REFERENCES "Investimento"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Investimento" ADD CONSTRAINT "Investimento_casalId_fkey" FOREIGN KEY ("casalId") REFERENCES "Casal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

