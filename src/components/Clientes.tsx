import React, { useState, useEffect } from 'react';
import { 
  Filter, 
  List, 
  Map, 
  Plus, 
  Edit2, 
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  MessageSquare,
  Search,
  Check,
  X,
  FileText,
  Download,
  Trash2
} from 'lucide-react';
import { Client, UserIdentity } from '../types';
import { supabase } from '../lib/supabase';
import { notificarAcuerdoAprobado } from '../lib/brevo';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import logoImg from '../Assets/image.png';

const getArticlePrice = (articulo: any) => {
  if (!articulo) return 1000;
  const name = (articulo.nombre || '').toLowerCase();
  if (name.includes('zillertal')) return 1200;
  if (name.includes('stella')) return 1500;
  if (name.includes('corona')) return 1800;
  if (name.includes('patagonia')) return 2000;
  
  const calibre = (articulo.calibre?.nombre || '').toLowerCase();
  if (calibre.includes('1 litro')) return 2200;
  if (calibre.includes('450')) return 1400;
  if (calibre.includes('330')) return 1000;
  return 1200;
};

const getAporteDisplayName = (ap: any) => {
  if (ap.articulo) {
    return ap.articulo.nombre;
  }
  const parts: string[] = [];
  if (ap.marca?.nombre) parts.push(ap.marca.nombre);
  if (ap.linea?.nombre) parts.push(ap.linea.nombre);
  if (ap.calibre?.nombre) parts.push(ap.calibre.nombre);
  return parts.join(' · ') || 'Combinación a medida';
};

const getAporteDisplayCode = (ap: any) => {
  return ap.articulo?.codigo || ap.codigo_interno || '-';
};

interface ClientesProps {
  identity?: UserIdentity;
}

export default function Clientes({ identity }: ClientesProps) {
  const [viewMode, setViewMode] = useState<'lista' | 'mapa'>('lista');
  const [searchQuery, setSearchQuery] = useState('');
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [logoBase64, setLogoBase64] = useState<string | null>(null);

  // Advanced Filters State
  const [filterVencimiento, setFilterVencimiento] = useState<string[]>([]);
  const [filterEstado, setFilterEstado] = useState<string>('Todos');
  const [filterTipo, setFilterTipo] = useState<string>('Todos');
  const [filterStartDateFrom, setFilterStartDateFrom] = useState<string>('');
  const [filterStartDateTo, setFilterStartDateTo] = useState<string>('');

  // Add Client Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [newClientName, setNewClientName] = useState('');
  const [newClientCode, setNewClientCode] = useState('');
  const [newClientEmail, setNewClientEmail] = useState('');
  const [addingClient, setAddingClient] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  useEffect(() => {
    fetchClients();
    preloadLogo();
  }, []);

  const preloadLogo = () => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0);
        try {
          const dataURL = canvas.toDataURL('image/png');
          setLogoBase64(dataURL);
        } catch (e) {
          console.error('Error generating base64 from logo in Clientes:', e);
        }
      }
    };
    img.src = logoImg;
  };

  const fetchClients = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const { data, error } = await supabase
        .from('clientes')
        .select('*, contratos(*, contrato_aportes(*, articulo:articulos(*), marca:marcas(*), calibre:calibres(*), linea:lineas(*)), contrato_descuentos(*, articulo:articulos(*), marca:marcas(*), calibre:calibres(*), linea:lineas(*)))')
        .order('nombre');
      
      if (error) throw error;
      setClients(data || []);
    } catch (err: any) {
      console.error('Error fetching clients:', err);
      setErrorMsg(err.message || 'Error al cargar clientes de Supabase.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClientName || !newClientCode) return;
    setAddingClient(true);
    setAddError(null);
    try {
      const { error } = await supabase
        .from('clientes')
        .insert({
          nombre: newClientName,
          codigo: newClientCode,
          email: newClientEmail || null
        });
      if (error) throw error;

      setNewClientName('');
      setNewClientCode('');
      setNewClientEmail('');
      setShowAddModal(false);
      fetchClients();
    } catch (err: any) {
      console.error('Error creating client:', err);
      setAddError(err.message || 'Error al crear el cliente. Verifique si el código de cliente ya existe.');
    } finally {
      setAddingClient(false);
    }
  };

  const mapDbClientToUi = (dbClient: any): Client => {
    const name = dbClient.nombre || 'Sin Nombre';
    const initials = name.split(' ')
      .map((w: string) => w.charAt(0))
      .join('')
      .slice(0, 2)
      .toUpperCase() || 'CL';

    const latestContract = dbClient.contratos && dbClient.contratos.length > 0
      ? dbClient.contratos[dbClient.contratos.length - 1]
      : null;

    const contactName = latestContract ? latestContract.creador : 'Sin contacto';
    const contactRole = latestContract ? `Vendedor (${latestContract.organizacion})` : 'Representante';

    let endDate = 'N/A';
    let status: Client['status'] = 'Pendiente Firma';
    let monthlyAmount = 0;

    if (dbClient.contratos && dbClient.contratos.length > 0) {
      const activeContracts = dbClient.contratos.filter((c: any) => {
        if (c.estado !== 'APROBADO') return false;
        if (!c.fecha_vencimiento) return true;
        return new Date(c.fecha_vencimiento) >= new Date();
      });

      const pendingContracts = dbClient.contratos.filter((c: any) => {
        return c.estado === 'PENDIENTE_REVISION';
      });

      if (activeContracts.length > 0) {
        status = 'Activo';
        const expiringSoon = activeContracts.some((c: any) => {
          if (!c.fecha_vencimiento) return false;
          const days = Math.ceil((new Date(c.fecha_vencimiento).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
          return days >= 0 && days <= 30;
        });
        if (expiringSoon) {
          status = 'Por Vencer';
        }
      } else if (pendingContracts.length > 0) {
        status = 'Pendiente Firma';
      } else {
        status = 'Finalizado';
      }

      activeContracts.forEach((c: any) => {
        c.contrato_aportes?.forEach((ap: any) => {
          const discObj = c.contrato_descuentos?.find((d: any) => d.articulo_id === ap.articulo_id);
          const discount = discObj ? parseFloat(discObj.descuento) : 0;
          const price = getArticlePrice(ap.articulo);
          monthlyAmount += ap.cantidad * price * (1 - discount / 100);
        });
      });

      const dates = dbClient.contratos
        .map((c: any) => c.fecha_vencimiento)
        .filter(Boolean)
        .map((d: string) => new Date(d));
      if (dates.length > 0) {
        const maxDate = new Date(Math.max(...dates.map((d: any) => d.getTime())));
        endDate = maxDate.toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' });
      } else {
        endDate = 'Consumo / Permanente';
      }
    }

    return {
      id: dbClient.id,
      initials,
      name,
      contactName,
      contactRole,
      endDate,
      monthlyAmount,
      status
    };
  };

  const handleToggleVencimiento = (val: string) => {
    if (filterVencimiento.includes(val)) {
      setFilterVencimiento(filterVencimiento.filter(v => v !== val));
    } else {
      setFilterVencimiento([...filterVencimiento, val]);
    }
  };

  const handleClearFilters = () => {
    setFilterVencimiento([]);
    setFilterEstado('Todos');
    setFilterTipo('Todos');
    setFilterStartDateFrom('');
    setFilterStartDateTo('');
  };

  const mappedClients = clients.map(mapDbClientToUi);

  const filteredClients = mappedClients.filter(client => {
    // Search Query
    const matchesSearch = client.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          client.id.toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchesSearch) return false;

    // Estado del Contrato
    if (filterEstado !== 'Todos') {
      if (client.status !== filterEstado) return false;
    }

    // Find database object
    const dbClient = clients.find(c => c.id === client.id);
    if (!dbClient) return false;

    // Tipo de Acuerdo
    if (filterTipo !== 'Todos') {
      const hasMatchingType = dbClient.contratos?.some((c: any) => c.tipo === filterTipo);
      if (!hasMatchingType) return false;
    }

    // Vencimiento Checkboxes
    if (filterVencimiento.length > 0) {
      const matchesVencimiento = dbClient.contratos?.some((c: any) => {
        if (!c.fecha_vencimiento) return false;
        const diffMs = new Date(c.fecha_vencimiento).getTime() - Date.now();
        const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
        if (diffDays < 0) return false; // Already expired

        return filterVencimiento.some(val => {
          if (val === 'Próximos 3 meses') return diffDays <= 90;
          if (val === 'Próximos 6 meses') return diffDays <= 180;
          if (val === 'Este año') {
            const currentYear = new Date().getFullYear();
            return new Date(c.fecha_vencimiento).getFullYear() === currentYear;
          }
          return false;
        });
      });
      if (!matchesVencimiento) return false;
    }

    // Fecha Inicio Date Range
    if (filterStartDateFrom || filterStartDateTo) {
      const matchesStartDate = dbClient.contratos?.some((c: any) => {
        if (!c.fecha_inicio) return false;
        const cDate = new Date(c.fecha_inicio);
        if (filterStartDateFrom && cDate < new Date(filterStartDateFrom)) return false;
        if (filterStartDateTo && cDate > new Date(filterStartDateTo)) return false;
        return true;
      });
      if (!matchesStartDate) return false;
    }

    return true;
  });

  // Calculate summaries
  const totalContracts = filteredClients.reduce((acc, c) => {
    const dbC = clients.find(dbc => dbc.id === c.id);
    return acc + (dbC?.contratos?.length || 0);
  }, 0);
  
  const totalMonthlyBilling = filteredClients.reduce((acc, c) => acc + c.monthlyAmount, 0);
  
  const retentionRate = filteredClients.length > 0
    ? (filteredClients.filter(c => c.status === 'Activo').length / (filteredClients.filter(c => c.status === 'Activo' || c.status === 'Finalizado').length || 1) * 100).toFixed(1)
    : '100';

  return (
    <div className="flex h-full bg-[#f8f9fa] overflow-hidden animate-fadeIn">
      {/* Advanced Filters Sidebar */}
      <aside className="w-[280px] border-r border-gray-200 bg-white flex flex-col overflow-y-auto hidden lg:flex flex-shrink-0 z-0">
        <div className="p-6">
          <h2 className="text-lg font-bold flex items-center gap-2 mb-8 text-black">
            <Filter className="w-5 h-5 text-gray-500" />
            Filtros Avanzados
          </h2>

          <div className="space-y-8">
            <div>
              <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-widest font-['JetBrains_Mono'] block mb-3">
                Vencimiento
              </label>
              <div className="space-y-3">
                {['Próximos 3 meses', 'Próximos 6 meses', 'Este año'].map(lbl => (
                  <label key={lbl} className="flex items-center gap-3 cursor-pointer group">
                    <input 
                      type="checkbox" 
                      checked={filterVencimiento.includes(lbl)}
                      onChange={() => handleToggleVencimiento(lbl)}
                      className="w-4 h-4 rounded border-gray-300 text-black focus:ring-black cursor-pointer" 
                    />
                    <span className="text-sm text-gray-700 group-hover:text-black">{lbl}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-widest font-['JetBrains_Mono'] block mb-3">
                Estado del Contrato
              </label>
              <div className="flex flex-wrap gap-2">
                {['Todos', 'Activo', 'Por Vencer', 'Finalizado', 'Pendiente Firma'].map(state => {
                  const isActive = filterEstado === state;
                  const label = state === 'Por Vencer' ? 'Próx. Vencer' : state === 'Pendiente Firma' ? 'Pendiente' : state;
                  return (
                    <button 
                      key={state}
                      onClick={() => setFilterEstado(state)}
                      className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all border ${
                        isActive 
                          ? 'bg-black text-white border-black shadow-sm' 
                          : 'border-gray-200 text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-widest font-['JetBrains_Mono'] block mb-3">
                Tipo de Contrato
              </label>
              <div className="relative">
                <select 
                  value={filterTipo}
                  onChange={e => setFilterTipo(e.target.value)}
                  className="w-full bg-white border border-gray-200 rounded-lg text-sm py-2 px-3 outline-none focus:ring-1 focus:ring-black appearance-none cursor-pointer text-black font-semibold"
                >
                  <option value="Todos">Todos los tipos</option>
                  <option value="A vencimiento">A vencimiento</option>
                  <option value="Consumisión">Consumisión</option>
                </select>
                <ChevronDown className="w-4 h-4 text-gray-500 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            <div>
              <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-widest font-['JetBrains_Mono'] block mb-3">
                Fecha de Inicio (Rango)
              </label>
              <div className="space-y-2">
                <input 
                  type="date" 
                  value={filterStartDateFrom}
                  onChange={e => setFilterStartDateFrom(e.target.value)}
                  className="w-full bg-white border border-gray-200 rounded-lg text-sm py-2 px-3 outline-none focus:ring-1 focus:ring-black text-gray-600" 
                />
                <div className="text-center text-xs text-gray-400 font-medium">hasta</div>
                <input 
                  type="date" 
                  value={filterStartDateTo}
                  onChange={e => setFilterStartDateTo(e.target.value)}
                  className="w-full bg-white border border-gray-200 rounded-lg text-sm py-2 px-3 outline-none focus:ring-1 focus:ring-black text-gray-600" 
                />
              </div>
            </div>
          </div>

          <button 
            onClick={handleClearFilters}
            className="w-full mt-10 py-2.5 bg-gray-50 text-black border border-gray-200 rounded-lg font-semibold text-sm hover:bg-gray-100 transition-colors"
          >
            Limpiar Filtros
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-8 flex flex-col relative z-0">
        <div className="max-w-5xl mx-auto w-full flex-1 flex flex-col">
          {/* Header */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 gap-4">
            <div className="w-full md:w-auto flex-1">
              <h2 className="text-4xl font-bold text-black font-['Hanken_Grotesk'] tracking-tight">Clientes</h2>
              <p className="text-gray-500 mt-1 mb-4">Base de clientes y gestión de acuerdos de Tilsen.</p>
              <div className="relative max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar por nombre o ID..."
                  className="w-full bg-white border border-gray-200 rounded-lg pl-10 pr-4 py-2 text-sm outline-none focus:ring-1 focus:ring-black text-black"
                />
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="inline-flex rounded-lg border border-gray-200 p-1 bg-white">
                <button 
                  onClick={() => setViewMode('lista')}
                  className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-sm font-semibold transition-colors ${
                    viewMode === 'lista' ? 'bg-black text-white' : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <List className="w-4 h-4" /> Lista
                </button>
                <button 
                  onClick={() => setViewMode('mapa')}
                  className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-sm font-semibold transition-colors ${
                    viewMode === 'mapa' ? 'bg-black text-white' : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <Map className="w-4 h-4" /> Mapa
                </button>
              </div>
              
              <button 
                onClick={() => setShowAddModal(true)}
                className="flex items-center gap-2 px-6 py-2.5 bg-black text-white rounded-lg font-semibold text-sm shadow-sm hover:bg-gray-900 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Nuevo Cliente
              </button>
            </div>
          </div>

          {errorMsg && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 mb-4">
              {errorMsg}
            </div>
          )}

          {/* Client List */}
          <div className="space-y-4 flex-1">
            {loading ? (
              <div className="text-center py-12 bg-white border border-gray-200 rounded-xl text-gray-500">
                Cargando clientes de la base de datos...
              </div>
            ) : filteredClients.length > 0 ? (
              filteredClients.map(client => {
                const dbC = clients.find(c => c.id === client.id);
                return (
                  <ClientCard 
                    key={client.id} 
                    client={client} 
                    dbClient={dbC} 
                    logoBase64={logoBase64} 
                    onRefresh={fetchClients} 
                    identity={identity}
                  />
                );
              })
            ) : (
              <div className="text-center py-12 bg-white border border-gray-200 rounded-xl">
                <p className="text-gray-500">No se encontraron clientes con los filtros seleccionados.</p>
              </div>
            )}
          </div>

          {/* Footer */}
          <footer className="mt-12 pt-8 border-t border-gray-200 flex flex-col sm:flex-row justify-between items-center gap-6">
            <div className="flex flex-wrap items-center gap-8">
              <div>
                <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-widest font-['JetBrains_Mono'] mb-1">Total Contratos</p>
                <p className="text-2xl font-bold text-black">{totalContracts}</p>
              </div>
              <div>
                <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-widest font-['JetBrains_Mono'] mb-1">Facturación Mensual</p>
                <p className="text-2xl font-bold text-[#b81121]">${totalMonthlyBilling.toLocaleString('es-CO')}</p>
              </div>
              <div>
                <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-widest font-['JetBrains_Mono'] mb-1">Retención</p>
                <p className="text-2xl font-bold text-green-600">{retentionRate}%</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <button className="p-2 rounded border border-gray-200 text-gray-400 hover:bg-gray-50 disabled:opacity-50 transition-colors" disabled>
                <ChevronLeft className="w-5 h-5" />
              </button>
              <span className="text-sm font-medium text-black">1 de 1</span>
              <button className="p-2 rounded border border-gray-200 text-gray-400 hover:bg-gray-50 transition-colors" disabled>
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </footer>
        </div>

        <button className="fixed bottom-8 right-8 w-14 h-14 bg-[#b81121] text-white rounded-xl shadow-xl flex items-center justify-center hover:scale-105 active:scale-95 transition-all z-50">
          <MessageSquare className="w-6 h-6" />
        </button>
      </div>

      {/* Add Client Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl border border-gray-100 animate-scaleIn">
            <div className="px-6 py-4 bg-gray-50 border-b border-gray-100 flex justify-between items-center">
              <h3 className="font-bold text-black text-lg">Nuevo Cliente</h3>
              <button 
                onClick={() => setShowAddModal(false)}
                className="p-1 hover:bg-gray-200 rounded-lg transition-colors text-gray-500"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleCreateClient} className="p-6 space-y-4">
              {addError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
                  {addError}
                </div>
              )}
              
              <div>
                <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-widest font-['JetBrains_Mono'] mb-2">Nombre del Cliente *</label>
                <input 
                  type="text" 
                  value={newClientName}
                  onChange={e => setNewClientName(e.target.value)}
                  required
                  placeholder="Ej. Distribuidora del Norte"
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-black text-black"
                />
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-widest font-['JetBrains_Mono'] mb-2">Código Único de Cliente *</label>
                <input 
                  type="text" 
                  value={newClientCode}
                  onChange={e => setNewClientCode(e.target.value)}
                  required
                  placeholder="Ej. CLI-1004"
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-black text-black"
                />
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-widest font-['JetBrains_Mono'] mb-2">Correo Electrónico (Contacto)</label>
                <input 
                  type="email" 
                  value={newClientEmail}
                  onChange={e => setNewClientEmail(e.target.value)}
                  placeholder="ejemplo@gmail.com"
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-black text-black"
                />
              </div>

              <div className="pt-4 flex justify-end gap-3 border-t border-gray-100">
                <button 
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  disabled={addingClient}
                  className="px-5 py-2 bg-black text-white rounded-lg text-sm font-semibold hover:bg-gray-900 transition-colors shadow-sm disabled:opacity-55"
                >
                  {addingClient ? 'Creando...' : 'Crear Cliente'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// Client Card Component with Inline Editing, PDF Download, and Contract Details
interface ClientCardProps {
  client: Client;
  dbClient: any;
  logoBase64: string | null;
  onRefresh: () => void;
  identity?: UserIdentity;
}

const ClientCard: React.FC<ClientCardProps> = ({ client, dbClient, logoBase64, onRefresh, identity }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(client.name);
  const [editEmail, setEditEmail] = useState(dbClient?.email || '');
  const [saving, setSaving] = useState(false);

  const handleApproveContract = async (
    contractId: string, 
    clientName: string, 
    clientEmail: string, 
    numeroAcuerdo: string, 
    fechaVencimiento: string
  ) => {
    if (!window.confirm('¿Está seguro de que desea aprobar este acuerdo?')) return;
    try {
      const { error } = await supabase
        .from('contratos')
        .update({ 
          estado: 'APROBADO', 
          fecha_aprobacion: new Date().toISOString() 
        })
        .eq('id', contractId);

      if (error) throw error;

      // Fire and forget email
      notificarAcuerdoAprobado({
        clienteNombre: clientName,
        clienteEmail: clientEmail || '',
        numeroAcuerdo: numeroAcuerdo || `AC-${contractId.slice(0, 6).toUpperCase()}`,
        fechaVencimiento: fechaVencimiento || '',
      }).catch(err => console.warn('[Brevo] Approval notification failed:', err));

      alert('El acuerdo ha sido aprobado exitosamente.');
      onRefresh();
    } catch (err: any) {
      console.error('Error approving contract:', err);
      alert('Error al aprobar el acuerdo: ' + err.message);
    }
  };

  const getStatusColor = (status: Client['status']) => {
    switch (status) {
      case 'Activo': return 'bg-green-50 text-green-700 border-green-200 dot-green-500';
      case 'Por Vencer': return 'bg-amber-50 text-amber-700 border-amber-200 dot-amber-500';
      case 'Finalizado': return 'bg-gray-50 text-gray-700 border-gray-200 dot-gray-400';
      case 'Pendiente Firma': return 'bg-blue-50 text-blue-700 border-blue-200 dot-blue-500';
    }
  };
  
  const statusStyles = getStatusColor(client.status);
  const dotColorClass = statusStyles.split(' ').find(c => c.startsWith('dot-'))?.replace('dot-', 'bg-') || 'bg-gray-500';

  const getInitialsBg = (status: Client['status']) => {
    switch (status) {
      case 'Activo': return 'bg-[#dbe2f9] text-[#141b2c]';
      case 'Por Vencer': return 'bg-[#d7e3fc] text-[#0f1c2e]';
      case 'Finalizado': return 'bg-gray-200 text-gray-700';
      case 'Pendiente Firma': return 'bg-[#bfc6dc] text-[#141b2c]';
    }
  };

  const handleSaveEdit = async () => {
    if (!editName.trim()) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('clientes')
        .update({
          nombre: editName,
          email: editEmail || null
        })
        .eq('id', client.id);

      if (error) throw error;
      setIsEditing(false);
      onRefresh();
    } catch (err) {
      console.error('Error updating client info:', err);
      alert('No se pudo actualizar la información del cliente.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteClient = async () => {
    if (!window.confirm(`¿Está seguro que desea eliminar al cliente ${client.name} y todos sus contratos asociados?`)) return;
    try {
      const { error } = await supabase
        .from('clientes')
        .delete()
        .eq('id', client.id);

      if (error) throw error;
      onRefresh();
    } catch (err) {
      console.error('Error deleting client:', err);
      alert('Error al intentar eliminar el cliente.');
    }
  };

  const downloadContractPdf = (c: any) => {
    const doc = new jsPDF();
    
    // Header / Logo
    if (logoBase64) {
      doc.addImage(logoBase64, 'PNG', 14, 12, 22, 22);
      doc.setFontSize(22);
      doc.setFont("helvetica", "bold");
      doc.text(`Acuerdo Comercial - ${c.organizacion}`, 40, 20);
      
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text(`Fecha de Creación: ${new Date(c.fecha_creacion).toLocaleDateString()}`, 40, 27);
      doc.text(`Creado por: ${c.creador}`, 40, 33);
    } else {
      doc.setFontSize(22);
      doc.setFont("helvetica", "bold");
      doc.text(`Acuerdo Comercial - ${c.organizacion}`, 14, 20);
      
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text(`Fecha de Creación: ${new Date(c.fecha_creacion).toLocaleDateString()}`, 14, 28);
      doc.text(`Creado por: ${c.creador}`, 14, 34);
    }

    // Client Info
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("Información del Cliente", 14, 48);
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Nombre: ${client.name}`, 14, 56);
    doc.text(`Código: ${dbClient?.codigo || 'N/A'}`, 14, 62);
    doc.text(`Email: ${editEmail || 'N/A'}`, 14, 68);
    
    doc.text(`Tipo de Acuerdo: ${c.tipo}`, 14, 74);
    if (c.tipo === 'A vencimiento') {
      doc.text(`Fecha de Inicio: ${c.fecha_inicio ? new Date(c.fecha_inicio).toLocaleDateString() : 'N/A'}`, 14, 80);
      doc.text(`Fecha de Vencimiento: ${c.fecha_vencimiento ? new Date(c.fecha_vencimiento).toLocaleDateString() : 'N/A'}`, 14, 86);
    }

    let startY = c.tipo === 'A vencimiento' ? 96 : 84;

    // Aporte Table
    if (c.contrato_aportes && c.contrato_aportes.length > 0) {
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("Aporte (Productos/Servicios)", 14, startY);
      
      const aporteBody = c.contrato_aportes.map((ap: any) => [
        getAporteDisplayCode(ap),
        getAporteDisplayName(ap),
        ap.cantidad?.toString() || '0'
      ]);

      autoTable(doc, {
        startY: startY + 6,
        head: [['Código', 'Artículo', 'Cantidad']],
        body: aporteBody,
        theme: 'grid',
        headStyles: { fillColor: [0, 0, 0] }
      });
      startY = (doc as any).lastAutoTable.finalY + 14;
    }

    // Descuentos Table
    if (c.contrato_descuentos && c.contrato_descuentos.length > 0) {
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("Descuentos Aplicados", 14, startY);
      
      const descuentoBody = c.contrato_descuentos.map((d: any) => [
        getAporteDisplayCode(d),
        getAporteDisplayName(d),
        `${d.descuento || 0}%`
      ]);

      autoTable(doc, {
        startY: startY + 6,
        head: [['Código', 'Artículo', 'Descuento (%)']],
        body: descuentoBody,
        theme: 'grid',
        headStyles: { fillColor: [0, 0, 0] }
      });
    }

    const pageHeight = doc.internal.pageSize.height;
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text("Este documento es generado automáticamente por el sistema de gestión de acuerdos comercial.", 14, pageHeight - 10);
    doc.save(`Contrato_${dbClient?.codigo || 'Cliente'}_${c.organizacion}.pdf`);
  };

  return (
    <div className="bg-white border border-gray-200 rounded-xl hover:shadow-lg transition-all duration-300 group flex flex-col p-6 gap-6">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 w-full">
        <div className="flex items-center gap-6 flex-1 w-full">
          <div className={`w-16 h-16 rounded-xl flex items-center justify-center font-bold text-2xl flex-shrink-0 ${getInitialsBg(client.status)}`}>
            {client.initials}
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 md:gap-8 flex-1 items-center">
            {isEditing ? (
              <div className="md:col-span-2 space-y-2">
                <input 
                  type="text" 
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  className="bg-white border border-gray-300 rounded px-2 py-1 text-sm font-semibold w-full text-black outline-none focus:border-black"
                />
                <input 
                  type="email" 
                  value={editEmail}
                  onChange={e => setEditEmail(e.target.value)}
                  placeholder="Correo electrónico"
                  className="bg-white border border-gray-300 rounded px-2 py-1 text-xs w-full text-gray-600 outline-none focus:border-black"
                />
              </div>
            ) : (
              <div>
                <h3 className="text-lg font-semibold text-black group-hover:text-[#b81121] transition-colors">{client.name}</h3>
                <p className="text-sm text-gray-500 mt-1">{client.contactName} • {client.contactRole}</p>
                <p className="text-[10px] text-gray-400 font-semibold font-['JetBrains_Mono'] mt-1">Cód: {dbClient?.codigo || 'N/A'}</p>
              </div>
            )}
            
            <div>
              <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest font-['JetBrains_Mono'] mb-1.5">Último Vencimiento</p>
              <p className={`text-sm font-semibold ${client.status === 'Por Vencer' ? 'text-[#b81121]' : 'text-black'}`}>
                {client.endDate}
              </p>
            </div>
            
            <div>
              <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest font-['JetBrains_Mono'] mb-1.5">Monto Mensual</p>
              <p className="text-sm font-semibold text-black font-['JetBrains_Mono']">
                ${client.monthlyAmount.toLocaleString('es-CO')}
              </p>
            </div>
            
            <div>
              <span className={`px-3 py-1.5 text-[11px] font-bold rounded-full border flex items-center gap-1.5 w-max ${statusStyles.replace(/dot-[\w-]+/, '')}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${dotColorClass} ${client.status === 'Activo' ? 'animate-pulse' : ''}`} />
                {client.status}
              </span>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 md:ml-4 md:border-l md:border-gray-200 md:pl-6 w-full md:w-auto justify-end flex-shrink-0">
          {isEditing ? (
            <>
              <button 
                onClick={handleSaveEdit}
                disabled={saving}
                className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors disabled:opacity-50"
              >
                <Check className="w-5 h-5" />
              </button>
              <button 
                onClick={() => { setIsEditing(false); setEditName(client.name); setEditEmail(dbClient?.email || ''); }}
                className="p-2 text-gray-400 hover:bg-gray-50 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </>
          ) : (
            <>
              <button 
                onClick={() => setIsEditing(true)}
                className="p-2 text-gray-400 hover:text-black hover:bg-gray-50 rounded-lg transition-colors"
                title="Editar Cliente"
              >
                <Edit2 className="w-5 h-5" />
              </button>
              <button 
                onClick={handleDeleteClient}
                className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                title="Eliminar Cliente"
              >
                <Trash2 className="w-5 h-5" />
              </button>
              <button 
                onClick={() => setIsExpanded(!isExpanded)}
                className={`p-2 text-gray-400 hover:text-black hover:bg-gray-50 rounded-lg transition-all ${
                  isExpanded ? 'rotate-180 text-black' : ''
                }`}
                title="Ver Contratos"
              >
                <ChevronDown className="w-5 h-5" />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Expanded Contract Details Panel */}
      {isExpanded && (
        <div className="border-t border-gray-100 pt-6 animate-fadeIn space-y-4">
          <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest font-['JetBrains_Mono']">
            Historial de Acuerdos Comerciales
          </h4>
          
          {dbClient?.contratos && dbClient.contratos.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {dbClient.contratos.map((c: any) => {
                const cAmount = c.contrato_aportes?.reduce((acc: number, ap: any) => {
                  const discObj = c.contrato_descuentos?.find((d: any) => d.articulo_id === ap.articulo_id);
                  const discount = discObj ? parseFloat(discObj.descuento) : 0;
                  return acc + (ap.cantidad * getArticlePrice(ap.articulo) * (1 - discount / 100));
                }, 0) || 0;

                const daysLeft = c.fecha_vencimiento
                  ? Math.ceil((new Date(c.fecha_vencimiento).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
                  : null;

                const isVencido = daysLeft !== null && daysLeft < 0;

                return (
                  <div key={c.id} className="bg-gray-50 border border-gray-100 rounded-xl p-5 hover:border-gray-300 transition-colors flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-start mb-3">
                        <span className="px-2.5 py-1 bg-black text-white rounded text-[10px] font-bold uppercase tracking-wider font-['JetBrains_Mono']">
                          {c.organizacion}
                        </span>
                        <span className={`text-[10px] font-bold uppercase ${
                          c.estado === 'PENDIENTE_REVISION'
                            ? 'text-amber-600'
                            : c.estado === 'VENCIDO' || isVencido
                            ? 'text-[#b81121]'
                            : c.estado === 'RENOVADO'
                            ? 'text-blue-600'
                            : 'text-green-600'
                        }`}>
                          {c.estado === 'PENDIENTE_REVISION'
                            ? 'Pendiente'
                            : c.estado === 'VENCIDO' || isVencido
                            ? 'Vencido'
                            : c.estado === 'RENOVADO'
                            ? 'Renovado'
                            : 'Aprobado'}
                        </span>
                      </div>
                      
                      <div className="space-y-1.5 text-xs text-gray-600">
                        <p><strong className="text-black font-semibold">Tipo:</strong> {c.tipo}</p>
                        <p><strong className="text-black font-semibold">Creado por:</strong> {c.creador}</p>
                        {c.fecha_inicio && (
                          <p><strong className="text-black font-semibold">Fecha de Inicio:</strong> {new Date(c.fecha_inicio).toLocaleDateString()}</p>
                        )}
                        {c.fecha_vencimiento && (
                          <p><strong className="text-black font-semibold">Vencimiento:</strong> {new Date(c.fecha_vencimiento).toLocaleDateString()}</p>
                        )}
                        <p className="pt-2"><strong className="text-black font-semibold">Valor Estimado:</strong> <span className="font-['JetBrains_Mono'] font-bold text-black">${cAmount.toLocaleString('es-CO')}</span></p>
                      </div>

                      {/* Items and Discounts */}
                      {c.contrato_aportes && c.contrato_aportes.length > 0 && (
                        <div className="mt-4 pt-3 border-t border-gray-200/50">
                          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest font-['JetBrains_Mono'] mb-1.5">Artículos de Aporte</p>
                          <div className="space-y-1 text-xs">
                            {c.contrato_aportes.map((ap: any) => {
                              const discObj = c.contrato_descuentos?.find((d: any) => d.articulo_id === ap.articulo_id);
                              return (
                                <div key={ap.id} className="flex justify-between items-center bg-white border border-gray-100 rounded px-2 py-1 text-gray-700">
                                  <span>{getAporteDisplayName(ap)} (x{ap.cantidad})</span>
                                  {discObj && (
                                    <span className="text-[10px] font-bold text-[#b81121] bg-red-50 px-1.5 py-0.5 rounded">-{discObj.descuento}% desc.</span>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                    
                    <div className="space-y-2 mt-6">
                      {c.estado === 'PENDIENTE_REVISION' && identity?.name?.toLowerCase() === 'jose' && (
                        <button 
                          onClick={() => handleApproveContract(c.id, client.name, dbClient?.email, c.numero_acuerdo, c.fecha_vencimiento)}
                          className="w-full flex items-center justify-center gap-2 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-xs font-semibold transition-colors shadow-sm"
                        >
                          <Check className="w-4 h-4" />
                          Aprobar Acuerdo
                        </button>
                      )}
                      
                      <button 
                        onClick={() => downloadContractPdf(c)}
                        className="w-full flex items-center justify-center gap-2 py-2 border border-gray-200 rounded-lg text-xs font-semibold text-black hover:bg-gray-100 transition-colors shadow-sm bg-white"
                      >
                        <Download className="w-4.5 h-4.5" />
                        Descargar PDF del Acuerdo
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-6 bg-gray-50 border border-dashed border-gray-200 rounded-xl text-xs text-gray-400">
              Este cliente no posee ningún acuerdo comercial registrado en el sistema.
            </div>
          )}
        </div>
      )}
    </div>
  );
};
