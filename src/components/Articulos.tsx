import React, { useState, useEffect } from 'react';
import { Package, Plus, Trash2, Edit2, Search, Check, X } from 'lucide-react';
import { Item, Marca, Calibre } from '../types';
import { supabase } from '../lib/supabase';

export default function Articulos() {
  const [items, setItems] = useState<Item[]>([]);
  const [marcas, setMarcas] = useState<Marca[]>([]);
  const [calibres, setCalibres] = useState<Calibre[]>([]);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [newCode, setNewCode] = useState('');
  const [newName, setNewName] = useState('');
  const [newMarcaId, setNewMarcaId] = useState('');
  const [newCalibreId, setNewCalibreId] = useState('');
  
  const [editCode, setEditCode] = useState('');
  const [editName, setEditName] = useState('');
  const [editMarcaId, setEditMarcaId] = useState('');
  const [editCalibreId, setEditCalibreId] = useState('');

  const [activeTab, setActiveTab] = useState<'articulos' | 'marcas' | 'calibres'>('articulos');

  const [loading, setLoading] = useState(true);

  // Marcas State
  const [newMarcaName, setNewMarcaName] = useState('');
  const [editingMarcaId, setEditingMarcaId] = useState<string | null>(null);
  const [editMarcaName, setEditMarcaName] = useState('');

  // Calibres State
  const [newCalibreName, setNewCalibreName] = useState('');
  const [editingCalibreId, setEditingCalibreId] = useState<string | null>(null);
  const [editCalibreName, setEditCalibreName] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [marcasRes, calibresRes, itemsRes] = await Promise.all([
        supabase.from('marcas').select('*').order('nombre'),
        supabase.from('calibres').select('*').order('nombre'),
        supabase.from('articulos').select('*, marca:marcas(*), calibre:calibres(*)').order('nombre')
      ]);

      if (marcasRes.data) setMarcas(marcasRes.data);
      if (calibresRes.data) setCalibres(calibresRes.data);
      if (itemsRes.data) setItems(itemsRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredItems = items.filter(item => 
    item.nombre.toLowerCase().includes(searchQuery.toLowerCase()) || 
    item.codigo.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCode || !newName) return;
    
    const { data, error } = await supabase.from('articulos').insert({
      codigo: newCode,
      nombre: newName,
      marca_id: newMarcaId || null,
      calibre_id: newCalibreId || null
    }).select('*, marca:marcas(*), calibre:calibres(*)').single();
    
    if (data) {
      setItems([...items, data]);
      setNewCode('');
      setNewName('');
      setNewMarcaId('');
      setNewCalibreId('');
    }
    if (error) console.error(error);
  };

  const handleDeleteItem = async (id: string) => {
    const { error } = await supabase.from('articulos').delete().eq('id', id);
    if (!error) {
      setItems(items.filter(item => item.id !== id));
    }
  };

  const startEditing = (item: Item) => {
    setEditingId(item.id);
    setEditCode(item.codigo);
    setEditName(item.nombre);
    setEditMarcaId(item.marca_id || '');
    setEditCalibreId(item.calibre_id || '');
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditCode('');
    setEditName('');
    setEditMarcaId('');
    setEditCalibreId('');
  };

  const saveEdit = async (id: string) => {
    const { data, error } = await supabase.from('articulos').update({
      codigo: editCode,
      nombre: editName,
      marca_id: editMarcaId || null,
      calibre_id: editCalibreId || null
    }).eq('id', id).select('*, marca:marcas(*), calibre:calibres(*)').single();

    if (data) {
      setItems(items.map(item => item.id === id ? data : item));
      setEditingId(null);
    }
    if (error) console.error(error);
  };

  const handleAddMarca = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMarcaName) return;
    const { data, error } = await supabase.from('marcas').insert({ nombre: newMarcaName }).select().single();
    if (data) {
      setMarcas([...marcas, data].sort((a, b) => a.nombre.localeCompare(b.nombre)));
      setNewMarcaName('');
    }
    if (error) console.error(error);
  };

  const handleEditMarca = async (id: string) => {
    const { data, error } = await supabase.from('marcas').update({ nombre: editMarcaName }).eq('id', id).select().single();
    if (data) {
      setMarcas(marcas.map(m => m.id === id ? data : m).sort((a, b) => a.nombre.localeCompare(b.nombre)));
      setEditingMarcaId(null);
      fetchData(); // Refresh items to show updated marca name
    }
    if (error) console.error(error);
  };

  const handleDeleteMarca = async (id: string) => {
    const { error } = await supabase.from('marcas').delete().eq('id', id);
    if (!error) {
      setMarcas(marcas.filter(m => m.id !== id));
      fetchData(); // Refresh items
    }
  };

  const handleAddCalibre = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCalibreName) return;
    const { data, error } = await supabase.from('calibres').insert({ nombre: newCalibreName }).select().single();
    if (data) {
      setCalibres([...calibres, data].sort((a, b) => a.nombre.localeCompare(b.nombre)));
      setNewCalibreName('');
    }
    if (error) console.error(error);
  };

  const handleEditCalibre = async (id: string) => {
    const { data, error } = await supabase.from('calibres').update({ nombre: editCalibreName }).eq('id', id).select().single();
    if (data) {
      setCalibres(calibres.map(c => c.id === id ? data : c).sort((a, b) => a.nombre.localeCompare(b.nombre)));
      setEditingCalibreId(null);
      fetchData(); // Refresh items
    }
    if (error) console.error(error);
  };

  const handleDeleteCalibre = async (id: string) => {
    const { error } = await supabase.from('calibres').delete().eq('id', id);
    if (!error) {
      setCalibres(calibres.filter(c => c.id !== id));
      fetchData(); // Refresh items
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-gray-500">Cargando datos...</div>;
  }

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 gap-4">
        <div>
          <h2 className="text-4xl font-bold font-['Hanken_Grotesk'] text-black tracking-tight flex items-center gap-3">
            <Package className="w-8 h-8" />
            Catálogo
          </h2>
          <p className="text-gray-500 mt-2">Gestione el catálogo de artículos, marcas y calibres.</p>
        </div>
      </div>

      <div className="flex border-b border-gray-200 mb-6">
        <button
          onClick={() => setActiveTab('articulos')}
          className={`px-6 py-3 text-sm font-semibold border-b-2 transition-colors ${activeTab === 'articulos' ? 'border-black text-black' : 'border-transparent text-gray-500 hover:text-black hover:border-gray-300'}`}
        >
          Artículos
        </button>
        <button
          onClick={() => setActiveTab('marcas')}
          className={`px-6 py-3 text-sm font-semibold border-b-2 transition-colors ${activeTab === 'marcas' ? 'border-black text-black' : 'border-transparent text-gray-500 hover:text-black hover:border-gray-300'}`}
        >
          Marcas
        </button>
        <button
          onClick={() => setActiveTab('calibres')}
          className={`px-6 py-3 text-sm font-semibold border-b-2 transition-colors ${activeTab === 'calibres' ? 'border-black text-black' : 'border-transparent text-gray-500 hover:text-black hover:border-gray-300'}`}
        >
          Calibres
        </button>
      </div>

      {activeTab === 'articulos' && (
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        <div className="xl:col-span-1">
          <form onSubmit={handleAddItem} className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm sticky top-8">
            <h3 className="text-lg font-semibold text-black mb-4 pb-2 border-b border-gray-100">Nuevo Artículo</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-widest font-['JetBrains_Mono'] mb-2">Código</label>
                <input 
                  type="text" 
                  value={newCode}
                  onChange={e => setNewCode(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-2 text-sm outline-none focus:ring-1 focus:ring-black text-black"
                  placeholder="Ej. s005"
                  required
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-widest font-['JetBrains_Mono'] mb-2">Nombre</label>
                <input 
                  type="text" 
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-2 text-sm outline-none focus:ring-1 focus:ring-black text-black"
                  placeholder="Ej. Patagonia"
                  required
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-widest font-['JetBrains_Mono'] mb-2">Marca</label>
                <select 
                  value={newMarcaId}
                  onChange={e => setNewMarcaId(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-2 text-sm outline-none focus:ring-1 focus:ring-black text-black"
                >
                  <option value="">Seleccione marca...</option>
                  {marcas.map(m => (
                    <option key={m.id} value={m.id}>{m.nombre}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-widest font-['JetBrains_Mono'] mb-2">Calibre</label>
                <select 
                  value={newCalibreId}
                  onChange={e => setNewCalibreId(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-2 text-sm outline-none focus:ring-1 focus:ring-black text-black"
                >
                  <option value="">Seleccione calibre...</option>
                  {calibres.map(c => (
                    <option key={c.id} value={c.id}>{c.nombre}</option>
                  ))}
                </select>
              </div>
              <button 
                type="submit"
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-black text-white font-semibold rounded-lg hover:bg-gray-900 transition-colors shadow-sm mt-4"
              >
                <Plus className="w-4 h-4" />
                Agregar Artículo
              </button>
            </div>
          </form>
        </div>

        <div className="xl:col-span-3 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar artículos..."
              className="w-full bg-white border border-gray-200 rounded-lg pl-10 pr-4 py-3 text-sm outline-none focus:ring-1 focus:ring-black text-black shadow-sm"
            />
          </div>

          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
            <table className="w-full text-left border-collapse">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider font-['JetBrains_Mono'] w-24">Código</th>
                  <th className="px-6 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider font-['JetBrains_Mono']">Nombre</th>
                  <th className="px-6 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider font-['JetBrains_Mono']">Marca</th>
                  <th className="px-6 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider font-['JetBrains_Mono']">Calibre</th>
                  <th className="px-6 py-3 w-24"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredItems.length > 0 ? (
                  filteredItems.map(item => (
                    <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                      {editingId === item.id ? (
                        <>
                          <td className="px-6 py-3">
                            <input
                              type="text"
                              value={editCode}
                              onChange={e => setEditCode(e.target.value)}
                              className="w-full bg-white border border-gray-300 rounded px-2 py-1 text-sm outline-none focus:border-black font-['JetBrains_Mono'] text-gray-600"
                            />
                          </td>
                          <td className="px-6 py-3">
                            <input
                              type="text"
                              value={editName}
                              onChange={e => setEditName(e.target.value)}
                              className="w-full bg-white border border-gray-300 rounded px-2 py-1 text-sm outline-none focus:border-black text-black font-semibold"
                            />
                          </td>
                          <td className="px-6 py-3">
                            <select 
                              value={editMarcaId}
                              onChange={e => setEditMarcaId(e.target.value)}
                              className="w-full bg-white border border-gray-300 rounded px-2 py-1 text-sm outline-none focus:border-black text-black"
                            >
                              <option value="">Ninguna</option>
                              {marcas.map(m => <option key={m.id} value={m.id}>{m.nombre}</option>)}
                            </select>
                          </td>
                          <td className="px-6 py-3">
                            <select 
                              value={editCalibreId}
                              onChange={e => setEditCalibreId(e.target.value)}
                              className="w-full bg-white border border-gray-300 rounded px-2 py-1 text-sm outline-none focus:border-black text-black"
                            >
                              <option value="">Ninguno</option>
                              {calibres.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                            </select>
                          </td>
                          <td className="px-6 py-3">
                            <div className="flex justify-end gap-1">
                              <button onClick={() => saveEdit(item.id)} className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg transition-colors">
                                <Check className="w-4 h-4" />
                              </button>
                              <button onClick={cancelEditing} className="p-1.5 text-gray-400 hover:bg-gray-100 rounded-lg transition-colors">
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="px-6 py-4 text-sm text-gray-600 font-['JetBrains_Mono']">{item.codigo}</td>
                          <td className="px-6 py-4 text-sm font-semibold text-black">{item.nombre}</td>
                          <td className="px-6 py-4 text-sm text-gray-600">{item.marca?.nombre || '-'}</td>
                          <td className="px-6 py-4 text-sm text-gray-600">{item.calibre?.nombre || '-'}</td>
                          <td className="px-6 py-4">
                            <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity" style={{ opacity: 1 }}>
                              <button onClick={() => startEditing(item)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button onClick={() => handleDeleteItem(item.id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </>
                      )}
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-gray-500 text-sm">
                      No se encontraron artículos.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      )}

      {activeTab === 'marcas' && (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <form onSubmit={handleAddMarca} className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
            <h3 className="text-lg font-semibold text-black mb-4 pb-2 border-b border-gray-100">Nueva Marca</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-widest font-['JetBrains_Mono'] mb-2">Nombre</label>
                <input 
                  type="text" 
                  value={newMarcaName}
                  onChange={e => setNewMarcaName(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-2 text-sm outline-none focus:ring-1 focus:ring-black text-black"
                  placeholder="Ej. Pilsen"
                  required
                />
              </div>
              <button 
                type="submit"
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-black text-white font-semibold rounded-lg hover:bg-gray-900 transition-colors shadow-sm"
              >
                <Plus className="w-4 h-4" />
                Agregar Marca
              </button>
            </div>
          </form>
        </div>
        <div className="lg:col-span-2">
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
            <table className="w-full text-left border-collapse">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider font-['JetBrains_Mono']">Nombre de Marca</th>
                  <th className="px-6 py-3 w-24"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {marcas.length > 0 ? marcas.map(m => (
                  <tr key={m.id} className="hover:bg-gray-50 transition-colors">
                    {editingMarcaId === m.id ? (
                      <>
                        <td className="px-6 py-3">
                          <input
                            type="text"
                            value={editMarcaName}
                            onChange={e => setEditMarcaName(e.target.value)}
                            className="w-full bg-white border border-gray-300 rounded px-2 py-1 text-sm outline-none focus:border-black font-semibold text-black"
                          />
                        </td>
                        <td className="px-6 py-3">
                          <div className="flex justify-end gap-1">
                            <button onClick={() => handleEditMarca(m.id)} className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg transition-colors">
                              <Check className="w-4 h-4" />
                            </button>
                            <button onClick={() => setEditingMarcaId(null)} className="p-1.5 text-gray-400 hover:bg-gray-100 rounded-lg transition-colors">
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="px-6 py-4 text-sm font-semibold text-black">{m.nombre}</td>
                        <td className="px-6 py-4">
                          <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity" style={{ opacity: 1 }}>
                            <button onClick={() => { setEditingMarcaId(m.id); setEditMarcaName(m.nombre); }} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button onClick={() => handleDeleteMarca(m.id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </>
                    )}
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={2} className="px-6 py-8 text-center text-gray-500 text-sm">No hay marcas registradas.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      )}

      {activeTab === 'calibres' && (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <form onSubmit={handleAddCalibre} className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
            <h3 className="text-lg font-semibold text-black mb-4 pb-2 border-b border-gray-100">Nuevo Calibre</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-widest font-['JetBrains_Mono'] mb-2">Nombre</label>
                <input 
                  type="text" 
                  value={newCalibreName}
                  onChange={e => setNewCalibreName(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-2 text-sm outline-none focus:ring-1 focus:ring-black text-black"
                  placeholder="Ej. 1 Litro"
                  required
                />
              </div>
              <button 
                type="submit"
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-black text-white font-semibold rounded-lg hover:bg-gray-900 transition-colors shadow-sm"
              >
                <Plus className="w-4 h-4" />
                Agregar Calibre
              </button>
            </div>
          </form>
        </div>
        <div className="lg:col-span-2">
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
            <table className="w-full text-left border-collapse">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider font-['JetBrains_Mono']">Nombre de Calibre</th>
                  <th className="px-6 py-3 w-24"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {calibres.length > 0 ? calibres.map(c => (
                  <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                    {editingCalibreId === c.id ? (
                      <>
                        <td className="px-6 py-3">
                          <input
                            type="text"
                            value={editCalibreName}
                            onChange={e => setEditCalibreName(e.target.value)}
                            className="w-full bg-white border border-gray-300 rounded px-2 py-1 text-sm outline-none focus:border-black font-semibold text-black"
                          />
                        </td>
                        <td className="px-6 py-3">
                          <div className="flex justify-end gap-1">
                            <button onClick={() => handleEditCalibre(c.id)} className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg transition-colors">
                              <Check className="w-4 h-4" />
                            </button>
                            <button onClick={() => setEditingCalibreId(null)} className="p-1.5 text-gray-400 hover:bg-gray-100 rounded-lg transition-colors">
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="px-6 py-4 text-sm font-semibold text-black">{c.nombre}</td>
                        <td className="px-6 py-4">
                          <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity" style={{ opacity: 1 }}>
                            <button onClick={() => { setEditingCalibreId(c.id); setEditCalibreName(c.nombre); }} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button onClick={() => handleDeleteCalibre(c.id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </>
                    )}
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={2} className="px-6 py-8 text-center text-gray-500 text-sm">No hay calibres registrados.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      )}
    </div>
  );
}
