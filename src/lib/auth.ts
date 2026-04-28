import {
  createHash,
  randomBytes,
  randomUUID,
  scryptSync,
  timingSafeEqual,
} from "node:crypto";

import { cookies } from "next/headers";

import {
  createUserRecord,
  clearLoginAttempt,
  deleteSessionRecord,
  findSessionUser,
  findUserByEmail,
  readLoginAttempt,
  saveLoginAttempt,
  upsertSessionRecord,
} from "@/lib/store";
import type { User } from "@/lib/types";

const sessionCookieName = "studyhub_session";
const sessionLifetimeMs = 1000 * 60 * 60 * 24 * 14;
const passwordKeyLength = 64;
const scryptParams = {
  N: 16384,
  r: 8,
  p: 1,
  maxmem: 32 * 1024 * 1024,
};
const maxLoginFailures = 8;
const loginLockMs = 1000 * 60 * 15;
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const dummyPasswordHash = hashPassword("studyhub-dummy-password");

function createId(prefix: string) {
  return `${prefix}-${randomUUID()}`;
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function validEmail(email: string) {
  return email.length <= 254 && emailPattern.test(email);
}

function validPassword(password: string) {
  return password.length >= 12 && password.length <= 256;
}

function hashSessionToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function loginAttemptKey(email: string) {
  return createHash("sha256").update(`email:${email}`).digest("hex");
}

export function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(
    password,
    salt,
    passwordKeyLength,
    scryptParams,
  ).toString("hex");

  return [
    "scrypt",
    "v1",
    scryptParams.N,
    scryptParams.r,
    scryptParams.p,
    passwordKeyLength,
    salt,
    hash,
  ].join(":");
}

export function verifyPassword(password: string, passwordHash: string) {
  const parts = passwordHash.split(":");
  let salt = "";
  let storedHash = "";
  let keyLength = passwordKeyLength;
  let params = scryptParams;

  if (parts[0] === "scrypt" && parts[1] === "v1") {
    const [, , n, r, p, length, parsedSalt, parsedHash] = parts;

    salt = parsedSalt ?? "";
    storedHash = parsedHash ?? "";
    keyLength = Number.parseInt(length ?? "", 10);
    params = {
      N: Number.parseInt(n ?? "", 10),
      r: Number.parseInt(r ?? "", 10),
      p: Number.parseInt(p ?? "", 10),
      maxmem: scryptParams.maxmem,
    };
  } else {
    [salt, storedHash] = parts;
  }

  if (
    !salt ||
    !storedHash ||
    !Number.isFinite(keyLength) ||
    !Number.isFinite(params.N) ||
    !Number.isFinite(params.r) ||
    !Number.isFinite(params.p)
  ) {
    return false;
  }

  const hashBuffer = scryptSync(password, salt, keyLength, params);
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

  const sessionUser = await findSessionUser(hashSessionToken(token));

  if (!sessionUser) {
    return null;
  }

  return sessionUser;
}

export async function signUpUser(input: {
  name: string;
  email: string;
  password: string;
}) {
  const name = input.name.trim();
  const email = normalizeEmail(input.email);

  if (!name || name.length > 120 || !validEmail(email)) {
    return { error: "Use a valid name and email address." };
  }

  if (!validPassword(input.password)) {
    return { error: "Use a password with at least 12 characters." };
  }

  const existingUser = await findUserByEmail(email);

  if (existingUser) {
    return { error: "An account with that email already exists." };
  }

  const user: User = {
    id: createId("user"),
    name,
    email,
    passwordHash: hashPassword(input.password),
    createdAt: new Date().toISOString(),
  };

  await createUserRecord(user, { courses: [], assignments: [] });
  await createSessionForUser(user.id);
  return { error: null };
}

export async function signInUser(input: { email: string; password: string }) {
  const email = normalizeEmail(input.email);

  if (!validEmail(email) || !input.password) {
    return { error: "Invalid email or password." };
  }

  const attemptKey = loginAttemptKey(email);
  const attempt = await readLoginAttempt(attemptKey);
  const lockedUntil = attempt?.lockedUntil
    ? new Date(attempt.lockedUntil).getTime()
    : 0;

  if (lockedUntil > Date.now()) {
    return { error: "Too many failed sign-in attempts. Try again later." };
  }

  const user = await findUserByEmail(email);
  const passwordHash = user?.passwordHash ?? dummyPasswordHash;
  const passwordMatches = verifyPassword(input.password, passwordHash);

  if (!user || !passwordMatches) {
    const failures = (attempt?.failures ?? 0) + 1;
    const now = new Date();
    const nextLockedUntil =
      failures >= maxLoginFailures
        ? new Date(now.getTime() + loginLockMs).toISOString()
        : undefined;

    await saveLoginAttempt({
      key: attemptKey,
      failures,
      lockedUntil: nextLockedUntil,
      updatedAt: now.toISOString(),
    });

    return { error: "Invalid email or password." };
  }

  await clearLoginAttempt(attemptKey);
  await createSessionForUser(user.id);
  return { error: null };
}

export async function signOutUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get(sessionCookieName)?.value;

  if (token) {
    await deleteSessionRecord(hashSessionToken(token));
  }

  await clearSessionCookie();
}

async function createSessionForUser(userId: string) {
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + sessionLifetimeMs);

  await upsertSessionRecord({
    id: createId("session"),
    userId,
    token: hashSessionToken(token),
    expiresAt: expiresAt.toISOString(),
  });

  await setSessionCookie(token, expiresAt);
}
