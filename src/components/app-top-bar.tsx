import Link from "next/link";

import { BlackboardLoginModal } from "@/components/blackboard-login-modal";
import type { User } from "@/lib/types";

type AppTopBarProps = {
  user: Pick<
    User,
    "blackboardPasswordEncrypted" | "blackboardUsername" | "email" | "name"
  >;
  currentPath: string;
  runBlackboardSyncAction: (formData?: FormData) => Promise<void>;
  saveBlackboardCredentialsAction: (formData: FormData) => Promise<void>;
  signOutAction: () => Promise<void>;
};

export function AppTopBar({
  user,
  currentPath,
  runBlackboardSyncAction,
  saveBlackboardCredentialsAction,
  signOutAction,
}: AppTopBarProps) {
  const hasBlackboardCredentials = Boolean(
    user.blackboardUsername && user.blackboardPasswordEncrypted,
  );

  return (
    <header className="sticky top-0 z-40 border-b border-sky-300/10 bg-[#061225]/92 backdrop-blur">
      <div className="mx-auto flex min-h-14 w-full max-w-7xl flex-wrap items-center gap-3 px-5 py-2 sm:px-8 lg:px-10">
        <Link
          href="/"
          className="rounded-full px-1 text-sm font-semibold uppercase tracking-[0.24em] text-sky-200 transition hover:text-white"
        >
          StudyHub
        </Link>
        <nav className="flex items-center gap-2">
          <Link
            href="/grade-estimator"
            className="rounded-full border border-sky-300/25 bg-[#102744] px-4 py-2 text-sm font-semibold text-sky-100 transition hover:border-sky-200 hover:text-white"
          >
            Grade Estimator
          </Link>
        </nav>
        <div className="ml-auto flex flex-wrap items-center justify-end gap-2">
          <span className="hidden text-sm text-slate-400 md:inline">
            {user.email}
          </span>
          <form action={runBlackboardSyncAction}>
            <input type="hidden" name="redirectTo" value={currentPath} />
            <button className="rounded-full bg-sky-300 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-sky-200">
              Run Blackboard Sync
            </button>
          </form>
          <BlackboardLoginModal
            action={saveBlackboardCredentialsAction}
            hasCredentials={hasBlackboardCredentials}
            redirectTo={currentPath}
            username={user.blackboardUsername}
          />
          <form action={signOutAction}>
            <button className="rounded-full border border-sky-300/25 bg-[#102744] px-4 py-2 text-sm font-semibold text-sky-100 transition hover:border-sky-200 hover:text-white">
              Sign out
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
