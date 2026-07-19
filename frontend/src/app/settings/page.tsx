"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { Loader } from "@/components/ui/Loader";
import { api, getToken, clearToken, type InterviewTrack } from "@/lib/api";
import { TRACKS, STACKS } from "@/lib/interview";

const field = { fontSize: 12.5, fontWeight: 700, color: "var(--muted)", marginBottom: 8 } as const;

export default function SettingsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [track, setTrack] = useState<InterviewTrack | null>(null);
  const [stack, setStack] = useState("");
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (!getToken()) { router.replace("/login"); return; }
    api.me().then((u) => {
      setEmail(u.email);
      setName(u.name);
      setTrack(u.primaryTrack);
      setStack(u.primaryStack ?? "");
    }).catch(() => {}).finally(() => setLoading(false));
  }, [router]);

  async function save() {
    setSaving(true);
    try {
      await api.updateProfile({ name: name.trim() || undefined, primaryTrack: track ?? undefined, primaryStack: stack || null });
      setToast("Saved ✓");
    } catch (e) {
      setToast(e instanceof Error ? e.message : "Couldn't save — please try again.");
    } finally {
      setSaving(false);
      setTimeout(() => setToast(null), 2800);
    }
  }

  if (loading) return <AppShell><Loader label="Loading settings…" /></AppShell>;

  const card = { background: "var(--card)", border: "1px solid var(--line)", borderRadius: 16, boxShadow: "var(--sh)", padding: "22px 24px" } as const;

  return (
    <AppShell>
      <div style={{ maxWidth: 720 }}>
        <PageHeader eyebrow="Settings" title="Your profile" subtitle="Your name, and the benchmark track your Readiness Checks measure against." />

        <div style={{ ...card, display: "flex", flexDirection: "column", gap: 20 }}>
          <div>
            <div style={field}>Name</div>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              style={{ width: "100%", border: "1px solid var(--line)", borderRadius: 12, padding: "11px 13px", fontFamily: "inherit", fontSize: 14, background: "var(--card)", color: "var(--ink)" }}
            />
          </div>

          <div>
            <div style={field}>Email</div>
            <div style={{ fontSize: 14, color: "var(--muted)" }}>{email}</div>
          </div>

          <div>
            <div style={field}>Primary interview track <span style={{ fontWeight: 500, color: "var(--faint)" }}>— your readiness benchmark</span></div>
            <div className="type-grid">
              {TRACKS.map((t) => (
                <button type="button" key={t.key} className={`type-opt${track === t.key ? " active" : ""}`} onClick={() => { setTrack(t.key); setStack(""); }}>
                  <span className="ic">{t.icon}</span>
                  <span><b>{t.label}</b><em>{t.desc}</em></span>
                </button>
              ))}
            </div>
          </div>

          {track && STACKS[track] && (
            <div>
              <div style={field}>Stack <span style={{ fontWeight: 500, color: "var(--faint)" }}>— personalizes your questions</span></div>
              <div className="level-row">
                {STACKS[track]!.map((sName) => (
                  <button type="button" key={sName} className={`level-pill${stack === sName ? " active" : ""}`} onClick={() => setStack(sName)}>{sName}</button>
                ))}
              </div>
            </div>
          )}

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12, marginTop: 4 }}>
            <button className="btn" onClick={save} disabled={saving}>{saving ? "Saving…" : "Save changes"}</button>
            <button
              onClick={() => { clearToken(); router.replace("/login"); }}
              style={{ background: "none", border: "1px solid var(--line)", borderRadius: 10, padding: "9px 14px", fontFamily: "inherit", fontSize: 13, fontWeight: 700, color: "var(--muted)", cursor: "pointer" }}
            >
              Sign out
            </button>
          </div>

          <p style={{ fontSize: 12, color: "var(--faint)", margin: 0 }}>
            Changing your track starts a fresh benchmark — past Readiness Checks keep the track they were taken on.
          </p>
        </div>
      </div>

      {toast && (
        <div style={{ position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)", background: "var(--ink)", color: "var(--bg)", padding: "11px 18px", borderRadius: 12, fontSize: 13.5, fontWeight: 700, zIndex: 50 }}>
          {toast}
        </div>
      )}
    </AppShell>
  );
}
