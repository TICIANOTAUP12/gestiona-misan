import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { Cliente } from '../types';
import { CobroSheet } from '../components/CobroSheet';
import { CONFIG_INICIAL } from '../lib/config-defaults';
import { ConfigDialog } from '../components/ConfigDialog';
import { ClienteDialog } from '../components/ClienteDialog';
import { StatsPanel } from '../components/StatsPanel';
import * as api from '../services/api';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../components/ui/table';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../components/ui/card';
import {
  DollarSign,
  LogOut,
  Search,
  ArrowDownAZ,
  Upload,
  MessageCircle,
  AlertCircle,
  CheckCircle,
  Clock,
  Settings,
  UserPlus,
  Pencil,
  BarChart2,
  TrendingUp,
  Edit2,
  Check,
} from 'lucide-react';
import Papa from 'papaparse';
import { toast } from 'sonner';
import { supabase } from '../lib/supabase';

export default function Dashboard() {
  const [config, setConfig] = useState<api.Configuracion>(CONFIG_INICIAL);
  const [valorSistema, setValorSistema] = useState(CONFIG_INICIAL.valorSistema);
  const [valorSistemaUSD, setValorSistemaUSD] = useState(CONFIG_INICIAL.valorSistemaUSD);
  const [cotizacionUSD, setCotizacionUSD] = useState(CONFIG_INICIAL.cotizacionUSD);
  const [editandoCotizacion, setEditandoCotizacion] = useState(false);
  const [cotizacionInput, setCotizacionInput] = useState('');

  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [cargando, setCargando] = useState(true);
  const [clienteSeleccionado, setClienteSeleccionado] = useState<Cliente | null>(null);
  const [clienteEditar, setClienteEditar] = useState<Cliente | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [configOpen, setConfigOpen] = useState(false);
  const [clienteDialogOpen, setClienteDialogOpen] = useState(false);
  const [statsPanelOpen, setStatsPanelOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [ordenAZ, setOrdenAZ] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    cargarDatos();
  }, []);

  function aplicarConfig(configDB: api.Configuracion) {
    const cotiz = configDB.cotizacionUSD || CONFIG_INICIAL.cotizacionUSD;
    const valorARS = configDB.valorSistema || CONFIG_INICIAL.valorSistema;
    const usd = configDB.valorSistemaUSD || +(valorARS / cotiz).toFixed(4);
    const configCompleta: api.Configuracion = {
      ...configDB,
      valorSistema: valorARS,
      valorSistemaUSD: usd,
      cotizacionUSD: cotiz,
    };
    setConfig(configCompleta);
    setValorSistema(valorARS);
    setValorSistemaUSD(usd);
    setCotizacionUSD(cotiz);
    return configCompleta;
  }

  async function cargarDatos() {
    setCargando(true);
    try {
      const clientesDB = await api.obtenerClientes();
      const { clientes: actualizados, cambios } = aplicarCicloMensual(clientesDB);
      setClientes(actualizados);

      if (cambios && actualizados.length > 0) {
        const dia = new Date().getDate();
        const msg = dia <= 5 ? 'Estados actualizados: inicio de mes, todos al día'
          : dia <= 10 ? 'Estados actualizados: clientes con saldo marcados como pendientes'
          : 'Estados actualizados: clientes con saldo marcados como vencidos';
        toast.info(msg);
        await api.guardarClientesBatch(actualizados);
      }

      const configDB = await api.obtenerConfig();
      if (configDB) {
        aplicarConfig(configDB);
      } else {
        await api.guardarConfig(CONFIG_INICIAL);
        aplicarConfig(CONFIG_INICIAL);
      }
    } catch (error) {
      console.error('Error al cargar datos:', error);
      toast.error('Error al conectar con la base de datos');
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    if (!cargando && clientes.length > 0) {
      api.guardarClientesBatch(clientes).catch(err => {
        console.error('Error al guardar en Supabase:', err);
        toast.error('Error al guardar clientes en la base de datos');
      });
    }
  }, [clientes, cargando]);

  // Aplica el ciclo mensual de estados según el día del mes:
  // día 1-5 → al-dia | día 6-10 → pendiente | día 11+ → vencido
  // Solo afecta clientes con saldo > 0. Saldo = 0 siempre queda al-dia.
  function aplicarCicloMensual(lista: Cliente[]): { clientes: Cliente[]; cambios: boolean } {
    const dia = new Date().getDate();
    let cambios = false;

    const actualizados = lista.map(cliente => {
      const estadoEsperado: Cliente['estado'] =
        cliente.saldo <= 0 ? 'al-dia' :
        dia <= 5 ? 'al-dia' :
        dia <= 10 ? 'pendiente' :
        'vencido';

      if (estadoEsperado !== cliente.estado) {
        cambios = true;
        return { ...cliente, estado: estadoEsperado };
      }
      return cliente;
    });

    return { clientes: actualizados, cambios };
  }

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  const handleCotizacionGuardar = async () => {
    const nueva = parseFloat(cotizacionInput);
    if (!nueva || nueva <= 0) { setEditandoCotizacion(false); return; }
    const nuevoARS = valorSistemaUSD * nueva;
    setCotizacionUSD(nueva);
    setValorSistema(nuevoARS);
    setEditandoCotizacion(false);

    // Actualizar montos de clientes
    setClientes(prev => prev.map(c => {
      const montoAuto = c.cantidadSistemas * valorSistema;
      if (c.montoCuota === montoAuto || Math.abs(c.montoCuota - montoAuto) < 1) {
        return { ...c, montoCuota: c.cantidadSistemas * nuevoARS };
      }
      return c;
    }));

    try {
      const configActualizada: api.Configuracion = {
        ...config,
        valorSistema: nuevoARS,
        valorSistemaUSD,
        cotizacionUSD: nueva,
      };
      await api.guardarConfig(configActualizada);
      setConfig(configActualizada);
      toast.success(`Cotización actualizada: $${nueva.toLocaleString('es-AR')} ARS/USD`);
    } catch (e) {
      console.error('Error al guardar cotización:', e);
      toast.error('Error al guardar cotización en la base de datos');
    }
  };

  const handleValorSistemaChange = async (nuevoARS: number, nuevoUSD: number, nuevaCotiz: number) => {
    setValorSistema(nuevoARS);
    setValorSistemaUSD(nuevoUSD);
    setCotizacionUSD(nuevaCotiz);

    setClientes(prevClientes =>
      prevClientes.map(cliente => {
        const montoAutomatico = cliente.cantidadSistemas * valorSistema;
        if (Math.abs(cliente.montoCuota - montoAutomatico) < 1) {
          return { ...cliente, montoCuota: nuevoARS * cliente.cantidadSistemas };
        }
        return cliente;
      })
    );

    try {
      const configActualizada: api.Configuracion = {
        ...config,
        valorSistema: nuevoARS,
        valorSistemaUSD: nuevoUSD,
        cotizacionUSD: nuevaCotiz,
      };
      await api.guardarConfig(configActualizada);
      setConfig(configActualizada);
    } catch (error) {
      console.error('Error al guardar configuración:', error);
      toast.error('Error al guardar configuración en la base de datos');
    }
  };

  const handleConfigGuardada = (configActualizada: api.Configuracion) => {
    aplicarConfig(configActualizada);
  };

  const handleEliminarCliente = async (id: string) => {
    setClientes(prev => prev.filter(c => c.id !== id));
    try {
      await api.eliminarCliente(id);
      toast.success('Cliente eliminado');
    } catch (e) {
      console.error('Error al eliminar cliente:', e);
      toast.error('Error al eliminar cliente');
    }
  };

  const handleGuardarCliente = (cliente: Cliente) => {
    setClientes(prevClientes => {
      const existe = prevClientes.find(c => c.id === cliente.id);
      if (existe) {
        return prevClientes.map(c => c.id === cliente.id ? cliente : c);
      } else {
        return [...prevClientes, cliente];
      }
    });
    toast.success(clienteEditar ? 'Cliente actualizado' : 'Cliente agregado');
    setClienteEditar(null);
  };

  const handleActualizarCliente = (clienteActualizado: Cliente) => {
    setClientes(prevClientes =>
      prevClientes.map(c => c.id === clienteActualizado.id ? clienteActualizado : c)
    );
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    Papa.parse<any>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        try {
          const clientesCargados: Cliente[] = results.data.map((row: any, index: number) => {
            const cantidadSistemas = parseFloat(row.cantidadSistemas || row['Cantidad Sistemas'] || '1');
            return {
              id: row.id || String(index + 1),
              nombre: row.Cliente || row.nombre || '',
              telefono: row.telefono || row.Telefono || '',
              cantidadSistemas,
              montoCuota: valorSistema * cantidadSistemas,
              saldo: parseFloat(row.Saldo || row.saldo || '0'),
              metodoPago: row['M Pago'] || row.metodoPago || '',
              estado: (row.estado || (parseFloat(row.saldo || row.Saldo || '0') > 0 ? 'pendiente' : 'al-dia')) as any,
              mensajeVencimiento: row['Mensaje vencimiento'] || row.mensajeVencimiento || '',
              mensajePagoPendiente: row['Mensaje pago pendiente'] || row.mensajePagoPendiente || '',
              fechaVencimiento: row.fechaVencimiento || row.FechaVencimiento || '',
            };
          });
          setClientes(clientesCargados);
          toast.success(`Se cargaron ${clientesCargados.length} clientes correctamente`);
        } catch (error) {
          toast.error('Error al procesar el archivo CSV');
        }
      },
      error: () => toast.error('Error al leer el archivo'),
    });

    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const clientesFiltrados = clientes
    .filter(cliente =>
      cliente.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cliente.id.includes(searchTerm)
    )
    .sort((a, b) => ordenAZ ? a.nombre.localeCompare(b.nombre, 'es') : 0);

  const stats = {
    total: clientes.length,
    vencidos: clientes.filter(c => c.estado === 'vencido').length,
    pendientes: clientes.filter(c => c.estado === 'pendiente').length,
    totalSaldo: clientes.reduce((sum, c) => sum + c.saldo, 0),
  };

  const getEstadoBadge = (estado: Cliente['estado']) => {
    switch (estado) {
      case 'vencido':
        return <Badge variant="destructive" className="gap-1"><AlertCircle className="w-3 h-3" />Vencido</Badge>;
      case 'pendiente':
        return <Badge variant="default" className="gap-1"><Clock className="w-3 h-3" />Pendiente</Badge>;
      case 'al-dia':
        return <Badge variant="outline" className="gap-1"><CheckCircle className="w-3 h-3" />Al día</Badge>;
    }
  };

  const valorSistemaUSDDisplay = cotizacionUSD > 0 ? (valorSistema / cotizacionUSD).toFixed(2) : '0';
  const saldoTotalUSD = cotizacionUSD > 0 ? (stats.totalSaldo / cotizacionUSD).toFixed(2) : '0';

  const diaHoy = new Date().getDate();
  const faseCiclo = diaHoy <= 5 ? { label: 'Al día', color: 'text-green-700 bg-green-50 border-green-200', dot: 'bg-green-500' }
    : diaHoy <= 10 ? { label: 'Pendientes', color: 'text-amber-700 bg-amber-50 border-amber-200', dot: 'bg-amber-500' }
    : { label: 'Vencidos', color: 'text-red-700 bg-red-50 border-red-200', dot: 'bg-red-500' };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-10 shadow-sm">
        <div className="container mx-auto px-3 md:px-4 py-3 md:py-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 md:gap-3">
              <div className="w-9 h-9 md:w-10 md:h-10 bg-primary rounded-lg flex items-center justify-center">
                <DollarSign className="w-5 h-5 md:w-6 md:h-6 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-sm md:text-base font-semibold">Gestiona Cobros</h1>
                <p className="text-xs md:text-sm text-muted-foreground hidden sm:block">Panel de Control</p>
              </div>
            </div>

            {/* Indicador de fase del ciclo mensual */}
            <div className={`hidden sm:flex items-center gap-1.5 border rounded-lg px-2.5 py-1.5 text-xs font-medium ${faseCiclo.color}`}>
              <div className={`w-1.5 h-1.5 rounded-full ${faseCiclo.dot}`} />
              Día {diaHoy} · {faseCiclo.label}
            </div>

            {/* Cotización USD - inline editable */}
            <div className="flex items-center gap-1 bg-green-50 border border-green-200 rounded-lg px-3 py-1.5">
              <TrendingUp className="w-3.5 h-3.5 text-green-600 shrink-0" />
              <span className="text-xs text-green-700 font-medium hidden sm:block">USD</span>
              {editandoCotizacion ? (
                <div className="flex items-center gap-1">
                  <Input
                    type="number"
                    value={cotizacionInput}
                    onChange={(e) => setCotizacionInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleCotizacionGuardar(); if (e.key === 'Escape') setEditandoCotizacion(false); }}
                    className="h-6 w-24 text-xs border-green-300 focus:border-green-500"
                    autoFocus
                  />
                  <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-green-700" onClick={handleCotizacionGuardar}>
                    <Check className="w-3 h-3" />
                  </Button>
                </div>
              ) : (
                <button
                  onClick={() => { setCotizacionInput(cotizacionUSD.toString()); setEditandoCotizacion(true); }}
                  className="flex items-center gap-1 hover:opacity-70 transition-opacity"
                >
                  <span className="text-xs font-bold text-green-800">${cotizacionUSD.toLocaleString('es-AR')}</span>
                  <Edit2 className="w-2.5 h-2.5 text-green-600" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setStatsPanelOpen(true)} className="h-9">
                <BarChart2 className="w-4 h-4 md:mr-2" />
                <span className="hidden md:inline">Estadísticas</span>
              </Button>
              <Button variant="outline" size="sm" onClick={() => setConfigOpen(true)} className="h-9">
                <Settings className="w-4 h-4 md:mr-2" />
                <span className="hidden md:inline">Config</span>
              </Button>
              <Button variant="outline" size="sm" onClick={handleLogout} className="h-9">
                <LogOut className="w-4 h-4 md:mr-2" />
                <span className="hidden md:inline">Salir</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-3 md:px-4 py-4 md:py-8 space-y-4 md:space-y-6">
        {/* Estadísticas */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          <Card>
            <CardHeader className="pb-2 md:pb-3 px-3 md:px-6 pt-3 md:pt-6">
              <CardDescription className="text-xs md:text-sm">Total Clientes</CardDescription>
              <CardTitle className="text-2xl md:text-3xl">{stats.total}</CardTitle>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader className="pb-2 md:pb-3 px-3 md:px-6 pt-3 md:pt-6">
              <CardDescription className="text-xs md:text-sm">Vencidos</CardDescription>
              <CardTitle className="text-2xl md:text-3xl text-red-600">{stats.vencidos}</CardTitle>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader className="pb-2 md:pb-3 px-3 md:px-6 pt-3 md:pt-6">
              <CardDescription className="text-xs md:text-sm">Pendientes</CardDescription>
              <CardTitle className="text-2xl md:text-3xl text-amber-600">{stats.pendientes}</CardTitle>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader className="pb-2 md:pb-3 px-3 md:px-6 pt-3 md:pt-6">
              <CardDescription className="text-xs md:text-sm">Saldo Total</CardDescription>
              <CardTitle className="text-xl md:text-2xl">
                ${stats.totalSaldo.toLocaleString('es-AR')}
              </CardTitle>
              <p className="text-xs text-green-600 font-medium">≈ USD {saldoTotalUSD}</p>
            </CardHeader>
          </Card>
        </div>

        {/* Info del Valor por Sistema */}
        <Card className="border-2 border-primary/20 bg-primary/5">
          <CardContent className="p-4 md:p-6">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                  <Settings className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="font-semibold text-sm md:text-base">Valor por Sistema</p>
                  <p className="text-xs md:text-sm text-muted-foreground">
                    USD {valorSistemaUSDDisplay} × ${cotizacionUSD.toLocaleString('es-AR')}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="text-right">
                  <p className="text-2xl md:text-3xl font-bold text-primary">
                    ${valorSistema.toLocaleString('es-AR')}
                  </p>
                  <p className="text-xs text-green-600 font-medium">USD {valorSistemaUSDDisplay}</p>
                </div>
                <Button variant="outline" size="sm" onClick={() => setConfigOpen(true)} className="h-10">
                  <Settings className="w-4 h-4 md:mr-2" />
                  <span className="hidden md:inline">Configurar</span>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabla de Deudores */}
        <Card>
          <CardHeader className="px-3 md:px-6 py-3 md:py-6">
            <div className="flex flex-col gap-3 md:gap-4">
              <div>
                <CardTitle className="text-lg md:text-xl">Gestión de Clientes</CardTitle>
                <CardDescription className="text-xs md:text-sm">
                  Lista completa de clientes y sus deudas
                </CardDescription>
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar cliente..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9 h-11 md:h-10"
                  />
                </div>
                <Button
                  variant={ordenAZ ? 'default' : 'outline'}
                  onClick={() => setOrdenAZ(prev => !prev)}
                  className="h-11 md:h-10"
                  title="Ordenar A→Z"
                >
                  <ArrowDownAZ className="w-4 h-4 md:mr-2" />
                  <span className="hidden md:inline">A→Z</span>
                </Button>
                <Button onClick={() => { setClienteEditar(null); setClienteDialogOpen(true); }} className="h-11 md:h-10">
                  <UserPlus className="w-4 h-4 mr-2" />
                  Agregar Cliente
                </Button>
                <Button variant="outline" onClick={() => fileInputRef.current?.click()} className="h-11 md:h-10">
                  <Upload className="w-4 h-4 mr-2" />
                  <span className="hidden sm:inline">Cargar CSV</span>
                  <span className="sm:hidden">CSV</span>
                </Button>
                <input ref={fileInputRef} type="file" accept=".csv" onChange={handleFileUpload} className="hidden" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="px-0 md:px-6">
            {/* Vista móvil */}
            <div className="md:hidden space-y-3 px-3">
              {clientesFiltrados.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">No se encontraron clientes</div>
              ) : (
                clientesFiltrados.map((cliente) => (
                  <Card key={cliente.id} className="border-2">
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-base truncate">{cliente.nombre}</p>
                          <p className="text-xs text-muted-foreground">ID: {cliente.id}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button variant="ghost" size="sm" onClick={() => { setClienteEditar(cliente); setClienteDialogOpen(true); }} className="h-8 w-8 p-0">
                            <Pencil className="w-4 h-4" />
                          </Button>
                          {getEstadoBadge(cliente.estado)}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <p className="text-xs text-muted-foreground">Sistemas</p>
                          <p className="font-semibold text-primary text-lg">{cliente.cantidadSistemas}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Cuota Mensual</p>
                          <p className="font-medium">${cliente.montoCuota.toLocaleString('es-AR')}</p>
                          {cotizacionUSD > 0 && (
                            <p className="text-[10px] text-green-600">≈ USD {(cliente.montoCuota / cotizacionUSD).toFixed(2)}</p>
                          )}
                        </div>
                        <div className="col-span-2">
                          <p className="text-xs text-muted-foreground">Saldo Pendiente</p>
                          <p className={`font-semibold text-lg ${cliente.saldo > 0 ? 'text-red-600' : 'text-green-600'}`}>
                            ${cliente.saldo.toLocaleString('es-AR')}
                          </p>
                          {cotizacionUSD > 0 && cliente.saldo > 0 && (
                            <p className="text-xs text-red-400">≈ USD {(cliente.saldo / cotizacionUSD).toFixed(2)}</p>
                          )}
                        </div>
                      </div>

                      <Button
                        className="w-full h-12"
                        onClick={() => { setClienteSeleccionado(cliente); setSheetOpen(true); }}
                        disabled={false}
                      >
                        <MessageCircle className="w-5 h-5 mr-2" />
                        Gestionar Cobro
                      </Button>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>

            {/* Vista Desktop */}
            <div className="hidden md:block rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Sistemas</TableHead>
                    <TableHead>Monto Cuota</TableHead>
                    <TableHead>Saldo</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Acción</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {clientesFiltrados.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        No se encontraron clientes
                      </TableCell>
                    </TableRow>
                  ) : (
                    clientesFiltrados.map((cliente) => (
                      <TableRow key={cliente.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{cliente.nombre}</p>
                            <p className="text-sm text-muted-foreground">ID: {cliente.id}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <span className="font-semibold text-primary text-lg">{cliente.cantidadSistemas}</span>
                            <span className="text-xs text-muted-foreground">sist.</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">${cliente.montoCuota.toLocaleString('es-AR')}</p>
                            {cotizacionUSD > 0 && (
                              <p className="text-xs text-green-600">≈ USD {(cliente.montoCuota / cotizacionUSD).toFixed(2)}</p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <span className={cliente.saldo > 0 ? 'text-red-600 font-medium' : 'text-green-600'}>
                              ${cliente.saldo.toLocaleString('es-AR')}
                            </span>
                            {cotizacionUSD > 0 && cliente.saldo > 0 && (
                              <p className="text-xs text-red-400">≈ USD {(cliente.saldo / cotizacionUSD).toFixed(2)}</p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{getEstadoBadge(cliente.estado)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button variant="ghost" size="sm" onClick={() => { setClienteEditar(cliente); setClienteDialogOpen(true); }}>
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => { setClienteSeleccionado(cliente); setSheetOpen(true); }}
                              disabled={false}
                            >
                              <MessageCircle className="w-4 h-4 mr-2" />
                              Gestionar Cobro
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      <CobroSheet
        cliente={clienteSeleccionado}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        valorSistema={valorSistema}
        cotizacionUSD={cotizacionUSD}
        aliasCobranza={config.aliasCobranza}
        alias2Cobranza={config.alias2Cobranza}
        mensajeVencido={config.mensajeVencido}
        mensajePendiente={config.mensajePendiente}
        onActualizarCliente={handleActualizarCliente}
        onPagoRegistrado={() => {}}
      />

      <ConfigDialog
        open={configOpen}
        onOpenChange={setConfigOpen}
        config={config}
        valorSistema={valorSistema}
        valorSistemaUSD={valorSistemaUSD}
        cotizacionUSD={cotizacionUSD}
        onValorSistemaChange={handleValorSistemaChange}
        onConfigGuardada={handleConfigGuardada}
      />

      <ClienteDialog
        open={clienteDialogOpen}
        onOpenChange={setClienteDialogOpen}
        cliente={clienteEditar}
        onGuardar={handleGuardarCliente}
        onEliminar={handleEliminarCliente}
        valorSistema={valorSistema}
        cotizacionUSD={cotizacionUSD}
      />

      <StatsPanel
        open={statsPanelOpen}
        onOpenChange={setStatsPanelOpen}
        cotizacionUSD={cotizacionUSD}
        aliasCobranza={config.aliasCobranza}
        alias2Cobranza={config.alias2Cobranza}
      />
    </div>
  );
}
