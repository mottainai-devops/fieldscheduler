import { useState, useEffect, useRef } from 'react';
import { trpc } from '../lib/trpc';

interface GPSPosition {
  latitude: number;
  longitude: number;
  accuracy: number;
  speed: number | null;
  heading: number | null;
  timestamp: number;
}

interface UseGPSTrackingOptions {
  workerId: number;
  routeId?: number;
  enabled?: boolean;
  updateInterval?: number; // milliseconds
}

export function useGPSTracking({
  workerId,
  routeId,
  enabled = true,
  updateInterval = 30000, // 30 seconds default
}: UseGPSTrackingOptions) {
  const [position, setPosition] = useState<GPSPosition | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [permissionStatus, setPermissionStatus] = useState<'granted' | 'denied' | 'prompt'>('prompt');
  const watchIdRef = useRef<number | null>(null);
  const lastUpdateRef = useRef<number>(0);

  const updateLocationMutation = trpc.fieldWorker.updateWorkerLocation.useMutation();

  useEffect(() => {
    if (!enabled || !workerId) return;

    // Check if geolocation is supported
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser');
      return;
    }

    // Request permission and start watching
    const startTracking = () => {
      watchIdRef.current = navigator.geolocation.watchPosition(
        (pos) => {
          const newPosition: GPSPosition = {
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
            speed: pos.coords.speed,
            heading: pos.coords.heading,
            timestamp: pos.timestamp,
          };

          setPosition(newPosition);
          setError(null);
          setPermissionStatus('granted');

          // Send update to server if enough time has passed
          const now = Date.now();
          if (now - lastUpdateRef.current >= updateInterval) {
            updateLocationMutation.mutate({
              workerId,
              routeId,
              latitude: newPosition.latitude.toString(),
              longitude: newPosition.longitude.toString(),
              accuracy: Math.round(newPosition.accuracy),
              speed: newPosition.speed?.toString() || null,
              heading: newPosition.heading?.toString() || null,
            });
            lastUpdateRef.current = now;
          }
        },
        (err) => {
          setError(err.message);
          if (err.code === err.PERMISSION_DENIED) {
            setPermissionStatus('denied');
          }
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        }
      );
    };

    startTracking();

    // Cleanup
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, [enabled, workerId, routeId, updateInterval]);

  return {
    position,
    error,
    permissionStatus,
    isTracking: watchIdRef.current !== null,
  };
}

