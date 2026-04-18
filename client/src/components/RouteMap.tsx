/**
 * RouteMap Component
 * 
 * Displays route polyline, snapped waypoints, and turn-by-turn instructions
 * using Leaflet map library
 */

import React, { useEffect, useRef, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface RouteMapProps {
  polylineCoordinates: Array<[number, number]>;
  snappedWaypoints: Array<[number, number]>;
  startingPoint: { lat: number; lng: number };
  customerLocations: Array<{ lat: number; lng: number; name: string; sequence: number }>;
  instructions?: Array<{
    text: string;
    distance: number;
    time: number;
    sign: number;
    street_name: string;
  }>;
  distance?: number;
  time?: number;
  distanceKm?: string;
  timeMinutes?: number;
}

export default function RouteMap({
  polylineCoordinates,
  snappedWaypoints,
  startingPoint,
  customerLocations,
  instructions = [],
  distance = 0,
  time = 0,
  distanceKm = '0',
  timeMinutes = 0,
}: RouteMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<any>(null);
  const [mapLoaded, setMapLoaded] = useState(false);

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || mapLoaded) return;

    // Load Leaflet dynamically
    const script = document.createElement('script');
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    script.onload = () => {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);

      // Initialize map
      const L = (window as any).L;
      map.current = L.map(mapContainer.current).setView(
        [startingPoint.lat, startingPoint.lng],
        13
      );

      // Add tile layer
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19,
      }).addTo(map.current);

      setMapLoaded(true);
    };
    document.head.appendChild(script);
  }, [mapContainer, mapLoaded, startingPoint]);

  // Draw polyline when map is loaded
  useEffect(() => {
    if (!mapLoaded || !map.current || polylineCoordinates.length === 0) return;

    const L = (window as any).L;

    // Draw main route polyline (blue, 4px)
    const polyline = L.polyline(
      polylineCoordinates.map(([lng, lat]) => [lat, lng]),
      {
        color: '#3b82f6',
        weight: 4,
        opacity: 0.8,
        lineCap: 'round',
        lineJoin: 'round',
      }
    ).addTo(map.current);

    // Fit map to polyline bounds
    map.current.fitBounds(polyline.getBounds(), { padding: [50, 50] });

    // Draw starting point marker
    const startMarker = L.marker([startingPoint.lat, startingPoint.lng], {
      icon: L.icon({
        iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41],
      }),
    })
      .bindPopup('Starting Point')
      .addTo(map.current);

    // Draw customer waypoint markers
    customerLocations.forEach((customer, idx) => {
      const marker = L.marker([customer.lat, customer.lng], {
        icon: L.icon({
          iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
          shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
          iconSize: [25, 41],
          iconAnchor: [12, 41],
          popupAnchor: [1, -34],
          shadowSize: [41, 41],
        }),
      })
        .bindPopup(`${customer.sequence}. ${customer.name}`)
        .addTo(map.current);

      // Add numbered label
      const label = L.divIcon({
        html: `<div style="background: #3b82f6; color: white; border-radius: 50%; width: 30px; height: 30px; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 12px;">${customer.sequence}</div>`,
        iconSize: [30, 30],
        iconAnchor: [15, 15],
      });

      L.marker([customer.lat, customer.lng], { icon: label }).addTo(map.current);
    });

    // Draw dotted lines from original to snapped waypoints (if available)
    if (snappedWaypoints.length > 0) {
      snappedWaypoints.forEach((snapped, idx) => {
        if (idx < customerLocations.length) {
          const original = customerLocations[idx];
          L.polyline(
            [
              [original.lat, original.lng],
              [snapped[0], snapped[1]],
            ],
            {
              color: '#ef4444',
              weight: 1,
              opacity: 0.5,
              dashArray: '5, 5',
            }
          ).addTo(map.current);
        }
      });
    }
  }, [mapLoaded, polylineCoordinates, snappedWaypoints, customerLocations, startingPoint]);

  return (
    <div className="w-full space-y-4">
      {/* Map Container */}
      <Card className="overflow-hidden">
        <div
          ref={mapContainer}
          style={{
            width: '100%',
            height: '400px',
            backgroundColor: '#f3f4f6',
          }}
        />
      </Card>

      {/* Route Summary */}
      <Card className="p-4">
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <div>
            <p className="text-sm text-gray-600">Distance</p>
            <p className="text-2xl font-bold">{distanceKm} km</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Estimated Time</p>
            <p className="text-2xl font-bold">{timeMinutes} min</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Waypoints</p>
            <p className="text-2xl font-bold">{customerLocations.length}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Status</p>
            <Badge className="mt-1">Optimized</Badge>
          </div>
        </div>
      </Card>

      {/* Turn-by-Turn Instructions */}
      {instructions.length > 0 && (
        <Card className="p-4">
          <h3 className="font-semibold mb-3">Directions</h3>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {instructions.slice(0, 10).map((instr, idx) => (
              <div key={idx} className="text-sm border-l-2 border-blue-400 pl-3 py-1">
                <p className="font-medium">{instr.text}</p>
                <p className="text-gray-600 text-xs">
                  {(instr.distance / 1000).toFixed(1)} km • {Math.round(instr.time / 60)} min
                </p>
              </div>
            ))}
            {instructions.length > 10 && (
              <p className="text-sm text-gray-500 text-center py-2">
                +{instructions.length - 10} more directions
              </p>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}

