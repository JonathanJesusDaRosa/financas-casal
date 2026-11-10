// Exportar o extrato para planilha (CSV que o Excel em português abre direto).
//   - separador ";" e vírgula nos centavos (padrão brasileiro do Excel);
//   - começa com um "BOM" (o caractere U+FEFF) para o Excel entender os acentos (UTF-8);
//   - no celular abre o "Compartilhar" (salvar em Arquivos, mandar no WhatsApp...);
//     no computador, baixa o arquivo.
// Os valores saem SEMPRE reais, mesmo com o "olho" ocultando na tela.

const TIPOS = {
  RECEITA: 'Entrou',
  DESPESA: 'Saiu',
  GUARDADO: 'Guardado na meta',
  RESGATE: 'Resgate da meta',
  FATURA: 'Pagamento de fatura',
};

// 10050 -> "100,50" ; -10050 -> "-100,50"
const valorBR = (centavos) => (centavos / 100).toFixed(2).replace('.', ',');

// "2026-11-08" -> "08/11/2026"
const dataBR = (dia) => dia.split('-').reverse().join('/');

// Coloca aspas quando o texto tem ";", aspas ou quebra de linha (regra do CSV)
function celula(valor) {
  const texto = String(valor ?? '');
  return /[";\n\r]/.test(texto) ? `"${texto.replace(/"/g, '""')}"` : texto;
}

// Linhas da planilha a partir dos lançamentos do extrato
export function gerarCsv(lancamentos) {
  const cabecalho = ['Data', 'Tipo', 'Descrição', 'Categoria', 'Forma de pagamento', 'Quem', 'Parcela', 'Fatura', 'Valor (R$)'];
  const linhas = lancamentos.map((l) => {
    const noCartao = l.tipo === 'DESPESA' && l.faturaMes;
    const entra = l.tipo === 'RECEITA' || l.tipo === 'RESGATE';
    return [
      dataBR(l.data),
      noCartao ? 'Compra no cartão' : TIPOS[l.tipo] ?? l.tipo,
      l.descricao ?? (l.caixinha ? l.caixinha.nome : ''),
      l.categoria?.nome ?? '',
      l.formaPagamento?.nome ?? '',
      l.pagoPor?.nome ?? '',
      l.totalParcelas ? `${l.parcela}/${l.totalParcelas}` : '',
      l.faturaMes ? `${l.faturaMes.slice(5, 7)}/${l.faturaMes.slice(0, 4)}` : '',
      // Entradas positivas; o resto negativo (saídas, guardado, compras no cartão, faturas)
      valorBR(entra ? l.valorCentavos : -l.valorCentavos),
    ];
  });
  return '\uFEFF' + [cabecalho, ...linhas].map((linha) => linha.map(celula).join(';')).join('\r\n');
}

// Entrega o arquivo: compartilhar (celular) ou baixar (computador)
export async function salvarArquivo(conteudo, nomeArquivo) {
  const arquivo = new File([conteudo], nomeArquivo, { type: 'text/csv' });
  const celular = window.matchMedia('(pointer: coarse)').matches;

  if (celular && navigator.canShare?.({ files: [arquivo] })) {
    try {
      await navigator.share({ files: [arquivo], title: nomeArquivo });
      return;
    } catch (erro) {
      if (erro.name === 'AbortError') return; // a pessoa fechou o compartilhar
      // se der outro problema, cai no download abaixo
    }
  }

  const endereco = URL.createObjectURL(arquivo);
  const link = document.createElement('a');
  link.href = endereco;
  link.download = nomeArquivo;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(endereco), 1000);
}
