// Gera os ícones do app (PNG em vários tamanhos) a partir do ícone "cheio" da marca.
// Rodar quando trocar o ícone: npm run icones
import { defineConfig, minimal2023Preset } from '@vite-pwa/assets-generator/config';

// O ícone já tem fundo índigo de ponta a ponta, então não precisa de margem
// (padding 0) e o fundo de preenchimento é o mesmo índigo.
const semMargem = { padding: 0, resizeOptions: { background: '#3D3A8C' } };

export default defineConfig({
  preset: {
    ...minimal2023Preset,
    maskable: { ...minimal2023Preset.maskable, ...semMargem },
    apple: { ...minimal2023Preset.apple, ...semMargem },
  },
  images: ['public/brand/casa-em-conta-app-icon-cheio.svg'],
});
