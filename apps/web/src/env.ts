interface EnvShape {
  supabaseUrl: string;
  supabaseAnonKey: string;
}

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const env: EnvShape = {
  supabaseUrl: url ?? "",
  supabaseAnonKey: key ?? "",
};

export const supabaseConfigured = Boolean(env.supabaseUrl && env.supabaseAnonKey);
