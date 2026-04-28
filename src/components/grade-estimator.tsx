"use client";

import { useMemo, useState } from "react";

import type { Course } from "@/lib/types";

type GradeEstimatorProps = {
  courses: Course[];
  hasGeminiApiKey: boolean;
};

type GradeRow = {
  id: string;
  name: string;
  weight: string;
  current: string;
  estimate: string;
  notes: string;
};

type GeminiComponent = {
  name: string;
  weightPercent: number | null;
  points: number | null;
  notes: string;
};

const targetGrades = [
  { label: "A", minimum: 90 },
  { label: "B+", minimum: 87 },
  { label: "B", minimum: 80 },
  { label: "C+", minimum: 77 },
  { label: "C", minimum: 70 },
  { label: "D+", minimum: 67 },
  { label: "D", minimum: 60 },
];

const defaultRows: GradeRow[] = [
  {
    id: "exams",
    name: "Exams",
    weight: "40",
    current: "",
    estimate: "82",
    notes: "",
  },
  {
    id: "assignments",
    name: "Assignments",
    weight: "35",
    current: "",
    estimate: "88",
    notes: "",
  },
  {
    id: "final",
    name: "Final exam",
    weight: "25",
    current: "",
    estimate: "",
    notes: "",
  },
];

function createId() {
  return crypto.randomUUID();
}

function numberValue(value: string) {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function percent(value: number) {
  return `${value.toFixed(1)}%`;
}

function clampDisplay(value: number) {
  if (value < 0) {
    return 0;
  }

  return value;
}

export function GradeEstimator({
  courses,
  hasGeminiApiKey,
}: GradeEstimatorProps) {
  const [selectedCourseId, setSelectedCourseId] = useState(courses[0]?.id ?? "");
  const [syllabusText, setSyllabusText] = useState("");
  const [rows, setRows] = useState(defaultRows);
  const [selectedTarget, setSelectedTarget] = useState(targetGrades[2]);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const summary = useMemo(() => {
    const parsedRows = rows
      .map((row) => ({
        ...row,
        weight: numberValue(row.weight),
        current: numberValue(row.current),
        estimate: numberValue(row.estimate),
      }))
      .filter((row) => row.weight && row.weight > 0);
    const totalWeight = parsedRows.reduce((sum, row) => sum + row.weight!, 0);
    const completedRows = parsedRows.filter((row) => row.current !== null);
    const completedWeight = completedRows.reduce(
      (sum, row) => sum + row.weight!,
      0,
    );
    const currentWeighted = completedRows.reduce(
      (sum, row) => sum + (row.weight! * row.current!) / 100,
      0,
    );
    const remainingWeight = Math.max(0, totalWeight - completedWeight);
    const targetWeighted = (selectedTarget.minimum * totalWeight) / 100;
    const neededAverage =
      remainingWeight > 0
        ? ((targetWeighted - currentWeighted) / remainingWeight) * 100
        : null;
    const estimatedRows = parsedRows.filter(
      (row) => row.estimate !== null || row.current !== null,
    );
    const estimatedWeighted = estimatedRows.reduce((sum, row) => {
      const score = row.estimate ?? row.current ?? 0;
      return sum + (row.weight! * score) / 100;
    }, 0);
    const estimatedFinal =
      totalWeight > 0 ? (estimatedWeighted / totalWeight) * 100 : null;
    const currentKnown =
      completedWeight > 0 ? (currentWeighted / completedWeight) * 100 : null;

    return {
      completedWeight,
      currentKnown,
      estimatedFinal,
      neededAverage,
      remainingWeight,
      totalWeight,
    };
  }, [rows, selectedTarget]);

  function updateRow(id: string, key: keyof GradeRow, value: string) {
    setRows((currentRows) =>
      currentRows.map((row) =>
        row.id === id
          ? {
              ...row,
              [key]: value,
            }
          : row,
      ),
    );
  }

  function addRow() {
    setRows((currentRows) => [
      ...currentRows,
      {
        id: createId(),
        name: "New category",
        weight: "",
        current: "",
        estimate: "",
        notes: "",
      },
    ]);
  }

  function deleteRow(id: string) {
    setRows((currentRows) => currentRows.filter((row) => row.id !== id));
  }

  async function analyzeSyllabus() {
    setLoading(true);
    setError("");
    setStatus("");

    try {
      const response = await fetch("/api/gemini/syllabus", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ syllabusText }),
      });
      const payload = (await response.json()) as {
        components?: GeminiComponent[];
        error?: string;
      };

      if (!response.ok) {
        throw new Error(payload.error ?? "Gemini analysis failed.");
      }

      if (!payload.components?.length) {
        setStatus("Gemini did not find a grading distribution in that text.");
        return;
      }

      const totalPoints = payload.components.reduce(
        (sum, component) => sum + (component.points ?? 0),
        0,
      );

      setRows(
        payload.components.map((component) => {
          const weight =
            component.weightPercent ??
            (component.points && totalPoints > 0
              ? (component.points / totalPoints) * 100
              : null);

          return {
            id: createId(),
            name: component.name,
            weight: weight ? weight.toFixed(1) : "",
            current: "",
            estimate: "",
            notes: component.notes,
          };
        }),
      );
      setStatus("Gemini filled the grade distribution. Add gradebook scores next.");
    } catch (analysisError) {
      setError(
        analysisError instanceof Error
          ? analysisError.message
          : "Gemini analysis failed.",
      );
    } finally {
      setLoading(false);
    }
  }

  const selectedCourse = courses.find((course) => course.id === selectedCourseId);
  const weightWarning =
    summary.totalWeight > 0 && Math.abs(summary.totalWeight - 100) > 0.5;

  return (
    <div className="grid gap-6 xl:grid-cols-[0.9fr_1.4fr]">
      <section className="space-y-6">
        <div className="rounded-[1.75rem] border border-sky-300/15 bg-[#0a1830]/90 p-6 shadow-[0_18px_50px_rgba(0,0,0,0.28)]">
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-sky-200">
            Syllabus parser
          </p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-white">
            Pull the grading scheme
          </h2>
          <div className="mt-5 space-y-3">
            <label className="block text-sm font-semibold text-slate-200">
              Course
              <select
                value={selectedCourseId}
                onChange={(event) => setSelectedCourseId(event.target.value)}
                className="mt-2 w-full rounded-2xl border border-sky-300/20 bg-[#07101f] px-4 py-3 text-sm font-normal text-slate-100 outline-none transition focus:border-sky-300"
              >
                {courses.length === 0 ? (
                  <option value="">No synced courses</option>
                ) : null}
                {courses.map((course) => (
                  <option key={course.id} value={course.id}>
                    {course.code} - {course.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm font-semibold text-slate-200">
              Syllabus grading text
              <textarea
                value={syllabusText}
                onChange={(event) => setSyllabusText(event.target.value)}
                rows={12}
                placeholder="Paste the grading, evaluation, or course requirements section from the syllabus."
                className="mt-2 w-full rounded-2xl border border-sky-300/20 bg-[#07101f] px-4 py-3 text-sm font-normal leading-6 text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-sky-300"
              />
            </label>
            <button
              type="button"
              onClick={analyzeSyllabus}
              disabled={loading || !hasGeminiApiKey}
              className="w-full rounded-2xl bg-sky-300 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-sky-200 disabled:cursor-not-allowed disabled:bg-slate-600 disabled:text-slate-300"
            >
              {loading ? "Analyzing syllabus..." : "Analyze with Gemini"}
            </button>
            {!hasGeminiApiKey ? (
              <p className="text-sm leading-6 text-amber-100">
                Save your Gemini API key above before using AI analysis.
              </p>
            ) : null}
            {status ? (
              <p className="rounded-2xl border border-sky-300/20 bg-sky-300/10 px-4 py-3 text-sm text-sky-100">
                {status}
              </p>
            ) : null}
            {error ? (
              <p className="rounded-2xl border border-rose-300/30 bg-rose-400/10 px-4 py-3 text-sm text-rose-100">
                {error}
              </p>
            ) : null}
          </div>
        </div>

        <div className="rounded-[1.75rem] border border-sky-300/15 bg-[#0a1830]/90 p-6 shadow-[0_18px_50px_rgba(0,0,0,0.28)]">
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-sky-200">
            Target grade
          </p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-white">
            What average is needed?
          </h2>
          <div className="mt-5 grid grid-cols-4 gap-2 sm:grid-cols-7 xl:grid-cols-4">
            {targetGrades.map((target) => (
              <button
                key={target.label}
                type="button"
                onClick={() => setSelectedTarget(target)}
                className={`rounded-2xl px-3 py-3 text-sm font-semibold transition ${
                  selectedTarget.label === target.label
                    ? "bg-sky-300 text-slate-950"
                    : "border border-sky-300/20 bg-[#07101f] text-sky-100 hover:border-sky-200 hover:text-white"
                }`}
              >
                {target.label}
              </button>
            ))}
          </div>
          <div className="mt-5 rounded-[1.5rem] border border-sky-300/15 bg-[#07101f]/75 p-5">
            <p className="text-sm leading-6 text-slate-300">
              {summary.neededAverage === null ? (
                "Enter at least one completed grade and leave some course weight unfinished."
              ) : summary.neededAverage <= 0 ? (
                <>
                  You already have enough completed weight to reach a{" "}
                  {selectedTarget.label} if the remaining work averages 0%.
                </>
              ) : summary.neededAverage > 100 ? (
                <>
                  You would need an average above 100% for the rest of your
                  assignments to get a {selectedTarget.label} in this class.
                </>
              ) : (
                <>
                  You need an average of{" "}
                  <span className="font-semibold text-white">
                    {percent(clampDisplay(summary.neededAverage))}
                  </span>{" "}
                  for the rest of your assignments to get a {selectedTarget.label}{" "}
                  in this class.
                </>
              )}
            </p>
          </div>
        </div>
      </section>

      <section className="rounded-[1.75rem] border border-sky-300/15 bg-[#0a1830]/90 p-6 shadow-[0_18px_50px_rgba(0,0,0,0.28)]">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-sky-200">
              Gradebook model
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-white">
              {selectedCourse ? selectedCourse.name : "Course estimate"}
            </h2>
          </div>
          <button
            type="button"
            onClick={addRow}
            className="rounded-2xl border border-sky-300/25 bg-[#102744] px-4 py-2 text-sm font-semibold text-sky-100 transition hover:border-sky-200 hover:text-white"
          >
            Add row
          </button>
        </div>

        <div className="mt-6 overflow-x-auto">
          <table className="min-w-[760px] w-full border-separate border-spacing-y-3 text-left text-sm">
            <thead className="text-xs uppercase tracking-[0.18em] text-slate-400">
              <tr>
                <th className="px-3">Category</th>
                <th className="px-3">Weight %</th>
                <th className="px-3">Current %</th>
                <th className="px-3">Estimate %</th>
                <th className="px-3">Notes</th>
                <th className="px-3 text-right">Remove</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <td className="rounded-l-2xl border-y border-l border-sky-300/15 bg-[#07101f]/75 p-2">
                    <input
                      value={row.name}
                      onChange={(event) =>
                        updateRow(row.id, "name", event.target.value)
                      }
                      className="w-full rounded-xl border border-sky-300/15 bg-[#061225] px-3 py-2 text-slate-100 outline-none transition focus:border-sky-300"
                    />
                  </td>
                  <td className="border-y border-sky-300/15 bg-[#07101f]/75 p-2">
                    <input
                      value={row.weight}
                      onChange={(event) =>
                        updateRow(row.id, "weight", event.target.value)
                      }
                      inputMode="decimal"
                      className="w-full rounded-xl border border-sky-300/15 bg-[#061225] px-3 py-2 text-slate-100 outline-none transition focus:border-sky-300"
                    />
                  </td>
                  <td className="border-y border-sky-300/15 bg-[#07101f]/75 p-2">
                    <input
                      value={row.current}
                      onChange={(event) =>
                        updateRow(row.id, "current", event.target.value)
                      }
                      inputMode="decimal"
                      placeholder="blank if future"
                      className="w-full rounded-xl border border-sky-300/15 bg-[#061225] px-3 py-2 text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-sky-300"
                    />
                  </td>
                  <td className="border-y border-sky-300/15 bg-[#07101f]/75 p-2">
                    <input
                      value={row.estimate}
                      onChange={(event) =>
                        updateRow(row.id, "estimate", event.target.value)
                      }
                      inputMode="decimal"
                      className="w-full rounded-xl border border-sky-300/15 bg-[#061225] px-3 py-2 text-slate-100 outline-none transition focus:border-sky-300"
                    />
                  </td>
                  <td className="border-y border-sky-300/15 bg-[#07101f]/75 p-2">
                    <input
                      value={row.notes}
                      onChange={(event) =>
                        updateRow(row.id, "notes", event.target.value)
                      }
                      className="w-full rounded-xl border border-sky-300/15 bg-[#061225] px-3 py-2 text-slate-100 outline-none transition focus:border-sky-300"
                    />
                  </td>
                  <td className="rounded-r-2xl border-y border-r border-sky-300/15 bg-[#07101f]/75 p-2 text-right">
                    <button
                      type="button"
                      onClick={() => deleteRow(row.id)}
                      className="rounded-xl border border-sky-300/20 px-3 py-2 text-slate-300 transition hover:border-sky-200 hover:text-white"
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-sky-300/15 bg-white/5 p-4">
            <p className="text-sm text-slate-400">Total modeled weight</p>
            <p className="mt-2 text-2xl font-semibold text-white">
              {percent(summary.totalWeight)}
            </p>
          </div>
          <div className="rounded-2xl border border-sky-300/15 bg-white/5 p-4">
            <p className="text-sm text-slate-400">Completed weight</p>
            <p className="mt-2 text-2xl font-semibold text-white">
              {percent(summary.completedWeight)}
            </p>
          </div>
          <div className="rounded-2xl border border-sky-300/15 bg-white/5 p-4">
            <p className="text-sm text-slate-400">Current known average</p>
            <p className="mt-2 text-2xl font-semibold text-white">
              {summary.currentKnown === null
                ? "N/A"
                : percent(summary.currentKnown)}
            </p>
          </div>
          <div className="rounded-2xl border border-sky-300/15 bg-white/5 p-4">
            <p className="text-sm text-slate-400">Estimated final</p>
            <p className="mt-2 text-2xl font-semibold text-white">
              {summary.estimatedFinal === null
                ? "N/A"
                : percent(summary.estimatedFinal)}
            </p>
          </div>
        </div>
        {weightWarning ? (
          <p className="mt-4 rounded-2xl border border-amber-300/25 bg-amber-400/10 px-4 py-3 text-sm leading-6 text-amber-100">
            The modeled weights add up to {percent(summary.totalWeight)}. Adjust
            the rows to 100% for the cleanest estimate.
          </p>
        ) : null}
      </section>
    </div>
  );
}
