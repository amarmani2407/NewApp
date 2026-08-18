import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import { LatLng, RoutePlan } from '../types/robot';
import { Locate, Navigation, Layers, ZoomIn, ZoomOut } from 'lucide-react';

interface RobotMapProps {
  robotPosition: LatLng;
  robotHeading: number;
  routePlan: RoutePlan | null;
  activeStepIndex?: number;
  isPickingLocation?: 'ORIGIN' | 'DESTINATION' | null;
  onLocationSelected?: (latlng: LatLng) => void;
  className?: string;
}

export const RobotMap: React.FC<RobotMapProps> = ({
  robotPosition,
  robotHeading,
  routePlan,
  activeStepIndex = 0,
  isPickingLocation = null,
  onLocationSelected,
  className = 'h-full w-full',
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const robotMarkerRef = useRef<L.Marker | null>(null);
  const routePolylineRef = useRef<L.Polyline | null>(null);
  const waypointMarkersRef = useRef<L.LayerGroup | null>(null);
  const breadcrumbsRef = useRef<L.Polyline | null>(null);
  const breadcrumbPointsRef = useRef<[number, number][]>([]);

  // Initialize map
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [robotPosition.lat, robotPosition.lng],
      zoom: 17,
      zoomControl: false,
    });

    // Dark-themed, high-contrast CartoDB tiles suitable for robotics telemetry
    L.tileLayer(
      'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
      {
        attribution: '&copy; OpenStreetMap &copy; CARTO',
        maxZoom: 20,
      }
    ).addTo(map);

    waypointMarkersRef.current = L.layerGroup().addTo(map);

    // Breadcrumbs trail
    breadcrumbsRef.current = L.polyline([], {
      color: '#06b6d4',
      weight: 3,
      opacity: 0.7,
      dashArray: '4, 8',
    }).addTo(map);

    // Custom Robot Marker Icon
    const robotIcon = L.divIcon({
      className: 'robot-custom-marker',
      html: `
        <div style="position: relative; width: 36px; height: 36px; display: flex; align-items: center; justify-content: center;">
          <div style="position: absolute; width: 36px; height: 36px; border-radius: 50%; background: rgba(14, 165, 233, 0.25); animation: ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
          <div style="position: absolute; width: 28px; height: 28px; border-radius: 50%; background: #0284c7; border: 2px solid #ffffff; box-shadow: 0 4px 12px rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center; transform: rotate(${robotHeading}deg); transition: transform 0.2s ease-out;">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
              <polygon points="12 2 19 21 12 17 5 21 12 2"></polygon>
            </svg>
          </div>
        </div>
      `,
      iconSize: [36, 36],
      iconAnchor: [18, 18],
    });

    robotMarkerRef.current = L.marker([robotPosition.lat, robotPosition.lng], {
      icon: robotIcon,
      zIndexOffset: 1000,
    }).addTo(map);

    // Map click handler for selecting origin / destination
    map.on('click', (e: L.LeafletMouseEvent) => {
      if (onLocationSelected) {
        onLocationSelected({ lat: e.latlng.lat, lng: e.latlng.lng });
      }
    });

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Update robot position & heading
  useEffect(() => {
    if (!mapInstanceRef.current || !robotMarkerRef.current) return;

    robotMarkerRef.current.setLatLng([robotPosition.lat, robotPosition.lng]);

    // Update marker icon rotation HTML
    const iconHtml = `
      <div style="position: relative; width: 36px; height: 36px; display: flex; align-items: center; justify-content: center;">
        <div style="position: absolute; width: 36px; height: 36px; border-radius: 50%; background: rgba(14, 165, 233, 0.25); animation: ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
        <div style="position: absolute; width: 28px; height: 28px; border-radius: 50%; background: #0284c7; border: 2px solid #ffffff; box-shadow: 0 4px 12px rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center; transform: rotate(${robotHeading}deg); transition: transform 0.2s ease-out;">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
            <polygon points="12 2 19 21 12 17 5 21 12 2"></polygon>
          </svg>
        </div>
      </div>
    `;

    const icon = L.divIcon({
      className: 'robot-custom-marker',
      html: iconHtml,
      iconSize: [36, 36],
      iconAnchor: [18, 18],
    });

    robotMarkerRef.current.setIcon(icon);

    // Append to breadcrumb trail
    const lastPoint = breadcrumbPointsRef.current[breadcrumbPointsRef.current.length - 1];
    if (
      !lastPoint ||
      Math.abs(lastPoint[0] - robotPosition.lat) > 0.00002 ||
      Math.abs(lastPoint[1] - robotPosition.lng) > 0.00002
    ) {
      breadcrumbPointsRef.current.push([robotPosition.lat, robotPosition.lng]);
      if (breadcrumbsRef.current) {
        breadcrumbsRef.current.setLatLngs(breadcrumbPointsRef.current);
      }
    }
  }, [robotPosition, robotHeading]);

  // Update route polyline & waypoints
  useEffect(() => {
    if (!mapInstanceRef.current) return;

    // Clear previous route elements
    if (routePolylineRef.current) {
      routePolylineRef.current.remove();
      routePolylineRef.current = null;
    }
    if (waypointMarkersRef.current) {
      waypointMarkersRef.current.clearLayers();
    }

    if (!routePlan || routePlan.steps.length === 0) return;

    const map = mapInstanceRef.current;
    const latlngs: [number, number][] =
      routePlan.polylineCoordinates.length > 0
        ? routePlan.polylineCoordinates.map((c) => [c.lat, c.lng])
        : routePlan.steps.map((s) => [s.startLocation.lat, s.startLocation.lng]);

    // Draw main planned route polyline
    routePolylineRef.current = L.polyline(latlngs, {
      color: '#3b82f6',
      weight: 5,
      opacity: 0.85,
      lineCap: 'round',
      lineJoin: 'round',
    }).addTo(map);

    // Add Start Marker
    const startIcon = L.divIcon({
      className: 'start-marker',
      html: `
        <div style="background: #10b981; color: white; border: 2px solid white; border-radius: 8px; padding: 2px 6px; font-size: 11px; font-weight: bold; font-family: sans-serif; box-shadow: 0 3px 8px rgba(0,0,0,0.3); display: flex; align-items: center; gap: 3px;">
          <span>START</span>
        </div>
      `,
      iconSize: [52, 24],
      iconAnchor: [26, 24],
    });

    const startMarker = L.marker(
      [routePlan.origin.location.lat, routePlan.origin.location.lng],
      { icon: startIcon }
    );
    startMarker.bindPopup(`<b>Start Hub</b><br>${routePlan.origin.name}`);
    waypointMarkersRef.current?.addLayer(startMarker);

    // Add Step Waypoint Markers
    routePlan.steps.forEach((step, idx) => {
      const isCompleted = step.status === 'COMPLETED';
      const isCurrent = idx === activeStepIndex && routePlan.status === 'RUNNING';
      const bgColor = isCompleted ? '#10b981' : isCurrent ? '#06b6d4' : '#64748b';

      const stepIcon = L.divIcon({
        className: 'step-marker',
        html: `
          <div style="width: 22px; height: 22px; border-radius: 50%; background: ${bgColor}; border: 2px solid #ffffff; color: white; font-weight: bold; font-size: 10px; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 6px rgba(0,0,0,0.4); ${isCurrent ? 'transform: scale(1.25); outline: 3px solid rgba(6,182,212,0.5);' : ''}">
            ${step.stepIndex}
          </div>
        `,
        iconSize: [22, 22],
        iconAnchor: [11, 11],
      });

      const wpMarker = L.marker([step.endLocation.lat, step.endLocation.lng], {
        icon: stepIcon,
      });
      wpMarker.bindPopup(
        `<b>Step ${step.stepIndex}</b><br>${step.instruction}<br><i>${step.distanceMeters}m (${step.command})</i>`
      );
      waypointMarkersRef.current?.addLayer(wpMarker);
    });

    // Add Final Destination Marker
    const destIcon = L.divIcon({
      className: 'dest-marker',
      html: `
        <div style="background: #ef4444; color: white; border: 2px solid white; border-radius: 8px; padding: 2px 6px; font-size: 11px; font-weight: bold; font-family: sans-serif; box-shadow: 0 3px 8px rgba(0,0,0,0.3); display: flex; align-items: center; gap: 3px;">
          <span>GOAL</span>
        </div>
      `,
      iconSize: [48, 24],
      iconAnchor: [24, 24],
    });

    const destMarker = L.marker(
      [routePlan.destination.location.lat, routePlan.destination.location.lng],
      { icon: destIcon }
    );
    destMarker.bindPopup(`<b>Destination</b><br>${routePlan.destination.name}`);
    waypointMarkersRef.current?.addLayer(destMarker);

    // Fit bounds
    if (latlngs.length > 0) {
      map.fitBounds(L.latLngBounds(latlngs), { padding: [40, 40] });
    }
  }, [routePlan, activeStepIndex]);

  const handleCenterRobot = () => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.setView([robotPosition.lat, robotPosition.lng], 18, {
        animate: true,
      });
    }
  };

  const handleZoomIn = () => mapInstanceRef.current?.zoomIn();
  const handleZoomOut = () => mapInstanceRef.current?.zoomOut();

  return (
    <div className={`relative overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 ${className}`}>
      {/* Map Target Canvas */}
      <div ref={mapContainerRef} className="h-full w-full z-0" />

      {/* Picking Banner if user is selecting point */}
      {isPickingLocation && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 bg-cyan-950/90 border border-cyan-500/60 text-cyan-200 px-3.5 py-1.5 rounded-full text-xs font-semibold shadow-lg backdrop-blur-sm flex items-center gap-2 animate-bounce">
          <Navigation className="w-3.5 h-3.5 text-cyan-400" />
          <span>Tap on map to select {isPickingLocation} point</span>
        </div>
      )}

      {/* Map Action Floating Controls */}
      <div className="absolute right-3 bottom-3 z-10 flex flex-col gap-1.5">
        <button
          onClick={handleCenterRobot}
          className="p-2.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 active:scale-95 text-cyan-400 border border-slate-700 shadow-md backdrop-blur-sm transition-all"
          title="Recenter Map on Robot"
        >
          <Locate className="w-4 h-4" />
        </button>
        <button
          onClick={handleZoomIn}
          className="p-2 rounded-xl bg-slate-900/90 hover:bg-slate-800 active:scale-95 text-slate-200 border border-slate-700 shadow-md backdrop-blur-sm transition-all"
          title="Zoom In"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <button
          onClick={handleZoomOut}
          className="p-2 rounded-xl bg-slate-900/90 hover:bg-slate-800 active:scale-95 text-slate-200 border border-slate-700 shadow-md backdrop-blur-sm transition-all"
          title="Zoom Out"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
