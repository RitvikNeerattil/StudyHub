import {
  addAssignmentAction,
  addCourseAction,
  runBlackboardSyncAction,
  signInAction,
  signOutAction,
  signUpAction,
  updateAssignmentStatusAction,
} from "@/app/actions";
import { AuthPanel } from "@/components/auth-panel";
import { getCurrentUser } from "@/lib/auth";
import { readStudyHubData } from "@/lib/store";
import type { Assignment, AssignmentStatus, Priority } from "@/lib/types";

const priorities: Priority[] = ["High", "Medium", "Low"];
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
    return "bg-rose-100 text-rose-700 ring-rose-200";
  }

  if (priority === "Medium") {
    return "bg-amber-100 text-amber-700 ring-amber-200";
  }

  return "bg-emerald-100 text-emerald-700 ring-emerald-200";
}

function dueLabel(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
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
  searchParams?: Promise<{ authError?: string }>;
}) {
  const user = await getCurrentUser();
  const searchParams = props.searchParams ? await props.searchParams : undefined;
  const authError = searchParams?.authError;

  if (!user) {
    return (
      <AuthPanel
        signInAction={signInAction}
        signUpAction={signUpAction}
        error={authError}
      />
    );
  }

  const data = await readStudyHubData(user.id);
  const assignments = [...data.assignments].sort((a, b) =>
    a.dueAt.localeCompare(b.dueAt),
  );
  const courses = data.courses;
  const courseMap = new Map(courses.map((course) => [course.id, course]));
  const blackboardCourses = courses.filter(
    (course) => course.source === "Blackboard",
  );
  const urgentAssignments = assignments.filter(
    (assignment) => assignment.status !== "Submitted",
  );

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
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,#fef3c7_0%,#fff8eb_25%,#f7f5ef_60%,#eef4ff_100%)] text-slate-900">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-10 px-5 py-8 sm:px-8 lg:px-10">
        <section className="overflow-hidden rounded-[2rem] border border-white/70 bg-white/80 shadow-[0_24px_80px_rgba(15,23,42,0.12)] backdrop-blur">
          <div className="grid gap-8 px-6 py-8 lg:grid-cols-[1.6fr_0.9fr] lg:px-10">
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-amber-200">
                StudyHub
                <span className="text-slate-300">Private semester dashboard</span>
              </div>
              <div className="space-y-4">
                <h1 className="max-w-3xl text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl">
                  Welcome back, {user.name.split(" ")[0]}.
                </h1>
                <p className="max-w-2xl text-base leading-7 text-slate-600 sm:text-lg">
                  Your assignments, courses, and sync activity are scoped to your
                  account. Use manual fallback when Blackboard data is incomplete.
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <form action={runBlackboardSyncAction}>
                  <button className="rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800">
                    Run Blackboard sync
                  </button>
                </form>
                <a
                  href="#planner"
                  className="rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-950 hover:text-slate-950"
                >
                  View weekly plan
                </a>
                <form action={signOutAction}>
                  <button className="rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-950 hover:text-slate-950">
                    Sign out
                  </button>
                </form>
              </div>
            </div>

            <div className="rounded-[1.75rem] bg-slate-950 p-5 text-white shadow-inner">
              <div className="flex items-center justify-between text-sm text-slate-300">
                <span>Live workload summary</span>
                <span>{courses.length} active courses</span>
              </div>
              <div className="mt-5 space-y-4">
                <div className="rounded-2xl bg-white/8 p-4">
                  <p className="text-sm uppercase tracking-[0.2em] text-amber-200">
                    Recommended today
                  </p>
                  <p className="mt-2 text-2xl font-semibold">
                    {urgentAssignments.slice(0, 3).length} focused blocks
                  </p>
                  <p className="mt-2 text-sm leading-6 text-slate-300">
                    Prioritize the earliest due items, then use manual tasks to
                    fill study gaps between synced deadlines.
                  </p>
                </div>
                <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
                  <article className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <p className="text-sm text-slate-300">Assignments due soon</p>
                    <p className="mt-2 text-3xl font-semibold">
                      {urgentAssignments.length}
                    </p>
                    <p className="mt-2 text-sm leading-6 text-slate-400">
                      Open work across synced Blackboard tasks and manual items.
                    </p>
                  </article>
                  <article className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <p className="text-sm text-slate-300">Hours planned</p>
                    <p className="mt-2 text-3xl font-semibold">
                      {hoursPlanned(urgentAssignments)}
                    </p>
                    <p className="mt-2 text-sm leading-6 text-slate-400">
                      Estimated from priority weightings in the MVP planner.
                    </p>
                  </article>
                  <article className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <p className="text-sm text-slate-300">Blackboard courses</p>
                    <p className="mt-2 text-3xl font-semibold">
                      {blackboardCourses.length}
                    </p>
                    <p className="mt-2 text-sm leading-6 text-slate-400">
                      Imported course shells with manual fallback editing.
                    </p>
                  </article>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.25fr_0.9fr_0.95fr]">
          <div className="space-y-6 xl:col-span-2">
            <div className="rounded-[1.75rem] border border-slate-200/70 bg-white/85 p-6 shadow-[0_18px_50px_rgba(148,163,184,0.16)]">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-500">
                    Priority queue
                  </p>
                  <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
                    Assignments that need attention
                  </h2>
                </div>
                <p className="text-sm text-slate-500">Scoped to {user.email}</p>
              </div>

              <div className="mt-6 space-y-4">
                {assignments.map((assignment) => {
                  const course = courseMap.get(assignment.courseId);

                  return (
                    <article
                      key={assignment.id}
                      className="rounded-[1.5rem] border border-slate-200 bg-slate-50/80 p-5 transition hover:border-slate-300 hover:bg-white"
                    >
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div className="space-y-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-lg font-semibold text-slate-950">
                              {assignment.title}
                            </h3>
                            <span
                              className={`rounded-full px-3 py-1 text-xs font-semibold ring-1 ${badgeClasses(
                                assignment.priority,
                              )}`}
                            >
                              {assignment.priority}
                            </span>
                            <span className="rounded-full bg-slate-200 px-3 py-1 text-xs font-semibold text-slate-700">
                              {assignment.source}
                            </span>
                          </div>
                          <p className="text-sm text-slate-500">
                            {course?.code} · {course?.name}
                          </p>
                          <p className="max-w-2xl text-sm leading-6 text-slate-600">
                            {assignment.description}
                          </p>
                        </div>
                        <div className="space-y-3 lg:min-w-56">
                          <div className="text-sm text-slate-600 lg:text-right">
                            <p className="font-semibold text-slate-800">
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
                              className="rounded-2xl border border-slate-300 bg-white px-4 py-2 text-sm text-slate-700 outline-none transition focus:border-slate-950"
                            >
                              {statuses.map((status) => (
                                <option key={status} value={status}>
                                  {status}
                                </option>
                              ))}
                            </select>
                            <button className="rounded-2xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800">
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

            <div className="rounded-[1.75rem] border border-slate-200/70 bg-white/85 p-6 shadow-[0_18px_50px_rgba(148,163,184,0.16)]">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-500">
                    Course sync
                  </p>
                  <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
                    Active courses
                  </h2>
                </div>
                <p className="text-sm text-slate-500">
                  Blackboard-ready plus manual additions
                </p>
              </div>

              <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {courses.map((course) => (
                  <article
                    key={course.id}
                    className="rounded-[1.5rem] bg-slate-950 p-5 text-white"
                  >
                    <p className="text-xs uppercase tracking-[0.18em] text-amber-200">
                      {course.syncStatus}
                    </p>
                    <h3 className="mt-3 text-xl font-semibold">{course.name}</h3>
                    <p className="mt-2 text-sm text-slate-300">
                      {course.code} · {course.professor}
                    </p>
                    <div className="mt-5 space-y-2 text-sm text-slate-200">
                      <p>{course.cadence}</p>
                      <p>{course.workload}</p>
                      <p>Source: {course.source}</p>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <section
              id="planner"
              className="rounded-[1.75rem] border border-slate-200/70 bg-white/85 p-6 shadow-[0_18px_50px_rgba(148,163,184,0.16)]"
            >
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-500">
                Weekly plan
              </p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
                AI-style study blocks
              </h2>
              <div className="mt-6 space-y-4">
                {plan.map((item) => (
                  <article
                    key={`${item.day}-${item.focus}`}
                    className="rounded-[1.5rem] bg-gradient-to-br from-amber-100 via-white to-sky-100 p-4"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
                        {item.day}
                      </p>
                      <p className="rounded-full bg-white/80 px-3 py-1 text-xs font-semibold text-slate-700">
                        {item.duration}
                      </p>
                    </div>
                    <h3 className="mt-3 text-lg font-semibold text-slate-950">
                      {item.focus}
                    </h3>
                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      {item.note}
                    </p>
                  </article>
                ))}
              </div>
            </section>

            <section className="rounded-[1.75rem] border border-slate-200/70 bg-white/85 p-6 shadow-[0_18px_50px_rgba(148,163,184,0.16)]">
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-500">
                Add course
              </p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
                Manual course fallback
              </h2>
              <form action={addCourseAction} className="mt-5 space-y-3">
                <input
                  name="name"
                  placeholder="Course name"
                  className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-950"
                />
                <input
                  name="code"
                  placeholder="Course code"
                  className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-950"
                />
                <input
                  name="professor"
                  placeholder="Professor"
                  className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-950"
                />
                <input
                  name="cadence"
                  placeholder="Meeting cadence"
                  className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-950"
                />
                <input
                  name="workload"
                  placeholder="Current workload"
                  className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-950"
                />
                <button className="w-full rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800">
                  Save course
                </button>
              </form>
            </section>

            <section className="rounded-[1.75rem] border border-slate-200/70 bg-white/85 p-6 shadow-[0_18px_50px_rgba(148,163,184,0.16)]">
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-500">
                Add assignment
              </p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
                Capture work outside Blackboard
              </h2>
              <form action={addAssignmentAction} className="mt-5 space-y-3">
                <input
                  name="title"
                  placeholder="Assignment title"
                  className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-950"
                />
                <select
                  name="courseId"
                  defaultValue=""
                  className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-slate-950"
                >
                  <option value="" disabled>
                    Select course
                  </option>
                  {courses.map((course) => (
                    <option key={course.id} value={course.id}>
                      {course.code} · {course.name}
                    </option>
                  ))}
                </select>
                <div className="grid gap-3 sm:grid-cols-2">
                  <input
                    type="date"
                    name="dueDate"
                    className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-950"
                  />
                  <input
                    type="time"
                    name="dueTime"
                    defaultValue="23:59"
                    className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-950"
                  />
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <select
                    name="priority"
                    defaultValue="Medium"
                    className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-slate-950"
                  >
                    {priorities.map((priority) => (
                      <option key={priority} value={priority}>
                        {priority}
                      </option>
                    ))}
                  </select>
                  <select
                    name="status"
                    defaultValue="Not started"
                    className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-slate-950"
                  >
                    {statuses.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                </div>
                <textarea
                  name="description"
                  placeholder="Short description"
                  rows={4}
                  className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-950"
                />
                <button className="w-full rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800">
                  Save assignment
                </button>
              </form>
            </section>
          </div>
        </section>
      </div>
    </main>
  );
}
