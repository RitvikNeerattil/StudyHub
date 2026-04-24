import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

import { cookies } from "next/headers";

import {
  createUserRecord,
  deleteSessionRecord,
  findSessionUser,
  findUserByEmail,
  readStudyHubData,
  upsertSessionRecord,
} from "@/lib/store";
import type { User } from "@/lib/types";

const sessionCookieName = "studyhub_session";
const sessionLifetimeMs = 1000 * 60 * 60 * 24 * 14;

function createId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

export function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, passwordHash: string) {
  const [salt, storedHash] = passwordHash.split(":");

  if (!salt || !storedHash) {
    return false;
  }

  const hashBuffer = scryptSync(password, salt, 64);
  const storedBuffer = Buffer.from(storedHash, "hex");

  if (hashBuffer.length !== storedBuffer.length) {
    return false;
  }

  return timingSafeEqual(hashBuffer, storedBuffer);
}

async function setSessionCookie(token: string, expiresAt: Date) {
  const cookieStore = await cookies();
  cookieStore.set(sessionCookieName, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    expires: expiresAt,
    path: "/",
  });
}

export async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(sessionCookieName);
}

export async function getCurrentUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get(sessionCookieName)?.value;

  if (!token) {
    return null;
  }

  const sessionUser = await findSessionUser(token);

  if (!sessionUser) {
    await clearSessionCookie();
    return null;
  }

  return sessionUser;
}

export async function signUpUser(input: {
  name: string;
  email: string;
  password: string;
}) {
  const email = input.email.toLowerCase();
  const existingUser = await findUserByEmail(email);

  if (existingUser) {
    return { error: "An account with that email already exists." };
  }

  const user: User = {
    id: createId("user"),
    name: input.name,
    email,
    passwordHash: hashPassword(input.password),
    createdAt: new Date().toISOString(),
  };

  await createUserRecord(user, await readStudyHubData());
  await createSessionForUser(user.id);
  return { error: null };
}

export async function signInUser(input: { email: string; password: string }) {
  const email = input.email.toLowerCase();
  const user = await findUserByEmail(email);

  if (!user || !verifyPassword(input.password, user.passwordHash)) {
    return { error: "Invalid email or password." };
  }

  await createSessionForUser(user.id);
  return { error: null };
}

export async function signOutUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get(sessionCookieName)?.value;

  if (token) {
    await deleteSessionRecord(token);
  }

  await clearSessionCookie();
}

async function createSessionForUser(userId: string) {
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + sessionLifetimeMs);

  await upsertSessionRecord({
    id: createId("session"),
    userId,
    token,
    expiresAt: expiresAt.toISOString(),
  });

  await setSessionCookie(token, expiresAt);
}
