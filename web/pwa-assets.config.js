// Gera os ícones do app (PNG em vários tamanhos) a partir de public/icon.svg.
// Rodar quando trocar o ícone: npm run icones
import { defineConfig, minimal2023Preset } from '@vite-pwa/assets-generator/config';

// O ícone já tem fundo verde de ponta a ponta, então não precisa de margem
// (padding 0) e o fundo de preenchimento é o mesmo verde.
const semMargem = { padding: 0, resizeOptions: { background: '#1f7a5a' } };

export default defineConfig({
  preset: {
    ...minimal2023Preset,
    maskable: { ...minimal2023Preset.maskable, ...semMargem },
    apple: { ...minimal2023Preset.apple, ...semMargem },
  },
  images: ['public/icon.svg'],
});
