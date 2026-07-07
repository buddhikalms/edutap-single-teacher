# Security Audit Report

Date: 2026-07-07

## Summary

Completed a security pass across dependencies, environment variables, authentication, authorization, API routes, database access, uploads, XSS, CSRF/CORS posture, and runtime headers.

No critical or high `npm audit` vulnerabilities were found. Several practical hardening fixes were applied: security headers, rate limiting, stronger auth secret validation, removal of committed OAuth placeholder credentials, authenticated image uploads, and safer public upload file serving.

## Vulnerabilities Found

- `.env.example` contained real-looking Zoom OAuth credentials. These were removed and replaced with empty placeholders.
- Generic image uploads were publicly reachable after setup. The endpoint now allows uploads only for the first-install state or authenticated dashboard/settings users.
- Login, registration, enrollment, payment-slip upload, and export endpoints had no application-level rate limiting. In-memory rate limiting was added to sensitive routes.
- NextAuth did not explicitly set or validate `NEXTAUTH_SECRET` / `AUTH_SECRET`. A runtime check now enforces at least 32 characters outside production builds.
- Public uploaded-file serving accepted any known public upload folder path and could fall back to `application/octet-stream`. It now rejects unsafe path segments, unknown extensions, and executable-like extensions.
- Security headers were minimal. Global headers now include frame, content sniffing, referrer, permissions, and a conservative CSP.

## Dependency Audit

- `npm audit`: 0 critical, 0 high, 5 moderate, 1 low.
- High/critical fixes: none required.
- Moderate/low advisories remain because the suggested npm fixes are unsafe or non-actionable in this app context, including major downgrades for `next`, `next-auth`, or `exceljs`.
- `npm outdated` found available updates, including patch updates for `next`, `eslint-config-next`, `postcss`, `react-hook-form`, and Radix packages, plus major updates for several libraries.
- `npx depcheck --json` reported `autoprefixer` and `postcss` as unused, but `postcss.config.mjs` uses `autoprefixer`; no dependencies were removed.

## Environment Variables

- `.env` is ignored and not tracked by Git.
- `.env.example` remains tracked but no longer contains Zoom credentials.
- Server-only variables reviewed include database, NextAuth/Auth secret, provider encryption key, VAPID private key, Google/Zoom client secrets, upload roots, and payment slip storage.
- Frontend-exposed variables use `NEXT_PUBLIC_` only for public VAPID key and payment slip max size.
- Local `NEXTAUTH_SECRET` is present and at least 32 characters based on non-secret inspection. Rotate it before production if it was ever shared or copied from a template.

## Fixes Applied

- Added `lib/rate-limit.ts` with a small in-memory limiter and `Retry-After` responses.
- Added rate limiting to:
  - NextAuth credentials login
  - mobile admin login
  - parent mobile login
  - student mobile login
  - student mobile registration
  - public enrollment requests
  - Google enrollment completion
  - family payment-slip resubmission
  - card print export
  - image upload
- Added global security headers in `next.config.mjs`:
  - `X-Frame-Options: DENY`
  - `X-Content-Type-Options: nosniff`
  - `Referrer-Policy: strict-origin-when-cross-origin`
  - `Permissions-Policy`
  - `Content-Security-Policy`
- Added explicit NextAuth secret validation in `lib/auth.ts`.
- Removed Zoom OAuth values from `.env.example`.
- Required authenticated dashboard/settings access for image uploads after initial setup.
- Hardened `/api/uploads/files/[...path]` path and extension handling.

## Files Changed

- `.env.example`
- `next.config.mjs`
- `lib/auth.ts`
- `lib/rate-limit.ts`
- `app/api/uploads/images/route.ts`
- `app/api/uploads/files/[...path]/route.ts`
- `app/api/mobile/auth/login/route.ts`
- `app/api/parent/auth/login/route.ts`
- `app/api/student-mobile/auth/login/route.ts`
- `app/api/student-mobile/auth/register/route.ts`
- `app/api/public/enrollment-requests/route.ts`
- `app/api/public/google-enrollment/route.ts`
- `app/api/family/enrollment-payment-slip/route.ts`
- `app/api/card-print-export/batches/[batchId]/export/route.ts`

## Areas Reviewed

- Authentication: NextAuth credentials and Google provider, session/JWT callbacks, password hashing with bcrypt, mobile token storage.
- Authorization: dashboard middleware, portal/student server layouts, family/student ownership checks, card/export role checks, payment slip access checks.
- API validation: many API routes already use Zod or domain validation helpers. Newly touched sensitive routes retained existing validation and gained throttling.
- Database security: no raw SQL usage found. Reviewed Prisma queries for institute/user scoping in sensitive paths.
- XSS: no `dangerouslySetInnerHTML` or direct `innerHTML` usage found.
- CSRF/CORS: no broad CORS headers found. NextAuth handles its own CSRF. Same-origin headers and CSP were added globally.
- File upload: payment slips already validate type, size, signatures, and private storage; generic image uploads now require auth/rate limiting and already validate signatures.

## Verification

- `npm audit --json`: completed, no high/critical vulnerabilities.
- `npm outdated --json`: completed.
- `npx depcheck --json`: completed; no removals made due PostCSS false positive.
- `npm run lint`: passed with 22 existing warnings.
- `npm run build`: passed. Build still reports one Turbopack tracing warning involving filesystem path tracing from upload-related code.

## Remaining Risks

- In-memory rate limiting is per-process only. Use Redis, Upstash, a WAF, or platform rate limiting for multi-instance production deployments.
- Moderate npm advisories remain. Revisit after compatible upstream releases or planned framework upgrades.
- CSP currently allows `'unsafe-inline'` and `'unsafe-eval'` for Next.js compatibility. Tighten after testing nonce/hash-based scripts and production build behavior.
- `PAYMENT_SLIP_STORAGE_DIR` should be outside any public web root in production.
- Public upload folders include homework submissions by design. Confirm whether all homework attachments should be public or move sensitive submissions behind authorized APIs.
- Demo credentials remain in seed/demo documentation. They should never be enabled in production data.

## Recommended Next Steps

1. Rotate any real Zoom credentials that were committed in `.env.example`.
2. Replace in-memory rate limiting with shared production storage.
3. Upgrade safe patch/minor dependencies in a separate maintenance pass, then rerun `npm audit`.
4. Review public homework attachment access rules with product requirements.
5. Add automated tests for rate-limited routes, upload rejection cases, and payment slip authorization.
