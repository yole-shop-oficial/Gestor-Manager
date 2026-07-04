// Re-exports de clientes Supabase
// Nota: los clientes ahora pueden devolver null si las env vars no están configuradas

// ─── Fábrica centralizada (NUEVO — fix AuthRetryableFetchError) ───
export {
  getOrCreateClient,
  getExistingClient,
  hasClient,
  removeClient,
  clearAllClients,
  getClientDiagnostics,
  STORAGE_KEYS,
  type StorageKey,
} from "./clientFactory";

// ─── Clientes SSR (servidor) ───
export { getAuthClient } from "./authClient";
export { getBusinessClient } from "./businessClient";

// ─── Clientes del navegador ───
export { getBrowserAuthClient, requireBrowserAuthClient } from "./authBrowserClient";
export { getBrowserBusinessClient, requireBrowserBusinessClient } from "./businessBrowserClient";

// ─── Round-Robin ───
export {
  determineProjectForRegistration,
  createRegistrationClient,
  createLoginClient,
  getProjectConfig,
  saveUserProject,
  loadUserProject,
  clearUserProject,
  type SelectedProject,
} from "./roundRobin";

// ─── Conectividad ───
export {
  checkSupabaseConnectivity,
  getCachedConnectivity,
  setCachedConnectivity,
  type ConnectivityResult,
} from "./connectivity";
