// Criar (/contas/nova) ou editar (/contas/42/editar) uma conta fixa.
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { api } from '../api.js';
import Icone from '../components/Icone.jsx';
import { centavosParaTexto, textoParaCentavos } from '../utils/dinheiro.js';

export default function FormContaFixa() {
  const { id } = useParams();
  const editando = Boolean(id);
  const navegar = useNavigate();

  const [categorias, setCategorias] = useState([]);
  const [nome, setNome] = useState('');
  const [tipo, setTipo] = useState('DESPESA');
  const [valor, setValor] = useState('');
  const [dia, setDia] = useState('');
  const [categoriaId, setCategoriaId] = useState(null);
  const [ativa, setAtiva] = useState(true);

  const [carregando, setCarregando] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState('');

  useEffect(() => {
    Promise.all([api('/categorias'), editando ? api(`/contas-fixas/${id}`) : null])
      .then(([resCat, resConta]) => {
        setCategorias(resCat.categorias);
        if (resConta) {
          const c = resConta.conta;
          setNome(c.nome);
          setTipo(c.tipo);
          setValor(centavosParaTexto(c.valorCentavos));
          setDia(String(c.diaVencimento));
          setCategoriaId(c.categoria?.id ?? null);
          setAtiva(c.ativa);
        }
      })
      .catch((e) => setErro(e.message))
      .finally(() => setCarregando(false));
  }, [id, editando]);

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
        corpo: { nome, tipo, valorCentavos, diaVencimento: Number(dia), categoriaId, ativa },
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
            Sai (conta a pagar)
          </button>
          <button type="button" role="radio" aria-checked={tipo === 'RECEITA'}
            className={tipo === 'RECEITA' ? 'ativo' : ''} onClick={() => setTipo('RECEITA')}>
            Entra (a receber)
          </button>
        </div>

        <label className="campo">
          Nome
          <input type="text" required maxLength={60} placeholder="Ex.: Internet"
            value={nome} onChange={(e) => setNome(e.target.value)} />
        </label>

        <div className="linha-campos">
          <label className="campo">
            <span>Valor (R$) <small>De costume</small></span>
            <input type="text" inputMode="decimal" required placeholder="0,00"
              value={valor} onChange={(e) => setValor(e.target.value)} />
          </label>
          <label className="campo">
            Dia do vencimento
            <input type="number" inputMode="numeric" required min={1} max={31} placeholder="10"
              value={dia} onChange={(e) => setDia(e.target.value)} />
          </label>
        </div>

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
          A conta aparece todo mês como "a pagar" e só vira lançamento quando vocês confirmam.
          Dia 31 em mês mais curto vale o último dia.
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
