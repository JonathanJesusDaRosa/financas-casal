// Aba "Caixinhas": lista de sonhos com o progresso de cada um.
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';
import { formatarReais } from '../utils/dinheiro.js';
import Progresso from '../components/Progresso.jsx';
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
    <main className="pagina">
      <header className="topo">
        <h1>Caixinhas</h1>
      </header>

      {erro && <p className="erro" role="alert">{erro}</p>}
      {!caixinhas && !erro && <p className="dica">Carregando…</p>}

      {caixinhas && (
        <>
          {ativas.length > 0 && (
            <p className="resumo-caixinhas">
              Total guardado nas caixinhas: <strong>{formatarReais(totalGuardado)}</strong>
            </p>
          )}

          {ativas.length === 0 && (
            <p className="vazio">
              Nenhuma caixinha ainda.<br />
              Crie uma para cada sonho: viagem, reserva de emergência, carro…
            </p>
          )}

          <ul className="lista-caixinhas">
            {ativas.map((c) => <CartaoCaixinha key={c.id} caixinha={c} />)}
          </ul>

          {arquivadas.length > 0 && (
            <>
              <button className="link mostrar-arquivadas" onClick={() => setVerArquivadas(!verArquivadas)}>
                {verArquivadas ? 'Esconder' : 'Mostrar'} arquivadas ({arquivadas.length})
              </button>
              {verArquivadas && (
                <ul className="lista-caixinhas arquivadas">
                  {arquivadas.map((c) => <CartaoCaixinha key={c.id} caixinha={c} />)}
                </ul>
              )}
            </>
          )}
        </>
      )}

      <Link className="botao-flutuante" to="/caixinhas/nova">+ Nova caixinha</Link>
    </main>
  );
}

function CartaoCaixinha({ caixinha: c }) {
  return (
    <li>
      <Link to={`/caixinhas/${c.id}`} className="cartao cartao-caixinha">
        <div className="linha">
          <span className="nome">{c.icone} {c.nome}</span>
          <span className="porcento">{porcentagem(c)}%</span>
        </div>
        <Progresso caixinha={c} />
        <div className="linha valores">
          <span><strong>{formatarReais(c.saldoCentavos)}</strong> de {formatarReais(c.valorAlvoCentavos)}</span>
          {c.investimento && <small>{c.investimento.nome}</small>}
        </div>
      </Link>
    </li>
  );
}
