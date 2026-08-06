# Proposed System — RSVP Management Platform

## 1. Overview
Web aksang SPARTA

---

## 2. Objectives

Sistem dirancang untuk:

- menerima data RSVP dari user melalui browser;
- melakukan validasi payload sebelum data diproses;
- menyimpan data RSVP ke PostgreSQL;
- mencegah data duplikat jika diperlukan;
- memberikan HTTP response yang konsisten;
- memisahkan business logic dari route handler;
- menyediakan fondasi backend yang mudah dikembangkan dan dipelihara.

---

## 3. Proposed Technology Stack

| Layer | Technology | Responsibility |
|---|---|---|
| Client | Browser / Web Client | Mengirim data RSVP dan menampilkan response |
| Application | Next.js | Menjalankan aplikasi dan backend |
| API Layer | Next.js Route Handler | Menerima HTTP request dan mengembalikan response |
| Validation | Zod | Validasi struktur dan isi request |
| Business Logic | Service Layer | Menangani aturan bisnis aplikasi |
| ORM | Prisma | Abstraksi akses database dan query |
| Database | PostgreSQL | Penyimpanan data utama |
| Cloud Database | Supabase | Hosting dan pengelolaan PostgreSQL |

---

## 4. High-Level Architecture

```mermaid
flowchart TD
    Client[Client / Browser]

    subgraph Backend["Backend Side - Next.js"]
        App[Next.js Application]
        Route[Route Handlers / API Routes]
        Action[Server Actions]
        Service[Service / Business Logic]
        Prisma[Prisma ORM]

        App --> Route
        App --> Action
        Route --> Service
        Action --> Service
        Service --> Prisma
    end

    subgraph Supabase["Supabase Cloud"]
        DB[(PostgreSQL Database)]
    end

    Client --> App
    Prisma --> DB
```

### Responsibility per Component

#### Client / Browser
Client bertanggung jawab untuk:

- menampilkan form RSVP;
- menerima input user;
- mengirim request HTTP ke backend;
- menampilkan status sukses atau error.

#### Next.js Application
Next.js digunakan sebagai application layer dan backend runtime.

Backend dapat menggunakan:

- Route Handlers;
- Server Actions;
- service layer;
- server-side validation;
- Prisma ORM.

#### Zod
Zod digunakan untuk memastikan request yang masuk sesuai schema.

Contoh data yang dapat divalidasi:

- nama;
- email;

#### Prisma ORM
Prisma menjadi penghubung antara business logic dengan PostgreSQL.

Prisma menangani:

- schema database;
- migration;
- CRUD operation;
- relation;
- constraint;
- transaction;
- type-safe query.

#### Supabase PostgreSQL
Supabase digunakan sebagai managed PostgreSQL database.

Pada arsitektur ini, Supabase terutama berfungsi sebagai **database cloud provider**, sedangkan operasi database dilakukan melalui Prisma.

---

## 5. RSVP Request Flow

Contoh alur ketika user mengirim form RSVP:

```mermaid
sequenceDiagram
    participant U as Browser
    participant R as Next.js /api/rsvps
    participant V as Zod
    participant P as Prisma
    participant D as PostgreSQL / Supabase

    U->>R: POST JSON RSVP
    R->>V: Validasi payload

    alt Payload invalid
        V-->>R: Validation error
        R-->>U: 400 Bad Request
    else Payload valid
        V-->>R: Valid payload
        R->>P: Simpan RSVP
        P->>D: INSERT RSVP

        alt Duplicate data
            D-->>P: Unique constraint error
            P-->>R: Duplicate error
            R-->>U: 409 Conflict
        else Insert success
            D-->>P: Created record
            P-->>R: RSVP data
            R-->>U: 201 Created
        end
    end
```

---

## 6. Backend Request Lifecycle

Secara sederhana, setiap request RSVP mengikuti pipeline berikut:

```text
Browser
   |
   | POST /api/rsvps
   v
Next.js Route Handler
   |
   v
Zod Validation
   |
   v
Service / Business Logic
   |
   v
Prisma ORM
   |
   v
Supabase PostgreSQL
   |
   v
HTTP Response
```

---

## 7. Proposed API

### Create RSVP

**Endpoint**

```http
POST /api/rsvps
```

### Example Request

```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "attendance": "ATTENDING",
}
```

### Success Response

```http
HTTP/1.1 201 Created
```

```json
{
  "success": true,
  "data": {
    "id": "clx123",
    "name": "John Doe",
    "email": "john@example.com",
  }
}
```

### Validation Error

```http
HTTP/1.1 400 Bad Request
```

```json
{
  "success": false,
  "message": "Invalid request payload"
}
```

### Duplicate RSVP

```http
HTTP/1.1 409 Conflict
```

```json
{
  "success": false,
  "message": "RSVP already exists"
}
```

### Internal Server Error

```http
HTTP/1.1 500 Internal Server Error
```

```json
{
  "success": false,
  "message": "Internal server error"
}
```

---

## 8. Proposed Data Model

Contoh schema Prisma:

```prisma

model Rsvp {
  id          String           @id @default(cuid())
  name        String
  email       String           @unique
  createdAt   DateTime         @default(now())
  updatedAt   DateTime         @updatedAt
}
```

Constraint `@unique` pada `email` dapat digunakan apabila satu email hanya diperbolehkan mengirim satu RSVP.

---

## 9. Validation Schema

Contoh Zod schema:

```ts
import { z } from "zod";

export const createRsvpSchema = z.object({
  name: z.string().min(2).max(100),

  email: z.string().email(),
});
```

Validasi tetap dilakukan di backend meskipun frontend juga memiliki client-side validation.

---

## 10. Suggested Project Structure

```text
src/
├── app/
│   ├── api/
│   │   └── rsvps/
│   │       └── route.ts
│   │
│   └── ...
│
├── services/
│   └── rsvp.service.ts
│
├── schemas/
│   └── rsvp.schema.ts
│
├── lib/
│   └── prisma.ts
│
└── types/
    └── rsvp.ts

prisma/
├── schema.prisma
└── migrations/
```

Jika kompleksitas meningkat, struktur dapat berkembang menjadi:

```text
Route Handler
      |
      v
Controller
      |
      v
Service
      |
      v
Repository
      |
      v
Prisma
      |
      v
PostgreSQL
```

---

## 11. Example Route Handler

```ts
import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";

import { createRsvpSchema } from "@/schemas/rsvp.schema";
import { createRsvp } from "@/services/rsvp.service";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const result = createRsvpSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid request payload",
          errors: result.error.flatten(),
        },
        { status: 400 }
      );
    }

    const rsvp = await createRsvp(result.data);

    return NextResponse.json(
      {
        success: true,
        data: rsvp,
      },
      { status: 201 }
    );
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "RSVP already exists",
        },
        { status: 409 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        message: "Internal server error",
      },
      { status: 500 }
    );
  }
}
```

---

## 12. Example Service Layer

```ts
import { prisma } from "@/lib/prisma";

type CreateRsvpInput = {
  name: string;
  email: string;
};

export async function createRsvp(data: CreateRsvpInput) {
  return prisma.rsvp.create({
    data,
  });
}
```

Dengan pola ini:

- route handler fokus pada HTTP;
- Zod fokus pada validation;
- service fokus pada business logic;
- Prisma fokus pada data access;
- PostgreSQL fokus pada persistence.

---

## 13. Database Connection

Prisma terhubung langsung ke PostgreSQL yang disediakan oleh Supabase.

```text
Next.js
   |
   v
Prisma
   |
   | PostgreSQL Connection
   v
Supabase PostgreSQL
```

Contoh environment variable:

```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/postgres"
```

Environment variable yang mengandung credential tidak boleh dikirim ke browser atau disimpan di repository publik.

---

## 14. Error Handling Strategy

Backend menggunakan HTTP status code yang konsisten:

| Status | Meaning |
|---|---|
| `200 OK` | Request berhasil |
| `201 Created` | RSVP berhasil dibuat |
| `400 Bad Request` | Payload tidak valid |
| `404 Not Found` | Resource tidak ditemukan |
| `409 Conflict` | RSVP duplicate |
| `500 Internal Server Error` | Error tidak terduga pada server |

Format response sebaiknya konsisten.

Success:

```json
{
  "success": true,
  "data": {}
}
```

Error:

```json
{
  "success": false,
  "message": "Error description"
}
```

---

## 15. Security Considerations

Beberapa aspek keamanan yang perlu diterapkan:

### Input Validation

Semua data dari client dianggap tidak terpercaya dan harus divalidasi dengan Zod.

### Server-Side Database Access

Prisma hanya dijalankan di server.

Credential database tidak boleh tersedia pada client bundle.

### Environment Variables

Credential disimpan menggunakan environment variables.

Contoh:

```env
DATABASE_URL=
```

### Rate Limiting

Endpoint RSVP sebaiknya memiliki rate limiting untuk mengurangi spam.

### Unique Constraint

Jika satu user hanya boleh RSVP satu kali, database harus memiliki unique constraint.

Jangan hanya mengandalkan pengecekan di application layer karena dapat menyebabkan race condition.

### Logging

Server perlu mencatat error penting tanpa menyimpan credential atau data sensitif secara sembarangan.

---

## 16. Optional File Storage (Tergantung Request)

Apabila sistem nantinya membutuhkan upload file seperti:

- PDF;
- invitation document;
- attachment;
- image;
- QR asset;

file sebaiknya tidak disimpan langsung sebagai binary di PostgreSQL.

Cloud object storage dapat digunakan, misalnya **Cloudflare R2**.

Arsitektur menjadi:

```mermaid
flowchart LR
    Client[Browser]
    API[Next.js Backend]
    Prisma[Prisma ORM]
    DB[(Supabase PostgreSQL)]
    R2[Cloudflare R2]

    Client --> API

    API --> Prisma
    Prisma --> DB

    API --> R2
```

Pembagian storage:

| Storage | Data |
|---|---|
| Supabase PostgreSQL | RSVP, user data, metadata |
| Cloudflare R2 | PDF, image, attachment |

Database hanya perlu menyimpan metadata seperti:

```text
id
fileName
storageKey
contentType
size
createdAt
```

## 18. Proposed Final Architecture

```mermaid
flowchart TD
    User[Browser / Client]

    subgraph Application["Next.js Application"]
        UI[Frontend UI]
        API[Route Handler / API]
        Validation[Zod Validation]
        Service[Service / Business Logic]
        ORM[Prisma ORM]

        UI --> API
        API --> Validation
        Validation --> Service
        Service --> ORM
    end

    subgraph Infrastructure["Cloud Infrastructure"]
        DB[(Supabase PostgreSQL)]
        Storage[Cloudflare R2 - Optional]
    end

    User --> UI

    ORM --> DB
    Service --> Storage
```

---

## 19. Summary

Proposed backend stack:

```text
Next.js
   |
   +-- Route Handlers / Server Actions
   |
   +-- Zod
   |     Validation
   |
   +-- Service Layer
   |     Business Logic
   |
   +-- Prisma ORM
         |
         v
   Supabase PostgreSQL
```

Dengan tambahan object storage apabila diperlukan:

```text
Next.js
├── Prisma ─────────> Supabase PostgreSQL
└── Storage Client ─> Cloudflare R2
```
