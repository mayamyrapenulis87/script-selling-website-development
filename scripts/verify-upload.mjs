import dotenv from "dotenv";
import { chromium, request } from "playwright";
import { expect } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { mkdir } from "node:fs/promises";
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { sql } from "drizzle-orm";

dotenv.config({ quiet: true });
const base = process.env.NASKAH_TEST_URL || "http://localhost:3000";
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool);
const suffix = randomUUID().slice(0, 8);
const writerEmail = `upload-owner-${suffix}@example.com`;
const buyerEmail = `upload-buyer-${suffix}@example.com`;
const title = `Skrip Upload Ujian ${suffix}`;
const marker = `PRIVATE-SCRIPT-${randomUUID()}`;
const password = randomUUID();
let browser, anonymous, createdOwner = false, before = [];
function check(label, result) { if (!result) throw new Error(`FAILED: ${label}`); console.log(`PASS: ${label}`); }

async function verify() {
  try {
    await mkdir(".artifacts", { recursive: true });
    anonymous = await request.newContext({ baseURL: base });
    const initialCatalog = (await (await anonymous.get("/api/works")).json()).works;
    check("Example works are marked explicitly", initialCatalog.some((work) => work.isDemo));
    check("Anonymous bulk archive is denied", (await anonymous.delete("/api/studio/examples")).status() === 401);
    browser = await chromium.launch({ headless: true, args: ["--no-sandbox"] });
    const owner = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    const buyer = await browser.newPage({ viewport: { width: 1280, height: 950 } });
    const mobile = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    const errors = [];
    for (const page of [owner, buyer, mobile]) page.on("pageerror", (error) => errors.push(error.message));
    await owner.goto(base, { waitUntil: "networkidle" });
    await owner.evaluate(() => document.fonts.ready);
    await owner.screenshot({ path: ".artifacts/upload-home.png" });
    await expect(owner.locator(".header-actions .writer-link")).toHaveText("Upload skrip");
    await expect(owner.locator(".header-actions .writer-link")).toHaveAttribute("href", "/studio?upload=1");
    check("Direct upload entry is visible on the catalog", true);
    await mobile.goto(base, { waitUntil: "networkidle" });
    check("Upload entry remains visible on phones", await mobile.locator(".header-actions .writer-link").isVisible());
    check("Phone catalog has no horizontal overflow", await mobile.evaluate(() => document.documentElement.scrollWidth === innerWidth));
    await mobile.locator(".header-actions .writer-link").click();
    await expect(mobile.locator(".writer-onboarding")).toBeVisible();
    check("Phone upload onboarding fits the screen", await mobile.evaluate(() => document.documentElement.scrollWidth === innerWidth));
    await mobile.screenshot({ path: ".artifacts/upload-mobile.png" });
    const auth = await (await anonymous.get("/api/auth")).json();
    if (!auth.needsSetup) { console.log("An owner already exists; private upload tests skipped without altering the account."); return; }
    before = (await db.execute(sql`select id, author, active from manuscripts`)).rows;
    await owner.locator(".header-actions .writer-link").click();
    await expect(owner.getByLabel("Nama pena / nama penulis")).toHaveValue("Maya Myra");
    await owner.getByLabel("Alamat e-mel", { exact: true }).fill(writerEmail);
    await owner.getByLabel("Kata laluan", { exact: true }).fill(password);
    await owner.getByRole("button", { name: "Cipta ruang penulis", exact: true }).click();
    await expect(owner.getByRole("dialog")).toBeVisible();
    createdOwner = true;
    check("Creating an account from Upload opens the file form automatically", true);
    const dialog = owner.getByRole("dialog");
    await dialog.getByLabel(/^Tajuk naskah/).fill(title);
    await dialog.getByLabel("Format karya", { exact: true }).selectOption("Drama bersiri");
    await dialog.getByLabel(/^Sinopsis/).fill("Drama tiga puluh episod tentang keluarga yang menyusun kembali kehidupan mereka setelah sebuah rahsia terungkap. Ini data sementara untuk ujian.");
    await dialog.getByLabel(/^Pratonton skrip/).fill("EPISOD 1\n\nINT. RUMAH — PAGI\n\nSebuah pintu terbuka.");
    await dialog.getByLabel(/^Harga \(RM\)/).fill("6800");
    await dialog.getByLabel(/^Jumlah halaman/).fill("800");
    await dialog.getByLabel(/^Jumlah episod/).fill("30");
    await dialog.getByLabel(/^Durasi/).fill("45");
    await dialog.getByLabel("Tempoh Hold", { exact: true }).selectOption("12");
    await dialog.getByLabel("Muat naik fail skrip", { exact: true }).setInputFiles({ name: "skrip.exe", mimeType: "application/octet-stream", buffer: Buffer.from("invalid") });
    await expect(dialog.getByRole("alert")).toContainText("Pilih fail PDF");
    check("Unsupported script extensions are rejected before upload", true);
    const file = Buffer.from(`%PDF-1.4\n% ${marker}\n1 0 obj\n<< /Type /Catalog >>\nendobj\n%%EOF`);
    await dialog.getByLabel("Muat naik fail skrip", { exact: true }).setInputFiles({ name: "skrip-30-episod.pdf", mimeType: "application/pdf", buffer: file });
    await expect(dialog.locator(".file-dropzone")).toContainText("skrip-30-episod.pdf");
    await dialog.getByRole("button", { name: "Terbitkan naskah", exact: true }).click();
    await expect(owner.getByRole("dialog")).toHaveCount(0);
    await expect(owner.locator(".published-notice")).toContainText(title);
    await expect(owner.getByRole("link", { name: "Lihat karya saya" })).toBeVisible();
    check("Upload success shows a real work link", true);
    const uploadedCatalog = (await (await anonymous.get("/api/works")).json()).works;
    const uploaded = uploadedCatalog.find((work) => work.title === title);
    check("Uploaded PDF is stored with 30 episodes and 12-hour Hold", uploaded && uploaded.hasFile && !uploaded.isDemo && uploaded.episodes === 30 && uploaded.holdHours === 12);
    check("Genuine upload precedes demonstration works", uploadedCatalog[0].id === uploaded.id);
    check("Public catalog never exposes the PDF", !JSON.stringify(uploadedCatalog).includes(marker));
    const original = await owner.request.get(`${base}/api/works/${uploaded.id}/file`);
    check("Owner receives the exact original PDF", original.status() === 200 && Buffer.compare(await original.body(), file) === 0);
    check("Anonymous visitors cannot download the owner's PDF", (await anonymous.get(`/api/works/${uploaded.id}/file`)).status() === 401);
    await owner.screenshot({ path: ".artifacts/upload-studio.png" });

    await buyer.goto(`${base}/karya/${uploaded.id}`, { waitUntil: "networkidle" });
    await expect(buyer.getByRole("button", { name: "Buy", exact: true })).toBeVisible();
    await expect(buyer.getByRole("button", { name: "Hold", exact: true })).toBeVisible();
    check("Buy and Hold are immediately available on the uploaded script", true);
    await buyer.getByRole("button", { name: "Hold", exact: true }).click();
    const holdForm = buyer.getByRole("dialog");
    await expect(holdForm).toContainText("12 jam");
    await holdForm.getByLabel(/^Nama penuh/).fill("Pembeli Upload Ujian");
    await holdForm.getByLabel(/^Alamat e-mel/).fill(buyerEmail);
    await holdForm.locator(".checkbox-field input").check();
    await holdForm.getByRole("button", { name: "Hantar permintaan Hold", exact: true }).click();
    await expect(buyer.getByText("Terima kasih atas minat anda.")).toBeVisible();
    const orderPath = await buyer.getByRole("link", { name: "Lihat status pesanan" }).getAttribute("href");
    const token = orderPath.split("/").pop();
    check("Held PDF remains protected", (await anonymous.get(`/api/download/${token}`)).status() === 403);
    await owner.getByRole("button", { name: "Semak permintaan terkini" }).click();
    await owner.getByRole("button", { name: /Permintaan pembeli/ }).click();
    const orderCard = owner.locator(".request-card").filter({ hasText: title });
    await expect(orderCard).toBeVisible();
    check("Buy/Hold request reaches the author's dashboard", true);
    await orderCard.getByRole("button", { name: "Sahkan jualan", exact: true }).click();
    await owner.getByRole("dialog").getByRole("button", { name: "Sahkan jualan", exact: true }).click();
    await expect(owner.getByRole("dialog")).toHaveCount(0);
    await expect(owner.locator(".request-card").filter({ hasText: title }).locator(".request-state")).toHaveText("Selesai");
    await buyer.goto(`${base}/karya/${uploaded.id}`, { waitUntil: "networkidle" });
    await expect(buyer.getByRole("button", { name: "Sold Out", exact: true })).toBeDisabled();
    check("Confirmed sale changes the public script to Sold Out", true);
    const delivered = await anonymous.get(`/api/download/${token}`);
    check("Confirmed buyer can download the exact original PDF", delivered.status() === 200 && Buffer.compare(await delivered.body(), file) === 0);
    check("Buyer download uses attachment delivery", delivered.headers()["content-disposition"].includes("skrip-30-episod.pdf"));

    const sample = initialCatalog.find((work) => work.isDemo && work.status === "available");
    if (sample) {
      const sampleResponse = await anonymous.post("/api/orders", { data: { manuscriptId: sample.id, type: "hold", name: "Ujian Contoh", email: buyerEmail } });
      check("Sample reservation can still be tested", sampleResponse.status() === 201);
      const sampleOrder = await sampleResponse.json();
      check("Bulk hide prevents loss of an active reservation", (await owner.request.delete(`${base}/api/studio/examples`)).status() === 409);
      const requests = (await (await owner.request.get(`${base}/api/studio`)).json()).orders;
      const found = requests.find((item) => item.accessToken === sampleOrder.accessToken);
      await owner.request.patch(`${base}/api/orders/${found.id}`, { data: { action: "cancel" } });
    }
    await owner.getByRole("button", { name: /Karya saya/ }).click();
    await owner.getByRole("button", { name: "Sorok karya contoh", exact: true }).click();
    await owner.getByRole("dialog").getByRole("button", { name: "Sorok karya contoh", exact: true }).click();
    await expect(owner.getByRole("dialog")).toHaveCount(0);
    const cleanCatalog = (await (await anonymous.get("/api/works")).json()).works;
    check("Bulk hide removes only demonstration works", cleanCatalog.every((work) => !work.isDemo) && cleanCatalog.some((work) => work.id === uploaded.id));
    check("Removing demos preserves paid PDF delivery", (await anonymous.get(`/api/download/${token}`)).status() === 200);
    check("No browser runtime errors", errors.length === 0);
    console.log("DIRECT UPLOAD TESTS COMPLETE");
  } finally {
    if (browser) await browser.close();
    if (anonymous) await anonymous.dispose();
    const matchingOwner = (await db.execute(sql`select id from writer_settings where email=${writerEmail}`)).rows;
    if (matchingOwner.length) {
      await db.execute(sql`delete from orders where email=${buyerEmail} or manuscript_id in (select id from manuscripts where title=${title})`);
      await db.execute(sql`delete from manuscripts where title=${title}`);
      for (const record of before) await db.execute(sql`update manuscripts set author=${record.author}, active=${record.active} where id=${record.id}`);
      await db.execute(sql`delete from writer_sessions`);
      await db.execute(sql`delete from writer_settings where email=${writerEmail}`);
      console.log("Temporary tests removed; original collection restored and owner setup available.");
    }
    await pool.end();
  }
}
verify().catch((error) => { console.error(error); process.exitCode = 1; });
