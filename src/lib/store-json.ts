import { promises as fs } from "node:fs";
import { randomUUID } from "node:crypto";
import path from "node:path";

import type {
  AuthStore,
  Assignment,
  AssignmentStatus,
  BlackboardCredentialUpdate,
  Course,
  GeminiCredentialUpdate,
  LoginAttempt,
  Priority,
  Session,
  StudyHubData,
  User,
} from "@/lib/types";
import type { BlackboardImportPayload, BlackboardSyncResult } from "@/lib/lms";

const dataPath = path.join(process.cwd(), "data", "studyhub.json");
const authPath = path.join(process.cwd(), "data", "auth.json");

function emptyStudyHubData(): StudyHubData {
  return { courses: [], assignments: [] };
}

function emptyAuthStore(): AuthStore {
  return { users: [], sessions: [], loginAttempts: [] };
}

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

  try {
    const raw = await fs.readFile(dataPath, "utf8");
    return JSON.parse(raw.replace(/^\uFEFF/, "")) as StudyHubData;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
      throw error;
    }

    const data = emptyStudyHubData();
    await writeStudyHubData(data);
    return data;
  }
}

async function readJsonAuthStore(): Promise<AuthStore> {
  await ensureAuthStore();

  try {
    const raw = await fs.readFile(authPath, "utf8");
    return JSON.parse(raw.replace(/^\uFEFF/, "")) as AuthStore;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
      throw error;
    }

    const data = emptyAuthStore();
    await writeAuthStore(data);
    return data;
  }
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
  return `${prefix}-${randomUUID()}`;
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
    externalId: undefined,
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
    externalId: undefined,
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

export async function clearJsonCourseworkForUser(userId: string) {
  const data = await readJsonStudyHubData();
  const prefix = inputPrefix(userId);

  data.assignments = data.assignments.filter(
    (assignment) => !assignment.id.startsWith(prefix),
  );
  data.courses = data.courses.filter((course) => !course.id.startsWith(prefix));

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

export async function updateJsonBlackboardCredentials(
  userId: string,
  input: BlackboardCredentialUpdate,
) {
  const auth = await readJsonAuthStore();
  let found = false;

  auth.users = auth.users.map((user) => {
    if (user.id !== userId) {
      return user;
    }

    found = true;

    return {
      ...user,
      blackboardUsername: input.username,
      blackboardPasswordEncrypted: input.passwordEncrypted,
      blackboardCredentialsUpdatedAt: input.updatedAt,
    };
  });

  if (!found) {
    throw new Error("Could not find the signed-in user.");
  }

  await writeAuthStore(auth);
}

export async function updateJsonGeminiCredentials(
  userId: string,
  input: GeminiCredentialUpdate,
) {
  const auth = await readJsonAuthStore();
  let found = false;

  auth.users = auth.users.map((user) => {
    if (user.id !== userId) {
      return user;
    }

    found = true;

    return {
      ...user,
      geminiApiKeyEncrypted: input.apiKeyEncrypted,
      geminiApiKeyUpdatedAt: input.updatedAt,
    };
  });

  if (!found) {
    throw new Error("Could not find the signed-in user.");
  }

  await writeAuthStore(auth);
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
  const activeSessions = auth.sessions.filter(
    (item) => new Date(item.expiresAt).getTime() > now,
  );

  if (activeSessions.length !== auth.sessions.length) {
    auth.sessions = activeSessions;
    await writeAuthStore(auth);
  }

  const session = auth.sessions.find(
    (item) => item.token === token && new Date(item.expiresAt).getTime() > now,
  );

  if (!session) {
    return null;
  }

  return auth.users.find((user) => user.id === session.userId) ?? null;
}

export async function readJsonLoginAttempt(key: string) {
  const auth = await readJsonAuthStore();
  return auth.loginAttempts?.find((attempt) => attempt.key === key) ?? null;
}

export async function saveJsonLoginAttempt(attempt: LoginAttempt) {
  const auth = await readJsonAuthStore();
  const attempts = auth.loginAttempts ?? [];
  const existingIndex = attempts.findIndex((item) => item.key === attempt.key);

  if (existingIndex >= 0) {
    attempts[existingIndex] = attempt;
  } else {
    attempts.push(attempt);
  }

  auth.loginAttempts = attempts;
  await writeAuthStore(auth);
}

export async function clearJsonLoginAttempt(key: string) {
  const auth = await readJsonAuthStore();
  auth.loginAttempts = (auth.loginAttempts ?? []).filter(
    (attempt) => attempt.key !== key,
  );
  await writeAuthStore(auth);
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

export async function importJsonBlackboardData(
  userId: string,
  payload: BlackboardImportPayload,
): Promise<BlackboardSyncResult> {
  const data = await readJsonStudyHubData();
  const prefix = inputPrefix(userId);
  const syncedAt = new Date();
  const syncStamp = `Blackboard sync checked ${syncedAt.toLocaleTimeString(
    "en-US",
    {
      hour: "numeric",
      minute: "2-digit",
    },
  )}`;
  const result: BlackboardSyncResult = {
    syncedAt: syncedAt.toISOString(),
    courses: {
      created: 0,
      updated: 0,
    },
    assignments: {
      created: 0,
      updated: 0,
      skipped: 0,
    },
  };

  for (const importedCourse of payload.courses) {
    const existingCourseIndex = data.courses.findIndex(
      (course) =>
        course.id.startsWith(prefix) &&
        course.source === "Blackboard" &&
        course.externalId === importedCourse.externalId,
    );

    const nextCourse: Course = {
      id:
        existingCourseIndex >= 0
          ? data.courses[existingCourseIndex].id
          : `${prefix}course-${importedCourse.externalId}`,
      name: importedCourse.name,
      code: importedCourse.code,
      professor: importedCourse.professor,
      cadence: importedCourse.cadence,
      workload: importedCourse.workload,
      syncStatus: syncStamp,
      source: "Blackboard",
      externalId: importedCourse.externalId,
    };

    if (existingCourseIndex >= 0) {
      data.courses[existingCourseIndex] = nextCourse;
      result.courses.updated += 1;
    } else {
      data.courses.unshift(nextCourse);
      result.courses.created += 1;
    }
  }

  for (const importedAssignment of payload.assignments) {
    if (importedAssignment.status === "Submitted") {
      result.assignments.skipped += 1;
      continue;
    }

    const mappedCourse = data.courses.find(
      (course) =>
        course.id.startsWith(prefix) &&
        course.source === "Blackboard" &&
        course.externalId === importedAssignment.courseExternalId,
    );

    if (!mappedCourse) {
      result.assignments.skipped += 1;
      continue;
    }

    const existingAssignmentIndex = data.assignments.findIndex(
      (assignment) =>
        assignment.id.startsWith(prefix) &&
        assignment.source === "Blackboard" &&
        assignment.externalId === importedAssignment.externalId,
    );

    const nextAssignment: Assignment = {
      id:
        existingAssignmentIndex >= 0
          ? data.assignments[existingAssignmentIndex].id
          : `${prefix}assignment-${importedAssignment.externalId}`,
      title: importedAssignment.title,
      courseId: mappedCourse.id,
      dueAt: importedAssignment.dueAt,
      priority: importedAssignment.priority,
      status: importedAssignment.status,
      source: "Blackboard",
      description: importedAssignment.description,
      externalId: importedAssignment.externalId,
    };

    if (existingAssignmentIndex >= 0) {
      data.assignments[existingAssignmentIndex] = nextAssignment;
      result.assignments.updated += 1;
    } else {
      data.assignments.unshift(nextAssignment);
      result.assignments.created += 1;
    }
  }

  await writeStudyHubData(data);
  return result;
}
