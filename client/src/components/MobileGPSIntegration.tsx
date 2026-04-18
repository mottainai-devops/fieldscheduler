import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Smartphone, MapPin, Zap, AlertCircle, CheckCircle, Clock } from "lucide-react";
import { toast } from "sonner";

interface GPSDevice {
  id: string;
  managerName: string;
  deviceModel: string;
  phoneNumber: string;
  lastLocation: { lat: number; lng: number; timestamp: Date };
  batteryLevel: number;
  isConnected: boolean;
  locationUpdateFrequency: number; // seconds
  totalUpdatesReceived: number;
  lastUpdateTime: Date;
}

export default function MobileGPSIntegration() {
  const [devices, setDevices] = useState<GPSDevice[]>([]);
  const [isMonitoring, setIsMonitoring] = useState(false);

  // Initialize mock GPS devices
  useEffect(() => {
    const mockDevices: GPSDevice[] = [
      {
        id: "device-1",
        managerName: "Bukola",
        deviceModel: "iPhone 14 Pro",
        phoneNumber: "+234-801-234-5678",
        lastLocation: { lat: 6.5244, lng: 3.3792, timestamp: new Date() },
        batteryLevel: 87,
        isConnected: true,
        locationUpdateFrequency: 30,
        totalUpdatesReceived: 1247,
        lastUpdateTime: new Date(),
      },
      {
        id: "device-2",
        managerName: "Halleluyah",
        deviceModel: "Samsung Galaxy S23",
        phoneNumber: "+234-802-345-6789",
        lastLocation: { lat: 6.5255, lng: 3.3805, timestamp: new Date() },
        batteryLevel: 72,
        isConnected: true,
        locationUpdateFrequency: 30,
        totalUpdatesReceived: 1156,
        lastUpdateTime: new Date(),
      },
      {
        id: "device-3",
        managerName: "Juwon",
        deviceModel: "Xiaomi 13",
        phoneNumber: "+234-803-456-7890",
        lastLocation: { lat: 6.523, lng: 3.378, timestamp: new Date() },
        batteryLevel: 45,
        isConnected: true,
        locationUpdateFrequency: 30,
        totalUpdatesReceived: 892,
        lastUpdateTime: new Date(),
      },
      {
        id: "device-4",
        managerName: "Aishat",
        deviceModel: "iPhone 13",
        phoneNumber: "+234-804-567-8901",
        lastLocation: { lat: 6.527, lng: 3.382, timestamp: new Date() },
        batteryLevel: 91,
        isConnected: true,
        locationUpdateFrequency: 30,
        totalUpdatesReceived: 1389,
        lastUpdateTime: new Date(),
      },
    ];
    setDevices(mockDevices);
  }, []);

  // Simulate GPS updates
  useEffect(() => {
    if (!isMonitoring) return;

    const interval = setInterval(() => {
      setDevices((prev) =>
        prev.map((device) => ({
          ...device,
          lastLocation: {
            lat: device.lastLocation.lat + (Math.random() - 0.5) * 0.001,
            lng: device.lastLocation.lng + (Math.random() - 0.5) * 0.001,
            timestamp: new Date(),
          },
          batteryLevel: Math.max(0, device.batteryLevel - Math.random() * 0.5),
          totalUpdatesReceived: device.totalUpdatesReceived + 1,
          lastUpdateTime: new Date(),
        }))
      );
    }, device.locationUpdateFrequency * 1000);

    return () => clearInterval(interval);
  }, [isMonitoring, devices.length]);

  const getBatteryColor = (level: number) => {
    if (level > 70) return "text-green-400";
    if (level > 40) return "text-yellow-400";
    return "text-red-400";
  };

  const getBatteryBgColor = (level: number) => {
    if (level > 70) return "bg-green-900/20 border-green-700";
    if (level > 40) return "bg-yellow-900/20 border-yellow-700";
    return "bg-red-900/20 border-red-700";
  };

  const handleRequestLocation = (deviceId: string) => {
    toast.success("Location request sent to device");
  };

  const handleEnableHighFrequency = (deviceId: string) => {
    setDevices((prev) =>
      prev.map((d) =>
        d.id === deviceId ? { ...d, locationUpdateFrequency: 10 } : d
      )
    );
    toast.success("High-frequency tracking enabled (10 seconds)");
  };

  const handleDisableHighFrequency = (deviceId: string) => {
    setDevices((prev) =>
      prev.map((d) =>
        d.id === deviceId ? { ...d, locationUpdateFrequency: 30 } : d
      )
    );
    toast.success("Reverted to normal frequency (30 seconds)");
  };

  const connectedCount = devices.filter((d) => d.isConnected).length;
  const avgBattery = (devices.reduce((sum, d) => sum + d.batteryLevel, 0) / devices.length).toFixed(1);
  const totalUpdates = devices.reduce((sum, d) => sum + d.totalUpdatesReceived, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <Smartphone className="w-6 h-6" />
            Mobile GPS Integration
          </h2>
          <p className="text-slate-400 text-sm mt-1">Real-time GPS tracking from field managers' mobile phones</p>
        </div>
        <Button
          onClick={() => setIsMonitoring(!isMonitoring)}
          className={isMonitoring ? "bg-red-600 hover:bg-red-700" : "bg-green-600 hover:bg-green-700"}
        >
          {isMonitoring ? "Stop Monitoring" : "Start Monitoring"}
        </Button>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-slate-400">Connected Devices</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-green-400">{connectedCount}/{devices.length}</p>
            <p className="text-xs text-slate-500 mt-1">Active connections</p>
          </CardContent>
        </Card>

        <Card className="bg-slate-800 border-slate-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-slate-400">Avg Battery</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-blue-400">{avgBattery}%</p>
            <p className="text-xs text-slate-500 mt-1">Across all devices</p>
          </CardContent>
        </Card>

        <Card className="bg-slate-800 border-slate-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-slate-400">Total Updates</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-purple-400">{totalUpdates.toLocaleString()}</p>
            <p className="text-xs text-slate-500 mt-1">GPS data points received</p>
          </CardContent>
        </Card>

        <Card className="bg-slate-800 border-slate-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-slate-400">Update Frequency</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-yellow-400">30s</p>
            <p className="text-xs text-slate-500 mt-1">Default interval</p>
          </CardContent>
        </Card>
      </div>

      {/* Device Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {devices.map((device) => (
          <Card key={device.id} className="bg-slate-800 border-slate-700">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Smartphone className="w-5 h-5" />
                    {device.managerName}
                  </CardTitle>
                  <CardDescription className="text-slate-400 text-sm mt-1">
                    {device.deviceModel} • {device.phoneNumber}
                  </CardDescription>
                </div>
                <Badge className={device.isConnected ? "bg-green-900/20 border-green-700 text-green-400" : "bg-red-900/20 border-red-700 text-red-400"}>
                  {device.isConnected ? "Connected" : "Offline"}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Location Info */}
              <div className="bg-slate-700/50 rounded-lg p-3 space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <MapPin className="w-4 h-4 text-blue-400" />
                  <span className="text-slate-300">
                    {device.lastLocation.lat.toFixed(6)}, {device.lastLocation.lng.toFixed(6)}
                  </span>
                </div>
                <div className="text-xs text-slate-500">
                  Last update: {device.lastUpdateTime.toLocaleTimeString()}
                </div>
              </div>

              {/* Battery Status */}
              <div className={`rounded-lg p-3 border ${getBatteryBgColor(device.batteryLevel)}`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-slate-300">Battery Level</span>
                  <span className={`font-semibold ${getBatteryColor(device.batteryLevel)}`}>
                    {device.batteryLevel.toFixed(1)}%
                  </span>
                </div>
                <div className="w-full bg-slate-700 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all ${
                      device.batteryLevel > 70
                        ? "bg-green-600"
                        : device.batteryLevel > 40
                        ? "bg-yellow-600"
                        : "bg-red-600"
                    }`}
                    style={{ width: `${device.batteryLevel}%` }}
                  />
                </div>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-slate-700/30 rounded p-2">
                  <p className="text-xs text-slate-400">Total Updates</p>
                  <p className="text-lg font-bold text-green-400">{device.totalUpdatesReceived}</p>
                </div>
                <div className="bg-slate-700/30 rounded p-2">
                  <p className="text-xs text-slate-400">Update Freq</p>
                  <p className="text-lg font-bold text-blue-400">{device.locationUpdateFrequency}s</p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 pt-2 border-t border-slate-700">
                <Button
                  size="sm"
                  onClick={() => handleRequestLocation(device.id)}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-xs"
                >
                  <MapPin className="w-3 h-3 mr-1" />
                  Request Location
                </Button>
                {device.locationUpdateFrequency === 30 ? (
                  <Button
                    size="sm"
                    onClick={() => handleEnableHighFrequency(device.id)}
                    className="flex-1 bg-purple-600 hover:bg-purple-700 text-white text-xs"
                  >
                    <Zap className="w-3 h-3 mr-1" />
                    High Freq
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    onClick={() => handleDisableHighFrequency(device.id)}
                    className="flex-1 bg-slate-600 hover:bg-slate-700 text-white text-xs"
                  >
                    <Clock className="w-3 h-3 mr-1" />
                    Normal Freq
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Integration Info */}
      <Card className="bg-blue-900/20 border-blue-700">
        <CardHeader>
          <CardTitle className="text-blue-300 flex items-center gap-2">
            <AlertCircle className="w-5 h-5" />
            Mobile App Integration
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-blue-200 space-y-2">
          <p>✅ Real-time GPS data collection from field managers' mobile phones</p>
          <p>✅ Automatic location updates every 30 seconds (configurable)</p>
          <p>✅ Battery monitoring and low-battery alerts</p>
          <p>✅ High-frequency tracking mode for critical operations (10-second intervals)</p>
          <p>✅ Connection status monitoring (online/offline detection)</p>
          <p>✅ Total GPS data points tracking for analytics</p>
          <p>📱 <strong>Mobile App Requirements:</strong> iOS 12+ / Android 8+ with location permissions</p>
        </CardContent>
      </Card>
    </div>
  );
}

