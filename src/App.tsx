/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  ActiveTab,
  BluetoothConnectionStatus,
  CalibrationSettings,
  LogEntry,
  MoveCommand,
  RobotTelemetry,
  RoutePlan,
} from './types/robot';
import { bluetoothService } from './services/bluetoothService';
import { routeEngine } from './services/routeEngine';
import { DEMO_ROUTES } from './data/demoRoutes';
import { TopAppBar } from './components/TopAppBar';
import { NavigationBottomBar } from './components/NavigationBottomBar';
import { ManualControlTab } from './components/ManualControlTab';
import { RoutePlannerTab } from './components/RoutePlannerTab';
import { TrackingTab } from './components/TrackingTab';
import { LogsTab } from './components/LogsTab';
import { SettingsTab } from './components/SettingsTab';
import { BluetoothModal } from './components/BluetoothModal';
import { ApkExportModal } from './components/ApkExportModal';

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('MANUAL');
  const [bluetoothStatus, setBluetoothStatus] = useState<BluetoothConnectionStatus>('DISCONNECTED');
  const [connectedDeviceName, setConnectedDeviceName] = useState<string | null>(null);
  const [isBtModalOpen, setIsBtModalOpen] = useState(false);
  const [isApkModalOpen, setIsApkModalOpen] = useState(false);
  const [isSimulatedBt, setIsSimulatedBt] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(true);

  // Calibration Settings State
  const [settings, setSettings] = useState<CalibrationSettings>(() => routeEngine.getSettings());

  // Active Loaded Route
  const [currentRoute, setCurrentRoute] = useState<RoutePlan | null>(DEMO_ROUTES[0]);

  // Telemetry State
  const [telemetry, setTelemetry] = useState<RobotTelemetry>({
    currentGps: {
      lat: 37.7749,
      lng: -122.4194,
      accuracy: 3.0,
      speed: 0,
      heading: 0,
      timestamp: Date.now(),
    },
    isGpsLocked: true,
    isSimulatedGps: true,
    activeStepIndex: 0,
    distanceToNextWaypoint: 0,
    distanceToFinalDestination: 0,
    bearingToNextWaypoint: 0,
    totalDistanceTravelled: 0,
    currentManeuver: 'System Initialized - Standby',
    currentCommand: 'S',
    lastCommandSent: {
      command: 'S',
      time: new Date().toLocaleTimeString(),
      source: 'SYSTEM',
      description: 'System Boot: Safe Halt Active',
    },
    batteryPercent: 96,
    obstacleDetected: false,
    hardwareWatchdogSec: 2.0,
  });

  // Logs state
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [unreadLogsCount, setUnreadLogsCount] = useState(0);

  // WakeLock reference to keep mobile screen awake on robot mount
  const wakeLockRef = useRef<any>(null);

  // Initialize Route in Engine
  useEffect(() => {
    if (DEMO_ROUTES[0]) {
      routeEngine.loadRoute(DEMO_ROUTES[0]);
    }
  }, []);

  // Request WakeLock to prevent screen timeout on robot
  useEffect(() => {
    const acquireLock = async () => {
      try {
        if ('wakeLock' in navigator) {
          wakeLockRef.current = await (navigator as any).wakeLock.request('screen');
        }
      } catch {
        // WakeLock guarded
      }
    };
    acquireLock();

    return () => {
      if (wakeLockRef.current) {
        wakeLockRef.current.release();
        wakeLockRef.current = null;
      }
    };
  }, []);

  // Subscribe to Bluetooth Status & Logs
  useEffect(() => {
    const unsubBt = bluetoothService.addStatusListener((status, device) => {
      setBluetoothStatus(status);
      setConnectedDeviceName(device?.name || null);
      setIsSimulatedBt(bluetoothService.isSimulatedConnection());
    });

    const unsubLogs = bluetoothService.addLogListener((newLog) => {
      setLogs((prev) => [newLog, ...prev.slice(0, 300)]);
      if (activeTab !== 'LOGS') {
        setUnreadLogsCount((c) => Math.min(99, c + 1));
      }
    });

    const unsubTelemetry = bluetoothService.addTelemetryListener((update) => {
      setTelemetry((prev) => ({ ...prev, ...update }));
    });

    // Auto-connect to virtual link on first boot for smooth testing experience
    bluetoothService.connect('HC-05-ROBOT-01', true);

    return () => {
      unsubBt();
      unsubLogs();
      unsubTelemetry();
    };
  }, []);

  // Reset unread logs badge when opening Logs tab
  useEffect(() => {
    if (activeTab === 'LOGS') {
      setUnreadLogsCount(0);
    }
  }, [activeTab]);

  // Subscribe to Route Execution Engine Updates
  useEffect(() => {
    const unsubRoute = routeEngine.addListener((updatedRoute, updatedTelemetry) => {
      if (updatedRoute) {
        setCurrentRoute({ ...updatedRoute });
      }
      if (updatedTelemetry) {
        setTelemetry((prev) => ({ ...prev, ...updatedTelemetry }));
      }
    });

    return () => unsubRoute();
  }, []);

  // Real GPS Geolocation Watcher
  useEffect(() => {
    if (!('geolocation' in navigator)) return;

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const coords = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        };
        const speed = pos.coords.speed;
        const heading = pos.coords.heading;
        const accuracy = pos.coords.accuracy;

        setTelemetry((prev) => ({
          ...prev,
          isGpsLocked: true,
          isSimulatedGps: false,
          currentGps: {
            lat: coords.lat,
            lng: coords.lng,
            accuracy,
            speed: speed !== null ? speed : prev.currentGps.speed,
            heading: heading !== null ? heading : prev.currentGps.heading,
            timestamp: pos.timestamp,
          },
        }));

        routeEngine.updateRealGps(coords, speed, heading, accuracy);
      },
      (err) => {
        // Fall back to virtual coordinate simulation gracefully
      },
      { enableHighAccuracy: true, maximumAge: 1000, timeout: 5000 }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  // Unified Command Sender
  const handleSendCommand = useCallback(
    (cmd: MoveCommand, source: 'MANUAL' | 'SAFETY_OVERRIDE' | 'AUTONOMOUS' = 'MANUAL', desc?: string) => {
      bluetoothService.sendCommand(cmd, source, desc, audioEnabled);
    },
    [audioEnabled]
  );

  // Manual Override Pause
  const handlePauseForManualOverride = useCallback(() => {
    routeEngine.pauseRoute('Manual D-Pad Override Detected');
  }, []);

  // Emergency Stop Handler (Persistent Top Bar)
  const handleEmergencyStop = useCallback(() => {
    routeEngine.pauseRoute('Emergency E-STOP Button Pressed');
    bluetoothService.sendCommand('S', 'SAFETY_OVERRIDE', 'EMERGENCY HARD BRAKE');
  }, []);

  // Route Selection & Lifecycle Handlers
  const handleSelectRoute = (route: RoutePlan) => {
    setCurrentRoute(route);
    routeEngine.loadRoute(route);
  };

  const handleStartRoute = async () => {
    if (!currentRoute) return;
    routeEngine.loadRoute(currentRoute);
    await routeEngine.startRoute();
    setActiveTab('TRACKING');
  };

  const handlePauseRoute = () => {
    routeEngine.pauseRoute('User Pressed Pause');
  };

  const handleResumeRoute = () => {
    routeEngine.resumeRoute();
  };

  const handleStopRoute = () => {
    routeEngine.stopRoute(true);
  };

  const handleUpdateSettings = (newSettings: Partial<CalibrationSettings>) => {
    setSettings((prev) => {
      const updated = { ...prev, ...newSettings };
      routeEngine.setSettings(updated);
      return updated;
    });
  };

  const handleResetDefaults = () => {
    const defaults: CalibrationSettings = {
      bluetoothDeviceName: 'HC-05-ROBOT-01',
      bluetoothMac: '98:D3:31:F4:2A:1B',
      googleDirectionsApiKey: '',
      turnDurationMs: 850,
      secondsPerMeter: 1.5,
      gpsTriggerThresholdMeters: 5.0,
      safetyStopBufferMs: 400,
      executionMode: 'TIME_BASED',
      autoReconnect: true,
      enableAudioBeeps: true,
      simulationSpeedMultiplier: 1.5,
      motorPwmSpeed: 200,
    };
    setSettings(defaults);
    routeEngine.setSettings(defaults);
  };

  const isRouteRunning = routeEngine.isRouteRunning();
  const isRoutePaused = routeEngine.isRoutePaused();

  return (
    <div className="min-h-screen bg-[#0A0A0C] text-gray-100 flex flex-col font-sans selection:bg-blue-500/30 selection:text-blue-300">
      {/* Persistent Top App Bar */}
      <TopAppBar
        bluetoothStatus={bluetoothStatus}
        deviceName={connectedDeviceName}
        onConnectClick={() => setIsBtModalOpen(true)}
        telemetry={telemetry}
        onEmergencyStop={handleEmergencyStop}
        audioEnabled={audioEnabled}
        onToggleAudio={() => setAudioEnabled((a) => !a)}
        isRouteRunning={isRouteRunning && !isRoutePaused}
        onApkClick={() => setIsApkModalOpen(true)}
      />

      {/* Main Content View Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-3.5 pb-24 md:p-6">
        {activeTab === 'MANUAL' && (
          <ManualControlTab
            onSendCommand={handleSendCommand}
            telemetry={telemetry}
            isRouteRunning={isRouteRunning && !isRoutePaused}
            onPauseRouteForManualOverride={handlePauseForManualOverride}
            motorSpeed={settings.motorPwmSpeed}
            onSpeedChange={(speed) => handleUpdateSettings({ motorPwmSpeed: speed })}
          />
        )}

        {activeTab === 'ROUTE' && (
          <RoutePlannerTab
            currentRoute={currentRoute}
            onSelectRoute={handleSelectRoute}
            onStartRoute={handleStartRoute}
            robotPosition={{ lat: telemetry.currentGps.lat, lng: telemetry.currentGps.lng }}
            robotHeading={telemetry.currentGps.heading || 0}
            secondsPerMeter={settings.secondsPerMeter}
            directionsApiKey={settings.googleDirectionsApiKey}
          />
        )}

        {activeTab === 'TRACKING' && (
          <TrackingTab
            currentRoute={currentRoute}
            telemetry={telemetry}
            isRouteRunning={isRouteRunning}
            isRoutePaused={isRoutePaused}
            onStartRoute={handleStartRoute}
            onPauseRoute={handlePauseRoute}
            onResumeRoute={handleResumeRoute}
            onStopRoute={handleStopRoute}
            executionMode={settings.executionMode}
            gpsThresholdMeters={settings.gpsTriggerThresholdMeters}
          />
        )}

        {activeTab === 'LOGS' && (
          <LogsTab logs={logs} onClearLogs={() => setLogs([])} />
        )}

        {activeTab === 'SETTINGS' && (
          <SettingsTab
            settings={settings}
            onUpdateSettings={handleUpdateSettings}
            onResetDefaults={handleResetDefaults}
            onOpenApkHub={() => setIsApkModalOpen(true)}
          />
        )}
      </main>

      {/* Bottom Navigation Bar */}
      <NavigationBottomBar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        isRouteRunning={isRouteRunning && !isRoutePaused}
        unreadLogsCount={unreadLogsCount}
      />

      {/* Bluetooth Pairing / Manager Modal */}
      <BluetoothModal
        isOpen={isBtModalOpen}
        onClose={() => setIsBtModalOpen(false)}
        status={bluetoothStatus}
        deviceName={connectedDeviceName}
        onConnectReal={(devName) => bluetoothService.connect(devName, false)}
        onConnectVirtual={() => bluetoothService.connect('HC-05-ROBOT-01', true)}
        onDisconnect={() => bluetoothService.disconnect()}
        onSendTestCommand={(cmd) => handleSendCommand(cmd, 'MANUAL', `Test Pulse: '${cmd}'`)}
        isSimulated={isSimulatedBt}
      />

      {/* APK & Android Installation Hub Modal */}
      <ApkExportModal
        isOpen={isApkModalOpen}
        onClose={() => setIsApkModalOpen(false)}
      />
    </div>
  );
}
