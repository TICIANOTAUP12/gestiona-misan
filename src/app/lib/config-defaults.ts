import type { Configuracion } from '../services/api';

export const MENSAJE_VENCIDO_DEFAULT = `Hola, buen día {nombre}

Este es un mensaje programado para recordarte que hoy es la fecha de pago del sistema de gestión, correspondiente al mes {mes} = {saldo}.

Si querés transferir, hacelo por Mercado Pago a CVU: {alias}

Sistemas contratados: {sistemas}
Cuota mensual: {monto}

Por favor, confirmame cuando realices el pago. ¡Gracias!`;

export const MENSAJE_PENDIENTE_DEFAULT = MENSAJE_VENCIDO_DEFAULT;

export const CONFIG_INICIAL: Configuracion = {
  valorSistema: 12500,
  valorSistemaUSD: 10,
  cotizacionUSD: 1200,
  aliasCobranza: '',
  alias2Cobranza: '',
  mensajeVencido: MENSAJE_VENCIDO_DEFAULT,
  mensajePendiente: MENSAJE_PENDIENTE_DEFAULT,
};
