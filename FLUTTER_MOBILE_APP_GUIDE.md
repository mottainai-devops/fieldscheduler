# Flutter Mobile App Integration Guide

## 📱 Overview

This guide provides instructions for building and integrating the Flutter mobile application for field workers with the deployed web backend at `https://app.fieldscheduler.net/`.

---

## 🛠️ Prerequisites

### Development Environment

```bash
# Install Flutter SDK (3.13+)
# https://flutter.dev/docs/get-started/install

# Verify installation
flutter --version
dart --version

# Install required tools
flutter pub global activate fvm  # Flutter Version Manager (optional)

# Get dependencies
flutter pub get
```

### Required Packages

```yaml
# pubspec.yaml dependencies
dependencies:
  flutter:
    sdk: flutter
  
  # HTTP & API
  http: ^1.1.0
  dio: ^5.3.0
  
  # State Management
  provider: ^6.0.0
  riverpod: ^2.4.0
  
  # Local Storage
  shared_preferences: ^2.2.0
  hive: ^2.2.0
  
  # GPS & Location
  geolocator: ^9.0.0
  google_maps_flutter: ^2.5.0
  
  # Geofencing
  geofencing: ^0.0.1
  flutter_background_service: ^5.0.0
  
  # Notifications
  firebase_messaging: ^14.6.0
  flutter_local_notifications: ^16.1.0
  
  # Authentication
  flutter_secure_storage: ^9.0.0
  
  # UI
  flutter_riverpod: ^2.4.0
  freezed_annotation: ^2.4.0
  json_serializable: ^6.7.0
  
  # Utilities
  intl: ^0.19.0
  uuid: ^4.0.0
  image_picker: ^1.0.0
```

---

## 🏗️ Project Structure

```
flutter_app/
├── lib/
│   ├── main.dart                          # App entry point
│   ├── config/
│   │   ├── api_config.dart               # API configuration
│   │   ├── app_config.dart               # App configuration
│   │   └── theme_config.dart             # Theme configuration
│   ├── models/
│   │   ├── user_model.dart               # User data model
│   │   ├── route_model.dart              # Route data model
│   │   ├── customer_model.dart           # Customer data model
│   │   ├── gps_location_model.dart       # GPS location model
│   │   └── geofence_event_model.dart     # Geofence event model
│   ├── services/
│   │   ├── api_service.dart              # REST API calls
│   │   ├── auth_service.dart             # Authentication
│   │   ├── gps_service.dart              # GPS tracking
│   │   ├── geofence_service.dart         # Geofencing
│   │   ├── notification_service.dart     # Push notifications
│   │   ├── storage_service.dart          # Local storage
│   │   └── background_service.dart       # Background tasks
│   ├── providers/
│   │   ├── auth_provider.dart            # Auth state
│   │   ├── route_provider.dart           # Route state
│   │   ├── gps_provider.dart             # GPS state
│   │   └── notification_provider.dart    # Notification state
│   ├── screens/
│   │   ├── splash_screen.dart            # Splash screen
│   │   ├── login_screen.dart             # OAuth login
│   │   ├── home_screen.dart              # Home/dashboard
│   │   ├── routes_screen.dart            # List of routes
│   │   ├── route_detail_screen.dart      # Route details
│   │   ├── customer_detail_screen.dart   # Customer details
│   │   ├── gps_tracking_screen.dart      # Live GPS tracking
│   │   ├── check_in_screen.dart          # Customer check-in
│   │   ├── notifications_screen.dart     # Notifications
│   │   └── settings_screen.dart          # Settings
│   ├── widgets/
│   │   ├── route_card.dart               # Route card widget
│   │   ├── customer_card.dart            # Customer card widget
│   │   ├── gps_map.dart                  # Google Maps widget
│   │   ├── check_in_form.dart            # Check-in form
│   │   └── custom_app_bar.dart           # Custom app bar
│   └── utils/
│       ├── constants.dart                # App constants
│       ├── extensions.dart               # Dart extensions
│       └── validators.dart               # Input validators
├── android/
│   └── app/
│       └── src/
│           └── main/
│               ├── AndroidManifest.xml   # Android permissions
│               └── kotlin/
│                   └── MainActivity.kt   # Android main activity
├── ios/
│   └── Runner/
│       ├── Info.plist                    # iOS configuration
│       └── Runner.xcodeproj/             # Xcode project
└── pubspec.yaml                          # Dependencies
```

---

## 🔐 Authentication Setup

### OAuth Integration

```dart
// lib/services/auth_service.dart

import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';

class AuthService {
  static const String baseUrl = 'https://app.fieldscheduler.net/api';
  static const String oauthUrl = 'https://oauth.manus.im';
  
  final _secureStorage = const FlutterSecureStorage();
  
  // OAuth Login
  Future<bool> loginWithOAuth() async {
    try {
      // Open OAuth login page
      // Get authorization code
      // Exchange for access token
      
      final response = await http.post(
        Uri.parse('$baseUrl/auth/login'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'authorizationCode': authCode,
          'redirectUri': 'com.fieldscheduler://oauth-callback',
        }),
      );
      
      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        
        // Save tokens securely
        await _secureStorage.write(
          key: 'access_token',
          value: data['accessToken'],
        );
        await _secureStorage.write(
          key: 'refresh_token',
          value: data['refreshToken'],
        );
        
        return true;
      }
      return false;
    } catch (e) {
      print('OAuth login error: $e');
      return false;
    }
  }
  
  // Get stored token
  Future<String?> getAccessToken() async {
    return await _secureStorage.read(key: 'access_token');
  }
  
  // Logout
  Future<void> logout() async {
    await _secureStorage.delete(key: 'access_token');
    await _secureStorage.delete(key: 'refresh_token');
  }
}
```

---

## 📍 GPS Tracking Implementation

### Real-time GPS Updates

```dart
// lib/services/gps_service.dart

import 'package:geolocator/geolocator.dart';
import 'package:http/http.dart' as http;

class GPSService {
  static const String baseUrl = 'https://app.fieldscheduler.net/api';
  static const int updateInterval = 30; // seconds (30s default, 10s high-frequency)
  
  late StreamSubscription<Position> _positionStream;
  
  // Start GPS tracking
  Future<void> startTracking({
    required String routeId,
    required String managerId,
    bool highFrequency = false,
  }) async {
    final interval = highFrequency ? 10 : 30;
    
    _positionStream = Geolocator.getPositionStream(
      locationSettings: LocationSettings(
        accuracy: LocationAccuracy.best,
        distanceFilter: 10, // meters
        timeLimit: Duration(seconds: interval),
      ),
    ).listen((Position position) async {
      // Send GPS update to backend
      await _sendGPSUpdate(
        routeId: routeId,
        managerId: managerId,
        latitude: position.latitude,
        longitude: position.longitude,
        accuracy: position.accuracy,
        altitude: position.altitude,
        speed: position.speed,
      );
    });
  }
  
  // Send GPS update to backend
  Future<void> _sendGPSUpdate({
    required String routeId,
    required String managerId,
    required double latitude,
    required double longitude,
    required double accuracy,
    required double altitude,
    required double speed,
  }) async {
    try {
      final token = await _getAccessToken();
      
      final response = await http.post(
        Uri.parse('$baseUrl/gps/update'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
        body: jsonEncode({
          'routeId': routeId,
          'managerId': managerId,
          'latitude': latitude,
          'longitude': longitude,
          'accuracy': accuracy,
          'altitude': altitude,
          'speed': speed,
          'timestamp': DateTime.now().toIso8601String(),
        }),
      );
      
      if (response.statusCode != 200) {
        print('GPS update failed: ${response.statusCode}');
      }
    } catch (e) {
      print('GPS update error: $e');
    }
  }
  
  // Stop GPS tracking
  Future<void> stopTracking() async {
    await _positionStream.cancel();
  }
}
```

---

## 🎯 Geofencing Implementation

### Auto Check-in/Check-out

```dart
// lib/services/geofence_service.dart

import 'package:geolocator/geolocator.dart';
import 'package:flutter_background_service/flutter_background_service.dart';

class GeofenceService {
  static const String baseUrl = 'https://app.fieldscheduler.net/api';
  static const int geofenceRadius = 100; // meters (100-500m configurable)
  
  // Setup geofence monitoring
  Future<void> setupGeofences({
    required List<GeofenceData> geofences,
    required String managerId,
  }) async {
    for (var geofence in geofences) {
      // Monitor geofence
      _monitorGeofence(
        geofenceId: geofence.id,
        latitude: geofence.latitude,
        longitude: geofence.longitude,
        radius: geofence.radiusMeters,
        managerId: managerId,
      );
    }
  }
  
  // Monitor single geofence
  void _monitorGeofence({
    required String geofenceId,
    required double latitude,
    required double longitude,
    required int radius,
    required String managerId,
  }) {
    // Get current position periodically
    Timer.periodic(Duration(seconds: 10), (timer) async {
      final position = await Geolocator.getCurrentPosition();
      
      final distance = Geolocator.distanceBetween(
        latitude,
        longitude,
        position.latitude,
        position.longitude,
      );
      
      // Check if inside geofence
      if (distance <= radius) {
        // Inside geofence - trigger check-in
        await _handleGeofenceEntry(
          geofenceId: geofenceId,
          managerId: managerId,
          latitude: position.latitude,
          longitude: position.longitude,
        );
      } else {
        // Outside geofence - trigger check-out
        await _handleGeofenceExit(
          geofenceId: geofenceId,
          managerId: managerId,
          latitude: position.latitude,
          longitude: position.longitude,
        );
      }
    });
  }
  
  // Handle geofence entry (auto check-in)
  Future<void> _handleGeofenceEntry({
    required String geofenceId,
    required String managerId,
    required double latitude,
    required double longitude,
  }) async {
    try {
      final token = await _getAccessToken();
      
      final response = await http.post(
        Uri.parse('$baseUrl/geofence/check-in'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
        body: jsonEncode({
          'geofenceId': geofenceId,
          'managerId': managerId,
          'latitude': latitude,
          'longitude': longitude,
          'timestamp': DateTime.now().toIso8601String(),
        }),
      );
      
      if (response.statusCode == 200) {
        // Show notification
        _showNotification(
          title: 'Check-in Successful',
          body: 'You have been automatically checked in',
        );
      }
    } catch (e) {
      print('Geofence entry error: $e');
    }
  }
  
  // Handle geofence exit (auto check-out)
  Future<void> _handleGeofenceExit({
    required String geofenceId,
    required String managerId,
    required double latitude,
    required double longitude,
  }) async {
    try {
      final token = await _getAccessToken();
      
      final response = await http.post(
        Uri.parse('$baseUrl/geofence/check-out'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
        body: jsonEncode({
          'geofenceId': geofenceId,
          'managerId': managerId,
          'latitude': latitude,
          'longitude': longitude,
          'timestamp': DateTime.now().toIso8601String(),
        }),
      );
      
      if (response.statusCode == 200) {
        // Show notification
        _showNotification(
          title: 'Check-out Successful',
          body: 'You have been automatically checked out',
        );
      }
    } catch (e) {
      print('Geofence exit error: $e');
    }
  }
}
```

---

## 📲 Push Notifications

### Firebase Cloud Messaging Setup

```dart
// lib/services/notification_service.dart

import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';

class NotificationService {
  static final FirebaseMessaging _firebaseMessaging = FirebaseMessaging.instance;
  static final FlutterLocalNotificationsPlugin _localNotifications =
      FlutterLocalNotificationsPlugin();
  
  // Initialize notifications
  static Future<void> initialize() async {
    // Request notification permission
    await _firebaseMessaging.requestPermission(
      alert: true,
      announcement: false,
      badge: true,
      carryForward: true,
      criticalAlert: false,
      provisional: false,
      sound: true,
    );
    
    // Get FCM token
    final token = await _firebaseMessaging.getToken();
    print('FCM Token: $token');
    
    // Send token to backend
    await _sendTokenToBackend(token!);
    
    // Handle foreground messages
    FirebaseMessaging.onMessage.listen((RemoteMessage message) {
      _handleNotification(message);
    });
    
    // Handle background messages
    FirebaseMessaging.onBackgroundMessage(_firebaseMessagingBackgroundHandler);
  }
  
  // Send FCM token to backend
  static Future<void> _sendTokenToBackend(String token) async {
    try {
      final authToken = await _getAccessToken();
      
      await http.post(
        Uri.parse('https://app.fieldscheduler.net/api/notifications/register-device'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $authToken',
        },
        body: jsonEncode({
          'fcmToken': token,
          'platform': Platform.isAndroid ? 'android' : 'ios',
          'deviceName': _getDeviceName(),
        }),
      );
    } catch (e) {
      print('Error sending FCM token: $e');
    }
  }
  
  // Handle incoming notification
  static void _handleNotification(RemoteMessage message) {
    final notification = message.notification;
    final data = message.data;
    
    if (notification != null) {
      _showLocalNotification(
        title: notification.title ?? 'Notification',
        body: notification.body ?? '',
        payload: jsonEncode(data),
      );
    }
  }
  
  // Show local notification
  static Future<void> _showLocalNotification({
    required String title,
    required String body,
    required String payload,
  }) async {
    const AndroidNotificationDetails androidDetails =
        AndroidNotificationDetails(
      'field_worker_channel',
      'Field Worker Notifications',
      channelDescription: 'Notifications for field worker app',
      importance: Importance.max,
      priority: Priority.high,
    );
    
    const NotificationDetails details = NotificationDetails(
      android: androidDetails,
    );
    
    await _localNotifications.show(
      0,
      title,
      body,
      details,
      payload: payload,
    );
  }
}

// Background message handler
Future<void> _firebaseMessagingBackgroundHandler(RemoteMessage message) async {
  print('Handling background message: ${message.messageId}');
  NotificationService._handleNotification(message);
}
```

---

## 🗺️ Google Maps Integration

### Display Routes on Map

```dart
// lib/widgets/gps_map.dart

import 'package:google_maps_flutter/google_maps_flutter.dart';

class GPSMap extends StatefulWidget {
  final List<LatLng> routePoints;
  final List<Customer> customers;
  final LatLng currentLocation;
  
  const GPSMap({
    required this.routePoints,
    required this.customers,
    required this.currentLocation,
  });
  
  @override
  State<GPSMap> createState() => _GPSMapState();
}

class _GPSMapState extends State<GPSMap> {
  late GoogleMapController mapController;
  
  @override
  Widget build(BuildContext context) {
    return GoogleMap(
      onMapCreated: (controller) {
        mapController = controller;
      },
      initialCameraPosition: CameraPosition(
        target: widget.currentLocation,
        zoom: 15,
      ),
      polylines: {
        Polyline(
          polylineId: PolylineId('route'),
          points: widget.routePoints,
          color: Colors.blue,
          width: 5,
        ),
      },
      markers: {
        // Current location marker
        Marker(
          markerId: MarkerId('current'),
          position: widget.currentLocation,
          infoWindow: InfoWindow(title: 'Your Location'),
          icon: BitmapDescriptor.defaultMarkerWithHue(
            BitmapDescriptor.hueBlue,
          ),
        ),
        // Customer markers
        ...widget.customers.map((customer) {
          return Marker(
            markerId: MarkerId(customer.id),
            position: LatLng(customer.latitude, customer.longitude),
            infoWindow: InfoWindow(
              title: customer.name,
              snippet: customer.address,
            ),
            icon: BitmapDescriptor.defaultMarkerWithHue(
              BitmapDescriptor.hueRed,
            ),
          );
        }).toSet(),
      },
    );
  }
}
```

---

## 🧪 Testing

### Unit Tests

```dart
// test/services/gps_service_test.dart

import 'package:flutter_test/flutter_test.dart';
import 'package:field_worker_app/services/gps_service.dart';

void main() {
  group('GPSService', () {
    late GPSService gpsService;
    
    setUp(() {
      gpsService = GPSService();
    });
    
    test('GPS update sends correct data', () async {
      // Test GPS update functionality
    });
    
    test('Geofence detection works correctly', () async {
      // Test geofence detection
    });
  });
}
```

### Integration Tests

```dart
// test_driver/app_test.dart

import 'package:flutter_test/flutter_test.dart';
import 'package:integration_test/integration_test.dart';
import 'package:field_worker_app/main.dart' as app;

void main() {
  IntegrationTestWidgetsFlutterBinding.ensureInitialized();
  
  group('Field Worker App Integration Tests', () {
    testWidgets('Login flow', (WidgetTester tester) async {
      app.main();
      await tester.pumpAndSettle();
      
      // Test login flow
    });
    
    testWidgets('Route display', (WidgetTester tester) async {
      app.main();
      await tester.pumpAndSettle();
      
      // Test route display
    });
  });
}
```

---

## 📦 Building & Deployment

### Android Build

```bash
# Generate signing key
keytool -genkey -v -keystore ~/field-worker-key.jks \
  -keyalg RSA -keysize 2048 -validity 10000 -alias field-worker

# Build APK
flutter build apk --release

# Build App Bundle (for Google Play)
flutter build appbundle --release

# Output: build/app/outputs/apk/release/app-release.apk
```

### iOS Build

```bash
# Build IPA
flutter build ios --release

# Archive for App Store
cd ios
xcodebuild -workspace Runner.xcworkspace -scheme Runner \
  -configuration Release -archivePath build/Runner.xcarchive archive

# Export IPA
xcodebuild -exportArchive -archivePath build/Runner.xcarchive \
  -exportOptionsPlist ExportOptions.plist \
  -exportPath build/ipa
```

### Play Store Deployment

1. Create Google Play Developer account
2. Create app listing
3. Add app details, screenshots, description
4. Upload APK/App Bundle
5. Set pricing and distribution
6. Submit for review

### App Store Deployment

1. Create Apple Developer account
2. Create app in App Store Connect
3. Add app details, screenshots, description
4. Upload IPA via Xcode or Transporter
5. Submit for review

---

## 📱 Device Permissions

### Android (AndroidManifest.xml)

```xml
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.CAMERA" />
<uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" />
<uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" />
<uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
<uses-permission android:name="android.permission.ACCESS_BACKGROUND_LOCATION" />
```

### iOS (Info.plist)

```xml
<key>NSLocationWhenInUseUsageDescription</key>
<string>We need your location to track your route and enable geofencing</string>

<key>NSLocationAlwaysAndWhenInUseUsageDescription</key>
<string>We need your location for background tracking</string>

<key>NSCameraUsageDescription</key>
<string>We need camera access to capture photos during customer visits</string>

<key>NSPhotoLibraryUsageDescription</key>
<string>We need access to your photo library</string>

<key>UIBackgroundModes</key>
<array>
  <string>location</string>
  <string>fetch</string>
</array>
```

---

## 🚀 Deployment Timeline

**Week 1:** Setup development environment, create project structure
**Week 2:** Implement authentication and API integration
**Week 3:** Build GPS tracking and geofencing
**Week 4:** Implement notifications and UI
**Week 5:** Testing and optimization
**Week 6:** Deploy to app stores

---

## 📞 API Reference

See the web application API documentation at:
`https://app.fieldscheduler.net/api-docs`

---

**Status:** Ready for Flutter Development
**Last Updated:** November 2025
**Version:** 1.0.0

