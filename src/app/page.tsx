type Stat = {
  label: string;
  value: string;
  detail: string;
};

type Assignment = {
  title: string;
  course: string;
  due: string;
  priority: "High" | "Medium" | "Low";
  status: string;
};

type Course = {
  name: string;
  professor: string;
  cadence: string;
  workload: string;
  sync: string;
};

type PlanBlock = {
  day: string;
  focus: string;
  duration: string;
  note: string;
};

const stats: Stat[] = [
  {
    label: "Assignments due this week",
    value: "7",
    detail: "Two are imported from Blackboard and need deep-work blocks.",
  },
  {
    label: "Hours planned",
    value: "14.5",
    detail: "Balanced across AI, systems, and networking classes.",
  },
  {
    label: "Upcoming syncs",
    value: "3",
    detail: "Blackboard sync runs every 30 minutes with conflict fallback.",
  },
];

const assignments: Assignment[] = [
  {
    title: "Distributed Systems checkpoint",
    course: "CSCE 590",
    due: "Today, 6:00 PM",
    priority: "High",
    status: "Needs review",
  },
  {
    title: "Neural search lab report",
    course: "CSCE 580",
    due: "Tomorrow, 11:59 PM",
    priority: "High",
    status: "Draft ready",
  },
  {
    title: "Operating systems quiz 8",
    course: "CSCE 311",
    due: "Friday, 4:00 PM",
    priority: "Medium",
    status: "Not started",
  },
  {
    title: "Team sprint retrospective",
    course: "CSCE 490",
    due: "Saturday, 1:00 PM",
    priority: "Low",
    status: "Waiting on team",
  },
];

const courses: Course[] = [
  {
    name: "Artificial Intelligence",
    professor: "Dr. Calloway",
    cadence: "Mon/Wed 2:00 PM",
    workload: "Heavy project week",
    sync: "Synced 12 minutes ago",
  },
  {
    name: "Operating Systems",
    professor: "Dr. Nguyen",
    cadence: "Tue/Thu 11:00 AM",
    workload: "Quiz plus lab",
    sync: "Synced 12 minutes ago",
  },
  {
    name: "Software Engineering",
    professor: "Prof. Mason",
    cadence: "Mon 5:30 PM",
    workload: "Team milestone due",
    sync: "Manual course",
  },
];

const plan: PlanBlock[] = [
  {
    day: "Tonight",
    focus: "Finish distributed systems checkpoint",
    duration: "2h 15m",
    note: "AI planner grouped the reading and implementation together.",
  },
  {
    day: "Thursday",
    focus: "Polish neural search report and submit OS quiz",
    duration: "3h 30m",
    note: "Best fit before the Friday class cluster.",
  },
  {
    day: "Friday",
    focus: "Sprint retro prep and Blackboard catch-up review",
    duration: "1h 45m",
    note: "Reserved buffer in case synced deadlines change.",
  },
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

export default function Home() {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,#fef3c7_0%,#fff8eb_25%,#f7f5ef_60%,#eef4ff_100%)] text-slate-900">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-10 px-5 py-8 sm:px-8 lg:px-10">
        <section className="overflow-hidden rounded-[2rem] border border-white/70 bg-white/80 shadow-[0_24px_80px_rgba(15,23,42,0.12)] backdrop-blur">
          <div className="grid gap-8 px-6 py-8 lg:grid-cols-[1.6fr_0.9fr] lg:px-10">
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-amber-200">
                StudyHub
                <span className="text-slate-300">LMS-integrated planning</span>
              </div>
              <div className="space-y-4">
                <h1 className="max-w-3xl font-sans text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl">
                  Blackboard-connected planning for students who need one clear
                  dashboard.
                </h1>
                <p className="max-w-2xl text-base leading-7 text-slate-600 sm:text-lg">
                  StudyHub pulls course deadlines, highlights urgent work,
                  generates AI study plans, and keeps a manual fallback so the
                  workflow stays reliable when LMS data changes.
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <button className="rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800">
                  Connect Blackboard
                </button>
                <button className="rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-950 hover:text-slate-950">
                  View weekly plan
                </button>
              </div>
            </div>

            <div className="rounded-[1.75rem] bg-slate-950 p-5 text-white shadow-inner">
              <div className="flex items-center justify-between text-sm text-slate-300">
                <span>AI workload summary</span>
                <span>Updated 8:42 AM</span>
              </div>
              <div className="mt-5 space-y-4">
                <div className="rounded-2xl bg-white/8 p-4">
                  <p className="text-sm uppercase tracking-[0.2em] text-amber-200">
                    Recommended today
                  </p>
                  <p className="mt-2 text-2xl font-semibold">
                    3 focused blocks
                  </p>
                  <p className="mt-2 text-sm leading-6 text-slate-300">
                    Finish the systems checkpoint first, then close the AI lab
                    report while the source material is still fresh.
                  </p>
                </div>
                <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
                  {stats.map((stat) => (
                    <article
                      key={stat.label}
                      className="rounded-2xl border border-white/10 bg-white/5 p-4"
                    >
                      <p className="text-sm text-slate-300">{stat.label}</p>
                      <p className="mt-2 text-3xl font-semibold">{stat.value}</p>
                      <p className="mt-2 text-sm leading-6 text-slate-400">
                        {stat.detail}
                      </p>
                    </article>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[1.3fr_0.7fr]">
          <div className="space-y-6">
            <div className="rounded-[1.75rem] border border-slate-200/70 bg-white/85 p-6 shadow-[0_18px_50px_rgba(148,163,184,0.16)]">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-500">
                    Priority queue
                  </p>
                  <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
                    Assignments that need attention this week
                  </h2>
                </div>
                <p className="text-sm text-slate-500">
                  Imported from Blackboard plus manual tasks
                </p>
              </div>

              <div className="mt-6 space-y-4">
                {assignments.map((assignment) => (
                  <article
                    key={assignment.title}
                    className="rounded-[1.5rem] border border-slate-200 bg-slate-50/80 p-5 transition hover:border-slate-300 hover:bg-white"
                  >
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
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
                        </div>
                        <p className="text-sm text-slate-500">
                          {assignment.course}
                        </p>
                      </div>
                      <div className="text-sm text-slate-600 sm:text-right">
                        <p className="font-semibold text-slate-800">
                          {assignment.due}
                        </p>
                        <p>{assignment.status}</p>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </div>

            <div className="rounded-[1.75rem] border border-slate-200/70 bg-white/85 p-6 shadow-[0_18px_50px_rgba(148,163,184,0.16)]">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-500">
                    Course sync
                  </p>
                  <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
                    Blackboard-linked courses
                  </h2>
                </div>
                <p className="text-sm text-slate-500">
                  Manual fallback keeps edits safe
                </p>
              </div>

              <div className="mt-6 grid gap-4 md:grid-cols-3">
                {courses.map((course) => (
                  <article
                    key={course.name}
                    className="rounded-[1.5rem] bg-slate-950 p-5 text-white"
                  >
                    <p className="text-xs uppercase tracking-[0.18em] text-amber-200">
                      {course.sync}
                    </p>
                    <h3 className="mt-3 text-xl font-semibold">{course.name}</h3>
                    <p className="mt-2 text-sm text-slate-300">
                      {course.professor}
                    </p>
                    <div className="mt-5 space-y-2 text-sm text-slate-200">
                      <p>{course.cadence}</p>
                      <p>{course.workload}</p>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <section className="rounded-[1.75rem] border border-slate-200/70 bg-white/85 p-6 shadow-[0_18px_50px_rgba(148,163,184,0.16)]">
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-500">
                Weekly plan
              </p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
                AI-generated study blocks
              </h2>
              <div className="mt-6 space-y-4">
                {plan.map((item) => (
                  <article
                    key={item.day}
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
                MVP scope
              </p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
                What this first build covers
              </h2>
              <ul className="mt-5 space-y-3 text-sm leading-6 text-slate-600">
                <li>Course dashboard with synced and manual assignment flows</li>
                <li>Priority queue driven by due dates, urgency, and workload</li>
                <li>AI planner for weekly schedules and assignment summaries</li>
                <li>LMS-ready import architecture for Blackboard integration</li>
              </ul>
            </section>
          </div>
        </section>
      </div>
    </main>
  );
}
