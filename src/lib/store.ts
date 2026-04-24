import { hasDatabaseUrl } from "@/lib/db";
import {
  createJsonAssignment,
  createJsonCourse,
  markJsonBlackboardSync,
  readJsonStudyHubData,
  updateJsonAssignmentStatus,
} from "@/lib/store-json";
import {
  createPostgresAssignment,
  createPostgresCourse,
  markPostgresBlackboardSync,
  readPostgresStudyHubData,
  updatePostgresAssignmentStatus,
} from "@/lib/store-postgres";
import type { AssignmentStatus, Priority, StudyHubData } from "@/lib/types";

function shouldUsePostgres() {
  return hasDatabaseUrl();
}

export async function readStudyHubData(): Promise<StudyHubData> {
  if (shouldUsePostgres()) {
    return readPostgresStudyHubData();
  }

  return readJsonStudyHubData();
}

export async function createCourse(input: {
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
  assignmentId: string,
  status: AssignmentStatus,
) {
  if (shouldUsePostgres()) {
    return updatePostgresAssignmentStatus(assignmentId, status);
  }

  return updateJsonAssignmentStatus(assignmentId, status);
}

export async function markBlackboardSync() {
  if (shouldUsePostgres()) {
    return markPostgresBlackboardSync();
  }

  return markJsonBlackboardSync();
}
