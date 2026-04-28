import { headers } from "next/headers";

function sameOrigin(origin: string | null, host: string | null) {
  if (!origin || !host) {
    return true;
  }

  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

export async function assertSameOriginAction() {
  const headerStore = await headers();
  const origin = headerStore.get("origin");
  const host = headerStore.get("x-forwarded-host") ?? headerStore.get("host");

  if (!sameOrigin(origin, host)) {
    throw new Error("Invalid request origin.");
  }
}

export function isSameOriginRequest(request: Request) {
  const origin = request.headers.get("origin");
  const host =
    request.headers.get("x-forwarded-host") ?? request.headers.get("host");

  return sameOrigin(origin, host);
}
