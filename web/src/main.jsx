import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { registerSW } from 'virtual:pwa-register';
import { AuthProvider } from './auth.jsx';
import App from './App.jsx';
import './styles/tokens.css'; // cores, fonte e espaços do guia (DESIGN.md)
import './index.css';

// PWA: registra o service worker (a cópia do app guardada no celular).
// immediate: true = assim que uma versão nova for baixada, a página recarrega
// sozinha com ela (sem precisar fechar e abrir o app duas vezes).
// Também confere se há versão nova a cada 30 minutos com o app aberto.
registerSW({
  immediate: true,
  onRegisteredSW(_url, registro) {
    if (registro) setInterval(() => registro.update(), 30 * 60 * 1000);
  },
});

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {/* BrowserRouter: permite ter várias "páginas" (/login, /cadastro...) */}
    <BrowserRouter>
      {/* AuthProvider: deixa o usuário logado disponível para todas as telas */}
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
);
