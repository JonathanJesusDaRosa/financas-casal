// Criar (/contas/nova) ou editar (/contas/42/editar) uma conta fixa.
// Dois tipos: SEM FIM (internet, aluguel) ou COM FIM (parcelas: "geladeira em 8x").
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { api } from '../api.js';
import EscolherForma from '../components/EscolherForma.jsx';
import Icone from '../components/Icone.jsx';
import { centavosParaTexto, formatarReais, textoParaCentavos } from '../utils/dinheiro.js';
import { mesAtual, nomeDoMes, somarMeses } from '../utils/datas.js';

// Meses para o primeiro vencimento: o atual e os próximos 12 (nunca um mês que já passou).
// Na edição, se a conta começou antes, o mês dela também aparece (para não mudar sem querer).
function mesesDeInicio(mesDaConta) {
  const lista = Array.from({ length: 13 }, (_, i) => somarMeses(mesAtual(), i));
  if (mesDaConta && !lista.includes(mesDaConta)) lista.unshift(mesDaConta);
  return lista;
}

export default function FormContaFixa() {
  const { id } = useParams();
  const editando = Boolean(id);
  const navegar = useNavigate();

  const [categorias, setCategorias] = useState([]);
  const [formas, setFormas] = useState([]);

  const [nome, setNome] = useState('');
  const [tipo, setTipo] = useState('DESPESA');
  const [comFim, setComFim] = useState(false); // false = sem fim; true = parcelas
  const [parcelas, setParcelas] = useState('');
  const [parcelaInicial, setParcelaInicial] = useState('1');
  const [valor, setValor] = useState(''); // valor de cada mês (parcela ou previsto)
  const [total, setTotal] = useState(''); // só para calcular a parcela
  const [dia, setDia] = useState('');
  const [mesInicio, setMesInicio] = useState(mesAtual());
  const [mesOriginal, setMesOriginal] = useState(null);
  const [categoriaId, setCategoriaId] = useState(null);
  const [formaPagamentoId, setFormaPagamentoId] = useState(null);
  const [ativa, setAtiva] = useState(true);

  const [carregando, setCarregando] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState('');

  useEffect(() => {
    Promise.all([api('/categorias'), api('/formas-pagamento'), editando ? api(`/contas-fixas/${id}`) : null])
      .then(([resCat, resFormas, resConta]) => {
        setCategorias(resCat.categorias);
        setFormas(resFormas.formas);
        if (resConta) {
          const c = resConta.conta;
          setNome(c.nome);
          setTipo(c.tipo);
          setComFim(Boolean(c.totalParcelas));
          setParcelas(c.totalParcelas ? String(c.totalParcelas) : '');
          setParcelaInicial(String(c.parcelaInicial));
          setValor(centavosParaTexto(c.valorCentavos));
          setDia(String(c.diaVencimento));
          setMesInicio(c.mesInicio);
          setMesOriginal(c.mesInicio);
          setCategoriaId(c.categoria?.id ?? null);
          setFormaPagamentoId(c.formaPagamento?.id ?? null);
          setAtiva(c.ativa);
        }
      })
      .catch((e) => setErro(e.message))
      .finally(() => setCarregando(false));
  }, [id, editando]);

  // Digitou o TOTAL da compra: calcula a parcela (dá para alterar depois).
  function aoMudarTotal(texto) {
    setTotal(texto);
    const totalCentavos = textoParaCentavos(texto);
    const n = Number(parcelas);
    if (totalCentavos && n > 0) setValor(centavosParaTexto(Math.round(totalCentavos / n)));
  }

  // Mudou o número de parcelas com um total já digitado: recalcula a parcela.
  function aoMudarParcelas(texto) {
    setParcelas(texto);
    const totalCentavos = textoParaCentavos(total);
    const n = Number(texto);
    if (totalCentavos && n > 0) setValor(centavosParaTexto(Math.round(totalCentavos / n)));
  }

  function voltar() {
    if (window.history.state?.idx > 0) navegar(-1);
    else navegar('/contas', { replace: true });
  }

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
      await api(editando ? `/contas-fixas/${id}` : '/contas-fixas', {
        metodo: editando ? 'PATCH' : 'POST',
        corpo: {
          nome,
          tipo,
          valorCentavos,
          diaVencimento: Number(dia),
          mesInicio,
          totalParcelas: comFim ? Number(parcelas) : null,
          parcelaInicial: comFim ? Number(parcelaInicial) || 1 : 1,
          categoriaId,
          formaPagamentoId,
          ativa,
        },
      });
      voltar();
    } catch (e) {
      setErro(e.message);
      setEnviando(false);
    }
  }

  async function apagar() {
    if (!window.confirm(`Apagar a conta "${nome}"? Os pagamentos já lançados continuam no extrato.`)) return;
    setEnviando(true);
    try {
      await api(`/contas-fixas/${id}`, { metodo: 'DELETE' });
      voltar();
    } catch (e) {
      setErro(e.message);
      setEnviando(false);
    }
  }

  // Resumo das parcelas: "8 meses: de dezembro de 2026 a julho de 2027"
  const n = Number(parcelas);
  const inicial = Number(parcelaInicial) || 1;
  const meses = comFim && n > 0 && inicial <= n ? n - inicial + 1 : 0;
  const resumoParcelas = meses
    ? `${meses} ${meses === 1 ? 'mês' : 'meses'}: de ${nomeDoMes(mesInicio).toLowerCase()} a ${nomeDoMes(somarMeses(mesInicio, meses - 1)).toLowerCase()}`
    : '';
  const valorCentavos = textoParaCentavos(valor);

  if (carregando) return <main className="tela"><p className="vazio">Carregando…</p></main>;

  return (
    <main className="tela">
      <header className="cabecalho">
        <button type="button" className="botao-icone" aria-label="Voltar" onClick={voltar}>
          <ChevronLeft size={24} strokeWidth={1.75} />
        </button>
        <h1>{editando ? 'Editar conta' : 'Nova conta fixa'}</h1>
      </header>

      <form className="formulario" onSubmit={aoEnviar}>
        <div className="segmentado" role="radiogroup" aria-label="Tipo">
          <button type="button" role="radio" aria-checked={tipo === 'DESPESA'}
            className={tipo === 'DESPESA' ? 'ativo' : ''} onClick={() => setTipo('DESPESA')}>
            Sai (a pagar)
          </button>
          <button type="button" role="radio" aria-checked={tipo === 'RECEITA'}
            className={tipo === 'RECEITA' ? 'ativo' : ''} onClick={() => setTipo('RECEITA')}>
            Entra (a receber)
          </button>
        </div>

        <label className="campo">
          Nome
          <input type="text" required maxLength={60} placeholder={comFim ? 'Ex.: Geladeira' : 'Ex.: Internet'}
            value={nome} onChange={(e) => setNome(e.target.value)} />
        </label>

        {/* Duração: sem fim ou com fim (parcelas) */}
        <fieldset className="campo" style={{ border: 'none', padding: 0, margin: 0 }}>
          <legend style={{ marginBottom: 'var(--space-2)' }}>Duração</legend>
          <div className="segmentado" role="radiogroup" aria-label="Duração">
            <button type="button" role="radio" aria-checked={!comFim}
              className={!comFim ? 'ativo' : ''} onClick={() => setComFim(false)}>
              Sem fim
            </button>
            <button type="button" role="radio" aria-checked={comFim}
              className={comFim ? 'ativo' : ''} onClick={() => setComFim(true)}>
              Com fim (parcelas)
            </button>
          </div>
        </fieldset>

        {comFim && (
          <>
            <div className="linha-campos">
              <label className="campo">
                Nº de parcelas
                <input type="number" inputMode="numeric" required min={1} max={420} placeholder="8"
                  value={parcelas} onChange={(e) => aoMudarParcelas(e.target.value)} />
              </label>
              <label className="campo">
                <span>Começa na parcela <small>Se já pagou algumas</small></span>
                <input type="number" inputMode="numeric" required min={1} max={Number(parcelas) || 420}
                  value={parcelaInicial} onChange={(e) => setParcelaInicial(e.target.value)} />
              </label>
            </div>
            {!editando && (
              <label className="campo">
                <span>Valor total da compra (R$) <small>Opcional: calcula a parcela</small></span>
                <input type="text" inputMode="decimal" placeholder="Ex.: 8.000"
                  value={total} onChange={(e) => aoMudarTotal(e.target.value)} />
              </label>
            )}
          </>
        )}

        <div className="linha-campos">
          <label className="campo">
            <span>{comFim ? 'Valor da parcela (R$)' : 'Valor previsto (R$)'}</span>
            <input type="text" inputMode="decimal" required placeholder="0,00"
              value={valor} onChange={(e) => setValor(e.target.value)} />
          </label>
          <label className="campo">
            Dia do vencimento
            <input type="number" inputMode="numeric" required min={1} max={31} placeholder="10"
              value={dia} onChange={(e) => setDia(e.target.value)} />
          </label>
        </div>

        <label className="campo">
          <span>{comFim ? 'Primeira parcela vence em' : 'Começa em'}</span>
          <select value={mesInicio} onChange={(e) => setMesInicio(e.target.value)}>
            {mesesDeInicio(mesOriginal).map((m) => (
              <option key={m} value={m}>{nomeDoMes(m)}</option>
            ))}
          </select>
        </label>

        {comFim && resumoParcelas && (
          <p className="aviso">
            {resumoParcelas}
            {valorCentavos ? ` · ${formatarReais(valorCentavos)} por mês` : ''}
          </p>
        )}
        {!comFim && (
          <p className="caption muted">
            O valor previsto pode ser ajustado a cada mês na tela de Contas (ex.: a conta de luz que muda).
          </p>
        )}

        <fieldset className="campo" style={{ border: 'none', padding: 0, margin: 0 }}>
          <legend style={{ marginBottom: 'var(--space-2)' }}>Categoria</legend>
          <div className="chips">
            {categorias.map((c) => (
              <button key={c.id} type="button" aria-pressed={categoriaId === c.id}
                className={categoriaId === c.id ? 'ativo' : ''}
                onClick={() => setCategoriaId(categoriaId === c.id ? null : c.id)}>
                <Icone nome={c.icone} tamanho={18} /> {c.nome}
              </button>
            ))}
          </div>
        </fieldset>

        <EscolherForma formas={formas} valor={formaPagamentoId} aoMudar={setFormaPagamentoId}
          rotulo="Forma de pagamento de costume" />

        {editando && (
          <div className="segmentado" role="radiogroup" aria-label="Situação">
            <button type="button" role="radio" aria-checked={ativa}
              className={ativa ? 'ativo' : ''} onClick={() => setAtiva(true)}>
              Ativa
            </button>
            <button type="button" role="radio" aria-checked={!ativa}
              className={!ativa ? 'ativo' : ''} onClick={() => setAtiva(false)}>
              Pausada
            </button>
          </div>
        )}

        <p className="caption muted">
          A conta aparece em cada mês como "a pagar" e só vira lançamento quando vocês tocam em Pagar.
          Compra no cartão: toquem em Pagar quando pagarem a fatura.
        </p>

        {erro && <p className="erro" role="alert">{erro}</p>}

        <button type="submit" className="botao" disabled={enviando}>{enviando ? 'Salvando…' : 'Salvar'}</button>
        {editando && (
          <button type="button" className="botao-perigo" onClick={apagar} disabled={enviando}>Apagar conta</button>
        )}
      </form>
    </main>
  );
}
