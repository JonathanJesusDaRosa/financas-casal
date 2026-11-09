// Uma linha de lançamento (como na referência): ícone da categoria (quadrado de 40px),
// descrição e embaixo "Categoria · você · hoje"; valor à direita
// (+ verde para entrada, − vermelho para saída).
// Movimentos de meta (guardado/resgate) abrem a meta; os outros abrem o formulário.
import { Link } from 'react-router-dom';
import { useAuth } from '../auth.jsx';
import Icone from './Icone.jsx';
import { formatarReais } from '../utils/dinheiro.js';
import { dataRelativa } from '../utils/datas.js';

export default function ItemLancamento({ lancamento: l, mostrarData = true }) {
  const { usuario } = useAuth();
  const quem = l.pagoPor.id === usuario.id ? 'você' : l.pagoPor.nome;
  // Junta as partes que existirem: "Mercado · você · ontem"
  const legenda = (...partes) => partes.filter(Boolean).join(' · ');
  const quando = mostrarData ? dataRelativa(l.data) : null;

  if (l.caixinha) {
    const resgate = l.tipo === 'RESGATE';
    return (
      <Link to={`/metas/${l.caixinha.id}`} className="item">
        <span className="item-icone meta"><Icone nome={l.caixinha.icone} /></span>
        <span className="item-textos">
          <span className="item-titulo">{resgate ? 'Resgate de' : 'Guardado em'} {l.caixinha.nome}</span>
          <span className="item-sub">{legenda('Meta', quem, quando)}</span>
        </span>
        <span className={resgate ? 'valor-lista entrada' : 'valor-lista'}>
          {resgate ? '+ ' : ''}{formatarReais(l.valorCentavos)}
        </span>
      </Link>
    );
  }

  const entrou = l.tipo === 'RECEITA';
  return (
    <Link to={`/lancamentos/${l.id}`} className="item">
      <span className="item-icone"><Icone nome={l.categoria?.icone} /></span>
      <span className="item-textos">
        <span className="item-titulo">{l.descricao || l.categoria?.nome || 'Sem descrição'}</span>
        <span className="item-sub">{legenda(l.categoria?.nome ?? 'Sem categoria', quem, quando, l.formaPagamento?.nome)}</span>
      </span>
      <span className={entrou ? 'valor-lista entrada' : 'valor-lista saida'}>
        {entrou ? '+ ' : '− '}{formatarReais(l.valorCentavos)}
      </span>
    </Link>
  );
}
