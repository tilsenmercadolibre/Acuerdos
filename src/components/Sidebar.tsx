import { Tab } from '../types';
import logoImg from '../Assets/image.png';
import { 
  LayoutDashboard, 
  Users, 
  FilePlus2, 
  CalendarOff, 
  PieChart,
  Settings,
  LogOut,
  Package
} from 'lucide-react';

interface SidebarProps {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
  onLogout?: () => void;
}

export default function Sidebar({ activeTab, onTabChange, onLogout }: SidebarProps) {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, category: 'PRINCIPAL' },
    { id: 'clientes', label: 'Clientes', icon: Users, category: 'GESTIÓN' },
    { id: 'nuevo-contrato', label: 'Nuevo Acuerdo', icon: FilePlus2, category: 'GESTIÓN' },
    { id: 'vencimientos', label: 'Vencimientos', icon: CalendarOff, category: 'GESTIÓN' },
    { id: 'articulos', label: 'Artículos', icon: Package, category: 'GESTIÓN' },
    { id: 'reportes', label: 'Reportes', icon: PieChart, category: 'GESTIÓN' },
  ] as const;

  return (
    <aside className="w-[260px] flex-shrink-0 border-r border-[#e1e3e4] bg-white flex flex-col z-20">
      <div className="h-[120px] flex items-center px-6 gap-3 flex-shrink-0">
        <img src={logoImg} alt="Logo" className="w-40 h-40 object-contain rounded-lg" />
      </div>

      <nav className="flex-1 overflow-y-auto py-4">
        {['PRINCIPAL', 'GESTIÓN', 'SISTEMA'].map(category => (
          <div key={category} className="mb-6">
            <p className="px-6 text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-2 font-['JetBrains_Mono']">
              {category}
            </p>
            {category === 'SISTEMA' ? (
              <>
                <button className="w-full flex items-center px-6 py-3 gap-3 text-gray-600 hover:bg-gray-50 transition-colors">
                  <Settings className="w-5 h-5" />
                  <span className="text-sm font-medium">Settings</span>
                </button>
                <button 
                  onClick={onLogout}
                  className="w-full flex items-center px-6 py-3 gap-3 text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  <LogOut className="w-5 h-5" />
                  <span className="text-sm font-medium">Logout</span>
                </button>
              </>
            ) : (
              navItems.filter(item => item.category === category).map(item => {
                const isActive = activeTab === item.id;
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    onClick={() => onTabChange(item.id as Tab)}
                    className={`w-full flex items-center px-6 py-3 gap-3 transition-colors relative ${
                      isActive 
                        ? 'text-black font-semibold bg-gray-50' 
                        : 'text-gray-600 hover:bg-gray-50 font-medium'
                    }`}
                  >
                    {isActive && (
                      <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-[#b81121]" />
                    )}
                    <Icon className={`w-5 h-5 ${isActive ? 'text-black' : 'text-gray-500'}`} />
                    <span className="text-sm">{item.label}</span>
                  </button>
                );
              })
            )}
          </div>
        ))}
      </nav>
    </aside>
  );
}
