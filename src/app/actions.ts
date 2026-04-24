"use server";

import { revalidatePath } from "next/cache";

import {
  createAssignment,
  createCourse,
  markBlackboardSync,
  updateAssignmentStatus,
} from "@/lib/store";
import type { AssignmentStatus, Priority } from "@/lib/types";

function getString(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

export async function addCourseAction(formData: FormData) {
  const name = getString(formData, "name");
  const code = getString(formData, "code");
  const professor = getString(formData, "professor");
  const cadence = getString(formData, "cadence");
  const workload = getString(formData, "workload");

  if (!name || !code || !professor || !cadence || !workload) {
    return;
  }

  await createCourse({ name, code, professor, cadence, workload });
  revalidatePath("/");
}

export async function addAssignmentAction(formData: FormData) {
  const title = getString(formData, "title");
  const courseId = getString(formData, "courseId");
  const dueDate = getString(formData, "dueDate");
  const dueTime = getString(formData, "dueTime") || "23:59";
  const priority = getString(formData, "priority") as Priority;
  const status = getString(formData, "status") as AssignmentStatus;
  const description = getString(formData, "description");

  if (!title || !courseId || !dueDate || !priority || !status) {
    return;
  }

  const dueAt = new Date(`${dueDate}T${dueTime}:00`).toISOString();
  await createAssignment({
    title,
    courseId,
    dueAt,
    priority,
    status,
    description,
  });
  revalidatePath("/");
}

export async function updateAssignmentStatusAction(formData: FormData) {
  const assignmentId = getString(formData, "assignmentId");
  const status = getString(formData, "status") as AssignmentStatus;

  if (!assignmentId || !status) {
    return;
  }

  await updateAssignmentStatus(assignmentId, status);
  revalidatePath("/");
}

export async function runBlackboardSyncAction() {
  await markBlackboardSync();
  revalidatePath("/");
}
