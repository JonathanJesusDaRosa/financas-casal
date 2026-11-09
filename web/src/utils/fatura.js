// Mesma regra da API (api/src/lib/fatura.js), aqui só para MOSTRAR na tela
// em qual fatura a compra vai cair, enquanto a pessoa preenche o formulário.
// Quem decide de verdade é a API.
import { somarMeses } from './datas.js';

const diasNoMes = (mes) => {
  const [ano, numero] = mes.split('-').map(Number);
  return new Date(Date.UTC(ano, numero, 0)).getUTCDate();
};

export function cartaoConfigurado(forma) {
  return forma?.tipo === 'CREDITO' && Boolean(forma.diaFechamento) && Boolean(forma.diaVencimento);
}

// "2026-11-05" + cartão que fecha dia 3 e vence dia 10 -> "2026-12" (fatura que vence em dez)
export function faturaDaCompra(data, diaFechamento, diaVencimento) {
  const mes = data.slice(0, 7);
  const dia = Number(data.slice(8, 10));
  const mesQueFecha = dia < Math.min(diaFechamento, diasNoMes(mes)) ? mes : somarMeses(mes, 1);
  return diaVencimento > diaFechamento ? mesQueFecha : somarMeses(mesQueFecha, 1);
}

// Texto da situação da fatura
export const SITUACAO_FATURA = {
  aberta: 'aberta',
  a_pagar: 'fechada, a pagar',
  atrasada: 'atrasada',
  paga: 'paga',
};
