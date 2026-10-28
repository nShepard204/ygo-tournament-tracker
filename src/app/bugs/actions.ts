"use server";

import { z } from "zod";
import { requireUserId } from "@/lib/dal";

// Fine-grained GitHub token with "Issues: Read and write" on this repo only.
// Server-side only: never prefix with NEXT_PUBLIC_.
const GITHUB_TOKEN = process.env.GITHUB_BUG_REPORT_TKN;
const GITHUB_REPO =
  process.env.GITHUB_REPO ?? "nShepard204/ygo-tournament-tracker";

const BugReportSchema = z.object({
  title: z
    .string()
    .trim()
    .min(5, "Give the bug a short title (5+ characters)")
    .max(120),
  description: z
    .string()
    .trim()
    .min(10, "Describe what happened (10+ characters)")
    .max(5000),
  page: z.string().max(300).optional(),
});

export type ReportBugState = {
  error?: string;
  issueUrl?: string;
  issueNumber?: number;
};

// Server Actions are public POST endpoints: always re-check auth here.
export async function reportBug(
  _prev: ReportBugState,
  formData: FormData,
): Promise<ReportBugState> {
  const userId = await requireUserId();

  const parsed = BugReportSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description"),
    page: formData.get("page") || undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  if (!GITHUB_TOKEN) {
    console.error("reportBug: GITHUB_TOKEN is not set");
    return {
      error: "Bug reporting isn't configured yet. Please try again later.",
    };
  }

  const { title, description, page } = parsed.data;
  const body = [
    description,
    "",
    "---",
    `Reported in-app by Clerk user \`${userId}\``,
    page ? `Page: \`${page}\`` : null,
  ]
    .filter((line) => line !== null)
    .join("\n");

  const res = await fetch(
    `https://api.github.com/repos/${GITHUB_REPO}/issues`,
    {
      method: "POST",
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${GITHUB_TOKEN}`,
        "X-GitHub-Api-Version": "2022-11-28",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ title: `[Bug] ${title}`, body, labels: ["bug"] }),
    },
  );

  if (!res.ok) {
    console.error("reportBug: GitHub API error", res.status, await res.text());
    return { error: "Couldn't submit the report. Please try again." };
  }

  const issue = (await res.json()) as { html_url: string; number: number };
  return { issueUrl: issue.html_url, issueNumber: issue.number };
}
