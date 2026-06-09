import { useState, useEffect, useRef } from 'react';
import { Cliente } from '../types';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from './ui/sheet';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { Label } from './ui/label';
import { Input } from './ui/input';
import { Separator } from './ui/separator';
import { Badge } from './ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import { MessageCircle, User, CreditCard, DollarSign, Calendar, Layers, CheckCircle2, Banknote, Tag } from 'lucide-react';
import { toast } from 'sonner';
import * as api from '../services/api';

interface CobroSheetProps {
  cliente: Cliente | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  valorSistema?: number;
  cotizacionUSD?: number;
  aliasCobranza?: string;
  alias2Cobranza?: string;
  mensajeVencido?: string;
  mensajePendiente?: string;
  onActualizarCliente?: (cliente: Cliente) => void;
  onPagoRegistrado?: () => void;
}

export function CobroSheet({
  cliente,
  open,
  onOpenChange,
  valorSistema = 12500,
  cotizacionUSD = 1200,
  aliasCobranza = '',
  alias2Cobranza = '',
  mensajeVencido = '',
  mensajePendiente = '',
  onActualizarCliente,
  onPagoRegistrado,
}: CobroSheetProps) {
  const [mensaje, setMensaje] = useState('');
  const [montoPago, setMontoPago] = useState(0);
  const [estadoLocal, setEstadoLocal] = useState<Cliente['estado']>('pendiente');
  const [descuento, setDescuento] = useState(0);
  const [aliasSeleccionado, setAliasSeleccionado] = useState('');
  const isMountedRef = useRef(true);

  const alias1 = aliasCobranza;
  const alias2 = alias2Cobranza;

  const montoConDescuento = descuento > 0
    ? Math.round(montoPago * (1 - descuento / 100))
    : montoPago;

  useEffect(() => {
    isMountedRef.current = true;

    if (cliente && open) {
      setEstadoLocal(cliente.estado);
      setMontoPago(cliente.saldo > 0 ? cliente.saldo : cliente.montoCuota);
      setDescuento(0);
      setAliasSeleccionado(alias1 || alias2 || '');
    }

    return () => {
      isMountedRef.current = false;
    };
  }, [cliente, open, alias1, alias2]);

  // Regenerar mensaje cuando cambia el cliente o el estado local
  useEffect(() => {
    if (!cliente || !open || !isMountedRef.current) return;

    try {
      // Determinar el monto a mostrar en el mensaje
      const montoPendiente = cliente.saldo > 0 ? cliente.saldo : cliente.montoCuota;

      // Obtener mes actual en español
      const mesesEs = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
      const mesActual = mesesEs[new Date().getMonth()];

      let plantilla = '';

      if (estadoLocal === 'vencido') {
        plantilla = cliente.mensajeVencimiento || mensajeVencido || `Hola, buen día {nombre}

Este es un mensaje programado para recordarte que hoy es la fecha de pago del sistema de gestión, correspondiente al mes {mes} = {saldo}.

Si querés transferir, hacelo por Mercado Pago a CVU: {alias}

Sistemas contratados: {sistemas}
Cuota mensual: {monto}

Por favor, confirmame cuando realices el pago. ¡Gracias!`;
      } else {
        plantilla = cliente.mensajePagoPendiente || mensajePendiente || `Hola, buen día {nombre}

Este es un mensaje programado para recordarte que hoy es la fecha de pago del sistema de gestión, correspondiente al mes {mes} = {saldo}.

Si querés transferir, hacelo por Mercado Pago a CVU: {alias}

Sistemas contratados: {sistemas}
Cuota mensual: {monto}

Por favor, confirmame cuando realices el pago. ¡Gracias!`;
      }

      const mensajeFinal = plantilla
        .replace(/{nombre}/g, cliente.nombre || '')
        .replace(/{mes}/g, mesActual)
        .replace(/{saldo}/g, `$${montoPendiente.toLocaleString('es-AR')}`)
        .replace(/{monto}/g, `$${cliente.montoCuota.toLocaleString('es-AR')}`)
        .replace(/{sistemas}/g, cliente.cantidadSistemas.toString())
        .replace(/{alias}/g, alias1);

      if (isMountedRef.current) {
        setMensaje(mensajeFinal);
      }
    } catch (error) {
      console.error('Error al generar mensaje:', error);
    }
  }, [cliente, estadoLocal, open, mensajeVencido, mensajePendiente, alias1]);

  const handleRegistrarPago = async (tipo: 'total' | 'parcial') => {
    if (!cliente || !onActualizarCliente || !isMountedRef.current) return;

    // Si saldo = 0, el cliente está pagando la cuota del mes actual
    const montoPendiente = cliente.saldo > 0 ? cliente.saldo : cliente.montoCuota;
    const montoFinal = tipo === 'total' ? montoPendiente : montoConDescuento;

    // Calcular nuevo saldo
    let nuevoSaldo: number;
    if (cliente.saldo === 0) {
      // Estaba pagando la cuota del mes actual
      if (tipo === 'total' || montoFinal >= cliente.montoCuota) {
        nuevoSaldo = 0; // Pagó completamente la cuota del mes
      } else {
        nuevoSaldo = cliente.montoCuota - montoFinal; // Pago parcial de la cuota
      }
    } else {
      // Estaba pagando saldo acumulado
      nuevoSaldo = Math.max(0, cliente.saldo - montoFinal);
    }

    const nuevoEstado = nuevoSaldo === 0 ? 'al-dia' : estadoLocal;

    const clienteActualizado: Cliente = {
      ...cliente,
      saldo: nuevoSaldo,
      estado: nuevoEstado,
    };

    const pago = {
      id: `${Date.now()}-${cliente.id}`,
      clienteId: cliente.id,
      clienteNombre: cliente.nombre,
      monto: montoFinal,
      montoOriginal: tipo === 'total' ? montoPendiente : montoPago,
      descuento: tipo === 'total' ? 0 : descuento,
      fecha: new Date().toISOString(),
      alias: aliasSeleccionado,
      tipo,
      esCuotaMensual: cliente.saldo === 0,
    };

    try {
      const okCliente = await api.guardarCliente(clienteActualizado);
      if (!okCliente) {
        if (isMountedRef.current) toast.error('No se pudo guardar el cliente');
        return;
      }

      const okPago = await api.registrarPago(pago);
      if (!okPago) {
        if (isMountedRef.current) toast.error('No se pudo registrar el pago');
        return;
      }

      onActualizarCliente(clienteActualizado);
      onPagoRegistrado?.();

      if (isMountedRef.current) {
        if (tipo === 'total') {
          toast.success('Pago total registrado. Cliente al día.');
        } else {
          toast.success(`Pago de $${montoFinal.toLocaleString('es-AR')} registrado.`);
        }
        onOpenChange(false);
      }
    } catch (e) {
      console.error('Error al registrar pago:', e);
      if (isMountedRef.current) toast.error('No se pudo registrar el pago');
    }
  };

  const handleActualizarEstado = async () => {
    if (!cliente || !onActualizarCliente || !isMountedRef.current) return;
    try {
      const clienteActualizado = { ...cliente, estado: estadoLocal };
      onActualizarCliente(clienteActualizado);
      await api.guardarCliente(clienteActualizado);
      if (isMountedRef.current) {
        toast.success('Estado actualizado');
      }
    } catch (error) {
      console.error('Error al actualizar estado:', error);
      if (isMountedRef.current) {
        toast.error('Error al actualizar estado');
      }
    }
  };

  const handleEnviarWhatsApp = () => {
    if (!cliente) return;
    const url = `https://wa.me/${cliente.telefono}?text=${encodeURIComponent(mensaje)}`;
    window.open(url, '_blank');
  };

  if (!cliente) return null;

  const estadoBadge = {
    vencido: { variant: 'destructive' as const, label: 'Vencido' },
    pendiente: { variant: 'default' as const, label: 'Pendiente' },
    'al-dia': { variant: 'outline' as const, label: 'Al día' },
  };

  const saldoUSD = cotizacionUSD > 0 ? (cliente.saldo / cotizacionUSD).toFixed(2) : null;
  const cuotaUSD = cotizacionUSD > 0 ? (cliente.montoCuota / cotizacionUSD).toFixed(2) : null;

  const aliasOptions = [alias1, alias2].filter(Boolean);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-lg w-full overflow-y-auto p-0" data-testid="cobro-sheet">
        <div className="sticky top-0 bg-white z-10 border-b px-4 md:px-6 py-4">
          <SheetHeader>
            <SheetTitle className="text-lg md:text-xl">Gestionar Cobro</SheetTitle>
            <SheetDescription className="text-xs md:text-sm">
              Revisa el resumen y envía el recordatorio por WhatsApp
            </SheetDescription>
          </SheetHeader>
        </div>

        <div className="space-y-5 md:space-y-6 p-4 md:p-6 pb-safe">
          {/* Info del Cliente */}
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-12 h-12 md:w-10 md:h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <User className="w-6 h-6 md:w-5 md:h-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-semibold text-base md:text-sm">{cliente.nombre}</p>
                  <Badge variant={estadoBadge[cliente.estado].variant} className="text-xs">
                    {estadoBadge[cliente.estado].label}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">ID: {cliente.id}</p>
              </div>
            </div>

            <Separator />

            {/* Resumen de Deuda */}
            <div className="space-y-3">
              <h4 className="font-semibold text-sm">Resumen de Deuda</h4>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-primary/5 rounded-lg p-4 border border-primary/20">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1.5">
                    <Layers className="w-4 h-4" />
                    Cant. Sistemas
                  </div>
                  <p className="text-2xl md:text-xl font-bold text-primary">
                    {cliente.cantidadSistemas}
                  </p>
                </div>

                <div className="bg-slate-50 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1.5">
                    <DollarSign className="w-4 h-4" />
                    Cuota Mensual
                  </div>
                  <p className="text-xl md:text-lg font-semibold">
                    ${cliente.montoCuota.toLocaleString('es-AR')}
                  </p>
                  {cuotaUSD && (
                    <p className="text-xs text-green-600 font-medium">≈ USD {cuotaUSD}</p>
                  )}
                </div>
              </div>

              <div className={`rounded-lg p-4 ${cliente.saldo > 0 ? 'bg-red-50' : 'bg-amber-50'}`}>
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1.5">
                  <CreditCard className="w-4 h-4" />
                  {cliente.saldo > 0 ? 'Saldo Acumulado' : 'Cuota del Mes'}
                </div>
                <p
                  data-testid="cobro-saldo-pendiente"
                  className={`text-xl md:text-lg font-semibold ${cliente.saldo > 0 ? 'text-red-600' : 'text-amber-600'}`}
                >
                  ${cliente.saldo > 0 ? cliente.saldo.toLocaleString('es-AR') : cliente.montoCuota.toLocaleString('es-AR')}
                </p>
                {cliente.saldo > 0 ? (
                  saldoUSD && (
                    <p className="text-sm text-red-400 font-medium">≈ USD {saldoUSD}</p>
                  )
                ) : (
                  cuotaUSD && (
                    <p className="text-sm text-amber-600 font-medium">≈ USD {cuotaUSD}</p>
                  )
                )}
                {cliente.saldo === 0 && (
                  <p className="text-xs text-amber-700 mt-1">Sin deuda de meses anteriores</p>
                )}
              </div>

              {cliente.fechaVencimiento && cliente.estado !== 'al-dia' && (
                <div className="bg-amber-50 rounded-lg p-4 border border-amber-200">
                  <div className="flex items-center gap-2 text-xs text-amber-700 mb-1.5">
                    <Calendar className="w-4 h-4" />
                    Fecha de Vencimiento
                  </div>
                  <p className="text-sm font-medium text-amber-900">
                    {new Date(cliente.fechaVencimiento).toLocaleDateString('es-AR', {
                      day: '2-digit', month: '2-digit', year: 'numeric'
                    })}
                  </p>
                </div>
              )}

              {/* Alias de Pago */}
              {aliasOptions.length > 0 && (
                <div className="bg-blue-50 rounded-lg p-4 border border-blue-200 space-y-2">
                  <div className="flex items-center gap-2 text-xs text-blue-700">
                    <CreditCard className="w-4 h-4" />
                    Alias/CVU para Pago
                  </div>
                  {aliasOptions.map((a, i) => (
                    <p key={i} className="text-sm font-mono font-medium text-blue-900 break-all">
                      {i === 0 ? '1.' : '2.'} {a}
                    </p>
                  ))}
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* Gestión de Cobro */}
          <div className="space-y-4">
            <h4 className="font-semibold text-sm">Gestión de Cobro</h4>

            {/* Estado */}
            <div className="space-y-2">
              <Label htmlFor="estado">Estado del Cliente</Label>
              <div className="flex gap-2">
                <Select value={estadoLocal} onValueChange={(value: Cliente['estado']) => setEstadoLocal(value)}>
                  <SelectTrigger id="estado" className="flex-1" data-testid="cobro-select-estado">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="al-dia" data-testid="cobro-estado-al-dia">Al día</SelectItem>
                    <SelectItem value="pendiente" data-testid="cobro-estado-pendiente">Pendiente</SelectItem>
                    <SelectItem value="vencido" data-testid="cobro-estado-vencido">Vencido</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  onClick={handleActualizarEstado}
                  disabled={estadoLocal === cliente.estado}
                  data-testid="cobro-btn-actualizar-estado"
                >
                  Actualizar
                </Button>
              </div>
            </div>

            {/* Registrar Pago */}
            <div className="space-y-3">
              <Label>Registrar Pago</Label>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Monto</p>
                    <Input
                      type="number"
                      value={montoPago}
                      onChange={(e) => setMontoPago(parseFloat(e.target.value) || 0)}
                      placeholder="Monto cobrado"
                      className="text-base"
                      data-testid="cobro-input-monto"
                    />
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Tag className="w-3 h-3" /> Descuento (%)
                    </p>
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      value={descuento}
                      onChange={(e) => setDescuento(parseFloat(e.target.value) || 0)}
                      placeholder="0"
                      className="text-base"
                      data-testid="cobro-input-descuento"
                    />
                  </div>
                </div>

                {descuento > 0 && (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm">
                    <p className="text-amber-700">
                      Con {descuento}% descuento: <span className="font-bold text-amber-900">${montoConDescuento.toLocaleString('es-AR')}</span>
                      {cotizacionUSD > 0 && (
                        <span className="text-amber-600"> ≈ USD {(montoConDescuento / cotizacionUSD).toFixed(2)}</span>
                      )}
                    </p>
                  </div>
                )}

                {/* Seleccionar Alias — siempre visible */}
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground font-medium flex items-center gap-1">
                    <CreditCard className="w-3 h-3" /> ¿A qué alias pagó?
                  </p>
                  {aliasOptions.length > 0 && (
                    <div className="flex gap-2 flex-wrap">
                      {aliasOptions.map((a, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => setAliasSeleccionado(a)}
                          className={`flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-mono transition-colors ${
                            aliasSeleccionado === a
                              ? 'bg-primary text-primary-foreground border-primary'
                              : 'bg-background border-border hover:bg-muted'
                          }`}
                        >
                          <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${aliasSeleccionado === a ? 'bg-primary-foreground' : i === 0 ? 'bg-blue-500' : 'bg-purple-500'}`} />
                          {i === 0 ? 'Alias 1' : 'Alias 2'} · {a}
                        </button>
                      ))}
                    </div>
                  )}
                  <Input
                    value={aliasSeleccionado}
                    onChange={(e) => setAliasSeleccionado(e.target.value)}
                    placeholder="Alias / CVU / CBU del receptor"
                    className="text-sm font-mono"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant="outline"
                    onClick={() => handleRegistrarPago('parcial')}
                    disabled={montoPago <= 0}
                    className="w-full"
                    data-testid="cobro-btn-pago-parcial"
                  >
                    <Banknote className="w-4 h-4 mr-2" />
                    Pago Parcial
                  </Button>
                  <Button
                    variant="default"
                    onClick={() => handleRegistrarPago('total')}
                    className="w-full bg-green-600 hover:bg-green-700"
                    data-testid="cobro-btn-pago-total"
                  >
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    Pago Total
                  </Button>
                </div>

                <p className="text-xs text-muted-foreground">
                  {descuento > 0
                    ? `Pago parcial registra $${montoConDescuento.toLocaleString('es-AR')} (con ${descuento}% de descuento).`
                    : `Pago parcial descuenta $${montoPago.toLocaleString('es-AR')} del ${cliente.saldo > 0 ? 'saldo' : 'monto de la cuota'}.`}
                  {' '}Pago total marca como al día.
                </p>
              </div>
          </div>

          <Separator />

          {/* Mensaje WhatsApp */}
          <div className="space-y-3">
            <Label htmlFor="mensaje" className="text-base md:text-sm">Mensaje para WhatsApp</Label>
            <Textarea
              id="mensaje"
              value={mensaje}
              onChange={(e) => setMensaje(e.target.value)}
              rows={10}
              className="font-sans resize-none text-base min-h-[200px]"
              placeholder="Escribe el mensaje que se enviará por WhatsApp..."
            />
            <p className="text-xs text-muted-foreground">
              Edita el mensaje antes de enviarlo si es necesario
            </p>
          </div>

          {/* Botón de Envío */}
          <div className="sticky bottom-0 pt-4 pb-2 bg-white -mx-4 md:-mx-6 px-4 md:px-6 border-t">
            <Button
              onClick={handleEnviarWhatsApp}
              className="w-full h-14 md:h-12 text-base"
              size="lg"
              disabled={!mensaje.trim()}
              data-testid="cobro-btn-whatsapp"
            >
              <MessageCircle className="w-5 h-5 mr-2" />
              Enviar por WhatsApp
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
