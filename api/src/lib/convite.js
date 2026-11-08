// Códigos de convite no formato "K7M-4QX".
import { randomInt } from 'node:crypto';

// Sem 0/O e 1/I/L, que se confundem ao digitar no celular.
const ALFABETO = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const DIAS_DE_VALIDADE = 7;

// randomInt (do módulo crypto) é aleatório de verdade, difícil de adivinhar.
// Math.random() NÃO serve para isso.
export function gerarCodigoConvite() {
  let codigo = '';
  for (let i = 0; i < 6; i++) {
    codigo += ALFABETO[randomInt(ALFABETO.length)];
  }
  return `${codigo.slice(0, 3)}-${codigo.slice(3)}`;
}

// Aceita o que a pessoa digitar ("k7m4qx", "K7M 4QX"...) e devolve "K7M-4QX".
export function normalizarCodigo(texto) {
  const limpo = String(texto ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  return `${limpo.slice(0, 3)}-${limpo.slice(3)}`;
}

export function novaValidade() {
  return new Date(Date.now() + DIAS_DE_VALIDADE * 24 * 60 * 60 * 1000);
}
