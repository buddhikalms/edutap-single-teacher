# EduTap

Self-hosted learning and tuition management for one private teacher, built with Next.js App Router, TypeScript, Tailwind CSS, Prisma, MySQL, NextAuth, Zod, Recharts, and TanStack Table.

Each installation has its own server/subdomain/database. The legacy `Institute` record is retained internally as one hidden workspace; there are no package limits, institute switching, or additional-teacher management flows.

## Folder Structure

```text
app/
  (auth)/
    login/page.tsx
    register/page.tsx
  (dashboard)/
    dashboard/page.tsx
    students/page.tsx
    students/[studentId]/page.tsx
    teachers/page.tsx
    teachers/[teacherId]/page.tsx
    classes/page.tsx
    classes/[classGroupId]/page.tsx
    enrollment/page.tsx
    attendance/page.tsx
    payments/page.tsx
    payments/dues/page.tsx
    payments/reports/page.tsx
    payments/students/[studentId]/page.tsx
    payments/receipts/[receiptId]/page.tsx
    layout.tsx
  api/
    attendance/
      nfc/route.ts
      qr/route.ts
    auth/
      [...nextauth]/route.ts
      register/route.ts
  error.tsx
  globals.css
  layout.tsx
components/
  auth/
  dashboard/
  layout/
  providers/
  students/
  ui/
lib/
  auth.ts
  prisma.ts
  rbac.ts
  utils.ts
  validations.ts
prisma/
  schema.prisma
  seed.ts
types/
  next-auth.d.ts
proxy.ts
```

## Setup

1. Install dependencies:

```bash
npm install
```

2. Create `.env` from `.env.example`:

```bash
cp .env.example .env
```

3. Create a MySQL database:

```sql
CREATE DATABASE edutap CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

4. Update `DATABASE_URL`:

```env
DATABASE_URL="mysql://root:password@localhost:3306/edutap"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="replace-with-a-long-random-secret"
```

5. Push the Prisma schema:

```bash
npm run prisma:generate
npm run prisma:push
```

6. Start the dev server and open the first-install wizard:

```bash
npm run dev
```

Visit `http://localhost:3000`. A fresh installation redirects to `/setup`, where the teacher creates their profile, branding, default location, and owner credentials. Setup also seeds grades from Pre School through Grade 11 and redirects to the teacher dashboard.

Uploaded profile photos, logos, and student images are stored in `public/uploads/images`. Ensure this directory is writable and persisted when deploying with containers or mounted storage. Supported formats are JPG, PNG, WebP, and GIF up to 5 MB.

## Prisma Commands

```bash
npm run prisma:generate
npm run prisma:push
npm run prisma:migrate
npm run prisma:studio
npm run seed
```

## First Version Includes

- Credentials authentication with NextAuth and bcrypt.
- One-time teacher owner setup wizard.
- Role-aware route protection through Next proxy.
- Premium dashboard shell with sidebar, top navbar, user menu, and search.
- Dashboard overview stats, recent activity, Recharts visualizations, loading UI, and error UI.
- Student management with list filters, add/edit/delete, profile pages, guardian details, NFC UID, QR code, assigned classes, payment summaries, and attendance summaries.
- Public teacher profile and editable teacher/brand settings.
- Independent Subject catalog with colors, icons, status, search, and linked class/course counts.
- Recurring class management with subject, grade, location, schedule, attendance, monthly/admission fees, and payment-start/free-period rules. Classes do not reference courses.
- Structured courses with independent access and pricing, modules, preview/lock rules, uploaded resources, recordings/papers, quizzes, manual unlocks, payments, and learner progress.
- Student browser/PWA portal at `/student/login` with Student ID/mobile/email login, dashboard, classes, courses and secure player, homework uploads, timed quizzes, attendance, payments/receipts, notifications, web push, and profile security.
- Enrollment management with manual assignment, bulk assignment, active/inactive status, and removal.
- Attendance management with active sessions, manual attendance, NFC UID marking, secure QR token marking, terminal UI, audit logs, and daily/class/student reports.
- Payment management with finance dashboard, student ledgers, due calculation, partial payments, printable receipts, reports, CSV export, and attendance payment-status integration.
- Data tables powered by TanStack Table.
- Prisma schema and seed data for institutes, branches, users, students, parents, teachers, courses, classes, enrollments, attendance, payments, and receipts.

## Attendance APIs

Mark attendance by NFC UID:

```http
POST /api/attendance/nfc
Content-Type: application/json

{
  "classGroupId": "class_id",
  "nfcUid": "NFC-DEMO-0001",
  "status": "PRESENT"
}
```

Mark attendance by secure QR token:

```http
POST /api/attendance/qr
Content-Type: application/json

{
  "classGroupId": "class_id",
  "token": "student_attendance_token",
  "status": "PRESENT"
}
```

After pulling schema changes, run:

```bash
npm run prisma:generate
npm run prisma:push
```
