import 'dotenv/config'; // carrega as variáveis do arquivo .env
import app from './app.js';

// Para a API logo ao ligar se faltar alguma configuração essencial no .env.
for (const nome of ['DATABASE_URL', 'JWT_SECRET']) {
  if (!process.env[nome]) {
    console.error(`Falta a variável ${nome} no arquivo api/.env (veja o .env.example).`);
    process.exit(1);
  }
}

const PORT = process.env.PORT || 3333;

app.listen(PORT, () => {
  console.log(`API rodando em http://localhost:${PORT}`);
});
