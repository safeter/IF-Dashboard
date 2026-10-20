import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Which emailed link opened this page ("invite", "recovery", "signup"…), read
// before the client consumes the link from the address bar. An invited person
// or one resetting their password is signed in by the link but still has to
// choose a password.
const linkParams = (() => {
  try { return new URLSearchParams(window.location.hash.slice(1)); }
  catch { return new URLSearchParams(); }
})();
export const arrivedVia = linkParams.get("type");
// An emailed link that didn't work (expired, already used) says why here.
export const linkError = linkParams.get("error_code") || (linkParams.get("error") ? "link_error" : null);

// When the env vars aren't set yet, the app runs in local/demo mode (no login,
// no persistence) so you can deploy and see the UI before wiring the database.
export const supabaseConfigured = Boolean(url && key);
export const supabase = supabaseConfigured ? createClient(url, key) : null;
