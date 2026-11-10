// Datas no app são textos "AAAA-MM-DD" (dia) e "AAAA-MM" (mês), sem hora.
// Assim não existe o bug do fuso horário mudando o dia.

const doisDigitos = (n) => String(n).padStart(2, '0');

// Hoje no horário do aparelho -> "2026-11-08"
export function hoje() {
  const agora = new Date();
  return `${agora.getFullYear()}-${doisDigitos(agora.getMonth() + 1)}-${doisDigitos(agora.getDate())}`;
}

// Mês atual -> "2026-11"
export function mesAtual() {
  return hoje().slice(0, 7);
}

// somarMeses("2026-11", 1) -> "2026-12"; somarMeses("2026-01", -1) -> "2025-12"
export function somarMeses(mes, quantidade) {
  const [ano, numero] = mes.split('-').map(Number);
  const data = new Date(Date.UTC(ano, numero - 1 + quantidade, 1));
  return `${data.getUTCFullYear()}-${doisDigitos(data.getUTCMonth() + 1)}`;
}

// "2026-11" -> "Novembro de 2026"
export function nomeDoMes(mes) {
  const texto = new Date(`${mes}-01T12:00:00Z`).toLocaleDateString('pt-BR', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

// "2026-11-08" -> "Domingo, 8 de nov." (e "Hoje"/"Ontem" quando for o caso)
export function nomeDoDia(dia) {
  if (dia === hoje()) return 'Hoje';
  const ontem = new Date();
  ontem.setDate(ontem.getDate() - 1);
  const textoOntem = `${ontem.getFullYear()}-${doisDigitos(ontem.getMonth() + 1)}-${doisDigitos(ontem.getDate())}`;
  if (dia === textoOntem) return 'Ontem';

  const texto = new Date(`${dia}T12:00:00Z`).toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  });
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

// "2026-11-08" -> "08 nov" (data curta, como pede o guia)
export function dataCurta(dia) {
  const [, mes, numero] = dia.split('-');
  const meses = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
  return `${numero} ${meses[Number(mes) - 1]}`;
}

// "2026-11-08" -> "hoje", "ontem" ou "08 nov" (como nas telas de referência)
export function dataRelativa(dia) {
  const nome = nomeDoDia(dia);
  if (nome === 'Hoje' || nome === 'Ontem') return nome.toLowerCase();
  return dataCurta(dia);
}

// "2026-11" -> "Novembro" (ou "Novembro 2025" se não for o ano atual)
export function nomeCurtoDoMes(mes) {
  const nome = nomeDoMes(mes).replace(' de ', ' ');
  return mes.slice(0, 4) === hoje().slice(0, 4) ? nome.split(' ')[0] : nome;
}

// Lista de meses para escolher: 2 meses à frente até 23 meses atrás, do mais novo ao mais antigo.
// Se o mês escolhido estiver fora dessa faixa, ele entra na lista também.
export function mesesParaEscolher(mesSelecionado) {
  const meses = [];
  for (let i = 2; i >= -23; i--) meses.push(somarMeses(mesAtual(), i));
  if (!meses.includes(mesSelecionado)) meses.push(mesSelecionado);
  return meses;
}

// "2026-11-08" + 3 dias -> "2026-11-11" (conta em UTC, sem fuso)
export function somarDias(dia, quantidade) {
  const d = new Date(`${dia}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + quantidade);
  return d.toISOString().slice(0, 10);
}

// Segunda-feira da semana do dia (a semana vai de segunda a domingo).
// "2026-11-08" (domingo) -> "2026-11-02"
export function segundaDaSemana(dia) {
  const diaDaSemana = new Date(`${dia}T00:00:00Z`).getUTCDay(); // 0 = domingo, 1 = segunda...
  return somarDias(dia, diaDaSemana === 0 ? -6 : 1 - diaDaSemana);
}

// Texto curto de um período: "2 a 8 de nov", "26 de out a 1 de nov", "28 de dez de 2026 a 3 de jan de 2027"
export function textoPeriodo(de, ate) {
  const meses = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
  const partes = (d) => ({ ano: d.slice(0, 4), mes: meses[Number(d.slice(5, 7)) - 1], dia: Number(d.slice(8, 10)) });
  const a = partes(de);
  const b = partes(ate);
  if (a.ano !== b.ano) return `${a.dia} de ${a.mes} de ${a.ano} a ${b.dia} de ${b.mes} de ${b.ano}`;
  if (a.mes !== b.mes) return `${a.dia} de ${a.mes} a ${b.dia} de ${b.mes}`;
  if (a.dia === b.dia) return `${a.dia} de ${a.mes}`;
  return `${a.dia} a ${b.dia} de ${b.mes}`;
}
