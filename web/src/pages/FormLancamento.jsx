// Formulário de lançamento: criar (/lancamentos/novo, aberto pelo botão +)
// ou editar (/lancamentos/42), com o botão de apagar.
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { api } from '../api.js';
import { useAuth } from '../auth.jsx';
import EscolherForma from '../components/EscolherForma.jsx';
import Icone from '../components/Icone.jsx';
import { centavosParaTexto, textoParaCentavos } from '../utils/dinheiro.js';
import { hoje, nomeDoMes, somarMeses } from '../utils/datas.js';
import { cartaoConfigurado, faturaDaCompra } from '../utils/fatura.js';
import { formatarReais } from '../utils/dinheiro.js';

export default function FormLancamento() {
  const { id } = useParams(); // undefined quando é um lançamento novo
  const editando = Boolean(id);
  const { usuario } = useAuth();
  const navegar = useNavigate();

  const [categorias, setCategorias] = useState([]);
  const [membros, setMembros] = useState([]);
  const [formas, setFormas] = useState([]);

  const [tipo, setTipo] = useState('DESPESA');
  const [valor, setValor] = useState('');
  const [data, setData] = useState(hoje());
  const [categoriaId, setCategoriaId] = useState(null);
  const [formaPagamentoId, setFormaPagamentoId] = useState(null);
  const [parcelas, setParcelas] = useState('1'); // só para compra no cartão (novo lançamento)
  const [parcelaInfo, setParcelaInfo] = useState(null); // ao editar uma parcela: { parcela, totalParcelas }
  const [pagoPorId, setPagoPorId] = useState(usuario.id);
  const [descricao, setDescricao] = useState('');

  const [carregando, setCarregando] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState('');

  // Carrega categorias, membros e (se for edição) o lançamento, tudo ao mesmo tempo.
  useEffect(() => {
    Promise.all([api('/categorias'), api('/casal'), api('/formas-pagamento'), editando ? api(`/lancamentos/${id}`) : null])
      .then(([resCategorias, resCasa, resFormas, resLancamento]) => {
        setCategorias(resCategorias.categorias);
        setMembros(resCasa.casal.membros);
        setFormas(resFormas.formas);
        if (resLancamento) {
          const l = resLancamento.lancamento;
          setTipo(l.tipo);
          setValor(centavosParaTexto(l.valorCentavos));
          setData(l.data);
          setCategoriaId(l.categoria?.id ?? null);
          setFormaPagamentoId(l.formaPagamento?.id ?? null);
          if (l.tipo === 'FATURA') {
            // Pagamento de fatura se desfaz na tela do cartão
            navegar(`/cartoes/${l.formaPagamento?.id}?mes=${l.competencia}`, { replace: true });
            return;
          }
          if (l.grupoParcelas) setParcelaInfo({ parcela: l.parcela, totalParcelas: l.totalParcelas });
          setPagoPorId(l.pagoPor.id);
          setDescricao(l.descricao ?? '');
        }
      })
      .catch((e) => setErro(e.message))
      .finally(() => setCarregando(false));
  }, [id, editando, navegar]);

  // Volta para a tela anterior (ou para o Início, se abriu direto por um link).
  function voltar() {
    if (window.history.state?.idx > 0) navegar(-1);
    else navegar('/', { replace: true });
  }

  async function aoEnviar(evento) {
    evento.preventDefault();
    setErro('');
    const valorCentavos = textoParaCentavos(valor);
    if (!valorCentavos) {
      setErro('Valor inválido. Exemplos: 50 ou 120,90');
      return;
    }

    setEnviando(true);
    try {
      await api(editando ? `/lancamentos/${id}` : '/lancamentos', {
        metodo: editando ? 'PATCH' : 'POST',
        corpo: {
          tipo, valorCentavos, data, categoriaId, formaPagamentoId, pagoPorId, descricao,
          ...(!editando && noCartao && { parcelas: Number(parcelas) || 1 }),
        },
      });
      voltar();
    } catch (e) {
      setErro(e.message);
      setEnviando(false);
    }
  }

  async function apagar(todasParcelas = false) {
    const pergunta = todasParcelas
      ? `Apagar a compra inteira (as ${parcelaInfo.totalParcelas} parcelas)? Não dá para desfazer.`
      : 'Apagar este lançamento? Não dá para desfazer.';
    if (!window.confirm(pergunta)) return;
    setEnviando(true);
    try {
      await api(`/lancamentos/${id}${todasParcelas ? '?todasParcelas=1' : ''}`, { metodo: 'DELETE' });
      voltar();
    } catch (e) {
      setErro(e.message);
      setEnviando(false);
    }
  }

  // Cartão escolhido e em qual fatura a compra cai (só para mostrar; quem decide é a API)
  const formaEscolhida = formas.find((f) => f.id === formaPagamentoId);
  const noCartao = tipo === 'DESPESA' && cartaoConfigurado(formaEscolhida);
  let avisoFatura = '';
  if (noCartao) {
    const primeira = faturaDaCompra(data, formaEscolhida.diaFechamento, formaEscolhida.diaVencimento);
    const n = editando ? 1 : Math.max(1, Number(parcelas) || 1);
    const total = textoParaCentavos(valor);
    const nomeMes = (m) => nomeDoMes(m).toLowerCase();
    avisoFatura = n > 1
      ? `${n}x${total ? ` de ${formatarReais(Math.floor(total / n))}` : ''}, nas faturas de ${nomeMes(primeira)} a ${nomeMes(somarMeses(primeira, n - 1))}. `
      : `Vai para a fatura de ${nomeMes(primeira)}. `;
    avisoFatura += 'Não entra no "Saiu" agora: sai quando pagarem a fatura.';
  }

  if (carregando) return <main className="tela"><p className="vazio">Carregando…</p></main>;

  return (
    <main className="tela">
      <header className="cabecalho">
        <button type="button" className="botao-icone" aria-label="Voltar" onClick={voltar}>
          <ChevronLeft size={24} strokeWidth={1.75} />
        </button>
        <h1>{editando ? (parcelaInfo ? `Parcela ${parcelaInfo.parcela} de ${parcelaInfo.totalParcelas}` : 'Editar lançamento') : 'Lançar'}</h1>
      </header>

      <form className="formulario" onSubmit={aoEnviar}>
        {/* Saiu / Entrou (o guia prefere essas palavras a "despesa/receita") */}
        <div className="segmentado" role="radiogroup" aria-label="Tipo">
          <button type="button" role="radio" aria-checked={tipo === 'DESPESA'}
            className={tipo === 'DESPESA' ? 'ativo' : ''} onClick={() => setTipo('DESPESA')}>
            Saiu
          </button>
          <button type="button" role="radio" aria-checked={tipo === 'RECEITA'}
            className={tipo === 'RECEITA' ? 'ativo' : ''} onClick={() => setTipo('RECEITA')}>
            Entrou
          </button>
        </div>

        <label className="campo">
          {noCartao && !editando && Number(parcelas) > 1 ? 'Valor total da compra (R$)' : 'Valor (R$)'}
          {/* inputMode="decimal" abre o teclado numérico com vírgula no celular */}
          <input type="text" inputMode="decimal" required placeholder="0,00" autoFocus={!editando}
            className="campo-valor" value={valor} onChange={(e) => setValor(e.target.value)} />
        </label>

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
          rotulo={tipo === 'DESPESA' ? 'Forma de pagamento' : 'Recebido por'} />

        {/* Cartão de crédito: parcelas e em qual fatura cai */}
        {tipo === 'DESPESA' && formaEscolhida?.tipo === 'CREDITO' && (
          cartaoConfigurado(formaEscolhida) ? (
            <>
              {!editando && (
                <label className="campo">
                  <span>Parcelas <small>1 = à vista</small></span>
                  <input type="number" inputMode="numeric" min={1} max={48} value={parcelas}
                    onChange={(e) => setParcelas(e.target.value)} />
                </label>
              )}
              <p className="aviso">{avisoFatura}</p>
            </>
          ) : (
            <p className="aviso">
              Este cartão ainda não tem fechamento e vencimento. Cadastre em Casa → Formas de pagamento para a compra ir para a fatura.
            </p>
          )
        )}

        <label className="campo">
          <span>Descrição <small>Opcional</small></span>
          <input type="text" maxLength={120} placeholder="Ex.: feira da semana"
            value={descricao} onChange={(e) => setDescricao(e.target.value)} />
        </label>

        <label className="campo">
          Data
          <input type="date" required value={data} onChange={(e) => setData(e.target.value)} />
        </label>

        {membros.length > 1 && (
          <fieldset className="campo" style={{ border: 'none', padding: 0, margin: 0 }}>
            <legend style={{ marginBottom: 'var(--space-2)' }}>{tipo === 'DESPESA' ? 'Quem pagou' : 'Quem recebeu'}</legend>
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

        {/* Fica preso no fim da tela enquanto rola: o "Salvar" está sempre à mão */}
        <div className="rodape-fixo">
          <button type="submit" className="botao bloco" disabled={enviando}>
            {enviando ? 'Salvando…' : 'Salvar'}
          </button>
        </div>

        {editando && (
          <button type="button" className="botao-perigo" onClick={() => apagar(false)} disabled={enviando}>
            {parcelaInfo ? 'Apagar só esta parcela' : 'Apagar lançamento'}
          </button>
        )}
        {editando && parcelaInfo && (
          <button type="button" className="botao-perigo" onClick={() => apagar(true)} disabled={enviando}>
            Apagar a compra inteira ({parcelaInfo.totalParcelas} parcelas)
          </button>
        )}
      </form>
    </main>
  );
}
