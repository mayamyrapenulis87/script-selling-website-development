import dotenv from "dotenv";
import { chromium, request } from "playwright";
import { expect } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { mkdir } from "node:fs/promises";
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { sql } from "drizzle-orm";

dotenv.config({ quiet: true });
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool);
const base = process.env.NASKAH_TEST_URL || "http://localhost:3000";
const writerEmail = "naskah-test-writer@example.com";
const buyerEmail = "naskah-test-buyer@example.com";
const title = `Langkah Pertama · Ujian ${randomUUID().slice(0, 6)}`;
const password = randomUUID();
const privateMarker = `PRIVATE-SCRIPT-${randomUUID()}`;
let browser, buyerAPI, canCleanup = false;
function check(name, condition) {
  if (!condition) throw new Error(`FAILED: ${name}`);
  console.log(`PASS: ${name}`);
}

async function verify() {
  try {
    await mkdir(".artifacts", { recursive: true });
    browser = await chromium.launch({ headless: true, args: ["--no-sandbox"] });
    const seller = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    const buyer = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    buyerAPI = await request.newContext({ baseURL: base });
    const errors = [];
    seller.on("pageerror", (error) => errors.push(error.message));
    buyer.on("pageerror", (error) => errors.push(error.message));
    const initialAuth = await (await buyerAPI.get("/api/auth")).json();
    check("Fresh writer setup is available (this test never overwrites an existing owner)", initialAuth.needsSetup);
    canCleanup = true;
    await seller.goto(`${base}/studio`, { waitUntil: "networkidle" });
    await seller.getByLabel("Nama pena / nama penulis").fill("Alya Rahman");
    await seller.getByLabel("Alamat e-mel", { exact: true }).fill(writerEmail);
    await seller.getByLabel("Kata laluan", { exact: true }).fill(password);
    await seller.getByRole("button", { name: "Cipta ruang penulis", exact: true }).click();
    await expect(seller.getByRole("heading", { name: "Selamat menulis, Alya." })).toBeVisible();
    check("Protected writer session established", (await (await seller.request.get(`${base}/api/auth`)).json()).authenticated);
    check("A second owner cannot overwrite the account", (await buyerAPI.post("/api/auth", { data: { action: "setup", name: "Other", email: "other@example.com", password } })).status() === 409);
    check("Anonymous studio access denied", (await buyerAPI.get("/api/studio")).status() === 401);
    check("Anonymous manuscript upload denied", (await buyerAPI.post("/api/works", { multipart: { title: "Unauthorized" } })).status() === 401);

    await seller.getByRole("button", { name: "Muat naik skrip", exact: true }).click();
    const uploadDialog = seller.getByRole("dialog");
    await uploadDialog.getByLabel(/^Tajuk naskah/).fill(title);
    await uploadDialog.locator('select[name="format"]').selectOption("Drama bersiri");
    await uploadDialog.getByLabel(/^Sinopsis/).fill("Tiga puluh episod tentang sebuah keluarga yang belajar menerima perubahan, menyelesaikan konflik dan menemukan kembali makna pulang.");
    await uploadDialog.getByLabel(/^Pratonton skrip/).fill("FADE IN:\nINT. RUMAH — PAGI\nSebuah keluarga berkumpul.");
    await uploadDialog.getByLabel(/^Harga \(RM\)/).fill("8900");
    await uploadDialog.getByLabel(/^Jumlah halaman/).fill("900");
    await uploadDialog.getByLabel(/^Durasi/).fill("45");
    await uploadDialog.getByLabel(/^Jumlah episod/).fill("30");
    await uploadDialog.getByLabel("Muat naik fail skrip", { exact: true }).setInputFiles({ name: "ujian-30-episod.txt", mimeType: "text/plain", buffer: Buffer.from(`NASKAH DRAMA 30 EPISOD\n${privateMarker}\nEPISOD 1 — HALAMAN PERTAMA`) });
    await uploadDialog.getByRole("button", { name: "Terbitkan naskah", exact: true }).click();
    await expect(seller.getByRole("dialog")).toHaveCount(0);
    await expect(seller.locator(".table-work").filter({ hasText: title })).toBeVisible();
    const catalog = await (await buyerAPI.get("/api/works")).json();
    const uploaded = catalog.works.find((work) => work.title === title);
    const workId = uploaded.id;
    check("Uploaded 30-episode script persisted", uploaded.episodes === 30 && uploaded.pages === 900 && uploaded.price === 8900 && uploaded.hasFile);
    check("Private file content absent from catalog", !JSON.stringify(catalog).includes(privateMarker) && !("fileData" in uploaded));
    check("Anonymous original-file download denied", (await buyerAPI.get(`/api/works/${workId}/file`)).status() === 401);
    const original = await seller.request.get(`${base}/api/works/${workId}/file`);
    check("Writer can download the original upload", original.status() === 200 && (await original.text()).includes(privateMarker));
    await seller.screenshot({ path: ".artifacts/studio.png" });

    await buyer.goto(base, { waitUntil: "networkidle" });
    await buyer.getByRole("textbox", { name: "Cari naskah" }).fill(title);
    await buyer.locator(".work-card").getByRole("button", { name: "Buy", exact: true }).click();
    const buyDialog = buyer.getByRole("dialog");
    await buyDialog.getByLabel(/^Nama penuh/).fill("Pembeli Ujian");
    await buyDialog.getByLabel(/^Alamat e-mel/).fill(buyerEmail);
    await buyDialog.getByLabel(/^Nombor telefon/).fill("0123456789");
    await buyDialog.getByLabel(/^Nota kepada penulis/).fill("Ujian pembelian untuk drama 30 episod.");
    await buyDialog.locator(".checkbox-field input").check();
    await buyDialog.getByRole("button", { name: "Hantar permintaan Buy", exact: true }).click();
    await expect(buyer.getByText("Terima kasih atas minat anda.")).toBeVisible();
    const orderPath = await buyer.getByRole("link", { name: "Lihat status pesanan" }).getAttribute("href");
    const token = orderPath.split("/").pop();
    check("Buy creates a private tracking link", Boolean(token));
    check("Pending script download is blocked", (await buyerAPI.get(`/api/download/${token}`)).status() === 403);
    check("Reserved script rejects a second buyer", (await buyerAPI.post("/api/orders", { data: { manuscriptId: workId, type: "hold", name: "Pembeli Kedua", email: buyerEmail } })).status() === 409);
    const before = (await db.execute(sql`select reserved_until from manuscripts where id=${workId}`)).rows[0].reserved_until;
    const edit = await seller.request.patch(`${base}/api/works/${workId}`, { multipart: { title, format: "Drama bersiri", genre: "Drama", synopsis: `${uploaded.synopsis} Nota suntingan penulis.`, excerpt: uploaded.excerpt, price: "8900", pages: "900", episodes: "30", duration: "45", status: "hold", image: "/images/senja.jpg", featured: "false" } });
    check("Editing a reserved script succeeds", edit.status() === 200);
    const after = (await db.execute(sql`select reserved_until from manuscripts where id=${workId}`)).rows[0].reserved_until;
    check("Editing preserves the buyer reservation expiry", new Date(before).getTime() === new Date(after).getTime());
    await buyer.getByRole("link", { name: "Lihat status pesanan" }).click();
    await expect(buyer.getByRole("heading", { name: "Cerita anda sedang ditempah." })).toBeVisible();

    await seller.reload({ waitUntil: "networkidle" });
    await seller.getByRole("button", { name: /Permintaan pembeli/ }).click();
    const requestCard = seller.locator(".request-card").filter({ hasText: title });
    await requestCard.getByRole("button", { name: "Sahkan jualan", exact: true }).click();
    await seller.getByRole("dialog").getByRole("button", { name: "Sahkan jualan", exact: true }).click();
    await expect(seller.getByRole("dialog")).toHaveCount(0);
    await expect(seller.locator(".request-card").filter({ hasText: title }).locator(".request-state")).toHaveText("Selesai");
    await buyer.getByRole("button", { name: "Semak status", exact: true }).click();
    await expect(buyer.getByRole("heading", { name: "Naskah anda sedia dimuat turun." })).toBeVisible();
    const delivered = await buyerAPI.get(`/api/download/${token}`);
    check("Confirmed sale unlocks the original script download", delivered.status() === 200 && (await delivered.text()).includes(privateMarker));
    check("Download has an attachment filename", delivered.headers()["content-disposition"].includes("ujian-30-episod.txt"));
    await buyer.screenshot({ path: ".artifacts/order.png" });

    const raceBody = { manuscriptId: "kopi-kamu-dan-aku", type: "hold", name: "Ujian Serentak", email: buyerEmail };
    const race = await Promise.all([buyerAPI.post("/api/orders", { data: raceBody }), buyerAPI.post("/api/orders", { data: raceBody })]);
    check("Concurrent Hold requests have exactly one winner", JSON.stringify(race.map((response) => response.status()).sort()) === "[201,409]");
    await seller.request.patch(`${base}/api/works/kopi-kamu-dan-aku`, { data: { status: "available" } });
    const expiredResponse = await buyerAPI.post("/api/orders", { data: { manuscriptId: "surat-untuk-esok", type: "hold", name: "Ujian Luput", email: buyerEmail } });
    const expiryOrder = await expiredResponse.json();
    check("Hold creates a 48-hour reservation", expiredResponse.status() === 201 && new Date(expiryOrder.expiresAt).getTime() > Date.now() + 47 * 3600000);
    const past = new Date(Date.now() - 60000);
    await db.execute(sql`update manuscripts set reserved_until=${past} where id='surat-untuk-esok'`);
    await db.execute(sql`update orders set expires_at=${past} where access_token=${expiryOrder.accessToken}`);
    const expiredCatalog = await (await buyerAPI.get("/api/works")).json();
    check("Expired Hold automatically releases the script", expiredCatalog.works.find((work) => work.id === "surat-untuk-esok").status === "available");
    check("Expired order is marked correctly", (await db.execute(sql`select status from orders where access_token=${expiryOrder.accessToken}`)).rows[0].status === "expired");
    check("Invalid newsletter email is rejected", (await buyerAPI.post("/api/newsletter", { data: { email: "invalid" } })).status() === 400);
    await buyerAPI.post("/api/newsletter", { data: { email: "naskah-test-newsletter@example.com" } });
    await buyerAPI.post("/api/newsletter", { data: { email: "naskah-test-newsletter@example.com" } });
    check("Newsletter signup is persisted without duplicates", Number((await db.execute(sql`select count(*) as total from subscriptions where email='naskah-test-newsletter@example.com'`)).rows[0].total) === 1);
    check("Sold script can be archived", (await seller.request.delete(`${base}/api/works/${workId}`)).status() === 200);
    check("Archiving preserves buyer delivery access", (await buyerAPI.get(`/api/download/${token}`)).status() === 200);

    await seller.getByRole("button", { name: "Log keluar", exact: true }).click();
    await expect(seller.getByRole("heading", { name: "Selamat kembali, penulis." })).toBeVisible();
    check("Logout revokes writer access", (await seller.request.get(`${base}/api/studio`)).status() === 401);
    check("Incorrect password is rejected", (await buyerAPI.post("/api/auth", { data: { action: "login", password: "wrong-password" } })).status() === 401);
    await seller.getByLabel("Kata laluan", { exact: true }).fill(password);
    await seller.getByRole("button", { name: "Log masuk", exact: true }).click();
    await expect(seller.getByRole("heading", { name: "Selamat menulis, Alya." })).toBeVisible();
    check("Writer can sign back in", true);
    check("No browser runtime errors", errors.length === 0);
    console.log("FULLSTACK TESTS COMPLETE");
  } finally {
    if (browser) await browser.close();
    if (buyerAPI) await buyerAPI.dispose();
    if (canCleanup) {
      await db.execute(sql`delete from orders where email=${buyerEmail} or manuscript_id in (select id from manuscripts where title=${title})`);
      await db.execute(sql`delete from manuscripts where title=${title}`);
      await db.execute(sql`update manuscripts set status='available', reserved_until=null where id in ('kopi-kamu-dan-aku','surat-untuk-esok')`);
      await db.execute(sql`delete from subscriptions where email='naskah-test-newsletter@example.com'`);
      const own = (await db.execute(sql`select id from writer_settings where email=${writerEmail}`)).rows;
      if (own.length) {
        await db.execute(sql`delete from writer_sessions`);
        await db.execute(sql`delete from writer_settings where email=${writerEmail}`);
      }
      console.log("Temporary test records cleaned; writer setup is ready.");
    }
    await pool.end();
  }
}
verify().catch((error) => { console.error(error); process.exitCode = 1; });
