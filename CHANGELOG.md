_# Changelog

All notable changes to this project will be documented in this file.

## [1.1.2] - 2025-12-09

### Rolled Back

-   Reverted all application code changes introduced in `[1.1.1-unstable]`.
-   The system has been restored to the stable state of version `1.1.0`.
-   The application was rebuilt and the server was restarted to apply the rollback.

## [1.1.1-unstable] - 2025-12-08

### Attempted Fixes (All Reverted)

-   Attempted to resolve errors on nine different pages, which included adding new routes to `App.tsx`, creating placeholder page components (`Manager.tsx`, `Tags.tsx`), and modifying frontend components (`RealTimeTracking.tsx`, `GeofencingAlerts.tsx`, `RouteAnalyticsDashboard.tsx`).
-   These changes introduced a critical "Failed to fetch" error on the login page, making the system unstable.

## [1.1.0] - 2025-12-08

### Added

-   **Report Violations Feature**: Implemented a new module for field workers to report compliance violations. This included a new database table for violation types, a new API router (`compliance.ts`), and a functional mobile user interface for submitting reports.

### Fixed

-   **Zoho Statement Balance**: Corrected the balance calculation logic in the Zoho customer statement view. The system now uses the `invoice.balance` field and filters out `draft` and `void` invoices to ensure financial accuracy.
-   **Mobile Customer ID Bug**: Resolved an issue on the mobile route details page where an incorrect customer identifier was being used, preventing the "Report" shortcut from functioning.
_
