import React, { useState } from 'react';
import {
  MapPin,
  Navigation,
  Compass,
  Sparkles,
  ArrowRight,
  ListOrdered,
  Clock,
  Play,
  RotateCcw,
  CheckCircle2,
  CornerDownRight,
  Route as RouteIcon,
  Search,
} from 'lucide-react';
import { LatLng, RoutePlan, RouteStep } from '../types/robot';
import { DEMO_ROUTES } from '../data/demoRoutes';
import {
  generateSyntheticRoute,
  parseDirectionsResponseToRoutePlan,
} from '../services/directionsApi';
import { formatDistance, formatDuration } from '../services/geoService';
import { RobotMap } from './RobotMap';

interface RoutePlannerTabProps {
  currentRoute: RoutePlan | null;
  onSelectRoute: (route: RoutePlan) => void;
  onStartRoute: () => void;
  robotPosition: LatLng;
  robotHeading: number;
  secondsPerMeter: number;
  directionsApiKey: string;
}

export const RoutePlannerTab: React.FC<RoutePlannerTabProps> = ({
  currentRoute,
  onSelectRoute,
  onStartRoute,
  robotPosition,
  robotHeading,
  secondsPerMeter,
  directionsApiKey,
}) => {
  const [selectedDemoIndex, setSelectedDemoIndex] = useState<number>(0);
  const [pickingLocation, setPickingLocation] = useState<'ORIGIN' | 'DESTINATION' | null>(null);
  const [customOrigin, setCustomOrigin] = useState<LatLng>(robotPosition);
  const [customDestination, setCustomDestination] = useState<LatLng>({
    lat: robotPosition.lat + 0.002,
    lng: robotPosition.lng + 0.002,
  });
  const [originLabel, setOriginLabel] = useState('Current Robot Dock (GPS)');
  const [destLabel, setDestLabel] = useState('Delivery Target Room 204');
  const [isLoadingApi, setIsLoadingApi] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  // Handle Loading One of the Hardcoded Preset Demo Routes
  const handleLoadDemoRoute = (index: number) => {
    setSelectedDemoIndex(index);
    const demo = DEMO_ROUTES[index];
    if (demo) {
      onSelectRoute(demo);
      setOriginLabel(demo.origin.name);
      setDestLabel(demo.destination.name);
      setCustomOrigin(demo.origin.location);
      setCustomDestination(demo.destination.location);
    }
  };

  // Generate or fetch route between custom origin & destination
  const handleComputeCustomRoute = async () => {
    setIsLoadingApi(true);
    setApiError(null);

    // If an API key is provided, attempt live Google Directions API call
    if (directionsApiKey && directionsApiKey.trim().length > 10) {
      try {
        const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${customOrigin.lat},${customOrigin.lng}&destination=${customDestination.lat},${customDestination.lng}&mode=walking&key=${directionsApiKey.trim()}`;
        const res = await fetch(url);
        const data = await res.json();

        if (data.status === 'OK') {
          const parsedPlan = parseDirectionsResponseToRoutePlan(
            data,
            `${originLabel} → ${destLabel}`,
            secondsPerMeter
          );
          onSelectRoute(parsedPlan);
          setIsLoadingApi(false);
          return;
        } else {
          setApiError(`Google Directions API: ${data.status} (${data.error_message || 'Falling back to high-accuracy offline path planner'})`);
        }
      } catch (err: any) {
        setApiError(`Live API network request failed. Falling back to offline path generator.`);
      }
    }

    // High accuracy synthetic multi-waypoint planner
    const syntheticPlan = generateSyntheticRoute(
      customOrigin,
      customDestination,
      originLabel,
      destLabel,
      secondsPerMeter
    );
    onSelectRoute(syntheticPlan);
    setIsLoadingApi(false);
  };

  const handleLocationPickedOnMap = (latlng: LatLng) => {
    if (pickingLocation === 'ORIGIN') {
      setCustomOrigin(latlng);
      setOriginLabel(`Selected Point (${latlng.lat.toFixed(4)}, ${latlng.lng.toFixed(4)})`);
      setPickingLocation(null);
    } else if (pickingLocation === 'DESTINATION') {
      setCustomDestination(latlng);
      setDestLabel(`Target Marker (${latlng.lat.toFixed(4)}, ${latlng.lng.toFixed(4)})`);
      setPickingLocation(null);
    }
  };

  return (
    <div id="route-planner-screen" className="flex flex-col lg:grid lg:grid-cols-12 gap-4 pb-8">
      {/* Left Column: Route Setup & Demo Presets & Parsed Steps (5 cols) */}
      <div className="lg:col-span-5 flex flex-col gap-4">
        {/* Offline Demo Routes Bento Card */}
        <div className="bg-[#16181D] border border-[#2A2D35] rounded-2xl p-5 shadow-xl">
          <div className="flex items-center justify-between mb-3.5">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-blue-400" />
              <h2 className="text-[10px] font-black uppercase tracking-widest text-gray-400 font-mono">
                Preset Demo Routes (Offline Ready)
              </h2>
            </div>
            <span className="text-[10px] font-mono bg-green-500/10 border border-green-500/30 text-green-400 px-2.5 py-0.5 rounded-full font-bold">
              VENUE READY
            </span>
          </div>

          <div className="grid grid-cols-1 gap-2.5">
            {DEMO_ROUTES.map((route, idx) => (
              <button
                key={route.id}
                onClick={() => handleLoadDemoRoute(idx)}
                className={`w-full text-left p-3 rounded-xl border transition-all flex items-center justify-between ${
                  currentRoute?.id === route.id
                    ? 'bg-blue-600/20 border-blue-500 text-white shadow-[0_0_12px_rgba(59,130,246,0.2)]'
                    : 'bg-[#1F2229] border-[#2A2D35] text-gray-300 hover:border-gray-600 hover:bg-[#252830]'
                }`}
              >
                <div className="truncate pr-2">
                  <p className="text-xs font-bold text-white truncate font-mono">{route.name}</p>
                  <p className="text-[11px] text-gray-400 mt-0.5 truncate font-mono">
                    {route.steps.length} Waypoints • {formatDistance(route.totalDistanceMeters)}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-xs font-mono font-black text-blue-400">
                    {formatDuration(route.estimatedDurationSec)}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Custom Point Selector / Map Tapper Bento Card */}
        <div className="bg-[#16181D] border border-[#2A2D35] rounded-2xl p-5 shadow-xl flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-gray-400 font-mono flex items-center gap-1.5">
              <RouteIcon className="w-3.5 h-3.5 text-blue-400" />
              <span>Waypoint / Coordinate Planner</span>
            </h3>
            <span className="text-[10px] text-gray-500 font-mono">Tap Map to Place</span>
          </div>

          {/* Origin Picker */}
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-green-500/20 border border-green-500/40 flex items-center justify-center text-green-400 shrink-0 font-mono font-bold text-xs">
              A
            </div>
            <input
              type="text"
              value={originLabel}
              onChange={(e) => setOriginLabel(e.target.value)}
              className="flex-1 bg-[#1F2229] border border-[#2A2D35] rounded-xl px-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 font-mono"
              placeholder="Origin Name or Lat,Lng"
            />
            <button
              onClick={() => setPickingLocation('ORIGIN')}
              className={`px-3 py-2 rounded-xl text-xs font-bold font-mono border transition-all ${
                pickingLocation === 'ORIGIN'
                  ? 'bg-blue-600 text-white border-blue-500 shadow-md'
                  : 'bg-[#1F2229] text-gray-300 border-[#2A2D35] hover:bg-[#2A2D35]'
              }`}
              title="Click then tap on map to pick Start Point"
            >
              PICK
            </button>
          </div>

          {/* Destination Picker */}
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-red-500/20 border border-red-500/40 flex items-center justify-center text-red-400 shrink-0 font-mono font-bold text-xs">
              B
            </div>
            <input
              type="text"
              value={destLabel}
              onChange={(e) => setDestLabel(e.target.value)}
              className="flex-1 bg-[#1F2229] border border-[#2A2D35] rounded-xl px-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 font-mono"
              placeholder="Destination Name or Lat,Lng"
            />
            <button
              onClick={() => setPickingLocation('DESTINATION')}
              className={`px-3 py-2 rounded-xl text-xs font-bold font-mono border transition-all ${
                pickingLocation === 'DESTINATION'
                  ? 'bg-blue-600 text-white border-blue-500 shadow-md'
                  : 'bg-[#1F2229] text-gray-300 border-[#2A2D35] hover:bg-[#2A2D35]'
              }`}
              title="Click then tap on map to pick Destination Point"
            >
              PICK
            </button>
          </div>

          {apiError && (
            <p className="text-[11px] text-amber-300 bg-amber-950/60 p-2.5 rounded-xl border border-amber-500/40 font-mono">
              {apiError}
            </p>
          )}

          <button
            id="btn-compute-route"
            onClick={handleComputeCustomRoute}
            disabled={isLoadingApi}
            className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 active:scale-98 text-white font-black text-xs uppercase tracking-wider font-mono shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2 transition-all mt-1"
          >
            {isLoadingApi ? (
              <span>Calculating Directions...</span>
            ) : (
              <>
                <Search className="w-4 h-4" />
                <span>Calculate & Translate Route</span>
              </>
            )}
          </button>
        </div>

        {/* Parsed Steps & Command Translation Table Bento Card */}
        {currentRoute && (
          <div className="bg-[#16181D] border border-[#2A2D35] rounded-2xl p-5 shadow-xl flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-gray-400 font-mono flex items-center gap-1.5">
                <ListOrdered className="w-3.5 h-3.5 text-blue-400" />
                <span>Maneuver Queue ({currentRoute.steps.length})</span>
              </h3>
              <span className="text-[11px] font-mono text-blue-400 font-bold">
                {formatDistance(currentRoute.totalDistanceMeters)} • {formatDuration(currentRoute.estimatedDurationSec)}
              </span>
            </div>

            <div className="flex flex-col gap-2 max-h-60 overflow-y-auto pr-1">
              {currentRoute.steps.map((step) => (
                <div
                  key={step.id}
                  className="bg-[#1F2229] border border-[#2A2D35] rounded-xl p-2.5 flex items-start justify-between gap-2 text-xs"
                >
                  <div className="flex items-start gap-2.5 min-w-0">
                    <span className="w-5 h-5 rounded-lg bg-[#2A2D35] flex items-center justify-center font-mono font-black text-[10px] text-gray-200 shrink-0 mt-0.5">
                      {step.stepIndex}
                    </span>
                    <div>
                      <p className="font-bold text-gray-200 leading-tight">
                        {step.instruction}
                      </p>
                      <p className="text-[11px] text-gray-400 font-mono mt-0.5">
                        Distance: {step.distanceMeters}m • Est: {step.durationSeconds}s
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    {step.turnCommand && (
                      <span className="px-2 py-0.5 rounded font-mono font-black text-xs bg-amber-500/20 border border-amber-500/40 text-amber-300">
                        {step.turnCommand}
                      </span>
                    )}
                    <span className="px-2 py-0.5 rounded font-mono font-black text-xs bg-blue-500/20 border border-blue-500/40 text-blue-300">
                      {step.command}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <button
              id="btn-execute-route-now"
              onClick={onStartRoute}
              className="w-full py-3.5 rounded-xl bg-green-600 hover:bg-green-500 active:scale-98 text-white font-black text-xs uppercase tracking-wider font-mono shadow-lg shadow-green-600/30 flex items-center justify-center gap-2 transition-all mt-1"
            >
              <Play className="w-4 h-4 fill-white" />
              <span>Deploy Autonomous Mission</span>
            </button>
          </div>
        )}
      </div>

      {/* Right Column: Live Map Bento Frame (7 cols) */}
      <div className="lg:col-span-7 h-[420px] lg:h-[650px] sticky top-20 bg-[#16181D] p-1.5 rounded-2xl border border-[#2A2D35] shadow-2xl">
        <RobotMap
          robotPosition={robotPosition}
          robotHeading={robotHeading}
          routePlan={currentRoute}
          isPickingLocation={pickingLocation}
          onLocationSelected={handleLocationPickedOnMap}
          className="h-full w-full rounded-xl overflow-hidden"
        />
      </div>
    </div>
  );
};

