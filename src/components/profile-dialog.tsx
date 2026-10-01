"use client";

import { useEffect, useState, type FormEvent } from "react";
import { ArrowUpRight, BookOpen, Loader2, ShieldCheck } from "lucide-react";
import { errorMessage, requestJSON } from "@/lib/client";
import type { PublicProfile } from "@/lib/types";
import { Modal } from "./ui";

export function ProfileDialog({ initialName, onClose, onSaved }: { initialName: string; onClose: () => void; onSaved: () => void }) {
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    requestJSON<{ profile: PublicProfile }>("/api/profile").then((data) => { if (active) setProfile(data.profile); }).catch((err) => { if (active) { setError(errorMessage(err)); setProfile({ displayName: initialName, bio: "", blogUrl: "" }); } });
    return () => { active = false; };
  }, [initialName]);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setLoading(true); setError("");
    const form = new FormData(event.currentTarget);
    try {
      await requestJSON("/api/profile", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ displayName: form.get("displayName"), bio: form.get("bio"), blogUrl: form.get("blogUrl") }) });
      onSaved();
    } catch (err) { setError(errorMessage(err)); } finally { setLoading(false); }
  }
  return <Modal title="Satu penulis. Banyak cerita." eyebrow="PROFIL PENULIS" onClose={onClose}>
    {!profile ? <div className="studio-loading"><Loader2 className="spin" size={23} />Membuka profil…</div> : <form onSubmit={submit} className="order-form">
      <label className="field">Nama pena / nama penulis<input name="displayName" defaultValue={profile.displayName} minLength={2} maxLength={80} required /></label>
      <label className="field">Tentang anda <small>(dipaparkan kepada umum)</small><textarea name="bio" defaultValue={profile.bio} rows={4} maxLength={1200} placeholder="Perkenalkan suara, genre dan perjalanan penulisan anda…" /></label>
      <label className="field">Pautan blog Blogger / blog sendiri <small>(pilihan)</small><input name="blogUrl" type="url" defaultValue={profile.blogUrl} maxLength={600} placeholder="https://nama-blog-anda.blogspot.com" /></label>
      <div className="info-note"><ShieldCheck size={18} /><p>Upload fail dan semua permintaan Buy / Hold diurus terus di laman mayamyrastories ini. Hanya anda boleh menukar status dan mengesahkan jualan. Fail penuh tidak dipaparkan kepada umum.</p></div>
      <div className="info-note"><BookOpen size={18} /><p>Blog lama boleh kekal untuk cerpen dan bacaan umum. Pautan blog di sini pilihan sahaja; ia tidak mengubah artikel atau memasang sistem jualan pada Blogger.</p></div>
      {error && <p className="form-error" role="alert">{error}</p>}
      <button className="button full-width" disabled={loading}>{loading ? <><Loader2 size={16} className="spin" />Menyimpan…</> : <>Simpan profil <ArrowUpRight size={16} /></>}</button>
    </form>}
  </Modal>;
}
