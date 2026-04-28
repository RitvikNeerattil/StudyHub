export type Priority = "High" | "Medium" | "Low";

export type AssignmentStatus =
  | "Not started"
  | "In progress"
  | "Needs review"
  | "Submitted"
  | "Waiting on team"
  | "Draft ready";

export type CourseSource = "Blackboard" | "Manual";

export type Course = {
  id: string;
  name: string;
  code: string;
  professor: string;
  cadence: string;
  syncStatus: string;
  workload: string;
  source: CourseSource;
  externalId?: string;
};

export type Assignment = {
  id: string;
  title: string;
  courseId: string;
  dueAt: string;
  priority: Priority;
  status: AssignmentStatus;
  source: CourseSource;
  description: string;
  externalId?: string;
};

export type StudyHubData = {
  courses: Course[];
  assignments: Assignment[];
};

export type User = {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  createdAt: string;
  blackboardUsername?: string;
  blackboardPasswordEncrypted?: string;
  blackboardCredentialsUpdatedAt?: string;
  geminiApiKeyEncrypted?: string;
  geminiApiKeyUpdatedAt?: string;
};

export type Session = {
  id: string;
  userId: string;
  token: string;
  expiresAt: string;
};

export type LoginAttempt = {
  key: string;
  failures: number;
  lockedUntil?: string;
  updatedAt: string;
};

export type AuthStore = {
  users: User[];
  sessions: Session[];
  loginAttempts?: LoginAttempt[];
};

export type BlackboardCredentialUpdate = {
  username: string;
  passwordEncrypted: string;
  updatedAt: string;
};

export type GeminiCredentialUpdate = {
  apiKeyEncrypted: string;
  updatedAt: string;
};
