import { Cliente, PagoRegistrado } from '../types';
import { supabase } from '../lib/supabase';

// ── Mappers DB (snake_case) ↔ App (camelCase) ───────────────

type ClienteRow = {
  id: string;
  nombre: string;
  telefono: string;
  cantidad_sistemas: number;
  monto_cuota: number;
  saldo: number;
  metodo_pago: string;
  estado: Cliente['estado'];
  mensaje_vencimiento: string | null;
  mensaje_pago_pendiente: string | null;
  fecha_vencimiento: string | null;
};

type PagoRow = {
  id: string;
  cliente_id: string;
  cliente_nombre: string;
  monto: number;
  monto_original: number;
  descuento: number;
  fecha: string;
  alias: string;
  tipo: PagoRegistrado['tipo'];
  es_cuota_mensual: boolean;
};

type ConfigRow = {
  valor_sistema: number;
  valor_sistema_usd: number;
  cotizacion_usd: number;
  alias_cobranza: string;
  alias2_cobranza: string;
  mensaje_vencido: string;
  mensaje_pendiente: string;
};

function rowToCliente(row: ClienteRow): Cliente {
  return {
    id: row.id,
    nombre: row.nombre,
    telefono: row.telefono,
    cantidadSistemas: Number(row.cantidad_sistemas),
    montoCuota: Number(row.monto_cuota),
    saldo: Number(row.saldo),
    metodoPago: row.metodo_pago,
    estado: row.estado,
    mensajeVencimiento: row.mensaje_vencimiento ?? undefined,
    mensajePagoPendiente: row.mensaje_pago_pendiente ?? undefined,
    fechaVencimiento: row.fecha_vencimiento ?? undefined,
  };
}

function clienteToRow(cliente: Cliente): ClienteRow {
  return {
    id: cliente.id,
    nombre: cliente.nombre,
    telefono: cliente.telefono,
    cantidad_sistemas: cliente.cantidadSistemas,
    monto_cuota: cliente.montoCuota,
    saldo: cliente.saldo,
    metodo_pago: cliente.metodoPago,
    estado: cliente.estado,
    mensaje_vencimiento: cliente.mensajeVencimiento ?? null,
    mensaje_pago_pendiente: cliente.mensajePagoPendiente ?? null,
    fecha_vencimiento: cliente.fechaVencimiento ?? null,
  };
}

function rowToPago(row: PagoRow): PagoRegistrado {
  return {
    id: row.id,
    clienteId: row.cliente_id,
    clienteNombre: row.cliente_nombre,
    monto: Number(row.monto),
    montoOriginal: Number(row.monto_original),
    descuento: Number(row.descuento),
    fecha: row.fecha,
    alias: row.alias,
    tipo: row.tipo,
    esCuotaMensual: row.es_cuota_mensual,
  };
}

function pagoToRow(pago: PagoRegistrado): PagoRow {
  return {
    id: pago.id,
    cliente_id: pago.clienteId,
    cliente_nombre: pago.clienteNombre,
    monto: pago.monto,
    monto_original: pago.montoOriginal,
    descuento: pago.descuento,
    fecha: pago.fecha,
    alias: pago.alias,
    tipo: pago.tipo,
    es_cuota_mensual: pago.esCuotaMensual ?? false,
  };
}

function rowToConfig(row: ConfigRow): Configuracion {
  return {
    valorSistema: Number(row.valor_sistema),
    valorSistemaUSD: Number(row.valor_sistema_usd),
    cotizacionUSD: Number(row.cotizacion_usd),
    aliasCobranza: row.alias_cobranza,
    alias2Cobranza: row.alias2_cobranza,
    mensajeVencido: row.mensaje_vencido,
    mensajePendiente: row.mensaje_pendiente,
  };
}

function configToRow(config: Configuracion): ConfigRow & { id: number } {
  return {
    id: 1,
    valor_sistema: config.valorSistema,
    valor_sistema_usd: config.valorSistemaUSD,
    cotizacion_usd: config.cotizacionUSD,
    alias_cobranza: config.aliasCobranza,
    alias2_cobranza: config.alias2Cobranza,
    mensaje_vencido: config.mensajeVencido,
    mensaje_pendiente: config.mensajePendiente,
  };
}

// ===== CLIENTES =====

export async function obtenerClientes(): Promise<Cliente[]> {
  const { data, error } = await supabase
    .from('clientes')
    .select('*')
    .order('nombre');

  if (error) {
    console.error('Error en obtenerClientes:', error.message);
    return [];
  }
  return (data as ClienteRow[]).map(rowToCliente);
}

export async function guardarCliente(cliente: Cliente): Promise<boolean> {
  const { error } = await supabase
    .from('clientes')
    .upsert(clienteToRow(cliente), { onConflict: 'id' });

  if (error) {
    console.error('Error en guardarCliente:', error.message);
    return false;
  }
  return true;
}

export async function guardarClientesBatch(clientes: Cliente[]): Promise<boolean> {
  if (clientes.length === 0) return true;

  const { error } = await supabase
    .from('clientes')
    .upsert(clientes.map(clienteToRow), { onConflict: 'id' });

  if (error) {
    console.error('Error en guardarClientesBatch:', error.message);
    return false;
  }
  return true;
}

export async function eliminarCliente(id: string): Promise<boolean> {
  const { error } = await supabase.from('clientes').delete().eq('id', id);

  if (error) {
    console.error('Error en eliminarCliente:', error.message);
    return false;
  }
  return true;
}

// ===== CONFIGURACIÓN =====

export interface Configuracion {
  valorSistema: number;
  valorSistemaUSD: number;
  cotizacionUSD: number;
  aliasCobranza: string;
  alias2Cobranza: string;
  mensajeVencido: string;
  mensajePendiente: string;
}

export async function obtenerConfig(): Promise<Configuracion | null> {
  const { data, error } = await supabase
    .from('configuracion')
    .select('*')
    .eq('id', 1)
    .maybeSingle();

  if (error) {
    console.error('Error en obtenerConfig:', error.message);
    return null;
  }
  if (!data) return null;
  return rowToConfig(data as ConfigRow);
}

export async function guardarConfig(config: Configuracion): Promise<boolean> {
  const { error } = await supabase
    .from('configuracion')
    .upsert(configToRow(config), { onConflict: 'id' });

  if (error) {
    console.error('Error en guardarConfig:', error.message);
    return false;
  }
  return true;
}

// ===== PAGOS =====

export async function obtenerPagos(): Promise<PagoRegistrado[]> {
  const { data, error } = await supabase
    .from('pagos')
    .select('*')
    .order('fecha', { ascending: false });

  if (error) {
    console.error('Error en obtenerPagos:', error.message);
    return [];
  }
  return (data as PagoRow[]).map(rowToPago);
}

export async function eliminarPago(id: string): Promise<boolean> {
  const { error } = await supabase.from('pagos').delete().eq('id', id);

  if (error) {
    console.error('Error en eliminarPago:', error.message);
    return false;
  }
  return true;
}

export async function registrarPago(pago: PagoRegistrado): Promise<boolean> {
  const { error } = await supabase
    .from('pagos')
    .upsert(pagoToRow(pago), { onConflict: 'id' });

  if (error) {
    console.error('Error en registrarPago:', error.message);
    return false;
  }
  return true;
}

export async function obtenerPagosCliente(clienteId: string): Promise<PagoRegistrado[]> {
  const { data, error } = await supabase
    .from('pagos')
    .select('*')
    .eq('cliente_id', clienteId)
    .order('fecha', { ascending: false });

  if (error) {
    console.error('Error en obtenerPagosCliente:', error.message);
    return [];
  }
  return (data as PagoRow[]).map(rowToPago);
}
