/**
 * @crm/core — the shared surface imported by the web app, the mobile app, and the API.
 * Keep this the single public entry point so consumers never reach into deep paths.
 */

export * from "./types";
export * from "./apiClient"; // createApiClient, ApiClient, NewEntry
// NOTE: storage (Google Sheets / googleapis) is server-only and is NOT re-exported
// here, so it never gets pulled into client bundles. Server code imports it from
// "@crm/core/storage" (see apps/web/app/api/*). This keeps the browser bundle free of
// Node built-ins like fs/child_process.
