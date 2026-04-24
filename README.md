# StudyHub

StudyHub is an LMS-integrated student productivity platform focused on courses,
assignments, deadlines, and AI-generated study planning.

## MVP

- Blackboard-ready dashboard for courses and assignment sync
- Manual fallback workflow for assignments and deadlines
- Priority queue for urgent work
- AI-generated weekly planning surface
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

## Next build steps

- Add authentication
- Persist courses and assignments in PostgreSQL
- Add API routes for LMS sync and manual assignment CRUD
- Wire AI planning to OpenAI or Gemini
- Add background jobs for scheduled Blackboard imports
