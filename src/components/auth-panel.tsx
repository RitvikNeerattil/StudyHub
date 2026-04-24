type AuthPanelProps = {
  signInAction: (formData: FormData) => Promise<void>;
  signUpAction: (formData: FormData) => Promise<void>;
  error?: string;
};

export function AuthPanel({ signInAction, signUpAction, error }: AuthPanelProps) {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,#fef3c7_0%,#fff8eb_25%,#f7f5ef_60%,#eef4ff_100%)] text-slate-900">
      <div className="mx-auto grid min-h-screen max-w-6xl gap-8 px-5 py-8 lg:grid-cols-[1.15fr_0.85fr] lg:px-8">
        <section className="rounded-[2rem] border border-white/70 bg-white/80 p-8 shadow-[0_24px_80px_rgba(15,23,42,0.12)] backdrop-blur lg:p-10">
          <div className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-amber-200">
            StudyHub
            <span className="text-slate-300">Student workflow OS</span>
          </div>
          <h1 className="mt-6 max-w-2xl text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl">
            One place for Blackboard deadlines, manual tasks, and weekly study planning.
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg">
            Create an account to get a private dashboard with seeded demo data, manual
            course fallback, assignment tracking, and Railway-ready Postgres persistence.
          </p>

          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            <article className="rounded-[1.5rem] bg-slate-950 p-5 text-white">
              <p className="text-xs uppercase tracking-[0.18em] text-amber-200">Sync-ready</p>
              <p className="mt-3 text-lg font-semibold">Blackboard integration path</p>
              <p className="mt-2 text-sm leading-6 text-slate-300">
                Run the app today with manual fallback, then layer in LMS import routes.
              </p>
            </article>
            <article className="rounded-[1.5rem] bg-white p-5 shadow-[0_16px_30px_rgba(148,163,184,0.18)]">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Private data</p>
              <p className="mt-3 text-lg font-semibold text-slate-950">User-scoped dashboard</p>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Sessions, users, and coursework are isolated per account.
              </p>
            </article>
            <article className="rounded-[1.5rem] bg-white p-5 shadow-[0_16px_30px_rgba(148,163,184,0.18)]">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Deployable</p>
              <p className="mt-3 text-lg font-semibold text-slate-950">Railway-ready stack</p>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                JSON fallback locally, Postgres automatically in production.
              </p>
            </article>
          </div>
        </section>

        <section className="space-y-6">
          {error ? (
            <div className="rounded-[1.5rem] border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-700">
              {error}
            </div>
          ) : null}

          <div className="rounded-[1.75rem] border border-slate-200/70 bg-white/85 p-6 shadow-[0_18px_50px_rgba(148,163,184,0.16)]">
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-500">
              Sign in
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
              Continue your semester plan
            </h2>
            <form action={signInAction} className="mt-5 space-y-3">
              <input
                name="email"
                type="email"
                placeholder="Email"
                className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-950"
              />
              <input
                name="password"
                type="password"
                placeholder="Password"
                className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-950"
              />
              <button className="w-full rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800">
                Sign in
              </button>
            </form>
          </div>

          <div className="rounded-[1.75rem] border border-slate-200/70 bg-white/85 p-6 shadow-[0_18px_50px_rgba(148,163,184,0.16)]">
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-500">
              Create account
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
              Start with seeded demo coursework
            </h2>
            <form action={signUpAction} className="mt-5 space-y-3">
              <input
                name="name"
                placeholder="Full name"
                className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-950"
              />
              <input
                name="email"
                type="email"
                placeholder="Email"
                className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-950"
              />
              <input
                name="password"
                type="password"
                placeholder="Password"
                className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-950"
              />
              <button className="w-full rounded-2xl bg-amber-300 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-amber-200">
                Create account
              </button>
            </form>
          </div>
        </section>
      </div>
    </main>
  );
}
