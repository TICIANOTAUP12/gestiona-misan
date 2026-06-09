import { useState, useEffect } from 'react';
import { PagoRegistrado } from '../types';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from './ui/sheet';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';
import { Button } from './ui/button';
import {
  BarChart2,
  ArrowRightLeft,
  TrendingUp,
  CheckCircle2,
  Banknote,
  Tag,
  Calendar,
  RefreshCw,
  Trash2,
} from 'lucide-react';
import * as api from '../services/api';
import { toast } from 'sonner';

interface StatsPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cotizacionUSD?: number;
  aliasCobranza?: string;
  alias2Cobranza?: string;
}

export function StatsPanel({
  open,
  onOpenChange,
  cotizacionUSD = 1200,
  aliasCobranza = '',
  alias2Cobranza = '',
}: StatsPanelProps) {
  const [pagos, setPagos] = useState<PagoRegistrado[]>([]);
  const [cargando, setCargando] = useState(false);
  const [borrandoId, setBorrandoId] = useState<string | null>(null);

  const alias1 = aliasCobranza;
  const alias2 = alias2Cobranza;

  useEffect(() => {
    if (open) {
      cargarPagos();
    }
  }, [open]);

  async function cargarPagos() {
    setCargando(true);
    try {
      const data = await api.obtenerPagos();
      setPagos(data);
    } catch (e) {
      toast.error('Error al cargar historial de pagos');
    } finally {
      setCargando(false);
    }
  }

  async function handleEliminarPago(id: string) {
    setBorrandoId(id);
    try {
      const ok = await api.eliminarPago(id);
      if (ok) {
        setPagos(prev => prev.filter(p => p.id !== id));
        toast.success('Pago eliminado');
      } else {
        toast.error('No se pudo eliminar el pago');
      }
    } catch {
      toast.error('Error al eliminar el pago');
    } finally {
      setBorrandoId(null);
    }
  }

  const totalGeneral = pagos.reduce((s, p) => s + p.monto, 0);

  const totalAlias1 = pagos
    .filter(p => p.alias === alias1)
    .reduce((s, p) => s + p.monto, 0);

  const totalAlias2 = pagos
    .filter(p => p.alias === alias2)
    .reduce((s, p) => s + p.monto, 0);

  const diferencia = Math.abs(totalAlias1 - totalAlias2);
  const aliasConMas = totalAlias1 > totalAlias2 ? (alias1 || 'Alias 1') : (alias2 || 'Alias 2');
  const aliasConMenos = totalAlias1 > totalAlias2 ? (alias2 || 'Alias 2') : (alias1 || 'Alias 1');
  const hayDesequilibrio = diferencia > 0 && alias1 && alias2;

  const pagosConDescuento = pagos.filter(p => p.descuento > 0);
  const totalDescuentos = pagosConDescuento.reduce((s, p) => s + (p.montoOriginal - p.monto), 0);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-lg w-full overflow-y-auto p-0">
        <div className="sticky top-0 bg-white z-10 border-b px-4 md:px-6 py-4">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2 text-lg">
              <BarChart2 className="w-5 h-5 text-primary" />
              Panel de Estadísticas
            </SheetTitle>
            <SheetDescription className="text-xs">
              Historial de pagos recibidos y balance entre alias
            </SheetDescription>
          </SheetHeader>
        </div>

        <div className="p-4 md:p-6 space-y-5">
          {/* Resumen general */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-xs text-green-700 mb-1 flex items-center gap-1">
                <TrendingUp className="w-3 h-3" /> Total cobrado
              </p>
              <p className="text-2xl font-bold text-green-800">
                ${totalGeneral.toLocaleString('es-AR')}
              </p>
              {cotizacionUSD > 0 && (
                <p className="text-xs text-green-600">≈ USD {(totalGeneral / cotizacionUSD).toFixed(2)}</p>
              )}
            </div>
            <div className="bg-slate-50 border rounded-lg p-4">
              <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> Pagos registrados
              </p>
              <p className="text-2xl font-bold">{pagos.length}</p>
              <p className="text-xs text-muted-foreground">{pagos.filter(p => p.tipo === 'total').length} totales, {pagos.filter(p => p.tipo === 'parcial').length} parciales</p>
            </div>
          </div>

          {totalDescuentos > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <p className="text-xs text-amber-700 mb-1 flex items-center gap-1">
                <Tag className="w-3 h-3" /> Total descontado
              </p>
              <p className="text-xl font-bold text-amber-800">
                ${totalDescuentos.toLocaleString('es-AR')}
              </p>
              <p className="text-xs text-amber-600">en {pagosConDescuento.length} pagos con descuento</p>
            </div>
          )}

          {/* Balance entre alias */}
          {alias1 && alias2 && (
            <>
              <Separator />
              <div className="space-y-3">
                <h3 className="font-semibold text-sm flex items-center gap-2">
                  <ArrowRightLeft className="w-4 h-4 text-primary" />
                  Balance entre Alias
                </h3>

                <div className="grid grid-cols-2 gap-3">
                  <div className="border rounded-lg p-4 space-y-1">
                    <p className="text-xs text-muted-foreground truncate">Alias 1</p>
                    <p className="text-xs font-mono text-primary truncate">{alias1}</p>
                    <p className="text-xl font-bold">${totalAlias1.toLocaleString('es-AR')}</p>
                    {cotizacionUSD > 0 && (
                      <p className="text-xs text-muted-foreground">≈ USD {(totalAlias1 / cotizacionUSD).toFixed(2)}</p>
                    )}
                  </div>
                  <div className="border rounded-lg p-4 space-y-1">
                    <p className="text-xs text-muted-foreground truncate">Alias 2</p>
                    <p className="text-xs font-mono text-primary truncate">{alias2}</p>
                    <p className="text-xl font-bold">${totalAlias2.toLocaleString('es-AR')}</p>
                    {cotizacionUSD > 0 && (
                      <p className="text-xs text-muted-foreground">≈ USD {(totalAlias2 / cotizacionUSD).toFixed(2)}</p>
                    )}
                  </div>
                </div>

                {/* Alias con más recaudación */}
                {(totalAlias1 > 0 || totalAlias2 > 0) && (
                  <div className="rounded-lg p-4 border bg-primary/5 border-primary/20">
                    <p className="text-xs text-muted-foreground mb-1">Alias con más recaudación</p>
                    <p className="text-base font-bold text-primary truncate">{aliasConMas}</p>
                    <p className="text-sm font-semibold text-foreground">
                      ${Math.max(totalAlias1, totalAlias2).toLocaleString('es-AR')}
                      {cotizacionUSD > 0 && (
                        <span className="text-xs font-normal text-muted-foreground ml-1">
                          ≈ USD {(Math.max(totalAlias1, totalAlias2) / cotizacionUSD).toFixed(2)}
                        </span>
                      )}
                    </p>
                  </div>
                )}

                {hayDesequilibrio && (
                  <div className={`rounded-lg p-4 border ${diferencia > 5000 ? 'bg-red-50 border-red-200' : 'bg-blue-50 border-blue-200'}`}>
                    <p className={`text-sm font-semibold ${diferencia > 5000 ? 'text-red-700' : 'text-blue-700'}`}>
                      {diferencia > 5000 ? '⚠️ Desequilibrio detectado' : 'ℹ️ Diferencia entre alias'}
                    </p>
                    <p className="text-sm mt-1 text-muted-foreground">
                      <span className="font-medium">{aliasConMas}</span> tiene{' '}
                      <span className="font-bold">${diferencia.toLocaleString('es-AR')}</span> más que{' '}
                      <span className="font-medium">{aliasConMenos}</span>.
                    </p>
                    {diferencia > 5000 && (
                      <p className="text-xs mt-2 text-red-600">
                        Para equilibrar, transferí ${Math.round(diferencia / 2).toLocaleString('es-AR')} de {aliasConMas} a {aliasConMenos}.
                      </p>
                    )}
                  </div>
                )}

                {!hayDesequilibrio && totalAlias1 === 0 && totalAlias2 === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-2">Sin pagos asignados a alias aún</p>
                )}

                {totalAlias1 === totalAlias2 && totalAlias1 > 0 && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-700">
                    ✓ Los dos alias están perfectamente equilibrados
                  </div>
                )}
              </div>
            </>
          )}

          <Separator />

          {/* Historial de pagos */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-sm flex items-center gap-2">
                <Banknote className="w-4 h-4 text-primary" />
                Historial de Pagos
              </h3>
              <Button variant="ghost" size="sm" onClick={cargarPagos} disabled={cargando}>
                <RefreshCw className={`w-3 h-3 ${cargando ? 'animate-spin' : ''}`} />
              </Button>
            </div>

            {cargando ? (
              <div className="text-center py-8 text-muted-foreground text-sm">Cargando...</div>
            ) : pagos.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                No hay pagos registrados aún
              </div>
            ) : (
              <div className="space-y-2">
                {pagos.map((pago) => (
                  <div key={pago.id} className="border rounded-lg p-3 space-y-1.5">
                    {/* Alias recibidor */}
                    {pago.alias ? (
                      <div className={`inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-medium w-fit ${
                        pago.alias === alias1
                          ? 'bg-blue-50 text-blue-700 border border-blue-200'
                          : pago.alias === alias2
                          ? 'bg-purple-50 text-purple-700 border border-purple-200'
                          : 'bg-slate-50 text-slate-600 border'
                      }`}>
                        <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                          pago.alias === alias1 ? 'bg-blue-500' : pago.alias === alias2 ? 'bg-purple-500' : 'bg-slate-400'
                        }`} />
                        {pago.alias === alias1 ? 'Alias 1' : pago.alias === alias2 ? 'Alias 2' : 'Alias'}
                        <span className="font-mono font-normal opacity-70 truncate max-w-[120px]">· {pago.alias}</span>
                      </div>
                    ) : (
                      <div className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs bg-slate-50 text-slate-400 border w-fit">
                        Sin alias registrado
                      </div>
                    )}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm">{pago.clienteNombre}</p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {new Date(pago.fecha).toLocaleDateString('es-AR', {
                            day: '2-digit', month: '2-digit', year: '2-digit',
                            hour: '2-digit', minute: '2-digit'
                          })}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="text-right">
                          <p className="font-bold text-green-700 text-sm">
                            ${pago.monto.toLocaleString('es-AR')}
                          </p>
                          {cotizacionUSD > 0 && (
                            <p className="text-xs text-muted-foreground">USD {(pago.monto / cotizacionUSD).toFixed(2)}</p>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10 shrink-0"
                          onClick={() => handleEliminarPago(pago.id)}
                          disabled={borrandoId === pago.id}
                        >
                          <Trash2 className={`w-3.5 h-3.5 ${borrandoId === pago.id ? 'animate-pulse' : ''}`} />
                        </Button>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant={pago.tipo === 'total' ? 'default' : 'outline'} className="text-xs">
                        {pago.tipo === 'total' ? 'Total' : 'Parcial'}
                      </Badge>
                      {pago.descuento > 0 && (
                        <Badge variant="secondary" className="text-xs gap-1">
                          <Tag className="w-2.5 h-2.5" />
                          {pago.descuento}% desc.
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
