# JobMaster Dispatch System

## Overview

The Dispatch System is a real-time field service management interface that allows dispatchers to assign jobs to field technicians and track their locations in real-time.

## Features

### 1. **Split-Panel Interface**
- **Left Panel**: Job and tech management
  - Top: List of open/unassigned jobs
  - Bottom: List of available field technicians
- **Right Panel**: Google Maps integration
  - Job locations (house/building icons)
  - Tech truck locations with real-time movement
  - Route directions and ETA calculations
- **Resizable**: Drag the vertical divider to adjust panel sizes (persisted in localStorage)

### 2. **Detachable Map**
- Click the "Detach" button (top-right of map) to open the map in a separate dialog
- Perfect for dual-monitor setups
- Original panel shows "Map detached" message
- Close dialog to reattach

### 3. **Job Assignment Workflow**
1. Select a job from the top-left list
2. Select a tech from the bottom-left list
3. Click the **"Dispatch"** button
4. Job is assigned to the tech
5. Dispatch event is logged
6. Job status changes to "Assigned"

### 4. **Real-Time GPS Tracking** *(Simulated for Demo)*
- Truck icons show on the map representing tech locations
- Icons rotate based on heading/direction
- Simulated movement every 5 seconds
- Green trucks = available, Blue = selected
- Hover over trucks for tech info

### 5. **Route & ETA Display**
- When both job and tech are selected:
  - Blue route line appears on map
  - ETA panel shows at bottom of map
  - Distance and estimated time displayed
  - "Send to Tech" button for future notification integration

## Tech Stack

### Frontend Components

| File | Purpose |
|------|---------|
| `web/src/app/(dashboard)/dispatch/page.tsx` | Next.js page wrapper |
| `web/src/views/dispatch/DispatchView.tsx` | Main dispatch view with resizable panels |
| `web/src/views/dispatch/JobsList.tsx` | Open jobs list with dispatch button |
| `web/src/views/dispatch/TechsList.tsx` | Available techs list with GPS status |
| `web/src/views/dispatch/DispatchMap.tsx` | Google Maps with markers and directions |

### Backend API Routes

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/dispatch` | POST | Assign job to tech |
| `/api/dispatch/events` | GET | Get dispatch history |
| `/api/dispatch/gps` | POST | Record GPS location |
| `/api/dispatch/gps/active` | GET | Get active tech locations |
| `/api/dispatch/gps/:techId/history` | GET | Get GPS history for tech |

File: `backend/src/routes/dispatch.ts`

### Database Tables

#### `dispatch_event`
Tracks when jobs are assigned to techs.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `job_id` | UUID | Foreign key to job |
| `tech_id` | UUID | Foreign key to team_member |
| `dispatched_at` | TIMESTAMP | When dispatched |
| `notification_sent` | BOOLEAN | Was notification sent? |
| `notification_type` | TEXT | sms, email, push |
| `eta_minutes` | INTEGER | Estimated time to arrival |
| `distance_miles` | NUMERIC | Distance from tech to job |
| `notes` | TEXT | Dispatcher notes |
| `cre_at`, `mod_at`, `cre_by`, `mod_by` | Audit fields |

#### `gps_location`
Stores real-time GPS positions of field techs.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `tech_id` | UUID | Foreign key to team_member |
| `latitude` | NUMERIC(10,8) | GPS latitude |
| `longitude` | NUMERIC(11,8) | GPS longitude |
| `accuracy_meters` | NUMERIC | GPS accuracy |
| `heading` | NUMERIC | Direction (0-360°) |
| `speed_mph` | NUMERIC | Speed |
| `altitude_meters` | NUMERIC | Altitude |
| `recorded_at` | TIMESTAMP | When recorded |
| `battery_level` | INTEGER | Device battery (0-100) |
| `is_active` | BOOLEAN | Current location? |
| `cre_at`, `mod_at`, `cre_by`, `mod_by` | Audit fields |

### TypeScript Contracts

All schemas defined in `shared/contracts.ts`:
- `DispatchEvent` - Dispatch event type
- `GpsLocation` - GPS location type
- `DispatchJobRequest` - Request schema for job assignment
- `RecordGpsLocationRequest` - Request schema for GPS updates

## Google Maps Integration

### API Key
Environment variable: `NEXT_PUBLIC_GOOGLE_API_KEY`
Location: `web/.env.local`

### Libraries Used
- `@react-google-maps/api` - React Google Maps wrapper
- Features used:
  - GoogleMap
  - Marker (custom icons for jobs and trucks)
  - InfoWindow (hover tooltips)
  - DirectionsRenderer (route visualization)

### Marker Icons

**Job Locations**:
- Blue circle = Residential jobs
- Green circle = Commercial jobs
- Orange circle = Selected job

**Tech Trucks**:
- SVG truck icon with rotation based on heading
- Green = available techs
- Blue = selected tech

## Navigation

**Menu Path**: Admin → Dispatch
**Route**: `/dispatch`
**Icon**: `tabler-truck-delivery`

Updated in: `web/src/components/layout/vertical/VerticalMenu.tsx`

## UI State Persistence

Uses `useLocalStorage` hook to persist:
- `jm-dispatch-panel-sizes` - Left/right panel size percentages

## Future Enhancements (Not Yet Implemented)

### Mobile App GPS Integration
- Techs will run mobile app with background GPS tracking
- GPS locations posted to `/api/dispatch/gps` every 5-15 minutes
- Real-time updates via Supabase Realtime subscriptions

### Notifications
- SMS notifications to techs when dispatched
- Push notifications via Expo Notifications
- Email summaries

### Advanced Features
- Multiple job assignment to single tech (route optimization)
- Historical playback of tech movements
- Geofencing alerts (tech arrived at job site)
- Time tracking integration
- Traffic-aware ETA updates
- Tech availability calendar integration

## Testing the Demo

1. **Start the backend**:
   ```bash
   cd backend
   bun run dev
   ```

2. **Start the web app**:
   ```bash
   cd web
   npm run dev
   ```

3. **Open dispatch**:
   - Navigate to http://localhost:3001
   - Login
   - Click Admin → Dispatch

4. **Try the workflow**:
   - Select a job from the top-left
   - Select a tech from the bottom-left
   - Click "Dispatch"
   - Watch the map show the route
   - Observe trucks moving on the map (simulated)
   - Detach the map for dual-monitor view

## API Usage Examples

### Dispatch a Job

```typescript
const response = await fetch('http://localhost:3000/api/dispatch', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    jobId: 'uuid-of-job',
    techId: 'uuid-of-tech',
    notificationType: 'push',
    notes: 'Urgent - customer waiting'
  })
});
```

### Record GPS Location

```typescript
const response = await fetch('http://localhost:3000/api/dispatch/gps', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    techId: 'uuid-of-tech',
    latitude: 38.9072,
    longitude: -77.0369,
    accuracy: 10,
    heading: 45,
    speed: 35,
    batteryLevel: 85
  })
});
```

### Get Active Tech Locations

```typescript
const response = await fetch('http://localhost:3000/api/dispatch/gps/active');
const locations = await response.json();
```

## Troubleshooting

### Map not loading
- Check `NEXT_PUBLIC_GOOGLE_API_KEY` in `web/.env.local`
- Verify Google Maps JavaScript API is enabled in Google Cloud Console
- Check browser console for API errors

### Jobs not showing
- Ensure jobs have `status = 'Scheduled'` or `assigned_to_id IS NULL`
- Check backend logs for Supabase errors

### Trucks not moving
- Simulated movement runs every 5 seconds
- Check browser console for JavaScript errors
- Movement only works when techs are loaded

### Dispatch button disabled
- Must select both a job AND a tech
- Check that selections are highlighting correctly

## Database Migration

The dispatch tables were created via Supabase MCP:

```sql
-- Applied migration: create_dispatch_tables
-- Tables: dispatch_event, gps_location
-- Indexes: tech_id, job_id, recorded_at
-- RLS: Enabled with open policies (restrict in production)
```

To view migration history:
```bash
# Use Supabase CLI or MCP
supabase migrations list
```

## Security Considerations

### Production Hardening Required

1. **Row-Level Security (RLS)**:
   - Current policies allow all operations
   - MUST restrict based on user roles:
     - Dispatchers can read/write all
     - Techs can only read their own assignments
     - Techs can only write their own GPS locations

2. **API Authentication**:
   - All dispatch endpoints should verify JWT
   - Check user has "dispatcher" role
   - GPS endpoints should verify tech_id matches authenticated user

3. **Rate Limiting**:
   - GPS endpoints should be rate-limited (max 1 update/minute per tech)
   - Prevent abuse and excessive database writes

4. **Data Retention**:
   - GPS history grows quickly
   - Implement cleanup job (delete records > 30 days old)
   - Or archive to cold storage

## Performance Optimization

### For Production

1. **Database Indexes** (already created):
   - `idx_dispatch_event_job_id`
   - `idx_dispatch_event_tech_id`
   - `idx_gps_location_tech_id`
   - `idx_gps_location_active` (filtered index for active locations)

2. **Realtime Subscriptions**:
   - Use Supabase Realtime for live updates
   - Subscribe to `gps_location` changes WHERE `is_active = true`
   - Subscribe to `job` changes for status updates

3. **Map Marker Clustering**:
   - For areas with many jobs, use marker clustering
   - Library: `@googlemaps/markerclusterer`

4. **Lazy Loading**:
   - Only load GPS history on demand
   - Paginate dispatch event history

## Credits

- **UI Framework**: Material-UI (MUI) v7
- **Maps**: Google Maps JavaScript API
- **Icons**: Tabler Icons
- **Resizable Panels**: react-resizable-panels
- **Database**: Supabase PostgreSQL
