import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Square,
  AlertTriangle,
  Radio,
  Gauge,
  Activity,
  Zap,
  ShieldAlert,
} from 'lucide-react';
import { MoveCommand, RobotTelemetry } from '../types/robot';

interface ManualControlTabProps {
  onSendCommand: (cmd: MoveCommand, source: 'MANUAL' | 'SAFETY_OVERRIDE', desc?: string) => void;
  telemetry: RobotTelemetry;
  isRouteRunning: boolean;
  onPauseRouteForManualOverride: () => void;
  motorSpeed: number;
  onSpeedChange: (speed: number) => void;
}

export const ManualControlTab: React.FC<ManualControlTabProps> = ({
  onSendCommand,
  telemetry,
  isRouteRunning,
  onPauseRouteForManualOverride,
  motorSpeed,
  onSpeedChange,
}) => {
  const [activePressedBtn, setActivePressedBtn] = useState<MoveCommand | null>(null);
  const [manualOverrideAlert, setManualOverrideAlert] = useState(false);
  const activePressedRef = useRef<MoveCommand | null>(null);

  // Safety trigger for manual override
  const handleButtonPress = useCallback(
    (cmd: MoveCommand) => {
      if (isRouteRunning) {
        onPauseRouteForManualOverride();
        setManualOverrideAlert(true);
      }

      setActivePressedBtn(cmd);
      activePressedRef.current = cmd;

      const descMap: Record<MoveCommand, string> = {
        F: 'Manual FORWARD (Held)',
        B: 'Manual BACKWARD (Held)',
        L: 'Manual PIVOT LEFT (Held)',
        R: 'Manual PIVOT RIGHT (Held)',
        S: 'Manual EMERGENCY STOP',
      };

      onSendCommand(cmd, 'MANUAL', descMap[cmd]);
    },
    [isRouteRunning, onPauseRouteForManualOverride, onSendCommand]
  );

  const handleButtonRelease = useCallback(
    (cmd: MoveCommand) => {
      if (cmd !== 'S' && activePressedRef.current === cmd) {
        setActivePressedBtn(null);
        activePressedRef.current = null;
        // Immediate auto-stop on release for safety
        onSendCommand('S', 'MANUAL', `Manual Release: Auto-Brake (Stop)`);
      }
    },
    [onSendCommand]
  );

  // Handle hardware keyboard shortcuts (W/A/S/D or Arrow Keys)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if inside an input field
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;

      if (e.repeat) return; // Prevent key repeat spamming

      let cmd: MoveCommand | null = null;
      if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') cmd = 'F';
      if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') cmd = 'B';
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') cmd = 'L';
      if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') cmd = 'R';
      if (e.key === ' ' || e.key === 'Escape') cmd = 'S';

      if (cmd) {
        e.preventDefault();
        handleButtonPress(cmd);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;

      let cmd: MoveCommand | null = null;
      if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') cmd = 'F';
      if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') cmd = 'B';
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') cmd = 'L';
      if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') cmd = 'R';

      if (cmd) {
        e.preventDefault();
        handleButtonRelease(cmd);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [handleButtonPress, handleButtonRelease]);

  return (
    <div id="manual-control-screen" className="flex flex-col gap-4 max-w-4xl mx-auto pb-8">
      {/* Manual Override Alert Banner */}
      {manualOverrideAlert && (
        <div className="bg-amber-950/80 border border-amber-500/50 rounded-2xl p-3.5 flex items-start justify-between gap-3 text-amber-200 text-xs shadow-lg animate-fadeIn">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
            <div>
              <p className="font-bold text-amber-300 font-mono">ROUTE PAUSED: MANUAL OVERRIDE ENGAGED</p>
              <p className="text-gray-300 text-[11px]">
                Autonomous route was safely halted because physical manual controls were triggered.
              </p>
            </div>
          </div>
          <button
            onClick={() => setManualOverrideAlert(false)}
            className="text-gray-400 hover:text-white px-2.5 py-1 text-xs rounded-lg bg-[#1F2229] border border-[#2A2D35]"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Bento Top Row: Command Feedback & Speed Gauges */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
        {/* Active Command Bento Card (6 cols) */}
        <div className="md:col-span-6 bg-[#16181D] rounded-2xl border border-[#2A2D35] p-5 flex flex-col justify-between shadow-xl relative overflow-hidden">
          <div className="absolute inset-0 bento-dot-grid opacity-20 pointer-events-none" />
          <div className="flex justify-between items-start z-10">
            <span className="text-[10px] text-gray-500 uppercase font-black tracking-widest font-mono">
              Active Command (SPP TX)
            </span>
            <span className="text-blue-400 text-[10px] font-mono font-bold flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${telemetry.currentCommand !== 'S' ? 'bg-blue-500 animate-ping shadow-[0_0_8px_#3B82F6]' : 'bg-red-500 shadow-[0_0_8px_#EF4444]'}`} />
              {telemetry.currentCommand !== 'S' ? 'TRANSMITTING' : 'BRAKE (HOLD)'}
            </span>
          </div>

          <div className="flex items-center gap-4 my-2 z-10">
            <div
              className={`w-16 h-16 rounded-2xl flex items-center justify-center font-mono font-black text-3xl border transition-all ${
                telemetry.currentCommand === 'S'
                  ? 'bg-red-600/20 border-red-500/60 text-red-400 shadow-[0_0_15px_rgba(239,68,68,0.2)]'
                  : 'bg-blue-600/20 border-blue-500/80 text-blue-400 shadow-[0_0_18px_rgba(59,130,246,0.35)] animate-pulse'
              }`}
            >
              '{telemetry.currentCommand}'
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-white font-mono truncate">
                {telemetry.lastCommandSent?.description || "Standby (Brake 'S')"}
              </p>
              <p className="text-[11px] text-gray-500 font-mono mt-0.5">
                Timestamp: {telemetry.lastCommandSent?.time || 'Ready'}
              </p>
            </div>
          </div>

          <div className="w-full bg-[#1F2229] h-1.5 rounded-full overflow-hidden z-10 border border-[#2A2D35]">
            <div
              className={`h-full transition-all duration-300 ${
                telemetry.currentCommand === 'S' ? 'bg-red-500 w-1/4' : 'bg-blue-500 w-full'
              }`}
            />
          </div>
        </div>

        {/* Velocity / Speed Bento Card (6 cols) */}
        <div className="md:col-span-6 bg-[#16181D] rounded-2xl border border-[#2A2D35] p-5 flex flex-col justify-between shadow-xl">
          <div className="flex justify-between items-start">
            <span className="text-[10px] text-gray-500 uppercase font-black tracking-widest font-mono">
              Ground Velocity
            </span>
            <span className="text-green-400 text-[10px] font-mono font-bold">
              {telemetry.currentGps.speed ? 'ACTIVE' : 'IDLE'}
            </span>
          </div>

          <div className="flex items-baseline gap-2 my-1">
            <span className="text-5xl font-black text-white tracking-tighter font-mono">
              {(telemetry.currentGps.speed || (telemetry.currentCommand !== 'S' ? 0.8 : 0.0)).toFixed(1)}
            </span>
            <span className="text-sm text-gray-500 font-bold font-mono">m/s</span>
          </div>

          <div className="flex items-center justify-between text-[10px] text-gray-400 font-mono">
            <span className="px-2 py-0.5 bg-[#1F2229] rounded border border-[#2A2D35] text-blue-400">
              PWM: {motorSpeed} ({Math.round((motorSpeed / 255) * 100)}%)
            </span>
            <span>Rate: ~{(1.5).toFixed(1)} s/m</span>
          </div>
        </div>
      </div>

      {/* Main Bento Tile: Manual Controls Override (Tactile D-Pad) */}
      <div className="bg-[#16181D] rounded-2xl border border-[#2A2D35] p-6 flex flex-col items-center justify-between shadow-2xl relative overflow-hidden">
        <div className="w-full flex items-center justify-between mb-4 border-b border-[#2A2D35] pb-3">
          <div className="flex flex-col">
            <h2 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest font-mono">
              Manual Controls Override
            </h2>
            <p className="text-[11px] text-gray-500 font-mono mt-0.5">
              Direct Single-Byte ASCII Transmit over Bluetooth SPP
            </p>
          </div>
          <span className="text-[10px] font-mono text-gray-400 bg-[#1F2229] px-3 py-1 rounded-full border border-[#2A2D35]">
            WASD / Arrow Keys Supported
          </span>
        </div>

        {/* Tactile D-PAD Cross Arrangement Grid */}
        <div className="grid grid-cols-3 gap-3.5 my-4">
          {/* Row 1: Blank, FORWARD, Blank */}
          <div />
          <div className="col-start-2">
            <button
              id="dpad-btn-forward"
              onPointerDown={() => handleButtonPress('F')}
              onPointerUp={() => handleButtonRelease('F')}
              onPointerLeave={() => handleButtonRelease('F')}
              className={`h-20 w-20 sm:h-24 sm:w-24 bg-[#1F2229] border-b-4 border-[#12141A] rounded-2xl flex flex-col items-center justify-center gap-1 active:translate-y-1 active:border-b-0 hover:bg-[#2A2D35] transition-all select-none touch-none ${
                activePressedBtn === 'F'
                  ? 'bg-blue-600 border-b-0 translate-y-1 shadow-[0_0_20px_rgba(59,130,246,0.5)]'
                  : ''
              }`}
            >
              <ArrowUp className={`w-8 h-8 ${activePressedBtn === 'F' ? 'text-white' : 'text-blue-400'}`} />
              <span className="text-[10px] font-mono font-bold text-gray-300 uppercase">FWD (F)</span>
            </button>
          </div>
          <div />

          {/* Row 2: LEFT, CENTER STOP, RIGHT */}
          <button
            id="dpad-btn-left"
            onPointerDown={() => handleButtonPress('L')}
            onPointerUp={() => handleButtonRelease('L')}
            onPointerLeave={() => handleButtonRelease('L')}
            className={`h-20 w-20 sm:h-24 sm:w-24 bg-[#1F2229] border-b-4 border-[#12141A] rounded-2xl flex flex-col items-center justify-center gap-1 active:translate-y-1 active:border-b-0 hover:bg-[#2A2D35] transition-all select-none touch-none ${
              activePressedBtn === 'L'
                ? 'bg-blue-600 border-b-0 translate-y-1 shadow-[0_0_20px_rgba(59,130,246,0.5)]'
                : ''
            }`}
          >
            <ArrowLeft className={`w-8 h-8 ${activePressedBtn === 'L' ? 'text-white' : 'text-blue-400'}`} />
            <span className="text-[10px] font-mono font-bold text-gray-300 uppercase">LEFT (L)</span>
          </button>

          {/* Center Emergency STOP Button */}
          <button
            id="dpad-btn-stop"
            onClick={() => handleButtonPress('S')}
            className="h-20 w-20 sm:h-24 sm:w-24 bg-red-600/20 border-2 border-red-500 rounded-2xl flex flex-col items-center justify-center text-red-500 font-black shadow-[0_0_15px_rgba(239,68,68,0.25)] active:scale-95 hover:bg-red-600/30 transition-transform font-mono"
          >
            <Square className="w-8 h-8 fill-current" />
            <span className="text-xs font-black tracking-wider mt-1">STOP (S)</span>
          </button>

          <button
            id="dpad-btn-right"
            onPointerDown={() => handleButtonPress('R')}
            onPointerUp={() => handleButtonRelease('R')}
            onPointerLeave={() => handleButtonRelease('R')}
            className={`h-20 w-20 sm:h-24 sm:w-24 bg-[#1F2229] border-b-4 border-[#12141A] rounded-2xl flex flex-col items-center justify-center gap-1 active:translate-y-1 active:border-b-0 hover:bg-[#2A2D35] transition-all select-none touch-none ${
              activePressedBtn === 'R'
                ? 'bg-blue-600 border-b-0 translate-y-1 shadow-[0_0_20px_rgba(59,130,246,0.5)]'
                : ''
            }`}
          >
            <ArrowRight className={`w-8 h-8 ${activePressedBtn === 'R' ? 'text-white' : 'text-blue-400'}`} />
            <span className="text-[10px] font-mono font-bold text-gray-300 uppercase">RIGHT (R)</span>
          </button>

          {/* Row 3: Blank, BACKWARD, Blank */}
          <div />
          <div className="col-start-2">
            <button
              id="dpad-btn-backward"
              onPointerDown={() => handleButtonPress('B')}
              onPointerUp={() => handleButtonRelease('B')}
              onPointerLeave={() => handleButtonRelease('B')}
              className={`h-20 w-20 sm:h-24 sm:w-24 bg-[#1F2229] border-b-4 border-[#12141A] rounded-2xl flex flex-col items-center justify-center gap-1 active:translate-y-1 active:border-b-0 hover:bg-[#2A2D35] transition-all select-none touch-none ${
                activePressedBtn === 'B'
                  ? 'bg-blue-600 border-b-0 translate-y-1 shadow-[0_0_20px_rgba(59,130,246,0.5)]'
                  : ''
              }`}
            >
              <ArrowDown className={`w-8 h-8 ${activePressedBtn === 'B' ? 'text-white' : 'text-blue-400'}`} />
              <span className="text-[10px] font-mono font-bold text-gray-300 uppercase">BACK (B)</span>
            </button>
          </div>
          <div />
        </div>

        <p className="text-[11px] text-gray-500 font-mono italic mt-2">
          * Manual input automatically pauses active autonomous routes & sends 'S' on button release
        </p>
      </div>

      {/* PWM Duty Cycle & Speed Slider Bento Tile */}
      <div className="bg-[#16181D] rounded-2xl border border-[#2A2D35] p-5 shadow-xl">
        <div className="flex items-center justify-between mb-2.5">
          <div className="flex items-center gap-2">
            <Gauge className="w-4 h-4 text-blue-400" />
            <span className="text-xs font-bold text-gray-200 uppercase font-mono tracking-wider">
              Motor Speed Modulation (PWM)
            </span>
          </div>
          <span className="font-mono text-xs font-bold text-blue-400 bg-[#1F2229] px-2.5 py-1 rounded-lg border border-[#2A2D35]">
            {motorSpeed} / 255 PWM ({Math.round((motorSpeed / 255) * 100)}%)
          </span>
        </div>
        <input
          type="range"
          min="100"
          max="255"
          step="5"
          value={motorSpeed}
          onChange={(e) => onSpeedChange(Number(e.target.value))}
          className="w-full h-2 bg-[#1F2229] rounded-lg appearance-none cursor-pointer accent-blue-500"
        />
        <div className="flex justify-between text-[10px] text-gray-500 font-mono mt-1.5">
          <span>100 (Crawl / Precision Dock)</span>
          <span>180 (Normal Walk Rate)</span>
          <span>255 (Maximum Throttle)</span>
        </div>
      </div>
    </div>
  );
};

