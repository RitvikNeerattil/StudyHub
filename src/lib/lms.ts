import { promises as fs } from "node:fs";
import path from "node:path";

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

const templatePath = path.join(
  process.cwd(),
  "data",
  "blackboard-template.json",
);

export async function loadMockBlackboardPayload(
  userName: string,
): Promise<BlackboardImportPayload> {
  const raw = await fs.readFile(templatePath, "utf8");
  const payload = JSON.parse(raw) as BlackboardImportPayload;
  const firstName = userName.trim().split(" ")[0] || "Student";

  return {
    courses: payload.courses,
    assignments: payload.assignments.map((assignment) => ({
      ...assignment,
      description: `${assignment.description} Imported for ${firstName}.`,
    })),
  };
}
