import { useState } from 'react';
import { Organization, UserIdentity } from '../types';
import tilsenLogo from '../Assets/image.png';
import fncLogo from '../Assets/FNC.png';

interface AcuerdosSelectorProps {
  onSelect: (identity: UserIdentity) => void;
}

const TILSEN_USERS = ['Jose', 'Alicia', 'Leonardo', 'Juaquin', 'Sabrina', 'Pepito'];
const FNC_USERS = ['Gustavo', 'Fulano', 'Fulanito', 'Fulanon'];

export default function AcuerdosSelector({ onSelect }: AcuerdosSelectorProps) {
  const [org, setOrg] = useState<Organization | null>(null);

  if (!org) {
    return (
      <div className="min-h-screen bg-[#f0f2f5] flex flex-col items-center justify-center p-4">
        <div className="bg-white p-10 rounded-2xl shadow-2xl max-w-lg w-full text-center border border-gray-100">
          {/* Tilsen logo always on top as the system brand */}
          <img src={tilsenLogo} alt="Tilsen" className="h-16 w-auto object-contain mx-auto mb-8" />
          <h2 className="text-2xl font-bold font-['Hanken_Grotesk'] mb-2 text-black tracking-tight">
            Registro de Acuerdos
          </h2>
          <p className="text-sm text-gray-500 mb-8">Seleccioná tu organización para continuar</p>
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => setOrg('Tilsen')}
              className="group flex flex-col items-center gap-4 p-8 border-2 border-gray-100 rounded-2xl hover:border-black hover:shadow-md transition-all active:scale-95"
            >
              <img src={tilsenLogo} alt="Tilsen" className="h-12 w-auto object-contain group-hover:scale-105 transition-transform" />
              <span className="font-bold text-lg text-black">Tilsen</span>
            </button>
            <button
              onClick={() => setOrg('FNC')}
              className="group flex flex-col items-center gap-4 p-8 border-2 border-gray-100 rounded-2xl hover:border-black hover:shadow-md transition-all active:scale-95"
            >
              <img src={fncLogo} alt="FNC" className="h-12 w-auto object-contain group-hover:scale-105 transition-transform" />
              <span className="font-bold text-lg text-black">FNC</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  const users = org === 'Tilsen' ? TILSEN_USERS : FNC_USERS;
  const orgLogo = org === 'Tilsen' ? tilsenLogo : fncLogo;

  return (
    <div className="min-h-screen bg-[#f0f2f5] flex flex-col items-center justify-center p-4">
      <div className="bg-white p-10 rounded-2xl shadow-2xl max-w-lg w-full text-center border border-gray-100">
        <img src={orgLogo} alt={org} className="h-16 w-auto object-contain mx-auto mb-6" />
        <button
          onClick={() => setOrg(null)}
          className="text-sm font-semibold text-gray-400 hover:text-black mb-4 flex items-center gap-1 justify-center mx-auto transition-colors"
        >
          ← Cambiar organización
        </button>
        <h2 className="text-2xl font-bold font-['Hanken_Grotesk'] mb-1 text-black tracking-tight">
          ¿Quién eres?
        </h2>
        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest font-['JetBrains_Mono'] mb-8">
          {org}
        </p>
        <div className="flex flex-col gap-3">
          {users.map(user => (
            <button
              key={user}
              onClick={() => onSelect({ organization: org, name: user })}
              className="w-full p-4 border border-gray-100 rounded-xl hover:border-black hover:bg-gray-50 transition-all font-semibold text-black shadow-sm active:scale-95"
            >
              {user}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
