import { supabase } from "./supabase";

/* ============================================================
   Sign-in helpers: plain-language messages for what Supabase sends back,
   and the access-list check (supabase/access.sql).
   ============================================================ */

export const MIN_PASSWORD = 8;

const SMTP_HINT = "an admin can set up custom email (SMTP) in Supabase → Authentication → Emails";

/** A message a colleague can act on, for an error from supabase.auth. */
export function authMessage(error, during = "signin") {
  if (!error) return "";
  const code = error.code || "";
  const msg = String(error.message || error);
  const serverError = error.status >= 500;
  // The access list refuses a new account inside the database, and Supabase
  // reports that only as a server error ("Database error saving new user").
  if (during === "register" && (serverError || code === "unexpected_failure" || /database error (saving|creating)/i.test(msg))) {
    return "This email isn't on the Innovation Fund access list yet. Ask the fund's admin to add it, then register again.";
  }
  if (serverError) return "Supabase had a problem with that request. Try again in a moment.";
  if (error.name === "AuthRetryableFetchError" || error.status === 0 || (!code && /failed to fetch|network/i.test(msg))) {
    return "Couldn't reach the server. Check your connection and try again.";
  }
  switch (code) {
    case "invalid_credentials": return "That email and password don't match. Check them, or use “Forgot password?”.";
    case "email_not_confirmed": return "Confirm your email first: open the link we sent when you registered.";
    case "user_already_exists":
    case "email_exists": return "There's already an account for this email. Sign in instead, or use “Forgot password?”.";
    case "signup_disabled": return "Registration is switched off. An admin can turn on “Allow new users to sign up” in Supabase → Authentication → Sign In / Providers.";
    case "email_provider_disabled": return "Email sign-in is switched off. An admin can turn on Email in Supabase → Authentication → Sign In / Providers.";
    case "weak_password": return `Choose a stronger password. ${msg}`;
    case "same_password": return "That's already your password. Choose a new one.";
    case "email_address_invalid": return "That email address isn't accepted. Check it for typos.";
    case "email_address_not_authorized": return `Supabase couldn't email this address: its built-in email only reaches members of your Supabase team. To fix it, ${SMTP_HINT}.`;
    case "over_email_send_rate_limit": return `Too many emails for now: Supabase's built-in email sends only a few an hour. Try again later, or ${SMTP_HINT}.`;
    case "over_request_rate_limit": return "Too many attempts. Wait a minute and try again.";
    case "otp_expired": return "That link has expired or was already used. Ask for a new one below.";
    default: return msg;
  }
}

/** Why an emailed link didn't work, from the code Supabase puts in the address. */
export const linkMessage = (code) =>
  code === "otp_expired" ? "That email link has expired or was already used. Sign in, or ask for a new link."
    : "That email link didn't work. Sign in, or ask for a new link.";

/** Problems with a new password, before sending it anywhere. */
export function passwordProblem(pw, again) {
  if (pw.length < MIN_PASSWORD) return `Use at least ${MIN_PASSWORD} characters.`;
  if (pw !== again) return "The two passwords don't match.";
  return "";
}

/**
 * Is the signed-in person on the access list? true when the list isn't set
 * up (the app works as before) or the answer can't be fetched — the database
 * enforces the list either way; this only decides what to show.
 */
export async function hasAccess() {
  try {
    const { data, error } = await supabase.rpc("ifm_has_access");
    if (error) return true;
    return data !== false;
  } catch {
    return true;
  }
}

/** Where emailed links should bring people back to: this site. */
export const returnUrl = () => window.location.origin + window.location.pathname;
