# StudyHub

StudyHub is an LMS-integrated student productivity platform focused on courses,
assignments, deadlines, and AI-generated study planning.

## MVP

- Blackboard-ready dashboard for courses and assignment sync
- Persistent course and assignment data stored in PostgreSQL for production
- Account creation, sign-in, hashed session tokens, and secure cookies
- User-scoped courses and assignments
- User-scoped encrypted Blackboard and Gemini credential storage
- Database-backed login throttling
- Spring 2026 Blackboard course filtering
- Server actions for Blackboard sync and assignment status updates
- User-scoped LMS sync route handlers
- New accounts start without seeded coursework
- Priority queue for urgent work
- AI-style weekly planning surface
- Responsive UI for desktop and mobile

## Stack

- Next.js 16
- React 19
- TypeScript
- Tailwind CSS 4
- PostgreSQL via `pg`

## Run locally

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

If `DATABASE_URL` is not set during local development, the app uses
`data/studyhub.json` and `data/auth.json`. Production requires PostgreSQL and
will not fall back to local JSON.

Local JSON files can contain password hashes, session hashes, encrypted
Blackboard passwords, and encrypted Gemini keys. They are ignored by `.gitignore`
for new commits and should not be pushed to a hosted repo.

If `DATABASE_URL` is set, the app:

- connects to PostgreSQL
- creates or migrates the required tables
- stores users, hashed sessions, login attempts, courses, and assignments

Copy `.env.example` to `.env.local` and update the connection string to test
Postgres locally. Blackboard usernames and passwords are saved per StudyHub
account from the dashboard. Gemini API keys are saved per account from the grade
estimator. Set `STUDYHUB_CREDENTIAL_SECRET` to at least 32 random characters
before deployment so saved credentials can be encrypted and decrypted
consistently.

## Security model

- Passwords are hashed with versioned `scrypt` hashes and per-password salts.
- Session cookies are `HttpOnly`, `SameSite=Lax`, and `Secure` in production.
- Only a SHA-256 hash of the session token is stored in the database.
- Expired sessions are cleaned up during session reads and sign-ins.
- Sign-in failures are tracked in the database and temporarily locked after too
  many failed attempts.
- Blackboard passwords and Gemini API keys are encrypted server-side with
  `STUDYHUB_CREDENTIAL_SECRET`.
- Mutating server actions and API POST routes reject cross-origin requests.
- All data reads and writes are scoped to the signed-in user's ID.

## Current architecture

- App Router server-rendered dashboard
- Cookie session auth in `src/lib/auth.ts`
- USC Blackboard CAS connector in `src/lib/blackboard.ts`
- LMS payload wrapper in `src/lib/lms.ts`
- Storage switch in `src/lib/store.ts`
- JSON adapter in `src/lib/store-json.ts`
- PostgreSQL adapter in `src/lib/store-postgres.ts`
- Connection helper in `src/lib/db.ts`
- Server actions in `src/app/actions.ts`
- Route handlers in `src/app/api/*`

## Railway deployment

Railway config-as-code is included in `railway.json`.

1. Create a PostgreSQL service in Railway.
2. In the StudyHub app service, set:
   - `DATABASE_URL=${{Postgres.DATABASE_URL}}`
   - `STUDYHUB_CREDENTIAL_SECRET=<at least 32 random characters>`
   - `BLACKBOARD_BASE_URL=https://blackboard.sc.edu`
3. Deploy the Next.js app service.
4. Railway runs `npm run db:migrate` before deploy.
5. Railway starts the standalone Next server with `npm run start`.
6. Railway checks `/api/health` during deploy.

Useful local checks:

```bash
npm run lint
npm run build
npm run db:migrate
```

## Implemented API routes

- `GET /api/courses`
- `GET /api/assignments`
- `GET /api/health`
- `POST /api/gemini/syllabus`
- `GET /api/lms/blackboard/sync`
- `POST /api/lms/blackboard/sync`

Course, assignment, Gemini, and Blackboard routes require a signed-in user and
return only that user's data.

## Next build steps

- Add background jobs for scheduled Blackboard imports
