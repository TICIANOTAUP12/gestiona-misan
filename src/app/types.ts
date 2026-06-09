export interface Cliente {
  id: string;
  nombre: string;
  telefono: string;
  cantidadSistemas: number; // Cantidad de sistemas que tiene el cliente
  montoCuota: number;
  saldo: number;
  metodoPago: string; // Alias/CVU
  estado: 'pendiente' | 'vencido' | 'al-dia';
  mensajeVencimiento?: string;
  mensajePagoPendiente?: string;
  fechaVencimiento?: string;
}

export interface PagoRegistrado {
  id: string;
  clienteId: string;
  clienteNombre: string;
  monto: number;
  montoOriginal: number;
  descuento: number; // percentage 0-100
  fecha: string;
  alias: string;
  tipo: 'total' | 'parcial';
  esCuotaMensual?: boolean; // true si era pago de cuota del mes (saldo=0), false si era pago de saldo acumulado
}

export interface User {
  username: string;
  role: string;
}
