import React, { useState } from 'react';
import {
  Trash2,
  Download,
  Filter,
  Terminal,
  Activity,
  Bluetooth,
  Navigation,
  AlertTriangle,
  CheckCircle,
  Search,
} from 'lucide-react';
import { LogCategory, LogEntry, LogLevel } from '../types/robot';

interface LogsTabProps {
  logs: LogEntry[];
  onClearLogs: () => void;
}

export const LogsTab: React.FC<LogsTabProps> = ({ logs, onClearLogs }) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredLogs = logs.filter((log) => {
    const matchCategory =
      selectedCategory === 'ALL' ||
      log.category === selectedCategory ||
      (selectedCategory === 'ERRORS' && (log.level === 'ERROR' || log.level === 'WARN'));
    const matchQuery =
      !searchQuery ||
      log.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (log.commandChar && log.commandChar.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchCategory && matchQuery;
  });

  const handleExportLogs = () => {
    const logText = logs
      .map(
        (l) =>
          `[${l.timestamp}] [${l.category}] [${l.level}] ${l.commandChar ? `(Cmd: '${l.commandChar}') ` : ''}${l.message}`
      )
      .join('\n');
    const blob = new Blob([logText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `robot-telemetry-logs-${Date.now()}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const getLevelBadge = (level: LogLevel) => {
    switch (level) {
      case 'SUCCESS':
        return 'bg-green-500/10 border-green-500/30 text-green-400';
      case 'WARN':
        return 'bg-amber-500/10 border-amber-500/30 text-amber-400';
      case 'ERROR':
        return 'bg-red-500/10 border-red-500/30 text-red-400';
      default:
        return 'bg-[#1F2229] border-[#2A2D35] text-gray-400';
    }
  };

  const getCategoryIcon = (category: LogCategory) => {
    switch (category) {
      case 'BLUETOOTH':
        return <Bluetooth className="w-3.5 h-3.5 text-blue-400" />;
      case 'NAVIGATION':
        return <Navigation className="w-3.5 h-3.5 text-blue-400" />;
      case 'SAFETY':
        return <AlertTriangle className="w-3.5 h-3.5 text-red-400" />;
      case 'GPS':
        return <Activity className="w-3.5 h-3.5 text-green-400" />;
      default:
        return <Terminal className="w-3.5 h-3.5 text-gray-400" />;
    }
  };

  return (
    <div id="logs-screen" className="flex flex-col gap-4 max-w-4xl mx-auto pb-8">
      {/* Header & Log Action Controls */}
      <div className="bg-[#16181D] border border-[#2A2D35] rounded-2xl p-5 shadow-xl flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-[#1F2229] border border-[#2A2D35] text-blue-400">
            <Terminal className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white tracking-tight font-mono">
              Decision & Telemetry Log Stream
            </h2>
            <p className="text-[11px] text-gray-400 font-mono">
              Live audit trail of SPP Bluetooth packets, GPS waypoint triggers, and safety stops
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            id="btn-export-logs"
            onClick={handleExportLogs}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#1F2229] hover:bg-[#2A2D35] active:scale-95 text-gray-200 border border-[#2A2D35] text-xs font-mono font-bold shadow-sm transition-all"
            title="Download full telemetry log as text file"
          >
            <Download className="w-3.5 h-3.5 text-blue-400" />
            <span>EXPORT LOG</span>
          </button>
          <button
            id="btn-clear-logs"
            onClick={onClearLogs}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#1F2229] hover:bg-red-600/20 text-gray-300 hover:text-red-400 border border-[#2A2D35] hover:border-red-500/40 text-xs font-mono font-bold shadow-sm transition-all"
            title="Clear all log entries"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>CLEAR</span>
          </button>
        </div>
      </div>

      {/* Filter Chips & Search Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 max-w-full">
          {[
            { id: 'ALL', label: 'ALL EVENTS' },
            { id: 'BLUETOOTH', label: 'BLUETOOTH (SPP)' },
            { id: 'NAVIGATION', label: 'NAVIGATION' },
            { id: 'MANUAL', label: 'MANUAL D-PAD' },
            { id: 'GPS', label: 'GPS WAYPOINTS' },
            { id: 'SAFETY', label: 'SAFETY & E-STOPS' },
            { id: 'ERRORS', label: 'WARNINGS / ERRORS' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSelectedCategory(tab.id)}
              className={`px-3 py-1.5 rounded-xl text-[11px] font-mono font-bold whitespace-nowrap border transition-all ${
                selectedCategory === tab.id
                  ? 'bg-blue-600 text-white border-blue-500 shadow-md shadow-blue-600/30'
                  : 'bg-[#16181D] text-gray-400 border-[#2A2D35] hover:bg-[#1F2229] hover:text-gray-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="relative min-w-[200px] flex-1 sm:flex-initial">
          <Search className="w-3.5 h-3.5 text-gray-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filter logs..."
            className="w-full pl-9 pr-3.5 py-1.5 bg-[#16181D] border border-[#2A2D35] rounded-xl text-xs text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 font-mono transition-colors"
          />
        </div>
      </div>

      {/* Log Feed Terminal Window */}
      <div className="bg-[#0F1115] border border-[#2A2D35] rounded-2xl p-4 shadow-2xl font-mono text-xs max-h-[520px] overflow-y-auto flex flex-col gap-2">
        {filteredLogs.length === 0 ? (
          <div className="py-16 text-center text-gray-500 font-mono">
            <Terminal className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p>No log events recorded matching filter.</p>
          </div>
        ) : (
          filteredLogs.map((entry) => (
            <div
              key={entry.id}
              className="p-2.5 rounded-xl bg-[#16181D] border border-[#2A2D35] hover:border-[#3B82F6]/50 flex items-start gap-2.5 transition-colors"
            >
              <span className="text-[10px] text-gray-500 shrink-0 select-none pt-0.5 font-mono">
                {entry.timestamp}
              </span>

              <div className="shrink-0 pt-0.5">{getCategoryIcon(entry.category)}</div>

              <span
                className={`text-[9px] font-bold font-mono px-1.5 py-0.5 rounded border shrink-0 ${getLevelBadge(
                  entry.level
                )}`}
              >
                {entry.category}
              </span>

              {entry.commandChar && (
                <span className="text-[10px] font-black font-mono px-1.5 py-0.5 rounded bg-blue-500/20 border border-blue-500/40 text-blue-400 shrink-0">
                  '{entry.commandChar}'
                </span>
              )}

              <p className="text-gray-200 text-xs flex-1 break-words leading-tight font-mono">
                {entry.message}
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

