# Face-Recognition Attendance

EduTap face attendance is integrated as an additional attendance source. QR, NFC, bulk, and manual flows remain unchanged.

## Architecture

Supervised kiosk camera or student mobile camera -> Next.js protected APIs -> private FastAPI face service -> encrypted biometric template in MySQL -> existing attendance record and notification queue.

The browser never submits a trusted `faceMatched` flag. The backend creates a short-lived signed verification token only after the internal service returns successful liveness and one-to-one face matching.

For the staff kiosk, the browser submits only short-lived camera frames for one supervised student at a time. The Next.js server decrypts eligible class embeddings, sends them to the private face service for one-to-many comparison, applies liveness/quality/ambiguity thresholds, and creates attendance transactionally.

## Database

Run the migration:

```bash
npx prisma migrate deploy
npx prisma generate
```

The migration adds:

- `FACE` attendance source and search method.
- `PENDING_REVIEW` attendance status.
- Face settings on `InstituteSettings`.
- `StudentFaceProfile`, `BiometricConsent`, `FaceVerificationAttempt`, and `FaceVerificationToken`.
- Face attempt, confidence, and device columns on `AttendanceRecord`.
- `RecognitionDevice` for audited classroom camera/kiosk metadata.

## Environment

Set these before enabling the feature:

```env
FACE_SERVICE_INTERNAL_URL=http://face-service:8000
FACE_SERVICE_URL=http://face-service:8000
FACE_SERVICE_API_KEY=long-random-service-key
FACE_SERVICE_TOKEN=long-random-service-key
FACE_EMBEDDING_ENCRYPTION_KEY=base64-or-hex-32-byte-key
BIOMETRIC_ENCRYPTION_KEY=base64-or-hex-32-byte-key
FACE_VERIFICATION_TOKEN_SECRET=long-random-signing-secret-at-least-32-chars
FACE_ENCRYPTION_KEY_VERSION=v1
FACE_MATCH_THRESHOLD=0.82
FACE_AMBIGUITY_MARGIN=0.10
FACE_SCAN_COOLDOWN_MS=3500
NEXT_PUBLIC_FACE_SCAN_COOLDOWN_MS=3500
ATTENDANCE_LATE_GRACE_MINUTES=15
BIOMETRIC_RETENTION_DAYS=365
```

Keep `FACE_ATTENDANCE_ENABLED=false` until the service, HTTPS, database migration, and admin thresholds are ready.

## Local Service

```bash
cd face-service
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

For Docker:

```bash
docker compose -f docker-compose.face-attendance.yml up --build
```

Do not expose the service directly to the public internet. Route traffic only from the Next.js server over a private network and require `x-face-service-key`.

## Routes

Student:

- `/student/attendance/face`
- `GET /api/student/face/profile`
- `DELETE /api/student/face/profile`
- `POST /api/student/face/enrolment/start`
- `POST /api/student/face/enrolment/complete`
- `POST /api/student/face/verification/start`
- `POST /api/student/face/verification/complete`
- `GET /api/student/attendance/active-sessions`
- `POST /api/student/attendance/face/mark`
- `GET /api/student/attendance/face/status`

Admin:

- `/admin/settings/face-attendance`
- `/attendance/face`
- `/students/[studentId]/face`
- `GET /api/admin/face/settings`
- `PATCH /api/admin/face/settings`
- `POST /api/staff/students/[studentId]/face`
- `DELETE /api/staff/students/[studentId]/face`
- `GET /api/attendance/face/health`
- `POST /api/attendance/face/recognize`

## Staff Enrollment Workflow

1. Open a student profile and choose Face ID.
2. Confirm biometric authorization from the student or guardian.
3. Select the physical USB/web camera.
4. Capture exactly six samples: straight, left, right, up, down, and blink.
5. The server sends samples to the private service, rejects poor samples, encrypts the averaged embedding, and deletes raw frames after processing.
6. Staff can re-enroll or permanently delete the profile from the same page.

## Teacher Kiosk Workflow

1. Open `/attendance/face`.
2. Select the class and start today’s attendance session if needed.
3. Select the USB/web camera and start the preview.
4. Ask one student to stand in front of the camera.
5. Run one randomized challenge and scan.
6. Recognized students are marked once for the session. Unknown, ambiguous, duplicate, low-quality, and failed-liveness results do not create attendance.
7. Use the existing manual/NFC/QR terminal if camera or recognition is unavailable.

## Security Notes

- Use HTTPS in production; browsers require a secure context for camera access.
- Do not log face frames, embeddings, or service payloads.
- Keep biometric embeddings encrypted with AES-256-GCM.
- Rotate `FACE_EMBEDDING_ENCRYPTION_KEY` using `FACE_ENCRYPTION_KEY_VERSION`.
- The final mark endpoint consumes verification tokens atomically and relies on the existing unique attendance constraint.
- The supervised kiosk uses the existing `AttendanceRecord(sessionId, studentId)` unique constraint and never overwrites manual corrections.
- Failed recognition does not mark students absent.
- Keep the FastAPI service private; expose it only to the Next.js server and require `x-face-service-key`.
- Review InsightFace/ONNX model licenses before production deployment and keep model files out of Git unless licensing permits redistribution.

## Testing

```bash
npm run typecheck
npm run test:face-kiosk
python -m compileall face-service/app
```

Automated tests use synthetic vectors and mocked camera/service behavior; do not commit real face photographs or embeddings.

## Current Limitations

The FastAPI service includes a contract-compatible processing shell. Production deployments should replace `face_embedder.py` and detector/liveness internals with calibrated InsightFace/RetinaFace models and institute-approved threshold testing before enabling face attendance globally.
