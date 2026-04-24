"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getCurrentUser, signInUser, signOutUser, signUpUser } from "@/lib/auth";
import { loadMockBlackboardPayload } from "@/lib/lms";
import {
  createAssignment,
  createCourse,
  importBlackboardData,
  markBlackboardSync,
  updateAssignmentStatus,
} from "@/lib/store";
import type { AssignmentStatus, Priority } from "@/lib/types";

function getString(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

export async function addCourseAction(formData: FormData) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/?authError=Please%20sign%20in%20again.");
  }

  const name = getString(formData, "name");
  const code = getString(formData, "code");
  const professor = getString(formData, "professor");
  const cadence = getString(formData, "cadence");
  const workload = getString(formData, "workload");

  if (!name || !code || !professor || !cadence || !workload) {
    return;
  }

  await createCourse({
    userId: user.id,
    name,
    code,
    professor,
    cadence,
    workload,
  });
  revalidatePath("/");
}

export async function addAssignmentAction(formData: FormData) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/?authError=Please%20sign%20in%20again.");
  }

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
    userId: user.id,
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
  const user = await getCurrentUser();

  if (!user) {
    redirect("/?authError=Please%20sign%20in%20again.");
  }

  const assignmentId = getString(formData, "assignmentId");
  const status = getString(formData, "status") as AssignmentStatus;

  if (!assignmentId || !status) {
    return;
  }

  await updateAssignmentStatus(user.id, assignmentId, status);
  revalidatePath("/");
}

export async function runBlackboardSyncAction() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/?authError=Please%20sign%20in%20again.");
  }

  const payload = await loadMockBlackboardPayload(user.name);
  await importBlackboardData(user.id, payload);
  await markBlackboardSync(user.id);
  revalidatePath("/");
}

export async function signUpAction(formData: FormData) {
  const name = getString(formData, "name");
  const email = getString(formData, "email");
  const password = getString(formData, "password");

  if (!name || !email || password.length < 8) {
    redirect(
      "/?authError=Use%20a%20name,%20valid%20email,%20and%20password%20with%20at%20least%208%20characters.",
    );
  }

  const result = await signUpUser({ name, email, password });

  if (result.error) {
    redirect(`/?authError=${encodeURIComponent(result.error)}`);
  }

  revalidatePath("/");
  redirect("/");
}

export async function signInAction(formData: FormData) {
  const email = getString(formData, "email");
  const password = getString(formData, "password");

  if (!email || !password) {
    redirect("/?authError=Enter%20your%20email%20and%20password.");
  }

  const result = await signInUser({ email, password });

  if (result.error) {
    redirect(`/?authError=${encodeURIComponent(result.error)}`);
  }

  revalidatePath("/");
  redirect("/");
}

export async function signOutAction() {
  await signOutUser();
  revalidatePath("/");
  redirect("/");
}
