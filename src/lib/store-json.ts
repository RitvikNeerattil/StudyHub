import { promises as fs } from "node:fs";
import path from "node:path";

import type {
  AuthStore,
  Assignment,
  AssignmentStatus,
  Course,
  Priority,
  Session,
  StudyHubData,
  User,
} from "@/lib/types";

const dataPath = path.join(process.cwd(), "data", "studyhub.json");
const authPath = path.join(process.cwd(), "data", "auth.json");

async function ensureStore() {
  const dir = path.dirname(dataPath);
  await fs.mkdir(dir, { recursive: true });
}

async function ensureAuthStore() {
  const dir = path.dirname(authPath);
  await fs.mkdir(dir, { recursive: true });
}

export async function readJsonStudyHubData(): Promise<StudyHubData> {
  await ensureStore();
  const raw = await fs.readFile(dataPath, "utf8");
  return JSON.parse(raw) as StudyHubData;
}

async function readJsonAuthStore(): Promise<AuthStore> {
  await ensureAuthStore();
  const raw = await fs.readFile(authPath, "utf8");
  return JSON.parse(raw) as AuthStore;
}

async function writeStudyHubData(data: StudyHubData) {
  await ensureStore();
  await fs.writeFile(dataPath, JSON.stringify(data, null, 2));
}

async function writeAuthStore(data: AuthStore) {
  await ensureAuthStore();
  await fs.writeFile(authPath, JSON.stringify(data, null, 2));
}

function createId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

export async function createJsonCourse(input: {
  userId: string;
  name: string;
  code: string;
  professor: string;
  cadence: string;
  workload: string;
}) {
  const data = await readJsonStudyHubData();

  const course: Course = {
    id: `${inputPrefix(input.userId)}${createId("course")}`,
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

export async function createJsonAssignment(input: {
  userId: string;
  title: string;
  courseId: string;
  dueAt: string;
  priority: Priority;
  status: AssignmentStatus;
  description: string;
}) {
  const data = await readJsonStudyHubData();

  const assignment: Assignment = {
    id: `${inputPrefix(input.userId)}${createId("assignment")}`,
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

export async function updateJsonAssignmentStatus(
  userId: string,
  assignmentId: string,
  status: AssignmentStatus,
) {
  const data = await readJsonStudyHubData();
  data.assignments = data.assignments.map((assignment) =>
    assignment.id === assignmentId && assignment.id.startsWith(inputPrefix(userId))
      ? { ...assignment, status }
      : assignment,
  );
  await writeStudyHubData(data);
}

function inputPrefix(userId: string) {
  return `${userId}-`;
}

function scopeCourse(course: Course, userId: string): Course {
  return {
    ...course,
    id: `${inputPrefix(userId)}${course.id}`,
  };
}

function scopeAssignment(assignment: Assignment, userId: string): Assignment {
  return {
    ...assignment,
    id: `${inputPrefix(userId)}${assignment.id}`,
    courseId: `${inputPrefix(userId)}${assignment.courseId}`,
  };
}

export async function readJsonStudyHubDataForUser(
  userId: string,
): Promise<StudyHubData> {
  const auth = await readJsonAuthStore();
  const exists = auth.users.some((user) => user.id === userId);

  if (!exists) {
    return { courses: [], assignments: [] };
  }

  const data = await readJsonStudyHubData();
  const prefix = inputPrefix(userId);

  const userCourses = data.courses.filter((course) => course.id.startsWith(prefix));
  const userAssignments = data.assignments.filter((assignment) =>
    assignment.id.startsWith(prefix),
  );

  return {
    courses: userCourses,
    assignments: userAssignments,
  };
}

export async function createJsonUserRecord(user: User, seed: StudyHubData) {
  const auth = await readJsonAuthStore();
  auth.users.push(user);
  await writeAuthStore(auth);

  const data = await readJsonStudyHubData();
  data.courses.push(...seed.courses.map((course) => scopeCourse(course, user.id)));
  data.assignments.push(
    ...seed.assignments.map((assignment) => scopeAssignment(assignment, user.id)),
  );
  await writeStudyHubData(data);
}

export async function findJsonUserByEmail(email: string) {
  const auth = await readJsonAuthStore();
  return auth.users.find((user) => user.email === email) ?? null;
}

export async function upsertJsonSessionRecord(session: Session) {
  const auth = await readJsonAuthStore();
  auth.sessions = auth.sessions.filter((item) => item.userId !== session.userId);
  auth.sessions.push(session);
  await writeAuthStore(auth);
}

export async function deleteJsonSessionRecord(token: string) {
  const auth = await readJsonAuthStore();
  auth.sessions = auth.sessions.filter((session) => session.token !== token);
  await writeAuthStore(auth);
}

export async function findJsonSessionUser(token: string) {
  const auth = await readJsonAuthStore();
  const now = Date.now();
  const session = auth.sessions.find(
    (item) => item.token === token && new Date(item.expiresAt).getTime() > now,
  );

  if (!session) {
    return null;
  }

  return auth.users.find((user) => user.id === session.userId) ?? null;
}

export async function markJsonBlackboardSync(userId: string) {
  const data = await readJsonStudyHubData();
  const syncStamp = `Blackboard sync checked ${new Date().toLocaleTimeString(
    "en-US",
    {
      hour: "numeric",
      minute: "2-digit",
    },
  )}`;

  data.courses = data.courses.map((course) =>
    course.source === "Blackboard" && course.id.startsWith(inputPrefix(userId))
      ? {
          ...course,
          syncStatus: syncStamp,
        }
      : course,
  );

  await writeStudyHubData(data);
}
