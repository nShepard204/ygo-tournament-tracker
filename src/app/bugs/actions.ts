"use server";

import { z } from "zod";
import { requireUserId } from "@/lib/dal";
import { createGithubIssue, inAppIssueFooter } from "@/lib/github";

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

  const { title, description, page } = parsed.data;
  const issue = await createGithubIssue({
    title: `[Bug] ${title}`,
    body: `${description}\n\n${inAppIssueFooter(userId, page)}`,
    labels: ["bug"],
  });

  if (!issue.ok) {
    return {
      error:
        issue.reason === "not-configured"
          ? "Bug reporting isn't configured yet. Please try again later."
          : "Couldn't submit the report. Please try again.",
    };
  }
  return { issueUrl: issue.url, issueNumber: issue.number };
}
