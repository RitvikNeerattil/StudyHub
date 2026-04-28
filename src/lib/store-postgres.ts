import { randomUUID } from "node:crypto";

import { getPool } from "@/lib/db";
import type { BlackboardImportPayload, BlackboardSyncResult } from "@/lib/lms";
import type {
  Assignment,
  AssignmentStatus,
  BlackboardCredentialUpdate,
  Course,
  GeminiCredentialUpdate,
  LoginAttempt,
  Priority,
  Session,
  StudyHubData,
  User,
} from "@/lib/types";

let initialized = false;

function createId(prefix: string) {
  return `${prefix}-${randomUUID()}`;
}

function mapLoginAttempt(row: {
  key: string;
  failures: number;
  locked_until: Date | string | null;
  updated_at: Date | string;
}): LoginAttempt {
  return {
    key: row.key,
    failures: Number(row.failures),
    lockedUntil: row.locked_until
      ? row.locked_until instanceof Date
        ? row.locked_until.toISOString()
        : String(row.locked_until)
      : undefined,
    updatedAt:
      row.updated_at instanceof Date
        ? row.updated_at.toISOString()
        : String(row.updated_at),
  };
}

function mapUser(row: {
  id: string;
  name: string;
  email: string;
  password_hash: string;
  created_at: Date | string;
  blackboard_username: string | null;
  blackboard_password_encrypted: string | null;
  blackboard_credentials_updated_at: Date | string | null;
  gemini_api_key_encrypted: string | null;
  gemini_api_key_updated_at: Date | string | null;
}): User {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    passwordHash: row.password_hash,
    createdAt:
      row.created_at instanceof Date
        ? row.created_at.toISOString()
        : String(row.created_at),
    blackboardUsername: row.blackboard_username ?? undefined,
    blackboardPasswordEncrypted:
      row.blackboard_password_encrypted ?? undefined,
    blackboardCredentialsUpdatedAt: row.blackboard_credentials_updated_at
      ? row.blackboard_credentials_updated_at instanceof Date
        ? row.blackboard_credentials_updated_at.toISOString()
        : String(row.blackboard_credentials_updated_at)
      : undefined,
    geminiApiKeyEncrypted: row.gemini_api_key_encrypted ?? undefined,
    geminiApiKeyUpdatedAt: row.gemini_api_key_updated_at
      ? row.gemini_api_key_updated_at instanceof Date
        ? row.gemini_api_key_updated_at.toISOString()
        : String(row.gemini_api_key_updated_at)
      : undefined,
  };
}

function mapCourse(row: {
  id: string;
  name: string;
  code: string;
  professor: string;
  cadence: string;
  sync_status: string;
  workload: string;
  source: string;
  external_id: string | null;
}): Course {
  return {
    id: row.id,
    name: row.name,
    code: row.code,
    professor: row.professor,
    cadence: row.cadence,
    syncStatus: row.sync_status,
    workload: row.workload,
    source: row.source as Course["source"],
    externalId: row.external_id ?? undefined,
  };
}

function mapAssignment(row: {
  id: string;
  title: string;
  course_id: string;
  due_at: Date | string;
  priority: string;
  status: string;
  source: string;
  description: string;
  external_id: string | null;
}): Assignment {
  return {
    id: row.id,
    title: row.title,
    courseId: row.course_id,
    dueAt:
      row.due_at instanceof Date ? row.due_at.toISOString() : String(row.due_at),
    priority: row.priority as Priority,
    status: row.status as AssignmentStatus,
    source: row.source as Assignment["source"],
    description: row.description,
    externalId: row.external_id ?? undefined,
  };
}

export async function ensureDatabase() {
  if (initialized) {
    return;
  }

  const pool = getPool();

  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL,
      blackboard_username TEXT,
      blackboard_password_encrypted TEXT,
      blackboard_credentials_updated_at TIMESTAMPTZ,
      gemini_api_key_encrypted TEXT,
      gemini_api_key_updated_at TIMESTAMPTZ
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token TEXT NOT NULL UNIQUE,
      expires_at TIMESTAMPTZ NOT NULL
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS login_attempts (
      key TEXT PRIMARY KEY,
      failures INTEGER NOT NULL,
      locked_until TIMESTAMPTZ,
      updated_at TIMESTAMPTZ NOT NULL
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS courses (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      code TEXT NOT NULL,
      professor TEXT NOT NULL,
      cadence TEXT NOT NULL,
      sync_status TEXT NOT NULL,
      workload TEXT NOT NULL,
      source TEXT NOT NULL CHECK (source IN ('Blackboard', 'Manual')),
      external_id TEXT
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS assignments (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      course_id TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
      due_at TIMESTAMPTZ NOT NULL,
      priority TEXT NOT NULL CHECK (priority IN ('High', 'Medium', 'Low')),
      status TEXT NOT NULL CHECK (
        status IN (
          'Not started',
          'In progress',
          'Needs review',
          'Submitted',
          'Waiting on team',
          'Draft ready'
        )
      ),
      source TEXT NOT NULL CHECK (source IN ('Blackboard', 'Manual')),
      description TEXT NOT NULL DEFAULT '',
      external_id TEXT
    );
  `);

  await pool.query(`
    ALTER TABLE courses
    ADD COLUMN IF NOT EXISTS user_id TEXT REFERENCES users(id) ON DELETE CASCADE;
  `);

  await pool.query(`
    ALTER TABLE users
    ADD COLUMN IF NOT EXISTS blackboard_username TEXT;
  `);

  await pool.query(`
    ALTER TABLE users
    ADD COLUMN IF NOT EXISTS blackboard_password_encrypted TEXT;
  `);

  await pool.query(`
    ALTER TABLE users
    ADD COLUMN IF NOT EXISTS blackboard_credentials_updated_at TIMESTAMPTZ;
  `);

  await pool.query(`
    ALTER TABLE users
    ADD COLUMN IF NOT EXISTS gemini_api_key_encrypted TEXT;
  `);

  await pool.query(`
    ALTER TABLE users
    ADD COLUMN IF NOT EXISTS gemini_api_key_updated_at TIMESTAMPTZ;
  `);

  await pool.query(`
    ALTER TABLE courses
    ADD COLUMN IF NOT EXISTS external_id TEXT;
  `);

  await pool.query(`
    ALTER TABLE assignments
    ADD COLUMN IF NOT EXISTS user_id TEXT REFERENCES users(id) ON DELETE CASCADE;
  `);

  await pool.query(`
    ALTER TABLE assignments
    ADD COLUMN IF NOT EXISTS external_id TEXT;
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS sessions_user_id_idx ON sessions(user_id);
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS sessions_expires_at_idx ON sessions(expires_at);
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS courses_user_id_idx ON courses(user_id);
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS assignments_user_id_idx ON assignments(user_id);
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS assignments_course_id_idx ON assignments(course_id);
  `);

  initialized = true;
}

export async function readPostgresStudyHubData(userId: string): Promise<StudyHubData> {
  await ensureDatabase();
  const pool = getPool();

  const [courseResult, assignmentResult] = await Promise.all([
    pool.query(
      `
      SELECT id, name, code, professor, cadence, sync_status, workload, source
      , external_id
      FROM courses
      WHERE user_id = $1
      ORDER BY name ASC
    `,
      [userId],
    ),
    pool.query(
      `
      SELECT id, title, course_id, due_at, priority, status, source, description
      , external_id
      FROM assignments
      WHERE user_id = $1
      ORDER BY due_at ASC
    `,
      [userId],
    ),
  ]);

  return {
    courses: courseResult.rows.map(mapCourse),
    assignments: assignmentResult.rows.map(mapAssignment),
  };
}

export async function createPostgresCourse(input: {
  userId: string;
  name: string;
  code: string;
  professor: string;
  cadence: string;
  workload: string;
}) {
  await ensureDatabase();
  const pool = getPool();

  await pool.query(
    `
      INSERT INTO courses (
        id, user_id, name, code, professor, cadence, sync_status, workload, source, external_id
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'Manual', NULL)
    `,
    [
      createId("course"),
      input.userId,
      input.name,
      input.code,
      input.professor,
      input.cadence,
      "Manual course",
      input.workload,
    ],
  );
}

export async function createPostgresAssignment(input: {
  userId: string;
  title: string;
  courseId: string;
  dueAt: string;
  priority: Priority;
  status: AssignmentStatus;
  description: string;
}) {
  await ensureDatabase();
  const pool = getPool();

  await pool.query(
    `
      INSERT INTO assignments (
        id, user_id, title, course_id, due_at, priority, status, source, description, external_id
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, 'Manual', $8, NULL)
    `,
    [
      createId("assignment"),
      input.userId,
      input.title,
      input.courseId,
      input.dueAt,
      input.priority,
      input.status,
      input.description,
    ],
  );
}

export async function updatePostgresAssignmentStatus(
  userId: string,
  assignmentId: string,
  status: AssignmentStatus,
) {
  await ensureDatabase();
  const pool = getPool();

  await pool.query("UPDATE assignments SET status = $3 WHERE id = $1 AND user_id = $2", [
    assignmentId,
    userId,
    status,
  ]);
}

export async function clearPostgresCourseworkForUser(userId: string) {
  await ensureDatabase();
  const pool = getPool();

  await pool.query("DELETE FROM assignments WHERE user_id = $1", [userId]);
  await pool.query("DELETE FROM courses WHERE user_id = $1", [userId]);
}

export async function markPostgresBlackboardSync(userId: string) {
  await ensureDatabase();
  const pool = getPool();
  const syncStamp = `Blackboard sync checked ${new Date().toLocaleTimeString(
    "en-US",
    {
      hour: "numeric",
      minute: "2-digit",
    },
  )}`;

  await pool.query(
    "UPDATE courses SET sync_status = $1 WHERE source = 'Blackboard' AND user_id = $2",
    [syncStamp, userId],
  );
}

export async function findPostgresUserByEmail(email: string) {
  await ensureDatabase();
  const pool = getPool();
  const result = await pool.query(
    `
      SELECT
        id,
        name,
        email,
        password_hash,
        created_at,
        blackboard_username,
        blackboard_password_encrypted,
        blackboard_credentials_updated_at,
        gemini_api_key_encrypted,
        gemini_api_key_updated_at
      FROM users
      WHERE email = $1
      LIMIT 1
    `,
    [email],
  );

  const row = result.rows[0];

  if (!row) {
    return null;
  }

  return mapUser(row);
}

export async function createPostgresUserRecord(user: User, seed: StudyHubData) {
  await ensureDatabase();
  const pool = getPool();

  await pool.query(
    `
      INSERT INTO users (id, name, email, password_hash, created_at)
      VALUES ($1, $2, $3, $4, $5)
    `,
    [user.id, user.name, user.email, user.passwordHash, user.createdAt],
  );

  for (const course of seed.courses) {
    await pool.query(
      `
        INSERT INTO courses (
          id, user_id, name, code, professor, cadence, sync_status, workload, source, external_id
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      `,
      [
        `${user.id}-${course.id}`,
        user.id,
        course.name,
        course.code,
        course.professor,
        course.cadence,
        course.syncStatus,
        course.workload,
        course.source,
        course.externalId ?? null,
      ],
    );
  }

  for (const assignment of seed.assignments) {
    await pool.query(
      `
        INSERT INTO assignments (
          id, user_id, title, course_id, due_at, priority, status, source, description, external_id
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      `,
      [
        `${user.id}-${assignment.id}`,
        user.id,
        assignment.title,
        `${user.id}-${assignment.courseId}`,
        assignment.dueAt,
        assignment.priority,
        assignment.status,
        assignment.source,
        assignment.description,
        assignment.externalId ?? null,
      ],
    );
  }
}

export async function updatePostgresBlackboardCredentials(
  userId: string,
  input: BlackboardCredentialUpdate,
) {
  await ensureDatabase();
  const pool = getPool();
  const result = await pool.query(
    `
      UPDATE users
      SET
        blackboard_username = $2,
        blackboard_password_encrypted = $3,
        blackboard_credentials_updated_at = $4
      WHERE id = $1
    `,
    [userId, input.username, input.passwordEncrypted, input.updatedAt],
  );

  if (result.rowCount === 0) {
    throw new Error("Could not find the signed-in user.");
  }
}

export async function updatePostgresGeminiCredentials(
  userId: string,
  input: GeminiCredentialUpdate,
) {
  await ensureDatabase();
  const pool = getPool();
  const result = await pool.query(
    `
      UPDATE users
      SET
        gemini_api_key_encrypted = $2,
        gemini_api_key_updated_at = $3
      WHERE id = $1
    `,
    [userId, input.apiKeyEncrypted, input.updatedAt],
  );

  if (result.rowCount === 0) {
    throw new Error("Could not find the signed-in user.");
  }
}

export async function upsertPostgresSessionRecord(session: Session) {
  await ensureDatabase();
  const pool = getPool();

  await pool.query("DELETE FROM sessions WHERE expires_at <= NOW()");
  await pool.query("DELETE FROM sessions WHERE user_id = $1", [session.userId]);
  await pool.query(
    `
      INSERT INTO sessions (id, user_id, token, expires_at)
      VALUES ($1, $2, $3, $4)
    `,
    [session.id, session.userId, session.token, session.expiresAt],
  );
}

export async function deletePostgresSessionRecord(token: string) {
  await ensureDatabase();
  const pool = getPool();
  await pool.query("DELETE FROM sessions WHERE token = $1", [token]);
}

export async function findPostgresSessionUser(token: string) {
  await ensureDatabase();
  const pool = getPool();

  await pool.query("DELETE FROM sessions WHERE expires_at <= NOW()");
  const result = await pool.query(
    `
      SELECT
        u.id,
        u.name,
        u.email,
        u.password_hash,
        u.created_at,
        u.blackboard_username,
        u.blackboard_password_encrypted,
        u.blackboard_credentials_updated_at,
        u.gemini_api_key_encrypted,
        u.gemini_api_key_updated_at
      FROM sessions s
      JOIN users u ON u.id = s.user_id
      WHERE s.token = $1 AND s.expires_at > NOW()
      LIMIT 1
    `,
    [token],
  );

  const row = result.rows[0];

  if (!row) {
    return null;
  }

  return mapUser(row);
}

export async function readPostgresLoginAttempt(key: string) {
  await ensureDatabase();
  const pool = getPool();
  const result = await pool.query(
    `
      SELECT key, failures, locked_until, updated_at
      FROM login_attempts
      WHERE key = $1
      LIMIT 1
    `,
    [key],
  );

  const row = result.rows[0];
  return row ? mapLoginAttempt(row) : null;
}

export async function savePostgresLoginAttempt(attempt: LoginAttempt) {
  await ensureDatabase();
  const pool = getPool();

  await pool.query(
    `
      INSERT INTO login_attempts (key, failures, locked_until, updated_at)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (key) DO UPDATE SET
        failures = EXCLUDED.failures,
        locked_until = EXCLUDED.locked_until,
        updated_at = EXCLUDED.updated_at
    `,
    [
      attempt.key,
      attempt.failures,
      attempt.lockedUntil ?? null,
      attempt.updatedAt,
    ],
  );
}

export async function clearPostgresLoginAttempt(key: string) {
  await ensureDatabase();
  const pool = getPool();
  await pool.query("DELETE FROM login_attempts WHERE key = $1", [key]);
}

export async function importPostgresBlackboardData(
  userId: string,
  payload: BlackboardImportPayload,
): Promise<BlackboardSyncResult> {
  await ensureDatabase();
  const pool = getPool();
  const syncedAt = new Date();
  const syncStamp = `Blackboard sync checked ${syncedAt.toLocaleTimeString(
    "en-US",
    {
      hour: "numeric",
      minute: "2-digit",
    },
  )}`;
  const result: BlackboardSyncResult = {
    syncedAt: syncedAt.toISOString(),
    courses: {
      created: 0,
      updated: 0,
    },
    assignments: {
      created: 0,
      updated: 0,
      skipped: 0,
    },
  };
  const courseIdsByExternalId = new Map<string, string>();

  for (const course of payload.courses) {
    const existingCourse = await pool.query(
      `
        SELECT id
        FROM courses
        WHERE user_id = $1
          AND source = 'Blackboard'
          AND external_id = $2
        ORDER BY id ASC
        LIMIT 1
      `,
      [userId, course.externalId],
    );
    const courseId =
      existingCourse.rows[0]?.id ?? `${userId}-course-${course.externalId}`;

    await pool.query(
      `
        INSERT INTO courses (
          id, user_id, name, code, professor, cadence, sync_status, workload, source, external_id
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'Blackboard', $9)
        ON CONFLICT (id) DO UPDATE SET
          name = EXCLUDED.name,
          code = EXCLUDED.code,
          professor = EXCLUDED.professor,
          cadence = EXCLUDED.cadence,
          sync_status = EXCLUDED.sync_status,
          workload = EXCLUDED.workload,
          source = EXCLUDED.source,
          external_id = EXCLUDED.external_id
      `,
      [
        courseId,
        userId,
        course.name,
        course.code,
        course.professor,
        course.cadence,
        syncStamp,
        course.workload,
        course.externalId,
      ],
    );
    courseIdsByExternalId.set(course.externalId, courseId);

    if (existingCourse.rows[0]) {
      result.courses.updated += 1;
    } else {
      result.courses.created += 1;
    }
  }

  for (const assignment of payload.assignments) {
    if (assignment.status === "Submitted") {
      result.assignments.skipped += 1;
      continue;
    }

    let courseId = courseIdsByExternalId.get(assignment.courseExternalId);

    if (!courseId) {
      const courseResult = await pool.query(
        `
          SELECT id
          FROM courses
          WHERE user_id = $1
            AND source = 'Blackboard'
            AND external_id = $2
          ORDER BY id ASC
          LIMIT 1
        `,
        [userId, assignment.courseExternalId],
      );
      courseId = courseResult.rows[0]?.id;
    }

    if (!courseId) {
      result.assignments.skipped += 1;
      continue;
    }

    const existingAssignment = await pool.query(
      `
        SELECT id
        FROM assignments
        WHERE user_id = $1
          AND source = 'Blackboard'
          AND external_id = $2
        ORDER BY id ASC
        LIMIT 1
      `,
      [userId, assignment.externalId],
    );
    const assignmentId =
      existingAssignment.rows[0]?.id ??
      `${userId}-assignment-${assignment.externalId}`;

    await pool.query(
      `
        INSERT INTO assignments (
          id, user_id, title, course_id, due_at, priority, status, source, description, external_id
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, 'Blackboard', $8, $9)
        ON CONFLICT (id) DO UPDATE SET
          title = EXCLUDED.title,
          course_id = EXCLUDED.course_id,
          due_at = EXCLUDED.due_at,
          priority = EXCLUDED.priority,
          status = EXCLUDED.status,
          source = EXCLUDED.source,
          description = EXCLUDED.description,
          external_id = EXCLUDED.external_id
      `,
      [
        assignmentId,
        userId,
        assignment.title,
        courseId,
        assignment.dueAt,
        assignment.priority,
        assignment.status,
        assignment.description,
        assignment.externalId,
      ],
    );

    if (existingAssignment.rows[0]) {
      result.assignments.updated += 1;
    } else {
      result.assignments.created += 1;
    }
  }

  return result;
}
