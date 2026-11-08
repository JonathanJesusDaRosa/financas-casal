// <Icone nome="carrinho" /> — desenha o ícone pelo nome (a lista fica em utils/icones.js).
// Nome desconhecido ou vazio mostra a etiqueta. Traço 1.75 e cor herdada do texto, como pede o guia.
import { ICONES } from '../utils/icones.js';

export default function Icone({ nome, tamanho = 20, ...resto }) {
  const Componente = (ICONES[nome] ?? ICONES.etiqueta).componente;
  return <Componente size={tamanho} strokeWidth={1.75} aria-hidden="true" {...resto} />;
}
