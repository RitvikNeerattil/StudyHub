import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { visibleStudyHubData } from "@/lib/dashboard-filters";
import { readStudyHubData } from "@/lib/store";

export async function GET() {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const data = visibleStudyHubData(await readStudyHubData(user.id));
  return NextResponse.json({ courses: data.courses });
}
