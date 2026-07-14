import { useState, useEffect } from 'react';
import { 
  FileText, 
  CalendarOff, 
  DollarSign, 
  Repeat, 
  TrendingUp,
  Download,
  MoreVertical,
  ArrowRight,
  Package
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell 
} from 'recharts';
import { supabase } from '../lib/supabase';
import { formatDate, parseLocalDate } from '../lib/dateUtils';

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

export default function Reportes({ onNavigate }: { onNavigate?: (tab: any) => void }) {
  const [contracts, setContracts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Creado por filters
  const [filterOrg, setFilterOrg] = useState<string>('Todos');
  const [filterCreador, setFilterCreador] = useState<string>('Todos');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const { data, error } = await supabase
        .from('contratos')
        .select('*, cliente:clientes(*), contrato_aportes(*, articulo:articulos(*), marca:marcas(*), calibre:calibres(*), linea:lineas(*)), contrato_descuentos(*, articulo:articulos(*), marca:marcas(*), calibre:calibres(*), linea:lineas(*))');
      
      if (error) throw error;
      setContracts(data || []);
    } catch (err: any) {
      console.error('Error fetching reports data:', err);
      setErrorMsg(err.message || 'Error al cargar reportes de Supabase.');
    } finally {
      setLoading(false);
    }
  };

  const getInitials = (name: string) => {
    return name.split(' ')
      .map(w => w.charAt(0))
      .join('')
      .slice(0, 2)
      .toUpperCase() || 'CL';
  };

  // All unique org values and vendor names from loaded data
  const orgs = Array.from(new Set(contracts.map(c => c.organizacion).filter(Boolean))) as string[];
  const vendorsByOrg = filterOrg === 'Todos'
    ? Array.from(new Set(contracts.map(c => c.creador).filter(Boolean))) as string[]
    : Array.from(new Set(contracts.filter(c => c.organizacion === filterOrg).map(c => c.creador).filter(Boolean))) as string[];

  // Apply "Creado por" filter
  const filteredContracts = contracts.filter(c => {
    if (filterOrg !== 'Todos' && c.organizacion !== filterOrg) return false;
    if (filterCreador !== 'Todos' && c.creador !== filterCreador) return false;
    return true;
  });

  // Calculations
  const totalContracts = filteredContracts.length;

  const activeContracts = filteredContracts.filter(c => {
    if (!c.fecha_vencimiento) return true;
    const exp = parseLocalDate(c.fecha_vencimiento);
    return exp ? exp >= new Date() : true;
  });

  const upcomingExpirations = filteredContracts.filter(c => {
    if (!c.fecha_vencimiento) return false;
    const days = Math.ceil(((parseLocalDate(c.fecha_vencimiento)?.getTime() ?? Date.now()) - Date.now()) / (1000 * 60 * 60 * 24));
    return days >= 0 && days <= 30;
  }).length;

  const totalMonthlyBilling = activeContracts.reduce((acc, c) => {
    let cAmount = 0;
    c.contrato_aportes?.forEach((ap: any) => {
      const discObj = c.contrato_descuentos?.find((d: any) => d.articulo_id === ap.articulo_id);
      const discount = discObj ? parseFloat(discObj.descuento) : 0;
      const price = getArticlePrice(ap.articulo);
      cAmount += ap.cantidad * price * (1 - discount / 100);
    });
    return acc + cAmount;
  }, 0);

  const formatCurrency = (val: number) => {
    if (val >= 1000000) return `$${(val / 1000000).toFixed(1)}M`;
    if (val >= 1000) return `$${(val / 1000).toFixed(1)}k`;
    return `$${val.toLocaleString('es-CO')}`;
  };

  const renewalRate = totalContracts > 0
    ? ((activeContracts.length / totalContracts) * 100).toFixed(1) + '%'
    : '100%';

  // Charts data
  const months = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC'];
  const currentMonth = new Date().getMonth();
  
  const barData = Array.from({ length: 8 }).map((_, idx) => {
    const d = new Date();
    d.setMonth(currentMonth - 3 + idx);
    const mIndex = d.getMonth();
    const year = d.getFullYear();
    
    const count = filteredContracts.filter(c => {
      if (!c.fecha_vencimiento) return false;
      const exp = parseLocalDate(c.fecha_vencimiento);
      if (!exp) return false;
      return exp.getMonth() === mIndex && exp.getFullYear() === year;
    }).length;

    return {
      name: months[mIndex],
      value: count,
      active: mIndex === currentMonth && year === new Date().getFullYear()
    };
  });

  const typesMap: Record<string, number> = {};
  filteredContracts.forEach(c => {
    const t = c.tipo || 'Otros';
    typesMap[t] = (typesMap[t] || 0) + 1;
  });
  const totalContractsCount = filteredContracts.length || 1;
  const colors = ['#101828', '#b81121', '#e1e3e4', '#bfc6dc'];
  const pieData = Object.entries(typesMap).map(([name, count], index) => ({
    name,
    value: Math.round((count / totalContractsCount) * 100),
    color: colors[index % colors.length]
  }));

  // Tables
  const criticalContracts = filteredContracts
    .map(c => {
      const daysLeft = c.fecha_vencimiento
        ? Math.ceil(((parseLocalDate(c.fecha_vencimiento)?.getTime() ?? Date.now()) - Date.now()) / (1000 * 60 * 60 * 24))
        : Infinity;
      
      let status = 'Activo';
      if (daysLeft < 0) status = 'Vencido';
      else if (daysLeft <= 7) status = 'Crítico';
      else if (daysLeft <= 30) status = 'Próximo';

      let cAmount = 0;
      c.contrato_aportes?.forEach((ap: any) => {
        const discObj = c.contrato_descuentos?.find((d: any) => d.articulo_id === ap.articulo_id);
        const discount = discObj ? parseFloat(discObj.descuento) : 0;
        cAmount += ap.cantidad * getArticlePrice(ap.articulo) * (1 - discount / 100);
      });

      return {
        id: c.id,
        initials: getInitials(c.cliente?.nombre || 'CL'),
        company: c.cliente?.nombre || 'Sin Cliente',
        client: c.creador || 'Sin Creador',
        type: c.tipo || 'General',
        date: c.fecha_vencimiento ? formatDate(c.fecha_vencimiento, { day: 'numeric', month: 'short' }) : 'Indefinido',
        amount: `$${cAmount.toLocaleString('es-CO')}`,
        status,
        daysLeft
      };
    })
    .filter(c => c.status === 'Crítico' || c.status === 'Próximo')
    .sort((a, b) => a.daysLeft - b.daysLeft)
    .slice(0, 5);

  const itemUsage: Record<string, { code: string; name: string; quantity: number }> = {};
  filteredContracts.forEach(c => {
    c.contrato_aportes?.forEach((ap: any) => {
      const isCustom = !ap.articulo;
      const id = isCustom 
        ? `custom-${ap.marca_id || ''}-${ap.linea_id || ''}-${ap.calibre_id || ''}`
        : ap.articulo.id;
      
      if (!itemUsage[id]) {
        const code = ap.articulo?.codigo || ap.codigo_interno || '-';
        let name = '';
        if (ap.articulo) {
          name = ap.articulo.nombre;
        } else {
          const parts: string[] = [];
          if (ap.marca?.nombre) parts.push(ap.marca.nombre);
          if (ap.linea?.nombre) parts.push(ap.linea.nombre);
          if (ap.calibre?.nombre) parts.push(ap.calibre.nombre);
          name = parts.join(' · ') || 'Combinación a medida';
        }
        itemUsage[id] = { code, name, quantity: 0 };
      }
      itemUsage[id].quantity += ap.cantidad || 0;
    });
  });
  const sortedUsage = Object.entries(itemUsage)
    .map(([id, data]) => ({ id, ...data }))
    .sort((a, b) => b.quantity - a.quantity);
  const maxQty = sortedUsage[0]?.quantity || 1;
  const topItems = sortedUsage.slice(0, 5).map(item => ({
    id: item.id,
    code: item.code,
    name: item.name,
    quantity: item.quantity,
    percentage: `${Math.round((item.quantity / maxQty) * 100)}%`
  }));

  const downloadCSV = (headers: string[], rows: any[][], filename: string) => {
    const csvContent = "\uFEFF" 
      + [headers.join(';'), ...rows.map(row => row.map(val => {
        const stringVal = val === null || val === undefined ? '' : String(val);
        if (stringVal.includes(';') || stringVal.includes('"') || stringVal.includes('\n')) {
          return `"${stringVal.replace(/"/g, '""')}"`;
        }
        return stringVal;
      }).join(';'))].join('\r\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportAllToExcel = () => {
    const headers = [
      'Código de Cliente',
      'Cliente',
      'Email Cliente',
      'Vendedor',
      'Organización',
      'Tipo de Acuerdo',
      'Fecha Creación',
      'Fecha Inicio',
      'Fecha Vencimiento',
      'Estado'
    ];

    const rows = filteredContracts.map(c => {
      return [
        c.cliente?.codigo || c.cliente?.codigo_cliente || '',
        c.cliente?.nombre || 'Sin Cliente',
        c.cliente?.email || '',
        c.creador || 'Sin Creador',
        c.organizacion,
        c.tipo || 'General',
        formatDate(c.fecha_creacion),
        formatDate(c.fecha_inicio),
        c.fecha_vencimiento ? formatDate(c.fecha_vencimiento) : 'Indefinido',
        c.estado || 'PENDIENTE_REVISION'
      ];
    });

    downloadCSV(headers, rows, `Reporte_Acuerdos_${filterOrg}_${new Date().toISOString().slice(0,10)}.csv`);
  };

  const exportCriticalToExcel = () => {
    const headers = [
      'Cliente',
      'Creador',
      'Tipo de Acuerdo',
      'Fecha Vencimiento',
      'Estado',
      'Días Restantes',
      'Valor Estimado (Mensual)'
    ];

    const rows = criticalContracts.map(c => [
      c.company,
      c.client,
      c.type,
      c.date,
      c.status,
      c.daysLeft === Infinity ? 'Indefinido' : c.daysLeft,
      c.amount.replace(/[^0-9,.-]/g, '')
    ]);

    downloadCSV(headers, rows, `Contratos_Criticos_${new Date().toISOString().slice(0,10)}.csv`);
  };

  const exportItemsToExcel = () => {
    const headers = [
      'Código de Artículo',
      'Nombre de Artículo',
      'Cantidad Aportada',
      'Porcentaje de Uso'
    ];

    const rows = topItems.map(item => [
      item.code,
      item.name,
      item.quantity,
      item.percentage
    ]);

    downloadCSV(headers, rows, `Articulos_Mas_Utilizados_${new Date().toISOString().slice(0,10)}.csv`);
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end mb-4 gap-4">
        <div>
          <h2 className="text-4xl font-bold text-black font-['Hanken_Grotesk'] tracking-tight">Reportes Generales</h2>
          <p className="text-gray-500 mt-1">Base de análisis para la gestión de contratos Tilsen.</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={exportAllToExcel}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-semibold shadow-sm hover:bg-gray-50 transition-colors text-green-700 font-bold"
          >
            <Download className="w-4 h-4" />
            Exportar a Excel
          </button>
        </div>
      </div>

      {/* ── Filtro: Creado por ─────────────────────────────────────────── */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 flex flex-col sm:flex-row gap-6 items-start sm:items-center shadow-sm">
        <p className="text-[11px] font-bold text-gray-500 uppercase tracking-widest font-['JetBrains_Mono'] flex-shrink-0">Filtrar por:</p>

        {/* Org buttons */}
        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-xs font-semibold text-gray-400 mr-1">Org</span>
          {['Todos', ...orgs].map(o => (
            <button
              key={o}
              onClick={() => { setFilterOrg(o); setFilterCreador('Todos'); }}
              className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-all ${
                filterOrg === o
                  ? 'bg-black text-white border-black shadow-sm'
                  : 'bg-white border-gray-200 text-gray-600 hover:border-gray-400'
              }`}
            >
              {o}
            </button>
          ))}
        </div>

        <div className="h-5 w-px bg-gray-200 hidden sm:block" />

        {/* Vendor dropdown */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-gray-400 flex-shrink-0">Vendedor</span>
          <select
            value={filterCreador}
            onChange={e => setFilterCreador(e.target.value)}
            className="bg-white border border-gray-200 rounded-lg text-xs font-semibold py-1.5 px-3 outline-none focus:ring-1 focus:ring-black cursor-pointer text-black"
          >
            <option value="Todos">Todos</option>
            {vendorsByOrg.map(v => (
              <option key={v} value={v}>{v}</option>
            ))}
          </select>
        </div>

        {(filterOrg !== 'Todos' || filterCreador !== 'Todos') && (
          <button
            onClick={() => { setFilterOrg('Todos'); setFilterCreador('Todos'); }}
            className="text-xs font-semibold text-[#b81121] hover:underline ml-auto"
          >
            × Limpiar filtros
          </button>
        )}
      </div>

      {errorMsg && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {errorMsg}
        </div>
      )}

      {loading ? (
        <div className="text-center py-12 bg-white border border-gray-200 rounded-xl text-gray-500">
          Cargando reportes...
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            <KpiCard 
              icon={FileText} 
              iconBg="bg-[#dbe2f9]" 
              iconColor="text-black"
              trend="Total" 
              trendColor="text-gray-500"
              label="TOTAL DE CONTRATOS" 
              value={totalContracts.toString()} 
            />
            <KpiCard 
              icon={CalendarOff} 
              iconBg="bg-red-50" 
              iconColor="text-[#b81121]"
              trend="Crítico" 
              trendColor="text-[#b81121]"
              label="PRÓXIMOS VENCIMIENTOS" 
              value={upcomingExpirations.toString()} 
            />
            <KpiCard 
              icon={DollarSign} 
              iconBg="bg-gray-100" 
              iconColor="text-black"
              trend="Proyectado" 
              trendColor="text-gray-500"
              label="INGRESOS PROYECTADOS" 
              value={formatCurrency(totalMonthlyBilling)} 
            />
            <KpiCard 
              icon={Repeat} 
              iconBg="bg-gray-100" 
              iconColor="text-black"
              trend="Estable" 
              trendColor="text-gray-500"
              label="TASA DE RENOVACIÓN" 
              value={renewalRate} 
            />
          </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
          <div className="flex justify-between items-center mb-8">
            <h3 className="text-lg font-semibold text-black">Vencimientos por Mes</h3>
            <button className="text-gray-400 hover:text-black transition-colors">
              <MoreVertical className="w-5 h-5" />
            </button>
          </div>
          <div className="h-[260px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fill: '#76777d', fontFamily: 'JetBrains Mono' }}
                  dy={10}
                />
                <Bar 
                  dataKey="value" 
                  radius={[4, 4, 4, 4]} 
                  barSize={40}
                >
                  {barData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={entry.active ? '#b81121' : entry.name === 'JUL' ? '#141b2c' : '#e1e3e4'} 
                      className="transition-all duration-300 hover:opacity-80 cursor-pointer"
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm flex flex-col">
          <h3 className="text-lg font-semibold text-black mb-6">Tipos de Contrato</h3>
          <div className="flex-1 flex flex-col justify-center">
            <div className="h-[200px] relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={70}
                    outerRadius={95}
                    paddingAngle={2}
                    dataKey="value"
                    stroke="none"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-3xl font-bold text-black">{totalContracts}</span>
                <span className="text-[10px] font-medium text-gray-500 uppercase tracking-wider font-['JetBrains_Mono'] mt-1">Contratos</span>
              </div>
            </div>
            
            <div className="space-y-4 mt-8">
              {pieData.map(item => (
                <div key={item.name} className="flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <div className="w-3.5 h-3.5 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="text-sm text-gray-700">{item.name}</span>
                  </div>
                  <span className="text-sm font-medium text-gray-600 font-['JetBrains_Mono']">{item.value}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-200 flex justify-between items-center bg-white">
          <h3 className="text-lg font-semibold text-black">Contratos Críticos</h3>
          <div className="flex items-center gap-3">
            <button 
              onClick={exportCriticalToExcel}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-bold text-green-700 hover:bg-gray-50 transition-colors shadow-sm"
            >
              <Download className="w-3.5 h-3.5" /> Exportar a Excel
            </button>
            <button onClick={() => onNavigate?.('vencimientos')} className="text-sm font-bold text-black hover:underline font-semibold">Ver todos</button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider font-['JetBrains_Mono']">Empresa / Cliente</th>
                <th className="px-6 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider font-['JetBrains_Mono']">Tipo</th>
                <th className="px-6 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider font-['JetBrains_Mono']">Vencimiento</th>
                <th className="px-6 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider font-['JetBrains_Mono']">Monto</th>
                <th className="px-6 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider font-['JetBrains_Mono']">Estado</th>
                <th className="px-6 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {criticalContracts.map((contract) => (
                <tr key={contract.id} className="hover:bg-gray-50 transition-colors cursor-pointer group">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-sm font-bold text-black group-hover:bg-gray-200 transition-colors">
                        {contract.initials}
                      </div>
                      <div>
                        <div className="text-sm font-bold text-black">{contract.company}</div>
                        <div className="text-xs text-gray-500">{contract.client}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                    {contract.type}
                  </td>
                  <td className={`px-6 py-4 whitespace-nowrap text-sm font-semibold ${contract.status === 'Crítico' ? 'text-[#b81121]' : 'text-gray-900'}`}>
                    {contract.date}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 font-['JetBrains_Mono']">
                    {contract.amount}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      contract.status === 'Crítico' 
                        ? 'bg-red-50 text-red-700' 
                        : 'bg-[#d7e3fc] text-[#0f1c2e]'
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
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden mt-6">
        <div className="px-6 py-5 border-b border-gray-200 flex justify-between items-center bg-white">
          <div className="flex items-center gap-2">
            <Package className="w-5 h-5 text-gray-500" />
            <h3 className="text-lg font-semibold text-black">Artículos Más Utilizados</h3>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={exportItemsToExcel}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-bold text-green-700 hover:bg-gray-50 transition-colors shadow-sm"
            >
              <Download className="w-3.5 h-3.5" /> Exportar a Excel
            </button>
            <button onClick={() => onNavigate?.('articulos')} className="text-sm font-bold text-black hover:underline font-semibold">Ver todos</button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider font-['JetBrains_Mono']">Código</th>
                <th className="px-6 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider font-['JetBrains_Mono']">Artículo</th>
                <th className="px-6 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider font-['JetBrains_Mono']">Uso / Cantidad</th>
                <th className="px-6 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider font-['JetBrains_Mono']">Prom. %</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {topItems.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-['JetBrains_Mono']">
                    {item.code}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-black">
                    {item.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 font-['JetBrains_Mono']">
                    {item.quantity}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 font-['JetBrains_Mono']">
                    {item.percentage}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
        </>
      )}
    </div>
  );
}

function KpiCard({ icon: Icon, iconBg, iconColor, trend, trendUp, trendColor, label, value }: any) {
  return (
    <div className="bg-white border border-gray-200 p-6 rounded-xl shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start">
        <div className={`p-2 rounded-lg ${iconBg}`}>
          <Icon className={`w-6 h-6 ${iconColor}`} />
        </div>
        <div className={`text-xs font-bold flex items-center gap-0.5 ${trendColor || 'text-green-600'}`}>
          {trend}
          {trendUp && <TrendingUp className="w-3 h-3" />}
        </div>
      </div>
      <div className="mt-8">
        <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest font-['JetBrains_Mono'] mb-1">
          {label}
        </p>
        <h3 className="text-3xl font-bold text-black tracking-tight">{value}</h3>
      </div>
    </div>
  );
}
