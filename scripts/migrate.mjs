import pg from "pg";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is required to run migrations.");
  process.exit(1);
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl:
    process.env.NODE_ENV === "production"
      ? { rejectUnauthorized: false }
      : false,
});

async function migrate() {
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
    ADD COLUMN IF NOT EXISTS user_id TEXT REFERENCES users(id) ON DELETE CASCADE;
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

  await pool.query("DELETE FROM sessions WHERE expires_at <= NOW();");
}

migrate()
  .then(() => {
    console.log("Database migration complete.");
  })
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
