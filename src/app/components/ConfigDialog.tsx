import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Separator } from './ui/separator';
import { Settings, Save, DollarSign } from 'lucide-react';
import { toast } from 'sonner';
import * as api from '../services/api';
import { MENSAJE_PENDIENTE_DEFAULT, MENSAJE_VENCIDO_DEFAULT } from '../lib/config-defaults';

interface ConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  config: api.Configuracion;
  valorSistema: number;
  valorSistemaUSD: number;
  cotizacionUSD: number;
  onValorSistemaChange: (valorARS: number, valorUSD: number, cotizacion: number) => void;
  onConfigGuardada: (config: api.Configuracion) => void;
}

export function ConfigDialog({
  open,
  onOpenChange,
  config,
  valorSistema,
  valorSistemaUSD,
  cotizacionUSD,
  onValorSistemaChange,
  onConfigGuardada,
}: ConfigDialogProps) {
  const [aliasCobranza, setAliasCobranza] = useState('');
  const [alias2Cobranza, setAlias2Cobranza] = useState('');
  const [mensajeVencido, setMensajeVencido] = useState('');
  const [mensajePendiente, setMensajePendiente] = useState('');
  const [localValorUSD, setLocalValorUSD] = useState(valorSistemaUSD);
  const [localCotizacion, setLocalCotizacion] = useState(cotizacionUSD);

  const arsCalculado = localValorUSD * localCotizacion;

  useEffect(() => {
    if (!open) return;
    setAliasCobranza(config.aliasCobranza);
    setAlias2Cobranza(config.alias2Cobranza);
    setMensajeVencido(config.mensajeVencido || MENSAJE_VENCIDO_DEFAULT);
    setMensajePendiente(config.mensajePendiente || MENSAJE_PENDIENTE_DEFAULT);
    setLocalValorUSD(valorSistemaUSD);
    setLocalCotizacion(cotizacionUSD);
  }, [open, config, valorSistemaUSD, cotizacionUSD]);

  const handleGuardar = async () => {
    const nuevoARS = localValorUSD * localCotizacion;
    if (nuevoARS !== valorSistema || localValorUSD !== valorSistemaUSD || localCotizacion !== cotizacionUSD) {
      onValorSistemaChange(nuevoARS, localValorUSD, localCotizacion);
    }

    const configActualizada: api.Configuracion = {
      valorSistema: nuevoARS,
      valorSistemaUSD: localValorUSD,
      cotizacionUSD: localCotizacion,
      aliasCobranza,
      alias2Cobranza,
      mensajeVencido,
      mensajePendiente,
    };

    const ok = await api.guardarConfig(configActualizada);
    if (!ok) {
      toast.error('Error al guardar en la base de datos');
      return;
    }

    onConfigGuardada(configActualizada);
    toast.success('Configuración guardada correctamente');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Configuración del Sistema
          </DialogTitle>
          <DialogDescription>
            Configura precios en USD, alias de cobranza y mensajes predeterminados
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-green-600" />
              <h3 className="font-semibold text-sm">Precio en Dólares</h3>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="valorUSD">Valor por Sistema (USD)</Label>
                <Input
                  id="valorUSD"
                  type="number"
                  step="0.5"
                  value={localValorUSD}
                  onChange={(e) => setLocalValorUSD(parseFloat(e.target.value) || 0)}
                  className="text-lg font-semibold"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cotizacion">Cotización (ARS/USD)</Label>
                <Input
                  id="cotizacion"
                  type="number"
                  step="10"
                  value={localCotizacion}
                  onChange={(e) => setLocalCotizacion(parseFloat(e.target.value) || 0)}
                  className="text-lg font-semibold"
                />
              </div>
            </div>

            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-xs text-green-700 mb-1">Cuota por sistema calculada</p>
              <p className="text-2xl font-bold text-green-800">
                ${arsCalculado.toLocaleString('es-AR')} ARS
              </p>
              <p className="text-sm text-green-600">
                USD {localValorUSD} × ${localCotizacion.toLocaleString('es-AR')}
              </p>
            </div>
          </div>

          <Separator />

          <div className="space-y-4">
            <h3 className="font-semibold text-sm">Alias/CVU para Cobros</h3>
            <div className="space-y-2">
              <Label htmlFor="alias">Alias 1 (principal)</Label>
              <Input
                id="alias"
                value={aliasCobranza}
                onChange={(e) => setAliasCobranza(e.target.value)}
                placeholder="Ej: GESTINA.COBROS o CVU: 0000..."
                className="font-mono"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="alias2">Alias 2 (secundario)</Label>
              <Input
                id="alias2"
                value={alias2Cobranza}
                onChange={(e) => setAlias2Cobranza(e.target.value)}
                placeholder="Ej: GESTINA.COBROS2 o CVU: 0000..."
                className="font-mono"
              />
              <p className="text-xs text-muted-foreground">
                Podés alternar entre ambos alias al registrar pagos para mantener el balance
              </p>
            </div>
          </div>

          <Separator />

          <div className="space-y-2">
            <Label htmlFor="mensajeVencido">Mensaje para Pagos Vencidos</Label>
            <Textarea
              id="mensajeVencido"
              value={mensajeVencido}
              onChange={(e) => setMensajeVencido(e.target.value)}
              rows={8}
              className="font-sans text-sm"
            />
            <div className="text-xs text-muted-foreground space-y-1">
              <p className="font-semibold">Variables disponibles:</p>
              <p>• {'{nombre}'} - Nombre del cliente</p>
              <p>• {'{mes}'} - Mes actual (Enero, Febrero, etc.)</p>
              <p>• {'{saldo}'} - Saldo adeudado</p>
              <p>• {'{monto}'} - Monto de cuota</p>
              <p>• {'{sistemas}'} - Cantidad de sistemas</p>
              <p>• {'{alias}'} - Alias/CVU de cobranza</p>
            </div>
          </div>

          <Separator />

          <div className="space-y-2">
            <Label htmlFor="mensajePendiente">Mensaje para Pagos Pendientes</Label>
            <Textarea
              id="mensajePendiente"
              value={mensajePendiente}
              onChange={(e) => setMensajePendiente(e.target.value)}
              rows={6}
              className="font-sans text-sm"
            />
            <p className="text-xs text-muted-foreground">
              Mismo sistema de variables: {'{nombre}'}, {'{mes}'}, {'{saldo}'}, {'{monto}'}, {'{sistemas}'}, {'{alias}'}
            </p>
          </div>

          <div className="flex gap-3 pt-4">
            <Button onClick={handleGuardar} className="flex-1">
              <Save className="w-4 h-4 mr-2" />
              Guardar Configuración
            </Button>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
