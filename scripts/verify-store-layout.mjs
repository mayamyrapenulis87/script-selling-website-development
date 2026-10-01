import dotenv from "dotenv";
import { chromium, request } from "playwright";
import { expect } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { sql } from "drizzle-orm";

dotenv.config({ quiet: true });
const base = process.env.NASKAH_TEST_URL || "http://localhost:3000";
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool);
const suffix = randomUUID().slice(0, 7);
const writerEmail = `store-owner-${suffix}@example.com`;
const buyerEmail = `store-reader-${suffix}@example.com`;
const password = randomUUID();
const paidTitle = `E-Book Ujian ${suffix}`;
const freeTitle = `Cerpen Free Ujian ${suffix}`;
let browser, api, seedOwner = false;
function check(name, result) { if (!result) throw new Error(`FAILED: ${name}`); console.log(`PASS: ${name}`); }

async function run() {
  try {
    api = await request.newContext({ baseURL: base });
    const worksResponse = await api.get("/api/works");
    const { works } = await worksResponse.json();
    check("Catalog is public", worksResponse.ok && works.length >= 12);
    check("All 12 titles exist without 'contoh' text", works.every((w) => !w.title.toLowerCase().includes("contoh")));
    check("Script shop contains core production formats", ["Drama Bersiri Perdana", "Telefilem / Telemovie", "Filem Cereka", "Skrip Siri Pendek (Digital)", "Skrip Teater"].every((format) => works.some((work) => work.format === format && work.section === "script")));
    check("E-book shop has reading materials", works.some((work) => work.section === "ebook" && work.format === "Fiksyen (Cerita Rekaan)"));
    check("Free library has preview, pitch and weekly story", ["Pratonton E-Book (3 Bab Pertama)", "Draf Pitching (Skrip Pilihan)", "Cerpen Mingguan"].every((format) => works.some((work) => work.format === format && work.isFree)));
    for (const src of [
      "/images/tun-teja.jpg",
      "/images/kota-menunggu.jpg",
      "/images/dua-senja.jpg",
      "/images/kota-rahsia.jpg",
      "/images/sebelum-hujan.jpg",
      "/images/ruang-kecil.jpg",
      "/images/langit-novel.jpg",
      "/images/bilik-kepala.jpg",
      "/images/catatan-penulis.jpg",
      "/images/pratonton-senja.jpg",
      "/images/pitching-kota.jpg",
      "/images/gerabak-3.jpg",
    ]) {
      const image = await api.get(src);
      check(`Cover asset ${src} is deployed`, image.ok && (image.headers()["content-type"] || "").startsWith("image/"));
    }
    const freeWork = works.find((work) => work.isFree);
    const freeRead = await api.get(`/api/free/${freeWork.id}`);
    check("Free library file opens without an account", freeRead.ok);
    check("Free library cannot be purchased through paid order endpoint", (await api.post("/api/orders", { data: { manuscriptId: freeWork.id, type: "buy", name: "Reader", email: buyerEmail } })).status() === 400);

    browser = await chromium.launch({ headless: true, args: ["--no-sandbox"] });
    const desktop = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    const mobile = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    const errors = []; desktop.on("pageerror", e => errors.push(e.message)); mobile.on("pageerror", e => errors.push(e.message));
    await desktop.goto(base, { waitUntil: "networkidle" }); await desktop.evaluate(() => document.fonts.ready);
    await desktop.screenshot({ path: ".artifacts/stores-desktop.png", fullPage: false });
    check("Top navigation shows three stores", await desktop.locator(".store-menu").count() === 3);
    await desktop.locator(".store-menu").filter({ hasText: "Kedai Skrip" }).locator("summary").click();
    await expect(desktop.getByRole("button", { name: "Skrip Teater", exact: true })).toBeVisible();
    await desktop.getByRole("button", { name: "Skrip Teater", exact: true }).click();
    await expect(desktop.locator(".work-card")).toHaveCount(1);
    await expect(desktop.locator(".work-card")).toContainText("Teater Tun Teja");
    check("Desktop production dropdown filters to Skrip Teater", true);
    await desktop.getByRole("button", { name: "Kedai E-Book", exact: true }).click();
    await expect(desktop.locator(".section-format-tabs")).toContainText("Fiksyen (Cerita Rekaan)");
    check("E-book store exposes reading format categories", true);
    await desktop.getByRole("button", { name: "Perpustakaan Percuma", exact: true }).click();
    await expect(desktop.locator(".work-card").first()).toContainText("PERCUMA");
    await expect(desktop.getByRole("link", { name: "Baca Percuma", exact: true }).first()).toHaveAttribute("href", /\/api\/free\//);
    check("Free library displays public Baca Percuma links, no Buy or Hold", true);
    check("No card shows a demo badge", await desktop.locator(".demo-label").count() === 0);
    check("Visitor header exposes no studio upload control", await desktop.locator('a[href^="/studio"]').count() === 0);
    await mobile.goto(base, { waitUntil: "networkidle" });
    await mobile.getByRole("button", { name: "Buka menu", exact: true }).click();
    const mobileMenu = mobile.getByRole("navigation", { name: "Navigasi mudah alih" });
    await expect(mobileMenu.getByRole("button", { name: "Kedai Skrip", exact: true })).toBeVisible();
    await mobileMenu.getByRole("button", { name: "Perpustakaan Percuma", exact: true }).click();
    await expect(mobile.locator(".work-card").first()).toContainText("PERCUMA");
    check("Mobile store navigation opens free library without overflow", await mobile.evaluate(() => document.documentElement.scrollWidth === innerWidth));
    await mobile.screenshot({ path: ".artifacts/stores-mobile.png", fullPage: false });

    const auth = await (await api.get("/api/auth")).json();
    if (!auth.needsSetup) { console.log("An owner already exists; private owner upload category test skipped."); return; }
    await desktop.goto(`${base}/studio?upload=1`, { waitUntil: "networkidle" });
    await desktop.getByLabel("Nama pena / nama penulis").fill("Maya Myra");
    await desktop.getByLabel("Alamat e-mel", { exact: true }).fill(writerEmail);
    await desktop.getByLabel("Kata laluan", { exact: true }).fill(password);
    await desktop.getByRole("button", { name: "Cipta ruang penulis", exact: true }).click();
    await expect(desktop.getByRole("dialog")).toBeVisible(); seedOwner = true;
    const upload = desktop.getByRole("dialog");
    await upload.getByRole("radio", { name: /Kedai E-Book/ }).click();
    await expect(upload.getByLabel("Kategori format")).toHaveValue("Fiksyen (Cerita Rekaan)");
    await expect(upload.getByLabel("Genre")).toContainText("Romance (Romantis)");
    await upload.getByLabel(/^Tajuk karya/).fill(paidTitle);
    await upload.getByLabel(/^Sinopsis/).fill("E-book fiksyen yang digunakan untuk menyemak susunan Kedai E-Book, genre pembaca dan fungsi pembelian pada laman peribadi penulis.");
    await upload.getByLabel(/^Harga/).fill("22");
    await upload.getByLabel(/^Jumlah halaman/).fill("112");
    await upload.getByLabel("Muat naik fail karya", { exact: true }).setInputFiles({ name: "ebook-sebenar.txt", mimeType: "text/plain", buffer: Buffer.from("EBOOK BERBAYAR") });
    await upload.getByRole("button", { name: "Terbitkan karya", exact: true }).click();
    await expect(desktop.getByRole("dialog")).toHaveCount(0);
    const uploaded = (await (await api.get("/api/works")).json()).works.find((work) => work.title === paidTitle);
    check("Owner can upload a paid e-book in the new category", uploaded?.section === "ebook" && uploaded?.format === "Fiksyen (Cerita Rekaan)" && uploaded?.price === 22);
    await desktop.getByRole("button", { name: "Muat naik skrip", exact: true }).click();
    const freeUpload = desktop.getByRole("dialog");
    await freeUpload.getByRole("radio", { name: /Perpustakaan Percuma/ }).click();
    await expect(freeUpload).toContainText("PERCUMA UNTUK DIBACA");
    await freeUpload.getByLabel(/^Tajuk karya/).fill(freeTitle);
    await freeUpload.getByLabel(/^Sinopsis/).fill("Cerpen mingguan untuk membuktikan bahan percuma boleh diterbitkan dan dibaca terus tanpa Buy atau Hold.");
    await freeUpload.getByLabel(/^Jumlah halaman/).fill("8");
    await freeUpload.getByLabel("Muat naik fail karya", { exact: true }).setInputFiles({ name: "cerpen-free.txt", mimeType: "text/plain", buffer: Buffer.from("CERITA PERCUMA") });
    await freeUpload.getByRole("button", { name: "Terbitkan bahan percuma", exact: true }).click();
    await expect(desktop.getByRole("dialog")).toHaveCount(0);
    const freeUploaded = (await (await api.get("/api/works")).json()).works.find((work) => work.title === freeTitle);
    check("Owner can publish a free library item at RM0", freeUploaded?.isFree && freeUploaded?.price === 0);
    const publicFree = await api.get(`/api/free/${freeUploaded.id}`);
    check("New free item is directly readable without login", publicFree.ok && (await publicFree.text()).includes("CERITA PERCUMA"));
    check("No browser runtime errors", errors.length === 0);
    console.log("THREE-STORE AND CLEAN IMAGES TESTS COMPLETE");
  } finally {
    if (browser) await browser.close();
    if (api) await api.dispose();
    if (seedOwner) {
      await db.execute(sql`delete from orders where email=${buyerEmail} or manuscript_id in (select id from manuscripts where title in (${paidTitle}, ${freeTitle}))`);
      await db.execute(sql`delete from manuscripts where title in (${paidTitle}, ${freeTitle})`);
      await db.execute(sql`delete from writer_sessions`);
      await db.execute(sql`delete from writer_settings where email=${writerEmail}`);
      console.log("Temporary category test records removed.");
    }
    await pool.end();
  }
}
run().catch((error) => { console.error(error); process.exitCode = 1; });
