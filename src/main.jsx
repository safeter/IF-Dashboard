import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom/client";
import App from "./GCSInnovationFund.jsx";
import { supabase, supabaseConfigured } from "./lib/supabase";

const BURGUNDY = "#912338";
const PAPER = "#FAF8F5";
const INK = "#32302F";

function Login() {
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const go = async () => {
    if (!email.trim() || !pw) return;
    setBusy(true); setErr("");
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password: pw });
    if (error) setErr(error.message);
    setBusy(false);
  };
  const field = { width: "100%", padding: "9px 11px", border: "1px solid #ECE7E1", borderRadius: 9, fontFamily: "inherit", fontSize: 13, marginBottom: 10, boxSizing: "border-box" };
  return (
    <div style={{ minHeight: "100vh", background: PAPER, display: "grid", placeItems: "center", fontFamily: "Inter, system-ui, sans-serif", color: INK }}>
      <div style={{ width: 340, background: "#fff", border: "1px solid #ECE7E1", borderRadius: 18, padding: 28 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18 }}>
          <div style={{ width: 34, height: 34, borderRadius: 10, background: BURGUNDY, color: "#fff", display: "grid", placeItems: "center", fontWeight: 800 }}>IF</div>
          <div>
            <div style={{ fontWeight: 700 }}>Innovation Fund</div>
            <div style={{ fontSize: 11, color: "#6E6E6E", letterSpacing: ".1em", textTransform: "uppercase" }}>Gina Cody School</div>
          </div>
        </div>
        <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" type="email" autoComplete="username" style={field} />
        <input value={pw} onChange={(e) => setPw(e.target.value)} placeholder="Password" type="password" autoComplete="current-password"
          onKeyDown={(e) => { if (e.key === "Enter") go(); }} style={field} />
        {err && <div style={{ fontSize: 12.5, color: "#DA3A16", marginBottom: 10 }}>{err}</div>}
        <button onClick={go} disabled={busy} style={{ width: "100%", padding: "10px 14px", borderRadius: 999, border: "none", background: BURGUNDY, color: "#fff", fontWeight: 600, cursor: busy ? "default" : "pointer", opacity: busy ? 0.7 : 1 }}>
          {busy ? "Signing in…" : "Sign in"}
        </button>
      </div>
    </div>
  );
}

function Gate() {
  const [session, setSession] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!supabaseConfigured) { setReady(true); return; }
    supabase.auth.getSession().then(({ data }) => { setSession(data.session); setReady(true); });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  if (!ready) return null;
  if (supabaseConfigured && !session) return <Login />;

  return <App />;
}

ReactDOM.createRoot(document.getElementById("root")).render(<Gate />);
