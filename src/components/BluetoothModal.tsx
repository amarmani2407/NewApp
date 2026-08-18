import React, { useState } from 'react';
import {
  Bluetooth,
  BluetoothOff,
  RefreshCw,
  X,
  CheckCircle2,
  AlertTriangle,
  Cpu,
  Radio,
  Send,
  Zap,
} from 'lucide-react';
import { BluetoothConnectionStatus } from '../types/robot';

interface BluetoothModalProps {
  isOpen: boolean;
  onClose: () => void;
  status: BluetoothConnectionStatus;
  deviceName: string | null;
  onConnectReal: (deviceName: string) => Promise<boolean>;
  onConnectVirtual: () => Promise<boolean>;
  onDisconnect: () => void;
  onSendTestCommand: (cmd: 'F' | 'B' | 'L' | 'R' | 'S') => void;
  isSimulated: boolean;
}

export const BluetoothModal: React.FC<BluetoothModalProps> = ({
  isOpen,
  onClose,
  status,
  deviceName,
  onConnectReal,
  onConnectVirtual,
  onDisconnect,
  onSendTestCommand,
  isSimulated,
}) => {
  const [targetDeviceFilter, setTargetDeviceFilter] = useState('HC-05');
  const [isConnecting, setIsConnecting] = useState(false);

  if (!isOpen) return null;

  const handleRealConnect = async () => {
    setIsConnecting(true);
    await onConnectReal(targetDeviceFilter);
    setIsConnecting(false);
  };

  const handleVirtualConnect = async () => {
    setIsConnecting(true);
    await onConnectVirtual();
    setIsConnecting(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0A0A0C]/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-[#16181D] border border-[#2A2D35] rounded-2xl p-6 w-full max-w-md shadow-2xl flex flex-col gap-4 text-white">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-[#1F2229] border border-[#2A2D35] text-blue-400">
              <Bluetooth className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white font-mono">Bluetooth SPP Manager</h2>
              <p className="text-[10px] text-gray-400 font-mono">
                UUID: 00001101-0000-1000-8000-00805F9B34FB
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-gray-400 hover:text-white bg-[#1F2229] hover:bg-[#2A2D35] border border-[#2A2D35] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Current Connection Status Box */}
        <div className="bg-[#1F2229] border border-[#2A2D35] rounded-xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className={`w-3 h-3 rounded-full ${
                status === 'CONNECTED'
                  ? 'bg-green-500 animate-ping shadow-[0_0_8px_#22C55E]'
                  : status === 'CONNECTING'
                  ? 'bg-amber-500 animate-pulse'
                  : status === 'ERROR'
                  ? 'bg-red-500'
                  : 'bg-gray-600'
              }`}
            />
            <div>
              <p className="text-xs font-mono font-bold text-white">
                {status === 'CONNECTED'
                  ? isSimulated
                    ? 'Connected (Virtual Arduino Link)'
                    : `Connected: ${deviceName || 'HC-05 Module'}`
                  : status === 'CONNECTING'
                  ? 'Negotiating SPP Socket...'
                  : status === 'ERROR'
                  ? 'Connection Error'
                  : 'Disconnected'}
              </p>
              <p className="text-[10px] text-gray-400 font-mono mt-0.5">
                Baud: 9600 bps • 8-N-1 • ASCII Single Byte
              </p>
            </div>
          </div>

          {status === 'CONNECTED' && (
            <button
              onClick={onDisconnect}
              className="px-3.5 py-1.5 text-xs font-mono font-bold bg-red-600/20 border border-red-500/40 text-red-400 rounded-xl hover:bg-red-600/30 transition-colors"
            >
              DISCONNECT
            </button>
          )}
        </div>

        {/* Device Target Input & Scan Buttons */}
        <div className="flex flex-col gap-2.5">
          <label className="text-xs font-mono font-bold text-gray-300">
            Target Bluetooth Name / Filter
          </label>
          <input
            type="text"
            value={targetDeviceFilter}
            onChange={(e) => setTargetDeviceFilter(e.target.value)}
            placeholder="HC-05 or BT_ROBOT"
            className="w-full bg-[#0F1115] border border-[#2A2D35] rounded-xl px-3.5 py-2 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-blue-500 font-mono transition-colors"
          />

          <div className="grid grid-cols-2 gap-2.5 mt-1">
            <button
              onClick={handleRealConnect}
              disabled={isConnecting}
              className="py-3 px-3 rounded-xl bg-blue-600 hover:bg-blue-500 active:scale-98 text-white font-mono font-bold text-xs shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2 transition-all"
            >
              <Bluetooth className="w-4 h-4" />
              <span>PAIR HC-05</span>
            </button>

            <button
              onClick={handleVirtualConnect}
              disabled={isConnecting}
              className="py-3 px-3 rounded-xl bg-[#1F2229] hover:bg-[#2A2D35] active:scale-98 text-blue-400 border border-[#2A2D35] font-mono font-bold text-xs shadow-sm flex items-center justify-center gap-2 transition-all"
            >
              <Cpu className="w-4 h-4 text-blue-400" />
              <span>VIRTUAL LINK</span>
            </button>
          </div>
        </div>

        {/* Quick Test Pulse Commands */}
        {status === 'CONNECTED' && (
          <div className="bg-[#1F2229] border border-[#2A2D35] rounded-xl p-3.5 flex flex-col gap-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono font-black uppercase tracking-wider text-gray-400">
                Send 1-Byte Test Packet
              </span>
              <span className="text-[10px] text-blue-400 font-mono font-bold">Real-time TX</span>
            </div>
            <div className="grid grid-cols-5 gap-2">
              {(['F', 'B', 'L', 'R', 'S'] as const).map((cmd) => (
                <button
                  key={cmd}
                  onClick={() => onSendTestCommand(cmd)}
                  className={`py-2 rounded-lg text-xs font-mono font-black border transition-colors ${
                    cmd === 'S'
                      ? 'bg-red-600/20 border-red-500/40 text-red-400 hover:bg-red-600/30'
                      : 'bg-[#16181D] border-[#2A2D35] text-blue-400 hover:bg-blue-600/20 hover:border-blue-500/40'
                  }`}
                >
                  '{cmd}'
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Android 12+ Permissions & Guidelines */}
        <div className="bg-[#0F1115] border border-[#2A2D35] rounded-xl p-3 text-[11px] text-gray-400 leading-relaxed font-mono">
          <p className="font-bold text-gray-300 mb-1">Android 12+ Runtime Security:</p>
          <p>
            When mounting on the robot, ensure Android Settings has granted <b>Nearby Devices</b> (BLUETOOTH_CONNECT) and <b>Location</b> permissions.
          </p>
        </div>
      </div>
    </div>
  );
};

