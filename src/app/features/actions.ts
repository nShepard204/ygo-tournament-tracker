"use server";

import { z } from "zod";
import { requireUserId } from "@/lib/dal";
import { createGithubIssue, inAppIssueFooter } from "@/lib/github";

const FeatureSuggestionSchema = z.object({
  title: z
    .string()
    .trim()
    .min(5, "Give the feature a short title (5+ characters)")
    .max(120),
  description: z
    .string()
    .trim()
    .min(10, "Describe the feature (10+ characters)")
    .max(5000),
  page: z.string().max(300).optional(),
});

export type SuggestFeatureState = {
  error?: string;
  issueUrl?: string;
  issueNumber?: number;
};

// Server Actions are public POST endpoints: always re-check auth here.
export async function suggestFeature(
  _prev: SuggestFeatureState,
  formData: FormData,
): Promise<SuggestFeatureState> {
  const userId = await requireUserId();

  const parsed = FeatureSuggestionSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description"),
    page: formData.get("page") || undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const { title, description, page } = parsed.data;
  const issue = await createGithubIssue({
    title: `[Feature] ${title}`,
    body: `${description}\n\n${inAppIssueFooter(userId, page)}`,
    labels: ["enhancement"],
  });

  if (!issue.ok) {
    return {
      error:
        issue.reason === "not-configured"
          ? "Feature suggestions aren't configured yet. Please try again later."
          : "Couldn't submit the suggestion. Please try again.",
    };
  }
  return { issueUrl: issue.url, issueNumber: issue.number };
}
