import type { Assignment, Course, StudyHubData } from "@/lib/types";

export const enabledBlackboardTermName = "Spring 2026";

const enabledBlackboardTermToken = "SPRING-2026";
const excludedBlackboardCourseCodes = new Set(["HIST111-999-SPRING-2026"]);

function normalizeTermText(value: string) {
  return value.toUpperCase().replace(/[\s_]+/g, "-").replace(/-+/g, "-");
}

export function isEnabledBlackboardTermCourse(
  course: Pick<Course, "code" | "name"> & Partial<Pick<Course, "source">>,
) {
  if (course.source && course.source !== "Blackboard") {
    return false;
  }

  if (excludedBlackboardCourseCodes.has(normalizeTermText(course.code))) {
    return false;
  }

  return normalizeTermText(`${course.code} ${course.name}`).includes(
    enabledBlackboardTermToken,
  );
}

export function openAssignmentsForCourses(
  assignments: Assignment[],
  courses: Course[],
) {
  const courseIds = new Set(courses.map((course) => course.id));
  const now = Date.now();

  return assignments
    .filter(
      (assignment) =>
        assignment.status !== "Submitted" && courseIds.has(assignment.courseId),
    )
    .sort((a, b) => {
      const aTime = new Date(a.dueAt).getTime();
      const bTime = new Date(b.dueAt).getTime();
      const aOverdue = aTime < now;
      const bOverdue = bTime < now;

      if (aOverdue && bOverdue) {
        return bTime - aTime;
      }

      if (aOverdue !== bOverdue) {
        return aOverdue ? -1 : 1;
      }

      return aTime - bTime;
    });
}

export function visibleStudyHubData(data: StudyHubData): StudyHubData {
  const courses = data.courses.filter(isEnabledBlackboardTermCourse);

  return {
    courses,
    assignments: openAssignmentsForCourses(data.assignments, courses),
  };
}
