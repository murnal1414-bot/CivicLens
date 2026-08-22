/**
 * Application environment configuration
 */
export const ENV = {
  SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL || '',
  SUPABASE_ANON_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY || '',
  OPENROUTER_API_KEY: import.meta.env.VITE_OPENROUTER_API_KEY || '',
  APP_NAME: import.meta.env.VITE_APP_NAME || 'CivicLens',
  API_URL: import.meta.env.VITE_API_URL || 'http://localhost:5173/api',
}
