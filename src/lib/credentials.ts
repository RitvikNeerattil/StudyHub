import "server-only";

import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from "node:crypto";

import type { User } from "@/lib/types";

const algorithm = "aes-256-gcm";
const localDevelopmentSecret = "studyhub-local-development-credential-secret";
const payloadVersion = "v1";

function configuredSecret() {
  return (
    process.env.STUDYHUB_CREDENTIAL_SECRET?.trim() ||
    process.env.AUTH_SECRET?.trim() ||
    process.env.NEXTAUTH_SECRET?.trim() ||
    ""
  );
}

function encryptionKey() {
  const secret = configuredSecret();

  if (process.env.NODE_ENV === "production" && secret.length < 32) {
    throw new Error(
      "Set STUDYHUB_CREDENTIAL_SECRET to at least 32 characters before saving account credentials.",
    );
  }

  return createHash("sha256")
    .update(secret || localDevelopmentSecret)
    .digest();
}

function encryptSecret(value: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv(algorithm, encryptionKey(), iv);
  const encrypted = Buffer.concat([
    cipher.update(value, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();

  return [
    payloadVersion,
    iv.toString("hex"),
    tag.toString("hex"),
    encrypted.toString("hex"),
  ].join(":");
}

function decryptSecret(payload: string, label: string) {
  const [version, ivHex, tagHex, encryptedHex] = payload.split(":");

  if (
    version !== payloadVersion ||
    !ivHex ||
    !tagHex ||
    !encryptedHex
  ) {
    throw new Error(`Saved ${label} is in an unsupported format.`);
  }

  const decipher = createDecipheriv(
    algorithm,
    encryptionKey(),
    Buffer.from(ivHex, "hex"),
  );
  decipher.setAuthTag(Buffer.from(tagHex, "hex"));

  return Buffer.concat([
    decipher.update(Buffer.from(encryptedHex, "hex")),
    decipher.final(),
  ]).toString("utf8");
}

export function encryptBlackboardPassword(password: string) {
  return encryptSecret(password);
}

export function decryptBlackboardPassword(payload: string) {
  return decryptSecret(payload, "Blackboard password");
}

export function getStoredBlackboardCredentials(user: User) {
  if (!user.blackboardUsername || !user.blackboardPasswordEncrypted) {
    throw new Error("Save your Blackboard credentials before syncing.");
  }

  return {
    username: user.blackboardUsername,
    password: decryptBlackboardPassword(user.blackboardPasswordEncrypted),
  };
}

export function encryptGeminiApiKey(apiKey: string) {
  return encryptSecret(apiKey);
}

export function decryptGeminiApiKey(payload: string) {
  return decryptSecret(payload, "Gemini API key");
}

export function getStoredGeminiApiKey(user: User) {
  if (!user.geminiApiKeyEncrypted) {
    throw new Error("Save your Gemini API key before analyzing a syllabus.");
  }

  return decryptGeminiApiKey(user.geminiApiKeyEncrypted);
}
