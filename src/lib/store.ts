import { hasDatabaseUrl } from "@/lib/db";
import {
  clearJsonLoginAttempt,
  createJsonAssignment,
  clearJsonCourseworkForUser,
  createJsonCourse,
  createJsonUserRecord,
  deleteJsonSessionRecord,
  findJsonSessionUser,
  findJsonUserByEmail,
  importJsonBlackboardData,
  markJsonBlackboardSync,
  readJsonLoginAttempt,
  readJsonStudyHubData,
  readJsonStudyHubDataForUser,
  saveJsonLoginAttempt,
  updateJsonBlackboardCredentials,
  updateJsonGeminiCredentials,
  updateJsonAssignmentStatus,
  upsertJsonSessionRecord,
} from "@/lib/store-json";
import {
  clearPostgresLoginAttempt,
  createPostgresAssignment,
  clearPostgresCourseworkForUser,
  createPostgresCourse,
  createPostgresUserRecord,
  deletePostgresSessionRecord,
  findPostgresSessionUser,
  findPostgresUserByEmail,
  importPostgresBlackboardData,
  markPostgresBlackboardSync,
  readPostgresLoginAttempt,
  readPostgresStudyHubData,
  savePostgresLoginAttempt,
  updatePostgresBlackboardCredentials,
  updatePostgresGeminiCredentials,
  updatePostgresAssignmentStatus,
  upsertPostgresSessionRecord,
} from "@/lib/store-postgres";
import type { BlackboardImportPayload, BlackboardSyncResult } from "@/lib/lms";
import type {
  AssignmentStatus,
  BlackboardCredentialUpdate,
  GeminiCredentialUpdate,
  LoginAttempt,
  Priority,
  Session,
  StudyHubData,
  User,
} from "@/lib/types";

function shouldUsePostgres() {
  if (
    process.env.NODE_ENV === "production" &&
    process.env.NEXT_PHASE !== "phase-production-build" &&
    !hasDatabaseUrl()
  ) {
    throw new Error("DATABASE_URL must be set in production.");
  }

  return hasDatabaseUrl();
}

export async function readStudyHubData(userId?: string): Promise<StudyHubData> {
  if (!userId) {
    return readJsonStudyHubData();
  }

  if (shouldUsePostgres()) {
    return readPostgresStudyHubData(userId);
  }

  return readJsonStudyHubDataForUser(userId);
}

export async function createCourse(input: {
  userId: string;
  name: string;
  code: string;
  professor: string;
  cadence: string;
  workload: string;
}) {
  if (shouldUsePostgres()) {
    return createPostgresCourse(input);
  }

  return createJsonCourse(input);
}

export async function createAssignment(input: {
  userId: string;
  title: string;
  courseId: string;
  dueAt: string;
  priority: Priority;
  status: AssignmentStatus;
  description: string;
}) {
  if (shouldUsePostgres()) {
    return createPostgresAssignment(input);
  }

  return createJsonAssignment(input);
}

export async function updateAssignmentStatus(
  userId: string,
  assignmentId: string,
  status: AssignmentStatus,
) {
  if (shouldUsePostgres()) {
    return updatePostgresAssignmentStatus(userId, assignmentId, status);
  }

  return updateJsonAssignmentStatus(userId, assignmentId, status);
}

export async function markBlackboardSync(userId: string) {
  if (shouldUsePostgres()) {
    return markPostgresBlackboardSync(userId);
  }

  return markJsonBlackboardSync(userId);
}

export async function importBlackboardData(
  userId: string,
  payload: BlackboardImportPayload,
): Promise<BlackboardSyncResult> {
  if (shouldUsePostgres()) {
    return importPostgresBlackboardData(userId, payload);
  }

  return importJsonBlackboardData(userId, payload);
}

export async function clearCourseworkForUser(userId: string) {
  if (shouldUsePostgres()) {
    return clearPostgresCourseworkForUser(userId);
  }

  return clearJsonCourseworkForUser(userId);
}

export async function replaceBlackboardData(
  userId: string,
  payload: BlackboardImportPayload,
): Promise<BlackboardSyncResult> {
  await clearCourseworkForUser(userId);
  return importBlackboardData(userId, payload);
}

export async function updateBlackboardCredentials(
  userId: string,
  input: BlackboardCredentialUpdate,
) {
  if (shouldUsePostgres()) {
    return updatePostgresBlackboardCredentials(userId, input);
  }

  return updateJsonBlackboardCredentials(userId, input);
}

export async function updateGeminiCredentials(
  userId: string,
  input: GeminiCredentialUpdate,
) {
  if (shouldUsePostgres()) {
    return updatePostgresGeminiCredentials(userId, input);
  }

  return updateJsonGeminiCredentials(userId, input);
}

export async function findUserByEmail(email: string) {
  if (shouldUsePostgres()) {
    return findPostgresUserByEmail(email);
  }

  return findJsonUserByEmail(email);
}

export async function createUserRecord(user: User, seed: StudyHubData) {
  if (shouldUsePostgres()) {
    return createPostgresUserRecord(user, seed);
  }

  return createJsonUserRecord(user, seed);
}

export async function upsertSessionRecord(session: Session) {
  if (shouldUsePostgres()) {
    return upsertPostgresSessionRecord(session);
  }

  return upsertJsonSessionRecord(session);
}

export async function deleteSessionRecord(token: string) {
  if (shouldUsePostgres()) {
    return deletePostgresSessionRecord(token);
  }

  return deleteJsonSessionRecord(token);
}

export async function findSessionUser(token: string) {
  if (shouldUsePostgres()) {
    return findPostgresSessionUser(token);
  }

  return findJsonSessionUser(token);
}

export async function readLoginAttempt(key: string) {
  if (shouldUsePostgres()) {
    return readPostgresLoginAttempt(key);
  }

  return readJsonLoginAttempt(key);
}

export async function saveLoginAttempt(attempt: LoginAttempt) {
  if (shouldUsePostgres()) {
    return savePostgresLoginAttempt(attempt);
  }

  return saveJsonLoginAttempt(attempt);
}

export async function clearLoginAttempt(key: string) {
  if (shouldUsePostgres()) {
    return clearPostgresLoginAttempt(key);
  }

  return clearJsonLoginAttempt(key);
}
