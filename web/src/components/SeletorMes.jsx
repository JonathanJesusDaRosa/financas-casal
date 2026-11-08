// Botão "Novembro ⌄" (como na referência). Por baixo é um <select> nativo:
// no celular abre a roleta de opções do próprio sistema, que é fácil de usar.
import { ChevronDown } from 'lucide-react';
import { mesesParaEscolher, nomeCurtoDoMes, nomeDoMes } from '../utils/datas.js';

export default function SeletorMes({ mes, aoMudar }) {
  return (
    <label className="seletor-mes">
      <span className="sr-only">Mês</span>
      <select value={mes} onChange={(e) => aoMudar(e.target.value)}>
        {mesesParaEscolher(mes).map((m) => (
          <option key={m} value={m}>{nomeDoMes(m)}</option>
        ))}
      </select>
      {/* O texto visível fica por cima do select (que é transparente) */}
      <span className="seletor-mes-texto" aria-hidden="true">
        {nomeCurtoDoMes(mes)} <ChevronDown size={18} strokeWidth={1.75} />
      </span>
    </label>
  );
}
