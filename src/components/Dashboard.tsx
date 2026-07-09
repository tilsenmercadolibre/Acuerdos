import { useState, useEffect } from 'react';
import { FileText, ArrowRight, UserCheck, Eye, Plus, Sparkles } from 'lucide-react';
import { UserIdentity } from '../types';
import { supabase } from '../lib/supabase';

interface DashboardProps {
  identity: UserIdentity;
  onNavigate: (tab: 'nuevo-contrato' | 'reportes' | 'articulos' | 'clientes') => void;
}

const getArticlePrice = (articulo: any) => {
  if (!articulo) return 1000;
  const name = (articulo.nombre || '').toLowerCase();
  if (name.includes('zillertal')) return 1200;
  if (name.includes('stella')) return 1500;
  if (name.includes('corona')) return 1800;
  if (name.includes('patagonia')) return 2000;
  return 1200;
};

export default function Dashboard({ identity, onNavigate }: DashboardProps) {
  const [recentContracts, setRecentContracts] = useState<any[]>([]);
  const [stats, setStats] = useState({ totalOrg: 0, activeOrg: 0, billingOrg: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, [identity]);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      // Fetch all contracts for the organization
      const { data, error } = await supabase
        .from('contratos')
        .select('*, cliente:clientes(*), contrato_aportes(*, articulo:articulos(*)), contrato_descuentos(*, articulo:articulos(*))')
        .eq('organizacion', identity.organization)
        .order('fecha_creacion', { ascending: false });

      if (error) throw error;

      const list = data || [];
      const myRecent = list.filter(c => c.creador === identity.name).slice(0, 4);

      const totalOrg = list.length;
      const activeContracts = list.filter(c => {
        if (!c.fecha_vencimiento) return true;
        return new Date(c.fecha_vencimiento) >= new Date();
      });
      const activeOrg = activeContracts.length;

      const billingOrg = activeContracts.reduce((acc, c) => {
        let cAmount = 0;
        c.contrato_aportes?.forEach((ap: any) => {
          const discObj = c.contrato_descuentos?.find((d: any) => d.articulo_id === ap.articulo_id);
          const discount = discObj ? parseFloat(discObj.descuento) : 0;
          cAmount += ap.cantidad * getArticlePrice(ap.articulo) * (1 - discount / 100);
        });
        return acc + cAmount;
      }, 0);

      setRecentContracts(myRecent);
      setStats({ totalOrg, activeOrg, billingOrg });
    } catch (err) {
      console.error('Error loading dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-fadeIn">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-gray-900 to-black p-8 rounded-2xl border border-gray-800 shadow-xl flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden">
        <div className="absolute right-0 top-0 opacity-10 pointer-events-none">
          <Sparkles className="w-96 h-96 text-white" />
        </div>
        <div className="z-10">
          <span className="px-3 py-1 bg-white/10 text-white rounded-full text-xs font-semibold tracking-wider uppercase font-['JetBrains_Mono']">
            {identity.organization}
          </span>
          <h2 className="text-4xl font-bold font-['Hanken_Grotesk'] text-white tracking-tight mt-3">
            ¡Hola de nuevo, {identity.name}!
          </h2>
          <p className="text-gray-400 mt-2 text-base max-w-xl">
            Gestione y supervise los acuerdos comerciales de su organización de forma rápida y segura.
          </p>
        </div>
        <div className="z-10 flex flex-shrink-0 gap-3">
          <button
            onClick={() => onNavigate('nuevo-contrato')}
            className="flex items-center gap-2 px-6 py-3.5 bg-[#b81121] text-white font-semibold rounded-xl hover:bg-[#9a0f1b] transition-all shadow-lg active:scale-95"
          >
            <Plus className="w-5 h-5" />
            Nuevo Acuerdo
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white border border-gray-200 p-6 rounded-xl shadow-sm hover:shadow-md transition-shadow flex items-start gap-4">
          <div className="p-3 bg-red-50 rounded-lg text-[#b81121]">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest font-['JetBrains_Mono'] mb-1">
              Contratos en {identity.organization}
            </p>
            <h3 className="text-3xl font-bold text-black tracking-tight">
              {loading ? '...' : stats.totalOrg}
            </h3>
            <p className="text-xs text-gray-400 mt-1">Histórico completo</p>
          </div>
        </div>

        <div className="bg-white border border-gray-200 p-6 rounded-xl shadow-sm hover:shadow-md transition-shadow flex items-start gap-4">
          <div className="p-3 bg-green-50 rounded-lg text-green-600">
            <UserCheck className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest font-['JetBrains_Mono'] mb-1">
              Contratos Activos
            </p>
            <h3 className="text-3xl font-bold text-black tracking-tight">
              {loading ? '...' : stats.activeOrg}
            </h3>
            <p className="text-xs text-gray-400 mt-1">Con vigencia actual</p>
          </div>
        </div>

        <div className="bg-white border border-gray-200 p-6 rounded-xl shadow-sm hover:shadow-md transition-shadow flex items-start gap-4">
          <div className="p-3 bg-gray-100 rounded-lg text-black">
            <span className="font-bold text-lg leading-none">$</span>
          </div>
          <div>
            <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest font-['JetBrains_Mono'] mb-1">
              Facturación Estimada ({identity.organization})
            </p>
            <h3 className="text-3xl font-bold text-black tracking-tight font-['JetBrains_Mono']">
              {loading ? '...' : `$${stats.billingOrg.toLocaleString('es-CO')}`}
            </h3>
            <p className="text-xs text-gray-400 mt-1">Mensual proyectada</p>
          </div>
        </div>
      </div>

      {/* Bottom Layout: Mis Acuerdos and Quick Links */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Recent agreements */}
        <div className="lg:col-span-2 bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden flex flex-col">
          <div className="px-6 py-5 border-b border-gray-200 flex justify-between items-center bg-white">
            <h3 className="text-lg font-semibold text-black">Mis Acuerdos Recientes</h3>
            <span className="text-xs text-gray-400 font-medium">Creados por usted</span>
          </div>
          <div className="divide-y divide-gray-100 flex-1">
            {loading ? (
              <div className="p-8 text-center text-gray-400">Cargando acuerdos...</div>
            ) : recentContracts.length > 0 ? (
              recentContracts.map((c) => {
                const daysLeft = c.fecha_vencimiento
                  ? Math.ceil((new Date(c.fecha_vencimiento).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
                  : null;

                const isVencido = daysLeft !== null && daysLeft < 0;
                const isCritico = daysLeft !== null && daysLeft >= 0 && daysLeft <= 7;

                return (
                  <div key={c.id} className="p-5 flex items-center justify-between hover:bg-gray-50 transition-colors group">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center font-bold text-black group-hover:bg-gray-200 transition-colors text-sm">
                        {c.cliente?.nombre ? c.cliente.nombre.substring(0, 2).toUpperCase() : 'CL'}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-black">{c.cliente?.nombre || 'Sin nombre'}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{c.tipo || 'Acuerdo'} • Código: {c.cliente?.codigo || 'N/A'}</p>
                      </div>
                    </div>
                    <div className="text-right flex items-center gap-4">
                      <div>
                        <p className="text-xs font-semibold font-['JetBrains_Mono'] text-black">
                          {c.fecha_vencimiento ? new Date(c.fecha_vencimiento).toLocaleDateString() : 'Indefinido'}
                        </p>
                        <p className={`text-[10px] font-bold mt-0.5 uppercase ${
                          isVencido 
                            ? 'text-red-600' 
                            : isCritico 
                            ? 'text-amber-600' 
                            : 'text-gray-400'
                        }`}>
                          {isVencido ? 'Vencido' : isCritico ? 'Crítico' : 'Vigente'}
                        </p>
                      </div>
                      <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-black group-hover:translate-x-1 transition-all" />
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="p-8 text-center text-gray-400">
                Aún no ha creado acuerdos. ¡Cree su primer acuerdo!
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Quick navigation card */}
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-lg font-semibold text-black mb-4">Accesos Rápidos</h3>
            <p className="text-xs text-gray-400 mb-6">Navegue por las diferentes áreas del sistema de acuerdos comerciales.</p>
            
            <div className="space-y-3">
              <button
                onClick={() => onNavigate('reportes')}
                className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 border border-gray-100 rounded-xl transition-all group"
              >
                <div className="text-left">
                  <p className="text-sm font-semibold text-black group-hover:text-[#b81121] transition-colors">Ver Reportes</p>
                  <p className="text-[10px] text-gray-400 mt-0.5">Estadísticas y análisis general</p>
                </div>
                <Eye className="w-5 h-5 text-gray-400 group-hover:text-black transition-colors" />
              </button>

              <button
                onClick={() => onNavigate('clientes')}
                className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 border border-gray-100 rounded-xl transition-all group"
              >
                <div className="text-left">
                  <p className="text-sm font-semibold text-black group-hover:text-[#b81121] transition-colors">Directorio de Clientes</p>
                  <p className="text-[10px] text-gray-400 mt-0.5">Cartera de clientes y contratos</p>
                </div>
                <Eye className="w-5 h-5 text-gray-400 group-hover:text-black transition-colors" />
              </button>

              <button
                onClick={() => onNavigate('articulos')}
                className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 border border-gray-100 rounded-xl transition-all group"
              >
                <div className="text-left">
                  <p className="text-sm font-semibold text-black group-hover:text-[#b81121] transition-colors">Catálogo de Artículos</p>
                  <p className="text-[10px] text-gray-400 mt-0.5">Marcas, calibres y códigos</p>
                </div>
                <Eye className="w-5 h-5 text-gray-400 group-hover:text-black transition-colors" />
              </button>
            </div>
          </div>
          
          <div className="mt-8 pt-6 border-t border-gray-100 text-center">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider font-['JetBrains_Mono']">
              Tilsen Contract Management
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
