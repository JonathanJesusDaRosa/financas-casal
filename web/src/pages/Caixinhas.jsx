// Aba "Metas": os sonhos da casa (caixinhas), com o progresso de cada um.
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { api } from '../api.js';
import { useValoresOcultos } from '../hooks/useValoresOcultos.js';
import Cabecalho from '../components/Cabecalho.jsx';
import Icone from '../components/Icone.jsx';
import Progresso from '../components/Progresso.jsx';
import { formatarReais } from '../utils/dinheiro.js';
import { porcentagem, ritmoCurto } from '../utils/caixinhas.js';

export default function Caixinhas() {
  useValoresOcultos(); // redesenha a tela quando tocam no "olho" do topo
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
    <main className="tela larga">
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
            <section className="card vazio-convite">
              <span className="item-icone meta"><Icone nome="cofrinho" /></span>
              <h2>Para que vocês estão guardando?</h2>
              <p className="muted">
                Crie uma meta para cada sonho (viagem, reserva de emergência, carro). O app mostra
                quanto já têm e quanto guardar por mês para chegar no prazo.
              </p>
              <Link to="/metas/nova" className="botao">Criar meta</Link>
            </section>
          )}

          <div className="grade-cards">
            {ativas.map((c) => <CartaoMeta key={c.id} caixinha={c} />)}
          </div>

          {arquivadas.length > 0 && (
            <div className="secao">
              <button className="botao-quieto" onClick={() => setVerArquivadas(!verArquivadas)}>
                {verArquivadas ? 'Esconder' : 'Mostrar'} arquivadas ({arquivadas.length})
              </button>
              {verArquivadas && (
                <div className="grade-cards" style={{ opacity: 0.7, marginTop: 'var(--space-3)' }}>
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
      {/* Embaixo: quanto já tem (esquerda) e o ritmo para chegar no prazo (direita) */}
      <div className="rodape-meta caption muted">
        <span>
          <strong className="valor" style={{ color: 'var(--ink)' }}>{formatarReais(c.saldoCentavos)}</strong>
          {' '}de {formatarReais(c.valorAlvoCentavos)}
        </span>
        {!c.arquivada && <span>{ritmoCurto(c)}</span>}
      </div>
    </Link>
  );
}
