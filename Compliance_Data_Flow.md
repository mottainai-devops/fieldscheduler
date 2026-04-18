# Compliance Module: Data Storage and Flow

**Date:** December 9, 2025  
**Author:** Manus AI

---

## 1. Introduction

This document explains where the data for violations, abatement notices, and escalation is stored and how it flows through the Field Scheduler system. All compliance-related data is stored in the `fieldworker_db` MySQL database on the server.

---

## 2. Data Storage

There are three main tables that store all compliance data:

### 2.1. `violationTypes` Table

This table stores the predefined and custom violation types that can be reported. It acts as a master list of all possible violations.

**Current Contents:**

| id | name                                          | severity | isCustom |
|----|-----------------------------------------------|----------|----------|
| 1  | Hoarding of waste                             | high     | 0        |
| 2  | Non-registration with approved waste contractor | medium   | 0        |
| 3  | Non-payment of waste management service       | high     | 0        |
| 4  | No waste bin                                  | medium   | 0        |
| 5  | Assault on environmental officer/worker       | critical | 0        |

- `id`: Unique identifier for the violation type
- `name`: Name of the violation
- `severity`: low, medium, high, or critical
- `isCustom`: 1 for custom types, 0 for default

### 2.2. `complianceViolations` Table

This table stores every individual violation reported by field workers. Each row represents a single violation event.

**Current Contents:**

| id | customerId | violationTypeId | status       | reportedBy | reportedAt          | notes                                          |
|----|------------|-----------------|--------------|------------|---------------------|------------------------------------------------|
| 1  | 9831       | 3               | resolved     | 7          | 2025-12-09 09:39:30 | Resolved for now but you need to revisit this. |
| 2  | 9830       | 3               | reported     | 7          | 2025-12-09 13:11:18 | To follow up                                   |

- `id`: Unique identifier for the violation
- `customerId`: ID of the customer who committed the violation (e.g., 9831 is "413173 OYSISW02 099")
- `violationTypeId`: Foreign key to `violationTypes` table (e.g., 3 is "Non-payment of waste management service")
- `status`: reported, under_review, resolved, or dismissed
- `reportedBy`: ID of the worker who reported it
- `reportedAt`: Timestamp of when it was reported
- `notes`: Additional details from the reporter or resolution notes

### 2.3. `abatementNotices` Table

This table stores all formal abatement notices issued to customers for unresolved violations. It represents the escalation of a violation.

**Current Contents:**

| id | customerId | violationId | status    | issuedDate          | dueDate             | notes |
|----|------------|-------------|-----------|---------------------|---------------------|-------|
| 1  | 9830       | 2           | escalated | 2025-12-09 13:12:01 | 2025-12-23 13:11:52 | NULL  |

- `id`: Unique identifier for the notice
- `customerId`: ID of the customer receiving the notice (e.g., 9830 is "413159 OYSISW02 099")
- `violationId`: Foreign key to the `complianceViolations` table
- `status`: issued, complied, or escalated
- `issuedDate`: Timestamp of when the notice was issued
- `dueDate`: Deadline for the customer to comply
- `notes`: Additional notes from the administrator

---

## 3. Data Flow

Here is the typical data flow for a compliance event:

### Step 1: Reporting a Violation
1. **Field worker** opens the mobile app and selects a customer.
2. Worker navigates to the **"Report Violation"** form.
3. Worker selects a **violation type** from the `violationTypes` table.
4. Worker adds notes and photo evidence.
5. Upon submission, a new row is created in the **`complianceViolations`** table with status `reported`.

### Step 2: Admin Review and Action
1. **Administrator** views the new violation in the admin dashboard.
2. Admin can **update the status** to `under_review` or `resolved`.
3. If resolved, the `resolvedAt` timestamp and resolution notes are added.
4. All status changes are updated in the **`complianceViolations`** table.

### Step 3: Issuing an Abatement Notice
1. For unresolved violations, admin clicks **"Issue Notice"**.
2. A new row is created in the **`abatementNotices`** table with status `issued`.
3. The notice is linked to the original violation via `violationId`.
4. The system sets an `issuedDate` and calculates a `dueDate`.

### Step 4: Escalation
1. If the customer fails to comply by the `dueDate`, the admin can **escalate** the notice.
2. The status in the **`abatementNotices`** table is updated to `escalated`.
3. This indicates the need for further administrative or legal action.
4. The mobile worker sees the "escalated" status and knows the situation is serious.

---

## 4. Key Takeaways

- **Centralized Storage:** All compliance data is stored in three related tables in the `fieldworker_db` database.
- **Clear Workflow:** The data flows logically from violation reporting to administrative action and escalation.
- **Status-driven:** The `status` field in both `complianceViolations` and `abatementNotices` tables drives the entire workflow.
- **Mobile Visibility:** The mobile interface primarily reads from these tables to display information to field workers.
- **Admin Control:** The admin dashboard has full CRUD (Create, Read, Update, Delete) capabilities on this data.

This structured approach ensures that all compliance activities are tracked, auditable, and visible to both administrators and field workers.
