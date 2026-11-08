// Formulário de lançamento. Serve para criar (/lancamentos/novo)
// e para editar (/lancamentos/42), com o botão de apagar.
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../auth.jsx';
import { centavosParaTexto, textoParaCentavos } from '../utils/dinheiro.js';
import { hoje } from '../utils/datas.js';

export default function FormLancamento() {
  const { id } = useParams(); // undefined quando é um lançamento novo
  const editando = Boolean(id);
  const { usuario } = useAuth();
  const navegar = useNavigate();

  // Opções dos selects
  const [categorias, setCategorias] = useState([]);
  const [membros, setMembros] = useState([]);

  // Campos do formulário
  const [tipo, setTipo] = useState('DESPESA');
  const [valor, setValor] = useState('');
  const [data, setData] = useState(hoje());
  const [categoriaId, setCategoriaId] = useState('');
  const [pagoPorId, setPagoPorId] = useState(String(usuario.id));
  const [descricao, setDescricao] = useState('');

  const [carregando, setCarregando] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState('');

  // Carrega categorias, membros e (se for edição) o lançamento, tudo ao mesmo tempo.
  useEffect(() => {
    Promise.all([
      api('/categorias'),
      api('/casal'),
      editando ? api(`/lancamentos/${id}`) : null,
    ])
      .then(([resCategorias, resCasal, resLancamento]) => {
        setCategorias(resCategorias.categorias);
        setMembros(resCasal.casal.membros);
        if (resLancamento) {
          const l = resLancamento.lancamento;
          setTipo(l.tipo);
          setValor(centavosParaTexto(l.valorCentavos));
          setData(l.data);
          setCategoriaId(l.categoria ? String(l.categoria.id) : '');
          setPagoPorId(String(l.pagoPor.id));
          setDescricao(l.descricao ?? '');
        }
      })
      .catch((e) => setErro(e.message))
      .finally(() => setCarregando(false));
  }, [id, editando]);

  // Volta para a lista, no mês do lançamento.
  function voltarParaLista(dataDoLancamento) {
    navegar(`/?mes=${dataDoLancamento.slice(0, 7)}`);
  }

  async function aoEnviar(evento) {
    evento.preventDefault();
    setErro('');

    const valorCentavos = textoParaCentavos(valor);
    if (!valorCentavos) {
      setErro('Valor inválido. Exemplos: 50 ou 120,90');
      return;
    }

    const corpo = {
      tipo,
      valorCentavos,
      data,
      categoriaId: categoriaId ? Number(categoriaId) : null,
      pagoPorId: Number(pagoPorId),
      descricao,
    };

    setEnviando(true);
    try {
      await api(editando ? `/lancamentos/${id}` : '/lancamentos', {
        metodo: editando ? 'PATCH' : 'POST',
        corpo,
      });
      voltarParaLista(data);
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
      voltarParaLista(data);
    } catch (e) {
      setErro(e.message);
      setEnviando(false);
    }
  }

  if (carregando) return <main className="pagina"><p className="dica">Carregando…</p></main>;

  return (
    <main className="pagina">
      <header className="topo">
        <button type="button" className="secundario" onClick={() => navegar(-1)}>‹ Voltar</button>
        <h1>{editando ? 'Editar lançamento' : 'Novo lançamento'}</h1>
      </header>

      <form className="cartao formulario" onSubmit={aoEnviar}>
        {/* Despesa / Receita */}
        <div className="abas" role="radiogroup" aria-label="Tipo">
          <button type="button" role="radio" aria-checked={tipo === 'DESPESA'}
            className={tipo === 'DESPESA' ? 'ativa' : ''} onClick={() => setTipo('DESPESA')}>
            Despesa
          </button>
          <button type="button" role="radio" aria-checked={tipo === 'RECEITA'}
            className={tipo === 'RECEITA' ? 'ativa' : ''} onClick={() => setTipo('RECEITA')}>
            Receita
          </button>
        </div>

        <label>
          Valor (R$)
          {/* inputMode="decimal" abre o teclado numérico com vírgula no celular */}
          <input type="text" inputMode="decimal" required placeholder="0,00" autoFocus={!editando}
            className="campo-valor" value={valor} onChange={(e) => setValor(e.target.value)} />
        </label>

        <label>
          Data
          <input type="date" required value={data} onChange={(e) => setData(e.target.value)} />
        </label>

        <label>
          Categoria
          <select value={categoriaId} onChange={(e) => setCategoriaId(e.target.value)}>
            <option value="">Sem categoria</option>
            {categorias.map((c) => (
              <option key={c.id} value={c.id}>{c.nome}</option>
            ))}
          </select>
        </label>

        <label>
          {tipo === 'DESPESA' ? 'Quem pagou' : 'Quem recebeu'}
          <select value={pagoPorId} onChange={(e) => setPagoPorId(e.target.value)}>
            {membros.map((m) => (
              <option key={m.id} value={m.id}>{m.id === usuario.id ? `${m.nome} (você)` : m.nome}</option>
            ))}
          </select>
        </label>

        <label>
          Descrição <small>(opcional)</small>
          <input type="text" maxLength={120} placeholder="Ex.: feira da semana"
            value={descricao} onChange={(e) => setDescricao(e.target.value)} />
        </label>

        {erro && <p className="erro" role="alert">{erro}</p>}

        <button type="submit" disabled={enviando}>
          {enviando ? 'Salvando…' : 'Salvar'}
        </button>

        {editando && (
          <button type="button" className="perigo" onClick={apagar} disabled={enviando}>
            Apagar lançamento
          </button>
        )}
      </form>
    </main>
  );
}
