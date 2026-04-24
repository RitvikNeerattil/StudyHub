# StudyHub

StudyHub is an LMS-integrated student productivity platform focused on courses,
assignments, deadlines, and AI-generated study planning.

## MVP

- Blackboard-ready dashboard for courses and assignment sync
- Persistent course and assignment data stored in Postgres or local JSON
- Account creation, sign-in, and cookie-based sessions
- User-scoped courses and assignments
- Server actions for adding courses, adding assignments, and updating status
- Manual fallback workflow for assignments and deadlines
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

If `DATABASE_URL` is not set, the app uses `data/studyhub.json`.

If `DATABASE_URL` is set, the app:

- connects to PostgreSQL
- creates the required tables automatically
- creates user, session, course, and assignment tables automatically
- seeds each new account from `data/studyhub.json`

Copy `.env.example` to `.env.local` and update the connection string to test Postgres locally.

## Current architecture

- App Router server-rendered dashboard
- Cookie session auth in `src/lib/auth.ts`
- Storage switch in `src/lib/store.ts`
- JSON adapter in `src/lib/store-json.ts`
- PostgreSQL adapter in `src/lib/store-postgres.ts`
- Connection helper in `src/lib/db.ts`
- Server actions in `src/app/actions.ts`

## Railway deployment

1. Create a PostgreSQL service in Railway.
2. Add the generated `DATABASE_URL` to the StudyHub app service.
3. Deploy the Next.js app service.
4. On first boot, StudyHub will create tables and seed initial data automatically.

## Next build steps

- Add route handlers for LMS sync and manual assignment CRUD
- Scope LMS imports to the signed-in user
- Wire AI planning to OpenAI or Gemini
- Add background jobs for scheduled Blackboard imports
