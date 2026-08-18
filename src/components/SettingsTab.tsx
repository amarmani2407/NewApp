import React, { useState } from 'react';
import {
  Sliders,
  Cpu,
  Smartphone,
  Copy,
  Check,
  RotateCcw,
  Radio,
  Key,
  Shield,
  Clock,
  Compass,
  Gauge,
  Zap,
} from 'lucide-react';
import { CalibrationSettings } from '../types/robot';
import { ARDUINO_UNO_FIRMWARE_SKETCH } from '../data/arduinoCode';
import { ANDROID_KOTLIN_FILES } from '../data/androidKotlinCode';

interface SettingsTabProps {
  settings: CalibrationSettings;
  onUpdateSettings: (newSettings: Partial<CalibrationSettings>) => void;
  onResetDefaults: () => void;
  onOpenApkHub?: () => void;
}

export const SettingsTab: React.FC<SettingsTabProps> = ({
  settings,
  onUpdateSettings,
  onResetDefaults,
  onOpenApkHub,
}) => {
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [activeCodeTab, setActiveCodeTab] = useState<'ARDUINO' | 'KOTLIN_BT' | 'KOTLIN_NAV' | 'KOTLIN_MANIFEST'>('ARDUINO');

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(label);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  return (
    <div id="settings-screen" className="flex flex-col gap-5 max-w-4xl mx-auto pb-8">
      {/* 0. Android APK & Mobile Phone Deployment Hub Card */}
      <div className="bg-gradient-to-r from-blue-950/40 via-[#16181D] to-[#16181D] border border-blue-500/30 rounded-2xl p-5 shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-blue-600/20 border border-blue-500/40 text-blue-400 shrink-0">
            <Smartphone className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-white tracking-tight font-mono">
                Android APK & On-Device Deployment Hub
              </h2>
              <span className="text-[9px] font-mono font-bold bg-green-500/20 border border-green-500/40 text-green-400 px-2 py-0.5 rounded-full">
                READY
              </span>
            </div>
            <p className="text-[11px] text-gray-400 font-mono mt-0.5">
              Install as standalone WebAPK, generate signed .apk via PWABuilder, or download Android Studio project (.zip).
            </p>
          </div>
        </div>

        {onOpenApkHub && (
          <button
            onClick={onOpenApkHub}
            className="w-full sm:w-auto px-5 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-mono font-bold text-xs shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2 transition-all active:scale-98 shrink-0"
          >
            <Smartphone className="w-4 h-4" />
            <span>OPEN APK / INSTALL HUB</span>
          </button>
        )}
      </div>

      {/* 1. Hardware Calibration & Execution Parameters Card */}
      <div className="bg-[#16181D] border border-[#2A2D35] rounded-2xl p-5 shadow-xl flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-[#1F2229] border border-[#2A2D35] text-blue-400">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white tracking-tight font-mono">
                Robot Calibration & Navigation Parameters
              </h2>
              <p className="text-[11px] text-gray-400 font-mono">
                Calibrated timing for turns, forward speeds, and GPS waypoint threshold triggers
              </p>
            </div>
          </div>

          <button
            onClick={onResetDefaults}
            className="flex items-center gap-1.5 text-xs font-mono font-bold text-gray-400 hover:text-white bg-[#1F2229] px-3.5 py-1.5 rounded-xl border border-[#2A2D35] hover:bg-[#2A2D35] transition-colors shadow-sm"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>RESET DEFAULTS</span>
          </button>
        </div>

        {/* Execution Mode Selector (Time-Based vs GPS-Based) */}
        <div className="bg-[#1F2229] border border-[#2A2D35] rounded-xl p-4 flex flex-col gap-3">
          <label className="text-[11px] font-black uppercase tracking-wider text-gray-300 font-mono flex items-center gap-2">
            <Radio className="w-4 h-4 text-blue-400" />
            <span>Autonomous Execution Mode</span>
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              onClick={() => onUpdateSettings({ executionMode: 'TIME_BASED' })}
              className={`p-4 rounded-xl border text-left transition-all ${
                settings.executionMode === 'TIME_BASED'
                  ? 'bg-blue-600/15 border-blue-500 text-white shadow-lg shadow-blue-500/10'
                  : 'bg-[#16181D] border-[#2A2D35] text-gray-400 hover:bg-[#1A1C22]'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-mono font-black text-xs text-blue-400">⏱ TIME-BASED MODE</span>
                {settings.executionMode === 'TIME_BASED' && (
                  <span className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_8px_#3B82F6]" />
                )}
              </div>
              <p className="text-[11px] text-gray-400 mt-1.5 font-mono leading-relaxed">
                Commands run for calibrated durations (seconds/meter). Ideal for indoor testing or low-GPS areas.
              </p>
            </button>

            <button
              onClick={() => onUpdateSettings({ executionMode: 'GPS_DISTANCE_BASED' })}
              className={`p-4 rounded-xl border text-left transition-all ${
                settings.executionMode === 'GPS_DISTANCE_BASED'
                  ? 'bg-blue-600/15 border-blue-500 text-white shadow-lg shadow-blue-500/10'
                  : 'bg-[#16181D] border-[#2A2D35] text-gray-400 hover:bg-[#1A1C22]'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-mono font-black text-xs text-blue-400">📡 GPS DISTANCE MODE</span>
                {settings.executionMode === 'GPS_DISTANCE_BASED' && (
                  <span className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_8px_#3B82F6]" />
                )}
              </div>
              <p className="text-[11px] text-gray-400 mt-1.5 font-mono leading-relaxed">
                Monitors real-time phone GPS and Haversine distance, advancing to next waypoint when within threshold.
              </p>
            </button>
          </div>
        </div>

        {/* Sliders Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {/* Turn Duration */}
          <div className="bg-[#1F2229] border border-[#2A2D35] rounded-xl p-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs font-mono font-bold text-gray-300">Turn Duration (90° Pivot)</span>
              <span className="font-mono text-xs font-black text-blue-400 bg-[#16181D] px-2.5 py-0.5 rounded-lg border border-[#2A2D35]">
                {settings.turnDurationMs} ms
              </span>
            </div>
            <input
              type="range"
              min="300"
              max="2000"
              step="50"
              value={settings.turnDurationMs}
              onChange={(e) => onUpdateSettings({ turnDurationMs: Number(e.target.value) })}
              className="w-full h-1.5 bg-[#0F1115] rounded-lg appearance-none cursor-pointer accent-blue-500"
            />
            <p className="text-[10px] text-gray-500 mt-1.5 font-mono">
              Time Arduino drives left/right motors in reverse directions for 90° turn.
            </p>
          </div>

          {/* Seconds per Meter */}
          <div className="bg-[#1F2229] border border-[#2A2D35] rounded-xl p-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs font-mono font-bold text-gray-300">Forward Velocity (Sec / Meter)</span>
              <span className="font-mono text-xs font-black text-blue-400 bg-[#16181D] px-2.5 py-0.5 rounded-lg border border-[#2A2D35]">
                {settings.secondsPerMeter.toFixed(2)} s/m
              </span>
            </div>
            <input
              type="range"
              min="0.5"
              max="4.0"
              step="0.1"
              value={settings.secondsPerMeter}
              onChange={(e) => onUpdateSettings({ secondsPerMeter: Number(e.target.value) })}
              className="w-full h-1.5 bg-[#0F1115] rounded-lg appearance-none cursor-pointer accent-blue-500"
            />
            <p className="text-[10px] text-gray-500 mt-1.5 font-mono">
              Calibrated robot forward rate (~{(1 / settings.secondsPerMeter).toFixed(2)} m/s).
            </p>
          </div>

          {/* GPS Trigger Threshold */}
          <div className="bg-[#1F2229] border border-[#2A2D35] rounded-xl p-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs font-mono font-bold text-gray-300">GPS Waypoint Arrival Radius</span>
              <span className="font-mono text-xs font-black text-blue-400 bg-[#16181D] px-2.5 py-0.5 rounded-lg border border-[#2A2D35]">
                {settings.gpsTriggerThresholdMeters.toFixed(1)} meters
              </span>
            </div>
            <input
              type="range"
              min="1.0"
              max="15.0"
              step="0.5"
              value={settings.gpsTriggerThresholdMeters}
              onChange={(e) => onUpdateSettings({ gpsTriggerThresholdMeters: Number(e.target.value) })}
              className="w-full h-1.5 bg-[#0F1115] rounded-lg appearance-none cursor-pointer accent-blue-500"
            />
            <p className="text-[10px] text-gray-500 mt-1.5 font-mono">
              Distance within which the robot considers the waypoint reached to advance step.
            </p>
          </div>

          {/* Safety Buffer */}
          <div className="bg-[#1F2229] border border-[#2A2D35] rounded-xl p-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs font-mono font-bold text-gray-300">Inter-Maneuver Safety Stop</span>
              <span className="font-mono text-xs font-black text-blue-400 bg-[#16181D] px-2.5 py-0.5 rounded-lg border border-[#2A2D35]">
                {settings.safetyStopBufferMs} ms
              </span>
            </div>
            <input
              type="range"
              min="100"
              max="1000"
              step="50"
              value={settings.safetyStopBufferMs}
              onChange={(e) => onUpdateSettings({ safetyStopBufferMs: Number(e.target.value) })}
              className="w-full h-1.5 bg-[#0F1115] rounded-lg appearance-none cursor-pointer accent-blue-500"
            />
            <p className="text-[10px] text-gray-500 mt-1.5 font-mono">
              Duration robot transmits 'S' (brake) between direction changes to protect gearboxes.
            </p>
          </div>
        </div>

        {/* Google Directions API Key Input */}
        <div className="bg-[#1F2229] border border-[#2A2D35] rounded-xl p-4 flex flex-col gap-2">
          <label className="text-xs font-mono font-bold text-gray-300 flex items-center gap-2">
            <Key className="w-4 h-4 text-amber-400" />
            <span>Google Directions API Key (Optional)</span>
          </label>
          <input
            type="password"
            value={settings.googleDirectionsApiKey}
            onChange={(e) => onUpdateSettings({ googleDirectionsApiKey: e.target.value })}
            placeholder="AIzaSy..."
            className="w-full bg-[#16181D] border border-[#2A2D35] rounded-xl px-3.5 py-2 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-blue-500 font-mono transition-colors"
          />
          <p className="text-[10px] text-gray-500 font-mono">
            Stored in local state. If blank, the app uses its high-accuracy offline geometric path planner.
          </p>
        </div>
      </div>

      {/* 2. Embedded Arduino UNO & Android Kotlin Source Code Hub */}
      <div className="bg-[#16181D] border border-[#2A2D35] rounded-2xl p-5 shadow-xl flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-[#1F2229] border border-[#2A2D35] text-blue-400">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white tracking-tight font-mono">
                Embedded Arduino Firmware & Native Kotlin Source Hub
              </h2>
              <p className="text-[11px] text-gray-400 font-mono">
                Production-ready source files for flashing Arduino UNO and compiling Android Studio APK
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              onClick={() => setActiveCodeTab('ARDUINO')}
              className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold border transition-all ${
                activeCodeTab === 'ARDUINO'
                  ? 'bg-blue-600 text-white border-blue-500 shadow-md shadow-blue-600/30'
                  : 'bg-[#1F2229] text-gray-400 border-[#2A2D35] hover:text-white'
              }`}
            >
              Arduino UNO (.ino)
            </button>
            <button
              onClick={() => setActiveCodeTab('KOTLIN_BT')}
              className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold border transition-all ${
                activeCodeTab === 'KOTLIN_BT'
                  ? 'bg-blue-600 text-white border-blue-500 shadow-md shadow-blue-600/30'
                  : 'bg-[#1F2229] text-gray-400 border-[#2A2D35] hover:text-white'
              }`}
            >
              BluetoothManager.kt
            </button>
            <button
              onClick={() => setActiveCodeTab('KOTLIN_NAV')}
              className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold border transition-all ${
                activeCodeTab === 'KOTLIN_NAV'
                  ? 'bg-blue-600 text-white border-blue-500 shadow-md shadow-blue-600/30'
                  : 'bg-[#1F2229] text-gray-400 border-[#2A2D35] hover:text-white'
              }`}
            >
              NavigationService.kt
            </button>
            <button
              onClick={() => setActiveCodeTab('KOTLIN_MANIFEST')}
              className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold border transition-all ${
                activeCodeTab === 'KOTLIN_MANIFEST'
                  ? 'bg-blue-600 text-white border-blue-500 shadow-md shadow-blue-600/30'
                  : 'bg-[#1F2229] text-gray-400 border-[#2A2D35] hover:text-white'
              }`}
            >
              AndroidManifest.xml
            </button>
          </div>
        </div>

        {/* Active Code Display */}
        <div className="relative bg-[#0F1115] border border-[#2A2D35] rounded-xl p-4 overflow-hidden">
          <div className="absolute right-4 top-4 z-10">
            <button
              onClick={() => {
                const code =
                  activeCodeTab === 'ARDUINO'
                    ? ARDUINO_UNO_FIRMWARE_SKETCH
                    : activeCodeTab === 'KOTLIN_BT'
                    ? ANDROID_KOTLIN_FILES.bluetoothManager
                    : activeCodeTab === 'KOTLIN_NAV'
                    ? ANDROID_KOTLIN_FILES.navigationService
                    : ANDROID_KOTLIN_FILES.manifest;
                copyToClipboard(code, activeCodeTab);
              }}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#1F2229] hover:bg-[#2A2D35] text-xs font-mono font-bold text-blue-400 border border-[#2A2D35] shadow-md transition-all active:scale-95"
            >
              {copiedCode === activeCodeTab ? (
                <>
                  <Check className="w-3.5 h-3.5 text-green-400" />
                  <span className="text-green-400">COPIED TO CLIPBOARD!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>COPY CODE</span>
                </>
              )}
            </button>
          </div>

          <pre className="font-mono text-xs text-gray-300 max-h-[380px] overflow-y-auto pr-1 leading-relaxed">
            {activeCodeTab === 'ARDUINO' && ARDUINO_UNO_FIRMWARE_SKETCH}
            {activeCodeTab === 'KOTLIN_BT' && ANDROID_KOTLIN_FILES.bluetoothManager}
            {activeCodeTab === 'KOTLIN_NAV' && ANDROID_KOTLIN_FILES.navigationService}
            {activeCodeTab === 'KOTLIN_MANIFEST' && ANDROID_KOTLIN_FILES.manifest}
          </pre>
        </div>
      </div>
    </div>
  );
};

