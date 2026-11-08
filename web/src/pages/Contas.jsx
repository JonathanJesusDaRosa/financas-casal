// Aba de contas fixas do mês: o que está atrasado, a pagar e já pago.
// "Pagar" abre uma confirmação (valor, data, quem pagou) e cria o lançamento.
import { useCallback, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ChevronRight, Plus } from 'lucide-react';
import { api } from '../api.js';
import { useAuth } from '../auth.jsx';
import { useValoresOcultos } from '../hooks/useValoresOcultos.js';
import Cabecalho from '../components/Cabecalho.jsx';
import Icone from '../components/Icone.jsx';
import SeletorMes from '../components/SeletorMes.jsx';
import { centavosParaTexto, formatarReais, textoParaCentavos } from '../utils/dinheiro.js';
import { hoje, mesAtual } from '../utils/datas.js';
import { ordenarPendentes, textoVencimento } from '../utils/contas.js';

export default function Contas() {
  useValoresOcultos(); // redesenha a tela quando tocam no "olho" do topo
  const [parametros, setParametros] = useSearchParams();
  const mes = parametros.get('mes') || mesAtual();
  const [dados, setDados] = useState(null); // { mes, contas, resumo }
  const [membros, setMembros] = useState([]);
  const [pagando, setPagando] = useState(null); // id da conta com a confirmação aberta
  const [erro, setErro] = useState('');

  const carregar = useCallback(() => {
    return api(`/contas-fixas/mes?mes=${mes}`).then(setDados).catch((e) => setErro(e.message));
  }, [mes]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  useEffect(() => {
    api('/casal').then((d) => setMembros(d.casal.membros)).catch(() => {});
  }, []);

  function irParaMes(novo) {
    setErro('');
    setDados(null);
    setPagando(null);
    setParametros(novo === mesAtual() ? {} : { mes: novo });
  }

  const carregado = dados && dados.mes === mes;
  const pendentes = carregado ? ordenarPendentes(dados.contas) : [];
  const pagas = carregado ? dados.contas.filter((c) => c.situacao === 'paga') : [];

  // Função comum (e não componente): assim o React não recria a lista a cada redesenho
  // e a confirmação aberta não perde o que a pessoa digitou.
  function lista(contas) {
    return (
      <ul className="lista">
        {contas.map((c) => (
          <li key={c.id}>
            <ItemConta conta={c} aoPagar={() => { setErro(''); setPagando(c.id); }} />
            {pagando === c.id && (
              <ConfirmarPagamento
                conta={c}
                mes={mes}
                membros={membros}
                aoTerminar={() => { setPagando(null); carregar(); }}
                aoCancelar={() => setPagando(null)}
              />
            )}
          </li>
        ))}
      </ul>
    );
  }

  return (
    <main className="tela">
      <Cabecalho titulo="Contas">
        <SeletorMes mes={mes} aoMudar={irParaMes} />
      </Cabecalho>

      {erro && <p className="erro" role="alert">{erro}</p>}
      {!carregado && !erro && <p className="vazio">Carregando…</p>}

      {carregado && (
        <>
          {dados.contas.length === 0 ? (
            <p className="vazio">
              Nenhuma conta fixa ainda.<br />Cadastre aluguel, internet, luz… e o app lembra dos vencimentos.
            </p>
          ) : (
            <section className="card">
              <p className="label muted">{dados.resumo.pagas} de {dados.resumo.quantidade} pagas</p>
              <p className="valor-lista">
                {dados.resumo.faltaPagarCentavos > 0
                  ? <>Faltam {formatarReais(dados.resumo.faltaPagarCentavos)}</>
                  : 'Tudo pago neste mês'}
              </p>
              {dados.resumo.atrasadas > 0 && (
                <p className="caption texto-atencao">
                  {dados.resumo.atrasadas} {dados.resumo.atrasadas === 1 ? 'conta atrasada' : 'contas atrasadas'}
                </p>
              )}
            </section>
          )}

          {pendentes.length > 0 && (
            <section className="secao">
              <div className="secao-topo"><h2>A pagar</h2></div>
              {lista(pendentes)}
            </section>
          )}

          {pagas.length > 0 && (
            <section className="secao">
              <div className="secao-topo"><h2>Pagas</h2></div>
              {lista(pagas)}
            </section>
          )}

          <div className="secao">
            <Link to="/contas/nova" className="botao-secundario bloco">
              <Plus size={20} strokeWidth={1.75} aria-hidden="true" /> Nova conta fixa
            </Link>
          </div>
        </>
      )}
    </main>
  );
}

// Uma conta na lista. Tocar no nome edita a conta (ou abre o lançamento, se já paga).
function ItemConta({ conta: c, aoPagar }) {
  const paga = c.situacao === 'paga';
  const atrasada = c.situacao === 'atrasada';
  const entra = c.tipo === 'RECEITA';
  const destino = paga ? `/lancamentos/${c.pagamento.id}` : `/contas/${c.id}/editar`;

  return (
    <div className="item">
      <Link to={destino} className="item-link">
        <span className="item-icone"><Icone nome={c.categoria?.icone} /></span>
        <span className="item-textos">
          <span className="item-titulo">{c.nome}</span>
          <span className={`item-sub ${atrasada ? 'texto-atencao' : ''}`}>{textoVencimento(c)}</span>
        </span>
        <span className={`valor-lista ${paga ? (entra ? 'entrada' : 'saida') : ''}`}>
          {formatarReais(paga ? c.pagamento.valorCentavos : c.valorCentavos)}
        </span>
      </Link>
      {paga ? (
        <ChevronRight size={20} strokeWidth={1.75} aria-hidden="true" className="muted" />
      ) : (
        <button className="botao-secundario botao-pequeno" onClick={aoPagar}>{entra ? 'Recebi' : 'Pagar'}</button>
      )}
    </div>
  );
}

// Confirmação do pagamento: dá para ajustar valor (ex.: conta de luz), data e quem pagou.
function ConfirmarPagamento({ conta, mes, membros, aoTerminar, aoCancelar }) {
  const { usuario } = useAuth();
  const [valor, setValor] = useState(centavosParaTexto(conta.valorCentavos));
  const [data, setData] = useState(hoje());
  const [pagoPorId, setPagoPorId] = useState(usuario.id);
  const [erro, setErro] = useState('');
  const [enviando, setEnviando] = useState(false);
  const entra = conta.tipo === 'RECEITA';

  async function aoEnviar(evento) {
    evento.preventDefault();
    setErro('');
    const valorCentavos = textoParaCentavos(valor);
    if (!valorCentavos) {
      setErro('Valor inválido. Exemplos: 100 ou 89,90');
      return;
    }
    setEnviando(true);
    try {
      await api(`/contas-fixas/${conta.id}/pagar`, { metodo: 'POST', corpo: { mes, valorCentavos, data, pagoPorId } });
      aoTerminar();
    } catch (e) {
      setErro(e.message);
      setEnviando(false);
    }
  }

  return (
    <form className="card formulario confirmar-conta" onSubmit={aoEnviar}>
      <p className="aviso">Confira antes de salvar. Vira um lançamento em {conta.categoria?.nome ?? 'Sem categoria'}.</p>
      <div className="linha-campos">
        <label className="campo">
          Valor (R$)
          <input type="text" inputMode="decimal" required value={valor} onChange={(e) => setValor(e.target.value)} />
        </label>
        <label className="campo">
          Data
          <input type="date" required value={data} onChange={(e) => setData(e.target.value)} />
        </label>
      </div>
      {membros.length > 1 && (
        <fieldset className="campo" style={{ border: 'none', padding: 0, margin: 0 }}>
          <legend style={{ marginBottom: 'var(--space-2)' }}>{entra ? 'Quem recebeu' : 'Quem pagou'}</legend>
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
