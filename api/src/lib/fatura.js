// Regras da fatura do cartão de crédito.
//
// Uma compra no crédito NÃO tira dinheiro da conta na hora: ela vai para a fatura do cartão.
// O dinheiro só sai quando a fatura é paga (lançamento tipo FATURA).
// Cada fatura é identificada pelo mês em que VENCE ("2026-12" = fatura que vence em dez/2026).
import { prisma } from './prisma.js';
import { diasEntre, diasNoMes, somarMeses, vencimentoNoMes } from './datas.js';

// O cartão tem os dias de fechamento e vencimento cadastrados?
export function cartaoConfigurado(forma) {
  return forma?.tipo === 'CREDITO' && Boolean(forma.diaFechamento) && Boolean(forma.diaVencimento);
}

// Em qual fatura cai uma compra feita na data "AAAA-MM-DD"?
//   - comprou ANTES do dia de fechamento -> entra na fatura que fecha neste mês
//   - comprou NO dia do fechamento ou depois -> entra na fatura que fecha no mês seguinte
//   - a fatura vence no mesmo mês do fechamento se o vencimento for depois do fechamento
//     (fecha dia 3, vence dia 10); senão, vence no mês seguinte (fecha 28, vence 5).
export function faturaDaCompra(data, diaFechamento, diaVencimento) {
  const mes = data.slice(0, 7);
  const dia = Number(data.slice(8, 10));
  const fechamentoNesteMes = Math.min(diaFechamento, diasNoMes(mes));
  const mesQueFecha = dia < fechamentoNesteMes ? mes : somarMeses(mes, 1);
  return diaVencimento > diaFechamento ? mesQueFecha : somarMeses(mesQueFecha, 1);
}

// Datas de fechamento e vencimento de uma fatura ("2026-12") -> { fechamento, vencimento }
export function datasDaFatura(faturaMes, diaFechamento, diaVencimento) {
  const mesQueFecha = diaVencimento > diaFechamento ? faturaMes : somarMeses(faturaMes, -1);
  return {
    fechamento: vencimentoNoMes(mesQueFecha, diaFechamento),
    vencimento: vencimentoNoMes(faturaMes, diaVencimento),
  };
}

// Mesma data N meses depois (dia 31 vira o último dia em mês curto): ("2026-01-31", 1) -> "2026-02-28"
export function somarMesesNaData(data, quantidade) {
  const mes = somarMeses(data.slice(0, 7), quantidade);
  return vencimentoNoMes(mes, Number(data.slice(8, 10)));
}

// Situação de uma fatura hoje: "paga" | "aberta" (ainda recebendo compras) | "atrasada" | "a_pagar"
export function situacaoDaFatura({ fechamento, vencimento }, pago, hoje) {
  if (pago) return 'paga';
  if (hoje < fechamento) return 'aberta';
  return diasEntre(hoje, vencimento) < 0 ? 'atrasada' : 'a_pagar';
}

// Faturas de um cartão nos meses pedidos: total das compras e pagamento (se houver).
// Devolve uma lista na mesma ordem de "meses".
export async function faturasDoCartao(cartao, meses, hoje) {
  const [totais, pagamentos] = await Promise.all([
    prisma.lancamento.groupBy({
      by: ['faturaMes'],
      where: { formaPagamentoId: cartao.id, tipo: 'DESPESA', faturaMes: { in: meses } },
      _sum: { valorCentavos: true },
      _count: true,
    }),
    prisma.lancamento.findMany({
      where: { formaPagamentoId: cartao.id, tipo: 'FATURA', competencia: { in: meses } },
      select: { id: true, valorCentavos: true, data: true, competencia: true, pagoPor: { select: { id: true, nome: true } } },
    }),
  ]);

  return meses.map((mes) => {
    const total = totais.find((t) => t.faturaMes === mes);
    const pagamento = pagamentos.find((p) => p.competencia === mes) ?? null;
    const datas = datasDaFatura(mes, cartao.diaFechamento, cartao.diaVencimento);
    return {
      mes,
      ...datas,
      totalCentavos: total?._sum.valorCentavos ?? 0,
      compras: total?._count ?? 0,
      diasParaVencer: diasEntre(hoje, datas.vencimento),
      situacao: situacaoDaFatura(datas, pagamento, hoje),
      pagamento: pagamento && { ...pagamento, data: pagamento.data.toISOString().slice(0, 10) },
    };
  });
}

// Faturas que VENCEM no mês (para a tela de Contas e o card "Contas do mês"):
// só as que têm compras ou já foram pagas.
export async function faturasQueVencemNoMes(casalId, mes, hoje) {
  const cartoes = await prisma.formaPagamento.findMany({
    where: { casalId, tipo: 'CREDITO', diaFechamento: { not: null }, diaVencimento: { not: null } },
    select: { id: true, nome: true, tipo: true, diaFechamento: true, diaVencimento: true },
    orderBy: { nome: 'asc' },
  });
  const lista = [];
  for (const cartao of cartoes) {
    const [fatura] = await faturasDoCartao(cartao, [mes], hoje);
    if (fatura.totalCentavos > 0 || fatura.pagamento) lista.push({ ...fatura, cartao });
  }
  return lista;
}
