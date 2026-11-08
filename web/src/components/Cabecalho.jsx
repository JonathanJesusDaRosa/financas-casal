// Topo das abas principais (como na referência): símbolo da marca, "Nossa casa"
// em letra pequena, o título da tela, o "olho" para ocultar os valores e, à direita,
// um espaço opcional (ex.: o seletor de mês ou o botão "Nova meta").
import { Eye, EyeOff } from 'lucide-react';
import { useValoresOcultos } from '../hooks/useValoresOcultos.js';

export default function Cabecalho({ titulo, children }) {
  const [ocultos, alternar] = useValoresOcultos();

  return (
    <header className="cabecalho-casa">
      <img src="/brand/casa-em-conta-mark.svg" alt="" className="cabecalho-marca" />
      <div className="cabecalho-textos">
        <span className="caption muted">Nossa casa</span>
        <h1>{titulo}</h1>
      </div>
      <button type="button" className="botao-icone" onClick={alternar}
        aria-label={ocultos ? 'Mostrar valores' : 'Ocultar valores'} aria-pressed={ocultos}>
        {ocultos
          ? <EyeOff size={22} strokeWidth={1.75} aria-hidden="true" />
          : <Eye size={22} strokeWidth={1.75} aria-hidden="true" />}
      </button>
      {children && <div className="cabecalho-direita">{children}</div>}
    </header>
  );
}
