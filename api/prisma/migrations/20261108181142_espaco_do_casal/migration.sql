-- CreateEnum
CREATE TYPE "Papel" AS ENUM ('TITULAR', 'DEPENDENTE');

-- AlterTable
ALTER TABLE "Casal" ADD COLUMN     "codigoConvite" TEXT,
ADD COLUMN     "conviteExpiraEm" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Usuario" ADD COLUMN     "papel" "Papel" NOT NULL DEFAULT 'TITULAR';

-- CreateIndex
CREATE UNIQUE INDEX "Casal_codigoConvite_key" ON "Casal"("codigoConvite");

