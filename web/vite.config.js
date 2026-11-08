import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),

    // Transforma o site em PWA: dá para "instalar" no celular como um app.
    VitePWA({
      // Quando sair uma versão nova, o app se atualiza sozinho na próxima abertura.
      registerType: 'autoUpdate',

      // O "manifesto": nome, ícones e cores que o celular usa ao instalar.
      manifest: {
        name: 'Finanças do Casal',
        short_name: 'Finanças',
        description: 'Organizem o dinheiro juntos: lançamentos, caixinhas e investimentos.',
        lang: 'pt-BR',
        start_url: '/',
        display: 'standalone', // abre em tela cheia, sem a barra do navegador
        background_color: '#f4f6f5',
        theme_color: '#1f7a5a',
        icons: [
          { src: 'pwa-64x64.png', sizes: '64x64', type: 'image/png' },
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },

      // Service worker: guarda os arquivos do app (HTML, JS, CSS, ícones) no
      // celular para abrir rápido. Os DADOS continuam vindo sempre da API.
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico}'],
        navigateFallback: '/index.html',
      },
    }),
  ],
});
