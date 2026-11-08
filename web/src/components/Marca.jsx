// Logo "Casa em Conta": o símbolo (SVG) + o nome escrito em texto.
// O nome é texto (e não o SVG completo) para mudar de cor no tema escuro.
export default function Marca({ tagline = true }) {
  return (
    <div className="marca">
      <img src="/brand/casa-em-conta-mark.svg" alt="" />
      <p className="nome">Casa <span>em</span> Conta</p>
      {tagline && <p className="muted">As contas da casa, em dia e sem briga.</p>}
    </div>
  );
}
