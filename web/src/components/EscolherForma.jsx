// Chips para escolher a forma de pagamento (opcional: tocar de novo desmarca).
// Usado ao lançar, ao pagar uma conta fixa e no cadastro da conta fixa.
// Os chips ficam numa linha só que rola para o lado (antes ocupavam até 4 linhas).
import { useEffect, useRef } from 'react';
import { TIPOS_FORMA } from '../utils/formas.js';

export default function EscolherForma({ formas, valor, aoMudar, rotulo = 'Forma de pagamento' }) {
  const linha = useRef(null);

  // Se já vem uma forma marcada (ex.: editando), rola a linha até ela aparecer.
  useEffect(() => {
    const ativo = linha.current?.querySelector('[aria-pressed="true"]');
    if (ativo) linha.current.scrollLeft = ativo.offsetLeft - linha.current.offsetLeft - 16;
  }, [valor, formas.length]);

  if (formas.length === 0) return null;
  return (
    <fieldset className="campo" style={{ border: 'none', padding: 0, margin: 0, minWidth: 0 }}>
      <legend style={{ marginBottom: 'var(--space-2)' }}>
        <span>{rotulo} <small>Opcional</small></span>
      </legend>
      <div className="chips chips-rolar" ref={linha}>
        {formas.map((f) => {
          const { Icone } = TIPOS_FORMA[f.tipo] ?? TIPOS_FORMA.OUTRO;
          const ativo = valor === f.id;
          return (
            <button key={f.id} type="button" aria-pressed={ativo} className={ativo ? 'ativo' : ''}
              onClick={() => aoMudar(ativo ? null : f.id)}>
              <Icone size={18} strokeWidth={1.75} aria-hidden="true" /> {f.nome}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
