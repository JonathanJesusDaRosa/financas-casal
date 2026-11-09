-- AlterEnum
ALTER TYPE "TipoLancamento" ADD VALUE 'FATURA';

-- AlterTable
ALTER TABLE "FormaPagamento" ADD COLUMN     "diaFechamento" INTEGER,
ADD COLUMN     "diaVencimento" INTEGER;

-- AlterTable
ALTER TABLE "Lancamento" ADD COLUMN     "faturaMes" TEXT,
ADD COLUMN     "grupoParcelas" TEXT,
ADD COLUMN     "parcela" INTEGER,
ADD COLUMN     "totalParcelas" INTEGER;

-- CreateIndex
CREATE INDEX "Lancamento_formaPagamentoId_faturaMes_idx" ON "Lancamento"("formaPagamentoId", "faturaMes");

