// Tipos de forma de pagamento: nome para mostrar e ícone.
import { Banknote, Barcode, CreditCard, QrCode, Wallet } from 'lucide-react';

export const TIPOS_FORMA = {
  PIX: { nome: 'Pix', Icone: QrCode },
  DEBITO: { nome: 'Débito', Icone: CreditCard },
  CREDITO: { nome: 'Crédito', Icone: CreditCard },
  DINHEIRO: { nome: 'Dinheiro', Icone: Banknote },
  BOLETO: { nome: 'Boleto', Icone: Barcode },
  OUTRO: { nome: 'Outro', Icone: Wallet },
};

export const ORDEM_TIPOS = ['PIX', 'DEBITO', 'CREDITO', 'DINHEIRO', 'BOLETO', 'OUTRO'];
