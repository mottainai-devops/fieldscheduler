# Mottainai Route Optimization Implementation

## Overview
Implementing Mottainai's proven two-step route optimization methodology:
1. **OSRM Table API** - Optimize visit order (shortest time)
2. **GraphHopper Route API** - Generate polyline visualization

## Features
- ✅ Support for 1000+ stops (no limit like GraphHopper free tier)
- ✅ Route polyline visualization on map
- ✅ Snapped waypoint markers
- ✅ Turn-by-turn directions
- ✅ Distance and time calculations
- ✅ Dotted lines from original to snapped locations

## Implementation Checklist

### Phase 1: OSRM Table API Service
- [ ] Create `server/services/osrmTableApi.ts`
  - Build coordinates string (field manager first, then customers)
  - Build OSRM Table API URL with sources=0, destinations=1;2;3...
  - Parse duration matrix response
  - Sort customers by duration (shortest first)
  - Handle errors gracefully

### Phase 2: GraphHopper Route API Service
- [ ] Create `server/services/graphhopperRouteApi.ts`
  - Build points array (field manager first, then optimized order)
  - Build GraphHopper request body with exact parameters
  - Extract polyline coordinates
  - Extract snapped waypoints
  - Extract turn-by-turn instructions
  - Handle errors gracefully

### Phase 3: Update Route Creation
- [ ] Update `server/routers/arcgisRouter.ts`
  - Replace current VRP logic with OSRM + GraphHopper flow
  - Call OSRM Table API first for optimization
  - Call GraphHopper Route API with optimized order
  - Store polyline and waypoint data in database
  - Return complete route with visualization data

### Phase 4: Map Visualization
- [ ] Create `client/src/components/RouteMap.tsx`
  - Display route polyline on map (blue, 4px width)
  - Draw dotted lines from original to snapped waypoints
  - Add numbered waypoint markers
  - Show turn-by-turn instructions
  - Display distance and time

### Phase 5: Re-optimization
- [ ] Update `server/services/routeReoptimization.ts`
  - Use OSRM Table API instead of nearest-neighbor
  - Use GraphHopper for polyline generation
  - Update database with new polyline data

### Phase 6: Testing
- [ ] Test with 5 stops
- [ ] Test with 50 stops
- [ ] Test with 100+ stops
- [ ] Test with 1000+ stops
- [ ] Verify polyline accuracy
- [ ] Verify waypoint snapping
- [ ] Test error handling

### Phase 7: Deployment
- [ ] Build and deploy to production
- [ ] Verify all routes render correctly
- [ ] Monitor API performance
- [ ] Check error logs

## API Details

### OSRM Table API
- **Base URL**: `http://router.project-osrm.org/table/`
- **Format**: `v1/driving/lon,lat;lon,lat;...?sources=0&destinations=1;2;3...&annotations=duration,distance`
- **Response**: Duration and distance matrices
- **Limit**: No documented limit (tested with 1000+ points)

### GraphHopper Route API
- **Base URL**: `https://map.mottainai.africa/route`
- **Method**: POST
- **Parameters**:
  - `profile`: "truck"
  - `points_encoded`: false
  - `points`: [[lon, lat], [lon, lat], ...]
  - `way_point_max_distance`: 0 (unlimited snapping)
  - `pass_through`: true (visit all waypoints in order)
  - `ch.disable`: true (disable contraction hierarchies)

## Database Schema Updates
- Add `polylineCoordinates` to routes table (JSON)
- Add `snappedWaypoints` to routes table (JSON)
- Add `instructions` to routes table (JSON)
- Add `visualizationData` to routes table (JSON)

## Files to Create/Modify
```
server/
  services/
    osrmTableApi.ts (NEW)
    graphhopperRouteApi.ts (NEW)
    routeReoptimization.ts (MODIFY)
  routers/
    arcgisRouter.ts (MODIFY)
client/
  src/
    components/
      RouteMap.tsx (NEW)
    pages/
      CreateRoute.tsx (MODIFY)
      WorkerMobileRouteDetail.tsx (MODIFY)
drizzle/
  schema.ts (MODIFY - add new columns)
```

## Success Criteria
- ✅ Routes with 1000+ stops optimize in <5 seconds
- ✅ Polyline renders correctly on map
- ✅ Waypoint markers show in correct order
- ✅ Snapped locations match road network
- ✅ Turn-by-turn instructions display
- ✅ Distance and time calculations accurate
- ✅ Error handling for network failures
- ✅ Loading indicators during processing

