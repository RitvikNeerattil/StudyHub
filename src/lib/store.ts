import { promises as fs } from "node:fs";
import path from "node:path";

import type {
  Assignment,
  AssignmentStatus,
  Course,
  Priority,
  StudyHubData,
} from "@/lib/types";

const dataPath = path.join(process.cwd(), "data", "studyhub.json");

async function ensureStore() {
  const dir = path.dirname(dataPath);
  await fs.mkdir(dir, { recursive: true });
}

export async function readStudyHubData(): Promise<StudyHubData> {
  await ensureStore();
  const raw = await fs.readFile(dataPath, "utf8");
  return JSON.parse(raw) as StudyHubData;
}

async function writeStudyHubData(data: StudyHubData) {
  await ensureStore();
  await fs.writeFile(dataPath, JSON.stringify(data, null, 2));
}

function createId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

export async function createCourse(input: {
  name: string;
  code: string;
  professor: string;
  cadence: string;
  workload: string;
}) {
  const data = await readStudyHubData();

  const course: Course = {
    id: createId("course"),
    name: input.name,
    code: input.code,
    professor: input.professor,
    cadence: input.cadence,
    workload: input.workload,
    source: "Manual",
    syncStatus: "Manual course",
  };

  data.courses.unshift(course);
  await writeStudyHubData(data);
}

export async function createAssignment(input: {
  title: string;
  courseId: string;
  dueAt: string;
  priority: Priority;
  status: AssignmentStatus;
  description: string;
}) {
  const data = await readStudyHubData();

  const assignment: Assignment = {
    id: createId("assignment"),
    title: input.title,
    courseId: input.courseId,
    dueAt: input.dueAt,
    priority: input.priority,
    status: input.status,
    description: input.description,
    source: "Manual",
  };

  data.assignments.unshift(assignment);
  await writeStudyHubData(data);
}

export async function updateAssignmentStatus(
  assignmentId: string,
  status: AssignmentStatus,
) {
  const data = await readStudyHubData();
  data.assignments = data.assignments.map((assignment) =>
    assignment.id === assignmentId ? { ...assignment, status } : assignment,
  );
  await writeStudyHubData(data);
}

export async function markBlackboardSync() {
  const data = await readStudyHubData();
  const syncStamp = `Blackboard sync checked ${new Date().toLocaleTimeString(
    "en-US",
    {
      hour: "numeric",
      minute: "2-digit",
    },
  )}`;

  data.courses = data.courses.map((course) =>
    course.source === "Blackboard"
      ? {
          ...course,
          syncStatus: syncStamp,
        }
      : course,
  );

  await writeStudyHubData(data);
}
