import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom/client";
import App from "./GCSInnovationFund.jsx";
import { supabase, supabaseConfigured } from "./lib/supabase";

const BURGUNDY = "#912338";
const PAPER = "#FAF8F5";
const INK = "#32302F";

function Login() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const magic = () => {
    if (!email.trim()) return;
    supabase.auth.signInWithOtp({ email: email.trim(), options: { emailRedirectTo: window.location.origin } });
    setSent(true);
  };
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
        <div style={{ fontSize: 13, color: "#6E6E6E", marginBottom: 12 }}>Enter your email and we'll send you a sign-in link.</div>
        {sent ? (
          <div style={{ fontSize: 13, color: "#508212" }}>Check your inbox for the sign-in link.</div>
        ) : (
          <div style={{ display: "flex", gap: 8 }}>
            <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@concordia.ca"
              onKeyDown={(e) => { if (e.key === "Enter") magic(); }}
              style={{ flex: 1, padding: "9px 11px", border: "1px solid #ECE7E1", borderRadius: 9, fontFamily: "inherit", fontSize: 13 }} />
            <button onClick={magic} style={{ padding: "9px 15px", borderRadius: 9, border: "none", background: BURGUNDY, color: "#fff", fontWeight: 600, cursor: "pointer" }}>Send</button>
          </div>
        )}
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

  return (
    <>
      {supabaseConfigured && (
        <button
          onClick={() => supabase.auth.signOut()}
          style={{ position: "fixed", top: 12, right: 14, zIndex: 50, fontSize: 12, color: "#6E6E6E", background: "#fff", border: "1px solid #ECE7E1", borderRadius: 999, padding: "5px 12px", cursor: "pointer", fontFamily: "Inter, system-ui, sans-serif" }}
        >
          Sign out
        </button>
      )}
      <App />
    </>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<Gate />);
