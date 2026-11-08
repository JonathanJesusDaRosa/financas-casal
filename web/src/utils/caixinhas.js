// Cálculos das caixinhas: porcentagem e quanto guardar por mês.
import { formatarReais } from './dinheiro.js';
import { hoje } from './datas.js';

// 0 a 100 (nunca passa de 100, mesmo se guardaram mais que a meta)
export function porcentagem(caixinha) {
  return Math.min(100, Math.floor((caixinha.saldoCentavos / caixinha.valorAlvoCentavos) * 100));
}

// Quantos meses faltam até o prazo (contando o mês atual como 1).
function mesesAte(prazo) {
  const [anoH, mesH] = hoje().split('-').map(Number);
  const [anoP, mesP] = prazo.split('-').map(Number);
  return (anoP - anoH) * 12 + (mesP - mesH) + 1;
}

// Frase de planejamento:
// "Faltam R$ 3.800,00. Guardando R$ 475,00 por mês, vocês chegam lá até julho de 2027."
export function planejamento(caixinha) {
  const falta = caixinha.valorAlvoCentavos - caixinha.saldoCentavos;
  if (falta <= 0) return '🎉 Meta alcançada!';
  if (!caixinha.prazo) return `Faltam ${formatarReais(falta)}.`;

  const meses = mesesAte(caixinha.prazo);
  if (meses < 1) return `O prazo passou. Faltam ${formatarReais(falta)}.`;

  const porMes = Math.ceil(falta / meses / 100) * 100; // arredonda para cima, em reais inteiros
  const prazo = new Date(`${caixinha.prazo}T12:00:00Z`).toLocaleDateString('pt-BR', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
  return `Faltam ${formatarReais(falta)}. Guardando ${formatarReais(porMes)} por mês, vocês chegam lá até ${prazo}.`;
}
