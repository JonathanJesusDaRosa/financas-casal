// Tela "Como usar": manual do app, em seções que abrem ao tocar.
// <details>/<summary> é o "abre e fecha" nativo do HTML: acessível e sem JavaScript.
// IMPORTANTE: quando o app mudar, atualize o texto daqui também.
import { Link } from 'react-router-dom';
import {
  CalendarClock, ChevronLeft, CircleHelp, CreditCard, Eye, Gauge, House, List, Plus, Rocket, Tag, Target, TrendingUp,
} from 'lucide-react';

const SECOES = [
  {
    id: 'primeiros-passos',
    titulo: 'Primeiros passos',
    Icone: Rocket,
    conteudo: (
      <>
        <h3>Criar a conta e a casa</h3>
        <ol>
          <li>Cada pessoa cria a própria conta, com nome, e-mail e senha.</li>
          <li>A primeira pessoa toca em <strong>Criar casa</strong> e dá um nome (ex.: "Nossa casa").</li>
          <li>Em <strong>Casa</strong>, aparece um <strong>código de convite</strong> (ex.: K7M-4QX). Toque em <strong>Enviar pelo WhatsApp</strong>.</li>
          <li>A outra pessoa cria a conta, toca em <strong>Tenho um código</strong> e digita o código.</li>
        </ol>
        <p>O código vale 7 dias. Se vencer, toque em <strong>Gerar novo código</strong>. Tudo o que um lança, o outro vê.</p>

        <h3>Instalar no celular</h3>
        <ul>
          <li><strong>iPhone:</strong> abra o app no <strong>Safari</strong>, toque em Compartilhar e depois em <strong>Adicionar à Tela de Início</strong>.</li>
          <li><strong>Android:</strong> abra no <strong>Chrome</strong>, toque no menu (três pontos) e depois em <strong>Instalar app</strong>.</li>
        </ul>

        <h3>Usar no computador</h3>
        <p>Abra o mesmo endereço no navegador e entre com a mesma conta. No computador o app usa a tela toda, com o menu à esquerda: é o melhor lugar para analisar o mês. No celular, o foco é lançar no dia a dia.</p>
      </>
    ),
  },
  {
    id: 'lancar',
    titulo: 'Lançar gastos e receitas',
    Icone: Plus,
    conteudo: (
      <>
        <p>Toque no botão <strong>+</strong> (no centro da barra do celular, ou em <strong>Lançar</strong> no computador).</p>
        <ol>
          <li>Escolha <strong>Saiu</strong> (gasto) ou <strong>Entrou</strong> (receita).</li>
          <li>Digite o <strong>valor</strong>. Vale escrever 50, 120,90 ou 1.234,56.</li>
          <li>Toque numa <strong>categoria</strong> (ex.: Mercado). Tocar de novo desmarca.</li>
          <li>Se quiser, escolha a <strong>forma de pagamento</strong> (ex.: Pix, Nubank Crédito). No cartão de crédito, informe também as <strong>parcelas</strong> (1 = à vista).</li>
          <li>Se quiser, escreva uma <strong>descrição</strong> (ex.: "feira da semana").</li>
          <li>Confira a <strong>data</strong> (já vem com hoje) e <strong>quem pagou</strong>.</li>
          <li>Toque em <strong>Salvar</strong>.</li>
        </ol>
        <p><strong>Errou?</strong> Toque no lançamento (no Início ou no Extrato) para editar ou apagar.</p>
      </>
    ),
  },
  {
    id: 'inicio',
    titulo: 'Início: o resumo do mês',
    Icone: House,
    conteudo: (
      <>
        <ul>
          <li><strong>Saldo do mês</strong>: quanto entrou, menos o que saiu, menos o que foi guardado nas metas.</li>
          <li><strong>Entrou e Saiu</strong>: o dinheiro que entrou e saiu da conta no mês. Resgates de metas contam como entrada. Compras no cartão <strong>não</strong> contam no Saiu: o que conta é o pagamento da fatura.</li>
          <li><strong>Compras no cartão</strong>: quanto vocês compraram no crédito no mês (vai para as faturas).</li>
          <li><strong>Contas do mês</strong>: as próximas contas fixas a vencer e as atrasadas.</li>
          <li><strong>Gastos por categoria</strong>: as 3 maiores, contando também as compras no cartão pela data da compra. Toque em <strong>Ver todos</strong> para ver o resto.</li>
          <li><strong>Orçamento do mês</strong>: as categorias com limite e quanto ainda falta.</li>
          <li><strong>Por forma de pagamento</strong>: quanto saiu em cada forma (Pix, cada cartão...), com o total no crédito em destaque.</li>
          <li><strong>Evolução</strong>: entrou e saiu nos últimos 6 meses. Toque num mês para abrir o Início daquele mês. Em <strong>Ver em tabela</strong>, aparecem os números.</li>
          <li><strong>Últimos lançamentos</strong>: os 5 mais recentes.</li>
        </ul>
        <p>Para ver outro mês, toque no botão do mês (ex.: <strong>Novembro</strong>), no canto de cima.</p>
      </>
    ),
  },
  {
    id: 'extrato',
    titulo: 'Extrato',
    Icone: List,
    conteudo: (
      <>
        <p>Mostra <strong>todos os lançamentos do mês</strong>, agrupados por dia, com os totais de Entrou, Saiu, Guardado e Sobrou no topo.</p>
        <p>Toque num lançamento para editar ou apagar. Os movimentos de metas (guardado e resgate) abrem a meta.</p>
      </>
    ),
  },
  {
    id: 'contas-fixas',
    titulo: 'Contas fixas e vencimentos',
    Icone: CalendarClock,
    conteudo: (
      <>
        <p>Para o que se repete todo mês: aluguel, internet, luz, e também compras parceladas.</p>
        <h3>Dois tipos</h3>
        <ul>
          <li><strong>Sem fim</strong>: aparece todo mês até ser pausada ou apagada (internet, aluguel).</li>
          <li><strong>Com fim (parcelas)</strong>: aparece só nos meses das parcelas, como "Parcela 3 de 8", e some depois da última. Se digitar o <strong>valor total</strong> da compra, o app calcula a parcela, e dá para alterar.</li>
        </ul>
        <h3>Cadastrar</h3>
        <ol>
          <li>Vá em <strong>Casa → Contas fixas</strong> (no computador, em <strong>Contas</strong> no menu).</li>
          <li>Toque em <strong>Nova conta fixa</strong>.</li>
          <li>Escolha a duração, o valor, o <strong>dia do vencimento</strong>, o mês em que começa, a categoria e a forma de pagamento de costume.</li>
        </ol>
        <p><strong>Nada é retroativo</strong>: a conta só aparece a partir do mês em que começa, nunca nos meses anteriores. Comprou parcelado e já pagou algumas parcelas? Use <strong>Começa na parcela</strong> (ex.: 3) para seguir dali.</p>
        <h3>Valor que muda (ex.: conta de luz)</h3>
        <p>Cadastre um valor previsto (ex.: R$ 120). Quando a conta chegar, toque no <strong>lápis</strong> ao lado de "Pagar" e informe o valor real (ex.: R$ 102). Muda só aquele mês. Na hora de pagar, o valor já vem preenchido.</p>
        <h3>Pagar</h3>
        <ul>
          <li>A conta aparece como <strong>a pagar</strong> e, depois do vencimento, como <strong>atrasada</strong>.</li>
          <li>Toque em <strong>Pagar</strong>, confira o valor e a forma de pagamento e toque em <strong>Confirmar</strong>. A conta vira um lançamento.</li>
          <li><strong>Marcou sem querer?</strong> Toque na conta paga, que abre o lançamento, e apague. Ela volta para "a pagar".</li>
        </ul>
        <p>A conta <strong>não é lançada sozinha</strong>: só depois que alguém confirma. Para parar de vê-la sem apagar, edite e escolha <strong>Pausada</strong>. Vencimento no dia 31, em mês mais curto, vale o último dia.</p>
        <p><strong>Compra parcelada no cartão de crédito</strong>: lance pelo botão <strong>+</strong> com o número de parcelas (cada parcela vai para uma fatura). As contas fixas com parcelas ficam para <strong>boleto e carnê</strong>.</p>
        <p>Conta fixa paga no cartão (ex.: streaming): ao tocar em Pagar, ela vai para a fatura do cartão.</p>
      </>
    ),
  },
  {
    id: 'orcamento',
    titulo: 'Orçamento por categoria',
    Icone: Gauge,
    conteudo: (
      <>
        <ol>
          <li>Vá em <strong>Casa → Categorias</strong> e toque na categoria.</li>
          <li>Preencha <strong>Limite por mês</strong> (ex.: Mercado, 1.500) e salve.</li>
        </ol>
        <p>No Início, o card <strong>Orçamento do mês</strong> mostra quanto já saiu e quanto falta. A barra muda de cor a partir de 80% do limite e mostra quando passou do previsto. Para tirar o limite, apague o valor e salve.</p>
      </>
    ),
  },
  {
    id: 'metas',
    titulo: 'Metas (caixinhas para sonhos)',
    Icone: Target,
    conteudo: (
      <>
        <p>Uma meta é um sonho com valor e prazo, como "Viagem: R$ 5.000 até julho".</p>
        <ul>
          <li><strong>Criar:</strong> em Metas, toque em <strong>Nova</strong>. Escolha o ícone, o nome, o valor, o prazo (opcional) e onde o dinheiro fica aplicado.</li>
          <li><strong>Guardar:</strong> registra o dinheiro separado. Aparece no mês como "Guardado". Depois é só aplicar no banco.</li>
          <li><strong>Resgatar:</strong> tira dinheiro da meta. Conta como entrada no mês.</li>
          <li><strong>Atualizar saldo:</strong> digite o saldo que o banco mostra. A diferença vira <strong>rendimento</strong> (juros), que aparece só como informação e não muda o saldo do mês.</li>
        </ul>
        <p>Com prazo, o app calcula <strong>quanto guardar por mês</strong>. No histórico, o X desfaz um movimento lançado errado. Meta com saldo zero pode ser <strong>arquivada</strong> quando o sonho for realizado.</p>
      </>
    ),
  },
  {
    id: 'investimentos',
    titulo: 'Investimentos',
    Icone: TrendingUp,
    conteudo: (
      <>
        <p>Cadastre onde vocês aplicam (ex.: "CDB Nubank", "Tesouro Selic") e ligue cada meta a um deles, ao criar ou editar a meta.</p>
        <p>O total de cada investimento é a <strong>soma das metas ligadas a ele</strong>. Para incluir os juros, use <strong>Atualizar saldo</strong> em cada meta.</p>
      </>
    ),
  },
  {
    id: 'categorias',
    titulo: 'Categorias',
    Icone: Tag,
    conteudo: (
      <>
        <p>Em <strong>Casa → Categorias</strong>, toque em <strong>Nova</strong> para criar, ou numa categoria para mudar o nome, o ícone ou o limite.</p>
        <p>Ao apagar uma categoria, os lançamentos dela <strong>não somem</strong>: ficam como "Sem categoria".</p>
      </>
    ),
  },
  {
    id: 'formas',
    titulo: 'Formas de pagamento',
    Icone: CreditCard,
    conteudo: (
      <>
        <p>A casa já começa com Pix, Débito, Dinheiro e Boleto. Os <strong>cartões de crédito</strong> vocês cadastram em <strong>Casa → Formas de pagamento → Nova</strong> (ex.: "Nubank", tipo Crédito, com fechamento e vencimento). Dá também para renomear ou apagar.</p>
        <p>Escolha a forma ao lançar ou ao pagar uma conta fixa. No Início, o card <strong>Por forma de pagamento</strong> mostra quanto foi gasto em cada uma e o total no crédito.</p>
        <p>Ao apagar uma forma, os lançamentos <strong>não somem</strong>: ficam sem forma de pagamento. Cartão com compras em faturas não pode ser apagado (só renomeado).</p>

        <h3>Cartão de crédito e fatura</h3>
        <ol>
          <li>Em <strong>Casa → Formas de pagamento</strong>, abra o cartão e informe o <strong>dia em que a fatura fecha</strong> e o <strong>dia em que vence</strong>.</li>
          <li>Ao lançar no cartão, a compra <strong>vai para a fatura</strong> e não sai da conta na hora. O app mostra em qual fatura ela cai. Compra no dia do fechamento ou depois vai para a fatura seguinte.</li>
          <li>Parcelado: informe as parcelas e o <strong>valor total</strong>. Cada parcela vai para uma fatura.</li>
          <li>A fatura aparece em <strong>Contas</strong> como uma conta a pagar. Toque em <strong>Pagar fatura</strong> (sempre o valor inteiro). Só então o valor entra no Saiu do mês.</li>
          <li>Toque na fatura para ver as compras dela, as próximas faturas (com as parcelas) e para <strong>desfazer</strong> um pagamento marcado sem querer.</li>
        </ol>
        <p>Compras no crédito lançadas antes desta regra continuam como estavam (já contaram como saída).</p>
      </>
    ),
  },
  {
    id: 'privacidade',
    titulo: 'Ocultar valores e privacidade',
    Icone: Eye,
    conteudo: (
      <>
        <ul>
          <li>Toque no <strong>olho</strong>, no topo das telas, para trocar os valores por <strong>R$ ••••</strong>. Bom para usar o app perto de outras pessoas.</li>
          <li>A escolha fica salva <strong>só no seu aparelho</strong>: cada um decide no seu.</li>
          <li>Cada casa só vê os próprios dados. Para sair da conta, vá em <strong>Casa → Sair da conta</strong>.</li>
        </ul>
      </>
    ),
  },
  {
    id: 'duvidas',
    titulo: 'Dúvidas comuns',
    Icone: CircleHelp,
    conteudo: (
      <>
        <h3>O app não mostrou a novidade</h3>
        <p>Ele se atualiza sozinho em alguns segundos. Se não atualizar, feche o app de verdade (arrastando para cima na tela de apps abertos) e abra de novo.</p>
        <h3>Esqueci a senha</h3>
        <p>Ainda não dá para recuperar a senha pelo app. Guarde a senha num lugar seguro.</p>
        <h3>Os dados ficam no celular?</h3>
        <p>Não: ficam guardados no servidor. Por isso aparecem iguais no celular e no computador, e não se perdem se o celular trocar.</p>
        <h3>Como recomeçar do zero?</h3>
        <p>Em <strong>Casa → Apagar dados</strong>, toque em <strong>Apagar todos os lançamentos</strong> e digite o nome da casa para confirmar. Apaga todas as entradas, saídas, pagamentos e movimentos das metas. Cadastros (categorias, cartões, contas fixas, metas) continuam. <strong>Não tem volta.</strong></p>
        <h3>Posso lançar sem internet?</h3>
        <p>Ainda não. O app abre, mas para salvar e ver os dados é preciso estar conectado.</p>
      </>
    ),
  },
];

export default function Ajuda() {
  return (
    <main className="tela">
      <header className="cabecalho">
        <Link to="/casa" className="botao-icone" aria-label="Voltar para Casa">
          <ChevronLeft size={24} strokeWidth={1.75} />
        </Link>
        <h1>Como usar</h1>
      </header>

      <p className="muted" style={{ marginBottom: 'var(--space-4)' }}>
        Toque num assunto para ver como funciona.
      </p>

      <div className="ajuda">
        {SECOES.map(({ id, titulo, Icone, conteudo }) => (
          <details key={id} className="card ajuda-secao">
            <summary>
              <span className="item-icone"><Icone size={20} strokeWidth={1.75} aria-hidden="true" /></span>
              <span className="ajuda-titulo">{titulo}</span>
            </summary>
            <div className="ajuda-conteudo">{conteudo}</div>
          </details>
        ))}
      </div>
    </main>
  );
}
