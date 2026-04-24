import { getPool } from "@/lib/db";
import { readJsonStudyHubData } from "@/lib/store-json";
import type {
  Assignment,
  AssignmentStatus,
  Course,
  Priority,
  StudyHubData,
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
    CREATE TABLE IF NOT EXISTS courses (
      id TEXT PRIMARY KEY,
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

  const existing = await pool.query<{ count: string }>(
    "SELECT COUNT(*)::text AS count FROM courses",
  );

  if (Number(existing.rows[0]?.count ?? 0) === 0) {
    const seed = await readJsonStudyHubData();

    for (const course of seed.courses) {
      await pool.query(
        `
          INSERT INTO courses (
            id, name, code, professor, cadence, sync_status, workload, source
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        `,
        [
          course.id,
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
            id, title, course_id, due_at, priority, status, source, description
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        `,
        [
          assignment.id,
          assignment.title,
          assignment.courseId,
          assignment.dueAt,
          assignment.priority,
          assignment.status,
          assignment.source,
          assignment.description,
        ],
      );
    }
  }

  initialized = true;
}

export async function readPostgresStudyHubData(): Promise<StudyHubData> {
  await ensureDatabase();
  const pool = getPool();

  const [courseResult, assignmentResult] = await Promise.all([
    pool.query(`
      SELECT id, name, code, professor, cadence, sync_status, workload, source
      FROM courses
      ORDER BY name ASC
    `),
    pool.query(`
      SELECT id, title, course_id, due_at, priority, status, source, description
      FROM assignments
      ORDER BY due_at ASC
    `),
  ]);

  return {
    courses: courseResult.rows.map(mapCourse),
    assignments: assignmentResult.rows.map(mapAssignment),
  };
}

export async function createPostgresCourse(input: {
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
        id, name, code, professor, cadence, sync_status, workload, source
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, 'Manual')
    `,
    [
      createId("course"),
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
        id, title, course_id, due_at, priority, status, source, description
      )
      VALUES ($1, $2, $3, $4, $5, $6, 'Manual', $7)
    `,
    [
      createId("assignment"),
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
  assignmentId: string,
  status: AssignmentStatus,
) {
  await ensureDatabase();
  const pool = getPool();

  await pool.query("UPDATE assignments SET status = $2 WHERE id = $1", [
    assignmentId,
    status,
  ]);
}

export async function markPostgresBlackboardSync() {
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
    "UPDATE courses SET sync_status = $1 WHERE source = 'Blackboard'",
    [syncStamp],
  );
}
