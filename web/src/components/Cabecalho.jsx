// Topo das abas principais (como na referência): símbolo da marca, "Nossa casa"
// em letra pequena, o título da tela e, à direita, um espaço opcional
// (ex.: o seletor de mês ou o botão "Nova meta").
export default function Cabecalho({ titulo, children }) {
  return (
    <header className="cabecalho-casa">
      <img src="/brand/casa-em-conta-mark.svg" alt="" className="cabecalho-marca" />
      <div className="cabecalho-textos">
        <span className="caption muted">Nossa casa</span>
        <h1>{titulo}</h1>
      </div>
      {children && <div className="cabecalho-direita">{children}</div>}
    </header>
  );
}
