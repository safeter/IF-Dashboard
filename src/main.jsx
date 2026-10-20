import React, { useEffect, useId, useState } from "react";
import ReactDOM from "react-dom/client";
import App from "./GCSInnovationFund.jsx";
import { supabase, supabaseConfigured, arrivedVia, linkError } from "./lib/supabase";
import { ensureMigrated } from "./lib/cloud";
import { authMessage, linkMessage, passwordProblem, hasAccess, returnUrl, MIN_PASSWORD } from "./lib/auth";

const BURGUNDY = "#912338";
const PAPER = "#FAF8F5";
const INK = "#32302F";
const MUTED = "#6E6E6E";
const LINE = "#ECE7E1";
const ERROR = "#B42318";
const FONT = "Inter, system-ui, sans-serif";

/* ---------- shared pieces of the sign-in screens ---------- */

function Card({ children, title, sub }) {
  return (
    <div style={{ minHeight: "100vh", background: PAPER, display: "grid", placeItems: "center", fontFamily: FONT, color: INK, padding: 16, boxSizing: "border-box" }}>
      <div style={{ width: "min(380px, 100%)", background: "#fff", border: `1px solid ${LINE}`, borderRadius: 18, padding: 28, boxSizing: "border-box" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18 }}>
          <div style={{ width: 34, height: 34, borderRadius: 10, background: BURGUNDY, color: "#fff", display: "grid", placeItems: "center", fontWeight: 800, flexShrink: 0 }}>IF</div>
          <div>
            <div style={{ fontWeight: 700 }}>Innovation Fund Manager</div>
            <div style={{ fontSize: 11, color: MUTED, letterSpacing: ".1em", textTransform: "uppercase" }}>Gina Cody School</div>
          </div>
        </div>
        {title && <h1 style={{ fontSize: 17, fontWeight: 700, margin: "0 0 6px" }}>{title}</h1>}
        {sub && <p style={{ fontSize: 13.5, color: MUTED, lineHeight: 1.5, margin: "0 0 16px" }}>{sub}</p>}
        {children}
      </div>
    </div>
  );
}

function Field({ label, hint, ...props }) {
  const id = useId();
  return (
    <div style={{ marginBottom: 12 }}>
      <label htmlFor={id} style={{ display: "block", fontSize: 12.5, fontWeight: 600, marginBottom: 5 }}>{label}</label>
      <input id={id} aria-describedby={hint ? `${id}-hint` : undefined} {...props}
        style={{ width: "100%", padding: "10px 11px", border: `1px solid ${LINE}`, borderRadius: 9, fontFamily: "inherit", fontSize: 14, boxSizing: "border-box", color: INK }} />
      {hint && <div id={`${id}-hint`} style={{ fontSize: 12, color: MUTED, marginTop: 4 }}>{hint}</div>}
    </div>
  );
}

function Primary({ busy, children, busyLabel, ...props }) {
  return (
    <button type="submit" disabled={busy} {...props}
      style={{ width: "100%", minHeight: 42, padding: "10px 14px", borderRadius: 999, border: "none", background: BURGUNDY, color: "#fff", fontWeight: 600, fontSize: 14, fontFamily: "inherit", cursor: busy ? "default" : "pointer", opacity: busy ? 0.7 : 1 }}>
      {busy ? busyLabel : children}
    </button>
  );
}

function LinkButton({ children, ...props }) {
  return (
    <button type="button" {...props}
      style={{ background: "none", border: "none", padding: "8px 2px", minHeight: 32, color: BURGUNDY, fontWeight: 600, fontSize: 13, fontFamily: "inherit", cursor: "pointer", textDecoration: "underline", textUnderlineOffset: 3 }}>
      {children}
    </button>
  );
}

const Problem = ({ text }) => (text ? <div role="alert" style={{ fontSize: 13, color: ERROR, lineHeight: 1.45, marginBottom: 12 }}>{text}</div> : null);
const Note = ({ text }) => (text ? <div role="status" style={{ fontSize: 13, color: "#1E6B3A", lineHeight: 1.45, marginBottom: 12 }}>{text}</div> : null);

/* ---------- sign in / register / forgot password ---------- */

function AuthScreen() {
  const [mode, setMode] = useState("signin"); // signin | register | forgot
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [err, setErr] = useState(linkError ? linkMessage(linkError) : "");
  const [errCode, setErrCode] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(null); // { kind: "confirm" | "reset", email }

  // Don't leave a failed link's error in the address bar.
  useEffect(() => {
    if (linkError) window.history.replaceState(null, "", window.location.pathname + window.location.search);
  }, []);

  const switchTo = (m) => { setMode(m); setErr(""); setErrCode(""); setNote(""); setPw(""); setPw2(""); };
  const fail = (error, during) => { setErr(authMessage(error, during)); setErrCode(error && error.code || ""); };
  const addr = email.trim();

  const run = async (fn) => {
    if (busy) return;
    setBusy(true); setErr(""); setErrCode(""); setNote("");
    try { await fn(); }
    catch (e) { fail(e); }
    finally { setBusy(false); }
  };

  const signIn = () => run(async () => {
    if (!addr || !pw) { setErr("Enter your email and password."); return; }
    const { error } = await supabase.auth.signInWithPassword({ email: addr, password: pw });
    if (error) fail(error, "signin");
  });

  const register = () => run(async () => {
    if (!addr.includes("@")) { setErr("Enter your email address."); return; }
    const problem = passwordProblem(pw, pw2);
    if (problem) { setErr(problem); return; }
    const { data, error } = await supabase.auth.signUp({ email: addr, password: pw, options: { emailRedirectTo: returnUrl() } });
    if (error) { fail(error, "register"); return; }
    if (data.session) return; // no email confirmation needed: signed straight in
    if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
      // Supabase's answer when the address is already registered.
      switchTo("signin");
      setErr("There's already an account for this email. Sign in, or use “Forgot password?”.");
      return;
    }
    setSent({ kind: "confirm", email: addr });
  });

  const forgot = () => run(async () => {
    if (!addr.includes("@")) { setErr("Enter the email you registered with."); return; }
    const { error } = await supabase.auth.resetPasswordForEmail(addr, { redirectTo: returnUrl() });
    if (error) { fail(error, "forgot"); return; }
    setSent({ kind: "reset", email: addr });
  });

  const resendConfirmation = (to) => run(async () => {
    const { error } = await supabase.auth.resend({ type: "signup", email: to, options: { emailRedirectTo: returnUrl() } });
    if (error) fail(error, "resend");
    else setNote(`Sent again to ${to}.`);
  });

  if (sent) {
    const confirm = sent.kind === "confirm";
    return (
      <Card title="Check your inbox"
        sub={confirm
          ? `We sent a link to ${sent.email}. Open it to finish registering — it brings you straight back here, signed in.`
          : `If there's an account for ${sent.email}, a link to choose a new password is on its way.`}>
        <p style={{ fontSize: 13, color: MUTED, lineHeight: 1.5, margin: "0 0 14px" }}>Nothing after a few minutes? Check your junk folder.</p>
        <Problem text={err} /><Note text={note} />
        <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
          {confirm
            ? <LinkButton onClick={() => resendConfirmation(sent.email)} disabled={busy}>Send the link again</LinkButton>
            : <LinkButton onClick={forgot} disabled={busy}>Send the link again</LinkButton>}
          <LinkButton onClick={() => { setSent(null); switchTo("signin"); }}>Back to sign in</LinkButton>
        </div>
      </Card>
    );
  }

  const tab = (m, label) => (
    <button type="button" role="tab" onClick={() => switchTo(m)} aria-selected={mode === m}
      style={{ flex: 1, minHeight: 36, borderRadius: 999, border: "none", fontFamily: "inherit", fontSize: 13.5, fontWeight: 600, cursor: "pointer",
        background: mode === m ? "#fff" : "transparent", color: mode === m ? INK : MUTED, boxShadow: mode === m ? "0 1px 3px rgba(0,0,0,.12)" : "none" }}>
      {label}
    </button>
  );
  const submit = (e) => { e.preventDefault(); (mode === "signin" ? signIn : mode === "register" ? register : forgot)(); };

  return (
    <Card
      title={mode === "forgot" ? "Reset your password" : null}
      sub={mode === "forgot" ? "Enter the email you registered with and we'll send a link to choose a new password." : null}>
      {mode !== "forgot" && (
        <div role="tablist" aria-label="Sign in or register" style={{ display: "flex", gap: 4, padding: 4, background: PAPER, border: `1px solid ${LINE}`, borderRadius: 999, marginBottom: 18 }}>
          {tab("signin", "Sign in")}
          {tab("register", "Register")}
        </div>
      )}
      {mode === "register" && (
        <p style={{ fontSize: 13, color: MUTED, lineHeight: 1.5, margin: "0 0 14px" }}>
          For the Innovation Fund team. Your email needs to be on the fund's access list — if registering says it isn't, ask the fund's admin.
        </p>
      )}
      <form onSubmit={submit} noValidate>
        <Field label="Email" type="email" autoComplete={mode === "register" ? "email" : "username"} value={email}
          onChange={(e) => setEmail(e.target.value)} autoFocus />
        {mode !== "forgot" && (
          <Field label="Password" type="password" autoComplete={mode === "register" ? "new-password" : "current-password"} value={pw}
            onChange={(e) => setPw(e.target.value)} hint={mode === "register" ? `At least ${MIN_PASSWORD} characters.` : null} />
        )}
        {mode === "register" && (
          <Field label="Confirm password" type="password" autoComplete="new-password" value={pw2} onChange={(e) => setPw2(e.target.value)} />
        )}
        <Problem text={err} /><Note text={note} />
        {errCode === "email_not_confirmed" && (
          <div style={{ marginTop: -6, marginBottom: 8 }}><LinkButton onClick={() => resendConfirmation(addr)} disabled={busy}>Send the confirmation link again</LinkButton></div>
        )}
        {mode === "signin" && <Primary busy={busy} busyLabel="Signing in…">Sign in</Primary>}
        {mode === "register" && <Primary busy={busy} busyLabel="Creating your account…">Create account</Primary>}
        {mode === "forgot" && <Primary busy={busy} busyLabel="Sending…">Send reset link</Primary>}
      </form>
      <div style={{ textAlign: "center", marginTop: 10 }}>
        {mode === "signin" && <LinkButton onClick={() => switchTo("forgot")}>Forgot password?</LinkButton>}
        {mode === "forgot" && <LinkButton onClick={() => switchTo("signin")}>Back to sign in</LinkButton>}
      </div>
    </Card>
  );
}

/* ---------- choose a password (after an invite or reset link) ---------- */

function SetPassword({ kind, email, onDone }) {
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const save = async (e) => {
    e.preventDefault();
    if (busy) return;
    const problem = passwordProblem(pw, pw2);
    if (problem) { setErr(problem); return; }
    setBusy(true); setErr("");
    try {
      const { error } = await supabase.auth.updateUser({ password: pw });
      if (error) setErr(authMessage(error, "password"));
      else onDone();
    } catch (e2) {
      setErr(authMessage(e2, "password"));
    } finally {
      setBusy(false);
    }
  };
  return (
    <Card
      title={kind === "invite" ? "Welcome — choose a password" : "Choose a new password"}
      sub={`For ${email}. You'll use it with your email to sign in from now on.`}>
      <form onSubmit={save} noValidate>
        <input type="email" autoComplete="username" value={email} readOnly hidden />
        <Field label="New password" type="password" autoComplete="new-password" value={pw} onChange={(e) => setPw(e.target.value)} hint={`At least ${MIN_PASSWORD} characters.`} autoFocus />
        <Field label="Confirm password" type="password" autoComplete="new-password" value={pw2} onChange={(e) => setPw2(e.target.value)} />
        <Problem text={err} />
        <Primary busy={busy} busyLabel="Saving…">Save password</Primary>
      </form>
      <div style={{ textAlign: "center", marginTop: 10 }}>
        <LinkButton onClick={() => supabase.auth.signOut()}>Cancel and sign out</LinkButton>
      </div>
    </Card>
  );
}

/* ---------- the gate in front of the app ---------- */

function Gate() {
  const [session, setSession] = useState(null);
  const [ready, setReady] = useState(false);
  const [migrated, setMigrated] = useState(false);
  // An invite or password-reset link signs the person in; they still need a password.
  const [mustSetPassword, setMustSetPassword] = useState(arrivedVia === "invite" || arrivedVia === "recovery" ? arrivedVia : null);
  // undefined = still asking; false = signed in but not on the access list.
  const [access, setAccess] = useState(supabaseConfigured ? undefined : true);
  const email = session && session.user ? session.user.email || "" : "";

  useEffect(() => {
    if (!supabaseConfigured) { setReady(true); return; }
    supabase.auth.getSession().then(({ data }) => { setSession(data.session); setReady(true); });
    const { data: sub } = supabase.auth.onAuthStateChange((event, s) => {
      setSession(s);
      if (event === "PASSWORD_RECOVERY") setMustSetPassword("recovery");
      if (event === "SIGNED_OUT") setMustSetPassword(null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  // Once a link has signed someone in, tidy it out of the address bar.
  useEffect(() => {
    if (session && arrivedVia && window.location.hash) window.history.replaceState(null, "", window.location.pathname + window.location.search);
  }, [session]);

  useEffect(() => {
    if (!supabaseConfigured) return;
    if (!email) { setAccess(undefined); return; }
    let alive = true;
    hasAccess().then((ok) => { if (alive) setAccess(ok); });
    return () => { alive = false; };
  }, [email]);

  /* One-time move from the original single-cycle layout to the multi-cycle
     one. It short-circuits as soon as a cycles registry exists, so for any
     database already on the new layout this is a single cheap read. It has to
     finish before App mounts, otherwise App's own first write would create
     the registry and strand the old rows under cycle='current'. */
  useEffect(() => {
    if (!supabaseConfigured) { setMigrated(true); return; }
    if (!session || access !== true) return;
    let alive = true;
    ensureMigrated()
      .catch((e) => console.error("Migration check failed:", e))
      .finally(() => { if (alive) setMigrated(true); });
    return () => { alive = false; };
  }, [session, access]);

  if (!ready) return <Splash label="Loading…" />;
  if (supabaseConfigured && !session) return <AuthScreen />;
  if (mustSetPassword) return <SetPassword kind={mustSetPassword} email={email} onDone={() => setMustSetPassword(null)} />;
  if (access === undefined) return <Splash label="Checking your access…" />;
  if (access === false) {
    return (
      <Card title="You're signed in, but don't have access"
        sub={`${email} isn't on the Innovation Fund access list. Ask the fund's admin to add it, then sign in again.`}>
        <Primary type="button" onClick={() => supabase.auth.signOut()}>Sign out</Primary>
      </Card>
    );
  }
  if (!migrated) return <Splash label="Preparing your data…" />;

  return <App />;
}

function Splash({ label }) {
  return (
    <div style={{ minHeight: "100vh", background: PAPER, display: "grid", placeItems: "center", fontFamily: FONT, color: MUTED, fontSize: 13 }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ width: 34, height: 34, borderRadius: 10, background: BURGUNDY, color: "#fff", display: "grid", placeItems: "center", fontWeight: 800, margin: "0 auto 12px" }}>IF</div>
        {label}
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<Gate />);
