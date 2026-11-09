// Aba de contas fixas do mês: o que está atrasado, a pagar e já pago.
// "Ajustar" muda o valor só deste mês, antes de pagar (ex.: a conta de luz veio R$ 102).
// "Pagar" abre uma confirmação (valor, data, quem pagou, forma) e cria o lançamento.
import { useCallback, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Pencil, Plus } from 'lucide-react';
import { api } from '../api.js';
import { useAuth } from '../auth.jsx';
import { useValoresOcultos } from '../hooks/useValoresOcultos.js';
import Cabecalho from '../components/Cabecalho.jsx';
import EscolherForma from '../components/EscolherForma.jsx';
import Icone from '../components/Icone.jsx';
import SeletorMes from '../components/SeletorMes.jsx';
import { centavosParaTexto, formatarReais, textoParaCentavos } from '../utils/dinheiro.js';
import { hoje, mesAtual } from '../utils/datas.js';
import { ordenarPendentes, textoVencimento } from '../utils/contas.js';
import { SITUACAO_FATURA } from '../utils/fatura.js';
import { PagarFatura } from './Cartao.jsx';

export default function Contas() {
  useValoresOcultos(); // redesenha a tela quando tocam no "olho" do topo
  const [parametros, setParametros] = useSearchParams();
  const mes = parametros.get('mes') || mesAtual();
  const [dados, setDados] = useState(null); // { mes, contas, resumo }
  const [membros, setMembros] = useState([]);
  const [formas, setFormas] = useState([]);
  // Painel aberto embaixo de uma conta: { id, acao: 'pagar' | 'ajustar' } ou null
  const [aberto, setAberto] = useState(null);
  const [erro, setErro] = useState('');

  const carregar = useCallback(() => {
    return api(`/contas-fixas/mes?mes=${mes}`).then(setDados).catch((e) => setErro(e.message));
  }, [mes]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  useEffect(() => {
    api('/casal').then((d) => setMembros(d.casal.membros)).catch(() => {});
    api('/formas-pagamento').then((d) => setFormas(d.formas)).catch(() => {});
  }, []);

  function irParaMes(novo) {
    setErro('');
    setDados(null);
    setAberto(null);
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
            <ItemConta
              conta={c}
              aoPagar={() => { setErro(''); setAberto({ id: c.id, acao: 'pagar' }); }}
              aoAjustar={() => { setErro(''); setAberto({ id: c.id, acao: 'ajustar' }); }}
            />
            {aberto?.id === c.id && aberto.acao === 'pagar' && (
              <ConfirmarPagamento
                conta={c}
                mes={mes}
                membros={membros}
                formas={formas}
                aoTerminar={() => { setAberto(null); carregar(); }}
                aoCancelar={() => setAberto(null)}
              />
            )}
            {aberto?.id === c.id && aberto.acao === 'ajustar' && (
              <AjustarValor
                conta={c}
                mes={mes}
                aoTerminar={() => { setAberto(null); carregar(); }}
                aoCancelar={() => setAberto(null)}
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
          {dados.contas.length === 0 && dados.faturas.length === 0 ? (
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

          {dados.faturas.length > 0 && (
            <section className="secao">
              <div className="secao-topo"><h2>Faturas do cartão</h2></div>
              <ul className="lista">
                {dados.faturas.map((f) => (
                  <li key={f.cartao.id}>
                    <div className="item item-conta">
                      <Link to={`/cartoes/${f.cartao.id}?mes=${f.mes}`} className="item-link">
                        <span className="item-icone"><Icone nome="conta" /></span>
                        <span className="item-textos">
                          <span className="item-titulo">Fatura {f.cartao.nome}</span>
                          <span className={`item-sub ${f.situacao === 'atrasada' ? 'texto-atencao' : ''}`}>
                            {SITUACAO_FATURA[f.situacao]} · {textoVencimento({ ...f, tipo: 'DESPESA' })}
                          </span>
                        </span>
                        <span className={`valor-lista ${f.situacao === 'paga' ? 'saida' : ''}`}>{formatarReais(f.totalCentavos)}</span>
                      </Link>
                      {f.situacao !== 'paga' && (
                        <div className="acoes-conta">
                          <button className="botao-secundario botao-pequeno"
                            onClick={() => { setErro(''); setAberto({ id: `fatura-${f.cartao.id}`, acao: 'pagar' }); }}>
                            Pagar fatura
                          </button>
                        </div>
                      )}
                    </div>
                    {aberto?.id === `fatura-${f.cartao.id}` && (
                      <PagarFatura cartao={f.cartao} fatura={f}
                        aoTerminar={() => { setAberto(null); carregar(); }} aoCancelar={() => setAberto(null)} />
                    )}
                  </li>
                ))}
              </ul>
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
function ItemConta({ conta: c, aoPagar, aoAjustar }) {
  const paga = c.situacao === 'paga';
  const atrasada = c.situacao === 'atrasada';
  const entra = c.tipo === 'RECEITA';
  const destino = paga ? `/lancamentos/${c.pagamento.id}` : `/contas/${c.id}/editar`;

  return (
    // Duas linhas: em cima nome/vencimento/valor; embaixo "Ajustar valor" e "Pagar"
    // (assim o nome não fica espremido em celular pequeno).
    <div className="item item-conta">
      <Link to={destino} className="item-link">
        <span className="item-icone"><Icone nome={c.categoria?.icone} /></span>
        <span className="item-textos">
          <span className="item-titulo">{c.nome}</span>
          <span className={`item-sub ${atrasada ? 'texto-atencao' : ''}`}>
            {c.parcela && `${c.parcela}/${c.totalParcelas} · `}{textoVencimento(c)}
            {!paga && c.valorAjustado && ' · valor ajustado'}
          </span>
        </span>
        <span className={`valor-lista ${paga ? (entra ? 'entrada' : 'saida') : ''}`}>
          {formatarReais(paga ? c.pagamento.valorCentavos : c.valorDoMes)}
        </span>
      </Link>
      {!paga && (
        <div className="acoes-conta">
          <button className="botao-quieto botao-pequeno" onClick={aoAjustar} aria-label={'Ajustar o valor de ' + c.nome + ' neste mês'}>
            <Pencil size={16} strokeWidth={1.75} aria-hidden="true" /> Ajustar valor
          </button>
          <button className="botao-secundario botao-pequeno" onClick={aoPagar}>{entra ? 'Recebi' : 'Pagar'}</button>
        </div>
      )}
    </div>
  );
}

// Confirmação do pagamento: dá para ajustar valor (ex.: conta de luz), data e quem pagou.
function ConfirmarPagamento({ conta, mes, membros, formas, aoTerminar, aoCancelar }) {
  const { usuario } = useAuth();
  // Já vem com o valor do mês (o ajustado, se houver) e a forma de costume da conta.
  const [valor, setValor] = useState(centavosParaTexto(conta.valorDoMes));
  const [formaPagamentoId, setFormaPagamentoId] = useState(conta.formaPagamento?.id ?? null);
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
      await api(`/contas-fixas/${conta.id}/pagar`, { metodo: 'POST', corpo: { mes, valorCentavos, data, pagoPorId, formaPagamentoId } });
      aoTerminar();
    } catch (e) {
      setErro(e.message);
      setEnviando(false);
    }
  }

  return (
    <form className="card formulario confirmar-conta" onSubmit={aoEnviar}>
      <p className="aviso">
        Confira antes de salvar. Vira um lançamento{conta.categoria ? ` em ${conta.categoria.nome}` : ' sem categoria'}.
      </p>
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
      <EscolherForma formas={formas} valor={formaPagamentoId} aoMudar={setFormaPagamentoId}
        rotulo={entra ? 'Recebido por' : 'Forma de pagamento'} />
      {erro && <p className="erro" role="alert">{erro}</p>}
      <div className="botoes">
        <button type="button" className="botao-secundario" onClick={aoCancelar}>Cancelar</button>
        <button type="submit" className="botao" disabled={enviando}>{enviando ? 'Salvando…' : 'Confirmar'}</button>
      </div>
    </form>
  );
}

// Ajustar o valor SÓ deste mês, antes de pagar (o valor de costume continua para os outros meses).
function AjustarValor({ conta, mes, aoTerminar, aoCancelar }) {
  const [valor, setValor] = useState(centavosParaTexto(conta.valorDoMes));
  const [erro, setErro] = useState('');
  const [enviando, setEnviando] = useState(false);

  async function aoEnviar(evento) {
    evento.preventDefault();
    setErro('');
    const valorCentavos = textoParaCentavos(valor);
    if (!valorCentavos) {
      setErro('Valor inválido. Exemplos: 102 ou 98,50');
      return;
    }
    setEnviando(true);
    try {
      await api('/contas-fixas/' + conta.id + '/valor-mes', { metodo: 'PUT', corpo: { mes, valorCentavos } });
      aoTerminar();
    } catch (e) {
      setErro(e.message);
      setEnviando(false);
    }
  }

  async function voltarAoPrevisto() {
    setEnviando(true);
    try {
      await api('/contas-fixas/' + conta.id + '/valor-mes?mes=' + mes, { metodo: 'DELETE' });
      aoTerminar();
    } catch (e) {
      setErro(e.message);
      setEnviando(false);
    }
  }

  return (
    <form className="card formulario confirmar-conta" onSubmit={aoEnviar}>
      <label className="campo">
        <span>Valor deste mês (R$) <small>Previsto: {formatarReais(conta.valorCentavos)}</small></span>
        <input type="text" inputMode="decimal" required autoFocus value={valor} onChange={(e) => setValor(e.target.value)} />
      </label>
      <p className="caption muted">Muda só este mês. Ao pagar, este valor já vem preenchido.</p>
      {erro && <p className="erro" role="alert">{erro}</p>}
      <div className="botoes">
        <button type="button" className="botao-secundario" onClick={aoCancelar}>Cancelar</button>
        <button type="submit" className="botao" disabled={enviando}>{enviando ? 'Salvando…' : 'Salvar valor'}</button>
      </div>
      {conta.valorAjustado && (
        <button type="button" className="botao-quieto" onClick={voltarAoPrevisto} disabled={enviando}>
          Voltar ao valor previsto
        </button>
      )}
    </form>
  );
}
