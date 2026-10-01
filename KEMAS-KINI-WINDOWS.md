# Kemas kini Maya Myra Stories — Windows + GitHub Desktop

Website ini boleh dikemas kini pada repository dan projek Vercel yang sama. Tidak perlu mencipta repository, projek Vercel atau database Neon baharu.

Panduan ini tidak memindahkan data database dan tidak mengubah akaun Vercel atau GitHub anda secara automatik.

## 1. Cari folder repository yang sebenar

1. Buka GitHub Desktop.
2. Pilih repository yang disambungkan kepada projek Vercel anda. Nama repository boleh masih `script-selling-website-development` walaupun projek Vercel telah dinamakan `mayamyrastories`.
3. Pastikan Current branch ialah `main`, atau branch produksi yang anda gunakan di Vercel.
4. Klik Fetch origin. Jika Pull origin muncul, tarik perubahan sebelum menyalin fail baharu.
5. Pilih Repository → Show in Explorer. Gunakan folder yang dibuka ini; jangan teka lokasi folder repository.
6. Buat salinan sandaran folder projek jika anda pernah menyunting kod secara manual. Semak perubahan setempat sebelum menggantikannya.

## 2. Extract ZIP kemas kini

1. Muat turun `naskah-maya-update.zip` yang disediakan melalui pautan muat turun aplikasi.
2. Dalam Windows File Explorer, klik kanan ZIP → Extract All.
3. Buka folder hasil extract. Pastikan anda nampak `src`, `public`, `scripts` dan `package.json`.
4. Buka `public/images`. Pakej sepatutnya mengandungi fail kulit seperti `tun-teja.jpg`, `kota-menunggu.jpg`, `dua-senja.jpg` dan `gerabak-3.jpg`.
5. Buka `public/fonts`. Font tempatan juga termasuk dalam pakej.

Pakej kemas kini dibuat secara khusus supaya gambar dan font tidak tertinggal. Ia bukan salinan database Neon atau fail peribadi yang dimuat naik melalui Ruang Penulis.

## 3. Salin kandungan pakej, bukan folder luarnya

1. Dalam folder hasil extract yang mempunyai `package.json`, pilih kandungannya.
2. Copy, kemudian Paste ke folder repository daripada langkah 1.
3. Apabila Windows bertanya, pilih Replace the files in the destination.
4. Windows akan menggabungkan folder seperti `src` dan `public`; jangan memadam seluruh folder repository dahulu.
5. Selepas menyalin, `package.json` mesti kekal di aras teratas repository, dengan `src` dan `public` di sebelahnya.

Jangan letakkan folder tambahan seperti `repository/naskah-maya-update/src`.

**Jangan padam atau gantikan `.git`, `.env`, `.env.local` atau tetapan rahsia anda.** ZIP kemas kini tidak memasukkan fail-fail ini. `.gitignore` yang dibekalkan menghalang rahsia dan fail build baharu daripada dimasukkan ke GitHub. Ia tidak mengeluarkan rahsia yang sudah pernah di-commit; jika itu berlaku, padam daripada repository dan tukar kata laluan/token yang terdedah.

## 4. Commit dan Push

1. Kembali ke GitHub Desktop → Changes.
2. Semak senarai fail berubah. Pastikan imej dalam `public/images` dan font dalam `public/fonts` turut muncul jika belum ada di repository.
3. Jangan commit `.env` atau fail skrip penuh pelanggan. Fail jualan dimuat naik melalui Ruang Penulis, bukan ke GitHub.
4. Taip Summary, contohnya: `Kemas kini koleksi, gambar dan susunan kedai`.
5. Klik Commit to main.
6. Klik Push origin. Commit sahaja belum menghantar perubahan ke GitHub.

Jika tiada perubahan muncul, semak bahawa anda menyalin ke folder daripada Show in Explorer, bukan folder Downloads atau folder ZIP. Jika fail binari masih tidak muncul, pastikan ia ada di folder repository sebelum push.

## 5. Tunggu deployment baharu

1. Buka projek Vercel anda → Deployments.
2. Deployment baharu sepatutnya menunjukkan mesej commit yang baru dihantar.
3. Tunggu status Ready. Jangan bergantung kepada deployment Initial commit yang lama.
4. Buka alamat di bawah Domains, bukan alamat dashboard `vercel.com/...` atau pautan preview terlindung.
5. Refresh menggunakan Ctrl + F5 atau uji dalam Incognito.
6. Semak gambar, kategori dan paparan pelawat. Login pemilik kekal melalui `/studio`.

Jika build gagal, baca Build Logs. Jangan buang database atau membuat projek baharu untuk menyelesaikan ralat build.

## Database, akaun dan karya sedia ada

- Kekalkan nilai `DATABASE_URL` yang sedia ada di Vercel. Jangan gantikan dengan alamat `localhost` dalam fail konfigurasi pembangunan.
- Jangan Reset, Drop atau Delete database Neon.
- ZIP ialah kod dan aset website. Akaun, pesanan dan fail yang diupload disimpan dalam database, bukan dalam ZIP.
- Jika versi akan datang menambah jadual atau lajur, schema perlu dikemas kini dengan langkah migrasi yang sesuai. Menyalin kod sahaja tidak semestinya mengubah schema database luaran.
- Simpan salinan asal skrip/manuskrip anda. Kulit dan sinopsis katalog bukan pengganti karya penuh yang anda perlu sediakan sebelum menjual.

## Membina pakej dengan gambar dan font

Pemaju boleh menjalankan `python scripts/export-update.py` dari folder projek. Skrip menggunakan Python standard library, memasukkan fail sumber dan aset dengan struktur asal, dan tidak memasukkan rahsia, `.git`, dependencies atau build output.

## Rujukan rasmi

- GitHub Desktop Commit dan Push: https://docs.github.com/en/desktop/making-changes-in-a-branch/committing-and-reviewing-changes-to-your-project-in-github-desktop
- Deployment Git di Vercel: https://vercel.com/docs/git
