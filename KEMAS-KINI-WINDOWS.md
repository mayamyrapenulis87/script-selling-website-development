# Kemas kini Maya Myra Stories — Windows + GitHub Desktop

Website dikemas kini pada repository GitHub dan projek Vercel yang sama. Anda tidak perlu mencipta repository, projek Vercel atau database Neon baharu.

## 1. Buka folder repository yang betul
1. Buka GitHub Desktop dan pilih repository yang disambungkan kepada projek Vercel.
2. Pastikan branch produksi, biasanya `main`, dipilih.
3. Klik **Fetch origin**. Jika **Pull origin** muncul, tarik perubahan dahulu.
4. Pilih **Repository → Show in Explorer**. Gunakan folder yang dibuka itu.
5. Buat salinan sandaran folder projek. Jika anda ada suntingan sendiri, jangan ganti fail tersebut sebelum disalin ke tempat selamat.

## 2. Extract dan ganti fail
1. Muat turun `naskah-maya-update.zip`, klik kanan dan pilih **Extract All**.
2. Buka folder hasil extract. Pastikan `package.json`, `src`, `public`, dan `KEMAS-KINI-WINDOWS.md` kelihatan.
3. Salin **kandungan** folder hasil extract ke folder repository daripada langkah 1.
4. Jika Windows bertanya, pilih **Replace the files in the destination**. Folder `public/images` dan `public/fonts` akan digabungkan bersama fail baharu.
5. Pastikan `package.json`, `src`, dan `public` berada terus di dalam folder repository — bukan tersarang satu folder tambahan.

**Jangan padam `.git`, `.env`, atau `.env.local`. Jangan masukkan fail rahsia ke GitHub.** ZIP ini tidak membawa `.env`, database Neon, atau skrip peribadi yang pernah anda upload melalui website.

## 3. Commit dan Push
1. Kembali ke GitHub Desktop. Semak **Changes**.
2. Pastikan fail kulit di `public/images/` dan font di `public/fonts/` termasuk dalam perubahan.
3. Taip ringkasan, contohnya `Kemas kini kedai Maya Myra Stories dan 12 kulit karya`.
4. Klik **Commit to main**.
5. Klik **Push origin**. Commit sahaja belum menghantar fail ke GitHub.

## 4. Semak Vercel
1. Buka projek Vercel → **Deployments**.
2. Tunggu deployment baharu daripada commit anda berstatus **Ready**.
3. Buka domain produksi di bawah **Domains**. Jangan guna URL dashboard, URL preview, atau deployment URL sementara.
4. Uji dalam Incognito atau tekan **Ctrl + F5**.
5. Pastikan Kedai Skrip, Kedai E-Book, Perpustakaan Percuma dan semua kulit kelihatan.

Jika deployment gagal, buka **Build Logs** sebelum cuba semula. Jangan delete/reset projek Neon atau database.

## Tukar alamat kepada mayamyrastories.vercel.app
1. Buka projek Vercel, pilih **Settings → General**.
2. Dalam medan **Project Name**, taip `mayamyrastories` (huruf kecil sahaja) dan klik **Save**.
3. Tunggu satu deployment baharu berstatus **Ready**, kemudian buka `https://mayamyrastories.vercel.app`.

Nama lama `script-selling-website-development.vercel.app` **tidak dijamin** terus berfungsi selepas rename. Guna nama baharu dalam setiap promosi. If `mayamyrastories.vercel.app` sudah digunakan oleh orang lain, Vercel akan menolak; pilih variasi seperti `mayamyrastories-maya.vercel.app` dan kemas kini pautan promosi anda.

GitHub, auto-deploy, dan database Neon kekal seperti biasa kerana ia terikat kepada Project ID, bukan nama. Jika ada **Environment Variables** yang menyimpan alamat lama, kemas kini ia secara manual di **Settings → Environment Variables**, kemudian redeploy.

## Database dan fail penulis
- Kekalkan `DATABASE_URL` sedia ada dalam **Vercel → Settings → Environment Variables**.
- Jangan tukar URL produksi kepada `localhost`.
- Repository/ZIP membawa kod dan imej katalog. Ia **tidak** membawa pesanan, akaun, atau fail karya penuh dalam database.
- Simpan salinan asal manuskrip dan skrip anda sendiri.

## Bina ZIP baharu kemudian
Di folder projek, jalankan:

```text
python scripts/export-update.py
```

ZIP baharu akan terhasil di `public/downloads/naskah-maya-update.zip`. Pembungkus ini memastikan semua kulit dan font dimasukkan tetapi mengecualikan rahsia serta data muat naik peribadi.
