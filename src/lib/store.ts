import { hasDatabaseUrl } from "@/lib/db";
import {
  createJsonAssignment,
  createJsonCourse,
  createJsonUserRecord,
  deleteJsonSessionRecord,
  findJsonSessionUser,
  findJsonUserByEmail,
  markJsonBlackboardSync,
  readJsonStudyHubData,
  readJsonStudyHubDataForUser,
  updateJsonAssignmentStatus,
  upsertJsonSessionRecord,
} from "@/lib/store-json";
import {
  createPostgresAssignment,
  createPostgresCourse,
  createPostgresUserRecord,
  deletePostgresSessionRecord,
  findPostgresSessionUser,
  findPostgresUserByEmail,
  markPostgresBlackboardSync,
  readPostgresStudyHubData,
  updatePostgresAssignmentStatus,
  upsertPostgresSessionRecord,
} from "@/lib/store-postgres";
import type {
  AssignmentStatus,
  Priority,
  Session,
  StudyHubData,
  User,
} from "@/lib/types";

function shouldUsePostgres() {
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
