-- CreateEnum
CREATE TYPE "TipoFormaPagamento" AS ENUM ('PIX', 'DEBITO', 'CREDITO', 'DINHEIRO', 'BOLETO', 'OUTRO');

-- AlterTable
ALTER TABLE "ContaFixa" ADD COLUMN     "formaPagamentoId" INTEGER,
ADD COLUMN     "mesInicio" TEXT,
ADD COLUMN     "parcelaInicial" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "totalParcelas" INTEGER;

-- Contas já cadastradas: começam no mês em que foram criadas (horário de São Paulo).
-- Assim elas deixam de aparecer nos meses anteriores (nada retroativo).
UPDATE "ContaFixa"
SET "mesInicio" = to_char(("criadoEm" AT TIME ZONE 'UTC') AT TIME ZONE 'America/Sao_Paulo', 'YYYY-MM');

ALTER TABLE "ContaFixa" ALTER COLUMN "mesInicio" SET NOT NULL;

-- AlterTable
ALTER TABLE "Lancamento" ADD COLUMN     "formaPagamentoId" INTEGER;

-- CreateTable
CREATE TABLE "ContaFixaAjuste" (
    "id" SERIAL NOT NULL,
    "competencia" TEXT NOT NULL,
    "valorCentavos" INTEGER NOT NULL,
    "contaFixaId" INTEGER NOT NULL,

    CONSTRAINT "ContaFixaAjuste_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FormaPagamento" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "tipo" "TipoFormaPagamento" NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "casalId" INTEGER NOT NULL,

    CONSTRAINT "FormaPagamento_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ContaFixaAjuste_contaFixaId_competencia_key" ON "ContaFixaAjuste"("contaFixaId", "competencia");

-- CreateIndex
CREATE UNIQUE INDEX "FormaPagamento_casalId_nome_key" ON "FormaPagamento"("casalId", "nome");

-- AddForeignKey
ALTER TABLE "Lancamento" ADD CONSTRAINT "Lancamento_formaPagamentoId_fkey" FOREIGN KEY ("formaPagamentoId") REFERENCES "FormaPagamento"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContaFixa" ADD CONSTRAINT "ContaFixa_formaPagamentoId_fkey" FOREIGN KEY ("formaPagamentoId") REFERENCES "FormaPagamento"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContaFixaAjuste" ADD CONSTRAINT "ContaFixaAjuste_contaFixaId_fkey" FOREIGN KEY ("contaFixaId") REFERENCES "ContaFixa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FormaPagamento" ADD CONSTRAINT "FormaPagamento_casalId_fkey" FOREIGN KEY ("casalId") REFERENCES "Casal"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Formas de pagamento iniciais para cada casa que já existe
INSERT INTO "FormaPagamento" ("nome", "tipo", "casalId")
SELECT f.nome, f.tipo::"TipoFormaPagamento", c."id"
FROM "Casal" c
CROSS JOIN (VALUES ('Pix', 'PIX'), ('Débito', 'DEBITO'), ('Crédito', 'CREDITO'), ('Dinheiro', 'DINHEIRO'), ('Boleto', 'BOLETO')) AS f(nome, tipo);
