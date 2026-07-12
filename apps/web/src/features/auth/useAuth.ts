// Back-compat shim: auth now lives in a single app-wide SessionProvider so
// there's one subscription to Supabase's auth state instead of one per hook
// consumer. Existing callers (useIdentity, etc.) keep working unchanged.
export { useSession as useAuth } from "./SessionProvider";
export type { SessionContextValue } from "./SessionProvider";
