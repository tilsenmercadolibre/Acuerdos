/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import Sidebar from './components/Sidebar';
import TopNav from './components/TopNav';
import Reportes from './components/Reportes';
import Clientes from './components/Clientes';
import NuevoContrato from './components/NuevoContrato';
import Vencimientos from './components/Vencimientos';
import Articulos from './components/Articulos';
import IdentitySelector from './components/IdentitySelector';
import Dashboard from './components/Dashboard';
import AcuerdosSelector from './components/AcuerdosSelector';
import { Tab, UserIdentity } from './types';

// ─── Route Detection ─────────────────────────────────────────────────────────
const isAcuerdosRoute =
  window.location.pathname === '/nuevoacuerdo' ||
  window.location.pathname.startsWith('/nuevoacuerdo/');

// ─── Standalone /acuerdos App ─────────────────────────────────────────────────
function AcuerdosApp() {
  const STORAGE_KEY = 'acuerdos_identity';

  const [identity, setIdentity] = useState<UserIdentity | null>(() => {
    try {
      const saved = sessionStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const handleSelect = (id: UserIdentity) => {
    setIdentity(id);
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(id));
  };

  const handleLogout = () => {
    setIdentity(null);
    sessionStorage.removeItem(STORAGE_KEY);
  };

  if (!identity) {
    return <AcuerdosSelector onSelect={handleSelect} />;
  }

  return (
    <div className="min-h-screen bg-[#f8f9fa] text-[#191c1d] font-sans">
      <main className="min-h-screen overflow-y-auto">
        <NuevoContrato
          identity={identity}
          onComplete={handleLogout}
          onLogout={handleLogout}
        />
      </main>
    </div>
  );
}

// ─── Main Dashboard App ───────────────────────────────────────────────────────
export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('reportes');
  const [identity, setIdentity] = useState<UserIdentity | null>(() => {
    const saved = localStorage.getItem('user_identity');
    return saved ? JSON.parse(saved) : null;
  });

  // If the URL is /acuerdos, render the completely isolated creation page
  if (isAcuerdosRoute) {
    return <AcuerdosApp />;
  }

  const handleSelectIdentity = (id: UserIdentity) => {
    setIdentity(id);
    localStorage.setItem('user_identity', JSON.stringify(id));
  };

  const handleLogout = () => {
    setIdentity(null);
    localStorage.removeItem('user_identity');
    setActiveTab('reportes');
  };

  if (!identity) {
    return <IdentitySelector onSelect={handleSelectIdentity} />;
  }

  if (activeTab === 'nuevo-contrato') {
    return (
      <div className="min-h-screen bg-[#f8f9fa] text-[#191c1d] font-sans">
        <main className="min-h-screen overflow-y-auto">
          <NuevoContrato identity={identity} onComplete={() => setActiveTab('reportes')} />
        </main>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-[#f8f9fa] text-[#191c1d] overflow-hidden font-sans">
      <Sidebar activeTab={activeTab} onTabChange={setActiveTab} onLogout={handleLogout} />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative z-0">
        <TopNav identity={identity} />
        <main className="flex-1 overflow-y-auto">
          {activeTab === 'dashboard' && (
            <Dashboard identity={identity} onNavigate={(tab) => setActiveTab(tab)} />
          )}
          {activeTab === 'reportes' && <Reportes onNavigate={(tab) => setActiveTab(tab)} />}
          {activeTab === 'clientes' && <Clientes />}
          {activeTab === 'vencimientos' && <Vencimientos identity={identity} />}
          {activeTab === 'articulos' && <Articulos />}
        </main>
      </div>
    </div>
  );
}
