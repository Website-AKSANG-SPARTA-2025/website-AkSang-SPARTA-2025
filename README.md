# Web Aksang STEI-K 2025 (Namanya belum dibuat)

## 1. Ringkasan & Tujuan

Repositori ini memuat kode sumber untuk platform Web Aksang SPARTA. Sistem ini dirancang khusus untuk menangani acara dengan masa hidup singkat dan lalu lintas tinggi, berfokus pada pendaftaran peserta dan pengumpulan tugas tanpa membebani sistem dengan manajemen akun pengguna.

Sistem dirancang untuk:
* Menerima data RSVP dari user melalui browser.
* Melakukan validasi payload sebelum data diproses.
* Menyimpan data RSVP ke PostgreSQL.
* Mencegah data duplikat jika diperlukan.
* Memberikan HTTP response yang konsisten.

---

## 2. Arsitektur & Tech Stack

Aplikasi ini menggunakan pendekatan arsitektur monolitik yang memanfaatkan Next.js sebagai penggerak utama *frontend* maupun *backend*.

### Framework Frontend: Next.js + TailwindCSS
* **Public landing page:** Next.js menangani SSR/SSG dengan sangat baik, sehingga halaman ini dimuat dengan cepat dan ramah SEO jika ingin mudah ditemukan di mesin pencari.
* **Forms (RSVP):** Menggunakan *Server Actions* (App Router) yang memungkinkan penanganan pengiriman formulir tanpa harus membuat lapisan API terpisah, sehingga menjaga kode tetap sederhana untuk tim kecil.
* **Dashboard:** Model komponen React sangat cocok untuk membangun tabel data, filter, dan tampilan statistik yang dibutuhkan pada dasbor panitia.
* **Fitur Kelas/Workshop:** Menggunakan pendekatan yang sama dengan dasbor; murni mengandalkan operasi CRUD/UI tambahan di atas fondasi yang sudah dibangun.
* **Tailwind:** Sangat cocok digunakan untuk halaman publik maupun dasbor admin; kelas utilitasnya (*utility classes*) memudahkan pembagian tugas desain/styling (CSS) kepada beberapa orang sekaligus tanpa takut terjadi tabrakan kode.

### Backend & Infrastruktur Data
* **API Layer:** Next.js Route Handler menerima HTTP request dan mengembalikan response.
* **Validasi:** Zod digunakan untuk memvalidasi struktur dan isi request secara ketat (misalnya format *email* dan nama).
* **ORM:** Prisma menjadi abstraksi akses database dan query, serta menangani *schema*, *migration*, operasi CRUD, dan relasi secara *type-safe*.
* **Database Utama:** Supabase digunakan sebagai *cloud database provider* untuk *hosting* dan pengelolaan PostgreSQL. 
* **Penyimpanan File:** Cloudflare R2 digunakan sebagai tempat penyimpanan objek (*object storage*) untuk fail tugas atau PDF yang diunggah peserta.

---

## 3. Fitur Utama

* **Landing Page Statis:** Website berfokus pada kecepatan dan performa; tidak menggunakan sistem animasi berat.
* **Tanpa Sistem Akun:** Tidak ada *database username*, tidak ada penyimpanan *password*, dan tidak ada fitur "Lupa Sandi".
* **Validasi OTP:** Pengiriman form (RSVP & Workshop) membutuhkan *email* aktif. Sistem akan mengirimkan *One-Time Password* (OTP) ke *email* pendaftar untuk validasi sebelum data dimasukkan ke *database*.
* **RSVP (Dinamis):** Mengambil data Nama, Email, dan (jika dari ITB) NIM & Jurusan.
* **Pendaftaran Workshop (Terbatas):** Mendaur ulang form RSVP dengan tambahan nomor WhatsApp. Terdapat sistem pembatasan kuota; jika jumlah peserta di *database* mencapai batas maksimal, form akan otomatis tertutup.
* **Pengumpulan Tugas Terproteksi Email:** Peserta mengumpulkan tugas langsung menggunakan *email* mereka (yang terdaftar di workshop) sebagai alat verifikasi. File akan masuk ke Cloudflare R2 dan tautannya (*link*) disimpan ke dalam Supabase.

---

## 4. Alur Perjalanan Peserta (User Flow)

### Skenario A: Peserta Mengisi RSVP
1. **Mulai:** Peserta membuka halaman utama (Home Screen).
2. **Klik Aksi:** Peserta membaca info acara dan menekan tombol yang akan mengarahkannya ke rute `/rsvp`.
3. **Isi Data:** Pes erta diminta mengisi Nama Lengkap, Email, serta NIM dan Jurusan (jika mahasiswa ITB).
4. **Validasi:** Layar menampilkan *pop-up* pengisian OTP. Peserta mengecek *email* mereka untuk mendapatkan kode OTP.
5. **Selesai:** Jika kode salah, sistem meminta input ulang. Jika valid, sistem menampilkan notifikasi sukses dan *database* (Supabase) akan merekam data tersebut.

### Skenario B: Peserta Mengisi Pendaftaran Workshop
1. **Mulai:** Peserta dari halaman utama diarahkan ke rute `/workshop` untuk membaca info *competitive path* (CP, BCC, CTF).
2. **Klik Aksi:** Peserta menekan tombol registrasi menuju `/workshop/pendaftaran`. *(Catatan: Sistem akan mengecek batas peserta terlebih dahulu. Jika penuh, tombol akan menampilkan "Mohon maaf, kuota pendaftaran workshop telah penuh" dan formulir dimatikan).*
3. **Isi Data:** Peserta mengisi form identitas (serupa dengan RSVP) ditambah **Nomor WhatsApp aktif**.
4. **Validasi:** Peserta melakukan validasi via OTP yang dikirim ke *email*.
5. **Selesai:** Setelah tervalidasi, data direkam ke Supabase. Tautan (*link*) komunitas WhatsApp kemudian akan dikirimkan ke nomor WA masing-masing peserta.

### Skenario C: Peserta Mengumpulkan Tugas Workshop
1. **Mulai:** Peserta membuka rute `/tugas` untuk membaca instruksi dan melihat kotak pengumpulan tugas.
2. **Isi Data:** Peserta diminta memasukkan *email* (yang sudah didaftarkan pada tahap registrasi workshop), memilih *competitive path* dari menu *drop-down*, dan melampirkan *file* tugas.
3. **Validasi Sistem:**
   * Jika *email* **belum terdaftar**, layar memunculkan pesan penolakan dan pengiriman dibatalkan.
   * Jika *email* **terdaftar**, proses berlanjut.
4. **Selesai:** Sistem mengunggah *file* ke sistem penyimpanan (Cloudflare R2), lalu menyimpan tautan (*link*) *file* tersebut ke dalam *database* (Supabase) yang tersambung dengan nama peserta. Layar menampilkan pesan "Tugas berhasil dikumpulkan".

---

# How to Start

Bagi baru mulai, lakukan ini di device kalian:

1. Buka terminal (Command Prompt) di folder proyek ini.
2. Unduh semua alat bantu yang diperlukan dengan mengetik:

   ```
   npm install
   npm run dev
   ```

3. Buka browser pilihan dan ketik ini di browser http://localhost:3000

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

---

## Project Structure

```
├── .next/                  # Folder build otomatis hasil kompilasi Next.js
├── node_modules/           # Kumpulan alat bantu (dependencies) hasil dari npm install
├── prisma/                 
│   ├── schema.prisma       # Konfigurasi dan definisi tabel database (RSVP, dll)
│   └── migrations/         # Riwayat pembaruan skema tabel database
├── public/                 # Tempat menyimpan aset statis publik (gambar, font, ikon)
├── src/                    # Pusat kode utama aplikasi
│   ├── app/                # Next.js App Router pages & API routes: kerangka halaman web utama (Home & RSVP)
│   │   └── api/            # Route Handler: Menerima HTTP request dan mengembalikan response API
│   ├── components/         # React components: kotak teks, tombol, dan elemen UI yang dipakai berulang
│   ├── lib/                # Utilities & shared logic: jalur penghubung ke Database (Prisma) & Cloudflare R2
│   ├── schemas/            # Zod validation: memvalidasi struktur dan isi request form
│   ├── services/           # Service Layer: opsional, menangani aturan bisnis aplikasi
│   └── types/              # Kumpulan definisi tipe data TypeScript
├── .gitignore              # Daftar file/folder yang diabaikan dan tidak diunggah ke GitHub
├── AGENTS.md               # Berkas pedoman/konfigurasi untuk AI Agents
├── backend-system.md       # File detail backend website
├── CLAUDE.md               # Berkas pedoman/konfigurasi pedoman khusus AI Claude
├── eslint.config.mjs       # Pengaturan standar kerapian kode (Linter)
├── next-env.d.ts           # Deklarasi tipe bawaan otomatis dari Next.js
├── next.config.ts          # File pengaturan dan konfigurasi inti kerangka Next.js
├── package-lock.json       # Catatan pengunci versi pasti dari dependencies
├── package.json            # Daftar identitas proyek, perintah run (scripts), dan daftar library
├── postcss.config.mjs      # Pengaturan pemroses CSS (digunakan oleh TailwindCSS)
├── README.md               # Buku panduan proyek ini
└── tsconfig.json           # Pengaturan dan aturan ketat untuk compiler TypeScript
```
