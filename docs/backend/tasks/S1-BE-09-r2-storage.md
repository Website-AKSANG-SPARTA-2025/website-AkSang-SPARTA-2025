# S1-BE-09 — Cloudflare R2 PDF Storage Abstraction

- **PIC:** Bayu Palamarta Wirawan
- **Timeline:** Mocked storage implementation, review, and merge on 9 August; BE-10 integration support on 10 August; bug-fix buffer on 11 August 2026
- **Deadline:** 9 August 2026 before BE-10 integration
- **Sprint:** 1
- **Merge order:** 9
- **Depends on:** BE-02 error conventions; approved R2 environment contract
- **Blocks:** BE-10 submission
- **Contract:** server-only upload/delete abstraction; PDF bytes in R2, metadata returned to Submission Service
- **Owned files:** `lib/r2.ts`, file-validation/storage helper files, storage tests

> **Global rules:** API/DB contract is frozen by Backend Lead. Do not rename endpoints, request fields, response fields, model names, or cross-module interfaces without approval. Every secret stays server-side and must never be committed or logged.


## Goal (1 sentence)
Provide a secure, testable R2 abstraction that validates PDF uploads, generates server-controlled object keys, uploads files, returns metadata, and can delete an uploaded object for orphan cleanup.

## Context you need to know
Required server-only configuration:
```env
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_NAME=
R2_ENDPOINT=
MAX_SUBMISSION_FILE_SIZE_BYTES=5242880
```
`5242880` = 5 MiB and is a **work-order implementation default** to make the sprint executable; deployment may override it via environment without code changes.

Submission accepts only PDF. Do not trust filename extension alone.

R2 is the PDF-submission storage contract only. Do not use this task's bucket,
client, or public URLs to deliver protected workshop video.

## Required storage API
Provide equivalent server-only functions:
```ts
type UploadPdfInput = {
  bytes: Uint8Array;
  originalFileName: string;
  contentType: string;
};

type StoredObject = {
  storageKey: string;
  fileName: string;      // sanitized original display name
  contentType: "application/pdf";
  size: number;
};

validatePdf(input): void
uploadPdf(input): Promise<StoredObject>
deleteObject(storageKey: string): Promise<void>
```

## Validation rules — implement exactly
1. File exists and size > 0.
2. Size <= `MAX_SUBMISSION_FILE_SIZE_BYTES`.
3. MIME must be `application/pdf`.
4. Check PDF magic bytes `%PDF-` at beginning; MIME alone is insufficient.
5. Sanitize original filename for metadata/display; never use raw filename as object key.
6. Generate object key server-side using unpredictable/unique ID, e.g. `submissions/<uuid>.pdf`.
7. Never expose R2 credentials to client.

## Error semantics
- missing/empty/invalid PDF → application error mapped to `400`.
- oversized → `400` with safe message.
- R2 upload-provider failure → `502` with a safe external-provider message.
- Missing server configuration remains a safe generic `500` at the route boundary.
- delete cleanup failure should be logged as an operational error, not silently swallowed.

## Suggested steps
1. Implement centralized R2 client creation from env.
2. Implement filename sanitizer.
3. Implement MIME + size + magic-byte validator.
4. Implement generated storage key.
5. Implement upload returning only approved metadata.
6. Implement delete by storage key.
7. Add fake/mock R2 client for tests; unit tests must not hit live R2.

## Boundary (what you must NOT touch)
- Do not create Submission DB records.
- Do not resolve participant/session/workshop eligibility.
- Do not accept client-provided R2 key.
- Do not return signed/public R2 URL unless contract is changed.
- Do not store or serve workshop video through this R2 PDF abstraction.
- Do not add support for DOCX/ZIP/images.
- Do not alter Prisma schema.

## Done = (acceptance criteria — become tests)
- [ ] Valid PDF bytes + MIME upload successfully through mocked R2 and return metadata.
- [ ] Empty file rejected.
- [ ] Non-PDF MIME rejected.
- [ ] `application/pdf` with wrong magic bytes rejected.
- [ ] File above configured max rejected.
- [ ] Generated key does not directly use raw filename.
- [ ] `deleteObject` deletes exact key.
- [ ] Secrets do not appear in logs/response/client bundle.
- [ ] BE-10 can import stable `validatePdf/uploadPdf/deleteObject` interface.
