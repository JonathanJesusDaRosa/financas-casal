// Tela inicial: lançamentos do mês, com totais e lista agrupada por dia.
import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../api.js';
import { formatarReais } from '../utils/dinheiro.js';
import { mesAtual, nomeDoDia, nomeDoMes, somarMeses } from '../utils/datas.js';

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
  // O mês fica na URL (?mes=2026-11): ao voltar do formulário, continua no mesmo mês.
  const [parametros, setParametros] = useSearchParams();
  const mes = parametros.get('mes') || mesAtual();

  const [resposta, setResposta] = useState(null); // { mes, totais, lancamentos }
  const [erro, setErro] = useState('');

  useEffect(() => {
    let cancelado = false; // evita mostrar dados de um mês antigo se trocar rápido
    api(`/lancamentos?mes=${mes}`)
      .then((dados) => !cancelado && setResposta(dados))
      .catch((e) => !cancelado && setErro(e.message));
    return () => { cancelado = true; };
  }, [mes]);

  function irParaMes(novoMes) {
    setErro('');
    setResposta(null);
    setParametros(novoMes === mesAtual() ? {} : { mes: novoMes });
  }

  const carregado = resposta && resposta.mes === mes;

  return (
    <main className="pagina">
      <header className="seletor-mes">
        <button className="secundario" aria-label="Mês anterior" onClick={() => irParaMes(somarMeses(mes, -1))}>‹</button>
        <h1>{nomeDoMes(mes)}</h1>
        <button className="secundario" aria-label="Próximo mês" onClick={() => irParaMes(somarMeses(mes, 1))}>›</button>
      </header>

      {erro && <p className="erro" role="alert">{erro}</p>}
      {!carregado && !erro && <p className="dica">Carregando…</p>}

      {carregado && (
        <>
          <section className="totais">
            <div>
              <span>Entradas</span>
              <strong className="positivo">{formatarReais(resposta.totais.entradas)}</strong>
            </div>
            <div>
              <span>Saídas</span>
              <strong className="negativo">{formatarReais(resposta.totais.saidas)}</strong>
            </div>
            <div>
              <span>🐷 Guardado</span>
              <strong className="guardado">{formatarReais(resposta.totais.guardado)}</strong>
            </div>
            <div>
              <span>Sobra</span>
              <strong className={resposta.totais.sobra < 0 ? 'negativo' : ''}>
                {formatarReais(resposta.totais.sobra)}
              </strong>
            </div>
          </section>

          {/* Juros: só informativo, não entra na sobra */}
          {resposta.totais.rendimento !== 0 && (
            <p className="linha-rendimento">
              📈 {resposta.totais.rendimento > 0
                ? <>Suas caixinhas renderam <strong>{formatarReais(resposta.totais.rendimento)}</strong> este mês</>
                : <>Ajuste negativo nas caixinhas este mês: <strong>{formatarReais(resposta.totais.rendimento)}</strong></>}
            </p>
          )}

          {resposta.lancamentos.length === 0 ? (
            <p className="vazio">Nenhum lançamento neste mês.<br />Toque em <strong>+ Novo</strong> para começar.</p>
          ) : (
            agruparPorDia(resposta.lancamentos).map(([dia, itens]) => (
              <section key={dia} className="grupo-dia">
                <h2>{nomeDoDia(dia)}</h2>
                <ul className="lista-lancamentos">
                  {itens.map((l) => (
                    <li key={l.id}>
                      {l.caixinha ? <ItemCaixinha l={l} /> : <ItemComum l={l} />}
                    </li>
                  ))}
                </ul>
              </section>
            ))
          )}
        </>
      )}

      <Link className="botao-flutuante" to="/lancamentos/novo">+ Novo</Link>
    </main>
  );
}

// Receita ou despesa: abre o formulário de edição.
function ItemComum({ l }) {
  const receita = l.tipo === 'RECEITA';
  return (
    <Link to={`/lancamentos/${l.id}`}>
      <span className="bolinha" style={{ background: l.categoria?.cor ?? 'var(--borda)' }} />
      <span className="textos">
        <span className="titulo">{l.descricao || l.categoria?.nome || 'Sem descrição'}</span>
        <small>{l.categoria?.nome ?? 'Sem categoria'} · {l.pagoPor.nome}</small>
      </span>
      <span className={receita ? 'valor positivo' : 'valor'}>
        {receita ? '+ ' : '− '}
        {formatarReais(l.valorCentavos)}
      </span>
    </Link>
  );
}

// Guardado ou resgate de uma caixinha: abre a caixinha.
function ItemCaixinha({ l }) {
  const resgate = l.tipo === 'RESGATE';
  return (
    <Link to={`/caixinhas/${l.caixinha.id}`}>
      <span className="icone-item" aria-hidden="true">{resgate ? '↩️' : '🐷'}</span>
      <span className="textos">
        <span className="titulo">
          {resgate ? 'Resgate de ' : 'Guardado em '}
          {l.caixinha.icone} {l.caixinha.nome}
        </span>
        <small>Caixinha · {l.pagoPor.nome}</small>
      </span>
      <span className={resgate ? 'valor positivo' : 'valor guardado'}>
        {resgate ? '+ ' : ''}
        {formatarReais(l.valorCentavos)}
      </span>
    </Link>
  );
}
