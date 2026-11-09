// Datas "do Brasil". O servidor (Vercel) roda em UTC: às 22h em São Paulo,
// para ele já é o dia seguinte. Para "vence hoje"/"atrasada", usamos o fuso daqui.

const FUSO = 'America/Sao_Paulo';

// Hoje em São Paulo -> "2026-11-08"
export function hojeNoBrasil() {
  // en-CA formata como AAAA-MM-DD
  return new Intl.DateTimeFormat('en-CA', { timeZone: FUSO }).format(new Date());
}

// Mês atual em São Paulo -> "2026-11"
export function mesAtualNoBrasil() {
  return hojeNoBrasil().slice(0, 7);
}

// Quantos dias tem o mês: diasNoMes("2026-02") -> 28
export function diasNoMes(mes) {
  const [ano, numero] = mes.split('-').map(Number);
  return new Date(Date.UTC(ano, numero, 0)).getUTCDate();
}

// Data de vencimento de uma conta no mês: dia 31 em fevereiro vira o último dia (28/29).
// vencimentoNoMes("2026-02", 31) -> "2026-02-28"
export function vencimentoNoMes(mes, dia) {
  const diaReal = Math.min(dia, diasNoMes(mes));
  return `${mes}-${String(diaReal).padStart(2, '0')}`;
}

// Diferença em dias entre duas datas "AAAA-MM-DD" (b - a). Ex.: ("2026-11-08", "2026-11-10") -> 2
export function diasEntre(a, b) {
  return Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86400000);
}

// somarMeses("2026-11", 3) -> "2027-02"; somarMeses("2026-01", -1) -> "2025-12"
export function somarMeses(mes, quantidade) {
  const [ano, numero] = mes.split('-').map(Number);
  return new Date(Date.UTC(ano, numero - 1 + quantidade, 1)).toISOString().slice(0, 7);
}

// Quantos meses de "a" até "b": mesesEntre("2026-11", "2027-02") -> 3
export function mesesEntre(a, b) {
  const [anoA, mesA] = a.split('-').map(Number);
  const [anoB, mesB] = b.split('-').map(Number);
  return (anoB - anoA) * 12 + (mesB - mesA);
}
