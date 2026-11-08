// Aba "Metas": os sonhos da casa (caixinhas), com o progresso de cada um.
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { api } from '../api.js';
import Cabecalho from '../components/Cabecalho.jsx';
import Icone from '../components/Icone.jsx';
import Progresso from '../components/Progresso.jsx';
import { formatarReais } from '../utils/dinheiro.js';
import { porcentagem } from '../utils/caixinhas.js';

export default function Caixinhas() {
  const [caixinhas, setCaixinhas] = useState(null);
  const [erro, setErro] = useState('');
  const [verArquivadas, setVerArquivadas] = useState(false);

  useEffect(() => {
    api('/caixinhas')
      .then((dados) => setCaixinhas(dados.caixinhas))
      .catch((e) => setErro(e.message));
  }, []);

  const ativas = caixinhas?.filter((c) => !c.arquivada) ?? [];
  const arquivadas = caixinhas?.filter((c) => c.arquivada) ?? [];
  const totalGuardado = ativas.reduce((total, c) => total + c.saldoCentavos, 0);

  return (
    <main className="tela">
      <Cabecalho titulo="Metas">
        <Link to="/metas/nova" className="botao-secundario">
          <Plus size={20} strokeWidth={1.75} aria-hidden="true" /> Nova
        </Link>
      </Cabecalho>

      {erro && <p className="erro" role="alert">{erro}</p>}
      {!caixinhas && !erro && <p className="vazio">Carregando…</p>}

      {caixinhas && (
        <>
          {ativas.length > 0 && (
            <p className="muted" style={{ marginBottom: 'var(--space-4)' }}>
              Guardado nas metas: <strong style={{ color: 'var(--ink)' }}>{formatarReais(totalGuardado)}</strong>
            </p>
          )}

          {ativas.length === 0 && (
            <p className="vazio">
              Nenhuma meta ainda.<br />Crie uma para cada sonho: viagem, reserva, carro.
            </p>
          )}

          {ativas.map((c) => <CartaoMeta key={c.id} caixinha={c} />)}

          {arquivadas.length > 0 && (
            <div className="secao">
              <button className="botao-quieto" onClick={() => setVerArquivadas(!verArquivadas)}>
                {verArquivadas ? 'Esconder' : 'Mostrar'} arquivadas ({arquivadas.length})
              </button>
              {verArquivadas && (
                <div style={{ opacity: 0.7, marginTop: 'var(--space-3)' }}>
                  {arquivadas.map((c) => <CartaoMeta key={c.id} caixinha={c} />)}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </main>
  );
}

function CartaoMeta({ caixinha: c }) {
  return (
    <Link to={`/metas/${c.id}`} className="card card-meta">
      <div className="item">
        <span className="item-icone meta"><Icone nome={c.icone} /></span>
        <span className="item-textos">
          <span className="item-titulo">{c.nome}</span>
          <span className="item-sub">{c.investimento ? c.investimento.nome : 'Sem investimento definido'}</span>
        </span>
        <span className="label">{porcentagem(c)}%</span>
      </div>
      <Progresso caixinha={c} />
      <p className="caption muted">
        <strong className="valor" style={{ color: 'var(--ink)' }}>{formatarReais(c.saldoCentavos)}</strong>
        {' '}de {formatarReais(c.valorAlvoCentavos)}
      </p>
    </Link>
  );
}
