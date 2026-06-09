import { useState, useEffect } from 'react';
import { Cliente } from '../types';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import { UserPlus, Save, DollarSign, Trash2 } from 'lucide-react';

interface ClienteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cliente?: Cliente | null;
  onGuardar: (cliente: Cliente) => void;
  onEliminar?: (id: string) => void;
  valorSistema: number;
  cotizacionUSD?: number;
}

type ModoMonto = 'automatico' | 'fijo-ars' | 'fijo-usd';

export function ClienteDialog({
  open,
  onOpenChange,
  cliente,
  onGuardar,
  onEliminar,
  valorSistema,
  cotizacionUSD = 1200,
}: ClienteDialogProps) {
  const [formData, setFormData] = useState<Partial<Cliente>>({
    nombre: '',
    telefono: '',
    cantidadSistemas: 1,
    montoCuota: valorSistema,
    saldo: 0,
    estado: 'pendiente',
    metodoPago: '',
  });

  const [modoMonto, setModoMonto] = useState<ModoMonto>('automatico');
  const [montoUSD, setMontoUSD] = useState(0);

  useEffect(() => {
    if (cliente) {
      setFormData(cliente);
      const montoAuto = cliente.cantidadSistemas * valorSistema;
      if (Math.abs(cliente.montoCuota - montoAuto) < 1) {
        setModoMonto('automatico');
      } else {
        setModoMonto('fijo-ars');
      }
      setMontoUSD(cotizacionUSD > 0 ? +(cliente.montoCuota / cotizacionUSD).toFixed(2) : 0);
    } else {
      setFormData({
        nombre: '',
        telefono: '',
        cantidadSistemas: 1,
        montoCuota: valorSistema,
        saldo: 0,
        estado: 'pendiente',
        metodoPago: '',
      });
      setModoMonto('automatico');
      setMontoUSD(cotizacionUSD > 0 ? +(valorSistema / cotizacionUSD).toFixed(2) : 0);
    }
  }, [cliente, valorSistema, cotizacionUSD, open]);

  const handleCantidadChange = (cantidad: number) => {
    setFormData(prev => ({
      ...prev,
      cantidadSistemas: cantidad,
      montoCuota: modoMonto === 'automatico' ? cantidad * valorSistema : prev.montoCuota,
    }));
  };

  const handleMontoARSChange = (monto: number) => {
    setFormData(prev => ({ ...prev, montoCuota: monto }));
    setMontoUSD(cotizacionUSD > 0 ? +(monto / cotizacionUSD).toFixed(2) : 0);
  };

  const handleMontoUSDChange = (usd: number) => {
    setMontoUSD(usd);
    const ars = Math.round(usd * cotizacionUSD);
    setFormData(prev => ({ ...prev, montoCuota: ars }));
  };

  const handleModoChange = (modo: ModoMonto) => {
    setModoMonto(modo);
    if (modo === 'automatico') {
      const auto = (formData.cantidadSistemas || 1) * valorSistema;
      setFormData(prev => ({ ...prev, montoCuota: auto }));
      setMontoUSD(cotizacionUSD > 0 ? +(auto / cotizacionUSD).toFixed(2) : 0);
    }
  };

  const montoARS = formData.montoCuota || 0;
  const montoARSDisplay = modoMonto === 'fijo-usd'
    ? Math.round(montoUSD * cotizacionUSD)
    : montoARS;

  const handleGuardar = () => {
    if (!formData.nombre || !formData.telefono) {
      alert('Por favor completa nombre y teléfono');
      return;
    }

    const nuevoCliente: Cliente = {
      id: cliente?.id || Date.now().toString(),
      nombre: formData.nombre!,
      telefono: formData.telefono!,
      cantidadSistemas: formData.cantidadSistemas || 1,
      montoCuota: montoARSDisplay,
      saldo: formData.saldo || 0,
      estado: formData.estado as any || 'pendiente',
      metodoPago: formData.metodoPago || '',
    };

    onGuardar(nuevoCliente);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="w-5 h-5" />
            {cliente ? 'Editar Cliente' : 'Agregar Cliente'}
          </DialogTitle>
          <DialogDescription>
            {cliente ? 'Modifica los datos del cliente' : 'Completa los datos del nuevo cliente'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Nombre */}
          <div className="space-y-2">
            <Label htmlFor="nombre">Nombre *</Label>
            <Input
              id="nombre"
              value={formData.nombre}
              onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
              placeholder="Nombre del cliente"
            />
          </div>

          {/* Teléfono */}
          <div className="space-y-2">
            <Label htmlFor="telefono">Teléfono (con código país) *</Label>
            <Input
              id="telefono"
              value={formData.telefono}
              onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
              placeholder="549111234567"
              className="font-mono"
            />
            <p className="text-xs text-muted-foreground">
              Formato: 549 + código de área + número (sin 15)
            </p>
          </div>

          {/* Cantidad de Sistemas */}
          <div className="space-y-2">
            <Label htmlFor="sistemas">Cantidad de Sistemas</Label>
            <Input
              id="sistemas"
              type="number"
              min="1"
              value={formData.cantidadSistemas}
              onChange={(e) => handleCantidadChange(parseInt(e.target.value) || 1)}
            />
          </div>

          {/* Monto Cuota */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Monto Cuota</Label>
              <Select value={modoMonto} onValueChange={(v) => handleModoChange(v as ModoMonto)}>
                <SelectTrigger className="h-7 w-40 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="automatico">Automático</SelectItem>
                  <SelectItem value="fijo-ars">Fijo en $ ARS</SelectItem>
                  <SelectItem value="fijo-usd">Fijo en USD</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {modoMonto === 'automatico' && (
              <div className="bg-slate-50 border rounded-lg p-3">
                <p className="text-xl font-bold">${((formData.cantidadSistemas || 1) * valorSistema).toLocaleString('es-AR')}</p>
                <p className="text-xs text-muted-foreground">
                  {formData.cantidadSistemas} × ${valorSistema.toLocaleString('es-AR')}
                  {cotizacionUSD > 0 && (
                    <span className="text-green-600 ml-2">
                      ≈ USD {(((formData.cantidadSistemas || 1) * valorSistema) / cotizacionUSD).toFixed(2)}
                    </span>
                  )}
                </p>
              </div>
            )}

            {modoMonto === 'fijo-ars' && (
              <div className="space-y-2">
                <Input
                  type="number"
                  value={formData.montoCuota}
                  onChange={(e) => handleMontoARSChange(parseFloat(e.target.value) || 0)}
                  placeholder="Monto en pesos"
                />
                {cotizacionUSD > 0 && montoARS > 0 && (
                  <p className="text-xs text-green-600 font-medium">
                    ≈ USD {(montoARS / cotizacionUSD).toFixed(2)} (cotización ${cotizacionUSD.toLocaleString('es-AR')})
                  </p>
                )}
              </div>
            )}

            {modoMonto === 'fijo-usd' && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-green-600 shrink-0" />
                  <Input
                    type="number"
                    step="0.5"
                    value={montoUSD}
                    onChange={(e) => handleMontoUSDChange(parseFloat(e.target.value) || 0)}
                    placeholder="Monto en dólares"
                  />
                </div>
                <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                  <p className="text-lg font-bold text-green-800">
                    ${Math.round(montoUSD * cotizacionUSD).toLocaleString('es-AR')} ARS
                  </p>
                  <p className="text-xs text-green-600">
                    USD {montoUSD} × ${cotizacionUSD.toLocaleString('es-AR')} = ${Math.round(montoUSD * cotizacionUSD).toLocaleString('es-AR')}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Saldo */}
          <div className="space-y-2">
            <Label htmlFor="saldo">Saldo Actual ($)</Label>
            <Input
              id="saldo"
              type="number"
              value={formData.saldo}
              onChange={(e) => setFormData({ ...formData, saldo: parseFloat(e.target.value) || 0 })}
            />
          </div>

          {/* Estado */}
          <div className="space-y-2">
            <Label htmlFor="estado">Estado</Label>
            <Select
              value={formData.estado}
              onValueChange={(value: any) => setFormData({ ...formData, estado: value })}
            >
              <SelectTrigger id="estado">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="al-dia">Al día</SelectItem>
                <SelectItem value="pendiente">Pendiente</SelectItem>
                <SelectItem value="vencido">Vencido</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-3 pt-4">
            <Button onClick={handleGuardar} className="flex-1">
              <Save className="w-4 h-4 mr-2" />
              {cliente ? 'Guardar Cambios' : 'Agregar Cliente'}
            </Button>
            {cliente && onEliminar && (
              <Button
                variant="destructive"
                onClick={() => {
                  onEliminar(cliente.id);
                  onOpenChange(false);
                }}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            )}
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
