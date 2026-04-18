# Route Creation Guide

## Field Worker Scheduler - Route Creation Methods

This guide explains the four different methods for creating routes in the Field Worker Scheduler system.

---

## Table of Contents

1. [Manual Selection](#1-manual-selection)
2. [Cluster Selection (Distance-Based)](#2-cluster-selection-distance-based)
3. [Cluster Selection (Customer Count-Based)](#3-cluster-selection-customer-count-based)
4. [Area Selection (Map-Based)](#4-area-selection-map-based)

---

## 1. Manual Selection

**Best for:** Small routes, specific customer combinations, or when you need precise control over which customers are included.

### How to Use:

1. **Navigate to Create Route Page**
   - Go to **Routes** → Click **"Create Route"** button

2. **Enter Route Details**
   - **Route Name:** Enter a descriptive name (e.g., "Downtown Morning Route")
   - **Scheduled Date:** Select the date for this route
   - **Assigned Worker:** Choose a worker from the dropdown
   - **Assigned Vehicle:** Select a vehicle from the dropdown

3. **Select Customers Manually**
   - Scroll through the customer list
   - Click the checkbox next to each customer you want to include
   - Selected customers will be highlighted
   - You can select as many customers as needed

4. **Review Selection**
   - Check the number of selected customers displayed
   - Verify all required customers are checked

5. **Create Route**
   - Click the **"Create Route"** button at the bottom
   - System will optimize the order automatically
   - Success notification will appear

### Tips:
- Use search/filter to find specific customers quickly
- Consider geographic proximity when selecting manually
- Check worker capacity before adding too many customers

---

## 2. Cluster Selection (Distance-Based)

**Best for:** Creating routes based on geographic proximity, ensuring customers close to each other are grouped together.

### How to Use:

1. **Navigate to Create Route Page**
   - Go to **Routes** → Click **"Create Route"** button

2. **Switch to Cluster Mode**
   - Click **"Distance"** tab in the clustering section
   - This enables distance-based clustering

3. **Set Clustering Parameters**
   - **Cluster Radius:** Set the maximum distance (in km) between customers in the same cluster
   - Default is usually 5 km
   - Smaller radius = tighter clusters, more routes
   - Larger radius = looser clusters, fewer routes

4. **Generate Clusters**
   - Click **"Generate Clusters"** button
   - System uses DBSCAN algorithm to group nearby customers
   - Wait for clustering to complete (usually a few seconds)

5. **Review Generated Clusters**
   - System displays all clusters with:
     - Number of customers in each cluster
     - Geographic center point
     - Cluster color coding on map

6. **Select Cluster**
   - Click on a cluster to select all customers in it
   - All customers in that cluster will be automatically selected

7. **Complete Route Creation**
   - Enter route name, date, worker, and vehicle
   - Click **"Create Route"**

### Tips:
- Start with a 5km radius and adjust based on results
- Urban areas may need smaller radius (2-3km)
- Rural areas may need larger radius (10-15km)
- Review cluster sizes before creating routes

---

## 3. Cluster Selection (Customer Count-Based)

**Best for:** Creating balanced routes with a specific number of customers per route, ensuring even workload distribution.

### How to Use:

1. **Navigate to Create Route Page**
   - Go to **Routes** → Click **"Create Route"** button

2. **Switch to Count-Based Clustering**
   - Click **"Count"** tab in the clustering section
   - This enables customer count-based clustering

3. **Set Customer Count**
   - **Customers per Cluster:** Enter the target number of customers for each cluster
   - Example: Enter "10" to create clusters of approximately 10 customers each
   - System will try to create equal-sized groups

4. **Generate Clusters**
   - Click **"Generate Clusters"** button
   - System uses K-means algorithm to create balanced groups
   - Considers both customer count AND geographic proximity

5. **Review Generated Clusters**
   - Each cluster will have approximately the same number of customers
   - Clusters are geographically optimized
   - View cluster statistics:
     - Customer count per cluster
     - Geographic spread
     - Cluster locations on map

6. **Select and Create Route**
   - Click on a cluster to select it
   - Enter route details (name, date, worker, vehicle)
   - Click **"Create Route"**

### Tips:
- Consider worker capacity when setting customer count
- Typical range: 8-15 customers per route
- System balances count with geography automatically
- Adjust count if clusters are too spread out

---

## 4. Area Selection (Map-Based)

**Best for:** Creating routes for specific geographic areas, neighborhoods, or zones.

### How to Use:

1. **Navigate to Area Route Creation Page**
   - Go to **Routes** → Click **"Area Route Creation"** button
   - Or navigate to `/area-route-creation`

2. **View the Map**
   - Interactive map displays all unassigned customers
   - Green markers = unassigned customers
   - Red markers = already assigned customers
   - Blue markers = selected customers

3. **Draw Selection Area**
   - Choose a drawing tool:
     - **Rectangle:** Click and drag to draw a rectangular selection
     - **Circle:** Click center point, drag to set radius
     - **Polygon:** Click multiple points to create custom shape, double-click to finish

4. **Select Customers**
   - All unassigned customers within the drawn area are automatically selected
   - Selected customers turn blue on the map
   - Customer count updates in real-time

5. **Review Selected Customers**
   - View list of selected customers below the map
   - Check customer details (name, address, priority)
   - Remove individual customers if needed

6. **Create Route**
   - Enter route details:
     - Route name
     - Scheduled date
     - Assigned worker
     - Assigned vehicle
   - Click **"Create Route from Selection"**

7. **Clear and Redraw (Optional)**
   - Click **"Clear Selection"** to start over
   - Draw a new area to select different customers

### Tips:
- Use polygon tool for irregular neighborhoods
- Use circle tool for radius-based selection
- Use rectangle for grid-like areas
- Zoom in for precise selection
- Check worker load before assigning

---

## Comparison Table

| Method | Best For | Pros | Cons |
|--------|----------|------|------|
| **Manual Selection** | Small routes, specific customers | Full control, precise | Time-consuming for large routes |
| **Distance Clustering** | Geographic optimization | Fast, proximity-based | May create unbalanced routes |
| **Count Clustering** | Balanced workload | Equal customer distribution | Less geographic optimization |
| **Area Selection** | Zone-based routing | Visual, intuitive | Requires map interaction |

---

## Advanced Features

### Cluster Management Page

Access via **Cluster Management** in the navigation menu.

**Features:**
- View all generated clusters
- See worker load statistics
- Assign clusters to workers directly
- Create multiple routes from one clustering session
- Visual map of all clusters

**How to Use:**
1. Navigate to **Cluster Management**
2. Set clustering parameters (distance or count)
3. Click **"Generate Clusters"**
4. View all clusters in list and map view
5. For each cluster:
   - Select worker from dropdown
   - Click **"Assign to Worker"**
   - System creates route automatically

### Worker Load Tracking

Before creating routes, check worker capacity:

1. View **Worker Load Summary** on Cluster Management page
2. Shows for each worker:
   - Number of routes assigned
   - Total customers assigned
   - Load status (None/Low/Medium/High)
3. Color coding:
   - 🟢 Green = Low load (< 20 customers)
   - 🟡 Yellow = Medium load (20-40 customers)
   - 🔴 Red = High load (> 40 customers)

---

## Best Practices

### 1. Route Planning Workflow

**Recommended sequence:**
1. Review all unassigned customers
2. Check worker availability and capacity
3. Choose clustering method based on needs
4. Generate and review clusters
5. Assign to workers
6. Verify routes before finalizing

### 2. Balancing Geography and Workload

- Start with count-based clustering for balance
- Use distance clustering to optimize travel time
- Manually adjust if needed
- Consider customer priority levels

### 3. Daily vs. Weekly Planning

**Daily Planning:**
- Use manual or area selection
- Focus on urgent/priority customers
- Quick route creation

**Weekly Planning:**
- Use clustering methods
- Create multiple routes at once
- Balance workload across week

### 4. Handling Special Cases

**High-Priority Customers:**
- Create dedicated routes manually
- Assign to experienced workers
- Schedule early in the day

**Remote Customers:**
- Group with nearby customers using distance clustering
- Consider separate routes if too far
- Assign to workers with appropriate vehicles

---

## Troubleshooting

### Clustering Returns No Results
- **Cause:** Radius too small or customer count too high
- **Solution:** Increase radius or decrease customer count

### Clusters Too Large
- **Cause:** Radius too large or customer count too high
- **Solution:** Decrease radius or customer count per cluster

### Map Selection Not Working
- **Cause:** Browser permissions or map loading issues
- **Solution:** Refresh page, check browser console for errors

### Route Creation Fails
- **Cause:** Missing required fields or no customers selected
- **Solution:** Verify all fields filled, at least one customer selected

---

## Quick Reference

### Keyboard Shortcuts (Map Selection)
- **Esc:** Cancel current drawing
- **Delete:** Remove selected area
- **Ctrl+Z:** Undo last action

### Recommended Settings

| Scenario | Method | Settings |
|----------|--------|----------|
| Urban area, balanced routes | Count Clustering | 10-12 customers/cluster |
| Urban area, minimize travel | Distance Clustering | 2-3 km radius |
| Rural area | Distance Clustering | 10-15 km radius |
| Specific neighborhood | Area Selection | Polygon tool |
| Emergency/priority | Manual Selection | Individual customers |

---

## Support

For additional help:
- Check the Dashboard for system status
- View Analytics for route performance
- Contact system administrator for technical issues

---

**Last Updated:** October 29, 2024  
**Version:** 1.0  
**System:** Field Worker Scheduler

