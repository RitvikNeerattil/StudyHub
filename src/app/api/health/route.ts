import { NextResponse } from "next/server";

import { getPool, hasDatabaseUrl } from "@/lib/db";

export async function GET() {
  if (!hasDatabaseUrl()) {
    return NextResponse.json({
      ok: process.env.NODE_ENV !== "production",
      database: "not-configured",
    }, { status: process.env.NODE_ENV === "production" ? 503 : 200 });
  }

  try {
    await getPool().query("SELECT 1");
    return NextResponse.json({ ok: true, database: "ready" });
  } catch {
    return NextResponse.json(
      { ok: false, database: "unavailable" },
      { status: 503 },
    );
  }
}
