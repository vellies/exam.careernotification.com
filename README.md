# VR TEST BATCH

Next.js + TypeScript + MongoDB Atlas full-stack app for VR TEST BATCH, following
[`CareerNotification_Complete_Scalable_Architecture_Plan.md`](./CareerNotification_Complete_Scalable_Architecture_Plan.md).

## Stack

- Next.js (App Router) + TypeScript
- Tailwind CSS v4 + shadcn/ui
- MongoDB Atlas via Mongoose (`src/lib/mongodb.ts`)
- Auth: bcrypt password hashing, JWT session cookies (`jose`), email verification + password
  reset via SMTP (`nodemailer`)

## Theming

Public pages and the student dashboard use a warm, colorful theme (orange primary, rounded
cards). The admin panel is scoped to a strict black-and-white theme via the `.theme-mono` CSS
class (see `app/globals.css`) applied in `components/layout/app-shell.tsx` and
`app/admin/login/page.tsx`. Both themes share the same component set — only the CSS custom
properties differ per scope.

## Getting started

```bash
npm install
cp .env.example .env.local   # set MONGODB_URI, EMAIL_*, AUTH_SECRET, APP_URL
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Creating the first admin account

Signup (`/signup`) always creates a **student** account. To create an admin login:

```bash
npm run create-admin -- --name="Admin Name" --email=admin@careernotification.com --password="StrongPass123!"
```

Admin accounts are pre-verified and can log in at `/admin/login`.

### Auth flow

- `/signup` → creates an unverified student account → sends a verification email
- `/api/auth/verify-email?token=...` → marks the account verified, redirects to `/login`
- `/login` → blocks login until the email is verified (with a resend-verification action)
- `/forgot-password` → `/reset-password?token=...` → password reset via emailed link
- `/admin/login` → separate endpoint (`/api/auth/admin-login`) that only accepts `role: "admin"`
  accounts
- `proxy.ts` (Next.js 16's renamed `middleware.ts`) protects `/dashboard/*` and `/admin/*`,
  redirecting unauthenticated/unauthorized requests to the right login page

## Structure

```text
app/
  (public)/      Marketing + exam/test-series/results public pages (colorful theme)
  (auth)/         Login/signup/forgot/reset pages (colorful theme, centered card layout)
  dashboard/      Student dashboard (colorful theme)
  admin/
    login/         Standalone admin login (black-and-white)
    (protected)/    Admin panel behind auth (black-and-white)
  api/            Route handlers (one folder per resource, including api/auth/*)

src/
  modules/        Domain modules (controller/service/repository per resource, added incrementally)
  lib/
    auth/           password.ts, tokens.ts, session.ts
    mongodb.ts, logger.ts, email.ts
  workers/         Background job stubs — unused until BullMQ is introduced
  middleware/      rate-limit/permissions stubs (route protection itself lives in proxy.ts)
  types/           Shared TypeScript types

proxy.ts          Route protection (Next 16 renamed middleware.ts → proxy.ts)
scripts/
  create-admin.mjs  CLI to create/promote an admin account
```

This is a working scaffold: auth, theming and routing are real; question bank, test engine and
payments are added incrementally per the phased plan in the architecture doc (section 68).
