// Uma caixinha: saldo, progresso, botões Guardar / Resgatar / Atualizar saldo e histórico.
import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../auth.jsx';
import { formatarReais, textoParaCentavos } from '../utils/dinheiro.js';
import { hoje } from '../utils/datas.js';
import Progresso from '../components/Progresso.jsx';
import { planejamento, porcentagem } from '../utils/caixinhas.js';

// Textos de cada ação
const ACOES = {
  guardar: { botao: '🐷 Guardar', titulo: 'Guardar na caixinha', campo: 'Quanto vocês separaram? (R$)', rota: 'guardar' },
  resgatar: { botao: '↩️ Resgatar', titulo: 'Resgatar da caixinha', campo: 'Quanto vão tirar? (R$)', rota: 'resgatar' },
  atualizar: { botao: '📈 Atualizar saldo', titulo: 'Atualizar com o saldo do banco', campo: 'Saldo que o banco mostra hoje (R$)', rota: 'atualizar-saldo' },
};

const NOMES_MOVIMENTO = {
  GUARDADO: { icone: '🐷', texto: 'Guardou' },
  RESGATE: { icone: '↩️', texto: 'Resgatou' },
  RENDIMENTO: { icone: '📈', texto: 'Rendimento' },
};

export default function CaixinhaDetalhe() {
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

  async function apagarMovimento(m) {
    const nome = NOMES_MOVIMENTO[m.tipo].texto.toLowerCase();
    if (!window.confirm(`Apagar "${nome} ${formatarReais(m.valorCentavos)}" de ${m.data.split('-').reverse().join('/')}?`)) return;
    setErro('');
    try {
      await api(`/caixinhas/${id}/movimentos/${m.id}`, { metodo: 'DELETE' });
      await carregar();
    } catch (e) {
      setErro(e.message);
    }
  }

  async function arquivar(arquivada) {
    setErro('');
    try {
      await api(`/caixinhas/${id}`, { metodo: 'PATCH', corpo: { arquivada } });
      await carregar();
    } catch (e) {
      setErro(e.message);
    }
  }

  async function apagarCaixinha() {
    if (!window.confirm(`Apagar a caixinha "${caixinha.nome}"?`)) return;
    try {
      await api(`/caixinhas/${id}`, { metodo: 'DELETE' });
      navegar('/caixinhas');
    } catch (e) {
      setErro(e.message);
    }
  }

  if (!caixinha) {
    return (
      <main className="pagina">
        {erro ? <p className="erro" role="alert">{erro}</p> : <p className="dica">Carregando…</p>}
      </main>
    );
  }

  return (
    <main className="pagina">
      <header className="topo">
        <Link to="/caixinhas" className="botao secundario">‹ Caixinhas</Link>
        <Link to={`/caixinhas/${id}/editar`} className="botao secundario">Editar</Link>
      </header>

      <section className="cartao destaque-caixinha">
        <h1>{caixinha.icone} {caixinha.nome}</h1>
        {caixinha.arquivada && <span className="etiqueta">Arquivada</span>}
        <p className="saldo-grande">{formatarReais(caixinha.saldoCentavos)}</p>
        <p className="dica">de {formatarReais(caixinha.valorAlvoCentavos)} · {porcentagem(caixinha)}%</p>
        <Progresso caixinha={caixinha} />
        {!caixinha.arquivada && <p className="planejamento">{planejamento(caixinha)}</p>}
        <p className="dica pequena">
          {caixinha.investimento ? `Aplicado em: ${caixinha.investimento.nome}` : 'Sem investimento definido'}
          {caixinha.rendimentoCentavos !== 0 && ` · Já rendeu ${formatarReais(caixinha.rendimentoCentavos)}`}
        </p>
      </section>

      {erro && <p className="erro" role="alert">{erro}</p>}

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
          <div className="acoes-caixinha">
            {Object.entries(ACOES).map(([chave, a]) => (
              <button key={chave} className={chave === 'guardar' ? '' : 'secundario'} onClick={() => { setErro(''); setAcao(chave); }}
                disabled={chave === 'resgatar' && caixinha.saldoCentavos === 0}>
                {a.botao}
              </button>
            ))}
          </div>
        )
      )}

      <section className="cartao">
        <h2>Histórico</h2>
        {movimentos.length === 0 ? (
          <p className="dica">Nenhum movimento ainda. Toque em <strong>Guardar</strong> para começar.</p>
        ) : (
          <ul className="historico">
            {movimentos.map((m) => (
              <li key={m.id}>
                <span aria-hidden="true">{NOMES_MOVIMENTO[m.tipo].icone}</span>
                <span className="textos">
                  {NOMES_MOVIMENTO[m.tipo].texto}
                  <small>{m.data.split('-').reverse().join('/')} · {m.pagoPor.nome}</small>
                </span>
                <span className={m.tipo === 'RESGATE' || m.valorCentavos < 0 ? 'valor negativo' : 'valor positivo'}>
                  {m.tipo === 'RESGATE' ? '− ' : m.valorCentavos > 0 ? '+ ' : ''}
                  {formatarReais(m.valorCentavos)}
                </span>
                <button className="secundario apagar-mov" aria-label="Apagar movimento" onClick={() => apagarMovimento(m)}>✕</button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="rodape-caixinha">
        {caixinha.arquivada ? (
          <button className="secundario" onClick={() => arquivar(false)}>Reativar caixinha</button>
        ) : (
          caixinha.saldoCentavos === 0 && movimentos.length > 0 && (
            <button className="secundario" onClick={() => arquivar(true)}>Arquivar (sonho realizado)</button>
          )
        )}
        {movimentos.length === 0 && (
          <button className="perigo" onClick={apagarCaixinha}>Apagar caixinha</button>
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
  const [pagoPorId, setPagoPorId] = useState(String(usuario.id));
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
      : { valorCentavos: centavos, data, pagoPorId: Number(pagoPorId) };

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
    <form className="cartao formulario" onSubmit={aoEnviar}>
      <h2>{textos.titulo}</h2>

      <label>
        {textos.campo}
        <input type="text" inputMode="decimal" required autoFocus placeholder="0,00"
          className="campo-valor" value={valor} onChange={(e) => setValor(e.target.value)} />
      </label>

      {acao === 'atualizar' && (
        <p className="dica">
          Saldo no app: {formatarReais(saldoCentavos)}.
          {diferenca !== null && diferenca !== 0 && (
            <> A diferença de <strong className={diferenca > 0 ? 'positivo' : 'negativo'}>{formatarReais(diferenca)}</strong> será registrada como rendimento.</>
          )}
        </p>
      )}
      {acao === 'resgatar' && <p className="dica">Disponível: {formatarReais(saldoCentavos)}. O valor resgatado entra como entrada no mês.</p>}
      {acao === 'guardar' && <p className="dica">Aparece no mês como "Guardado". Depois é só aplicar no banco.</p>}

      <label>
        Data
        <input type="date" required value={data} onChange={(e) => setData(e.target.value)} />
      </label>

      {acao !== 'atualizar' && membros.length > 1 && (
        <label>
          Quem fez
          <select value={pagoPorId} onChange={(e) => setPagoPorId(e.target.value)}>
            {membros.map((m) => (
              <option key={m.id} value={m.id}>{m.id === usuario.id ? `${m.nome} (você)` : m.nome}</option>
            ))}
          </select>
        </label>
      )}

      {erro && <p className="erro" role="alert">{erro}</p>}

      <div className="botoes">
        <button type="button" className="secundario" onClick={aoCancelar}>Cancelar</button>
        <button type="submit" disabled={enviando}>{enviando ? 'Salvando…' : 'Confirmar'}</button>
      </div>
    </form>
  );
}
