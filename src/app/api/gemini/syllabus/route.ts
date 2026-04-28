import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { getStoredGeminiApiKey } from "@/lib/credentials";
import { isSameOriginRequest } from "@/lib/request-security";

type GeminiComponent = {
  name?: unknown;
  weightPercent?: unknown;
  points?: unknown;
  notes?: unknown;
};

function textFromGeminiResponse(value: unknown) {
  if (!value || typeof value !== "object") {
    return "";
  }

  const candidates = (value as { candidates?: unknown }).candidates;

  if (!Array.isArray(candidates)) {
    return "";
  }

  return candidates
    .flatMap((candidate) => {
      const content = (candidate as { content?: unknown }).content;
      const parts =
        content && typeof content === "object"
          ? (content as { parts?: unknown }).parts
          : undefined;

      return Array.isArray(parts) ? parts : [];
    })
    .map((part) =>
      part && typeof part === "object"
        ? String((part as { text?: unknown }).text ?? "")
        : "",
    )
    .join("\n")
    .trim();
}

function parseJsonText(text: string) {
  try {
    return JSON.parse(text);
  } catch {
    const match = text.match(/\{[\s\S]*\}/);

    if (!match) {
      throw new Error("Gemini did not return parseable grading JSON.");
    }

    return JSON.parse(match[0]);
  }
}

function numberOrNull(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number.parseFloat(value.replace("%", ""));
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function normalizeComponents(value: unknown) {
  if (!value || typeof value !== "object") {
    return [];
  }

  const components = (value as { components?: unknown }).components;

  if (!Array.isArray(components)) {
    return [];
  }

  return components
    .map((component: GeminiComponent) => ({
      name: String(component.name ?? "").trim(),
      weightPercent: numberOrNull(component.weightPercent),
      points: numberOrNull(component.points),
      notes: String(component.notes ?? "").trim(),
    }))
    .filter((component) => component.name);
}

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  }

  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let syllabusText = "";

  try {
    const body = (await request.json()) as { syllabusText?: unknown };
    syllabusText = String(body.syllabusText ?? "").trim();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  if (syllabusText.length < 80) {
    return NextResponse.json(
      { error: "Paste the syllabus grading section before analyzing." },
      { status: 400 },
    );
  }

  let apiKey: string;

  try {
    apiKey = getStoredGeminiApiKey(user);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Save your Gemini API key before analyzing a syllabus.",
      },
      { status: 400 },
    );
  }

  const prompt = [
    "Extract the course grading distribution from this syllabus.",
    "Return only JSON with this shape:",
    '{"components":[{"name":"Exams","weightPercent":40,"points":null,"notes":"short source note"}]}',
    "Use weightPercent when the syllabus gives percentages.",
    "Use points when the syllabus gives point totals instead.",
    "Do not invent missing categories. If no distribution is present, return an empty components array.",
    "",
    syllabusText,
  ].join("\n");

  const response = await fetch(
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [{ text: prompt }],
          },
        ],
        generationConfig: {
          responseMimeType: "application/json",
        },
      }),
    },
  );

  if (!response.ok) {
    return NextResponse.json(
      {
        error: `Gemini returned HTTP ${response.status}. Check the saved API key and try again.`,
      },
      { status: 502 },
    );
  }

  try {
    const text = textFromGeminiResponse(await response.json());
    const parsed = parseJsonText(text);
    const components = normalizeComponents(parsed);

    return NextResponse.json({ components });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Gemini did not return usable grading data.",
      },
      { status: 502 },
    );
  }
}
