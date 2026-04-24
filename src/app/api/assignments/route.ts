import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { readStudyHubData } from "@/lib/store";

export async function GET() {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const data = await readStudyHubData(user.id);
  return NextResponse.json({ assignments: data.assignments });
}
