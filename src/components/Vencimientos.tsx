import { useState, useEffect } from 'react';
import { AlertCircle, Clock, CalendarDays, ArrowRight } from 'lucide-react';
import { supabase } from '../lib/supabase';

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

export default function Vencimientos() {
  const [contracts, setContracts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    fetchContracts();
  }, []);

  const fetchContracts = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const { data, error } = await supabase
        .from('contratos')
        .select('*, cliente:clientes(*), contrato_aportes(*, articulo:articulos(*)), contrato_descuentos(*, articulo:articulos(*))')
        .not('fecha_vencimiento', 'is', null)
        .order('fecha_vencimiento', { ascending: true });

      if (error) throw error;
      setContracts(data || []);
    } catch (err: any) {
      console.error('Error fetching contracts for vencimientos:', err);
      setErrorMsg(err.message || 'Error al cargar vencimientos de Supabase.');
    } finally {
      setLoading(false);
    }
  };

  const mapDbContractToUi = (c: any) => {
    const clientName = c.cliente?.nombre || 'Sin Cliente';
    const initials = clientName.split(' ')
      .map((w: string) => w.charAt(0))
      .join('')
      .slice(0, 2)
      .toUpperCase() || 'CL';

    const daysLeft = Math.ceil((new Date(c.fecha_vencimiento).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    
    let amount = 0;
    c.contrato_aportes?.forEach((ap: any) => {
      const discObj = c.contrato_descuentos?.find((d: any) => d.articulo_id === ap.articulo_id);
      const discount = discObj ? parseFloat(discObj.descuento) : 0;
      const price = getArticlePrice(ap.articulo);
      amount += ap.cantidad * price * (1 - discount / 100);
    });

    let status = 'Pendiente';
    if (daysLeft < 0) status = 'Vencido';
    else if (daysLeft <= 7) status = 'Crítico';
    else if (daysLeft <= 30) status = 'Próximo';

    return {
      id: c.id,
      initials,
      client: clientName,
      type: c.tipo || 'General',
      date: new Date(c.fecha_vencimiento).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' }),
      daysLeft,
      amount: `$${amount.toLocaleString('es-CO')}`,
      status
    };
  };

  const mappedContracts = contracts.map(mapDbContractToUi);

  const criticalCount = mappedContracts.filter(c => c.status === 'Crítico').length;
  const upcomingCount = mappedContracts.filter(c => c.status === 'Próximo').length;
  const trimesterCount = mappedContracts.filter(c => c.daysLeft >= 0 && c.daysLeft <= 90).length;

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-6">
      <div className="mb-8">
        <h2 className="text-4xl font-bold text-black font-['Hanken_Grotesk'] tracking-tight">Vencimientos</h2>
        <p className="text-gray-500 mt-1">Contratos próximos a expirar que requieren atención o renovación.</p>
      </div>

      {errorMsg && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {errorMsg}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-[#b81121] text-white p-6 rounded-xl shadow-sm flex items-start gap-4">
          <div className="p-3 bg-white/20 rounded-lg">
            <AlertCircle className="w-6 h-6 text-white" />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest font-['JetBrains_Mono'] opacity-90 mb-1">Críticos (≤ 7 días)</p>
            <h3 className="text-4xl font-bold tracking-tight">{criticalCount}</h3>
          </div>
        </div>
        <div className="bg-amber-500 text-white p-6 rounded-xl shadow-sm flex items-start gap-4">
          <div className="p-3 bg-white/20 rounded-lg">
            <Clock className="w-6 h-6 text-white" />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest font-['JetBrains_Mono'] opacity-90 mb-1">Próximos (≤ 30 días)</p>
            <h3 className="text-4xl font-bold tracking-tight">{upcomingCount}</h3>
          </div>
        </div>
        <div className="bg-white border border-gray-200 p-6 rounded-xl shadow-sm flex items-start gap-4">
          <div className="p-3 bg-gray-100 rounded-lg">
            <CalendarDays className="w-6 h-6 text-black" />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest font-['JetBrains_Mono'] text-gray-500 mb-1">Este Trimestre</p>
            <h3 className="text-4xl font-bold text-black tracking-tight">{trimesterCount}</h3>
          </div>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-200 bg-white">
          <h3 className="text-lg font-semibold text-black">Lista de Vencimientos</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider font-['JetBrains_Mono']">Cliente</th>
                <th className="px-6 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider font-['JetBrains_Mono']">Tipo</th>
                <th className="px-6 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider font-['JetBrains_Mono']">Fecha de Vencimiento</th>
                <th className="px-6 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider font-['JetBrains_Mono']">Días Restantes</th>
                <th className="px-6 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider font-['JetBrains_Mono']">Monto</th>
                <th className="px-6 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider font-['JetBrains_Mono']">Estado</th>
                <th className="px-6 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-gray-500 text-sm">
                    Cargando vencimientos...
                  </td>
                </tr>
              ) : mappedContracts.length > 0 ? (
                mappedContracts.map((contract) => (
                  <tr key={contract.id} className="hover:bg-gray-50 transition-colors group cursor-pointer">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold text-black group-hover:bg-gray-200 transition-colors">
                          {contract.initials}
                        </div>
                        <div className="text-sm font-bold text-black">{contract.client}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                      {contract.type}
                    </td>
                    <td className={`px-6 py-4 whitespace-nowrap text-sm font-semibold ${contract.status === 'Crítico' || contract.status === 'Vencido' ? 'text-[#b81121]' : 'text-gray-900'}`}>
                      {contract.date}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-['JetBrains_Mono']">
                      {contract.status === 'Vencido' ? (
                        <span className="text-[#b81121] font-bold">Vencido ({Math.abs(contract.daysLeft)} días)</span>
                      ) : contract.status === 'Crítico' ? (
                        <span className="text-[#b81121] font-bold">{contract.daysLeft} días</span>
                      ) : (
                        <span className="text-gray-600">{contract.daysLeft} días</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 font-['JetBrains_Mono']">
                      {contract.amount}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        contract.status === 'Vencido' || contract.status === 'Crítico'
                          ? 'bg-red-50 text-red-700' 
                          : contract.status === 'Próximo'
                          ? 'bg-amber-50 text-amber-700'
                          : 'bg-gray-100 text-gray-700'
                      }`}>
                        {contract.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <button className="text-gray-400 hover:text-black transition-colors">
                        <ArrowRight className="w-5 h-5" />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-gray-500 text-sm">
                    No se encontraron contratos con fecha de vencimiento.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
