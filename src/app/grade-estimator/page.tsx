import { AppTopBar } from "@/components/app-top-bar";
import { AuthPanel } from "@/components/auth-panel";
import { GradeEstimator } from "@/components/grade-estimator";
import {
  runBlackboardSyncAction,
  saveBlackboardCredentialsAction,
  saveGeminiApiKeyAction,
  signInAction,
  signOutAction,
  signUpAction,
} from "@/app/actions";
import { getCurrentUser } from "@/lib/auth";
import { enabledBlackboardTermName, visibleStudyHubData } from "@/lib/dashboard-filters";
import { readStudyHubData } from "@/lib/store";

export default async function GradeEstimatorPage(props: {
  searchParams?: Promise<{
    authError?: string;
    geminiError?: string;
    geminiStatus?: string;
    syncError?: string;
    syncStatus?: string;
  }>;
}) {
  const user = await getCurrentUser();
  const searchParams = props.searchParams ? await props.searchParams : undefined;
  const authError = searchParams?.authError;
  const geminiError = searchParams?.geminiError;
  const geminiStatus = searchParams?.geminiStatus;
  const syncError = searchParams?.syncError;
  const syncStatus = searchParams?.syncStatus;

  if (!user) {
    return (
      <AuthPanel
        signInAction={signInAction}
        signUpAction={signUpAction}
        error={authError}
      />
    );
  }

  const data = visibleStudyHubData(await readStudyHubData(user.id));
  const hasGeminiApiKey = Boolean(user.geminiApiKeyEncrypted);

  return (
    <>
      <AppTopBar
        currentPath="/grade-estimator"
        runBlackboardSyncAction={runBlackboardSyncAction}
        saveBlackboardCredentialsAction={saveBlackboardCredentialsAction}
        signOutAction={signOutAction}
        user={user}
      />
      <main className="min-h-screen bg-[radial-gradient(circle_at_top,#12315f_0%,#071a34_36%,#061225_72%,#030814_100%)] text-slate-100">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-5 py-8 sm:px-8 lg:px-10">
          <section className="overflow-hidden rounded-[2rem] border border-sky-300/15 bg-[#0a1830]/90 p-6 shadow-[0_24px_80px_rgba(0,0,0,0.38)] backdrop-blur lg:p-8">
            <div className="grid gap-6 lg:grid-cols-[1.4fr_0.8fr] lg:items-start">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full bg-sky-300/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-sky-200 ring-1 ring-sky-300/20">
                  Grade Estimator
                  <span className="text-sky-200/70">Gemini assisted</span>
                </div>
                <h1 className="mt-6 max-w-3xl text-4xl font-semibold tracking-tight text-white sm:text-5xl">
                  Model the grade you can still earn.
                </h1>
                <p className="mt-4 max-w-2xl text-base leading-7 text-slate-300 sm:text-lg">
                  Use your own Gemini API key to read a syllabus grading section,
                  then add gradebook scores and test what the rest of the course
                  needs to average.
                </p>
              </div>

              <section className="rounded-[1.5rem] border border-sky-300/15 bg-[#07101f] p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.22em] text-sky-200">
                      Gemini API key
                    </p>
                    <p className="mt-2 text-sm leading-6 text-slate-300">
                      {hasGeminiApiKey
                        ? "A Gemini key is saved for this account."
                        : "Save a Gemini key to enable syllabus analysis."}
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      hasGeminiApiKey
                        ? "bg-emerald-400/15 text-emerald-100 ring-1 ring-emerald-300/25"
                        : "bg-amber-400/15 text-amber-100 ring-1 ring-amber-300/25"
                    }`}
                  >
                    {hasGeminiApiKey ? "Saved" : "Needed"}
                  </span>
                </div>
                <form action={saveGeminiApiKeyAction} className="mt-4 space-y-3">
                  <input type="hidden" name="redirectTo" value="/grade-estimator" />
                  <input
                    name="geminiApiKey"
                    type="password"
                    autoComplete="off"
                    required
                    placeholder={
                      hasGeminiApiKey ? "Replace saved Gemini key" : "Gemini API key"
                    }
                    className="w-full rounded-2xl border border-sky-300/20 bg-[#061225] px-4 py-3 text-sm text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-sky-300"
                  />
                  <button className="w-full rounded-2xl bg-sky-300 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-sky-200">
                    Save Gemini API key
                  </button>
                </form>
              </section>
            </div>

            <div className="mt-5 space-y-3">
              {geminiStatus ? (
                <p className="rounded-2xl border border-emerald-300/30 bg-emerald-400/10 px-4 py-3 text-sm font-semibold text-emerald-100">
                  {geminiStatus}
                </p>
              ) : null}
              {geminiError ? (
                <p className="rounded-2xl border border-rose-300/30 bg-rose-400/10 px-4 py-3 text-sm font-semibold text-rose-100">
                  {geminiError}
                </p>
              ) : null}
              {syncStatus ? (
                <p className="rounded-2xl border border-emerald-300/30 bg-emerald-400/10 px-4 py-3 text-sm font-semibold text-emerald-100">
                  {syncStatus}
                </p>
              ) : null}
              {syncError ? (
                <p className="rounded-2xl border border-rose-300/30 bg-rose-400/10 px-4 py-3 text-sm font-semibold text-rose-100">
                  {syncError}
                </p>
              ) : null}
            </div>
          </section>

          <div className="rounded-[1.5rem] border border-sky-300/15 bg-[#07101f]/75 px-5 py-4 text-sm leading-6 text-slate-300">
            Estimator courses are scoped to {enabledBlackboardTermName} Blackboard
            data. Sync Blackboard first if a course is missing.
          </div>

          <GradeEstimator
            courses={data.courses}
            hasGeminiApiKey={hasGeminiApiKey}
          />
        </div>
      </main>
    </>
  );
}
