# Fingerprint Attendance

EduTap supports fingerprint attendance as an additional attendance source. Existing NFC, QR, face, and manual attendance remain unchanged.

## Important

The LMS does not store fingerprint templates. Enroll the student's fingerprint on the fingerprint machine, then save the machine's user ID in EduTap.

## Setup

1. Run migrations and regenerate Prisma:

```bash
npx prisma migrate deploy
npx prisma generate
```

2. Add a device API key to `.env`:

```env
FINGERPRINT_ATTENDANCE_API_KEY=long-random-device-key
FINGERPRINT_ATTENDANCE_RATE_LIMIT_PER_MINUTE=120
```

3. Open a student profile:

```text
/students/[studentId]
```

4. Click **Fingerprint**.

5. Enter the fingerprint machine user ID, for example `101` or `STU001`.

## Machine/Bridge API

POST to:

```text
/api/attendance/fingerprint
```

Headers:

```text
Content-Type: application/json
x-fingerprint-api-key: long-random-device-key
```

Payload:

```json
{
  "classGroupId": "class_id",
  "deviceId": "fingerprint-reader-1",
  "eventId": "reader-1-2026-07-23-000001",
  "fingerprintId": "101",
  "occurredAt": "2026-07-23T08:02:00.000Z",
  "status": "PRESENT"
}
```

Alternative identifiers are supported:

```json
{ "studentId": "student_id" }
```

or:

```json
{ "admissionNo": "A001" }
```

## Response

The response matches NFC/QR attendance:

```json
{
  "ok": true,
  "statusCode": 200,
  "message": "Attendance marked successfully.",
  "student": {
    "id": "student_id",
    "name": "Student Name",
    "admissionNo": "A001"
  },
  "status": "PRESENT",
  "source": "FINGERPRINT",
  "markedAt": "2026-07-23T08:02:05.000Z",
  "duplicate": false,
  "payment": {
    "status": "clear",
    "label": "Payments clear",
    "amountDue": 0
  }
}
```

Use a unique `eventId` for every machine event. Re-sending the same event returns the stored response and prevents duplicate processing.
