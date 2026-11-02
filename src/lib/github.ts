import "server-only";

// Fine-grained GitHub token with "Issues: Read and write" on this repo only.
// Server-side only: never prefix with NEXT_PUBLIC_.
const GITHUB_TOKEN = process.env.GITHUB_BUG_REPORT_TKN;
const GITHUB_REPO =
  process.env.GITHUB_REPO ?? "nShepard204/ygo-tournament-tracker";

export type IssueResult =
  | { ok: true; url: string; number: number }
  | { ok: false; reason: "not-configured" | "api-error" };

// Files an issue on the project's repo. Used by the in-app bug report and
// feature suggestion forms.
export async function createGithubIssue(issue: {
  title: string;
  body: string;
  labels: string[];
}): Promise<IssueResult> {
  if (!GITHUB_TOKEN) {
    console.error("createGithubIssue: GITHUB_BUG_REPORT_TKN is not set");
    return { ok: false, reason: "not-configured" };
  }

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
      body: JSON.stringify(issue),
    },
  );

  if (!res.ok) {
    console.error("createGithubIssue: GitHub API error", res.status, await res.text());
    return { ok: false, reason: "api-error" };
  }

  const created = (await res.json()) as { html_url: string; number: number };
  return { ok: true, url: created.html_url, number: created.number };
}

// Footer appended to every in-app issue so it can be traced to a user and page.
export function inAppIssueFooter(userId: string, page?: string) {
  return [
    "---",
    `Reported in-app by Clerk user \`${userId}\``,
    page ? `Page: \`${page}\`` : null,
  ]
    .filter((line) => line !== null)
    .join("\n");
}
