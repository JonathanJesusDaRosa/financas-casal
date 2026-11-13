// Extrato: lançamentos agrupados por dia, com os totais no topo.
// Três jeitos de escolher o que ver: Mês, Semana (segunda a domingo) ou Período (datas livres).
// A escolha fica na URL (ex.: ?modo=semana&de=2026-11-02): ao abrir um lançamento e voltar,
// continua no mesmo lugar. Botão "Exportar" gera uma planilha do que está na tela.
import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ChevronLeft, ChevronRight, CreditCard, Download } from 'lucide-react';
import { api } from '../api.js';
import { useValoresOcultos } from '../hooks/useValoresOcultos.js';
import Cabecalho from '../components/Cabecalho.jsx';
import ItemLancamento from '../components/ItemLancamento.jsx';
import SeletorMes from '../components/SeletorMes.jsx';
import { formatarReais } from '../utils/dinheiro.js';
import { hoje, mesAtual, nomeDoDia, nomeDoMes, segundaDaSemana, somarDias, textoPeriodo } from '../utils/datas.js';
import { gerarCsv, salvarArquivo } from '../utils/exportar.js';
import { cartaoConfigurado } from '../utils/fatura.js';

// [{data, ...}, ...] -> [["2026-11-08", [...]], ["2026-11-07", [...]]]
function agruparPorDia(lancamentos) {
  const grupos = new Map();
  for (const l of lancamentos) {
    if (!grupos.has(l.data)) grupos.set(l.data, []);
    grupos.get(l.data).push(l);
  }
  return [...grupos.entries()];
}

// Lê a URL e devolve o que mostrar: { modo, mes } ou { modo, de, ate }
function lerEscolha(parametros) {
  const modo = parametros.get('modo') || 'mes';
  if (modo === 'semana') {
    const de = segundaDaSemana(parametros.get('de') || hoje());
    return { modo, de, ate: somarDias(de, 6) };
  }
  if (modo === 'periodo') {
    const de = parametros.get('de') || `${mesAtual()}-01`;
    const ate = parametros.get('ate') || hoje();
    return { modo, de, ate };
  }
  return { modo: 'mes', mes: parametros.get('mes') || mesAtual() };
}

export default function Lancamentos() {
  useValoresOcultos(); // redesenha a tela quando tocam no "olho" do topo
  const [parametros, setParametros] = useSearchParams();
  const escolha = lerEscolha(parametros);
  // Endereço da API para a escolha atual (também serve para saber se a resposta é desta escolha)
  const consulta = escolha.modo === 'mes' ? `mes=${escolha.mes}` : `de=${escolha.de}&ate=${escolha.ate}`;

  const [resposta, setResposta] = useState(null); // { consulta, dados }
  // O erro guarda de qual consulta ele é: ao trocar de período, o erro antigo some sozinho.
  const [falha, setFalha] = useState(null); // { consulta, mensagem }
  const [exportando, setExportando] = useState(false);
  const [cartoes, setCartoes] = useState([]); // cartões de crédito configurados (atalhos para o extrato de cada um)

  useEffect(() => {
    api('/formas-pagamento')
      .then((d) => setCartoes(d.formas.filter((f) => cartaoConfigurado(f))))
      .catch(() => {}); // se falhar, só não aparecem os atalhos
  }, []);

  useEffect(() => {
    let cancelado = false; // evita mostrar uma resposta antiga se trocar rápido
    api(`/lancamentos?${consulta}`)
      .then((dados) => !cancelado && setResposta({ consulta, dados }))
      .catch((e) => !cancelado && setFalha({ consulta, mensagem: e.message }));
    return () => { cancelado = true; };
  }, [consulta]);

  const erro = falha?.consulta === consulta ? falha.mensagem : '';

  // Troca de modo (Mês / Semana / Período), começando sempre "agora"
  function trocarModo(modo) {
    if (modo === 'mes') setParametros({});
    if (modo === 'semana') setParametros({ modo: 'semana', de: segundaDaSemana(hoje()) });
    if (modo === 'periodo') setParametros({ modo: 'periodo', de: `${mesAtual()}-01`, ate: hoje() });
  }

  const carregado = resposta && resposta.consulta === consulta;
  const dados = carregado ? resposta.dados : null;
  const t = dados?.totais;

  // Nome do período para os textos e para o arquivo exportado
  const nomePeriodo = escolha.modo === 'mes' ? nomeDoMes(escolha.mes).toLowerCase() : textoPeriodo(escolha.de, escolha.ate);
  const nomeArquivo = escolha.modo === 'mes'
    ? `extrato-${escolha.mes}.csv`
    : `extrato-${escolha.de}-a-${escolha.ate}.csv`;

  async function exportar() {
    setExportando(true);
    try {
      await salvarArquivo(gerarCsv(dados.lancamentos), nomeArquivo);
    } catch (e) {
      setFalha({ consulta, mensagem: `Não deu para exportar: ${e.message}` });
    } finally {
      setExportando(false);
    }
  }

  return (
    <main className="tela">
      <Cabecalho titulo="Extrato">
        {escolha.modo === 'mes' && (
          <SeletorMes mes={escolha.mes} aoMudar={(novo) => setParametros(novo === mesAtual() ? {} : { mes: novo })} />
        )}
      </Cabecalho>

      {/* Mês / Semana / Período */}
      <div className="segmentado" role="tablist" aria-label="Período do extrato">
        {[['mes', 'Mês'], ['semana', 'Semana'], ['periodo', 'Período']].map(([modo, texto]) => (
          <button key={modo} type="button" role="tab" aria-selected={escolha.modo === modo}
            className={escolha.modo === modo ? 'ativo' : ''} onClick={() => trocarModo(modo)}>
            {texto}
          </button>
        ))}
      </div>

      {escolha.modo === 'semana' && (
        <div className="seletor-semana">
          <button className="botao-icone" aria-label="Semana anterior"
            onClick={() => setParametros({ modo: 'semana', de: somarDias(escolha.de, -7) })}>
            <ChevronLeft size={24} strokeWidth={1.75} />
          </button>
          <span>{textoPeriodo(escolha.de, escolha.ate)}</span>
          <button className="botao-icone" aria-label="Próxima semana"
            onClick={() => setParametros({ modo: 'semana', de: somarDias(escolha.de, 7) })}>
            <ChevronRight size={24} strokeWidth={1.75} />
          </button>
        </div>
      )}

      {escolha.modo === 'periodo' && (
        <EscolherPeriodo de={escolha.de} ate={escolha.ate}
          aoMudar={(de, ate) => setParametros({ modo: 'periodo', de, ate })} />
      )}

      {erro && <p className="erro" role="alert" style={{ marginTop: 'var(--space-3)' }}>{erro}</p>}
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
          {/* Este é o extrato da CONTA. As compras no cartão de crédito ficam no extrato de
              cada cartão (aqui só aparece o pagamento da fatura). */}
          {cartoes.length > 0 && (
            <section className="atalho-cartoes">
              <p className="caption muted">
                {t.noCartao > 0
                  ? <>Compras no cartão no período: <strong>{formatarReais(t.noCartao)}</strong>. Elas aparecem no extrato do cartão; aqui entra só o pagamento da fatura.</>
                  : 'Compras no cartão aparecem no extrato do cartão; aqui entra só o pagamento da fatura.'}
              </p>
              <div className="chips">
                {cartoes.map((c) => (
                  <Link key={c.id} to={`/cartoes/${c.id}`} className="chip-link">
                    <CreditCard size={18} strokeWidth={1.75} aria-hidden="true" /> {c.nome}
                  </Link>
                ))}
              </div>
            </section>
          )}

          {dados.lancamentos.length > 0 && (
            <button type="button" className="botao-quieto botao-exportar" onClick={exportar} disabled={exportando}>
              <Download size={18} strokeWidth={1.75} aria-hidden="true" />
              {exportando ? 'Preparando…' : 'Exportar planilha'}
            </button>
          )}

          {dados.lancamentos.length === 0 ? (
            <div className="vazio">
              <p>Nenhum lançamento em {nomePeriodo}.</p>
              <Link to="/lancamentos/novo" className="botao-secundario" style={{ marginTop: 'var(--space-3)' }}>
                Lançar agora
              </Link>
            </div>
          ) : (
            agruparPorDia(dados.lancamentos).map(([dia, itens]) => (
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

// Campos "De" e "Até". Só busca quando as duas datas fazem sentido.
function EscolherPeriodo({ de, ate, aoMudar }) {
  const [inicio, setInicio] = useState(de);
  const [fim, setFim] = useState(ate);
  const invertido = inicio && fim && inicio > fim;

  function mudar(novoInicio, novoFim) {
    setInicio(novoInicio);
    setFim(novoFim);
    if (novoInicio && novoFim && novoInicio <= novoFim) aoMudar(novoInicio, novoFim);
  }

  return (
    <div className="periodo-livre">
      <div className="linha-campos">
        <label className="campo">
          De
          <input type="date" value={inicio} max={fim || undefined} onChange={(e) => mudar(e.target.value, fim)} />
        </label>
        <label className="campo">
          Até
          <input type="date" value={fim} min={inicio || undefined} onChange={(e) => mudar(inicio, e.target.value)} />
        </label>
      </div>
      {invertido && <p className="erro" role="alert">A data "De" precisa ser antes da data "Até".</p>}
    </div>
  );
}
