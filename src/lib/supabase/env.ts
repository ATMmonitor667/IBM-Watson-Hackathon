export interface SupabasePublicConfig {
  url: string;
  anonKey: string;
}

export function getSupabasePublicConfig(): SupabasePublicConfig {
  return {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
  };
}

export function hasSupabasePublicConfig(
  config = getSupabasePublicConfig(),
): boolean {
  return (
    config.url.startsWith("https://") &&
    !config.url.includes("your-project") &&
    config.anonKey.length > 20 &&
    !config.anonKey.includes("your_supabase")
  );
}
