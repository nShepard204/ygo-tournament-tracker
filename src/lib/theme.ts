// Shared by the server layout (inline init script) and the client hook.
export const THEMES = ["system", "light", "dark"] as const;
export type Theme = (typeof THEMES)[number];
export const THEME_STORAGE_KEY = "theme";

// Runs before hydration so the correct theme is applied on first paint (no flash).
export const themeInitScript = `(() => {
  try {
    const t = localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)});
    const dark = t === "dark" || (t !== "light" && matchMedia("(prefers-color-scheme: dark)").matches);
    const root = document.documentElement;
    root.classList.toggle("dark", dark);
    root.style.colorScheme = dark ? "dark" : "light";
  } catch {}
})();`;
