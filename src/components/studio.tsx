"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { ArrowLeft, ArrowRight, ArrowUpRight, Check, CheckCircle2, Clock3, Copy, Download, Eye, EyeOff, FileText, Inbox, Info, Loader2, LogOut, Mail, Pencil, PenLine, Phone, Plus, RefreshCw, Search, ShieldCheck, Trash2, UploadCloud, UserRound, Wallet, X } from "lucide-react";
import { Brand } from "./brand";
import { Modal, Toast } from "./ui";
import { UploadDialog } from "./upload-dialog";
import { ProfileDialog } from "./profile-dialog";
import { dateLabel, holdLabel, money, type PublicWork, type StudioOrder, type WorkStatus } from "@/lib/types";
import { errorMessage, requestJSON } from "@/lib/client";
import { writerDefaults } from "@/lib/writer-defaults";

type Writer = { displayName: string; email: string };
type Auth = { authenticated: boolean; writer: Writer | null; needsSetup: boolean };
type StudioData = { works: PublicWork[]; orders: StudioOrder[]; writer: Writer };
type ConfirmAction =
  | { type: "archive"; work: PublicWork }
  | { type: "examples" }
  | { type: "status"; work: PublicWork; status: WorkStatus }
  | { type: "complete" | "cancel"; order: StudioOrder };
const orderStates: Record<string, string> = { pending: "Menunggu pengesahan", completed: "Selesai", cancelled: "Dibatalkan", expired: "Tamat tempoh" };

function WriterIntroduction() {
  return <aside className="writer-introduction">
    <p className="eyebrow">WEBSITE KARYA ANDA</p>
    <h2>Anda menulis.<br /><em>Di sini, cerita diterbitkan.</em></h2>
    <p>Tak perlu borang luar. Muat naik karya dan urus Buy, Hold serta Sold Out — semuanya di satu tempat.</p>
    <div className="intro-file"><span className="intro-file-icon"><FileText size={30} strokeWidth={1.3} /></span><div><strong>skrip-anda.pdf</strong><span>PDF, Word atau TXT · Maksimum 8 MB</span></div><ShieldCheck size={20} /></div>
    <ol className="intro-steps">
      <li><span>01</span><div><strong>Cipta akaun penulis</strong><p>Hanya anda boleh upload dan mengurus karya.</p></div></li>
      <li><span>02</span><div><strong>Upload & terbitkan</strong><p>Pilih fail, isi sinopsis, harga dan tempoh Hold.</p></div></li>
      <li><span>03</span><div><strong>Terima Buy / Hold</strong><p>Semak pembeli, sahkan jualan dan tandakan Sold Out.</p></div></li>
    </ol>
    <div className="intro-status"><span><span className="status-dot" />Buy</span><span><Clock3 size={12} />Hold</span><span><CheckCircle2 size={12} />Sold Out</span></div>
  </aside>;
}

export function Studio({ startUpload = false }: { startUpload?: boolean }) {
  const [auth, setAuth] = useState<Auth | null>(null);
  const [works, setWorks] = useState<PublicWork[]>([]);
  const [orders, setOrders] = useState<StudioOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [pageError, setPageError] = useState("");
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [tab, setTab] = useState<"works" | "orders">("works");
  const [query, setQuery] = useState("");
  const [orderFilter, setOrderFilter] = useState("all");
  const [upload, setUpload] = useState<{ work: PublicWork | null } | null>(null);
  const [lastSaved, setLastSaved] = useState<PublicWork | null>(null);
  const [confirm, setConfirm] = useState<ConfirmAction | null>(null);
  const [busyId, setBusyId] = useState("");
  const [toast, setToast] = useState("");
  const [profileOpen, setProfileOpen] = useState(false);
  const uploadIntent = useRef(startUpload);
  const closeProfile = useCallback(() => setProfileOpen(false), []);
  const closeToast = useCallback(() => setToast(""), []);
  const closeUpload = useCallback(() => setUpload(null), []);
  const closeConfirm = useCallback(() => { if (!loading) setConfirm(null); }, [loading]);

  const refresh = useCallback(async () => {
    const data = await requestJSON<StudioData>("/api/studio");
    setWorks(data.works);
    setOrders(data.orders);
    setAuth({ authenticated: true, writer: data.writer, needsSetup: false });
    setLastSaved((previous) => previous ? data.works.find((work) => work.id === previous.id) ?? null : null);
    if (uploadIntent.current) {
      uploadIntent.current = false;
      setUpload({ work: null });
    }
  }, []);

  const loadAuth = useCallback(async () => {
    setPageError("");
    try {
      const data = await requestJSON<Auth>("/api/auth");
      setAuth(data);
      if (data.authenticated) await refresh();
    } catch (error) { setPageError(errorMessage(error)); }
  }, [refresh]);
  useEffect(() => { void loadAuth(); }, [loadAuth]);

  // Keep buyer requests current without interrupting the upload or confirmation forms.
  useEffect(() => {
    if (!auth?.authenticated || upload || confirm || profileOpen) return;
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") void refresh().catch(() => { /* A manual refresh presents connection errors. */ });
    }, 30000);
    return () => clearInterval(timer);
  }, [auth?.authenticated, upload, confirm, profileOpen, refresh]);

  async function signIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setLoading(true); setPageError("");
    const data = new FormData(event.currentTarget);
    try {
      await requestJSON("/api/auth", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: auth?.needsSetup ? "setup" : "login", name: data.get("name"), email: data.get("email"), password: data.get("password") }) });
      await refresh();
      setToast("Selamat datang. Ruang penulis anda sedia digunakan.");
    } catch (error) { setPageError(errorMessage(error)); } finally { setLoading(false); }
  }

  async function signOut() {
    try {
      await requestJSON("/api/auth", { method: "DELETE" });
      setWorks([]); setOrders([]); setUpload(null); setLastSaved(null); setConfirm(null); setProfileOpen(false);
      await loadAuth();
    } catch (error) { setToast(errorMessage(error)); }
  }

  async function refreshNow() {
    setRefreshing(true);
    try { await refresh(); setToast("Koleksi dan permintaan pembeli sudah dikemas kini."); }
    catch (error) { setToast(errorMessage(error)); }
    finally { setRefreshing(false); }
  }

  async function updateStatus(work: PublicWork, status: WorkStatus) {
    setBusyId(work.id);
    try {
      await requestJSON(`/api/works/${work.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) });
      await refresh(); setToast("Status karya dikemas kini.");
    } catch (error) { setToast(errorMessage(error)); } finally { setBusyId(""); }
  }

  async function confirmAction() {
    if (!confirm) return;
    setLoading(true); setPageError("");
    try {
      if (confirm.type === "archive") await requestJSON(`/api/works/${confirm.work.id}`, { method: "DELETE" });
      else if (confirm.type === "examples") await requestJSON("/api/studio/examples", { method: "DELETE" });
      else if (confirm.type === "status") await requestJSON(`/api/works/${confirm.work.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: confirm.status }) });
      else await requestJSON(`/api/orders/${confirm.order.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: confirm.type }) });
      await refresh();
      setToast(confirm.type === "examples" ? "Karya contoh disorok. Semua upload anda dikekalkan." : confirm.type === "archive" ? "Karya diarkibkan. Rekod pembelian dikekalkan." : confirm.type === "complete" || (confirm.type === "status" && confirm.status === "sold") ? "Jualan disahkan. Karya kini Sold Out dan muat turun pembeli dibuka." : "Status dan tempahan berjaya dikemas kini.");
      setConfirm(null);
    } catch (error) { setPageError(errorMessage(error)); } finally { setLoading(false); }
  }

  async function copyLink(path: string) {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}${path}`);
      setToast("Pautan disalin. Anda boleh kongsikan dengan pembeli.");
    } catch { setToast("Gunakan butang Lihat untuk membuka halaman, kemudian salin alamatnya."); }
  }

  function savedWork(work: PublicWork) {
    setUpload(null); setTab("works"); setQuery(""); setLastSaved(work);
    void refresh().then(() => setToast("Fail dan maklumat karya berjaya disimpan.")).catch((error) => setToast(errorMessage(error)));
  }

  const pending = orders.filter((order) => order.status === "pending");
  const exampleCount = works.filter((work) => work.isDemo).length;
  const ownCount = works.length - exampleCount;
  const revenue = orders.filter((order) => order.status === "completed").reduce((sum, order) => sum + order.amount, 0);
  const filteredWorks = useMemo(() => works.filter((work) => `${work.title} ${work.genre} ${work.format}`.toLowerCase().includes(query.toLowerCase())), [works, query]);
  const filteredOrders = useMemo(() => orders.filter((order) => (orderFilter === "all" || order.status === orderFilter) && `${order.title} ${order.customerName} ${order.email} ${order.reference}`.toLowerCase().includes(query.toLowerCase())), [orders, orderFilter, query]);

  let confirmTitle = "", confirmText = "", confirmLabel = "", danger = false;
  if (confirm?.type === "archive") {
    confirmTitle = "Arkibkan naskah ini?";
    confirmText = `${confirm.work.title} tidak lagi dipaparkan dalam katalog. Fail, rekod dan akses pembeli sedia ada tidak terjejas. Selesaikan semua tempahan aktif dahulu.`;
    confirmLabel = "Arkibkan karya"; danger = true;
  } else if (confirm?.type === "examples") {
    confirmTitle = "Sorok semua karya contoh?";
    confirmText = "Karya demonstrasi tidak lagi dipaparkan. Skrip yang anda upload sendiri, rekod pesanan dan fail pembeli tidak dipadam. Pastikan tiada tempahan aktif pada contoh.";
    confirmLabel = "Sorok karya contoh";
  } else if (confirm?.type === "status") {
    confirmTitle = confirm.status === "sold" ? "Tandakan sebagai Sold Out?" : confirm.status === "hold" ? "Tahan karya ini?" : "Buka semula tempahan?";
    confirmText = confirm.status === "sold" ? `${confirm.work.title} akan ditandakan terjual. Tempahan aktif turut disahkan dan pembeli boleh memuat turun fail. Lakukan hanya selepas bayaran dan persetujuan hak diselesaikan.` : `Status ${confirm.work.title} akan ditukar. Tempahan aktif dibatalkan jika anda memilih Tersedia. Sebarang bayaran dan hak karya perlu diselaraskan sendiri dengan pembeli.`;
    confirmLabel = confirm.status === "sold" ? "Sahkan terjual" : confirm.status === "hold" ? "Tandakan On Hold" : "Jadikan tersedia";
  } else if (confirm?.type === "complete") {
    confirmTitle = "Bayaran sudah diterima?";
    confirmText = `Sahkan hanya selepas menerima bayaran ${money(confirm.order.amount)} daripada ${confirm.order.customerName} dan memuktamadkan hak untuk ${confirm.order.title}. Karya akan ditandakan Sold Out dan muat turun pembeli diaktifkan.`;
    confirmLabel = "Sahkan jualan";
  } else if (confirm?.type === "cancel") {
    confirmTitle = "Lepaskan tempahan ini?";
    confirmText = `Permintaan ${confirm.order.reference} dibatalkan dan ${confirm.order.title} kembali tersedia. Maklumkan kepada pembeli. Tiada bayaran diproses melalui laman ini.`;
    confirmLabel = "Batalkan tempahan"; danger = true;
  }

  return <div className="studio-shell">
    <header className="studio-header"><div className="studio-header-inner studio-container">
      <Brand />
      <div className="studio-header-actions"><Link href="/" className="studio-back"><ArrowLeft size={14} />Kembali ke katalog</Link>{auth?.authenticated && <><span>{auth.writer?.displayName}</span><button className="icon-button" onClick={() => void signOut()} aria-label="Log keluar"><LogOut size={17} /></button></>}</div>
    </div></header>

    {!auth ? <div className="studio-loading">{pageError ? <><p className="form-error" role="alert">{pageError}</p><button className="button button-outline" onClick={() => void loadAuth()}>Cuba semula</button></> : <><Loader2 size={25} className="spin" />Membuka ruang penulis…</>}</div> : !auth.authenticated ? <main className="writer-onboarding studio-container">
      <WriterIntroduction />
      <section className="studio-auth">
        <div className="studio-symbol"><PenLine size={23} /></div>
        <p className="eyebrow">RUANG PERIBADI PENULIS</p>
        <h1>{auth.needsSetup ? "Cerita anda bermula di sini." : "Selamat kembali, penulis."}</h1>
        <p>{auth.needsSetup ? "Cipta akaun pemilik untuk mula upload skrip dan manuskrip. Pembaca boleh melihat karya dan menekan Buy / Hold terus di website ini." : startUpload ? "Log masuk dahulu. Borang upload skrip akan dibuka terus selepas itu." : "Log masuk untuk upload fail, urus harga dan semak permintaan pembeli anda."}</p>
        {startUpload && <div className="upload-intent-note"><UploadCloud size={15} /><span>Langkah seterusnya: pilih fail skrip anda.</span></div>}
        <form onSubmit={signIn}>
          {auth.needsSetup && <>
            <label className="field">Nama pena / nama penulis<input name="name" autoComplete="name" defaultValue={writerDefaults.displayName} placeholder="Nama yang dipaparkan pada karya" minLength={2} maxLength={80} required /></label>
            <label className="field">Alamat e-mel<input name="email" type="email" autoComplete="email" placeholder="penulis@contoh.com" required /></label>
          </>}
          <label className="field">Kata laluan<div className="password-wrap"><input name="password" type={passwordVisible ? "text" : "password"} autoComplete={auth.needsSetup ? "new-password" : "current-password"} minLength={auth.needsSetup ? 8 : 1} maxLength={128} placeholder={auth.needsSetup ? "Sekurang-kurangnya 8 aksara" : "Kata laluan akaun penulis"} required /><button type="button" aria-label={passwordVisible ? "Sembunyikan kata laluan" : "Lihat kata laluan"} onClick={() => setPasswordVisible(!passwordVisible)}>{passwordVisible ? <EyeOff size={16} /> : <Eye size={16} />}</button></div></label>
          {pageError && <p className="form-error" role="alert">{pageError}</p>}
          <button className="button full-width" disabled={loading}>{loading ? <><Loader2 size={16} className="spin" />Sila tunggu…</> : <>{auth.needsSetup ? "Cipta ruang penulis" : "Log masuk"}<ArrowUpRight size={17} /></>}</button>
        </form>
        <div className="info-note"><ShieldCheck size={17} /><p>{auth.needsSetup ? "Laman ini untuk satu pemilik. Sediakan akaun anda sebelum berkongsi akses ruang pengurusan. Penciptaan akaun tidak membeli domain atau hosting." : "Hanya pemilik akaun boleh upload fail dan menukar status karya. Pembeli tidak mempunyai akses pengurusan."}</p></div>
      </section>
    </main> : <main className="studio-container">
      <div className="studio-title"><div><p className="eyebrow">RUANG PENULIS</p><h1>Selamat menulis, {auth.writer?.displayName.split(" ")[0]}.</h1><p>Upload skrip anda. Pembeli pilih Buy atau Hold. Anda sahkan Sold Out.</p></div><div className="studio-title-actions"><button className="button button-outline" onClick={() => setProfileOpen(true)}><UserRound size={15} />Profil & blog</button><button className="button" onClick={() => setUpload({ work: null })}><UploadCloud size={16} />Muat naik skrip</button></div></div>

      {lastSaved && <section className="published-notice" aria-live="polite">
        <img src={lastSaved.image} alt="" />
        <div><span><CheckCircle2 size={14} />Fail karya berjaya disimpan</span><h2>{lastSaved.title}</h2><p>{lastSaved.format} · {money(lastSaved.price)} · Fail penuh dilindungi</p></div>
        <div className="published-actions"><Link className="button" href={`/karya/${encodeURIComponent(lastSaved.id)}`} target="_blank" rel="noopener noreferrer">Lihat karya saya <ArrowUpRight size={15} /></Link><button className="button button-outline" onClick={() => void copyLink(`/karya/${encodeURIComponent(lastSaved.id)}`)}><Copy size={14} />Salin pautan</button></div>
        <button className="icon-button published-close" onClick={() => setLastSaved(null)} aria-label="Tutup pengesahan upload"><X size={16} /></button>
      </section>}

      <div className="studio-stats">
        <div className="studio-stat"><span className="studio-stat-label"><FileText size={15} />Skrip dimuat naik</span><strong>{String(ownCount).padStart(2, "0")}</strong><small>{exampleCount ? `${exampleCount} karya contoh diasingkan` : "Karya sebenar dalam koleksi anda"}</small></div>
        <div className="studio-stat"><span className="studio-stat-label"><CheckCircle2 size={15} />Karya tersedia</span><strong>{String(works.filter((work) => work.status === "available" && !work.isDemo).length).padStart(2, "0")}</strong><small>Buy & Hold dibuka</small></div>
        <div className="studio-stat"><span className="studio-stat-label"><Clock3 size={15} />Permintaan aktif</span><strong>{String(pending.length).padStart(2, "0")}</strong><small>Menunggu tindakan anda</small></div>
        <div className="studio-stat"><span className="studio-stat-label"><Wallet size={15} />Jualan disahkan</span><strong>{money(revenue)}</strong><small>Bayaran disahkan secara manual</small></div>
      </div>

      {ownCount === 0 && <section className="first-upload-card"><div className="first-upload-icon"><UploadCloud size={27} strokeWidth={1.5} /></div><div><p className="eyebrow">KARYA PERTAMA ANDA</p><h2>Fail anda, terus jadi sebuah naskah.</h2><p>Pilih PDF atau Word, isi tajuk, harga dan sinopsis. Buy dan Hold akan tersedia selepas anda terbitkan karya.</p></div><button className="button" onClick={() => setUpload({ work: null })}>Upload skrip pertama <ArrowRight size={15} /></button></section>}

      {exampleCount > 0 && <div className="examples-notice"><Info size={15} /><p><strong>{exampleCount} karya contoh</strong> untuk mencuba fungsi. Ini bukan skrip sebenar anda. Upload karya sendiri atau sorok contoh apabila bersedia.</p><button onClick={() => { setPageError(""); setConfirm({ type: "examples" }); }}>Sorok karya contoh <ArrowRight size={12} /></button></div>}

      <div className="studio-tabs"><button className={tab === "works" ? "selected" : ""} onClick={() => { setTab("works"); setQuery(""); }}><FileText size={15} />Karya saya<span>{works.length}</span></button><button className={tab === "orders" ? "selected" : ""} onClick={() => { setTab("orders"); setQuery(""); }}><Inbox size={15} />Permintaan pembeli<span>{pending.length}</span></button><button className="studio-refresh" disabled={refreshing} onClick={() => void refreshNow()} aria-label="Semak permintaan terkini"><RefreshCw size={14} className={refreshing ? "spin" : ""} /><span>Semak terkini</span></button></div>

      <div className="studio-search-row"><p>{tab === "works" ? `${filteredWorks.length} naskah dalam koleksi` : `${filteredOrders.length} permintaan · Bayaran diurus terus dengan pembeli`}</p><div className="studio-search-tools">{tab === "orders" && <select aria-label="Tapis status permintaan" className="status-select" value={orderFilter} onChange={(event) => setOrderFilter(event.target.value)}><option value="all">Semua status</option><option value="pending">Menunggu</option><option value="completed">Selesai</option><option value="cancelled">Dibatalkan</option><option value="expired">Tamat tempoh</option></select>}<div className="search-box"><Search size={16} /><input placeholder={tab === "works" ? "Cari karya anda…" : "Nama, tajuk, rujukan…"} value={query} onChange={(event) => setQuery(event.target.value)} aria-label="Cari dalam ruang penulis" />{query && <button onClick={() => setQuery("")} aria-label="Kosongkan carian"><X size={14} /></button>}</div></div></div>

      {tab === "works" ? filteredWorks.length ? <div className="table-scroll"><table className="work-table"><thead><tr><th>Naskah & fail</th><th>Format</th><th>Harga</th><th>Status</th><th style={{ textAlign: "right" }}>Tindakan</th></tr></thead><tbody>{filteredWorks.map((work) => <tr key={work.id}>
        <td><div className="table-work"><img src={work.image} alt="" /><div><h3>{work.title}</h3><p>{work.isDemo ? "Contoh · " : ""}{work.genre} · {work.pages} halaman{work.featured ? " · Pilihan" : ""}</p><span className="table-file-note"><ShieldCheck size={10} />{work.hasFile ? "Fail disimpan secara peribadi" : "Fail belum tersedia"}</span></div></div></td>
        <td>{work.format}{work.episodes > 1 && <span className="table-secondary">{work.episodes} episod</span>}{work.progress === "Separuh siap" && <span className="table-secondary">Separuh siap</span>}</td>
        <td className="table-price">{money(work.price)}</td>
        <td><select className="status-select" value={work.status} disabled={busyId === work.id} aria-label={`Status ${work.title}`} onChange={(event) => { const status = event.target.value as WorkStatus; if (status === "sold" || work.status === "sold" || (work.status === "hold" && status === "available")) { setPageError(""); setConfirm({ type: "status", work, status }); } else void updateStatus(work, status); }}><option value="available">Tersedia</option><option value="hold">On Hold</option><option value="sold">Sold Out</option></select><span className="table-secondary">Hold {holdLabel(work.holdHours)}</span></td>
        <td><div className="table-actions"><Link className="icon-button" href={`/karya/${encodeURIComponent(work.id)}`} target="_blank" rel="noopener noreferrer" aria-label={`Lihat ${work.title}`} title="Lihat halaman karya"><Eye size={15} /></Link><button className="icon-button" aria-label={`Sunting ${work.title}`} title="Sunting karya" onClick={() => setUpload({ work })}><Pencil size={15} /></button>{work.hasFile && <a className="icon-button" href={`/api/works/${work.id}/file`} title="Muat turun fail asal" aria-label={`Muat turun ${work.title}`}><Download size={15} /></a>}<button className="icon-button" aria-label={`Arkibkan ${work.title}`} title="Arkibkan karya" onClick={() => { setPageError(""); setConfirm({ type: "archive", work }); }}><Trash2 size={15} /></button></div></td>
      </tr>)}</tbody></table></div> : <div className="studio-empty"><FileText size={31} strokeWidth={1.3} /><h3>{query ? "Naskah tidak ditemui." : "Halaman pertama sedang menunggu."}</h3><p>{query ? "Cuba tajuk atau genre lain." : "Upload fail skrip pertama anda dan mulakan koleksi sebenar."}</p><button className="button" onClick={() => query ? setQuery("") : setUpload({ work: null })}>{query ? "Kosongkan carian" : "Muat naik skrip"}<Plus size={15} /></button></div> : filteredOrders.length ? <div className="requests-list">{filteredOrders.map((order) => <article className="request-card" key={order.id}>
        <div className="request-main"><div className="request-topline"><span className={`request-state ${order.status}`}>{orderStates[order.status] || order.status}</span><span>{order.type === "buy" ? "BUY" : `HOLD ${holdLabel(Math.max(1, Math.round((new Date(order.expiresAt).getTime() - new Date(order.createdAt).getTime()) / 3600000))).toUpperCase()}`} · {order.reference}</span></div><h3>{order.title}</h3><div className="request-customer"><strong>{order.customerName}</strong><a href={`mailto:${order.email}`}><Mail size={12} />{order.email}</a>{order.phone && <a href={`tel:${order.phone}`}><Phone size={12} />{order.phone}</a>}</div>{order.notes && <p className="request-notes">“{order.notes}”</p>}<p className="request-date">Diterima {dateLabel(order.createdAt)}{order.status === "pending" && ` · Tamat ${new Intl.DateTimeFormat("ms-MY", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kuala_Lumpur" }).format(new Date(order.expiresAt))} MYT`}</p></div>
        <div className="request-aside"><strong>{money(order.amount)}</strong><div className="request-actions">{order.status === "pending" && <><button className="button button-outline" onClick={() => { setPageError(""); setConfirm({ type: "cancel", order }); }}>Batalkan</button><button className="button" onClick={() => { setPageError(""); setConfirm({ type: "complete", order }); }}><Check size={14} />Sahkan jualan</button></>}<Link href={`/pesanan/${order.accessToken}`} className="button button-outline">Lihat pesanan <ArrowUpRight size={14} /></Link><button className="icon-button" onClick={() => void copyLink(`/pesanan/${order.accessToken}`)} aria-label="Salin pautan pesanan" title="Salin pautan peribadi untuk pembeli"><Copy size={15} /></button></div></div>
      </article>)}</div> : <div className="studio-empty"><Inbox size={31} strokeWidth={1.3} /><h3>Ruang untuk peluang baharu.</h3><p>{query || orderFilter !== "all" ? "Tiada permintaan sepadan dengan penapis anda." : "Apabila pembaca menekan Buy atau Hold, permintaan mereka akan muncul di sini."}</p>{(query || orderFilter !== "all") && <button className="button button-outline" onClick={() => { setQuery(""); setOrderFilter("all"); }}>Lihat semua permintaan</button>}</div>}

      <p className="studio-note"><ShieldCheck size={13} /><span>Fail penuh tidak dipaparkan dalam katalog. Hold pembeli tamat mengikut tempoh karya; jualan hanya selesai selepas anda sahkan. Bayaran diurus secara terus, bukan melalui gateway automatik. Simpan juga salinan asal fail anda.</span></p>
    </main>}

    {profileOpen && auth?.writer && <ProfileDialog initialName={auth.writer.displayName} onClose={closeProfile} onSaved={() => { setProfileOpen(false); void refresh().then(() => setToast("Profil dan pautan blog berjaya disimpan.")).catch((error) => setToast(errorMessage(error))); }} />}
    {upload && <UploadDialog key={upload.work?.id || "new"} work={upload.work} onClose={closeUpload} onSaved={savedWork} />}
    {confirm && <Modal title={confirmTitle} eyebrow="TINDAKAN PENULIS" onClose={closeConfirm}><div className="confirm-body"><p>{confirmText}</p>{pageError && <p className="form-error" role="alert" style={{ marginTop: 16 }}>{pageError}</p>}<div className="confirm-actions"><button className="button button-outline" onClick={closeConfirm} disabled={loading}>Kembali</button><button className={`button${danger ? " button-danger" : ""}`} disabled={loading} onClick={() => void confirmAction()}>{loading ? <Loader2 size={16} className="spin" /> : <Check size={15} />}{confirmLabel}</button></div></div></Modal>}
    {toast && <Toast message={toast} onClose={closeToast} />}
  </div>;
}
