import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

// When the env vars aren't set yet, the app runs in local/demo mode (no login,
// no persistence) so you can deploy and see the UI before wiring the database.
export const supabaseConfigured = Boolean(url && key);
export const supabase = supabaseConfigured ? createClient(url, key) : null;
