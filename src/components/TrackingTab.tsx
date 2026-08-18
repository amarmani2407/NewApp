import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import {
  Play,
  Pause,
  Square,
  Navigation,
  Compass,
  Gauge,
  Clock,
  Flag,
  RotateCw,
  Zap,
  Activity,
  AlertOctagon,
  CheckCircle,
  ShieldCheck,
} from 'lucide-react';
import { LatLng, RobotTelemetry, RoutePlan } from '../types/robot';
import { formatDistance, formatDuration, formatSpeed } from '../services/geoService';
import { RobotMap } from './RobotMap';

interface TrackingTabProps {
  currentRoute: RoutePlan | null;
  telemetry: RobotTelemetry;
  isRouteRunning: boolean;
  isRoutePaused: boolean;
  onStartRoute: () => void;
  onPauseRoute: () => void;
  onResumeRoute: () => void;
  onStopRoute: () => void;
  executionMode: 'TIME_BASED' | 'GPS_DISTANCE_BASED';
  gpsThresholdMeters: number;
}

export const TrackingTab: React.FC<TrackingTabProps> = ({
  currentRoute,
  telemetry,
  isRouteRunning,
  isRoutePaused,
  onStartRoute,
  onPauseRoute,
  onResumeRoute,
  onStopRoute,
  executionMode,
  gpsThresholdMeters,
}) => {
  const isCompleted = currentRoute?.status === 'COMPLETED';

  // Trigger celebration on route completion
  useEffect(() => {
    if (isCompleted) {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
      });
    }
  }, [isCompleted]);

  const activeStep =
    currentRoute && currentRoute.steps[telemetry.activeStepIndex]
      ? currentRoute.steps[telemetry.activeStepIndex]
      : null;

  const totalSteps = currentRoute?.steps.length || 0;
  const currentStepNum = activeStep ? activeStep.stepIndex : isCompleted ? totalSteps : 0;

  // Overall route progress percentage
  const overallProgress = currentRoute
    ? Math.min(
        100,
        Math.round(
          ((telemetry.activeStepIndex +
            (activeStep?.progressPercent ? activeStep.progressPercent / 100 : 0)) /
            Math.max(1, totalSteps)) *
            100
        )
      )
    : 0;

  return (
    <div id="tracking-screen" className="flex flex-col lg:grid lg:grid-cols-12 gap-4 pb-8">
      {/* Left Column: Autonomous HUD & Live Controls (5 cols) */}
      <div className="lg:col-span-5 flex flex-col gap-4">
        {/* Step Progress & Execution HUD Card */}
        <div className="bg-[#16181D] border border-[#2A2D35] rounded-2xl p-5 shadow-xl flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span
                className={`w-2.5 h-2.5 rounded-full ${
                  isRouteRunning && !isRoutePaused
                    ? 'bg-green-500 animate-ping shadow-[0_0_8px_#22C55E]'
                    : isRoutePaused
                    ? 'bg-amber-500'
                    : isCompleted
                    ? 'bg-blue-500'
                    : 'bg-gray-600'
                }`}
              />
              <h2 className="text-[10px] font-black uppercase tracking-widest text-gray-300 font-mono">
                {isCompleted
                  ? 'Mission Complete'
                  : isRouteRunning
                  ? isRoutePaused
                    ? 'Navigation Paused'
                    : 'Autonomous Nav Active'
                  : 'Mission Standby'}
              </h2>
            </div>

            <span className="text-[10px] font-mono font-bold bg-[#1F2229] border border-[#2A2D35] px-2.5 py-0.5 rounded-full text-blue-400">
              {executionMode === 'TIME_BASED' ? '⏱ TIME-BASED' : `📡 GPS (<${gpsThresholdMeters}M)`}
            </span>
          </div>

          {/* Primary Step Banner */}
          <div className="bg-[#1F2229] border border-[#2A2D35] rounded-xl p-4 flex flex-col gap-2.5">
            <div className="flex items-center justify-between text-xs text-gray-400">
              <span className="font-bold uppercase tracking-wider font-mono text-[10px]">
                {isCompleted
                  ? 'Mission Status'
                  : `Maneuver Step ${currentStepNum} of ${totalSteps}`}
              </span>
              <span className="font-mono font-black text-blue-400 text-xs">
                {overallProgress}% COMPLETE
              </span>
            </div>

            <div className="flex items-start gap-3">
              <div
                className={`w-11 h-11 rounded-xl flex items-center justify-center font-mono font-black text-2xl shrink-0 border transition-all ${
                  telemetry.currentCommand === 'F'
                    ? 'bg-blue-600/20 border-blue-500 text-blue-400 shadow-[0_0_12px_rgba(59,130,246,0.3)] animate-pulse'
                    : telemetry.currentCommand === 'L' || telemetry.currentCommand === 'R'
                    ? 'bg-amber-500/20 border-amber-500 text-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.3)]'
                    : 'bg-[#0F1115] border-[#2A2D35] text-gray-400'
                }`}
              >
                '{telemetry.currentCommand}'
              </div>

              <div className="min-w-0">
                <p className="text-sm font-bold text-white leading-tight font-mono">
                  {isCompleted
                    ? 'Payload delivered successfully at target location.'
                    : activeStep?.instruction || 'Select a route to commence mission.'}
                </p>
                {!isCompleted && activeStep && (
                  <p className="text-xs text-blue-400 font-mono mt-1 font-semibold">
                    {formatDistance(telemetry.distanceToNextWaypoint)} remaining to turn
                  </p>
                )}
              </div>
            </div>

            {/* Step Progress Bar */}
            <div className="w-full bg-[#0F1115] rounded-full h-2 mt-1 overflow-hidden border border-[#2A2D35]">
              <div
                className="bg-blue-500 h-full transition-all duration-300 rounded-full shadow-[0_0_8px_#3B82F6]"
                style={{ width: `${isCompleted ? 100 : activeStep?.progressPercent || 0}%` }}
              />
            </div>
          </div>

          {/* Real-time Telemetry Metrics Grid (Bento mini-cards) */}
          <div className="grid grid-cols-2 gap-3">
            {/* Live Speed */}
            <div className="bg-[#1F2229] border border-[#2A2D35] rounded-xl p-3.5 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-[#0F1115] border border-[#2A2D35] text-blue-400 shrink-0">
                <Gauge className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <span className="text-[9px] text-gray-500 uppercase font-black tracking-widest font-mono block">
                  Ground Speed
                </span>
                <span className="text-sm font-mono font-black text-white truncate block">
                  {formatSpeed(telemetry.currentGps.speed)}
                </span>
              </div>
            </div>

            {/* Remaining Distance to Goal */}
            <div className="bg-[#1F2229] border border-[#2A2D35] rounded-xl p-3.5 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-[#0F1115] border border-[#2A2D35] text-green-400 shrink-0">
                <Flag className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <span className="text-[9px] text-gray-500 uppercase font-black tracking-widest font-mono block">
                  To Target
                </span>
                <span className="text-sm font-mono font-black text-white truncate block">
                  {formatDistance(telemetry.distanceToFinalDestination)}
                </span>
              </div>
            </div>

            {/* Target Bearing Radar */}
            <div className="bg-[#1F2229] border border-[#2A2D35] rounded-xl p-3.5 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-[#0F1115] border border-[#2A2D35] text-amber-400 shrink-0">
                <Compass className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <span className="text-[9px] text-gray-500 uppercase font-black tracking-widest font-mono block">
                  Target Heading
                </span>
                <span className="text-sm font-mono font-black text-white truncate block">
                  {Math.round(telemetry.bearingToNextWaypoint)}° Azimuth
                </span>
              </div>
            </div>

            {/* Total Traveled */}
            <div className="bg-[#1F2229] border border-[#2A2D35] rounded-xl p-3.5 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-[#0F1115] border border-[#2A2D35] text-purple-400 shrink-0">
                <Activity className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <span className="text-[9px] text-gray-500 uppercase font-black tracking-widest font-mono block">
                  Odometer
                </span>
                <span className="text-sm font-mono font-black text-white truncate block">
                  {formatDistance(telemetry.totalDistanceTravelled)}
                </span>
              </div>
            </div>
          </div>

          {/* Autonomous Execution Action Buttons (Start, Pause, Resume, Stop) */}
          <div className="flex items-center gap-2 pt-1">
            {!isRouteRunning || isCompleted ? (
              <button
                id="btn-start-route-tracking"
                onClick={onStartRoute}
                disabled={!currentRoute}
                className="flex-1 py-3.5 rounded-xl bg-green-600 hover:bg-green-500 disabled:opacity-40 text-white font-black text-xs uppercase tracking-wider font-mono shadow-lg shadow-green-600/30 flex items-center justify-center gap-2 transition-all active:scale-98"
              >
                <Play className="w-4 h-4 fill-white" />
                <span>{isCompleted ? 'Restart Route' : 'Start Route'}</span>
              </button>
            ) : isRoutePaused ? (
              <button
                id="btn-resume-route"
                onClick={onResumeRoute}
                className="flex-1 py-3.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-black text-xs uppercase tracking-wider font-mono shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2 transition-all active:scale-98"
              >
                <Play className="w-4 h-4 fill-white" />
                <span>Resume Route</span>
              </button>
            ) : (
              <button
                id="btn-pause-route"
                onClick={onPauseRoute}
                className="flex-1 py-3.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-black text-xs uppercase tracking-wider font-mono shadow-lg shadow-amber-600/30 flex items-center justify-center gap-2 transition-all active:scale-98"
              >
                <Pause className="w-4 h-4 fill-white" />
                <span>Pause Route</span>
              </button>
            )}

            <button
              id="btn-stop-route-tracking"
              onClick={onStopRoute}
              className="px-5 py-3.5 rounded-xl bg-red-600/20 hover:bg-red-600/30 active:scale-95 text-red-400 border border-red-500/50 font-black text-xs uppercase tracking-wider font-mono shadow-[0_0_12px_rgba(239,68,68,0.2)] flex items-center justify-center gap-2 transition-all"
              title="Stop Route immediately & clear queue"
            >
              <Square className="w-4 h-4 fill-current" />
              <span>Stop</span>
            </button>
          </div>
        </div>

        {/* Safety Protocol Bento Banner */}
        <div className="bg-[#16181D] border border-[#2A2D35] rounded-2xl p-4 flex items-center gap-3 text-xs text-gray-300 shadow-xl">
          <ShieldCheck className="w-5 h-5 text-green-400 shrink-0" />
          <div className="text-[11px] leading-relaxed font-mono">
            <span className="font-bold text-white">Safe Transit Active: </span>
            The brain automatically transmits 'S' (brake halt) between direction turns to protect motor gearboxes.
          </div>
        </div>
      </div>

      {/* Right Column: Live GPS Tracking Map (7 cols) */}
      <div className="lg:col-span-7 h-[440px] lg:h-[650px] sticky top-20 bg-[#16181D] p-1.5 rounded-2xl border border-[#2A2D35] shadow-2xl">
        <RobotMap
          robotPosition={{ lat: telemetry.currentGps.lat, lng: telemetry.currentGps.lng }}
          robotHeading={telemetry.currentGps.heading || 0}
          routePlan={currentRoute}
          activeStepIndex={telemetry.activeStepIndex}
          className="h-full w-full rounded-xl overflow-hidden"
        />
      </div>
    </div>
  );
};

