// Área logada. Por enquanto só dá as boas-vindas;
// os lançamentos, resumo e metas vão entrar aqui.
import { useAuth } from '../auth.jsx';

export default function Inicio() {
  const { usuario, sair } = useAuth();

  return (
    <main className="tela-inicio">
      <header className="topo">
        <h1>Finanças do Casal</h1>
        <button className="secundario" onClick={sair}>Sair</button>
      </header>

      <section className="cartao">
        <h2>Olá, {usuario.nome}!</h2>
        <p>Você está logado como <strong>{usuario.email}</strong>.</p>
        <p className="dica">Em breve: criar o espaço do casal e lançar gastos.</p>
      </section>
    </main>
  );
}
