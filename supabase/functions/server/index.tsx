/**
 * @deprecated Esta Edge Function ya no la usa el frontend.
 * Los datos ahora viven en tablas SQL (clientes, pagos, configuracion)
 * accedidas directamente vía Supabase JS + RLS + Auth.
 * Se mantiene por compatibilidad hasta confirmar que no hay consumidores externos.
 */
import { Hono } from 'npm:hono@4';
import { cors } from 'npm:hono/cors';
import { logger } from 'npm:hono/logger';
import * as kv from './kv_store.tsx';

const app = new Hono();

// Middleware
app.use('*', cors());
app.use('*', logger(console.log));

// Prefijo de rutas
const PREFIX = '/make-server-1bcc1131';

// ===== ENDPOINTS DE CLIENTES =====

// Obtener todos los clientes
app.get(`${PREFIX}/clientes`, async (c) => {
  try {
    const clientes = await kv.getByPrefix('cliente:');
    return c.json({ clientes });
  } catch (error) {
    console.error('Error al obtener clientes:', error);
    return c.json({ error: 'Error al obtener clientes' }, 500);
  }
});

// Obtener un cliente por ID
app.get(`${PREFIX}/clientes/:id`, async (c) => {
  try {
    const id = c.req.param('id');
    const cliente = await kv.get(`cliente:${id}`);

    if (!cliente) {
      return c.json({ error: 'Cliente no encontrado' }, 404);
    }

    return c.json({ cliente });
  } catch (error) {
    console.error('Error al obtener cliente:', error);
    return c.json({ error: 'Error al obtener cliente' }, 500);
  }
});

// Crear o actualizar un cliente
app.post(`${PREFIX}/clientes`, async (c) => {
  try {
    const cliente = await c.req.json();

    if (!cliente.id) {
      return c.json({ error: 'ID de cliente requerido' }, 400);
    }

    await kv.set(`cliente:${cliente.id}`, cliente);
    return c.json({ success: true, cliente });
  } catch (error) {
    console.error('Error al guardar cliente:', error);
    return c.json({ error: 'Error al guardar cliente: ' + error }, 500);
  }
});

// Actualizar múltiples clientes (usa set individual para evitar problemas con mset)
app.post(`${PREFIX}/clientes/batch`, async (c) => {
  try {
    const { clientes } = await c.req.json();

    if (!Array.isArray(clientes)) {
      return c.json({ error: 'Se esperaba un array de clientes' }, 400);
    }

    await Promise.all(
      clientes
        .filter((cliente: any) => cliente.id)
        .map((cliente: any) => kv.set(`cliente:${cliente.id}`, cliente))
    );
    return c.json({ success: true, count: clientes.length });
  } catch (error) {
    console.error('Error al guardar clientes:', error);
    return c.json({ error: 'Error al guardar clientes: ' + error }, 500);
  }
});

// Eliminar un cliente
app.delete(`${PREFIX}/clientes/:id`, async (c) => {
  try {
    const id = c.req.param('id');
    await kv.del(`cliente:${id}`);
    return c.json({ success: true });
  } catch (error) {
    console.error('Error al eliminar cliente:', error);
    return c.json({ error: 'Error al eliminar cliente' }, 500);
  }
});

// ===== ENDPOINTS DE CONFIGURACIÓN =====

// Obtener configuración
app.get(`${PREFIX}/config`, async (c) => {
  try {
    const config = await kv.get('config');
    return c.json({ config: config || {} });
  } catch (error) {
    console.error('Error al obtener configuración:', error);
    return c.json({ error: 'Error al obtener configuración' }, 500);
  }
});

// Guardar configuración
app.post(`${PREFIX}/config`, async (c) => {
  try {
    const config = await c.req.json();
    await kv.set('config', config);
    return c.json({ success: true, config });
  } catch (error) {
    console.error('Error al guardar configuración:', error);
    return c.json({ error: 'Error al guardar configuración: ' + error }, 500);
  }
});

// ===== ENDPOINTS DE PAGOS =====

// Obtener todos los pagos (con estructura mejorada: cada pago es una clave individual)
app.get(`${PREFIX}/pagos`, async (c) => {
  try {
    const pagos = await kv.getByPrefix('pago:');
    // Ordenar por fecha descendente (más recientes primero)
    const pagosOrdenados = pagos.sort((a: any, b: any) =>
      new Date(b.fecha).getTime() - new Date(a.fecha).getTime()
    );
    return c.json({ pagos: pagosOrdenados });
  } catch (error) {
    console.error('Error al obtener pagos:', error);
    return c.json({ error: 'Error al obtener pagos' }, 500);
  }
});

// Obtener pagos de un cliente específico
app.get(`${PREFIX}/pagos/cliente/:clienteId`, async (c) => {
  try {
    const clienteId = c.req.param('clienteId');
    const todosPagos = await kv.getByPrefix('pago:');
    const pagosCliente = todosPagos
      .filter((p: any) => p.clienteId === clienteId)
      .sort((a: any, b: any) =>
        new Date(b.fecha).getTime() - new Date(a.fecha).getTime()
      );
    return c.json({ pagos: pagosCliente });
  } catch (error) {
    console.error('Error al obtener pagos del cliente:', error);
    return c.json({ error: 'Error al obtener pagos del cliente' }, 500);
  }
});

// Agregar un pago al historial (estructura mejorada: clave individual por pago)
app.post(`${PREFIX}/pagos`, async (c) => {
  try {
    const pago = await c.req.json();

    if (!pago.id) {
      return c.json({ error: 'ID de pago requerido' }, 400);
    }

    // Guardar pago con clave individual
    await kv.set(`pago:${pago.id}`, pago);
    return c.json({ success: true, pago });
  } catch (error) {
    console.error('Error al guardar pago:', error);
    return c.json({ error: 'Error al guardar pago: ' + error }, 500);
  }
});

// Eliminar un pago del historial
app.delete(`${PREFIX}/pagos/:id`, async (c) => {
  try {
    const id = c.req.param('id');
    await kv.del(`pago:${id}`);
    return c.json({ success: true });
  } catch (error) {
    console.error('Error al eliminar pago:', error);
    return c.json({ error: 'Error al eliminar pago: ' + error }, 500);
  }
});

// Migrar pagos del array antiguo a claves individuales (ejecutar una sola vez)
app.post(`${PREFIX}/pagos/migrar`, async (c) => {
  try {
    const pagosArray = await kv.get('pagos');

    if (!pagosArray || !Array.isArray(pagosArray)) {
      return c.json({ success: true, message: 'No hay pagos para migrar', migrados: 0 });
    }

    // Guardar cada pago como clave individual
    await Promise.all(
      pagosArray.map((pago: any) => kv.set(`pago:${pago.id}`, pago))
    );

    // Eliminar el array viejo
    await kv.del('pagos');

    return c.json({
      success: true,
      message: 'Migración completada',
      migrados: pagosArray.length
    });
  } catch (error) {
    console.error('Error al migrar pagos:', error);
    return c.json({ error: 'Error al migrar pagos: ' + error }, 500);
  }
});

// Health check
app.get(`${PREFIX}/health`, (c) => {
  return c.json({ status: 'ok', timestamp: new Date().toISOString() });
});

Deno.serve(app.fetch);
