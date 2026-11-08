// Formulário de lançamento: criar (/lancamentos/novo, aberto pelo botão +)
// ou editar (/lancamentos/42), com o botão de apagar.
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { api } from '../api.js';
import { useAuth } from '../auth.jsx';
import Icone from '../components/Icone.jsx';
import { centavosParaTexto, textoParaCentavos } from '../utils/dinheiro.js';
import { hoje } from '../utils/datas.js';

export default function FormLancamento() {
  const { id } = useParams(); // undefined quando é um lançamento novo
  const editando = Boolean(id);
  const { usuario } = useAuth();
  const navegar = useNavigate();

  const [categorias, setCategorias] = useState([]);
  const [membros, setMembros] = useState([]);

  const [tipo, setTipo] = useState('DESPESA');
  const [valor, setValor] = useState('');
  const [data, setData] = useState(hoje());
  const [categoriaId, setCategoriaId] = useState(null);
  const [pagoPorId, setPagoPorId] = useState(usuario.id);
  const [descricao, setDescricao] = useState('');

  const [carregando, setCarregando] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState('');

  // Carrega categorias, membros e (se for edição) o lançamento, tudo ao mesmo tempo.
  useEffect(() => {
    Promise.all([api('/categorias'), api('/casal'), editando ? api(`/lancamentos/${id}`) : null])
      .then(([resCategorias, resCasa, resLancamento]) => {
        setCategorias(resCategorias.categorias);
        setMembros(resCasa.casal.membros);
        if (resLancamento) {
          const l = resLancamento.lancamento;
          setTipo(l.tipo);
          setValor(centavosParaTexto(l.valorCentavos));
          setData(l.data);
          setCategoriaId(l.categoria?.id ?? null);
          setPagoPorId(l.pagoPor.id);
          setDescricao(l.descricao ?? '');
        }
      })
      .catch((e) => setErro(e.message))
      .finally(() => setCarregando(false));
  }, [id, editando]);

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
        corpo: { tipo, valorCentavos, data, categoriaId, pagoPorId, descricao },
      });
      voltar();
    } catch (e) {
      setErro(e.message);
      setEnviando(false);
    }
  }

  async function apagar() {
    if (!window.confirm('Apagar este lançamento? Não dá para desfazer.')) return;
    setEnviando(true);
    try {
      await api(`/lancamentos/${id}`, { metodo: 'DELETE' });
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
        <h1>{editando ? 'Editar lançamento' : 'Lançar'}</h1>
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
          Valor (R$)
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

        <button type="submit" className="botao" disabled={enviando}>
          {enviando ? 'Salvando…' : 'Salvar'}
        </button>

        {editando && (
          <button type="button" className="botao-perigo" onClick={apagar} disabled={enviando}>
            Apagar lançamento
          </button>
        )}
      </form>
    </main>
  );
}
