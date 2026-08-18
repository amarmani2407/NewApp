import React from 'react';
import {
  Bluetooth,
  BluetoothOff,
  Crosshair,
  RefreshCw,
  Volume2,
  VolumeX,
  AlertOctagon,
  Bot,
  Zap,
  BatteryCharging,
} from 'lucide-react';
import { BluetoothConnectionStatus, RobotTelemetry } from '../types/robot';

interface TopAppBarProps {
  bluetoothStatus: BluetoothConnectionStatus;
  deviceName: string | null;
  onConnectClick: () => void;
  telemetry: RobotTelemetry;
  onEmergencyStop: () => void;
  audioEnabled: boolean;
  onToggleAudio: () => void;
  isRouteRunning: boolean;
  onApkClick: () => void;
}

export const TopAppBar: React.FC<TopAppBarProps> = ({
  bluetoothStatus,
  deviceName,
  onConnectClick,
  telemetry,
  onEmergencyStop,
  audioEnabled,
  onToggleAudio,
  isRouteRunning,
  onApkClick,
}) => {
  const getStatusColor = () => {
    switch (bluetoothStatus) {
      case 'CONNECTED':
        return 'bg-green-500 shadow-[0_0_8px_#22C55E]';
      case 'CONNECTING':
        return 'bg-amber-500 animate-pulse';
      case 'ERROR':
        return 'bg-red-500 shadow-[0_0_8px_#EF4444]';
      default:
        return 'bg-gray-600';
    }
  };

  const getStatusLabel = () => {
    switch (bluetoothStatus) {
      case 'CONNECTED':
        return deviceName ? `BT: ${deviceName}` : 'BT: CONNECTED';
      case 'CONNECTING':
        return 'BT: CONNECTING...';
      case 'ERROR':
        return 'BT: ERROR';
      default:
        return 'BT: DISCONNECTED';
    }
  };

  return (
    <header
      id="robot-top-appbar"
      className="sticky top-0 z-50 bg-[#16181D] border-b border-[#2A2D35] px-4 py-3 shadow-xl backdrop-blur-md"
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
        {/* Left: Brand / Title / UUID */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-[#1F2229] border border-[#2A2D35] flex items-center justify-center text-blue-400 shadow-inner shrink-0">
            <Bot className="w-5 h-5" />
          </div>
          <div className="truncate">
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-bold tracking-tight text-white font-mono uppercase leading-none truncate">
                ROBOT_BRAIN_CONTROLLER
              </h1>
              {isRouteRunning && (
                <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-blue-500/20 text-blue-400 border border-blue-500/40 shrink-0">
                  <Zap className="w-2.5 h-2.5 animate-pulse" /> AUTO
                </span>
              )}
            </div>
            <p className="text-[10px] text-gray-500 font-mono mt-0.5 truncate">
              UUID: 00001101-0000-1000-8000-00805F9B34FB • SPP RFCOMM
            </p>
          </div>
        </div>

        {/* Center/Right: Bento Status Badges & Controls */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* Bluetooth Connection Chip */}
          <button
            id="bt-status-chip"
            onClick={onConnectClick}
            className={`flex items-center gap-2 px-3 py-1.5 bg-[#1F2229] rounded-full border border-[#2A2D35] hover:border-blue-500/50 shadow-inner transition-all ${
              bluetoothStatus === 'CONNECTED'
                ? 'text-gray-200'
                : bluetoothStatus === 'CONNECTING'
                ? 'text-amber-300'
                : bluetoothStatus === 'ERROR'
                ? 'text-red-400'
                : 'text-gray-400 hover:text-gray-200'
            }`}
            title="Bluetooth SPP Link - Click to configure"
          >
            <div className={`w-2.5 h-2.5 rounded-full ${getStatusColor()}`} />
            <span className="font-mono text-[11px] font-bold tracking-tight max-w-[120px] truncate">
              {getStatusLabel()}
            </span>
            {bluetoothStatus !== 'CONNECTED' && (
              <RefreshCw className="w-3 h-3 text-gray-500 ml-0.5" />
            )}
          </button>

          {/* GPS Status Chip */}
          <div
            id="gps-status-chip"
            className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-[#1F2229] rounded-full border border-[#2A2D35]"
            title={`GPS: ±${Math.round(telemetry.currentGps.accuracy)}m (${telemetry.isSimulatedGps ? 'Simulated' : 'Live Phone GPS'})`}
          >
            <div className={`w-2.5 h-2.5 rounded-full ${telemetry.isGpsLocked ? 'bg-blue-500 shadow-[0_0_8px_#3B82F6]' : 'bg-gray-600'}`} />
            <span className="text-[11px] font-mono font-bold text-gray-300">
              GPS: {telemetry.isGpsLocked ? `LOCK (${telemetry.currentGps.accuracy.toFixed(1)}m)` : 'ACQUIRING'}
            </span>
          </div>

          {/* Battery Metric */}
          <div className="hidden md:flex flex-col items-end px-3 py-1 bg-[#1F2229] rounded-xl border border-[#2A2D35]">
            <span className="text-[9px] text-gray-500 font-bold uppercase tracking-wider">Battery</span>
            <span className="text-xs font-black text-green-400 font-mono">
              {telemetry.batteryPercent}%
            </span>
          </div>

          {/* APK / Mobile Install Button */}
          <button
            id="btn-open-apk-hub"
            onClick={onApkClick}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1F2229] hover:bg-[#2A2D35] text-blue-400 hover:text-blue-300 font-mono font-bold text-xs rounded-xl border border-[#2A2D35] hover:border-blue-500/50 shadow-inner transition-all"
            title="Download APK / Android Studio Project / PWA Install"
          >
            <span className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_6px_#22C55E]" />
            <span>APK</span>
          </button>

          {/* Audio Beeps Toggle */}
          <button
            id="btn-toggle-audio"
            onClick={onToggleAudio}
            className={`p-2 rounded-xl border transition-colors ${
              audioEnabled
                ? 'bg-[#1F2229] text-blue-400 border-[#2A2D35] hover:border-blue-500/40'
                : 'bg-[#16181D] text-gray-600 border-[#2A2D35] hover:text-gray-400'
            }`}
            title={audioEnabled ? 'Command audio telemetry enabled' : 'Muted'}
          >
            {audioEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>

          {/* Emergency E-STOP Button */}
          <button
            id="btn-emergency-estop"
            onClick={onEmergencyStop}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-red-600/20 hover:bg-red-600/30 active:scale-95 text-red-400 font-black text-xs border border-red-500/80 shadow-[0_0_12px_rgba(239,68,68,0.25)] transition-all font-mono"
            title="EMERGENCY STOP - Sends immediate 'S' brake command to Arduino"
          >
            <AlertOctagon className="w-3.5 h-3.5 text-red-500" />
            <span>E-STOP</span>
          </button>
        </div>
      </div>
    </header>
  );
};
