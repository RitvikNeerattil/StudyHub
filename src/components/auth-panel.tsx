type AuthPanelProps = {
  signInAction: (formData: FormData) => Promise<void>;
  signUpAction: (formData: FormData) => Promise<void>;
  error?: string;
};

export function AuthPanel({ signInAction, signUpAction, error }: AuthPanelProps) {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,#12315f_0%,#071a34_36%,#061225_72%,#030814_100%)] text-slate-100">
      <div className="mx-auto grid min-h-screen max-w-6xl gap-8 px-5 py-8 lg:grid-cols-[1.15fr_0.85fr] lg:px-8">
        <section className="rounded-[2rem] border border-sky-300/15 bg-[#0a1830]/90 p-8 shadow-[0_24px_80px_rgba(0,0,0,0.38)] backdrop-blur lg:p-10">
          <div className="inline-flex items-center gap-2 rounded-full bg-sky-300/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-sky-200 ring-1 ring-sky-300/20">
            StudyHub
            <span className="text-sky-200/70">Student workflow OS</span>
          </div>
          <h1 className="mt-6 max-w-2xl text-4xl font-semibold tracking-tight text-white sm:text-5xl">
            One place for Blackboard courses, deadlines, and weekly study planning.
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-slate-300 sm:text-lg">
            Create an account to get a private dashboard that stays empty until
            Blackboard sync loads your current courses and assignments.
          </p>

          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            <article className="rounded-[1.5rem] border border-sky-300/15 bg-[#07101f] p-5 text-white shadow-inner">
              <p className="text-xs uppercase tracking-[0.18em] text-sky-200">Sync-ready</p>
              <p className="mt-3 text-lg font-semibold">Blackboard integration path</p>
              <p className="mt-2 text-sm leading-6 text-slate-300">
                Pull current course and assignment data from the USC Blackboard flow.
              </p>
            </article>
            <article className="rounded-[1.5rem] border border-sky-300/15 bg-white/5 p-5">
              <p className="text-xs uppercase tracking-[0.18em] text-sky-200">Private data</p>
              <p className="mt-3 text-lg font-semibold text-white">User-scoped dashboard</p>
              <p className="mt-2 text-sm leading-6 text-slate-300">
                Sessions, users, and coursework are isolated per account.
              </p>
            </article>
            <article className="rounded-[1.5rem] border border-sky-300/15 bg-white/5 p-5">
              <p className="text-xs uppercase tracking-[0.18em] text-sky-200">Deployable</p>
              <p className="mt-3 text-lg font-semibold text-white">Railway-ready stack</p>
              <p className="mt-2 text-sm leading-6 text-slate-300">
                JSON fallback locally, Postgres automatically in production.
              </p>
            </article>
          </div>
        </section>

        <section className="space-y-6">
          {error ? (
            <div className="rounded-[1.5rem] border border-rose-300/30 bg-rose-400/10 px-5 py-4 text-sm text-rose-100">
              {error}
            </div>
          ) : null}

          <div className="rounded-[1.75rem] border border-sky-300/15 bg-[#0a1830]/90 p-6 shadow-[0_18px_50px_rgba(0,0,0,0.28)]">
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-sky-200">
              Sign in
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-white">
              Continue your semester plan
            </h2>
            <form action={signInAction} className="mt-5 space-y-3">
              <input
                name="email"
                type="email"
                placeholder="Email"
                className="w-full rounded-2xl border border-sky-300/20 bg-[#07101f] px-4 py-3 text-sm text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-sky-300"
              />
              <input
                name="password"
                type="password"
                placeholder="Password"
                className="w-full rounded-2xl border border-sky-300/20 bg-[#07101f] px-4 py-3 text-sm text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-sky-300"
              />
              <button className="w-full rounded-2xl bg-sky-300 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-sky-200">
                Sign in
              </button>
            </form>
          </div>

          <div className="rounded-[1.75rem] border border-sky-300/15 bg-[#0a1830]/90 p-6 shadow-[0_18px_50px_rgba(0,0,0,0.28)]">
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-sky-200">
              Create account
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-white">
              Start with a clean dashboard
            </h2>
            <form action={signUpAction} className="mt-5 space-y-3">
              <input
                name="name"
                placeholder="Full name"
                className="w-full rounded-2xl border border-sky-300/20 bg-[#07101f] px-4 py-3 text-sm text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-sky-300"
              />
              <input
                name="email"
                type="email"
                placeholder="Email"
                className="w-full rounded-2xl border border-sky-300/20 bg-[#07101f] px-4 py-3 text-sm text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-sky-300"
              />
              <input
                name="password"
                type="password"
                placeholder="Password, 12+ characters"
                className="w-full rounded-2xl border border-sky-300/20 bg-[#07101f] px-4 py-3 text-sm text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-sky-300"
              />
              <button className="w-full rounded-2xl border border-sky-300/40 bg-[#102744] px-4 py-3 text-sm font-semibold text-sky-100 transition hover:border-sky-200 hover:text-white">
                Create account
              </button>
            </form>
          </div>
        </section>
      </div>
    </main>
  );
}
