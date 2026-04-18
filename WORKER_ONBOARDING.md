# Field Worker Scheduler - Worker Onboarding Guide

**Version:** 1.0.0  
**Last Updated:** November 8, 2025

## Welcome to Field Worker Scheduler!

This guide will help you get started with the Field Worker Scheduler mobile app. Whether you're new to the system or need a refresher, follow these steps to set up your account and start managing your routes efficiently.

---

## Table of Contents

1. [Getting Started](#getting-started)
2. [Mobile App Setup](#mobile-app-setup)
3. [Understanding Your Routes](#understanding-your-routes)
4. [Offline Mode](#offline-mode)
5. [GPS Tracking](#gps-tracking)
6. [Completing Deliveries](#completing-deliveries)
7. [Sync Queue Management](#sync-queue-management)
8. [Troubleshooting](#troubleshooting)
9. [FAQ](#faq)
10. [Support](#support)

---

## Getting Started

### System Requirements

**Mobile Device Requirements:**
- **iOS:** Version 13.0 or later
- **Android:** Version 8.0 or later
- **Storage:** At least 100MB free space
- **RAM:** At least 2GB RAM
- **Network:** WiFi or cellular data for initial setup

**Browser Compatibility:**
- Chrome/Edge 90+
- Safari 13+
- Firefox 88+

### First Time Setup

1. **Access the App**
   - Open your mobile browser
   - Navigate to: `https://your-domain.com/worker-mobile`
   - Bookmark this page for easy access

2. **Create Your Account**
   - Click "Sign Up" or "Create Account"
   - Enter your email address
   - Create a secure password
   - Verify your email address
   - Set your PIN (4-6 digits) for quick login

3. **Complete Your Profile**
   - Add your full name
   - Add your phone number
   - Select your vehicle (if assigned)
   - Accept terms and conditions

4. **Enable Permissions**
   - Allow location access (required for GPS tracking)
   - Allow camera access (for photo uploads)
   - Allow notifications (for route updates)

---

## Mobile App Setup

### Accessing the App

**Quick Access:**
```
URL: https://your-domain.com/worker-mobile
PIN: Your 4-6 digit PIN
```

### Dashboard Overview

When you first log in, you'll see your dashboard with:

| Section | Description |
|---------|-------------|
| **Today's Routes** | Routes assigned to you for today |
| **Route Status** | Pending, In Progress, Completed |
| **Pending Deliveries** | Number of customers to visit |
| **Sync Status** | Online/Offline indicator |
| **GPS Status** | Location tracking status |

### Navigation Menu

- **Home:** Dashboard and route overview
- **Routes:** View all assigned routes
- **Customers:** View customer details and addresses
- **Map:** View route on map with GPS
- **Settings:** Profile, preferences, offline settings
- **Help:** Support and troubleshooting

---

## Understanding Your Routes

### Route Components

**Each route contains:**
- **Route ID:** Unique identifier for the route
- **Customers:** List of customers to visit
- **Sequence:** Recommended order of visits
- **Distance:** Total distance for the route
- **Estimated Time:** Expected time to complete
- **Status:** Pending, In Progress, Completed

### Route Details

Click on a route to see:

1. **Route Summary**
   - Total customers
   - Total distance
   - Estimated time
   - Vehicle assigned
   - Driver assigned

2. **Customer List**
   - Customer name
   - Address
   - Phone number
   - Special instructions
   - Delivery status

3. **Route Map**
   - Visual representation of route
   - Customer locations
   - Current GPS position
   - Optimized sequence

### Starting a Route

1. Open the route
2. Click "Start Route"
3. Confirm vehicle and driver
4. App will start GPS tracking
5. Route status changes to "In Progress"

---

## Offline Mode

### What is Offline Mode?

Offline mode allows you to continue working even when you don't have internet connection. Your app automatically caches:
- Assigned routes
- Customer information
- Delivery history
- GPS locations

### Automatic Offline Support

The app automatically:
- **Caches routes** when you view them
- **Saves GPS locations** even offline
- **Queues updates** for later sync
- **Syncs automatically** when online

### Offline Indicators

**Online Status:**
- Green "Online" badge in top-right
- Real-time sync available
- All features available

**Offline Status:**
- Red "Offline" badge in top-right
- Cached data available
- Updates queued for sync
- "Syncing..." shows pending updates

### Using Offline Mode

1. **Before Going Offline**
   - Open your routes to cache them
   - View customer details you'll need
   - Ensure GPS is enabled

2. **While Offline**
   - View cached routes and customers
   - Track GPS location
   - Complete deliveries
   - Take photos
   - All changes are saved locally

3. **When Back Online**
   - App automatically syncs changes
   - "Syncing..." indicator shows progress
   - "All synced" message when complete
   - Updates sent to server

### Sync Queue

The sync queue stores all changes made offline:
- **Pending Updates:** Changes waiting to sync
- **Sync Status:** Current sync progress
- **Retry Logic:** Automatic retry if sync fails
- **Manual Sync:** Click "Sync Now" to force sync

---

## GPS Tracking

### Enabling GPS Tracking

1. **Grant Permission**
   - Allow location access when prompted
   - Required for GPS tracking

2. **Enable GPS**
   - Go to Settings
   - Toggle "GPS Tracking" ON
   - Allow high accuracy location

3. **Start Tracking**
   - Open a route
   - Click "Start Route"
   - GPS automatically starts tracking

### GPS Accuracy

**Accuracy Levels:**
- **High Accuracy:** < 10 meters (best for deliveries)
- **Balanced:** 10-30 meters (good for most uses)
- **Battery Saver:** 30-100 meters (saves battery)

**Tips for Better Accuracy:**
- Use high accuracy mode
- Stay outdoors when possible
- Avoid tall buildings and tunnels
- Keep GPS enabled during deliveries

### GPS Data

GPS data includes:
- **Latitude & Longitude:** Your exact position
- **Timestamp:** When location was recorded
- **Accuracy:** Accuracy of the reading
- **Speed:** Your current speed
- **Altitude:** Your elevation

### Privacy

Your GPS data:
- Is encrypted in transit
- Stored securely on servers
- Only visible to authorized personnel
- Automatically deleted after 90 days
- Can be disabled in settings

---

## Completing Deliveries

### Delivery Workflow

1. **Navigate to Customer**
   - Use map or directions
   - Follow optimized sequence
   - Arrive at customer location

2. **Arrive at Location**
   - GPS confirms arrival
   - Customer details displayed
   - Special instructions shown

3. **Complete Delivery**
   - Verify customer information
   - Confirm delivery details
   - Take photo (if required)
   - Get customer signature (if required)
   - Add notes (optional)

4. **Submit Delivery**
   - Click "Complete Delivery"
   - Confirm all details
   - Delivery marked as complete
   - Changes queued for sync

5. **Move to Next Customer**
   - App shows next customer
   - Navigate to next location
   - Repeat process

### Delivery Status

**Status Indicators:**
- **Pending:** Not yet visited
- **In Progress:** Currently being served
- **Completed:** Successfully delivered
- **Failed:** Unable to complete
- **Pending Sync:** Waiting to sync

### Photo Requirements

**When Photos Are Required:**
- Signature not available
- Damage verification needed
- Special instructions
- Customer request

**Taking Photos:**
1. Click "Take Photo"
2. Position camera
3. Capture image
4. Review and confirm
5. Photo attached to delivery

### Notes and Comments

**Adding Notes:**
1. Click "Add Note"
2. Type your comment
3. Select category (optional)
4. Save note
5. Note attached to delivery

**Note Categories:**
- General comment
- Issue/Problem
- Customer request
- Special instruction
- Follow-up required

---

## Sync Queue Management

### Understanding the Sync Queue

The sync queue stores all changes made offline:
- **Pending Deliveries:** Completed but not synced
- **Updated Information:** Changes to customer data
- **GPS Locations:** Tracked positions
- **Photos:** Uploaded images
- **Notes:** Added comments

### Checking Sync Status

1. **Status Indicator**
   - Top-right corner shows online/offline
   - "Syncing..." shows active sync
   - "All synced" shows complete

2. **Sync Queue Details**
   - Go to Settings
   - Tap "Sync Queue"
   - View pending items
   - See sync status

3. **Sync History**
   - View last sync time
   - See sync success rate
   - Check for errors

### Manual Sync

**Force Sync:**
1. Go to Settings
2. Tap "Sync Now"
3. App syncs all pending changes
4. Wait for "All synced" message

**Automatic Sync:**
- Syncs when online
- Syncs every 5 minutes
- Syncs on app launch
- Syncs on route completion

### Sync Issues

**If Sync Fails:**
1. Check internet connection
2. Ensure app is up to date
3. Try manual sync
4. Restart app
5. Contact support if persistent

**Sync Retry:**
- Automatic retry every 5 minutes
- Manual retry available
- Max 3 retries before alert
- Support can force sync

---

## Troubleshooting

### Common Issues

#### App Won't Load

**Problem:** App page doesn't load  
**Solution:**
1. Check internet connection
2. Clear browser cache
3. Refresh page (Ctrl+R or Cmd+R)
4. Try different browser
5. Restart phone

#### GPS Not Working

**Problem:** GPS tracking not available  
**Solution:**
1. Check location permission is granted
2. Enable GPS in phone settings
3. Go outdoors for better signal
4. Restart app
5. Restart phone

#### Offline Mode Not Working

**Problem:** Can't access routes offline  
**Solution:**
1. View routes while online to cache them
2. Check offline storage is enabled
3. Ensure sufficient storage space
4. Clear app cache and reload
5. Contact support

#### Sync Not Working

**Problem:** Changes not syncing  
**Solution:**
1. Check internet connection
2. Click "Sync Now" manually
3. Check sync queue for errors
4. Restart app
5. Contact support

#### Photos Not Uploading

**Problem:** Photos stuck in queue  
**Solution:**
1. Check file size (< 5MB)
2. Check internet connection
3. Try uploading again
4. Compress photo and retry
5. Contact support

#### Slow Performance

**Problem:** App is slow or laggy  
**Solution:**
1. Close other apps
2. Restart phone
3. Clear app cache
4. Update app to latest version
5. Contact support

### Getting Help

**In-App Help:**
1. Go to Settings
2. Tap "Help & Support"
3. Browse FAQ
4. Submit support ticket

**Contact Support:**
- **Email:** support@example.com
- **Phone:** +1-xxx-xxx-xxxx
- **Chat:** Available 9 AM - 5 PM
- **Emergency:** +1-xxx-xxx-xxxx (24/7)

---

## FAQ

### Account & Login

**Q: How do I reset my password?**  
A: Click "Forgot Password" on login screen, enter email, follow reset instructions.

**Q: Can I have multiple accounts?**  
A: No, one account per worker. Contact admin to change assignment.

**Q: How do I change my PIN?**  
A: Go to Settings → Security → Change PIN.

### Routes & Deliveries

**Q: Why is my route different from yesterday?**  
A: Routes are optimized daily based on customer locations and traffic.

**Q: Can I skip a customer?**  
A: No, complete all customers in your route. Contact supervisor if issue.

**Q: What if I can't find a customer?**  
A: Use map to verify location, call customer, add note, contact supervisor.

### Offline & Sync

**Q: How much data does offline mode use?**  
A: Minimal - only caches routes and customer data (< 50MB).

**Q: Will my changes be lost if offline?**  
A: No, all changes are saved locally and synced when online.

**Q: How long does sync take?**  
A: Usually < 30 seconds, depends on number of changes and connection.

### GPS & Privacy

**Q: Is GPS always tracking?**  
A: Only when route is active. Disabled when not working.

**Q: Who can see my GPS location?**  
A: Only authorized managers. Not visible to customers.

**Q: How long is GPS data kept?**  
A: 90 days, then automatically deleted.

### Technical

**Q: What if my phone dies during delivery?**  
A: All changes are saved. Complete delivery when phone is charged.

**Q: Can I use WiFi instead of cellular?**  
A: Yes, WiFi works fine. Cellular recommended for reliability.

**Q: What's the minimum phone storage needed?**  
A: At least 100MB free space recommended.

---

## Best Practices

### Daily Routine

1. **Start of Day**
   - Log in to app
   - Review assigned routes
   - Check weather and traffic
   - Ensure GPS is enabled

2. **During Day**
   - Follow optimized route sequence
   - Update delivery status promptly
   - Take required photos
   - Add notes for issues
   - Check sync status regularly

3. **End of Day**
   - Complete all deliveries
   - Ensure all changes synced
   - Review next day's routes
   - Log out if required

### Efficiency Tips

**Optimize Your Route:**
- Follow suggested sequence
- Don't skip customers
- Minimize backtracking
- Use map view for navigation

**Save Time:**
- Pre-load routes while online
- Take photos efficiently
- Use voice notes for complex issues
- Batch similar tasks

**Maintain Data Quality:**
- Accurate GPS locations
- Clear photos
- Detailed notes
- Timely updates

### Safety Tips

**Personal Safety:**
- Stay aware of surroundings
- Don't share location with customers
- Keep phone secure
- Report suspicious activity

**Device Safety:**
- Keep phone updated
- Use strong password
- Enable auto-lock
- Backup important data

---

## Support & Contact

### Getting Help

**In-App Support:**
- Settings → Help & Support
- FAQ section
- Submit support ticket
- View documentation

**Contact Methods:**
| Method | Hours | Response Time |
|--------|-------|---------------|
| Email | 24/7 | 24 hours |
| Chat | 9 AM - 5 PM | 1 hour |
| Phone | 9 AM - 5 PM | Immediate |
| Emergency | 24/7 | 15 minutes |

### Support Information

**Email:** support@example.com  
**Phone:** +1-xxx-xxx-xxxx  
**Chat:** Available in app  
**Emergency:** +1-xxx-xxx-xxxx

### Feedback

We'd love to hear from you!
- Rate the app in store
- Submit feature requests
- Report bugs
- Share your experience

---

## Additional Resources

### Video Tutorials

- [Getting Started (5 min)](https://example.com/videos/getting-started)
- [GPS Tracking (3 min)](https://example.com/videos/gps-tracking)
- [Offline Mode (4 min)](https://example.com/videos/offline-mode)
- [Completing Deliveries (6 min)](https://example.com/videos/deliveries)

### Documentation

- [System Overview](./SYSTEM_REVIEW.md)
- [Technical Guide](./README.md)
- [API Documentation](./API_DOCS.md)

### Training

- [Live Training Sessions](https://example.com/training)
- [One-on-One Coaching](https://example.com/coaching)
- [Certification Program](https://example.com/certification)

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2025-11-08 | Initial release with offline support |
| 0.9.0 | 2025-11-01 | Beta release |

---

## Acknowledgments

Thank you for using Field Worker Scheduler! Your feedback helps us improve the system continuously.

**Last Updated:** November 8, 2025  
**Next Update:** November 15, 2025

---

**Happy Delivering! 🚚**

