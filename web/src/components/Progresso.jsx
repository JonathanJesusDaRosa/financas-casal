// Barra de progresso de uma meta (pêssego, como pede o guia).
import { porcentagem } from '../utils/caixinhas.js';

export default function Progresso({ caixinha }) {
  const valor = porcentagem(caixinha);
  return (
    <div className="progresso" role="progressbar" aria-valuenow={valor} aria-valuemin={0} aria-valuemax={100}>
      <span style={{ width: `${valor}%` }} />
    </div>
  );
}
