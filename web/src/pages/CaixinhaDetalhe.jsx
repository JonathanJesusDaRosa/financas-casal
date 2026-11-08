// Uma meta: saldo, progresso, botões Guardar / Resgatar / Atualizar saldo e histórico.
import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft, PiggyBank, RefreshCw, TrendingUp, Undo2, X } from 'lucide-react';
import { api } from '../api.js';
import { useValoresOcultos } from '../hooks/useValoresOcultos.js';
import { useAuth } from '../auth.jsx';
import Icone from '../components/Icone.jsx';
import Progresso from '../components/Progresso.jsx';
import { formatarReais, textoParaCentavos } from '../utils/dinheiro.js';
import { dataCurta, hoje } from '../utils/datas.js';
import { planejamento, porcentagem } from '../utils/caixinhas.js';

// Textos de cada ação
const ACOES = {
  guardar: { titulo: 'Guardar na meta', campo: 'Quanto vocês separaram? (R$)', rota: 'guardar' },
  resgatar: { titulo: 'Resgatar da meta', campo: 'Quanto vão tirar? (R$)', rota: 'resgatar' },
  atualizar: { titulo: 'Atualizar com o saldo do banco', campo: 'Saldo que o banco mostra hoje (R$)', rota: 'atualizar-saldo' },
};

const MOVIMENTOS = {
  GUARDADO: { Icone: PiggyBank, texto: 'Guardou' },
  RESGATE: { Icone: Undo2, texto: 'Resgatou' },
  RENDIMENTO: { Icone: TrendingUp, texto: 'Rendimento' },
};

export default function CaixinhaDetalhe() {
  useValoresOcultos(); // redesenha a tela quando tocam no "olho" do topo
  const { id } = useParams();
  const navegar = useNavigate();
  const [caixinha, setCaixinha] = useState(null);
  const [movimentos, setMovimentos] = useState([]);
  const [membros, setMembros] = useState([]);
  const [acao, setAcao] = useState(null); // 'guardar' | 'resgatar' | 'atualizar' | null
  const [erro, setErro] = useState('');

  // useCallback: a função só é recriada quando o id muda (o useEffect depende dela).
  const carregar = useCallback(() => {
    return api(`/caixinhas/${id}`)
      .then((dados) => {
        setCaixinha(dados.caixinha);
        setMovimentos(dados.movimentos);
      })
      .catch((e) => setErro(e.message));
  }, [id]);

  useEffect(() => {
    carregar();
    api('/casal').then((dados) => setMembros(dados.casal.membros)).catch(() => {});
  }, [carregar]);

  async function executar(acaoNaApi) {
    setErro('');
    try {
      await acaoNaApi();
      await carregar();
    } catch (e) {
      setErro(e.message);
    }
  }

  function apagarMovimento(m) {
    const nome = MOVIMENTOS[m.tipo].texto.toLowerCase();
    if (!window.confirm(`Apagar "${nome} ${formatarReais(m.valorCentavos)}" de ${dataCurta(m.data)}?`)) return;
    executar(() => api(`/caixinhas/${id}/movimentos/${m.id}`, { metodo: 'DELETE' }));
  }

  async function apagarMeta() {
    if (!window.confirm(`Apagar a meta "${caixinha.nome}"?`)) return;
    try {
      await api(`/caixinhas/${id}`, { metodo: 'DELETE' });
      navegar('/metas');
    } catch (e) {
      setErro(e.message);
    }
  }

  if (!caixinha) {
    return (
      <main className="tela">
        {erro ? <p className="erro" role="alert">{erro}</p> : <p className="vazio">Carregando…</p>}
      </main>
    );
  }

  return (
    <main className="tela">
      <header className="cabecalho">
        <Link to="/metas" className="botao-icone" aria-label="Voltar para Metas">
          <ChevronLeft size={24} strokeWidth={1.75} />
        </Link>
        <h1 className="item-titulo">{caixinha.nome}</h1>
        <Link to={`/metas/${id}/editar`} className="botao-quieto">Editar</Link>
      </header>

      <section className="card destaque-meta">
        <span className="item-icone meta"><Icone nome={caixinha.icone} tamanho={28} /></span>
        {caixinha.arquivada && <p><span className="etiqueta">Arquivada</span></p>}
        <p className="valor-grande">{formatarReais(caixinha.saldoCentavos)}</p>
        <p className="muted">de {formatarReais(caixinha.valorAlvoCentavos)} · {porcentagem(caixinha)}%</p>
        <Progresso caixinha={caixinha} />
        {!caixinha.arquivada && <p>{planejamento(caixinha)}</p>}
        <p className="caption muted" style={{ marginTop: 'var(--space-2)' }}>
          {caixinha.investimento ? `Aplicado em ${caixinha.investimento.nome}` : 'Sem investimento definido'}
          {caixinha.rendimentoCentavos !== 0 && ` · Rendeu ${formatarReais(caixinha.rendimentoCentavos)}`}
        </p>
      </section>

      {erro && <p className="erro" role="alert" style={{ marginTop: 'var(--space-3)' }}>{erro}</p>}

      {!caixinha.arquivada && (
        acao ? (
          <FormMovimento
            acao={acao}
            caixinhaId={id}
            saldoCentavos={caixinha.saldoCentavos}
            membros={membros}
            aoTerminar={() => { setAcao(null); carregar(); }}
            aoCancelar={() => setAcao(null)}
          />
        ) : (
          <div className="acoes-meta">
            <button className="botao" onClick={() => { setErro(''); setAcao('guardar'); }}>
              <PiggyBank size={20} strokeWidth={1.75} aria-hidden="true" /> Guardar
            </button>
            <button className="botao-secundario" disabled={caixinha.saldoCentavos === 0}
              onClick={() => { setErro(''); setAcao('resgatar'); }}>
              <Undo2 size={20} strokeWidth={1.75} aria-hidden="true" /> Resgatar
            </button>
            <button className="botao-secundario" onClick={() => { setErro(''); setAcao('atualizar'); }}>
              <RefreshCw size={20} strokeWidth={1.75} aria-hidden="true" /> Atualizar saldo
            </button>
          </div>
        )
      )}

      <section className="secao">
        <div className="secao-topo"><h2>Histórico</h2></div>
        {movimentos.length === 0 ? (
          <p className="card muted">Nenhum movimento ainda. Toque em Guardar para começar.</p>
        ) : (
          <ul className="card lista">
            {movimentos.map((m) => {
              const { Icone: IconeMov, texto } = MOVIMENTOS[m.tipo];
              const tira = m.tipo === 'RESGATE' || m.valorCentavos < 0;
              return (
                <li key={m.id} className="item">
                  <span className="item-icone meta"><IconeMov size={20} strokeWidth={1.75} aria-hidden="true" /></span>
                  <span className="item-textos">
                    <span className="item-titulo">{texto}</span>
                    <span className="item-sub">{m.pagoPor.nome} · {dataCurta(m.data)}</span>
                  </span>
                  <span className={tira ? 'valor-lista saida' : 'valor-lista entrada'}>
                    {tira ? '− ' : '+ '}{formatarReais(Math.abs(m.valorCentavos))}
                  </span>
                  <button className="botao-apagar-mov" aria-label="Apagar movimento" onClick={() => apagarMovimento(m)}>
                    <X size={18} strokeWidth={1.75} />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <div className="secao" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
        {caixinha.arquivada ? (
          <button className="botao-secundario" onClick={() => executar(() => api(`/caixinhas/${id}`, { metodo: 'PATCH', corpo: { arquivada: false } }))}>
            Reativar meta
          </button>
        ) : (
          caixinha.saldoCentavos === 0 && movimentos.length > 0 && (
            <button className="botao-secundario" onClick={() => executar(() => api(`/caixinhas/${id}`, { metodo: 'PATCH', corpo: { arquivada: true } }))}>
              Arquivar meta
            </button>
          )
        )}
        {movimentos.length === 0 && (
          <button className="botao-perigo" onClick={apagarMeta}>Apagar meta</button>
        )}
      </div>
    </main>
  );
}

// Formulário de Guardar / Resgatar / Atualizar saldo.
function FormMovimento({ acao, caixinhaId, saldoCentavos, membros, aoTerminar, aoCancelar }) {
  const { usuario } = useAuth();
  const textos = ACOES[acao];
  const [valor, setValor] = useState('');
  const [data, setData] = useState(hoje());
  const [pagoPorId, setPagoPorId] = useState(usuario.id);
  const [erro, setErro] = useState('');
  const [enviando, setEnviando] = useState(false);

  // Na atualização, mostra a diferença que vai virar rendimento.
  const digitado = textoParaCentavos(valor);
  const diferenca = acao === 'atualizar' && digitado !== null ? digitado - saldoCentavos : null;

  async function aoEnviar(evento) {
    evento.preventDefault();
    setErro('');
    const centavos = textoParaCentavos(valor);
    if (centavos === null || (acao !== 'atualizar' && centavos === 0)) {
      setErro('Valor inválido. Exemplos: 300 ou 1.250,90');
      return;
    }
    const corpo = acao === 'atualizar'
      ? { saldoAtualCentavos: centavos, data }
      : { valorCentavos: centavos, data, pagoPorId };

    setEnviando(true);
    try {
      await api(`/caixinhas/${caixinhaId}/${textos.rota}`, { metodo: 'POST', corpo });
      aoTerminar();
    } catch (e) {
      setErro(e.message);
      setEnviando(false);
    }
  }

  return (
    <form className="card formulario" style={{ marginTop: 'var(--space-3)' }} onSubmit={aoEnviar}>
      <h2>{textos.titulo}</h2>

      <label className="campo">
        {textos.campo}
        <input type="text" inputMode="decimal" required autoFocus placeholder="0,00"
          className="campo-valor" value={valor} onChange={(e) => setValor(e.target.value)} />
      </label>

      {acao === 'atualizar' && (
        <p className="aviso">
          No app: {formatarReais(saldoCentavos)}.
          {diferenca !== null && diferenca !== 0 && (
            <> A diferença de <strong>{formatarReais(diferenca)}</strong> será registrada como rendimento.</>
          )}
        </p>
      )}
      {acao === 'resgatar' && <p className="aviso">Disponível: {formatarReais(saldoCentavos)}. O valor resgatado conta como entrada no mês.</p>}
      {acao === 'guardar' && <p className="aviso">Conta no mês como "Guardado". Depois é só aplicar no banco.</p>}

      <label className="campo">
        Data
        <input type="date" required value={data} onChange={(e) => setData(e.target.value)} />
      </label>

      {acao !== 'atualizar' && membros.length > 1 && (
        <fieldset className="campo" style={{ border: 'none', padding: 0, margin: 0 }}>
          <legend style={{ marginBottom: 'var(--space-2)' }}>Quem fez</legend>
          <div className="chips">
            {membros.map((m) => (
              <button key={m.id} type="button" aria-pressed={pagoPorId === m.id}
                className={pagoPorId === m.id ? 'ativo' : ''} onClick={() => setPagoPorId(m.id)}>
                {m.id === usuario.id ? 'Você' : m.nome}
              </button>
            ))}
          </div>
        </fieldset>
      )}

      {erro && <p className="erro" role="alert">{erro}</p>}

      <div className="botoes">
        <button type="button" className="botao-secundario" onClick={aoCancelar}>Cancelar</button>
        <button type="submit" className="botao" disabled={enviando}>{enviando ? 'Salvando…' : 'Confirmar'}</button>
      </div>
    </form>
  );
}
