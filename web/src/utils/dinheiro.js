// Conversões de dinheiro. No app inteiro, valores andam em CENTAVOS (inteiros).

const formatoReais = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

// ---------- Ocultar valores (o "olho" do topo) ----------
// A escolha fica guardada no aparelho (localStorage). Cada um decide no seu celular.
const CHAVE_OCULTAR = 'casa-em-conta:ocultar-valores';
let ocultar = false;
try {
  ocultar = localStorage.getItem(CHAVE_OCULTAR) === 'sim';
} catch {
  // navegador sem acesso ao localStorage (ex.: modo privado): começa mostrando
}
const avisar = new Set(); // telas que querem saber quando a escolha muda

export function valoresOcultos() {
  return ocultar;
}

export function alternarValoresOcultos() {
  ocultar = !ocultar;
  try {
    localStorage.setItem(CHAVE_OCULTAR, ocultar ? 'sim' : 'nao');
  } catch {
    // sem localStorage: vale só até fechar o app
  }
  avisar.forEach((funcao) => funcao());
}

// Usado pelo hook useValoresOcultos (hooks/useValoresOcultos.js) para redesenhar as telas.
export function aoMudarOcultar(funcao) {
  avisar.add(funcao);
  return () => avisar.delete(funcao);
}

// 10050 -> "R$ 100,50" (ou "R$ ••••" com os valores ocultos)
export function formatarReais(centavos) {
  if (ocultar) return 'R$ ••••';
  return formatoReais.format(centavos / 100);
}

// 10050 -> "100,50" (para preencher o campo de valor na edição)
export function centavosParaTexto(centavos) {
  return (centavos / 100).toFixed(2).replace('.', ',');
}

// O que a pessoa digitou -> centavos. Aceita "100", "100,5", "1.234,56", "R$ 50".
// Devolve null se não for um valor válido.
export function textoParaCentavos(texto) {
  let limpo = String(texto).replace(/[R$\s]/g, '');
  if (limpo.includes(',')) {
    // formato brasileiro: ponto separa milhar, vírgula separa centavos
    limpo = limpo.replace(/\./g, '').replace(',', '.');
  } else if (/^\d{1,3}(\.\d{3})+$/.test(limpo)) {
    // "1.234" ou "1.234.567" sem vírgula: os pontos são de milhar
    limpo = limpo.replace(/\./g, '');
  }
  if (!/^\d+(\.\d{1,2})?$/.test(limpo)) return null;
  return Math.round(Number(limpo) * 100);
}
