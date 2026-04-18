import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet-draw/dist/leaflet.draw.css';
import 'leaflet-draw';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MapPin, Users, Trash2 } from 'lucide-react';

// Fix Leaflet default marker icon issue
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

interface Customer {
  id: number;
  name: string;
  address: string;
  latitude: string | null;
  longitude: string | null;
  serviceType?: string;
  priority?: string;
}

interface CustomerAreaMapProps {
  customers: Customer[];
  onCustomersSelected: (customers: Customer[]) => void;
}

export default function CustomerAreaMap({ customers, onCustomersSelected }: CustomerAreaMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.Marker[]>([]);
  const drawnItemsRef = useRef<L.FeatureGroup | null>(null);
  const [selectedCustomers, setSelectedCustomers] = useState<Customer[]>([]);
  const [unassignedCustomers, setUnassignedCustomers] = useState<Customer[]>([]);
  const drawTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Filter customers with valid coordinates
  useEffect(() => {
    const validCustomers = customers.filter(
      c => c.latitude && c.longitude && 
      !isNaN(parseFloat(c.latitude)) && !isNaN(parseFloat(c.longitude))
    );
    setUnassignedCustomers(validCustomers);
  }, [customers]);

  // Calculate bounds for all customers
  const calculateBounds = (customersToCalculate: Customer[]): L.LatLngBoundsExpression | null => {
    const validCoords = customersToCalculate
      .filter(c => c.latitude && c.longitude && !isNaN(parseFloat(c.latitude)) && !isNaN(parseFloat(c.longitude)))
      .map(c => [parseFloat(c.latitude!), parseFloat(c.longitude!)] as [number, number]);
    
    if (validCoords.length === 0) return null;
    return validCoords;
  };

  // Initialize map with auto-zoom to customer area
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    // Calculate bounds first
    const bounds = calculateBounds(unassignedCustomers);

    // Initialize map with default center
    const map = L.map(mapRef.current).setView([6.5244, 3.3792], 12);

    // Add tile layer with optimized settings
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19,
      minZoom: 2,
    }).addTo(map);

    // Initialize feature group for drawn items
    const drawnItems = new L.FeatureGroup();
    map.addLayer(drawnItems);
    drawnItemsRef.current = drawnItems;

    // Initialize draw control
    const drawControl = new L.Control.Draw({
      position: 'topright',
      draw: {
        polygon: {
          allowIntersection: false,
          showArea: true,
          drawError: {
            color: '#e74c3c',
            message: '<strong>Error:</strong> Shape edges cannot cross!',
          },
          shapeOptions: {
            color: '#3B82F6',
            fillOpacity: 0.2,
          },
        },
        rectangle: {
          shapeOptions: {
            color: '#3B82F6',
            fillOpacity: 0.2,
          },
        },
        circle: {
          shapeOptions: {
            color: '#3B82F6',
            fillOpacity: 0.2,
          },
        },
        polyline: false,
        marker: false,
        circlemarker: false,
      },
      edit: {
        featureGroup: drawnItems,
        remove: true,
      },
    });
    map.addControl(drawControl);

    mapInstanceRef.current = map;

    // Handle shape creation with debouncing
    map.on(L.Draw.Event.CREATED, (event: any) => {
      const layer = event.layer;
      drawnItems.addLayer(layer);
      
      // Debounce the filter operation
      if (drawTimeoutRef.current) clearTimeout(drawTimeoutRef.current);
      drawTimeoutRef.current = setTimeout(() => {
        filterCustomersInArea(layer);
      }, 100);
    });

    // Handle shape editing with debouncing
    map.on(L.Draw.Event.EDITED, (event: any) => {
      if (drawTimeoutRef.current) clearTimeout(drawTimeoutRef.current);
      drawTimeoutRef.current = setTimeout(() => {
        const layers = event.layers;
        layers.eachLayer((layer: any) => {
          filterCustomersInArea(layer);
        });
      }, 100);
    });

    // Handle shape deletion
    map.on(L.Draw.Event.DELETED, () => {
      setSelectedCustomers([]);
      onCustomersSelected([]);
      // Reset marker colors
      markersRef.current.forEach(marker => {
        marker.setIcon(new L.Icon.Default());
      });
    });

    // Fit bounds to customer area after a short delay to ensure map is ready
    setTimeout(() => {
      if (bounds && bounds.length > 0) {
        map.fitBounds(bounds, { 
          padding: [50, 50],
          maxZoom: 16,
          animate: true,
          duration: 0.5,
        });
      }
    }, 100);

    return () => {
      if (drawTimeoutRef.current) clearTimeout(drawTimeoutRef.current);
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Add markers and update view when customers change
  useEffect(() => {
    if (!mapInstanceRef.current) return;

    // Clear existing markers
    markersRef.current.forEach(marker => marker.remove());
    markersRef.current = [];

    if (unassignedCustomers.length === 0) return;

    // Create custom icons
    const defaultIcon = new L.Icon.Default();
    const selectedIcon = new L.Icon({
      iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
      shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      shadowSize: [41, 41],
    });

    // Add markers for each customer
    const bounds: L.LatLngBoundsExpression = [];
    unassignedCustomers.forEach(customer => {
      if (!customer.latitude || !customer.longitude) return;

      const lat = parseFloat(customer.latitude);
      const lng = parseFloat(customer.longitude);
      
      if (isNaN(lat) || isNaN(lng)) return;

      bounds.push([lat, lng]);

      const isSelected = selectedCustomers.some(c => c.id === customer.id);
      const marker = L.marker([lat, lng], {
        icon: isSelected ? selectedIcon : defaultIcon,
      }).addTo(mapInstanceRef.current!);

      marker.bindPopup(`
        <div class="p-2 text-sm">
          <h3 class="font-bold mb-1">${customer.name}</h3>
          <p class="text-xs text-gray-600 mb-1">${customer.address}</p>
          ${customer.serviceType ? `<p class="text-xs"><strong>Service:</strong> ${customer.serviceType}</p>` : ''}
          ${customer.priority ? `<p class="text-xs"><strong>Priority:</strong> ${customer.priority}</p>` : ''}
        </div>
      `);

      markersRef.current.push(marker);
    });

    // Fit map to show all markers if no shapes are drawn
    if (bounds.length > 0 && drawnItemsRef.current && drawnItemsRef.current.getLayers().length === 0) {
      mapInstanceRef.current.fitBounds(bounds, { 
        padding: [50, 50],
        maxZoom: 16,
        animate: false,
      });
    }
  }, [unassignedCustomers, selectedCustomers]);

  const filterCustomersInArea = (layer: any) => {
    const selected: Customer[] = [];

    unassignedCustomers.forEach(customer => {
      if (!customer.latitude || !customer.longitude) return;

      const lat = parseFloat(customer.latitude);
      const lng = parseFloat(customer.longitude);
      
      if (isNaN(lat) || isNaN(lng)) return;

      const point = L.latLng(lat, lng);
      let isInside = false;

      if (layer instanceof L.Circle) {
        isInside = layer.getLatLng().distanceTo(point) <= layer.getRadius();
      } else if (layer instanceof L.Polygon || layer instanceof L.Rectangle) {
        isInside = isPointInPolygon(point, layer.getLatLngs()[0]);
      }

      if (isInside) {
        selected.push(customer);
      }
    });

    setSelectedCustomers(selected);
    onCustomersSelected(selected);
  };

  const isPointInPolygon = (point: L.LatLng, polygon: L.LatLng[]): boolean => {
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const xi = polygon[i].lat, yi = polygon[i].lng;
      const xj = polygon[j].lat, yj = polygon[j].lng;
      
      const intersect = ((yi > point.lng) !== (yj > point.lng))
        && (point.lat < (xj - xi) * (point.lng - yi) / (yj - yi) + xi);
      if (intersect) inside = !inside;
    }
    return inside;
  };

  const clearSelection = () => {
    if (drawnItemsRef.current) {
      drawnItemsRef.current.clearLayers();
    }
    setSelectedCustomers([]);
    onCustomersSelected([]);
    
    // Reset map to show all customers
    const bounds = calculateBounds(unassignedCustomers);
    if (bounds && Array.isArray(bounds) && bounds.length > 0 && mapInstanceRef.current) {
      mapInstanceRef.current.fitBounds(bounds as L.LatLngBoundsExpression, { 
        padding: [50, 50],
        maxZoom: 16,
        animate: true,
        duration: 0.5,
      });
    }
  };

  return (
    <div className="space-y-4">
      {/* Map Container */}
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MapPin className="w-5 h-5" />
              Interactive Customer Map
            </div>
            <div className="flex items-center gap-2 text-sm font-normal text-slate-300">
              <Users className="w-4 h-4" />
              {selectedCustomers.length} selected
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div 
            ref={mapRef} 
            className="w-full h-96 rounded-lg border border-slate-600 bg-slate-700"
          />
        </CardContent>
      </Card>

      {/* Instructions */}
      <Card className="bg-slate-800 border-slate-700">
        <CardContent className="pt-6">
          <p className="text-sm text-slate-300">
            Use the drawing tools (rectangle, circle, or polygon) to select customers. 
            Selected customers will be highlighted in green.
          </p>
        </CardContent>
      </Card>

      {/* Selected Customers List */}
      {selectedCustomers.length > 0 && (
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white text-lg">
              Selected Customers ({selectedCustomers.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {selectedCustomers.map(customer => (
                <div key={customer.id} className="flex items-center justify-between p-2 bg-slate-700 rounded">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-white">{customer.name}</p>
                    <p className="text-xs text-slate-400">{customer.address}</p>
                  </div>
                  <MapPin className="w-4 h-4 text-green-500 flex-shrink-0" />
                </div>
              ))}
            </div>
            <Button 
              onClick={clearSelection}
              variant="outline"
              className="w-full mt-4 text-slate-300 border-slate-600 hover:bg-slate-700"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Clear Selection
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

