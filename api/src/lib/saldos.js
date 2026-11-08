// Calcula o saldo das caixinhas a partir dos movimentos (lançamentos).
//   saldo = guardado + rendimento - resgatado
import { prisma } from './prisma.js';

const ZERADO = { guardado: 0, resgatado: 0, rendimento: 0 };

// Devolve uma função: saldoDe(caixinhaId) -> { guardado, resgatado, rendimento, saldo }
// "cliente" pode ser o prisma normal ou o "tx" de dentro de uma transação.
export async function calcularSaldos(casalId, cliente = prisma) {
  // groupBy = "agrupe e some": uma linha por (caixinha, tipo) com o total.
  const grupos = await cliente.lancamento.groupBy({
    by: ['caixinhaId', 'tipo'],
    where: { casalId, caixinhaId: { not: null } },
    _sum: { valorCentavos: true },
  });

  const porCaixinha = new Map();
  for (const grupo of grupos) {
    const totais = porCaixinha.get(grupo.caixinhaId) ?? { ...ZERADO };
    const valor = grupo._sum.valorCentavos ?? 0;
    if (grupo.tipo === 'GUARDADO') totais.guardado += valor;
    if (grupo.tipo === 'RESGATE') totais.resgatado += valor;
    if (grupo.tipo === 'RENDIMENTO') totais.rendimento += valor;
    porCaixinha.set(grupo.caixinhaId, totais);
  }

  return (caixinhaId) => {
    const t = porCaixinha.get(caixinhaId) ?? ZERADO;
    return { ...t, saldo: t.guardado + t.rendimento - t.resgatado };
  };
}

// Quanto um movimento soma (ou tira) do saldo da caixinha.
export function efeitoNoSaldo(movimento) {
  return movimento.tipo === 'RESGATE' ? -movimento.valorCentavos : movimento.valorCentavos;
}
