-- AlterTable
ALTER TABLE "Categoria" ADD COLUMN     "limiteMensalCentavos" INTEGER;

-- AlterTable
ALTER TABLE "Lancamento" ADD COLUMN     "competencia" TEXT,
ADD COLUMN     "contaFixaId" INTEGER;

-- CreateTable
CREATE TABLE "ContaFixa" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "valorCentavos" INTEGER NOT NULL,
    "diaVencimento" INTEGER NOT NULL,
    "tipo" "TipoLancamento" NOT NULL DEFAULT 'DESPESA',
    "ativa" BOOLEAN NOT NULL DEFAULT true,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "casalId" INTEGER NOT NULL,
    "categoriaId" INTEGER,

    CONSTRAINT "ContaFixa_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Lancamento_contaFixaId_competencia_key" ON "Lancamento"("contaFixaId", "competencia");

-- AddForeignKey
ALTER TABLE "Lancamento" ADD CONSTRAINT "Lancamento_contaFixaId_fkey" FOREIGN KEY ("contaFixaId") REFERENCES "ContaFixa"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContaFixa" ADD CONSTRAINT "ContaFixa_casalId_fkey" FOREIGN KEY ("casalId") REFERENCES "Casal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContaFixa" ADD CONSTRAINT "ContaFixa_categoriaId_fkey" FOREIGN KEY ("categoriaId") REFERENCES "Categoria"("id") ON DELETE SET NULL ON UPDATE CASCADE;

