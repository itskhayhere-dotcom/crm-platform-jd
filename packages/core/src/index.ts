/**
 * @crm/core — the shared surface imported by the web app, the mobile app, and the API.
 * Keep this the single public entry point so consumers never reach into deep paths.
 */

export * from "./types";
export * from "./storage"; // StorageAdapter, getStorage, EntryFilter
export * from "./apiClient"; // createApiClient, ApiClient, NewEntry
