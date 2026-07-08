# Security Audit Report

Date: 2026-07-08

## Executive Summary

EduTap Single Teacher Edition was audited across authentication, authorization, NFC/QR attendance, upload handling, payment slips, course resources, OAuth credentials, PWA headers, notification targeting, abuse controls, deployment settings, and audit logging.

The highest-risk issues found in this pass were public serving of homework and student submission uploads, inconsistent upload type validation, insufficient audit coverage for security-sensitive events, and several production hardening gaps. Fixes were applied without removing features.

## Critical Findings

- Public homework submission files could be fetched through the generic upload route if the URL was known.
  - Fixed by requiring teacher/student/mobile authorization for `homework` and `homework-submissions` files.
- Mobile homework submission uploads stored files outside the student-scoped folder and accepted weak extension fallbacks.
  - Fixed by storing under `homework-submissions/{homeworkId}/{studentId}` and enforcing shared file policy validation.

## High Findings

- Upload validation was inconsistent across homework, mobile homework, and course resources.
  - Fixed with shared extension, MIME, executable-blocklist, file-signature checks, random filenames, and a virus-scan hook.
- Course resource serving did not explicitly enforce institute scoping and lacked content-type/private-cache headers.
  - Fixed by requiring resource institute match and serving with `Content-Type`, `nosniff`, and `private, no-store`.
- Authentication audit coverage was incomplete for login success/failure.
  - Fixed by adding `SecurityAuditLog` and logging credential/Google login outcomes.
- New password creation allowed 8-character passwords in several setup paths.
  - Fixed by adding a stronger password policy for new registrations, student activation, enrollment requests, and student password changes.

## Medium Findings

- Mobile homework attachment upload lacked per-student upload rate limiting.
  - Fixed with route-level rate limiting.
- Security headers lacked HSTS.
  - Fixed with `Strict-Transport-Security`.
- Generic upload access denials were not logged.
  - Fixed with security audit entries for denied protected upload access.
- Attendance high-traffic handling needed production-grade transaction/idempotency/queue controls.
  - Fixed in the previous pass with transactional marking, `ScanRequestLog`, reader devices, rate limiting, queue-backed notifications, and monitoring.

## Low Findings

- CSP still allows `unsafe-inline` and `unsafe-eval` for current Next.js compatibility.
  - Accepted for now; tighten after nonce/hash testing.
- In-memory rate limiting remains process-local.
  - Use Redis/WAF/platform rate limits in production.
- Lint warnings remain in unrelated legacy UI files.
  - No security impact identified in this pass.

## Fixes Applied

- Added `SecurityAuditLog` model and migration SQL.
- Added `lib/security-audit.ts`.
- Added `lib/file-security.ts` with shared upload policies and malware-scan hook.
- Hardened protected upload serving for homework and submissions.
- Hardened mobile homework attachment upload.
- Hardened student web homework upload.
- Hardened teacher homework attachment upload.
- Hardened course resource upload and serving.
- Added stronger password validation on new-password flows.
- Added login success/failure security audit logs.
- Added explicit JWT session max age/update age.
- Added HSTS and adjusted Permissions-Policy to preserve same-origin camera/microphone features.

## Changed Files

- `.env.example`
- `SECURITY_AUDIT_REPORT.md`
- `next.config.mjs`
- `package.json`
- `package-lock.json`
- `prisma/schema.prisma`
- `prisma/migrations/20260708010000_high_traffic_attendance/migration.sql`
- `ecosystem.config.cjs`
- `docs/production-attendance-deployment.md`
- `lib/auth.ts`
- `lib/file-security.ts`
- `lib/security-audit.ts`
- `lib/rate-limit.ts`
- `lib/validations.ts`
- `lib/attendance.ts`
- `lib/attendance-notification-queue.ts`
- `lib/student-attendance-notifications.ts`
- `app/api/uploads/files/[...path]/route.ts`
- `app/api/student-mobile/homework/[homeworkId]/attachment/route.ts`
- `app/api/student-mobile/homework/[homeworkId]/route.ts`
- `app/api/student-web/resources/[resourceId]/route.ts`
- `app/api/public/enrollment-requests/route.ts`
- `app/api/student-auth/activation/complete/route.ts`
- `app/(student-portal)/student/actions.ts`
- `app/(dashboard)/homework/actions.ts`
- `app/(dashboard)/dashboard/courses/actions.ts`
- `app/(dashboard)/admin/page.tsx`
- `app/api/attendance/nfc/route.ts`
- `app/api/attendance/qr/route.ts`
- `components/attendance/attendance-terminal.tsx`
- `scripts/load-test-attendance.mjs`
- `scripts/process-notification-queue.ts`

## Production Security Checklist

- Run `npx prisma migrate deploy` before production start.
- Rotate all production secrets: `NEXTAUTH_SECRET`, `PROVIDER_CREDENTIAL_KEY`, VAPID private key, OAuth secrets, SMS credentials, database password.
- Use HTTPS only and keep HSTS enabled.
- Use a least-privilege MySQL user; do not use root.
- Set `DATABASE_URL` with production pool settings, for example `connection_limit=20&pool_timeout=20`.
- Put private payment slip storage outside public web roots.
- Configure Redis/BullMQ or platform/WAF rate limiting for multi-instance deployments.
- Run the notification worker separately from the web process.
- Register active reader devices before enabling reader validation.
- Disable demo seed credentials in production.
- Protect upload directories from direct Nginx/static serving.
- Back up MySQL and private upload storage.
- Monitor `SecurityAuditLog`, `ScanRequestLog`, `CardScanLog`, and `NotificationQueue`.
- Revisit CSP to remove `unsafe-inline` and `unsafe-eval` after nonce/hash testing.
- Add a real malware scanner behind `scanFileForViruses`.

## Verification

- `npx prisma generate`: passed after stopping the local dev server/worker that held the Prisma DLL lock.
- `npx prisma validate`: passed.
- `npm run typecheck`: passed.
- `npm run lint`: passed with existing warnings only.

