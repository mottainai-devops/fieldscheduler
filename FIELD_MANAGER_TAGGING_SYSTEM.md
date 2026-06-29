# Field Manager and CUSTOMERMAF Tagging System

## Overview

The Field Manager Tagging System enables dynamic scheduling by creating associations between field managers and CUSTOMERMAF building IDs. This system allows for automatic customer filtering based on assigned tags, streamlining route creation and workforce management.

## System Architecture

### Database Schema

#### 1. **fieldManagerTags Table**
Stores the relationship between field managers (workers) and CUSTOMERMAF building IDs.

```sql
CREATE TABLE fieldManagerTags (
  id INT AUTO_INCREMENT PRIMARY KEY,
  fieldManagerId INT NOT NULL,
  customermaf VARCHAR(100) NOT NULL,
  description TEXT,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY unique_manager_maf (fieldManagerId, customermaf),
  FOREIGN KEY (fieldManagerId) REFERENCES workers(id)
);
```

**Fields:**
- `fieldManagerId`: Reference to the worker (field manager)
- `customermaf`: Building ID code (e.g., "AFT-200", "CUM-099")
- `description`: Optional notes about the building
- `createdAt`/`updatedAt`: Timestamps for audit trail

#### 2. **tagBasedRoutes Table**
Stores routes created using tag-based selection.

```sql
CREATE TABLE tagBasedRoutes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  routeName VARCHAR(255) NOT NULL,
  fieldManagerId INT NOT NULL,
  customermafTags TEXT,
  scheduledDate TIMESTAMP,
  status ENUM('pending', 'in_progress', 'completed', 'cancelled') DEFAULT 'pending',
  totalCustomers INT DEFAULT 0,
  optimizationScore VARCHAR(10),
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (fieldManagerId) REFERENCES workers(id)
);
```

**Fields:**
- `routeName`: Human-readable route name
- `fieldManagerId`: Assigned field manager
- `customermafTags`: JSON array of selected CUSTOMERMAF codes
- `scheduledDate`: When the route is scheduled
- `status`: Current route status
- `totalCustomers`: Number of customers in route
- `optimizationScore`: Route efficiency metric

### Data Mapping

The system includes pre-loaded field manager-to-CUSTOMERMAF mappings:

| Field Manager | CUSTOMERMAF Codes |
|---|---|
| **Bukola** | AFT-200, AFT-221, AFT-223, MTD-096, TKB-052 |
| **Halleluyah** | CUM-099, CUM-415, DIC-413, ECO-220, SAY-076, TKB-117 |
| **Juwon** | ADK-062, DIC-087, DIC-410, EOA-414, HSY-060, WAS-061 |
| **Aishat** | MOT-108, MOT-027, MOT-107 |

## Backend Implementation

### Database Helper Functions (`server/fieldManagerTagDb.ts`)

#### Core Functions

1. **`getFieldManagerTags(fieldManagerId: number)`**
   - Retrieves all tags assigned to a specific field manager
   - Returns: `FieldManagerTag[]`

2. **`getAllFieldManagerTags()`**
   - Retrieves all tags grouped by field manager
   - Returns: `Record<number, FieldManagerTag[]>`

3. **`addFieldManagerTag(fieldManagerId, customermaf, description?)`**
   - Adds a new tag to a field manager
   - Prevents duplicate assignments
   - Returns: `FieldManagerTag | null`

4. **`removeFieldManagerTag(fieldManagerId, customermaf)`**
   - Removes a tag from a field manager
   - Returns: `boolean`

5. **`updateFieldManagerTagDescription(fieldManagerId, customermaf, description)`**
   - Updates the description for a tag
   - Returns: `FieldManagerTag | null`

6. **`bulkAddFieldManagerTags(fieldManagerId, tags)`**
   - Adds multiple tags at once (useful for Excel import)
   - Returns: `FieldManagerTag[]`

7. **`getCustomersForTag(customermaf)`**
   - Retrieves all customers for a specific CUSTOMERMAF code
   - Returns: `Customer[]`

### tRPC Endpoints (`server/routers/fieldWorker.ts`)

#### Query Endpoints

- **`fieldWorker.getFieldManagerTags`**
  - Input: `{ fieldManagerId: number }`
  - Returns: All tags for a field manager

- **`fieldWorker.getAllFieldManagerTags`**
  - No input required
  - Returns: All tags grouped by manager

#### Mutation Endpoints

- **`fieldWorker.addFieldManagerTag`**
  - Input: `{ fieldManagerId, customermaf, description? }`
  - Creates a new tag assignment

- **`fieldWorker.removeFieldManagerTag`**
  - Input: `{ fieldManagerId, customermaf }`
  - Removes a tag assignment

- **`fieldWorker.updateFieldManagerTagDescription`**
  - Input: `{ fieldManagerId, customermaf, description }`
  - Updates tag metadata

- **`fieldWorker.bulkAddFieldManagerTags`**
  - Input: `{ fieldManagerId, tags: Array<{customermaf, description?}> }`
  - Batch adds tags

## Frontend Components

### 1. Field Manager Tagging Dashboard
**Route:** `/field-manager-tagging`
**Component:** `FieldManagerTagging.tsx`

**Features:**
- Select field manager from dropdown
- View all assigned tags
- Add new tags with optional descriptions
- Edit tag descriptions
- Delete tags
- Bulk load tags from Excel data
- Real-time statistics for each manager

**UI Elements:**
- Manager selector
- Tag management panel
- Add/Edit/Delete dialogs
- Statistics cards showing tag counts

### 2. Dynamic Customer Filtering
**Route:** `/dynamic-customer-filtering`
**Component:** `DynamicCustomerFiltering.tsx`

**Features:**
- Select field manager
- Multi-select tags from assigned list
- Real-time customer filtering
- Search within filtered results
- Filter by priority level
- Export filtered customers as CSV
- Summary statistics

**Filtering Logic:**
1. Select field manager
2. Choose one or more tags
3. System filters customers matching selected CUSTOMERMAF codes
4. Optional: Apply search and priority filters
5. View and export results

### 3. Tag-Based Route Creation
**REMOVED in T17 (2026-06-29).** The page existed but its "Create Route" button ran a setTimeout simulation with no tRPC mutation call. It never created a route in production. Removed per owner direction. Use `/create-route` (Manual Selection) instead.

## Usage Workflow

### Scenario 1: Assigning Tags to a Field Manager

1. Navigate to `/field-manager-tagging`
2. Select field manager (e.g., "Bukola")
3. Click "Load from Excel" to auto-populate tags
4. Or manually add tags:
   - Enter CUSTOMERMAF code (e.g., "AFT-200")
   - Add optional description
   - Click "Add Tag"
5. Verify tags appear in the list

### Scenario 2: Filtering Customers by Manager Tags

1. Navigate to `/dynamic-customer-filtering`
2. Select field manager (e.g., "Halleluyah")
3. Select one or more building IDs from the list
4. View filtered customers in real-time
5. Optional: Search or filter by priority
6. Export as CSV if needed

### Scenario 3: Creating a Route

Use `/create-route` (Manual Selection). Tag-Based Route Creation was removed in T17 — it never created routes in production.

## API Integration Points

### tRPC Hooks Usage

```typescript
// Get all tags for a manager
const { data: tags } = trpc.fieldWorker.getFieldManagerTags.useQuery({
  fieldManagerId: 1
});

// Add a new tag
const addTag = trpc.fieldWorker.addFieldManagerTag.useMutation({
  onSuccess: () => refetchTags()
});

// Get customers for selected tags
const { data: customers } = trpc.fieldWorker.getCustomers.useQuery();
const filtered = customers.filter(c => 
  selectedTags.includes(c.customermaf)
);
```

## Data Flow

```
Excel File
    ↓
Parse Field Manager → CUSTOMERMAF Mapping
    ↓
Database (fieldManagerTags table)
    ↓
tRPC Endpoints
    ↓
Frontend Components
    ↓
User Interfaces (Dashboard, Filtering, Route Creation)
    ↓
Route Optimization & Scheduling
```

## Key Features

### 1. **Dynamic Assignment**
- Assign multiple CUSTOMERMAF codes to each field manager
- Update assignments in real-time
- No downtime required

### 2. **Flexible Filtering**
- Filter customers by manager tags
- Combine multiple tags in a single query
- Additional search and priority filters

### 3. **Route Optimization**
- Create routes based on tag assignments
- Automatic customer grouping
- Efficiency scoring

### 4. **Bulk Operations**
- Load tags from Excel in one operation
- Bulk add/remove tags
- Batch create routes

### 5. **Audit Trail**
- Track when tags were created/updated
- Store descriptions for context
- Timestamps for all operations

## Performance Considerations

### Database Optimization
- Unique constraint on `(fieldManagerId, customermaf)` prevents duplicates
- Indexed foreign keys for fast lookups
- JSON storage for tag arrays in routes

### Frontend Optimization
- Memoized tag selections
- Real-time filtering with debouncing
- CSV export without server round-trip

### Scalability
- Supports unlimited field managers
- Handles thousands of customers
- Efficient tag-based queries

## Error Handling

### Common Scenarios

1. **Duplicate Tag Assignment**
   - System prevents adding same tag twice
   - Returns existing tag if already present

2. **Invalid Manager ID**
   - Validation at API level
   - User-friendly error messages

3. **No Customers for Tag**
   - Graceful handling in UI
   - Shows empty state with helpful message

4. **Export Failures**
   - Client-side CSV generation
   - Fallback error notifications

## Future Enhancements

1. **Advanced Routing**
   - Automatic route optimization using distance matrix
   - Multi-vehicle routing
   - Time window constraints

2. **Analytics**
   - Tag utilization metrics
   - Route efficiency trends
   - Manager performance dashboards

3. **Integration**
   - Sync with Zoho CRM
   - Google Maps integration
   - Real-time tracking updates

4. **Mobile Support**
   - Tag-based route viewing on mobile
   - Quick customer lookup
   - Offline support

## Testing Checklist

- [ ] Add tag to field manager
- [ ] Remove tag from field manager
- [ ] Update tag description
- [ ] Bulk load tags from Excel
- [ ] Filter customers by single tag
- [ ] Filter customers by multiple tags
- [ ] Search within filtered results
- [ ] Filter by priority level
- [ ] Export filtered customers
- [ ] Create route with selected tags
- [ ] Verify customer counts match
- [ ] Test with all field managers

## Support & Troubleshooting

### Issue: Tags not appearing after adding
- **Solution:** Refresh the page or wait for query to refetch

### Issue: Customers not filtering correctly
- **Solution:** Verify CUSTOMERMAF codes match between tags and customers

### Issue: CSV export is empty
- **Solution:** Ensure at least one tag is selected and customers exist

### Issue: Route creation fails
- **Solution:** Check that all required fields are filled (name, manager, tags, date)

## Database Migrations

To set up the system:

```bash
# Push schema changes
pnpm db:push

# Seed initial data (optional)
node scripts/seed-field-manager-tags.mjs
```

## Configuration

### Environment Variables
No additional environment variables required. System uses existing database connection.

### Feature Flags
None currently. Feature is always enabled.

## Conclusion

The Field Manager Tagging System provides a robust foundation for dynamic scheduling and customer management. By associating field managers with CUSTOMERMAF building IDs, the system enables flexible, scalable operations that can adapt to changing business needs.

