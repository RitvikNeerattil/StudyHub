# StudyHub

StudyHub is an LMS-integrated student productivity platform focused on courses,
assignments, deadlines, and AI-generated study planning.

## MVP

- Blackboard-ready dashboard for courses and assignment sync
- Persistent course and assignment data stored in a local JSON file
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

## Run locally

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Current architecture

- App Router server-rendered dashboard
- File-backed MVP store in `data/studyhub.json`
- Server actions in `src/app/actions.ts`
- Shared data access helpers in `src/lib/store.ts`

## Next build steps

- Add authentication
- Replace the JSON store with PostgreSQL
- Add route handlers for LMS sync and manual assignment CRUD
- Wire AI planning to OpenAI or Gemini
- Add background jobs for scheduled Blackboard imports
