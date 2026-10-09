export interface Producto {
  id: number;
  nombre: string;
  descripcion: string;
  categoria: string;
  precio: number;
  stock: number;
}

export type ProductoRequest = Omit<Producto, 'id'>;

export interface Cliente {
  id: number;
  usuarioOid: string | null;
  nombre: string;
  email: string;
  telefono: string | null;
  direccion: string | null;
  creadoEn?: string;
}

export interface PerfilRequest {
  nombre: string;
  email?: string | null;
  telefono?: string | null;
  direccion: string;
}

export type EstadoPedido = 'PENDIENTE' | 'CONFIRMADO' | 'EN_PREPARACION' | 'ENVIADO' | 'ENTREGADO' | 'CANCELADO';

export const ESTADOS_PEDIDO: EstadoPedido[] = [
  'PENDIENTE',
  'CONFIRMADO',
  'EN_PREPARACION',
  'ENVIADO',
  'ENTREGADO',
  'CANCELADO',
];

export interface PedidoItem {
  productoId: number;
  nombreProducto: string;
  cantidad: number;
  precioUnitario: number;
  subtotal: number;
}

export interface Pedido {
  id: number;
  clienteId: number;
  usuarioOid: string;
  estado: EstadoPedido;
  direccionEntrega: string | null;
  total: number;
  creadoEn: string;
  items: PedidoItem[];
}

export interface PedidoDetalle {
  pedido: Pedido;
  cliente: Cliente | null;
}

export interface CrearPedidoRequest {
  direccionEntrega?: string | null;
  items: { productoId: number; cantidad: number }[];
}

export interface Resumen {
  usuario: { oid: string; nombre: string; email: string; roles: string[]; scopes: string[] };
  perfilCompleto: boolean;
  cliente: Cliente | null;
  totalPedidos: number;
  pedidosPendientes: number;
  totalGastado: number;
  productosDisponibles: number;
  ultimosPedidos: Pedido[];
}

export interface ApiError {
  status: number;
  error: string;
  message: string;
  path: string;
}
