// Extrato: todos os lançamentos do mês, agrupados por dia, com os totais no topo.
import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../api.js';
import { useValoresOcultos } from '../hooks/useValoresOcultos.js';
import Cabecalho from '../components/Cabecalho.jsx';
import ItemLancamento from '../components/ItemLancamento.jsx';
import SeletorMes from '../components/SeletorMes.jsx';
import { formatarReais } from '../utils/dinheiro.js';
import { mesAtual, nomeDoDia } from '../utils/datas.js';

// [{data, ...}, ...] -> [["2026-11-08", [...]], ["2026-11-07", [...]]]
function agruparPorDia(lancamentos) {
  const grupos = new Map();
  for (const l of lancamentos) {
    if (!grupos.has(l.data)) grupos.set(l.data, []);
    grupos.get(l.data).push(l);
  }
  return [...grupos.entries()];
}

export default function Lancamentos() {
  useValoresOcultos(); // redesenha a tela quando tocam no "olho" do topo
  // O mês fica na URL (?mes=2026-11): ao voltar do formulário, continua no mesmo mês.
  const [parametros, setParametros] = useSearchParams();
  const mes = parametros.get('mes') || mesAtual();
  const [resposta, setResposta] = useState(null);
  const [erro, setErro] = useState('');

  useEffect(() => {
    let cancelado = false;
    api(`/lancamentos?mes=${mes}`)
      .then((dados) => !cancelado && setResposta(dados))
      .catch((e) => !cancelado && setErro(e.message));
    return () => { cancelado = true; };
  }, [mes]);

  function irParaMes(novo) {
    setErro('');
    setResposta(null);
    setParametros(novo === mesAtual() ? {} : { mes: novo });
  }

  const carregado = resposta && resposta.mes === mes;
  const t = resposta?.totais;

  return (
    <main className="tela">
      <Cabecalho titulo="Lançamentos">
        <SeletorMes mes={mes} aoMudar={irParaMes} />
      </Cabecalho>

      {erro && <p className="erro" role="alert">{erro}</p>}
      {!carregado && !erro && <p className="vazio">Carregando…</p>}

      {carregado && (
        <>
          <section className="resumo-mes">
            <div>
              <span className="caption muted">Entrou</span>
              <strong className="entrada">+ {formatarReais(t.entradas)}</strong>
            </div>
            <div>
              <span className="caption muted">Saiu</span>
              <strong className="saida">− {formatarReais(t.saidas)}</strong>
            </div>
            <div>
              <span className="caption muted">Guardado</span>
              <strong>{formatarReais(t.guardado)}</strong>
            </div>
            <div>
              <span className="caption muted">Sobrou</span>
              <strong className={t.sobra < 0 ? 'saida' : ''}>
                {t.sobra < 0 ? '− ' : ''}{formatarReais(Math.abs(t.sobra))}
              </strong>
            </div>
          </section>

          {resposta.lancamentos.length === 0 ? (
            <p className="vazio">Nenhum lançamento neste mês.<br />Toque em + para lançar.</p>
          ) : (
            agruparPorDia(resposta.lancamentos).map(([dia, itens]) => (
              <section key={dia}>
                <h2 className="grupo-dia">{nomeDoDia(dia)}</h2>
                <ul className="lista">
                  {itens.map((l) => (
                    <li key={l.id}><ItemLancamento lancamento={l} mostrarData={false} /></li>
                  ))}
                </ul>
              </section>
            ))
          )}
        </>
      )}
    </main>
  );
}
