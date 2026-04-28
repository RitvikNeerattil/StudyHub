import type {
  BlackboardImportAssignment,
  BlackboardImportCourse,
  BlackboardImportPayload,
  BlackboardLoginCredentials,
} from "@/lib/lms";
import {
  enabledBlackboardTermName,
  isEnabledBlackboardTermCourse,
} from "@/lib/dashboard-filters";

type HttpResult = {
  response: Response;
  url: string;
};

type ParsedInput = {
  name: string;
  type: string;
  value: string;
  id: string;
  placeholder: string;
};

type DiscoveryTrace = string[];

type UserGrade = {
  status: string;
  text: string;
  displayGrade: string;
  score: unknown;
  exempt: boolean;
};

const defaultBaseUrl = "https://blackboard.sc.edu";
const maxRedirects = 12;

function envValue(...keys: string[]) {
  for (const key of keys) {
    const value = process.env[key]?.trim();

    if (value) {
      return value;
    }
  }

  return "";
}

function decodeHtml(value: string) {
  return value
    .replaceAll("&amp;", "&")
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">");
}

function getAttr(tag: string, name: string) {
  const match = tag.match(
    new RegExp(`${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, "i"),
  );
  return decodeHtml(match?.[1] ?? match?.[2] ?? match?.[3] ?? "");
}

function resolveUrl(value: string, baseUrl: string) {
  return new URL(decodeHtml(value), baseUrl).toString();
}

function splitSetCookieHeader(value: string) {
  return value.split(/,(?=\s*[^;,=\s]+=[^;,]+)/g).map((item) => item.trim());
}

class CookieJar {
  private readonly cookies = new Map<string, string>();

  read(headers: Headers) {
    const getSetCookie = (headers as Headers & { getSetCookie?: () => string[] })
      .getSetCookie;
    const rawCookies = getSetCookie ? getSetCookie.call(headers) : [];
    const singleHeader = headers.get("set-cookie");

    if (singleHeader) {
      rawCookies.push(...splitSetCookieHeader(singleHeader));
    }

    for (const rawCookie of rawCookies) {
      const pair = rawCookie.split(";")[0] ?? "";
      const separator = pair.indexOf("=");

      if (separator <= 0) {
        continue;
      }

      const name = pair.slice(0, separator).trim();
      const value = pair.slice(separator + 1).trim();

      if (!value) {
        this.cookies.delete(name);
      } else {
        this.cookies.set(name, value);
      }
    }
  }

  header() {
    return [...this.cookies.entries()]
      .map(([name, value]) => `${name}=${value}`)
      .join("; ");
  }
}

async function fetchWithCookies(
  jar: CookieJar,
  url: string,
  init: RequestInit = {},
  redirects = 0,
): Promise<HttpResult> {
  if (redirects > maxRedirects) {
    throw new Error("Blackboard login redirected too many times.");
  }

  const headers = new Headers(init.headers);
  const cookieHeader = jar.header();

  if (cookieHeader) {
    headers.set("cookie", cookieHeader);
  }

  const response = await fetch(url, {
    ...init,
    headers,
    redirect: "manual",
  });
  jar.read(response.headers);

  if (
    response.status >= 300 &&
    response.status < 400 &&
    response.headers.has("location")
  ) {
    const nextUrl = resolveUrl(response.headers.get("location") ?? "", url);

    return fetchWithCookies(
      jar,
      nextUrl,
      {
        method: "GET",
        headers: {
          Accept: "text/html,application/xhtml+xml,application/json",
        },
      },
      redirects + 1,
    );
  }

  return { response, url };
}

function findLoginUrl(html: string, baseUrl: string) {
  const anchors = [
    ...html.matchAll(/<a\b[^>]*href\s*=\s*["']([^"']+)["'][^>]*>/gi),
  ];
  const candidates = anchors
    .map((match) => resolveUrl(match[1] ?? "", baseUrl))
    .filter((href) =>
      /casLogin|auth-provider-cas|\/login|cas\.auth\.sc\.edu/i.test(href),
    );

  return candidates[0] ?? envValue("BLACKBOARD_LOGIN_URL");
}

function parseInputs(html: string): ParsedInput[] {
  return [...html.matchAll(/<input\b[^>]*>/gi)]
    .map((match) => {
      const tag = match[0];

      return {
        name: getAttr(tag, "name"),
        type: getAttr(tag, "type").toLowerCase(),
        value: getAttr(tag, "value"),
        id: getAttr(tag, "id"),
        placeholder: getAttr(tag, "placeholder"),
      };
    })
    .filter((input) => input.name);
}

function loginForm(html: string) {
  const forms = html.match(/<form\b[\s\S]*?<\/form>/gi) ?? [];
  return forms.find((form) => /password/i.test(form)) ?? forms[0] ?? html;
}

function formAction(form: string, baseUrl: string) {
  const tag = form.match(/<form\b[^>]*>/i)?.[0] ?? "";
  const action = getAttr(tag, "action");

  if (!action) {
    return baseUrl;
  }

  return resolveUrl(action, baseUrl);
}

function credentialField(inputs: ParsedInput[], pattern: RegExp) {
  return inputs.find((input) =>
    pattern.test(`${input.name} ${input.id} ${input.placeholder}`),
  )?.name;
}

async function authenticate(
  jar: CookieJar,
  baseUrl: string,
  credentials: BlackboardLoginCredentials,
) {
  if (!credentials.username || !credentials.password) {
    throw new Error("Save your Blackboard credentials before syncing.");
  }

  const landing = await fetchWithCookies(jar, baseUrl, {
    headers: {
      Accept: "text/html,application/xhtml+xml",
    },
  });
  const landingHtml = await landing.response.text();
  const loginUrl = findLoginUrl(landingHtml, landing.url);

  if (!loginUrl) {
    throw new Error("Could not find the Blackboard CAS login link.");
  }

  const casPage = await fetchWithCookies(jar, loginUrl, {
    headers: {
      Accept: "text/html,application/xhtml+xml",
    },
  });
  const casHtml = await casPage.response.text();
  const form = loginForm(casHtml);
  const inputs = parseInputs(form);
  const usernameField =
    credentialField(inputs, /user|login|credential|email|netid/i) ?? "username";
  const passwordField = credentialField(inputs, /pass/i) ?? "password";
  const body = new URLSearchParams();

  for (const input of inputs) {
    body.set(input.name, input.value);
  }

  body.set(usernameField, credentials.username);
  body.set(passwordField, credentials.password);

  if (!body.has("_eventId")) {
    body.set("_eventId", "submit");
  }

  const submitted = await fetchWithCookies(jar, formAction(form, casPage.url), {
    method: "POST",
    headers: {
      Accept: "text/html,application/xhtml+xml",
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });
  const submittedHtml = await submitted.response.text();

  if (
    /Login Credentials Required|name=["']password["']|id=["']password["']/i.test(
      submittedHtml,
    )
  ) {
    throw new Error("Blackboard login failed. Check your saved credentials.");
  }
}

function cleanText(value: unknown) {
  if (typeof value !== "string") {
    return "";
  }

  return value.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

function priorityForDueDate(dueAt: string) {
  const hoursAway = (new Date(dueAt).getTime() - Date.now()) / (1000 * 60 * 60);

  if (hoursAway <= 72) {
    return "High";
  }

  if (hoursAway <= 168) {
    return "Medium";
  }

  return "Low";
}

function statusValue(row: Record<string, unknown>, key: string) {
  const value = row[key];

  if (typeof value === "string") {
    return value;
  }

  if (!value || typeof value !== "object") {
    return "";
  }

  const status = (value as Record<string, unknown>).status;

  return typeof status === "string" ? status : "";
}

function isSubmittedAssignmentRow(row: Record<string, unknown>) {
  const statusText = [
    statusValue(row, "status"),
    statusValue(row, "submission"),
    statusValue(row, "studentSubmission"),
    statusValue(row, "userSubmission"),
    statusValue(row, "attempt"),
    statusValue(row, "grade"),
    statusValue(row, "grading"),
    row.submissionStatus,
    row.attemptStatus,
  ]
    .filter((value): value is string => typeof value === "string")
    .join(" ");

  return /submitted|completed|graded|needs\s*grading/i.test(statusText);
}

function gradeIndicatesCompleted(grade: UserGrade | undefined) {
  if (!grade) {
    return false;
  }

  if (grade.exempt) {
    return true;
  }

  if (/submitted|completed|graded|needs\s*grading/i.test(grade.status)) {
    return true;
  }

  if (typeof grade.score === "number") {
    return true;
  }

  if (typeof grade.score === "string" && grade.score.trim()) {
    return true;
  }

  return Boolean(grade.text.trim() || grade.displayGrade.trim());
}

function resultRows(value: unknown) {
  if (!value || typeof value !== "object") {
    return [];
  }

  if ("results" in value && Array.isArray(value.results)) {
    return value.results as Record<string, unknown>[];
  }

  if ("items" in value && Array.isArray(value.items)) {
    return value.items as Record<string, unknown>[];
  }

  if (Array.isArray(value)) {
    return value as Record<string, unknown>[];
  }

  return [];
}

async function loadJsonRows(
  jar: CookieJar,
  url: URL,
  label?: string,
  trace?: DiscoveryTrace,
) {
  const result = await fetchWithCookies(jar, url.toString(), {
    headers: {
      Accept: "application/json",
    },
  });

  if (!result.response.ok) {
    trace?.push(`${label ?? url.pathname}: HTTP ${result.response.status}`);
    return [];
  }

  const rows = resultRows(await result.response.json());
  trace?.push(`${label ?? url.pathname}: ${rows.length} rows`);
  return rows;
}

function courseFromApi(row: Record<string, unknown>): BlackboardImportCourse | null {
  const externalId = String(row.id ?? "").trim();
  const name = cleanText(row.name ?? row.displayName);
  const code = cleanText(row.courseId ?? row.externalId ?? row.id);
  const available = String(
    (row.availability as { available?: unknown } | undefined)?.available ?? "Yes",
  ).toLowerCase();

  if (!externalId || !name || available === "no" || available === "false") {
    return null;
  }

  return {
    externalId,
    name,
    code: code || name,
    professor: "",
    cadence: "",
    workload: "",
  };
}

function courseIdFromMembership(row: Record<string, unknown>) {
  const course = row.course;

  if (course && typeof course === "object" && "id" in course) {
    return String(course.id ?? "").trim();
  }

  return String(row.courseId ?? row.id ?? "").trim();
}

async function loadCurrentBlackboardUserId(
  jar: CookieJar,
  baseUrl: string,
  trace: DiscoveryTrace,
) {
  const result = await fetchWithCookies(
    jar,
    new URL("/learn/api/public/v1/users/me", baseUrl).toString(),
    {
      headers: {
        Accept: "application/json",
      },
    },
  );

  if (!result.response.ok) {
    trace.push(`current user API: HTTP ${result.response.status}`);
    return "";
  }

  const row = await result.response.json();
  const userId = String(row.id ?? "").trim();
  trace.push(`current user API: ${userId ? "found user id" : "missing id"}`);

  return userId;
}

async function loadApiCourseDetail(
  jar: CookieJar,
  baseUrl: string,
  courseId: string,
) {
  const paths = [
    `/learn/api/public/v2/courses/${encodeURIComponent(courseId)}`,
    `/learn/api/public/v1/courses/${encodeURIComponent(courseId)}`,
  ];

  for (const path of paths) {
    const result = await fetchWithCookies(jar, new URL(path, baseUrl).toString(), {
      headers: {
        Accept: "application/json",
      },
    });

    if (!result.response.ok) {
      continue;
    }

    const course = courseFromApi(await result.response.json());

    if (course) {
      return course;
    }
  }

  return {
    externalId: courseId,
    name: courseId,
    code: courseId,
    professor: "",
    cadence: "",
    workload: "",
  } satisfies BlackboardImportCourse;
}

async function loadMembershipCourses(
  jar: CookieJar,
  baseUrl: string,
  trace: DiscoveryTrace,
) {
  const url = new URL("/learn/api/public/v1/users/me/courses", baseUrl);
  url.searchParams.set("limit", "200");

  const rows = await loadJsonRows(jar, url, "current-user memberships", trace);
  const courseIds = [
    ...new Set(
      rows
        .map(courseIdFromMembership)
        .filter((courseId) => courseId.length > 0),
    ),
  ];
  const courses = await Promise.all(
    courseIds.map((courseId) => loadApiCourseDetail(jar, baseUrl, courseId)),
  );

  return courses;
}

async function loadApiCourses(
  jar: CookieJar,
  baseUrl: string,
  trace: DiscoveryTrace,
) {
  const paths = [
    ["/learn/api/public/v2/courses", "course API v2"],
    ["/learn/api/public/v1/courses", "course API v1"],
  ] as const;

  for (const [path, label] of paths) {
    const url = new URL(path, baseUrl);
    url.searchParams.set("limit", "200");
    url.searchParams.set("fields", "id,courseId,name,availability");

    const courses = (await loadJsonRows(jar, url, label, trace))
      .map(courseFromApi)
      .filter((course): course is BlackboardImportCourse => Boolean(course));

    if (courses.length > 0) {
      return courses;
    }
  }

  return [];
}

function assignmentFromApi(
  row: Record<string, unknown>,
  courseExternalId: string,
  grade?: UserGrade,
): BlackboardImportAssignment | null {
  if (isSubmittedAssignmentRow(row) || gradeIndicatesCompleted(grade)) {
    return null;
  }

  const externalId = String(row.id ?? row.contentId ?? "").trim();
  const title = cleanText(row.name ?? row.title);
  const dueRaw =
    row.dueAt ??
    row.dueDate ??
    row.due ??
    (row.grading as { due?: unknown } | undefined)?.due;

  if (!externalId || !title || typeof dueRaw !== "string") {
    return null;
  }

  const dueAt = new Date(dueRaw);

  if (Number.isNaN(dueAt.getTime())) {
    return null;
  }

  return {
    externalId,
    courseExternalId,
    title,
    dueAt: dueAt.toISOString(),
    priority: priorityForDueDate(dueAt.toISOString()),
    status: "Not started",
    description: cleanText(row.description ?? row.shortDescription),
  };
}

function gradeFromApi(row: Record<string, unknown>): UserGrade {
  return {
    status: cleanText(row.status),
    text: cleanText(row.text),
    displayGrade: cleanText(row.displayGrade),
    score: row.score,
    exempt: row.exempt === true,
  };
}

function gradeKeysForAssignment(row: Record<string, unknown>) {
  const grading = row.grading;
  const gradebookColumn = row.gradebookColumn;
  const keys = [
    row.id,
    row.columnId,
    row.gradebookColumnId,
    row.contentId,
    grading && typeof grading === "object"
      ? (grading as Record<string, unknown>).id
      : "",
    grading && typeof grading === "object"
      ? (grading as Record<string, unknown>).columnId
      : "",
    gradebookColumn && typeof gradebookColumn === "object"
      ? (gradebookColumn as Record<string, unknown>).id
      : "",
  ];

  return keys.map((key) => String(key ?? "").trim()).filter(Boolean);
}

async function loadCourseGrades(
  jar: CookieJar,
  baseUrl: string,
  courseExternalId: string,
  userId: string,
) {
  if (!userId) {
    return new Map<string, UserGrade>();
  }

  const paths = [
    `/learn/api/public/v2/courses/${encodeURIComponent(
      courseExternalId,
    )}/gradebook/users/${encodeURIComponent(userId)}?limit=200`,
    `/learn/api/public/v1/courses/${encodeURIComponent(
      courseExternalId,
    )}/gradebook/users/${encodeURIComponent(userId)}?limit=200`,
  ];
  const grades = new Map<string, UserGrade>();

  for (const path of paths) {
    const result = await fetchWithCookies(jar, new URL(path, baseUrl).toString(), {
      headers: {
        Accept: "application/json",
      },
    });

    if (!result.response.ok) {
      continue;
    }

    for (const row of resultRows(await result.response.json())) {
      const columnId = String(row.columnId ?? "").trim();

      if (columnId) {
        grades.set(columnId, gradeFromApi(row));
      }
    }

    if (grades.size > 0) {
      return grades;
    }
  }

  return grades;
}

async function loadApiAssignments(
  jar: CookieJar,
  baseUrl: string,
  course: BlackboardImportCourse,
  userId: string,
) {
  const grades = await loadCourseGrades(jar, baseUrl, course.externalId, userId);
  const urls = [
    `/learn/api/public/v2/courses/${encodeURIComponent(
      course.externalId,
    )}/gradebook/columns?limit=200`,
    `/learn/api/public/v1/courses/${encodeURIComponent(
      course.externalId,
    )}/contents?recursive=true&limit=200`,
  ];
  const assignments = new Map<string, BlackboardImportAssignment>();

  for (const path of urls) {
    const result = await fetchWithCookies(jar, new URL(path, baseUrl).toString(), {
      headers: {
        Accept: "application/json",
      },
    });

    if (!result.response.ok) {
      continue;
    }

    for (const row of resultRows(await result.response.json())) {
      const grade = gradeKeysForAssignment(row)
        .map((key) => grades.get(key))
        .find(Boolean);
      const assignment = assignmentFromApi(row, course.externalId, grade);

      if (assignment) {
        assignments.set(assignment.externalId, assignment);
      }
    }
  }

  return [...assignments.values()];
}

function coursesFromUltraHtml(html: string) {
  const courses = new Map<string, BlackboardImportCourse>();
  const patterns = [
    /"id"\s*:\s*"([^"]+)"[\s\S]{0,600}?"courseId"\s*:\s*"([^"]+)"[\s\S]{0,600}?"name"\s*:\s*"([^"]+)"/gi,
    /"courseId"\s*:\s*"([^"]+)"[\s\S]{0,600}?"courseTitle"\s*:\s*"([^"]+)"/gi,
    /"courseTitle"\s*:\s*"([^"]+)"[\s\S]{0,600}?"courseId"\s*:\s*"([^"]+)"/gi,
    /\/ultra\/courses\/([^/"?#]+)\/[^"']*["'][^>]*>([\s\S]{0,500}?)<\/a>/gi,
  ];

  patterns.forEach((pattern, patternIndex) => {
    for (const match of html.matchAll(pattern)) {
      const first = cleanText(decodeHtml(match[1] ?? ""));
      const second = cleanText(decodeHtml(match[2] ?? ""));
      const third = cleanText(decodeHtml(match[3] ?? ""));
      const externalId = patternIndex === 2 ? second : first;
      const code = patternIndex === 2 ? second : second || externalId;
      const name =
        patternIndex === 0
          ? third
          : patternIndex === 2
            ? first
            : second || third;

      if (!externalId || !name || courses.has(externalId)) {
        continue;
      }

      courses.set(externalId, {
        externalId,
        name,
        code: code || name,
        professor: "",
        cadence: "",
        workload: "",
      });
    }
  });

  return [...courses.values()];
}

async function loadUltraCourses(
  jar: CookieJar,
  baseUrl: string,
  trace: DiscoveryTrace,
) {
  const result = await fetchWithCookies(
    jar,
    new URL("/ultra/course", baseUrl).toString(),
    {
      headers: {
        Accept: "text/html,application/xhtml+xml",
      },
    },
  );

  if (!result.response.ok) {
    trace.push(`Ultra course page: HTTP ${result.response.status}`);
    return [];
  }

  const courses = coursesFromUltraHtml(await result.response.text());
  trace.push(`Ultra course page: ${courses.length} matches`);
  return courses;
}

export async function loadRealBlackboardPayload(
  credentials: BlackboardLoginCredentials,
): Promise<BlackboardImportPayload> {
  const baseUrl = envValue("BLACKBOARD_BASE_URL") || defaultBaseUrl;
  const jar = new CookieJar();
  const discoveryTrace: DiscoveryTrace = [];

  await authenticate(jar, baseUrl, credentials);

  const userId = await loadCurrentBlackboardUserId(
    jar,
    baseUrl,
    discoveryTrace,
  );
  const ultraCourses = await loadUltraCourses(jar, baseUrl, discoveryTrace);
  let courses = ultraCourses;

  if (courses.length === 0) {
    const membershipCourses = await loadMembershipCourses(
      jar,
      baseUrl,
      discoveryTrace,
    );
    const apiCourses =
      membershipCourses.length > 0
        ? membershipCourses
        : await loadApiCourses(jar, baseUrl, discoveryTrace);
    courses = apiCourses;
  }

  const enabledTermCourses = courses.filter(isEnabledBlackboardTermCourse);
  discoveryTrace.push(
    `${enabledBlackboardTermName} filter: ${enabledTermCourses.length}/${courses.length} courses`,
  );
  const assignmentGroups = await Promise.all(
    enabledTermCourses.map((course) =>
      loadApiAssignments(jar, baseUrl, course, userId),
    ),
  );

  if (enabledTermCourses.length === 0) {
    throw new Error(
      `Blackboard login succeeded, but no ${enabledBlackboardTermName} courses were found. Tried: ${discoveryTrace.join("; ")}.`,
    );
  }

  return {
    courses: enabledTermCourses,
    assignments: assignmentGroups.flat(),
  };
}
