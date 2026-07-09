import React, { useState, useEffect } from 'react';
import { Save, Plus, Trash2, Search, FileText, CheckCircle, Download, Eye, X } from 'lucide-react';
import { Organization, Item, UserIdentity } from '../types';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { supabase } from '../lib/supabase';
import tilsenLogoImg from '../Assets/image.png';
import fncLogoImg from '../Assets/FNC.png';

interface AddedItem {
  id: string;
  item: Item;
  cantidad?: number | undefined;
  descuento?: number | undefined;
  cantidadRaw: string;
  descuentoRaw: string;
}

interface NuevoContratoProps {
  identity: UserIdentity;
  onComplete?: () => void;
  onLogout?: () => void;
}

export default function NuevoContrato({ identity, onComplete, onLogout }: NuevoContratoProps) {
  const [items, setItems] = useState<Item[]>([]);
  const org = identity.organization;
  const person = identity.name;
  // Tilsen logo is always used in PDF contracts regardless of org
  const headerLogoSrc = org === 'FNC' ? fncLogoImg : tilsenLogoImg;
  
  const [nombre, setNombre] = useState('');
  const [codigoCliente, setCodigoCliente] = useState('');
  const [tipoAcuerdo, setTipoAcuerdo] = useState('A vencimiento');
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaVencimiento, setFechaVencimiento] = useState('');
  const [email, setEmail] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  const [aporteItems, setAporteItems] = useState<AddedItem[]>([]);
  const [descuentoItems, setDescuentoItems] = useState<AddedItem[]>([]);
  
  const [searchAporte, setSearchAporte] = useState('');
  const [searchDescuento, setSearchDescuento] = useState('');
  const [showAporteList, setShowAporteList] = useState(false);
  const [showDescuentoList, setShowDescuentoList] = useState(false);
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null);
  const [logoBase64, setLogoBase64] = useState<string | null>(null);

  useEffect(() => {
    fetchItems();

    // Always load Tilsen logo for PDF (brand consistency)
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
          console.error('Error generating base64 from logo:', e);
        }
      }
    };
    img.src = tilsenLogoImg;
  }, []);

  const fetchItems = async () => {
    const { data } = await supabase.from('articulos').select('*').order('nombre');
    if (data) setItems(data);
  };

  const filteredAporteItems = items.filter(item => 
    item.nombre.toLowerCase().includes(searchAporte.toLowerCase()) || 
    item.codigo.toLowerCase().includes(searchAporte.toLowerCase())
  );

  const filteredDescuentoItems = items.filter(item => 
    item.nombre.toLowerCase().includes(searchDescuento.toLowerCase()) || 
    item.codigo.toLowerCase().includes(searchDescuento.toLowerCase())
  );

  const addAporteItem = (item: Item) => {
    setAporteItems([...aporteItems, { id: crypto.randomUUID(), item, cantidad: 1, cantidadRaw: '1', descuentoRaw: '' }]);
    setSearchAporte('');
  };

  const addDescuentoItem = (item: Item) => {
    setDescuentoItems([...descuentoItems, { id: crypto.randomUUID(), item, descuento: undefined, descuentoRaw: '', cantidadRaw: '' }]);
    setSearchDescuento('');
  };

  const removeAporteItem = (id: string) => {
    setAporteItems(aporteItems.filter(ai => ai.id !== id));
  };

  const removeDescuentoItem = (id: string) => {
    setDescuentoItems(descuentoItems.filter(ai => ai.id !== id));
  };

  const updateAporteItem = (id: string, raw: string) => {
    const num = raw === '' ? undefined : parseInt(raw);
    setAporteItems(aporteItems.map(ai =>
      ai.id === id ? { ...ai, cantidadRaw: raw, cantidad: isNaN(num as number) ? undefined : num } : ai
    ));
  };

  const updateDescuentoItem = (id: string, raw: string) => {
    const num = raw === '' ? undefined : parseFloat(raw);
    setDescuentoItems(descuentoItems.map(ai =>
      ai.id === id ? { ...ai, descuentoRaw: raw, descuento: isNaN(num as number) ? undefined : num } : ai
    ));
  };

  const generatePDF = (preview: boolean = false) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;

    // ── Tilsen Logo (large, always used regardless of org) ──
    if (logoBase64) {
      // Logo centrado y grande en la parte superior
      const logoW = 48;
      const logoH = 48;
      const logoX = (pageWidth - logoW) / 2;
      doc.addImage(logoBase64, 'PNG', logoX, 10, logoW, logoH);

      doc.setFontSize(18);
      doc.setFont("helvetica", "bold");
      doc.text('Acuerdo Comercial', pageWidth / 2, 66, { align: 'center' });

      doc.setFontSize(11);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(100);
      doc.text(`Organización: ${org}   |   Creado por: ${person}   |   Fecha: ${new Date().toLocaleDateString()}`, pageWidth / 2, 73, { align: 'center' });
      doc.setTextColor(0);

      // Separator line
      doc.setDrawColor(200);
      doc.line(14, 78, pageWidth - 14, 78);
    } else {
      doc.setFontSize(18);
      doc.setFont("helvetica", "bold");
      doc.text(`Acuerdo Comercial - ${org}`, 14, 20);
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text(`Fecha: ${new Date().toLocaleDateString()}   |   Creado por: ${person}`, 14, 28);
    }

    // Client Info — starts after the larger header (logo 48px + text + separator at y=78)
    const clientInfoY = logoBase64 ? 88 : 38;
    doc.setFontSize(13);
    doc.setFont("helvetica", "bold");
    doc.text("Información del Cliente", 14, clientInfoY);
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Nombre: ${nombre}`, 14, clientInfoY + 8);
    doc.text(`Código: ${codigoCliente}`, 14, clientInfoY + 14);
    doc.text(`Email: ${email}`, 14, clientInfoY + 20);

    doc.text(`Tipo de Acuerdo: ${tipoAcuerdo}`, 14, clientInfoY + 26);
    if (tipoAcuerdo === 'A vencimiento') {
      doc.text(`Fecha de Inicio: ${fechaInicio}`, 14, clientInfoY + 32);
      doc.text(`Fecha de Vencimiento: ${fechaVencimiento}`, 14, clientInfoY + 38);
    }

    let startY = clientInfoY + (tipoAcuerdo === 'A vencimiento' ? 48 : 36);

    // Aporte Table
    if (aporteItems.length > 0) {
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("Aporte (Productos/Servicios)", 14, startY);
      
      const aporteBody = aporteItems.map(ai => [
        ai.item.codigo,
        ai.item.nombre,
        ai.cantidad?.toString() || '0'
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
    if (descuentoItems.length > 0) {
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("Descuentos Aplicados", 14, startY);
      
      const descuentoBody = descuentoItems.map(ai => [
        ai.item.codigo,
        ai.item.nombre,
        `${ai.descuento || 0}%`
      ]);

      autoTable(doc, {
        startY: startY + 6,
        head: [['Código', 'Artículo', 'Descuento (%)']],
        body: descuentoBody,
        theme: 'grid',
        headStyles: { fillColor: [0, 0, 0] }
      });
    }

    // Footer
    const pageHeight = doc.internal.pageSize.height;
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text("Este documento es generado automáticamente por el sistema de gestión de acuerdos.", 14, pageHeight - 10);

    if (preview) {
      const pdfBlob = doc.output('blob');
      const url = URL.createObjectURL(pdfBlob);
      setPdfPreviewUrl(url);
    } else {
      doc.save(`Contrato_${codigoCliente || 'Nuevo'}.pdf`);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErrorMsg(null);
    try {
      // 1. Insert/find client
      let client;
      const { data: existingClient } = await supabase
        .from('clientes')
        .select('*')
        .eq('codigo', codigoCliente)
        .maybeSingle();

      if (existingClient) {
        client = existingClient;
        // Optionally update email if provided
        if (email && existingClient.email !== email) {
          await supabase
            .from('clientes')
            .update({ email })
            .eq('id', existingClient.id);
        }
      } else {
        const { data: newClient, error: clientErr } = await supabase
          .from('clientes')
          .insert({
            nombre,
            codigo: codigoCliente,
            email: email || null
          })
          .select()
          .single();
        if (clientErr) throw clientErr;
        client = newClient;
      }

      // 2. Insert contract
      const { data: newContract, error: contractErr } = await supabase
        .from('contratos')
        .insert({
          organizacion: org,
          creador: person,
          cliente_id: client.id,
          tipo: tipoAcuerdo,
          fecha_inicio: tipoAcuerdo === 'A vencimiento' && fechaInicio ? fechaInicio : null,
          fecha_vencimiento: tipoAcuerdo === 'A vencimiento' && fechaVencimiento ? fechaVencimiento : null,
          descripcion: `Acuerdo comercial del tipo ${tipoAcuerdo}`
        })
        .select()
        .single();
      if (contractErr) throw contractErr;

      // 3. Insert aportes
      if (aporteItems.length > 0) {
        const aportes = aporteItems.map(ai => ({
          contrato_id: newContract.id,
          articulo_id: ai.item.id,
          cantidad: ai.cantidad || 1
        }));
        const { error: aporteErr } = await supabase
          .from('contrato_aportes')
          .insert(aportes);
        if (aporteErr) throw aporteErr;
      }

      // 4. Insert discounts
      if (descuentoItems.length > 0) {
        const descuentos = descuentoItems.map(di => ({
          contrato_id: newContract.id,
          articulo_id: di.item.id,
          descuento: di.descuento || 0
        }));
        const { error: descuentoErr } = await supabase
          .from('contrato_descuentos')
          .insert(descuentos);
        if (descuentoErr) throw descuentoErr;
      }

      setIsSuccess(true);
    } catch (error: any) {
      console.error('Error saving contract:', error);
      setErrorMsg(error.message || 'Error al guardar el acuerdo en Supabase. Verifique las políticas de seguridad (RLS).');
    } finally {
      setSaving(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-8 text-center max-w-2xl mx-auto relative">
        {pdfPreviewUrl && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex flex-col p-8">
            <div className="bg-white rounded-2xl w-full h-full max-w-5xl mx-auto flex flex-col overflow-hidden shadow-2xl">
              <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                <h3 className="font-semibold text-black">Vista Previa del Contrato</h3>
                <button 
                  onClick={() => setPdfPreviewUrl(null)}
                  className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
              <iframe src={pdfPreviewUrl} className="w-full flex-1 border-0" title="PDF Preview" />
            </div>
          </div>
        )}

        <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mb-6">
          <CheckCircle className="w-10 h-10 text-green-500" />
        </div>
        <h2 className="text-4xl font-bold font-['Hanken_Grotesk'] text-black tracking-tight mb-4">¡Acuerdo Guardado!</h2>
        <p className="text-gray-500 text-lg mb-10">El contrato para <span className="font-semibold text-black">{nombre}</span> ha sido registrado exitosamente en el sistema.</p>
        
        <div className="flex flex-col sm:flex-row gap-4 w-full justify-center">
          <button 
            onClick={() => generatePDF(false)}
            className="flex items-center justify-center gap-2 px-8 py-3.5 bg-black text-white font-semibold rounded-xl hover:bg-gray-900 transition-all shadow-sm group"
          >
            <Download className="w-5 h-5 group-hover:-translate-y-0.5 transition-transform" />
            Descargar PDF
          </button>
          <button 
            onClick={() => generatePDF(true)}
            className="flex items-center justify-center gap-2 px-8 py-3.5 bg-white text-black border border-gray-200 font-semibold rounded-xl hover:bg-gray-50 transition-all shadow-sm group"
          >
            <Eye className="w-5 h-5" />
            Vista Previa
          </button>
        </div>
        
        <button 
          onClick={() => {
            if (onLogout) onLogout();
            else if (onComplete) onComplete();
          }}
          className="mt-12 text-sm font-semibold text-gray-500 hover:text-black transition-colors"
        >
          Crear otro acuerdo
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="pb-12">
      {/* Standalone Page Header — shows org logo */}
      <div className="bg-white border-b border-gray-100 shadow-sm mb-0">
        <div className="max-w-5xl mx-auto px-8 py-5 flex items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <img
              src={headerLogoSrc}
              alt={org}
              className="h-14 w-auto object-contain"
            />
            <div>
              <h1 className="text-2xl font-bold font-['Hanken_Grotesk'] text-black tracking-tight">Nuevo Acuerdo Comercial</h1>
              <p className="text-gray-500 mt-0.5 text-sm">
                <span className="font-semibold text-black">{org}</span>
                <span className="mx-2 text-gray-300">·</span>
                Creado por: <span className="font-semibold text-black">{person}</span>
              </p>
            </div>
          </div>
          {onLogout && (
            <button
              type="button"
              onClick={onLogout}
              className="text-xs font-semibold text-gray-400 hover:text-black transition-colors flex items-center gap-1 flex-shrink-0"
            >
              Cambiar usuario ↗
            </button>
          )}
        </div>
      </div>

      <div className="p-8 max-w-5xl mx-auto space-y-6">

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-8 space-y-10">
          
          <div>
            <h3 className="text-lg font-semibold text-black mb-6 border-b border-gray-100 pb-2">Información del Acuerdo</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-widest font-['JetBrains_Mono'] mb-2">Nombre del Cliente</label>
                <input 
                  type="text" 
                  value={nombre}
                  onChange={e => setNombre(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-2.5 outline-none focus:ring-1 focus:ring-black text-black" 
                  placeholder="Nombre del cliente" 
                  required
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-widest font-['JetBrains_Mono'] mb-2">Código de Cliente</label>
                <input 
                  type="text" 
                  value={codigoCliente}
                  onChange={e => setCodigoCliente(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-2.5 outline-none focus:ring-1 focus:ring-black text-black" 
                  placeholder="Ej. CLI-1002" 
                  required
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-widest font-['JetBrains_Mono'] mb-2">Tipo de Acuerdo</label>
                <select 
                  value={tipoAcuerdo}
                  onChange={e => setTipoAcuerdo(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-2.5 outline-none focus:ring-1 focus:ring-black text-black appearance-none cursor-pointer"
                >
                  <option>A vencimiento</option>
                  <option>Consumisión</option>
                </select>
              </div>
            </div>
          </div>

          {tipoAcuerdo === 'A vencimiento' && (
            <div>
              <h3 className="text-lg font-semibold text-black mb-6 border-b border-gray-100 pb-2">Vigencia</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-widest font-['JetBrains_Mono'] mb-2">Fecha de Inicio</label>
                  <input 
                    type="date" 
                    value={fechaInicio}
                    onChange={e => setFechaInicio(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-2.5 outline-none focus:ring-1 focus:ring-black text-gray-700" 
                    required={tipoAcuerdo === 'A vencimiento'}
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-widest font-['JetBrains_Mono'] mb-2">Fecha de Vencimiento</label>
                  <input 
                    type="date" 
                    value={fechaVencimiento}
                    onChange={e => setFechaVencimiento(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-2.5 outline-none focus:ring-1 focus:ring-black text-gray-700" 
                    required={tipoAcuerdo === 'A vencimiento'}
                  />
                </div>
              </div>
            </div>
          )}

          <div>
            <h3 className="text-lg font-semibold text-black mb-6 border-b border-gray-100 pb-2">Aporte</h3>
            
            <div className="mb-6 relative">
              <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-widest font-['JetBrains_Mono'] mb-2">Buscar Artículo por Código o Nombre</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input 
                  type="text" 
                  value={searchAporte}
                  onChange={e => setSearchAporte(e.target.value)}
                  onFocus={() => setShowAporteList(true)}
                  onBlur={() => setTimeout(() => setShowAporteList(false), 200)}
                  className="w-full bg-white border border-gray-200 rounded-lg pl-10 pr-4 py-2.5 outline-none focus:ring-1 focus:ring-black text-black" 
                  placeholder="Haga clic para ver todos o busque por código/nombre..." 
                />
              </div>
              
              {showAporteList && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                  {filteredAporteItems.length > 0 ? (
                    filteredAporteItems.map(item => (
                      <button 
                        key={item.id}
                        type="button"
                        onMouseDown={() => addAporteItem(item)}
                        className="w-full text-left px-4 py-3 hover:bg-gray-50 border-b border-gray-100 last:border-0 flex items-center justify-between"
                      >
                        <div>
                          <p className="text-sm font-semibold text-black">{item.nombre}</p>
                          <p className="text-xs text-gray-500 font-['JetBrains_Mono']">{item.codigo}</p>
                        </div>
                        <Plus className="w-4 h-4 text-gray-400" />
                      </button>
                    ))
                  ) : (
                    <div className="px-4 py-3 text-sm text-gray-500">No se encontraron artículos.</div>
                  )}
                </div>
              )}
            </div>

            {aporteItems.length > 0 ? (
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider font-['JetBrains_Mono']">Código</th>
                      <th className="px-4 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider font-['JetBrains_Mono']">Artículo</th>
                      <th className="px-4 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider font-['JetBrains_Mono']">Cantidad</th>
                      <th className="px-4 py-3 w-10"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {aporteItems.map((ai) => (
                      <tr key={ai.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm text-gray-600 font-['JetBrains_Mono']">{ai.item.codigo}</td>
                        <td className="px-4 py-3 text-sm font-semibold text-black">{ai.item.nombre}</td>
                        <td className="px-4 py-3">
                          <input 
                            type="number" 
                            min="1"
                            value={ai.cantidadRaw}
                            onChange={e => updateAporteItem(ai.id, e.target.value)}
                            placeholder="0"
                            className="w-24 bg-white border border-gray-200 rounded px-2 py-1 outline-none focus:border-black text-sm text-black"
                          />
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button 
                            type="button"
                            onClick={() => removeAporteItem(ai.id)}
                            className="text-gray-400 hover:text-red-600 transition-colors p-1"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-8 bg-gray-50 border border-gray-200 border-dashed rounded-lg">
                <p className="text-sm text-gray-500">Agregue artículos al aporte.</p>
              </div>
            )}
          </div>
          
          <div>
            <h3 className="text-lg font-semibold text-black mb-6 border-b border-gray-100 pb-2">Descuentos</h3>
            
            <div className="mb-6 relative">
              <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-widest font-['JetBrains_Mono'] mb-2">Buscar Artículo para Aplicar Descuento</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input 
                  type="text" 
                  value={searchDescuento}
                  onChange={e => setSearchDescuento(e.target.value)}
                  onFocus={() => setShowDescuentoList(true)}
                  onBlur={() => setTimeout(() => setShowDescuentoList(false), 200)}
                  className="w-full bg-white border border-gray-200 rounded-lg pl-10 pr-4 py-2.5 outline-none focus:ring-1 focus:ring-black text-black" 
                  placeholder="Haga clic para ver todos o busque por código/nombre..." 
                />
              </div>
              
              {showDescuentoList && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                  {filteredDescuentoItems.length > 0 ? (
                    filteredDescuentoItems.map(item => (
                      <button 
                        key={item.id}
                        type="button"
                        onMouseDown={() => addDescuentoItem(item)}
                        className="w-full text-left px-4 py-3 hover:bg-gray-50 border-b border-gray-100 last:border-0 flex items-center justify-between"
                      >
                        <div>
                          <p className="text-sm font-semibold text-black">{item.nombre}</p>
                          <p className="text-xs text-gray-500 font-['JetBrains_Mono']">{item.codigo}</p>
                        </div>
                        <Plus className="w-4 h-4 text-gray-400" />
                      </button>
                    ))
                  ) : (
                    <div className="px-4 py-3 text-sm text-gray-500">No se encontraron artículos.</div>
                  )}
                </div>
              )}
            </div>

            {descuentoItems.length > 0 ? (
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider font-['JetBrains_Mono']">Código</th>
                      <th className="px-4 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider font-['JetBrains_Mono']">Artículo</th>
                      <th className="px-4 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider font-['JetBrains_Mono']">Descuento (%)</th>
                      <th className="px-4 py-3 w-10"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {descuentoItems.map((ai) => (
                      <tr key={ai.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm text-gray-600 font-['JetBrains_Mono']">{ai.item.codigo}</td>
                        <td className="px-4 py-3 text-sm font-semibold text-black">{ai.item.nombre}</td>
                        <td className="px-4 py-3">
                          <input 
                            type="number" 
                            min="0"
                            max="100"
                            step="0.1"
                            value={ai.descuentoRaw}
                            onChange={e => updateDescuentoItem(ai.id, e.target.value)}
                            placeholder="0"
                            className="w-24 bg-white border border-gray-200 rounded px-2 py-1 outline-none focus:border-black text-sm text-black"
                          />
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button 
                            type="button"
                            onClick={() => removeDescuentoItem(ai.id)}
                            className="text-gray-400 hover:text-red-600 transition-colors p-1"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-8 bg-gray-50 border border-gray-200 border-dashed rounded-lg">
                <p className="text-sm text-gray-500">Agregue artículos para aplicar descuentos.</p>
              </div>
            )}
          </div>

          <div>
            <h3 className="text-lg font-semibold text-black mb-6 border-b border-gray-100 pb-2">Contacto de Confirmación</h3>
            <div>
              <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-widest font-['JetBrains_Mono'] mb-2">Correo Electrónico (Gmail) *</label>
              <input 
                type="email" 
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                className="w-full md:w-1/2 bg-gray-50 border border-gray-200 rounded-lg px-4 py-2.5 outline-none focus:ring-1 focus:ring-black text-black" 
                placeholder="usuario@gmail.com" 
              />
            </div>
          </div>

          {errorMsg && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {errorMsg}
            </div>
          )}
        </div>
        <div className="bg-gray-50 px-8 py-5 border-t border-gray-200 flex items-center justify-between">
          <button
            type="button"
            onClick={() => { if (onComplete) onComplete(); }}
            className="text-sm font-semibold text-gray-500 hover:text-black transition-colors flex items-center gap-2"
          >
            ← Volver al panel
          </button>
          <button 
            type="submit" 
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2.5 bg-black text-white font-semibold rounded-lg hover:bg-gray-900 transition-colors shadow-sm disabled:opacity-55"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Guardando...' : 'Guardar Acuerdo'}
          </button>
        </div>
      </div>
      </div>
    </form>
  );
}
