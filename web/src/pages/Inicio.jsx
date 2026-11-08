// Início: o resumo do mês (dashboard), seguindo a tela de referência.
// Saldo do mês (com Entrou e Saiu), contas fixas, gastos por categoria, orçamento
// e últimos lançamentos.
import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { PiggyBank, TrendingUp } from 'lucide-react';
import { api } from '../api.js';
import { useValoresOcultos } from '../hooks/useValoresOcultos.js';
import Cabecalho from '../components/Cabecalho.jsx';
import Icone from '../components/Icone.jsx';
import ItemLancamento from '../components/ItemLancamento.jsx';
import SeletorMes from '../components/SeletorMes.jsx';
import { formatarReais } from '../utils/dinheiro.js';
import { mesAtual, nomeDoMes } from '../utils/datas.js';
import { ordenarPendentes, textoVencimento } from '../utils/contas.js';

const CATEGORIAS_NO_RESUMO = 3; // as 3 maiores; "Ver todos" mostra o resto

export default function Inicio() {
  useValoresOcultos(); // redesenha a tela quando tocam no "olho" do topo
  const [parametros, setParametros] = useSearchParams();
  const mes = parametros.get('mes') || mesAtual();
  const [resumo, setResumo] = useState(null);
  const [contas, setContas] = useState(null); // contas fixas do mês
  const [erro, setErro] = useState('');
  const [todasCategorias, setTodasCategorias] = useState(false);

  useEffect(() => {
    let cancelado = false; // evita mostrar um mês antigo se trocar rápido
    api(`/resumo?mes=${mes}`)
      .then((dados) => !cancelado && setResumo(dados))
      .catch((e) => !cancelado && setErro(e.message));
    api(`/contas-fixas/mes?mes=${mes}`)
      .then((dados) => !cancelado && setContas(dados))
      .catch(() => {}); // se falhar, o card de contas só não aparece
    return () => { cancelado = true; };
  }, [mes]);

  function irParaMes(novo) {
    setErro('');
    setResumo(null);
    setContas(null);
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

          {contas && contas.mes === mes && <CardContas dados={contas} />}

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

          {resumo.orcamento.length > 0 && <CardOrcamento orcamento={resumo.orcamento} />}

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

// "Contas do mês": quantas já foram pagas, quanto falta e as próximas a vencer.
const CONTAS_NO_RESUMO = 3;

function CardContas({ dados }) {
  if (dados.contas.length === 0) return null; // sem contas cadastradas: nada aqui
  const { resumo } = dados;
  const proximas = ordenarPendentes(dados.contas).slice(0, CONTAS_NO_RESUMO);

  return (
    <section className="card secao">
      <div className="secao-topo">
        <h2>Contas do mês</h2>
        <Link to={dados.mes === mesAtual() ? '/contas' : `/contas?mes=${dados.mes}`}>Ver todas</Link>
      </div>
      <p className="muted label">
        {resumo.pagas} de {resumo.quantidade} pagas
        {resumo.faltaPagarCentavos > 0 && <> · faltam <strong style={{ color: 'var(--ink)' }}>{formatarReais(resumo.faltaPagarCentavos)}</strong></>}
      </p>
      {proximas.length === 0 ? (
        <p style={{ marginTop: 'var(--space-2)' }}>Todas as contas do mês estão pagas.</p>
      ) : (
        <ul className="lista">
          {proximas.map((c) => (
            <li key={c.id}>
              <Link to={dados.mes === mesAtual() ? '/contas' : `/contas?mes=${dados.mes}`} className="item item-compacto">
                <span className="item-icone"><Icone nome={c.categoria?.icone} /></span>
                <span className="item-textos">
                  <span className="item-titulo">{c.nome}</span>
                  <span className={`item-sub ${c.situacao === 'atrasada' ? 'texto-atencao' : ''}`}>{textoVencimento(c)}</span>
                </span>
                <span className="valor-lista">{formatarReais(c.valorCentavos)}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

// "Orçamento do mês": categorias com limite. Barra na cor de atenção a partir de 80%.
// Tom calmo, como pede o guia: "Faltam R$ 200" / "Passou R$ 50 do previsto".
function CardOrcamento({ orcamento }) {
  return (
    <section className="card secao">
      <div className="secao-topo">
        <h2>Orçamento do mês</h2>
        <Link to="/casa/categorias">Ajustar</Link>
      </div>
      <ul className="lista-categorias">
        {orcamento.map((o) => {
          const atencao = o.percentual >= 80;
          return (
            <li key={o.categoria.id}>
              <div className="linha-categoria">
                <span>{o.categoria.nome}</span>
                <span className="caption muted">
                  <strong className="valor" style={{ color: 'var(--ink)' }}>{formatarReais(o.gastoCentavos)}</strong> de {formatarReais(o.limiteCentavos)}
                </span>
              </div>
              <div className={`barra ${atencao ? 'atencao' : ''}`} role="img" aria-label={`${o.percentual}% do limite`}>
                <span style={{ width: `${Math.min(Math.max(o.percentual, 2), 100)}%` }} />
              </div>
              <p className={`caption ${o.restaCentavos < 0 ? 'texto-atencao' : 'muted'}`} style={{ marginTop: 'var(--space-1)' }}>
                {o.restaCentavos < 0
                  ? `Passou ${formatarReais(-o.restaCentavos)} do previsto`
                  : `Faltam ${formatarReais(o.restaCentavos)}`}
              </p>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
