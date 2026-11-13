// Um cartão de crédito: as faturas (anterior, atual e futuras com parcelas),
// as compras de cada fatura, e os botões para pagar a fatura ou desfazer o pagamento.
import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ChevronLeft, CreditCard } from 'lucide-react';
import { api } from '../api.js';
import { useAuth } from '../auth.jsx';
import { useValoresOcultos } from '../hooks/useValoresOcultos.js';
import ItemLancamento from '../components/ItemLancamento.jsx';
import { formatarReais } from '../utils/dinheiro.js';
import { dataCurta, hoje, nomeDoMes } from '../utils/datas.js';
import { SITUACAO_FATURA } from '../utils/fatura.js';

// "2026-12" -> "dez/26"
const mesCurto = (mes) => `${nomeDoMes(mes).slice(0, 3).toLowerCase()}/${mes.slice(2, 4)}`;

export default function Cartao() {
  useValoresOcultos(); // redesenha a tela quando tocam no "olho" do topo
  const { id } = useParams();
  const navegar = useNavigate();
  const [parametros, setParametros] = useSearchParams();
  const mesPedido = parametros.get('mes');
  const [dados, setDados] = useState(null); // { cartao, meses, fatura, compras }
  const [erro, setErro] = useState('');
  const [pagando, setPagando] = useState(false);

  const carregar = useCallback(() => {
    const busca = mesPedido ? `?mes=${mesPedido}` : '';
    return api(`/faturas/${id}${busca}`).then(setDados).catch((e) => setErro(e.message));
  }, [id, mesPedido]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  async function desfazer() {
    if (!window.confirm('Desfazer o pagamento desta fatura? O valor sai do "Saiu" do mês.')) return;
    setErro('');
    try {
      await api(`/faturas/${id}/pagamento?mes=${dados.fatura.mes}`, { metodo: 'DELETE' });
      await carregar();
    } catch (e) {
      setErro(e.message);
    }
  }

  function voltar() {
    if (window.history.state?.idx > 0) navegar(-1);
    else navegar('/contas');
  }

  if (!dados) {
    return (
      <main className="tela">
        {erro ? <p className="erro" role="alert">{erro}</p> : <p className="vazio">Carregando…</p>}
      </main>
    );
  }

  const { cartao, fatura, compras } = dados;
  const paga = fatura.situacao === 'paga';

  return (
    <main className="tela">
      <header className="cabecalho">
        <button type="button" className="botao-icone" aria-label="Voltar" onClick={voltar}>
          <ChevronLeft size={24} strokeWidth={1.75} />
        </button>
        <h1 className="item-titulo">{cartao.nome}</h1>
      </header>
      <p className="muted" style={{ marginBottom: 'var(--space-3)' }}>
        Fecha dia {cartao.diaFechamento} · vence dia {cartao.diaVencimento}
      </p>

      {/* Escolher a fatura (pelo mês em que vence) */}
      <div className="chips meses-fatura" role="tablist" aria-label="Faturas">
        {dados.meses.map((m) => (
          <button key={m} type="button" role="tab" aria-selected={m === fatura.mes}
            className={m === fatura.mes ? 'ativo' : ''}
            onClick={() => { setPagando(false); setParametros(m === dados.faturaAtual ? {} : { mes: m }); }}>
            {mesCurto(m)}
          </button>
        ))}
      </div>

      <section className="card-saldo" style={{ marginTop: 'var(--space-4)' }}>
        <p className="label">Fatura de {nomeDoMes(fatura.mes).toLowerCase()} · {SITUACAO_FATURA[fatura.situacao]}</p>
        <p className="valor-grande">{formatarReais(fatura.totalCentavos)}</p>
        <p className="caption">
          {fatura.situacao === 'aberta' ? 'Fecha' : 'Fechou'} em {dataCurta(fatura.fechamento)} · vence em {dataCurta(fatura.vencimento)}
        </p>
        {paga && (
          <p className="caption" style={{ marginTop: 'var(--space-2)' }}>
            Paga em {dataCurta(fatura.pagamento.data)} por {fatura.pagamento.pagoPor.nome}: {formatarReais(fatura.pagamento.valorCentavos)}
            {fatura.pagamento.valorCentavos !== fatura.totalCentavos && ' (as compras mudaram depois do pagamento)'}
          </p>
        )}
      </section>

      {erro && <p className="erro" role="alert" style={{ marginTop: 'var(--space-3)' }}>{erro}</p>}

      {!paga && fatura.totalCentavos > 0 && !pagando && (
        <button className="botao bloco" style={{ marginTop: 'var(--space-3)' }} onClick={() => { setErro(''); setPagando(true); }}>
          <CreditCard size={20} strokeWidth={1.75} aria-hidden="true" /> Pagar fatura
        </button>
      )}
      {pagando && (
        <PagarFatura cartao={cartao} fatura={fatura}
          aoTerminar={() => { setPagando(false); carregar(); }} aoCancelar={() => setPagando(false)} />
      )}
      {paga && (
        <button className="botao-quieto" style={{ marginTop: 'var(--space-2)' }} onClick={desfazer}>Desfazer pagamento</button>
      )}

      <section className="secao">
        <div className="secao-topo">
          <h2>Compras nesta fatura</h2>
          <span className="caption muted">{compras.length} · pela data da compra</span>
        </div>
        {compras.length === 0 ? (
          <p className="card muted">Nenhuma compra nesta fatura.</p>
        ) : (
          // A API já manda na ordem da data da COMPRA (dataCompra). Mostramos essa data:
          // a parcela 2/3 de uma compra de 20/nov aparece como "20 nov · 2/3", junto das compras de novembro.
          <ul className="lista">
            {compras.map((l) => <li key={l.id}><ItemLancamento lancamento={{ ...l, data: l.dataCompra ?? l.data }} /></li>)}
          </ul>
        )}
      </section>

      <p className="caption muted secao">
        Compras no cartão não entram no "Saiu" do mês. O dinheiro sai quando vocês pagam a fatura.
        <br /><Link to="/casa/formas">Ajustar fechamento e vencimento</Link>
      </p>
    </main>
  );
}

// Confirmação do pagamento da fatura (sempre o valor inteiro).
export function PagarFatura({ cartao, fatura, aoTerminar, aoCancelar }) {
  const { usuario } = useAuth();
  const [membros, setMembros] = useState([]);
  const [data, setData] = useState(hoje());
  const [pagoPorId, setPagoPorId] = useState(usuario.id);
  const [erro, setErro] = useState('');
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    api('/casal').then((d) => setMembros(d.casal.membros)).catch(() => {});
  }, []);

  async function aoEnviar(evento) {
    evento.preventDefault();
    setErro('');
    setEnviando(true);
    try {
      await api(`/faturas/${cartao.id}/pagar`, { metodo: 'POST', corpo: { mes: fatura.mes, data, pagoPorId } });
      aoTerminar();
    } catch (e) {
      setErro(e.message);
      setEnviando(false);
    }
  }

  return (
    <form className="card formulario confirmar-conta" style={{ marginTop: 'var(--space-3)' }} onSubmit={aoEnviar}>
      <p className="aviso">
        Pagar a fatura inteira de {formatarReais(fatura.totalCentavos)}. Esse valor entra no "Saiu" do mês do pagamento.
      </p>
      <label className="campo">
        Data do pagamento
        <input type="date" required value={data} onChange={(e) => setData(e.target.value)} />
      </label>
      {membros.length > 1 && (
        <fieldset className="campo" style={{ border: 'none', padding: 0, margin: 0 }}>
          <legend style={{ marginBottom: 'var(--space-2)' }}>Quem pagou</legend>
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
        <button type="submit" className="botao" disabled={enviando}>{enviando ? 'Salvando…' : 'Confirmar pagamento'}</button>
      </div>
    </form>
  );
}
