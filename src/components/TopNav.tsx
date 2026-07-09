import { Search, Bell, HelpCircle, CalendarDays } from 'lucide-react';
import { UserIdentity } from '../types';

interface TopNavProps {
  identity?: UserIdentity | null;
}

export default function TopNav({ identity }: TopNavProps) {
  const initial = identity?.name ? identity.name.charAt(0).toUpperCase() : 'U';

  return (
    <header className="h-[72px] flex-shrink-0 bg-white border-b border-[#e1e3e4] flex items-center justify-between px-8 z-10">
      <div className="flex-1 max-w-md relative">
        <Search className="w-4 h-4 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2" />
        <input 
          type="text" 
          placeholder="Buscar por nombre, empresa, NIT..." 
          className="w-full pl-10 pr-4 py-2 bg-gray-50 border-none rounded-full text-sm outline-none focus:ring-1 focus:ring-black transition-all text-black"
        />
      </div>

      <div className="flex items-center gap-4">
        <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-gray-50 rounded-full border border-gray-100">
          <CalendarDays className="w-4 h-4 text-[#b81121]" />
          <span className="text-xs font-medium text-gray-700">Hoy • 12:40 PM</span>
        </div>
        
        <button className="relative p-2 text-gray-500 hover:bg-gray-50 rounded-full transition-colors">
          <Bell className="w-5 h-5" />
          <span className="absolute top-2 right-2 w-2 h-2 bg-[#b81121] rounded-full border-2 border-white" />
        </button>
        
        <button className="p-2 text-gray-500 hover:bg-gray-50 rounded-full transition-colors">
          <HelpCircle className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 ml-2 pl-4 border-l border-gray-200">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-bold text-black leading-none">{identity?.name || 'Usuario'}</p>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest font-['JetBrains_Mono'] mt-1">{identity?.organization || 'Org'}</p>
          </div>
          <div className="w-10 h-10 rounded-full bg-[#101828] text-white flex items-center justify-center font-bold shadow-sm">
            {initial}
          </div>
        </div>
      </div>
    </header>
  );
}
