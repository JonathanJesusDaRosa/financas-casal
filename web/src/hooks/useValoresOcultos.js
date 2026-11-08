// Hook para as telas que mostram dinheiro.
// Chamando useValoresOcultos() no componente, ele é redesenhado sozinho quando
// alguém toca no "olho" (e o formatarReais passa a mostrar "R$ ••••").
//
// useSyncExternalStore é o jeito oficial do React de "escutar" um valor que mora
// fora dele (aqui, a variável "ocultar" em utils/dinheiro.js).
import { useSyncExternalStore } from 'react';
import { alternarValoresOcultos, aoMudarOcultar, valoresOcultos } from '../utils/dinheiro.js';

export function useValoresOcultos() {
  const ocultos = useSyncExternalStore(aoMudarOcultar, valoresOcultos);
  return [ocultos, alternarValoresOcultos];
}
