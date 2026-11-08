// Criar (/caixinhas/nova) ou editar (/caixinhas/42/editar) uma caixinha.
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../api.js';
import { centavosParaTexto, textoParaCentavos } from '../utils/dinheiro.js';

const ICONES = ['🏖️', '✈️', '🏠', '🚗', '💍', '🎓', '👶', '🐶', '🎁', '🛟', '💻', '💰'];

export default function FormCaixinha() {
  const { id } = useParams();
  const editando = Boolean(id);
  const navegar = useNavigate();

  const [investimentos, setInvestimentos] = useState([]);
  const [nome, setNome] = useState('');
  const [icone, setIcone] = useState('🏖️');
  const [valorAlvo, setValorAlvo] = useState('');
  const [prazo, setPrazo] = useState('');
  const [investimentoId, setInvestimentoId] = useState('');

  const [carregando, setCarregando] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState('');

  useEffect(() => {
    Promise.all([api('/investimentos'), editando ? api(`/caixinhas/${id}`) : null])
      .then(([resInv, resCaixinha]) => {
        setInvestimentos(resInv.investimentos);
        if (resCaixinha) {
          const c = resCaixinha.caixinha;
          setNome(c.nome);
          setIcone(c.icone ?? '');
          setValorAlvo(centavosParaTexto(c.valorAlvoCentavos));
          setPrazo(c.prazo ?? '');
          setInvestimentoId(c.investimento ? String(c.investimento.id) : '');
        }
      })
      .catch((e) => setErro(e.message))
      .finally(() => setCarregando(false));
  }, [id, editando]);

  async function aoEnviar(evento) {
    evento.preventDefault();
    setErro('');
    const valorAlvoCentavos = textoParaCentavos(valorAlvo);
    if (!valorAlvoCentavos) {
      setErro('Valor da meta inválido. Exemplo: 5.000');
      return;
    }

    const corpo = {
      nome,
      icone: icone || null,
      valorAlvoCentavos,
      prazo: prazo || null,
      investimentoId: investimentoId ? Number(investimentoId) : null,
    };

    setEnviando(true);
    try {
      const { caixinha } = await api(editando ? `/caixinhas/${id}` : '/caixinhas', {
        metodo: editando ? 'PATCH' : 'POST',
        corpo,
      });
      navegar(`/caixinhas/${caixinha.id}`, { replace: true });
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
        <h1>{editando ? 'Editar caixinha' : 'Nova caixinha'}</h1>
      </header>

      <form className="cartao formulario" onSubmit={aoEnviar}>
        <fieldset className="escolha-icone">
          <legend>Ícone</legend>
          {ICONES.map((i) => (
            <button key={i} type="button" className={i === icone ? 'ativo' : ''} aria-pressed={i === icone}
              onClick={() => setIcone(i)}>
              {i}
            </button>
          ))}
        </fieldset>

        <label>
          Nome do sonho
          <input type="text" required maxLength={40} placeholder="Ex.: Viagem para o Nordeste"
            value={nome} onChange={(e) => setNome(e.target.value)} />
        </label>

        <label>
          Quanto querem juntar? (R$)
          <input type="text" inputMode="decimal" required placeholder="5.000"
            className="campo-valor" value={valorAlvo} onChange={(e) => setValorAlvo(e.target.value)} />
        </label>

        <label>
          Até quando? <small>(opcional)</small>
          <input type="date" value={prazo} onChange={(e) => setPrazo(e.target.value)} />
        </label>

        <label>
          Onde o dinheiro fica aplicado? <small>(opcional)</small>
          <select value={investimentoId} onChange={(e) => setInvestimentoId(e.target.value)}>
            <option value="">Ainda não sei / nenhum</option>
            {investimentos.map((inv) => (
              <option key={inv.id} value={inv.id}>{inv.nome}</option>
            ))}
          </select>
        </label>
        {investimentos.length === 0 && (
          <p className="dica pequena">Dica: cadastre onde vocês investem na aba <strong>Investimentos</strong>.</p>
        )}

        {erro && <p className="erro" role="alert">{erro}</p>}

        <button type="submit" disabled={enviando}>{enviando ? 'Salvando…' : 'Salvar'}</button>
      </form>
    </main>
  );
}
