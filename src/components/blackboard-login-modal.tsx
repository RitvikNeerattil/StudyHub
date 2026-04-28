"use client";

import { useState } from "react";

type BlackboardLoginModalProps = {
  action: (formData: FormData) => Promise<void>;
  hasCredentials: boolean;
  username?: string;
  redirectTo: string;
};

export function BlackboardLoginModal({
  action,
  hasCredentials,
  username,
  redirectTo,
}: BlackboardLoginModalProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-full border border-sky-300/25 bg-[#102744] px-4 py-2 text-sm font-semibold text-sky-100 transition hover:border-sky-200 hover:text-white"
      >
        Blackboard Login
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#020617]/75 px-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-[1.75rem] border border-sky-300/20 bg-[#08172d] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.5)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.22em] text-sky-200">
                  Blackboard login
                </p>
                <h2 className="mt-2 text-2xl font-semibold tracking-tight text-white">
                  Sync credentials
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close Blackboard login"
                className="grid size-9 place-items-center rounded-full border border-sky-300/20 text-lg leading-none text-slate-300 transition hover:border-sky-200 hover:text-white"
              >
                x
              </button>
            </div>

            <p className="mt-3 text-sm leading-6 text-slate-300">
              {hasCredentials
                ? `Using ${username} for USC Blackboard sync.`
                : "Save your USC Blackboard login before running sync."}
            </p>

            <form action={action} className="mt-5 space-y-3">
              <input type="hidden" name="redirectTo" value={redirectTo} />
              <label className="block text-sm font-semibold text-slate-200">
                Username
                <input
                  name="blackboardUsername"
                  type="text"
                  defaultValue={username ?? ""}
                  autoComplete="username"
                  required
                  className="mt-2 w-full rounded-2xl border border-sky-300/20 bg-[#07101f] px-4 py-3 text-sm font-normal text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-sky-300"
                />
              </label>
              <label className="block text-sm font-semibold text-slate-200">
                Password
                <input
                  name="blackboardPassword"
                  type="password"
                  autoComplete="current-password"
                  required
                  placeholder={
                    hasCredentials ? "Enter a new password" : "Blackboard password"
                  }
                  className="mt-2 w-full rounded-2xl border border-sky-300/20 bg-[#07101f] px-4 py-3 text-sm font-normal text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-sky-300"
                />
              </label>
              <button className="w-full rounded-2xl bg-sky-300 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-sky-200">
                Save Blackboard credentials
              </button>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
