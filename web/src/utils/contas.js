// Textos das contas fixas: "vence hoje", "vence em 3 dias", "venceu há 2 dias", "paga em 08 nov".
import { dataCurta } from './datas.js';

export function textoVencimento(conta) {
  if (conta.situacao === 'paga') {
    const verbo = conta.tipo === 'RECEITA' ? 'recebida' : 'paga';
    return `${verbo} em ${dataCurta(conta.pagamento.data)}`;
  }
  const dias = conta.diasParaVencer;
  if (dias === 0) return 'vence hoje';
  if (dias === 1) return 'vence amanhã';
  if (dias > 1) return `vence em ${dias} dias (${dataCurta(conta.vencimento)})`;
  if (dias === -1) return 'venceu ontem';
  return `venceu há ${-dias} dias`;
}

// Ordem das pendentes: atrasadas primeiro, depois as que vencem antes.
export function ordenarPendentes(contas) {
  return contas
    .filter((c) => c.situacao !== 'paga')
    .sort((a, b) => a.diasParaVencer - b.diasParaVencer);
}
