import React from 'react';
import {
  Gamepad2,
  Map,
  Compass,
  ScrollText,
  Sliders,
  Zap,
} from 'lucide-react';
import { ActiveTab } from '../types/robot';

interface NavigationBottomBarProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  isRouteRunning: boolean;
  unreadLogsCount?: number;
}

export const NavigationBottomBar: React.FC<NavigationBottomBarProps> = ({
  activeTab,
  onTabChange,
  isRouteRunning,
  unreadLogsCount = 0,
}) => {
  const navItems = [
    {
      id: 'MANUAL' as ActiveTab,
      label: 'Manual',
      icon: Gamepad2,
      badge: null,
    },
    {
      id: 'ROUTE' as ActiveTab,
      label: 'Route / Map',
      icon: Map,
      badge: null,
    },
    {
      id: 'TRACKING' as ActiveTab,
      label: 'Tracking',
      icon: Compass,
      badge: isRouteRunning ? 'RUN' : null,
    },
    {
      id: 'LOGS' as ActiveTab,
      label: 'Logs',
      icon: ScrollText,
      badge: unreadLogsCount > 0 ? unreadLogsCount : null,
    },
    {
      id: 'SETTINGS' as ActiveTab,
      label: 'Settings',
      icon: Sliders,
      badge: null,
    },
  ];

  return (
    <nav
      id="bottom-navigation-bar"
      className="fixed bottom-3 left-3 right-3 sm:left-1/2 sm:-translate-x-1/2 sm:w-full sm:max-w-2xl z-50 bg-[#16181D] p-1.5 rounded-2xl border border-[#2A2D35] shadow-2xl backdrop-blur-xl"
    >
      <div className="grid grid-cols-5 gap-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <button
              key={item.id}
              id={`nav-tab-${item.id.toLowerCase()}`}
              onClick={() => onTabChange(item.id)}
              className={`relative flex flex-col items-center justify-center py-2 px-1 rounded-xl transition-all ${
                isActive
                  ? 'bg-blue-600 text-white font-black shadow-lg shadow-blue-600/30'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-[#1F2229] font-bold'
              }`}
            >
              <div className="relative flex items-center justify-center">
                <Icon className={`w-4 h-4 sm:w-5 sm:h-5 transition-transform ${isActive ? 'scale-110' : ''}`} />
                {item.badge && (
                  <span
                    className={`absolute -top-1.5 -right-2.5 px-1.5 py-0.2 rounded-full text-[9px] font-mono font-black ${
                      item.badge === 'RUN'
                        ? 'bg-green-500 text-slate-950 animate-pulse shadow-[0_0_8px_#22C55E]'
                        : 'bg-red-500 text-white shadow-[0_0_8px_#EF4444]'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </div>
              <span className="text-[10px] sm:text-[11px] uppercase tracking-wider mt-1 font-mono leading-none whitespace-nowrap">
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

