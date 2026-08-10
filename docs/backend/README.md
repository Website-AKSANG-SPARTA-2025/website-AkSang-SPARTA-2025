# SPARTA Event Platform Backend

Selamat datang. Dokumen ini adalah titik awal untuk developer yang akan bekerja
di backend SPARTA Event Platform pada Sprint 1.

Gunakan README ini untuk memahami **gambaran besar, cara menjalankan proyek,
dan urutan kerja tim**. Untuk aturan produk, kontrak API, keamanan, dan detail
yang tidak boleh diubah, baca [BACKEND.md](./BACKEND.md). Jika ada perbedaan,
`BACKEND.md` adalah sumber kebenaran.

## Apa yang dibangun?

Backend ini mendukung tiga perjalanan peserta yang saling terhubung:

1. Attendance acara offline dengan verifikasi email.
2. Pendaftaran satu workshop: `CTF`, `BCC`, atau `CP`.
3. Pengumpulan file PDF untuk jalur kompetisi/assignment.

Prinsip terpentingnya sederhana: peserta memasukkan `name` dan `email` hanya
sekali. Attendance juga meminta `attendeeType`; `STUDENT` wajib mengisi
`institution`. Di halaman workshop, peserta memilih satu tombol path. Peserta
dengan session Attendance yang sudah terverifikasi hanya mengisi nomor HP wajib
dan NIM opsional; peserta baru juga mengisi nama dan email.

```mermaid
flowchart TB
    start["Peserta memilih perjalanan"] --> choice{"Jenis perjalanan"}

    choice --> AttendanceForm["Attendance: nama, email, attendeeType, institution untuk STUDENT"]
    AttendanceForm --> AttendancePending["Attendance berstatus PENDING"]
    AttendancePending --> AttendanceLink["Magic link tujuan ATTENDANCE"]
    AttendanceLink --> AttendanceSession["Participant terverifikasi dan session dibuat"]
    AttendanceSession --> event["Attendance terkonfirmasi"]
    AttendanceSession --> AttendanceWorkshop["Klik CTF, BCC, atau CP + nomor HP wajib + NIM opsional"]
    AttendanceWorkshop --> AttendanceActive["WorkshopRegistration ACTIVE"]

    choice --> workshopForm["Klik CTF, BCC, atau CP + nama, email, nomor HP wajib, NIM opsional"]
    workshopForm --> workshopPending["WorkshopRegistration PENDING"]
    workshopPending --> workshopLink["Magic link tujuan WORKSHOP"]
    workshopLink --> workshopActive["WorkshopRegistration ACTIVE + session dibuat"]

    AttendanceActive --> protectedAccess["Video, invitation card, dan submission terlindungi"]
    workshopActive --> protectedAccess
    protectedAccess --> invitation["Tombol invitation -> redirect backend ke grup path terpilih"]
```

Peserta yang hanya mendaftar workshop tetap memiliki `Participant`, tetapi
**tidak** otomatis memiliki `Attendance`. Sebaliknya, peserta Attendance terverifikasi dapat
mendaftar workshop tanpa memasukkan ulang nama atau email.

## Arsitektur singkat

Proyek ini adalah **modular monolith**: satu aplikasi Next.js, satu deployment,
dan satu database PostgreSQL. Frontend dan backend berada pada origin yang sama,
sehingga cookie session HttpOnly tidak memerlukan CORS atau public API base URL.

```mermaid
flowchart LR
    subgraph clientLayer["Browser"]
        browser["Halaman event dan workshop"]
    end

    subgraph appLayer["Next.js application"]
        routes["Route Handlers"]
        schemas["Zod schemas"]
        services["Services"]
        session["Session helper"]
        notifications["Notification Service"]
        storage["R2 storage helper"]
    end

    subgraph dataLayer["Data stores"]
        prisma["Prisma"]
        database[("Supabase PostgreSQL")]
        r2[("Cloudflare R2")]
    end

    subgraph externalLayer["External provider"]
        resend["Resend"]
    end

    browser -->|"Same-origin request"| routes
    routes -->|"Validate payload"| schemas
    routes -->|"Resolve or set cookie"| session
    routes -->|"Call business rule"| services
    services -->|"Read and write data"| prisma
    prisma --> database
    services -->|"Send verification email"| notifications
    notifications -.->|"Deliver email"| resend
    services -->|"Upload or delete PDF"| storage
    storage -.->|"Store bytes"| r2
```

### Mengapa tidak ada folder `controllers/`?

Dalam App Router Next.js, file `app/api/**/route.ts` sudah berperan sebagai
controller HTTP. Route Handler menerima request, memvalidasi input, membaca
session, memanggil service, lalu mengembalikan JSON, redirect, atau cookie.

Service menyimpan aturan bisnis yang dapat dipakai ulang, misalnya membuat
Attendance, memverifikasi token, mencari workshop registration, atau menyimpan
submission. Menambahkan controller terpisah saat ini hanya akan menghasilkan
lapisan tambahan tanpa tanggung jawab baru:

```text
Route Handler (HTTP/controller) -> Service (business rule) -> Prisma / provider
```

Jangan menambahkan controller, repository, event bus, queue, atau auth service
baru tanpa persetujuan Backend Lead.

## Tanggung jawab setiap lapisan

| Lapisan | Tanggung jawab | Contoh yang tidak boleh dilakukan |
|---|---|---|
| Route Handler | Parsing HTTP, validasi, session resolution, status/JSON/redirect/cookie | Menulis aturan Attendance atau langsung memanggil Resend/R2 |
| Zod schema | Memastikan bentuk request valid | Menentukan peserta boleh akses workshop atau tidak |
| Service | Aturan bisnis dan orkestrasi | Mengakses raw HTTP request atau environment variable provider |
| `lib/` | Prisma, session signing, email, R2, environment | Menentukan kebijakan peserta/Attendance |
| Prisma | Model, migration, unique constraint, relasi | Mengatur response API |

Contoh alur sebuah request terlindungi:

```mermaid
flowchart LR
    request["Request ke endpoint terlindungi"] --> readCookie["Baca participant_session"]
    readCookie --> verifySignature{"Signature dan expiry valid?"}
    verifySignature -->|"Tidak"| unauthorized["401 Unauthorized"]
    verifySignature -->|"Ya"| loadParticipant["Muat Participant dari database"]
    loadParticipant --> verified{"Email sudah verified?"}
    verified -->|"Tidak"| rejected["401 Unauthorized"]
    verified -->|"Ya"| eligibility{"Memenuhi syarat fitur?"}
    eligibility -->|"Tidak"| forbidden["403 Forbidden"]
    eligibility -->|"Ya"| serviceAction["Jalankan business rule"]
```

Client tidak boleh mengirim `participantId`, `workshopRegistrationId`, atau
email untuk mendapatkan akses ke endpoint terlindungi. Server selalu menentukan
identitas dari session yang sudah diverifikasi.

## Konsep domain yang perlu dipahami

| Istilah | Arti singkat |
|---|---|
| `Participant` | Satu sumber identitas: nama, email yang dinormalisasi, dan status verifikasi email. |
| `Attendance` | Status kehadiran offline: `PENDING` atau `VERIFIED`, dengan `attendeeType` `STUDENT`/`PUBLIC`; `STUDENT` wajib memiliki `institution`. Maksimal satu untuk setiap participant. |
| `EmailVerification` | Token magic link sekali pakai, memiliki expiry dan tujuan `ATTENDANCE` atau `WORKSHOP`. Hanya hash token yang disimpan. |
| `WorkshopRegistration` | Satu pilihan path (`CTF`/`BCC`/`CP`), nomor HP wajib, NIM opsional, dan status `PENDING` atau `ACTIVE`. Hanya `ACTIVE` yang memberi akses terlindungi. |
| `Submission` | Metadata PDF yang tersimpan di PostgreSQL; file PDF-nya sendiri berada di Cloudflare R2. |

## Endpoint yang disetujui

Jangan menambah atau mengganti endpoint tanpa persetujuan.

| Endpoint | Kegunaan | Perlu session? |
|---|---|---|
| `POST /api/attendances` | Membuat atau memakai ulang participant dan Attendance pending dengan klasifikasi peserta | Tidak |
| `POST /api/attendances/confirm` | Membuat/mempromosikan Attendance melalui session verified dengan klasifikasi yang cocok | Ya |
| `POST /api/workshops/enroll` | Mendaftarkan peserta baru ke satu path workshop dan membuat registration `PENDING` | Tidak |
| `GET /api/verifications/verify?token=...` | Mengonsumsi magic link dan membuat session | Tidak |
| `POST /api/verifications/resend` | Mengirim magic link baru sesuai purpose | Tidak |
| `POST /api/workshops/register` | Mendaftarkan peserta bersession ke satu path sebagai `ACTIVE` | Ya |
| `GET /api/workshops/invitation` | Redirect aman ke grup path yang tersimpan | Ya, dan harus memiliki registration `ACTIVE` |
| `POST /api/submissions` | Upload PDF kompetisi/assignment | Ya, dan harus memiliki registration `ACTIVE` |

Semua response JSON mengikuti bentuk berikut:

```json
{ "success": true, "message": "Optional message", "data": {} }
```

Error tidak boleh membocorkan stack trace, token mentah, cookie, credential,
atau raw provider error.

## Data pribadi dan keamanan

`name` dan `email` hanya disimpan pada `Participant`. Nomor HP hanya disimpan
di `WorkshopRegistration`; NIM opsional juga berada di sana. Keduanya bukan
identitas otorisasi dan tidak boleh masuk log, error response, atau session
cookie.

Sebelum production, developer wajib menerapkan persyaratan di
[Security Requirements](./BACKEND.md#24-security-requirements): koneksi database
ber-TLS, role database berhak minimum, akses database hanya dari server, backup
terenkripsi dan diuji restore, serta kebijakan retensi/penghapusan data.

## Memulai pengembangan lokal

### 1. Prasyarat

- Node.js `22.18.0`
- npm `11.x`
- Git
- PostgreSQL lokal; Docker tidak diperlukan
- Akses ke repository dan branch `dev`
- Credential provider hanya untuk task yang membutuhkannya

Pastikan tool utama tersedia:

```bash
node --version
npm --version
git --version
```

### 2. Clone repository

```bash
git clone https://github.com/Website-AKSANG-SPARTA-2025/website-AkSang-SPARTA-2025.git
cd website-AkSang-SPARTA-2025
git checkout dev
git pull --ff-only origin dev
```

Jangan mulai dari `main`. Seluruh task Sprint 1 dibuat dari baseline terbaru
branch `dev`.

### 3. Install dependency

Gunakan `npm ci` agar dependency sama dengan `package-lock.json`:

```bash
npm ci
```

Gunakan `npm install` hanya ketika sengaja menambah atau memperbarui dependency
dan perubahan `package.json` sudah disetujui Backend Lead.

### 4. Siapkan PostgreSQL lokal tanpa Docker

Install PostgreSQL pada laptop developer, jalankan servicenya, lalu buka pgAdmin
atau SQL Shell sebagai administrator PostgreSQL. Buat role dan database lokal:

```sql
CREATE USER sparta WITH PASSWORD 'sparta_dev';
CREATE DATABASE sparta_dev OWNER sparta;
```

Database ini hanya untuk development lokal. Jangan memakai credential atau data
production. Setiap developer memiliki database sendiri pada laptopnya sehingga
test dan perubahan data tidak saling mengganggu.

### 5. Siapkan environment lokal

Salin template tanpa memasukkan nilai rahasia ke Git:

```powershell
Copy-Item .env.example .env
```

Untuk macOS/Linux:

```bash
cp .env.example .env
```

Isi koneksi PostgreSQL lokal:

```env
DATABASE_URL="postgresql://sparta:sparta_dev@localhost:5432/sparta_dev?schema=public"
```

Variable lain diisi sesuai task:

| Variable | Digunakan oleh | Keterangan |
|---|---|---|
| `DATABASE_URL` | BE-03, BE-04, BE-06, BE-07, BE-10 | PostgreSQL lokal; wajib untuk alur database. |
| `APP_BASE_URL` | BE-04, BE-05 | Gunakan `http://localhost:3000` saat lokal. |
| `EMAIL_VERIFICATION_*` | BE-04 | TTL dan cooldown verification link. |
| `SESSION_SECRET`, `SESSION_TTL_DAYS` | BE-06 | Secret minimal 32 random bytes. |
| `RESEND_API_KEY`, `EMAIL_FROM` | BE-05 | Hanya diperlukan untuk manual integration test email. |
| `WORKSHOP_*_COMMUNITY_LINK` | BE-08 | Tiga URL private untuk CTF, BCC, dan CP. |
| `R2_*`, `MAX_SUBMISSION_FILE_SIZE_BYTES` | BE-09, BE-10 | Bucket private khusus development. |

Developer yang tidak mengerjakan provider terkait tidak perlu menerima
credential tersebut. Bagikan secret melalui secret manager, bukan Git, issue,
pull request, screenshot, atau chat.

Invitation memakai tiga URL server-only: `WORKSHOP_CTF_COMMUNITY_LINK`,
`WORKSHOP_BCC_COMMUNITY_LINK`, dan `WORKSHOP_CP_COMMUNITY_LINK`. Jangan gunakan
prefix environment publik atau memasukkan URL grup ke bundle frontend.

Untuk upload PDF dari backend lokal, Backend Lead menyiapkan satu bucket private
R2 khusus development. Ikuti kontrak konfigurasi di
[BE-09 R2 storage](./tasks/S1-BE-09-r2-storage.md); unit test tetap memakai mock
dan tidak mengakses bucket sungguhan.

### 6. Siapkan Prisma dan database

Setelah `DATABASE_URL` terisi:

```bash
npm run db:validate
npm run db:migrate
npm run db:generate
```

Migration harus dapat diterapkan pada database kosong. Hanya owner BE-01 atau
Backend Lead yang boleh mengubah `prisma/schema.prisma` dan commit migration
baru. Developer lain hanya menerapkan migration yang sudah disetujui.

### 7. Jalankan pemeriksaan awal

```bash
npm test
npm run lint
npm run build
```

Jika baseline gagal sebelum developer mengubah kode, jangan lanjutkan task.
Laporkan output command kepada Backend Lead agar kegagalan baseline tidak
tercampur dengan perubahan task.

### 8. Jalankan development server

```bash
npm run dev
```

Buka `http://localhost:3000`. Route Handler backend berada di bawah `/api/*`.

Di Windows, jika PowerShell memblokir `npm.ps1`, gunakan executable berikut:

```powershell
npm.cmd run dev
npm.cmd test
```

### 9. Workflow harian

Sebelum mulai bekerja:

```bash
git checkout dev
git pull --ff-only origin dev
```

Sebelum membuat pull request:

```bash
npm test
npm run lint
npm run build
```

`npm run build` harus berhasil sebelum merge. Test provider harus memakai fake
atau mock; jangan kirim email Resend atau upload ke R2 sungguhan dari test.

## Struktur proyek yang dituju

Struktur ini adalah target Sprint 1. Jangan memindahkan aplikasi ke folder
`src/` atau memecahnya menjadi monorepo.

```text
app/api/                 Route Handlers HTTP
services/                Aturan bisnis dan orkestrasi
schemas/                 Validasi Zod
lib/                     Prisma, session, email, R2, dan environment
errors/                  ApplicationError dan HTTP error mapping
prisma/                  Schema dan migration
tests/                   Unit/integration tests dengan fake provider
docs/backend/            Arsitektur dan work order
```

## Urutan kerja tim

BE-01 dan BE-02 sudah diimplementasikan dan menjadi baseline. Task berikutnya
boleh mulai hanya setelah dependency yang ditunjukkan diagram tersedia pada
branch `dev` atau interface-nya sudah dibekukan oleh Backend Lead.

```mermaid
flowchart TD
    be01["BE-01 Prisma"] --> be02["BE-02 Validation and errors"]
    be02 --> be03["BE-03 Participant and Attendance"]
    be03 --> be04["BE-04 Verification"]
    be04 --> be05["BE-05 Email"]
    be03 --> be06["BE-06 Session"]
    be04 --> be06
    be06 --> be07["BE-07 Workshop"]
    be06 --> be08["BE-08 Invitation"]
    be07 --> be08["BE-08 Invitation"]
    be02 --> be09["BE-09 R2 storage"]
    be06 --> be10["BE-10 Submission"]
    be07 --> be10
    be09 --> be10["BE-10 Submission"]
    be05 --> review["Backend integration review"]
    be08 --> review
    be10 --> review
```

| Task | Fokus | Baca sebelum mulai |
|---|---|---|
| [BE-01](./tasks/S1-BE-01-database-schema.md) | Prisma schema, config, dan initial migration | Data model dan environment contract |
| [BE-02](./tasks/S1-BE-02-api-core-validation.md) | Zod schema, error contract, response helper | Validation dan HTTP response contract |
| [BE-03](./tasks/S1-BE-03-participant-attendance.md) | Participant, Attendance, workshop enrollment | Identity dan Attendance rules |
| [BE-04](./tasks/S1-BE-04-verification-link.md) | Magic link dan resend | Token lifecycle dan purpose isolation |
| [BE-05](./tasks/S1-BE-05-email-notification.md) | Resend adapter dan notification service | Email provider policy |
| [BE-06](./tasks/S1-BE-06-session-identity.md) | Signed session dan identity resolver | Session contract |
| [BE-07](./tasks/S1-BE-07-workshop-registration.md) | Workshop activation dan video eligibility | Workshop rules |
| [BE-08](./tasks/S1-BE-08-workshop-invitation.md) | Authorized invitation redirect | Invitation security |
| [BE-09](./tasks/S1-BE-09-r2-storage.md) | Validasi PDF dan R2 abstraction | File validation dan storage contract |
| [BE-10](./tasks/S1-BE-10-submission.md) | Submission flow dan orphan cleanup | Submission processing order |

## Pembagian staff

Backend Lead tetap menjadi approver API, database, security, dan merge. BE-01
dan BE-02 adalah baseline yang sudah diimplementasikan; keduanya hanya menunggu
verification/freeze sebelum feature PR masuk.

Suffix `A/B` adalah pemisahan workload internal, bukan kontrak API atau merge
order baru. BE-03, BE-04, dan BE-06 masing-masing tetap memakai satu branch,
satu PR, dan satu acceptance gate. Kedua PIC menyetujui final PR bersama.

| Workload | PIC | File/fungsi utama | Timeline dan deadline |
|---|---|---|---|
| BE-01 baseline | Backend Lead | Prisma schema, migration, empty-database verification | Verifikasi dan freeze 9 Agustus 2026 |
| BE-02 baseline | Backend Lead | Zod schemas, `ApplicationError`, shared API helpers | Smoke test dan export-path freeze 9 Agustus 2026 |
| BE-03A — Participant & workshop entry | Ferdinand Valentino Darmawan | `participant.service.ts`, workshop enroll route, `findOrCreateParticipant`, `enrollWorkshop` | Implementasi/review 9 Agustus; support integrasi 10 Agustus 2026 |
| BE-03B — Attendance entry & confirmation | Muhammad Orkhan | `attendance.service.ts`, Attendance route, pending/verified/confirmation behavior | Implementasi/review 9 Agustus; support integrasi 10 Agustus 2026 |
| BE-04A — Verification service | Muhammad Marvel Sidharta | Token generation/hash/expiry, purpose transaction, resend cooldown | Mulai setelah BE-03 freeze 9 Agustus; merge 10 Agustus 2026 |
| BE-04B — Verification routes | Jeremy Gerald Sutanto | Verify/resend Route Handlers, HTTP mapping, BE-05/BE-06 seams | Mulai setelah service interface tersedia; merge 10 Agustus 2026 |
| BE-05 — Email notification | Denzel Santoso | Resend adapter, notification service, email tests | Mocked implementation 9 Agustus; integration/merge 10 Agustus 2026 |
| BE-06A — Signed session | Bima Aditama Wibowo Putro | `lib/session.ts`, HMAC token, cookie helpers | Helper/test 9 Agustus; integration/merge 10 Agustus 2026 |
| BE-06B — Identity & routes | Rafi Pradipta Andira Sulistyo | `lib/auth.ts`, identity resolver, verify success branch, Attendance confirm route | Helper/test 9 Agustus; integration/merge 10 Agustus 2026 |
| BE-07 — Workshop activation | Kairenzo Vemil | Workshop service, activation route, eligibility | Implementasi/review/merge 10 Agustus 2026 |
| BE-08 — Workshop invitation | Christian Immanuel | Authorized invitation redirect and tests | Implementasi/integration/merge 10 Agustus 2026 |
| BE-09 — R2 storage | Bayu Palamarta Wirawan | PDF validation, upload/delete abstraction, mocked R2 tests | Implementasi/review/merge 9 Agustus; support BE-10 10 Agustus 2026 |
| BE-10 — Submission | Aditya Rasyid | Submission service/route, DB metadata, orphan cleanup | Implementasi/integration/merge 10 Agustus 2026 |

Seluruh workload memiliki buffer bug fixing pada 11 Agustus 2026. Detail batas
file, acceptance criteria, dan larangan tetap mengikuti task masing-masing.

## Timeline Sprint 1

Target utama adalah backend siap integrasi frontend pada **10 Agustus 2026**.
**11 Agustus 2026** menjadi batas terakhir perbaikan dan stabilisasi. Jadwal ini
tidak mengubah dependency atau merge gate setiap task.

| Hari | Target pengerjaan dan hasil akhir |
|---|---|
| **9 Agustus 2026** | Verifikasi baseline BE-01/BE-02; BE-03A menyelesaikan participant/workshop entry dan membekukan interface; BE-03B menyelesaikan Attendance flow; BE-03 menjalani shared review; BE-04A/BE-04B mulai setelah interface tersedia; BE-05, BE-06A, dan BE-06B mengerjakan bagian independen; BE-09 selesai dengan mocked storage tests. |
| **10 Agustus 2026** | BE-04A/BE-04B, BE-05, dan BE-06A/BE-06B menyelesaikan integration gate; BE-07 selesai; BE-08 dan BE-10 selesai setelah dependency tersedia; seluruh endpoint menjalani integration test; backend diserahkan untuk integrasi frontend. |
| **11 Agustus 2026** | Buffer bug fixing hasil integrasi frontend, regression test, security check, dokumentasi final, dan hard freeze backend. Tidak menerima fitur atau perubahan requirement baru. |

Jika sebuah dependency terlambat, owner downstream tetap boleh menulis test dan
bagian independen, tetapi PR tidak boleh merge menggunakan stub yang mengubah
kontrak production.

## Branching rules

### Branch permanen

| Branch | Fungsi | Aturan |
|---|---|---|
| `main` | Kode release/production | Hanya menerima release PR dari `dev` atau emergency hotfix yang disetujui. |
| `dev` | Integrasi backend dan frontend | Semua task masuk melalui pull request; direct push dilarang. |

Aktifkan branch protection pada `main` dan `dev`: wajib pull request, minimal
satu approval Backend Lead, seluruh status check lulus, conversation resolved,
dan force push/delete branch dilarang.

### Nama branch kerja

Gunakan lowercase dan tanda hubung:

```text
feat/s1-be-03-participant-attendance
feat/s1-be-04-verification
feat/s1-be-09-r2-storage
fix/s1-be-06-expired-session
docs/backend-onboarding
chore/dependency-update
hotfix/<deskripsi-singkat>
```

Aturan branch:

1. Satu branch hanya untuk satu task atau satu bug.
2. Branch task selalu dibuat dari `dev` terbaru.
3. Jangan memasukkan refactor atau file milik task lain tanpa persetujuan owner
   dan Backend Lead.
4. Satu task yang dikerjakan berpasangan tetap memiliki satu branch dan satu PR;
   PR dibuat setelah kedua PIC menyetujui isi dan acceptance checklist.
5. Target PR task adalah `dev`, bukan `main`.
6. Sinkronkan perubahan `dev` ke branch kerja sebelum final review.
7. Gunakan squash merge; judul PR menjadi commit final pada `dev`.
8. Hapus branch kerja setelah PR berhasil merge.
9. `hotfix/*` hanya untuk masalah production, dibuat dari `main`, lalu hasilnya
   harus disinkronkan kembali ke `dev`.

Contoh memulai task:

```bash
git checkout dev
git pull --ff-only origin dev
git switch -c feat/s1-be-03-participant-attendance
git push -u origin feat/s1-be-03-participant-attendance
```

Sebelum final review, sinkronkan tanpa menulis ulang history branch bersama:

```bash
git fetch origin
git merge origin/dev
```

## Git commit convention

Gunakan format Conventional Commits:

```text
<type>(<scope>): <ringkasan imperatif>
```

Type yang disetujui:

| Type | Digunakan untuk |
|---|---|
| `feat` | Fitur atau behavior baru. |
| `fix` | Perbaikan bug. |
| `test` | Penambahan/perbaikan test tanpa behavior production baru. |
| `docs` | Dokumentasi saja. |
| `refactor` | Perubahan struktur tanpa mengubah behavior. |
| `chore` | Maintenance yang tidak mengubah source behavior. |
| `build` | Dependency atau build configuration. |
| `ci` | GitHub Actions atau pipeline CI. |

Gunakan scope task atau area yang jelas: `be-03`, `be-04`, `be-06`, `r2`,
`prisma`, `api`, atau `backend`.

Contoh commit:

```text
feat(be-03): add pending Attendance creation
test(be-09): reject invalid PDF magic bytes
fix(be-06): reject expired participant session
docs(backend): add local R2 setup
```

Aturan commit:

1. Gunakan bahasa Inggris pada commit dan PR title.
2. Type dan scope lowercase; ringkasan singkat, imperatif, dan tanpa titik akhir.
3. Satu commit mewakili satu perubahan logis; hindari `wip`, `update`, `final`,
   `fix again`, atau pesan yang tidak menjelaskan perubahan.
4. Jangan commit `.env`, credential, token, cookie, data peserta, atau file PDF.
5. Breaking change dilarang tanpa persetujuan Backend Lead. Jika disetujui,
   gunakan `!` dan jelaskan migration pada body commit/PR.
6. Tambahkan `Refs: S1-BE-XX` pada body commit atau deskripsi PR.
7. Untuk pekerjaan berpasangan, tambahkan trailer `Co-authored-by` bila kedua
   developer benar-benar berkontribusi.
8. Judul pull request mengikuti format commit karena repository menggunakan
   squash merge.

## Aturan yang tidak boleh dilanggar

- Jangan menambah password login, OTP, refresh token, JWT dependency, atau tabel `Session`.
- Jangan membuat Attendance saat peserta hanya melakukan workshop enrollment.
- Jangan meminta nama/email lagi saat workshop activation atau submission.
- Peserta hanya boleh memiliki satu path workshop (`CTF`, `BCC`, atau `CP`);
  nomor HP wajib dan NIM opsional disimpan pada `WorkshopRegistration`.
- Jangan menyimpan atau mencatat raw verification token, session value, credential, atau PDF bytes.
- Jangan mengirim invitation URL ke frontend; tampilkan invitation card setelah
  aktivasi lalu gunakan redirect yang sudah diautorisasi.
- Jangan menerima file selain PDF atau mengizinkan direct browser-to-R2 upload.
- Jangan membuat aturan overwrite/resubmit submission; kebijakan itu belum diputuskan.
- Jangan memperkenalkan rate-limit provider, video provider, atau multi-workshop redesign tanpa keputusan Backend Lead.

## Checklist sebelum membuat pull request

- [ ] Membaca `BACKEND.md` dan task yang sedang dikerjakan.
- [ ] Perubahan hanya berada dalam ownership task atau integration exception yang disetujui.
- [ ] Ada happy-path test dan relevant negative-path test.
- [ ] Tidak ada secret, raw token, session value, atau file bytes dalam kode/log/test fixture.
- [ ] `npm run lint` lulus.
- [ ] Command Prisma yang relevan lulus bila schema/migration berubah.
- [ ] `npm test` lulus.
- [ ] `npm run build` lulus.
- [ ] API, model data, dan product scope tidak berubah tanpa persetujuan.

## Ke mana mencari detail?

- [BACKEND.md](./BACKEND.md): kontrak lengkap, security rules, API status,
  data model, dan definition of done.
- [tasks/](./tasks/): scope, file ownership, acceptance criteria, dan dependency
  untuk setiap developer.
- [`.env.example`](../../.env.example): daftar environment variable tanpa secret.

Jika requirement belum jelas atau bertentangan dengan dokumen ini, jangan
menebak. Catat sebagai blocker dan minta keputusan dari Backend Lead.
