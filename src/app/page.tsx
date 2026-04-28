import {
  runBlackboardSyncAction,
  saveBlackboardCredentialsAction,
  signInAction,
  signOutAction,
  signUpAction,
  updateAssignmentStatusAction,
} from "@/app/actions";
import { AppTopBar } from "@/components/app-top-bar";
import { AuthPanel } from "@/components/auth-panel";
import { getCurrentUser } from "@/lib/auth";
import Link from "next/link";
import {
  enabledBlackboardTermName,
  visibleStudyHubData,
} from "@/lib/dashboard-filters";
import { readStudyHubData } from "@/lib/store";
import type { Assignment, AssignmentStatus } from "@/lib/types";

const statuses: AssignmentStatus[] = [
  "Not started",
  "In progress",
  "Needs review",
  "Submitted",
  "Waiting on team",
  "Draft ready",
];

function badgeClasses(priority: Assignment["priority"]) {
  if (priority === "High") {
    return "bg-rose-500/15 text-rose-200 ring-rose-400/30";
  }

  if (priority === "Medium") {
    return "bg-amber-400/15 text-amber-200 ring-amber-300/30";
  }

  return "bg-emerald-400/15 text-emerald-200 ring-emerald-300/30";
}

function dueLabel(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function hoursPlanned(assignments: Assignment[]) {
  return assignments
    .reduce((sum, assignment) => {
      if (assignment.priority === "High") {
        return sum + 2.5;
      }

      if (assignment.priority === "Medium") {
        return sum + 1.5;
      }

      return sum + 1;
    }, 0)
    .toFixed(1);
}

export default async function Home(props: {
  searchParams?: Promise<{
    authError?: string;
    courseId?: string;
    syncError?: string;
    syncStatus?: string;
  }>;
}) {
  const user = await getCurrentUser();
  const searchParams = props.searchParams ? await props.searchParams : undefined;
  const authError = searchParams?.authError;
  const requestedCourseId = searchParams?.courseId ?? "all";
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
  const courses = data.courses;
  const selectedCourseId = courses.some(
    (course) => course.id === requestedCourseId,
  )
    ? requestedCourseId
    : "all";
  const assignments =
    selectedCourseId === "all"
      ? data.assignments
      : data.assignments.filter(
          (assignment) => assignment.courseId === selectedCourseId,
        );
  const currentPath =
    selectedCourseId === "all"
      ? "/"
      : `/?courseId=${encodeURIComponent(selectedCourseId)}`;
  const selectedCourse = courses.find((course) => course.id === selectedCourseId);
  const queueScope = selectedCourse
    ? `${selectedCourse.code} - ${selectedCourse.name}`
    : "All classes";
  const blackboardCourses = courses.filter(
    (course) => course.source === "Blackboard",
  );
  const courseMap = new Map(courses.map((course) => [course.id, course]));
  const urgentAssignments = assignments;

  const plan = urgentAssignments.slice(0, 3).map((assignment, index) => ({
    day: index === 0 ? "Today" : index === 1 ? "Next up" : "After that",
    focus: assignment.title,
    duration:
      assignment.priority === "High"
        ? "2h 30m"
        : assignment.priority === "Medium"
          ? "1h 30m"
          : "1h 00m",
    note:
      assignment.description ||
      "Review the assignment requirements and block focused work time.",
  }));

  return (
    <>
      <AppTopBar
        currentPath={currentPath}
        runBlackboardSyncAction={runBlackboardSyncAction}
        saveBlackboardCredentialsAction={saveBlackboardCredentialsAction}
        signOutAction={signOutAction}
        user={user}
      />
      <main className="min-h-screen bg-[radial-gradient(circle_at_top,#12315f_0%,#071a34_36%,#061225_72%,#030814_100%)] text-slate-100">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-10 px-5 py-8 sm:px-8 lg:px-10">
        <section className="overflow-hidden rounded-[2rem] border border-sky-300/15 bg-[#0a1830]/90 shadow-[0_24px_80px_rgba(0,0,0,0.38)] backdrop-blur">
          <div className="grid gap-8 px-6 py-8 lg:grid-cols-[1.6fr_0.9fr] lg:px-10">
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2 rounded-full bg-sky-300/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-sky-200 ring-1 ring-sky-300/20">
                StudyHub
                <span className="text-sky-200/70">Private semester dashboard</span>
              </div>
              <div className="space-y-4">
                <h1 className="max-w-3xl text-4xl font-semibold tracking-tight text-white sm:text-5xl">
                  Welcome back, {user.name.split(" ")[0]}.
                </h1>
                <p className="max-w-2xl text-base leading-7 text-slate-300 sm:text-lg">
                  Your assignments, courses, and sync activity are scoped to your
                  account. Coursework is loaded from {enabledBlackboardTermName}{" "}
                  Blackboard courses and refreshed on demand.
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <Link
                  href="/grade-estimator"
                  className="rounded-full bg-sky-300 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-sky-200"
                >
                  Open Grade Estimator
                </Link>
                <a
                  href="#planner"
                  className="rounded-full border border-sky-300/25 bg-[#102744] px-5 py-3 text-sm font-semibold text-sky-100 transition hover:border-sky-200 hover:text-white"
                >
                  View weekly plan
                </a>
              </div>
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

            <div className="rounded-[1.75rem] border border-sky-300/15 bg-[#07101f] p-5 text-white shadow-inner">
              <div className="flex items-center justify-between text-sm text-slate-300">
                <span>Live workload summary</span>
                <span>{courses.length} active courses</span>
              </div>
              <div className="mt-5 space-y-4">
                <div className="rounded-2xl border border-sky-300/10 bg-sky-300/8 p-4">
                  <p className="text-sm uppercase tracking-[0.2em] text-sky-200">
                    Recommended today
                  </p>
                  <p className="mt-2 text-2xl font-semibold">
                    {urgentAssignments.slice(0, 3).length} focused blocks
                  </p>
                  <p className="mt-2 text-sm leading-6 text-slate-300">
                    Prioritize the earliest due Blackboard items, then keep
                    statuses updated as work moves forward.
                  </p>
                </div>
                <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
                  <article className="rounded-2xl border border-sky-300/15 bg-white/5 p-4">
                    <p className="text-sm text-slate-300">Assignments due soon</p>
                    <p className="mt-2 text-3xl font-semibold">
                      {urgentAssignments.length}
                    </p>
                    <p className="mt-2 text-sm leading-6 text-slate-400">
                      Open work across synced Blackboard assignments.
                    </p>
                  </article>
                  <article className="rounded-2xl border border-sky-300/15 bg-white/5 p-4">
                    <p className="text-sm text-slate-300">Hours planned</p>
                    <p className="mt-2 text-3xl font-semibold">
                      {hoursPlanned(urgentAssignments)}
                    </p>
                    <p className="mt-2 text-sm leading-6 text-slate-400">
                      Estimated from priority weightings in the MVP planner.
                    </p>
                  </article>
                  <article className="rounded-2xl border border-sky-300/15 bg-white/5 p-4">
                    <p className="text-sm text-slate-300">Blackboard courses</p>
                    <p className="mt-2 text-3xl font-semibold">
                      {blackboardCourses.length}
                    </p>
                    <p className="mt-2 text-sm leading-6 text-slate-400">
                      Course shells loaded from Blackboard.
                    </p>
                  </article>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.25fr_0.9fr_0.95fr]">
          <div className="space-y-6 xl:col-span-2">
            <div className="rounded-[1.75rem] border border-sky-300/15 bg-[#0a1830]/90 p-6 shadow-[0_18px_50px_rgba(0,0,0,0.28)]">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.22em] text-sky-200">
                    Priority queue
                  </p>
                  <h2 className="mt-2 text-2xl font-semibold tracking-tight text-white">
                    Assignments that need attention
                  </h2>
                </div>
                <p className="text-sm text-slate-400">Scoped to {queueScope}</p>
              </div>

              <form className="mt-5 flex flex-col gap-3 rounded-2xl border border-sky-300/10 bg-[#07101f]/70 p-3 sm:flex-row sm:items-center">
                <label className="text-sm font-semibold text-slate-200">
                  Filter by class
                </label>
                <select
                  name="courseId"
                  defaultValue={selectedCourseId}
                  className="min-w-0 flex-1 rounded-2xl border border-sky-300/20 bg-[#07101f] px-4 py-2 text-sm text-slate-100 outline-none transition focus:border-sky-300"
                >
                  <option value="all">All classes</option>
                  {courses.map((course) => (
                    <option key={course.id} value={course.id}>
                      {course.code} - {course.name}
                    </option>
                  ))}
                </select>
                <button className="rounded-2xl bg-sky-300 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-sky-200">
                  Apply
                </button>
                {selectedCourseId !== "all" ? (
                  <Link
                    href="/"
                    className="rounded-2xl border border-sky-300/25 px-4 py-2 text-center text-sm font-semibold text-sky-100 transition hover:border-sky-200 hover:text-white"
                  >
                    Clear
                  </Link>
                ) : null}
              </form>

              <div className="mt-6 space-y-4">
                {assignments.length === 0 ? (
                  <div className="rounded-[1.5rem] border border-dashed border-sky-300/25 bg-[#07101f]/75 p-5 text-sm leading-6 text-slate-300">
                    No open {enabledBlackboardTermName} Blackboard assignments match
                    this class filter.
                  </div>
                ) : null}
                {assignments.map((assignment) => {
                  const course = courseMap.get(assignment.courseId);

                  return (
                    <article
                      key={assignment.id}
                      className="rounded-[1.5rem] border border-sky-300/15 bg-[#07101f]/75 p-5 transition hover:border-sky-300/35 hover:bg-[#0d1f39]"
                    >
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div className="space-y-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-lg font-semibold text-white">
                              {assignment.title}
                            </h3>
                            <span
                              className={`rounded-full px-3 py-1 text-xs font-semibold ring-1 ${badgeClasses(
                                assignment.priority,
                              )}`}
                            >
                              {assignment.priority}
                            </span>
                            <span className="rounded-full bg-sky-300/10 px-3 py-1 text-xs font-semibold text-sky-100 ring-1 ring-sky-300/20">
                              {assignment.source}
                            </span>
                          </div>
                          <p className="text-sm text-slate-400">
                            {[course?.code, course?.name]
                              .filter(Boolean)
                              .join(" - ")}
                          </p>
                          <p className="max-w-2xl text-sm leading-6 text-slate-300">
                            {assignment.description}
                          </p>
                        </div>
                        <div className="space-y-3 lg:min-w-56">
                          <div className="text-sm text-slate-300 lg:text-right">
                            <p className="font-semibold text-white">
                              {dueLabel(assignment.dueAt)}
                            </p>
                            <p>{assignment.status}</p>
                          </div>
                          <form
                            action={updateAssignmentStatusAction}
                            className="flex flex-col gap-2"
                          >
                            <input
                              type="hidden"
                              name="assignmentId"
                              value={assignment.id}
                            />
                            <select
                              name="status"
                              defaultValue={assignment.status}
                              className="rounded-2xl border border-sky-300/20 bg-[#07101f] px-4 py-2 text-sm text-slate-100 outline-none transition focus:border-sky-300"
                            >
                              {statuses.map((status) => (
                                <option key={status} value={status}>
                                  {status}
                                </option>
                              ))}
                            </select>
                            <button className="rounded-2xl bg-sky-300 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-sky-200">
                              Update status
                            </button>
                          </form>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>

            <div className="rounded-[1.75rem] border border-sky-300/15 bg-[#0a1830]/90 p-6 shadow-[0_18px_50px_rgba(0,0,0,0.28)]">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.22em] text-sky-200">
                    Course sync
                  </p>
                  <h2 className="mt-2 text-2xl font-semibold tracking-tight text-white">
                    Active courses
                  </h2>
                </div>
                <p className="text-sm text-slate-400">
                  Synced directly from {enabledBlackboardTermName} Blackboard
                </p>
              </div>

              <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {courses.length === 0 ? (
                  <div className="rounded-[1.5rem] border border-dashed border-sky-300/25 bg-[#07101f]/75 p-5 text-sm leading-6 text-slate-300 md:col-span-2 xl:col-span-3">
                    No {enabledBlackboardTermName} Blackboard courses are stored yet.
                    Sync from Blackboard to populate this dashboard.
                  </div>
                ) : null}
                {courses.map((course) => (
                  <article
                    key={course.id}
                    className="rounded-[1.5rem] border border-sky-300/15 bg-[#07101f] p-5 text-white shadow-inner"
                  >
                    <p className="text-xs uppercase tracking-[0.18em] text-sky-200">
                      {course.syncStatus}
                    </p>
                    <h3 className="mt-3 text-xl font-semibold">{course.name}</h3>
                    <p className="mt-2 text-sm text-slate-300">{course.code}</p>
                  </article>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <section
              id="planner"
              className="rounded-[1.75rem] border border-sky-300/15 bg-[#0a1830]/90 p-6 shadow-[0_18px_50px_rgba(0,0,0,0.28)]"
            >
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-sky-200">
                Weekly plan
              </p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight text-white">
                AI-style study blocks
              </h2>
              <div className="mt-6 space-y-4">
                {plan.map((item) => (
                  <article
                    key={`${item.day}-${item.focus}`}
                    className="rounded-[1.5rem] border border-sky-300/15 bg-[linear-gradient(135deg,rgba(6,18,37,0.96),rgba(13,45,78,0.92),rgba(8,32,52,0.96))] p-4"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-semibold uppercase tracking-[0.18em] text-sky-200">
                        {item.day}
                      </p>
                      <p className="rounded-full bg-sky-300/10 px-3 py-1 text-xs font-semibold text-sky-100 ring-1 ring-sky-300/20">
                        {item.duration}
                      </p>
                    </div>
                    <h3 className="mt-3 text-lg font-semibold text-white">
                      {item.focus}
                    </h3>
                    <p className="mt-2 text-sm leading-6 text-slate-300">
                      {item.note}
                    </p>
                  </article>
                ))}
              </div>
            </section>
          </div>
        </section>
      </div>
      </main>
    </>
  );
}
