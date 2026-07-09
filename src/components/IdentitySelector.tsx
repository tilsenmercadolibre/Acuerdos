import { useState } from 'react';
import { Organization, UserIdentity } from '../types';
import logoImg from '../Assets/image.png';

interface IdentitySelectorProps {
  onSelect: (identity: UserIdentity) => void;
}

const TILSEN_USERS = ['Jose', 'Alicia', 'Leonardo', 'Juaquin', 'Sabrina', 'Pepito'];
const FNC_USERS = ['Gustavo', 'Fulano', 'Fulanito', 'Fulanon'];

export default function IdentitySelector({ onSelect }: IdentitySelectorProps) {
  const [org, setOrg] = useState<Organization | null>(null);

  if (!org) {
    return (
      <div className="min-h-screen bg-[#f8f9fa] flex flex-col items-center justify-center p-4">
        <div className="bg-white p-10 rounded-2xl shadow-xl max-w-md w-full text-center border border-gray-100">
          <img src={logoImg} alt="Logo" className="w-16 h-16 object-contain mx-auto mb-6 rounded-2xl" />
          <h2 className="text-3xl font-bold font-['Hanken_Grotesk'] mb-8 text-black tracking-tight">Seleccione su Organización</h2>
          <div className="grid grid-cols-2 gap-4">
            <button 
              onClick={() => setOrg('Tilsen')}
              className="p-8 border-2 border-gray-100 rounded-xl hover:border-black hover:bg-gray-50 transition-all font-bold text-xl text-black shadow-sm"
            >
              Tilsen
            </button>
            <button 
              onClick={() => setOrg('FNC')}
              className="p-8 border-2 border-gray-100 rounded-xl hover:border-black hover:bg-gray-50 transition-all font-bold text-xl text-black shadow-sm"
            >
              FNC
            </button>
          </div>
        </div>
      </div>
    );
  }

  const users = org === 'Tilsen' ? TILSEN_USERS : FNC_USERS;

  return (
    <div className="min-h-screen bg-[#f8f9fa] flex flex-col items-center justify-center p-4">
      <div className="bg-white p-10 rounded-2xl shadow-xl max-w-md w-full text-center border border-gray-100">
        <button 
          onClick={() => setOrg(null)}
          className="text-sm font-semibold text-gray-400 hover:text-black mb-6 flex items-center gap-1 justify-center mx-auto transition-colors"
        >
          ← Volver
        </button>
        <h2 className="text-3xl font-bold font-['Hanken_Grotesk'] mb-2 text-black tracking-tight">Seleccione su Identidad</h2>
        <p className="text-sm font-bold text-gray-400 uppercase tracking-widest font-['JetBrains_Mono'] mb-8">Organización: {org}</p>
        <div className="flex flex-col gap-3">
          {users.map(user => (
            <button 
              key={user}
              onClick={() => onSelect({ organization: org, name: user })}
              className="w-full p-4 border border-gray-100 rounded-xl hover:border-black hover:bg-gray-50 transition-all font-semibold text-black shadow-sm"
            >
              {user}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
