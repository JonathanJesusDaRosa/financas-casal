// Ícones do app (biblioteca Lucide). No banco guardamos só o NOME (ex.: "carrinho");
// aqui cada nome vira um desenho. Para adicionar um ícone: importe e coloque na lista.
import {
  Baby, Car, Coffee, Dumbbell, Film, Fuel, Gem, Gift, GraduationCap, HeartPulse, House,
  Laptop, LifeBuoy, PawPrint, PiggyBank, Pill, Plane, Plug, Receipt, Shirt, ShoppingBag,
  ShoppingCart, Smartphone, Tag, Ticket, TreePalm, TrendingUp, Utensils, Wallet, Wifi, Wrench,
} from 'lucide-react';

export const ICONES = {
  carrinho: { componente: ShoppingCart, nome: 'Mercado' },
  carro: { componente: Car, nome: 'Carro' },
  combustivel: { componente: Fuel, nome: 'Combustível' },
  casa: { componente: House, nome: 'Casa' },
  conta: { componente: Receipt, nome: 'Conta' },
  energia: { componente: Plug, nome: 'Energia' },
  internet: { componente: Wifi, nome: 'Internet' },
  comida: { componente: Utensils, nome: 'Comida' },
  cafe: { componente: Coffee, nome: 'Café' },
  compras: { componente: ShoppingBag, nome: 'Compras' },
  roupa: { componente: Shirt, nome: 'Roupa' },
  lazer: { componente: Ticket, nome: 'Lazer' },
  filme: { componente: Film, nome: 'Filmes' },
  academia: { componente: Dumbbell, nome: 'Academia' },
  saude: { componente: HeartPulse, nome: 'Saúde' },
  remedio: { componente: Pill, nome: 'Remédio' },
  educacao: { componente: GraduationCap, nome: 'Educação' },
  bebe: { componente: Baby, nome: 'Bebê' },
  pet: { componente: PawPrint, nome: 'Pet' },
  celular: { componente: Smartphone, nome: 'Celular' },
  computador: { componente: Laptop, nome: 'Computador' },
  manutencao: { componente: Wrench, nome: 'Manutenção' },
  presente: { componente: Gift, nome: 'Presente' },
  salario: { componente: Wallet, nome: 'Salário' },
  investimento: { componente: TrendingUp, nome: 'Investimento' },
  aviao: { componente: Plane, nome: 'Viagem' },
  praia: { componente: TreePalm, nome: 'Praia' },
  anel: { componente: Gem, nome: 'Casamento' },
  reserva: { componente: LifeBuoy, nome: 'Reserva' },
  cofrinho: { componente: PiggyBank, nome: 'Cofrinho' },
  etiqueta: { componente: Tag, nome: 'Outros' },
};

// Ícones oferecidos em cada lugar
export const ICONES_CATEGORIA = [
  'carrinho', 'casa', 'carro', 'combustivel', 'conta', 'energia', 'internet', 'comida', 'cafe',
  'compras', 'roupa', 'lazer', 'filme', 'academia', 'saude', 'remedio', 'educacao', 'bebe', 'pet',
  'celular', 'manutencao', 'presente', 'salario', 'investimento', 'aviao', 'etiqueta',
];
export const ICONES_META = [
  'aviao', 'praia', 'casa', 'carro', 'anel', 'educacao', 'bebe', 'pet', 'presente', 'reserva',
  'computador', 'celular', 'cofrinho',
];
