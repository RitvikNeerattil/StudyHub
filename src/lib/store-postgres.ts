import { getPool } from "@/lib/db";
import type {
  Assignment,
  AssignmentStatus,
  Course,
  Priority,
  Session,
  StudyHubData,
  User,
} from "@/lib/types";

let initialized = false;

function createId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
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
      created_at TIMESTAMPTZ NOT NULL
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
    CREATE TABLE IF NOT EXISTS courses (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      name TEXT NOT NULL,
      code TEXT NOT NULL,
      professor TEXT NOT NULL,
      cadence TEXT NOT NULL,
      sync_status TEXT NOT NULL,
      workload TEXT NOT NULL,
      source TEXT NOT NULL CHECK (source IN ('Blackboard', 'Manual'))
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS assignments (
      id TEXT PRIMARY KEY,
      user_id TEXT,
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
      description TEXT NOT NULL DEFAULT ''
    );
  `);

  await pool.query(`
    ALTER TABLE courses
    ADD COLUMN IF NOT EXISTS user_id TEXT REFERENCES users(id) ON DELETE CASCADE;
  `);

  await pool.query(`
    ALTER TABLE assignments
    ADD COLUMN IF NOT EXISTS user_id TEXT REFERENCES users(id) ON DELETE CASCADE;
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
      FROM courses
      WHERE user_id = $1
      ORDER BY name ASC
    `,
      [userId],
    ),
    pool.query(
      `
      SELECT id, title, course_id, due_at, priority, status, source, description
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
        id, user_id, name, code, professor, cadence, sync_status, workload, source
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'Manual')
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
        id, user_id, title, course_id, due_at, priority, status, source, description
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, 'Manual', $8)
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
      SELECT id, name, email, password_hash, created_at
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

  return {
    id: row.id,
    name: row.name,
    email: row.email,
    passwordHash: row.password_hash,
    createdAt:
      row.created_at instanceof Date
        ? row.created_at.toISOString()
        : String(row.created_at),
  } satisfies User;
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
          id, user_id, name, code, professor, cadence, sync_status, workload, source
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
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
      ],
    );
  }

  for (const assignment of seed.assignments) {
    await pool.query(
      `
        INSERT INTO assignments (
          id, user_id, title, course_id, due_at, priority, status, source, description
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
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
      ],
    );
  }
}

export async function upsertPostgresSessionRecord(session: Session) {
  await ensureDatabase();
  const pool = getPool();

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
  const result = await pool.query(
    `
      SELECT u.id, u.name, u.email, u.password_hash, u.created_at
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

  return {
    id: row.id,
    name: row.name,
    email: row.email,
    passwordHash: row.password_hash,
    createdAt:
      row.created_at instanceof Date
        ? row.created_at.toISOString()
        : String(row.created_at),
  } satisfies User;
}
