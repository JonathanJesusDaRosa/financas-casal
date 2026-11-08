// Gráfico "Evolução": barras de Entrou e Saiu nos últimos meses.
// Feito à mão em SVG (sem biblioteca), seguindo o guia de visualização:
//   - uma escala só (tudo em reais), barras finas com o topo arredondado (4px);
//   - Entrou sempre à esquerda e Saiu à direita (a posição ajuda quem tem daltonismo);
//   - legenda, detalhes ao passar o mouse/tocar e uma versão em tabela;
//   - cores pelos tokens --grafico-entrou / --grafico-saiu (validadas para daltonismo).
// Tocar num mês muda o mês do Início.
import { useEffect, useRef, useState } from 'react';
import { formatarReais, valoresOcultos } from '../utils/dinheiro.js';
import { nomeCurtoDoMes, nomeDoMes } from '../utils/datas.js';

const ALTURA_GRAFICO = 160; // área das barras
const ALTURA_ROTULOS = 24; // nomes dos meses embaixo
const MARGEM_ESQUERDA = 52; // valores do eixo
const LARGURA_MAX_BARRA = 18;
const ESPACO_ENTRE_BARRAS = 2;

// "R$ 12 mil" (valores redondos para o eixo)
const formatoCurto = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  notation: 'compact',
  maximumFractionDigits: 1,
});

// Arredonda o máximo para um número "bonito" e justo (ex.: R$ 11.800 -> R$ 15 mil),
// para as barras usarem bem a altura do gráfico.
function maximoBonito(valor) {
  if (valor <= 0) return 100000; // R$ 1.000 quando não há dados
  const potencia = 10 ** Math.floor(Math.log10(valor));
  const passo = [1, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10].find((p) => p * potencia >= valor);
  return passo * potencia;
}

// Valor sem o "R$" (a tabela põe o "R$" no cabeçalho, para caber no celular)
const semMoeda = (centavos) => formatarReais(centavos).replace('R$', '').trim();

// Barra com só o topo arredondado (a base fica reta, encostada no eixo)
function caminhoBarra(x, y, largura, altura) {
  const r = Math.min(4, altura, largura / 2);
  const base = y + altura;
  return `M${x},${base} L${x},${y + r} Q${x},${y} ${x + r},${y} L${x + largura - r},${y} Q${x + largura},${y} ${x + largura},${y + r} L${x + largura},${base} Z`;
}

export default function GraficoEvolucao({ meses, mesSelecionado, aoEscolherMes }) {
  const caixa = useRef(null);
  const [largura, setLargura] = useState(320);
  const [destaque, setDestaque] = useState(null); // índice do mês com detalhes abertos
  const [verTabela, setVerTabela] = useState(false);

  // Mede a largura disponível e redesenha quando a tela muda de tamanho.
  useEffect(() => {
    const observador = new ResizeObserver(([item]) => setLargura(Math.max(240, item.contentRect.width)));
    observador.observe(caixa.current);
    return () => observador.disconnect();
  }, []);

  const ocultos = valoresOcultos();
  const maximo = maximoBonito(Math.max(...meses.flatMap((m) => [m.entradas, m.saidas])));
  const larguraPlot = largura - MARGEM_ESQUERDA;
  const larguraGrupo = larguraPlot / meses.length;
  const larguraBarra = Math.min(LARGURA_MAX_BARRA, (larguraGrupo - 16 - ESPACO_ENTRE_BARRAS) / 2);
  const y = (valor) => ALTURA_GRAFICO - (valor / maximo) * ALTURA_GRAFICO;
  const linhasGuia = [0, maximo / 2, maximo];

  const mesDestaque = destaque !== null ? meses[destaque] : null;

  return (
    <div className="grafico-evolucao">
      {/* Legenda (sempre presente: são duas séries) */}
      <div className="legenda">
        <span><i style={{ background: 'var(--grafico-entrou)' }} /> Entrou</span>
        <span><i style={{ background: 'var(--grafico-saiu)' }} /> Saiu</span>
      </div>

      <div className="grafico-area" ref={caixa} onMouseLeave={() => setDestaque(null)}>
        <svg width={largura} height={ALTURA_GRAFICO + ALTURA_ROTULOS} role="img"
          aria-label={`Entrou e saiu nos últimos ${meses.length} meses. Use "Ver em tabela" para os valores.`}>
          {/* Linhas guia e valores do eixo (discretos) */}
          {linhasGuia.map((v) => (
            <g key={v}>
              <line x1={MARGEM_ESQUERDA} x2={largura} y1={y(v) + 0.5} y2={y(v) + 0.5} className="grafico-guia" />
              <text x={MARGEM_ESQUERDA - 8} y={y(v) + 4} textAnchor="end" className="grafico-eixo">
                {ocultos ? '••' : formatoCurto.format(v / 100)}
              </text>
            </g>
          ))}

          {meses.map((m, i) => {
            const x0 = MARGEM_ESQUERDA + i * larguraGrupo;
            const centro = x0 + larguraGrupo / 2;
            const xEntrou = centro - larguraBarra - ESPACO_ENTRE_BARRAS / 2;
            const xSaiu = centro + ESPACO_ENTRE_BARRAS / 2;
            const selecionado = m.mes === mesSelecionado;
            return (
              <g key={m.mes}>
                {/* Fundo do mês escolhido no Início */}
                {selecionado && (
                  <rect x={x0 + 2} y={0} width={larguraGrupo - 4} height={ALTURA_GRAFICO} rx={8} className="grafico-selecionado" />
                )}
                {m.entradas > 0 && (
                  <path d={caminhoBarra(xEntrou, y(m.entradas), larguraBarra, ALTURA_GRAFICO - y(m.entradas))} fill="var(--grafico-entrou)" />
                )}
                {m.saidas > 0 && (
                  <path d={caminhoBarra(xSaiu, y(m.saidas), larguraBarra, ALTURA_GRAFICO - y(m.saidas))} fill="var(--grafico-saiu)" />
                )}
                <text x={centro} y={ALTURA_GRAFICO + 17} textAnchor="middle"
                  className={`grafico-mes ${selecionado ? 'atual' : ''}`}>
                  {nomeCurtoDoMes(m.mes).slice(0, 3).toLowerCase()}
                </text>
                {/* Área de toque: a coluna inteira (maior que as barras) */}
                <rect x={x0} y={0} width={larguraGrupo} height={ALTURA_GRAFICO + ALTURA_ROTULOS} fill="transparent"
                  className="grafico-alvo" tabIndex={0} role="button"
                  aria-label={`${nomeDoMes(m.mes)}: entrou ${formatarReais(m.entradas)}, saiu ${formatarReais(m.saidas)}. Toque para ver este mês.`}
                  onMouseEnter={() => setDestaque(i)} onFocus={() => setDestaque(i)} onBlur={() => setDestaque(null)}
                  onClick={() => aoEscolherMes(m.mes)}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); aoEscolherMes(m.mes); } }} />
              </g>
            );
          })}

          {/* Eixo de base */}
          <line x1={MARGEM_ESQUERDA} x2={largura} y1={ALTURA_GRAFICO + 0.5} y2={ALTURA_GRAFICO + 0.5} className="grafico-base" />
        </svg>

        {/* Detalhes do mês (hover / foco) */}
        {mesDestaque && (
          <div className="grafico-dica" style={{
            left: Math.min(Math.max(MARGEM_ESQUERDA + (destaque + 0.5) * larguraGrupo - 80, 0), largura - 160),
          }}>
            <strong>{nomeDoMes(mesDestaque.mes)}</strong>
            <span><i style={{ background: 'var(--grafico-entrou)' }} /> Entrou <b>{formatarReais(mesDestaque.entradas)}</b></span>
            <span><i style={{ background: 'var(--grafico-saiu)' }} /> Saiu <b>{formatarReais(mesDestaque.saidas)}</b></span>
            <span className="muted">Sobrou <b>{mesDestaque.sobra < 0 ? '− ' : ''}{formatarReais(Math.abs(mesDestaque.sobra))}</b></span>
          </div>
        )}
      </div>

      <button type="button" className="link" onClick={() => setVerTabela(!verTabela)}>
        {verTabela ? 'Esconder tabela' : 'Ver em tabela'}
      </button>

      {verTabela && (
        <table className="tabela-evolucao">
          <thead>
            <tr><th>Mês</th><th>Entrou (R$)</th><th>Saiu (R$)</th><th>Sobrou (R$)</th></tr>
          </thead>
          <tbody>
            {[...meses].reverse().map((m) => (
              <tr key={m.mes}>
                <td>{nomeCurtoDoMes(m.mes).slice(0, 3).toLowerCase()}</td>
                <td className="entrada">{semMoeda(m.entradas)}</td>
                <td className="saida">{semMoeda(m.saidas)}</td>
                <td>{m.sobra < 0 ? '− ' : ''}{semMoeda(Math.abs(m.sobra))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
