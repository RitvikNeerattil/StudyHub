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
};

export type Session = {
  id: string;
  userId: string;
  token: string;
  expiresAt: string;
};

export type AuthStore = {
  users: User[];
  sessions: Session[];
};
