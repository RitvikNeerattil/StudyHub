"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getCurrentUser, signInUser, signOutUser, signUpUser } from "@/lib/auth";
import {
  encryptBlackboardPassword,
  encryptGeminiApiKey,
  getStoredBlackboardCredentials,
} from "@/lib/credentials";
import { loadBlackboardPayload } from "@/lib/lms";
import { assertSameOriginAction } from "@/lib/request-security";
import {
  replaceBlackboardData,
  updateBlackboardCredentials,
  updateAssignmentStatus,
  updateGeminiCredentials,
} from "@/lib/store";
import type { AssignmentStatus } from "@/lib/types";

function getString(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function safeRedirectPath(value: string, fallback = "/") {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return fallback;
  }

  return value;
}

function withSearchParam(path: string, key: string, value: string) {
  const url = new URL(safeRedirectPath(path), "http://studyhub.local");
  url.searchParams.set(key, value);
  return `${url.pathname}${url.search}`;
}

export async function updateAssignmentStatusAction(formData: FormData) {
  await assertSameOriginAction();
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

export async function saveBlackboardCredentialsAction(formData: FormData) {
  await assertSameOriginAction();
  const user = await getCurrentUser();
  const redirectTo = safeRedirectPath(getString(formData, "redirectTo"));

  if (!user) {
    redirect("/?authError=Please%20sign%20in%20again.");
  }

  const username = getString(formData, "blackboardUsername");
  const password = String(formData.get("blackboardPassword") ?? "");

  if (!username || !password) {
    redirect(
      withSearchParam(
        redirectTo,
        "syncError",
        "Enter your Blackboard username and password.",
      ),
    );
  }

  await updateBlackboardCredentials(user.id, {
    username,
    passwordEncrypted: encryptBlackboardPassword(password),
    updatedAt: new Date().toISOString(),
  });

  revalidatePath("/");
  revalidatePath(redirectTo);
  redirect(withSearchParam(redirectTo, "syncStatus", "Blackboard credentials saved."));
}

export async function saveGeminiApiKeyAction(formData: FormData) {
  await assertSameOriginAction();
  const user = await getCurrentUser();
  const redirectTo = safeRedirectPath(
    getString(formData, "redirectTo"),
    "/grade-estimator",
  );

  if (!user) {
    redirect("/?authError=Please%20sign%20in%20again.");
  }

  const apiKey = String(formData.get("geminiApiKey") ?? "").trim();

  if (!apiKey) {
    redirect(
      withSearchParam(redirectTo, "geminiError", "Enter your Gemini API key."),
    );
  }

  await updateGeminiCredentials(user.id, {
    apiKeyEncrypted: encryptGeminiApiKey(apiKey),
    updatedAt: new Date().toISOString(),
  });

  revalidatePath(redirectTo);
  redirect(withSearchParam(redirectTo, "geminiStatus", "Gemini API key saved."));
}

export async function runBlackboardSyncAction(formData?: FormData) {
  await assertSameOriginAction();
  const user = await getCurrentUser();
  const redirectTo = safeRedirectPath(
    formData ? getString(formData, "redirectTo") : "",
  );

  if (!user) {
    redirect("/?authError=Please%20sign%20in%20again.");
  }

  let redirectTarget = redirectTo;

  try {
    const credentials = getStoredBlackboardCredentials(user);
    const payload = await loadBlackboardPayload(credentials);
    const result = await replaceBlackboardData(user.id, payload);
    const assignmentCount =
      result.assignments.created + result.assignments.updated;
    const courseCount = result.courses.created + result.courses.updated;

    redirectTarget = withSearchParam(
      redirectTo,
      "syncStatus",
      `Blackboard sync complete: ${courseCount} courses and ${assignmentCount} assignments refreshed.`,
    );
  } catch (error) {
    redirectTarget = withSearchParam(
      redirectTo,
      "syncError",
      error instanceof Error
        ? error.message
        : "Blackboard sync failed. Check the server logs.",
    );
  }

  revalidatePath("/");
  revalidatePath(redirectTo);
  redirect(redirectTarget);
}

export async function signUpAction(formData: FormData) {
  await assertSameOriginAction();
  const name = getString(formData, "name");
  const email = getString(formData, "email");
  const password = String(formData.get("password") ?? "");

  if (!name || !email || password.length < 12) {
    redirect(
      "/?authError=Use%20a%20name,%20valid%20email,%20and%20password%20with%20at%20least%2012%20characters.",
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
  await assertSameOriginAction();
  const email = getString(formData, "email");
  const password = String(formData.get("password") ?? "");

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
