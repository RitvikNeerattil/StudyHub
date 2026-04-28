import { loadRealBlackboardPayload } from "@/lib/blackboard";
import type { AssignmentStatus, Priority } from "@/lib/types";

export type BlackboardImportCourse = {
  externalId: string;
  name: string;
  code: string;
  professor: string;
  cadence: string;
  workload: string;
};

export type BlackboardImportAssignment = {
  externalId: string;
  courseExternalId: string;
  title: string;
  dueAt: string;
  priority: Priority;
  status: AssignmentStatus;
  description: string;
};

export type BlackboardImportPayload = {
  courses: BlackboardImportCourse[];
  assignments: BlackboardImportAssignment[];
};

export type BlackboardSyncResult = {
  syncedAt: string;
  courses: {
    created: number;
    updated: number;
  };
  assignments: {
    created: number;
    updated: number;
    skipped: number;
  };
};

export type BlackboardLoginCredentials = {
  username: string;
  password: string;
};

export async function loadBlackboardPayload(
  credentials: BlackboardLoginCredentials,
): Promise<BlackboardImportPayload> {
  return loadRealBlackboardPayload(credentials);
}
