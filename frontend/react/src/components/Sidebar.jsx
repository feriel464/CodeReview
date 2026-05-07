import React from 'react';
import { LayoutDashboard, Users, FileCode, Settings, Terminal, Menu } from 'lucide-react';

export default function Sidebar({ sidebarOpen, setSidebarOpen, activeSection, setActiveSection }) {
  const menuItems = [
    { id: 'dashboard', icon: LayoutDashboard, label: 'Tableau de bord', color: 'purple' },
    { id: 'users', icon: Users, label: 'Utilisateurs', color: 'pink' },
    { id: 'reviews', icon: FileCode, label: 'Revues de code', color: 'blue' },
   // { id: 'analytics', icon: Terminal, label: 'Analytiques', color: 'green' },
    { id: 'settings', icon: Settings, label: 'Paramètres', color: 'orange' },
  ];

  return (
    <aside className={`fixed left-0 top-0 h-full bg-white/80 backdrop-blur-xl border-r-2 border-gray-200 transition-all duration-300 z-40 ${
      sidebarOpen ? 'w-72' : 'w-20'
    }`}>
      <div className="p-6">
        <div className="flex items-center justify-between mb-8">
          {sidebarOpen && (
            <div className="flex items-center gap-3 animate-slide-in-left">
              <div className="relative group">
                <div className="w-10 h-10 bg-gradient-to-br from-purple-600 via-pink-600 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
                  <Terminal className="w-5 h-5 text-white" />
                </div>
                <div className="absolute inset-0 bg-gradient-to-br from-purple-600 via-pink-600 to-blue-600 rounded-xl blur-lg opacity-50" />
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600 text-transparent bg-clip-text">
                CodeReview
              </span>
            </div>
          )}
          <button 
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 hover:bg-purple-100 rounded-lg transition-colors"
          >
            <Menu className="w-5 h-5 text-gray-700" />
          </button>
        </div>

        <nav className="space-y-2">
          {menuItems.map((item) => {
            const isActive = activeSection === item.id;
            const gradientClass = isActive 
              ? item.color === 'purple' ? 'bg-gradient-to-r from-purple-600 to-purple-500'
              : item.color === 'pink' ? 'bg-gradient-to-r from-pink-600 to-pink-500'
              : item.color === 'blue' ? 'bg-gradient-to-r from-blue-600 to-blue-500'
              : item.color === 'green' ? 'bg-gradient-to-r from-green-600 to-green-500'
              : 'bg-gradient-to-r from-orange-600 to-orange-500'
              : '';
            
            return (
              <button
                key={item.id}
                onClick={() => setActiveSection(item.id)}
                className={`w-full flex items-center ${sidebarOpen ? 'gap-3' : 'justify-center'} px-4 py-3 rounded-xl transition-all group ${
                  isActive
                    ? `${gradientClass} text-white shadow-lg`
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
                title={!sidebarOpen ? item.label : ''}
              >
                <item.icon className={`w-5 h-5 flex-shrink-0 ${
                  isActive ? 'animate-bounce-slow' : ''
                }`} />
                {sidebarOpen && (
                  <span className="font-semibold text-sm">{item.label}</span>
                )}
              </button>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}
