import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { loadMockBlackboardPayload } from "@/lib/lms";
import { importBlackboardData, readStudyHubData } from "@/lib/store";

export async function GET() {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const data = await readStudyHubData(user.id);

  return NextResponse.json({
    connectedUser: {
      id: user.id,
      name: user.name,
      email: user.email,
    },
    syncState: {
      courses: data.courses.filter((course) => course.source === "Blackboard").length,
      assignments: data.assignments.filter(
        (assignment) => assignment.source === "Blackboard",
      ).length,
    },
    provider: "Blackboard",
    mode: "mock",
  });
}

export async function POST() {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = await loadMockBlackboardPayload(user.name);
  await importBlackboardData(user.id, payload);

  const data = await readStudyHubData(user.id);

  return NextResponse.json({
    ok: true,
    imported: {
      courses: payload.courses.length,
      assignments: payload.assignments.length,
    },
    totals: {
      courses: data.courses.length,
      assignments: data.assignments.length,
    },
  });
}
