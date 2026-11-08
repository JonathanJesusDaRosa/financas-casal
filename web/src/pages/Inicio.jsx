// Início: o resumo do mês (dashboard), seguindo a tela de referência.
// Saldo do mês (com Entrou e Saiu), gastos por categoria e últimos lançamentos.
import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { PiggyBank, TrendingUp } from 'lucide-react';
import { api } from '../api.js';
import { useValoresOcultos } from '../hooks/useValoresOcultos.js';
import Cabecalho from '../components/Cabecalho.jsx';
import ItemLancamento from '../components/ItemLancamento.jsx';
import SeletorMes from '../components/SeletorMes.jsx';
import { formatarReais } from '../utils/dinheiro.js';
import { mesAtual, nomeDoMes } from '../utils/datas.js';

const CATEGORIAS_NO_RESUMO = 3; // as 3 maiores; "Ver todos" mostra o resto

export default function Inicio() {
  useValoresOcultos(); // redesenha a tela quando tocam no "olho" do topo
  const [parametros, setParametros] = useSearchParams();
  const mes = parametros.get('mes') || mesAtual();
  const [resumo, setResumo] = useState(null);
  const [erro, setErro] = useState('');
  const [todasCategorias, setTodasCategorias] = useState(false);

  useEffect(() => {
    let cancelado = false; // evita mostrar um mês antigo se trocar rápido
    api(`/resumo?mes=${mes}`)
      .then((dados) => !cancelado && setResumo(dados))
      .catch((e) => !cancelado && setErro(e.message));
    return () => { cancelado = true; };
  }, [mes]);

  function irParaMes(novo) {
    setErro('');
    setResumo(null);
    setTodasCategorias(false);
    setParametros(novo === mesAtual() ? {} : { mes: novo });
  }

  const carregado = resumo && resumo.mes === mes;
  const t = resumo?.totais;
  const nomeMes = nomeDoMes(mes).split(' ')[0].toLowerCase(); // "novembro"
  const categorias = carregado
    ? (todasCategorias ? resumo.porCategoria : resumo.porCategoria.slice(0, CATEGORIAS_NO_RESUMO))
    : [];
  const maiorGasto = resumo?.porCategoria[0]?.totalCentavos ?? 0;

  return (
    <main className="tela">
      <Cabecalho titulo="Início">
        <SeletorMes mes={mes} aoMudar={irParaMes} />
      </Cabecalho>

      {erro && <p className="erro" role="alert">{erro}</p>}
      {!carregado && !erro && <p className="vazio">Carregando…</p>}

      {carregado && (
        <>
          {/* Card de saldo: saldo grande + mini-cards Entrou e Saiu */}
          <section className="card-saldo">
            <p className="label">Saldo de {nomeMes}</p>
            <p className={`valor-grande ${t.sobra < 0 ? 'saida' : ''}`}>
              {t.sobra < 0 ? '− ' : ''}{formatarReais(Math.abs(t.sobra))}
            </p>
            <div className="mini-cards">
              <div>
                <span className="caption muted">Entrou</span>
                <strong className="entrada">+ {formatarReais(t.entradas)}</strong>
              </div>
              <div>
                <span className="caption muted">Saiu</span>
                <strong className="saida">− {formatarReais(t.saidas)}</strong>
              </div>
            </div>
            {/* Extra nosso (não está na referência): o que foi separado para as metas */}
            {(t.guardado !== 0 || t.rendimento !== 0) && (
              <div className="notas-saldo">
                {t.guardado !== 0 && (
                  <p><PiggyBank size={16} strokeWidth={1.75} aria-hidden="true" /> Guardado nas metas: <strong>{formatarReais(t.guardado)}</strong></p>
                )}
                {t.rendimento !== 0 && (
                  <p><TrendingUp size={16} strokeWidth={1.75} aria-hidden="true" /> Rendimento das metas: <strong>{formatarReais(t.rendimento)}</strong></p>
                )}
              </div>
            )}
          </section>

          {/* Gastos por categoria: card compacto, barras proporcionais à maior */}
          <section className="card secao">
            <div className="secao-topo">
              <h2>Gastos por categoria</h2>
              {resumo.porCategoria.length > CATEGORIAS_NO_RESUMO && (
                <button className="link" onClick={() => setTodasCategorias(!todasCategorias)}>
                  {todasCategorias ? 'Ver menos' : 'Ver todos'}
                </button>
              )}
            </div>
            {categorias.length === 0 ? (
              <p className="muted">Nenhum gasto neste mês.</p>
            ) : (
              <ul className="lista-categorias">
                {categorias.map((c) => (
                  <li key={c.categoria?.id ?? 'sem'}>
                    <div className="linha-categoria">
                      <span>{c.categoria?.nome ?? 'Sem categoria'}</span>
                      <strong className="valor">{formatarReais(c.totalCentavos)}</strong>
                    </div>
                    <div className="barra" role="img" aria-label={`${c.percentual}% das saídas`}>
                      <span style={{ width: `${Math.max(Math.round((c.totalCentavos / maiorGasto) * 100), 2)}%` }} />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Últimos lançamentos: soltos no fundo, sem caixa em volta */}
          <section className="secao">
            <div className="secao-topo">
              <h2>Últimos lançamentos</h2>
              {resumo.ultimos.length > 0 && (
                <Link to={mes === mesAtual() ? '/lancamentos' : `/lancamentos?mes=${mes}`}>Ver todos</Link>
              )}
            </div>
            {resumo.ultimos.length === 0 ? (
              <p className="muted">Nenhum lançamento neste mês. Toque em + para lançar.</p>
            ) : (
              <ul className="lista">
                {resumo.ultimos.map((l) => (
                  <li key={l.id}><ItemLancamento lancamento={l} /></li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </main>
  );
}
