interface EnvShape {
  supabaseUrl: string;
  supabaseAnonKey: string;
  // Opt in to RLS-authorized private Realtime channels. Enable only after
  // disabling "Allow public access" in the project's Realtime settings and
  // applying 0005_security_membership.sql.
  realtimePrivate: boolean;
}

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
const realtimePrivate = import.meta.env.VITE_REALTIME_PRIVATE as string | undefined;

export const env: EnvShape = {
  supabaseUrl: url ?? "",
  supabaseAnonKey: key ?? "",
  realtimePrivate: realtimePrivate === "true" || realtimePrivate === "1",
};

export const supabaseConfigured = Boolean(env.supabaseUrl && env.supabaseAnonKey);
