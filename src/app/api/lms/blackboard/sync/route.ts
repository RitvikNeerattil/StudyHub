import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { getStoredBlackboardCredentials } from "@/lib/credentials";
import { visibleStudyHubData } from "@/lib/dashboard-filters";
import { loadBlackboardPayload } from "@/lib/lms";
import { isSameOriginRequest } from "@/lib/request-security";
import { readStudyHubData, replaceBlackboardData } from "@/lib/store";

export async function GET() {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const data = visibleStudyHubData(await readStudyHubData(user.id));

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
      credentialsSaved: Boolean(
        user.blackboardUsername && user.blackboardPasswordEncrypted,
      ),
    },
    provider: "Blackboard",
    mode: "usc-cas",
  });
}

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  }

  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let payload;
  let sync;

  try {
    const credentials = getStoredBlackboardCredentials(user);
    payload = await loadBlackboardPayload(credentials);
    sync = await replaceBlackboardData(user.id, payload);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Blackboard sync failed. Check the server logs.",
      },
      { status: 502 },
    );
  }

  const data = visibleStudyHubData(await readStudyHubData(user.id));

  return NextResponse.json({
    ok: true,
    imported: {
      courses: payload.courses.length,
      assignments: payload.assignments.length,
    },
    sync,
    totals: {
      courses: data.courses.length,
      assignments: data.assignments.length,
    },
  });
}
