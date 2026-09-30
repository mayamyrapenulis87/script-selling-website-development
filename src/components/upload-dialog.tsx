"use client";

import { useCallback, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { ArrowUpRight, FileCheck2, ImagePlus, Info, Loader2, ShieldCheck, UploadCloud } from "lucide-react";
import { formats, genres, hasEpisodes, holdLabel, holdOptions, type PublicWork } from "@/lib/types";
import { errorMessage, uploadForm } from "@/lib/client";
import { Modal } from "./ui";

const covers = ["/images/senja.jpg", "/images/rumah.jpg", "/images/hujan.jpg", "/images/kota.jpg"];
const fileExtensions = ["pdf", "doc", "docx", "txt"];
function fileSizeLabel(bytes: number) { return bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`; }

export function UploadDialog({ work, onClose, onSaved }: {
  work: PublicWork | null;
  onClose: () => void;
  onSaved: (work: PublicWork) => void;
}) {
  const [format, setFormat] = useState(work?.format || "Telemovie");
  const [title, setTitle] = useState(work?.title || "");
  const [image, setImage] = useState(work?.image || covers[0]);
  const [filename, setFilename] = useState("");
  const [fileSize, setFileSize] = useState(0);
  const [loading, setLoading] = useState(false);
  const [percent, setPercent] = useState(0);
  const [error, setError] = useState("");
  const coverRef = useRef<HTMLInputElement>(null);
  const novel = format === "Manuskrip novel";
  const close = useCallback(() => { if (!loading) onClose(); }, [loading, onClose]);

  function customCover(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024 || !["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setError("Kulit karya mestilah JPG, PNG atau WEBP, maksimum 2 MB.");
      event.target.value = "";
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (coverRef.current?.files?.[0] === file) { setImage(String(reader.result)); setError(""); }
    };
    reader.onerror = () => setError("Imej tidak dapat dibaca. Sila pilih imej lain.");
    reader.readAsDataURL(file);
  }

  function selectScript(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) { setFilename(""); setFileSize(0); return; }
    const extension = file.name.split(".").pop()?.toLowerCase() || "";
    if (!fileExtensions.includes(extension) || file.size > 8 * 1024 * 1024 || file.size === 0) {
      setError("Pilih fail PDF, DOC, DOCX atau TXT yang tidak kosong, maksimum 8 MB.");
      setFilename(""); setFileSize(0); event.target.value = "";
      return;
    }
    setFilename(file.name); setFileSize(file.size); setError("");
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setLoading(true); setPercent(0); setError("");
    try {
      const result = await uploadForm<{ work: PublicWork }>(work ? `/api/works/${work.id}` : "/api/works", work ? "PATCH" : "POST", form, setPercent);
      onSaved(result.work);
    } catch (err) { setError(errorMessage(err)); }
    finally { setLoading(false); }
  }

  return <Modal title={work ? "Kemaskan cerita anda." : "Upload fail. Terbitkan cerita."} eyebrow={work ? "SUNTING NASKAH" : "MUAT NAIK SKRIP & MANUSKRIP"} onClose={close} wide>
    <form className="upload-form" onSubmit={submit} aria-busy={loading}>
      <div className="upload-introduction"><ShieldCheck size={17} /><p>Sinopsis dan harga untuk pembaca. <strong>Fail penuh hanya untuk anda dan pembeli yang disahkan.</strong></p></div>
      {work?.isDemo && <div className="info-note upload-demo-note"><Info size={17} /><p>Anda sedang menyunting karya contoh. Pilih fail anda sendiri untuk menggantikan fail demonstrasi. Menukar tajuk sahaja tidak menjadikannya karya sebenar.</p></div>}
      <fieldset className="upload-fieldset" disabled={loading}>
        <div className="upload-grid">
          <div className="upload-column">
            <p className="form-section-label"><span>01</span>Maklumat karya</p>
            <label className="field">Tajuk naskah <span>*</span><input name="title" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Tajuk skrip atau manuskrip anda" minLength={3} maxLength={140} required /></label>
            <div className="form-grid">
              <label className="field">Format karya<select aria-label="Format karya" name="format" value={format} onChange={(event) => setFormat(event.target.value as typeof format)}>{formats.map((item) => <option key={item}>{item}</option>)}</select></label>
              <label className="field">Genre<select aria-label="Genre" name="genre" defaultValue={work?.genre || "Drama"}>{genres.map((item) => <option key={item}>{item}</option>)}</select></label>
            </div>
            <label className="field">Sinopsis <span>*</span><textarea name="synopsis" defaultValue={work?.synopsis} rows={4} minLength={20} maxLength={3000} placeholder="Perkenalkan watak, konflik dan jiwa cerita anda…" required /></label>
            <label className="field">Pratonton {novel ? "manuskrip" : "skrip"} <small>(pilihan, dibaca oleh umum)</small><textarea name="excerpt" defaultValue={work?.excerpt} rows={5} maxLength={8000} placeholder={novel ? "BAB 1\n\nKongsikan petikan pendek daripada novel anda." : "FADE IN:\n\nEXT. PANTAI — SENJA\n\nTulis petikan pendek daripada skrip anda."} /></label>
            <label className="field">Tahap siap karya<select name="progress" aria-label="Tahap siap karya" defaultValue={work?.progress || "Lengkap"}><option value="Lengkap">Lengkap</option><option value="Separuh siap">Separuh siap / draf belum lengkap</option></select></label>
            <p className="upload-field-help">Untuk karya separuh siap, nyatakan bahagian yang tersedia dan sama ada penyempurnaan termasuk dalam harga.</p>
            {novel ? <><input type="hidden" name="duration" value="0" /><input type="hidden" name="episodes" value="1" /></> : <div className="form-grid" key={format}>
              <label className="field">Durasi {hasEpisodes(format) ? "/ episod " : ""}(minit)<input name="duration" type="number" min={1} max={600} step={1} defaultValue={work?.duration || (format === "Drama radio" ? 30 : 90)} required /></label>
              {hasEpisodes(format) ? <label className="field">Jumlah episod <span>*</span><input name="episodes" type="number" min={1} max={200} step={1} defaultValue={work?.episodes || (format === "Drama bersiri" ? 30 : 1)} required /></label> : <input type="hidden" name="episodes" value="1" />}
            </div>}
          </div>
          <div className="upload-column">
            <p className="form-section-label"><span>02</span>Fail, kulit & harga</p>
            <label className={`file-dropzone${filename ? " file-selected" : ""}`}>
              <input type="file" name="script" accept=".pdf,.doc,.docx,.txt" required={!work?.hasFile} aria-label="Muat naik fail skrip" onChange={selectScript} />
              {filename || work?.hasFile ? <FileCheck2 size={30} strokeWidth={1.4} /> : <UploadCloud size={33} strokeWidth={1.4} />}
              <strong>{filename || (work?.hasFile ? "Fail sedia ada dikekalkan" : "Pilih atau seret fail skrip di sini")}</strong>
              <span>{filename ? `${fileSizeLabel(fileSize)} · Fail peribadi` : "PDF, Word (DOC / DOCX), TXT · Maksimum 8 MB"}</span>
              <span className="file-select-label">{work?.hasFile ? "Klik untuk ganti fail" : "Klik untuk pilih fail"}</span>
            </label>
            <p className="upload-field-help">Untuk drama 30 episod, anda boleh menggabungkan semua episod dalam satu fail Word atau PDF.</p>
            <div>
              <span className="field">Kulit karya</span>
              <div className="cover-preview" style={{ marginTop: 7 }}><img src={image} alt="Pratonton kulit karya" /><span>{title || "Cerita anda."}</span></div>
              <div className="cover-picker">{covers.map((cover, index) => <button type="button" key={cover} className={image === cover ? "selected" : ""} aria-label={`Pilih kulit ${index + 1}`} onClick={() => { setImage(cover); if (coverRef.current) coverRef.current.value = ""; }}><img src={cover} alt="" /></button>)}<label className="custom-cover-input"><ImagePlus size={14} />Imej sendiri<input ref={coverRef} type="file" name="cover" accept="image/jpeg,image/png,image/webp" onChange={customCover} aria-label="Muat naik kulit sendiri, maksimum 2 MB" /></label></div>
              <input type="hidden" name="image" value={image} />
            </div>
            <div className="form-grid">
              <label className="field">Harga (RM) <span>*</span><input name="price" type="number" min={1} max={1000000} step={1} defaultValue={work?.price} placeholder="2800" required /></label>
              <label className="field">Jumlah halaman <span>*</span><input name="pages" type="number" min={1} max={20000} step={1} defaultValue={work?.pages} placeholder="86" required /></label>
            </div>
            <div className="form-grid">
              <label className="field">Tempoh Hold<select name="holdHours" aria-label="Tempoh Hold" defaultValue={work?.holdHours || 48}>{holdOptions.map((hours) => <option key={hours} value={hours}>{holdLabel(hours)}</option>)}</select></label>
              <label className="field">Status karya<select name="status" aria-label="Status karya" defaultValue={work?.status || "available"}><option value="available">Tersedia — Buy / Hold</option><option value="hold">On Hold</option><option value="sold">Sold Out</option></select></label>
            </div>
            <p className="upload-field-help">Tersedia membuka Buy dan Hold. Selepas jualan, pilih Sold Out. Mengubah status tempahan aktif boleh membatalkan atau mengesahkannya; semak bayaran dahulu.</p>
          </div>
        </div>
        <div className="upload-footer">
          <label className="checkbox-field"><input name="featured" type="checkbox" value="true" defaultChecked={work?.featured} /><span>Tandakan sebagai karya pilihan</span></label>
          <div><button type="button" className="button button-outline" onClick={close}>Batal</button><button className="button" type="submit">{loading ? <><Loader2 size={16} className="spin" />{percent < 100 ? `Memuat naik ${percent}%` : "Menyimpan karya…"}</> : <>{work ? "Simpan perubahan" : "Terbitkan naskah"}<ArrowUpRight size={16} /></>}</button></div>
        </div>
      </fieldset>
      {loading && <div className="upload-progress" role="status"><div><span>{percent < 100 ? "Memindahkan fail anda…" : "Fail dihantar. Menyimpan ke koleksi…"}</span><strong>{percent}%</strong></div><progress aria-label="Kemajuan muat naik fail" value={percent} max={100} /><p>Jangan tutup halaman sehingga pengesahan dipaparkan.</p></div>}
      {error && <p className="form-error" role="alert">{error}</p>}
    </form>
  </Modal>;
}
