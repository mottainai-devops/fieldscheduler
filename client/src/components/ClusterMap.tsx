import { useEffect, useRef } from 'react';

interface Cluster {
  id: number;
  centroid: { lat: number; lng: number };
  customers: Array<{ id: number; name: string; latitude: string | null; longitude: string | null }>;
  radius: number;
}

interface Worker {
  id: number;
  name: string;
  color?: string;
}

interface ClusterMapProps {
  clusters: Cluster[];
  workers: Worker[];
  assignedClusters: Record<number, number>;
}

const WORKER_COLORS = [
  '#3B82F6', // blue
  '#10B981', // green
  '#F59E0B', // amber
  '#EF4444', // red
  '#8B5CF6', // purple
  '#EC4899', // pink
  '#14B8A6', // teal
  '#F97316', // orange
];

export default function ClusterMap({ clusters, workers, assignedClusters }: ClusterMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!mapRef.current || clusters.length === 0) return;

    // Calculate bounds
    let minLat = Infinity, maxLat = -Infinity;
    let minLng = Infinity, maxLng = -Infinity;

    clusters.forEach(cluster => {
      minLat = Math.min(minLat, cluster.centroid.lat);
      maxLat = Math.max(maxLat, cluster.centroid.lat);
      minLng = Math.min(minLng, cluster.centroid.lng);
      maxLng = Math.max(maxLng, cluster.centroid.lng);
    });

    const centerLat = (minLat + maxLat) / 2;
    const centerLng = (minLng + maxLng) / 2;

    // Simple visualization without heavy map library
    // This is a placeholder - in production, use Leaflet or Mapbox GL JS
  }, [clusters, workers, assignedClusters]);

  return (
    <div ref={mapRef} className="w-full h-[600px] rounded-lg overflow-hidden border border-slate-700 bg-slate-900 relative">
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="text-center">
          <div className="text-slate-400 mb-4">
            <svg className="w-16 h-16 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
            </svg>
            <p className="text-sm font-medium">Cluster Map Visualization</p>
            <p className="text-xs text-slate-500 mt-1">{clusters.length} clusters found</p>
          </div>
          
          <div className="grid grid-cols-2 gap-4 max-w-md mx-auto text-left">
            {clusters.slice(0, 4).map((cluster) => {
              const assignedWorkerId = assignedClusters[cluster.id];
              const workerIndex = workers.findIndex(w => w.id === assignedWorkerId);
              const color = workerIndex >= 0 ? WORKER_COLORS[workerIndex % WORKER_COLORS.length] : '#64748B';
              const worker = workers.find(w => w.id === assignedWorkerId);

              return (
                <div key={cluster.id} className="bg-slate-800 rounded p-3 border border-slate-700">
                  <div className="flex items-center gap-2 mb-2">
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: color }}
                    />
                    <span className="text-sm font-medium text-white">Cluster {cluster.id}</span>
                  </div>
                  <div className="text-xs text-slate-400 space-y-1">
                    <div>Customers: {cluster.customers.length}</div>
                    <div>Radius: {cluster.radius.toFixed(1)} km</div>
                    <div>Worker: {worker?.name || 'Unassigned'}</div>
                  </div>
                </div>
              );
            })}
          </div>
          
          {clusters.length > 4 && (
            <p className="text-xs text-slate-500 mt-4">
              +{clusters.length - 4} more clusters
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

