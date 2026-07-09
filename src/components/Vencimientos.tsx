import { useState, useEffect } from 'react';
import { AlertCircle, Clock, CalendarDays, CheckCircle2, RefreshCw, ChevronDown, ChevronUp, Send } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { notificarAcuerdoAprobado } from '../lib/brevo';
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

const ESTADO_STYLES: Record<string, string> = {
  PENDIENTE_REVISION: 'bg-amber-50 text-amber-700 border border-amber-200',
  APROBADO:           'bg-green-50 text-green-700 border border-green-200',
  VENCIDO:            'bg-red-50 text-red-700 border border-red-200',
  RENOVADO:           'bg-blue-50 text-blue-700 border border-blue-200',
};

const ESTADO_LABEL: Record<string, string> = {
  PENDIENTE_REVISION: 'Pendiente revisión',
  APROBADO:           'Aprobado',
  VENCIDO:            'Vencido',
  RENOVADO:           'Renovado',
};

import { UserIdentity } from '../types';

interface VencimientosProps {
  identity?: UserIdentity;
}

export default function Vencimientos({ identity }: VencimientosProps) {
  const [contracts, setContracts]   = useState<any[]>([]);
  const [loading, setLoading]       = useState(true);
  const [errorMsg, setErrorMsg]     = useState<string | null>(null);
  const isJoseTilsen = identity?.name === 'Jose' && identity?.organization === 'Tilsen';
  const [expanded, setExpanded]     = useState<string | null>(null);
  const [processing, setProcessing] = useState<string | null>(null);
  const [filterEstado, setFilterEstado] = useState<string>('Todos');

  useEffect(() => { fetchContracts(); }, []);

  const fetchContracts = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const { data, error } = await supabase
        .from('contratos')
        .select('*, cliente:clientes(*), contrato_aportes(*, articulo:articulos(*)), contrato_descuentos(*, articulo:articulos(*))')
        .order('fecha_vencimiento', { ascending: true });
      if (error) throw error;
      setContracts(data || []);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al cargar contratos.');
    } finally {
      setLoading(false);
    }
  };

  // ── Acciones ────────────────────────────────────────────────────────────────

  const handleAprobar = async (c: any) => {
    setProcessing(c.id);
    try {
      const { error } = await supabase
        .from('contratos')
        .update({ estado: 'APROBADO', fecha_aprobacion: new Date().toISOString() })
        .eq('id', c.id);
      if (error) throw error;

      // Email al cliente
      await notificarAcuerdoAprobado({
        clienteNombre:    c.cliente?.nombre || 'Cliente',
        clienteEmail:     c.cliente?.email || '',
        numeroAcuerdo:    c.numero_acuerdo || `AC-${String(c.id).slice(0,6).toUpperCase()}`,
        fechaVencimiento: c.fecha_vencimiento || '',
      });

      await fetchContracts();
    } catch (err: any) {
      alert('Error: ' + err.message);
    } finally {
      setProcessing(null);
    }
  };

  const handleRenovar = async (id: string) => {
    setProcessing(id);
    try {
      const { error } = await supabase
        .from('contratos')
        .update({ renovado: true, estado: 'RENOVADO' })
        .eq('id', id);
      if (error) throw error;
      await fetchContracts();
    } catch (err: any) {
      alert('Error: ' + err.message);
    } finally {
      setProcessing(null);
    }
  };

  // ── Mapeo ────────────────────────────────────────────────────────────────────

  const mapped = contracts.map(c => {
    const clientName = c.cliente?.nombre || 'Sin Cliente';
    const initials = clientName.split(' ').map((w: string) => w.charAt(0)).join('').slice(0, 2).toUpperCase() || 'CL';
    const daysLeft = c.fecha_vencimiento
      ? Math.ceil(((parseLocalDate(c.fecha_vencimiento)?.getTime() ?? Date.now()) - Date.now()) / (1000 * 60 * 60 * 24))
      : Infinity;

    let amount = 0;
    c.contrato_aportes?.forEach((ap: any) => {
      const discObj = c.contrato_descuentos?.find((d: any) => d.articulo_id === ap.articulo_id);
      const discount = discObj ? parseFloat(discObj.descuento) : 0;
      amount += ap.cantidad * getArticlePrice(ap.articulo) * (1 - discount / 100);
    });

    let urgencia = 'Normal';
    if (!c.fecha_vencimiento)        urgencia = 'Sin vencimiento';
    else if (daysLeft < 0)           urgencia = 'Vencido';
    else if (daysLeft <= 7)          urgencia = 'Crítico';
    else if (daysLeft <= 30)         urgencia = 'Próximo';

    return { ...c, initials, clientName, daysLeft, amount, urgencia };
  });

  const filtered = filterEstado === 'Todos'
    ? mapped
    : mapped.filter(c => (c.estado || 'PENDIENTE_REVISION') === filterEstado);

  const criticalCount = mapped.filter(c => c.urgencia === 'Crítico').length;
  const upcomingCount = mapped.filter(c => c.urgencia === 'Próximo').length;
  const pendingCount  = mapped.filter(c => (c.estado || 'PENDIENTE_REVISION') === 'PENDIENTE_REVISION').length;

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-6">
      <div className="flex items-end justify-between mb-2">
        <div>
          <h2 className="text-4xl font-bold text-black font-['Hanken_Grotesk'] tracking-tight">Contratos & Vencimientos</h2>
          <p className="text-gray-500 mt-1">Gestión de estados, aprobaciones y recordatorios.</p>
        </div>
        <button onClick={fetchContracts} className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-semibold hover:bg-gray-50 transition-colors shadow-sm">
          <RefreshCw className="w-4 h-4" /> Actualizar
        </button>
      </div>

      {errorMsg && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{errorMsg}</div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-[#b81121] text-white p-6 rounded-xl shadow-sm flex items-start gap-4">
          <div className="p-3 bg-white/20 rounded-lg"><AlertCircle className="w-6 h-6" /></div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest font-['JetBrains_Mono'] opacity-80 mb-1">Críticos (≤ 7 días)</p>
            <h3 className="text-4xl font-bold tracking-tight">{criticalCount}</h3>
          </div>
        </div>
        <div className="bg-amber-500 text-white p-6 rounded-xl shadow-sm flex items-start gap-4">
          <div className="p-3 bg-white/20 rounded-lg"><Clock className="w-6 h-6" /></div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest font-['JetBrains_Mono'] opacity-80 mb-1">Próximos (≤ 30 días)</p>
            <h3 className="text-4xl font-bold tracking-tight">{upcomingCount}</h3>
          </div>
        </div>
        <div className="bg-white border border-gray-200 p-6 rounded-xl shadow-sm flex items-start gap-4">
          <div className="p-3 bg-amber-100 rounded-lg"><CalendarDays className="w-6 h-6 text-amber-600" /></div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest font-['JetBrains_Mono'] text-gray-500 mb-1">Pendientes de aprobación</p>
            <h3 className="text-4xl font-bold text-black tracking-tight">{pendingCount}</h3>
          </div>
        </div>
      </div>

      {/* Filtro por estado */}
      <div className="flex flex-wrap gap-2 items-center">
        <span className="text-xs font-bold text-gray-400 uppercase tracking-widest font-['JetBrains_Mono']">Estado:</span>
        {['Todos', 'PENDIENTE_REVISION', 'APROBADO', 'VENCIDO', 'RENOVADO'].map(e => (
          <button
            key={e}
            onClick={() => setFilterEstado(e)}
            className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-all ${
              filterEstado === e
                ? 'bg-black text-white border-black'
                : 'bg-white border-gray-200 text-gray-600 hover:border-gray-400'
            }`}
          >
            {e === 'Todos' ? 'Todos' : ESTADO_LABEL[e]}
          </button>
        ))}
      </div>

      {/* Lista */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
          <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider font-['JetBrains_Mono']">
            {filtered.length} contratos
          </h3>
        </div>

        {loading ? (
          <div className="py-12 text-center text-gray-500 text-sm">Cargando contratos...</div>
        ) : filtered.length === 0 ? (
          <div className="py-12 text-center text-gray-500 text-sm">No hay contratos en este estado.</div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filtered.map(c => {
              const isExpanded = expanded === c.id;
              const isLoading  = processing === c.id;
              const estado     = c.estado || 'PENDIENTE_REVISION';

              return (
                <div key={c.id} className="hover:bg-gray-50 transition-colors">
                  {/* Row */}
                  <div
                    className="px-6 py-4 flex items-center gap-4 cursor-pointer"
                    onClick={() => setExpanded(isExpanded ? null : c.id)}
                  >
                    {/* Avatar */}
                    <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold text-black flex-shrink-0">
                      {c.initials}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-black text-sm truncate">{c.clientName}</p>
                      <p className="text-xs text-gray-500 font-['JetBrains_Mono']">
                        {c.numero_acuerdo || `AC-${String(c.id).slice(0,6).toUpperCase()}`}
                        {c.creador && <> · {c.creador}</>}
                        {c.organizacion && <> · {c.organizacion}</>}
                      </p>
                      {c.fecha_creacion && (
                        <p className="text-[10px] text-gray-400 font-['JetBrains_Mono'] mt-0.5">
                          Creado: {formatDate(c.fecha_creacion)}
                        </p>
                      )}
                    </div>

                    {/* Vencimiento */}
                    <div className="text-right flex-shrink-0 hidden sm:block">
                      {c.fecha_vencimiento ? (
                        <>
                          <p className={`text-sm font-bold ${c.urgencia === 'Crítico' || c.urgencia === 'Vencido' ? 'text-[#b81121]' : 'text-gray-800'}`}>
                            {formatDate(c.fecha_vencimiento, { day: 'numeric', month: 'short', year: 'numeric' })}
                          </p>
                          <p className={`text-xs font-['JetBrains_Mono'] ${c.urgencia === 'Crítico' || c.urgencia === 'Vencido' ? 'text-[#b81121]' : 'text-gray-500'}`}>
                            {c.daysLeft < 0 ? `Vencido hace ${Math.abs(c.daysLeft)}d` : `${c.daysLeft} días restantes`}
                          </p>
                        </>
                      ) : (
                        <p className="text-xs text-gray-400">Sin vencimiento</p>
                      )}
                    </div>

                    {/* Monto */}
                    <div className="text-right flex-shrink-0 hidden md:block w-28">
                      <p className="text-sm font-bold text-black font-['JetBrains_Mono']">${c.amount.toLocaleString('es-CO')}</p>
                    </div>

                    {/* Estado badge */}
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider flex-shrink-0 ${ESTADO_STYLES[estado] || 'bg-gray-100 text-gray-600'}`}>
                      {ESTADO_LABEL[estado] || estado}
                    </span>

                    {/* Expand */}
                    <div className="flex-shrink-0 text-gray-400">
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </div>
                  </div>

                  {/* Expandido: acciones */}
                  {isExpanded && (
                    <div className="px-6 pb-5 bg-gray-50 border-t border-gray-100">
                      <div className="flex flex-wrap gap-3 pt-4">

                        {/* Aprobar (solo si está pendiente) */}
                        {estado === 'PENDIENTE_REVISION' && (
                          isJoseTilsen ? (
                            <button
                              disabled={isLoading}
                              onClick={() => handleAprobar(c)}
                              className="flex items-center gap-2 px-5 py-2.5 bg-black text-white text-sm font-semibold rounded-lg hover:bg-gray-900 transition-colors disabled:opacity-50 shadow-sm"
                            >
                              <CheckCircle2 className="w-4 h-4" />
                              {isLoading ? 'Aprobando...' : 'Aprobar y notificar cliente'}
                            </button>
                          ) : (
                            <div className="flex items-center gap-2 px-4 py-2.5 bg-amber-50 border border-amber-200 text-amber-800 text-xs font-semibold rounded-lg shadow-sm">
                              ⚠️ Aprobación pendiente (Solo José Zubillaga tiene permiso)
                            </div>
                          )
                        )}

                        {/* Marcar como renovado */}
                        {(estado === 'APROBADO' || estado === 'VENCIDO') && !c.renovado && (
                          <button
                            disabled={isLoading}
                            onClick={() => handleRenovar(c.id)}
                            className="flex items-center gap-2 px-5 py-2.5 bg-white border border-gray-200 text-sm font-semibold text-black rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 shadow-sm"
                          >
                            <RefreshCw className="w-4 h-4" />
                            {isLoading ? 'Guardando...' : 'Marcar como Renovado'}
                          </button>
                        )}

                        {/* Info adicional */}
                        <div className="flex-1 text-xs text-gray-500 font-['JetBrains_Mono'] pt-1 flex flex-wrap gap-x-4 gap-y-1">
                          {c.fecha_aprobacion && (
                            <span>✓ Aprobado: {new Date(c.fecha_aprobacion).toLocaleDateString('es-CO')}</span>
                          )}
                          {c.cliente?.email && <span>✉ {c.cliente.email}</span>}
                          {c.aviso_7_dias_enviado  && <span className="text-green-600">📧 Aviso 7d enviado</span>}
                          {c.aviso_1_mes_enviado   && <span className="text-green-600">📧 Aviso 1m enviado</span>}
                          {c.aviso_2_meses_enviado && <span className="text-green-600">📧 Aviso 2m enviado</span>}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
