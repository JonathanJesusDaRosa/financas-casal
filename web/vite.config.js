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
        name: 'Casa em Conta',
        short_name: 'Casa em Conta',
        description: 'As contas da casa, em dia e sem briga.',
        lang: 'pt-BR',
        start_url: '/',
        display: 'standalone', // abre em tela cheia, sem a barra do navegador
        background_color: '#F8F7FC',
        theme_color: '#3D3A8C',
        icons: [
          { src: 'brand/pwa-64x64.png', sizes: '64x64', type: 'image/png' },
          { src: 'brand/pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'brand/pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'brand/maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },

      // Service worker: guarda os arquivos do app (HTML, JS, CSS, ícones) no
      // celular para abrir rápido. Os DADOS continuam vindo sempre da API.
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
        navigateFallback: '/index.html',
      },
    }),
  ],
});
